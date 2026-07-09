import { describe, expect, it, vi } from 'vitest';
import {
  WebSpeechEngine,
  waitForWebSpeechVoices,
} from '../src/engines/WebSpeechEngine';

class FakeSpeechSynthesisUtterance {
  text: string;
  lang = '';
  voice: SpeechSynthesisVoice | null = null;
  volume = 1;
  rate = 1;
  pitch = 1;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text = '') {
    this.text = text;
  }
}

function createVoice(
  name: string,
  overrides: Partial<SpeechSynthesisVoice> = {},
): SpeechSynthesisVoice {
  return {
    name,
    voiceURI: `${name}-uri`,
    lang: 'ja-JP',
    localService: true,
    default: false,
    ...overrides,
  } as SpeechSynthesisVoice;
}

describe('WebSpeechEngine', () => {
  it('returns an empty audio buffer for VoiceEngine compatibility', async () => {
    const engine = new WebSpeechEngine();

    await expect(
      engine.fetchAudio({ style: 'talk', message: 'Hello' }, ''),
    ).resolves.toHaveProperty('byteLength', 0);
  });

  it('speaks directly using SpeechSynthesisUtterance', async () => {
    const voice = createVoice('Kyoko');
    const synthesis = {
      getVoices: vi.fn().mockReturnValue([voice]),
      speak: vi.fn((utterance: FakeSpeechSynthesisUtterance) => {
        utterance.onend?.();
      }),
      cancel: vi.fn(),
      speaking: false,
      pending: false,
    } as unknown as SpeechSynthesis;

    const engine = new WebSpeechEngine({
      synthesis,
      utteranceCtor:
        FakeSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
    });
    engine.setRate(1.5);
    engine.setPitch(1.2);
    engine.setVolume(0.8);
    engine.setLanguage('ja-JP');

    await engine.speakDirectly(
      { style: 'talk', message: 'こんにちは' },
      'Kyoko',
    );

    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    const utterance = vi.mocked(synthesis.speak).mock
      .calls[0][0] as unknown as FakeSpeechSynthesisUtterance;
    expect(utterance.text).toBe('こんにちは');
    expect(utterance.voice).toBe(voice);
    expect(utterance.lang).toBe('ja-JP');
    expect(utterance.rate).toBe(1.5);
    expect(utterance.pitch).toBe(1.2);
    expect(utterance.volume).toBe(0.8);
  });

  it('rejects unknown speakers', async () => {
    const synthesis = {
      getVoices: vi.fn().mockReturnValue([createVoice('Kyoko')]),
      speak: vi.fn(),
      cancel: vi.fn(),
      speaking: false,
      pending: false,
    } as unknown as SpeechSynthesis;
    const engine = new WebSpeechEngine({
      synthesis,
      utteranceCtor:
        FakeSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
    });

    await expect(
      engine.speakDirectly({ style: 'talk', message: 'hello' }, 'Unknown'),
    ).rejects.toThrow('Web Speech voice not found: Unknown');
  });

  it('waits for voiceschanged when voices are initially empty', async () => {
    const voice = createVoice('Kyoko');
    const synthesis = {
      onvoiceschanged: null,
      getVoices: vi.fn().mockReturnValueOnce([]).mockReturnValueOnce([voice]),
    } as unknown as SpeechSynthesis;

    const promise = waitForWebSpeechVoices(synthesis, 100);
    synthesis.onvoiceschanged?.(new Event('voiceschanged'));

    await expect(promise).resolves.toEqual([voice]);
  });
});
