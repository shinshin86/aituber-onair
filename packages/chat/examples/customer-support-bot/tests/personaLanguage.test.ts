import { describe, expect, it } from 'vitest';
import {
  acceptPersonaReset,
  changePersonaLanguage,
  declinePersonaReset,
  reconcileSavedPersona,
  resolveLoadedPersona,
  syncDefaultPersonaToLanguage,
} from '../src/personaLanguage';

const defaultPersonas = {
  en: 'English default',
  ja: '日本語のデフォルト',
};

describe('persona language changes', () => {
  it('shows the UI language default when stored persona is either default', () => {
    expect(
      syncDefaultPersonaToLanguage(defaultPersonas.en, defaultPersonas, 'ja'),
    ).toBe(defaultPersonas.ja);
    expect(
      syncDefaultPersonaToLanguage(defaultPersonas.ja, defaultPersonas, 'en'),
    ).toBe(defaultPersonas.en);
  });

  it('silently replaces a default persona when language changes', () => {
    expect(
      changePersonaLanguage(defaultPersonas.en, defaultPersonas, 'ja'),
    ).toEqual({ persona: defaultPersonas.ja });
  });

  it('keeps a customized persona while requesting inline confirmation', () => {
    expect(
      changePersonaLanguage('Custom persona', defaultPersonas, 'ja'),
    ).toEqual({
      persona: 'Custom persona',
      pendingResetLanguage: 'ja',
    });
  });

  it('replaces a customized persona only when reset is accepted', () => {
    expect(acceptPersonaReset(defaultPersonas, 'ja')).toEqual({
      persona: defaultPersonas.ja,
    });
  });

  it('keeps a customized persona when reset is declined', () => {
    expect(declinePersonaReset('Custom persona')).toEqual({
      persona: 'Custom persona',
    });
  });

  it('keeps a customized persona without prompting on an ordinary load', () => {
    expect(
      resolveLoadedPersona('Custom persona', defaultPersonas, 'ja', false),
    ).toEqual({ persona: 'Custom persona' });
  });

  it('requests confirmation when language changed before loading completed', () => {
    expect(
      resolveLoadedPersona('Custom persona', defaultPersonas, 'ja', true),
    ).toEqual({
      persona: 'Custom persona',
      pendingResetLanguage: 'ja',
    });
  });

  it('uses the saved persona when language stayed unchanged during save', () => {
    expect(reconcileSavedPersona('Draft persona', 'Saved persona', false)).toBe(
      'Saved persona',
    );
  });

  it('preserves the current persona when language changed during save', () => {
    expect(
      reconcileSavedPersona('日本語のデフォルト', 'English default', true),
    ).toBe('日本語のデフォルト');
  });
});
