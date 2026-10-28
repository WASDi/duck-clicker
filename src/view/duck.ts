import type { DuckColor } from '../core/assets';
import { el, replayClass } from './playfield';

export type DuckPose = 'sit' | 'fly' | 'astro';

export interface Point {
  x: number;
  y: number;
}

const spritesByHitArea = new WeakMap<Element, DuckSprite>();

/** The duck whose hit area is `element`, if any. */
export function duckForHitArea(element: Element): DuckSprite | undefined {
  return spritesByHitArea.get(element);
}

/**
 * One duck element, anchored at its bottom center. Layers: body (static, can be masked at a
 * waterline), bob (ambient motion), hop (click squash), flip (facing), image (pose frames).
 */
export class DuckSprite {
  readonly el: HTMLElement;
  readonly body: HTMLElement;
  readonly bob: HTMLElement;
  x = 0;
  y = 0;
  scale = 1;
  /** Added to the depth order, which otherwise follows y (lower on screen is in front). */
  depthOffset = 0;
  private readonly hopper: HTMLElement;
  private readonly flip: HTMLElement;
  private readonly image: HTMLElement;
  private facingLeft = false;
  private placed = false;
  private zIndex: number | null = null;

  constructor(parent: HTMLElement, readonly color: DuckColor, pose: DuckPose) {
    this.el = el('div', 'duck', parent);
    this.el.dataset.color = color;
    this.body = el('div', 'duck-body', this.el);
    this.bob = el('div', 'duck-bob', this.body);
    this.bob.style.animationDelay = `${-Math.random() * 4}s`;
    this.hopper = el('div', 'duck-hop', this.bob);
    this.flip = el('div', 'duck-flip', this.hopper);
    this.image = el('div', 'duck-img', this.flip);
    spritesByHitArea.set(el('div', 'duck-hit', this.el), this);
    this.setPose(pose);
  }

  setPose(pose: DuckPose): void {
    this.image.dataset.pose = pose;
    this.el.dataset.pose = pose;
  }

  face(left: boolean): void {
    if (left === this.facingLeft) return;
    this.facingLeft = left;
    this.flip.classList.toggle('left', left);
  }

  faceTowards(x: number): void {
    if (Math.abs(x - this.x) > 1) this.face(x < this.x);
  }

  /** Skips unchanged writes; a new z-index restacks the layer, so it is only set when it changes. */
  moveTo(x: number, y: number, scale = this.scale): void {
    if (this.placed && x === this.x && y === this.y && scale === this.scale) return;
    this.placed = true;
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    const zIndex = Math.round(y) + this.depthOffset;
    if (zIndex === this.zIndex) return;
    this.zIndex = zIndex;
    this.el.style.zIndex = String(zIndex);
  }

  /** Squash-and-stretch hop after a click. */
  hop(): void {
    replayClass(this.hopper, 'hop');
  }

  /** Pop in with a squash-and-stretch bounce, for a freshly hatched duck. */
  popIn(): void {
    replayClass(this.hopper, 'pop-in');
  }

  /** Occasional idle gesture: a head tilt or a small hop. */
  fidget(): void {
    replayClass(this.hopper, Math.random() < 0.5 ? 'tilt' : 'small-hop');
  }

  remove(): void {
    this.el.remove();
  }
}
