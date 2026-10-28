import { DUCK_COLORS } from '../core/assets';
import type { LevelId } from '../sim/data';
import { DuckSprite } from './duck';
import { el, FOCUS_X, WORLD_HEIGHT } from './playfield';
import type { LevelScene } from './scene';
import { tween, wait } from './tween';

const LIFT_SECONDS = 1.3;
const SLIDE_SECONDS = 2.2;
const TRAVELLERS = 9;

/** Pond: the flock lifts off straight up. */
async function liftOff(scene: LevelScene): Promise<void> {
  const ducks = scene.flock.sprites.map((duck) => ({ duck, x: duck.x, y: duck.y, delay: Math.random() * 0.3 }));
  ducks.forEach(({ duck }) => duck.setPose('fly'));
  await tween(LIFT_SECONDS, (t) => {
    for (const { duck, x, y, delay } of ducks) {
      const local = Math.max(0, (t - delay) / (1 - delay));
      duck.moveTo(x, y - local * (y + 200));
    }
  });
}

/** Sky: the flock flies into the gate and through it. */
async function throughGate(scene: LevelScene): Promise<void> {
  const gate = { x: FOCUS_X, y: 470 };
  const ducks = scene.flock.sprites.map((duck) => ({ duck, x: duck.x, y: duck.y, s: duck.scale, delay: Math.random() * 0.4 }));
  ducks.forEach(({ duck }) => {
    duck.setPose('fly');
    duck.faceTowards(gate.x);
  });
  await tween(LIFT_SECONDS, (t) => {
    for (const { duck, x, y, s, delay } of ducks) {
      const local = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
      duck.moveTo(x + (gate.x - x) * local, y + (gate.y - y) * local, s * (1 - local * 0.9));
    }
  });
  ducks.forEach(({ duck }) => duck.el.classList.add('hidden'));
}

/** A small V of flying ducks travelling up the screen while the backgrounds slide. */
function travellers(layer: HTMLElement): HTMLElement {
  const group = el('div', 'travellers', layer);
  for (let i = 0; i < TRAVELLERS; i++) {
    const color = i === 0 ? 'white' : DUCK_COLORS[Math.floor(Math.random() * DUCK_COLORS.length)];
    const duck = new DuckSprite(group, color, 'fly');
    const side = i % 2 === 0 ? 1 : -1;
    const rank = Math.ceil(i / 2);
    duck.moveTo(FOCUS_X + side * rank * 90, rank * 70, 0.4);
  }
  return group;
}

/**
 * Plays the end-of-level sequence: the flock leaves, then the old and new scenes slide down
 * together (the camera rises) while a V of ducks flies up.
 */
export async function playLevelTransition(from: LevelId, oldScene: LevelScene, newScene: LevelScene, layer: HTMLElement, fxLayer: HTMLElement): Promise<void> {
  await wait(0.6);
  await (from === 'pond' ? liftOff(oldScene) : throughGate(oldScene));

  layer.append(newScene.root);
  const group = travellers(fxLayer);
  await tween(SLIDE_SECONDS, (t) => {
    const offset = t * WORLD_HEIGHT;
    oldScene.root.style.transform = `translateY(${offset}px)`;
    newScene.root.style.transform = `translateY(${offset - WORLD_HEIGHT}px)`;
    group.style.transform = `translateY(${WORLD_HEIGHT + 150 - t * (WORLD_HEIGHT + 500)}px)`;
  });
  oldScene.root.remove();
  newScene.root.style.transform = '';
  group.remove();
}
