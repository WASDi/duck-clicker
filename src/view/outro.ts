import { DUCK_COLORS } from '../core/assets';
import { DuckSprite, type Point } from './duck';
import { placeSprite } from './nest';
import { el, Playfield, replayClass, WORLD_HEIGHT } from './playfield';

// Scene times from docs/Gameplay.md §6.
const SCENE = { flight: 6, landfall: 20, colony: 32, pullBack: 46, message: 58, end: 68 } as const;

const MAX_FRAME_SECONDS = 0.1;
const DISH: Point = { x: 800, y: 430 };
const BEAM_ANGLE = -29;
const BEAM_DIR: Point = { x: Math.cos((BEAM_ANGLE * Math.PI) / 180), y: Math.sin((BEAM_ANGLE * Math.PI) / 180) };
const CAMERA_SPEED = 200;
const LEADER_DISTANCE = 140;
const FLOCK_SIZE = 9;
/** Offsets and parallax depths of the three star-dot layers in outro.css. */
const STAR_LAYERS = [{ x: 0, y: 0, depth: 0.4 }, { x: 80, y: 60, depth: 0.7 }, { x: 150, y: 20, depth: 1 }];
const MOON_TOP = 360;
const MOON_LEFT = 300;
const MOON_SIZE = 1000;
const LANDING_SPOTS: readonly Point[] = [
  { x: 640, y: 520 }, { x: 560, y: 545 }, { x: 960, y: 520 }, { x: 480, y: 580 }, { x: 1040, y: 545 },
  { x: 410, y: 630 }, { x: 1120, y: 585 }, { x: 1190, y: 640 }, { x: 870, y: 505 },
];
const POND_SPOTS: readonly Point[] = [
  { x: 720, y: 600 }, { x: 640, y: 615 }, { x: 900, y: 600 }, { x: 600, y: 650 }, { x: 960, y: 640 },
  { x: 700, y: 665 }, { x: 860, y: 670 }, { x: 790, y: 690 }, { x: 800, y: 620 },
];
const EGG_SPOTS: readonly Point[] = [{ x: 470, y: 690 }, { x: 560, y: 720 }, { x: 1040, y: 720 }, { x: 1130, y: 690 }, { x: 800, y: 760 }];
const DOME_SPOTS: readonly Point[] = [{ x: 380, y: 760 }, { x: 1220, y: 760 }, { x: 680, y: 800 }];
const FLIGHT_PROPS: readonly { sprite: string; distance: number; side: number }[] = [
  { sprite: '--img-space-quasar-core', distance: 900, side: -260 },
  { sprite: '--img-space-orbital-duckweed-garden', distance: 1600, side: 280 },
  { sprite: '--img-space-starseed-feeder', distance: 2300, side: -270 },
];

export const OUTRO_MESSAGE = 'One small quack for a duck.\nOne giant waddle for duckkind.';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Linear progress of t through [start, end]. */
function phase(t: number, start: number, end: number): number {
  return clamp01((t - start) / (end - start));
}

function lerpPoint(a: Point, b: Point, k: number): Point {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

/** Converts world coordinates to the moon element's own coordinates. */
function onMoon(at: Point): Point {
  return { x: at.x - MOON_LEFT, y: at.y - MOON_TOP };
}

function sprite(parent: HTMLElement, variable: string, className = ''): HTMLElement {
  const element = el('div', `outro-sprite ${className}`, parent);
  element.style.setProperty('--sprite', `var(${variable})`);
  return element;
}

function setPosition(element: HTMLElement, at: Point): void {
  element.style.transform = `translate(${at.x}px, ${at.y}px)`;
}

interface Cue {
  at: number;
  run: () => void;
  done?: boolean;
}

export interface OutroAudio {
  position(): number | null;
  sfx(name: string): void;
  quack(): void;
}

/** The 68-second ending, computed from the outro music's playback position. */
export class Outro {
  private readonly root: HTMLElement;
  private readonly camera: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly shaker: HTMLElement;
  private readonly stars: HTMLElement;
  private readonly beacon: HTMLElement;
  private readonly beam: HTMLElement;
  private readonly moon: HTMLElement;
  private readonly flag: HTMLElement;
  private readonly fade: HTMLElement;
  private readonly message: HTMLElement;
  private readonly flightProps: HTMLElement[];
  private readonly eggs: HTMLElement[];
  private readonly domes: HTMLElement[];
  private readonly flock: DuckSprite[];
  private readonly ducklings: DuckSprite[];
  private readonly cues: Cue[];
  private time = 0;
  private lastFrame: number | null = null;

  constructor(parent: HTMLElement, private readonly audio: OutroAudio) {
    this.root = el('div', 'outro', parent);
    const field = new Playfield(this.root);
    this.camera = el('div', 'outro-camera', field.sceneLayer);
    this.stage = el('div', 'outro-panel outro-stage', this.camera);
    el('div', 'outro-space-bg', this.stage);
    this.stars = el('div', 'outro-stars', this.stage);
    this.shaker = el('div', 'outro-shaker', this.stage);
    el('div', 'outro-panel outro-sky', this.camera).style.top = `${WORLD_HEIGHT}px`;
    const pond = el('div', 'outro-panel outro-pond', this.camera);
    pond.style.top = `${WORLD_HEIGHT * 2}px`;
    const bread = sprite(pond, '--img-pond-bread', 'outro-bread');
    placeSprite(bread, 800, 640, 130, 130);

    this.beam = el('div', 'outro-beam', this.shaker);
    this.beacon = sprite(this.shaker, '--img-space-galactic-beacon', 'outro-beacon');
    placeSprite(this.beacon, DISH.x, 900, 480, 480);
    this.flightProps = FLIGHT_PROPS.map((p) => sprite(this.shaker, p.sprite, 'outro-flight-prop'));
    this.moon = sprite(this.shaker, '--img-outro-moon', 'outro-moon');
    placeSprite(this.moon, MOON_LEFT + MOON_SIZE / 2, MOON_TOP + MOON_SIZE, MOON_SIZE, MOON_SIZE);
    this.domes = DOME_SPOTS.map((spot) => {
      const dome = sprite(this.moon, '--img-outro-dome-off', 'outro-dome hidden');
      const at = onMoon(spot);
      placeSprite(dome, at.x, at.y, 170, 170);
      return dome;
    });
    this.eggs = EGG_SPOTS.map((spot) => {
      const egg = el('div', 'egg egg-pod glowing hidden', this.moon);
      const at = onMoon(spot);
      placeSprite(egg, at.x, at.y, 60, 60);
      return egg;
    });
    this.flag = sprite(this.moon, '--img-outro-flag', 'outro-flag hidden');
    const flagAt = onMoon({ x: 760, y: 525 });
    placeSprite(this.flag, flagAt.x, flagAt.y, 150, 150);

    const flockLayer = el('div', 'outro-flock', this.shaker);
    this.flock = Array.from({ length: FLOCK_SIZE }, (_, i) => {
      const color = i === 0 ? 'white' : DUCK_COLORS[i % DUCK_COLORS.length];
      return new DuckSprite(flockLayer, color, 'astro', () => {});
    });
    this.ducklings = EGG_SPOTS.map((_, i) => {
      const duckling = new DuckSprite(flockLayer, DUCK_COLORS[(i + 1) % DUCK_COLORS.length], 'astro', () => {});
      duckling.el.classList.add('hidden');
      return duckling;
    });

    this.fade = el('div', 'outro-fade', this.root);
    this.message = el('p', 'outro-message hidden', this.root);
    this.message.textContent = OUTRO_MESSAGE;
    this.cues = this.createCues();
  }

  start(): void {
    requestAnimationFrame(this.frame);
  }

  /** Follows the music position; without audible music, advances with the frame clock. */
  private frame = (now: number): void => {
    const frameSeconds = this.lastFrame === null ? 0 : Math.min((now - this.lastFrame) / 1000, MAX_FRAME_SECONDS);
    this.lastFrame = now;
    this.time = this.audio.position() ?? this.time + frameSeconds;
    this.render(this.time);
    if (this.time < SCENE.end) requestAnimationFrame(this.frame);
  };

  private createCues(): Cue[] {
    const cues: Cue[] = [
      { at: 0, run: () => this.audio.sfx('beacon') },
      { at: 0.3, run: () => this.beacon.style.setProperty('--sprite', 'var(--img-space-galactic-beacon-lit)') },
      { at: 28.3, run: () => { this.flag.classList.remove('hidden'); replayClass(this.flag, 'pop'); } },
      { at: 29, run: () => { this.audio.quack(); this.flock[0].hop(); } },
      { at: SCENE.message + 2.5, run: () => this.message.classList.remove('hidden') },
    ];
    this.eggs.forEach((egg, i) => {
      cues.push({ at: SCENE.colony + 0.3 * i, run: () => { egg.classList.remove('hidden'); replayClass(egg, 'pop'); } });
      cues.push({ at: SCENE.colony + 2.5 + 0.6 * i, run: () => this.hatchEgg(i) });
    });
    this.domes.forEach((dome, i) => {
      cues.push({ at: SCENE.colony + 0.5 + 0.4 * i, run: () => { dome.classList.remove('hidden'); replayClass(dome, 'pop'); } });
      cues.push({ at: SCENE.colony + 6 + 0.6 * i, run: () => dome.style.setProperty('--sprite', 'var(--img-outro-dome-on)') });
    });
    return cues;
  }

  private hatchEgg(index: number): void {
    const egg = this.eggs[index];
    egg.classList.add('cracked');
    window.setTimeout(() => {
      egg.classList.add('gone');
      const spot = EGG_SPOTS[index];
      const local = onMoon(spot);
      for (const half of ['top', 'bottom'] as const) {
        const shell = el('div', `shell egg-pod shell-${half}`, this.moon);
        placeSprite(shell, local.x, local.y, 60, 60);
        shell.addEventListener('animationend', () => shell.remove());
      }
      const duckling = this.ducklings[index];
      duckling.el.classList.remove('hidden');
      duckling.moveTo(spot.x, spot.y, 0.24);
      duckling.popIn();
    }, 150);
  }

  private render(t: number): void {
    for (const cue of this.cues) {
      if (!cue.done && t >= cue.at) {
        cue.done = true;
        cue.run();
      }
    }
    this.renderIgnition(t);
    const camera = Math.max(0, Math.min(t, SCENE.landfall) - SCENE.flight) * CAMERA_SPEED;
    this.renderFlight(t, camera);
    this.renderMoon(t);
    this.flock.forEach((duck, i) => this.renderFlockDuck(duck, i, t, camera));
    this.renderDucklings(t);
    this.renderPullBack(t);
    this.fade.style.opacity = String(phase(t, SCENE.message, SCENE.message + 2));
  }

  private renderIgnition(t: number): void {
    const beamLength = phase(t, 0.5, 2) * 4800;
    this.beam.style.width = `${beamLength}px`;
    this.beam.style.transform = `translate(${DISH.x}px, ${DISH.y}px) rotate(${BEAM_ANGLE}deg)`;
    this.beam.classList.toggle('hidden', t >= SCENE.landfall + 0.5);
    let shake: Point = { x: 0, y: 0 };
    if (t < SCENE.flight && t > 0.5) {
      const step = Math.floor(t / 0.08);
      const amplitude = 4 + 14 * (t / SCENE.flight);
      shake = { x: (((step * 7919) % 13) / 6 - 1) * amplitude, y: (((step * 104729) % 11) / 5 - 1) * amplitude };
    }
    setPosition(this.shaker, shake);
  }

  /** Scene 2: the camera travels along the beam, so the beam stays put while props pass. */
  private renderFlight(t: number, camera: number): void {
    const shift = { x: -BEAM_DIR.x * camera, y: -BEAM_DIR.y * camera };
    this.beacon.style.transform = `translate(${shift.x}px, ${shift.y}px)`;
    this.stars.style.backgroundPosition = STAR_LAYERS.map((layer) => `${layer.x + shift.x * layer.depth}px ${layer.y + shift.y * layer.depth}px`).join(', ');
    FLIGHT_PROPS.forEach((prop, i) => {
      const along = prop.distance - camera;
      const at = {
        x: DISH.x + BEAM_DIR.x * along - BEAM_DIR.y * prop.side,
        y: DISH.y + BEAM_DIR.y * along + BEAM_DIR.x * prop.side,
      };
      this.flightProps[i].style.transform = `translate(${at.x - 110}px, ${at.y - 110}px)`;
      this.flightProps[i].classList.toggle('hidden', t < SCENE.flight || t >= SCENE.landfall);
    });
  }

  /** Scene 3: the moon slides in from the right. */
  private renderMoon(t: number): void {
    const slide = 1 - phase(t, SCENE.landfall, SCENE.landfall + 3);
    this.moon.classList.toggle('hidden', t < SCENE.landfall);
    this.moon.style.transform = `translateX(${slide * 1400}px)`;
  }

  private renderFlockDuck(duck: DuckSprite, index: number, t: number, camera: number): void {
    const rank = Math.ceil(index / 2);
    const side = index % 2 === 0 ? 1 : -1;
    const leader = { x: DISH.x + BEAM_DIR.x * LEADER_DISTANCE, y: DISH.y + BEAM_DIR.y * LEADER_DISTANCE };
    // V-formation behind the leader, trailing back down the beam.
    const formation = {
      x: leader.x - BEAM_DIR.x * rank * 80 + side * BEAM_DIR.y * rank * 60,
      y: leader.y - BEAM_DIR.y * rank * 80 - side * BEAM_DIR.x * rank * 60 + 40,
    };
    duck.el.classList.toggle('hidden', t < SCENE.flight);
    duck.face(false);
    if (t < SCENE.landfall + 3) {
      const launch = phase(t, SCENE.flight + rank * 0.25, SCENE.flight + 2.5 + rank * 0.25);
      const start = { x: DISH.x - BEAM_DIR.x * camera, y: DISH.y - BEAM_DIR.y * camera + 40 };
      const at = lerpPoint(start, formation, launch);
      duck.moveTo(at.x, at.y, 0.32 * Math.max(launch, 0.2));
      return;
    }
    const landing = LANDING_SPOTS[index];
    const landed = lerpPoint(formation, landing, phase(t, SCENE.landfall + 3 + rank * 0.2, SCENE.landfall + 5.5 + rank * 0.2));
    if (index === 0) {
      // The White duck waddles to the water's edge.
      const edge = { x: 700, y: 540 };
      const walk = lerpPoint(landed, edge, phase(t, SCENE.landfall + 5.5, SCENE.landfall + 8));
      duck.el.classList.toggle('waddle', t > SCENE.landfall + 5.5 && t < SCENE.landfall + 8);
      duck.moveTo(walk.x, walk.y, 0.32);
      if (t >= SCENE.landfall + 5.5) duck.face(walk.x < landed.x);
      if (t < SCENE.colony + 9) return;
    }
    this.hopIntoPond(duck, index === 0 ? { x: 700, y: 540 } : landed, POND_SPOTS[index], t, SCENE.colony + 9 + index * 0.45);
  }

  /** Scene 4 ending: a simple arc into the moon's pond. */
  private hopIntoPond(duck: DuckSprite, from: Point, to: Point, t: number, start: number, scale = 0.32): void {
    const k = phase(t, start, start + 0.7);
    const at = lerpPoint(from, to, k);
    duck.moveTo(at.x, at.y - Math.sin(k * Math.PI) * 90, scale);
    duck.el.classList.toggle('swimming', k >= 1);
  }

  private renderDucklings(t: number): void {
    this.ducklings.forEach((duckling, i) => {
      if (t < SCENE.colony + 10.5) return;
      const spot = EGG_SPOTS[i];
      const target = { x: 760 + (i - 2) * 60, y: 700 };
      this.hopIntoPond(duckling, spot, target, t, SCENE.colony + 10.5 + i * 0.4, 0.24);
    });
  }

  /** Scene 5: straight slides back through space and sky to the pond. */
  private renderPullBack(t: number): void {
    const k = phase(t, SCENE.pullBack, SCENE.message - 2);
    this.camera.style.transform = `translateY(${-k * WORLD_HEIGHT * 2}px)`;
  }
}
