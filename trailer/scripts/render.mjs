// Renders the trailer to out/trailer.mp4.
//
// Remotion's bundled FFmpeg needs macOS 15+, so Remotion only renders a JPEG sequence here and FFmpeg runs in
// Docker (jrottenberg/ffmpeg) to encode it and mux in src/audio/soundtrack.wav.
//
//     npm run render

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FFMPEG_IMAGE = "jrottenberg/ffmpeg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frames = resolve(root, "out", "frames");
const { fps } = JSON.parse(readFileSync(resolve(root, "src", "timing.json"), "utf8"));

const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: "inherit" });

rmSync(frames, { recursive: true, force: true });
run("npx", [
  "remotion", "render", "Trailer", "out/frames",
  "--sequence", "--image-format=jpeg", "--jpeg-quality=95",
  "--image-sequence-pattern=frame_[frame].[ext]",
]);

// [frame] is zero-padded to the width of the last frame number; read it back for FFmpeg's pattern.
const digits = readdirSync(frames).find((f) => f.startsWith("frame_")).match(/frame_(\d+)/)[1].length;

run("docker", [
  "run", "--rm", "-v", `${root}:/work`, "-w", "/work", FFMPEG_IMAGE,
  "-y", "-loglevel", "warning",
  "-framerate", String(fps), "-i", `out/frames/frame_%0${digits}d.jpeg`,
  "-i", "src/audio/soundtrack.wav",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k",
  "-shortest", "-movflags", "+faststart",
  "out/trailer.mp4",
]);

rmSync(frames, { recursive: true, force: true });
console.log("Wrote out/trailer.mp4");
