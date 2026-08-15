import type {
  MetricKey,
  MetricValue,
  StrategyRecord,
  StreamRecord,
  StreamingPlatform,
} from './types.js';

export const FIXTURE_REFERENCE_DATE = '2026-08-01T00:00:00.000Z';

const unavailable = (note: string): MetricValue => ({
  status: 'unavailable',
  reason: 'not-provided-by-platform',
  note,
});

const available = (
  value: number,
  source: Extract<MetricValue, { status: 'available' }>['source'],
  quality: Extract<MetricValue, { status: 'available' }>['quality'] = 'official'
): MetricValue => ({ status: 'available', value, source, quality });

function youtubeMetrics(values: {
  views: number;
  averageViewDurationSeconds: number;
  averageViewPercentage: number;
  subscribersGained: number;
  averageConcurrentViewers: number;
  peakConcurrentViewers: number;
  chatMessages: number;
  likes: number;
  comments: number;
}): Readonly<Record<MetricKey, MetricValue>> {
  return {
    views: available(values.views, 'youtube-analytics'),
    averageViewDurationSeconds: available(
      values.averageViewDurationSeconds,
      'youtube-analytics'
    ),
    averageViewPercentage: available(
      values.averageViewPercentage,
      'youtube-analytics'
    ),
    subscribersGained: available(values.subscribersGained, 'youtube-analytics'),
    followersGained: unavailable(
      'YouTube subscriber growth is not Twitch follower growth.'
    ),
    averageConcurrentViewers: available(
      values.averageConcurrentViewers,
      'youtube-analytics'
    ),
    peakConcurrentViewers: available(
      values.peakConcurrentViewers,
      'youtube-analytics'
    ),
    chatMessages: available(values.chatMessages, 'youtube-data'),
    likes: available(values.likes, 'youtube-data'),
    comments: available(values.comments, 'youtube-data'),
  };
}

function twitchMetrics(values: {
  views: number;
  followersGained: number;
  averageConcurrentViewers: number;
  peakConcurrentViewers: number;
  chatMessages: number;
  averageQuality?: 'official' | 'sampled';
}): Readonly<Record<MetricKey, MetricValue>> {
  const quality = values.averageQuality ?? 'sampled';
  return {
    views: available(values.views, 'twitch-helix'),
    averageViewDurationSeconds: unavailable(
      'Twitch does not provide an equivalent public channel analytics metric.'
    ),
    averageViewPercentage: unavailable(
      'Twitch does not provide an equivalent public channel analytics metric.'
    ),
    subscribersGained: unavailable(
      'Twitch followers and paid subscriptions are not YouTube subscribers.'
    ),
    followersGained: available(values.followersGained, 'twitch-eventsub'),
    averageConcurrentViewers: available(
      values.averageConcurrentViewers,
      quality === 'sampled' ? 'twitch-sampled' : 'twitch-helix',
      quality
    ),
    peakConcurrentViewers: available(
      values.peakConcurrentViewers,
      'twitch-sampled',
      'sampled'
    ),
    chatMessages: available(values.chatMessages, 'twitch-eventsub'),
    likes: unavailable('Twitch has no equivalent public like metric.'),
    comments: unavailable('Twitch VOD comments are not collected.'),
  };
}

const streams: readonly StreamRecord[] = [
  {
    id: 'yt-mc-viewer-01',
    platform: 'youtube',
    publishedAt: '2026-07-20T11:00:00.000Z',
    title: 'みんなで未踏の洞窟へ！視聴者参加Minecraft',
    durationMinutes: 132,
    game: { id: 'minecraft', title: 'Minecraft' },
    content: {
      format: 'viewer-participation',
      tags: ['exploration', 'combat', 'viewer-participation'],
    },
    metrics: youtubeMetrics({
      views: 5200,
      averageViewDurationSeconds: 1050,
      averageViewPercentage: 43,
      subscribersGained: 86,
      averageConcurrentViewers: 270,
      peakConcurrentViewers: 420,
      chatMessages: 620,
      likes: 480,
      comments: 190,
    }),
  },
  {
    id: 'yt-horror-first-01',
    platform: 'youtube',
    publishedAt: '2026-07-12T12:00:00.000Z',
    title: '話題の新作ホラーを初見プレイ',
    durationMinutes: 118,
    game: { id: 'night-signal', title: 'Night Signal' },
    content: { format: 'solo-first-look', tags: ['horror', 'first-look'] },
    metrics: youtubeMetrics({
      views: 7800,
      averageViewDurationSeconds: 410,
      averageViewPercentage: 18,
      subscribersGained: 22,
      averageConcurrentViewers: 180,
      peakConcurrentViewers: 690,
      chatMessages: 260,
      likes: 510,
      comments: 84,
    }),
  },
  {
    id: 'yt-coop-01',
    platform: 'youtube',
    publishedAt: '2026-07-05T10:00:00.000Z',
    title: 'AIコンビで宇宙船を修理する',
    durationMinutes: 145,
    game: { id: 'starship-duo', title: 'Starship Duo' },
    content: { format: 'collaboration', tags: ['co-op', 'challenge'] },
    metrics: youtubeMetrics({
      views: 3500,
      averageViewDurationSeconds: 760,
      averageViewPercentage: 31,
      subscribersGained: 37,
      averageConcurrentViewers: 210,
      peakConcurrentViewers: 360,
      chatMessages: 540,
      likes: 320,
      comments: 110,
    }),
  },
  {
    id: 'yt-mc-build-01',
    platform: 'youtube',
    publishedAt: '2026-06-28T11:00:00.000Z',
    title: 'コメントの設計図だけで巨大拠点を建築',
    durationMinutes: 151,
    game: { id: 'minecraft', title: 'Minecraft' },
    content: { format: 'challenge', tags: ['building', 'viewer-ideas'] },
    metrics: youtubeMetrics({
      views: 4100,
      averageViewDurationSeconds: 920,
      averageViewPercentage: 36,
      subscribersGained: 61,
      averageConcurrentViewers: 235,
      peakConcurrentViewers: 390,
      chatMessages: 580,
      likes: 410,
      comments: 170,
    }),
  },
  {
    id: 'yt-mc-viewer-02',
    platform: 'youtube',
    publishedAt: '2026-06-15T11:00:00.000Z',
    title: '視聴者と要塞攻略Minecraft',
    durationMinutes: 138,
    game: { id: 'minecraft', title: 'Minecraft' },
    content: {
      format: 'viewer-participation',
      tags: ['exploration', 'combat', 'viewer-participation'],
    },
    metrics: youtubeMetrics({
      views: 4900,
      averageViewDurationSeconds: 1010,
      averageViewPercentage: 41,
      subscribersGained: 79,
      averageConcurrentViewers: 258,
      peakConcurrentViewers: 405,
      chatMessages: 690,
      likes: 455,
      comments: 182,
    }),
  },
  {
    id: 'yt-chat-01',
    platform: 'youtube',
    publishedAt: '2026-05-20T12:00:00.000Z',
    title: '月末のまったりゲーム雑談',
    durationMinutes: 96,
    game: { id: 'just-chatting', title: 'Just Chatting' },
    content: { format: 'talk', tags: ['recap', 'chat'] },
    metrics: youtubeMetrics({
      views: 2000,
      averageViewDurationSeconds: 650,
      averageViewPercentage: 29,
      subscribersGained: 18,
      averageConcurrentViewers: 120,
      peakConcurrentViewers: 210,
      chatMessages: 430,
      likes: 180,
      comments: 72,
    }),
  },
  {
    id: 'tw-mc-viewer-01',
    platform: 'twitch',
    publishedAt: '2026-07-24T11:00:00.000Z',
    title: 'Community cave expedition',
    durationMinutes: 161,
    game: { id: 'minecraft', title: 'Minecraft' },
    content: {
      format: 'viewer-participation',
      tags: ['exploration', 'combat', 'viewer-participation'],
    },
    metrics: twitchMetrics({
      views: 2100,
      followersGained: 104,
      averageConcurrentViewers: 340,
      peakConcurrentViewers: 620,
      chatMessages: 1200,
    }),
  },
  {
    id: 'tw-horror-first-01',
    platform: 'twitch',
    publishedAt: '2026-07-15T12:00:00.000Z',
    title: 'Night Signal blind run',
    durationMinutes: 126,
    game: { id: 'night-signal', title: 'Night Signal' },
    content: { format: 'solo-first-look', tags: ['horror', 'first-look'] },
    metrics: twitchMetrics({
      views: 2600,
      followersGained: 95,
      averageConcurrentViewers: 410,
      peakConcurrentViewers: 780,
      chatMessages: 1500,
    }),
  },
  {
    id: 'tw-coop-01',
    platform: 'twitch',
    publishedAt: '2026-07-08T10:00:00.000Z',
    title: 'Starship repair speedrun with a guest',
    durationMinutes: 149,
    game: { id: 'starship-duo', title: 'Starship Duo' },
    content: { format: 'collaboration', tags: ['co-op', 'speedrun'] },
    metrics: twitchMetrics({
      views: 1750,
      followersGained: 64,
      averageConcurrentViewers: 290,
      peakConcurrentViewers: 510,
      chatMessages: 940,
    }),
  },
  {
    id: 'tw-mc-build-01',
    platform: 'twitch',
    publishedAt: '2026-06-30T11:00:00.000Z',
    title: 'Quiet Minecraft build stream',
    durationMinutes: 180,
    game: { id: 'minecraft', title: 'Minecraft' },
    content: { format: 'solo', tags: ['building', 'relaxed'] },
    metrics: twitchMetrics({
      views: 980,
      followersGained: 28,
      averageConcurrentViewers: 160,
      peakConcurrentViewers: 280,
      chatMessages: 470,
    }),
  },
  {
    id: 'tw-party-viewer-01',
    platform: 'twitch',
    publishedAt: '2026-06-22T10:00:00.000Z',
    title: 'Viewers choose every party-game rule',
    durationMinutes: 134,
    game: { id: 'party-lab', title: 'Party Lab' },
    content: {
      format: 'viewer-participation',
      tags: ['party', 'viewer-choices'],
    },
    metrics: twitchMetrics({
      views: 2300,
      followersGained: 110,
      averageConcurrentViewers: 380,
      peakConcurrentViewers: 650,
      chatMessages: 1660,
    }),
  },
  {
    id: 'tw-chat-01',
    platform: 'twitch',
    publishedAt: '2026-05-12T12:00:00.000Z',
    title: 'Monthly channel recap',
    durationMinutes: 102,
    game: { id: 'just-chatting', title: 'Just Chatting' },
    content: { format: 'talk', tags: ['recap', 'chat'] },
    metrics: twitchMetrics({
      views: 720,
      followersGained: 16,
      averageConcurrentViewers: 120,
      peakConcurrentViewers: 190,
      chatMessages: 390,
    }),
  },
  {
    id: 'yt-old-mc-01',
    platform: 'youtube',
    publishedAt: '2026-04-01T11:00:00.000Z',
    title: 'Archive: first Minecraft world',
    durationMinutes: 120,
    game: { id: 'minecraft', title: 'Minecraft' },
    content: { format: 'solo', tags: ['exploration'] },
    metrics: youtubeMetrics({
      views: 1200,
      averageViewDurationSeconds: 500,
      averageViewPercentage: 22,
      subscribersGained: 9,
      averageConcurrentViewers: 75,
      peakConcurrentViewers: 130,
      chatMessages: 160,
      likes: 92,
      comments: 31,
    }),
  },
  {
    id: 'tw-old-coop-01',
    platform: 'twitch',
    publishedAt: '2026-04-05T10:00:00.000Z',
    title: 'Archive: early co-op test',
    durationMinutes: 112,
    game: { id: 'starship-duo', title: 'Starship Duo' },
    content: { format: 'collaboration', tags: ['co-op'] },
    metrics: twitchMetrics({
      views: 420,
      followersGained: 8,
      averageConcurrentViewers: 62,
      peakConcurrentViewers: 98,
      chatMessages: 140,
    }),
  },
];

const strategies: readonly StrategyRecord[] = [
  {
    id: 'strategy-001',
    platform: 'youtube',
    hypothesis:
      'Viewer-participation Minecraft with an exploration goal improves retention and subscriber growth.',
    targetStreamIds: ['yt-mc-viewer-01', 'yt-mc-viewer-02'],
    result: 'supported',
    finding:
      'Both trials beat the YouTube channel median for view duration and subscribers gained.',
  },
  {
    id: 'strategy-002',
    platform: 'youtube',
    hypothesis:
      'A trending horror game will convert its high initial reach into audience growth.',
    targetStreamIds: ['yt-horror-first-01'],
    result: 'refuted',
    finding:
      'Views peaked, but retention and subscribers gained stayed below the channel median.',
  },
  {
    id: 'strategy-003',
    platform: 'twitch',
    hypothesis: 'First-look horror is the strongest repeatable Twitch format.',
    targetStreamIds: ['tw-horror-first-01'],
    result: 'mixed',
    finding:
      'Sampled concurrent viewers were strong, but no equivalent watch-duration metric is available.',
  },
];

export function getFixtureStreams(
  platform?: StreamingPlatform
): readonly StreamRecord[] {
  return streams.filter((stream) => !platform || stream.platform === platform);
}

export function getFixtureStrategies(
  platform?: StreamingPlatform
): readonly StrategyRecord[] {
  return strategies.filter(
    (strategy) => !platform || strategy.platform === platform
  );
}
