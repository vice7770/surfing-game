import { LANDMARK, PROFILE_POINTS, type BarrelCase, type FrameBlend } from './ProfileLibrary';

/**
 * The lip as a thin sheet and the tube's inside, per profile (the Padang Padang spec, item 16; tube-colour-fix.md; the
 * advisor's rulings, 2026-10-01): the lip's thickness across, what its far side sees, and what the inner face sees.
 * Exact per profile (`sheetAcross`, `throatViews`), and kept per library frame so a slice only blends them
 * (`sheetTablesLookup`). Only + − × ÷ √.
 */

const LAST = PROFILE_POINTS - 1;

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
 * The dark throat's lip (the Rich look; the advisor's rulings, 2026-10-01): the profile points over whose sheet the lip's
 * mean thickness is taken, for the light it lets through onto the inner face (the outer run's middle, clear of the
 * crest's root and the tip) [provisional].
 */
export const THROAT = { thicknessFrom: 40, thicknessTo: 60 } as const;

/**
 * The view factor, in the slice's plane, of the directions sweeping counter-clockwise from (ax, ay) to (bx, by) (under
 * half a turn apart), from a surface whose unit normal is (nx, ny): ½(sin θ2 − sin θ1), θ from the normal, the arc held
 * to the half-plane the surface faces. Exact for extruded geometry. Only + − × ÷ √.
 */
export function arcView(nx: number, ny: number, ax: number, ay: number, bx: number, by: number): number {
  const la = Math.sqrt(ax * ax + ay * ay);
  const lb = Math.sqrt(bx * bx + by * by);
  if (!(la > 0 && lb > 0)) return 0;
  // The arc's ends in the normal's frame: (cos, sin) of their angle from it.
  const c1 = (nx * ax + ny * ay) / la;
  const s1 = (nx * ay - ny * ax) / la;
  const c2 = (nx * bx + ny * by) / lb;
  const s2 = (nx * by - ny * bx) / lb;
  // The surface sees from −90° (0, −1) to +90° (0, 1). A direction (c, s) lies in the arc when it is counter-clockwise of
  // its first end and not of its second: c1 s − s1 c ≥ 0 and c s2 − s c2 ≥ 0, which for (0, −1) reads −c1 ≥ 0 and
  // c2 ≥ 0, and for (0, 1) c1 ≥ 0 and −c2 ≥ 0.
  const from = c1 >= 0 ? s1 : c2 >= 0 ? -1 : Number.NaN;
  const to = c2 >= 0 ? s2 : c1 >= 0 ? 1 : Number.NaN;
  if (from !== from || to !== to) return 0;
  return to > from ? (to - from) / 2 : 0;
}

/**
 * The share of the sky seen through a tube's opening from a point on a surface, in the slice's plane (x along the ray,
 * y up; the advisor's ruling, 2026-10-01): the view factor of the directions from the still water's horizon ahead,
 * (1, 0), up to the lip's tip as seen from (x, y), on the surface's unit normal (nx, ny) (`arcView`). Exact for an
 * extruded tube, where rays below the horizon meet the water and those above the tip the lip. 0 when the tip is not
 * above the point.
 */
export function tubeSkyView(x: number, y: number, nx: number, ny: number, tipX: number, tipY: number): number {
  return tipY - y > 0 ? arcView(nx, ny, 1, 0, tipX - x, tipY - y) : 0;
}

/**
 * The tube's inside as its inner face sees it (the Padang Padang spec, item 16's dark throat; the advisor's rulings,
 * 2026-10-01), per profile point from the tip back under the lip to the throat and down the face to the toe (64–112),
 * into `out` (4 a point): the sky through the opening (`tubeSkyView`); the lip's underside, from the face only (the arc
 * from the tip up to the throat, `arcView`); and 1. Elsewhere the open sky, no lip, 0. The normals are the profile's,
 * out of the water.
 */
export function throatViews(profile: Float32Array, out: Float32Array): void {
  const { lip, throat, toe } = LANDMARK;
  const tipX = profile[2 * lip];
  const tipY = profile[2 * lip + 1];
  const throatX = profile[2 * throat];
  const throatY = profile[2 * throat + 1];
  for (let i = 0; i < PROFILE_POINTS; i += 1) {
    const o = 4 * i;
    if (i < lip || i > toe) {
      out[o] = 1;
      out[o + 1] = 0;
      out[o + 2] = 0;
      continue;
    }
    const a = i > 0 ? i - 1 : i;
    const b = i < LAST ? i + 1 : i;
    const dx = profile[2 * b] - profile[2 * a];
    const dy = profile[2 * b + 1] - profile[2 * a + 1];
    const length = Math.sqrt(dx * dx + dy * dy);
    const x = profile[2 * i];
    const y = profile[2 * i + 1];
    const nx = length > 0 ? -dy / length : 0;
    const ny = length > 0 ? dx / length : 1;
    out[o] = tubeSkyView(x, y, nx, ny, tipX, tipY);
    // The lip from the face: the arc from the tip up round to the throat, counter-clockwise as seen from the point.
    const ux = tipX - x;
    const uy = tipY - y;
    const vx = throatX - x;
    const vy = throatY - y;
    out[o + 1] = i > throat && ux * vy - uy * vx > 0 ? arcView(nx, ny, ux, uy, vx, vy) : 0;
    out[o + 2] = 1;
  }
}

/**
 * The chord `polylineChords` reports where the sun's light crosses no water to reach a point, or more water than the
 * height field's own crest-light march reads (its last sample, 6 m, `CREST_SAMPLES`): past it the march finds no crest
 * and the light is none [provisional: a render constant, as the march's reach].
 */
export const NO_CHORD = 8;

/** Height bins a polyline's segments are filed in for `polylineChords`, so a point tests about a dozen, not all of them. */
const CHORD_BINS = 16;
/** The most points a polyline `polylineChords` reads may have: a loft slice, its profile and its extensions. */
const CHORD_POINTS = 2 * PROFILE_POINTS;
const chordSegments = new Int32Array(CHORD_BINS * CHORD_POINTS);
const chordStart = new Int32Array(CHORD_BINS + 1);
const chordFill = new Int32Array(CHORD_BINS);
const chordBins = { low: 0, scale: 0 };

function chordBin(y: number): number {
  const b = Math.floor((y - chordBins.low) * chordBins.scale);
  return b < 0 ? 0 : b >= CHORD_BINS ? CHORD_BINS - 1 : b;
}

/** Files the polyline's `n` points' segments by the heights they span (`chordBin`), for `chordAt`. */
function fileChordSegments(line: Float32Array, n: number): void {
  let low = Infinity;
  let high = -Infinity;
  for (let i = 0; i < n; i += 1) {
    const y = line[2 * i + 1];
    low = y < low ? y : low;
    high = y > high ? y : high;
  }
  chordBins.low = low;
  chordBins.scale = high > low ? CHORD_BINS / (high - low) : 0;
  chordStart.fill(0);
  chordFill.fill(0);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let k = 0; k + 1 < n; k += 1) {
      const y0 = line[2 * k + 1];
      const y1 = line[2 * k + 3];
      if (y0 === y1) continue;
      const to = chordBin(y0 < y1 ? y1 : y0);
      for (let b = chordBin(y0 < y1 ? y0 : y1); b <= to; b += 1) {
        if (pass === 0) chordStart[b + 1] += 1;
        else chordSegments[chordStart[b] + chordFill[b]++] = k;
      }
    }
    if (pass === 0) for (let b = 0; b < CHORD_BINS; b += 1) chordStart[b + 1] += chordStart[b];
  }
}

/** The crossings a point's line meets beyond it, for `waterAlong`: their distances, and whether each leaves the water. */
const hitDistance = new Float64Array(CHORD_POINTS);
const hitLeaves = new Uint8Array(CHORD_POINTS);

/**
 * The water the horizontal line through point i crosses beyond it, ahead (+x) or behind, m, once `fileChordSegments`
 * has filed the polyline: from the point if it starts `inside` the water, to where the line first leaves it, and then
 * each stretch from where it enters again to where it next leaves; a stretch it never leaves again (the sea beyond the
 * wave, which the sun, a little above the horizon, clears) is past its reach. `NO_CHORD` for a line that starts inside
 * and never leaves, or crosses that much water.
 */
function waterAlong(line: Float32Array, i: number, ahead: boolean, inside: boolean): number {
  const x = line[2 * i];
  const y = line[2 * i + 1];
  let hits = 0;
  const b = chordBin(y);
  for (let m = chordStart[b]; m < chordStart[b + 1]; m += 1) {
    const k = chordSegments[m];
    if (k === i || k + 1 === i) continue;
    const y0 = line[2 * k + 1];
    const y1 = line[2 * k + 3];
    if ((y0 - y) * (y1 - y) > 0 || y0 === y1) continue;
    const x0 = line[2 * k];
    const at = x0 + ((y - y0) / (y1 - y0)) * (line[2 * k + 2] - x0);
    const d = ahead ? at - x : x - at;
    if (!(d > 1e-6)) continue;
    // Walking away from the point, ahead a falling segment leaves the water and a rising one enters it; behind, the reverse.
    let h = hits++;
    while (h > 0 && hitDistance[h - 1] > d) {
      hitDistance[h] = hitDistance[h - 1];
      hitLeaves[h] = hitLeaves[h - 1];
      h -= 1;
    }
    hitDistance[h] = d;
    hitLeaves[h] = ahead === y1 < y0 ? 1 : 0;
  }
  const started = inside;
  let from = 0;
  let water = 0;
  let left = false;
  for (let h = 0; h < hits; h += 1) {
    if (inside && hitLeaves[h] === 1) {
      water += hitDistance[h] - from;
      inside = false;
      left = true;
    } else if (!inside && hitLeaves[h] === 0) {
      from = hitDistance[h];
      inside = true;
    }
  }
  return (started && !left) || water >= NO_CHORD ? NO_CHORD : water;
}

/**
 * Point i's chords into `out[2i]` (ahead, +x) and `out[2i + 1]` (behind), m (`waterAlong`), once `fileChordSegments` has
 * filed the polyline's `n` points: where the line rises through the point (the back, the lip's underside) the water lies
 * ahead of it, where it falls (the lip's outer face, the face) behind it, and the chord is the water toward that side,
 * so from the back wall of a tube it crosses the wall, the tube, and the lip where the lip hangs at the point's height.
 * A crest's top, walked over with the water under it, meets water on neither side but what lies beyond: 0 where nothing
 * does. The other side, and a level point that is no crest's top, are `NO_CHORD`.
 */
function chordAt(line: Float32Array, n: number, i: number, out: Float32Array): void {
  out[2 * i] = NO_CHORD;
  out[2 * i + 1] = NO_CHORD;
  const before = i > 0 ? i - 1 : i;
  const after = i + 1 < n ? i + 1 : i;
  const y = line[2 * i + 1];
  if (y > line[2 * before + 1] && y > line[2 * after + 1] && line[2 * after] > line[2 * before]) {
    out[2 * i] = waterAlong(line, i, true, false);
    out[2 * i + 1] = waterAlong(line, i, false, false);
    return;
  }
  const rise = line[2 * after + 1] - line[2 * before + 1];
  if (rise > 0) out[2 * i] = waterAlong(line, i, true, true);
  else if (rise < 0) out[2 * i + 1] = waterAlong(line, i, false, true);
}

/**
 * The water a horizontal line crosses toward the sun through a slice (look-fix round 1; the advisor's ruling, "the curl's
 * crest light at weight 0": the profile's own horizontal chord): for each of a polyline's `n` points (along the ray, up,
 * from the back to the front, the water under it), the water the line through it crosses beyond it, ahead along the ray
 * (`out[2i]`) and behind it (`out[2i + 1]`), m (`chordAt`). The loft reads it on each slice as drawn, so where the curl
 * rests toward the water the chords run on through the water it rests on. It is the height field's crest-light march
 * (`crestThickness`) through the slice, which the height field cannot give under a lifted curl, carried on past the
 * first gap a tube makes and up to a crest's top, where it ends at 0; the sun's horizontal path is the chord over the
 * cosine of its angle to the ray (the shader). Only + − × ÷.
 */
export function polylineChords(line: Float32Array, n: number, out: Float32Array): void {
  fileChordSegments(line, n);
  for (let i = 0; i < n; i += 1) chordAt(line, n, i, out);
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


/** One case's tables per frame: each point's thickness (h0) and far side's view, and how far the underside has formed. */
interface CaseTables {
  across: Float32Array;
  back: Float32Array;
  formed: Float32Array;
}

const tablesOf = new WeakMap<BarrelCase, CaseTables>();

/** A case's tables, built at its first use: `sheetAcross` on each frame in h0 (scale 1). */
function caseTables(c: BarrelCase): CaseTables {
  let tables = tablesOf.get(c);
  if (tables) return tables;
  const floats = 2 * PROFILE_POINTS;
  const count = c.frames.length / floats;
  tables = { across: new Float32Array(count * PROFILE_POINTS), back: new Float32Array(count * PROFILE_POINTS), formed: new Float32Array(count) };
  const profile = new Float32Array(floats);
  const across = new Float32Array(PROFILE_POINTS);
  const back = new Float32Array(PROFILE_POINTS);
  for (let f = 0; f < count; f += 1) {
    profile.set(c.frames.subarray(f * floats, (f + 1) * floats));
    across.fill(0);
    back.fill(0);
    tables.formed[f] = sheetAcross(profile, 1, across, back);
    tables.across.set(across, f * PROFILE_POINTS);
    tables.back.set(back, f * PROFILE_POINTS);
  }
  tablesOf.set(c, tables);
  return tables;
}

/** A slice's sheet, blended as its profile is (`ProfileLibrary.frameBlend`): per point, its thickness, m, and far side's view. */
export interface SheetLookup {
  across: Float32Array;
  back: Float32Array;
}

/** One table's value at point i, blended: each case's frames lerped, then the cases by weight. */
function blended(lower: Float32Array, upper: Float32Array, blend: FrameBlend, i: number): number {
  const lf = blend.lowerFrame * PROFILE_POINTS + i;
  const ln = blend.lowerNext * PROFILE_POINTS + i;
  const uf = blend.upperFrame * PROFILE_POINTS + i;
  const un = blend.upperNext * PROFILE_POINTS + i;
  const a = lower[lf] + blend.lowerShare * (lower[ln] - lower[lf]);
  const b = upper[uf] + blend.upperShare * (upper[un] - upper[uf]);
  return a + blend.weight * (b - a);
}

/**
 * A slice's lip thickness (m) and far side's view, blended from its cases' frames as its profile is
 * (`ProfileLibrary.frameBlend`), into `out`; returns how far its underside has formed. A blend's sheet is not exactly
 * the blended profile's, but at these shapes it is close (the advisor, 2026-10-01): over 321 blends of the library's
 * open frames, the red channel's transmission through the sheet differs by 1.2 % at the 99th percentile and 1.9 % at
 * most, the far side's view by 0.04 and 0.12 (a test holds them). Thickness scales with h0; the view is scale-free.
 * The inner face's views move faster with the shape (0.26 at worst blended), and cost little, so the loft takes them
 * exactly (`throatViews`).
 */
export function sheetTablesLookup(blend: FrameBlend, out: SheetLookup): number {
  const lower = caseTables(blend.lower);
  const upper = caseTables(blend.upper);
  for (let i = 0; i < PROFILE_POINTS; i += 1) {
    out.across[i] = blend.scale * blended(lower.across, upper.across, blend, i);
    out.back[i] = blended(lower.back, upper.back, blend, i);
  }
  const formedLower = lower.formed[blend.lowerFrame] + blend.lowerShare * (lower.formed[blend.lowerNext] - lower.formed[blend.lowerFrame]);
  const formedUpper = upper.formed[blend.upperFrame] + blend.upperShare * (upper.formed[blend.upperNext] - upper.formed[blend.upperFrame]);
  return formedLower + blend.weight * (formedUpper - formedLower);
}
