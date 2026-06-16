import type {
  VrmExpressionPart,
  VrmOneShotAnimationName,
} from './vrmExpressionController';

export interface ScreenplayLike {
  emotion?: string;
  text?: string;
}

export type VrmAvatarReactionDraft =
  | {
      type: 'emote';
      name: string;
      intensity?: number;
      fadeMs?: number;
      holdMs?: number;
    }
  | {
      type: 'gesture';
      parts: readonly VrmExpressionPart[];
      fadeMs?: number;
      holdMs?: number;
    }
  | {
      type: 'animation';
      name: VrmOneShotAnimationName;
    }
  | {
      type: 'reset';
      fadeMs?: number;
    };

export type VrmAvatarReaction = VrmAvatarReactionDraft & { id: number };

const REACTION_KEYWORDS = {
  laugh: /笑|ｗ|w{2,}|あは|えへ|ふふ|哈哈|lol/i,
  pout: /ぷん|むっ|怒|腹立|ひどい|もうっ/,
  teary: /泣|涙|うるうる|悲し|寂し|さみし|つらい|ごめん/,
  surprised: /[!?！？]|驚|びっくり|まさか|えっ|本当/,
  happy: /嬉し|うれし|楽しい|楽しか|ありがとう|助かる|いいね|最高/,
  relaxed: /なるほど|了解|わかった|大丈夫|安心|ほっと/,
} as const;

export function createVrmReactionFromScreenplay(
  screenplay: ScreenplayLike,
): VrmAvatarReactionDraft | null {
  const emotion = screenplay.emotion?.toLowerCase().trim();
  const text = screenplay.text ?? '';

  if (emotion === 'happy') {
    return REACTION_KEYWORDS.laugh.test(text)
      ? { type: 'animation', name: 'laugh' }
      : { type: 'emote', name: 'happy', intensity: 0.8, holdMs: 3500 };
  }

  if (emotion === 'angry') {
    return REACTION_KEYWORDS.pout.test(text)
      ? { type: 'animation', name: 'pout' }
      : { type: 'emote', name: 'angry', intensity: 0.75, holdMs: 2500 };
  }

  if (emotion === 'sad') {
    return REACTION_KEYWORDS.teary.test(text)
      ? { type: 'animation', name: 'teary' }
      : { type: 'emote', name: 'sad', intensity: 0.7, holdMs: 3000 };
  }

  if (emotion === 'surprised') {
    return {
      type: 'gesture',
      parts: [
        { name: 'surprised', intensity: 0.7 },
        { name: 'eyeWideLeft', intensity: 0.55 },
        { name: 'eyeWideRight', intensity: 0.55 },
        { name: 'browInnerUp', intensity: 0.45 },
      ],
      holdMs: 1600,
    };
  }

  if (emotion === 'relaxed') {
    return { type: 'emote', name: 'relaxed', intensity: 0.45, holdMs: 3000 };
  }

  if (emotion === 'neutral') {
    return { type: 'reset', fadeMs: 220 };
  }

  if (REACTION_KEYWORDS.laugh.test(text)) {
    return { type: 'animation', name: 'laugh' };
  }

  if (REACTION_KEYWORDS.pout.test(text)) {
    return { type: 'animation', name: 'pout' };
  }

  if (REACTION_KEYWORDS.teary.test(text)) {
    return { type: 'animation', name: 'teary' };
  }

  if (REACTION_KEYWORDS.surprised.test(text)) {
    return { type: 'emote', name: 'surprised', intensity: 0.65, holdMs: 1600 };
  }

  if (REACTION_KEYWORDS.happy.test(text)) {
    return { type: 'emote', name: 'happy', intensity: 0.75, holdMs: 3000 };
  }

  if (REACTION_KEYWORDS.relaxed.test(text)) {
    return { type: 'emote', name: 'relaxed', intensity: 0.4, holdMs: 2600 };
  }

  return null;
}

export function sustainVrmReactionForSpeech(
  draft: VrmAvatarReactionDraft,
): VrmAvatarReactionDraft {
  if (draft.type === 'emote') {
    if (draft.name === 'happy') {
      return createSmileGesture();
    }

    return { ...draft, holdMs: undefined };
  }

  if (draft.type === 'gesture') {
    return { ...draft, holdMs: undefined };
  }

  if (draft.type === 'animation') {
    if (draft.name === 'laugh') {
      return createSmileGesture();
    }

    if (draft.name === 'pout') {
      return {
        type: 'gesture',
        parts: [
          { name: 'angry', intensity: 0.75 },
          { name: 'browDownLeft', intensity: 0.45 },
          { name: 'browDownRight', intensity: 0.45 },
          { name: 'mouthPucker', intensity: 0.35 },
        ],
      };
    }

    return {
      type: 'gesture',
      parts: [
        { name: 'sad', intensity: 0.7 },
        { name: 'browInnerUp', intensity: 0.6 },
        { name: 'mouthFrownLeft', intensity: 0.35 },
        { name: 'mouthFrownRight', intensity: 0.35 },
      ],
    };
  }

  return draft;
}

export function withReactionId(
  draft: VrmAvatarReactionDraft,
  id: number,
): VrmAvatarReaction {
  return { ...draft, id } as VrmAvatarReaction;
}

function createSmileGesture(): VrmAvatarReactionDraft {
  return {
    type: 'gesture',
    parts: [
      { name: 'happy', intensity: 0.78 },
      { name: 'mouthSmileLeft', intensity: 0.38 },
      { name: 'mouthSmileRight', intensity: 0.38 },
    ],
  };
}
