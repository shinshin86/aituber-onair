import { afterEach, describe, expect, it, vi } from 'vitest';
import {
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
});
