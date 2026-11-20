import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { FRONT_CAPACITY, FRONT_STRIDE, writeFrontRecords } from '../barrel/frontRecords';
import { BARREL_SLOPE, SweptLoft } from '../barrel/sweptLoft';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { sampleSurfaceHeight } from '../../scene/WaterSurface';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';

const quantiles = (values: number[]) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(2)).join(' / ');
};

/**
 * The drawn loft's cost with the cases' own Basilisk frames against the authored bounded-C (the tube from Basilisk,
 * 2026-10-22): one Padang Padang sea (the raw library's crash), and each frame both lofts built over the same fronts and
 * water, in turn first, as the page builds its drawing (`holdClearDrawing`). Opt-in (PROBE=1); SWELL, SECONDS, LOG.
 */
describe.runIf(process.env.PROBE)('tube loft cost probe', () => {
  it('times both shapes over the same fronts', () => {
    const log = process.env.LOG ?? 'tube-loft-cost.txt';
    writeFileSync(log, '');
    const bytes = readBarrelCases('padang');
    const raw = libraryFromBytes(bytes);
    const authored = libraryFromBytes(bytes, 'bounded-C');
    const swellName = (process.env.SWELL ?? 'medium') as keyof typeof PADANG_SWELLS;
    const swell = PADANG_SWELLS[swellName];
    const simulation = new SurfZoneSimulation({
      spot: 'padang', seed: 3, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: 0, spreading: PADANG_SPREADING, tide: 0, componentCount: 24,
      alongShore: PADANG.alongShore, dx: 2, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
    }, 'spun-up', raw);
    const grid = simulation.renderGrid(1);
    const surface = new Float32Array(grid.nx * grid.nz * 2);
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    const lofts = { basilisk: new SweptLoft(raw, BARREL_SLOPE.padang!, { holdClearDrawing: true }), 'bounded-C': new SweptLoft(authored, BARREL_SLOPE.padang!, { holdClearDrawing: true }) };
    const times: Record<keyof typeof lofts, number[]> = { basilisk: [], 'bounded-C': [] };
    const slices: Record<keyof typeof lofts, number[]> = { basilisk: [], 'bounded-C': [] };
    const seconds = Number(process.env.SECONDS ?? 60);
    for (let frame = 0; frame < seconds * 30; frame += 1) {
      simulation.step(1 / 30);
      if (frame < 300) continue;
      grid.xMin = simulation.windowXMin;
      simulation.writeUniformSurface(surface, grid, false);
      const count = writeFrontRecords(simulation.front!.points, records);
      if (count === 0) continue;
      const heightAt = (x: number, z: number) => sampleSurfaceHeight(surface, grid, x, z);
      const order = frame % 2 === 0 ? (['basilisk', 'bounded-C'] as const) : (['bounded-C', 'basilisk'] as const);
      for (const shape of order) {
        const start = performance.now();
        const result = lofts[shape].build(records, count, 0, heightAt);
        times[shape].push(performance.now() - start);
        slices[shape].push(result.sliceCount);
      }
    }
    for (const shape of ['basilisk', 'bounded-C'] as const) {
      appendFileSync(log, `Padang ${swellName}: ${shape} loft ${quantiles(times[shape])} ms (p50 / p90) over ${times[shape].length} frames with fronts, slices ${quantiles(slices[shape])}\n`);
    }
  }, 7_200_000);
});
