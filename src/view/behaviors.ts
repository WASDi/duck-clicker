import type { DuckSprite, Point } from './duck';
import type { DuckBehavior, Slot } from './flock';
import { el, FOCUS_X } from './playfield';

function random(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Moves in a straight line at constant speed. Returns true on arrival. */
function stepTowards(duck: DuckSprite, target: Point, speed: number, dt: number, scale: number): boolean {
  const dx = target.x - duck.x;
  const dy = target.y - duck.y;
  const distance = Math.hypot(dx, dy);
  const step = speed * dt;
  if (distance <= step) {
    duck.moveTo(target.x, target.y, scale);
    return true;
  }
  duck.faceTowards(target.x);
  duck.moveTo(duck.x + (dx / distance) * step, duck.y + (dy / distance) * step, scale);
  return false;
}

/** Rows of small ducks far back, filling from the front row backwards. */
function backRows(index: number, rowY: readonly number[], left: number, right: number, perRow: number, scale: number): Slot {
  const row = Math.min(Math.floor(index / perRow), rowY.length - 1);
  const column = index % perRow;
  const stagger = row % 2 === 0 ? 0 : 0.5;
  const x = lerp(left, right, (column + stagger) / perRow);
  return { x, y: rowY[row], scale: scale * (1 - row * 0.08) };
}

// ---------------------------------------------------------------- Pond

interface SwimState {
  target: Point | null;
  wait: number;
}

const POND_AREA = { left: 400, right: 980, top: 420, bottom: 800 };

/**
 * Ducks swim on the water: the body is cut off at the waterline and a ripple ring goes around
 * it, its back half behind the duck and its front half in front.
 */
export class PondBehavior implements DuckBehavior<SwimState> {
  readonly pose = 'sit' as const;

  decorate(duck: DuckSprite): void {
    duck.body.before(el('div', 'duck-ripple back'));
    duck.body.after(el('div', 'duck-ripple front'));
  }

  spawn(duck: DuckSprite, index: number, origin?: Point): SwimState {
    const start = origin ?? (index === 0 ? { x: FOCUS_X, y: 620 } : this.randomSpot());
    duck.face(Math.random() < 0.5 && index > 0);
    duck.moveTo(start.x, start.y, this.scaleAt(start.y));
    return { target: origin ? this.randomSpot() : null, wait: random(2, 8) };
  }

  update(duck: DuckSprite, state: SwimState, dt: number): void {
    if (state.target) {
      if (stepTowards(duck, state.target, 45, dt, this.scaleAt(duck.y))) state.target = null;
      return;
    }
    state.wait -= dt;
    if (state.wait > 0) return;
    state.wait = random(3, 9);
    if (Math.random() < 0.35) duck.fidget();
    else state.target = this.nearbySpot(duck);
  }

  backSlot(index: number): Slot {
    return backRows(index, [360, 335, 310, 290], 400, 980, 26, 0.2);
  }

  private scaleAt(y: number): number {
    return lerp(0.36, 0.5, (y - POND_AREA.top) / (POND_AREA.bottom - POND_AREA.top));
  }

  private randomSpot(): Point {
    return { x: random(POND_AREA.left, POND_AREA.right), y: random(POND_AREA.top, POND_AREA.bottom) };
  }

  private nearbySpot(duck: DuckSprite): Point {
    return {
      x: clamp(duck.x + random(-220, 220), POND_AREA.left, POND_AREA.right),
      y: clamp(duck.y + random(-90, 90), POND_AREA.top, POND_AREA.bottom),
    };
  }
}

// ---------------------------------------------------------------- Sky

interface Cloud {
  x: number;
  y: number;
  width: number;
  seats: (DuckSprite | null)[];
}

type SkyState =
  | { mode: 'sit'; cloud: Cloud; seat: number; wait: number }
  | { mode: 'fly'; target: Point; legs: number }
  | { mode: 'land'; cloud: Cloud; seat: number }
  | { mode: 'hop'; from: Point; cloud: Cloud; seat: number; time: number };

const SIT_SCALE = 0.42;
const FLY_SCALE = 0.38;
const HOP_SECONDS = 0.8;
const FLY_AREA = { left: 280, right: 1100, top: 170, bottom: 760 };
const SEAT_OFFSETS = [-0.24, 0, 0.24];

/** Ducks sit on clouds, hop between neighbouring clouds, or fly in loops between them. */
export class SkyBehavior implements DuckBehavior<SkyState> {
  readonly pose = 'sit' as const;
  readonly backPose = 'fly' as const;
  private readonly clouds: Cloud[];

  constructor(layer: HTMLElement) {
    const layout: [number, number, number][] = [
      [680, 560, 400], [440, 380, 300], [930, 380, 300], [470, 770, 320], [900, 760, 340], [1130, 560, 240],
    ];
    this.clouds = layout.map(([x, y, width]) => ({ x, y, width, seats: SEAT_OFFSETS.map(() => null) }));
    this.clouds.forEach((cloud) => this.drawCloud(layer, cloud));
  }

  spawn(duck: DuckSprite, index: number, origin?: Point): SkyState {
    if (index === 0 && !origin) {
      return this.seat(duck, this.clouds[0], 1);
    }
    const start = origin ?? this.randomSky();
    duck.moveTo(start.x, start.y, FLY_SCALE);
    duck.setPose('fly');
    const landing = this.freeSeat(this.clouds);
    if (landing && !origin) return this.seat(duck, landing.cloud, landing.seat);
    return { mode: 'fly', target: this.randomSky(), legs: Math.floor(random(1, 3)) };
  }

  update(duck: DuckSprite, state: SkyState, dt: number): void {
    switch (state.mode) {
      case 'sit':
        return this.updateSitting(duck, state, dt);
      case 'fly':
        return this.updateFlying(duck, state, dt);
      case 'land':
        if (stepTowards(duck, this.seatPoint(state.cloud, state.seat), 160, dt, FLY_SCALE)) {
          Object.assign(state, this.seat(duck, state.cloud, state.seat));
        }
        return;
      case 'hop':
        return this.updateHopping(duck, state, dt);
    }
  }

  backSlot(index: number): Slot {
    return backRows(index, [150, 120, 95, 75], 380, 1000, 26, 0.17);
  }

  private updateSitting(duck: DuckSprite, state: Extract<SkyState, { mode: 'sit' }>, dt: number): void {
    state.wait -= dt;
    if (state.wait > 0) return;
    if (Math.random() < 0.3) {
      duck.fidget();
      state.wait = random(3, 7);
      return;
    }
    const neighbours = this.clouds.filter((c) => c !== state.cloud && Math.hypot(c.x - state.cloud.x, c.y - state.cloud.y) < 420);
    const hop = Math.random() < 0.6 ? this.freeSeat(neighbours) : null;
    state.cloud.seats[state.seat] = null;
    if (hop) {
      hop.cloud.seats[hop.seat] = duck;
      Object.assign(state, { mode: 'hop', from: { x: duck.x, y: duck.y }, cloud: hop.cloud, seat: hop.seat, time: 0 });
      duck.faceTowards(this.seatPoint(hop.cloud, hop.seat).x);
      return;
    }
    duck.setPose('fly');
    Object.assign(state, { mode: 'fly', target: this.randomSky(), legs: Math.floor(random(2, 5)) });
  }

  private updateFlying(duck: DuckSprite, state: Extract<SkyState, { mode: 'fly' }>, dt: number): void {
    if (!stepTowards(duck, state.target, 150, dt, FLY_SCALE)) return;
    state.legs -= 1;
    const landing = state.legs <= 0 ? this.freeSeat(this.clouds) : null;
    if (landing) {
      landing.cloud.seats[landing.seat] = duck;
      Object.assign(state, { mode: 'land', cloud: landing.cloud, seat: landing.seat });
    } else {
      state.target = this.randomSky();
    }
  }

  private updateHopping(duck: DuckSprite, state: Extract<SkyState, { mode: 'hop' }>, dt: number): void {
    state.time += dt;
    const t = Math.min(state.time / HOP_SECONDS, 1);
    const to = this.seatPoint(state.cloud, state.seat);
    const arc = Math.sin(t * Math.PI) * 120;
    duck.moveTo(lerp(state.from.x, to.x, t), lerp(state.from.y, to.y, t) - arc, SIT_SCALE);
    if (t >= 1) Object.assign(state, this.seat(duck, state.cloud, state.seat));
  }

  private seat(duck: DuckSprite, cloud: Cloud, seat: number): SkyState {
    cloud.seats[seat] = duck;
    const point = this.seatPoint(cloud, seat);
    duck.setPose('sit');
    duck.moveTo(point.x, point.y, SIT_SCALE);
    return { mode: 'sit', cloud, seat, wait: random(5, 14) };
  }

  private seatPoint(cloud: Cloud, seat: number): Point {
    return { x: cloud.x + SEAT_OFFSETS[seat] * cloud.width, y: cloud.y - cloud.width * 0.08 };
  }

  private freeSeat(clouds: Cloud[]): { cloud: Cloud; seat: number } | null {
    const free = clouds.flatMap((cloud) => cloud.seats.flatMap((occupant, seat) => (occupant ? [] : [{ cloud, seat }])));
    return free.length > 0 ? free[Math.floor(Math.random() * free.length)] : null;
  }

  private randomSky(): Point {
    return { x: random(FLY_AREA.left, FLY_AREA.right), y: random(FLY_AREA.top, FLY_AREA.bottom) };
  }

  private drawCloud(layer: HTMLElement, cloud: Cloud): void {
    const element = el('div', 'sky-cloud', layer);
    const height = cloud.width * (450 / 768);
    element.style.width = `${cloud.width}px`;
    element.style.height = `${height}px`;
    element.style.left = `${cloud.x - cloud.width / 2}px`;
    element.style.top = `${cloud.y - height * 0.45}px`;
    element.style.zIndex = String(Math.round(this.seatPoint(cloud, 0).y - 40));
    if (Math.random() < 0.5) element.classList.add('flipped');
  }
}

// ---------------------------------------------------------------- Space

interface FloatState {
  target: Point | null;
  wait: number;
}

const SPACE_AREA = { left: 400, right: 960, top: 300, bottom: 780 };
const ASTRO_SCALE = 0.42;

/** Astronaut ducks hover with a slow, slightly rotating bob and drift to new spots. */
export class SpaceBehavior implements DuckBehavior<FloatState> {
  readonly pose = 'astro' as const;

  spawn(duck: DuckSprite, index: number, origin?: Point): FloatState {
    const start = origin ?? (index === 0 ? { x: FOCUS_X, y: 560 } : this.randomSpot());
    duck.face(Math.random() < 0.5 && index > 0);
    duck.moveTo(start.x, start.y, ASTRO_SCALE);
    return { target: origin ? this.randomSpot() : null, wait: random(2, 8) };
  }

  update(duck: DuckSprite, state: FloatState, dt: number): void {
    if (state.target) {
      if (stepTowards(duck, state.target, 30, dt, ASTRO_SCALE)) state.target = null;
      return;
    }
    state.wait -= dt;
    if (state.wait > 0) return;
    state.wait = random(4, 10);
    state.target = this.randomSpot();
  }

  backSlot(index: number): Slot {
    return backRows(index, [250, 220, 195, 175], 400, 960, 26, 0.18);
  }

  private randomSpot(): Point {
    return { x: random(SPACE_AREA.left, SPACE_AREA.right), y: random(SPACE_AREA.top, SPACE_AREA.bottom) };
  }
}
