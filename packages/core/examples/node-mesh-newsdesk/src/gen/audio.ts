import { readFile, writeFile } from 'node:fs/promises';
import { runCommand } from './process.js';

export const SAMPLE_RATE = 48000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
// mouth analysis: short RMS windows so the dip between morae (~7/s) survives
const ENVELOPE_HOP_SEC = 0.01;
const ENVELOPE_WINDOW_SEC = 0.02;
/** Local range used to find the rise and fall of each mora. */
const SYLLABLE_SPAN_SEC = 0.07;
/** Below this share of the local peak-to-trough range a stretch counts as a held sound. */
const HELD_SOUND_RATIO = 0.3;

export interface DecodedAudio {
  samples: Float32Array;
  sampleRate: number;
  duration: number;
}

interface ChunkLocation {
  offset: number;
  size: number;
}

function writeString(buffer: Buffer, offset: number, value: string): void {
  buffer.write(value, offset, value.length, 'ascii');
}

function findChunk(buffer: Buffer, id: string): ChunkLocation | null {
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (chunkId === id) return { offset: offset + 8, size };
    offset += 8 + size + (size % 2);
  }
  return null;
}

function writeWavHeader(buffer: Buffer, dataSize: number, sampleRate: number) {
  writeString(buffer, 0, 'RIFF');
  buffer.writeUInt32LE(36 + dataSize, 4);
  writeString(buffer, 8, 'WAVE');
  writeString(buffer, 12, 'fmt ');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * CHANNELS * BYTES_PER_SAMPLE, 28);
  buffer.writeUInt16LE(CHANNELS * BYTES_PER_SAMPLE, 32);
  buffer.writeUInt16LE(16, 34);
  writeString(buffer, 36, 'data');
  buffer.writeUInt32LE(dataSize, 40);
}

/** Convert any ffmpeg-readable audio file to 48 kHz mono PCM16 WAV. */
export async function normalizeToWav(
  inputPath: string,
  outputPath: string,
): Promise<number> {
  await runCommand('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-i',
    inputPath,
    '-ac',
    '1',
    '-ar',
    String(SAMPLE_RATE),
    '-sample_fmt',
    's16',
    '-acodec',
    'pcm_s16le',
    outputPath,
  ]);
  return getWavDuration(outputPath);
}

/** Write float samples (-1..1) as a mono PCM16 WAV and return its duration. */
export async function writePcm16Wav(
  filePath: string,
  samples: Float32Array,
  sampleRate: number = SAMPLE_RATE,
): Promise<number> {
  const dataSize = samples.length * BYTES_PER_SAMPLE;
  const buffer = Buffer.alloc(44 + dataSize);
  writeWavHeader(buffer, dataSize, sampleRate);
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index]));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
  }
  await writeFile(filePath, buffer);
  return samples.length / sampleRate;
}

export async function writeSilenceWav(
  filePath: string,
  durationSec: number,
): Promise<number> {
  const frames = Math.max(0, Math.round(durationSec * SAMPLE_RATE));
  return writePcm16Wav(filePath, new Float32Array(frames));
}

async function readPcmData(filePath: string): Promise<Buffer> {
  const buffer = await readFile(filePath);
  if (
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    throw new Error(`Not a RIFF/WAVE file: ${filePath}`);
  }
  const fmt = findChunk(buffer, 'fmt ');
  const data = findChunk(buffer, 'data');
  if (!fmt || !data) throw new Error(`Invalid WAV file: ${filePath}`);
  const audioFormat = buffer.readUInt16LE(fmt.offset);
  const channels = buffer.readUInt16LE(fmt.offset + 2);
  const sampleRate = buffer.readUInt32LE(fmt.offset + 4);
  const bitsPerSample = buffer.readUInt16LE(fmt.offset + 14);
  if (
    audioFormat !== 1 ||
    channels !== 1 ||
    sampleRate !== SAMPLE_RATE ||
    bitsPerSample !== 16
  ) {
    throw new Error(`WAV must be 48kHz mono PCM16: ${filePath}`);
  }
  return buffer.subarray(data.offset, data.offset + data.size);
}

/** Concatenate 48 kHz mono PCM16 WAV files and return the total duration. */
export async function concatWavs(
  inputPaths: string[],
  outputPath: string,
): Promise<number> {
  const chunks: Buffer[] = [];
  for (const inputPath of inputPaths) chunks.push(await readPcmData(inputPath));
  const data = Buffer.concat(chunks);
  const buffer = Buffer.alloc(44 + data.length);
  writeWavHeader(buffer, data.length, SAMPLE_RATE);
  data.copy(buffer, 44);
  await writeFile(outputPath, buffer);
  return data.length / (SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE);
}

export async function getWavDuration(filePath: string): Promise<number> {
  const data = await readPcmData(filePath);
  return data.length / (SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE);
}

/** Decode a PCM WAV (8/16/24/32-bit, any channel count) to mono floats. */
export async function decodeWav(filePath: string): Promise<DecodedAudio> {
  const buffer = await readFile(filePath);
  const fmt = findChunk(buffer, 'fmt ');
  const dataChunk = findChunk(buffer, 'data');
  if (!fmt || !dataChunk) throw new Error(`Invalid WAV file: ${filePath}`);
  const audioFormat = buffer.readUInt16LE(fmt.offset);
  const channels = buffer.readUInt16LE(fmt.offset + 2);
  const sampleRate = buffer.readUInt32LE(fmt.offset + 4);
  const bitsPerSample = buffer.readUInt16LE(fmt.offset + 14);
  if (audioFormat !== 1 || ![8, 16, 24, 32].includes(bitsPerSample)) {
    throw new Error(`Unsupported WAV format: ${filePath}`);
  }
  const bytesPerSample = bitsPerSample / 8;
  const data = buffer.subarray(
    dataChunk.offset,
    dataChunk.offset + dataChunk.size,
  );
  const frameCount = Math.floor(data.length / (bytesPerSample * channels));
  const samples = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      const offset = (frame * channels + channel) * bytesPerSample;
      if (bytesPerSample === 1) sum += (data.readUInt8(offset) - 128) / 128;
      else if (bytesPerSample === 2) sum += data.readInt16LE(offset) / 32768;
      else if (bytesPerSample === 3) sum += data.readIntLE(offset, 3) / 8388608;
      else sum += data.readInt32LE(offset) / 2147483648;
    }
    samples[frame] = sum / channels;
  }
  return { samples, sampleRate, duration: frameCount / sampleRate };
}

/** RMS envelope of the samples, one value per `ENVELOPE_HOP_SEC`. */
export function createEnvelope(
  audio: Pick<DecodedAudio, 'samples' | 'sampleRate'>,
): Float32Array {
  const hop = Math.max(1, Math.round(audio.sampleRate * ENVELOPE_HOP_SEC));
  const half = Math.round((audio.sampleRate * ENVELOPE_WINDOW_SEC) / 2);
  const count = Math.ceil(audio.samples.length / hop);
  const envelope = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const center = i * hop + Math.floor(hop / 2);
    const start = Math.max(0, center - half);
    const end = Math.min(audio.samples.length, center + half);
    let sumSq = 0;
    for (let index = start; index < end; index += 1)
      sumSq += audio.samples[index] ** 2;
    envelope[i] = Math.sqrt(sumSq / Math.max(1, end - start));
  }
  return envelope;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))
  ];
}

/**
 * Derive a mouth-open value (0..1) per video frame.
 *
 * Loudness alone keeps the mouth open through a whole phrase: voices are loud
 * enough to sit at any fixed ceiling, and per-frame RMS with smoothing hides the
 * short dips between morae. So the envelope is taken every 10 ms, normalized to
 * the voice's own level (a high percentile of voiced windows instead of a fixed
 * ceiling), and each point is scaled by where it sits between the local trough
 * and peak: the mouth opens on each mora and closes in the dip before the next.
 * Held sounds (little local variation) keep the mouth open.
 */
export function createMouthValues(
  audio: Pick<DecodedAudio, 'samples' | 'sampleRate'>,
  fps: number,
  totalFrames: number,
): Float32Array {
  const envelope = createEnvelope(audio);
  const peak = envelope.reduce((max, v) => Math.max(max, v), 0);
  const values = new Float32Array(totalFrames);
  if (peak <= 1e-6) return values;
  const voiced = Array.from(envelope).filter((v) => v > peak * 0.08);
  const ceiling = Math.max(percentile(voiced, 0.9), peak * 0.2);
  const floor = ceiling * 0.08;
  const span = Math.max(1, Math.round(SYLLABLE_SPAN_SEC / ENVELOPE_HOP_SEC));
  const open = new Float32Array(envelope.length);
  for (let i = 0; i < envelope.length; i += 1) {
    let lo = Number.POSITIVE_INFINITY;
    let hi = 0;
    for (
      let k = Math.max(0, i - span);
      k <= Math.min(envelope.length - 1, i + span);
      k += 1
    ) {
      lo = Math.min(lo, envelope[k]);
      hi = Math.max(hi, envelope[k]);
    }
    const level = Math.min(
      1,
      Math.max(0, (envelope[i] - floor) / (ceiling - floor)),
    );
    const range = hi - lo;
    // (range is 0 in silence, where level is 0 anyway)
    const shape =
      range <= 1e-9 || range < hi * HELD_SOUND_RATIO
        ? 1
        : Math.max(0, (envelope[i] - lo) / range);
    open[i] = level * Math.sqrt(shape);
  }
  // one value per video frame: the mean of the 10 ms points it covers
  const perSecond = 1 / ENVELOPE_HOP_SEC;
  for (let frame = 0; frame < totalFrames; frame += 1) {
    const start = Math.floor((frame / fps) * perSecond);
    const end = Math.min(
      open.length,
      Math.max(start + 1, Math.floor(((frame + 1) / fps) * perSecond)),
    );
    let sum = 0;
    for (let i = start; i < end; i += 1) sum += open[i];
    values[frame] = end > start ? sum / (end - start) : 0;
  }
  return values;
}
