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

// ---- Chaos Factory / Mind Games pieces --------------------------------

/** conveyor belt: dir +1 pushes right, -1 pushes left */
export const CONV = (x: number, y: number, w: number, dir: number, speed = 70, h = 40): EntityDef => ({
  type: "conveyor",
  x,
  y,
  w,
  h,
  dx: dir,
  speed,
});

export const ICE = (x: number, y: number, w: number, h = 40): EntityDef => ({ type: "ice", x, y, w, h });

/** bounce pad; `power` is launch speed in px/s (760 ≈ 165px high) */
export const BOUNCE = (x: number, y: number, w: number, power = 760): EntityDef => ({
  type: "bounce",
  x,
  y,
  w,
  h: 12,
  speed: power,
});

/** breaks when head-butted from below */
export const BREAK = (x: number, y: number, w: number, h = 18): EntityDef => ({ type: "breakable", x, y, w, h });

/** "helpful" platform that drifts (dx, dy) away once you get within radius */
export const RUNNER = (x: number, y: number, w: number, dx: number, radius = 80, speed = 40, dy = 0): EntityDef => ({
  type: "runner",
  x,
  y,
  w,
  h: 14,
  dx,
  dy,
  radius,
  speed,
  armed: false,
});

/** platform that tracks the player's x inside [x, x + range] */
export const FOLLOW = (x: number, y: number, w: number, range: number, speed = 70): EntityDef => ({
  type: "follower",
  x,
  y,
  w,
  h: 14,
  dx: range,
  speed,
});

/** platform circling (x, y) at radius r; speed in rad/s */
export const ORBIT = (x: number, y: number, w: number, r: number, speed = 1.2, offset = 0): EntityDef => ({
  type: "orbit",
  x,
  y,
  w,
  h: 14,
  radius: r,
  speed,
  offset,
});

/** blinks in and out: solid 60% of each period, flashes before vanishing */
export const TEMP = (x: number, y: number, w: number, period = 3, offset = 0, h = 14): EntityDef => ({
  type: "temp",
  x,
  y,
  w,
  h,
  period,
  offset,
});

/** spike that pops up for 45% of each period (dim when retracted) */
export const PSPIKE = (x: number, y: number, w: number, period = 2, offset = 0): EntityDef => ({
  type: "spike",
  x,
  y,
  w,
  h: 12,
  period,
  offset,
});

/** patrolling spike strip */
export const MSPIKE = (x: number, y: number, w: number, dx: number, dy = 0, speed = 50): EntityDef => ({
  type: "spike",
  x,
  y,
  w,
  h: 12,
  dx,
  dy,
  speed,
});

export const SIGN = (x: number, y: number, label: string): EntityDef => ({ type: "sign", x, y, w: 1, h: 1, label });

export const BUTTON = (x: number, y: number, label?: string): EntityDef => ({
  type: "button",
  x,
  y: y - 12,
  w: 18,
  h: 12,
  label,
});

export const FAKECP = (x: number, y: number, label?: string): EntityDef => ({
  type: "fakecheckpoint",
  x,
  y: y - 30,
  w: 6,
  h: 30,
  label,
});

/** friendly-looking bot that becomes a chaser once armed */
export const NPC = (x: number, y: number, id: string, label: string, speed = 70): EntityDef => ({
  type: "chaser",
  x,
  y: y - 18,
  w: 18,
  h: 18,
  id,
  speed,
  label,
  armed: false,
});

/** a column of ▼ marks hinting at an invisible platform below */
export const MARK = (x: number, y = 70): EntityDef => SIGN(x, y, "▼");

// ---- Chaos Bolt combat & trap pieces -----------------------------------

/** walking enemy patrolling [x, x + range] on a floor whose top is `fy` */
export const CRAWL = (x: number, fy: number, range = 80, id?: string, speed = 46, hidden = false): EntityDef => ({
  type: "enemy", kind: "crawler", x, y: fy - 14, w: 18, h: 14, dx: range, speed, id, hidden,
});

/** bouncy enemy hopping along [x, x + range] */
export const HOP = (x: number, fy: number, range = 80, id?: string, speed = 60, hidden = false): EntityDef => ({
  type: "enemy", kind: "hopper", x, y: fy - 16, w: 16, h: 16, dx: range, speed, id, hidden,
});

/** stationary turret: glows while charging, then fires a slow shot */
export const SENTRY = (x: number, fy: number, period = 2.4, id?: string, hidden = false): EntityDef => ({
  type: "enemy", kind: "sentry", x, y: fy - 22, w: 18, h: 22, period, id, hidden,
});

/** laser beam: thin line (idle) → flicker (charge) → solid beam (fire) */
export const LASER = (x: number, y: number, w: number, h: number, period = 3, offset = 0): EntityDef => ({
  type: "laser", x, y, w, h, period, offset,
});

/** vertical laser from a ceiling emitter down to a floor at `fy` */
export const VLASER = (x: number, fy: number, top = 40, period = 3, offset = 0): EntityDef =>
  LASER(x, top, 6, fy - top, period, offset);

/** boulder resting at x, rolls in `dir` once armed */
export const BOULDER = (x: number, fy: number, id: string, dir = -1, speed = 150, size = 30): EntityDef => ({
  type: "boulder", x, y: fy - size, w: size, h: size, dx: dir, speed, id, armed: false,
});

/** wall that warns for 0.8s then dashes by dx */
export const DASH = (x: number, y: number, w: number, h: number, id: string, dx: number, speed = 320): EntityDef => ({
  type: "dashwall", x, y, w, h, dx, id, speed, armed: false,
});

export const CHEST = (x: number, fy: number, ops: Op[], trap = false): EntityDef => ({
  type: "chest", x, y: fy - 16, w: 20, h: 16, ops, trap,
});

export const POWER = (x: number, y: number, ops: Op[] = [{ op: "shield" }], trap = false): EntityDef => ({
  type: "powerup", x, y, w: 12, h: 12, ops, trap,
});

/** shoot it with a Chaos Bolt to fire its ops */
export const TARGET = (x: number, y: number, ops: Op[], hp = 1): EntityDef => ({
  type: "target", x, y, w: 14, h: 14, ops, hp,
});

export const BOOMBTN = (x: number, fy: number, ops: Op[], label?: string): EntityDef => ({
  type: "button", x, y: fy - 12, w: 18, h: 12, ops, label,
});
