import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const listVoices = vi.hoisted(() => vi.fn());
vi.mock('@aituber-onair/core', () => ({ getVoiceEngineVoiceList: listVoices }));

const examples = [
  'react-basic',
  'react-pngtuber-app',
  'react-pet-app',
  'react-vrm-app',
  'react-live2d-app',
  'react-purupuru-app',
  'react-inochi2d-app',
  'react-psd-app',
  'react-mesh-avatar-app',
  'react-single-image-avatar-app',
];

afterEach(() => vi.unstubAllGlobals());

describe.each(examples)('Deepgram catalog in %s', (example) => {
  it('retains a loaded list after empty and failed refreshes and ignores stale endpoint responses', async () => {
    const dom = new JSDOM(
      '<!doctype html><html><body><div id="root"></div></body></html>',
      { url: 'http://localhost/' },
    );
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('navigator', dom.window.navigator);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const requireExample = createRequire(
      resolve(
        __dirname,
        `../examples/${example}/src/hooks/useDeepgramVoices.ts`,
      ),
    );
    const { createElement, act } = requireExample('react');
    const { createRoot } = requireExample('react-dom/client');
    const { useDeepgramVoices } = await import(
      `../examples/${example}/src/hooks/useDeepgramVoices.ts`
    );
    const root = createRoot(dom.window.document.querySelector('#root'));
    let state: ReturnType<typeof useDeepgramVoices>;
    function Harness({ url }: { url: string }) {
      state = useDeepgramVoices(true, url);
      return createElement(
        'p',
        null,
        state.voices.map((voice) => voice.label).join(', '),
      );
    }
    const voices = [{ id: 'flux-kit-en', label: 'Kit' }];
    listVoices.mockReset().mockResolvedValue(voices);
    try {
      await act(async () =>
        root.render(createElement(Harness, { url: '/catalog' })),
      );
      expect(state!.voices).toEqual(voices);
      expect(listVoices).toHaveBeenCalledWith('deepgram', {
        voiceListApiUrl: '/catalog',
      });
      listVoices.mockResolvedValueOnce([]);
      await act(async () => state!.refresh());
      expect(state!.voices).toEqual(voices);
      expect(state!.error).toContain('keeping the current list');
      listVoices.mockRejectedValueOnce(new Error('offline'));
      await act(async () => state!.refresh());
      expect(state!.voices).toEqual(voices);
      expect(state!.error).toBe('offline');
      let finishOld: (result: typeof voices) => void = () => {};
      listVoices.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      );
      await act(async () =>
        root.render(createElement(Harness, { url: '/old' })),
      );
      const nextVoices = [{ id: 'flux-haley-en', label: 'Haley' }];
      listVoices.mockResolvedValueOnce(nextVoices);
      await act(async () =>
        root.render(createElement(Harness, { url: '/next' })),
      );
      await act(async () => finishOld(voices));
      expect(state!.voices).toEqual(nextVoices);
      expect(state!.loading).toBe(false);
    } finally {
      await act(async () => root.unmount());
      dom.window.close();
    }
  });
});
