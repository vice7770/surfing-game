// One fixed first-frame same-context rowband diagnostic. Pixel differences are retained evidence, never toleranced acceptance.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { spawn } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { Page, sleep } from '/Users/regina/Desktop/Projects/surfing-game/scripts/browser/cdp.mjs';
import { authority, sha256, WORK } from './authority.mjs';
const pin = authority(), run = process.argv.includes('--run=true');
const compiledRaw = readFileSync(resolve(WORK, 'compiled.json')), compiled = JSON.parse(compiledRaw);
if (compiled.status !== 'passed' || compiled.readySha256 !== pin.readySha256) throw Error('Compiled source binding differs');
if (run && process.env.ROWBAND_MOVING_COMPILED_SHA256 !== sha256(compiledRaw)) throw Error('Reviewed compiled binding required');
const stages = ['initial-narrow', 'repeat-narrow', 'private-full', 'restore-narrow'];
const plan = { schema: 'natural-tube-rowband-moving-plan/v1', readySha256: pin.readySha256, compiledSha256: sha256(compiledRaw), run,
  serverPort: 4227, cdpPort: 9637, offPort: 4200, untouchedPort: 5173, boundMs: 60_000, stages,
  context: 'one actual tested candidate context', views: 2, framesPerView: 21, cases: 42, draws: 168, checkpoints: [0, 14, 15, 20],
  firstStep: 664, lastStep: 684, pointId: 3, jetStrip: 2, solverSteps: 0,
  scope: 'Exact same-context settled repeat-narrow/full/restored normal pixels on all42 fixed natural cases. Initial/repeat changes separately retained. No initial/cross-context parity, tolerance, physics/FPS/quality acceptance.' };
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
  report.closure = {}; for (const port of [4227, 9637, 4200]) report.closure[port] = await tcp(port);
  report.native.chromeExit = chrome ? { code: chrome.exitCode, signal: chrome.signalCode } : null;
  if (profile && report.closure[9637].closed === true) rmSync(profile, { recursive: true, force: true });
  if (Object.values(report.closure).some(row => row.closed !== true)) { report.failures.push('Owned/off-port closure unproved'); report.valid = false; process.exitCode = 1; }
  report.endedAt = new Date().toISOString(); save('report.json', report);
}
const outer = setTimeout(() => { report.failures.push('Native60s hard bound'); chrome?.kill('SIGKILL'); server?.closeAllConnections(); }, plan.boundMs);
const exactReference = frame => ({ step: frame.step, clock: frame.clock, sourceHash: frame.sourceHash, camera: frame.camera,
  belowSurface: frame.belowSurface, hostHeightAtCamera: frame.hostHeightAtCamera, stillLevel: frame.stillLevel,
  selectedBracket: frame.selectedBracket, frontCount: frame.frontCount, geometry: frame.geometry, primaryGeometry: frame.primaryGeometry,
  sourceDrawRanges: [frame.rowRanges.coarseBefore, frame.rowRanges.coarseAfter, frame.rowRanges.patchBefore, frame.rowRanges.patchAfter],
  mask: frame.witnesses.mask, matrices: frame.witnesses.matrices, opticalReferences: frame.witnesses.opticalReferences,
  setupCalls: frame.witnesses.setupCalls, causticCalls: frame.witnesses.causticCalls,
  shader: frame.witnesses.program ? { vertexSha256: frame.witnesses.program.vertexSha256, fragmentSha256: frame.witnesses.program.fragmentSha256,
    maskGridGPU: frame.witnesses.program.maskGridGPU, maskGridSizeGPU: frame.witnesses.program.maskGridSizeGPU,
    maskActiveGPU: frame.witnesses.program.maskActiveGPU, fallbackGPU: frame.witnesses.program.fallbackGPU } : null });
// Ordinary lossless PNG file encoding of SAVED raw RGBA; the only transform is WebGL bottom-up→PNG top-down row order.
// No canvas/compositor, premultiplication, color conversion, resizing, or renderer mutation is involved.
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function pngChunk(type, bytes) {
  const tag = Buffer.from(type, 'ascii'), head = Buffer.alloc(4), tail = Buffer.alloc(4); head.writeUInt32BE(bytes.length);
  let crc = 0xffffffff; for (const value of Buffer.concat([tag, bytes])) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8);
  tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0); return Buffer.concat([head, tag, bytes, tail]);
}
function framebufferPNG(rgba, width, height) {
  if (rgba.length !== width * height * 4) throw Error('Saved normal RGBA byte dimensions differ');
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = width * 4, rows = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(rows, y * (stride + 1) + 1, (height - y - 1) * stride, (height - y) * stride);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND', Buffer.alloc(0))]);
}
try {
  report.prePorts = {}; for (const port of [4227, 9637, 4200]) { const proof = await tcp(port); report.prePorts[port] = proof;
    if (proof.closed !== true) throw Error('Required unoccupied port: ' + port); }
  server = createServer((request, response) => {
    let path = new URL(request.url, 'http://127.0.0.1').pathname; if (path.endsWith('/')) path += 'index.html';
    const row = served.get(path); if (!row) { response.writeHead(404); response.end('Unavailable'); return; }
    const bytes = readFileSync(row.path); if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256) { response.writeHead(500); response.end('Changed'); return; }
    const type = path.endsWith('.html') ? 'text/html' : path.endsWith('.js') ? 'text/javascript' : path.endsWith('.json') ? 'application/json' : 'application/octet-stream';
    response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); response.end(bytes);
  });
  await bounded(new Promise((accept, reject) => { server.once('error', reject); server.listen(4227, '127.0.0.1', accept); }), 'owned server');
  // Every browser fetch is pinned by the exact whitelist and per-request hash; no public-directory fallback or extra full-gzip HTTP preflight.
  profile = mkdtempSync(join(tmpdir(), 'breakline-rowband-moving-'));
  chrome = spawn(process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--remote-debugging-port=9637', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    '--window-size=1040,700', '--window-position=60,60', '--app=about:blank', '--mute-audio'], { stdio: ['ignore', 'ignore', 'pipe'] });
  report.native.pid = chrome.pid; report.native.spawnargs = chrome.spawnargs; report.native.stderr = ''; report.native.targetLists = [];
  chrome.stderr.on('data', raw => { if (report.native.stderr.length < 16384) report.native.stderr += String(raw).slice(0, 16384 - report.native.stderr.length); });
  let spawnError; chrome.once('error', error => { spawnError = String(error); report.native.spawnError = spawnError; }); let target;
  for (let k = 0; k < 50 && !target; k++) {
    if (spawnError) throw Error(spawnError); await sleep(100);
    try { const list = await (await fetch('http://127.0.0.1:9637/json/list', { signal: AbortSignal.timeout(500) })).json();
      report.native.targetLists.push(list.map(row => ({ id: row.id, type: row.type, url: row.url })));
      const pages = list.filter(row => row.type === 'page'); if (pages.length > 1) throw Error('Ambiguous owned sole page'); if (pages.length === 1) target = pages[0];
    } catch (error) { if (String(error).includes('Ambiguous')) throw error; }
  }
  if (!target?.webSocketDebuggerUrl) throw Error('Owned sole page unavailable');
  page = await bounded(Page.connect(target.webSocketDebuggerUrl), 'owned CDP connect');
  await bounded(page.send('Page.enable'), 'Page.enable'); await bounded(page.send('Runtime.enable'), 'Runtime.enable');
  const arm = 'candidate';
  await bounded(page.send('Page.navigate', { url: `http://127.0.0.1:4227/${arm}/` }), 'candidate navigate');
  await bounded(page.waitFor('window.movingRowbandQA', 8000), 'candidate component ready');
  const failure = await bounded(page.eval('window.movingRowbandQA.failure'), 'init failure'); if (failure) throw Error(failure);
  const init = await bounded(page.eval('window.movingRowbandQA.initialize()'), 'candidate initialize');
  if (init.arm !== arm || init.decodedFrames !== 21 || !init.context.stencil || JSON.stringify(init.stages) !== JSON.stringify(stages)) throw Error('Original moving capture/held context unavailable');
  const row = { arm, init, views: [] }; report.arms.push(row);
  const retainPayload = async (frame, all, reason) => {
    const payload = await bounded(page.eval(`window.movingRowbandQA.retainedPayload(${all})`), 'current controls payload', 12000);
    // Save all requested images/bytes BEFORE subsequent transport guards or abort. Framebuffer bytes remain authoritative.
    const saved = [];
    for (const packet of payload.payload) {
      const rgba = Buffer.from(packet.rgbaBase64, 'base64'), stem = `view${payload.view}-step${payload.step}-${packet.draw}-${packet.stage}`;
      let raw;
      if (all) { const path = resolve(out, stem + '.rgba'); writeFileSync(path, rgba); raw = { path, bytes: rgba.length, sha256: sha256(rgba) }; }
      const png = framebufferPNG(rgba, 960, 540), path = resolve(out, stem + '.png'); writeFileSync(path, png);
      saved.push({ draw: packet.draw, stage: packet.stage, raw, png: { path, bytes: png.length, sha256: sha256(png), dimensions: [960, 540],
        encoding: 'Exact retained RGBA8, lossless PNG, bottom-up→top-down rows only; no compositor/color edits.' }, rgbaSha256: sha256(rgba), rgbaBytes: rgba.length });
    }
    let mask;
    if (all) { const bytes = Buffer.from(payload.maskBase64, 'base64'), path = resolve(out, `view${payload.view}-step${payload.step}-actual-mask.u8`); writeFileSync(path, bytes); mask = { path, bytes: bytes.length, sha256: sha256(bytes) }; }
    const result = { reason, view: payload.view, frame: payload.frame, step: payload.step, saved, mask };
    (frame.retention ??= []).push(result); save('report.json', report);
    if (payload.view !== frame.view || payload.frame !== frame.frame || payload.step !== frame.step) throw Error('Retained controls identity differs');
    for (const image of saved) if (image.rgbaSha256 !== frame.controls[image.draw].framebuffer.sha256 || image.rgbaBytes !== frame.controls[image.draw].framebuffer.byteLength) throw Error('Retained framebuffer transport differs');
    if (all && mask.sha256 !== frame.controls[0].witnesses.mask.sha256) throw Error('Retained mask transport differs');
    return result;
  };
  for (let view = 0; view < 2; view++) {
    const camera = await bounded(page.eval(`window.movingRowbandQA.beginView(${view})`), 'fixed original view');
    const viewRow = { ...camera, frames: [] }; row.views.push(viewRow);
    for (let index = 0; index < 21; index++) {
      const frame = await bounded(page.eval(`window.movingRowbandQA.frame(${index})`), 'actual four-draw case');
      viewRow.frames.push(frame); save('report.json', report);
      const controls = frame.controls, reference = exactReference(controls[0]);
      frame.primaryInputExact = controls.every(control => JSON.stringify(exactReference(control)) === JSON.stringify(reference));
      frame.fixedOrderExact = frame.arm === arm && frame.view === view && frame.frame === index && frame.step === 664 + index && controls.length === 4
        && controls.every((control, draw) => control.stage === stages[draw] && control.draw === draw && control.view === view && control.frame === index && control.step === 664 + index);
      frame.fixedOpticsExact = controls.every(control => control.witnesses.setupCalls === frame.counts.setupCalls && control.witnesses.causticCalls === frame.counts.causticCalls
        && control.witnesses.opticalReferences.causticTexture && control.witnesses.opticalReferences.reflection);
      const valid = frame.primaryInputExact && frame.fixedOrderExact && frame.fixedOpticsExact && frame.settled.repeatVsFullExact && frame.settled.repeatVsRestoredExact;
      if (!valid) {
        report.firstDifference = { view, index, frame, kind: !frame.primaryInputExact || !frame.fixedOrderExact || !frame.fixedOpticsExact ? 'provenance' : 'settled-normal-framebuffer' };
        await retainPayload(frame, true, 'first-failure-all-four-controls-before-abort');
        throw Error('First exact moving settled/provenance failure at ' + view + ':' + index);
      }
      if (plan.checkpoints.includes(index)) await retainPayload(frame, false, 'matched-checkpoint-repeat-narrow-and-private-full');
      save('report.json', report);
    }
  }
  const frames = row.views.flatMap(view => view.frames);
  report.counts = { cases: frames.length, draws: frames.reduce((sum, frame) => sum + frame.controls.length, 0),
    settledExactCases: frames.filter(frame => frame.settled.repeatVsFullExact && frame.settled.repeatVsRestoredExact).length,
    firstRepeatDifferentCases: frames.filter(frame => !frame.firstRepeat.exactRGBA).length,
    positiveActiveCroppedCases: frames.filter(frame => { const c = frame.controls[1]; return c.rowRanges.repairVisible && c.witnesses.mask.nonzero > 0
      && c.rowRanges.repair.effectiveCount > 0 && c.rowRanges.repair.effectiveCount < c.rowRanges.coarseAfter.effectiveCount; }).length,
    checkpointPNGs: frames.flatMap(frame => frame.retention ?? []).flatMap(record => record.saved).length };
  if (report.counts.cases !== 42 || report.counts.draws !== 168 || report.counts.settledExactCases !== 42 || report.counts.checkpointPNGs !== 16 || !report.counts.positiveActiveCroppedCases) throw Error('Original42 cases/168 draws/16 checkpoint/actual positive crop gate failed');
  row.finish = await bounded(page.eval('window.movingRowbandQA.finish()'), 'actual renderer/context retirement');
  if (!row.finish.contextLost || row.finish.solverSteps !== 0) throw Error('Actual context/zero-solver retirement guard');
  report.valid = true; report.qualityAccepted = false; report.initialOrCrossContextParityClaimed = false;
  report.scopeLimit = 'Exact settled same-context rowband versus full repair for42 fixed naturalCPUframe/view cases only. All first/repeat differences retained separately without tolerance. No initial/cross-context parity, general grazing/cavity, BigPadang, physics, FPS or quality acceptance.';
} catch (error) { report.failures.push(String(error?.stack ?? error)); process.exitCode = 1; }
finally {
  clearTimeout(outer);
  try { const after = authority(); report.authorityUnchanged = JSON.stringify(pin.records) === JSON.stringify(after.records); if (!report.authorityUnchanged) { report.valid = false; process.exitCode = 1; } }
  catch (error) { report.valid = false; report.failures.push(String(error)); process.exitCode = 1; }
  await cleanup(); process.stdout.write(JSON.stringify({ stage: 'terminal', valid: report.valid, failures: report.failures, closure: report.closure, endedAt: report.endedAt }) + '\n');
}
