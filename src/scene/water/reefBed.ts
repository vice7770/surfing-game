import { DEV_TOOLS, devParam } from '../../devTools';
import { canyonShape, canyonTerraceDepth, smoothstep, type CanyonBed, type CanyonShape, type SpotName } from '../../wave/Bathymetry';

/**
 * The reef's own floor under the water (the owner's playtest, 2026-10-22: "There is also a white colour on the left
 * side of the view, from the shorter bed of the sand. This needs to be removed"). The water's body is lit from the bed
 * up through it (`waterBodyReflectanceLit`), with one albedo for the whole spot: the Canyon's sand, 0.42/0.36/0.24, under
 * its reef arm too, whose 1 m top and 2 m back reef then read near white through the shallow water, as a pale wedge from
 * the beach out to the peak (docs/research/canyon-reef-white-2026-10-22). A reef is not sand: its top is coral, algal turf
 * and coralline pavement, with sand and rubble in pockets, about 8 % at 550–650 nm and 2.5 % at 400–500 nm for live coral
 * (Hochberg & Atkinson 2003; Padang Padang's bed, `SPOT_OPTICS`), against 30–50 % for carbonate sand.
 *
 * So the bed carries a cover, 0 (sand) to 1 (reef), per render node beside its height (the bed texture's second
 * channel), and the water mixes the spot's sand albedo toward its reef albedo by it. Drawn only: the physics' bed and
 * its material (`SurfSpot.materialAt`, for contact) are unchanged.
 */

/**
 * How far the reef stands above the sand round it before its floor is reef, m: none below the first, all from the
 * second. A terrace's toe a few decimetres proud of the platform is still the sand it rises from (a reef's sand apron);
 * a metre and a half up it is reef.
 */
export const REEF_RELIEF = [0.3, 1.5] as const;

/**
 * The reef's floor is a mosaic: coral and turf with pockets of rubble and sand a few metres across (spur-and-groove on
 * its face, sand channels on its flat). Value noise on two scales, m, weighted; where it exceeds `edges` the floor turns
 * toward sand by up to `depth` of its cover. Deeper (0.7) on larger scales (9 and 3.5 m) the pockets read as pale
 * blotches, white again from the start's view (docs/research/canyon-reef-white-2026-10-22): rubble, not bare sand.
 */
export const REEF_MOTTLE = { scales: [5, 2], weights: [0.6, 0.4], edges: [0.5, 0.75], depth: 0.35 } as const;

/** A lattice point's hash, 0–1 (an integer hash, so the mottle is the same wherever the window stands). */
function hash(i: number, j: number): number {
  let h = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise, 0–1, at (x, z) on a lattice of `scale` m. */
function valueNoise(x: number, z: number, scale: number): number {
  const u = x / scale;
  const v = z / scale;
  const i = Math.floor(u);
  const j = Math.floor(v);
  const fu = u - i;
  const fv = v - j;
  const su = fu * fu * (3 - 2 * fu);
  const sv = fv * fv * (3 - 2 * fv);
  const top = hash(i, j) + (hash(i + 1, j) - hash(i, j)) * su;
  const bottom = hash(i, j + 1) + (hash(i + 1, j + 1) - hash(i, j + 1)) * su;
  return top + (bottom - top) * sv;
}

/** The share of the reef's floor at (x, z) that stays reef, 1 − `depth` to 1: lower in its sand pockets. */
export function reefMottle(x: number, z: number): number {
  const { scales, weights, edges, depth } = REEF_MOTTLE;
  let n = 0;
  for (let k = 0; k < scales.length; k += 1) n += weights[k] * valueNoise(x, z, scales[k]);
  return 1 - depth * smoothstep(edges[0], edges[1], n);
}

/** A reef's cover, 0–1, from how far it stands above the sand round it, m (`REEF_RELIEF`). */
export function reliefCover(relief: number): number {
  return smoothstep(REEF_RELIEF[0], REEF_RELIEF[1], relief);
}

/**
 * The Canyon's reef cover at (x, z): its terrace (the arm, its end and its back reef) where it stands above the sand bed
 * it is built on, the platform and the beach face (`canyon` in Bathymetry.ts takes the shallowest of the three), mottled.
 * It follows the terrace wherever its shape puts it; past the arm's end, where the terrace tapers into the platform, and
 * on the beach face inshore of the back reef, the floor is sand.
 */
export function canyonReefCover(c: CanyonShape): (x: number, z: number) => number {
  return (x, z) => {
    const offshore = -z;
    if (offshore <= 0) return 0;
    const sand = Math.min(c.shelfDepth, offshore * c.shoreSlope);
    const cover = reliefCover(sand - canyonTerraceDepth(x, z, c));
    return cover > 0 ? cover * reefMottle(x, z) : 0;
  };
}

/** A spot's reef cover function, or none where its drawn bed is one albedo (every spot but the Canyon). */
export function reefCoverFor(spot: SpotName, canyonBed?: CanyonBed): ((x: number, z: number) => number) | undefined {
  return spot === 'canyon' ? canyonReefCover(canyonShape(canyonBed)) : undefined;
}

/**
 * The bed's height and reef cover at a point, bilinear over the render nodes as `waterBedAt` (the bed texture's red and
 * green): one lookup for both. Needs `waterVertexPars`.
 */
export const reefBedVertexPars = /* glsl */ `
varying float vWaterReef;
vec2 waterBedReefAt( vec2 xz ) {
  vec2 g = ( xz - waterGrid.xy ) / waterGrid.z;
  g = clamp( vec2( waterFoldX( g.x ), g.y ), vec2( 0.0 ), waterGridSize - 1.0 );
  ivec2 c = min( ivec2( floor( g ) ), ivec2( waterGridSize ) - 2 );
  vec2 t = g - vec2( c );
  vec2 top = mix( texelFetch( waterBed, c, 0 ).rg, texelFetch( waterBed, c + ivec2( 1, 0 ), 0 ).rg, t.x );
  vec2 bottom = mix( texelFetch( waterBed, c + ivec2( 0, 1 ), 0 ).rg, texelFetch( waterBed, c + ivec2( 1, 1 ), 0 ).rg, t.x );
  return mix( top, bottom, t.y );
}
`;

const reefBedFragmentPars = /* glsl */ `
varying float vWaterReef;
uniform vec3 waterReefAlbedo;`;

/** The water optics' two albedo terms (`waterOpticsPars`), and the same with the reef's cover mixed in. */
const ALBEDO_SWAPS: [string, string][] = [
  ['( waterBedAlbedo - waterDeepReflectance )', '( mix( waterBedAlbedo, waterReefAlbedo, vWaterReef ) - waterDeepReflectance )'],
  ['waterBedAlbedo * bedLight * reach', 'mix( waterBedAlbedo, waterReefAlbedo, vWaterReef ) * bedLight * reach'],
];

function swapOnce(source: string, target: string, replacement: string): string {
  if (source.split(target).length !== 2) throw new Error(`The reef bed needs ${target} once`);
  return source.replace(target, () => replacement);
}

/**
 * A water program with the reef's floor: its vertex stage reads the bed's height and cover in one lookup at `xz` where
 * it read the height alone (`depthLine`, `vWaterDepth = max( 0.0, <surface> - waterBedAt( <xz> ) );`), and its
 * fragment stage mixes the albedo by the cover. Needs `waterVertexPars` in the vertex stage, and `waterOpticsPars` in
 * the fragment stage.
 */
export function withReefBed(shader: { vertexShader: string; fragmentShader: string }, depthLine: { surface: string; xz: string }): void {
  const line = `vWaterDepth = max( 0.0, ${depthLine.surface} - waterBedAt( ${depthLine.xz} ) );`;
  let vertex = swapOnce(shader.vertexShader, 'void main() {', `${reefBedVertexPars}\nvoid main() {`);
  vertex = swapOnce(vertex, line, `vec2 waterBedReef = waterBedReefAt( ${depthLine.xz} );
vWaterDepth = max( 0.0, ${depthLine.surface} - waterBedReef.x );
vWaterReef = waterBedReef.y;`);
  let fragment = swapOnce(shader.fragmentShader, '#include <common>', `#include <common>${reefBedFragmentPars}`);
  for (const [target, replacement] of ALBEDO_SWAPS) fragment = swapOnce(fragment, target, replacement);
  shader.vertexShader = vertex;
  shader.fragmentShader = fragment;
}

/** The programs' cache-key part: the reef's floor drawn or not. */
export function reefBedProgramKey(on: boolean): string {
  return on ? '-reef-bed' : '';
}

/**
 * Whether a spot's reef floor is drawn (dev: `?reefBed=off` draws every bed as its sand, as before the fix;
 * `window.waterReefBed(on)` in a page, for before-and-after stills of one held sea).
 */
export const reefBedMode = { on: devParam('reefBed') !== 'off' };
const listeners = new Set<() => void>();

/** Called whenever the switch changes: the water programs compile again. */
export function onReefBedChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setReefBed(on: boolean): void {
  if (reefBedMode.on === on) return;
  reefBedMode.on = on;
  for (const listener of listeners) listener();
}

if (DEV_TOOLS && typeof window !== 'undefined') Object.assign(window, { waterReefBed: setReefBed });
