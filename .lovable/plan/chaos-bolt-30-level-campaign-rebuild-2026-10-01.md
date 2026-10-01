# CHAOS BOLT — 30-level campaign rebuild

Bring the game back to exactly 30 levels, keeping the current art style, robot and platforming feel. Levels get longer and more chaotic as you go, and every trap gives a clear warning.

## New: the Chaos Bolt shot and enemies
The brief assumes shooting and enemies, which the game doesn't have yet. So this adds:
- **Shoot** button (J / X / F key, a touch button, gamepad X): fires a small energy bolt forward, with a short cooldown.
- **3 enemy types:** Crawler (walks back and forth, 1 hit), Hopper (jumps toward you, 1 hit), Sentry (stays put and fires slow shots after a visible charge-up, 2 hits). Touching an enemy kills you, the same way spikes do.
- An "Enemies defeated" count on the level complete screen.

## 15 trap types (introduced one at a time, then combined)
Cracking fake floor, dashing wall (warning stripe + sound), boom button (random good or bad result), rare fake checkpoint, troll chest, flashing disappearing platforms, fake exit, rolling boulder with dust, laser (warning, charge, fire, cooldown), spike patterns, real/fake power-ups, chasing hazard, trap door, swapping platforms, and Chaos Bolt targets (shooting one opens, destroys or changes something).

## Campaign (30 levels)
- **1–5 Learn the Chaos:** short. Movement, shooting, first enemies, first traps.
- **6–10 The Game Starts Trolling:** moving traps, fake safe areas, surprise enemies, timing.
- **11–15 Chaos Builds:** longer levels, trap combinations, risky shortcuts.
- **16–20 Serious Trolling:** multi-stage sequences, enemies mixed with traps, fake routes.
- **21–25 Controlled Chaos:** much longer, with mechanics combined in new ways.
- **26–29 Final Gauntlet:** the longest regular levels, with frequent checkpoints.
- **30 Finale:** several sections, a boss-style encounter, then the reward screen and ending.

Each level follows a rough pattern: easy start, teach, twist, combine, troll moment, harder version, reward, exit. The best existing levels are reused and extended where they fit; the rest are new.

## Progress and screens
- Level select shows 30 tiles with locked, completed and current states, and works well on phones.
- Each level saves your best time, fewest deaths and coins.
- Chaos Mode stays and unlocks after level 30. Endless Trap Mode and the extra 30 levels are removed.
- Saved progress past level 30 is trimmed, and achievements are adjusted to match.

## Testing
An automated check loads every level and confirms a safe start and no errors. Then key levels (1, 5, 10, 15, 20, 25, 29, 30) are played in the browser to look for impossible jumps, traps you can't avoid, broken checkpoints and stuck enemies.

## Technical section
- New entity types in `types.ts`: enemy (crawler/hopper/sentry), crackfloor, dashwall, button, chest, blink, fakeexit, boulder, laser, spikepattern, powerup, trapdoor, swap, bolttarget. Projectiles use a fixed object pool.
- `input.ts` adds a `shoot` action, and `TouchControls` gets a shoot button.
- Levels are rewritten as `levels/world1.ts`–`world6.ts` (5 levels each), and set1–6 plus `endless.ts` are deleted.
- `save.ts` bumps to v3 with a migration that clamps level indices to 30 and adds `enemies` and `bestTime`.
- `achievements.ts` gets updated: the 60-level ones are removed and Sharpshooter / Exterminator are added.
- Built in stages: engine (shooting, enemies, traps), then levels 1–15, then 16–30, then UI, then the automated check and fixes.
