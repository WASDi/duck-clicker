// All gameplay numbers from docs/Gameplay.md live here.

export type LevelId = 'pond' | 'sky' | 'space';

export type UpgradeKind = 'perDuck' | 'hatchery' | 'flat' | 'completion';

export interface UpgradeDef {
  readonly id: string;
  readonly name: string;
  readonly kind: UpgradeKind;
  readonly baseCost: number;
  /** Quacks/s per duck (perDuck), Quacks/s (flat), or seconds between hatches (hatchery). */
  readonly amount: number;
  readonly effect: string;
  readonly maxBuys: number;
}

export interface LevelDef {
  readonly id: LevelId;
  readonly name: string;
  /** Four growth upgrades followed by the completion upgrade. */
  readonly upgrades: readonly UpgradeDef[];
}

export const TICKS_PER_SECOND = 20;
export const TICK_SECONDS = 1 / TICKS_PER_SECOND;

export const GROWTH_MAX_BUYS = 10;
export const COST_GROWTH = 1.35;

export const CLICK = {
  baseQuacks: 1,
  productionShare: 0.05,
} as const;

export const FRENZY = {
  clicksNeeded: 8,
  windowSeconds: 6,
  durationSeconds: 10,
  cooldownSeconds: 20,
  multiplier: 2,
} as const;

export const GOLDEN = {
  minDelaySeconds: 40,
  maxDelaySeconds: 60,
  visibleSeconds: 6,
  rewardSeconds: 8,
  minReward: 15,
} as const;

function growth(id: string, name: string, kind: UpgradeKind, baseCost: number, amount: number, effect: string): UpgradeDef {
  return { id, name, kind, baseCost, amount, effect, maxBuys: GROWTH_MAX_BUYS };
}

function completion(id: string, name: string, baseCost: number, effect: string): UpgradeDef {
  return { id, name, kind: 'completion', baseCost, amount: 0, effect, maxBuys: 1 };
}

export const LEVELS: readonly LevelDef[] = [
  {
    id: 'pond',
    name: 'Pond',
    upgrades: [
      growth('bread_conveyor', 'Bread Conveyor', 'perDuck', 10, 0.25, '+0.25 Quacks/s per duck'),
      growth('reed_nursery', 'Reed Nursery', 'hatchery', 35, 14, 'Hatches one duck every 14 seconds'),
      growth('duckweed_farm', 'Duckweed Farm', 'perDuck', 100, 0.4, '+0.4 Quacks/s per duck'),
      growth('worm_shower', 'Worm Shower', 'flat', 25, 2, '+2 Quacks/s'),
      completion('flight', 'Flight', 3800, 'Sends the flock flying up into the sky'),
    ],
  },
  {
    id: 'sky',
    name: 'Sky',
    upgrades: [
      growth('crumb_cannon', 'Cloud Crumb Cannon', 'perDuck', 20, 0.3, '+0.3 Quacks/s per duck'),
      growth('cloud_incubator', 'Cloud Incubator', 'hatchery', 65, 13, 'Hatches one duck every 13 seconds'),
      growth('v_formation', 'V-Formation Training', 'perDuck', 200, 0.45, '+0.45 Quacks/s per duck'),
      growth('insect_swarm_net', 'Insect Swarm Net', 'flat', 40, 3, '+3 Quacks/s'),
      completion('stratosphere_gate', 'Stratosphere Gate', 7700, 'Opens a route to Space'),
    ],
  },
  {
    id: 'space',
    name: 'Space',
    upgrades: [
      growth('starseed_feeder', 'Starseed Feeder', 'perDuck', 30, 0.35, '+0.35 Quacks/s per duck'),
      growth('zero_g_egg_pod', 'Zero-G Egg Pod', 'hatchery', 90, 12, 'Hatches one duck every 12 seconds'),
      growth('orbital_duckweed_garden', 'Orbital Duckweed Garden', 'perDuck', 280, 0.5, '+0.5 Quacks/s per duck'),
      growth('quasar_core', 'Quasar Core', 'flat', 60, 4, '+4 Quacks/s'),
      completion('galactic_beacon', 'Galactic Beacon', 12000, 'Completes the campaign'),
    ],
  },
];

export const COMPLETION_INDEX = 4;
