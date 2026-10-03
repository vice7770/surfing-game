import { BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Mesh, MeshPhysicalMaterial, type WebGLProgramParametersWithUniforms } from 'three';
import { LANDMARK } from '../../wave/barrel/ProfileLibrary';
import { FRAY, LOFT, LOFT_SAMPLES, NO_CHORD, THROAT, type LoftResult } from '../../wave/barrel/sweptLoft';
import { waterChurnPars } from '../water/churnTexture';
import { richPatchFragmentPars } from '../water/richPatch';
import {
  RICH_FOAM, RICH_REFLECTION, richAerationFragmentPars, richAerationVertexPars, richFragmentPars, richNormalFragment, richReflectionPars, waterCubicPars,
} from '../water/richWaterGlsl';
import { waterRipplePars } from '../water/rippleTexture';
import { CLASSIC_ROUGHNESS, RICH_BASE_ROUGHNESS, waterSpecularPars } from '../water/specular';
import { waterStreakPars } from '../water/streaks';
import { waterTubePars } from '../water/tubeCarve';
import type { WaterLook } from '../water/waterLook';
import { waterChopNormal } from '../waterChop';
import { CLASSIC_FOAM, CREST_SAMPLES, CREST_SCATTER, WATER_ABSORPTION, WATER_IOR, waterBodyFragment } from '../waterOptics';
import { waterFragmentPars, waterVertexPars } from '../WaterSurface';
import { SWEPT_BAND_ALPHA, SWEPT_BARREL_DISCARD, waterBarrelMaskPars } from './barrelMaskGlsl';

/** The most vertices, and triangle indices, a loft fills (its budget and one slice more). */
const VERTICES = LOFT.budget + LOFT_SAMPLES;
const INDICES = 6 * (LOFT_SAMPLES - 1) * Math.ceil(VERTICES / LOFT_SAMPLES);

/**
 * A dev view of the curl (`?barrelView=`, dev tools only), flat-coloured in place of its shading:
 * - `phase`: each slice by its phase, blue before its face goes vertical, green open, red after touchdown (the tube
 *   review; tube-colour-fix.md, "Not solved by this");
 * - `front`: each slice by its front, a hue per front;
 * - `sheet`: the lip's thickness where it is shaded as a sheet, white thin to blue 1 m thick, grey elsewhere;
 * - `region`: unshaded, the lip red (a sheet), the tube's back wall blue (throat to toe on an open slice), the
 *   shoulder's face yellow (crest to toe before the face goes vertical), the rest green: the water sheet's luminance
 *   check reads its pixels.
 * All but `region` are dimmed where the vertex rests on the water.
 */
export type SweptBarrelView = 'phase' | 'front' | 'sheet' | 'region';
export const SWEPT_BARREL_VIEWS: readonly SweptBarrelView[] = ['phase', 'front', 'sheet', 'region'];
const PHASE_COLOURS: readonly (readonly [number, number, number])[] = [[0.15, 0.4, 1], [0.1, 0.85, 0.2], [1, 0.15, 0.1]];
/** The share of a view's colour a vertex resting on the water keeps; a lifted one keeps it all. */
const RESTING_SHARE = 0.3;
/** The region view's sheet and back wall: a vertex this far a sheet, or lifted, belongs to it. */
const REGION_SHARE = 0.5;

/** A front's hue in the front view: golden-angle steps, so neighbouring IDs differ. */
function frontColour(front: number, out: Float32Array, o: number): void {
  const hue = (((front * 0.618034) % 1) + 1) % 1;
  for (let c = 0; c < 3; c += 1) {
    const k = (hue * 6 + [5, 3, 1][c]) % 6;
    out[o + c] = 1 - Math.max(0, Math.min(k, 4 - k, 1)) * 0.85;
  }
}

/** Each vertex's colour in a dev view, into `out` (3 floats a vertex). */
export function sweptViewColours(view: SweptBarrelView, loft: LoftResult, out: Float32Array): void {
  const vertices = Math.min(loft.vertexCount, out.length / 3);
  for (let v = 0; v < vertices; v += 1) {
    const slice = Math.floor(v / LOFT_SAMPLES);
    const o = 3 * v;
    if (view === 'region') {
      const point = (v % LOFT_SAMPLES) - LOFT.extensionSamples;
      const lip = loft.sheetWeight[v] >= REGION_SHARE;
      const standing = loft.lift[v] >= REGION_SHARE;
      // The back wall a lip covers: throat to toe of an open slice whose underside has formed (the throat's weight, its
      // lift in it). Before the underside forms there is no cavity: the face below a throwing crest is the rest.
      const wall = !lip && loft.slicePhase[slice] === 1 && loft.throat[4 * v + 3] >= REGION_SHARE && point >= LANDMARK.throat && point <= LANDMARK.toe;
      const face = loft.slicePhase[slice] === 0 && standing && point >= LANDMARK.crest && point <= LANDMARK.toe;
      out[o] = lip || face ? 1 : 0;
      out[o + 1] = lip || wall ? 0 : 1;
      out[o + 2] = wall ? 1 : 0;
      continue;
    }
    if (view === 'phase') {
      const colour = PHASE_COLOURS[Math.min(2, loft.slicePhase[slice])];
      out[o] = colour[0];
      out[o + 1] = colour[1];
      out[o + 2] = colour[2];
    } else if (view === 'front') {
      frontColour(loft.sliceFront[slice], out, o);
    } else {
      // The sheet: white where thin, to blue at 1 m, by its weight; grey where the vertex is no sheet.
      const w = loft.sheetWeight[v];
      const t = Math.min(1, loft.sheet[v]);
      out[o] = 0.5 * (1 - w) + w * (1 - t);
      out[o + 1] = 0.5 * (1 - w) + w * (1 - 0.6 * t);
      out[o + 2] = 0.5 * (1 - w) + w;
    }
    const share = RESTING_SHARE + (1 - RESTING_SHARE) * loft.lift[v];
    out[o] *= share;
    out[o + 1] *= share;
    out[o + 2] *= share;
  }
}

const sweptViewVertexPars = /* glsl */ `attribute vec3 sweptView;
varying vec3 vSweptView;`;
const sweptViewFragmentPars = /* glsl */ `varying vec3 vSweptView;`;
/** The view's flat colour, shaded a little by how squarely the surface faces the camera so its shape still reads. */
const SWEPT_VIEW_OUTPUT = /* glsl */ `#include <opaque_fragment>
gl_FragColor = vec4( vSweptView * ( 0.45 + 0.55 * abs( normalize( normal ).z ) ), 1.0 );`;
/** The region view's colour as it is, unshaded, so its pixels read back as their region. */
const SWEPT_REGION_OUTPUT = /* glsl */ `#include <opaque_fragment>
gl_FragColor = vec4( vSweptView, 1.0 );`;

/**
 * The lift over which a curl vertex's normal passes from the water's own (resting) to the loft's (look-fix round 1): where
 * the curl rests it is the water's surface, and its own normal there is the water's; the rests leave the water
 * tangentially (a smoothstep), so by a lift of 0.05 the two have barely parted [provisional].
 */
export const REST_NORMAL = 0.05;
/**
 * The farthest a resting fragment is moved along its view ray to the water's drawn surface, m: the curl's rests lie on the
 * water to centimetres, so this only guards a ray grazing the surface (look-fix round 1) [provisional].
 */
export const RESTING_REACH = 0.5;
/**
 * The lift over which the curl's ripples and lace pass from the water's mapping, at the pixel's xz, to its face's, at (σ,
 * arc length along the slice) (look-fix round 1; the advisor's smoothstep 0.1–0.4, provisional): the rests stay the
 * water's.
 */
export const FACE_MAP = [0.1, 0.4] as const;
/**
 * The height of the curl's world normal over which the wind chop fades in, on a face it would only stretch into stripes
 * across (look-fix round 1; the advisor's smoothstep 0.3–0.7, provisional).
 */
export const CHOP_UPRIGHT = [0.3, 0.7] as const;
/** The height field's crest-light march's reach, m: its last sample (`CREST_SAMPLES`); past it the water lights nothing. */
const CHORD_REACH = CREST_SAMPLES[CREST_SAMPLES.length - 1];

// The loft's vertices are world positions and normals: the water's depth, foam and current are read where each lies.
// The curl takes the water's foam only as far as it lies on the water: the solver breaks where the tube is, so its
// roller's whitewater there is the tube's water, not foam on it; the tube's own foam comes with the crash curve (PR 5).
// The lip's thickness and its weight as a sheet come from the loft (`sheetAcross`).
//
// Where the curl rests on the water (its lift 0) it is the water, and is shaded as the water (look-fix round 1): its
// vertices take the water's own normal there (`vSweptRest`, by `REST_NORMAL`; the loft's where lifted), its fragments
// the water's own surface, foam and current (`richRestingWater`, `classicRestingWater`), normal and relief
// (`RICH_CURL_NORMAL`, `CLASSIC_CURL_NORMAL`), and its body the water's foam, air and crest light by 1 − the lift.
// `sweptChord` is each vertex's slice's ray (x, z) and the water the sun crosses through the slice toward the vertex,
// ahead and behind (`polylineChords`): the crest light where it is lifted.
const sweptVertexPars = /* glsl */ `attribute float sweptLift;
attribute float sweptSheet;
attribute float sweptSheetWeight;
attribute float sweptSheetBack;
attribute vec3 sweptWall;
attribute vec3 sweptWallNormal;
attribute vec4 sweptChord;
attribute vec4 sweptFace;
varying float vSweptLift;
varying float vSweptRest;
varying vec3 vSweptWaterNormal;
varying vec4 vSweptChord;
varying vec4 vSweptFace;
varying float vSweptSheet;
varying float vSweptSheetWeight;
varying float vSweptSheetBack;
varying float vSweptWallDepth;
varying vec3 vSweptWallNormal;`;
const sweptBeginNormal = /* glsl */ `vec3 objectNormal = vec3( normal );
vWaterDepth = max( 0.0, position.y - waterBedAt( position.xz ) );
vWaterFoam = ( 1.0 - sweptLift ) * waterFoamAt( position.xz );
vWaterFlow = waterFlowAt( position.xz );
vSweptSheet = sweptSheet;
vSweptSheetWeight = sweptSheetWeight;
vSweptSheetBack = sweptSheetBack;
vSweptWallDepth = max( 0.0, sweptWall.y - waterBedAt( sweptWall.xz ) );
vSweptWallNormal = sweptWallNormal;
vSweptLift = sweptLift;
vSweptChord = sweptChord;
vSweptFace = sweptFace;
vSweptRest = 1.0 - smoothstep( 0.0, ${REST_NORMAL.toFixed(2)}, sweptLift );
vSweptWaterNormal = sweptWaterNormalAt( position.xz );
objectNormal = normalize( mix( objectNormal, vSweptWaterNormal, vSweptRest ) );`;
/**
 * The water's own normal at a point, as each look's water mesh takes it at its vertices: Classic, the central
 * differences of its bilinear heights (`waterBeginNormal`); Rich, its Catmull-Rom surface's (`richBeginNormal`).
 */
const classicWaterNormalAt = /* glsl */ `
vec3 sweptWaterNormalAt( vec2 xz ) {
  vec2 stepX = vec2( waterGrid.z, 0.0 );
  vec2 stepZ = vec2( 0.0, waterGrid.z );
  float slopeX = ( waterHeightAt( xz + stepX ) - waterHeightAt( xz - stepX ) ) / ( 2.0 * waterGrid.z );
  float slopeZ = ( waterHeightAt( xz + stepZ ) - waterHeightAt( xz - stepZ ) ) / ( 2.0 * waterGrid.z );
  return normalize( vec3( -slopeX, 1.0, -slopeZ ) );
}`;
const richWaterNormalAt = /* glsl */ `
vec3 sweptWaterNormalAt( vec2 xz ) {
  vec3 surface = waterCarvedCubic( xz );
  return normalize( vec3( -surface.y, 1.0, -surface.z ) );
}`;
/**
 * Rich: the air the plunge drove into the water, as far as the curl rests on it (`RICH_FOAM` reads both); and the depth of
 * the sea under the vertex, its own surface over the bed, for the sea a mirrored ray meets (`RICH_SEA_MIRROR`).
 */
const richAirVertex = /* glsl */ `
vWaterAir = ( 1.0 - sweptLift ) * waterAerationAt( position.xz ).x;
vWaterPlumeDepth = waterAerationAt( position.xz ).y;
vSweptSeaDepth = max( 0.0, waterCarvedCubic( position.xz ).x - waterBedAt( position.xz ) );`;
const sweptFragmentPars = /* glsl */ `varying float vSweptLift;
varying float vSweptRest;
varying vec3 vSweptWaterNormal;
varying vec4 vSweptChord;
varying vec4 vSweptFace;
varying float vSweptSheet;
varying float vSweptSheetWeight;
varying float vSweptSheetBack;
varying float vSweptWallDepth;
varying vec3 vSweptWallNormal;
#ifdef SWEPT_BAND
uniform float sweptBandOpaque;
#endif`;
/** The seam (look-fix round 1): the curl draws where the mask is full, its band (`SWEPT_BAND`) across the mask's band. */
const SWEPT_SEAM = /* glsl */ `#ifdef SWEPT_BAND
${SWEPT_BAND_ALPHA}
#else
${SWEPT_BARREL_DISCARD}
#endif`;
/**
 * The back wall behind the lip, sampled at this far down it from the throat, profile points (the advisor, 2026-10-01: the
 * column body at the throat's or the back wall's depth and normal) [provisional: a third of the way to the toe].
 */
export const WALL_POINT = LANDMARK.throat + 8;

/**
 * The lip as a thin sheet lit from behind, in both looks (docs/research/water-physics/tube-colour-fix.md, step 2; the
 * advisor's rulings, 2026-10-01), not a column of water over the reef: the view ray crosses the sheet's thickness,
 * lengthened by its refracted angle (at least 0.2), t. The sheet's own backscatter builds up with that path (two-flux:
 * R∞ (1 − e^{−2ct})) and is lit from the front as the body is, in the albedo; the light behind it comes through
 * attenuated by Beer–Lambert on the water's own absorption and scattering, e^{−ct}, as emitted radiance, with no body
 * gain. Behind it: E_back = F · E_sky(−n) + (1 − F) · E_wall, F the far side's view of the sky through the tube's
 * opening (`sheetAcross`), E_sky the sky's irradiance over the hemisphere behind the sheet (the ambient, and the
 * environment at −n) [provisional: the build's choice], and E_wall the back wall as drawn: its column body (the body's
 * gain on the reflectance at its depth over the bed) under the sky and sun on its own normal (`WALL_POINT`; the
 * advisor, 2026-10-01) [provisional]. And the sun's crest light where it is behind, over its own path through the
 * sheet, t / |n·L| (at least 0.2). The height field's march is never run on the curl.
 */
export const SWEPT_SHEET_BODY = /* glsl */ `
    float sweptPath = vSweptSheet / max( 0.2, waterRefractedCosine( waterViewCos ) );
    vec3 sweptReach = exp( -waterAttenuation * sweptPath );
    waterBody = mix( waterBody, waterDeepReflectance * ( 1.0 - sweptReach * sweptReach ), vSweptSheetWeight );
    vec3 sweptSky = getAmbientLightIrradiance( ambientLightColor );
    #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
      sweptSky += getIBLIrradiance( -normal );
    #endif
    vec3 sweptWallN = normalize( vSweptWallNormal );
    float sweptWallSun = max( 0.0, dot( sweptWallN, waterSunDirection ) );
    vec3 sweptWallLight = getAmbientLightIrradiance( ambientLightColor ) + sweptWallSun * waterSunRadiance;
    #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
      sweptWallLight += getIBLIrradiance( ( viewMatrix * vec4( sweptWallN, 0.0 ) ).xyz );
    #endif
    vec3 sweptWall = waterBodyGain * waterBodyReflectance( vSweptWallDepth, max( 0.05, dot( sweptWallN, waterV ) ), sweptWallSun ) * sweptWallLight;
    vec3 sweptBack = vSweptSheetBack * sweptSky + ( 1.0 - vSweptSheetBack ) * sweptWall;
    float sweptSunPath = vSweptSheet / max( 0.2, abs( dot( waterN, waterSunDirection ) ) );
    float sweptSunBehind = pow( max( 0.0, dot( -waterV, waterSunDirection ) ), 4.0 );
    totalEmissiveRadiance += vSweptSheetWeight * ( 1.0 - vWaterFoam ) * ( 1.0 - waterFresnel( waterViewCos ) ) * (
      sweptReach * sweptBack * RECIPROCAL_PI + ${CREST_SCATTER.toFixed(6)} * sweptSunBehind * waterSunRadiance * exp( -waterAttenuation * sweptSunPath ) );`;
/**
 * The lip glow's path lengthening for multiple scattering (the spec's item 16: exp(−σ·k·d), k ≈ 5–20): a thin, aerated
 * lip scatters far more than clear water. Tuned by eye against backlit lips, as the advisor's start (8, 2026-10-01) asked,
 * to the range's top: at 8 the sun's glow through the 0.1–0.2 m underside kept 66–76 % of its red and drew a pale
 * windscreen from inside the tube (its pale pixels' saturation 0.12); at 20 they are aqua (0.22) [provisional].
 */
export const LIP_GLOW_PATH = 20;
const glslVec3 = (rgb: readonly number[]) => `vec3( ${rgb.map((c) => c.toFixed(6)).join(', ')} )`;

/**
 * The margin over which the sun is taken to leave a tube along the crest out of its mouth (look-fix round 1), a share of
 * the ratio |along| / |across| against L_mouth / d_wall: the test passes over ±15 % of it, not at a cut, so the lip's
 * shadow on the inner face has no edge where the sun's direction crosses the mouth's [provisional].
 */
export const MOUTH_MARGIN = 0.15;

/**
 * Rich vertex pieces: the inner face's views, the lip's thickness and the face's weight; each slice's tip and mouth; its
 * ray (x, z) and the lip's normal in its plane (across, up); its crest, the lip's root, and the lip's thickness there.
 */
const richThroatVertexPars = /* glsl */ `varying float vSweptSeaDepth;
attribute vec4 sweptThroat;
attribute vec4 sweptTube;
attribute vec4 sweptRay;
attribute vec4 sweptCrest;
varying vec4 vSweptThroat;
varying vec4 vSweptTube;
varying vec4 vSweptRay;
varying vec4 vSweptCrest;`;
const richThroatVertex = /* glsl */ `
vSweptThroat = sweptThroat;
vSweptTube = sweptTube;
vSweptRay = sweptRay;
vSweptCrest = sweptCrest;`;
const richThroatFragmentPars = /* glsl */ `varying float vSweptSeaDepth;
varying vec4 vSweptThroat;
varying vec4 vSweptTube;
varying vec4 vSweptRay;
varying vec4 vSweptCrest;

// Where a direction (in the slice's plane: across the ray, up) falls between the lip's tip (\`tip\`) and its root
// (\`root\`), seen from the point: the angle from the tip's direction to it over the angle from the tip's to the root's. 0 at
// the tip, 1 at the root, negative on the opening's side of the tip (\`lipCrossing\` is its twin).
float sweptLipCrossing( vec2 tip, vec2 root, vec2 direction ) {
  float span = atan( tip.x * root.y - tip.y * root.x, dot( tip, root ) );
  float at = atan( tip.x * direction.y - tip.y * direction.x, dot( tip, direction ) );
  return abs( span ) > 1e-3 ? at / span : 0.0;
}
// How far a direction leaves the tube along the crest out of its mouth, 0–1: |along| / |across| against L_mouth / d_wall
// (the tip's distance standing for the wall's), passed over its margin (\`MOUTH_MARGIN\`).
float sweptMouthShare( vec3 direction, vec2 tip ) {
  vec2 across = vec2( dot( direction.xz, vSweptRay.xy ), direction.y );
  float along = abs( dot( direction.xz, vec2( vSweptRay.y, -vSweptRay.x ) ) );
  return smoothstep( ${(1 - MOUTH_MARGIN).toFixed(2)}, ${(1 + MOUTH_MARGIN).toFixed(2)}, along * length( tip ) / max( vSweptTube.w * length( across ), 1e-4 ) );
}
`;

/**
 * The lip's glow (Rich; the spec's item 16; the advisor's rulings, 2026-10-01): sunlight entering the sheet's far side
 * scatters through it and leaves toward the viewer diffusely, over a path lengthened k times its thickness and absorbed
 * by the water alone (Pope & Fry; k stands for the scattering, so not the beam attenuation), only when the sun is on
 * the far side: weight · (1 − F) · max(0, −n·L) · E_sun · e^{−a k d} / π, on top of the forward crest light.
 */
export const RICH_LIP_GLOW = /* glsl */ `
    totalEmissiveRadiance += vSweptSheetWeight * ( 1.0 - vWaterFoam ) * ( 1.0 - waterFresnel( waterViewCos ) )
      * max( 0.0, -dot( waterN, waterSunDirection ) ) * waterSunRadiance
      * exp( -${glslVec3(WATER_ABSORPTION)} * ${LIP_GLOW_PATH.toFixed(1)} * vSweptSheet ) * RECIPROCAL_PI;`;

/**
 * The light behind the lip, Rich (look-fix round 1; graphics.md item 1: exp(−σ k d), k about 5–20, after Pope & Fry 1997;
 * the glow's k, `LIP_GLOW_PATH`): the sheet's diffuse back light, the sky's and the wall's, crosses the lip as the
 * glow does, scattered over k times its thickness and absorbed by the water alone, e^{−a k t}, not on the unscattered beam
 * e^{−c t}, which passes 86–98 % of every colour through the 0.1–0.5 m of a lip at Padang Padang and drew a white-blue
 * strip with no gradient. It replaces the body's own term (`SWEPT_SHEET_BODY`) by adding the difference, so the lip is
 * aqua at its thin edge and green-blue toward its root, where the red has gone. Needs `sweptReach` and `sweptBack`.
 */
export const RICH_LIP_BACK = /* glsl */ `
    totalEmissiveRadiance += vSweptSheetWeight * ( 1.0 - vWaterFoam ) * ( 1.0 - waterFresnel( waterViewCos ) )
      * ( exp( -${glslVec3(WATER_ABSORPTION)} * ${LIP_GLOW_PATH.toFixed(1)} * vSweptSheet ) - sweptReach ) * sweptBack * RECIPROCAL_PI;`;

/**
 * The sea in the curl's mirror, Rich (look-fix round 1; the advisor's ruling): where its mirrored ray points below the
 * horizon it meets the sea, not the environment's lower half, whose photograph read as a dimmed mirror of the sky ((65, 75,
 * 102) three-quarters of the way down the panorama: the lip's glossy grey) and, on a normal turned a little from the eye,
 * a navy crease. The sea seen along that ray is its own surface's Fresnel mirror of the sky above it and, through the rest,
 * its upwelling radiance: its body over the bed below the curl, as the water draws it (its body gain on the reflectance
 * at the sea's depth there), under the sky's irradiance and the sun's, over π. At the horizon the Fresnel term is 1, so
 * the sea meets the sky without a seam. After `RICH_REFLECTION`, at its scale.
 */
export const RICH_SEA_MIRROR = /* glsl */ `
#if defined( RE_IndirectSpecular ) && defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
{
  vec3 sweptMirrorWorld = ( vec4( reflect( -geometryViewDir, geometryNormal ), 0.0 ) * viewMatrix ).xyz;
  if ( sweptMirrorWorld.y < 0.0 ) {
    vec3 sweptAboveView = normalize( ( viewMatrix * vec4( sweptMirrorWorld.x, -sweptMirrorWorld.y, sweptMirrorWorld.z, 0.0 ) ).xyz );
    vec3 sweptSkyAbove = getIBLRadiance( sweptAboveView, sweptAboveView, material.roughness );
    vec3 sweptSeaLight = getIBLIrradiance( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz ) + max( 0.0, waterSunDirection.y ) * waterSunRadiance;
    vec3 sweptSea = waterBodyGain * waterBodyReflectance( vSweptSeaDepth, -sweptMirrorWorld.y, max( 0.0, waterSunDirection.y ) ) * sweptSeaLight * RECIPROCAL_PI;
    radiance = waterReflection * mix( sweptSea, sweptSkyAbove, waterFresnel( -sweptMirrorWorld.y ) );
  }
}
#endif`;

/**
 * The fraying tip of the lip, Rich, as a whitening layer of its own after the foam block (look-fix round 1; the ruled
 * follow-up, "with the spray look", on open slices only): a share of the sheet breaks into drops (`vSweptFace.z`: all of
 * it at the tip, none 0.15 of the lip back, `FRAY`), the water a unit area holds W the sheet's thickness, its optical depth
 * τ = 1.5 · share · W / r for drops of radius r = 1 mm (spray-and-mist.md), and the lip whitens as such a layer of drops
 * does, R = (1 − g) τ / (2 + (1 − g) τ) with g = 0.87 (the two-stream reflectance of a layer that scatters without
 * absorbing; see-through near τ 1, white only above about 15) [provisional]. It lies over whatever the foam block made of
 * the pixel, as foam does, in the foam's colour and matte (the foam block is the water's own and changes with it, so
 * nothing here is spliced into its lines).
 */
export const RICH_FRAY = /* glsl */ `
  float sweptFrayTransport = ${(1 - FRAY.asymmetry).toFixed(2)} * ${FRAY.depth.toFixed(1)} * vSweptFace.z * vSweptSheet / ${FRAY.drop.toFixed(3)};
  float sweptFrayCover = sweptFrayTransport / ( 2.0 + sweptFrayTransport );
  diffuseColor.rgb = mix( diffuseColor.rgb, waterFoamColor, sweptFrayCover );
  roughnessFactor = mix( roughnessFactor, 0.7, sweptFrayCover );`;

/**
 * A normal on the curl turned from the eye (look-fix round 1; the same formula group 2's look fixes put on the water):
 * where n·v < 0.05, in view space, n += (0.05 − n·v) v, renormalised. The folds of the lip and its ripples turned normals
 * across the view, where the water falls to R∞ with no bed, and drew navy creases and a knife-shaped sliver seen from
 * below [the constant provisional].
 */
export const NORMAL_GUARD = 0.05;
export const SWEPT_NORMAL_GUARD = /* glsl */ `
{
  vec3 sweptEye = normalize( vViewPosition );
  float sweptFacing = dot( normal, sweptEye );
  if ( sweptFacing < ${NORMAL_GUARD.toFixed(2)} ) normal = normalize( normal + ( ${NORMAL_GUARD.toFixed(2)} - sweptFacing ) * sweptEye );
}`;

/**
 * The dark throat (Rich; the spec's item 16; the advisor's rulings, 2026-10-01), once the image-based light is
 * gathered, on the inner face as far as its weight says (points 64–112 of a slice with an underside):
 * - its sky light: the sky it sees through the opening (the 2D view factor F_w), the light through the lip (the lip's
 *   view factor F_l × the sky and sun above the lip through its mean thickness, e^{−ct}), and R∞ of the sky for the
 *   rest, the tube's own water [the magnitudes provisional]; the ambient light, the same everywhere, as the sky;
 * - its reflections where the mirrored ray leaves the tube (the advisor's mirrored mouth), and where it meets the lip, the
 *   sky through the lip as the sun's below, fading through its thin edge (look-fix round 1: the cut at the tip's
 *   direction followed the ripples' normals and drew hard-edged dark blots on the inner face);
 * - the sun through the lip where its own ray crosses it (look-fix round 1; the advisor's ruling, the sun shadowed under
 *   the lip): the lip's thickness there, from 0 at the tip, where the sheet thins to nothing, to the lip's at its root,
 *   by where the sun's direction falls between the tip's and the root's in the slice's plane (`sweptLipCrossing`), on
 *   the slant path t / max(0.2, |n_lip · L|), e^{−c path} per channel (red goes first: the green room) [the crossing's
 *   interpolation and the path provisional]. The glint goes through on the same unscattered beam (Beer–Lambert), so the
 *   shadow, glint and all, fades through the lip's thin edge instead of cutting at the tip. A sun leaving down the crest
 *   and out of the mouth (`sweptMouthShare`) is unchanged: the light down the tube. With the old sky's fill light, the
 *   fill is shadowed with it.
 */
export const RICH_THROAT = /* glsl */ `
#if defined( RE_IndirectSpecular ) && defined( RE_IndirectDiffuse )
if ( vSweptThroat.w > 0.0 ) {
  vec3 sweptThrough = exp( -waterAttenuation * vSweptThroat.z );
  vec3 sweptOwn = vSweptThroat.x + max( 0.0, 1.0 - vSweptThroat.x - vSweptThroat.y ) * waterDeepReflectance;
  vec3 sweptAbove = max( 0.0, waterSunDirection.y ) * waterSunRadiance;
  #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
    sweptAbove += getIBLIrradiance( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  #endif
  irradiance = mix( irradiance, ( sweptOwn + vSweptThroat.y * sweptThrough ) * irradiance, vSweptThroat.w );
  iblIrradiance = mix( iblIrradiance, sweptOwn * iblIrradiance + vSweptThroat.y * sweptThrough * sweptAbove, vSweptThroat.w );
  vec2 sweptTip = vec2( dot( vSweptTube.xz - vWaterWorld.xz, vSweptRay.xy ), vSweptTube.y - vWaterWorld.y );
  vec3 sweptMirror = ( vec4( reflect( -geometryViewDir, geometryNormal ), 0.0 ) * viewMatrix ).xyz;
  vec2 sweptRoot = vec2( dot( vSweptCrest.xz - vWaterWorld.xz, vSweptRay.xy ), vSweptCrest.y - vWaterWorld.y );
  vec2 sweptMirrored = vec2( dot( sweptMirror.xz, vSweptRay.xy ), sweptMirror.y );
  float sweptMirrorSlant = clamp( sweptLipCrossing( sweptTip, sweptRoot, sweptMirrored ), 0.0, 1.0 ) * vSweptCrest.w / max( 0.2, abs( dot( vSweptRay.zw, sweptMirrored ) ) );
  radiance *= mix( vec3( 1.0 ), exp( -waterAttenuation * sweptMirrorSlant ), vSweptThroat.w * ( 1.0 - sweptMouthShare( sweptMirror, sweptTip ) ) );
  vec2 sweptSun = vec2( dot( waterSunDirection.xz, vSweptRay.xy ), waterSunDirection.y );
  float sweptCrossing = clamp( sweptLipCrossing( sweptTip, sweptRoot, sweptSun ), 0.0, 1.0 );
  float sweptSlant = sweptCrossing * vSweptCrest.w / max( 0.2, abs( dot( vSweptRay.zw, sweptSun ) ) );
  vec3 sweptSunThrough = mix( vec3( 1.0 ), exp( -waterAttenuation * sweptSlant ), vSweptThroat.w * ( 1.0 - sweptMouthShare( waterSunDirection, sweptTip ) ) );
  reflectedLight.directDiffuse *= sweptSunThrough;
  reflectedLight.directSpecular *= sweptSunThrough;
}
#endif`;

/**
 * TypeScript twin of `sweptLipCrossing`: where a direction (`direction`, in the slice's plane) falls between the lip's tip
 * (`tip`) and its root (`root`), as seen from a point: 0 at the tip, 1 at the root, negative beyond the tip.
 */
export function lipCrossing(tip: readonly [number, number], root: readonly [number, number], direction: readonly [number, number]): number {
  const span = Math.atan2(tip[0] * root[1] - tip[1] * root[0], tip[0] * root[0] + tip[1] * root[1]);
  const at = Math.atan2(tip[0] * direction[1] - tip[1] * direction[0], tip[0] * direction[0] + tip[1] * direction[1]);
  return Math.abs(span) > 1e-3 ? at / span : 0;
}

const sweptBeginVertex = /* glsl */ `vec3 transformed = vec3( position );
vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`;

/** `from` replaced by `to` in `source`, which must hold it (the water's own chunks the curl's are made from). */
function replaced(source: string, from: string, to: string): string {
  if (!source.includes(from)) throw new Error(`The water's shader chunk has changed: no "${from}"`);
  return source.replace(from, to);
}

/**
 * Where the curl rests on the water, the side of it the eye is on is the water's own, by the water's normal there
 * (`sweptRestingNormal`), not its triangle's: neighbouring slices' anchors can cross where a front rests on the water,
 * folding its rests over, and a folded triangle faces down (look-fix round 1). An eye above the water there is on its
 * air side too, though behind its tangent plane: a camera a few centimetres over the rests, as inside the tube, sees
 * their far, back-sloping rows at a grazing angle, and on the tangent plane alone drew them from below, a dark line along
 * the curl's far edge. Lifted, the triangle's side is the curl's own.
 */
const SWEPT_RESTING_SIDE = /* glsl */ `if ( vSweptRest > 0.5 ) faceDirection = dot( cameraPosition - vWaterWorld, sweptRestingNormal ) >= 0.0 || cameraPosition.y >= vWaterWorld.y ? 1.0 : -1.0;`;

/** The water's Rich normal chunk (`richNormalFragment`): the Catmull-Rom slope per pixel, the chop, the ripples, the churn. */
const WATER_RICH_NORMAL = richNormalFragment({ ripples: true, churn: true });
/**
 * The Rich curl's normal (look-fix round 1): the water's own chunk, with its relief (the wind chop, the ripples carried
 * by the current, fresh whitewater's clumps: `waterSlope`, from 0 here) added to the curl's surface in place of the
 * water's. The curl's surface, out of the water, in the world, is its vertices' normal (the water's own where it rests,
 * the loft's where lifted: `sweptBeginNormal`), with the water's per-pixel normal in place of its vertices' as far as it
 * rests (`vSweptRest`), so a resting curl is the water's normal exactly. The relief goes on as the water's does, to its
 * height field's slope, where the surface faces up, and across it where it stands steep or overturns. Where the curl is
 * lifted (`FACE_MAP`) the relief is its face's own (look-fix round 1): a planar xz projection is degenerate on a near-
 * vertical or overturned face, and smeared the ripples into contour stripes down it and streaks into the throat; so the
 * ripples are read at the face coordinates (σ along the crest, the arc length along the slice), still in the wave's own
 * frame [no current: provisional], and tilt the normal in the frame of the crest's direction T and the profile's P = T ×
 * n, n − (s_σ T + s_arc P); the wind chop stays the water's, faded on a face standing up (`CHOP_UPRIGHT`).
 */
export const RICH_CURL_NORMAL = replaced(replaced(WATER_RICH_NORMAL,
  'vec2 waterSlope = waterSurfaceSample.yz;', 'vec2 waterSlope = vec2( 0.0 );'),
'vec3 waterWorldNormal = normalize( vec3( -waterSlope.x, 1.0, -waterSlope.y ) ) * faceDirection;', `vec3 sweptWaterPixel = normalize( vec3( -waterSurfaceSample.y, 1.0, -waterSurfaceSample.z ) );
  vec3 sweptOut = normalize( ( vec4( normalize( vNormal ), 0.0 ) * viewMatrix ).xyz + vSweptRest * ( sweptWaterPixel - normalize( vSweptWaterNormal ) ) );
  vec3 sweptField = normalize( vec3( sweptOut.x / max( sweptOut.y, 0.3 ) - waterSlope.x, 1.0, sweptOut.z / max( sweptOut.y, 0.3 ) - waterSlope.y ) );
  vec3 sweptAcross = normalize( sweptOut + vec3( -waterSlope.x, 0.0, -waterSlope.y ) );
  vec3 sweptWorldRelief = normalize( mix( sweptAcross, sweptField, smoothstep( 0.3, 0.7, sweptOut.y ) ) );
  // Lifted, the face's own relief: the ripples at (σ, arc) on the crest's direction T and the profile's P = T × n, and
  // the chop only as far as the surface faces up.
  float sweptWaterVariance = waterRippleVariance;
  vec3 sweptT = normalize( vec3( vSweptChord.y, 0.0, -vSweptChord.x ) );
  vec3 sweptP = cross( sweptT, sweptOut );
  sweptP = dot( sweptP, sweptP ) > 1e-6 ? normalize( sweptP ) : vec3( 0.0 );
  vec2 sweptFaceSlope = sweptFaceRippleAt( vSweptFace.xy );
  vec2 sweptFaceChop = waterChop * chopFade * waterChopSlope( vWaterWorld.xz, waterTime ) * smoothstep( ${CHOP_UPRIGHT[0].toFixed(1)}, ${CHOP_UPRIGHT[1].toFixed(1)}, sweptOut.y );
  vec3 sweptFaceRelief = normalize( sweptOut - sweptFaceSlope.x * sweptT - sweptFaceSlope.y * sweptP + vec3( -sweptFaceChop.x, 0.0, -sweptFaceChop.y ) );
  float sweptMapped = smoothstep( ${FACE_MAP[0].toFixed(1)}, ${FACE_MAP[1].toFixed(1)}, vSweptLift );
  waterRippleVariance = mix( sweptWaterVariance, waterRippleVariance, sweptMapped );
  ${SWEPT_RESTING_SIDE.replace('sweptRestingNormal', 'sweptWaterPixel')}
  vec3 waterWorldNormal = normalize( mix( sweptWorldRelief, sweptFaceRelief, sweptMapped ) ) * faceDirection;`) + SWEPT_NORMAL_GUARD;

/**
 * The Classic curl's normal: the water's own chunk (its interpolated vertex normal, the water's own where the curl rests:
 * `sweptBeginNormal`), with its wind chop (look-fix round 1), on the side of the water the eye is on where it rests. The
 * chop, read at the world's xz, fades where the curl stands up (`CHOP_UPRIGHT`), on a face it would stretch into stripes.
 */
export const CLASSIC_CURL_NORMAL = replaced(replaced(waterChopNormal, '#include <normal_fragment_begin>', `#include <normal_fragment_begin>
${SWEPT_RESTING_SIDE.replace('sweptRestingNormal', 'normalize( sweptWaterTriangleNormal )')}
normal = normalize( mix( normalize( vNormal ), normalize( ( viewMatrix * vec4( sweptWaterTriangleNormal, 0.0 ) ).xyz ), vSweptRest ) ) * faceDirection;`),
'vec2 chopSlope = waterChop * chopFade * waterChopSlope( vWaterWorld.xz, waterTime );',
`vec2 chopSlope = waterChop * chopFade * waterChopSlope( vWaterWorld.xz, waterTime ) * smoothstep( ${CHOP_UPRIGHT[0].toFixed(1)}, ${CHOP_UPRIGHT[1].toFixed(1)}, ( vec4( normal * faceDirection, 0.0 ) * viewMatrix ).y );`) + SWEPT_NORMAL_GUARD;

/**
 * The crest light where the curl is lifted and no sheet (look-fix round 1; the advisor's ruling, "the curl's crest light
 * at weight 0": over the profile's own horizontal chord toward the sun): the water's crest light (`waterBodyFragment`'s
 * `CREST_SCATTER` form), its path the horizontal chord through the slice as drawn on the sun's side of the vertex
 * (`polylineChords`) over the cosine of the sun's horizontal direction s to the slice's ray, chord / max(0.2, |s·ray|),
 * as the water's own march through its height field, which under a lifted curl reads the hump, not the curl. Weighted by
 * the lift less the sheet's weight (the sheet keeps its own), and faded out over the last 1.5 m of the march's 6 m reach
 * (`NO_CHORD` beyond), where the water's cuts it [the fade provisional]. Needs `sweptSunBehind` from `SWEPT_SHEET_BODY`.
 */
export const SWEPT_CHORD_LIGHT = /* glsl */ `
    float sweptSunLength = length( waterSunDirection.xz );
    if ( sweptSunLength > 1e-3 ) {
      float sweptAlong = dot( waterSunDirection.xz / sweptSunLength, vSweptChord.xy );
      float sweptChordPath = ( sweptAlong > 0.0 ? vSweptChord.z : vSweptChord.w ) / max( 0.2, abs( sweptAlong ) );
      totalEmissiveRadiance += max( 0.0, vSweptLift - vSweptSheetWeight ) * ${CREST_SCATTER.toFixed(6)} * ( 1.0 - vWaterFoam ) * sweptSunBehind
        * ( 1.0 - waterFresnel( waterViewCos ) ) * waterSunRadiance * exp( -waterAttenuation * sweptChordPath )
        * ( 1.0 - smoothstep( ${(CHORD_REACH - 1.5).toFixed(1)}, ${CHORD_REACH.toFixed(1)}, sweptChordPath ) );
    }`;

/** The water's varyings the resting curl takes in place of its own (`richRestingWater`, `classicRestingWater`), as the preprocessor names them. */
const SWEPT_RESTING = { vWaterWorld: 'sweptShading', vWaterFoam: 'sweptFoam', vWaterFlow: 'sweptFlow' } as const;

/** The line of the water's body block that adds its crest light (`waterBodyFragment`), and the curl's, by 1 − the lift. */
const WATER_CREST_LINE = `totalEmissiveRadiance += ${CREST_SCATTER.toFixed(6)} * ( 1.0 - vWaterFoam ) * waterBehind`;
const CURL_CREST_LINE = `totalEmissiveRadiance += ${CREST_SCATTER.toFixed(6)} * ( 1.0 - vSweptLift ) * ( 1.0 - vWaterFoam ) * waterBehind`;

/**
 * The curl's body (look-fix round 1): the water's own (`waterBodyFragment`), with the crest light marched through the
 * height field as far as the curl rests on it (1 − the lift: under a lifted curl the height field is the hump), the lip's
 * sheet and the lifted curl's chord light after the column, and the look's own foam (`curlFoam`): Rich's (the churn, the
 * freshness, the streaks and the plume, on the air as far as the curl rests) with the lip's fray over it, Classic's.
 */
export function sweptBodyFragment(rich: boolean): string {
  const body = rich
    ? waterBodyFragment(true, true, curlFoam(RICH_FOAM) + RICH_FRAY, SWEPT_LIFTED_BED + SWEPT_SHEET_BODY + RICH_LIP_GLOW + RICH_LIP_BACK + SWEPT_CHORD_LIGHT)
    : waterBodyFragment(true, true, curlFoam(CLASSIC_FOAM), SWEPT_LIFTED_BED + SWEPT_SHEET_BODY + SWEPT_CHORD_LIGHT);
  return replaced(body, WATER_CREST_LINE, CURL_CREST_LINE);
}

/**
 * The current fades from the lace over this much of the lace's unroll, m (below, the lace is the water's own and keeps the
 * water's current; above, it lies on a face and has none) [provisional, as the ripples'].
 */
export const LACE_CURRENT = [0.05, 0.4] as const;

/**
 * The curl's foam coordinates (look-fix round 1; the ruled follow-up, residual lace on the curl's lifted face: a
 * face-aligned mapping): the pixel's xz where the curl rests on the water, and where it is lifted the face unrolled onto
 * the ground, the pixel's xz moved along the slice's ray by how far the lace lies along the face (`LoftResult.unroll`: the
 * arc the face has over its horizontal reach, from the crest behind and the front end ahead, where the profile is lifted
 * by its shape), so the lace is laid along the face where the world's xz stretched it down a steep one and is the water's
 * own where the profile rests or runs level, at either foot: the two mappings agree there, and the mapping changes slowly
 * between them, so the lace keeps its scale (a mix of the world's xz and the face's own σ and arc, a hundred metres
 * apart, spanned the lace's cells across a few pixels and drew the rests as a smooth tarp; and a mix by the slice's
 * weight, which moves the whole slice, dotted its end with the lace's folded cells). No current in the wave's frame where
 * it lies on a face (`LACE_CURRENT`) [provisional], as the ripples. Through the preprocessor, as the resting water's own
 * values (`sweptRestingDefines`), the foam block that follows reads them as its `vWaterWorld` and `vWaterFlow`, whatever
 * lines it is made of.
 */
export const SWEPT_FOAM_COORDS = /* glsl */ `  vec2 sweptFoamUnrolled = vSweptFace.w * vSweptChord.xy;
  vec3 sweptFoamWorld = vec3( vWaterWorld.x + sweptFoamUnrolled.x, vWaterWorld.y, vWaterWorld.z + sweptFoamUnrolled.y );
  vec2 sweptFoamFlow = vWaterFlow * ( 1.0 - smoothstep( ${LACE_CURRENT[0].toFixed(2)}, ${LACE_CURRENT[1].toFixed(2)}, abs( vSweptFace.w ) ) );
#undef vWaterWorld
#define vWaterWorld sweptFoamWorld
#undef vWaterFlow
#define vWaterFlow sweptFoamFlow
`;
/** The resting water's values again, after the foam block (`SWEPT_FOAM_COORDS`). */
export const SWEPT_FOAM_RESTORE = /* glsl */ `
#undef vWaterWorld
#define vWaterWorld ${SWEPT_RESTING.vWaterWorld}
#undef vWaterFlow
#define vWaterFlow ${SWEPT_RESTING.vWaterFlow}
`;

/**
 * A look's foam block (`CLASSIC_FOAM`, `RICH_FOAM`) as the curl draws it: itself, whole, between the curl's foam
 * coordinates (`SWEPT_FOAM_COORDS`) and the resting water's again, so the lace, the churn and the streaks lie on the face
 * where it is lifted. Nothing is spliced into the block's lines or matched in them, so it holds for whatever the block is
 * made of; the pieces of the curl's own go before and after it.
 */
export function curlFoam(foam: string): string {
  return SWEPT_FOAM_COORDS + foam + SWEPT_FOAM_RESTORE;
}

/**
 * No caustic focus where the curl is lifted (look-fix round 1): the caustic map refracts the sun through the height field,
 * which under a lifted curl is the hump, not the curl (as the crest light's march), and the bed seen through a steep face
 * lies far along its refracted ray, where the map smeared into stripes down the face and a swimming-pool web inside the
 * tube; and caustics on a near-vertical moving wall are faint (graphics.md, item 3). So the column's bed takes the light
 * of flat water, bedLight 1, as far as the curl is lifted; where it rests, the water's own caustics.
 */
export const SWEPT_LIFTED_BED = /* glsl */ `
    waterBody = mix( waterBody, waterBodyReflectanceLit( vWaterDepth, waterViewCos, max( 0.0, dot( waterN, waterSunDirection ) ), 1.0 ), vSweptLift );`;

/**
 * The Rich curl's ripples on its face (look-fix round 1): the sea's two ripple layers (`waterRipplePars`, one phase of
 * `waterRippleSlopeAt`'s) read at the face coordinates (σ, arc), still, in the wave's own frame [no current:
 * provisional; the sea's flow-map pair would cross-fade two patterns at a standstill]. Sets `waterRippleVariance`, as the
 * water's does.
 */
const richFaceRipplePars = /* glsl */ `
vec2 sweptFaceRippleAt( vec2 p ) {
  vec4 t0 = waterRippleTap( p, RIPPLE_TILE_0 );
  vec4 t1 = waterRippleTap( p, RIPPLE_TILE_1 );
  float strength = waterRippleStrength * waterRippleFoamGain( vWaterFoam );
  waterRippleVariance = strength * strength * ( waterRippleLayerVariance( t0 ) + 0.36 * waterRippleLayerVariance( t1 ) );
  return strength * ( t0.xy + 0.6 * t1.xy );
}`;

/**
 * Where the curl rests on the water it is the water, and is drawn at the water's own surface along the view ray, with the
 * water's own foam and current there (look-fix round 1). The loft's rests lie on the water at its vertices, but between
 * them its triangles (up to a metre long) cut across the water's drawn surface by centimetres, and its vertices' foam and
 * current, interpolated over them (and over the folds where neighbouring slices' anchors cross), drift from the water's:
 * at a grazing view the water's lace and glints shifted against the curl's along the seam. So, as far as it rests
 * (`vSweptRest`), each fragment finds the water's surface on its view ray (one step to its tangent plane) and reads the
 * water there as the water's own fragment would: Rich, its Catmull-Rom surface and its bilinear fields (the dense patch
 * the Rich water is drawn with, a quarter-metre grid, interpolates them the same to a few parts in a thousand); Classic,
 * its mesh's own triangle (`PlaneGeometry`'s, each cell split from (i, k + 1) to (i + 1, k)), its plane, and its vertices'
 * foam, current and normal, as the water interpolates them. These stand for the water's varyings in every chunk after
 * them, the seam's mask among them, so the curl and the water read the mask at the same point of a pixel.
 */
/**
 * TypeScript twin of `sweptWaterTriangle`: the Classic water mesh's triangle under a point at grid coordinates (gx, gz)
 * (`PlaneGeometry`'s cells, split from (i, k + 1) to (i + 1, k)): its three nodes (i, k) and their weights.
 */
export function waterTriangle(gx: number, gz: number): { nodes: [number, number][]; weights: [number, number, number] } {
  const [i, k] = [Math.floor(gx), Math.floor(gz)];
  const [tx, tz] = [gx - i, gz - k];
  return tx + tz <= 1
    ? { nodes: [[i, k], [i + 1, k], [i, k + 1]], weights: [1 - tx - tz, tx, tz] }
    : { nodes: [[i + 1, k + 1], [i, k + 1], [i + 1, k]], weights: [tx + tz - 1, 1 - tx, 1 - tz] };
}

const SWEPT_RESTING_NAMES = ['vWaterWorld', 'vWaterFoam', 'vWaterFlow'] as const;
const sweptRestingDefines = SWEPT_RESTING_NAMES.map((name) => `#define ${name} ${SWEPT_RESTING[name]}`).join('\n');
const sweptRestingUndefines = SWEPT_RESTING_NAMES.map((name) => `#undef ${name}`).join('\n');
const richRestingPars = /* glsl */ `
vec3 sweptShading;
float sweptFoam;
vec2 sweptFlow;
vec4 sweptBilinear( sampler2D map, vec2 xz ) {
  vec2 g = clamp( ( xz - waterGrid.xy ) / waterGrid.z, vec2( 0.0 ), waterGridSize - 1.0 );
  ivec2 c = min( ivec2( floor( g ) ), ivec2( waterGridSize ) - 2 );
  vec2 t = g - vec2( c );
  return mix( mix( texelFetch( map, c, 0 ), texelFetch( map, c + ivec2( 1, 0 ), 0 ), t.x ), mix( texelFetch( map, c + ivec2( 0, 1 ), 0 ), texelFetch( map, c + ivec2( 1, 1 ), 0 ), t.x ), t.y );
}
${sweptRestingDefines}`;
const classicRestingPars = /* glsl */ `
uniform sampler2D waterFlow;
vec3 sweptShading;
float sweptFoam;
vec2 sweptFlow;
vec3 sweptWaterTriangleNormal;
// The water mesh's triangle under xz: its three nodes and their weights.
void sweptWaterTriangle( vec2 xz, out ivec2 a, out ivec2 b, out ivec2 c, out vec3 w ) {
  vec2 g = ( xz - waterGrid.xy ) / waterGrid.z;
  ivec2 cell = ivec2( floor( g ) );
  vec2 t = g - vec2( cell );
  if ( t.x + t.y <= 1.0 ) {
    a = cell; b = cell + ivec2( 1, 0 ); c = cell + ivec2( 0, 1 ); w = vec3( 1.0 - t.x - t.y, t.x, t.y );
  } else {
    a = cell + ivec2( 1, 1 ); b = cell + ivec2( 0, 1 ); c = cell + ivec2( 1, 0 ); w = vec3( t.x + t.y - 1.0, 1.0 - t.x, 1.0 - t.y );
  }
}
vec4 sweptNode( sampler2D map, ivec2 n ) { return texelFetch( map, clamp( n, ivec2( 0 ), ivec2( waterGridSize ) - 1 ), 0 ); }
// A node's normal, as the Classic water's vertex shader takes it (central differences of the node heights).
vec3 sweptNodeNormal( ivec2 n ) {
  float sx = ( sweptNode( waterSurface, n + ivec2( 1, 0 ) ).r - sweptNode( waterSurface, n - ivec2( 1, 0 ) ).r ) / ( 2.0 * waterGrid.z );
  float sz = ( sweptNode( waterSurface, n + ivec2( 0, 1 ) ).r - sweptNode( waterSurface, n - ivec2( 0, 1 ) ).r ) / ( 2.0 * waterGrid.z );
  return normalize( vec3( -sx, 1.0, -sz ) );
}
${sweptRestingDefines}`;
const richRestingWater = /* glsl */ `${sweptRestingUndefines}
sweptShading = vWaterWorld;
sweptFoam = vWaterFoam;
sweptFlow = vWaterFlow;
if ( vSweptRest > 0.0 ) {
  vec3 sweptRay = normalize( vWaterWorld - cameraPosition );
  vec3 sweptSurface = waterCarvedCubic( vWaterWorld.xz );
  float sweptRate = sweptRay.y - dot( sweptSurface.yz, sweptRay.xz );
  float sweptReach = abs( sweptRate ) > 1e-3 ? clamp( ( sweptSurface.x - vWaterWorld.y ) / sweptRate, -${RESTING_REACH.toFixed(2)}, ${RESTING_REACH.toFixed(2)} ) : 0.0;
  sweptShading = vWaterWorld + vSweptRest * sweptReach * sweptRay;
  sweptFoam = mix( vWaterFoam, sweptBilinear( waterSurface, sweptShading.xz ).g, vSweptRest );
  sweptFlow = mix( vWaterFlow, sweptBilinear( waterFlow, sweptShading.xz ).rg, vSweptRest );
}
${sweptRestingDefines}`;
const classicRestingWater = /* glsl */ `${sweptRestingUndefines}
sweptShading = vWaterWorld;
sweptFoam = vWaterFoam;
sweptFlow = vWaterFlow;
sweptWaterTriangleNormal = vec3( 0.0, 1.0, 0.0 );
if ( vSweptRest > 0.0 ) {
  ivec2 sweptA, sweptB, sweptC;
  vec3 sweptW;
  sweptWaterTriangle( vWaterWorld.xz, sweptA, sweptB, sweptC, sweptW );
  vec3 sweptHeights = vec3( sweptNode( waterSurface, sweptA ).r, sweptNode( waterSurface, sweptB ).r, sweptNode( waterSurface, sweptC ).r );
  // The triangle's plane: its slope along x and z from its nodes (one of the two corners' edges runs each way).
  vec2 sweptSlope = sweptA.x == sweptB.x - 1
    ? vec2( sweptHeights.y - sweptHeights.x, sweptHeights.z - sweptHeights.x ) / waterGrid.z
    : vec2( sweptHeights.x - sweptHeights.y, sweptHeights.x - sweptHeights.z ) / waterGrid.z;
  vec3 sweptRay = normalize( vWaterWorld - cameraPosition );
  float sweptRate = sweptRay.y - dot( sweptSlope, sweptRay.xz );
  float sweptReach = abs( sweptRate ) > 1e-3 ? clamp( ( dot( sweptW, sweptHeights ) - vWaterWorld.y ) / sweptRate, -${RESTING_REACH.toFixed(2)}, ${RESTING_REACH.toFixed(2)} ) : 0.0;
  sweptShading = vWaterWorld + vSweptRest * sweptReach * sweptRay;
  sweptWaterTriangle( sweptShading.xz, sweptA, sweptB, sweptC, sweptW );
  sweptFoam = mix( vWaterFoam, dot( sweptW, vec3( sweptNode( waterSurface, sweptA ).g, sweptNode( waterSurface, sweptB ).g, sweptNode( waterSurface, sweptC ).g ) ), vSweptRest );
  sweptFlow = mix( vWaterFlow, sweptW.x * sweptNode( waterFlow, sweptA ).rg + sweptW.y * sweptNode( waterFlow, sweptB ).rg + sweptW.z * sweptNode( waterFlow, sweptC ).rg, vSweptRest );
  sweptWaterTriangleNormal = sweptW.x * sweptNodeNormal( sweptA ) + sweptW.y * sweptNodeNormal( sweptB ) + sweptW.z * sweptNodeNormal( sweptC );
}
${sweptRestingDefines}`;

/**
 * The Rich curl's fragment declarations: everything the water's own Rich fragment declares, in its order (`WaterSurface`,
 * where its program is composed), so the water's shading chunks reach the curl too, then the seam's mask and the curl's
 * own (look-fix round 1). The water's `waterCarve` is declared first, as there, for its crest light's march through the
 * carved surface.
 */
const RICH_CURL_FRAGMENT_PARS = `#include <common>
float waterCarve( vec2 xz, float surface );
${waterFragmentPars}
${richRestingPars}
${waterCubicPars}
${waterTubePars}
${richFragmentPars}
${richAerationFragmentPars}
${waterRipplePars}
${waterSpecularPars}
${waterStreakPars}
${waterChurnPars}
${richReflectionPars}
${richPatchFragmentPars}
${waterBarrelMaskPars}
${richFaceRipplePars}`;

/**
 * The polygon offset that draws the band over the water it rests on, the two surfaces coinciding there: factor −1 (with
 * the surface's depth slope), units −4 (a few steps of the depth buffer) (look-fix round 1) [provisional].
 */
export const BAND_OFFSET = { factor: -1, units: -4 } as const;

/**
 * The swept barrel as drawn (the Padang Padang spec, Part B, PR 3): the loft's grid, shaded as the water is in either
 * look (spec 15: Classic with its existing shading), on the water's own uniforms, opaque, except that its lip is shaded
 * as a thin sheet lit from behind (`SWEPT_SHEET_BODY`). It shows exactly where the water gave way to the seam's mask
 * (where it is full), and across the mask's band, where it rests on the water, a child mesh (`band`) draws the same
 * surface blended over the water by the mask, so it fades into the sea with no dither (look-fix round 1). The height
 * field's crest light is not marched on it: under a lip it reads the hump, not the lip; the lip takes the crest light
 * over its own thickness.
 */
export class SweptBarrelMesh {
  readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  /**
   * The seam's band (look-fix round 1): the curl's own geometry and program (`SWEPT_BAND` defined), transparent, with no
   * depth write and pulled over the water it rests on (`BAND_OFFSET`), its alpha the mask (`SWEPT_BAND_ALPHA`). A child
   * of `mesh`, so it shows and hides with it, and shares its views, its sheet and its winding.
   */
  readonly band: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly bandMaterial: MeshPhysicalMaterial;
  private readonly bandOpaqueUniform = { value: 0 };
  private readonly positions = new BufferAttribute(new Float32Array(3 * VERTICES), 3).setUsage(DynamicDrawUsage);
  private readonly normals = new BufferAttribute(new Float32Array(3 * VERTICES), 3).setUsage(DynamicDrawUsage);
  private readonly lift = new BufferAttribute(new Float32Array(VERTICES), 1).setUsage(DynamicDrawUsage);
  private readonly sheet = new BufferAttribute(new Float32Array(VERTICES), 1).setUsage(DynamicDrawUsage);
  private readonly sheetWeight = new BufferAttribute(new Float32Array(VERTICES), 1).setUsage(DynamicDrawUsage);
  private readonly sheetBack = new BufferAttribute(new Float32Array(VERTICES), 1).setUsage(DynamicDrawUsage);
  private readonly wall = new BufferAttribute(new Float32Array(3 * VERTICES), 3).setUsage(DynamicDrawUsage);
  private readonly wallNormal = new BufferAttribute(new Float32Array(3 * VERTICES), 3).setUsage(DynamicDrawUsage);
  /** The Rich look's dark throat (`RICH_THROAT`): per vertex, as `richThroatVertexPars` lays them out. */
  private readonly throat = new BufferAttribute(new Float32Array(4 * VERTICES), 4).setUsage(DynamicDrawUsage);
  private readonly tube = new BufferAttribute(new Float32Array(4 * VERTICES), 4).setUsage(DynamicDrawUsage);
  private readonly ray = new BufferAttribute(new Float32Array(4 * VERTICES), 4).setUsage(DynamicDrawUsage);
  /** The Rich throat's lip shadow: each vertex's slice's crest (the lip's root) and the lip's thickness there. */
  private readonly crest = new BufferAttribute(new Float32Array(4 * VERTICES), 4).setUsage(DynamicDrawUsage);
  /** Both looks' crest light on the lifted curl (`SWEPT_CHORD_LIGHT`): each vertex's slice's ray (x, z) and its chords ahead and behind. */
  private readonly chord = new BufferAttribute(new Float32Array(4 * VERTICES), 4).setUsage(DynamicDrawUsage);
  /**
   * Both looks' face coordinates (σ, arc length along its slice), the Rich ripples' map where the curl is lifted; the
   * share of its lip fraying into drops (the Rich lip's leading edge, `RICH_FRAY`); and how far its face lies from the
   * ground it covers (`unroll`), which lays the lace along the face (`SWEPT_FOAM_COORDS`).
   */
  private readonly face = new BufferAttribute(new Float32Array(4 * VERTICES), 4).setUsage(DynamicDrawUsage);
  private readonly index = new BufferAttribute(new Uint32Array(INDICES), 1).setUsage(DynamicDrawUsage);
  /** The dev view's colours, made with the first view. */
  private viewColours?: BufferAttribute;
  private currentView?: SweptBarrelView;
  private look: WaterLook = 'classic';
  /** Dev only: false draws the lip as the column it was before the sheet (the water sheet's before-and-after). */
  sheetShown = true;
  /**
   * Each triangle faces the way its vertices' normals point. The loft winds its quads the other way (its front faces
   * look along −n), so a double-sided material saw every outer face as a back face and turned its normal into the
   * water: the view cosine came out negative, the body fell to R∞ with no bed, and the lights lit the water's inside.
   * At the lip's tip and the throat, where the profile folds back, a cell's vertex normals lean across the fold; such
   * a cell keeps the loft's order, so the material turns its normal back out (the advisor, 2026-10-01). Dev only: false
   * draws the loft's own winding (the water sheet's before-and-after).
   */
  facesOut = true;

  /** `view`: a dev view of the curl in place of its shading (`SweptBarrelView`); none draws it as the water. */
  constructor(private readonly uniforms: Record<string, { value: unknown }>, view?: SweptBarrelView) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('normal', this.normals);
    geometry.setAttribute('sweptLift', this.lift);
    geometry.setAttribute('sweptSheet', this.sheet);
    geometry.setAttribute('sweptSheetWeight', this.sheetWeight);
    geometry.setAttribute('sweptSheetBack', this.sheetBack);
    geometry.setAttribute('sweptWall', this.wall);
    geometry.setAttribute('sweptWallNormal', this.wallNormal);
    geometry.setAttribute('sweptThroat', this.throat);
    geometry.setAttribute('sweptTube', this.tube);
    geometry.setAttribute('sweptRay', this.ray);
    geometry.setAttribute('sweptCrest', this.crest);
    geometry.setAttribute('sweptChord', this.chord);
    geometry.setAttribute('sweptFace', this.face);
    geometry.setIndex(this.index);
    geometry.setDrawRange(0, 0);
    const parameters = { color: '#ffffff', roughness: CLASSIC_ROUGHNESS, metalness: 0, ior: WATER_IOR, side: DoubleSide } as const;
    const material = new MeshPhysicalMaterial(parameters);
    // The band: transparent, over the water it rests on, in one pass (three draws a double-sided transparent material twice).
    this.bandMaterial = new MeshPhysicalMaterial({
      ...parameters, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: BAND_OFFSET.factor, polygonOffsetUnits: BAND_OFFSET.units,
    });
    this.bandMaterial.defines = { ...this.bandMaterial.defines, SWEPT_BAND: '' };
    this.bandMaterial.forceSinglePass = true;
    for (const each of [material, this.bandMaterial]) {
      const band = each === this.bandMaterial;
      each.onBeforeCompile = (shader) => this.compile(shader, band);
      each.customProgramCacheKey = () => `breakline-swept-barrel-${this.look}${this.currentView ? `-view-${this.currentView}` : ''}${band ? '-band' : ''}`;
    }
    this.mesh = new Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    // The first of the transparent things drawn: it is part of the water's surface, and spray and foam lie over it.
    this.band = new Mesh(geometry, this.bandMaterial);
    this.band.frustumCulled = false;
    this.band.renderOrder = -1;
    this.mesh.add(this.band);
    this.setView(view);
  }

  /** The shaders of the curl (`band` false) and of its band, which differ only in how the seam's mask cuts them. */
  private compile(shader: WebGLProgramParametersWithUniforms, band: boolean): void {
    Object.assign(shader.uniforms, this.uniforms);
    if (band) shader.uniforms.sweptBandOpaque = this.bandOpaqueUniform;
    const rich = this.look === 'rich';
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', rich
        ? `#include <common>\n${waterVertexPars}\n${richAerationVertexPars}\n${waterCubicPars}\n${waterTubePars}\n${richWaterNormalAt}\n${sweptVertexPars}\n${richThroatVertexPars}`
        : `#include <common>\n${waterVertexPars}\n${classicWaterNormalAt}\n${sweptVertexPars}`)
      .replace('#include <beginnormal_vertex>', rich ? sweptBeginNormal + richAirVertex + richThroatVertex : sweptBeginNormal)
      .replace('#include <begin_vertex>', sweptBeginVertex);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', rich
        ? `${RICH_CURL_FRAGMENT_PARS}\n${sweptFragmentPars}\n${richThroatFragmentPars}`
        : `#include <common>\n${waterFragmentPars}\n${classicRestingPars}\n${waterBarrelMaskPars}\n${sweptFragmentPars}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${rich ? richRestingWater : classicRestingWater}\n${SWEPT_SEAM}`)
      // The Rich water's crest light marches through the carved surface (G9), and so does the curl's where it rests.
      .replace('float gap = waterHeightAt( p.xz ) - p.y;', rich ? 'float gap = waterCarve( p.xz, waterHeightAt( p.xz ) ) - p.y;' : 'float gap = waterHeightAt( p.xz ) - p.y;')
      .replace('#include <normal_fragment_begin>', rich ? RICH_CURL_NORMAL : CLASSIC_CURL_NORMAL)
      .replace('#include <color_fragment>', '')
      .replace('#include <emissivemap_fragment>', sweptBodyFragment(rich))
      .replace('#include <lights_fragment_maps>', rich ? RICH_REFLECTION + RICH_SEA_MIRROR + RICH_THROAT : '#include <lights_fragment_maps>');
    const view = this.currentView;
    if (!view) return;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${sweptViewVertexPars}`)
      .replace('#include <project_vertex>', 'vSweptView = sweptView;\n#include <project_vertex>');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${sweptViewFragmentPars}`)
      .replace('#include <opaque_fragment>', view === 'region' ? SWEPT_REGION_OUTPUT : SWEPT_VIEW_OUTPUT);
  }

  /** Dev only: draw the band opaque, to compare the curl's shading with the water's under it. */
  get bandOpaque(): boolean {
    return this.bandOpaqueUniform.value === 1;
  }

  set bandOpaque(on: boolean) {
    this.bandOpaqueUniform.value = on ? 1 : 0;
  }

  /** Free the geometry and both materials, the curl's and its band's. */
  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.bandMaterial.dispose();
  }

  get view(): SweptBarrelView | undefined {
    return this.currentView;
  }

  /** Dev only: draw the curl in a dev view, or (none) shaded as the water; it takes effect from the next `update`. */
  setView(view: SweptBarrelView | undefined): void {
    if (view === this.currentView) return;
    this.currentView = view;
    if (view && !this.viewColours) {
      this.viewColours = new BufferAttribute(new Float32Array(3 * VERTICES), 3).setUsage(DynamicDrawUsage);
      this.mesh.geometry.setAttribute('sweptView', this.viewColours);
    }
    // The region view reads the curl's own pixels (the water sheet's luminance check): the band over the water around
    // them would mix the water in, so it is not drawn there.
    this.band.visible = view !== 'region';
    this.mesh.material.needsUpdate = true;
    this.bandMaterial.needsUpdate = true;
  }

  /** Graphics setting (G8): shaded as the Classic water, or the Rich. */
  setLook(look: WaterLook): void {
    if (look === this.look) return;
    this.look = look;
    this.mesh.material.roughness = this.bandMaterial.roughness = look === 'rich' ? RICH_BASE_ROUGHNESS : CLASSIC_ROUGHNESS;
    this.mesh.material.needsUpdate = true;
    this.bandMaterial.needsUpdate = true;
  }

  /** Draw a loft's grid; none, or an empty one, hides the mesh. */
  update(loft: LoftResult | undefined): void {
    if (!loft || loft.indexCount === 0) {
      this.mesh.visible = false;
      this.mesh.geometry.setDrawRange(0, 0);
      return;
    }
    const vertices = Math.min(loft.vertexCount, VERTICES);
    const indices = Math.min(loft.indexCount, INDICES);
    (this.positions.array as Float32Array).set(loft.positions.subarray(0, 3 * vertices));
    (this.normals.array as Float32Array).set(loft.normals.subarray(0, 3 * vertices));
    (this.lift.array as Float32Array).set(loft.lift.subarray(0, vertices));
    (this.sheet.array as Float32Array).set(loft.sheet.subarray(0, vertices));
    (this.sheetBack.array as Float32Array).set(loft.sheetBack.subarray(0, vertices));
    // Each slice's back wall, the same for all its vertices.
    const wall = this.wall.array as Float32Array;
    const wallNormal = this.wallNormal.array as Float32Array;
    for (let s = 0; s * LOFT_SAMPLES < vertices; s += 1) {
      const from = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + WALL_POINT);
      for (let j = 0; j < LOFT_SAMPLES && s * LOFT_SAMPLES + j < vertices; j += 1) {
        const o = 3 * (s * LOFT_SAMPLES + j);
        for (let c = 0; c < 3; c += 1) {
          wall[o + c] = loft.positions[from + c];
          wallNormal[o + c] = loft.normals[from + c];
        }
      }
    }
    if (this.look === 'rich') {
      (this.throat.array as Float32Array).set(loft.throat.subarray(0, 4 * vertices));
      const tube = this.tube.array as Float32Array;
      const ray = this.ray.array as Float32Array;
      const p = loft.positions;
      for (let s = 0; s * LOFT_SAMPLES < vertices; s += 1) {
        const [rayX, rayZ] = [loft.sliceRayX[s], loft.sliceRayZ[s]];
        // The lip's outer face, in the slice's plane: its chord over the points its mean thickness is taken on, turned
        // a right angle out of the water.
        const from = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + THROAT.thicknessFrom);
        const to = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + THROAT.thicknessTo);
        const across = (p[to] - p[from]) * rayX + (p[to + 2] - p[from + 2]) * rayZ;
        const up = p[to + 1] - p[from + 1];
        const chord = Math.sqrt(across * across + up * up);
        const [lipAcross, lipUp] = chord > 0 ? [-up / chord, across / chord] : [0, 1];
        for (let j = 0; j < LOFT_SAMPLES && s * LOFT_SAMPLES + j < vertices; j += 1) {
          const v = s * LOFT_SAMPLES + j;
          tube[4 * v] = loft.sliceTipX[s];
          tube[4 * v + 1] = loft.sliceTipY[s];
          tube[4 * v + 2] = loft.sliceTipZ[s];
          tube[4 * v + 3] = loft.sliceMouth[s];
          ray[4 * v] = rayX;
          ray[4 * v + 1] = rayZ;
          ray[4 * v + 2] = lipAcross;
          ray[4 * v + 3] = lipUp;
        }
      }
      // Each slice's crest, the lip's root, and the lip's thickness there.
      const crest = this.crest.array as Float32Array;
      for (let s = 0; s * LOFT_SAMPLES < vertices; s += 1) {
        const at = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
        for (let j = 0; j < LOFT_SAMPLES && s * LOFT_SAMPLES + j < vertices; j += 1) {
          const v = s * LOFT_SAMPLES + j;
          crest[4 * v] = loft.positions[at];
          crest[4 * v + 1] = loft.positions[at + 1];
          crest[4 * v + 2] = loft.positions[at + 2];
          crest[4 * v + 3] = loft.sliceLipRoot ? loft.sliceLipRoot[s] : 0;
        }
      }
      for (const [attribute, size] of [[this.throat, 4], [this.tube, 4], [this.ray, 4], [this.crest, 4]] as const) {
        attribute.clearUpdateRanges();
        attribute.addUpdateRange(0, size * vertices);
        attribute.needsUpdate = true;
      }
    }
    // Each slice's ray with the chords through it, in both looks (a loft made without them has none).
    const chord = this.chord.array as Float32Array;
    for (let s = 0; s * LOFT_SAMPLES < vertices; s += 1) {
      for (let j = 0; j < LOFT_SAMPLES && s * LOFT_SAMPLES + j < vertices; j += 1) {
        const v = s * LOFT_SAMPLES + j;
        chord[4 * v] = loft.sliceRayX[s];
        chord[4 * v + 1] = loft.sliceRayZ[s];
        chord[4 * v + 2] = loft.chord ? loft.chord[2 * v] : NO_CHORD;
        chord[4 * v + 3] = loft.chord ? loft.chord[2 * v + 1] : NO_CHORD;
      }
    }
    this.chord.clearUpdateRanges();
    this.chord.addUpdateRange(0, 4 * vertices);
    this.chord.needsUpdate = true;
    // Each vertex's face coordinates, its slice's σ and its arc length along it, its lip's fraying share, and its arc less its
    // reach along the ray (a loft made without them has 0).
    const face = this.face.array as Float32Array;
    for (let s = 0; s * LOFT_SAMPLES < vertices; s += 1) {
      for (let j = 0; j < LOFT_SAMPLES && s * LOFT_SAMPLES + j < vertices; j += 1) {
        const v = s * LOFT_SAMPLES + j;
        face[4 * v] = loft.sliceSigma[s];
        face[4 * v + 1] = loft.arc ? loft.arc[v] : 0;
        face[4 * v + 2] = loft.fray ? loft.fray[v] : 0;
        face[4 * v + 3] = loft.unroll ? loft.unroll[v] : 0;
      }
    }
    this.face.clearUpdateRanges();
    this.face.addUpdateRange(0, 4 * vertices);
    this.face.needsUpdate = true;
    if (this.sheetShown) (this.sheetWeight.array as Float32Array).set(loft.sheetWeight.subarray(0, vertices));
    else (this.sheetWeight.array as Float32Array).fill(0, 0, vertices);
    const index = this.index.array as Uint32Array;
    if (this.facesOut) {
      const { positions: p, normals: n, indices: from } = loft;
      for (let i = 0; i + 2 < indices; i += 3) {
        const a = from[i];
        const b = from[i + 1];
        const c = from[i + 2];
        const [a3, b3, c3] = [3 * a, 3 * b, 3 * c];
        const e1x = p[b3] - p[a3];
        const e1y = p[b3 + 1] - p[a3 + 1];
        const e1z = p[b3 + 2] - p[a3 + 2];
        const e2x = p[c3] - p[a3];
        const e2y = p[c3 + 1] - p[a3 + 1];
        const e2z = p[c3 + 2] - p[a3 + 2];
        // The loft's order's front face against its vertices' normals (their sum): turn it round, else keep it.
        const facing = (e1y * e2z - e1z * e2y) * (n[a3] + n[b3] + n[c3]) + (e1z * e2x - e1x * e2z) * (n[a3 + 1] + n[b3 + 1] + n[c3 + 1])
          + (e1x * e2y - e1y * e2x) * (n[a3 + 2] + n[b3 + 2] + n[c3 + 2]);
        index[i] = a;
        index[i + 1] = facing < 0 ? c : b;
        index[i + 2] = facing < 0 ? b : c;
      }
    } else {
      index.set(loft.indices.subarray(0, indices));
    }
    if (this.currentView && this.viewColours) {
      sweptViewColours(this.currentView, loft, this.viewColours.array as Float32Array);
      this.viewColours.clearUpdateRanges();
      this.viewColours.addUpdateRange(0, 3 * vertices);
      this.viewColours.needsUpdate = true;
    }
    for (const attribute of [this.positions, this.normals, this.wall, this.wallNormal]) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, 3 * vertices);
      attribute.needsUpdate = true;
    }
    for (const attribute of [this.lift, this.sheet, this.sheetWeight, this.sheetBack]) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, vertices);
      attribute.needsUpdate = true;
    }
    this.index.clearUpdateRanges();
    this.index.addUpdateRange(0, indices);
    this.index.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, indices);
    this.mesh.visible = true;
  }
}
