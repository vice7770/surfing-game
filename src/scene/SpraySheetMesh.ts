import { BufferAttribute, BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Mesh, MeshPhysicalMaterial, ShaderMaterial, Vector3 } from 'three';
import { BOARD_SHEET_STRIDE } from '../physics/boardSpray';
import { RICH_LIP_REFLECTION, richLipBeginVertex, richLipBody, richLipFragmentPars, richLipVertexPars } from './water/richLip';
import { RICH_WATER } from './water/richWaterGlsl';
import { RICH_SHEET_GLITTER, glitterProgramKey, onGlitterChange, richGlitterLights, waterGlitterPars } from './water/glitter';
import { RICH_BASE_ROUGHNESS } from './water/specular';
import type { WaterLook } from './water/waterLook';
import { WATER_IOR, applyOptics, applySun, createOpticsUniforms, type WaterOptics } from './waterOptics';

const GRAVITY = 9.81;
/** Each curtain is drawn as a grid: COLUMNS across its root, ROWS out along its flight to where it tears. */
const COLUMNS = 24;
const ROWS = 10;
/** Curtains drawn at most at once: the board's two sides and other players'. */
const CAPACITY = 8;
const PER_CURTAIN = (COLUMNS + 1) * (ROWS + 1);
/**
 * Where the curtain starts to finger into ligaments, as a share of its flight to the tear, and how many fingers it
 * tears into per metre of its width there (spray-sheet; PROVISIONAL, the advisor's ruling).
 */
export const CURTAIN = { fingering: 0.45, fingersPerMetre: 30 } as const;

/**
 * One curtain's points (spray-sheet, 2026-10-30): the water launched from the root over the last `breakup` s, where it
 * is now. A drop launched τ ago left the hull when it was τ further back along its path and has flown since, so the
 * curtain stands at root(s) + (v − v_hull)·τ − ½gτ², widened along the root by its fan. Each point's place across
 * (0–1) and out (τ over the flight to the tear), and the water's thickness there.
 */
export function curtainPoint(sheet: ArrayLike<number>, o: number, s: number, t: number, out: Vector3): number {
  const length = sheet[o + 5];
  const relativeX = sheet[o + 6] - sheet[o + 13];
  const relativeY = sheet[o + 7] - sheet[o + 14];
  const relativeZ = sheet[o + 8] - sheet[o + 15];
  const speed = Math.hypot(relativeX, relativeY, relativeZ);
  const tau = t * sheet[o + 18];
  const spread = 2 * Math.tan(sheet[o + 17]) * speed * tau;
  const along = s * length + (s - 0.5) * spread;
  out.set(
    sheet[o] + sheet[o + 3] * along + relativeX * tau,
    sheet[o + 1] + relativeY * tau - 0.5 * GRAVITY * tau * tau,
    sheet[o + 2] + sheet[o + 4] * along + relativeZ * tau,
  );
  // Thinner as it fans out (its water spread over a wider sheet).
  return sheet[o + 16] * (length / Math.max(1e-3, length + spread));
}

/** The curtain's fingering and its ragged tear (both looks): the share of the sheet left at (s across, t out). */
const curtainMaskGlsl = /* glsl */ `
float curtainHash( float n ) { return fract( sin( n ) * 43758.5453 ); }
float curtainMask( vec2 c, float fingers, float seed ) {
  float s = c.x;
  float t = c.y;
  // The sides fray from the root, more the further out.
  float side = smoothstep( 0.0, 0.04 + 0.12 * t, s ) * smoothstep( 0.0, 0.04 + 0.12 * t, 1.0 - s );
  // Past the fingering's start the sheet thins into ligaments: gaps open between fingers, wider toward the tear, each
  // finger a little longer or shorter than its neighbours.
  float lane = s * fingers + seed;
  float which = floor( lane );
  float within = abs( fract( lane ) - 0.5 ) * 2.0;
  float reach = 0.85 + 0.3 * curtainHash( which * 12.9898 + seed );
  float open = smoothstep( ${CURTAIN.fingering.toFixed(2)}, 1.0, t / reach );
  float finger = 1.0 - smoothstep( 1.0 - open * 1.2, 1.15 - open, within );
  // Gone at the tear (where the drops take over).
  float tear = 1.0 - smoothstep( 0.82, 1.0, t / reach );
  return side * finger * tear;
}`;

const classicVertex = /* glsl */ `
attribute vec2 curtain;
attribute float curtainFingers;
attribute float curtainSeed;
varying vec2 vCurtain;
varying float vFingers;
varying float vSeed;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vCurtain = curtain;
  vFingers = curtainFingers;
  vSeed = curtainSeed;
  vNormal = normalize( normal );
  vec4 world = modelMatrix * vec4( position, 1.0 );
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const classicFragment = /* glsl */ `
uniform vec3 sunDirection;
uniform vec3 skyColor;
uniform vec3 deepColor;
uniform vec3 glowColor;
varying vec2 vCurtain;
varying float vFingers;
varying float vSeed;
varying vec3 vNormal;
varying vec3 vWorld;
${curtainMaskGlsl}
void main() {
  float mask = curtainMask( vCurtain, vFingers, vSeed );
  if ( mask < 0.01 ) discard;
  vec3 view = normalize( cameraPosition - vWorld );
  float facing = abs( dot( normalize( vNormal ), view ) );
  float fresnel = 0.02 + 0.98 * pow( 1.0 - facing, 5.0 );
  float through = pow( max( dot( -view, normalize( sunDirection ) ), 0.0 ), 3.0 );
  vec3 body = mix( deepColor, glowColor, 0.45 + 0.55 * through );
  gl_FragColor = vec4( mix( body, skyColor, fresnel ), mask * mix( 0.35, 0.85, fresnel ) );
}`;

/**
 * The boards' spray sheets drawn as curtains of water (spray-sheet, 2026-10-30): a thin, see-through sheet from each
 * root out to where it tears into the drops `SprayCloud` throws from there. In Rich it is lit as the Rich lip is (its
 * sky, sun, glitter and optics: thin water); in Classic as the Classic lip sheet is. Its fingers and ragged tear are the
 * shader's (`curtainMask`). Rebuilt each frame from the snapshot's sheets, carried with the drawn board.
 */
export class SpraySheetMesh {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial | MeshPhysicalMaterial>;
  readonly richMaterial: MeshPhysicalMaterial;
  private readonly classicMaterial: ShaderMaterial;
  private readonly richUniforms: Record<string, { value: unknown }> = {
    ...createOpticsUniforms(),
    waterReflection: { value: RICH_WATER.reflection },
    lipFoamColor: { value: new Color('#d8f2e9') },
  };
  private currentLook: WaterLook = 'classic';
  private readonly positions = new Float32Array(CAPACITY * PER_CURTAIN * 3);
  private readonly normals = new Float32Array(CAPACITY * PER_CURTAIN * 3);
  private readonly curtain = new Float32Array(CAPACITY * PER_CURTAIN * 2);
  private readonly thickness = new Float32Array(CAPACITY * PER_CURTAIN);
  private readonly foam = new Float32Array(CAPACITY * PER_CURTAIN);
  private readonly fingers = new Float32Array(CAPACITY * PER_CURTAIN);
  private readonly seeds = new Float32Array(CAPACITY * PER_CURTAIN);
  private readonly point = new Vector3();
  /** Curtains drawn this frame. */
  drawn = 0;

  constructor() {
    this.classicMaterial = new ShaderMaterial({
      uniforms: {
        sunDirection: { value: new Vector3(0.3, 0.6, -0.7).normalize() },
        skyColor: { value: new Color('#bcd9e6') },
        deepColor: { value: new Color('#1d6b72') },
        glowColor: { value: new Color('#52d1bf') },
      },
      vertexShader: classicVertex,
      fragmentShader: classicFragment,
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    this.richUniforms.waterBodyGain.value = RICH_WATER.bodyGain;
    this.richMaterial = new MeshPhysicalMaterial({
      color: '#ffffff', roughness: RICH_BASE_ROUGHNESS, metalness: 0, ior: WATER_IOR, side: DoubleSide, transparent: true, depthWrite: false,
    });
    this.richMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.richUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${richLipVertexPars}\nattribute vec2 curtain;\nattribute float curtainFingers;\nattribute float curtainSeed;\nvarying vec2 vCurtain;\nvarying float vFingers;\nvarying float vSeed;`)
        .replace('#include <begin_vertex>', `${richLipBeginVertex}\nvCurtain = curtain;\nvFingers = curtainFingers;\nvSeed = curtainSeed;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${richLipFragmentPars}\n${waterGlitterPars}\nvarying vec2 vCurtain;\nvarying float vFingers;\nvarying float vSeed;\n${curtainMaskGlsl}`)
        .replace('#include <color_fragment>', 'float curtainCover = curtainMask( vCurtain, vFingers, vSeed );\nif ( curtainCover < 0.01 ) discard;')
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>${RICH_SHEET_GLITTER}`)
        // The lip's thin-water body, then the curtain's own cover: a few millimetres of water, mostly the sky's and
        // sun's reflection and the light through it.
        .replace('#include <emissivemap_fragment>', `${richLipBody}\nwaterGlitterCover = vLipFoam;\ndiffuseColor.a = curtainCover * mix( 0.3, 0.6, 1.0 - exp( -60.0 * vLipThickness ) );`)
        .replace('#include <lights_fragment_maps>', RICH_LIP_REFLECTION)
        .replace('#include <lights_physical_pars_fragment>', richGlitterLights(true));
    };
    this.richMaterial.customProgramCacheKey = () => `breakline-spray-curtain-rich${glitterProgramKey()}`;
    onGlitterChange(() => {
      this.richMaterial.needsUpdate = true;
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('normal', new BufferAttribute(this.normals, 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('curtain', new BufferAttribute(this.curtain, 2).setUsage(DynamicDrawUsage));
    geometry.setAttribute('thickness', new BufferAttribute(this.thickness, 1).setUsage(DynamicDrawUsage));
    geometry.setAttribute('foam', new BufferAttribute(this.foam, 1));
    geometry.setAttribute('curtainFingers', new BufferAttribute(this.fingers, 1).setUsage(DynamicDrawUsage));
    geometry.setAttribute('curtainSeed', new BufferAttribute(this.seeds, 1).setUsage(DynamicDrawUsage));
    const indices = new Uint32Array(CAPACITY * COLUMNS * ROWS * 6);
    let n = 0;
    for (let c = 0; c < CAPACITY; c += 1) {
      for (let j = 0; j < ROWS; j += 1) {
        for (let i = 0; i < COLUMNS; i += 1) {
          const a = c * PER_CURTAIN + j * (COLUMNS + 1) + i;
          const b = a + 1;
          const d = a + COLUMNS + 1;
          indices.set([a, d, b, b, d, d + 1], n);
          n += 6;
        }
      }
    }
    geometry.setIndex(new BufferAttribute(indices, 1));
    geometry.setDrawRange(0, 0);
    this.mesh = new Mesh(geometry, this.classicMaterial);
    this.mesh.frustumCulled = false;
  }

  setLook(look: WaterLook): void {
    this.currentLook = look;
    this.mesh.material = look === 'rich' ? this.richMaterial : this.classicMaterial;
  }

  get look(): WaterLook {
    return this.currentLook;
  }

  setSun(direction: Vector3, radiance: Color): void {
    applySun(this.richUniforms, direction, radiance);
    (this.classicMaterial.uniforms.sunDirection.value as Vector3).copy(direction);
  }

  setOptics(optics: WaterOptics): void {
    applyOptics(this.richUniforms, optics);
    this.richUniforms.waterBodyGain.value = RICH_WATER.bodyGain;
  }

  /**
   * This frame's curtains: `count` packed sheets (`BOARD_SHEET_STRIDE` each) moved by `offset` (the drawn board's place
   * less the snapshot's), then `others` (other players' sheets, as drawn), each a curtain only where it tears (`breakup`
   * over 0).
   */
  update(sheets: ArrayLike<number>, count: number, offset: Vector3, others?: ArrayLike<number>): void {
    let drawn = 0;
    const add = (source: ArrayLike<number>, o: number, dx: number, dy: number, dz: number) => {
      if (drawn >= CAPACITY || !(source[o + 18] > 0) || !(source[o + 16] > 0)) return;
      const base = drawn * PER_CURTAIN;
      const width = source[o + 5];
      const fingers = Math.max(3, Math.round(CURTAIN.fingersPerMetre * width));
      // A seed per curtain (its order this frame: each board's sides keep theirs), so its fingers hold still.
      const seed = drawn * 1.7;
      for (let j = 0; j <= ROWS; j += 1) {
        const t = j / ROWS;
        for (let i = 0; i <= COLUMNS; i += 1) {
          const s = i / COLUMNS;
          const v = base + j * (COLUMNS + 1) + i;
          this.thickness[v] = curtainPoint(source, o, s, t, this.point);
          this.positions[v * 3] = this.point.x + dx;
          this.positions[v * 3 + 1] = this.point.y + dy;
          this.positions[v * 3 + 2] = this.point.z + dz;
          this.curtain[v * 2] = s;
          this.curtain[v * 2 + 1] = t;
          this.fingers[v] = fingers;
          this.seeds[v] = seed;
        }
      }
      this.normalsOf(base);
      drawn += 1;
    };
    for (let n = 0; n < count; n += 1) add(sheets, n * BOARD_SHEET_STRIDE, offset.x, offset.y, offset.z);
    if (others) for (let o = 0; o + BOARD_SHEET_STRIDE <= others.length; o += BOARD_SHEET_STRIDE) add(others, o, 0, 0, 0);
    this.drawn = drawn;
    const geometry = this.mesh.geometry;
    geometry.setDrawRange(0, drawn * COLUMNS * ROWS * 6);
    if (drawn === 0) return;
    for (const name of ['position', 'normal', 'curtain', 'thickness', 'curtainFingers', 'curtainSeed']) {
      const attribute = geometry.getAttribute(name) as BufferAttribute;
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, drawn * PER_CURTAIN * attribute.itemSize);
      attribute.needsUpdate = true;
    }
  }

  /** The curtain's normals from its grid: across × out at each point, from its neighbours (one-sided at its edges). */
  private normalsOf(base: number): void {
    const p = this.positions;
    const n = this.normals;
    const at = (i: number, j: number) => (base + j * (COLUMNS + 1) + i) * 3;
    for (let j = 0; j <= ROWS; j += 1) {
      for (let i = 0; i <= COLUMNS; i += 1) {
        const a = at(Math.max(0, i - 1), j);
        const b = at(Math.min(COLUMNS, i + 1), j);
        const c = at(i, Math.max(0, j - 1));
        const d = at(i, Math.min(ROWS, j + 1));
        const sx = p[b] - p[a]; const sy = p[b + 1] - p[a + 1]; const sz = p[b + 2] - p[a + 2];
        const tx = p[d] - p[c]; const ty = p[d + 1] - p[c + 1]; const tz = p[d + 2] - p[c + 2];
        let nx = sy * tz - sz * ty;
        let ny = sz * tx - sx * tz;
        let nz = sx * ty - sy * tx;
        const length = Math.hypot(nx, ny, nz) || 1;
        nx /= length; ny /= length; nz /= length;
        const o = at(i, j);
        n[o] = nx; n[o + 1] = ny; n[o + 2] = nz;
      }
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.classicMaterial.dispose();
    this.richMaterial.dispose();
  }
}
