# CHAOS BOLT — 60-level campaign upgrade

Expand the game from 30 to 60 unique levels split into 6 worlds, and add humour, new mechanics, optional challenges, an endless mode and more polish. The original 30 levels stay in the game, but some get re-sequenced and improved.

## Worlds (10 levels each; pacing: easy, medium, surprise, medium, hard, funny, new mechanic, combination, hard, special)

1. **Learning the Lies (1–10)**: fake floors, falling blocks, hidden spikes, fake walls, moving platforms, fake goal, first secret room, first troll trap, a beginner combination level. Built mostly from the existing early levels, retuned to be funny rather than hard.
2. **Trap City (11–20)**: spike walls, moving spikes, ceiling traps, platforms that move when you get close, fake checkpoints, teleport pads, falling ceilings, platforms that reverse direction, fake safe zones. **Level 20 is the "Trap Gauntlet" boss level.**
3. **The World Is Broken (21–30)**: gravity flips, screen flips, camera tricks, darkness, fake level transitions, floors vanishing behind you, short reversed-controls sections, looping rooms, fourth-wall jokes ("THIS LEVEL IS DEFINITELY SAFE.").
4. **Chaos Factory (31–40)**: conveyor belts, ice, bounce pads, breakable blocks, platforms that follow you or run away, rotating platforms, temporary platforms, timed doors, a friendly-looking object that turns out to be a trap. **Level 40 is the "Chaos Machine" boss level.**
5. **Mind Games (41–50)**: memory sections, invisible paths with clues, multiple routes, fake exits, secret switches, hidden doors, pattern traps, traps that change after you die, rooms that rearrange themselves.
6. **The Final Chaos (51–60)**: 55 is a multi-stage challenge, 56 tests what you learned earlier, 57 is a fake "easy" level that keeps getting wilder, 58 is a large multi-room level with checkpoints, 59 is a final warm-up, and **60 is the finale**: trap runs, a puzzle, a chase, a transformation, a fake ending, then the real exit and a funny ending.

## Humour and psychology
- Signs and props: "DO NOT JUMP" sign, "DO NOT PRESS" button, a fake EXIT door that sends you back to the start of the room, a helpful platform that drifts away, an elevator that ends up lower than it started, a fake checkpoint (used rarely), and a "YOU DID IT!" freeze that turns out to be a fake-out.
- Some suspicious spots are deliberately safe. Some traps have a delay, need a specific action to trigger, or change after you die.
- Varied death messages ("Interesting decision.", "Almost.", "Definitely intentional." and more), shown only some of the time.
- Harmless random background events (a tiny passer-by, a falling pebble, a fake warning). They can never block a level.
- If you die many times in the same spot, a subtle hint glow appears there.

## Progress and rewards
- 0–3 coins per level, some of them on risky side routes. 15+ secret rooms. Campaign completion percentage.
- Optional goals on every level: no deaths, all coins, beat the target time, and a per-level bonus goal (for example "never touch the red block" or "use the secret route").
- Level select grouped by world tabs, with a "37 / 60 LEVELS" counter. Each level card shows its status, coins, best time, deaths and whether you found its secret.
- 24 achievements. Keeps the current ones and adds First Blood, Trap Tourist, Still Here, Coin Hunter, Treasure Hunter, Nope, Big Brain, Chaos Apprentice, Chaos Master, Chaos Legend and more original ones.
- After level 60: **Chaos Mode** gets more modifiers (slow player, high gravity, reverse gravity, tiny player, shuffled spike positions, moving platforms) and uses only the ones that can't break a given level. **Endless Trap Mode** builds rooms that get harder, and tracks score, distance, deaths, coins and best score, with instant retry.

## Polish
Squash and stretch, better jump and death animations, animated goal and coins, smooth screen transitions, button hover effects, a separate music theme for each world. Target stays 60 FPS on low-end devices.

## Technical section
- New entity types: conveyor, ice, bounce, breakable, follower, runner, rotating (swinging platform), temp, door (timed/switch), switch, sign, button, fakecheckpoint, fakeexit, elevator, movingspike, prop (NPC that turns into a trap). New ops: `respawnAt`, `freezeFrame` (fake "YOU DID IT"), `rearrange`, `onDeathCount` variants, `sign` text, plus `requireAction` (jump/still) triggers.
- Level data stays declarative: `src/game/levels/world1.ts` through `world6.ts`. Old set1–3 content gets redistributed into those files, and each level carries a `world`, a `challenge` and a `par`.
- Save version bumps to v2 with a migration from v1, remapping old level indices to their new slots.
- Endless mode: `src/game/endless.ts` builds a `LevelDef` from about 12 chunk templates with a seeded RNG and a difficulty ramp. Every chunk gets a solvability check.
- Automated check: a headless script loads every level, confirms a safe spawn, and replays a scripted input route for each level to prove it can be completed. Levels that fail get fixed before handoff.
- Build in stages: engine mechanics, then worlds 1–2, 3–4, 5–6, then the UI (level select, challenges, completion %), achievements, Chaos/Endless modes, and finally polish and the automated check.
