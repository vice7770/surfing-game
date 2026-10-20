/**
 * The spilling lip (the Canyon spilling lip, docs/research/canyon-lip-2026-10-11; the owner's playtest, 2026-10-11: "I
 * don't want the wave to become white then have the spilling"): at a spilling spot each wave's crest tips forward as a
 * small rolling lip that falls down the face just behind its spilling front's tip, and the white follows it.
 *
 * Along a steady peel every point of the crest holds the same 2D break at a different age (along-the-crest.md), the age
 * τ since the spilling front reached a column (`SpillingFront`). Going back from the front's tip:
 * - the shoulder, clean green water;
 * - the curl, growing from nothing to touchdown at τ_i = 0.6 √H s: green, no air until it lands (the separator);
 * - the curl collapsing over `fillSeconds` as its void fills, whitening from where it landed;
 * - the white, growing down the face from the landing line to the face's foot `toeSeconds` after touchdown.
 *
 * Its shape is Pick & Feddersen's (2026) overturn (`Overturn.ts`) for the bed the crest climbs, provisional until a
 * high-resolution Basilisk run of the Canyon's break: surf-scale spillers do overturn (Deike, Melville & Popinet 2015).
 * Its lower branch is the solver's face, which cannot overturn (a 1 m height field), so the curl is a look-only ribbon
 * over it, as spray is: no collision, and the water, the roller lens and everything the rider feels are untouched.
 *
 * It reads the front, the roller's lenses and the solver after each step, and keeps per column what it draws:
 * - `share`: the share of the whitewater drawn (S2's `drawn`, so the foam it makes), none before touchdown;
 * - `drawBand`: the roller's band as drawn, cut to the same white in the table's copy the looks read (S3's band);
 * - `writeCurls`: the curl's slices for the snapshot (`CURL_FIELD`), which `SpillingCurlMesh` lofts.
 */
import { orthogonalGradient, overturn, overturnParameter, overturnSize, type OverturnShape } from './Overturn';
import type { SpillingDrawnLook, SpillingFront } from './SpillingFront';
import {
  ROLLER_DEFAULTS, ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE, SectionReader, createLensView, createSection, type RollerGrid, type SpillingRoller,
} from './SpillingRoller';
import { OPEN_EDGE_REACH } from './ShallowWaterSolver';
import { GRAVITY } from './dispersion';
import type { LipImpact } from './SprayCloud';

/** The curl's clock and look (the advisor's findings, 2026-10-11; the owner's choices the same day). */
export const SPILLING_CURL = {
  /**
   * Touchdown τ_i = `impactClock` √H s after the front reaches a column: the barrel clock (along-the-crest.md, T ≈ 0.6 √H),
   * inside the advisor's 0.35–0.7 s for the Canyon at Medium from face-vertical to touchdown (inferred).
   */
  impactClock: 0.6,
  /** The closed void fills in about this long, s (along-the-crest.md: the collapsing tube from T to T + 0.5 s). */
  fillSeconds: 0.5,
  /**
   * The white's toe reaches the face's foot this long after touchdown, s: the owner's 2 s (2026-10-11), at the low end
   * of the advisor's sourced 2–3.5 s (the roller's development over 5–8 h_b, Svendsen 1984).
   */
  toeSeconds: 2,
  /** Past the foot the toe runs on for this long, s, before the whole face is drawn as felt (P). */
  tailSeconds: 0.5,
  /**
   * The band lights up where the lip lands over this long, s, to its full drawn scale (P): a bright white patch on touchdown
   * (fresh foam averages about 41 % reflectance over its first second; the advisor), not the felt lens's slow development.
   */
  flashSeconds: 0.15,
  /** The white's edges are drawn soft over this many metres: half the solver's 1 m rows, so a row takes it in (P). */
  soft: 0.5,
  /**
   * The overturn's ψ0 is held to the advisor's span for the Canyon's fan face, 1:50 to 1:30 under H0/h0 = 0.28 (curl
   * 0.23–0.33 H high): downcoast the fan grows gentler (1:60–1:95 at the break line, curls under 0.2 H) and the arm's
   * upcoast end and the beach face steeper (1:25, 0.41 H), both outside the owner's "about ¼ of the wave height"
   * (provisional, with the shape, until the Basilisk run).
   */
  psi: { min: overturnParameter(1 / 50, 0.28), max: overturnParameter(1 / 30, 0.28) },
  /** The drawn air reaches its full void fraction under foam this thick (the air is drawn where the drawn foam is; P). */
  airFoam: 0.5,
  /** A column the curl has no lens or section for takes this H, as a share of the breaker height (P). */
  nominalShare: 0.8,
  /** The curl's direction is held within this of the shore's normal, rad (30°; the Canyon's crests run within about 15°; P). */
  maxTurn: Math.PI / 6,
  /**
   * The splash where it lands (the advisor, round 2: a LipImpact, drawn spray only): the share of the lip's jet that
   * splashes up (`SPLASH_UP.share`, the plunging lip's), going on at about the breaker celerity and coming down at
   * `splashFall` m/s (2.5–4 m/s at the tip; P).
   */
  splashShare: 0.3,
  splashFall: 3.2,
  /**
   * The lip is no thinner than this share of H (the advisor: about 0.05 H; 0.13–0.15 m at Big): Pick & Feddersen's jet
   * over the void's arc gives 0.036 H at 1:50 and 0.06 H at 1:30.
   */
  minLip: 0.052,
  /**
   * The unbroken shoulder ahead of each front is cleared of drawn lace (the owner, 2026-10-11: "the shoulder ahead stays
   * clean green water, no foam at all"; the coordinator's ruling, round 3), as the breakers' shoreward surface drift
   * clears a face in nature (Hansen & Svendsen 1984), which neither the depth-averaged foam nor its drift does at Big:
   * - along the wave's crest line ahead of its front, `shoulderReach` m, fading in over `shoulderFade` m from the front;
   * - across shore from `shoulderBack` m behind the crest to `shoulderAhead` m ahead of it (no less than
   *   `shoulderAheadHeights` breaker heights: the face and the water ahead the crest is about to run over), fading over
   *   `shoulderFade` m at both ends;
   * - the lace there fades with an e-folding time of `shoulderClear` s, so it never pops or flickers.
   * The crest line is followed column by column as the highest water within `shoulderTrack` m of the last column's,
   * until the water there stands less than `shoulderCrest` of the front's crest above still water (the shoulder has
   * ended). All P.
   */
  shoulderReach: 30,
  shoulderFade: 3,
  shoulderBack: 2,
  shoulderAhead: 12,
  shoulderAheadHeights: 5,
  shoulderClear: 0.1,
  shoulderTrack: 2,
  shoulderCrest: 0.3,
} as const;

/**
 * Where the lip lands, as a share of H ahead of the crest: Pick & Feddersen's far end, their 1:30 fit's L cos θ at
 * H0/h0 0.28 (0.60 H). The coordinator's ruling (round 2): the drawn face is gentler than the overturning one, so the
 * lip lands as far out as the fits allow and the void's missing height is drawn as contrast, not geometry.
 */
export const LANDING_SHARE = (() => {
  const shape = overturn(SPILLING_CURL.psi.max);
  const { length } = overturnSize(shape, 1);
  return length * Math.cos(shape.tilt);
})();

/** The most curl slices a snapshot carries (`writeCurls`): about seven columns per wave, eight waves at once. */
export const CURL_CAPACITY = 56;
/** Floats per curl slice. */
export const CURL_STRIDE = 13;
/** Where each value sits in a curl slice (`writeCurls`). */
export const CURL_FIELD = {
  /** The slice's place along shore, x, and its crest across shore, z, m. */
  x: 0,
  z: 1,
  /** The crest's top as drawn, y, m. */
  y: 2,
  /** The crest's normal n̂, toward the beach (horizontal, unit). */
  normalX: 3,
  normalZ: 4,
  /**
   * Where its lip lands, ahead of the crest along n̂, m (none at the front's slice); its void's height W at full growth,
   * less as the void fills, m; and the overturn's tilt, rad. The ribbon times the lip's flight from the slice's age.
   */
  length: 5,
  width: 6,
  tilt: 7,
  /** The lip's mean thickness, m. */
  thickness: 8,
  /** 0 green and clear … 1 white: how far its collapse has gone. */
  white: 9,
  /** The front wave's id: slices of one wave in neighbouring columns make one ribbon. */
  wave: 10,
  /** The wave's height H, m, and the slice's age τ, s. */
  height: 11,
  age: 12,
} as const;

/** Touchdown τ_i for a wave H m high, s. */
export function impactTime(height: number): number {
  return SPILLING_CURL.impactClock * Math.sqrt(height > 0 ? height : 0);
}

/** The curl's size at full growth for a wave H m high on a column's overturn, m: the void's length and height, and the lip. */
export interface CurlSize {
  /** The void's length along its axis, L, and its width across it, W, m (Pick & Feddersen's, `overturnSize`). */
  length: number;
  width: number;
  /** How far ahead of the crest the lip lands, L cos θ, m. */
  ahead: number;
  /** The lip's mean thickness: the jet's area A_J H² over the void's upper arc, about L + W long, m. */
  thickness: number;
}

export function curlSize(shape: OverturnShape, height: number): CurlSize {
  const { length, width } = overturnSize(shape, height);
  // The jet lies along the void's upper arc, about L + W: at 1:30 about 0.06 H thick (the advisor: about 0.05 H).
  return { length, width, ahead: length * Math.cos(shape.tilt), thickness: length > 0 ? (shape.jetArea * height * height) / (length + width) : 0 };
}

/** The curl at age τ: its growth share s (0 at the front … 1 at touchdown), how far its void has filled, and its white. */
export function curlStage(age: number, impact: number): { grown: number; filled: number; white: number } {
  const grown = impact > 0 ? Math.min(1, Math.max(0, age / impact)) : 1;
  const filled = Math.min(1, Math.max(0, (age - impact) / SPILLING_CURL.fillSeconds));
  return { grown, filled, white: filled };
}

/**
 * The drawn white's reach down the face `since` s after touchdown, m along it from the crest: from `top` (the void
 * filling up from the landing line to the crest; −∞ once full) to `bottom` (the toe, from the landing line to the
 * face's foot `toeSeconds` later, on at the same pace for `tailSeconds`). Before touchdown, none (`top` +∞).
 */
export function drawnReach(since: number, landing: number, foot: number, out: { top: number; bottom: number }): { top: number; bottom: number } {
  const { fillSeconds, toeSeconds } = SPILLING_CURL;
  if (!(since >= 0)) {
    out.top = Number.POSITIVE_INFINITY;
    out.bottom = Number.NEGATIVE_INFINITY;
    return out;
  }
  out.top = since < fillSeconds ? landing * (1 - since / fillSeconds) : Number.NEGATIVE_INFINITY;
  out.bottom = landing + ((foot > landing ? foot - landing : 0) * since) / toeSeconds;
  return out;
}

/** The drawn share at `below` m down the face from the crest, between `top` and `bottom`, its edges `soft` m wide. */
export function reachShare(below: number, top: number, bottom: number): number {
  const soft = SPILLING_CURL.soft;
  const upper = top === Number.NEGATIVE_INFINITY ? 1 : Math.min(1, Math.max(0, (below - top) / soft + 0.5));
  const lower = Math.min(1, Math.max(0, (bottom - below) / soft + 0.5));
  return upper * lower;
}

/** The solver fields the curl reads: the roller's grid (`RollerGrid`), here with its sampling. */
export interface CurlGrid extends RollerGrid {
  sampleCentered(field: ArrayLike<number>, x: number, z: number): number;
}

export interface SpillingCurlOptions {
  /** h_b, the still depth the swell breaks in, m, and its breaker height H_b, m. */
  breakerDepth: number;
  breakerHeight: number;
  /** The overturn fits' H0/h0: the incoming sea's height over the tank's offshore depth (as the plunging lip's). */
  nonlinearity: number;
}

/** No wave in a column. */
const NONE = -1;

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export class SpillingCurl implements SpillingDrawnLook {
  /** From this age on, s, every column's white is drawn as felt (the tallest wave's touchdown, the toe and its tail). */
  readonly span: number;
  /** Each column's overturn (`overturn` for the bed its crest climbs there, ψ0 held to `psi`) and the bed's gradient, rise over run. */
  readonly shapes: OverturnShape[];
  readonly gradient: Float64Array;
  /** Per column, at the last update: its youngest wave's age, s (NaN: none younger than `span`), and that wave's id. */
  readonly age: Float64Array;
  readonly wave: Int32Array;
  /** Its crest across shore (NaN: none found), the wave's height there, and its touchdown, s after its front reached it. */
  readonly crest: Float64Array;
  readonly height: Float64Array;
  readonly impact: Float64Array;
  /**
   * Down the face from the crest: where its lip lands, and the face's foot (the lens's toe), m. Taken across shore (the
   * Canyon's crests run within about 15° of the shore, n̂_z ≥ 0.97), so they never read the roller's normals, which its
   * handover leaves to its next step (S3 §5): a sea taken over draws its white as the donor does.
   */
  readonly landing: Float64Array;
  readonly foot: Float64Array;
  /** The crest's normal n̂, toward the beach: the roller lens's, for the curl's slices only. */
  readonly normalX: Float64Array;
  readonly normalZ: Float64Array;
  /**
   * The roller band's drawn table's ages at the last `drawBand` (slot-major, `nx` a slot): s since its wave's front
   * reached each column (NaN: no wave of the front's), for its fray's peel-side end (`frayBand`'s `PeelEnd`).
   */
  readonly bandAge: Float64Array;
  /**
   * Per cell, the share of its air drawn after the shoulder's clearing (`clearShoulder`): 1 off the shoulder, less on its
   * band, where the drawn whitewater is held back (round 5). The solver may break there before any onset joins it to a
   * wave, so no front owns those cells and their air, aerated from the felt whitewater, drew Rich's churn and plume on the
   * clean face ahead of the lip.
   */
  readonly shoulderAir: Float32Array;
  private readonly first: number;
  private readonly last: number;
  private readonly view = createLensView();
  private readonly reader = new SectionReader();
  private readonly section = createSection();
  private readonly reach = { top: 0, bottom: 0 };
  /** The H a column without a lens or a section takes, m. */
  private readonly nominal: number;

  constructor(private readonly grid: CurlGrid, readonly options: SpillingCurlOptions) {
    const { nx, nz, xCenters, zCenters, bed, restLevel } = grid;
    this.first = Math.min(nx, OPEN_EDGE_REACH);
    this.last = nx - this.first;
    this.nominal = SPILLING_CURL.nominalShare * options.breakerHeight;
    this.span = impactTime(2 * options.breakerHeight) + SPILLING_CURL.toeSeconds + SPILLING_CURL.tailSeconds;
    this.age = new Float64Array(nx).fill(Number.NaN);
    this.wave = new Int32Array(nx).fill(NONE);
    this.crest = new Float64Array(nx).fill(Number.NaN);
    this.height = new Float64Array(nx).fill(Number.NaN);
    this.impact = new Float64Array(nx).fill(Number.NaN);
    this.landing = new Float64Array(nx).fill(Number.NaN);
    this.foot = new Float64Array(nx).fill(Number.NaN);
    this.normalX = new Float64Array(nx);
    this.normalZ = new Float64Array(nx).fill(1);
    this.gradient = new Float64Array(nx);
    this.bandAge = new Float64Array(ROLLER_SLOTS * nx).fill(Number.NaN);
    this.shoulderAir = new Float32Array(nx * nz).fill(1);
    this.shapes = [];
    // Each column's bed along the waves' path (+z, the Canyon's straight crests) at the breaker depth: the gradient it
    // climbs (Mead & Black's band, as the reef break's), its overturn held to the span the advisor gave for the fan face.
    const hb = options.breakerDepth;
    for (let column = 0; column < nx; column += 1) {
      const x = xCenters[column];
      let row = 0;
      while (row < nz - 1 && restLevel - bed[row * nx + column] > hb) row += 1;
      const z = zCenters[row];
      const depthAhead = (s: number) => {
        const pz = z + s;
        return pz < zCenters[0] || pz > zCenters[nz - 1] ? Number.NaN : restLevel - grid.sampleCentered(bed, x, pz);
      };
      const measured = orthogonalGradient(depthAhead, hb, 0.5, 60);
      this.gradient[column] = measured > 0 ? measured : 0;
      const psi = overturnParameter(this.gradient[column], options.nonlinearity);
      this.shapes.push(overturn(Math.min(SPILLING_CURL.psi.max, Math.max(SPILLING_CURL.psi.min, psi))));
    }
  }

  /**
   * Column `column`'s curl at full growth for a wave H m high, landing at Pick & Feddersen's far end (`LANDING_SHARE`), its
   * lip no thinner than `minLip` H.
   */
  size(column: number, height: number): CurlSize {
    const size = curlSize(this.shapes[Math.min(this.grid.nx - 1, Math.max(0, column))], height);
    size.ahead = LANDING_SHARE * height;
    size.thickness = Math.max(size.thickness, SPILLING_CURL.minLip * height);
    return size;
  }

  /**
   * The splashes where curls landed in the latest update (`LipImpact`s, kind 1: splash-up): for the drawn spray only,
   * never the water, the foam's air or the sound. One per column whose lip touched down that step.
   */
  readonly splashes: LipImpact[] = [];

  /**
   * After the front's and the roller's step: each column's youngest wave behind its front (the age S2 counts its ramp
   * from: since its front reached the column or its onset joined there, whichever came later), and that wave's crest,
   * height, normal, landing line and foot, from its roller lens there or, without one, a section of the solver's surface
   * at its S2 crest. It keeps nothing from step to step: a sea taken over rebuilds it from its front and lenses.
   */
  update(time: number, dt: number, front: SpillingFront, roller: SpillingRoller | undefined, strength: ArrayLike<number>): void {
    const { grid, first, last, view, section } = this;
    const { age, wave } = this;
    this.splashes.length = 0;
    age.fill(Number.NaN);
    wave.fill(NONE);
    const waves = front.waves;
    for (let k = 0; k < waves.length; k += 1) {
      const { reached, joinedAt } = waves[k];
      for (let column = first; column < last; column += 1) {
        const r = reached[column];
        const j = joinedAt[column];
        if (!(r === r && j === j)) continue;
        const a = time - (r > j ? r : j);
        if (!(a >= 0 && a < this.span)) continue;
        if (age[column] <= a) continue;
        age[column] = a;
        wave[column] = k;
      }
    }
    for (let column = first; column < last; column += 1) {
      const k = wave[column];
      if (k === NONE) continue;
      const id = waves[k].id;
      let crest = Number.NaN;
      let height = Number.NaN;
      let length = Number.NaN;
      let nx = 0;
      let nz = 1;
      if (roller?.lensOf(column, id, view)) {
        crest = view.crest;
        height = view.height;
        length = view.length;
        nx = view.normalX;
        nz = view.normalZ;
      } else {
        const seed = waves[k].crest[column];
        if (seed === seed && this.reader.read(grid, column, seed, 'seed', 12, 12, 2, strength, section)) {
          crest = section.crest;
          height = section.height;
          length = section.toe - section.crest;
        }
      }
      const h = height > 0 ? height : this.nominal;
      // The curl falls down the face toward the beach: a lens's normal, fitted over a few columns, swings along shore
      // where a crest kinks or breaks again, so it is held within `maxTurn` of +z.
      const turn = Math.atan2(nx, nz > 0 ? nz : 0);
      const held = Math.min(SPILLING_CURL.maxTurn, Math.max(-SPILLING_CURL.maxTurn, turn));
      this.crest[column] = crest;
      this.normalX[column] = Math.sin(held);
      this.normalZ[column] = Math.cos(held);
      this.height[column] = h;
      this.impact[column] = impactTime(h);
      this.landing[column] = this.size(column, h).ahead;
      // The face's foot: the lens's toe, its length L_r, or, unset, the stage's at birth (H / tan θ_s, Martins et al. 2018).
      const toe = length > 0 ? length : h / ROLLER_DEFAULTS.tanBirth;
      this.foot[column] = Math.max(this.landing[column] + SPILLING_CURL.soft, toe);
      // Touched down this step: its splash, the share of its jet that splashes up, on at the breaker celerity.
      const since = age[column] - this.impact[column];
      if (dt > 0 && crest === crest && since >= 0 && since < dt) {
        const shape = this.shapes[column];
        const celerity = Math.sqrt(GRAVITY * this.options.breakerDepth);
        const volume = SPILLING_CURL.splashShare * shape.jetArea * h * h * grid.dx;
        const n = this.landing[column];
        this.splashes.push({
          x: grid.xCenters[column] + this.normalX[column] * n, z: crest + this.normalZ[column] * n, volume, whole: volume, kind: 1,
          vx: celerity * this.normalX[column], vy: -SPILLING_CURL.splashFall, vz: celerity * this.normalZ[column],
        });
      }
    }
  }

  /**
   * The share of a wave's whitewater drawn in `column`, `age` s after its front reached it, at z (S2's `drawn`): none
   * before its curl lands, then from the landing line, the void filling up to the crest, down to a toe that reaches the
   * face's foot `toeSeconds` later; all of it from `span` on, or once the toe's tail has run.
   */
  share(column: number, age: number, z: number): number {
    if (!(age < this.span)) return 1;
    let impact = this.impact[column];
    if (!(impact === impact)) impact = impactTime(this.nominal);
    const since = age - impact;
    if (since < 0) return 0;
    if (since >= SPILLING_CURL.toeSeconds + SPILLING_CURL.tailSeconds) return 1;
    const crest = this.crest[column];
    if (!(crest === crest)) return 1;
    const { top, bottom } = drawnReach(since, this.landing[column], this.foot[column], this.reach);
    return reachShare(z - crest, top, bottom);
  }

  /**
   * The roller's band as drawn (S3's table, `ROLLER_FIELD`, in the copy the looks read; the felt table is never
   * touched): each lens younger than `span` behind its front shows from its curl's landing line, the void filling up to
   * its crest, down to a toe that reaches the lens's own toe `toeSeconds` after touchdown; before touchdown, none. Once
   * landed it is drawn at full scale (over `flashSeconds`): the felt lens's scale grows with its travel (over 6.5 h_b,
   * about 2.5 s), which drew the landing faint; by `span` the felt scale has grown to it. Each column's age is kept in
   * `bandAge` for the band's fray.
   */
  drawBand(table: Float32Array, front: SpillingFront, roller: SpillingRoller, time: number): void {
    const { nx } = this.grid;
    const waves = front.waves;
    const reach = this.reach;
    this.bandAge.fill(Number.NaN);
    for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
      for (let column = 0; column < nx; column += 1) {
        const o = (slot * nx + column) * ROLLER_STRIDE;
        if (!(table[o + ROLLER_FIELD.scale] > 0)) continue;
        const id = roller.tableWave(column, slot);
        if (id < 0) continue;
        let k = waves.length - 1;
        while (k >= 0 && waves[k].id !== id) k -= 1;
        if (k < 0) continue;
        const r = waves[k].reached[column];
        const j = waves[k].joinedAt[column];
        if (!(r === r)) continue;
        const age = time - (j === j && j > r ? j : r);
        this.bandAge[slot * nx + column] = age;
        if (!(age < this.span)) continue;
        const own = this.wave[column] !== NONE && waves[this.wave[column]].id === id;
        const impact = own ? this.impact[column] : impactTime(this.nominal);
        const since = age - impact;
        if (since < 0) {
          table[o + ROLLER_FIELD.scale] = 0;
          continue;
        }
        const flash = Math.min(1, since / SPILLING_CURL.flashSeconds);
        if (table[o + ROLLER_FIELD.scale] < flash) table[o + ROLLER_FIELD.scale] = flash;
        if (since >= SPILLING_CURL.toeSeconds + SPILLING_CURL.tailSeconds) continue;
        const length = table[o + ROLLER_FIELD.length];
        const landing = own ? this.landing[column] : this.size(column, this.nominal).ahead;
        drawnReach(since, landing, length, reach);
        const top = reach.top > 0 ? reach.top : 0;
        const bottom = Math.min(length, reach.bottom);
        if (!(bottom - top > 0.05)) {
          table[o + ROLLER_FIELD.scale] = 0;
          continue;
        }
        table[o + ROLLER_FIELD.crest] += top;
        table[o + ROLLER_FIELD.length] = bottom - top;
      }
    }
  }

  /**
   * The curls as drawn (`CURL_FIELD`, `CURL_STRIDE` floats a slice), at most CURL_CAPACITY: a slice in every column
   * whose wave's curl is still standing (from its front, growing to touchdown, to its void filled), and one at each such
   * wave's front, the curl's start, where it is nothing yet. `heightAt` is the water's surface as drawn. Returns how many.
   */
  writeCurls(into: Float32Array, front: SpillingFront, heightAt: (x: number, z: number) => number): number {
    const { grid, first, last } = this;
    const { xCenters } = grid;
    const capacity = Math.min(CURL_CAPACITY, Math.floor(into.length / CURL_STRIDE));
    const waves = front.waves;
    let count = 0;
    const put = (x: number, z: number, nx: number, nz: number, size: CurlSize, tilt: number, grown: number, filled: number, id: number, height: number, age: number) => {
      const o = count * CURL_STRIDE;
      into[o + CURL_FIELD.x] = x;
      into[o + CURL_FIELD.z] = z;
      into[o + CURL_FIELD.y] = heightAt(x, z);
      into[o + CURL_FIELD.normalX] = nx;
      into[o + CURL_FIELD.normalZ] = nz;
      // The front's slice (grown 0) is nothing; every other slice carries its curl's full size, timed by its age.
      into[o + CURL_FIELD.length] = grown > 0 ? size.ahead : 0;
      into[o + CURL_FIELD.width] = grown > 0 ? size.width * (1 - filled) : 0;
      into[o + CURL_FIELD.tilt] = tilt;
      into[o + CURL_FIELD.thickness] = grown > 0 ? size.thickness : 0;
      into[o + CURL_FIELD.white] = filled;
      into[o + CURL_FIELD.wave] = id;
      into[o + CURL_FIELD.height] = height;
      into[o + CURL_FIELD.age] = age;
      count += 1;
    };
    for (let k = 0; k < waves.length && count < capacity; k += 1) {
      const id = waves[k].id;
      // The column nearest the wave's front among its standing curl's, for the start's frame.
      let nearest = NONE;
      for (let column = first; column < last && count < capacity; column += 1) {
        if (this.wave[column] !== k) continue;
        const crest = this.crest[column];
        const age = this.age[column];
        const impact = this.impact[column];
        if (!(crest === crest) || !(age <= impact + SPILLING_CURL.fillSeconds)) continue;
        const { grown, filled } = curlStage(age, impact);
        const height = this.height[column];
        put(xCenters[column], crest, this.normalX[column], this.normalZ[column], this.size(column, height), this.shapes[column].tilt,
          grown, filled, id, height, age);
        if (nearest === NONE || Math.abs(xCenters[column] - waves[k].frontX) < Math.abs(xCenters[nearest] - waves[k].frontX)) nearest = column;
      }
      if (nearest === NONE || count >= capacity) continue;
      // The curl starts at the front: a slice of nothing there, in the frame of the standing column nearest it.
      const x = waves[k].frontX;
      if (!(Math.abs(x - xCenters[nearest]) <= 1.5 * grid.dx) || x === xCenters[nearest]) continue;
      put(x, this.crest[nearest], this.normalX[nearest], this.normalZ[nearest], this.size(nearest, this.height[nearest]), this.shapes[nearest].tilt,
        0, 0, id, this.height[nearest], 0);
    }
    return count;
  }

  /**
   * Clears the drawn lace on each wave's unbroken shoulder ahead of its front (`SPILLING_CURL.shoulder*`), in the drawn
   * foam's own fields before their step, and holds back the drawn whitewater there (`drawn`: the solver's weak breaking
   * ahead of a front that no onset has joined to a wave yet, which no band holds), and its drawn air (`shoulderAir`, read
   * by `airShare`): never felt (the foam is drawn only, and the bores the air reads are not its values). Behind each
   * front nothing changes, so the broken part's whitewater and its lace trail are as they were; nor where another wave
   * breaks further along the crest, which ends the shoulder.
   */
  clearShoulder(foam: { readonly dense: Float64Array; readonly residual: Float64Array }, drawn: Float64Array | undefined,
    front: SpillingFront, dt: number): void {
    if (!(dt > 0)) return;
    const { grid, first, last, shoulderAir } = this;
    const { nx, nz, dx, xCenters, zCenters, h, bed, restLevel } = grid;
    shoulderAir.fill(1);
    const curl = SPILLING_CURL;
    const height = this.options.breakerHeight;
    const ahead = Math.max(curl.shoulderAhead, curl.shoulderAheadHeights * height);
    const fade = curl.shoulderFade;
    const clear = 1 - Math.exp(-dt / curl.shoulderClear);
    const direction = front.options.direction;
    const reach = Math.round(curl.shoulderReach / dx);
    // The first row at or past z (a binary search: the rows stretch offshore).
    const rowOf = (z: number) => {
      let low = 0;
      let high = nz - 1;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (zCenters[middle] < z) low = middle + 1;
        else high = middle;
      }
      return low;
    };
    // The highest water within `window` m of z in column c, by rows (the rows are 1 m in the break zone): its z and level.
    const highest = (c: number, z: number, window: number) => {
      let best = -Infinity;
      let at = Number.NaN;
      for (let iz = rowOf(z - window); iz < nz; iz += 1) {
        const zz = zCenters[iz];
        if (zz > z + window) break;
        const i = iz * nx + c;
        const level = h[i] + bed[i];
        if (level > best) {
          best = level;
          at = zz;
        }
      }
      return { z: at, level: best };
    };
    for (const wave of front.waves) {
      // The crest at the front: the wave's own crest in the last columns it has reached, the highest water near it.
      const frontColumn = Math.round((wave.frontX - xCenters[0]) / dx);
      let crestZ = Number.NaN;
      let crestLevel = 0;
      for (let d = 0; d <= 6 && !(crestZ === crestZ); d += 1) {
        const c = frontColumn - direction * d;
        if (c < 0 || c >= nx) continue;
        const z = wave.crest[c];
        if (!(z === z)) continue;
        const found = highest(c, z, curl.shoulderTrack + 1);
        crestZ = found.z;
        crestLevel = Math.max(0.05, curl.shoulderCrest * (found.level - restLevel));
      }
      if (!(crestZ === crestZ)) continue;
      for (let d = 1; d <= reach; d += 1) {
        const c = frontColumn + direction * d;
        if (c < first || c >= last) break;
        const crest = highest(c, crestZ, curl.shoulderTrack);
        if (!(crest.level - restLevel >= crestLevel)) break;
        crestZ = crest.z;
        const along = smooth(0, fade, Math.abs(xCenters[c] - wave.frontX));
        const from = crestZ - curl.shoulderBack - fade;
        const to = crestZ + ahead + fade;
        // Another wave broken on this stretch (a second break along the crest, its front past here): its own whitewater,
        // so the shoulder ends here (round 4). Where another wave's break is still ahead of its own front, its white is
        // withheld: shoulder still.
        if (front.waves.some((other) => other !== wave && other.reached[c] === other.reached[c] && other.crest[c] >= from
          && other.crest[c] <= to)) break;
        for (let iz = rowOf(from); iz < nz && zCenters[iz] <= to; iz += 1) {
          const z = zCenters[iz];
          const shoulder = along * smooth(from, from + fade, z) * (1 - smooth(to - fade, to, z));
          const keep = 1 - shoulder * clear;
          const i = iz * nx + c;
          foam.dense[i] *= keep;
          foam.residual[i] *= keep;
          if (drawn) drawn[i] *= 1 - shoulder;
          if (shoulderAir[i] > 1 - shoulder) shoulderAir[i] = 1 - shoulder;
        }
      }
    }
  }

  /**
   * The share of cell `cell`'s air drawn where the drawn foam covers `foam` of the surface: in a column whose curl is
   * young (younger than `span`), air shows only under drawn whitewater, none under a curl yet to land; on a shoulder,
   * as far as its whitewater is drawn (`shoulderAir`); elsewhere all of it, so a developed bore draws its air as before.
   */
  airShare(cell: number, foam: number): number {
    const age = this.age[cell % this.grid.nx];
    const shoulder = this.shoulderAir[cell];
    if (!(age === age)) return shoulder;
    return Math.min(shoulder, Math.max(0, foam / SPILLING_CURL.airFoam));
  }
}
