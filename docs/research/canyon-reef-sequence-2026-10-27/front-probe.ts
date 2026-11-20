/**
 * Why the reef's drawn white lags its solver white (canyon-reef-sequence, 2026-10-27; wave only): every `every` s from
 * `from` to `to`, the reef columns' outermost breaking cell (z, '.' none), the spilling front's waves (start→front/tip,
 * crest start), and each onset the front was given, or a seaward jump of a reef column's outer break the game did not
 * count as an onset (and why: the 0.7 Tp re-onset hold, or too shallow).
 *   rolldown docs/research/canyon-reef-sequence-2026-10-27/front-probe.ts -o dist/scripts/front-probe.mjs --format esm --platform node \
 *     && node dist/scripts/front-probe.mjs --size medium --seed 1 --from 22 --to 40 --every 0.5 [--canyon k=v,...]
 */
import { SWELLS } from '../../../src/game/SurfConditions';
import { canyonReefSpan, canyonShape } from '../../../src/wave/Bathymetry';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const size = (option('size') ?? 'medium') as keyof typeof SWELLS;
const swell = SWELLS[size];
applyCanyonShape(option('canyon'));
const sim = new SurfZoneSimulation({
  spot: 'canyon', seed: Number(option('seed') ?? 1), significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0,
  spreading: swell.spreading ?? 150, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu',
} as unknown as SurfZoneConfig);
const { solver } = sim;
const from = Number(option('from') ?? 22);
const to = Number(option('to') ?? 40);
const every = Number(option('every') ?? 0.5);
const reef = canyonReefSpan(canyonShape());
const { nx, xCenters } = solver;
const firstRow = solver.rowBelow(sim.tank.fineFrom);
const drawn = (sim as unknown as { drawnWhitewater: Float64Array }).drawnWhitewater;
const cols: number[] = [];
for (let c = 0; c < nx; c += 1) if (xCenters[c] >= Number(option('x0') ?? reef.from) && xCenters[c] <= Number(option('x1') ?? Math.min(reef.to, 12))) cols.push(c);
const internals = sim as unknown as {
  spilling?: { observeOnset: (column: number, time: number, z: number) => void; describe(): string; waves: { startX: number; crestX: number; frontX: number; tipX: number }[] };
  lastOnset: Float64Array;
};
const front = internals.spilling!;
const events: string[] = [];
const observe = front.observeOnset.bind(front);
front.observeOnset = (column, time, z) => { events.push(`onset x ${xCenters[column]} z ${z.toFixed(1)}`); observe(column, time, z); };
const previous = new Float64Array(nx).fill(Infinity);
// `--flicker`: every seaward jump of a reef column's outer break from none (a column that had stopped breaking), with how
// long it had stopped and how far seaward of where it last broke the new break lies: a bore flickering under B 0.3 comes
// back within a fraction of a second at about its own place; a new crest a wavelength out.
const flicker = process.argv.includes('--flicker');
const lastSeen = new Float64Array(nx).fill(Number.NaN);
const lastSeenAt = new Float64Array(nx).fill(Number.NaN);
const comebacks: { gap: number; dz: number; counted: boolean }[] = [];
const dt = 1 / 60;
let next = from;
while (solver.time < to) {
  sim.step(dt);
  for (const c of cols) {
    const z = sim.outerBreakZ(c);
    if (flicker && solver.time >= from) {
      if (Number.isFinite(z) && !Number.isFinite(previous[c]) && lastSeenAt[c] === lastSeenAt[c]) comebacks.push({ gap: solver.time - lastSeenAt[c], dz: z - lastSeen[c], counted: internals.lastOnset[c] === solver.time });
      if (Number.isFinite(z)) { lastSeen[c] = z; lastSeenAt[c] = solver.time; }
    }
    if (solver.time >= from && z < previous[c] - 5 && internals.lastOnset[c] !== solver.time) events.push(`jump x ${xCenters[c]} z ${z.toFixed(1)} (last onset ${(solver.time - internals.lastOnset[c]).toFixed(1)} s ago)`);
    previous[c] = z;
  }
  if (flicker || solver.time + 1e-9 < next) { if (flicker) events.length = 0; continue; }
  next += every;
  const row = cols.map((c) => { const z = sim.outerBreakZ(c); return Number.isFinite(z) ? String(Math.round(z)) : '.'; }).join(' ');
  console.log(`t ${solver.time.toFixed(2)} | ${row}`);
  // The drawn white's outermost cell per column (drawn > 0.3), and the solver's strength at its own outermost cell (tenths).
  const outer = (values: ArrayLike<number>, c: number) => { for (let iz = firstRow; iz < solver.nz; iz += 1) if (values[iz * nx + c] > 0.3) return iz; return -1; };
  console.log(`drawn   | ${cols.map((c) => { const iz = outer(drawn, c); return iz < 0 ? '.' : String(Math.round(solver.zCenters[iz])); }).join(' ')}`);
  console.log(`B×10    | ${cols.map((c) => { const iz = outer(sim.breaking.strength, c); return iz < 0 ? '.' : String(Math.round(10 * sim.breaking.strength[iz * nx + c])); }).join(' ')}`);
  console.log(`   waves ${front.waves.map((w) => `[${w.startX}→${w.frontX.toFixed(1)}/${w.tipX} c${w.crestX}]`).join(' ')}`);
  if (events.length) console.log(`   ${events.splice(0).join('; ')}`);
}
if (flicker) {
  const bins = [0.1, 0.25, 0.5, 1, 2, 4, 8, Infinity];
  for (const counted of [true, false]) {
    const list = comebacks.filter((k) => k.counted === counted);
    console.log(`${counted ? 'counted as onsets' : 'not counted'}: ${list.length}`);
    for (let b = 0; b < bins.length; b += 1) {
      const lo = b ? bins[b - 1] : 0;
      const inBin = list.filter((k) => k.gap > lo && k.gap <= bins[b]);
      if (!inBin.length) continue;
      const dz = inBin.map((k) => k.dz).sort((a, b2) => a - b2);
      console.log(`  stopped ${lo}–${bins[b]} s: ${inBin.length}; back at dz p10 ${dz[Math.floor(0.1 * dz.length)].toFixed(1)} p50 ${dz[Math.floor(0.5 * dz.length)].toFixed(1)} p90 ${dz[Math.floor(0.9 * dz.length)].toFixed(1)} m; seaward > 5 m: ${inBin.filter((k) => k.dz < -5).length}`);
    }
  }
}
console.log(`columns x ${cols.map((c) => xCenters[c]).join(' ')}`);
