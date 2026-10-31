// Official catalog snapshot: https://openrouter.ai/api/v1/models (2026-11-01).
// Expected values are independent of the implementation profiles.
export const remainingOpenRouterReasoningProfiles = [
  {
    model: '~openai/gpt-mini-latest',
    efforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    defaultEffort: 'none',
  },
  {
    model: 'openai/gpt-5.6-sol',
    efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'none',
  },
  {
    model: 'openai/gpt-5.6-terra',
    efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'none',
  },
  {
    model: 'openai/gpt-5.6-luna',
    efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'none',
  },
  {
    model: 'openai/gpt-5.5-pro',
    efforts: ['medium', 'high', 'xhigh'],
    defaultEffort: 'medium',
  },
  {
    model: 'openai/gpt-5.5',
    efforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    defaultEffort: 'none',
  },
  {
    model: 'openai/gpt-5.1-codex',
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'low',
  },
  {
    model: 'openai/gpt-5-mini',
    efforts: ['minimal', 'low', 'medium', 'high'],
    defaultEffort: 'minimal',
  },
  {
    model: 'openai/gpt-5-nano',
    efforts: ['minimal', 'low', 'medium', 'high'],
    defaultEffort: 'minimal',
  },
  {
    model: '~anthropic/claude-sonnet-latest',
    efforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'low',
  },
  {
    model: '~anthropic/claude-haiku-latest',
    efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'none',
  },
  {
    model: 'anthropic/claude-fable-5',
    efforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'low',
  },
  {
    model: 'anthropic/claude-opus-5',
    efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'none',
  },
  {
    model: 'anthropic/claude-opus-4.8',
    efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'none',
  },
  {
    model: '~google/gemini-pro-latest',
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'low',
  },
  {
    model: '~google/gemini-flash-latest',
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'low',
  },
  {
    model: 'google/gemini-3.7-flash',
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'low',
  },
  {
    model: 'google/gemini-3.6-flash',
    efforts: ['minimal', 'low', 'medium', 'high'],
    defaultEffort: 'minimal',
  },
  {
    model: 'google/gemini-3.5-flash-lite',
    efforts: ['minimal', 'low', 'medium', 'high'],
    defaultEffort: 'minimal',
  },
  {
    model: '~x-ai/grok-latest',
    efforts: ['low', 'medium', 'high', 'xhigh'],
    defaultEffort: 'low',
  },
  {
    model: 'x-ai/grok-4.6',
    efforts: ['low', 'medium', 'high', 'xhigh'],
    defaultEffort: 'low',
  },
  {
    model: 'x-ai/grok-4.5',
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'low',
  },
  {
    model: '~moonshotai/kimi-latest',
    efforts: ['none', 'low', 'high', 'max'],
    defaultEffort: 'none',
  },
  {
    model: 'moonshotai/kimi-k3',
    efforts: ['none', 'low', 'high', 'max'],
    defaultEffort: 'none',
  },
] as const;

// Routers, non-reasoning models, or catalog entries without effort selection.
export const openRouterModelsWithoutEffortDefaults = [
  'openrouter/auto',
  'openrouter/auto-beta',
  'openrouter/fusion',
  'openai/gpt-4o',
  'openai/gpt-4.1-mini',
  'openai/gpt-4.1-nano',
  'anthropic/claude-haiku-4.5',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'z-ai/glm-4.7-flash',
  'z-ai/glm-4.5-air',
  'moonshotai/kimi-k2.7-code',
  'moonshotai/kimi-k2.5',
] as const;
