// QA only. Ordinary Padang Big with RAF/drawing held; this measures kernels, never FPS.
// node scripts/browser/gpu-kernel-probe.mjs --url=http://127.0.0.1:4201/?diagnostics --dir=/private/tmp/surf-tube-stability-current-20261003 --out=/private/tmp/gpu-kernel-probe --plan
// Remove --plan only in an explicitly coordinated quiet GPU slot. No production modules are changed.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Page, sleep } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  if (!arg.startsWith('--')) throw new Error('Use --name=value or --plan');
  const eq = arg.indexOf('=');
  return eq < 0 ? [arg.slice(2), 'true'] : [arg.slice(2, eq), arg.slice(eq + 1)];
}));
const URL_BASE = args.url ?? 'http://127.0.0.1:4201/?diagnostics';
const DIRECTORY = resolve(args.dir ?? '/private/tmp/surf-tube-stability-current-20261003');
const OUT = resolve(args.out ?? '/private/tmp/gpu-kernel-probe');
const HEADLESS = args.headless !== 'false';
const STEPS = 8, QUERY_CAPACITY = 2048, CELLS = 116000;
const KERNELS = ['begin', 'mask', 'modified', 'predict', 'rates', 'sources', 'breaking', 'shear', 'viscous', 'update', 'rowTerms', 'rows', 'columnTerms', 'columns', 'finish', 'relax', 'relaxSides'];
const FIELDS = ['H', 'QX', 'QZ', 'RATEH', 'STRENGTH', 'AGE', 'NU', 'PREDX', 'PREDZ'];
const GRAPHICS = { preset: 'high', renderScale: 1, nativePixelDensity: true, frameLimit: 60, waterSimulation: 'auto', seaDetail: 'rich', caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich', particles: 'high' };
const EXPECTED_CONFIG = { spot: 'padang', seed: 8761, stage: 2, compute: 'auto', significantHeight: 3.8, peakPeriod: 18, directionDegrees: 0, spreading: 150, windSpeed: 0, tide: 0, dx: 2, fineSpacing: 1, componentCount: 64 };
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const url = new URL(URL_BASE);
if ([...url.searchParams.keys()].some((key) => key !== 'diagnostics') || !url.searchParams.has('diagnostics')) throw new Error('Use only ?diagnostics: no physics, rendering, or query flags');
function manifest() {
  const files = ['index.html', ...readdirSync(join(DIRECTORY, 'assets')).filter((file) => /\.(js|css)$/.test(file)).sort().map((file) => `assets/${file}`)];
  const entries = files.map((file) => ({ file, sha256: hash(readFileSync(join(DIRECTORY, file))) }));
  const sha = createHash('sha256');
  for (const { file } of entries) { sha.update(file); sha.update(readFileSync(join(DIRECTORY, file))); }
  const workers = entries.filter(({ file }) => /^assets\/surfZoneWorker-[^/]+\.js$/.test(file));
  if (workers.length !== 1) throw new Error('Expected one frozen surf-zone worker');
  const workerText = readFileSync(join(DIRECTORY, workers[0].file), 'utf8');
  for (const name of KERNELS) if (!workerText.includes(`fn ${name}(`)) throw new Error(`Frozen WGSL missing ${name}`);
  if (!workerText.includes('rowScratch') || !workerText.includes('sideTimes')) throw new Error('Expected retained exact row/sides optimizations');
  return { directory: DIRECTORY, aggregateSha256: sha.digest('hex'), files: entries, worker: workers[0] };
}
const source = manifest();
const plan = { url: url.href, source, steps: STEPS, config: EXPECTED_CONFIG, graphics: GRAPHICS,
  headless: HEADLESS, viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  variants: ['untimed-unsplit', 'timed-unsplit', 'timed-split'], kernels: KERNELS, mappedFields: FIELDS,
  method: 'Ordinary menu route, seeded RNG; RAF held before game startup; warmup/spin-up unchanged. One additional fixed warmup step, then8 fixed steps. Timestamp-query only in Blob-worker bootstrap; standard pass-boundary writes. Split17 passes is intrusive. All CPU uploads and initial/final9 mapped F32 fields must be bit-exact.',
  limitations: ['No FPS or ordinary contention claim', 'mapAsync wall includes queue, GPU execution, copies and host scheduling; timestamp duration is not a direct measurement of queue wait', 'Per-kernel split passes alter synchronization and scheduling; only timed-unsplit preserves the original pass topology', 'CPU recording copies uploads in every variant; packing/encoding wall times are instrumented', 'Timestamp precision may be quantized; zero small-stage durations are retained', 'This eight-step warm fixture does not establish late-wave GPU behavior', 'Game RAF/draws are held and queued WebGL work drained; other applications or late asynchronous texture uploads cannot be excluded by this bootstrap'] };
if (args.plan === 'true') { console.log(JSON.stringify({ plan: true, ...plan }, null, 2)); process.exit(0); }
mkdirSync(OUT, { recursive: true });

/** Serialized into a Blob module worker before importing the unchanged frozen worker. */
function workerPrelude(options) {
  const { tag, variant, steps, kernels, capacity } = options;
  const post = globalThis.postMessage.bind(globalThis);
  let active = false, prime = false, completed = 0, initial, final, querySet, queryIndex = 0, disposed = false;
  let device, fields, staging, params, n, originalReady = false;
  const pendingOriginalMessages = [];
  globalThis.__gpuProbeOriginalReady = () => { originalReady = true; for (const message of pendingOriginalMessages.splice(0)) globalThis.dispatchEvent(new MessageEvent('message', message)); };
  const pipelineNames = new WeakMap(), bufferBindings = new WeakMap(), resources = [], uploads = [], traces = [], maps = [], adapterInfo = [];
  const error = (cause) => { post({ [tag]: true, fatal: String(cause?.stack ?? cause) }); };
  const assert = (ok, message) => { if (!ok) throw new Error(`GPU probe contract: ${message}`); };
  if (!globalThis.navigator?.gpu || !globalThis.GPUAdapter) { const cause = new Error('UNSUPPORTED: worker WebGPU/GPUAdapter unavailable'); error(cause); throw cause; }
  const requestAdapter = navigator.gpu.requestAdapter.bind(navigator.gpu);
  navigator.gpu.requestAdapter = async (...args) => {
    const adapter = await requestAdapter(...args);
    if (!adapter) { const cause = new Error('UNSUPPORTED: worker WebGPU adapter unavailable'); error(cause); throw cause; }
    return adapter;
  };
  const requestDevice = GPUAdapter.prototype.requestDevice;
  GPUAdapter.prototype.requestDevice = async function (descriptor = {}) {
    if (!this.features.has('timestamp-query')) { const cause = new Error('UNSUPPORTED: adapter has no timestamp-query; no timing sample taken'); error(cause); throw cause; }
    adapterInfo.push({ info: { vendor: this.info?.vendor, architecture: this.info?.architecture, device: this.info?.device, description: this.info?.description }, features: [...this.features], maxStorageBufferBindingSize: this.limits.maxStorageBufferBindingSize });
    const requested = variant === 'untimed-unsplit' ? descriptor : { ...descriptor, requiredFeatures: [...new Set([...(descriptor.requiredFeatures ?? []), 'timestamp-query'])] };
    device = await requestDevice.call(this, requested);
    device.addEventListener('uncapturederror', (event) => { if (!disposed) error(event.error); });
    device.lost.then((info) => { if (!disposed) error(new Error(`Device lost: ${info.reason} ${info.message}`)); });
    instrument(device);
    return device;
  };
  function copiedBytes(data, offset = 0, size) {
    const view = ArrayBuffer.isView(data);
    const elementBytes = view && 'BYTES_PER_ELEMENT' in data ? data.BYTES_PER_ELEMENT : 1;
    const available = view ? data.byteLength : data.byteLength;
    const length = size === undefined ? available - offset * elementBytes : size * elementBytes;
    return new Uint8Array(view ? data.buffer : data, (view ? data.byteOffset : 0) + offset * elementBytes, length).slice().buffer;
  }
  function timestamp(name, substep, dispatches) {
    assert(queryIndex + 2 <= capacity, 'timestamp capacity exhausted');
    const begin = queryIndex++, end = queryIndex++;
    const row = { name, step: completed + 1, substep, dispatches, begin, end };
    traces.push(row);
    return { querySet, beginningOfPassWriteIndex: begin, endOfPassWriteIndex: end };
  }
  function instrument(gpu) {
    const createBuffer = gpu.createBuffer.bind(gpu);
    gpu.createBuffer = (descriptor) => {
      const buffer = createBuffer(descriptor);
      if ((descriptor.usage & GPUBufferUsage.STORAGE) && (descriptor.usage & GPUBufferUsage.COPY_SRC) && descriptor.size % (53 * 4) === 0) { fields = buffer; n = descriptor.size / (53 * 4); }
      if ((descriptor.usage & GPUBufferUsage.MAP_READ) && descriptor.size === 9 * n * 4) {
        staging = buffer;
        const map = buffer.mapAsync.bind(buffer), range = buffer.getMappedRange.bind(buffer);
        buffer.mapAsync = async (...call) => { const began = performance.now(); await map(...call); if (active) maps.push({ step: completed + 1, start: began, end: performance.now() }); };
        buffer.getMappedRange = (...call) => {
          const result = range(...call);
          if (prime) { initial = result.slice(0); prime = false; }
          if (active) { completed++; if (completed === steps) final = result.slice(0); assert(completed <= steps, 'extra readback'); }
          return result;
        };
      }
      if ((descriptor.usage & GPUBufferUsage.UNIFORM) && descriptor.size === 128) params = buffer;
      return buffer;
    };
    const bind = gpu.createBindGroup.bind(gpu);
    gpu.createBindGroup = (descriptor) => {
      for (const entry of descriptor.entries) if (entry.resource?.buffer) bufferBindings.set(entry.resource.buffer, ['fields', 'grid', 'sea', 'params', 'feed'][entry.binding] ?? `binding-${entry.binding}`);
      return bind(descriptor);
    };
    const pipeline = gpu.createComputePipeline.bind(gpu);
    gpu.createComputePipeline = (descriptor) => { const result = pipeline(descriptor); pipelineNames.set(result, descriptor.compute.entryPoint); return result; };
    const write = gpu.queue.writeBuffer.bind(gpu.queue);
    gpu.queue.writeBuffer = (buffer, offset, data, dataOffset, size) => {
      if (active) {
        const bytes = copiedBytes(data, dataOffset, size);
        const kind = buffer === fields ? 'fields' : buffer === params ? 'params' : bufferBindings.get(buffer) ?? 'unidentified-buffer';
        const metadata = { step: completed + 1, kind, bufferOffset: offset, byteLength: bytes.byteLength };
        if (kind === 'params') { const words = new Uint32Array(bytes), floats = new Float32Array(bytes); metadata.params = { nx: words[0], nz: words[1], cells: words[2], dx: floats[4], dt: floats[5], components: words[16], zoneFirst: words[17], zoneRows: words[18], tau: floats[19], feedSlots: words[20] }; }
        uploads.push({ ...metadata, bytes });
      }
      return write(buffer, offset, data, dataOffset, size);
    };
    const encoder = gpu.createCommandEncoder.bind(gpu);
    gpu.createCommandEncoder = (...args) => {
      const result = encoder(...args), begin = result.beginComputePass.bind(result);
      result.beginComputePass = (descriptor) => {
        if (!active) return begin(descriptor);
        assert(descriptor === undefined || Object.keys(descriptor).length === 0, 'original compute-pass descriptor changed');
        const stepSubsteps = traces.filter((row) => row.step === completed + 1 && (row.name === 'all17' || row.name === kernels[0])).length;
        const substep = stepSubsteps + 1, dispatches = [];
        let group, currentPipeline, ended = false;
        const native = variant === 'timed-split' ? undefined : begin(variant === 'untimed-unsplit' ? descriptor : { timestampWrites: timestamp('all17', substep, dispatches) });
        const methods = {
          setBindGroup(...call) { assert(!ended && call.length === 2 && call[0] === 0 && !group, 'expected one setBindGroup(0, group)'); group = call[1]; native?.setBindGroup(...call); },
          setPipeline(...call) { assert(!ended && call.length === 1 && group, 'setPipeline signature/order changed'); currentPipeline = call[0]; assert(pipelineNames.has(currentPipeline), 'unknown pipeline'); native?.setPipeline(...call); },
          dispatchWorkgroups(...call) {
            assert(!ended && group && currentPipeline && call.length === 1 && Number.isInteger(call[0]) && call[0] > 0, 'dispatchWorkgroups signature/order changed');
            const name = pipelineNames.get(currentPipeline); assert(name === kernels[dispatches.length], `dispatch order changed at ${dispatches.length}: ${name}`);
            dispatches.push({ name, workgroups: call[0] });
            if (variant === 'timed-split') { const pass = begin({ timestampWrites: timestamp(name, substep, [dispatches.at(-1)]) }); pass.setBindGroup(0, group); pass.setPipeline(currentPipeline); pass.dispatchWorkgroups(...call); pass.end(); }
            else native.dispatchWorkgroups(...call);
          },
          end(...call) { assert(!ended && call.length === 0 && dispatches.length === kernels.length, 'end signature or17 kernels changed'); ended = true; native?.end(); if (variant === 'untimed-unsplit') traces.push({ name: 'all17', step: completed + 1, substep, dispatches }); },
        };
        return new Proxy(methods, { get(target, key) { assert(typeof key === 'string' && key in target, `unobserved compute-pass method/property ${String(key)}`); return target[key]; } });
      };
      return result;
    };
  }
  async function collect() {
    assert(active && completed === steps && initial && final, 'expected warmup plus8 readbacks');
    active = false;
    let ticks = [];
    if (queryIndex) {
      const resolveBuffer = device.createBuffer({ size: queryIndex * 8, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
      const readBuffer = device.createBuffer({ size: queryIndex * 8, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
      resources.push(resolveBuffer, readBuffer);
      const encoder = device.createCommandEncoder(); encoder.resolveQuerySet(querySet, 0, queryIndex, resolveBuffer, 0); encoder.copyBufferToBuffer(resolveBuffer, 0, readBuffer, 0, queryIndex * 8); device.queue.submit([encoder.finish()]);
      await readBuffer.mapAsync(GPUMapMode.READ); ticks = [...new BigUint64Array(readBuffer.getMappedRange())].map(String); readBuffer.unmap();
    }
    return { variant, n, completed, adapterInfo, traces, maps, ticks, initial, final, uploads };
  }
  globalThis.addEventListener('message', async (event) => {
    const request = event.data;
    if (!request?.[tag]) {
      if (!originalReady) { pendingOriginalMessages.push({ data: request, ports: event.ports }); event.stopImmediatePropagation(); }
      return;
    }
    event.stopImmediatePropagation();
    try {
      let value;
      if (request.command === 'prime') { assert(device && staging && fields && params && n > 0, 'device/readback buffers unavailable'); prime = true; value = { n }; }
      else if (request.command === 'arm') { assert(initial && !prime && !active, 'warmup readback missing'); assert(n === options.cells, `expected ${options.cells} cells, got ${n}`); if (variant !== 'untimed-unsplit') { querySet = device.createQuerySet({ type: 'timestamp', count: capacity }); resources.push(querySet); } active = true; value = { n }; }
      else if (request.command === 'collect') value = await collect();
      else if (request.command === 'dispose') { disposed = true; resources.forEach((resource) => resource.destroy()); device?.destroy(); value = { disposed: true }; }
      else throw new Error(`Unknown QA command ${request.command}`);
      const transfers = request.command === 'collect' ? [initial, final, ...uploads.map((upload) => upload.bytes)] : [];
      post({ [tag]: true, id: request.id, value }, transfers);
    } catch (cause) { post({ [tag]: true, id: request.id, error: String(cause?.stack ?? cause) }); }
  });
}

/** Page bootstrap: no RAF simulation/drawing, and no production diagnostic flags added. */
function pagePrelude(options, workerText) {
  let random = 0x5eed;
  Math.random = () => { random = (random + 0x6D2B79F5) | 0; let t = Math.imul(random ^ (random >>> 15), 1 | random); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  localStorage.setItem('breakline.settings.v1', JSON.stringify({ graphics: options.graphics, detected: { preset: 'high', water: 'accurate', lowPerformance: false }, seen: { rideHints: true, lowPerformanceNotice: true } }));
  const control = window.__gpuProbe = { workers: [], requests: new Map(), id: 0, suppressedRaf: 0, blockedDraws: 0, actualDraws: 0, drawingHeld: false, fatal: undefined };
  control.fatalPromise = new Promise((_, reject) => { control.rejectFatal = reject; }); control.fatalPromise.catch(() => {});
  window.requestAnimationFrame = () => ++control.suppressedRaf; window.cancelAnimationFrame = () => {};
  const contexts = new Set(), getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...args) { const result = getContext.apply(this, args); if (result && /^webgl/.test(args[0])) contexts.add(result); return result; };
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    for (const name of ['clear', 'blitFramebuffer', 'drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) {
      const original = proto[name]; if (!original) continue;
      proto[name] = function (...call) { if (control.drawingHeld) { control.blockedDraws++; return; } control.actualDraws++; return original.apply(this, call); };
    }
  }
  control.holdDrawing = () => { for (const gl of contexts) if (!gl.isContextLost()) gl.finish(); control.drawingHeld = true; control.actualDraws = 0; control.blockedDraws = 0; };
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(workerUrl, descriptor) {
      const original = new URL(workerUrl, location.href).href;
      const wrapped = /\/surfZoneWorker-[^/]+\.js$/.test(new URL(original).pathname);
      const blob = wrapped ? URL.createObjectURL(new Blob([`(${workerText})(${JSON.stringify(options)});\nawait import(${JSON.stringify(original)});
globalThis.__gpuProbeOriginalReady();`], { type: 'text/javascript' })) : undefined;
      super(blob ?? workerUrl, descriptor);
      if (!wrapped) return;
      control.workers.push(this); this.originalSource = original; this.blobSource = blob;
      this.addEventListener('message', (event) => {
        const data = event.data; if (!data?.[options.tag]) return;
        event.stopImmediatePropagation();
        if (data.fatal) { control.fatal = data.fatal; control.rejectFatal(new Error(data.fatal)); return; }
        const pending = control.requests.get(data.id); if (!pending) return;
        control.requests.delete(data.id); clearTimeout(pending.timer); if (data.error) pending.reject(new Error(data.error)); else pending.resolve(data.value);
      });
      this.addEventListener('error', (event) => { control.fatal = event.message; control.rejectFatal(new Error(event.message)); });
    }
  };
  control.command = (command) => new Promise((resolve, reject) => {
    const id = ++control.id, worker = control.workers.at(-1);
    if (!worker) { reject(new Error('No wrapped surf-zone worker')); return; }
    const timer = setTimeout(() => { control.requests.delete(id); reject(new Error(`QA command timed out: ${command}`)); }, 15000);
    control.requests.set(id, { resolve, reject, timer }); worker.postMessage({ [options.tag]: true, id, command });
  });
  control.base64 = (buffer) => { const bytes = new Uint8Array(buffer), chunks = []; for (let i = 0; i < bytes.length; i += 32768) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 32768))); return btoa(chunks.join('')); };
}

async function servedManifest() {
  for (const entry of source.files) {
    const response = await fetch(new URL(entry.file, url), { signal: AbortSignal.timeout(5000) });
    if (!response.ok || hash(Buffer.from(await response.arrayBuffer())) !== entry.sha256) throw new Error(`Served file differs from frozen directory: ${entry.file}`);
  }
}
async function ownedChrome() {
  const port = Number(args.cdp ?? 9477);
  let occupied = false;
  try { occupied = (await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) })).ok; } catch { /* free port */ }
  if (occupied) throw new Error(`CDP port ${port} is already occupied; refusing an unrelated browser`);
  const profile = mkdtempSync(join(tmpdir(), 'breakline-kernel-probe-'));
  const executable = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chrome = spawn(executable, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-background-timer-throttling', ...(HEADLESS ? ['--headless=new'] : []), 'about:blank'], { stdio: 'ignore' });
  let page, closed = false, launchError; chrome.once('error', (cause) => { launchError = cause; });
  const close = async () => { if (closed) return; closed = true; page?.socket.close(); chrome.kill('SIGTERM'); await sleep(500); if (chrome.exitCode === null) chrome.kill('SIGKILL'); rmSync(profile, { recursive: true, force: true }); };
  try {
    let target;
    for (let tries = 0; tries < 60 && !target; tries++) { await sleep(150); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((entry) => entry.type === 'page' && entry.url === 'about:blank'); } catch { /* startup */ } }
    if (!target) throw launchError ?? new Error('Owned Chrome about:blank unavailable');
    page = await Page.connect(target.webSocketDebuggerUrl); page.close = close;
    await page.send('Page.enable'); await page.send('Runtime.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    return page;
  } catch (cause) { await close(); throw cause; }
}
const INPUT = { paddle: false, popUp: false, steer: 0 };
async function step(page) {
  return page.eval(`(async () => {
    const recording = window.breaklineDiagnostics, host = recording.mode.host, previous = host.snapshot.status.seaTime;
    if (host.outstandingSteps !== 0) throw new Error('Unexpected pending physics');
    recording.step(${JSON.stringify(INPUT)});
    const started = performance.now();
    while (host.outstandingSteps !== 0 || host.snapshot.status.seaTime <= previous) {
      if (window.__gpuProbe.fatal) throw new Error(window.__gpuProbe.fatal);
      if (performance.now() - started > 10000) throw new Error('Fixed step timed out');
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    const status = host.snapshot.status;
    if (status.compute !== 'gpu' || Math.abs(status.seaTime - previous - 1 / 60) > 1e-7) throw new Error('GPU/fixed-step invariant failed');
    return { wallMs: performance.now() - started, status, previousSeaTime: previous };
  })()`);
}
function saveBytes(variant, label, encoded) {
  const bytes = Buffer.from(encoded, 'base64'), path = join(OUT, `${variant}-${label}.bin`); writeFileSync(path, bytes);
  return { path, bytes, byteLength: bytes.length, sha256: hash(bytes) };
}
async function capture(page, variant) {
  const tag = '__breaklineKernelProbe20261003';
  const options = { tag, variant, steps: STEPS, cells: CELLS, kernels: KERNELS, capacity: QUERY_CAPACITY, graphics: GRAPHICS };
  const { identifier } = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `(${pagePrelude.toString()})(${JSON.stringify(options)}, ${JSON.stringify(workerPrelude.toString())});` });
  try {
    await page.send('Page.navigate', { url: url.href });
    await page.waitFor("window.__gpuProbe?.fatal || (document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending'))", 60000);
    const fatal = await page.eval('window.__gpuProbe.fatal'); if (fatal) throw new Error(fatal);
    await page.click('.tile', 'Surf');
    await page.waitFor("document.querySelector('#app')?.dataset.screen === 'surf'", 15000);
    await page.click('.spot-card', 'Padang'); await page.click('.segmented button', 'Big'); await page.click('.button-primary', 'Paddle out');
    await page.waitFor("window.__gpuProbe.fatal || (document.querySelector('#app')?.dataset.screen === 'ride' && window.breaklineDiagnostics?.mode.host?.outstandingSteps === 0)", 60000);
    const initial = await page.eval(`(() => {
      const d = window.breaklineDiagnostics, p = window.__gpuProbe;
      if (p.fatal) throw new Error(p.fatal);
      const gl = document.createElement('canvas').getContext('webgl2'), ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return { config: d.mode.config, status: d.mode.host.snapshot.status, grid: d.mode.host.init.grid, renderSpacing: d.water.grid.spacing,
        waterLook: d.water.drawnLook, vertexNormals: d.water.vertexNormals, particles: d.mode.particleLevel, graphics: JSON.parse(localStorage.getItem('breakline.settings.v1')).graphics,
        userAgent: navigator.userAgent, webglRenderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null, webglVendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null,
        worker: p.workers.at(-1).originalSource, suppressedRaf: p.suppressedRaf, pending: d.mode.host.outstandingSteps };
    })()`);
    for (const [key, expected] of Object.entries(EXPECTED_CONFIG)) if (initial.config[key] !== expected) throw new Error(`Ordinary config.${key}=${initial.config[key]}, expected ${expected}`);
    for (const [key, expected] of Object.entries(GRAPHICS)) if (initial.graphics[key] !== expected) throw new Error(`High graphics.${key} guard failed`);
    if (initial.status.compute !== 'gpu' || initial.status.cells !== CELLS || initial.renderSpacing !== 2 || initial.vertexNormals !== false || initial.waterLook !== 'rich' || initial.particles !== 'high' || initial.pending !== 0) throw new Error('Ordinary GPU/grid/quality guard failed');
    if (new URL(initial.worker).pathname !== new URL(source.worker.file, url).pathname) throw new Error('Runtime original worker URL differs from frozen manifest');
    await page.eval('window.__gpuProbe.holdDrawing()');
    await page.eval("window.__gpuProbe.command('prime')"); const warmup = await step(page);
    await page.eval("window.__gpuProbe.command('arm')");
    console.log(`${variant}: warm sea ${warmup.status.seaTime}, starting8 fixed GPU steps`);
    const timeline = []; for (let i = 0; i < STEPS; i++) timeline.push(await step(page));
    const raw = await page.eval(`(async () => { const p = window.__gpuProbe, data = await p.command('collect'); data.initial = p.base64(data.initial); data.final = p.base64(data.final); data.uploads = data.uploads.map((row) => ({ ...row, bytes: p.base64(row.bytes) })); return { ...data, suppression: { suppressedRaf: p.suppressedRaf, actualDraws: p.actualDraws, blockedDraws: p.blockedDraws } }; })()`);
    if (raw.suppression.actualDraws !== 0) throw new Error('WebGL drawing occurred during kernel probe');
    const start = saveBytes(variant, 'initial9', raw.initial), end = saveBytes(variant, 'final9', raw.final);
    if (start.byteLength !== 9 * CELLS * 4 || end.byteLength !== 9 * CELLS * 4) throw new Error('Nine-field readback byte lengths changed');
    delete raw.initial; delete raw.final;
    const uploads = raw.uploads.map(({ bytes, ...metadata }, i) => ({ ...metadata, ...saveBytes(variant, `upload-${String(i).padStart(3, '0')}`, bytes) })); delete raw.uploads;
    const hq = uploads.filter((row) => row.kind === 'fields' && row.bufferOffset === 0 && row.byteLength === 3 * CELLS * 4);
    if (hq.length !== STEPS || !hq.every((row, i) => row.step === i + 1)) throw new Error('Expected exactly8 actual H/Qx/Qz CPU upload blocks');
    return { ...raw, initial, warmup, timeline, start, end, uploads };
  } finally {
    await Promise.race([page.eval("window.__gpuProbe?.command('dispose')").catch(() => {}), sleep(1000)]);
    await page.eval("window.__gpuProbe?.workers.forEach((worker) => { worker.terminate(); URL.revokeObjectURL(worker.blobSource); })").catch(() => {});
    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    await page.send('Page.navigate', { url: 'about:blank' });
  }
}
function parity(a, b) {
  const mapped = ['start', 'end'].map((checkpoint) => ({ checkpoint, exact: a[checkpoint].bytes.equals(b[checkpoint].bytes), fields: FIELDS.map((name, i) => {
    const first = a[checkpoint].bytes.subarray(i * CELLS * 4, (i + 1) * CELLS * 4), second = b[checkpoint].bytes.subarray(i * CELLS * 4, (i + 1) * CELLS * 4);
    let changed = 0; for (let k = 0; k < first.length; k += 4) if (first.readUInt32LE(k) !== second.readUInt32LE(k)) changed++;
    return { name, changed, beforeSha256: hash(first), afterSha256: hash(second) };
  }) }));
  const uploadsExact = a.uploads.length === b.uploads.length && a.uploads.every((row, i) => {
    const other = b.uploads[i]; return row.step === other.step && row.kind === other.kind && row.bufferOffset === other.bufferOffset && row.sha256 === other.sha256;
  });
  const clocksExact = ['seaTime', 'timeToSet'].every((key) => a.initial.status[key] === b.initial.status[key] && a.warmup.status[key] === b.warmup.status[key] && a.timeline.every((row, i) => row.status[key] === b.timeline[i].status[key]));
  return { variants: [a.variant, b.variant], exact: mapped.every((row) => row.exact) && uploadsExact && clocksExact, mapped, uploadsExact, clocksExact };
}
function summaries(run) {
  const rows = run.traces.map((row) => ({ ...row, ...(row.begin !== undefined ? { milliseconds: Number(BigInt(run.ticks[row.end]) - BigInt(run.ticks[row.begin])) / 1e6 } : {}) }));
  const perStep = Array.from({ length: STEPS }, (_, i) => {
    const traces = rows.filter((row) => row.step === i + 1), values = traces.map((row) => row.milliseconds).filter(Number.isFinite);
    return { step: i + 1, seaTime: run.timeline[i].status.seaTime, substeps: run.timeline[i].status.pipelineMs?.deviceSubsteps,
      mapWallMs: run.maps.filter((row) => row.step === i + 1).reduce((sum, row) => sum + row.end - row.start, 0),
      ...(values.length ? { sumPassGpuMs: values.reduce((sum, value) => sum + value, 0), firstToLastPassGpuMs: Number(BigInt(run.ticks[traces.at(-1).end]) - BigInt(run.ticks[traces[0].begin])) / 1e6 } : {}) };
  });
  return { timestampUnits: 'nanoseconds, reported as milliseconds; implementation precision may be quantized', rows, perStep };
}
let page, deadline;
const report = { schema: 1, date: new Date().toISOString(), plan, runs: [], parity: [] };
try {
  await servedManifest();
  page = await ownedChrome();
  const work = (async () => {
    for (const variant of plan.variants) {
      const run = await capture(page, variant); run.summary = summaries(run); report.runs.push(run);
      if (report.runs.length > 1) {
        const result = parity(report.runs[0], run); report.parity.push(result);
        if (!result.exact) throw new Error('Timestamp/split variant changed fields, CPU inputs, or clocks; aborting remaining variants');
      }
    }
    report.pass = report.parity.every((row) => row.exact);
  })();
  await Promise.race([work, new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Overall120-second probe deadline exceeded')), 120000); })]);
} catch (cause) { report.error = String(cause?.stack ?? cause); report.unavailable = report.error.includes('UNSUPPORTED:'); report.pass = false; process.exitCode = 1; }
finally {
  clearTimeout(deadline); if (page) await page.close();
  // Buffers stay in raw files. JSON retains exact hashes, clocks, params and timing metadata.
  for (const run of report.runs) { delete run.start.bytes; delete run.end.bytes; for (const row of run.uploads) delete row.bytes; }
  writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ pass: report.pass, unavailable: report.unavailable ?? false, variants: report.runs.map((run) => run.variant), ownedChromeClosed: true, report: join(OUT, 'report.json'), error: report.error?.split('\n')[0] }));
}
