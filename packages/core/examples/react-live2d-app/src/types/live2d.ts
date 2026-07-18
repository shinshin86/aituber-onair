import type * as PIXI from 'pixi.js';

export interface Live2DCoreModelLike {
  setParameterValueById(id: string, value: number): void;
}

export interface Live2DMotionManagerLike {
  currentAudio?: HTMLAudioElement;
  currentAnalyzer?: AnalyserNode;
  currentContext?: AudioContext;
  expressionManager?: {
    resetExpression(): void;
  };
}

export interface Live2DModelInstance extends PIXI.Container {
  buttonMode: boolean;
  dragging?: boolean;
  _pointerX?: number;
  _pointerY?: number;
  anchor: {
    set(x: number, y?: number): void;
  };
  focusController?: {
    enabled: boolean;
  };
  internalModel?: {
    width?: number;
    height?: number;
    coreModel?: Live2DCoreModelLike;
    lipSync?: boolean;
    motionManager?: Live2DMotionManagerLike;
    eyeTracking?: {
      enabled: boolean;
    };
    focus?: {
      enabled: boolean;
    };
  };
  expression(id: string | number): Promise<boolean>;
  destroy(options?: unknown): void;
}

export interface Live2DModelCtor {
  registerTicker(ticker: unknown): void;
  from(
    source: string,
    options?: Record<string, unknown>,
  ): Promise<Live2DModelInstance>;
}
