import { createContext, useContext } from "react";
import { useCurrentFrame } from "remotion";

// Scene code reads time through useTime() instead of useCurrentFrame(), so <MotionBlur> can render the same
// elements a fraction of a frame earlier.
const Offset = createContext(0);

/** Current frame, possibly fractional inside <MotionBlur>. */
export const useTime = () => useCurrentFrame() + useContext(Offset);

/**
 * Real motion blur: renders its children at `samples` points spread over `shutter` frames and averages them
 * (sample k is drawn at opacity 1/(k+1), which gives every sample the same weight).
 */
export const MotionBlur: React.FC<{ samples?: number; shutter?: number; children: React.ReactNode }> = ({
  samples = 6,
  shutter = 0.5,
  children,
}) => {
  const base = useContext(Offset);
  return (
    <>
      {Array.from({ length: samples }, (_, k) => (
        <div key={k} style={{ position: "absolute", inset: 0, opacity: 1 / (k + 1) }}>
          <Offset.Provider value={base - (shutter * (samples - 1 - k)) / Math.max(1, samples - 1)}>
            {children}
          </Offset.Provider>
        </div>
      ))}
    </>
  );
};
