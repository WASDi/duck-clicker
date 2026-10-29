import { AbsoluteFill } from "remotion";
import { noise, ring } from "../lib/anim";
import { useTime } from "../lib/time";

/**
 * Moves everything inside it like a camera: zoom and pan around the stage centre, plus a slow handheld drift
 * (`handheld` px) and a decaying shake after each frame in `hits`.
 */
export const Camera: React.FC<{
  zoom?: number;
  x?: number;
  y?: number;
  rotate?: number;
  handheld?: number;
  hits?: number[];
  shake?: number;
  seed?: string;
  children: React.ReactNode;
}> = ({ zoom = 1, x = 0, y = 0, rotate = 0, handheld = 1.5, hits = [], shake = 6, seed = "cam", children }) => {
  const t = useTime();
  const hx = handheld * noise(`${seed}x`, t, 40) + ring(t, hits, shake, 5, 4.3);
  const hy = handheld * noise(`${seed}y`, t, 47) + ring(t, hits, shake * 0.8, 5, 3.7);
  const hr = handheld * 0.08 * noise(`${seed}r`, t, 60);
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${x + hx}px, ${y + hy}px) rotate(${rotate + hr}deg) scale(${zoom})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
