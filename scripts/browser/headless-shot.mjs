// Headless WebGPU capture for Breakline (dev tool). Never opens a visible window, so it never takes focus.
//
//   node scripts/browser/headless-shot.mjs sheet --serve=<worktree> --port=<vitePort> --out=<dir> [--spot=padang|reef|beach|point]
//        [--whitewater] [--compute=cpu|gpu|auto] [--shots=name:look:time,...] [--cdp=9420] [--recv=5290]
//     Runs the water sheet dev view (?inpage&waterSheet), saves water-sheet.png (3 times x 2 looks x N shots),
//     prints the available shot names, then saves each requested close-up as <name>-<look>-<time>.png (1280x720).
//     Shot names come from the page (e.g. lineup, tube-beside, tube-shoulder, tube-inside, horizon, below,
//     ww-beside, ww-shoulder, ww-behind, ww-below). A custom view: name "view@ex,ey,ez@tx,ty,tz".
//     look: classic|rich. time: dawn|midday|sunset.
//
//   node scripts/browser/headless-shot.mjs page --serve=<worktree> --port=<vitePort> --out=<file.png> [--path=/?query] [--wait=ms]
//        [--until=<js expr>] [--eval=<js>] [--frames=N --every=ms]
//     Loads a page, optionally waits for an expression and evaluates setup JS, then screenshots
//     (or N frames every <every> ms as <out>-000.png ...).
//
// --serve starts `vite --port <port> --strictPort` in that worktree and stops it at the end;
// omit it and pass --url=http://localhost:<port>/ to use a server that is already running.
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

async function sheet() {
  const out = args.out ?? 'shots'; mkdirSync(out, { recursive: true });
  let waiting = null; const got = new Map();
  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') { res.end(); return; }
    const name = new URL(req.url, 'http://x').searchParams.get('name') ?? 'upload.png';
    const chunks = []; req.on('data', (c) => chunks.push(c));
    req.on('end', () => { const body = Buffer.concat(chunks); got.set(name, body); res.end('ok'); if (waiting && waiting.name === name) { waiting.resolve(body); waiting = null; } });
  }).listen(recvPort);
  const next = (name, timeout) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`no upload ${name} in ${timeout} ms`)), timeout); waiting = { name, resolve: (body) => { clearTimeout(timer); resolve(body); }, cancel: () => clearTimeout(timer) }; });
  const q = [`inpage`, `waterSheet`, `spot=${args.spot ?? 'padang'}`, args.whitewater ? 'whitewater' : '', `compute=${args.compute ?? 'cpu'}`, `receiver=http://localhost:${recvPort}`].filter(Boolean).join('&');
  const t0 = Date.now();
  const sheetPng = next(args.compute && args.compute !== 'cpu' ? 'water-sheet-gpu.png' : 'water-sheet.png', 900000);
  const page = await launch(`${base}?${q}`);
  log(`loading ${base}?${q}`);
  await page.waitFor('window.waterSheetReady === true', 900000);
  const body = await sheetPng.catch(async () => got.get('water-sheet-cpu.png') ?? got.get('water-sheet-auto.png'));
  if (body) writeFileSync(join(out, 'water-sheet.png'), body);
  const status = await page.eval(`[...document.querySelectorAll('div')].map((d) => d.textContent).find((t) => t && t.startsWith('Water sheet')) ?? ''`);
  const names = await page.eval('window.waterSheetShots.map((s) => s.name)');
  log(`sheet ready in ${((Date.now() - t0) / 1000).toFixed(0)} s; shots: ${names.join(', ')}`);
  writeFileSync(join(out, 'status.txt'), `${status}\nshots: ${names.join(', ')}\n`);
  const wanted = (args.shots ?? '').split(',').filter(Boolean);
  for (const spec of wanted) {
    const [name, look = 'rich', time = 'midday'] = spec.split(':');
    let view = JSON.stringify(name);
    if (name.startsWith('view@')) { const [, e, t] = name.split('@'); view = JSON.stringify({ eye: e.split(',').map(Number), target: t.split(',').map(Number) }); }
    for (let k = 0; k < 2; k += 1) { // twice, so the time of day applies (HANDOVER.md)
      const shot = next('water-shot.png', 120000);
      const ok = await page.eval(`window.waterSheetShot(${view}, ${JSON.stringify(look)}, ${JSON.stringify(time)})`);
      if (!ok) { log(`no shot named ${name}`); waiting?.cancel?.(); waiting = null; shot.catch(() => undefined); break; }
      const png = await shot;
      if (k === 1) { const file = join(out, `${name.replace(/[^a-z0-9-]+/gi, '_')}-${look}-${time}.png`); writeFileSync(file, png); log(`saved ${file}`); }
    }
  }
  server.close();
}

// node scripts/browser/headless-shot.mjs record --serve=<worktree> --port=<vitePort> --out=<ride.mp4> --query="spot=pool&style=flow&..."
//   Films an autopilot ride with the game's own recorder (?inpage&record, src/dev/rideRecorder.ts), saves the
//   MP4 it posts, then writes contact sheets <out>-sheet-N.png (4x4 frames, --fps=4 by default) with ffmpeg.
async function record() {
  const out = args.out ?? 'ride.mp4'; mkdirSync(dirname(out), { recursive: true });
  let resolveFilm; const film = new Promise((r) => { resolveFilm = r; });
  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') { res.end(); return; }
    const name = new URL(req.url, 'http://x').searchParams.get('name') ?? 'upload.bin';
    const chunks = []; req.on('data', (c) => chunks.push(c));
    req.on('end', () => { const body = Buffer.concat(chunks); res.end('ok'); log(`received ${name} (${body.length} bytes)`); if (/\.(mp4|webm)$/.test(name) || body.length > 100000) resolveFilm(body); else writeFileSync(out.replace(/\.mp4$/, `-${name}`), body); });
  }).listen(recvPort);
  const q = `inpage&record&${args.query ?? 'spot=pool'}&receiver=http://localhost:${recvPort}`;
  const page = await launch(`${base}?${q}`);
  log(`recording ${base}?${q}`);
  const timeout = Number(args.timeout ?? 1500000);
  const body = await Promise.race([film, sleep(timeout).then(() => { throw new Error(`no film in ${timeout} ms`); })]);
  writeFileSync(out, body);
  const status = await page.eval(`document.body.innerText.slice(0, 2000)`).catch(() => '');
  writeFileSync(out.replace(/\.mp4$/, '-status.txt'), String(status));
  server.close();
  const fps = Number(args.fps ?? 4);
  const { execFileSync } = await import('node:child_process');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf', `fps=${fps},scale=480:-1,tile=4x4`, out.replace(/\.mp4$/, '-sheet-%02d.png')]);
  log(`saved ${out} and contact sheets (${fps} fps, 4x4)`);
}

async function pageShot() {
  const out = args.out ?? 'page.png'; mkdirSync(dirname(out), { recursive: true });
  const page = await launch(`${base.replace(/\/$/, '')}${args.path ?? '/'}`);
  if (args.until) await page.waitFor(args.until, Number(args.timeout ?? 300000));
  if (args.eval) log('eval ->', JSON.stringify(await page.eval(args.eval)).slice(0, 500));
  if (args.wait) await sleep(Number(args.wait));
  const frames = Number(args.frames ?? 1);
  for (let k = 0; k < frames; k += 1) {
    const shot = await page.send('Page.captureScreenshot', { format: 'png' });
    const file = frames === 1 ? out : out.replace(/\.png$/, `-${String(k).padStart(3, '0')}.png`);
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    if (k < frames - 1) await sleep(Number(args.every ?? 250));
  }
  log(`saved ${frames} frame(s) to ${out}`);
}

try {
  await serve();
  if (mode === 'sheet') await sheet(); else if (mode === 'page') await pageShot(); else if (mode === 'record') await record(); else throw new Error('mode: sheet | page | record');
} catch (error) {
  console.error(`[shoot] FAILED: ${error.message}`); process.exitCode = 1;
} finally { await shutdown(); process.exit(process.exitCode ?? 0); }
