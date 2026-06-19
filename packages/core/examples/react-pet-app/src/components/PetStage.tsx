import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '../types/chat';
import type { PetManifest } from '../types/settings';

type PetAction =
  | 'idle'
  | 'running-right'
  | 'running-left'
  | 'waving'
  | 'jumping'
  | 'failed'
  | 'waiting'
  | 'running'
  | 'review';

interface PetStageProps {
  messages: ChatMessage[];
  partialResponse: string;
  isProcessing: boolean;
  isSpeaking: boolean;
  mouthLevel: number;
  petManifest?: PetManifest | null;
  petSpritesheetUrl?: string | null;
}

interface PetRow {
  row: number;
  frames: number;
  frameMs: number;
}

interface PetPosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
}

const PET_MANIFEST_URL = '/pet/pet.json';
const DEFAULT_SPRITESHEET_URL = '/pet/spritesheet.webp';
const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;
const ATLAS_COLUMNS = 8;
const ATLAS_ROWS = 9;
const PET_WIDTH = 176;
const FLOOR_OFFSET = 0;
const PET_FOOT_ANCHOR_OFFSET = 5;
const GRAVITY = 0.7;
const JUMP_VELOCITY = -11;
const WALK_SPEED = 1.1;
const RUN_SPEED = 4.8;
const AIR_CONTROL = 0.08;
const GROUND_FRICTION = 0.82;
const HAPPY_KEYWORDS = [
  'うれしい',
  '嬉しい',
  '楽しい',
  '最高',
  'やった',
  'ありがとう',
  'すごい',
  'いいね',
  '!',
  '！',
];
const FAILED_KEYWORDS = ['ごめん', '失敗', 'エラー', 'できません', '難しい'];

const PET_ROWS: Record<PetAction, PetRow> = {
  idle: { row: 0, frames: 6, frameMs: 180 },
  'running-right': { row: 1, frames: 8, frameMs: 90 },
  'running-left': { row: 2, frames: 8, frameMs: 90 },
  waving: { row: 3, frames: 4, frameMs: 130 },
  jumping: { row: 4, frames: 5, frameMs: 120 },
  failed: { row: 5, frames: 8, frameMs: 150 },
  waiting: { row: 6, frames: 6, frameMs: 170 },
  running: { row: 7, frames: 6, frameMs: 95 },
  review: { row: 8, frames: 6, frameMs: 150 },
};

const SPEAKING_ACTIONS: PetAction[] = [
  'running',
  'running',
  'jumping',
  'running',
  'waving',
  'jumping',
];

const THINKING_ACTIONS: Array<{ action: PetAction; weight: number }> = [
  { action: 'running', weight: 24 },
  { action: 'jumping', weight: 22 },
  { action: 'review', weight: 18 },
  { action: 'waiting', weight: 14 },
  { action: 'waving', weight: 10 },
  { action: 'failed', weight: 8 },
  { action: 'idle', weight: 4 },
];

function includesAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function getLatestAssistantText(
  messages: ChatMessage[],
  partialResponse: string,
): string {
  if (partialResponse) return partialResponse;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'assistant') {
      return message.content;
    }
  }

  return '';
}

function usePetManifest() {
  const [manifest, setManifest] = useState<PetManifest>({});

  useEffect(() => {
    const controller = new AbortController();

    const loadManifest = async () => {
      try {
        const response = await fetch(PET_MANIFEST_URL, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as PetManifest;
        if (!controller.signal.aborted) {
          setManifest(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('Failed to load pet manifest:', error);
        }
      }
    };

    void loadManifest();

    return () => {
      controller.abort();
    };
  }, []);

  return manifest;
}

function resolveSpritesheetUrl(spritesheetPath?: string): string {
  if (!spritesheetPath) return DEFAULT_SPRITESHEET_URL;
  if (spritesheetPath.startsWith('/')) return spritesheetPath;
  return `/pet/${spritesheetPath}`;
}

function useSpeakingAction(
  isSpeaking: boolean,
  mouthLevel: number,
): PetAction | null {
  const [sequenceIndex, setSequenceIndex] = useState(0);

  useEffect(() => {
    if (!isSpeaking) return;

    const intervalId = window.setInterval(() => {
      setSequenceIndex((current) => current + 1);
    }, 850);

    return () => window.clearInterval(intervalId);
  }, [isSpeaking]);

  if (!isSpeaking) return null;
  if (mouthLevel >= 3 && sequenceIndex % 2 === 0) {
    return 'jumping';
  }

  return SPEAKING_ACTIONS[sequenceIndex % SPEAKING_ACTIONS.length];
}

function useThinkingAction(isProcessing: boolean): PetAction | null {
  const [thinkingAction, setThinkingAction] = useState<PetAction>('review');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isProcessing) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    let active = true;

    const scheduleNextAction = (previousAction?: PetAction) => {
      const nextAction = pickThinkingAction(previousAction);
      const duration = getThinkingActionDuration(nextAction);
      setThinkingAction(nextAction);
      timeoutRef.current = window.setTimeout(() => {
        if (active) {
          scheduleNextAction(nextAction);
        }
      }, duration);
    };

    scheduleNextAction();

    return () => {
      active = false;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isProcessing]);


  if (!isProcessing) return null;
  return thinkingAction;
}

function pickThinkingAction(previousAction?: PetAction): PetAction {
  const candidates = THINKING_ACTIONS.filter(
    ({ action }) => action !== previousAction || action === 'running',
  );
  const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const item of candidates) {
    cursor -= item.weight;
    if (cursor <= 0) return item.action;
  }

  return candidates[0]?.action ?? 'review';
}

function getThinkingActionDuration(action: PetAction): number {
  const randomMs = (min: number, max: number) =>
    Math.round(min + Math.random() * (max - min));

  switch (action) {
    case 'running':
      return randomMs(1100, 2200);
    case 'jumping':
      return randomMs(650, 1200);
    case 'review':
      return randomMs(900, 1700);
    case 'waiting':
      return randomMs(1000, 1900);
    case 'failed':
      return randomMs(1200, 2200);
    case 'waving':
      return randomMs(800, 1400);
    default:
      return randomMs(550, 950);
  }
}

function usePetAction({
  messages,
  partialResponse,
  isProcessing,
  isSpeaking,
  mouthLevel,
}: PetStageProps): PetAction {
  const [reaction, setReaction] = useState<PetAction | null>(null);
  const reactionStartTimeoutRef = useRef<number | null>(null);
  const reactionTimeoutRef = useRef<number | null>(null);
  const latestAssistantText = useMemo(
    () => getLatestAssistantText(messages, partialResponse),
    [messages, partialResponse],
  );
  const speakingAction = useSpeakingAction(isSpeaking, mouthLevel);
  const thinkingAction = useThinkingAction(isProcessing);

  useEffect(() => {
    if (!latestAssistantText) return;

    const nextReaction = includesAnyKeyword(latestAssistantText, FAILED_KEYWORDS)
      ? 'failed'
      : includesAnyKeyword(latestAssistantText, HAPPY_KEYWORDS)
        ? 'running'
        : null;

    if (!nextReaction) return;

    if (reactionStartTimeoutRef.current) {
      window.clearTimeout(reactionStartTimeoutRef.current);
    }
    reactionStartTimeoutRef.current = window.setTimeout(() => {
      setReaction(nextReaction);
      reactionStartTimeoutRef.current = null;
      if (reactionTimeoutRef.current) {
        window.clearTimeout(reactionTimeoutRef.current);
      }
      reactionTimeoutRef.current = window.setTimeout(() => {
        setReaction(null);
        reactionTimeoutRef.current = null;
      }, 3600);
    }, 0);
  }, [latestAssistantText]);

  useEffect(() => {
    return () => {
      if (reactionStartTimeoutRef.current) {
        window.clearTimeout(reactionStartTimeoutRef.current);
      }
      if (reactionTimeoutRef.current) {
        window.clearTimeout(reactionTimeoutRef.current);
      }
    };
  }, []);

  if (reaction) return reaction;
  if (speakingAction) return speakingAction;
  if (thinkingAction) return thinkingAction;
  return 'idle';
}

function useSpriteFrame(action: PetAction) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const row = PET_ROWS[action];

    const intervalId = window.setInterval(() => {
      setFrame((current) => (current + 1) % row.frames);
    }, row.frameMs);

    return () => window.clearInterval(intervalId);
  }, [action]);

  return frame;
}

function getMovementAction(
  action: PetAction,
  position: PetPosition,
): PetAction {
  if (action === 'running') {
    return position.vx >= 0 ? 'running-right' : 'running-left';
  }
  return action;
}

function usePetMovement(action: PetAction, mouthLevel: number) {
  const stageRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef(action);
  const mouthLevelRef = useRef(mouthLevel);
  const directionRef = useRef(1);
  const nextTurnAtRef = useRef(0);
  const [position, setPosition] = useState<PetPosition>({
    x: 80,
    y: 0,
    vx: 1.8,
    vy: 0,
    grounded: false,
  });

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEffect(() => {
    mouthLevelRef.current = mouthLevel;
  }, [mouthLevel]);

  useEffect(() => {
    let frameId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const elapsed = Math.min((now - lastTime) / 16.67, 2);
      lastTime = now;

      setPosition((current) => {
        const stage = stageRef.current;
        if (!stage) return current;

        const rect = stage.getBoundingClientRect();
        const petWidth = Math.min(PET_WIDTH, Math.max(132, rect.width * 0.18));
        const petHeight = petWidth * (CELL_HEIGHT / CELL_WIDTH);
        const maxX = Math.max(0, rect.width - petWidth);
        const groundY = Math.max(
          0,
          rect.height - petHeight - FLOOR_OFFSET + PET_FOOT_ANCHOR_OFFSET,
        );
        const currentAction = actionRef.current;
        if (!current.grounded && current.y === 0 && current.vy === 0) {
          return {
            ...current,
            y: groundY,
            vx: 0,
            grounded: true,
          };
        }

        const voiceBoost = 1 + mouthLevelRef.current * 0.16;
        const isMovingHorizontally =
          currentAction === 'running' || currentAction === 'jumping';
        const targetSpeed =
          currentAction === 'running' ? RUN_SPEED * voiceBoost : 0;
        const direction = current.vx === 0 ? directionRef.current : current.vx >= 0 ? 1 : -1;
        let nextVx = current.vx;
        let nextVy = current.vy;
        let grounded = current.grounded || current.y >= groundY;

        if (
          isMovingHorizontally &&
          grounded &&
          now >= nextTurnAtRef.current
        ) {
          directionRef.current *= -1;
          nextTurnAtRef.current = now + 900 + Math.random() * 1600;
        }

        if (currentAction === 'review') {
          nextVx = 0;
        }

        if (currentAction === 'jumping' && grounded) {
          nextVy = JUMP_VELOCITY * voiceBoost;
          grounded = false;
          if (Math.abs(nextVx) < WALK_SPEED) {
            nextVx = direction * WALK_SPEED;
          }
        }

        if (grounded) {
          nextVx = isMovingHorizontally
            ? directionRef.current * Math.max(targetSpeed, WALK_SPEED)
            : nextVx * GROUND_FRICTION;
          if (!isMovingHorizontally && Math.abs(nextVx) < 0.05) {
            nextVx = 0;
          }
          nextVy = 0;
        } else {
          nextVy += GRAVITY * elapsed;
          if (isMovingHorizontally) {
            const airTarget = direction * Math.max(targetSpeed, WALK_SPEED);
            nextVx += (airTarget - nextVx) * AIR_CONTROL;
          }
        }

        let nextX = current.x + nextVx * elapsed;
        let nextY = current.y + nextVy * elapsed;

        if (nextX <= 0 || nextX >= maxX) {
          nextVx *= -1;
          directionRef.current *= -1;
          nextTurnAtRef.current = now + 900 + Math.random() * 1400;
          nextX = Math.min(Math.max(nextX, 0), maxX);
        }
        if (nextY >= groundY) {
          nextY = groundY;
          nextVy = 0;
          grounded = true;
        }
        if (nextY < 0) {
          nextY = 0;
          nextVy = 0;
        }

        return {
          x: nextX,
          y: nextY,
          vx: nextVx,
          vy: nextVy,
          grounded,
        };
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, []);

  return { stageRef, position };
}

function getSpriteBackgroundPosition(row: number, frame: number) {
  const x = (frame / (ATLAS_COLUMNS - 1)) * 100;
  const y = (row / (ATLAS_ROWS - 1)) * 100;
  return `${x}% ${y}%`;
}

export function PetStage(props: PetStageProps) {
  const defaultManifest = usePetManifest();
  const manifest = props.petManifest ?? defaultManifest;
  const action = usePetAction(props);
  const { stageRef, position } = usePetMovement(action, props.mouthLevel);
  const visibleAction = getMovementAction(action, position);
  const rawFrame = useSpriteFrame(visibleAction);
  const row = PET_ROWS[visibleAction];
  const frame = rawFrame % row.frames;
  const spritesheetUrl =
    props.petSpritesheetUrl ?? resolveSpritesheetUrl(manifest.spritesheetPath);

  return (
    <div className="pet-stage" ref={stageRef} aria-label="Pet stage">
      <div
        className={`pet-sprite pet-sprite-${visibleAction}`}
        role="img"
        aria-label={manifest.displayName || 'Codex Pet'}
        style={{
          backgroundImage: `url(${spritesheetUrl})`,
          backgroundPosition: getSpriteBackgroundPosition(row.row, frame),
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        }}
      />
    </div>
  );
}
