import { allModels } from '../src/components/ProviderSelector';

// Deliberately broad fixture metadata: these existing regression tests exercise
// the SDK's narrower model-specific capabilities. No live API calls are made.
export const catalogFixture = {
  data: allModels
    .filter((model) => model.provider === 'openrouter')
    .map((model) => ({
      id: model.id,
      name: model.name,
      architecture: {
        input_modalities: ['text', 'image'],
        output_modalities: ['text'],
      },
      pricing: { prompt: '0', completion: '0' },
      supported_parameters: ['reasoning'],
      reasoning: {
        supported_efforts: [
          'none',
          'minimal',
          'low',
          'medium',
          'high',
          'xhigh',
          'max',
        ],
      },
    })),
};
