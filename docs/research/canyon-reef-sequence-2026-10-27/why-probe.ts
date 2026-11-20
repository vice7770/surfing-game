/**
 * Why the drawn white misses the solver's (canyon-beach-look, 2026-10-28; wave only): every `every` s, in the columns
 * x0…x1, each column whose outermost breaking cell (solver strength > 0.3, deeper than 0.5 m) is not drawn (drawn ≤ 0.3)
 * is put down to one reason, as the spilling front decides it: no wave owns the cell and it lies seaward of a live crest
 * (a stray: its onset never joined a wave), its owner's front has not reached the column (withheld ahead of the front),
 * its owner reached it but its curl has not landed yet (young), or else the fray or the toe. Tallied over the run.
 *   rolldown docs/research/canyon-reef-sequence-2026-10-27/why-probe.ts -o dist/scripts/why-probe.mjs --format esm --platform node \
 *     && node dist/scripts/why-probe.mjs --size medium --seed 1 --periods 8 --x -170,-55 [--every 0.25] [--trace]
 */
import { SWELLS } from '../../../src/game/SurfConditions';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { type SpillingFront } from '../../../src/wave/SpillingFront';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const size = (option('size') ?? 'medium') as keyof typeof SWELLS;
const swell = SWELLS[size];
const sim = new SurfZoneSimulation({
  spot: 'canyon', seed: Number(option('seed') ?? 1), significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0,
  spreading: swell.spreading ?? 150, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', ...(option('beach-look') === 'off' ? { canyonBeachLook: false } : {}),
} as unknown as SurfZoneConfig);
const { solver } = sim;
const { nx, nz, xCenters, zCenters } = solver;
const [x0, x1] = (option('x') ?? '-170,-55').split(',').map(Number);
const every = Number(option('every') ?? 0.25);
const trace = process.argv.includes('--trace');
const internals = sim as unknown as { spilling: SpillingFront; drawnWhitewater: Float64Array; curl?: { span: number; impact: Float64Array } };
const front = internals.spilling;
const drawn = internals.drawnWhitewater;
const firstRow = solver.rowBelow(sim.tank.fineFrom);
const opts = front.options;
const tally = new Map<string, number>();
const add = (why: string) => tally.set(why, (tally.get(why) ?? 0) + 1);
let white = 0;
const steps = Math.round((Number(option('periods') ?? 8) * swell.peakPeriod) / (1 / 30));
const perFrame = Math.round(every * 30);
for (let n = 1; n <= steps; n += 1) {
  sim.step(1 / 30);
  if (n % perFrame) continue;
  const time = solver.time;
  const celerity = sim.breakerCelerity();
  const row: string[] = [];
  for (let col = 0; col < nx; col += 1) {
    const x = xCenters[col];
    if (x < x0 || x > x1) continue;
    let iz = -1;
    for (let r = firstRow; r < nz; r += 1) {
      const i = r * nx + col;
      if (sim.breaking.strength[i] > 0.3 && solver.restLevel - solver.bed[i] > 0.5) { iz = r; break; }
    }
    if (iz < 0) { row.push('.'); continue; }
    white += 1;
    const i = iz * nx + col;
    if (drawn[i] > 0.3) { add('drawn'); row.push('#'); continue; }
    const z = zCenters[iz];
    let owner = -1;
    let latest = -Infinity;
    front.waves.forEach((wave, k) => {
      const joined = wave.joinedAt[col];
      if (!(joined > latest)) return;
      const start = wave.joinedZ[col];
      if (z < start - opts.crestMargin || z > start + celerity * (time - joined) + opts.bandWidth) return;
      latest = joined;
      owner = k;
    });
    let why: string;
    if (owner < 0) why = 'no owner (stray or never joined)';
    else {
      const wave = front.waves[owner];
      if (Number.isNaN(wave.reached[col])) why = `ahead of its front (group ${wave.group})`;
      else {
        const age = time - Math.max(wave.reached[col], latest);
        const own = wave.seen[col];
        if (z < (own === own ? own : wave.joinedZ[col]) - opts.crestReach) why = `stray of its owner (group ${wave.group})`;
        else if (internals.curl && age < internals.curl.span) why = `young: curl not landed or growing (group ${wave.group})`;
        else why = `old: fray or toe (group ${wave.group})`;
      }
    }
    add(why);
    row.push(why[0]);
  }
  if (trace) console.log(`t ${time.toFixed(2)} ${row.join('')}`);
}
console.log(`columns with the solver's white at their crest: ${white} column-frames`);
for (const [why, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${why}: ${count} (${((100 * count) / white).toFixed(1)} %)`);
