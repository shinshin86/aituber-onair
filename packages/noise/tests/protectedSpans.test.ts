import { createContaminator } from '../src';

const DRAFT_WITH_CODE =
  '詳細は https://example.com を見てください。```ts\nconst value = 1;\n``` また来てね。';

describe('protected span survival', () => {
  it('tells the rewrite model to keep placeholder tokens verbatim', async () => {
    let capturedSystem = '';
    let capturedPrompt = '';
    const contaminator = createContaminator({
      intensity: 0.8,
      model: {
        async generate({ system, prompt }) {
          capturedSystem = system;
          capturedPrompt = prompt;
          return '詳細は __AITUBER_NOISE_SPAN_0__ を見てください。__AITUBER_NOISE_SPAN_1__ 締めは置いておくね。';
        },
      },
    });

    await contaminator.contaminate({
      systemPrompt: 'AITuber',
      messages: [],
      draft: DRAFT_WITH_CODE,
      forceTilt: true,
    });

    expect(capturedSystem).toContain('__AITUBER_NOISE_SPAN_0__');
    expect(capturedPrompt).toContain('keepPlaceholderTokensVerbatim');
    expect(capturedPrompt).toContain('__AITUBER_NOISE_SPAN_1__');
  });

  it('falls back to the draft when the model drops a protected code block', async () => {
    const contaminator = createContaminator({
      intensity: 0.8,
      model: {
        async generate() {
          // The code-block token (__AITUBER_NOISE_SPAN_1__) is missing.
          return '詳細は __AITUBER_NOISE_SPAN_0__ を見てください。締めは置いておくね。';
        },
      },
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuber',
      messages: [],
      draft: DRAFT_WITH_CODE,
      forceTilt: true,
    });

    expect(result.text).toBe(DRAFT_WITH_CODE);
    expect(result.text).toContain('```ts\nconst value = 1;\n```');
  });

  it('falls back to the draft when the model mangles a placeholder token', async () => {
    const contaminator = createContaminator({
      intensity: 0.8,
      model: {
        async generate() {
          return '詳細は __AITUBER_NOISE_SPAN_0__ を見てください。__AITUBER_NOISE_SPAN_1（プレースホルダー） 締めは置いておくね。';
        },
      },
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuber',
      messages: [],
      draft: DRAFT_WITH_CODE,
      forceTilt: true,
    });

    expect(result.text).toBe(DRAFT_WITH_CODE);
  });

  it('keeps candidates whose placeholder tokens all survive', async () => {
    const contaminator = createContaminator({
      intensity: 0.8,
      model: {
        async generate() {
          return '詳細は __AITUBER_NOISE_SPAN_0__ を見てください。__AITUBER_NOISE_SPAN_1__ ここは少しだけ余白を残します。';
        },
      },
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuber',
      messages: [],
      draft: DRAFT_WITH_CODE,
      forceTilt: true,
    });

    expect(result.text).toContain('https://example.com');
    expect(result.text).toContain('```ts\nconst value = 1;\n```');
    expect(result.text).toContain('余白を残します');
  });
});
