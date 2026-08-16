import { resampleTo16k } from '../src/providers/resampleTo16k';

function sineWave(sampleRate: number, durationSeconds: number): Float32Array {
  const samples = new Float32Array(sampleRate * durationSeconds);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.sin((2 * Math.PI * 440 * index) / sampleRate);
  }
  return samples;
}

describe('resampleTo16k', () => {
  it('resamples 48 kHz input to 16 kHz', () => {
    const output = resampleTo16k(sineWave(48_000, 1), 48_000);

    expect(output).toHaveLength(16_000);
    expect([...output].every(Number.isFinite)).toBe(true);
  });

  it('resamples 44.1 kHz input while preserving duration', () => {
    const input = sineWave(44_100, 2);

    const output = resampleTo16k(input, 44_100);

    expect(output).toHaveLength(32_000);
    expect(output.length / 16_000).toBeCloseTo(input.length / 44_100, 5);
    expect([...output].every(Number.isFinite)).toBe(true);
  });

  it('copies input that is already 16 kHz', () => {
    const input = new Float32Array([0, 0.5, -0.5]);

    const output = resampleTo16k(input, 16_000);

    expect(output).toEqual(input);
    expect(output).not.toBe(input);
  });

  it('handles empty input safely', () => {
    expect(resampleTo16k(new Float32Array(), 48_000)).toEqual(
      new Float32Array()
    );
  });
});
