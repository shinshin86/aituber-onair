import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AITuberOnAirCore,
  ChatServiceFactory,
  DEEPGRAM_DEFAULT_VOICE,
  DEEPGRAM_TTS_API_URL,
  DeepgramEngine,
  MODEL_GPT_6_1_SOL,
  MODEL_GLM_5_3_FLASHX,
  MODEL_MISTRAL_ZAI_GLM_5_3,
  MODEL_NVIDIA_NEMOTRON_3_5_LIGHTNING,
  MODEL_QWEN_QWEN_3_8_27B,
  MODEL_QWEN_QWEN_3_8_OMNI_FLASH,
  MODEL_DEEPSEEK_FLASH,
  VoiceEngineAdapter,
  VoiceEngineFactory,
  type DeepgramVoiceServiceOptions,
  type DeepgramVoiceServiceOptionsUpdate,
  type GradiumModel,
  type FishAudioModel,
} from '../src';

// Keep this release regression scoped to the models propagated in that release.
const releasedOpenRouterModelsWithoutReasoningControls = [
  MODEL_NVIDIA_NEMOTRON_3_5_LIGHTNING,
  MODEL_QWEN_QWEN_3_8_27B,
  MODEL_QWEN_QWEN_3_8_OMNI_FLASH,
];

afterEach(() => vi.unstubAllGlobals());

function chatResponse() {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: { role: 'assistant', content: 'Hello' },
          finish_reason: 'stop',
        },
      ],
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'Hello' }],
        },
      ],
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}

describe('Published providers available through Core', () => {
  it('sends current DeepSeek Flash text and image requests through Core with thinking disabled', async () => {
    const fetch = vi.fn().mockImplementation(async () => chatResponse());
    vi.stubGlobal('fetch', fetch);
    const service = ChatServiceFactory.createChatService('deepseek', {
      apiKey: 'test-key',
      model: MODEL_DEEPSEEK_FLASH,
    });
    await service.chatOnce!([{ role: 'user', content: 'Hello' }], false);
    await service.visionChatOnce!(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image.' },
            {
              type: 'image_url',
              image_url: { url: 'https://example.com/image.png' },
            },
          ],
        },
      ],
      false,
    );
    expect(AITuberOnAirCore.getSupportedModels('deepseek')).toContain(
      MODEL_DEEPSEEK_FLASH,
    );
    for (const [url, request] of fetch.mock.calls) {
      expect(url).toBe('https://api.deepseek.com/chat/completions');
      expect(JSON.parse(request.body)).toMatchObject({
        model: 'deepseek-flash',
        thinking: { type: 'disabled' },
        stream: false,
      });
    }
    expect(
      JSON.parse(fetch.mock.calls[1][1].body).messages[0].content,
    ).toContainEqual({
      type: 'image_url',
      image_url: { url: 'https://example.com/image.png' },
    });
  });

  it.each(['drama-3-preview', 'drama-3'] satisfies FishAudioModel[])(
    'synthesizes Fish Audio %s through Core and preserves runtime model switching',
    async (model) => {
      const fetch = vi
        .fn()
        .mockImplementation(
          async () => new Response(new Uint8Array([1, 2, 3])),
        );
      vi.stubGlobal('fetch', fetch);
      const onPlay = vi.fn().mockResolvedValue(undefined);
      const adapter = new VoiceEngineAdapter({
        engineType: 'fishAudio',
        apiKey: 'test-key',
        speaker: 'reference-id',
        fishAudioModel: model,
        onPlay,
      });
      await adapter.speak({ text: 'Hello', emotion: 'neutral' });
      const [url, request] = fetch.mock.calls[0];
      expect(url).toBe('https://api.fish.audio/v1/tts');
      expect(new Headers(request.headers).get('model')).toBe(model);
      expect(JSON.parse(request.body)).toMatchObject({
        reference_id: 'reference-id',
        format: 'mp3',
      });
      const audio = onPlay.mock.calls[0][0] as ArrayBuffer;
      expect([...new Uint8Array(audio)]).toEqual([1, 2, 3]);
      adapter.updateOptions({ fishAudioModel: 's2-pro' });
      await adapter.speak({ text: 'Again', emotion: 'neutral' });
      expect(new Headers(fetch.mock.calls[1][1].headers).get('model')).toBe(
        's2-pro',
      );
    },
  );

  it('completes silent Core speech once without invoking custom audio decoding', async () => {
    const onPlay = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const adapter = new VoiceEngineAdapter({
      engineType: 'none',
      onPlay,
      onComplete,
    });
    await adapter.speak({ text: 'Silent reply', emotion: 'neutral' });
    expect(onPlay).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps avatar casual settings valid for GPT-6.1 Sol and routes tools to Responses', async () => {
    const fetch = vi.fn().mockImplementation(async () => chatResponse());
    vi.stubGlobal('fetch', fetch);
    const service = ChatServiceFactory.createChatService('openai', {
      apiKey: 'test-key',
      model: MODEL_GPT_6_1_SOL,
      gpt5Preset: 'casual',
      tools: [{ name: 'lookup', parameters: { type: 'object' } }],
    });
    await service.chatOnce!([{ role: 'user', content: 'Hello' }], false);
    const [url, request] = fetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    const body = JSON.parse(request.body);
    expect(body.model).toBe(MODEL_GPT_6_1_SOL);
    expect(body.reasoning.effort).toBe('low');
  });

  it('keeps required thinking enabled for Z.ai FlashX when using provider defaults', async () => {
    const fetch = vi.fn().mockImplementation(async () => chatResponse());
    vi.stubGlobal('fetch', fetch);
    const service = ChatServiceFactory.createChatService('zai', {
      apiKey: 'test-key',
      model: MODEL_GLM_5_3_FLASHX,
    });
    await service.chatOnce!([{ role: 'user', content: 'Hello' }], false);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.thinking).toEqual(expect.objectContaining({ type: 'enabled' }));
    expect(body.reasoning_effort).toBe('low');
  });

  it.each(releasedOpenRouterModelsWithoutReasoningControls)(
    'omits unsupported effort and token budgets for %s, even with old settings',
    async (model) => {
      const fetch = vi.fn().mockImplementation(async () => chatResponse());
      vi.stubGlobal('fetch', fetch);
      const service = ChatServiceFactory.createChatService('openrouter', {
        apiKey: 'test-key',
        model,
        reasoning_effort: 'high',
        reasoningMaxTokens: 2048,
      });
      await service.chatOnce!([{ role: 'user', content: 'Hello' }], false);
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.reasoning).toEqual({ exclude: true });
    },
  );

  it('exposes new models in the Core-derived avatar selectors with correct vision flags', () => {
    expect(AITuberOnAirCore.getSupportedModels('openai')).toContain(
      MODEL_GPT_6_1_SOL,
    );
    expect(AITuberOnAirCore.getSupportedModels('zai')).toContain(
      MODEL_GLM_5_3_FLASHX,
    );
    expect(AITuberOnAirCore.getSupportedModels('mistral')).toContain(
      MODEL_MISTRAL_ZAI_GLM_5_3,
    );
    for (const model of releasedOpenRouterModelsWithoutReasoningControls) {
      expect(AITuberOnAirCore.getSupportedModels('openrouter')).toContain(
        model,
      );
      expect(
        ChatServiceFactory.getProviders()
          .get('openrouter')
          ?.supportsVisionForModel?.(model),
      ).toBe(model.startsWith('qwen/'));
    }
    expect(
      ChatServiceFactory.getProviders()
        .get('mistral')
        ?.supportsVisionForModel?.(MODEL_MISTRAL_ZAI_GLM_5_3),
    ).toBe(false);
  });

  it('synthesizes Deepgram MP3 through the Core adapter and applies runtime speed updates', async () => {
    const fetch = vi.fn().mockImplementation(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { 'Content-Type': 'audio/mpeg' },
        }),
    );
    vi.stubGlobal('fetch', fetch);
    const onPlay = vi.fn().mockResolvedValue(undefined);
    const options: DeepgramVoiceServiceOptions = {
      engineType: 'deepgram',
      speaker: DEEPGRAM_DEFAULT_VOICE,
      apiKey: 'test-key',
      deepgramSpeed: 1.1,
      onPlay,
    };
    expect(VoiceEngineFactory.getEngine('deepgram')).toBeInstanceOf(
      DeepgramEngine,
    );
    const adapter = new VoiceEngineAdapter(options);
    await adapter.speak({ text: 'Hello', emotion: 'neutral' });
    const [url, request] = fetch.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(DEEPGRAM_TTS_API_URL);
    expect(parsed.searchParams.get('model')).toBe(DEEPGRAM_DEFAULT_VOICE);
    expect(parsed.searchParams.get('encoding')).toBe('mp3');
    expect(parsed.searchParams.get('speed')).toBe('1.1');
    expect(request.headers.Authorization).toBe('Token test-key');
    expect(JSON.parse(request.body)).toEqual({ text: 'Hello' });
    expect(onPlay).toHaveBeenCalled();
    const update: DeepgramVoiceServiceOptionsUpdate = { deepgramSpeed: 0.8 };
    adapter.updateOptions(update);
    await adapter.speak({ text: 'Again', emotion: 'neutral' });
    expect(new URL(fetch.mock.calls[1][0]).searchParams.get('speed')).toBe(
      '0.8',
    );
  });

  it('sends the Gradium beta model through Core and can return to production', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async () => new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal('fetch', fetch);
    const beta: GradiumModel = 'gradium-tts-beta';
    const adapter = new VoiceEngineAdapter({
      engineType: 'gradium',
      apiKey: 'test-key',
      speaker: 'YTpq7expH9539ERJ',
      gradiumModel: beta,
      onPlay: vi.fn().mockResolvedValue(undefined),
    });
    await adapter.speak({ text: 'Hello', emotion: 'neutral' });
    expect(JSON.parse(fetch.mock.calls[0][1].body).model_name).toBe(beta);
    adapter.updateOptions({ gradiumModel: 'default' });
    await adapter.speak({ text: 'Again', emotion: 'neutral' });
    expect(JSON.parse(fetch.mock.calls[1][1].body).model_name).toBe('default');
  });
});
