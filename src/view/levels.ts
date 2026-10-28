import type { LevelId } from '../sim/data';
import { PondBehavior, SkyBehavior, SpaceBehavior } from './behaviors';
import type { DuckBehavior } from './flock';
import { placeSprite, type EggKind } from './nest';
import { el } from './playfield';

export interface PropPlacement {
  sprite: string;
  x: number;
  y: number;
  size: number;
  /** Stacking order; defaults to y (lower on screen is in front). */
  z?: number;
  /** Draws a small cloud under the prop (Sky). */
  onCloud?: boolean;
}

export interface LevelLook {
  /** One per upgrade, in upgrade order. Index 1 is the hatchery nest. */
  props: readonly PropPlacement[];
  egg: EggKind;
  goldenSprite: string;
  behavior: (layer: HTMLElement) => DuckBehavior;
  scenery: (layer: HTMLElement) => void;
}

function sprite(layer: HTMLElement, name: string, x: number, y: number, size: number, className = ''): HTMLElement {
  const element = el('div', `scenery ${className}`, layer);
  element.style.setProperty('--sprite', `var(${name})`);
  placeSprite(element, x, y, size, size);
  element.style.zIndex = String(y);
  return element;
}

function drifter(layer: HTMLElement, name: string, y: number, size: number, seconds: number, delay: number, className = ''): void {
  const element = sprite(layer, name, 0, y, size, `drift ${className}`);
  element.style.left = `${-size}px`;
  element.style.animationDuration = `${seconds}s`;
  element.style.animationDelay = `${-delay}s`;
  element.style.zIndex = '1';
}

function twinkles(layer: HTMLElement, count: number): void {
  for (let i = 0; i < count; i++) {
    const star = el('i', 'twinkle', layer);
    star.style.left = `${Math.random() * 1600}px`;
    star.style.top = `${Math.random() * 900}px`;
    star.style.animationDelay = `${-Math.random() * 3}s`;
    star.style.animationDuration = `${1.5 + Math.random() * 2}s`;
  }
}

export const LEVEL_LOOKS: Record<LevelId, LevelLook> = {
  pond: {
    props: [
      { sprite: '--img-pond-bread-conveyor', x: 600, y: 285, size: 200 },
      { sprite: '--img-pond-reed-nursery', x: 320, y: 570, size: 220 },
      { sprite: '--img-pond-duckweed-farm', x: 1280, y: 580, size: 210 },
      { sprite: '--img-pond-worm-shower', x: 1020, y: 275, size: 190 },
      { sprite: '--img-pond-flight', x: 330, y: 895, size: 300 },
    ],
    egg: 'reed',
    goldenSprite: '--img-pond-bread',
    behavior: () => new PondBehavior(),
    scenery: (layer) => {
      sprite(layer, '--img-pond-lily-pad', 500, 880, 120, 'flat');
      sprite(layer, '--img-pond-lily-pad', 1180, 860, 110, 'flat');
      sprite(layer, '--img-pond-lily-pad', 1420, 720, 130, 'flat');
      sprite(layer, '--img-pond-reed-clump', 130, 470, 230);
      sprite(layer, '--img-pond-reed-clump', 1490, 450, 230, 'flipped');
    },
  },
  sky: {
    props: [
      { sprite: '--img-sky-crumb-cannon', x: 300, y: 790, size: 190, onCloud: true },
      { sprite: '--img-sky-cloud-incubator', x: 290, y: 480, size: 220 },
      { sprite: '--img-sky-v-formation', x: 1300, y: 300, size: 170 },
      { sprite: '--img-sky-insect-swarm-net', x: 1310, y: 800, size: 190, onCloud: true },
      { sprite: '--img-sky-stratosphere-gate', x: 800, y: 700, size: 520, z: 5 },
    ],
    egg: 'cloud',
    goldenSprite: '--img-sky-small-cloud',
    behavior: (layer) => new SkyBehavior(layer),
    scenery: (layer) => {
      drifter(layer, '--img-sky-small-cloud', 140, 140, 90, 10, 'far');
      drifter(layer, '--img-sky-small-cloud', 250, 100, 120, 70, 'far');
      drifter(layer, '--img-sky-cloud', 200, 260, 150, 40, 'far');
      drifter(layer, '--img-sky-balloon', 260, 130, 110, 20);
      drifter(layer, '--img-sky-kite', 160, 110, 80, 55, 'reverse');
    },
  },
  space: {
    props: [
      { sprite: '--img-space-starseed-feeder', x: 330, y: 390, size: 190 },
      { sprite: '--img-space-zero-g-egg-pod', x: 320, y: 790, size: 220 },
      { sprite: '--img-space-orbital-duckweed-garden', x: 1280, y: 390, size: 200 },
      { sprite: '--img-space-quasar-core', x: 1280, y: 780, size: 190 },
      { sprite: '--img-space-galactic-beacon', x: 800, y: 640, size: 440, z: 5 },
    ],
    egg: 'pod',
    goldenSprite: '--img-space-star',
    behavior: () => new SpaceBehavior(),
    scenery: (layer) => {
      twinkles(layer, 40);
      drifter(layer, '--img-space-asteroid', 180, 120, 140, 30);
      drifter(layer, '--img-space-asteroid', 820, 90, 170, 110, 'reverse');
      drifter(layer, '--img-space-satellite', 120, 130, 120, 80, 'reverse');
    },
  },
};
