import type { Message } from "@aituber-onair/core";
import type { AgentConfig } from "../config/schema.js";
import { compactHistory } from "../memory/historyCompactor.js";
import type { AuditLogger } from "../infra/logging/AuditLogger.js";
import type { CoreProviderAdapter } from "../infra/core/CoreProviderAdapter.js";
import type { ToolLoopGuard } from "./ToolLoopGuard.js";
import { runWithRecoverableRetry } from "./recoverableRetry.js";

function cloneHistory(history: Message[]): Message[] {
  return structuredClone(history);
}

export class TurnController {
  constructor(
    private readonly config: AgentConfig,
    private readonly adapter: CoreProviderAdapter,
    private readonly loopGuard: ToolLoopGuard,
    private readonly logger: AuditLogger,
  ) {}

  async runTurn(input: string): Promise<string> {
    this.loopGuard.resetForNextTurn();
    const baseHistory = cloneHistory(this.adapter.getHistory());

    const response = await runWithRecoverableRetry(input, {
      maxRetries: this.config.recoverableRetries,
      retryDelayMs: this.config.recoveryRetryBackoffMs,
      run: (prompt) =>
        this.adapter.sendPrompt(prompt, this.config.assistantTimeoutMs),
      createSnapshot: () => baseHistory,
      restoreSnapshot: (snapshot) => {
        this.adapter.setHistory(cloneHistory(snapshot));
      },
      resetLoopGuard: () => {
        this.loopGuard.resetForNextTurn();
      },
      onRetry: (retryCount, reason) => {
        this.logger.emit("loop.retry", { retryCount, reason });
      },
    });

    const compacted = compactHistory(this.adapter.getHistory(), {
      maxMessages: this.config.historyMaxMessages,
      keepRecent: this.config.historyKeepRecent,
      maxSummaryChars: this.config.historyMaxSummaryChars,
    });

    if (compacted.length !== this.adapter.getHistory().length) {
      this.adapter.setHistory(compacted);
    }

    return response;
  }
}
