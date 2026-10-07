/**
 * Crest angles in a tank's own linear sea: the components the relaxation zone is fed (`surfZoneSea`), with no solver,
 * zone, bed or window. Its crests are followed with crest-angle-report.ts's rules (a crest passing the reference x
 * at 0.2 Hs, followed column by column within 3 m until it falls below 35 % of its height, half the watched width at
 * least, 20 m from the window's open edges) and fitted with a line. Set beside a crest-angle-report run of the same
 * spot and seed (`--probe`), it tells what the swell itself brings from what the tank and the bed add.
 *
 *   rolldown scripts/crest-angle-linear.ts -o dist/scripts/crest-angle-linear.mjs --format esm --platform node \
 *     && node dist/scripts/crest-angle-linear.mjs --spot beach --seed 1 --probe beach-after.json
 *
 * `--spot`, `--seed` (1), `--swell` (medium), `--direction` and `--spreading` (override the swell's), `--z` (the zone's
 * inner edge), `--x` (the reference x, 0), `--from` (the session's first sea time, s; 20 s before the probe's first
 * crest), `--seconds` (620), `--probe <crest-angle-report json>`, `--angles` (print every crest's angle).
 */
import { readFileSync } from 'node:fs';
import { GPU_TIER_COMPONENTS, swellFor } from '../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../src/game/SurfConditions';
import type { SpotName } from '../src/wave/Bathymetry';
import { alongShoreOf, surfZoneSea, tankLayout, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const numberOption = (name: string): number | undefined => (option(name) === undefined ? undefined : Number(option(name)));
const spot = (option('spot') ?? 'beach') as SpotName;
const seed = Number(option('seed') ?? 1);
const swellSize = (option('swell') ?? 'medium') as SwellSize;
const settings = physicalSettingsFor(spot, { swell: swellSize, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
const swell = swellFor(settings);
const config: SurfZoneConfig = {
  spot, seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
  directionDegrees: numberOption('direction') ?? swell.directionDegrees ?? settings.directionDegrees,
  spreading: numberOption('spreading') ?? swell.spreading, bandwidth: swell.bandwidth,
  tide: settings.tide, windSpeed: settings.windSpeed, stage: 2, compute: 'cpu',
  ...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {}),
  componentCount: GPU_TIER_COMPONENTS,
};
const sea = surfZoneSea(config);
const tank = tankLayout(config);
const probeFile = option('probe');
const probe: { crests: { line: string; t: number; angle: number }[] } | undefined = probeFile ? JSON.parse(readFileSync(probeFile, 'utf8')) : undefined;
const from = numberOption('from') ?? (probe?.crests.length ? probe.crests[0].t - 20 : 0);
const seconds = numberOption('seconds') ?? 620;
const z = numberOption('z') ?? tank.zoneInner;
const xReference = numberOption('x') ?? 0;
/** As crest-angle-report.ts: its step, edge margin, reach, crest and lost shares, coverage, and its window's columns (1 m). */
const STEP = 1 / 30;
const EDGE_MARGIN = 20;
const TRACK_REACH = 3;
const CREST_SHARE = 0.2;
const LOST_SHARE = 0.35;
const MIN_COVERAGE = 0.5;
/** Rows sampled across shore, m, refined by a parabola as the probe refines its cells. */
const ROW = 0.25;
const half = alongShoreOf(config) / 2;
const xFirst = Math.ceil(-half + EDGE_MARGIN);
const xLast = Math.floor(half - EDGE_MARGIN);

/** The crest's z at x: the highest surface within `reach` of `near`, refined by a parabola through its neighbours. */
function crestIn(x: number, near: number, reach: number, t: number): { z: number; eta: number } {
  let best = near;
  let bestEta = Number.NEGATIVE_INFINITY;
  for (let at = near - reach; at <= near + reach + 1e-9; at += ROW) {
    const eta = sea.elevation(x, at, t);
    if (eta > bestEta) {
      bestEta = eta;
      best = at;
    }
  }
  const a = sea.elevation(x, best - ROW, t);
  const c = sea.elevation(x, best + ROW, t);
  const denominator = a - 2 * bestEta + c;
  const shift = denominator < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denominator)) : 0;
  return { z: best + shift * ROW, eta: bestEta };
}

/** The least-squares line's angle through the points, degrees, and their RMS distance from it, m. */
function lineFit(points: readonly { x: number; z: number }[]): { angle: number; residual: number } {
  const n = points.length;
  const mx = points.reduce((sum, p) => sum + p.x, 0) / n;
  const mz = points.reduce((sum, p) => sum + p.z, 0) / n;
  let sxx = 0;
  let sxz = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxz += (p.x - mx) * (p.z - mz);
  }
  const slope = sxz / sxx;
  const residual = Math.sqrt(points.reduce((sum, p) => sum + (p.z - (mz + slope * (p.x - mx))) ** 2, 0) / n);
  return { angle: (Math.atan(slope) * 180) / Math.PI, residual };
}

const crests: { t: number; angle: number; residual: number; bend: number }[] = [];
const history: number[] = [];
let lastCrest = Number.NEGATIVE_INFINITY;
for (let step = 0; step * STEP < seconds; step += 1) {
  const t = from + step * STEP;
  history.push(sea.elevation(xReference, z, t));
  if (history.length > 3) history.shift();
  if (history.length < 3) continue;
  const [a, b, c] = history;
  const at = t - STEP;
  if (!(b > a && b >= c && b > CREST_SHARE * config.significantHeight)) continue;
  if (at - lastCrest < 0.4 * config.peakPeriod) continue;
  lastCrest = at;
  const start = crestIn(xReference, z, 4, at);
  const points = [{ x: xReference, z: start.z }];
  for (const direction of [-1, 1]) {
    let near = start.z;
    for (let x = xReference + direction; x >= xFirst && x <= xLast; x += direction) {
      const crest = crestIn(x, near, TRACK_REACH, at);
      if (crest.eta < LOST_SHARE * start.eta) break;
      points.push({ x, z: crest.z });
      near = crest.z;
    }
  }
  if ((points.length - 1) / (xLast - xFirst) < MIN_COVERAGE) continue;
  const { angle, residual } = lineFit(points);
  points.sort((p, q) => p.x - q.x);
  const middle = Math.floor(points.length / 2);
  crests.push({ t: at, angle, residual, bend: Math.abs(lineFit(points.slice(middle)).angle - lineFit(points.slice(0, middle + 1)).angle) });
}

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
const quantile = (values: number[], q: number) => [...values].sort((p, q2) => p - q2)[Math.min(values.length - 1, Math.floor(q * values.length))];
const angles = crests.map((crest) => crest.angle);
const bends = crests.map((crest) => crest.bend);
console.log(`Linear sea: ${spot}, ${swellSize}, ${config.directionDegrees}°, s ${config.spreading.toFixed(0)}, seed ${seed}, ${sea.components.length} components; `
  + `z ${z.toFixed(0)} (the zone's inner edge ${tank.zoneInner.toFixed(0)}, ${tank.edgeDepth} m deep), x ${xFirst}…${xLast}, t ${from.toFixed(0)}…${(from + seconds).toFixed(0)} s.`);
console.log(`  ${crests.length} crests: mean ${mean(angles).toFixed(2)}°, mean |angle| ${mean(angles.map(Math.abs)).toFixed(2)}°, ${angles.filter((angle) => angle > 0).length} positive; `
  + `first 3 ${angles.slice(0, 3).map((angle) => angle.toFixed(1)).join(', ')}°; straightness ${mean(crests.map((crest) => crest.residual)).toFixed(2)} m; `
  + `bend mean ${mean(bends).toFixed(1)}°, p90 ${quantile(bends, 0.9).toFixed(1)}°, max ${Math.max(...bends).toFixed(1)}°.`);
if (process.argv.includes('--angles')) console.log(`  angles: ${angles.map((angle) => angle.toFixed(1)).join(' ')}`);
const directions = sea.components.map((component) => (component.direction * 180) / Math.PI);
const kx = sea.components.reduce((sum, component) => sum + component.kx, 0);
const kz = sea.components.reduce((sum, component) => sum + component.kz, 0);
console.log(`  The components' directions: mean ${mean(directions).toFixed(2)}°; their summed wave number points at ${((Math.atan2(kx, kz) * 180) / Math.PI).toFixed(2)}° `
  + '(crests across it rise toward +x by as much, with the sign turned).');
if (probe) {
  for (const line of ['edge', 'take-off']) {
    const mine = probe.crests.filter((crest) => crest.line === line);
    console.log(`  The probe's ${line} line: ${mine.length} crests, mean ${mean(mine.map((crest) => crest.angle)).toFixed(2)}°, `
      + `first 3 ${mine.slice(0, 3).map((crest) => crest.angle.toFixed(1)).join(', ')}°.`);
  }
}
