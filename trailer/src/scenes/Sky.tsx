import { AbsoluteFill, random } from "remotion";
import { Camera } from "../components/Camera";
import { Film } from "../components/Film";
import { Grade } from "../components/Look";
import { Backdrop, Sprite } from "../components/Sprite";
import { Easing, flip, noise, ramp } from "../lib/anim";
import { MotionBlur, useTime } from "../lib/time";
import { BAR, BEAT, cue } from "../timing";

const FLYBY = cue("flyby", "sky");
const TRACK = BAR; // second shot starts on bar 7
const CLOUD = 450 / 768;

const COLOURS = ["teal", "white", "tan", "chestnut", "dark_brown"];
// V-formation slots behind the leader: [back, side].
const SLOTS: [number, number][] = [[0, 0], [1, -1], [1, 1], [2, -2], [2, 2]];

// Shot A: the camera climbs out of a cloud bank, then a V of ducks tears past.
const Climb: React.FC = () => {
  const t = useTime();
  return (
    <>
      <Backdrop src="sky/bg.jpg" zoom={1.3} fx={0.5} fy={0.42} dy={-60 + 1.2 * t} />
      <Sprite src="sky/small_cloud.png" x={260 - 0.6 * t} y={300 + 1.5 * t} size={160} blur={1.5} opacity={0.9} />
      <Sprite src="sky/small_cloud.png" x={1010 - 0.4 * t} y={250 + 1.2 * t} size={120} blur={2} opacity={0.85} />
      <MotionBlur samples={5} shutter={0.8}>
        <Wipe />
      </MotionBlur>
      <MotionBlur samples={10} shutter={0.8}>
        <Formation />
      </MotionBlur>
    </>
  );
};

// The cloud the camera starts inside: a white-out that clears as three big clouds drop out of frame.
const Wipe: React.FC = () => {
  const t = useTime();
  const lift = ramp(t, [0, 24], [0, 1], Easing.in(Easing.quad));
  if (t > 26) return null;
  return (
    <>
      <AbsoluteFill style={{ background: "#eef4fb", opacity: ramp(t, [0, 9], [1, 0]) }} />
      <Sprite src="sky/cloud.png" x={300} y={260 + 1100 * lift} size={1500} aspect={CLOUD} blur={6} />
      <Sprite src="sky/cloud.png" x={1020} y={420 + 1000 * lift} size={1500} aspect={CLOUD} blur={6} mirror />
      <Sprite src="sky/cloud.png" x={640} y={560 + 900 * lift} size={1800} aspect={CLOUD} blur={8} />
    </>
  );
};

const Formation: React.FC = () => {
  const t = useTime();
  const dt = t - FLYBY;
  if (dt < -24 || dt > 22) return null;
  const scale = ramp(dt, [-24, 22], [0.7, 1.25]);
  const cx = 640 + 46 * dt;
  const cy = 360 - 4 * dt;
  return (
    <>
      {SLOTS.map(([back, side], k) => (
        <Sprite
          key={k}
          src={`ducks/${COLOURS[k]}_fly_${flip(t, 3, 2, k) + 1}.png`}
          x={cx - back * 120 * scale}
          y={cy + side * 62 * scale + 3 * noise(`v${k}`, t, 12)}
          size={165 * scale}
          rotate={-6}
        />
      ))}
    </>
  );
};

// Shot B: tracking alongside the teal duck while clouds stream past at different depths.
const STREAKS = Array.from({ length: 14 }, (_, k) => ({
  y: 120 + random(`sy${k}`) * 480,
  phase: random(`sp${k}`),
  len: 80 + random(`sl${k}`) * 160,
}));

const Streaks: React.FC = () => {
  const t = useTime();
  return (
    <>
      {STREAKS.map(({ y, phase, len }, k) => {
        const x = 1400 - (((t * 70 + phase * 1700) % 1700) + 1700) % 1700;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: len,
              height: 2,
              borderRadius: 1,
              background: "rgba(255,255,255,0.45)",
            }}
          />
        );
      })}
    </>
  );
};

const Passing: React.FC<{ near: boolean }> = ({ near }) => {
  const t = useTime() - TRACK;
  const clouds = near
    ? [{ x: 1700, y: 610, size: 900, speed: 42, blur: 7 }]
    : [
        { x: 900, y: 200, size: 420, speed: 14, blur: 2 },
        { x: 1500, y: 520, size: 360, speed: 18, blur: 2.5 },
        { x: 2100, y: 300, size: 500, speed: 16, blur: 2 },
      ];
  return (
    <>
      {clouds.map((c, k) => (
        <Sprite key={k} src="sky/cloud.png" x={c.x - c.speed * t} y={c.y} size={c.size} aspect={CLOUD} blur={c.blur}
          mirror={k % 2 === 1} />
      ))}
    </>
  );
};

const Track: React.FC = () => {
  const t = useTime();
  const s = t - TRACK;
  return (
    <>
      <Backdrop src="sky/bg.jpg" zoom={1.7} fx={0.42} fy={0.45} dx={-7 * s} />
      <MotionBlur samples={5} shutter={0.8}>
        <Passing near={false} />
      </MotionBlur>
      <MotionBlur samples={4} shutter={1}>
        <Streaks />
      </MotionBlur>
      <Sprite
        src={`ducks/teal_fly_${flip(t, 4) + 1}.png`}
        x={540 + 10 * noise("hx", t, 25)}
        y={350 + 14 * Math.sin(s / 6) + 6 * noise("hy", t, 20)}
        size={340}
        rotate={-5 + 2 * Math.sin(s / 6)}
      />
      <MotionBlur samples={6} shutter={0.8}>
        <Passing near />
      </MotionBlur>
    </>
  );
};

export const Sky: React.FC = () => {
  const t = useTime();
  const beats = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => k * BEAT);
  return (
    <Film>
      <Grade filter="saturate(0.72) contrast(1.12) brightness(0.95)" tint="#2f7fa8" vignette={0.55}>
        {t < TRACK ? (
          <Camera zoom={ramp(t, [0, TRACK], [1.08, 1])} hits={beats} shake={2.5} seed="skyA">
            <Climb />
          </Camera>
        ) : (
          <Camera zoom={1.04} rotate={-2} hits={beats} shake={2.5} handheld={3} seed="skyB">
            <Track />
          </Camera>
        )}
      </Grade>
    </Film>
  );
};
