import { devParam } from '../../devTools';
import { ROLLER_LOOK } from '../water/rollerLook';
import { FOAM_TILE, PATCH_CELLS, foamCoverage, sampleFoamTile } from '../foamPattern';
import { AGED_OFFSET, AGED_STREAKS } from '../water/foamFreshness';
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
  /**
   * Ruling 25c: two scales. The lace (the bubbles) is the sea's own foam network at one lace cell per `lace` metres, the
   * same both ways (young crest foam, finer than the sea's 0.7 m surf-zone lace). The streak (where the stretching flow
   * gathers that foam into lines round the curl) is the tile's smooth patch value, read so one patch spacing
   * (`PATCH_CELLS` tile cells) is `streak.across` m along the crest and `streak.round` m round the curl (s − V·τ): the
   * sea's aged-streak shape (`AGED_STREAKS`, about 5 to 1), set to the lip's size, offset as `AGED_OFFSET`. It gathers the
   * lace as the sea's aged foam does (`freshLace`): F' = F + F(1 − F)(1 + gather)(2v − 1).
   * Ruling 25c's lace was 0.25 m; step 16's one retune: 0.15 m (its range 0.15–0.35 m), so a streak (about 0.3 m
   * wide at a 0.6 m spacing) holds two cells across, not one. Measured (step 16 README): it still reads as a net.
   */
  lace: 0.15,
  streak: { across: 0.6, round: 3.0 },
  gather: AGED_STREAKS.gather,
  /**
   * The cover round the profile, a true area share (the lace's thresholds): (profile point, cover), linear between; zero
   * outside. Outer face: crest 32, mid-lip 48, tip 64 (ruling 25b): 0 / 0.3 / 0.8. Inner face (ruling 25c, no icicles):
   * 0.3 at the tip, 0.1 at the throat 88, 0 by 96; so the cover steps down at the tip, from the outer face to the inner.
   */
  cover: [[32, 0], [48, 0.3], [64, 0.8], [64, 0.3], [88, 0.1], [96, 0]],
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

/** Where the lace is read, in tile cells, for (u, s − V·τ), m. */
export function lipLaceCells(u: number, s: number): [number, number] {
  return [u / LIP_STREAK.lace, s / LIP_STREAK.lace];
}
/** Where the streak's patch value is read, in tile cells, for (u, s − V·τ), m (offset as the sea's aged streaks). */
export function lipStreakCells(u: number, s: number): [number, number] {
  return [(u * PATCH_CELLS) / LIP_STREAK.streak.across + AGED_OFFSET[0] * FOAM_TILE, (s * PATCH_CELLS) / LIP_STREAK.streak.round + AGED_OFFSET[1] * FOAM_TILE];
}
/** The gathered foam value F' for cover F and streak value v (the sea's aged-foam rule, `freshLace` at youth 0). */
export function lipGathered(cover: number, v: number): number {
  const f = Math.min(1, Math.max(0, cover));
  return Math.min(1, Math.max(0, f + f * (1 - f) * (1 + LIP_STREAK.gather) * (2 * v - 1)));
}
/** CPU mirror of `sweptStreakFoam`'s lace before its strength and clock: covered (0–1) at (u, s − V·τ), m, at cover F. */
export function lipStreakLace(u: number, s: number, cover: number): number {
  if (!(cover > 0)) return 0;
  const [sx, sz] = lipStreakCells(u, s);
  const [lx, lz] = lipLaceCells(u, s);
  return foamCoverage(lipGathered(cover, sampleFoamTile(sx, sz, 1)), sampleFoamTile(lx, lz, 0));
}

const f4 = (value: number) => value.toFixed(4);
/**
 * GLSL, fragment pars: the streaks' foam from the vertex's four values (ruling 25c). The streak value v is the sea's tile
 * patch channel (`.g`) stretched round the curl (`lipStreakCells`); it gathers the cover F into F' (`lipGathered`); the
 * lace is drawn at F' with the sea's own thresholds (`foamCoverage` in `foamPatternPars`) on the sea's tile at a
 * `LIP_STREAK.lace` cell (`lipLaceCells`). No flow-map phases and no time: the motion is carried by s − V·τ alone. Far
 * away, where a pixel spans the lace's cell, it goes to its mean as the sea's lace does (`waterFoamCover`'s fade). The
 * footprint is taken before any branch, so its derivatives are defined. The tile has no mipmaps.
 */
export const LIP_STREAK_FRAGMENT_PARS = /* glsl */ `varying vec4 vSweptStreak;
float sweptStreakFoam() {
  vec2 laceCells = vSweptStreak.xy * ${f4(1 / LIP_STREAK.lace)};
  float footprint = max( fwidth( laceCells.x ), fwidth( laceCells.y ) );
  if ( vSweptStreak.w <= 0.0 || vSweptStreak.z <= 0.0 ) return 0.0;
  float cover = min( vSweptStreak.z, 1.0 );
  vec2 streakCells = vSweptStreak.xy * vec2( ${f4(PATCH_CELLS / LIP_STREAK.streak.across)}, ${f4(PATCH_CELLS / LIP_STREAK.streak.round)} ) + vec2( ${f4(AGED_OFFSET[0] * FOAM_TILE)}, ${f4(AGED_OFFSET[1] * FOAM_TILE)} );
  float streak = texture( waterFoamTile, streakCells / FOAM_TILE ).g;
  float gathered = clamp( cover + cover * ( 1.0 - cover ) * ${f4(1 + LIP_STREAK.gather)} * ( 2.0 * streak - 1.0 ), 0.0, 1.0 );
  float laced = mix( foamCoverage( gathered, texture( waterFoamTile, laceCells / FOAM_TILE ).r ), cover, smoothstep( 0.25, 1.0, footprint ) );
  return ${LIP_STREAK.strength.toFixed(3)} * vSweptStreak.w * laced;
}`;
/**
 * GLSL: the sheet's thin share (the fray's, without its foam): 1 under `LIP_FRAY.white`, 0 over `LIP_FRAY.clean`.
 * Ruling 25b: where the sheet is thin, a streak never darkens the pixel. The thin tip is already aerated white
 * (ruling 9), so bubbles added there cannot take light away: there the light through the sheet stays the clean lip's
 * (`sweptStreakThrough`), and the streak only adds (the fray's white, the foam's albedo). Measured in step 14: with the
 * streak cutting the light through the thin sheet, the rim drew about 8 % darker. The gate is the ruling's "fray share
 * above 0", not a ramp: a ramp over the share (step 15's first build) left 2067 thin pixels of `curl-lip` darker by more
 * than 2 levels, up to 107, where the share is small but the light through the sheet is bright.
 */
export const LIP_STREAK_THIN = `vSweptSheetWeight * ( 1.0 - smoothstep( ${LIP_FRAY.white.toFixed(3)}, ${LIP_FRAY.clean.toFixed(3)}, vSweptSheet ) )`;
/** The body's light through the sheet, cut by its foam (twice: the light behind and the sun through it). */
export const LIP_STREAK_THROUGH_LINE = '( 1.0 - vWaterFoam ) * ( 1.0 - waterFresnel( waterViewCos ) )';

/** GLSL, fragment, before the body: the foam the body, the lit foam and `LIP_FRAY_VOLUME` read in `vWaterFoam`'s place. */
export const LIP_STREAK_FOAM = /* glsl */ `float sweptStreakOwn = sweptStreakFoam();
float sweptStreakLit = max( vWaterFoam, sweptStreakOwn );
float sweptStreakThrough = ( ${LIP_STREAK_THIN} ) > 0.0 ? vWaterFoam : sweptStreakLit;
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
  if (lit.split(LIP_STREAK_THROUGH_LINE).length !== 3) throw new Error('The lip\'s streaks need the sheet\'s two lights through it');
  const through = lit.split(LIP_STREAK_THROUGH_LINE).join(LIP_STREAK_THROUGH_LINE.replace('vWaterFoam', 'sweptStreakThrough'));
  return LIP_STREAK_FOAM + through.split('vWaterFoam').join('sweptStreakLit');
}
