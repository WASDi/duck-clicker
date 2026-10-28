import { el } from '../view/playfield';

export interface DebugActions {
  setSpeed(speed: number): void;
  addQuacks(amount: number): void;
  jumpToLevel(index: number): void;
  jumpToOutro(): void;
  triggerFrenzy(): void;
  triggerGolden(): void;
}

export function isDebugMode(): boolean {
  return new URLSearchParams(window.location.search).has('debug');
}

function button(parent: HTMLElement, label: string, onClick: () => void): HTMLButtonElement {
  const element = el('button', '', parent);
  element.textContent = label;
  element.addEventListener('click', onClick);
  return element;
}

/** Small developer panel shown with `?debug` in the URL. */
export function createDebugPanel(parent: HTMLElement, actions: DebugActions): void {
  const panel = el('div', 'debug', parent);
  const speed = el('div', 'debug-row', panel);
  el('span', '', speed).textContent = 'Speed';
  const speedButtons = [1, 5, 20].map((value) =>
    button(speed, `${value}×`, () => {
      actions.setSpeed(value);
      speedButtons.forEach((b) => b.classList.toggle('on', b.textContent === `${value}×`));
    }),
  );
  speedButtons[0].classList.add('on');

  const quacks = el('div', 'debug-row', panel);
  for (const amount of [100, 1000, 10000]) button(quacks, `+${amount.toLocaleString('en-US')}`, () => actions.addQuacks(amount));

  const jump = el('div', 'debug-row', panel);
  ['Pond', 'Sky', 'Space'].forEach((name, index) => button(jump, name, () => actions.jumpToLevel(index)));
  button(jump, 'Outro', actions.jumpToOutro);

  const trigger = el('div', 'debug-row', panel);
  button(trigger, 'Frenzy', actions.triggerFrenzy);
  button(trigger, 'Golden', actions.triggerGolden);
}
