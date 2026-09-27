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

const SOLID_TYPES = new Set(["solid", "vanish", "fall", "move", "memory", "freeze", "fakewall"]);
const HAZARD_TYPES = new Set(["spike", "crusher", "chaser"]);

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

type Fx = "fakeDeath" | "fakeVictory" | "fakeLoading" | "glitch" | null;

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
    this.reset(true);
  }

  private reset(full: boolean) {
    const def = this.def;
    this.ents = def.entities.map((e) => this.spawnEnt(e));
    this.triggers = (def.triggers ?? []).map((t) => ({ ...t, fired: false }));
    this.particles.length = 0;

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
    this.message = def.hint ?? null;
    this.msgTimer = this.message ? 3 : 0;
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
    p.scale = (def.scale ?? 1) * 1;
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
      dead: HAZARD_TYPES.has(d.type) && !d.hidden,
      cooldown: 0,
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

    if (this.player.dead) {
      this.respawnTimer -= dt;
      this.updateParticles(dt);
      this.updateCamera(dt);
      if (this.respawnTimer <= 0) this.reset(false);
      this.emitHud(false);
      return;
    }

    if (!this.frozen) this.updateEntities(dt);
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

    if (axis !== 0) {
      p.vx += axis * ACCEL * dt;
      p.vx = Math.max(-maxRun, Math.min(maxRun, p.vx));
      p.face = axis > 0 ? 1 : -1;
    } else {
      const f = (p.onGround ? FRICTION : AIR_FRICTION) * dt;
      if (Math.abs(p.vx) <= f) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * f;
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
      audio.play("jump");
      this.burst(p.x + p.w / 2, p.y + (sign > 0 ? p.h : 0), 5, "#7cf9c8");
    }
    // variable jump height
    if (!this.input.jumpHeld && p.vy * sign < 0) p.vy += g * 2.1 * dt;

    p.vy += g * dt;
    p.vy = Math.max(-900, Math.min(900, p.vy));

    p.onGround = false;

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
        p.vy = 0;
      } else if (p.vy < 0) {
        p.y = e.y + e.h;
        if (sign < 0) this.landOn(e);
        p.vy = 0;
      }
    }

    if (p.onGround) p.coyote = COYOTE;

    // carried by moving platform
    const s = p.support;
    if (s && !s.removed) {
      p.x += s.x - s.px;
      p.y += s.y - s.py;
    }

    // bounds
    p.x = Math.max(0, Math.min(p.x, this.def.w - p.w));
    if (p.y > this.def.h + 90 || p.y < -260) this.kill();
    if (this.scroll > 0 && p.x + p.w < this.cam.x - 4) this.kill();
  }

  private landOn(e: Ent) {
    const p = this.player;
    if (!p.onGround) audio.play("land");
    p.onGround = true;
    p.support = e;
    if (!e.touched) {
      e.touched = true;
      if (e.type === "vanish" || e.type === "fall") {
        e.timer = e.delay ?? (e.type === "fall" ? 0.22 : 0.4);
        audio.play("trap");
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
        case "crusher": {
          if (e.armed) {
            const targetY = e.oy + (e.dy ?? 0);
            const targetX = e.ox + (e.dx ?? 0);
            const sp = (e.speed ?? 320) * dt;
            e.y += Math.sign(targetY - e.y) * Math.min(sp, Math.abs(targetY - e.y));
            e.x += Math.sign(targetX - e.x) * Math.min(sp, Math.abs(targetX - e.x));
          }
          break;
        }
        case "chaser": {
          if (e.armed) {
            const sp = (e.speed ?? 65) * dt;
            const dx = pcx - (e.x + e.w / 2);
            const dy = pcy - (e.y + e.h / 2);
            const len = Math.hypot(dx, dy) || 1;
            e.x += (dx / len) * sp;
            e.y += (dy / len) * sp;
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
      if (HAZARD_TYPES.has(e.type)) e.dead = !e.hidden;
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
      if (!overlap(p, t)) continue;
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
      case "gravity":
        this.gravityMul = op.v;
        this.shake(5);
        audio.play("trap");
        break;
      case "reverse":
        this.reverse = op.v;
        this.flash("controls scrambled");
        break;
      case "scale": {
        const p = this.player;
        const bottom = p.y + p.h;
        const cx = p.x + p.w / 2;
        p.scale = op.v;
        p.w = 18 * op.v;
        p.h = 18 * op.v;
        p.x = cx - p.w / 2;
        p.y = bottom - p.h;
        this.burst(cx, bottom, 12, "#ffd166");
        break;
      }
      case "speed":
        this.speedMul = op.v;
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
        this.fxTimer = op.v === "fakeLoading" ? 1.7 : 1.4;
        this.shake(op.v === "fakeDeath" ? 8 : 3);
        audio.play(op.v === "fakeVictory" ? "complete" : "trap");
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
        this.kill();
        return;
      }
      if (e.collected) continue;

      switch (e.type) {
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
    window.setTimeout(() => {
      this.hooks.onComplete({
        level: this.levelIndex,
        deaths: this.deaths,
        time: this.time,
        coins,
        coinTotal: total,
        stars,
        secrets: [...this.sessionSecrets],
      });
    }, 420);
  }

  private kill() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    this.deaths++;
    this.respawnTimer = 0.42;
    audio.play("death");
    this.shake(9);
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 22, "#ff5d8f");
    this.hooks.onDeath(this.deaths);
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
    ctx.fillStyle = this.tint ?? (hc ? "#000000" : "#0d0f1c");
    ctx.fillRect(0, 0, VW, VH);

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
    this.drawPlayer(ctx, hc);
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
          spikes(ctx, e, hc ? "#ffffff" : "#ff5d8f");
          break;
        case "crusher":
          block(ctx, e.x, e.y, e.w, e.h, hc ? "#ffffff" : "#ff7b4d");
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          for (let i = 0; i < e.w; i += 12) ctx.fillRect(e.x + i + 3, e.y + e.h - 5, 6, 3);
          break;
        case "chaser": {
          ctx.fillStyle = hc ? "#ffffff" : "#ff5d8f";
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
          ctx.fillStyle = "#ffd166";
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2, e.y + e.h / 2 + bob, e.w / 2, 0, Math.PI * 2);
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
        case "checkpoint": {
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
          break;
        }
      }

      if (e.ghost && near) {
        // ghost block fades out as you approach — visible tell from a distance
        ctx.fillStyle = this.tint ?? "#0d0f1c";
        ctx.fillRect(e.x - 1, e.y - 1, e.w + 2, e.h + 2);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.strokeRect(e.x + 0.5, e.y + 0.5, e.w - 1, e.h - 1);
      }
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, hc: boolean) {
    const p = this.player;
    if (p.dead) return;
    const s = p.scale;
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
