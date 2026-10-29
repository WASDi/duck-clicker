import { Img } from "remotion";
import { asset } from "../lib/assets";

export interface SpriteProps {
  /** Path under public/assets. */
  src: string;
  /** Position of the anchor point on the stage. */
  x: number;
  y: number;
  /** Width in px; height is width × aspect. */
  size: number;
  aspect?: number;
  /** Anchor as a fraction of the box; also the pivot for rotate and scale. Default: centre. */
  anchor?: [number, number];
  rotate?: number;
  sx?: number;
  sy?: number;
  mirror?: boolean;
  opacity?: number;
  blur?: number;
  filter?: string;
}

export const Sprite: React.FC<SpriteProps> = ({
  src, x, y, size, aspect = 1, anchor = [0.5, 0.5], rotate = 0, sx = 1, sy = 1, mirror = false, opacity = 1,
  blur = 0, filter = "",
}) => {
  const h = size * aspect;
  return (
    <Img
      src={asset(src)}
      style={{
        position: "absolute",
        left: x - size * anchor[0],
        top: y - h * anchor[1],
        width: size,
        height: h,
        opacity,
        transformOrigin: `${anchor[0] * 100}% ${anchor[1] * 100}%`,
        transform: `rotate(${rotate}deg) scale(${sx * (mirror ? -1 : 1)}, ${sy})`,
        filter: `${blur > 0.2 ? `blur(${blur}px)` : ""} ${filter}`.trim() || undefined,
      }}
    />
  );
};

/** A 16:9 level background that covers the stage. (fx, fy) is the image point put at the stage centre. */
export const Backdrop: React.FC<{
  src: string;
  zoom?: number;
  fx?: number;
  fy?: number;
  dx?: number;
  dy?: number;
  blur?: number;
  filter?: string;
}> = ({ src, zoom = 1, fx = 0.5, fy = 0.5, dx = 0, dy = 0, blur = 0, filter = "" }) => {
  const w = 1280 * zoom;
  const h = 720 * zoom;
  return (
    <Img
      src={asset(src)}
      style={{
        position: "absolute",
        left: 640 - fx * w + dx,
        top: 360 - fy * h + dy,
        width: w,
        height: h,
        filter: `${blur > 0.2 ? `blur(${blur}px)` : ""} ${filter}`.trim() || undefined,
      }}
    />
  );
};
