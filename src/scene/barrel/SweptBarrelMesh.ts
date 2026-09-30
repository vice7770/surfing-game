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
  private look: WaterLook = 'classic';

  constructor(uniforms: Record<string, { value: unknown }>) {
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
    };
    material.customProgramCacheKey = () => `breakline-swept-barrel-${this.look}`;
    this.mesh = new Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
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
