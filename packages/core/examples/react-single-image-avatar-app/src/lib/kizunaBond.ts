export type BondSource = 'form' | 'youtube' | 'twitch';

export interface BondIdentity {
  userId: string;
  displayName: string;
  source: BondSource;
  isOwner: boolean;
}

export interface BondToast {
  id: number;
  userId: string;
  displayName: string;
  pointsAdded: number;
  previousIntimacy: number;
  nextIntimacy: number;
  previousStage: string;
  nextStage: string;
  leveledUp: boolean;
  newLevel?: number;
}

export function createBondIdentity(
  source: BondSource,
  displayName: string,
): BondIdentity {
  const normalizedName = displayName.trim() || '匿名の視聴者';
  return {
    userId: source === 'form' ? 'form:owner' : `${source}:${normalizedName}`,
    displayName: source === 'form' ? 'あなた' : normalizedName,
    source,
    isOwner: source === 'form',
  };
}

export function buildBondAwareSystemPrompt(
  basePrompt: string,
  bondContext: string,
): string {
  return bondContext
    ? `${basePrompt}\n\nCurrent viewer relationship:\n${bondContext}`
    : basePrompt;
}

export function getBondContextDisplayName(source: BondSource): string {
  if (source === 'form') return 'あなた';
  return source === 'youtube' ? 'YouTube視聴者' : 'Twitch視聴者';
}

export function formatBondStage(stage: string): string {
  const labels: Record<string, string> = {
    stranger: '知り合ったばかり',
    acquaintance: '知り合い',
    regular: '常連',
    companion: '相棒',
  };
  return labels[stage] ?? stage;
}
