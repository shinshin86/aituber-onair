import path from 'node:path';
import { Readable } from 'node:stream';
import type { Message, ToolChatCompletion } from '@aituber-onair/core';
import type { AgentChatModuleLike } from '../src/script-gen/codex.js';
import {
  extractJsonPayload,
  requestScriptViaCodex,
} from '../src/script-gen/codex.js';
import type { ChatServiceFactoryLike } from '../src/script-gen/chat.js';
import {
  loadChatServiceFactory,
  requestScript,
  resolveApiKey,
} from '../src/script-gen/chat.js';
import {
  analysisPathForOutput,
  normalizeScriptForOutput,
  parseArgs,
} from '../src/script-gen/cli.js';
import { ingestSource } from '../src/script-gen/ingest.js';
import { buildUserPrompt } from '../src/script-gen/prompt.js';
import {
  assertTokenProvenance,
  parseAndValidateScript,
  validateScript,
} from '../src/script-gen/schema.js';
import type { NewsdeskScript } from '../src/types.js';

const testDirectory = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.resolve(testDirectory, '..');

const validScript: NewsdeskScript = {
  avatar: '../../react-vrm-app/public/avatar/miko.vrm',
  avatarAnimation: '../../react-vrm-app/public/avatar/idle_loop.vrma',
  voice: {
    engine: 'sine',
    options: { frequency: 440, secondsPerChar: 0.01, minDuration: 0.2 },
  },
  leadIn: 0.1,
  leadOut: 0.2,
  defaultPauseAfter: 0.08,
  background: { color: '#20242c' },
  avatarLayout: { scale: 1, x: 0.5, y: 0.5 },
  avatarFraming: {
    visibleHeightRatio: 0.39,
    lookAtHeightRatio: 0.845,
  },
  avatarLighting: {
    ambientIntensity: 1.4,
    directionalIntensity: 2.35,
  },
  motion: { intensity: 1 },
  blinkSeed: 42,
  lines: [
    { text: 'ミコです。', chapter: 'chat 0.49.0', pauseAfter: 0.08 },
    { text: 'JSON出力を改善しました。', pauseAfter: 0.08 },
    { text: '2件の境界ケースを修正しました。', pauseAfter: 0.08 },
  ],
};

const validResponse = {
  analysis: {
    docType: 'release-notes',
    title: 'chat 0.49.0',
    keyFacts: ['JSON output improved', '2 edge cases fixed'],
  },
  script: validScript,
};

function completion(textBlocks: string[]): ToolChatCompletion {
  return {
    blocks: textBlocks.map((text) => ({ type: 'text' as const, text })),
    stop_reason: 'end',
  };
}

describe('script generation CLI and source ingestion', () => {
  it('parses one source and defaults to codex-sdk and script.json', () => {
    expect(parseArgs(['notes.txt', '--focus', '料金', '--dry-run'])).toEqual({
      source: 'notes.txt',
      focus: '料金',
      output: 'script.json',
      provider: 'codex-sdk',
      dryRun: true,
      help: false,
    });
    expect(() => parseArgs(['a.txt', 'b.txt'])).toThrow(/second input source/);
    expect(() => parseArgs(['--changelog', 'CHANGELOG.md'])).toThrow(
      /Unknown argument/,
    );
  });

  it('normalizes files and standard input to plain text', async () => {
    const fileText = await ingestSource('tests/fixtures/CHANGELOG.md');
    const stdinText = await ingestSource('-', {
      input: Readable.from(['first\r\n', 'second\n']),
    });

    expect(fileText).toMatch(/^# Changelog/);
    expect(stdinText).toBe('first\nsecond');
  });

  it('extracts article text from an HTML URL', async () => {
    const html = `<!doctype html><html><head><title>News</title></head><body>
      <nav>Navigation</nav><article><h1>大切なお知らせ</h1>
      <p>料金を20円改定します。</p></article></body></html>`;
    const fetchImpl = (async () =>
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })) as typeof fetch;

    const source = await ingestSource('https://example.com/news', {
      fetchImpl,
    });

    expect(source).toMatch(/大切なお知らせ/);
    expect(source).toMatch(/料金を20円改定/);
    expect(source).not.toMatch(/Navigation/);
  });

  it('builds an optional focus prompt without altering the source', () => {
    const prompt = buildUserPrompt({
      sourceText: '本文です。',
      focus: '料金の話を中心に',
    });

    expect(prompt).toMatch(
      /Center the script on this perspective:\n料金の話を中心に/,
    );
    expect(prompt).toMatch(/Source text:\n\n本文です。$/);
    expect(buildUserPrompt({ sourceText: '本文', focus: null })).not.toMatch(
      /perspective/,
    );
  });
});

describe('strict schema and provenance', () => {
  it('validates the nested response and rejects unknown analysis fields', () => {
    expect(parseAndValidateScript(JSON.stringify(validResponse))).toEqual(
      validResponse,
    );
    expect(() => parseAndValidateScript('```json\n{}\n```')).toThrow(
      /not valid JSON/,
    );
    expect(() =>
      parseAndValidateScript(
        JSON.stringify({
          ...validResponse,
          analysis: { ...validResponse.analysis, extra: true },
        }),
      ),
    ).toThrow(/analysis\.extra is not allowed/);
  });

  it('accepts 3 to 12 lines and keeps the 35-character limit', () => {
    expect(validateScript(validScript)).toEqual([]);
    expect(
      validateScript({
        ...validScript,
        lines: Array.from({ length: 12 }, () => ({ text: 'あ'.repeat(35) })),
      }),
    ).toEqual([]);
    expect(
      validateScript({
        ...validScript,
        lines: Array.from({ length: 13 }, () => ({ text: '有効な行です。' })),
      }).join('\n'),
    ).toMatch(/between 3 and 12/);
    expect(
      validateScript({
        ...validScript,
        unexpected: true,
        lines: [...validScript.lines.slice(0, 2), { text: 'あ'.repeat(36) }],
      }).join('\n'),
    ).toMatch(/unexpected is not allowed|at most 35/);
  });

  it('validates optional avatar framing overrides', () => {
    expect(
      validateScript({ ...validScript, avatarFraming: undefined }),
    ).toEqual([]);
    expect(
      validateScript({
        ...validScript,
        avatarFraming: {
          visibleHeightRatio: 0.09,
          lookAtHeightRatio: 1.51,
          extra: true,
        },
      }).join('\n'),
    ).toMatch(
      /visibleHeightRatio must be at least 0.1|lookAtHeightRatio must be at most 1.5|extra is not allowed/,
    );
  });

  it('validates optional avatar lighting overrides', () => {
    expect(
      validateScript({ ...validScript, avatarLighting: undefined }),
    ).toEqual([]);
    expect(
      validateScript({
        ...validScript,
        avatarLighting: {
          ambientIntensity: -0.1,
          directionalIntensity: 10.1,
          extra: true,
        },
      }).join('\n'),
    ).toMatch(
      /ambientIntensity must be at least 0|directionalIntensity must be at most 10|extra is not allowed/,
    );
  });

  it('checks displayed numeric tokens against source plus focus', () => {
    const script: NewsdeskScript = {
      ...validScript,
      telop: '2026年のお知らせ',
      lines: [
        { text: 'ミコです。', chapter: 'chat 0.49.0' },
        { text: '2件を修正しました。', reading: 'にけんを修正しました。' },
        { text: '料金は300円です。' },
      ],
    };
    const source = 'chat 0.49.0 は2026年に2件を修正しました。';

    expect(() =>
      assertTokenProvenance(script, source, '料金は300円'),
    ).not.toThrow();
    expect(() => assertTokenProvenance(script, source)).toThrow(/300/);
  });

  it('canonicalizes leading zeroes only for pure-integer provenance tokens', () => {
    const script: NewsdeskScript = {
      ...validScript,
      lines: [
        { text: '7月25日です。' },
        { text: '数字なし' },
        { text: '数字なし' },
      ],
    };

    expect(() =>
      assertTokenProvenance(script, '公開日は2026-07-25です。'),
    ).not.toThrow();
    expect(() =>
      assertTokenProvenance(
        {
          ...script,
          lines: [{ text: '8月25日です。' }, ...script.lines.slice(1)],
        },
        '公開日は2026-7-25です。',
      ),
    ).toThrow(/8/);
  });
});

describe('Core chat providers', () => {
  it('requests a script through a ChatServiceFactory-compatible fake', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const factory: ChatServiceFactoryLike = {
      createChatService(provider, options) {
        calls.push({ provider, options });
        return {
          async chatOnce(
            messages: Message[],
            stream: boolean,
            _onPartialResponse: (text: string) => void,
            maxTokens?: number,
          ) {
            calls.push({ messages, stream, maxTokens });
            return completion(['{"analysis":', '{},"script":{}}']);
          },
        };
      },
    };

    const result = await requestScript({
      provider: 'openai',
      apiKey: 'test-secret',
      systemPrompt: 'system',
      userPrompt: 'user',
      factory,
    });

    expect(result).toBe('{"analysis":{},"script":{}}');
    expect(calls[0]).toEqual({
      provider: 'openai',
      options: {
        apiKey: 'test-secret',
        responseFormat: { type: 'json_object' },
      },
    });
    expect(calls[1]?.stream).toBe(false);
    expect(calls[1]?.maxTokens).toBe(2_000);
  });

  it('uses the codex-sdk Core agent provider without an API key', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const agentModule: AgentChatModuleLike = {
      createAgentChatService(provider, options) {
        calls.push({ provider, options });
        return {
          async chatOnce(messages, stream) {
            calls.push({ messages, stream });
            return completion(['```json\n{"a":1}\n```']);
          },
        };
      },
    };

    const raw = await requestScriptViaCodex({
      systemPrompt: 'System rules.',
      userPrompt: 'User input.',
      agentModule,
    });

    expect(raw).toBe('{"a":1}');
    expect(calls[0]).toEqual({
      provider: 'codex-sdk',
      options: { skipGitRepoCheck: true },
    });
    expect(calls[1]?.stream).toBe(false);
  });

  it('unwraps optional JSON fences', () => {
    expect(extractJsonPayload('  {"a":1}  ')).toBe('{"a":1}');
    expect(extractJsonPayload('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('resolves keys only for API providers and loads Core factory', () => {
    expect(resolveApiKey('openai', { OPENAI_API_KEY: 'openai-key' })).toBe(
      'openai-key',
    );
    expect(resolveApiKey('claude', { ANTHROPIC_API_KEY: 'claude-key' })).toBe(
      'claude-key',
    );
    expect(resolveApiKey('gemini', { GEMINI_API_KEY: 'gemini-key' })).toBe(
      'gemini-key',
    );
    expect(() => resolveApiKey('openai', {})).toThrow(
      /OPENAI_API_KEY is required/,
    );
    expect(loadChatServiceFactory().getAvailableProviders?.()).toEqual(
      expect.arrayContaining(['openai', 'claude', 'gemini']),
    );
  });

  it('normalizes output paths beside the requested JSON file', () => {
    const outputPath = path.join(projectRoot, 'samples', 'news.json');
    const normalized = normalizeScriptForOutput(validScript, outputPath);
    expect(normalized.avatar).toBe(
      '../../react-vrm-app/public/avatar/miko.vrm',
    );
    expect(normalized.avatarAnimation).toBe(
      '../../react-vrm-app/public/avatar/idle_loop.vrma',
    );
    expect(analysisPathForOutput(outputPath)).toBe(
      path.join(projectRoot, 'samples', 'news.analysis.json'),
    );
    expect(analysisPathForOutput('/tmp/news')).toBe('/tmp/news.analysis.json');
  });
});
