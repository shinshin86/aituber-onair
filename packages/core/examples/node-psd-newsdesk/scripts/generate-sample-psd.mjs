import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { writePsdBuffer } from 'ag-psd';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_DIR = resolve(ROOT, '../react-pngtuber-app/public/avatar');
const OUTPUT = resolve(ROOT, 'assets/sample-static.psd');
const SAMPLE_SIZE = 512;
const DIFF_THRESHOLD = 12;
const LAYER_PADDING = 6;

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

function pixelDifference(a, b, index) {
  const alphaA = a.data[index + 3];
  const alphaB = b.data[index + 3];
  let difference = Math.abs(alphaA - alphaB);

  for (let channel = 0; channel < 3; channel += 1) {
    const premultipliedA = (a.data[index + channel] * alphaA) / 255;
    const premultipliedB = (b.data[index + channel] * alphaB) / 255;
    difference = Math.max(
      difference,
      Math.abs(premultipliedA - premultipliedB),
    );
  }

  return difference;
}

function differenceComponents(a, b) {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error('PNG state sizes must match.');
  }

  const changed = new Uint8Array(a.width * a.height);
  for (let pixel = 0; pixel < changed.length; pixel += 1) {
    changed[pixel] = pixelDifference(a, b, pixel * 4) >= DIFF_THRESHOLD ? 1 : 0;
  }

  const components = [];
  for (let start = 0; start < changed.length; start += 1) {
    if (changed[start] === 0) continue;

    const queue = [start];
    changed[start] = 0;
    let cursor = 0;
    let pixelCount = 0;
    let left = a.width;
    let top = a.height;
    let right = 0;
    let bottom = 0;

    while (cursor < queue.length) {
      const pixel = queue[cursor];
      cursor += 1;
      const x = pixel % a.width;
      const y = Math.floor(pixel / a.width);
      pixelCount += 1;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);

      for (
        let nextY = Math.max(0, y - 1);
        nextY <= Math.min(a.height - 1, y + 1);
        nextY += 1
      ) {
        for (
          let nextX = Math.max(0, x - 1);
          nextX <= Math.min(a.width - 1, x + 1);
          nextX += 1
        ) {
          const next = nextY * a.width + nextX;
          if (changed[next] !== 0) {
            changed[next] = 0;
            queue.push(next);
          }
        }
      }
    }

    components.push({ pixelCount, left, top, right, bottom });
  }

  return components.sort((first, second) =>
    second.pixelCount === first.pixelCount
      ? first.top - second.top || first.left - second.left
      : second.pixelCount - first.pixelCount,
  );
}

function featureBounds(a, b, componentCount) {
  const components = differenceComponents(a, b).slice(0, componentCount);
  if (components.length !== componentCount) {
    throw new Error('Not enough feature differences found between PNG states.');
  }

  return {
    left: Math.max(
      0,
      Math.min(...components.map((component) => component.left)) -
        LAYER_PADDING,
    ),
    top: Math.max(
      0,
      Math.min(...components.map((component) => component.top)) - LAYER_PADDING,
    ),
    right: Math.min(
      a.width,
      Math.max(...components.map((component) => component.right)) +
        LAYER_PADDING,
    ),
    bottom: Math.min(
      a.height,
      Math.max(...components.map((component) => component.bottom)) +
        LAYER_PADDING,
    ),
  };
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

const mouthBounds = featureBounds(mouthClosedEyesOpen, mouthOpenEyesOpen, 1);
const eyesBounds = featureBounds(mouthClosedEyesOpen, mouthClosedEyesClosed, 2);
const canvasBounds = {
  left: 0,
  top: 0,
  right: SAMPLE_SIZE,
  bottom: SAMPLE_SIZE,
};

const psd = {
  width: SAMPLE_SIZE,
  height: SAMPLE_SIZE,
  children: [
    layer('!body', mouthClosedEyesOpen, canvasBounds),
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
console.log('Generated assets/sample-static.psd from Miko PNGTuber states.');
