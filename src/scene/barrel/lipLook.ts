import { devParam } from '../../devTools';
import { ROLLER_LOOK } from '../water/rollerLook';
import { LIP_FRAY } from './brokenCrest';

/**
 * Dev switch `?lipLook=fray` (ruling 9 rank 1, 2026-11-11, `docs/research/lip-look-2026-11-11/README.md`): the Wave
 * Pool lip as a fraying sheet, not a clean stub. The owner's ride, 2026-11-11: the falling water "should start thinner
 * and with foam, then become thicker, also with foam". Drawing only: the collided surface, the void and the water a
 * rider feels do not change, and without the switch the lip is drawn as before.
 *
 * Step 1, built: thin water is white. The lip's foam follows its sheet's thickness (`LIP_FRAY`, `lipFoamAt`): white at
 * the tip, clean glass where the sheet is thick, and a white crest's foam is no longer capped on its lip. The frayed
 * part is lit as a thin sheet of drops, from both faces (`LIP_FRAY_VOLUME`).
 * Not built yet: the toothed tip, the drops off it, the crest's veil and the eased start (the ruling's table).
 */
export function lipLookFray(search?: string): boolean {
  return devParam('lipLook', search)?.trim().toLowerCase() === 'fray';
}

/** Read once, when the tube's mesh is made. */
export const LIP_LOOK_FRAY = lipLookFray();

/** The share of the light on a frayed sheet's far face that leaves its near face (the rest leaves the far face). P. */
export const LIP_FRAY_THROUGH = 0.5;

/** GLSL: the frayed share of a sheet's foam, by its thinness (`LIP_FRAY_VOLUME`). */
export const LIP_FRAY_SHARE = `clamp( vWaterFoam, 0.0, 1.0 ) * ( 1.0 - smoothstep( ${LIP_FRAY.white.toFixed(3)}, ${LIP_FRAY.clean.toFixed(3)}, vSweptSheet ) )`;

/**
 * GLSL (the tube's sheet light, after it): the frayed part of the lip lit as a thin sheet of ligaments and drops.
 * Each face takes the sun as the whitewater's band does, wrapped round it, (N·L + w) / (1 + w) (`ROLLER_LOOK.wrap`, the
 * coordinator's ruling of 2026-10-07), and a sheet this thin passes a share of what its far face takes
 * (`LIP_FRAY_THROUGH`), the sun and the light behind it (`sweptBack`, the clean sheet's own back light, here without
 * Beer–Lambert: scattered, not absorbed). At w = 1 and a half share the sun's part has no facing. Never below the
 * surface's own N·L, which the lit foam already takes. Measured without it (2026-11-11): the white tip drew near
 * black, (18, 40, 58), since both of the tip's faces turn from a high sun and its foam hid the light through the sheet.
 * Its albedo is fresh whitewater's, flat across the visible at the foam colour's brightest channel, as the band's crest
 * (`ROLLER_LOOK.wrap`'s comment). The frayed share is the sheet's weight by its thinness, per fragment, as `frayWhite`
 * per vertex.
 */
export const LIP_FRAY_VOLUME = /* glsl */ `
    float sweptFray = vSweptSheetWeight * ${LIP_FRAY_SHARE};
    float sweptFraySun = dot( waterN, waterSunDirection );
    float sweptFrayNear = max( 0.0, ( sweptFraySun + ${ROLLER_LOOK.wrap.toFixed(3)} ) / ${(1 + ROLLER_LOOK.wrap).toFixed(3)} );
    float sweptFrayFar = max( 0.0, ( ${ROLLER_LOOK.wrap.toFixed(3)} - sweptFraySun ) / ${(1 + ROLLER_LOOK.wrap).toFixed(3)} );
    totalEmissiveRadiance += sweptFray * max( waterFoamColor.r, max( waterFoamColor.g, waterFoamColor.b ) ) * RECIPROCAL_PI * (
      waterSunRadiance * max( 0.0, ${(1 - LIP_FRAY_THROUGH).toFixed(3)} * sweptFrayNear + ${LIP_FRAY_THROUGH.toFixed(3)} * sweptFrayFar - max( 0.0, sweptFraySun ) )
      + ${LIP_FRAY_THROUGH.toFixed(3)} * sweptBack );`;

/**
 * Foam streaks round the curl (ruling 25 part (a), 2026-11-12, `docs/research/pool-look-reference-2026-11-11/`): the
 * owner's reference, a real pool tube, carries white streaks round its lip. Rich with `?lipLook=fray` only; drawing
 * only. A fixed pattern of (u, s − V·τ): u along the crest, s the arc length round the profile from the crest, τ the
 * slice's clock since its throw, so the streaks stay put along the crest and slide round the curl with the lip's
 * water. No free time. All numbers are the ruling's, provisional.
 */
export const LIP_STREAK = {
  /** The lip water's speed along the sheet, m/s (about √(2g·drop)). */
  speed: 3,
  /** The two layers' cells, m: along the crest, round the curl; the second layer weighs half. */
  cells: [[0.25, 2.0], [0.7, 3.5]],
  /** The cover round the profile: (profile point, cover), linear between; zero outside. Crest 32, tip 64, throat 88. */
  cover: [[32, 0], [48, 0.3], [64, 0.8], [88, 0.2], [100, 0]],
  /** The threshold's half width. */
  edge: 0.08,
  /** Eased in over this long after the throw, s; faded over this long after touchdown, s. */
  easeIn: 0.15,
  fadeOut: 0.2,
  /** The most foam a streak is. */
  strength: 0.85,
} as const;

/** The streaks' cover at a profile point (fractional points allowed). */
export function lipStreakCover(point: number): number {
  const c = LIP_STREAK.cover;
  if (!(point > c[0][0]) || point >= c[c.length - 1][0]) return 0;
  for (let i = 1; i < c.length; i += 1) {
    if (point <= c[i][0]) return c[i - 1][1] + (c[i][1] - c[i - 1][1]) * (point - c[i - 1][0]) / (c[i][0] - c[i - 1][0]);
  }
  return 0;
}

/** The streaks' clock: 0 at or before the throw, eased in after it, faded out after touchdown (`after`: s since it). */
export function lipStreakClock(tau: number, after: number): number {
  if (!(tau > 0)) return 0;
  const t = Math.min(1, tau / LIP_STREAK.easeIn);
  return t * t * (3 - 2 * t) * Math.max(0, 1 - Math.max(0, after) / LIP_STREAK.fadeOut);
}

/** GLSL, vertex: `sweptStreak` = (u, s − V·τ, cover, clock), per vertex (`SweptBarrelMesh.update`). */
export const LIP_STREAK_VERTEX_PARS = /* glsl */ `attribute vec4 sweptStreak;
varying vec4 vSweptStreak;`;
export const LIP_STREAK_VERTEX = /* glsl */ `
vSweptStreak = sweptStreak;`;

const cell = (layer: number) => `vec2( ${(1 / LIP_STREAK.cells[layer][0]).toFixed(4)}, ${(1 / LIP_STREAK.cells[layer][1]).toFixed(4)} )`;
/** GLSL, fragment pars: a smooth 2D value noise, and the streaks' foam from the vertex's four values. */
export const LIP_STREAK_FRAGMENT_PARS = /* glsl */ `varying vec4 vSweptStreak;
float sweptStreakHash( vec2 p ) {
  vec3 q = fract( vec3( p.xyx ) * 0.1031 );
  q += dot( q, q.yzx + 33.33 );
  return fract( ( q.x + q.y ) * q.z );
}
float sweptStreakNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( sweptStreakHash( i ), sweptStreakHash( i + vec2( 1.0, 0.0 ) ), f.x ),
    mix( sweptStreakHash( i + vec2( 0.0, 1.0 ) ), sweptStreakHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
// The streaks' foam: the pattern over the cover's threshold; far away, where a pixel spans a cell along the crest, the
// pattern goes to its mean and the edge widens, so it does not shimmer.
float sweptStreakFoam() {
  if ( vSweptStreak.w <= 0.0 || vSweptStreak.z <= 0.0 ) return 0.0;
  vec2 at = vSweptStreak.xy;
  float pattern = ( sweptStreakNoise( at * ${cell(0)} ) + 0.5 * sweptStreakNoise( at * ${cell(1)} + vec2( 17.0, 5.0 ) ) ) / 1.5;
  float footprint = fwidth( vSweptStreak.x ) * ${(1 / LIP_STREAK.cells[0][0]).toFixed(4)};
  pattern = mix( pattern, 0.5, smoothstep( 0.5, 1.5, footprint ) );
  float edge = ${LIP_STREAK.edge.toFixed(3)} + 0.25 * min( footprint, 1.0 );
  float cover = vSweptStreak.z;
  return ${LIP_STREAK.strength.toFixed(3)} * vSweptStreak.w * min( 1.0, cover / 0.05 ) * smoothstep( 1.0 - cover - edge, 1.0 - cover + edge, pattern );
}`;
/** GLSL, fragment, before the body: the foam the body, the lit foam and `LIP_FRAY_VOLUME` read in `vWaterFoam`'s place. */
export const LIP_STREAK_FOAM = /* glsl */ `float sweptStreakOwn = sweptStreakFoam();
float sweptStreakLit = max( vWaterFoam, sweptStreakOwn );
`;
/** The foam composition's albedo line the streaks change (`CLASSIC_FOAM`, in the tube's Rich foam). */
export const LIP_STREAK_ALBEDO_LINE = 'diffuseColor.rgb = mix( waterBody * waterBodyGain, waterFoamColor, waterCover );';
/**
 * GLSL: the albedo with the streaks (step 14): a streak's share of the cover takes fresh whitewater's albedo, flat across
 * the visible at the foam colour's brightest channel, as the roller band's crest (`BAND_ALBEDO`, `ROLLER_LOOK.wrap`'s
 * comment): the sea's own freshest foam. The rest keeps the foam colour.
 */
export const LIP_STREAK_ALBEDO = /* glsl */ `diffuseColor.rgb = mix( waterBody * waterBodyGain, mix( waterFoamColor, vec3( max( waterFoamColor.r, max( waterFoamColor.g, waterFoamColor.b ) ) ), clamp( sweptStreakOwn / max( waterCover, 1e-4 ), 0.0, 1.0 ) ), waterCover );`;
/**
 * GLSL (after `LIP_FRAY_VOLUME`, in its scope): a streak lit as the sea's foam is (step 14, 2026-11-12). Where the sheet
 * is thin the fray's light already takes the streaked foam (its share reads the streaked foam); the rest of a streak,
 * on the thick sheet, takes the light the roller band's whitewater takes beyond the surface's N·L (`BAND_VOLUME`): the
 * sun wrapped round the face, (N·L + w) / (1 + w) − max(0, N·L), at the band's albedo. No light from behind the sheet:
 * the fray passes what lies behind a sheet only where it is thin. On the inner face the sun is the sun that reaches it,
 * as `RICH_THROAT` lets it reach the face's direct light: whole where it leaves the tube, else through the lip on the
 * slant path; so foam in the tube's shade is lit as the water there is, with no glow of its own.
 * Measured (step 14): as the fray's white, with the light behind it, a streak on the thick sheet took the back wall's
 * water colour and the sky through the mouth and drew pale blue, (176, 219, 236) at full cover, 1 % white.
 */
export const LIP_STREAK_VOLUME = /* glsl */ `
    vec2 sweptStreakTip = vec2( dot( vSweptTube.xz - vWaterWorld.xz, vSweptRay.xy ), vSweptTube.y - vWaterWorld.y );
    vec2 sweptStreakSunPlane = vec2( dot( waterSunDirection.xz, vSweptRay.xy ), waterSunDirection.y );
    vec3 sweptStreakSun = sweptLeaves( waterSunDirection, sweptStreakTip ) ? vec3( 1.0 ) : exp( -waterAttenuation * vSweptThroat.z / max( 0.2, abs( dot( vSweptRay.zw, sweptStreakSunPlane ) ) ) );
    sweptStreakSun = mix( vec3( 1.0 ), sweptStreakSun, clamp( vSweptThroat.w, 0.0, 1.0 ) );
    totalEmissiveRadiance += max( 0.0, sweptStreakOwn - sweptFray ) * max( waterFoamColor.r, max( waterFoamColor.g, waterFoamColor.b ) ) * waterSunRadiance * sweptStreakSun * RECIPROCAL_PI
      * ( max( 0.0, ( sweptFraySun + ${ROLLER_LOOK.wrap.toFixed(3)} ) / ${(1 + ROLLER_LOOK.wrap).toFixed(3)} ) - max( 0.0, sweptFraySun ) );`;

function swapOnce(source: string, target: string, replacement: string): string {
  if (source.split(target).length !== 2) throw new Error(`The lip's streaks need ${target.split('\n').find(Boolean)} once`);
  return source.replace(target, () => replacement);
}

/**
 * The body with the streaks: every `vWaterFoam` it reads becomes the streaked foam (the lit foam, the sheet's light
 * through it, and the fray's thin share); a streak's albedo is fresh whitewater's; and a streak on the thick sheet is lit
 * as the sea's whitewater (`LIP_STREAK_VOLUME`), not as the fray. Needs `LIP_FRAY_VOLUME` in the body.
 */
export function withLipStreaks(body: string): string {
  const lit = swapOnce(swapOnce(body, LIP_FRAY_VOLUME, LIP_FRAY_VOLUME + LIP_STREAK_VOLUME), LIP_STREAK_ALBEDO_LINE, LIP_STREAK_ALBEDO);
  return LIP_STREAK_FOAM + lit.split('vWaterFoam').join('sweptStreakLit');
}
