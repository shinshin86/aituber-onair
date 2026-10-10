import {
  createAgentChatService,
  type Message,
  type ToolChatCompletion,
} from '@aituber-onair/core/agent';

interface AgentChatServiceLike {
  chatOnce(
    messages: Message[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
    maxTokens?: number,
  ): Promise<ToolChatCompletion>;
}

export interface AgentChatModuleLike {
  createAgentChatService(
    provider: 'codex-sdk',
    options: { skipGitRepoCheck: boolean },
  ): AgentChatServiceLike;
}

export interface RequestScriptViaCodexOptions {
  systemPrompt: string;
  userPrompt: string;
  agentModule?: AgentChatModuleLike;
}

/** Return Core's Agent SDK entry behind the small interface used by tests. */
export function loadAgentChatModule(): AgentChatModuleLike {
  return { createAgentChatService } as unknown as AgentChatModuleLike;
}

/** Strip an optional Markdown fence around a JSON response. */
export function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Generate a script through Core's `codex-sdk` agent provider. The provider
 * uses the local Codex sign-in and does not require an API key.
 */
export async function requestScriptViaCodex({
  systemPrompt,
  userPrompt,
  agentModule = loadAgentChatModule(),
}: RequestScriptViaCodexOptions): Promise<string> {
  const service = agentModule.createAgentChatService('codex-sdk', {
    skipGitRepoCheck: true,
  });
  const completion = await service.chatOnce(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    false,
    () => {},
  );
  const text = completion.blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  if (!text.trim()) throw new Error('codex-sdk provider returned no text.');
  return extractJsonPayload(text);
}
