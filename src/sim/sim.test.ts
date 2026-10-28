import { describe, expect, it } from 'vitest';
import { COMPLETION_INDEX, FRENZY, LEVELS, TICK_SECONDS } from './data';
import { Frenzy } from './frenzy';
import { Game, upgradeCost } from './game';
import { Golden } from './golden';
import { Hatchery } from './hatchery';

const half = () => 0.5;

function run(game: Game, seconds: number): void {
  const ticks = Math.round(seconds / TICK_SECONDS);
  for (let i = 0; i < ticks; i++) game.tick(TICK_SECONDS);
}

function frenzyAfter(clicks: number, gapSeconds: number): Frenzy {
  const frenzy = new Frenzy();
  for (let i = 0; i < clicks; i++) {
    frenzy.registerClick();
    frenzy.update(gapSeconds);
  }
  return frenzy;
}

describe('upgradeCost', () => {
  it('grows 35% per purchase, rounded each step', () => {
    const bread = LEVELS[0].upgrades[0];
    expect(upgradeCost(bread, 0)).toBe(5);
    expect(upgradeCost(bread, 1)).toBe(7);
    expect(upgradeCost(bread, 2)).toBe(9);
  });
});

describe('Game', () => {
  it('starts in Pond with one duck and zero Quacks', () => {
    const game = new Game(half);
    expect(game.level.id).toBe('pond');
    expect(game.ducks).toBe(1);
    expect(game.quacks).toBe(0);
  });

  it('grants Quacks for every duck hit by one click, counting one Frenzy click', () => {
    const game = new Game(half);
    expect(game.clickDucks(3)).toBe(1);
    expect(game.quacks).toBe(3);
    expect(game.frenzy.streak).toBe(1);
  });

  it('grants 1 Quack plus 5% of production per click', () => {
    const game = new Game(half);
    game.quacks = 13;
    game.buy(3); // Worm Shower: +2/s
    expect(game.clickDucks(1)).toBeCloseTo(1.1);
  });

  it('adds per-duck and flat production', () => {
    const game = new Game(half);
    game.quacks = 1000;
    game.buy(0);
    game.buy(0);
    game.buy(3);
    game.ducks = 4;
    expect(game.baseProduction).toBeCloseTo(0.5 * 4 + 2);
  });

  it('refuses purchases it cannot afford or that are maxed', () => {
    const game = new Game(half);
    expect(game.buy(0)).toBe('tooExpensive');
    game.quacks = 1e6;
    for (let i = 0; i < 10; i++) expect(game.buy(0)).toBe('bought');
    expect(game.buy(0)).toBe('maxed');
  });

  it('completes the level when the completion upgrade is bought', () => {
    const game = new Game(half);
    game.quacks = 1900;
    game.buy(COMPLETION_INDEX);
    expect(game.phase).toBe('transition');
    expect(game.drainEvents()).toContainEqual({ type: 'levelComplete', levelIndex: 0 });
    expect(game.clickDucks(1)).toBe(0);
  });

  it('enters the outro after the last level', () => {
    const game = new Game(half);
    game.startLevel(2);
    game.quacks = 6000;
    game.buy(COMPLETION_INDEX);
    expect(game.phase).toBe('outro');
  });

  it('resets everything at the start of a level', () => {
    const game = new Game(half);
    game.quacks = 500;
    game.buy(0);
    game.ducks = 9;
    game.startLevel(1);
    expect(game.quacks).toBe(0);
    expect(game.ducks).toBe(1);
    expect(game.purchases).toEqual([0, 0, 0, 0, 0]);
  });

  it('doubles production and the Golden reward during Frenzy', () => {
    const game = new Game(half);
    game.quacks = 13;
    game.buy(3);
    game.forceFrenzy();
    expect(game.production).toBe(4);
    expect(game.goldenReward).toBe(32);
  });

  it('hatches ducks from the hatchery', () => {
    const game = new Game(half);
    game.quacks = 18 + 24;
    game.buy(1);
    game.buy(1);
    run(game, 7 + TICK_SECONDS); // one extra tick absorbs float rounding
    expect(game.ducks).toBe(3);
    expect(game.drainEvents()).toContainEqual({ type: 'hatched', count: 2 });
  });

  it('a 1-click-per-second greedy player finishes each level in one to three minutes', () => {
    for (let level = 0; level < LEVELS.length; level++) {
      const game = new Game(half);
      game.startLevel(level);
      let seconds = 0;
      while (game.phase === 'playing' && seconds < 900) {
        game.clickDucks(1);
        buyCheapest(game);
        run(game, 1);
        seconds++;
      }
      expect(game.phase).not.toBe('playing');
      expect(seconds).toBeGreaterThan(60);
      expect(seconds).toBeLessThan(200);
    }
  });
});

function buyCheapest(game: Game): void {
  if (game.buy(COMPLETION_INDEX) === 'bought') return;
  const options = [0, 1, 2, 3].filter((i) => !game.isMaxed(i));
  options.sort((a, b) => game.costOf(a) - game.costOf(b));
  if (options.length > 0) game.buy(options[0]);
}

describe('Frenzy', () => {
  it('activates on the 8th click within 6 seconds', () => {
    expect(frenzyAfter(7, 0.5).phase).toBe('ready');
    expect(frenzyAfter(8, 0.5).phase).toBe('active');
  });

  it('does not activate when clicks are spread out', () => {
    expect(frenzyAfter(20, 1).phase).toBe('ready');
  });

  it('lasts 10 seconds, then cools down for 20', () => {
    const frenzy = frenzyAfter(8, 0.1);
    expect(frenzy.update(FRENZY.durationSeconds)).toBe('active');
    expect(frenzy.phase).toBe('cooldown');
    expect(frenzy.registerClick()).toBe(false);
    expect(frenzy.update(FRENZY.cooldownSeconds)).toBe('cooldown');
    expect(frenzy.phase).toBe('ready');
    expect(frenzy.streak).toBe(0);
  });
});

describe('Hatchery', () => {
  it('waits for the first purchase and keeps its timer when more are bought', () => {
    const hatchery = new Hatchery(14);
    expect(hatchery.update(100, 0)).toBe(0);
    expect(hatchery.update(10, 1)).toBe(0);
    expect(hatchery.update(4, 3)).toBe(3);
    expect(hatchery.progress(3)).toBeCloseTo(0);
  });
});

describe('Golden', () => {
  it('appears after 40–60 s and leaves after 6 s', () => {
    const golden = new Golden(() => 0); // 40 s delay
    expect(golden.update(39.9)).toBeNull();
    expect(golden.update(0.2)).toBe('appeared');
    expect(golden.update(5.9)).toBeNull();
    expect(golden.update(0.2)).toBe('left');
    expect(golden.visible).toBe(false);
  });

  it('gives at least 15 Quacks', () => {
    const game = new Game(half);
    game.forceGolden();
    expect(game.clickGolden()).toBe(15);
    expect(game.clickGolden()).toBe(0);
  });
});
