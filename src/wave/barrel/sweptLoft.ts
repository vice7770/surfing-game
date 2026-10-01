import type { SpotName } from '../Bathymetry';
import { GRAVITY } from '../dispersion';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { LANDMARK, PROFILE_POINTS, type ProfileLibrary, type ProfileQuery } from './ProfileLibrary';

/**
 * The swept loft's constants (the Padang Padang spec, Part B, PR 3; docs/research/water-physics/swept-barrel-build.md,
 * "Lofting" and "The seam"; the advisor's rulings, 2026-09-30):
 * - `spacing`, `fine`, m: slices every half metre along the front, a quarter where neighbouring clocks differ by more
 *   than `frames` library frames (the advisor: 2–4, so neighbours stay within a stage);
 * - `budget`, vertices: past it the spacing widens and neighbouring clocks are clamped to T_open/4 (the advisor);
 * - `pinned`: samples at each end of a profile blended onto the water, never reaching the lip or throat [inferred];
 * - `extension`, `extensionSamples`: the surface runs on over the water this far past each end, m, in this many
 *   samples, so the seam's band always has both surfaces [inferred];
 * - `band`, m: the dithered overlap at the mask's edge [inferred];
 * - `endBlend`, m: a front's ends blend into the water over this length [inferred];
 * - `handover`, s: the anchor returns to the solver's crest over this long [inferred]. (After touchdown a slice fades
 *   into the water over its tube's own collapse, `ProfileLookup.collapseSeconds`, and a faded slice is dropped.)
 * - `offsetKnee`, `offsetReach`, m: the drawn crest's distance from the solver's is its own below the knee and
 *   saturates `offsetReach` past it (the advisor, 2026-09-30: 5 % of open slices ran over 2 m on the Small swell);
 * - `handoverStart`: the anchor starts back to the solver's crest at this share of the open time, where the lip
 *   collapses and the crest landmark is least defined: the capped slices clustered there (44 % in the last fifth of
 *   the open time on the Small swell; the advisor's rule, 2026-09-30).
 */
export const LOFT = {
  spacing: 0.5, fine: 0.25, frames: 3, budget: 40_000, pinned: 6, extension: 1.5, extensionSamples: 3, band: 1, endBlend: 2.5, handover: 0.3,
  offsetKnee: 1.5, offsetReach: 1, handoverStart: 0.8,
} as const;
/** Vertices per slice: the profile and its extensions over the water at each end. */
export const LOFT_SAMPLES = PROFILE_POINTS + 2 * LOFT.extensionSamples;
/**
 * Where the profile stands off the solver's water (the advisor's rulings, 2026-10-01; the spec's item 13.4): the library
 * is the authority only where the solver can't overturn, from just behind the crest to the toe. Its back slope and the
 * flat ahead are one Basilisk wave's still water, so they rest on the game's sea, its height and its foam. In H, the
 * slice's crest over the lower of the water at its toe and at its front end: fully lifted from `behind` behind the
 * crest to the toe, and eased down (smoothstep) to the water over `ramp` beyond each [provisional].
 *
 * Ahead of the toe the rest adapts (the forward rest): the solver's depth-averaged breaking smooths its front broad, so
 * its water can stand far above the library's trough there, the true shape near the break, and a plain ramp from the
 * toe dug a trench that hid the tube. The drawn trough holds at the profile's own front level until the solver's
 * water along the ray comes down to within `near` H of it, read every `step` m from the toe, then eases onto it over
 * `ramp` as behind; within `ahead` H of the toe and the profile's own samples (its front end and extension, less the
 * mask's band), easing over what is left where the water hasn't come down by then [provisional].
 */
export const REST = { behind: 0.1, ramp: 0.5, near: 0.1, ahead: 3, step: 0.5 } as const;

/** H for `REST`, m: the crest's height over the lower of the water at the toe and at the profile's front end. */
function restHeight(crestY: number, toeY: number, frontY: number): number {
  return Math.max(1e-6, crestY - (toeY < frontY ? toeY : frontY));
}
/**
 * The lip as a thin sheet (docs/research/water-physics/tube-colour-fix.md, step 1; the advisor's rulings, 2026-10-01):
 * the lip's two sides are the profile's runs from the crest to the tip and from the tip back under to the throat
 * (`LANDMARK`), and each point between the crest and the throat takes its distance across to the other side, m.
 * - `ramp`: points over which the sheet's weight ramps to 0 next to the crest and the throat (1 from 36 to 84);
 * - `formed`, h0: the underside's length over which the weight comes in, 0.25 m at h0 7 m. The library folds the
 *   underside onto the tip until the cavity forms (its run is a point before the throw, and again at some touchdown
 *   frames), when there is no air behind it and the distance across would run down the face: column water, weight 0
 *   [provisional].
 */
export const SHEET = { ramp: 3, formed: 0.035 } as const;
/**
 * The solver crest's pace in the lip's velocity (the advisor, 2026-09-30, provisional): its mean since the throw is
 * noise early, so it is blended in from `from` to `to` s after the throw; it is held to `slowest`–`fastest` × the
 * long-wave speed √(g d) at the crest, which a crest record that jumps (a split, a re-join) would leave.
 */
export const CREST_SPEED = { from: 0.1, to: 0.3, slowest: 0.5, fastest: 1.5 } as const;
/** The library's runs' slope along the wave's path, per spot drawn with the swept barrel (the owner's 1:19 at Padang Padang). */
export const BARREL_SLOPE: Partial<Record<SpotName, number>> = { padang: 1 / 19 };

export interface LoftResult {
  /** xyz per vertex, and its normal. */
  positions: Float32Array;
  normals: Float32Array;
  /** 0–1 per vertex: the seam mask's value there, and how far the vertex is lifted off the water (the curl's weight). */
  mask: Float32Array;
  lift: Float32Array;
  /**
   * Per vertex, the lip's thickness there, m (the distance across to its other side), and how far the vertex is shaded
   * as that thin sheet, 0–1: ramped in from the crest and the throat, × its lift, 0 before the underside forms and on
   * the extensions (`SHEET`). Drawn lofts only; zero in contact mode.
   */
  sheet: Float32Array;
  sheetWeight: Float32Array;
  /**
   * Per vertex of the sheet, how much of the sky its far side sees through the tube's opening, 0–1 (`sheetAcross`): the
   * light behind the lip is that much sky and the rest the cavity's wall (the advisor, 2026-10-01).
   */
  sheetBack: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  indexCount: number;
  sliceCount: number;
  /**
   * Per slice: its front, σ (m), τ (s), phase (0 before vertical, 1 open, 2 after touchdown), and the anchored crest's
   * distance from the solver's, m (NaN where the anchor is the crest).
   */
  sliceFront: Int32Array;
  sliceSigma: Float32Array;
  sliceTau: Float32Array;
  slicePhase: Uint8Array;
  sliceCrestOffset: Float32Array;
  /** Per slice, τ over its touchdown time once thrown (NaN before): where in its tube's life it is. */
  sliceLife: Float32Array;
  /**
   * Per slice, its tube's collapse time after touchdown, s (√(2W/g)), and how much of it is left, 1 before touchdown to 0
   * when the slice goes: the fade the drawing and the contact share (the advisor, 2026-09-30).
   */
  sliceCollapse: Float32Array;
  sliceFade: Float32Array;
  /**
   * Contact mode: per slice, how far its held lip tip stands from the drawn one, m, and the most this build: about a
   * frame's travel between a case's held frame and touchdown (the advisor, 2026-09-30); 0 in the drawing.
   */
  sliceTipGap: Float32Array;
  tipGap: number;
  /**
   * Per slice, its forward rest (`REST`), m past the drawn toe: where the drawn trough stops holding at the profile's
   * front level and starts easing onto the solver's water, and where it rests on it; and the solver's water over that
   * level where the ease starts and at the toe (where the plain rest would start), m (NaN on a slice with no weight).
   * The same in both modes. And the water heights the forward rests read this build.
   */
  sliceRestHold: Float32Array;
  sliceRestEnd: Float32Array;
  sliceRestClimb: Float32Array;
  sliceToeClimb: Float32Array;
  restSamples: number;
  /** Neighbouring slices' τ clamped to T_open/4 because the budget was reached; lookups outside the library's cases. */
  clamps: number;
  clampedLookups: number;
  /** Slices whose drawn crest's distance from the solver's was soft-capped. */
  caps: number;
  /** Per slice, 1 when it is triangulated to the next (the same run of live slices, not dropped for an overlap). */
  sliceJoined: Uint8Array;
  /**
   * Strips dropped because an earlier front's overlaps them (first front wins); of them those that held an open tube
   * with any weight, which would show as a hole in a barrel (the advisor, 2026-09-30: report them), and their most weight.
   */
  overlaps: number;
  overlapsOpen: number;
  overlapOpenWeight: number;
  /** Per slice, its ray (the front's shoreward normal, x and z), its weight on the water, and 1 if its profile overhangs. */
  sliceRayX: Float32Array;
  sliceRayZ: Float32Array;
  sliceWeight: Float32Array;
  sliceOverturned: Uint8Array;
  /** Per slice, the lip tip's velocity along the ray and up, m/s, and the anchor's own (x, z) while it hands over. */
  sliceTipAlong: Float32Array;
  sliceTipUp: Float32Array;
  sliceAnchorVX: Float32Array;
  sliceAnchorVZ: Float32Array;
}

export interface LoftOptions {
  /** Build for the contact (Part B, PR 4): see `SweptLoft`. */
  contact?: boolean;
  /** Measure the lip as a sheet (`sheetAcross`), which only the drawing shades: on by default, off in contact mode. */
  sheet?: boolean;
}

const MAX_SLICES = Math.floor(LOFT.budget / LOFT_SAMPLES);
const E = LOFT.extensionSamples;
const EXTENSION_STEP = LOFT.extension / E;
const LAST = PROFILE_POINTS - 1;
const PHASE = { pre: 0, open: 1, post: 2 } as const;

/**
 * A slice's fade after touchdown: 1 until then, falling to 0 over its tube's collapse, √(2W/g) (the advisor,
 * 2026-09-30: neither the drawing nor the contact may outlast the pocket); a tube without a void goes at touchdown.
 */
export function collapseFade(tau: number, touchdown: number, collapse: number): number {
  if (tau <= touchdown) return 1;
  return collapse > 0 ? Math.max(0, 1 - (tau - touchdown) / collapse) : 0;
}

interface Front {
  id: number;
  /** Its records [start, end). */
  start: number;
  end: number;
  first: number;
  last: number;
}

/** A front's crest and its point's values at σ: linear between points, running on along the end segments past them. */
interface Sample {
  x: number;
  z: number;
  tau: number;
  footHeight: number;
  footDepth: number;
  throwZ: number;
}

/**
 * The share of the sky seen through a tube's opening from a point on a surface, in the slice's plane (x along the ray,
 * y up; the advisor's ruling, 2026-10-01): the view factor F = ½(sin θ2 − sin θ1) of the directions between the
 * still water's horizon ahead, (1, 0), and the lip's tip as seen from (x, y), up to the tip, with θ from the surface's
 * unit normal (nx, ny) and the window held to the half-plane the surface faces. Exact for an extruded tube, where rays
 * below the horizon meet the water and those above the tip the lip. 0 when the tip is not above the point. Only
 * + − × ÷ √.
 */
export function tubeSkyView(x: number, y: number, nx: number, ny: number, tipX: number, tipY: number): number {
  const ux = tipX - x;
  const uy = tipY - y;
  if (!(uy > 0)) return 0;
  const u = Math.sqrt(ux * ux + uy * uy);
  // The window's edges in the normal's frame: (cos, sin) of their angle from it. Its first edge is the horizon.
  const c1 = nx;
  const s1 = -ny;
  const c2 = (nx * ux + ny * uy) / u;
  const s2 = (nx * uy - ny * ux) / u;
  // The window runs counter-clockwise from the horizon to the tip, under half a turn; the surface sees from −90° (0, −1)
  // to +90° (0, 1). A direction (c, s) lies in the window when it is counter-clockwise of the horizon and not of the
  // tip: c1 s − s1 c ≥ 0 and c s2 − s c2 ≥ 0, which for (0, −1) reads −c1 ≥ 0 and c2 ≥ 0, and for (0, 1) c1 ≥ 0 and −c2 ≥ 0.
  const from = c1 >= 0 ? s1 : c2 >= 0 ? -1 : Number.NaN;
  const to = c2 >= 0 ? s2 : c1 >= 0 ? 1 : Number.NaN;
  if (from !== from || to !== to) return 0;
  return to > from ? (to - from) / 2 : 0;
}

/** Where `acrossTo` found the other side: the segment's first point, and how far along it. */
const foot = { k: 0, t: 0 };
/**
 * Each profile segment k → k + 1 a search may test, 8 floats a segment: its start, its run and the run's inverse square
 * length (0 for a point), its midpoint and half its length (`prepareSegments`).
 */
const segments = new Float64Array(8 * PROFILE_POINTS);
/** Segments a block holds, and each block's circle (centre, radius) over them, by its first segment (`prepareSegments`). */
const BLOCK = 4;
const blocks = new Float64Array(3 * PROFILE_POINTS);

/** Lays out the run [from, to]'s segments for `acrossTo`, and its blocks of `BLOCK` from `from`. */
function prepareSegments(profile: Float32Array, from: number, to: number): void {
  for (let k = from; k < to; k += 1) {
    const o = 8 * k;
    const ax = profile[2 * k];
    const ay = profile[2 * k + 1];
    const dx = profile[2 * k + 2] - ax;
    const dy = profile[2 * k + 3] - ay;
    const length2 = dx * dx + dy * dy;
    segments[o] = ax;
    segments[o + 1] = ay;
    segments[o + 2] = dx;
    segments[o + 3] = dy;
    segments[o + 4] = length2 > 0 ? 1 / length2 : 0;
    segments[o + 5] = ax + dx / 2;
    segments[o + 6] = ay + dy / 2;
    segments[o + 7] = Math.sqrt(length2) / 2;
  }
  for (let b = from; b < to; b += BLOCK) {
    const end = b + BLOCK < to ? b + BLOCK : to;
    // The circle about the box of the block's points: every point of its segments lies within it.
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let k = b; k <= end; k += 1) {
      const x = profile[2 * k];
      const y = profile[2 * k + 1];
      x0 = x < x0 ? x : x0;
      x1 = x > x1 ? x : x1;
      y0 = y < y0 ? y : y0;
      y1 = y > y1 ? y : y1;
    }
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    let r2 = 0;
    for (let k = b; k <= end; k += 1) {
      const ex = profile[2 * k] - cx;
      const ey = profile[2 * k + 1] - cy;
      if (ex * ex + ey * ey > r2) r2 = ex * ex + ey * ey;
    }
    blocks[3 * b] = cx;
    blocks[3 * b + 1] = cy;
    blocks[3 * b + 2] = Math.sqrt(r2);
  }
}

/** The search's best so far: its squared distance, the distance, and where. */
const search = { best: Infinity, bound: Infinity, k: -1, t: 0 };

/** Tests segment k against (px, py) for `search`: ties go to the first segment along the run, as a search in order. */
function testSegment(px: number, py: number, k: number): void {
  const o = 8 * k;
  const ex = px - segments[o];
  const ey = py - segments[o + 1];
  const dx = segments[o + 2];
  const dy = segments[o + 3];
  let t = (ex * dx + ey * dy) * segments[o + 4];
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ex - t * dx;
  const qy = ey - t * dy;
  const d2 = qx * qx + qy * qy;
  if (d2 < search.best || (d2 === search.best && k < search.k)) {
    search.best = d2;
    search.bound = Math.sqrt(d2);
    search.k = k;
    search.t = t;
  }
}

/** Whether a circle (its centre (x, y) from the point, its radius r) lies beyond the search's bound: it cannot even tie. */
function beyond(x: number, y: number, r: number): boolean {
  const reach = search.bound + r;
  return x * x + y * y > reach * reach * (1 + 1e-9) + 1e-12;
}

/**
 * The shortest distance from profile point i to the segments of the run [from, to] (laid out by `prepareSegments`), m,
 * the nearest point into `foot`: the first such segment along the run, as a search in order finds it. From `start` (the
 * last point's nearest segment, usually next to this one's) it takes a first distance, then tests only the blocks and
 * segments whose circles it doesn't rule out (nothing in a circle is nearer than its centre's distance less its radius),
 * so most cost a few products, not a projection (the advisor, 2026-10-01: a whole search of each run cost 20 ms a build
 * with a long front open). Only + − × ÷ √.
 */
function acrossTo(profile: Float32Array, i: number, from: number, to: number, start = -1): number {
  const px = profile[2 * i];
  const py = profile[2 * i + 1];
  search.best = Infinity;
  search.bound = Infinity;
  search.k = -1;
  search.t = 0;
  if (start >= from && start < to) testSegment(px, py, start);
  for (let b = from; b < to; b += BLOCK) {
    if (beyond(px - blocks[3 * b], py - blocks[3 * b + 1], blocks[3 * b + 2])) continue;
    const end = b + BLOCK < to ? b + BLOCK : to;
    for (let k = b; k < end; k += 1) {
      if (k === start || beyond(px - segments[8 * k + 5], py - segments[8 * k + 6], segments[8 * k + 7])) continue;
      testSegment(px, py, k);
    }
  }
  foot.k = search.k;
  foot.t = search.t;
  return Math.sqrt(search.best);
}

/**
 * The lip's thickness at each point between the crest and the throat (`SHEET`), into `out` (m): from the crest to the
 * tip, the distance to the underside's run; from the tip back to the throat, to the outer run's; 0 at the tip, where
 * they meet. Into `back`, how much of the sky the sheet's far side sees there (the advisor's ruling, 2026-10-01): from
 * the outer run, the underside's view through the tube's opening where the distance was found (`tubeSkyView`); from
 * the underside and the tip, 1, the open sky. `scale`: the slice's h0, m. `walk` (the default) starts each point's
 * search from the last one's nearest segment (`acrossTo`; the same answers, fewer tests). Returns how far the underside
 * has formed, 0–1: its length over `SHEET.formed` h0 (0 leaves `out` and `back` as they were).
 */
export function sheetAcross(profile: Float32Array, scale: number, out: Float32Array, back: Float32Array, walk = true): number {
  const { crest, lip, throat } = LANDMARK;
  let underside = 0;
  for (let k = lip; k < throat; k += 1) {
    const dx = profile[2 * k + 2] - profile[2 * k];
    const dy = profile[2 * k + 3] - profile[2 * k + 1];
    underside += Math.sqrt(dx * dx + dy * dy);
  }
  const formed = Math.min(1, underside / (SHEET.formed * scale));
  if (formed <= 0) return 0;
  const tipX = profile[2 * lip];
  const tipY = profile[2 * lip + 1];
  prepareSegments(profile, crest, lip);
  prepareSegments(profile, lip, throat);
  // Each point's search starts from the last one's nearest segment (`acrossTo`).
  let start = -1;
  for (let i = crest + 1; i < lip; i += 1) {
    out[i] = acrossTo(profile, i, lip, throat, walk ? start : -1);
    start = foot.k;
    // The underside's normal there, turned from its run (tip back to the throat) into the cavity, below it.
    const { k, t } = foot;
    const dx = profile[2 * k + 2] - profile[2 * k];
    const dy = profile[2 * k + 3] - profile[2 * k + 1];
    const length = Math.sqrt(dx * dx + dy * dy);
    back[i] = length > 0
      ? tubeSkyView(profile[2 * k] + t * dx, profile[2 * k + 1] + t * dy, -dy / length, dx / length, tipX, tipY)
      : 0;
  }
  out[lip] = 0;
  back[lip] = 1;
  start = -1;
  for (let i = lip + 1; i < throat; i += 1) {
    out[i] = acrossTo(profile, i, crest, lip, walk ? start : -1);
    start = foot.k;
    back[i] = 1;
  }
  return formed;
}

/**
 * The swept barrel's loft (the Padang Padang spec, Part B, PR 3): each breaking front's profiles, looked up by its
 * points' foot crests and clocks, stood along its shoreward normal and sewn into the water.
 * - **Anchor** (the advisor's ruling 2): before the throw the profile's crest sits on the solver's crest; from the throw,
 *   its τ = 0 crest sits where the crest crossed its throw depth; from 80 % of the open time it returns to the solver's
 *   crest over the handover. The anchored crest's distance from the solver's is kept per slice for the advisor.
 * - **After touchdown** (the advisor, 2026-09-30): the drawing keeps the touchdown frame, the visual event; the slice
 *   fades into the water over its tube's collapse, √(2W/g), and is dropped once faded.
 * - **Seam** (ruling 3): a profile's first and last `pinned` samples blend onto the water, the extensions lie on it,
 *   and each vertex carries the mask's value: 1 over the profile, 0 a `band` past it.
 * - **Resampling** (ruling 4): `spacing`, refined to `fine` where neighbouring clocks differ by more than `frames`
 *   frames, within `budget` vertices.
 * - **Overlapping fronts** (the advisor, 2026-09-30): the first front wins; a later front's strip over an earlier
 *   front's is dropped, and counted, so the drawing and the contact show one surface.
 * - **Contact mode** (PR 4, the advisor's ruling 2): each blended case is held at its own last clear frame
 *   (`heldFrame`: the jet off the face, the void open) through touchdown and the collapse (the clock and phase run on),
 *   so it never self-crosses yet follows the drawing until then; each slice's held tip's distance from the drawn one is
 *   kept. Its weights are the drawing's: the lerp toward the same water by the same weight keeps a vertical line's
 *   crossings in order, so a partly weighted lip shrinks as drawn (the advisor, 2026-09-30).
 * A vertex resting on the water asks its height; one lifted fully off it is still level plus the profile.
 * Only + − × ÷ and √, for online determinism: PR 4's contact runs the same code in the worker.
 */
export class SweptLoft {
  private readonly result: LoftResult;
  private readonly profile = new Float32Array(2 * PROFILE_POINTS);
  /** Per front, its slices' σ, before and after refinement. */
  private readonly base = new Float64Array(2 * MAX_SLICES + 8);
  private readonly sigmas = new Float64Array(2 * MAX_SLICES + 8);
  private readonly sample: Sample = { x: 0, z: 0, tau: 0, footHeight: 0, footDepth: 0, throwZ: 0 };
  private readonly probe: Sample = { x: 0, z: 0, tau: 0, footHeight: 0, footDepth: 0, throwZ: 0 };
  private readonly query: ProfileQuery;
  private readonly point = new Float64Array(2);
  private readonly velocity = new Float64Array(2);
  /** A slice's forward rest (`forwardRest`): its hold and end, m past the toe, and the climbs where it eases and at the toe. */
  private readonly rest = new Float64Array(4);
  /** This build's water depth at a point, m (the contact's: the solver's column), for the crest's long-wave pace. */
  private depthAt: ((x: number, z: number) => number) | undefined;
  /** Per slice, its anchor (x, z) and its drawn profile's reach along its ray past its extensions, m: its footprint. */
  private readonly anchorX = new Float64Array(MAX_SLICES + 1);
  private readonly anchorZ = new Float64Array(MAX_SLICES + 1);
  private readonly reachBack = new Float64Array(MAX_SLICES + 1);
  private readonly reachFront = new Float64Array(MAX_SLICES + 1);
  /** Per strip, its footprint's corners (x, z × 4: its slices' back and front reach) and box (x0, x1, z0, z1). */
  private readonly corners = new Float64Array(8 * (MAX_SLICES + 1));
  private readonly boxes = new Float64Array(4 * (MAX_SLICES + 1));

  private readonly contact: boolean;
  private readonly measureSheet: boolean;
  /** A slice's lip thickness per profile point, m, and its far side's view of the sky (`sheetAcross`). */
  private readonly across = new Float32Array(PROFILE_POINTS);
  private readonly farSide = new Float32Array(PROFILE_POINTS);

  constructor(private readonly library: ProfileLibrary, private readonly slope: number, options: LoftOptions = {}) {
    this.contact = options.contact ?? false;
    this.measureSheet = options.sheet ?? !this.contact;
    this.query = { slope, footHeight: 0, footDepth: 0, seconds: 0 };
    const vertices = (MAX_SLICES + 1) * LOFT_SAMPLES;
    const slices = MAX_SLICES + 1;
    this.result = {
      positions: new Float32Array(3 * vertices), normals: new Float32Array(3 * vertices), mask: new Float32Array(vertices), lift: new Float32Array(vertices),
      sheet: new Float32Array(vertices), sheetWeight: new Float32Array(vertices), sheetBack: new Float32Array(vertices),
      indices: new Uint32Array(6 * (LOFT_SAMPLES - 1) * slices), vertexCount: 0, indexCount: 0, sliceCount: 0,
      sliceFront: new Int32Array(slices), sliceSigma: new Float32Array(slices), sliceTau: new Float32Array(slices),
      slicePhase: new Uint8Array(slices), sliceCrestOffset: new Float32Array(slices), sliceLife: new Float32Array(slices),
      sliceCollapse: new Float32Array(slices), sliceFade: new Float32Array(slices), sliceTipGap: new Float32Array(slices), tipGap: 0,
      sliceRestHold: new Float32Array(slices), sliceRestEnd: new Float32Array(slices), sliceRestClimb: new Float32Array(slices),
      sliceToeClimb: new Float32Array(slices), restSamples: 0,
      clamps: 0, clampedLookups: 0, caps: 0, overlaps: 0, overlapsOpen: 0, overlapOpenWeight: 0,
      sliceJoined: new Uint8Array(slices), sliceRayX: new Float32Array(slices), sliceRayZ: new Float32Array(slices),
      sliceWeight: new Float32Array(slices), sliceOverturned: new Uint8Array(slices), sliceTipAlong: new Float32Array(slices),
      sliceTipUp: new Float32Array(slices), sliceAnchorVX: new Float32Array(slices), sliceAnchorVZ: new Float32Array(slices),
    };
  }

  /**
   * Loft the records' fronts over the water (`heightAt`). The contact passes the water's depth (`depthAt`, m) too, for
   * the crest's pace in the lip's velocity; without it that pace is not held to the long-wave speed.
   */
  build(
    records: Float32Array, count: number, stillLevel: number, heightAt: (x: number, z: number) => number, depthAt?: (x: number, z: number) => number,
  ): LoftResult {
    this.depthAt = depthAt;
    const r = this.result;
    r.vertexCount = 0;
    r.indexCount = 0;
    r.sliceCount = 0;
    r.clamps = 0;
    r.clampedLookups = 0;
    r.caps = 0;
    r.tipGap = 0;
    r.overlaps = 0;
    r.overlapsOpen = 0;
    r.overlapOpenWeight = 0;
    r.restSamples = 0;
    const fronts = this.fronts(records, count);
    // The spacing that fits the budget, and whether refining would overrun it: faded slices are dropped, so only the
    // live ones count.
    let live = 0;
    let extra = 0;
    for (const f of fronts) {
      const survey = this.survey(records, f);
      live += survey.live;
      extra += survey.extra;
    }
    let spacing: number = LOFT.spacing;
    let budgeted = live + extra > MAX_SLICES;
    if (live > MAX_SLICES) spacing = (LOFT.spacing * live) / Math.max(1, MAX_SLICES - 2 * fronts.length);
    for (const f of fronts) {
      if (r.sliceCount >= MAX_SLICES) break;
      const n = budgeted ? this.baseSlices(f, spacing, this.sigmas) : this.refinements(records, f, spacing);
      this.loftFront(records, f, n, budgeted, stillLevel, heightAt);
    }
    this.dropOverlaps();
    this.triangulate();
    return r;
  }

  /** The records' fronts, in order; one of fewer than two points, or all at one σ, has no tangent and is left out. */
  private fronts(records: Float32Array, count: number): Front[] {
    const fronts: Front[] = [];
    let start = 0;
    while (start < count) {
      const id = records[start * FRONT_STRIDE + FRONT_FIELD.front];
      let end = start + 1;
      while (end < count && records[end * FRONT_STRIDE + FRONT_FIELD.front] === id) end += 1;
      const first = records[start * FRONT_STRIDE + FRONT_FIELD.sigma];
      const last = records[(end - 1) * FRONT_STRIDE + FRONT_FIELD.sigma];
      if (end - start >= 2 && last - first > 1e-6) fronts.push({ id, start, end, first, last });
      start = end;
    }
    return fronts;
  }

  /** A front's slices every `spacing` or less, evenly from one extension's end to the other's, into `out`; how many. */
  private baseSlices(f: Front, spacing: number, out: Float64Array): number {
    const from = f.first - LOFT.extension;
    const span = f.last - f.first + 2 * LOFT.extension;
    const n = Math.ceil(span / spacing) + 1;
    const step = span / (n - 1);
    for (let k = 0; k < n; k += 1) out[k] = from + k * step;
    return n;
  }

  /**
   * A front's base slices at `spacing` that have not faded after touchdown (the rest are dropped), and the midpoints
   * the live ones need (neighbouring clocks more than `frames` frames apart).
   */
  private survey(records: Float32Array, f: Front): { live: number; extra: number } {
    const n = this.baseSlices(f, LOFT.spacing, this.base);
    let live = 0;
    let extra = 0;
    let previous = Number.NaN;
    let previousFrame = 0;
    for (let k = 0; k < n; k += 1) {
      const s = this.at(records, f, this.base[k], this.probe);
      const times = this.library.profileTimes({ slope: this.slope, footHeight: s.footHeight, footDepth: s.footDepth });
      if (collapseFade(s.tau, times.touchdownSeconds, times.collapseSeconds) === 0) {
        previous = Number.NaN;
        continue;
      }
      live += 1;
      if (Math.abs(s.tau - previous) > LOFT.frames * Math.min(times.frameSeconds, previousFrame)) extra += 1;
      previous = s.tau;
      previousFrame = times.frameSeconds;
    }
    return { live, extra };
  }

  /** A front's base slices, with the midpoints where neighbouring clocks differ by more than `frames` frames, into `sigmas`; how many. */
  private refinements(records: Float32Array, f: Front, spacing: number): number {
    const n = this.baseSlices(f, spacing, this.base);
    let out = 0;
    let previousTau = 0;
    let previousFrame = 0;
    for (let k = 0; k < n; k += 1) {
      const s = this.at(records, f, this.base[k], this.probe);
      const frame = this.library.profileTimes({ slope: this.slope, footHeight: s.footHeight, footDepth: s.footDepth }).frameSeconds;
      if (k > 0 && Math.abs(s.tau - previousTau) > LOFT.frames * Math.min(frame, previousFrame)) this.sigmas[out++] = (this.base[k - 1] + this.base[k]) / 2;
      this.sigmas[out++] = this.base[k];
      previousTau = s.tau;
      previousFrame = frame;
    }
    return out;
  }

  /** Front f's values at σ (see `Sample`), into `into`. */
  private at(records: Float32Array, f: Front, sigma: number, into: Sample): Sample {
    const field = (k: number, name: keyof typeof FRONT_FIELD) => records[k * FRONT_STRIDE + FRONT_FIELD[name]];
    const copy = (k: number) => {
      into.x = field(k, 'x');
      into.z = field(k, 'z');
      into.tau = field(k, 'tau');
      into.footHeight = field(k, 'footHeight');
      into.footDepth = field(k, 'footDepth');
      into.throwZ = field(k, 'throwZ');
    };
    const runOn = (from: number, to: number, beyond: number) => {
      // Past an end, the crest runs on along its end segment; the rest keeps the end's values.
      const dx = field(to, 'x') - field(from, 'x');
      const dz = field(to, 'z') - field(from, 'z');
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length > 1e-9) {
        into.x += (beyond * dx) / length;
        into.z += (beyond * dz) / length;
      }
    };
    if (sigma <= f.first) {
      copy(f.start);
      runOn(f.start + 1, f.start, f.first - sigma);
      return into;
    }
    if (sigma >= f.last) {
      copy(f.end - 1);
      runOn(f.end - 2, f.end - 1, sigma - f.last);
      return into;
    }
    let k = f.start;
    while (k + 2 < f.end && field(k + 1, 'sigma') < sigma) k += 1;
    const s0 = field(k, 'sigma');
    const s1 = field(k + 1, 'sigma');
    const t = s1 - s0 > 1e-12 ? (sigma - s0) / (s1 - s0) : 0;
    const lerp = (name: keyof typeof FRONT_FIELD) => field(k, name) + t * (field(k + 1, name) - field(k, name));
    into.x = lerp('x');
    into.z = lerp('z');
    into.tau = lerp('tau');
    into.footHeight = lerp('footHeight');
    into.footDepth = lerp('footDepth');
    const z0 = field(k, 'throwZ');
    const z1 = field(k + 1, 'throwZ');
    into.throwZ = z0 === z0 && z1 === z1 ? z0 + t * (z1 - z0) : Number.NaN;
    return into;
  }

  private loftFront(
    records: Float32Array, f: Front, n: number, budgeted: boolean, stillLevel: number, heightAt: (x: number, z: number) => number,
  ): void {
    const r = this.result;
    const { profile } = this;
    // Runs of live slices: a faded slice is dropped, and the slices either side of it are never joined.
    let runStart = -1;
    const closeRun = () => {
      if (runStart >= 0) this.finishRun(runStart, r.sliceCount - 1);
      runStart = -1;
    };
    let previousTau = 0;
    for (let k = 0; k < n; k += 1) {
      const sigma = this.sigmas[k];
      const s = this.at(records, f, sigma, this.sample);
      // The ray: the front's shoreward normal, from its tangent over ±2 m.
      const ahead = this.at(records, f, sigma + 2, this.probe);
      let tx = ahead.x;
      let tz = ahead.z;
      const behind = this.at(records, f, sigma - 2, this.probe);
      tx -= behind.x;
      tz -= behind.z;
      const t = Math.sqrt(tx * tx + tz * tz);
      if (t > 1e-9) {
        tx /= t;
        tz /= t;
      } else {
        tx = 1;
        tz = 0;
      }
      const nx = -tz;
      const nz = tx;
      let tau = s.tau;
      if (budgeted && runStart >= 0) {
        const limit = this.library.profileTimes({ slope: this.slope, footHeight: s.footHeight, footDepth: s.footDepth }).touchdownSeconds / 4;
        const clamped = Math.min(previousTau + limit, Math.max(previousTau - limit, tau));
        if (clamped !== tau) r.clamps += 1;
        tau = clamped;
      }
      // The drawing keeps the touchdown frame, the visual event; the contact also holds each blended case at its own
      // last clear frame, never self-crossing (the advisor, 2026-09-30). Both clocks run on.
      const query = this.query;
      query.footHeight = s.footHeight;
      query.footDepth = s.footDepth;
      query.seconds = tau;
      query.hold = this.contact ? 'contact' : 'drawing';
      const lookup = this.library.profileAt(query, profile);
      const touchdown = lookup.touchdownSeconds;
      const wFade = collapseFade(tau, touchdown, lookup.collapseSeconds);
      if (wFade === 0) {
        closeRun();
        continue;
      }
      // The drawn slice's lifted span along its ray, m, the same in both modes (overlapping fronts are judged on it:
      // where both rest on the water there is nothing to conflict; the advisor, 2026-10-01); and how far the contact's
      // held tip stands from the drawn one, m (the advisor: the touchdown's own approach).
      let tipGap = 0;
      let drawnCrestX = profile[2 * LANDMARK.crest];
      let crestY = profile[2 * LANDMARK.crest + 1];
      let drawnToeX = profile[2 * LANDMARK.toe];
      let toeY = profile[2 * LANDMARK.toe + 1];
      let frontY = profile[2 * LAST + 1];
      let drawnFrontX = profile[2 * LAST];
      if (this.contact) {
        query.hold = 'drawing';
        this.library.pointAt(query, LANDMARK.lip, this.point);
        const dx = this.point[0] - profile[2 * LANDMARK.lip];
        const dy = this.point[1] - profile[2 * LANDMARK.lip + 1];
        tipGap = Math.sqrt(dx * dx + dy * dy);
        this.library.pointAt(query, LANDMARK.crest, this.point);
        [drawnCrestX, crestY] = [this.point[0], this.point[1]];
        this.library.pointAt(query, LANDMARK.toe, this.point);
        [drawnToeX, toeY] = [this.point[0], this.point[1]];
        this.library.pointAt(query, LANDMARK.front, this.point);
        [drawnFrontX, frontY] = [this.point[0], this.point[1]];
      }
      const drawnHeight = restHeight(crestY, toeY, frontY);
      const reachBack = drawnCrestX - (REST.behind + REST.ramp) * drawnHeight;
      // The weights: into the water at the front's ends, and after touchdown.
      const d = Math.min(sigma - f.first, f.last - sigma);
      const r0 = Math.min(1, d / LOFT.endBlend);
      const wEnd = d <= 0 ? 0 : r0 * r0 * (3 - 2 * r0);
      // The contact follows the drawing's weight: the lerp toward the same water by the same weight keeps a vertical
      // line's crossings in order, so a partly weighted lip shrinks as drawn (the advisor, 2026-09-30).
      const w = wEnd * wFade;
      let overturned = 0;
      for (let i = LOFT.pinned; i < LAST - LOFT.pinned; i += 1) {
        if (profile[2 * (i + 1)] < profile[2 * i]) {
          overturned = 1;
          break;
        }
      }
      if (r.sliceCount >= MAX_SLICES) break;
      if (runStart < 0) runStart = r.sliceCount;
      previousTau = tau;
      if (lookup.clamped) r.clampedLookups += 1;
      // The anchor: the profile's x origin in the world.
      const crest = profile[2 * LANDMARK.crest];
      const crestX = s.x - crest * nx;
      const crestZ = s.z - crest * nz;
      let ax = crestX;
      let az = crestZ;
      let offset = Number.NaN;
      let life = Number.NaN;
      let anchorVX = 0;
      let anchorVZ = 0;
      if (tau >= 0 && s.throwZ === s.throwZ) {
        // The throw's anchor, its drawn crest at most `offsetKnee` + `offsetReach` from the solver's (a soft cap).
        const ox = crest * nx;
        const oz = s.throwZ + crest * nz - s.z;
        const raw = Math.sqrt(ox * ox + oz * oz);
        let throwX = s.x;
        let throwZ = s.throwZ;
        // How the capped throw point moves with the crest point C it is held near (`o` = T − C): along `o` at 1 − f′
        // of C's pace (f′ the cap's slope), across it at 1 − its scale; uncapped, it stays.
        let alongFollow = 0;
        let acrossFollow = 0;
        if (raw > LOFT.offsetKnee) {
          const beyond = (raw - LOFT.offsetKnee) / LOFT.offsetReach;
          const scale = (LOFT.offsetKnee + (LOFT.offsetReach * beyond) / (1 + beyond)) / raw;
          throwX = crestX + scale * ox;
          throwZ = crestZ + scale * oz;
          alongFollow = 1 - 1 / ((1 + beyond) * (1 + beyond));
          acrossFollow = 1 - scale;
          r.caps += 1;
        }
        life = tau / touchdown;
        if (tau <= touchdown) offset = raw;
        const start = LOFT.handoverStart * touchdown;
        let u = 0;
        if (tau <= start) {
          ax = throwX;
          az = throwZ;
        } else {
          u = Math.min(1, (tau - start) / LOFT.handover);
          ax = throwX + u * (crestX - throwX);
          az = throwZ + u * (crestZ - throwZ);
          // The anchor's own motion while it hands over.
          if (u < 1) {
            anchorVX = (crestX - throwX) / LOFT.handover;
            anchorVZ = (crestZ - throwZ) / LOFT.handover;
          }
        }
        if (this.contact) {
          // And its following motion (the advisor, 2026-09-30): the crest point C = S − c n moves at Ċ = Ṡ − ċ n, the
          // solver's crest less the library's; the anchor (1 − u) T′ + u C follows it by (1 − u) dT′/dt + u Ċ.
          const follow = this.crestPointVelocity(s, tau, lookup.frameSeconds, nx, nz);
          const cvx = follow[0];
          const cvz = follow[1];
          let tvx = 0;
          let tvz = 0;
          if (raw > LOFT.offsetKnee) {
            const ux = ox / raw;
            const uz = oz / raw;
            const along = ux * cvx + uz * cvz;
            tvx = alongFollow * along * ux + acrossFollow * (cvx - along * ux);
            tvz = alongFollow * along * uz + acrossFollow * (cvz - along * uz);
          }
          anchorVX += (1 - u) * tvx + u * cvx;
          anchorVZ += (1 - u) * tvz + u * cvz;
        }
      }
      const maskSlice = wFade > 0 ? Math.min(1, Math.max(0, 1 + d / LOFT.band)) : 0;
      // The forward rest, from the drawn slice in both modes, so the contact and the overlaps follow the drawing.
      const forward = this.rest;
      if (w > 0) {
        this.forwardRest(ax, az, nx, nz, drawnToeX, stillLevel + frontY, drawnHeight, drawnFrontX + LOFT.extension - LOFT.band - drawnToeX, heightAt);
      } else {
        forward[0] = 0;
        forward[1] = REST.ramp * drawnHeight;
        forward[2] = Number.NaN;
        forward[3] = Number.NaN;
      }
      const [restHold, restEnd] = [forward[0], forward[1]];
      const reachFront = drawnToeX + restEnd;
      // The lip as a thin sheet, for the drawing only: how far across it each point is, once its underside has formed.
      const formed = this.measureSheet && w > 0 ? sheetAcross(profile, lookup.scale, this.across, this.farSide) : 0;
      const slice = r.sliceCount;
      r.sliceFront[slice] = f.id;
      r.sliceSigma[slice] = sigma;
      r.sliceTau[slice] = tau;
      r.slicePhase[slice] = tau > touchdown ? PHASE.post : PHASE[lookup.phase];
      r.sliceCrestOffset[slice] = offset;
      r.sliceLife[slice] = life;
      r.sliceCollapse[slice] = lookup.collapseSeconds;
      r.sliceFade[slice] = wFade;
      r.sliceTipGap[slice] = tipGap;
      if (tipGap > r.tipGap) r.tipGap = tipGap;
      r.sliceRestHold[slice] = restHold;
      r.sliceRestEnd[slice] = restEnd;
      r.sliceRestClimb[slice] = forward[2];
      r.sliceToeClimb[slice] = forward[3];
      this.anchorX[slice] = ax;
      this.anchorZ[slice] = az;
      this.reachBack[slice] = reachBack;
      this.reachFront[slice] = reachFront;
      r.sliceJoined[slice] = 0;
      r.sliceRayX[slice] = nx;
      r.sliceRayZ[slice] = nz;
      r.sliceWeight[slice] = w;
      r.sliceOverturned[slice] = overturned;
      r.sliceTipAlong[slice] = lookup.tipAlong;
      r.sliceTipUp[slice] = lookup.tipUp;
      r.sliceAnchorVX[slice] = anchorVX;
      r.sliceAnchorVZ[slice] = anchorVZ;
      // How far each point stands off the water: from just behind the crest to the toe, eased onto it either side, and
      // ahead of the toe held as the forward rest says first.
      const profileCrestX = profile[2 * LANDMARK.crest];
      const toeX = profile[2 * LANDMARK.toe];
      const height = restHeight(profile[2 * LANDMARK.crest + 1], profile[2 * LANDMARK.toe + 1], profile[2 * LAST + 1]);
      const rampLength = REST.ramp * height;
      const restSpan = restEnd - restHold;
      for (let j = 0; j < LOFT_SAMPLES; j += 1) {
        let along: number;
        let above = 0;
        let pin = 1;
        let maskAlong = 0;
        let sheet = 0;
        let sheetShare = 0;
        let sheetBack = 0;
        if (j < E) {
          along = profile[0] - (E - j) * EXTENSION_STEP;
        } else if (j < E + PROFILE_POINTS) {
          const i = j - E;
          along = profile[2 * i];
          above = profile[2 * i + 1];
          // Past the ramps the profile rests on the water; the mask lets the water draw itself a band beyond them.
          if (i < LANDMARK.crest) {
            const past = profileCrestX - along - REST.behind * height;
            const u = past > 0 ? Math.min(1, past / rampLength) : 0;
            pin = Math.max(u * u * (3 - 2 * u), i < LOFT.pinned ? (LOFT.pinned - i) / LOFT.pinned : 0);
            maskAlong = Math.min(1, Math.max(0, 1 - (past - rampLength) / LOFT.band));
          } else if (i > LANDMARK.toe) {
            // Ahead, the forward rest alone: it ends within the profile's samples, so its end needs no pin.
            const past = along - toeX;
            const u = past > restHold ? Math.min(1, (past - restHold) / restSpan) : 0;
            pin = u * u * (3 - 2 * u);
            maskAlong = Math.min(1, Math.max(0, 1 - (past - restEnd) / LOFT.band));
          } else {
            pin = 0;
            maskAlong = 1;
          }
          if (formed > 0 && i > LANDMARK.crest && i < LANDMARK.throat) {
            sheet = this.across[i];
            sheetBack = this.farSide[i];
            sheetShare = formed * Math.min(1, Math.min(i - LANDMARK.crest, LANDMARK.throat - i) / (SHEET.ramp + 1));
          }
        } else {
          along = profile[2 * LAST] + (j - E - LAST) * EXTENSION_STEP;
          // Held as far as the forward rest reaches, at the profile's front level.
          above = profile[2 * LAST + 1];
          const past = along - toeX;
          const u = past > restHold ? Math.min(1, (past - restHold) / restSpan) : 0;
          pin = u * u * (3 - 2 * u);
          maskAlong = Math.min(1, Math.max(0, 1 - (past - restEnd) / LOFT.band));
        }
        const v = slice * LOFT_SAMPLES + j;
        const px = ax + along * nx;
        const pz = az + along * nz;
        const e = w * (1 - pin);
        r.positions[3 * v] = px;
        if (e === 1) {
          r.positions[3 * v + 1] = stillLevel + above;
        } else {
          const h = heightAt(px, pz);
          r.positions[3 * v + 1] = e === 0 ? h : h + e * (stillLevel + above - h);
        }
        r.positions[3 * v + 2] = pz;
        r.mask[v] = maskSlice * maskAlong;
        r.lift[v] = e;
        r.sheet[v] = sheet;
        r.sheetWeight[v] = sheetShare * e;
        r.sheetBack[v] = sheetBack;
      }
      r.sliceCount += 1;
    }
    closeRun();
    r.vertexCount = r.sliceCount * LOFT_SAMPLES;
  }

  /**
   * A slice's forward rest (`REST`; the advisor's ruling, 2026-10-01) into `this.rest`: its hold and end, m past the toe
   * `toeX` (m along the ray from the anchor (ax, az)), and the solver's water over the drawn level `level` where the
   * ease starts and at the toe, m. The water is read along the ray every `REST.step` m from the toe; the hold ends where
   * it first comes within `REST.near` H of the level (between two readings, where the line between them does), and the
   * ease runs `REST.ramp` H from there, all within `REST.ahead` H and `room`, m past the toe. Only + − × ÷.
   */
  private forwardRest(
    ax: number, az: number, nx: number, nz: number, toeX: number, level: number, height: number, room: number,
    heightAt: (x: number, z: number) => number,
  ): void {
    const out = this.rest;
    const ramp = REST.ramp * height;
    const near = REST.near * height;
    const cap = Math.max(0, Math.min(REST.ahead * height, room));
    // The latest the ease may start and still end within the cap.
    const latest = Math.max(0, cap - ramp);
    let hold = latest;
    let climb = Number.NaN;
    let previous = 0;
    let previousGap = 0;
    for (let k = 0; ; k += 1) {
      const at = Math.min(k * REST.step, latest);
      const gap = heightAt(ax + (toeX + at) * nx, az + (toeX + at) * nz) - level;
      this.result.restSamples += 1;
      if (k === 0) out[3] = gap;
      if (gap <= near) {
        hold = k === 0 ? 0 : previous + ((at - previous) * (previousGap - near)) / (previousGap - gap);
        climb = k === 0 ? gap : near;
        break;
      }
      if (at >= latest) {
        climb = gap;
        break;
      }
      previous = at;
      previousGap = gap;
    }
    out[0] = hold;
    out[1] = hold + Math.max(Math.min(ramp, cap - hold), 1e-3);
    out[2] = climb;
  }

  /** A run of consecutive slices: its normals, and its strips joined. */
  private finishRun(firstSlice: number, lastSlice: number): void {
    const r = this.result;
    this.normals(firstSlice, lastSlice);
    for (let s = firstSlice; s < lastSlice; s += 1) r.sliceJoined[s] = 1;
  }

  /**
   * The crest point's velocity, m/s (x, z): the solver's crest's, Ṡ, less the profile's crest's along the ray, ċ n
   * (the advisor, 2026-09-30). Ṡ is the solver crest's mean pace since its throw along its column (+z), blended in
   * after the throw and held near the long-wave speed at the crest (`CREST_SPEED`); it lags a slowing crest by about
   * a tenth late on. ċ is the contact profile's crest landmark's motion over ±4 frames, as the tip's.
   */
  private crestPointVelocity(s: Sample, tau: number, frameSeconds: number, nx: number, nz: number): Float64Array {
    const out = this.velocity;
    const blend = Math.min(1, Math.max(0, (tau - CREST_SPEED.from) / (CREST_SPEED.to - CREST_SPEED.from)));
    let pace = 0;
    if (blend > 0) {
      pace = (s.z - s.throwZ) / tau;
      if (this.depthAt) {
        const wave = Math.sqrt(GRAVITY * Math.max(0, this.depthAt(s.x, s.z)));
        pace = Math.min(CREST_SPEED.fastest * wave, Math.max(CREST_SPEED.slowest * wave, pace));
      }
      pace *= blend;
    }
    const query = this.query;
    query.footHeight = s.footHeight;
    query.footDepth = s.footDepth;
    query.hold = 'contact';
    const window = 4 * frameSeconds;
    query.seconds = tau + window;
    this.library.pointAt(query, LANDMARK.crest, this.point);
    const ahead = this.point[0];
    query.seconds = tau - window;
    this.library.pointAt(query, LANDMARK.crest, this.point);
    const crestPace = (ahead - this.point[0]) / (2 * window);
    out[0] = -crestPace * nx;
    out[1] = pace - crestPace * nz;
    return out;
  }

  /** Two triangles per quad of every joined strip. */
  private triangulate(): void {
    const r = this.result;
    for (let s = 0; s + 1 < r.sliceCount; s += 1) {
      if (r.sliceJoined[s] !== 1) continue;
      for (let j = 0; j < LOFT_SAMPLES - 1; j += 1) {
        const v00 = s * LOFT_SAMPLES + j;
        const v10 = v00 + LOFT_SAMPLES;
        const i = r.indexCount;
        r.indices[i] = v00;
        r.indices[i + 1] = v10;
        r.indices[i + 2] = v00 + 1;
        r.indices[i + 3] = v00 + 1;
        r.indices[i + 4] = v10;
        r.indices[i + 5] = v10 + 1;
        r.indexCount += 6;
      }
    }
  }

  /**
   * Overlapping fronts (the advisor, 2026-09-30): the first front wins. A later front's strip whose footprint overlaps
   * an earlier front's kept strip is dropped, from the drawing, its mask and the contact alike, and counted. A footprint
   * is the convex hull of its two slices' lifted spans as drawn (from the start of the rest ramp behind the crest to
   * its end past the toe; the same in both modes, so both drop the same strips), so where two fronts only rest on the
   * water there is nothing to conflict (the advisor, 2026-10-01). A strip resting wholly on the water (no weight) is
   * the water: it gives way to any strip over it, and a lifted strip over it keeps its place; those drops are not
   * counted. A front's order is the records'. Only + − × ÷.
   */
  private dropOverlaps(): void {
    const r = this.result;
    const { corners, boxes } = this;
    // Each joined strip's corners and box, and each front's run of slices [start, end) with its box.
    const starts: number[] = [];
    const resting = (s: number) => !(r.sliceWeight[s] > 0) && !(r.sliceWeight[s + 1] > 0);
    for (let s = 0; s < r.sliceCount; s += 1) {
      if (s === 0 || r.sliceFront[s] !== r.sliceFront[s - 1]) starts.push(s);
      if (r.sliceJoined[s] !== 1) continue;
      for (let k = 0; k < 2; k += 1) {
        const slice = s + k;
        for (const [m, reach] of [[0, this.reachBack[slice]], [1, this.reachFront[slice]]] as const) {
          corners[8 * s + 4 * k + 2 * m] = this.anchorX[slice] + reach * r.sliceRayX[slice];
          corners[8 * s + 4 * k + 2 * m + 1] = this.anchorZ[slice] + reach * r.sliceRayZ[slice];
        }
      }
      boxes[4 * s] = Infinity;
      boxes[4 * s + 1] = -Infinity;
      boxes[4 * s + 2] = Infinity;
      boxes[4 * s + 3] = -Infinity;
      for (let c = 0; c < 4; c += 1) {
        boxes[4 * s] = Math.min(boxes[4 * s], corners[8 * s + 2 * c]);
        boxes[4 * s + 1] = Math.max(boxes[4 * s + 1], corners[8 * s + 2 * c]);
        boxes[4 * s + 2] = Math.min(boxes[4 * s + 2], corners[8 * s + 2 * c + 1]);
        boxes[4 * s + 3] = Math.max(boxes[4 * s + 3], corners[8 * s + 2 * c + 1]);
      }
    }
    if (starts.length < 2) return;
    starts.push(r.sliceCount);
    const frontBox = (f: number) => {
      const box = [Infinity, -Infinity, Infinity, -Infinity];
      for (let s = starts[f]; s < starts[f + 1]; s += 1) {
        if (r.sliceJoined[s] !== 1) continue;
        box[0] = Math.min(box[0], boxes[4 * s]);
        box[1] = Math.max(box[1], boxes[4 * s + 1]);
        box[2] = Math.min(box[2], boxes[4 * s + 2]);
        box[3] = Math.max(box[3], boxes[4 * s + 3]);
      }
      return box;
    };
    const apart = (a: ArrayLike<number>, i: number, b: ArrayLike<number>, j: number) =>
      a[i + 1] < b[j] || b[j + 1] < a[i] || a[i + 3] < b[j + 2] || b[j + 3] < a[i + 2];
    for (let later = 1; later + 1 < starts.length; later += 1) {
      for (let earlier = 0; earlier < later; earlier += 1) {
        // Fronts apart are skipped whole; the earlier front's box shrinks as its own strips are dropped, so it is taken now.
        if (apart(frontBox(later), 0, frontBox(earlier), 0)) continue;
        for (let s = starts[later]; s < starts[later + 1]; s += 1) {
          if (r.sliceJoined[s] !== 1) continue;
          for (let t = starts[earlier]; t < starts[earlier + 1]; t += 1) {
            if (r.sliceJoined[t] !== 1 || apart(boxes, 4 * s, boxes, 4 * t) || !this.hullsOverlap(8 * s, 8 * t)) continue;
            // A resting strip is the water: a lifted one over an earlier resting one keeps its place, and the water goes.
            if (!resting(s) && resting(t)) {
              r.sliceJoined[t] = 0;
              continue;
            }
            r.sliceJoined[s] = 0;
            if (resting(s)) break;
            r.overlaps += 1;
            // A dropped strip that held an open tube would show as a hole in a barrel (the advisor: report it), as
            // high as its weight lifts it.
            const weight = Math.max(r.sliceWeight[s], r.sliceWeight[s + 1]);
            const open = (r.slicePhase[s] === 1 && r.sliceOverturned[s] === 1) || (r.slicePhase[s + 1] === 1 && r.sliceOverturned[s + 1] === 1);
            if (open && weight > 0) {
              r.overlapsOpen += 1;
              r.overlapOpenWeight = Math.max(r.overlapOpenWeight, weight);
            }
            break;
          }
        }
      }
    }
  }

  /**
   * Whether two strips' footprints overlap: the convex hulls of their four corners each (at `a` and `b` in `corners`),
   * by separating axes; every pair of a hull's corners gives an axis, the hull's edges among them.
   */
  private hullsOverlap(a: number, b: number): boolean {
    const c = this.corners;
    for (let hull = 0; hull < 2; hull += 1) {
      const base = hull === 0 ? a : b;
      for (let i = 0; i < 4; i += 1) {
        for (let j = i + 1; j < 4; j += 1) {
          // The axis across corners i and j.
          const ax = c[base + 2 * i + 1] - c[base + 2 * j + 1];
          const az = c[base + 2 * j] - c[base + 2 * i];
          if (ax === 0 && az === 0) continue;
          let minA = Infinity;
          let maxA = -Infinity;
          let minB = Infinity;
          let maxB = -Infinity;
          for (let k = 0; k < 4; k += 1) {
            const pa = c[a + 2 * k] * ax + c[a + 2 * k + 1] * az;
            const pb = c[b + 2 * k] * ax + c[b + 2 * k + 1] * az;
            minA = Math.min(minA, pa);
            maxA = Math.max(maxA, pa);
            minB = Math.min(minB, pb);
            maxB = Math.max(maxB, pb);
          }
          // Touching is apart: half-open strips share no point along an edge.
          if (maxA <= minB || maxB <= minA) return false;
        }
      }
    }
    return true;
  }

  /** Each vertex's normal: across the profile × along the front, by central differences (one-sided at the edges). */
  private normals(firstSlice: number, lastSlice: number): void {
    const { positions: p, normals } = this.result;
    for (let s = firstSlice; s <= lastSlice; s += 1) {
      const sBack = Math.max(firstSlice, s - 1);
      const sAhead = Math.min(lastSlice, s + 1);
      for (let j = 0; j < LOFT_SAMPLES; j += 1) {
        const jBack = Math.max(0, j - 1);
        const jAhead = Math.min(LOFT_SAMPLES - 1, j + 1);
        const a0 = 3 * (s * LOFT_SAMPLES + jBack);
        const a1 = 3 * (s * LOFT_SAMPLES + jAhead);
        const b0 = 3 * (sBack * LOFT_SAMPLES + j);
        const b1 = 3 * (sAhead * LOFT_SAMPLES + j);
        const ax = p[a1] - p[a0];
        const ay = p[a1 + 1] - p[a0 + 1];
        const az = p[a1 + 2] - p[a0 + 2];
        const bx = p[b1] - p[b0];
        const by = p[b1 + 1] - p[b0 + 1];
        const bz = p[b1 + 2] - p[b0 + 2];
        let cx = ay * bz - az * by;
        let cy = az * bx - ax * bz;
        let cz = ax * by - ay * bx;
        const length = Math.sqrt(cx * cx + cy * cy + cz * cz);
        if (length > 1e-12) {
          cx /= length;
          cy /= length;
          cz /= length;
        } else {
          cx = 0;
          cy = 1;
          cz = 0;
        }
        const o = 3 * (s * LOFT_SAMPLES + j);
        normals[o] = cx;
        normals[o + 1] = cy;
        normals[o + 2] = cz;
      }
    }
  }
}
