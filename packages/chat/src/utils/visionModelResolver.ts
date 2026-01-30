type VisionModelValidationMode = 'none' | 'explicit' | 'resolved';

export type VisionModelResolutionOptions = {
  model?: string;
  visionModel?: string;
  defaultModel: string;
  defaultVisionModel: string;
  supportsVisionForModel: (model: string) => boolean;
  validate?: VisionModelValidationMode;
};

export const resolveVisionModel = (
  options: VisionModelResolutionOptions,
): string => {
  const baseModel = options.model ?? options.defaultModel;
  const resolved =
    options.visionModel ??
    (options.supportsVisionForModel(baseModel)
      ? baseModel
      : options.defaultVisionModel);

  if (
    options.validate === 'explicit' &&
    options.visionModel &&
    !options.supportsVisionForModel(options.visionModel)
  ) {
    throw new Error(
      `Model ${options.visionModel} does not support vision capabilities.`,
    );
  }

  if (
    options.validate === 'resolved' &&
    !options.supportsVisionForModel(resolved)
  ) {
    throw new Error(
      `Model ${resolved} does not support vision capabilities.`,
    );
  }

  return resolved;
};
