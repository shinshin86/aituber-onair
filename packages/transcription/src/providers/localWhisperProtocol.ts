import type { LocalWhisperModelSize, TranscriptionProgress } from '../types';

export type LocalWhisperWorkerRequest =
  | {
      type: 'load';
      model: LocalWhisperModelSize;
      debug?: boolean;
    }
  | {
      type: 'transcribe';
      requestId: string;
      audio: Float32Array;
      model: LocalWhisperModelSize;
      language?: string;
      debug?: boolean;
    };

export type LocalWhisperWorkerResponse =
  | {
      type: 'ready';
      model: LocalWhisperModelSize;
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
      model?: LocalWhisperModelSize;
      message: string;
    };
