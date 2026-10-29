import { staticFile } from "remotion";

// Paths into the game's public/assets (shared via remotion.config.ts).
export const asset = (path: string) => staticFile(`assets/${path}`);
