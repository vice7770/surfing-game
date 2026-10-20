import {
  BufferAttribute, DataTexture, FloatType, FrontSide, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshStandardMaterial, RGFormat,
  Vector2, Vector4,
  type Camera, type WebGLRenderer,
} from 'three';
import { BAND_LOOK_FIELD, BAND_LOOK_STRIDE } from '../wave/SpillingCurl';
import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE } from '../wave/SpillingRoller';
import { waterHeightPars } from './WaterSurface';
import { curlPixelScale } from './SpillingCurlMesh';
import { foamPatternPars } from './foamPattern';
import { CHURN_TILE, waterChurnPars } from './water/churnTexture';
import { waterCubicPars } from './water/cubicSurface';
import { BAND_THROUGH, foamLookMode } from './water/foamLook';
import { VIEW_TOWARD, hazeLandKey, hazeLandRoute, onHazeLandChange, withHazeLand } from './water/hazeLand';
import { horizonHazeUniforms } from './water/horizonHaze';
import { waterRollerPars } from './water/rollerGlsl';
import { ROLLER_LOOK } from './water/rollerLook';
import { DEV_TOOLS, devParam } from '../devTools';

/**
 * The roller front (the Canyon roller front, docs/research/roller-front-2026-10-22; the water-physics advisor's option e,
 * after the owner's playtest of 2026-10-22: "the foam is not good, just a white soft movement after the wave breaks"):
 * a tumbling wall of white along each spilling bore, drawn over the roller band as its own mesh and program, in Rich only.
 * Look only: it reads the roller's drawn table (`writeRoller`'s copy, with the band's look beside it) and the water's
 * heights, and writes nothing; nothing collides with it.
 *
 * Per slot and solver column a patch of quarter-metre sub-columns by `SECTION` points across. Its vertex
 * shader lays each point over the water as drawn (the Rich water's Catmull-Rom surface, `waterCubic`):
 * - its section: buried `bury` m at ξ = −0.3 (the band's rear taper), over the crest, down the face, and round a nose of
 *   radius `nose` H at the band's (wandering) toe that curls under the water;
 * - its lumps: upward from the felt top (the drawn water already stands the lens's ᾱ·t over the solver's), two octaves of
 *   the band's pcg3d value noise, σ = d′max × an envelope that peaks over ξ 0.5–0.9 (0.4 of it at the crest), capped at
 *   the lens's thickness t(ξ); radial on the nose;
 * - their motion along the section: each of three regions (behind the crest, the face, the nose) a rigid translation at
 *   its own pace (`shed`, `creep`, `tumble` × c) in two flow-map phases a lump's lifetime apart, each phase a new lattice
 *   (time stepped at the lumps' lifetime), so they tumble forward over the nose and shed backward behind the crest.
 * Its fragments: the band's churn tile and the lumps' creases on the foam colour, matte; brighter while fresh (`fresh`,
 * by the time since its curl landed); its detail fading as it shrinks on screen (as the curl's `DISTANCE`).
 *
 * It starts where the drawn band starts (at touchdown, with its flash and its void filling) and frays where it frays (its
 * scale); its rear fades into the band and the lace behind; at the run's ends it flattens and fades into the band.
 */

/** The front's numbers (the advisor's, 2026-10-22; P marks a value set by eye). */
export const ROLLER_FRONT = {
  /**
   * Sub-columns per solver column: half a metre at the Canyon's 1 m columns (the advisor's), by 20 points across: 60
   * vertices a patch. Quarter metres by 27 points drew the lumps smoother, but Big's 220 live patches then ran 30k
   * vertices, +1.1 ms of vertex work alone on the M1 (the budget is 5–15k); now 13k.
   */
  subColumns: 2,
  /** Buried this far at its rear, m (the curl's `BURY`). */
  bury: 0.04,
  /** Its base this far over the water as drawn, m: the two meshes' chords over the curved surface differ by a few cm (P). */
  lift: 0.03,
  /** Its rear: from ξ = −rear (the band's rear taper), fading in to `rearFade`. */
  rear: ROLLER_LOOK.rear,
  rearFade: -0.06,
  /**
   * The nose: radius `nose` H (the advisor: about 0.1 H), at most `noseOfLength` of the band's drawn length (a young
   * band, a short one); its centre `noseLift` of its radius over the water, so it curls under it. Its front at
   * `noseAt` of the band's length with the band's toe wander: there the band's coverage is half gone (its edge 0.75–1).
   */
  nose: 0.1,
  noseOfLength: 0.3,
  noseLift: 0,
  noseAt: 0.9,
  /**
   * The nose rolls as a row of bulges, not a wall: its radius runs from `noseBase` of 0.1 H in the creases to
   * `noseBase` + `noseCap` at the lumps, their σ `noseSigma` of it (P).
   */
  noseBase: 0.6,
  noseCap: 0.8,
  noseSigma: 0.8,
  /** The lumps' envelope: `crestShare` of σ at the crest, all of it over ξ `peak` (the advisor: largest in the toe half). */
  crestShare: 0.4,
  peak: [0.5, 0.9] as const,
  /** Along the section, × the bore's celerity c: creeping down the face, tumbling over the nose, shed behind the crest. */
  creep: 0.05,
  tumble: 0.18,
  shed: -0.5,
  /**
   * The lumps' lattice, in reference trough depths (`ROLLER_LOOK.referenceDepth`, 1.5 m; the local h₁ would turn the
   * lattice under a moving x and t, as the toe's did): 0.5 h₁ at the toe growing to 3 h₁ at the rear (the advisor).
   * Per region, the two octaves' lattices the geometry carries (a gradient noise's lumps are about half its lattice: 3 h₁
   * down to 0.6 h₁ on the face, 0.3–0.5 h₁ on the nose); the 0.5 h₁ clumps between them are the churn tile's
   * (`CHURN_TILE`'s 0.75 m domes), carried along the section in the fragments.
   */
  back: [4, 2] as const,
  face: [2.5, 1.2] as const,
  noseSizes: [1, 0.6] as const,
  /** Their lifetime at the reference depth, s: 0.5 √(h₁ / 1.5 m) (the advisor); the flow-map phases run twice it. */
  life: 0.5,
  /**
   * The lumps' height: billows, σ·`billow`·b(n) for unit-spread noise n, b(n) = √(n² + k²) − k with k `crease` (rounded
   * lumps between creases where n crosses 0: cauliflower rather than a plateau), held under the cap by a tanh (P).
   */
  billow: 1.2,
  billowCrease: 0.35,
  /**
   * The roller's thickness at its crest, as a share of H (the advisor: 0.20–0.27 H), where the felt lens's is thinner:
   * the Canyon's lenses measure 6 H and more long, so their crest thickness (K H² over the length) comes out 0.08–0.16 H.
   */
  thickness: 0.235,
  /**
   * Fresh is brighter (Koepke 1984: foam's reflectance falls as it ages; the advisor: 1.5–2× the white 5 s older). With
   * φ = e^{−since/`freshDecay`}, its light × (1 + `fresh` φ) × mix(`aged`, 1, φ): brighter than the band at touchdown,
   * greyer than it once aged (P: a gain of 3.5 at touchdown, the first build's, blew the young front out to a flat white
   * cut-out under the tone mapping, its lumps gone). Its creases fill by `freshFill` of φ (fresh foam is bubbles through).
   */
  fresh: 0.6,
  freshDecay: 1.5,
  aged: 0.85,
  freshFill: 0.3,
  /**
   * Young to mature (the advisor): the relief falls from the table's d′max (0.35 h₁ young, Fr₁ 1.9) to `matureShare` h₁
   * once its crest has travelled `matureDepths` breaker depths (Svendsen 1984), taken as H/0.78 (the breaker index), its
   * travel as c × since. The table's own d′max follows Fr₁, which inshore of the Canyon's break (a shallow trough) stays
   * at its 0.4 cap; without this the aged bore stood in 0.2–0.3 m lumps, rock rather than foam.
   */
  matureShare: 0.155,
  matureDepths: 6.5,
  /** The fine detail a mature front keeps: its churn's relief and the creases' and clumps' shading (P: calmer foam). */
  matureDetail: 0.6,
  /**
   * The light a crease between lumps keeps, and between the churn's clumps, once aged (P: darker big creases read as
   * marble on the aged bore; the fine clumps' as foam).
   */
  crease: 0.84,
  churnShade: 0.64,
  /** The churn's clumps' relief on the normal, m (the tank's `CHURN_RELIEF` is 0.06; the front's stand proud, P). */
  churnRelief: 0.3,
  /**
   * Foam is a dense scatterer, lit through its lumps: its normal is bent this far toward the sky for its light, so a
   * lump's side turned from the sun greys rather than going dark as a solid's would (P).
   */
  soften: 0.3,
  softenSteep: 0.6,
  /** Matte: its roughness (the band's foam takes 0.7). */
  roughness: 0.8,
  /**
   * Its detail as it shrinks on screen (as the curl's `DISTANCE`): its fine lumps (0.5 h₁) from `nearPixels` to
   * `minPixels` (CSS px) across fade to their mean, and the creases and churn with them.
   */
  minPixels: 2,
  nearPixels: 6,
} as const;

/** Sub-columns per patch's side and points across its section. */
export const SECTION = 20;
const COLUMNS_PER_PATCH = ROLLER_FRONT.subColumns + 1;
/** One patch's vertices and indices. */
export const PATCH_VERTICES = COLUMNS_PER_PATCH * SECTION;
const PATCH_INDICES = 6 * ROLLER_FRONT.subColumns * (SECTION - 1);
/**
 * The section's points: `REAR` intervals behind the crest (ξ −0.3 → 0), the face's knots as shares of the nose's top ξ
 * (packed toward the nose), and the nose's angles, degrees, from its top round its front and under the water.
 */
const REAR = 3;
const FACE_KNOTS = [0, 0.14, 0.28, 0.41, 0.53, 0.64, 0.74, 0.83, 0.9, 0.96, 1] as const;
const NOSE_KNOTS = [90, 60, 30, 0, -30, -60, -90] as const;
const NOSE_FROM = REAR + FACE_KNOTS.length - 1;
/**
 * The lumps' noise: gradient noise on the band's pcg3d hash (a random gradient per lattice point, its components two of
 * the hash's words in [−1, 1], quintic fade; value noise drew its lattice's cells as straight creases), its spread one
 * octave's standard deviation (measured over 4·10⁵ samples: 0.177). The second octave's lattice is turned 37° from the
 * first's.
 */
const NOISE_SPREAD = 0.177;

/** The front's light, as a share of the band's, `since` s after its curl landed (`ROLLER_FRONT.fresh`, `aged`). */
export function frontFresh(since: number): number {
  const phi = Math.exp(-Math.max(0, since) / ROLLER_FRONT.freshDecay);
  return (1 + ROLLER_FRONT.fresh * phi) * (ROLLER_FRONT.aged + (1 - ROLLER_FRONT.aged) * phi);
}

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** The lumps' envelope at ξ, a share of σ: none at the buried rear, `crestShare` at the crest, all of it from ξ 0.5. */
export function frontEnvelope(xi: number): number {
  if (xi < 0) return ROLLER_FRONT.crestShare * smooth(-ROLLER_FRONT.rear, 0, xi);
  return ROLLER_FRONT.crestShare + (1 - ROLLER_FRONT.crestShare) * smooth(0, ROLLER_FRONT.peak[0], xi);
}

/** The lumps' height for noise n (unit spread), σ and the cap, m: billows, upward only, never over the cap. */
export function frontLump(n: number, sigma: number, cap: number): number {
  if (!(cap > 0)) return 0;
  const k = ROLLER_FRONT.billowCrease;
  return cap * Math.tanh((sigma * ROLLER_FRONT.billow * (Math.sqrt(n * n + k * k) - k)) / cap);
}

/** Floats per instance in each of the patches' attributes. */
const INSTANCE = { a0: 4, a1: 4, b0: 4, b1: 4, c: 4, d: 4, e: 2 } as const;
type InstanceName = keyof typeof INSTANCE;

/** The patches `buildFrontPatches` lays out, one per live slot and column pair: what the vertex shader reads for each. */
export interface FrontPatches {
  /** Column i's and i + 1's (crest, length, scale, thickness), as drawn; an empty end takes its live neighbour's with no scale. */
  a0: Float32Array;
  a1: Float32Array;
  /** Their (flowX, flowZ, h₁, d′max). */
  b0: Float32Array;
  b1: Float32Array;
  /** (since₀, since₁, H₀, H₁): s since each column's curl landed, and its wave's H, m. */
  c: Float32Array;
  /** The crest's and the length's slopes along shore at each end (dz/dx), for the normal across columns. */
  d: Float32Array;
  /** Column i's x, m, and the slot. */
  e: Float32Array;
  count: number;
}

export function createFrontPatches(capacity: number): FrontPatches {
  const make = (name: InstanceName) => new Float32Array(INSTANCE[name] * capacity);
  return { a0: make('a0'), a1: make('a1'), b0: make('b0'), b1: make('b1'), c: make('c'), d: make('d'), e: make('e'), count: 0 };
}

/**
 * The CPU twin of the vertex shader's reads (for the tests): the patches over the roller's drawn table (`ROLLER_FIELD`,
 * slot-major, `columns` a slot) and its look (`BAND_LOOK_FIELD`), one for each pair of neighbouring columns in a slot
 * either of which is drawn (scale > 0). As the band reads them, an empty end gives no scale and the live end's
 * geometry: it takes the live end's values with scale 0, so a plain mix draws the band's rule. Returns how many.
 */
export function buildFrontPatches(table: ArrayLike<number>, look: ArrayLike<number>, columns: number, column0: number, width: number,
  out: FrontPatches): number {
  let count = 0;
  const capacity = out.e.length / INSTANCE.e;
  const at = (slot: number, column: number) => (slot * columns + column) * ROLLER_STRIDE;
  const live = (slot: number, column: number) => column >= 0 && column < columns && table[at(slot, column) + ROLLER_FIELD.scale] > 0;
  const value = (slot: number, column: number, field: number) => table[at(slot, column) + field];
  // The along-shore slope of a field at a live column, from its live neighbours (central where both are).
  const slope = (slot: number, column: number, field: number) => {
    const left = live(slot, column - 1);
    const right = live(slot, column + 1);
    if (left && right) return (value(slot, column + 1, field) - value(slot, column - 1, field)) / (2 * width);
    if (right) return (value(slot, column + 1, field) - value(slot, column, field)) / width;
    if (left) return (value(slot, column, field) - value(slot, column - 1, field)) / width;
    return 0;
  };
  for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
    for (let column = 0; column + 1 < columns && count < capacity; column += 1) {
      const live0 = live(slot, column);
      const live1 = live(slot, column + 1);
      if (!live0 && !live1) continue;
      const ends = [live0 ? column : column + 1, live1 ? column + 1 : column];
      const scales = [live0 ? value(slot, column, ROLLER_FIELD.scale) : 0, live1 ? value(slot, column + 1, ROLLER_FIELD.scale) : 0];
      for (let end = 0; end < 2; end += 1) {
        const c = ends[end];
        const a = end === 0 ? out.a0 : out.a1;
        const b = end === 0 ? out.b0 : out.b1;
        a[4 * count] = value(slot, c, ROLLER_FIELD.crest);
        a[4 * count + 1] = value(slot, c, ROLLER_FIELD.length);
        a[4 * count + 2] = scales[end];
        a[4 * count + 3] = value(slot, c, ROLLER_FIELD.thickness);
        b[4 * count] = value(slot, c, ROLLER_FIELD.flowX);
        b[4 * count + 1] = value(slot, c, ROLLER_FIELD.flowZ);
        b[4 * count + 2] = value(slot, c, ROLLER_FIELD.troughDepth);
        b[4 * count + 3] = value(slot, c, ROLLER_FIELD.roughness);
        const l = (slot * columns + c) * BAND_LOOK_STRIDE;
        out.c[4 * count + end] = look[l + BAND_LOOK_FIELD.since];
        out.c[4 * count + 2 + end] = look[l + BAND_LOOK_FIELD.height];
        out.d[4 * count + end] = slope(slot, c, ROLLER_FIELD.crest);
        out.d[4 * count + 2 + end] = slope(slot, c, ROLLER_FIELD.length);
      }
      out.e[2 * count] = column0 + column * width;
      out.e[2 * count + 1] = slot;
      count += 1;
    }
  }
  out.count = count;
  return count;
}

/** A number as a GLSL float literal. */
const f = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);
/** A piecewise-linear knot list as a GLSL expression in `t` (0 … knots − 1). */
function knots(values: readonly number[], t: string): string {
  let out = f(values[values.length - 1]);
  for (let k = values.length - 2; k >= 0; k -= 1) {
    out = `${t} <= ${f(k + 1)} ? mix( ${f(values[k])}, ${f(values[k + 1])}, ${t} - ${f(k)} ) : ${out}`;
  }
  return `( ${out} )`;
}

const F = ROLLER_FRONT;
const H_REF = ROLLER_LOOK.referenceDepth;
const PERIOD = 2 * F.life;

const frontVertexPars = /* glsl */ `
${waterHeightPars}
${waterCubicPars}
uniform float waterTime;
${waterRollerPars}
attribute vec2 rfPatch;
uniform highp sampler2D rfLook;
uniform float rfPixelScale;
uniform vec4 rfTune;
varying vec3 vRfWorld;
varying vec4 vRfAlong;
varying vec4 vRfSection;
varying vec4 vRfShade;
// A lattice point's gradient: two of its hash's words, each in [−1, 1] (no trigonometry: the vertex shader's cost).
vec2 rfGradient( ivec2 c, int salt ) {
  uvec3 h = waterPcg3d( uvec3( ivec3( c, salt ) ) );
  return vec2( h.xy ) * ( 2.0 / 4294967296.0 ) - 1.0;
}
// Gradient noise and its gradient (value, d/dp): the slopes come with the value, so a vertex evaluates it once.
vec3 rfGradientNoise( vec2 p, int salt ) {
  vec2 i = floor( p );
  vec2 t = p - i;
  vec2 u = t * t * t * ( t * ( t * 6.0 - 15.0 ) + 10.0 );
  vec2 du = 30.0 * t * t * ( t * ( t - 2.0 ) + 1.0 );
  ivec2 c = ivec2( i );
  vec2 ga = rfGradient( c, salt );
  vec2 gb = rfGradient( c + ivec2( 1, 0 ), salt );
  vec2 gc = rfGradient( c + ivec2( 0, 1 ), salt );
  vec2 gd = rfGradient( c + ivec2( 1, 1 ), salt );
  float va = dot( ga, t );
  float vb = dot( gb, t - vec2( 1.0, 0.0 ) );
  float vc = dot( gc, t - vec2( 0.0, 1.0 ) );
  float vd = dot( gd, t - vec2( 1.0, 1.0 ) );
  float k = va - vb - vc + vd;
  return vec3( va + u.x * ( vb - va ) + u.y * ( vc - va ) + u.x * u.y * k,
    ga + u.x * ( gb - ga ) + u.y * ( gc - ga ) + u.x * u.y * ( ga - gb - gc + gd ) + du * ( u.yx * k + vec2( vb, vc ) - va ) );
}
// One region's lumps along the section: two flow-map phases a lifetime apart, each a new lattice (its own salt), carried
// rigidly along the arc at v m/s over its phase; two octaves of sizes l (m), weights w; about unit spread.
vec3 rfField( vec2 xs, float v, vec2 l, vec2 w, int region ) {
  float p = waterTime / ${f(PERIOD)};
  float a = fract( p );
  float b = fract( p + 0.5 );
  float wa = 1.0 - abs( 2.0 * a - 1.0 );
  float wb = 1.0 - wa;
  int ia = 8 * int( floor( p ) ) + 2 * region + 3;
  int ib = 8 * int( floor( p + 0.5 ) ) + 2 * region + 3;
  vec2 pa = xs - vec2( 0.0, v * ( a - 0.5 ) * ${f(PERIOD)} );
  vec2 pb = xs - vec2( 0.0, v * ( b - 0.5 ) * ${f(PERIOD)} );
  const mat2 turn = mat2( 0.8, 0.6, -0.6, 0.8 );
  // Each octave's value and its gradient in metres (the turned lattice's turned back).
  vec3 a1 = rfGradientNoise( pa / l.x, ia );
  vec3 a2 = rfGradientNoise( turn * pa / l.y, ia + 1 );
  vec3 b1 = rfGradientNoise( pb / l.x, ib );
  vec3 b2 = rfGradientNoise( turn * pb / l.y, ib + 1 );
  vec3 na = w.x * vec3( a1.x, a1.yz / l.x ) + w.y * vec3( a2.x, ( a2.yz * turn ) / l.y );
  vec3 nb = w.x * vec3( b1.x, b1.yz / l.x ) + w.y * vec3( b2.x, ( b2.yz * turn ) / l.y );
  return ( wa * na + wb * nb ) / ( ${f(NOISE_SPREAD)} * length( w ) * length( vec2( wa, wb ) ) );
}
// The lumps' noise at (x, s): the three regions' fields, blended by their weights (back, face, nose), kept at unit spread.
vec3 rfNoise( vec2 xs, vec3 weight, float c, float toe ) {
  vec3 n = vec3( 0.0 );
  xs /= rfTune.y;
  if ( weight.x > 0.0 ) n += weight.x * rfField( xs, ${f(F.shed)} * c, vec2( ${f(F.back[0] * H_REF)}, ${f(F.back[1] * H_REF)} ), vec2( 1.0, 0.5 ), 0 );
  if ( weight.y > 0.0 ) n += weight.y * rfField( xs, ${f(F.creep)} * c, vec2( ${f(F.face[0] * H_REF)}, ${f(F.face[1] * H_REF)} ),
    vec2( mix( 1.0, 0.35, toe ), mix( 0.4, 1.0, toe ) ), 1 );
  if ( weight.z > 0.0 ) n += weight.z * rfField( xs, ${f(F.tumble)} * c, vec2( ${f(F.noseSizes[0] * H_REF)}, ${f(F.noseSizes[1] * H_REF)} ), vec2( 1.0, 0.7 ), 2 );
  return vec3( n.x, n.yz / rfTune.y ) / max( 1e-3, length( weight ) );
}
float rfLump( float n, float sigma, float cap ) {
  return cap > 0.0 ? cap * tanh( sigma * ${f(F.billow)} * ( sqrt( n * n + ${f(F.billowCrease * F.billowCrease)} ) - ${f(F.billowCrease)} ) / cap ) : 0.0;
}
// The lump's height's slope per unit of noise (rfLump's derivative in n).
float rfLumpSlope( float n, float sigma, float cap ) {
  if ( !( cap > 0.0 ) ) return 0.0;
  float th = tanh( sigma * ${f(F.billow)} * ( sqrt( n * n + ${f(F.billowCrease * F.billowCrease)} ) - ${f(F.billowCrease)} ) / cap );
  return sigma * ${f(F.billow)} * ( 1.0 - th * th ) * n / sqrt( n * n + ${f(F.billowCrease * F.billowCrease)} );
}
// The crest's and the length's slopes along shore at a drawn column of a slot, from its drawn neighbours (central where
// both are): for the normal across columns.
vec2 rfAlongShore( int c, int slot ) {
  vec4 here = texelFetch( waterRoller, ivec2( 2 * c, slot ), 0 );
  vec4 left = c > 0 ? texelFetch( waterRoller, ivec2( 2 * c - 2, slot ), 0 ) : vec4( 0.0 );
  vec4 right = c + 1 < int( waterRollerColumns ) ? texelFetch( waterRoller, ivec2( 2 * c + 2, slot ), 0 ) : vec4( 0.0 );
  bool l = left.z > 0.0;
  bool r = right.z > 0.0;
  if ( l && r ) return ( right.xy - left.xy ) / ( 2.0 * waterRollerColumnWidth );
  if ( r ) return ( right.xy - here.xy ) / waterRollerColumnWidth;
  if ( l ) return ( here.xy - left.xy ) / waterRollerColumnWidth;
  return vec2( 0.0 );
}
float rfSmoothSlope( float e0, float e1, float x ) {
  float t = clamp( ( x - e0 ) / ( e1 - e0 ), 0.0, 1.0 );
  return 6.0 * t * ( 1.0 - t ) / ( e1 - e0 );
}
`;

/**
 * The front's vertex (replaces `<beginnormal_vertex>`; `<begin_vertex>` takes `rfPosition`): its patch's columns mixed at
 * its sub-column, its point on the section, its lumps, and its normal from the section's and the lumps' slopes.
 */
const frontBeginNormal = /* glsl */ `
float rfTx = position.x;
float rfK = position.y;
// Its slot and columns i and i + 1 in the drawn table (the water's roller texture, as the band reads it) and the look
// beside it (since, H): an empty end gives no scale and the live end's geometry. A patch with neither end drawn draws
// nothing: its points all at one place, so its triangles have no area.
int rfColumn = int( rfPatch.x );
int rfSlot = int( rfPatch.y );
vec4 rfA0 = texelFetch( waterRoller, ivec2( 2 * rfColumn, rfSlot ), 0 );
vec4 rfA1 = texelFetch( waterRoller, ivec2( 2 * rfColumn + 2, rfSlot ), 0 );
bool rfLive0 = rfA0.z > 0.0;
bool rfLive1 = rfA1.z > 0.0;
vec3 objectNormal = vec3( 0.0, 1.0, 0.0 );
vec3 rfPosition = vec3( 0.0, -1.0e4, 0.0 );
vRfWorld = rfPosition;
vRfAlong = vec4( 0.0, 0.0, 1.0, 0.0 );
vRfSection = vec4( 0.0 );
vRfShade = vec4( 0.0, 0.0, 1.0, 0.0 );
if ( rfLive0 || rfLive1 ) {
vec4 rfB0 = texelFetch( waterRoller, ivec2( 2 * rfColumn + 1, rfSlot ), 0 );
vec4 rfB1 = texelFetch( waterRoller, ivec2( 2 * rfColumn + 3, rfSlot ), 0 );
vec2 rfL0 = texelFetch( rfLook, ivec2( rfColumn, rfSlot ), 0 ).rg;
vec2 rfL1 = texelFetch( rfLook, ivec2( rfColumn + 1, rfSlot ), 0 ).rg;
vec2 rfD0 = rfAlongShore( rfLive0 ? rfColumn : rfColumn + 1, rfSlot );
vec2 rfD1 = rfAlongShore( rfLive1 ? rfColumn + 1 : rfColumn, rfSlot );
if ( !rfLive0 ) {
  rfA0 = vec4( rfA1.xy, 0.0, rfA1.w );
  rfB0 = rfB1;
  rfL0 = rfL1;
}
if ( !rfLive1 ) {
  rfA1 = vec4( rfA0.xy, 0.0, rfA0.w );
  rfB1 = rfB0;
  rfL1 = rfL0;
}
vec4 rfC = vec4( rfL0.x, rfL1.x, rfL0.y, rfL1.y );
vec4 rfD = vec4( rfD0.x, rfD1.x, rfD0.y, rfD1.y );
vec4 rfA = mix( rfA0, rfA1, rfTx );
vec4 rfB = mix( rfB0, rfB1, rfTx );
float rfX = waterRollerColumn0 + ( float( rfColumn ) + rfTx ) * waterRollerColumnWidth;
float rfCrest = rfA.x;
float rfLen = max( rfA.y, 0.05 );
float rfG = rfA.z;
float rfSince = mix( rfC.x, rfC.y, rfTx );
float rfH = mix( rfC.z, rfC.w, rfTx );
float rfDCrest = mix( rfD.x, rfD.y, rfTx );
float rfDLen = mix( rfD.z, rfD.w, rfTx );
float rfCel = length( rfB.xy );
// The nose: at the band's wandering toe, its radius 0.1 H (no more than a share of a young band's length), fading with g.
float rfFront = clamp( ${f(F.noseAt)} + waterRollerToe( rfX, waterTime, rfB.w ) / rfLen, 0.5, 1.4 );
float rfR = min( ${f(F.nose)} * rfTune.z * rfH, ${f(F.noseOfLength)} * rfLen ) * smoothstep( 0.0, 0.5, rfG );
float rfTop = rfFront - rfR / rfLen;
float rfCenterLift = ${f(F.noseLift)} * rfR;
float rfRho0 = ${f(F.noseBase)} * rfR;
bool rfNose = rfK > ${f(NOSE_FROM)};
float rfXi = rfNose ? rfTop : ( rfK <= ${f(REAR)} ? mix( -${f(F.rear)}, 0.0, rfK / ${f(REAR)} ) : rfTop * ${knots(FACE_KNOTS, `( rfK - ${f(REAR)} )`)} );
float rfPhi = rfNose ? radians( ${knots(NOSE_KNOTS, `( rfK - ${f(NOSE_FROM)} )`)} ) : 1.5707963;
float rfS = rfXi * rfLen + ( rfNose ? rfR * ( 1.5707963 - rfPhi ) : 0.0 );
float rfZ0 = rfCrest + rfXi * rfLen;
vec3 rfWater = waterCubic( vec2( rfX, rfZ0 ) );
// The lens's thickness there (its quarter ellipse, its rear taper), the lumps' σ and their cap; on the nose, its own.
float rfThick = rfG * max( rfA.w, ${f(F.thickness)} * rfH ) * ( rfXi >= 0.0 ? sqrt( max( 0.0, 1.0 - min( 1.0, rfXi * rfXi ) ) )
  : max( 0.0, 1.0 - rfXi * rfXi / ${f(F.rear * F.rear)} ) );
float rfWeightNose = rfNose ? 1.0 : smoothstep( 0.8 * rfTop, rfTop, rfXi );
float rfWeightBack = rfNose ? 0.0 : 1.0 - smoothstep( -0.12, 0.03, rfXi );
vec3 rfWeight = vec3( rfWeightBack, max( 0.0, 1.0 - rfWeightBack - rfWeightNose ), rfWeightNose );
float rfEnvelope = rfXi < 0.0 ? ${f(F.crestShare)} * smoothstep( -${f(F.rear)}, 0.0, rfXi )
  : ${f(F.crestShare)} + ${f(1 - F.crestShare)} * smoothstep( 0.0, ${f(F.peak[0])}, rfXi );
float rfMature = clamp( max( 0.0, rfSince ) * rfCel / ( ${f(F.matureDepths / 0.78)} * max( rfH, 0.1 ) ), 0.0, 1.0 );
float rfRough = mix( rfB.w, ${f(F.matureShare)} * rfB.z, rfMature );
float rfSigma = mix( rfRough * rfG * rfEnvelope, ${f(F.noseSigma)} * rfR, rfWeightNose ) * rfTune.x;
float rfCap = mix( rfThick, ${f(F.noseCap)} * rfR, rfWeightNose );
// Its detail as it shrinks on screen: the fine lumps' size in pixels at its depth.
vec4 rfView = modelViewMatrix * vec4( rfX, rfWater.x, rfZ0, 1.0 );
float rfPixel = rfPixelScale * max( 0.0, -rfView.z );
float rfNear = rfPixel > 0.0 ? smoothstep( ${f(F.minPixels)}, ${f(F.nearPixels)}, ${f(F.face[1] * H_REF)} / rfPixel ) : 1.0;
float rfToe = smoothstep( 0.0, 0.9, rfXi );
vec3 rfN0 = rfNoise( vec2( rfX, rfS ), rfWeight, rfCel, rfToe );
float rfMean = rfLump( 1.0, rfSigma, rfCap );
float rfLift = mix( rfMean, rfLump( rfN0.x, rfSigma, rfCap ), rfNear );
// The lumps' slopes along shore and along the arc, from the noise's own gradient.
vec2 rfLumpSlopes = rfNear * rfLumpSlope( rfN0.x, rfSigma, rfCap ) * rfN0.yz;
float rfLumpX = rfLumpSlopes.x;
float rfLumpS = rfLumpSlopes.y;
// Its point and the slopes along the section (A, Bz: dy/ds, dz/ds) and along shore (B, C: dy/dx, dz/dx).
float rfDzDx = rfDCrest + rfXi * rfDLen;
float rfSlopeA;
float rfSlopeBz;
float rfSlopeB;
float rfSlopeC;
if ( rfNose ) {
  float rho = rfRho0 + rfLift;
  float sn = sin( rfPhi );
  float cs = cos( rfPhi );
  rfPosition = vec3( rfX, rfWater.x + rfCenterLift + rho * sn, rfZ0 + rho * cs );
  float ratio = rho / max( rfR, 1e-3 );
  rfSlopeA = rfLumpS * sn - ratio * cs;
  rfSlopeBz = rfLumpS * cs + ratio * sn;
  rfSlopeC = rfDzDx + rfLumpX * cs;
  rfSlopeB = rfWater.y + rfWater.z * rfDzDx + rfLumpX * sn;
} else {
  // The base: buried at the rear, over the felt top down the face, rising to the nose's top.
  float ramp = 0.67 * rfTop;
  float base = -${f(F.bury)} + ${f(F.bury + F.lift)} * smoothstep( -${f(F.rear)}, -0.12, rfXi )
    + ( rfCenterLift + rfRho0 - ${f(F.lift)} ) * smoothstep( ramp, rfTop, rfXi );
  float baseSlope = ( ${f(F.bury + F.lift)} * rfSmoothSlope( -${f(F.rear)}, -0.12, rfXi )
    + ( rfCenterLift + rfRho0 - ${f(F.lift)} ) * rfSmoothSlope( ramp, rfTop, rfXi ) ) / rfLen;
  rfPosition = vec3( rfX, rfWater.x + base + rfLift, rfZ0 );
  rfSlopeA = rfWater.z + baseSlope + rfLumpS;
  rfSlopeBz = 1.0;
  rfSlopeC = rfDzDx;
  rfSlopeB = rfWater.y + rfWater.z * rfDzDx + rfLumpX;
}
objectNormal = normalize( vec3( rfSlopeA * rfSlopeC - rfSlopeBz * rfSlopeB, rfSlopeBz, -rfSlopeA ) );
vRfWorld = rfPosition;
vRfAlong = vec4( normalize( vec3( 0.0, rfSlopeA, rfSlopeBz ) ), rfMature );
// The fine clumps' place on the section (along shore, along the arc) and their pace along it: creeping down the face,
// tumbling over the nose (behind the crest the geometry's lumps shed; the clumps there creep, so their tile never folds);
// and how near the crest it lies, for the band's light through it (its waterRollerFresh).
vRfSection = vec4( rfX, rfS, ( ${f(F.creep)} + ${f(F.tumble - F.creep)} * rfWeightNose ) * rfCel, 1.0 - clamp( rfXi, 0.0, 1.0 ) );
// Fades: into the band at its rear, at its run's ends (its scale), and in with the landing's flash. The lumps' share of
// their height (creases), the fresh white's gain, the detail kept at distance, and how near the crest (the band's wrap).
float rfAlpha = smoothstep( 0.0, 0.5, rfG ) * ( rfNose ? 1.0 : smoothstep( -${f(F.rear)}, ${f(F.rearFade)}, rfXi ) );
vRfShade = vec4( rfAlpha, rfLift / max( 1e-3, min( rfSigma, rfCap ) ), exp( -max( 0.0, rfSince ) / ${f(F.freshDecay)} ),
  rfNear );
}
`;

const frontFragmentPars = /* glsl */ `
uniform vec4 rfTune;
uniform vec4 rfTune2;
uniform float waterTime;
uniform vec3 waterFoamColor;
uniform vec3 waterSunDirection;
uniform vec3 waterSunRadiance;
${foamPatternPars}
${waterChurnPars}
varying vec3 vRfWorld;
varying vec4 vRfAlong;
varying vec4 vRfSection;
varying vec4 vRfShade;
// The churn's clumps on the section, carried along the arc at its pace in two flow-map phases a lump's lifetime apart.
vec2 rfChurnAt( vec2 p ) {
  float a = fract( waterTime / ${f(PERIOD)} );
  float b = fract( a + 0.5 );
  float w = 1.0 - abs( 2.0 * a - 1.0 );
  return w * waterChurnTap( p - vec2( 0.0, vRfSection.z * ( a - 0.5 ) * ${f(PERIOD)} ) )
    + ( 1.0 - w ) * waterChurnTap( p - vec2( 0.0, vRfSection.z * ( b - 0.5 ) * ${f(PERIOD)} ) + vec2( 2.9, 1.7 ) );
}
`;

/** The foam colour, creased between lumps and between the churn's clumps (both fading with the detail at distance). */
const FRONT_COLOR = /* glsl */ `
vec2 rfChurn = rfChurnAt( vRfSection.xy );
// The creases, once aged: fresh foam (its gain over 1, as a share of the most) fills them.
float rfAged = 1.0 - ${f(F.freshFill)} * vRfShade.z;
// A mature front's detail calms (its lumps already fall to 0.155 h1).
float rfDetail = vRfShade.w * mix( 1.0, ${f(F.matureDetail)}, vRfAlong.w );
float rfCrease = mix( 1.0, mix( ${f(F.crease)} * rfTune2.x, 1.0, smoothstep( 0.05, 0.6, vRfShade.y ) )
  * mix( ${f(F.churnShade)} * rfTune2.y, 1.0, smoothstep( 0.1, 0.7, rfChurn.y ) ), rfDetail * rfAged );
diffuseColor.rgb = waterFoamColor * rfCrease;
diffuseColor.a *= vRfShade.x;
`;

/**
 * The churn's clumps' relief on the normal, from the same carried tile on the section (along shore and along the arc),
 * fading with the detail at distance.
 */
const FRONT_NORMAL = /* glsl */ `#include <normal_fragment_maps>
{
  const float rfTexel = ${f(CHURN_TILE / 128)};
  vec2 rfSlope = ${f(F.churnRelief)} * rfTune2.z * vec2( rfChurnAt( vRfSection.xy + vec2( rfTexel, 0.0 ) ).y - rfChurn.y,
    rfChurnAt( vRfSection.xy + vec2( 0.0, rfTexel ) ).y - rfChurn.y ) / rfTexel;
  vec3 rfWorldNormal = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  rfWorldNormal = normalize( rfWorldNormal - rfDetail * ( rfSlope.x * vec3( 1.0, 0.0, 0.0 ) + rfSlope.y * vRfAlong.xyz ) );
  // Steep faces (the nose's front, a lump's side) more: lit through as the foam they are, not as a shaded wall.
  float rfBend = ( ${f(F.soften)} + ${f(F.softenSteep)} * ( 1.0 - smoothstep( 0.2, 0.7, rfWorldNormal.y ) ) ) * rfTune2.w;
  rfWorldNormal = normalize( rfWorldNormal + vec3( 0.0, rfBend, 0.0 ) );
  normal = normalize( ( viewMatrix * vec4( rfWorldNormal, 0.0 ) ).xyz );
}`;

/**
 * The band's light as a volume scatterer (`BAND_VOLUME` with the foam look's cap, `bandVolumeLight`): the sun wrapped
 * round the face beyond three's N·L, so the front lights as the band beside it does; while young, through all of it.
 */
function frontVolume(kept: number): string {
  return /* glsl */ `#include <emissivemap_fragment>
{
  vec3 rfN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  float rfSun = dot( rfN, waterSunDirection );
  float rfWrapped = max( 0.0, ( rfSun + 1.0 ) / 2.0 );
  float rfCapped = min( rfWrapped, max( max( 0.0, rfSun ), waterSunDirection.y ) );
  // The sun shines through near the crest, as through the band, and through the whole young front: fresh foam is thin
  // and full of air, so its backlit side glows (its gain's share).
  float rfThrough = max( ${f(kept)}, max( vRfSection.w * vRfSection.w, vRfShade.z )
    * ( 1.0 - smoothstep( ${f(BAND_THROUGH[0])}, ${f(BAND_THROUGH[1])}, rfSun ) ) );
  totalEmissiveRadiance += diffuseColor.rgb * waterSunRadiance * RECIPROCAL_PI * ( rfCapped + ( rfWrapped - rfCapped ) * rfThrough - max( 0.0, rfSun ) );
}`;
}

const FRONT_GAIN = `outgoingLight *= ( 1.0 + ${f(F.fresh)} * rfTune.w * vRfShade.z ) * mix( ${f(F.aged)}, 1.0, vRfShade.z );
#include <opaque_fragment>`;

/** `?rollerFront=off`, or `window.waterRollerFront(false)`: the front not drawn (and, from the URL, its toe spray not thrown). */
export const rollerFrontMode = { on: devParam('rollerFront') !== 'off' };

/**
 * Dev knobs (`window.waterRollerFrontTune`), multipliers on the numbers above, 1 as shipped: `lumps` the lumps' σ, their
 * lattice's size, the nose's radius and the fresh gain; `shade` the creases' light, the churn's, its relief and the
 * normal's bend toward the sky.
 */
export const rollerFrontTune = { lumps: { value: new Vector4(1, 1, 1, 1) }, shade: { value: new Vector4(1, 1, 1, 1) } };

/**
 * The roller front's mesh: one instanced patch per live slot and column pair (`buildFrontPatches`), drawn on the water's
 * own uniforms (its heights, foam colour, sun and churn), matte, blended at its edges over the band.
 */
export class RollerFrontMesh {
  readonly mesh: Mesh<InstancedBufferGeometry, MeshStandardMaterial>;
  private readonly geometry: InstancedBufferGeometry;
  /** The look beside the drawn table (since, H), one texel per slot and column, uploaded with each new table. */
  private lookData = new Float32Array(2);
  private lookTexture = new DataTexture(this.lookData, 1, 1, RGFormat, FloatType);
  private readonly look = { value: this.lookTexture };
  private columns = 0;
  /** Drawn patches (either end drawn) at the last update. */
  private live = 0;
  /** World metres per pixel per metre of depth, for the view being drawn (the curl's `curlPixelScale`). */
  readonly pixelScale = { value: 0 };

  constructor(uniforms: Record<string, { value: unknown }>) {
    const geometry = new InstancedBufferGeometry();
    // Per vertex: its sub-column (0 … 1 across the patch) and its point on the section (0 … SECTION − 1).
    const place = new Float32Array(3 * PATCH_VERTICES);
    for (let column = 0; column < COLUMNS_PER_PATCH; column += 1) {
      for (let k = 0; k < SECTION; k += 1) {
        const v = column * SECTION + k;
        place[3 * v] = column / ROLLER_FRONT.subColumns;
        place[3 * v + 1] = k;
      }
    }
    geometry.setAttribute('position', new BufferAttribute(place, 3));
    const index = new Uint16Array(PATCH_INDICES);
    let n = 0;
    for (let column = 0; column < ROLLER_FRONT.subColumns; column += 1) {
      for (let k = 0; k + 1 < SECTION; k += 1) {
        const a = column * SECTION + k;
        const b = a + SECTION;
        // Counter-clockwise seen from outside the section (its normal's side): up over the face, forward round the nose.
        index.set([a, b + 1, b, a, a + 1, b + 1], n);
        n += 6;
      }
    }
    geometry.setIndex(new BufferAttribute(index, 1));
    geometry.instanceCount = 0;
    this.geometry = geometry;
    const material = new MeshStandardMaterial({
      color: '#ffffff', roughness: ROLLER_FRONT.roughness, metalness: 0, side: FrontSide, transparent: true,
      // It lies a few centimetres over the water: drawn over it where the two surfaces' chords meet.
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, { rfPixelScale: this.pixelScale, rfLook: this.look, rfTune: rollerFrontTune.lumps,
        rfTune2: rollerFrontTune.shade });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${frontVertexPars}`)
        .replace('#include <beginnormal_vertex>', frontBeginNormal)
        .replace('#include <begin_vertex>', 'vec3 transformed = rfPosition;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${frontFragmentPars}`)
        .replace('#include <color_fragment>', `#include <color_fragment>\n${FRONT_COLOR}`)
        .replace('#include <normal_fragment_maps>', FRONT_NORMAL)
        .replace('#include <emissivemap_fragment>', frontVolume(foamLookMode.warmth))
        .replace('#include <opaque_fragment>', FRONT_GAIN);
      const haze = hazeLandRoute('front', 'rich');
      if (haze) {
        Object.assign(shader.uniforms, horizonHazeUniforms);
        withHazeLand(shader, { route: haze, pixelToward: VIEW_TOWARD });
      }
    };
    material.customProgramCacheKey = () => `breakline-roller-front-${foamLookMode.warmth}${hazeLandKey(hazeLandRoute('front', 'rich'))}`;
    onHazeLandChange(() => {
      material.needsUpdate = true;
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    // Drawn before the curl, which blends over it where it collapses into its landing.
    this.mesh.renderOrder = -1;
    this.mesh.onBeforeRender = (renderer, _scene, camera) => this.setView(camera, viewHeight(renderer));
  }

  /** The camera and view height (px) the front is drawn for next: an orthographic view keeps its detail. */
  setView(camera: Camera, heightPixels: number): void {
    const perspective = (camera as Camera & { isPerspectiveCamera?: boolean }).isPerspectiveCamera === true;
    this.pixelScale.value = perspective ? curlPixelScale(camera.projectionMatrix.elements[5], heightPixels) : 0;
  }

  /**
   * A patch for every slot and column pair, laid out once for the table's columns (static: nothing is uploaded per
   * table but the look's texture; a buffer rewritten each snapshot stalls ANGLE's Metal on a frame still in flight).
   */
  private layOut(columns: number): void {
    this.columns = columns;
    const pairs = Math.max(0, columns - 1);
    const patch = new Float32Array(2 * ROLLER_SLOTS * pairs);
    for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
      for (let column = 0; column < pairs; column += 1) {
        const k = slot * pairs + column;
        patch[2 * k] = column;
        patch[2 * k + 1] = slot;
      }
    }
    this.geometry.setAttribute('rfPatch', new InstancedBufferAttribute(patch, 2));
    this.geometry.instanceCount = ROLLER_SLOTS * pairs;
    this.lookData = new Float32Array(2 * ROLLER_SLOTS * Math.max(1, columns));
    this.lookTexture.dispose();
    this.lookTexture = new DataTexture(this.lookData, Math.max(1, columns), ROLLER_SLOTS, RGFormat, FloatType);
    this.look.value = this.lookTexture;
  }

  /**
   * The drawn table's look for the patches (the water's own roller texture carries the table itself, `waterRoller`):
   * `look` per slot and column (`BAND_LOOK_FIELD`), `table` only to know whether any band is drawn. None hides it.
   */
  update(table: ArrayLike<number>, look: ArrayLike<number>, columns: number): void {
    if (columns !== this.columns) this.layOut(columns);
    const entries = ROLLER_SLOTS * columns;
    this.live = 0;
    if (columns >= 2 && look.length >= entries * BAND_LOOK_STRIDE && table.length >= entries * ROLLER_STRIDE) {
      for (let entry = 0; entry < entries; entry += 1) if (table[entry * ROLLER_STRIDE + ROLLER_FIELD.scale] > 0) this.live += 1;
      for (let entry = 0; entry < entries; entry += 1) {
        this.lookData[2 * entry] = look[entry * BAND_LOOK_STRIDE + BAND_LOOK_FIELD.since];
        this.lookData[2 * entry + 1] = look[entry * BAND_LOOK_STRIDE + BAND_LOOK_FIELD.height];
      }
      this.lookTexture.needsUpdate = true;
    }
    this.mesh.visible = this.live > 0;
  }

  /** The table's drawn entries at the last update, and the vertices its patches run (every pair's, empty or not). */
  get drawn(): { entries: number; patches: number; vertices: number } {
    const patches = this.mesh.visible ? this.geometry.instanceCount : 0;
    return { entries: this.mesh.visible ? this.live : 0, patches, vertices: patches * PATCH_VERTICES };
  }

  /** Whether any band was drawn at the last update. */
  get hasBand(): boolean {
    return this.live > 0;
  }

  hide(): void {
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.lookTexture.dispose();
  }
}

const viewSize = new Vector2();
/** The pixels a render's view is tall: its target's, or the canvas's in CSS pixels. */
function viewHeight(renderer: WebGLRenderer): number {
  const target = renderer.getRenderTarget();
  return target ? target.height : renderer.getSize(viewSize).y;
}

if (DEV_TOOLS && typeof window !== 'undefined') {
  Object.assign(window, {
    waterRollerFront: (on: boolean) => { rollerFrontMode.on = on; },
    waterRollerFrontTune: (lumps?: number[], shade?: number[]) => {
      if (lumps) rollerFrontTune.lumps.value.fromArray(lumps);
      if (shade) rollerFrontTune.shade.value.fromArray(shade);
      return { lumps: rollerFrontTune.lumps.value.toArray(), shade: rollerFrontTune.shade.value.toArray() };
    },
  });
}
