// Official OpenRouter /models snapshot checked on 2026-11-09.
// Expected values are independent of the provider implementation.
export const openRouterCatalogAdditions = [
  {
    model: '~openai/gpt-luna-latest',
    label: 'GPT Luna Latest',
    efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'none',
    withoutBudget: false,
  },
  {
    model: '~openai/gpt-terra-latest',
    label: 'GPT Terra Latest',
    efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'none',
    withoutBudget: false,
  },
  {
    model: '~deepseek/deepseek-flash-latest',
    label: 'DeepSeek Flash Latest (OpenRouter)',
    efforts: ['none', 'low', 'high', 'max'],
    defaultEffort: 'none',
    withoutBudget: false,
  },
  {
    model: '~z-ai/glm-flash-latest',
    label: 'GLM Flash Latest (OpenRouter)',
    efforts: ['low', 'high', 'max'],
    defaultEffort: 'low',
    withoutBudget: false,
  },
  {
    model: 'xiaomi/mimo-v2.6-pro',
    label: 'MiMo V2.6 Pro',
    efforts: [],
    defaultEffort: undefined,
    withoutBudget: true,
  },
  {
    model: 'tencent/hy4',
    label: 'Hy4',
    efforts: ['none', 'low', 'high'],
    defaultEffort: 'none',
    withoutBudget: false,
  },
  {
    model: 'cohere/command-a-plus',
    label: 'Command A+',
    efforts: [],
    defaultEffort: undefined,
    withoutBudget: true,
  },
  {
    model: 'bytedance-seed/seed-2-1-turbo',
    label: 'Seed 2.1 Turbo',
    efforts: [],
    defaultEffort: undefined,
    withoutBudget: true,
  },
  {
    model: 'nvidia/nemotron-3.5-super-vl',
    label: 'Nemotron 3.5 Super VL (Paid)',
    efforts: [],
    defaultEffort: undefined,
    withoutBudget: true,
  },
  {
    model: 'sakana/sakana-namazu',
    label: 'Sakana Namazu (OpenRouter)',
    efforts: ['none', 'high'],
    defaultEffort: 'none',
    withoutBudget: true,
  },
] as const;
