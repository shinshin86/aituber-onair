// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMikoVoice } from './useMikoVoice';

const voiceMocks = vi.hoisted(() => ({
  getVoiceEngineVoiceList: vi.fn(),
}));
const originalFetch = globalThis.fetch;
const fetchMock = vi.fn(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    throw new Error('Unexpected fetch');
  }
);

vi.mock('@aituber-onair/voice', () => ({
  AIVIS_SPEECH_API_URL: 'http://localhost:10101',
  VoiceEngineAdapter: class {
    stop() {}
    async speakText() {}
  },
  getVoiceEngineVoiceList: voiceMocks.getVoiceEngineVoiceList,
}));

function VoiceHarness() {
  const voice = useMikoVoice({ reports: [], phase: 'pre', runId: 0 });
  return (
    <output data-aivis-state={voice.aivisState}>{voice.aivisState}</output>
  );
}

describe('useMikoVoice', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    voiceMocks.getVoiceEngineVoiceList.mockResolvedValue([]);
    fetchMock.mockClear();
    globalThis.fetch = fetchMock as typeof fetch;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<VoiceHarness />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('keeps AivisSpeech unchecked until the user requests a probe', () => {
    expect(container.querySelector('output')?.dataset.aivisState).toBe(
      'unchecked'
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(voiceMocks.getVoiceEngineVoiceList).toHaveBeenCalledTimes(1);
    expect(voiceMocks.getVoiceEngineVoiceList).toHaveBeenCalledWith(
      'webSpeech',
      { timeoutMs: 1_200 }
    );
  });
});
