import { FRENZY } from '../sim/data';
import type { Game } from '../sim/game';
import { el } from '../view/playfield';
import { formatQuacks, formatRate } from './format';

/** Sets text only when it changed, to keep per-frame DOM writes cheap. */
function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

function stat(parent: HTMLElement, className: string, label: string): HTMLElement {
  const box = el('div', `stat ${className}`, parent);
  el('span', 'stat-label', box).textContent = label;
  const row = el('div', 'stat-row', box);
  return row;
}

/** Top stats bar: level, Quacks, production, ducks and the finale progress bar. */
export class StatsBar {
  private readonly level: HTMLElement;
  private readonly quacks: HTMLElement;
  private readonly rate: HTMLElement;
  private readonly frenzyMarker: HTMLElement;
  private readonly ducks: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly progressText: HTMLElement;
  private readonly finaleIcon: HTMLElement;

  constructor(parent: HTMLElement) {
    const root = el('header', 'stats panel', parent);
    this.level = el('b', 'level-name', stat(root, 'stat-level', 'Level'));
    const quacks = stat(root, 'stat-quacks', 'Quacks');
    el('i', 'quack-icon', quacks);
    this.quacks = el('b', '', quacks);
    const rate = stat(root, 'stat-rate', 'Per second');
    this.rate = el('b', '', rate);
    this.frenzyMarker = el('i', 'frenzy-marker hidden', rate);
    this.ducks = el('b', '', stat(root, 'stat-ducks', 'Ducks'));

    const finale = stat(root, 'stat-finale', 'Finale');
    const bar = el('div', 'bar', finale);
    this.fill = el('div', 'bar-fill', bar);
    this.progressText = el('span', 'bar-text', bar);
    this.finaleIcon = el('i', 'finale-icon', finale);
  }

  update(game: Game): void {
    setText(this.level, game.level.name);
    setText(this.quacks, formatQuacks(game.quacks));
    setText(this.rate, formatRate(game.production));
    this.frenzyMarker.classList.toggle('hidden', game.frenzy.phase !== 'active');
    setText(this.ducks, formatQuacks(game.ducks));
    const cost = game.completionCost;
    const fraction = Math.min(game.quacks / cost, 1);
    this.fill.style.width = `calc(${fraction} * (100% + 32px))`;
    this.fill.classList.toggle('empty', fraction <= 0);
    setText(this.progressText, `${formatQuacks(Math.min(game.quacks, cost))} / ${formatQuacks(cost)}`);
    this.finaleIcon.style.setProperty('--icon', `var(--img-icons-${game.level.id}-done)`);
  }
}

/** Honk Frenzy meter: click streak, then the active countdown, then the cooldown. */
export class FrenzyMeter {
  private readonly root: HTMLElement;
  private readonly pips: HTMLElement[];
  private readonly fill: HTMLElement;
  private readonly label: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'frenzy-meter panel', parent);
    el('i', 'frenzy-badge', this.root);
    const track = el('div', 'frenzy-track', this.root);
    const pipRow = el('div', 'frenzy-pips', track);
    this.pips = Array.from({ length: FRENZY.clicksNeeded }, () => el('i', '', pipRow));
    this.fill = el('div', 'frenzy-fill', track);
    this.label = el('span', 'frenzy-label', this.root);
  }

  update(game: Game): void {
    const { phase, remaining, streak } = game.frenzy;
    this.root.dataset.phase = phase;
    if (phase === 'ready') {
      this.pips.forEach((pip, i) => pip.classList.toggle('on', i < streak));
      setText(this.label, 'Honk Frenzy: 8 quick clicks!');
      return;
    }
    const total = phase === 'active' ? FRENZY.durationSeconds : FRENZY.cooldownSeconds;
    const fraction = phase === 'active' ? remaining / total : 1 - remaining / total;
    this.fill.style.width = `${fraction * 100}%`;
    setText(this.label, phase === 'active' ? `HONK FRENZY! ×2 · ${Math.ceil(remaining)}s` : `Recharging · ${Math.ceil(remaining)}s`);
  }
}
