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
import { CHOP_LOOP, chopCascades, chopSpectrum, inverseFft2d, inverseFft2dRadix, slopeMomentLevels, slopeSpectrum } from './scene/fftChopMath';
import { CHOP_MOMENT_LEVELS } from './scene/waterChop';
import { BoussinesqSolver } from './wave/BoussinesqSolver';
import { GpuBoussinesq } from './wave/gpu/GpuBoussinesq';
import { SURF_ZONE_STEP } from './wave/SurfZoneRunner';
import { SurfZoneSimulation, type SurfZoneConfig } from './wave/SurfZoneSimulation';
import { createSurfZoneWorker } from './game/WorkerSurfZone';
import { transferables } from './game/SurfZoneWorkerCore';
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

/**
 * Median GPU time of `work`, ms, by the timer query (EXT_disjoint_timer_query_webgl2), or undefined without it. A
 * hidden page still times the GPU's own work, unlike the wall clock, but label it as taken hidden.
 */
async function gpuMilliseconds(renderer: WebGLRenderer, work: (frame: number) => void, frames = 120): Promise<number | undefined> {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  if (!timer) return undefined;
  const queries: WebGLQuery[] = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const query = gl.createQuery()!;
    gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
    work(frame);
    gl.endQuery(timer.TIME_ELAPSED_EXT);
    queries.push(query);
    if (frame % 10 === 9) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const times: number[] = [];
  for (const query of queries) {
    while (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) await new Promise((resolve) => setTimeout(resolve, 5));
    if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) times.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
    gl.deleteQuery(query);
  }
  times.sort((a, b) => a - b);
  return times.length > 0 ? times[Math.floor(times.length / 2)] : undefined;
}

/**
 * The FFT chop on this page's WebGL2 GPU against the TypeScript reference transform: the Classic slope map, then
 * Rich's two cascades' moments (level 0), and each look's cost per transform.
 */
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
  say(`FFT chop ${n}² at t ${time} s, Classic: rms slope ${rms.toFixed(4)}, largest GPU error ${worst.toExponential(2)} (${((worst / rms) * 100).toFixed(2)} % of rms) against the radix-2 reference`);
  const time2 = time + 10;
  const timing = async (label: string) => {
    const started = performance.now();
    for (let frame = 0; frame < 120; frame += 1) fft.render(renderer, time2 + frame / 60);
    renderer.readRenderTargetPixels(fft.output, 0, 0, 1, 1, new Uint16Array(4));
    say(`  ${label}: ${fft.lastPasses} passes, ${((performance.now() - started) / 120).toFixed(2)} ms per transform (CPU wall time including the final sync)`);
    const gpu = await gpuMilliseconds(renderer, (frame) => fft.render(renderer, time2 + 5 + frame / 60));
    say(`  ${label}: ${gpu === undefined ? 'no GPU timer' : `${gpu.toFixed(3)} ms GPU time per transform (timer query, median of 120${document.hidden ? ', page hidden' : ''})`}`);
  };
  await timing('Classic');
  // Rich: the two cascades, their moments at level 0 against the reference (time wrapped on the loop, as the page does).
  fft.setWind(wind, 1, 'rich');
  const richTime = CHOP_LOOP + time;
  fft.render(renderer, richTime);
  const cascades = chopCascades(wind, 1, n);
  const coarse = inverseFft2dRadix(slopeSpectrum(cascades.spectrum, time, n, cascades.patches[0], CHOP_LOOP, 0), n);
  const fine = inverseFft2dRadix(slopeSpectrum(cascades.spectrum, time, n, cascades.patches[1], CHOP_LOOP, n * n * 4), n);
  // Every mip level the chop draws, read back as RGBA floats (three reads level 0 of the first target only).
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const textures = fft.momentGlTextures!;
  const readLevel = (texture: WebGLTexture, level: number) => {
    const side = n >> level;
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, level);
    const out = new Float32Array(side * side * 4);
    gl.readPixels(0, 0, side, side, gl.RGBA, gl.FLOAT, out);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);
    return out;
  };
  for (const [label, index, slopes] of [['coarse', 0, coarse], ['fine', 1, fine]] as const) {
    const levels = slopeMomentLevels(slopes, n);
    let sum = 0;
    for (let i = 0; i < n * n; i += 1) sum += slopes[i * 2] ** 2 + slopes[i * 2 + 1] ** 2;
    const cascadeRms = Math.sqrt(sum / (n * n));
    const worst = [0, 0, 0];
    for (let level = 0; level <= CHOP_MOMENT_LEVELS; level += 1) {
      const moments = readLevel(textures[index], level);
      const cross = readLevel(textures[2], level);
      const expected = levels[level];
      for (let i = 0; i < expected.length / 5; i += 1) {
        worst[0] = Math.max(worst[0], Math.abs(moments[i * 4] - expected[i * 5]), Math.abs(moments[i * 4 + 1] - expected[i * 5 + 1]));
        worst[1] = Math.max(worst[1], Math.abs(moments[i * 4 + 2] - expected[i * 5 + 2]), Math.abs(moments[i * 4 + 3] - expected[i * 5 + 3]));
        worst[2] = Math.max(worst[2], Math.abs(cross[i * 4 + index] - expected[i * 5 + 4]));
      }
    }
    say(`  Rich ${label} cascade: rms slope ${cascadeRms.toFixed(4)}; largest GPU error over levels 0–${CHOP_MOMENT_LEVELS}: ${worst[0].toExponential(2)} in slope (${((worst[0] / cascadeRms) * 100).toFixed(2)} % of rms), ${worst[1].toExponential(2)} in sx², sz², ${worst[2].toExponential(2)} in sx·sz (squares ~${(cascadeRms ** 2).toExponential(1)})`);
  }
  renderer.resetState();
  await timing('Rich');
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

const parameters = new URLSearchParams(location.search);
const mode = parameters.get('mode');
const checks: Record<string, () => Promise<void>> = {
  worker: throughput, chop, fine,
  lips: () => lipParity({ say, live }, parameters),
  probes: () => probeParity({ say, live }, parameters),
};
(checks[mode ?? ''] ?? run)().catch((error: unknown) => say(`FAILED: ${error instanceof Error ? error.message : String(error)}`));
