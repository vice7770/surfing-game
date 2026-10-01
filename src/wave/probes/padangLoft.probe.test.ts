import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import { loadBarrelLibrary } from '../barrel/barrelLibrary';
import { FRONT_CAPACITY, FRONT_STRIDE, writeFrontRecords } from '../barrel/frontRecords';
import { BARREL_SLOPE, LOFT, LOFT_SAMPLES, SweptLoft } from '../barrel/sweptLoft';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { sampleSurfaceHeight } from '../../scene/WaterSurface';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';

const quantiles = (values: number[]) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.1, 0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(2)).join(' / ') + ` (max ${sorted.at(-1)!.toFixed(2)})`;
};

/**
 * The swept loft on Padang Padang's Small swell (Part B, PR 3): its cost against the step, its slices and clamps, the
 * anchored crest's offset from the solver's (the advisor's ruling 2: report past about 2 m before touchdown), the open
 * curl's length along the crest (the checklist's 3–10 m) and neighbouring slices' clock steps in library frames (no
 * teeth: within one stage). The Classic look's bilinear heights, uncarved. Opt-in (PROBE=1); SECONDS, SWELL, LOG.
 */
describe.runIf(process.env.PROBE)('Padang Padang loft probe', () => {
  it('lofts the fronts every step and logs what it drew', async () => {
    const log = process.env.LOG ?? 'padang-loft.txt';
    writeFileSync(log, '');
    const fetcher = (async (url: string) => {
      const bytes = readFileSync(`public/${url}`);
      return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
    }) as unknown as typeof fetch;
    const library = await loadBarrelLibrary(undefined, fetcher);
    const swell = PADANG_SWELLS[(process.env.SWELL ?? 'small') as keyof typeof PADANG_SWELLS];
    const simulation = new SurfZoneSimulation({
      spot: 'padang', seed: 3, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: 0, spreading: PADANG_SPREADING, tide: 0, componentCount: 24,
      alongShore: PADANG.alongShore, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
    });
    const grid = simulation.renderGrid(1);
    const surface = new Float32Array(grid.nx * grid.nz * 2);
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    const loft = new SweptLoft(library, BARREL_SLOPE.padang!);
    // The same loft without the lip's sheet (tube-colour-fix.md), built beside it each frame, in turn first, for its cost.
    const plain = new SweptLoft(library, BARREL_SLOPE.padang!, { sheet: false });
    const frameOf = library.profileTimes({ slope: BARREL_SLOPE.padang!, footHeight: 1.6, footDepth: PADANG.baseDepth }).frameSeconds;
    appendFileSync(log, `Padang Padang ${process.env.SWELL ?? 'small'} (Hs ${swell.significantHeight} m, ${swell.peakPeriod} s), 1 m cells; a library frame ${frameOf.toFixed(3)} s at h0 ${PADANG.baseDepth} m\n`);
    let stepMs = 0;
    let loftMs = 0;
    let plainMs = 0;
    let sheetSlices = 0;
    let frames = 0;
    let over2 = 0;
    let openSlices = 0;
    // Capped slices, and where in their tube's life (τ over the touchdown time) they fell: the advisor asks whether
    // they cluster past 0.8, where the handover would then start.
    const cappedLives: number[] = [];
    let offsets: number[] = [];
    let curls: number[] = [];
    let steps: number[] = [];
    const seconds = Number(process.env.SECONDS ?? 120);
    for (let frame = 0; frame < seconds * 30; frame += 1) {
      let start = performance.now();
      simulation.step(1 / 30);
      stepMs += performance.now() - start;
      grid.xMin = simulation.windowXMin;
      simulation.writeUniformSurface(surface, grid, false);
      const count = writeFrontRecords(simulation.front!.points, records);
      const heightAt = (x: number, z: number) => sampleSurfaceHeight(surface, grid, x, z);
      if (frame % 2 === 1) {
        start = performance.now();
        plain.build(records, count, 0, heightAt);
        plainMs += performance.now() - start;
      }
      start = performance.now();
      const result = loft.build(records, count, 0, heightAt);
      loftMs += performance.now() - start;
      if (frame % 2 === 0) {
        start = performance.now();
        plain.build(records, count, 0, heightAt);
        plainMs += performance.now() - start;
      }
      for (let s = 0; s < result.sliceCount; s += 1) if (result.sheetWeight[s * LOFT_SAMPLES + LOFT.extensionSamples + 48] > 0) sheetSlices += 1;
      frames += 1;
      let run = 0;
      for (let s = 0; s < result.sliceCount; s += 1) {
        const open = result.slicePhase[s] === 1;
        if (open) {
          openSlices += 1;
          const offset = result.sliceCrestOffset[s];
          if (Number.isFinite(offset)) {
            offsets.push(offset);
            if (offset > 2) over2 += 1;
            if (offset > LOFT.offsetKnee) cappedLives.push(result.sliceLife[s]);
          }
        }
        const sameFront = s > 0 && result.sliceFront[s] === result.sliceFront[s - 1];
        if (sameFront) steps.push(Math.abs(result.sliceTau[s] - result.sliceTau[s - 1]) / frameOf);
        if (open && (run === 0 || sameFront)) run += 1;
        else {
          if (run > 1) curls.push((run - 1) * 0.5);
          run = open ? 1 : 0;
        }
      }
      if (run > 1) curls.push((run - 1) * 0.5);
      if (frame % 30 !== 29) continue;
      appendFileSync(log, `t ${simulation.solver.time.toFixed(0)} s | ${count} points, ${result.sliceCount} slices, ${result.vertexCount} vertices, clamps ${result.clamps}, clamped lookups ${result.clampedLookups} | crest offset (open) ${quantiles(offsets)} m | open curl ${quantiles(curls)} m | clock step ${quantiles(steps)} frames\n`);
      offsets = [];
      curls = [];
      steps = [];
    }
    appendFileSync(log, `the loft ${(loftMs / frames).toFixed(2)} ms a frame against the step's ${(stepMs / frames).toFixed(1)} ms (${((100 * loftMs) / stepMs).toFixed(1)} %); open slices with the crest over 2 m off: ${over2} of ${openSlices}\n`);
    appendFileSync(log, `the lip's sheet: the loft ${(loftMs / frames).toFixed(3)} ms a frame with it, ${(plainMs / frames).toFixed(3)} ms without (built in turn), so ${((loftMs - plainMs) / frames).toFixed(3)} ms; slices shaded as a sheet ${sheetSlices} (${(sheetSlices / frames).toFixed(1)} a frame)\n`);
    const late = cappedLives.filter((life) => life > 0.8).length;
    const fifths = [0, 1, 2, 3, 4].map((k) => cappedLives.filter((life) => life >= k / 5 && (k === 4 ? life <= 1 : life < (k + 1) / 5)).length);
    appendFileSync(log, `capped open slices: ${cappedLives.length} of ${openSlices}; their life (τ / T_open) ${quantiles(cappedLives)}; by fifth of the open time ${fifths.join(' / ')}; past 0.8: ${late}\n`);
  }, 7_200_000);

  it('times the lip’s sheet when every slice of a long front is open (its worst case)', async () => {
    const log = process.env.LOG ?? 'padang-loft.txt';
    const fetcher = (async (url: string) => {
      const bytes = readFileSync(`public/${url}`);
      return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
    }) as unknown as typeof fetch;
    const library = await loadBarrelLibrary(undefined, fetcher);
    // A straight 140 m front, a point a metre, every point halfway through its open time (A0 0.3 at h0 7 m).
    const n = 141;
    const footHeight = 2.1;
    const tau = 0.5 * library.profileTimes({ slope: BARREL_SLOPE.padang!, footHeight, footDepth: PADANG.baseDepth }).touchdownSeconds;
    const records = new Float32Array(n * FRONT_STRIDE);
    for (let k = 0; k < n; k += 1) {
      const o = k * FRONT_STRIDE;
      records.set([k, -100, 1, k, tau, footHeight, PADANG.baseDepth, -100], o);
    }
    const loft = new SweptLoft(library, BARREL_SLOPE.padang!);
    const plain = new SweptLoft(library, BARREL_SLOPE.padang!, { sheet: false });
    const flat = () => 0;
    let withMs = 0;
    let withoutMs = 0;
    const builds = Number(process.env.BUILDS ?? 200);
    let slices = 0;
    let sheets = 0;
    for (let k = 0; k < builds; k += 1) {
      for (const first of k % 2 ? [plain, loft] : [loft, plain]) {
        const start = performance.now();
        const result = first.build(records, n, 0, flat);
        const ms = performance.now() - start;
        if (first === loft) {
          withMs += ms;
          slices = result.sliceCount;
          sheets = 0;
          for (let s = 0; s < result.sliceCount; s += 1) if (result.sheetWeight[s * LOFT_SAMPLES + LOFT.extensionSamples + 48] > 0) sheets += 1;
        } else {
          withoutMs += ms;
        }
      }
    }
    appendFileSync(log, `every slice open: ${slices} slices (${sheets} shaded as a sheet), the loft ${(withMs / builds).toFixed(3)} ms with the sheet, ${(withoutMs / builds).toFixed(3)} ms without (${builds} builds each, in turn), so ${((withMs - withoutMs) / builds).toFixed(3)} ms\n`);
  }, 7_200_000);
});
