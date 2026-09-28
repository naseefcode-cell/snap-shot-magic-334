import type { ChaosModifiers, LevelDef } from "../types";
import { SET1 } from "./set1";
import { SET2 } from "./set2";
import { SET3 } from "./set3";
import { SET4 } from "./set4";
import { SET5 } from "./set5";
import { SET6 } from "./set6";

export const LEVELS: LevelDef[] = [...SET1, ...SET2, ...SET3, ...SET4, ...SET5, ...SET6];

export const TOTAL_LEVELS = LEVELS.length;

export const WORLDS = [
  { name: "LEARNING THE LIES", tag: "W1" },
  { name: "TRAP CITY", tag: "W2" },
  { name: "THE WORLD IS BROKEN", tag: "W3" },
  { name: "CHAOS FACTORY", tag: "W4" },
  { name: "MIND GAMES", tag: "W5" },
  { name: "THE FINAL CHAOS", tag: "W6" },
] as const;

export const worldOf = (index: number) => Math.floor(index / 10);

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
