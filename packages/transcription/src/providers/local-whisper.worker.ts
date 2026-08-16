import {
  env,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';
import type {
  LocalWhisperWorkerRequest,
  LocalWhisperWorkerResponse,
} from './localWhisperProtocol';

const LOCAL_WHISPER_MODEL_ID = 'onnx-community/whisper-tiny';
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

let transcriberPromise: Promise<AutomaticSpeechRecognitionPipeline> | null =
  null;
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
  timings: Record<string, number>
): void {
  if (enabled === true) {
    console.debug(`[aituber-onair/transcription] ${label}`, timings);
  }
}

async function createTranscriber(
  debug: boolean | undefined
): Promise<AutomaticSpeechRecognitionPipeline> {
  const modelLoadStartedAt = performance.now();
  const transcriber = await pipeline(
    'automatic-speech-recognition',
    LOCAL_WHISPER_MODEL_ID,
    {
      ...LOCAL_WHISPER_MODEL_OPTIONS,
      progress_callback: (data: unknown) => {
        postResponse({ type: 'progress', data });
      },
    }
  );
  const modelLoadedAt = performance.now();
  await transcriber(new Float32Array(WARM_UP_SAMPLE_COUNT), {
    language: 'en',
    task: 'transcribe',
  });
  const warmUpCompletedAt = performance.now();
  debugTiming(debug, 'Local Whisper initialization', {
    modelLoadMs: modelLoadedAt - modelLoadStartedAt,
    warmUpMs: warmUpCompletedAt - modelLoadedAt,
    totalMs: warmUpCompletedAt - modelLoadStartedAt,
  });
  return transcriber;
}

function getTranscriber(
  debug: boolean | undefined
): Promise<AutomaticSpeechRecognitionPipeline> {
  transcriberPromise ??= createTranscriber(debug);
  return transcriberPromise;
}

async function handleRequest(
  request: LocalWhisperWorkerRequest
): Promise<void> {
  if (request.type === 'load') {
    try {
      await getTranscriber(request.debug);
      postResponse({ type: 'ready' });
    } catch (cause) {
      postResponse({ type: 'error', message: errorMessage(cause) });
    }
    return;
  }

  try {
    const transcriber = await getTranscriber(request.debug);
    const inferenceStartedAt = performance.now();
    const result = await transcriber(request.audio, {
      ...(request.language ? { language: request.language } : {}),
      task: 'transcribe',
    });
    const inferenceCompletedAt = performance.now();
    const text = result.text.trim();
    debugTiming(request.debug, 'Local Whisper inference', {
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
