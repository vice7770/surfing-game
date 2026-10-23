/**
 * canyon-beach-break (2026-10-23): the bars per beach peak, and the reef's, re-read from a size report's onsets
 * (`scripts/canyon-size-report.ts --json <file>`), no new simulation, no riders.
 *
 * The onsets are grouped into crests by their phase, as the size report does (one density peak per crest). Then, per
 * beach peak (`canyonBars`), each crest's breaks over the bar's columns (its tip ± reach + taper) are binned along shore
 * (BIN m, each bin's first break), and from the crest's first break there the ride is walked both ways, bin by bin, as
 * canyon-wave-r2's ride report walks the reef: while the next break lies within GAP m along shore, comes no earlier than
 * the last less SLACK s, and the peel over the last WINDOW m (sin α = c_b / V along the breaks' own line) stays at or
 * above 27°, the readout's close-out line. Per peak:
 * - **starts**: where each crest first breaks on the bar, against the tip (within ±TIP m: the peak breaks first), and how
 *   many crests break on the bar at all (≥ 4 breaks), the sets (top third by their first face) and all;
 * - **the peel each way**: the ride's angle (its length along its breaks over its duration), and each arm's own fit (onset
 *   time against x, as the size report's per-crest fit), median; along shore and along the breaks, m; duration, s;
 * - **close-outs**: a crest breaking over CLOSE_SPAN m or more of the bar within CLOSE_SECONDS of its first break;
 * - **faces down each peel**: at the start (±5 m) and 15, 30, 45 m along each arm (±7.5 m), per crest against its start,
 *   and the sets' (top third of the breaks in each bin);
 * - **ξb**: each break on the bar, tan β / √(Hb / L0) with Hb its measured face and L0 = g Tp² / 2π: along +z (canyon-wave-r2's
 *   measure: the slope across its still depth ± 0.4 m) and along the wave's ray (the advisor's, Mead & Black's orthogonal
 *   gradient: |∇h| cos α', α' the ray's angle to the bed's gradient, the arm's measured peel where the contours run
 *   obliquer than it, else the contours' own angle), for the first breaks (each crest's within 5 m of its start) and all;
 *   the share spilling (ξb < 0.4, Battjes 1974) against plunging;
 * - **the take-off column** (the tip ± 4 m): each crest's most seaward break there, its depth's 90th percentile (the
 *   take-off's fit) and where one wave in ten starts breaking.
 * And the reef (`canyonPeelAt`): its crests' starts, close-outs and upcoast runs over its own breaks, its rides by the same
 * walk toward +x.
 *
 *   rolldown docs/research/canyon-beach-break-2026-10-23/beach-report.ts -o dist/scripts/beach-report.mjs --format esm --platform node \
 *     && node dist/scripts/beach-report.mjs <run.json>[,<run.json>…] [--verbose]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { CANYON, canyonBars, canyonPeelAt, canyonReefEndX, canyonShape, createSpot, type CanyonBar, type CanyonBed } from '../../../src/wave/Bathymetry';
import { GRAVITY } from '../../../src/wave/dispersion';
import { alongShoreOf, tankDepth, tankLayout, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

interface Onset { seed: number; t: number; x: number; z: number; face: number; depth: number; front?: number; asymmetry?: number }
/** The face's shape as breaks start (the size report's `--raw` jumps): steepest metre, the share under 20°, front/back steepness. */
function shapeLine(list: Onset[]): string {
  const fronts = list.map((o) => o.front ?? Number.NaN).filter(Number.isFinite);
  if (!fronts.length) return 'no face shapes (run the size report with --raw and read it with --raw)';
  const asym = list.map((o) => o.asymmetry ?? Number.NaN).filter(Number.isFinite);
  return `steepest metre median ${fmt(median(fronts))}° (10–90 % ${fmt(quantile(fronts, 0.1))}…${fmt(quantile(fronts, 0.9))}°), under 20° ${pct(fronts.filter((v) => v < 20).length, fronts.length)}; `
    + `front/back steepness median ${fmt(median(asym), 2)} (10–90 % ${fmt(quantile(asym, 0.1), 2)}…${fmt(quantile(asym, 0.9), 2)})`;
}
interface Run {
  size: string; hs: number; tp: number; canyon: Record<string, number>; celerity: number; bed?: CanyonBed;
  records: { seed: number; start: number; end: number }[]; onsets: Onset[];
}

const BIN = 2;
const GAP = 8;
const SLACK = 0.3;
const WINDOW = 10;
const CLOSE = 27;
const TIP = 15;
/** The peak's section: the breaks within this many seconds of a crest's first break, beside it. */
const SECTION = 1.5;
/** A beach arm's next break lies within this many metres across shore of the last. */
const ZJUMP = 30;
const CLOSE_SPAN = 40;
const CLOSE_SECONDS = 2;
const KAPPA = 0.3;
const SIGMA = 0.1;
const SEPARATION = 0.5;
const DH = 0.4;
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
const mapOption = process.argv.indexOf('--map');
/** `--map <prefix>`: each peak's crests drawn as panels (`<prefix>-<k>.png`): every break coloured by its time since the crest's first. */
const mapPrefix = mapOption >= 0 ? process.argv[mapOption + 1] : undefined;

/** A minimal RGB PNG (filter 0, one IDAT). */
function writePng(path: string, width: number, height: number, rgb: Uint8Array): void {
  const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf: Uint8Array) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Uint8Array) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); Buffer.from(data).copy(out, 8);
    out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };
  const raw = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y += 1) Buffer.from(rgb.subarray(y * width * 3, (y + 1) * width * 3)).copy(raw, y * (width * 3 + 1) + 1);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]));
}
const files = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--map').flatMap((a) => a.split(','));
const quantile = (values: number[], f: number) => {
  const v = values.filter(Number.isFinite);
  if (!v.length) return Number.NaN;
  const sorted = [...v].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];
};
const median = (values: number[]) => quantile(values, 0.5);
const fmt = (v: number, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const pct = (n: number, of: number) => `${n} of ${of}${of ? ` (${Math.round((100 * n) / of)} %)` : ''}`;

// `--raw`: the beach peaks read the size report's raw jumps (`--raw` there), the game's onsets without their filters.
const useRaw = process.argv.includes('--raw');
const runs = files.map((file) => JSON.parse(readFileSync(file, 'utf8')) as Run & { raw?: Onset[] });
const reefOnsets = runs.flatMap((r) => r.onsets);
const run = runs[0];
for (const other of runs.slice(1)) {
  run.records.push(...other.records);
  run.onsets.push(...other.onsets);
  if (other.raw) run.raw?.push(...other.raw);
}
if (useRaw) {
  if (!run.raw) throw new Error('--raw: the run has no raw jumps (run the size report with --raw)');
  run.onsets = run.raw;
}
const bed = run.bed ?? 'reef';
if (bed === 'reef') Object.assign(CANYON, run.canyon);
const c = canyonShape(bed);
const cb = run.celerity;
const config = { spot: 'canyon', seed: 1, significantHeight: run.hs, peakPeriod: run.tp, directionDegrees: 0, spreading: 150, tide: 0, canyonBed: bed } as SurfZoneConfig;
const tank = tankLayout(config);
const spot = createSpot('canyon', 1, { canyonBed: bed });
const depthAt = (x: number, z: number) => tankDepth(spot, tank.edgeDepth, x, z, tank);
const window = alongShoreOf(config);
const xMin = -window / 2;
const columns = window + 1;
const rows = Math.ceil(tank.shore - tank.zoneInner) + 1;
const travel = new Float64Array(columns * rows);
for (let col = 0; col < columns; col += 1) {
  let tau = 0;
  for (let r = 1; r < rows; r += 1) {
    const depth = Math.max(0.2, depthAt(xMin + col, tank.zoneInner + r - 0.5));
    tau += 1 / Math.sqrt(GRAVITY * (depth + KAPPA * Math.min(depth, run.hs)));
    travel[col * rows + r] = tau;
  }
}
const phaseOf = (o: Onset) => {
  const col = Math.min(columns - 1, Math.max(0, Math.round(o.x - xMin)));
  const r = Math.min(rows - 1, Math.max(0, Math.round(o.z - tank.zoneInner)));
  return o.t - travel[col * rows + r];
};
const L0 = (GRAVITY * run.tp * run.tp) / (2 * Math.PI);
/** Where the bed along +z at x first reaches depth h, z. */
const zAt = (x: number, h: number) => {
  for (let z = tank.zoneInner; z < 0; z += 0.25) if (depthAt(x, z) <= h) return z;
  return Number.NaN;
};
const slopeZ = (x: number, h: number) => (2 * DH) / (zAt(x, h - DH) - zAt(x, h + DH));
/** The bed's gradient at (x, z): its size and the contours' angle to the shore, degrees. */
const gradient = (x: number, z: number) => {
  const gx = (depthAt(x + 1, z) - depthAt(x - 1, z)) / 2;
  const gz = (depthAt(x, z + 1) - depthAt(x, z - 1)) / 2;
  return { size: Math.hypot(gx, gz), contour: (Math.atan2(Math.abs(gx), Math.abs(gz)) * 180) / Math.PI };
};

const allCrests: { seed: number; start: number; end: number; onsets: Phased[] }[] = [];
for (const record of run.records) {
  const mine = run.onsets.filter((o) => o.seed === record.seed && o.t > record.start).map((o) => ({ ...o, phase: phaseOf(o) })).sort((a, b) => a.phase - b.phase);
  for (const group of crestsByDensity(mine, run.tp)) allCrests.push({ seed: record.seed, start: record.start, end: record.end, onsets: group });
}
console.log(`${run.size}: Hs ${run.hs} m, Tp ${run.tp} s; ${run.records.length} record(s), ${run.onsets.length} onsets, ${allCrests.length} crests; c_b ${fmt(cb, 2)} m/s; L0 ${fmt(L0)} m; window ${window} m`);

interface Side { along: number; line: number; seconds: number; angle: number; fit: number; end: Onset }
/** Walk a crest's binned breaks from its start toward `direction` (±1), as canyon-wave-r2's ride report. */
function walk(bins: Map<number, Onset[]>, start: number, direction: 1 | -1, from?: Onset): Side {
  const path: Onset[] = [from ?? bins.get(start)![0]];
  let gap = 0;
  for (let b = start + direction; ; b += direction) {
    const prev = path[path.length - 1];
    // The bin's breaks: the reef's walk takes its first (canyon-wave-r2's); a beach arm's, its first that carries the break
    // on (no earlier than the last less SLACK s, within ZJUMP m across shore of it): a bin can also hold the crest before's
    // break further inshore, which is not this ride's.
    let o: Onset | undefined;
    if (!from) o = bins.get(b)?.[0];
    else {
      // The peel's front: the earliest break within GAP m ahead that carries it on, so a column that broke late (a hole in
      // the front, or a re-break inshore) is stepped over rather than ending the ride.
      let at = b;
      for (let k = 0; k * BIN <= GAP; k += 1) {
        for (const q of bins.get(b + direction * k) ?? []) {
          if (q.t < prev.t - SLACK || Math.abs(q.z - prev.z) > ZJUMP) continue;
          if (!o || q.t < o.t) { o = q; at = b + direction * k; }
        }
      }
      if (o) b = at;
      else break;
    }
    if (!o) { if ((gap += BIN) > GAP) break; continue; }
    if (o.t < prev.t - SLACK) break;
    const back = path.find((p) => direction * (o.x - p.x) <= WINDOW) ?? path[0];
    if (direction * (o.x - path[0].x) >= WINDOW && direction * (o.x - back.x) > 0.5 * WINDOW) {
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
  const angle = seconds > 0 && line > 0 ? (Math.asin(Math.min(1, cb / (line / seconds))) * 180) / Math.PI : Number.NaN;
  // The arm's own fit: onset time and z against x over the path (as the size report's per-crest fit).
  let fit = Number.NaN;
  if (path.length >= 4) {
    const n = path.length;
    const mx = path.reduce((s, o) => s + o.x, 0) / n;
    const mt = path.reduce((s, o) => s + o.t, 0) / n;
    const mz = path.reduce((s, o) => s + o.z, 0) / n;
    let sxx = 0; let sxt = 0; let sxz = 0;
    for (const o of path) { sxx += (o.x - mx) ** 2; sxt += (o.x - mx) * (o.t - mt); sxz += (o.x - mx) * (o.z - mz); }
    const slope = sxx > 0 ? sxt / sxx : 0;
    const stretch = Math.hypot(1, sxx > 0 ? sxz / sxx : 0);
    if (direction * slope > 0) fit = (Math.asin(Math.min(1, (cb * Math.abs(slope)) / stretch)) * 180) / Math.PI;
  }
  return { along: Math.abs(end.x - path[0].x), line, seconds, angle, fit, end };
}

/**
 * The owner's main bar (2026-10-23: "the white break interrupts and the wave never fully breaks"): does a crest's break run
 * on without a gap from where it starts to the end of its bar? From the start the bins are stepped outward one at a time
 * to `endX` along shore; each bin takes its earliest break of this crest that carries the break on (no earlier than the
 * last less SLACK s, within ZJUMP m across shore of it), or is a gap. Returned: how far it reached, the largest gap between
 * breaks along shore, m, and the longest pause between neighbouring breaks, s; the continuous line, up to the first gap
 * wider than CONTINUOUS_GAP m or pause longer than CONTINUOUS_PAUSE s, along shore and along its breaks, m, and its
 * duration, s; and whether that line reaches the end (within BIN m).
 */
const CONTINUOUS_GAP = 4;
const CONTINUOUS_PAUSE = 2;
const STOP_GAP = 20;
interface Continuity { reach: number; gap: number; pause: number; along: number; line: number; seconds: number; whole: boolean }
function continuity(bins: Map<number, Onset[]>, from: Onset, direction: 1 | -1, endX: number): Continuity {
  let prev = from;
  let prevBin = Math.floor(from.x / BIN);
  let gap = 0; let pause = 0;
  let line = 0;
  let unbroken = true;
  const out: Continuity = { reach: 0, gap: 0, pause: 0, along: 0, line: 0, seconds: 0, whole: false };
  for (let b = prevBin + direction; direction * (b * BIN - endX) <= BIN; b += direction) {
    let o: Onset | undefined;
    for (const q of bins.get(b) ?? []) {
      if (q.t < prev.t - SLACK || Math.abs(q.z - prev.z) > ZJUMP) continue;
      if (!o || q.t < o.t) o = q;
    }
    if (!o) {
      if ((b - prevBin) * direction * BIN > STOP_GAP) break;
      continue;
    }
    const space = (Math.abs(b - prevBin) - 1) * BIN;
    const wait = o.t - prev.t;
    gap = Math.max(gap, space);
    pause = Math.max(pause, wait);
    if (unbroken && (space > CONTINUOUS_GAP || wait > CONTINUOUS_PAUSE)) unbroken = false;
    line += Math.hypot(o.x - prev.x, o.z - prev.z);
    if (unbroken) { out.along = Math.abs(o.x - from.x); out.line = line; out.seconds = o.t - from.t; }
    out.reach = Math.abs(o.x - from.x);
    prev = o;
    prevBin = b;
  }
  out.gap = gap;
  out.pause = pause;
  out.whole = unbroken && direction * (prev.x - endX) >= -BIN;
  return out;
}
function continuityLine(label: string, list: Continuity[]): string {
  return `${label}: continuous to the end ${pct(list.filter((c) => c.whole).length, list.length)}; continuous line along shore median ${fmt(median(list.map((c) => c.along)))} m `
    + `(90th ${fmt(quantile(list.map((c) => c.along), 0.9))}), along its breaks ${fmt(median(list.map((c) => c.line)))} m, ${fmt(median(list.map((c) => c.seconds)), 1)} s; `
    + `reached median ${fmt(median(list.map((c) => c.reach)))} m; largest gap median ${fmt(median(list.map((c) => c.gap)))} m (90th ${fmt(quantile(list.map((c) => c.gap), 0.9))}), `
    + `longest pause median ${fmt(median(list.map((c) => c.pause)), 1)} s (90th ${fmt(quantile(list.map((c) => c.pause), 0.9), 1)})`;
}

const STATIONS = [15, 30, 45];
function peakReport(bar: CanyonBar, name: string): void {
  const reach = bar.reach + c.barTaper;
  const crestsHere: {
    first: Onset; set?: boolean; left: Side; right: Side; span: number; section: number; onsets: Onset[]; tipFace: number; at: number[][]; xiFirst: number[]; xiRayFirst: number[];
    toEnd: { left: Continuity; right: Continuity };
  }[] = [];
  const xi: { z: number; ray: number; set: boolean }[] = [];
  const takeOff: { depth: number; z: number; face: number }[] = [];
  let crestsTotal = 0;
  for (const crest of allCrests) {
    const here = crest.onsets.filter((o) => Math.abs(o.x - bar.x) <= reach).sort((a, b) => a.t - b.t);
    if (crest.onsets[0] && crest.onsets.reduce((a, b) => (b.t < a.t ? b : a)).t < crest.start + 2) continue;
    crestsTotal += 1;
    // The take-off's column: this crest's most seaward break there.
    const column = here.filter((o) => Math.abs(o.x - bar.x) <= 4);
    if (column.length) {
      const outer = column.reduce((a, b) => (b.z < a.z ? b : a));
      takeOff.push({ depth: outer.depth, z: outer.z, face: outer.face });
    }
    if (here.length < 4) continue;
    const first = here[0];
    if (first.t > crest.end - run.tp) continue;
    // Each bin's breaks, earliest first.
    const bins = new Map<number, Onset[]>();
    for (const o of here) {
      const b = Math.floor(o.x / BIN);
      const list = bins.get(b);
      if (list) list.push(o);
      else bins.set(b, [o]);
    }
    // The peak's own section: the bins breaking within SECTION s of the first break, contiguous with it (gaps under GAP
    // m). A rounded tip breaks over a few metres at once, where the rider takes off; each arm's ride is walked from its end.
    const start = Math.floor(first.x / BIN);
    const sectionEnd = (direction: 1 | -1) => {
      let end = start;
      let gap = 0;
      for (let b = start + direction; ; b += direction) {
        const o = bins.get(b)?.[0];
        if (!o) { if ((gap += BIN) > GAP) break; continue; }
        if (o.t > first.t + SECTION) break;
        end = b;
        gap = 0;
      }
      return end;
    };
    const [lowEnd, highEnd] = [sectionEnd(-1), sectionEnd(1)];
    const section = (highEnd - lowEnd) * BIN;
    const right = walk(bins, highEnd, 1, bins.get(highEnd)![0]);
    const left = walk(bins, lowEnd, -1, bins.get(lowEnd)![0]);
    const early = here.filter((o) => o.t <= first.t + CLOSE_SECONDS);
    const span = Math.max(...early.map((o) => o.x)) - Math.min(...early.map((o) => o.x));
    const tipFace = median(here.filter((o) => Math.abs(o.x - first.x) <= 5).map((o) => o.face));
    const at = STATIONS.map((S) => [-1, 1].map((d) => median(here.filter((o) => Math.abs(d * (o.x - first.x) - S) <= 7.5).map((o) => o.face))));
    const xiFirst: number[] = [];
    const xiRayFirst: number[] = [];
    for (const o of here) {
      const s = slopeZ(o.x, o.depth);
      const g = gradient(o.x, o.z);
      const side = o.x >= first.x ? right : left;
      const alpha = Number.isFinite(side.fit) ? side.fit : 50;
      const off = Math.min(g.contour, alpha);
      const steep = Math.sqrt(Math.max(0.05, o.face) / L0);
      const zXi = s / steep;
      const rayXi = (g.size * Math.cos((off * Math.PI) / 180)) / steep;
      xi.push({ z: zXi, ray: rayXi, set: false });
      if (Math.abs(o.x - first.x) <= 5) { xiFirst.push(zXi); xiRayFirst.push(rayXi); }
    }
    const toEnd = { left: continuity(bins, bins.get(lowEnd)![0], -1, bar.x - bar.reach), right: continuity(bins, bins.get(highEnd)![0], 1, bar.x + bar.reach) };
    crestsHere.push({ first, left, right, span, section, onsets: here, tipFace, at, xiFirst, xiRayFirst, toEnd });
  }
  // The sets: the top third of the crests breaking here by their start's face.
  const byFace = [...crestsHere].sort((a, b) => b.first.face - a.first.face);
  for (const crest of byFace.slice(0, Math.ceil(byFace.length / 3))) crest.set = true;
  const sets = crestsHere.filter((k) => k.set);
  const tip = crestsHere.filter((k) => Math.abs(k.first.x - bar.x) <= TIP);
  const both = crestsHere.filter((k) => k.left.along >= 10 && k.right.along >= 10);
  const closeOuts = crestsHere.filter((k) => k.span >= CLOSE_SPAN);
  const sideLine = (label: string, list: typeof crestsHere, pick: (k: (typeof crestsHere)[number]) => Side) => {
    const sides = list.map(pick);
    return `${label}: along shore median ${fmt(median(sides.map((s) => s.along)))} m (75th ${fmt(quantile(sides.map((s) => s.along), 0.75))}, 90th ${fmt(quantile(sides.map((s) => s.along), 0.9))}); `
      + `along its breaks ${fmt(median(sides.map((s) => s.line)))} m; ${fmt(median(sides.map((s) => s.seconds)), 1)} s (90th ${fmt(quantile(sides.map((s) => s.seconds), 0.9), 1)}); `
      + `≥ 5 s ${sides.filter((s) => s.seconds >= 5).length}; peel over the ride ${fmt(median(sides.filter((s) => s.along >= 6).map((s) => s.angle)))}°, own fits ${fmt(median(sides.map((s) => s.fit)))}° (${sides.filter((s) => Number.isFinite(s.fit)).length})`;
  };
  console.log(`\n${name} peak (x ${bar.x}, slope 1:${fmt(1 / bar.slope)}, rounding ${bar.rounding} m, reach ${bar.reach} m):`);
  console.log(`  crests breaking on it (≥ 4 breaks): ${pct(crestsHere.length, crestsTotal)} of the window's crests; starting within ±${TIP} m of the tip ${pct(tip.length, crestsHere.length)}; `
    + `starts x median ${fmt(median(crestsHere.map((k) => k.first.x - bar.x)))} m from the tip (10–90 % ${fmt(quantile(crestsHere.map((k) => k.first.x - bar.x), 0.1))}…${fmt(quantile(crestsHere.map((k) => k.first.x - bar.x), 0.9))}), `
    + `z median ${fmt(median(crestsHere.map((k) => k.first.z)))} (10–90 % ${fmt(quantile(crestsHere.map((k) => k.first.z), 0.1))}…${fmt(quantile(crestsHere.map((k) => k.first.z), 0.9))}), depth ${fmt(median(crestsHere.map((k) => k.first.depth)), 2)} m, face ${fmt(median(crestsHere.map((k) => k.first.face)), 2)} m`);
  console.log(`  peeling both ways ≥ 10 m past the peak's section: ${pct(both.length, crestsHere.length)}; sets ${pct(sets.filter((k) => k.left.along >= 10 && k.right.along >= 10).length, sets.length)}; `
    + `the peak's section (within ${SECTION} s of the first break) median ${fmt(median(crestsHere.map((k) => k.section)))} m, 90th ${fmt(quantile(crestsHere.map((k) => k.section), 0.9))} m; `
    + `close-outs (≥ ${CLOSE_SPAN} m within ${CLOSE_SECONDS} s) ${pct(closeOuts.length, crestsHere.length)}; spans median ${fmt(median(crestsHere.map((k) => k.span)))} m, 90th ${fmt(quantile(crestsHere.map((k) => k.span), 0.9))} m`);
  console.log(`  BREAKING IN SEQUENCE, −x arm (to ${bar.reach} m): ${continuityLine('all', crestsHere.map((k) => k.toEnd.left))}`);
  console.log(`  BREAKING IN SEQUENCE, +x arm (to ${bar.reach} m): ${continuityLine('all', crestsHere.map((k) => k.toEnd.right))}`);
  console.log(`  …the sets: −x ${continuityLine('', sets.map((k) => k.toEnd.left))}`);
  console.log(`  …the sets: +x ${continuityLine('', sets.map((k) => k.toEnd.right))}`);
  console.log(`  ${sideLine('−x arm (a right)', crestsHere, (k) => k.left)}`);
  console.log(`  ${sideLine('+x arm (a left) ', crestsHere, (k) => k.right)}`);
  console.log(`  sets: ${sideLine('−x', sets, (k) => k.left)}`);
  console.log(`  sets: ${sideLine('+x', sets, (k) => k.right)}`);
  const ratio = (k: number, d: number) => crestsHere.map((q) => q.at[k][d] / q.tipFace).filter(Number.isFinite);
  const setFace = (k: number, d: number) => quantile(sets.map((q) => q.at[k][d]), 0.5);
  console.log(`  faces down each peel (per crest against its start; −x | +x): ` + STATIONS.map((S, k) => `${S} m ${fmt(median(ratio(k, 0)), 2)} | ${fmt(median(ratio(k, 1)), 2)}`).join(', ')
    + `; the sets' start face ${fmt(median(sets.map((q) => q.tipFace)), 2)} m, then ` + STATIONS.map((S, k) => `${S} m ${fmt(setFace(k, 0), 2)} | ${fmt(setFace(k, 1), 2)}`).join(', '));
  const firstZ = crestsHere.map((k) => median(k.xiFirst));
  const firstRay = crestsHere.map((k) => median(k.xiRayFirst));
  console.log(`  ξb at the first breaks (each crest's within 5 m of its start): along +z median ${fmt(median(firstZ), 2)}, along the ray ${fmt(median(firstRay), 2)}; sets ${fmt(median(sets.map((k) => median(k.xiRayFirst))), 2)}; `
    + `spilling (ray ξb < 0.4) ${pct(firstRay.filter((v) => v < 0.4).length, firstRay.filter(Number.isFinite).length)}`);
  console.log(`  ξb over all its breaks: along +z median ${fmt(median(xi.map((v) => v.z)), 2)} (10–90 % ${fmt(quantile(xi.map((v) => v.z), 0.1), 2)}…${fmt(quantile(xi.map((v) => v.z), 0.9), 2)}), `
    + `along the ray ${fmt(median(xi.map((v) => v.ray)), 2)} (10–90 % ${fmt(quantile(xi.map((v) => v.ray), 0.1), 2)}…${fmt(quantile(xi.map((v) => v.ray), 0.9), 2)}); ray ξb ≥ 0.4: ${pct(xi.filter((v) => v.ray >= 0.4).length, xi.length)}`);
  console.log(`  the face as it starts breaking, first breaks (within 5 m of each crest's start): ${shapeLine(crestsHere.flatMap((k) => k.onsets.filter((o) => Math.abs(o.x - k.first.x) <= 5 && o.t <= k.first.t + 1.5)))}`);
  console.log(`  …the sets' first breaks: ${shapeLine(sets.flatMap((k) => k.onsets.filter((o) => Math.abs(o.x - k.first.x) <= 5 && o.t <= k.first.t + 1.5)))}`);
  console.log(`  …all its breaks: ${shapeLine(crestsHere.flatMap((k) => k.onsets))}`);
  const depths = takeOff.map((t) => t.depth);
  const zs = takeOff.map((t) => t.z);
  console.log(`  the tip's column (±4 m): ${takeOff.length} crests; start depth median ${fmt(median(depths), 2)} m, 90th ${fmt(quantile(depths, 0.9), 2)} m (the take-off fit); `
    + `start z median ${fmt(median(zs))}, one wave in ten breaks seaward of z ${fmt(quantile(zs, 0.1))} (where the bed is ${fmt(depthAt(bar.x, quantile(zs, 0.1)), 2)} m deep)`);
  if (mapPrefix) {
    // Panels of 150 × 200 px, 1 px a metre: x from the tip −75…+75, z −200…0; the bed's 1–5 m contours grey, each break
    // coloured from blue (its crest's first) through green (5 s) and yellow (10 s) to red (15 s and later).
    const [pw, ph, cols] = [150, 200, 4];
    const panels = Math.min(16, crestsHere.length);
    const rows = Math.ceil(panels / cols);
    const width = cols * (pw + 4);
    const height = rows * (ph + 4);
    const rgb = new Uint8Array(width * height * 3).fill(255);
    const put = (x: number, y: number, c: number[]) => { if (x < 0 || y < 0 || x >= width || y >= height) return; rgb.set(c, (y * width + x) * 3); };
    const colour = (age: number) => {
      const t = Math.max(0, Math.min(1, age / 15));
      const stops = [[40, 60, 220], [40, 170, 60], [230, 200, 30], [210, 40, 40]];
      const f = t * 3; const i = Math.min(2, Math.floor(f)); const u = f - i;
      return stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * u));
    };
    crestsHere.slice(0, panels).forEach((k, n) => {
      const ox = (n % cols) * (pw + 4); const oy = Math.floor(n / cols) * (ph + 4);
      for (let py = 0; py < ph; py += 1) for (let px = 0; px < pw; px += 1) {
        const d = depthAt(bar.x - 75 + px + 0.5, -200 + py + 0.5);
        const level = Math.floor(d);
        const right = Math.floor(depthAt(bar.x - 74 + px + 0.5, -200 + py + 0.5));
        const below = Math.floor(depthAt(bar.x - 75 + px + 0.5, -199 + py + 0.5));
        put(ox + px, oy + py, d <= 0 ? [235, 220, 180] : level !== right || level !== below ? [170, 170, 170] : [245, 248, 252]);
      }
      for (const o of k.onsets) {
        const px = Math.round(o.x - bar.x + 75); const py = Math.round(o.z + 200);
        if (px < 0 || px >= pw || py < 0 || py >= ph) continue;
        const c = colour(o.t - k.first.t);
        for (let dy = -1; dy <= 1; dy += 1) put(ox + px, oy + py + dy, c);
      }
    });
    writePng(`${mapPrefix}-${name.startsWith('Up') ? 'up' : 'down'}.png`, width, height, rgb);
  }
  if (verbose) {
    for (const k of crestsHere) {
      console.log(`    t ${k.first.t.toFixed(1)} (seed ${k.first.seed}): start ${fmt(k.first.x - bar.x)} m off the tip, z ${fmt(k.first.z)}, ${fmt(k.first.depth, 2)} m, face ${fmt(k.first.face, 2)}; section ${fmt(k.section)} m, span ${fmt(k.span)} m; `
        + `−x ${fmt(k.left.along)} m ${fmt(k.left.seconds, 1)} s ${fmt(k.left.angle)}°/${fmt(k.left.fit)}°; +x ${fmt(k.right.along)} m ${fmt(k.right.seconds, 1)} s ${fmt(k.right.angle)}°/${fmt(k.right.fit)}°`);
    }
  }
}

for (const [k, bar] of canyonBars(c).entries()) peakReport(bar, k === 0 ? 'Upcoast (−x)' : 'Downcoast (+x)');

// The reef: its own breaks (`canyonPeelAt`), each crest's start, close-out and upcoast run there, and its ride toward +x.
{
  const reef: { first: Onset; span: number; upcoast: number; ride: Side }[] = [];
  const reefFirst: Onset[] = [];
  const reefContinuity: Continuity[] = [];
  const reefAll: Onset[] = [];
  for (const crest of allCrests) {
    const here = crest.onsets.filter((o) => canyonPeelAt(o.x, o.z, c)).sort((a, b) => a.t - b.t);
    if (here.length < 4) continue;
    const first = here[0];
    if (first.t < crest.start + 2 || first.t > crest.end - run.tp) continue;
    const early = here.filter((o) => o.t <= first.t + CLOSE_SECONDS);
    const soon = here.filter((o) => o.t <= first.t + 3);
    reefFirst.push(...here.filter((o) => Math.abs(o.x - first.x) <= 5 && o.t <= first.t + 1.5));
    reefAll.push(...here);
    const bins = new Map<number, Onset[]>();
    for (const o of here) {
      const b = Math.floor(o.x / BIN);
      const had = bins.get(b);
      if (!had || o.t < had[0].t) bins.set(b, [o]);
    }
    const all = new Map<number, Onset[]>();
    for (const o of here) {
      const b = Math.floor(o.x / BIN);
      const list = all.get(b);
      if (list) list.push(o);
      else all.set(b, [o]);
    }
    reefContinuity.push(continuity(all, first, 1, canyonReefEndX(c)));
    reef.push({
      first, span: Math.max(...early.map((o) => o.x)) - Math.min(...early.map((o) => o.x)),
      upcoast: Math.max(0, first.x - Math.min(...soon.map((o) => o.x))), ride: walk(bins, Math.floor(first.x / BIN), 1),
    });
  }
  console.log(`\nThe reef, BREAKING IN SEQUENCE toward +x (to its end on the beach face, x ${fmt(canyonReefEndX(c))}): ${continuityLine('all', reefContinuity)}`);
  console.log(`\nThe reef's face as it starts breaking (its first breaks, within 5 m of each crest's start): ${shapeLine(reefFirst)}; all its breaks: ${shapeLine(reefAll)}`);
  const starts = reef.map((r) => r.first.x);
  const m = median(starts);
  console.log(`\nThe reef (its own breaks, canyonPeelAt): ${reef.length} crests; starts x median ${fmt(m)}, within ±10 m ${pct(starts.filter((x) => Math.abs(x - m) <= 10).length, reef.length)}; `
    + `close-outs (≥ ${CLOSE_SPAN} m within ${CLOSE_SECONDS} s) ${reef.filter((r) => r.span >= CLOSE_SPAN).length}; upcoast within 3 s median ${fmt(median(reef.map((r) => r.upcoast)))} m, 90th ${fmt(quantile(reef.map((r) => r.upcoast), 0.9))} m; `
    + `ride toward +x: along shore median ${fmt(median(reef.map((r) => r.ride.along)))} m, along its breaks ${fmt(median(reef.map((r) => r.ride.line)))} m (90th ${fmt(quantile(reef.map((r) => r.ride.line), 0.9))}), `
    + `${fmt(median(reef.map((r) => r.ride.seconds)), 1)} s, ≥ 10 s ${reef.filter((r) => r.ride.seconds >= 10).length}; peel over the ride ${fmt(median(reef.filter((r) => r.ride.along >= 6).map((r) => r.ride.angle)))}°, own fits ${fmt(median(reef.map((r) => r.ride.fit)))}°`);
}
