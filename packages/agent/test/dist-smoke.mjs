import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const esmBase = await import('@aituber-onair/agent');
const esmChat = await import('@aituber-onair/agent/chat');
const esmCodex = await import('@aituber-onair/agent/codex-app-server');
const cjsBase = require('@aituber-onair/agent');
const cjsChat = require('@aituber-onair/agent/chat');
const cjsCodex = require('@aituber-onair/agent/codex-app-server');

assert.equal(typeof esmBase.AgentError, 'function');
assert.equal(typeof cjsBase.AgentError, 'function');
assert.equal(typeof esmBase.createAgent, 'function');
assert.equal(typeof cjsBase.createAgent, 'function');
assert.equal(typeof esmChat.createChatServiceBackend, 'function');
assert.equal(typeof cjsChat.createChatServiceBackend, 'function');
assert.equal(typeof esmCodex.createCodexAppServerBackend, 'function');
assert.equal(typeof cjsCodex.createCodexAppServerBackend, 'function');
for (const codex of [esmCodex, cjsCodex]) {
  assert.equal(codex.CODEX_APP_SERVER_VERIFIED_VERSION, '0.145.0');
  assert.equal(codex.CODEX_APP_SERVER_MINIMUM_VERSION, '0.136.0');
  assert.equal(codex.CODEX_APP_SERVER_PROTOCOL_GENERATION, 'v2');
  assert.equal(codex.CODEX_APP_SERVER_SUPPORTED_VERSION, undefined);
  assert.equal(codex.CODEX_APP_SERVER_SCHEMA_VERSION, undefined);
}

const browserOutputFiles = [
  '../dist/esm/index.js',
  '../dist/esm/errors.js',
  '../dist/esm/chat.js',
];

for (const relativePath of browserOutputFiles) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  assert.doesNotMatch(
    source,
    /(?:from\s+|import\s*\(|require\s*\()\s*['"]node:/,
    `${relativePath} must not import Node.js built-ins`
  );
}
