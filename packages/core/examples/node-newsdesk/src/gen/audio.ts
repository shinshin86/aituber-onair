import { readFile, writeFile } from 'node:fs/promises';
import { runCommand } from './process.js';

export const SAMPLE_RATE = 48000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
const SMOOTH_FACTOR = 0.5;
const RMS_CEILING = 0.12;

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

/**
 * Derive a normalized (0..1) mouth-open value per video frame from the RMS
 * level of the audio within that frame, lightly smoothed across frames.
 */
export function createMouthValues(
  audio: Pick<DecodedAudio, 'samples' | 'sampleRate'>,
  fps: number,
  totalFrames: number,
): Float32Array {
  const values = new Float32Array(totalFrames);
  let smoothed = 0;
  for (let frame = 0; frame < totalFrames; frame += 1) {
    const start = Math.floor((frame / fps) * audio.sampleRate);
    const end = Math.min(
      audio.samples.length,
      Math.floor(((frame + 1) / fps) * audio.sampleRate),
    );
    let sumSq = 0;
    for (let index = start; index < end; index += 1)
      sumSq += audio.samples[index] ** 2;
    const rms = Math.sqrt(sumSq / Math.max(1, end - start));
    smoothed = smoothed * SMOOTH_FACTOR + rms * (1 - SMOOTH_FACTOR);
    values[frame] = Math.min(smoothed / RMS_CEILING, 1);
  }
  return values;
}
