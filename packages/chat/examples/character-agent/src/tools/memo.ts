import {
  createdAtNow,
  createId,
  optionalStringArray,
  requireString,
  type SecretaryTool,
  type ToolFactoryOptions,
  type ToolOkResult,
} from './types';

export type Memo = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
};

export type MemoSaveInput = {
  title: string;
  content: string;
  tags?: string[];
};

export type MemoSaveResult = ToolOkResult & {
  message: 'Memo saved.';
  memo: Memo;
};

export function createMemoSaveTool({
  storage,
}: ToolFactoryOptions): SecretaryTool<MemoSaveInput, MemoSaveResult> {
  return {
    name: 'memo.save',
    description:
      'Save an important conversation note to local JSON storage for later review.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short memo title.',
        },
        content: {
          type: 'string',
          description: 'Memo content to preserve.',
        },
        tags: {
          type: 'array',
          description: 'Optional labels for the memo.',
          items: { type: 'string' },
        },
      },
      required: ['title', 'content'],
    },
    async execute(input) {
      const memo: Memo = {
        id: createId('memo'),
        title: requireString(input.title, 'title'),
        content: requireString(input.content, 'content'),
        tags: optionalStringArray(input.tags, 'tags'),
        createdAt: createdAtNow(),
      };

      await storage.appendJsonArrayItem('memos.json', memo);

      return {
        ok: true,
        message: 'Memo saved.',
        memo,
      };
    },
  };
}
