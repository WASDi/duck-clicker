import { DUCK_COLORS, type DuckColor } from '../core/assets';
import { DuckSprite, type DuckPose, type Point } from './duck';

/** Individually animated ducks; beyond this, ducks are drawn small in rows farther back. */
export const FRONT_DUCKS = 60;
/** Lifts front ducks above every prop, nest and cloud, which are ordered by y within the 900 px world. */
const FRONT_DEPTH_OFFSET = 1000;
const MAX_DRAWN_DUCKS = 180;

export interface Slot extends Point {
  scale: number;
}

/** How the ducks of one level move. Each duck gets its own state object. */
export interface DuckBehavior<S = unknown> {
  readonly pose: DuckPose;
  /** Adds level-specific parts to a duck, e.g. the pond water strip. */
  decorate?(duck: DuckSprite): void;
  /** Places a new front duck. `origin` is where a hatched duck appears. */
  spawn(duck: DuckSprite, index: number, origin?: Point): S;
  update(duck: DuckSprite, state: S, dt: number): void;
  backSlot(index: number): Slot;
  /** Back-row pose, when it differs from the front pose. */
  readonly backPose?: DuckPose;
}

interface FlockDuck {
  sprite: DuckSprite;
  state: unknown;
}

export class Flock {
  private readonly front: FlockDuck[] = [];
  private readonly back: DuckSprite[] = [];

  constructor(
    private readonly layer: HTMLElement,
    private readonly behavior: DuckBehavior,
  ) {}

  get drawnCount(): number {
    return this.front.length + this.back.length;
  }

  get sprites(): DuckSprite[] {
    return [...this.front.map((d) => d.sprite), ...this.back];
  }

  /** Adds one duck. Hatched ducks pass the egg position as their origin. */
  add(origin?: Point): void {
    if (this.drawnCount >= MAX_DRAWN_DUCKS) return;
    const color: DuckColor = this.drawnCount === 0 ? 'white' : DUCK_COLORS[Math.floor(Math.random() * DUCK_COLORS.length)];
    if (this.front.length < FRONT_DUCKS) this.addFront(color, origin);
    else this.addBack(color);
  }

  /** Adds ducks until `count` are present, without hatch animations. */
  fill(count: number): void {
    while (this.drawnCount < Math.min(count, MAX_DRAWN_DUCKS)) this.add();
  }

  update(dt: number): void {
    for (const duck of this.front) this.behavior.update(duck.sprite, duck.state, dt);
  }

  private addFront(color: DuckColor, origin?: Point): void {
    const sprite = new DuckSprite(this.layer, color, this.behavior.pose);
    sprite.depthOffset = FRONT_DEPTH_OFFSET;
    this.behavior.decorate?.(sprite);
    const state = this.behavior.spawn(sprite, this.front.length, origin);
    if (origin) sprite.popIn();
    this.front.push({ sprite, state });
  }

  private addBack(color: DuckColor): void {
    const sprite = new DuckSprite(this.layer, color, this.behavior.backPose ?? this.behavior.pose);
    sprite.el.classList.add('far');
    const slot = this.behavior.backSlot(this.back.length);
    sprite.face(Math.random() < 0.5);
    sprite.moveTo(slot.x, slot.y, slot.scale);
    this.back.push(sprite);
  }
}
