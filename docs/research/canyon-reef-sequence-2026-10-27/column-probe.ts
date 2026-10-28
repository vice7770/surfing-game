/**
 * Where a reef column's breaking stops (canyon-reef-sequence, 2026-10-27; wave only): every `every` s, in the given
 * columns, each run of cells breaking (solver strength > 0.3) and of white drawn (`drawnWhitewater` > 0.3), with the still
 * depth at its seaward end and the surface rise rate there over √(g h), and the crest (the highest surface).
 *   rolldown docs/research/canyon-reef-sequence-2026-10-27/column-probe.ts -o dist/scripts/column-probe.mjs --format esm --platform node \
 *     && node dist/scripts/column-probe.mjs --size medium --seed 1 --from 50 --to 66 --every 0.5 --x -10,0,10,20 [--canyon k=v,...]
 */
import { SWELLS } from '../../../src/game/SurfConditions';
import { canyonBreakLineZ, canyonShape } from '../../../src/wave/Bathymetry';
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
const from = Number(option('from') ?? 50);
const to = Number(option('to') ?? 66);
const every = Number(option('every') ?? 0.5);
const xs = (option('x') ?? '-10,0,10,20').split(',').map(Number);
const drawn = (sim as unknown as { drawnWhitewater?: Float64Array }).drawnWhitewater;
const { nx, nz, zCenters, xCenters } = solver;
const g = 9.81;
const runs = (values: ArrayLike<number>, col: number) => {
  const out: string[] = [];
  let start = -1;
  for (let iz = solver.rowBelow(-260); iz < nz; iz += 1) {
    const on = values[iz * nx + col] > 0.3;
    if (on && start < 0) start = iz;
    if ((!on || iz === nz - 1) && start >= 0) {
      const i = start * nx + col;
      const still = Math.max(0.05, solver.restLevel - solver.bed[i]);
      out.push(`${zCenters[start].toFixed(0)}…${zCenters[on ? iz : iz - 1].toFixed(0)} (h ${still.toFixed(1)}, rise ${(solver.riseRate[i] / Math.sqrt(g * still)).toFixed(2)})`);
      start = -1;
    }
  }
  return out.join(' ');
};
const stride = Math.round(every * 30);
// `--band`: one line per frame, per column the steepest rise (η_t / √(g h)) on the reef's face and top, from 25 m seaward
// of the break line to 15 m behind it, its z, still depth and crest η, and the breaking there ('*': strength > 0.3).
const band = process.argv.includes('--band');
// `--hs`: the significant height (4 σ of η) from `from` to `to` at each column, at `--dz` m from its break line (the
// face seaward, the top behind), with the share of the time the cell breaks: how the waves shrink down the reef.
const hs = process.argv.includes('--hs');
const offsets = (option('dz') ?? '-90,-40,-15,0,10').split(',').map(Number);
const sums = xs.map(() => offsets.map(() => ({ n: 0, s: 0, s2: 0, broke: 0, series: [] as number[] })));
const shape = canyonShape();
for (let n = 1; solver.time < to; n += 1) {
  sim.step(1 / 30);
  if (hs && solver.time >= from) {
    xs.forEach((x, a) => offsets.forEach((dz, b) => {
      const col = Math.round((x - xCenters[0]) / solver.dx);
      const i = solver.rowBelow(canyonBreakLineZ(x, shape) + dz) * nx + col;
      const eta = solver.h[i] + solver.bed[i] - solver.restLevel;
      const acc = sums[a][b];
      acc.n += 1; acc.s += eta; acc.s2 += eta * eta; acc.series.push(eta); if (sim.breaking.strength[i] > 0.3) acc.broke += 1;
    }));
    continue;
  }
  if (solver.time < from || n % stride !== 0) continue;
  if (band) {
    const cells = xs.map((x) => {
      const col = Math.round((x - xCenters[0]) / solver.dx);
      const line = canyonBreakLineZ(x, shape);
      let best = -Infinity; let at = -1; let crest = -Infinity; let breaking = false;
      for (let iz = solver.rowBelow(line - 25); iz <= solver.rowBelow(Math.min(-2, line + 15)); iz += 1) {
        const i = iz * nx + col;
        const still = solver.restLevel - solver.bed[i];
        if (!(still > 0.1) || !(solver.h[i] > 0.05)) continue;
        const rise = solver.riseRate[i] / Math.sqrt(g * still);
        if (rise > best) { best = rise; at = iz; }
        crest = Math.max(crest, solver.h[i] + solver.bed[i] - solver.restLevel);
        if (sim.breaking.strength[i] > 0.3) breaking = true;
      }
      const i = at * nx + col;
      return at < 0 ? `${x}: —` : `${x}: ${best.toFixed(2)}@${zCenters[at].toFixed(0)} h${(solver.restLevel - solver.bed[i]).toFixed(1)} η${crest.toFixed(2)}${breaking ? '*' : ''}`;
    });
    console.log(`t ${solver.time.toFixed(1)} | ${cells.join(' | ')}`);
    continue;
  }
  for (const x of xs) {
    const col = Math.round((x - xCenters[0]) / solver.dx);
    let crest = -1; let top = -Infinity;
    for (let iz = solver.rowBelow(-260); iz < nz; iz += 1) { const e = solver.h[iz * nx + col] + solver.bed[iz * nx + col]; if (e > top) { top = e; crest = iz; } }
    console.log(`t ${solver.time.toFixed(1)} x ${x}: crest z ${zCenters[crest].toFixed(0)} η ${(top - solver.restLevel).toFixed(2)} | solver ${runs(sim.breaking.strength, col) || '—'} | drawn ${drawn ? runs(drawn, col) || '—' : 'n/a'}`);
  }
}

if (hs) {
  console.log(`Hs (m) and breaking share, rows: m from the break line ${offsets.join(', ')}; columns x ${xs.join(', ')}`);
  offsets.forEach((dz, b) => {
    console.log(`${String(dz).padStart(4)} | ${xs.map((x, a) => { const k = sums[a][b]; const m = k.s / k.n; const h = solver.restLevel - solver.bed[solver.rowBelow(canyonBreakLineZ(x, shape) + dz) * nx + Math.round((x - xCenters[0]) / solver.dx)]; return `${(4 * Math.sqrt(Math.max(0, k.s2 / k.n - m * m))).toFixed(2)} (h ${h.toFixed(1)}, ${Math.round((100 * k.broke) / k.n)}%)`; }).join(' ')}`);
  });
  // The waves one by one (zero up-crossings of η about its mean, 2 s smoothing for the mean): H_1/3, H_max and how many
  // stood over 0.55 and 0.78 of the still depth (a reef flat's stable and breaking heights, Gourlay 1994; McCowan).
  console.log('waves one by one: n, H1/3, Hmax, n over 0.55 h, n over 0.78 h');
  offsets.forEach((dz, b) => {
    console.log(`${String(dz).padStart(4)} | ${xs.map((x, a) => {
      const k = sums[a][b];
      const h = solver.restLevel - solver.bed[solver.rowBelow(canyonBreakLineZ(x, shape) + dz) * nx + Math.round((x - xCenters[0]) / solver.dx)];
      const window = 60;
      const mean = k.series.map((_, i) => { let t = 0; let c = 0; for (let j = Math.max(0, i - window); j <= Math.min(k.series.length - 1, i + window); j += 1) { t += k.series[j]; c += 1; } return t / c; });
      const heights: number[] = [];
      let start = -1; let hi = -Infinity; let lo = Infinity;
      for (let i = 1; i < k.series.length; i += 1) {
        const v = k.series[i] - mean[i];
        if (k.series[i - 1] - mean[i - 1] < 0 && v >= 0) { if (start >= 0) heights.push(hi - lo); start = i; hi = -Infinity; lo = Infinity; }
        if (start >= 0) { hi = Math.max(hi, v); lo = Math.min(lo, v); }
      }
      heights.sort((p, q) => q - p);
      const third = heights.slice(0, Math.max(1, Math.round(heights.length / 3)));
      return `${heights.length} ${(third.reduce((p, q) => p + q, 0) / third.length).toFixed(2)} ${(heights[0] ?? 0).toFixed(2)} ${heights.filter((v) => v > 0.55 * h).length} ${heights.filter((v) => v > 0.78 * h).length}`;
    }).join(' | ')}`);
  });
}
