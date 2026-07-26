const SAMPLE_RATE = 24_000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const HEADER_BYTES = 44;

const writeWavHeader = (buffer, sampleCount) => {
  const byteRate = (SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE) / 8;
  const blockAlign = (CHANNELS * BITS_PER_SAMPLE) / 8;
  const dataBytes = sampleCount * blockAlign;

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
};

export function createMockWav(text) {
  const durationSeconds = Math.min(
    3.2,
    Math.max(1.25, String(text).length * 0.038),
  );
  const sampleCount = Math.floor(SAMPLE_RATE * durationSeconds);
  const buffer = Buffer.alloc(HEADER_BYTES + sampleCount * 2);
  writeWavHeader(buffer, sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / SAMPLE_RATE;
    const envelope =
      Math.min(1, time * 10) *
      Math.min(1, (durationSeconds - time) * 8) *
      (0.48 + 0.38 * Math.sin(time * Math.PI * 6) ** 2);
    const frequency = 195 + 38 * Math.sin(time * Math.PI * 2.7);
    const voice =
      Math.sin(2 * Math.PI * frequency * time) * 0.55 +
      Math.sin(2 * Math.PI * frequency * 2.01 * time) * 0.2;
    const sample = Math.max(-1, Math.min(1, voice * envelope * 0.48));
    buffer.writeInt16LE(Math.round(sample * 32_767), HEADER_BYTES + index * 2);
  }

  return buffer;
}
