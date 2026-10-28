import { TICK_SECONDS } from '../sim/data';

const MAX_FRAME_SECONDS = 0.25;

/**
 * Fixed 20 Hz simulation ticks inside requestAnimationFrame. Pauses while the tab is hidden
 * and never catches up the missed time.
 */
export class Loop {
  speed = 1;
  private accumulator = 0;
  private lastTime: number | null = null;

  constructor(
    private readonly tick: (dt: number) => void,
    private readonly render: (frameSeconds: number) => void,
  ) {
    document.addEventListener('visibilitychange', () => {
      this.lastTime = null;
    });
  }

  start(): void {
    requestAnimationFrame(this.frame);
  }

  private frame = (time: number): void => {
    requestAnimationFrame(this.frame);
    if (document.hidden) return;
    const frameSeconds = this.lastTime === null ? 0 : Math.min((time - this.lastTime) / 1000, MAX_FRAME_SECONDS);
    this.lastTime = time;
    this.accumulator += frameSeconds * this.speed;
    while (this.accumulator >= TICK_SECONDS) {
      this.tick(TICK_SECONDS);
      this.accumulator -= TICK_SECONDS;
    }
    this.render(frameSeconds * this.speed);
  };
}
