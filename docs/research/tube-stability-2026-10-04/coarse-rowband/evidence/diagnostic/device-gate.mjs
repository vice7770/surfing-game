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
if (run && process.env.ROWBAND_DIAGNOSTIC_COMPILED_SHA256 !== sha256(compiledRaw)) throw Error('Reviewed compiled binding required');
const stages = { baseline: ['initial-full', 'repeat-full-1', 'repeat-full-2'],
  candidate: ['initial-narrow', 'repeat-narrow', 'private-full', 'repeat-private-full', 'source-alias-full', 'restore-narrow'] };
const plan = { schema: 'natural-tube-rowband-diagnostic-plan/v1', readySha256: pin.readySha256, compiledSha256: sha256(compiledRaw), run,
  serverPort: 4226, cdpPort: 9636, offPort: 4200, untouchedPort: 5173, boundMs: 40_000, stages,
  draws: 9, step: 664, view: 0, pointId: 3, jetStrip: 2, solverSteps: 0,
  scope: 'Unchanged normal optics; fixed-scene repeat/narrow/private-full/source-alias/restore controls. Exact RGBA differences are diagnostic evidence, not toleranced or universal parity acceptance.' };
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
  report.closure = {}; for (const port of [4226, 9636, 4200]) report.closure[port] = await tcp(port);
  report.native.chromeExit = chrome ? { code: chrome.exitCode, signal: chrome.signalCode } : null;
  if (profile && report.closure[9636].closed === true) rmSync(profile, { recursive: true, force: true });
  if (Object.values(report.closure).some(row => row.closed !== true)) { report.failures.push('Owned/off-port closure unproved'); report.valid = false; process.exitCode = 1; }
  report.endedAt = new Date().toISOString(); save('report.json', report);
}
const outer = setTimeout(() => { report.failures.push('Native40s hard bound'); chrome?.kill('SIGKILL'); server?.closeAllConnections(); }, plan.boundMs);
const exactReference = frame => ({ step: frame.step, clock: frame.clock, sourceHash: frame.sourceHash, camera: frame.camera,
  belowSurface: frame.belowSurface, hostHeightAtCamera: frame.hostHeightAtCamera, stillLevel: frame.stillLevel,
  selectedBracket: frame.selectedBracket, frontCount: frame.frontCount, geometry: frame.geometry, primaryGeometry: frame.primaryGeometry,
  sourceDrawRanges: [frame.rowRanges.coarseBefore, frame.rowRanges.coarseAfter, frame.rowRanges.patchBefore, frame.rowRanges.patchAfter],
  mask: frame.witnesses.mask, matrices: frame.witnesses.matrices, opticalReferences: frame.witnesses.opticalReferences,
  setupCalls: frame.witnesses.setupCalls, causticCalls: frame.witnesses.causticCalls,
  shader: frame.witnesses.program ? { vertexSha256: frame.witnesses.program.vertexSha256, fragmentSha256: frame.witnesses.program.fragmentSha256,
    maskGridGPU: frame.witnesses.program.maskGridGPU, maskGridSizeGPU: frame.witnesses.program.maskGridSizeGPU,
    maskActiveGPU: frame.witnesses.program.maskActiveGPU, fallbackGPU: frame.witnesses.program.fallbackGPU } : null });
const comparisons = [
  ['baseline-repeat-1', 'baseline:initial-full', 'baseline:repeat-full-1'],
  ['baseline-repeat-2', 'baseline:repeat-full-1', 'baseline:repeat-full-2'],
  ['candidate-repeat-narrow', 'candidate:initial-narrow', 'candidate:repeat-narrow'],
  ['same-private-narrow-versus-full', 'candidate:repeat-narrow', 'candidate:private-full'],
  ['same-private-repeat-full', 'candidate:private-full', 'candidate:repeat-private-full'],
  ['private-full-versus-source-alias-full', 'candidate:repeat-private-full', 'candidate:source-alias-full'],
  ['restore-narrow-versus-initial', 'candidate:initial-narrow', 'candidate:restore-narrow'],
  ['cross-context-initial', 'baseline:initial-full', 'candidate:initial-narrow'],
  ['cross-context-full-private', 'baseline:initial-full', 'candidate:private-full'],
  ['cross-context-full-source-alias', 'baseline:initial-full', 'candidate:source-alias-full'] ];
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
function comparePixels(label, a, b) {
  const left = readFileSync(a.raw.path), right = readFileSync(b.raw.path);
  if (left.length !== right.length || left.length !== 960 * 540 * 4) throw Error('Retained raw dimensions differ');
  let channels = 0, pixels = 0, max = 0, absoluteSum = 0, first = null, minX = 960, maxX = -1, minY = 540, maxY = -1;
  for (let p = 0; p < left.length; p += 4) { let changed = false;
    for (let c = 0; c < 4; c++) { const delta = Math.abs(left[p + c] - right[p + c]); if (delta) {
      changed = true; channels++; absoluteSum += delta; max = Math.max(max, delta);
      if (first === null) first = { byte: p + c, bottomUpPixel: p / 4, channel: c, left: left[p + c], right: right[p + c] };
    } }
    if (changed) { pixels++; const x = p / 4 % 960, y = 539 - Math.floor(p / 4 / 960); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  return { label, left: a.arm + ':' + a.stage, right: b.arm + ':' + b.stage,
    exactRGBA: left.equals(right), leftSha256: a.raw.sha256, rightSha256: b.raw.sha256,
    changedPixels: pixels, totalPixels: 960 * 540, changedChannels: channels, maxAbsoluteChannelDelta: max,
    meanAbsoluteChannelDelta: absoluteSum / left.length, firstDifference: first, topDownBBox: pixels ? { minX, maxX, minY, maxY } : null };
}
try {
  report.prePorts = {}; for (const port of [4226, 9636, 4200]) { const proof = await tcp(port); report.prePorts[port] = proof;
    if (proof.closed !== true) throw Error('Required unoccupied port: ' + port); }
  server = createServer((request, response) => {
    let path = new URL(request.url, 'http://127.0.0.1').pathname; if (path.endsWith('/')) path += 'index.html';
    const row = served.get(path); if (!row) { response.writeHead(404); response.end('Unavailable'); return; }
    const bytes = readFileSync(row.path); if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256) { response.writeHead(500); response.end('Changed'); return; }
    const type = path.endsWith('.html') ? 'text/html' : path.endsWith('.js') ? 'text/javascript' : path.endsWith('.json') ? 'application/json' : 'application/octet-stream';
    response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); response.end(bytes);
  });
  await bounded(new Promise((accept, reject) => { server.once('error', reject); server.listen(4226, '127.0.0.1', accept); }), 'owned server');
  // Every browser fetch is pinned by the exact whitelist and per-request hash; no public-directory fallback or extra full-gzip HTTP preflight.
  profile = mkdtempSync(join(tmpdir(), 'breakline-rowband-diagnostic-'));
  chrome = spawn(process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--remote-debugging-port=9636', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    '--window-size=1040,700', '--window-position=60,60', '--app=about:blank', '--mute-audio'], { stdio: ['ignore', 'ignore', 'pipe'] });
  report.native.pid = chrome.pid; report.native.spawnargs = chrome.spawnargs; report.native.stderr = ''; report.native.targetLists = [];
  chrome.stderr.on('data', raw => { if (report.native.stderr.length < 16384) report.native.stderr += String(raw).slice(0, 16384 - report.native.stderr.length); });
  let spawnError; chrome.once('error', error => { spawnError = String(error); report.native.spawnError = spawnError; }); let target;
  for (let k = 0; k < 50 && !target; k++) {
    if (spawnError) throw Error(spawnError); await sleep(100);
    try { const list = await (await fetch('http://127.0.0.1:9636/json/list', { signal: AbortSignal.timeout(500) })).json();
      report.native.targetLists.push(list.map(row => ({ id: row.id, type: row.type, url: row.url })));
      const pages = list.filter(row => row.type === 'page'); if (pages.length > 1) throw Error('Ambiguous owned sole page'); if (pages.length === 1) target = pages[0];
    } catch (error) { if (String(error).includes('Ambiguous')) throw error; }
  }
  if (!target?.webSocketDebuggerUrl) throw Error('Owned sole page unavailable');
  page = await bounded(Page.connect(target.webSocketDebuggerUrl), 'owned CDP connect');
  await bounded(page.send('Page.enable'), 'Page.enable'); await bounded(page.send('Runtime.enable'), 'Runtime.enable');
  const retained = new Map();
  for (const arm of ['baseline', 'candidate']) {
    process.stdout.write(JSON.stringify({ stage: arm, status: 'start', at: new Date().toISOString() }) + '\n');
    await bounded(page.send('Page.navigate', { url: `http://127.0.0.1:4226/${arm}/` }), arm + ' navigate');
    await bounded(page.waitFor('window.rowbandDiagnosticQA', 8000), arm + ' component ready');
    const failure = await bounded(page.eval('window.rowbandDiagnosticQA.failure'), 'init failure'); if (failure) throw Error(failure);
    const init = await bounded(page.eval('window.rowbandDiagnosticQA.initialize()'), arm + ' initialize');
    if (init.decodedFrames !== 1 || !init.context.stencil || JSON.stringify(init.stages) !== JSON.stringify(stages[arm])) throw Error('Fixed held first-frame context unavailable');
    const row = { arm, init, frames: [] }; report.arms.push(row);
    for (let index = 0; index < stages[arm].length; index++) {
      const frame = await bounded(page.eval(`window.rowbandDiagnosticQA.draw(${index})`), arm + ' draw ' + index);
      // SAVE raw RGBA and its PNG BEFORE any comparisons or semantic guards. A failure never erases the first image.
      const payload = frame.payload, rgba = Buffer.from(payload.rgbaBase64, 'base64');
      const stem = `${arm}-${index}-${frame.stage}`;
      const rawPath = resolve(out, stem + '.rgba'), pngPath = resolve(out, stem + '.png'); writeFileSync(rawPath, rgba);
      const png = framebufferPNG(rgba, frame.framebuffer.width, frame.framebuffer.height); writeFileSync(pngPath, png);
      frame.raw = { path: rawPath, bytes: rgba.length, sha256: sha256(rgba), order: frame.framebuffer.order };
      frame.png = { path: pngPath, bytes: png.length, sha256: sha256(png), dimensions: [png.readUInt32BE(16), png.readUInt32BE(20)], encoding: 'Lossless PNG RGBA8 from saved raw bytes, only bottom-up→top-down rows; node:zlib DEFLATE, no compositor/color conversion/resizing.' };
      const mask = frame.witnesses.mask;
      if (mask.rawBase64 !== undefined) {
        const maskBytes = Buffer.from(mask.rawBase64, 'base64'), maskPath = resolve(out, arm + '-actual-mask.u8'); writeFileSync(maskPath, maskBytes);
        row.mask = { path: maskPath, bytes: maskBytes.length, sha256: sha256(maskBytes), width: mask.width, height: mask.height };
        delete mask.rawBase64;
      }
      delete frame.payload; row.frames.push(frame); retained.set(arm + ':' + frame.stage, frame); save('report.json', report);
      if (frame.arm !== arm || frame.stage !== stages[arm][index] || frame.draw !== index || frame.step !== 664 || frame.view !== 0) throw Error('Fixed first-frame diagnostic order differs');
      if (rgba.length !== frame.framebuffer.byteLength || sha256(rgba) !== frame.framebuffer.sha256) throw Error('Saved framebuffer/PNG transport differs');
      if (row.mask?.sha256 !== mask.sha256 || row.mask.bytes !== mask.bytes) throw Error('Saved actual mask transport differs');
      if (frame.witnesses.setupCalls !== 1 || frame.witnesses.causticCalls !== 1 || !frame.witnesses.opticalReferences.causticTexture || !frame.witnesses.opticalReferences.reflection) throw Error('Diagnostic recomputed or replaced fixed optics');
    }
    row.finish = await bounded(page.eval('window.rowbandDiagnosticQA.finish()'), 'actual renderer/context cleanup');
    if (!row.finish.contextLost || row.finish.solverSteps !== 0) throw Error('Context/zero-solver retirement guard');
    save('report.json', report); process.stdout.write(JSON.stringify({ stage: arm, status: 'completed', at: new Date().toISOString() }) + '\n');
  }
  // All nine raw RGBA/PNG pairs are on disk BEFORE any pixel comparisons. Exact deltas are evidence, never an allowed error budget.
  report.comparisons = comparisons.map(([label, left, right]) => comparePixels(label, retained.get(left), retained.get(right)));
  report.primaryInputChecks = comparisons.map(([label, left, right]) => ({ label,
    exact: JSON.stringify(exactReference(retained.get(left))) === JSON.stringify(exactReference(retained.get(right))) }));
  report.valid = report.primaryInputChecks.every(check => check.exact); report.rowbandParityAccepted = false; report.qualityAccepted = false;
  if (!report.valid) { report.failures.push('Diagnostic primary input/camera/geometry/mask/optics/shader provenance changed'); process.exitCode = 1; }
  report.scopeLimit = 'One original natural frame664/fixed overview camera. Same-context changes are QA repair range/view controls only. No ID shader, numerical/physics/FPS claim or toleranced pixel acceptance. Cross-context differences remain separately disclosed.';
} catch (error) { report.failures.push(String(error?.stack ?? error)); process.exitCode = 1; }
finally {
  clearTimeout(outer);
  try { const after = authority(); report.authorityUnchanged = JSON.stringify(pin.records) === JSON.stringify(after.records); if (!report.authorityUnchanged) { report.valid = false; process.exitCode = 1; } }
  catch (error) { report.valid = false; report.failures.push(String(error)); process.exitCode = 1; }
  await cleanup(); process.stdout.write(JSON.stringify({ stage: 'terminal', valid: report.valid, failures: report.failures, closure: report.closure, endedAt: report.endedAt }) + '\n');
}
