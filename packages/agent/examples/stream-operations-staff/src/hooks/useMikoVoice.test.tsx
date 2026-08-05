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
    <>
      <button type="button" onClick={() => voice.setEngine('aivisSpeech')}>
        AivisSpeechを選択
      </button>
      <output
        data-aivis-state={voice.aivisState}
        data-engine={voice.engine}
        data-speaker={voice.aivisSpeaker}
        data-error={voice.voiceError ?? ''}
      >
        {voice.aivisState}
      </output>
    </>
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

  it('checks AivisSpeech when selected and keeps the selection on failure', async () => {
    await selectAivisSpeech();

    const output = getOutput();
    expect(output.dataset.engine).toBe('aivisSpeech');
    expect(output.dataset.aivisState).toBe('unavailable');
    expect(output.dataset.error).toContain('AivisSpeechに接続できませんでした');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:10101/version',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('loads speakers and enables AivisSpeech after a successful probe', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);
    voiceMocks.getVoiceEngineVoiceList.mockResolvedValueOnce([
      { id: '888753760', label: 'Anneli' },
    ]);

    await selectAivisSpeech();

    const output = getOutput();
    expect(output.dataset.engine).toBe('aivisSpeech');
    expect(output.dataset.aivisState).toBe('available');
    expect(output.dataset.speaker).toBe('888753760');
    expect(output.dataset.error).toBe('');
    expect(voiceMocks.getVoiceEngineVoiceList).toHaveBeenLastCalledWith(
      'aivisSpeech',
      { apiUrl: 'http://localhost:10101' }
    );
  });

  async function selectAivisSpeech(): Promise<void> {
    const button = container.querySelector('button');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('AivisSpeech button was not found');
    }
    await act(async () => {
      button.click();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  function getOutput(): HTMLOutputElement {
    const output = container.querySelector('output');
    if (!(output instanceof HTMLOutputElement)) {
      throw new Error('Voice state output was not found');
    }
    return output;
  }
});
