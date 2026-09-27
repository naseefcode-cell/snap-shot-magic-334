/**
 * AudioManager — every sound is synthesized with the Web Audio API,
 * so the game ships with zero audio files and works offline.
 */

export type Sfx =
  | "jump"
  | "land"
  | "coin"
  | "death"
  | "checkpoint"
  | "complete"
  | "click"
  | "trap"
  | "achievement"
  | "secret";

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private step = 0;
  sfxOn = true;
  musicOn = true;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.12;
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  private blip(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain = 0.25,
    slideTo?: number,
    dest?: AudioNode,
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideTo),
        ctx.currentTime + dur,
      );
    }
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(dest ?? this.master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  private noise(dur: number, gain = 0.2) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();
  }

  play(sfx: Sfx) {
    if (!this.sfxOn) return;
    switch (sfx) {
      case "jump":
        this.blip(320, 0.14, "square", 0.18, 640);
        break;
      case "land":
        this.noise(0.08, 0.12);
        break;
      case "coin":
        this.blip(880, 0.08, "square", 0.16);
        window.setTimeout(() => this.blip(1320, 0.1, "square", 0.14), 70);
        break;
      case "death":
        this.blip(420, 0.3, "sawtooth", 0.2, 60);
        this.noise(0.22, 0.18);
        break;
      case "checkpoint":
        this.blip(660, 0.1, "triangle", 0.18);
        window.setTimeout(() => this.blip(990, 0.16, "triangle", 0.16), 90);
        break;
      case "complete":
        [523, 659, 784, 1046].forEach((f, i) =>
          window.setTimeout(() => this.blip(f, 0.18, "square", 0.16), i * 95),
        );
        break;
      case "click":
        this.blip(520, 0.05, "square", 0.1);
        break;
      case "trap":
        this.blip(180, 0.22, "sawtooth", 0.2, 90);
        break;
      case "achievement":
        [784, 988, 1318].forEach((f, i) =>
          window.setTimeout(() => this.blip(f, 0.2, "triangle", 0.15), i * 110),
        );
        break;
      case "secret":
        [1046, 1318, 1568, 2093].forEach((f, i) =>
          window.setTimeout(() => this.blip(f, 0.12, "square", 0.12), i * 70),
        );
        break;
    }
  }

  /** Slow generated bassline + arpeggio loop. */
  startMusic() {
    if (!this.musicOn || this.musicTimer !== null) return;
    const ctx = this.ensure();
    if (!ctx || !this.musicGain) return;
    const bass = [110, 110, 146.8, 98];
    const arp = [440, 523, 659, 523, 587, 494, 440, 392];
    this.musicTimer = window.setInterval(() => {
      if (!this.musicOn) return;
      const s = this.step++;
      if (s % 4 === 0) {
        this.blip(bass[(s / 4) % bass.length]!, 0.5, "triangle", 0.3, undefined, this.musicGain!);
      }
      this.blip(arp[s % arp.length]!, 0.18, "square", 0.12, undefined, this.musicGain!);
    }, 240);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (on) this.startMusic();
    else this.stopMusic();
  }
}

export const audio = new AudioManager();
