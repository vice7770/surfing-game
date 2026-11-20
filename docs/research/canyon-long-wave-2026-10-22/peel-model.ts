/**
 * A quick screen of a Canyon bed's peel, before the solver (canyon-long-wave, 2026-10-22): linear geometric optics, no
 * solver, no riders. The arrival time T(x, z) of a straight, shore-parallel crest launched at the blend's end is the
 * eikonal |∇T| = 1/c, c the linear phase speed at the size's peak period (fast sweeping, 1 m grid; it refracts the crest
 * by Snell's law on any bed). Each column breaks when the crest first reaches the size's set breaking depth h_b (the
 * solver's measured set depths: Small 2.0 m, Medium 2.5 m, Big 3.8 m), so the break point runs along that contour at
 * V = ds/dT, and the peel angle is sin α = c_b / V with c_b = √(g h_b), as the game's readout.
 *
 * It reports, per size, the peak (the earliest break on the reef), the ride from it toward +x: the contiguous stretch
 * whose local peel (over ±WINDOW m along shore) stays at or above 27° (the readout's close-out line) and runs toward +x,
 * its along-shore extent, its length along the break contour, its duration and its peel angles; and how far the break
 * runs upcoast (toward −x) from the peak. Heights along the crest are not modelled (no focusing, no groupiness): the
 * solver decides; this only ranks plan shapes.
 *
 *   rolldown docs/research/canyon-long-wave-2026-10-22/peel-model.ts -o dist/scripts/peel-model.mjs --format esm --platform node \
 *     && node dist/scripts/peel-model.mjs [--canyon key=value,...] [--bed old] [--sizes small,medium,big] [--profile]
 */
import { CANYON, canyonShape, createSpot, type CanyonBed } from '../../../src/wave/Bathymetry';
import { GRAVITY, waveNumber } from '../../../src/wave/dispersion';
import { alongShoreOf, tankDepth, tankLayout, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { SWELLS } from '../../../src/game/SurfConditions';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const bedName: CanyonBed = option('bed') === 'old' ? 'old' : 'reef';
applyCanyonShape(option('canyon'));
const c = canyonShape(bedName);
/** The sets' breaking depths, m (the solver's onsets: canyon-reef-bed and canyon-layout). */
const SET_DEPTH: Record<string, number> = { small: 2.0, medium: 2.5, big: 3.8 };
/** The readout's c_b = √(g h_b), h_b from Green's law (`breakerDepth`), m/s: what the game's peel angle is measured against. */
const READOUT_CB: Record<string, number> = { small: 3.95, medium: 4.69, big: 5.80 };
/** The crest's speed: linear, times √(1 + κ min(h, Hs)/h) (`--kappa`, 0: linear; the size report phases bores at 0.3). */
const KAPPA = Number(option('kappa') ?? 0.3);
/** Local peel over ±WINDOW m along shore. */
const WINDOW = 4;
const CLOSE = 27;
const sizes = (option('sizes') ?? 'small,medium,big').split(',');

for (const size of sizes) {
  const swell = SWELLS[size as keyof typeof SWELLS];
  const config = { spot: 'canyon', seed: 1, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0, spreading: 150, tide: 0, canyonBed: bedName } as SurfZoneConfig;
  const tank = tankLayout(config);
  const spot = createSpot('canyon', 1, { canyonBed: bedName });
  const depth = (x: number, z: number) => tankDepth(spot, tank.edgeDepth, x, z, tank);
  const window = alongShoreOf(config);
  const x0 = -window / 2;
  const z0 = tank.blendEnd;
  const nx = window + 1;
  const nz = Math.ceil(-z0) + 1;
  const omega = (2 * Math.PI) / swell.peakPeriod;
  const slowness = new Float64Array(nx * nz);
  const bed = new Float64Array(nx * nz);
  for (let j = 0; j < nz; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const h = depth(x0 + i, z0 + j);
      bed[j * nx + i] = h;
      const hh = Math.max(0.05, h);
      slowness[j * nx + i] = waveNumber(omega, hh) / omega / Math.sqrt(1 + (KAPPA * Math.min(hh, swell.significantHeight)) / hh);
    }
  }
  // Fast sweeping (Zhao 2005): Godunov upwind updates in four orderings until nothing changes.
  const T = new Float64Array(nx * nz).fill(Infinity);
  for (let i = 0; i < nx; i += 1) T[i] = 0;
  const update = (i: number, j: number) => {
    if (j === 0) return false;
    const k = j * nx + i;
    const a = Math.min(i > 0 ? T[k - 1] : Infinity, i < nx - 1 ? T[k + 1] : Infinity);
    const b = Math.min(T[k - nx], j < nz - 1 ? T[k + nx] : Infinity);
    const s = slowness[k];
    let t: number;
    if (!Number.isFinite(a) && !Number.isFinite(b)) return false;
    if (Math.abs(a - b) >= s) t = Math.min(a, b) + s;
    else t = (a + b + Math.sqrt(2 * s * s - (a - b) * (a - b))) / 2;
    if (t < T[k] - 1e-9) { T[k] = t; return true; }
    return false;
  };
  for (let pass = 0; pass < 12; pass += 1) {
    let changed = 0;
    for (const [di, dj] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      for (let jj = 0; jj < nz; jj += 1) {
        const j = dj > 0 ? jj : nz - 1 - jj;
        for (let ii = 0; ii < nx; ii += 1) {
          const i = di > 0 ? ii : nx - 1 - ii;
          if (update(i, j)) changed += 1;
        }
      }
    }
    if (!changed) break;
  }
  const hb = SET_DEPTH[size];
  const cb = READOUT_CB[size] ?? Math.sqrt(GRAVITY * hb);
  // Each column's first reach of h_b, and whether the reef (not the beach face or the shelf) makes it there.
  const plain = (z: number) => Math.min(c.shelfDepth, -z * c.shoreSlope);
  const zb = new Float64Array(nx).fill(Number.NaN);
  const tb = new Float64Array(nx).fill(Number.NaN);
  const reef = new Uint8Array(nx);
  for (let i = 0; i < nx; i += 1) {
    for (let j = 1; j < nz; j += 1) {
      const h = bed[j * nx + i];
      if (h > hb) continue;
      const hPrev = bed[(j - 1) * nx + i];
      const f = hPrev > h ? (hPrev - hb) / (hPrev - h) : 0;
      const z = z0 + j - 1 + f;
      zb[i] = z;
      tb[i] = T[(j - 1) * nx + i] + f * (T[j * nx + i] - T[(j - 1) * nx + i]);
      reef[i] = plain(z) - hb > 0.1 ? 1 : 0;
      break;
    }
  }
  // Leave out the open edges' levelling (21 m) either side.
  const margin = 22;
  let peak = -1;
  for (let i = margin; i < nx - margin; i += 1) if (reef[i] && (peak < 0 || tb[i] < tb[peak])) peak = i;
  if (peak < 0) { console.log(`${size}: no reef break`); continue; }
  const localAngle = (i: number) => {
    const a = Math.max(0, i - WINDOW);
    const b = Math.min(nx - 1, i + WINDOW);
    const dt = tb[b] - tb[a];
    const ds = Math.hypot(b - a, zb[b] - zb[a]);
    if (!(dt > 0)) return dt < 0 ? -1 : 0;
    return (Math.asin(Math.min(1, cb / (ds / dt))) * 180) / Math.PI;
  };
  // The ride toward +x: while the reef breaks, later and later, at a makeable peel.
  let end = peak;
  const angles: number[] = [];
  let arc = 0;
  for (let i = peak + 1; i < nx - margin; i += 1) {
    if (!reef[i] || !(tb[i] > tb[i - 1] - 0.05)) break;
    const angle = localAngle(i);
    if (i > peak + WINDOW && angle < CLOSE) break;
    angles.push(angle);
    arc += Math.hypot(1, zb[i] - zb[i - 1]);
    end = i;
  }
  // …and the beach face's break past the reef: when it starts, against the ride's end.
  let upcoast = peak;
  for (let i = peak - 1; i >= margin; i -= 1) {
    if (!reef[i] || !(tb[i] > tb[i + 1] - 0.05)) break;
    upcoast = i;
  }
  const sorted = [...angles].sort((p, q) => p - q);
  const q = (f: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))] : Number.NaN);
  const makeable40 = angles.filter((a) => a >= 40).length;
  console.log(`${size.padEnd(6)} h_b ${hb} m, c_b ${cb.toFixed(2)} m/s: peak (${(x0 + peak).toFixed(0)}, ${zb[peak].toFixed(0)}) at ${tb[peak].toFixed(1)} s; `
    + `ride toward +x to (${(x0 + end).toFixed(0)}, ${zb[end].toFixed(0)}): ${end - peak} m along shore, ${arc.toFixed(0)} m along the break, `
    + `${(tb[end] - tb[peak]).toFixed(1)} s; peel 10/50/90 % ${q(0.1).toFixed(0)}/${q(0.5).toFixed(0)}/${q(0.9).toFixed(0)}°, ≥ 40° over ${makeable40} m; `
    + `upcoast spread ${peak - upcoast} m; the reef's break reaches the waterline's ${(-zb[end]).toFixed(0)} m`);
  if (process.argv.includes('--profile')) {
    for (let i = Math.max(margin, peak - 20); i <= Math.min(nx - margin - 1, end + 20); i += 5) {
      console.log(`   x ${(x0 + i).toFixed(0).padStart(4)}: z_b ${zb[i].toFixed(1)} T ${tb[i].toFixed(1)} s ${reef[i] ? 'reef ' : 'plain'} peel ${localAngle(i).toFixed(0)}°`);
    }
  }
}
