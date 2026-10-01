import type { EntityDef, LevelDef, Op, Trigger } from "../types";
import { CP } from "./helpers";

/**
 * Stitches several rooms side by side into one long level.
 * - every room after the first starts at a checkpoint
 * - only the last room keeps its exit
 * - non-coin ids get a room prefix so traps never cross-fire
 * - entering a room restores that room's own gravity / darkness / size
 */
export function chain(name: string, hint: string, rooms: LevelDef[], extra: Partial<LevelDef> = {}): LevelDef {
  const entities: EntityDef[] = [];
  const triggers: Trigger[] = [];
  let ox = 0;
  let par = 0;

  rooms.forEach((room, i) => {
    const last = i === rooms.length - 1;
    const pre = `r${i}_`;
    const keep = (e: EntityDef) => e.type === "coin" || e.type === "secret";
    const rid = (id: string) => pre + id;
    const mapIds = (ids: string[]) =>
      ids.map((id) => {
        const target = room.entities.find((e) => e.id === id);
        return target && keep(target) ? id : rid(id);
      });
    const mapOps = (ops: Op[]): Op[] =>
      ops.map((o) => {
        if ("ids" in o) return { ...o, ids: mapIds(o.ids) } as Op;
        if (o.op === "goalTo" || o.op === "warp") return { ...o, x: o.x + ox };
        if (o.op === "later") return { ...o, ops: mapOps(o.ops) };
        return o;
      });

    for (const e of room.entities) {
      if (e.type === "goal" && !last) continue;
      const copy: EntityDef = { ...e, x: e.x + ox };
      if (e.id && !keep(e)) copy.id = pre + e.id;
      if (e.ops) copy.ops = mapOps(e.ops);
      entities.push(copy);
    }
    for (const t of room.triggers ?? []) triggers.push({ ...t, x: t.x + ox, ops: mapOps(t.ops) });

    if (i > 0) {
      entities.push(CP(ox + room.spawn.x + 10, room.spawn.y));
      triggers.push({
        x: ox,
        y: -300,
        w: 20,
        h: 1000,
        once: true,
        ops: [
          { op: "gravity", v: room.gravity ?? 1 },
          { op: "reverse", v: Boolean(room.reverse) },
          { op: "scale", v: room.scale ?? 1 },
          { op: "speed", v: room.speed ?? 1 },
          { op: "dark", v: room.dark ?? 0 },
          { op: "zoom", v: 1 },
          { op: "msg", v: room.name },
        ],
      });
    }
    par += room.par ?? 20;
    ox += room.w;
  });

  const { bonus: _bonus, ...first } = rooms[0]!;
  return {
    ...first,
    name,
    hint,
    w: ox,
    h: 360,
    entities,
    triggers,
    par: Math.round(par * 0.9),
    ...extra,
  };
}
