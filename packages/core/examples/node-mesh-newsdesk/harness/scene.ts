/**
 * Draws one 1080x1920 newsdesk frame: animated background, header, news panel,
 * the avatar in its frame, keyword pop-ups, emotion effects, karaoke subtitles
 * and the ticker. Everything is a pure function of the time, so any frame can
 * be rendered on its own.
 */
import type {
  ChapterSpan,
  Popup,
  PointSpan,
  Timeline,
} from '../src/shared/schedule.js';
import { createSeededRandom } from '../src/shared/schedule.js';
import type { LineEmotion, RenderConfig, TimedLine } from '../src/types.js';

export const W = 1080;
export const H = 1920;

const FONT =
  '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
const C = {
  bg0: '#08080d',
  bg1: '#1b0b10',
  gold: '#e3b863',
  goldDeep: '#a8782f',
  red: '#d7263d',
  white: '#fbf7f0',
  dim: 'rgba(251,247,240,0.55)',
  panel: 'rgba(14,12,20,0.78)',
};

// layout
export const AVATAR_FRAME = { x: 44, y: 900, w: 660, h: 700, r: 28 };
const PANEL = { x: 44, y: 172, w: 992, h: 690, r: 28 };
const POP_COL = { x: 730, y: 900, w: 306, h: 520 };
const METER = { x: 730, y: 1440, w: 306, h: 160 };
const SUB = { y: 1628, h: 176 };
const TICKER = { y: 1822, h: 74 };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutBack = (x: number) => {
  const t = clamp01(x) - 1;
  return 1 + 2.4 * t * t * t + 1.4 * t * t;
};

function rounded(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Break text into lines that fit `width`, keeping closing punctuation attached. */
export function wrap(
  g: CanvasRenderingContext2D,
  text: string,
  width: number,
): string[] {
  const out: string[] = [];
  let line = '';
  for (const ch of Array.from(text)) {
    const next = line + ch;
    if (
      g.measureText(next).width > width &&
      line &&
      !/[、。！？」』）]/.test(ch)
    ) {
      out.push(line);
      line = ch;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

// ---------------------------------------------------------------------------

export interface SceneState {
  time: number;
  /** 0..1 voice level of this frame (drives the meter). */
  mouth: number;
  line: TimedLine | null;
  /** Most recent line (still shown during the pause after it). */
  lastLine: TimedLine | null;
  chapter: ChapterSpan | null;
  emotion: LineEmotion;
  emotionStart: number;
}

export interface Scene {
  draw(state: SceneState, avatar: HTMLCanvasElement): void;
}

export function createScene(
  g: CanvasRenderingContext2D,
  config: RenderConfig,
  timeline: Timeline,
): Scene {
  const random = createSeededRandom(config.seed ^ 0xface);
  const dust = Array.from({ length: 70 }, () => ({
    x: random() * W,
    y: random() * H,
    r: 0.8 + random() * 2.2,
    speed: 8 + random() * 26,
    phase: random() * Math.PI * 2,
  }));
  const sparkles = Array.from({ length: 14 }, () => ({
    x: random(),
    y: random() * 0.75,
    s: 10 + random() * 20,
    phase: random() * Math.PI * 2,
    rate: 1.5 + random() * 2.5,
  }));
  const bokeh = Array.from({ length: 10 }, () => ({
    x: random(),
    y: random(),
    r: 30 + random() * 70,
    speed: 0.02 + random() * 0.04,
    phase: random() * Math.PI * 2,
  }));
  const rain = Array.from({ length: 40 }, () => ({
    x: random(),
    y: random(),
    len: 20 + random() * 40,
    speed: 0.25 + random() * 0.35,
  }));
  const tickerText = `${timeline.chapters.map((c) => c.title).join('　◆　')}　◆　${config.show.title}　◆　`;

  // ----- background -----
  function background(t: number) {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, C.bg0);
    grad.addColorStop(0.55, '#120a10');
    grad.addColorStop(1, C.bg1);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // slow diagonal gold hairlines
    g.save();
    g.strokeStyle = 'rgba(227,184,99,0.07)';
    g.lineWidth = 2;
    const offset = (t * 22) % 90;
    for (let x = -H; x < W + H; x += 90) {
      g.beginPath();
      g.moveTo(x + offset, 0);
      g.lineTo(x + offset + H * 0.6, H);
      g.stroke();
    }
    g.restore();
    // drifting dust
    for (const d of dust) {
      const y = (((d.y - t * d.speed) % H) + H) % H;
      const a = 0.25 + 0.25 * Math.sin(t * 1.3 + d.phase);
      g.fillStyle = `rgba(227,184,99,${a.toFixed(3)})`;
      g.beginPath();
      g.arc(d.x + Math.sin(t * 0.4 + d.phase) * 10, y, d.r, 0, Math.PI * 2);
      g.fill();
    }
  }

  // ----- header -----
  function header(t: number) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, W, 140);
    // LIVE pill
    rounded(g, 44, 42, 150, 56, 28);
    g.fillStyle = C.red;
    g.fill();
    const blink = 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(t * Math.PI * 2 * 0.8));
    g.fillStyle = `rgba(255,255,255,${blink.toFixed(3)})`;
    g.beginPath();
    g.arc(78, 70, 11, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.white;
    g.font = `800 32px ${FONT}`;
    g.textBaseline = 'middle';
    g.fillText('LIVE', 100, 71);
    // title
    g.fillStyle = C.gold;
    g.font = `900 46px ${FONT}`;
    g.fillText(config.show.title, 222, 60);
    g.fillStyle = C.dim;
    g.font = `600 24px ${FONT}`;
    g.fillText(config.show.subtitle, 224, 106);
    // clock: advances with the video
    const [hh, mm] = config.show.clock.split(':').map(Number);
    const total = (hh * 60 + mm) * 60 + Math.floor(t);
    const clock = `${String(Math.floor(total / 3600) % 24).padStart(2, '0')}:${String(
      Math.floor(total / 60) % 60,
    ).padStart(2, '0')}`;
    g.textAlign = 'right';
    g.fillStyle = C.white;
    g.font = `800 44px ${FONT}`;
    g.fillText(clock, W - 44, 72);
    g.textAlign = 'left';
    // gold rule with a moving shimmer
    const y = 140;
    g.fillStyle = C.goldDeep;
    g.fillRect(0, y - 3, W, 3);
    const sx = ((t * 520) % (W + 400)) - 200;
    const shimmer = g.createLinearGradient(sx - 160, 0, sx + 160, 0);
    shimmer.addColorStop(0, 'rgba(255,240,200,0)');
    shimmer.addColorStop(0.5, 'rgba(255,240,200,0.95)');
    shimmer.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = shimmer;
    g.fillRect(0, y - 3, W, 3);
    g.restore();
  }

  // ----- news panel -----
  function panelContents(
    chapter: ChapterSpan,
    t: number,
    line: TimedLine | null,
    alpha: number,
  ) {
    const { x, y, w } = PANEL;
    const local = t - chapter.start;
    g.save();
    g.globalAlpha *= alpha;
    // watermark number
    g.fillStyle = 'rgba(227,184,99,0.07)';
    g.font = `900 300px ${FONT}`;
    g.textAlign = 'right';
    g.textBaseline = 'alphabetic';
    g.fillText(String(chapter.index + 1).padStart(2, '0'), x + w - 30, y + 330);
    g.textAlign = 'left';
    // TOPIC badge
    rounded(g, x + 40, y + 40, 196, 52, 10);
    g.fillStyle = C.red;
    g.fill();
    g.fillStyle = C.white;
    g.font = `800 28px ${FONT}`;
    g.textBaseline = 'middle';
    g.fillText(
      `TOPIC ${String(chapter.index + 1).padStart(2, '0')}`,
      x + 62,
      y + 67,
    );
    // headline: typewriter + marker
    g.font = `900 66px ${FONT}`;
    g.textBaseline = 'alphabetic';
    const chars = Array.from(chapter.title);
    const shown = chars
      .slice(0, Math.floor(clamp01(local / 0.9) * chars.length + 0.999))
      .join('');
    const lines = wrap(g, chapter.title, w - 90);
    let consumed = 0;
    lines.forEach((text, i) => {
      const ly = y + 180 + i * 84;
      const part = Array.from(text)
        .slice(0, Math.max(0, Array.from(shown).length - consumed))
        .join('');
      consumed += Array.from(text).length;
      // marker sweeps under the headline after it is typed
      const mw =
        g.measureText(text).width *
        smooth(0.9 + i * 0.15, 1.5 + i * 0.15, local);
      g.fillStyle = 'rgba(215,38,61,0.55)';
      g.fillRect(x + 44, ly - 18, mw, 22);
      g.fillStyle = C.white;
      g.fillText(part, x + 44, ly);
    });
    // bullet points of this chapter
    // the two most recent points fit above the rundown; older ones drop off
    const points = timeline.points
      .filter((p) => p.chapter === chapter.index && p.start <= t)
      .slice(-2);
    let py = y + 200 + lines.length * 84;
    for (const p of points) point(p, t, line, py);
    function point(
      p: PointSpan,
      time: number,
      current: TimedLine | null,
      top: number,
    ) {
      const k = easeOutBack((time - p.start) / 0.45);
      const active = current?.index === p.lineIndex;
      g.save();
      g.globalAlpha *= clamp01((time - p.start) / 0.25);
      g.translate((1 - k) * 120, 0);
      rounded(g, x + 40, top, w - 80, 86, 16);
      g.fillStyle = active ? 'rgba(227,184,99,0.2)' : 'rgba(255,255,255,0.05)';
      g.fill();
      g.fillStyle = active ? C.gold : 'rgba(227,184,99,0.35)';
      g.fillRect(x + 40, top, 10, 86);
      g.fillStyle = active ? C.white : C.dim;
      g.font = `${active ? 800 : 600} 38px ${FONT}`;
      g.textBaseline = 'middle';
      const text = wrap(g, p.text, w - 150)[0];
      g.fillText(text, x + 76, top + 45);
      g.restore();
      py += 104;
    }
    g.restore();
  }

  function panel(
    t: number,
    line: TimedLine | null,
    chapter: ChapterSpan | null,
  ) {
    const { x, y, w, h, r } = PANEL;
    const intro = smooth(0.6, 1.3, t);
    g.save();
    g.globalAlpha = intro;
    g.translate(0, (1 - intro) * 40);
    // card
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowBlur = 40;
    rounded(g, x, y, w, h, r);
    g.fillStyle = C.panel;
    g.fill();
    g.shadowBlur = 0;
    g.lineWidth = 3;
    g.strokeStyle = C.goldDeep;
    g.stroke();
    // corner accents
    g.strokeStyle = C.gold;
    g.lineWidth = 6;
    for (const [cx, cy, dx, dy] of [
      [x, y, 1, 1],
      [x + w, y, -1, 1],
      [x, y + h, 1, -1],
      [x + w, y + h, -1, -1],
    ]) {
      g.beginPath();
      g.moveTo(cx + dx * 60, cy);
      g.lineTo(cx, cy);
      g.lineTo(cx, cy + dy * 60);
      g.stroke();
    }
    rounded(g, x, y, w, h, r);
    g.clip();
    if (chapter) {
      // slide the new topic in, the old one out
      const change = timeline.transitions.find((tt) => t >= tt && t < tt + 0.9);
      if (change !== undefined) {
        const k = smooth(change, change + 0.9, t);
        const previous = timeline.chapters.find(
          (c) => c.index === chapter.index - 1,
        );
        if (previous) {
          g.save();
          g.translate(-k * w, 0);
          panelContents(previous, t, line, 1 - k);
          g.restore();
        }
        g.save();
        g.translate((1 - k) * w, 0);
        panelContents(chapter, t, line, k);
        g.restore();
      } else panelContents(chapter, t, line, 1);
    }
    rundown(t, chapter);
    g.restore();
  }

  // program lineup at the bottom of the panel + progress through the show
  function rundown(t: number, current: ChapterSpan | null) {
    const { x, y, w, h } = PANEL;
    const top = y + h - 150;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(x, top - 20, w, 170);
    g.fillStyle = 'rgba(227,184,99,0.75)';
    g.font = `800 22px ${FONT}`;
    g.textBaseline = 'alphabetic';
    g.fillText('RUNDOWN', x + 40, top + 10);
    const n = Math.max(1, timeline.chapters.length);
    const gap = 14;
    const pw = (w - 80 - gap * (n - 1)) / n;
    timeline.chapters.forEach((c, i) => {
      const px = x + 40 + i * (pw + gap);
      const active = current?.index === c.index;
      const done = current ? c.index < current.index : false;
      rounded(g, px, top + 26, pw, 64, 12);
      g.fillStyle = active
        ? C.gold
        : done
          ? 'rgba(227,184,99,0.18)'
          : 'rgba(255,255,255,0.06)';
      g.fill();
      if (active) {
        // a light sweeping across the current topic
        const sx = px + (((t * 0.6) % 1.4) - 0.2) * pw;
        const shine = g.createLinearGradient(sx - 60, 0, sx + 60, 0);
        shine.addColorStop(0, 'rgba(255,255,255,0)');
        shine.addColorStop(0.5, 'rgba(255,255,255,0.45)');
        shine.addColorStop(1, 'rgba(255,255,255,0)');
        g.save();
        rounded(g, px, top + 26, pw, 64, 12);
        g.clip();
        g.fillStyle = shine;
        g.fillRect(px, top + 26, pw, 64);
        g.restore();
      }
      g.fillStyle = active ? '#1a0d0d' : done ? C.dim : 'rgba(251,247,240,0.4)';
      let size = 28;
      g.font = `800 ${size}px ${FONT}`;
      const label = `${i + 1}. ${c.title}`;
      while (g.measureText(label).width > pw - 24 && size > 16) {
        size -= 2;
        g.font = `800 ${size}px ${FONT}`;
      }
      g.textBaseline = 'middle';
      g.fillText(label, px + 12, top + 59);
    });
    // program progress
    const progress = clamp01(t / config.duration);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.fillRect(x + 40, top + 108, w - 80, 8);
    g.fillStyle = C.red;
    g.fillRect(x + 40, top + 108, (w - 80) * progress, 8);
    g.fillStyle = C.white;
    g.beginPath();
    g.arc(x + 40 + (w - 80) * progress, top + 112, 9, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // voice meter: bars that follow the narration level
  const levels: number[] = new Array(24).fill(0);
  function meter(state: SceneState) {
    const { x, y, w, h } = METER;
    levels.shift();
    levels.push(state.line ? state.mouth : 0);
    g.save();
    rounded(g, x, y, w, h, 20);
    g.fillStyle = 'rgba(14,12,20,0.78)';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = C.goldDeep;
    g.stroke();
    g.fillStyle = state.line ? C.red : 'rgba(255,255,255,0.3)';
    g.beginPath();
    g.arc(x + 26, y + 30, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = state.line ? C.white : C.dim;
    g.font = `800 22px ${FONT}`;
    g.textBaseline = 'middle';
    g.fillText(state.line ? 'SPEAKING' : 'STANDBY', x + 44, y + 31);
    const bw = (w - 40) / levels.length;
    levels.forEach((v, i) => {
      const bh =
        6 + v * (h - 70) * (0.75 + 0.25 * Math.sin(i * 1.7 + state.time * 9));
      const bx = x + 20 + i * bw;
      const grad = g.createLinearGradient(0, y + h - 18 - bh, 0, y + h - 18);
      grad.addColorStop(0, '#fff0c2');
      grad.addColorStop(1, C.goldDeep);
      g.fillStyle = grad;
      g.fillRect(bx + 1, y + h - 18 - bh, bw - 3, bh);
    });
    g.restore();
  }

  // ----- avatar frame + emotion effects -----
  function avatarFrame(state: SceneState, avatar: HTMLCanvasElement) {
    const { x, y, w, h, r } = AVATAR_FRAME;
    const t = state.time;
    const since = t - state.emotionStart;
    const intro = smooth(0.2, 1.0, t);
    // camera: push in a little on strong lines, shake on surprise
    const strong =
      state.line && ['surprised', 'happy', 'angry'].includes(state.emotion);
    const zoom =
      1 +
      (strong ? 0.07 * smooth(0, 1.2, since) : 0) +
      0.015 * Math.sin(t * 0.5);
    const shake =
      state.emotion === 'surprised' && since < 0.6
        ? (1 - since / 0.6) * 12 * Math.sin(since * 70)
        : 0;
    g.save();
    g.globalAlpha = intro;
    g.translate(shake, (1 - intro) * 60);
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowBlur = 40;
    rounded(g, x, y, w, h, r);
    g.fillStyle = '#0d0a0f';
    g.fill();
    g.shadowBlur = 0;
    g.save();
    rounded(g, x, y, w, h, r);
    g.clip();
    // glow + rotating light rays behind the avatar
    const glow = g.createRadialGradient(
      x + w / 2,
      y + h * 0.42,
      40,
      x + w / 2,
      y + h * 0.42,
      w * 0.8,
    );
    const glowColor =
      state.emotion === 'sad'
        ? '60,90,160'
        : state.emotion === 'angry'
          ? '200,40,40'
          : state.emotion === 'relaxed'
            ? '60,160,140'
            : '180,60,50';
    glow.addColorStop(0, `rgba(${glowColor},0.55)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow;
    g.fillRect(x, y, w, h);
    g.save();
    g.translate(x + w / 2, y + h * 0.42);
    g.rotate(t * 0.12);
    g.fillStyle = 'rgba(227,184,99,0.06)';
    for (let i = 0; i < 12; i++) {
      g.rotate(Math.PI / 6);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w, -40);
      g.lineTo(w, 40);
      g.closePath();
      g.fill();
    }
    g.restore();
    // avatar (the WebGL canvas has the same size as the frame)
    const fx = x + w * 0.47;
    const fy = y + h * 0.36;
    g.save();
    g.translate(fx, fy);
    g.scale(zoom, zoom);
    g.translate(-fx, -fy);
    g.drawImage(avatar, x, y, w, h);
    g.restore();
    emotionEffects(state, since);
    // bottom fade into the frame
    const fade = g.createLinearGradient(0, y + h - 120, 0, y + h);
    fade.addColorStop(0, 'rgba(13,10,15,0)');
    fade.addColorStop(1, 'rgba(13,10,15,0.85)');
    g.fillStyle = fade;
    g.fillRect(x, y + h - 120, w, 120);
    g.restore();
    // frame border + ON AIR tag
    rounded(g, x, y, w, h, r);
    g.lineWidth = 4;
    g.strokeStyle = C.gold;
    g.stroke();
    rounded(g, x + 24, y + 22, 150, 44, 10);
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fill();
    g.fillStyle = C.red;
    g.beginPath();
    g.arc(x + 46, y + 44, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.white;
    g.font = `800 24px ${FONT}`;
    g.textBaseline = 'middle';
    g.fillText('ON AIR', x + 62, y + 45);
    g.restore();
  }

  function emotionEffects(state: SceneState, since: number) {
    const { x, y, w, h } = AVATAR_FRAME;
    const t = state.time;
    const on = state.line ? smooth(0, 0.4, since) : 1 - smooth(0, 0.6, since);
    if (on <= 0.01) return;
    g.save();
    g.globalAlpha = on;
    switch (state.emotion) {
      case 'happy':
        for (const s of sparkles) {
          const a = Math.max(0, Math.sin(t * s.rate + s.phase));
          star(
            x + s.x * w,
            y + s.y * h,
            s.s * (0.6 + 0.6 * a),
            `rgba(255,236,170,${(a * 0.95).toFixed(3)})`,
          );
        }
        break;
      case 'surprised': {
        // speed lines + "!" burst
        const k = smooth(0, 0.25, since);
        g.strokeStyle = `rgba(255,255,255,${(0.5 * (1 - smooth(0.3, 1.2, since))).toFixed(3)})`;
        g.lineWidth = 4;
        for (let i = 0; i < 28; i++) {
          const a = (i / 28) * Math.PI * 2;
          const r0 = w * 0.55;
          g.beginPath();
          g.moveTo(
            x + w / 2 + Math.cos(a) * r0,
            y + h * 0.4 + Math.sin(a) * r0,
          );
          g.lineTo(
            x + w / 2 + Math.cos(a) * r0 * 1.6,
            y + h * 0.4 + Math.sin(a) * r0 * 1.6,
          );
          g.stroke();
        }
        const s = easeOutBack(since / 0.35);
        g.save();
        g.translate(x + w - 110, y + 150);
        g.rotate(0.2);
        g.scale(s * k, s * k);
        burst(0, 0, 70, C.red);
        g.fillStyle = C.white;
        g.font = `900 92px ${FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('！', 0, 4);
        g.restore();
        break;
      }
      case 'sad':
        g.fillStyle = 'rgba(40,70,140,0.22)';
        g.fillRect(x, y, w, h);
        g.strokeStyle = 'rgba(170,200,255,0.35)';
        g.lineWidth = 2;
        for (const d of rain) {
          const yy = y + ((d.y + t * d.speed) % 1) * h;
          g.beginPath();
          g.moveTo(x + d.x * w, yy);
          g.lineTo(x + d.x * w - 6, yy + d.len);
          g.stroke();
        }
        break;
      case 'angry': {
        const pulse = 0.5 + 0.5 * Math.sin(t * 7);
        const v = g.createRadialGradient(
          x + w / 2,
          y + h / 2,
          w * 0.35,
          x + w / 2,
          y + h / 2,
          w * 0.8,
        );
        v.addColorStop(0, 'rgba(215,38,61,0)');
        v.addColorStop(
          1,
          `rgba(215,38,61,${(0.35 + 0.25 * pulse).toFixed(3)})`,
        );
        g.fillStyle = v;
        g.fillRect(x, y, w, h);
        angerMark(x + w - 130, y + 160, 44 + pulse * 8);
        break;
      }
      case 'relaxed':
        for (const b of bokeh) {
          const yy = y + ((((b.y - t * b.speed) % 1) + 1) % 1) * h;
          const a = 0.1 + 0.08 * Math.sin(t + b.phase);
          g.fillStyle = `rgba(150,230,210,${a.toFixed(3)})`;
          g.beginPath();
          g.arc(x + b.x * w, yy, b.r, 0, Math.PI * 2);
          g.fill();
        }
        break;
      default:
        break;
    }
    g.restore();
  }

  function star(cx: number, cy: number, s: number, color: string) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(cx, cy - s);
    g.quadraticCurveTo(cx, cy, cx + s, cy);
    g.quadraticCurveTo(cx, cy, cx, cy + s);
    g.quadraticCurveTo(cx, cy, cx - s, cy);
    g.quadraticCurveTo(cx, cy, cx, cy - s);
    g.fill();
  }

  function burst(cx: number, cy: number, r: number, color: string) {
    g.fillStyle = color;
    g.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const rr = i % 2 ? r * 0.72 : r;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  }

  function angerMark(cx: number, cy: number, s: number) {
    g.save();
    g.translate(cx, cy);
    g.strokeStyle = C.red;
    g.lineWidth = 10;
    g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      g.rotate(Math.PI / 2);
      g.beginPath();
      g.moveTo(s * 0.25, -s * 0.9);
      g.quadraticCurveTo(s * 0.25, -s * 0.25, s * 0.9, -s * 0.25);
      g.stroke();
    }
    g.restore();
  }

  // ----- keyword pop-ups -----
  function popups(t: number) {
    const { x, y, w, h } = POP_COL;
    const slotH = h / 3;
    g.save();
    g.fillStyle = 'rgba(227,184,99,0.5)';
    g.font = `800 22px ${FONT}`;
    g.textBaseline = 'alphabetic';
    g.globalAlpha = smooth(0.8, 1.4, t);
    g.fillText('KEY POINT', x + 8, y + 22);
    g.restore();
    for (const p of timeline.popups) {
      if (t < p.start || t > p.end) continue;
      popup(p, t, x, y + 36 + p.slot * slotH, w, slotH - 44);
    }
  }

  function popup(
    p: Popup,
    t: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const k = easeOutBack((t - p.start) / 0.4);
    const out = 1 - smooth(p.end - 0.35, p.end, t);
    g.save();
    g.globalAlpha = clamp01((t - p.start) / 0.15) * out;
    g.translate(x + w / 2, y + h / 2);
    g.scale(k, k);
    g.rotate((1 - clamp01((t - p.start) / 0.4)) * -0.2);
    g.shadowColor = 'rgba(227,184,99,0.55)';
    g.shadowBlur = 26 + 12 * Math.sin(t * 5);
    rounded(g, -w / 2, -h / 2, w, h, 20);
    const bg = g.createLinearGradient(0, -h / 2, 0, h / 2);
    bg.addColorStop(0, '#2a1a12');
    bg.addColorStop(1, '#140c0c');
    g.fillStyle = bg;
    g.fill();
    g.shadowBlur = 0;
    g.lineWidth = 4;
    g.strokeStyle = C.gold;
    g.stroke();
    // text: as large as fits
    const isNumber = /\d/.test(p.text);
    let size = isNumber ? 80 : 56;
    g.font = `900 ${size}px ${FONT}`;
    while (g.measureText(p.text).width > w - 40 && size > 26) {
      size -= 4;
      g.font = `900 ${size}px ${FONT}`;
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const grad = g.createLinearGradient(0, -size / 2, 0, size / 2);
    grad.addColorStop(0, '#fff3cf');
    grad.addColorStop(1, C.gold);
    g.fillStyle = grad;
    g.fillText(p.text, 0, 4);
    g.restore();
  }

  // ----- subtitles -----
  function subtitles(state: SceneState) {
    const t = state.time;
    const line = state.line ?? state.lastLine;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.62)';
    g.fillRect(0, SUB.y, W, SUB.h);
    g.fillStyle = C.goldDeep;
    g.fillRect(0, SUB.y, W, 3);
    if (line && t < line.end + 0.6) {
      const appear = smooth(line.start - 0.1, line.start + 0.15, t);
      const fadeOut = 1 - smooth(line.end + 0.3, line.end + 0.6, t);
      g.globalAlpha = appear * fadeOut;
      g.font = `800 50px ${FONT}`;
      g.textBaseline = 'middle';
      const rows = wrap(g, line.text, W - 120).slice(0, 2);
      const total = Array.from(line.text).length;
      const progress =
        clamp01((t - line.start) / Math.max(0.3, line.end - line.start)) *
        total;
      let index = 0;
      rows.forEach((row, r) => {
        let cx = 60;
        const cy =
          SUB.y +
          (rows.length === 1 ? SUB.h / 2 : 52 + r * 72) +
          (1 - appear) * 12;
        for (const ch of Array.from(row)) {
          const spoken = index < progress;
          g.fillStyle = spoken ? '#ffe7a3' : 'rgba(255,255,255,0.78)';
          g.fillText(ch, cx, cy);
          cx += g.measureText(ch).width;
          index += 1;
        }
      });
    }
    g.restore();
  }

  // ----- ticker -----
  function ticker(t: number) {
    const { y, h } = TICKER;
    g.save();
    g.fillStyle = C.red;
    g.fillRect(0, y, W, h);
    g.save();
    g.beginPath();
    g.rect(190, y, W - 190, h);
    g.clip();
    g.fillStyle = C.white;
    g.font = `700 34px ${FONT}`;
    g.textBaseline = 'middle';
    const tw = g.measureText(tickerText).width;
    let tx = W - ((t * 170) % tw);
    while (tx > 190 - tw) tx -= tw;
    for (let xx = tx; xx < W; xx += tw)
      g.fillText(tickerText, xx, y + h / 2 + 2);
    g.restore();
    g.fillStyle = '#0c0c10';
    g.fillRect(0, y, 190, h);
    g.fillStyle = C.gold;
    g.font = `900 34px ${FONT}`;
    g.textBaseline = 'middle';
    g.fillText('NEWS', 40, y + h / 2 + 2);
    g.beginPath();
    g.moveTo(170, y);
    g.lineTo(190, y + h / 2);
    g.lineTo(170, y + h);
    g.fillStyle = '#0c0c10';
    g.fill();
    g.restore();
  }

  // ----- topic cut-in and opening / closing cards -----
  function cutIn(t: number) {
    for (const start of timeline.transitions) {
      const local = t - start;
      if (local < 0 || local > 1.1) continue;
      const band = smooth(0, 0.35, local) - smooth(0.75, 1.1, local);
      g.save();
      g.globalAlpha = band;
      g.translate(W / 2, PANEL.y + PANEL.h / 2);
      g.rotate(-0.08);
      const slide =
        (1 - smooth(0, 0.35, local)) * -W + smooth(0.75, 1.1, local) * W;
      g.translate(slide, 0);
      g.fillStyle = C.gold;
      g.fillRect(-W, -70, W * 2, 140);
      g.fillStyle = C.red;
      g.fillRect(-W, -70, W * 2, 12);
      g.fillRect(-W, 58, W * 2, 12);
      g.fillStyle = '#1a0d0d';
      g.font = `900 84px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('NEXT TOPIC ▶', 0, 6);
      g.restore();
    }
  }

  function titleCard(t: number) {
    const outroStart = config.duration - 1.2;
    const intro = 1 - smooth(0.35, 0.95, t);
    const outro = smooth(outroStart, outroStart + 0.6, t);
    const k = Math.max(intro, outro);
    if (k <= 0.001) return;
    g.save();
    g.globalAlpha = k;
    g.fillStyle = 'rgba(8,8,13,0.92)';
    g.fillRect(0, 0, W, H);
    const bar = (outro > intro ? outro : 1) * W;
    g.fillStyle = C.gold;
    g.fillRect((W - bar) / 2, H / 2 - 110, bar, 6);
    g.fillRect((W - bar) / 2, H / 2 + 104, bar, 6);
    g.fillStyle = C.white;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 84px ${FONT}`;
    g.fillText(config.show.title, W / 2, H / 2 - 10);
    g.fillStyle = C.gold;
    g.font = `700 36px ${FONT}`;
    g.fillText(
      outro > intro ? 'SEE YOU NEXT TIME' : config.show.subtitle,
      W / 2,
      H / 2 + 62,
    );
    g.restore();
  }

  return {
    draw(state, avatar) {
      const t = state.time;
      background(t);
      header(t);
      panel(t, state.line, state.chapter);
      avatarFrame(state, avatar);
      popups(t);
      meter(state);
      subtitles(state);
      ticker(t);
      cutIn(t);
      titleCard(t);
    },
  };
}
