import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const rootPackage = await readPackageJson(
  path.join(repositoryRoot, 'package.json'),
);
const workspaceDirectories = await resolveWorkspaceDirectories(
  rootPackage.workspaces ?? [],
);
const workspaces = await Promise.all(
  workspaceDirectories.map(async (directory) => ({
    directory,
    package: await readPackageJson(path.join(directory, 'package.json')),
  })),
);
const workspacesByName = new Map(
  workspaces.map((workspace) => [workspace.package.name, workspace]),
);
const buildOrder = resolveBuildOrder(workspaces, workspacesByName);

for (const workspace of buildOrder) {
  if (!workspace.package.scripts?.build) continue;
  await runWorkspaceBuild(workspace.package.name);
}

async function resolveWorkspaceDirectories(patterns) {
  const directories = [];
  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) {
      const parent = path.join(repositoryRoot, pattern.slice(0, -2));
      const entries = await readdir(parent, { withFileTypes: true });
      directories.push(
        ...entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => path.join(parent, entry.name)),
      );
      continue;
    }
    directories.push(path.join(repositoryRoot, pattern));
  }
  return [...new Set(directories)].sort();
}

function resolveBuildOrder(allWorkspaces, byName) {
  const visiting = new Set();
  const visited = new Set();
  const order = [];

  const visit = (workspace) => {
    const name = workspace.package.name;
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`Workspace dependency cycle detected at ${name}.`);
    }

    visiting.add(name);
    for (const dependencyName of getWorkspaceDependencies(workspace.package)) {
      const dependency = byName.get(dependencyName);
      if (dependency) visit(dependency);
    }
    visiting.delete(name);
    visited.add(name);
    order.push(workspace);
  };

  for (const workspace of allWorkspaces) visit(workspace);
  return order;
}

function getWorkspaceDependencies(packageJson) {
  return [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ].sort();
}

async function runWorkspaceBuild(workspaceName) {
  console.log(`\nBuilding ${workspaceName}`);
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      command,
      ['run', 'build', '--workspace', workspaceName],
      {
        cwd: repositoryRoot,
        stdio: 'inherit',
      },
    );
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) {
        reject(
          new Error(`Build for ${workspaceName} stopped by signal ${signal}.`),
        );
        return;
      }
      resolve(code ?? 1);
    });
  });

  if (exitCode !== 0) {
    throw new Error(`Build for ${workspaceName} failed with code ${exitCode}.`);
  }
}

async function readPackageJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}
