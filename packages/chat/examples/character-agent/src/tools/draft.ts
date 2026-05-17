import {
  createdAtNow,
  createId,
  enumValue,
  optionalString,
  requireString,
  type SecretaryTool,
  type ToolFactoryOptions,
  type ToolOkResult,
} from './types';

const draftTypes = ['email', 'post', 'announcement', 'reply'] as const;

export type DraftType = (typeof draftTypes)[number];

export type Draft = {
  id: string;
  type: DraftType;
  audience?: string;
  purpose: string;
  tone?: string;
  body: string;
  createdAt: string;
};

export type DraftCreateInput = {
  type: DraftType;
  audience?: string;
  purpose: string;
  tone?: string;
  body: string;
};

export type DraftCreateResult = ToolOkResult & {
  message: 'Draft created.';
  draft: Draft;
};

export function createDraftCreateTool({
  storage,
}: ToolFactoryOptions): SecretaryTool<DraftCreateInput, DraftCreateResult> {
  return {
    name: 'draft.create',
    description:
      'Create a local draft for an email, post, announcement, or reply without sending it.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: [...draftTypes],
          description: 'Draft category.',
        },
        audience: {
          type: 'string',
          description: 'Optional intended audience.',
        },
        purpose: {
          type: 'string',
          description: 'Why this draft is being created.',
        },
        tone: {
          type: 'string',
          description: 'Optional tone guidance.',
        },
        body: {
          type: 'string',
          description: 'Draft body text.',
        },
      },
      required: ['type', 'purpose', 'body'],
    },
    async execute(input) {
      const audience = optionalString(input.audience, 'audience');
      const tone = optionalString(input.tone, 'tone');
      const draft: Draft = {
        id: createId('draft'),
        type: enumValue(input.type, 'type', draftTypes),
        ...(audience ? { audience } : {}),
        purpose: requireString(input.purpose, 'purpose'),
        ...(tone ? { tone } : {}),
        body: requireString(input.body, 'body'),
        createdAt: createdAtNow(),
      };

      await storage.appendJsonArrayItem('drafts.json', draft);

      return {
        ok: true,
        message: 'Draft created.',
        draft,
      };
    },
  };
}
