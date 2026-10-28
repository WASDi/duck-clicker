import { COMPLETION_INDEX, type LevelDef } from '../sim/data';
import type { Game } from '../sim/game';
import { el, replayClass } from '../view/playfield';
import { formatQuacks } from './format';

type CardState = 'affordable' | 'expensive' | 'maxed';

const COMPACT_QUERY = window.matchMedia('(max-width: 760px), (orientation: portrait) and (max-width: 1000px)');

export interface ShopHandlers {
  onBuy(index: number): void;
  onToggleDetails(): void;
}

interface Card {
  root: HTMLElement;
  icon: HTMLElement;
  cost: HTMLElement;
  pips: HTMLElement[];
  state: CardState | null;
  shownCount: number;
}

/** The upgrade shop: four growth upgrades and the gold completion card. */
export class Shop {
  readonly root: HTMLElement;
  private readonly list: HTMLElement;
  private cards: Card[] = [];
  private levelId = '';

  constructor(parent: HTMLElement, private readonly handlers: ShopHandlers) {
    this.root = el('aside', 'shop panel', parent);
    el('h2', 'shop-title', this.root).textContent = 'Upgrades';
    this.list = el('div', 'shop-list', this.root);
  }

  update(game: Game): void {
    if (game.level.id !== this.levelId) this.build(game.level);
    this.cards.forEach((card, i) => this.updateCard(card, game, i));
  }

  /** Squashes the card once after a purchase. */
  squash(index: number): void {
    const card = this.cards[index];
    if (card) replayClass(card.root, 'squash');
  }

  private build(level: LevelDef): void {
    this.levelId = level.id;
    this.list.replaceChildren();
    this.cards = level.upgrades.map((upgrade, index) => {
      const isCompletion = index === COMPLETION_INDEX;
      const root = el('div', isCompletion ? 'card completion' : 'card', this.list);
      root.setAttribute('role', 'button');
      const icon = el('div', 'card-icon', root);
      icon.style.setProperty('--icon', `var(--img-icons-${level.id}-${isCompletion ? 'done' : index + 1})`);
      const body = el('div', 'card-body', root);
      el('div', 'card-name', body).textContent = upgrade.name;
      el('div', 'card-effect', body).textContent = upgrade.effect;
      const pipRow = el('div', 'pips', body);
      const pips = isCompletion ? [] : Array.from({ length: upgrade.maxBuys }, () => el('i', '', pipRow));
      const cost = el('div', 'card-cost', root);
      root.addEventListener('pointerdown', (event) => this.onCardPress(event, root, index));
      return { root, icon, cost, pips, state: null, shownCount: -1 };
    });
  }

  private onCardPress(event: PointerEvent, root: HTMLElement, index: number): void {
    const onCost = (event.target as HTMLElement).closest('.card-cost') !== null;
    if (COMPACT_QUERY.matches && !onCost && index !== COMPLETION_INDEX) {
      root.classList.toggle('open');
      this.handlers.onToggleDetails();
      return;
    }
    replayClass(root, 'pressed');
    this.handlers.onBuy(index);
  }

  private updateCard(card: Card, game: Game, index: number): void {
    const count = game.purchases[index];
    const state: CardState = game.isMaxed(index) ? 'maxed' : game.canAfford(index) ? 'affordable' : 'expensive';
    if (state !== card.state) {
      card.state = state;
      card.root.dataset.state = state;
    }
    if (count === card.shownCount) return;
    card.shownCount = count;
    card.pips.forEach((pip, i) => pip.classList.toggle('on', i < count));
    card.cost.replaceChildren();
    if (state === 'maxed') {
      el('span', 'max-check', card.cost);
      el('b', '', card.cost).textContent = 'MAX';
    } else {
      el('i', 'quack-icon', card.cost);
      el('b', '', card.cost).textContent = formatQuacks(game.costOf(index));
    }
  }
}
