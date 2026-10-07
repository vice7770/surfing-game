import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE } from '../../wave/SpillingRoller';

/**
 * How the roller lens's band looks (the Canyon roller lens, S3: docs/superpowers/plans/2026-10-06-canyon-roller-s3.md §4,
 * after R3 §2.4 and §4): white water from the crest down to a ragged, fingered toe, brightest along the crest, fading
 * behind the crest into the foam field's look. The TypeScript twin of `waterRollerPars` (rollerGlsl.ts), line for line,
 * for the tests. Render-only: the felt lens keeps a smooth toe (the advisor's Q5).
 */
export const ROLLER_LOOK = {
  /** Behind the crest the band fades into the foam field's look over the lens's rear taper (ξ from −0.3 to 0). */
  rear: 0.3,
  /** Coverage falls from 1 to 0 from this share of the length to the (wandering) toe: smoothstep(1, 0.75, ξ) (R3 §4). */
  edge: 0.75,
  /** The toe's brightness over the crest's: 0.40/0.55 (Dierssen 2019's 0.40–0.55 of foam albedo; the linear ramp after
   * Haller & Catalán 2009 is P). */
  toeBright: 0.4 / 0.55,
  /** The toe wanders by this many d′max (1–2 d′max, Wang, Leng & Chanson 2017; the middle, P). */
  toeAmplitude: 1.5,
  /** Its two octaves' wavelengths along the crest, trough depths h₁ (1 and 5–10 h₁, Wang, Leng & Chanson 2017; P). */
  toeShort: 1,
  toeLong: 7.5,
  /**
   * Fingers live 0.4–0.6 s at h₁ = 1.5 m (Wüthrich, Shi & Chanson's lab lifetimes Froude-scaled, R3 §2.4; the middle, P),
   * longer with √h₁; the toe moves at 0.4× the surface's rate (Wang, Leng & Chanson 2017).
   */
  fingerLife: 0.5,
  toeRate: 0.4,
  /** Holes live 0.3–0.4 s at h₁ = 1.5 m (the same scaling; the middle, P), half a trough depth across (P). */
  holeLife: 0.35,
  holeScale: 0.5,
  /** Holes open only in the toe half (ξ from 0.5), where the lab sees them (Wüthrich et al. 2022). */
  holeFrom: 0.5,
  /** The noises' reference trough depth, m, and the least they take (P), so a swash lens keeps finite scales. */
  referenceDepth: 1.5,
  minDepth: 0.2,
  /**
   * The two octaves' sum over its standard deviation (measured over 10⁶ samples): the toe's offset then has a standard
   * deviation of toeAmplitude·d′max.
   */
  toeNoiseSpread: 0.63,
} as const;

/** pcg3d (Jarzynski & Olano 2020, JCGT 9(3)): three 32-bit words from three, exact in JS as in GLSL's wrapping uint. */
export function pcg3d(x: number, y: number, z: number, out: Uint32Array = new Uint32Array(3)): Uint32Array {
  let a = (Math.imul(x >>> 0, 1664525) + 1013904223) >>> 0;
  let b = (Math.imul(y >>> 0, 1664525) + 1013904223) >>> 0;
  let c = (Math.imul(z >>> 0, 1664525) + 1013904223) >>> 0;
  a = (a + Math.imul(b, c)) >>> 0;
  b = (b + Math.imul(c, a)) >>> 0;
  c = (c + Math.imul(a, b)) >>> 0;
  a = (a ^ (a >>> 16)) >>> 0;
  b = (b ^ (b >>> 16)) >>> 0;
  c = (c ^ (c >>> 16)) >>> 0;
  a = (a + Math.imul(b, c)) >>> 0;
  b = (b + Math.imul(c, a)) >>> 0;
  c = (c + Math.imul(a, b)) >>> 0;
  out[0] = a;
  out[1] = b;
  out[2] = c;
  return out;
}

const words = new Uint32Array(3);
/** A lattice cell's value in [0, 1): pcg3d's first word over 2³². Negative cells wrap to uint as GLSL's uvec3(ivec3). */
function hash(i: number, j: number, k: number): number {
  return pcg3d(i | 0, j | 0, k | 0, words)[0] / 4294967296;
}

const quintic = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** 2D value noise in [−1, 1] over (x, y), the lattice's third coordinate `salt`, with a quintic fade. */
export function rollerNoise2(x: number, y: number, salt: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const u = quintic(x - i);
  const v = quintic(y - j);
  const a = hash(i, j, salt);
  const b = hash(i + 1, j, salt);
  const c = hash(i, j + 1, salt);
  const d = hash(i + 1, j + 1, salt);
  return 2 * ((a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v) - 1;
}

/** 3D value noise in [0, 1] over (x, y, z), with a quintic fade. */
export function rollerNoise3(x: number, y: number, z: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const k = Math.floor(z);
  const u = quintic(x - i);
  const v = quintic(y - j);
  const w = quintic(z - k);
  const lerp = (p: number, q: number, t: number) => p + (q - p) * t;
  const face = (kk: number) => lerp(lerp(hash(i, j, kk), hash(i + 1, j, kk), u), lerp(hash(i, j + 1, kk), hash(i + 1, j + 1, kk), u), v);
  return lerp(face(k), face(k + 1), w);
}

/** The noises' time scale for a trough depth h₁, s: their lifetime at the reference depth, Froude-scaled by √h₁. */
function lifetime(life: number, troughDepth: number): number {
  return life * Math.sqrt(Math.max(ROLLER_LOOK.minDepth, troughDepth) / ROLLER_LOOK.referenceDepth);
}

/**
 * How far the toe has wandered toward the beach at along-shore x and time t, m: two octaves at 1 and 7.5 trough depths,
 * scaled to a standard deviation of 1.5 d′max, moving at 0.4× the fingers' rate.
 */
export function toeOffset(x: number, time: number, troughDepth: number, roughness: number): number {
  const h1 = Math.max(ROLLER_LOOK.minDepth, troughDepth);
  const t = (time * ROLLER_LOOK.toeRate) / lifetime(ROLLER_LOOK.fingerLife, troughDepth);
  const n = rollerNoise2(x / (ROLLER_LOOK.toeShort * h1), t, 1) + rollerNoise2(x / (ROLLER_LOOK.toeLong * h1), t, 2);
  return (ROLLER_LOOK.toeAmplitude * roughness * n) / ROLLER_LOOK.toeNoiseSpread;
}

/** What the band shows at a point: its coverage, its brightness over the foam's, how much of a lens lies here and its water's velocity. */
export interface RollerLook {
  cover: number;
  bright: number;
  presence: number;
  flowX: number;
  flowZ: number;
}

export function createRollerLook(): RollerLook {
  return { cover: 0, bright: 1, presence: 0, flowX: 0, flowZ: 0 };
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * The band at (x, z) and time t, from the roller's table (`ROLLER_FIELD`, slot-major; read as the GPU reads its
 * 2·columns × 2 RGBA texture), its first column's centre x and their width; the most covering slot wins. Between two
 * columns an empty one gives no scale and the live one's geometry, as `SpillingRoller.lensAt` reads them.
 */
export function rollerLookAt(table: ArrayLike<number>, columns: number, column0: number, width: number,
  x: number, z: number, time: number, out: RollerLook): RollerLook {
  out.cover = 0;
  out.bright = 1;
  out.presence = 0;
  out.flowX = 0;
  out.flowZ = 0;
  const gx = (x - column0) / width;
  if (!(columns >= 2 && gx >= 0 && gx <= columns - 1)) return out;
  const i0 = Math.min(columns - 2, Math.floor(gx));
  const tx = gx - i0;
  for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
    const o0 = (slot * columns + i0) * ROLLER_STRIDE;
    const o1 = o0 + ROLLER_STRIDE;
    const g0 = table[o0 + ROLLER_FIELD.scale];
    const g1 = table[o1 + ROLLER_FIELD.scale];
    const live0 = g0 > 0;
    const live1 = g1 > 0;
    if (!live0 && !live1) continue;
    const w0 = live0 ? (live1 ? 1 - tx : 1) : 0;
    const w1 = 1 - w0;
    const length = w0 * table[o0 + ROLLER_FIELD.length] + w1 * table[o1 + ROLLER_FIELD.length];
    if (!(length > 0)) continue;
    const xi = (z - (w0 * table[o0 + ROLLER_FIELD.crest] + w1 * table[o1 + ROLLER_FIELD.crest])) / length;
    const roughness = w0 * table[o0 + ROLLER_FIELD.roughness] + w1 * table[o1 + ROLLER_FIELD.roughness];
    // The toe can wander past ξ = 1 by its offset: four standard deviations, before any noise is evaluated.
    if (xi < -ROLLER_LOOK.rear || xi > 1 + (4 * ROLLER_LOOK.toeAmplitude * roughness) / length) continue;
    const g = (1 - tx) * (live0 ? g0 : 0) + tx * (live1 ? g1 : 0);
    const troughDepth = w0 * table[o0 + ROLLER_FIELD.troughDepth] + w1 * table[o1 + ROLLER_FIELD.troughDepth];
    let band: number;
    if (xi < 0) {
      band = smoothstep(-ROLLER_LOOK.rear, 0, xi);
    } else {
      const toe = xi - toeOffset(x, time, troughDepth, roughness) / length;
      band = 1 - smoothstep(ROLLER_LOOK.edge, 1, toe);
      if (xi > ROLLER_LOOK.holeFrom) {
        const scale = ROLLER_LOOK.holeScale * Math.max(ROLLER_LOOK.minDepth, troughDepth);
        const hole = rollerNoise3(x / scale, (xi * length) / scale, time / lifetime(ROLLER_LOOK.holeLife, troughDepth));
        band *= 1 - smoothstep(0.62, 0.8, hole) * smoothstep(ROLLER_LOOK.holeFrom, 0.8, xi);
      }
    }
    const cover = g * band;
    if (!(cover > out.cover)) continue;
    out.cover = cover;
    out.bright = xi > 0 ? 1 - (1 - ROLLER_LOOK.toeBright) * Math.min(1, xi) : 1;
    out.presence = g * (xi < 0 ? smoothstep(-ROLLER_LOOK.rear, 0, xi) : 1 - smoothstep(1, 1.3, xi));
    out.flowX = w0 * table[o0 + ROLLER_FIELD.flowX] + w1 * table[o1 + ROLLER_FIELD.flowX];
    out.flowZ = w0 * table[o0 + ROLLER_FIELD.flowZ] + w1 * table[o1 + ROLLER_FIELD.flowZ];
  }
  return out;
}
