import { LINK_TIME } from '../../wave/PlungingLip';
import { LIP_STRIDE } from '../../wave/SurfZoneRunner';
import { CREST_SCATTER, waterOpticsPars } from '../waterOptics';
import { RICH_REFLECTION, richReflectionPars } from './richWaterGlsl';

/** Spline points drawn between neighbouring parcels, along the strip and across the peel. */
export const LIP_SUBDIVISIONS = 3;
/** Lip water whitens to foam over this long in the air, s (as the Classic sheet). */
const FOAM_AGE = 0.6;

/** How thick a sheet of lip water is, m: a parcel's volume over the area of sheet it stands for (its spacing along the strip by the column's width). */
export function lipThickness(volume: number, spacing: number, width: number): number {
  return volume / (Math.max(spacing, 1e-3) * width);
}

export interface RichLipGeometry {
  positions: Float32Array;
  normals: Float32Array;
  foam: Float32Array;
  thickness: Float32Array;
  indices: Uint32Array;
}

type Vec = [number, number, number];
interface Node { p: Vec; foam: number; thickness: number }
interface Strip { column: number; launchTime: number; nodes: (Node | undefined)[] }

/** Catmull-Rom through p1…p2 at t, and its derivative in t. */
function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}
function crSlope(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * ((-p0 + p2) + 2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t + 3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t * t);
}

/**
 * The lip sheet in the Rich look (G9): its parcels' strips, chained across
 * columns where they were thrown within LINK_TIME, as one smooth Catmull-Rom
 * surface (LIP_SUBDIVISIONS points between parcels both ways), with two faces
 * half the water's thickness either side and rims round its edges. A strip's
 * side with no linked neighbour gets a half-column ribbon, as the Classic
 * sheet has. Only flying parcels are drawn; a strip breaks where they landed.
 */
export function buildRichLipSheet(parcels: Float32Array, count: number, width: number): RichLipGeometry {
  const strips = new Map<string, Strip>();
  for (let i = 0; i < count; i += 1) {
    const o = i * LIP_STRIDE;
    const column = parcels[o + 3];
    const launchTime = parcels[o + 5];
    const key = `${column}|${launchTime}`;
    let strip = strips.get(key);
    if (!strip) strips.set(key, (strip = { column, launchTime, nodes: [] }));
    const index = parcels[o + 4];
    strip.nodes[index] = {
      p: [parcels[o], parcels[o + 1], parcels[o + 2]],
      foam: Math.max(Math.min(1, parcels[o + 6] / FOAM_AGE), index === 0 ? 1 : 0),
      thickness: parcels[o + 7],
    };
  }
  // Each parcel's volume becomes a thickness over the sheet it stands for along its strip.
  for (const strip of strips.values()) {
    const { nodes } = strip;
    for (let k = 0; k < nodes.length; k += 1) {
      const node = nodes[k];
      if (!node) continue;
      const gaps: number[] = [];
      for (const other of [nodes[k - 1], nodes[k + 1]]) if (other) gaps.push(Math.hypot(other.p[0] - node.p[0], other.p[1] - node.p[1], other.p[2] - node.p[2]));
      node.thickness = gaps.length ? lipThickness(node.thickness, gaps.reduce((a, b) => a + b) / gaps.length, width) : 0;
    }
  }
  // Chains of strips linked across neighbouring columns, left to right.
  const byColumn = new Map<number, Strip[]>();
  for (const strip of strips.values()) {
    const list = byColumn.get(strip.column);
    if (list) list.push(strip);
    else byColumn.set(strip.column, [strip]);
  }
  const right = new Map<Strip, Strip>();
  const hasLeft = new Set<Strip>();
  for (const strip of [...strips.values()].sort((a, b) => a.column - b.column)) {
    let best: Strip | undefined;
    for (const other of byColumn.get(strip.column + 1) ?? []) {
      if (hasLeft.has(other) || Math.abs(other.launchTime - strip.launchTime) >= LINK_TIME) continue;
      if (!best || Math.abs(other.launchTime - strip.launchTime) < Math.abs(best.launchTime - strip.launchTime)) best = other;
    }
    if (best) {
      right.set(strip, best);
      hasLeft.add(best);
    }
  }
  const out = { positions: [] as number[], normals: [] as number[], foam: [] as number[], thickness: [] as number[], indices: [] as number[] };
  for (const start of strips.values()) {
    if (hasLeft.has(start)) continue;
    const chain: Strip[] = [start];
    for (let next = right.get(start); next; next = right.get(next)) chain.push(next);
    emitChain(chain, width, out);
  }
  return {
    positions: new Float32Array(out.positions),
    normals: new Float32Array(out.normals),
    foam: new Float32Array(out.foam),
    thickness: new Float32Array(out.thickness),
    indices: new Uint32Array(out.indices),
  };
}

type Out = { positions: number[]; normals: number[]; foam: number[]; thickness: number[]; indices: number[] };

/** One chain as a grid of nodes, a phantom half-column ribbon edge at each open end, drawn cell by cell. */
function emitChain(chain: Strip[], width: number, out: Out): void {
  const length = Math.max(...chain.map((strip) => strip.nodes.length));
  const shifted = (strip: Strip, dx: number): (Node | undefined)[] =>
    strip.nodes.map((node) => node && { ...node, p: [node.p[0] + dx, node.p[1], node.p[2]] as Vec });
  const grid: (Node | undefined)[][] = [shifted(chain[0], -width / 2), ...chain.map((strip) => strip.nodes), shifted(chain[chain.length - 1], width / 2)];
  const at = (i: number, k: number) => (i >= 0 && i < grid.length ? grid[i][k] : undefined);
  const present = (i: number, k: number) => at(i, k) !== undefined;
  const cellPresent = (i: number, k: number) => present(i, k) && present(i + 1, k) && present(i, k + 1) && present(i + 1, k + 1);
  // A missing neighbour is extrapolated, so the spline keeps its line to the edge.
  const control = (i: number, k: number, fromI: number, fromK: number): Vec => {
    const node = at(i, k);
    if (node) return node.p;
    const a = at(fromI, fromK)!.p;
    const b = at(2 * fromI - i, 2 * fromK - k)?.p ?? a;
    return [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
  };
  for (let i = 0; i + 1 < grid.length; i += 1) {
    for (let k = 0; k + 1 < length; k += 1) {
      if (!cellPresent(i, k)) continue;
      // The 4×4 control net around the cell.
      const net: Vec[][] = [];
      for (let a = -1; a <= 2; a += 1) {
        net[a + 1] = [];
        for (let b = -1; b <= 2; b += 1) {
          const ci = Math.min(Math.max(i + a, i), i + 1);
          const ck = Math.min(Math.max(k + b, k), k + 1);
          const direct = at(i + a, k + b);
          net[a + 1][b + 1] = direct ? direct.p : control(i + a, ci === i + a ? k + b : ck, ci, ck);
        }
      }
      emitCell(net, [at(i, k)!, at(i + 1, k)!, at(i, k + 1)!, at(i + 1, k + 1)!], {
        left: !cellPresent(i - 1, k), right: !cellPresent(i + 1, k), front: !cellPresent(i, k - 1), back: !cellPresent(i, k + 1),
      }, out);
    }
  }
}

function emitCell(net: Vec[][], corners: Node[], open: { left: boolean; right: boolean; front: boolean; back: boolean }, out: Out): void {
  const n = LIP_SUBDIVISIONS + 1;
  const mid: Vec[][] = [];
  const normal: Vec[][] = [];
  const thick: number[][] = [];
  const white: number[][] = [];
  for (let a = 0; a <= n; a += 1) {
    mid[a] = [];
    normal[a] = [];
    thick[a] = [];
    white[a] = [];
    const s = a / n;
    for (let b = 0; b <= n; b += 1) {
      const t = b / n;
      const p: Vec = [0, 0, 0];
      const ds: Vec = [0, 0, 0];
      const dt: Vec = [0, 0, 0];
      for (let axis = 0; axis < 3; axis += 1) {
        const along = [0, 1, 2, 3].map((row) => cr(net[row][0][axis], net[row][1][axis], net[row][2][axis], net[row][3][axis], t));
        const alongSlope = [0, 1, 2, 3].map((row) => crSlope(net[row][0][axis], net[row][1][axis], net[row][2][axis], net[row][3][axis], t));
        p[axis] = cr(along[0], along[1], along[2], along[3], s);
        ds[axis] = crSlope(along[0], along[1], along[2], along[3], s);
        dt[axis] = cr(alongSlope[0], alongSlope[1], alongSlope[2], alongSlope[3], s);
      }
      const cx = ds[1] * dt[2] - ds[2] * dt[1];
      const cy = ds[2] * dt[0] - ds[0] * dt[2];
      const cz = ds[0] * dt[1] - ds[1] * dt[0];
      const size = Math.hypot(cx, cy, cz);
      mid[a][b] = p;
      normal[a][b] = size > 1e-9 ? [cx / size, cy / size, cz / size] : [0, 1, 0];
      const [c00, c10, c01, c11] = corners;
      thick[a][b] = (c00.thickness * (1 - s) + c10.thickness * s) * (1 - t) + (c01.thickness * (1 - s) + c11.thickness * s) * t;
      white[a][b] = (c00.foam * (1 - s) + c10.foam * s) * (1 - t) + (c01.foam * (1 - s) + c11.foam * s) * t;
    }
  }
  const face = (side: number): number => {
    const first = out.positions.length / 3;
    for (let a = 0; a <= n; a += 1) {
      for (let b = 0; b <= n; b += 1) {
        const [px, py, pz] = mid[a][b];
        const [nx, ny, nz] = normal[a][b];
        const h = (side * thick[a][b]) / 2;
        out.positions.push(px + nx * h, py + ny * h, pz + nz * h);
        out.normals.push(nx * side, ny * side, nz * side);
        out.foam.push(white[a][b]);
        out.thickness.push(thick[a][b]);
      }
    }
    for (let a = 0; a < n; a += 1) {
      for (let b = 0; b < n; b += 1) {
        const v = first + a * (n + 1) + b;
        const [p, q, r, u] = [v, v + n + 1, v + 1, v + n + 2];
        if (side > 0) out.indices.push(p, q, r, q, u, r);
        else out.indices.push(p, r, q, q, r, u);
      }
    }
    return first;
  };
  const top = face(1);
  const bottom = face(-1);
  // Rims join the two faces round the cell's open edges.
  const rim = (along: [number, number][]) => {
    for (let m = 0; m + 1 < along.length; m += 1) {
      const [a0, b0] = along[m];
      const [a1, b1] = along[m + 1];
      const t0 = top + a0 * (n + 1) + b0;
      const t1 = top + a1 * (n + 1) + b1;
      const d0 = bottom + a0 * (n + 1) + b0;
      const d1 = bottom + a1 * (n + 1) + b1;
      out.indices.push(t0, d0, t1, t1, d0, d1);
    }
  };
  const line = (fixed: 'a' | 'b', value: number): [number, number][] =>
    Array.from({ length: n + 1 }, (_, m) => (fixed === 'a' ? [value, m] : [m, value]) as [number, number]);
  if (open.left) rim(line('a', 0));
  if (open.right) rim(line('a', n));
  if (open.front) rim(line('b', 0));
  if (open.back) rim(line('b', n));
}

/** The Rich lip's vertex chunk pieces: its foam and thickness per vertex, and where it is. */
export const richLipVertexPars = /* glsl */ `
attribute float foam;
attribute float thickness;
varying float vLipFoam;
varying float vLipThickness;
varying vec3 vLipWorld;
`;
export const richLipBeginVertex = /* glsl */ `#include <begin_vertex>
vLipFoam = foam;
vLipThickness = thickness;
vLipWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`;

export const richLipFragmentPars = /* glsl */ `
${waterOpticsPars}
${richReflectionPars}
uniform vec3 lipFoamColor;
varying float vLipFoam;
varying float vLipThickness;
varying vec3 vLipWorld;
`;

/**
 * The Rich lip's body (replaces <emissivemap_fragment>): the G3 deep body
 * colour, sunlight through the lip when the sun is behind it, dimmed by
 * Beer–Lambert over the lip's own thickness (green-turquoise where thin, deep
 * where thick), matte foam as it ages, and as opaque as its water is thick.
 */
export const richLipBody = /* glsl */ `#include <emissivemap_fragment>
{
  vec3 lipV = normalize( cameraPosition - vLipWorld );
  float lipBehind = pow( max( 0.0, dot( -lipV, waterSunDirection ) ), 4.0 );
  totalEmissiveRadiance += ${CREST_SCATTER.toFixed(3)} * ( 1.0 - vLipFoam ) * lipBehind * waterSunRadiance * exp( -waterAttenuation * vLipThickness );
  diffuseColor.rgb = mix( waterDeepReflectance * waterBodyGain, lipFoamColor, vLipFoam * vLipFoam );
  roughnessFactor = mix( roughnessFactor, 0.7, vLipFoam );
  diffuseColor.a = mix( max( 0.55, 1.0 - exp( -4.0 * vLipThickness ) ), 0.97, vLipFoam );
}`;

export { RICH_REFLECTION as RICH_LIP_REFLECTION };
