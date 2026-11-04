import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { libraryFromBytes, POOL_TUBE_STAND_IN } from '../barrel/barrelLibrary';
import { BARREL_CASES } from '../barrel/barrelLibraryIndex';
import { crestCelerity } from '../barrel/BreakingFront';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { throwContourDistance } from '../barrel/sliceClock';
import { POOL, regularSignificantHeight } from '../pool';
import { SurfZoneSimulation, type SurfZoneConfig } from '../SurfZoneSimulation';

// A scratch trace (step 7): a few points' clocks, distances, speeds and shifts, step by step. PROBE=1 only.
it.runIf(process.env.PROBE)('traces', () => {
  const library = libraryFromBytes(readBarrelCases(undefined, BARREL_CASES.filter((e) => POOL_TUBE_STAND_IN.includes(e.id))), 'basilisk', 'pool');
  const sim = new SurfZoneSimulation({ spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(1.05), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel', poolTubeCase: 'a38' } as unknown as SurfZoneConfig, 'spun-up', library);
  const { solver } = sim;
  while (solver.time < 50) sim.step(1 / 30);
  const out: string[] = [];
  const watch = new Set<number>();
  const prev = new Map<number, { z: number; x: number; shift: number; t: number }>();
  for (let n = 0; n < 900; n += 1) {
    sim.step(1 / 60);
    if (n % 120 === 0) out.push(`# ${solver.time.toFixed(2)} points ${sim.front!.points.length} taus ${sim.front!.points.slice(0, 8).map((p) => p.tau.toFixed(2)).join(',')}`);
    for (const p of sim.front!.points) {
      if (watch.size < 6 && p.tau < -1.2 && !watch.has(p.id)) watch.add(p.id);
      if (!watch.has(p.id)) continue;
      const D = throwContourDistance((x, z) => solver.restLevel - solver.sampleCentered(solver.bed, x, z), p.x, p.z, p.dirX ?? 0, p.dirZ ?? 1, p.throwDepth);
      const C = crestCelerity(p.crestSpeed, p.crestDepth, p.height);
      const q = prev.get(p.id);
      const dz = q ? p.z - q.z : 0;
      out.push(`${solver.time.toFixed(3)} id ${p.id} col ${p.column} σ ${p.sigma.toFixed(1)} z ${p.z.toFixed(2)} dz ${dz.toFixed(2)} depth ${p.crestDepth.toFixed(2)}/${p.throwDepth.toFixed(2)} dir ${(p.dirX ?? NaN).toFixed(2)},${(p.dirZ ?? NaN).toFixed(2)} D ${D.toFixed(2)} C ${C.toFixed(2)} crestSpeed ${(p.crestSpeed ?? NaN).toFixed(2)} tau ${p.tau.toFixed(3)} target ${(-D / C).toFixed(3)} form ${(p.formation ?? NaN).toFixed(3)} shift ${(p.anchorShift ?? NaN).toFixed(3)} rate ${(p.anchorRate ?? NaN).toFixed(2)} unbroken ${p.unbroken ?? false}`);
      prev.set(p.id, { z: p.z, x: p.x, shift: p.anchorShift ?? NaN, t: solver.time });
    }
  }
  writeFileSync(process.env.LOG ?? 'trace.txt', out.join('\n') + '\n');
}, 3_600_000);
