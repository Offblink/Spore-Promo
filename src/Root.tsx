import { Composition } from 'remotion';
import { SporePromo } from './SporePromo';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="SporePromo"
    component={SporePromo}
    durationInFrames={2100}
    fps={30}
    width={1920}
    height={1080}
  />
);
