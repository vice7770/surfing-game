import { BufferAttribute, BufferGeometry, Color, Mesh, MeshBasicMaterial } from 'three';
import { causticLookupPars, type CausticUniforms } from './CausticMap';
import { buildGridGeometry } from './gridGeometry';
import { WATER_IOR } from './waterOptics';

/** Share of the sand's light that is direct sun, which the caustics gather and spread (a rendering choice). */
const DIRECT_SHARE = 0.6;

/** Static seabed of a physical spot, shaded from pale sand in the shallows to deep blue-green. */
export class SpotSeabed {
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly shallow = new Color('#d6c69c');
  private readonly deep = new Color('#2f5f66');

  constructor() {
    this.mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ vertexColors: true, fog: true }));
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
  }

  /**
   * Light the sand with a caustic map (G5): the direct sun's share of its colour
   * follows the map, faded per channel by Beer–Lambert along the refracted sun
   * path, e^{−c·depth/cos θ_w}; under flat water it is unchanged.
   */
  useCaustics(caustics: CausticUniforms, water: { waterAttenuation: { value: unknown }; waterSunDirection: { value: unknown } }): void {
    const material = this.mesh.material;
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
  }

  /** Rebuild over a rectangle from a depth function (positive below datum, m). */
  setDepth(depthAt: (x: number, z: number) => number, xMin: number, zMin: number, width: number, length: number, spacing = 2): void {
    const axis = (start: number, span: number) => {
      const count = Math.max(1, Math.round(span / spacing));
      return Array.from({ length: count + 1 }, (_, i) => start + (span * i) / count);
    };
    this.setDepthOnGrid(depthAt, axis(xMin, width), axis(zMin, length));
  }

  /** Rebuild on explicit (possibly graded) world axes, e.g. fine under the tank and coarse beyond it. */
  setDepthOnGrid(depthAt: (x: number, z: number) => number, xs: number[], zs: number[]): void {
    const geometry = buildGridGeometry(xs, zs);
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const color = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      const depth = depthAt(positions.getX(i), positions.getZ(i));
      positions.setY(i, -depth);
      color.copy(this.shallow).lerp(this.deep, Math.min(1, Math.max(0, depth / 12)));
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
