import { CLICK, COMPLETION_INDEX, GOLDEN, LEVELS, type LevelDef, type UpgradeDef, COST_GROWTH } from './data';
import { Frenzy } from './frenzy';
import { Golden, type Random } from './golden';
import { Hatchery } from './hatchery';

export type GamePhase = 'playing' | 'transition' | 'outro';

export type GameEvent =
  | { type: 'hatched'; count: number }
  | { type: 'frenzyStart' }
  | { type: 'frenzyEnd' }
  | { type: 'goldenAppeared' }
  | { type: 'goldenLeft' }
  | { type: 'purchased'; index: number; count: number }
  | { type: 'levelComplete'; levelIndex: number };

export type BuyResult = 'bought' | 'tooExpensive' | 'maxed' | 'unavailable';

export function upgradeCost(upgrade: UpgradeDef, purchases: number): number {
  let cost = upgrade.baseCost;
  for (let i = 0; i < purchases; i++) cost = Math.round(cost * COST_GROWTH);
  return cost;
}

/** The whole game state and rules. Has no DOM access. */
export class Game {
  phase: GamePhase = 'playing';
  levelIndex = 0;
  quacks = 0;
  ducks = 1;
  purchases: number[] = [];
  frenzy = new Frenzy();
  golden: Golden;
  hatchery!: Hatchery;
  private events: GameEvent[] = [];
  /** Current price of each upgrade, updated on purchase. */
  private costs: number[] = [];

  constructor(private readonly random: Random = Math.random) {
    this.golden = new Golden(random);
    this.startLevel(0);
  }

  get level(): LevelDef {
    return LEVELS[this.levelIndex];
  }

  get hatcheryPurchases(): number {
    return this.purchases[this.level.upgrades.findIndex((u) => u.kind === 'hatchery')];
  }

  get completionCost(): number {
    return this.level.upgrades[COMPLETION_INDEX].baseCost;
  }

  /** Passive Quacks per second, without Frenzy. */
  get baseProduction(): number {
    let perDuck = 0;
    let flat = 0;
    this.level.upgrades.forEach((upgrade, i) => {
      if (upgrade.kind === 'perDuck') perDuck += upgrade.amount * this.purchases[i];
      if (upgrade.kind === 'flat') flat += upgrade.amount * this.purchases[i];
    });
    return perDuck * this.ducks + flat;
  }

  /** Passive Quacks per second, including Frenzy. */
  get production(): number {
    return this.baseProduction * this.frenzy.multiplier;
  }

  get goldenReward(): number {
    return Math.max(GOLDEN.minReward, this.production * GOLDEN.rewardSeconds);
  }

  startLevel(index: number): void {
    this.levelIndex = index;
    this.phase = 'playing';
    this.quacks = 0;
    this.ducks = 1;
    this.purchases = this.level.upgrades.map(() => 0);
    this.costs = this.level.upgrades.map((upgrade) => upgrade.baseCost);
    this.frenzy = new Frenzy();
    this.golden = new Golden(this.random);
    const hatcheryUpgrade = this.level.upgrades.find((u) => u.kind === 'hatchery')!;
    this.hatchery = new Hatchery(hatcheryUpgrade.amount);
  }

  /** Returns the events produced since the last call. */
  drainEvents(): GameEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }

  tick(dt: number): void {
    if (this.phase !== 'playing') return;
    this.quacks += this.production * dt;
    this.updateHatchery(dt);
    this.updateFrenzy(dt);
    this.updateGolden(dt);
  }

  /**
   * One click that hits `ducks` ducks at once. Every duck grants its own Quacks; the click counts
   * once toward Honk Frenzy. Returns the Quacks gained per duck (0 when clicks are ignored).
   */
  clickDucks(ducks: number): number {
    if (this.phase !== 'playing' || ducks <= 0) return 0;
    const gain = CLICK.baseQuacks + this.production * CLICK.productionShare;
    this.quacks += gain * ducks;
    if (this.frenzy.registerClick()) this.events.push({ type: 'frenzyStart' });
    return gain;
  }

  /** Click on the Golden Item. Returns the Quacks gained (0 when there is none). */
  clickGolden(): number {
    if (this.phase !== 'playing' || !this.golden.visible) return 0;
    const reward = this.goldenReward;
    this.quacks += reward;
    this.golden.hide();
    return reward;
  }

  costOf(index: number): number {
    return this.costs[index];
  }

  isMaxed(index: number): boolean {
    return this.purchases[index] >= this.level.upgrades[index].maxBuys;
  }

  canAfford(index: number): boolean {
    return this.quacks >= this.costOf(index);
  }

  buy(index: number): BuyResult {
    if (this.phase !== 'playing') return 'unavailable';
    if (this.isMaxed(index)) return 'maxed';
    const cost = this.costOf(index);
    if (this.quacks < cost) return 'tooExpensive';
    this.quacks -= cost;
    this.purchases[index] += 1;
    this.costs[index] = upgradeCost(this.level.upgrades[index], this.purchases[index]);
    this.events.push({ type: 'purchased', index, count: this.purchases[index] });
    if (index === COMPLETION_INDEX) this.completeLevel();
    return 'bought';
  }

  /** Debug: starts Honk Frenzy now, regardless of cooldown. */
  forceFrenzy(): void {
    if (this.frenzy.phase === 'active') return;
    this.frenzy.activate();
    this.events.push({ type: 'frenzyStart' });
  }

  /** Debug: shows a Golden Item now. */
  forceGolden(): void {
    if (this.golden.visible) return;
    this.golden.show();
    this.events.push({ type: 'goldenAppeared' });
  }

  private completeLevel(): void {
    const isLast = this.levelIndex === LEVELS.length - 1;
    this.phase = isLast ? 'outro' : 'transition';
    this.events.push({ type: 'levelComplete', levelIndex: this.levelIndex });
  }

  private updateHatchery(dt: number): void {
    const hatched = this.hatchery.update(dt, this.hatcheryPurchases);
    if (hatched === 0) return;
    this.ducks += hatched;
    this.events.push({ type: 'hatched', count: hatched });
  }

  private updateFrenzy(dt: number): void {
    if (this.frenzy.update(dt) === 'active') this.events.push({ type: 'frenzyEnd' });
  }

  private updateGolden(dt: number): void {
    const update = this.golden.update(dt);
    if (update === 'appeared') this.events.push({ type: 'goldenAppeared' });
    if (update === 'left') this.events.push({ type: 'goldenLeft' });
  }
}
