import { COMPLETION_INDEX, LEVELS } from '../sim/data';
import type { Game } from '../sim/game';
import type { Point } from './duck';
import { Flock, type DuckClickHandler } from './flock';
import { LEVEL_LOOKS, type PropPlacement } from './levels';
import { Nest, placeSprite } from './nest';
import { el, replayClass } from './playfield';

const HATCHERY_INDEX = 1;

/** Everything drawn for one level: background, scenery, props, the nest and the flock. */
export class LevelScene {
  readonly root: HTMLElement;
  readonly flock: Flock;
  readonly nest: Nest;
  private readonly props: HTMLElement[] = [];

  constructor(readonly levelIndex: number, onDuckClick: DuckClickHandler) {
    const level = LEVELS[levelIndex];
    const look = LEVEL_LOOKS[level.id];
    this.root = el('div', `scene scene-${level.id}`);
    el('div', 'scene-bg', this.root);
    look.scenery(this.root);
    look.props.forEach((placement, i) => {
      if (i !== HATCHERY_INDEX) this.props[i] = this.createProp(placement);
    });
    const nestPlacement = look.props[HATCHERY_INDEX];
    this.nest = new Nest(this.root, look.egg, nestPlacement.sprite, nestPlacement, nestPlacement.size);
    this.props[HATCHERY_INDEX] = this.nest.el;
    this.flock = new Flock(this.root, look.behavior(this.root), onDuckClick);
  }

  get completionProp(): HTMLElement {
    return this.props[COMPLETION_INDEX];
  }

  /** Shows the current state without animations, e.g. at level start or after a debug jump. */
  restore(game: Game): void {
    game.purchases.forEach((count, i) => {
      if (count > 0) this.showProp(i, false);
    });
    this.nest.setEggCount(game.hatcheryPurchases);
    this.flock.fill(game.ducks);
  }

  applyPurchase(index: number, count: number): void {
    this.showProp(index, true);
    if (index === HATCHERY_INDEX) this.nest.setEggCount(count);
  }

  hatch(count: number): void {
    this.nest.hatch(count, (at: Point) => this.flock.add(at));
  }

  update(dt: number, game: Game): void {
    this.flock.update(dt);
    const purchases = game.hatcheryPurchases;
    this.nest.update(game.hatchery.progress(purchases), game.hatchery.secondsUntilHatch(purchases));
  }

  private showProp(index: number, pop: boolean): void {
    if (index === HATCHERY_INDEX) {
      this.nest.show(pop);
      return;
    }
    const prop = this.props[index];
    prop.classList.remove('hidden');
    if (pop) replayClass(prop, 'pop');
  }

  private createProp(placement: PropPlacement): HTMLElement {
    const z = placement.z ?? placement.y;
    if (placement.onCloud) {
      const cloud = el('div', 'prop-cloud', this.root);
      placeSprite(cloud, placement.x, placement.y + 40, placement.size * 1.4, placement.size * 1.4 * (450 / 768));
      cloud.style.zIndex = String(z - 1);
    }
    const prop = el('div', 'prop hidden', this.root);
    prop.style.setProperty('--sprite', `var(${placement.sprite})`);
    placeSprite(prop, placement.x, placement.y, placement.size, placement.size);
    prop.style.zIndex = String(z);
    return prop;
  }
}
