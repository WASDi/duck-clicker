import { GOLDEN } from './data';

export type Random = () => number;

/** Random path values (0..1) the view turns into a straight line across the screen. */
export interface GoldenPath {
  readonly fromLeft: boolean;
  readonly startY: number;
  readonly endY: number;
}

export type GoldenUpdate = 'appeared' | 'left' | null;

/** Golden Item timer: appears 40–60 s after the level start or after the previous one leaves, stays 6 s. */
export class Golden {
  visible = false;
  /** Seconds the current item has been on screen. */
  elapsed = 0;
  path: GoldenPath = { fromLeft: true, startY: 0.5, endY: 0.5 };
  private waitLeft: number;

  constructor(private readonly random: Random) {
    this.waitLeft = this.randomDelay();
  }

  /** Visible fraction of the 6-second crossing. */
  get progress(): number {
    return this.elapsed / GOLDEN.visibleSeconds;
  }

  update(dt: number): GoldenUpdate {
    if (this.visible) {
      this.elapsed += dt;
      if (this.elapsed < GOLDEN.visibleSeconds) return null;
      this.hide();
      return 'left';
    }
    this.waitLeft -= dt;
    if (this.waitLeft > 0) return null;
    this.show();
    return 'appeared';
  }

  show(): void {
    this.visible = true;
    this.elapsed = 0;
    this.path = { fromLeft: this.random() < 0.5, startY: this.random(), endY: this.random() };
  }

  /** Removes the item (collected or gone) and starts the wait for the next one. */
  hide(): void {
    this.visible = false;
    this.waitLeft = this.randomDelay();
  }

  private randomDelay(): number {
    return GOLDEN.minDelaySeconds + this.random() * (GOLDEN.maxDelaySeconds - GOLDEN.minDelaySeconds);
  }
}
