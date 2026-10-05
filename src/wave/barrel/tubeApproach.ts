import { LANDMARK } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, type LoftResult } from './sweptLoft';

export interface TubeBodyPoint { x: number; y: number; z: number; radius: number }
export interface TubeApproachRequest {
  x: number; z: number; seaTime: number;
  /** Highest body point over the board/floor reference, not maxY minus minY. */
  bodyHeight: number;
  /** Conservative horizontal half extents along the front and its shoreward ray. */
  halfWidth: number; halfDepth: number;
  /** Source ray of those extents, when they were measured in another front's frame. Both fields are required together. */
  envelopeRayX?: number; envelopeRayZ?: number;
  body: readonly TubeBodyPoint[];
  preferredFront?: number;
  /** Geometric search distance only; the controller owns moving-mouth interception. */
  reach?: number;
}
export interface TubeRoutePoint { x: number; z: number; floorY: number; roofY: number }
export interface TubeApproachCue {
  seaTime: number; geometryStep: number;
  frontId: number; sigma: number; sigmaMin: number; sigmaMax: number;
  rayX: number; rayZ: number; tangentX: number; tangentZ: number;
  mouth: TubeRoutePoint; inside: TubeRoutePoint;
  /** Smallest actual floor/roof gap on the finite route, not spare headroom. */
  minimumClearance: number;
  usableHalfWidth: number;
  bodyFitsMouth: boolean; bodyInCavity: boolean;
}

const EPS = 1e-8;
const FLOOR_CLEARANCE = 0.03;
const SAMPLE = 0.05;
type Vec = [number, number, number];
interface Triangle {
  a: number; b: number; c: number; row: number; lastRow: number;
  ax: number; az: number; bx: number; bz: number; cx: number; cz: number;
  vertices?: [Vec, Vec, Vec];
}
interface Column { floor: number; roof: number; top: number }
interface Station { q: number; bottom: number; column: Column }

export function validTubeApproachRequest(r: TubeApproachRequest): boolean {
  return [r.x, r.z, r.seaTime, r.bodyHeight, r.halfWidth, r.halfDepth, r.reach ?? 15].every(Number.isFinite)
    && r.bodyHeight > 0 && r.halfWidth > 0 && r.halfDepth > 0 && (r.reach ?? 15) > 0
    && (r.envelopeRayX === undefined && r.envelopeRayZ === undefined
      || Number.isFinite(r.envelopeRayX) && Number.isFinite(r.envelopeRayZ) && Math.hypot(r.envelopeRayX!, r.envelopeRayZ!) > 0)
    && r.body.every(p => [p.x, p.y, p.z, p.radius].every(Number.isFinite) && p.radius >= 0);
}

/**
 * A detached route observation from one actual indexed joined run. `prepareRow` is the private contact's lazy-Y
 * hook; no normals are needed. The route sweeps a finite box from shoreward exterior to interior along -ray.
 * A smaller clear air envelope may retain a cue when the current body does not fit; bodyFitsMouth stays false.
 * Neither that cue nor bodyInCavity certifies a ridden entry, travel, exit or future physical reachability.
 */
export function routeForStrip(
  loft: LoftResult, strip: number, fraction: number, request: TubeApproachRequest, geometryStep = 0,
  prepareRow?: (row: number) => void,
  triangleOffsets?: readonly number[],
): TubeApproachCue | undefined {
  if (!validTubeApproachRequest(request) || !Number.isInteger(strip) || strip < 0 || strip + 1 >= loft.sliceCount
    || !Number.isFinite(fraction) || fraction < 0 || fraction > 1 || loft.sliceJoined[strip] !== 1
    || loft.sliceFront[strip] !== loft.sliceFront[strip + 1]
    || !(loft.sliceWeight[strip] > 0 && loft.sliceWeight[strip + 1] > 0)
    || loft.slicePhase[strip] !== 1 || loft.slicePhase[strip + 1] !== 1) return undefined;
  const frontId = loft.sliceFront[strip];
  let first = strip, last = strip + 1;
  while (first > 0 && loft.sliceJoined[first - 1] === 1 && loft.sliceFront[first - 1] === frontId) first--;
  while (last + 1 < loft.sliceCount && loft.sliceJoined[last] === 1 && loft.sliceFront[last + 1] === frontId) last++;
  const p = loft.positions;
  const cap = (row: number) => 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.lip);
  const a = cap(strip), b = cap(strip + 1);
  const between = (a: number, b: number) => fraction === 0 ? a : fraction === 1 ? b : a + fraction * (b - a);
  const originX = between(p[a], p[b]);
  const originZ = between(p[a + 2], p[b + 2]);
  let rayX = between(loft.sliceRayX[strip], loft.sliceRayX[strip + 1]);
  let rayZ = between(loft.sliceRayZ[strip], loft.sliceRayZ[strip + 1]);
  const length = Math.hypot(rayX, rayZ);
  if (!(length > 0) || Math.hypot(originX - request.x, originZ - request.z) > (request.reach ?? 15)) return undefined;
  rayX /= length; rayZ /= length;
  const tangentX = rayZ, tangentZ = -rayX;
  let halfWidth = request.halfWidth, halfDepth = request.halfDepth;
  if (request.envelopeRayX !== undefined && request.envelopeRayZ !== undefined) {
    const length = Math.hypot(request.envelopeRayX, request.envelopeRayZ);
    const x = request.envelopeRayX / length, z = request.envelopeRayZ / length;
    const along = Math.abs(z * tangentX - x * tangentZ), across = Math.abs(x * tangentX + z * tangentZ);
    halfWidth = along * request.halfWidth + across * request.halfDepth;
    halfDepth = across * request.halfWidth + along * request.halfDepth;
  }
  // The supplied posture is authoritative even when a curved front turns away from the request's footprint frame.
  for (const body of request.body) {
    const dx = body.x - request.x, dz = body.z - request.z;
    halfWidth = Math.max(halfWidth, Math.abs(dx * tangentX + dz * tangentZ) + body.radius);
    halfDepth = Math.max(halfDepth, Math.abs(dx * rayX + dz * rayZ) + body.radius);
  }
  const into = Math.max(0.45, halfDepth + 0.1);
  const out = into;
  const steps = Math.ceil((into + out) / Math.min(SAMPLE, halfDepth / 2));
  if (steps > 512) return undefined;
  // Include actual body columns as well as the route. XZ is already stored even in the deferred backend.
  let tMin = -halfWidth, tMax = halfWidth;
  let qMin = -into - halfDepth, qMax = out + halfDepth;
  for (const body of request.body) {
    const dx = body.x - originX, dz = body.z - originZ;
    const t = dx * tangentX + dz * tangentZ, q = dx * rayX + dz * rayZ;
    tMin = Math.min(tMin, t - body.radius); tMax = Math.max(tMax, t + body.radius);
    qMin = Math.min(qMin, q - body.radius); qMax = Math.max(qMax, q + body.radius);
  }
  const triangles: Triangle[] = [];
  const local = (v: number): [number, number] => {
    const dx = p[3 * v] - originX, dz = p[3 * v + 2] - originZ;
    return [dx * tangentX + dz * tangentZ, dx * rayX + dz * rayZ];
  };
  for (let k = 0; k < (triangleOffsets?.length ?? Math.floor(loft.indexCount / 3)); k++) {
    const i = triangleOffsets ? triangleOffsets[k] : 3 * k;
    if (!Number.isInteger(i) || i < 0 || i % 3 !== 0 || i + 2 >= loft.indexCount) return undefined;
    const ia = loft.indices[i], ib = loft.indices[i + 1], ic = loft.indices[i + 2];
    if (Math.max(ia, ib, ic) >= loft.vertexCount) return undefined;
    const [ax, az] = local(ia), [bx, bz] = local(ib), [cx, cz] = local(ic);
    if (Math.max(ax, bx, cx) < tMin || Math.min(ax, bx, cx) > tMax
      || Math.max(az, bz, cz) < qMin || Math.min(az, bz, cz) > qMax) continue;
    triangles.push({ a: ia, b: ib, c: ic, row: Math.floor(Math.min(ia, ib, ic) / LOFT_SAMPLES),
      lastRow: Math.floor(Math.max(ia, ib, ic) / LOFT_SAMPLES), ax, az, bx, bz, cx, cz });
  }
  const prepared = new Set<number>();
  const vertices = (tri: Triangle): [Vec, Vec, Vec] => {
    if (!tri.vertices) {
      for (const v of [tri.a, tri.b, tri.c]) {
        const row = Math.floor(v / LOFT_SAMPLES);
        if (row < loft.sliceCount && !prepared.has(row)) { prepareRow?.(row); prepared.add(row); }
      }
      tri.vertices = [[tri.ax, p[3 * tri.a + 1], tri.az], [tri.bx, p[3 * tri.b + 1], tri.bz], [tri.cx, p[3 * tri.c + 1], tri.cz]];
    }
    return tri.vertices;
  };
  const edge = (u: number, v: number, x: number, z: number) => {
    const lo = Math.min(u, v), hi = Math.max(u, v);
    const value = (p[3 * hi] - p[3 * lo]) * (z - p[3 * lo + 2]) - (p[3 * hi + 2] - p[3 * lo + 2]) * (x - p[3 * lo]);
    return u < v ? value : -value;
  };
  const insideEdge = (value: number, u: number, v: number, sign: number) => value * sign > 0 || (value === 0 && (sign > 0) === (u < v));
  const column = (x: number, z: number): Column | undefined => {
    const ys: number[] = [];
    let owner: number | undefined;
    for (const tri of triangles) {
      if (tri.row >= loft.sliceCount || tri.lastRow !== tri.row + 1 || loft.sliceJoined[tri.row] !== 1) continue;
      const area = edge(tri.a, tri.b, p[3 * tri.c], p[3 * tri.c + 2]);
      if (area === 0) continue;
      const sign = area > 0 ? 1 : -1;
      const wa = edge(tri.b, tri.c, x, z), wb = edge(tri.c, tri.a, x, z), wc = edge(tri.a, tri.b, x, z);
      if (!insideEdge(wa, tri.b, tri.c, sign) || !insideEdge(wb, tri.c, tri.a, sign) || !insideEdge(wc, tri.a, tri.b, sign)) continue;
      // Match contact's first-front authority. Never borrow a clear roof/floor from another disconnected run.
      owner ??= loft.sliceFront[tri.row];
      if (owner !== frontId) return undefined;
      if (loft.sliceFront[tri.row] !== owner) continue;
      if (tri.row < first || tri.lastRow > last) return undefined;
      const v = vertices(tri);
      ys.push((wa * v[0][1] + wb * v[1][1] + wc * v[2][1]) / area);
    }
    ys.sort((x, y) => x - y);
    if (ys.length !== 1 && ys.length !== 3 || !ys.every(Number.isFinite)) return undefined;
    if (ys.length === 3 && !(ys[0] + EPS < ys[1] && ys[1] + EPS < ys[2])) return undefined;
    return { floor: ys[0], roof: ys.length === 3 ? ys[1] : NaN, top: ys.length === 3 ? ys[2] : NaN };
  };
  const at = (t: number, q: number) => [originX + tangentX * t + rayX * q, originZ + tangentZ * t + rayZ * q];
  // Most non-mouth candidates fail here, before the finite envelope's columns and swept boxes are evaluated.
  const [outerX, outerZ] = at(0, out), outer = column(outerX, outerZ);
  const [innerX, innerZ] = at(0, -into), inner = column(innerX, innerZ);
  if (!outer || Number.isFinite(outer.roof) || !inner || !Number.isFinite(inner.roof)) return undefined;
  const stations: Station[] = [];
  let minimumClearance = Infinity;
  for (let k = 0; k <= steps; k++) {
    const q = out - (out + into) * k / steps;
    const [x, z] = at(0, q), centre = column(x, z);
    if (!centre) return undefined;
    let floor = -Infinity;
    for (const t of [-halfWidth, 0, halfWidth]) for (const depth of [-halfDepth, 0, halfDepth]) {
      const [px, pz] = at(t, q + depth), sample = column(px, pz);
      if (!sample) return undefined;
      floor = Math.max(floor, sample.floor);
      if (Number.isFinite(sample.roof)) minimumClearance = Math.min(minimumClearance, sample.roof - sample.floor);
    }
    stations.push({ q, bottom: floor + FLOOR_CLEARANCE, column: centre });
  }
  if (Number.isFinite(stations[0].column.roof) || !Number.isFinite(stations[steps].column.roof)
    || !(minimumClearance > FLOOR_CLEARANCE)) return undefined;
  const clearBox = (t: number, q: number, bottom: number, halfWidth: number, halfDepth: number, height: number) => {
    for (const tri of triangles) {
      if (Math.max(tri.ax, tri.bx, tri.cx) < t - halfWidth || Math.min(tri.ax, tri.bx, tri.cx) > t + halfWidth
        || Math.max(tri.az, tri.bz, tri.cz) < q - halfDepth || Math.min(tri.az, tri.bz, tri.cz) > q + halfDepth) continue;
      if (triangleTouchesBox(vertices(tri), [t, bottom + height / 2, q], [halfWidth, height / 2, halfDepth])) return false;
    }
    return true;
  };
  const clearRoute = (height: number) => {
    for (let k = 1; k < stations.length; k++) {
      const a = stations[k - 1], b = stations[k];
      // This contains the complete continuous translation between adjacent boxes, including their floor adjustment.
      if (!clearBox(0, (a.q + b.q) / 2, Math.min(a.bottom, b.bottom), halfWidth,
        halfDepth + Math.abs(a.q - b.q) / 2, height + Math.abs(a.bottom - b.bottom))) return false;
    }
    return true;
  };
  const bodyFitsMouth = clearRoute(request.bodyHeight);
  // Keep a real finite-width air route while ordinary crouch prepares a taller body. Do not label it a body fit.
  if (!bodyFitsMouth && !clearRoute(Math.min(request.bodyHeight, (minimumClearance - FLOOR_CLEARANCE) / 2))) return undefined;
  const entry = stations.find(s => Number.isFinite(s.column.roof))!;
  const routePoint = (s: Station): TubeRoutePoint => {
    const [x, z] = at(0, s.q);
    return { x, z, floorY: s.column.floor, roofY: s.column.roof };
  };
  const bodyInCavity = request.body.length > 0 && request.body.every(body => {
    const c = column(body.x, body.z);
    if (!c || !Number.isFinite(c.roof) || !(body.y - body.radius > c.floor + EPS && body.y + body.radius < c.roof - EPS)) return false;
    if (body.radius === 0) return true;
    const dx = body.x - originX, dz = body.z - originZ;
    return clearBox(dx * tangentX + dz * tangentZ, dx * rayX + dz * rayZ, body.y - body.radius, body.radius, body.radius, 2 * body.radius);
  });
  return { seaTime: request.seaTime, geometryStep, frontId,
    sigma: loft.sliceSigma[strip] + fraction * (loft.sliceSigma[strip + 1] - loft.sliceSigma[strip]),
    sigmaMin: loft.sliceSigma[first], sigmaMax: loft.sliceSigma[last], rayX, rayZ, tangentX, tangentZ,
    mouth: routePoint(entry), inside: routePoint(stations[steps]), minimumClearance,
    usableHalfWidth: halfWidth, bodyFitsMouth, bodyInCavity };
}

/** Triangle/box SAT in the ray/tangent frame. Touching is an obstruction; no Three backend is used. */
function triangleTouchesBox(vertices: [Vec, Vec, Vec], centre: Vec, half: Vec): boolean {
  const v = vertices.map(p => [p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]] as Vec);
  if (v.some(p => !p.every(Number.isFinite))) return true;
  const separated = (axis: Vec) => {
    if (Math.abs(axis[0]) + Math.abs(axis[1]) + Math.abs(axis[2]) < 1e-20) return false;
    const projections = v.map(p => p[0] * axis[0] + p[1] * axis[1] + p[2] * axis[2]);
    const radius = half[0] * Math.abs(axis[0]) + half[1] * Math.abs(axis[1]) + half[2] * Math.abs(axis[2]);
    return Math.min(...projections) > radius + EPS || Math.max(...projections) < -radius - EPS;
  };
  for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as Vec[]) if (separated(axis)) return false;
  const edges = v.map((p, i) => [v[(i + 1) % 3][0] - p[0], v[(i + 1) % 3][1] - p[1], v[(i + 1) % 3][2] - p[2]] as Vec);
  for (const [x, y, z] of edges) for (const axis of [[0, z, -y], [-z, 0, x], [y, -x, 0]] as Vec[]) if (separated(axis)) return false;
  const [a, b] = edges;
  return !separated([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
}
