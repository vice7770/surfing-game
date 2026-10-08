import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Mesh, ShaderChunk, Uint8BufferAttribute, type MeshPhysicalMaterial } from 'three';
import type { FarFieldProfile } from '../wave/FarFieldProfile';
import type { SurfaceGrid, WaterSurface } from './WaterSurface';

/**
 * How far under the lower of the two surfaces the curtain hangs, m (P): the far ocean's mesh, its rim vertices about
 * 4 m apart, strays a few centimetres from its exact surface between them; under the margin the curtain never shows
 * below the water, as a wall seen from under it.
 */
export const CURTAIN_MARGIN = 0.25;

/** The tank's water, as dry as the far ocean draws dry land: just under the bed, m. */
const FAR_DRY_DEPTH = 0.05;

/** The far ocean the tank meets: its profile, and the x that splits its two sides (its hole's centre, as its shader's). */
export interface CurtainFar {
  profile: FarFieldProfile;
  centerX: number;
}

/**
 * The tank's open edges, as one path of render nodes (j·nx + i): the −x edge from the shore out to the offshore corner,
 * the offshore edge across, and the +x edge back to the shore. The shore edge meets the beach: no far ocean lies beyond.
 */
export function curtainNodes(grid: SurfaceGrid): Int32Array {
  const { nx, nz } = grid;
  const nodes = new Int32Array(nz + (nx - 1) + (nz - 1));
  let k = 0;
  for (let j = nz - 1; j >= 0; j -= 1) nodes[k++] = j * nx;
  for (let i = 1; i < nx; i += 1) nodes[k++] = i;
  for (let j = 1; j < nz; j += 1) nodes[k++] = j * nx + nx - 1;
  return nodes;
}

/**
 * Each node's curtain, two heights per node (top, bottom): from the higher of the tank's water there and the far
 * ocean's down to the lower's, and CURTAIN_MARGIN under it. Where the tank is the higher the top is its own height, so
 * the curtain meets its surface; where the far ocean is, the curtain rises to it.
 */
export function curtainHeights(nodes: Int32Array, data: ArrayLike<number>, far: ArrayLike<number>, out: Float32Array): Float32Array {
  for (let k = 0; k < nodes.length; k += 1) {
    const water = data[2 * nodes[k]];
    const ocean = far[k];
    out[2 * k] = water > ocean ? water : ocean;
    out[2 * k + 1] = (water < ocean ? water : ocean) - CURTAIN_MARGIN;
  }
  return out;
}

/**
 * The far ocean's linear surface at the curtain's nodes (`FarFieldProfile.elevation`, as its shader draws it at its
 * hole's rim, where its Gerstner sharpening has faded out; dry land just under the bed), its components split once into
 * A·cos φ and A·sin φ per node, so each frame costs a multiply-add per component and node.
 */
export class CurtainOcean {
  readonly heights: Float64Array;
  private readonly cosines: Float64Array;
  private readonly sines: Float64Array;
  private readonly dry: Float64Array;
  private readonly count: number;
  private readonly omega: Float64Array;
  private readonly temporal: Float64Array;

  constructor(far: CurtainFar, grid: SurfaceGrid, nodes: Int32Array) {
    const { profile, centerX } = far;
    this.count = profile.count;
    this.omega = profile.omega;
    this.heights = new Float64Array(nodes.length);
    this.cosines = new Float64Array(nodes.length * this.count);
    this.sines = new Float64Array(nodes.length * this.count);
    this.dry = new Float64Array(nodes.length).fill(Number.NaN);
    this.temporal = new Float64Array(this.count * 2);
    for (let k = 0; k < nodes.length; k += 1) {
      const x = grid.xMin + (nodes[k] % grid.nx) * grid.spacing;
      const z = grid.zMin + Math.floor(nodes[k] / grid.nx) * grid.spacing;
      const side = x < centerX ? 0 : 1;
      const depth = profile.depthAt(side, z);
      if (depth <= FAR_DRY_DEPTH) this.dry[k] = -depth - FAR_DRY_DEPTH;
      for (let c = 0; c < this.count; c += 1) {
        const amplitude = profile.amplitudeAt(c, z, side);
        const phase = profile.kx[c] * x + profile.phaseAt(c, z, side);
        this.cosines[k * this.count + c] = amplitude * Math.cos(phase);
        this.sines[k * this.count + c] = amplitude * Math.sin(phase);
      }
    }
  }

  /** The far ocean's heights at the nodes at sea time t: Σ A cos(φ − ωt) = Σ A cos φ cos ωt + A sin φ sin ωt. */
  update(t: number): Float64Array {
    const { count, temporal } = this;
    for (let c = 0; c < count; c += 1) {
      temporal[2 * c] = Math.cos(this.omega[c] * t);
      temporal[2 * c + 1] = Math.sin(this.omega[c] * t);
    }
    for (let k = 0; k < this.heights.length; k += 1) {
      if (this.dry[k] === this.dry[k]) {
        this.heights[k] = this.dry[k];
        continue;
      }
      let eta = 0;
      const o = k * count;
      for (let c = 0; c < count; c += 1) eta += this.cosines[o + c] * temporal[2 * c] + this.sines[o + c] * temporal[2 * c + 1];
      this.heights[k] = eta;
    }
    return this.heights;
  }
}

/** The water's vertex chunks set each vertex's height from its field here; the curtain's takes its own. */
const HEIGHT_FROM_FIELD = 'transformed.y = waterHeight';
const HEIGHT_FROM_CURTAIN = 'transformed.y = waterCurtain';
/**
 * ...and shades as the edge's surface above it: its fragments read the surface's point (the view, the crest light),
 * not one buried in the crest, which the water's shading would take for the inside of the wave.
 */
const WORLD = 'vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;';
const WORLD_ON_SURFACE = `${WORLD}\nvWaterWorld.y = waterHeight;`;
/**
 * The curtain stands in for the edge's water seen from above, whichever of its faces is in view: its normal (the edge
 * surface's) is never flipped for a back face, as three does for a double-sided surface seen from below.
 */
const FACE = 'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;';
export const CURTAIN_NORMAL_BEGIN = ShaderChunk.normal_fragment_begin.replace(FACE, 'float faceDirection = 1.0;');

/**
 * The seam between the tank's water and the far ocean around it (the owner, 2026-10-08: "Fix it at every spot"). Where a
 * crest stands at the tank's open edge above the far ocean's linear swell (or the far ocean above a trough there), the
 * two surfaces leave a vertical gap through which the seabed shows. The curtain closes it: a strip along the open edges
 * from the higher surface to the lower, drawn with the water's own shading (its program, the vertices' heights alone
 * set from here), in both looks. Every other draw is today's: the water's own programs are untouched.
 */
export class EdgeCurtain {
  readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private grid?: SurfaceGrid;
  private centerX = 0;
  private centerZ = 0;
  private nodes: Int32Array = new Int32Array(0);
  private heights: Float32Array = new Float32Array(0);
  private far?: CurtainFar;
  private ocean?: CurtainOcean;
  private originalVersion = -1;

  constructor(private readonly water: WaterSurface) {
    const original = water.mesh.material;
    const material = original.clone();
    material.onBeforeCompile = (shader, renderer) => {
      original.onBeforeCompile(shader, renderer);
      if (shader.vertexShader.split(HEIGHT_FROM_FIELD).length !== 2 || shader.vertexShader.split(WORLD).length !== 2) {
        throw new Error('The edge curtain needs the water\'s one height line');
      }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float waterCurtain;')
        .replace(HEIGHT_FROM_FIELD, HEIGHT_FROM_CURTAIN)
        .replace(WORLD, WORLD_ON_SURFACE);
      if (shader.fragmentShader.split('#include <normal_fragment_begin>').length !== 2 || ShaderChunk.normal_fragment_begin.split(FACE).length !== 2) {
        throw new Error('The edge curtain needs the water\'s one normal chunk');
      }
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', CURTAIN_NORMAL_BEGIN);
    };
    material.customProgramCacheKey = () => `${original.customProgramCacheKey()}-edge-curtain`;
    this.mesh = new Mesh(new BufferGeometry(), material);
    this.mesh.name = 'edge-curtain';
    this.mesh.frustumCulled = false;
    // It hangs under the crest it closes: the crest's own shadow would darken the edge's water it stands in for.
    this.mesh.receiveShadow = false;
    this.mesh.visible = false;
    // The water's own program follows its look and settings: so does the curtain's, before each draw.
    this.mesh.onBeforeRender = () => this.sync();
    water.mesh.add(this.mesh);
  }

  /** The far ocean around the tank, or none (the Wave Pool's walls): no curtain. */
  setFar(far: CurtainFar | undefined): void {
    this.far = far;
    this.ocean = undefined;
    this.mesh.visible = false;
  }

  /** The curtain at sea time t (the far ocean's drawn time), on the water's heights as last uploaded. */
  update(seaTime: number): void {
    const { far, water } = this;
    if (!far) {
      this.mesh.visible = false;
      return;
    }
    const grid = water.grid;
    if (this.grid !== grid || this.centerX !== water.mesh.position.x || this.centerZ !== water.mesh.position.z || !this.ocean) this.rebuild(grid, far);
    const ocean = this.ocean!.update(seaTime);
    curtainHeights(this.nodes, water.surfaceData, ocean, this.heights);
    (this.mesh.geometry.getAttribute('waterCurtain') as BufferAttribute).needsUpdate = true;
    this.mesh.visible = true;
  }

  /** The curtain's path along the open edges and its far ocean, for this grid where the water's mesh now stands. */
  private rebuild(grid: SurfaceGrid, far: CurtainFar): void {
    this.grid = grid;
    this.centerX = this.water.mesh.position.x;
    this.centerZ = this.water.mesh.position.z;
    this.nodes = curtainNodes(grid);
    this.ocean = new CurtainOcean(far, grid, this.nodes);
    const count = this.nodes.length;
    const positions = new Float32Array(count * 2 * 3);
    for (let k = 0; k < count; k += 1) {
      const x = grid.xMin + (this.nodes[k] % grid.nx) * grid.spacing - this.centerX;
      const z = grid.zMin + Math.floor(this.nodes[k] / grid.nx) * grid.spacing - this.centerZ;
      positions.set([x, 0, z, x, 0, z], k * 6);
    }
    const indices: number[] = [];
    for (let k = 0; k + 1 < count; k += 1) {
      const top = 2 * k;
      indices.push(top, top + 1, top + 2, top + 2, top + 1, top + 3);
    }
    this.heights = new Float32Array(count * 2);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    // A normal attribute, though the water's program makes its own: without one three shades a physical material flat,
    // from the strip's own vertical faces.
    const up = new Float32Array(count * 2 * 3);
    for (let v = 0; v < count * 2; v += 1) up[3 * v + 1] = 1;
    geometry.setAttribute('normal', new Float32BufferAttribute(up, 3));
    // Its own array (not a copy), rewritten in place each frame.
    geometry.setAttribute('waterCurtain', new BufferAttribute(this.heights, 1));
    // The Rich program's patch attributes: no skirt, and on the patch, so it is never cut away under the dense patch.
    geometry.setAttribute('skirt', new Uint8BufferAttribute(new Uint8Array(count * 2), 1));
    geometry.setAttribute('onPatch', new Uint8BufferAttribute(new Uint8Array(count * 2).fill(1), 1));
    geometry.setIndex(indices);
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
  }

  /** The water's material as it now stands: its program (after a change of look) and its gloss. */
  private sync(): void {
    const original = this.water.mesh.material;
    const material = this.mesh.material;
    if (original.version !== this.originalVersion) {
      this.originalVersion = original.version;
      material.needsUpdate = true;
    }
    material.roughness = original.roughness;
    material.envMapIntensity = original.envMapIntensity;
  }

  dispose(): void {
    this.water.mesh.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
