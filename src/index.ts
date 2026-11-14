import { createElement, Fragment } from 'react';
import { registerRoot } from 'remotion';
import { RemotionRoot } from './RootAudio';
import { RemotionRootV2 } from './v2/Promo';

/**
 * 两个合成并存：`SporePromo`（v1，70s 六段式，保留不动）与 `SporePromoV2`（v2，80s，按文档重做）。
 * 渲染时显式给 id：`npx remotion render src/index.ts SporePromoV2 ...`
 * （本文件是 .ts，不能写 JSX，故用 createElement。）
 */
const Root = () => createElement(Fragment, null, createElement(RemotionRoot), createElement(RemotionRootV2));

registerRoot(Root);
