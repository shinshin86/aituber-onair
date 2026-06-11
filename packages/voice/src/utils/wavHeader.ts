/**
 * WAV file header parser utility
 */

export interface WavFormat {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  audioFormat: number;
}

export const STANDARD_WAV_HEADER_SIZE = 44;

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function getChunkId(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

/**
 * Parse WAV file header to extract audio format information
 * @param buffer ArrayBuffer containing WAV file data
 * @returns WavFormat object with audio specifications
 */
export function parseWavHeader(buffer: ArrayBuffer): WavFormat {
  // Check for minimum buffer size
  if (buffer.byteLength < 44) {
    throw new Error(
      'Buffer too small for WAV header (minimum 44 bytes required)',
    );
  }

  const view = new DataView(buffer);

  // Check for RIFF header
  const riff = getChunkId(view, 0);

  if (riff !== 'RIFF') {
    throw new Error('Invalid WAV file: missing RIFF header');
  }

  // Check for WAVE format
  const wave = getChunkId(view, 8);

  if (wave !== 'WAVE') {
    throw new Error('Invalid WAV file: missing WAVE format');
  }

  // Find fmt chunk
  let offset = 12;
  while (offset < buffer.byteLength - 8) {
    const chunkId = getChunkId(view, offset);

    const chunkSize = view.getUint32(offset + 4, true); // little-endian

    if (chunkId === 'fmt ') {
      // Found format chunk
      const audioFormat = view.getUint16(offset + 8, true);
      const channels = view.getUint16(offset + 10, true);
      const sampleRate = view.getUint32(offset + 12, true);
      const bitsPerSample = view.getUint16(offset + 22, true);

      return {
        audioFormat,
        channels,
        sampleRate,
        bitsPerSample,
      };
    }

    // Move to next chunk
    offset += 8 + chunkSize;
  }

  throw new Error('Invalid WAV file: fmt chunk not found');
}

/**
 * Find the byte offset where WAV audio data starts.
 * Falls back to the standard PCM header size for malformed or non-WAV buffers.
 */
export function getWavDataOffset(buffer: ArrayBuffer): number {
  if (buffer.byteLength < 12) {
    console.warn(
      `Buffer too small for WAV header, using default header size: ${STANDARD_WAV_HEADER_SIZE}`,
    );
    return STANDARD_WAV_HEADER_SIZE;
  }

  const view = new DataView(buffer);

  try {
    if (getChunkId(view, 0) !== 'RIFF') {
      return STANDARD_WAV_HEADER_SIZE;
    }

    let offset = 12;
    while (offset < buffer.byteLength - 8) {
      const chunkId = getChunkId(view, offset);
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === 'data') {
        return offset + 8;
      }

      offset += 8 + chunkSize;
    }

    return STANDARD_WAV_HEADER_SIZE;
  } catch (error) {
    console.warn('Error parsing WAV header, using default header size:', error);
    return STANDARD_WAV_HEADER_SIZE;
  }
}

/**
 * Get default audio format for speaker library
 * Falls back to common format if parsing fails
 */
export function getAudioFormat(buffer: ArrayBuffer): WavFormat {
  try {
    return parseWavHeader(buffer);
  } catch (error) {
    console.warn('Failed to parse WAV header, using default format:', error);
    // Return common fallback format
    return {
      audioFormat: 1, // PCM
      channels: 1,
      sampleRate: 44100,
      bitsPerSample: 16,
    };
  }
}

export function createPcm16Wav(
  pcmData: Uint8Array,
  sampleRate: number,
  channels = 1,
): ArrayBuffer {
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const byteRate = sampleRate * channels * bytesPerSample;
  const blockAlign = channels * bytesPerSample;
  const dataSize = pcmData.byteLength;
  const totalSize = STANDARD_WAV_HEADER_SIZE + dataSize;
  const wavBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(wavBuffer);
  const bytes = new Uint8Array(wavBuffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  bytes.set(pcmData, STANDARD_WAV_HEADER_SIZE);

  return wavBuffer;
}

export function float32ToPcm16Wav(
  samples: Float32Array,
  sampleRate: number,
): ArrayBuffer {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const pcmData = new Uint8Array(dataSize);
  const view = new DataView(pcmData.buffer);
  let offset = 0;

  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    const pcm = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, Math.round(pcm), true);
    offset += bytesPerSample;
  }

  return createPcm16Wav(pcmData, sampleRate);
}
