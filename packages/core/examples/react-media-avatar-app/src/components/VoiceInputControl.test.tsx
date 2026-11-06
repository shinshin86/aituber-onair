// @vitest-environment jsdom

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCAL_VOICE_INPUT,
  type VoiceInputService,
  type VoiceInputMode,
} from '../lib/voiceInput';
import { VoiceInputControl } from './VoiceInputControl';

function Harness() {
  const [service, setService] = useState<VoiceInputService>('browser');
  const [local, setLocal] = useState(DEFAULT_LOCAL_VOICE_INPUT);
  const [mode, setMode] = useState<VoiceInputMode>('once');
  return (
    <VoiceInputControl
      phase="idle"
      standby={false}
      micDisabled={false}
      onMicClick={() => undefined}
      mode={mode}
      onModeChange={setMode}
      service={service}
      onServiceChange={setService}
      local={local}
      onLocalChange={setLocal}
      apiKeys={{ openai: '', gemini: '' }}
      onApiKeyChange={() => undefined}
    />
  );
}

let root: Root;
let container: HTMLDivElement;

const menu = () => container.querySelector('[role="menu"]');
const modeItem = (label: string) =>
  Array.from(
    container.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
  ).find((item) => item.textContent?.includes(label));

describe('VoiceInputControl', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<Harness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('keeps the menu open while switching the listening mode', () => {
    const optionsButton = container.querySelector<HTMLButtonElement>(
      '[aria-haspopup="menu"]',
    );
    act(() => optionsButton?.click());
    expect(menu()).not.toBeNull();

    act(() => modeItem('継続して会話')?.click());
    expect(menu()).not.toBeNull();
    expect(modeItem('継続して会話')?.getAttribute('aria-checked')).toBe('true');
    expect(modeItem('一回だけ')?.getAttribute('aria-checked')).toBe('false');

    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(menu()).toBeNull();
  });

  it('shows the verified preset, optional fields, resolved URL and CORS origin', () => {
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')
        ?.click(),
    );
    act(() => modeItem('ローカルサーバー')?.click());
    const inputFor = (label: string) => {
      const element = Array.from(container.querySelectorAll('label')).find(
        (item) => item.textContent === label,
      );
      return container.querySelector<HTMLInputElement>(
        `[id="${element?.htmlFor}"]`,
      )!;
    };
    const url = inputFor('サーバー URL');
    expect(url.value).toBe('');
    expect(url.placeholder).toBe('http://127.0.0.1:8080');
    expect(inputFor('モデル（任意）').value).toBe('');
    expect(inputFor('API キー（任意）').type).toBe('password');
    const preset = container.querySelector('select')!;
    expect(Array.from(preset.options).map((option) => option.text)).toEqual([
      '手動入力',
      'speech.cpp',
    ]);
    act(() => {
      preset.value = 'http://127.0.0.1:8080';
      preset.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(url.value).toBe('http://127.0.0.1:8080');
    expect(container.textContent).toContain(
      'http://127.0.0.1:8080/v1/audio/transcriptions',
    );
    expect(container.textContent).toContain(window.location.origin);
    expect(container.textContent).toContain('プルリクエスト');
    const editUrl = (value: string) =>
      act(() => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )?.set?.call(url, value);
        url.dispatchEvent(new Event('input', { bubbles: true }));
      });
    editUrl('http://localhost:9000/v1');
    expect(preset.value).toBe('');
    expect(container.textContent).toContain(
      'http://localhost:9000/v1/audio/transcriptions',
    );
    editUrl('invalid');
    expect(container.textContent).toContain('無効な URL');
    act(() => modeItem('OpenAI の API キー')?.click());
    expect(container.querySelector('select')).toBeNull();
    expect(container.textContent).toContain('OpenAI の API キー');
  });
});
