import type {
  BrainActivityTrace,
  NoiseModulation,
  NoiseModulatorInput,
} from '../../../src/index';
export interface Geometry {
  positions: Float32Array;
  ids: Uint32Array;
  types: string[];
  groups: string[];
  neuronCount: number;
  edgeCount: number;
  provider: 'virtual' | 'malecns';
}
export type Request =
  | { type: 'reset' }
  | { type: 'init'; backend: 'virtual' | 'malecns'; manifestUrl: string }
  | { type: 'run'; id: number; input: NoiseModulatorInput };
export type Reply =
  | { type: 'ready'; geometry: Geometry }
  | {
      type: 'result';
      id: number;
      modulation: NoiseModulation;
      counts: Uint32Array;
      trace: BrainActivityTrace;
      elapsedMs: number;
    }
  | { type: 'error'; message: string; id?: number };
