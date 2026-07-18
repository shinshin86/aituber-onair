import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  Box3,
  CanvasTexture,
  Clock,
  DirectionalLight,
  LoopRepeat,
  PerspectiveCamera,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  VRM,
  VRMExpressionPresetName,
  VRMLoaderPlugin,
  VRMUtils,
} from '@pixiv/three-vrm';
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
} from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import {
  VrmExpressionController,
  pickVrmIdleMotion,
  runVrmOneShotAnimation,
} from '../lib/vrmExpressionController';
import {
  DEFAULT_EMOTION_EFFECT_ANCHOR,
  MAX_EMOTION_EFFECT_SCALE,
  MIN_EMOTION_EFFECT_SCALE,
  normalizeEmotionEffectAnchor,
  type EmotionEffectAnchor,
} from '../lib/emotionEffectAnchor';
import {
  withVrmEmotionEffectReactionId,
  type VrmAvatarReaction,
  type VrmEmotionEffectReaction,
  type VrmEmotionEffectMap,
  type VrmReactionControlMode,
  type VrmReactionEmotion,
} from '../lib/vrmReactions';
import {
  EmotionEffectOverlay,
  type EmotionEffectGeometry,
  type EmotionEffectPlayback,
} from './EmotionEffectOverlay';
import {
  drawEmotionEffectAura,
  type EmotionEffect,
} from '../lib/emotionEffectRendering';

interface AvatarBackgroundProps {
  mouthLevel: number;
  isSpeaking: boolean;
  reaction?: VrmAvatarReaction | null;
  emotionEffectReaction?: VrmEmotionEffectReaction | null;
  reactionControlMode: VrmReactionControlMode;
  emotionEffectMap: VrmEmotionEffectMap;
  effectAnchor: EmotionEffectAnchor;
  onEffectAnchorChange: (anchor: EmotionEffectAnchor) => void;
  onEffectAnchorReset: () => void;
}

const VRM_FILE_URL = `${import.meta.env.BASE_URL}avatar/miko.vrm`;
const VRMA_FILE_URL = `${import.meta.env.BASE_URL}avatar/idle_loop.vrma`;
const MAX_MOUTH_LEVEL = 4;
const DEFAULT_VISIBLE_HEIGHT_RATIO = 0.39;
const DEFAULT_VISIBLE_WIDTH_RATIO = 0.72;
const DEFAULT_LOOK_AT_HEIGHT_RATIO = 0.8;
const DEFAULT_LOOK_AT_RAISE_RATIO = 0.045;
const DEFAULT_CAMERA_HEIGHT_OFFSET_RATIO = 0.0;
const DEFAULT_MIN_DISTANCE_RATIO = 0.9;
const DEFAULT_MAX_DISTANCE_RATIO = 1.32;
const DEFAULT_MODEL_X_OFFSET = 0.0;
const DEFAULT_MODEL_Y_ROTATION = -0.12;
const IDLE_MOTION_MIN_DELAY_MS = 4500;
const IDLE_MOTION_MAX_DELAY_MS = 9500;
const IDLE_MOTION_AFTER_REACTION_DELAY_MS = 4200;
const IDLE_MOTION_AFTER_SPEECH_DELAY_MS = 2600;
const MANUAL_EFFECT_DURATION_MS = 2600;
type EffectAnchorTarget = 'face' | 'leftEye' | 'rightEye';
const EFFECT_ANCHOR_TARGETS = [
  { target: 'face', label: '顔' },
  { target: 'leftEye', label: '左目' },
  { target: 'rightEye', label: '右目' },
] as const satisfies ReadonlyArray<{
  target: EffectAnchorTarget;
  label: string;
}>;
const AVATAR_EXPRESSION_OPTIONS = [
  { emotion: 'happy', label: '喜び' },
  { emotion: 'surprised', label: '驚き' },
  { emotion: 'sad', label: '悲しみ' },
  { emotion: 'angry', label: '怒り' },
  { emotion: 'relaxed', label: '安らぎ' },
  { emotion: 'thinking', label: '考え中' },
] as const satisfies ReadonlyArray<{
  emotion: VrmReactionEmotion;
  label: string;
}>;

const VRM_EFFECT_TEXTURE_SIZE = 256;
const VRM_AURA_TEXTURE_RADIUS = 124;
const VRM_RING_TEXTURE_RADIUS = 112;
const VRM_BACK_EFFECT_OCCLUSION_SCALE = 1.45;
const MIN_EFFECT_WEIGHT = 0.002;

interface VrmBackEffectSprites {
  auraCanvas: HTMLCanvasElement;
  auraTexture: CanvasTexture;
  auraMaterial: SpriteMaterial;
  auraSprite: Sprite;
  auraEffect: EmotionEffect | null;
  ringMaterial: SpriteMaterial;
  ringSprite: Sprite;
  ringTexture: CanvasTexture;
}

function createVrmBackEffectSprites(scene: Scene): VrmBackEffectSprites {
  const auraCanvas = document.createElement('canvas');
  auraCanvas.width = VRM_EFFECT_TEXTURE_SIZE;
  auraCanvas.height = VRM_EFFECT_TEXTURE_SIZE;
  const auraTexture = new CanvasTexture(auraCanvas);
  const auraMaterial = new SpriteMaterial({
    map: auraTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const auraSprite = new Sprite(auraMaterial);
  auraSprite.visible = false;
  auraSprite.renderOrder = -1001;
  auraSprite.frustumCulled = false;

  const ringCanvas = document.createElement('canvas');
  ringCanvas.width = VRM_EFFECT_TEXTURE_SIZE;
  ringCanvas.height = VRM_EFFECT_TEXTURE_SIZE;
  const ringContext = ringCanvas.getContext('2d');
  if (ringContext) {
    ringContext.strokeStyle = '#fff0a0';
    ringContext.lineWidth = 4;
    ringContext.beginPath();
    ringContext.arc(
      VRM_EFFECT_TEXTURE_SIZE / 2,
      VRM_EFFECT_TEXTURE_SIZE / 2,
      VRM_RING_TEXTURE_RADIUS,
      0,
      Math.PI * 2,
    );
    ringContext.stroke();
  }
  const ringTexture = new CanvasTexture(ringCanvas);
  const ringMaterial = new SpriteMaterial({
    map: ringTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const ringSprite = new Sprite(ringMaterial);
  ringSprite.visible = false;
  ringSprite.renderOrder = -1000;
  ringSprite.frustumCulled = false;

  scene.add(auraSprite);
  scene.add(ringSprite);
  return {
    auraCanvas,
    auraTexture,
    auraMaterial,
    auraSprite,
    auraEffect: null,
    ringMaterial,
    ringSprite,
    ringTexture,
  };
}

function positionVrmBackEffectSprite(
  sprite: Sprite,
  diameterPixels: number,
  geometry: EmotionEffectGeometry,
  bounds: Box3,
  camera: PerspectiveCamera,
  width: number,
  height: number,
): void {
  const ray = new Vector3(
    (geometry.faceX / width) * 2 - 1,
    1 - (geometry.faceY / height) * 2,
    0.5,
  )
    .unproject(camera)
    .sub(camera.position)
    .normalize();
  const boundsCenter = bounds.getCenter(new Vector3());
  const boundsRadius = bounds.getSize(new Vector3()).length() / 2;
  const rayDistance =
    camera.position.distanceTo(boundsCenter) + boundsRadius + 0.05;
  sprite.position.copy(camera.position).addScaledVector(ray, rayDistance);

  const cameraDirection = camera.getWorldDirection(new Vector3());
  const viewDepth = Math.max(rayDistance * ray.dot(cameraDirection), 0.1);
  const viewportWorldHeight =
    2 * Math.tan((camera.fov * Math.PI) / 360) * viewDepth;
  const spriteSize =
    (diameterPixels / Math.max(height, 1)) * viewportWorldHeight;
  sprite.scale.set(spriteSize, spriteSize, 1);
}

function updateVrmBackEffectSprites(
  sprites: VrmBackEffectSprites,
  playback: EmotionEffectPlayback,
  geometry: EmotionEffectGeometry,
  bounds: Box3,
  camera: PerspectiveCamera,
  width: number,
  height: number,
  now: number,
): void {
  const { effect, weight } = playback;
  if (!effect || weight < MIN_EFFECT_WEIGHT) {
    sprites.auraSprite.visible = false;
    sprites.ringSprite.visible = false;
    return;
  }

  if (sprites.auraEffect !== effect) {
    const context = sprites.auraCanvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, VRM_EFFECT_TEXTURE_SIZE, VRM_EFFECT_TEXTURE_SIZE);
      drawEmotionEffectAura(
        context,
        VRM_EFFECT_TEXTURE_SIZE / 2,
        VRM_EFFECT_TEXTURE_SIZE / 2,
        VRM_AURA_TEXTURE_RADIUS,
        effect,
        1,
      );
      sprites.auraTexture.needsUpdate = true;
    }
    sprites.auraEffect = effect;
  }

  const pulse = 0.94 + Math.sin(now * 0.004) * 0.06;
  const radiusScale = effect === 'angry' ? 0.45 : 0.39;
  const auraDiameter =
    geometry.unit *
    radiusScale *
    pulse *
    2 *
    (VRM_EFFECT_TEXTURE_SIZE / (VRM_AURA_TEXTURE_RADIUS * 2)) *
    VRM_BACK_EFFECT_OCCLUSION_SCALE;
  positionVrmBackEffectSprite(
    sprites.auraSprite,
    auraDiameter,
    geometry,
    bounds,
    camera,
    width,
    height,
  );
  sprites.auraMaterial.opacity = weight;
  sprites.auraSprite.visible = true;

  if (effect !== 'surprised') {
    sprites.ringSprite.visible = false;
    return;
  }
  const ringProgress = (now % 1100) / 1100;
  const ringRadius = geometry.unit * (0.2 + ringProgress * 0.22);
  const ringDiameter =
    ringRadius *
    2 *
    (VRM_EFFECT_TEXTURE_SIZE / (VRM_RING_TEXTURE_RADIUS * 2)) *
    VRM_BACK_EFFECT_OCCLUSION_SCALE;
  positionVrmBackEffectSprite(
    sprites.ringSprite,
    ringDiameter,
    geometry,
    bounds,
    camera,
    width,
    height,
  );
  sprites.ringMaterial.opacity = weight * (1 - ringProgress) * 0.7;
  sprites.ringSprite.visible = true;
}

function disposeVrmBackEffectSprites(
  scene: Scene,
  sprites: VrmBackEffectSprites,
): void {
  scene.remove(sprites.auraSprite);
  scene.remove(sprites.ringSprite);
  sprites.auraTexture.dispose();
  sprites.ringTexture.dispose();
  sprites.auraMaterial.dispose();
  sprites.ringMaterial.dispose();
}

interface IdleMotionState {
  nextAt: number;
  lockUntil: number;
}

function createVrmAnchorPoint(bounds: Box3, xRatio: number, yRatio: number) {
  return new Vector3(
    bounds.min.x + (bounds.max.x - bounds.min.x) * xRatio,
    bounds.max.y - (bounds.max.y - bounds.min.y) * yRatio,
    bounds.max.z,
  );
}

function projectVrmPoint(
  point: Vector3,
  camera: PerspectiveCamera,
  width: number,
  height: number,
) {
  const projected = point.clone().project(camera);
  return {
    x: ((projected.x + 1) / 2) * width,
    y: ((1 - projected.y) / 2) * height,
  };
}

function createVrmEffectGeometry(
  vrm: VRM,
  bounds: Box3,
  camera: PerspectiveCamera,
  width: number,
  height: number,
  anchor: EmotionEffectAnchor,
): EmotionEffectGeometry {
  const projectBone = (boneName: 'head' | 'leftEye' | 'rightEye' | 'chest') => {
    const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
    return bone
      ? projectVrmPoint(
          bone.getWorldPosition(new Vector3()),
          camera,
          width,
          height,
        )
      : null;
  };
  const head = projectBone('head');
  const projectedLeftEye = projectBone('leftEye');
  const projectedRightEye = projectBone('rightEye');
  const chest = projectBone('chest');
  const fallbackFace = projectVrmPoint(
    createVrmAnchorPoint(
      bounds,
      DEFAULT_EMOTION_EFFECT_ANCHOR.faceX,
      DEFAULT_EMOTION_EFFECT_ANCHOR.faceY,
    ),
    camera,
    width,
    height,
  );
  const leftEye = projectedLeftEye || {
    x: fallbackFace.x - Math.min(width, height) * 0.035,
    y: fallbackFace.y - Math.min(width, height) * 0.015,
  };
  const rightEye = projectedRightEye || {
    x: fallbackFace.x + Math.min(width, height) * 0.035,
    y: fallbackFace.y - Math.min(width, height) * 0.015,
  };
  const eyeDistance = Math.max(
    Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y),
    24,
  );
  const headToChest =
    head && chest ? Math.hypot(head.x - chest.x, head.y - chest.y) : 0;
  const baseUnit = Math.min(
    Math.min(width, height),
    Math.max(eyeDistance * 4.5, headToChest * 2.4, 120),
  );
  const baseFace = {
    x: (leftEye.x + rightEye.x) / 2,
    y:
      (leftEye.y + rightEye.y) / 2 +
      Math.max(eyeDistance * 0.42, headToChest * 0.16),
  };
  const offsetPoint = (
    point: { x: number; y: number },
    xRatio: number,
    yRatio: number,
    defaultX: number,
    defaultY: number,
  ) => ({
    x: point.x + (xRatio - defaultX) * baseUnit,
    y: point.y + (yRatio - defaultY) * baseUnit,
  });
  const face = offsetPoint(
    baseFace,
    anchor.faceX,
    anchor.faceY,
    DEFAULT_EMOTION_EFFECT_ANCHOR.faceX,
    DEFAULT_EMOTION_EFFECT_ANCHOR.faceY,
  );
  const anchoredLeftEye = offsetPoint(
    leftEye,
    anchor.leftEyeX,
    anchor.leftEyeY,
    DEFAULT_EMOTION_EFFECT_ANCHOR.leftEyeX,
    DEFAULT_EMOTION_EFFECT_ANCHOR.leftEyeY,
  );
  const anchoredRightEye = offsetPoint(
    rightEye,
    anchor.rightEyeX,
    anchor.rightEyeY,
    DEFAULT_EMOTION_EFFECT_ANCHOR.rightEyeX,
    DEFAULT_EMOTION_EFFECT_ANCHOR.rightEyeY,
  );
  const top = projectVrmPoint(
    new Vector3(bounds.getCenter(new Vector3()).x, bounds.max.y, bounds.max.z),
    camera,
    width,
    height,
  );
  const bottom = projectVrmPoint(
    new Vector3(bounds.getCenter(new Vector3()).x, bounds.min.y, bounds.max.z),
    camera,
    width,
    height,
  );
  return {
    faceX: face.x,
    faceY: face.y,
    leftEyeX: anchoredLeftEye.x,
    leftEyeY: anchoredLeftEye.y,
    rightEyeX: anchoredRightEye.x,
    rightEyeY: anchoredRightEye.y,
    unit:
      Math.min(
        Math.min(width, height),
        Math.max(baseUnit, Math.hypot(bottom.x - top.x, bottom.y - top.y)),
      ) * anchor.effectScale,
  };
}

export function AvatarBackground({
  mouthLevel,
  isSpeaking,
  reaction,
  emotionEffectReaction,
  reactionControlMode,
  emotionEffectMap,
  effectAnchor,
  onEffectAnchorChange,
  onEffectAnchorReset,
}: AvatarBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const expressionControllerRef = useRef<VrmExpressionController | null>(null);
  const mouthExpressionNameRef = useRef<string | null>(null);
  const animationTokenRef = useRef(0);
  const idleMotionStateRef = useRef<IdleMotionState>({
    nextAt: 0,
    lockUntil: 0,
  });
  const isSpeakingRef = useRef(isSpeaking);
  const targetMouthWeightRef = useRef(0);
  const mouthWeightRef = useRef(0);
  const effectAnchorRef = useRef(effectAnchor);
  const effectGeometryRef = useRef<EmotionEffectGeometry | null>(null);
  const effectPlaybackRef = useRef<EmotionEffectPlayback>({
    effect: null,
    weight: 0,
  });
  const effectProjectionRef = useRef<{
    baseGeometry: EmotionEffectGeometry;
    width: number;
    height: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [manualEmotionEffectReaction, setManualEmotionEffectReaction] =
    useState<VrmEmotionEffectReaction | null>(null);
  const manualEmotionEffectReactionIdRef = useRef(0);
  const [anchorEditorOpen, setAnchorEditorOpen] = useState(false);
  const [anchorTarget, setAnchorTarget] = useState<EffectAnchorTarget>('face');
  const showManualControls = reactionControlMode === 'manual';
  const activeEmotionEffectReaction =
    reactionControlMode === 'linked'
      ? emotionEffectReaction || null
      : showManualControls
        ? manualEmotionEffectReaction
        : null;

  useEffect(() => {
    effectAnchorRef.current = effectAnchor;
  }, [effectAnchor]);

  const handleAnchorPoint = useCallback(
    (x: number, y: number) => {
      const projection = effectProjectionRef.current;
      if (!projection) return;
      const { baseGeometry } = projection;
      const current = effectAnchorRef.current;
      const targetPoint =
        anchorTarget === 'face'
          ? { x: baseGeometry.faceX, y: baseGeometry.faceY }
          : anchorTarget === 'leftEye'
            ? { x: baseGeometry.leftEyeX, y: baseGeometry.leftEyeY }
            : { x: baseGeometry.rightEyeX, y: baseGeometry.rightEyeY };
      const currentX =
        anchorTarget === 'face'
          ? current.faceX
          : anchorTarget === 'leftEye'
            ? current.leftEyeX
            : current.rightEyeX;
      const currentY =
        anchorTarget === 'face'
          ? current.faceY
          : anchorTarget === 'leftEye'
            ? current.leftEyeY
            : current.rightEyeY;
      const unit = Math.max(
        baseGeometry.unit / Math.max(current.effectScale, 0.001),
        1,
      );
      const xRatio = currentX + (x - targetPoint.x) / unit;
      const yRatio = currentY + (y - targetPoint.y) / unit;
      const next = normalizeEmotionEffectAnchor({
        ...current,
        ...(anchorTarget === 'face'
          ? { faceX: xRatio, faceY: yRatio }
          : anchorTarget === 'leftEye'
            ? { leftEyeX: xRatio, leftEyeY: yRatio }
            : { rightEyeX: xRatio, rightEyeY: yRatio }),
      });
      effectAnchorRef.current = next;
      onEffectAnchorChange(next);
    },
    [anchorTarget, onEffectAnchorChange],
  );

  const targetWeight = useMemo(() => {
    if (!isSpeaking) return 0;
    const normalized = mouthLevel / MAX_MOUTH_LEVEL;
    return Math.min(Math.max(normalized, 0), 1);
  }, [isSpeaking, mouthLevel]);

  useEffect(() => {
    targetMouthWeightRef.current = targetWeight;
  }, [targetWeight]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
    if (isSpeaking) {
      suppressIdleMotion(
        idleMotionStateRef.current,
        IDLE_MOTION_AFTER_SPEECH_DELAY_MS,
      );
    }
  }, [isSpeaking]);

  useEffect(() => {
    const controller = expressionControllerRef.current;
    if (!controller) return;

    if (!reaction) {
      animationTokenRef.current += 1;
      controller.reset(220);
      return;
    }

    suppressIdleMotion(
      idleMotionStateRef.current,
      reaction.type === 'reset' ? 1600 : IDLE_MOTION_AFTER_REACTION_DELAY_MS,
    );

    if (reaction.type === 'animation') {
      const token = animationTokenRef.current + 1;
      animationTokenRef.current = token;
      controller.reset(160);

      void runVrmOneShotAnimation(
        reaction.name,
        (name, intensity, fadeMs) => {
          controller.set(name, intensity, fadeMs);
        },
        () =>
          expressionControllerRef.current === controller &&
          animationTokenRef.current === token,
      ).then(() => {
        if (
          expressionControllerRef.current === controller &&
          animationTokenRef.current === token
        ) {
          controller.reset(280);
        }
      });
      return;
    }

    animationTokenRef.current += 1;

    if (reaction.type === 'emote') {
      controller.emote(
        reaction.name,
        reaction.intensity,
        reaction.fadeMs,
        reaction.holdMs,
      );
      return;
    }

    if (reaction.type === 'gesture') {
      controller.reset(160);
      controller.gesture(reaction.parts, reaction.fadeMs, reaction.holdMs);
      return;
    }

    controller.reset(reaction.fadeMs);
  }, [reaction, isLoading]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const idleMotionState = idleMotionStateRef.current;
    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.1, 30);
    camera.position.set(0, 1.35, 2.2);

    const ambientLight = new AmbientLight(0xffffff, 1.0);
    const directionalLight = new DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(1.0, 1.8, 1.2);
    scene.add(ambientLight);
    scene.add(directionalLight);
    const backEffectScene = new Scene();
    const backEffectSprites = createVrmBackEffectSprites(backEffectScene);

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      console.error('Failed to initialize WebGLRenderer:', error);
      disposeVrmBackEffectSprites(backEffectScene, backEffectSprites);
      window.setTimeout(() => {
        setLoadError('WebGLの初期化に失敗しました。');
        setIsLoading(false);
      }, 0);
      return;
    }

    const rendererColorSpace = renderer as WebGLRenderer & {
      outputColorSpace?: string;
      outputEncoding?: number;
    };
    if ('outputColorSpace' in rendererColorSpace) {
      rendererColorSpace.outputColorSpace = 'srgb';
    } else if ('outputEncoding' in rendererColorSpace) {
      rendererColorSpace.outputEncoding = 3001;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
    renderer.autoClear = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.touchAction = 'none';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.9;
    controls.minPolarAngle = Math.PI * 0.2;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.target.set(0, 1.1, 0);
    controls.update();

    const defaultCameraPosition = camera.position.clone();
    const defaultTarget = controls.target.clone();

    const resetCamera = () => {
      camera.position.copy(defaultCameraPosition);
      controls.target.copy(defaultTarget);
      controls.update();
    };

    const setDraggingCursor = () => {
      canvas.classList.add('is-dragging');
    };
    const clearDraggingCursor = () => {
      canvas.classList.remove('is-dragging');
    };

    canvas.addEventListener('dblclick', resetCamera);
    canvas.addEventListener('pointerdown', setDraggingCursor);
    canvas.addEventListener('pointerup', clearDraggingCursor);
    canvas.addEventListener('pointerleave', clearDraggingCursor);
    canvas.addEventListener('pointercancel', clearDraggingCursor);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let disposed = false;
    let animationFrameId = 0;
    let loadedVrm: VRM | null = null;
    let mixer: AnimationMixer | null = null;
    let effectBounds: Box3 | null = null;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      VRM_FILE_URL,
      (gltf) => {
        if (disposed) return;
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) {
          setLoadError('VRMモデルの読み込みに失敗しました。');
          setIsLoading(false);
          return;
        }

        VRMUtils.rotateVRM0(vrm);

        const bounds = new Box3().setFromObject(vrm.scene);
        const size = bounds.getSize(new Vector3());
        const center = bounds.getCenter(new Vector3());

        vrm.scene.position.x -= center.x;
        vrm.scene.position.z -= center.z;
        vrm.scene.position.y -= bounds.min.y;
        vrm.scene.position.x += DEFAULT_MODEL_X_OFFSET;
        vrm.scene.rotation.y += DEFAULT_MODEL_Y_ROTATION;
        effectBounds = new Box3().setFromObject(vrm.scene);

        const modelHeight = Math.max(size.y, 1.0);
        const modelWidth = Math.max(size.x, 0.6);
        const verticalFov = (camera.fov * Math.PI) / 180;
        const horizontalFov =
          2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
        const visibleHeight = modelHeight * DEFAULT_VISIBLE_HEIGHT_RATIO;
        const visibleWidth = modelWidth * DEFAULT_VISIBLE_WIDTH_RATIO;
        const distanceByHeight =
          visibleHeight / (2 * Math.tan(verticalFov / 2));
        const distanceByWidth =
          visibleWidth / (2 * Math.tan(horizontalFov / 2));
        const distance = Math.max(distanceByHeight, distanceByWidth);
        const lookAtY = Math.max(
          0.9,
          modelHeight *
            (DEFAULT_LOOK_AT_HEIGHT_RATIO + DEFAULT_LOOK_AT_RAISE_RATIO),
        );
        const lookAtX = DEFAULT_MODEL_X_OFFSET;
        const cameraY =
          lookAtY + modelHeight * DEFAULT_CAMERA_HEIGHT_OFFSET_RATIO;

        camera.position.set(lookAtX, cameraY, distance);
        controls.target.set(lookAtX, lookAtY, 0);
        controls.minDistance = Math.max(
          0.7,
          distance * DEFAULT_MIN_DISTANCE_RATIO,
        );
        controls.maxDistance = Math.max(
          2.5,
          distance * DEFAULT_MAX_DISTANCE_RATIO,
        );
        camera.near = 0.01;
        camera.far = Math.max(50, distance * 20);
        camera.updateProjectionMatrix();
        controls.update();

        defaultCameraPosition.copy(camera.position);
        defaultTarget.copy(controls.target);

        scene.add(vrm.scene);
        loadedVrm = vrm;
        vrmRef.current = vrm;
        try {
          const expressionController = new VrmExpressionController(vrm);
          expressionControllerRef.current = expressionController;
          mouthExpressionNameRef.current =
            expressionController.resolveExpressionName([
              VRMExpressionPresetName.Aa,
              'aa',
              'a',
              'A',
            ]);
          scheduleNextIdleMotion(idleMotionState, 2600, 5200);
        } catch (error) {
          console.warn('VRM expressions are unavailable:', error);
          expressionControllerRef.current = null;
          mouthExpressionNameRef.current = null;
        }
        setIsLoading(false);

        const animationLoader = new GLTFLoader();
        animationLoader.register(
          (parser) => new VRMAnimationLoaderPlugin(parser),
        );
        animationLoader.load(
          VRMA_FILE_URL,
          (animationGltf) => {
            if (disposed) return;
            const vrmAnimations = animationGltf.userData.vrmAnimations as
              | VRMAnimation[]
              | undefined;
            const idleAnimation = vrmAnimations?.[0];
            if (!idleAnimation) {
              console.warn('VRM animation is missing:', VRMA_FILE_URL);
              return;
            }
            const idleClip = createVRMAnimationClip(
              idleAnimation,
              vrm as unknown as Parameters<typeof createVRMAnimationClip>[1],
            );
            const hipsNodeName =
              vrm.humanoid.getNormalizedBoneNode('hips')?.name;
            const stabilizedTracks = hipsNodeName
              ? idleClip.tracks.filter(
                  (track) => track.name !== `${hipsNodeName}.position`,
                )
              : idleClip.tracks;
            const stabilizedClip = new AnimationClip(
              idleClip.name,
              idleClip.duration,
              stabilizedTracks,
            );
            mixer = new AnimationMixer(vrm.scene);
            const action = mixer.clipAction(stabilizedClip);
            action.setLoop(LoopRepeat, Infinity);
            action.play();
          },
          undefined,
          (error) => {
            if (disposed) return;
            console.warn('Failed to load VRMA:', error);
          },
        );
      },
      undefined,
      (error) => {
        if (disposed) return;
        console.error('Failed to load VRM:', error);
        setLoadError('VRMモデルを読み込めませんでした。');
        setIsLoading(false);
      },
    );

    const clock = new Clock();
    const animate = (now: number) => {
      if (disposed) return;

      const delta = clock.getDelta();
      const vrm = vrmRef.current;
      if (vrm) {
        mixer?.update(delta);
        const expressionController = expressionControllerRef.current;
        if (expressionController) {
          maybeRunIdleMotion(
            expressionController,
            idleMotionState,
            isSpeakingRef.current,
          );
          expressionController.update(delta);
        }

        const nextWeight =
          mouthWeightRef.current +
          (targetMouthWeightRef.current - mouthWeightRef.current) * 0.35;
        mouthWeightRef.current = nextWeight;

        if (mouthExpressionNameRef.current) {
          vrm.expressionManager?.setValue(
            mouthExpressionNameRef.current,
            nextWeight,
          );
        }
        vrm.expressionManager?.update();
        vrm.update(delta);
      } else {
        mixer?.update(delta);
      }

      controls.update();
      if (effectBounds && vrm) {
        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);
        const geometry = createVrmEffectGeometry(
          vrm,
          effectBounds,
          camera,
          width,
          height,
          effectAnchorRef.current,
        );
        effectGeometryRef.current = geometry;
        effectProjectionRef.current = {
          baseGeometry: geometry,
          width,
          height,
        };
        updateVrmBackEffectSprites(
          backEffectSprites,
          effectPlaybackRef.current,
          geometry,
          effectBounds,
          camera,
          width,
          height,
          now,
        );
      } else {
        backEffectSprites.auraSprite.visible = false;
        backEffectSprites.ringSprite.visible = false;
      }
      renderer.clear();
      renderer.render(backEffectScene, camera);
      renderer.clearDepth();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      if (loadedVrm) {
        scene.remove(loadedVrm.scene);
        VRMUtils.deepDispose(loadedVrm.scene);
      }
      canvas.removeEventListener('dblclick', resetCamera);
      canvas.removeEventListener('pointerdown', setDraggingCursor);
      canvas.removeEventListener('pointerup', clearDraggingCursor);
      canvas.removeEventListener('pointerleave', clearDraggingCursor);
      canvas.removeEventListener('pointercancel', clearDraggingCursor);
      controls.dispose();
      if (mixer) {
        mixer.stopAllAction();
        if (loadedVrm) {
          mixer.uncacheRoot(loadedVrm.scene);
        }
        mixer = null;
      }
      vrmRef.current = null;
      expressionControllerRef.current = null;
      mouthExpressionNameRef.current = null;
      animationTokenRef.current += 1;
      idleMotionState.nextAt = 0;
      idleMotionState.lockUntil = 0;
      mouthWeightRef.current = 0;
      targetMouthWeightRef.current = 0;
      effectGeometryRef.current = null;
      effectProjectionRef.current = null;
      effectPlaybackRef.current = { effect: null, weight: 0 };
      disposeVrmBackEffectSprites(backEffectScene, backEffectSprites);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="avatar-background">
      <div className="vrm-stage" ref={containerRef}>
        <canvas ref={canvasRef} className="vrm-canvas" />
        <EmotionEffectOverlay
          reaction={activeEmotionEffectReaction}
          anchor={effectAnchor}
          geometryRef={effectGeometryRef}
          playbackMirrorRef={effectPlaybackRef}
          renderBackEffect={false}
          anchorEditorOpen={showManualControls && anchorEditorOpen}
          onAnchorPoint={handleAnchorPoint}
        />
        {isLoading && !loadError && (
          <div className="avatar-status">VRMモデルを読み込み中...</div>
        )}
        {!isLoading && !loadError && (
          <div className="avatar-status avatar-guide">
            ドラッグ: 回転 / ホイール: ズーム / ダブルクリック: リセット
          </div>
        )}
        {loadError && <div className="avatar-error">{loadError}</div>}
      </div>
      {showManualControls && (
        <div
          className="avatar-expression-controls"
          role="group"
          aria-label="VRMアバター感情表現エフェクト"
        >
          <span className="avatar-expression-controls-label">
            感情表現エフェクト
          </span>
          {AVATAR_EXPRESSION_OPTIONS.map((option) => {
            const effect = emotionEffectMap[option.emotion];
            return (
              <button
                key={option.emotion}
                type="button"
                className="avatar-expression-button"
                disabled={Boolean(loadError) || isLoading || !effect}
                onClick={() => {
                  if (!effect) return;
                  manualEmotionEffectReactionIdRef.current += 1;
                  setManualEmotionEffectReaction(
                    withVrmEmotionEffectReactionId(
                      { effect, durationMs: MANUAL_EFFECT_DURATION_MS },
                      manualEmotionEffectReactionIdRef.current,
                    ),
                  );
                }}
                title={
                  effect ? undefined : 'エフェクトが割り当てられていません'
                }
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            className="avatar-expression-button is-reset"
            disabled={Boolean(loadError) || isLoading}
            onClick={() => setManualEmotionEffectReaction(null)}
          >
            解除
          </button>
          <button
            type="button"
            className={`avatar-expression-button is-anchor${
              anchorEditorOpen ? ' is-active' : ''
            }`}
            disabled={Boolean(loadError) || isLoading}
            aria-pressed={anchorEditorOpen}
            onClick={() => setAnchorEditorOpen((current) => !current)}
          >
            アンカー調整
          </button>
        </div>
      )}
      {showManualControls && anchorEditorOpen && !isLoading && !loadError && (
        <div
          className="avatar-anchor-editor"
          role="group"
          aria-label="感情表現エフェクトアンカー調整"
        >
          <span className="avatar-anchor-editor-label">
            配置先を選び、アバター上をクリック
          </span>
          <div className="avatar-anchor-targets">
            {EFFECT_ANCHOR_TARGETS.map((option) => (
              <button
                key={option.target}
                type="button"
                className={`avatar-expression-button${
                  anchorTarget === option.target ? ' is-active' : ''
                }`}
                aria-pressed={anchorTarget === option.target}
                onClick={() => setAnchorTarget(option.target)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="avatar-anchor-scale">
            <span>エフェクトサイズ</span>
            <input
              type="range"
              min={MIN_EMOTION_EFFECT_SCALE * 100}
              max={MAX_EMOTION_EFFECT_SCALE * 100}
              step="5"
              value={Math.round(effectAnchor.effectScale * 100)}
              onChange={(event) => {
                const next = normalizeEmotionEffectAnchor({
                  ...effectAnchorRef.current,
                  effectScale: Number(event.target.value) / 100,
                });
                effectAnchorRef.current = next;
                onEffectAnchorChange(next);
              }}
            />
            <output>{Math.round(effectAnchor.effectScale * 100)}%</output>
          </label>
          <div className="avatar-anchor-actions">
            <button
              type="button"
              className="avatar-expression-button is-reset"
              onClick={() => {
                effectAnchorRef.current = DEFAULT_EMOTION_EFFECT_ANCHOR;
                onEffectAnchorReset();
                setAnchorTarget('face');
              }}
            >
              初期値に戻す
            </button>
            <button
              type="button"
              className="avatar-expression-button"
              onClick={() => setAnchorEditorOpen(false)}
            >
              完了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function maybeRunIdleMotion(
  controller: VrmExpressionController,
  state: IdleMotionState,
  isSpeaking: boolean,
) {
  const now = window.performance.now();
  if (isSpeaking) {
    state.lockUntil = Math.max(
      state.lockUntil,
      now + IDLE_MOTION_AFTER_SPEECH_DELAY_MS,
    );
    return;
  }

  if (state.nextAt === 0) {
    scheduleNextIdleMotion(state);
    return;
  }

  if (now < state.lockUntil || now < state.nextAt) {
    return;
  }

  const motion = pickVrmIdleMotion(controller);
  if (motion) {
    controller.gesture(motion.parts, motion.fadeMs, motion.holdMs);
    state.lockUntil = now + motion.fadeMs + motion.holdMs + 900;
  }

  scheduleNextIdleMotion(state);
}

function suppressIdleMotion(state: IdleMotionState, delayMs: number) {
  const now = window.performance.now();
  state.lockUntil = Math.max(state.lockUntil, now + delayMs);
  state.nextAt = Math.max(state.nextAt, state.lockUntil + 1200);
}

function scheduleNextIdleMotion(
  state: IdleMotionState,
  minDelayMs = IDLE_MOTION_MIN_DELAY_MS,
  maxDelayMs = IDLE_MOTION_MAX_DELAY_MS,
) {
  const delayMs =
    minDelayMs + Math.random() * Math.max(0, maxDelayMs - minDelayMs);
  state.nextAt = window.performance.now() + delayMs;
}
