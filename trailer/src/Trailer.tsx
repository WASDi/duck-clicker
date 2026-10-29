import { AbsoluteFill, Html5Audio, Sequence, useRemotionEnvironment } from "remotion";
import soundtrack from "./audio/soundtrack.wav";
import { SCENE_COMPONENTS } from "./scenes";
import { SCENES } from "./timing";

// The full cut. The soundtrack (music and SFX, from tools/make_trailer_music.py) only plays in Studio: Remotion's
// audio pipeline needs its bundled FFmpeg (macOS 15+), so scripts/render.mjs muxes the same file in instead.
export const Trailer: React.FC = () => {
  const { isStudio } = useRemotionEnvironment();
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {SCENES.map(({ id, from, duration }) => {
        const Scene = SCENE_COMPONENTS[id];
        return (
          <Sequence key={id} name={id} from={from} durationInFrames={duration}>
            <Scene />
          </Sequence>
        );
      })}
      {isStudio && <Html5Audio src={soundtrack} />}
    </AbsoluteFill>
  );
};
