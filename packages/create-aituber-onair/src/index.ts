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
        options.downloadAssets,
      )
    : {
        targetDir: options.targetDir ?? 'my-aituber',
        template: options.template ?? 'pngtuber',
        install: options.install ?? false,
        downloadAssets:
          options.downloadAssets ?? options.template === 'inochi2d',
      };

  const result = await createProject({
    cwd: process.cwd(),
    targetDir: answers.targetDir,
    template: answers.template,
    install: answers.install,
    downloadAssets: answers.downloadAssets,
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

  if (result.template === 'inochi2d') {
    console.log('');
    if (result.assetDownload.succeeded) {
      console.log('Inochi2D setup: Aka sample model downloaded.');
    } else if (result.assetDownload.attempted) {
      console.warn(
        `Inochi2D sample model download failed: ${result.assetDownload.error}`,
      );
      console.log('Retry later with: npm run setup:sample-model');
    } else {
      console.log('Inochi2D setup:');
      console.log(
        '  Run npm run setup:sample-model to download the Aka sample.',
      );
    }
  }

  if (result.template === 'live2d') {
    console.log('');
    console.log('Live2D setup:');
    console.log(
      '  1. Place your Live2D model folder under models/<model-name>/',
    );
    console.log('  2. Place live2dcubismcore.min.js under public/scripts/');
    console.log('See README.md for Live2D license and setup notes.');
  }
}

async function promptForMissingOptions(
  initialTargetDir: string | undefined,
  initialTemplate: TemplateId | undefined,
  initialInstall: boolean | undefined,
  initialDownloadAssets: boolean | undefined,
): Promise<{
  targetDir: string;
  template: TemplateId;
  install: boolean;
  downloadAssets: boolean;
}> {
  const rl = createInterface({ input, output });

  try {
    const targetDir =
      initialTargetDir ??
      ((await rl.question('Project name: ', {
        signal: AbortSignal.timeout(300000),
      })) ||
        'my-aituber');

    const template = initialTemplate ?? (await promptForTemplate(rl));
    const downloadAssets =
      template === 'inochi2d'
        ? (initialDownloadAssets ?? (await promptForAssetDownload(rl)))
        : false;
    const install = initialInstall ?? (await promptForInstall(rl));

    return {
      targetDir,
      template,
      install,
      downloadAssets,
    };
  } finally {
    rl.close();
  }
}

async function promptForAssetDownload(
  rl: ReturnType<typeof createInterface>,
): Promise<boolean> {
  const answer =
    (await rl.question('Download the Aka sample model? (Y/n): ', {
      signal: AbortSignal.timeout(300000),
    })) || 'yes';

  return !['n', 'no'].includes(answer.trim().toLowerCase());
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
