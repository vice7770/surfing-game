import {
  BufferAttribute, BufferGeometry, Color, CustomBlending, DoubleSide, DynamicDrawUsage, Mesh, MeshPhysicalMaterial, OneFactor, OneMinusSrcAlphaFactor,
  ShaderMaterial, Vector3,
} from 'three';
import { BOARD_SHEET_STRIDE, SHEET_AT, SheetHistory, createSheetRow } from '../physics/boardSpray';
import { RICH_LIP_REFLECTION, richLipBeginVertex, richLipBody, richLipFragmentPars, richLipVertexPars } from './water/richLip';
import { RICH_WATER } from './water/richWaterGlsl';
import { RICH_SHEET_GLITTER, glitterProgramKey, onGlitterChange, richGlitterLights, waterGlitterPars } from './water/glitter';
import { RICH_BASE_ROUGHNESS } from './water/specular';
import type { WaterLook } from './water/waterLook';
import { WATER_IOR, applyOptics, applySun, createOpticsUniforms, type WaterOptics } from './waterOptics';

/**
 * The curtain's look along its flight (the water-physics advisor, 2026-10-30): clear and rough to about `fingering` of
 * the way to the tear, then rippling into fingers λ_f = 10πσ/(ρ_a U²) apart (Gaillard, Sijs & Bonn 2021's measured
 * prefactor; `fingersPerMetre`, clamped) that tear raggedly. Thin water passes most light face-on (two Fresnel faces,
 * about 2 % each; Pope & Fry): it reads by the sky's and sun's reflection, with `floor` of cover for readability (the
 * 2026-09-29 decision: physical optics with a readability minimum). Where the curtain reaches under `faint` m it fades
 * out, gone under `none` m (fast snaps throw drops at once).
 */
export const CURTAIN = { fingering: 0.55, minFingers: 8, maxFingers: 60, floor: 0.12, none: 0.08, faint: 0.15 } as const;
const GRAVITY = 9.81;
const CURTAIN_ROUGHNESS = 0.18;
/** A board's side that threw nothing for this long, s, is forgotten. */
const MISSING = 0.1;
/**
 * The Rich curtain's cover (after the lip's body): the light it does not let through, the water's Fresnel reflectance
 * at the view's angle, with the readability floor, and its fingers and tear.
 */
const curtainCoverGlsl = /* glsl */ `{
  vec3 curtainV = normalize( cameraPosition - vLipWorld );
  vec3 curtainN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  float curtainF = waterFresnel( abs( dot( curtainN, curtainV ) ) );
  diffuseColor.a = curtainCover * vFade * max( ${CURTAIN.floor.toFixed(2)}, curtainF );
  // Clear thin water: what shows through it is the scene behind (the blending), not the lip's light through it.
  totalEmissiveRadiance = vec3( 0.0 );
}`;
/** Each curtain is drawn as a grid: COLUMNS across its root, ROWS out along its flight to where it tears. */
const COLUMNS = 24;
const ROWS = 10;
/** Curtains drawn at most at once: the board's two sides and other players'. */
const CAPACITY = 8;
const PER_CURTAIN = (COLUMNS + 1) * (ROWS + 1);
const AIR_DENSITY = 1.2;
const SURFACE_TENSION = 0.072;

/** The fingers a curtain at `speed` m/s through the air tears into, per metre of its width. */
export function fingersPerMetre(speed: number): number {
  return Math.min(CURTAIN.maxFingers, Math.max(CURTAIN.minFingers, (AIR_DENSITY * speed * speed) / (10 * Math.PI * SURFACE_TENSION)));
}

/**
 * One curtain's points (spray-sheet, 2026-10-30): the water launched over the last `breakup` s, where it is now. A
 * drop launched τ ago left the root line the hull had then (`SheetHistory`) at the velocity it had then, and has flown
 * since: root_then(s) + v_then·τ − ½gτ². Into `out`; false with no history.
 */
export function curtainPoint(history: SheetHistory, key: string, now: number, s: number, age: number, out: Vector3): boolean {
  if (!history.at(key, now, age, row)) return false;
  const along = s * row.length;
  out.set(
    row.x + row.alongX * along + row.vx * age,
    row.y + row.vy * age - 0.5 * GRAVITY * age * age,
    row.z + row.alongZ * along + row.vz * age,
  );
  return true;
}
const row = createSheetRow();

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
attribute float curtainFade;
varying vec2 vCurtain;
varying float vFingers;
varying float vSeed;
varying float vFade;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vCurtain = curtain;
  vFingers = curtainFingers;
  vSeed = curtainSeed;
  vFade = curtainFade;
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
varying float vFade;
varying vec3 vNormal;
varying vec3 vWorld;
${curtainMaskGlsl}
void main() {
  float mask = curtainMask( vCurtain, vFingers, vSeed ) * vFade;
  if ( mask < 0.01 ) discard;
  vec3 view = normalize( cameraPosition - vWorld );
  float facing = abs( dot( normalize( vNormal ), view ) );
  float fresnel = 0.02 + 0.98 * pow( 1.0 - facing, 5.0 );
  float through = pow( max( dot( -view, normalize( sunDirection ) ), 0.0 ), 3.0 );
  vec3 body = mix( deepColor, glowColor, 0.45 + 0.55 * through );
  // Premultiplied: the sky it reflects and a little of the water's colour, over what it lets through.
  float cover = mask * max( ${CURTAIN.floor.toFixed(2)}, fresnel );
  gl_FragColor = vec4( mask * ( skyColor * fresnel + body * ${CURTAIN.floor.toFixed(2)} ), cover );
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
  private readonly fades = new Float32Array(CAPACITY * PER_CURTAIN);
  /** The root lines each board's sides launched from lately (`SheetHistory`): the curtain is that water now. */
  private readonly history = new SheetHistory();
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
      // Glass's blending: what it reflects added over what it lets through (premultiplied).
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
    });
    this.richUniforms.waterBodyGain.value = RICH_WATER.bodyGain;
    // Rougher than the lip: the curtain leaves the rail clear but rough and streaked, never mirror-glassy (the advisor).
    this.richMaterial = new MeshPhysicalMaterial({
      color: '#ffffff', roughness: Math.max(RICH_BASE_ROUGHNESS, CURTAIN_ROUGHNESS), metalness: 0, ior: WATER_IOR, side: DoubleSide, transparent: true,
      depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
    });
    this.richMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.richUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${richLipVertexPars}\nattribute vec2 curtain;\nattribute float curtainFingers;\nattribute float curtainSeed;\nattribute float curtainFade;\nvarying vec2 vCurtain;\nvarying float vFingers;\nvarying float vSeed;\nvarying float vFade;`)
        .replace('#include <begin_vertex>', `${richLipBeginVertex}\nvCurtain = curtain;\nvFingers = curtainFingers;\nvSeed = curtainSeed;\nvFade = curtainFade;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${richLipFragmentPars}\n${waterGlitterPars}\nvarying vec2 vCurtain;\nvarying float vFingers;\nvarying float vSeed;\nvarying float vFade;\n${curtainMaskGlsl}`)
        .replace('#include <color_fragment>', 'float curtainCover = curtainMask( vCurtain, vFingers, vSeed );\nif ( curtainCover < 0.01 ) discard;')
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>${RICH_SHEET_GLITTER}`)
        // The lip's thin-water body, then the curtain's own cover: a few millimetres of water, mostly the sky's and
        // sun's reflection and the light through it.
        .replace('#include <emissivemap_fragment>', `${richLipBody}\nwaterGlitterCover = vLipFoam;\n${curtainCoverGlsl}`)
        // Premultiplied (glass's blending): what it reflects and scatters, over what it lets through.
        .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb *= curtainCover;')
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
    geometry.setAttribute('curtainFade', new BufferAttribute(this.fades, 1).setUsage(DynamicDrawUsage));
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
   * This frame's curtains at sea time `now`: `count` packed sheets of the player's board (`BOARD_SHEET_STRIDE` each),
   * moved by `offset` (the drawn board's place less the snapshot's), then `others` (other players' sheets, as drawn).
   * Each side of each board is a curtain where it tears (`breakup` over 0), drawn from the rows it launched lately.
   */
  update(now: number, sheets: ArrayLike<number>, count: number, offset: Vector3, others?: ArrayLike<number>): void {
    const keys: { source: ArrayLike<number>; o: number; key: string; moved: boolean }[] = [];
    const feed = (source: ArrayLike<number>, o: number, moved: boolean) => {
      const key = `${source[o + SHEET_AT.source]}:${source[o + SHEET_AT.side]}`;
      this.history.pushPacked(key, now, source, o);
      keys.push({ source, o, key, moved });
    };
    for (let n = 0; n < count; n += 1) feed(sheets, n * BOARD_SHEET_STRIDE, true);
    if (others) for (let o = 0; o + BOARD_SHEET_STRIDE <= others.length; o += BOARD_SHEET_STRIDE) feed(others, o, false);
    this.history.prune(now, MISSING);
    let drawn = 0;
    for (const { source, o, key, moved } of keys) {
      if (drawn >= CAPACITY) break;
      const breakup = source[o + SHEET_AT.breakup];
      if (!(breakup > 0) || !(source[o + SHEET_AT.thickness] > 0)) continue;
      // How far it reaches before it tears: under CURTAIN.none it is drops at once, fading in to CURTAIN.faint.
      const relative = Math.hypot(
        source[o + SHEET_AT.vx] - source[o + SHEET_AT.boardX], source[o + SHEET_AT.vy] - source[o + SHEET_AT.boardY],
        source[o + SHEET_AT.vz] - source[o + SHEET_AT.boardZ],
      );
      const fade = Math.min(1, Math.max(0, (relative * breakup - CURTAIN.none) / (CURTAIN.faint - CURTAIN.none)));
      if (!(fade > 0)) continue;
      const flight = Math.min(breakup, this.history.span(key, now));
      const base = drawn * PER_CURTAIN;
      const fingers = Math.max(3, Math.round(fingersPerMetre(Math.hypot(source[o + SHEET_AT.vx], source[o + SHEET_AT.vy], source[o + SHEET_AT.vz])) * source[o + SHEET_AT.length]));
      // A seed per board's side, so its fingers hold still.
      const seed = (source[o + SHEET_AT.side] > 0 ? 1.7 : 0.4) + source[o + SHEET_AT.source] * 2.3;
      const dx = moved ? offset.x : 0;
      const dy = moved ? offset.y : 0;
      const dz = moved ? offset.z : 0;
      const rootWidth = source[o + SHEET_AT.length];
      const rootThickness = source[o + SHEET_AT.thickness];
      for (let j = 0; j <= ROWS; j += 1) {
        const age = (j / ROWS) * flight;
        // The row this water left from (`curtainPoint`, the row looked up once for all its columns).
        this.history.at(key, now, age, row);
        const fall = 0.5 * GRAVITY * age * age;
        for (let i = 0; i <= COLUMNS; i += 1) {
          const v = base + j * (COLUMNS + 1) + i;
          const along = (i / COLUMNS) * row.length;
          this.positions[v * 3] = row.x + row.alongX * along + row.vx * age + dx;
          this.positions[v * 3 + 1] = row.y + row.vy * age - fall + dy;
          this.positions[v * 3 + 2] = row.z + row.alongZ * along + row.vz * age + dz;
          this.curtain[v * 2] = i / COLUMNS;
          this.curtain[v * 2 + 1] = age / breakup;
          this.fingers[v] = fingers;
          this.seeds[v] = seed;
          this.fades[v] = fade;
        }
        // Its water spread over the row's width now: thinner where the turn fanned it out.
        const first = (base + j * (COLUMNS + 1)) * 3;
        const last = first + COLUMNS * 3;
        const width = Math.hypot(this.positions[last] - this.positions[first], this.positions[last + 2] - this.positions[first + 2]);
        const thickness = (rootThickness * rootWidth) / Math.max(rootWidth * 0.5, width);
        for (let i = 0; i <= COLUMNS; i += 1) this.thickness[base + j * (COLUMNS + 1) + i] = thickness;
      }
      this.normalsOf(base);
      drawn += 1;
    }
    this.drawn = drawn;
    const geometry = this.mesh.geometry;
    geometry.setDrawRange(0, drawn * COLUMNS * ROWS * 6);
    if (drawn === 0) return;
    for (const name of ['position', 'normal', 'curtain', 'thickness', 'curtainFingers', 'curtainSeed', 'curtainFade']) {
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
