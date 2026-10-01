import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AudioPlayerFactory } from '../src/services/audio/AudioPlayerFactory';

vi.mock('../examples/react-basic/src/hooks/usePiperPlusStatus', () => ({
  usePiperPlusStatus: () => ({ available: false, loading: false, error: null }),
}));

// Resolve React and its renderer together, whether the example's own React 18
// dependencies are installed or the workspace's React dependencies are used.
const exampleRequire = createRequire(
  resolve(__dirname, '../examples/react-basic/src/App.tsx'),
);
let createElement: typeof import('react').createElement;
let act: typeof import('react').act;
let createRoot: typeof import('react-dom/client').createRoot;
let App: typeof import('../examples/react-basic/src/App').default;
let dom: JSDOM;
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
const fetchMock = vi.fn();
const playMock = vi.fn();
const audio = new Uint8Array([82, 73, 70, 70]).buffer;

function field<T extends HTMLElement>(selector: string): T {
  const element = container.querySelector<T>(selector);
  expect(element, `Expected ${selector} to be rendered`).not.toBeNull();
  return element!;
}

async function select(selector: string, value: string) {
  await act(async () => {
    const element = field<HTMLSelectElement>(selector);
    element.value = value;
    element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
}

async function enterText(selector: string, value: string) {
  await act(async () => {
    const element = field<HTMLInputElement>(selector);
    const setter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      'value',
    )?.set;
    setter!.call(element, value);
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}

async function speak() {
  await act(async () => {
    field<HTMLButtonElement>('.button-group button').click();
    await vi.waitFor(() => expect(playMock).toHaveBeenCalled());
  });
  expect(field('.status').textContent).toBe('Playback completed');
}

describe('Gradium model selection in the React example', () => {
  beforeAll(async () => {
    // Package setup intentionally replaces window/document with audio mocks.
    // This integration test needs a real DOM to dispatch React input events.
    dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost/',
    });
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('navigator', dom.window.navigator);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    ({ createElement, act } = exampleRequire('react'));
    ({ createRoot } = exampleRequire('react-dom/client'));
    ({ default: App } = await import('../examples/react-basic/src/App'));
  });

  beforeEach(async () => {
    fetchMock.mockReset().mockResolvedValue({
      ok: true,
      blob: async () => ({ arrayBuffer: async () => audio }),
    });
    vi.stubGlobal('fetch', fetchMock);
    let onComplete: (() => void) | undefined;
    playMock.mockReset().mockImplementation(async () => onComplete?.());
    vi.spyOn(AudioPlayerFactory, 'createAudioPlayer').mockReturnValue({
      play: playMock,
      stop: vi.fn(),
      isPlaying: () => false,
      setOnComplete: (callback) => {
        onComplete = callback;
      },
      dispose: vi.fn(),
    });
    container = dom.window.document.createElement('div');
    dom.window.document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(createElement(App)));
    await select('#engine', 'gradium');
    await enterText('#apiKey', 'mock-gradium-key');
    await act(async () => {
      field<HTMLButtonElement>(
        '.parameter-card .collapsible-card__trigger',
      ).click();
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    dom.window.close();
  });

  it('renders production initially and sends the default model on Speak', async () => {
    const model = field<HTMLSelectElement>('#gradiumModel');
    expect(model.value).toBe('default');
    expect(
      Array.from(model.options, ({ value, textContent }) => [
        value,
        textContent,
      ]),
    ).toEqual([
      ['default', 'default — Production (default)'],
      ['gradium-tts-beta', 'gradium-tts-beta — Beta (opt-in)'],
    ]);
    expect(model.closest('[aria-hidden]')?.getAttribute('aria-hidden')).toBe(
      'false',
    );
    expect(field('#gradiumModelNote').textContent).toContain('explicit opt-in');

    await speak();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.gradium.ai/api/post/speech/tts',
    );
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request).toMatchObject({
      model_name: 'default',
      voice_id: 'YTpq7expH9539ERJ',
      output_format: 'wav',
      only_audio: true,
    });
    expect(playMock).toHaveBeenCalledWith(audio, undefined);
  });

  it('sends beta only after opt-in and uses the latest selection on repeated Speak', async () => {
    await select('#gradiumModel', 'gradium-tts-beta');
    expect(fetchMock).not.toHaveBeenCalled();
    await speak();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model_name).toBe(
      'gradium-tts-beta',
    );

    playMock.mockClear();
    await select('#gradiumModel', 'default');
    await speak();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model_name).toBe(
      'default',
    );
  });

  it('resets beta to production when leaving and re-entering Gradium', async () => {
    await select('#gradiumModel', 'gradium-tts-beta');
    await select('#engine', 'openai');
    expect(container.querySelector('#gradiumModel')).toBeNull();
    await select('#engine', 'gradium');
    expect(field<HTMLSelectElement>('#gradiumModel').value).toBe('default');
    expect(fetchMock).not.toHaveBeenCalled();

    await enterText('#apiKey', 'mock-gradium-key');
    await speak();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model_name).toBe(
      'default',
    );
  });
});
