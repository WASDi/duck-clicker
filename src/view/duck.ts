import type { DuckColor } from '../core/assets';
import { el, replayClass } from './playfield';

export type DuckPose = 'sit' | 'fly' | 'astro';

export interface Point {
  x: number;
  y: number;
}

/**
 * One duck element, anchored at its bottom center. Layers: bob (ambient motion),
 * hop (click squash), flip (facing), image (pose frames).
 */
export class DuckSprite {
  readonly el: HTMLElement;
  readonly bob: HTMLElement;
  x = 0;
  y = 0;
  scale = 1;
  private readonly hopper: HTMLElement;
  private readonly flip: HTMLElement;
  private readonly image: HTMLElement;
  private facingLeft = false;

  constructor(parent: HTMLElement, readonly color: DuckColor, pose: DuckPose, onClick: (duck: DuckSprite, event: PointerEvent) => void) {
    this.el = el('div', 'duck', parent);
    this.el.dataset.color = color;
    this.bob = el('div', 'duck-bob', this.el);
    this.bob.style.animationDelay = `${-Math.random() * 4}s`;
    this.hopper = el('div', 'duck-hop', this.bob);
    this.flip = el('div', 'duck-flip', this.hopper);
    this.image = el('div', 'duck-img', this.flip);
    const hit = el('div', 'duck-hit', this.bob);
    hit.addEventListener('pointerdown', (event) => onClick(this, event));
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

  moveTo(x: number, y: number, scale = this.scale): void {
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    this.el.style.zIndex = String(Math.round(y));
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
