// @vitest-environment jsdom

import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettings } from './useSettings';

let root: Root;
let container: HTMLDivElement;
let latest: ReturnType<typeof useSettings>;
function Harness() {
  latest = useSettings();
  return null;
}
const mount = () => act(() => root.render(<Harness />));

describe('voice input settings persistence', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each([undefined, { mode: 'continuous', service: 'gemini' }])(
    'loads old settings with empty local defaults',
    (voiceInput) => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) =>
        key.endsWith('-settings') ? JSON.stringify({ voiceInput }) : null,
      );
      mount();
      expect(latest.settings.voiceInput.local).toEqual({
        baseUrl: '',
        model: '',
        apiKey: '',
      });
      expect(latest.settings.voiceInput.mode).toBe(voiceInput?.mode ?? 'once');
      expect(latest.settings.voiceInput.service).toBe(
        voiceInput?.service ?? 'browser',
      );
    },
  );

  it('persists and reloads local configuration independently of the cloud keys', () => {
    mount();
    const keys = { ...latest.settings.llm.apiKeys };
    const local = {
      baseUrl: 'http://localhost:8080/v1',
      model: 'local-model',
      apiKey: 'local-test-key',
    };
    act(() => {
      latest.updateVoiceInputService('local');
      latest.updateVoiceInputMode('continuous');
      latest.updateLocalVoiceInput(local);
    });
    act(() => root.unmount());
    root = createRoot(container);
    mount();
    expect(latest.settings.voiceInput).toEqual({
      service: 'local',
      mode: 'continuous',
      local,
    });
    expect(latest.settings.llm.apiKeys).toEqual(keys);
  });
});
