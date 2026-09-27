import type { Live2DMotion, Live2DMotionSelection } from './live2dMotions';

export type Live2DModelIdleMotionMaps = Record<string, Live2DMotionSelection[]>;

export function normalizeLive2DModelIdleMotionMaps(
  value: unknown,
): Live2DModelIdleMotionMaps {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const maps: Live2DModelIdleMotionMaps = {};
  for (const [modelPath, candidate] of Object.entries(value).slice(-24)) {
    if (!modelPath || !Array.isArray(candidate)) continue;

    const selections: Live2DMotionSelection[] = [];
    const seen = new Set<string>();
    for (const entry of candidate.slice(0, 64)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const { group, index } = entry as Record<string, unknown>;
      if (
        typeof group !== 'string' ||
        typeof index !== 'number' ||
        !Number.isSafeInteger(index) ||
        index < 0
      )
        continue;
      const key = JSON.stringify([group, index]);
      if (seen.has(key)) continue;
      seen.add(key);
      selections.push({ group, index });
    }
    maps[modelPath] = selections;
  }
  return maps;
}

export function getSelectedLive2DIdleMotions(
  maps: Live2DModelIdleMotionMaps,
  modelPath: string | undefined,
  motions: Live2DMotion[],
): Live2DMotionSelection[] {
  const saved = modelPath ? maps[modelPath] : undefined;
  const selections =
    saved ?? motions.filter((motion) => motion.group === 'Idle');
  return motions
    .filter((motion) =>
      selections.some(
        (selection) =>
          selection.group === motion.group && selection.index === motion.index,
      ),
    )
    .map(({ group, index }) => ({ group, index }));
}

export function matchesModelIdleMotions(
  selections: Live2DMotionSelection[],
  motions: Live2DMotion[],
): boolean {
  const defaults = motions.filter((motion) => motion.group === 'Idle');
  return (
    selections.length === defaults.length &&
    defaults.every((motion) =>
      selections.some(
        (selection) =>
          selection.group === motion.group && selection.index === motion.index,
      ),
    )
  );
}
