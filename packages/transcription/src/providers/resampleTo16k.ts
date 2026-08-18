const WHISPER_SAMPLE_RATE = 16_000;

export function resampleTo16k(
  input: Float32Array,
  inputSampleRate: number
): Float32Array {
  if (!Number.isFinite(inputSampleRate) || inputSampleRate <= 0) {
    throw new RangeError('The input sample rate must be a positive number.');
  }
  if (input.length === 0) return new Float32Array();
  if (inputSampleRate === WHISPER_SAMPLE_RATE) {
    return new Float32Array(input);
  }

  const outputLength = Math.max(
    1,
    Math.round((input.length * WHISPER_SAMPLE_RATE) / inputSampleRate)
  );
  const output = new Float32Array(outputLength);
  const sourceStep = inputSampleRate / WHISPER_SAMPLE_RATE;

  for (let index = 0; index < outputLength; index += 1) {
    const sourcePosition = index * sourceStep;
    const leftIndex = Math.min(Math.floor(sourcePosition), input.length - 1);
    const rightIndex = Math.min(leftIndex + 1, input.length - 1);
    const weight = sourcePosition - leftIndex;
    output[index] =
      input[leftIndex] * (1 - weight) + input[rightIndex] * weight;
  }

  return output;
}
