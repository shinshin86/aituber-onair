export const TEMPLATE_IDS = ['pngtuber', 'vrm', 'live2d', 'pet'] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  pngtuber: {
    id: 'pngtuber',
    name: 'PNGTuber 2D',
    description: '2D PNG avatar app with bundled avatar image assets',
  },
  vrm: {
    id: 'vrm',
    name: 'VRM 3D',
    description: '3D VRM avatar app with bundled VRM and idle animation assets',
  },
  live2d: {
    id: 'live2d',
    name: 'Live2D',
    description: 'Live2D avatar app without bundled Live2D model assets',
  },
  pet: {
    id: 'pet',
    name: 'Pet Chat',
    description: 'Animated pet app with bundled Miko pet assets',
  },
};

export function isTemplateId(value: string): value is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value);
}
