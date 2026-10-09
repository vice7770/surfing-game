import { BufferGeometry, Float32BufferAttribute, Mesh, ShaderChunk, Uint8BufferAttribute, type MeshPhysicalMaterial } from 'three';
import { farSeaPars, type FarFieldOcean } from './FarFieldOcean';
import { EDGE_BAND, applyEdgeBandLayout, createEdgeBandUniforms, edgeBandPars, edgeBandUncutPars, type EdgeBandLayout } from './water/edgeBandGlsl';
import { waterHeightPars, type SurfaceGrid, type WaterSurface } from './WaterSurface';

/** The band's columns run at the grid's spacing for this far past the edge, m, then widen to BAND_COARSE. */
const BAND_FINE = 8;
const BAND_COARSE = 4;
const BAND_GROWTH = 1.25;

/**
 * The band's columns, as distances past a side edge, m: the grid's own spacing near the edge (where the band meets the
 * tank's mesh vertex for vertex), widening to BAND_COARSE further out. Its rows are the tank's own render rows: the
 * waves run across shore, so their crests' profile is resolved in z, and x can be coarse.
 */
export function bandOffsets(spacing: number, width: number): number[] {
  const offsets = [0];
  let at = 0;
  let step = spacing;
  while (at < width - 1e-6) {
    at = Math.min(width, at + step);
    offsets.push(at);
    if (at >= BAND_FINE) step = Math.min(Math.max(BAND_COARSE, spacing), step * BAND_GROWTH);
  }
  return offsets;
}

/**
 * The band's level of detail: within `near` metres of the edge it shades as the tank does, per pixel (the Rich look's
 * Catmull-Rom normal and the crest light's march); from `near` + `blend` out, from its vertices' blended slopes, with no
 * crest light. Its rows are the tank's own 1 m rows, so a crest's profile across shore keeps its detail. The far part of
 * the band is seen from at least `near` + 21 m away (the rider's bounds), where the per-pixel normal adds little and the
 * Rich program's per-pixel cost doubled the water's on screen.
 */
export const BAND_DETAIL = { near: 24, blend: 8 } as const;

/** Each vertex's part: the band's surface, or a skirt's top or bottom (`waterBandEdge` 0, 1, 2). */
export const BAND_SURFACE = 0;
export const BAND_SKIRT_TOP = 1;
export const BAND_SKIRT_BOTTOM = 2;

/**
 * The band's mesh in world coordinates (y 0; the water's program sets every height): a strip past each side edge, out
 * to `fade`, on the tank's rows, and a skirt hung under its outer rims (the far ends of the strips, and the offshore
 * rim across the strips and the tank).
 */
export function edgeBandGeometry(grid: SurfaceGrid, fade: number = EDGE_BAND.fade): BufferGeometry {
  const xMax = grid.xMin + (grid.nx - 1) * grid.spacing;
  const offsets = bandOffsets(grid.spacing, fade);
  const strips = [
    [...offsets].reverse().map((d) => grid.xMin - d),
    offsets.map((d) => xMax + d),
  ];
  const positions: number[] = [];
  const edge: number[] = [];
  const indices: number[] = [];
  const zs = Array.from({ length: grid.nz }, (_, j) => grid.zMin + j * grid.spacing);
  for (const xs of strips) {
    const first = positions.length / 3;
    for (const z of zs) {
      for (const x of xs) {
        positions.push(x, 0, z);
        edge.push(BAND_SURFACE);
      }
    }
    for (let j = 0; j + 1 < zs.length; j += 1) {
      for (let i = 0; i + 1 < xs.length; i += 1) {
        const a = first + j * xs.length + i;
        const b = a + 1;
        const c = a + xs.length;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  // The skirts: each rim point twice, its top on the surface and its bottom hung EDGE_BAND.skirt under it.
  const skirt = (points: [number, number][]) => {
    const first = positions.length / 3;
    for (const [x, z] of points) {
      positions.push(x, 0, z, x, 0, z);
      edge.push(BAND_SKIRT_TOP, BAND_SKIRT_BOTTOM);
    }
    for (let k = 0; k + 1 < points.length; k += 1) {
      const top = first + 2 * k;
      indices.push(top, top + 1, top + 2, top + 2, top + 1, top + 3);
    }
  };
  skirt(zs.map((z) => [grid.xMin - fade, z]));
  skirt(zs.map((z) => [xMax + fade, z]));
  const tank = Array.from({ length: grid.nx }, (_, i) => grid.xMin + i * grid.spacing);
  const offshore = [...strips[0].slice(0, -1), ...tank, ...strips[1].slice(1)];
  skirt(offshore.map((x) => [x, grid.zMin]));
  const count = positions.length / 3;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  // A normal attribute, though the water's program makes its own: without one three shades a physical material flat.
  const up = new Float32Array(count * 3);
  for (let v = 0; v < count; v += 1) up[3 * v + 1] = 1;
  geometry.setAttribute('normal', new Float32BufferAttribute(up, 3));
  geometry.setAttribute('waterBandEdge', new Float32BufferAttribute(edge, 1));
  // The Rich program's patch attributes: no patch skirt, and on the patch, so it is never cut away under the dense patch.
  geometry.setAttribute('skirt', new Uint8BufferAttribute(new Uint8Array(count), 1));
  geometry.setAttribute('onPatch', new Uint8BufferAttribute(new Uint8Array(count).fill(1), 1));
  geometry.setIndex(indices);
  return geometry;
}

/** Replace `target` in `source` exactly once, or throw: the band needs the water's own line, once. */
function once(source: string, target: string | RegExp, replacement: string | ((match: string, ...groups: string[]) => string)): string {
  const matches = typeof target === 'string' ? source.split(target).length - 1 : (source.match(new RegExp(target.source, 'g')) ?? []).length;
  if (matches !== 1) throw new Error(`The edge band needs the water's line ${String(target)} once, found ${matches}`);
  return typeof target === 'string'
    ? source.replace(target, typeof replacement === 'string' ? () => replacement : replacement as (match: string) => string)
    : source.replace(target, replacement as (match: string, ...groups: string[]) => string);
}

/** Where the water's vertex chunks have set its height, slope, depth, foam and current (both looks end on it). */
const VERTEX_FIELDS_SET = 'vWaterFlow = waterFlowAt( waterXZ );';
const WORLD = 'vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;';
const FACE = 'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;';
/** The skirts stand in for the rim's surface above them, whichever face is in view (as the edge curtain did). */
export const BAND_NORMAL_BEGIN = ShaderChunk.normal_fragment_begin.replace(
  FACE, 'float faceDirection = vWaterBandSkirt > 0.5 ? 1.0 : ( gl_FrontFacing ? 1.0 : - 1.0 );',
);

/** The band's vertex pars: the far ocean's sea, the band's weight, and what the fragment takes from the vertex. */
const bandVertexPars = /* glsl */ `
${farSeaPars}
${edgeBandPars}
${edgeBandUncutPars}
attribute float waterBandEdge;
varying vec3 vWaterFar;
varying float vWaterBandSkirt;
varying vec2 vWaterBandSlope;
`;

/**
 * The band, after the water's own vertex chunk: there the tank's mirror image (the water's lookups read it past the side
 * edges), handed over to the far ocean's linear sea by the band's weight. Height and slope blend (with the weight's own
 * slope across the gap), as do depth and foam; the current and the air go with the tank's share.
 */
function bandVertexBlock(rich: boolean, vertexSlope: boolean): string {
  return /* glsl */ `
vWaterBandSkirt = min( waterBandEdge, 1.0 );
float waterBandW = waterBandWeight( waterXZ );
float waterFarHeight;
vec2 waterFarSlope;
vec2 waterFarShift;
float waterFarDepth;
float farCap;
farSeaAt( waterXZ, 0.0, waterFarHeight, waterFarSlope, waterFarShift, waterFarDepth, farCap );
vWaterFar = vec3( waterFarHeight, waterFarSlope );
if ( waterBandW > 0.0 ) {
  vec2 waterTankSlope = -objectNormal.xz / objectNormal.y;
  vec2 waterBandSlope = mix( waterTankSlope, waterFarSlope, waterBandW ) + waterBandGradient( waterXZ ) * ( waterFarHeight - waterHeight );
  vWaterDepth = mix( vWaterDepth, max( 0.0, waterFarDepth + waterFarHeight ), waterBandW );
  vWaterFoam = mix( vWaterFoam, waterFarDepth <= 0.05 ? 0.0 : clamp( ( 1.0 - farCap ) * 1.4, 0.0, 0.85 ), waterBandW );
  vWaterFlow *= 1.0 - waterBandW;
  waterHeight = mix( waterHeight, waterFarHeight, waterBandW );
  objectNormal = normalize( vec3( -waterBandSlope.x, 1.0, -waterBandSlope.y ) );${rich ? '\n  vWaterAir *= 1.0 - waterBandW;' : ''}${vertexSlope ? '\n  vWaterSurfaceSlope = waterBandSlope;' : ''}
}
vWaterBandSlope = -objectNormal.xz / objectNormal.y;
`;
}

/** The band's fragment pars: its weight, the far sea at the fragment, and the blends its prototypes declare. */
const bandFragmentPars = /* glsl */ `
${edgeBandPars}
${edgeBandUncutPars}
varying vec3 vWaterFar;
varying float vWaterBandSkirt;
varying vec2 vWaterBandSlope;
float waterBandDetail( vec2 xz );
float waterBandHeight( vec2 xz, float tank );
vec3 waterBandSurface( vec3 tank, vec2 xz );
float waterBandInside( vec2 xz );
`;

const bandFragmentFunctions = /* glsl */ `
// The far sea near the fragment, to first order (its swell is long beside the band's few metres).
float waterBandHeight( vec2 xz, float tank ) {
  float w = waterBandWeight( xz );
  return w <= 0.0 ? tank : mix( tank, vWaterFar.x + dot( vWaterFar.yz, xz - vWaterWorld.xz ), w );
}
vec3 waterBandSurface( vec3 tank, vec2 xz ) {
  float w = waterBandWeight( xz );
  if ( w <= 0.0 ) return tank;
  vec2 slope = mix( tank.yz, vWaterFar.yz, w ) + waterBandGradient( xz ) * ( vWaterFar.x - tank.x );
  return vec3( mix( tank.x, vWaterFar.x, w ), slope );
}
// 1 within BAND_DETAIL.near of the side edges (and inside them), easing to 0 over BAND_DETAIL.blend beyond.
float waterBandDetail( vec2 xz ) {
  float d = max( max( waterBand.x - xz.x, xz.x - waterBand.y ), 0.0 );
  return 1.0 - smoothstep( ${BAND_DETAIL.near.toFixed(1)}, ${(BAND_DETAIL.near + BAND_DETAIL.blend).toFixed(1)}, d );
}
// The tank's own along-shore span: the swept barrel draws over it only, so its mask never cuts the band.
float waterBandInside( vec2 xz ) {
  return xz.x >= waterBand.x && xz.x <= waterBand.y ? 1.0 : 0.0;
}
void main() {`;

const HEIGHT_HEADER = 'float waterHeightAt( vec2 xz ) {';
const CARVE_HEADER = 'float waterCarve( vec2 xz, float surface ) {';
const CARVED_CUBIC_HEADER = 'vec3 waterCarvedCubic( vec2 xz ) {';

/** The water's height lookup, reading the uncut heights (`WaterSurface.keepRawHeights`): its own text, renamed. */
function rawHeightLookup(): string {
  const start = waterHeightPars.indexOf(HEIGHT_HEADER);
  const end = waterHeightPars.indexOf('\n}\n', start) + 3;
  return waterHeightPars.slice(start, end)
    .replace(HEIGHT_HEADER, 'float waterHeightAtUncut( vec2 xz ) {')
    .split('texelFetch( waterSurface, ').join('texelFetch( waterSurfaceRaw, ');
}

/**
 * Past the mirrored lips' reach the band draws the tank's crests uncut (`EDGE_BAND.uncut`). Classic: the heights cut on
 * the CPU give way to the uncut ones kept beside them. Rich: its own tube cut eases out.
 */
function uncutBeyondLips(source: string, rich: boolean): string {
  if (rich) {
    if (!source.includes(CARVE_HEADER)) return source;
    let out = once(source, CARVE_HEADER, 'float waterCarveTank( vec2 xz, float surface ) {');
    out = once(out, CARVED_CUBIC_HEADER, `float waterCarve( vec2 xz, float surface ) {
  float uncut = waterBandUncut( xz );
  return uncut >= 1.0 ? surface : mix( waterCarveTank( xz, surface ), surface, uncut );
}
${CARVED_CUBIC_HEADER}`);
    return out;
  }
  let out = once(source, HEIGHT_HEADER, 'float waterHeightAtDrawn( vec2 xz ) {');
  const start = out.indexOf('float waterHeightAtDrawn( vec2 xz ) {');
  const end = out.indexOf('\n}\n', start) + 3;
  return `${out.slice(0, end)}uniform sampler2D waterSurfaceRaw;
${rawHeightLookup()}float waterHeightAt( vec2 xz ) {
  float uncut = waterBandUncut( xz );
  float drawn = uncut >= 1.0 ? 0.0 : waterHeightAtDrawn( xz );
  return uncut <= 0.0 ? drawn : mix( drawn, waterHeightAtUncut( xz ), uncut );
}
${out.slice(end)}`;
}

/** The water's program, made the band's: the shader texts `onBeforeCompile` hands it, changed in place. */
export function bandShaders(vertex: string, fragment: string): { vertex: string; fragment: string } {
  const rich = vertex.includes('vWaterAir = ');
  const vertexSlope = vertex.includes('vWaterSurfaceSlope = waterCubicSample.yz;');
  let v = once(vertex, '#include <common>', `#include <common>\n${bandVertexPars}`);
  v = once(v, VERTEX_FIELDS_SET, `${VERTEX_FIELDS_SET}\n${bandVertexBlock(rich, vertexSlope)}`);
  // The skirt hangs under the rim, shaded as the rim's surface (its world point stays on it).
  v = once(v, WORLD, `${WORLD}\ntransformed.y -= ${EDGE_BAND.skirt.toFixed(3)} * max( 0.0, waterBandEdge - 1.0 );`);
  let f = once(fragment, '#include <common>', `#include <common>\n${bandFragmentPars}`);
  f = once(f, 'void main() {', bandFragmentFunctions);
  f = once(f, /float gap = (.+) - p\.y;/, (_match, tank) => `float gap = waterBandHeight( p.xz, ${tank} ) - p.y;`);
  if (f.includes('vec3 waterSurfaceSample = waterCarvedCubic( vWaterWorld.xz );')) {
    // Per pixel near the edge, from the vertices' slopes beyond (BAND_DETAIL).
    f = once(f, 'vec3 waterSurfaceSample = waterCarvedCubic( vWaterWorld.xz );', `float waterBandFine = waterBandDetail( vWaterWorld.xz );
  vec3 waterSurfaceSample = vec3( 0.0, vWaterBandSlope );
  if ( waterBandFine > 0.0 ) waterSurfaceSample = mix( waterSurfaceSample, waterBandSurface( waterCarvedCubic( vWaterWorld.xz ), vWaterWorld.xz ), waterBandFine );`);
  }
  // The crest light near the edge only (BAND_DETAIL): its march is the per-pixel cost beyond.
  const behind = 'float waterBehind = pow( max( 0.0, dot( -waterV, waterSunDirection ) ), 4.0 );';
  if (f.includes(behind)) f = once(f, behind, `${behind.slice(0, -1)} * waterBandDetail( vWaterWorld.xz );`);
  if (f.includes('waterRollerAt( vWaterWorld.xz, waterTime );')) {
    f = once(f, 'waterRollerAt( vWaterWorld.xz, waterTime );', `waterRollerAt( vWaterWorld.xz, waterTime );
{
  float waterBandTank = 1.0 - waterBandWeight( vWaterWorld.xz );
  waterRollerCover *= waterBandTank;
  waterRollerPresence *= waterBandTank;
}`);
  }
  f = f.split('waterBarrelMaskAt( vWaterWorld.xz )').join('( waterBandInside( vWaterWorld.xz ) * waterBarrelMaskAt( vWaterWorld.xz ) )');
  if (ShaderChunk.normal_fragment_begin.split(FACE).length !== 2) throw new Error('The edge band needs three\'s one face line');
  f = once(f, '#include <normal_fragment_begin>', BAND_NORMAL_BEGIN);
  const cubic = vertex.includes('waterCarvedCubic( waterXZ )');
  return { vertex: uncutBeyondLips(v, cubic), fragment: uncutBeyondLips(f, cubic) };
}

/**
 * The edge band (the owner's 2026-10-09 playtest: "The edges are off, they are separated from the off-map waves. We
 * could make the same wave, just limit the map access"). Past each open side edge it draws the tank's own water mirrored
 * across the edge (its height, normals, foam and churn, tubes and roller, and the bed under it), with the water's own
 * program in either look, and hands it over to the far ocean's linear sea from `EDGE_BAND.pure` to `fade` metres out.
 * It also holds the far ocean's rim on the drawn tank offshore (`rimUniforms`, `FarFieldOcean.attachRim`). Every crest
 * arrives square to the beach, so the mirrored crests run on straight across the edge, with no crease in height.
 */
export class EdgeBand {
  readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  /** What the far ocean's rim reads (`FarFieldOcean.attachRim`): the water's own uniform objects and the band's. */
  readonly rimUniforms: {
    farRim: { value: number };
    waterSurface: { value: unknown };
    waterGrid: { value: unknown };
    waterGridSize: { value: unknown };
    waterBand: { value: unknown };
    waterBandZ: { value: unknown };
  };
  private readonly bandUniforms = createEdgeBandUniforms();
  private grid?: SurfaceGrid;
  private zone?: number;
  private originalVersion = -1;

  constructor(private readonly water: WaterSurface, far: FarFieldOcean) {
    const original = water.mesh.material;
    const material = original.clone();
    const sea = far.seaUniforms;
    material.onBeforeCompile = (shader, renderer) => {
      original.onBeforeCompile(shader, renderer);
      Object.assign(shader.uniforms, sea, this.bandUniforms);
      const changed = bandShaders(shader.vertexShader, shader.fragmentShader);
      shader.vertexShader = changed.vertex;
      shader.fragmentShader = changed.fragment;
    };
    material.customProgramCacheKey = () => `${original.customProgramCacheKey()}-edge-band`;
    this.mesh = new Mesh(new BufferGeometry(), material);
    this.mesh.name = 'edge-band';
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    // The water's own program follows its look and settings: so does the band's, before each draw.
    this.mesh.onBeforeRender = () => this.sync();
    water.mesh.add(this.mesh);
    const uniforms = water.materialUniforms;
    this.rimUniforms = {
      farRim: { value: 0 },
      waterSurface: uniforms.waterSurface,
      waterGrid: uniforms.waterGrid,
      waterGridSize: uniforms.waterGridSize,
      waterBand: this.bandUniforms.waterBand,
      waterBandZ: this.bandUniforms.waterBandZ,
    };
  }

  /** The band at a spot with open sides and a far ocean (its relaxation zone's length, m), or none (the Wave Pool's walls). */
  setSpot(spot: { zone: number } | undefined): void {
    this.zone = spot?.zone;
    // Past the mirrored lips the band draws the crests uncut: the water keeps them beside the cut ones.
    this.water.keepRawHeights(spot !== undefined);
    this.rimUniforms.farRim.value = 0;
    this.mesh.visible = false;
  }

  /** Where the band lies for the water's grid as it now stands, or none without a spot. */
  get layout(): EdgeBandLayout | undefined {
    const { grid } = this.water;
    if (this.zone === undefined) return undefined;
    return { xMin: grid.xMin, xMax: grid.xMin + (grid.nx - 1) * grid.spacing, zMin: grid.zMin, zone: this.zone };
  }

  /** Draw the band (with `show`, at a spot) on the water's grid as it now stands; the far ocean's rim holds with it. */
  update(show: boolean): void {
    const layout = this.layout;
    const on = show && layout !== undefined;
    this.mesh.visible = on;
    this.rimUniforms.farRim.value = on ? 1 : 0;
    if (!on) return;
    const { grid } = this.water;
    const was = this.grid;
    if (!was || was.xMin !== grid.xMin || was.zMin !== grid.zMin || was.spacing !== grid.spacing || was.nx !== grid.nx || was.nz !== grid.nz) {
      this.grid = { ...grid };
      this.mesh.geometry.dispose();
      this.mesh.geometry = edgeBandGeometry(grid);
    }
    applyEdgeBandLayout(this.bandUniforms, layout);
    // The geometry is in world coordinates; the band hangs from the water's mesh, which stands at the grid's centre.
    this.mesh.position.set(-this.water.mesh.position.x, 0, -this.water.mesh.position.z);
  }

  /** The water's material as it now stands: its program (after a change of look), its gloss and its sky. */
  private sync(): void {
    const original = this.water.mesh.material;
    const material = this.mesh.material;
    if (original.version !== this.originalVersion) {
      this.originalVersion = original.version;
      material.needsUpdate = true;
    }
    if (material.envMap !== original.envMap) {
      material.envMap = original.envMap;
      material.needsUpdate = true;
    }
    material.roughness = original.roughness;
    material.envMapIntensity = original.envMapIntensity;
    material.envMapRotation.copy(original.envMapRotation);
    material.stencilWrite = false;
    this.mesh.receiveShadow = this.water.mesh.receiveShadow;
  }

  dispose(): void {
    this.water.mesh.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
