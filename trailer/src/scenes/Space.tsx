import { AbsoluteFill, random } from "remotion";
import { Camera } from "../components/Camera";
import { Film } from "../components/Film";
import { Grade } from "../components/Look";
import { Backdrop, Sprite } from "../components/Sprite";
import { Easing, inOut, noise, pulse, ramp } from "../lib/anim";
import { MotionBlur, useTime } from "../lib/time";
import { BAR, BEAT, cue } from "../timing";

const GATE = cue("gate", "space");
const BEACON = cue("beacon", "space");
const WARP = 2 * BAR; // bar 10: the build

// Taiko pattern of bars 8 and 9 (beats 1, 2, 3, 3+, 4), as frames for the camera to react to.
const HITS = [0, BAR].flatMap((bar) => [0, 1, 2, 2.5, 3].map((b) => bar + b * BEAT));

// --- Shot A: flying up into the stratosphere gate and through its arch ------------------------------------

// Small clouds rushing outward from the centre, in simple perspective.
const PUFFS = Array.from({ length: 9 }, (_, k) => ({
  angle: random(`pa${k}`) * Math.PI * 2,
  z0: 0.4 + random(`pz${k}`) * 1.2,
}));

const Puffs: React.FC = () => {
  const t = useTime();
  return (
    <>
      {PUFFS.map(({ angle, z0 }, k) => {
        const z = z0 - 0.028 * t;
        if (z < 0.08) return null;
        return (
          <Sprite key={k} src="sky/small_cloud.png" x={640 + (Math.cos(angle) * 160) / z}
            y={380 + (Math.sin(angle) * 110) / z} size={70 / z} blur={Math.min(10, 0.6 / z)}
            opacity={ramp(z, [0.08, 0.2, 1.2, 1.6], [0, 1, 1, 0])} />
        );
      })}
    </>
  );
};

const Ascent: React.FC = () => {
  const t = useTime();
  return (
    <>
      <Grade filter={`brightness(${ramp(t, [0, GATE], [0.95, 0.5])}) hue-rotate(${ramp(t, [0, GATE], [0, 18])}deg)`}
        vignette={0}>
        <Backdrop src="sky/bg.jpg" zoom={1.2 + 0.01 * t} fx={0.62} fy={0.3} />
      </Grade>
      <MotionBlur samples={5} shutter={0.8}>
        <Puffs />
      </MotionBlur>
      <MotionBlur samples={6} shutter={0.7}>
        <Gate />
      </MotionBlur>
      {/* The arch's light fills the lens as we pass through. */}
      <AbsoluteFill style={{ background: "#f4f0ff", opacity: ramp(t, [GATE - 8, GATE], [0, 0.85], Easing.in(Easing.quad)) }} />
    </>
  );
};

const Gate: React.FC = () => {
  const t = useTime();
  // Opening of the arch (x 0.51, y 0.72 of the sprite) stays centred, so the camera flies straight through.
  return <Sprite src="sky/stratosphere_gate.png" x={640} y={392} size={260 * Math.exp(t / 14.4)} anchor={[0.51, 0.72]} />;
};

// --- Shot B: astronaut ducks drifting between asteroids; the beacon fires on the hit -----------------------

const Drift: React.FC = () => {
  const t = useTime();
  const s = t - GATE;
  const lit = t >= BEACON;
  const glow = pulse(t, [BEACON], 18) * 0.6 + (lit ? 0.4 + 0.05 * noise("flicker", t, 3) : 0);
  const beacon = { x: 985, y: 405 };
  return (
    <>
      <Grade filter={`brightness(${0.62 + 0.3 * pulse(t, [BEACON], 10)}) saturate(0.75) contrast(1.15)`}
        tint="#1b2a6b" vignette={0}>
        <Backdrop src="space/bg.jpg" zoom={1.35} fx={0.42} fy={0.5} dx={-0.8 * s} blur={1.5} />
      </Grade>
      <Sprite src="space/asteroid.png" x={300 - 0.9 * s} y={210} size={110} rotate={0.4 * s} blur={1.5}
        filter="brightness(0.6)" />
      <Sprite src="space/asteroid.png" x={1160 - 1.2 * s} y={190} size={80} rotate={-0.6 * s} blur={2}
        filter="brightness(0.55)" />
      <Sprite src="ducks/white_astro_1.png" x={760 - 0.6 * s} y={240 + 6 * Math.sin(s / 14)} size={105}
        rotate={12 - 0.3 * s} blur={1.2} filter="brightness(0.75)" />

      {/* Beacon light: a pool around the dish and an expanding ring when it fires. */}
      <div style={{
        position: "absolute", left: beacon.x - 1.5 * s - 420, top: beacon.y - 160 - 420, width: 840, height: 840,
        background: "radial-gradient(circle, rgba(255,238,170,0.9), rgba(255,200,90,0.25) 22%, transparent 60%)",
        opacity: glow, mixBlendMode: "screen",
      }} />
      {t >= BEACON && t < BEACON + 26 && (
        <svg width="1280" height="720" style={{ position: "absolute" }}>
          <ellipse cx={beacon.x - 1.5 * s} cy={beacon.y - 160} rx={(t - BEACON) * 30} ry={(t - BEACON) * 10}
            fill="none" stroke="#ffe6a0" strokeWidth={3} opacity={ramp(t, [BEACON, BEACON + 26], [0.8, 0])} />
        </svg>
      )}
      <Sprite src="space/asteroid.png" x={beacon.x - 1.5 * s} y={beacon.y + 95} size={300} rotate={-8}
        filter="brightness(0.7)" />
      <Sprite src={lit ? "space/galactic_beacon_lit.png" : "space/galactic_beacon.png"} x={beacon.x - 1.5 * s}
        y={beacon.y + 10} size={290} anchor={[0.5, 1]} filter={`brightness(${0.75 + 0.5 * glow})`} />

      <Sprite src="ducks/teal_astro_1.png" x={430 - 0.4 * s} y={350 + 10 * Math.sin(s / 16)}
        size={250} rotate={-14 + 0.18 * s} filter={`brightness(${0.85 + 0.35 * glow})`} />
      <Sprite src="ducks/chestnut_astro_2.png" x={190 + 0.5 * s} y={520 - 0.3 * s} size={150} rotate={20 + 0.5 * s}
        blur={1.5} filter="brightness(0.7)" />
      <Sprite src="space/asteroid.png" x={80 - 2.8 * s} y={650} size={560} rotate={0.3 * s} blur={11}
        filter="brightness(0.3)" />
      <AbsoluteFill style={{ background: "#fff8e6", opacity: pulse(t, [BEACON], 4) * 0.35, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: "#f4f0ff", opacity: ramp(t, [GATE, GATE + 8], [0.85, 0]) }} />
    </>
  );
};

// --- Shot C: the build. Stars stretch into streaks as the hero duck flies at the lens ----------------------

const STARS = Array.from({ length: 150 }, (_, k) => ({
  angle: random(`sa${k}`) * Math.PI * 2,
  z0: random(`sz${k}`),
  bright: 0.4 + 0.6 * random(`sb${k}`),
}));

/** Distance travelled after s frames of the shot; the speed keeps climbing. */
const travel = (s: number) => 0.01 * s + 0.0006 * s * s;

const Stars: React.FC = () => {
  const s = useTime() - WARP;
  const d = travel(s);
  const prev = travel(s - 1.5);
  return (
    <svg width="1280" height="720" style={{ position: "absolute" }}>
      {STARS.map(({ angle, z0, bright }, k) => {
        const z = ((((z0 - d) % 1) + 1) % 1) + 0.05;
        const zp = z + (d - prev);
        if (zp > 1.05) return null;
        const r = 70 / z;
        const rp = 70 / zp;
        const c = Math.cos(angle);
        const n = Math.sin(angle) * 0.8;
        return (
          <line key={k} x1={640 + c * rp} y1={360 + n * rp} x2={640 + c * r} y2={360 + n * r} stroke="white"
            strokeWidth={ramp(z, [0.05, 1], [3, 0.8])} strokeLinecap="round"
            opacity={bright * ramp(z, [0.05, 0.35, 0.6], [1, 0.8, 0])} />
        );
      })}
    </svg>
  );
};

const Warp: React.FC = () => {
  const t = useTime();
  const s = t - WARP;
  return (
    <>
      <Grade filter="brightness(0.4) saturate(0.7)" tint="#1b2a6b" vignette={0}>
        <Backdrop src="space/bg.jpg" zoom={1.4 + 0.004 * s} fx={0.6} fy={0.45} blur={3} />
      </Grade>
      <Stars />
      <Sprite src={`ducks/teal_astro_${s < 32 ? 1 : 2}.png`} x={620 + 8 * noise("wx", t, 9)} y={360 + 8 * noise("wy", t, 11)}
        size={ramp(s, [0, 60], [200, 330], Easing.in(Easing.quad))} rotate={-10 + 0.35 * s} />
    </>
  );
};

export const Space: React.FC = () => {
  const t = useTime();
  // Bar 10 is all eighths, then sixteenths for the last two beats.
  const build = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => WARP + (k < 4 ? k * 7.5 : 30 + (k - 4) * 3.75));
  return (
    <Film>
      <Grade filter="contrast(1.05)" vignette={0.6}>
        {t < GATE ? (
          <Camera zoom={1} hits={HITS} shake={3} seed="spaceA">
            <Ascent />
          </Camera>
        ) : t < WARP ? (
          <Camera zoom={ramp(t, [GATE, WARP], [1.0, 1.06], inOut)} hits={[...HITS, BEACON]} shake={4} seed="spaceB">
            <Drift />
          </Camera>
        ) : (
          <Camera zoom={ramp(t, [WARP, WARP + 60], [1, 1.18], Easing.in(Easing.quad))} hits={build}
            shake={ramp(t, [WARP, WARP + 60], [1.5, 6])} handheld={ramp(t, [WARP, WARP + 60], [1, 6])} seed="spaceC">
            <Warp />
          </Camera>
        )}
      </Grade>
    </Film>
  );
};
