/**
 * The breaking line as a player sees it, frame by frame (canyon-beach-break, 2026-10-23; wave only, no riders). The
 * owner: "the waves are not continuous; they break on the reef and that is that. The breaking line is not long, maybe a
 * couple of metres." Earlier bars (rides of 10–16 s, 44–56 m along the breaks) were onset statistics: when each column
 * first broke, joined into a "ride" across pauses. This probe looks at what is white at each instant instead.
 *
 * Every FRAME s, in each region (the reef's footprint; each beach peak's bar, its tip ± reach + taper), for two fields:
 * the solver's breaking (strength > 0.3) and the white drawn (`drawnWhitewater` > 0.3 where the spilling lip runs, else the
 * solver's):
 * - per column, the most seaward white cell deeper than SWASH m (the swash left out);
 * - **the leading line:** from the region's most seaward white column, the run of neighbouring columns whose white lies
 *   within LINK m across shore of the last (one column may be skipped): its length along shore and along the line, m;
 * - **patches:** the other runs of at least PATCH columns on the same crest (their white within CREST m across shore of the
 *   leading line's extension).
 * Waves: a new wave starts when the region's most seaward white jumps seaward by more than NEW_WAVE m. Per wave: its
 * longest line, its median line over the frames it breaks, the share of its frames with a patch beside the line, and each
 * end's travel: from where the wave starts, does the line's end reach the region's end (the reef's end on the beach face
 * toward +x; each bar's arm end, both ways) moving on every frame by no more than JUMP m (a farther jump is a patch ahead
 * joining it) and never vanishing? That is the peak-to-end share.
 *
 *   rolldown docs/research/canyon-beach-break-2026-10-23/frame-probe.ts -o dist/scripts/frame-probe.mjs --format esm --platform node \
 *     && node dist/scripts/frame-probe.mjs --size medium --seed 1 --periods 12 [--canyon key=value,...] [--bed old] [--tube on]
 *        [--stills <dir> --from <s> --to <s> --every <s> --x <x0,x1> --z <z0,z1>] [--json <file>]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { SWELLS } from '../../../src/game/SurfConditions';
import { canyonBars, canyonReefEndX, canyonReefSpan, canyonShape } from '../../../src/wave/Bathymetry';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const size = (option('size') ?? 'medium') as keyof typeof SWELLS;
const swell = SWELLS[size];
const seed = Number(option('seed') ?? 1);
const periods = Number(option('periods') ?? 12);
const bed = option('bed') === 'old' ? 'old' as const : undefined;
applyCanyonShape(option('canyon'));
const FRAME = 0.25;
const THRESHOLD = 0.3;
const SWASH = 0.5;
const LINK = 4;
const PATCH = 3;
const CREST = 12;
const NEW_WAVE = 15;
const JUMP = 6;
/** The peak's section: for its first SECTION s a wave's line may spread at any speed (a rounded tip breaks over metres at once). */
const SECTION = 1.5;
/** The owner's arm: each A-frame needs about 40–60 m each way to peel (decision 7). */
const ARM = 40;
/** The size report's close-out: 40 m or more of a crest breaking within 2 s of its start. */
const SECTION_CHECK = 2;

const sim = new SurfZoneSimulation({
  spot: 'canyon', seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0, spreading: swell.spreading ?? 150,
  tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', ...(bed ? { canyonBed: bed } : {}), ...(option('tube') === 'on' ? { sweptBarrel: true } : {}),
} as unknown as SurfZoneConfig);
const { solver } = sim;
const c = canyonShape(bed);
const { nx, nz, xCenters, zCenters } = solver;
const firstRow = solver.rowBelow(sim.tank.fineFrom);
const columnOf = (x: number) => Math.min(nx - 1, Math.max(0, Math.round((x - xCenters[0]) / solver.dx)));
const reef = canyonReefSpan(c);
interface Region { name: string; from: number; to: number; tip: number; ends: { side: 1 | -1; x: number }[] }
const regions: Region[] = [{ name: 'reef', from: reef.from, to: reef.to, tip: c.peakX, ends: [{ side: 1, x: canyonReefEndX(c) }] }];
for (const [k, bar] of canyonBars(c).entries()) {
  const reach = bar.reach + c.barTaper;
  regions.push({ name: k === 0 ? 'peak −x' : 'peak +x', from: bar.x - reach, to: bar.x + reach, tip: bar.x, ends: [{ side: -1, x: bar.x - bar.reach }, { side: 1, x: bar.x + bar.reach }] });
}
const drawn = (sim as unknown as { drawnWhitewater?: Float64Array }).drawnWhitewater;
const fields: { name: string; values: () => ArrayLike<number> }[] = [
  { name: 'solver', values: () => sim.breaking.strength },
  { name: 'drawn', values: () => drawn ?? sim.breaking.strength },
];

interface Line { from: number; to: number; along: number; arc: number; z: number; patches: number; t?: number }
interface Run { low: number; high: number; z: number; zLow: number; zHigh: number }
/** A region's white per column now (the most seaward white cell, NaN for none), and its runs along shore. */
function runsIn(values: ArrayLike<number>, region: Region): { c0: number; white: Float64Array; runs: Run[] } {
  const c0 = columnOf(region.from);
  const c1 = columnOf(region.to);
  const white = new Float64Array(c1 - c0 + 1).fill(Number.NaN);
  for (let col = c0; col <= c1; col += 1) {
    for (let iz = firstRow; iz < nz; iz += 1) {
      const i = iz * nx + col;
      if (values[i] > THRESHOLD && solver.restLevel - solver.bed[i] > SWASH && solver.h[i] > 0.05) { white[col - c0] = zCenters[iz]; break; }
    }
  }
  // Runs: neighbouring white columns within LINK m across shore of each other (one column may be skipped).
  const runs: Run[] = [];
  const used = new Uint8Array(white.length);
  for (let k = 0; k < white.length; k += 1) {
    if (white[k] !== white[k] || used[k]) continue;
    let high = k;
    let last = white[k];
    used[k] = 1;
    for (let m = k + 1; m < white.length;) {
      if (white[m] === white[m] && !used[m] && Math.abs(white[m] - last) <= LINK) { high = m; last = white[m]; used[m] = 1; m += 1; continue; }
      const skip = m + 1;
      if (skip < white.length && white[skip] === white[skip] && !used[skip] && Math.abs(white[skip] - last) <= LINK) { high = skip; last = white[skip]; used[skip] = 1; m = skip + 1; continue; }
      break;
    }
    if (high - k + 1 < PATCH) continue;
    let zSum = 0; let count = 0;
    for (let m = k; m <= high; m += 1) if (white[m] === white[m]) { zSum += white[m]; count += 1; }
    runs.push({ low: k, high, z: zSum / count, zLow: white[k], zHigh: white[high] });
  }
  return { c0, white, runs };
}

/**
 * One wave's white over time: the runs on its crest each frame (their white within CREST m across shore of where its crest
 * should be, run on at its own speed), its line (the longest of them), its patches (the rest), and each end's travel.
 */
interface Wave {
  start: number; z: number; speed: number; seen: number; frames: Line[]; tip: Line; reached: Map<number, { x: number; ok: boolean; t?: number }>;
  /** The widest gap between its line and a patch on its crest, m; the longest its line stayed split, s (and the streak now). */
  gap: number; split: number; streak: number;
}
const waves = new Map<string, Wave[]>();
const live = new Map<string, Wave[]>();
const frames = new Map<string, { length: number; patches: number }[]>();
function record(time: number): void {
  for (const field of fields) {
    const values = field.values();
    for (const region of regions) {
      const key = `${field.name} ${region.name}`;
      const { c0, runs } = runsIn(values, region);
      const active = (live.get(key) ?? []).filter((w) => time - w.seen <= 1);
      const taken = new Set<Run>();
      // Each live wave takes the runs on its crest (seaward waves first: they are the newest).
      for (const wave of [...active].sort((a, b) => a.z - b.z)) {
        const expected = wave.z + wave.speed * (time - wave.seen);
        const mine = runs.filter((r) => !taken.has(r) && Math.abs(r.z - expected) <= CREST);
        if (!mine.length) continue;
        for (const r of mine) taken.add(r);
        const main = mine.reduce((a, b) => (b.high - b.low > a.high - a.low ? b : a));
        // Its gaps: from the line to each patch on its crest, along shore.
        for (const r of mine) {
          if (r === main) continue;
          wave.gap = Math.max(wave.gap, (r.low > main.high ? r.low - main.high : main.low - r.high) * solver.dx);
        }
        wave.streak = mine.length > 1 ? wave.streak + FRAME : 0;
        wave.split = Math.max(wave.split, wave.streak);
        const line: Line = {
          from: xCenters[c0 + main.low], to: xCenters[c0 + main.high], along: (main.high - main.low) * solver.dx,
          arc: Math.hypot((main.high - main.low) * solver.dx, main.zHigh - main.zLow), z: main.z, patches: mine.length - 1, t: time,
        };
        wave.speed = time > wave.seen ? Math.max(0, Math.min(8, (line.z - wave.z) / (time - wave.seen))) * 0.5 + wave.speed * 0.5 : wave.speed;
        wave.z = line.z;
        wave.seen = time;
        wave.frames.push(line);
        (frames.get(key) ?? frames.set(key, []).get(key)!).push({ length: line.along, patches: line.patches });
        for (const [side, end] of wave.reached) {
          if (!end.ok) continue;
          const x = side > 0 ? line.to : line.from;
          // The peak's own section spreads freely for its first SECTION s; after it, a farther jump is a patch ahead joining.
          if (side * (x - end.x) > JUMP && time - wave.start > SECTION) wave.reached.set(side, { x: end.x, ok: false, t: end.t });
          else if (side * (x - end.x) > 0) wave.reached.set(side, { x, ok: true, t: time });
        }
      }
      // A wave not seen this frame stops travelling: its line vanished.
      for (const wave of active) {
        if (wave.seen === time) continue;
        for (const [side, end] of wave.reached) wave.reached.set(side, { ...end, ok: false });
      }
      // A run no live wave takes, seaward of them all, starts a new wave.
      const seaward = Math.min(Infinity, ...active.map((w) => w.z));
      for (const r of runs) {
        if (taken.has(r) || !(r.z < seaward - NEW_WAVE)) continue;
        const line: Line = {
          from: xCenters[c0 + r.low], to: xCenters[c0 + r.high], along: (r.high - r.low) * solver.dx,
          arc: Math.hypot((r.high - r.low) * solver.dx, r.zHigh - r.zLow), z: r.z, patches: 0, t: time,
        };
        const wave: Wave = { start: time, z: r.z, speed: 4, seen: time, frames: [line], tip: line, reached: new Map(), gap: 0, split: 0, streak: 0 };
        for (const end of region.ends) wave.reached.set(end.side, { x: end.side > 0 ? line.to : line.from, ok: true });
        (waves.get(key) ?? waves.set(key, []).get(key)!).push(wave);
        active.push(wave);
        (frames.get(key) ?? frames.set(key, []).get(key)!).push({ length: line.along, patches: 0 });
        break;
      }
      live.set(key, active.filter((w) => w.seen === time));
    }
  }
}

// Stills (optional): the water from above with the solver's white and the drawn white side by side, seaward up.
const stills = option('stills');
const stillFrom = Number(option('from') ?? Infinity);
const stillTo = Number(option('to') ?? -Infinity);
const stillEvery = Number(option('every') ?? 0.5);
const [sx0, sx1] = (option('x') ?? '-200,200').split(',').map(Number);
const [sz0, sz1] = (option('z') ?? '-220,0').split(',').map(Number);
if (stills) mkdirSync(stills, { recursive: true });
function png(w: number, h: number, rgb: Buffer): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const table = new Int32Array(256).map((_, n) => { let v = n; for (let k = 0; k < 8; k += 1) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; return v; });
  const crc = (buf: Buffer) => { let v = -1; for (const byte of buf) v = table[(v ^ byte) & 0xff] ^ (v >>> 8); return (v ^ -1) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function still(path: string): void {
  const i0 = columnOf(sx0); const i1 = columnOf(sx1);
  const j0 = solver.rowBelow(sz0); const j1 = solver.rowBelow(sz1);
  const w = i1 - i0 + 1; const h = j1 - j0 + 1;
  const W = 2 * w + 6; const H = h;
  const rgb = Buffer.alloc(W * H * 3, 255);
  const hs = swell.significantHeight;
  fields.forEach((field, f) => {
    const values = field.values();
    for (let jj = 0; jj < h; jj += 1) for (let ii = 0; ii < w; ii += 1) {
      const k = (j0 + jj) * nx + i0 + ii;
      const depth = solver.restLevel - solver.bed[k];
      const e = solver.h[k] + solver.bed[k] - solver.restLevel;
      let r: number; let g: number; let b: number;
      if (solver.h[k] < 0.02) { r = 214; g = 196; b = 150; } else {
        const s = Math.max(-1, Math.min(1, e / hs));
        const base = 0.55 + 0.4 * s;
        r = 20 * base; g = 110 * base + 40 * Math.max(0, 1 - depth / 6); b = 170 * base + 40;
        const white = Math.min(1, values[k] * 1.5);
        r += (255 - r) * white; g += (255 - g) * white; b += (255 - b) * white;
      }
      const level = (kk: number) => Math.floor(solver.restLevel - solver.bed[kk]);
      if (depth > 0.5 && depth < 6.5 && ii + 1 < w && jj + 1 < h && (level(k) !== level(k + 1) || level(k) !== level(k + nx))) { r = r * 0.6 + 60; g = g * 0.6 + 40; b *= 0.6; }
      const o = (jj * W + f * (w + 6) + ii) * 3;
      rgb[o] = r; rgb[o + 1] = g; rgb[o + 2] = b;
    }
  });
  writeFileSync(path, png(W, H, rgb));
}

const step = 1 / 30;
const perFrame = Math.round(FRAME / step);
const perStill = Math.round(stillEvery / step);
const steps = Math.round((periods * swell.peakPeriod) / step);
const t0 = Date.now();
for (let n = 1; n <= steps; n += 1) {
  sim.step(step);
  if (n % perFrame === 0) record(solver.time);
  if (stills && n % perStill === 0 && solver.time >= stillFrom && solver.time <= stillTo) still(`${stills}/${size}-t${solver.time.toFixed(2).padStart(7, '0')}.png`);
}
const quantile = (values: number[], q: number) => {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  return v.length ? v[Math.min(v.length - 1, Math.floor(q * v.length))] : Number.NaN;
};
const fmt = (v: number, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
console.log(`canyon ${bed ?? 'today'} ${size} seed ${seed}, ${periods} periods (${((Date.now() - t0) / 1000).toFixed(0)} s); frames every ${FRAME} s; ${option('canyon') ?? ''}`);
const json: Record<string, unknown> = {};
for (const field of fields) {
  for (const region of regions) {
    const key = `${field.name} ${region.name}`;
    const list = (waves.get(key) ?? []).filter((w) => w.frames.length >= 4);
    const lines = frames.get(key) ?? [];
    const longest = list.map((w) => Math.max(...w.frames.map((l) => l.along)));
    const typical = list.map((w) => quantile(w.frames.map((l) => l.along), 0.5));
    const patchy = list.map((w) => w.frames.filter((l) => l.patches > 0).length / w.frames.length);
    // How wide its line already is SECTION_CHECK s after it starts: 40 m or more is the size report's close-out, seen.
    const sections = list.map((w) => w.frames.find((l) => l.t! >= w.start + SECTION_CHECK)?.along ?? Number.NaN).filter(Number.isFinite);
    const ends = region.ends.map((end) => {
      // The farthest the line's end got while it travelled as one line (no vanishing, no jump past JUMP m): at the end?
      const ok = list.filter((w) => end.side * (w.reached.get(end.side)!.x - end.x) >= -LINK);
      const reached = list.map((w) => Math.abs(w.reached.get(end.side)!.x - (end.side > 0 ? w.tip.to : w.tip.from)));
      // The visible peel: the end's speed along shore while it travelled (from the wave's first frame to its farthest), against
      // the crest's speed across shore over the same frames: α = atan(c / v).
      const peel = list.map((w) => {
        const r = w.reached.get(end.side)!;
        const first = w.frames[0];
        if (!(r.t !== undefined && r.t - first.t! >= 2)) return Number.NaN;
        const v = Math.abs(r.x - (end.side > 0 ? first.to : first.from)) / (r.t - first.t!);
        const last = w.frames.filter((l) => l.t! <= r.t!).at(-1)!;
        const crest = (last.z - first.z) / (r.t - first.t!);
        return crest > 0 && v > 0 ? (Math.atan(crest / v) * 180) / Math.PI : Number.NaN;
      });
      const fromTip = list.map((w) => Math.abs(w.reached.get(end.side)!.x - region.tip));
      return `${end.side > 0 ? '+x' : '−x'}: one travelling line reached ${ARM} m from the peak in ${list.filter((w, k) => fromTip[k] >= ARM).length} of ${list.length}, `
        + `the end (x ${fmt(end.x)}) in ${ok.length}; its end got median ${fmt(quantile(fromTip, 0.5))} m from the peak (90th ${fmt(quantile(fromTip, 0.9))}), `
        + `its visible peel median ${fmt(quantile(peel, 0.5))}° (${peel.filter(Number.isFinite).length} waves)`;
    });
    console.log(`${key}: ${list.length} waves; frames breaking ${lines.length}, line along shore p50 ${fmt(quantile(lines.map((l) => l.length), 0.5))} m, p90 ${fmt(quantile(lines.map((l) => l.length), 0.9))} m, `
      + `frames with patches ${fmt((100 * lines.filter((l) => l.patches > 0).length) / Math.max(1, lines.length))} %; per wave: longest line p50 ${fmt(quantile(longest, 0.5))} m (90th ${fmt(quantile(longest, 0.9))}), `
      + `typical line p50 ${fmt(quantile(typical, 0.5))} m, frames with patches p50 ${fmt(100 * quantile(patchy, 0.5))} %; `
      + `the peak's section (its line ${SECTION_CHECK} s after it starts) p50 ${fmt(quantile(sections, 0.5))} m, ≥ 40 m (closing out at the peak) ${sections.filter((v) => v >= 40).length} of ${sections.length}; `
      + `widest gap to a patch p50 ${fmt(quantile(list.map((w) => w.gap), 0.5))} m (90th ${fmt(quantile(list.map((w) => w.gap), 0.9))}), longest split p50 ${fmt(quantile(list.map((w) => w.split), 0.5), 2)} s `
      + `(90th ${fmt(quantile(list.map((w) => w.split), 0.9), 2)}); ${ends.join('; ')}`);
    json[key] = { waves: list.map((w) => ({ start: w.start, frames: w.frames.map((l) => [Number(l.from.toFixed(1)), Number(l.to.toFixed(1)), Number(l.z.toFixed(1)), l.patches]), reached: [...w.reached] })), lines };
  }
}
const out = option('json');
if (out) writeFileSync(out, JSON.stringify(json));
