import {
  BufferGeometry,
  type Camera,
  Color,
  DataTexture,
  DoubleSide,
  FloatType,
  Mesh,
  MeshPhysicalMaterial,
  NearestFilter,
  PlaneGeometry,
  RedFormat,
  RGFormat,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import type { WaterLook } from './water/waterLook';
import { RICH_FOAM, richBeginNormal, richFragmentPars, richNormalFragment, richVertexHeight, waterCubicPars } from './water/richWaterGlsl';
import {
  PATCH_SIZE, PATCH_SPACING, createPatchGeometry, patchRect, richPatchDiscard, richPatchFragmentPars, richPatchVertexPars,
} from './water/richPatch';
import { churnTexture, waterChurnPars } from './water/churnTexture';
import { rippleTexture, waterRipplePars } from './water/rippleTexture';
import { CLASSIC_ROUGHNESS, RICH_BASE_ROUGHNESS, waterSpecularPars } from './water/specular';
import { waterStreakPars } from './water/streaks';
import { causticLookupPars, createCausticUniforms, type CausticSource, type CausticUniforms } from './CausticMap';
import { foamPatternPars, foamTileTexture } from './foamPattern';
import { DEFAULT_WATER_CHOP, chopFieldUniforms, waterChopNormal, waterChopPars } from './waterChop';
import {
  WATER_IOR, applyOptics, applySun, createOpticsUniforms, waterBodyFragment, waterCrestPars, waterOpticsPars, type WaterOptics,
} from './waterOptics';

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

/** CPU mirror of `waterBedAt` in the vertex shader: bilinear bed elevation from one value per node, clamped to the grid. */
export function sampleSurfaceBed(bed: Float32Array, grid: SurfaceGrid, x: number, z: number): number {
  const gx = Math.min(grid.nx - 1, Math.max(0, (x - grid.xMin) / grid.spacing));
  const gz = Math.min(grid.nz - 1, Math.max(0, (z - grid.zMin) / grid.spacing));
  const x0 = Math.min(grid.nx - 2, Math.floor(gx));
  const z0 = Math.min(grid.nz - 2, Math.floor(gz));
  const tx = gx - x0;
  const tz = gz - z0;
  const i = z0 * grid.nx + x0;
  const top = bed[i] * (1 - tx) + bed[i + 1] * tx;
  const bottom = bed[i + grid.nx] * (1 - tx) + bed[i + grid.nx + 1] * tx;
  return top * (1 - tz) + bottom * tz;
}

/** CPU mirror of the shader normal: the same central differences as InteractiveWaterField.sample(). */
export function sampleSurfaceNormal(data: Float32Array, grid: SurfaceGrid, x: number, z: number): Vector3 {
  const step = grid.spacing;
  const slopeX = (sampleSurfaceHeight(data, grid, x + step, z) - sampleSurfaceHeight(data, grid, x - step, z)) / (2 * step);
  const slopeZ = (sampleSurfaceHeight(data, grid, x, z + step) - sampleSurfaceHeight(data, grid, x, z - step)) / (2 * step);
  return new Vector3(-slopeX, 1, -slopeZ).normalize();
}

/** Height lookup shared by both shader stages: the field's own bilinear sampling (see `sampleSurfaceHeight`). */
const waterHeightPars = /* glsl */ `
uniform sampler2D waterSurface;
uniform vec4 waterGrid;
uniform vec2 waterGridSize;

float waterHeightAt( vec2 xz ) {
  vec2 g = ( xz - waterGrid.xy ) / waterGrid.z;
  if ( g.x < 0.0 || g.y < 0.0 || g.x >= waterGridSize.x - 1.0 || g.y >= waterGridSize.y - 1.0 ) return 0.0;
  ivec2 c = ivec2( floor( g ) );
  vec2 t = g - vec2( c );
  float top = mix( texelFetch( waterSurface, c, 0 ).r, texelFetch( waterSurface, c + ivec2( 1, 0 ), 0 ).r, t.x );
  float bottom = mix( texelFetch( waterSurface, c + ivec2( 0, 1 ), 0 ).r, texelFetch( waterSurface, c + ivec2( 1, 1 ), 0 ).r, t.x );
  return mix( top, bottom, t.y );
}
`;

const waterVertexPars = /* glsl */ `
${waterHeightPars}
uniform sampler2D waterBed;
uniform sampler2D waterFlow;
varying float vWaterDepth;
varying float vWaterFoam;
varying vec2 vWaterFlow;
varying vec3 vWaterWorld;

float waterFoamAt( vec2 xz ) {
  vec2 g = clamp( ( xz - waterGrid.xy ) / waterGrid.z, vec2( 0.0 ), waterGridSize - 1.0 );
  ivec2 c = min( ivec2( floor( g ) ), ivec2( waterGridSize ) - 2 );
  vec2 t = g - vec2( c );
  float top = mix( texelFetch( waterSurface, c, 0 ).g, texelFetch( waterSurface, c + ivec2( 1, 0 ), 0 ).g, t.x );
  float bottom = mix( texelFetch( waterSurface, c + ivec2( 0, 1 ), 0 ).g, texelFetch( waterSurface, c + ivec2( 1, 1 ), 0 ).g, t.x );
  return mix( top, bottom, t.y );
}

vec2 waterFlowAt( vec2 xz ) {
  vec2 g = clamp( ( xz - waterGrid.xy ) / waterGrid.z, vec2( 0.0 ), waterGridSize - 1.0 );
  ivec2 c = min( ivec2( floor( g ) ), ivec2( waterGridSize ) - 2 );
  vec2 t = g - vec2( c );
  vec2 top = mix( texelFetch( waterFlow, c, 0 ).rg, texelFetch( waterFlow, c + ivec2( 1, 0 ), 0 ).rg, t.x );
  vec2 bottom = mix( texelFetch( waterFlow, c + ivec2( 0, 1 ), 0 ).rg, texelFetch( waterFlow, c + ivec2( 1, 1 ), 0 ).rg, t.x );
  return mix( top, bottom, t.y );
}

// sampleSurfaceBed() in WaterSurface.ts.
float waterBedAt( vec2 xz ) {
  vec2 g = clamp( ( xz - waterGrid.xy ) / waterGrid.z, vec2( 0.0 ), waterGridSize - 1.0 );
  ivec2 c = min( ivec2( floor( g ) ), ivec2( waterGridSize ) - 2 );
  vec2 t = g - vec2( c );
  float top = mix( texelFetch( waterBed, c, 0 ).r, texelFetch( waterBed, c + ivec2( 1, 0 ), 0 ).r, t.x );
  float bottom = mix( texelFetch( waterBed, c + ivec2( 0, 1 ), 0 ).r, texelFetch( waterBed, c + ivec2( 1, 1 ), 0 ).r, t.x );
  return mix( top, bottom, t.y );
}
`;

// Replaces <beginnormal_vertex>: height, normal, depth and foam all come from
// the shared field textures instead of CPU-written vertex attributes.
const waterBeginNormal = /* glsl */ `
vec2 waterXZ = ( modelMatrix * vec4( position, 1.0 ) ).xz;
float waterHeight = waterHeightAt( waterXZ );
vec2 waterStepX = vec2( waterGrid.z, 0.0 );
vec2 waterStepZ = vec2( 0.0, waterGrid.z );
float waterSlopeX = ( waterHeightAt( waterXZ + waterStepX ) - waterHeightAt( waterXZ - waterStepX ) ) / ( 2.0 * waterGrid.z );
float waterSlopeZ = ( waterHeightAt( waterXZ + waterStepZ ) - waterHeightAt( waterXZ - waterStepZ ) ) / ( 2.0 * waterGrid.z );
vec3 objectNormal = normalize( vec3( -waterSlopeX, 1.0, -waterSlopeZ ) );
vWaterDepth = max( 0.0, waterHeight - waterBedAt( waterXZ ) );
vWaterFoam = waterFoamAt( waterXZ );
vWaterFlow = waterFlowAt( waterXZ );
`;

const waterFragmentPars = /* glsl */ `
${waterHeightPars}
uniform vec3 waterFoamColor;
varying float vWaterDepth;
varying float vWaterFoam;
varying vec2 vWaterFlow;
${waterOpticsPars}
${waterCrestPars}
${waterChopPars}
${foamPatternPars}
${causticLookupPars}
`;

/** The ripples' strength: 0.8 on calm water, 1 at the default chop. */
const rippleStrength = (chop: number) => 0.8 + (0.2 * chop) / DEFAULT_WATER_CHOP;

/** Supplies interleaved (height, foam) for every node of a uniform render grid. */
export interface SurfaceSource {
  readonly grid: SurfaceGrid;
  /** Simulation clock that animates the shading-only wind chop, s. */
  readonly time: number;
  write(data: Float32Array): void;
  /** Changes whenever `writeBed` would write different values. */
  readonly bedRevision: number;
  /** Bed elevation per grid node, m (negative below datum). */
  writeBed(data: Float32Array): void;
  /** Interleaved surface current (u, w) per grid node, m/s; without it the foam pattern stands still. */
  writeFlow?(data: Float32Array): void;
  /** Its bodies sample a Catmull-Rom surface over the render nodes (`PhysicalSurfWater`), which the Rich look draws (G8). */
  readonly cubic?: boolean;
}

export class WaterSurface {
  readonly mesh: Mesh<PlaneGeometry, MeshPhysicalMaterial>;
  /** G8: the dense patch drawn where the camera looks, in the Rich look (a child of `mesh`, same material). */
  readonly patch: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  /** Interleaved (height, foam) per grid node, uploaded as an RG float texture each frame. */
  surfaceData: Float32Array;
  /** Bed elevation per grid node, uploaded only when the source's bed changes. */
  bedData: Float32Array;
  /** Interleaved surface current (u, w) per grid node for the foam pattern; zero for sources without one. */
  flowData: Float32Array;
  private texture: DataTexture;
  private bedTexture: DataTexture;
  private flowTexture: DataTexture;
  private flowSource?: SurfaceSource;
  private flowFrames = 0;
  private bedSource?: SurfaceSource;
  private bedRevision = Number.NaN;
  private readonly uniforms: Record<string, { value: unknown }>;
  private detailedFoam = true;
  private currentLook: WaterLook = 'classic';
  /** Caustic map lighting the bed seen through the water (G5); off until a `CausticMap` draws into it. */
  readonly causticUniforms: CausticUniforms = createCausticUniforms();

  constructor(private source: SurfaceSource) {
    const grid = source.grid;
    this.surfaceData = new Float32Array(grid.nx * grid.nz * 2);
    this.texture = WaterSurface.createTexture(this.surfaceData, grid);
    this.bedData = new Float32Array(grid.nx * grid.nz);
    this.bedTexture = WaterSurface.createBedTexture(this.bedData, grid);
    this.flowData = new Float32Array(grid.nx * grid.nz * 2);
    this.flowTexture = WaterSurface.createTexture(this.flowData, grid);
    this.uniforms = {
      waterSurface: { value: this.texture },
      waterBed: { value: this.bedTexture },
      waterFlow: { value: this.flowTexture },
      waterFoamTile: { value: foamTileTexture() },
      waterFoamPattern: { value: 0 },
      waterGrid: { value: new Vector4(grid.xMin, grid.zMin, grid.spacing, 0) },
      waterGridSize: { value: new Vector2(grid.nx, grid.nz) },
      waterFoamColor: { value: new Color('#d8f2e9') },
      waterTime: { value: 0 },
      waterChop: { value: DEFAULT_WATER_CHOP },
      ...chopFieldUniforms,
      ...createOpticsUniforms(),
      ...this.causticUniforms,
      waterPatchRect: { value: new Vector4() },
      waterPatchActive: { value: 0 },
      waterRippleMap: { value: rippleTexture() },
      waterRippleStrength: { value: rippleStrength(DEFAULT_WATER_CHOP) },
      waterChurnMap: { value: churnTexture() },
    };
    // One air–water interface: Fresnel from n = 1.333 (F0 = 0.020), no clearcoat.
    const material = new MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: CLASSIC_ROUGHNESS,
      metalness: 0,
      ior: WATER_IOR,
      side: DoubleSide,
      flatShading: false,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      if (this.effectiveLook === 'rich') {
        // G8: the physics' Catmull-Rom surface, its normal per pixel.
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\n${waterVertexPars}\n${waterCubicPars}\n${richPatchVertexPars}`)
          .replace('#include <beginnormal_vertex>', richBeginNormal)
          .replace('#include <begin_vertex>', richVertexHeight);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${waterFragmentPars}\n${waterCubicPars}\n${richFragmentPars}\n${waterRipplePars}\n${waterSpecularPars}\n${waterStreakPars}\n${waterChurnPars}\n${richPatchFragmentPars}`)
          .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${richPatchDiscard}`)
          .replace('#include <normal_fragment_begin>', richNormalFragment({ ripples: true, churn: true }))
          .replace('#include <color_fragment>', '')
          .replace('#include <emissivemap_fragment>', waterBodyFragment(true, true, RICH_FOAM));
        return;
      }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${waterVertexPars}`)
        .replace('#include <beginnormal_vertex>', waterBeginNormal)
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position );\ntransformed.y = waterHeight;\nvWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${waterFragmentPars}`)
        .replace('#include <normal_fragment_begin>', waterChopNormal)
        .replace('#include <color_fragment>', '')
        .replace('#include <emissivemap_fragment>', waterBodyFragment(true, true));
    };
    material.customProgramCacheKey = () => `breakline-water-surface-${this.effectiveLook}`;
    // The coarse water lacks the patch's attributes; three feeds them from here, or they read a stale value.
    Object.assign(material, { defaultAttributeValues: { skirt: [0], onPatch: [0] } });
    this.mesh = new Mesh(WaterSurface.createGeometry(grid), material);
    this.mesh.frustumCulled = false;
    this.patch = new Mesh(createPatchGeometry(PATCH_SIZE, PATCH_SPACING), material);
    this.patch.frustumCulled = false;
    this.patch.visible = false;
    this.mesh.add(this.patch);
    // Both meshes place the patch from the camera about to draw them, so the answer never depends on draw order.
    const place = (camera: Camera) => this.placePatch(camera);
    this.mesh.onBeforeRender = (_renderer, _scene, camera) => place(camera);
    this.patch.onBeforeRender = (_renderer, _scene, camera) => place(camera);
    this.update();
  }

  get grid(): SurfaceGrid {
    return this.source.grid;
  }

  /** The surface, bed, grid and sun uniforms a caustic pass refracts through: the objects this mesh renders from. */
  get causticSource(): CausticSource {
    return this.uniforms as unknown as CausticSource;
  }

  /** Beam attenuation of the current water, m⁻¹ per channel (Beer–Lambert). */
  get attenuation(): { value: unknown } {
    return this.uniforms.waterAttenuation;
  }

  update(): void {
    this.source.write(this.surfaceData);
    const grid = this.source.grid;
    (this.uniforms.waterGrid.value as Vector4).set(grid.xMin, grid.zMin, grid.spacing, 0);
    this.uniforms.waterTime.value = this.source.time;
    this.mesh.position.set(grid.xMin + ((grid.nx - 1) * grid.spacing) / 2, 0, grid.zMin + ((grid.nz - 1) * grid.spacing) / 2);
    this.texture.needsUpdate = true;
    if (this.source !== this.bedSource || this.source.bedRevision !== this.bedRevision) {
      this.source.writeBed(this.bedData);
      this.bedSource = this.source;
      this.bedRevision = this.source.bedRevision;
      this.bedTexture.needsUpdate = true;
    }
    // The current changes slowly beside the 2 s flow-map period, so every other frame is enough.
    if (this.source.writeFlow && (this.flowSource !== this.source || (this.flowFrames += 1) % 2 === 0)) {
      this.source.writeFlow(this.flowData);
      this.flowTexture.needsUpdate = true;
    } else if (!this.source.writeFlow && this.flowSource !== this.source) {
      this.flowData.fill(0);
      this.flowTexture.needsUpdate = true;
    }
    this.flowSource = this.source;
    this.refreshFoamPattern();
    this.patch.receiveShadow = this.mesh.receiveShadow;
  }

  /** Graphics setting (G8): the Classic water, or the Rich look. */
  setLook(look: WaterLook): void {
    if (look === this.currentLook) return;
    this.currentLook = look;
    this.mesh.material.needsUpdate = true;
    this.refreshLook();
  }

  /** The patch shows, the coarse water gives way under it, and the water turns glossy, only in the Rich look drawn. */
  private refreshLook(): void {
    const rich = this.effectiveLook === 'rich';
    this.patch.visible = rich;
    this.uniforms.waterPatchActive.value = rich ? 1 : 0;
    this.mesh.material.roughness = rich ? RICH_BASE_ROUGHNESS : CLASSIC_ROUGHNESS;
  }

  private readonly patchCamera = new Vector3();
  private readonly patchDirection = new Vector3();

  private placePatch(camera: Camera): void {
    if (!this.patch.visible) return;
    camera.getWorldPosition(this.patchCamera);
    camera.getWorldDirection(this.patchDirection);
    const rect = patchRect({ x: this.patchCamera.x, z: this.patchCamera.z, dirX: this.patchDirection.x, dirZ: this.patchDirection.z }, this.source.grid);
    (this.uniforms.waterPatchRect.value as Vector4).set(rect.x0, rect.z0, rect.x1, rect.z1);
    this.patch.position.set((rect.x0 + rect.x1) / 2 - this.mesh.position.x, 0, (rect.z0 + rect.z1) / 2 - this.mesh.position.z);
    this.patch.scale.set((rect.x1 - rect.x0) / PATCH_SIZE, 1, (rect.z1 - rect.z0) / PATCH_SIZE);
    this.patch.updateMatrixWorld();
  }

  get look(): WaterLook {
    return this.currentLook;
  }

  /** The look drawn: Rich only for a source whose bodies ride the Catmull-Rom surface; the legacy wave stays Classic. */
  private get effectiveLook(): WaterLook {
    return this.currentLook === 'rich' && this.source.cubic ? 'rich' : 'classic';
  }

  /** Graphics setting (plan P8): Simple keeps the soft foam tint even on water with a current. */
  setFoamDetail(detailed: boolean): void {
    this.detailedFoam = detailed;
    this.refreshFoamPattern();
  }

  private refreshFoamPattern(): void {
    this.uniforms.waterFoamPattern.value = this.detailedFoam && this.source.writeFlow ? 1 : 0;
  }

  /** 1 when the foam is drawn as the flowing network (a source with a current), 0 for the legacy soft tint. */
  get foamPattern(): number {
    return this.uniforms.waterFoamPattern.value as number;
  }

  /** Water clarity and seabed colour for the current spot. */
  setOptics(optics: WaterOptics): void {
    applyOptics(this.uniforms, optics);
  }

  /** `direction` points toward the sun; `radiance` is the sun light's colour × intensity. */
  setSun(direction: Vector3, radiance: Color): void {
    applySun(this.uniforms, direction, radiance);
  }

  /** Strength of the shading-only wind chop (see waterChop.ts). */
  setChop(strength: number): void {
    this.uniforms.waterChop.value = strength;
    this.uniforms.waterRippleStrength.value = rippleStrength(strength);
  }

  /** Switch to another water source, rebuilding the mesh and texture if its grid differs. */
  setSource(source: SurfaceSource): void {
    const previous = this.source.grid;
    const wasLook = this.effectiveLook;
    this.source = source;
    if (this.effectiveLook !== wasLook) this.mesh.material.needsUpdate = true;
    this.refreshLook();
    const grid = source.grid;
    if (previous.nx === grid.nx && previous.nz === grid.nz && previous.spacing === grid.spacing) return;
    this.surfaceData = new Float32Array(grid.nx * grid.nz * 2);
    this.texture.dispose();
    this.texture = WaterSurface.createTexture(this.surfaceData, grid);
    this.uniforms.waterSurface.value = this.texture;
    this.bedData = new Float32Array(grid.nx * grid.nz);
    this.bedTexture.dispose();
    this.bedTexture = WaterSurface.createBedTexture(this.bedData, grid);
    this.uniforms.waterBed.value = this.bedTexture;
    this.flowData = new Float32Array(grid.nx * grid.nz * 2);
    this.flowTexture.dispose();
    this.flowTexture = WaterSurface.createTexture(this.flowData, grid);
    this.uniforms.waterFlow.value = this.flowTexture;
    this.flowSource = undefined;
    (this.uniforms.waterGridSize.value as Vector2).set(grid.nx, grid.nz);
    this.mesh.geometry.dispose();
    this.mesh.geometry = WaterSurface.createGeometry(grid);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.patch.geometry.dispose();
    this.texture.dispose();
    this.bedTexture.dispose();
    this.flowTexture.dispose();
    this.mesh.material.dispose();
  }

  private static createTexture(data: Float32Array, grid: SurfaceGrid): DataTexture {
    const texture = new DataTexture(data, grid.nx, grid.nz, RGFormat, FloatType);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  private static createBedTexture(data: Float32Array, grid: SurfaceGrid): DataTexture {
    const texture = new DataTexture(data, grid.nx, grid.nz, RedFormat, FloatType);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  /** Static vertices on the grid nodes, centred on the mesh origin; the vertex shader displaces them. */
  private static createGeometry(grid: SurfaceGrid): PlaneGeometry {
    const geometry = new PlaneGeometry((grid.nx - 1) * grid.spacing, (grid.nz - 1) * grid.spacing, grid.nx - 1, grid.nz - 1);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }
}
