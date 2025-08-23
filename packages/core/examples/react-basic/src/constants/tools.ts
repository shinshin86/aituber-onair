import type { ToolDefinition } from '@aituber-onair/core';

// Random integer tool definition
export const randomIntTool: ToolDefinition = {
  name: 'randomInt',
  description:
    'Return a random integer from 0 (inclusive) up to, but not including, `max`. If `max` is omitted the default upper‑bound is 100.',
  parameters: {
    type: 'object',
    properties: {
      max: {
        type: 'integer',
        description: 'Exclusive upper bound for the random integer',
        minimum: 1,
      },
    },
    required: ['max'],
  },
};

// Tool handler
export const randomIntHandler = async ({ max }: { max: number }) => {
  return Math.floor(Math.random() * max).toString();
};