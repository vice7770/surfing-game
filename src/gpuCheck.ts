/**
 * Browser check for the GPU stage 2 step (plan P6, dev only: /gpu-check.html).
 * Two identical surf zones step side by side, one on the CPU solver and one on
 * the device, and the page reports how far the device's surface and fluxes
 * drift from the CPU reference, and what each step costs.
 */
import { DataUtils, WebGLRenderer } from 'three';
import { FftChop } from './scene/FftChop';
import { chopSpectrum, inverseFft2d, slopeSpectrum } from './scene/fftChopMath';
import { BoussinesqSolver } from './wave/BoussinesqSolver';
import { GpuBoussinesq } from './wave/gpu/GpuBoussinesq';
import { SURF_ZONE_STEP } from './wave/SurfZoneRunner';
import { SurfZoneSimulation, type SurfZoneConfig } from './wave/SurfZoneSimulation';
import { createSurfZoneWorker } from './game/WorkerSurfZone';
import { transferables } from './game/SurfZoneWorkerCore';

const log = document.querySelector<HTMLPreElement>('#log')!;
const lines: string[] = [];
const say = (line: string) => {
  lines.push(line);
  log.textContent = lines.join('\n');
};

function drift(reference: BoussinesqSolver, device: BoussinesqSolver): { eta: number; etaRms: number; flux: number; breaking: number } {
  let worst = 0;
  let squared = 0;
  let signal = 0;
  let flux = 0;
  let breaking = 0;
  let wet = 0;
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
  }
  return { eta: worst, etaRms: Math.sqrt(squared / Math.max(1, signal)), flux, breaking: breaking / Math.max(1, wet) };
}

async function run(): Promise<void> {
  const spot = (new URLSearchParams(location.search).get('spot') ?? 'point') as SurfZoneConfig['spot'];
  const seconds = Number(new URLSearchParams(location.search).get('seconds') ?? 10);
  const config: SurfZoneConfig = { spot, seed: 1, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 10, spreading: 12, tide: 0, windSpeed: 0 };
  say(`Spot ${spot}: building two surf zones…`);
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
    let start = performance.now();
    cpu.step(SURF_ZONE_STEP);
    cpuMs += performance.now() - start;
    start = performance.now();
    await device.step(SURF_ZONE_STEP);
    gpuMs += performance.now() - start;
    if (frame % 60 === 0 || frame === 1) {
      const d = drift(cpu, solver);
      say(`t ${(frame * SURF_ZONE_STEP).toFixed(2)} s · max |Δh| ${d.eta.toExponential(2)} m · rms Δh / rms η ${d.etaRms.toExponential(2)} · max |Δq| ${d.flux.toExponential(2)} m²/s · breaking disagrees on ${(d.breaking * 100).toFixed(2)} % of wet cells`);
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

const mode = new URLSearchParams(location.search).get('mode');
(mode === 'worker' ? throughput() : mode === 'chop' ? chop() : mode === 'fine' ? fine() : run()).catch((error: unknown) => say(`FAILED: ${error instanceof Error ? error.message : String(error)}`));
