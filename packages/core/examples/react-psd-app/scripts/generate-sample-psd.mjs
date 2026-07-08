import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { writePsdBuffer } from 'ag-psd';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_DIR = resolve(ROOT, '../react-pngtuber-app/public/avatar');
const OUTPUT = resolve(ROOT, 'public/avatar/sample-static.psd');
const SAMPLE_SIZE = 512;

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

function decodePng(path) {
  const file = readFileSync(path);
  if (!file.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error(`Not a PNG file: ${path}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  const idatChunks = [];

  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.subarray(offset + 4, offset + 8).toString('ascii');
    const data = file.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      const interlace = data[12];
      if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
        throw new Error(`Unsupported PNG format in ${path}`);
      }
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const stride = width * 4;
  const pixels = new Uint8ClampedArray(width * height * 4);
  let input = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[input];
    input += 1;
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[input];
      input += 1;
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      let value = raw;

      if (filter === 1) value = (raw + left) & 0xff;
      else if (filter === 2) value = (raw + up) & 0xff;
      else if (filter === 3) value = (raw + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) value = (raw + paeth(left, up, upLeft)) & 0xff;
      else if (filter !== 0)
        throw new Error(`Unsupported PNG filter ${filter}`);

      pixels[y * stride + x] = value;
    }
  }

  return { width, height, data: pixels };
}

function resizeImage(image, targetWidth, targetHeight) {
  if (image.width === targetWidth && image.height === targetHeight) {
    return image;
  }

  const data = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const scaleX = image.width / targetWidth;
  const scaleY = image.height / targetHeight;

  for (let y = 0; y < targetHeight; y += 1) {
    const startY = Math.floor(y * scaleY);
    const endY = Math.max(startY + 1, Math.ceil((y + 1) * scaleY));
    for (let x = 0; x < targetWidth; x += 1) {
      const startX = Math.floor(x * scaleX);
      const endX = Math.max(startX + 1, Math.ceil((x + 1) * scaleX));
      const target = (y * targetWidth + x) * 4;
      const totals = [0, 0, 0, 0];
      let count = 0;

      for (let sourceY = startY; sourceY < endY; sourceY += 1) {
        for (let sourceX = startX; sourceX < endX; sourceX += 1) {
          const source = (sourceY * image.width + sourceX) * 4;
          totals[0] += image.data[source];
          totals[1] += image.data[source + 1];
          totals[2] += image.data[source + 2];
          totals[3] += image.data[source + 3];
          count += 1;
        }
      }

      data[target] = Math.round(totals[0] / count);
      data[target + 1] = Math.round(totals[1] / count);
      data[target + 2] = Math.round(totals[2] / count);
      data[target + 3] = Math.round(totals[3] / count);
    }
  }

  return { width: targetWidth, height: targetHeight, data };
}

function blankChangedPixels(base, open, eyesClosed, mouthOpen) {
  const body = new Uint8ClampedArray(base.data);
  for (let i = 0; i < body.length; i += 4) {
    const eyeChanged =
      base.data[i] !== eyesClosed.data[i] ||
      base.data[i + 1] !== eyesClosed.data[i + 1] ||
      base.data[i + 2] !== eyesClosed.data[i + 2] ||
      base.data[i + 3] !== eyesClosed.data[i + 3];
    const mouthChanged =
      base.data[i] !== mouthOpen.data[i] ||
      base.data[i + 1] !== mouthOpen.data[i + 1] ||
      base.data[i + 2] !== mouthOpen.data[i + 2] ||
      base.data[i + 3] !== mouthOpen.data[i + 3] ||
      open.data[i] !== mouthOpen.data[i] ||
      open.data[i + 1] !== mouthOpen.data[i + 1] ||
      open.data[i + 2] !== mouthOpen.data[i + 2] ||
      open.data[i + 3] !== mouthOpen.data[i + 3];

    if (eyeChanged || mouthChanged) {
      body[i + 3] = 0;
    }
  }
  return { width: base.width, height: base.height, data: body };
}

function diffBounds(a, b) {
  let left = a.width;
  let top = a.height;
  let right = 0;
  let bottom = 0;

  for (let y = 0; y < a.height; y += 1) {
    for (let x = 0; x < a.width; x += 1) {
      const i = (y * a.width + x) * 4;
      const changed =
        a.data[i] !== b.data[i] ||
        a.data[i + 1] !== b.data[i + 1] ||
        a.data[i + 2] !== b.data[i + 2] ||
        a.data[i + 3] !== b.data[i + 3];
      if (changed) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
    }
  }

  if (right <= left || bottom <= top) {
    throw new Error('No difference found between PNG states.');
  }

  return { left, top, right, bottom };
}

function crop(image, bounds) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const from = ((bounds.top + y) * image.width + bounds.left) * 4;
    const to = y * width * 4;
    data.set(image.data.subarray(from, from + width * 4), to);
  }

  return { data, width, height };
}

function layer(name, image, bounds, options = {}) {
  return {
    name,
    top: bounds.top,
    left: bounds.left,
    imageData: crop(image, bounds),
    ...options,
  };
}

const mouthClosedEyesOpen = resizeImage(
  decodePng(resolve(SOURCE_DIR, 'mouth_close_eyes_open.png')),
  SAMPLE_SIZE,
  SAMPLE_SIZE,
);
const mouthClosedEyesClosed = resizeImage(
  decodePng(resolve(SOURCE_DIR, 'mouth_close_eyes_close.png')),
  SAMPLE_SIZE,
  SAMPLE_SIZE,
);
const mouthOpenEyesOpen = resizeImage(
  decodePng(resolve(SOURCE_DIR, 'mouth_open_eyes_open.png')),
  SAMPLE_SIZE,
  SAMPLE_SIZE,
);
const mouthOpenEyesClosed = resizeImage(
  decodePng(resolve(SOURCE_DIR, 'mouth_open_eyes_close.png')),
  SAMPLE_SIZE,
  SAMPLE_SIZE,
);

const eyesBounds = diffBounds(mouthClosedEyesOpen, mouthClosedEyesClosed);
const mouthBounds = diffBounds(mouthClosedEyesOpen, mouthOpenEyesOpen);
const body = blankChangedPixels(
  mouthClosedEyesOpen,
  mouthOpenEyesOpen,
  mouthClosedEyesClosed,
  mouthOpenEyesClosed,
);

const psd = {
  width: mouthClosedEyesOpen.width,
  height: mouthClosedEyesOpen.height,
  children: [
    layer('!body', body, {
      left: 0,
      top: 0,
      right: body.width,
      bottom: body.height,
    }),
    {
      name: '目',
      opened: true,
      children: [
        layer('*開き', mouthClosedEyesOpen, eyesBounds),
        layer('*閉じ', mouthClosedEyesClosed, eyesBounds, { hidden: true }),
      ],
    },
    {
      name: '口',
      opened: true,
      children: [
        layer('*閉じ', mouthClosedEyesOpen, mouthBounds),
        layer('*開き', mouthOpenEyesOpen, mouthBounds, { hidden: true }),
      ],
    },
  ],
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, writePsdBuffer(psd, { noBackground: true }));
console.log(`Generated ${OUTPUT}`);
