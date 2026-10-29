import { Camera } from "../components/Camera";
import { Film } from "../components/Film";
import { Caption, Grade } from "../components/Look";
import { Backdrop, Sprite } from "../components/Sprite";
import { inOut, ramp } from "../lib/anim";
import { MotionBlur, useTime } from "../lib/time";
import { cue } from "../timing";

const DRIP = cue("drip", "coldOpen");
const POINT = { x: 650, y: 410 };

// A night pond out of the dark. One drop falls on the hit and its ripples spread.
const Water: React.FC = () => {
  const t = useTime();
  return (
    <Grade
      filter={`brightness(${ramp(t, [4, DRIP, DRIP + 30], [0, 0.6, 0.75], inOut)}) saturate(0.35) contrast(1.2)`}
      tint="#5d7fb3"
      tintBlend="multiply"
      vignette={0.75}
    >
      <Backdrop src="pond/bg.jpg" zoom={2.1} fx={0.55} fy={0.62} />
      {[0, 7, 16].map((delay, k) => {
        const age = t - DRIP - delay;
        if (age < 0) return null;
        const grow = ramp(age, [0, 70], [0.15, 2.6 - 0.5 * k], (x) => 1 - (1 - x) ** 2);
        return (
          <Sprite
            key={k}
            src="pond/ripple.png"
            x={POINT.x}
            y={POINT.y}
            size={260 * grow}
            anchor={[0.5, 0.81]}
            opacity={ramp(age, [0, 6, 70], [0, 0.9 - 0.2 * k, 0])}
            filter="brightness(2.2) saturate(0.4)"
          />
        );
      })}
    </Grade>
  );
};

// The falling drop: a thin streak, only on screen for the last few frames before it lands.
const Drop: React.FC = () => {
  const t = useTime();
  const y = ramp(t, [DRIP - 9, DRIP], [60, POINT.y]);
  if (t < DRIP - 9 || t >= DRIP) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: POINT.x - 2,
        top: y - 14,
        width: 4,
        height: 14,
        borderRadius: 2,
        background: "rgba(200,225,255,0.85)",
      }}
    />
  );
};

export const ColdOpen: React.FC = () => {
  const t = useTime();
  return (
    <Film>
      <Camera zoom={ramp(t, [0, 120], [1, 1.07])} hits={[DRIP]} shake={5} handheld={1}>
        <Water />
        <MotionBlur samples={5} shutter={0.9}>
          <Drop />
        </MotionBlur>
      </Camera>
      <Caption text="Every legend…" from={DRIP + 8} to={117} />
    </Film>
  );
};
