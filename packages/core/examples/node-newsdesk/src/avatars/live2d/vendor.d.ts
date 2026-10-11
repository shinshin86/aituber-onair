/** Typed subset of the pinned Git dependency, which ships no declarations. */
declare module 'pixi-live2d-display-lipsyncpatch/cubism4' {
  import type { Container, Ticker } from 'pixi.js';

  export interface CubismCoreModel {
    getParameterCount(): number;
    getParameterIndex(id: string): number;
    setParameterValueById(id: string, value: number): void;
    update(): void;
  }
  export interface MotionManager {
    definitions: Record<string, unknown[]>;
    groups: { idle: string };
    startMotion(
      group: string,
      index: number,
      priority?: number,
      options?: Record<string, unknown>,
    ): Promise<boolean>;
    startRandomMotion(
      group: string,
      priority?: number,
      options?: Record<string, unknown>,
    ): Promise<boolean>;
  }
  export interface Live2DModelInstance extends Container {
    anchor: { set(x: number, y?: number): void };
    internalModel: {
      width: number;
      height: number;
      coreModel: CubismCoreModel;
      motionManager: MotionManager;
      eyeBlink?: unknown;
      lipSync: boolean;
      update(deltaMilliseconds: number, elapsedMilliseconds: number): void;
    };
    deltaTime: number;
    elapsedTime: number;
    update(deltaMilliseconds: number): void;
  }
  export const Live2DModel: {
    registerTicker(ticker: typeof Ticker): void;
    from(
      source: string,
      options: Record<string, unknown>,
    ): Promise<Live2DModelInstance>;
  };
}
