import {
  LIVE2D_REACTION_EMOTIONS,
  type Live2DReactionEmotion,
} from './live2dReactions';

export interface Live2DMotion {
  group: string;
  index: number;
  file: string;
}

export type Live2DMotionSelection = Pick<Live2DMotion, 'group' | 'index'>;
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
        map[emotion] = { group, index };
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
