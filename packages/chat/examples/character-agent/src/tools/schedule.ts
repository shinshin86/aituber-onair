import {
  createdAtNow,
  createId,
  optionalNumber,
  optionalString,
  requireString,
  type SecretaryTool,
  type ToolFactoryOptions,
  type ToolOkResult,
} from './types';

export type ScheduleSuggestion = {
  id: string;
  title: string;
  date?: string;
  durationMinutes?: number;
  notes?: string;
  createdAt: string;
};

export type ScheduleSuggestInput = {
  title: string;
  date?: string;
  durationMinutes?: number;
  notes?: string;
};

export type ScheduleSuggestResult = ToolOkResult & {
  message: 'Schedule suggestion created.';
  schedule: ScheduleSuggestion;
};

export function createScheduleSuggestTool({
  storage,
}: ToolFactoryOptions): SecretaryTool<
  ScheduleSuggestInput,
  ScheduleSuggestResult
> {
  return {
    name: 'schedule.suggest',
    description:
      'Save a proposed schedule item locally without registering it in a calendar.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Schedule suggestion title.',
        },
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
    async execute(input) {
      const date = optionalString(input.date, 'date');
      const durationMinutes = optionalNumber(
        input.durationMinutes,
        'durationMinutes',
      );
      const notes = optionalString(input.notes, 'notes');
      const schedule: ScheduleSuggestion = {
        id: createId('schedule'),
        title: requireString(input.title, 'title'),
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
