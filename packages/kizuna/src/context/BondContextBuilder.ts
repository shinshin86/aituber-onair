import type {
  BondContextConfig,
  BondContextLanguage,
  BondContextOptions,
  BondSnapshot,
} from '../types';

export class BondContextBuilder {
  constructor(private readonly config: BondContextConfig = {}) {}

  build(snapshot: BondSnapshot, options: BondContextOptions = {}): string {
    const language =
      options.language ?? this.config.defaultLanguage ?? ('en' as const);
    const limitedSnapshot = this.limitEmotions(snapshot, options);
    const customTemplate = this.config.templates?.[language];
    return customTemplate
      ? customTemplate(limitedSnapshot)
      : this.buildDefault(limitedSnapshot, language);
  }

  private limitEmotions(
    snapshot: BondSnapshot,
    options: BondContextOptions,
  ): BondSnapshot {
    const limit = Math.max(0, options.maxFavoriteEmotions ?? 3);
    return {
      ...snapshot,
      favoriteEmotions: snapshot.favoriteEmotions.slice(0, limit),
    };
  }

  private buildDefault(
    snapshot: BondSnapshot,
    language: BondContextLanguage,
  ): string {
    const emotions = snapshot.favoriteEmotions
      .map(({ emotion }) => emotion)
      .join(', ');
    const warmth = snapshot.warmth.toFixed(2);
    const activeScar = [...snapshot.scars]
      .filter(({ healedAt }) => !healedAt)
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )[0];
    const recentAchievement = [...snapshot.achievements].sort(
      (left, right) => right.earnedAt.getTime() - left.earnedAt.getTime(),
    )[0];
    if (language === 'ja') {
      return [
        `${snapshot.displayName}との絆: ${snapshot.stage}（レベル${snapshot.level}、${snapshot.points}ポイント）。`,
        `関係の流れ: ${formatTrend(snapshot.trend, language)}。現在の空気: ${formatAtmosphere(snapshot.atmosphere, language)}（温かさ${warmth}）。`,
        `継続: ${snapshot.continuity.streak}バケット。`,
        activeScar
          ? `最近の傷: ${activeScar.summary}。仲直りには穏やかな接触の積み重ねが必要です。`
          : recentAchievement
            ? `最近の節目: ${recentAchievement.title}。`
            : '',
        emotions ? `好みの感情: ${emotions}。` : '',
        'この関係性の深さと現在の空気に合わせ、罪悪感を促さずに応答してください。',
      ]
        .filter(Boolean)
        .join(' ');
    }
    return [
      `Bond with ${snapshot.displayName}: ${snapshot.stage} (level ${snapshot.level}, ${snapshot.points} points).`,
      `Trend: ${formatTrend(snapshot.trend, language)}; current atmosphere: ${formatAtmosphere(snapshot.atmosphere, language)} (warmth ${warmth}).`,
      `Continuity: ${snapshot.continuity.streak} buckets.`,
      activeScar
        ? `Recent scar: ${activeScar.summary}; repair still needs a sustained calm pattern.`
        : recentAchievement
          ? `Recent milestone: ${recentAchievement.title}.`
          : '',
      emotions ? `Favorite emotions: ${emotions}.` : '',
      'Respond in a way that fits this bond depth and atmosphere without inducing guilt.',
    ]
      .filter(Boolean)
      .join(' ');
  }
}

function formatTrend(
  trend: BondSnapshot['trend'],
  language: BondContextLanguage,
): string {
  const labels =
    language === 'ja'
      ? {
          rising: '育っている',
          steady: '安定している',
          falling: '悪化している',
          repairing: '修復している',
        }
      : {
          rising: 'rising',
          steady: 'steady',
          falling: 'falling',
          repairing: 'repairing',
        };
  return labels[trend];
}

function formatAtmosphere(
  atmosphere: BondSnapshot['atmosphere'],
  language: BondContextLanguage,
): string {
  const labels =
    language === 'ja'
      ? {
          warm: '温かい',
          neutral: '落ち着いている',
          cool: '冷えている',
          cold: 'かなり冷えている',
        }
      : {
          warm: 'warm',
          neutral: 'neutral',
          cool: 'cool',
          cold: 'cold',
        };
  return labels[atmosphere];
}
