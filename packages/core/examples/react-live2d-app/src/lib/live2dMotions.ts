import {
  LIVE2D_REACTION_EMOTIONS,
  type Live2DReactionEmotion,
} from './live2dReactions';

export interface Live2DMotion {
  group: string;
  index: number;
  file: string;
}

export interface Live2DMotionSelection
  extends Pick<Live2DMotion, 'group' | 'index'> {
  speechLoopStartPercent?: number;
  speechLoopEndPercent?: number;
}

export const DEFAULT_SPEECH_LOOP_START_PERCENT = 40;
export const DEFAULT_SPEECH_LOOP_END_PERCENT = 70;

export function getSpeechLoopRange(motion: Live2DMotionSelection): {
  startPercent: number;
  endPercent: number;
} {
  const start = motion.speechLoopStartPercent;
  const end = motion.speechLoopEndPercent;
  if (
    typeof start === 'number' &&
    Number.isInteger(start) &&
    start >= 0 &&
    start <= 90 &&
    typeof end === 'number' &&
    Number.isInteger(end) &&
    end >= start + 10 &&
    end <= 100
  ) {
    return { startPercent: start, endPercent: end };
  }
  return {
    startPercent: DEFAULT_SPEECH_LOOP_START_PERCENT,
    endPercent: DEFAULT_SPEECH_LOOP_END_PERCENT,
  };
}
export type Live2DEmotionMotionMap = Partial<
  Record<Live2DReactionEmotion, Live2DMotionSelection>
>;
export type Live2DModelMotionMaps = Record<string, Live2DEmotionMotionMap>;

export function listLive2DMotions(
  groups: Record<string, Array<{ File?: string }>> | undefined,
): Live2DMotion[] {
  if (!groups) return [];
  return Object.entries(groups).flatMap(([group, motions]) =>
    motions.flatMap((motion, index) =>
      motion.File ? [{ group, index, file: motion.File }] : [],
    ),
  );
}

export function normalizeLive2DModelMotionMaps(
  value: unknown,
): Live2DModelMotionMaps {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const maps: Live2DModelMotionMaps = {};
  for (const [modelPath, candidate] of Object.entries(value).slice(-24)) {
    if (
      !modelPath ||
      !candidate ||
      typeof candidate !== 'object' ||
      Array.isArray(candidate)
    )
      continue;
    const map: Live2DEmotionMotionMap = {};
    for (const emotion of LIVE2D_REACTION_EMOTIONS) {
      const selection = (candidate as Record<string, unknown>)[emotion];
      if (
        !selection ||
        typeof selection !== 'object' ||
        Array.isArray(selection)
      )
        continue;
      const { group, index } = selection as Record<string, unknown>;
      if (
        typeof group === 'string' &&
        group &&
        typeof index === 'number' &&
        Number.isSafeInteger(index) &&
        index >= 0
      ) {
        const range = getSpeechLoopRange(selection as Live2DMotionSelection);
        const savedRange = selection as Live2DMotionSelection;
        map[emotion] = {
          group,
          index,
          ...(savedRange.speechLoopStartPercent === range.startPercent &&
          savedRange.speechLoopEndPercent === range.endPercent
            ? {
                speechLoopStartPercent: range.startPercent,
                speechLoopEndPercent: range.endPercent,
              }
            : {}),
        };
      }
    }
    if (Object.keys(map).length > 0) maps[modelPath] = map;
  }
  return maps;
}

export function getAssignedLive2DMotion(
  maps: Live2DModelMotionMaps,
  modelPath: string | undefined,
  emotion: unknown,
  motions: Live2DMotion[],
): Live2DMotionSelection | null {
  if (!modelPath || typeof emotion !== 'string') return null;
  const normalizedEmotion = emotion.toLowerCase().trim();
  if (!LIVE2D_REACTION_EMOTIONS.some((item) => item === normalizedEmotion))
    return null;
  const selection =
    maps[modelPath]?.[normalizedEmotion as Live2DReactionEmotion];
  if (!selection) return null;
  return motions.some(
    (motion) =>
      motion.group === selection.group && motion.index === selection.index,
  )
    ? selection
    : null;
}
