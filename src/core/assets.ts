// Asset URLs are made absolute so they work from CSS variables and any hosting path.

export function assetUrl(path: string): string {
  return new URL(`assets/${path}`, document.baseURI).href;
}

export function cssUrl(path: string): string {
  return `url("${assetUrl(path)}")`;
}

export const DUCK_COLORS = ['white', 'teal', 'tan', 'chestnut', 'dark_brown'] as const;
export type DuckColor = (typeof DUCK_COLORS)[number];

const IMAGES = [
  ...DUCK_COLORS.flatMap((c) => [`ducks/${c}_sit.png`, `ducks/${c}_fly_1.png`, `ducks/${c}_fly_2.png`, `ducks/${c}_astro_1.png`, `ducks/${c}_astro_2.png`]),
  ...['reed', 'cloud', 'pod'].flatMap((e) => ['intact', 'cracked', 'shell_top', 'shell_bottom'].map((f) => `eggs/${e}_${f}.png`)),
  ...['panel', 'card_gold', 'button', 'button_down', 'button_off', 'bar_track', 'bar_fill', 'frenzy_marker', 'honk_burst'].map((n) => `hud/${n}.png`),
  ...['pond', 'sky', 'space'].flatMap((l) => [1, 2, 3, 4, 'done'].map((n) => `icons/${l}_${n}.png`)),
  'icons/quack.png',
  ...['bg.jpg', 'bread.png', 'bread_conveyor.png', 'duckweed_farm.png', 'flight.png', 'lily_pad.png', 'reed_clump.png', 'reed_nursery.png', 'ripple.png', 'worm_shower.png'].map((n) => `pond/${n}`),
  ...['bg.jpg', 'balloon.png', 'cloud.png', 'cloud_incubator.png', 'crumb_cannon.png', 'insect_swarm_net.png', 'kite.png', 'small_cloud.png', 'stratosphere_gate.png', 'v_formation.png'].map((n) => `sky/${n}`),
  ...['bg.jpg', 'asteroid.png', 'galactic_beacon.png', 'galactic_beacon_lit.png', 'orbital_duckweed_garden.png', 'quasar_core.png', 'satellite.png', 'star.png', 'starseed_feeder.png', 'zero_g_egg_pod.png'].map((n) => `space/${n}`),
  ...['moon', 'flag', 'dome_off', 'dome_on'].map((n) => `outro/${n}.png`),
];

/** Exposes every image as a CSS variable, e.g. `--img-ducks-white-sit`. */
function defineImageVariables(): void {
  const rules = IMAGES.map((path) => `--img-${path.replace(/\.\w+$/, '').replace(/[/_]/g, '-')}: ${cssUrl(path)};`);
  const fonts = [400, 800].map(
    (weight) => `@font-face { font-family: 'Sniglet'; font-weight: ${weight}; font-display: block; src: url("${assetUrl(`fonts/sniglet-${weight}.woff2`)}") format('woff2'); }`,
  );
  const style = document.createElement('style');
  style.textContent = `${fonts.join('\n')}\n:root { ${rules.join(' ')} }`;
  document.head.append(style);
}

function loadImage(path: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = image.onerror = () => resolve();
    image.src = assetUrl(path);
  });
}

/** Defines the CSS variables and waits until all images and fonts are loaded. */
export async function loadAssets(): Promise<void> {
  defineImageVariables();
  await Promise.all([...IMAGES.map(loadImage), document.fonts.load("400 16px 'Sniglet'"), document.fonts.load("800 16px 'Sniglet'")]);
}
