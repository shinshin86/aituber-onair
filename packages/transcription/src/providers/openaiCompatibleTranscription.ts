import { TranscriptionSessionError } from '../errors';

/** Resolve an origin, API base, or complete audio transcription URL. */
export function resolveOpenAICompatibleTranscriptionEndpoint(
  input: string
): string {
  try {
    const url = new URL(input.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error('Unsupported URL components');
    const path = url.pathname.replace(/\/+$/, '');
    const suffix = '/audio/transcriptions';
    return `${url.origin}${path.endsWith(suffix) ? path : `${path || '/v1'}${suffix}`}`;
  } catch (cause) {
    throw new TranscriptionSessionError(
      'invalid-configuration',
      'openai-compatible',
      'baseUrl must be an HTTP(S) origin, API base, or audio transcription endpoint without credentials, query parameters, or fragments.',
      { cause }
    );
  }
}

const TRANSCRIPTION_SAMPLE_RATE = 16000;

/**
 * Silence prepended to each utterance. Some recognizers drop the first word
 * when speech starts near the beginning of the file; ReazonSpeech v2 on
 * speech.cpp needed a little over 500 ms in testing, so this keeps a margin.
 */
export const OPENAI_COMPATIBLE_LEADING_SILENCE_MS = 1000;

/** Prepend leading silence to mono 16 kHz audio. */
export function withLeadingSilence(audio: Float32Array): Float32Array {
  const silenceSamples =
    (TRANSCRIPTION_SAMPLE_RATE * OPENAI_COMPATIBLE_LEADING_SILENCE_MS) / 1000;
  const padded = new Float32Array(silenceSamples + audio.length);
  padded.set(audio, silenceSamples);
  return padded;
}

/** Encode mono 16 kHz audio as little-endian PCM16 WAV. */
export function encodeTranscriptionWav(audio: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + audio.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeText(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, audio.length * 2, true);
  for (let i = 0; i < audio.length; i++) {
    const sample = Math.max(-1, Math.min(1, audio[i]));
    view.setInt16(
      44 + i * 2,
      sample < 0 ? sample * 32768 : sample * 32767,
      true
    );
  }
  return buffer;
}
