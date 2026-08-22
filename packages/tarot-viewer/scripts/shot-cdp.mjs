// CDP screenshot: page on :3002, WS on :3001, real-time wait, console capture
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

const CHROME = '/home/meisoft/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';
const DEBUG_PORT = 3999;

// chrome-headless-shell (ships bundled SwiftShader; full chromium can't make a
// WebGL context in this WSL env: ANGLE reports VENDOR=Disabled)
let chrome = null;
const pwDir = '/home/meisoft/.cache/ms-playwright';
try {
  const dirs = fs.readdirSync(pwDir).filter(d => d.startsWith('chromium_headless_shell')).sort().reverse();
  for (const d of dirs) {
    for (const base of [`${pwDir}/${d}`, `${pwDir}/${d}/chrome-headless-shell-linux64`, `${pwDir}/${d}/chrome-headless-shell-linux`]) {
      for (const bin of ['chrome-headless-shell', 'chrome']) {
        const p = `${base}/${bin}`;
        if (fs.existsSync(p)) { chrome = p; break; }
      }
      if (chrome) break;
    }
    if (chrome) break;
  }
} catch { /* fall through */ }
if (!chrome) chrome = CHROME;

const srv = spawn(chrome, [
  // NOTE: do NOT pass --headless to headless shell ("not compatible with remote debugging");
  // it is already in headless-shell mode and --remote-debugging-port works natively.
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--no-sandbox',
  '--use-gl=angle',
  '--use-angle=swiftshader-webgl',
  '--window-size=1600,900',
  '--hide-scrollbars',
  '--user-data-dir=/tmp/cdp-tarot-prof3',
  'http://localhost:3002/?wsport=3001',
], { stdio: ['ignore', 'pipe', 'pipe'] });
let chromeErr = '';
srv.stderr.on('data', d => { chromeErr += String(d); });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function httpJson(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: DEBUG_PORT, path }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function main() {
  // wait for devtools
  let targets = null;
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try { targets = await httpJson('/json'); break; } catch { /* not yet */ }
  }
  if (!targets) { console.error('chrome no up. stderr tail:', chromeErr.slice(-400)); process.exit(1); }
  const page = targets.find(t => t.type === 'page');
  const ws = new (await import('ws')).default(page.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 0;
  const pending = new Map();
  const consoleMsgs = [];
  ws.on('open', () => {
    const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    ws.on('message', (d) => {
      const m = JSON.parse(String(d));
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
      if (m.method === 'Runtime.consoleAPICalled') {
        consoleMsgs.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
      }
      if (m.method === 'Runtime.exceptionThrown') {
        consoleMsgs.push('EXCEPTION: ' + JSON.stringify(m.params.exceptionDetails.text ?? m.params.exceptionDetails));
      }
    });
    (async () => {
      await send('Runtime.enable');
      // give page time to connect WS and replay READING_STATE + animate flip (~12-14s for 10 cards)
      await sleep(16000);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('/home/meisoft/tarot-live.png', Buffer.from(shot.data, 'base64'));
      console.log('=== console ===');
      for (const c of consoleMsgs) console.log(' ', c);
      console.log('=== screenshot /home/meisoft/tarot-live.png ===');
      ws.close();
      srv.kill();
      process.exit(0);
    })();
  });
  setTimeout(() => { console.error('TIMEOUT waiting 16s + margin; killing'); srv.kill(); process.exit(2); }, 60000);
}
main();
