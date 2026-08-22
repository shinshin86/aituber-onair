import { describe, expect, it } from 'vitest';
import { normalizeTikTokUniqueId } from './tiktokService';

describe('TikTok live service helpers', () => {
  it('normalizes TikTok handles and profile URLs', () => {
    expect(normalizeTikTokUniqueId('@hana_live')).toBe('hana_live');
    expect(
      normalizeTikTokUniqueId('https://www.tiktok.com/@hana_live/live'),
    ).toBe('hana_live');
    expect(normalizeTikTokUniqueId('  hana_live  ')).toBe('hana_live');
  });
});
