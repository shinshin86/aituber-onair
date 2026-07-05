import { getInochiRuntimeSession } from './inochi2dRuntimeSession';

export type Inochi2DLipSyncController = {
  stop: () => void;
};

type InochiMouthControl =
  | {
      kind: 'vec2';
      parameterId: string;
      idleX: number;
      idleY: number;
      openY: number;
    }
  | {
      kind: 'scalar';
      parameterId: string;
      idleValue: number;
    };

const DEFAULT_MOUTH_PARAMETER_CANDIDATES: readonly InochiMouthControl[] = [
  {
    kind: 'vec2',
    parameterId: 'Mouth:: Shape',
    idleX: 1,
    idleY: 0,
    openY: 1,
  },
  {
    kind: 'scalar',
    parameterId: 'Mouth:: Open',
    idleValue: 0,
  },
  {
    kind: 'scalar',
    parameterId: 'Mouth:: Openness',
    idleValue: 0,
  },
  {
    kind: 'scalar',
    parameterId: 'Mouth Open',
    idleValue: 0,
  },
] as const;

const INOCHI2D_LIP_SYNC_FFT_SIZE = 2048;
const INOCHI2D_LIP_SYNC_BOOST = 18;
const INOCHI2D_LIP_SYNC_THRESHOLD = 0.02;
const INOCHI2D_LIP_SYNC_MAX = 0.9;
const INOCHI2D_LIP_SYNC_ATTACK_MS = 36;
const INOCHI2D_LIP_SYNC_RELEASE_MS = 92;
const INOCHI2D_LIP_SYNC_SILENCE_OPEN = 0.035;
const INOCHI2D_LIP_SYNC_MIN_VISEME_OPEN = 0.08;
const INOCHI2D_LIP_SYNC_VISEME_HOLD_MS = 56;
const INOCHI2D_LIP_SYNC_DEFAULT_FRAME_MS = 16.67;
const INOCHI2D_LIP_SYNC_START_ENVELOPE_MS = 70;
const INOCHI2D_LIP_SYNC_END_ENVELOPE_MS = 120;
type Inochi2DViseme = 'neutral' | 'a' | 'i' | 'u' | 'e' | 'o';

type LipSyncFrameState = {
  smoothedOpen: number;
  activeViseme: Inochi2DViseme;
  pendingViseme: Inochi2DViseme;
  pendingSinceMs: number;
  lastTimestampMs: number | null;
};

let sharedAudioContext: AudioContext | null = null;
let gestureResumeAttached = false;

// createMediaElementSource reroutes the element's output through the shared
// AudioContext, so playback stays silent while the context is suspended by
// the browser autoplay policy. resume() only succeeds inside a user gesture,
// hence the one-time gesture fallback.
const ensureAudioContextResumed = (audioContext: AudioContext) => {
  if (audioContext.state !== 'suspended') {
    return;
  }

  void audioContext.resume().catch(() => {
    // Blocked by autoplay policy; wait for a user gesture below.
  });

  if (gestureResumeAttached) {
    return;
  }
  gestureResumeAttached = true;

  const handleGesture = () => {
    void audioContext
      .resume()
      .catch(() => {
        // Keep listening for the next gesture.
      })
      .then(() => {
        if (audioContext.state !== 'suspended') {
          window.removeEventListener('pointerdown', handleGesture);
          window.removeEventListener('keydown', handleGesture);
          gestureResumeAttached = false;
        }
      });
  };
  window.addEventListener('pointerdown', handleGesture);
  window.addEventListener('keydown', handleGesture);
};

const getAudioContext = () => {
  if (!sharedAudioContext) {
    const audioContextConstructor =
      window.AudioContext ||
      (
        window as Window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!audioContextConstructor) {
      throw new Error('AudioContext is not supported in this browser.');
    }
    sharedAudioContext = new audioContextConstructor();
  }
  return sharedAudioContext;
};

const resolveMouthControl = (parameterIds: string[]): InochiMouthControl =>
  DEFAULT_MOUTH_PARAMETER_CANDIDATES.find((candidate) =>
    parameterIds.includes(candidate.parameterId),
  ) ?? DEFAULT_MOUTH_PARAMETER_CANDIDATES[0];

const convertRmsToMouthOpen = (rms: number) => {
  const boosted = Math.tanh(rms * INOCHI2D_LIP_SYNC_BOOST);
  const normalized = Math.max(
    0,
    (boosted - INOCHI2D_LIP_SYNC_THRESHOLD) / (1 - INOCHI2D_LIP_SYNC_THRESHOLD),
  );
  return Math.min(INOCHI2D_LIP_SYNC_MAX, normalized);
};

const calculateRms = (timeDomainData: Float32Array) => {
  if (timeDomainData.length === 0) {
    return 0;
  }

  let total = 0;
  for (let index = 0; index < timeDomainData.length; index++) {
    const sample = timeDomainData[index];
    total += sample * sample;
  }
  return Math.sqrt(total / timeDomainData.length);
};

const resolveSpeechEnvelope = (audio: HTMLAudioElement) => {
  const currentMs = Math.max(0, audio.currentTime * 1000);
  const startWeight = Math.min(
    1,
    currentMs / INOCHI2D_LIP_SYNC_START_ENVELOPE_MS,
  );
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
    return startWeight;
  }

  const remainingMs = Math.max(0, (audio.duration - audio.currentTime) * 1000);
  const endWeight = Math.min(
    1,
    remainingMs / INOCHI2D_LIP_SYNC_END_ENVELOPE_MS,
  );
  return Math.max(0, Math.min(startWeight, endWeight));
};

const resolveVisemeFromSpectrum = (
  frequencyData: Float32Array,
  sampleRate: number,
): Inochi2DViseme => {
  if (frequencyData.length === 0 || sampleRate <= 0) {
    return 'a';
  }

  const nyquist = sampleRate / 2;
  const bandEnergy = (fromHz: number, toHz: number) => {
    const fromIndex = Math.max(
      0,
      Math.floor((fromHz / nyquist) * frequencyData.length),
    );
    const toIndex = Math.min(
      frequencyData.length - 1,
      Math.ceil((toHz / nyquist) * frequencyData.length),
    );
    let total = 0;
    let count = 0;
    for (let index = fromIndex; index <= toIndex; index++) {
      total += 10 ** (frequencyData[index] / 20);
      count++;
    }
    return count > 0 ? total / count : 0;
  };

  const low = bandEnergy(120, 500);
  const mid = bandEnergy(500, 1600);
  const high = bandEnergy(1600, 4200);

  if (low > mid * 1.35 && low > high * 1.6) {
    return 'o';
  }
  if (high > mid * 1.2 && high > low * 1.2) {
    return 'i';
  }
  if (mid > low * 1.2 && mid > high * 1.05) {
    return 'e';
  }
  if (low > high * 1.15) {
    return 'u';
  }
  return 'a';
};

const createLipSyncFrameState = (): LipSyncFrameState => ({
  smoothedOpen: 0,
  activeViseme: 'neutral',
  pendingViseme: 'neutral',
  pendingSinceMs: 0,
  lastTimestampMs: null,
});

const resolveStableLipSyncFrame = (
  state: LipSyncFrameState,
  rawOpen: number,
  rawViseme: Inochi2DViseme,
  timestampMs: number,
) => {
  const deltaMs =
    state.lastTimestampMs === null
      ? INOCHI2D_LIP_SYNC_DEFAULT_FRAME_MS
      : Math.max(0, Math.min(100, timestampMs - state.lastTimestampMs));
  state.lastTimestampMs = timestampMs;

  const smoothingMs =
    rawOpen > state.smoothedOpen
      ? INOCHI2D_LIP_SYNC_ATTACK_MS
      : INOCHI2D_LIP_SYNC_RELEASE_MS;
  const mix = smoothingMs <= 0 ? 1 : 1 - Math.exp(-deltaMs / smoothingMs);
  state.smoothedOpen += (rawOpen - state.smoothedOpen) * mix;

  const targetViseme =
    state.smoothedOpen >= INOCHI2D_LIP_SYNC_MIN_VISEME_OPEN
      ? rawViseme
      : 'neutral';

  if (targetViseme === state.activeViseme) {
    state.pendingViseme = targetViseme;
    state.pendingSinceMs = timestampMs;
  } else if (targetViseme !== state.pendingViseme) {
    state.pendingViseme = targetViseme;
    state.pendingSinceMs = timestampMs;
  } else if (
    timestampMs - state.pendingSinceMs >=
    INOCHI2D_LIP_SYNC_VISEME_HOLD_MS
  ) {
    state.activeViseme = targetViseme;
    state.pendingSinceMs = timestampMs;
  }

  return {
    open: state.smoothedOpen,
    viseme: state.activeViseme,
  };
};

export const startInochi2DLipSync = (
  audio: HTMLAudioElement,
): Inochi2DLipSyncController | null => {
  const runtimeSession = getInochiRuntimeSession();
  const controller = runtimeSession?.getController();
  if (!runtimeSession || !controller) {
    return null;
  }

  const audioContext = getAudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = INOCHI2D_LIP_SYNC_FFT_SIZE;
  analyser.smoothingTimeConstant = 0.18;
  const timeDomainData = new Float32Array(analyser.fftSize);
  const frequencyData = new Float32Array(analyser.frequencyBinCount);
  const source = audioContext.createMediaElementSource(audio);

  const mouthControl = resolveMouthControl(
    runtimeSession.getRegisteredParameterIds(),
  );

  source.connect(analyser);
  analyser.connect(audioContext.destination);

  let rafId = 0;
  let stopped = false;
  let started = false;
  const frameState = createLipSyncFrameState();

  const applyMouthValue = (value: number, viseme: Inochi2DViseme) => {
    const activeSession = getInochiRuntimeSession();
    const activeController = activeSession?.getController();
    if (!activeSession || !activeController) {
      return;
    }

    if (typeof activeController.setLipSyncValue === 'function') {
      void Promise.resolve(
        activeController.setLipSyncValue(value, {
          viseme,
        }),
      );
      return;
    }

    if (
      mouthControl.kind === 'vec2' &&
      typeof activeController.setParameterVector === 'function'
    ) {
      const openWeight = Math.max(
        0,
        Math.min(1, value / INOCHI2D_LIP_SYNC_MAX),
      );
      const mouthY =
        mouthControl.idleY +
        (mouthControl.openY - mouthControl.idleY) * openWeight;
      void Promise.resolve(
        activeController.setParameterVector(
          mouthControl.parameterId,
          mouthControl.idleX,
          mouthY,
        ),
      );
      return;
    }

    void Promise.resolve(
      activeController.setParameter(mouthControl.parameterId, value),
    );
  };

  const applyIdleMouthValue = () => {
    const activeSession = getInochiRuntimeSession();
    const activeController = activeSession?.getController();
    if (!activeSession || !activeController) {
      return;
    }

    if (typeof activeController.setLipSyncValue === 'function') {
      void Promise.resolve(
        activeController.setLipSyncValue(0, {
          viseme: 'neutral',
          immediate: true,
        }),
      );
      return;
    }

    if (
      mouthControl.kind === 'vec2' &&
      typeof activeController.setParameterVector === 'function'
    ) {
      void Promise.resolve(
        activeController.setParameterVector(
          mouthControl.parameterId,
          mouthControl.idleX,
          mouthControl.idleY,
        ),
      );
      return;
    }

    const idleValue =
      mouthControl.kind === 'scalar'
        ? mouthControl.idleValue
        : mouthControl.idleY;
    void Promise.resolve(
      activeController.setParameter(mouthControl.parameterId, idleValue),
    );
  };

  const cleanup = () => {
    if (stopped) {
      return;
    }
    stopped = true;
    cancelAnimationFrame(rafId);
    applyIdleMouthValue();
    audio.removeEventListener('play', startTracking);
    audio.removeEventListener('playing', startTracking);
    audio.removeEventListener('ended', handleEnded);
    audio.removeEventListener('pause', handlePause);
    audio.removeEventListener('error', handleError);
    try {
      source.disconnect();
      analyser.disconnect();
    } catch {
      // ignore disconnect errors
    }
  };

  const startTracking = () => {
    if (stopped || started) {
      return;
    }
    started = true;
    rafId = requestAnimationFrame(update);
  };

  const handleEnded = () => cleanup();
  const handlePause = () => {
    if (started) {
      cleanup();
    }
  };
  const handleError = () => cleanup();

  audio.addEventListener('play', startTracking, { once: true });
  audio.addEventListener('playing', startTracking, { once: true });
  audio.addEventListener('ended', handleEnded, { once: true });
  audio.addEventListener('pause', handlePause, { once: true });
  audio.addEventListener('error', handleError, { once: true });

  const update = () => {
    if (stopped) {
      return;
    }

    if (!started) {
      return;
    }

    if (audio.paused || audio.ended) {
      cleanup();
      return;
    }

    analyser.getFloatTimeDomainData(timeDomainData);
    analyser.getFloatFrequencyData(frequencyData);

    const envelope = resolveSpeechEnvelope(audio);
    const rawOpen =
      convertRmsToMouthOpen(calculateRms(timeDomainData)) * envelope;
    const rawViseme =
      rawOpen >= INOCHI2D_LIP_SYNC_SILENCE_OPEN
        ? resolveVisemeFromSpectrum(frequencyData, audioContext.sampleRate)
        : 'neutral';
    const frame = resolveStableLipSyncFrame(
      frameState,
      rawOpen,
      rawViseme,
      performance.now(),
    );
    applyMouthValue(frame.open, frame.viseme);
    rafId = requestAnimationFrame(update);
  };

  ensureAudioContextResumed(audioContext);

  return {
    stop: cleanup,
  };
};

export const resetInochi2DMouthToIdle = () => {
  const runtimeSession = getInochiRuntimeSession();
  const controller = runtimeSession?.getController();
  if (!runtimeSession || !controller) {
    return;
  }

  const mouthControl = resolveMouthControl(
    runtimeSession.getRegisteredParameterIds(),
  );

  if (
    mouthControl.kind === 'vec2' &&
    typeof controller.setParameterVector === 'function'
  ) {
    if (typeof controller.setLipSyncValue === 'function') {
      void Promise.resolve(
        controller.setLipSyncValue(0, {
          viseme: 'neutral',
          immediate: true,
        }),
      );
    }
    void Promise.resolve(
      controller.setParameterVector(
        mouthControl.parameterId,
        mouthControl.idleX,
        mouthControl.idleY,
      ),
    );
    return;
  }

  const idleValue =
    mouthControl.kind === 'scalar'
      ? mouthControl.idleValue
      : mouthControl.idleY;
  void Promise.resolve(
    controller.setParameter(mouthControl.parameterId, idleValue),
  );
};
