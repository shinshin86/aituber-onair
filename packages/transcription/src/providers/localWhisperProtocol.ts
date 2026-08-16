import type { TranscriptionProgress } from '../types';

export type LocalWhisperWorkerRequest =
  | {
      type: 'load';
      debug?: boolean;
    }
  | {
      type: 'transcribe';
      requestId: string;
      audio: Float32Array;
      language?: string;
      debug?: boolean;
    };

export type LocalWhisperWorkerResponse =
  | {
      type: 'ready';
    }
  | {
      type: 'progress';
      progress: TranscriptionProgress;
    }
  | {
      type: 'result';
      requestId: string;
      text: string;
    }
  | {
      type: 'error';
      requestId?: string;
      message: string;
    };
