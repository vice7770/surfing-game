import { BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Mesh, MeshPhysicalMaterial } from 'three';
import { LANDMARK } from '../../wave/barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES, type LoftResult } from '../../wave/barrel/sweptLoft';
import type { WaterLook } from '../water/waterLook';
import { RICH_FAR_FOAM, RICH_REFLECTION, richFarNormal, richFragmentPars, richReflectionPars } from '../water/richWaterGlsl';
import { waterRipplePars } from '../water/rippleTexture';
import { CLASSIC_ROUGHNESS, RICH_BASE_ROUGHNESS, waterSpecularPars } from '../water/specular';
import { waterChopNormal } from '../waterChop';
import { CLASSIC_FOAM, CREST_SCATTER, WATER_IOR, waterBodyFragment } from '../waterOptics';
import { waterFragmentPars, waterVertexPars } from '../WaterSurface';
import { SWEPT_BARREL_DISCARD, waterBarrelMaskPars } from './barrelMaskGlsl';

/** The most vertices, and triangle indices, a loft fills (its budget and one slice more). */
const VERTICES = LOFT.budget + LOFT_SAMPLES;
const INDICES = 6 * (LOFT_SAMPLES - 1) * Math.ceil(VERTICES / LOFT_SAMPLES);

/**
 * A dev view of the curl (`?barrelView=`, dev tools only), flat-coloured in place of its shading:
 * - `phase`: each slice by its phase, blue before its face goes vertical, green open, red after touchdown (the tube
 *   review; tube-colour-fix.md, "Not solved by this");
 * - `front`: each slice by its front, a hue per front;
 * - `sheet`: the lip's thickness where it is shaded as a sheet, white thin to blue 1 m thick, grey elsewhere;
 * - `region`: unshaded, the lip red (a sheet), the tube's back wall blue (throat to toe on an open slice), the rest
 *   green: the water sheet's luminance check reads its pixels.
 * All but `region` are dimmed where the vertex rests on the water.
 */
export type SweptBarrelView = 'phase' | 'front' | 'sheet' | 'region';
export const SWEPT_BARREL_VIEWS: readonly SweptBarrelView[] = ['phase', 'front', 'sheet', 'region'];
const PHASE_COLOURS: readonly (readonly [number, number, number])[] = [[0.15, 0.4, 1], [0.1, 0.85, 0.2], [1, 0.15, 0.1]];
/** The share of a view's colour a vertex resting on the water keeps; a lifted one keeps it all. */
const RESTING_SHARE = 0.3;
/** The region view's sheet and back wall: a vertex this far a sheet, or lifted, belongs to it. */
const REGION_SHARE = 0.5;

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
    if (view === 'region') {
      const point = (v % LOFT_SAMPLES) - LOFT.extensionSamples;
      const lip = loft.sheetWeight[v] >= REGION_SHARE;
      const wall = !lip && loft.slicePhase[slice] === 1 && loft.lift[v] >= REGION_SHARE && point >= LANDMARK.throat && point <= LANDMARK.toe;
      out[o] = lip ? 1 : 0;
      out[o + 1] = lip || wall ? 0 : 1;
      out[o + 2] = wall ? 1 : 0;
      continue;
    }
    if (view === 'phase') {
      const colour = PHASE_COLOURS[Math.min(2, loft.slicePhase[slice])];
      out[o] = colour[0];
      out[o + 1] = colour[1];
      out[o + 2] = colour[2];
    } else if (view === 'front') {
      frontColour(loft.sliceFront[slice], out, o);
    } else {
      // The sheet: white where thin, to blue at 1 m, by its weight; grey where the vertex is no sheet.
      const w = loft.sheetWeight[v];
      const t = Math.min(1, loft.sheet[v]);
      out[o] = 0.5 * (1 - w) + w * (1 - t);
      out[o + 1] = 0.5 * (1 - w) + w * (1 - 0.6 * t);
      out[o + 2] = 0.5 * (1 - w) + w;
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
/** The region view's colour as it is, unshaded, so its pixels read back as their region. */
const SWEPT_REGION_OUTPUT = /* glsl */ `#include <opaque_fragment>
gl_FragColor = vec4( vSweptView, 1.0 );`;

// The loft's vertices are world positions and normals: the water's depth, foam and current are read where each lies.
// The curl takes the water's foam only as far as it lies on the water: the solver breaks where the tube is, so its
// roller's whitewater there is the tube's water, not foam on it; the tube's own foam comes with the crash curve (PR 5).
// The lip's thickness and its weight as a sheet come from the loft (`sheetAcross`).
const sweptVertexPars = /* glsl */ `attribute float sweptLift;
attribute float sweptSheet;
attribute float sweptSheetWeight;
attribute float sweptSheetBack;
varying float vSweptSheet;
varying float vSweptSheetWeight;
varying float vSweptSheetBack;`;
const sweptBeginNormal = /* glsl */ `vec3 objectNormal = vec3( normal );
vWaterDepth = max( 0.0, position.y - waterBedAt( position.xz ) );
vWaterFoam = ( 1.0 - sweptLift ) * waterFoamAt( position.xz );
vWaterFlow = waterFlowAt( position.xz );
vSweptSheet = sweptSheet;
vSweptSheetWeight = sweptSheetWeight;
vSweptSheetBack = sweptSheetBack;`;
const sweptFragmentPars = /* glsl */ `varying float vSweptSheet;
varying float vSweptSheetWeight;
varying float vSweptSheetBack;`;

/**
 * The lip as a thin sheet lit from behind, in both looks (docs/research/water-physics/tube-colour-fix.md, step 2; the
 * advisor's rulings, 2026-10-01), not a column of water over the reef: the view ray crosses the sheet's thickness,
 * lengthened by its refracted angle (at least 0.2), t. The sheet's own backscatter builds up with that path (two-flux:
 * R∞ (1 − e^{−2ct})) and is lit from the front as the body is, in the albedo; the light behind it comes through
 * attenuated by Beer–Lambert on the water's own absorption and scattering, e^{−ct}, as emitted radiance, with no body
 * gain. Behind it: E_back = F · E_sky(−n) + (1 − F) · E_wall, F the far side's view of the sky through the tube's
 * opening (`sheetAcross`), E_sky the sky's irradiance over the hemisphere behind the sheet (the ambient, and the
 * environment at −n) [provisional: the build's choice], E_wall the cavity's wall, about R∞ of that light
 * [provisional]; and the sun's crest light where it is behind, over its own path through the sheet, t / |n·L| (at
 * least 0.2). The height field's march is never run on the curl.
 */
export const SWEPT_SHEET_BODY = /* glsl */ `
    float sweptPath = vSweptSheet / max( 0.2, waterRefractedCosine( waterViewCos ) );
    vec3 sweptReach = exp( -waterAttenuation * sweptPath );
    waterBody = mix( waterBody, waterDeepReflectance * ( 1.0 - sweptReach * sweptReach ), vSweptSheetWeight );
    vec3 sweptSky = getAmbientLightIrradiance( ambientLightColor );
    #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
      sweptSky += getIBLIrradiance( -normal );
    #endif
    vec3 sweptBack = sweptSky * ( vSweptSheetBack + ( 1.0 - vSweptSheetBack ) * waterDeepReflectance );
    float sweptSunPath = vSweptSheet / max( 0.2, abs( dot( waterN, waterSunDirection ) ) );
    float sweptSunBehind = pow( max( 0.0, dot( -waterV, waterSunDirection ) ), 4.0 );
    totalEmissiveRadiance += vSweptSheetWeight * ( 1.0 - vWaterFoam ) * ( 1.0 - waterFresnel( waterViewCos ) ) * (
      sweptReach * sweptBack * RECIPROCAL_PI + ${CREST_SCATTER.toFixed(6)} * sweptSunBehind * waterSunRadiance * exp( -waterAttenuation * sweptSunPath ) );`;
const sweptBeginVertex = /* glsl */ `vec3 transformed = vec3( position );
vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`;

/**
 * The swept barrel as drawn (the Padang Padang spec, Part B, PR 3): the loft's grid, shaded as the water is in either
 * look (spec 15: Classic with its existing shading), on the water's own uniforms, opaque, except that its lip is shaded
 * as a thin sheet lit from behind (`SWEPT_SHEET_BODY`). It shows exactly where the water gave way to the seam's mask,
 * the same dither deciding each pixel of the band. The height field's crest light is not marched on it: under a lip it
 * reads the hump, not the lip; the lip takes the crest light over its own thickness.
 */
export class SweptBarrelMesh {
  readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly positions = new BufferAttribute(new Float32Array(3 * VERTICES), 3).setUsage(DynamicDrawUsage);
  private readonly normals = new BufferAttribute(new Float32Array(3 * VERTICES), 3).setUsage(DynamicDrawUsage);
  private readonly lift = new BufferAttribute(new Float32Array(VERTICES), 1).setUsage(DynamicDrawUsage);
  private readonly sheet = new BufferAttribute(new Float32Array(VERTICES), 1).setUsage(DynamicDrawUsage);
  private readonly sheetWeight = new BufferAttribute(new Float32Array(VERTICES), 1).setUsage(DynamicDrawUsage);
  private readonly sheetBack = new BufferAttribute(new Float32Array(VERTICES), 1).setUsage(DynamicDrawUsage);
  private readonly index = new BufferAttribute(new Uint32Array(INDICES), 1).setUsage(DynamicDrawUsage);
  /** The dev view's colours, made with the first view. */
  private viewColours?: BufferAttribute;
  private currentView?: SweptBarrelView;
  private look: WaterLook = 'classic';
  /** Dev only: false draws the lip as the column it was before the sheet (the water sheet's before-and-after). */
  sheetShown = true;

  /** `view`: a dev view of the curl in place of its shading (`SweptBarrelView`); none draws it as the water. */
  constructor(uniforms: Record<string, { value: unknown }>, view?: SweptBarrelView) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('normal', this.normals);
    geometry.setAttribute('sweptLift', this.lift);
    geometry.setAttribute('sweptSheet', this.sheet);
    geometry.setAttribute('sweptSheetWeight', this.sheetWeight);
    geometry.setAttribute('sweptSheetBack', this.sheetBack);
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
          ? `#include <common>\n${waterFragmentPars}\n${richFragmentPars}\n${waterRipplePars}\n${waterSpecularPars}\n${richReflectionPars}\n${waterBarrelMaskPars}\n${sweptFragmentPars}`
          : `#include <common>\n${waterFragmentPars}\n${waterBarrelMaskPars}\n${sweptFragmentPars}`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${SWEPT_BARREL_DISCARD}`)
        .replace('#include <normal_fragment_begin>', rich ? richFarNormal : waterChopNormal)
        .replace('#include <color_fragment>', '')
        .replace('#include <emissivemap_fragment>', rich ? waterBodyFragment(false, true, RICH_FAR_FOAM, SWEPT_SHEET_BODY) : waterBodyFragment(false, true, CLASSIC_FOAM, SWEPT_SHEET_BODY))
        .replace('#include <lights_fragment_maps>', rich ? RICH_REFLECTION : '#include <lights_fragment_maps>');
      const view = this.currentView;
      if (!view) return;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${sweptViewVertexPars}`)
        .replace('#include <project_vertex>', 'vSweptView = sweptView;\n#include <project_vertex>');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${sweptViewFragmentPars}`)
        .replace('#include <opaque_fragment>', view === 'region' ? SWEPT_REGION_OUTPUT : SWEPT_VIEW_OUTPUT);
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
    (this.sheet.array as Float32Array).set(loft.sheet.subarray(0, vertices));
    (this.sheetBack.array as Float32Array).set(loft.sheetBack.subarray(0, vertices));
    if (this.sheetShown) (this.sheetWeight.array as Float32Array).set(loft.sheetWeight.subarray(0, vertices));
    else (this.sheetWeight.array as Float32Array).fill(0, 0, vertices);
    (this.index.array as Uint32Array).set(loft.indices.subarray(0, indices));
    if (this.currentView && this.viewColours) {
      sweptViewColours(this.currentView, loft, this.viewColours.array as Float32Array);
      this.viewColours.clearUpdateRanges();
      this.viewColours.addUpdateRange(0, 3 * vertices);
      this.viewColours.needsUpdate = true;
    }
    for (const attribute of [this.positions, this.normals]) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, 3 * vertices);
      attribute.needsUpdate = true;
    }
    for (const attribute of [this.lift, this.sheet, this.sheetWeight, this.sheetBack]) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, vertices);
      attribute.needsUpdate = true;
    }
    this.index.clearUpdateRanges();
    this.index.addUpdateRange(0, indices);
    this.index.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, indices);
    this.mesh.visible = true;
  }
}
