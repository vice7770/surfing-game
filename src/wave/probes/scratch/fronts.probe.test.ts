import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { libraryFromBytes } from '../../barrel/barrelLibrary';
import { FRONT_CAPACITY, FRONT_FIELD, FRONT_STRIDE } from '../../barrel/frontRecords';
import { readBarrelCases } from '../../barrel/nodeBarrelCases';
import { SweptContact } from '../../barrel/sweptContact';
import { BARREL_SLOPE } from '../../barrel/sweptLoft';
import { PhysicalSurfWater } from '../../../physics/PhysicalSurfWater';
import { poolStraightFrame, regularSignificantHeight } from '../../pool';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../SurfZoneSimulation';

describe.runIf(process.env.PROBE)('fronts diag', () => {
  it('logs', () => {
    const log = process.env.LOG!;
    writeFileSync(log, '');
    const switches: Record<string, unknown> = {};
    for (const item of (process.env.SWITCHES ?? '').split(',').filter(Boolean)) { const [k, v] = item.split('='); switches[k] = v === '0' ? 0 : v; }
    const library = libraryFromBytes(readBarrelCases('pool'), 'basilisk', 'pool');
    const sim = new SurfZoneSimulation({ spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(1.05), peakPeriod: 10, directionDegrees: 0, spreading: 1000, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel', ...switches } as unknown as SurfZoneConfig, 'spun-up', library);
    const face = sim.tubeFace;
    const contact = new SweptContact(library, BARREL_SLOPE.pool!, face ? { face } : {});
    const water = PhysicalSurfWater.forSimulation(sim, contact, 1);
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    while (sim.solver.time < 50) sim.step(1 / 30);
    for (let n = 1; n <= Number(process.env.STEPS ?? 600); n += 1) {
      sim.step(1 / 60);
      const count = sim.writeTubeRecords(records);
      water.withSurfaceNodeCache(() => contact.update(records, count, 0, (x, z) => water.plainSurfaceAt(x, z)));
      if (n % 15 !== 0 || count === 0 || sim.solver.time < Number(process.env.FROM ?? 0)) continue;
      const lines: string[] = [`t ${sim.solver.time.toFixed(2)}: records ${count}, slices ${contact.last!.sliceCount}, overlaps ${contact.last!.overlaps} open ${contact.last!.overlapsOpen}`];
      let start = 0;
      while (start < count) {
        const id = records[start * FRONT_STRIDE + FRONT_FIELD.front];
        let end = start + 1;
        while (end < count && records[end * FRONT_STRIDE + FRONT_FIELD.front] === id) end += 1;
        const f = (k: number, key: keyof typeof FRONT_FIELD) => records[k * FRONT_STRIDE + FRONT_FIELD[key]];
        const s0 = poolStraightFrame(f(start, 'x'), f(start, 'z')).s, s1 = poolStraightFrame(f(end - 1, 'x'), f(end - 1, 'z')).s;
        let tmin = Infinity, tmax = -Infinity, rmax = 0;
        for (let k = start; k < end; k += 1) { tmin = Math.min(tmin, f(k, 'tau')); tmax = Math.max(tmax, f(k, 'tau')); rmax = Math.max(rmax, f(k, 'fade')); }
        lines.push(`  front ${id}: ${end - start} pts, reef s ${s0.toFixed(1)}–${s1.toFixed(1)}, z ${f(start, 'z').toFixed(1)}–${f(end - 1, 'z').toFixed(1)}, τ ${tmin.toFixed(2)}…${tmax.toFixed(2)}, retire ${rmax.toFixed(2)}`);
        start = end;
      }
      const L = contact.last!;
      if (L.overlaps > 0) {
        // Each front's slices: σ, τ, weight, joined, phase.
        let cur = -1;
        let row = '';
        for (let k = 0; k < L.sliceCount; k += 1) {
          if (L.sliceFront[k] !== cur) { if (row) lines.push(row); cur = L.sliceFront[k]; row = `    slices of ${cur}:`; }
          row += ` [${L.sliceSigma[k].toFixed(1)} τ${L.sliceTau[k].toFixed(2)} w${L.sliceWeight[k].toFixed(2)} j${L.sliceJoined[k]} p${L.slicePhase[k]}${L.sliceOverturned[k]}]`;
        }
        lines.push(row);
      }
      appendFileSync(log, lines.join('\n') + '\n');
    }
  }, 3_600_000);
});
