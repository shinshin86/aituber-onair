import path from 'node:path';
import {
  createCanvas,
  loadImage,
  type Image,
  type SKRSContext2D,
} from '@napi-rs/canvas';
import { loadAvatarStates, resolveImagePaths } from './gen/avatarStates.js';
import type { DecodedAudio } from './gen/audio.js';
import { activeLine, buildMotion } from './gen/motion.js';
import { effectPose } from './gen/effects.js';
import { STYLE, inner, layout, type Rect } from './layout.js';
import type { PreparedVideo } from './media.js';
import { FONT, initializeFonts, wrapText } from './subtitles.js';
import type { AvatarState, RenderConfig, TimedPanel } from './types.js';

function box(ctx: SKRSContext2D, rect: Rect) {
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, STYLE.radius);
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = STYLE.border;
  ctx.stroke();
}

function fitImage(ctx: SKRSContext2D, image: Image, rect: Rect, cover = false) {
  const factor = (cover ? Math.max : Math.min)(
    rect.w / image.width,
    rect.h / image.height,
  );
  const w = image.width * factor;
  const h = image.height * factor;
  ctx.drawImage(
    image,
    rect.x + (rect.w - w) / 2,
    rect.y + (rect.h - h) / 2,
    w,
    h,
  );
}

export function formatTimer(seconds: number): string {
  const ticks = Math.floor(Math.max(0, seconds) * 100 + 1e-6);
  return `${Math.floor(ticks / 360000)}:${String(Math.floor(ticks / 6000) % 60).padStart(2, '0')}:${String(Math.floor(ticks / 100) % 60).padStart(2, '0')}.${String(ticks % 100).padStart(2, '0')}`;
}

export function fitPanelText(
  items: { text: string; color?: string }[],
  width: number,
  height: number,
  size: number,
) {
  const measure = createCanvas(1, 1).getContext('2d');
  let fontSize = size;
  let rows: { text: string; color: string }[] = [];
  do {
    measure.font = `${fontSize}px ${FONT}`;
    let orphan = false;
    rows = items.flatMap((item) => {
      const paragraphs = item.text.split('\n').map((text) => ({
        text,
        rows: wrapText(text, width, fontSize),
      }));
      // Deliberate newlines (for example a short place name below a stage)
      // are not orphaned soft wraps.
      if (
        paragraphs.some(({ text, rows }) => {
          const last = rows.at(-1) ?? '';
          return (
            rows.length > 1 &&
            Array.from(text).length >= 7 &&
            (Array.from(last.replace(/[\p{P}\s]/gu, '')).length <= 3 ||
              measure.measureText(last).width < width * 0.28)
          );
        })
      )
        orphan = true;
      return paragraphs
        .flatMap(({ rows }) => rows)
        .map((text) => ({
          text,
          color: item.color === 'yellow' ? '#ffff00' : '#ffffff',
        }));
    });
    if (
      (rows.length * fontSize * STYLE.lineHeight <= height && !orphan) ||
      fontSize <= STYLE.minimumPanelSize
    )
      break;
    fontSize -= STYLE.panelSizeStep;
  } while (fontSize > 0);
  return { fontSize, rows };
}

export async function createCompositor(
  config: RenderConfig,
  narration: DecodedAudio,
  baseDir: string,
  videos: Map<number, PreparedVideo> = new Map(),
) {
  initializeFonts();
  const canvas = createCanvas(config.width, config.height);
  const ctx = canvas.getContext('2d');
  const ids = Object.keys(config.speakers);
  const geometry = layout(
    config.width,
    ids.length === 2,
    Boolean(
      config.counter ||
        config.timer?.position === 'right-bottom' ||
        config.panels.some((p) => p.box === 'bottom'),
    ),
  );
  const avatars: Record<string, Record<AvatarState, Image>> = Object.create(
    null,
  );
  const grayAvatars: Record<string, Record<AvatarState, Image>> = Object.create(
    null,
  );
  for (const id of ids)
    avatars[id] = await loadAvatarStates(
      resolveImagePaths(config.speakers[id].image, baseDir),
      id,
    );
  for (const id of ids) {
    grayAvatars[id] = Object.create(null);
    for (const state of Object.keys(avatars[id]) as AvatarState[]) {
      const original = avatars[id][state];
      const c = createCanvas(original.width, original.height);
      const g = c.getContext('2d');
      g.drawImage(original, 0, 0);
      const pixels = g.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const level = Math.round(
          pixels.data[i] * 0.2126 +
            pixels.data[i + 1] * 0.7152 +
            pixels.data[i + 2] * 0.0722,
        );
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = level;
      }
      g.putImageData(pixels, 0, 0);
      grayAvatars[id][state] = await loadImage(c.toBuffer('image/png'));
    }
  }
  const motion = buildMotion(config, narration);
  const images = new Map<string, Image>();
  const textLayouts = new Map<string, ReturnType<typeof fitPanelText>>();
  async function image(file: string) {
    const resolved = path.resolve(baseDir, file);
    let value = images.get(resolved);
    if (!value) {
      value = await loadImage(resolved);
      images.set(resolved, value);
    }
    return value;
  }
  // Only the most recent video frame stays resident; full video is decoded to disk.
  let videoFile = '';
  let videoImage: Image | undefined;
  async function panel(
    panel: TimedPanel | undefined,
    rect: Rect,
    size: number,
  ) {
    box(ctx, rect);
    if (!panel || panel.clear) return;
    if (panel.image) {
      fitImage(ctx, await image(panel.image), inner(rect));
      return;
    }
    const items = panel.items ?? [{ text: panel.text ?? '', color: 'white' }];
    const verticalPadding =
      rect.h <= STYLE.bottomHeight
        ? STYLE.bottomTextPadding
        : STYLE.textPadding;
    const key = JSON.stringify([items, rect.w, rect.h, size]);
    let fitted = textLayouts.get(key);
    if (!fitted) {
      fitted = fitPanelText(
        items,
        rect.w - STYLE.textPadding * 2,
        rect.h - verticalPadding * 2,
        size,
      );
      textLayouts.set(key, fitted);
    }
    const { fontSize, rows } = fitted;
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      rect.x + STYLE.border,
      rect.y + STYLE.border,
      rect.w - STYLE.border * 2,
      rect.h - STYLE.border * 2,
    );
    ctx.clip();
    ctx.font = `${fontSize}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const step = fontSize * STYLE.lineHeight;
    rows.forEach((row, i) => {
      ctx.fillStyle = row.color;
      ctx.fillText(
        row.text,
        rect.x + rect.w / 2,
        rect.y + rect.h / 2 + (i - (rows.length - 1) / 2) * step,
      );
    });
    ctx.restore();
  }
  return {
    geometry,
    async renderFrame(frame: number) {
      if (frame < 0 || frame >= Math.ceil(config.duration * config.fps))
        throw new Error('Frame outside timeline');
      const t = frame / config.fps;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, config.width, config.height);
      box(ctx, geometry.main);
      const rect = inner(geometry.main);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        STYLE.radius - STYLE.border,
      );
      ctx.clip();
      const clip = config.main.find((item) => t >= item.start && t < item.end);
      if (clip?.color) {
        ctx.fillStyle = clip.color;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      } else if (clip?.image)
        fitImage(ctx, await image(clip.image), rect, clip.fit === 'cover');
      else if (clip?.video) {
        const prepared = videos.get(clip.index);
        if (!prepared)
          throw new Error(`Video ${clip.index} has not been prepared`);
        const number =
          Math.min(
            prepared.frames - 1,
            Math.max(0, Math.floor((t - clip.start) * config.fps)),
          ) + 1;
        const file = path.join(
          prepared.directory,
          `${String(number).padStart(8, '0')}.png`,
        );
        if (file !== videoFile) {
          videoImage = await loadImage(file);
          videoFile = file;
        }
        if (videoImage)
          ctx.drawImage(videoImage, rect.x, rect.y, rect.w, rect.h);
      }
      ctx.restore();
      if (clip?.video && (clip.speed ?? 1) !== 1 && clip.speedBadge !== false) {
        const s = STYLE.badgeSize;
        ctx.font = `${s}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const label = `×${clip.speed}`;
        ctx.fillStyle = '#000000';
        ctx.fillRect(
          rect.x + STYLE.gap,
          rect.y + STYLE.gap,
          ctx.measureText(label).width + STYLE.gap,
          s * 1.4,
        );
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, rect.x + STYLE.gap * 1.5, rect.y + STYLE.gap);
      }
      const current = (region: TimedPanel['box']) =>
        config.panels.find(
          (p) => p.box === region && t >= p.start && t < p.end,
        );
      await panel(current('top'), geometry.top, STYLE.topSize);
      const mainPanel = current('main');
      await panel(
        mainPanel,
        geometry.middle,
        (mainPanel?.items?.length ?? 1) <= 2
          ? STYLE.panelSize
          : STYLE.densePanelSize,
      );
      if (config.counter) {
        const event = config.counter.events.find((e) => t >= e.at && t < e.end);
        await panel(
          event
            ? {
                at: 0,
                box: 'bottom',
                start: 0,
                end: config.duration,
                text: event.text ?? `${config.counter.label} ${event.value}`,
              }
            : undefined,
          geometry.bottom,
          STYLE.counterSize,
        );
      } else if (
        config.panels.some((p) => p.box === 'bottom') ||
        config.timer?.position === 'right-bottom'
      )
        await panel(current('bottom'), geometry.bottom, STYLE.counterSize);
      const timer = config.timer;
      if (timer && t >= timer.start) {
        const clock =
          timer.position === 'right-bottom'
            ? geometry.bottom
            : {
                x:
                  geometry.main.x +
                  geometry.main.w -
                  STYLE.timerWidth -
                  STYLE.margin,
                y:
                  geometry.main.y +
                  geometry.main.h -
                  STYLE.timerHeight -
                  STYLE.margin,
                w: STYLE.timerWidth,
                h: STYLE.timerHeight,
              };
        box(ctx, clock);
        ctx.font = `${STYLE.timerSize}px ${FONT}`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          formatTimer(
            Math.min(t, timer.stop) - timer.start + (timer.offset ?? 0),
          ),
          clock.x + clock.w / 2,
          clock.y + clock.h / 2,
        );
      }
      const line = activeLine(config.lines, t);
      box(ctx, geometry.bubble);
      const rightSpeaker = ids.length === 2 && line?.speaker === ids[1];
      const edge = rightSpeaker
        ? geometry.bubble.x + geometry.bubble.w
        : geometry.bubble.x;
      const y = geometry.bubble.y + geometry.bubble.h / 2;
      const direction = rightSpeaker ? 1 : -1;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = STYLE.border * 2;
      ctx.beginPath();
      ctx.moveTo(edge, y - STYLE.tail);
      ctx.lineTo(edge, y + STYLE.tail);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(edge, y - STYLE.tail);
      ctx.lineTo(edge + direction * STYLE.tail, y);
      ctx.lineTo(edge, y + STYLE.tail);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.lineWidth = STYLE.border;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      const page = line?.pages.find((p) => t >= p.start && t < p.end);
      if (page && line) {
        ctx.font = `${STYLE.subtitleSize}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = config.speakers[line.speaker].textColor ?? '#ffffff';
        page.rows.forEach((text, i) =>
          ctx.fillText(
            text,
            geometry.bubble.x + STYLE.textPadding,
            geometry.bubble.y +
              geometry.bubble.h / 2 +
              (i - (page.rows.length - 1) / 2) *
                STYLE.subtitleSize *
                STYLE.lineHeight,
          ),
        );
      }
      ids.forEach((id, index) => {
        const pose = motion[id][frame];
        const effect = effectPose(config.effects, id, t);
        const avatar = (effect.grayscale ? grayAvatars : avatars)[id][
          pose.state
        ];
        const size = STYLE.avatar;
        const scale = Math.min(size / avatar.width, size / avatar.height);
        const x = index === 1 ? config.width - size : 0;
        ctx.save();
        ctx.translate(
          x + size / 2 + effect.x,
          config.height + STYLE.avatarOverhang - size / 2 + pose.y + effect.y,
        );
        ctx.rotate(pose.rotation);
        ctx.scale(
          pose.scaleX * (config.speakers[id].mirror ? -1 : 1),
          pose.scaleY,
        );
        ctx.drawImage(
          avatar,
          (-avatar.width * scale) / 2,
          (-avatar.height * scale) / 2,
          avatar.width * scale,
          avatar.height * scale,
        );
        ctx.restore();
      });
      return {
        bytes: Buffer.from(
          ctx.getImageData(0, 0, config.width, config.height).data,
        ),
        png: () => canvas.toBuffer('image/png'),
      };
    },
  };
}
