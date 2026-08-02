import {
  AIVIS_SPEECH_API_URL,
  VoiceEngineAdapter,
  type VoiceEngineVoice,
  getVoiceEngineVoiceList,
} from '@aituber-onair/voice';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DemoPhase, FixtureReport } from '../types';

export type MikoVoiceEngine = 'off' | 'webSpeech' | 'aivisSpeech';
export type AivisConnectionState =
  | 'unchecked'
  | 'checking'
  | 'available'
  | 'unavailable';

const AIVIS_CHECK_TIMEOUT_MS = 1_500;
const DEFAULT_UTTERANCE_TIMEOUT_MS = 30_000;
const VOICE_TIMEOUT_NOTICE = '音声の生成に時間がかかったためスキップしました';

class VoiceUtteranceTimeoutError extends Error {
  constructor() {
    super('Voice utterance timed out');
    this.name = 'VoiceUtteranceTimeoutError';
  }
}

const getUtteranceTimeoutMs = () => {
  const developmentOverride = import.meta.env.DEV
    ? Number(import.meta.env.VITE_MIKO_VOICE_TIMEOUT_MS)
    : Number.NaN;

  return Number.isFinite(developmentOverride) && developmentOverride > 0
    ? developmentOverride
    : DEFAULT_UTTERANCE_TIMEOUT_MS;
};

const speakWithTimeout = async (
  service: VoiceEngineAdapter,
  text: string
): Promise<void> => {
  let timeoutId = 0;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new VoiceUtteranceTimeoutError()),
      getUtteranceTimeoutMs()
    );
  });

  try {
    await Promise.race([service.speakText(text), timeoutPromise]);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

interface UseMikoVoiceOptions {
  reports: readonly FixtureReport[];
  phase: DemoPhase;
  runId: number;
}

const getSpeechText = (report: FixtureReport) =>
  `観測です。${report.observation} 提案です。${report.suggestion}`;

export function useMikoVoice({ reports, phase, runId }: UseMikoVoiceOptions) {
  const [engine, setEngineState] = useState<MikoVoiceEngine>('off');
  const [webVoice, setWebVoice] = useState<VoiceEngineVoice | null>(null);
  const [aivisState, setAivisState] =
    useState<AivisConnectionState>('unchecked');
  const [aivisVoices, setAivisVoices] = useState<readonly VoiceEngineVoice[]>(
    []
  );
  const [aivisSpeaker, setAivisSpeaker] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingReportKind, setSpeakingReportKind] = useState<string | null>(
    null
  );
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const serviceRef = useRef<VoiceEngineAdapter | null>(null);
  const serviceFactoryRef = useRef<(() => VoiceEngineAdapter) | null>(null);
  const queueRef = useRef<FixtureReport[]>([]);
  const seenReportIdsRef = useRef(new Set<string>());
  const generationRef = useRef(0);
  const activeWorkerRef = useRef<number | null>(null);

  const cancelQueue = useCallback(() => {
    generationRef.current += 1;
    queueRef.current = [];
    serviceRef.current?.stop();
    setIsSpeaking(false);
    setSpeakingReportKind(null);
  }, []);

  const refreshAivis = useCallback(async () => {
    setAivisState('checking');
    setVoiceError(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      AIVIS_CHECK_TIMEOUT_MS
    );

    try {
      const response = await fetch(`${AIVIS_SPEECH_API_URL}/version`, {
        method: 'GET',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // This browser-side list request verifies both the local engine and CORS.
      const voices = await getVoiceEngineVoiceList('aivisSpeech', {
        apiUrl: AIVIS_SPEECH_API_URL,
      });
      if (voices.length === 0) throw new Error('話者が見つかりません');

      setAivisVoices(voices);
      setAivisSpeaker((current) =>
        voices.some((voice) => voice.id === current) ? current : voices[0].id
      );
      setAivisState('available');
    } catch {
      setAivisVoices([]);
      setAivisSpeaker('');
      setAivisState('unavailable');
      setEngineState((current) =>
        current === 'aivisSpeech' ? 'off' : current
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void getVoiceEngineVoiceList('webSpeech', { timeoutMs: 1_200 })
      .then((voices) => {
        if (!active) return;
        const japaneseVoice = voices.find((voice) =>
          voice.metadata?.language?.toLowerCase().startsWith('ja')
        );
        setWebVoice(japaneseVoice ?? null);
      })
      .catch(() => {
        if (active) setWebVoice(null);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    cancelQueue();
    setVoiceError(null);

    if (engine === 'webSpeech') {
      serviceFactoryRef.current = () =>
        new VoiceEngineAdapter({
          engineType: 'webSpeech',
          speaker: webVoice?.id ?? '',
          webSpeechLanguage: 'ja-JP',
          webSpeechRate: 1.05,
        });
    } else if (
      engine === 'aivisSpeech' &&
      aivisState === 'available' &&
      aivisSpeaker
    ) {
      serviceFactoryRef.current = () =>
        new VoiceEngineAdapter({
          engineType: 'aivisSpeech',
          speaker: aivisSpeaker,
          aivisSpeechApiUrl: AIVIS_SPEECH_API_URL,
        });
    } else {
      serviceFactoryRef.current = null;
    }
    serviceRef.current = serviceFactoryRef.current?.() ?? null;

    return () => {
      cancelQueue();
      serviceRef.current = null;
      serviceFactoryRef.current = null;
    };
  }, [aivisSpeaker, aivisState, cancelQueue, engine, webVoice?.id]);

  const startWorker = useCallback(() => {
    const generation = generationRef.current;
    if (activeWorkerRef.current === generation) return;
    activeWorkerRef.current = generation;

    void (async () => {
      while (
        generation === generationRef.current &&
        queueRef.current.length > 0
      ) {
        const report = queueRef.current.shift();
        const service = serviceRef.current;
        if (!report || !service) break;

        setIsSpeaking(true);
        setSpeakingReportKind(report.kind);
        setVoiceError(null);

        try {
          await speakWithTimeout(service, getSpeechText(report));
          if (generation === generationRef.current) setVoiceNotice(null);
        } catch (error) {
          if (generation !== generationRef.current) break;

          if (error instanceof VoiceUtteranceTimeoutError) {
            service.stop();
            if (serviceRef.current === service) {
              serviceRef.current = serviceFactoryRef.current?.() ?? null;
            }
            setVoiceNotice(VOICE_TIMEOUT_NOTICE);
            continue;
          }

          queueRef.current = [];
          setVoiceError(
            error instanceof Error
              ? error.message
              : '音声を再生できませんでした'
          );
          break;
        } finally {
          if (generation === generationRef.current) {
            setIsSpeaking(false);
            setSpeakingReportKind(null);
          }
        }
      }

      if (activeWorkerRef.current === generation) {
        activeWorkerRef.current = null;
      }
    })();
  }, []);

  useEffect(() => {
    const unseenReports = [...reports]
      .reverse()
      .filter((report) => !seenReportIdsRef.current.has(report.id));

    for (const report of unseenReports) {
      seenReportIdsRef.current.add(report.id);
    }

    if (
      unseenReports.length === 0 ||
      engine === 'off' ||
      phase !== 'monitoring' ||
      !serviceRef.current
    ) {
      return;
    }

    queueRef.current.push(...unseenReports);
    startWorker();
  }, [engine, phase, reports, startWorker]);

  useEffect(() => {
    void runId;
    seenReportIdsRef.current.clear();
    cancelQueue();
    setVoiceNotice(null);
  }, [cancelQueue, runId]);

  useEffect(() => {
    if (
      phase === 'pre' ||
      phase === 'paused' ||
      phase === 'ending' ||
      phase === 'complete'
    ) {
      cancelQueue();
    }
  }, [cancelQueue, phase]);

  const setEngine = useCallback(
    (nextEngine: MikoVoiceEngine) => {
      if (nextEngine === 'aivisSpeech' && aivisState !== 'available') return;
      cancelQueue();
      setVoiceNotice(null);
      setVoiceError(null);
      setEngineState(nextEngine);
    },
    [aivisState, cancelQueue]
  );

  const selectAivisSpeaker = useCallback(
    (speaker: string) => {
      cancelQueue();
      setVoiceNotice(null);
      setAivisSpeaker(speaker);
    },
    [cancelQueue]
  );

  return {
    engine,
    setEngine,
    webVoice,
    aivisState,
    aivisVoices,
    aivisSpeaker,
    selectAivisSpeaker,
    refreshAivis,
    isSpeaking,
    speakingReportKind,
    voiceNotice,
    voiceError,
  };
}
