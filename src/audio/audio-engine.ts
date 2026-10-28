import { assetUrl } from '../core/assets';

export interface PlayOptions {
  rate?: number;
  gain?: number;
  /** Delay in seconds from now. */
  delay?: number;
  onEnded?: () => void;
}

/** Web Audio context with every sound decoded into memory up front. */
export class AudioEngine {
  readonly context = new AudioContext();
  readonly sfxBus: GainNode;
  readonly musicBus: GainNode;
  unlocked = false;
  private buffers = new Map<string, AudioBuffer>();

  constructor() {
    this.sfxBus = this.createBus(0.9);
    this.musicBus = this.createBus(0.55);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void this.context.suspend();
      else if (this.unlocked) void this.context.resume();
    });
  }

  get running(): boolean {
    return this.unlocked && this.context.state === 'running';
  }

  get now(): number {
    return this.context.currentTime;
  }

  /** Must be called from a user gesture. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    void this.context.resume();
  }

  async load(paths: readonly string[]): Promise<void> {
    await Promise.all(paths.map((path) => this.loadOne(path)));
  }

  has(path: string): boolean {
    return this.buffers.has(path);
  }

  buffer(path: string): AudioBuffer | undefined {
    return this.buffers.get(path);
  }

  /** Plays a one-shot sound effect. Returns the source, or null when it is not loaded yet. */
  play(path: string, options: PlayOptions = {}): AudioBufferSourceNode | null {
    const buffer = this.buffers.get(path);
    if (!buffer || !this.unlocked) return null;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options.rate ?? 1;
    const gain = this.context.createGain();
    gain.gain.value = options.gain ?? 1;
    source.connect(gain).connect(this.sfxBus);
    if (options.onEnded) source.onended = options.onEnded;
    source.start(this.now + (options.delay ?? 0));
    return source;
  }

  private createBus(volume: number): GainNode {
    const bus = this.context.createGain();
    bus.gain.value = volume;
    bus.connect(this.context.destination);
    return bus;
  }

  private async loadOne(path: string): Promise<void> {
    try {
      const response = await fetch(assetUrl(path));
      const data = await response.arrayBuffer();
      this.buffers.set(path, await this.context.decodeAudioData(data));
    } catch (error) {
      console.warn(`Could not load ${path}`, error);
    }
  }
}
