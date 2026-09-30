import { BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Mesh, MeshPhysicalMaterial } from 'three';
import { LOFT, LOFT_SAMPLES, type LoftResult } from '../../wave/barrel/sweptLoft';
import type { WaterLook } from '../water/waterLook';
import { RICH_FAR_FOAM, RICH_REFLECTION, richFarNormal, richFragmentPars, richReflectionPars } from '../water/richWaterGlsl';
import { waterRipplePars } from '../water/rippleTexture';
import { CLASSIC_ROUGHNESS, RICH_BASE_ROUGHNESS, waterSpecularPars } from '../water/specular';
import { waterChopNormal } from '../waterChop';
import { WATER_IOR, waterBodyFragment } from '../waterOptics';
import { waterFragmentPars, waterVertexPars } from '../WaterSurface';
import { SWEPT_BARREL_DISCARD, waterBarrelMaskPars } from './barrelMaskGlsl';

/** The most vertices, and triangle indices, a loft fills (its budget and one slice more). */
const VERTICES = LOFT.budget + LOFT_SAMPLES;
const INDICES = 6 * (LOFT_SAMPLES - 1) * Math.ceil(VERTICES / LOFT_SAMPLES);

/**
 * A dev view of the curl (`?barrelView=`, dev tools only), flat-coloured in place of its shading:
 * - `phase`: each slice by its phase, blue before its face goes vertical, green open, red after touchdown (the tube
 *   review; tube-colour-fix.md, "Not solved by this");
 * - `front`: each slice by its front, a hue per front.
 * Both are dimmed where the vertex rests on the water.
 */
export type SweptBarrelView = 'phase' | 'front';
export const SWEPT_BARREL_VIEWS: readonly SweptBarrelView[] = ['phase', 'front'];
const PHASE_COLOURS: readonly (readonly [number, number, number])[] = [[0.15, 0.4, 1], [0.1, 0.85, 0.2], [1, 0.15, 0.1]];
/** The share of a view's colour a vertex resting on the water keeps; a lifted one keeps it all. */
const RESTING_SHARE = 0.3;

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
    if (view === 'phase') {
      const colour = PHASE_COLOURS[Math.min(2, loft.slicePhase[slice])];
      out[o] = colour[0];
      out[o + 1] = colour[1];
      out[o + 2] = colour[2];
    } else {
      frontColour(loft.sliceFront[slice], out, o);
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

// The loft's vertices are world positions and normals: the water's depth, foam and current are read where each lies.
// The curl takes the water's foam only as far as it lies on the water: the solver breaks where the tube is, so its
// roller's whitewater there is the tube's water, not foam on it; the tube's own foam comes with the crash curve (PR 5).
const sweptVertexPars = /* glsl */ `attribute float sweptLift;`;
const sweptBeginNormal = /* glsl */ `vec3 objectNormal = vec3( normal );
vWaterDepth = max( 0.0, position.y - waterBedAt( position.xz ) );
vWaterFoam = ( 1.0 - sweptLift ) * waterFoamAt( position.xz );
vWaterFlow = waterFlowAt( position.xz );`;
const sweptBeginVertex = /* glsl */ `vec3 transformed = vec3( position );
vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`;

/**
 * The swept barrel as drawn (the Padang Padang spec, Part B, PR 3): the loft's grid, shaded as the water is in either
 * look (spec 15: Classic with its existing shading), on the water's own uniforms, opaque. It shows exactly where the
 * water gave way to the seam's mask, the same dither deciding each pixel of the band. No crest light: its march reads
 * the height field, the hump under a lip; the lip's own light is PR 6's.
 */
export class SweptBarrelMesh {
  readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly positions = new BufferAttribute(new Float32Array(3 * VERTICES), 3).setUsage(DynamicDrawUsage);
  private readonly normals = new BufferAttribute(new Float32Array(3 * VERTICES), 3).setUsage(DynamicDrawUsage);
  private readonly lift = new BufferAttribute(new Float32Array(VERTICES), 1).setUsage(DynamicDrawUsage);
  private readonly index = new BufferAttribute(new Uint32Array(INDICES), 1).setUsage(DynamicDrawUsage);
  /** The dev view's colours, made with the first view. */
  private viewColours?: BufferAttribute;
  private currentView?: SweptBarrelView;
  private look: WaterLook = 'classic';

  /** `view`: a dev view of the curl in place of its shading (`SweptBarrelView`); none draws it as the water. */
  constructor(uniforms: Record<string, { value: unknown }>, view?: SweptBarrelView) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('normal', this.normals);
    geometry.setAttribute('sweptLift', this.lift);
    geometry.setIndex(this.index);
    geometry.setDrawRange(0, 0);
    const material = new MeshPhysicalMaterial({ color: '#ffffff', roughness: CLASSIC_ROUGHNESS, metalness: 0, ior: WATER_IOR, side: DoubleSide });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      const rich = this.look === 'rich';
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${waterVertexPars}\n${sweptVertexPars}`)
        .replace('#include <beginnormal_vertex>', sweptBeginNormal)
        .replace('#include <begin_vertex>', sweptBeginVertex);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', rich
          ? `#include <common>\n${waterFragmentPars}\n${richFragmentPars}\n${waterRipplePars}\n${waterSpecularPars}\n${richReflectionPars}\n${waterBarrelMaskPars}`
          : `#include <common>\n${waterFragmentPars}\n${waterBarrelMaskPars}`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${SWEPT_BARREL_DISCARD}`)
        .replace('#include <normal_fragment_begin>', rich ? richFarNormal : waterChopNormal)
        .replace('#include <color_fragment>', '')
        .replace('#include <emissivemap_fragment>', rich ? waterBodyFragment(false, true, RICH_FAR_FOAM) : waterBodyFragment(false, true))
        .replace('#include <lights_fragment_maps>', rich ? RICH_REFLECTION : '#include <lights_fragment_maps>');
      const view = this.currentView;
      if (!view) return;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${sweptViewVertexPars}`)
        .replace('#include <project_vertex>', 'vSweptView = sweptView;\n#include <project_vertex>');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${sweptViewFragmentPars}`)
        .replace('#include <opaque_fragment>', SWEPT_VIEW_OUTPUT);
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
    (this.index.array as Uint32Array).set(loft.indices.subarray(0, indices));
    if (this.currentView && this.viewColours) {
      sweptViewColours(this.currentView, loft, this.viewColours.array as Float32Array);
      this.viewColours.clearUpdateRanges();
      this.viewColours.addUpdateRange(0, 3 * vertices);
      this.viewColours.needsUpdate = true;
    }
    this.positions.clearUpdateRanges();
    this.positions.addUpdateRange(0, 3 * vertices);
    this.normals.clearUpdateRanges();
    this.normals.addUpdateRange(0, 3 * vertices);
    this.lift.clearUpdateRanges();
    this.lift.addUpdateRange(0, vertices);
    this.index.clearUpdateRanges();
    this.index.addUpdateRange(0, indices);
    this.positions.needsUpdate = true;
    this.normals.needsUpdate = true;
    this.lift.needsUpdate = true;
    this.index.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, indices);
    this.mesh.visible = true;
  }
}
