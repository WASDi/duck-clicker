import { el } from './playfield';

const SPARKLE_BITS = 10;

function removeAfterAnimation(element: HTMLElement): void {
  element.addEventListener('animationend', () => element.remove(), { once: true });
}

/** A "+N" number rising in a straight line, fading only at the very end. */
export function floatNumber(layer: HTMLElement, x: number, y: number, text: string, big = false): void {
  const number = el('div', big ? 'float-num big' : 'float-num', layer);
  number.textContent = text;
  number.style.left = `${x}px`;
  number.style.top = `${y}px`;
  removeAfterAnimation(number);
}

/** Gold bits bursting outward on straight lines. */
export function sparkle(layer: HTMLElement, x: number, y: number): void {
  const burst = el('div', 'sparkle', layer);
  burst.style.left = `${x}px`;
  burst.style.top = `${y}px`;
  for (let i = 0; i < SPARKLE_BITS; i++) {
    const angle = (i / SPARKLE_BITS) * Math.PI * 2;
    const distance = 90 + (i % 2) * 50;
    const bit = el('i', '', burst);
    bit.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    bit.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
  }
  window.setTimeout(() => burst.remove(), 700);
}
