/**
 * Ported secretary tools.
 *
 * Each tool below mirrors one factory from the existing character-agent
 * example (`packages/chat/examples/character-agent/src/tools/`), but adapts it
 * to the `@aituber-onair/agent` `AgentToolSpec` shape. The porting changes are:
 *
 * 1. A logical dotted `id` (e.g. `memo.save`) is added. This id is what the
 *    host references in `policy.allowTools` and `session.allowedTools`; it is
 *    never shown to the model.
 * 2. `definition.name` becomes a provider-safe identifier (e.g. `memo_save`).
 *    The ChatServiceBackend maps the model's tool call back to the dotted `id`
 *    for execution.
 * 3. A `risk` level is assigned. The host policy can gate or require approval
 *    on this (`read` | `draft` | `write` | `external` | `destructive`).
 * 4. `execute` now receives `(input, context)` where `input` is the validated
 *    argument object and `context` carries agent/session/turn ids and an
 *    `AbortSignal`.
 *
 * The storage-backed logic itself is unchanged; only the registration envelope
 * changes. Each handler is generic over its input/output so `input` is typed.
 */
import type { AgentToolSpec } from '@aituber-onair/agent';

import type { JsonStorage } from './jsonStorage.js';
import {
  createdAtNow,
  createId,
  enumValue,
  optionalEnumValue,
  optionalNumber,
  optionalString,
  optionalStringArray,
  requireString,
  toProviderToolName,
} from './validation.js';

export interface ToolFactoryOptions {
  readonly storage: JsonStorage;
}

export interface ToolOkResult {
  readonly ok: true;
  readonly message?: string;
}

// --- memo.save -----------------------------------------------------------

export type Memo = {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
};
type MemoSaveInput = { title: string; content: string; tags?: readonly string[] };
type MemoSaveResult = ToolOkResult & { message: 'Memo saved.'; memo: Memo };

function memoSaveTool({ storage }: ToolFactoryOptions): AgentToolSpec<MemoSaveInput, MemoSaveResult> {
  return {
    id: 'memo.save',
    definition: {
      name: toProviderToolName('memo.save'),
      description:
        'Save an important conversation note to local JSON storage for later review.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short memo title.' },
          content: { type: 'string', description: 'Memo content to preserve.' },
          tags: {
            type: 'array',
            description: 'Optional labels for the memo.',
            items: { type: 'string' },
          },
        },
        required: ['title', 'content'],
      },
    },
    risk: 'draft',
    async execute(input) {
      const memo: Memo = {
        id: createId('memo'),
        title: requireString(input?.title, 'title'),
        content: requireString(input?.content, 'content'),
        tags: optionalStringArray(input?.tags, 'tags'),
        createdAt: createdAtNow(),
      };
      await storage.appendJsonArrayItem('memos.json', memo);
      return { ok: true, message: 'Memo saved.', memo };
    },
  };
}

// --- todo.create ---------------------------------------------------------

export type Todo = {
  readonly id: string;
  readonly title: string;
  readonly dueDate?: string;
  readonly priority: 'low' | 'medium' | 'high';
  readonly completed: false;
  readonly createdAt: string;
};
const todoPriorities = ['low', 'medium', 'high'] as const;
type TodoCreateInput = {
  title: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
};
type TodoCreateResult = ToolOkResult & { message: 'Todo created.'; todo: Todo };

function todoCreateTool({ storage }: ToolFactoryOptions): AgentToolSpec<TodoCreateInput, TodoCreateResult> {
  return {
    id: 'todo.create',
    definition: {
      name: toProviderToolName('todo.create'),
      description:
        'Create a local todo item for a task the user wants to remember.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title.' },
          dueDate: {
            type: 'string',
            description: 'Optional due date or date-time string.',
          },
          priority: {
            type: 'string',
            enum: [...todoPriorities],
            description: 'Task priority.',
          },
        },
        required: ['title'],
      },
    },
    risk: 'draft',
    async execute(input) {
      const dueDate = optionalString(input?.dueDate, 'dueDate');
      const todo: Todo = {
        id: createId('todo'),
        title: requireString(input?.title, 'title'),
        ...(dueDate ? { dueDate } : {}),
        priority: optionalEnumValue(
          input?.priority,
          'priority',
          todoPriorities,
          'medium',
        ),
        completed: false,
        createdAt: createdAtNow(),
      };
      await storage.appendJsonArrayItem('todos.json', todo);
      return { ok: true, message: 'Todo created.', todo };
    },
  };
}

// --- schedule.suggest ----------------------------------------------------

export type ScheduleSuggestion = {
  readonly id: string;
  readonly title: string;
  readonly date?: string;
  readonly durationMinutes?: number;
  readonly notes?: string;
  readonly createdAt: string;
};
type ScheduleSuggestInput = {
  title: string;
  date?: string;
  durationMinutes?: number;
  notes?: string;
};
type ScheduleSuggestResult = ToolOkResult & {
  message: 'Schedule suggestion created.';
  schedule: ScheduleSuggestion;
};

function scheduleSuggestTool({ storage }: ToolFactoryOptions): AgentToolSpec<ScheduleSuggestInput, ScheduleSuggestResult> {
  return {
    id: 'schedule.suggest',
    definition: {
      name: toProviderToolName('schedule.suggest'),
      description:
        'Save a proposed schedule item locally without registering it in a calendar.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Schedule suggestion title.' },
          date: {
            type: 'string',
            description: 'Optional proposed date or date-time string.',
          },
          durationMinutes: {
            type: 'number',
            description: 'Optional proposed duration in minutes.',
          },
          notes: {
            type: 'string',
            description: 'Optional context or confirmation notes.',
          },
        },
        required: ['title'],
      },
    },
    risk: 'draft',
    async execute(input) {
      const date = optionalString(input?.date, 'date');
      const durationMinutes = optionalNumber(
        input?.durationMinutes,
        'durationMinutes',
      );
      const notes = optionalString(input?.notes, 'notes');
      const schedule: ScheduleSuggestion = {
        id: createId('schedule'),
        title: requireString(input?.title, 'title'),
        ...(date ? { date } : {}),
        ...(durationMinutes !== undefined ? { durationMinutes } : {}),
        ...(notes ? { notes } : {}),
        createdAt: createdAtNow(),
      };
      await storage.appendJsonArrayItem('schedules.json', schedule);
      return {
        ok: true,
        message: 'Schedule suggestion created.',
        schedule,
      };
    },
  };
}

// --- draft.create --------------------------------------------------------

export type Draft = {
  readonly id: string;
  readonly type: 'email' | 'post' | 'announcement' | 'reply';
  readonly audience?: string;
  readonly purpose: string;
  readonly tone?: string;
  readonly body: string;
  readonly createdAt: string;
};
const draftTypes = ['email', 'post', 'announcement', 'reply'] as const;
type DraftCreateInput = {
  type: 'email' | 'post' | 'announcement' | 'reply';
  audience?: string;
  purpose: string;
  tone?: string;
  body: string;
};
type DraftCreateResult = ToolOkResult & { message: 'Draft created.'; draft: Draft };

function draftCreateTool({ storage }: ToolFactoryOptions): AgentToolSpec<DraftCreateInput, DraftCreateResult> {
  return {
    id: 'draft.create',
    definition: {
      name: toProviderToolName('draft.create'),
      description:
        'Create a local draft for an email, post, announcement, or reply without sending it.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...draftTypes], description: 'Draft category.' },
          audience: { type: 'string', description: 'Optional intended audience.' },
          purpose: {
            type: 'string',
            description: 'Why this draft is being created.',
          },
          tone: { type: 'string', description: 'Optional tone guidance.' },
          body: { type: 'string', description: 'Draft body text.' },
        },
        required: ['type', 'purpose', 'body'],
      },
    },
    risk: 'write',
    async execute(input) {
      const audience = optionalString(input?.audience, 'audience');
      const tone = optionalString(input?.tone, 'tone');
      const draft: Draft = {
        id: createId('draft'),
        type: enumValue(input?.type, 'type', draftTypes),
        ...(audience ? { audience } : {}),
        purpose: requireString(input?.purpose, 'purpose'),
        ...(tone ? { tone } : {}),
        body: requireString(input?.body, 'body'),
        createdAt: createdAtNow(),
      };
      await storage.appendJsonArrayItem('drafts.json', draft);
      return { ok: true, message: 'Draft created.', draft };
    },
  };
}

// --- memory.save / memory.search ----------------------------------------

export type Memory = {
  readonly id: string;
  readonly subject: string;
  readonly content: string;
  readonly importance?: number;
  readonly createdAt: string;
};
type MemorySaveInput = { subject: string; content: string; importance?: number };
type MemorySaveResult = ToolOkResult & { message: 'Memory saved.'; memory: Memory };

function memorySaveTool({ storage }: ToolFactoryOptions): AgentToolSpec<MemorySaveInput, MemorySaveResult> {
  return {
    id: 'memory.save',
    definition: {
      name: toProviderToolName('memory.save'),
      description: 'Save useful long-term context about the user or stream locally.',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Memory subject.' },
          content: { type: 'string', description: 'Memory content.' },
          importance: {
            type: 'number',
            description: 'Optional importance score.',
          },
        },
        required: ['subject', 'content'],
      },
    },
    risk: 'write',
    async execute(input) {
      const importance = optionalNumber(input?.importance, 'importance');
      const memory: Memory = {
        id: createId('memory'),
        subject: requireString(input?.subject, 'subject'),
        content: requireString(input?.content, 'content'),
        ...(importance !== undefined ? { importance } : {}),
        createdAt: createdAtNow(),
      };
      await storage.appendJsonArrayItem('memories.json', memory);
      return { ok: true, message: 'Memory saved.', memory };
    },
  };
}

type MemorySearchInput = { query: string; limit?: number };
type MemorySearchResult = ToolOkResult & { results: readonly Memory[] };
const defaultSearchLimit = 5;

function memorySearchTool({ storage }: ToolFactoryOptions): AgentToolSpec<MemorySearchInput, MemorySearchResult> {
  return {
    id: 'memory.search',
    definition: {
      name: toProviderToolName('memory.search'),
      description:
        'Search locally saved memories by subject and content using case-insensitive partial matching.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query.' },
          limit: { type: 'number', description: 'Maximum number of results.' },
        },
        required: ['query'],
      },
    },
    risk: 'read',
    async execute(input) {
      const query = requireString(input?.query, 'query').toLowerCase();
      const limit = Math.max(0, Math.floor(input?.limit ?? defaultSearchLimit));
      const memories = await storage.readJsonArray<Memory>('memories.json');
      const results = memories
        .filter((memory) => {
          const haystack = `${memory.subject}\n${memory.content}`.toLowerCase();
          return haystack.includes(query);
        })
        .slice(0, limit);
      return { ok: true, results };
    },
  };
}

export type SecretaryToolSpec =
  | ReturnType<typeof memoSaveTool>
  | ReturnType<typeof todoCreateTool>
  | ReturnType<typeof scheduleSuggestTool>
  | ReturnType<typeof draftCreateTool>
  | ReturnType<typeof memorySaveTool>
  | ReturnType<typeof memorySearchTool>;

/**
 * Ported equivalent of `createSecretaryTools` from the character-agent example.
 * Returns fully-formed `AgentToolSpec` instances ready for `createAgent({ tools })`.
 */
export function createSecretaryTools(
  options: ToolFactoryOptions,
): SecretaryToolSpec[] {
  return [
    memoSaveTool(options),
    todoCreateTool(options),
    scheduleSuggestTool(options),
    draftCreateTool(options),
    memorySaveTool(options),
    memorySearchTool(options),
  ];
}
