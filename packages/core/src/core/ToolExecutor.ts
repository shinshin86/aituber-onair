import {
  ToolDefinition,
  ToolUseBlock,
  ToolResultBlock,
} from '@aituber-onair/chat';

type Handler<P = any, R = any> = (input: P) => Promise<R>;

export class ToolExecutor {
  private registry = new Map<string, { def: ToolDefinition; fn: Handler }>();

  register<P, R>(definition: ToolDefinition, fn: Handler<P, R>) {
    if (this.registry.has(definition.name)) {
      throw new Error(`Tool '${definition.name}' already registered`);
    }
    this.registry.set(definition.name, { def: definition, fn });
  }

  async run(blocks: ToolUseBlock[]): Promise<ToolResultBlock[]> {
    const tasks = blocks
      .filter((b): b is ToolUseBlock => b.type === 'tool_use')
      .map(async (b) => {
        const entry = this.registry.get(b.name);
        if (!entry) {
          throw new Error(`Unhandled tool: ${b.name}`);
        }
        const { fn, def } = entry;

        const resPromise = fn(b.input);
        const result = def.config?.timeoutMs
          ? await Promise.race([
              resPromise,
              new Promise<never>((_, rej) =>
                setTimeout(
                  () => rej(new Error(`${b.name} timed out`)),
                  def.config!.timeoutMs,
                ),
              ),
            ])
          : await resPromise;

        return <ToolResultBlock>{
          type: 'tool_result',
          tool_use_id: b.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        };
      });

    return Promise.all(tasks);
  }

  listDefinitions(): ToolDefinition[] {
    return Array.from(this.registry.values()).map((r) => r.def);
  }
}
