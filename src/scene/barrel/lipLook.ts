import { devParam } from '../../devTools';
import { ROLLER_LOOK } from '../water/rollerLook';

/**
 * Dev switch `?lipLook=fray` (ruling 9 rank 1, 2026-11-11, `docs/research/lip-look-2026-11-11/README.md`): the Wave
 * Pool lip as a fraying sheet, not a clean stub. The owner's ride, 2026-11-11: the falling water "should start thinner
 * and with foam, then become thicker, also with foam". Drawing only: the collided surface, the void and the water a
 * rider feels do not change, and without the switch the lip is drawn as before.
 *
 * Step 1, built 2026-11-11: thin water is white, keyed on the sheet's thickness.
 * Step 5a, built 2026-11-13 (ruling 36, `docs/research/wave-strategy-alternatives/c2-step5a.md`): **the thickness key is
 * gone.** Water turns white at a time, its own touchdown, so the lip's white is now the torn water at its tip and the
 * feather at its crest (`lipSprayAt`), drawn as a volume of ligaments and drops that covers nothing; the landing's white
 * is opaque and ages; and what is only aerated is milky turquoise, not white (`curlWhiteFoam`). The outer sky face takes
 * no white coat at all.
 * Not built: the drops thrown ahead of the tip (they need geometry, not shading), and the wind streaks.
 */
export function lipLookFray(search?: string): boolean {
  return devParam('lipLook', search)?.trim().toLowerCase() === 'fray';
}

/** Read once, when the tube's mesh is made. */
export const LIP_LOOK_FRAY = lipLookFray();

/** The share of the light on a frayed sheet's far face that leaves its near face (the rest leaves the far face). P. */
export const LIP_FRAY_THROUGH = 0.5;

/**
 * The lip's torn water as it is drawn (ruling 36; the consult's §3 table):
 * - `albedo`: fresh torn water scatters 0.36 (Dierssen 2019's field fit of whitecap spectra) to 0.55 (Koepke 1984's
 *   dense fresh foam) of the light on it, flat across the visible; this is the middle of that range. It takes the place
 *   of the drawn foam colour's brightest channel (0.89 in the working space), which was 1.6–2.5× brighter than any
 *   measured foam;
 * - `ligament`, `strand`: the ligaments' spacing across the sheet and their length down it, m. 10πσ/(ρ_a U²) is 2–4 cm
 *   at a lip speed of 7–10 m/s through the air (the Squire relation the board's spray already uses), so the gaps between
 *   them are a few centimetres: the edge reads torn, not ruled, and nothing of it is an unbroken white band;
 * - `gap`: how much of a cell's noise is a gap, as the thresholds on it [provisional, by eye].
 */
export const LIP_FRINGE = { albedo: 0.45, ligament: 0.03, strand: 0.12, gap: [0.35, 0.65], mean: 0.5 } as const;

/**
 * The torn edge of the curl's white (ruling 36's bar: the white edge is torn, not ruled). A foam line's edge breaks into
 * patches, not ligaments, so this is a coarser noise than the fringe's: `patch` m across, moving the cover by `tear`
 * where it is halfway between water and white, and nothing where it is all one or the other. [Provisional, by eye: the
 * patch size is the decimetre scale a foam line's fingers have, well above a pixel at the stills' range, where the
 * ligaments are not.]
 */
export const CURL_TEAR = { patch: 0.25, tear: 0.8 } as const;

/**
 * The curl's white, by what the stuff is and not by one flat colour (ruling 36; the consult's §3 and §5 point 6). The
 * cover under a fragment stands for the air in it [reasoned]:
 * - under `aerated` it is aerated water, void 0.13–0.4: milky turquoise, the white's own colour carried through the water
 *   the light has diffused through, Beer–Lambert on the spot's diffuse attenuation over `path` (red goes first: Pope &
 *   Fry's 0.34 m⁻¹ against green's 0.057 and blue's 0.009, so a white becomes a turquoise that is still far brighter
 *   than the clean body);
 * - over `dense` it is no longer a liquid but a closely packed scattering medium (above 70 % air, Dierssen 2019 after
 *   Kokhanovsky): opaque white;
 * - `path`: the water that light scatters through inside aerated water, m [provisional: the tint's one free number].
 */
export const CURL_WHITE = { aerated: 0.4, dense: 0.7, path: 2 } as const;

/** The whole part of `sweptSpray` (the torn water in these steps) and the most its fraction (the white's age) holds. */
export const LIP_SPRAY_STEPS = 1023;
export const LIP_AGE_MAX = 0.998;

/**
 * The curl's torn water and the age of its white, per vertex, packed into one attribute as `sweptLift` packs the lift and
 * the foam (WebGL2's guaranteed 16 attributes; `packSweptSpray`): the whole part is the torn water in `LIP_SPRAY_STEPS`
 * steps, the fraction the landing white's brightness against its first instant, in `LIP_AGE_MAX`.
 */
export const LIP_SPRAY_VERTEX_PARS = /* glsl */ `attribute float sweptSpray;
varying float vSweptSpray;
varying float vSweptWhiteAge;`;
export const LIP_SPRAY_VERTEX = /* glsl */ `
float sweptSpraySteps = floor( sweptSpray );
vSweptSpray = sweptSpraySteps / ${LIP_SPRAY_STEPS.toFixed(1)};
vSweptWhiteAge = ( sweptSpray - sweptSpraySteps ) / ${LIP_AGE_MAX.toFixed(3)};`;

/**
 * The ligaments the torn water breaks into, in the fragment: value noise in cells `LIP_FRINGE.ligament` across and
 * `strand` tall, so the strands hang down the falling sheet and their gaps are a few centimetres apart along the crest.
 * The lattice wraps every 64 cells (about 1.9 m) to keep the hash's argument small, where a float's step would otherwise
 * band the pattern; a 1.9 m repeat of a 3 cm pattern does not show.
 */
export const LIP_FRAY_PARS = /* glsl */ `varying float vSweptSpray;
varying float vSweptWhiteAge;
float sweptSprayHash( vec3 cell ) {
  return fract( sin( dot( mod( cell, 64.0 ), vec3( 12.9898, 78.233, 37.719 ) ) ) * 43758.5453 );
}
float sweptSprayNoise( vec3 p ) {
  vec3 base = floor( p );
  vec3 f = p - base;
  f = f * f * ( 3.0 - 2.0 * f );
  float value = 0.0;
  for ( float cx = 0.0; cx < 2.0; cx += 1.0 ) {
    for ( float cy = 0.0; cy < 2.0; cy += 1.0 ) {
      for ( float cz = 0.0; cz < 2.0; cz += 1.0 ) {
        value += mix( 1.0 - f.x, f.x, cx ) * mix( 1.0 - f.y, f.y, cy ) * mix( 1.0 - f.z, f.z, cz )
          * sweptSprayHash( base + vec3( cx, cy, cz ) );
      }
    }
  }
  return value;
}
// How much of a pattern this many metres across a fragment can still show: nothing under a pixel, all over two.
float sweptDetail( float cell ) {
  float footprint = max( max( fwidth( vWaterWorld.x ), fwidth( vWaterWorld.y ) ), fwidth( vWaterWorld.z ) );
  return 1.0 - smoothstep( 0.5 * cell, 2.0 * cell, footprint );
}
// The ligaments: strands LIP_FRINGE.ligament across and .strand tall, faded to their mean where they fall under a pixel.
float sweptLigaments( vec3 world ) {
  float pattern = smoothstep( ${LIP_FRINGE.gap[0].toFixed(2)}, ${LIP_FRINGE.gap[1].toFixed(2)},
    sweptSprayNoise( world / vec3( ${LIP_FRINGE.ligament.toFixed(3)}, ${LIP_FRINGE.strand.toFixed(3)}, ${LIP_FRINGE.ligament.toFixed(3)} ) ) );
  return mix( ${LIP_FRINGE.mean.toFixed(2)}, pattern, sweptDetail( ${LIP_FRINGE.ligament.toFixed(3)} ) );
}
// The white's torn edge: patches CURL_TEAR.patch across, as a move on the cover, strongest halfway between water and white.
float sweptTornCover( float cover ) {
  float patches = sweptSprayNoise( vWaterWorld / ${CURL_TEAR.patch.toFixed(3)} ) - 0.5;
  float edge = 4.0 * cover * ( 1.0 - cover );
  return clamp( cover + ${CURL_TEAR.tear.toFixed(2)} * patches * edge * sweptDetail( ${CURL_TEAR.patch.toFixed(3)} ), 0.0, 1.0 );
}`;

/**
 * GLSL (the tube's sheet light, after it): the lip's torn water — the fringe at its tip and the feather at its crest
 * (`lipSprayAt`) — lit as a thin sheet of ligaments and drops, broken into strands (`sweptLigaments`).
 * Each face takes the sun as the whitewater's band does, wrapped round it, (N·L + w) / (1 + w) (`ROLLER_LOOK.wrap`, the
 * coordinator's ruling of 2026-10-07), and a sheet this thin passes a share of what its far face takes
 * (`LIP_FRAY_THROUGH`), the sun and the light behind it (`sweptBack`, the clean sheet's own back light, here without
 * Beer–Lambert: scattered, not absorbed). At w = 1 and a half share the sun's part has no facing. Its albedo is torn
 * water's own, `LIP_FRINGE.albedo`, flat across the visible.
 * It only adds light: it writes no cover, so the sheet under it stays clear water and the shoulder and the sky still show
 * through the curtain. Step 1 subtracted the surface's own N·L, because the white it lit was a coat the lit foam had
 * already taken; there is no coat now, so that term is gone (ruling 36).
 */
export const LIP_FRAY_VOLUME = /* glsl */ `
    float sweptFray = vSweptSheetWeight * clamp( vSweptSpray, 0.0, 1.0 );
    if ( sweptFray > 0.002 ) {
      sweptFray *= sweptLigaments( vWaterWorld );
      float sweptFraySun = dot( waterN, waterSunDirection );
      float sweptFrayNear = max( 0.0, ( sweptFraySun + ${ROLLER_LOOK.wrap.toFixed(3)} ) / ${(1 + ROLLER_LOOK.wrap).toFixed(3)} );
      float sweptFrayFar = max( 0.0, ( ${ROLLER_LOOK.wrap.toFixed(3)} - sweptFraySun ) / ${(1 + ROLLER_LOOK.wrap).toFixed(3)} );
      totalEmissiveRadiance += sweptFray * ${LIP_FRINGE.albedo.toFixed(3)} * RECIPROCAL_PI * (
        waterSunRadiance * ( ${(1 - LIP_FRAY_THROUGH).toFixed(3)} * sweptFrayNear + ${LIP_FRAY_THROUGH.toFixed(3)} * sweptFrayFar )
        + ${LIP_FRAY_THROUGH.toFixed(3)} * sweptBack );
    }`;

const CURL_BODY_LINE = 'diffuseColor.rgb = mix( waterBody * waterBodyGain, waterFoamColor, waterCover );';

/**
 * The curl's own foam composition under `?lipLook=fray` (ruling 36, the consult's §3): three materials where there was
 * one white. What a fragment's cover says is only aerated is milky turquoise, what it says is dense is opaque white, and
 * the landing's white carries its age (`whiteAge`, `CURL_WHITE`). Its edge is torn into patches (`sweptTornCover`), as
 * a foam line's edge is, and not ruled. Nothing here builds a white shell: the white is a colour on the surface the loft
 * already drew, so no white layer stands anywhere.
 */
export function curlWhiteFoam(foam: string): string {
  if (foam.split(CURL_BODY_LINE).length !== 2) throw new Error('The curl foam composition needs the body-and-foam line once');
  return foam.replace(CURL_BODY_LINE, /* glsl */ `waterCover = sweptTornCover( waterCover );
  vec3 sweptCurlWhite = waterFoamColor * vSweptWhiteAge;
  vec3 sweptCurlAerated = sweptCurlWhite * exp( -waterDiffuseAttenuation * ${CURL_WHITE.path.toFixed(1)} );
  diffuseColor.rgb = mix( waterBody * waterBodyGain,
    mix( sweptCurlAerated, sweptCurlWhite, smoothstep( ${CURL_WHITE.aerated.toFixed(2)}, ${CURL_WHITE.dense.toFixed(2)}, waterCover ) ), waterCover );`);
}
