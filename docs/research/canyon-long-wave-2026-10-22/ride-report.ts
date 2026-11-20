/**
 * How long each Canyon wave peels along its reef (canyon-long-wave, 2026-10-22), re-read from a size report's onsets
 * (`scripts/canyon-size-report.ts --json <file>`), no new simulation, no riders.
 *
 * The onsets are grouped into crests by their phase, as the size report does. Here each crest's onsets that count toward the peel
 * (`canyonPeelAt`: the reef's face, end and top, not the lagoon's bores or the beach face's shore break) are binned
 * along shore (BIN m), each bin keeping its first break (time and z). From the crest's first break on the reef the
 * ride runs toward +x bin by bin while
 * - the next break lies within GAP m along shore (a longer gap is a section that never broke: the ride ends),
 * - it comes no earlier than the last (less SLACK s: a break ahead of the peel is a section),
 * - and the peel over the last WINDOW m along shore (sin α = c_b / V, V along the breaks' own line, as the game's
 *   readout) is at least 27°, the readout's close-out line, once the ride is WINDOW m long.
 * Reported per size: each crest's ride along shore and along its line of breaks (m) and its duration (s), the median
 * peel over the ride, and the share of crests riding 10 s or more; also how far each crest breaks upcoast (toward −x)
 * of its start within 3 s; and how long the crest keeps breaking down the reef whatever its peel (the same walk with the
 * gap rule alone: a fast section does not end it, nor a section re-breaking further inshore later), along shore and in
 * seconds.
 *
 *   rolldown docs/research/canyon-long-wave-2026-10-22/ride-report.ts -o dist/scripts/ride-report.mjs --format esm --platform node \
 *     && node dist/scripts/ride-report.mjs <run.json> [<run.json> ...] [--pool] [--verbose]
 */
import { readFileSync } from 'node:fs';
import { CANYON, canyonPeelAt, canyonShape, createSpot, type CanyonBed } from '../../../src/wave/Bathymetry';
import { GRAVITY } from '../../../src/wave/dispersion';
import { alongShoreOf, tankDepth, tankLayout, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

interface Onset { seed: number; t: number; x: number; z: number; face: number; depth: number }
interface Run {
  size: string; hs: number; tp: number; canyon: Record<string, number>; celerity: number; bed?: CanyonBed;
  records: { seed: number; start: number; end: number }[]; onsets: Onset[];
}

const BIN = 2;
const GAP = 8;
const SLACK = 0.3;
const WINDOW = 10;
const CLOSE = 27;
/** The size report's crest grouping: phases at √(g (h + κ min(h, Hs))), density σ 0.1 Tp, peaks 0.5 Tp apart. */
const KAPPA = 0.3;
const SIGMA = 0.1;
const SEPARATION = 0.5;
type Phased = Onset & { phase: number };
function crestsByDensity(onsets: Phased[], tp: number): Phased[][] {
  if (!onsets.length) return [];
  const sigma = SIGMA * tp;
  const step = 0.1;
  const lo = onsets[0].phase - 3 * sigma;
  const n = Math.ceil((onsets[onsets.length - 1].phase + 3 * sigma - lo) / step) + 1;
  const density = new Float64Array(n);
  for (const o of onsets) {
    const k0 = Math.max(0, Math.floor((o.phase - 3 * sigma - lo) / step));
    const k1 = Math.min(n - 1, Math.ceil((o.phase + 3 * sigma - lo) / step));
    for (let k = k0; k <= k1; k += 1) density[k] += Math.exp(-0.5 * ((lo + k * step - o.phase) / sigma) ** 2);
  }
  const peaks: { phase: number; height: number }[] = [];
  for (let k = 1; k < n - 1; k += 1) if (density[k] > density[k - 1] && density[k] >= density[k + 1]) peaks.push({ phase: lo + k * step, height: density[k] });
  peaks.sort((a, b) => b.height - a.height);
  const kept: number[] = [];
  for (const peak of peaks) if (kept.every((q) => Math.abs(q - peak.phase) >= SEPARATION * tp)) kept.push(peak.phase);
  kept.sort((a, b) => a - b);
  const groups = kept.map(() => [] as Phased[]);
  for (const o of onsets) {
    let best = -1;
    for (let k = 0; k < kept.length; k += 1) if (best < 0 || Math.abs(kept[k] - o.phase) < Math.abs(kept[best] - o.phase)) best = k;
    if (best >= 0 && Math.abs(kept[best] - o.phase) <= 0.5 * tp) groups[best].push(o);
  }
  return groups.filter((g) => g.length);
}
const verbose = process.argv.includes('--verbose');
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const quantile = (values: number[], f: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];
};
const fmt = (v: number, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');

// `--pool`: the files are one layout's seeds, run apart: read them as one run.
const runs = files.map((file) => ({ file, run: JSON.parse(readFileSync(file, 'utf8')) as Run }));
if (process.argv.includes('--pool') && runs.length > 1) {
  const [first, ...rest] = runs;
  for (const { run } of rest) {
    first.run.records.push(...run.records);
    first.run.onsets.push(...run.onsets);
  }
  first.file = `${runs.length} files pooled`;
  runs.length = 1;
}
for (const { file, run } of runs) {
  const bed = run.bed ?? 'reef';
  // A run from before canyon-long-wave has no `runOn`: its arm tapered past the line's end.
  if (bed === 'reef') Object.assign(CANYON, { runOn: 0 }, run.canyon);
  const c = canyonShape(bed);
  const cb = run.celerity;
  const config = { spot: 'canyon', seed: 1, significantHeight: run.hs, peakPeriod: run.tp, directionDegrees: 0, spreading: 150, tide: 0, canyonBed: bed } as SurfZoneConfig;
  const tank = tankLayout(config);
  const spot = createSpot('canyon', 1, { canyonBed: bed });
  const window = alongShoreOf(config);
  const xMin = -window / 2;
  const columns = window + 1;
  const rows = Math.ceil(tank.shore - tank.zoneInner) + 1;
  const travel = new Float64Array(columns * rows);
  for (let col = 0; col < columns; col += 1) {
    let tau = 0;
    for (let r = 1; r < rows; r += 1) {
      const depth = Math.max(0.2, tankDepth(spot, tank.edgeDepth, xMin + col, tank.zoneInner + r - 0.5, tank));
      tau += 1 / Math.sqrt(GRAVITY * (depth + KAPPA * Math.min(depth, run.hs)));
      travel[col * rows + r] = tau;
    }
  }
  const phaseOf = (o: Onset) => {
    const col = Math.min(columns - 1, Math.max(0, Math.round(o.x - xMin)));
    const r = Math.min(rows - 1, Math.max(0, Math.round(o.z - tank.zoneInner)));
    return o.t - travel[col * rows + r];
  };
  const rides: { seed: number; t: number; x: number; along: number; line: number; seconds: number; angle: number; upcoast: number; runAlong: number; runSeconds: number }[] = [];
  for (const record of run.records) {
    // The crests: the size report's grouping (each onset's phase, its time less its crest's travel time from the zone
    // down its column, and the phases' density peaks, one per crest), so the reef's bores and the next crest do not merge.
    const crests = crestsByDensity(run.onsets.filter((o) => o.seed === record.seed && o.t > record.start).map((o) => ({ ...o, phase: phaseOf(o) }))
      .sort((a, b) => a.phase - b.phase), run.tp).map((g) => g.filter((o) => canyonPeelAt(o.x, o.z, c)).sort((a, b) => a.t - b.t));
    for (const crest of crests) {
      if (crest.length < 4) continue;
      // From the crest's first break on the reef.
      const first = crest[0];
      if (first.t < record.start + 2 || first.t > record.end - run.tp) continue;
      // Each bin's first break.
      const bins = new Map<number, Onset>();
      for (const o of crest) {
        const b = Math.floor(o.x / BIN);
        const had = bins.get(b);
        if (!had || o.t < had.t) bins.set(b, o);
      }
      const start = Math.floor(first.x / BIN);
      const path: Onset[] = [bins.get(start)!];
      let gap = 0;
      for (let b = start + 1; ; b += 1) {
        const o = bins.get(b);
        if (!o) { if ((gap += BIN) > GAP) break; continue; }
        const prev = path[path.length - 1];
        if (o.t < prev.t - SLACK) break;
        // The peel over the last WINDOW m.
        const back = path.find((p) => p.x >= o.x - WINDOW) ?? path[0];
        if (o.x - path[0].x >= WINDOW && o.x - back.x > 0.5 * WINDOW) {
          const v = Math.hypot(o.x - back.x, o.z - back.z) / Math.max(1e-3, o.t - back.t);
          const angle = (Math.asin(Math.min(1, cb / v)) * 180) / Math.PI;
          if (o.t - back.t <= 0 || angle < CLOSE) break;
        }
        path.push(o);
        gap = 0;
      }
      const end = path[path.length - 1];
      let line = 0;
      for (let k = 1; k < path.length; k += 1) line += Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z);
      const seconds = end.t - path[0].t;
      const angle = seconds > 0 ? (Math.asin(Math.min(1, cb / (line / seconds))) * 180) / Math.PI : 0;
      const upcoast = Math.max(0, first.x - Math.min(...crest.filter((o) => o.t <= first.t + 3).map((o) => o.x)));
      // How long the crest keeps breaking down the reef, whatever its peel: from the first break toward +x while the next
      // comes within GAP m along shore (a fast section does not end it, nor a section re-breaking further inshore later).
      let runEnd = path[0];
      let runLast = path[0].t;
      gap = 0;
      for (let b = start + 1; ; b += 1) {
        const o = bins.get(b);
        if (!o) { if ((gap += BIN) > GAP) break; continue; }
        runEnd = o;
        runLast = Math.max(runLast, o.t);
        gap = 0;
      }
      rides.push({ seed: record.seed, t: first.t, x: first.x, along: end.x - path[0].x, line, seconds, angle, upcoast, runAlong: runEnd.x - path[0].x, runSeconds: runLast - path[0].t });
      if (verbose) {
        console.log(`  seed ${record.seed} t ${first.t.toFixed(1)}: start x ${first.x.toFixed(0)} z ${first.z.toFixed(0)}; ride to x ${end.x.toFixed(0)} z ${end.z.toFixed(0)}, `
          + `${(end.x - path[0].x).toFixed(0)} m along shore, ${line.toFixed(0)} m along its breaks, ${seconds.toFixed(1)} s, ${angle.toFixed(0)}°; upcoast ${upcoast.toFixed(0)} m; ${crest.length} breaks; `
          + `breaking down the reef ${(runEnd.x - path[0].x).toFixed(0)} m along shore, ${(runLast - path[0].t).toFixed(1)} s`);
      }
    }
  }
  const real = rides.filter((r) => r.along >= 4);
  console.log(`${run.size} (${file.split('/').pop()}): ${rides.length} crests; ride along shore median ${fmt(quantile(rides.map((r) => r.along), 0.5))} m, `
    + `75th ${fmt(quantile(rides.map((r) => r.along), 0.75))}, 90th ${fmt(quantile(rides.map((r) => r.along), 0.9))}; along its breaks median ${fmt(quantile(rides.map((r) => r.line), 0.5))} m, `
    + `90th ${fmt(quantile(rides.map((r) => r.line), 0.9))}; duration median ${fmt(quantile(rides.map((r) => r.seconds), 0.5), 1)} s, 75th ${fmt(quantile(rides.map((r) => r.seconds), 0.75), 1)}, `
    + `90th ${fmt(quantile(rides.map((r) => r.seconds), 0.9), 1)}; ≥ 10 s ${rides.filter((r) => r.seconds >= 10).length} of ${rides.length}; `
    + `peel over the ride median ${fmt(quantile(real.map((r) => r.angle), 0.5))}°; upcoast within 3 s median ${fmt(quantile(rides.map((r) => r.upcoast), 0.5))} m, 90th ${fmt(quantile(rides.map((r) => r.upcoast), 0.9))} m; `
    + `breaking down the reef whatever its peel (gaps under ${GAP} m along shore): along shore median ${fmt(quantile(rides.map((r) => r.runAlong), 0.5))} m, 90th ${fmt(quantile(rides.map((r) => r.runAlong), 0.9))}; `
    + `duration median ${fmt(quantile(rides.map((r) => r.runSeconds), 0.5), 1)} s, 90th ${fmt(quantile(rides.map((r) => r.runSeconds), 0.9), 1)}; ≥ 10 s ${rides.filter((r) => r.runSeconds >= 10).length} of ${rides.length}`);
}
