/**
 * Headless-Chromium render harness. Node calls `window.load(config)` once and
 * then `window.renderFrame({ frame, mouth })` for every video frame, capturing
 * the `#stage` canvas after each call.
 */
import { buildTimeline, createSeededRandom } from '../src/shared/schedule.js';
import type { LineEmotion, RenderConfig, TimedLine } from '../src/types.js';
// the sibling React example's engine, bundled read-only (framework-free JS)
import {
  createMeshAvatar,
  type MeshAvatar,
} from '../../react-mesh-avatar-app/src/meshAvatar/createMeshAvatar.js';
import { AVATAR_FRAME, createScene, type Scene } from './scene.js';

interface HarnessState {
  config: RenderConfig;
  avatar: MeshAvatar;
  scene: Scene;
  avatarCanvas: HTMLCanvasElement;
  actions: ReturnType<typeof buildTimeline>['actions'];
  timeline: ReturnType<typeof buildTimeline>;
  nextAction: number;
  emotion: LineEmotion;
  emotionStart: number;
}

let state: HarnessState | null = null;

async function load(
  config: RenderConfig,
): Promise<{ lines: number; actions: number }> {
  // the avatar's own random choices (blinks, gaze, vowels) follow the script seed
  Math.random = createSeededRandom(config.seed);
  const avatarCanvas = document.querySelector<HTMLCanvasElement>('#avatar');
  const stage = document.querySelector<HTMLCanvasElement>('#stage');
  if (!avatarCanvas || !stage)
    throw new Error('Harness canvases were not found.');
  // the WebGL canvas has the size of the avatar frame on screen
  avatarCanvas.style.width = `${AVATAR_FRAME.w}px`;
  avatarCanvas.style.height = `${AVATAR_FRAME.h}px`;
  const avatar = await createMeshAvatar(avatarCanvas, {
    assetsBase: '/avatar/',
    manual: true,
    // bust shot: hide the image's flat top edge and crop the sides
    padTop: -0.07,
    padSide: -0.18,
  });
  avatar.setAutoIdle(false);
  avatar.setAutoMotion(false);
  // a newscaster moves less with the voice than a chatting avatar
  avatar.setTalkGain(0.55);
  avatar.advance(1.5); // settle springs and physics before frame 0

  const g = stage.getContext('2d');
  if (!g) throw new Error('2D context unavailable.');
  const timeline = buildTimeline(config.lines, config.duration, config.seed);
  state = {
    config,
    avatar,
    scene: createScene(g, config, timeline),
    avatarCanvas,
    actions: timeline.actions,
    timeline,
    nextAction: 0,
    emotion: 'neutral',
    emotionStart: 0,
  };
  return { lines: config.lines.length, actions: timeline.actions.length };
}

function activeLine(lines: TimedLine[], time: number): TimedLine | null {
  return (
    lines.find(
      (line) => line.spoken && time >= line.start && time < line.end,
    ) ?? null
  );
}

function renderFrame({ frame, mouth }: { frame: number; mouth: number }): void {
  if (!state) throw new Error('Call window.load before window.renderFrame.');
  const s = state;
  const dt = 1 / s.config.fps;
  const time = frame * dt;
  while (
    s.nextAction < s.actions.length &&
    s.actions[s.nextAction].time <= time
  ) {
    const { action } = s.actions[s.nextAction];
    if (action.type === 'emotion') {
      s.avatar.setEmotion(action.tag, { playMotion: false });
      if (action.tag !== s.emotion) {
        s.emotion = action.tag;
        s.emotionStart = time;
      }
    } else s.avatar.play(action.id);
    s.nextAction += 1;
  }
  const line = activeLine(s.config.lines, time);
  const lastLine =
    [...s.config.lines].reverse().find((l) => l.start <= time) ?? null;
  s.avatar.setSpeaking(Boolean(line));
  s.avatar.setVoiceLevel(line ? mouth : 0);
  s.avatar.advance(dt, s.config.fps);
  const chapter =
    s.timeline.chapters.find((c) => time >= c.start && time < c.end) ?? null;
  s.scene.draw(
    {
      time,
      mouth,
      line,
      lastLine,
      chapter,
      emotion: s.emotion,
      emotionStart: line ? s.emotionStart : lastLine ? lastLine.end : 0,
    },
    s.avatarCanvas,
  );
}

declare global {
  interface Window {
    load(config: RenderConfig): Promise<{ lines: number; actions: number }>;
    renderFrame(options: { frame: number; mouth: number }): void;
  }
}

window.load = load;
window.renderFrame = renderFrame;
