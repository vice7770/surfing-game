import { BufferAttribute, BufferGeometry, Color, Mesh, MeshBasicMaterial, MeshStandardMaterial, type WebGLProgramParametersWithUniforms } from 'three';
import { causticLookupPars, type CausticUniforms } from './CausticMap';
import { buildGridGeometry } from './gridGeometry';
import type { WaterLook } from './water/waterLook';
import { SPOT_OPTICS, WATER_F0, WATER_IOR, refractedCosine, schlickFresnel, type Rgb } from './waterOptics';

/** Share of the sand's light that is direct sun, which the caustics gather and spread (a rendering choice). Classic's painted bed. */
const DIRECT_SHARE = 0.6;

/**
 * The water uniforms the seabed reads (the water mesh's own objects, shared so one update serves both). The Rich bed
 * takes the Rich look's own water where the water binds it (`richAttenuation`, `richDiffuseAttenuation`: the sourced
 * per-spot colour, underwater-colour.md), and the shared optics otherwise.
 */
export interface SeabedWaterUniforms {
  waterAttenuation: { value: unknown };
  waterDiffuseAttenuation: { value: unknown };
  waterBedAlbedo: { value: unknown };
  waterSunDirection: { value: unknown };
  richAttenuation?: { value: unknown };
  richDiffuseAttenuation?: { value: unknown };
}

/**
 * Fresnel reflectance of a uniform sky on flat water, the sky light that does not enter it: the cosine-weighted mean of
 * the unpolarised Fresnel reflectance over the hemisphere, 2 ∫ F(θ) sin θ cos θ dθ, 0.066 for n = 1.333 [computed;
 * pinned in the seabed's tests].
 */
export const DIFFUSE_SKY_REFLECTANCE = 0.066;
/**
 * The mean path of diffuse sky light through water, in depths: 1/μ̄ with μ̄ ≈ 0.83, the mean cosine of the light just
 * below the surface from a uniform sky [estimated, the underwater prototype's value; provisional].
 */
export const DIFFUSE_PATH = 1.2;
/** The wet band either side of the waterline, m: dry sand above it, the bed's wet albedo below [provisional]. */
export const WET_BAND = 0.12;
/**
 * The depth of water over which the bed's light turns from the air's to the water's, m [provisional: a rendering
 * choice]. The surface's Fresnel loss is a step at the waterline (2 % of a high sun's light, 7 % of the sky's), which a
 * hard edge would draw as an aliased line along the shore.
 */
export const WATERLINE_RAMP = 0.05;
/**
 * The albedo of sand under water where the spot's own map says the bed is not reef (Bathymetry's `materialAt`: Padang
 * Padang's beach face and its channel, which the coral atlas leaves unmapped), linear RGB: the bright carbonate sand of
 * the Reef's bed (`SPOT_OPTICS.reef`) [provisional: nothing is measured at Padang Padang]. A spot without a map keeps
 * its own bed albedo everywhere.
 */
export const SUBMERGED_SAND: Rgb = SPOT_OPTICS.reef.bedAlbedo;

/**
 * The light that reaches a seabed `depth` m under flat water, relative to the same bed in air, per channel
 * (the Rich bed's reference; the shader mirrors it):
 * - the sun's share, `sun`: it enters through the surface, (1 − F) of it for a sun at `sunCosine` from the vertical
 *   (Schlick's Fresnel, as the water's); its unscattered beam falls as e^{−c d/μ_w} and carries the caustics (`caustic`,
 *   1 for flat water), while the light the beam scattered on the way falls as e^{−K d/μ_w}, uniform (Beer–Lambert with
 *   the beam attenuation c, Gordon's K ≈ a + b_b: `waterOptics`); μ_w is the cosine of the refracted sun;
 * - the sky's share, `sky`: (1 − 0.066) of it enters, falling as e^{−1.2 K d} [provisional].
 * Above the water (depth 0) both are 1, turning to the water's over the first `WATERLINE_RAMP` m.
 */
export function bedLight(beam: Rgb, diffuse: Rgb, depth: number, sunCosine: number, caustic = 1): { sun: Rgb; sky: Rgb } {
  const under = Math.min(1, Math.max(0, depth) / WATERLINE_RAMP);
  const sun = Math.min(1, Math.max(0.05, sunCosine));
  const toward = refractedCosine(sun);
  const entering = 1 - schlickFresnel(sun);
  const along = (c: number) => Math.max(0, depth) / toward * c;
  const one = (i: number) => {
    const beamReach = Math.exp(-along(beam[i]));
    const allReach = Math.exp(-along(diffuse[i]));
    return 1 + under * (entering * (allReach + beamReach * (caustic - 1)) - 1);
  };
  const sky = (i: number) => 1 + under * ((1 - DIFFUSE_SKY_REFLECTANCE) * Math.exp(-DIFFUSE_PATH * diffuse[i] * Math.max(0, depth)) - 1);
  return { sun: [one(0), one(1), one(2)], sky: [sky(0), sky(1), sky(2)] };
}

const glslRgb = (c: Rgb) => `vec3( ${c.map((v) => v.toFixed(4)).join(', ')} )`;

/** The Rich bed's GLSL: `bedLight`'s light after the lights have lit it, and the albedo of dry sand or of the bed under water. */
const richColour = /* glsl */ `#include <color_fragment>
// Dry sand above the waterline; under it the spot's bed where its map says reef and carbonate sand elsewhere, over a
// short wet band.
float seabedWet = 1.0 - smoothstep( seabedWaterLevel - ${WET_BAND.toFixed(2)}, seabedWaterLevel + ${WET_BAND.toFixed(2)}, vSeabedWorld.y );
diffuseColor.rgb = mix( diffuseColor.rgb, mix( ${glslRgb(SUBMERGED_SAND)}, waterBedAlbedo, vSeabedReef ), seabedWet );`;

const richLight = /* glsl */ `#include <lights_fragment_end>
{
  // Under the water (bedLight): the sun through the surface and down its refracted path, the beam keeping the caustics
  // and the light it scattered not, and the sky through the surface and down its diffuse path.
  float seabedDepth = max( 0.0, seabedWaterLevel - vSeabedWorld.y );
  float seabedUnder = clamp( seabedDepth / ${WATERLINE_RAMP.toFixed(2)}, 0.0, 1.0 );
  float seabedSun = clamp( waterSunDirection.y, 0.05, 1.0 );
  float seabedCos = sqrt( 1.0 - ( 1.0 - seabedSun * seabedSun ) / ( ${WATER_IOR} * ${WATER_IOR} ) );
  float seabedEnter = 1.0 - ( ${WATER_F0.toFixed(6)} + ( 1.0 - ${WATER_F0.toFixed(6)} ) * pow( 1.0 - seabedSun, 5.0 ) );
  vec3 seabedBeam = exp( -waterAttenuation * seabedDepth / seabedCos );
  vec3 seabedAll = exp( -waterDiffuseAttenuation * seabedDepth / seabedCos );
  float seabedCaustic = mix( 1.0, causticLightAt( vSeabedWorld.xz ), seabedWet );
  vec3 seabedFromSun = mix( vec3( 1.0 ), seabedEnter * ( seabedAll + seabedBeam * ( seabedCaustic - 1.0 ) ), seabedUnder );
  vec3 seabedFromSky = mix( vec3( 1.0 ), ${(1 - DIFFUSE_SKY_REFLECTANCE).toFixed(3)} * exp( -${DIFFUSE_PATH.toFixed(2)} * waterDiffuseAttenuation * seabedDepth ), seabedUnder );
  reflectedLight.directDiffuse *= seabedFromSun;
  reflectedLight.directSpecular *= seabedFromSun;
  reflectedLight.indirectDiffuse *= seabedFromSky;
  reflectedLight.indirectSpecular *= seabedFromSky;
}`;

/**
 * The seabed of a physical spot. Classic draws it as it always was: an unlit painted gradient, pale sand in the shallows
 * to deep blue-green. Rich draws it lit (the underwater plan's item 1, "a seabed lit by the actual sun"): a rough
 * Lambertian surface under the scene's sun and the photographed sky's environment, so the land takes the hour's light,
 * its colour and its strength, and the bed under water takes what the sun and sky leave after the water (`bedLight`),
 * with the caustics on the sun's beam. A level surface at dawn is lit by the photographed sky's blue-grey, since the
 * sun, 2° up, gives it 0.1 % of its light; at sunset (6° up) the sun gives 13 % and warms it. Its albedo is the painted
 * sand's above the waterline [provisional: the Classic palette's own]; under it, the spot's bed albedo where the spot's
 * map says reef (`SPOT_OPTICS`, Padang Padang's live coral) and carbonate sand elsewhere (`SUBMERGED_SAND`).
 */
export class SpotSeabed {
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial | MeshStandardMaterial>;
  private readonly classic: MeshBasicMaterial;
  private readonly lit: MeshStandardMaterial;
  private readonly shallow = new Color('#d6c69c');
  private readonly deep = new Color('#2f5f66');
  /** The still water's height over the datum, m: the waterline of the Rich bed's two albedos and its depth of water. */
  private readonly waterLevel = { value: 0 };
  private currentLook: WaterLook = 'classic';

  constructor() {
    this.classic = new MeshBasicMaterial({ vertexColors: true, fog: true });
    // Dry sand's albedo: the painted bed's shallow end [provisional].
    this.lit = new MeshStandardMaterial({ color: this.shallow, roughness: 1, metalness: 0, fog: true });
    this.lit.customProgramCacheKey = () => 'breakline-spot-seabed-lit';
    this.mesh = new Mesh(new BufferGeometry(), this.classic);
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
  }

  /** Graphics setting (G8): the painted bed, or the lit one (Rich). */
  setLook(look: WaterLook): void {
    if (look === this.currentLook) return;
    this.currentLook = look;
    this.mesh.material = look === 'rich' ? this.lit : this.classic;
  }

  get look(): WaterLook {
    return this.currentLook;
  }

  /** Where the water stands over the datum (the tide), m. */
  setWaterLevel(level: number): void {
    this.waterLevel.value = level;
  }

  /**
   * Light the sand with a caustic map (G5): the direct sun's share of its colour
   * follows the map, faded per channel by Beer–Lambert along the refracted sun
   * path, e^{−c·depth/cos θ_w}; under flat water it is unchanged. The Rich bed takes the same
   * map and the same path, on the sun's beam alone (`bedLight`).
   */
  useCaustics(caustics: CausticUniforms, water: SeabedWaterUniforms): void {
    const material = this.classic;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, caustics, { waterAttenuation: water.waterAttenuation, waterSunDirection: water.waterSunDirection });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSeabedWorld;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeabedWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vSeabedWorld;
uniform vec3 waterAttenuation;
uniform vec3 waterSunDirection;
${causticLookupPars}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
{
  float seabedSun = clamp( waterSunDirection.y, 0.05, 1.0 );
  float seabedCos = sqrt( 1.0 - ( 1.0 - seabedSun * seabedSun ) / ( ${WATER_IOR} * ${WATER_IOR} ) );
  vec3 seabedReach = exp( -waterAttenuation * max( 0.0, -vSeabedWorld.y ) / seabedCos );
  float seabedLight = causticLightAt( vSeabedWorld.xz );
  diffuseColor.rgb *= mix( vec3( 1.0 ), vec3( seabedLight ), ${DIRECT_SHARE.toFixed(2)} * seabedReach );
}`);
    };
    material.customProgramCacheKey = () => 'breakline-spot-seabed-caustics';
    material.needsUpdate = true;
    this.useWaterLight(caustics, water);
  }

  /** The Rich bed's shader: the water's optics and sun (the Rich look's own water where bound), the caustic map, the waterline. */
  private useWaterLight(caustics: CausticUniforms, water: SeabedWaterUniforms): void {
    const material = this.lit;
    material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, caustics, {
        waterAttenuation: water.richAttenuation ?? water.waterAttenuation,
        waterDiffuseAttenuation: water.richDiffuseAttenuation ?? water.waterDiffuseAttenuation,
        waterBedAlbedo: water.waterBedAlbedo,
        waterSunDirection: water.waterSunDirection,
        seabedWaterLevel: this.waterLevel,
      });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float seabedReef;\nvarying vec3 vSeabedWorld;\nvarying float vSeabedReef;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeabedWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvSeabedReef = seabedReef;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vSeabedWorld;
varying float vSeabedReef;
uniform vec3 waterAttenuation;
uniform vec3 waterDiffuseAttenuation;
uniform vec3 waterBedAlbedo;
uniform vec3 waterSunDirection;
uniform float seabedWaterLevel;
${causticLookupPars}`)
        .replace('#include <color_fragment>', richColour)
        .replace('#include <lights_fragment_end>', richLight);
    };
    material.needsUpdate = true;
  }

  /** Rebuild over a rectangle from a depth function (positive below datum, m). */
  setDepth(depthAt: (x: number, z: number) => number, xMin: number, zMin: number, width: number, length: number, spacing = 2): void {
    const axis = (start: number, span: number) => {
      const count = Math.max(1, Math.round(span / spacing));
      return Array.from({ length: count + 1 }, (_, i) => start + (span * i) / count);
    };
    this.setDepthOnGrid(depthAt, axis(xMin, width), axis(zMin, length));
  }

  /**
   * Rebuild on explicit (possibly graded) world axes, e.g. fine under the tank and coarse beyond it. `reefAt` is the
   * spot's own map of its bed (Bathymetry's `materialAt`): the Rich bed under water takes the spot's bed albedo where it
   * says reef and `SUBMERGED_SAND` elsewhere; without one, the spot's bed albedo everywhere.
   */
  setDepthOnGrid(depthAt: (x: number, z: number) => number, xs: number[], zs: number[], reefAt?: (x: number, z: number) => boolean): void {
    const geometry = buildGridGeometry(xs, zs);
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const reef = new Float32Array(positions.count);
    const color = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      const depth = depthAt(positions.getX(i), positions.getZ(i));
      positions.setY(i, -depth);
      color.copy(this.shallow).lerp(this.deep, Math.min(1, Math.max(0, depth / 12)));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      reef[i] = !reefAt || reefAt(positions.getX(i), positions.getZ(i)) ? 1 : 0;
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.setAttribute('seabedReef', new BufferAttribute(reef, 1));
    geometry.computeVertexNormals();
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.mesh.position.set(0, 0, 0);
    this.mesh.visible = true;
  }
}
