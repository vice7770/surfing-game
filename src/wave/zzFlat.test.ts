import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { BoussinesqSolver } from './BoussinesqSolver';
import { SeaStateBoundary } from './SeaStateBoundary';
import { calmTarget } from './shallowWaterTestSupport';
import { uniformEdges } from './ShallowWaterSolver';
import { surfZoneSea, type SurfZoneConfig } from './SurfZoneSimulation';
import { warmStart } from './warmStart';

/**
 * Does the solver keep a directional sea's height over a flat bed with periodic sides and no breaking?
 * Hm0 (middle 80 m) at rows inward from the zone, against the input sea's at the first row.
 */
const Hs = Number(process.env.FLAT_HS ?? 4);
const Tp = Number(process.env.FLAT_TP ?? 10);
const dx = Number(process.env.FLAT_DX ?? 4);
const depth = Number(process.env.FLAT_DEPTH ?? 13.2);
const spreading = Number(process.env.FLAT_SPREADING ?? 12);
const seconds = Number(process.env.FLAT_SECONDS ?? 300);
const width = Number(process.env.FLAT_WIDTH ?? 160);
const direction = Number(process.env.FLAT_DIR ?? 10);
const sides = (process.env.FLAT_SIDES ?? 'periodic') as 'open' | 'periodic';

it('flat probe', () => {
  const config: SurfZoneConfig = {
    spot: 'point', seed: 1, significantHeight: Hs, peakPeriod: Tp, directionDegrees: direction, spreading, tide: 0, windSpeed: 0, heightAt: 'edge',
  };
  const sea = surfZoneSea(config);
  const zoneInner = -700;
  const solver = new BoussinesqSolver(
    { nx: width / dx, xMin: -width / 2, dx, zEdges: uniformEdges(-800, -100, 700 / dx), xBoundary: sides }, () => depth, { manning: 0, breaking: false },
  );
  warmStart(solver, sea, { referenceZ: zoneInner, seaTime: 0 });
  solver.addRelaxationZone(new SeaStateBoundary(solver, sea, solver.zoneWeightsAlongZ(zoneInner, -800), 0));
  solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(-200, -100), target: calmTarget });
  const zs = [-690, -650, -600, -550, -500, -450, -400, -300];
  const rows = zs.map((z) => solver.rowBelow(z));
  const middle: number[] = [];
  for (let ix = 0; ix < solver.nx; ix += 1) if (Math.abs(solver.xCenters[ix]) <= 40) middle.push(ix);
  const sum2 = rows.map(() => 0);
  let n = 0;
  const input2 = zs.map(() => 0);
  const step = 0.1;
  while (solver.time < seconds) {
    solver.step(step);
    if (solver.time < 2 * Tp) continue;
    n += 1;
    rows.forEach((row, r) => {
      for (const ix of middle) {
        const eta = solver.surfaceAt(row * solver.nx + ix);
        sum2[r] += eta * eta;
        input2[r] += sea.elevation(solver.xCenters[ix], zs[r], solver.time) ** 2;
      }
    });
  }
  const hm0 = (s: number) => 4 * Math.sqrt(s / (n * middle.length));
  const report = `flat Hs ${Hs} Tp ${Tp} dx ${dx} depth ${depth} spreading ${spreading} dir ${direction} width ${width} ${sides}: Hm0 (input sea's Hm0 there)\n${zs.map((z, r) => `z ${z}: ${hm0(sum2[r]).toFixed(2)} (${hm0(input2[r]).toFixed(2)})`).join('\n')}`;
  console.log(report);
  if (process.env.PROBE_OUT) appendFileSync(process.env.PROBE_OUT, report + '\n');
}, 7_200_000);
