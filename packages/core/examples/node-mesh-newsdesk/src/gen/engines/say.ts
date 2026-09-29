import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeToWav } from '../audio.js';
import { runCommand } from '../process.js';
import type { SynthesisResult } from './types.js';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function assertVoiceAvailable(voice: string): Promise<void> {
  let output: Awaited<ReturnType<typeof runCommand>>;
  try {
    output = await runCommand('say', ['-v', '?']);
  } catch {
    throw new Error(
      'macOS say command is not available. This engine requires macOS.',
    );
  }
  if (!new RegExp(`^${escapeRegExp(voice)}\\s+`, 'm').test(output.stdout))
    throw new Error(`Voice "${voice}" is not installed.`);
}

/** Synthesize speech with the macOS `say` command. */
export async function synthesize(
  text: string,
  options: Record<string, unknown>,
  workDir: string,
): Promise<SynthesisResult> {
  await mkdir(workDir, { recursive: true });
  const voice = String(options.voice ?? 'Kyoko');
  const rateValue = Number(options.rate ?? 200);
  const rate = Number.isFinite(rateValue) ? rateValue : 200;
  await assertVoiceAvailable(voice);
  const textPath = path.join(workDir, 'input.txt');
  const aiffPath = path.join(workDir, 'voice.aiff');
  const wavPath = path.join(workDir, 'voice.wav');
  await writeFile(textPath, text, 'utf8');
  await runCommand('say', [
    '-v',
    voice,
    '-r',
    String(rate),
    '-f',
    textPath,
    '-o',
    aiffPath,
  ]);
  const durationSec = await normalizeToWav(aiffPath, wavPath);
  return { wavPath, durationSec };
}
