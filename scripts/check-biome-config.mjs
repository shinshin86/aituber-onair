import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cwd, exit } from 'node:process';

const repoRoot = cwd();
const rootConfigPath = join(repoRoot, 'biome.json');
const checkedKeys = [
  'formatter.enabled',
  'formatter.formatWithErrors',
  'formatter.indentStyle',
  'formatter.indentWidth',
  'formatter.lineWidth',
  'javascript.formatter.quoteStyle',
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function getValue(object, keyPath) {
  return keyPath.split('.').reduce((value, key) => value?.[key], object);
}

function findBiomeConfigs(dir) {
  const entries = readdirSync(dir);
  const results = [];

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') {
      continue;
    }

    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      results.push(...findBiomeConfigs(fullPath));
      continue;
    }

    if (entry === 'biome.json') {
      results.push(fullPath);
    }
  }

  return results;
}

const rootConfig = readJson(rootConfigPath);
const configPaths = findBiomeConfigs(join(repoRoot, 'packages'));
const errors = [];

for (const configPath of configPaths) {
  const config = readJson(configPath);
  const label = relative(repoRoot, configPath);

  for (const key of checkedKeys) {
    const expected = getValue(rootConfig, key);
    const actual = getValue(config, key);

    if (actual !== expected) {
      errors.push(
        `${label}: ${key} is ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error('Biome config common formatter settings are not aligned:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  exit(1);
}

console.log(`Checked ${configPaths.length} Biome config files.`);
