/**
 * The Canyon's upcoast haze (the owner, 2026-10-07): for each crest, how far upcoast (−x, against the peel) of its first
 * onset its whitewater shows, against how far the solver breaks there; and, along shore, how much whitewater the front
 * lets through, so a run with the upcoast gate set against one without shows where the gate acts (the water is the same:
 * the front never writes it).
 *
 * The along-shore shares are split across shore at z = INSHORE: seaward of it the arm and its peak, inshore of it the beach.
 *
 * Crests are counted where they pass a line LEAD m seaward of the take-off, at the take-off's column (as the crest-angle
 * report watches them). A crest's first onset is the first onset (a column's outermost breaking cell jumping seaward)
 * that back-projects at CREST_SPEED to within PAIRING s of its passing. Over the crest's first WINDOW s from that onset,
 * each column upcoast of it is read in the crest's band: from 6 m seaward of the onset to 20 m shoreward of where the
 * crest has since run at CREST_SPEED. The foam's reach counts whitewater over STRONG (what the front lets through: the
 * foam's, the aeration's and the roar's source); the solver's counts breaking over STRONG.
 *
 *   rolldown scripts/canyon-haze-report.ts -o dist/scripts/canyon-haze-report.mjs --format esm --platform node \
 *     && node dist/scripts/canyon-haze-report.mjs --seeds 3 --periods 14 [--upcoast-margin 6|off] [--canyon key=value,...]
 *
 * `--upcoast-margin` sets the spilling front's upcoast gate for this run (`off`: none, as before the owner's ruling).
 */
import { SPILLING_FRONT, SurfZoneSimulation, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from './canyonShape';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const number = (name: string, fallback: number) => Number(option(name) ?? fallback);
const seeds = number('seeds', 3);
const firstSeed = number('first-seed', 1);
const periods = number('periods', 14);
const hs = number('hs', 1.4);
const tp = number('tp', 11);
applyCanyonShape(option('canyon'));
const margin = option('upcoast-margin');
if (margin !== undefined) SPILLING_FRONT.canyon = { ...SPILLING_FRONT.canyon, upcoastMargin: margin === 'off' ? Infinity : Number(margin) };

/** Crests are counted where they pass this far seaward of the take-off, m, rising this share of Hs above still water. */
const LEAD = 30;
const CREST_SHARE = 0.2;
/** The crests' speed on the shelf, m/s (H ≥ 1.2 m on the 3.6 m shelf: about 6.3; 6 pairs onsets near the peak). */
const CREST_SPEED = 6;
/** An onset belongs to the crest whose passing it back-projects to within this many seconds. */
const PAIRING = 4;
/** Seconds after a crest's first onset over which its upcoast reach is read. */
const WINDOW = 5;
/** Strength over which whitewater, or breaking, counts as showing. */
const STRONG = 0.3;
/** Reaches counted as haze, m. */
const REPORTED = [2, 6, 10, 20];
/** Along-shore bins for the whitewater let through, m, split across shore at INSHORE: the beach's break inshore of it. */
const BIN = 5;
const INSHORE = -120;

interface Crest { passed: number; start?: { t: number; x: number; z: number }; foam: number; solver: number }

const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : Number.NaN;
};
const all: Crest[] = [];
let shown: Float64Array | undefined;
let broken: Float64Array | undefined;
let shownInshore: Float64Array | undefined;
let brokenInshore: Float64Array | undefined;
let binStart = 0;
for (let seed = firstSeed; seed < firstSeed + seeds; seed += 1) {
  const config = {
    spot: 'canyon', seed, significantHeight: hs, peakPeriod: tp, directionDegrees: 0, spreading: 150, tide: 0, windSpeed: 0, stage: 2,
  } as unknown as SurfZoneConfig;
  const simulation = new SurfZoneSimulation(config);
  const { solver } = simulation;
  const takeOff = simulation.breakPoint();
  const column = Math.round((takeOff.x - solver.xCenters[0]) / solver.dx);
  const watchZ = takeOff.z - LEAD;
  const watchRow = solver.rowBelow(watchZ);
  binStart = solver.xCenters[0];
  const bins = Math.ceil((solver.nx * solver.dx) / BIN);
  shown ??= new Float64Array(bins);
  broken ??= new Float64Array(bins);
  shownInshore ??= new Float64Array(bins);
  brokenInshore ??= new Float64Array(bins);
  const crests: Crest[] = [];
  simulation.onBreak = (wave) => {
    const passedAt = wave.time - (wave.z - watchZ) / CREST_SPEED;
    const crest = crests.find((c) => !c.start && Math.abs(c.passed - passedAt) < PAIRING);
    if (crest) crest.start = { t: wave.time, x: wave.x, z: wave.z };
  };
  const history: number[] = [];
  let lastPass = -Infinity;
  const step = 1 / 30;
  const steps = Math.round((periods * tp) / step);
  for (let frame = 0; frame < steps; frame += 1) {
    simulation.step(step);
    const time = solver.time;
    // A crest passes the watched line where the surface there peaks in time above CREST_SHARE of Hs.
    history.push(solver.surfaceAt(watchRow * solver.nx + column) - config.tide);
    if (history.length > 3) history.shift();
    const [a, b, c] = history;
    if (history.length === 3 && b > a && b >= c && b > CREST_SHARE * hs && time - lastPass > 0.4 * tp) {
      lastPass = time;
      crests.push({ passed: time - step, foam: 0, solver: 0 });
    }
    const whitewater = simulation.whitewaterStrength;
    const breaking = simulation.breaking.strength;
    for (let i = 0; i < whitewater.length; i += 1) {
      const bin = Math.floor((solver.xCenters[i % solver.nx] - binStart) / BIN);
      if (solver.zCenters[Math.floor(i / solver.nx)] >= INSHORE) {
        shownInshore[bin] += whitewater[i];
        brokenInshore[bin] += breaking[i];
      } else {
        shown[bin] += whitewater[i];
        broken[bin] += breaking[i];
      }
    }
    for (const crest of crests) {
      const start = crest.start;
      if (!start) continue;
      const age = time - start.t;
      if (age < 0 || age > WINDOW) continue;
      const near = start.z - 6;
      const far = start.z + CREST_SPEED * age + 20;
      for (let ix = 0; ix < solver.nx && solver.xCenters[ix] < start.x; ix += 1) {
        const reach = start.x - solver.xCenters[ix];
        for (let row = solver.rowBelow(near); row < solver.nz && solver.zCenters[row] <= far; row += 1) {
          const i = row * solver.nx + ix;
          if (whitewater[i] > STRONG && reach > crest.foam) crest.foam = reach;
          if (breaking[i] > STRONG && reach > crest.solver) crest.solver = reach;
        }
      }
    }
  }
  // Crests that broke, the first in the spin-up's warm field left out, and in time to be read for WINDOW.
  const read = crests.filter((c) => c.start && c.start.t > 0 && c.start.t + WINDOW <= solver.time);
  console.log(`seed ${seed}: ${read.length} crests; starts ${read.map((c) => c.start!.x.toFixed(0)).join(' ')}; `
    + `foam upcoast ${read.map((c) => c.foam.toFixed(0)).join(' ')}; solver upcoast ${read.map((c) => c.solver.toFixed(0)).join(' ')}`);
  all.push(...read);
}
const describe = (name: string, values: number[]) => `${name}: ${REPORTED.map((m) => `beyond ${m} m ${values.filter((v) => v > m).length}`).join(', ')}; `
  + `reach median ${quantile(values, 0.5).toFixed(0)} m, 90th percentile ${quantile(values, 0.9).toFixed(0)} m, most ${Math.max(0, ...values).toFixed(0)} m`;
console.log(`upcoast margin ${margin ?? 'the front\'s own'}; ${all.length} crests, ${seeds} seeds × ${periods} periods`);
console.log(describe('foam (whitewater over 0.3)', all.map((c) => c.foam)));
console.log(describe('solver (breaking over 0.3)', all.map((c) => c.solver)));
const shares = (through: Float64Array, under: Float64Array) => [...through].map((s, k) => `${(binStart + k * BIN).toFixed(0)}:${under[k] > 0 ? (s / under[k]).toFixed(3) : '—'}`).join(' ');
console.log(`whitewater let through, seaward of z ${INSHORE}, by along-shore bin (x from, share of the solver's breaking): ${shares(shown!, broken!)}`);
console.log(`whitewater let through, inshore of z ${INSHORE} (the beach's break): ${shares(shownInshore!, brokenInshore!)}`);
