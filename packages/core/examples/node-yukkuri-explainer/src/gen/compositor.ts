import {
  createCanvas,
  GlobalFonts,
  loadImage,
  type SKRSContext2D,
  type Image,
} from '@napi-rs/canvas';
import type { RenderConfig } from '../types.js';
import type { DecodedAudio } from './audio.js';
import { activeLine, buildMotion } from './motion.js';

const FONT = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';

function wrap(ctx: SKRSContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const character of Array.from(text)) {
    if (character === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    if (line && ctx.measureText(line + character).width > width) {
      lines.push(line);
      line = character;
    } else line += character;
  }
  if (line) lines.push(line);
  return lines;
}

/** Shrink to fit instead of clipping long Japanese subtitles or headings. */
function fittedText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  size: number,
  color: string,
  outlined = false,
): void {
  let lines: string[] = [];
  let actualSize = size;
  for (; actualSize >= 16; actualSize -= 2) {
    ctx.font = `bold ${actualSize}px ${FONT}`;
    lines = wrap(ctx, text, width);
    if (lines.length * actualSize * 1.35 <= height) break;
  }
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  lines.forEach((line, index) => {
    const baseline =
      y + height / 2 + (index - (lines.length - 1) / 2) * actualSize * 1.35;
    if (outlined) {
      ctx.strokeStyle = '#263240';
      ctx.lineWidth = 12;
      ctx.strokeText(line, x + width / 2, baseline);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.strokeText(line, x + width / 2, baseline);
    }
    ctx.fillStyle = color;
    ctx.fillText(line, x + width / 2, baseline);
  });
}

function box(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  radius = 24,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

export async function openCompositor(
  config: RenderConfig,
  audio: DecodedAudio,
) {
  if (
    process.env.YUKKURI_FONT_PATH &&
    !GlobalFonts.registerFromPath(process.env.YUKKURI_FONT_PATH, 'Noto Sans JP')
  )
    throw new Error(
      'Could not load YUKKURI_FONT_PATH. Choose a Japanese-capable font.',
    );
  const canvas = createCanvas(config.width, config.height);
  const ctx = canvas.getContext('2d');
  const images = new Map<string, Image>();
  for (const [id, speaker] of Object.entries(config.speakers))
    images.set(id, await loadImage(speaker.image));
  const slides = new Map<string, Image>();
  for (const line of config.lines) {
    if (line.slide && 'image' in line.slide && !slides.has(line.slide.image))
      slides.set(line.slide.image, await loadImage(line.slide.image));
  }
  const motion = buildMotion(config, audio);
  return {
    motion,
    renderFrame(frame: number) {
      if (
        !Number.isInteger(frame) ||
        frame < 0 ||
        frame >= Math.ceil(config.duration * config.fps)
      )
        throw new Error('Frame is outside the video timeline.');
      const time = frame / config.fps;
      const current = activeLine(config.lines, time);
      const history = config.lines.filter((line) => line.start <= time);
      const latest = history.at(-1);
      const chapterLine = history.findLast((line) => line.chapter);
      const chapterStart = chapterLine?.start ?? 0;
      const chapter = chapterLine?.chapter ?? config.show.title;
      const section = history.filter((line) => line.start >= chapterStart);
      const point =
        section.findLast((line) => line.point)?.point ??
        'ふたりで、ゆっくり解説';
      const slide = section.findLast((line) => line.slide)?.slide;
      const color = current
        ? config.speakers[current.speaker].subtitleColor
        : '#416d65';

      ctx.fillStyle = '#f4f0e5';
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = '#e9e3d3';
      for (let x = 24; x < 1920; x += 48)
        for (let y = 24; y < 1080; y += 48) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      box(ctx, 56, 34, 1808, 114, '#ffffff');
      fittedText(ctx, config.show.title, 90, 47, 1160, 88, 56, '#273f3b');
      fittedText(ctx, config.show.subtitle, 1290, 55, 530, 72, 28, '#52756b');

      box(ctx, 420, 190, 1080, 594, '#d6c9ab');
      box(ctx, 430, 200, 1060, 574, '#23443e', 18);
      fittedText(ctx, chapter, 470, 226, 980, 90, 46, '#fff8dc');
      box(ctx, 484, 331, 952, 4, '#b7d1bd', 2);
      if (slide && 'image' in slide) {
        const picture = slides.get(slide.image);
        if (picture) {
          const ratio = Math.min(900 / picture.width, 236 / picture.height);
          ctx.drawImage(
            picture,
            960 - (picture.width * ratio) / 2,
            356,
            picture.width * ratio,
            picture.height * ratio,
          );
        }
        fittedText(ctx, point, 480, 606, 960, 68, 38, '#ffffff');
      } else {
        fittedText(
          ctx,
          slide && 'text' in slide ? slide.text : point,
          490,
          365,
          940,
          240,
          64,
          '#ffffff',
        );
        if (slide) fittedText(ctx, point, 480, 610, 960, 64, 32, '#d5e7da');
      }
      const keywords = latest?.keywords ?? [];
      const chipWidth = Math.min(294, 940 / Math.max(1, keywords.length));
      keywords.forEach((keyword, index) => {
        const x =
          960 -
          (keywords.length * (chipWidth + 12)) / 2 +
          index * (chipWidth + 12);
        box(ctx, x, 700, chipWidth, 46, '#3d6256', 14);
        fittedText(ctx, keyword, x + 8, 701, chipWidth - 16, 42, 25, '#fff4b4');
      });

      for (const [id, speaker] of Object.entries(config.speakers)) {
        const pose = motion[id][frame];
        const x = speaker.position === 'left' ? 218 : 1702;
        const picture = images.get(id);
        if (!picture) throw new Error(`Image missing for speaker ${id}.`);
        ctx.fillStyle = '#cfc5ad';
        ctx.beginPath();
        ctx.ellipse(x, 822, 145, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(x, 834 + pose.y);
        ctx.rotate(pose.rotation);
        ctx.scale((speaker.mirror ? -1 : 1) * pose.scaleX, pose.scaleY);
        const ratio = Math.min(390 / picture.width, 420 / picture.height);
        ctx.drawImage(
          picture,
          (-picture.width * ratio) / 2,
          -picture.height * ratio,
          picture.width * ratio,
          picture.height * ratio,
        );
        ctx.restore();
        box(
          ctx,
          x - 148,
          840,
          296,
          52,
          current?.speaker === id ? speaker.subtitleColor : '#e4ddcc',
          26,
        );
        fittedText(
          ctx,
          speaker.name,
          x - 140,
          842,
          280,
          46,
          30,
          current?.speaker === id ? '#ffffff' : '#625c51',
        );
      }
      box(ctx, 56, 922, 1808, 128, '#ffffff');
      box(ctx, 56, 922, 10, 128, color, 5);
      if (current)
        fittedText(ctx, current.text, 96, 932, 1728, 106, 48, color, true);
      else
        fittedText(
          ctx,
          config.show.subtitle,
          96,
          932,
          1728,
          106,
          30,
          '#809088',
        );
      box(
        ctx,
        56,
        1064,
        1808 * Math.min(1, time / config.duration),
        4,
        '#416d65',
        2,
      );
      return {
        bytes: Buffer.from(
          ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        ),
        png: () => canvas.toBuffer('image/png'),
      };
    },
  };
}
