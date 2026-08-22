import { describe, expect, it } from 'vitest';
import { interpretDisplayName, extractNicknameName } from '../src/nameInterpreter.js';

describe('nameInterpreter', () => {
  it('extrae el prefijo alfabético de un nick con números', () => {
    expect(interpretDisplayName('Andrea425')).toBe('Andrea');
    expect(interpretDisplayName('carlos_99')).toBe('Carlos');
  });

  it('conserva nombres limpios tal cual', () => {
    expect(interpretDisplayName('Andrea')).toBe('Andrea');
    expect(interpretDisplayName('maria')).toBe('Maria');
  });

  it('el nombre real prevalece sobre el nick', () => {
    expect(interpretDisplayName('Andrea425', 'Carmen López')).toBe(
      'Carmen López',
    );
  });

  it('manage prefijos-noise x/el/la', () => {
    expect(extractNicknameName('xCarlos')).not.toBe('');
    expect(interpretDisplayName('elMati_90')).toMatch(/Mati/);
  });

  it('capitaliza nicks en minúsculas', () => {
    expect(interpretDisplayName('andrea425')).toBe('Andrea');
  });

  it('no explota con entradas vacías o extrañas', () => {
    expect(interpretDisplayName('')).toBe('');
    expect(interpretDisplayName('999')).toBe('999');
    expect(interpretDisplayName('__')).toBe('__');
  });
});
