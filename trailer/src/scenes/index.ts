import type { SceneId } from "../timing";
import { ColdOpen } from "./ColdOpen";
import { Drop } from "./Drop";
import { Pause } from "./Pause";
import { Pond } from "./Pond";
import { Sky } from "./Sky";
import { Space } from "./Space";
import { TitleCard } from "./TitleCard";

export const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  coldOpen: ColdOpen,
  pond: Pond,
  sky: Sky,
  space: Space,
  pause: Pause,
  drop: Drop,
  title: TitleCard,
};
