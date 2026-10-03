import { BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshPhysicalMaterial, ShaderMaterial, Vector3 } from 'three';
import { LINK_TIME } from '../wave/PlungingLip';
import { LIP_STRIDE } from '../wave/SurfZoneRunner';
import { LIP_SUBDIVISIONS, RICH_LIP_REFLECTION, buildRichLipSheet, richLipBeginVertex, richLipBody, richLipFragmentPars, richLipVertexPars } from './water/richLip';
import { RICH_WATER } from './water/richWaterGlsl';
import { RICH_BASE_ROUGHNESS } from './water/specular';
import type { WaterLook } from './water/waterLook';
import { WATER_IOR, applyOptics, applySun, createOpticsUniforms, type WaterOptics } from './waterOptics';

/** Lip water whitens to foam over this long in the air, s. */
const FOAM_AGE = 0.6;

export interface LipSheetGeometry {
  positions: Float32Array;
  /** 0 clear water … 1 foam, per vertex. */
  foam: Float32Array;
  indices: Uint32Array;
}

interface Strip {
  column: number;
  launchTime: number;
  /** Vertex of each parcel along the strip, or −1. */
  at: number[];
}

/**
 * The lip sheet's surface from the snapshot's parcels (plan P7): x, y, z,
 * world column, index along the strip, launch time and age (`LIP_STRIDE`).
 * The parcels are its vertices. Strips of neighbouring columns thrown within
 * LINK_TIME of each other are joined across, parcel k to k, as the lip's
 * links are; a strip's side with no such neighbour gets a half-column ribbon,
 * so the sheet is as wide as the columns that threw it. Strips break where
 * parcels have landed.
 */
export function buildLipSheet(parcels: Float32Array, count: number, width: number): LipSheetGeometry {
  const strips = new Map<string, Strip>();
  const positions: number[] = [];
  const foam: number[] = [];
  const indices: number[] = [];
  const vertex = (x: number, y: number, z: number, white: number) => {
    positions.push(x, y, z);
    foam.push(white);
    return positions.length / 3 - 1;
  };
  for (let i = 0; i < count; i += 1) {
    const o = i * LIP_STRIDE;
    const column = parcels[o + 3];
    const index = parcels[o + 4];
    const launchTime = parcels[o + 5];
    // The splash-up (G9) is whitewater, drawn in Rich only: Classic draws the lip as it always has.
    if (parcels[o + 8] !== 0) continue;
    const key = `${column}|${launchTime}`;
    let strip = strips.get(key);
    if (!strip) {
      strip = { column, launchTime, at: [] };
      strips.set(key, strip);
    }
    const white = Math.max(Math.min(1, parcels[o + 6] / FOAM_AGE), index === 0 ? 1 : 0);
    strip.at[index] = vertex(parcels[o], parcels[o + 1], parcels[o + 2], white);
  }
  const byColumn = new Map<number, Strip[]>();
  for (const strip of strips.values()) {
    const list = byColumn.get(strip.column);
    if (list) list.push(strip);
    else byColumn.set(strip.column, [strip]);
  }
  const linked = (strip: Strip, side: number) => (byColumn.get(strip.column + side) ?? []).find((other) => Math.abs(other.launchTime - strip.launchTime) < LINK_TIME);
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, c, b, d, c);
  const present = (strip: Strip, k: number) => strip.at[k] !== undefined && strip.at[k] >= 0;
  for (const strip of strips.values()) {
    const length = strip.at.length;
    for (const side of [-1, 1]) {
      const neighbour = linked(strip, side);
      if (neighbour) {
        // Join across once, from the strip on the left.
        if (side === 1) {
          for (let k = 0; k + 1 < length; k += 1) {
            if (present(strip, k) && present(strip, k + 1) && present(neighbour, k) && present(neighbour, k + 1)) {
              quad(strip.at[k], strip.at[k + 1], neighbour.at[k], neighbour.at[k + 1]);
            }
          }
        }
        continue;
      }
      // A half-column ribbon on the open side.
      const edge: number[] = [];
      for (let k = 0; k < length; k += 1) {
        if (!present(strip, k)) continue;
        const v = strip.at[k];
        edge[k] = vertex(positions[v * 3] + (side * width) / 2, positions[v * 3 + 1], positions[v * 3 + 2], foam[v]);
      }
      for (let k = 0; k + 1 < length; k += 1) {
        if (present(strip, k) && present(strip, k + 1)) quad(strip.at[k], strip.at[k + 1], edge[k], edge[k + 1]);
      }
    }
  }
  return { positions: new Float32Array(positions), foam: new Float32Array(foam), indices: new Uint32Array(indices) };
}

const vertexShader = /* glsl */ `
attribute float foam;
varying float vFoam;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vFoam = foam;
  vNormal = normalize( normal );
  vec4 world = modelMatrix * vec4( position, 1.0 );
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 sunDirection;
uniform vec3 skyColor;
uniform vec3 deepColor;
uniform vec3 glowColor;
uniform vec3 foamColor;
varying float vFoam;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec3 view = normalize( cameraPosition - vWorld );
  float facing = abs( dot( normalize( vNormal ), view ) );
  // Fresnel for an air-water surface (F0 = 0.02).
  float fresnel = 0.02 + 0.98 * pow( 1.0 - facing, 5.0 );
  // Sunlight through a thin lip glows when the sun is behind it.
  float through = pow( max( dot( -view, normalize( sunDirection ) ), 0.0 ), 3.0 );
  vec3 body = mix( deepColor, glowColor, 0.35 + 0.65 * through );
  vec3 color = mix( body, skyColor, fresnel );
  color = mix( color, foamColor, vFoam * vFoam );
  gl_FragColor = vec4( color, mix( 0.82, 0.96, vFoam ) );
}
`;

/**
 * Draws the physical mode's lip sheet (plan P7): the surface `buildLipSheet`
 * makes from the snapshot's parcels, shaded as thin water (Fresnel, light
 * through the lip, foam as it ages).
 */
export class LipSheetMesh {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial | MeshPhysicalMaterial>;
  /** G9: the lip in the Rich look, lit like the Rich water (its sky, sun and optics). */
  readonly richMaterial: MeshPhysicalMaterial;
  private readonly classicMaterial: ShaderMaterial;
  private readonly richUniforms: Record<string, { value: unknown }> = {
    ...createOpticsUniforms(),
    waterReflection: { value: RICH_WATER.reflection },
    lipFoamColor: { value: new Color('#d8f2e9') },
  };
  private currentLook: WaterLook = 'classic';
  /** What the drawn sheet was built from: its parcels' buffer, count and a sum of them (G9: rebuild only on a new snapshot). */
  private built = { parcels: undefined as Float32Array | undefined, count: -1, sum: 0 };
  /** Spline points the Rich sheet draws between parcels (the Particles setting draws fewer at its lower levels). */
  private subdivisions = LIP_SUBDIVISIONS;
  /** A swept spot's splash-up parcels, gathered from a snapshot (PR 5). */
  private splashes = new Float32Array(0);

  constructor() {
    const material = new ShaderMaterial({
      uniforms: {
        sunDirection: { value: new Vector3(0.3, 0.6, -0.7).normalize() },
        skyColor: { value: new Color('#bcd9e6') },
        deepColor: { value: new Color('#1d6b72') },
        glowColor: { value: new Color('#52d1bf') },
        foamColor: { value: new Color('#eef9f6') },
      },
      vertexShader,
      fragmentShader,
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    this.classicMaterial = material;
    this.richUniforms.waterBodyGain.value = RICH_WATER.bodyGain;
    this.richMaterial = new MeshPhysicalMaterial({
      color: '#ffffff', roughness: RICH_BASE_ROUGHNESS, metalness: 0, ior: WATER_IOR, side: DoubleSide, transparent: true, depthWrite: false,
    });
    this.richMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.richUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${richLipVertexPars}`)
        .replace('#include <begin_vertex>', richLipBeginVertex);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${richLipFragmentPars}`)
        .replace('#include <color_fragment>', '')
        .replace('#include <emissivemap_fragment>', richLipBody)
        .replace('#include <lights_fragment_maps>', RICH_LIP_REFLECTION);
    };
    this.richMaterial.customProgramCacheKey = () => 'breakline-lip-rich';
    this.mesh = new Mesh(new BufferGeometry(), material);
    this.mesh.frustumCulled = false;
  }

  /** Graphics setting (G9): the Classic sheet, or the Rich lip. */
  setLook(look: WaterLook): void {
    this.currentLook = look;
    this.built.count = -1;
    this.mesh.material = look === 'rich' ? this.richMaterial : this.classicMaterial;
  }

  get look(): WaterLook {
    return this.currentLook;
  }

  /** The Particles setting: the Rich sheet's spline points between parcels, from its next build. Its parcels, the lip's water, are untouched. */
  setSubdivisions(subdivisions: number): void {
    if (subdivisions === this.subdivisions) return;
    this.subdivisions = subdivisions;
    this.built.count = -1;
  }

  /** `direction` points toward the sun; `radiance` is the sun light's colour × intensity (the Rich lip). */
  setSun(direction: Vector3, radiance: Color): void {
    applySun(this.richUniforms, direction, radiance);
  }

  /** The spot's water optics (the Rich lip's body and the light through it). */
  setOptics(optics: WaterOptics): void {
    applyOptics(this.richUniforms, optics);
    this.richUniforms.waterBodyGain.value = RICH_WATER.bodyGain;
  }

  /**
   * Rebuild the sheet from `count` parcels of a snapshot, with columns `width` m wide. At a swept spot (`splashOnly`) the
   * barrel draws the jet, so the sheet is the splash-ups' alone (the Padang Padang spec, Part B, PR 5; the advisor,
   * 2026-10-01): drawn in Rich as at every spot, and so nothing in Classic.
   */
  update(parcels: Float32Array, count: number, width: number, splashOnly = false): void {
    if (splashOnly) {
      if (this.splashes.length < count * LIP_STRIDE) this.splashes = new Float32Array(count * LIP_STRIDE);
      let kept = 0;
      for (let i = 0; i < count; i += 1) {
        if (parcels[i * LIP_STRIDE + 8] !== 1) continue;
        this.splashes.set(parcels.subarray(i * LIP_STRIDE, (i + 1) * LIP_STRIDE), kept * LIP_STRIDE);
        kept += 1;
      }
      parcels = this.splashes;
      count = kept;
    }
    // The page draws several frames per snapshot: rebuild only when the parcels changed.
    let sum = 0;
    for (let k = 0; k < count * LIP_STRIDE; k += 1) sum += parcels[k];
    if (parcels === this.built.parcels && count === this.built.count && sum === this.built.sum) return;
    this.built = { parcels, count, sum };
    if (this.currentLook === 'rich') {
      const lip = buildRichLipSheet(parcels, count, width, this.subdivisions);
      const geometry = this.mesh.geometry;
      geometry.setAttribute('position', new BufferAttribute(lip.positions, 3));
      geometry.setAttribute('normal', new BufferAttribute(lip.normals, 3));
      geometry.setAttribute('foam', new BufferAttribute(lip.foam, 1));
      geometry.setAttribute('thickness', new BufferAttribute(lip.thickness, 1));
      geometry.setIndex(new BufferAttribute(lip.indices, 1));
      return;
    }
    const sheet = buildLipSheet(parcels, count, width);
    const geometry = this.mesh.geometry;
    geometry.setAttribute('position', new BufferAttribute(sheet.positions, 3));
    geometry.setAttribute('foam', new BufferAttribute(sheet.foam, 1));
    geometry.setIndex(new BufferAttribute(sheet.indices, 1));
    if (sheet.indices.length > 0) geometry.computeVertexNormals();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.classicMaterial.dispose();
    this.richMaterial.dispose();
  }
}
