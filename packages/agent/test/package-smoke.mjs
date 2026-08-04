import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryDirectory = resolve(packageDirectory, '..', '..');
const chatDirectory = resolve(repositoryDirectory, 'packages', 'chat');
const temporaryDirectory = await mkdtemp(
  join(tmpdir(), 'aituber-onair-agent-package-smoke-')
);
const cacheDirectory = join(temporaryDirectory, 'npm-cache');
const tarballDirectory = join(temporaryDirectory, 'tarballs');
const consumerDirectory = join(temporaryDirectory, 'consumer');
const commandEnvironment = {
  ...process.env,
  npm_config_cache: cacheDirectory,
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryDirectory,
    encoding: 'utf8',
    env: commandEnvironment,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `${command} ${args.join(' ')} failed with status ${result.status}.`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  return result.stdout;
}

function pack(directory, expectedName) {
  const output = run('npm', [
    'pack',
    directory,
    '--pack-destination',
    tarballDirectory,
    '--json',
  ]);
  const records = JSON.parse(output);

  assert.equal(records.length, 1);
  assert.equal(records[0].name, expectedName);
  return {
    path: join(tarballDirectory, records[0].filename),
    files: records[0].files.map((file) => file.path),
  };
}

function assertCodexEntryExcluded(metafile, label) {
  const inputs = Object.keys(metafile.inputs);
  assert.ok(
    inputs.some((input) => input.includes('@aituber-onair/agent')),
    `${label} must include the Agent package`
  );
  assert.ok(
    inputs.every((input) => !input.includes('codex-app-server')),
    `${label} must not include the Codex app-server entry point`
  );
}

try {
  await mkdir(tarballDirectory, { recursive: true });
  await mkdir(consumerDirectory, { recursive: true });

  const agentPackage = pack(packageDirectory, '@aituber-onair/agent');
  const chatPackage = pack(chatDirectory, '@aituber-onair/chat');

  assert.ok(agentPackage.files.includes('CHANGELOG.md'));
  assert.ok(agentPackage.files.includes('README.md'));
  assert.ok(agentPackage.files.includes('README.ja.md'));
  assert.ok(agentPackage.files.includes('dist/esm/index.js'));
  assert.ok(agentPackage.files.includes('dist/cjs/index.js'));
  assert.ok(agentPackage.files.every((file) => !file.startsWith('src/')));

  await writeFile(
    join(consumerDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'agent-package-smoke',
        private: true,
        type: 'module',
        dependencies: {
          '@aituber-onair/agent': `file:${agentPackage.path}`,
          '@aituber-onair/chat': `file:${chatPackage.path}`,
        },
      },
      null,
      2
    )}\n`
  );

  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--offline'],
    { cwd: consumerDirectory }
  );

  await writeFile(
    join(consumerDirectory, 'esm.mjs'),
    `
import assert from 'node:assert/strict';
import * as agent from '@aituber-onair/agent';
import * as chat from '@aituber-onair/agent/chat';
import * as codex from '@aituber-onair/agent/codex-app-server';

assert.equal(typeof agent.createAgent, 'function');
assert.equal(typeof agent.defineAgentTool, 'function');
assert.equal(typeof chat.createChatServiceBackend, 'function');
assert.equal(typeof codex.createCodexAppServerBackend, 'function');
assert.equal(codex.CODEX_APP_SERVER_SUPPORTED_VERSION, '0.145.0');
assert.equal(codex.CODEX_APP_SERVER_SCHEMA_VERSION, 'v2@0.145.0');
`
  );
  await writeFile(
    join(consumerDirectory, 'cjs.cjs'),
    `
const assert = require('node:assert/strict');
const agent = require('@aituber-onair/agent');
const chat = require('@aituber-onair/agent/chat');
const codex = require('@aituber-onair/agent/codex-app-server');

assert.equal(typeof agent.createAgent, 'function');
assert.equal(typeof agent.defineAgentTool, 'function');
assert.equal(typeof chat.createChatServiceBackend, 'function');
assert.equal(typeof codex.createCodexAppServerBackend, 'function');
assert.equal(codex.CODEX_APP_SERVER_SUPPORTED_VERSION, '0.145.0');
assert.equal(codex.CODEX_APP_SERVER_SCHEMA_VERSION, 'v2@0.145.0');
`
  );

  run(process.execPath, ['esm.mjs'], { cwd: consumerDirectory });
  run(process.execPath, ['cjs.cjs'], { cwd: consumerDirectory });

  await writeFile(
    join(consumerDirectory, 'readme-contracts.ts'),
    `
import { ChatServiceFactory } from '@aituber-onair/chat';
import {
  createAgent,
  defineAgentTool,
  type AgentBackend,
  type AgentPolicyConfig,
  type AgentWorkspaceMetadata,
  type AgentWorkspaceMetadataStore,
} from '@aituber-onair/agent';
import { createChatServiceBackend } from '@aituber-onair/agent/chat';
import {
  CODEX_APP_SERVER_SCHEMA_VERSION,
  CODEX_APP_SERVER_SUPPORTED_VERSION,
  createCodexAppServerBackend,
} from '@aituber-onair/agent/codex-app-server';

const analyzeComments = defineAgentTool({
  id: 'comments.analyze',
  definition: {
    name: 'comments_analyze',
    description: 'Analyze comments',
    parameters: {
      type: 'object',
      properties: { comments: { type: 'array', items: { type: 'string' } } },
      required: ['comments'],
      additionalProperties: false,
    },
  },
  risk: 'read',
  execute: ({ comments }: { comments: string[] }) => ({ count: comments.length }),
});

export function createStreamStaff(apiKey: string) {
  const backend = createChatServiceBackend({
    provider: 'openai',
    createChatService: ({ tools }) =>
      ChatServiceFactory.createChatService('openai', { apiKey, tools }),
  });

  return createAgent({
    id: 'stream-staff-miko',
    brief: 'You are Miko, AI staff responsible for stream operations.',
    backend,
    tools: [analyzeComments],
    policy: {
      defaultDecision: 'deny',
      allowTools: ['comments.analyze'],
    },
  });
}

declare const agent: ReturnType<typeof createStreamStaff>;
declare const viewerComment: string;

async function runPublicSession() {
  const publicSession = await agent.startSession({
    purpose: 'Respond to public comments',
    audience: 'public',
    inputTrust: 'untrusted',
    allowedTools: ['comments.analyze'],
  });
  return publicSession.run({
    instruction: 'Respond only when a reply is useful.',
    input: {
      kind: 'viewer-comment',
      data: { text: viewerComment },
    },
  });
}

const workspaceRecords = new Map<string, AgentWorkspaceMetadata>();
const workspaceMetadata = {
  async load(agentId) {
    return workspaceRecords.get(agentId);
  },
  async save(metadata, expectedRevision) {
    const currentRevision = workspaceRecords.get(metadata.agentId)?.revision ?? 0;
    if (currentRevision !== expectedRevision) {
      throw new Error('Workspace metadata changed concurrently.');
    }
    workspaceRecords.set(metadata.agentId, metadata);
  },
} satisfies AgentWorkspaceMetadataStore;

const workspaceRead = defineAgentTool({
  id: 'workspace.read',
  definition: {
    name: 'workspace_read',
    description: 'Read character workspace state',
    parameters: { type: 'object', additionalProperties: false },
  },
  risk: 'read',
  execute: () => ({ notes: [] }),
});
const workspaceWrite = defineAgentTool({
  id: 'workspace.write',
  definition: {
    name: 'workspace_write',
    description: 'Write character workspace state',
    parameters: { type: 'object', additionalProperties: false },
  },
  risk: 'write',
  execute: () => ({ saved: true }),
});
declare const backend: AgentBackend;
const policy: AgentPolicyConfig = {
  defaultDecision: 'deny',
  allowTools: ['workspace.read', 'workspace.write'],
};
const workspaceAgent = createAgent({
  id: 'stream-staff-miko',
  brief: 'You are Miko, AI staff responsible for stream operations.',
  backend,
  tools: [workspaceRead, workspaceWrite],
  capabilityCatalog: [
    {
      id: 'workspace.local',
      kind: 'workspace',
      description: 'A workspace limited to this character',
      requiredTools: ['workspace.read', 'workspace.write'],
      limits: [{ name: 'maxBytes', value: 1_000_000, unit: 'bytes' }],
    },
  ],
  policy,
});
const bootstrap = workspaceAgent.bootstrap({
  workspace: workspaceMetadata,
  version: 'stream-operations-v1',
  allowedTools: ['workspace.read', 'workspace.write'],
  allowedCapabilities: ['workspace.local'],
  context: {
    trust: 'trusted',
    data: { product: 'stream-dashboard' },
  },
});

const codexBackend = createCodexAppServerBackend({
  allowPathLookup: true,
  workingDirectory: '/path/to/character-workspace',
  compatibility: {
    expectedVersion: CODEX_APP_SERVER_SUPPORTED_VERSION,
    schemaVersion: CODEX_APP_SERVER_SCHEMA_VERSION,
  },
  sandbox: 'read-only',
  approvalPolicy: 'on-request',
});
const codexAgent = createAgent({
  id: 'stream-operations-staff',
  brief: 'You are AI staff responsible for monitoring stream operations.',
  backend: codexBackend,
});
async function runCodexStaff() {
  const session = await codexAgent.startSession({
    purpose: 'Review the latest stream report',
    audience: 'owner',
    inputTrust: 'trusted',
  });
  try {
    for await (const event of session.runStream({
      instruction: 'Inspect the workspace and summarize issues.',
    })) {
      if (event.type === 'approval.requested') {
        await session.resolveApproval(event.request.id, 'deny');
      }
    }
  } finally {
    await session.close();
    await codexAgent.close();
  }
}

const operatorInbox = new Set<{ question: string }>();
const askOperator = defineAgentTool({
  id: 'human.ask',
  definition: {
    name: 'human_ask',
    description: 'Add a question to the operator review inbox',
    parameters: {
      type: 'object',
      properties: { question: { type: 'string' } },
      required: ['question'],
      additionalProperties: false,
    },
  },
  risk: 'write',
  execute: ({ question }: { question: string }) =>
    operatorInbox.add({ question }),
});

void runPublicSession;
void bootstrap;
void askOperator;
void codexBackend;
void runCodexStaff;
`
  );

  const typescriptCli = require.resolve('typescript/bin/tsc');
  run(
    process.execPath,
    [
      typescriptCli,
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--target',
      'ES2020',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--lib',
      'ES2020,DOM',
      'readme-contracts.ts',
    ],
    { cwd: consumerDirectory }
  );

  await writeFile(
    join(consumerDirectory, 'browser-base.mjs'),
    `
import { createAgent } from '@aituber-onair/agent';
globalThis.__agentCreateAgent = createAgent;
`
  );
  await writeFile(
    join(consumerDirectory, 'browser-chat.mjs'),
    `
import { createAgent } from '@aituber-onair/agent';
import { createChatServiceBackend } from '@aituber-onair/agent/chat';
globalThis.__agentExports = { createAgent, createChatServiceBackend };
`
  );

  const baseBundle = await build({
    absWorkingDir: consumerDirectory,
    bundle: true,
    entryPoints: ['browser-base.mjs'],
    format: 'esm',
    metafile: true,
    platform: 'browser',
    write: false,
  });
  const chatBundle = await build({
    absWorkingDir: consumerDirectory,
    bundle: true,
    entryPoints: ['browser-chat.mjs'],
    format: 'esm',
    metafile: true,
    platform: 'browser',
    write: false,
  });

  assertCodexEntryExcluded(baseBundle.metafile, 'base browser bundle');
  assertCodexEntryExcluded(chatBundle.metafile, 'Chat browser bundle');
  assert.ok(
    Object.keys(baseBundle.metafile.inputs).every(
      (input) => !input.includes('@aituber-onair/chat')
    ),
    'the base browser bundle must not include @aituber-onair/chat'
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
