import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATES, type TemplateId, isTemplateId } from './templates.js';

const DEFAULT_PROJECT_NAME = 'my-aituber';
const DEFAULT_TEMPLATE_ID: TemplateId = 'pngtuber';
const CORE_VERSION = '0.26.3';

export interface CliOptions {
  targetDir?: string;
  template?: TemplateId;
  install?: boolean;
  yes?: boolean;
  help?: boolean;
}

export interface CreateProjectOptions {
  cwd: string;
  targetDir: string;
  template: TemplateId;
  install: boolean;
  templateRoot?: string;
  runCommand?: (command: string, args: string[], cwd: string) => Promise<void>;
}

export interface CreateProjectResult {
  projectDir: string;
  packageName: string;
  template: TemplateId;
}

export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
      continue;
    }

    if (arg === '--install') {
      options.install = true;
      continue;
    }

    if (arg === '--no-install') {
      options.install = false;
      continue;
    }

    if (arg === '--template' || arg === '-t') {
      const template = argv[index + 1];
      if (!template) {
        throw new CliError('Missing value for --template.');
      }
      options.template = parseTemplateId(template);
      index += 1;
      continue;
    }

    if (arg.startsWith('--template=')) {
      options.template = parseTemplateId(arg.slice('--template='.length));
      continue;
    }

    if (arg.startsWith('-')) {
      throw new CliError(`Unknown option: ${arg}`);
    }

    positional.push(arg);
  }

  if (positional.length > 1) {
    throw new CliError('Only one project directory can be specified.');
  }

  options.targetDir = positional[0];
  return options;
}

export function parseTemplateId(value: string): TemplateId {
  if (isTemplateId(value)) {
    return value;
  }

  const choices = Object.keys(TEMPLATES).join(', ');
  throw new CliError(`Unknown template "${value}". Choose one of: ${choices}.`);
}

export function defaultTemplateRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..', 'templates');
}

export function resolveTargetDir(cwd: string, targetDir?: string): string {
  return path.resolve(cwd, targetDir ?? DEFAULT_PROJECT_NAME);
}

export function toPackageName(targetDir: string): string {
  const baseName =
    path.basename(path.resolve(targetDir)) || DEFAULT_PROJECT_NAME;
  const normalized = baseName
    .trim()
    .toLowerCase()
    .replace(/^[._]+/, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || DEFAULT_PROJECT_NAME;
}

export async function assertDirectoryIsWritable(
  targetDir: string,
): Promise<void> {
  try {
    const targetStat = await stat(targetDir);
    if (!targetStat.isDirectory()) {
      throw new CliError(
        `Target path already exists and is not a directory: ${targetDir}`,
      );
    }

    const entries = await readdir(targetDir);
    const visibleEntries = entries.filter((entry) => entry !== '.DS_Store');
    if (visibleEntries.length > 0) {
      throw new CliError(`Target directory is not empty: ${targetDir}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

export async function createProject(
  options: CreateProjectOptions,
): Promise<CreateProjectResult> {
  const projectDir = resolveTargetDir(options.cwd, options.targetDir);
  const packageName = toPackageName(projectDir);
  const templateRoot = options.templateRoot ?? defaultTemplateRoot();
  const sourceDir = path.join(templateRoot, options.template);

  await assertDirectoryIsWritable(projectDir);
  await mkdir(projectDir, { recursive: true });
  await copyTemplate(sourceDir, projectDir);
  await restoreTemplateDotfiles(projectDir);
  await updatePackageJson(projectDir, packageName, options.template);

  if (options.install) {
    const runCommand = options.runCommand ?? defaultRunCommand;
    await runCommand('npm', ['install'], projectDir);
  }

  return {
    projectDir,
    packageName,
    template: options.template,
  };
}

export function helpText(): string {
  return `create-aituber-onair

Usage:
  create-aituber-onair [project-directory] [options]

Options:
  -t, --template <name>  Template to use: pngtuber, vrm, live2d, pet
      --install          Run npm install after creating the project
      --no-install       Do not run npm install
  -y, --yes              Use defaults for omitted values
  -h, --help             Show this help
`;
}

async function copyTemplate(
  sourceDir: string,
  projectDir: string,
): Promise<void> {
  await cp(sourceDir, projectDir, {
    recursive: true,
    filter: (source) => {
      const baseName = path.basename(source);
      return (
        baseName !== 'node_modules' &&
        baseName !== 'dist' &&
        baseName !== 'package-lock.json' &&
        baseName !== '.gitignore' &&
        baseName !== '.DS_Store'
      );
    },
  });
}

async function restoreTemplateDotfiles(projectDir: string): Promise<void> {
  const gitignoreTemplatePath = path.join(projectDir, '_gitignore');
  const gitignorePath = path.join(projectDir, '.gitignore');

  try {
    await rename(gitignoreTemplatePath, gitignorePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function updatePackageJson(
  projectDir: string,
  packageName: string,
  template: TemplateId,
): Promise<void> {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const rawPackageJson = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(rawPackageJson) as {
    name?: string;
    version?: string;
    private?: boolean;
    dependencies?: Record<string, string>;
  };

  packageJson.name = packageName;
  packageJson.version = '0.0.0';
  packageJson.private = true;
  packageJson.dependencies = {
    ...packageJson.dependencies,
    '@aituber-onair/core': `^${CORE_VERSION}`,
  };

  if (template === 'vrm') {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      '@pixiv/three-vrm': '^1.0.9',
      three: '^0.151.3',
    };
  }

  if (template === 'live2d') {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      'pixi-live2d-display-lipsyncpatch':
        'github:shinshin86/pixi-live2d-display-lipsyncpatch#release/v0.5.0-ls-7-noMaskFix',
      'pixi.js': '^7.4.3',
    };
  }

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function defaultRunCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  const { spawn } = await import('node:child_process');

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new CliError(`${command} ${args.join(' ')} failed with code ${code}.`),
      );
    });
  });
}
