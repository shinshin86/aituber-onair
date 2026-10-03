// @vitest-environment jsdom
import { act, useLayoutEffect } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshCatalog } from '../openrouterCatalog';
import { useAituberCore } from './useAituberCore';
import { useSettings } from './useSettings';

vi.mock('@aituber-onair/voice', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    VoiceEngineAdapter: class {
      speakText = vi.fn(async () => {});
      stop = vi.fn();
      updateOptions = vi.fn();
      getOptions = vi.fn(() => ({}));
    },
  };
});

let root: Root;
let container: HTMLDivElement;
let current: ReturnType<typeof useAituberCore>;
let settingsHook: ReturnType<typeof useSettings>;
const model = 'sample/hook-text:free';
let models: string[];
let sent: Record<string, unknown>[];
let pendingGeneration: Promise<void> | undefined;
const onAudioPlay = async () => {};
function Harness() {
  const settingsResult = useSettings();
  const { settings, getApiKeyForProvider } = settingsResult;
  const core = useAituberCore({ settings, getApiKeyForProvider, onAudioPlay });
  useLayoutEffect(() => {
    current = core;
    settingsHook = settingsResult;
  });
  return <output>{core.partialResponse}</output>;
}

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.clear();
  localStorage.setItem(
    'react-pet-app-settings',
    JSON.stringify({
      llm: {
        provider: 'openrouter',
        model,
        apiKeys: { openrouter: 'mock-key' },
      },
      tts: { engine: 'none' },
      manneri: { enabled: false },
      kizuna: { enabled: false },
    }),
  );
  models = [model];
  sent = [];
  pendingGeneration = undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === 'https://openrouter.ai/api/v1/models') {
        return Response.json({
          data: models.map((id) => ({
            id,
            architecture: {
              input_modalities: ['text'],
              output_modalities: ['text'],
            },
            pricing: { prompt: '0', completion: '0' },
            supported_parameters: [],
          })),
        });
      }
      if (url !== 'https://openrouter.ai/api/v1/chat/completions') {
        throw new Error(`Unexpected network request blocked: ${url}`);
      }
      sent.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      await pendingGeneration;
      return new Response(
        'data: {"choices":[{"delta":{"content":"Mock reply."}}]}\n\ndata: [DONE]\n\n',
        {
          headers: { 'Content-Type': 'text/event-stream' },
        },
      );
    }),
  );
  await refreshCatalog(true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<Harness />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('avatar OpenRouter hooks', () => {
  it('shows the catalog block without sending or appending a new message', async () => {
    models = [];
    await act(async () => refreshCatalog(true));
    await act(async () => current.processChat('Should be blocked'));
    expect(sent).toHaveLength(0);
    expect(current.messages).toHaveLength(0);
    expect(container.textContent).toContain('absent');
  });

  it('rechecks a queued send after the preceding request finishes', async () => {
    let release!: () => void;
    pendingGeneration = new Promise<void>((resolve) => {
      release = resolve;
    });
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = current.processChat('First');
      // Let the first invocation reach the transport, but keep its reply pending.
      for (let i = 0; i < 20 && !sent.length; i++) await Promise.resolve();
      second = current.processChat('Queued');
    });
    expect(sent).toHaveLength(1);
    models = [];
    await act(async () => refreshCatalog(true));
    await act(async () => {
      release();
      await Promise.all([first, second]);
    });
    expect(sent).toHaveLength(1);
    expect(
      current.messages.filter((message) => message.role === 'user'),
    ).toHaveLength(1);
    expect(container.textContent).toContain('absent');
  });

  it('rejects a screen capture when missing credentials leave Core unavailable', async () => {
    await act(async () => settingsHook.updateLLMApiKey('openrouter', ''));
    await act(async () => {
      await expect(
        current.processVisionChat('data:image/png;base64,mock'),
      ).rejects.toThrow('Configure the chat provider');
    });
    expect(sent).toHaveLength(0);
    expect(container.textContent).toContain('Configure the chat provider');
  });

  it('rejects unsupported screen vision and leaves a visible warning', async () => {
    await act(async () => {
      await expect(
        current.processVisionChat('data:image/png;base64,mock'),
      ).rejects.toThrow('Screen vision');
    });
    expect(sent).toHaveLength(0);
    expect(container.textContent).toContain('Screen vision');
  });
});
