import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ramp } from "../lib/anim";
import { SNIGLET } from "../lib/fonts";

/** Colour grade for a shot: a CSS filter over the picture, an optional tint, and a vignette. */
export const Grade: React.FC<{
  filter?: string;
  tint?: string;
  tintBlend?: React.CSSProperties["mixBlendMode"];
  vignette?: number;
  children: React.ReactNode;
}> = ({ filter, tint, tintBlend = "soft-light", vignette = 0.6, children }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <AbsoluteFill style={{ filter }}>{children}</AbsoluteFill>
    {tint && <AbsoluteFill style={{ backgroundColor: tint, mixBlendMode: tintBlend }} />}
    {vignette > 0 && (
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 45%, rgba(0,0,0,${vignette}) 100%)`,
        }}
      />
    )}
  </AbsoluteFill>
);

/** 2.39:1 bars. `open` 0 is letterboxed, 1 is full frame. */
export const Letterbox: React.FC<{ open?: number }> = ({ open = 0 }) => {
  const h = 92 * (1 - open);
  const bar: React.CSSProperties = { position: "absolute", left: 0, right: 0, height: h, background: "black" };
  return (
    <AbsoluteFill>
      <div style={{ ...bar, top: 0 }} />
      <div style={{ ...bar, bottom: 0 }} />
    </AbsoluteFill>
  );
};

/** Animated film grain: fresh fractal noise every frame, blended over the picture. */
export const Grain: React.FC<{ amount?: number }> = ({ amount = 0.1 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: amount, pointerEvents: "none" }}>
      <svg width="1280" height="720">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 97} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1280" height="720" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

/** Lower-third caption that fades in and out over `fade` frames between `from` and `to`. */
export const Caption: React.FC<{ text: string; from: number; to: number; fade?: number }> = ({
  text, from, to, fade = 10,
}) => {
  const t = useCurrentFrame();
  const opacity = Math.min(ramp(t, [from, from + fade], [0, 1]), ramp(t, [to - fade, to], [1, 0]));
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 118 }}>
      <div
        style={{
          fontFamily: SNIGLET,
          fontWeight: 400,
          fontSize: 30,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.92)",
          opacity,
          // Drift slightly while visible, like a title card on a slow dolly.
          transform: `translateY(${ramp(t, [from, to], [4, -4])}px)`,
          paddingLeft: "0.32em",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
