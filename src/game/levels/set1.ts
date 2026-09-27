import type { LevelDef } from "../types";
import {
  CHASE,
  COIN,
  CP,
  CRUSH,
  DECOY,
  FALLB,
  GHOST,
  GOAL,
  HIDDEN,
  MOVE,
  S,
  SECRET,
  SPIKE,
  T,
  VANISH,
  floor,
} from "./helpers";

/** Levels 1–10: the teaching act. Each one adds exactly one new lie. */
export const SET1: LevelDef[] = [
  // 1 — NORMAL
  {
    name: "WARM CIRCUITS",
    hint: "move with A / D  ·  jump with SPACE",
    w: 640,
    h: 360,
    spawn: { x: 40, y: 320 },
    par: 14,
    entities: [
      ...floor(320, [
        [0, 210],
        [265, 150],
        [470, 170],
      ]),
      S(190, 250, 60, 14),
      S(360, 236, 70, 14),
      COIN("l1c1", 120, 280),
      COIN("l1c2", 212, 218),
      COIN("l1c3", 388, 204),
      GOAL(590, 320),
    ],
  },

  // 2 — THE FLOOR
  {
    name: "THE FLOOR",
    hint: "floors are a suggestion",
    w: 640,
    h: 360,
    spawn: { x: 36, y: 320 },
    par: 16,
    entities: [
      ...floor(320, [
        [0, 150],
        [520, 120],
      ]),
      S(150, 320, 90, 40, { id: "f1" }),
      S(240, 320, 90, 40, { id: "f2" }),
      S(330, 320, 90, 40, { id: "f3" }),
      S(420, 320, 100, 40, { id: "f4" }),
      S(300, 236, 60, 14),
      COIN("l2c1", 200, 280),
      COIN("l2c2", 326, 204),
      COIN("l2c3", 470, 280),
      SECRET("s2", 20, 210),
      HIDDEN(0, 246, 60, 14),
      GOAL(600, 320),
    ],
    triggers: [
      T(230, 280, 20, 44, [{ op: "remove", ids: ["f2"] }, { op: "shake", v: 6 }], { tell: true }),
      T(392, 280, 20, 44, [{ op: "remove", ids: ["f4"] }, { op: "shake", v: 6 }], { tell: true }),
    ],
  },

  // 3 — FAKE FLOOR
  {
    name: "FAKE FLOOR",
    hint: "dotted blocks are not load-bearing",
    w: 640,
    h: 360,
    spawn: { x: 36, y: 320 },
    par: 18,
    entities: [
      ...floor(320, [
        [0, 130],
        [560, 80],
      ]),
      FALLB(150, 300, 80, 16, "a"),
      S(250, 268, 70, 16),
      FALLB(340, 246, 80, 16, "b"),
      S(440, 268, 90, 16),
      SPIKE(150, 348, 400, 12),
      COIN("l3c1", 182, 262),
      COIN("l3c2", 372, 208),
      COIN("l3c3", 478, 230),
      GOAL(608, 320),
    ],
  },

  // 4 — THE CEILING
  {
    name: "LOW CEILING",
    hint: "something up there is impatient",
    w: 640,
    h: 360,
    spawn: { x: 34, y: 320 },
    par: 20,
    entities: [
      ...floor(320, [[0, 640]]),
      S(0, 0, 640, 30),
      CRUSH(250, 40, 130, 26, 0, 214, "c1"),
      CRUSH(430, 40, 120, 26, 0, 214, "c2", 320),
      S(210, 256, 40, 14),
      COIN("l4c1", 226, 226),
      COIN("l4c2", 310, 290),
      COIN("l4c3", 480, 290),
      SECRET("s4", 604, 240),
      GOAL(606, 320),
    ],
    triggers: [
      T(200, 250, 16, 80, [{ op: "arm", ids: ["c1"] }], { tell: true }),
      T(392, 250, 16, 80, [{ op: "arm", ids: ["c2"] }], { tell: true }),
    ],
  },

  // 5 — INVISIBLE
  {
    name: "BLIND TRUST",
    hint: "some platforms are shy",
    w: 640,
    h: 360,
    spawn: { x: 34, y: 320 },
    par: 24,
    entities: [
      ...floor(320, [
        [0, 130],
        [560, 80],
      ]),
      GHOST(150, 292, 70),
      GHOST(258, 258, 70),
      GHOST(366, 292, 70),
      GHOST(466, 258, 70),
      SPIKE(130, 348, 430, 12),
      COIN("l5c1", 180, 258),
      COIN("l5c2", 288, 224),
      COIN("l5c3", 492, 224),
      GOAL(608, 320),
    ],
  },

  // 6 — SPIKE SURPRISE
  {
    name: "SPIKE WEATHER",
    hint: "pink means pain",
    w: 640,
    h: 360,
    spawn: { x: 34, y: 320 },
    par: 24,
    entities: [
      ...floor(320, [[0, 640]]),
      SPIKE(252, 308, 70, 12, { hidden: true, id: "sp1" }),
      SPIKE(420, 308, 60, 12, { hidden: true, id: "sp2" }),
      SPIKE(330, 30, 60, 14, { hidden: true, id: "sp3" }),
      S(330, 250, 60, 14),
      S(170, 260, 50, 14),
      COIN("l6c1", 190, 228),
      COIN("l6c2", 354, 220),
      COIN("l6c3", 560, 286),
      SECRET("s6", 26, 230),
      HIDDEN(0, 262, 50, 14),
      GOAL(606, 320),
    ],
    triggers: [
      T(180, 260, 16, 70, [{ op: "show", ids: ["sp1"] }, { op: "shake", v: 5 }], { tell: true }),
      T(348, 260, 16, 70, [{ op: "show", ids: ["sp2"] }, { op: "shake", v: 5 }], { tell: true }),
      T(300, 240, 20, 30, [{ op: "show", ids: ["sp3"] }], { tell: true }),
    ],
  },

  // 7 — BACKWARDS
  {
    name: "BACKWARDS",
    hint: "the wiring gets crossed",
    w: 640,
    h: 360,
    spawn: { x: 34, y: 320 },
    par: 26,
    entities: [
      ...floor(320, [
        [0, 250],
        [330, 120],
        [520, 120],
      ]),
      S(250, 250, 60, 14),
      COIN("l7c1", 274, 218),
      COIN("l7c2", 372, 286),
      COIN("l7c3", 560, 286),
      GOAL(600, 320),
    ],
    triggers: [
      T(230, 240, 18, 90, [{ op: "reverse", v: true }, { op: "shake", v: 4 }], { tell: true }),
      T(460, 240, 18, 90, [{ op: "reverse", v: false }, { op: "msg", v: "controls restored" }], {
        tell: true,
      }),
    ],
  },

  // 8 — MOVING EXIT
  {
    name: "SHY EXIT",
    hint: "the door has opinions",
    w: 640,
    h: 360,
    spawn: { x: 34, y: 320 },
    par: 28,
    entities: [
      ...floor(320, [[0, 640]]),
      S(160, 250, 70, 14),
      S(330, 214, 70, 14),
      S(470, 258, 70, 14),
      COIN("l8c1", 190, 218),
      COIN("l8c2", 358, 182),
      COIN("l8c3", 498, 226),
      GOAL(500, 320),
    ],
    triggers: [
      T(160, 200, 40, 130, [{ op: "goalRoam", v: true }, { op: "msg", v: "it moved" }]),
      T(300, 120, 40, 150, [{ op: "goalTo", x: 90, y: 236 }, { op: "shake", v: 5 }]),
    ],
  },

  // 9 — FAKE GOAL
  {
    name: "FALSE DOOR",
    hint: "not every exit is one",
    w: 960,
    h: 360,
    spawn: { x: 34, y: 320 },
    par: 30,
    entities: [
      ...floor(320, [
        [0, 420],
        [500, 200],
        [760, 200],
      ]),
      DECOY(360, 320),
      S(470, 250, 60, 14),
      S(660, 240, 70, 14),
      SPIKE(420, 348, 340, 12),
      CP(520, 250),
      COIN("l9c1", 250, 286),
      COIN("l9c2", 492, 216),
      COIN("l9c3", 686, 206),
      SECRET("s9", 930, 220),
      HIDDEN(900, 250, 60, 14),
      GOAL(900, 320),
    ],
    triggers: [
      T(352, 260, 36, 70, [
        { op: "fx", v: "fakeVictory" },
        { op: "remove", ids: [] },
        { op: "shake", v: 7 },
        { op: "msg", v: "keep going right" },
      ]),
    ],
  },

  // 10 — DARKNESS
  {
    name: "BROWNOUT",
    hint: "remember the shapes",
    w: 640,
    h: 360,
    spawn: { x: 34, y: 320 },
    par: 34,
    entities: [
      ...floor(320, [
        [0, 160],
        [250, 90],
        [400, 90],
        [560, 80],
      ]),
      S(170, 258, 60, 14),
      S(330, 244, 60, 14),
      S(490, 258, 60, 14),
      SPIKE(160, 348, 400, 12),
      COIN("l10c1", 196, 226),
      COIN("l10c2", 356, 212),
      COIN("l10c3", 516, 226),
      GOAL(606, 320),
    ],
    triggers: [
      T(140, 200, 20, 130, [{ op: "dark", v: 74 }, { op: "shake", v: 4 }, { op: "msg", v: "lights out" }]),
      T(560, 240, 40, 90, [{ op: "dark", v: 0 }]),
    ],
  },
];

/** Extra decorative imports kept for level authoring convenience. */
export const _unused = { VANISH, MOVE, CHASE, SECRET, S };
