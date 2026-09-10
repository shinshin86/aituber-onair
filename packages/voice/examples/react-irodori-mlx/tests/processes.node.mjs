import assert from 'node:assert/strict';
import net from 'node:net';
import { test } from 'node:test';
import { checkPort } from '../scripts/processes.mjs';

test('port conflicts fail without closing the existing server', async () => {
  const existing = net.createServer();
  await new Promise((resolve) => existing.listen(0, '127.0.0.1', resolve));
  const { port } = existing.address();
  try {
    await assert.rejects(checkPort(port), /unavailable/);
    assert.ok(existing.listening);
  } finally {
    await new Promise((resolve) => existing.close(resolve));
  }
  await checkPort(port);
});
