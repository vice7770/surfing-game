import {
  Color,
  DataTexture,
  DoubleSide,
  FloatType,
  Mesh,
  MeshPhysicalMaterial,
  NearestFilter,
  PlaneGeometry,
  RGFormat,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import type { InteractiveWaterField } from '../wave/WaveModel';

export interface SurfaceGrid {
  xMin: number;
  zMin: number;
  spacing: number;
  nx: number;
  nz: number;
}

/**
 * CPU mirror of `waterHeightAt` in the vertex shader. `data` holds (height, foam)
 * pairs per grid node, and the lookup repeats InteractiveWaterField's bilinear
 * sampling, so the displaced mesh matches the height the board samples.
 */
export function sampleSurfaceHeight(data: Float32Array, grid: SurfaceGrid, x: number, z: number): number {
  const gx = (x - grid.xMin) / grid.spacing;
  const gz = (z - grid.zMin) / grid.spacing;
  if (gx < 0 || gz < 0 || gx >= grid.nx - 1 || gz >= grid.nz - 1) return 0;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const tx = gx - x0;
  const tz = gz - z0;
  const i = (z0 * grid.nx + x0) * 2;
  const row = grid.nx * 2;
  const top = data[i] * (1 - tx) + data[i + 2] * tx;
  const bottom = data[i + row] * (1 - tx) + data[i + row + 2] * tx;
  return top * (1 - tz) + bottom * tz;
}

/** CPU mirror of the shader normal: the same central differences as InteractiveWaterField.sample(). */
export function sampleSurfaceNormal(data: Float32Array, grid: SurfaceGrid, x: number, z: number): Vector3 {
  const step = grid.spacing;
  const slopeX = (sampleSurfaceHeight(data, grid, x + step, z) - sampleSurfaceHeight(data, grid, x - step, z)) / (2 * step);
  const slopeZ = (sampleSurfaceHeight(data, grid, x, z + step) - sampleSurfaceHeight(data, grid, x, z - step)) / (2 * step);
  return new Vector3(-slopeX, 1, -slopeZ).normalize();
}

const waterVertexPars = /* glsl */ `
uniform sampler2D waterSurface;
uniform vec4 waterGrid;
uniform vec2 waterGridSize;
uniform float waterWaveHeight;
uniform vec3 waterBaseColor;
uniform vec3 waterCrestColor;
uniform vec3 waterFoamColor;
varying vec3 vWaterColor;

float waterHeightAt( vec2 xz ) {
  vec2 g = ( xz - waterGrid.xy ) / waterGrid.z;
  if ( g.x < 0.0 || g.y < 0.0 || g.x >= waterGridSize.x - 1.0 || g.y >= waterGridSize.y - 1.0 ) return 0.0;
  ivec2 c = ivec2( floor( g ) );
  vec2 t = g - vec2( c );
  float top = mix( texelFetch( waterSurface, c, 0 ).r, texelFetch( waterSurface, c + ivec2( 1, 0 ), 0 ).r, t.x );
  float bottom = mix( texelFetch( waterSurface, c + ivec2( 0, 1 ), 0 ).r, texelFetch( waterSurface, c + ivec2( 1, 1 ), 0 ).r, t.x );
  return mix( top, bottom, t.y );
}

float waterFoamAt( vec2 xz ) {
  vec2 g = clamp( ( xz - waterGrid.xy ) / waterGrid.z, vec2( 0.0 ), waterGridSize - 1.0 );
  ivec2 c = min( ivec2( floor( g ) ), ivec2( waterGridSize ) - 2 );
  vec2 t = g - vec2( c );
  float top = mix( texelFetch( waterSurface, c, 0 ).g, texelFetch( waterSurface, c + ivec2( 1, 0 ), 0 ).g, t.x );
  float bottom = mix( texelFetch( waterSurface, c + ivec2( 0, 1 ), 0 ).g, texelFetch( waterSurface, c + ivec2( 1, 1 ), 0 ).g, t.x );
  return mix( top, bottom, t.y );
}
`;

// Replaces <beginnormal_vertex>: height, normal, and crest/foam color all come
// from the shared field texture instead of CPU-written vertex attributes.
const waterBeginNormal = /* glsl */ `
vec2 waterXZ = ( modelMatrix * vec4( position, 1.0 ) ).xz;
float waterHeight = waterHeightAt( waterXZ );
vec2 waterStepX = vec2( waterGrid.z, 0.0 );
vec2 waterStepZ = vec2( 0.0, waterGrid.z );
float waterSlopeX = ( waterHeightAt( waterXZ + waterStepX ) - waterHeightAt( waterXZ - waterStepX ) ) / ( 2.0 * waterGrid.z );
float waterSlopeZ = ( waterHeightAt( waterXZ + waterStepZ ) - waterHeightAt( waterXZ - waterStepZ ) ) / ( 2.0 * waterGrid.z );
vec3 objectNormal = normalize( vec3( -waterSlopeX, 1.0, -waterSlopeZ ) );
float waterCrest = clamp( waterHeight / max( waterWaveHeight, 0.01 ) * 0.6, 0.0, 0.6 );
vWaterColor = mix( mix( waterBaseColor, waterCrestColor, waterCrest ), waterFoamColor, waterFoamAt( waterXZ ) );
`;

export class WaterSurface {
  readonly mesh: Mesh<PlaneGeometry, MeshPhysicalMaterial>;
  /** Interleaved (height, foam) per grid node, uploaded as an RG float texture each frame. */
  readonly surfaceData: Float32Array;
  readonly grid: SurfaceGrid;
  private readonly geometry: PlaneGeometry;
  private readonly texture: DataTexture;
  private readonly foamMemory: Float32Array;
  private readonly uniforms: Record<string, { value: unknown }>;
  private lastWaveTime = 0;
  private lastZMin: number;

  constructor(private wave: InteractiveWaterField) {
    this.grid = { xMin: wave.xMin, zMin: wave.zMin, spacing: wave.spacing, nx: wave.nx, nz: wave.nz };
    this.surfaceData = new Float32Array(wave.nx * wave.nz * 2);
    this.foamMemory = new Float32Array(wave.nx * wave.nz);
    this.lastZMin = wave.zMin;
    this.texture = new DataTexture(this.surfaceData, wave.nx, wave.nz, RGFormat, FloatType);
    this.texture.magFilter = NearestFilter;
    this.texture.minFilter = NearestFilter;
    this.texture.generateMipmaps = false;

    // Static vertices on the grid nodes; the vertex shader displaces them.
    this.geometry = new PlaneGeometry(48, 80, wave.nx - 1, wave.nz - 1);
    this.geometry.rotateX(-Math.PI / 2);
    this.geometry.translate(0, 0, 8);
    this.uniforms = {
      waterSurface: { value: this.texture },
      waterGrid: { value: new Vector4(wave.xMin, wave.zMin, wave.spacing, 0) },
      waterGridSize: { value: new Vector2(wave.nx, wave.nz) },
      waterWaveHeight: { value: wave.settings.height },
      waterBaseColor: { value: new Color('#0c8f9d') },
      waterCrestColor: { value: new Color('#4fc1b5') },
      waterFoamColor: { value: new Color('#d8f2e9') },
    };
    const material = new MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.62,
      metalness: 0.01,
      clearcoat: 0.12,
      clearcoatRoughness: 0.55,
      side: DoubleSide,
      flatShading: false,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${waterVertexPars}`)
        .replace('#include <beginnormal_vertex>', waterBeginNormal)
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position );\ntransformed.y = waterHeight;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWaterColor;')
        .replace('#include <color_fragment>', 'diffuseColor.rgb *= vWaterColor;');
    };
    material.customProgramCacheKey = () => 'breakline-water-surface';
    this.mesh = new Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.update();
  }

  update(): void {
    const wave = this.wave;
    if (wave.zMin !== this.lastZMin) {
      const cells = Math.round((wave.zMin - this.lastZMin) / wave.spacing) * wave.nx;
      this.foamMemory.copyWithin(0, cells);
      this.foamMemory.fill(0, this.foamMemory.length - cells);
      this.lastZMin = wave.zMin;
    }
    this.mesh.position.z = wave.zMin + 32;
    const crestZ = wave.crestZ();
    const elapsed = Math.max(0, wave.time - this.lastWaveTime);
    this.lastWaveTime = wave.time;
    const foamDecay = Math.exp(-elapsed / 2.2);
    wave.copyHeights(this.surfaceData, 2, 0);
    for (let iz = 0; iz < wave.nz; iz += 1) {
      const z = wave.zMin + iz * wave.spacing;
      for (let ix = 0; ix < wave.nx; ix += 1) {
        const i = iz * wave.nx + ix;
        const x = wave.xMin + ix * wave.spacing;
        const slope = wave.slopeMagnitude(x, z);
        const crestDistance = (z - wave.crestZAt(x, crestZ)) / 1.15;
        const narrowFoam = Math.exp(-0.5 * crestDistance * crestDistance);
        const activeFoam = Math.max(
          Math.max(0, Math.min(0.12, (slope - 0.12) * 0.5)),
          wave.breakingAt(x, z, slope, crestZ) * narrowFoam * 0.88,
        );
        this.foamMemory[i] = Math.max(activeFoam, this.foamMemory[i] * foamDecay);
        this.surfaceData[i * 2 + 1] = Math.max(activeFoam, this.foamMemory[i] * 0.65);
      }
    }
    this.grid.zMin = wave.zMin;
    (this.uniforms.waterGrid.value as Vector4).y = wave.zMin;
    this.uniforms.waterWaveHeight.value = wave.settings.height;
    this.texture.needsUpdate = true;
  }

  setWave(wave: InteractiveWaterField): void {
    this.wave = wave;
    this.foamMemory.fill(0);
    this.lastWaveTime = 0;
    this.lastZMin = wave.zMin;
    this.mesh.position.z = wave.zMin + 32;
  }

  dispose(): void {
    this.geometry.dispose();
    this.texture.dispose();
    this.mesh.material.dispose();
  }
}
