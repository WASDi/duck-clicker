import { existsSync } from "node:fs";
import { release } from "node:os";
import { Config } from "@remotion/cli/config";

// Share the game's assets instead of copying them (docs/Trailer.md §7).
Config.setPublicDir("../public");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// One tab at a time: with several, the installed Chrome sometimes captures a black or tiled, mis-scaled frame.
Config.setConcurrency(1);

// Remotion's bundled headless Chrome needs macOS 13+ (Darwin 22). On older macOS, use the installed Chrome.
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (process.platform === "darwin" && parseInt(release()) < 22 && existsSync(CHROME)) {
  Config.setBrowserExecutable(CHROME);
}
