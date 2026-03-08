import { describe, expect, it } from "vitest";
import { ConversationStateMachine } from "../../src/app/ConversationStateMachine.js";

describe("ConversationStateMachine", () => {
  it("follows valid transitions", () => {
    const machine = new ConversationStateMachine();
    machine.transition("Planning");
    machine.transition("ToolRunning");
    machine.transition("Responding");
    machine.transition("Idle");
    expect(machine.getState()).toBe("Idle");
  });

  it("rejects invalid transitions", () => {
    const machine = new ConversationStateMachine();
    expect(() => machine.transition("Responding")).toThrow(
      "Invalid state transition",
    );
  });
});
