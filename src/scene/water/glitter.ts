/**
 * The sun's glitter on the Rich water (web-ocean plan, item 5): the sun's
 * specular as an anisotropic Gaussian distribution of facet slopes (LEAN
 * mapping), in place of three's GGX of one scalar roughness. Its mean is the
 * drawn normal's slope; its covariance is what the pixel's footprint leaves
 * unresolved: the ripples' slope moments from their mipmaps, the chop's spread
 * by distance (`chopCovariance`), a screen-space term for everything else
 * (the tank's own height field among it), and a floor for the gloss and the
 * sun's disc. Seen from below, the water keeps three's GGX. Lip and tube
 * sheets take the same lobe about their own normal, fed by the screen-space
 * term alone: the chop lives in the sea's horizontal slope space, which a
 * curling sheet leaves.
 *
 * The water's lobe is lit once per pixel, for the sun, in the world's frame, at the end of the water's body
 * (`RICH_SUN_GLITTER`); three's direct lights then take it for the sun (the shader-cost pass of 2026-10-18: lit per
 * light in three's loop, with its covariance carried from the normal chunk, it cost the M1 more than the rest of the
 * Rich water's new shading together). It runs with the Sea detail's rich sea (High and Ultra). Medium draws the sun's
 * road lite (`RICH_SUN_LITE_LIGHTS`, the glitter-lite pass of 2026-10-20): three's lighting, the sun's lobe a Beckmann
 * (the isotropic Gaussian of slopes) whose variance is the glitter's distance model, with no screen-space term or
 * moments (`setGlitterForGraphics`).
 *
 * The lobe (slope-space Gaussian, Smith masking, Schlick F0 0.02) is adapted
 * from web-ocean, js/wgsl/ocean.js (MIT licence, © 2026 Maksymilian Dendura),
 * rewritten for three's lighting and for a tilted macro surface: the tank's
 * faces are steep, so the light reflected per unit of horizontal area is
 * divided by the face's own projected area, (v·n)/n_y, not by v_y.
 */
import { Vector2 } from 'three';
import { DEV_TOOLS, devParam } from '../../devTools';
import { RICH_BASE_ROUGHNESS } from './specular';
import { chopCovariance, chopCovarianceGlsl } from '../waterChop';

/** Per-axis slope variance whose Gaussian peaks as three's GGX at the Rich base roughness: α = roughness², σ² = α²/2. */
export const GLITTER_BASE_VARIANCE = RICH_BASE_ROUGHNESS ** 4 / 2;
/** The sun's disc (0.53°): its half-vectors fill a disc of radius r/2 in slope, variance (r/2)²/4 per axis. */
export const SUN_DISC_VARIANCE = (0.00465 / 2) ** 2 / 4;
/** Foam's matte finish, Rich's 0.7 roughness, as per-axis slope variance. */
export const GLITTER_FOAM_VARIANCE = 0.7 ** 4 / 2;
/** The screen-space term's largest per-axis variance (web-ocean's cap): an edge never turns the sun into a sheet of light. */
export const SCREEN_VARIANCE_CAP = 0.03;
/**
 * The water's slopes no layer resolves, per axis (web-ocean): a constant, and a growth with distance (from 30 to
 * 500 m) toward Cox–Munk's totals in the far sheen.
 */
export const GLITTER_UNRESOLVED = { constant: 0.0024, far: 0.0035 } as const;

/** The unresolved variance (constant, growth with distance), shared by the tank's and the far ocean's materials. */
export const glitterUniforms = {
  waterGlitterUnresolved: { value: new Vector2(GLITTER_UNRESOLVED.constant, GLITTER_UNRESOLVED.far) },
};

/**
 * What the Rich water's glitter draws: on, lite (Medium's sun road) or off (three's GGX, the chop's plain slope), and its
 * covariance's parts, for timing each (dev: `?glitter=on|lite|off` forces it whatever the graphics say; `?glitterScreen=off`,
 * `?glitterRipples=off`, `?glitterChop=off` leave a part out). `window.waterGlitter({ … })` changes it in a page.
 */
export interface GlitterMode {
  on: boolean;
  /** Where the glitter is off: the sun's road drawn lite (Medium; `RICH_SUN_LITE_LIGHTS`), or three's GGX as before. */
  lite: boolean;
  screen: boolean;
  ripples: boolean;
  chop: boolean;
}

const forcedGlitter = devParam('glitter');
export const glitterMode: GlitterMode = {
  on: forcedGlitter !== 'off' && forcedGlitter !== 'lite',
  lite: forcedGlitter !== 'off',
  screen: devParam('glitterScreen') !== 'off',
  ripples: devParam('glitterRipples') !== 'off',
  chop: devParam('glitterChop') !== 'off',
};
const glitterListeners = new Set<() => void>();

/** Called whenever the glitter's mode changes: the Rich programs that draw it compile again. */
export function onGlitterChange(listener: () => void): () => void {
  glitterListeners.add(listener);
  return () => glitterListeners.delete(listener);
}

/** Change the glitter's mode; the programs drawing it are told only when something changed. */
export function setGlitter(patch: Partial<GlitterMode>): void {
  const was = glitterProgramKey();
  Object.assign(glitterMode, patch);
  if (glitterProgramKey() !== was) for (const listener of glitterListeners) listener();
}

/**
 * The graphics' choice: the glitter comes with the Sea detail's rich sea (High and Ultra), the lite road without it
 * (Medium), unless `?glitter=` forces one.
 */
export function setGlitterForGraphics(richSea: boolean): void {
  setGlitter(forcedGlitter === 'on' ? { on: true } : forcedGlitter === 'off' ? { on: false, lite: false }
    : forcedGlitter === 'lite' ? { on: false, lite: true } : { on: richSea, lite: true });
}

/** The Rich programs' cache-key part for the glitter's mode: none for the whole glitter, as before its switches. */
export function glitterProgramKey(): string {
  if (!glitterMode.on) return glitterMode.lite ? '-glitter-lite' : '-no-glitter';
  return `${glitterMode.screen ? '' : '-glitter-no-screen'}${glitterMode.ripples ? '' : '-glitter-no-ripples'}${glitterMode.chop ? '' : '-glitter-no-chop'}`;
}

if (DEV_TOOLS && typeof window !== 'undefined') Object.assign(window, { waterGlitter: setGlitter });

/** The unresolved per-axis variance at a distance, m: the GLSL's. */
export function unresolvedVariance(distance: number, unresolved = GLITTER_UNRESOLVED): number {
  const t = Math.min(1, Math.max(0, (distance - 30) / 470));
  return unresolved.constant + unresolved.far * t * t * (3 - 2 * t);
}

/**
 * Medium's lite road: the sun's α² (three's a², 2σ² for σ² the per-axis slope variance) the GLSL takes
 * (`RICH_SUN_GLITTER`, `WATER_SUN_LITE`): the glitter's covariance without its screen-space term, made isotropic (the
 * mean of its two axes): the floor, the foam's matte, the unresolved slopes, the chop's spread by distance
 * (`chopCovariance`, at strength `chop` of the whole patch's `whole`) and the ripples' unresolved variance
 * (`rippleVariance`, both axes' sum: `waterRippleVariance`).
 */
export function liteSunAlpha2(distance: number, cover: number, rippleVariance: number, chop: number, whole: Covariance,
  unresolved = GLITTER_UNRESOLVED): number {
  const spread = chopCovariance(distance, chop, whole);
  return 2 * (GLITTER_BASE_VARIANCE + SUN_DISC_VARIANCE + cover * GLITTER_FOAM_VARIANCE + unresolvedVariance(distance, unresolved)
    + 0.5 * (spread[0] + spread[1])) + rippleVariance;
}

/**
 * Beckmann's distribution of normals at α², `cosine` the half vector's against the drawn normal: the isotropic Gaussian
 * of slopes (variance α²/2 per axis) over cos⁴, `glitterDistribution` in the drawn normal's own frame. The GLSL's
 * (`RICH_SUN_LITE_LIGHTS`).
 */
export function beckmann(alpha2: number, cosine: number): number {
  const c2 = Math.max(cosine * cosine, 1e-4);
  return Math.exp((c2 - 1) / (alpha2 * c2)) / (Math.PI * alpha2 * c2 * c2);
}

export type Vec3 = readonly [number, number, number];
/** A slope covariance: (xx, zz, xz). */
export type Covariance = readonly [number, number, number];

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / length, a[1] / length, a[2] / length];
};

/** A covariance kept positive definite: its correlation held inside ±0.99. */
function definite([xx, zz, xz]: Covariance): Covariance {
  const limit = 0.99 * Math.sqrt(Math.max(xx * zz, 0));
  return [xx, zz, Math.min(limit, Math.max(-limit, xz))];
}

/** The Gaussian slope density at `d` from the mean. */
export function slopeDensity(d: readonly [number, number], covariance: Covariance): number {
  const [xx, zz, xz] = definite(covariance);
  const det = Math.max(xx * zz - xz * xz, 1e-20);
  const e = (d[0] * d[0] * zz + d[1] * d[1] * xx - 2 * d[0] * d[1] * xz) / det;
  return Math.exp(-0.5 * e) / (2 * Math.PI * Math.sqrt(det));
}

/**
 * Facet normals per unit area of the frame's plane (`up`, with `tx`, `tz` along it): the slope density of the facet
 * whose normal is `h`, over h_up⁴. ∫ D (h·up) dω = 1.
 */
export function glitterDistribution(h: Vec3, up: Vec3, tx: Vec3, tz: Vec3, mean: readonly [number, number], covariance: Covariance): number {
  const hu = dot(h, up);
  if (hu <= 0) return 0;
  const slope: [number, number] = [-dot(h, tx) / hu, -dot(h, tz) / hu];
  return slopeDensity([slope[0] - mean[0], slope[1] - mean[1]], covariance) / hu ** 4;
}

/**
 * Smith's Λ for the Gaussian slopes seen along `w` from a macro surface of normal `n` (Walter et al. 2007's rational
 * fit for Beckmann): the variance is taken along w's azimuth in the frame's (tx, tz) axes.
 */
export function smithLambda(w: Vec3, n: Vec3, tx: Vec3, tz: Vec3, covariance: Covariance): number {
  const c = dot(w, n);
  if (c <= 0) return 1e6;
  const tangent: Vec3 = [w[0] - c * n[0], w[1] - c * n[1], w[2] - c * n[2]];
  const ax = dot(tangent, tx);
  const az = dot(tangent, tz);
  const across = ax * ax + az * az;
  if (across < 1e-12) return 0;
  const [xx, zz, xz] = covariance;
  const variance = (ax * ax * xx + az * az * zz + 2 * ax * az * xz) / across;
  const a = c / Math.sqrt(2 * Math.max(variance, 1e-9) * Math.max(1 - c * c, 1e-12));
  if (a >= 1.6) return 0;
  return (1 - 1.259 * a + 0.396 * a * a) / (3.535 * a + 2.181 * a * a);
}

/**
 * The glitter's radiance per unit of the sun's irradiance (before Fresnel): D G (n·up) / (4 (v·n)), D per unit area
 * of the frame's plane. `n` is the macro (drawn) normal, `mean` its slope in the frame (zero when the frame is `n`'s
 * own). For a flat mean this is the usual F G D / (4 v_y); for a tilted face the reflected light is shared over the
 * face's own projected area, so a mirror-still tilted face reflects the sun exactly as a mirror would.
 */
export function glitter(l: Vec3, v: Vec3, n: Vec3, up: Vec3, tx: Vec3, tz: Vec3, mean: readonly [number, number], covariance: Covariance): number {
  const nv = dot(n, v);
  const nl = dot(n, l);
  if (nv <= 0 || nl <= 0) return 0;
  const h = normalize([l[0] + v[0], l[1] + v[1], l[2] + v[2]]);
  const masking = 1 / (1 + smithLambda(v, n, tx, tz, covariance) + smithLambda(l, n, tx, tz, covariance));
  return (glitterDistribution(h, up, tx, tz, mean, covariance) * masking * dot(n, up)) / (4 * Math.max(nv, 1e-4));
}

/**
 * `glitter` in the world's frame (up y, slopes along x and z, the mean the slope of `n`), arranged as the GPU lights
 * the sun's once per pixel (`RICH_SUN_GLITTER`): the normalized half vector's slope from l + v unnormalized, 1/h_y⁴
 * from |l + v|²/(l + v)_y², one inverse square root for both the Gaussian's normalization and its inverse
 * covariance, both Smith Λs side by side, and their masking 1/(1 + Λv + Λl) = q_v q_l / (q_v q_l + p_v q_l + p_l q_v)
 * from Λ = p/q. The CPU twin of the GLSL.
 */
export function sunGlitter(l: Vec3, v: Vec3, n: Vec3, covariance: Covariance): number {
  const s: Vec3 = [l[0] + v[0], l[1] + v[1], l[2] + v[2]];
  const nv = dot(n, v);
  const nl = dot(n, l);
  if (nv <= 0 || nl <= 0 || s[1] <= 0) return 0;
  const sy = 1 / Math.max(s[1], 1e-4);
  const ny = 1 / Math.max(n[1], 0.02);
  const d = [n[0] * ny - s[0] * sy, n[2] * ny - s[2] * sy];
  // A covariance's correlation is held within ±0.99 (`definite`): its determinant at least (1 − 0.99²) xx zz.
  const [xx, zz, xz] = covariance;
  const rs = 1 / Math.sqrt(Math.max(xx * zz - xz * xz, 0.0199 * xx * zz));
  const e = (d[0] * d[0] * zz + d[1] * d[1] * xx - 2 * d[0] * d[1] * xz) * rs * rs;
  const hu = dot(s, s) * sy * sy;
  const distribution = Math.exp(-0.5 * e) * rs * (0.5 / Math.PI) * Math.min(hu * hu, 1e8);
  const c = [Math.max(nv, 1e-4), Math.max(nl, 1e-4)];
  const pq = [v, l].map((w, k) => {
    const ax = w[0] - c[k] * n[0];
    const az = w[2] - c[k] * n[2];
    const variance = Math.max((ax * ax * xx + az * az * zz + 2 * ax * az * xz) / Math.max(ax * ax + az * az, 1e-12), 1e-9);
    const nu = c[k] / Math.sqrt(2 * variance * Math.max(1 - c[k] * c[k], 1e-12));
    return [nu < 1.6 ? 1 - 1.259 * nu + 0.396 * nu * nu : 0, 3.535 * nu + 2.181 * nu * nu];
  });
  const [[pv, qv], [pl, ql]] = pq;
  return (distribution * n[1] * qv * ql) / ((qv * ql + pv * ql + pl * qv) * 4 * c[0]);
}

/**
 * The screen-space term (web-ocean): the slope's change across the pixel, half its square summed over the two
 * screen axes, scaled down so its larger axis stays within the cap.
 */
export function screenCovariance(dx: readonly [number, number], dy: readonly [number, number]): Covariance {
  const xx = 0.5 * (dx[0] * dx[0] + dy[0] * dy[0]);
  const zz = 0.5 * (dx[1] * dx[1] + dy[1] * dy[1]);
  const xz = 0.5 * (dx[0] * dx[1] + dy[0] * dy[1]);
  const scale = Math.min(1, SCREEN_VARIANCE_CAP / Math.max(xx, zz, 1e-8));
  return [xx * scale, zz * scale, xz * scale];
}

const f = (value: number) => value.toExponential(6);

/**
 * GLSL: the glitter's per-fragment state (its normal chunk writes it, the lights read it) and its maths, the twins
 * of the functions above. Needs nothing of three's: it goes with the material's other pars.
 */
export const waterGlitterPars = /* glsl */ `
// The sun's glitter (Rich): the drawn slope, its unresolved covariance (xx, zz, xz), the foam over it, and whether
// the lobe lights this fragment (from below the water keeps three's GGX).
vec2 waterGlitterSlope = vec2( 0.0 );
vec3 waterGlitterCov = vec3( 0.0 );
float waterGlitterCover = 0.0;
float waterGlitterOn = 0.0;
// The water's: the sun's lobe, lit once per pixel (−1 where three's GGX lights it instead), and the ripples' per-axis
// unresolved variance, from the normal chunk.
float waterGlitterSun = -1.0;
vec2 waterGlitterRipple = vec2( 0.0 );
// Medium's lite road: the sun's α², from the body chunk.
float waterGlitterLite = 0.0;
uniform vec2 waterGlitterUnresolved;
const float GLITTER_FLOOR = ${f(GLITTER_BASE_VARIANCE + SUN_DISC_VARIANCE)};
const float GLITTER_FOAM = ${f(GLITTER_FOAM_VARIANCE)};
const float GLITTER_SCREEN_CAP = ${f(SCREEN_VARIANCE_CAP)};
vec3 waterGlitterScreen( vec2 dx, vec2 dy ) {
  vec3 aa = 0.5 * vec3( dx.x * dx.x + dy.x * dy.x, dx.y * dx.y + dy.y * dy.y, dx.x * dx.y + dy.x * dy.y );
  return aa * min( 1.0, GLITTER_SCREEN_CAP / max( max( aa.x, aa.y ), 1e-8 ) );
}
vec3 waterGlitterTangent( vec3 n ) {
  return normalize( cross( abs( n.y ) < 0.99 ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 ), n ) );
}
float waterGlitterLambda( vec3 w, vec3 n, vec3 tx, vec3 tz, vec3 cov ) {
  float c = dot( w, n );
  if ( c <= 0.0 ) return 1e6;
  vec3 tangent = w - c * n;
  vec2 a = vec2( dot( tangent, tx ), dot( tangent, tz ) );
  float across = dot( a, a );
  if ( across < 1e-12 ) return 0.0;
  float variance = ( a.x * a.x * cov.x + a.y * a.y * cov.y + 2.0 * a.x * a.y * cov.z ) / across;
  float nu = c / sqrt( 2.0 * max( variance, 1e-9 ) * max( 1.0 - c * c, 1e-12 ) );
  if ( nu >= 1.6 ) return 0.0;
  return ( 1.0 - 1.259 * nu + 0.396 * nu * nu ) / ( 3.535 * nu + 2.181 * nu * nu );
}
// Adapted from web-ocean's sun glitter (js/wgsl/ocean.js; MIT licence, © 2026 Maksymilian Dendura).
float waterGlitter( vec3 l, vec3 v, vec3 n, vec3 up, vec3 tx, vec3 tz, vec2 mean, vec3 cov ) {
  float nv = dot( n, v );
  float nl = dot( n, l );
  if ( nv <= 0.0 || nl <= 0.0 ) return 0.0;
  vec3 h = normalize( l + v );
  float hu = dot( h, up );
  if ( hu <= 0.0 ) return 0.0;
  float limit = 0.99 * sqrt( max( cov.x * cov.y, 0.0 ) );
  cov.z = clamp( cov.z, -limit, limit );
  vec2 d = -vec2( dot( h, tx ), dot( h, tz ) ) / hu - mean;
  float det = max( cov.x * cov.y - cov.z * cov.z, 1e-20 );
  float e = ( d.x * d.x * cov.y + d.y * d.y * cov.x - 2.0 * d.x * d.y * cov.z ) / det;
  float hu2 = hu * hu;
  float distribution = exp( -0.5 * e ) / ( 6.28318530718 * sqrt( det ) * hu2 * hu2 );
  float masking = 1.0 / ( 1.0 + waterGlitterLambda( v, n, tx, tz, cov ) + waterGlitterLambda( l, n, tx, tz, cov ) );
  return distribution * masking * dot( n, up ) / ( 4.0 * max( nv, 1e-4 ) );
}
`;

/**
 * GLSL for the end of the water's normal chunk (tank and far ocean): the ripples' per-axis unresolved variance, kept
 * for the sun's lobe (`RICH_SUN_GLITTER`). Needs `waterRippleCov`.
 */
export const RICH_GLITTER_RIPPLES = /* glsl */ `
#if defined( WATER_SUN_GLITTER ) && defined( WATER_GLITTER_RIPPLES )
  waterGlitterRipple = waterRippleCov.xy;
#endif`;

/**
 * GLSL at the end of the water's body (tank and far ocean; in `RICH_SPECULAR`'s place, where the foam over the water
 * is known): on Medium, the lite road's α² (`liteSunAlpha2`) into `waterGlitterLite`; with the glitter on, the sun's lobe, lit once per pixel in the world's frame, into `waterGlitterSun` for three's direct
 * lights (−1 from below the water, where three's GGX lights it). Its mean is the drawn normal's slope; its covariance
 * the ripples' (from the normal chunk), the chop's spread by distance (`chopCovariance`), the screen-space term of the
 * slope, the floor, the foam's matte and the unresolved slopes. The lobe is `glitter`'s maths as `sunGlitter` arranges
 * them: no branches, one inverse square root for the Gaussian, both Smith Λs side by side, one division for the
 * masking; written out here rather than called (the M1 timed the arrangement written out cheaper, the shader-cost pass
 * of 2026-10-18). Needs `waterN`, `waterV`, `waterCover`, `faceDirection`, the sun's direction and the chop's pars.
 */
export const RICH_SUN_GLITTER = /* glsl */ `
#ifdef WATER_SUN_GLITTER
  {
    float glitterDistance = length( vWaterWorld - cameraPosition );
    vec2 glitterSlope = -waterN.xz / max( waterN.y, 0.02 );
    vec3 glitterCov = vec3( vec2( GLITTER_FLOOR + waterCover * GLITTER_FOAM + waterGlitterUnresolved.x
      + waterGlitterUnresolved.y * smoothstep( 30.0, 500.0, glitterDistance ) ) + waterGlitterRipple, 0.0 );
#ifdef WATER_GLITTER_CHOP
    glitterCov += ${chopCovarianceGlsl('glitterDistance')};
#endif
#ifdef WATER_GLITTER_SCREEN
    glitterCov += waterGlitterScreen( dFdx( glitterSlope ), dFdy( glitterSlope ) );
#endif
    // The Gaussian of the half vector's slope about the drawn slope (adapted from web-ocean, MIT).
    vec3 glitterSum = waterSunDirection + waterV;
    float glitterSumY = 1.0 / max( glitterSum.y, 1e-4 );
    vec2 glitterD = -glitterSum.xz * glitterSumY - glitterSlope;
    float glitterRs = inversesqrt( max( glitterCov.x * glitterCov.y - glitterCov.z * glitterCov.z, 0.0199 * glitterCov.x * glitterCov.y ) );
    float glitterE = ( glitterD.x * glitterD.x * glitterCov.y + glitterD.y * glitterD.y * glitterCov.x - 2.0 * glitterD.x * glitterD.y * glitterCov.z ) * glitterRs * glitterRs;
    float glitterHu = dot( glitterSum, glitterSum ) * glitterSumY * glitterSumY;
    float glitterDensity = exp( -0.5 * glitterE ) * glitterRs * 0.15915494 * min( glitterHu * glitterHu, 1e8 );
    // Smith's masking for the view and the sun side by side, each along its own azimuth.
    vec2 glitterCos = vec2( dot( waterN, waterV ), dot( waterN, waterSunDirection ) );
    vec2 glitterC = max( glitterCos, 1e-4 );
    vec2 glitterAx = vec2( waterV.x, waterSunDirection.x ) - glitterC * waterN.x;
    vec2 glitterAz = vec2( waterV.z, waterSunDirection.z ) - glitterC * waterN.z;
    vec2 glitterVar = max( ( glitterAx * glitterAx * glitterCov.x + glitterAz * glitterAz * glitterCov.y + 2.0 * glitterAx * glitterAz * glitterCov.z )
      / max( glitterAx * glitterAx + glitterAz * glitterAz, 1e-12 ), 1e-9 );
    vec2 glitterNu = glitterC * inversesqrt( 2.0 * glitterVar * max( 1.0 - glitterC * glitterC, 1e-12 ) );
    vec2 glitterP = ( 1.0 - step( 1.6, glitterNu ) ) * ( 1.0 - 1.259 * glitterNu + 0.396 * glitterNu * glitterNu );
    vec2 glitterQ = 3.535 * glitterNu + 2.181 * glitterNu * glitterNu;
    float glitterLit = glitterCos.x > 0.0 && glitterCos.y > 0.0 && glitterSum.y > 0.0 ? 1.0 : 0.0;
    waterGlitterSun = faceDirection > 0.0 && waterN.y > 0.02
      ? glitterLit * glitterDensity * waterN.y * glitterQ.x * glitterQ.y / ( ( glitterQ.x * glitterQ.y + glitterP.x * glitterQ.y + glitterP.y * glitterQ.x ) * 4.0 * glitterC.x )
      : -1.0;
  }
#endif
#ifdef WATER_SUN_LITE
  {
    // Medium's lite road (liteSunAlpha2): the glitter's spread without its screen-space term, isotropic, as the sun's α².
    float liteDistance = length( vWaterWorld - cameraPosition );
    vec3 liteChop = ${chopCovarianceGlsl('liteDistance')};
    waterGlitterLite = 2.0 * ( GLITTER_FLOOR + waterCover * GLITTER_FOAM + waterGlitterUnresolved.x
      + waterGlitterUnresolved.y * smoothstep( 30.0, 500.0, liteDistance ) + 0.5 * ( liteChop.x + liteChop.y ) ) + waterRippleVariance;
  }
#endif`;

/**
 * GLSL for a lip or tube sheet after its normal is final: the lobe about the sheet's own normal, its covariance the
 * screen-space term of that normal in the sheet's tangent frame.
 */
export const RICH_SHEET_GLITTER = /* glsl */ `
  {
    vec3 sheetNormal = normalize( normal );
    vec3 sheetX = waterGlitterTangent( sheetNormal );
    vec3 sheetZ = cross( sheetNormal, sheetX );
    vec3 dnx = dFdx( sheetNormal );
    vec3 dny = dFdy( sheetNormal );
    waterGlitterSlope = vec2( 0.0 );
    waterGlitterCov = waterGlitterScreen( vec2( dot( dnx, sheetX ), dot( dnx, sheetZ ) ), vec2( dot( dny, sheetX ), dot( dny, sheetZ ) ) );
    waterGlitterOn = 1.0;
  }`;

/**
 * Replaces `#include <lights_physical_pars_fragment>`: with the glitter on (`glitterMode`), its switches for the
 * chunks after, and the direct lights' specular through the glitter where it is on, three's own lighting elsewhere.
 * The water (`sheet` false) takes the sun's lobe lit once per pixel (`RICH_SUN_GLITTER`); its other direct lights
 * (the fill, dark under a photographed sky) keep three's GGX. A sheet (lips and tubes) lights the lobe per light, in
 * the frame of its own normal. With the glitter lite (Medium), the water's `RICH_SUN_LITE_LIGHTS`, and three's lighting
 * on sheets; with it off, three's lighting.
 */
export function richGlitterLights(sheet: boolean): string {
  if (!glitterMode.on) return glitterMode.lite && !sheet ? RICH_SUN_LITE_LIGHTS : '#include <lights_physical_pars_fragment>';
  // WATER_GLITTER: the chop's footprint statistics for its mean (`RICH_CHOP_STATS`); the water's lobe and its parts.
  const switches = ['WATER_GLITTER', ...(sheet ? [] : ['WATER_SUN_GLITTER', glitterMode.ripples && 'WATER_GLITTER_RIPPLES',
    glitterMode.chop && 'WATER_GLITTER_CHOP', glitterMode.screen && 'WATER_GLITTER_SCREEN'])].filter(Boolean).map((name) => `#define ${name}`).join('\n');
  const specular = sheet
    ? `if ( waterGlitterOn < 0.5 ) {
    RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    return;
  }
  vec3 up = geometryNormal;
  vec3 tx = waterGlitterTangent( geometryNormal );
  vec3 tz = cross( geometryNormal, tx );
  vec3 cov = waterGlitterCov + vec3( vec2( GLITTER_FLOOR + waterGlitterCover * GLITTER_FOAM ), 0.0 );
  vec3 halfDir = normalize( directLight.direction + geometryViewDir );
  vec3 F = F_Schlick( material.specularColorBlended, material.specularF90, saturate( dot( geometryViewDir, halfDir ) ) );
  float lobe = waterGlitter( directLight.direction, geometryViewDir, geometryNormal, up, tx, tz, waterGlitterSlope, cov );`
    : `// The sun only (the light along \`waterSunDirection\`), and only where the water's lobe is on (not from below).
  if ( waterGlitterSun < 0.0 || dot( directLight.direction, normalize( ( viewMatrix * vec4( waterSunDirection, 0.0 ) ).xyz ) ) < 0.9999 ) {
    RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    return;
  }
  vec3 halfDir = normalize( directLight.direction + geometryViewDir );
  vec3 F = F_Schlick( material.specularColorBlended, material.specularF90, saturate( dot( geometryViewDir, halfDir ) ) );
  float lobe = waterGlitterSun;`;
  return /* glsl */ `#include <lights_physical_pars_fragment>
${switches}
void RE_Direct_WaterGlitter( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  ${specular}
  reflectedLight.directSpecular += directLight.color * F * lobe * material.multiScatteringCompensation;
  float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
  reflectedLight.directDiffuse += dotNL * directLight.color * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
#undef RE_Direct
#define RE_Direct RE_Direct_WaterGlitter`;
}

/**
 * Medium's sun road (the glitter-lite pass of 2026-10-20), for the water (tank, edge band, far ocean) in place of
 * `#include <lights_physical_pars_fragment>`: three's direct lights with the specular lobe a Beckmann distribution
 * (`beckmann`) in place of GGX, whose long tails turned a wider road into a glow. The sun's α² is the lite road's
 * (`waterGlitterLite`, from the body: `liteSunAlpha2`); any other direct light (the fill, dark under a photographed sky)
 * keeps its material's. Masking is three's height-correlated Smith (`V_GGX_SmithCorrelated`) taken from α² directly.
 * No branches: on the M1 a light's branch cost Medium +1.5 ms a frame, and GGX kept beside it for the fill +0.1.
 */
export const RICH_SUN_LITE_LIGHTS = /* glsl */ `#include <lights_physical_pars_fragment>
#define WATER_SUN_LITE
void RE_Direct_WaterLite( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  float alpha2 = mix( pow4( material.roughness ), waterGlitterLite, step( 0.9999, dot( directLight.direction, mat3( viewMatrix ) * waterSunDirection ) ) );
  vec3 halfDir = normalize( directLight.direction + geometryViewDir );
  float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
  float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
  float dotNH = saturate( dot( geometryNormal, halfDir ) );
  vec3 F = F_Schlick( material.specularColorBlended, material.specularF90, saturate( dot( geometryViewDir, halfDir ) ) );
  float c2 = max( dotNH * dotNH, 1e-4 );
  float D = exp( ( c2 - 1.0 ) / ( alpha2 * c2 ) ) / ( PI * alpha2 * c2 * c2 );
  float gv = dotNL * sqrt( alpha2 + ( 1.0 - alpha2 ) * dotNV * dotNV );
  float gl = dotNV * sqrt( alpha2 + ( 1.0 - alpha2 ) * dotNL * dotNL );
  vec3 irradiance = dotNL * directLight.color;
  reflectedLight.directSpecular += irradiance * F * ( 0.5 / max( gv + gl, EPSILON ) * D ) * material.multiScatteringCompensation;
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
#undef RE_Direct
#define RE_Direct RE_Direct_WaterLite`;
