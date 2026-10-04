import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Page, sleep } from '/Users/regina/Desktop/Projects/surfing-game/scripts/browser/cdp.mjs';

const WORK = fileURLToPath(new URL('.', import.meta.url)), PORT = 4219, CDP = 9629, HARD_MS = 90000;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const m = /^--(run|out)=(.*)$/.exec(arg); if (!m) throw Error(`Unknown argument: ${arg}`); return [m[1], m[2]];
}));
const readyBytes = readFileSync(`${WORK}/ready.json`), readySha256 = sha(readyBytes), ready = JSON.parse(readyBytes);
const launchReadyBytes = readFileSync(`${WORK}/launch-ready.json`), launchReadySha256 = sha(launchReadyBytes), launchReady = JSON.parse(launchReadyBytes);
if (readySha256 !== launchReady.programReadySha256) throw Error('Frozen program readiness binding differs');
if (args.run !== 'true') {
  console.log(JSON.stringify({ armed: false, readySha256, launchReadySha256, command: 'SPARSE_READY_SHA256=<reviewed program> SPARSE_LAUNCH_READY_SHA256=<reviewed launcher> node device-gate.mjs --run=true --out=<fresh absolute dir>',
    ports: { server: PORT, cdp: CDP, keepClosed: 4200 }, hardSeconds: HARD_MS / 1000,
    sequence: 'two actual-body/lip180-step exact-nine-field cases + controlled SET1 import/restore, then only if valid24balanced whole runner advance+fill pairs' }, null, 2));
  process.exit(0);
}
if (process.env.SPARSE_READY_SHA256 !== readySha256) throw Error('Reviewed source readiness hash required');
if (process.env.SPARSE_LAUNCH_READY_SHA256 !== launchReadySha256) throw Error('Reviewed launcher readiness hash required');
if (!args.out || !args.out.startsWith('/private/tmp/')) throw Error('Fresh absolute /private/tmp output required');
const OUT = resolve(args.out); if (existsSync(OUT)) throw Error('Refuse to overwrite an earlier run');
mkdirSync(OUT);
const terminal = { schema: 'sparse-upload-owned-run/v1', valid: false, started: new Date().toISOString(),
  readySha256, launchReadySha256, hardSeconds: HARD_MS / 1000, command: process.argv, ports: { server: PORT, cdp: CDP }, events: [] };
let server, chrome, profile, page, childExit, expired = false;
let exitCode = 1;
function event(stage) { const row = { stage, utc: new Date().toISOString() }; terminal.events.push(row); console.log(JSON.stringify(row)); }
function portOpen(port) {
  return new Promise((resolveOpen, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolveOpen(true); });
    socket.once('error', (error) => { socket.destroy(); if (error.code === 'ECONNREFUSED') resolveOpen(false); else reject(error); });
    socket.setTimeout(1000, () => { socket.destroy(); reject(Error(`TCP observation timed out: ${port}`)); });
  });
}
async function bounded(promise, ms, label) {
  let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label)), ms); })]); }
  finally { clearTimeout(timer); }
}
const deadline = setTimeout(() => {
  expired = true; chrome?.kill('SIGKILL'); page?.socket.close(); server?.closeAllConnections();
}, HARD_MS);
try {
  for (const pin of ready.inputs) {
    const bytes = readFileSync(pin.path);
    if (bytes.length !== pin.bytes || sha(bytes) !== pin.sha256) throw Error(`Frozen input changed: ${pin.path}`);
  }
  for (const pin of launchReady.inputs) {
    const bytes = readFileSync(pin.path);
    if (bytes.length !== pin.bytes || sha(bytes) !== pin.sha256) throw Error(`Launcher input changed: ${pin.path}`);
  }
  const compiledBytes = readFileSync(`${WORK}/compiled.json`), compiled = JSON.parse(compiledBytes);
  if (sha(compiledBytes) !== launchReady.compiledSha256) throw Error('Frozen compiled authority differs');
  if (compiled.status !== 'passed' || compiled.readySha256 !== readySha256) throw Error('Matching successful bundle required');
  terminal.compiled = { bytes: compiledBytes.length, sha256: sha(compiledBytes), files: compiled.files };
  const assets = new Map();
  if (compiled.files.length !== 3 || compiled.files.map(f => f.name).sort().join(',') !== 'index.html,page.js,worker.js') throw Error('Unexpected compiled outputs');
  for (const file of compiled.files) {
    const bytes = readFileSync(`${WORK}/dist/${file.name}`);
    if (bytes.length !== file.bytes || sha(bytes) !== file.sha256) throw Error(`Compiled bytes changed: ${file.name}`);
    assets.set(`/${file.name}`, bytes);
  }
  for (const pin of launchReady.served) {
    const bytes = readFileSync(pin.path);
    if (bytes.length !== pin.bytes || sha(bytes) !== pin.sha256) throw Error(`Served fixture/case changed: ${pin.path}`);
    if (assets.has(pin.url)) throw Error(`Duplicate served URL: ${pin.url}`);
    assets.set(pin.url, bytes);
  }
  for (const port of [PORT, CDP, 4200]) if (await portOpen(port)) throw Error(`Required unoccupied port: ${port}`);
  server = createServer((request, response) => {
    const path = request.url === '/' ? '/index.html' : request.url;
    const bytes = assets.get(path);
    if (!bytes) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': path.endsWith('.js') ? 'application/javascript' : path === '/index.html' ? 'text/html' : 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  });
  await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(PORT, '127.0.0.1', resolveListen); });
  profile = mkdtempSync(join(tmpdir(), 'surf-sparse-upload-'));
  chrome = spawn(CHROME, [`--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--window-size=1280,760', '--window-position=60,60', '--app=about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
  terminal.chromePid = chrome.pid; terminal.chromeStdout = ''; terminal.chromeStderr = '';
  for (const [name, stream] of [['chromeStdout', chrome.stdout], ['chromeStderr', chrome.stderr]]) {
    stream.on('data', (bytes) => {
      const room = 16384 - Buffer.byteLength(terminal[name]);
      if (room > 0) terminal[name] += bytes.subarray(0, room).toString();
    });
  }
  let spawnError;
  chrome.once('error', (error) => { spawnError = error; terminal.spawnError = { name: error.name, message: error.message }; });
  childExit = once(chrome, 'exit').catch((error) => { terminal.exitWaitError = error.message; return [null, 'spawn-error']; });
  event('OWNED_CHROME_STARTED');
  let target;
  const startupStarted = Date.now(), inventoryKeys = new Set();
  terminal.distinctTargetInventories = [];
  for (let tries = 0; tries < 100 && !target && Date.now() - startupStarted < 10000; tries++) {
    if (expired) throw Error('Hard deadline');
    if (spawnError) throw spawnError;
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP}/json/list`, { signal: AbortSignal.timeout(500) })).json();
      if (!Array.isArray(list)) throw Error('Invalid owned target inventory');
      const observed = { utc: new Date().toISOString(), total: list.length, truncated: list.length > 12,
        targets: list.slice(0, 12).map((t) => Object.fromEntries(['type', 'id', 'title', 'url', 'webSocketDebuggerUrl']
          .map((name) => [name, typeof t[name] === 'string' ? t[name].slice(0, 512) : null]))) };
      terminal.firstTargetInventory ??= observed; terminal.lastTargetInventory = observed;
      const key = JSON.stringify(observed.targets);
      if (!inventoryKeys.has(key) && terminal.distinctTargetInventories.length < 10) {
        inventoryKeys.add(key); terminal.distinctTargetInventories.push(observed);
      }
      // Successful native-owned launcher authority: select the sole actual page, then navigate explicitly.
      const pages = list.filter((t) => t.type === 'page');
      if (pages.length > 1) throw Error('Ambiguous owned page inventory');
      if (pages.length === 1) target = pages[0];
    } catch (error) {
      terminal.lastTargetPollError = error.message;
      if (error.message.includes('Ambiguous') || error.message.includes('Invalid owned')) throw error;
    }
    if (!target) await sleep(100);
  }
  if (!target?.webSocketDebuggerUrl) throw Error('Owned sole page unavailable');
  terminal.selectedTarget = { type: target.type, id: target.id, url: target.url, webSocketDebuggerUrl: target.webSocketDebuggerUrl };
  page = await Page.connect(target.webSocketDebuggerUrl);
  page.on('Runtime.consoleAPICalled', (params) => {
    for (const arg of params.args ?? []) if (typeof arg.value === 'string' && arg.value.includes('sparseStage')) {
      terminal.events.push({ browser: arg.value, utc: new Date().toISOString() }); console.log(arg.value);
    }
  });
  await page.send('Page.enable'); await page.send('Runtime.enable');
  await page.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await bounded(page.waitFor('window.sparseQaReady === true', 15000), 16000, 'Entry readiness deadline');
  terminal.native = await page.eval('({ innerWidth, innerHeight, dpr: devicePixelRatio, userAgent: navigator.userAgent, secure: isSecureContext })');
  event('DEVICE_GATE_STARTED');
  terminal.result = await bounded(page.eval('window.sparseQaRun()'), Math.max(1, HARD_MS - (Date.now() - Date.parse(terminal.started))), 'Overall device deadline');
  if (!terminal.result?.valid || expired) throw Error('Device gate invalid or expired');
  terminal.valid = true; exitCode = 0; event('DEVICE_GATE_PASSED');
} catch (error) {
  terminal.failure = { name: error.name, message: error.message, stack: error.stack }; event('FIRST_FAILURE');
} finally {
  clearTimeout(deadline);
  page?.socket.close();
  if (chrome?.pid && chrome.exitCode === null && chrome.signalCode === null) {
    chrome.kill('SIGTERM');
    try { await bounded(childExit, 1500, 'TERM deadline'); }
    catch { chrome.kill('SIGKILL'); try { await bounded(childExit, 1500, 'KILL deadline'); } catch (error) { terminal.cleanupFailure = error.message; } }
  }
  if (server) { server.closeAllConnections(); await bounded(new Promise((resolveClose) => server.close(resolveClose)), 1500, 'Server closure deadline').catch((e) => { terminal.cleanupFailure = e.message; }); }
  const ports = {};
  for (const port of [PORT, CDP, 4200]) { try { ports[port] = !(await portOpen(port)); } catch (error) { ports[port] = error.message; } }
  terminal.closed = ports; terminal.chromeExit = chrome ? { code: chrome.exitCode, signal: chrome.signalCode } : null;
  if (profile && chrome && (chrome.exitCode !== null || chrome.signalCode !== null)) rmSync(profile, { recursive: true, force: true });
  if (Object.values(ports).some((v) => v !== true) || terminal.cleanupFailure) { terminal.valid = false; exitCode = 1; }
  terminal.ended = new Date().toISOString(); terminal.exitCode = exitCode;
  writeFileSync(`${OUT}/result.json`, `${JSON.stringify(terminal, null, 2)}\n`);
  console.log(JSON.stringify({ stage: 'TERMINAL', valid: terminal.valid, exitCode, closed: terminal.closed, result: `${OUT}/result.json` }));
}
process.exitCode = exitCode;
