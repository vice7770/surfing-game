// Probe (opt-in: PROBE=1 LOG=<file> npx vitest run <this file>): Padang Padang's measured peel against ledgePeel's prediction, period by period.
import { appendFileSync } from 'node:fs';
const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
import { it } from 'vitest';
import { SIDE_FEED } from '../SideFeed';
import { PADANG, padangCrestZ } from '../Bathymetry';
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
  const direction = Number(process.env.DIRECTION ?? 30);
  PADANG.angle = Number(process.env.ANGLE ?? PADANG.angle);
  PADANG.platformDepth = Number(process.env.PLATFORM ?? PADANG.platformDepth);
  if (process.env.NOCHANNEL) PADANG.channelHalfWidth = 1e-3;
  const config = { spot: 'padang' as const, seed: 1, significantHeight: 1.6, peakPeriod: 16, directionDegrees: direction, spreading, tide: 0, windSpeed: 0, componentCount: 24, ...(process.env.BANDWIDTH ? { bandwidth: Number(process.env.BANDWIDTH) } : {}) };
  const simulation = new SurfZoneSimulation(config);
  const hb = breakerDepthFor(edgeHeight(config, PADANG.deep), PADANG.deep);
  const predicted = ledgePeel({ period: 16, deepDepth: PADANG.deep, shelfDepth: PADANG.platformDepth, breakDepth: hb, swellDegrees: direction, ledgeDegrees: PADANG.angle });
  log(`predicted: V ${predicted.peelSpeed.toFixed(1)} m/s, α ${predicted.angleDegrees.toFixed(0)}°, h_b ${hb.toFixed(2)} m, crest line dz/dx ${Math.tan((PADANG.angle * Math.PI) / 180).toFixed(2)}; tank ${JSON.stringify(simulation.tank)}`);
  log(`crest z at x −40 / 0 / 30: ${padangCrestZ(-40).toFixed(0)} / ${padangCrestZ(0).toFixed(0)} / ${padangCrestZ(30).toFixed(0)}`);
  for (let period = 0; period < Number(process.env.PERIODS ?? 10); period += 1) {
    for (let k = 0; k < 16 * 30; k += 1) simulation.step(1 / 30);
    const estimate = simulation.peelEstimate();
    const onsets: string[] = [];
    const tracker = simulation.peel as unknown as { onset: Float64Array; onsetZ: Float64Array };
    const xs = simulation.solver.xCenters;
    for (let column = 0; column < xs.length; column += 10) {
      if (simulation.peel.measures(column)) onsets.push(`${xs[column].toFixed(0)}:${(tracker.onset[column] - simulation.solver.time).toFixed(1)}s@${tracker.onsetZ[column].toFixed(0)}`);
    }
    log(`t ${simulation.solver.time.toFixed(0)} s: ${estimate ? `V ${estimate.peelSpeed.toFixed(1)} α ${estimate.angleDegrees.toFixed(0)}° line ${estimate.lineSlope.toFixed(2)} fit ${estimate.fit.toFixed(2)} n ${estimate.columns} dir ${estimate.direction}` : 'none'} | ${onsets.join(' ')}`);
  }
}, 3_600_000);
