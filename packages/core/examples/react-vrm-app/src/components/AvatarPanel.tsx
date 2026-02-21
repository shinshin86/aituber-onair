import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  Box3,
  Clock,
  DirectionalLight,
  LoopRepeat,
  PerspectiveCamera,
  Scene,
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

interface AvatarBackgroundProps {
  mouthLevel: number;
  isSpeaking: boolean;
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

export function AvatarBackground({ mouthLevel, isSpeaking }: AvatarBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const targetMouthWeightRef = useRef(0);
  const mouthWeightRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const targetWeight = useMemo(() => {
    if (!isSpeaking) return 0;
    const normalized = mouthLevel / MAX_MOUTH_LEVEL;
    return Math.min(Math.max(normalized, 0), 1);
  }, [isSpeaking, mouthLevel]);

  useEffect(() => {
    targetMouthWeightRef.current = targetWeight;
  }, [targetWeight]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.1, 30);
    camera.position.set(0, 1.35, 2.2);

    const ambientLight = new AmbientLight(0xffffff, 1.0);
    const directionalLight = new DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(1.0, 1.8, 1.2);
    scene.add(ambientLight);
    scene.add(directionalLight);

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
    controls.minPolarAngle = (Math.PI * 0.2);
    controls.maxPolarAngle = (Math.PI * 0.55);
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

        const modelHeight = Math.max(size.y, 1.0);
        const modelWidth = Math.max(size.x, 0.6);
        const verticalFov = (camera.fov * Math.PI) / 180;
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
        const visibleHeight = modelHeight * DEFAULT_VISIBLE_HEIGHT_RATIO;
        const visibleWidth = modelWidth * DEFAULT_VISIBLE_WIDTH_RATIO;
        const distanceByHeight = visibleHeight / (2 * Math.tan(verticalFov / 2));
        const distanceByWidth = visibleWidth / (2 * Math.tan(horizontalFov / 2));
        const distance = Math.max(distanceByHeight, distanceByWidth);
        const lookAtY = Math.max(
          0.9,
          modelHeight * (DEFAULT_LOOK_AT_HEIGHT_RATIO + DEFAULT_LOOK_AT_RAISE_RATIO),
        );
        const lookAtX = DEFAULT_MODEL_X_OFFSET;
        const cameraY = lookAtY + modelHeight * DEFAULT_CAMERA_HEIGHT_OFFSET_RATIO;

        camera.position.set(lookAtX, cameraY, distance);
        controls.target.set(lookAtX, lookAtY, 0);
        controls.minDistance = Math.max(0.7, distance * DEFAULT_MIN_DISTANCE_RATIO);
        controls.maxDistance = Math.max(2.5, distance * DEFAULT_MAX_DISTANCE_RATIO);
        camera.near = 0.01;
        camera.far = Math.max(50, distance * 20);
        camera.updateProjectionMatrix();
        controls.update();

        defaultCameraPosition.copy(camera.position);
        defaultTarget.copy(controls.target);

        scene.add(vrm.scene);
        loadedVrm = vrm;
        vrmRef.current = vrm;
        setIsLoading(false);

        const animationLoader = new GLTFLoader();
        animationLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
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
            const hipsNodeName = vrm.humanoid.getNormalizedBoneNode('hips')?.name;
            const stabilizedTracks = hipsNodeName
              ? idleClip.tracks.filter((track) => track.name !== `${hipsNodeName}.position`)
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
    const animate = () => {
      if (disposed) return;

      const delta = clock.getDelta();
      const vrm = vrmRef.current;
      if (vrm) {
        mixer?.update(delta);

        const nextWeight = mouthWeightRef.current
          + (targetMouthWeightRef.current - mouthWeightRef.current) * 0.35;
        mouthWeightRef.current = nextWeight;

        vrm.expressionManager?.setValue(VRMExpressionPresetName.Aa, nextWeight);
        vrm.update(delta);
      } else {
        mixer?.update(delta);
      }

      controls.update();
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
      mouthWeightRef.current = 0;
      targetMouthWeightRef.current = 0;
      renderer.dispose();
    };
  }, []);

  return (
    <div className="avatar-background">
      <div className="vrm-stage" ref={containerRef}>
        <canvas ref={canvasRef} className="vrm-canvas" />
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
    </div>
  );
}
