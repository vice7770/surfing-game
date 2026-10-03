// Frame-rate survey (dev only): every screen at every graphics preset, in real Chrome on this machine.
//   npm run build && npm run preview        (the game on http://localhost:4173; --url to point elsewhere)
//   npm run survey:fps -- docs/research/fps/<date>-<machine>-1-presets.json --commit=<sha> [--presets=low,medium,high,ultra] [--spots=Beach,Point,Reef,Canyon]
//   npm run survey:fps -- docs/research/fps/<date>-<machine>-2-settings.json --features --spot=Beach [--swell=Big] [--only=<setting>,…]
//   npm run report:fps                       (docs/research/fps-report.md from every run)
// Writes the samples, their statistics and the machine. The display caps the frame rate, so each frame's GPU
// time is measured too (EXT_disjoint_timer_query_webgl2): the headroom under the cap. It is the game's context
// alone; a second context (the surfer preview) is reported apart (see INSTRUMENT). (Chrome 153 on macOS
// cannot lift the cap: --disable-gpu-vsync --disable-frame-rate-limit dropped the title screen from 120 to 55 fps.)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { cpus, loadavg, totalmem } from 'node:os';
import { gzipSync } from 'node:zlib';
import { installHeldRasterProbe } from '/private/tmp/render-scale-held-helper.mjs';
import { launch, sleep } from "/private/tmp/render-scale-passive-adapter/owned-cdp.mjs";

const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => {
  const equal = a.indexOf('=');
  return equal < 0 ? [a.slice(2), 'true'] : [a.slice(2, equal), a.slice(equal + 1)];
}));
const OUT = argv.find((a) => !a.startsWith('--')) ?? 'fps.json';
const PAGE_URL = args.url ?? 'http://localhost:4173/';
const WIDTH = Number(args.width ?? 1280);
const HEIGHT = Number(args.height ?? 720);
const PRESETS = (args.presets ?? 'low,medium,high,ultra').split(',');
const SPOTS = (args.spots ?? 'Beach,Point,Reef,Canyon').split(',');
/** The Surf screen's swell for the rides (Practice, Small, Medium or Big); left as the screen has it when omitted. */
const SWELL = args.swell;
/** Seconds sampled per screen: menus, rides. */
const MENU_SECONDS = Number(args.menuSeconds ?? 6);
const RIDE_SECONDS = Number(args.rideSeconds ?? 10);
/** Passive counters avoid submitting GPU timer queries when checking ordinary gameplay cadence. */
const GPU_TIMERS = args.gpuTiming !== 'false';
/** Intrusive GPU profiling is a separate 60-second diagnostic, not a passive cadence verification. */
const GPU_DIAGNOSTIC = args.diagnosticGpu === 'true';
const EDITION = args.edition ?? 'single-step-publication';
/** Runner's unchanged fixed physics step; publication cadence may batch multiple such steps. */
const FIXED_STEP_SECONDS = 1 / 60;
/** Optional ordinary-gameplay comparison against one saved High/Padang Big run. No runtime overrides. */
const BASELINE = args.baseline ? JSON.parse(readFileSync(resolve(args.baseline), 'utf8')) : undefined;
const BASELINE_RIDE = BASELINE?.results.find((row) => row.screen === 'Ride · Padang' && row.setting === 'High (baseline)');
const QUALITY_FILES = ['src/game/Graphics.ts', 'src/game/Settings.ts', 'src/scene/WaterSurface.ts',
  'src/scene/water/richWaterGlsl.ts', 'src/scene/water/richSpray.ts', 'src/scene/SprayPoints.ts',
  'src/scene/BubblePoints.ts', 'src/wave/particleBudget.ts'];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

function qualityMetadata(ref) {
  if (!ref) return undefined;
  return { ref, files: QUALITY_FILES.map((file) => {
    const current = sha(readFileSync(file));
    const baseline = sha(execFileSync('git', ['show', `${ref}:${file}`]));
    if (current !== baseline) throw new Error(`Quality source differs from ${ref}: ${file}`);
    return { file, sha256: current, sameAsReference: true };
  }) };
}

function ordinaryPlan() {
  if (!BASELINE) return undefined;
  if (!BASELINE_RIDE) throw new Error('Baseline needs one High (baseline) / Ride · Padang result');
  const url = new URL(PAGE_URL);
  if ([...url.searchParams.keys()].some((key) => key !== 'diagnostics') || !url.searchParams.has('diagnostics')) {
    throw new Error('Ordinary comparison URL must contain only ?diagnostics');
  }
  if (!args.dir || !args.features || args.only !== "Custom 1.5 (renderScale6/7)" || args.spot !== 'Padang' || SWELL !== 'Big'
      || GPU_TIMERS !== GPU_DIAGNOSTIC || RIDE_SECONDS !== (GPU_DIAGNOSTIC ? 60 : 90) || Number(args.warmSeconds ?? 5) !== 5) {
    throw new Error('Use the ordinary High/Padang/Big route with five-second warmup and passive90s, or --diagnosticGpu=true --gpuTiming=true --rideSeconds=60');
  }
  if (`${WIDTH} × ${HEIGHT}` !== BASELINE.browser.viewport) throw new Error('Requested CSS viewport differs from baseline');
  return { method: `Ordinary menu → Surf → Padang → Big → Paddle out; idle rider; five-second warmup and ${RIDE_SECONDS}-second ${GPU_DIAGNOSTIC ? 'GPU diagnostic' : 'passive'} sample`,
    diagnosticGpuProfile: GPU_DIAGNOSTIC,
    timingComparableToPassiveBaseline:!GPU_DIAGNOSTIC,explicitGraphicsTradeoff:true,nativeQualityPreserved:false,
    edition: EDITION, fixedPhysicsStepSeconds: FIXED_STEP_SECONDS,
    expectedMaxBatchSteps:1,
    pipelineMetricSemantics: 'Physics/device/step timings describe the final step of a batch; batch spans the advance loop; snapshot/summary occur once per publication; total is (batch+snapshot+summary)/batchSteps, not full request latency. Independent stage quantiles must not be summed.',
    baseline: resolve(args.baseline), expectedConfig: BASELINE_RIDE.config, expectedViewport: BASELINE.browser.viewport,
    expectedBrowserDpr: BASELINE.browser.devicePixelRatio, expectedCanvas:"2562 × 1389",
    expectedRenderPixelRatio:1.5, graphics:{"renderScale":0.8571428571428571,"nativePixelDensity":true,"frameLimit":60,"waterSimulation":"auto","seaDetail":"rich","caustics":true,"sprayMist":true,"oceanView":"far","foam":"detailed","waterLook":"rich","particles":"high","preset":"custom"},
    normalMode: 'production pixel normals (no waterNormals flag)', runtimeOverrides: [],
    sourceAudit: qualityMetadata(args.qualityBase) };
}

/** Graphics.PRESETS, kept in step by hand (src/game/Graphics.ts). */
const PRESET_VALUES = {
  low: { renderScale: 0.75, nativePixelDensity: false, frameLimit: 60, waterSimulation: 'auto', seaDetail: 'standard', caustics: false, sprayMist: false, oceanView: 'near', foam: 'simple', waterLook: 'classic', particles: 'low' },
  medium: { renderScale: 1, nativePixelDensity: false, frameLimit: 60, waterSimulation: 'auto', seaDetail: 'standard', caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich', particles: 'medium' },
  high: { renderScale: 1, nativePixelDensity: true, frameLimit: 60, waterSimulation: 'auto', seaDetail: 'rich', caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich', particles: 'high' },
  ultra: { renderScale: 1.25, nativePixelDensity: true, frameLimit: 60, waterSimulation: 'auto', seaDetail: 'rich', caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich', particles: 'high' },
};

/** One advanced setting changed from High at a time (the Custom preset; the surfer keeps High's detail). */
const FEATURES = [
  ["Custom 1.5 (renderScale6/7)",{renderScale:6/7}],
  ['Render scale 0.5', { renderScale: 0.5 }],
  ['Render scale 0.75', { renderScale: 0.75 }],
  ['Render scale 1.25', { renderScale: 1.25 }],
  ['Native pixel density off', { nativePixelDensity: false }],
  ['Water simulation: fast', { waterSimulation: 'fast' }],
  ['Sea detail: standard', { seaDetail: 'standard' }],
  ['Caustics off', { caustics: false }],
  ['Spray mist off', { sprayMist: false }],
  ['Ocean view: near', { oceanView: 'near' }],
  ['Foam: simple', { foam: 'simple' }],
  ['Water look: classic', { waterLook: 'classic' }],
  ['Particles: medium', { particles: 'medium' }],
  ['Particles: low', { particles: 'low' }],
  ['Display cap: 60', { frameLimit: 60 }],
  ['Display cap: screen', { frameLimit: 'screen' }],
  ['Display cap: 60 + standard sea', { frameLimit: 60, seaDetail: 'standard' }],
];

// Installed before the game's scripts: a seeded Math.random (the menu's backdrop spot and the sea's
// randomness repeat between runs), each frame's interval, draw calls and main-thread work.
const INSTRUMENT = `(() => {
  let a = 0x5eed;
  Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const perf = window.__perf = { draws: 0, primitives: 0, work: 0, frames: [], gpu: [], gpuOther: [], gpuRows: [], gpuTimerSupport: [], snapshots: [], contextsDrawn: 0, sampling: false };
  const NativeWorker = window.Worker;
  const nativePost=NativeWorker.prototype.postMessage;NativeWorker.prototype.postMessage=function(request,...rest){
    if(request?.type==='start'&&request.config?.spot==='padang'&&request.options?.rider===true){
      perf.workerStart={config:{...request.config},rider:request.options.rider,renderSpacing:request.options.renderSpacing,barrelCaseCount:request.options.barrelCases?.length??0};
      NativeWorker.prototype.postMessage=nativePost;
    }return Reflect.apply(nativePost,this,[request,...rest]);
  };
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', ({ data }) => {
        if (data?.snapshot?.status) {
          const status = data.snapshot.status;
          if (${GPU_DIAGNOSTIC}) perf.latestSea = status.seaTime;
          if (perf.sampling) perf.snapshots.push({ wall: performance.now(), sea: status.seaTime, pipeline: status.pipelineMs });
        }
      });
    }
  };
  // A sample starts afresh: its frames, GPU times, and which contexts drew in it.
  perf.startSample = () => {
    perf.frames = []; perf.gpu = []; perf.gpuOther = []; perf.gpuRows = []; perf.snapshots = [];
    for (const t of timed) t.drawn = false;
    perf.sampling = true;
  };
  // Every WebGL 2 context gets a GPU timer around each frame callback. On ANGLE Metal a timer spans the GPU's
  // timeline, so it also counts work that overlaps it: other contexts' (the Surf screen's surfer preview) and other
  // processes'. So a timer counts only the callbacks its own context issued commands in, and the game's context
  // (the page's first) is reported apart from the others, never added to them: adding one timer per context counted
  // the Surf screen about twice.
  const timed = [];
  const byContext = new Map();
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const gl = getContext.call(this, type, ...rest);
    if (gl && type === 'webgl2' && !byContext.has(gl)) {
      const ext = ${GPU_TIMERS} ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null;
      const game = perf.gpuTimerSupport.length === 0;
      perf.gpuTimerSupport.push({ game, available: !!ext });
      byContext.set(gl, null);
      if (ext) {
        const t = { gl, ext, pending: [], used: false, game, drawn: false };
        timed.push(t);
        byContext.set(gl, t);
      }
    }
    return gl;
  };
  let frameIndex = 0;
  const gpuFrames = new Map();
  // Timers open just before a frame callback and close just after it, so they count its GPU work, not idle time.
  const beginTimers = () => timed.filter((t) => !t.gl.isContextLost()).map((t) => {
    const query = t.gl.createQuery();
    t.gl.beginQuery(t.ext.TIME_ELAPSED_EXT, query);
    t.used = false;
    return { t, query };
  });
  const endTimers = (open) => {
    for (const { t, query } of open) {
      t.gl.endQuery(t.ext.TIME_ELAPSED_EXT);
      t.pending.push({ query, frame: frameIndex, sampling: perf.sampling && t.used, sea: perf.latestSea });
      if (perf.sampling && t.used) t.drawn = true;
    }
  };
  const collect = () => {
    for (const t of timed) {
      const { gl, ext } = t;
      if (gl.isContextLost()) continue;
      while (t.pending.length && gl.getQueryParameter(t.pending[0].query, gl.QUERY_RESULT_AVAILABLE)) {
        const done = t.pending.shift();
        const ns = gl.getQueryParameter(done.query, gl.QUERY_RESULT);
        gl.deleteQuery(done.query);
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT) && done.sampling) {
          const sums = gpuFrames.get(done.frame) ?? { game: 0, other: 0, gameDrew: false, otherDrew: false, sea: done.sea };
          if (t.game) { sums.game += ns / 1e6; sums.gameDrew = true; } else { sums.other += ns / 1e6; sums.otherDrew = true; }
          gpuFrames.set(done.frame, sums);
        }
      }
    }
    // A frame's GPU time is final once every context has reported it (a few frames later).
    for (const [frame, sums] of gpuFrames) {
      if (frame >= frameIndex - 8) continue;
      if (sums.gameDrew) {
        perf.gpu.push(sums.game);
        if (${GPU_DIAGNOSTIC}) perf.gpuRows.push({ ms: sums.game, sea: sums.sea });
      }
      if (sums.otherDrew) perf.gpuOther.push(sums.other);
      gpuFrames.delete(frame);
    }
    perf.contextsDrawn = timed.filter((t) => t.drawn).length;
    frameIndex += 1;
  };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => raf((time) => {
    const start = performance.now();
    const open = beginTimers();
    try { callback(time); } finally { endTimers(open); perf.work += performance.now() - start; }
  });
  const count = (mode, n, instances = 1) => { perf.draws += 1; perf.primitives += mode === 4 ? (n / 3) * instances : 0; };
  // Which context the callback running now gives the GPU work to.
  const use = (gl) => {
    const t = byContext.get(gl);
    if (t) { t.used = true; if (${GPU_DIAGNOSTIC} && t.game) perf.drawSea = perf.latestSea; }
  };
  for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
    const wrap = (name, fn) => { const original = proto[name]; if (original) proto[name] = function (...args) { use(this); fn(args); return original.apply(this, args); }; };
    wrap('clear', () => {});
    wrap('blitFramebuffer', () => {});
    wrap('drawArrays', ([mode, , n]) => count(mode, n));
    wrap('drawElements', ([mode, n]) => count(mode, n));
    wrap('drawArraysInstanced', ([mode, , n, i]) => count(mode, n, i));
    wrap('drawElementsInstanced', ([mode, n, , , i]) => count(mode, n, i));
    wrap('drawRangeElements', ([mode, , , n]) => count(mode, n));
  }
  let last = 0;
  const loop = (time) => {
    collect();
    if (perf.sampling && last) perf.frames.push(${GPU_DIAGNOSTIC} ?
      [time - last, perf.draws, perf.work, perf.primitives, time, perf.drawSea ?? perf.latestSea] :
      [time - last, perf.draws, perf.work, perf.primitives]);
    perf.drawSea = undefined;
    perf.draws = 0; perf.work = 0; perf.primitives = 0; last = time;
    raf(loop);
  };
  raf(loop);
})();`;

function sh(command, commandArgs) {
  try { return execFileSync(command, commandArgs, { encoding: 'utf8' }).trim(); } catch { return ''; }
}

/** The power source now, and the battery's charge: Chrome's Energy Saver caps pages at 30 fps on a low battery. */
function powerNow() {
  const batt = sh('pmset', ['-g', 'batt']);
  const source = /AC Power/.test(batt) ? 'AC' : /Battery Power/.test(batt) ? 'battery' : 'unknown';
  const charge = /(\d+)%/.exec(batt)?.[1];
  return charge ? `${source} ${charge}%` : source;
}

/** The machine, without serial numbers or hardware UUIDs. */
function hardware() {
  const hw = JSON.parse(sh('system_profiler', ['SPHardwareDataType', 'SPDisplaysDataType', '-json']) || '{}');
  const h = hw.SPHardwareDataType?.[0] ?? {};
  const gpu = hw.SPDisplaysDataType?.[0] ?? {};
  const displays = (gpu.spdisplays_ndrvs ?? []).map((d) => ({
    name: d._name, resolution: d._spdisplays_resolution, pixels: d._spdisplays_pixels, main: d.spdisplays_main === 'spdisplays_yes',
  }));
  const power = sh('pmset', ['-g', 'batt']);
  return {
    model: h.machine_name, modelId: h.machine_model, chip: h.chip_type, cores: h.number_processors, memory: h.physical_memory,
    gpu: gpu.sppci_model, gpuCores: gpu.sppci_cores, metal: gpu.spdisplays_mtlgpufamilysupport, displays,
    os: `${sh('sw_vers', ['-productName'])} ${sh('sw_vers', ['-productVersion'])} (${sh('sw_vers', ['-buildVersion'])})`,
    power: /AC Power/.test(power) ? 'AC power' : /Battery Power/.test(power) ? 'battery' : 'unknown',
    lowPowerMode: /lowpowermode\s+1/.test(sh('pmset', ['-g'])),
    nodeCpus: cpus().length, totalMemoryGB: Math.round(totalmem() / 2 ** 30),
  };
}

function quantile(values, q) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((x, y) => x - y);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

/** A publication event can repeat a clock or advance several fixed physics steps. */
function publicationStats(events) {
  const fresh = [];
  const stepDeltas = [];
  let duplicateEvents = 0;
  let backwardsEvents = 0;
  let nonIntegralStepDeltas = 0;
  for (const event of events) {
    if (!Number.isFinite(event.sea)) continue;
    const previous = fresh.at(-1);
    if (!previous) { fresh.push(event); continue; }
    const advance = event.sea - previous.sea;
    if (Math.abs(advance) <= 1e-9) { duplicateEvents += 1; continue; }
    if (advance < 0) { backwardsEvents += 1; continue; }
    const steps = advance / FIXED_STEP_SECONDS;
    const wholeSteps = Math.round(steps);
    if (Math.abs(steps - wholeSteps) > 1e-4) nonIntegralStepDeltas += 1;
    stepDeltas.push(wholeSteps);
    fresh.push(event);
  }
  const span = events.length > 1 ? (events.at(-1).wall - events[0].wall) / 1000 : 0;
  const advance = fresh.length > 1 ? fresh.at(-1).sea - fresh[0].sea : 0;
  const round = (v, digits = 2) => Number(v.toFixed(digits));
  return { publicationEvents: events.length, advancingPublications: Math.max(0, fresh.length - 1),
    duplicatePublicationEvents: duplicateEvents, backwardsPublicationEvents: backwardsEvents,
    publicationEventsPerSecond: span > 0 ? round((events.length - 1) / span) : 0,
    freshSnapshots: fresh.length, freshSnapshotsPerSecond: span > 0 ? round((fresh.length - 1) / span) : 0,
    fixedPhysicsStepSeconds: FIXED_STEP_SECONDS, physicsAdvanceSeconds: round(advance, 6),
    physicsStepsPerWallSecond: span > 0 ? round(advance / FIXED_STEP_SECONDS / span) : 0,
    physicsStepRateMethod: 'seaTime advance divided by unchanged fixed1/60-second step and publication wall span',
    physicsStepsBetweenPublicationsP50: quantile(stepDeltas, 0.5),
    physicsStepsBetweenPublicationsP95: quantile(stepDeltas, 0.95),
    physicsStepsBetweenPublicationsMax: stepDeltas.length ? Math.max(...stepDeltas) : 0,
    physicsStepDeltaDistribution: Object.fromEntries([...new Set(stepDeltas)].sort((a, b) => a - b)
      .map((steps) => [steps, stepDeltas.filter((value) => value === steps).length])),
    nonIntegralPhysicsStepDeltas: nonIntegralStepDeltas };
}

/** Absolute sea-time bins compare the same wave clocks despite different wall-time cadence. */
function seaTimeBins(frames, snapshots, gpuRows) {
  const width = 5;
  const bins = new Map();
  const add = (sea, kind, row) => {
    if (!Number.isFinite(sea)) return;
    const from = Math.floor(sea / width) * width;
    if (!bins.has(from)) bins.set(from, { frames: [], snapshots: [], gpu: [] });
    bins.get(from)[kind].push(row);
  };
  for (const frame of frames) if (frame[1] > 0) add(frame[5], 'frames', frame);
  for (const row of snapshots) add(row.sea, 'snapshots', row);
  for (const row of gpuRows) add(row.sea, 'gpu', row.ms);
  const q = (values, at) => values.length ? Number(quantile(values, at).toFixed(2)) : null;
  return [...bins.entries()].sort(([a], [b]) => a - b).map(([from, rows]) => {
    const keys = Object.keys(rows.snapshots.find((row) => row.pipeline)?.pipeline ?? {});
    const pipelineQuantile = (at) => Object.fromEntries(keys.map((key) => [key,
      q(rows.snapshots.map((row) => row.pipeline?.[key]).filter(Number.isFinite), at)]));
    return { seaFrom: from, seaTo: from + width, renderedFrames: rows.frames.length,
      wallSeconds: rows.frames.length > 1 ? Number(((rows.frames.at(-1)[4] - rows.frames[0][4]) / 1000).toFixed(3)) : null,
      drawCallsP50: q(rows.frames.map((row) => row[1]), 0.5), drawCallsP95: q(rows.frames.map((row) => row[1]), 0.95),
      trianglesP50: q(rows.frames.map((row) => row[3]), 0.5), trianglesP95: q(rows.frames.map((row) => row[3]), 0.95),
      gpuSamples: rows.gpu.length, gpuMsP50: q(rows.gpu, 0.5), gpuMsP95: q(rows.gpu, 0.95),
      snapshots: rows.snapshots.length, pipelineMsP50: pipelineQuantile(0.5), pipelineMsP95: pipelineQuantile(0.95) };
  });
}

function summarize(frames) {
  const intervals = frames.map((f) => f[0]);
  const total = intervals.reduce((sum, v) => sum + v, 0);
  const rendered = frames.filter((f) => f[1] > 0);
  const renderedIntervals = [];
  let sinceDraw = 0;
  let hadDraw = false;
  for (const frame of frames) {
    sinceDraw += frame[0];
    if (frame[1] <= 0) continue;
    if (hadDraw) renderedIntervals.push(sinceDraw);
    hadDraw = true;
    sinceDraw = 0;
  }
  const round = (v, d = 1) => Number(v.toFixed(d));
  return {
    frames: frames.length,
    fps: round(frames.length / (total / 1000)),
    renderedFrames: rendered.length,
    renderedFps: round(rendered.length / (total / 1000)),
    renderedFrameMsP50: round(quantile(renderedIntervals, 0.5), 2),
    renderedFrameMsP95: round(quantile(renderedIntervals, 0.95), 2),
    renderedFrameMsP99: round(quantile(renderedIntervals, 0.99), 2),
    renderedFrameMsMax: round(renderedIntervals.length ? Math.max(...renderedIntervals) : 0),
    renderedDrawCalls: Math.round(quantile(rendered.map((f) => f[1]), 0.5)),
    renderedTrianglesP50: Math.round(quantile(rendered.map((f) => f[3]), 0.5)),
    renderedTrianglesP95: Math.round(quantile(rendered.map((f) => f[3]), 0.95)),
    fpsMedian: round(1000 / quantile(intervals, 0.5)),
    fps1Low: round(1000 / quantile(intervals, 0.99)),
    frameMsP50: round(quantile(intervals, 0.5), 2),
    frameMsP95: round(quantile(intervals, 0.95), 2),
    frameMsP99: round(quantile(intervals, 0.99), 2),
    frameMsMax: round(Math.max(...intervals), 1),
    mainThreadMsP50: round(quantile(frames.map((f) => f[2]), 0.5), 2),
    mainThreadMsP95: round(quantile(frames.map((f) => f[2]), 0.95), 2),
    drawCalls: Math.round(quantile(frames.map((f) => f[1]), 0.5)),
    trianglesK: round(quantile(frames.map((f) => f[3]), 0.5) / 1000, 0),
  };
}

/** Optional immutable-build check; validates every served JavaScript/CSS bundle, entry and worker before sampling. */
async function buildMetadata(directory, verify = true) {
  if (!directory) return undefined;
  const root = resolve(directory);
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const files = ['index.html', ...readdirSync(join(root, 'assets')).filter((f) => /\.(js|css)$/.test(f)).sort().map((f) => `assets/${f}`)];
  const bundle = createHash('sha256');
  for (const file of files) { bundle.update(file); bundle.update(readFileSync(join(root, file))); }
  const index = readFileSync(join(root, 'index.html'));
  const entry = index.toString().match(/<script[^>]+src="([^"]+)"/)?.[1];
  const workers = files.filter((f) => /^assets\/surfZoneWorker-[^/]+\.js$/.test(f));
  if (!entry || workers.length !== 1) throw new Error('Expected one production entry and surf-zone worker');
  const sourceFile = 'qa-source.json';
  let sourceProvenance;
  if (existsSync(join(root, sourceFile))) {
    const bytes = readFileSync(join(root, sourceFile));
    const metadata = JSON.parse(bytes);
    for (const source of metadata.sourceFiles) {
      if (hash(readFileSync(source.file)) !== source.sha256) throw new Error(`Frozen source hash differs from working tree: ${source.file}`);
    }
    sourceProvenance = { ...metadata, file: sourceFile, sha256: hash(bytes), matchesWorkingTree: true };
  }
  const verified = [];
  for (const file of verify ? [...files, ...(sourceProvenance ? [sourceFile] : [])] : []) {
    const response = await fetch(new URL(file, PAGE_URL));
    if (!response.ok) throw new Error(`Artifact fetch failed: ${file} (${response.status})`);
    const sha256 = hash(Buffer.from(await response.arrayBuffer()));
    if (sha256 !== hash(readFileSync(join(root, file)))) throw new Error(`Served artifact differs from --dir: ${file}`);
    verified.push({ file, sha256 });
  }
  return { root, sha256: bundle.digest('hex'), entry: entry.replace(/^\//, ''), worker: workers[0],
    files: files.map((file) => ({ file, sha256: hash(readFileSync(join(root, file))) })), verified, sourceProvenance };
}
const ordinary=ordinaryPlan();ordinary.resolvedEquivalence={"graphicsSourceSha256":"39e0bd72abe3bee7daf39f022775a4a2688a6ba798f02ca3564a1109ebfcea42","detected":{"preset":"high","water":"accurate","lowPerformance":false},"high":{"renderScale":1,"nativePixelDensity":true,"frameLimit":60,"waterSimulation":"auto","seaDetail":"rich","caustics":true,"sprayMist":true,"oceanView":"far","foam":"detailed","waterLook":"rich","particles":"high","preset":"high"},"custom":{"renderScale":0.8571428571428571,"nativePixelDensity":true,"frameLimit":60,"waterSimulation":"auto","seaDetail":"rich","caustics":true,"sprayMist":true,"oceanView":"far","foam":"detailed","waterLook":"rich","particles":"high","preset":"custom"},"resolvedHigh":{"pixelRatio":1.75,"frameInterval":16.666666666666668,"stage":2,"compute":"auto","richSea":true,"caustics":true,"sprayMist":true,"oceanView":"far","detailedFoam":true,"waterLook":"rich","particles":"high","stillBackdrop":false,"shadows":"surfaces","surferLodDistance":12,"textureCap":2048},"resolvedCustom":{"pixelRatio":1.5,"frameInterval":16.666666666666668,"stage":2,"compute":"auto","richSea":true,"caustics":true,"sprayMist":true,"oceanView":"far","detailedFoam":true,"waterLook":"rich","particles":"high","stillBackdrop":false,"shadows":"surfaces","surferLodDistance":12,"textureCap":2048},"differences":["pixelRatio"],"ownSurferLodDistance":"Infinity for both via ownSurferDetail","shaderImplementationUnchanged":true,"pointUniformSourceSha256":"23e722c6880c86c2e4ec81af681ad72732923bdd418695bd41593726db250439","threeMaterialsSourceSha256":"745d17a34b26ea6d59e35b6f13f6277d80c219f77db464516708bf726f02a8a8"};
ordinary.graphicsDelta={"preset":["high","custom"],"renderScale":[1,0.8571428571428571],"pixelRatio":[1.75,1.5],"canvas":["2989 × 1620","2562 × 1389"]};
ordinary.captureOutsideSample='After validated passive90, Escape→pause→outstanding0; retain full source/export/geometry/particles. Baseline held raster1.75→1.5→1.75 in same complete scene; candidate final capture verifies actualCustom uniforms/tier/shaders.';
const artifact = await buildMetadata(args.dir, !args.plan);
if (args.plan) {
  console.log(JSON.stringify({ planOnly: true, url: PAGE_URL, ordinary, artifact,
    chromeStarted: false, servedVerification: 'Deferred to the scheduled live run' }, null, 2));
  process.exit(0);
}
const page = await launch({ url: PAGE_URL, width: WIDTH, height: HEIGHT, port: Number(args.cdp ?? 9333), args: ['--mute-audio'] });
let save=()=>{};const bounded=async(promise,seconds)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Owned passive/held deadline')),seconds*1000);})]);}finally{clearTimeout(timer);}};
try{await bounded((async()=>{
await page.send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT });

const browser = await page.eval(`(async () => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const adapter = navigator.gpu ? await navigator.gpu.requestAdapter() : null;
  return {
    userAgent: navigator.userAgent, webgl: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
    webgpu: adapter ? [adapter.info?.vendor, adapter.info?.architecture].filter(Boolean).join(' · ') : 'unavailable',
    viewport: innerWidth + ' × ' + innerHeight, devicePixelRatio, screen: screen.width + ' × ' + screen.height,
  };
})()`);
browser.chrome = sh('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--version']);
if (ordinary && (browser.viewport !== ordinary.expectedViewport || browser.devicePixelRatio !== ordinary.expectedBrowserDpr)) {
  throw new Error(`Ordinary viewport/DPR mismatch before gameplay: ${browser.viewport} / ${browser.devicePixelRatio}`);
}
// The display's refresh, from an empty page's frames.
browser.refreshHz = Math.round(await page.eval(`new Promise((resolve) => { const times = []; const tick = (t) => { times.push(t); if (times.length < 240) requestAnimationFrame(tick); else { const d = times.slice(1).map((x, i) => x - times[i]).sort((a, b) => a - b); resolve(1000 / d[Math.floor(d.length / 2)]); } }; requestAnimationFrame(tick); })`));

const machine = hardware();
const run = { date: new Date().toISOString(), url: PAGE_URL, commit: args.commit ?? '', build: args.build ?? 'production (vite build)', artifact, ordinary, loadAverage: loadavg().map((v) => Number(v.toFixed(2))), machine, browser, window: `${WIDTH} × ${HEIGHT}`, frameCap: 'settings limit within display refresh', gpuTiming: GPU_TIMERS ? 'game context' : 'disabled (passive counters)', menuSeconds: MENU_SECONDS, rideSeconds: RIDE_SECONDS, results: [] };
console.log(JSON.stringify({ machine, browser }, null, 1));
mkdirSync(dirname(OUT), { recursive: true });
save = () => writeFileSync(OUT, `${JSON.stringify(run, null, 1)}\n`);

async function load(graphics) {
  // Custom graphics use the detected preset's surfer/shadow detail. Feature rows
  // vary High's advanced settings, so retain High detail instead of the fallback Medium.
  const detected = { preset: 'high', water: 'accurate', lowPerformance: false, adapter: browser.webgl };
  const settings = { graphics, detected, gameplay: { showTelemetry: true }, seen: { rideHints: true, lowPerformanceNotice: true } };
  await page.eval(`localStorage.setItem('breakline.settings.v1', ${JSON.stringify(JSON.stringify(settings))}); location.reload()`);
  await sleep(800);
  await page.waitFor(`document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')`, 90000);
  await page.eval(`(() => { const s = document.createElement('style'); s.textContent = '.ride-telemetry { visibility: hidden !important; }'; document.head.append(s); })()`);
}

const SOLVER = `(() => { for (const dt of document.querySelectorAll('.ride-telemetry dt')) if (dt.textContent.trim() === 'SOLVER') return dt.nextElementSibling?.textContent ?? ''; return ''; })()`;

async function sample(seconds) {
  await page.eval('window.__perf.startSample()');
  // The solver's step, read from the telemetry (4 Hz) through the window.
  const steps = [];
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const match = /([\d.]+) ms\/step/.exec(await page.eval(SOLVER));
    if (match) steps.push(Number(match[1]));
    await sleep(500);
  }
  const frames = await page.eval('(() => { window.__perf.sampling = false; return window.__perf.frames; })()');
  const snapshots = await page.eval('window.__perf.snapshots');
  const span = snapshots.length > 1 ? (snapshots.at(-1).wall - snapshots[0].wall) / 1000 : 0;
  const pipeline = {};
  const pipelineP95 = {};
  for (const key of Object.keys(snapshots.find((s) => s.pipeline)?.pipeline ?? {})) {
    pipeline[key] = Number(quantile(snapshots.map((s) => s.pipeline?.[key]).filter(Number.isFinite), 0.5).toFixed(2));
    pipelineP95[key] = Number(quantile(snapshots.map((s) => s.pipeline?.[key]).filter(Number.isFinite), 0.95).toFixed(2));
  }
  const snapshotIntervals = snapshots.slice(1).map((s, i) => s.wall - snapshots[i].wall);
  const simulation = span > 0 ? {
    ...publicationStats(snapshots),
    simulationSecondsPerWallSecond: Number(((snapshots.at(-1).sea - snapshots[0].sea) / span).toFixed(3)),
    pipelineMsP50: pipeline,
    pipelineMsP95: pipelineP95,
    snapshotIntervalMsP50: Number(quantile(snapshotIntervals, 0.5).toFixed(2)),
    snapshotIntervalMsP95: Number(quantile(snapshotIntervals, 0.95).toFixed(2)),
    snapshotIntervalMsP99: Number(quantile(snapshotIntervals, 0.99).toFixed(2)),
    snapshotIntervalMsMax: Number(Math.max(...snapshotIntervals).toFixed(2)),
    simulationTimeline: Array.from({ length: Math.ceil(span / 2) }, (_, i) => {
      const rows = snapshots.filter((s) => s.wall >= snapshots[0].wall + i * 2000 && s.wall < snapshots[0].wall + (i + 1) * 2000);
      const pipelineMsP50 = Object.fromEntries(Object.keys(pipeline).map((key) => [key,
        Number(quantile(rows.map((s) => s.pipeline?.[key]).filter(Number.isFinite), 0.5).toFixed(2))]));
      return { from: i * 2, snapshots: rows.length, waterMs: pipelineMsP50.water,
        totalMs: pipelineMsP50.total, substeps: pipelineMsP50.deviceSubsteps, pipelineMsP50,
        ...publicationStats(rows) };
    }),
  } : { freshSnapshots: snapshots.length };
  await sleep(300); // the last frames' GPU timers report a few frames late
  const { gpu, gpuOther, gpuRows, gpuTimerSupport, contextsDrawn } = await page.eval('({ gpu: window.__perf.gpu.slice(), gpuOther: window.__perf.gpuOther.slice(), gpuRows: window.__perf.gpuRows, gpuTimerSupport: window.__perf.gpuTimerSupport, contextsDrawn: window.__perf.contextsDrawn })');
  const extra = await page.eval(`(() => {
    const canvas = document.querySelector('canvas');
    const rows = {};
    for (const dt of document.querySelectorAll('.ride-telemetry dt')) rows[dt.textContent.trim()] = dt.nextElementSibling?.textContent.trim() ?? '';
    const d = window.breaklineDiagnostics;
    return { canvas: canvas ? canvas.width + ' × ' + canvas.height : '', solver: rows.SOLVER ?? '', config: d?.mode.config,
      observed: { viewport: innerWidth + ' × ' + innerHeight, browserDpr: devicePixelRatio,
        renderPixelRatio: canvas ? canvas.width / innerWidth : null,
        graphics: JSON.parse(localStorage.getItem('breakline.settings.v1') ?? '{}').graphics,
        waterLook: d?.water?.drawnLook, vertexNormals: d?.water?.vertexNormals,
        particleLevel: d?.mode?.particleLevel, renderSpacing: d?.water?.grid?.spacing,
        maxBatchSteps: d?.mode?.host?.maxBatchSteps,workerStart:window.__perf.workerStart,independentMaskSpacing:d?.water?.barrelMaskGrid?.spacing,
        compute: d?.mode?.host?.snapshot.status.compute, screen: document.querySelector('#app')?.dataset.screen },
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null };
  })()`);
  const stepStats = steps.length ? { solverMsP50: quantile(steps, 0.5), solverMsMax: Math.max(...steps) } : {};
  const gpuStats = {
    ...(gpu.length ? { gpuMsP50: Number(quantile(gpu, 0.5).toFixed(2)), gpuMsP95: Number(quantile(gpu, 0.95).toFixed(2)) } : {}),
    // The other contexts' own timers (the surfer preview), apart: each also spans the game's overlapping work.
    ...(gpuOther.length ? { gpuOtherMsP50: Number(quantile(gpuOther, 0.5).toFixed(2)), gpuOtherMsP95: Number(quantile(gpuOther, 0.95).toFixed(2)) } : {}),
    gpuContexts: contextsDrawn,
    ...(GPU_DIAGNOSTIC ? { gpuSamples: gpu.length, gpuTimestampAvailable: gpuTimerSupport.some((context) => context.game && context.available),
      gpuTimerSupport, seaTimeBins: seaTimeBins(frames, snapshots, gpuRows) } : {}),
  };
  return { ...summarize(frames), ...gpuStats, ...extra, ...stepStats, ...simulation };
}

async function measure(setting, screen, seconds, warmMs) {
  await sleep(warmMs);
  const stats = await sample(seconds);
  const failures = ordinary ? validateOrdinary(stats) : [];
  run.results.push({ setting, screen, ...stats, power: powerNow(), ...(ordinary ? {
    ordinaryConfigMatches: failures.length === 0, baselineComparable: failures.length===0&&!GPU_DIAGNOSTIC&&false,configuredGraphicsTradeoffMatches:failures.length===0,nativeQualityPreserved:false,
    diagnosticGpuProfile: GPU_DIAGNOSTIC, comparisonFailures: failures } : {}) });
  save();
  console.log(`${setting.padEnd(26)} ${screen.padEnd(20)} ${String(stats.renderedFps).padStart(6)} rendered fps (${stats.fps} callbacks/s)  callback p95 ${stats.frameMsP95} ms  gpu ${stats.gpuMsP50 ?? '-'}/${stats.gpuMsP95 ?? '-'} ms${stats.gpuOtherMsP50 !== undefined ? ` (preview ${stats.gpuOtherMsP50})` : ''}  main ${stats.mainThreadMsP50} ms  draws ${stats.drawCalls}  ${stats.canvas}  ${stats.solverMsP50 !== undefined ? `solver ${stats.solverMsP50}–${stats.solverMsMax} ms` : ''}  fresh publications ${stats.freshSnapshotsPerSecond ?? '-'}/s  physics steps ${stats.physicsStepsPerWallSecond ?? '-'}/s  simulation ${stats.simulationSecondsPerWallSecond ?? '-'}×`);
  if (failures.length) throw new Error(`Ordinary baseline mismatch: ${failures.join('; ')}`);
}

function validateOrdinary(stats) {
  const failures = [];
  for (const [key, value] of Object.entries(ordinary.expectedConfig)) if (stats.config?.[key] !== value) failures.push(`config.${key}: ${stats.config?.[key]} versus ${value}`);
  const o = stats.observed ?? {};
  if (o.viewport !== ordinary.expectedViewport) failures.push(`viewport ${o.viewport}`);
  if (o.browserDpr !== ordinary.expectedBrowserDpr) failures.push(`browser DPR ${o.browserDpr}`);
  if (stats.canvas !== ordinary.expectedCanvas) failures.push(`buffer ${stats.canvas}`);
  if (ordinary.expectedMaxBatchSteps !== undefined && o.maxBatchSteps !== ordinary.expectedMaxBatchSteps) {
    failures.push(`worker batch capacity ${o.maxBatchSteps} versus ${ordinary.expectedMaxBatchSteps}`);
  }
  for (const [key, value] of Object.entries(ordinary.graphics)) if (o.graphics?.[key] !== value) failures.push(`graphics.${key}: ${o.graphics?.[key]} versus ${value}`);
  if (o.waterLook !== 'rich' || o.vertexNormals !== false || o.particleLevel !== 'high' || o.compute !== 'gpu' || o.screen !== 'ride') {
    failures.push(`runtime look/normals/particles/compute/screen ${JSON.stringify(o)}`);
  }
  if(o.renderSpacing!==2||o.independentMaskSpacing!==1||o.renderPixelRatio!==ordinary.expectedRenderPixelRatio)failures.push('Render/contact/raster spacing changed');
  if(!o.workerStart||o.workerStart.rider!==true||o.workerStart.renderSpacing!==2||o.workerStart.barrelCaseCount!==4)failures.push('Actual rider/contact start options differ');
  for(const [key,value]of Object.entries(ordinary.expectedConfig))if(o.workerStart?.config?.[key]!==value)failures.push('Actual worker config differs:'+key);
  if (!(stats.freshSnapshots > 1) || !Number.isFinite(stats.pipelineMsP50?.total)) failures.push('Missing live snapshot/pipeline measurements');
  if (stats.backwardsPublicationEvents || stats.nonIntegralPhysicsStepDeltas) failures.push('Unexpected seaTime rewind or non-fixed physics step delta');
  return failures;
}

const onScreen = (name) => page.waitFor(`document.querySelector('#app')?.dataset.screen === ${JSON.stringify(name)}`, 120000);

async function captureHeld(){
  const folder="/private/tmp/render-scale-quality-20261003/candidate-held";mkdirSync(folder,{recursive:true});
  await page.eval('('+installHeldRasterProbe.toString()+')()');
  const full=await page.eval('window.__heldRaster.capture()');const fullBytes=Buffer.from(JSON.stringify(full));
  const sourcePath=join(folder,'source.json.gz');writeFileSync(sourcePath,gzipSync(fullBytes,{level:9,mtime:0}));
  const frames=[];const ratios=[["actualCustom",1.5]];
  for(const [name,ratio]of ratios){const observed=await page.eval('window.__heldRaster.draw('+ratio+')');
    const png=Buffer.from((await page.send('Page.captureScreenshot',{format:'png'})).data,'base64'),path=join(folder,name+'.png');writeFileSync(path,png);frames.push({name,ratio,path,pngSha256:sha(png),bytes:png.length,observed});}
  const invariant=await page.eval('window.__heldRaster.finish()');
  const first=frames[0].observed;for(const frame of frames)for(const key of ['shaderPrograms','shadow','ownSurferDetail','lights','waterSun'])if(JSON.stringify(first[key])!==JSON.stringify(frame.observed[key]))throw Error('Held tier/shader/lighting changed:'+key);
  const held={kind:"ActualCustom final scene; not matched to evolving baseline",sourcePath,sourceJsonSha256:sha(fullBytes),sourceCompressedSha256:sha(readFileSync(sourcePath)),invariant,frames,
    baselineRepeatPngSame:null,qualityAccepted:false};
  writeFileSync(join(folder,'report.json'),JSON.stringify(held,null,2)+'\n');run.held=held;save();
}
async function ride(setting, spot, { pause = false } = {}) {
  await page.click('.tile', 'Surf');
  await onScreen('surf');
  await sleep(600);
  await page.click('.spot-card', spot);
  await sleep(300);
  if (SWELL) {
    await page.click('.segmented button', SWELL);
    await sleep(300);
  }
  await page.click('.button-primary', 'Paddle out');
  await onScreen('ride');
  await measure(setting, `Ride · ${spot}`, RIDE_SECONDS, Number(args.warmSeconds ?? 5) * 1000);
  await page.press('Escape');
  await onScreen('pause');
  await captureHeld();
  if (pause) await measure(setting, 'Pause menu', MENU_SECONDS, 1500);
  await page.click('button', 'Quit to menu');
  await onScreen('menu');
}

/** Run one step; on failure keep a screenshot, note it, and start the preset again from a fresh page. */
async function attempt(setting, screen, step, graphics) {
  try {
    await step();
  } catch (error) {
    const shot = OUT.replace(/\.json$/, `-${setting}-${screen}`.replace(/[^a-z0-9.-]+/gi, '_') + '.png');
    try { writeFileSync(shot, Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64')); } catch { /* page gone */ }
    const state = await page.eval(`({ screen: document.querySelector('#app')?.dataset.screen, text: document.body.innerText.slice(0, 300) })`).catch(() => ({}));
    run.results.push({ setting, screen, error: String(error.message).split('\n')[0], state });
    save();
    console.log(`${setting} ${screen}: FAILED ${String(error.message).split('\n')[0]} · screen ${state.screen} · ${shot}`);
    if (ordinary) throw error;
    await load(graphics);
  }
}

  if (args.features) {
    const spot = args.spot ?? 'Reef';
    // --only=<name>,<name>: re-measure some settings (say, a row spoiled by a power blip).
    const only = args.only?.split(',');
    for (const [name, patch] of FEATURES.filter(([name]) => !only || only.includes(name))) {
      const graphics = { ...PRESET_VALUES.high, ...patch, preset: Object.keys(patch).length ? 'custom' : 'high' };
      await load(graphics);
      await sleep(1500);
      await attempt(name, `Ride · ${spot}`, () => ride(name, spot), graphics);
    }
  } else {
    for (const preset of PRESETS) {
      const label = preset[0].toUpperCase() + preset.slice(1);
      const graphics = { ...PRESET_VALUES[preset], preset };
      await load(graphics);
      await measure(label, 'Title menu', MENU_SECONDS, 4000);
      await page.click('.tile', 'Settings');
      await onScreen('settings');
      await measure(label, 'Settings', MENU_SECONDS, 1500);
      await page.click('.icon-back');
      await onScreen('menu');
      await page.click('.tile', 'Logbook');
      await onScreen('logbook');
      await measure(label, 'Logbook', MENU_SECONDS, 1500);
      await page.click('.icon-back');
      await onScreen('menu');
      await page.click('.tile', 'Surf');
      await onScreen('surf');
      await measure(label, 'Surf (pick a break)', MENU_SECONDS, 2500);
      await page.click('.icon-back');
      await onScreen('menu');
      for (const [index, spot] of SPOTS.entries()) await attempt(label, `Ride · ${spot}`, () => ride(label, spot, { pause: index === 0 }), graphics);
      await attempt(label, 'Wave Lab', async () => {
        await page.click('.tile', 'Wave Lab');
        await onScreen('wavelab');
        await measure(label, 'Wave Lab', MENU_SECONDS, 4000);
        await page.press('Escape');
        await onScreen('pause');
        await page.click('button', 'Quit to menu');
        await onScreen('menu');
      }, graphics);
    }
  }
})(),360);
}finally{
  save();
  await page.close();
}
