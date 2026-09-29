// Probe (opt-in: PROBE=1 LOG=<file> npx vitest run <this file>): Padang Padang's measured peel against ledgePeel's prediction, period by period.
import { appendFileSync } from 'node:fs';
const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
import { it } from 'vitest';
import { SIDE_FEED } from '../SideFeed';
import { PADANG, createSpot, padangCrestZ, padangReefAt, padangSeaward } from '../Bathymetry';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { ledgePeel } from '../ledgePeel';
import { breakerDepthFor } from '../Breaking';
import { edgeHeight } from '../SurfZoneSimulation';

it.skipIf(!process.env.PROBE)('probes Padang Padang’s peel', () => {
  for (const pair of (process.env.PADANG ?? '').split(',').filter(Boolean)) {
    const [key, value] = pair.split('=');
    (PADANG as Record<string, number>)[key] = Number(value);
  }
  if (process.env.NOFEED) SIDE_FEED.width = 0;
  const spreading = Number(process.env.SPREADING ?? 150);
  const direction = Number(process.env.DIRECTION ?? 0);
  const config = { spot: 'padang' as const, seed: 1, significantHeight: Number(process.env.HS ?? 1.6), peakPeriod: 16, directionDegrees: direction, spreading, tide: 0, windSpeed: 0, componentCount: 24, ...(process.env.BANDWIDTH ? { bandwidth: Number(process.env.BANDWIDTH) } : {}) };
  const simulation = new SurfZoneSimulation(config);
  const bed = createSpot('padang', 1);
  // The wedge's base at along-shore position x: the most seaward z, walking seaward from the crest, where the bed still follows the wedge.
  const baseZ = (x: number): number => {
    let z = padangCrestZ(x);
    const wedge = (zz: number) => PADANG.crestDepth + padangSeaward(x, zz) * PADANG.wedgeSlope;
    while (bed.depthAt(x, z - 0.25) - wedge(z - 0.25) > -1e-6) z -= 0.25;
    return z;
  };
  const toe = bed.depthAt(0, baseZ(0));
  const hb = breakerDepthFor(edgeHeight(config, PADANG.deep), PADANG.deep);
  const predicted = ledgePeel({ period: 16, deepDepth: PADANG.deep, shelfDepth: toe, breakDepth: hb, swellDegrees: direction, ledgeDegrees: PADANG.angle });
  log(`predicted (x 0): V ${predicted.peelSpeed.toFixed(1)} m/s, α ${predicted.angleDegrees.toFixed(0)}°, h_b ${hb.toFixed(2)} m, base ${toe.toFixed(1)} m; PADANG ${JSON.stringify(PADANG)}; tank ${JSON.stringify(simulation.tank)}`);
  const { solver } = simulation;
  const xs = solver.xCenters;
  const reefColumns: number[] = [];
  for (let column = 0; column < xs.length; column += 10) if (padangReefAt(xs[column])) reefColumns.push(column);
  const baseRows = reefColumns.map((column) => {
    const z = baseZ(xs[column]);
    let row = 0;
    while (row < solver.nz - 1 && solver.zCenters[row] < z) row += 1;
    return row;
  });
  log(`reef columns x: ${reefColumns.map((c) => xs[c].toFixed(0)).join('/')}; base z ${baseRows.map((r) => solver.zCenters[r].toFixed(0)).join('/')}, base depth ${reefColumns.map((c, k) => bed.depthAt(xs[c], solver.zCenters[baseRows[k]]).toFixed(1)).join('/')} m`);
  // A contour on the wedge, climbing from its base (CONTOUR m, 4.5 by default): the first row shoreward of the base that shallow.
  const contour = Number(process.env.CONTOUR ?? 4.5);
  const contourRows = reefColumns.map((column, k) => {
    let row = baseRows[k];
    while (row < solver.nz - 1 && bed.depthAt(xs[column], solver.zCenters[row]) > contour) row += 1;
    return row;
  });
  const eta = (i: number) => solver.h[i] + solver.bed[i] - solver.restLevel;
  for (let period = 0; period < Number(process.env.PERIODS ?? 12); period += 1) {
    const top = reefColumns.map(() => -Infinity);
    const onContour = reefColumns.map(() => -Infinity);
    for (let k = 0; k < 16 * 30; k += 1) {
      simulation.step(1 / 30);
      reefColumns.forEach((column, n) => {
        top[n] = Math.max(top[n], eta(baseRows[n] * solver.nx + column));
        onContour[n] = Math.max(onContour[n], eta(contourRows[n] * solver.nx + column));
      });
    }
    const estimate = simulation.peelEstimate();
    const onsets: string[] = [];
    const tracker = simulation.peel as unknown as { onset: Float64Array; onsetZ: Float64Array };
    for (let column = 0; column < xs.length; column += 10) {
      if (!simulation.peel.measures(column)) continue;
      const z = tracker.onsetZ[column];
      const where = Number.isFinite(z) && z !== 0 ? `${bed.depthAt(xs[column], z).toFixed(1)}m${z < baseZ(xs[column]) ? 'R' : 'W'}` : '-';
      onsets.push(`${xs[column].toFixed(0)}:${(tracker.onset[column] - solver.time).toFixed(1)}s@${z.toFixed(0)}/${where}`);
    }
    log(`t ${solver.time.toFixed(0)} s: ${estimate ? `V ${estimate.peelSpeed.toFixed(1)} α ${estimate.angleDegrees.toFixed(0)}° line ${estimate.lineSlope.toFixed(2)} fit ${estimate.fit.toFixed(2)} n ${estimate.columns} dir ${estimate.direction}` : 'none'} | ${onsets.join(' ')} | crest top at base ${top.map((v) => v.toFixed(2)).join('/')} | at ${contour} m ${onContour.map((v) => v.toFixed(2)).join('/')}`);
  }
}, 3_600_000);
