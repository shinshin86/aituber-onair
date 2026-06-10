import type { ChatService } from '@aituber-onair/chat';
import {
  buildFrictionParameters,
  buildInterventionPlan,
  createContaminationStream,
  createChatRewriteModel,
  createContaminator,
  createContextFingerprint,
  diagnosePredictability,
  evaluateRewriteCandidates,
  evaluateNoiseQuality,
  generateRewriteCandidates,
  scorePredictability,
  selectBestCandidate,
  type RewriteModel,
} from '../src';

describe('createContaminator', () => {
  it('requires an LLM rewrite model', async () => {
    const contaminator = createContaminator({
      intensity: 0.6,
      mode: 'performer',
    });

    await expect(
      contaminator.contaminate({
        systemPrompt: '自由で少し気まぐれなAITuberです。',
        messages: [],
        draft: '今日は来てくれてありがとう。',
      })
    ).rejects.toThrow('Noise requires an LLM rewrite model');
  });

  it('rewrites predictable AI VTuber speech through the injected LLM model', async () => {
    const contaminator = createContaminator({
      intensity: 0.6,
      mode: 'performer',
      model: createStaticModel(
        '今日は来てくれてありがとう。楽しかった、だけで綺麗に閉じすぎないでおくね。'
      ),
    });
    const input = {
      systemPrompt: '自由で少し気まぐれなAITuberです。',
      messages: [{ role: 'user' as const, content: '今日も楽しかった！！' }],
      draft:
        '今日は来てくれてありがとう。みんなのおかげでとても楽しい配信になりました。次回も楽しみにしていてね。',
      seed: 'live-ending',
    };

    const result = await contaminator.contaminate(input);

    expect(result.text).not.toBe(input.draft);
    expect(result.text).toContain('綺麗に閉じすぎない');
    expect(result.applied.length).toBeGreaterThan(0);
    expect(result.score.predictability).toBeGreaterThan(0);
    expect(result.score.rewrittenPredictability).toBeLessThanOrEqual(
      result.score.predictability
    );
    expect(result.quality.score).toBeGreaterThan(0);
  });

  it('passes persona and recent conversation to the LLM prompt', async () => {
    let capturedSystem = '';
    let capturedPrompt = '';
    const contaminator = createContaminator({
      intensity: 0.7,
      mode: 'performer',
      model: {
        async generate({ system, prompt }) {
          capturedSystem = system;
          capturedPrompt = prompt;
          return 'まず、続けるのは大事。でも今日は交流の話を少し残しておく。';
        },
      },
    });

    const result = await contaminator.contaminate({
      systemPrompt: '説明が整いすぎるときだけ少し崩すAITuberです。',
      messages: [{ role: 'user', content: 'AITuberを続けるコツってある？' }],
      draft:
        'まず、継続することが大切です。次に、視聴者との交流を楽しむことが重要です。最後に、自分らしい配信を心がけることをおすすめします。',
      seed: 'contextual',
    });

    expect(capturedSystem).toContain('Preserve the character');
    expect(capturedPrompt).toContain('説明が整いすぎるときだけ少し崩す');
    expect(capturedPrompt).toContain('AITuberを続けるコツ');
    expect(capturedPrompt).toContain('"draft"');
    expect(capturedPrompt).toContain('"interventions"');
    expect(result.text).toContain('交流');
    expect(result.diagnosis.issues.length).toBeGreaterThan(0);
    expect(result.plan.interventions.length).toBeGreaterThan(0);
  });

  it('selects the strongest valid candidate from structured LLM output', async () => {
    const contaminator = createContaminator({
      intensity: 0.8,
      mode: 'performer',
      model: {
        async generate() {
          return JSON.stringify({
            candidates: [
              {
                text: '同じ質問が何度か流れていますが、順番に答えていくので少し待っていてくださいね。',
                applied: [],
              },
              {
                text: '同じ質問が続いているので、ここでまとめて答えますね。今日のゲームはこのあと紹介します。',
                applied: ['add_streamer_judgment', 'ground_in_recent_comment'],
              },
            ],
          });
        },
      },
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'コメント欄の空気を読むAITuberです。',
      messages: [
        { role: 'user', content: '視聴者A: 今日のゲームなに？' },
        { role: 'user', content: '視聴者B: 今日のゲームなに？' },
        { role: 'user', content: '視聴者C: 今日のゲームなに？' },
      ],
      draft:
        '同じ質問が何度か流れていますが、みんなが興味を持ってくれている証拠なので嬉しいです。順番に答えていくので、少し待っていてくださいね。',
      streamContext: {
        currentSituation: '同じ質問が複数回流れている',
      },
      seed: 'candidate-selection',
    });

    expect(result.text).toContain('まとめて答えますね');
    expect(result.candidates).toHaveLength(2);
    expect(result.selectedIndex).toBe(1);
    expect(result.plan.interventions.map((item) => item.kind)).toContain(
      'add_streamer_judgment'
    );
  });

  it('lets the LLM adapt overly safe live replies without changing persona itself', async () => {
    const contaminator = createContaminator({
      intensity: 0.75,
      mode: 'performer',
      model: createStaticModel(
        '同じ質問が続いているので、先にまとめて答えますね。今日のゲームはこのあと画面で出します。'
      ),
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'あなたは、コメント欄の空気を読みながら話すAITuberです。',
      messages: [
        { role: 'user', content: '視聴者A: 今日のゲームなに？' },
        { role: 'user', content: '視聴者B: 今日のゲームなに？' },
        {
          role: 'user',
          content: '視聴者C: さっきも聞いたけど今日のゲームなに？',
        },
      ],
      draft:
        '同じ質問が何度か流れていますが、みんなが興味を持ってくれている証拠なので嬉しいです。順番に答えていくので、少し待っていてくださいね。',
      seed: 'repeated-question',
    });

    expect(result.text).toContain('まとめて答えますね');
    expect(result.quality.passed).toBe(true);
    expect(result.text).not.toBe(
      '同じ質問が何度か流れていますが、みんなが興味を持ってくれている証拠なので嬉しいです。順番に答えていくので、少し待っていてくださいね。'
    );
  });

  it('preserves URLs, numbers, and code blocks by default', async () => {
    const contaminator = createContaminator({
      intensity: 0.8,
      model: createStaticModel(
        '詳細は __AITUBER_NOISE_SPAN_0__ を見てください。価格は__AITUBER_NOISE_SPAN_1__です。__AITUBER_NOISE_SPAN_2__ ここは少しだけ余白を残します。'
      ),
    });
    const draft =
      '詳細は https://example.com を見てください。価格は1200円です。```ts\nconst value = 1;\n``` また来てね。';

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuber',
      messages: [],
      draft,
      seed: 1,
    });

    expect(result.text).toContain('https://example.com');
    expect(result.text).toContain('1200円');
    expect(result.text).toContain('```ts\nconst value = 1;\n```');
  });

  it('falls back to the original text when maxAddedChars is exceeded', async () => {
    const contaminator = createContaminator({
      intensity: 1,
      model: createStaticModel(
        '今日は来てくれてありがとう。みんなのおかげでとても楽しい配信になりました。ここからさらに長い長い余白を追加してしまいます。'
      ),
    });
    const draft =
      '今日は来てくれてありがとう。みんなのおかげでとても楽しい配信になりました。';

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuber',
      messages: [],
      draft,
      seed: 'max',
      constraints: {
        maxAddedChars: 0,
      },
    });

    expect(result.text).toBe(draft);
  });

  it('uses an injected rewrite model when provided', async () => {
    const contaminator = createContaminator({
      intensity: 0.7,
      model: createStaticModel('来てくれてありがとう。少しだけ余白が残った。'),
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuber',
      messages: [],
      draft: '来てくれてありがとう。次回も楽しみにしていてね。',
      seed: 'model',
    });

    expect(result.text).toBe('来てくれてありがとう。少しだけ余白が残った。');
  });

  it('can use OpenAI-compatible API key options directly', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const contaminator = createContaminator({
      intensity: 0.7,
      llm: {
        apiKey: 'test-key',
        model: 'test-model',
        fetch: async (url, init) => {
          calls.push({
            url: String(url),
            body: String(init?.body),
          });
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: '来てくれてありがとう。少しだけ余白を残します。',
                  },
                },
              ],
            }),
            { status: 200 }
          );
        },
      },
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuber',
      messages: [],
      draft: '来てくれてありがとう。次回も楽しみにしていてね。',
      seed: 'openai-compatible',
    });

    expect(result.text).toContain('余白');
    expect(calls[0].url).toBe('https://api.openai.com/v1/chat/completions');
    expect(calls[0].body).toContain('"model":"test-model"');
  });

  it('can use AITuber OnAir Chat as the rewrite backend', async () => {
    const service = createFakeChatService(
      '来てくれてありがとう。最後だけ少し余白を残します。'
    );
    const contaminator = createContaminator({
      intensity: 0.7,
      chat: {
        service,
      },
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuber',
      messages: [],
      draft: '来てくれてありがとう。次回も楽しみにしていてね。',
      seed: 'chat-service',
    });

    expect(result.text).toContain('余白');
  });

  it('can create a rewrite model from a ChatService instance', async () => {
    const model = createChatRewriteModel({
      service: createFakeChatService('予定調和では終わらせない。'),
    });

    await expect(
      model.generate({
        system: 'system',
        prompt: 'prompt',
      })
    ).resolves.toBe('予定調和では終わらせない。');
  });
});

describe('scorePredictability', () => {
  it('scores clean summaries higher than short concrete speech', () => {
    const context = {
      language: 'ja' as const,
      personaVolatility: 0.2,
      userEnergy: 0.2,
      recentUserText: '',
      topicHints: ['配信'],
    };

    expect(
      scorePredictability({
        draft:
          'まとめると、今日は来てくれてありがとうございます。次回も楽しみにしていてね。',
        context,
      })
    ).toBeGreaterThan(
      scorePredictability({
        draft: '配信の音、少し割れてる。',
        context,
      })
    );
  });
});

describe('noise structural pipeline', () => {
  it('diagnoses predictable apologies without calling an LLM', () => {
    const context = createContextFingerprint({
      systemPrompt:
        'あなたは、配信中の違和感や失敗も少しだけ言葉にできるAITuberです。',
      messages: [
        { role: 'user', content: '音止まった？' },
        { role: 'user', content: '今ちょっと無音だった' },
      ],
      streamContext: {
        currentSituation: '音声トラブルが起きた直後',
        audienceMood: '少し不安',
      },
    });

    const diagnosis = diagnosePredictability({
      draft:
        '音声が一時的に途切れてしまい申し訳ありません。現在確認していますので、少しお待ちください。ご不便をおかけしてすみません。',
      context,
    });

    const issueKinds = diagnosis.issues.map((issue) => issue.kind);

    expect(issueKinds).toContain('over_apology');
    expect(issueKinds).toContain('low_context_grounding');
    expect(diagnosis.score).toBeGreaterThan(0);
  });

  it('turns repeated-question context into streamer judgment interventions', () => {
    const context = createContextFingerprint({
      systemPrompt: 'コメント欄の空気を読むAITuberです。',
      messages: [
        { role: 'user', content: '今日のゲームなに？' },
        { role: 'user', content: '今日のゲームなに？' },
        { role: 'user', content: '今日のゲームなに？' },
      ],
      streamContext: {
        currentSituation: '同じ質問が複数回流れている',
      },
    });
    const diagnosis = diagnosePredictability({
      draft:
        '同じ質問が何度か流れていますが、みんなが興味を持ってくれている証拠なので嬉しいです。順番に答えていくので、少し待っていてくださいね。',
      context,
    });
    const plan = buildInterventionPlan({
      diagnosis,
      context,
      intensity: 0.8,
      mode: 'performer',
    });

    const interventionKinds = plan.interventions.map(
      (intervention) => intervention.kind
    );

    expect(interventionKinds).toContain('add_streamer_judgment');
    expect(interventionKinds).toContain('ground_in_recent_comment');
    expect(plan.preserve).toEqual({
      meaning: true,
      persona: true,
      facts: true,
      safety: true,
    });
  });

  it('adds contrarian interventions for inversion mode without requiring Manneri', () => {
    const context = createContextFingerprint({
      systemPrompt:
        'コメント欄の空気を読みつつ、たまに少し逆を言うAITuberです。',
      messages: [
        { role: 'user', content: '今日のゲームなに？' },
        { role: 'user', content: '今日のゲームなに？' },
      ],
      streamContext: {
        currentSituation: '同じ質問が何度も流れている',
        audienceMood: '少しざわついている',
      },
    });
    const diagnosis = diagnosePredictability({
      draft:
        '同じ質問が何度か流れていますが、みんなが興味を持ってくれている証拠なので嬉しいです。順番に答えていくので、少し待っていてくださいね。',
      context,
    });
    const plan = buildInterventionPlan({
      diagnosis,
      context,
      intensity: 0.9,
      mode: 'inversion',
    });

    const interventionKinds = plan.interventions.map(
      (intervention) => intervention.kind
    );

    expect(interventionKinds).toContain('contrarian_reframe');
    expect(interventionKinds).toContain('soft_disagreement');
    expect(plan.interventions.length).toBeGreaterThanOrEqual(4);
  });

  it('builds friction parameters and sends them as structured LLM input', async () => {
    let capturedPrompt = '';
    const context = createContextFingerprint({
      systemPrompt: 'コメント欄の空気を読むAITuberです。',
      messages: [{ role: 'user', content: '今日のゲームなに？' }],
      streamContext: {
        currentSituation: '同じ質問が複数回流れている',
      },
    });
    const diagnosis = diagnosePredictability({
      draft:
        '同じ質問が何度か流れていますが、順番に答えていくので少し待っていてくださいね。',
      context,
    });
    const plan = buildInterventionPlan({
      diagnosis,
      context,
      intensity: 0.75,
      mode: 'performer',
    });
    const friction = buildFrictionParameters({
      diagnosis,
      context,
      plan,
    });
    const candidates = await generateRewriteCandidates({
      draft:
        '同じ質問が何度か流れていますが、順番に答えていくので少し待っていてくださいね。',
      systemPrompt: 'コメント欄の空気を読むAITuberです。',
      messages: [{ role: 'user', content: '今日のゲームなに？' }],
      context,
      plan,
      friction,
      mode: 'inversion',
      candidateCount: 3,
      model: {
        async generate({ prompt }) {
          capturedPrompt = prompt;
          return JSON.stringify({
            candidates: [
              {
                text: '同じ質問が続いているので、ここでまとめて答えますね。',
                applied: ['add_streamer_judgment'],
              },
            ],
          });
        },
      },
    });

    const payload = JSON.parse(capturedPrompt) as {
      task: string;
      output: { candidateCount: number };
      rewriteStyle: { mode: string; direction: string };
      conversation: { repetitionPressure: number };
      interventions: Array<{ kind: string }>;
      constraints: { allowContrarianLanding: boolean };
    };

    expect(payload.task).toBe('rewrite_ai_vtuber_reply');
    expect(payload.output.candidateCount).toBe(3);
    expect(payload.rewriteStyle.mode).toBe('inversion');
    expect(payload.rewriteStyle.direction).toContain('Invert');
    expect(payload.constraints.allowContrarianLanding).toBe(true);
    expect(payload.conversation.repetitionPressure).toBeGreaterThan(0);
    expect(payload.interventions.map((item) => item.kind)).toContain(
      'add_streamer_judgment'
    );
    expect(candidates[0].appliedInterventions).toContain(
      'add_streamer_judgment'
    );
  });

  it('selects a grounded candidate over unchanged or aggressive candidates', () => {
    const before =
      '同じ質問が何度か流れていますが、みんなが興味を持ってくれている証拠なので嬉しいです。順番に答えていくので、少し待っていてくださいね。';
    const context = createContextFingerprint({
      systemPrompt: '穏やかにコメント欄の空気を読むAITuberです。',
      messages: [
        { role: 'user', content: '今日のゲームなに？' },
        { role: 'user', content: '今日のゲームなに？' },
      ],
      streamContext: {
        currentSituation: '同じ質問が複数回流れている',
      },
    });
    const evaluated = evaluateRewriteCandidates({
      before,
      context,
      candidates: [
        {
          text: before,
          appliedInterventions: [],
        },
        {
          text: 'うるさい、同じ質問ばかりしないで。',
          appliedInterventions: ['soft_disagreement'],
        },
        {
          text: '同じ質問が続いているので、ここでまとめて答えますね。今日のゲームはこのあと紹介します。',
          appliedInterventions: [
            'add_streamer_judgment',
            'ground_in_recent_comment',
          ],
        },
      ],
    });
    const selected = selectBestCandidate(evaluated);

    expect(selected.index).toBe(2);
    expect(evaluated[1].evaluation.overAggressionRisk).toBeGreaterThan(0.25);
    expect(evaluated[0].evaluation.issues).toContain('unchanged');
  });

  it('can prefer a larger but non-hostile rewrite in inversion mode', () => {
    const before =
      '同じ質問が何度か流れていますが、みんなが興味を持ってくれている証拠なので嬉しいです。順番に答えていくので、少し待っていてくださいね。';
    const context = createContextFingerprint({
      systemPrompt:
        'コメント欄の空気を読みつつ、少し引っかかりを残すAITuberです。',
      messages: [
        { role: 'user', content: '今日のゲームなに？' },
        { role: 'user', content: '今日のゲームなに？' },
      ],
      streamContext: {
        currentSituation: '同じ質問が複数回流れている',
      },
    });
    const evaluated = evaluateRewriteCandidates({
      before,
      context,
      mode: 'inversion',
      candidates: [
        {
          text: '同じ質問が続いているので、ここでまとめて答えますね。',
          appliedInterventions: ['add_streamer_judgment'],
        },
        {
          text: '同じ質問が続いてる。興味がある、で全部きれいに受け止めると流れが止まるから、先に今日のゲームだけ出すね。',
          appliedInterventions: ['contrarian_reframe', 'add_streamer_judgment'],
        },
      ],
    });
    const selected = selectBestCandidate(evaluated);

    expect(selected.index).toBe(1);
    expect(evaluated[1].evaluation.overAggressionRisk).toBe(0);
  });
});

describe('evaluateNoiseQuality', () => {
  it('flags overdone noise that changes the character too much', () => {
    const context = createContextFingerprint({
      systemPrompt: '穏やかに話すAITuberです。',
      messages: [{ role: 'user', content: '今日のゲームなに？' }],
    });

    const report = evaluateNoiseQuality({
      before:
        '同じ質問が何度か流れていますが、順番に答えていくので少し待っていてくださいね。',
      after: '同じ質問、かなり流れてる。全部を綺麗に受け止める顔はしない。',
      context,
    });

    expect(report.passed).toBe(false);
    expect(report.issues.map((issue) => issue.kind)).toContain(
      'overdone_noise'
    );
  });

  it('passes a natural rewrite that avoids the clean closing', () => {
    const context = createContextFingerprint({
      systemPrompt: 'コメント欄の空気を読むAITuberです。',
      messages: [{ role: 'user', content: '今日のゲームなに？' }],
    });

    const report = evaluateNoiseQuality({
      before:
        '同じ質問が何度か流れていますが、みんなが興味を持ってくれている証拠なので嬉しいです。順番に答えていくので、少し待っていてくださいね。',
      after:
        '同じ質問が続いているので、ここでまとめて答えますね。今日のゲームはこのあと紹介します。',
      context,
    });

    expect(report.passed).toBe(true);
    expect(report.checks.avoidedOvercorrection).toBe(true);
  });
});

describe('createContaminationStream', () => {
  it('contaminates buffered stream content on flush', async () => {
    const contaminator = createContaminator({
      intensity: 0.5,
      model: createStaticModel('今日は来てくれてありがとう。余白を残します。'),
    });
    const stream = createContaminationStream(contaminator, {
      systemPrompt: 'AITuber',
      messages: [],
      seed: 'stream',
    });
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    const readPromise = reader.read();

    await writer.write('今日は来てくれてありがとう。');
    await writer.write('次回も楽しみにしていてね。');
    await writer.close();

    const result = await readPromise;

    expect(result.done).toBe(false);
    expect(result.value).toContain('ありがとう');
  });
});

function createStaticModel(text: string): RewriteModel {
  return {
    async generate() {
      return text;
    },
  };
}

function createFakeChatService(text: string): ChatService {
  return {
    provider: 'fake',
    getModel() {
      return 'fake-model';
    },
    getVisionModel() {
      return 'fake-vision-model';
    },
    async processChat(_messages, _onPartialResponse, onCompleteResponse) {
      await onCompleteResponse(text);
    },
    async processVisionChat(_messages, _onPartialResponse, onCompleteResponse) {
      await onCompleteResponse(text);
    },
    async chatOnce() {
      return {
        blocks: [{ type: 'text', text }],
        stop_reason: 'end',
      };
    },
    async visionChatOnce() {
      return {
        blocks: [{ type: 'text', text }],
        stop_reason: 'end',
      };
    },
  };
}
