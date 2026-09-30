// Run with: node --test scripts/verify-proxy-routes.mjs
// Requires this example's installed dependencies, but no build or provider keys.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { Agent, createServer as createHttpServer, request } from 'node:http';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer, loadConfigFromFile, preview } from 'vite';

const exampleRoot = fileURLToPath(new URL('..', import.meta.url));
const configFile = join(exampleRoot, 'vite.config.ts');
const defaultDevPort = 5173;
const targets = {
  '/api/deepgram': 'https://api.deepgram.com',
  '/api/fish-audio': 'https://api.fish.audio',
};
const audioBytes = Buffer.from([
  0x49, 0x44, 0x33, 0x00, 0x7f, 0x80, 0xfe, 0xff,
]);
const deepgramBody = '{\n  "text": "Hello, proxy! 日本語 + & ?"\n}';
const fishBody = JSON.stringify({
  text: 'Hello, proxy! 日本語 + & ?',
  reference_id: 'mock-voice-id',
  format: 'mp3',
  latency: 'normal',
  prosody: { speed: 1.1 },
});
const cases = [
  {
    name: 'Deepgram speech preserves query, Token auth, JSON, and binary audio',
    path: '/api/deepgram/v2/speak?model=flux-aster-en&encoding=mp3&speed=1.1&tag=a%2Bb%20c&tag=two',
    upstreamPath:
      '/v2/speak?model=flux-aster-en&encoding=mp3&speed=1.1&tag=a%2Bb%20c&tag=two',
    method: 'POST',
    headers: {
      authorization: 'Token fake-deepgram-key',
      'content-type': 'application/json',
    },
    body: deepgramBody,
    responseType: 'audio/mpeg',
    responseBody: audioBytes,
  },
  {
    name: 'Deepgram public voice list stays unauthenticated',
    path: '/api/deepgram/v1/models?include=tts&tag=a%2Bb%20c',
    upstreamPath: '/v1/models?include=tts&tag=a%2Bb%20c',
    method: 'GET',
    headers: {},
    body: '',
    responseType: 'application/json',
    responseBody: Buffer.from('{"tts":[{"canonical_name":"flux-aster-en"}]}'),
  },
  {
    name: 'Fish Audio speech preserves Bearer auth, model header, JSON, and audio',
    path: '/api/fish-audio/v1/tts?tag=a%2Bb%20c&tag=two',
    upstreamPath: '/v1/tts?tag=a%2Bb%20c&tag=two',
    method: 'POST',
    headers: {
      authorization: 'Bearer fake-fish-key',
      'content-type': 'application/json',
      model: 's2-pro',
    },
    body: fishBody,
    responseType: 'audio/mpeg',
    responseBody: audioBytes,
  },
  {
    name: 'Fish Audio voice list preserves pagination, language, and Bearer auth',
    path: '/api/fish-audio/model?page_size=10&page_number=2&language=ja&tag=a%2Bb%20c',
    upstreamPath: '/model?page_size=10&page_number=2&language=ja&tag=a%2Bb%20c',
    method: 'GET',
    headers: { authorization: 'Bearer fake-fish-key' },
    body: '',
    responseType: 'application/json',
    responseBody: Buffer.from('{"items":[],"total":0,"has_more":false}'),
  },
  {
    name: 'Deepgram authentication errors preserve status and JSON response',
    path: '/api/deepgram/v2/speak?model=flux-aster-en&encoding=mp3',
    upstreamPath: '/v2/speak?model=flux-aster-en&encoding=mp3',
    method: 'POST',
    headers: {
      authorization: 'Token fake-rejected-key',
      'content-type': 'application/json',
    },
    body: deepgramBody,
    responseStatus: 401,
    responseType: 'application/json',
    responseBody: Buffer.from('{"err_msg":"Mock authentication failure"}'),
  },
  {
    name: 'Fish Audio rate limits preserve status, Retry-After, and JSON response',
    path: '/api/fish-audio/v1/tts',
    upstreamPath: '/v1/tts',
    method: 'POST',
    headers: {
      authorization: 'Bearer fake-fish-key',
      'content-type': 'application/json',
      model: 's2-pro',
    },
    body: fishBody,
    responseStatus: 429,
    responseType: 'application/json',
    responseHeaders: { 'retry-after': '3' },
    responseBody: Buffer.from('{"message":"Mock rate limit"}'),
  },
];

function listen(server) {
  server.listen(0, '127.0.0.1');
  return once(server, 'listening');
}

function portOf(server) {
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  assert.equal(address.address, '127.0.0.1');
  return address.port;
}

async function closeHttpServer(server) {
  if (!server.listening) return;
  const closed = once(server, 'close');
  server.close();
  server.closeAllConnections();
  await closed;
}

function localProxies(proxyConfig, upstreamPort, agent) {
  // Fail closed on new routes/options rather than accidentally reaching a provider.
  assert.deepEqual(
    Object.keys(proxyConfig).sort(),
    Object.keys(targets).sort(),
  );
  return Object.fromEntries(
    Object.entries(proxyConfig).map(([route, options]) => {
      assert.equal(typeof options, 'object');
      assert.deepEqual(Object.keys(options).sort(), [
        'changeOrigin',
        'rewrite',
        'target',
      ]);
      assert.equal(options.target, targets[route]);
      assert.equal(options.changeOrigin, true);
      assert.equal(typeof options.rewrite, 'function');
      for (const scenario of cases.filter((entry) =>
        entry.path.startsWith(route),
      )) {
        assert.equal(options.rewrite(scenario.path), scenario.upstreamPath);
      }
      return [
        route,
        { ...options, target: `http://127.0.0.1:${upstreamPort}`, agent },
      ];
    }),
  );
}

function sendRequest(port, scenario) {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: '127.0.0.1',
        port,
        path: scenario.path,
        method: scenario.method,
        headers: { ...scenario.headers, connection: 'close' },
        agent: false,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    req.setTimeout(5000, () => req.destroy(new Error('Local proxy timed out')));
    req.on('error', reject);
    req.end(scenario.body);
  });
}

for (const { mode, occupyDevPort } of [
  { mode: 'development', occupyDevPort: false },
  { mode: 'development', occupyDevPort: true },
  { mode: 'preview', occupyDevPort: false },
]) {
  const portCondition = occupyDevPort ? ' with the default port occupied' : '';
  test(`React sample ${mode}${portCondition} proxies use local mock upstreams`, async (t) => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'voice-proxy-test-'));
    const occupiedPort = createHttpServer();
    let activeScenario;
    const received = [];
    const upstream = createHttpServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      received.push({
        path: req.url,
        method: req.method,
        headers: req.headers,
        body: Buffer.concat(chunks),
      });
      if (!activeScenario) {
        res.writeHead(500).end('Unexpected mock upstream request');
        return;
      }
      res.writeHead(activeScenario.responseStatus ?? 200, {
        'content-type': activeScenario.responseType,
        ...activeScenario.responseHeaders,
      });
      // Split binary bytes across chunks to detect accidental text conversion.
      res.write(activeScenario.responseBody.subarray(0, 3));
      res.end(activeScenario.responseBody.subarray(3));
    });
    const agent = new Agent({ keepAlive: false });
    let viteServer;
    try {
      if (occupyDevPort) {
        await new Promise((resolve, reject) => {
          occupiedPort.once('error', (error) => {
            // An existing local server already provides the occupied-port case.
            if (error.code === 'EADDRINUSE') resolve();
            else reject(error);
          });
          occupiedPort.listen(defaultDevPort, '127.0.0.1', resolve);
        });
      }
      await listen(upstream);
      const upstreamPort = portOf(upstream);
      agent.createConnection = (options, callback) => {
        assert.equal(options.host, '127.0.0.1');
        assert.equal(Number(options.port), upstreamPort);
        return createConnection(options, callback);
      };
      const loaded = await loadConfigFromFile(
        {
          command: 'serve',
          mode: mode === 'preview' ? 'production' : 'development',
          isPreview: mode === 'preview',
        },
        configFile,
      );
      assert.ok(loaded, 'The example Vite config must load');
      // Isolate serving from application assets, .env files, and dependency scans.
      const dist = join(temporaryRoot, 'dist');
      await mkdir(dist);
      await writeFile(join(dist, 'index.html'), '<p>Local proxy fixture</p>');
      const config = {
        ...loaded.config,
        configFile: false,
        root: temporaryRoot,
        envFile: false,
        logLevel: 'silent',
        optimizeDeps: { noDiscovery: true, include: [] },
        build: { ...loaded.config.build, outDir: dist },
        server: {
          ...loaded.config.server,
          host: '127.0.0.1',
          // Vite 5's dev server treats port 0 as its default, not an OS-assigned port.
          port: defaultDevPort,
          strictPort: false,
          proxy: localProxies(loaded.config.server.proxy, upstreamPort, agent),
        },
        preview: {
          ...loaded.config.preview,
          host: '127.0.0.1',
          port: 0,
          strictPort: true,
          proxy: localProxies(loaded.config.preview.proxy, upstreamPort, agent),
        },
      };
      if (mode === 'preview') {
        viteServer = await preview(config);
      } else {
        viteServer = await createServer(config);
        await viteServer.listen();
      }
      const port = portOf(viteServer.httpServer);
      if (occupyDevPort) assert.notEqual(port, defaultDevPort);
      for (const scenario of cases) {
        await t.test(scenario.name, async () => {
          activeScenario = scenario;
          const receivedBefore = received.length;
          const response = await sendRequest(port, scenario);
          assert.equal(received.length, receivedBefore + 1);
          const forwarded = received[receivedBefore];
          assert.equal(forwarded.path, scenario.upstreamPath);
          assert.equal(forwarded.method, scenario.method);
          assert.equal(forwarded.headers.host, `127.0.0.1:${upstreamPort}`);
          for (const name of ['authorization', 'content-type', 'model']) {
            assert.equal(forwarded.headers[name], scenario.headers[name]);
          }
          assert.deepEqual(forwarded.body, Buffer.from(scenario.body));
          assert.equal(response.status, scenario.responseStatus ?? 200);
          assert.equal(response.headers['content-type'], scenario.responseType);
          for (const [name, value] of Object.entries(
            scenario.responseHeaders ?? {},
          )) {
            assert.equal(response.headers[name], value);
          }
          assert.deepEqual(response.body, scenario.responseBody);
          activeScenario = undefined;
        });
      }
      assert.equal(received.length, cases.length);
    } finally {
      if (viteServer) {
        if (mode === 'preview') {
          await closeHttpServer(viteServer.httpServer);
        } else {
          await viteServer.close();
        }
      }
      agent.destroy();
      await closeHttpServer(upstream);
      await closeHttpServer(occupiedPort);
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
}
