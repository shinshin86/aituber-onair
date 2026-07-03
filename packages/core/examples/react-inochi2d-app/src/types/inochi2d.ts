export type InochiParameterValueMap = Record<string, number>;

export type InochiCameraTransform = {
  x: number;
  y: number;
  scale: number;
};

export type InochiParameterDefinition = {
  id: string;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
};

export type InochiModelAttribution = {
  title?: string;
  author?: string;
  license?: string;
  licenseUrl?: string;
  sourceUrl?: string;
  changes?: string;
};

export type InochiIdleAnimationProfile = {
  type?: 'base' | 'attention' | 'emotion' | 'rareGesture';
  cooldownMs?: number;
  weight?: number;
};

export type InochiModelDefinition = {
  id: string;
  name: string;
  model: string;
  motion?: string;
  thumbnail?: string;
  autoAnimation?: string;
  idleAnimations?: string[];
  idleAnimationProfiles?: Record<string, InochiIdleAnimationProfile>;
  reactionAnimations?: Record<string, string[]>;
  emotionAnimations?: Record<string, string[]>;
  attribution?: InochiModelAttribution;
  parameters?: InochiParameterDefinition[];
};

export type InochiManifest = {
  version: number;
  runtime: {
    bridge: string;
    wasm: string;
    maxDevicePixelRatio?: number;
  };
  defaultModelId?: string;
  models: InochiModelDefinition[];
};

export type ResolvedInochiParameterDefinition = {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue?: number;
};

export type ResolvedInochiModelDefinition = {
  id: string;
  name: string;
  modelUrl: string;
  motionUrl?: string;
  thumbnailUrl?: string;
  autoAnimation?: string;
  idleAnimations?: string[];
  idleAnimationProfiles?: Record<string, InochiIdleAnimationProfile>;
  reactionAnimations?: Record<string, string[]>;
  emotionAnimations?: Record<string, string[]>;
  attribution?: InochiModelAttribution;
  parameters: ResolvedInochiParameterDefinition[];
};

export type ResolvedInochiManifest = {
  version: number;
  manifestUrl: string;
  runtime: {
    bridgeUrl: string;
    wasmUrl: string;
    maxDevicePixelRatio?: number;
  };
  defaultModelId?: string;
  models: ResolvedInochiModelDefinition[];
};

export type CreateInochi2DControllerArgs = {
  wasmUrl: string;
  debug?: boolean;
};

export interface InochiRuntimeController {
  mount: (canvas: HTMLCanvasElement) => Promise<void> | void;
  unmount: () => Promise<void> | void;
  loadModel: (modelUrl: string, motionUrl?: string) => Promise<void>;
  setParameter: (parameterId: string, value: number) => Promise<void> | void;
  playAnimation?: (
    animationName: string,
    options?: {
      loop?: boolean;
      restart?: boolean;
      weight?: number;
      kind?: 'manual' | 'idle' | 'reaction' | 'emotion';
      transitionMs?: number;
    },
  ) => Promise<void> | void;
  playIdleAnimations?: (
    animationNames: string[],
    options?: {
      shuffle?: boolean;
    },
  ) => Promise<void> | void;
  configureAnimationGroups?: (groups: {
    idleAnimations?: string[];
    idleAnimationProfiles?: Record<string, InochiIdleAnimationProfile>;
    reactionAnimations?: Record<string, string[]>;
    emotionAnimations?: Record<string, string[]>;
  }) => Promise<void> | void;
  playReactionAnimation?: (reactionName: string) => Promise<void> | void;
  playEmotionAnimation?: (emotionName: string) => Promise<void> | void;
  stopAnimation?: (animationName?: string) => Promise<void> | void;
  getAnimationNames?: () => Promise<string[]> | string[];
  setParameterVector?: (
    parameterId: string,
    valueX: number,
    valueY: number,
  ) => Promise<void> | void;
  setPostPhysicsParameterVector?: (
    parameterId: string,
    valueX: number,
    valueY: number,
  ) => Promise<void> | void;
  setEyeBlinkValue?: (
    valueLeft: number,
    valueRight?: number,
    options?: {
      durationMs?: number;
    },
  ) => Promise<void> | void;
  setLipSyncValue?: (
    value: number,
    options?: {
      viseme?: 'neutral' | 'a' | 'i' | 'u' | 'e' | 'o';
      immediate?: boolean;
    },
  ) => Promise<void> | void;
  setExpressionPreset?: (
    name: string,
    options?: {
      weight?: number;
      allowMouth?: boolean;
    },
  ) => Promise<void> | void;
  getExpressionPresetNames?: () => Promise<string[]> | string[];
  clearExpressionLayer?: (name?: string) => Promise<void> | void;
  setPerformanceProfilerEnabled?: (enabled: boolean) => Promise<void> | void;
  applyInteractionImpulse?: (
    deltaX: number,
    deltaY: number,
  ) => Promise<void> | void;
  nudgeInteraction?: (deltaX: number, deltaY: number) => Promise<void> | void;
  setCameraTransform: (
    x: number,
    y: number,
    scale: number,
  ) => Promise<void> | void;
  resize: (
    width: number,
    height: number,
    devicePixelRatio: number,
  ) => Promise<void> | void;
}

export type InochiRuntimeBridgeModule = {
  createInochi2DController: (
    args: CreateInochi2DControllerArgs,
  ) => Promise<InochiRuntimeController> | InochiRuntimeController;
};
