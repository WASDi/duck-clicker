import { Easing, interpolate, random } from "remotion";

export { Easing };

/** interpolate() clamped at both ends, which is what almost every move here wants. */
export const ramp = (t: number, from: number[], to: number[], easing?: (x: number) => number) =>
  interpolate(t, from, to, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

export const inOut = Easing.inOut(Easing.cubic);
export const out = Easing.out(Easing.cubic);

/** Smooth 1D value noise in [-1, 1]; `t` in frames, `period` in frames per random point. */
export const noise = (seed: string, t: number, period = 30) => {
  const x = t / period;
  const i = Math.floor(x);
  const f = x - i;
  const a = random(`${seed}-${i}`) * 2 - 1;
  const b = random(`${seed}-${i + 1}`) * 2 - 1;
  return a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * f));
};

/** Sum of damped oscillations, one starting at each hit frame: for wobbles and camera shake. */
export const ring = (t: number, hits: number[], amp: number, decay = 8, period = 9) =>
  hits.reduce((sum, h) => {
    const dt = t - h;
    return dt < 0 ? sum : sum + amp * Math.exp(-dt / decay) * Math.sin((dt * 2 * Math.PI) / period);
  }, 0);

/** 1 at a hit, falling off exponentially: for flashes and squash. */
export const pulse = (t: number, hits: number[], decay = 6) =>
  hits.reduce((m, h) => (t < h ? m : Math.max(m, Math.exp(-(t - h) / decay))), 0);

/** Flipbook frame index that changes every `every` frames. */
export const flip = (t: number, every: number, count = 2, phase = 0) =>
  ((Math.floor((t + phase) / every) % count) + count) % count;
