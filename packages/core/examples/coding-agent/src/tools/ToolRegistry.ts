import type { CoreTool, ToolCommand } from "./types.js";
import type { ToolLoopGuard } from "../app/ToolLoopGuard.js";
import { toErrorMessage } from "../domain/errors.js";

export class ToolRegistry {
  constructor(private readonly loopGuard: ToolLoopGuard) {}

  buildTools(commands: ToolCommand<unknown>[]): CoreTool[] {
    return commands.map((command) => ({
      definition: command.definition,
      handler: async (input: unknown) => {
        try {
          this.loopGuard.beforeCall(command.definition.name, input);
        } catch (error) {
          return command.onError(toErrorMessage(error));
        }

        try {
          const output = await command.execute(input);
          const isError = command.isError(output);
          try {
            this.loopGuard.afterCall(command.definition.name, output, isError);
          } catch (error) {
            return command.onError(toErrorMessage(error));
          }
          return output;
        } catch (error) {
          this.loopGuard.afterCall(command.definition.name, undefined, true);
          return command.onError(toErrorMessage(error));
        }
      },
    }));
  }
}
