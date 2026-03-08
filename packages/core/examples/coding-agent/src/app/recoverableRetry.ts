import { toErrorMessage } from "../domain/errors.js";

export function isRecoverableToolArgumentParseError(error: unknown): boolean {
  const message = toErrorMessage(error);
  return /unterminated string in json|unexpected token.+json|json\.parse/i.test(
    message,
  );
}

export function buildToolArgumentRecoveryPrompt(
  originalPrompt: string,
  retryCount: number,
): string {
  return [
    "Retry the same task.",
    "The previous attempt failed because tool arguments were invalid JSON.",
    "Use strict JSON, keep each tool input small, and split edits into small calls.",
    `Retry: ${retryCount}`,
    `Original request:\n${originalPrompt}`,
  ].join("\n");
}

export interface RecoverableRetryContext<TSnapshot> {
  maxRetries: number;
  retryDelayMs: number;
  run: (prompt: string) => Promise<string>;
  createSnapshot: () => TSnapshot;
  restoreSnapshot: (snapshot: TSnapshot) => void;
  resetLoopGuard: () => void;
  onRetry?: (retryCount: number, reason: string) => void;
}

export async function runWithRecoverableRetry<TSnapshot>(
  originalPrompt: string,
  context: RecoverableRetryContext<TSnapshot>,
): Promise<string> {
  const baseSnapshot = context.createSnapshot();
  let currentPrompt = originalPrompt;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await context.run(currentPrompt);
    } catch (error) {
      const retryCount = attempt + 1;
      const reason = toErrorMessage(error);
      if (
        retryCount > context.maxRetries ||
        !isRecoverableToolArgumentParseError(error)
      ) {
        throw error;
      }

      context.restoreSnapshot(baseSnapshot);
      context.resetLoopGuard();
      context.onRetry?.(retryCount, reason);
      currentPrompt = buildToolArgumentRecoveryPrompt(
        originalPrompt,
        retryCount,
      );
      await sleep(context.retryDelayMs);
    }
  }
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
