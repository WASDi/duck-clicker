import "./lib/fonts";
import { Composition, Folder } from "remotion";
import { SCENE_COMPONENTS } from "./scenes";
import { DURATION, FPS, HEIGHT, SCENES, WIDTH } from "./timing";
import { Trailer } from "./Trailer";

const size = { fps: FPS, width: WIDTH, height: HEIGHT };

export const Root: React.FC = () => (
  <>
    <Composition id="Trailer" component={Trailer} durationInFrames={DURATION} {...size} />
    <Folder name="Scenes">
      {SCENES.map(({ id, duration }) => (
        <Composition key={id} id={id} component={SCENE_COMPONENTS[id]} durationInFrames={duration} {...size} />
      ))}
    </Folder>
  </>
);
