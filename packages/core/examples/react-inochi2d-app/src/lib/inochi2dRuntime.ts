import { INOCHI2D_LOG_PREFIX } from './inochi2dConstants';
import type {
  InochiRuntimeBridgeModule,
  InochiRuntimeController,
  ResolvedInochiManifest,
} from '../types/inochi2d';

const hasControllerContract = (
  value: unknown,
): value is InochiRuntimeController =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as InochiRuntimeController).mount === 'function' &&
  typeof (value as InochiRuntimeController).unmount === 'function' &&
  typeof (value as InochiRuntimeController).loadModel === 'function' &&
  typeof (value as InochiRuntimeController).setParameter === 'function' &&
  typeof (value as InochiRuntimeController).setCameraTransform === 'function' &&
  typeof (value as InochiRuntimeController).resize === 'function';

export const isInochi2DSupported = (canvas?: HTMLCanvasElement | null) => {
  if (typeof window === 'undefined') {
    return false;
  }

  const probe = canvas ?? document.createElement('canvas');
  return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
};

export const createInochiRuntimeController = async (
  manifest: ResolvedInochiManifest,
  options?: {
    debug?: boolean;
  },
) => {
  const bridgeModule = (await import(
    /* @vite-ignore */ manifest.runtime.bridgeUrl
  )) as Partial<InochiRuntimeBridgeModule>;

  if (typeof bridgeModule.createInochi2DController !== 'function') {
    throw new Error(
      'Inochi2D bridge module must export createInochi2DController().',
    );
  }

  const controller = await bridgeModule.createInochi2DController({
    wasmUrl: manifest.runtime.wasmUrl,
    debug: options?.debug,
  });

  if (!hasControllerContract(controller)) {
    throw new Error('Inochi2D bridge returned an invalid controller contract.');
  }

  if (options?.debug) {
    console.info(
      `${INOCHI2D_LOG_PREFIX} runtime initialized`,
      manifest.runtime.bridgeUrl,
    );
  }

  return controller;
};
