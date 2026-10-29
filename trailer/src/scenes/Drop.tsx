import { Fragment, createContext, useContext } from "react";
import { random } from "remotion";
import { Camera } from "../components/Camera";
import { Film } from "../components/Film";
import { Grade } from "../components/Look";
import { Backdrop, Sprite } from "../components/Sprite";
import { flip, out, pulse, ramp, ring } from "../lib/anim";
import { MotionBlur, useTime } from "../lib/time";
import { BEAT, cues } from "../timing";

const QUACKS = cues("dropQuack", "drop");

// Start frame of the current shot, so motion-blur samples just before a cut stay in the new shot.
const ShotStart = createContext(0);

/** Frames since the start of the current shot. */
const useShot = () => useTime() - useContext(ShotStart);

// --- The shots ----------------------------------------------------------------------------------------------

/** An egg bursts open and its duck flies straight at the lens. */
const Hatch: React.FC<{ bg: string; egg: string; duck: string[] }> = ({ bg, egg, duck }) => {
  const s = useShot();
  const p = s - 3;
  return (
    <>
      <Backdrop src={bg} zoom={1.3} blur={4} />
      {p < 0 ? (
        <Sprite src={`eggs/${egg}_cracked.png`} x={640} y={370} size={300} rotate={ring(s, [0], 7, 5, 4)} />
      ) : (
        <MotionBlur samples={6} shutter={0.8}>
          <Burst egg={egg} duck={duck} />
        </MotionBlur>
      )}
    </>
  );
};

const Burst: React.FC<{ egg: string; duck: string[] }> = ({ egg, duck }) => {
  const p = useShot() - 3;
  return (
    <>
      <Sprite src={`eggs/${egg}_shell_top.png`} x={640 - 28 * p} y={300 - 30 * p + 1.5 * p * p} size={300} rotate={-22 * p} />
      <Sprite src={`eggs/${egg}_shell_bottom.png`} x={640 + 22 * p} y={430 + 14 * p + 1.5 * p * p} size={300} rotate={16 * p} />
      <Sprite src={duck[flip(p, 3, duck.length)]} x={640} y={380 - 6 * p} size={ramp(p, [0, 11], [180, 480], out)} />
    </>
  );
};

/** All five ducks in a row on the pond, bobbing on the beat. */
const Row: React.FC = () => {
  const s = useShot();
  const t = useTime();
  const colours = ["tan", "teal", "white", "chestnut", "dark_brown"];
  return (
    <>
      <Backdrop src="pond/bg.jpg" zoom={1.35} fy={0.62} dx={-3 * s} blur={2} />
      {colours.map((c, k) => {
        const squash = k === 2 ? 1 - 0.14 * pulse(t, QUACKS, 3) : 1;
        const x = 170 + 235 * k - 3 * s;
        const y = 520 + 5 * Math.sin(k + s / 3);
        return (
          <Fragment key={c}>
            <Sprite src="pond/ripple.png" x={x} y={y - 8} size={270} anchor={[0.5, 0.81]} opacity={0.7} />
            <Sprite src={`ducks/${c}_sit.png`} x={x} y={y} size={215} anchor={[0.5, 0.98]} sy={squash}
              sx={1 / Math.sqrt(squash)} />
          </Fragment>
        );
      })}
    </>
  );
};

const COINS = Array.from({ length: 34 }, (_, k) => ({
  angle: random(`ca${k}`) * Math.PI * 2,
  speed: 0.6 + random(`cs${k}`) * 0.8,
  spin: random(`cp${k}`) * 6,
}));

/** Quack coins burst out of the centre and past the camera, spinning edge-on like coins do. */
const Coins: React.FC = () => {
  const s = useShot();
  return (
    <>
      {COINS.map(({ angle, speed, spin }, k) => {
        const r = (30 + 70 * s * speed) * (1 + s * 0.05);
        return (
          <Sprite key={k} src="icons/quack.png" x={640 + Math.cos(angle) * r} y={360 + Math.sin(angle) * r * 0.75}
            size={50 + 10 * s * speed} sx={Math.cos(spin + s * 0.5)} rotate={angle * 20} />
        );
      })}
    </>
  );
};

const CoinShot: React.FC = () => (
  <>
    <Grade filter="brightness(0.5) saturate(0.7)" vignette={0}>
      <Backdrop src="pond/bg.jpg" zoom={1.6} fy={0.55} blur={10} />
    </Grade>
    <MotionBlur samples={10} shutter={0.8}>
      <Coins />
    </MotionBlur>
  </>
);

/** A V-formation banks hard across the frame. */
const Flock: React.FC = () => {
  const s = useShot();
  const t = useTime();
  const colours = ["teal", "white", "dark_brown", "tan", "chestnut"];
  const slots: [number, number][] = [[0, 0], [1, -1], [1, 1], [2, -2], [2, 2]];
  return (
    <>
      {slots.map(([back, side], k) => (
        <Sprite key={k} src={`ducks/${colours[k]}_fly_${flip(t, 2, 2, k) + 1}.png`}
          x={360 + 70 * s - back * 170} y={520 - 28 * s + side * 85 + back * 30} size={230} rotate={-18} />
      ))}
    </>
  );
};

const FlockShot: React.FC = () => (
  <>
    <Backdrop src="sky/bg.jpg" zoom={1.4} fx={0.35} fy={0.4} dx={-10 * useShot()} />
    <MotionBlur samples={12} shutter={0.8}>
      <Flock />
    </MotionBlur>
  </>
);

/** Astronaut ducks tumble past, with an asteroid whipping by in front. */
const Tumble: React.FC = () => {
  const s = useShot();
  return (
    <>
      <Sprite src="ducks/white_astro_2.png" x={1100 - 34 * s} y={210 + 10 * s} size={170} rotate={-40 * s / 15} />
      <Sprite src="ducks/teal_astro_2.png" x={260 + 26 * s} y={440 - 12 * s} size={300} rotate={20 + 3 * s} />
      <Sprite src="ducks/chestnut_astro_1.png" x={900 - 20 * s} y={560 - 6 * s} size={200} rotate={-12 * s} />
      <Sprite src="space/asteroid.png" x={1500 - 120 * s} y={260 + 20 * s} size={700} blur={9} rotate={6 * s}
        filter="brightness(0.35)" />
    </>
  );
};

const TumbleShot: React.FC = () => (
  <>
    <Grade filter="brightness(0.75) saturate(0.85)" vignette={0}>
      <Backdrop src="space/bg.jpg" zoom={1.3} fx={0.45} dx={-6 * useShot()} />
    </Grade>
    <MotionBlur samples={6} shutter={0.8}>
      <Tumble />
    </MotionBlur>
  </>
);

/** Three panels, one per level, slam in one after the other. */
const Triptych: React.FC = () => {
  const s = useShot();
  const panels = [
    { bg: "pond/bg.jpg", fx: 0.5, duck: "ducks/teal_sit.png", rotate: 0 },
    { bg: "sky/bg.jpg", fx: 0.45, duck: `ducks/white_fly_${flip(s, 3) + 1}.png`, rotate: -8 },
    { bg: "space/bg.jpg", fx: 0.35, duck: "ducks/tan_astro_1.png", rotate: 10 },
  ];
  return (
    <>
      {panels.map((p, k) => {
        const local = s - 2 * k;
        if (local < 0) return null;
        const slide = ramp(local, [0, 4], [k % 2 ? -560 : 560, 0], out);
        return (
          <div key={k} style={{ position: "absolute", left: 6 + k * 425, top: 0, width: 418, height: 720,
            overflow: "hidden", transform: `translateY(${slide}px)` }}>
            <div style={{ position: "absolute", left: 209 - 640, top: 0, width: 1280, height: 720 }}>
              <Backdrop src={p.bg} zoom={1.15} fx={p.fx} />
              <Sprite src={p.duck} x={640} y={380} size={250} rotate={p.rotate} />
            </div>
          </div>
        );
      })}
    </>
  );
};

/** The flag comes down and plants itself in the moon. */
const Flag: React.FC = () => {
  const s = useShot();
  const land = 2;
  const y = s < land ? ramp(s, [0, land], [-60, 392]) : 392;
  return (
    <>
      <Grade filter="brightness(0.6) saturate(0.8)" vignette={0}>
        <Backdrop src="space/bg.jpg" zoom={1.4} fx={0.6} fy={0.4} />
      </Grade>
      <Sprite src="outro/moon.png" x={640} y={900} size={1100} rotate={-0.3 * s} />
      <MotionBlur samples={5} shutter={0.9}>
        <FlagPole y={y} />
      </MotionBlur>
      {s >= land &&
        [-1, -0.6, -0.25, 0.3, 0.7, 1].map((dir, k) => {
          const p = s - land;
          return (
            <div key={k} style={{
              position: "absolute", left: 600 + dir * (14 + 16 * p), top: 388 - (5 + 3 * k) * p + 0.8 * p * p,
              width: 10 + 2 * p, height: 10 + 2 * p, borderRadius: "50%", background: "rgba(205,215,240,0.7)",
              opacity: ramp(p, [0, 12], [1, 0]),
            }} />
          );
        })}
    </>
  );
};

const FlagPole: React.FC<{ y: number }> = ({ y }) => {
  const s = useShot();
  return <Sprite src="outro/flag.png" x={600} y={y} size={260} anchor={[0.17, 0.98]} rotate={s >= 2 ? ring(s, [2], 5, 4, 7) : 0} />;
};

// --- Cut list: one shot per beat ------------------------------------------------------------------------------

const SHOTS: React.FC[] = [
  () => <Hatch bg="sky/bg.jpg" egg="cloud" duck={["ducks/white_fly_1.png", "ducks/white_fly_2.png"]} />,
  Row,
  CoinShot,
  FlockShot,
  () => <Hatch bg="space/bg.jpg" egg="pod" duck={["ducks/teal_astro_2.png"]} />,
  TumbleShot,
  Triptych,
  Flag,
];

export const Drop: React.FC = () => {
  const t = useTime();
  const k = Math.min(SHOTS.length - 1, Math.floor(t / BEAT));
  const s = t - k * BEAT;
  const Shot = SHOTS[k];
  return (
    <Film>
      {/* Colour comes back over the montage, and every cut lands with a short punch-in. */}
      <Grade filter={`saturate(${ramp(t, [0, 120], [0.75, 1])}) contrast(1.1)`} vignette={0.5}>
        <Camera zoom={ramp(s, [0, 6], [1.1, 1], out)} hits={[k * BEAT]} shake={5} seed={`drop${k}`}>
          <ShotStart.Provider value={k * BEAT}>
            <Shot />
          </ShotStart.Provider>
        </Camera>
      </Grade>
    </Film>
  );
};
