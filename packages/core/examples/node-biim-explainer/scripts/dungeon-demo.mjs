import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';

// All artwork is procedural and original. Pixel lettering avoids system fonts
// in the source footage, keeping hand-made replay requests reproducible.
const W = 1280;
const H = 756;
const FPS = 15;
const DURATION = 75;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const alphabet = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
};
function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function circle(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function label(text, x, y) {
  let cursor = x;
  for (const c of text) {
    const glyph = alphabet[c];
    if (!glyph) continue;
    glyph.forEach((row, py) => {
      Array.from(row).forEach((v, px) => {
        if (v === '1') rect(cursor + px * 4, y + py * 4, 4, 4, '#dbeff7');
      });
    });
    cursor += (glyph[0].length + 1) * 4;
  }
}
function pathAt(points, t) {
  const p = Math.max(0, Math.min(0.999999, t)) * (points.length - 1);
  const i = Math.floor(p);
  const f = p - i;
  return [
    points[i][0] + (points[i + 1][0] - points[i][0]) * f,
    points[i][1] + (points[i + 1][1] - points[i][1]) * f,
  ];
}
function player(x, y, t, flash = false) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(3, 3);
  const step = Math.sin(t * 12) > 0 ? 1 : -1;
  ctx.globalAlpha = 0.3;
  circle(0, 9, 10, '#000000');
  ctx.globalAlpha = 1;
  rect(-6, 3, 5, 7 + step, '#233448');
  rect(2, 3, 5, 7 - step, '#233448');
  rect(-8, -5, 16, 12, flash ? '#ffffff' : '#40c5c0');
  rect(-10, -2, 4, 8, '#ffd7a0');
  rect(7, -1, 4, 8, '#ffd7a0');
  rect(-7, -14, 14, 11, '#ffd7a0');
  rect(-8, -16, 16, 6, '#eb9c50');
  rect(-5, -10, 2, 2, '#1a2637');
  rect(3, -10, 2, 2, '#1a2637');
  rect(10, -6, 3, 13, '#e3eafa');
  rect(8, 5, 7, 2, '#ffe075');
  ctx.restore();
}
function chest(x, y) {
  rect(x - 28, y - 18, 56, 38, '#392f3a');
  rect(x - 24, y - 22, 48, 36, '#a76c44');
  rect(x - 26, y - 9, 52, 7, '#edb86c');
  rect(x - 4, y - 8, 8, 12, '#ffe6a3');
}
function key(x, y, t) {
  const offset = Math.sin(t * 3) * 5;
  circle(x, y + offset, 12, '#ffdb72');
  circle(x, y + offset, 5, '#4b4350');
  rect(x + 10, y - 3 + offset, 28, 6, '#ffdb72');
  rect(x + 28, y + offset, 6, 13, '#ffdb72');
}
function enemy(x, y, t, boss = false) {
  const s = boss ? 1.8 : 1;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3) * 4);
  ctx.scale(s, s);
  circle(0, 0, 30, '#c95e72');
  rect(-28, -5, 56, 29, '#a34461');
  rect(-18, -6, 12, 10, '#f9dca0');
  rect(6, -6, 12, 10, '#f9dca0');
  rect(-16, -4, 5, 7, '#2b253b');
  rect(9, -4, 5, 7, '#2b253b');
  rect(-13, 19, 26, 5, '#543345');
  ctx.restore();
}
function room(t, index) {
  const palettes = [
    ['#18293d', '#283b50', '#31465c'],
    ['#28283e', '#40394d', '#4d4459'],
    ['#26283c', '#3e3c51', '#49465c'],
    ['#182e34', '#2c4546', '#345052'],
    ['#2d233b', '#443249', '#513b55'],
  ];
  const [wall, a, b] = palettes[index];
  rect(0, 0, W, H, wall);
  for (let row = 0; row < 10; row++)
    for (let col = 0; col < 18; col++) {
      const x = 64 + col * 64;
      const y = 88 + row * 60;
      rect(x, y, 62, 58, (col + row) % 2 ? a : b);
      rect(x + 6, y + 5, 49, 2, '#ffffff06');
      if ((col * 7 + row * 11) % 9 === 0)
        rect(x + 17, y + 43, 18, 2, '#00000018');
    }
  rect(52, 76, 1176, 12, '#75908b');
  rect(52, 688, 1176, 12, '#111c2c');
  for (const x of [100, 1180]) {
    rect(x - 10, 100, 20, 42, '#211c2c');
    circle(x, 110, 24, '#ffbb4320');
    circle(x, 110, 10 + Math.sin(t * 9) * 2, '#ffcf75');
    circle(x, 108, 5, '#fff1c4');
  }
  rect(34, 24, 620, 48, '#101a2ce6');
  rect(34, 24, 4, 48, '#56c8c1');
  label(
    [
      'MOONWELL KEEP ENTRANCE',
      'TREASURE VAULT',
      'TRAP CORRIDOR',
      'OUTER PASSAGE',
      'WARDEN CHAMBER',
    ][index],
    54,
    34,
  );
  // Doors and masonry give the autoplay a readable spatial layout.
  rect(1188, 325, 45, 120, '#101a2c');
  rect(1194, 325, 10, 120, '#799eaa');
  for (let x = 260; x < 1060; x += 96) {
    rect(x, 176, 64, 60, '#192335');
    rect(x + 4, 176, 56, 8, '#627080');
    rect(x, 552, 64, 60, '#192335');
    rect(x + 4, 552, 56, 8, '#627080');
  }
}
function trap(x, y, active, blink) {
  rect(x - 30, y - 35, 60, 70, blink ? '#f7b94c' : '#20283c');
  rect(x - 26, y - 31, 52, 62, active ? '#75344b' : '#3c4657');
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = active ? '#f3929b' : '#74788a';
    ctx.beginPath();
    ctx.moveTo(x - 20 + i * 16, y + 14);
    ctx.lineTo(x - 13 + i * 16, y - (active ? 21 : 0));
    ctx.lineTo(x - 6 + i * 16, y + 14);
    ctx.fill();
  }
}
function render(t) {
  const index = t < 12 ? 0 : t < 28 ? 1 : t < 42 ? 2 : t < 58 ? 3 : 4;
  room(t, index);
  let pos;
  if (index === 0) {
    pos = pathAt(
      [
        [130, 390],
        [400, 390],
        [660, 350],
        [1120, 390],
      ],
      t / 12,
    );
  }
  if (index === 1) {
    chest(510, 310);
    if (t < 20) key(925, 390, t);
    pos =
      t < 20
        ? pathAt(
            [
              [130, 400],
              [500, 440],
              [925, 390],
            ],
            (t - 12) / 8,
          )
        : pathAt(
            [
              [925, 390],
              [1100, 400],
            ],
            (t - 20) / 8,
          );
    if (t > 20 && t < 21) circle(925, 370, (t - 20) * 75, '#ffe07560');
  }
  if (index === 2) {
    for (const x of [590, 750, 910])
      trap(x, 390, t < 34 || t > 39, Math.floor(t * 4) % 2 === 0);
    if (t < 32)
      pos = pathAt(
        [
          [130, 390],
          [420, 390],
          [590, 390],
        ],
        (t - 28) / 4,
      );
    else if (t < 34) {
      const f = (t - 32) / 2;
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        circle(
          590 + Math.cos(a) * f * 120,
          390 + Math.sin(a) * f * 100,
          6 * (1 - f),
          '#f98791',
        );
      }
    } else
      pos = pathAt(
        [
          [150, 390],
          [340, 390],
          [450, 390],
        ],
        (t - 34) / 8,
      );
  }
  if (index === 3) {
    enemy(810, 390, t);
    for (const x of [420, 500])
      trap(x, 390, t < 46, t >= 44 && t < 46 && Math.floor(t * 5) % 2 === 0);
    rect(660, 290, 22, 200, '#1b2a3a');
    rect(950, 290, 22, 200, '#1b2a3a');
    pos =
      t < 46
        ? [320, 390]
        : pathAt(
            [
              [320, 390],
              [570, 390],
              [600, 510],
              [1020, 510],
              [1120, 390],
            ],
            (t - 46) / 12,
          );
  }
  if (index === 4) {
    const attack = t >= 61 && t < 64;
    const recovery = t >= 64 && t < 68;
    if (t < 70) enemy(910, 390, t, true);
    if (attack) {
      rect(400, 365, 430, 50, '#e5676740');
      // Telegraph before the thrust so the sidestep visibly precedes impact.
      if (t >= 62) rect(530 + (t - 62) * 90, 382, 370, 16, '#e9b899');
      circle(890, 390, 90 + (t - 61) * 15, '#ffb37520');
    }
    pos =
      t < 61
        ? pathAt(
            [
              [150, 390],
              [600, 390],
            ],
            (t - 58) / 3,
          )
        : t < 64
          ? pathAt(
              [
                [600, 390],
                [580, 480],
                [750, 480],
              ],
              (t - 61) / 3,
            )
          : t < 70
            ? pathAt(
                [
                  [750, 480],
                  [850, 390],
                  [820, 450],
                  [890, 390],
                ],
                (t - 64) / 6,
              )
            : pathAt(
                [
                  [890, 390],
                  [1180, 390],
                ],
                (t - 70) / 5,
              );
    if (recovery) {
      ctx.strokeStyle = '#ffe4a0';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(875, 390, 60, (t - 64) * 4, (t - 64) * 4 + 1.7);
      ctx.stroke();
    }
    if (t >= 70) {
      rect(1188, 325, 45, 120, '#81ead2');
      for (let i = 0; i < 24; i++) {
        const p = (t - 70) * 30;
        circle(
          910 + Math.cos(i * 2.4) * p,
          390 + Math.sin(i * 2.4) * p,
          4,
          '#ffe2a0',
        );
      }
    }
  }
  if (pos) player(...pos, t, index === 4 && t >= 64 && t < 68);
  const vignette = ctx.createRadialGradient(640, 380, 200, 640, 380, 750);
  vignette.addColorStop(0, '#00000000');
  vignette.addColorStop(1, '#050e2470');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 76, W, H - 76);
}
await mkdir('work', { recursive: true });
const encoder = spawn(
  'ffmpeg',
  [
    '-y',
    '-v',
    'error',
    '-f',
    'rawvideo',
    '-pixel_format',
    'rgba',
    '-video_size',
    `${W}x${H}`,
    '-framerate',
    String(FPS),
    '-i',
    'pipe:0',
    '-map_metadata',
    '-1',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-threads',
    '1',
    '-movflags',
    '+faststart',
    'work/dungeon-demo.mp4',
  ],
  { stdio: ['pipe', 'ignore', 'pipe'] },
);
let error = '';
encoder.stderr.on('data', (chunk) => {
  error += chunk;
});
const finished = new Promise((resolve, reject) => {
  encoder.on('error', reject);
  encoder.on('close', (code) =>
    code === 0
      ? resolve()
      : reject(new Error(`Dungeon encode failed: ${error}`)),
  );
});
encoder.stdin.on('error', () => {});
try {
  for (let frame = 0; frame < FPS * DURATION; frame++) {
    render(frame / FPS);
    if (!encoder.stdin.write(Buffer.from(ctx.getImageData(0, 0, W, H).data)))
      await once(encoder.stdin, 'drain');
  }
  encoder.stdin.end();
  await finished;
} catch (e) {
  encoder.kill();
  throw e;
}
console.log(
  'Generated original 75-second dungeon video: work/dungeon-demo.mp4',
);
