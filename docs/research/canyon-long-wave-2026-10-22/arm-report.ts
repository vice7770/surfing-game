/**
 * Re-reads a run of the Canyon size report (`scripts/canyon-size-report.ts --json <file>`, its onsets) for what the
 * layout changes (canyon-long-wave, 2026-10-22: canyon-layout's `arm-report.ts`, its bins running on to where the reef
 * ends, `canyonReefEndX`, so they follow a deep face that runs on to the beach), no new simulation:
 * - **the breaker type along the arm**: each onset on the arm's face or end, its Iribarren number at breaking,
 *   ξb = tan β / √(Hb / L0), with tan β the bed's slope along the waves' path (+z) across the onset's still depth ± DH
 *   (the advisor's `canyon_slope.py`), Hb the onset's measured face (crest to trough) and L0 = g Tp² / 2π; binned along
 *   shore, for all onsets and for the sets (the top third by face in each bin); with Mead & Black's vortex ratio for that
 *   slope, and ξγ, the same with the advisor's Hb = 0.78 h at the onset's still depth (the solver's onsets come at
 *   H/h 0.4–0.7, so the measured face gives a larger ξb than γ = 0.78 does);
 * - **the take-off's column** (the layout's take-off x ± 4 m, as `CANYON_TAKE_OFF_DEPTH` was fitted on 2026-10-11): each wave's most
 *   seaward onset there (onsets less than 0.35 Tp apart are one wave, as big-start's `analyze.mjs`), the depths those
 *   starts lie at (10th, 50th and 90th percentiles: the take-off is fitted to the 90th, the depth by which nine in ten
 *   have started breaking, counting from the deep side) and how far seaward of a given take-off and start they break.
 *
 *   rolldown docs/research/canyon-long-wave-2026-10-22/arm-report.ts -o dist/scripts/arm-report.mjs --format esm --platform node \
 *     && node dist/scripts/arm-report.mjs <run.json>[,<run.json>…] [--take-off <m deep>] [--start <m seaward>] [--bins -25,-15,...]
 *
 * Bins: 20 m wide (±10 m) on canyon-reef-bed's arm; here 10 m wide (±5 m), centred every 10 m from 5 m inside the arm's
 * upcoast end to its end on the beach face, unless `--bins` says.
 */
import { readFileSync } from 'node:fs';
import { CANYON, canyonReefEndX, canyonBreakLineZ, canyonShape, canyonTerraceDepth, createSpot, type CanyonBed } from '../../../src/wave/Bathymetry';
import { vortexRatio } from '../../../src/wave/Overturn';
import { GRAVITY } from '../../../src/wave/dispersion';
import { tankDepth, tankLayout, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

interface Onset { seed: number; t: number; x: number; z: number; face: number; depth: number }
interface Run { size: string; hs: number; tp: number; spreading: number; canyon: Record<string, number>; bed?: CanyonBed; records: { seed: number; start: number; end: number }[]; onsets: Onset[] }

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
// One file, or several (`a.json,b.json,…`: one layout's seeds run apart), read as one run.
const [run, ...others] = process.argv[2].split(',').map((file) => JSON.parse(readFileSync(file, 'utf8')) as Run);
for (const other of others) {
  run.records.push(...other.records);
  run.onsets.push(...other.onsets);
}
const bed = run.bed ?? 'reef';
// A run from before canyon-long-wave has no `runOn`: its arm tapered past the line's end.
if (bed === 'reef') Object.assign(CANYON, { alongShore: 160, runOn: 0 }, run.canyon);
const c = canyonShape(bed);
const config = { spot: 'canyon', seed: 1, significantHeight: run.hs, peakPeriod: run.tp, directionDegrees: 0, spreading: run.spreading, tide: 0, canyonBed: bed } as SurfZoneConfig;
const tank = tankLayout(config);
const spot = createSpot('canyon', 1, { canyonBed: bed });
const depth = (x: number, z: number) => tankDepth(spot, tank.edgeDepth, x, z, tank);

/** Depth band the slope is taken across, m (± around the onset's still depth). */
const DH = 0.4;
/** Along-shore bins, m (centres), BIN_REACH either side. */
const BIN_REACH = 5;
const upcoastEnd = c.peakX - (c.shelfDepth - c.crestDepth) / c.endSlope;
const BINS = option('bins')?.split(',').map(Number)
  ?? Array.from({ length: Math.floor((canyonReefEndX(c) - upcoastEnd - BIN_REACH) / 10) + 1 }, (_, i) => upcoastEnd + BIN_REACH + 10 * i);
const TAKE_OFF_X = c.takeOffX;
const COLUMN_REACH = 4;

/** The first z, marching shoreward from the zone along column x, where the bed is h deep. */
function zAt(x: number, h: number): number {
  for (let z = tank.zoneInner; z < 0; z += 0.05) if (depth(x, z) <= h) return z;
  return Number.NaN;
}
const slopeAt = (x: number, h: number) => (2 * DH) / (zAt(x, h - DH) - zAt(x, h + DH));

/** The arm's face or its upcoast end, as the size report's `bedPart`. */
function onArm(x: number, z: number): boolean {
  if (z < tank.blendEnd) return false;
  const terrace = canyonTerraceDepth(x, z, c);
  if (-z * c.shoreSlope < Math.min(c.shelfDepth, terrace)) return false;
  if (terrace >= c.shelfDepth - 0.05) return false;
  return z < canyonBreakLineZ(x, c);
}

const quantile = (values: number[], q: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const median = (values: number[]) => quantile(values, 0.5);
const f = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
const deepWavelength = (GRAVITY * run.tp ** 2) / (2 * Math.PI);
const recorded = run.onsets.filter((o) => run.records.some((r) => r.seed === o.seed && o.t > r.start));

console.log(`${run.size}: Hs ${run.hs} m, Tp ${run.tp} s; layout ${bed}; canyon pathSlope 1:${(1 / c.pathSlope).toFixed(1)}, hinge ${c.hingeDepth} m, fan ${c.fan}°; `
  + `${recorded.length} onsets, ${recorded.filter((o) => onArm(o.x, o.z)).length} on the arm's face or end`);
console.log('ξb along the arm (each onset: slope along +z across its depth ± 0.4 m, its face, L0 at Tp); all onsets | the sets (top third by face)');
console.log('  x bin   | n    depth  face  slope   ξb   ξγ   | sets: n   depth  face  slope   ξb   ξγ   VR   | ξb ≥ 0.4 (all, sets)');
const xiOf = (o: Onset) => {
  const s = slopeAt(o.x, o.depth);
  return { s, xi: s / Math.sqrt(Math.max(0.05, o.face) / deepWavelength), xiGamma: s / Math.sqrt((0.78 * o.depth) / deepWavelength) };
};
const all: { xi: number; xiGamma: number; set: boolean }[] = [];
for (const centre of BINS) {
  const mine = recorded.filter((o) => Math.abs(o.x - centre) <= BIN_REACH && onArm(o.x, o.z)).map((o) => ({ ...o, ...xiOf(o) })).filter((o) => Number.isFinite(o.xi));
  if (!mine.length) continue;
  const byFace = [...mine].sort((a, b) => b.face - a.face);
  const sets = byFace.slice(0, Math.max(1, Math.ceil(mine.length / 3)));
  for (const o of mine) all.push({ xi: o.xi, xiGamma: o.xiGamma, set: sets.includes(o) });
  const share = (list: typeof mine) => `${f((100 * list.filter((o) => o.xi >= 0.4).length) / list.length, 0)} %`;
  const slope = median(sets.map((o) => o.s));
  console.log(`  ${String(centre).padStart(4)} ±${BIN_REACH} | ${String(mine.length).padStart(4)} ${f(median(mine.map((o) => o.depth)))}  ${f(median(mine.map((o) => o.face)))}  1:${f(1 / median(mine.map((o) => o.s)), 0).padStart(3)}  ${f(median(mine.map((o) => o.xi)))} ${f(median(mine.map((o) => o.xiGamma)))} `
    + `| ${String(sets.length).padStart(4)}  ${f(median(sets.map((o) => o.depth)))}  ${f(median(sets.map((o) => o.face)))}  1:${f(1 / slope, 0).padStart(3)}  ${f(median(sets.map((o) => o.xi)))} ${f(median(sets.map((o) => o.xiGamma)))}  ${f(vortexRatio(slope), 1)} `
    + `| ${share(mine)}, ${share(sets)}`);
}
console.log(`  whole arm: ξb median ${f(median(all.map((o) => o.xi)))} (10–90 % ${f(quantile(all.map((o) => o.xi), 0.1))}…${f(quantile(all.map((o) => o.xi), 0.9))}); `
  + `sets ${f(median(all.filter((o) => o.set).map((o) => o.xi)))}; ξb ≥ 0.4: ${f((100 * all.filter((o) => o.xi >= 0.4).length) / all.length, 0)} % of onsets, `
  + `${f((100 * all.filter((o) => o.set && o.xi >= 0.4).length) / Math.max(1, all.filter((o) => o.set).length), 0)} % of the sets'; `
  + `ξγ median ${f(median(all.map((o) => o.xiGamma)))}, sets ${f(median(all.filter((o) => o.set).map((o) => o.xiGamma)))}`);

// The take-off's column: each wave's most seaward onset within its x ± 4 m.
const starts: { seed: number; t: number; z: number; depth: number; face: number }[] = [];
for (const record of run.records) {
  const mine = recorded.filter((o) => o.seed === record.seed && Math.abs(o.x - TAKE_OFF_X) <= COLUMN_REACH).sort((a, b) => a.t - b.t);
  let wave: { t0: number; t1: number; z: number; depth: number; face: number } | undefined;
  for (const o of mine) {
    if (wave && o.t - wave.t1 < 0.35 * run.tp) {
      wave.t1 = o.t;
      if (o.z < wave.z) Object.assign(wave, { z: o.z, depth: o.depth, face: o.face });
      continue;
    }
    if (wave) starts.push({ seed: record.seed, t: wave.t0, z: wave.z, depth: wave.depth, face: wave.face });
    wave = { t0: o.t, t1: o.t, z: o.z, depth: o.depth, face: o.face };
  }
  if (wave) starts.push({ seed: record.seed, t: wave.t0, z: wave.z, depth: wave.depth, face: wave.face });
}
const depths = starts.map((s) => s.depth);
console.log(`take-off column x ${TAKE_OFF_X} ± ${COLUMN_REACH} m: ${starts.length} waves; start depth 10 / 50 / 90 % ${f(quantile(depths, 0.1))} / ${f(median(depths))} / ${f(quantile(depths, 0.9))} m `
  + `(the take-off is fitted to the 90th); start z median ${f(median(starts.map((s) => s.z)), 0)}, faces median ${f(median(starts.map((s) => s.face)))} m`);
const takeOffDepth = Number(option('take-off') ?? Number.NaN);
if (Number.isFinite(takeOffDepth)) {
  const takeOffZ = zAt(TAKE_OFF_X, takeOffDepth);
  const startOut = Number(option('start') ?? 0);
  const startZ = takeOffZ - startOut;
  const seaward = (z: number) => starts.filter((s) => s.z < z).length;
  console.log(`  take-off ${takeOffDepth.toFixed(2)} m deep at z ${takeOffZ.toFixed(1)}; start ${startOut} m seaward (z ${startZ.toFixed(1)}, ${depth(TAKE_OFF_X, startZ).toFixed(2)} m deep): `
    + `waves starting seaward of the take-off ${seaward(takeOffZ)} of ${starts.length}, of the start ${seaward(startZ)} of ${starts.length}; `
    + `median start ${f(median(starts.map((s) => s.z)) - takeOffZ, 1)} m inside the take-off; one wave in ten starts ${f(takeOffZ - quantile(starts.map((s) => s.z), 0.1), 1)} m seaward of it`);
}
