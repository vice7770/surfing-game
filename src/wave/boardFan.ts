import { BOARD_SHEET_STRIDE, SHEET_AT } from '../physics/boardSpray';

/**
 * The boards' spray fan (spray-rework, 2026-10-31): #170's sheets (how much water leaves which rail, how fast, and #171's
 * curtain and its tear), thrown as many fine drops drawn streaked along their flight, with mist at the fan's top and
 * outer edges, on the page. Drawn only: nothing here touches the water, the board or the worker; `BoardFanMesh` draws it.
 *
 * Each drop is a spawn record the GPU flies on its own (`fanPosition`): from where and when it left, at what velocity,
 * through air that drags it toward its terminal fall speed (a linear drag, time constant τ = v_t / g), until it lands
 * back on the water it left (its `life`, solved when it is thrown). So a frame's CPU work is the new drops alone.
 *
 * Its numbers are the water-physics advisor's (2026-10-31):
 * - **Drops:** by number N(d) ∝ d⁻² up to a knee d_k, then d⁻⁶, capped at min(6 mm, 12σ/ρ_a U²) (Erinin et al. 2023's
 *   breaker splash); d_k 1 mm off fast sheets (7 m/s and more through the air), 2 mm off slow, thick ones. By volume half
 *   is under the knee. Drops under 0.3 mm are the mist (about 4 % of the water).
 * - **Streaks:** 80 a kilogram at High, each standing for its share of the water (more at lower settings, so the fan's
 *   optical depth is the same). A streak's opacity is its bundle's optical depth, τ = 1.5 m / (ρ A r) over the area A
 *   it covers (its drops' radius r), the bundle spreading 0.15 U a second either side as its drops disperse: opaque
 *   white at the rail, see-through a couple of metres out. Drawn over a 1/60 s exposure.
 * - **Mist:** 0.2 mm drops (drag time 0.07 s), formed where the ligaments and big drops break up 0.1–0.3 s out, hanging
 *   1.5–3 s while growing from 0.2–0.4 m to about 1 m, lit with water drops' forward scattering (g 0.86).
 */
export const FAN = {
  /** Drawn streaks per kilogram of water thrown, at the High Particles setting (scaled by the setting's spawn share). */
  perKg: 80,
  /** Streaks and mist puffs drawn at most at once (High; the setting's pool share of them below it). */
  pool: 8192,
  mistPool: 1024,
  /** The drops' spectrum (m): the smallest drawn as streaks, the knee off fast and slow sheets, the largest. */
  smallest: 0.0003,
  knee: { fast: 0.001, slow: 0.002 },
  largest: 0.006,
  /** A streak's bundle starts this wide (m) and spreads at this share of its speed either side, drawn at most this wide. */
  bundle: 0.012,
  disperse: 0.15,
  /** Its drops leave a fifth faster or slower than the sheet's water: along its flight it spreads this share of its speed a second. */
  paceSpread: 0.4,
  widest: 0.25,
  /** The share of the water that is mist, the water one puff stands for at High (kg), and its drops' radius (m). */
  mistShare: 0.04,
  mistMass: 0.006,
  mistRadius: 0.0001,
  /** When on its parent's flight a puff forms (s), how long it hangs (s), how wide it starts (m) and grows to, its drag time (s). */
  mistAt: [0.1, 0.3] as const,
  mistLife: [1.5, 3] as const,
  mistSize: [0.2, 0.4] as const,
  mistGrown: 1,
  mistTau: 0.07,
  /** No drop flies longer than this, s. */
  longest: 3,
} as const;

const SURFACE_TENSION = 0.072;
const AIR_DENSITY = 1.2;

/**
 * A drop's diameter (m) for `u` in [0, 1), by volume from the spectrum: N ∝ d⁻² from `FAN.smallest` to the knee `knee`,
 * d⁻⁶ past it to `largest` (each drawn streak is a share of the water, so its drops are picked by their volume: ∝ d up to
 * the knee, ∝ d⁻³ past it).
 */
export function dropDiameter(u: number, knee: number, largest: number): number {
  const small = FAN.smallest;
  const top = Math.max(small * 1.01, largest);
  const k = Math.min(knee, top);
  const below = (k * k - small * small) / 2;
  const above = top > k ? (k ** 4 * (1 / (k * k) - 1 / (top * top))) / 2 : 0;
  const r = u * (below + above);
  if (r < below) return Math.sqrt(small * small + 2 * r);
  return 1 / Math.sqrt(1 / (k * k) - (2 * (r - below)) / k ** 4);
}

/** The spectrum's knee and cap for a sheet at `speed` m/s through the air: d_k 2 mm slow, 1 mm from 7 m/s; the cap 12σ/ρ_a U². */
export function dropSpectrum(speed: number): { knee: number; largest: number } {
  const fast = Math.min(1, Math.max(0, (speed - 4) / 3));
  const knee = FAN.knee.slow + (FAN.knee.fast - FAN.knee.slow) * fast;
  const largest = Math.min(FAN.largest, (12 * SURFACE_TENSION) / (AIR_DENSITY * Math.max(1, speed) ** 2));
  return { knee, largest };
}

/**
 * Floats per spawn record: x, y, z, birth time; vx, vy, vz, τ; and a streak's drop diameter (m), the water it stands for
 * (kg), its life (s) and a seed (a mist puff's: its starting width, its water, its life, its seed).
 */
export const FAN_STRIDE = 12;
const GRAVITY = 9.81;
/** The fan's own share of the curtain's water shed before the tear (spray-sheet: a fifth to a quarter). */
const SHED = 0.22;

/**
 * Terminal fall speed of a water drop `diameter` m across in still air, m/s (Gunn & Kinzer 1949's measurements,
 * interpolated): 0.27 at 0.1 mm, 4 at 1 mm, 8 at 3 mm, 9.2 at 5.8 mm.
 */
export function fallSpeed(diameter: number): number {
  const mm = diameter * 1000;
  const table = [[0.1, 0.27], [0.2, 0.72], [0.5, 2.06], [1, 4.03], [1.5, 5.4], [2, 6.49], [3, 8.06], [4, 8.83], [5, 9.09], [5.8, 9.17]];
  if (mm <= table[0][0]) return table[0][1] * (mm / table[0][0]);
  for (let k = 1; k < table.length; k += 1) {
    if (mm <= table[k][0]) {
      const [d0, v0] = table[k - 1];
      const [d1, v1] = table[k];
      return v0 + ((v1 - v0) * (mm - d0)) / (d1 - d0);
    }
  }
  return table[table.length - 1][1];
}

/**
 * Where a drop is `age` s after it left (x0, y0, z0) at (vx, vy, vz), dragged toward its terminal velocity (the wind
 * along +z, and v_t = g τ down) with time constant `tau`: p0 + v∞ a + (v0 − v∞) τ (1 − e^(−a/τ)). Into `out` (x, y, z,
 * vx, vy, vz). The GPU's `fanPosition` is the same.
 */
export function fanPosition(
  x0: number, y0: number, z0: number, vx: number, vy: number, vz: number, tau: number, wind: number, age: number, out: Float64Array | number[],
): void {
  const e = Math.exp(-age / tau);
  const sink = -GRAVITY * tau;
  const grow = tau * (1 - e);
  out[0] = x0 + vx * grow;
  out[1] = y0 + sink * age + (vy - sink) * grow;
  out[2] = z0 + wind * age + (vz - wind) * grow;
  out[3] = vx * e;
  out[4] = sink + (vy - sink) * e;
  out[5] = wind + (vz - wind) * e;
}

/**
 * When a drop thrown from height `y0` at `vy` up (drag time `tau`) falls back through `surface`, s (at most `longest`):
 * the later root of y(a) = surface, by bisection on its descending side.
 */
export function landingTime(y0: number, vy: number, tau: number, surface: number, longest: number = FAN.longest): number {
  const sink = -GRAVITY * tau;
  const height = (a: number) => y0 + sink * a + (vy - sink) * tau * (1 - Math.exp(-a / tau)) - surface;
  // The apex: where the vertical velocity crosses zero (none if it never rises).
  const apex = vy > 0 ? tau * Math.log(1 + vy / (GRAVITY * tau)) : 0;
  if (height(longest) > 0) return longest;
  let low = apex;
  let high = longest;
  if (height(low) <= 0) return Math.max(0.02, low);
  // Bisection to a millisecond (12 halvings of at most 3 s).
  for (let n = 0; n < 12; n += 1) {
    const mid = (low + high) / 2;
    if (height(mid) > 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** A ring of spawn records the GPU reads: written at `head`, the oldest overwritten when full. */
export class FanRing {
  readonly data: Float32Array;
  head = 0;
  /** The records in use: the front of the ring (the Particles setting's pool share). */
  limit: number;
  /** The records written since the last upload: from `dirtyFrom`, `dirtyCount` of them (wrapping). */
  dirtyFrom = 0;
  dirtyCount = 0;

  constructor(readonly capacity: number) {
    this.limit = capacity;
    this.data = new Float32Array(capacity * FAN_STRIDE);
    // Unborn: far in the future, so the GPU draws nothing.
    for (let k = 0; k < capacity; k += 1) this.data[k * FAN_STRIDE + 3] = Number.MAX_VALUE;
  }

  /** The next record's offset in `data`, claimed. */
  claim(): number {
    const o = this.head * FAN_STRIDE;
    if (this.dirtyCount === 0) this.dirtyFrom = this.head;
    this.dirtyCount = Math.min(this.limit, this.dirtyCount + 1);
    this.head = (this.head + 1) % this.limit;
    return o;
  }

  /** Use the front `limit` records (the Particles setting), from empty. */
  setLimit(limit: number): void {
    this.limit = Math.max(1, Math.min(this.capacity, limit));
    this.clear();
  }

  /** Forget everything (a new sea, or time running back). */
  clear(): void {
    for (let k = 0; k < this.capacity; k += 1) this.data[k * FAN_STRIDE + 3] = Number.MAX_VALUE;
    this.head = 0;
    this.dirtyFrom = 0;
    this.dirtyCount = this.limit;
  }
}

/**
 * The fan's drops thrown from packed sheets (`packBoardSheets`, the snapshot's or other players'), into `streaks` and
 * `mist`. `dt` s of the sea since the last call (the drops come with the sea's time, so a paused sea throws none),
 * `share` the Particles setting's spawn share, `surfaceAt` the water's height for where each lands, `wind` m/s along +z,
 * `offset` where the drawn board is from the snapshot's.
 */
export function throwFan(
  sheets: ArrayLike<number>, count: number, now: number, dt: number, share: number, random: () => number,
  surfaceAt: (x: number, z: number) => number, wind: number, streaks: FanRing, mist: FanRing,
  offset?: { x: number; y: number; z: number },
): number {
  const dx = offset?.x ?? 0;
  const dy = offset?.y ?? 0;
  const dz = offset?.z ?? 0;
  let thrown = 0;
  const at = new Float64Array(6);
  // Each streak stands for this much water (kg), and so does each mist puff: the fan's optical depth whatever the setting.
  const mass = 1 / (FAN.perKg * share);
  const mistChance = (FAN.mistShare / FAN.mistMass) / FAN.perKg;
  for (let n = 0; n < count; n += 1) {
    const o = n * BOARD_SHEET_STRIDE;
    const flux = sheets[o + SHEET_AT.flux];
    if (!(flux > 0)) continue;
    // The mist's share is thrown as puffs; the rest as streaks.
    const expected = flux * (1 - FAN.mistShare) * dt * FAN.perKg * share;
    let spawns = Math.floor(expected) + (random() < expected - Math.floor(expected) ? 1 : 0);
    const x = sheets[o + SHEET_AT.x];
    const y = sheets[o + SHEET_AT.y];
    const z = sheets[o + SHEET_AT.z];
    const alongX = sheets[o + SHEET_AT.alongX];
    const alongZ = sheets[o + SHEET_AT.alongZ];
    const length = sheets[o + SHEET_AT.length];
    const vx = sheets[o + SHEET_AT.vx];
    const vy = sheets[o + SHEET_AT.vy];
    const vz = sheets[o + SHEET_AT.vz];
    // (A sheet without the fit, all zero, throws its mean along its whole root.)
    const fitted = sheets[o + SHEET_AT.aftVX] !== 0 || sheets[o + SHEET_AT.aftVY] !== 0 || sheets[o + SHEET_AT.aftVZ] !== 0
      || sheets[o + SHEET_AT.foreVX] !== 0 || sheets[o + SHEET_AT.foreVY] !== 0 || sheets[o + SHEET_AT.foreVZ] !== 0;
    const aftX = fitted ? sheets[o + SHEET_AT.aftVX] - vx : 0;
    const aftY = fitted ? sheets[o + SHEET_AT.aftVY] - vy : 0;
    const aftZ = fitted ? sheets[o + SHEET_AT.aftVZ] - vz : 0;
    const foreX = fitted ? sheets[o + SHEET_AT.foreVX] - vx : 0;
    const foreY = fitted ? sheets[o + SHEET_AT.foreVY] - vy : 0;
    const foreZ = fitted ? sheets[o + SHEET_AT.foreVZ] - vz : 0;
    // Where along the root its water leaves: u^p has the sheet's mean share 1/(p + 1).
    const mean = Math.min(0.9, Math.max(0.1, sheets[o + SHEET_AT.fluxMean] || 0.5));
    const power = Math.min(5, Math.max(0.2, 1 / mean - 1));
    const spread = sheets[o + SHEET_AT.spread];
    const breakup = sheets[o + SHEET_AT.breakup];
    const onset = sheets[o + SHEET_AT.onset];
    const torn = breakup > 0;
    const surface = surfaceAt(x + alongX * length * 0.5, z + alongZ * length * 0.5);
    const { knee, largest } = dropSpectrum(Math.hypot(vx, vy, vz - wind));
    const seed = sheets[o + SHEET_AT.side] + 3 * sheets[o + SHEET_AT.source];
    const boardX = sheets[o + SHEET_AT.boardX];
    const boardY = sheets[o + SHEET_AT.boardY];
    const boardZ = sheets[o + SHEET_AT.boardZ];
    for (; spawns > 0; spawns -= 1) {
      // Thrown at some moment over the interval, from where the hull was then (whatever the frame rate: no bursts).
      const early = dt * random();
      const across = random() ** power;
      const pace = 1 - FAN.paceSpread / 2 + FAN.paceSpread * random();
      const jitter = () => (random() - 0.5) * 2 * spread;
      // Its station's launch less the mean (the tail's faster jet): carried on through the curtain to where it leaves.
      const ex = aftX + (foreX - aftX) * across;
      const ey = aftY + (foreY - aftY) * across;
      const ez = aftZ + (foreZ - aftZ) * across;
      let px: number; let py: number; let pz: number; let ux: number; let uy: number; let uz: number;
      // The shed drops are the finer: under the knee.
      let biggest = largest;
      if (!torn) {
        px = x + alongX * across * length; py = y; pz = z + alongZ * across * length;
        ux = (vx + ex) * pace + jitter(); uy = (vy + ey) * pace + jitter(); uz = (vz + ez) * pace + jitter();
      } else {
        const rootX = x + alongX * across * length;
        const rootZ = z + alongZ * across * length;
        const tearLength = sheets[o + SHEET_AT.tearLength];
        const tearX = sheets[o + SHEET_AT.tearX] + sheets[o + SHEET_AT.tearAlongX] * across * tearLength;
        const tearZ = sheets[o + SHEET_AT.tearZ] + sheets[o + SHEET_AT.tearAlongZ] * across * tearLength;
        const tearY = sheets[o + SHEET_AT.tearY];
        const tvx = sheets[o + SHEET_AT.tearVX];
        const tvy = sheets[o + SHEET_AT.tearVY];
        const tvz = sheets[o + SHEET_AT.tearVZ];
        if (random() < SHED) {
          // Shed along the curtain between its first drops and its tear (spray-sheet's hand-off).
          const age = onset + (breakup - onset) * random();
          const f = age / breakup;
          const bulge = 0.5 * GRAVITY * age * (breakup - age);
          px = rootX + (tearX - rootX) * f + ex * age; py = y + (tearY - y) * f + bulge + ey * age; pz = rootZ + (tearZ - rootZ) * f + ez * age;
          ux = (vx + (tvx - vx) * f + ex) * pace + jitter(); uy = (vy + (tvy - vy) * f + ey) * pace + jitter(); uz = (vz + (tvz - vz) * f + ez) * pace + jitter();
          biggest = Math.min(largest, knee);
        } else {
          const ragged = (random() - 0.5) * 0.3 * breakup;
          const age = breakup + ragged;
          px = tearX + tvx * ragged + ex * age; py = tearY + tvy * ragged + ey * age; pz = tearZ + tvz * ragged + ez * age;
          ux = (tvx + ex) * pace + jitter(); uy = (tvy + ey) * pace + jitter(); uz = (tvz + ez) * pace + jitter();
        }
      }
      const diameter = dropDiameter(random(), knee, biggest);
      const tau = fallSpeed(diameter) / GRAVITY;
      // Carried with the drawn board (the sheets are where the snapshot had it), and back to where the hull was then.
      px += dx - boardX * early; py += dy - boardY * early; pz += dz - boardZ * early;
      const life = landingTime(py, uy, tau, surface + dy);
      const s = streaks.claim();
      const d = streaks.data;
      d[s] = px; d[s + 1] = py; d[s + 2] = pz; d[s + 3] = now - early;
      d[s + 4] = ux; d[s + 5] = uy; d[s + 6] = uz; d[s + 7] = tau;
      d[s + 8] = diameter; d[s + 9] = mass; d[s + 10] = life; d[s + 11] = seed + random();
      thrown += 1;
      // Mist where the flight frays (its ligaments and big drops breaking up): a puff that forms on it and hangs there.
      if (random() < mistChance) {
        const age = Math.min(life * 0.8, FAN.mistAt[0] + (FAN.mistAt[1] - FAN.mistAt[0]) * random());
        fanPosition(px, py, pz, ux, uy, uz, tau, wind, age, at);
        const m = mist.claim();
        const e = mist.data;
        e[m] = at[0]; e[m + 1] = at[1]; e[m + 2] = at[2]; e[m + 3] = now - early + age;
        e[m + 4] = at[3]; e[m + 5] = at[4]; e[m + 6] = at[5]; e[m + 7] = FAN.mistTau;
        e[m + 8] = FAN.mistSize[0] + (FAN.mistSize[1] - FAN.mistSize[0]) * random();
        e[m + 9] = FAN.mistMass / share;
        e[m + 10] = FAN.mistLife[0] + (FAN.mistLife[1] - FAN.mistLife[0]) * random();
        e[m + 11] = seed + random();
      }
    }
  }
  return thrown;
}
