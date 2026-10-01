import { BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Mesh, MeshPhysicalMaterial } from 'three';
import { LANDMARK } from '../../wave/barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES, THROAT, type LoftResult } from '../../wave/barrel/sweptLoft';
import type { WaterLook } from '../water/waterLook';
import { RICH_FAR_FOAM, RICH_REFLECTION, richFarNormal, richFragmentPars, richReflectionPars } from '../water/richWaterGlsl';
import { waterRipplePars } from '../water/rippleTexture';
import { CLASSIC_ROUGHNESS, RICH_BASE_ROUGHNESS, waterSpecularPars } from '../water/specular';
import { waterChopNormal } from '../waterChop';
import { CLASSIC_FOAM, CREST_SCATTER, WATER_ABSORPTION, WATER_IOR, waterBodyFragment } from '../waterOptics';
import { waterFragmentPars, waterVertexPars } from '../WaterSurface';
import { SWEPT_BARREL_DISCARD, waterBarrelMaskPars } from './barrelMaskGlsl';

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
      const wall = !lip && loft.slicePhase[slice] === 1 && standing && point >= LANDMARK.throat && point <= LANDMARK.toe;
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

// The loft's vertices are world positions and normals: the water's depth, foam and current are read where each lies.
// The curl takes the water's foam only as far as it lies on the water: the solver breaks where the tube is, so its
// roller's whitewater there is the tube's water, not foam on it; the tube's own foam comes with the crash curve (PR 5).
// The lip's thickness and its weight as a sheet come from the loft (`sheetAcross`).
const sweptVertexPars = /* glsl */ `attribute float sweptLift;
attribute float sweptSheet;
attribute float sweptSheetWeight;
attribute float sweptSheetBack;
attribute vec3 sweptWall;
attribute vec3 sweptWallNormal;
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
vSweptWallNormal = sweptWallNormal;`;
const sweptFragmentPars = /* glsl */ `varying float vSweptSheet;
varying float vSweptSheetWeight;
varying float vSweptSheetBack;
varying float vSweptWallDepth;
varying vec3 vSweptWallNormal;`;
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
 * The lip glow's path lengthening for multiple scattering (the spec's item 16: exp(−σ·k·d), k ≈ 5–20; the advisor's
 * start, 8, 2026-10-01): a thin, aerated lip scatters far more than clear water [provisional: to tune by eye against
 * backlit lips].
 */
export const LIP_GLOW_PATH = 8;
const glslVec3 = (rgb: readonly number[]) => `vec3( ${rgb.map((c) => c.toFixed(6)).join(', ')} )`;

/**
 * Rich vertex pieces: the inner face's views, the lip's thickness and the face's weight; each slice's tip and mouth; its
 * ray (x, z) and the lip's normal in its plane (across, up).
 */
const richThroatVertexPars = /* glsl */ `attribute vec4 sweptThroat;
attribute vec4 sweptTube;
attribute vec4 sweptRay;
varying vec4 vSweptThroat;
varying vec4 vSweptTube;
varying vec4 vSweptRay;`;
const richThroatVertex = /* glsl */ `
vSweptThroat = sweptThroat;
vSweptTube = sweptTube;
vSweptRay = sweptRay;`;
const richThroatFragmentPars = /* glsl */ `varying vec4 vSweptThroat;
varying vec4 vSweptTube;
varying vec4 vSweptRay;

// Whether a direction (world) leaves the tube from a point whose slice sees its lip's tip at \`tip\` (along the ray, up):
// through the opening in the slice's plane, from the horizon up to the tip, or along the crest out of the tube's mouth
// before it meets the wall, |along| / |across| > L_mouth / d_wall, the tip's distance standing for the wall's.
bool sweptLeaves( vec3 direction, vec2 tip ) {
  vec2 across = vec2( dot( direction.xz, vSweptRay.xy ), direction.y );
  float along = abs( dot( direction.xz, vec2( vSweptRay.y, -vSweptRay.x ) ) );
  bool opening = across.y >= 0.0 && across.x * tip.y - across.y * tip.x >= 0.0;
  return opening || along * length( tip ) > vSweptTube.w * length( across );
}`;

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
 * The dark throat (Rich; the spec's item 16; the advisor's rulings, 2026-10-01), once the image-based light is
 * gathered, on the inner face as far as its weight says (points 64–112 of a slice with an underside):
 * - its sky light: the sky it sees through the opening (the 2D view factor F_w), the light through the lip (the lip's
 *   view factor F_l × the sky and sun above the lip through its mean thickness, e^{−ct}), and R∞ of the sky for the
 *   rest, the tube's own water [the magnitudes provisional]; the ambient light, the same everywhere, as the sky;
 * - its reflections, only where the mirrored ray leaves the tube (`sweptLeaves`: the advisor's mirrored mouth);
 * - the sun, where its direction doesn't leave the tube: its direct light through the lip on the slant path
 *   t / max(0.2, |n_lip · L|), e^{−c path} per channel (red goes first: the green room), and no glint [the path
 *   provisional]. A low sun down the crest and out of the mouth is unchanged: the light down the tube. With the old
 *   sky's fill light, the fill is shadowed with it.
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
  radiance *= mix( 1.0, sweptLeaves( sweptMirror, sweptTip ) ? 1.0 : 0.0, vSweptThroat.w );
  if ( !sweptLeaves( waterSunDirection, sweptTip ) ) {
    vec2 sweptSun = vec2( dot( waterSunDirection.xz, vSweptRay.xy ), waterSunDirection.y );
    float sweptSlant = vSweptThroat.z / max( 0.2, abs( dot( vSweptRay.zw, sweptSun ) ) );
    reflectedLight.directDiffuse *= mix( vec3( 1.0 ), exp( -waterAttenuation * sweptSlant ), vSweptThroat.w );
    reflectedLight.directSpecular *= 1.0 - vSweptThroat.w;
  }
}
#endif`;

const sweptBeginVertex = /* glsl */ `vec3 transformed = vec3( position );
vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`;

/**
 * The swept barrel as drawn (the Padang Padang spec, Part B, PR 3): the loft's grid, shaded as the water is in either
 * look (spec 15: Classic with its existing shading), on the water's own uniforms, opaque, except that its lip is shaded
 * as a thin sheet lit from behind (`SWEPT_SHEET_BODY`). It shows exactly where the water gave way to the seam's mask,
 * the same dither deciding each pixel of the band. The height field's crest light is not marched on it: under a lip it
 * reads the hump, not the lip; the lip takes the crest light over its own thickness.
 */
export class SweptBarrelMesh {
  readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
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
  constructor(uniforms: Record<string, { value: unknown }>, view?: SweptBarrelView) {
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
    geometry.setIndex(this.index);
    geometry.setDrawRange(0, 0);
    const material = new MeshPhysicalMaterial({ color: '#ffffff', roughness: CLASSIC_ROUGHNESS, metalness: 0, ior: WATER_IOR, side: DoubleSide });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      const rich = this.look === 'rich';
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', rich ? `#include <common>\n${waterVertexPars}\n${sweptVertexPars}\n${richThroatVertexPars}` : `#include <common>\n${waterVertexPars}\n${sweptVertexPars}`)
        .replace('#include <beginnormal_vertex>', rich ? sweptBeginNormal + richThroatVertex : sweptBeginNormal)
        .replace('#include <begin_vertex>', sweptBeginVertex);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', rich
          ? `#include <common>\n${waterFragmentPars}\n${richFragmentPars}\n${waterRipplePars}\n${waterSpecularPars}\n${richReflectionPars}\n${waterBarrelMaskPars}\n${sweptFragmentPars}\n${richThroatFragmentPars}`
          : `#include <common>\n${waterFragmentPars}\n${waterBarrelMaskPars}\n${sweptFragmentPars}`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${SWEPT_BARREL_DISCARD}`)
        .replace('#include <normal_fragment_begin>', rich ? richFarNormal : waterChopNormal)
        .replace('#include <color_fragment>', '')
        .replace('#include <emissivemap_fragment>', rich ? waterBodyFragment(false, true, RICH_FAR_FOAM, SWEPT_SHEET_BODY + RICH_LIP_GLOW) : waterBodyFragment(false, true, CLASSIC_FOAM, SWEPT_SHEET_BODY))
        .replace('#include <lights_fragment_maps>', rich ? RICH_REFLECTION + RICH_THROAT : '#include <lights_fragment_maps>');
      const view = this.currentView;
      if (!view) return;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${sweptViewVertexPars}`)
        .replace('#include <project_vertex>', 'vSweptView = sweptView;\n#include <project_vertex>');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${sweptViewFragmentPars}`)
        .replace('#include <opaque_fragment>', view === 'region' ? SWEPT_REGION_OUTPUT : SWEPT_VIEW_OUTPUT);
    };
    material.customProgramCacheKey = () => `breakline-swept-barrel-${this.look}${this.currentView ? `-view-${this.currentView}` : ''}`;
    this.mesh = new Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.setView(view);
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
    this.mesh.material.needsUpdate = true;
  }

  /** Graphics setting (G8): shaded as the Classic water, or the Rich. */
  setLook(look: WaterLook): void {
    if (look === this.look) return;
    this.look = look;
    this.mesh.material.roughness = look === 'rich' ? RICH_BASE_ROUGHNESS : CLASSIC_ROUGHNESS;
    this.mesh.material.needsUpdate = true;
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
      for (const [attribute, size] of [[this.throat, 4], [this.tube, 4], [this.ray, 4]] as const) {
        attribute.clearUpdateRanges();
        attribute.addUpdateRange(0, size * vertices);
        attribute.needsUpdate = true;
      }
    }
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
