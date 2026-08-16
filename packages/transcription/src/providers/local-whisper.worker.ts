import {
  env,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';
import type { LocalWhisperModelSize } from '../types';
import type {
  LocalWhisperWorkerRequest,
  LocalWhisperWorkerResponse,
} from './localWhisperProtocol';
import { normalizeLocalWhisperDownloadProgress } from './localWhisperProgress';

const LOCAL_WHISPER_MODEL_IDS: Record<LocalWhisperModelSize, string> = {
  tiny: 'onnx-community/whisper-tiny',
  base: 'onnx-community/whisper-base',
  small: 'onnx-community/whisper-small',
};
const LOCAL_WHISPER_MODEL_OPTIONS = {
  device: 'webgpu',
  dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
} as const;
const WARM_UP_SAMPLE_COUNT = 16_000;

interface WorkerScope {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<LocalWhisperWorkerRequest>) => void
  ): void;
  postMessage(message: LocalWhisperWorkerResponse): void;
}

const workerScope = globalThis as unknown as WorkerScope;
env.allowLocalModels = false;

const transcriberPromises = new Map<
  LocalWhisperModelSize,
  Promise<AutomaticSpeechRecognitionPipeline>
>();
let requestQueue = Promise.resolve();

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function postResponse(response: LocalWhisperWorkerResponse): void {
  workerScope.postMessage(response);
}

function debugTiming(
  enabled: boolean | undefined,
  label: string,
  timings: Record<string, string | number>
): void {
  if (enabled === true) {
    console.debug(`[aituber-onair/transcription] ${label}`, timings);
  }
}

async function createTranscriber(
  model: LocalWhisperModelSize,
  debug: boolean | undefined
): Promise<AutomaticSpeechRecognitionPipeline> {
  const modelLoadStartedAt = performance.now();
  const transcriber = await pipeline(
    'automatic-speech-recognition',
    LOCAL_WHISPER_MODEL_IDS[model],
    {
      ...LOCAL_WHISPER_MODEL_OPTIONS,
      progress_callback: (data: unknown) => {
        const progress = normalizeLocalWhisperDownloadProgress(data);
        if (progress) postResponse({ type: 'progress', progress });
      },
    }
  );
  const modelLoadedAt = performance.now();
  postResponse({ type: 'progress', progress: { phase: 'initialize' } });
  await transcriber(new Float32Array(WARM_UP_SAMPLE_COUNT), {
    language: 'en',
    task: 'transcribe',
  });
  const warmUpCompletedAt = performance.now();
  postResponse({ type: 'progress', progress: { phase: 'ready' } });
  debugTiming(debug, 'Local Whisper initialization', {
    model,
    modelLoadMs: modelLoadedAt - modelLoadStartedAt,
    warmUpMs: warmUpCompletedAt - modelLoadedAt,
    totalMs: warmUpCompletedAt - modelLoadStartedAt,
  });
  return transcriber;
}

function getTranscriber(
  model: LocalWhisperModelSize,
  debug: boolean | undefined
): Promise<AutomaticSpeechRecognitionPipeline> {
  const current = transcriberPromises.get(model);
  if (current) return current;

  const transcriber = createTranscriber(model, debug);
  transcriberPromises.set(model, transcriber);
  return transcriber;
}

async function handleRequest(
  request: LocalWhisperWorkerRequest
): Promise<void> {
  if (request.type === 'load') {
    try {
      await getTranscriber(request.model, request.debug);
      postResponse({ type: 'ready', model: request.model });
    } catch (cause) {
      postResponse({
        type: 'error',
        model: request.model,
        message: errorMessage(cause),
      });
    }
    return;
  }

  try {
    const transcriber = await getTranscriber(request.model, request.debug);
    const inferenceStartedAt = performance.now();
    const result = await transcriber(request.audio, {
      ...(request.language ? { language: request.language } : {}),
      task: 'transcribe',
    });
    const inferenceCompletedAt = performance.now();
    const text = result.text.trim();
    debugTiming(request.debug, 'Local Whisper inference', {
      model: request.model,
      inferenceMs: inferenceCompletedAt - inferenceStartedAt,
    });
    postResponse({ type: 'result', requestId: request.requestId, text });
  } catch (cause) {
    postResponse({
      type: 'error',
      requestId: request.requestId,
      message: errorMessage(cause),
    });
  }
}

workerScope.addEventListener('message', (event) => {
  requestQueue = requestQueue.then(() => handleRequest(event.data));
});
