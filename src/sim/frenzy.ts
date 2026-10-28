import { FRENZY } from './data';

export type FrenzyPhase = 'ready' | 'active' | 'cooldown';

/** Honk Frenzy: 8 duck clicks within 6 s doubles production for 10 s, then a 20 s cooldown. */
export class Frenzy {
  phase: FrenzyPhase = 'ready';
  /** Seconds left in the active or cooldown phase. */
  remaining = 0;
  private clickTimes: number[] = [];
  private now = 0;

  get multiplier(): number {
    return this.phase === 'active' ? FRENZY.multiplier : 1;
  }

  /** Clicks inside the current 6-second window (only counted while ready). */
  get streak(): number {
    return this.recentClicks().length;
  }

  /** Records a duck click. Returns true when it starts the Frenzy. */
  registerClick(): boolean {
    if (this.phase !== 'ready') return false;
    this.clickTimes = [...this.recentClicks(), this.now];
    if (this.clickTimes.length < FRENZY.clicksNeeded) return false;
    this.activate();
    return true;
  }

  activate(): void {
    this.phase = 'active';
    this.remaining = FRENZY.durationSeconds;
    this.clickTimes = [];
  }

  /** Advances time. Returns the phase that just ended, if any. */
  update(dt: number): FrenzyPhase | null {
    this.now += dt;
    if (this.phase === 'ready') return null;
    this.remaining -= dt;
    if (this.remaining > 0) return null;
    const ended = this.phase;
    if (ended === 'active') {
      this.phase = 'cooldown';
      this.remaining += FRENZY.cooldownSeconds;
    } else {
      this.phase = 'ready';
      this.remaining = 0;
    }
    return ended;
  }

  private recentClicks(): number[] {
    return this.clickTimes.filter((t) => this.now - t < FRENZY.windowSeconds);
  }
}
