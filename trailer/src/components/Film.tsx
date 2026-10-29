import { AbsoluteFill } from "remotion";
import { Grain, Letterbox } from "./Look";

/** The frame every shot sits in: black background, grain over the picture, then the letterbox bars. */
export const Film: React.FC<{ open?: number; grain?: number; children: React.ReactNode }> = ({
  open = 0, grain = 0.1, children,
}) => (
  <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
    {children}
    {grain > 0 && <Grain amount={grain} />}
    <Letterbox open={open} />
  </AbsoluteFill>
);
