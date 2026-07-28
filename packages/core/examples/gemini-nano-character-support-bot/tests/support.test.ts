import { describe, expect, it, vi } from 'vitest';
import {
  getAssistantText,
  normalizeScreenplayEvent,
} from '../src/hooks/useCharacterSupportCore';
import {
  calculateRms,
  getRmsMouthLevel,
  smoothRms,
} from '../src/hooks/useAudioLipsync';
import { checkPiperPlusAssets } from '../src/hooks/usePiperPlusAssets';
import { getSyntheticMouthLevel } from '../src/hooks/useSyntheticLipsync';
import { translations, TSUKUYOMI_CORPUS_URL } from '../src/i18n';
import {
  buildSupportSystemPrompt,
  getGeminiNanoLanguageOptions,
  getPiperPlusAssetChecks,
  getPiperPlusAssetUrls,
  getSupportVoiceOptions,
  normalizeEmotion,
  PACKAGE_KNOWLEDGE,
  PIPER_PLUS_ASSET_FILES,
  resolveAvatarPackageUrl,
  resolvePiperPlusBasePath,
  stripEmotionTag,
  SUPPORT_RESPONSE_LENGTH,
} from '../src/support';

describe('Gemini Nano character support configuration', () => {
  it('resolves the avatar below the configured Vite base path', () => {
    expect(resolveAvatarPackageUrl('/')).toBe('/avatar/miko.purupuru');
    expect(resolveAvatarPackageUrl('/aituber-onair/demo/')).toBe(
      '/aituber-onair/demo/avatar/miko.purupuru',
    );
  });

  it('configures the selected chat languages and voice engine', () => {
    expect(getGeminiNanoLanguageOptions('en')).toEqual({
      expectedInputLanguages: ['en'],
      expectedOutputLanguages: ['en'],
    });
    expect(getGeminiNanoLanguageOptions('ja')).toEqual({
      expectedInputLanguages: ['en', 'ja'],
      expectedOutputLanguages: ['ja'],
    });
    expect(getSupportVoiceOptions('en', '/demo/')).toMatchObject({
      engineType: 'webSpeech',
      speaker: '',
      webSpeechLanguage: 'en-US',
    });
    expect(getSupportVoiceOptions('ja', '/demo/')).toMatchObject({
      engineType: 'piperPlus',
      speaker: 'tsukuyomi',
      piperPlusBasePath: '/demo/piper/',
      piperPlusModelConfigFile: 'tsukuyomi-config.json',
      piperPlusModelFile: 'tsukuyomi-wavlm-300epoch.onnx',
      piperPlusVoiceFile: 'mei_normal.htsvoice',
    });
  });

  it('resolves every PiperPlus asset below the Vite base path', () => {
    expect(resolvePiperPlusBasePath('/aituber-onair/demo/')).toBe(
      '/aituber-onair/demo/piper/',
    );
    expect(getPiperPlusAssetUrls('/demo/')).toContain(
      '/demo/piper/models/tsukuyomi-wavlm-300epoch.onnx',
    );
    expect(getPiperPlusAssetUrls('/demo/')).toContain(
      '/demo/piper/assets/voice/mei_normal.htsvoice',
    );
    expect(PIPER_PLUS_ASSET_FILES).toHaveLength(33);
    expect(PIPER_PLUS_ASSET_FILES).toEqual(
      expect.arrayContaining([
        'assets/dict/sys.dic',
        'dist/ort-wasm-simd.wasm',
        'licenses/tsukuyomi-chan-corpus-NOTICE.txt',
        'src/simple_unified_api.js',
      ]),
    );
    expect(getPiperPlusAssetChecks('/demo/')).toContainEqual({
      url: '/demo/piper/models/tsukuyomi-wavlm-300epoch.onnx',
      size: 63_757_664,
    });
  });

  it('keeps the required credit and corpus URL exact in both languages', () => {
    expect(translations.en.voice.credit).toBe(
      'This software uses voice data made freely available by the free material character "Tsukuyomi-chan" (c) Rei Yumesaki for speech synthesis.',
    );
    expect(translations.en.voice.creditCorpus).toBe(
      'Tsukuyomi-chan Corpus (CV. Rei Yumesaki)',
    );
    expect(translations.ja.voice.credit).toBe(
      '本ソフトウェアの音声合成には、フリー素材キャラクター「つくよみちゃん」(c) Rei Yumesaki が無料公開している音声データを使用しています。',
    );
    expect(translations.ja.voice.creditCorpus).toBe(
      'つくよみちゃんコーパス（CV.夢前黎）',
    );
    expect(TSUKUYOMI_CORPUS_URL).toBe(
      'https://tyc.rei-yumesaki.net/material/corpus/',
    );
  });

  it('requests a one-sentence tagged response in the selected language', () => {
    expect(SUPPORT_RESPONSE_LENGTH).toBe('veryShort');
    expect(buildSupportSystemPrompt('en')).toContain(
      'Reply in exactly one short sentence',
    );
    expect(buildSupportSystemPrompt('en')).toContain(
      'Start every reply with exactly one emotion tag',
    );
    expect(buildSupportSystemPrompt('ja')).toContain(
      '必ず日本語で回答してください',
    );
  });

  it('bundles compact public Core knowledge', () => {
    expect(PACKAGE_KNOWLEDGE).toContain('# @aituber-onair/core');
    expect(PACKAGE_KNOWLEDGE).toContain('## Browser-only setup');
    expect(PACKAGE_KNOWLEDGE.length).toBeLessThan(10_000);
  });
});

describe('PiperPlus assets', () => {
  it('reports available assets and progress when every HEAD request succeeds', async () => {
    const progress = vi.fn();
    const fetchAsset = vi.fn(async () => {
      return new Response(null, {
        status: 200,
        headers: {
          'content-encoding': 'br',
          'content-type': 'application/octet-stream',
        },
      });
    });

    const result = await checkPiperPlusAssets('/demo/', fetchAsset, progress);

    expect(result.status).toBe('available');
    expect(result.checked).toBe(result.total);
    expect(fetchAsset).toHaveBeenCalledTimes(result.total);
    expect(progress).toHaveBeenLastCalledWith(result.total, result.total);
  });

  it('treats an uncompressed asset with the wrong size as missing', async () => {
    const fetchAsset = vi.fn(
      async (input: RequestInfo | URL) =>
        new Response(null, {
          status: 200,
          headers: {
            'content-length': String(
              String(input).endsWith('tsukuyomi-config.json') ? 0 : 1,
            ),
            'content-encoding': String(input).endsWith('tsukuyomi-config.json')
              ? ''
              : 'br',
            'content-type': 'application/octet-stream',
          },
        }),
    );

    const result = await checkPiperPlusAssets('/demo/', fetchAsset);

    expect(result.status).toBe('missing');
    expect(result.missingUrls).toEqual([
      '/demo/piper/models/tsukuyomi-config.json',
    ]);
  });

  it('treats a Vite HTML fallback as a missing asset', async () => {
    const fetchAsset = vi.fn(async (input: RequestInfo | URL) => {
      const isMissing = String(input).endsWith('tsukuyomi-config.json');
      return new Response(null, {
        status: 200,
        headers: {
          'content-type': isMissing ? 'text/html' : 'application/octet-stream',
        },
      });
    });

    const result = await checkPiperPlusAssets('/demo/', fetchAsset);

    expect(result.status).toBe('missing');
    expect(result.missingUrls).toEqual([
      '/demo/piper/models/tsukuyomi-config.json',
    ]);
  });

  it('reports a failed asset request as an error', async () => {
    const result = await checkPiperPlusAssets('/demo/', async () => {
      throw new Error('network unavailable');
    });

    expect(result.status).toBe('error');
    expect(result.error).toBe('network unavailable');
    expect(result.checked).toBe(result.total);
  });
});

describe('emotion handling', () => {
  it('removes only a leading emotion tag from visible text', () => {
    expect(stripEmotionTag('[happy] Hello!')).toBe('Hello!');
    expect(stripEmotionTag('  [relaxed]  Ready.  ')).toBe('Ready.');
    expect(stripEmotionTag('Use [happy] in a prompt.')).toBe(
      'Use [happy] in a prompt.',
    );
  });

  it('falls back to neutral for missing or unsupported emotions', () => {
    expect(normalizeEmotion(undefined)).toBe('neutral');
    expect(normalizeEmotion('thinking')).toBe('neutral');
    expect(normalizeEmotion(' HAPPY ')).toBe('happy');
  });

  it('normalizes both direct and wrapped screenplay events', () => {
    expect(normalizeScreenplayEvent({ text: 'Hello' })).toEqual({
      emotion: 'neutral',
      text: 'Hello',
    });
    expect(
      normalizeScreenplayEvent({
        screenplay: { emotion: 'surprised', text: 'Oh!' },
      }),
    ).toEqual({ emotion: 'surprised', text: 'Oh!' });
    expect(normalizeScreenplayEvent(null)).toBeNull();
  });

  it('extracts clean assistant text from Core response payloads', () => {
    expect(getAssistantText('[happy] Hello!')).toBe('Hello!');
    expect(
      getAssistantText({
        message: { content: '[sad] Please check the README.' },
      }),
    ).toBe('Please check the README.');
  });
});

describe('synthetic lip sync', () => {
  it('keeps the mouth level inside the avatar renderer range', () => {
    const levels = Array.from({ length: 80 }, (_, index) =>
      getSyntheticMouthLevel(index * 25),
    );
    expect(Math.min(...levels)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...levels)).toBeLessThanOrEqual(0.115);
    expect(
      new Set(levels.map((level) => level.toFixed(4))).size,
    ).toBeGreaterThan(20);
  });

  it('returns a closed mouth for invalid elapsed time', () => {
    expect(getSyntheticMouthLevel(-1)).toBe(0);
    expect(getSyntheticMouthLevel(Number.NaN)).toBe(0);
  });
});

describe('RMS lip sync', () => {
  it('calculates, smooths, and bounds real audio amplitude', () => {
    const rms = calculateRms(new Float32Array([0.12, -0.12]));
    const smoothed = smoothRms(0, rms);

    expect(rms).toBeCloseTo(0.12);
    expect(smoothed).toBeCloseTo(0.06);
    expect(getRmsMouthLevel(smoothed)).toBe(2);
    expect(getRmsMouthLevel(-1)).toBe(0);
    expect(getRmsMouthLevel(1)).toBe(4);
  });

  it('returns silence for an empty audio window', () => {
    expect(calculateRms(new Float32Array())).toBe(0);
  });
});
