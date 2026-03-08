import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
  type AITuberOnAirCoreOptions,
  type Message,
} from "@aituber-onair/core";
import type { CoreTool } from "../../tools/types.js";
import type { AgentConfig } from "../../config/schema.js";
import { toErrorMessage } from "../../domain/errors.js";
import type { AuditLogger } from "../logging/AuditLogger.js";
import { buildSystemPrompt } from "../../app/systemPrompt.js";
import type { CommandPolicy } from "../../domain/policy/commandPolicy.js";

interface AssistantResponsePayload {
  message?: Message;
  rawText?: string;
}

export class CoreProviderAdapter {
  private readonly core: AITuberOnAirCore;

  constructor(
    config: AgentConfig,
    tools: CoreTool[],
    logger: AuditLogger,
    commandPolicy: CommandPolicy,
  ) {
    const providerOptions: AITuberOnAirCoreOptions["providerOptions"] = {
      ...(config.openaiEndpoint ? { endpoint: config.openaiEndpoint } : {}),
      ...(config.gpt5EndpointPreference
        ? { gpt5EndpointPreference: config.gpt5EndpointPreference }
        : {}),
    };

    this.core = new AITuberOnAirCore({
      chatProvider: "openai",
      apiKey: config.apiKey,
      model: config.model,
      providerOptions,
      chatOptions: {
        systemPrompt: buildSystemPrompt(commandPolicy.buildPromptSection()),
        maxHops: config.maxHops,
        responseLength: config.responseLength,
      },
      tools,
    });

    this.core.on(AITuberOnAirCoreEvent.TOOL_USE, (blocks: unknown) => {
      for (const block of Array.isArray(blocks) ? blocks : []) {
        const item = block as { name?: string; input?: unknown };
        logger.emit("tool.use", {
          name: item.name || "unknown",
          input: item.input,
        });
      }
    });

    this.core.on(AITuberOnAirCoreEvent.TOOL_RESULT, (results: unknown) => {
      for (const result of Array.isArray(results) ? results : []) {
        const item = result as { tool_use_id?: string; content?: unknown };
        logger.emit("tool.result", {
          toolUseId: item.tool_use_id || "unknown",
          output: item.content,
        });
      }
    });
  }

  async sendPrompt(prompt: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        this.core.off(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, onResponse);
        this.core.off(AITuberOnAirCoreEvent.ERROR, onError);
        clearTimeout(timer);
      };

      const onResponse = (payload: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(extractAssistantText(payload as AssistantResponsePayload));
      };

      const onError = (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(new Error(toErrorMessage(error)));
      };

      const timer = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(new Error(`Assistant response timed out (${timeoutMs}ms)`));
      }, timeoutMs);

      this.core.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, onResponse);
      this.core.on(AITuberOnAirCoreEvent.ERROR, onError);

      void this.core
        .processChat(prompt)
        .then((ok) => {
          if (!ok && !settled) {
            settled = true;
            cleanup();
            reject(
              new Error(
                "Chat processing did not complete successfully. Check AGENT_MODEL, AGENT_API_KEY, and endpoint settings.",
              ),
            );
          }
        })
        .catch(onError);
    });
  }

  getHistory(): Message[] {
    return this.core.getChatHistory();
  }

  setHistory(history: Message[]): void {
    this.core.setChatHistory(history);
  }
}

function extractAssistantText(payload: AssistantResponsePayload): string {
  const messageContent = payload.message?.content as unknown;
  if (typeof messageContent === "string") {
    return messageContent;
  }

  if (Array.isArray(messageContent)) {
    const combined = messageContent
      .map((block: unknown) => {
        if (typeof block === "string") {
          return block;
        }
        if (
          block &&
          typeof block === "object" &&
          "text" in block &&
          typeof (block as { text?: unknown }).text === "string"
        ) {
          return (block as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");

    if (combined) {
      return combined;
    }
  }

  return payload.rawText || "(no response text)";
}
