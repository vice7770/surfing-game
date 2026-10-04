// QA-only source/native guard. It reads ordinary state; it never issues a worker command.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const EXPECTED_CONFIG = { spot: 'padang', seed: 8761, significantHeight: 3.8, peakPeriod: 18, directionDegrees: 0, spreading: 150, tide: 0, windSpeed: 0, stage: 2, compute: 'auto', dx: 2, fineSpacing: 1, componentCount: 64 };

// Added after the original INSTRUMENT; only start metadata and cheap idle/one-step guards are observed.
export const AUDIT_PRELUDE = `(() => {
  const audit = window.__contactHeightFps = { workers: [], resizeEvents: 0 };
  window.addEventListener('resize', () => { audit.resizeEvents += 1; });
  const Native = window.Worker;
  const field = (object, key) => ({ own: Object.prototype.hasOwnProperty.call(object ?? {}, key), undefined: object?.[key] === undefined, ...(object?.[key] === undefined ? {} : { value: object[key] }) });
  window.Worker = class extends Native {
    constructor(...args) { super(...args); this.audit = { serial: audit.workers.length, url: String(args[0]), starts: [], advances: 0, badAdvances: 0, interventions: [] }; audit.workers.push(this); }
    postMessage(...args) {
      const request = args[0], row = this.audit;
      if (request?.type === 'start') row.starts.push({ at: performance.now(), config: { ...request.config }, rider: field(request.options, 'rider'), cases: request.options?.barrelCases?.map(bytes => bytes.byteLength) ?? [], renderSpacing: field(request.options, 'renderSpacing'), sea: field(request, 'sea'), soloOneStep: field(request, 'soloOneStep') });
      if (request?.type === 'advance') {
        row.advances += 1; row.lastSteps = request.steps;
        const i = request.input;
        const idle = request.steps === 1 && i && i.paddle === false && i.popUp === false && i.hand === false && i.reel === false
          && i.steer === 0 && i.trim === 0 && i.crouch === 0 && i.compress === 0 && i.duckDive === 0 && i.rotate === undefined
          && i.retry === false && i.place === undefined && i.spawnAt === undefined && i.pocketReflex === false && request.reactions === undefined;
        if (!idle) { row.badAdvances += 1; if (!row.firstBad) row.firstBad = { at: performance.now(), steps: request.steps, input: Object.fromEntries(['paddle','popUp','hand','reel','steer','trim','crouch','compress','duckDive','rotate','retry','place','spawnAt','pocketReflex'].map(key => [key, field(i, key)])), reactions: field(request, 'reactions') }; }
      } else if (request?.type && !['start','look','sprayEnabled','particles'].includes(request.type)) row.interventions.push({ type: request.type, at: performance.now() });
      return Reflect.apply(Native.prototype.postMessage, this, args);
    }
  };
})();`;

export function ordinaryNativePlan({ args, pageUrl, swell, gpuTimers, gpuDiagnostic, rideSeconds, preset, edition }) {
  const url = new URL(pageUrl);
  if (url.searchParams.size !== 1 || !url.searchParams.has('diagnostics') || url.searchParams.get('diagnostics') !== '') throw Error('Only ?diagnostics is allowed');
  if (!args.dir || args.features !== 'true' || args.only !== 'High (baseline)' || args.spot !== 'Padang' || swell !== 'Big' || gpuTimers !== false || gpuDiagnostic !== false
      || rideSeconds !== 90 || Number(args.warmSeconds) !== 5 || edition !== 'single-step-publication' || Number(args.width) !== 1708 || Number(args.height) !== 966) throw Error('Ordinary passive arm flags differ');
  return { method: 'Original ordinary Surf/Padang/Big route; five-second warmup then90s passive sample; idle input; native viewport observed rather than resized',
    diagnosticGpuProfile: false, timingComparableToPassiveBaseline: true, fixedPhysicsStepSeconds: 1 / 60,
    expectedConfig: EXPECTED_CONFIG, expectedMaxBatchSteps: 1, expectedBrowserDpr: 2, expectedRenderPixelRatio: 1.75,
    graphics: { ...preset, preset: 'high' }, normalMode: 'production pixel normals',
    expectedViewport: undefined, expectedCanvas: undefined, nativeReferencePending: true,
    runtimeOverrides: [{ realm: 'page only', target: 'Math.random', initialState: 0x5eed, method: 'original survey INSTRUMENT Mulberry32' }], workerRngOverride: false,
    pipelineMetricSemantics: 'Original survey statistics retained. Last-step stage quantiles are not request latency or additive headroom; rendered cadence, fresh publications and sea-time progress are separate.' };
}

export class NativePassiveGuard {
  constructor({ output, baseline }) { this.output = output; this.baseline = baseline; const solo = process.env.FULL_WRITER_FPS_EXPECTED_SOLO_ONE_STEP; if (!['0','1'].includes(solo)) throw Error('Prefetch arm capability binding missing'); this.expectedSoloOneStep = solo === '1'; this.expectedWorkerPath = process.env.FULL_WRITER_FPS_EXPECTED_WORKER; if (!this.expectedWorkerPath) throw Error('Compiled worker binding missing'); this.state = { observations: [], valid: false, workerRngOverride: false, resizeOverrides: [], runtimeQueries: 'page read-only only' }; mkdirSync(output, { recursive: true }); }
  save() { writeFileSync(join(this.output, 'native-audit.json'), JSON.stringify(this.state, null, 2) + '\n'); }
  async observe(phase, page, ordinary, first = false) {
    const actual = await page.eval(`(() => {
      const d = window.breaklineDiagnostics, a = window.__contactHeightFps, canvas = d?.canvas ?? document.querySelector('canvas'), host = d?.mode?.host, worker = host?.port;
      return { inner: [innerWidth, innerHeight], outer: [outerWidth, outerHeight], dpr: devicePixelRatio,
        canvas: canvas ? [canvas.width, canvas.height] : null, canvasClient: canvas ? [canvas.clientWidth, canvas.clientHeight] : null,
        graphics: JSON.parse(localStorage.getItem('breakline.settings.v1') ?? '{}').graphics,
        resizeEvents: a?.resizeEvents, screen: document.querySelector('#app')?.dataset.screen,
        ready: d?.mode?.ready, config: d?.mode?.config, renderSpacing: d?.water?.grid?.spacing, maskSpacing: d?.water?.uniforms?.waterBarrelGrid?.value?.z,
        maxBatchSteps: host?.maxBatchSteps, compute: host?.snapshot?.status?.compute, cells: host?.snapshot?.status?.cells,
        look: d?.water?.drawnLook, vertexNormals: d?.water?.vertexNormals, particles: d?.mode?.particleLevel,
        actualWorker: worker?.audit ?? null, workerMetadata: a?.workers?.map(w => w.audit) ?? [],
        repairRange: (() => {
          const water = d?.water, mesh = water?.barrelFallback, source = water?.mesh?.geometry;
          if (!mesh || !source) return null;
          const originalCount = Math.min(source.drawRange.count, source.index?.count ?? 0), range = mesh.geometry.drawRange;
          return { visible: mesh.visible, active: water.barrelMaskActive, sameAttributes: mesh.geometry.attributes === source.attributes, sameIndex: mesh.geometry.index === source.index,
            originalIndexCount: source.index?.count, originalEffectiveCount: originalCount, selectedStart: range.start, selectedCount: Math.min(range.count, mesh.geometry.index?.count ?? 0),
            cropped: mesh.visible && range.count < originalCount, richRepairIndexCount: water.barrelPatchFallback?.geometry?.index?.count,
            semantics: 'Last selected repair range at metadata observation only; not an eligibility fraction or per-frame instrument' };
        })() };
    })()`);
    const { windowId } = await page.send('Browser.getWindowForTarget');
    const { bounds } = await page.send('Browser.getWindowBounds', { windowId });
    const row = { phase, at: new Date().toISOString(), actual, bounds };
    this.state.observations.push(row); this.save();
    const tuple = { inner: actual.inner, outer: actual.outer, dpr: actual.dpr, canvas: actual.canvas, canvasClient: actual.canvasClient, bounds: { width: bounds.width, height: bounds.height, windowState: bounds.windowState } };
    const fail = (message) => { this.state.firstFailure ??= { phase, message }; this.save(); throw Error(message); };
    if (JSON.stringify(actual.inner) !== JSON.stringify([1708, 879]) || JSON.stringify(actual.canvas) !== JSON.stringify([2989, 1538])) fail('Native ordinary reference dimensions differ');
    if (actual.dpr !== 2 || !actual.canvas || actual.canvas[0] !== Math.floor(actual.inner[0] * 1.75) || actual.canvas[1] !== Math.floor(actual.inner[1] * 1.75)) fail('Native High backing/DPR differs');
    if (actual.inner[0] !== 1708 || actual.inner[1] !== 879 || actual.canvas[0] !== 2989 || actual.canvas[1] !== 1538) fail('Predeclared native CSS/backing tuple differs; no resizing');
    for (const [key, value] of Object.entries(ordinary.graphics)) if (actual.graphics?.[key] !== value) fail('Graphics.' + key + ' differs');
    if (first) {
      this.state.nativeReference = tuple; this.state.menuResizeEvents = actual.resizeEvents;
      ordinary.expectedViewport = actual.inner.join(' × '); ordinary.expectedCanvas = actual.canvas.join(' × '); ordinary.nativeReferencePending = false;
      if (this.baseline && (JSON.stringify(tuple) !== JSON.stringify(this.baseline.nativeAudit?.nativeReference) || JSON.stringify(actual.graphics) !== JSON.stringify(this.baseline.nativeAudit?.observations?.[0]?.actual.graphics))) fail('Candidate native tuple/settings do not match retained baseline');
    } else {
      if (JSON.stringify(tuple) !== JSON.stringify(this.state.nativeReference) || actual.resizeEvents !== this.state.menuResizeEvents) fail('Native dimensions changed after menu');
      for (const [key, value] of Object.entries(EXPECTED_CONFIG)) if (actual.config?.[key] !== value) fail('Config.' + key + ' differs');
      const w = actual.actualWorker, start = w?.starts?.[0];
      if (actual.screen !== 'ride' || actual.ready !== true || actual.compute !== 'gpu' || actual.cells !== 116000 || actual.maxBatchSteps !== 1 || actual.renderSpacing !== 2 || actual.maskSpacing !== 1
          || actual.look !== 'rich' || actual.vertexNormals !== false || actual.particles !== 'high') fail('Ordinary physical/graphics runtime differs');
      if (!w || w.starts.length !== 1 || start?.rider.value !== true || start?.cases.length !== 4 || !start?.renderSpacing.undefined || !start?.sea.undefined || w.advances < 1 || w.badAdvances !== 0 || w.lastSteps !== 1 || w.interventions.length !== 0) fail('Actual Ride worker start/one-step idle scope differs');
      if (this.expectedSoloOneStep ? start.soloOneStep?.value !== true : (!start.soloOneStep?.undefined || start.soloOneStep?.own)) fail('Actual Ride internal solo capability differs');
      if (new URL(w.url).pathname !== '/' + this.expectedWorkerPath) fail('Actual Ride worker URL differs from frozen compiled worker');
      for (const [key, value] of Object.entries(EXPECTED_CONFIG)) if (start.config?.[key] !== value) fail('Actual worker config.' + key + ' differs');
      this.state.rideWorkerSerial = w.serial; this.state.practiceWorkerSerialsExcluded = actual.workerMetadata.filter(other => other.serial !== w.serial).map(other => other.serial);
    }
    this.save(); return row;
  }
  finish(run) { this.state.valid = !this.state.firstFailure && this.state.observations.length === 3 && run.results.length === 1 && run.results[0].ordinaryConfigMatches === true && !run.results[0].error; this.save(); return this.state; }
}
