#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  CliError,
  createProject,
  helpText,
  parseArgs,
  parseTemplateId,
} from './lib.js';
import { TEMPLATES, type TemplateId } from './templates.js';

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  const shouldPrompt = !options.yes && process.stdin.isTTY;
  const answers = shouldPrompt
    ? await promptForMissingOptions(
        options.targetDir,
        options.template,
        options.install,
      )
    : {
        targetDir: options.targetDir ?? 'my-aituber',
        template: options.template ?? 'pngtuber',
        install: options.install ?? false,
      };

  const result = await createProject({
    cwd: process.cwd(),
    targetDir: answers.targetDir,
    template: answers.template,
    install: answers.install,
  });

  console.log('');
  console.log(
    `Created ${TEMPLATES[result.template].name} app in ${result.projectDir}`,
  );
  console.log('');

  if (!answers.install) {
    console.log('Next steps:');
    console.log(`  cd ${answers.targetDir}`);
    console.log('  npm install');
    console.log('  npm run dev');
  } else {
    console.log('Next steps:');
    console.log(`  cd ${answers.targetDir}`);
    console.log('  npm run dev');
  }

  console.log('');
  console.log('After launch, open Settings and configure your LLM / TTS keys.');
}

async function promptForMissingOptions(
  initialTargetDir: string | undefined,
  initialTemplate: TemplateId | undefined,
  initialInstall: boolean | undefined,
): Promise<{ targetDir: string; template: TemplateId; install: boolean }> {
  const rl = createInterface({ input, output });

  try {
    const targetDir =
      initialTargetDir ??
      ((await rl.question('Project name: ', {
        signal: AbortSignal.timeout(300000),
      })) ||
        'my-aituber');

    const template = initialTemplate ?? (await promptForTemplate(rl));
    const install = initialInstall ?? (await promptForInstall(rl));

    return {
      targetDir,
      template,
      install,
    };
  } finally {
    rl.close();
  }
}

async function promptForTemplate(
  rl: ReturnType<typeof createInterface>,
): Promise<TemplateId> {
  console.log('Templates:');
  for (const template of Object.values(TEMPLATES)) {
    console.log(`  ${template.id}: ${template.name} - ${template.description}`);
  }

  const templateAnswer =
    (await rl.question('Template (pngtuber): ', {
      signal: AbortSignal.timeout(300000),
    })) || 'pngtuber';

  return parseTemplateId(templateAnswer.trim());
}

async function promptForInstall(
  rl: ReturnType<typeof createInterface>,
): Promise<boolean> {
  const installAnswer =
    (await rl.question('Install dependencies now? (Y/n): ', {
      signal: AbortSignal.timeout(300000),
    })) || 'yes';

  return !['n', 'no'].includes(installAnswer.trim().toLowerCase());
}

main().catch((error) => {
  if (error instanceof CliError) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  throw error;
});
