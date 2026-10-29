import { cancelRender, continueRender, delayRender } from "remotion";
import { asset } from "./assets";

// The game's Sniglet, loaded before the first frame renders.
const FACES: [weight: string, file: string][] = [
  ["400", "fonts/sniglet-400.woff2"],
  ["800", "fonts/sniglet-800.woff2"],
];

const handle = delayRender("Loading Sniglet");
Promise.all(FACES.map(([weight, file]) => new FontFace("Sniglet", `url(${asset(file)})`, { weight }).load()))
  .then((faces) => {
    faces.forEach((f) => document.fonts.add(f));
    continueRender(handle);
  })
  .catch(cancelRender);

export const SNIGLET = "Sniglet, sans-serif";
