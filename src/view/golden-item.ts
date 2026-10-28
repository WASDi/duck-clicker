import type { Golden } from '../sim/golden';
import type { Point } from './duck';
import { el, WORLD_WIDTH } from './playfield';

const SIZE = 130;
const TOP = 180;
const BOTTOM = 720;

/** The Golden Item drifting across the screen on a straight line. */
export class GoldenItem {
  private readonly el: HTMLElement;
  private position: Point = { x: 0, y: 0 };

  constructor(layer: HTMLElement, onClick: (at: Point) => void) {
    this.el = el('div', 'golden hidden', layer);
    el('div', 'golden-img', this.el);
    this.el.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      onClick(this.position);
    });
  }

  setSprite(variable: string): void {
    this.el.style.setProperty('--sprite', `var(${variable})`);
  }

  update(golden: Golden): void {
    this.el.classList.toggle('hidden', !golden.visible);
    if (!golden.visible) return;
    const { fromLeft, startY, endY } = golden.path;
    const t = golden.progress;
    const startX = fromLeft ? -SIZE : WORLD_WIDTH + SIZE;
    const endX = fromLeft ? WORLD_WIDTH + SIZE : -SIZE;
    const y0 = TOP + startY * (BOTTOM - TOP);
    const y1 = TOP + endY * (BOTTOM - TOP);
    this.position = { x: startX + (endX - startX) * t, y: y0 + (y1 - y0) * t };
    this.el.style.transform = `translate(${this.position.x - SIZE / 2}px, ${this.position.y - SIZE / 2}px)`;
  }
}
