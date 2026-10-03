// Actual worker/GPU field parity between two immutable builds, with identical fixed-step input.
// Run only while other GPU benchmarks are idle:
// node scripts/browser/gpu-parity.mjs --before=http://localhost:4185/ --after=http://localhost:4186/ --out=/private/tmp/gpu-row-parity
// Optional --beforeDir=/path/to/frozen/dist --afterDir=/path/to/dist records each served bundle's hash.
// For the next optimization: --optimization=sideTimes --components=24 (then repeat with65).
// --beforeMarker=rowScratch,!sideTimes --afterMarker=rowScratch,sideTimes overrides expected source markers.
// The public recording hook starts seed 1; the paused lab prevents automatic simulation advances.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const equal = arg.indexOf('=');
  if (!arg.startsWith('--') || equal < 0) throw new Error('Use --name=value arguments');
  return [arg.slice(2, equal), arg.slice(equal + 1)];
}));
const before = args.before ?? 'http://localhost:4185/';
const after = args.after ?? 'http://localhost:4186/';
const out = args.out ?? '/private/tmp/gpu-row-parity';
const steps = Number(args.steps ?? 32);
if (!Number.isInteger(steps) || steps < 1) throw new Error('--steps must be a positive integer');
mkdirSync(out, { recursive: true });
const settings = {
  spot: args.spot ?? 'padang', stage: 2, compute: 'auto', source: 'buoy', significantHeight: Number(args.hs ?? 4),
  peakPeriod: Number(args.period ?? 10), directionDegrees: 10, spread: 0.4, spreading: 12, tide: 0, windSpeed: 0,
  stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 3000,
};
const overrides = {
  seed: 1, componentCount: Number(args.components ?? 64), dx: Number(args.dx ?? 2), fineSpacing: Number(args.dz ?? 1.5),
  spinUpPeriods: Number(args.spinUp ?? 0.1), startSeaTime: Number(args.seaTime ?? 400),
  ...(args.alongShore ? { alongShore: Number(args.alongShore) } : {}),
};
// These are the GPU-returned physical fields the network export retains. RATEH and NU are ephemeral and absent.
const fields = ['h', 'qx', 'qz', 'breakingStrength', 'breakingAge', 'plungeHold', 'predictor.x', 'predictor.z'];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const markerText = { rowScratch: 'fn rowScratch(', sideTimes: 'var<workgroup> sideTimes:' };
const optimization = args.optimization ?? 'rowScratch';
if (!['rowScratch', 'sideTimes'].includes(optimization)) throw new Error('Unknown --optimization; use rowScratch or sideTimes');
const expectedMarkers = {
  before: (args.beforeMarker ?? (optimization === 'sideTimes' ? 'rowScratch,!sideTimes' : '!rowScratch')).split(','),
  after: (args.afterMarker ?? (optimization === 'sideTimes' ? 'rowScratch,sideTimes' : 'rowScratch')).split(','),
};
if ((args.optimization || args.beforeMarker || args.afterMarker) && (!args.beforeDir || !args.afterDir)) {
  throw new Error('Explicit optimization/marker validation requires --beforeDir and --afterDir');
}
async function bundleMetadata(base, directory, label) {
  if (!directory) return undefined;
  const root = resolve(directory);
  const files = ['index.html', ...readdirSync(join(root, 'assets')).filter((name) => name.endsWith('.js')).sort().map((name) => `assets/${name}`)];
  const sha = createHash('sha256');
  for (const file of files) {
    const bytes = readFileSync(join(root, file));
    sha.update(file); sha.update(bytes);
  }
  // Verify the actual served entry point and worker, so a directory cannot accidentally label a different URL.
  const index = await (await fetch(base)).arrayBuffer();
  if (hash(new Uint8Array(index)) !== hash(readFileSync(join(root, 'index.html')))) throw new Error(`${label} served index differs from --${label}Dir`);
  const workers = files.filter((file) => /^assets\/surfZoneWorker-[^/]+\.js$/.test(file));
  if (workers.length !== 1) throw new Error(`Expected one compiled surf-zone worker in ${root}`);
  const worker = workers[0];
  const response = await fetch(new URL(worker, base));
  if (!response.ok) throw new Error(`Could not read ${label} served worker: ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());
  if (hash(source) !== hash(readFileSync(join(root, worker)))) throw new Error(`${label} served worker differs from --${label}Dir`);
  const markers = {};
  for (const requirement of expectedMarkers[label]) {
    const name = requirement.startsWith('!') ? requirement.slice(1) : requirement;
    const needle = markerText[name] ?? name;
    const present = source.includes(Buffer.from(needle));
    markers[name] = { text: needle, present };
    if (present === requirement.startsWith('!')) throw new Error(`${label} source marker requirement failed: ${requirement}`);
  }
  return { root, sha256: sha.digest('hex'), containsRowScratch: source.includes(Buffer.from(markerText.rowScratch)),
    containsSideTimes: source.includes(Buffer.from(markerText.sideTimes)), servedWorker: { file: worker, sha256: hash(source), markers } };
}
/** SET1 export format: little-endian magic/header length, JSON header, alignment, then packed float32 arrays. */
function decode(bytes) {
  const copy = Uint8Array.from(bytes);
  const view = new DataView(copy.buffer);
  if (copy.length < 8 || view.getUint32(0, true) !== 0x53455431) throw new Error('Not a SET1 sea state');
  const length = view.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(copy.subarray(8, 8 + length)));
  const start = 8 + Math.ceil(length / 4) * 4;
  const floats = new Float32Array(copy.buffer, start);
  const arrays = {};
  let offset = 0;
  for (const [name, count] of header.arrays) {
    if (offset + count > floats.length) throw new Error(`Truncated ${name} field`);
    arrays[name] = floats.subarray(offset, offset + count);
    offset += count;
  }
  return { header, arrays };
}
function compare(a, b) {
  if (a.header.nx !== b.header.nx || a.header.nz !== b.header.nz) throw new Error('Physics grid sizes differ');
  const results = {};
  for (const name of fields) {
    const x = a.arrays[name], y = b.arrays[name];
    if (!x || !y || x.length !== y.length) throw new Error(`Missing or incompatible ${name} field`);
    const xBits = new Uint32Array(x.buffer, x.byteOffset, x.length), yBits = new Uint32Array(y.buffer, y.byteOffset, y.length);
    let changed = 0, nonFinite = 0, maxAbsoluteDifference = 0, firstChangedCell = -1;
    for (let i = 0; i < x.length; i += 1) {
      if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) nonFinite += 1;
      if (xBits[i] !== yBits[i]) {
        changed += 1;
        if (firstChangedCell < 0) firstChangedCell = i;
        maxAbsoluteDifference = Math.max(maxAbsoluteDifference, Math.abs(x[i] - y[i]));
      }
    }
    results[name] = { cells: x.length, changed, nonFinite, maxAbsoluteDifference, firstChangedCell,
      beforeSha256: hash(new Uint8Array(x.buffer, x.byteOffset, x.byteLength)), afterSha256: hash(new Uint8Array(y.buffer, y.byteOffset, y.byteLength)) };
  }
  return { exact: Object.values(results).every((field) => field.changed === 0 && field.nonFinite === 0),
    sameSolverTime: a.header.solverTime === b.header.solverTime, sameSeaTimeOffset: a.header.seaTimeOffset === b.header.seaTimeOffset, fields: results };
}
const instrument = `(() => {
  let seed = 0x5eed;
  Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  localStorage.setItem('breakline.settings.v1', JSON.stringify({ graphics: { preset: 'high' }, detected: { preset: 'high', water: 'accurate', lowPerformance: false }, seen: { rideHints: true, lowPerformanceNotice: true } }));
})();`;
const diagnosticUrl = (base) => {
  const url = new URL(base);
  url.searchParams.set('diagnostics', ''); url.searchParams.set('graphics', 'high');
  // Isolate GPU arithmetic from changes to default render/body-contact sampling.
  url.searchParams.set('renderSpacing', args.renderSpacing ?? '1');
  return url.href;
};
const page = await launch({ url: diagnosticUrl(before), port: Number(args.cdp ?? 9440), width: 1280, height: 720,
  args: ['--mute-audio'] });
async function exportState(label, checkpoint) {
  const encoded = await page.eval(`(async () => {
    const sea = await window.breaklineDiagnostics.mode.host.exportState();
    const stream = new Blob([sea.bytes]).stream();
    const bytes = new Uint8Array(await new Response(sea.deflated ? stream.pipeThrough(new DecompressionStream('deflate')) : stream).arrayBuffer());
    const chunks = []; for (let i = 0; i < bytes.length; i += 32768) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 32768)));
    return btoa(chunks.join(''));
  })()`);
  const bytes = Buffer.from(encoded, 'base64');
  const path = join(out, `${label}-${checkpoint}.bin`);
  writeFileSync(path, bytes);
  const state = decode(bytes);
  const { nx, nz, solverTime, seaTimeOffset, arrays } = state.header;
  return { path, byteLength: bytes.length, sha256: hash(bytes), header: { nx, nz, solverTime, seaTimeOffset, arrays }, state };
}
async function capture(label, base, directory) {
  const bundle = await bundleMetadata(base, directory, label);
  await page.send('Page.navigate', { url: diagnosticUrl(base) });
  await page.waitFor("window.breaklineDiagnostics && window.breaklineLab && document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')", 120000);
  const initial = await page.eval(`(async () => {
    const recording = window.breaklineDiagnostics;
    await recording.start(${JSON.stringify(settings)}, ${JSON.stringify(overrides)});
    window.breaklineLab.active = true; window.breaklineLab.clock.paused = true;
    const host = recording.mode.host;
    while (host.outstandingSteps > 0) await new Promise(resolve => setTimeout(resolve, 10));
    return { status: host.snapshot.status, config: recording.mode.config, grid: host.init.grid, pending: host.outstandingSteps };
  })()`);
  if (initial.status.compute !== 'gpu') throw new Error(`${label} fell back to the CPU`);
  const start = await exportState(label, 'start');
  const timeline = [];
  for (let i = 0; i < steps; i += 1) {
    const status = await page.eval(`(async () => {
      const recording = window.breaklineDiagnostics, host = recording.mode.host, time = host.snapshot.status.seaTime;
      if (host.outstandingSteps !== 0) throw new Error('Unexpected pending simulation advances');
      recording.step({ paddle: false, popUp: false, steer: 0 });
      const began = performance.now();
      while (host.snapshot.status.seaTime <= time || host.outstandingSteps > 0) {
        if (performance.now() - began > 15000) throw new Error('A fixed GPU step did not finish');
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      const advanced = host.snapshot.status.seaTime - time;
      if (Math.abs(advanced - 1 / 60) > 1e-7) throw new Error('Automatic or missing steps: sea advanced by ' + advanced);
      return host.snapshot.status;
    })()`);
    if (status.compute !== 'gpu') throw new Error(`${label} fell back to the CPU at step ${i + 1}`);
    timeline.push(status);
  }
  const end = await exportState(label, 'end');
  let build;
  try { build = await (await fetch(new URL('build.json', base))).json(); } catch { /* Development server. */ }
  console.log(`${label}: ${initial.status.cells} cells, sea ${initial.status.seaTime} -> ${timeline.at(-1).seaTime}, ${steps} fixed GPU steps`);
  return { label, url: diagnosticUrl(base), build, bundle, initial, timeline, start, end };
}
try {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: instrument });
  const a = await capture('before', before, args.beforeDir);
  const b = await capture('after', after, args.afterDir);
  if (a.bundle && b.bundle) {
    if (a.bundle.sha256 === b.bundle.sha256) throw new Error('Both URLs were identified as the same artifact');
  }
  const start = compare(a.start.state, b.start.state), end = compare(a.end.state, b.end.state);
  for (const run of [a, b]) { delete run.start.state; delete run.end.state; }
  const result = { schema: 2, date: new Date().toISOString(), optimization, expectedMarkers, method: 'Identical seed/config, actual worker GPU steps, paused lab; exported float32 physical arrays compared by their 32-bit representations.',
    settings, overrides, steps, coverage: { fields, unavailableReadbackFields: ['RATEH', 'NU'] }, before: a, after: b, start, end };
  result.pass = start.exact && end.exact && start.sameSolverTime && end.sameSolverTime && start.sameSeaTimeOffset && end.sameSeaTimeOffset;
  writeFileSync(join(out, 'report.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ pass: result.pass, startExact: start.exact, endExact: end.exact, report: join(out, 'report.json'), end: end.fields }));
  if (!result.pass) process.exitCode = 1;
} finally { await page.close(); }
