/** Runs `step(t)` every frame with t going linearly from 0 to 1 over `seconds`. */
export function tween(seconds: number, step: (t: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now: number): void => {
      const t = Math.min((now - start) / (seconds * 1000), 1);
      step(t);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

export function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, seconds * 1000));
}
