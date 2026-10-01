/**
 * GameEngine — fixed-timestep Canvas 2D engine for CHAOS BOLT.
 *
 * Systems in this file: Physics, CollisionSystem, Camera, TrapManager,
 * ParticleSystem and the render pass. Level content is pure data
 * (see ./levels), so traps are declarative and levels stay unique.
 */

import type { ChaosModifiers, EntityDef, HudState, LevelDef, LevelResult, Op, Trigger } from "./types";
import { audio } from "./audio";
import type { InputManager } from "./input";
import type { Settings } from "./save";

export const VW = 640;
export const VH = 360;

const GRAV = 1750;
const JUMP_V = 555;
const MAX_RUN = 190;
const ACCEL = 1500;
const FRICTION = 2000;
const AIR_FRICTION = 500;
const COYOTE = 0.09;
const BUFFER = 0.12;

const SOLID_TYPES = new Set([
  "solid", "vanish", "fall", "move", "memory", "freeze", "fakewall",
  "conveyor", "ice", "bounce", "breakable", "runner", "follower", "orbit", "temp",
]);

/** Occasional quips after a death — never on every death. */
const DEATH_LINES = [
  "Interesting decision.",
  "That wasn't supposed to work.",
  "Almost.",
  "Maybe don't do that again.",
  "Okay... now you know.",
  "Definitely intentional.",
  "Bold strategy.",
  "The floor sends its regards.",
  "Physics 1, robot 0.",
  "Noted for next time.",
];

/** Harmless ambient jokes for random events. */
const EVENT_LINES = [
  "WARNING: nothing is happening",
  "did you hear that?",
  "this message is harmless",
  "autosave? never heard of it",
  "the background is judging you",
];

function cycleOn(phase: number, period: number, offset: number, frac: number): boolean {
  return (((phase + offset) % period) + period) % period < period * frac;
}
const HAZARD_TYPES = new Set(["spike", "crusher", "chaser", "enemy", "laser", "boulder", "dashwall"]);

interface Bolt {
  on: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  enemy: boolean;
}

/** laser cycle: 0–.35 idle · .35–.6 charge · .6–.85 fire · cooldown */
function laserState(e: { phase: number; period?: number; offset?: number }): 0 | 1 | 2 {
  const per = e.period ?? 3;
  const t = ((((e.phase + (e.offset ?? 0)) % per) + per) % per) / per;
  return t >= 0.6 && t < 0.85 ? 2 : t >= 0.35 && t < 0.6 ? 1 : 0;
}

interface Ent extends EntityDef {
  ox: number;
  oy: number;
  px: number;
  py: number;
  removed: boolean;
  collected: boolean;
  touched: boolean;
  timer: number;
  phase: number;
  vy: number;
  falling: boolean;
  fade: number;
  soft: boolean; // temporarily non-solid (fake wall dissolved)
  dead: boolean; // hazard active
  cooldown: number;
  dir: number;
  hp: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export interface EngineHooks {
  onHud: (h: HudState) => void;
  onComplete: (r: LevelResult) => void;
  onDeath: (total: number) => void;
  onSecret: (id: string) => void;
  onCoin: (id: string) => void;
}

type Fx = "fakeDeath" | "fakeVictory" | "fakeLoading" | "glitch" | "didIt" | null;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: InputManager;
  private hooks: EngineHooks;
  settings: Settings;

  private def!: LevelDef;
  private levelIndex = 0;
  private ents: Ent[] = [];
  private triggers: (Trigger & { fired: boolean })[] = [];
  private particles: Particle[] = [];

  private player = {
    x: 0,
    y: 0,
    w: 18,
    h: 18,
    vx: 0,
    vy: 0,
    onGround: false,
    coyote: 0,
    buffer: 0,
    scale: 1,
    dead: false,
    face: 1,
    blink: 0,
    support: null as Ent | null,
  };

  // modifiers / state
  private gravityMul = 1;
  private reverse = false;
  private speedMul = 1;
  private dark = 0;
  private tint: string | null = null;
  private frozen = false;
  private goalRoam = false;
  private mirrored = false;
  private flipped = false;
  private scroll = 0;

  private cam = { x: 0, y: 0, shake: 0, zoom: 1, targetZoom: 1 };
  private spawn = { x: 0, y: 0 };
  private sessionCoins = new Set<string>();
  private sessionSecrets = new Set<string>();
  private deaths = 0;
  private time = 0;
  private message: string | null = null;
  private msgTimer = 0;
  private fx: Fx = null;
  private fxTimer = 0;
  private respawnTimer = 0;
  private finished = false;
  private paused = true;
  private raf = 0;
  private acc = 0;
  private last = 0;
  private hudTick = 0;
  private chaos: ChaosModifiers | null = null;
  private hazardMul = 1;
  private jumped = false;
  private wasGround = false;
  private touchedIds = new Set<string>();
  private deathSpots: { x: number; y: number }[] = [];
  private hintSpot: { x: number; y: number } | null = null;
  private eventTimer = 14;
  private passer = { on: false, x: 0, y: 0, dir: 1 };
  private bgPulse = 0;
  private squash = 0;
  private breakHit: Ent | null = null;
  private bounceV = 0;
  private clock = 0;
  private bolts: Bolt[] = Array.from({ length: 28 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, enemy: false }));
  private shootCd = 0;
  private shield = false;
  private invuln = 0;
  private kills = 0;
  private later: { t: number; ops: Op[] }[] = [];

  constructor(canvas: HTMLCanvasElement, input: InputManager, hooks: EngineHooks, settings: Settings) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available in this browser");
    this.ctx = ctx;
    this.input = input;
    this.hooks = hooks;
    this.settings = settings;
  }

  // ---------------------------------------------------------------- lifecycle

  load(def: LevelDef, index: number, chaos: ChaosModifiers | null) {
    this.def = def;
    this.levelIndex = index;
    this.chaos = chaos;
    this.deaths = 0;
    this.time = 0;
    this.sessionCoins.clear();
    this.sessionSecrets.clear();
    this.spawn = { ...def.spawn };
    this.finished = false;
    this.deathSpots = [];
    this.kills = 0;
    this.hintSpot = null;
    this.eventTimer = 12 + Math.random() * 10;
    this.reset(true);
  }

  private reset(full: boolean) {
    const def = this.def;
    this.ents = def.entities.map((e) => this.spawnEnt(e));
    this.triggers = (def.triggers ?? []).map((t) => ({ ...t, fired: false }));
    this.particles.length = 0;
    for (const b of this.bolts) b.on = false;
    this.later.length = 0;
    this.shield = false;
    this.invuln = 0;
    this.shootCd = 0;

    this.gravityMul = (def.gravity ?? 1) * (this.chaos?.gravity ?? 1);
    this.reverse = Boolean(def.reverse) !== Boolean(this.chaos?.reverse);
    this.speedMul = (def.speed ?? 1) * (this.chaos?.speed ?? 1);
    this.dark = def.dark ?? 0;
    this.tint = def.tint ?? null;
    this.frozen = false;
    this.goalRoam = Boolean(this.chaos?.roamGoal);
    this.mirrored = false;
    this.flipped = Boolean(def.flipped);
    this.scroll = def.scroll ?? 0;
    this.fx = null;
    this.fxTimer = 0;
    if (full) {
      this.message = def.hint ?? null;
      this.msgTimer = this.message ? 3 : 0;
    }
    this.hazardMul = this.chaos?.hazard ?? 1;
    this.jumped = false;
    this.touchedIds.clear();
    this.squash = 0;
    this.cam.zoom = 1;
    this.cam.targetZoom = 1;
    this.cam.shake = 0;

    if (this.chaos?.mirror) this.applyMirror();
    if (this.chaos?.ghost) {
      for (const e of this.ents) if (e.type === "solid") e.hidden = true;
    }

    // keep coins / secrets already found this session
    for (const e of this.ents) {
      if (e.id && (e.type === "coin" || e.type === "secret") && this.sessionCoins.has(e.id)) {
        e.collected = true;
      }
      if (e.id && e.type === "secret" && this.sessionSecrets.has(e.id)) e.collected = true;
    }

    const p = this.player;
    p.scale = (def.scale ?? 1) * (this.chaos?.scale ?? 1);
    p.w = 18 * p.scale;
    p.h = 18 * p.scale;
    p.x = this.spawn.x;
    p.y = this.spawn.y - p.h;
    p.vx = 0;
    p.vy = 0;
    p.dead = false;
    p.onGround = false;
    p.support = null;
    this.respawnTimer = 0;
    this.cam.x = Math.max(0, Math.min(p.x - VW / 2, def.w - VW));
    this.cam.y = Math.max(0, Math.min(p.y - VH / 2, Math.max(0, def.h - VH)));
    if (full) this.emitHud(true);
  }

  private spawnEnt(d: EntityDef): Ent {
    return {
      ...d,
      ox: d.x,
      oy: d.y,
      px: d.x,
      py: d.y,
      removed: false,
      collected: false,
      touched: false,
      timer: 0,
      phase: 0,
      vy: 0,
      falling: false,
      fade: 1,
      soft: false,
      dead: HAZARD_TYPES.has(d.type) && !d.hidden && (d.type !== "chaser" || Boolean(d.armed)),
      cooldown: 0,
      dir: (d.dx ?? 1) < 0 && d.type !== "enemy" ? -1 : 1,
      hp: d.hp ?? (d.kind === "sentry" ? 2 : d.kind === "core" ? 14 : 1),
    };
  }

  start() {
    this.paused = false;
    this.last = performance.now();
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.last = performance.now();
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  restart() {
    if (this.finished) return;
    this.reset(false);
    audio.play("click");
  }

  // ------------------------------------------------------------------- loop

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    if (!this.paused) {
      this.acc += dt;
      const step = 1 / 120;
      let guard = 0;
      while (this.acc >= step && guard++ < 12) {
        this.update(step);
        this.acc -= step;
      }
    }
    this.render();
  };

  private update(dt: number) {
    this.input.poll();

    if (this.fxTimer > 0) {
      this.fxTimer -= dt;
      if (this.fxTimer <= 0) this.fx = null;
    }
    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) this.message = null;
    }

    if (!this.finished && !this.player.dead) this.time += dt;
    this.clock += dt;
    this.updateEvents(dt);

    if (this.player.dead) {
      this.respawnTimer -= dt;
      this.updateParticles(dt);
      this.updateCamera(dt);
      if (this.respawnTimer <= 0) this.reset(false);
      this.emitHud(false);
      return;
    }

    if (!this.frozen) this.updateEntities(dt);
    this.updateLater(dt);
    this.updateBolts(dt);
    if (this.invuln > 0) this.invuln -= dt;
    if (!this.finished) {
      this.updatePlayer(dt);
      this.checkTriggers();
      this.checkOverlaps();
    }
    this.updateParticles(dt);
    this.updateCamera(dt);
    this.emitHud(false);
  }

  // ----------------------------------------------------------------- physics

  private updatePlayer(dt: number) {
    const p = this.player;
    const axis = (this.reverse ? -1 : 1) * this.input.axis;
    const maxRun = MAX_RUN * this.speedMul;
    const onIce = p.onGround && p.support?.type === "ice";
    const accel = onIce ? ACCEL * 0.45 : ACCEL;

    if (axis !== 0) {
      p.vx += axis * accel * dt;
      p.vx = Math.max(-maxRun, Math.min(maxRun, p.vx));
      p.face = axis > 0 ? 1 : -1;
    } else {
      const f = (p.onGround ? (onIce ? 160 : FRICTION) : AIR_FRICTION) * dt;
      if (Math.abs(p.vx) <= f) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * f;
    }

    // Chaos Bolt shot
    this.shootCd -= dt;
    if (this.input.shootPressed) {
      this.input.shootPressed = false;
      if (this.shootCd <= 0) {
        this.shootCd = 0.26;
        this.fireBolt(p.x + p.w / 2 + p.face * p.w * 0.5, p.y + p.h * 0.45, p.face * 440, 0, false);
        audio.play("shoot");
      }
    }

    // jump buffering + coyote time
    if (this.input.jumpPressed) {
      p.buffer = BUFFER;
      this.input.consumeJump();
    }
    p.buffer -= dt;
    p.coyote -= dt;

    const g = GRAV * this.gravityMul;
    const sign = Math.sign(this.gravityMul) || 1;

    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -JUMP_V * sign;
      p.buffer = 0;
      p.coyote = 0;
      p.onGround = false;
      p.support = null;
      this.jumped = true;
      this.squash = -0.28;
      audio.play("jump");
      this.burst(p.x + p.w / 2, p.y + (sign > 0 ? p.h : 0), 5, "#7cf9c8");
    }
    // variable jump height
    if (!this.input.jumpHeld && p.vy * sign < 0) p.vy += g * 2.1 * dt;

    p.vy += g * dt;
    p.vy = Math.max(-900, Math.min(900, p.vy));

    this.wasGround = p.onGround;
    p.onGround = false;
    this.bounceV = 0;
    this.breakHit = null;

    // X axis
    p.x += p.vx * dt;
    for (const e of this.solids()) {
      if (!overlap(p, e)) continue;
      if (p.vx > 0) p.x = e.x - p.w;
      else if (p.vx < 0) p.x = e.x + e.w;
      p.vx = 0;
    }

    // Y axis
    p.y += p.vy * dt;
    for (const e of this.solids()) {
      if (!overlap(p, e)) continue;
      if (p.vy > 0) {
        p.y = e.y - p.h;
        if (sign > 0) this.landOn(e);
        else if (e.type === "breakable") this.breakHit = e;
        p.vy = 0;
      } else if (p.vy < 0) {
        p.y = e.y + e.h;
        if (sign < 0) this.landOn(e);
        else if (e.type === "breakable") this.breakHit = e;
        p.vy = 0;
      }
    }

    // head-butted a breakable block
    if (this.breakHit) {
      this.dissolve(this.breakHit);
      this.flash("cardboard.");
    }
    // bounce pads
    if (this.bounceV) {
      p.vy = -this.bounceV * sign;
      p.onGround = false;
      p.support = null;
      p.coyote = 0;
      this.squash = -0.4;
      audio.play("jump");
      this.burst(p.x + p.w / 2, p.y + p.h, 10, "#ff9de2");
    }

    if (p.onGround) p.coyote = COYOTE;

    // carried by moving platform / conveyor
    const s = p.support;
    if (s && !s.removed) {
      p.x += s.x - s.px;
      p.y += s.y - s.py;
      if (s.type === "conveyor" && p.onGround) p.x += Math.sign(s.dx ?? 1) * (s.speed ?? 70) * dt;
    }

    this.squash += (0 - this.squash) * Math.min(1, dt * 12);

    // bounds
    p.x = Math.max(0, Math.min(p.x, this.def.w - p.w));
    if (p.y > this.def.h + 90 || p.y < -260) this.kill(false);
    if (this.scroll > 0 && p.x + p.w < this.cam.x - 26) this.kill(false);
  }

  private landOn(e: Ent) {
    const p = this.player;
    if (!this.wasGround) {
      audio.play("land");
      this.squash = 0.3;
    }
    p.onGround = true;
    p.support = e;
    if (e.id) this.touchedIds.add(e.id);
    if (e.type === "bounce") this.bounceV = e.speed ?? 760;
    if (!e.touched) {
      e.touched = true;
      if (e.type === "vanish" || e.type === "fall") {
        e.timer = e.delay ?? (e.type === "fall" ? (e.kind === "crack" ? 0.55 : 0.22) : 0.4);
        audio.play(e.kind === "crack" ? "warn" : "trap");
        if (e.kind === "crack") this.flash("*crack*");
      }
    }
  }

  private solids(): Ent[] {
    const out: Ent[] = [];
    for (const e of this.ents) {
      if (e.removed || e.soft) continue;
      if (SOLID_TYPES.has(e.type)) out.push(e);
    }
    return out;
  }

  // ---------------------------------------------------------------- entities

  private updateEntities(dt: number) {
    const p = this.player;
    const pcx = p.x + p.w / 2;
    const pcy = p.y + p.h / 2;

    for (const e of this.ents) {
      e.px = e.x;
      e.py = e.y;
      if (e.removed) continue;
      e.phase += dt;

      switch (e.type) {
        case "move": {
          const sp = (e.speed ?? 40) / Math.max(1, Math.hypot(e.dx ?? 0, e.dy ?? 0));
          const t = Math.sin(e.phase * sp);
          e.x = e.ox + (e.dx ?? 0) * t;
          e.y = e.oy + (e.dy ?? 0) * t;
          break;
        }
        case "freeze": {
          const cycle = e.phase % 2.6;
          if (cycle < 1.5) {
            const sp = (e.speed ?? 40) / Math.max(1, Math.hypot(e.dx ?? 0, e.dy ?? 0));
            const t = Math.sin(e.phase * sp);
            e.x = e.ox + (e.dx ?? 0) * t;
            e.y = e.oy + (e.dy ?? 0) * t;
          }
          break;
        }
        case "vanish": {
          if (e.touched) {
            e.timer -= dt;
            if (e.timer <= 0) this.dissolve(e);
          }
          break;
        }
        case "fall": {
          if (e.touched) {
            e.timer -= dt;
            if (e.timer <= 0) {
              e.falling = true;
              e.vy += 1500 * dt;
              e.y += e.vy * dt;
              if (e.y > this.def.h + 120) e.removed = true;
            }
          }
          break;
        }
        case "memory": {
          if (e.touched && p.support !== e) {
            e.timer += dt;
            if (e.timer > 0.28) this.dissolve(e);
          }
          break;
        }
        case "fakewall": {
          const r = e.radius ?? 54;
          const near = Math.hypot(pcx - (e.x + e.w / 2), pcy - (e.y + e.h / 2)) < r;
          e.soft = near;
          e.fade = near ? Math.max(0.12, e.fade - dt * 4) : Math.min(1, e.fade + dt * 3);
          break;
        }
        case "spike": {
          if (e.dx || e.dy) {
            const sp = ((e.speed ?? 50) * this.hazardMul) / Math.max(1, Math.hypot(e.dx ?? 0, e.dy ?? 0));
            const t = Math.sin(e.phase * sp);
            e.x = e.ox + (e.dx ?? 0) * t;
            e.y = e.oy + (e.dy ?? 0) * t;
          }
          break;
        }
        case "runner": {
          // "helpful" platform: drifts away once the player gets close
          if (!e.armed && Math.abs(pcx - (e.x + e.w / 2)) < (e.radius ?? 80) && Math.abs(pcy - e.y) < 140) {
            e.armed = true;
            audio.play("trap");
          }
          if (e.armed) {
            const sp = (e.speed ?? 40) * dt;
            const tx = e.ox + (e.dx ?? 0);
            const ty = e.oy + (e.dy ?? 0);
            e.x += Math.sign(tx - e.x) * Math.min(sp, Math.abs(tx - e.x));
            e.y += Math.sign(ty - e.y) * Math.min(sp, Math.abs(ty - e.y));
          }
          break;
        }
        case "follower": {
          const a = e.ox;
          const b = e.ox + (e.dx ?? 100);
          const target = Math.max(Math.min(a, b), Math.min(Math.max(a, b), pcx - e.w / 2));
          const sp = (e.speed ?? 70) * dt;
          e.x += Math.sign(target - e.x) * Math.min(sp, Math.abs(target - e.x));
          break;
        }
        case "orbit": {
          const r = e.radius ?? 40;
          const ang = e.phase * (e.speed ?? 1.2) + (e.offset ?? 0);
          e.x = e.ox + Math.cos(ang) * r;
          e.y = e.oy + Math.sin(ang) * r;
          break;
        }
        case "temp": {
          e.soft = !cycleOn(e.phase, e.period ?? 3, e.offset ?? 0, 0.6);
          break;
        }
        case "crusher": {
          if (e.armed) {
            const targetY = e.oy + (e.dy ?? 0);
            const targetX = e.ox + (e.dx ?? 0);
            const sp = (e.speed ?? 320) * this.hazardMul * dt;
            e.y += Math.sign(targetY - e.y) * Math.min(sp, Math.abs(targetY - e.y));
            e.x += Math.sign(targetX - e.x) * Math.min(sp, Math.abs(targetX - e.x));
          }
          break;
        }
        case "chaser": {
          if (e.armed) {
            const sp = (e.speed ?? 65) * this.hazardMul * dt;
            const dx = pcx - (e.x + e.w / 2);
            const dy = pcy - (e.y + e.h / 2);
            const len = Math.hypot(dx, dy) || 1;
            e.x += (dx / len) * sp;
            e.y += (dy / len) * sp;
          }
          break;
        }
        case "enemy": {
          if (e.hidden) break;
          const k = e.kind ?? "crawler";
          if (k === "crawler" || k === "hopper") {
            const sp = (e.speed ?? (k === "hopper" ? 60 : 46)) * this.hazardMul * dt;
            const range = Math.abs(e.dx ?? 80);
            e.x += e.dir * sp;
            if (e.x > e.ox + range) e.dir = -1;
            if (e.x < e.ox) e.dir = 1;
            if (k === "hopper") e.y = e.oy - Math.abs(Math.sin(e.phase * 3.4)) * 38;
          } else {
            // sentry / core: charge up, then fire at the player
            const per = (e.period ?? (k === "core" ? 1.6 : 2.4)) / this.hazardMul;
            e.timer += dt;
            if (k === "core") e.y = e.oy + Math.sin(e.phase * 1.3) * 40;
            const cx = e.x + e.w / 2;
            const cy = e.y + e.h * 0.4;
            if (e.timer >= per) {
              e.timer = 0;
              if (Math.abs(pcx - cx) < 400 && Math.abs(pcy - cy) < 160) {
                const ang = Math.atan2(pcy - cy, pcx - cx);
                if (k === "core") {
                  for (const da of [-0.22, 0, 0.22]) this.fireBolt(cx, cy, Math.cos(ang + da) * 170, Math.sin(ang + da) * 170, true);
                } else {
                  this.fireBolt(cx, cy, Math.sign(pcx - cx) * 165, 0, true);
                }
                audio.play("laser");
              }
            }
          }
          break;
        }
        case "laser": {
          const st = laserState(e);
          if (st !== e.cooldown && Math.abs(pcx - e.x) < VW * 0.6) {
            if (st === 1) audio.play("warn");
            if (st === 2) {
              audio.play("laser");
              this.shake(1.5);
            }
          }
          e.cooldown = st;
          break;
        }
        case "boulder": {
          if (e.armed) {
            e.x += e.dir * (e.speed ?? 150) * this.hazardMul * dt;
            if (Math.random() < 0.3) this.burst(e.x + e.w / 2 - e.dir * e.w * 0.4, e.y + e.h, 1, "#9a8f7a");
            if (e.x < -80 || e.x > this.def.w + 80) e.removed = true;
          }
          break;
        }
        case "dashwall": {
          if (e.armed) {
            e.timer += dt;
            if (e.timer > 0.8) {
              const tx = e.ox + (e.dx ?? 0);
              const sp = (e.speed ?? 300) * this.hazardMul * dt;
              e.x += Math.sign(tx - e.x) * Math.min(sp, Math.abs(tx - e.x));
              if (Math.abs(tx - e.x) < 0.5) e.armed = false;
            }
          }
          break;
        }
        case "goal":
        case "fakegoal": {
          if (this.goalRoam && e.type === "goal") {
            e.x = e.ox + Math.sin(e.phase * 0.9) * 70;
            e.y = e.oy + Math.sin(e.phase * 1.7) * 26;
          }
          break;
        }
        default:
          break;
      }

      if (e.cooldown > 0) e.cooldown -= dt;
      if (e.type === "enemy") {
        e.dead = !e.hidden;
      } else if (e.type === "laser") {
        e.dead = !e.hidden && laserState(e) === 2;
      } else if (e.type === "boulder") {
        e.dead = !e.hidden && Boolean(e.armed);
      } else if (e.type === "dashwall") {
        e.dead = !e.hidden && Boolean(e.armed) && e.timer > 0.8;
      } else if (HAZARD_TYPES.has(e.type)) {
        e.dead =
          !e.hidden &&
          (e.type !== "chaser" || Boolean(e.armed)) &&
          (!e.period || cycleOn(e.phase, e.period, e.offset ?? 0, 0.45));
      }
    }
  }

  // ------------------------------------------------------------- combat

  private fireBolt(x: number, y: number, vx: number, vy: number, enemy: boolean) {
    const b = this.bolts.find((o) => !o.on);
    if (!b) return;
    b.on = true;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.life = enemy ? 3 : 0.85;
    b.enemy = enemy;
  }

  private updateLater(dt: number) {
    for (let i = this.later.length - 1; i >= 0; i--) {
      const l = this.later[i]!;
      l.t -= dt;
      if (l.t <= 0) {
        this.later.splice(i, 1);
        this.runOps(l.ops);
      }
    }
  }

  private updateBolts(dt: number) {
    const p = this.player;
    for (const b of this.bolts) {
      if (!b.on) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > this.def.w + 20 || b.y < -40 || b.y > this.def.h + 40) {
        b.on = false;
        continue;
      }
      const box = { x: b.x - 3, y: b.y - 2, w: 6, h: 4 };
      if (b.enemy) {
        if (!p.dead && overlap(p, box)) {
          b.on = false;
          this.kill(true);
        }
        continue;
      }
      for (const e of this.ents) {
        if (e.removed || e.hidden || !overlap(box, e)) continue;
        if (e.type === "enemy" || e.type === "target") {
          b.on = false;
          e.hp--;
          this.burst(b.x, b.y, 6, "#ffd166");
          audio.play("hit");
          if (e.hp <= 0) {
            e.removed = true;
            this.burst(e.x + e.w / 2, e.y + e.h / 2, e.kind === "core" ? 40 : 14, e.type === "target" ? "#5ad1ff" : "#ff5d8f");
            this.shake(e.kind === "core" ? 12 : 3);
            if (e.type === "enemy") this.kills++;
            if (e.ops) this.runOps(e.ops);
          }
          break;
        }
        if (SOLID_TYPES.has(e.type) && !e.soft) {
          b.on = false;
          this.burst(b.x, b.y, 3, "#ffd166");
          if (e.type === "breakable") this.dissolve(e);
          break;
        }
      }
    }
  }

  private drawBolts(ctx: CanvasRenderingContext2D) {
    for (const b of this.bolts) {
      if (!b.on) continue;
      if (b.enemy) {
        ctx.fillStyle = "#ff5d8f";
        ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
        ctx.fillStyle = "#ffe0ea";
        ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
      } else {
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(b.x - 5, b.y - 1.5, 10, 3);
        ctx.fillStyle = "rgba(255,209,102,0.35)";
        ctx.fillRect(b.x - 5 - Math.sign(b.vx) * 8, b.y - 1, 8, 2);
      }
    }
  }

  private dissolve(e: Ent) {
    e.removed = true;
    this.burst(e.x + e.w / 2, e.y + e.h / 2, 10, "#ff5d8f");
    this.shake(4);
    audio.play("trap");
  }

  // ---------------------------------------------------------------- triggers

  private checkTriggers() {
    const p = this.player;
    for (const t of this.triggers) {
      if (t.fired && t.once !== false) continue;
      if (t.minDeaths !== undefined && this.deaths < t.minDeaths) continue;
      if (t.maxDeaths !== undefined && this.deaths > t.maxDeaths) continue;
      if (!overlap(p, t)) continue;
      if (t.when === "jump" && !(p.vy * (Math.sign(this.gravityMul) || 1) < -60)) continue;
      if (t.once !== false) t.fired = true;
      this.runOps(t.ops);
    }
  }

  private runOps(ops: Op[]) {
    for (const op of ops) this.runOp(op);
  }

  private byIds(ids: string[]): Ent[] {
    return this.ents.filter((e) => e.id && ids.includes(e.id));
  }

  private runOp(op: Op) {
    switch (op.op) {
      case "remove":
        for (const e of this.byIds(op.ids)) this.dissolve(e);
        break;
      case "show":
        for (const e of this.byIds(op.ids)) {
          e.hidden = false;
          e.fade = 1;
        }
        audio.play("trap");
        break;
      case "hide":
        for (const e of this.byIds(op.ids)) e.hidden = true;
        break;
      case "arm":
        for (const e of this.byIds(op.ids)) {
          e.armed = true;
          e.hidden = false;
        }
        this.shake(6);
        audio.play("trap");
        break;
      case "shake":
        this.shake(op.v);
        break;
      case "gravity": {
        const g = op.v * (this.chaos?.gravity ?? 1);
        if (g !== this.gravityMul) {
          this.shake(5);
          audio.play("trap");
        }
        this.gravityMul = g;
        break;
      }
      case "reverse":
        this.reverse = op.v;
        this.flash("controls scrambled");
        break;
      case "scale": {
        const p = this.player;
        const v = op.v * (this.chaos?.scale ?? 1);
        if (v === p.scale) break;
        const bottom = p.y + p.h;
        const cx = p.x + p.w / 2;
        p.scale = v;
        p.w = 18 * v;
        p.h = 18 * v;
        p.x = cx - p.w / 2;
        p.y = bottom - p.h;
        this.burst(cx, bottom, 12, "#ffd166");
        break;
      }
      case "speed":
        this.speedMul = op.v * (this.chaos?.speed ?? 1);
        break;
      case "goalTo": {
        const goal = this.ents.find((e) => e.type === "goal");
        if (goal) {
          this.burst(goal.x + goal.w / 2, goal.y + goal.h / 2, 12, "#7cf9c8");
          goal.x = op.x;
          goal.y = op.y;
          goal.ox = op.x;
          goal.oy = op.y;
        }
        break;
      }
      case "goalRoam":
        this.goalRoam = op.v;
        break;
      case "fx":
        this.fx = op.v;
        this.fxTimer = op.v === "fakeLoading" ? 1.7 : op.v === "didIt" ? 1.8 : 1.4;
        this.shake(op.v === "fakeDeath" ? 8 : 3);
        audio.play(op.v === "fakeVictory" || op.v === "didIt" ? "complete" : "trap");
        break;
      case "dark":
        this.dark = op.v;
        break;
      case "mirror":
        this.applyMirror();
        this.shake(8);
        this.flash("the world flipped");
        break;
      case "warp": {
        const p = this.player;
        this.burst(p.x + p.w / 2, p.y + p.h / 2, 14, "#9d7cff");
        p.x = op.x;
        p.y = op.y;
        p.vx = 0;
        p.vy = 0;
        audio.play("checkpoint");
        break;
      }
      case "zoom":
        this.cam.targetZoom = op.v;
        break;
      case "tint":
        this.tint = op.v;
        break;
      case "msg":
        this.flash(op.v);
        break;
      case "freeze":
        this.frozen = op.v;
        break;
      case "shift":
        for (const e of this.byIds(op.ids)) {
          this.burst(e.x + e.w / 2, e.y + e.h / 2, 8, "#9d7cff");
          e.x += op.dx;
          e.y += op.dy;
          e.ox += op.dx;
          e.oy += op.dy;
          e.px = e.x;
          e.py = e.y;
        }
        this.shake(6);
        audio.play("trap");
        break;
      case "shield":
        this.shield = true;
        this.flash("shield online");
        break;
      case "boom": {
        const p = this.player;
        this.burst(p.x + p.w / 2, p.y + p.h / 2, 18, "#ffb347");
        this.shake(8);
        p.vy = -420 * (Math.sign(this.gravityMul) || 1);
        p.vx = -p.face * 220;
        audio.play("hit");
        this.flash("BOOM. (you're fine)");
        break;
      }
      case "later":
        this.later.push({ t: op.t, ops: op.ops });
        break;
      case "confetti": {
        const p = this.player;
        for (const c of ["#ffd166", "#7cf9c8", "#ff5d8f", "#9d7cff"]) this.burst(p.x + p.w / 2, p.y, 10, c);
        audio.play("coin");
        break;
      }
    }
  }

  private applyMirror() {
    const w = this.def.w;
    this.mirrored = !this.mirrored;
    for (const e of this.ents) {
      e.x = w - e.x - e.w;
      e.ox = w - e.ox - e.w;
      e.px = e.x;
      if (e.dx) e.dx = -e.dx;
      if (e.tx !== undefined) e.tx = w - e.tx;
    }
    for (const t of this.triggers) t.x = w - t.x - t.w;
    const p = this.player;
    p.x = w - p.x - p.w;
    p.vx = -p.vx;
  }

  // ---------------------------------------------------------------- overlaps

  private checkOverlaps() {
    const p = this.player;
    for (const e of this.ents) {
      if (e.removed) continue;

      if (HAZARD_TYPES.has(e.type) && e.dead && !e.hidden && overlap(p, e)) {
        this.kill(true);
        return;
      }
      if (e.hidden || e.collected) continue;

      switch (e.type) {
        case "fakecheckpoint":
          if (overlap(p, e)) {
            e.collected = true;
            audio.play("checkpoint");
            this.burst(e.x + e.w / 2, e.y, 10, "#7cf9c8");
            this.flash(e.label ?? "checkpoint! (decorative)");
            if (e.ops) this.runOps(e.ops);
          }
          break;
        case "button":
          if (!e.touched && overlap(p, e)) {
            e.touched = true;
            audio.play("click");
            if (e.ops) this.runOps(e.ops);
          }
          break;
        case "chest":
        case "powerup":
          if (overlap(p, e)) {
            e.collected = true;
            audio.play(e.type === "chest" ? "click" : "checkpoint");
            this.burst(e.x + e.w / 2, e.y + e.h / 2, 12, e.trap ? "#ff5d8f" : "#ffd166");
            if (e.ops) this.runOps(e.ops);
          }
          break;
        case "coin":
          if (overlap(p, e)) {
            e.collected = true;
            if (e.id) {
              this.sessionCoins.add(e.id);
              this.hooks.onCoin(e.id);
            }
            audio.play("coin");
            this.burst(e.x + e.w / 2, e.y + e.h / 2, 10, "#ffd166");
          }
          break;
        case "secret":
          if (overlap(p, e)) {
            e.collected = true;
            if (e.id) {
              this.sessionSecrets.add(e.id);
              this.hooks.onSecret(e.id);
            }
            audio.play("secret");
            this.burst(e.x + e.w / 2, e.y + e.h / 2, 18, "#9d7cff");
            this.flash("secret found!");
          }
          break;
        case "checkpoint":
          if (overlap(p, e)) {
            e.collected = true;
            this.spawn = { x: e.x + e.w / 2 - 9, y: e.y + e.h };
            audio.play("checkpoint");
            this.burst(e.x + e.w / 2, e.y, 10, "#7cf9c8");
            this.flash("checkpoint");
          }
          break;
        case "teleport":
          if (e.cooldown <= 0 && overlap(p, e)) {
            this.burst(e.x + e.w / 2, e.y + e.h / 2, 12, "#9d7cff");
            p.x = (e.tx ?? p.x) - p.w / 2;
            p.y = (e.ty ?? p.y) - p.h;
            p.vx = 0;
            p.vy = 0;
            audio.play("checkpoint");
            for (const other of this.ents) if (other.type === "teleport") other.cooldown = 0.7;
          }
          break;
        case "goal":
          if (overlap(p, e)) this.complete();
          break;
        default:
          break;
      }
    }
  }

  private complete() {
    if (this.finished) return;
    this.finished = true;
    audio.play("complete");
    this.burst(this.player.x + 9, this.player.y + 9, 26, "#7cf9c8");
    this.shake(5);
    const coinEnts = this.ents.filter((e) => e.type === "coin");
    const coins = coinEnts.filter((e) => e.collected).length;
    const total = coinEnts.length;
    const par = this.def.par ?? 25;
    let stars = 1;
    if (this.time <= par) stars = 2;
    if (this.deaths === 0 && coins === total) stars = 3;
    const b = this.def.bonus;
    let bonus: boolean | null = null;
    if (b) {
      if (b.kind === "nojump") bonus = !this.jumped;
      else if (b.kind === "avoid") bonus = !this.touchedIds.has(b.id ?? "");
      else bonus = this.sessionSecrets.size > 0;
    }
    window.setTimeout(() => {
      this.hooks.onComplete({
        level: this.levelIndex,
        deaths: this.deaths,
        time: this.time,
        coins,
        coinTotal: total,
        stars,
        secrets: [...this.sessionSecrets],
        par,
        bonus,
        bonusText: b?.text ?? null,
        enemies: this.kills,
      });
    }, 420);
  }

  private kill(hazard: boolean) {
    const p = this.player;
    if (p.dead) return;
    if (hazard && this.invuln > 0) return;
    if (hazard && this.shield) {
      this.shield = false;
      this.invuln = 1;
      p.vy = -360 * (Math.sign(this.gravityMul) || 1);
      this.burst(p.x + p.w / 2, p.y + p.h / 2, 16, "#5ad1ff");
      this.shake(5);
      audio.play("hit");
      this.flash("shield popped!");
      return;
    }
    p.dead = true;
    this.deaths++;
    this.respawnTimer = 0.42;
    audio.play("death");
    this.shake(9);
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 22, "#ff5d8f");
    // death hotspot tracking — repeated deaths in one spot earn a subtle hint ring
    const spot = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    this.deathSpots.push(spot);
    if (this.deathSpots.length > 40) this.deathSpots.shift();
    const near = this.deathSpots.filter((d) => Math.hypot(d.x - spot.x, d.y - spot.y) < 40).length;
    if (near >= 4) this.hintSpot = spot;
    if (Math.random() < 0.35) this.flash(DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)]!);
    this.hooks.onDeath(this.deaths);
  }

  /** Controlled, harmless random events. They never touch level geometry. */
  private updateEvents(dt: number) {
    if (this.passer.on) {
      this.passer.x += this.passer.dir * 36 * dt;
      if (this.passer.x < -30 || this.passer.x > VW + 30) this.passer.on = false;
    }
    if (this.bgPulse > 0) this.bgPulse -= dt;
    if (this.player.dead || this.finished) return;
    this.eventTimer -= dt;
    if (this.eventTimer > 0) return;
    this.eventTimer = 16 + Math.random() * 18;
    const roll = Math.floor(Math.random() * 4);
    if (roll === 0) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.passer = { on: true, dir, x: dir > 0 ? -20 : VW + 20, y: 34 + Math.random() * 50 };
    } else if (roll === 1) {
      this.particles.push({
        x: this.cam.x + 40 + Math.random() * (VW - 80),
        y: this.cam.y - 6,
        vx: 0,
        vy: 30,
        life: 1.4,
        max: 1.4,
        color: "#8a8fb0",
        size: 3,
      });
    } else if (roll === 2) {
      this.bgPulse = 2.5;
    } else if (!this.message) {
      this.flash(EVENT_LINES[Math.floor(Math.random() * EVENT_LINES.length)]!);
    }
  }

  // --------------------------------------------------------------- particles

  private burst(x: number, y: number, n: number, color: string) {
    const count = this.settings.reducedFlash ? Math.ceil(n / 2) : n;
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 220) break;
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.5 + Math.random() * 0.35,
        max: 0.85,
        color,
        size: 2 + Math.random() * 2.5,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += 700 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private shake(v: number) {
    if (this.settings.reducedShake) v *= 0.3;
    this.cam.shake = Math.max(this.cam.shake, v);
  }

  private flash(msg: string) {
    this.message = msg;
    this.msgTimer = 2;
  }

  // ------------------------------------------------------------------ camera

  private updateCamera(dt: number) {
    const p = this.player;
    const maxX = Math.max(0, this.def.w - VW);
    const maxY = Math.max(0, this.def.h - VH);
    if (this.scroll > 0) {
      this.cam.x = Math.min(maxX, this.cam.x + this.scroll * dt);
    } else {
      const targetX = Math.max(0, Math.min(p.x + p.w / 2 - VW / 2, maxX));
      this.cam.x += (targetX - this.cam.x) * Math.min(1, dt * 7);
    }
    const targetY = Math.max(0, Math.min(p.y + p.h / 2 - VH / 2, maxY));
    this.cam.y += (targetY - this.cam.y) * Math.min(1, dt * 5);
    this.cam.shake = Math.max(0, this.cam.shake - dt * 30);
    this.cam.zoom += (this.cam.targetZoom - this.cam.zoom) * Math.min(1, dt * 4);
  }

  private emitHud(force: boolean) {
    this.hudTick++;
    // lightweight debug probe (used by automated playtests)
    (window as unknown as { __chaosBolt?: unknown }).__chaosBolt = {
      x: this.player.x,
      y: this.player.y,
      onGround: this.player.onGround,
      deaths: this.deaths,
      level: this.levelIndex,
      finished: this.finished,
    };
    if (!force && this.hudTick % 10 !== 0) return;
    const coinEnts = this.ents.filter((e) => e.type === "coin");
    this.hooks.onHud({
      level: this.levelIndex,
      name: this.def.name,
      deaths: this.deaths,
      coins: coinEnts.filter((e) => e.collected).length,
      coinTotal: coinEnts.length,
      time: this.time,
      message: this.message,
    });
  }

  // ------------------------------------------------------------------ render

  private render() {
    const ctx = this.ctx;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    const cw = Math.max(1, Math.floor(rect.width));
    const ch = Math.max(1, Math.floor(rect.height));
    if (this.canvas.width !== cw * dpr || this.canvas.height !== ch * dpr) {
      this.canvas.width = cw * dpr;
      this.canvas.height = ch * dpr;
    }
    const scale = Math.min(cw / VW, ch / VH);
    const ox = (cw - VW * scale) / 2;
    const oy = (ch - VH * scale) / 2;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#07070d";
    ctx.fillRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(ox * 1, oy * 1);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.rect(0, 0, VW, VH);
    ctx.clip();

    const hc = this.settings.highContrast;
    ctx.fillStyle = this.tint ?? (hc ? "#000000" : this.bgPulse > 0 ? "#16122c" : "#0d0f1c");
    ctx.fillRect(0, 0, VW, VH);
    if (this.passer.on) {
      // a tiny background robot strolls past — pure decoration
      const bob = Math.abs(Math.sin(this.clock * 10)) * 2;
      ctx.fillStyle = "rgba(124,249,200,0.25)";
      ctx.fillRect(this.passer.x, this.passer.y - bob, 7, 7);
      ctx.fillRect(this.passer.x + 3, this.passer.y - bob - 3, 1, 3);
    }

    const sh = this.cam.shake;
    const sx = sh ? (Math.random() - 0.5) * sh : 0;
    const sy = sh ? (Math.random() - 0.5) * sh : 0;

    ctx.save();
    // camera
    ctx.translate(VW / 2, VH / 2);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-VW / 2, -VH / 2);
    ctx.translate(-Math.round(this.cam.x) + sx, -Math.round(this.cam.y) + sy);
    if (this.flipped) {
      ctx.translate(0, this.def.h);
      ctx.scale(1, -1);
    }

    this.drawGrid(ctx);
    this.drawEntities(ctx, hc);
    this.drawHint(ctx);
    this.drawPlayer(ctx, hc);
    this.drawBolts(ctx);
    this.drawParticles(ctx);
    ctx.restore();

    if (this.dark > 0) this.drawDarkness(ctx, scale);
    this.drawFx(ctx);

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    if (this.settings.highContrast) return;
    ctx.strokeStyle = "rgba(124,249,200,0.05)";
    ctx.lineWidth = 1;
    const step = 32;
    const x0 = Math.floor(this.cam.x / step) * step;
    const y0 = Math.floor(this.cam.y / step) * step;
    ctx.beginPath();
    for (let x = x0; x < x0 + VW + step; x += step) {
      ctx.moveTo(x, y0 - step);
      ctx.lineTo(x, y0 + VH + step);
    }
    for (let y = y0; y < y0 + VH + step; y += step) {
      ctx.moveTo(x0 - step, y);
      ctx.lineTo(x0 + VW + step, y);
    }
    ctx.stroke();
  }

  private drawEntities(ctx: CanvasRenderingContext2D, hc: boolean) {
    const p = this.player;
    const pcx = p.x + p.w / 2;
    const pcy = p.y + p.h / 2;

    // trigger tells
    for (const t of this.triggers) {
      if (!t.tell) continue;
      ctx.fillStyle = "rgba(255,93,143,0.07)";
      ctx.fillRect(t.x, t.y, t.w, t.h);
    }

    for (const e of this.ents) {
      if (e.removed) continue;
      const near = Math.hypot(pcx - (e.x + e.w / 2), pcy - (e.y + e.h / 2)) < (e.radius ?? 70);

      if (e.hidden && !HAZARD_TYPES.has(e.type)) {
        // invisible platform: faint outline only when close (fair tell)
        if (near) {
          ctx.strokeStyle = "rgba(255,255,255,0.22)";
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(e.x + 0.5, e.y + 0.5, e.w - 1, e.h - 1);
          ctx.setLineDash([]);
        }
        continue;
      }
      if (e.hidden) continue; // hidden hazard = not drawn, not lethal

      switch (e.type) {
        case "solid":
        case "move":
        case "freeze": {
          const c = hc ? "#ffffff" : e.type === "solid" ? "#7cf9c8" : "#5ad1ff";
          block(ctx, e.x, e.y, e.w, e.h, c);
          break;
        }
        case "vanish": {
          const flash = e.touched ? 0.4 + 0.6 * Math.abs(Math.sin(e.phase * 24)) : 1;
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#ffffff" : "#8ef0ff", flash);
          dashes(ctx, e);
          break;
        }
        case "fall": {
          if (e.kind === "crack") {
            // looks like a normal floor until you step on it
            const jit = e.touched && !e.falling ? (Math.random() - 0.5) * 1.5 : 0;
            block(ctx, e.x + jit, e.y, e.w, e.h, hc ? "#ffffff" : "#7cf9c8");
            if (e.touched) {
              ctx.strokeStyle = "#0d0f1c";
              ctx.lineWidth = 2;
              ctx.beginPath();
              for (let i = 1; i < 4; i++) {
                const cx = e.x + (e.w * i) / 4;
                ctx.moveTo(cx - 6, e.y);
                ctx.lineTo(cx + 2, e.y + 8);
                ctx.lineTo(cx - 3, e.y + 16);
              }
              ctx.stroke();
              ctx.lineWidth = 1;
            }
            break;
          }
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#dddddd" : "#c6f36d", e.touched ? 0.8 : 1);
          dots(ctx, e);
          break;
        }
        case "memory": {
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#ffffff" : "#b58cff", e.touched ? 0.55 : 1);
          break;
        }
        case "fakewall": {
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#aaaaaa" : "#4de0c0", e.fade * 0.85);
          break;
        }
        case "spike":
          if (e.period && !e.dead) {
            // retracted pulse spike — low and dim, a learnable rhythm
            ctx.globalAlpha = 0.35;
            spikes(ctx, { x: e.x, y: e.y + e.h * 0.6, w: e.w, h: e.h * 0.4 }, hc ? "#ffffff" : "#ff5d8f");
            ctx.globalAlpha = 1;
          } else spikes(ctx, e, hc ? "#ffffff" : "#ff5d8f");
          break;
        case "crusher":
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#ffffff" : "#ff7b4d");
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          for (let i = 0; i < e.w; i += 12) ctx.fillRect(e.x + i + 3, e.y + e.h - 5, 6, 3);
          break;
        case "chaser": {
          if (!e.armed && e.label) {
            ctx.font = "7px monospace";
            ctx.textAlign = "center";
            ctx.fillStyle = "#7cf9c8";
            ctx.fillText(e.label, e.x + e.w / 2, e.y - 6);
            ctx.textAlign = "left";
          }
          ctx.fillStyle = hc ? "#ffffff" : e.armed ? "#ff5d8f" : "#7cf9c8";
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#0d0f1c";
          ctx.fillRect(e.x + e.w / 2 - 4, e.y + e.h / 2 - 2, 3, 3);
          ctx.fillRect(e.x + e.w / 2 + 1, e.y + e.h / 2 - 2, 3, 3);
          break;
        }
        case "teleport": {
          const t = 0.5 + 0.5 * Math.sin(e.phase * 4);
          ctx.strokeStyle = `rgba(157,124,255,${0.5 + t * 0.5})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(e.x, e.y, e.w, e.h);
          ctx.fillStyle = `rgba(157,124,255,${0.18 + t * 0.2})`;
          ctx.fillRect(e.x, e.y, e.w, e.h);
          break;
        }
        case "coin": {
          if (e.collected) break;
          const bob = Math.sin(e.phase * 3) * 2;
          const spin = Math.max(0.2, Math.abs(Math.cos(e.phase * 2.6)));
          ctx.fillStyle = "#ffd166";
          ctx.beginPath();
          ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2 + bob, (e.w / 2) * spin, e.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(e.x + e.w / 2 - 1, e.y + e.h / 2 - 3 + bob, 2, 6);
          break;
        }
        case "secret": {
          if (e.collected) break;
          const t = 0.35 + 0.35 * Math.sin(e.phase * 5);
          ctx.fillStyle = `rgba(157,124,255,${t})`;
          ctx.fillRect(e.x, e.y, e.w, e.h);
          break;
        }
        case "conveyor": {
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#ffffff" : "#5ad1ff");
          const dir = Math.sign(e.dx ?? 1);
          const off = (((e.phase * (e.speed ?? 70) * dir) % 16) + 16) % 16;
          ctx.fillStyle = "rgba(13,15,28,0.55)";
          for (let i = off; i < e.w - 6; i += 16) {
            const x = e.x + i;
            ctx.beginPath();
            ctx.moveTo(x + (dir > 0 ? 0 : 6), e.y + 3);
            ctx.lineTo(x + (dir > 0 ? 6 : 0), e.y + 6);
            ctx.lineTo(x + (dir > 0 ? 0 : 6), e.y + 9);
            ctx.fill();
          }
          break;
        }
        case "ice":
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#ffffff" : "#c9f1ff");
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          for (let i = 8; i < e.w - 8; i += 26) ctx.fillRect(e.x + i, e.y + 4, 10, 1);
          break;
        case "bounce":
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#ffffff" : "#ff9de2");
          ctx.fillStyle = "rgba(13,15,28,0.5)";
          ctx.fillRect(e.x + 4, e.y + 3, e.w - 8, 2);
          break;
        case "breakable":
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#bbbbbb" : "#d9a066");
          ctx.strokeStyle = "rgba(13,15,28,0.55)";
          ctx.beginPath();
          for (let i = 10; i < e.w; i += 20) {
            ctx.moveTo(e.x + i, e.y + 2);
            ctx.lineTo(e.x + i + 5, e.y + e.h / 2);
            ctx.lineTo(e.x + i - 2, e.y + e.h - 2);
          }
          ctx.stroke();
          break;
        case "runner":
        case "follower":
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#ffffff" : "#f6a6ff");
          ctx.fillStyle = "#0d0f1c";
          ctx.fillRect(e.x + e.w / 2 - 6, e.y + 4, 3, 3);
          ctx.fillRect(e.x + e.w / 2 + 3, e.y + 4, 3, 3);
          break;
        case "orbit":
          ctx.strokeStyle = "rgba(90,209,255,0.12)";
          ctx.beginPath();
          ctx.arc(e.ox + e.w / 2, e.oy + e.h / 2, e.radius ?? 40, 0, Math.PI * 2);
          ctx.stroke();
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#ffffff" : "#5ad1ff");
          break;
        case "temp": {
          const per = e.period ?? 3;
          const t = ((((e.phase + (e.offset ?? 0)) % per) + per) % per) / per;
          const alpha = e.soft ? 0.16 : t > 0.45 ? 0.45 + 0.55 * Math.abs(Math.sin(e.phase * 22)) : 1;
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#ffffff" : "#9dffb0", alpha);
          break;
        }
        case "sign": {
          const text = e.label ?? "";
          ctx.font = "8px monospace";
          ctx.textAlign = "center";
          if (text.length <= 2) {
            ctx.fillStyle = "rgba(255,209,102,0.55)";
            ctx.fillText(text, e.x, e.y);
          } else {
            const w = ctx.measureText(text).width + 10;
            ctx.fillStyle = "rgba(255,255,255,0.18)";
            ctx.fillRect(e.x - 1, e.y + 4, 2, 22);
            ctx.fillStyle = "#1b1e33";
            ctx.fillRect(e.x - w / 2, e.y - 10, w, 14);
            ctx.strokeStyle = "#ffd166";
            ctx.strokeRect(e.x - w / 2 + 0.5, e.y - 9.5, w - 1, 13);
            ctx.fillStyle = "#ffd166";
            ctx.fillText(text, e.x, e.y);
          }
          ctx.textAlign = "left";
          break;
        }
        case "button": {
          ctx.fillStyle = "#3a3f5c";
          ctx.fillRect(e.x - 2, e.y + e.h - 4, e.w + 4, 4);
          ctx.fillStyle = hc ? "#ffffff" : "#ff5d8f";
          const h = e.touched ? 3 : e.h - 4;
          ctx.fillRect(e.x, e.y + e.h - 4 - h, e.w, h);
          if (e.label) {
            ctx.font = "7px monospace";
            ctx.textAlign = "center";
            ctx.fillStyle = "#ff9dbb";
            ctx.fillText(e.label, e.x + e.w / 2, e.y - 6);
            ctx.textAlign = "left";
          }
          break;
        }
        case "enemy": {
          const k = e.kind ?? "crawler";
          const col = hc ? "#ffffff" : k === "sentry" || k === "core" ? "#ff8a3d" : "#ff5d8f";
          ctx.fillStyle = col;
          ctx.fillRect(e.x, e.y, e.w, e.h);
          if (k === "sentry" || k === "core") {
            const per = (e.period ?? (k === "core" ? 1.6 : 2.4)) / this.hazardMul;
            if (e.timer > per - 0.7) {
              const a = 0.4 + 0.6 * Math.abs(Math.sin(e.phase * 20));
              ctx.fillStyle = `rgba(255,240,180,${a})`;
              ctx.fillRect(e.x + e.w / 2 - 3, e.y + e.h * 0.4 - 3, 6, 6);
            }
            if (k === "core") {
              ctx.fillStyle = "#07070d";
              ctx.fillRect(e.x + 4, e.y + e.h - 6, e.w - 8, 3);
              ctx.fillStyle = "#7cf9c8";
              ctx.fillRect(e.x, e.y - 6, (e.w * e.hp) / (e.hp > 0 ? 14 : 1), 3);
            }
          }
          // angry eyes
          ctx.fillStyle = "#0d0f1c";
          const dir = Math.sign(pcx - (e.x + e.w / 2)) || 1;
          ctx.fillRect(e.x + e.w * 0.25 + dir, e.y + 3, 3, 3);
          ctx.fillRect(e.x + e.w * 0.62 + dir, e.y + 3, 3, 3);
          ctx.fillRect(e.x + e.w * 0.2, e.y + 2, e.w * 0.6, 1);
          if (k === "crawler") {
            ctx.fillStyle = col;
            const leg = Math.sin(e.phase * 14) > 0 ? 1 : 0;
            ctx.fillRect(e.x + 2 + leg, e.y + e.h, 3, 2);
            ctx.fillRect(e.x + e.w - 5 - leg, e.y + e.h, 3, 2);
          }
          break;
        }
        case "laser": {
          const st = laserState(e);
          ctx.fillStyle = "#3a3f5c";
          const vert = e.h >= e.w;
          if (vert) ctx.fillRect(e.x - 3, e.y - 6, e.w + 6, 6);
          else ctx.fillRect(e.x - 6, e.y - 3, 6, e.h + 6);
          if (st === 0) ctx.fillStyle = "rgba(255,93,143,0.12)";
          else if (st === 1) ctx.fillStyle = `rgba(255,93,143,${0.25 + 0.35 * Math.abs(Math.sin(e.phase * 18))})`;
          else ctx.fillStyle = hc ? "#ffffff" : "#ff3d7f";
          if (st === 2) ctx.fillRect(e.x, e.y, e.w, e.h);
          else if (vert) ctx.fillRect(e.x + e.w / 2 - 0.5, e.y, 1, e.h);
          else ctx.fillRect(e.x, e.y + e.h / 2 - 0.5, e.w, 1);
          if (st === 2) {
            ctx.fillStyle = "rgba(255,240,245,0.8)";
            if (vert) ctx.fillRect(e.x + e.w / 2 - 1, e.y, 2, e.h);
            else ctx.fillRect(e.x, e.y + e.h / 2 - 1, e.w, 2);
          }
          break;
        }
        case "boulder": {
          const cx = e.x + e.w / 2;
          const cy = e.y + e.h / 2;
          ctx.fillStyle = hc ? "#ffffff" : "#9a8f7a";
          ctx.beginPath();
          ctx.arc(cx, cy, e.w / 2, 0, Math.PI * 2);
          ctx.fill();
          const r = e.armed ? e.x / (e.w / 2) : 0;
          ctx.strokeStyle = "#5a5446";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(r) * e.w * 0.4, cy + Math.sin(r) * e.w * 0.4);
          ctx.lineTo(cx - Math.cos(r) * e.w * 0.4, cy - Math.sin(r) * e.w * 0.4);
          ctx.stroke();
          ctx.lineWidth = 1;
          break;
        }
        case "dashwall": {
          const warn = e.armed && e.timer <= 0.8;
          ctx.fillStyle = hc ? "#ffffff" : "#c45bff";
          ctx.fillRect(e.x, e.y, e.w, e.h);
          ctx.fillStyle = warn && Math.sin(e.phase * 30) > 0 ? "#ffd166" : "#2a1240";
          for (let yy = e.y + 4; yy < e.y + e.h - 4; yy += 12) ctx.fillRect(e.x + 3, yy, e.w - 6, 5);
          if (warn) {
            ctx.fillStyle = "rgba(255,209,102,0.18)";
            const tx = e.ox + (e.dx ?? 0);
            ctx.fillRect(Math.min(e.x, tx), e.y, Math.abs(tx - e.x) + e.w, e.h);
          }
          break;
        }
        case "chest": {
          if (e.collected) {
            ctx.fillStyle = "rgba(201,138,60,0.35)";
            ctx.fillRect(e.x, e.y + 8, e.w, e.h - 8);
            break;
          }
          ctx.fillStyle = hc ? "#ffffff" : "#c98a3c";
          ctx.fillRect(e.x, e.y + 4, e.w, e.h - 4);
          ctx.fillStyle = hc ? "#cccccc" : "#e6a957";
          ctx.fillRect(e.x - 1, e.y, e.w + 2, 6);
          // clue: troll chests have a crooked pink latch
          ctx.fillStyle = e.trap ? "#ff5d8f" : "#ffd166";
          ctx.fillRect(e.x + e.w / 2 - 2 + (e.trap ? 2 : 0), e.y + 4, 4, 5);
          break;
        }
        case "powerup": {
          if (e.collected) break;
          const bob = Math.sin(e.phase * 3) * 2;
          const a = e.trap ? 0.55 + 0.45 * Math.abs(Math.sin(e.phase * 9)) : 0.9;
          ctx.fillStyle = `rgba(90,209,255,${a})`;
          ctx.fillRect(e.x, e.y + bob, e.w, e.h);
          ctx.fillStyle = "#e8fbff";
          ctx.fillRect(e.x + e.w / 2 - 1, e.y + 2 + bob, 2, e.h - 4);
          ctx.fillRect(e.x + 2, e.y + e.h / 2 - 1 + bob, e.w - 4, 2);
          break;
        }
        case "target": {
          ctx.strokeStyle = hc ? "#ffffff" : "#5ad1ff";
          ctx.lineWidth = 2;
          ctx.strokeRect(e.x + 1, e.y + 1, e.w - 2, e.h - 2);
          ctx.fillStyle = `rgba(90,209,255,${0.5 + 0.5 * Math.sin(e.phase * 4)})`;
          ctx.fillRect(e.x + e.w / 2 - 2, e.y + e.h / 2 - 2, 4, 4);
          ctx.lineWidth = 1;
          break;
        }
        case "checkpoint":
        case "fakecheckpoint": {
          ctx.fillStyle = e.collected ? "#7cf9c8" : "rgba(124,249,200,0.35)";
          ctx.fillRect(e.x + e.w / 2 - 1.5, e.y, 3, e.h);
          ctx.fillRect(e.x + e.w / 2, e.y, 12, 8);
          break;
        }
        case "goal":
        case "fakegoal": {
          const t = 0.55 + 0.45 * Math.sin(e.phase * 3);
          ctx.fillStyle = e.type === "goal" ? `rgba(124,249,200,${t})` : `rgba(124,249,200,${t * 0.9})`;
          ctx.fillRect(e.x, e.y, e.w, e.h);
          ctx.strokeStyle = "#e8fff7";
          ctx.lineWidth = 2;
          ctx.strokeRect(e.x + 0.5, e.y + 0.5, e.w - 1, e.h - 1);
          ctx.fillStyle = "#07121a";
          ctx.fillRect(e.x + e.w / 2 - 2, e.y + 6, 4, e.h - 12);
          if (e.type === "goal") {
            const k = (e.phase * 0.8) % 1;
            ctx.fillStyle = `rgba(232,255,247,${1 - k})`;
            ctx.fillRect(e.x + 3 + ((e.phase * 37) % (e.w - 6)), e.y - k * 18, 2, 2);
          }
          break;
        }
      }

      if (e.ghost && near && !e.hidden) {
        // ghost block fades out as you approach — visible tell from a distance
        ctx.fillStyle = this.tint ?? "#0d0f1c";
        ctx.fillRect(e.x - 1, e.y - 1, e.w + 2, e.h + 2);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.strokeRect(e.x + 0.5, e.y + 0.5, e.w - 1, e.h - 1);
      }
    }
  }

  private drawHint(ctx: CanvasRenderingContext2D) {
    const h = this.hintSpot;
    if (!h) return;
    const t = 0.18 + 0.14 * Math.sin(this.clock * 4);
    ctx.strokeStyle = `rgba(255,209,102,${t})`;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(h.x, h.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, hc: boolean) {
    const p = this.player;
    if (p.dead) return;
    if (this.invuln > 0 && Math.sin(this.clock * 40) > 0) return;
    const s = p.scale;
    if (this.shield) {
      ctx.strokeStyle = `rgba(90,209,255,${0.5 + 0.3 * Math.sin(this.clock * 6)})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);
      ctx.lineWidth = 1;
    }
    // squash & stretch around the feet
    const ax = p.x + p.w / 2;
    const ay = p.y + p.h;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.scale(1 + this.squash, 1 - this.squash);
    ctx.translate(-ax, -ay);
    ctx.fillStyle = hc ? "#ffffff" : "#ffd166";
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
    ctx.fillStyle = "#0d0f1c";
    const ew = 4 * s;
    const eh = (Math.abs(p.vy) > 240 ? 5 : 4) * s;
    const ey = p.y + 5 * s;
    const off = p.face > 0 ? 1.5 * s : -1.5 * s;
    ctx.fillRect(Math.round(p.x + 3 * s + off), Math.round(ey), ew, eh);
    ctx.fillRect(Math.round(p.x + p.w - 7 * s + off), Math.round(ey), ew, eh);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(Math.round(p.x + 4 * s + off), Math.round(ey + 1 * s), 1.5 * s, 1.5 * s);
    ctx.fillRect(Math.round(p.x + p.w - 6 * s + off), Math.round(ey + 1 * s), 1.5 * s, 1.5 * s);
    // antenna
    ctx.fillStyle = hc ? "#ffffff" : "#ff5d8f";
    ctx.fillRect(Math.round(p.x + p.w / 2 - 1), Math.round(p.y - 4 * s), 2, 4 * s);
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawDarkness(ctx: CanvasRenderingContext2D, _scale: number) {
    const p = this.player;
    const cx = p.x + p.w / 2 - this.cam.x;
    const cy = p.y + p.h / 2 - this.cam.y;
    const r = this.dark;
    const grd = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.97)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = "rgba(0,0,0,0.97)";
    ctx.fillRect(0, 0, Math.max(0, cx - r), VH);
    ctx.fillRect(Math.min(VW, cx + r), 0, VW, VH);
    ctx.fillRect(0, 0, VW, Math.max(0, cy - r));
    ctx.fillRect(0, Math.min(VH, cy + r), VW, VH);
  }

  private drawFx(ctx: CanvasRenderingContext2D) {
    if (!this.fx) return;
    const a = Math.min(1, this.fxTimer / 0.5);
    ctx.save();
    if (this.fx === "fakeDeath") {
      ctx.fillStyle = `rgba(255,93,143,${0.5 * a})`;
      ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      ctx.fillText("...OR NOT", VW / 2, VH / 2);
    } else if (this.fx === "fakeVictory") {
      ctx.fillStyle = `rgba(7,18,26,${0.75 * a})`;
      ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = `rgba(124,249,200,${a})`;
      ctx.font = "bold 26px monospace";
      ctx.textAlign = "center";
      ctx.fillText("LEVEL COMPLETE?", VW / 2, VH / 2 - 6);
      ctx.font = "14px monospace";
      ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`;
      ctx.fillText("no.", VW / 2, VH / 2 + 22);
    } else if (this.fx === "fakeLoading") {
      ctx.fillStyle = `rgba(5,5,10,${0.9 * a})`;
      ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("LOADING NEXT LEVEL", VW / 2, VH / 2 - 14);
      const w = 200 * (1 - this.fxTimer / 1.7);
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.strokeRect(VW / 2 - 100, VH / 2, 200, 10);
      ctx.fillRect(VW / 2 - 100, VH / 2, w, 10);
    } else if (this.fx === "didIt") {
      ctx.fillStyle = `rgba(7,18,26,${0.7 * a})`;
      ctx.fillRect(0, 0, VW, VH);
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(255,209,102,${a})`;
      ctx.font = "bold 30px monospace";
      ctx.fillText("YOU DID IT!", VW / 2, VH / 2 - 6);
      if (this.fxTimer < 1) {
        ctx.font = "13px monospace";
        ctx.fillStyle = `rgba(255,255,255,${a * 0.85})`;
        ctx.fillText("...not yet. keep going.", VW / 2, VH / 2 + 22);
      }
    } else if (this.fx === "glitch" && !this.settings.reducedFlash) {
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "124,249,200" : "255,93,143"},${0.12 * a})`;
        ctx.fillRect(0, Math.random() * VH, VW, 2 + Math.random() * 8);
      }
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ helpers

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function block(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha = 1,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(x, y, w, 2);
  ctx.globalAlpha = 1;
}

function dashes(ctx: CanvasRenderingContext2D, e: Box) {
  ctx.fillStyle = "rgba(13,15,28,0.45)";
  for (let i = 6; i < e.w - 4; i += 14) ctx.fillRect(e.x + i, e.y + e.h / 2 - 1, 8, 2);
}

function dots(ctx: CanvasRenderingContext2D, e: Box) {
  ctx.fillStyle = "rgba(13,15,28,0.5)";
  for (let i = 8; i < e.w - 4; i += 16) ctx.fillRect(e.x + i, e.y + 4, 3, 3);
}

function spikes(ctx: CanvasRenderingContext2D, e: Box, color: string) {
  ctx.fillStyle = color;
  const n = Math.max(1, Math.floor(e.w / 10));
  const sw = e.w / n;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    ctx.moveTo(e.x + i * sw, e.y + e.h);
    ctx.lineTo(e.x + i * sw + sw / 2, e.y);
    ctx.lineTo(e.x + (i + 1) * sw, e.y + e.h);
  }
  ctx.closePath();
  ctx.fill();
}
