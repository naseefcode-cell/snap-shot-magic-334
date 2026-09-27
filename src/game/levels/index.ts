import type { ChaosModifiers, LevelDef } from "../types";
import { SET1 } from "./set1";
import { SET2 } from "./set2";
import { SET3 } from "./set3";

export const LEVELS: LevelDef[] = [...SET1, ...SET2, ...SET3];

export const TOTAL_LEVELS = LEVELS.length;

export const TOTAL_COINS = LEVELS.reduce(
  (n, l) => n + l.entities.filter((e) => e.type === "coin").length,
  0,
);

export const TOTAL_SECRETS = LEVELS.reduce(
  (n, l) => n + l.entities.filter((e) => e.type === "secret").length,
  0,
);

export const CHAOS_POOL: ChaosModifiers[] = [
  { label: "FEATHER GRAVITY", gravity: 0.62 },
  { label: "HEAVY CORE", gravity: 1.35 },
  { label: "TURBO LEGS", speed: 1.7 },
  { label: "CROSSED WIRES", reverse: true },
  { label: "GHOST WORLD", ghost: true },
  { label: "MIRROR WORLD", mirror: true },
  { label: "NERVOUS EXIT", roamGoal: true },
  { label: "TURBO MIRROR", speed: 1.5, mirror: true },
  { label: "FLOAT & SCRAMBLE", gravity: 0.7, reverse: true },
];

export function rollChaos(): ChaosModifiers {
  return CHAOS_POOL[Math.floor(Math.random() * CHAOS_POOL.length)]!;
}
