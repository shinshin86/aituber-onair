import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from '../src/App';

// Keep the actual App, adapter, engine, catalog parser and option wiring.
// Only the network and audio device are faked; no provider request is allowed.
const audio = vi.hoisted(() => ({ played: vi.fn() }));
vi.mock('../../../src/services/audio/AudioPlayerFactory', () => ({
  AudioPlayerFactory: {
    createAudioPlayer: () => {
      let onComplete: (() => void) | undefined;
      return {
        setOnComplete: (callback: () => void) => {
          onComplete = callback;
        },
        play: async (buffer: ArrayBuffer) => {
          audio.played(buffer);
          onComplete?.();
        },
        stop: vi.fn(),
        dispose: vi.fn(),
      };
    },
  },
}));

type Route = (init: RequestInit) => Response | Promise<Response>;
let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;
const routes = new Map<string, Route>();
const unexpectedRequests: string[] = [];
const mp3Bytes = new Uint8Array([73, 68, 51, 1, 2, 3]).buffer;
const wavBytes = new Uint8Array([82, 73, 70, 70, 1, 2, 3]).buffer;

function jsonResponse(value: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'fixture response',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => value,
    text: async () => JSON.stringify(value),
  } as Response;
}

function audioResponse(bytes = mp3Bytes, contentType = 'audio/mpeg'): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': contentType }),
    arrayBuffer: async () => bytes,
    blob: async () => ({ arrayBuffer: async () => bytes }),
  } as Response;
}

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  unexpectedRequests.length = 0;
  routes.clear();
  audio.played.mockClear();
  routes.set('HEAD /piper/dist/ort.min.js', () => jsonResponse({}, 404));
  fetchMock = vi.fn(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const key = `${init.method ?? 'GET'} ${String(input)}`;
      const route = routes.get(key);
      if (route) return route(init);
      unexpectedRequests.push(key);
      throw new Error('Unexpected request: provider traffic must be mocked');
    },
  );
  vi.stubGlobal('fetch', fetchMock);
  for (const transport of ['XMLHttpRequest', 'WebSocket', 'EventSource']) {
    vi.stubGlobal(
      transport,
      vi.fn(() => {
        unexpectedRequests.push(transport);
        throw new Error(`${transport} is blocked in offline DOM tests`);
      }),
    );
  }
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(App)));
});

afterEach(async () => {
  try {
    await act(async () => root.unmount());
    container.remove();
    expect(unexpectedRequests).toEqual([]);
  } finally {
    vi.unstubAllGlobals();
  }
});

function field(id: string) {
  const element = container.querySelector<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >(`#${id}`);
  if (!element) throw new Error(`Missing field ${id}`);
  return element;
}

async function change(id: string, value: string) {
  await act(async () => {
    const element = field(id);
    const prototype =
      element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(
      element,
      value,
    );
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? 'change' : 'input', {
        bubbles: true,
      }),
    );
  });
}

function button(selector: string): HTMLButtonElement {
  const element = container.querySelector<HTMLButtonElement>(selector);
  if (!element) throw new Error(`Missing button ${selector}`);
  return element;
}

async function click(selector: string) {
  await act(async () => button(selector).click());
}

const speakButton = '.button-group button:first-child';
const listButton = (provider: string) =>
  provider === 'Deepgram'
    ? 'button[aria-label="Deepgram の公開カタログを確認"]'
    : `button[aria-label="${provider} の話者一覧を取得"]`;

async function configureElevenLabs() {
  await change('engine', 'elevenLabs');
  await change('apiKey', '<YOUR_API_KEY>');
  routes.set('GET https://api.elevenlabs.io/v2/voices', (init) => {
    expect(init.headers).toEqual({ 'xi-api-key': '<YOUR_API_KEY>' });
    return jsonResponse({
      voices: [{ voice_id: 'fixture-eleven-voice', name: 'Fixture voice' }],
    });
  });
  await click(listButton('ElevenLabs'));
}

describe('Voice sample DOM flow with fake network and audio', () => {
  it('routes Eleven v4 through HTTP and restores retained settings when switching back', async () => {
    await configureElevenLabs();
    await change('text', 'A custom sample');
    await change('apiUrl', 'https://tts.example.test/eleven');
    await change('elevenLabsStability', '0.4');
    await change('elevenLabsSimilarityBoost', '0.8');
    await change('elevenLabsStyle', '0.2');
    await change('elevenLabsSpeed', '1.1');
    await change('elevenLabsUseSpeakerBoost', 'true');
    await change('elevenLabsModel', 'eleven_v4');
    expect(container.querySelector('#elevenLabsStyle')).toBeNull();
    expect(container.querySelector('#elevenLabsSpeed')).toBeNull();
    expect(container.querySelector('#elevenLabsUseSpeakerBoost')).toBeNull();
    expect(field('apiUrl').value).toBe('https://tts.example.test/eleven');
    expect(field('text').value).toBe('A custom sample');
    expect(
      container.querySelector('option[value="eleven_v4_turbo"]'),
    ).toBeNull();

    const bodies: Record<string, unknown>[] = [];
    routes.set(
      'POST https://tts.example.test/eleven/fixture-eleven-voice?output_format=mp3_44100_128',
      (init) => {
        expect(init.headers).toEqual({
          'Content-Type': 'application/json',
          'xi-api-key': '<YOUR_API_KEY>',
        });
        bodies.push(JSON.parse(init.body as string));
        return audioResponse();
      },
    );
    await click(speakButton);
    expect(bodies[0]).toEqual({
      text: 'A custom sample',
      model_id: 'eleven_v4',
      voice_settings: { stability: 0.4, similarity_boost: 0.8 },
    });
    expect(audio.played).toHaveBeenLastCalledWith(mp3Bytes);
    expect(container.querySelector('.status')?.textContent).toBe(
      'Playback completed',
    );
    expect(button(speakButton).disabled).toBe(false);

    await change('elevenLabsModel', 'eleven_flash_v2_5');
    expect(field('elevenLabsStyle').value).toBe('0.2');
    expect(field('elevenLabsSpeed').value).toBe('1.1');
    expect(field('elevenLabsUseSpeakerBoost').value).toBe('true');
    await click(speakButton);
    expect(bodies[1]).toEqual({
      text: 'A custom sample',
      model_id: 'eleven_flash_v2_5',
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.8,
        style: 0.2,
        speed: 1.1,
        use_speaker_boost: true,
      },
    });
    expect(audio.played).toHaveBeenCalledTimes(2);
  });

  it('sends both Cartesia 3.6 selectors with their chosen voice, format and pinned API version', async () => {
    await change('engine', 'cartesia');
    await change('apiKey', 'fake-cartesia-key');
    routes.set(
      'GET https://api.cartesia.ai/voices?limit=100&language=ja',
      (init) => {
        expect(init.headers).toEqual({
          Authorization: 'Bearer fake-cartesia-key',
          'Cartesia-Version': '2026-03-01',
        });
        return jsonResponse({
          data: [
            {
              id: 'fixture-cartesia-voice',
              name: 'Fixture voice',
              language: 'ja',
            },
          ],
          has_more: false,
        });
      },
    );
    await click(listButton('Cartesia'));
    await change('text', 'こんにちは');
    await change('apiUrl', 'https://tts.example.test/cartesia');
    const bodies: Record<string, unknown>[] = [];
    routes.set('POST https://tts.example.test/cartesia', (init) => {
      expect(init.headers).toEqual({
        Authorization: 'Bearer fake-cartesia-key',
        'Content-Type': 'application/json',
        'Cartesia-Version': '2026-03-01',
      });
      bodies.push(JSON.parse(init.body as string));
      return audioResponse(wavBytes, 'audio/wav');
    });
    for (const model of ['sonic-3.6', 'sonic-3.6-2026-08-27']) {
      await change('cartesiaModel', model);
      await click(speakButton);
      expect(bodies[bodies.length - 1]).toEqual({
        model_id: model,
        transcript: 'こんにちは',
        voice: { id: 'fixture-cartesia-voice' },
        output_format: {
          container: 'wav',
          sample_rate: 44100,
          encoding: 'pcm_s16le',
        },
        language: 'ja',
      });
      expect(field('apiUrl').value).toBe('https://tts.example.test/cartesia');
      expect(audio.played).toHaveBeenLastCalledWith(wavBytes);
    }
    await change('cartesiaModel', 'sonic-3.5');
    await change('cartesiaModel', 'sonic-3.6');
    expect(field('speaker').value).toBe('fixture-cartesia-voice');
    expect(field('text').value).toBe('こんにちは');
  });

  it('uses the Deepgram catalog without a key and sends selected Flux voice and speed through the proxy', async () => {
    await change('engine', 'deepgram');
    expect(field('text').value).toBe(
      'Hello! Welcome to the AITuber OnAir Voice React demo.',
    );
    expect(field('speaker').value).toBe('flux-haley-en');
    expect(field('apiUrl').value).toBe('/api/deepgram/v2/speak');
    expect(button(listButton('Deepgram')).disabled).toBe(false);
    routes.set('GET /api/deepgram/v2/models', (init) => {
      expect(init.headers).toBeUndefined();
      return jsonResponse({
        tts: [
          { canonical_name: 'flux-haley-en', name: 'Haley' },
          { canonical_name: 'flux-kit-en', name: 'Kit' },
          { canonical_name: 'aura-2-thalia-en', name: 'Aura' },
          { canonical_name: 'flux-example-ja', name: 'Other language' },
        ],
      });
    });
    await click(listButton('Deepgram'));
    expect(
      Array.from((field('speaker') as HTMLSelectElement).options).map(
        (option) => option.value,
      ),
    ).toEqual(['flux-haley-en', 'flux-kit-en']);
    await change('speaker', 'flux-kit-en');
    await change('apiKey', 'fake-deepgram-key');
    await change('deepgramSpeed', '0.8');
    await change('text', 'Custom English sample');
    routes.set(
      'POST http://localhost:3000/api/deepgram/v2/speak?model=flux-kit-en&encoding=mp3&speed=0.8',
      (init) => {
        expect(init.headers).toEqual({
          Authorization: 'Token fake-deepgram-key',
          'Content-Type': 'application/json',
        });
        expect(JSON.parse(init.body as string)).toEqual({
          text: 'Custom English sample',
        });
        return audioResponse();
      },
    );
    await click(speakButton);
    expect(audio.played).toHaveBeenLastCalledWith(mp3Bytes);
    expect(container.querySelector('.status')?.textContent).toBe(
      'Playback completed',
    );

    await change('engine', 'openai');
    await change('engine', 'deepgram');
    expect(field('text').value).toBe('Custom English sample');
    expect(field('speaker').value).toBe('flux-haley-en');
    expect(field('deepgramSpeed').value).toBe('');
    expect(field('apiKey').value).toBe('');
  });

  it('keeps the Deepgram preset across catalog errors and empty catalogs, then adds voices on retry', async () => {
    await change('engine', 'deepgram');
    routes.set('GET /api/deepgram/v2/models', () =>
      jsonResponse({ message: 'unavailable' }, 503),
    );
    await click(listButton('Deepgram'));
    expect(
      container.querySelector('.speaker-fetch-message--error')?.textContent,
    ).toContain('503');
    expect(field('speaker').value).toBe('flux-haley-en');
    expect(button(listButton('Deepgram')).disabled).toBe(false);

    routes.set('GET /api/deepgram/v2/models', () => jsonResponse({ tts: [] }));
    await click(listButton('Deepgram'));
    expect(field('speaker').value).toBe('flux-haley-en');
    expect(container.querySelector('.speaker-fetch-message--error')).toBeNull();
    expect(container.querySelector('.status')?.textContent).toContain(
      'Haley preset',
    );
    expect(container.querySelector('.status')?.className).toContain('info');

    routes.set('GET /api/deepgram/v2/models', () =>
      jsonResponse({ tts: [{ canonical_name: 'flux-kit-en', name: 'Kit' }] }),
    );
    await click(listButton('Deepgram'));
    expect(field('speaker').value).toBe('flux-haley-en');
    expect(container.querySelector('.status')?.textContent).toContain(
      'Loaded 1 Flux voices',
    );
    await change('speaker', 'flux-kit-en');
    expect(field('speaker').value).toBe('flux-kit-en');
    expect(button(listButton('Deepgram')).disabled).toBe(false);
  });

  it('preserves a selected Deepgram voice and inputs across empty, failed, and changed catalog refreshes', async () => {
    await change('engine', 'deepgram');
    routes.set('GET /api/deepgram/v2/models', () =>
      jsonResponse({
        tts: [
          { canonical_name: 'flux-kit-en', name: 'Kit' },
          { canonical_name: 'flux-fixture-en', name: 'Additional fixture' },
        ],
      }),
    );
    await click(listButton('Deepgram'));
    await change('speaker', 'flux-kit-en');
    await change('apiKey', 'fake-deepgram-key');
    await change('deepgramSpeed', '0.8');
    await change('text', 'Keep this English sample');
    await change('apiUrl', 'https://tts.example.test/flux');

    for (const response of [
      jsonResponse({ tts: [] }),
      jsonResponse({
        tts: [{ canonical_name: 'aura-2-thalia-en', name: 'Aura' }],
      }),
      jsonResponse({ message: 'unavailable' }, 503),
    ]) {
      routes.set('GET /api/deepgram/v2/models', () => response);
      await click(listButton('Deepgram'));
      expect(field('speaker').value).toBe('flux-kit-en');
      expect(field('apiKey').value).toBe('fake-deepgram-key');
      expect(field('deepgramSpeed').value).toBe('0.8');
      expect(field('text').value).toBe('Keep this English sample');
      expect(field('apiUrl').value).toBe('https://tts.example.test/flux');
      expect(button(listButton('Deepgram')).disabled).toBe(false);
      expect(
        Array.from((field('speaker') as HTMLSelectElement).options).map(
          (option) => option.value,
        ),
      ).toEqual(['flux-haley-en', 'flux-kit-en', 'flux-fixture-en']);
      if (response.status === 503) {
        expect(
          container.querySelector('.speaker-fetch-message--error')?.textContent,
        ).toContain('503');
        expect(container.querySelector('.status')?.className).toContain(
          'error',
        );
      } else {
        expect(
          container.querySelector('.speaker-fetch-message--error'),
        ).toBeNull();
      }
    }

    routes.set('GET /api/deepgram/v2/models', () =>
      jsonResponse({
        tts: [{ canonical_name: 'flux-haley-en', name: 'Haley' }],
      }),
    );
    await click(listButton('Deepgram'));
    expect(field('speaker').value).toBe('flux-kit-en');
    expect(
      Array.from((field('speaker') as HTMLSelectElement).options).map(
        (option) => option.value,
      ),
    ).toEqual(['flux-haley-en', 'flux-kit-en']);
    expect(container.querySelector('.speaker-fetch-message--error')).toBeNull();
    expect(container.querySelector('.status')?.textContent).toContain(
      'Loaded 1 Flux voices',
    );
    expect(audio.played).not.toHaveBeenCalled();
  });

  it('requires a Deepgram key and recovers from a generation error without losing custom input', async () => {
    await change('engine', 'deepgram');
    await change('text', 'Keep this custom text');
    await click(speakButton);
    expect(container.querySelector('.status')?.textContent).toContain(
      'API key is required',
    );
    expect(audio.played).not.toHaveBeenCalled();
    await change('apiKey', 'fake-deepgram-key');
    await change('apiUrl', 'https://tts.example.test/flux');
    const route =
      'POST https://tts.example.test/flux?model=flux-haley-en&encoding=mp3';
    routes.set(route, () =>
      jsonResponse({ message: 'fixture rejection' }, 401),
    );
    await click(speakButton);
    expect(container.querySelector('.status')?.textContent).toContain('401');
    expect(button(speakButton).disabled).toBe(false);
    expect(field('text').value).toBe('Keep this custom text');
    expect(field('apiUrl').value).toBe('https://tts.example.test/flux');
    expect(audio.played).not.toHaveBeenCalled();

    routes.set(route, () => audioResponse());
    await click(speakButton);
    expect(audio.played).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.status')?.textContent).toBe(
      'Playback completed',
    );
  });

  it('ignores a late voice catalog after switching providers', async () => {
    await change('engine', 'elevenLabs');
    await change('apiKey', '<YOUR_API_KEY>');
    let complete: (value: Response) => void = () => {};
    routes.set(
      'GET https://api.elevenlabs.io/v2/voices',
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    await click(listButton('ElevenLabs'));
    expect(button(listButton('ElevenLabs')).disabled).toBe(true);
    await change('engine', 'deepgram');
    await act(async () =>
      complete(
        jsonResponse({
          voices: [{ voice_id: 'old-eleven-voice', name: 'Stale voice' }],
        }),
      ),
    );
    expect(field('speaker').value).toBe('flux-haley-en');
    expect(container.textContent).not.toContain('Stale voice');
    expect(button(listButton('Deepgram')).disabled).toBe(false);
  });

  it('keeps a newer catalog request busy when an older provider request fails', async () => {
    await change('engine', 'elevenLabs');
    await change('apiKey', '<YOUR_API_KEY>');
    let failOld: (error: Error) => void = () => {};
    routes.set(
      'GET https://api.elevenlabs.io/v2/voices',
      () =>
        new Promise((_resolve, reject) => {
          failOld = reject;
        }),
    );
    await click(listButton('ElevenLabs'));
    await change('engine', 'deepgram');
    let completeNew: (value: Response) => void = () => {};
    routes.set(
      'GET /api/deepgram/v2/models',
      () =>
        new Promise((resolve) => {
          completeNew = resolve;
        }),
    );
    await click(listButton('Deepgram'));
    await act(async () => failOld(new Error('Old provider unavailable')));
    expect(button(listButton('Deepgram')).disabled).toBe(true);
    expect(container.querySelector('.speaker-fetch-message--error')).toBeNull();
    await act(async () =>
      completeNew(
        jsonResponse({ tts: [{ canonical_name: 'flux-kit-en', name: 'Kit' }] }),
      ),
    );
    expect(field('speaker').value).toBe('flux-haley-en');
    expect(
      container.querySelector('option[value="flux-kit-en"]'),
    ).not.toBeNull();
    expect(button(listButton('Deepgram')).disabled).toBe(false);
  });

  it('does not reuse an old catalog after switching away and back to the same provider', async () => {
    await change('engine', 'elevenLabs');
    await change('apiKey', '<YOUR_API_KEY>');
    let complete: (value: Response) => void = () => {};
    routes.set(
      'GET https://api.elevenlabs.io/v2/voices',
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    await click(listButton('ElevenLabs'));
    await change('engine', 'deepgram');
    await change('engine', 'elevenLabs');
    await act(async () =>
      complete(
        jsonResponse({
          voices: [{ voice_id: 'old-eleven-voice', name: 'Stale voice' }],
        }),
      ),
    );
    expect(field('speaker').value).toBe('');
    expect(field('speaker').disabled).toBe(true);
    expect(field('apiKey').value).toBe('');
    expect(container.textContent).not.toContain('Stale voice');
  });

  it('blocks repeated Speak clicks during generation and completes the audio callback once', async () => {
    await change('engine', 'deepgram');
    await change('apiKey', 'fake-deepgram-key');
    await change('text', 'One request only');
    await change('apiUrl', 'https://tts.example.test/flux');
    let complete: (value: Response) => void = () => {};
    const request = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
    );
    routes.set(
      'POST https://tts.example.test/flux?model=flux-haley-en&encoding=mp3',
      request,
    );
    await click(speakButton);
    expect(button(speakButton).disabled).toBe(true);
    await click(speakButton);
    expect(request).toHaveBeenCalledTimes(1);
    expect(audio.played).not.toHaveBeenCalled();
    await act(async () => complete(audioResponse()));
    expect(audio.played).toHaveBeenCalledTimes(1);
    expect(button(speakButton).disabled).toBe(false);
    expect(container.querySelector('.status')?.textContent).toBe(
      'Playback completed',
    );
  });
});

const openRouterListButton =
  'button[aria-label="Fetch OpenRouter model voices"]';
const maiModel = 'microsoft/mai-voice-2.1';
const flashModel = 'microsoft/mai-voice-2.1-flash';
const maiVoice = 'en-US-Harper:MAI-Voice-2.1';
const maiCzechVoice = 'cs-CZ-Grant:MAI-Voice-2.1';
const maiSecondVoice = 'en-US-Ava:MAI-Voice-2.1';
const flashVoice = 'en-US-Harper:MAI-Voice-2.1-Flash';
const modelsRoute =
  'GET https://openrouter.ai/api/v1/models?output_modalities=speech';

const openRouterPcmBytes = new Uint8Array([0, 0, 255, 127, 0, 128, 1, 0])
  .buffer;

function expectOpenRouterWav(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const chunkName = (offset: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + 4));
  expect(buffer.byteLength).toBe(44 + openRouterPcmBytes.byteLength);
  expect(chunkName(0)).toBe('RIFF');
  expect(view.getUint32(4, true)).toBe(36 + openRouterPcmBytes.byteLength);
  expect(chunkName(8)).toBe('WAVE');
  expect(chunkName(12)).toBe('fmt ');
  expect(view.getUint32(16, true)).toBe(16);
  expect(view.getUint16(20, true)).toBe(1); // PCM
  expect(view.getUint16(22, true)).toBe(1); // Mono
  expect(view.getUint32(24, true)).toBe(24000);
  expect(view.getUint32(28, true)).toBe(48000);
  expect(view.getUint16(32, true)).toBe(2);
  expect(view.getUint16(34, true)).toBe(16);
  expect(chunkName(36)).toBe('data');
  expect(view.getUint32(40, true)).toBe(openRouterPcmBytes.byteLength);
  expect(bytes.subarray(44)).toEqual(new Uint8Array(openRouterPcmBytes));
}

function openRouterCatalog() {
  return jsonResponse({
    data: [
      {
        id: maiModel,
        supported_voices: [maiCzechVoice, maiVoice, maiSecondVoice],
      },
      { id: flashModel, supported_voices: [flashVoice] },
      { id: 'other/model', supported_voices: ['unrelated-voice'] },
    ],
  });
}

async function configureOpenRouter() {
  await change('engine', 'openRouter');
  await change('apiKey', 'fake-openrouter-key');
  await change('openRouterModel', maiModel);
  routes.set(modelsRoute, (init) => {
    expect(init.headers).toEqual({
      Authorization: 'Bearer fake-openrouter-key',
    });
    return openRouterCatalog();
  });
  await click(openRouterListButton);
  await change('speaker', maiVoice);
}

describe('OpenRouter public-preview model flow with offline fixtures', () => {
  it('keeps OpenAI as default and requires explicit preview model and catalog voice selection', async () => {
    expect(field('engine').value).toBe('openai');
    await change('engine', 'openRouter');
    expect(field('openRouterModel').value).toBe('');
    expect(field('speaker').value).toBe('');
    expect(field('speaker').disabled).toBe(true);
    expect(button(speakButton).disabled).toBe(true);
    expect(button(openRouterListButton).disabled).toBe(true);
    expect(field('text').value).toBe(
      'Hello! Welcome to the AITuber OnAir Voice React demo.',
    );
    expect(field('apiUrl').value).toBe(
      'https://openrouter.ai/api/v1/audio/speech',
    );
    expect(field('openRouterModelsApiUrl').value).toBe(
      'https://openrouter.ai/api/v1/models',
    );
    expect(container.textContent).toContain('no service-level agreement (SLA)');
    expect(container.textContent).toContain('not recommended for production');
    expect(
      container.querySelector(
        'input[id*="Speed"], select[id*="Emotion"], input[id*="Style"]',
      ),
    ).toBeNull();
    expect(
      Array.from((field('openRouterModel') as HTMLSelectElement).options).map(
        (option) => option.value,
      ),
    ).toEqual(['', maiModel, flashModel]);

    await change('apiKey', 'fake-openrouter-key');
    expect(button(openRouterListButton).disabled).toBe(true);
    await change('openRouterModel', maiModel);
    expect(button(openRouterListButton).disabled).toBe(false);
    expect(button(speakButton).disabled).toBe(true);
    routes.set(modelsRoute, () => openRouterCatalog());
    await click(openRouterListButton);
    expect(
      Array.from((field('speaker') as HTMLSelectElement).options).map(
        (option) => option.value,
      ),
    ).toEqual(['', maiCzechVoice, maiVoice, maiSecondVoice]);
    expect(field('speaker').value).toBe('');
    expect(button(speakButton).disabled).toBe(true);
    await change('speaker', maiVoice);
    expect(button(speakButton).disabled).toBe(false);
    await change('speaker', '');
    expect(button(speakButton).disabled).toBe(true);
    expect(audio.played).not.toHaveBeenCalled();
  });

  it('preserves an explicitly selected catalog voice on refresh only while it remains available', async () => {
    await configureOpenRouter();
    await change('speaker', maiSecondVoice);
    await click(openRouterListButton);
    expect(field('speaker').value).toBe(maiSecondVoice);
    expect(button(speakButton).disabled).toBe(false);
    routes.set(modelsRoute, () =>
      jsonResponse({
        data: [{ id: maiModel, supported_voices: [maiCzechVoice, maiVoice] }],
      }),
    );
    await click(openRouterListButton);
    expect(field('speaker').value).toBe('');
    expect(button(speakButton).disabled).toBe(true);
    await change('speaker', maiVoice);
    expect(button(speakButton).disabled).toBe(false);
  });

  it('clears an existing OpenRouter voice when a successful catalog refresh returns no voices', async () => {
    await configureOpenRouter();
    expect(field('speaker').value).toBe(maiVoice);
    expect(button(speakButton).disabled).toBe(false);
    routes.set(modelsRoute, () =>
      jsonResponse({
        data: [{ id: maiModel, supported_voices: [] }],
      }),
    );
    await click(openRouterListButton);
    expect(field('speaker').value).toBe('');
    expect(field('speaker').disabled).toBe(true);
    expect(button(speakButton).disabled).toBe(true);
    expect(container.querySelector(`option[value="${maiVoice}"]`)).toBeNull();
    expect(
      container.querySelector('.speaker-fetch-message--error')?.textContent,
    ).toContain('No speakers found');
  });

  it.each([
    ['missing model', () => jsonResponse({ data: [] })],
    [
      'null supported voices',
      () => jsonResponse({ data: [{ id: maiModel, supported_voices: null }] }),
    ],
    ['invalid response shape', () => jsonResponse({ data: 'invalid' })],
    [
      'HTTP failure',
      () => jsonResponse({ error: { message: 'unavailable' } }, 503),
    ],
    [
      'transport failure',
      () => {
        throw new TypeError('Failed to fetch');
      },
    ],
  ] as const)(
    'clears a selected OpenRouter voice after %s and requires explicit reselection on retry',
    async (_name, response) => {
      await configureOpenRouter();
      expect(field('speaker').value).toBe(maiVoice);
      expect(button(speakButton).disabled).toBe(false);
      routes.set(modelsRoute, response);
      await click(openRouterListButton);
      expect(field('speaker').value).toBe('');
      expect(field('speaker').disabled).toBe(true);
      expect(button(speakButton).disabled).toBe(true);
      expect(
        Array.from((field('speaker') as HTMLSelectElement).options).map(
          (option) => option.value,
        ),
      ).toEqual(['']);
      expect(
        container.querySelector('.speaker-fetch-message--error'),
      ).not.toBeNull();

      routes.set(modelsRoute, () => openRouterCatalog());
      await click(openRouterListButton);
      expect(
        container.querySelector('.speaker-fetch-message--error'),
      ).toBeNull();
      expect(field('speaker').disabled).toBe(false);
      expect(field('speaker').value).toBe('');
      expect(button(speakButton).disabled).toBe(true);
      await change('speaker', maiVoice);
      expect(button(speakButton).disabled).toBe(false);
      expect(audio.played).not.toHaveBeenCalled();
    },
  );

  it('sends selected model and voice to the speech URL, with independent catalog URL and runtime changes', async () => {
    await change('engine', 'openRouter');
    await change('apiKey', 'fake-openrouter-key');
    await change('openRouterModel', maiModel);
    await change('apiUrl', 'https://tts.example.test/speech');
    await change(
      'openRouterModelsApiUrl',
      'https://catalog.example.test/models?scope=demo',
    );
    await change('text', 'A custom English sample');
    routes.set(
      'GET https://catalog.example.test/models?scope=demo&output_modalities=speech',
      (init) => {
        expect(init.headers).toEqual({
          Authorization: 'Bearer fake-openrouter-key',
        });
        return openRouterCatalog();
      },
    );
    await click(openRouterListButton);
    await change('speaker', maiVoice);
    const bodies: Record<string, unknown>[] = [];
    routes.set('POST https://tts.example.test/speech', (init) => {
      expect(init.headers).toEqual({
        Authorization: 'Bearer fake-openrouter-key',
        'Content-Type': 'application/json',
      });
      bodies.push(JSON.parse(init.body as string));
      return audioResponse(openRouterPcmBytes, 'audio/pcm');
    });
    await click(speakButton);
    await change('speaker', maiSecondVoice);
    await click(speakButton);
    await change('openRouterModel', flashModel);
    expect(field('speaker').value).toBe('');
    expect(button(speakButton).disabled).toBe(true);
    expect(container.querySelector(`option[value="${maiVoice}"]`)).toBeNull();
    await click(openRouterListButton);
    expect(field('speaker').value).toBe('');
    expect(button(speakButton).disabled).toBe(true);
    await change('speaker', flashVoice);
    expect(field('speaker').value).toBe(flashVoice);
    await click(speakButton);
    expect(bodies).toEqual([
      {
        model: maiModel,
        input: 'A custom English sample',
        voice: maiVoice,
        response_format: 'pcm',
      },
      {
        model: maiModel,
        input: 'A custom English sample',
        voice: maiSecondVoice,
        response_format: 'pcm',
      },
      {
        model: flashModel,
        input: 'A custom English sample',
        voice: flashVoice,
        response_format: 'pcm',
      },
    ]);
    expect(audio.played).toHaveBeenCalledTimes(3);
    for (const [buffer] of audio.played.mock.calls) {
      expectOpenRouterWav(buffer);
    }
    expect(field('apiUrl').value).toBe('https://tts.example.test/speech');
    expect(field('openRouterModelsApiUrl').value).toBe(
      'https://catalog.example.test/models?scope=demo',
    );
    expect(field('apiKey').value).toBe('fake-openrouter-key');
    expect(field('text').value).toBe('A custom English sample');
  });

  it('ignores old successes and failures after rapid A-to-B-to-A model changes without clearing the newest loading state', async () => {
    await change('engine', 'openRouter');
    await change('apiKey', 'fake-openrouter-key');
    await change('openRouterModel', maiModel);
    const pending: {
      resolve: (value: Response) => void;
      reject: (error: Error) => void;
    }[] = [];
    routes.set(
      modelsRoute,
      () =>
        new Promise<Response>((resolve, reject) =>
          pending.push({ resolve, reject }),
        ),
    );
    await click(openRouterListButton);
    await change('openRouterModel', flashModel);
    expect(button(openRouterListButton).disabled).toBe(false);
    await click(openRouterListButton);
    await change('openRouterModel', maiModel);
    await click(openRouterListButton);
    expect(pending).toHaveLength(3);
    await act(async () => pending[0].resolve(openRouterCatalog()));
    expect(field('speaker').value).toBe('');
    expect(button(openRouterListButton).disabled).toBe(true);
    await act(async () =>
      pending[1].reject(new Error('Stale model request failed')),
    );
    expect(container.querySelector('.speaker-fetch-message--error')).toBeNull();
    expect(button(openRouterListButton).disabled).toBe(true);
    await act(async () => pending[2].resolve(openRouterCatalog()));
    expect(field('speaker').value).toBe('');
    expect(button(openRouterListButton).disabled).toBe(false);
    expect(button(speakButton).disabled).toBe(true);
    await change('speaker', maiVoice);
    expect(button(speakButton).disabled).toBe(false);
  });

  it.each(['apiKey', 'openRouterModelsApiUrl'])(
    'invalidates catalog selection and in-flight replies when %s changes',
    async (setting) => {
      await configureOpenRouter();
      let completeOld: (value: Response) => void = () => {};
      routes.set(
        modelsRoute,
        () =>
          new Promise<Response>((resolve) => {
            completeOld = resolve;
          }),
      );
      await click(openRouterListButton);
      await change(
        setting,
        setting === 'apiKey'
          ? 'replacement-fake-key'
          : 'https://catalog.example.test/replacement',
      );
      expect(field('speaker').value).toBe('');
      expect(button(speakButton).disabled).toBe(true);
      await act(async () => completeOld(openRouterCatalog()));
      expect(field('speaker').value).toBe('');
      expect(field('speaker').disabled).toBe(true);
      expect(button(openRouterListButton).disabled).toBe(false);
      expect(
        container.querySelector('.speaker-fetch-message--error'),
      ).toBeNull();
    },
  );

  it('resets preview opt-in after switching engines and ignores the old provider catalog', async () => {
    await configureOpenRouter();
    await change('text', 'Keep my custom text');
    let completeOld: (value: Response) => void = () => {};
    routes.set(
      modelsRoute,
      () =>
        new Promise<Response>((resolve) => {
          completeOld = resolve;
        }),
    );
    await click(openRouterListButton);
    await change('engine', 'openai');
    await change('engine', 'openRouter');
    await act(async () => completeOld(openRouterCatalog()));
    expect(field('openRouterModel').value).toBe('');
    expect(field('apiKey').value).toBe('');
    expect(field('speaker').value).toBe('');
    expect(field('text').value).toBe('Keep my custom text');
    expect(button(speakButton).disabled).toBe(true);
  });

  it('recovers from empty catalogs, catalog errors, and speech errors without a hidden fallback voice', async () => {
    await change('engine', 'openRouter');
    await change('apiKey', 'fake-openrouter-key');
    await change('openRouterModel', maiModel);
    for (const response of [
      jsonResponse({ data: [] }),
      jsonResponse({ error: { message: 'fixture rejection' } }, 503),
    ]) {
      routes.set(modelsRoute, () => response);
      await click(openRouterListButton);
      expect(field('speaker').value).toBe('');
      expect(button(speakButton).disabled).toBe(true);
      expect(button(openRouterListButton).disabled).toBe(false);
      expect(
        container.querySelector('.speaker-fetch-message--error'),
      ).not.toBeNull();
    }
    routes.set(modelsRoute, () => openRouterCatalog());
    await click(openRouterListButton);
    await change('speaker', maiVoice);
    await change('text', 'Keep the retry input');
    const speechRoute = 'POST https://openrouter.ai/api/v1/audio/speech';
    routes.set(speechRoute, () =>
      jsonResponse({ error: { message: 'fixture rejection' } }, 401),
    );
    await click(speakButton);
    expect(container.querySelector('.status')?.textContent).toContain('401');
    expect(field('speaker').value).toBe(maiVoice);
    expect(field('text').value).toBe('Keep the retry input');
    expect(button(speakButton).disabled).toBe(false);
    routes.set(speechRoute, () =>
      audioResponse(openRouterPcmBytes, 'audio/pcm'),
    );
    await click(speakButton);
    expect(audio.played).toHaveBeenCalledTimes(1);
    expectOpenRouterWav(audio.played.mock.calls[0][0]);
    expect(container.querySelector('.status')?.textContent).toBe(
      'Playback completed',
    );
  });
});
