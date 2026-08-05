import type {
  AgentBackend,
  AgentBackendEvent,
  AgentBackendSession,
  AgentBackendSessionInput,
  AgentEvent,
  AgentRunInput,
} from '@aituber-onair/agent';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createStreamOperationsController,
  type StreamOperationsController,
} from '../server/controller.js';
import { COMMENTS } from '../src/fixtures.js';

class MockBackendSession implements AgentBackendSession {
  readonly runs: AgentRunInput[] = [];

  constructor(
    readonly id: string,
    private readonly respond: (input: AgentRunInput) => string
  ) {}

  async *runStream(input: AgentRunInput): AsyncIterable<AgentBackendEvent> {
    this.runs.push(input);
    const message = this.respond(input);
    yield { type: 'message.delta', text: message.slice(0, 20) };
    yield { type: 'message.completed', text: message };
    yield { type: 'completed', message };
  }

  async interrupt(): Promise<void> {}
  async close(): Promise<void> {}
}

class MockBackend implements AgentBackend {
  readonly name = 'mock-codex';
  readonly capabilities = Object.freeze({
    text: true,
    streaming: true,
    tools: false,
    interruption: true,
    sessionResume: true,
    approvals: true,
    detailedEvents: true,
  });
  readonly startInputs: AgentBackendSessionInput[] = [];
  readonly sessions: MockBackendSession[] = [];
  rejectResume = false;

  constructor(private readonly respond: (input: AgentRunInput) => string) {}

  async startSession(
    input: AgentBackendSessionInput
  ): Promise<AgentBackendSession> {
    this.startInputs.push(input);
    if (input.backendSessionId && this.rejectResume) {
      this.rejectResume = false;
      throw new Error('Missing Codex thread.');
    }
    const session = new MockBackendSession(
      input.backendSessionId ?? `thread-${this.sessions.length + 1}`,
      this.respond
    );
    this.sessions.push(session);
    return session;
  }
}

const controllers: StreamOperationsController[] = [];

afterEach(async () => {
  while (controllers.length > 0) await controllers.pop()?.close();
});

function validResponse(input: AgentRunInput): string {
  const context = input.context as { readonly operation?: unknown };
  if (context.operation === 'live-alert') {
    return JSON.stringify({
      kind: 'live-alert',
      category: '質問増加',
      severity: '中',
      observation: '質問カテゴリの観測が増えています。',
      suggestion: '配信進行を止めない範囲でまとめて案内できます。',
      evidenceCommentIds: ['c02'],
    });
  }
  return JSON.stringify({
    kind: 'post-stream-report',
    delivery: 'local-draft',
    streamId: 'fixture-stream-001',
    summary: '構造化観測から配信全体を整理しました。',
    viewerSentiment: '肯定的カテゴリが中心でした。',
    notableTopics: ['制作環境への質問'],
    safetyConcerns: ['安全性注意カテゴリを検出'],
    frequentQuestions: ['制作環境に関する質問'],
    unansweredQuestions: ['確認済み情報が必要な質問'],
    constructiveFeedback: ['進行に関する改善提案'],
    nextStreamSuggestions: ['事前案内を準備する。'],
    evidence: [{ commentId: 'c02', observation: '質問カテゴリ' }],
  });
}

async function createController(
  backend: MockBackend,
  backendSessionId?: string
) {
  const controller = await createStreamOperationsController({
    backend,
    ...(backendSessionId ? { backendSessionId } : {}),
  });
  controllers.push(controller);
  return controller;
}

describe('stream operations controller', () => {
  it('runs comment-intelligence before Codex without forwarding raw text', async () => {
    const backend = new MockBackend(validResponse);
    const controller = await createController(backend);
    const events: AgentEvent[] = [];

    const completed = await controller.analyzeCommentIds(
      ['c01', 'c02'],
      (event) => events.push(event)
    );

    expect(completed.analysis).toMatchObject({
      analyzedCommentCount: 2,
      selectedCommentIds: expect.any(Array),
    });
    expect(completed.result?.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'stream-operations-alert',
          data: expect.objectContaining({
            kind: 'live-alert',
            observation: '質問カテゴリの観測が増えています。',
            evidenceCommentIds: ['c02'],
          }),
        }),
      ])
    );
    expect(events.map((event) => event.type)).toContain('artifact.created');
    const serializedTurn = JSON.stringify(backend.sessions[0].runs[0]);
    for (const comment of COMMENTS) {
      expect(serializedTurn).not.toContain(comment.text);
    }
    expect(serializedTurn).toContain('"rawViewerTextIncluded":false');
    expect(serializedTurn).toContain('"semanticSignals":["software-question"]');
    expect(backend.startInputs[0]).toMatchObject({
      inputTrust: 'untrusted',
      tools: [],
    });
  });

  it('validates the Codex report JSON Schema before artifact creation', async () => {
    const backend = new MockBackend(validResponse);
    const controller = await createController(backend);
    await controller.analyzeCommentIds(
      COMMENTS.map((comment) => comment.id),
      () => undefined
    );

    const completed = await controller.createPostStreamReport(() => undefined);

    expect(completed.result?.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'stream-operations-report',
          data: expect.objectContaining({
            kind: 'post-stream-report',
            delivery: 'local-draft',
            evidence: [{ commentId: 'c02', observation: '質問カテゴリ' }],
          }),
        }),
      ])
    );
    const reportTurn = backend.sessions[0].runs.at(-1);
    const serializedTurn = JSON.stringify(reportTurn);
    for (const comment of COMMENTS) {
      expect(serializedTurn).not.toContain(comment.text);
    }
  });

  it('accepts a report whose category arrays are legitimately empty', async () => {
    const backend = new MockBackend((input) => {
      const context = input.context as { readonly operation?: unknown };
      if (context.operation === 'live-alert') return validResponse(input);
      return JSON.stringify({
        kind: 'post-stream-report',
        delivery: 'local-draft',
        streamId: 'fixture-stream-001',
        summary: '目立った懸念のない配信でした。',
        viewerSentiment: '落ち着いた肯定的反応が中心でした。',
        notableTopics: [],
        safetyConcerns: [],
        frequentQuestions: [],
        unansweredQuestions: [],
        constructiveFeedback: [],
        nextStreamSuggestions: [],
        evidence: [{ commentId: 'c02', observation: '質問カテゴリ' }],
      });
    });
    const controller = await createController(backend);
    await controller.analyzeCommentIds(
      COMMENTS.map((comment) => comment.id),
      () => undefined
    );

    const completed = await controller.createPostStreamReport(() => undefined);

    expect(completed.result?.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'stream-operations-report',
          data: expect.objectContaining({
            kind: 'post-stream-report',
            unansweredQuestions: [],
            nextStreamSuggestions: [],
          }),
        }),
      ])
    );
  });

  it('fails the Turn when Codex returns a schema mismatch', async () => {
    const backend = new MockBackend(() =>
      JSON.stringify({ kind: 'live-alert', observation: 'missing fields' })
    );
    const controller = await createController(backend);
    const events: AgentEvent[] = [];

    let failure: unknown;
    try {
      await controller.analyzeCommentIds(['c01', 'c02'], (event) =>
        events.push(event)
      );
    } catch (error) {
      failure = error;
    }

    expect(readErrorChain(failure)).toContain('JSON Schema validation');
    expect(events.map((event) => event.type)).toContain('turn.failed');
    expect(events.map((event) => event.type)).not.toContain('artifact.created');
  });

  it('cold-resumes a valid backend Session ID', async () => {
    const backend = new MockBackend(validResponse);

    const controller = await createController(backend, 'thread-existing');

    expect(controller.resumed).toBe(true);
    expect(controller.backendSessionId).toBe('thread-existing');
    expect(backend.startInputs[0].backendSessionId).toBe('thread-existing');
  });

  it('falls back to a fresh Session when cold resume fails', async () => {
    const backend = new MockBackend(validResponse);
    backend.rejectResume = true;

    const controller = await createController(backend, 'thread-missing');

    expect(controller.resumed).toBe(false);
    expect(controller.backendSessionId).toBe('thread-1');
    expect(backend.startInputs).toHaveLength(2);
    expect(backend.startInputs[0].backendSessionId).toBe('thread-missing');
    expect(backend.startInputs[1].backendSessionId).toBeUndefined();
  });
});

function readErrorChain(error: unknown): string {
  const messages: string[] = [];
  let current = error;
  while (current instanceof Error) {
    messages.push(current.message);
    current = current.cause;
  }
  return messages.join('\n');
}
