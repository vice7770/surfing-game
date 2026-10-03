// A short, reproducible whitewater benchmark. Run against a development server or frozen build:
// node scripts/browser/particle-performance.mjs --out=docs/research/performance-2026-10-03/before --url=http://localhost:5173/
// --serve=/absolute/path/to/dist serves a static copy on --url's port. --centre=x,z preserves framing.
// Saves the held frame's timings/screenshot, worker snapshot counts, and ordinary ride
// callback work including PhysicalMode.update. --liveSeconds=0 skips the ordinary ride.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { Page, sleep } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const at = arg.indexOf('=');
  return [arg.slice(2, at), arg.slice(at + 1)];
}));
const out = args.out ?? 'docs/research/performance-2026-10-03/before';
const base = args.url ?? 'http://localhost:5173/';
const port = Number(args.cdp ?? 9438);
const receivePort = Number(args.receiver ?? 5338);
const at = Number(args.at ?? 20);
const frames = Number(args.frames ?? 16);
const liveSeconds = Number(args.liveSeconds ?? 6);
const centre = args.centre;
const query = new URLSearchParams({ particleBench: '', graphics: 'high', spot: args.spot ?? 'reef', swell: 'big', compute: 'gpu', from: String(at), to: String(at), frames: String(frames), width: '1280', height: '720', shot: String(at), receiver: `http://localhost:${receivePort}` });
if (centre) query.set('centre', centre);
const url = `${base}?${query}`;
mkdirSync(dirname(out), { recursive: true });
const artifact = { label: args.label ?? basename(out) };
if (args.serve) {
  const root = resolve(args.serve);
  const hash = createHash('sha256');
  const files = ['index.html', ...readdirSync(join(root, 'assets')).filter((file) => file.endsWith('.js')).sort().map((file) => `assets/${file}`)];
  for (const file of files) { hash.update(file); hash.update(readFileSync(join(root, file))); }
  artifact.bundleSha256 = hash.digest('hex');
}
let staticServer;
if (args.serve) {
  const root = resolve(args.serve);
  staticServer = createServer((req, res) => {
    const path = resolve(root, `.${decodeURIComponent(new URL(req.url, base).pathname)}`);
    if (path !== root && !path.startsWith(`${root}/`)) { res.writeHead(403).end(); return; }
    try {
      const file = statSync(path).isDirectory() ? join(path, 'index.html') : path;
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
      res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
      res.end(readFileSync(file));
    } catch { res.writeHead(404).end(); }
  }).listen(Number(new URL(base).port), '127.0.0.1');
}
let received = false;
const receiver = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    writeFileSync(`${out}-front.png`, Buffer.concat(chunks));
    received = true;
    res.end('ok');
  });
}).listen(receivePort);
let page;
let chrome;
let profile;
try {
  console.log(`Loading ${url}`);
  profile = mkdtempSync(join(tmpdir(), 'breakline-particles-'));
  chrome = spawn(process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio',
    '--enable-unsafe-webgpu', '--use-angle=metal', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    '--window-size=1280,720', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let startupErrors = '';
  chrome.stderr.on('data', (chunk) => { startupErrors += chunk.toString(); });
  let target;
  for (let tries = 0; tries < 100 && !target; tries += 1) {
    await sleep(150);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((entry) => entry.type === 'page'); } catch { /* Chrome starting */ }
  }
  if (!target) throw new Error(`Chrome did not open a page: ${startupErrors.slice(-1500)}`);
  page = await Page.connect(target.webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  page.on('Runtime.exceptionThrown', ({ exceptionDetails }) => console.log(`Page error: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`));
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    let seed = 0x5eed;
    Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    localStorage.setItem('breakline.settings.v1', JSON.stringify({ graphics: { preset: 'high' }, gameplay: { showTelemetry: true }, seen: { rideHints: true, lowPerformanceNotice: true } }));
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        this.addEventListener('message', ({ data }) => {
          const snapshot = data?.snapshot;
          if (snapshot) {
            window.__particleSnapshot = { seaTime: snapshot.status.seaTime, frontCount: snapshot.frontCount, lipCount: snapshot.lipCount, sprayCount: snapshot.sprayCount, bubbleCount: snapshot.bubbleCount, solverMs: snapshot.status.stepMs, pipelineMs: snapshot.status.pipelineMs };
            if (window.__frameWork?.sampling) window.__frameWork.snapshots.push({ time: performance.now(), ...window.__particleSnapshot });
          }
        });
      }
    };
    const work = window.__frameWork = { sampling: false, rows: [], snapshots: [] };
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => raf((time) => {
      const start = performance.now();
      try { callback(time); } finally { if (work.sampling) work.rows.push({ time, ms: performance.now() - start }); }
    });
  })()` });
  await page.send('Page.navigate', { url });
  await page.waitFor('window.particleBench?.done === true', 300000);
  const held = await page.eval('({ ...window.particleBench, snapshot: window.__particleSnapshot })');
  if (!received) throw new Error('The benchmark completed without uploading the front screenshot');
  // Save the primary result immediately: subsequent sampling never changes this held frame.
  const metadata = await page.eval(`(() => {
    const gl = document.querySelector('canvas').getContext('webgl2');
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return { userAgent: navigator.userAgent, renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), viewport: [innerWidth, innerHeight], pixelRatio: devicePixelRatio };
  })()`);
  let build;
  try { build = await (await fetch(`${base}build.json`)).json(); } catch { /* Dev server */ }
  const dirtyFiles = execFileSync('git', ['diff', '--name-only'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const run = { date: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), artifact, checkoutDirtyFiles: dirtyFiles, build, url, metadata, held };
  writeFileSync(`${out}.json`, `${JSON.stringify(run, null, 2)}\n`);
  console.log(`Held baseline saved: ${out}.json and ${out}-front.png`);
  console.log(`Summary: ${JSON.stringify(held.summary)}`);
  if (liveSeconds > 0) {
  // Ordinary ride callbacks include snapshot consumption and the full scene draw,
  // unlike the held benchmark, which draws its views directly.
  await page.send('Page.navigate', { url: `${base}?graphics=high` });
  await page.waitFor("document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')", 120000);
  await page.click('.tile', 'Surf');
  await page.waitFor("document.querySelector('#app')?.dataset.screen === 'surf'");
  await page.click('.spot-card', args.spot === 'padang' ? 'Padang' : 'Reef');
  await page.click('.segmented button', 'Big');
  await page.click('.button-primary', 'Paddle out');
  await page.waitFor("document.querySelector('#app')?.dataset.screen === 'ride'", 120000);
  await sleep(at * 1000);
  await page.eval('window.__frameWork.rows = []; window.__frameWork.snapshots = []; window.__frameWork.startTime = performance.now(); window.__frameWork.startSeaTime = window.__particleSnapshot?.seaTime; window.__frameWork.sampling = true');
  await sleep(liveSeconds * 1000);
  const work = await page.eval(`(() => {
    window.__frameWork.sampling = false;
    const rows = {}; for (const dt of document.querySelectorAll('.ride-telemetry dt')) rows[dt.textContent.trim()] = dt.nextElementSibling?.textContent.trim();
    return { samples: window.__frameWork.rows, snapshots: window.__frameWork.snapshots, startSeaTime: window.__frameWork.startSeaTime, endSeaTime: window.__particleSnapshot?.seaTime, wallMs: performance.now() - window.__frameWork.startTime, telemetry: rows, screen: document.querySelector('#app')?.dataset.screen };
  })()`);
  const values = work.samples.map((row) => row.ms).sort((a, b) => a - b);
  const intervals = work.samples.slice(1).map((row, index) => row.time - work.samples[index].time).sort((a, b) => a - b);
  const snapshotIntervals = work.snapshots.slice(1).map((row, index) => row.time - work.snapshots[index].time).sort((a, b) => a - b);
  const waterProgress = {
    freshSnapshots: work.snapshots.length,
    freshSnapshotsPerSecond: work.snapshots.length / (work.wallMs / 1000),
    snapshotIntervalMedianMs: snapshotIntervals[Math.floor(snapshotIntervals.length / 2)],
    snapshotIntervalP95Ms: snapshotIntervals[Math.floor(snapshotIntervals.length * 0.95)],
    seaSecondsPerWallSecond: (work.endSeaTime - work.startSeaTime) / (work.wallMs / 1000),
  };
  run.normalFrames = { method: `Ordinary ${args.spot ?? 'reef'} Big High ride, at ${at} seconds wall time after loading, all requestAnimationFrame callback work including PhysicalMode.update and rendering. Fresh worker snapshot cadence and sea-time progress are measured separately from display callbacks. Headless frame scheduling differs from display FPS.`, seconds: liveSeconds, frames: values.length, workMedianMs: values[Math.floor(values.length / 2)], workP95Ms: values[Math.floor(values.length * 0.95)], intervalMedianMs: intervals[Math.floor(intervals.length / 2)], intervalP95Ms: intervals[Math.floor(intervals.length * 0.95)], waterProgress, ...work };
  writeFileSync(`${out}.json`, `${JSON.stringify(run, null, 2)}\n`);
  console.log(`Normal-frame work: ${JSON.stringify({ median: run.normalFrames.workMedianMs, p95: run.normalFrames.workP95Ms, frames: run.normalFrames.frames, solver: work.telemetry.SOLVER, waterProgress })}`);
  }
} finally {
  receiver.close();
  staticServer?.close();
  chrome?.kill();
  await sleep(500);
  if (profile) rmSync(profile, { recursive: true, force: true });
}
