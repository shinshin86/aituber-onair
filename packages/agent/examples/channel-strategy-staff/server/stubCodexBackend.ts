import type {
  AgentBackend,
  AgentBackendCapabilities,
  AgentBackendEvent,
  AgentBackendSession,
  AgentBackendSessionInput,
  AgentRunInput,
  AgentRunOptions,
} from '@aituber-onair/agent';
import type { ChannelStrategyProposal } from '../src/proposal.js';

export const STUB_CODEX_CAPABILITIES = Object.freeze({
  text: true,
  streaming: true,
  tools: false,
  interruption: true,
  sessionResume: true,
  approvals: true,
  detailedEvents: true,
} as const satisfies AgentBackendCapabilities);

export const DEMO_PROPOSAL: ChannelStrategyProposal = {
  schemaVersion: 1,
  summary:
    'YouTubeでは視聴者参加型Minecraftを継続し、探索と戦闘を明確なゴールにした検証配信を行うのが最も堅実です。',
  recommendation: {
    platform: 'youtube',
    gameId: 'minecraft',
    format: 'viewer-participation',
    contentTags: ['exploration', 'combat', 'viewer-participation'],
  },
  observedFacts: [
    {
      statement:
        '直近2回のYouTube視聴者参加型Minecraftは、長い平均視聴時間と高い登録者増加を両立しました。',
      evidence: [
        {
          platform: 'youtube',
          sourceType: 'stream',
          sourceId: 'yt-mc-viewer-01',
        },
        {
          platform: 'youtube',
          sourceType: 'stream',
          sourceId: 'yt-mc-viewer-02',
        },
      ],
    },
    {
      statement: '同じ仮説を検証した過去戦略はsupportedと評価されています。',
      evidence: [
        {
          platform: 'youtube',
          sourceType: 'strategy',
          sourceId: 'strategy-001',
        },
      ],
    },
  ],
  inferences: [
    {
      statement:
        '次回は一時的なリーチより、再現性の確認された視聴維持と成長を優先すべきです。',
      basedOn: [0, 1],
    },
  ],
  risks: [
    '同じ企画の反復によるマンネリ化を避けるため、探索地点と参加ルールを更新する必要があります。',
  ],
  limitations: [
    'Twitchの平均視聴時間は取得不能なため、YouTubeと同じ維持率軸では比較していません。',
    'Twitchの同時視聴者数はサンプリング値を含みます。',
  ],
  experiment: {
    hypothesis:
      '視聴者参加型Minecraftに明確な探索ゴールを設定すると、YouTubeの登録者増加を維持しながら平均視聴時間を伸ばせる。',
    successMetrics: [
      {
        metric: 'averageViewDurationSeconds',
        direction: 'increase',
        targetPercent: 5,
      },
      {
        metric: 'subscribersGained',
        direction: 'maintain',
        targetPercent: 0,
      },
    ],
  },
};

export interface StubCodexTurn {
  readonly messages?: readonly string[];
  readonly finalMessage?: string;
  readonly fail?: Error;
  readonly delayMs?: number;
}

export interface StubCodexBackend extends AgentBackend {
  readonly startedSessionIds: string[];
  readonly resumedSessionIds: string[];
  readonly receivedInputs: AgentBackendSessionInput[];
  readonly sessionCloseCount: { value: number };
}

export function createStubCodexBackend(
  options: {
    readonly turns?: readonly StubCodexTurn[];
    readonly defaultDelayMs?: number;
  } = {}
): StubCodexBackend {
  let sessionSequence = 0;
  let turnSequence = 0;
  const startedSessionIds: string[] = [];
  const resumedSessionIds: string[] = [];
  const receivedInputs: AgentBackendSessionInput[] = [];
  const sessionCloseCount = { value: 0 };

  return {
    name: 'stub-codex-app-server',
    backendCapabilities: STUB_CODEX_CAPABILITIES,
    startedSessionIds,
    resumedSessionIds,
    receivedInputs,
    sessionCloseCount,
    async startSession(input) {
      receivedInputs.push(input);
      sessionSequence += 1;
      const id =
        input.backendSessionId ?? `stub-codex-thread-${sessionSequence}`;
      if (input.backendSessionId) resumedSessionIds.push(id);
      else startedSessionIds.push(id);
      let activeAbort: (() => void) | undefined;
      let closed = false;

      return {
        id,
        async *runStream(
          _input: AgentRunInput,
          runOptions?: AgentRunOptions
        ): AsyncIterable<AgentBackendEvent> {
          if (closed) throw new Error('Stub Codex Session is closed.');
          turnSequence += 1;
          const configured = options.turns?.[turnSequence - 1];
          if (configured?.fail) throw configured.fail;
          const finalMessage =
            configured?.finalMessage ?? JSON.stringify(DEMO_PROPOSAL);
          const messages = configured?.messages ?? [
            'AGENTS.md と4つのデータファイルを確認しています。',
            'プラットフォーム別の傾向と過去仮説を照合しました。',
            finalMessage,
          ];
          for (const message of messages) {
            await waitForStub(
              configured?.delayMs ?? options.defaultDelayMs ?? 80,
              runOptions?.signal,
              (abort) => {
                activeAbort = abort;
              }
            );
            yield { type: 'message.completed', text: message };
          }
          yield {
            type: 'completed',
            message: finalMessage,
            artifacts: [
              {
                type: 'codex.plan',
                title: 'Channel data investigation',
                data: {
                  id: `stub-plan-${turnSequence}`,
                  text: 'Read the four normalized datasets, compare platforms, then validate one recommendation.',
                },
              },
              {
                type: 'codex.command-execution',
                title: 'Read normalized channel JSON',
                data: {
                  id: `stub-command-${turnSequence}`,
                  status: 'completed',
                  command: 'read data/*.json',
                  cwd: '.',
                  exitCode: 0,
                  durationMs: 180,
                },
              },
            ],
            metadata: { stub: true },
          };
        },
        interrupt() {
          activeAbort?.();
          return Promise.resolve();
        },
        async close() {
          if (closed) return;
          closed = true;
          activeAbort?.();
          sessionCloseCount.value += 1;
        },
      } satisfies AgentBackendSession;
    },
  };
}

async function waitForStub(
  delayMs: number,
  signal: AbortSignal | undefined,
  registerAbort: (abort: () => void) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (error) reject(error);
      else resolve();
    };
    const onAbort = (): void => finish(new Error('Stub Turn interrupted.'));
    const timer = setTimeout(() => finish(), delayMs);
    signal?.addEventListener('abort', onAbort, { once: true });
    registerAbort(onAbort);
    if (signal?.aborted) onAbort();
  });
}
