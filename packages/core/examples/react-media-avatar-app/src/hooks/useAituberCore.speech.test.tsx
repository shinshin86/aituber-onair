// @vitest-environment jsdom
import {
  AITuberOnAirCoreEvent,
  type VoiceServiceOptions,
} from '@aituber-onair/core';
import { act, useLayoutEffect } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TTSEngineOption } from '../types/settings';
import { useAituberCore } from './useAituberCore';
import { useSettings } from './useSettings';

const instances = vi.hoisted(
  () =>
    [] as Array<{
      options: { voiceOptions: VoiceServiceOptions };
      emit: (event: string, data?: unknown) => void;
      updateVoiceService: ReturnType<typeof vi.fn<[VoiceServiceOptions], void>>;
      stopSpeech: ReturnType<typeof vi.fn<[], void>>;
      dispose: ReturnType<typeof vi.fn<[], void>>;
    }>,
);

vi.mock('@aituber-onair/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aituber-onair/core')>();
  return {
    ...actual,
    AITuberOnAirCore: class {
      static getSupportedModels = actual.AITuberOnAirCore.getSupportedModels;
      listeners = new Map<string, (data?: unknown) => void>();
      options: { voiceOptions: VoiceServiceOptions };
      constructor(options: { voiceOptions: VoiceServiceOptions }) {
        this.options = options;
        instances.push(this);
      }
      on(event: string, listener: (data?: unknown) => void) {
        this.listeners.set(event, listener);
      }
      emit(event: string, data?: unknown) {
        this.listeners.get(event)?.(data);
      }
      getChatHistory = () => [];
      setChatHistory = vi.fn();
      updateVoiceService = vi.fn<[VoiceServiceOptions], void>();
      stopSpeech = vi.fn(() =>
        this.emit(actual.AITuberOnAirCoreEvent.SPEECH_END),
      );
      dispose = vi.fn(() => this.listeners.clear());
    },
  };
});

let root: Root;
let current: ReturnType<typeof useAituberCore>;
let settingsHook: ReturnType<typeof useSettings>;
const onSpeechStart = vi.fn();
const onSpeechEnd = vi.fn();
function Harness() {
  const settingsResult = useSettings();
  const core = useAituberCore({
    settings: settingsResult.settings,
    getApiKeyForProvider: settingsResult.getApiKeyForProvider,
    onSpeechStart,
    onSpeechEnd,
  });
  useLayoutEffect(() => {
    current = core;
    settingsHook = settingsResult;
  });
  return null;
}

// Record makes a newly added engine require coverage here too.
const engines: Record<TTSEngineOption, true> = {
  openai: true,
  geminiTts: true,
  openaiCompatible: true,
  voicevox: true,
  voicepeak: true,
  aivisSpeech: true,
  aivisCloud: true,
  minimax: true,
  xai: true,
  unrealSpeech: true,
  elevenLabs: true,
  fishAudio: true,
  cartesia: true,
  inworld: true,
  deepgram: true,
  gradium: true,
  openRouter: true,
  piperPlus: true,
  webSpeech: true,
  none: true,
};

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  instances.length = 0;
  onSpeechStart.mockClear();
  onSpeechEnd.mockClear();
  localStorage.clear();
  root = createRoot(document.createElement('div'));
});
afterEach(() => {
  act(() => root.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mount(engine: TTSEngineOption = 'openaiCompatible') {
  localStorage.setItem(
    'react-media-avatar-app-settings',
    JSON.stringify({
      llm: {
        provider: 'openai-compatible',
        endpoint: 'http://localhost:8080/v1',
      },
      tts: { engine },
      kizuna: { enabled: false },
      manneri: { enabled: false },
    }),
  );
  act(() => root.render(<Harness />));
}

describe('Core speech playback', () => {
  it.each(Object.keys(engines) as TTSEngineOption[])(
    'uses standard playback for %s on creation and settings updates',
    (engine) => {
      mount(engine);
      const core = instances[0];
      expect(core.options.voiceOptions.engineType).toBe(engine);
      expect(core.options.voiceOptions).not.toHaveProperty('onPlay');
      act(() => settingsHook.updateTTSSpeaker('updated-voice'));
      const options = core.updateVoiceService.mock.lastCall![0];
      expect(options.engineType).toBe(engine);
      expect(options.speaker).toBe('updated-voice');
      expect(options).not.toHaveProperty('onPlay');
      expect(instances).toHaveLength(1);
    },
  );

  it('tracks speech events, explicit stops and errors without audio analysis', () => {
    mount();
    const core = instances[0];
    const screenplay = { text: 'Hello', emotion: 'happy' };
    expect(current.isSpeaking).toBe(false);
    act(() => core.emit(AITuberOnAirCoreEvent.SPEECH_START, { screenplay }));
    expect(current.isSpeaking).toBe(true);
    expect(onSpeechStart).toHaveBeenLastCalledWith(screenplay);
    act(() => core.emit(AITuberOnAirCoreEvent.SPEECH_END));
    expect(current.isSpeaking).toBe(false);
    expect(onSpeechEnd).toHaveBeenCalledTimes(1);
    act(() => core.emit(AITuberOnAirCoreEvent.SPEECH_START, screenplay));
    expect(onSpeechStart).toHaveBeenLastCalledWith(screenplay);
    act(() => current.stopSpeech());
    expect(core.stopSpeech).toHaveBeenCalledTimes(1);
    expect(current.isSpeaking).toBe(false);
    act(() => core.emit(AITuberOnAirCoreEvent.SPEECH_START, screenplay));
    act(() =>
      core.emit(AITuberOnAirCoreEvent.ERROR, new Error('Playback failed')),
    );
    expect(current.isSpeaking).toBe(false);
    expect(onSpeechEnd).toHaveBeenCalledTimes(3);
  });

  it('stops playback and resets the emotion when replacing Core', () => {
    mount();
    const oldCore = instances[0];
    act(() =>
      oldCore.emit(AITuberOnAirCoreEvent.SPEECH_START, { emotion: 'sad' }),
    );
    act(() => settingsHook.updateLLMModel('another-model'));
    expect(oldCore.stopSpeech).toHaveBeenCalledTimes(1);
    expect(oldCore.dispose).toHaveBeenCalledTimes(1);
    expect(current.isSpeaking).toBe(false);
    expect(onSpeechEnd).toHaveBeenCalledTimes(1);
    expect(instances).toHaveLength(2);
  });
});
