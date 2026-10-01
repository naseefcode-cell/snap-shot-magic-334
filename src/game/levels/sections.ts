import type { EntityDef, LevelDef, Op } from "../types";
import {
  BOOMBTN,
  BOULDER,
  CHASE,
  CHEST,
  COIN,
  CP,
  CRAWL,
  DASH,
  DECOY,
  GOAL,
  HOP,
  LASER,
  MOVE,
  POWER,
  PSPIKE,
  S,
  SECRET,
  SENTRY,
  SIGN,
  SPIKE,
  T,
  TARGET,
  TEMP,
  VLASER,
  floor,
} from "./helpers";

/**
 * Hand-built sections that introduce the Chaos Bolt, enemies and the new
 * troll traps. Campaign levels chain these with the classic rooms.
 * Every section is 360 tall with its floor top at y = 320.
 */

const F = 320;
const sec = (name: string, w: number, entities: EntityDef[], triggers: LevelDef["triggers"] = [], par = 14): LevelDef => ({
  name,
  w,
  h: 360,
  spawn: { x: 30, y: F },
  par,
  entities: [...entities, GOAL(w - 34, F)],
  triggers,
});
const crack = (x: number, w: number, id: string): EntityDef => ({ type: "fall", kind: "crack", x, y: F, w, h: 40, id });
const hiddenCoin = (id: string, x: number, y: number): EntityDef => ({ ...COIN(id, x, y), hidden: true, id });
const msg = (v: string): Op => ({ op: "msg", v });

// ---------------------------------------------------------------- teach

export const TARGET_PRACTICE = sec(
  "TARGET PRACTICE",
  640,
  [
    ...floor(F, [[0, 640]]),
    SIGN(150, 250, "J / X / F = SHOOT"),
    S(320, 180, 22, 140, { id: "gate" }),
    S(320, 0, 22, 180),
    TARGET(286, 296, [{ op: "remove", ids: ["gate"] }, msg("good shot")]),
    CRAWL(430, F, 120, "cr"),
    COIN("n1c1", 200, 270),
    COIN("n1c2", 480, 260),
  ],
  [T(60, 260, 20, 70, [msg("press J, X or F to fire a Chaos Bolt")])],
);

export const CRACKED_UP = sec(
  "CRACKED UP",
  640,
  [
    ...floor(F, [[0, 150], [520, 120]]),
    crack(150, 90, "k1"),
    crack(240, 90, "k2"),
    crack(330, 90, "k3"),
    crack(420, 100, "k4"),
    SPIKE(150, 348, 370, 12),
    S(300, 236, 60, 14),
    COIN("n2c1", 322, 204),
    CRAWL(540, F, 50, "cr"),
  ],
  [T(120, 260, 20, 70, [msg("totally normal floor ahead")])],
);

export const PEST_CONTROL = sec(
  "PEST CONTROL",
  720,
  [
    ...floor(F, [[0, 720]]),
    CRAWL(180, F, 120, "a"),
    S(320, 254, 100, 14),
    CRAWL(320, 254, 82, "b", 40),
    CRAWL(470, F, 150, "c", 62),
    COIN("n3c1", 360, 220),
    COIN("n3c2", 600, 286),
  ],
);

export const SPIKE_RHYTHM = sec(
  "SPIKE RHYTHM",
  640,
  [
    ...floor(F, [[0, 640]]),
    PSPIKE(150, 308, 60, 2, 0),
    PSPIKE(250, 308, 60, 2, 0.5),
    PSPIKE(350, 308, 60, 2, 1),
    PSPIKE(450, 308, 60, 2, 1.5),
    COIN("n4c1", 230, 280),
    COIN("n4c2", 430, 280),
  ],
  [T(110, 260, 20, 70, [msg("dim spikes are asleep. watch the rhythm")])],
);

// ---------------------------------------------------------------- troll

export const SAFE_ZONE = sec(
  "SAFE ZONE",
  720,
  [
    ...floor(F, [[0, 720]]),
    S(260, 214, 180, 14),
    SIGN(350, 196, "SAFE ZONE"),
    CRAWL(120, F, 60, "amb1", 50, true),
    CRAWL(520, F, 100, "amb2", 50, true),
    HOP(600, F, 60, "amb3", 50, true),
    BOOMBTN(340, F, [{ op: "show", ids: ["n5c2"] }, msg("a gift. no catch.")], "DO NOT PRESS"),
    COIN("n5c1", 350, 180),
    hiddenCoin("n5c2", 380, 260),
  ],
  [T(300, 240, 20, 90, [{ op: "show", ids: ["amb1", "amb2", "amb3"] }, { op: "shake", v: 5 }, msg("SAFE ZONE (TERMS APPLY)")])],
);

export const WALL_SALE = sec(
  "WALL SALE",
  680,
  [
    ...floor(F, [[0, 680]]),
    S(260, 262, 50, 14),
    S(330, 200, 90, 14),
    DASH(620, 214, 26, 106, "dw", -600, 230),
    COIN("n6c1", 368, 168),
  ],
  [T(170, 230, 16, 100, [{ op: "arm", ids: ["dw"] }, { op: "msg", v: "GET UP HIGH" }], { tell: true })],
  16,
);

export const TREASURE = sec(
  "TREASURE?",
  640,
  [
    ...floor(F, [[0, 640]]),
    CHEST(200, F, [{ op: "show", ids: ["n7c1"] }, msg("real treasure!")]),
    hiddenCoin("n7c1", 204, 270),
    CHEST(380, F, [{ op: "boom" }], true),
    CHEST(500, F, [{ op: "show", ids: ["mimic"] }, msg("it bites")], true),
    CRAWL(520, F, 80, "mimic", 50, true),
  ],
  [T(120, 260, 20, 70, [msg("pink latches look... suspicious")])],
);

export const TURRET_TOWN = sec(
  "TURRET TOWN",
  760,
  [
    ...floor(F, [[0, 760]]),
    SENTRY(380, F, 2.4, "s1"),
    S(470, 250, 70, 14),
    SENTRY(640, F, 2.6, "s2"),
    COIN("n8c1", 494, 218),
  ],
  [T(120, 260, 20, 70, [msg("turrets glow before they fire. jump the shots")])],
);

export const LIGHT_SHOW = sec(
  "LIGHT SHOW",
  640,
  [
    ...floor(F, [[0, 640]]),
    S(0, 0, 640, 40),
    VLASER(180, F, 40, 3, 0),
    VLASER(300, F, 40, 3, 1),
    VLASER(420, F, 40, 3, 2),
    COIN("n9c1", 240, 286),
    COIN("n9c2", 360, 286),
  ],
  [T(110, 260, 20, 70, [msg("thin line · flicker · BEAM")])],
);

export const ROLLING_THUNDER = sec(
  "ROLLING THUNDER",
  720,
  [
    ...floor(F, [[0, 720]]),
    S(250, 252, 80, 14),
    S(470, 252, 80, 14),
    BOULDER(660, F, "b1", -1, 170),
    COIN("n10c1", 280, 220),
  ],
  [T(210, 230, 16, 100, [{ op: "arm", ids: ["b1"] }, msg("rumble...")], { tell: true })],
);

export const SHIELDS_UP = sec(
  "SHIELDS UP",
  760,
  [
    ...floor(F, [[0, 760]]),
    POWER(140, 290),
    SENTRY(420, F, 1.8, "s1"),
    S(480, 0, 22, 260),
    POWER(560, 290, [msg("that was a sticker."), { op: "reverse", v: true }, { op: "later", t: 2.5, ops: [{ op: "reverse", v: false }, msg("controls back")] }], true),
    CRAWL(600, F, 80, "c1"),
    COIN("n11c1", 300, 280),
  ],
  [T(80, 260, 20, 70, [msg("steady glow = real. flicker = joke")])],
);

export const BUNNY_HILL = sec(
  "BUNNY HILL",
  760,
  [
    ...floor(F, [[0, 160], [240, 280], [600, 160]]),
    S(160, 290, 80, 14),
    SPIKE(160, 348, 80, 12),
    HOP(300, F, 160, "h1"),
    S(520, 290, 80, 14),
    SPIKE(520, 348, 80, 12),
    HOP(630, F, 60, "h2", 70),
    COIN("n12c1", 400, 230),
  ],
);

export const SHOOT_THE_LOCK = sec(
  "SHOOT THE LOCK",
  760,
  [
    ...floor(F, [[0, 300], [400, 360]]),
    SPIKE(300, 348, 100, 12),
    S(250, 230, 60, 14),
    TARGET(470, 170, [{ op: "remove", ids: ["gate"] }, msg("unlocked")]),
    S(520, 120, 22, 200, { id: "gate" }),
    S(520, 0, 22, 120),
    TARGET(640, 296, [{ op: "arm", ids: ["rock"] }, msg("why would you shoot that")]),
    SIGN(646, 280, "DON'T"),
    BOULDER(720, F, "rock", -1, 120),
    COIN("n13c1", 272, 196),
  ],
  [T(200, 150, 20, 170, [msg("shoot the target up high")])],
);

export const SWAP_MEET = sec(
  "SWAP MEET",
  720,
  [
    ...floor(F, [[0, 150], [580, 140]]),
    S(170, 282, 70, 14),
    S(300, 250, 70, 14, { id: "pa" }),
    S(300, 170, 70, 14, { id: "pb" }),
    SPIKE(300, 158, 70, 12, { id: "pbs" }),
    S(440, 282, 70, 14),
    SPIKE(150, 348, 430, 12),
    COIN("n14c1", 330, 216),
  ],
  [
    T(170, 220, 70, 62, [
      { op: "msg", v: "SWAP INCOMING" },
      { op: "later", t: 0.9, ops: [{ op: "shift", ids: ["pa"], dx: 0, dy: -80 }, { op: "shift", ids: ["pb", "pbs"], dx: 0, dy: 80 }] },
      { op: "later", t: 3.2, ops: [{ op: "shift", ids: ["pa"], dx: 0, dy: 80 }, { op: "shift", ids: ["pb", "pbs"], dx: 0, dy: -80 }] },
    ], { tell: true }),
  ],
);

export const FAKE_SAVE = sec(
  "FAKE SAVE",
  760,
  [
    ...floor(F, [[0, 760]]),
    { type: "fakecheckpoint", x: 230, y: F - 30, w: 6, h: 30, label: "checkpoint? ...", ops: [{ op: "show", ids: ["am1", "am2"] }] },
    CRAWL(320, F, 100, "am1", 55, true),
    HOP(420, F, 80, "am2", 60, true),
    CP(560, F),
    COIN("n15c1", 480, 270),
  ],
);

export const TRAP_DOOR = sec(
  "TRAP DOOR",
  760,
  [
    ...floor(F, [[0, 220], [380, 380]]),
    S(220, F, 160, 40, { id: "door" }),
    S(220, 352, 160, 8),
    COIN("n16c1", 290, 336),
    SECRET("n16s", 340, 334),
    CRAWL(440, F, 120, "c1"),
    SENTRY(640, F, 2.2, "s1"),
  ],
  [T(400, 240, 16, 90, [{ op: "msg", v: "*click*" }, { op: "later", t: 0.6, ops: [{ op: "remove", ids: ["door"] }] }], { tell: true })],
);

// ------------------------------------------------------------- combinations

export const ARENA = sec(
  "THE ARENA",
  900,
  [
    ...floor(F, [[0, 900]]),
    S(0, 0, 900, 30),
    S(200, 250, 80, 14),
    S(620, 250, 80, 14),
    MOVE(380, 210, 90, 14, 60, 0, 60),
    CRAWL(300, F, 140, "a", 60),
    HOP(500, F, 120, "b", 70),
    SENTRY(830, F, 2.2, "s"),
    PSPIKE(420, 308, 60, 2.2, 0),
    VLASER(560, F, 30, 3.2, 1),
    COIN("n17c1", 230, 220),
    COIN("n17c2", 650, 220),
  ],
  [T(100, 250, 20, 80, [msg("everything at once. you've got this")])],
  22,
);

export const LASER_GRID = sec(
  "LASER GRID",
  860,
  [
    ...floor(F, [[0, 860]]),
    S(0, 0, 860, 40),
    VLASER(160, F, 40, 2.4, 0),
    LASER(240, 250, 160, 6, 2.4, 1.2),
    VLASER(300, F, 40, 2.4, 0.6),
    S(420, 260, 70, 14),
    VLASER(520, F, 40, 2, 0),
    VLASER(600, F, 40, 2, 1),
    CRAWL(640, F, 120, "c", 55),
    COIN("n18c1", 446, 228),
  ],
  [],
  20,
);

export const SENTRY_NEST = sec(
  "SENTRY NEST",
  880,
  [
    ...floor(F, [[0, 880]]),
    S(180, 250, 60, 14),
    SENTRY(300, F, 2, "s1"),
    S(360, 220, 80, 14),
    SENTRY(390, 220, 2.4, "s2"),
    SENTRY(560, F, 2, "s3"),
    POWER(620, 230),
    S(600, 246, 50, 14),
    SENTRY(760, F, 1.8, "s4"),
    COIN("n19c1", 396, 186),
  ],
  [],
  22,
);

export const DASH_HOUR = sec(
  "DASH HOUR",
  900,
  [
    ...floor(F, [[0, 900]]),
    S(200, 262, 50, 14),
    S(270, 200, 80, 14),
    DASH(840, 214, 26, 106, "d1", -820, 260),
    S(560, 262, 50, 14),
    S(630, 200, 80, 14),
    DASH(-30, 214, 26, 106, "d2", 900, 260),
    COIN("n20c1", 660, 168),
  ],
  [
    T(140, 230, 16, 100, [{ op: "arm", ids: ["d1"] }, msg("from the right!")], { tell: true }),
    T(500, 230, 16, 100, [{ op: "arm", ids: ["d2"] }, msg("...and the left")], { tell: true }),
  ],
  20,
);

export const CHEST_GAMBLE = sec(
  "CHEST GAMBLE",
  800,
  [
    ...floor(F, [[0, 800]]),
    S(180, 250, 90, 14),
    CHEST(215, 250, [{ op: "shield" }]),
    CHEST(330, F, [{ op: "show", ids: ["sp"] }, msg("spikes, obviously")], true),
    SPIKE(390, 308, 60, 12, { hidden: true, id: "sp" }),
    CHEST(500, F, [{ op: "show", ids: ["n21c1"] }]),
    hiddenCoin("n21c1", 504, 270),
    CHEST(620, F, [{ op: "boom" }, { op: "show", ids: ["h"] }], true),
    HOP(660, F, 60, "h", 60, true),
    POWER(420, 230, [msg("ha. no.")], true),
  ],
);

export const GAUNTLET_A = sec(
  "RUN THE GAUNTLET",
  1000,
  [
    ...floor(F, [[0, 260], [340, 300], [720, 280]]),
    TEMP(260, 300, 80, 2.4, 0, 14),
    SPIKE(260, 348, 80, 12),
    CRAWL(380, F, 200, "c1", 70),
    VLASER(500, F, 40, 2.6, 0),
    S(0, 0, 1000, 40),
    TEMP(640, 290, 80, 2.4, 1.2, 14),
    SPIKE(640, 348, 80, 12),
    SENTRY(900, F, 2, "s"),
    CP(760, F),
    COIN("n22c1", 290, 260),
    COIN("n22c2", 670, 250),
  ],
  [],
  26,
);

export const GAUNTLET_B = sec(
  "BOULDER RUSH",
  1000,
  [
    ...floor(F, [[0, 1000]]),
    S(0, 0, 1000, 30),
    BOULDER(-40, F, "b1", 1, 150),
    S(280, 250, 60, 14),
    PSPIKE(380, 308, 60, 1.8, 0),
    HOP(500, F, 120, "h1", 70),
    S(640, 250, 60, 14),
    PSPIKE(740, 308, 60, 1.8, 0.9),
    BOULDER(980, F, "b2", -1, 160),
    S(840, 230, 70, 14),
    COIN("n23c1", 300, 220),
  ],
  [
    T(120, 230, 16, 100, [{ op: "arm", ids: ["b1"] }, msg("behind you")], { tell: true }),
    T(780, 230, 16, 100, [{ op: "arm", ids: ["b2"] }, msg("in front of you")], { tell: true }),
  ],
  24,
);

export const FAKE_FINISH = sec(
  "FAKE FINISH",
  760,
  [
    ...floor(F, [[0, 760]]),
    DECOY(300, F),
    SIGN(310, 260, "EXIT →"),
    CRAWL(380, F, 120, "am", 55, true),
    HOP(500, F, 100, "am2", 65, true),
    COIN("n24c1", 600, 280),
  ],
  [
    T(296, 270, 28, 60, [
      { op: "fx", v: "fakeVictory" },
      { op: "shake", v: 7 },
      { op: "show", ids: ["am", "am2"] },
      msg("lol. keep going"),
    ]),
  ],
);

// ----------------------------------------------------------------- finale

export const FINALE_RUN = sec(
  "FINALE: THE RUN",
  1100,
  [
    ...floor(F, [[0, 300], [380, 320], [780, 320]]),
    S(0, 0, 1100, 30),
    crack(300, 80, "k1"),
    SPIKE(300, 348, 80, 12),
    VLASER(460, F, 30, 2.2, 0),
    VLASER(560, F, 30, 2.2, 1.1),
    CRAWL(600, F, 80, "c1", 70),
    TEMP(700, 300, 80, 2, 0, 14),
    SPIKE(700, 348, 80, 12),
    SENTRY(1000, F, 1.8, "s1"),
    DASH(1080, 214, 26, 106, "d1", -300, 260),
    S(880, 262, 50, 14),
    S(940, 200, 80, 14),
    COIN("n25c1", 330, 270),
  ],
  [T(830, 230, 16, 100, [{ op: "arm", ids: ["d1"] }], { tell: true })],
  26,
);

export const FINALE_PUZZLE = sec(
  "FINALE: THE LOCKS",
  900,
  [
    ...floor(F, [[0, 900]]),
    S(0, 0, 900, 30),
    S(700, 30, 24, 290, { id: "g1" }),
    S(160, 250, 80, 14),
    S(300, 190, 80, 14),
    TARGET(330, 100, [{ op: "remove", ids: ["l1"] }, msg("1 / 3")]),
    S(320, 116, 40, 8, { id: "l1" }),
    TARGET(500, 290, [{ op: "show", ids: ["n26c1"] }, msg("2 / 3")]),
    hiddenCoin("n26c1", 560, 220),
    S(460, 250, 70, 14),
    TARGET(650, 150, [{ op: "remove", ids: ["g1"] }, msg("3 / 3 — door open")]),
    S(560, 200, 80, 14),
    CRAWL(380, F, 120, "c1", 60),
  ],
  [T(120, 240, 20, 80, [msg("three locks. one is shy (look for the pink shelf)")])],
  28,
);

export const FINALE_CHASE = sec(
  "FINALE: THE CHASE",
  1200,
  [
    ...floor(F, [[0, 400], [460, 300], [820, 380]]),
    CHASE(-60, 280, "hunter", 96, 24),
    S(400, 280, 60, 14),
    SPIKE(400, 348, 60, 12),
    CRAWL(520, F, 120, "c1", 60),
    S(760, 270, 60, 14),
    SPIKE(760, 348, 60, 12),
    BOULDER(1180, F, "b1", -1, 140),
    S(950, 252, 80, 14),
    COIN("n27c1", 980, 220),
  ],
  [
    T(80, 200, 20, 130, [{ op: "arm", ids: ["hunter"] }, msg("RUN")]),
    T(900, 200, 20, 130, [{ op: "arm", ids: ["b1"] }, msg("of course there's a boulder")], { tell: true }),
  ],
  26,
);

export const FINALE_CORE: LevelDef = {
  name: "FINALE: THE CHAOS CORE",
  w: 760,
  h: 360,
  spawn: { x: 30, y: F },
  par: 40,
  entities: [
    ...floor(F, [[0, 760]]),
    S(0, 0, 760, 30),
    S(140, 240, 80, 14),
    S(340, 190, 80, 14),
    S(520, 240, 60, 14),
    { type: "enemy", kind: "core", x: 650, y: 150, w: 40, h: 40, id: "core", hp: 14, ops: [{ op: "show", ids: ["exit"] }, { op: "confetti" }, msg("THE CORE IS DOWN")] },
    VLASER(300, F, 30, 3, 0),
    VLASER(470, F, 30, 3, 1.5),
    POWER(368, 160),
    CRAWL(200, F, 200, "m1", 60, true),
    HOP(480, F, 120, "m2", 70, true),
    { ...GOAL(700, F), id: "exit", hidden: true },
  ],
  triggers: [
    T(100, 220, 20, 110, [msg("THE CHAOS CORE. shoot it 14 times")]),
    T(420, 150, 30, 40, [{ op: "show", ids: ["m1", "m2"] }, msg("it called for backup")]),
  ],
};
