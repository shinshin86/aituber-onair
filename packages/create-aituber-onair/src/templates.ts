import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEMPLATE_IDS = [
  'pngtuber',
  'vrm',
  'live2d',
  'pet',
  'purupuru',
  'psd',
  'inochi2d',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
}

interface TemplateManifest {
  templates: Array<TemplateDefinition & { id: string }>;
}

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const manifest = JSON.parse(
  readFileSync(path.join(packageRoot, 'template-manifest.json'), 'utf8'),
) as TemplateManifest;
const manifestIds = manifest.templates.map((template) => template.id);

if (
  manifestIds.length !== TEMPLATE_IDS.length ||
  TEMPLATE_IDS.some((id, index) => id !== manifestIds[index])
) {
  throw new Error('template-manifest.json and TEMPLATE_IDS are out of sync.');
}

export const TEMPLATES = Object.fromEntries(
  manifest.templates.map(({ id, name, description }) => [
    id,
    { id, name, description },
  ]),
) as Record<TemplateId, TemplateDefinition>;

export function isTemplateId(value: string): value is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value);
}
