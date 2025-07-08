/**
 * WAV file header parser utility
 */

export interface WavFormat {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  audioFormat: number;
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
  const riff = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );

  if (riff !== 'RIFF') {
    throw new Error('Invalid WAV file: missing RIFF header');
  }

  // Check for WAVE format
  const wave = String.fromCharCode(
    view.getUint8(8),
    view.getUint8(9),
    view.getUint8(10),
    view.getUint8(11),
  );

  if (wave !== 'WAVE') {
    throw new Error('Invalid WAV file: missing WAVE format');
  }

  // Find fmt chunk
  let offset = 12;
  while (offset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );

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
