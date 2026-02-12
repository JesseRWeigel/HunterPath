import { Howl, Howler } from "howler";

// ─── Audio Manager ──────────────────────────────────────────────
// Centralized audio system using Howler.js.
// Handles SFX, music with crossfade, volume control, and
// procedural Web Audio fallbacks when audio files are stubs.

type SoundName =
  | "attack"
  | "damage"
  | "critical"
  | "block"
  | "victory"
  | "defeat"
  | "heal"
  | "rune_use"
  | "level_up"
  | "rest"
  | "gate_enter"
  | "extraction_start"
  | "extraction_loop"
  | "extraction_success"
  | "extraction_failure";

type MusicName = "ambient" | "combat" | "victory_music" | "defeat_music";

// Procedural sound definitions (Web Audio API fallback when files are stubs)
interface ToneStep {
  freq: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  delay: number;
}

const PROCEDURAL_SOUNDS: Record<SoundName, ToneStep[]> = {
  attack: [{ freq: 800, duration: 0.1, type: "square", volume: 0.2, delay: 0 }],
  damage: [{ freq: 200, duration: 0.3, type: "sawtooth", volume: 0.3, delay: 0 }],
  critical: [
    { freq: 1200, duration: 0.2, type: "square", volume: 0.4, delay: 0 },
    { freq: 800, duration: 0.2, type: "square", volume: 0.3, delay: 100 },
  ],
  block: [{ freq: 400, duration: 0.15, type: "sine", volume: 0.2, delay: 0 }],
  victory: [
    { freq: 523, duration: 0.2, type: "sine", volume: 0.3, delay: 0 },
    { freq: 659, duration: 0.2, type: "sine", volume: 0.3, delay: 200 },
    { freq: 784, duration: 0.3, type: "sine", volume: 0.3, delay: 400 },
  ],
  defeat: [
    { freq: 200, duration: 0.5, type: "sawtooth", volume: 0.4, delay: 0 },
    { freq: 150, duration: 0.5, type: "sawtooth", volume: 0.4, delay: 500 },
  ],
  heal: [
    { freq: 600, duration: 0.2, type: "sine", volume: 0.2, delay: 0 },
    { freq: 800, duration: 0.2, type: "sine", volume: 0.2, delay: 200 },
  ],
  rune_use: [
    { freq: 1000, duration: 0.3, type: "sine", volume: 0.3, delay: 0 },
    { freq: 1200, duration: 0.2, type: "sine", volume: 0.2, delay: 300 },
  ],
  level_up: [
    { freq: 523, duration: 0.15, type: "sine", volume: 0.3, delay: 0 },
    { freq: 659, duration: 0.15, type: "sine", volume: 0.3, delay: 150 },
    { freq: 784, duration: 0.15, type: "sine", volume: 0.3, delay: 300 },
    { freq: 1047, duration: 0.3, type: "sine", volume: 0.3, delay: 450 },
  ],
  rest: [
    { freq: 300, duration: 0.4, type: "sine", volume: 0.2, delay: 0 },
    { freq: 400, duration: 0.3, type: "sine", volume: 0.2, delay: 400 },
  ],
  gate_enter: [
    { freq: 150, duration: 0.3, type: "sawtooth", volume: 0.3, delay: 0 },
    { freq: 200, duration: 0.3, type: "sawtooth", volume: 0.3, delay: 300 },
  ],
  extraction_start: [
    { freq: 400, duration: 0.2, type: "sine", volume: 0.2, delay: 0 },
    { freq: 600, duration: 0.2, type: "sine", volume: 0.2, delay: 200 },
  ],
  extraction_loop: [
    { freq: 800, duration: 0.1, type: "sine", volume: 0.1, delay: 0 },
  ],
  extraction_success: [
    { freq: 523, duration: 0.2, type: "sine", volume: 0.3, delay: 0 },
    { freq: 659, duration: 0.2, type: "sine", volume: 0.3, delay: 200 },
    { freq: 784, duration: 0.2, type: "sine", volume: 0.3, delay: 400 },
    { freq: 1047, duration: 0.4, type: "sine", volume: 0.3, delay: 600 },
  ],
  extraction_failure: [
    { freq: 200, duration: 0.4, type: "sawtooth", volume: 0.3, delay: 0 },
    { freq: 150, duration: 0.4, type: "sawtooth", volume: 0.3, delay: 400 },
  ],
};

// Base path for audio files — adjusts for GitHub Pages subdirectory deploy
const BASE = import.meta.env.BASE_URL ?? "/";

const SFX_PATHS: Record<SoundName, string> = {
  attack: `${BASE}sounds/attack.mp3`,
  damage: `${BASE}sounds/damage.mp3`,
  critical: `${BASE}sounds/critical.mp3`,
  block: `${BASE}sounds/block.mp3`,
  victory: `${BASE}sounds/victory.mp3`,
  defeat: `${BASE}sounds/defeat.mp3`,
  heal: `${BASE}sounds/heal.mp3`,
  rune_use: `${BASE}sounds/rune_use.mp3`,
  level_up: `${BASE}sounds/level_up.mp3`,
  rest: `${BASE}sounds/rest.mp3`,
  gate_enter: `${BASE}sounds/gate_enter.mp3`,
  extraction_start: `${BASE}sounds/extraction_start.mp3`,
  extraction_loop: `${BASE}sounds/extraction_loop.mp3`,
  extraction_success: `${BASE}sounds/extraction_success.mp3`,
  extraction_failure: `${BASE}sounds/extraction_failure.mp3`,
};

const MUSIC_PATHS: Record<MusicName, string> = {
  ambient: `${BASE}music/ambient.mp3`,
  combat: `${BASE}music/combat.mp3`,
  victory_music: `${BASE}music/victory.mp3`,
  defeat_music: `${BASE}music/defeat.mp3`,
};

class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private currentMusic: Howl | null = null;
  private currentMusicName: MusicName | null = null;
  private _soundEnabled = true;
  private _musicEnabled = true;
  private _volume = 0.7;
  private audioCtx: AudioContext | null = null;
  // Track which files are stubs so we skip them on subsequent plays
  private stubFiles: Set<string> = new Set();

  constructor() {
    // Pre-load all SFX
    for (const [name, src] of Object.entries(SFX_PATHS)) {
      const howl = new Howl({
        src: [src],
        volume: this._volume,
        preload: true,
        onloaderror: () => {
          this.stubFiles.add(name);
        },
      });
      this.sounds.set(name, howl);
    }
  }

  // ─── Public API ────────────────────────────────

  playSound(name: SoundName, volumeOverride?: number) {
    if (!this._soundEnabled) return;

    // If the file was a stub, use procedural fallback
    if (this.stubFiles.has(name)) {
      this.playProceduralSound(name);
      return;
    }

    const howl = this.sounds.get(name);
    if (!howl) {
      this.playProceduralSound(name);
      return;
    }

    // Check if loaded properly (duration > 0)
    if (howl.duration() === 0) {
      this.stubFiles.add(name);
      this.playProceduralSound(name);
      return;
    }

    howl.volume(volumeOverride ?? this._volume);
    howl.play();
  }

  playMusic(name: MusicName, loop = true) {
    if (!this._musicEnabled) return;
    if (this.currentMusicName === name && this.currentMusic?.playing()) return;

    this.stopMusic(true); // crossfade out

    const src = MUSIC_PATHS[name];
    if (!src) return;

    const music = new Howl({
      src: [src],
      volume: 0,
      loop,
      onloaderror: () => {
        // Fallback: ambient drone via Web Audio
        if (name === "ambient") this.startAmbientDrone();
      },
    });

    music.play();
    music.fade(0, this._volume * 0.5, 1000); // crossfade in over 1s
    this.currentMusic = music;
    this.currentMusicName = name;
  }

  stopMusic(fade = false) {
    if (!this.currentMusic) return;
    const m = this.currentMusic;

    if (fade && m.playing()) {
      m.fade(m.volume(), 0, 800);
      setTimeout(() => {
        m.stop();
        m.unload();
      }, 850);
    } else {
      m.stop();
      m.unload();
    }

    this.currentMusic = null;
    this.currentMusicName = null;
  }

  get soundEnabled() {
    return this._soundEnabled;
  }
  set soundEnabled(v: boolean) {
    this._soundEnabled = v;
  }

  get musicEnabled() {
    return this._musicEnabled;
  }
  set musicEnabled(v: boolean) {
    this._musicEnabled = v;
    if (!v) {
      this.stopMusic();
    } else if (!this.currentMusic) {
      this.playMusic("ambient");
    }
  }

  get volume() {
    return this._volume;
  }
  set volume(v: number) {
    this._volume = v;
    Howler.volume(v);
    if (this.currentMusic) {
      this.currentMusic.volume(v * 0.5);
    }
  }

  get currentTrack(): MusicName | null {
    return this.currentMusicName;
  }

  // ─── Procedural Fallback (Web Audio API) ───────

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private playTone(step: ToneStep) {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(step.freq, ctx.currentTime);
      osc.type = step.type;

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(
        step.volume * this._volume,
        ctx.currentTime + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + step.duration
      );

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + step.duration);
    } catch {
      // Silently handle audio errors
    }
  }

  private playProceduralSound(name: string) {
    if (!this._soundEnabled) return;
    const steps = PROCEDURAL_SOUNDS[name as SoundName];
    if (!steps) return;

    for (const step of steps) {
      if (step.delay > 0) {
        setTimeout(() => this.playTone(step), step.delay);
      } else {
        this.playTone(step);
      }
    }
  }

  private startAmbientDrone() {
    if (!this._musicEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(
        this._volume * 0.1,
        ctx.currentTime + 2
      );

      osc.start(ctx.currentTime);

      // Create a fake Howl-like ref so stopMusic works
      this.currentMusic = {
        playing: () => true,
        stop: () => { osc.stop(); gain.disconnect(); },
        unload: () => {},
        fade: () => {},
        volume: () => this._volume * 0.1,
      } as any;
      this.currentMusicName = "ambient";
    } catch {
      // Silently handle
    }
  }
}

// Singleton instance
export const audioManager = new AudioManager();
export type { SoundName, MusicName };
