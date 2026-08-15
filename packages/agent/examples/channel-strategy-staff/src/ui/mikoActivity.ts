import type { AgentEvent } from '@aituber-onair/agent';
import {
  createPuruPuruReactionFromEmotion,
  withReactionId,
  type PuruPuruReaction,
} from '../lib/purupuruReactions';

export type MikoActivityKind =
  | 'idle'
  | 'investigating'
  | 'validating'
  | 'done'
  | 'failed';

export interface MikoActivity {
  readonly kind: MikoActivityKind;
  readonly toolId?: string;
}

export interface MikoPresentation {
  readonly label: string;
  readonly detail: string;
  readonly expression: string;
  readonly reaction: PuruPuruReaction | null;
}

const REACTION_IDS: Record<MikoActivityKind, number> = {
  idle: 0,
  investigating: 1,
  validating: 2,
  done: 3,
  failed: 4,
};

/**
 * Maps the Agent Event stream onto what the staff card should show. A failed
 * Tool call is reported back to the model, so it does not end the Turn and
 * does not change the activity by itself.
 */
export function deriveMikoActivity(
  events: readonly AgentEvent[],
  turnActive: boolean
): MikoActivity {
  let activity: MikoActivity = { kind: 'idle' };
  for (const event of events) {
    switch (event.type) {
      case 'turn.started':
        activity = { kind: 'investigating' };
        break;
      case 'tool.requested':
      case 'tool.started':
      case 'tool.completed':
        activity = { kind: 'investigating', toolId: event.toolId };
        break;
      case 'message.completed':
        activity = { kind: 'validating' };
        break;
      case 'artifact.created':
      case 'turn.completed':
        activity = { kind: 'done' };
        break;
      case 'turn.failed':
      case 'turn.interrupted':
        activity = { kind: 'failed' };
        break;
      default:
        break;
    }
  }
  if (turnActive && activity.kind === 'idle') {
    return { kind: 'investigating' };
  }
  return activity;
}

export function presentMikoActivity(activity: MikoActivity): MikoPresentation {
  switch (activity.kind) {
    case 'investigating':
      return {
        label: '調査中',
        detail: activity.toolId ?? 'Toolを選んでいます',
        expression: '思考',
        reaction: reactionFor('thinking', activity.kind),
      };
    case 'validating':
      return {
        label: '検証中',
        detail: '構造化JSONと根拠IDを検証中',
        expression: '思考',
        reaction: reactionFor('thinking', activity.kind),
      };
    case 'done':
      return {
        label: '提案を作成',
        detail: '提案がまとまりました',
        expression: 'ポジティブ',
        reaction: reactionFor('happy', activity.kind),
      };
    case 'failed':
      return {
        label: '中断',
        detail: 'Turnが完了しませんでした',
        expression: '懸念',
        reaction: reactionFor('sad', activity.kind),
      };
    default:
      return {
        label: '待機中',
        detail: 'hostのスケジュールで起動します',
        expression: 'ニュートラル',
        reaction: null,
      };
  }
}

function reactionFor(
  emotion: string,
  kind: MikoActivityKind
): PuruPuruReaction | null {
  const draft = createPuruPuruReactionFromEmotion(emotion);
  return draft ? withReactionId(draft, REACTION_IDS[kind]) : null;
}
