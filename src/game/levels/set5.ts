import type { LevelDef } from "../types";
import {
  BUTTON,
  COIN,
  CP,
  DECOY,
  GOAL,
  HIDDEN,
  MARK,
  MEM,
  MSPIKE,
  PSPIKE,
  S,
  SECRET,
  SIGN,
  SPIKE,
  T,
  TP,
  WALL,
  floor,
} from "./helpers";

/** Levels 41–50 — WORLD 5: MIND GAMES. Look first, jump second. */
export const SET5: LevelDef[] = [
  // 41 — easy: memory
  {
    name: "PAY ATTENTION",
    hint: "the path forgets you",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 14,
    entities: [
      ...floor(320, [
        [0, 100],
        [540, 100],
      ]),
      SPIKE(100, 348, 440),
      MEM(120, 290, 60),
      MEM(220, 262, 60),
      MEM(320, 290, 60),
      MEM(420, 262, 60),
      COIN("l41c1", 245, 215),
      COIN("l41c2", 345, 262),
      COIN("l41c3", 445, 215),
      GOAL(610, 320),
    ],
  },

  // 42 — medium: invisible path with clues
  {
    name: "CONNECT THE DOTS",
    hint: "the ceiling knows",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 18,
    entities: [
      ...floor(320, [
        [0, 100],
        [560, 80],
      ]),
      SPIKE(100, 348, 460),
      HIDDEN(130, 290, 50, 14, 40),
      HIDDEN(230, 262, 50, 14, 40),
      HIDDEN(330, 290, 50, 14, 40),
      HIDDEN(440, 262, 50, 14, 40),
      MARK(155),
      MARK(255),
      MARK(355),
      MARK(465),
      COIN("l42c1", 149, 262),
      COIN("l42c2", 349, 262),
      COIN("l42c3", 459, 232),
      GOAL(610, 320),
    ],
  },

  // 43 — surprise: two routes, the honest-looking door lies
  {
    name: "TWO DOORS",
    hint: "one sign tells the truth",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 18,
    bonus: { kind: "avoid", id: "up", text: "never step on the high road" },
    entities: [
      ...floor(320, [[0, 640]]),
      S(160, 262, 60, 14),
      S(260, 200, 380, 14, { id: "up" }),
      DECOY(600, 200),
      SIGN(610, 150, "EXIT"),
      MSPIKE(360, 308, 30, 60, 0, 60),
      SIGN(560, 272, "NOT EXIT"),
      COIN("l43c1", 190, 230),
      COIN("l43c2", 400, 170),
      COIN("l43c3", 470, 290),
      GOAL(600, 320),
    ],
    triggers: [
      T(596, 160, 28, 40, [{ op: "warp", x: 40, y: 300 }, { op: "msg", v: "that sign lied. the other one won't." }], {
        once: false,
      }),
    ],
  },

  // 44 — medium: switches ("DO NOT PRESS" is the answer)
  {
    name: "SWITCHBOARD",
    hint: "buttons open things. usually.",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 22,
    entities: [
      ...floor(320, [[0, 640]]),
      S(80, 250, 80, 14),
      BUTTON(110, 250),
      S(300, 120, 24, 200, { id: "d1" }),
      BUTTON(200, 320, "PRESS ME"),
      S(390, 250, 60, 14),
      BUTTON(410, 250, "DO NOT PRESS"),
      S(500, 120, 24, 200, { id: "d2" }),
      COIN("l44c1", 120, 210),
      COIN("l44c2", 420, 200),
      COIN("l44c3", 560, 290),
      GOAL(600, 320),
    ],
    triggers: [
      T(110, 236, 18, 14, [{ op: "remove", ids: ["d1"] }, { op: "msg", v: "click." }]),
      T(200, 306, 18, 14, [
        { op: "fx", v: "glitch" },
        { op: "confetti" },
        { op: "msg", v: "that did nothing. probably." },
      ]),
      T(410, 236, 18, 14, [{ op: "remove", ids: ["d2"] }, { op: "msg", v: "okay, you pressed it. fine." }]),
    ],
  },

  // 45 — hard: pattern spikes
  {
    name: "PATTERN RECOGNITION",
    hint: "pink breathes in waves",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 20,
    entities: [
      ...floor(320, [[0, 640]]),
      PSPIKE(140, 308, 60, 2, 0),
      PSPIKE(260, 308, 60, 2, 1.34),
      PSPIKE(380, 308, 60, 2, 0.67),
      PSPIKE(500, 308, 60, 2, 0),
      S(370, 240, 80, 14),
      COIN("l45c1", 170, 280),
      COIN("l45c2", 290, 250),
      COIN("l45c3", 404, 210),
      GOAL(606, 320),
    ],
  },

  // 46 — funny: the sign, and a trap that changes after you die
  {
    name: "DO NOT JUMP",
    hint: "read the signs",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 16,
    entities: [
      ...floor(320, [
        [0, 380],
        [440, 200],
      ]),
      SIGN(300, 262, "DO NOT JUMP"),
      SPIKE(380, 348, 60),
      SIGN(410, 250, "OK NOW JUMP"),
      SPIKE(480, 308, 40, 12, { hidden: true, id: "sp1" }),
      SPIKE(540, 308, 40, 12, { hidden: true, id: "sp2" }),
      COIN("l46c1", 300, 290),
      COIN("l46c2", 404, 260),
      COIN("l46c3", 596, 290),
      GOAL(612, 320),
    ],
    triggers: [
      T(250, 200, 100, 130, [{ op: "confetti" }, { op: "msg", v: "you jumped. the sign is disappointed." }], {
        when: "jump",
      }),
      T(446, 260, 16, 70, [{ op: "show", ids: ["sp1"] }, { op: "shake", v: 5 }], { tell: true, maxDeaths: 0 }),
      T(506, 260, 16, 70, [{ op: "show", ids: ["sp2"] }, { op: "msg", v: "I moved it. you're welcome." }], {
        tell: true,
        minDeaths: 1,
      }),
    ],
  },

  // 47 — new mechanic: the room rearranges
  {
    name: "SHUFFLE ROOM",
    hint: "the room is restless",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 18,
    entities: [
      ...floor(320, [
        [0, 100],
        [560, 80],
      ]),
      SPIKE(100, 348, 460),
      S(130, 280, 60, 14, { id: "a" }),
      S(240, 250, 60, 14, { id: "b" }),
      S(350, 280, 60, 14, { id: "c" }),
      S(460, 250, 60, 14, { id: "d" }),
      COIN("l47c1", 150, 240),
      COIN("l47c2", 374, 200),
      COIN("l47c3", 464, 250),
      GOAL(606, 320),
    ],
    triggers: [
      T(240, 200, 20, 50, [
        { op: "shift", ids: ["c"], dx: 0, dy: -40 },
        { op: "shift", ids: ["d"], dx: -20, dy: 40 },
        { op: "msg", v: "furniture moved" },
      ], { tell: true }),
    ],
  },

  // 48 — combination: fake door, fake wall, teleport
  {
    name: "WHERE'S THE DOOR",
    hint: "doors, walls and cables all lie a little",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 20,
    entities: [
      ...floor(320, [[0, 640]]),
      S(420, 60, 24, 160),
      WALL(420, 220, 24, 100),
      DECOY(300, 320),
      TP(360, 292, 560, 150),
      S(520, 150, 100, 14),
      SECRET("s48", 530, 110),
      COIN("l48c1", 250, 290),
      COIN("l48c2", 580, 120),
      COIN("l48c3", 480, 290),
      GOAL(600, 320),
    ],
    triggers: [
      T(296, 280, 24, 40, [{ op: "warp", x: 40, y: 300 }, { op: "msg", v: "wrong door. classic." }], {
        once: false,
      }),
    ],
  },

  // 49 — hard: observe, then darkness
  {
    name: "OBSERVATORY",
    hint: "look before you leap",
    w: 640,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 22,
    entities: [
      ...floor(320, [
        [0, 90],
        [570, 70],
      ]),
      SIGN(44, 262, "LOOK FIRST"),
      SPIKE(90, 348, 480),
      S(110, 280, 50, 14),
      S(200, 244, 50, 14),
      S(300, 272, 50, 14),
      S(390, 236, 50, 14),
      S(480, 272, 50, 14),
      COIN("l49c1", 219, 210),
      COIN("l49c2", 319, 240),
      COIN("l49c3", 409, 200),
      GOAL(612, 320),
    ],
    triggers: [
      T(80, 200, 20, 130, [{ op: "dark", v: 80 }, { op: "msg", v: "memorized it?" }]),
      T(560, 200, 20, 130, [{ op: "dark", v: 0 }, { op: "msg", v: "lights back" }]),
    ],
  },

  // 50 — SPECIAL: MIND PALACE (three rooms)
  {
    name: "MIND PALACE",
    hint: "every room is a question",
    w: 1200,
    h: 360,
    spawn: { x: 30, y: 320 },
    par: 50,
    entities: [
      ...floor(320, [
        [0, 90],
        [390, 410],
        [1100, 100],
      ]),
      // room 1: memory
      SPIKE(90, 348, 300),
      MEM(110, 290, 60),
      MEM(210, 262, 60),
      MEM(310, 290, 60),
      CP(420, 320),
      // room 2: switch + rhythm
      S(450, 250, 60, 14),
      BUTTON(470, 250, "PULL"),
      S(560, 140, 24, 180, { id: "door" }),
      PSPIKE(620, 308, 50, 2, 0),
      PSPIKE(700, 308, 50, 2, 1),
      CP(780, 320),
      // room 3: invisible path + dramatic moment
      SPIKE(800, 348, 300),
      HIDDEN(820, 290, 50, 14, 45),
      HIDDEN(920, 262, 50, 14, 45),
      HIDDEN(1020, 290, 50, 14, 45),
      MARK(845),
      MARK(945),
      MARK(1045),
      DECOY(1120, 320),
      HIDDEN(1100, 240, 40, 14),
      SECRET("s50", 1112, 196),
      COIN("l50c1", 240, 230),
      COIN("l50c2", 480, 210),
      COIN("l50c3", 939, 230),
      GOAL(1176, 320),
    ],
    triggers: [
      T(470, 236, 18, 14, [{ op: "remove", ids: ["door"] }, { op: "msg", v: "door open" }]),
      T(1116, 280, 24, 40, [{ op: "fx", v: "didIt" }, { op: "shake", v: 4 }]),
    ],
  },
];
