# CHAOS BOLT — original 2D trap platformer

A complete, offline-capable browser game: 30 handcrafted trap levels, a small square robot hero with expressive eyes, minimalist retro neon-on-dark art, full save/progress, achievements, coins, secrets and Chaos Mode. No copied levels, art, names or sounds from any existing game.

## What you get

**Screens**
- Main menu: PLAY, LEVEL SELECT, ACHIEVEMENTS, SETTINGS
- Level select: 30 tiles, locked ones dimmed, showing stars + coins per level
- Gameplay HUD: Level, Deaths, Coins x/3, timer
- Pause menu: Resume, Restart, Level Select, Settings
- Level complete: deaths, time, coins, star rating, Next / Replay / Level Select
- Secret ending screen after level 30, plus Chaos Mode unlock

**Feel**
- Tight movement: acceleration, friction, gravity, variable jump height, coyote time, jump buffering
- Instant death and restart: shake, quick particle burst, counter ticks, auto-restart in ~0.4s; R restarts immediately
- Smooth follow camera with bounds, shake and occasional zoom for scripted surprises
- Checkpoints only in the longer levels

**Controls**
- Keyboard: A/D or arrows, Space/W/Up to jump, R restart, Esc pause
- Touch: large left/right/jump/restart buttons, size adjustable in settings
- Gamepad support via the browser Gamepad API

**Content**
- All 30 levels from your list, each with its own layout and named mechanic (disappearing floor, fake floor, ceiling crusher, invisible platforms, spikes, reversed controls, moving goal, fake goal, darkness, falling world, teleporters, mirroring, gravity flips, chaser, fake walls, freeze/unfreeze, tiny/giant player, scrolling world, memory platforms, decoy exits, forced speed, trap combos, chaos, fake death, reverse world, the loop, final test, multi-stage final trap)
- Every trap gets a visible tell before it can kill you — no unfair reactions
- Chaos Coins: 0–3 per level, never required
- ~12 secrets (hidden rooms, secret switches, alternate routes, easter eggs, secret level select code)
- 12 achievements with original names, unlocked with a small toast + sound

**Audio** — all synthesized with Web Audio API: jump, land, coin, death, checkpoint, complete, click, trap, achievement, plus a light generated background loop. Music and SFX toggles.

**Accessibility** — reduced shake, reduced flashing, high contrast, larger touch controls, audio toggles.

**Saving** — localStorage keeps completed levels, coins, deaths, per-level best time/stars, achievements, secrets and settings, so you can close the tab and come back.

## Technical section

- Canvas 2D game mounted in a single full-screen route at `/`, rendered client-only (no server rendering of the canvas), with proper page title/description metadata. No backend, no login; works offline once loaded.
- Fixed-timestep update loop with interpolated render; device-pixel-ratio aware canvas sizing, responsive letterboxed virtual resolution so desktop/tablet/phone all get the same playfield.
- Code split into modules under `src/game/`: `Game`, `Player`, `Physics`, `CollisionSystem` (AABB swept, tile/rect broadphase), `Camera`, `InputManager` (keyboard/touch/gamepad), `AudioManager`, `ParticleSystem`, `SaveManager`, `AchievementManager`, `TrapManager`, `LevelManager`, plus `levels/` data files (levels split across a few files, each level = geometry + entities + scripted event timeline).
- Traps are data-driven entities with a shared interface (`update`, `draw`, `onTouch`, `trigger`), so scripted surprises are declared per level instead of hardcoded in the loop.
- React handles only menus/HUD/overlays (styled with Tailwind and semantic design tokens); the game loop never re-renders React per frame — HUD reads from a lightweight store throttled to a few updates per second.
- Chaos Mode applies modifier objects on top of unmodified level data; original level definitions stay untouched.
- Performance: object pooling for particles, capped particle counts, no per-frame allocations in hot paths, offscreen-culled drawing, no external game libraries.

## Build order

1. Design system, shell route, menu/level-select/settings UI, save manager
2. Core engine: loop, physics, collision, camera, input, particles, audio
3. Level format + trap system, levels 1–10
4. Levels 11–20, checkpoints, secrets and coins
5. Levels 21–30, fake-death/loop/final-trap set pieces
6. Achievements, star ratings, secret ending, Chaos Mode
7. Playtest pass in browser: movement, death/restart, each level reachable end-to-end, mobile controls, persistence
