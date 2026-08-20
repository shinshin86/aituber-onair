import {
  createAnime25RigAvatar,
  type Anime25RigAvatar,
} from '../../react-psd-app/src/lib/rig/anime25Renderer.js';
import {
  detectAnime25RigFromBuffer,
  type Anime25RigDetection,
  type Anime25Rigger,
} from '../../react-psd-app/src/lib/rig/anime25Rig.js';
// @ts-expect-error The vendored MIT UMD module intentionally has no types.
import vendoredRigger from '../../react-psd-app/src/vendor/anime25drig/rigger.js';

const riggerModule = vendoredRigger as Anime25Rigger & {
  default?: Anime25Rigger;
};
globalThis.Rigger = riggerModule.default ?? riggerModule;

export interface MotionRuntimeLoadResult {
  detection: Anime25RigDetection;
  avatar: Anime25RigAvatar | null;
}

/** Detect and, when eligible, mount the sibling Anime2.5DRig renderer. */
export async function loadMotionRuntime(
  canvas: HTMLCanvasElement,
  psdBuffer: ArrayBuffer,
): Promise<MotionRuntimeLoadResult> {
  const detection = await detectAnime25RigFromBuffer(psdBuffer);
  if (!detection.usable || !detection.rig) {
    return { detection, avatar: null };
  }
  return {
    detection,
    avatar: createAnime25RigAvatar(canvas, detection.rig),
  };
}
