import type { ChaosModifiers, LevelDef } from "../types";
import { CAMPAIGN } from "./campaign";

export const LEVELS: LevelDef[] = CAMPAIGN;

export const TOTAL_LEVELS = LEVELS.length;

export const WORLDS = [
  { name: "LEARN THE CHAOS", tag: "1-5" },
  { name: "THE TROLLING BEGINS", tag: "6-10" },
  { name: "CHAOS BUILDS", tag: "11-15" },
  { name: "SERIOUS TROLLING", tag: "16-20" },
  { name: "CONTROLLED CHAOS", tag: "21-25" },
  { name: "THE FINAL GAUNTLET", tag: "26-30" },
] as const;

export const worldOf = (index: number) => Math.floor(index / 5);

export const TOTAL_COINS = LEVELS.reduce(
  (n, l) => n + l.entities.filter((e) => e.type === "coin").length,
  0,
);

export const TOTAL_SECRETS = LEVELS.reduce(
  (n, l) => n + l.entities.filter((e) => e.type === "secret").length,
  0,
);

/** secret ids hidden in a given level */
export const levelSecrets = (index: number): string[] =>
  (LEVELS[index]?.entities ?? []).filter((e) => e.type === "secret" && e.id).map((e) => e.id!);

export const levelCoinCount = (index: number) =>
  (LEVELS[index]?.entities ?? []).filter((e) => e.type === "coin").length;

export const CHAOS_POOL: (ChaosModifiers & { key: string })[] = [
  { key: "low", label: "FEATHER GRAVITY", gravity: 0.62 },
  { key: "high", label: "HEAVY CORE", gravity: 1.12 },
  { key: "fast", label: "TURBO LEGS", speed: 1.6 },
  { key: "slow", label: "SUNDAY STROLL", speed: 0.82 },
  { key: "rev", label: "CROSSED WIRES", reverse: true },
  { key: "ghost", label: "GHOST WORLD", ghost: true },
  { key: "mirror", label: "MIRROR WORLD", mirror: true },
  { key: "roam", label: "NERVOUS EXIT", roamGoal: true },
  { key: "tiny", label: "POCKET ROBOT", scale: 0.7 },
  { key: "hazard", label: "ANGRY MACHINES", hazard: 1.35 },
  { key: "tmirror", label: "TURBO MIRROR", speed: 1.5, mirror: true },
  { key: "float", label: "FLOAT & SCRAMBLE", gravity: 0.7, reverse: true },
];

/** Picks a modifier that cannot break the given level. */
export function rollChaos(def?: LevelDef): ChaosModifiers {
  const ops = (def?.triggers ?? []).flatMap((t) => t.ops.map((o) => o.op));
  const positional = ops.includes("warp") || ops.includes("goalTo") || ops.includes("shift");
  const pool = CHAOS_POOL.filter((m) => {
    if (m.mirror && (positional || def?.flipped)) return false;
    if (m.ghost && def?.entities.some((e) => e.type === "fakewall")) return false;
    if (m.speed && m.speed < 1 && def?.scroll) return false;
    return true;
  });
  return pool[Math.floor(Math.random() * pool.length)]!;
}
