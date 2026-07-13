import type { NoiseReactionInput, NoiseReactionSignal } from './types.js';

/**
 * Heuristics for reading a live chat as the reaction sensor. In a stream the
 * audience response to a deviation is directly observable: laughter tokens
 * (草 / w / lol), affection, pushback ("スベった"), or discomfort. This
 * helper turns the comments observed after a tilt into a reaction signal so
 * apps can close the reportReaction() loop without hand-labelling.
 */
const LAUGHTER_PATTERN =
  /[wｗ]{2,}|(?:^|[^\w])[wｗ]$|草|笑|ワロタ|わろた|😂|🤣|\blol\b|\blmao\b|haha/i;
const DISCOMFORT_PATTERN =
  /ドン引き|引くわ|引いた|不快|きつ|キツ|怖い|こわい|最低|creepy|uncomfortable|yikes|gross/i;
const PUSHBACK_PATTERN =
  /やめて|やめろ|寒い|さむ|スベ|すべっ|滑っ|つまらん|つまんな|しらけ|白け|冷めた|は？|cringe|not funny|stop it/i;
const POSITIVE_PATTERN =
  /かわいい|可愛い|好き|すき|最高|いいね|ナイス|ないす|えらい|天才|うまい|上手|感動|\bnice\b|\blove\b|\bgreat\b|awesome|\bcute\b/i;

/**
 * Infer a reaction signal from the viewer comments that arrived after the
 * latest tilt. Pass the raw comment texts (not the whole chat history) —
 * an empty list is meaningful and reads as silence.
 */
export function inferReactionFromComments(
  comments: string[]
): NoiseReactionInput {
  const observed = comments.map((comment) => comment.trim()).filter(Boolean);

  if (observed.length === 0) {
    return {
      signal: 'silence',
      detail: 'No comments arrived after the tilt.',
    };
  }

  const counts = {
    laughter: countMatches(observed, LAUGHTER_PATTERN),
    discomfort: countMatches(observed, DISCOMFORT_PATTERN),
    pushback: countMatches(observed, PUSHBACK_PATTERN),
    positive: countMatches(observed, POSITIVE_PATTERN),
  };
  const signal = decideSignal(counts);

  return {
    signal,
    detail: `laughter=${counts.laughter} positive=${counts.positive} pushback=${counts.pushback} discomfort=${counts.discomfort} across ${observed.length} comments`,
  };
}

function decideSignal(counts: {
  laughter: number;
  discomfort: number;
  pushback: number;
  positive: number;
}): NoiseReactionSignal {
  // Discomfort is the worst outcome for a deviation, so a single strong
  // discomfort marker outweighs laughter elsewhere in chat.
  if (counts.discomfort > 0) {
    return 'discomfort';
  }

  if (counts.pushback > 0 && counts.pushback >= counts.laughter) {
    return 'pushback';
  }

  if (counts.laughter > 0) {
    return 'laughter';
  }

  if (counts.positive > 0) {
    return 'positive';
  }

  return 'neutral';
}

function countMatches(comments: string[], pattern: RegExp): number {
  return comments.filter((comment) => pattern.test(comment)).length;
}
