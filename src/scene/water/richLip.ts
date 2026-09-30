import { LINK_TIME } from '../../wave/PlungingLip';
import { LIP_STRIDE } from '../../wave/SurfZoneRunner';
import { CREST_SCATTER, waterOpticsPars } from '../waterOptics';
import { RICH_REFLECTION, richReflectionPars } from './richWaterGlsl';

/** Spline points drawn between neighbouring parcels, along the strip and across the peel. */
export const LIP_SUBDIVISIONS = 3;
/** Lip water whitens to foam over this long in the air, s (as the Classic sheet). */
const FOAM_AGE = 0.6;

/**
 * How thick a sheet of lip water is, m: a parcel's volume over the area of
 * sheet it stands for (its spacing along the strip by the column's width). The
 * spacing is at least the water's own compact size, √(volume / width): parcels
 * just thrown still bunch up at the crest, and water that has not yet stretched
 * into a sheet is a blob, not a slab thicker than it is long.
 */
export function lipThickness(volume: number, spacing: number, width: number): number {
  if (!(volume > 0)) return 0;
  return volume / (Math.max(spacing, Math.sqrt(volume / width)) * width);
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
interface Strip { column: number; launchTime: number; kind: number; nodes: (Node | undefined)[] }

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
 * surface (LIP_SUBDIVISIONS points between parcels both ways, or
 * `subdivisions`: the Particles setting draws fewer), with two faces
 * half the water's thickness either side, meeting in a rounded edge wherever
 * the sheet ends. A strip's
 * side with no linked neighbour gets a half-column ribbon, as the Classic
 * sheet has. Only flying parcels are drawn; a strip breaks where they landed.
 */
export function buildRichLipSheet(parcels: Float32Array, count: number, width: number, subdivisions = LIP_SUBDIVISIONS): RichLipGeometry {
  const strips = new Map<string, Strip>();
  for (let i = 0; i < count; i += 1) {
    const o = i * LIP_STRIDE;
    const column = parcels[o + 3];
    const launchTime = parcels[o + 5];
    const kind = parcels[o + 8];
    const key = `${column}|${launchTime}|${kind}`;
    let strip = strips.get(key);
    if (!strip) strips.set(key, (strip = { column, launchTime, kind, nodes: [] }));
    const index = parcels[o + 4];
    strip.nodes[index] = {
      p: [parcels[o], parcels[o + 1], parcels[o + 2]],
      // A splash-up (G9) is whitewater from the start.
      foam: kind === 1 ? 1 : Math.max(Math.min(1, parcels[o + 6] / FOAM_AGE), index === 0 ? 1 : 0),
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
      if (hasLeft.has(other) || other.kind !== strip.kind || Math.abs(other.launchTime - strip.launchTime) >= LINK_TIME) continue;
      if (!best || Math.abs(other.launchTime - strip.launchTime) < Math.abs(best.launchTime - strip.launchTime)) best = other;
    }
    if (best) {
      right.set(strip, best);
      hasLeft.add(best);
    }
  }
  const out = sheet.clear();
  for (const start of strips.values()) {
    if (hasLeft.has(start)) continue;
    const chain: Strip[] = [start];
    for (let next = right.get(start); next; next = right.get(next)) chain.push(next);
    emitChain(chain, width, out, subdivisions);
  }
  return out.geometry();
}

/**
 * The sheet as it is built: typed arrays grown as they fill and kept from build
 * to build, so a build makes its five buffers rather than an array for every
 * point (the page rebuilds the sheet for every snapshot).
 */
class SheetOut {
  positions = new Float32Array(3 * 1024);
  normals = new Float32Array(3 * 1024);
  foam = new Float32Array(1024);
  thickness = new Float32Array(1024);
  indices = new Uint32Array(6 * 1024);
  vertices = 0;
  indexCount = 0;

  /** Room for `vertices` more vertices and `indices` more indices. */
  reserve(vertices: number, indices: number): void {
    const grow = <T extends Float32Array | Uint32Array>(array: T, needed: number): T => {
      if (needed <= array.length) return array;
      const larger = new (array.constructor as new (length: number) => T)(Math.max(needed, 2 * array.length));
      larger.set(array);
      return larger;
    };
    const total = this.vertices + vertices;
    this.positions = grow(this.positions, 3 * total);
    this.normals = grow(this.normals, 3 * total);
    this.foam = grow(this.foam, total);
    this.thickness = grow(this.thickness, total);
    this.indices = grow(this.indices, this.indexCount + indices);
  }

  clear(): this {
    this.vertices = 0;
    this.indexCount = 0;
    return this;
  }

  geometry(): RichLipGeometry {
    return {
      positions: this.positions.slice(0, 3 * this.vertices),
      normals: this.normals.slice(0, 3 * this.vertices),
      foam: this.foam.slice(0, this.vertices),
      thickness: this.thickness.slice(0, this.vertices),
      indices: this.indices.slice(0, this.indexCount),
    };
  }
}
const sheet = new SheetOut();

/** One chain as a grid of nodes, a phantom half-column ribbon edge at each open end, drawn cell by cell. */
function emitChain(chain: Strip[], width: number, out: SheetOut, subdivisions: number): void {
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
      }, out, subdivisions);
    }
  }
}

/** One cell's points (at most (LIP_SUBDIVISIONS + 2)² of them), reused from cell to cell. */
function cellPoints(size: number) {
  const make = () => new Float64Array(size);
  return {
    midX: make(), midY: make(), midZ: make(), normalX: make(), normalY: make(), normalZ: make(),
    outX: make(), outY: make(), outZ: make(), taper: make(), thick: make(), white: make(),
  };
}
let cell = cellPoints((LIP_SUBDIVISIONS + 2) ** 2);
/** A point's position and its slopes across (s) and along (t) the sheet, per axis. */
const point = new Float64Array(3);
const slopeS = new Float64Array(3);
const slopeT = new Float64Array(3);
/** For each line of points along a cell (its t), the control net's four rows at t and their slopes, per axis: they hold across the cell. */
let rowsAt = new Float64Array((LIP_SUBDIVISIONS + 2) * 3 * 8);

function emitCell(net: Vec[][], corners: Node[], open: { left: boolean; right: boolean; front: boolean; back: boolean }, out: SheetOut, subdivisions: number): void {
  const n = subdivisions + 1;
  const points = (n + 1) * (n + 1);
  if (cell.midX.length < points) cell = cellPoints(points);
  const { midX, midY, midZ, normalX, normalY, normalZ, outX, outY, outZ, taper, thick, white } = cell;
  const [row0, row1, row2, row3] = net;
  const [c00, c10, c01, c11] = corners;
  // Along each row of the control net first: the same for every point at that t.
  if (rowsAt.length < (n + 1) * 24) rowsAt = new Float64Array((n + 1) * 24);
  for (let b = 0; b <= n; b += 1) {
    const t = b / n;
    for (let axis = 0; axis < 3; axis += 1) {
      const o = (b * 3 + axis) * 8;
      rowsAt[o] = cr(row0[0][axis], row0[1][axis], row0[2][axis], row0[3][axis], t);
      rowsAt[o + 1] = cr(row1[0][axis], row1[1][axis], row1[2][axis], row1[3][axis], t);
      rowsAt[o + 2] = cr(row2[0][axis], row2[1][axis], row2[2][axis], row2[3][axis], t);
      rowsAt[o + 3] = cr(row3[0][axis], row3[1][axis], row3[2][axis], row3[3][axis], t);
      rowsAt[o + 4] = crSlope(row0[0][axis], row0[1][axis], row0[2][axis], row0[3][axis], t);
      rowsAt[o + 5] = crSlope(row1[0][axis], row1[1][axis], row1[2][axis], row1[3][axis], t);
      rowsAt[o + 6] = crSlope(row2[0][axis], row2[1][axis], row2[2][axis], row2[3][axis], t);
      rowsAt[o + 7] = crSlope(row3[0][axis], row3[1][axis], row3[2][axis], row3[3][axis], t);
    }
  }
  for (let a = 0; a <= n; a += 1) {
    const s = a / n;
    for (let b = 0; b <= n; b += 1) {
      const t = b / n;
      const j = a * (n + 1) + b;
      for (let axis = 0; axis < 3; axis += 1) {
        // Then across the rows.
        const o = (b * 3 + axis) * 8;
        point[axis] = cr(rowsAt[o], rowsAt[o + 1], rowsAt[o + 2], rowsAt[o + 3], s);
        slopeS[axis] = crSlope(rowsAt[o], rowsAt[o + 1], rowsAt[o + 2], rowsAt[o + 3], s);
        slopeT[axis] = cr(rowsAt[o + 4], rowsAt[o + 5], rowsAt[o + 6], rowsAt[o + 7], s);
      }
      const cx = slopeS[1] * slopeT[2] - slopeS[2] * slopeT[1];
      const cy = slopeS[2] * slopeT[0] - slopeS[0] * slopeT[2];
      const cz = slopeS[0] * slopeT[1] - slopeS[1] * slopeT[0];
      const size = Math.hypot(cx, cy, cz);
      midX[j] = point[0];
      midY[j] = point[1];
      midZ[j] = point[2];
      const flat = !(size > 1e-9);
      normalX[j] = flat ? 0 : cx / size;
      normalY[j] = flat ? 1 : cy / size;
      normalZ[j] = flat ? 0 : cz / size;
      // A rounded edge: toward an open edge the sheet thins as √(distance), and its normals turn outward.
      const sizeS = Math.hypot(slopeS[0], slopeS[1], slopeS[2]) || 1;
      const sizeT = Math.hypot(slopeT[0], slopeT[1], slopeT[2]) || 1;
      const fl = open.left ? Math.sqrt(s) : 1;
      const fr = open.right ? Math.sqrt(1 - s) : 1;
      const ff = open.front ? Math.sqrt(t) : 1;
      const fb = open.back ? Math.sqrt(1 - t) : 1;
      taper[j] = fl * fr * ff * fb;
      const across = (1 - fr) - (1 - fl);
      const lengthwise = (1 - fb) - (1 - ff);
      outX[j] = (slopeS[0] / sizeS) * across + (slopeT[0] / sizeT) * lengthwise;
      outY[j] = (slopeS[1] / sizeS) * across + (slopeT[1] / sizeT) * lengthwise;
      outZ[j] = (slopeS[2] / sizeS) * across + (slopeT[2] / sizeT) * lengthwise;
      thick[j] = taper[j] * ((c00.thickness * (1 - s) + c10.thickness * s) * (1 - t) + (c01.thickness * (1 - s) + c11.thickness * s) * t);
      white[j] = (c00.foam * (1 - s) + c10.foam * s) * (1 - t) + (c01.foam * (1 - s) + c11.foam * s) * t;
    }
  }
  const face = (side: number): void => {
    out.reserve(points, 6 * n * n);
    const first = out.vertices;
    const { positions, normals, foam, thickness, indices } = out;
    for (let j = 0; j < points; j += 1) {
      const v = out.vertices;
      const h = (side * thick[j]) / 2;
      positions[3 * v] = midX[j] + normalX[j] * h;
      positions[3 * v + 1] = midY[j] + normalY[j] * h;
      positions[3 * v + 2] = midZ[j] + normalZ[j] * h;
      const k = side * taper[j];
      const sx = normalX[j] * k + outX[j];
      const sy = normalY[j] * k + outY[j];
      const sz = normalZ[j] * k + outZ[j];
      const size = Math.hypot(sx, sy, sz) || 1;
      normals[3 * v] = sx / size;
      normals[3 * v + 1] = sy / size;
      normals[3 * v + 2] = sz / size;
      foam[v] = white[j];
      thickness[v] = thick[j];
      out.vertices += 1;
    }
    for (let a = 0; a < n; a += 1) {
      for (let b = 0; b < n; b += 1) {
        const p = first + a * (n + 1) + b;
        const q = p + n + 1;
        const r = p + 1;
        const u = p + n + 2;
        const o = out.indexCount;
        if (side > 0) {
          indices[o] = p; indices[o + 1] = q; indices[o + 2] = r; indices[o + 3] = q; indices[o + 4] = u; indices[o + 5] = r;
        } else {
          indices[o] = p; indices[o + 1] = r; indices[o + 2] = q; indices[o + 3] = q; indices[o + 4] = r; indices[o + 5] = u;
        }
        out.indexCount += 6;
      }
    }
  };
  // The faces meet along every open edge (the taper), so the lip closes with no rim.
  face(1);
  face(-1);
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
  vec3 lipN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  float lipBehind = pow( max( 0.0, dot( -lipV, waterSunDirection ) ), 4.0 );
  totalEmissiveRadiance += ${CREST_SCATTER.toFixed(3)} * ( 1.0 - vLipFoam ) * lipBehind * waterSunRadiance * exp( -waterAttenuation * vLipThickness );
  #ifdef ENVMAP_TYPE_CUBE_UV
    // The sky's light through the lip along the view ray, dimmed by Beer–Lambert over the path through it.
    vec3 lipThrough = -lipV;
    // Only where sky lies behind the lip: looking down onto it, the tube's water is there instead.
    float lipSkyward = smoothstep( -0.1, 0.2, lipThrough.y );
    lipThrough.y = max( lipThrough.y, 0.05 );
    vec3 lipSky = textureCubeUV( envMap, envMapRotation * normalize( lipThrough ), 0.4 ).rgb * envMapIntensity;
    float lipCos = abs( dot( lipN, lipV ) );
    float lipPath = vLipThickness / max( 0.25, lipCos );
    totalEmissiveRadiance += lipSkyward * ( 1.0 - vLipFoam ) * lipSky * exp( -waterAttenuation * lipPath ) * ( 1.0 - waterFresnel( lipCos ) );
  #endif
  diffuseColor.rgb = mix( waterDeepReflectance * waterBodyGain, lipFoamColor, vLipFoam * vLipFoam );
  roughnessFactor = mix( roughnessFactor, 0.7, vLipFoam );
  diffuseColor.a = mix( max( 0.55, 1.0 - exp( -4.0 * vLipThickness ) ), 0.97, vLipFoam );
}`;

export { RICH_REFLECTION as RICH_LIP_REFLECTION };
