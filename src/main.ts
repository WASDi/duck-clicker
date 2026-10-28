import './styles/main.css';
import './styles/hud.css';
import './styles/scene.css';
import './styles/outro.css';
import { App } from './app';
import { loadAssets } from './core/assets';

async function main(): Promise<void> {
  const container = document.getElementById('app')!;
  await loadAssets();
  container.replaceChildren();
  new App(container).start();
}

void main();
