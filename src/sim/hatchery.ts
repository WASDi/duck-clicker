/** One shared timer that starts with the first purchase and hatches one duck per purchase each interval. */
export class Hatchery {
  private elapsed = 0;

  constructor(private readonly intervalSeconds: number) {}

  /** Fraction of the current interval that has passed (0 before the first purchase). */
  progress(purchases: number): number {
    return purchases > 0 ? this.elapsed / this.intervalSeconds : 0;
  }

  secondsUntilHatch(purchases: number): number {
    return purchases > 0 ? this.intervalSeconds - this.elapsed : Infinity;
  }

  /** Advances the timer. Returns the number of ducks hatched. */
  update(dt: number, purchases: number): number {
    if (purchases === 0) return 0;
    this.elapsed += dt;
    let hatched = 0;
    while (this.elapsed >= this.intervalSeconds) {
      this.elapsed -= this.intervalSeconds;
      hatched += purchases;
    }
    return hatched;
  }
}
