import {
  getSpeechLoopRange,
  type Live2DMotionSelection,
} from './live2dMotions';

export interface LoopableLive2DMotion {
  isLoop(): boolean;
  setIsLoop(loop: boolean): void;
  isLoopFadeIn(): boolean;
  setIsLoopFadeIn(loopFadeIn: boolean): void;
  getLoopDuration(): number;
}

interface SpeechMotionQueueEntry {
  _motion: LoopableLive2DMotion;
  isStarted(): boolean;
  getStartTime(): number;
  setStartTime(time: number): void;
  setEndTime(time: number): void;
}

export interface SpeechMotionModel {
  elapsedTime: number;
  internalModel?: {
    on(event: 'beforeMotionUpdate', listener: () => void): void;
    off(event: 'beforeMotionUpdate', listener: () => void): void;
  };
}

export interface SpeechMotionManager {
  groups: { idle: string };
  motionGroups: Record<string, Array<LoopableLive2DMotion | null | undefined>>;
  queueManager: { _motions: SpeechMotionQueueEntry[] };
}

const SPEECH_IDLE_GROUP = '__aituber_onair_speech_hold__';

export function holdIdleMotion(manager: SpeechMotionManager): () => void {
  const originalIdleGroup = manager.groups.idle;
  manager.groups.idle = SPEECH_IDLE_GROUP;
  return () => {
    if (manager.groups.idle === SPEECH_IDLE_GROUP) {
      manager.groups.idle = originalIdleGroup;
    }
  };
}

export function loopSpeechMotion(
  manager: SpeechMotionManager,
  model: SpeechMotionModel,
  selection: Live2DMotionSelection,
): (() => void) | null {
  const motion = manager.motionGroups[selection.group]?.[selection.index];
  const duration = motion?.getLoopDuration();
  if (
    !motion ||
    typeof duration !== 'number' ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !model.internalModel
  )
    return null;

  const originalLoop = motion.isLoop();
  const originalLoopFadeIn = motion.isLoopFadeIn();
  const { startPercent, endPercent } = getSpeechLoopRange(selection);
  const startSeconds = (duration * startPercent) / 100;
  const endSeconds = (duration * endPercent) / 100;
  let activeEntry: SpeechMotionQueueEntry | undefined;

  const onBeforeMotionUpdate = () => {
    const entry = manager.queueManager._motions.find(
      (candidate) => candidate._motion === motion,
    );
    if (!entry || !entry.isStarted()) return;
    activeEntry = entry;
    entry.setEndTime(-1);
    const now = model.elapsedTime / 1000;
    const offset = now - entry.getStartTime();
    if (offset < endSeconds) return;
    const length = endSeconds - startSeconds;
    const nextOffset = startSeconds + ((offset - endSeconds) % length);
    entry.setStartTime(now - nextOffset);
  };

  motion.setIsLoop(true);
  motion.setIsLoopFadeIn(false);
  model.internalModel.on('beforeMotionUpdate', onBeforeMotionUpdate);

  return () => {
    model.internalModel?.off('beforeMotionUpdate', onBeforeMotionUpdate);
    motion.setIsLoop(originalLoop);
    motion.setIsLoopFadeIn(originalLoopFadeIn);
    if (activeEntry && !originalLoop) {
      activeEntry.setEndTime(activeEntry.getStartTime() + duration);
    }
  };
}
