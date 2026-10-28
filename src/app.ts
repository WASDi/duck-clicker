import { GameAudio } from './audio/game-audio';
import { Loop } from './core/loop';
import { COMPLETION_INDEX, LEVELS } from './sim/data';
import { Game, type GameEvent } from './sim/game';
import { createDebugPanel, isDebugMode } from './ui/debug';
import { formatGain } from './ui/format';
import { FrenzyMeter, StatsBar } from './ui/hud';
import { Shop } from './ui/shop';
import type { Point } from './view/duck';
import { floatNumber, sparkle } from './view/effects';
import { GoldenItem } from './view/golden-item';
import { LEVEL_LOOKS } from './view/levels';
import { Outro } from './view/outro';
import { el, FOCUS_X, Playfield, replayClass } from './view/playfield';
import { LevelScene } from './view/scene';
import { playLevelTransition } from './view/transition';

const QUACK_STAGGER_SECONDS = 0.05;

/** Wires the game rules to the scene, HUD, shop and audio. */
export class App {
  private readonly game = new Game();
  private readonly audio = new GameAudio();
  private readonly loop: Loop;
  private readonly root: HTMLElement;
  private readonly playfield: Playfield;
  private readonly stage: HTMLElement;
  private readonly stats: StatsBar;
  private readonly frenzyMeter: FrenzyMeter;
  private readonly shop: Shop;
  private readonly golden: GoldenItem;
  private readonly honk: HTMLElement;
  private scene: LevelScene;
  private inTransition = false;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'game', parent);
    this.stats = new StatsBar(this.root);
    this.stage = el('main', 'stage', this.root);
    this.playfield = new Playfield(this.stage, FOCUS_X);
    el('div', 'frenzy-border', this.stage);
    this.honk = el('div', 'honk-burst hidden', this.stage);
    this.frenzyMeter = new FrenzyMeter(this.stage);
    this.shop = new Shop(this.root, {
      onBuy: (index) => this.buy(index),
      onToggleDetails: () => this.audio.sfx('ui_click'),
    });
    this.playfield.setOccluder(this.shop.root);
    this.golden = new GoldenItem(this.playfield.fxLayer, (at) => this.collectGolden(at));
    this.scene = this.showLevel(0);
    this.playfield.root.addEventListener('pointerdown', (event) => this.clickDucks(event));

    document.addEventListener('pointerdown', () => this.audio.unlock(this.game.level.id), { capture: true });
    if (isDebugMode()) this.createDebug();
    void this.audio.load();
    this.loop = new Loop(
      (dt) => this.game.tick(dt),
      (dt) => this.render(dt),
    );
  }

  start(): void {
    this.render(0);
    this.loop.start();
  }

  private showLevel(index: number): LevelScene {
    this.scene?.root.remove();
    const scene = new LevelScene(index);
    this.playfield.sceneLayer.append(scene.root);
    scene.restore(this.game);
    this.golden.setSprite(LEVEL_LOOKS[LEVELS[index].id].goldenSprite);
    this.scene = scene;
    return scene;
  }

  private render(dt: number): void {
    this.handleEvents(this.game.drainEvents());
    if (!this.inTransition) this.scene.update(dt, this.game);
    this.golden.update(this.game.golden);
    this.stage.classList.toggle('frenzy', this.game.frenzy.phase === 'active');
    this.stats.update(this.game);
    this.frenzyMeter.update(this.game);
    this.shop.update(this.game);
  }

  /** One click hits every duck under the pointer, and each of them quacks. */
  private clickDucks(event: PointerEvent): void {
    const ducks = this.scene.ducksAt(event.clientX, event.clientY);
    const gain = this.game.clickDucks(ducks.length);
    if (gain === 0) return;
    ducks.forEach((duck, i) => {
      duck.hop();
      this.audio.quack(i * QUACK_STAGGER_SECONDS);
      floatNumber(this.playfield.fxLayer, duck.x, duck.y - 230 * duck.scale, `+${formatGain(gain)}`);
    });
    this.handleEvents(this.game.drainEvents());
  }

  private collectGolden(at: Point): void {
    const reward = this.game.clickGolden();
    if (reward === 0) return;
    this.audio.sfx('golden_collect');
    sparkle(this.playfield.fxLayer, at.x, at.y);
    floatNumber(this.playfield.fxLayer, at.x, at.y - 40, `+${formatGain(reward)}`, true);
  }

  private buy(index: number): void {
    const result = this.game.buy(index);
    if (result === 'tooExpensive') this.audio.sfx('deny');
    if (result !== 'bought') return;
    this.shop.squash(index);
    this.handleEvents(this.game.drainEvents());
  }

  private handleEvents(events: GameEvent[]): void {
    for (const event of events) this.handleEvent(event);
  }

  private handleEvent(event: GameEvent): void {
    switch (event.type) {
      case 'purchased':
        this.scene.applyPurchase(event.index, event.count);
        if (event.index !== COMPLETION_INDEX) this.audio.purchase(event.count, this.game.level.upgrades[event.index].maxBuys);
        return;
      case 'hatched':
        this.scene.hatch(event.count);
        this.audio.hatch(event.count);
        return;
      case 'frenzyStart':
        replayClass(this.honk, 'show');
        this.honk.classList.remove('hidden');
        this.audio.sfx('frenzy_start');
        this.audio.music.setFrenzy(true);
        return;
      case 'frenzyEnd':
        this.audio.sfx('frenzy_end');
        this.audio.music.setFrenzy(false);
        return;
      case 'goldenAppeared':
        this.audio.sfx('golden_appear');
        return;
      case 'goldenLeft':
        return;
      case 'levelComplete':
        void this.completeLevel(event.levelIndex);
        return;
    }
  }

  private async completeLevel(levelIndex: number): Promise<void> {
    const from = LEVELS[levelIndex].id;
    this.audio.sfx(`complete_${from}`);
    this.audio.music.setFrenzy(false);
    if (levelIndex === LEVELS.length - 1) {
      window.setTimeout(() => this.playOutro(), 1200);
      return;
    }
    this.inTransition = true;
    this.audio.sfx(from === 'pond' ? 'whoosh_wind' : 'whoosh_rocket');
    const next = levelIndex + 1;
    const oldScene = this.scene;
    this.game.startLevel(next);
    this.game.phase = 'transition';
    this.audio.startLevelMusic(this.game.level.id);
    const newScene = new LevelScene(next);
    newScene.restore(this.game);
    this.golden.setSprite(LEVEL_LOOKS[LEVELS[next].id].goldenSprite);
    await playLevelTransition(from, oldScene, newScene, this.playfield.sceneLayer, this.playfield.fxLayer);
    this.scene = newScene;
    this.game.phase = 'playing';
    this.inTransition = false;
  }

  private playOutro(): void {
    this.root.classList.add('ended');
    this.audio.music.playOutro();
    const outro = new Outro(document.body, {
      position: () => this.audio.music.outroPosition(),
      sfx: (name) => this.audio.sfx(name),
      quack: () => this.audio.quack(),
    });
    outro.start();
    if (isDebugMode()) Object.assign(window, { outro });
  }

  private createDebug(): void {
    createDebugPanel(document.body, {
      setSpeed: (speed) => (this.loop.speed = speed),
      addQuacks: (amount) => (this.game.quacks += amount),
      jumpToLevel: (index) => {
        this.game.startLevel(index);
        this.showLevel(index);
        this.audio.startLevelMusic(this.game.level.id);
      },
      jumpToOutro: () => {
        this.game.phase = 'outro';
        this.playOutro();
      },
      triggerFrenzy: () => this.game.forceFrenzy(),
      triggerGolden: () => this.game.forceGolden(),
    });
  }
}
