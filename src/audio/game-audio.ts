import { hasUrlFlag } from '../core/url-flags';
import type { LevelId } from '../sim/data';
import { AudioEngine } from './audio-engine';
import { MUSIC_PATHS, Music } from './music';

const SFX = 'audio/sfx/';
const QUACKS = [1, 2, 3].map((n) => `${SFX}quack_${n}.wav`);
const SFX_NAMES = [
  'purchase', 'max', 'deny', 'complete_pond', 'complete_sky', 'complete_space', 'hatch', 'frenzy_start', 'frenzy_end',
  'golden_appear', 'golden_collect', 'whoosh_wind', 'whoosh_rocket', 'beacon', 'ui_click',
];

const MAX_QUACK_VOICES = 8;
const QUACK_RATE_VARIATION = 0.04;
const HATCH_SPACING_SECONDS = 0.1;
const HATCH_MAX_PER_BATCH = 4;
const HATCH_GAIN = 0.5;

/** The game's sound rules from docs/Audio.md, on top of the audio engine. */
export class GameAudio {
  readonly engine = new AudioEngine();
  readonly music = new Music(this.engine);
  private lastQuack = -1;
  private quackVoices = 0;
  private pendingLevel: LevelId | null = null;

  constructor() {
    if (hasUrlFlag('mute')) this.engine.mute();
  }

  async load(): Promise<void> {
    await Promise.all([
      this.engine.load([...QUACKS, ...SFX_NAMES.map((n) => `${SFX}${n}.wav`)]),
      this.music.loadLoopInfo(),
    ]);
    await this.engine.load(MUSIC_PATHS);
    if (this.engine.unlocked && this.pendingLevel) this.music.playLevel(this.pendingLevel, false);
  }

  /** First click: sound starts here, with the music of the current level. */
  unlock(level: LevelId): void {
    if (this.engine.unlocked) return;
    this.engine.unlock();
    this.pendingLevel = level;
    this.music.playLevel(level, false);
  }

  startLevelMusic(level: LevelId): void {
    this.pendingLevel = level;
    if (this.engine.unlocked) this.music.playLevel(level, true);
  }

  quack(delay = 0): void {
    if (this.quackVoices >= MAX_QUACK_VOICES) return;
    let clip = Math.floor(Math.random() * (QUACKS.length - 1));
    if (clip >= this.lastQuack && this.lastQuack >= 0) clip += 1;
    this.lastQuack = clip;
    const rate = 1 + (Math.random() * 2 - 1) * QUACK_RATE_VARIATION;
    const source = this.engine.play(QUACKS[clip], { rate, delay, onEnded: () => this.quackVoices-- });
    if (source) this.quackVoices++;
  }

  /** Purchases 1–9 rise a semitone each; the 10th plays the max jingle. */
  purchase(count: number, maxBuys: number): void {
    if (count >= maxBuys) this.sfx('max');
    else this.engine.play(`${SFX}purchase.wav`, { rate: 2 ** ((count - 1) / 12) });
  }

  hatch(eggs: number): void {
    const plays = Math.min(eggs, HATCH_MAX_PER_BATCH);
    for (let i = 0; i < plays; i++) this.engine.play(`${SFX}hatch.wav`, { gain: HATCH_GAIN, delay: i * HATCH_SPACING_SECONDS });
  }

  sfx(name: string, delay = 0): void {
    this.engine.play(`${SFX}${name}.wav`, { delay });
  }
}
