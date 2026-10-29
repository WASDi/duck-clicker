// All trailer timing (docs/Trailer.md §2–4). The numbers live in timing.json so that
// tools/make_trailer_music.py and scripts/render.mjs read the same values. Cues are in beats from the start.

import timing from "./timing.json";

export const FPS = timing.fps;
export const WIDTH = timing.width;
export const HEIGHT = timing.height;

export const BPM = timing.bpm;
/** Frames per beat (15 at 30 fps and 120 BPM) and per bar of 4/4. */
export const BEAT = (FPS * 60) / BPM;
export const BAR = 4 * BEAT;

export type SceneId = "coldOpen" | "pond" | "sky" | "space" | "pause" | "drop" | "title";
export type CueId = keyof typeof timing.cues;

export interface Scene {
  id: SceneId;
  from: number;
  duration: number;
}

// Scenes play in order, each starting where the previous one ends.
export const SCENES: Scene[] = (timing.scenes as [SceneId, number][]).reduce<Scene[]>((list, [id, bars]) => {
  const prev = list[list.length - 1];
  list.push({ id, from: prev ? prev.from + prev.duration : 0, duration: bars * BAR });
  return list;
}, []);

export const DURATION = SCENES.reduce((sum, s) => sum + s.duration, 0);

export const scene = (id: SceneId): Scene => SCENES.find((s) => s.id === id)!;

/** Frames of a cue, relative to the start of a scene (so they match useCurrentFrame() inside it). */
export const cues = (id: CueId, sceneId: SceneId): number[] => {
  const beats = timing.cues[id];
  return (Array.isArray(beats) ? beats : [beats]).map((b) => Math.round(b * BEAT) - scene(sceneId).from);
};

export const cue = (id: CueId, sceneId: SceneId): number => cues(id, sceneId)[0];
