import { AbsoluteFill } from "remotion";
import { Film } from "../components/Film";
import { Sprite } from "../components/Sprite";
import { ramp, ring } from "../lib/anim";
import { useTime } from "../lib/time";
import { cue } from "../timing";

const QUACK = cue("quack", "pause");

// Everything stops. One small duck in a pool of light, perfectly still, quacks once.
export const Pause: React.FC = () => {
  const t = useTime();
  const p = t - QUACK;
  const sy = p < 0 ? 1 : p < 2 ? ramp(p, [0, 2], [1, 0.86]) : 1 + ring(p, [2], 0.1, 4, 9);
  return (
    <Film>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 22% 20% at 50% 56%, #1d1d22, black)" }} />
      <Sprite src="ducks/white_sit.png" x={640} y={430} size={120} anchor={[0.5, 0.98]} sx={1 / Math.sqrt(sy)} sy={sy}
        filter="brightness(0.82) saturate(0.85)" />
    </Film>
  );
};
