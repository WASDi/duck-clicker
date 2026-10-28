export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 900;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', parent?: HTMLElement): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  parent?.append(element);
  return element;
}

/** Restarts a one-shot CSS animation class. */
export function replayClass(element: HTMLElement, className: string): void {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

/**
 * A fixed 1600×900 world scaled with a single transform to cover its container,
 * centered so narrow screens crop the sides.
 */
export class Playfield {
  readonly root: HTMLElement;
  readonly world: HTMLElement;
  readonly sceneLayer: HTMLElement;
  readonly fxLayer: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'field', parent);
    this.world = el('div', 'world', this.root);
    this.sceneLayer = el('div', 'scene-layer', this.world);
    this.fxLayer = el('div', 'fx-layer', this.world);
    new ResizeObserver(() => this.fit()).observe(this.root);
  }

  private fit(): void {
    const { clientWidth, clientHeight } = this.root;
    const scale = Math.max(clientWidth / WORLD_WIDTH, clientHeight / WORLD_HEIGHT);
    const x = (clientWidth - WORLD_WIDTH * scale) / 2;
    const y = (clientHeight - WORLD_HEIGHT * scale) / 2;
    this.world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
}
