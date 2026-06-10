import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPcm16Wav,
  float32ToPcm16Wav,
  getAudioFormat,
  getWavDataOffset,
  parseWavHeader,
  STANDARD_WAV_HEADER_SIZE,
} from '../src/utils/wavHeader';

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index++) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function createWavBuffer(
  options: {
    includeFmt?: boolean;
    includeData?: boolean;
    includeJunk?: boolean;
    riff?: string;
    wave?: string;
  } = {},
): ArrayBuffer {
  const {
    includeFmt = true,
    includeData = true,
    includeJunk = false,
    riff = 'RIFF',
    wave = 'WAVE',
  } = options;
  const chunksSize =
    (includeJunk ? 12 : 0) + (includeFmt ? 24 : 0) + (includeData ? 32 : 0);
  const buffer = new ArrayBuffer(12 + chunksSize);
  const view = new DataView(buffer);
  let offset = 12;

  writeAscii(view, 0, riff);
  view.setUint32(4, buffer.byteLength - 8, true);
  writeAscii(view, 8, wave);

  if (includeJunk) {
    writeAscii(view, offset, 'JUNK');
    view.setUint32(offset + 4, 4, true);
    offset += 12;
  }

  if (includeFmt) {
    writeAscii(view, offset, 'fmt ');
    view.setUint32(offset + 4, 16, true);
    view.setUint16(offset + 8, 1, true);
    view.setUint16(offset + 10, 2, true);
    view.setUint32(offset + 12, 48000, true);
    view.setUint16(offset + 22, 24, true);
    offset += 24;
  }

  if (includeData) {
    writeAscii(view, offset, 'data');
    view.setUint32(offset + 4, 24, true);
  }

  return buffer;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('wavHeader', () => {
  it('should parse WAV format information from the fmt chunk', () => {
    const format = parseWavHeader(createWavBuffer());

    expect(format).toEqual({
      audioFormat: 1,
      channels: 2,
      sampleRate: 48000,
      bitsPerSample: 24,
    });
  });

  it('should reject invalid WAV headers', () => {
    expect(() => parseWavHeader(new ArrayBuffer(10))).toThrow(
      'minimum 44 bytes',
    );
    expect(() => parseWavHeader(createWavBuffer({ riff: 'NOPE' }))).toThrow(
      'missing RIFF header',
    );
    expect(() => parseWavHeader(createWavBuffer({ wave: 'NOPE' }))).toThrow(
      'missing WAVE format',
    );
    expect(() =>
      parseWavHeader(createWavBuffer({ includeFmt: false })),
    ).toThrow('fmt chunk not found');
  });

  it('should return fallback audio format when parsing fails', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getAudioFormat(new ArrayBuffer(10))).toEqual({
      audioFormat: 1,
      channels: 1,
      sampleRate: 44100,
      bitsPerSample: 16,
    });
  });

  it('should find the WAV data chunk offset', () => {
    expect(getWavDataOffset(createWavBuffer())).toBe(STANDARD_WAV_HEADER_SIZE);
    expect(getWavDataOffset(createWavBuffer({ includeJunk: true }))).toBe(56);
  });

  it('should fall back to the standard header size for malformed buffers', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getWavDataOffset(new ArrayBuffer(8))).toBe(STANDARD_WAV_HEADER_SIZE);
    expect(getWavDataOffset(createWavBuffer({ riff: 'NOPE' }))).toBe(
      STANDARD_WAV_HEADER_SIZE,
    );
    expect(getWavDataOffset(createWavBuffer({ includeData: false }))).toBe(
      STANDARD_WAV_HEADER_SIZE,
    );
  });

  it('should create WAV data from PCM16 bytes', () => {
    const wav = createPcm16Wav(new Uint8Array([1, 2, 3, 4]), 24000);

    expect(parseWavHeader(wav)).toEqual({
      audioFormat: 1,
      channels: 1,
      sampleRate: 24000,
      bitsPerSample: 16,
    });
    expect(getWavDataOffset(wav)).toBe(STANDARD_WAV_HEADER_SIZE);
    expect(Array.from(new Uint8Array(wav).slice(44))).toEqual([1, 2, 3, 4]);
  });

  it('should create WAV data from Float32 samples', () => {
    const wav = float32ToPcm16Wav(new Float32Array([-1, 0, 1]), 22050);
    const view = new DataView(wav);

    expect(parseWavHeader(wav)).toMatchObject({
      channels: 1,
      sampleRate: 22050,
      bitsPerSample: 16,
    });
    expect(view.getInt16(44, true)).toBe(-32768);
    expect(view.getInt16(46, true)).toBe(0);
    expect(view.getInt16(48, true)).toBe(32767);
  });
});
