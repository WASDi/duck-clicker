import type { LevelId } from '../sim/data';
import { assetUrl } from '../core/assets';
import type { AudioEngine } from './audio-engine';

const CROSSFADE_SECONDS = 2;
const FRENZY_RAMP_SECONDS = 0.5;
const OUTRO_PATH = 'audio/music/outro.ogg';

interface LoopInfo {
  sampleRate: number;
  loopSamples: Record<LevelId, number>;
}

interface LevelTrack {
  sources: AudioBufferSourceNode[];
  output: GainNode;
  frenzy: GainNode;
}

export const MUSIC_PATHS = (['pond', 'sky', 'space'] as const).flatMap((id) => [`audio/music/${id}.ogg`, `audio/music/${id}_frenzy.ogg`]).concat(OUTRO_PATH);

/** Looping level music with a frenzy stem, cross-fades between levels, and the one-shot outro. */
export class Music {
  private loops: LoopInfo | null = null;
  private current: LevelTrack | null = null;
  private outroStart: number | null = null;

  constructor(private readonly engine: AudioEngine) {}

  async loadLoopInfo(): Promise<void> {
    const response = await fetch(assetUrl('audio/music/loops.json'));
    this.loops = (await response.json()) as LoopInfo;
  }

  /** Starts a level loop from its beginning, cross-fading from whatever was playing. */
  playLevel(id: LevelId, crossfade: boolean): void {
    const base = this.engine.buffer(`audio/music/${id}.ogg`);
    const frenzyStem = this.engine.buffer(`audio/music/${id}_frenzy.ogg`);
    if (!base || !frenzyStem || !this.loops) return;
    this.fadeOutCurrent(crossfade ? CROSSFADE_SECONDS : 0.05);

    const context = this.engine.context;
    const now = context.currentTime;
    const output = context.createGain();
    output.connect(this.engine.musicBus);
    if (crossfade) {
      output.gain.setValueAtTime(0, now);
      output.gain.linearRampToValueAtTime(1, now + CROSSFADE_SECONDS);
    }
    const frenzy = context.createGain();
    frenzy.gain.value = 0;
    frenzy.connect(output);
    const loopEnd = this.loops.loopSamples[id] / this.loops.sampleRate;
    const sources = [
      this.loopSource(base, loopEnd, output),
      this.loopSource(frenzyStem, loopEnd, frenzy),
    ];
    const startAt = now + 0.05;
    sources.forEach((source) => source.start(startAt));
    this.current = { sources, output, frenzy };
  }

  setFrenzy(active: boolean): void {
    if (!this.current) return;
    const gain = this.current.frenzy.gain;
    const now = this.engine.now;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(active ? 1 : 0, now + FRENZY_RAMP_SECONDS);
  }

  playOutro(): void {
    const buffer = this.engine.buffer(OUTRO_PATH);
    this.fadeOutCurrent(1);
    if (!buffer) return;
    const source = this.engine.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.engine.musicBus);
    this.outroStart = this.engine.now + 0.05;
    source.start(this.outroStart);
  }

  /** Seconds into the outro track, or null when it is not audibly playing. */
  outroPosition(): number | null {
    if (this.outroStart === null || !this.engine.running) return null;
    return Math.max(0, this.engine.now - this.outroStart);
  }

  private loopSource(buffer: AudioBuffer, loopEnd: number, destination: AudioNode): AudioBufferSourceNode {
    const source = this.engine.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = loopEnd;
    source.connect(destination);
    return source;
  }

  private fadeOutCurrent(seconds: number): void {
    if (!this.current) return;
    const { sources, output } = this.current;
    const now = this.engine.now;
    output.gain.cancelScheduledValues(now);
    output.gain.setValueAtTime(output.gain.value, now);
    output.gain.linearRampToValueAtTime(0, now + seconds);
    sources.forEach((source) => source.stop(now + seconds + 0.05));
    this.current = null;
  }
}
