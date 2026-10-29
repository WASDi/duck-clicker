import { AbsoluteFill } from "remotion";
import { Camera } from "../components/Camera";
import { Film } from "../components/Film";
import { Caption, Grade } from "../components/Look";
import { Backdrop, Sprite } from "../components/Sprite";
import { inOut, ramp, ring } from "../lib/anim";
import { MotionBlur, useTime } from "../lib/time";
import { cue, cues } from "../timing";

const WOBBLES = cues("wobble", "pond");
const CRACK = cue("crack", "pond");
const REVEAL = cue("reveal", "pond");
const EGG = { x: 590, y: 505, size: 230 };

// Each hit rocks the egg a little harder than the last.
const eggAngle = (t: number) =>
  WOBBLES.reduce((sum, h, k) => sum + ring(t, [h], 4 + 2.5 * k, 7, 8), 0) + ring(t, [CRACK], 8, 7, 8);

const Egg: React.FC = () => {
  const t = useTime();
  if (t >= REVEAL) return null;
  return (
    <Sprite
      src={t < CRACK ? "eggs/reed_intact.png" : "eggs/reed_cracked.png"}
      x={EGG.x}
      y={EGG.y}
      size={EGG.size}
      anchor={[0.5, 1]}
      rotate={eggAngle(t)}
    />
  );
};

// Shell chips that jump off when the egg cracks.
const Chips: React.FC = () => {
  const t = useTime();
  const p = t - CRACK;
  if (p < 0 || p > 22) return null;
  return (
    <>
      {[-1.2, -0.5, 0.6, 1.3].map((dir, k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: EGG.x + dir * (10 + 7 * p),
            top: EGG.y - 120 - (9 - k) * p + 0.9 * p * p,
            width: 7 - k,
            height: 5,
            borderRadius: 2,
            background: "#efe3c8",
            transform: `rotate(${dir * 60 * p}deg)`,
            opacity: ramp(p, [16, 22], [1, 0]),
          }}
        />
      ))}
    </>
  );
};

// The hatch: the top flies off, the bottom tips away, and the duck pops up with a squash and stretch.
const Hatch: React.FC = () => {
  const t = useTime();
  const p = t - REVEAL;
  if (p < 0) return null;
  const sy = p < 3 ? ramp(p, [0, 3], [0.45, 1.22]) : 1 + 0.22 * Math.exp(-(p - 3) / 5) * Math.cos(((p - 3) * 2 * Math.PI) / 11);
  return (
    <>
      <Sprite
        src="ducks/teal_sit.png"
        x={EGG.x + 10}
        y={EGG.y + 8}
        size={330}
        anchor={[0.51, 0.98]}
        sx={1 / Math.sqrt(sy)}
        sy={sy * (1 + 0.008 * Math.sin(p / 9))}
      />
      {p < 16 && (
        <Sprite
          src="eggs/reed_shell_bottom.png"
          x={EGG.x - 6 * p}
          y={EGG.y + 2 * p + 0.6 * p * p}
          size={EGG.size}
          anchor={[0.5, 1]}
          rotate={-4 * p}
          opacity={ramp(p, [8, 16], [1, 0])}
        />
      )}
      {p < 14 && (
        <Sprite
          src="eggs/reed_shell_top.png"
          x={EGG.x + 16 * p}
          y={EGG.y - 150 - 42 * p + 1.5 * p * p}
          size={EGG.size}
          rotate={28 * p}
        />
      )}
    </>
  );
};

const Set: React.FC = () => {
  const t = useTime();
  return (
    <>
      <Grade filter="brightness(0.62) saturate(0.6) contrast(1.18)" tint="#ff9050" vignette={0}>
        <Backdrop src="pond/bg.jpg" zoom={1.45} fx={0.48} fy={0.4} dx={-0.15 * t} blur={8} />
      </Grade>
      {/* Low sun behind the egg. */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 46% 52%, rgba(255,186,110,0.32), transparent 38%)",
          mixBlendMode: "screen",
        }}
      />
      <Sprite src="pond/lily_pad.png" x={250 - 0.3 * t} y={470} size={190} anchor={[0.5, 0.68]} blur={4}
        filter="brightness(0.6) saturate(0.6)" />
      <Sprite src="pond/lily_pad.png" x={1050 - 0.3 * t} y={455} size={150} mirror anchor={[0.5, 0.68]} blur={5}
        filter="brightness(0.6) saturate(0.6)" />
      <Sprite src="pond/lily_pad.png" x={700 - 0.5 * t} y={558} size={640} anchor={[0.5, 0.68]}
        filter="brightness(0.8) saturate(0.75)" />
    </>
  );
};

// Out-of-focus reeds right in front of the lens, drifting faster than everything else.
const Foreground: React.FC = () => {
  const t = useTime();
  return (
    <>
      <Sprite src="pond/reed_clump.png" x={60 + 0.9 * t} y={820} size={820} anchor={[0.5, 1]} blur={14}
        filter="brightness(0.3) saturate(0.5)" />
      <Sprite src="pond/reed_clump.png" x={1270 + 0.9 * t} y={860} size={700} anchor={[0.5, 1]} mirror blur={16}
        filter="brightness(0.25) saturate(0.5)" />
    </>
  );
};

export const Pond: React.FC = () => {
  const t = useTime();
  // Slow push on the egg; the reveal jolts the camera back out and it starts creeping in again.
  const zoom = t < REVEAL ? ramp(t, [0, REVEAL], [1, 1.12], inOut) : ramp(t, [REVEAL, 180], [1.0, 1.05]);
  return (
    <Film>
      <Camera zoom={zoom} y={t < REVEAL ? 10 : 0} hits={[CRACK, REVEAL, REVEAL + 1]} shake={7} handheld={1.5}>
        <Grade filter="saturate(0.8) contrast(1.08)" vignette={0.65}>
          <Set />
          <Chips />
          {/* The egg shares the blur with the hatch, so the frame of the swap blends one into the other. */}
          <MotionBlur samples={6} shutter={0.8}>
            <Egg />
            <Hatch />
          </MotionBlur>
          <Foreground />
        </Grade>
      </Camera>
      <Caption text="…starts small." from={REVEAL + 12} to={178} />
    </Film>
  );
};
