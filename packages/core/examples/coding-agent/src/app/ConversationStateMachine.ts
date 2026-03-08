import { AgentError } from "../domain/errors.js";

export type ConversationState =
  | "Idle"
  | "Planning"
  | "ToolRunning"
  | "Responding"
  | "Halted";

const TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  Idle: ["Planning"],
  Planning: ["ToolRunning", "Responding", "Halted"],
  ToolRunning: ["Planning", "Responding", "Halted"],
  Responding: ["Idle"],
  Halted: ["Idle"],
};

export class ConversationStateMachine {
  private state: ConversationState = "Idle";

  getState(): ConversationState {
    return this.state;
  }

  transition(next: ConversationState): void {
    const allowed = TRANSITIONS[this.state];
    if (!allowed.includes(next)) {
      throw new AgentError(
        "E_INTERNAL",
        `Invalid state transition: ${this.state} -> ${next}`,
      );
    }
    this.state = next;
  }

  resetForNextTurn(): void {
    if (this.state !== "Idle") {
      this.state = "Idle";
    }
  }
}
