import type { ContaminateInput, Contaminator } from '../core/types.js';

export function createContaminationStream(
  contaminator: Contaminator,
  baseInput: Omit<ContaminateInput, 'draft'>
): TransformStream<string, string> {
  let buffer = '';

  return new TransformStream<string, string>({
    transform(chunk) {
      buffer += chunk;
    },
    async flush(controller) {
      const result = await contaminator.contaminate({
        ...baseInput,
        draft: buffer,
      });

      controller.enqueue(result.text);
    },
  });
}
