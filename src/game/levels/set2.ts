import type { LevelDef } from "../types";
import {
  CHASE,
  COIN,
  CP,
  FALLB,
  FREEZE,
  GHOST,
  GOAL,
  HIDDEN,
  MOVE,
  S,
  SECRET,
  SPIKE,
  T,
  TP,
  VANISH,
  WALL,
  floor,
} from "./helpers";

/** Levels 11–20: the mechanics act. */
export const SET2: LevelDef[] = [
  // 11 — FALLING WORLD
  {
    name: "FALLING WORLD",
    hint: "keep moving, nothing holds",
    w: 800,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 26,
    entities: [
      ...floor(320, [
        [0, 110],
        [700, 100],
      ]),
      FALLB(130, 300, 70, 16, "a"),
      FALLB(230, 272, 70, 16, "b"),
      FALLB(330, 300, 70, 16, "c"),
      FALLB(430, 264, 70, 16, "d"),
      FALLB(530, 296, 70, 16, "e"),
      FALLB(620, 262, 70, 16, "f"),
      SPIKE(110, 348, 590, 12),
      COIN("l11c1", 256, 240),
      COIN("l11c2", 456, 232),
      COIN("l11c3", 646, 228),
      GOAL(766, 320),
    ],
  },

  // 12 — TELEPORT
  {
    name: "PATCH CABLES",
    hint: "purple frames rewire you",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 28,
    entities: [
      ...floor(320, [
        [0, 180],
        [250, 60],
        [560, 80],
      ]),
      TP(140, 292, 300, 250),
      S(280, 264, 80, 14),
      TP(300, 236, 500, 280),
      S(460, 294, 90, 14),
      SPIKE(180, 348, 380, 12),
      COIN("l12c1", 100, 286),
      COIN("l12c2", 312, 232),
      COIN("l12c3", 500, 262),
      SECRET("s12", 606, 210),
      HIDDEN(560, 240, 70, 14),
      GOAL(606, 320),
    ],
  },

  // 13 — MIRROR
  {
    name: "MIRROR ROOM",
    hint: "halfway through, left becomes right",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 30,
    entities: [
      ...floor(320, [
        [0, 200],
        [260, 130],
        [450, 190],
      ]),
      S(190, 250, 60, 14),
      S(400, 246, 60, 14),
      COIN("l13c1", 214, 218),
      COIN("l13c2", 300, 286),
      COIN("l13c3", 424, 214),
      GOAL(600, 320),
    ],
    triggers: [
      T(300, 250, 24, 80, [{ op: "mirror" }, { op: "zoom", v: 0.96 }]),
    ],
  },

  // 14 — GRAVITY
  {
    name: "UP IS OPTIONAL",
    hint: "gravity is a rental",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 32,
    entities: [
      ...floor(320, [
        [0, 220],
        [520, 120],
      ]),
      S(0, 40, 640, 24),
      S(230, 64, 90, 14),
      S(380, 64, 90, 14),
      SPIKE(220, 348, 300, 12),
      COIN("l14c1", 262, 96),
      COIN("l14c2", 418, 96),
      COIN("l14c3", 560, 286),
      SECRET("s14", 26, 100),
      GOAL(600, 320),
    ],
    triggers: [
      T(200, 240, 20, 90, [{ op: "gravity", v: -1 }, { op: "msg", v: "gravity flipped" }]),
      T(496, 64, 24, 90, [{ op: "gravity", v: 1 }, { op: "msg", v: "and back" }]),
    ],
  },

  // 15 — CHASE
  {
    name: "THE FOLLOWER",
    hint: "do not stop to admire it",
    w: 960,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 26,
    entities: [
      ...floor(320, [[0, 960]]),
      CHASE(-40, 280, "hunter", 88),
      S(240, 258, 70, 14),
      S(430, 244, 70, 14),
      S(650, 258, 70, 14),
      SPIKE(560, 308, 50, 12),
      COIN("l15c1", 268, 226),
      COIN("l15c2", 458, 212),
      COIN("l15c3", 678, 226),
      GOAL(920, 320),
    ],
    triggers: [T(90, 200, 20, 130, [{ op: "arm", ids: ["hunter"] }, { op: "msg", v: "RUN" }])],
  },

  // 16 — FAKE WALL
  {
    name: "SOFT WALLS",
    hint: "walls dissolve if you believe hard enough",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 28,
    entities: [
      ...floor(320, [[0, 640]]),
      WALL(200, 200, 24, 120),
      S(200, 120, 24, 80),
      WALL(400, 240, 24, 80),
      S(400, 120, 24, 120),
      S(300, 254, 60, 14),
      COIN("l16c1", 240, 286),
      COIN("l16c2", 324, 222),
      COIN("l16c3", 460, 286),
      SECRET("s16", 300, 150),
      GOAL(606, 320),
    ],
  },

  // 17 — TIME
  {
    name: "STUTTER STEP",
    hint: "blue blocks breathe in rhythm",
    w: 700,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 34,
    entities: [
      ...floor(320, [
        [0, 130],
        [600, 100],
      ]),
      FREEZE(160, 286, 70, 14, 0, -60, 56),
      FREEZE(290, 262, 70, 14, 70, 0, 60),
      FREEZE(450, 286, 70, 14, 0, -70, 50),
      SPIKE(130, 348, 470, 12),
      COIN("l17c1", 196, 236),
      COIN("l17c2", 356, 220),
      COIN("l17c3", 486, 228),
      GOAL(666, 320),
    ],
  },

  // 18 — MINI LEVEL
  {
    name: "SHRINK RAY",
    hint: "small robot, small doors",
    w: 720,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 32,
    entities: [
      ...floor(320, [[0, 720]]),
      S(200, 0, 24, 300),
      S(200, 312, 24, 8),
      S(300, 296, 60, 10),
      S(390, 272, 50, 10),
      S(470, 296, 60, 10),
      SPIKE(560, 308, 60, 12),
      COIN("l18c1", 322, 274),
      COIN("l18c2", 406, 250),
      COIN("l18c3", 660, 292),
      SECRET("s18", 214, 286),
      GOAL(690, 320),
    ],
    triggers: [
      T(150, 250, 20, 80, [{ op: "scale", v: 0.5 }, { op: "zoom", v: 1.25 }, { op: "msg", v: "tiny mode" }]),
      T(640, 250, 20, 80, [{ op: "scale", v: 1 }, { op: "zoom", v: 1 }]),
    ],
  },

  // 19 — GIANT
  {
    name: "GROWTH SPURT",
    hint: "big robot needs the high road",
    w: 760,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 34,
    entities: [
      ...floor(320, [[0, 760]]),
      S(240, 268, 300, 14),
      S(240, 296, 24, 24),
      S(516, 296, 24, 24),
      S(160, 268, 50, 14),
      S(566, 268, 50, 14),
      SPIKE(280, 308, 220, 12),
      COIN("l19c1", 176, 236),
      COIN("l19c2", 384, 234),
      COIN("l19c3", 582, 236),
      GOAL(726, 320),
    ],
    triggers: [
      T(110, 250, 20, 80, [{ op: "scale", v: 1.7 }, { op: "msg", v: "giant mode" }]),
      T(660, 250, 20, 80, [{ op: "scale", v: 1 }]),
    ],
  },

  // 20 — THE WORLD MOVES
  {
    name: "CONVEYOR SKY",
    hint: "the camera will not wait",
    w: 1280,
    h: 360,
    spawn: { x: 20, y: 320 },
    par: 30,
    scroll: 54,
    entities: [
      ...floor(320, [
        [0, 300],
        [360, 160],
        [580, 180],
        [820, 180],
        [1060, 220],
      ]),
      S(300, 258, 60, 14),
      S(520, 252, 60, 14),
      S(760, 258, 60, 14),
      S(1000, 252, 60, 14),
      CP(640, 320),
      COIN("l20c1", 324, 226),
      COIN("l20c2", 544, 220),
      COIN("l20c3", 1024, 220),
      SECRET("s20", 1250, 250),
      GOAL(1246, 320),
    ],
  },
];

export const _unusedSet2 = { VANISH, MOVE, GHOST, SECRET, S };
