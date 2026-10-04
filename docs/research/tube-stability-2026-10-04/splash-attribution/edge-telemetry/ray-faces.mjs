// Pure CPU observation. Serialize inspectSweptRay.toString() into the existing paused page;
// no material, geometry, camera, worker or render changes are made.
export function inspectSweptRay(loft, mesh, origin, direction, options = {}) {
  const S = 134, EXT = 3;
  const geometry = mesh.geometry;
  const p = geometry.getAttribute('position').array;
  const normals = geometry.getAttribute('normal').array;
  const indices = geometry.index.array;
  const matrix = mesh.matrixWorld.elements;
  const length = Math.hypot(...direction);
  if (!(length > 0) || !origin.every(Number.isFinite)) throw Error('Invalid ray');
  const ray = direction.map(v => v / length);
  const near = options.near ?? 0.1, far = options.far ?? 3000;
  const start = geometry.drawRange.start;
  const end = Math.min(indices.length, start + geometry.drawRange.count);
  if (!Number.isFinite(end) || end % 3 || start % 3) throw Error('Invalid active triangle range');
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const det = matrix[0] * (matrix[5] * matrix[10] - matrix[6] * matrix[9])
    - matrix[4] * (matrix[1] * matrix[10] - matrix[2] * matrix[9])
    + matrix[8] * (matrix[1] * matrix[6] - matrix[2] * matrix[5]);
  if (!(Math.abs(det) > 1e-12)) throw Error('Singular mesh transform');
  // Three reverses gl.frontFace for a reflected world transform.
  const winding = det < 0 ? -1 : 1;
  const world = v => {
    const i = 3 * v, x = p[i], y = p[i + 1], z = p[i + 2];
    return [matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
      matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
      matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]];
  };
  const hits = [];
  for (let t = start; t < end; t += 3) {
    const ids = [indices[t], indices[t + 1], indices[t + 2]];
    const a = world(ids[0]), b = world(ids[1]), c = world(ids[2]);
    const e1 = sub(b, a), e2 = sub(c, a), pv = cross(ray, e2);
    const determinant = dot(e1, pv);
    if (Math.abs(determinant) < 1e-9) continue;
    const tv = sub(origin, a), u = dot(tv, pv) / determinant;
    if (u < 0 || u > 1) continue;
    const qv = cross(tv, e1), v = dot(ray, qv) / determinant;
    if (v < 0 || u + v > 1) continue;
    const distance = dot(e2, qv) / determinant;
    if (!(distance > near && distance < far)) continue;
    const normal = cross(e1, e2), normalLength = Math.hypot(...normal);
    const facingCosine = winding * dot(normal, ray) / normalLength;
    const points = ids.map(i => i % S - EXT), rows = ids.map(i => Math.floor(i / S));
    const region = points.every(i => i >= 64 && i <= 88) ? 'explicit lip underside'
      : points.every(i => i >= 32 && i <= 64) ? 'outer lip'
      : points.every(i => i >= 88 && i <= 112) ? 'inner face'
      : points.every(i => i < 32) ? 'back/behind crest'
      : points.every(i => i > 112) ? 'forward rest/extension' : 'region transition';
    const weights = [1 - u - v, u, v];
    const attr = name => {
      const attribute = geometry.getAttribute(name);
      return attribute ? weights.reduce((sum, weight, k) => sum + weight * attribute.array[ids[k]], 0) : null;
    };
    const localPoint = i => Array.from(p.subarray(3 * i, 3 * i + 3));
    const localNormal = cross(sub(localPoint(ids[1]), localPoint(ids[0])), sub(localPoint(ids[2]), localPoint(ids[0])));
    const normalSum = [0, 1, 2].map(k => ids.reduce((sum, i) => sum + normals[3 * i + k], 0));
    hits.push({ distance, triangle: t / 3, indices: ids, rows, front: loft.sliceFront[rows[0]],
      sigmas: rows.map(r => loft.sliceSigma[r]), profilePoints: points, region,
      frontFacing: facingCosine < 0, facingCosine, localFaceDotVertexNormals: dot(localNormal, normalSum),
      barycentric: weights, point: origin.map((o, k) => o + ray[k] * distance),
      liftedShare: attr('sweptLift'), sheetWeight: attr('sweptSheetWeight'),
      sheetThickness: attr('sweptSheet'), sheetBack: attr('sweptSheetBack'),
      vertices: [a, b, c] });
  }
  hits.sort((a, b) => a.distance - b.distance || a.triangle - b.triangle);
  return { origin, direction: ray, near, far, matrixDeterminant: det, activeIndices: end - start,
    rendererMaterialSide: mesh.material.side, nearestDoubleSide: hits[0] ?? null,
    nearestFrontSide: hits.find(hit => hit.frontFacing) ?? null, intersectionCount: hits.length,
    firstHits: hits.slice(0, options.hitLimit ?? 8),
    scope: 'Actual active rendered indices after facesOut and world transform. Geometry intersections only: no mask/dither, depth-buffer or other-object visibility claim.' };
}

export const ORIGINAL_INSIDE_RAY = {
  origin: [150.38248443603516, 0.8194682382047176, -6.938247728347777],
  direction: [-0.986548476071142, 0, -0.16346897063879595],
  near: 0.1, far: 3000,
  expectedFirstDistance: 0.5390014859701542,
  expectedFirstRegion: 'explicit lip underside', expectedFront: 48,
  expectedRowsInclude: 124, expectedProfilePoints: [72, 71, 72],
  seaTime: 553.173058749449,
  source: '/private/tmp/tube-air-final-20261004/native-first/report.json pair 0 A/B'
};

export const CURRENT_CORRIDOR_RAY = {
  origin: [150.38248443603516, 0.9919247127328497, -6.938247728347777],
  direction: [149.53682556152341 - 150.38248443603516,
    1.042839273029157 - 0.9919247127328497, -7.588870120048522 + 6.938247728347777],
  near: 0.1, far: 3000,
  expectedFirstDistance: 1.6283876423278953,
  expectedFirstRegion: 'explicit lip underside', expectedFront: 48,
  expectedRowsInclude: 122, expectedProfilePoints: [72, 71, 72],
  seaTime: 553.173058749449,
  source: '/private/tmp/tube-corridor-20261004/native-first/report.json pair 0 A/B'
};
