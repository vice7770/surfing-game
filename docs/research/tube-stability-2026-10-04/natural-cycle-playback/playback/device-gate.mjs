// One fixed offline natural-cycle component playback, zero solver steps and no FPS instrumentation.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { Page, sleep } from '/Users/regina/Desktop/Projects/surfing-game/scripts/browser/cdp.mjs';
import { authority, sha256, WORK } from './authority.mjs';
const pin = authority(), run = process.argv.includes('--run=true');
const compiledRaw = readFileSync(resolve(WORK, 'compiled.json')), compiled = JSON.parse(compiledRaw);
if (compiled.status !== 'passed' || compiled.readySha256 !== pin.readySha256) throw Error('Compiled source binding differs');
if (run && process.env.NATURAL_TUBE_COMPILED_SHA256 !== sha256(compiledRaw)) throw Error('Reviewed compiled binding required');
const plan = { schema: 'natural-tube-playback-native-plan/v1', readySha256: pin.readySha256, compiledSha256: sha256(compiledRaw), run,
  serverPort: 4224, cdpPort: 9634, offPort: 4200, untouchedPort: 5173, boundMs: 60_000, totalFramesPerArm: 42,
  cameras: 2, framesPerCamera: 21, checkpoints: [0, 14, 15, 20], pointId: 3, jetStrip: 2, solverSteps: 0,
  scope: 'Offline naturally evolved F64 CPU fixture inputs through original renderer methods, not live worker/GPU physics, ordinary FPS, or visual acceptance.' };
const served = new Map([...compiled.records, ...pin.ready.assets, ...pin.ready.captureServe].map(row => [row.url, row]));
for (const row of served.values()) { const raw = readFileSync(row.path); if (raw.length !== row.bytes || sha256(raw) !== row.sha256) throw Error('Served authority differs: ' + row.path); }
if (!run) { process.stdout.write(JSON.stringify(plan, null, 2) + '\n'); process.exit(0); }
const outArg = process.argv.find(arg => arg.startsWith('--out=')); if (!outArg) throw Error('Fresh output directory required');
const out = resolve(outArg.slice(6)); mkdirSync(out);
const save = (name, data) => writeFileSync(resolve(out, name), JSON.stringify(data, null, 2) + '\n');
const report = { ...plan, startedAt: new Date().toISOString(), pid: process.pid, valid: false, arms: [], native: {}, failures: [] };
const deadline = Date.now() + plan.boundMs; let server, chrome, page, profile, closed = false;
const bounded = (promise, label, cap = 8000) => new Promise((accept, reject) => {
  const remaining = Math.min(cap, deadline - Date.now() - 2500); if (remaining <= 0) { reject(Error('Overall native deadline: ' + label)); return; }
  const timer = setTimeout(() => reject(Error('Bounded native operation: ' + label)), remaining);
  promise.then(accept, reject).finally(() => clearTimeout(timer));
});
function tcp(port) {
  return new Promise(accept => { const socket = createConnection({ host: '127.0.0.1', port }); let done = false;
    const finish = result => { if (done) return; done = true; clearTimeout(timer); socket.destroy(); accept(result); };
    const timer = setTimeout(() => finish({ closed: null, reason: 'TCP deadline' }), 300);
    socket.once('connect', () => finish({ closed: false })); socket.once('error', error => finish({ closed: error.code === 'ECONNREFUSED', reason: error.code }));
  });
}
async function cleanup() {
  if (closed) return; closed = true; if (page) page.socket.close();
  if (chrome) { chrome.kill('SIGTERM'); for (let k = 0; k < 8 && chrome.exitCode === null && chrome.signalCode === null; k++) await sleep(100);
    if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGKILL'); }
  if (server) { server.closeAllConnections(); await new Promise(accept => server.close(accept)); }
  report.closure = {}; for (const port of [4224, 9634, 4200]) report.closure[port] = await tcp(port);
  report.native.chromeExit = chrome ? { code: chrome.exitCode, signal: chrome.signalCode } : null;
  if (profile && report.closure[9634].closed === true) rmSync(profile, { recursive: true, force: true });
  if (Object.values(report.closure).some(row => row.closed !== true)) { report.failures.push('Owned/off-port closure unproved'); report.valid = false; process.exitCode = 1; }
  report.endedAt = new Date().toISOString(); save('report.json', report);
}
const outer = setTimeout(() => { report.failures.push('Native60s hard bound'); chrome?.kill('SIGKILL'); server?.closeAllConnections(); }, plan.boundMs);
const exactReference = frame => ({ step: frame.step, clock: frame.clock, sourceHash: frame.sourceHash, camera: frame.camera,
  belowSurface: frame.belowSurface, hostHeightAtCamera: frame.hostHeightAtCamera, stillLevel: frame.stillLevel,
  selectedBracket: frame.selectedBracket, frontCount: frame.frontCount, geometry: frame.geometry });
try {
  report.prePorts = {}; for (const port of [4224, 9634, 4200]) { const proof = await tcp(port); report.prePorts[port] = proof;
    if (proof.closed !== true) throw Error('Required unoccupied port: ' + port); }
  server = createServer((request, response) => {
    let path = new URL(request.url, 'http://127.0.0.1').pathname; if (path.endsWith('/')) path += 'index.html';
    const row = served.get(path); if (!row) { response.writeHead(404); response.end('Unavailable'); return; }
    const bytes = readFileSync(row.path); if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256) { response.writeHead(500); response.end('Changed'); return; }
    const type = path.endsWith('.html') ? 'text/html' : path.endsWith('.js') ? 'text/javascript' : path.endsWith('.json') ? 'application/json' : 'application/octet-stream';
    response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); response.end(bytes);
  });
  await bounded(new Promise((accept, reject) => { server.once('error', reject); server.listen(4224, '127.0.0.1', accept); }), 'owned server');
  // Every browser fetch is pinned by the exact whitelist and per-request hash; no public-directory fallback or extra full-gzip HTTP preflight.
  profile = mkdtempSync(join(tmpdir(), 'breakline-natural-tube-'));
  chrome = spawn(process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--remote-debugging-port=9634', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    '--window-size=1040,700', '--window-position=60,60', '--app=about:blank', '--mute-audio'], { stdio: ['ignore', 'ignore', 'pipe'] });
  report.native.pid = chrome.pid; report.native.spawnargs = chrome.spawnargs; report.native.stderr = ''; report.native.targetLists = [];
  chrome.stderr.on('data', raw => { if (report.native.stderr.length < 16384) report.native.stderr += String(raw).slice(0, 16384 - report.native.stderr.length); });
  let spawnError; chrome.once('error', error => { spawnError = String(error); report.native.spawnError = spawnError; }); let target;
  for (let k = 0; k < 50 && !target; k++) {
    if (spawnError) throw Error(spawnError); await sleep(100);
    try { const list = await (await fetch('http://127.0.0.1:9634/json/list', { signal: AbortSignal.timeout(500) })).json();
      report.native.targetLists.push(list.map(row => ({ id: row.id, type: row.type, url: row.url })));
      const pages = list.filter(row => row.type === 'page'); if (pages.length > 1) throw Error('Ambiguous owned sole page'); if (pages.length === 1) target = pages[0];
    } catch (error) { if (String(error).includes('Ambiguous')) throw error; }
  }
  if (!target?.webSocketDebuggerUrl) throw Error('Owned sole page unavailable');
  page = await bounded(Page.connect(target.webSocketDebuggerUrl), 'owned CDP connect');
  await bounded(page.send('Page.enable'), 'Page.enable'); await bounded(page.send('Runtime.enable'), 'Runtime.enable');
  const originals = new Map();
  for (const arm of ['baseline', 'candidate']) {
    process.stdout.write(JSON.stringify({ stage: arm, status: 'start', at: new Date().toISOString() }) + '\n');
    await bounded(page.send('Page.navigate', { url: `http://127.0.0.1:4224/${arm}/` }), arm + ' navigate');
    await bounded(page.waitFor('window.naturalTubeQA', 8000), arm + ' component ready');
    const failure = await bounded(page.eval('window.naturalTubeQA.failure'), 'init failure'); if (failure) throw Error(failure);
    const init = await bounded(page.eval('window.naturalTubeQA.initialize()'), arm + ' initialize');
    if (init.decodedFrames !== 21 || (arm === 'candidate' && !init.context.stencil)) throw Error('Reviewed capture/context unavailable');
    const row = { arm, init, views: [] }; report.arms.push(row);
    for (let view = 0; view < 2; view++) {
      const camera = await bounded(page.eval(`window.naturalTubeQA.beginView(${view})`), 'fixed view');
      const viewRow = { ...camera, frames: [] }; row.views.push(viewRow);
      for (let index = 0; index < 21; index++) {
        const frame = await bounded(page.eval(`window.naturalTubeQA.frame(${index})`), arm + ' frame ' + index);
        if (frame.arm !== arm || frame.view !== view || frame.frame !== index || frame.step !== 664 + index) throw Error('Fixed natural frame order differs');
        const key = `${view}:${index}`, reference = exactReference(frame);
        if (arm === 'baseline') originals.set(key, reference);
        else if (JSON.stringify(reference) !== JSON.stringify(originals.get(key))) throw Error('Same natural input/camera/geometry differs at ' + key);
        if (arm === 'candidate' || plan.checkpoints.includes(index)) {
          const clip = await bounded(page.eval('(()=>{const r=window.naturalTubeQA.canvas.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()'), 'canvas clip');
          const shot = await bounded(page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip }), 'natural screenshot');
          const bytes = Buffer.from(shot.data, 'base64'), path = resolve(out, `${arm}-view${view}-step${664 + index}.png`); writeFileSync(path, bytes);
          frame.shot = { path, bytes: bytes.length, sha256: sha256(bytes), pngPixels: [bytes.readUInt32BE(16), bytes.readUInt32BE(20)], checkpoint: plan.checkpoints.includes(index) };
        }
        viewRow.frames.push(frame);
      }
      save('report.json', report);
    }
    row.finish = await bounded(page.eval('window.naturalTubeQA.finish()'), 'actual renderer/context cleanup');
    if (!row.finish.contextLost || row.finish.solverSteps !== 0) throw Error('Component cleanup/zero-solver guard');
    save('report.json', report); process.stdout.write(JSON.stringify({ stage: arm, status: 'completed', at: new Date().toISOString() }) + '\n');
  }
  report.valid = true; report.qualityAccepted = false;
  report.scopeLimit = 'Natural fresh-F64CPU fixture replay with original normal shader/light fallback, two fixed views; stills/motion require human inspection. No live BigPadang/GPU-physics/FPS or complete cavity proof.';
} catch (error) { report.failures.push(String(error?.stack ?? error)); process.exitCode = 1; }
finally {
  clearTimeout(outer);
  try { const after = authority(); report.authorityUnchanged = JSON.stringify(pin.records) === JSON.stringify(after.records); if (!report.authorityUnchanged) { report.valid = false; process.exitCode = 1; } }
  catch (error) { report.valid = false; report.failures.push(String(error)); process.exitCode = 1; }
  await cleanup(); process.stdout.write(JSON.stringify({ stage: 'terminal', valid: report.valid, failures: report.failures, closure: report.closure, endedAt: report.endedAt }) + '\n');
}
