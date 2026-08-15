import type {
  ChatService,
  MessageWithVision,
  ToolChatCompletion,
  ToolDefinition,
} from '@aituber-onair/chat';
import type { ChannelStrategyProposal } from '../src/proposal.js';

const DEMO_PROPOSAL: ChannelStrategyProposal = {
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
    {
      statement:
        '新作ホラーはYouTubeの再生数が最大でしたが、視聴維持と登録者増加は弱い結果でした。',
      evidence: [
        {
          platform: 'youtube',
          sourceType: 'stream',
          sourceId: 'yt-horror-first-01',
        },
        {
          platform: 'youtube',
          sourceType: 'strategy',
          sourceId: 'strategy-002',
        },
      ],
    },
  ],
  inferences: [
    {
      statement:
        '次回は一時的なリーチより、再現性の確認された視聴維持と成長を優先すべきです。',
      basedOn: [0, 1, 2],
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

/** A deterministic ChatService used only for the documented fixture demo. */
export function createDemoChatService(
  tools: readonly ToolDefinition[]
): ChatService {
  let step = 0;
  const toolName = (logicalName: string): string => {
    const normalized = logicalName.replaceAll('.', '_');
    const tool = tools.find((candidate) => candidate.name === normalized);
    if (!tool) throw new Error(`Demo Tool is unavailable: ${logicalName}`);
    return tool.name;
  };
  const steps = [
    () => toolCall(toolName('channel.getOverview'), { days: 90 }, 1),
    () => toolCall(toolName('channel.getGamePerformance'), { days: 90 }, 2),
    () => toolCall(toolName('channel.listStreams'), { days: 90, limit: 20 }, 3),
    () =>
      toolCall(
        toolName('channel.getStreamDetail'),
        {
          platform: 'youtube',
          streamIds: [
            'yt-mc-viewer-01',
            'yt-mc-viewer-02',
            'yt-horror-first-01',
          ],
        },
        4
      ),
    () => toolCall(toolName('strategy.getHistory'), {}, 5),
  ];

  const chatOnce = async (): Promise<ToolChatCompletion> => {
    if (step < steps.length) {
      const completion = steps[step]();
      step += 1;
      return completion;
    }
    step = 0;
    return {
      blocks: [{ type: 'text', text: JSON.stringify(DEMO_PROPOSAL) }],
      stop_reason: 'end',
      usage: {
        prompt_tokens: 1200,
        completion_tokens: 420,
        total_tokens: 1620,
      },
    };
  };

  return {
    provider: 'openai',
    getModel: () => 'fixture-demo',
    getVisionModel: () => 'fixture-demo',
    processChat: async () => undefined,
    processVisionChat: async () => undefined,
    chatOnce,
    visionChatOnce: async (
      _messages: MessageWithVision[]
    ): Promise<ToolChatCompletion> => ({ blocks: [], stop_reason: 'end' }),
  };
}

function toolCall(
  name: string,
  input: Record<string, unknown>,
  index: number
): ToolChatCompletion {
  return {
    blocks: [
      {
        type: 'tool_use',
        id: `demo-tool-${index}`,
        name,
        input,
      },
    ],
    stop_reason: 'tool_use',
    assistant_message: {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: `demo-tool-${index}`,
          type: 'function',
          function: { name, arguments: JSON.stringify(input) },
        },
      ],
    },
  };
}
