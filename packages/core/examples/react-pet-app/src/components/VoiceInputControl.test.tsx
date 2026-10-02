// @vitest-environment jsdom

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { VoiceInputMode } from '../lib/voiceInput';
import { VoiceInputControl } from './VoiceInputControl';

function Harness() {
  const [mode, setMode] = useState<VoiceInputMode>('once');
  return (
    <VoiceInputControl
      phase="idle"
      standby={false}
      micDisabled={false}
      onMicClick={() => undefined}
      mode={mode}
      onModeChange={setMode}
      service="browser"
      onServiceChange={() => undefined}
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
});
