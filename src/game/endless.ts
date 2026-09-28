/**
 * Endless Trap Mode — builds rooms from reusable, pre-validated trap chunks.
 * Every chunk starts and ends on solid floor at y=320 and only uses gaps and
 * heights the player can always clear, so generated rooms are solvable.
 */
import type { EntityDef, LevelDef, Trigger } from "./types";
import {
  BOUNCE,
  COIN,
  CONV,
  CRUSH,
  FALLB,
  GHOST,
  GOAL,
  MOVE,
  ORBIT,
  PSPIKE,
  S,
  SPIKE,
  T,
  VANISH,
  WALL,
  floor,
} from "./levels/helpers";

interface Chunk {
  w: number;
  ents: EntityDef[];
  triggers?: Trigger[];
}

type Maker = (x: number, d: number, id: string) => Chunk;

const CHUNKS: Maker[] = [
  // 0 gap
  (x, d) => {
    const g = 50 + Math.min(30, d * 5);
    return { w: 200, ents: [SPIKE(x, 348, g), ...floor(320, [[x + g, 200 - g]])] };
  },
  // 1 falling bridge
  (x) => ({ w: 200, ents: [SPIKE(x, 348, 140), FALLB(x + 40, 300, 60), ...floor(320, [[x + 140, 60]])] }),
  // 2 pulse spikes
  (x) => ({
    w: 200,
    ents: [...floor(320, [[x, 200]]), PSPIKE(x + 50, 308, 40, 2, 0), PSPIKE(x + 120, 308, 40, 2, 1)],
  }),
  // 3 fake wall
  (x) => ({ w: 200, ents: [...floor(320, [[x, 200]]), S(x + 90, 40, 24, 190), WALL(x + 90, 230, 24, 90)] }),
  // 4 vanish bridge
  (x) => ({
    w: 220,
    ents: [
      SPIKE(x, 348, 170),
      VANISH(x + 20, 300, 60, 16, 0.4),
      VANISH(x + 100, 290, 60, 16, 0.4),
      ...floor(320, [[x + 170, 50]]),
    ],
  }),
  // 5 ghost hop
  (x) => ({
    w: 220,
    ents: [SPIKE(x, 348, 180), GHOST(x + 30, 292, 50), GHOST(x + 110, 270, 50), ...floor(320, [[x + 180, 40]])],
  }),
  // 6 crusher hall
  (x, d, id) => ({
    w: 200,
    ents: [...floor(320, [[x, 200]]), CRUSH(x + 90, 30, 50, 26, 0, 264, id, 250 + Math.min(60, d * 8))],
    triggers: [T(x + 50, 250, 16, 80, [{ op: "arm", ids: [id] }], { tell: true })],
  }),
  // 7 moving platform pit
  (x) => ({ w: 260, ents: [SPIKE(x, 348, 200), MOVE(x + 70, 290, 60, 14, 50, 0, 55), ...floor(320, [[x + 200, 60]])] }),
  // 8 bounce wall
  (x) => ({ w: 220, ents: [...floor(320, [[x, 220]]), BOUNCE(x + 60, 308, 40, 820), S(x + 130, 150, 24, 170)] }),
  // 9 conveyor against you
  (x, d) => ({
    w: 220,
    ents: [CONV(x, 320, 120, -1, Math.min(90, 60 + d * 5)), SPIKE(x + 120, 348, 50), ...floor(320, [[x + 170, 50]])],
  }),
  // 10 hidden spike with a tell
  (x, _d, id) => ({
    w: 200,
    ents: [...floor(320, [[x, 200]]), SPIKE(x + 110, 308, 40, 12, { hidden: true, id })],
    triggers: [T(x + 80, 260, 16, 70, [{ op: "show", ids: [id] }], { tell: true })],
  }),
  // 11 orbit pit
  (x) => ({ w: 230, ents: [SPIKE(x, 348, 180), ORBIT(x + 65, 260, 50, 35, 1.3), ...floor(320, [[x + 180, 50]])] }),
];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildEndlessRoom(room: number, seed: number): LevelDef {
  const rand = rng(seed + room * 7919);
  const count = 3 + Math.min(4, Math.floor(room / 2));
  const unlocked = Math.min(CHUNKS.length, 4 + room);
  const ents: EntityDef[] = [...floor(320, [[0, 120]])];
  const triggers: Trigger[] = [];
  let x = 120;
  for (let i = 0; i < count; i++) {
    const make = CHUNKS[Math.floor(rand() * unlocked)]!;
    const c = make(x, room, `e${room}_${i}`);
    ents.push(...c.ents);
    if (c.triggers) triggers.push(...c.triggers);
    if (rand() < 0.45) ents.push(COIN(`e${room}c${i}`, x + c.w / 2 - 6, 250));
    x += c.w;
  }
  ents.push(...floor(320, [[x, 100]]), GOAL(x + 60, 320));
  return {
    name: `ROOM ${room}`,
    w: x + 100,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: count * 5,
    entities: ents,
    triggers,
    hint: room === 1 ? "endless trap mode · how far can you go?" : undefined,
  };
}
