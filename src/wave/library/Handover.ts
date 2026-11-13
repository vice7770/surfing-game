import { GRAVITY } from '../dispersion';
import type { HandoverState } from './WaveLibrary';

/**
 * C2 step 3 (docs/research/wave-strategy-alternatives/c2-plan.md §1 "The handover", ruling-31-c2-step1b.md point 5):
 * where and when each slice of the breaking wave hands over from the live sea to the Basilisk library.
 *
 * **Lanes.** A slice runs along a straight ray (the plan: "the pool uses straight rays"). The pool's crests cross its
 * reef at about 77° and refract on its face, so a ray square to the incoming crest would read the face obliquely (a bed
 * slope of 0.02 where the waves see 0.05–0.09, step 1b's coverage). Each lane is therefore the straight chord of a
 * refracted ray, from where it crosses the reef's toe to where it reaches the throw contour: the ray is traced from the
 * flat platform by Snell's law on c = √(g (d + H)) (`LANE.traceHeight`, the wave's height there) and its chord kept. A
 * lane also runs `back` m seaward of its toe (where crests are followed before they hand over) and `ahead` m past its
 * throw point (the bore). Lanes are a fixed fan, ordered along the crest (`sigma`), never crossing in the zone.
 *
 * **The rule (ruling 31).** A slice hands over at the later of two moments: when its sea crest is foreseen 5 s before
 * its throw (the time along the lane to the throw contour at the crest's own celerity, √(g (d + η_c)), `crestCelerity`'s
 * rule), and when its crest crosses the reef's toe. On the platform the phase comes from the travel time to the toe:
 * a slice handed over at its toe carries the time since its crest crossed it (`HandoverState.toe`).
 *
 * **The fit.** The raw moments are read on 1 m cells and so carry their noise; each lane's hand-over time, its crest's
 * place past its toe, and the state's keys are fitted along the lanes by the clock's 2 m biweight line (sliceClock's
 * `CLOCK.smoothing`, radius 2√7 m), the keys over `LANE.keyRadius` (the plan: 5–10 m). Only + − × ÷ and √.
 */
export const LANE = {
  /** The lanes' spacing across the incoming crests on the platform, m (the old loft's 0.5 m slices). */
  spacing: 0.5,
  /** Followed this far seaward of the toe before handing over, m; and on this far past the throw point, m. */
  back: 40,
  ahead: 45,
  /** The lanes' stations along them, m. */
  step: 0.25,
  /** Where the toe is: the still depth first this far under the platform's, m (the knee's rounding starts it). */
  toeDepth: 0.05,
  /** The throw contour the lanes' chords end at and the 5 s rule foresees, m: the sea's median throw depth (2.19 m). */
  throwDepth: 2.2,
  /** The traced rays' celerity height, m (the wave's height on the platform, provisional), and their step, m. */
  traceHeight: 1.5,
  traceStep: 0.25,
  /** The longest face a lane may cross, m: a ray that has not reached the throw contour by then has none (no slices). */
  faceReach: 80,
  /** The rule's foresight, s (ruling 31: the later of 5 s before the throw and the toe). */
  foresight: 5,
  /** The fits' radii along the lanes, m: the clock's (2 m biweight, × √7) and the keys'. */
  clockRadius: 2 * Math.sqrt(7),
  keyRadius: 8,
  /** A lane's slice is made this long after its raw moment, s, once its neighbours' have been read too. */
  wait: 0.5,
  /** Raw moments within this of a lane's are its wave's, s (the hand-over line sweeps 8 m of lanes in about 1.5 s). */
  sameWave: 2.5,
  /** A lane's next hand-over is a new wave only this share of a period after its last. */
  newWave: 0.55,
} as const;

/** The crest finder's constants: a top over ±`top` m, `least` m over the lowest water within `trough` m ahead. */
export const CREST = { top: 1, least: 0.3, trough: 15, reach: 2.5, behind: 0.75, lost: 0.35 } as const;

/** One lane: its straight ray from its base, its stations' still depths and the sea's cells under them. */
export interface LaneField {
  count: number;
  stations: number;
  /** Per lane: its base (station 0) and its unit ray, x and z. */
  baseX: Float64Array;
  baseZ: Float64Array;
  rayX: Float64Array;
  rayZ: Float64Array;
  /** Per lane: its place along the crest, m (cumulative), and its static end weight along it (0–1, `END_TAPER`). */
  sigma: Float64Array;
  end: Float64Array;
  /** Per lane: its toe's, throw point's and reef crest's places along it, m; the platform's and the reef crest's depths, m. */
  toe: Float64Array;
  throwAt: Float64Array;
  platform: Float64Array;
  reefCrest: Float64Array;
  /** Per lane and station (lane × stations): the still depth, m. */
  depth: Float64Array;
}

/** A lane field's end taper along the crest, m: slices fade in over this from a field's last lane (no hard σ edge). */
export const END_TAPER = 4;

/**
 * The lanes over a spot's reef (the pool's straight Barrel): rays traced from a row on the platform at `baseZ`, every
 * `LANE.spacing` / cos θ m in x from `fromX` to `toX`, θ the incoming direction (rad from +z toward +x); kept where they
 * reach the throw contour within `LANE.faceReach` m of their toe and `keep` says the throw point is the reef's (not the
 * beach's). Their chords' directions are then smoothed along the crest (`LANE.keyRadius`) and never let cross a
 * neighbour within their stations (a crossing neighbour takes the lane before's direction), so the fan is smooth and
 * the zone's nodes always lie between two lanes. `depthAt` is the still depth, m (positive under water).
 */
export function buildLanes(
  depthAt: (x: number, z: number) => number, direction: number, baseZ: number, fromX: number, toX: number, platformDepth: number,
  keep: (toeX: number, toeZ: number, throwX: number, throwZ: number) => boolean = () => true,
): LaneField {
  const along = LANE.spacing / Math.abs(Math.cos(direction));
  const found: { tx: number; tz: number; angle: number }[] = [];
  const c = (x: number, z: number) => Math.sqrt(GRAVITY * (Math.max(0.05, depthAt(x, z)) + LANE.traceHeight));
  for (let x0 = Math.min(fromX, toX); x0 <= Math.max(fromX, toX) + 1e-9; x0 += along) {
    let x = x0;
    let z = baseZ;
    let th = direction;
    let toe: [number, number] | undefined;
    let travelled = 0;
    const ds = LANE.traceStep;
    for (let k = 0; k < 20000; k += 1) {
      const d = depthAt(x, z);
      if (!toe && d < platformDepth - LANE.toeDepth) toe = [x, z];
      if (toe) travelled += ds;
      if (toe && d <= LANE.throwDepth) {
        if (keep(toe[0], toe[1], x, z)) found.push({ tx: toe[0], tz: toe[1], angle: Math.atan2(x - toe[0], z - toe[1]) });
        break;
      }
      if (travelled > LANE.faceReach || !(d > 0)) break;
      // dθ/ds = −(1/c) ∂c/∂n, n the travel's left normal (cos θ, −sin θ) for θ from +z toward +x.
      const e = 0.5;
      const dcdx = (c(x + e, z) - c(x - e, z)) / (2 * e);
      const dcdz = (c(x, z + e) - c(x, z - e)) / (2 * e);
      th -= ((dcdx * Math.cos(th) - dcdz * Math.sin(th)) / c(x, z)) * ds;
      x += Math.sin(th) * ds;
      z += Math.cos(th) * ds;
    }
  }
  const n = found.length;
  // The chords' directions smoothed along the lanes (a biweight over about `keyRadius` m: two lanes a metre).
  const radius = Math.max(1, Math.round(LANE.keyRadius / LANE.spacing));
  const angle = new Float64Array(n);
  for (let k = 0; k < n; k += 1) {
    let sw = 0;
    let sa = 0;
    for (let m = Math.max(0, k - radius + 1); m <= Math.min(n - 1, k + radius - 1); m += 1) {
      const u = (m - k) / radius;
      const w = (1 - u * u) * (1 - u * u);
      sw += w;
      sa += w * found[m].angle;
    }
    angle[k] = sa / sw;
  }
  const lanes: LaneField = {
    count: n, stations: Math.ceil((LANE.back + LANE.faceReach + LANE.ahead) / LANE.step) + 1, baseX: new Float64Array(n), baseZ: new Float64Array(n),
    rayX: new Float64Array(n), rayZ: new Float64Array(n), sigma: new Float64Array(n), end: new Float64Array(n), toe: new Float64Array(n),
    throwAt: new Float64Array(n), platform: new Float64Array(n), reefCrest: new Float64Array(n), depth: new Float64Array(0),
  };
  const length = (lanes.stations - 1) * LANE.step;
  const place = (k: number) => {
    lanes.rayX[k] = Math.sin(angle[k]);
    lanes.rayZ[k] = Math.cos(angle[k]);
    lanes.baseX[k] = found[k].tx - LANE.back * lanes.rayX[k];
    lanes.baseZ[k] = found[k].tz - LANE.back * lanes.rayZ[k];
  };
  for (let k = 0; k < n; k += 1) {
    place(k);
    if (k === 0) continue;
    // Never across the lane before within the stations (a little either side): else parallel to it.
    const ax = lanes.baseX[k - 1], az = lanes.baseZ[k - 1], arx = lanes.rayX[k - 1], arz = lanes.rayZ[k - 1];
    const bx = lanes.baseX[k], bz = lanes.baseZ[k], brx = lanes.rayX[k], brz = lanes.rayZ[k];
    const den = arx * brz - arz * brx;
    if (Math.abs(den) > 1e-12) {
      const s = ((bx - ax) * brz - (bz - az) * brx) / den;
      const u = ((bx - ax) * arz - (bz - az) * arx) / den;
      if (s > -5 && s < length + 5 && u > -5 && u < length + 5) {
        angle[k] = angle[k - 1];
        place(k);
      }
    }
  }
  lanes.depth = new Float64Array(n * lanes.stations);
  for (let k = 0; k < n; k += 1) {
    let toe = Number.NaN;
    let throwAt = Number.NaN;
    let crest = Infinity;
    for (let j = 0; j < lanes.stations; j += 1) {
      const s = j * LANE.step;
      const d = depthAt(lanes.baseX[k] + s * lanes.rayX[k], lanes.baseZ[k] + s * lanes.rayZ[k]);
      lanes.depth[k * lanes.stations + j] = d;
      if (!(toe === toe) && s >= LANE.back - 10 && d < platformDepth - LANE.toeDepth) toe = s;
      if (toe === toe && !(throwAt === throwAt) && d <= LANE.throwDepth) throwAt = s;
      if (s >= LANE.back && !(throwAt === throwAt && s > throwAt + 10) && d < crest) crest = d;
    }
    lanes.toe[k] = toe === toe ? toe : LANE.back;
    lanes.throwAt[k] = throwAt === throwAt ? throwAt : Math.min(length, lanes.toe[k] + LANE.faceReach);
    lanes.platform[k] = platformDepth;
    lanes.reefCrest[k] = crest;
  }
  // Along the crest: each lane's place by the spacing of the toe points across the rays, from the first.
  for (let k = 1; k < n; k += 1) {
    const ax = lanes.baseX[k - 1] + lanes.toe[k - 1] * lanes.rayX[k - 1];
    const az = lanes.baseZ[k - 1] + lanes.toe[k - 1] * lanes.rayZ[k - 1];
    const bx = lanes.baseX[k] + lanes.toe[k] * lanes.rayX[k];
    const bz = lanes.baseZ[k] + lanes.toe[k] * lanes.rayZ[k];
    // Across the mean ray (its tangent, (rz, −rx)).
    const mx = 0.5 * (lanes.rayX[k - 1] + lanes.rayX[k]);
    const mz = 0.5 * (lanes.rayZ[k - 1] + lanes.rayZ[k]);
    const m = Math.sqrt(mx * mx + mz * mz);
    lanes.sigma[k] = lanes.sigma[k - 1] + Math.abs(((bx - ax) * mz - (bz - az) * mx) / m);
  }
  for (let k = 0; k < n; k += 1) {
    const u = Math.min(1, (lanes.sigma[k] - lanes.sigma[0]) / END_TAPER, (lanes.sigma[n - 1] - lanes.sigma[k]) / END_TAPER);
    lanes.end[k] = u <= 0 ? 0 : u * u * (3 - 2 * u);
  }
  return lanes;
}

/** A lane's still depth at s m along it, linear between stations. */
export function laneDepth(lanes: LaneField, k: number, s: number): number {
  const g = Math.min(lanes.stations - 1, Math.max(0, s / LANE.step));
  const j = Math.min(lanes.stations - 2, Math.floor(g));
  const u = g - j;
  const o = k * lanes.stations;
  return lanes.depth[o + j] + u * (lanes.depth[o + j + 1] - lanes.depth[o + j]);
}

/** The bed's slope along lane k from s to its throw point: the least-squares line through its stations' depths (falling depth, > 0). */
export function laneSlope(lanes: LaneField, k: number, s: number): number {
  const from = Math.max(0, Math.floor(s / LANE.step));
  const to = Math.min(lanes.stations - 1, Math.ceil(lanes.throwAt[k] / LANE.step));
  if (to - from < 2) return 0;
  let n = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let j = from; j <= to; j += 1) {
    const x = j * LANE.step;
    const y = lanes.depth[k * lanes.stations + j];
    n += 1;
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const den = n * sxx - sx * sx;
  return den > 0 ? -(n * sxy - sx * sy) / den : 0;
}

/** The sea's surface over still water at a point, m (dry: NaN), as the lanes read it. */
export type SeaLevel = (x: number, z: number) => number;

/** A followed crest on a lane. */
interface Track {
  s: number;
  height: number;
  H: number;
  t: number;
  speed: number;
  /** Its last reading's place, time, and the two rules' measures there (past the toe, m; 5 s less its foreseen time, s). */
  prevS: number;
  prevT: number;
  prevPast: number;
  prevLead: number;
  prevHeight: number;
  prevH: number;
  /** When it crossed its toe, s (NaN: not yet); it has handed over. */
  toeAt: number;
  handed: boolean;
  seen: number;
}

/** One lane's raw hand-over moment, before the fit. */
export interface RawHandover {
  lane: number;
  t: number;
  /** The crest's place past the toe, m; its height over still water and over the trough ahead (`CREST.trough`), m. */
  past: number;
  height: number;
  H: number;
  /** The time since it crossed the toe, s (0: handed over at the toe). */
  sinceToe: number;
  /** Which rule came later: the toe (true) or the 5 s foresight. */
  atToe: boolean;
}

/** A lane's fitted hand-over: its state for the library, and where it stands. */
export interface FittedHandover {
  lane: number;
  /** t_h, s; the crest's place along the lane at it, m; the trough-to-crest height and the crest over still water, m. */
  time: number;
  s: number;
  H: number;
  height: number;
  /** The share of the toe's clock in its phase (1 at the toe, 0 from `TOE_COURSE` m up the face). */
  toeShare: number;
  sinceToe: number;
  /** Raws within the clock's radius that it was fitted from, and whether the lane read its own. */
  from: number;
  own: boolean;
  state: HandoverState;
}

/** The face distance over which the clock moves from the toe's to the H/d match's, m (the step 3 build's, provisional). */
export const TOE_COURSE = 10;

/**
 * Follows the sea's crests along the lanes, finds each lane's raw hand-over (ruling 31's rule), and fits them along the
 * lanes into hand-overs for the library. `read` every `every` s; `due` hand-overs come back from `fitted`.
 */
export class HandoverTracker {
  private readonly tracks: Track[][];
  private raws: RawHandover[] = [];
  /** Per lane: the last fitted hand-over's time, s (one per wave). */
  private readonly lastFitted: Float64Array;
  private readonly eta: Float64Array;
  /** Raw moments read so far, and lanes fitted without their own (a diagnostic). */
  readonly stats = { raws: 0, fitted: 0, borrowed: 0, atToe: 0 };

  constructor(readonly lanes: LaneField, readonly period: number) {
    this.tracks = Array.from({ length: lanes.count }, () => []);
    this.lastFitted = new Float64Array(lanes.count).fill(-Infinity);
    this.eta = new Float64Array(lanes.stations);
  }

  /**
   * Read the sea along every lane at `time` s and note the raw hand-overs that came since the last reading; `station`,
   * when given, reads lane k's station j (the same sea, from stored cells).
   */
  read(time: number, sea: SeaLevel, station?: (k: number, j: number) => number): void {
    const { lanes } = this;
    // Every second station (0.5 m) from the lane's base to just past its throw point.
    const step = 2;
    for (let k = 0; k < lanes.count; k += 1) {
      const last = Math.min(lanes.stations - 1, Math.ceil(lanes.throwAt[k] / LANE.step) + 4);
      const eta = this.eta;
      if (station) for (let j = 0; j <= last; j += step) eta[j] = station(k, j);
      else for (let j = 0; j <= last; j += step) eta[j] = sea(lanes.baseX[k] + j * LANE.step * lanes.rayX[k], lanes.baseZ[k] + j * LANE.step * lanes.rayZ[k]);
      this.followCrests(k, time, last, step);
    }
    // Raws older than the fits need are dropped.
    this.raws = this.raws.filter((r) => time - r.t < 2 * LANE.sameWave);
  }

  private followCrests(k: number, time: number, last: number, step: number): void {
    const { lanes, eta } = this;
    const ds = LANE.step * step;
    const top = Math.round(CREST.top / ds);
    const trough = Math.round(CREST.trough / ds);
    const tracks = this.tracks[k];
    const found: { s: number; height: number; H: number }[] = [];
    for (let j = top * step; j + top * step <= last; j += step) {
      const v = eta[j];
      if (!(v === v)) continue;
      // The highest within ±`CREST.top` m (the first of equals), every station there wet.
      let isTop = eta[j - step] < v;
      for (let m = j - top * step; isTop && m <= j + top * step; m += step) if (!(eta[m] <= v)) isTop = false;
      if (!isTop) continue;
      let low = Infinity;
      for (let m = j + step; m <= Math.min(last, j + trough * step); m += step) if (eta[m] < low) low = eta[m];
      if (!(v - low >= CREST.least)) continue;
      // The top's place within its stations: the parabola through three.
      const a = eta[j - step];
      const b = eta[j + step];
      const den = a - 2 * v + b;
      const shift = den < 0 ? Math.min(0.5, Math.max(-0.5, (0.5 * (a - b)) / den)) : 0;
      found.push({ s: (j + shift * step) * LANE.step, height: v - 0.125 * (a - b) * shift, H: v - low });
    }
    // Match each found crest to a track: nearest to its foreseen place, within reach ahead or a little behind.
    const used = new Uint8Array(found.length);
    for (const track of tracks) {
      const dt = time - track.t;
      const want = track.s + track.speed * dt;
      let best = -1;
      let gap = Infinity;
      for (let f = 0; f < found.length; f += 1) {
        if (used[f]) continue;
        const d = found[f].s - want;
        if (d < -CREST.behind || d > CREST.reach) continue;
        if (Math.abs(d) < gap) { gap = Math.abs(d); best = f; }
      }
      if (best < 0) continue;
      used[best] = 1;
      const f = found[best];
      track.prevS = track.s;
      track.prevT = track.t;
      track.prevHeight = track.height;
      track.prevH = track.H;
      track.prevPast = track.s - lanes.toe[k];
      track.prevLead = LANE.foresight - this.foresee(k, track.s, track.height);
      const speed = dt > 0 ? (f.s - track.s) / dt : track.speed;
      track.speed = Math.min(12, Math.max(2, 0.7 * track.speed + 0.3 * speed));
      track.s = f.s;
      track.height = f.height;
      track.H = f.H;
      track.t = time;
      track.seen = time;
    }
    for (let f = 0; f < found.length; f += 1) {
      if (used[f]) continue;
      const c = found[f];
      // A new crest only on the platform, seaward of the toe: later finds are its own crest found again.
      if (c.s > lanes.toe[k] - 2) continue;
      const lead = LANE.foresight - this.foresee(k, c.s, c.height);
      tracks.push({
        s: c.s, height: c.height, H: c.H, t: time, speed: Math.sqrt(GRAVITY * (lanes.platform[k] + c.height)),
        prevS: c.s, prevT: time, prevPast: c.s - lanes.toe[k], prevLead: lead, prevHeight: c.height, prevH: c.H,
        toeAt: Number.NaN, handed: false, seen: time,
      });
    }
    // Each track's toe crossing and hand-over: the later of the two rules, at the reading the later one came true,
    // its time and state interpolated between the two readings.
    for (const track of tracks) {
      if (track.t !== time || track.prevT === time) continue;
      const past = track.s - lanes.toe[k];
      const lead = LANE.foresight - this.foresee(k, track.s, track.height);
      const span = track.t - track.prevT;
      const when = (before: number, after: number) => (after > before ? track.prevT + span * Math.min(1, Math.max(0, (0 - before) / (after - before))) : track.t);
      if (!(track.toeAt === track.toeAt) && past >= 0) track.toeAt = track.prevPast >= 0 ? track.prevT : when(track.prevPast, past);
      if (track.handed || !(past >= 0 && lead >= 0)) continue;
      const toeTime = track.prevPast >= 0 ? -Infinity : when(track.prevPast, past);
      const leadTime = track.prevLead >= 0 ? -Infinity : when(track.prevLead, lead);
      const t = Math.max(toeTime, leadTime, track.prevT);
      const u = span > 0 ? (t - track.prevT) / span : 1;
      track.handed = true;
      const atToe = toeTime >= leadTime;
      this.raws.push({
        lane: k, t, past: track.prevS + u * (track.s - track.prevS) - lanes.toe[k],
        height: track.prevHeight + u * (track.height - track.prevHeight), H: track.prevH + u * (track.H - track.prevH),
        sinceToe: atToe ? 0 : Math.max(0, t - (track.toeAt === track.toeAt ? track.toeAt : t)), atToe,
      });
      this.stats.raws += 1;
      if (atToe) this.stats.atToe += 1;
    }
    // Lost tracks, and tracks past their lane's throw point, go.
    for (let i = tracks.length - 1; i >= 0; i -= 1) {
      if (time - tracks[i].seen > CREST.lost || tracks[i].s > lanes.throwAt[k]) tracks.splice(i, 1);
    }
  }

  /** The foreseen time from s along lane k to its throw point at a crest `height` m high: Σ ds / √(g (d + η)), s. */
  private foresee(k: number, s: number, height: number): number {
    const { lanes } = this;
    const end = lanes.throwAt[k];
    if (s >= end) return 0;
    let t = 0;
    const step = 4 * LANE.step;
    for (let x = s; x < end; x += step) {
      const d = laneDepth(lanes, k, Math.min(end, x + 0.5 * step));
      t += Math.min(step, end - x) / Math.sqrt(GRAVITY * Math.max(0.1, d + height));
    }
    return t;
  }

  /**
   * The lanes whose hand-over is due at `time` s, fitted along the lanes. A lane is due `LANE.wait` s after its own raw
   * moment; one whose crest was not read (a lost track) borrows its neighbours' once both sides within the clock's
   * radius have read theirs and waited too. One per lane per wave (`LANE.newWave` apart). The fit uses only one wave's
   * raws (within `LANE.sameWave` s of the moment) and is clamped to their values (sliceClock's `fitAlong` rule).
   */
  fitted(time: number, period: number): FittedHandover[] {
    const { lanes } = this;
    const out: FittedHandover[] = [];
    const radius = LANE.clockRadius;
    const keys = LANE.keyRadius;
    const fresh = (r: RawHandover, k: number) => r.t - this.lastFitted[k] > LANE.newWave * period;
    for (let k = 0; k < lanes.count; k += 1) {
      let moment = Number.NaN;
      let own = false;
      for (const r of this.raws) {
        if (r.lane === k && fresh(r, k)) { moment = r.t; own = true; break; }
      }
      if (own && time - moment < LANE.wait) continue;
      if (!own) {
        // Borrowed: both sides read, and all of them waited.
        let left = false;
        let right = false;
        let newest = -Infinity;
        let sum = 0;
        let count = 0;
        for (const r of this.raws) {
          const d = lanes.sigma[r.lane] - lanes.sigma[k];
          if (Math.abs(d) >= radius || !fresh(r, k)) continue;
          if (d < 0) left = true;
          if (d > 0) right = true;
          newest = Math.max(newest, r.t);
          sum += r.t;
          count += 1;
        }
        if (!(left && right) || time - newest < 2 * LANE.wait) continue;
        moment = sum / count;
      }
      const near = this.raws.filter((r) => Math.abs(r.t - moment) < LANE.sameWave && fresh(r, k) && Math.abs(lanes.sigma[r.lane] - lanes.sigma[k]) < keys);
      const t = fitLine(near, lanes, k, radius, (r) => r.t);
      if (!(t === t)) continue;
      const past = fitLine(near, lanes, k, radius, (r) => r.past);
      const H = fitLine(near, lanes, k, keys, (r) => r.H);
      const height = fitLine(near, lanes, k, keys, (r) => r.height);
      const since = Math.max(0, fitLine(near, lanes, k, radius, (r) => r.sinceToe));
      const s = lanes.toe[k] + past;
      const d = laneDepth(lanes, k, s);
      const u = Math.min(1, Math.max(0, past / TOE_COURSE));
      const toeShare = 1 - u * u * (3 - 2 * u);
      const unit = Math.sqrt(lanes.platform[k] / GRAVITY);
      const state: HandoverState = {
        heightOverDepth: H / d, period: period * Math.sqrt(GRAVITY / d), slope: laneSlope(lanes, k, s),
        reefDepth: lanes.reefCrest[k] / lanes.platform[k], depth: d, time: t,
        ...(toeShare > 0 ? { toe: { since: since / unit, share: toeShare } } : {}),
      };
      this.lastFitted[k] = t;
      this.stats.fitted += 1;
      if (!own) this.stats.borrowed += 1;
      out.push({ lane: k, time: t, s, H, height, toeShare, sinceToe: since, from: near.length, own, state });
    }
    return out;
  }

  exportState(): HandoverTrackerState {
    return { tracks: this.tracks.map((list) => list.map((t) => ({ ...t, toeAt: t.toeAt === t.toeAt ? t.toeAt : null }))), raws: this.raws.map((r) => ({ ...r })), lastFitted: Array.from(this.lastFitted, (v) => (v === -Infinity ? null : v)) };
  }

  importState(state: HandoverTrackerState): void {
    if (state.tracks.length !== this.tracks.length) throw new Error('A hand-over state from another lane field');
    state.tracks.forEach((list, k) => {
      this.tracks[k] = list.map((t) => ({ ...t, toeAt: t.toeAt ?? Number.NaN }));
    });
    this.raws = state.raws.map((r) => ({ ...r }));
    state.lastFitted.forEach((v, k) => { this.lastFitted[k] = v ?? -Infinity; });
  }
}

export interface HandoverTrackerState {
  tracks: Array<Array<Omit<Track, 'toeAt'> & { toeAt: number | null }>>;
  raws: RawHandover[];
  lastFitted: Array<number | null>;
}

/**
 * The biweight-weighted line through the raws' values along the lanes, at lane k (radius m): sliceClock's `fitAlong`
 * rule, the mean where the raws bunch; NaN with none in reach.
 */
export function fitLine(raws: readonly RawHandover[], lanes: LaneField, k: number, radius: number, value: (r: RawHandover) => number): number {
  const centre = lanes.sigma[k];
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let t0 = 0;
  let t1 = 0;
  let low = Infinity;
  let high = -Infinity;
  for (const r of raws) {
    const d = lanes.sigma[r.lane] - centre;
    if (Math.abs(d) >= radius) continue;
    const v = value(r);
    if (!(v === v)) continue;
    const u = d / radius;
    const w = (1 - u * u) * (1 - u * u);
    s0 += w;
    s1 += w * d;
    s2 += w * d * d;
    t0 += w * v;
    t1 += w * d * v;
    if (v < low) low = v;
    if (v > high) high = v;
  }
  if (!(s0 > 0)) return Number.NaN;
  const mean = t0 / s0;
  const spread = s2 / s0 - (s1 / s0) * (s1 / s0);
  if (spread < 0.1) return mean;
  // Clamped to the window's own values: a one-sided window never extrapolates past them.
  return Math.min(high, Math.max(low, (s2 * t0 - s1 * t1) / (s0 * s2 - s1 * s1)));
}
