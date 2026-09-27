// Frame-rate survey (dev only): every screen at every graphics preset, in real Chrome on this machine.
//   npm run build && npm run preview        (the game on http://localhost:4173; --url to point elsewhere)
//   npm run survey:fps -- docs/research/fps/<date>-<machine>-1-presets.json --commit=<sha> [--presets=low,medium,high,ultra] [--spots=Beach,Point,Reef,Canyon]
//   npm run survey:fps -- docs/research/fps/<date>-<machine>-2-settings.json --features --spot=Beach [--only=<setting>,…]
//   npm run report:fps                       (docs/research/fps-report.md from every run)
// Writes the samples, their statistics and the machine. The display caps the frame rate, so each frame's GPU
// time is measured too (EXT_disjoint_timer_query_webgl2): the headroom under the cap. It is the game's context
// alone; a second context (the surfer preview) is reported apart (see INSTRUMENT). (Chrome 153 on macOS
// cannot lift the cap: --disable-gpu-vsync --disable-frame-rate-limit dropped the title screen from 120 to 55 fps.)
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { cpus, loadavg, totalmem } from 'node:os';
import { launch, sleep } from './cdp.mjs';

const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? 'true']; }));
const OUT = argv.find((a) => !a.startsWith('--')) ?? 'fps.json';
const PAGE_URL = args.url ?? 'http://localhost:4173/';
const WIDTH = Number(args.width ?? 1280);
const HEIGHT = Number(args.height ?? 720);
const PRESETS = (args.presets ?? 'low,medium,high,ultra').split(',');
const SPOTS = (args.spots ?? 'Beach,Point,Reef,Canyon').split(',');
/** Seconds sampled per screen: menus, rides. */
const MENU_SECONDS = Number(args.menuSeconds ?? 6);
const RIDE_SECONDS = Number(args.rideSeconds ?? 10);

/** Graphics.PRESETS, kept in step by hand (src/game/Graphics.ts). */
const PRESET_VALUES = {
  low: { renderScale: 0.75, nativePixelDensity: false, frameLimit: 'screen', waterSimulation: 'auto', seaDetail: 'standard', caustics: false, sprayMist: false, oceanView: 'near', foam: 'simple', waterLook: 'classic' },
  medium: { renderScale: 1, nativePixelDensity: false, frameLimit: 'screen', waterSimulation: 'auto', seaDetail: 'standard', caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich' },
  high: { renderScale: 1, nativePixelDensity: true, frameLimit: 'screen', waterSimulation: 'auto', seaDetail: 'rich', caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich' },
  ultra: { renderScale: 1.25, nativePixelDensity: true, frameLimit: 'screen', waterSimulation: 'auto', seaDetail: 'rich', caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich' },
};

/** One advanced setting changed from High at a time (the Custom preset; the surfer keeps High's detail). */
const FEATURES = [
  ['High (baseline)', {}],
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
];

// Installed before the game's scripts: a seeded Math.random (the menu's backdrop spot and the sea's
// randomness repeat between runs), each frame's interval, draw calls and main-thread work.
const INSTRUMENT = `(() => {
  let a = 0x5eed;
  Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const perf = window.__perf = { draws: 0, primitives: 0, work: 0, frames: [], gpu: [], gpuOther: [], contextsDrawn: 0, sampling: false };
  // A sample starts afresh: its frames, GPU times, and which contexts drew in it.
  perf.startSample = () => {
    perf.frames = []; perf.gpu = []; perf.gpuOther = [];
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
      const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      if (ext) {
        const t = { gl, ext, pending: [], used: false, game: timed.length === 0, drawn: false };
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
      t.pending.push({ query, frame: frameIndex, sampling: perf.sampling && t.used });
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
          const sums = gpuFrames.get(done.frame) ?? { game: 0, other: 0, gameDrew: false, otherDrew: false };
          if (t.game) { sums.game += ns / 1e6; sums.gameDrew = true; } else { sums.other += ns / 1e6; sums.otherDrew = true; }
          gpuFrames.set(done.frame, sums);
        }
      }
    }
    // A frame's GPU time is final once every context has reported it (a few frames later).
    for (const [frame, sums] of gpuFrames) {
      if (frame >= frameIndex - 8) continue;
      if (sums.gameDrew) perf.gpu.push(sums.game);
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
  const use = (gl) => { const t = byContext.get(gl); if (t) t.used = true; };
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
    if (perf.sampling && last) perf.frames.push([time - last, perf.draws, perf.work, perf.primitives]);
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

function summarize(frames) {
  const intervals = frames.map((f) => f[0]);
  const total = intervals.reduce((sum, v) => sum + v, 0);
  const round = (v, d = 1) => Number(v.toFixed(d));
  return {
    frames: frames.length,
    fps: round(frames.length / (total / 1000)),
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

const page = await launch({ url: PAGE_URL, width: WIDTH, height: HEIGHT, args: ['--mute-audio'] });
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
// The display's refresh, from an empty page's frames.
browser.refreshHz = Math.round(await page.eval(`new Promise((resolve) => { const times = []; const tick = (t) => { times.push(t); if (times.length < 240) requestAnimationFrame(tick); else { const d = times.slice(1).map((x, i) => x - times[i]).sort((a, b) => a - b); resolve(1000 / d[Math.floor(d.length / 2)]); } }; requestAnimationFrame(tick); })`));

const machine = hardware();
const run = { date: new Date().toISOString(), url: PAGE_URL, commit: args.commit ?? '', build: args.build ?? 'production (vite build)', loadAverage: loadavg().map((v) => Number(v.toFixed(2))), machine, browser, window: `${WIDTH} × ${HEIGHT}`, frameCap: 'display refresh (vsync)', gpuTiming: 'game context', menuSeconds: MENU_SECONDS, rideSeconds: RIDE_SECONDS, results: [] };
console.log(JSON.stringify({ machine, browser }, null, 1));
mkdirSync(dirname(OUT), { recursive: true });
const save = () => writeFileSync(OUT, `${JSON.stringify(run, null, 1)}\n`);

async function load(graphics) {
  const settings = { graphics, gameplay: { showTelemetry: true }, seen: { rideHints: true, lowPerformanceNotice: true } };
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
  await sleep(300); // the last frames' GPU timers report a few frames late
  const { gpu, gpuOther, contextsDrawn } = await page.eval('({ gpu: window.__perf.gpu.slice(), gpuOther: window.__perf.gpuOther.slice(), contextsDrawn: window.__perf.contextsDrawn })');
  const extra = await page.eval(`(() => {
    const canvas = document.querySelector('canvas');
    const rows = {};
    for (const dt of document.querySelectorAll('.ride-telemetry dt')) rows[dt.textContent.trim()] = dt.nextElementSibling?.textContent.trim() ?? '';
    return { canvas: canvas ? canvas.width + ' × ' + canvas.height : '', solver: rows.SOLVER ?? '', heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null };
  })()`);
  const stepStats = steps.length ? { solverMsP50: quantile(steps, 0.5), solverMsMax: Math.max(...steps) } : {};
  const gpuStats = {
    ...(gpu.length ? { gpuMsP50: Number(quantile(gpu, 0.5).toFixed(2)), gpuMsP95: Number(quantile(gpu, 0.95).toFixed(2)) } : {}),
    // The other contexts' own timers (the surfer preview), apart: each also spans the game's overlapping work.
    ...(gpuOther.length ? { gpuOtherMsP50: Number(quantile(gpuOther, 0.5).toFixed(2)), gpuOtherMsP95: Number(quantile(gpuOther, 0.95).toFixed(2)) } : {}),
    gpuContexts: contextsDrawn,
  };
  return { ...summarize(frames), ...gpuStats, ...extra, ...stepStats };
}

async function measure(setting, screen, seconds, warmMs) {
  await sleep(warmMs);
  const stats = await sample(seconds);
  run.results.push({ setting, screen, ...stats, power: powerNow() });
  save();
  console.log(`${setting.padEnd(26)} ${screen.padEnd(20)} ${String(stats.fps).padStart(6)} fps  1% low ${String(stats.fps1Low).padStart(6)}  p95 ${stats.frameMsP95} ms  gpu ${stats.gpuMsP50 ?? '-'}/${stats.gpuMsP95 ?? '-'} ms${stats.gpuOtherMsP50 !== undefined ? ` (preview ${stats.gpuOtherMsP50})` : ''}  main ${stats.mainThreadMsP50} ms  draws ${stats.drawCalls}  ${stats.canvas}  ${stats.solverMsP50 !== undefined ? `solver ${stats.solverMsP50}–${stats.solverMsMax} ms` : ''}`);
}

const onScreen = (name) => page.waitFor(`document.querySelector('#app')?.dataset.screen === ${JSON.stringify(name)}`, 120000);

async function ride(setting, spot, { pause = false } = {}) {
  await page.click('.tile', 'Surf');
  await onScreen('surf');
  await sleep(600);
  await page.click('.spot-card', spot);
  await sleep(300);
  await page.click('.button-primary', 'Paddle out');
  await onScreen('ride');
  await measure(setting, `Ride · ${spot}`, RIDE_SECONDS, 5000);
  await page.press('Escape');
  await onScreen('pause');
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
    await load(graphics);
  }
}

try {
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
} finally {
  save();
  await page.close();
}
