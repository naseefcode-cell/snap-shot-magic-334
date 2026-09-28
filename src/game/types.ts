/**
 * Core data types for CHAOS BOLT.
 * Levels are pure data: geometry + entities + scripted trigger zones.
 */

export type EntityType =
  | "solid"
  | "vanish"
  | "fall"
  | "move"
  | "memory"
  | "fakewall"
  | "freeze"
  | "spike"
  | "crusher"
  | "chaser"
  | "teleport"
  | "coin"
  | "secret"
  | "checkpoint"
  | "goal"
  | "fakegoal"
  | "conveyor"
  | "ice"
  | "bounce"
  | "breakable"
  | "runner"
  | "follower"
  | "orbit"
  | "temp"
  | "sign"
  | "button"
  | "fakecheckpoint";

export interface EntityDef {
  id?: string | undefined;
  type: EntityType;
  x: number;
  y: number;
  w: number;
  h: number;
  /** patrol offsets for `move` / travel for `crusher` */
  dx?: number;
  dy?: number;
  /** px per second */
  speed?: number;
  /** seconds before a `vanish` block disappears after being touched */
  delay?: number;
  /** teleport destination */
  tx?: number;
  ty?: number;
  /** proximity radius used by fakewall / ghost blocks */
  radius?: number;
  /** starts hidden (and harmless) until an `arm`/`show` op */
  hidden?: boolean;
  /** visible from afar but fades out when the player gets close */
  ghost?: boolean;
  /** crushers / spikes only act once armed */
  armed?: boolean;
  /** label drawn on the entity (goals, decoys) */
  label?: string | undefined;
  /** cycle length (s) for temp platforms / pulsing spikes */
  period?: number;
  /** cycle offset (s) or orbit start angle */
  offset?: number;
}

export type Op =
  | { op: "remove"; ids: string[] }
  | { op: "show"; ids: string[] }
  | { op: "hide"; ids: string[] }
  | { op: "arm"; ids: string[] }
  | { op: "shake"; v: number }
  | { op: "gravity"; v: number }
  | { op: "reverse"; v: boolean }
  | { op: "scale"; v: number }
  | { op: "speed"; v: number }
  | { op: "goalTo"; x: number; y: number }
  | { op: "goalRoam"; v: boolean }
  | { op: "fx"; v: "fakeDeath" | "fakeVictory" | "fakeLoading" | "glitch" | "didIt" }
  | { op: "dark"; v: number }
  | { op: "mirror" }
  | { op: "warp"; x: number; y: number }
  | { op: "zoom"; v: number }
  | { op: "tint"; v: string }
  | { op: "msg"; v: string }
  | { op: "freeze"; v: boolean }
  | { op: "shift"; ids: string[]; dx: number; dy: number }
  | { op: "confetti" };

export interface Trigger {
  /** trigger zone in world space */
  x: number;
  y: number;
  w: number;
  h: number;
  ops: Op[];
  /** fires only once per attempt (default true) */
  once?: boolean;
  /** draw a faint tell so the trap is learnable */
  tell?: boolean;
  /** only fires while the player is jumping upward */
  when?: "jump";
  /** only active once the player has died at least this often this attempt */
  minDeaths?: number;
  /** only active while deaths this attempt are at most this */
  maxDeaths?: number;
}

export interface Bonus {
  text: string;
  kind: "nojump" | "avoid" | "secret";
  id?: string;
}

export interface LevelDef {
  name: string;
  hint?: string | undefined;
  w: number;
  h: number;
  spawn: { x: number; y: number };
  entities: EntityDef[];
  triggers?: Trigger[];
  /** seconds — beating this earns the "fast" star */
  par?: number;
  /** initial modifiers */
  dark?: number;
  gravity?: number;
  reverse?: boolean;
  scale?: number;
  speed?: number;
  /** level auto-scrolls the camera horizontally (px/s) */
  scroll?: number;
  tint?: string;
  flipped?: boolean;
  /** optional per-level objective */
  bonus?: Bonus;
}

export interface ChaosModifiers {
  gravity?: number;
  speed?: number;
  reverse?: boolean;
  ghost?: boolean;
  mirror?: boolean;
  roamGoal?: boolean;
  scale?: number;
  hazard?: number;
  label: string;
}

export interface HudState {
  level: number;
  name: string;
  deaths: number;
  coins: number;
  coinTotal: number;
  time: number;
  message: string | null;
}

export interface LevelResult {
  level: number;
  deaths: number;
  time: number;
  coins: number;
  coinTotal: number;
  stars: number;
  secrets: string[];
  par: number;
  bonus: boolean | null;
  bonusText: string | null;
}
