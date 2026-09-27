import type { EntityDef, Op, Trigger } from "../types";

/** Level authoring helpers — keeps the 30 level definitions readable. */

export const S = (x: number, y: number, w: number, h = 24, extra: Partial<EntityDef> = {}): EntityDef => ({
  type: "solid",
  x,
  y,
  w,
  h,
  ...extra,
});

export const VANISH = (x: number, y: number, w: number, h = 16, delay = 0.35, id?: string): EntityDef => ({
  type: "vanish",
  x,
  y,
  w,
  h,
  delay,
  id,
});

export const FALLB = (x: number, y: number, w: number, h = 16, id?: string): EntityDef => ({
  type: "fall",
  x,
  y,
  w,
  h,
  id,
});

export const MOVE = (
  x: number,
  y: number,
  w: number,
  h: number,
  dx: number,
  dy: number,
  speed = 60,
  id?: string,
): EntityDef => ({ type: "move", x, y, w, h, dx, dy, speed, id });

export const FREEZE = (
  x: number,
  y: number,
  w: number,
  h: number,
  dx: number,
  dy: number,
  speed = 60,
): EntityDef => ({ type: "freeze", x, y, w, h, dx, dy, speed });

export const MEM = (x: number, y: number, w: number, h = 16): EntityDef => ({
  type: "memory",
  x,
  y,
  w,
  h,
});

export const GHOST = (x: number, y: number, w: number, h = 16, radius = 74): EntityDef => ({
  type: "solid",
  x,
  y,
  w,
  h,
  ghost: true,
  radius,
});

export const HIDDEN = (x: number, y: number, w: number, h = 16, radius = 60): EntityDef => ({
  type: "solid",
  x,
  y,
  w,
  h,
  hidden: true,
  radius,
});

export const WALL = (x: number, y: number, w: number, h: number, radius = 52): EntityDef => ({
  type: "fakewall",
  x,
  y,
  w,
  h,
  radius,
});

export const SPIKE = (x: number, y: number, w: number, h = 12, extra: Partial<EntityDef> = {}): EntityDef => ({
  type: "spike",
  x,
  y,
  w,
  h,
  ...extra,
});

export const CRUSH = (
  x: number,
  y: number,
  w: number,
  h: number,
  dx: number,
  dy: number,
  id: string,
  speed = 260,
): EntityDef => ({ type: "crusher", x, y, w, h, dx, dy, id, speed, armed: false });

export const CHASE = (x: number, y: number, id: string, speed = 62, size = 20): EntityDef => ({
  type: "chaser",
  x,
  y,
  w: size,
  h: size,
  id,
  speed,
  armed: false,
});

export const TP = (x: number, y: number, tx: number, ty: number): EntityDef => ({
  type: "teleport",
  x,
  y,
  w: 20,
  h: 28,
  tx,
  ty,
});

export const COIN = (id: string, x: number, y: number): EntityDef => ({
  type: "coin",
  x,
  y,
  w: 12,
  h: 12,
  id,
});

export const SECRET = (id: string, x: number, y: number): EntityDef => ({
  type: "secret",
  x,
  y,
  w: 16,
  h: 16,
  id,
});

export const CP = (x: number, y: number): EntityDef => ({ type: "checkpoint", x, y: y - 30, w: 6, h: 30 });

export const GOAL = (x: number, y: number): EntityDef => ({ type: "goal", x, y: y - 40, w: 20, h: 40 });

export const DECOY = (x: number, y: number): EntityDef => ({
  type: "fakegoal",
  x,
  y: y - 40,
  w: 20,
  h: 40,
});

export const T = (
  x: number,
  y: number,
  w: number,
  h: number,
  ops: Op[],
  extra: Partial<Trigger> = {},
): Trigger => ({ x, y, w, h, ops, once: true, ...extra });

/** floor segments from a list of [x, width] pairs at a given top y */
export const floor = (y: number, spans: [number, number][], h = 40): EntityDef[] =>
  spans.map(([x, w]) => S(x, y, w, h));
