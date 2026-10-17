/**
 * Browser check for the GPU stage 2 step (plan P6, dev only: /gpu-check.html).
 * Two identical surf zones step side by side, one on the CPU solver and one on
 * the device, and the page reports how far the device's surface and fluxes
 * drift from the CPU reference, and what each step costs. With `&plunge`, both
 * hold the same jet plunge zones (`holdPlunge`) on the most strongly breaking
 * water every half second, and the drift inside them is reported too. Every
 * report also gives the drift in the cells the reference holds in shallow water
 * this step (its mask off); `&hs=` and `&period=` choose the swell (the Reef's
 * Big: `?spot=reef&hs=3&period=17`).
 * `?mode=lips` and `?mode=probes` hold the tiers' lips, tubes, whitewater and
 * stability side by side (src/dev/tierParityPage.ts).
 */
import { DataUtils, WebGLRenderer } from 'three';
import { FftChop } from './scene/FftChop';
import { chopSpectrum, inverseFft2d, slopeSpectrum } from './scene/fftChopMath';
import { BoussinesqSolver } from './wave/BoussinesqSolver';
import { GpuBoussinesq } from './wave/gpu/GpuBoussinesq';
import { SURF_ZONE_STEP, SurfZoneRunner } from './wave/SurfZoneRunner';
import { SurfZoneSimulation, type SurfZoneConfig } from './wave/SurfZoneSimulation';
import { WorkerSurfZone, createSurfZoneWorker, type WorkerPort } from './game/WorkerSurfZone';
import { transferables, type SurfZoneReply, type SurfZoneRequest } from './game/SurfZoneWorkerCore';
import { barrelCaseBytes, surfZoneConfigFor, webGpuAvailable } from './game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from './game/SurfConditions';
import { sweptBarrelOn } from './wave/SurfZoneSimulation';
import type { SurfZoneStatus } from './wave/SurfZoneRunner';
import { lipParity, probeParity } from './dev/tierParityPage';

const log = document.querySelector<HTMLPreElement>('#log')!;
const lines: string[] = [];
/** A line kept under the log, replaced as long runs progress. */
let liveLine = '';
const render = () => {
  log.textContent = (liveLine ? [...lines, liveLine] : lines).join('\n');
};
const say = (line: string) => {
  lines.push(line);
  render();
};
const live = (text: string) => {
  liveLine = text;
  render();
};

function drift(reference: BoussinesqSolver, device: BoussinesqSolver): {
  eta: number; etaRms: number; flux: number; breaking: number; held: number; heldCells: number; shallow: number; shallowCells: number;
} {
  let worst = 0;
  let squared = 0;
  let signal = 0;
  let flux = 0;
  let breaking = 0;
  let wet = 0;
  let held = 0;
  let heldCells = 0;
  let shallow = 0;
  let shallowCells = 0;
  for (let i = 0; i < reference.h.length; i += 1) {
    if (reference.h[i] <= 0.01 && device.h[i] <= 0.01) continue;
    wet += 1;
    const eta = reference.h[i] + reference.bed[i] - reference.restLevel;
    const difference = device.h[i] - reference.h[i];
    worst = Math.max(worst, Math.abs(difference));
    squared += difference * difference;
    signal += eta * eta;
    flux = Math.max(flux, Math.abs(device.qx[i] - reference.qx[i]), Math.abs(device.qz[i] - reference.qz[i]));
    if ((reference.breakingStrength[i] > 0) !== (device.breakingStrength[i] > 0)) breaking += 1;
    if (reference.plungeHold[i] > 0) {
      heldCells += 1;
      held = Math.max(held, Math.abs(difference));
    }
    if (!(reference.mask[i] > 0)) {
      shallowCells += 1;
      shallow = Math.max(shallow, Math.abs(difference));
    }
  }
  return { eta: worst, etaRms: Math.sqrt(squared / Math.max(1, signal)), flux, breaking: breaking / Math.max(1, wet), held, heldCells, shallow, shallowCells };
}

/** Hold the same plunge zone in both solvers, on the reference's most strongly breaking wet cell, along its flow. */
function plungeBoth(reference: BoussinesqSolver, device: BoussinesqSolver): void {
  let cell = -1;
  for (let i = 0; i < reference.h.length; i += 1) {
    if (reference.h[i] > 0.1 && reference.breakingStrength[i] > (cell < 0 ? 0 : reference.breakingStrength[cell])) cell = i;
  }
  if (cell < 0) return;
  const x = reference.xCenters[cell % reference.nx];
  const z = reference.zCenters[Math.floor(cell / reference.nx)];
  for (const solver of [reference, device]) solver.holdPlunge(x, z, reference.qx[cell], reference.qz[cell], 2);
}

async function run(): Promise<void> {
  const spot = (new URLSearchParams(location.search).get('spot') ?? 'point') as SurfZoneConfig['spot'];
  const seconds = Number(new URLSearchParams(location.search).get('seconds') ?? 10);
  const plunge = new URLSearchParams(location.search).has('plunge');
  const significantHeight = Number(new URLSearchParams(location.search).get('hs') ?? 1.4);
  const peakPeriod = Number(new URLSearchParams(location.search).get('period') ?? 10);
  const config: SurfZoneConfig = { spot, seed: 1, significantHeight, peakPeriod, directionDegrees: 10, spreading: 12, tide: 0, windSpeed: 0 };
  say(`Spot ${spot}, Hs ${significantHeight} m, ${peakPeriod} s: building two surf zones…`);
  const reference = new SurfZoneSimulation(config);
  const mirrored = new SurfZoneSimulation(config);
  const cpu = reference.solver as BoussinesqSolver;
  const solver = mirrored.solver as BoussinesqSolver;
  say(`Grid ${cpu.nx} × ${cpu.nz} = ${(cpu.nx * cpu.nz).toLocaleString('en-US')} cells.`);
  const device = await GpuBoussinesq.create(solver);
  if (!device) {
    say('No WebGPU device (or this solver setup is not covered): nothing to compare.');
    return;
  }
  say(`Device ready. Stepping ${seconds} s at ${SURF_ZONE_STEP.toFixed(4)} s per frame…`);
  let cpuMs = 0;
  let gpuMs = 0;
  const frames = Math.round(seconds / SURF_ZONE_STEP);
  for (let frame = 1; frame <= frames; frame += 1) {
    if (plunge && frame % 30 === 0) plungeBoth(cpu, solver);
    let start = performance.now();
    cpu.step(SURF_ZONE_STEP);
    cpuMs += performance.now() - start;
    start = performance.now();
    await device.step(SURF_ZONE_STEP);
    gpuMs += performance.now() - start;
    if (frame % 60 === 0 || frame === 1) {
      const d = drift(cpu, solver);
      const held = plunge ? ` · plunge zone ${d.heldCells} cells, max |Δh| there ${d.held.toExponential(2)} m` : '';
      const shallow = ` · shallow water ${d.shallowCells} cells, max |Δh| there ${d.shallow.toExponential(2)} m`;
      say(`t ${(frame * SURF_ZONE_STEP).toFixed(2)} s · max |Δh| ${d.eta.toExponential(2)} m · rms Δh / rms η ${d.etaRms.toExponential(2)} · max |Δq| ${d.flux.toExponential(2)} m²/s · breaking disagrees on ${(d.breaking * 100).toFixed(2)} % of wet cells${held}${shallow}`);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  say(`Mean per frame: CPU ${(cpuMs / frames).toFixed(2)} ms, GPU ${(gpuMs / frames).toFixed(2)} ms (upload, ${device.lastSubsteps} substeps and readback).`);
  // Where the device time goes: the same frame with parts left out (the water is not compared after this).
  const timeFrames = async (label: string) => {
    let total = 0;
    for (let frame = 0; frame < 60; frame += 1) {
      const start = performance.now();
      await device.step(SURF_ZONE_STEP);
      total += performance.now() - start;
    }
    say(`  ${label}: ${(total / 60).toFixed(2)} ms per frame`);
  };
  const all = [...device.kernels];
  await timeFrames('everything');
  device.readback = false;
  await timeFrames('no readback');
  for (const dropped of [['rowTerms', 'rows', 'columnTerms', 'columns'], ['rows', 'columns'], ['rowTerms', 'columnTerms'], ['modified', 'sources'], ['predict', 'rates']]) {
    device.kernels = all.filter((kernel) => !dropped.includes(kernel));
    await timeFrames(`no readback, without ${dropped.join(' and ')}`);
  }
  device.kernels = [];
  await timeFrames('no readback, no kernels (upload and submit only)');
  (window as unknown as { gpuCheck: unknown }).gpuCheck = { cpuMs: cpuMs / frames, gpuMs: gpuMs / frames, drift: drift(cpu, solver) };
  say('DONE');
  device.dispose();
}

/**
 * The game's worker surf zone, with a rider, advanced as fast as it replies:
 * simulated seconds per wall second. Message-driven, so a hidden page's timer
 * throttling does not slow it.
 */
function throughputOf(config: SurfZoneConfig): Promise<{ rate: number; compute: string; stepMs: number }> {
  return new Promise((resolve, reject) => {
    const port = createSurfZoneWorker();
    let first = 0;
    let started = 0;
    port.onerror = (event) => reject(new Error(event.message || 'worker failed'));
    port.onmessage = ({ data }) => {
      if (data.type === 'state') return;
      const { status, ...buffers } = data.snapshot;
      if (data.type === 'ready') {
        first = status.seaTime;
        started = performance.now();
      } else if (performance.now() - started > 6000) {
        port.terminate();
        resolve({ rate: (status.seaTime - first) / ((performance.now() - started) / 1000), compute: status.compute, stepMs: status.stepMs });
        return;
      }
      port.postMessage({ type: 'advance', steps: 2, buffers, input: { paddle: false, popUp: false, steer: 0, retry: false } }, transferables(buffers));
    };
    port.postMessage({ type: 'start', config, options: { rider: true } });
  });
}

async function throughput(): Promise<void> {
  const spot = (new URLSearchParams(location.search).get('spot') ?? 'point') as SurfZoneConfig['spot'];
  for (const compute of ['auto', 'cpu'] as const) {
    say(`Worker, ${compute === 'auto' ? 'GPU when available' : 'CPU only'}: starting…`);
    const config: SurfZoneConfig = { spot, seed: 1, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 10, spreading: 12, tide: 0, windSpeed: 0, compute };
    const result = await throughputOf(config);
    say(`  steps on the ${result.compute.toUpperCase()}: ${result.rate.toFixed(2)}× real time, last step ${result.stepMs.toFixed(1)} ms`);
  }
  say('DONE');
}

/** The FFT chop's slope map on this page's WebGL2 GPU against the TypeScript reference transform. */
async function chop(): Promise<void> {
  const renderer = new WebGLRenderer({ canvas: document.createElement('canvas') });
  const fft = new FftChop();
  const wind = 6;
  const time = 2.5;
  fft.setWind(wind, 1);
  fft.render(renderer, time);
  const n = fft.size;
  const pixels = new Uint16Array(n * n * 4);
  renderer.readRenderTargetPixels(fft.output, 0, 0, n, n, pixels);
  const reference = inverseFft2d(slopeSpectrum(chopSpectrum(wind, 1, n, fft.patch), time, n, fft.patch), n);
  let worst = 0;
  let squares = 0;
  for (let i = 0; i < n * n; i += 1) {
    for (let c = 0; c < 2; c += 1) {
      const gpu = DataUtils.fromHalfFloat(pixels[i * 4 + c]);
      worst = Math.max(worst, Math.abs(gpu - reference[i * 2 + c]));
      squares += reference[i * 2 + c] ** 2;
    }
  }
  const rms = Math.sqrt(squares / (n * n));
  say(`FFT chop ${n}² at t ${time} s: rms slope ${rms.toFixed(4)}, largest GPU error ${worst.toExponential(2)} (${((worst / rms) * 100).toFixed(2)} % of rms)`);
  const started = performance.now();
  for (let frame = 0; frame < 120; frame += 1) fft.render(renderer, time + frame / 60);
  renderer.readRenderTargetPixels(fft.output, 0, 0, 1, 1, new Uint16Array(4));
  say(`  ${((performance.now() - started) / 120).toFixed(2)} ms per transform (17 passes, CPU wall time including the final sync)`);
  say('DONE');
  fft.dispose();
  renderer.dispose();
}

/** A full surf-zone step (water on the device, lip, foam, breaking) on a finer grid: `?mode=fine&dx=0.5`. */
async function fine(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const dx = Number(params.get('dx') ?? 0.5);
  const config: SurfZoneConfig = {
    spot: 'point', seed: 1, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 10, spreading: 12, tide: 0, windSpeed: 0,
    dx, fineSpacing: dx, spinUpPeriods: Number(params.get('spinUp') ?? 0.3),
  };
  let started = performance.now();
  const simulation = new SurfZoneSimulation(config);
  const solver = simulation.solver as BoussinesqSolver;
  say(`${dx} m cells: ${solver.nx} × ${solver.nz} = ${(solver.nx * solver.nz).toLocaleString('en-US')} cells; built and spun up on the CPU in ${((performance.now() - started) / 1000).toFixed(1)} s`);
  const device = await GpuBoussinesq.create(solver);
  if (!device) {
    say('No device.');
    return;
  }
  simulation.device = device;
  let water = 0;
  let total = 0;
  const frames = 120;
  for (let frame = 0; frame < frames; frame += 1) {
    started = performance.now();
    await simulation.stepAsync(SURF_ZONE_STEP);
    total += performance.now() - started;
    water += device.lastStepMs;
  }
  say(`  per 1/60 s step: ${(total / frames).toFixed(2)} ms in all, ${(water / frames).toFixed(2)} ms of it the device's water (${device.lastSubsteps} substeps)`);
  say('DONE');
  device.dispose();
}

/** A worker port that also tells the page each reply, after the host has handled it. */
class TimedPort implements WorkerPort {
  onerror: ((event: ErrorEvent) => void) | null = null;
  private handler: ((event: MessageEvent<SurfZoneReply>) => void) | null = null;
  constructor(private readonly worker: WorkerPort, arrived: (reply: SurfZoneReply) => void) {
    worker.onmessage = (event) => {
      this.handler?.(event);
      arrived(event.data);
    };
    worker.onerror = (event) => this.onerror?.(event);
  }
  get onmessage() { return this.handler; }
  set onmessage(handler) { this.handler = handler; }
  postMessage(request: SurfZoneRequest, transfer?: Transferable[]): void { this.worker.postMessage(request, transfer); }
  terminate(): void { this.worker.terminate(); }
}

type Pipeline = NonNullable<SurfZoneStatus['pipelineMs']>;

/**
 * A stand-in for the game's drawing on the same GPU: a WebGL2 full-screen pass `iterations` deep on an OffscreenCanvas
 * in its own worker, issued at most every 1/60 s and only once the previous one has finished (a fence), on the worker's
 * timers, which a hidden page does not throttle, and without busying the page. Returns a stop function that reports
 * the frames it drew and their median interval.
 */
function syntheticDrawing(iterations: number, width = 2048, height = 1280): () => Promise<{ framesPerSecond: number; frameMs: number }> {
  const source = `
    const canvas = new OffscreenCanvas(${width}, ${height});
    const gl = canvas.getContext('webgl2', { antialias: false });
    const shader = (type, text) => { const o = gl.createShader(type); gl.shaderSource(o, text); gl.compileShader(o); return o; };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, \`#version 300 es
      void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }\`));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, \`#version 300 es
      precision highp float; uniform float t; out vec4 colour;
      void main() {
        vec2 p = gl_FragCoord.xy * 0.001; float a = t;
        for (int i = 0; i < ${Math.max(1, Math.round(iterations))}; i++) { a = sin(a + p.x) * cos(a - p.y) + 0.5 * a; }
        colour = vec4(a, p, 1.0);
      }\`));
    gl.linkProgram(program);
    gl.useProgram(program);
    const time = gl.getUniformLocation(program, 't');
    let sync = null, last = 0, issued = 0, stopped = false;
    const intervals = [];
    const started = performance.now();
    const tick = () => {
      if (stopped) return;
      const now = performance.now();
      if (!(sync && gl.getSyncParameter(sync, gl.SYNC_STATUS) !== gl.SIGNALED) && now - last >= 1000 / 60) {
        if (sync) gl.deleteSync(sync);
        if (last > 0) intervals.push(now - last);
        last = now;
        gl.uniform1f(time, now * 0.001);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        issued += 1;
      }
      setTimeout(tick, 2);
    };
    tick();
    onmessage = () => {
      stopped = true;
      const sorted = intervals.slice().sort((a, b) => a - b);
      postMessage({ framesPerSecond: issued / ((performance.now() - started) / 1000), frameMs: sorted[Math.floor(sorted.length / 2)] ?? NaN });
    };
  `;
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const worker = new Worker(url);
  return () => new Promise((resolve) => {
    worker.onmessage = ({ data }) => {
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(data);
    };
    worker.postMessage('stop');
  });
}

/**
 * The game's own sea in its worker, timed step by step (the M1 readback study, 2026-10-17):
 * `?mode=pipeline&spot=canyon&size=medium`. The game's host (WorkerSurfZone) with an idle rider, one step per request
 * as in play, asked for its next step as soon as a snapshot arrives; `&hop=8` first keeps the page busy that many ms,
 * as a frame's drawing would. Message-driven, so a hidden page's timer throttling does not slow it. Reports simulated
 * seconds per wall second, fresh snapshots per second, the worker's stage timings (p50 and p95) and the device's bytes,
 * maps and queue submissions per step. `&tier=0` builds Medium's sea (24 components) instead of High's 64; `&rider=0` leaves
 * the sea riderless, as the menu's is (`&size=practice` is the menu's swell);
 * `&seconds=` and `&warm=` set the sample, `&seed=` the sea. The result is also left in `window.gpuCheck`.
 */
async function pipeline(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const spot = (params.get('spot') ?? 'canyon') as SurfZoneConfig['spot'];
  const size = (params.get('size') ?? 'medium') as SwellSize;
  const seconds = Number(params.get('seconds') ?? 12);
  const warm = Number(params.get('warm') ?? 2);
  const hop = Number(params.get('hop') ?? 0);
  const seed = Number(params.get('seed') ?? 8761);
  const gpuLoad = Number(params.get('gpuLoad') ?? 0);
  const rider = params.get('rider') !== '0';
  const settings = physicalSettingsFor(spot, { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
  const tier = params.get('tier') !== '0' && await webGpuAvailable();
  const config = surfZoneConfigFor(settings, seed, tier);
  const barrelCases = sweptBarrelOn(config) ? await barrelCaseBytes(config.spot) : undefined;
  const result: Record<string, unknown> = { spot, size, tier, hop, seed, gpuLoad, rider, phase: 'spinning up' };
  (window as unknown as { gpuCheck: unknown }).gpuCheck = result;
  say(`${spot} ${size}, ${config.componentCount ?? 24} components, seed ${seed}: spinning up…`);
  const built = performance.now();
  const samples: { wall: number; seaTime: number; pipeline?: Pipeline; stepMs: number }[] = [];
  let host: WorkerSurfZone | undefined;
  let done!: () => void;
  const finished = new Promise<void>((resolve) => { done = resolve; });
  let sampleFrom = Infinity;
  const idle = { paddle: false, popUp: false, steer: 0, retry: false };
  const next = () => {
    if (hop > 0) {
      const until = performance.now() + hop;
      while (performance.now() < until) { /* the page's frame */ }
    }
    host!.advance(1, idle);
  };
  const port = new TimedPort(createSurfZoneWorker(), (reply) => {
    if (reply.type !== 'snapshot' || !host) return;
    const wall = performance.now();
    const { status } = host.snapshot;
    if (wall >= sampleFrom) samples.push({ wall, seaTime: status.seaTime, pipeline: status.pipelineMs && { ...status.pipelineMs }, stepMs: status.stepMs });
    if (wall >= sampleFrom + seconds * 1000) {
      done();
      return;
    }
    next();
  });
  host = new WorkerSurfZone(config, port, { rider, ...(barrelCases ? { barrelCases } : {}) });
  await host.ready;
  const { status } = host.snapshot;
  say(`  ready in ${((performance.now() - built) / 1000).toFixed(1)} s: ${status.compute.toUpperCase()}, ${status.cells.toLocaleString('en-US')} cells`);
  result.phase = 'sampling';
  const drawing = gpuLoad > 0 ? syntheticDrawing(gpuLoad) : undefined;
  sampleFrom = performance.now() + warm * 1000;
  next();
  await finished;
  const drawn = await drawing?.();
  host.dispose();
  const first = samples[0];
  const last = samples.at(-1)!;
  const wallSeconds = (last.wall - first.wall) / 1000;
  const quantile = (values: number[], q: number) => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : Number.NaN;
  };
  const keys: (keyof Pipeline)[] = ['water', 'deviceMap', 'deviceUnpack', 'devicePack', 'deviceCfl', 'deviceEncode', 'deviceSubsteps',
    'breaking', 'front', 'lip', 'foam', 'aeration', 'board', 'contact', 'bubbles', 'spray', 'step', 'snapshot', 'total',
    'deviceUploadBytes', 'deviceReadbackBytes', 'deviceMaps', 'deviceSubmits'];
  const stages: Record<string, { p50: number; p95: number; mean: number }> = {};
  for (const key of keys) {
    const values = samples.map((sample) => sample.pipeline?.[key] ?? Number.NaN);
    const finite = values.filter(Number.isFinite);
    stages[key] = { p50: quantile(values, 0.5), p95: quantile(values, 0.95), mean: finite.reduce((a, b) => a + b, 0) / Math.max(1, finite.length) };
  }
  Object.assign(result, {
    phase: 'done', compute: status.compute, cells: status.cells, components: config.componentCount ?? 24,
    snapshots: samples.length, wallSeconds, rate: (last.seaTime - first.seaTime) / wallSeconds,
    snapshotsPerSecond: (samples.length - 1) / wallSeconds, stages, ...(drawn ? { drawing: drawn } : {}),
  });
  const ms = (key: keyof Pipeline) => `${stages[key].p50.toFixed(1)}/${stages[key].p95.toFixed(1)}`;
  say(`  ${(result.rate as number).toFixed(3)}× real time, ${(result.snapshotsPerSecond as number).toFixed(1)} snapshots/s over ${wallSeconds.toFixed(1)} s (hop ${hop} ms)`);
  if (drawn) say(`  synthetic drawing (${gpuLoad} deep): ${drawn.framesPerSecond.toFixed(1)} frames/s, median interval ${drawn.frameMs.toFixed(1)} ms`);
  say(`  ms p50/p95: water ${ms('water')} (map ${ms('deviceMap')}, unpack ${ms('deviceUnpack')}, pack ${ms('devicePack')}, cfl ${ms('deviceCfl')}, encode ${ms('deviceEncode')}), step ${ms('step')}, snapshot ${ms('snapshot')}, total ${ms('total')}`);
  say(`  ms p50: foam ${stages.foam.p50.toFixed(1)}, aeration ${stages.aeration.p50.toFixed(1)}, front ${stages.front.p50.toFixed(1)}, breaking ${stages.breaking.p50.toFixed(1)}, board ${stages.board.p50.toFixed(1)}, contact ${stages.contact.p50.toFixed(1)}, bubbles ${stages.bubbles.p50.toFixed(1)}, spray ${stages.spray.p50.toFixed(1)}`);
  say(`  per step (mean): ${stages.deviceSubsteps.mean.toFixed(2)} substeps, ${(stages.deviceUploadBytes.mean / 1000).toFixed(0)} kB up, ${(stages.deviceReadbackBytes.mean / 1000).toFixed(0)} kB back, ${stages.deviceMaps.mean.toFixed(2)} maps, ${stages.deviceSubmits.mean.toFixed(2)} submits`);
  say('DONE');
}

/** SHA-256 of an array's bytes, hex, first 16 digits. */
async function digest(values: ArrayBufferView): Promise<string> {
  const bytes = new Uint8Array(values.buffer, values.byteOffset, values.byteLength).slice();
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...hash.slice(0, 8)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The game's sea with an idle-then-paddling rider, stepped on this page's GPU for `&frames=` steps after its spin-up,
 * then every array that carries it hashed (the M1 readback study, 2026-10-17): two builds that print the same hashes
 * stepped the same water to the byte. `?mode=replay&spot=canyon&size=medium`; `&prefetch=1` runs the solo worker's
 * water prefetch between steps, as the game's worker does.
 */
async function replay(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const spot = (params.get('spot') ?? 'canyon') as SurfZoneConfig['spot'];
  const size = (params.get('size') ?? 'medium') as SwellSize;
  const frames = Number(params.get('frames') ?? 240);
  const seed = Number(params.get('seed') ?? 8761);
  const prefetch = params.get('prefetch') === '1';
  const settings = physicalSettingsFor(spot, { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
  const tier = params.get('tier') !== '0' && await webGpuAvailable();
  const config = surfZoneConfigFor(settings, seed, tier);
  const barrelCases = sweptBarrelOn(config) ? await barrelCaseBytes(config.spot) : undefined;
  const result: Record<string, unknown> = { spot, size, tier, seed, frames, prefetch, phase: 'spinning up' };
  (window as unknown as { gpuCheck: unknown }).gpuCheck = result;
  say(`replay ${spot} ${size}, ${config.componentCount ?? 24} components, seed ${seed}, ${frames} frames${prefetch ? ', prefetched' : ''}: spinning up…`);
  const runner = SurfZoneRunner.forWorker(config, { rider: true, ...(barrelCases ? { barrelCases } : {}) }, 'warm');
  if (!(await runner.useDevice((solver) => GpuBoussinesq.create(solver)))) {
    say('No WebGPU device for this sea.');
    return;
  }
  await runner.spinUp();
  if (prefetch && !runner.enableSoloWaterPrefetch()) say('  (no prefetch on this device)');
  result.phase = 'stepping';
  const substeps: number[] = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const paddle = frame >= frames / 3;
    await runner.advanceAsync(1, { paddle, popUp: false, steer: paddle ? 0.3 * Math.sin(frame / 20) : 0, retry: false });
    substeps.push(runner.simulation.device?.diagnostics?.substeps ?? 0);
  }
  await runner.simulation.discardWaterPrefetch();
  const { solver } = runner.simulation;
  const state = runner.simulation.exportState();
  const arrays: Record<string, ArrayBufferView> = { ...state.arrays, riseRate: solver.surfaceRiseRate };
  if (solver instanceof BoussinesqSolver) arrays.viscosity = solver.viscosity;
  const hashes: Record<string, string> = {};
  for (const [name, values] of Object.entries(arrays)) hashes[name] = await digest(values);
  const board = runner.board?.position;
  const summary = JSON.stringify({ time: solver.time, board: board && [board.x, board.y, board.z], lip: state.lip, front: state.front ?? null, counters: state.counters });
  hashes.summary = await digest(new TextEncoder().encode(summary));
  runner.simulation.device?.dispose();
  Object.assign(result, { phase: 'done', time: solver.time, hashes });
  say(`  sea time ${solver.time.toFixed(4)} s; frames with 2+ substeps ${substeps.filter((count) => count > 1).length}, most ${Math.max(...substeps)}`);
  for (const [name, hash] of Object.entries(hashes)) say(`  ${name.padEnd(20)} ${hash}`);
  say('DONE');
}

const parameters = new URLSearchParams(location.search);
const mode = parameters.get('mode');
const checks: Record<string, () => Promise<void>> = {
  worker: throughput, chop, fine, pipeline, replay,
  lips: () => lipParity({ say, live }, parameters),
  probes: () => probeParity({ say, live }, parameters),
};
(checks[mode ?? ''] ?? run)().catch((error: unknown) => say(`FAILED: ${error instanceof Error ? error.message : String(error)}`));
