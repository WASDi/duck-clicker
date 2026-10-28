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

/** World x the level scenes center their content on. */
export const FOCUS_X = 680;

/**
 * A fixed 1600×900 world scaled with a single transform to cover its container. The world shifts
 * sideways as far as it can while still covering, so `focusX` sits in the middle of the part not
 * covered by the occluder (a panel over the right side, e.g. the shop on desktop).
 */
export class Playfield {
  readonly root: HTMLElement;
  readonly world: HTMLElement;
  readonly sceneLayer: HTMLElement;
  readonly fxLayer: HTMLElement;
  private occluder: HTMLElement | null = null;
  private readonly observer = new ResizeObserver(() => this.fit());

  constructor(
    private readonly parent: HTMLElement,
    private readonly focusX = WORLD_WIDTH / 2,
  ) {
    this.root = el('div', 'field', parent);
    this.world = el('div', 'world', this.root);
    this.sceneLayer = el('div', 'scene-layer', this.world);
    this.fxLayer = el('div', 'fx-layer', this.world);
    this.observer.observe(this.root);
  }

  /** A panel drawn over the right side of the field, e.g. the shop on desktop. */
  setOccluder(element: HTMLElement): void {
    this.occluder = element;
    this.observer.observe(element);
  }

  private fit(): void {
    const { clientWidth, clientHeight } = this.root;
    const covered = this.coveredRight();
    const scale = Math.max(clientWidth / WORLD_WIDTH, clientHeight / WORLD_HEIGHT);
    const minX = clientWidth - WORLD_WIDTH * scale;
    const x = Math.min(0, Math.max(minX, (clientWidth - covered) / 2 - this.focusX * scale));
    const y = (clientHeight - WORLD_HEIGHT * scale) / 2;
    this.world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    this.parent.style.setProperty('--covered-right', `${covered}px`);
  }

  /** Width of the field covered by the occluder on its right side. */
  private coveredRight(): number {
    if (!this.occluder) return 0;
    const field = this.root.getBoundingClientRect();
    const panel = this.occluder.getBoundingClientRect();
    const overlapsVertically = panel.top < field.bottom && panel.bottom > field.top;
    const onRightSide = panel.left > field.left + field.width / 2;
    return overlapsVertically && onRightSide ? Math.max(0, field.right - panel.left) : 0;
  }
}
