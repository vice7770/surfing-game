import { DEV_TOOLS, devParam } from '../../devTools';
import { canyonSandDepth, canyonShape, canyonTerraceDepth, smoothstep, type CanyonBed, type CanyonShape, type SpotName } from '../../wave/Bathymetry';

/**
 * A rock floor under the water (the owner's playtest, 2026-10-22: "There is also a white colour on the left side of the
 * view, from the shorter bed of the sand. This needs to be removed"). The water's body is lit from the bed up through it
 * (`waterBodyReflectanceLit`), with one albedo for the whole spot: the Canyon's sand, 0.42/0.36/0.24, under its raised
 * shallow break too, whose 1 m top and 2 m back read near white through the shallow water, as a pale wedge from the beach
 * out to the peak (docs/research/canyon-reef-white-2026-10-22). Asked what that break should be, the owner chose rock:
 * "a grey-brown rock bed (a rocky point or ledge), darker than sand but without the coral look".
 *
 * So the bed carries a cover per render node beside its height (the bed texture's second channel): 0 sand, 1 the spot's
 * rock, and up to `ROCK_DARKEST` darker rock (its cracks and shaded blocks), and the water mixes the spot's sand albedo
 * toward its rock albedo by it (past 1, on beyond it). Drawn only: the physics' bed and its material (`SurfSpot.materialAt`,
 * for contact) are unchanged.
 */

/**
 * How far the ledge stands above the sand round it before its floor is rock, m: none below the first, all from the
 * second. A ledge's toe a few decimetres proud of the platform is still under the sand banked against it; a metre and a
 * half up it is bare rock.
 */
export const ROCK_RELIEF = [0.3, 1.5] as const;

/**
 * How the rock's floor reads, as factors on its cover (1 plain rock), all on lattices fixed to the world:
 * - `blocks`: jointed blocks and boulders about `size` m across (cellular noise, its centres jittered by `jitter` of a
 *   cell), each a shade darker or paler by up to `tone`, with their joints darker by up to `crack` over `crackWidth` m
 *   (the gap between the nearest two centres' distances);
 * - `fractures`: where the joints show, value noise on `scale` m passing `edges`: fractured stretches and smooth ledge,
 *   so the joints never run as an even paving;
 * - `patches`: broad stretches a shade darker or paler by up to `tone`, value noise on `scale` m (weed, stains);
 * - `pockets`: sand banked in its hollows, value noise on `scales` m (weighted), turning the floor toward sand by up to
 *   `depth` where it passes `edges`;
 * - `tops`: the shallowest tops, paler (barnacled and bleached) by up to `pale` from `depths[0]` m deep to `depths[1]`.
 * The pockets and tops stay a modest share toward sand: deeper, on larger scales, they read as pale blotches, white
 * again from the start's view (the first try, `09-mottle-tuning.jpg`).
 */
export const ROCK_TEXTURE = {
  blocks: { size: 7, jitter: 0.9, tone: 0.1, crack: 0.25, crackWidth: 1.2 },
  fractures: { scale: 13, edges: [0.35, 0.7] },
  patches: { scale: 20, tone: 0.12 },
  pockets: { scales: [11, 4], weights: [0.65, 0.35], edges: [0.6, 0.76], depth: 0.35 },
  tops: { depths: [1.6, 1.05], pale: 0.12 },
};

/**
 * The most the cover runs past 1, toward darker rock: the albedo stays positive in every channel while the cover is
 * below 1 + rock / (sand − rock) (1.5 and more for the Canyon's).
 */
export const ROCK_DARKEST = 1.35;

/** A lattice point's hash, 0–1 (an integer hash, so the texture is the same wherever the window stands). */
function hash(i: number, j: number, salt = 0): number {
  let h = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(salt, 0x5bd1e995);
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

/**
 * Cellular noise on a lattice of `size` m, its centres jittered by `jitter` of a cell: the distance to the nearest
 * centre's border, as the gap between the nearest two centres' distances, m, and the nearest cell's own hash, 0–1.
 */
function blocks(x: number, z: number, size: number, jitter: number): { gap: number; cell: number } {
  const u = x / size;
  const v = z / size;
  const i0 = Math.floor(u);
  const j0 = Math.floor(v);
  const inset = (1 - jitter) / 2;
  let first = Infinity;
  let second = Infinity;
  let cell = 0;
  for (let j = j0 - 1; j <= j0 + 1; j += 1) {
    for (let i = i0 - 1; i <= i0 + 1; i += 1) {
      const cx = i + inset + jitter * hash(i, j, 1);
      const cz = j + inset + jitter * hash(i, j, 2);
      const d = Math.hypot(u - cx, v - cz);
      if (d < first) {
        second = first;
        first = d;
        cell = hash(i, j, 3);
      } else if (d < second) {
        second = d;
      }
    }
  }
  return { gap: (second - first) * size, cell };
}

/**
 * The rock's floor at (x, z), `depth` m deep, as a factor on its cover: its blocks' shades and darker joints where it
 * is fractured, its broad patches, the sand in its hollows, its paler shallowest tops (`ROCK_TEXTURE`).
 */
export function rockTexture(x: number, z: number, depth: number): number {
  const { blocks: b, fractures: f, patches: q, pockets: p, tops: t } = ROCK_TEXTURE;
  const block = blocks(x, z, b.size, b.jitter);
  const joint = (1 - smoothstep(0, b.crackWidth, block.gap)) * smoothstep(f.edges[0], f.edges[1], valueNoise(x + 517, z - 263, f.scale));
  const patch = 2 * valueNoise(x - 911, z + 377, q.scale) - 1;
  let n = 0;
  for (let k = 0; k < p.scales.length; k += 1) n += p.weights[k] * valueNoise(x, z, p.scales[k]);
  const pocket = smoothstep(p.edges[0], p.edges[1], n);
  const top = smoothstep(t.depths[0], t.depths[1], depth);
  return (1 + b.tone * (2 * block.cell - 1) + q.tone * patch + b.crack * joint) * (1 - p.depth * pocket) * (1 - t.pale * top);
}

/** A ledge's cover, 0–1, from how far it stands above the sand round it, m (`ROCK_RELIEF`). */
export function reliefCover(relief: number): number {
  return smoothstep(ROCK_RELIEF[0], ROCK_RELIEF[1], relief);
}

/**
 * The Canyon's rock cover at (x, z): its terrace (the arm, its end and its back) where it stands above the sand bed it
 * is built on, the platform and the beach face (`canyon` in Bathymetry.ts takes the shallowest of the three), textured.
 * It follows the terrace wherever its shape puts it; past the arm's end, where the terrace tapers into the platform, and
 * on the beach face inshore of its back, the floor is sand. Since canyon-beach-break the sand bed includes the beach
 * sections' floor and bars (`canyonSandDepth`; the plain platform and face on the old layout): rock stays on the reef,
 * and a bar never reads as rock.
 */
export function canyonRockCover(c: CanyonShape): (x: number, z: number) => number {
  return (x, z) => {
    const offshore = -z;
    if (offshore <= 0) return 0;
    const sand = canyonSandDepth(x, z, c);
    const terrace = canyonTerraceDepth(x, z, c);
    const cover = reliefCover(sand - terrace);
    return cover > 0 ? Math.min(ROCK_DARKEST, cover * rockTexture(x, z, Math.min(sand, terrace))) : 0;
  };
}

/** A spot's rock cover function, or none where its drawn bed is one albedo (every spot but the Canyon). */
export function rockCoverFor(spot: SpotName, canyonBed?: CanyonBed): ((x: number, z: number) => number) | undefined {
  return spot === 'canyon' ? canyonRockCover(canyonShape(canyonBed)) : undefined;
}

/**
 * The bed's height and rock cover at a point, bilinear over the render nodes as `waterBedAt` (the bed texture's red and
 * green): one lookup for both. Needs `waterVertexPars`.
 */
export const rockBedVertexPars = /* glsl */ `
varying float vWaterRock;
vec2 waterBedRockAt( vec2 xz ) {
  vec2 g = ( xz - waterGrid.xy ) / waterGrid.z;
  g = clamp( vec2( waterFoldX( g.x ), g.y ), vec2( 0.0 ), waterGridSize - 1.0 );
  ivec2 c = min( ivec2( floor( g ) ), ivec2( waterGridSize ) - 2 );
  vec2 t = g - vec2( c );
  vec2 top = mix( texelFetch( waterBed, c, 0 ).rg, texelFetch( waterBed, c + ivec2( 1, 0 ), 0 ).rg, t.x );
  vec2 bottom = mix( texelFetch( waterBed, c + ivec2( 0, 1 ), 0 ).rg, texelFetch( waterBed, c + ivec2( 1, 1 ), 0 ).rg, t.x );
  return mix( top, bottom, t.y );
}
`;

const rockBedFragmentPars = /* glsl */ `
varying float vWaterRock;
uniform vec3 waterRockAlbedo;`;

/** The water optics' two albedo terms (`waterOpticsPars`), and the same with the rock's cover mixed in (on past 1). */
const ALBEDO_SWAPS: [string, string][] = [
  ['( waterBedAlbedo - waterDeepReflectance )', '( mix( waterBedAlbedo, waterRockAlbedo, vWaterRock ) - waterDeepReflectance )'],
  ['waterBedAlbedo * bedLight * reach', 'mix( waterBedAlbedo, waterRockAlbedo, vWaterRock ) * bedLight * reach'],
];

function swapOnce(source: string, target: string, replacement: string): string {
  if (source.split(target).length !== 2) throw new Error(`The rock bed needs ${target} once`);
  return source.replace(target, () => replacement);
}

/**
 * A water program with the rock's floor: its vertex stage reads the bed's height and cover in one lookup at `xz` where
 * it read the height alone (`depthLine`, `vWaterDepth = max( 0.0, <surface> - waterBedAt( <xz> ) );`), and its
 * fragment stage mixes the albedo by the cover. Needs `waterVertexPars` in the vertex stage, and `waterOpticsPars` in
 * the fragment stage.
 */
export function withRockBed(shader: { vertexShader: string; fragmentShader: string }, depthLine: { surface: string; xz: string }): void {
  const line = `vWaterDepth = max( 0.0, ${depthLine.surface} - waterBedAt( ${depthLine.xz} ) );`;
  let vertex = swapOnce(shader.vertexShader, 'void main() {', `${rockBedVertexPars}\nvoid main() {`);
  vertex = swapOnce(vertex, line, `vec2 waterBedRock = waterBedRockAt( ${depthLine.xz} );
vWaterDepth = max( 0.0, ${depthLine.surface} - waterBedRock.x );
vWaterRock = waterBedRock.y;`);
  let fragment = swapOnce(shader.fragmentShader, '#include <common>', `#include <common>${rockBedFragmentPars}`);
  for (const [target, replacement] of ALBEDO_SWAPS) fragment = swapOnce(fragment, target, replacement);
  shader.vertexShader = vertex;
  shader.fragmentShader = fragment;
}

/** The programs' cache-key part: the rock's floor drawn or not. */
export function rockBedProgramKey(on: boolean): string {
  return on ? '-rock-bed' : '';
}

/**
 * Whether a spot's rock floor is drawn (dev: `?rockBed=off`, or `?reefBed=off` as before, draws every bed as its sand,
 * as before the fix; `window.waterRockBed(on)`, or `waterReefBed(on)`, in a page, for before-and-after stills of one held
 * sea).
 */
export const rockBedMode = { on: (devParam('rockBed') ?? devParam('reefBed')) !== 'off' };
const listeners = new Set<() => void>();

/** Called whenever the switch changes: the water programs compile again. */
export function onRockBedChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setRockBed(on: boolean): void {
  if (rockBedMode.on === on) return;
  rockBedMode.on = on;
  for (const listener of listeners) listener();
}

if (DEV_TOOLS && typeof window !== 'undefined') Object.assign(window, { waterRockBed: setRockBed, waterReefBed: setRockBed });
