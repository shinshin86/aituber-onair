import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const schema = JSON.parse(
  await readFile(new URL('schema/biim-script.schema.json', root), 'utf8'),
);
const check = process.argv.includes('--check');

function typeOf(node) {
  if (node.$ref) return typeOf(schema.$defs[node.$ref.split('/').at(-1)]);
  if (node.const !== undefined) return JSON.stringify(node.const);
  if (node.enum) return node.enum.map((v) => JSON.stringify(v)).join(' / ');
  if (node.oneOf) return [...new Set(node.oneOf.map(typeOf))].join(' or ');
  if (node.type === 'array') return `array<${typeOf(node.items)}>`;
  return node.type ?? 'any';
}

function rows(node, prefix = '', context = '', forcedRequired = []) {
  const result = [];
  for (const [key, field] of Object.entries(node.properties ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    const oneOf = node.oneOf?.filter((branch) =>
      branch.required?.includes(key),
    ).length;
    const conditional = node.allOf?.some((branch) =>
      branch.then?.required?.includes(key),
    );
    const required =
      (node.required ?? []).includes(key) || forcedRequired.includes(key)
        ? 'yes'
        : oneOf || conditional
          ? 'conditional'
          : 'no';
    result.push({ path, context, field, required });
    result.push(...rows(field, path, context));
  }
  if (node.items && typeof node.items === 'object')
    result.push(...rows(node.items, `${prefix}[]`, context));
  if (
    node.additionalProperties &&
    typeof node.additionalProperties === 'object'
  )
    result.push(...rows(node.additionalProperties, `${prefix}.*`, context));
  for (const branch of node.oneOf ?? [])
    result.push(...rows(branch, prefix, context));
  for (const branch of node.allOf ?? []) {
    if (!branch.then) continue;
    const [key, condition] =
      Object.entries(branch.if?.properties ?? {})[0] ?? [];
    const label =
      key && condition.const !== undefined
        ? `${key}=${JSON.stringify(condition.const)}`
        : context;
    result.push(...rows(branch.then, prefix, label, branch.then.required));
  }
  return result;
}

function escapeMarkdown(text) {
  return String(text).replaceAll('|', '\\|').replaceAll('\n', ' ');
}
function constraints(field) {
  return [
    'minimum',
    'exclusiveMinimum',
    'maximum',
    'minLength',
    'minItems',
    'minProperties',
    'maxProperties',
    'pattern',
  ]
    .filter((key) => field[key] !== undefined)
    .map((key) => `${key}: ${JSON.stringify(field[key])}`)
    .join('; ');
}

function render(locale) {
  const ja = locale === 'ja';
  const title = ja
    ? '台本の全項目リファレンス'
    : 'Complete script field reference';
  const header = ja
    ? ['パス', '型・値', '必須', '既定値', '説明・制約・例']
    : [
        'Path',
        'Type / values',
        'Required',
        'Default',
        'Description, constraints and examples',
      ];
  const text = [
    `# ${title}`,
    '',
    ja
      ? '<!-- schema/biim-script.schema.jsonから生成。npm run docs:referenceで更新してください。 -->'
      : '<!-- Generated from schema/biim-script.schema.json. Run npm run docs:reference; do not edit by hand. -->',
    '',
    ja ? schema['x-description-ja'] : schema.description,
    '',
    ja
      ? '`*`は話者キー、`[]`は配列の要素です。「条件付き」は発話・素材の選択に依存し、詳細は説明に記載しています。継承・素材長などから決まる既定値は数値で挿入せず、説明に記載しています。'
      : '`*` means a speaker key; `[]` means an array element. Conditional requirements depend on the selected speech/content variant; see the description. Inherited or derived defaults are described rather than inserted as literal values.',
    '',
    ja
      ? '音声オプションはエンジンごとに分けています。sineは記載したキーだけ、aituber-voiceはCoreの追加キーを受け付けます。SchemaはCore提供元ごとの設定までは検証しません。'
      : 'Voice options are listed separately per engine. sine accepts only its listed keys; aituber-voice accepts additional Core option keys. Provider-specific Core settings are not validated by this schema.',
    '',
    `| ${header.join(' | ')} |`,
    '| --- | --- | --- | --- | --- |',
  ];
  for (const { path, context, field, required } of rows(schema)) {
    const desc = ja ? field['x-description-ja'] : field.description;
    if (!desc) throw new Error(`${path}: missing ${locale} description`);
    const examples = field.examples
      ? ` ${ja ? '例' : 'Examples'}: ${field.examples.map((v) => `\`${escapeMarkdown(JSON.stringify(v))}\``).join(', ')}.`
      : '';
    const constraint = constraints(field);
    const need = ja
      ? { yes: '必須', no: '任意', conditional: '条件付き' }[required]
      : required;
    text.push(
      `| \`${escapeMarkdown(path)}\`${context ? ` (${escapeMarkdown(context)})` : ''} | ${escapeMarkdown(typeOf(field))} | ${need} | ${field.default === undefined ? '—' : `\`${escapeMarkdown(JSON.stringify(field.default))}\``} | ${escapeMarkdown(desc)}${constraint ? ` ${escapeMarkdown(constraint)}.` : ''}${examples} |`,
    );
  }
  text.push('', `## ${ja ? '共有型' : 'Shared types'}`, '');
  for (const [key, field] of Object.entries(schema.$defs)) {
    text.push(
      `- \`${key}\`: ${ja ? field['x-description-ja'] : field.description} (${escapeMarkdown(typeOf(field))})`,
    );
  }
  return `${text.join('\n')}\n`;
}

await mkdir(new URL('docs/', root), { recursive: true });
for (const locale of ['en', 'ja']) {
  const name = locale === 'en' ? 'docs/reference.md' : 'docs/reference.ja.md';
  const file = new URL(name, root);
  const expected = render(locale);
  if (check) {
    const actual = await readFile(file, 'utf8').catch(() => '');
    if (actual !== expected)
      throw new Error(`${name} is out of date; run npm run docs:reference`);
  } else await writeFile(file, expected);
}
console.log(
  check
    ? 'Schema references are up to date.'
    : 'Generated docs/reference.md and docs/reference.ja.md.',
);
