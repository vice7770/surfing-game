import { BufferAttribute, BufferGeometry, Color, Mesh, MeshBasicMaterial } from 'three';
import { causticLookupPars, type CausticUniforms } from './CausticMap';
import { buildGridGeometry } from './gridGeometry';
import { WATER_IOR } from './waterOptics';
import { waterHeightPars } from './WaterSurface';
import { hazeLandKey, hazeLandLook, hazeLandRoute, onHazeLandChange, withHazeLand } from './water/hazeLand';
import { horizonHazeUniforms } from './water/horizonHaze';
import { wetSandFragment, wetSandPars } from './water/shoreline';

/** Share of the sand's light that is direct sun, which the caustics gather and spread (a rendering choice). */
const DIRECT_SHARE = 0.6;

/** The water's uniforms the seabed reads: its sun and clarity, and (for the wet sand) its surface, grid and memory. */
export interface SeabedWater {
  waterAttenuation: { value: unknown };
  waterSunDirection: { value: unknown };
  waterSurface?: { value: unknown };
  waterGrid?: { value: unknown };
  waterGridSize?: { value: unknown };
  waterWetSand?: { value: unknown };
}

/** Static seabed of a physical spot, shaded from pale sand in the shallows to deep blue-green. */
export class SpotSeabed {
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly shallow = new Color('#d6c69c');
  private readonly deep = new Color('#2f5f66');
  /**
   * A rock floor in the shallows, where the bed has one (`rockBed.ts`): the sand's colour scaled as the water's rock
   * albedo is to its sand's (`SPOT_OPTICS`), so the rock seen from under the water is not sand either.
   */
  private readonly rock = new Color('#827863');

  /** The floor's colours, shallow to deep: sand by default, a pool's painted concrete (the movement-flow spec). */
  setPalette(shallow: string, deep: string): void {
    this.shallow.set(shallow);
    this.deep.set(deep);
  }

  constructor() {
    this.mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ vertexColors: true, fog: true }));
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    const material = this.mesh.material;
    material.onBeforeCompile = (shader) => SpotSeabed.haze(shader, false);
    material.customProgramCacheKey = () => `breakline-spot-seabed${SpotSeabed.hazeKey(false)}`;
    // The land haze follows the water's look (the haze-land follow-up).
    onHazeLandChange(() => {
      material.needsUpdate = true;
    });
  }

  /**
   * The horizon haze over the sand and the seabed in the Rich look (`hazeLand.ts`): the dry beach greys toward the
   * horizon as the water beside it does. The water is drawn before it (its material is the older) and hides by depth
   * what lies under it, so only the sand in sight pays. With the caustics' world position at hand (`world`) it can take
   * either route; before, per vertex. Under water (the camera) the haze is off, as the water's is.
   */
  private static haze(shader: { uniforms: Record<string, unknown>; vertexShader: string; fragmentShader: string }, world: boolean): void {
    const route = hazeLandRoute('seabed', hazeLandLook(), world);
    if (!route) return;
    Object.assign(shader.uniforms, horizonHazeUniforms);
    withHazeLand(shader, { route, pixelToward: 'vSeabedWorld - cameraPosition' });
  }

  private static hazeKey(world: boolean): string {
    return hazeLandKey(hazeLandRoute('seabed', hazeLandLook(), world));
  }

  /**
   * Light the sand with a caustic map (G5): the direct sun's share of its colour
   * follows the map, faded per channel by Beer–Lambert along the refracted sun
   * path, e^{−c·depth/cos θ_w}; under flat water it is unchanged. Given the water's
   * surface, grid and wet-sand memory too, the sand the swash wetted lately is
   * darker where it stands above the water (the shoreline fix, shoreline.ts).
   */
  useCaustics(caustics: CausticUniforms, water: SeabedWater): void {
    const material = this.mesh.material;
    const { waterSurface, waterGrid, waterGridSize, waterWetSand } = water;
    const wet = waterSurface && waterGrid && waterGridSize && waterWetSand ? { waterSurface, waterGrid, waterGridSize, waterWetSand } : undefined;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, caustics, { waterAttenuation: water.waterAttenuation, waterSunDirection: water.waterSunDirection }, wet);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSeabedWorld;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeabedWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vSeabedWorld;
uniform vec3 waterAttenuation;
uniform vec3 waterSunDirection;
${causticLookupPars}${wet ? `${waterHeightPars}${wetSandPars}` : ''}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
{
  float seabedSun = clamp( waterSunDirection.y, 0.05, 1.0 );
  float seabedCos = sqrt( 1.0 - ( 1.0 - seabedSun * seabedSun ) / ( ${WATER_IOR} * ${WATER_IOR} ) );
  vec3 seabedReach = exp( -waterAttenuation * max( 0.0, -vSeabedWorld.y ) / seabedCos );
  float seabedLight = causticLightAt( vSeabedWorld.xz );
  diffuseColor.rgb *= mix( vec3( 1.0 ), vec3( seabedLight ), ${DIRECT_SHARE.toFixed(2)} * seabedReach );
}${wet ? wetSandFragment : ''}`);
      SpotSeabed.haze(shader, true);
    };
    material.customProgramCacheKey = () => `breakline-spot-seabed-caustics${wet ? '-wet-sand' : ''}${SpotSeabed.hazeKey(true)}`;
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
   * Rebuild on explicit (possibly graded) world axes, e.g. fine under the tank and coarse beyond it; with `rockCover`
   * (0 sand, 1 rock, past 1 darker rock, `rockBed.ts`), the rock's floor in its own colour.
   */
  setDepthOnGrid(depthAt: (x: number, z: number) => number, xs: number[], zs: number[], rockCover?: (x: number, z: number) => number): void {
    const geometry = buildGridGeometry(xs, zs);
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const color = new Color();
    const rock = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      const depth = depthAt(positions.getX(i), positions.getZ(i));
      positions.setY(i, -depth);
      const deepening = Math.min(1, Math.max(0, depth / 12));
      color.copy(this.shallow).lerp(this.deep, deepening);
      const cover = rockCover ? rockCover(positions.getX(i), positions.getZ(i)) : 0;
      if (cover > 0) {
        // Past 1 the cover runs on to darker rock (its joints and shaded blocks), never below black.
        color.lerp(rock.copy(this.rock).lerp(this.deep, deepening), cover);
        color.setRGB(Math.max(0, color.r), Math.max(0, color.g), Math.max(0, color.b));
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.mesh.position.set(0, 0, 0);
    this.mesh.visible = true;
  }
}
