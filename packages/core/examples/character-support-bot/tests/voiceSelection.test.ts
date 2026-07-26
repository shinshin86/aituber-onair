import { describe, expect, it } from 'vitest';
import {
  buildVoiceSelectOptions,
  resolveVoiceFieldMode,
} from '../src/voiceSelection';

const loadedVoices = [
  { id: '888753761', label: 'Mao - Normal' },
  { id: '888753762', label: 'Mao - Happy' },
];

describe('admin voice selection', () => {
  it('hides raw IDs while a supported voice list is loading', () => {
    expect(resolveVoiceFieldMode(true, 'idle', [])).toBe('loading');
    expect(resolveVoiceFieldMode(true, 'loading', [])).toBe('loading');
  });

  it('uses a select only after a non-empty voice list loads', () => {
    expect(resolveVoiceFieldMode(true, 'loaded', loadedVoices)).toBe('select');
    expect(resolveVoiceFieldMode(true, 'loaded', [])).toBe('input');
    expect(resolveVoiceFieldMode(true, 'error', loadedVoices)).toBe('input');
  });

  it('uses free-form input immediately for unsupported providers', () => {
    expect(resolveVoiceFieldMode(false, 'idle', [])).toBe('input');
    expect(resolveVoiceFieldMode(false, 'loading', loadedVoices)).toBe('input');
  });

  it('shows labels while keeping voice IDs as option values', () => {
    expect(
      buildVoiceSelectOptions(
        loadedVoices,
        '888753761',
        'Unknown (saved: {id})',
      ),
    ).toEqual(loadedVoices);
  });

  it('preserves a saved ID that is absent from the latest list', () => {
    expect(
      buildVoiceSelectOptions(
        loadedVoices,
        'removed-voice-id',
        'Unknown (saved: {id})',
      )[0],
    ).toEqual({
      id: 'removed-voice-id',
      label: 'Unknown (saved: removed-voice-id)',
    });
  });

  it('deduplicates repeated IDs without replacing the first label', () => {
    expect(
      buildVoiceSelectOptions(
        [loadedVoices[0], { id: '888753761', label: 'Duplicate label' }],
        '888753761',
        'Unknown (saved: {id})',
      ),
    ).toEqual([loadedVoices[0]]);
  });
});
