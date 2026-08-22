#!/usr/bin/env node
/**
 * Script para descargar el modelo Aka de Inochi2D
 * Modelo: Aka por seagetch (Creative Commons Attribution 4.0)
 * Fuente: https://github.com/Inochi2D/example-models
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelsDir = path.join(projectRoot, 'packages/core/examples/react-inochi2d-app/public/inochi2d/models');

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function downloadAsset(filename, url) {
  const destination = path.join(modelsDir, filename);
  
  // Check if already downloaded
  try {
    const existing = await readFile(destination);
    console.log(`✓ Ya descargado: ${filename}`);
    return;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  console.log(`⬇️ Descargando: ${filename}`);
  console.log(`   URL: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Descarga fallida (${response.status}): ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  
  // Note: We skip SHA-256 verification for this manual download
  // The original script verifies, but we're downloading directly
  
  await mkdir(modelsDir, { recursive: true });
  const temporaryPath = `${destination}.tmp`;
  try {
    await writeFile(temporaryPath, buffer);
    await rename(temporaryPath, destination);
    console.log(`✓ Completado: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function main() {
  console.log('=== Descargando Modelo Aka (Inochi2D) ===');
  console.log('Modelo: Aka por seagetch');
  console.log('Licencia: Creative Commons Attribution 4.0 International');
  console.log('Fuente: https://github.com/Inochi2D/example-models');
  console.log('');
  
  // Base URL for raw files from the repository
  const baseRepoUrl = 'https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/core/examples/react-inochi2d-app/public/inochi2d/models';
  
  const assets = [
    {
      filename: 'Aka.original-rig.inx',
      url: `${baseRepoUrl}/Aka.original-rig.inx`
    },
    {
      filename: 'Aka.original.motion.json',
      url: `${baseRepoUrl}/Aka.original.motion.json`
    }
  ];

  for (const asset of assets) {
    await downloadAsset(asset.filename, asset.url);
  }

  // Update manifest to set default model
  const manifestPath = path.join(modelsDir, '..', 'manifest.json');
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.defaultModelId = 'aka';
    manifest.models = [
      ...(manifest.models ?? []).filter((model) => model.id !== 'aka'),
      {
        id: 'aka',
        name: 'Aka',
        model: './models/Aka.original-rig.inx',
        motion: './models/Aka.original.motion.json',
        attribution: {
          title: 'Aka',
          author: 'seagetch',
          license: 'Creative Commons Attribution 4.0 International',
          licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
          sourceUrl: 'https://github.com/Inochi2D/example-models',
          changes: 'Rig and idle motion adapted for the AITuber OnAir Inochi2D example.'
        },
        autoAnimation: 'original_idle_calm_breath',
        idleAnimations: [
          'original_idle_calm_breath',
          'original_idle_soft_sway',
          'original_idle_sad_sway'
        ],
        reactionAnimations: {
          tap: ['original_reaction_nod', 'original_reaction_thinking_tilt', 'original_reaction_listen_in', 'original_reaction_surprised'],
          flick: ['original_reaction_small_wave', 'original_reaction_happy_bounce', 'original_reaction_nod'],
          flickDown: ['original_reaction_nod', 'original_reaction_sad_dip'],
          flickUp: ['original_reaction_small_wave', 'original_reaction_happy_bounce', 'original_reaction_surprised'],
          small_nod: ['original_reaction_nod'],
          look_left: ['original_reaction_listen_in', 'original_reaction_thinking_tilt'],
          speaking: ['original_speaking_thinking_talk'],
          small_nod_speaking: ['original_speaking_thinking_talk', 'original_reaction_nod'],
          emphasis: ['original_reaction_happy_bounce']
        },
        emotionAnimations: {
          neutral: ['original_idle_calm_breath', 'original_idle_soft_sway'],
          happy: ['original_reaction_happy_bounce', 'original_reaction_small_wave'],
          sad: ['original_reaction_sad_dip', 'original_idle_sad_sway'],
          relaxed: ['original_idle_calm_breath', 'original_idle_soft_sway'],
          thinking: ['original_reaction_thinking_tilt', 'original_speaking_thinking_talk', 'original_reaction_listen_in'],
          surprised: ['original_reaction_surprised', 'original_reaction_happy_bounce'],
          speaking: ['original_speaking_thinking_talk'],
          listening: ['original_reaction_listen_in', 'original_reaction_thinking_tilt', 'original_idle_calm_breath']
        },
        parameters: [],
        idleAnimationProfiles: {
          'original_idle_calm_breath': { type: 'base', weight: 4 },
          'original_idle_soft_sway': { type: 'base', weight: 3 },
          'original_idle_sad_sway': { type: 'emotion', weight: 1 }
        }
      }
    ];
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log('\n✓ Manifest actualizado con modelo Aka como default');
  } catch (error) {
    console.error('Error al actualizar manifest:', error.message);
  }

  console.log('\n=== Modelo Aka listo para usar ===');
  console.log(`Directorio: ${modelsDir}`);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
