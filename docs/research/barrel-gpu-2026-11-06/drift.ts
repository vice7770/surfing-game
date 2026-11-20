/**
 * The Barrel's water on the device against the CPU (barrel-gpu, 2026-11-06), in Node, as `gpu-check.html` compares them in
 * the browser: two copies of one sea, one solver stepped on the CPU, the other by `GpuBoussinesq` on a stand-in device that
 * runs the shader's own WGSL, translated to JavaScript, with 32-bit fields (`src/wave/gpu/wgslTestSupport.ts`). The same
 * drift figures as the check page: max |Δh|, rms Δh over rms η, max |Δq|, the share of wet cells whose breaking disagrees,
 * and with `--plunge` the drift inside plunge zones held on both (the page's `&plunge`).
 *
 *   rolldown docs/research/barrel-gpu-2026-11-06/drift.ts -o dist/scripts/barrel-drift.mjs --format esm --platform node
 *   node dist/scripts/barrel-drift.mjs --arms straight,aframe --swell medium --seconds 2 --plunge 1
 *
 * Arms: `straight` (the default Barrel, periodic along shore), `aframe` (`?poolBarrel=aframe`, open sides, which the GPU
 * already ran), each from its saved sea at 50 s (the traffic bench's). `--f64 1` runs the kernels with 64-bit fields: the
 * algorithm alone, which must agree with the CPU to rounding.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../src/game/SurfConditions';
import type { BoussinesqSolver } from '../../../src/wave/BoussinesqSolver';
import { GpuBoussinesq } from '../../../src/wave/gpu/GpuBoussinesq';
import { emulatedGpu, readbackFields, stepKernels } from '../../../src/wave/gpu/wgslTestSupport';
import { FIELD } from '../../../src/wave/gpu/boussinesqWgsl';
import { SURF_ZONE_STEP } from '../../../src/wave/SurfZoneRunner';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1];
};
const swell = option('swell', 'medium') as 'medium' | 'big';
const seconds = Number(option('seconds', '2'));
const plunge = option('plunge', '0') === '1';
const out = option('out', '');
const arms = option('arms', 'straight,aframe').split(',');
const SCRATCH = '/private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad';
const seaPath = (arm: string) => arm === 'aframe' ? `${SCRATCH}/gpu-traffic/sea-aframe-${swell}-50.sea` : `${SCRATCH}/barrel-perf/sea-a38-${swell}-50.sea`;

/** gpuCheck's drift (src/gpuCheck.ts), over wet cells. */
function drift(reference: BoussinesqSolver, device: BoussinesqSolver) {
  let worst = 0, squared = 0, signal = 0, flux = 0, breaking = 0, wet = 0, held = 0, heldCells = 0;
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
    if (reference.plungeHold[i] > 0) { heldCells += 1; held = Math.max(held, Math.abs(difference)); }
  }
  return { eta: worst, etaRms: Math.sqrt(squared / Math.max(1, signal)), flux, breaking: breaking / Math.max(1, wet), held, heldCells };
}

/** gpuCheck's plunge zones, held on both on the reference's most strongly breaking cell. */
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

async function main(): Promise<void> {
  const lines: string[] = [`Barrel water, device (translated WGSL, f32 fields) against the CPU, ${swell}, ${seconds} s${plunge ? ', plunge zones held' : ''}, Node ${process.version}`];
  const say = (line: string) => { console.log(line); lines.push(line); };
  for (const arm of arms) {
    const settings = physicalSettingsFor('pool', { swell, tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'auto' });
    const config = { ...surfZoneConfigFor(settings as never, 8761, true), poolTubeCase: 'a38', ...(arm === 'aframe' ? { poolBarrel: 'aframe' } : {}) } as SurfZoneConfig;
    const path = seaPath(arm);
    if (!existsSync(path)) throw new Error(`no saved sea at ${path} (run the traffic bench first)`);
    const sea = () => decodeSurfZoneState(new Uint8Array(readFileSync(path)));
    const left = new SurfZoneSimulation(config, 'warm');
    const right = new SurfZoneSimulation(config, 'warm');
    left.importState(sea());
    right.importState(sea());
    const cpu = left.solver as BoussinesqSolver;
    const solver = right.solver as BoussinesqSolver;
    // One substep in doubles first: the WGSL's algorithm against the CPU's.
    const sub = 0.5 * cpu.maxStableStep();
    const kernels = stepKernels(cpu, sub);
    const probe = new SurfZoneSimulation(config, 'warm');
    probe.importState(sea());
    (probe.solver as BoussinesqSolver).step(sub);
    const names = Object.fromEntries(Object.entries(FIELD).map(([k, v]) => [v, k]));
    const one = [...kernels].map(([index, values]) => {
      const reference = readbackFields(probe.solver as BoussinesqSolver).get(index)!;
      let worst = 0, scale = 0;
      for (let i = 0; i < values.length; i += 1) { worst = Math.max(worst, Math.abs(values[i] - reference[i])); scale = Math.max(scale, Math.abs(reference[i])); }
      return `${names[index]} ${worst.toExponential(1)} of ${scale.toExponential(1)}`;
    });
    say(`${arm}: ${cpu.nx} × ${cpu.nz} cells, x boundary ${cpu.deviceLayout().xBoundary}; one ${sub.toFixed(4)} s substep in doubles, max |device − CPU|: ${one.join(' · ')}`);
    const device = await GpuBoussinesq.create(solver, emulatedGpu());
    if (!device) throw new Error(`${arm}: the device refused this sea`);
    const frames = Math.round(seconds / SURF_ZONE_STEP);
    const t = performance.now();
    for (let frame = 1; frame <= frames; frame += 1) {
      if (plunge && frame % 30 === 0) plungeBoth(cpu, solver);
      cpu.step(SURF_ZONE_STEP);
      await device.step(SURF_ZONE_STEP);
      if (frame % 30 === 0 || frame === 1) {
        const d = drift(cpu, solver);
        let breakingCells = 0;
        for (const v of cpu.breakingStrength) if (v > 0) breakingCells += 1;
        say(`  ${arm} t +${(frame * SURF_ZONE_STEP).toFixed(2)} s · max |Δh| ${d.eta.toExponential(2)} m · rms Δh / rms η ${d.etaRms.toExponential(2)} · max |Δq| ${d.flux.toExponential(2)} m²/s · breaking disagrees on ${(d.breaking * 100).toFixed(2)} % of wet cells (${breakingCells} breaking)${plunge ? ` · plunge zone ${d.heldCells} cells, max |Δh| there ${d.held.toExponential(2)} m` : ''} · ${device.lastSubsteps} substeps`);
      }
    }
    say(`  ${arm}: ${((performance.now() - t) / frames).toFixed(0)} ms a frame in Node (the CPU step and the emulated device's)`);
    device.dispose();
  }
  if (out) writeFileSync(out, `${lines.join('\n')}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
