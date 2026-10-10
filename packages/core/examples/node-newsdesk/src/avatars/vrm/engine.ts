import {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  Box3,
  DirectionalLight,
  LoopRepeat,
  type Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  type VRM,
  VRMExpressionPresetName,
  VRMLoaderPlugin,
  VRMUtils,
} from '@pixiv/three-vrm';
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
  type VRMAnimation,
} from '@pixiv/three-vrm-animation';
import { DEFAULT_AVATAR_FRAMING, DEFAULT_AVATAR_LIGHTING } from './defaults.js';
import { EMOTION_CANDIDATES } from './expressions.js';
import type { LineEmotion } from '../../types.js';

const DEFAULT_VISIBLE_WIDTH_RATIO = 0.72;
// Leave room for the audio-driven mouth and seeded blink expressions.
const EMOTION_WEIGHT = 0.35;
const PORTRAIT_MAX_WIDTH_DISTANCE_RATIO = 1.12;
const DEFAULT_CAMERA_HEIGHT_OFFSET_RATIO = 0.0;
const DEFAULT_MODEL_X_OFFSET = 0.0;
const DEFAULT_MODEL_Y_ROTATION = -0.12;

interface HarnessLoadOptions {
  vrmUrl: string;
  vrmaUrl?: string;
  width: number;
  height: number;
  avatarFraming?: {
    visibleHeightRatio?: number;
    lookAtHeightRatio?: number;
  };
  avatarLighting?: {
    ambientIntensity?: number;
    directionalIntensity?: number;
  };
}

interface HarnessFrameOptions {
  time: number;
  deltaSeconds: number;
  mouth: number;
  eyesClosed: boolean;
}

export interface HarnessDiagnostics {
  modelHeight: number;
  expressions: string[];
  mouthExpression: string | null;
  blinkExpression: string | null;
  animationLoaded: boolean;
  emotionExpressions: Partial<Record<LineEmotion, string>>;
  webglVersion: string;
  webglRenderer: string;
  cameraDistance: number;
  avatarFraming: {
    visibleHeightRatio: number;
    lookAtHeightRatio: number;
    portraitWidthAdjusted: boolean;
  };
  avatarLighting: {
    ambientIntensity: number;
    directionalIntensity: number;
  };
}

interface HarnessState {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  vrm: VRM;
  mixer: AnimationMixer | null;
  mouthExpression: string | null;
  blinkExpression: string | null;
}

function loadGltf(loader: GLTFLoader, url: string) {
  return new Promise<Awaited<ReturnType<GLTFLoader['loadAsync']>>>(
    (resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    },
  );
}

function resolveExpression(
  vrm: VRM,
  candidates: readonly string[],
): string | null {
  const manager = vrm.expressionManager;
  if (!manager) return null;
  return (
    candidates.find((candidate) => manager.getExpression(candidate)) ?? null
  );
}

async function loadAnimation(
  vrm: VRM,
  scene: Object3D,
  vrmaUrl: string | undefined,
): Promise<AnimationMixer | null> {
  if (!vrmaUrl) return null;
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  const gltf = await loadGltf(loader, vrmaUrl);
  const animations = gltf.userData.vrmAnimations as VRMAnimation[] | undefined;
  const animation = animations?.[0];
  if (!animation) throw new Error('The VRMA file contains no animation.');

  const clip = createVRMAnimationClip(animation, vrm);
  const hipsNodeName = vrm.humanoid.getNormalizedBoneNode('hips')?.name;
  const tracks = hipsNodeName
    ? clip.tracks.filter((track) => track.name !== `${hipsNodeName}.position`)
    : clip.tracks;
  const stabilized = new AnimationClip(clip.name, clip.duration, tracks);
  const mixer = new AnimationMixer(scene);
  const action = mixer.clipAction(stabilized);
  action.setLoop(LoopRepeat, Number.POSITIVE_INFINITY);
  action.play();
  return mixer;
}

export async function loadVrm(
  canvas: HTMLCanvasElement,
  options: HarnessLoadOptions,
) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setClearAlpha(0);
  renderer.setPixelRatio(1);
  renderer.setSize(options.width, options.height, false);

  const scene = new Scene();
  const camera = new PerspectiveCamera(
    30,
    options.width / options.height,
    0.1,
    30,
  );
  const ambientIntensity =
    options.avatarLighting?.ambientIntensity ??
    DEFAULT_AVATAR_LIGHTING.ambientIntensity;
  const directionalIntensity =
    options.avatarLighting?.directionalIntensity ??
    DEFAULT_AVATAR_LIGHTING.directionalIntensity;
  const ambientLight = new AmbientLight(0xffffff, ambientIntensity);
  const directionalLight = new DirectionalLight(0xffffff, directionalIntensity);
  directionalLight.position.set(1.0, 1.8, 1.2);
  scene.add(ambientLight, directionalLight);

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loadGltf(loader, options.vrmUrl);
  const vrm = gltf.userData.vrm as VRM | undefined;
  if (!vrm) throw new Error('The file did not load as a VRM model.');
  VRMUtils.rotateVRM0(vrm);

  const bounds = new Box3().setFromObject(vrm.scene);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  vrm.scene.position.x -= center.x;
  vrm.scene.position.z -= center.z;
  vrm.scene.position.y -= bounds.min.y;
  vrm.scene.position.x += DEFAULT_MODEL_X_OFFSET;
  vrm.scene.rotation.y += DEFAULT_MODEL_Y_ROTATION;

  const modelHeight = Math.max(size.y, 1.0);
  const modelWidth = Math.max(size.x, 0.6);
  const visibleHeightRatio =
    options.avatarFraming?.visibleHeightRatio ??
    DEFAULT_AVATAR_FRAMING.visibleHeightRatio;
  const lookAtHeightRatio =
    options.avatarFraming?.lookAtHeightRatio ??
    DEFAULT_AVATAR_FRAMING.lookAtHeightRatio;
  const verticalFov = (camera.fov * Math.PI) / 180;
  const horizontalFov =
    2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const visibleHeight = modelHeight * visibleHeightRatio;
  const visibleWidth = modelWidth * DEFAULT_VISIBLE_WIDTH_RATIO;
  const distanceByHeight = visibleHeight / (2 * Math.tan(verticalFov / 2));
  const distanceByWidth = visibleWidth / (2 * Math.tan(horizontalFov / 2));
  const isPortrait = camera.aspect < 1;
  const portraitWidthAdjusted =
    isPortrait && distanceByWidth > distanceByHeight;
  // A VRM's bind-pose width can be much wider than its visible portrait pose.
  // Height drives portrait framing; a real width overflow gets only a bounded
  // safety pullback so a T-pose cannot turn the shot back into a full body view.
  const distance = isPortrait
    ? portraitWidthAdjusted
      ? Math.min(
          distanceByWidth,
          distanceByHeight * PORTRAIT_MAX_WIDTH_DISTANCE_RATIO,
        )
      : distanceByHeight
    : Math.max(distanceByHeight, distanceByWidth);
  const lookAtY = modelHeight * lookAtHeightRatio;
  const lookAtX = DEFAULT_MODEL_X_OFFSET;
  const cameraY = lookAtY + modelHeight * DEFAULT_CAMERA_HEIGHT_OFFSET_RATIO;
  camera.position.set(lookAtX, cameraY, distance);
  camera.lookAt(lookAtX, lookAtY, 0);
  camera.near = 0.01;
  camera.far = Math.max(50, distance * 20);
  camera.updateProjectionMatrix();

  scene.add(vrm.scene);
  const mouthExpression = resolveExpression(vrm, [
    VRMExpressionPresetName.Aa,
    'aa',
    'a',
    'A',
  ]);
  const blinkExpression = resolveExpression(vrm, [
    VRMExpressionPresetName.Blink,
    'blink',
  ]);
  const mixer = await loadAnimation(vrm, vrm.scene, options.vrmaUrl);
  const emotionExpressions = new Map<LineEmotion, string>();
  for (const [emotion, candidates] of Object.entries(EMOTION_CANDIDATES)) {
    const expression = resolveExpression(vrm, candidates);
    if (expression) emotionExpressions.set(emotion as LineEmotion, expression);
  }
  const state: HarnessState = {
    renderer,
    scene,
    camera,
    vrm,
    mixer,
    mouthExpression,
    blinkExpression,
  };

  renderFrame({ time: 0, deltaSeconds: 0, mouth: 0, eyesClosed: false });
  const gl = renderer.getContext();
  const diagnostics: HarnessDiagnostics = {
    modelHeight,
    expressions: vrm.expressionManager
      ? Object.keys(vrm.expressionManager.expressionMap).sort()
      : [],
    mouthExpression,
    blinkExpression,
    animationLoaded: mixer !== null,
    emotionExpressions: Object.fromEntries(emotionExpressions),
    webglVersion: String(gl.getParameter(gl.VERSION)),
    webglRenderer: String(gl.getParameter(gl.RENDERER)),
    cameraDistance: distance,
    avatarFraming: {
      visibleHeightRatio,
      lookAtHeightRatio,
      portraitWidthAdjusted,
    },
    avatarLighting: {
      ambientIntensity,
      directionalIntensity,
    },
  };

  function renderFrame(
    options: HarnessFrameOptions & { emotion?: LineEmotion },
  ): void {
    const { renderer, scene, camera, vrm, mixer } = state;
    mixer?.update(options.deltaSeconds);
    // Apply only supported expressions; unsupported emotions retain a neutral face.
    if (options.emotion) {
      for (const name of emotionExpressions.values())
        vrm.expressionManager?.setValue(name, 0);
      const expression = emotionExpressions.get(options.emotion);
      if (expression)
        vrm.expressionManager?.setValue(expression, EMOTION_WEIGHT);
    }
    if (state.mouthExpression) {
      vrm.expressionManager?.setValue(state.mouthExpression, options.mouth);
    }
    if (state.blinkExpression) {
      vrm.expressionManager?.setValue(
        state.blinkExpression,
        options.eyesClosed ? 1 : 0,
      );
    }
    vrm.expressionManager?.update();
    vrm.update(options.deltaSeconds);
    renderer.clear();
    renderer.render(scene, camera);
  }

  return {
    diagnostics,
    renderFrame,
    dispose() {
      mixer?.stopAllAction();
      mixer?.uncacheRoot(vrm.scene);
      VRMUtils.deepDispose(vrm.scene);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
