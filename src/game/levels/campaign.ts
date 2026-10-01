import type { LevelDef } from "../types";
import { chain } from "./chain";
import * as N from "./sections";
import { SET1 } from "./set1";
import { SET2 } from "./set2";
import { SET3 } from "./set3";
import { SET4 } from "./set4";
import { SET5 } from "./set5";
import { SET6 } from "./set6";

/** Classic rooms from earlier versions, looked up by name. */
const ROOMS = new Map([...SET1, ...SET2, ...SET3, ...SET4, ...SET5, ...SET6].map((l) => [l.name, l]));
const R = (name: string): LevelDef => {
  const r = ROOMS.get(name);
  if (!r) throw new Error(`missing room ${name}`);
  return r;
};

/**
 * The 30-level campaign. Each level chains rooms so length and
 * complexity grow steadily: 1–5 teach, 6–10 troll, 11–15 combine,
 * 16–20 pressure, 21–25 controlled chaos, 26–29 gauntlet, 30 finale.
 */
export const CAMPAIGN: LevelDef[] = [
  // 1–5 · LEARN THE CHAOS
  chain("FIRST SPARK", "A / D to move · SPACE to jump · J to shoot", [R("WARM CIRCUITS"), N.TARGET_PRACTICE]),
  chain("FLOOR PLAN", "floors are a suggestion", [R("THE FLOOR"), N.CRACKED_UP]),
  chain("PEST CONTROL", "dotted blocks drop. pink bots bite", [R("FAKE FLOOR"), N.PEST_CONTROL]),
  chain("SPIKE WEATHER", "pink means pain", [R("SPIKE WEATHER"), N.SPIKE_RHYTHM]),
  chain("CEILING FAN", "something up there is impatient", [R("LOW CEILING"), R("BLIND TRUST")]),

  // 6–10 · THE GAME STARTS TROLLING
  chain("SAFE ZONE", "nothing holds forever", [R("FALLING WORLD"), N.SAFE_ZONE]),
  chain("CROSSED WIRES", "the wiring gets crossed", [R("BACKWARDS"), R("STUTTER STEP"), N.WALL_SALE]),
  chain("TREASURE HUNT", "walls lie. chests too", [R("SOFT WALLS"), N.TREASURE, R("PATCH CABLES")]),
  chain("FALSE ADVERTISING", "not every exit is one", [R("FALSE DOOR"), N.TURRET_TOWN]),
  chain("LIGHTS OUT", "remember the shapes", [N.LIGHT_SHOW, R("BROWNOUT"), R("SHY EXIT")]),

  // 11–15 · CHAOS BUILDS
  chain("ASSEMBLY LINE", "belts, beams, banana peels", [R("CONVEYOR SHIFT"), N.ROLLING_THUNDER, R("SLIPPERY SLOPE")]),
  chain("FOLLOW THE BOUNCE", "do not stop to admire it", [R("THE FOLLOWER"), N.BUNNY_HILL, R("BOUNCE HOUSE")]),
  chain("SHIELDS UP", "steady glow means real", [R("SHORT MEMORY"), N.SHIELDS_UP, R("TAG, YOU'RE IT")]),
  chain("SMALL TALK", "small robot, small doors", [R("SHRINK RAY"), N.PEST_CONTROL, R("BLINK BRIDGE"), R("SPIN CYCLE")]),
  chain("LOCKSMITH", "shoot what looks shootable", [R("OVERCLOCKED"), N.SHOOT_THE_LOCK, R("BRITTLE BRICKS")]),

  // 16–20 · SERIOUS TROLLING
  chain("SWAP MEET", "four doors, two platforms, zero trust", [R("FOUR DOORS"), N.SWAP_MEET, R("PATTERN RECOGNITION"), N.LASER_GRID]),
  chain("SAVE SCUM", "not every flag saves you", [R("COMBINATION LOCK"), N.FAKE_SAVE, R("RUSH HOUR")]),
  chain("HEAVY LIFTING", "big robot needs the high road", [R("GROWTH SPURT"), N.ROLLING_THUNDER, R("SWITCHBOARD"), R("CONNECT THE DOTS")]),
  chain("TRAP DOOR", "the floor has a back door", [R("STATIC STORM"), N.TRAP_DOOR, R("PAY ATTENTION"), R("DO NOT JUMP")]),
  chain("THE ARENA", "the factory wants a word", [R("CHAOS MACHINE"), N.ARENA]),

  // 21–25 · CONTROLLED CHAOS
  chain("NEAR-DEATH EXPERIENCE", "you saw that coming. right?", [R("CLINICALLY DEAD"), N.LASER_GRID, R("GRAVITY FACTORY")]),
  chain("SENTRY NEST", "think, then shoot", [R("MIND PALACE"), N.SENTRY_NEST, R("TELEPHONE GAME")]),
  chain("DASH HOUR", "walls with places to be", [R("TWO DOORS"), N.DASH_HOUR, R("OBSERVATORY"), R("SHUFFLE ROOM")]),
  chain("GAMBLER", "pink latch, bad latch", [R("WELCOME BACK"), N.CHEST_GAMBLE, R("WHERE'S THE DOOR"), R("FACTORY FLOOR")]),
  chain("FINAL EXAM", "everything you learned, graded", [R("FINAL EXAM"), N.GAUNTLET_A, R("EXAM DAY")]),

  // 26–29 · THE FINAL GAUNTLET
  chain("THE COMPLEX", "a lot of rooms. a lot of opinions", [R("THE COMPLEX"), N.SENTRY_NEST, N.FAKE_FINISH]),
  chain("EASY MODE", "this one is easy. promise.", [R("EASY MODE"), N.GAUNTLET_B, R("UP IS OPTIONAL"), R("THE GRAND TOUR")]),
  chain("LAST CALL", "the door has opinions", [R("LAST CALL"), N.DASH_HOUR, N.CHEST_GAMBLE, R("THE LAST LIE")]),
  chain("FINAL CHAOS", "one more try", [R("FINAL CHAOS"), N.GAUNTLET_A, N.GAUNTLET_B]),

  // 30 · THE CHAOS FINALE
  chain("THE CHAOS FINALE", "you thought you figured me out?", [
    N.FINALE_RUN,
    N.FINALE_PUZZLE,
    N.FINALE_CHASE,
    N.FINALE_CORE,
  ]),
];
