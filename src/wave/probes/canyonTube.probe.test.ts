import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { CANYON } from '../Bathymetry';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { FRONT_CAPACITY, FRONT_STRIDE, writeFrontRecords } from '../barrel/frontRecords';
import { CURL_CAPACITY, CURL_STRIDE } from '../SpillingCurl';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { SWELLS } from '../../game/SurfConditions';

const quantiles = (values: number[], digits = 2) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.1, 0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(digits)).join(' / ') + ` (n ${sorted.length})`;
};

/**
 * The Canyon's tubes on its own swells (the tube from Basilisk, 2026-10-22; the advisor's log): the front's joins,
 * late joins past the throw depth (`joinPast`, the zero-lag throws), crests dropped unbroken and lost; the share of front
 * points in the tube regime and the drawn records; the columns the tube takes from the curl a frame, and how much later
 * its white comes there than the curl's own landing (the two clocks' gap). Opt-in (PROBE=1): SWELL, SECONDS, SEED, LOG.
 */
describe.runIf(process.env.PROBE)('the Canyon tube probe', () => {
  it('logs its fronts, regime and the curl beside the tubes', () => {
    const swellName = (process.env.SWELL ?? 'big') as keyof typeof SWELLS;
    const swell = SWELLS[swellName];
    const log = process.env.LOG ?? `canyon-tube-${swellName}.txt`;
    writeFileSync(log, '');
    const simulation = new SurfZoneSimulation({
      spot: 'canyon', seed: Number(process.env.SEED ?? 3), significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: swell.directionDegrees ?? 0, spreading: swell.spreading ?? 150, tide: 0, componentCount: 24, alongShore: CANYON.alongShore,
      dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
    }, 'spun-up', libraryFromBytes(readBarrelCases('canyon')));
    const front = simulation.front!;
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    const curls = new Float32Array(CURL_CAPACITY * CURL_STRIDE);
    let frames = 0;
    let points = 0;
    let tubePoints = 0;
    let drawn = 0;
    let tubeColumns = 0;
    let curlSlices = 0;
    const holds: number[] = [];
    const feet: number[] = [];
    const seconds = Number(process.env.SECONDS ?? 60);
    for (let frame = 0; frame < seconds * 30; frame += 1) {
      simulation.step(1 / 30);
      frames += 1;
      points += front.points.length;
      for (const p of front.points) {
        if (p.footHeight <= simulation.tubeFootMax) tubePoints += 1;
        if (frame % 30 === 0) feet.push(p.footHeight);
      }
      drawn += writeFrontRecords(front.points, records, simulation.tubeFootMax);
      curlSlices += simulation.writeCurls(curls);
      const curl = simulation.curl!;
      for (let c = 0; c < curl.tube.length; c += 1) {
        if (curl.tube[c] !== 1) continue;
        tubeColumns += 1;
        if (frame % 10 === 0 && curl.tubeHold[c] === curl.tubeHold[c]) holds.push(curl.tubeHold[c]);
      }
    }
    const reached = front.joins + front.unbroken;
    appendFileSync(log, [
      `the Canyon ${swellName} (Hs ${swell.significantHeight} m, ${swell.peakPeriod} s), seed ${process.env.SEED ?? 3}, ${seconds} s, 1 m cells; tube regime: foot crests to ${simulation.tubeFootMax.toFixed(2)} m (ξ_f ≥ 0.54)`,
      `front: joins ${front.joins} (late, past the throw depth: ${front.latePasses}), unbroken ${front.unbroken} (${((100 * front.unbroken) / Math.max(1, reached)).toFixed(1)} % of the crests that reached their throw depth; the bar about 20 %), lost ${front.lost}, unsized ${front.unsized}, jumps ${front.jumps}`,
      `points a frame ${(points / frames).toFixed(1)}, in the tube regime ${(tubePoints / frames).toFixed(1)} (${((100 * tubePoints) / Math.max(1, points)).toFixed(0)} %); foot crests ${quantiles(feet)} m; records drawn a frame ${(drawn / frames).toFixed(1)}`,
      `the curl: slices a frame ${(curlSlices / frames).toFixed(1)}; columns the tube takes a frame ${(tubeColumns / frames).toFixed(1)}; its white later than the curl's own landing by ${quantiles(holds)} s`,
    ].join('\n') + '\n');
  }, 7_200_000);
});
