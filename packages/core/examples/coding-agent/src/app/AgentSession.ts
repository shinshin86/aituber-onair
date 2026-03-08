import readline from "node:readline";
import { toErrorMessage } from "../domain/errors.js";
import type { AgentConfig } from "../config/schema.js";
import { ConversationStateMachine } from "./ConversationStateMachine.js";
import type { TurnController } from "./TurnController.js";
import type { AuditLogger } from "../infra/logging/AuditLogger.js";

export class AgentSession {
  private readonly stateMachine = new ConversationStateMachine();

  constructor(
    private readonly config: AgentConfig,
    private readonly turnController: TurnController,
    private readonly logger: AuditLogger,
  ) {}

  async startRepl(): Promise<void> {
    console.log(`Coding Agent started. workspace=${this.config.workdir}`);
    console.log("Type your request. Use 'exit' or 'quit' to stop.");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    let isProcessing = false;
    rl.setPrompt("agent> ");
    rl.prompt();

    rl.on("line", async (line) => {
      const input = line.trim();
      if (!input) {
        rl.prompt();
        return;
      }

      if (input === "exit" || input === "quit") {
        rl.close();
        return;
      }

      if (isProcessing) {
        console.log(
          "assistant> A request is already in progress. Please wait for completion.",
        );
        rl.prompt();
        return;
      }

      isProcessing = true;
      this.logger.emit("turn.start", { input });

      try {
        this.stateMachine.transition("Planning");
        const response = await this.turnController.runTurn(input);
        this.stateMachine.transition("Responding");
        console.log(`assistant> ${response}`);
        this.logger.emit("assistant.response", { response });
        this.stateMachine.transition("Idle");
      } catch (error) {
        const message = toErrorMessage(error);
        console.error(`assistant(error)> ${message}`);
        console.error(
          "Loop halted safely. Please inspect logs and continue with smaller manual steps if needed.",
        );
        this.logger.emit("loop.halt", { reason: message });
        this.stateMachine.transition("Halted");
        this.stateMachine.transition("Idle");
      } finally {
        this.logger.emit("turn.end", { state: this.stateMachine.getState() });
        isProcessing = false;
        rl.prompt();
      }
    });

    await new Promise<void>((resolve) => {
      rl.on("close", () => {
        console.log("Agent stopped.");
        resolve();
      });
    });
  }
}
