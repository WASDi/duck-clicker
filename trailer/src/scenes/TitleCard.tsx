import { AbsoluteFill } from "remotion";
import { Film } from "../components/Film";
import { Backdrop, Sprite } from "../components/Sprite";
import { flip, out, ramp, ring } from "../lib/anim";
import { SNIGLET } from "../lib/fonts";
import { useTime } from "../lib/time";
import { cue, scene } from "../timing";

const QUACK = cue("lastQuack", "title");
const END = scene("title").duration;

// Banner colours (tools/make_banner.py).
const YELLOW = "rgb(255,214,64)";
const BROWN = "rgb(92,52,14)";
const NAVY = "rgb(20,40,90)";

/** Outlined text, drawn twice (outline behind, fill in front) so the stroke never eats into the letters. */
const Outlined: React.FC<{ text: string; size: number; weight: number; fill: string; stroke: string; width: number }> = ({
  text, size, weight, fill, stroke, width,
}) => {
  const base: React.CSSProperties = { fontFamily: SNIGLET, fontSize: size, fontWeight: weight, whiteSpace: "nowrap" };
  return (
    <div style={{ position: "relative" }}>
      <div style={{ ...base, color: stroke, WebkitTextStroke: `${width}px ${stroke}`, textShadow: "0 7px 0 rgba(0,0,0,0.28)" }}>
        {text}
      </div>
      <div style={{ ...base, color: fill, position: "absolute", inset: 0 }}>{text}</div>
    </div>
  );
};

// Pond, Sky and Space side by side with soft seams, like the README banner.
const Panorama: React.FC = () => {
  const t = useTime();
  const mask = (stops: string) => ({
    position: "absolute" as const, inset: 0,
    WebkitMaskImage: `linear-gradient(to right, ${stops})`, maskImage: `linear-gradient(to right, ${stops})`,
  });
  return (
    <AbsoluteFill style={{ transform: `scale(${ramp(t, [0, END], [1.02, 1.07])})` }}>
      <Backdrop src="sky/bg.jpg" zoom={1.05} fy={0.42} />
      <div style={mask("black 22%, transparent 40%")}>
        <Backdrop src="pond/bg.jpg" zoom={1.05} fx={0.6} fy={0.4} />
      </div>
      <div style={mask("transparent 60%, black 78%")}>
        <Backdrop src="space/bg.jpg" zoom={1.05} fx={0.4} fy={0.45} />
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(rgba(10,20,50,0.3), transparent 30%, transparent 70%, rgba(10,20,50,0.35))" }} />
    </AbsoluteFill>
  );
};

const Ducks: React.FC = () => {
  const t = useTime();
  const p = t - QUACK;
  // The teal duck gets the last word: a squash and a little hop on the final quack.
  const sy = p < 0 ? 1 : p < 2 ? ramp(p, [0, 2], [1, 0.85]) : 1 + ring(p, [2], 0.12, 4, 9);
  const hop = p > 2 && p < 10 ? -Math.sin(((p - 2) / 8) * Math.PI) * 18 : 0;
  return (
    <>
      <Sprite src="ducks/teal_sit.png" x={175} y={640 + hop} size={300} anchor={[0.51, 0.98]} sy={sy} sx={1 / Math.sqrt(sy)} />
      <Sprite src={`ducks/white_fly_${flip(t, 5) + 1}.png`} x={790 + 0.4 * t} y={585 - 0.2 * t} size={170} rotate={8} />
      <Sprite src="ducks/tan_astro_1.png" x={1110} y={470 + 8 * Math.sin(t / 18)} size={270} rotate={-10 + 0.05 * t} />
    </>
  );
};

export const TitleCard: React.FC = () => {
  const t = useTime();
  const titleIn = ramp(t, [0, 6], [0, 1], out);
  const fadeOut = ramp(t, [END - 14, END - 2], [0, 1]);
  return (
    <Film open={ramp(t, [0, 12], [0, 1], out)} grain={0}>
      <Panorama />
      <Ducks />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 200 }}>
        <div style={{ transform: `scale(${1.35 - 0.35 * titleIn})`, opacity: Math.min(1, titleIn * 3) }}>
          <Outlined text="Duck Clicker" size={128} weight={800} fill={YELLOW} stroke={BROWN} width={18} />
        </div>
        <div style={{ marginTop: 6, opacity: ramp(t, [10, 16], [0, 1]), transform: `translateY(${ramp(t, [10, 16], [12, 0], out)}px)` }}>
          <Outlined text="Pond  ·  Sky  ·  Space" size={38} weight={800} fill="white" stroke={NAVY} width={10} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 46 }}>
        <div style={{ opacity: ramp(t, [26, 34], [0, 1]) }}>
          <Outlined text="Play free in your browser" size={30} weight={800} fill="white" stroke={NAVY} width={9} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "black", opacity: fadeOut }} />
    </Film>
  );
};
