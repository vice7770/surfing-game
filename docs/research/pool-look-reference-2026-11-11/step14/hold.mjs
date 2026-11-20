// Step 14 helper: holds ONE stepped sea in headless Chrome and runs job files against it, so many shader variants and
// stills come from the same frame without stepping the sea again (the launch code is copied from
// scripts/browser/headless-shot.mjs). Usage, from the worktree root:
//   node docs/research/pool-look-reference-2026-11-11/step14/hold.mjs hold --serve=$PWD --port=5199 --out=<dir> --jobs=<dir>
//     --advance=60 --spot="pool&waves=barrel&...&lipLook=fray&..."
// Each <jobs>/*.js is run in the page as an async function body (in name order), its result saved as <out>/<job>.json;
// stills post to <out>. A file named `quit` in <jobs> ends the run. --advance=60 holds the sea at 90 s.
// Jobs: 00-setup.js (helpers: __patch a material's program, __out a debug term, __shoot), 03-terms.js (the lit terms at
// full cover), 04-emission-split.js (the emitted light with each part turned off). Variant programs need their own key.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [mode, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), 'true'] : [a.slice(2, i), a.slice(i + 1)]; }));
const port = Number(args.port ?? 5181);
const base = args.url ?? `http://localhost:${port}/`;
const cdpPort = Number(args.cdp ?? 9420 + (port % 50));
const recvPort = Number(args.recv ?? 5290 + (port % 50));
const log = (...m) => console.log(`[shoot ${new Date().toISOString().slice(11, 19)}]`, ...m);

let vite;
async function serve() {
  if (!args.serve) return;
  vite = spawn(join(args.serve, 'node_modules/.bin/vite'), ['--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: args.serve, stdio: ['ignore', 'pipe', 'pipe'] });
  vite.stderr.on('data', (d) => process.stderr.write(`[vite] ${d}`));
  for (let i = 0; i < 120; i += 1) {
    await sleep(250);
    try { if ((await fetch(base)).ok) { log(`vite up on ${port} for ${args.serve}`); return; } } catch { /* not yet */ }
  }
  throw new Error(`vite did not start on ${port}`);
}

class Page {
  constructor(socket) {
    this.socket = socket; this.id = 0; this.pending = new Map();
    socket.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id === undefined) { if (m.method === 'Runtime.exceptionThrown') log('page exception:', m.params.exceptionDetails?.exception?.description?.slice(0, 300)); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') log('console.error:', m.params.args?.map((a) => a.value ?? a.description).join(' ').slice(0, 300)); return; }
      const w = this.pending.get(m.id); this.pending.delete(m.id);
      if (m.error) w?.reject(new Error(`${m.error.message} (${w.method})`)); else w?.resolve(m.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject, method }); this.socket.send(JSON.stringify({ id, method, params })); });
  }
  async eval(expression, timeout = 600000) {
    const r = await Promise.race([
      this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }),
      sleep(timeout).then(() => { throw new Error(`eval timed out: ${expression.slice(0, 80)}`); }),
    ]);
    if (r.exceptionDetails) throw new Error(`eval failed: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  }
  async waitFor(expression, timeout = 600000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { try { if (await this.eval(`!!(${expression})`, 30000)) return; } catch { /* page reloading */ } await sleep(500); }
    throw new Error(`timed out waiting for ${expression}`);
  }
}

let chrome; let profile;
async function launch(url, width = 1280, height = 720) {
  profile = mkdtempSync(join(tmpdir(), 'bl-shoot-'));
  chrome = spawn(CHROME, [
    `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--headless=new',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio',
    '--enable-unsafe-webgpu', '--use-angle=metal', '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    `--window-size=${width},${height}`, 'about:blank',
  ], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 100 && !target; i += 1) { await sleep(150); try { target = (await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json()).find((e) => e.type === 'page'); } catch { /* not up */ } }
  if (!target) throw new Error('headless Chrome did not start');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { socket.addEventListener('open', res, { once: true }); socket.addEventListener('error', rej, { once: true }); });
  const page = new Page(socket);
  await page.send('Page.enable'); await page.send('Runtime.enable');
  await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.navigate', { url });
  return page;
}

async function shutdown() {
  try { chrome?.kill(); } catch { /* gone */ }
  try { vite?.kill(); } catch { /* gone */ }
  await sleep(400);
  if (profile) rmSync(profile, { recursive: true, force: true });
}

// ---- step 14 driver: hold one stepped sea and run job files against it ----
import { readdirSync, readFileSync, existsSync, renameSync } from 'node:fs';
const OUT = args.out; const JOBS = args.jobs;
mkdirSync(OUT, { recursive: true });
let waiting = null;
const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const name = new URL(req.url, 'http://x').searchParams.get('name') ?? 'upload.png';
  const chunks = []; req.on('data', (c) => chunks.push(c));
  req.on('end', () => { const body = Buffer.concat(chunks); writeFileSync(join(OUT, name), body); res.end('ok'); log('got', name, body.length); });
}).listen(recvPort);
try {
  await serve();
  const q = [`inpage`, `waterSheet`, `spot=${args.spot}`, `compute=gpu`, `receiver=http://localhost:${recvPort}`].join('&');
  const t0 = Date.now();
  const page = await launch(`${base}?${q}`);
  log(`loading ${base}?${q}`);
  await page.waitFor('window.waterSheetReady === true', 1800000);
  log(`ready in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  for (const a of (args.advance ?? '').split(',').filter(Boolean).map(Number)) {
    await page.eval(`window.waterSheetAdvance(${a})`, 1800000);
    log(`advanced to ${await page.eval('window.waterSheetSeconds')} s`);
  }
  writeFileSync(join(OUT, 'READY'), String(await page.eval('window.waterSheetSeconds')));
  for (;;) {
    if (existsSync(join(JOBS, 'quit'))) break;
    const files = readdirSync(JOBS).filter((f) => f.endsWith('.js')).sort();
    if (!files.length) { await sleep(1000); continue; }
    const f = files[0]; const code = readFileSync(join(JOBS, f), 'utf8');
    renameSync(join(JOBS, f), join(JOBS, f + '.done'));
    log('job', f);
    try { const r = await page.eval(`(async () => { ${code} })()`, 1800000); writeFileSync(join(OUT, f.replace(/\.js$/, '.json')), JSON.stringify(r, null, 1) ?? 'null'); log('job done', f); }
    catch (e) { writeFileSync(join(OUT, f.replace(/\.js$/, '.err')), String(e)); log('job failed', f, String(e).slice(0, 300)); }
  }
} finally { server.close(); await shutdown(); process.exit(0); }
