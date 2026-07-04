import {
  INOCHI2D_DEBUG_ENABLED,
  INOCHI2D_DEFAULT_CAMERA_SCALE,
  INOCHI2D_LOG_PREFIX,
  INOCHI2D_MAX_CAMERA_SCALE,
  INOCHI2D_MIN_CAMERA_SCALE,
} from '../lib/inochi2dConstants';
import type {
  InochiCameraTransform,
  InochiParameterValueMap,
  InochiRuntimeController,
  ResolvedInochiManifest,
  ResolvedInochiModelDefinition,
} from '../types/inochi2d';
import {
  buildInochiParameterValueMap,
  loadInochiManifest,
  mergeCustomInochiModel,
  resolveInochiModel,
} from '../lib/inochi2dManifest';
import {
  createInochiRuntimeController,
  isInochi2DSupported,
} from '../lib/inochi2dRuntime';
import { registerInochiRuntimeSession } from '../lib/inochi2dRuntimeSession';
import { resetInochi2DMouthToIdle } from '../lib/inochi2dLipSync';
import { useCallback, useEffect, useRef, useState } from 'react';

type HookStatus = 'idle' | 'loading' | 'ready' | 'error';

type ResizeSubscription = {
  disconnect: () => void;
};

type UseInochi2DServices = {
  loadManifest: typeof loadInochiManifest;
  createController: typeof createInochiRuntimeController;
  isSupported: typeof isInochi2DSupported;
};

type UseInochi2DOptions = {
  selectedModelId?: string | null;
  parameterValues?: InochiParameterValueMap;
  customModel?: ResolvedInochiModelDefinition | null;
  enabled?: boolean;
  debug?: boolean;
  onModelResolved?: (modelId: string) => void;
  services?: Partial<UseInochi2DServices>;
};

const defaultServices: UseInochi2DServices = {
  loadManifest: loadInochiManifest,
  createController: createInochiRuntimeController,
  isSupported: isInochi2DSupported,
};

const getCanvasMetrics = (
  canvas: HTMLCanvasElement,
  maxDevicePixelRatio?: number,
) => {
  const parentElement = canvas.parentElement;
  const width =
    parentElement?.clientWidth || canvas.clientWidth || canvas.width || 1;
  const height =
    parentElement?.clientHeight || canvas.clientHeight || canvas.height || 1;
  const actualDevicePixelRatio =
    typeof window !== 'undefined' && window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;
  const devicePixelRatio =
    typeof maxDevicePixelRatio === 'number' &&
    Number.isFinite(maxDevicePixelRatio) &&
    maxDevicePixelRatio > 0
      ? Math.min(actualDevicePixelRatio, maxDevicePixelRatio)
      : actualDevicePixelRatio;

  return {
    width,
    height,
    devicePixelRatio,
  };
};

const createResizeSubscription = (
  canvas: HTMLCanvasElement,
  onResize: () => void,
): ResizeSubscription => {
  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      onResize();
    });
    resizeObserver.observe(canvas.parentElement ?? canvas);
    return {
      disconnect: () => resizeObserver.disconnect(),
    };
  }

  const handleResize = () => {
    onResize();
  };
  window.addEventListener('resize', handleResize);

  return {
    disconnect: () => {
      window.removeEventListener('resize', handleResize);
    },
  };
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const DEFAULT_CAMERA_TRANSFORM: InochiCameraTransform = {
  x: 0,
  y: 0,
  scale: INOCHI2D_DEFAULT_CAMERA_SCALE,
};

const isPerformanceProfilerRequested = (debugEnabled: boolean) => {
  if (!debugEnabled || typeof window === 'undefined') {
    return false;
  }

  const value = new URLSearchParams(window.location.search).get(
    'inochi2d-profiler',
  );
  return value === '1' || value === 'true';
};

const clampCameraTransform = (
  nextTransform: InochiCameraTransform,
): InochiCameraTransform => ({
  x: Number.isFinite(nextTransform.x) ? nextTransform.x : 0,
  y: Number.isFinite(nextTransform.y) ? nextTransform.y : 0,
  scale: Math.min(
    INOCHI2D_MAX_CAMERA_SCALE,
    Math.max(
      INOCHI2D_MIN_CAMERA_SCALE,
      Number.isFinite(nextTransform.scale)
        ? nextTransform.scale
        : INOCHI2D_DEFAULT_CAMERA_SCALE,
    ),
  ),
});

export const useInochi2D = ({
  selectedModelId,
  parameterValues = {},
  customModel,
  enabled = true,
  debug = INOCHI2D_DEBUG_ENABLED,
  onModelResolved,
  services,
}: UseInochi2DOptions) => {
  const loadManifestService =
    services?.loadManifest ?? defaultServices.loadManifest;
  const createControllerService =
    services?.createController ?? defaultServices.createController;
  const isSupportedService =
    services?.isSupported ?? defaultServices.isSupported;

  const [status, setStatus] = useState<HookStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] =
    useState<ResolvedInochiModelDefinition | null>(null);
  const [availableModels, setAvailableModels] = useState<
    ResolvedInochiModelDefinition[]
  >([]);
  const [isWebGLSupported, setIsWebGLSupported] = useState(true);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [cameraTransform, setCameraTransformState] =
    useState<InochiCameraTransform>(DEFAULT_CAMERA_TRANSFORM);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<InochiRuntimeController | null>(null);
  const activeModelRef = useRef<ResolvedInochiModelDefinition | null>(null);
  const resizeSubscriptionRef = useRef<ResizeSubscription | null>(null);
  const manifestLoadedRef = useRef(false);
  const manifestRef = useRef<Awaited<
    ReturnType<typeof loadInochiManifest>
  > | null>(null);
  const initRunIdRef = useRef(0);
  const initChainRef = useRef<Promise<void>>(Promise.resolve());
  const modelRunIdRef = useRef(0);
  const parameterValuesRef = useRef(parameterValues);
  const selectedModelIdRef = useRef(selectedModelId);
  const onModelResolvedRef = useRef(onModelResolved);
  const cameraTransformRef = useRef<InochiCameraTransform>(
    DEFAULT_CAMERA_TRANSFORM,
  );

  useEffect(() => {
    canvasRef.current = canvasElement;
  }, [canvasElement]);

  useEffect(() => {
    parameterValuesRef.current = parameterValues;
  }, [parameterValues]);

  useEffect(() => {
    selectedModelIdRef.current = selectedModelId;
  }, [selectedModelId]);

  useEffect(() => {
    onModelResolvedRef.current = onModelResolved;
  }, [onModelResolved]);

  const disconnectResizeSubscription = useCallback(() => {
    resizeSubscriptionRef.current?.disconnect();
    resizeSubscriptionRef.current = null;
  }, []);

  const disposeController = useCallback(
    async (controller?: InochiRuntimeController | null) => {
      if (!controller) {
        return;
      }
      try {
        await Promise.resolve(controller.unmount());
      } catch (disposeError) {
        console.error(`${INOCHI2D_LOG_PREFIX} unmount failed`, disposeError);
      }
    },
    [],
  );

  const applyResize = useCallback(async () => {
    const canvas = canvasRef.current;
    const controller = controllerRef.current;
    if (!canvas || !controller) {
      return;
    }

    const { width, height, devicePixelRatio } = getCanvasMetrics(
      canvas,
      manifestRef.current?.runtime.maxDevicePixelRatio,
    );
    await Promise.resolve(controller.resize(width, height, devicePixelRatio));
  }, []);

  const applyParameters = useCallback(async () => {
    const controller = controllerRef.current;
    const model = activeModelRef.current;
    if (!controller || !model) {
      return;
    }

    const values = buildInochiParameterValueMap(
      model,
      parameterValuesRef.current,
    );

    await Promise.all(
      Object.entries(values).map(([parameterId, value]) =>
        Promise.resolve(controller.setParameter(parameterId, value)),
      ),
    );
  }, []);

  const syncRuntimeSession = useCallback(() => {
    registerInochiRuntimeSession({
      getController: () => controllerRef.current,
      getRegisteredParameterIds: () =>
        activeModelRef.current?.parameters.map((parameter) => parameter.id) ??
        [],
      getBaseParameterValue: (parameterId: string) => {
        const model = activeModelRef.current;
        if (!model) {
          return 0;
        }

        const resolvedValues = buildInochiParameterValueMap(
          model,
          parameterValuesRef.current,
        );
        const definition = model.parameters.find(
          (parameter) => parameter.id === parameterId,
        );
        return resolvedValues[parameterId] ?? definition?.defaultValue ?? 0;
      },
    });
  }, []);

  const applyCameraTransform = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller) {
      return;
    }

    const nextTransform = clampCameraTransform(cameraTransformRef.current);
    await Promise.resolve(
      controller.setCameraTransform(
        nextTransform.x,
        nextTransform.y,
        nextTransform.scale,
      ),
    );
  }, []);

  const setCameraTransform = useCallback(
    async (nextTransform: InochiCameraTransform) => {
      const normalizedTransform = clampCameraTransform(nextTransform);
      cameraTransformRef.current = normalizedTransform;
      setCameraTransformState(normalizedTransform);
      await applyCameraTransform();
    },
    [applyCameraTransform],
  );

  const resetCameraTransform = useCallback(async () => {
    await setCameraTransform(DEFAULT_CAMERA_TRANSFORM);
  }, [setCameraTransform]);

  const applyInteractionImpulse = useCallback(
    async (deltaX: number, deltaY: number) => {
      const controller = controllerRef.current;
      if (!controller) {
        return;
      }

      if (typeof controller.applyInteractionImpulse === 'function') {
        await Promise.resolve(
          controller.applyInteractionImpulse(deltaX, deltaY),
        );
        return;
      }

      if (typeof controller.nudgeInteraction === 'function') {
        await Promise.resolve(controller.nudgeInteraction(deltaX, deltaY));
      }
    },
    [],
  );

  const playReactionAnimation = useCallback(async (reactionName: string) => {
    const controller = controllerRef.current;
    if (!controller || typeof controller.playReactionAnimation !== 'function') {
      return;
    }

    await Promise.resolve(controller.playReactionAnimation(reactionName));
  }, []);

  const playEmotionAnimation = useCallback(async (emotionName: string) => {
    const controller = controllerRef.current;
    if (!controller || typeof controller.playEmotionAnimation !== 'function') {
      return;
    }

    await Promise.resolve(controller.playEmotionAnimation(emotionName));
  }, []);

  const loadModelIntoController = useCallback(
    async (requestedModelId?: string | null) => {
      const manifest = manifestRef.current;
      const controller = controllerRef.current;
      if (!manifest || !controller) {
        return;
      }

      const model = resolveInochiModel(manifest, requestedModelId);
      if (!model) {
        setAvailableModels([]);
        throw new Error('Inochi2D manifest does not define any models.');
      }

      if (activeModelRef.current?.id !== model.id) {
        const modelRunId = ++modelRunIdRef.current;
        setStatus('loading');
        setError(null);
        await Promise.resolve(
          controller.loadModel(model.modelUrl, model.motionUrl),
        );
        if (modelRunId !== modelRunIdRef.current) {
          return;
        }
        const idleAnimations =
          model.idleAnimations && model.idleAnimations.length > 0
            ? model.idleAnimations
            : model.autoAnimation
              ? [model.autoAnimation]
              : [];
        if (typeof controller.configureAnimationGroups === 'function') {
          await Promise.resolve(
            controller.configureAnimationGroups({
              idleAnimations,
              idleAnimationProfiles: model.idleAnimationProfiles,
              reactionAnimations: model.reactionAnimations,
              emotionAnimations: model.emotionAnimations,
            }),
          );
        }
        if (
          idleAnimations.length > 0 &&
          typeof controller.playIdleAnimations === 'function'
        ) {
          await Promise.resolve(
            controller.playIdleAnimations(idleAnimations, {
              shuffle: true,
            }),
          );
        } else if (
          model.autoAnimation &&
          typeof controller.playAnimation === 'function'
        ) {
          await Promise.resolve(
            controller.playAnimation(model.autoAnimation, {
              loop: true,
              restart: true,
            }),
          );
        }
        activeModelRef.current = model;
        setActiveModel(model);
        syncRuntimeSession();
        onModelResolvedRef.current?.(model.id);
      }

      await applyResize();
      await applyParameters();
      resetInochi2DMouthToIdle();
      setStatus('ready');
    },
    [applyParameters, applyResize, syncRuntimeSession],
  );

  useEffect(() => {
    if (!canvasElement || !enabled) {
      queueMicrotask(() => {
        setStatus('idle');
        setError(null);
        setActiveModel(null);
        setAvailableModels([]);
        setIsWebGLSupported(true);
      });
      cameraTransformRef.current = DEFAULT_CAMERA_TRANSFORM;
      queueMicrotask(() => {
        setCameraTransformState(DEFAULT_CAMERA_TRANSFORM);
      });
      manifestLoadedRef.current = false;
      manifestRef.current = null;
      activeModelRef.current = null;
      registerInochiRuntimeSession(null);
      disconnectResizeSubscription();
      const controller = controllerRef.current;
      controllerRef.current = null;
      if (controller) {
        void disposeController(controller);
      }
      return;
    }

    if (!isSupportedService()) {
      registerInochiRuntimeSession(null);
      queueMicrotask(() => {
        setIsWebGLSupported(false);
        setStatus('error');
        setError('Inochi2D requires WebGL support.');
      });
      return;
    }

    queueMicrotask(() => {
      setIsWebGLSupported(true);
      setStatus('loading');
      setError(null);
    });

    let active = true;
    const initRunId = ++initRunIdRef.current;

    const initialize = async () => {
      try {
        const manifest = mergeCustomInochiModel(
          (await loadManifestService()) as ResolvedInochiManifest,
          customModel,
        );
        if (!active || initRunId !== initRunIdRef.current) {
          return;
        }

        manifestRef.current = manifest;
        manifestLoadedRef.current = true;
        setAvailableModels(manifest.models);

        const controller = await createControllerService(manifest, {
          debug,
        });
        if (!active || initRunId !== initRunIdRef.current) {
          await disposeController(controller);
          return;
        }

        controllerRef.current = controller;
        syncRuntimeSession();
        await Promise.resolve(controller.mount(canvasElement));
        if (isPerformanceProfilerRequested(debug)) {
          await Promise.resolve(
            controller.setPerformanceProfilerEnabled?.(true),
          );
        }
        if (!active || initRunId !== initRunIdRef.current) {
          await disposeController(controller);
          return;
        }

        await applyCameraTransform();

        disconnectResizeSubscription();
        resizeSubscriptionRef.current = createResizeSubscription(
          canvasElement,
          () => {
            void applyResize();
          },
        );

        await loadModelIntoController(selectedModelIdRef.current);
      } catch (initError) {
        if (!active) {
          return;
        }
        registerInochiRuntimeSession(null);
        console.error(
          `${INOCHI2D_LOG_PREFIX} initialization failed`,
          initError,
        );
        setStatus('error');
        setError(getErrorMessage(initError));
      }
    };

    // Serialize init runs: a superseded run may still be awaiting mount, and
    // its guard-triggered unmount must finish before the next run touches the
    // same canvas.
    const previousInit = initChainRef.current;
    initChainRef.current = previousInit.then(initialize);

    return () => {
      active = false;
      modelRunIdRef.current += 1;
      disconnectResizeSubscription();
      manifestLoadedRef.current = false;
      manifestRef.current = null;
      activeModelRef.current = null;
      setActiveModel(null);
      registerInochiRuntimeSession(null);

      const controller = controllerRef.current;
      controllerRef.current = null;
      if (controller) {
        void disposeController(controller);
      }
    };
  }, [
    applyResize,
    applyCameraTransform,
    canvasElement,
    debug,
    disconnectResizeSubscription,
    disposeController,
    enabled,
    createControllerService,
    customModel,
    isSupportedService,
    loadManifestService,
    loadModelIntoController,
    syncRuntimeSession,
  ]);

  useEffect(() => {
    if (!manifestLoadedRef.current || !controllerRef.current) {
      return;
    }
    queueMicrotask(() => {
      loadModelIntoController(selectedModelId).catch((loadError: unknown) => {
        if (!controllerRef.current) {
          return;
        }
        console.error(`${INOCHI2D_LOG_PREFIX} model switch failed`, loadError);
        setStatus('error');
        setError(getErrorMessage(loadError));
      });
    });
  }, [loadModelIntoController, selectedModelId]);

  useEffect(() => {
    if (status !== 'ready') {
      return;
    }
    void applyParameters();
  }, [applyParameters, status]);

  useEffect(() => {
    if (status !== 'ready') {
      return;
    }
    void applyCameraTransform();
  }, [applyCameraTransform, status]);

  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    setCanvasElement(node);
  }, []);

  return {
    canvasRef: setCanvasRef,
    status,
    error,
    activeModel,
    availableModels,
    isWebGLSupported,
    cameraTransform,
    setCameraTransform,
    resetCameraTransform,
    applyInteractionImpulse,
    playReactionAnimation,
    playEmotionAnimation,
  };
};
