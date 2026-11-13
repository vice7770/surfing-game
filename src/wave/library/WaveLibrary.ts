import { GRAVITY } from '../dispersion';
import { PATH, PATH_COLUMNS, WAVE_POINTS, type WaveCase } from './caseFormat';

/**
 * C2's wave library (step 1b, 2026-11-13; docs/research/wave-strategy-alternatives/c2-plan.md §1 and c2-step1b.md): the
 * whole breaking wave from the Basilisk cases (BRL3, `caseFormat.ts`), picked by the slice's own state at the hand-over
 * and blended over continuous keys. Nothing in the running game uses it yet (C2 step 3 wires it).
 *
 * - **Arc joins.** c2_library.py spaces every frame by arc between its landmarks (back, crest, lip, throat, toe, front)
 *   along the run's own fine surface, and before the throw puts the lip and throat at fixed shares of the crest-to-toe
 *   arc (ruling 19). So the same index is the same share of the same piece of the curve in every frame, and the library
 *   joins frames index to index, in time and across cases: a join by arc between landmarks, without the folds of
 *   today's point-by-point join of frames whose lip mark slides (rulings 19 and 20). Each "refill" frame is rebuilt the
 *   same way from its nearest "own" frames on the same side of the throw. The reader does not respace the 128 points
 *   again along their own polyline: that cuts the corners of the stored curve (measured on the level-12 cases: up to
 *   0.4 m in the open tube, 0.8 m in the bore; c2-step1b.md).
 * - **State matching.** At the hand-over a slice gives H/d_h, T √(g/d_h), the bed's slope along its ray and the reef
 *   crest's depth HS/h0. In each case the library finds τ_h where the case's H/d matches (on its path table, smoothed and
 *   made monotone), and so the depth there, d̂(τ_h). The keys are bracketed: the slope among the cases' slopes, then HS/h0
 *   among the beds at each slope, then, within a bed, the A0 cases by the slice's period: each case's (H/d, d̂ × (T̄/T)²)
 *   at its τ_h is a point, and the slice's (H/d_h, (T̄/P)²) is projected onto the line through them. Weights multiply.
 *   Outside the cases every key clamps and says so (`Match.clamp`). The slice's scale is h0 = d_h / Σ w d̂(τ_h).
 * - **Time.** Each slice is then a pure function of time. Its cases throw together: each runs from its own τ_h to its
 *   throw at the rate (−τ_h,i)/Δ, Δ = Σ w (−τ_h), and on from its throw at rate 1, in units of √(h0/g). So the slice's
 *   throw is at t_h + Δ √(h0/g), and with one case τ(t) = τ_h + (t − t_h)/√(h0/g) exactly.
 * - **Determinism.** Only + − × ÷ and √ (with floor, min, max and abs): the same inputs give the same bytes on every
 *   client, as `ProfileLibrary`.
 *
 * Lengths of a slice are in metres along its ray, from the slice's crest at the hand-over; heights from still water.
 */

const FLOATS = 2 * WAVE_POINTS;
/** The path's smoothing before matching, ±τ (c2_library.py's check uses the same). */
const MATCH_SMOOTH = 0.25;
/** At most this many cases blend into one slice (2 slopes × 2 reef depths × 2 A0). */
export const MAX_BLEND = 8;

/** A case's path, as the matching reads it: τ, the still depth under the crest d (h0) and H/d, per frame. */
export interface CasePath {
  id: string;
  a0: number;
  slope: number;
  reefDepth: number;
  /** The train's period, √(h0/g). */
  period: number;
  tau: Float64Array;
  d: Float64Array;
  Hd: Float64Array;
}

/** A slice's state at the hand-over. */
export interface HandoverState {
  /** The sea's H over the still depth under its crest. */
  heightOverDepth: number;
  /** T √(g/d_h): the period over the time scale of the still depth under the crest. */
  period: number;
  /** The bed's slope along the ray, and the reef crest's depth over h0. */
  slope: number;
  reefDepth: number;
  /** d_h, m, and the hand-over's time t_h, s. */
  depth: number;
  time: number;
  /**
   * Ruling 31 (C2 step 3): the clock from the reef's toe. On the flat platform H/d does not change, so it cannot place a
   * clock: a slice handed over where its crest crossed the toe takes each case's clock from where that case's own crest
   * crosses its toe (`StateMatcher.toeTau`), plus `since`, the time since the slice's crest crossed it, in √(d_toe/g)
   * (0 at the toe itself), and that case's H/d there places it on the A0 axis. `share` (0–1) is how much of the clock
   * is the toe's: 1 at the toe, falling to 0 a little way up the face, where H/d matching takes over, so neighbouring
   * slices handed over by the two rules never step apart (the step 3 build's choice). Absent: H/d alone, as before.
   */
  toe?: { since: number; share: number };
}

/** How a key fell among the cases: inside them, below or above them, or only one value there (not a key yet). */
export type KeyClamp = 'in' | 'low' | 'high' | 'one';

export interface CaseWeight {
  case: number;
  weight: number;
  /** τ where the case's H/d matches the slice's, and the still depth there, h0. */
  tauH: number;
  depth: number;
  /** −1: the slice's H/d is under the case's at its first frame; 1: over it at its throw; 0: matched. */
  tauClamp: -1 | 0 | 1;
}

export interface Match {
  cases: CaseWeight[];
  /** The slice's scale, m: d_h / Σ w d̂(τ_h). */
  h0: number;
  /** Σ w (−τ_h): the time from the hand-over to the throw, √(h0/g). */
  toThrow: number;
  clamp: { slope: KeyClamp; reefDepth: KeyClamp; a0: KeyClamp };
  /** Σ over the slope levels used of their weight × |HS/h0 − the bed's|: how far the reef depth is from what was blended. */
  reefOff: number;
  /** The A0 weight that fell outside its cases (the low and high clamps' share of the slice's weight). */
  a0Low: number;
  a0High: number;
  /**
   * The slice's A0 read off its cases': linear in the weight along each bed's chosen pair, and on past the ends where it
   * clamped (so under the smallest case's A0 it says by how much; a diagnostic, not used).
   */
  a0Key: number;
}

interface Bracket { lo: number; hi: number; w: number; clamp: KeyClamp }

function bracket(values: readonly number[], q: number): Bracket {
  const n = values.length;
  if (n === 1) return { lo: 0, hi: 0, w: 0, clamp: q === values[0] ? 'in' : 'one' };
  if (!(q > values[0])) return { lo: 0, hi: 0, w: 0, clamp: q < values[0] ? 'low' : 'in' };
  if (!(q < values[n - 1])) return { lo: n - 1, hi: n - 1, w: 0, clamp: q > values[n - 1] ? 'high' : 'in' };
  for (let k = 0; k + 1 < n; k += 1) {
    if (values[k] <= q && q <= values[k + 1]) return { lo: k, hi: k + 1, w: (q - values[k]) / (values[k + 1] - values[k]), clamp: 'in' };
  }
  return { lo: 0, hi: 0, w: 0, clamp: 'low' };
}

/** One case's matching table: its path's H/d, smoothed and made monotone (a running maximum) up to the throw. */
interface MatchTable { last: number; envelope: Float64Array }

/**
 * Where a case's crest leaves its flat platform (ruling 31): the still depth under it first falls this far under the
 * platform's, h0. The cases' platform is h0 deep; the knee is sharp in their beds, so 0.002 h0 (1 cm at 5 m) is its toe.
 */
export const TOE_DEPTH = 0.002;

function matchTable(p: CasePath): MatchTable {
  let last = -1;
  for (let k = 0; k < p.tau.length; k += 1) if (p.tau[k] <= 0) last = k;
  if (last < 0) last = 0;
  const envelope = new Float64Array(last + 1);
  let top = Number.NEGATIVE_INFINITY;
  for (let k = 0; k <= last; k += 1) {
    let sum = 0;
    let n = 0;
    for (let j = k; j >= 0 && p.tau[k] - p.tau[j] <= MATCH_SMOOTH + 1e-9; j -= 1) { sum += p.Hd[j]; n += 1; }
    for (let j = k + 1; j <= last && p.tau[j] - p.tau[k] <= MATCH_SMOOTH + 1e-9; j += 1) { sum += p.Hd[j]; n += 1; }
    const smooth = sum / n;
    if (smooth > top) top = smooth;
    envelope[k] = top;
  }
  return { last, envelope };
}

/**
 * The state matching alone, on the cases' paths (`CasePath`): which cases a slice blends, by how much, from which τ, and
 * at what scale. `WaveLibrary` holds one; a coverage study can build one from paths without frames.
 */
/**
 * C2 step 3b: the A0 polyline's segments share the weights where their gaps differ by less than this share of their
 * length (`StateMatcher.match`); 0 keeps the nearest segment alone (step 3's rule).
 */
export const A0_SWITCH = 0.25;
const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

export class StateMatcher {
  readonly paths: readonly CasePath[];
  /** The segments' shared band (`A0_SWITCH`; a probe may set 0 for step 3's nearest segment alone). */
  a0Switch: number = A0_SWITCH;
  private segU = new Float64Array(8);
  private segGap = new Float64Array(8);
  private segLength = new Float64Array(8);
  /** Per slope level (ascending), per reef depth (ascending), the cases' indices by A0 (ascending). */
  private readonly slopes: number[];
  private readonly reefs: number[][];
  private readonly beds: number[][][];
  private readonly tables: MatchTable[];
  /** The period the depth axis is scaled by: the cases' mean period, √(h0/g). */
  readonly periodRef: number;
  /**
   * Per case, τ where its crest crosses its toe (ruling 31; `TOE_DEPTH`), linear between frames; its first frame's τ
   * where its crest is already past it there (`toeClamp` −1), its throw's where it never leaves the platform before it.
   */
  readonly toeTau: Float64Array;
  private readonly toeClamp: Int8Array;

  constructor(paths: readonly CasePath[]) {
    if (paths.length === 0) throw new Error('StateMatcher: no case');
    this.paths = paths;
    this.tables = paths.map(matchTable);
    const order = paths.map((_, i) => i).sort((a, b) => paths[a].slope - paths[b].slope || paths[a].reefDepth - paths[b].reefDepth || paths[a].a0 - paths[b].a0 || (paths[a].id < paths[b].id ? -1 : paths[a].id > paths[b].id ? 1 : 0));
    this.slopes = [];
    this.reefs = [];
    this.beds = [];
    for (const i of order) {
      const p = paths[i];
      let s = this.slopes.indexOf(p.slope);
      if (s < 0) { this.slopes.push(p.slope); this.reefs.push([]); this.beds.push([]); s = this.slopes.length - 1; }
      let r = this.reefs[s].indexOf(p.reefDepth);
      if (r < 0) { this.reefs[s].push(p.reefDepth); this.beds[s].push([]); r = this.reefs[s].length - 1; }
      this.beds[s][r].push(i);
    }
    let sum = 0;
    for (const p of paths) sum += p.period;
    this.periodRef = sum / paths.length;
    this.toeTau = new Float64Array(paths.length);
    this.toeClamp = new Int8Array(paths.length);
    paths.forEach((p, i) => {
      const { last } = this.tables[i];
      const floor = 1 - TOE_DEPTH;
      if (!(p.d[0] > floor)) {
        this.toeTau[i] = p.tau[0];
        this.toeClamp[i] = -1;
        return;
      }
      let k = 1;
      while (k <= last && p.d[k] > floor) k += 1;
      if (k > last) {
        this.toeTau[i] = p.tau[last];
        this.toeClamp[i] = 1;
        return;
      }
      const u = (p.d[k - 1] - floor) / (p.d[k - 1] - p.d[k]);
      this.toeTau[i] = p.tau[k - 1] + u * (p.tau[k] - p.tau[k - 1]);
    });
  }

  /** Case i's clock at its toe (ruling 31): its τ there, the still depth there, and whether it clamped; its H/d there. */
  matchToe(i: number): { tau: number; depth: number; clamp: -1 | 0 | 1; hd: number } {
    const tau = this.toeTau[i];
    return { tau, depth: this.depthAt(i, tau), clamp: this.toeClamp[i] as -1 | 0 | 1, hd: this.envelopeAt(i, tau) };
  }

  /** Case i's smoothed, monotone H/d at τ (its matching table), linear between frames, held at its ends. */
  envelopeAt(i: number, tau: number): number {
    const p = this.paths[i];
    const { last, envelope } = this.tables[i];
    if (!(tau > p.tau[0])) return envelope[0];
    if (!(tau < p.tau[last])) return envelope[last];
    let k = 0;
    while (k + 1 < last && p.tau[k + 1] <= tau) k += 1;
    const u = (tau - p.tau[k]) / (p.tau[k + 1] - p.tau[k]);
    return envelope[k] + u * (envelope[k + 1] - envelope[k]);
  }

  /** τ_h in case i where its smoothed, monotone H/d first reaches `hd`; the depth there; and whether it clamped. */
  matchCase(i: number, hd: number): { tau: number; depth: number; clamp: -1 | 0 | 1 } {
    const p = this.paths[i];
    const { last, envelope } = this.tables[i];
    let tau: number;
    let clamp: -1 | 0 | 1 = 0;
    if (!(hd > envelope[0])) {
      tau = p.tau[0];
      if (hd < envelope[0]) clamp = -1;
    } else if (!(hd <= envelope[last])) {
      tau = p.tau[last];
      clamp = 1;
    } else {
      let k = 1;
      while (k < last && envelope[k] < hd) k += 1;
      const u = (hd - envelope[k - 1]) / (envelope[k] - envelope[k - 1]);
      tau = p.tau[k - 1] + u * (p.tau[k] - p.tau[k - 1]);
    }
    return { tau, depth: this.depthAt(i, tau), clamp };
  }

  /** The still depth under case i's crest at τ, h0, linear between its frames. */
  depthAt(i: number, tau: number): number {
    const p = this.paths[i];
    const n = p.tau.length;
    if (!(tau > p.tau[0])) return p.d[0];
    if (!(tau < p.tau[n - 1])) return p.d[n - 1];
    let k = 0;
    while (k + 2 < n && p.tau[k + 1] <= tau) k += 1;
    const u = (tau - p.tau[k]) / (p.tau[k + 1] - p.tau[k]);
    return p.d[k] + u * (p.d[k + 1] - p.d[k]);
  }

  match(state: HandoverState): Match {
    const hd = state.heightOverDepth;
    const ref = this.periodRef;
    const yq = (ref * ref) / (state.period * state.period);
    const byCase = new Map<number, CaseWeight>();
    const s = bracket(this.slopes, state.slope);
    let reefClamp: KeyClamp = 'in';
    let a0Clamp: KeyClamp = 'in';
    let reefOff = 0;
    let a0Low = 0;
    let a0High = 0;
    let a0Key = 0;
    const worse = (a: KeyClamp, b: KeyClamp): KeyClamp => (a === 'low' || a === 'high' ? a : b === 'low' || b === 'high' ? b : a === 'one' ? a : b);
    const levels: Array<[number, number]> = s.lo === s.hi ? [[s.lo, 1]] : [[s.lo, 1 - s.w], [s.hi, s.w]];
    for (const [level, ws] of levels) {
      if (!(ws > 0)) continue;
      const reefs = this.reefs[level];
      const r = bracket(reefs, state.reefDepth);
      reefClamp = worse(reefClamp, r.clamp);
      const beds: Array<[number, number]> = r.lo === r.hi ? [[r.lo, 1]] : [[r.lo, 1 - r.w], [r.hi, r.w]];
      for (const [bed, wr] of beds) {
        if (!(wr > 0)) continue;
        reefOff += ws * wr * Math.abs(state.reefDepth - reefs[bed]);
        const members = this.beds[level][bed];
        // Each case's point: its H/d at τ_h (the slice's where it matched, its envelope's end where it clamped) and its
        // depth axis, d̂(τ_h) (T̄/T)².
        const points = members.map((i) => {
          const T = this.paths[i].period;
          const byHd = this.matchCase(i, hd);
          const { last, envelope } = this.tables[i];
          const hdX = byHd.clamp === 0 ? hd : byHd.clamp < 0 ? envelope[0] : envelope[last];
          const share = state.toe ? Math.min(1, Math.max(0, state.toe.share)) : 0;
          if (!(share > 0)) return { i, m: byHd, x: hdX, y: (byHd.depth * ref * ref) / (T * T) };
          // Ruling 31: the clock from the case's own toe, the time since the slice's crest crossed it added; its H/d
          // there on the A0 axis. Within the share's course, blended with the H/d match.
          const toe = this.matchToe(i);
          const p = this.paths[i];
          const tauToe = Math.min(p.tau[last], Math.max(p.tau[0], toe.tau + state.toe!.since));
          const tau = tauToe + (1 - share) * (byHd.tau - tauToe);
          const clamp = share >= 0.5 ? (toe.clamp !== 0 ? toe.clamp : tauToe <= p.tau[0] ? -1 : tauToe >= p.tau[last] ? 1 : 0) : byHd.clamp;
          const m = { tau, depth: this.depthAt(i, tau), clamp };
          return { i, m, x: this.envelopeAt(i, tauToe) + (1 - share) * (hdX - this.envelopeAt(i, tauToe)), y: (m.depth * ref * ref) / (T * T) };
        });
        let a0: KeyClamp = 'in';
        let lo = 0;
        let w = 0;
        let wRaw = 0;
        // Each segment's projection (its share u along it, its gap to the slice's point, its length).
        const segments = Math.max(0, points.length - 1);
        if (this.segU.length < segments) {
          this.segU = new Float64Array(2 * segments);
          this.segGap = new Float64Array(2 * segments);
          this.segLength = new Float64Array(2 * segments);
        }
        if (points.length === 1) {
          a0 = 'one';
        } else {
          let best = Number.POSITIVE_INFINITY;
          for (let k = 0; k + 1 < points.length; k += 1) {
            const ax = points[k].x, ay = points[k].y;
            const ex = points[k + 1].x - ax, ey = points[k + 1].y - ay;
            const len = ex * ex + ey * ey;
            const raw = len > 0 ? ((hd - ax) * ex + (yq - ay) * ey) / len : 0;
            const u = Math.min(1, Math.max(0, raw));
            const gx = ax + u * ex - hd, gy = ay + u * ey - yq;
            const gap = gx * gx + gy * gy;
            this.segU[k] = u;
            this.segGap[k] = Math.sqrt(gap);
            this.segLength[k] = Math.sqrt(len);
            if (gap < best) {
              best = gap;
              lo = k;
              w = u;
              wRaw = raw;
              a0 = k === 0 && raw < 0 ? 'low' : k === points.length - 2 && raw > 1 ? 'high' : 'in';
            }
          }
        }
        a0Clamp = worse(a0Clamp, a0);
        // The slice's A0 by the cases' own, linear along the chosen segment and on past its ends (a diagnostic).
        const a0Of = (k: number) => this.paths[points[k].i].a0;
        a0Key += ws * wr * (points.length === 1 ? a0Of(0) : a0Of(lo) + wRaw * (a0Of(lo + 1) - a0Of(lo)));
        if (a0 === 'low') a0Low += ws * wr;
        if (a0 === 'high') a0High += ws * wr;
        const picks: Array<[number, number]> = points.length === 1 ? [[0, 1]] : [[lo, 1 - w], [lo + 1, w]];
        if (points.length > 2 && this.a0Switch > 0) {
          // C2 step 3b (ruling 32, point 2): the nearest segment alone can switch between neighbouring slices off the
          // polyline (inside a bend both segments' projections are near), and the weights then jump. Every segment
          // within `A0_SWITCH` of its length of the nearest one's gap shares in, by a smoothstep on the gap's excess, so
          // the weights are continuous across the switch (the nearest alone wherever no other is that near).
          picks.length = 0;
          let total = 0;
          const gapLo = this.segGap[lo];
          for (let k = 0; k < segments; k += 1) {
            const span = this.a0Switch * Math.min(this.segLength[k], this.segLength[lo]);
            const b = k === lo ? 1 : span > 0 ? 1 - smooth((this.segGap[k] - gapLo) / span) : 0;
            if (!(b > 0)) continue;
            total += b;
            picks.push([k, -b], [k + 1, -b]);
          }
          for (let m = 0; m < picks.length; m += 2) {
            const k = picks[m][0];
            const b = -picks[m][1] / total;
            picks[m][1] = b * (1 - this.segU[k]);
            picks[m + 1][1] = b * this.segU[k];
          }
        }
        for (const [k, wa] of picks) {
          const weight = ws * wr * wa;
          if (!(weight > 0)) continue;
          const pt = points[k];
          const had = byCase.get(pt.i);
          if (had) had.weight += weight;
          else byCase.set(pt.i, { case: pt.i, weight, tauH: pt.m.tau, depth: pt.m.depth, tauClamp: pt.m.clamp });
        }
      }
    }
    const cases = [...byCase.values()].sort((a, b) => a.case - b.case);
    let depth = 0;
    let toThrow = 0;
    for (const c of cases) {
      depth += c.weight * c.depth;
      toThrow += c.weight * (0 - c.tauH);
    }
    return {
      cases, h0: state.depth / depth, toThrow, clamp: { slope: s.clamp, reefDepth: reefClamp, a0: a0Clamp }, reefOff, a0Low, a0High, a0Key,
    };
  }
}

/** A case as the library holds it: its frames (the refill frames rebuilt), its velocity filled, its path. */
export interface LibraryCase {
  case: WaveCase;
  id: string;
  count: number;
  tauStart: number;
  tauStep: number;
  touchdown: number;
  /** count × 128 (x, y), h0: as stored, the refill frames rebuilt. */
  frames: Float32Array;
  /** count × 128 × depths × (u, v), √(g h0): every missing sample filled (`filledVelocity` counts them). */
  velocity: Float32Array;
  depths: Float64Array;
  crestX: Float64Array;
  crestY: Float64Array;
  path: CasePath;
  /** How many frames were rebuilt from their neighbours, and how many velocity samples were filled. */
  refilled: number;
  filledVelocity: number;
}

/** Fill a series' NaNs linearly from the nearest numbers each side (the nearest one at the ends; 0 with none at all). */
function fillSeries(v: Float64Array): void {
  const n = v.length;
  let prev = -1;
  for (let k = 0; k < n; k += 1) {
    if (v[k] === v[k]) { prev = k; continue; }
    let next = k + 1;
    while (next < n && v[next] !== v[next]) next += 1;
    for (let j = k; j < next && j < n; j += 1) {
      v[j] = prev < 0 && next >= n ? 0 : prev < 0 ? v[next] : next >= n ? v[prev] : v[prev] + ((j - prev) / (next - prev)) * (v[next] - v[prev]);
    }
    k = next - 1;
  }
}

/** The case's frames, its refill frames rebuilt from the nearest own frames (the same side of τ = 0 first), its velocity filled. */
function prepareFrames(c: WaveCase): { frames: Float32Array; velocity: Float32Array; refilled: number; filled: number } {
  const h = c.header;
  const count = h.frames;
  const nd = h.velocityDepths.length;
  const vf = WAVE_POINTS * nd * 2;
  const frames = c.frames.slice();
  const velocity = c.velocity.slice();
  const tauOf = (k: number) => h.tauStart + k * h.tauStep;
  const own = (k: number) => c.use[k] === 1 && frames[k * FLOATS] === frames[k * FLOATS];
  const nearest = (k: number, dir: 1 | -1, sameSide: boolean) => {
    const pre = tauOf(k) < 0;
    for (let j = k + dir; j >= 0 && j < count; j += dir) if (own(j) && (!sameSide || (tauOf(j) < 0) === pre)) return j;
    return -1;
  };
  let refilled = 0;
  const source = frames.slice();
  for (let k = 0; k < count; k += 1) {
    if (own(k)) continue;
    refilled += 1;
    let a = nearest(k, -1, true);
    let b = nearest(k, 1, true);
    if (a < 0 && b < 0) { a = nearest(k, -1, false); b = nearest(k, 1, false); }
    if (a < 0 && b < 0) throw new Error(`${h.id}: no own frame to rebuild frame ${k} from`);
    if (a < 0) a = b;
    if (b < 0) b = a;
    const t = a === b ? 0 : (k - a) / (b - a);
    for (let i = 0; i < FLOATS; i += 1) {
      const x = source[a * FLOATS + i];
      frames[k * FLOATS + i] = x + t * (source[b * FLOATS + i] - x);
    }
    for (let i = 0; i < vf; i += 1) {
      const x = c.velocity[a * vf + i];
      const y = c.velocity[b * vf + i];
      velocity[k * vf + i] = x === x && y === y ? x + t * (y - x) : x === x ? x : y;
    }
  }
  // Missing velocity: the nearest point along the profile with a value at the same depth (the lower index on a tie),
  // else the other depths' at the same point, else 0.
  let filled = 0;
  const series = new Float64Array(WAVE_POINTS);
  for (let k = 0; k < count; k += 1) {
    for (let j = 0; j < nd; j += 1) {
      for (let comp = 0; comp < 2; comp += 1) {
        const at = (i: number, jj: number) => k * vf + (i * nd + jj) * 2 + comp;
        for (let i = 0; i < WAVE_POINTS; i += 1) series[i] = velocity[at(i, j)];
        for (let i = 0; i < WAVE_POINTS; i += 1) {
          if (series[i] === series[i]) continue;
          filled += 1;
          let value = Number.NaN;
          for (let r = 1; r < WAVE_POINTS && value !== value; r += 1) {
            if (i - r >= 0 && series[i - r] === series[i - r]) value = series[i - r];
            else if (i + r < WAVE_POINTS && series[i + r] === series[i + r]) value = series[i + r];
          }
          for (let jj = 0; jj < nd && value !== value; jj += 1) {
            const other = c.velocity[at(i, jj)];
            if (other === other) value = other;
          }
          velocity[at(i, j)] = value === value ? value : 0;
        }
      }
    }
  }
  return { frames, velocity, refilled, filled };
}

/** A slice: its match and its clock, a pure function of time from the hand-over on. */
export interface Slice {
  match: Match;
  /** t_h, s; h0, m; √(h0/g), s; Δ, √(h0/g). */
  tH: number;
  h0: number;
  unit: number;
  toThrow: number;
  n: number;
  caseIndex: Int32Array;
  weight: Float64Array;
  tauH: Float64Array;
  /** Each case's rate before its throw, (−τ_h,i)/Δ; and its crest's place at τ_h, h0. */
  rate: Float64Array;
  crestH: Float64Array;
}

export class WaveLibrary {
  readonly cases: readonly LibraryCase[];
  readonly matcher: StateMatcher;
  private readonly taus = new Float64Array(MAX_BLEND);

  constructor(cases: readonly WaveCase[]) {
    if (cases.length === 0) throw new Error('WaveLibrary: no case');
    this.cases = cases.map((c) => {
      const h = c.header;
      if (h.points !== WAVE_POINTS) throw new Error(`${h.id}: ${h.points} points`);
      const { frames, velocity, refilled, filled } = prepareFrames(c);
      const count = h.frames;
      const col = (k: number) => {
        const v = new Float64Array(count);
        for (let f = 0; f < count; f += 1) v[f] = c.path[f * PATH_COLUMNS + k];
        fillSeries(v);
        return v;
      };
      const tau = new Float64Array(count);
      for (let f = 0; f < count; f += 1) tau[f] = h.tauStart + f * h.tauStep;
      const path: CasePath = { id: h.id, a0: h.a0, slope: h.slope, reefDepth: h.reefDepth, period: h.period, tau, d: col(PATH.d), Hd: col(PATH.Hd) };
      return {
        case: c, id: h.id, count, tauStart: h.tauStart, tauStep: h.tauStep, touchdown: h.touchdown ?? Number.NaN,
        frames, velocity, depths: Float64Array.from(h.velocityDepths), crestX: col(PATH.crestX), crestY: col(PATH.crestY),
        path, refilled, filledVelocity: filled,
      };
    });
    this.matcher = new StateMatcher(this.cases.map((c) => c.path));
  }

  /** The slice for a hand-over state: its match, scale and clock. */
  slice(state: HandoverState): Slice {
    const match = this.matcher.match(state);
    const n = match.cases.length;
    const slice: Slice = {
      match, tH: state.time, h0: match.h0, unit: Math.sqrt(match.h0 / GRAVITY), toThrow: match.toThrow, n,
      caseIndex: new Int32Array(n), weight: new Float64Array(n), tauH: new Float64Array(n), rate: new Float64Array(n), crestH: new Float64Array(n),
    };
    const warp = match.toThrow > 1e-6;
    match.cases.forEach((c, k) => {
      slice.caseIndex[k] = c.case;
      slice.weight[k] = c.weight;
      slice.tauH[k] = c.tauH;
      slice.rate[k] = warp ? (0 - c.tauH) / match.toThrow : 1;
      slice.crestH[k] = this.series(this.cases[c.case], this.cases[c.case].crestX, c.tauH);
    });
    return slice;
  }

  /** Each of the slice's cases' τ at time t (s), into `out`. */
  tausAt(slice: Slice, t: number, out: Float64Array = this.taus): Float64Array {
    const s = (t - slice.tH) / slice.unit;
    const warp = slice.toThrow > 1e-6;
    for (let k = 0; k < slice.n; k += 1) {
      out[k] = warp && s > slice.toThrow ? s - slice.toThrow : slice.tauH[k] + slice.rate[k] * s;
    }
    return out;
  }

  /** The slice's throw time, s: t_h + Δ √(h0/g). */
  throwTime(slice: Slice): number {
    return slice.tH + slice.toThrow * slice.unit;
  }

  /**
   * The slice's surface at time t (s), into `out` (128 (x, y) pairs, m: x along the ray from the slice's crest at the
   * hand-over, y from still water). Returns the crest's place into `crest` (x, y), m.
   */
  surfaceAt(slice: Slice, t: number, out: Float32Array, crest?: Float64Array): void {
    const taus = this.tausAt(slice, t);
    const h0 = slice.h0;
    let cx = 0;
    let cy = 0;
    let shift = 0;
    // Summed in float64, written once: each case's two frames, weighted w (1 − u) and w u.
    const acc = this.acc;
    for (let k = 0; k < slice.n; k += 1) {
      const c = this.cases[slice.caseIndex[k]];
      const frames = c.frames;
      const w = slice.weight[k];
      const position = Math.min(c.count - 1, Math.max(0, (taus[k] - c.tauStart) / c.tauStep));
      const f = Math.floor(position);
      const next = Math.min(c.count - 1, f + 1);
      const u = position - f;
      const wa = w * (1 - u);
      const wb = w * u;
      const a = f * FLOATS;
      const b = next * FLOATS;
      if (k === 0) for (let i = 0; i < FLOATS; i += 1) acc[i] = wa * frames[a + i] + wb * frames[b + i];
      else for (let i = 0; i < FLOATS; i += 1) acc[i] += wa * frames[a + i] + wb * frames[b + i];
      shift += w * slice.crestH[k];
      cx += wa * c.crestX[f] + wb * c.crestX[next];
      cy += wa * c.crestY[f] + wb * c.crestY[next];
    }
    for (let i = 0; i < FLOATS; i += 2) {
      out[i] = (acc[i] - shift) * h0;
      out[i + 1] = acc[i + 1] * h0;
    }
    if (crest) {
      crest[0] = (cx - shift) * h0;
      crest[1] = cy * h0;
    }
  }

  private readonly acc = new Float64Array(FLOATS);

  /** The slice's crest at time t (s), into `out` (x along the ray from its crest at the hand-over, y), m. */
  crestAt(slice: Slice, t: number, out: Float64Array): Float64Array {
    const taus = this.tausAt(slice, t);
    let cx = 0;
    let cy = 0;
    for (let k = 0; k < slice.n; k += 1) {
      const c = this.cases[slice.caseIndex[k]];
      const w = slice.weight[k];
      cx += w * (this.series(c, c.crestX, taus[k]) - slice.crestH[k]);
      cy += w * this.series(c, c.crestY, taus[k]);
    }
    out[0] = cx * slice.h0;
    out[1] = cy * slice.h0;
    return out;
  }

  /**
   * The water's velocity at profile point `point` and `depth` m under the surface, at time t (s), into `out` (along the
   * ray, up), m/s: linear between the stored depths, held beyond them.
   */
  velocityAt(slice: Slice, t: number, point: number, depth: number, out: Float64Array): Float64Array {
    const taus = this.tausAt(slice, t);
    const z = depth / slice.h0;
    let u = 0;
    let v = 0;
    for (let k = 0; k < slice.n; k += 1) {
      const c = this.cases[slice.caseIndex[k]];
      const w = slice.weight[k];
      const nd = c.depths.length;
      let j = 0;
      while (j + 2 < nd && c.depths[j + 1] <= z) j += 1;
      const zs = nd > 1 ? Math.min(1, Math.max(0, (z - c.depths[j]) / (c.depths[j + 1] - c.depths[j]))) : 0;
      const j1 = nd > 1 ? j + 1 : j;
      const position = Math.min(c.count - 1, Math.max(0, (taus[k] - c.tauStart) / c.tauStep));
      const f = Math.floor(position);
      const next = Math.min(c.count - 1, f + 1);
      const s = position - f;
      const vf = WAVE_POINTS * nd * 2;
      const read = (frame: number, jj: number, comp: number) => c.velocity[frame * vf + (point * nd + jj) * 2 + comp];
      for (let comp = 0; comp < 2; comp += 1) {
        const a = read(f, j, comp) + zs * (read(f, j1, comp) - read(f, j, comp));
        const b = read(next, j, comp) + zs * (read(next, j1, comp) - read(next, j, comp));
        const value = w * (a + s * (b - a));
        if (comp === 0) u += value;
        else v += value;
      }
    }
    const speed = Math.sqrt(GRAVITY * slice.h0);
    out[0] = u * speed;
    out[1] = v * speed;
    return out;
  }

  /** One case's profile at τ (√(h0/g)), h0, as the library holds it (refilled), into `out`. */
  caseFrameAt(index: number, tau: number, out: Float32Array | Float64Array): void {
    const c = this.cases[index];
    const position = Math.min(c.count - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
    const f = Math.floor(position);
    const next = Math.min(c.count - 1, f + 1);
    const u = position - f;
    for (let i = 0; i < FLOATS; i += 1) out[i] = c.frames[f * FLOATS + i] + u * (c.frames[next * FLOATS + i] - c.frames[f * FLOATS + i]);
  }

  /** A per-frame series of case c at τ, linear between frames, held at the ends. */
  private series(c: LibraryCase, values: Float64Array, tau: number): number {
    const position = Math.min(c.count - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
    const f = Math.floor(position);
    const next = Math.min(c.count - 1, f + 1);
    return values[f] + (position - f) * (values[next] - values[f]);
  }
}
