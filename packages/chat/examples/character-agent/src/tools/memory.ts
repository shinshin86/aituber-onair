import {
  createdAtNow,
  createId,
  optionalNumber,
  requireString,
  type SecretaryTool,
  type ToolFactoryOptions,
  type ToolOkResult,
} from './types';

const defaultSearchLimit = 5;

export type Memory = {
  id: string;
  subject: string;
  content: string;
  importance?: number;
  createdAt: string;
};

export type MemorySaveInput = {
  subject: string;
  content: string;
  importance?: number;
};

export type MemorySearchInput = {
  query: string;
  limit?: number;
};

export type MemorySaveResult = ToolOkResult & {
  message: 'Memory saved.';
  memory: Memory;
};

export type MemorySearchResult = ToolOkResult & {
  results: Memory[];
};

export function createMemorySaveTool({
  storage,
}: ToolFactoryOptions): SecretaryTool<MemorySaveInput, MemorySaveResult> {
  return {
    name: 'memory.save',
    description:
      'Save useful long-term context about the user or stream locally.',
    parameters: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Memory subject.',
        },
        content: {
          type: 'string',
          description: 'Memory content.',
        },
        importance: {
          type: 'number',
          description: 'Optional importance score.',
        },
      },
      required: ['subject', 'content'],
    },
    async execute(input) {
      const importance = optionalNumber(input.importance, 'importance');
      const memory: Memory = {
        id: createId('memory'),
        subject: requireString(input.subject, 'subject'),
        content: requireString(input.content, 'content'),
        ...(importance !== undefined ? { importance } : {}),
        createdAt: createdAtNow(),
      };

      await storage.appendJsonArrayItem('memories.json', memory);

      return {
        ok: true,
        message: 'Memory saved.',
        memory,
      };
    },
  };
}

export function createMemorySearchTool({
  storage,
}: ToolFactoryOptions): SecretaryTool<MemorySearchInput, MemorySearchResult> {
  return {
    name: 'memory.search',
    description:
      'Search locally saved memories by subject and content using case-insensitive partial matching.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results.',
        },
      },
      required: ['query'],
    },
    async execute(input) {
      const query = requireString(input.query, 'query').toLowerCase();
      const limit = Math.max(0, Math.floor(input.limit ?? defaultSearchLimit));
      const memories = await storage.readJsonArray<Memory>('memories.json');
      const results = memories
        .filter((memory) => {
          const haystack = `${memory.subject}\n${memory.content}`.toLowerCase();

          return haystack.includes(query);
        })
        .slice(0, limit);

      return {
        ok: true,
        results,
      };
    },
  };
}
