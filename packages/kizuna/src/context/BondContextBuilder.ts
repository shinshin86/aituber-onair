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
    if (language === 'ja') {
      return [
        `${snapshot.displayName}との絆: ${snapshot.stage}（レベル${snapshot.level}、${snapshot.points}ポイント）。`,
        `親密さ: ${warmth}、継続: ${snapshot.continuity.streak}バケット。`,
        emotions ? `好みの感情: ${emotions}。` : '',
        'この関係性の深さと現在の親密さに合わせて応答してください。',
      ]
        .filter(Boolean)
        .join(' ');
    }
    return [
      `Bond with ${snapshot.displayName}: ${snapshot.stage} (level ${snapshot.level}, ${snapshot.points} points).`,
      `Warmth: ${warmth}; continuity: ${snapshot.continuity.streak} buckets.`,
      emotions ? `Favorite emotions: ${emotions}.` : '',
      'Respond in a way that fits this bond depth and current warmth.',
    ]
      .filter(Boolean)
      .join(' ');
  }
}
