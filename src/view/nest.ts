import type { Point } from './duck';
import { el, replayClass } from './playfield';

export type EggKind = 'reed' | 'cloud' | 'pod';

const EGG_SPACING_MS = 100;
const CRACK_MS = 150;
const REFILL_MS = 450;
const WOBBLE_SECONDS = 2;

/** Egg spots relative to the nest's bottom center: a back row and a front row of five. */
const EGG_SPOTS: readonly Point[] = [
  ...[-64, -32, 0, 32, 64].map((x) => ({ x, y: -78 })),
  ...[-48, -16, 16, 48, 80].map((x) => ({ x: x - 16, y: -58 })),
];

/** Places a sprite element with its bottom center at (x, y). */
export function placeSprite(element: HTMLElement, x: number, y: number, width: number, height: number): void {
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.left = `${x - width / 2}px`;
  element.style.top = `${y - height}px`;
}

/** The hatchery prop: one egg per purchase, a timer ring, and the hatch animation. */
export class Nest {
  readonly el: HTMLElement;
  private readonly eggLayer: HTMLElement;
  private readonly ring: HTMLElement;
  private eggs: HTMLElement[] = [];
  private eggCount = 0;
  private hatching = false;

  constructor(
    private readonly parent: HTMLElement,
    private readonly egg: EggKind,
    sprite: string,
    private readonly at: Point,
    size: number,
  ) {
    this.el = el('div', 'prop nest hidden', parent);
    this.el.style.setProperty('--sprite', `var(${sprite})`);
    placeSprite(this.el, at.x, at.y, size, size);
    this.el.style.zIndex = String(at.y);
    this.eggLayer = el('div', 'egg-layer', parent);
    this.eggLayer.style.zIndex = String(at.y + 1);
    this.ring = el('div', 'hatch-ring hidden', parent);
    this.ring.style.left = `${at.x + size * 0.36}px`;
    this.ring.style.top = `${at.y - size * 0.95}px`;
    this.ring.style.zIndex = String(at.y + 2);
  }

  show(pop: boolean): void {
    this.el.classList.remove('hidden');
    this.ring.classList.remove('hidden');
    if (pop) replayClass(this.el, 'pop');
  }

  setEggCount(count: number): void {
    this.eggCount = count;
    if (!this.hatching) this.layEggs();
  }

  /** Timer ring fill and the wobble during the last 2 seconds. */
  update(progress: number, secondsLeft: number): void {
    this.ring.style.setProperty('--p', String(Math.min(progress, 1)));
    this.eggLayer.classList.toggle('wobble', !this.hatching && secondsLeft <= WOBBLE_SECONDS);
  }

  /** Cracks the eggs one after another; `onHatch` receives each egg's position. */
  hatch(count: number, onHatch: (at: Point, index: number) => void): void {
    this.hatching = true;
    this.eggLayer.classList.remove('wobble');
    for (let i = 0; i < count; i++) {
      const egg = this.eggs[i];
      const spot = this.eggSpot(i);
      window.setTimeout(() => {
        egg?.classList.add('cracked');
        window.setTimeout(() => {
          egg?.classList.add('gone');
          this.dropShells(spot);
          onHatch(spot, i);
        }, CRACK_MS);
      }, i * EGG_SPACING_MS);
    }
    window.setTimeout(() => {
      this.hatching = false;
      this.layEggs();
    }, count * EGG_SPACING_MS + CRACK_MS + REFILL_MS);
  }

  private layEggs(): void {
    this.eggs.forEach((egg) => egg.remove());
    this.eggs = Array.from({ length: Math.min(this.eggCount, EGG_SPOTS.length) }, (_, i) => {
      const spot = this.eggSpot(i);
      const egg = el('div', `egg egg-${this.egg}`, this.eggLayer);
      placeSprite(egg, spot.x, spot.y, 46, 46);
      egg.style.animationDelay = `${-i * 0.07}s`;
      return egg;
    });
  }

  private eggSpot(index: number): Point {
    const spot = EGG_SPOTS[index % EGG_SPOTS.length];
    return { x: this.at.x + spot.x, y: this.at.y + spot.y };
  }

  private dropShells(at: Point): void {
    for (const half of ['top', 'bottom'] as const) {
      const shell = el('div', `shell egg-${this.egg} shell-${half}`, this.parent);
      placeSprite(shell, at.x, at.y, 46, 46);
      shell.style.zIndex = String(this.at.y + 3);
      shell.addEventListener('animationend', () => shell.remove());
    }
  }
}
