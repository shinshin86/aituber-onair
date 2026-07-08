import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { writePsdBuffer } from 'ag-psd';

const ROOT = resolve(import.meta.dirname, '..');
const DEFAULT_INPUT_DIR = resolve(ROOT, 'local-assets/doodle-parts');
const DEFAULT_OUTPUT = resolve(ROOT, 'public/avatar/sample.psd');
const CANVAS = { width: 1024, height: 1536 };
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const LAYERS = [
  { name: 'back hair', file: 'hairBack.png' },
  { name: 'topwear', file: 'topwear.png' },
  { name: 'face', file: 'face.png' },
  { name: 'mouth_open', file: 'mouth_open.png' },
  { name: 'eyewhite', file: 'eyewhite.png' },
  { name: 'eyelash', file: 'eyelash.png' },
  { name: 'irides', file: 'irides.png' },
  { name: 'front hair', file: 'hairFront.png' },
  { name: 'mouth_close', file: 'mouth_close.png' },
  { name: 'eye_close', file: 'eye_close.png' },
];

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
  if (!file.subarray(0, 8).equals(PNG_SIGNATURE)) {
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
      else if (filter !== 0) {
        throw new Error(`Unsupported PNG filter ${filter}`);
      }

      pixels[y * stride + x] = value;
    }
  }

  return { width, height, data: pixels };
}

function alphaBounds(image) {
  let left = image.width;
  let top = image.height;
  let right = 0;
  let bottom = 0;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }

  if (right <= left || bottom <= top) {
    throw new Error('Layer has no visible pixels.');
  }
  return { left, top, right, bottom };
}

function cropImage(image, bounds) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const from = ((bounds.top + y) * image.width + bounds.left) * 4;
    data.set(image.data.subarray(from, from + width * 4), y * width * 4);
  }

  return { width, height, data };
}

function createLayer(inputDir, spec) {
  const image = decodePng(resolve(inputDir, spec.file));
  if (image.width !== CANVAS.width || image.height !== CANVAS.height) {
    throw new Error(
      `${spec.file} is ${image.width}x${image.height}; expected ` +
        `${CANVAS.width}x${CANVAS.height}`,
    );
  }

  const bounds = alphaBounds(image);
  return {
    name: spec.name,
    left: bounds.left,
    top: bounds.top,
    right: bounds.right,
    bottom: bounds.bottom,
    imageData: cropImage(image, bounds),
  };
}

const inputDir = resolve(process.argv[2] || DEFAULT_INPUT_DIR);
const output = resolve(process.argv[3] || DEFAULT_OUTPUT);
const children = LAYERS.map((spec) => createLayer(inputDir, spec));
const psd = {
  width: CANVAS.width,
  height: CANVAS.height,
  children,
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, writePsdBuffer(psd, { noBackground: true }));
console.log(`Generated ${output} with ${children.length} layers`);
