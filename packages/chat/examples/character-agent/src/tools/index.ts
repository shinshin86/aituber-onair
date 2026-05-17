import { createDefaultJsonStorage, type JsonStorage } from '../storage';
import { createDraftCreateTool } from './draft';
import { createMemoSaveTool } from './memo';
import { createMemorySaveTool, createMemorySearchTool } from './memory';
import { createScheduleSuggestTool } from './schedule';
import { createTodoCreateTool } from './todo';
import type { SecretaryTool } from './types';

export { createDraftCreateTool } from './draft';
export type { Draft, DraftCreateInput, DraftCreateResult } from './draft';
export { createMemoSaveTool } from './memo';
export type { Memo, MemoSaveInput, MemoSaveResult } from './memo';
export { createMemorySaveTool, createMemorySearchTool } from './memory';
export type {
  Memory,
  MemorySaveInput,
  MemorySaveResult,
  MemorySearchInput,
  MemorySearchResult,
} from './memory';
export { createScheduleSuggestTool } from './schedule';
export type {
  ScheduleSuggestInput,
  ScheduleSuggestResult,
  ScheduleSuggestion,
} from './schedule';
export { createTodoCreateTool } from './todo';
export type { Todo, TodoCreateInput, TodoCreateResult } from './todo';
export type { SecretaryTool } from './types';

export type SecretaryToolsOptions = {
  storage: JsonStorage;
};

export type AnySecretaryTool = SecretaryTool<unknown, unknown>;

export type ChatToolDefinition = {
  name: string;
  description: string;
  parameters: AnySecretaryTool['parameters'];
};

export function createSecretaryTools({
  storage,
}: SecretaryToolsOptions): AnySecretaryTool[] {
  return [
    createMemoSaveTool({ storage }) as AnySecretaryTool,
    createTodoCreateTool({ storage }) as AnySecretaryTool,
    createScheduleSuggestTool({ storage }) as AnySecretaryTool,
    createDraftCreateTool({ storage }) as AnySecretaryTool,
    createMemorySaveTool({ storage }) as AnySecretaryTool,
    createMemorySearchTool({ storage }) as AnySecretaryTool,
  ];
}

export function toChatToolName(toolName: string): string {
  return toolName.replace(/\./g, '_');
}

export function toChatToolDefinitions(
  secretaryTools: AnySecretaryTool[],
): ChatToolDefinition[] {
  const definitions = secretaryTools.map((tool) => ({
    name: toChatToolName(tool.name),
    description: tool.description,
    parameters: tool.parameters,
  }));
  const names = definitions.map((tool) => tool.name);

  if (new Set(names).size !== names.length) {
    throw new Error('Provider-safe tool names must be unique.');
  }

  return definitions;
}

export const tools = createSecretaryTools({
  storage: createDefaultJsonStorage(),
});
