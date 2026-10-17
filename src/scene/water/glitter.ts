/**
 * The sun's glitter on the Rich water (web-ocean plan, item 5): the sun's
 * specular as an anisotropic Gaussian distribution of facet slopes (LEAN
 * mapping), in place of three's GGX of one scalar roughness. Its mean is the
 * drawn normal's slope; its covariance is what the pixel's footprint leaves
 * unresolved: the chop's and the ripples' slope moments from their mipmaps,
 * a screen-space term for everything else (the tank's own height field
 * among it), and a floor for the gloss and the sun's disc. Seen from below,
 * the water keeps three's GGX. Lip and tube sheets take the same lobe about
 * their own normal, fed by the screen-space term alone: the moments live in
 * the sea's horizontal slope space, which a curling sheet leaves.
 *
 * The lobe (slope-space Gaussian, Smith masking, Schlick F0 0.02) is adapted
 * from web-ocean, js/wgsl/ocean.js (MIT licence, © 2026 Maksymilian Dendura),
 * rewritten for three's lighting and for a tilted macro surface: the tank's
 * faces are steep, so the light reflected per unit of horizontal area is
 * divided by the face's own projected area, (v·n)/n_y, not by v_y.
 */
import { Vector2 } from 'three';
import { RICH_BASE_ROUGHNESS } from './specular';

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

/** The unresolved per-axis variance at a distance, m: the GLSL's. */
export function unresolvedVariance(distance: number, unresolved = GLITTER_UNRESOLVED): number {
  const t = Math.min(1, Math.max(0, (distance - 30) / 470));
  return unresolved.constant + unresolved.far * t * t * (3 - 2 * t);
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
 * GLSL for the end of the water's normal chunk (tank and far ocean): the glitter's mean from the drawn normal, and
 * to the covariance the chop's moments put there already, the ripples' and the screen-space term's. Needs
 * `faceDirection`, `normal` (view space) and `waterRippleCov`.
 */
export const RICH_GLITTER_SLOPE = /* glsl */ `
  {
    vec3 glitterNormal = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
    waterGlitterOn = faceDirection > 0.0 && glitterNormal.y > 0.02 ? 1.0 : 0.0;
    waterGlitterSlope = -glitterNormal.xz / max( glitterNormal.y, 0.02 );
    waterGlitterCov += waterRippleCov + waterGlitterScreen( dFdx( waterGlitterSlope ), dFdy( waterGlitterSlope ) );
  }`;

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
 * Replaces `#include <lights_physical_pars_fragment>`: the direct lights' specular through the glitter where it is
 * on, three's own lighting elsewhere. `sheet` takes the frame from the sheet's normal (lips and tubes); the water's
 * frame is the world's, whose up, x and z are the view matrix's columns.
 */
export function richGlitterLights(sheet: boolean): string {
  const frame = sheet
    ? `vec3 up = geometryNormal;
  vec3 tx = waterGlitterTangent( geometryNormal );
  vec3 tz = cross( geometryNormal, tx );`
    : `vec3 up = viewMatrix[ 1 ].xyz;
  vec3 tx = viewMatrix[ 0 ].xyz;
  vec3 tz = viewMatrix[ 2 ].xyz;`;
  // The water's unresolved slopes (not a sheet's: it takes the screen-space term alone).
  const unresolved = sheet ? '' : `
  cov.xy += waterGlitterUnresolved.x + waterGlitterUnresolved.y * smoothstep( 30.0, 500.0, length( geometryPosition ) );`;
  return /* glsl */ `#include <lights_physical_pars_fragment>
${sheet ? '' : 'uniform vec2 waterGlitterUnresolved;'}
void RE_Direct_WaterGlitter( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  if ( waterGlitterOn < 0.5 ) {
    RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    return;
  }
  ${frame}
  vec3 cov = waterGlitterCov + vec3( vec2( GLITTER_FLOOR + waterGlitterCover * GLITTER_FOAM ), 0.0 );${unresolved}
  vec3 halfDir = normalize( directLight.direction + geometryViewDir );
  vec3 F = F_Schlick( material.specularColorBlended, material.specularF90, saturate( dot( geometryViewDir, halfDir ) ) );
  float lobe = waterGlitter( directLight.direction, geometryViewDir, geometryNormal, up, tx, tz, waterGlitterSlope, cov );
  reflectedLight.directSpecular += directLight.color * F * lobe * material.multiScatteringCompensation;
  float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
  reflectedLight.directDiffuse += dotNL * directLight.color * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
#undef RE_Direct
#define RE_Direct RE_Direct_WaterGlitter`;
}
