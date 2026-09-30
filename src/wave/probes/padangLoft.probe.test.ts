import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import { loadBarrelLibrary } from '../barrel/barrelLibrary';
import { FRONT_CAPACITY, FRONT_STRIDE, writeFrontRecords } from '../barrel/frontRecords';
import { BARREL_SLOPE, LOFT, SweptLoft } from '../barrel/sweptLoft';
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
    const frameOf = library.profileTimes({ slope: BARREL_SLOPE.padang!, footHeight: 1.6, footDepth: PADANG.baseDepth }).frameSeconds;
    appendFileSync(log, `Padang Padang ${process.env.SWELL ?? 'small'} (Hs ${swell.significantHeight} m, ${swell.peakPeriod} s), 1 m cells; a library frame ${frameOf.toFixed(3)} s at h0 ${PADANG.baseDepth} m\n`);
    let stepMs = 0;
    let loftMs = 0;
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
      start = performance.now();
      const result = loft.build(records, count, 0, (x, z) => sampleSurfaceHeight(surface, grid, x, z));
      loftMs += performance.now() - start;
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
    const late = cappedLives.filter((life) => life > 0.8).length;
    const fifths = [0, 1, 2, 3, 4].map((k) => cappedLives.filter((life) => life >= k / 5 && (k === 4 ? life <= 1 : life < (k + 1) / 5)).length);
    appendFileSync(log, `capped open slices: ${cappedLives.length} of ${openSlices}; their life (τ / T_open) ${quantiles(cappedLives)}; by fifth of the open time ${fifths.join(' / ')}; past 0.8: ${late}\n`);
  }, 7_200_000);
});
