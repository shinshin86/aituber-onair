import { describe, expect, it } from 'vitest';
import {
  buildVoiceSelectOptions,
  shouldUseVoiceSelect,
} from '../src/voiceSelection';

const loadedVoices = [
  { id: '888753761', label: 'Mao - Normal' },
  { id: '888753762', label: 'Mao - Happy' },
];

describe('admin voice selection', () => {
  it('uses a select only after a non-empty voice list loads', () => {
    expect(shouldUseVoiceSelect('loaded', loadedVoices)).toBe(true);
    expect(shouldUseVoiceSelect('loaded', [])).toBe(false);
    expect(shouldUseVoiceSelect('error', loadedVoices)).toBe(false);
    expect(shouldUseVoiceSelect('idle', loadedVoices)).toBe(false);
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
