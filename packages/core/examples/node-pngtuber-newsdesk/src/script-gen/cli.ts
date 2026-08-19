#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  type ApiProvider,
  requestScript,
  resolveApiKey,
  SUPPORTED_PROVIDERS,
} from './chat.js';
import { requestScriptViaCodex } from './codex.js';
import { ingestSource } from './ingest.js';
import { buildUserPrompt } from './prompt.js';
import { assertTokenProvenance, parseAndValidateScript } from './schema.js';
import { promptPath, resolveProjectRoot } from '../paths.js';
import type { NewsdeskScript } from '../types.js';

export type ScriptProvider = ApiProvider | 'codex-sdk';

export interface ScriptGenArgs {
  source: string | null;
  focus: string | null;
  output: string;
  provider: ScriptProvider | string;
  dryRun: boolean;
  help: boolean;
}

function takeValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || (value.startsWith('--') && value !== '-'))
    throw new Error(`${flag} requires a value.`);
  return value;
}

/** Parse script generation CLI arguments. */
export function parseArgs(argv: string[]): ScriptGenArgs {
  const args: ScriptGenArgs = {
    source: null,
    focus: null,
    output: 'script.json',
    provider: 'codex-sdk',
    dryRun: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--focus') args.focus = takeValue(argv, index++, argument);
    else if (argument === '--output')
      args.output = takeValue(argv, index++, argument);
    else if (argument === '--provider')
      args.provider = takeValue(argv, index++, argument);
    else if (argument === '--dry-run') args.dryRun = true;
    else if (argument === '--help' || argument === '-h') args.help = true;
    else if (argument.startsWith('--'))
      throw new Error(`Unknown argument: ${argument}`);
    else if (args.source === null) args.source = argument;
    else throw new Error(`Unexpected second input source: ${argument}`);
  }
  return args;
}

function usage(): string {
  return `Usage:
  npm run script-gen -- <file|URL|-> [--focus "..."] [--output <script.json>] \\
    [--provider codex-sdk|openai|claude|gemini] [--dry-run]`;
}

function validateArgs(args: ScriptGenArgs): asserts args is ScriptGenArgs & {
  source: string;
  provider: ScriptProvider;
} {
  if (!args.source) throw new Error('An input file, URL, or - is required.');
  const providers: ScriptProvider[] = [...SUPPORTED_PROVIDERS, 'codex-sdk'];
  if (!providers.includes(args.provider as ScriptProvider)) {
    throw new Error(
      `Unsupported provider "${args.provider}". Supported: ${providers.join(', ')}`,
    );
  }
}

/** Return the adjacent analysis JSON path for an output script path. */
export function analysisPathForOutput(outputPath: string): string {
  return outputPath.endsWith('.json')
    ? `${outputPath.slice(0, -'.json'.length)}.analysis.json`
    : `${outputPath}.analysis.json`;
}

/** Make the bundled avatar path relative to the requested script output. */
export function normalizeScriptForOutput(
  script: NewsdeskScript,
  outputPath: string,
): NewsdeskScript {
  const avatarPath = path.relative(
    path.dirname(outputPath),
    path.join(resolveProjectRoot(), 'assets', 'avatar'),
  );
  return { ...script, avatar: avatarPath.split(path.sep).join('/') };
}

/** Execute the script generation CLI. */
export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  validateArgs(args);

  const sourceText = await ingestSource(args.source);
  const systemPrompt = await readFile(promptPath(), 'utf8');
  const userPrompt = buildUserPrompt({ sourceText, focus: args.focus });

  console.log('Source text:');
  console.log(sourceText);

  if (args.dryRun) {
    console.log('\nSystem prompt:');
    console.log(systemPrompt.trim());
    console.log('\nUser input:');
    console.log(userPrompt);
    return;
  }

  const raw =
    args.provider === 'codex-sdk'
      ? await requestScriptViaCodex({ systemPrompt, userPrompt })
      : await requestScript({
          provider: args.provider,
          apiKey: resolveApiKey(args.provider),
          systemPrompt,
          userPrompt,
        });
  const generated = parseAndValidateScript(raw);
  assertTokenProvenance(generated.script, sourceText, args.focus ?? '');

  const outputPath = path.resolve(args.output);
  const analysisPath = analysisPathForOutput(outputPath);
  const script = normalizeScriptForOutput(generated.script, outputPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await Promise.all([
    writeFile(outputPath, `${JSON.stringify(script, null, 2)}\n`, 'utf8'),
    writeFile(
      analysisPath,
      `${JSON.stringify(generated.analysis, null, 2)}\n`,
      'utf8',
    ),
  ]);
  console.log(
    `Wrote ${path.relative(process.cwd(), outputPath) || path.basename(outputPath)}`,
  );
  console.log(
    `Wrote ${path.relative(process.cwd(), analysisPath) || path.basename(analysisPath)}`,
  );
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}
