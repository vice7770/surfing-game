// Source-only helper. Root owns execution and acceptance. Queries below use only the existing drawn-water classifier.
export function createMatureMouthInspection(d) {
  // Every binding stays inside the factory so createMatureMouthInspection.toString() is browser-safe.
  const STRIDE = 134, E = 3, FRONT_STRIDE = 9;
  const vertexWidths = { positions: 3, normals: 3, mask: 1, lift: 1, sheet: 1, sheetWeight: 1, sheetBack: 1, throat: 4 };
  const sliceKeys = [
    'sliceFront', 'sliceSigma', 'sliceTau', 'slicePhase', 'sliceLife', 'sliceCollapse', 'sliceFade', 'sliceTipGap',
    'sliceRestHold', 'sliceRestEnd', 'sliceRestClimb', 'sliceToeClimb', 'sliceJoined', 'sliceRayX', 'sliceRayZ',
    'sliceWeight', 'sliceOverturned', 'sliceTipAlong', 'sliceTipUp', 'sliceTipTransportAlong', 'sliceTipTransportUp',
    'sliceAnchorVX', 'sliceAnchorVZ', 'sliceFormed', 'sliceTipX', 'sliceTipY', 'sliceTipZ', 'sliceMouth',
  ];
  const loftKeys = [...Object.keys(vertexWidths), 'indices', ...sliceKeys];
  const must = (condition, reason) => { if (!condition) throw new Error(reason); };
  const finite = values => values.every(Number.isFinite);
  const subtract = (a, b) => a.map((value, i) => value - b[i]);
  const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const mix = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);
  const cameraWords = camera => [
    ...camera.position.toArray(), ...camera.quaternion.toArray(), ...camera.up.toArray(), ...camera.scale.toArray(),
    ...camera.matrix.toArray(), ...camera.matrixWorld.toArray(), ...camera.matrixWorldInverse.toArray(),
    ...camera.projectionMatrix.toArray(), ...camera.projectionMatrixInverse.toArray(),
    camera.fov, camera.aspect, camera.near, camera.far, camera.zoom, camera.filmGauge, camera.filmOffset,
  ];
  function copyBytes(array, count, key) {
    must(ArrayBuffer.isView(array) && typeof array.BYTES_PER_ELEMENT === 'number', 'Typed array unavailable: ' + key);
    must(Number.isSafeInteger(count) && count >= 0 && count <= array.length, 'Invalid active count: ' + key);
    return { key, array, count, bytes: new Uint8Array(array.buffer, array.byteOffset, count * array.BYTES_PER_ELEMENT).slice() };
  }
  function capture(host, snapshot, loft, owner, camera) {
    const slices = loft.sliceCount, vertices = loft.vertexCount, indices = loft.indexCount;
    must(Number.isSafeInteger(slices) && slices >= 0 && slices <= 300, 'Public slice count unavailable or out of bounds');
    must(Number.isSafeInteger(vertices) && vertices === slices * STRIDE && vertices <= 40200, 'Public world-position stride differs from134');
    must(Number.isSafeInteger(indices) && indices >= 0 && indices <= 240000 && indices % 3 === 0, 'Public active index count invalid');
    const actualKeys = Object.keys(loft).filter(key => ArrayBuffer.isView(loft[key]));
    must(actualKeys.length === 37 && loftKeys.every(key => actualKeys.includes(key)), 'Complete37-array public loft contract differs');
    const arrays = loftKeys.map(key => copyBytes(loft[key], key === 'indices' ? indices : vertexWidths[key] ? vertexWidths[key] * vertices : slices, 'loft.' + key));
    must(arrays.reduce((sum, item) => sum + item.bytes.length, 0) <= 4 * 1024 * 1024, 'Complete active loft exceeds4MiB guard cap');
    must(snapshot.board instanceof Float64Array && snapshot.board.length >= 8, 'Public board8 Float64 words unavailable');
    must(snapshot.rider instanceof Float64Array && snapshot.rider.length >= 33, 'Public rider33 Float64 words unavailable');
    must(snapshot.front instanceof Float32Array && Number.isSafeInteger(snapshot.frontCount) && snapshot.frontCount >= 0 && snapshot.frontCount <= 2048, 'Public raw front words unavailable');
    arrays.push(copyBytes(snapshot.board, 8, 'snapshot.board'), copyBytes(snapshot.rider, 33, 'snapshot.rider'), copyBytes(snapshot.front, snapshot.frontCount * FRONT_STRIDE, 'snapshot.front'));
    return {
      host, snapshot, status: snapshot.status, loft, owner, camera, seaTime: snapshot.status.seaTime,
      outstanding: host.outstandingSteps, slices, vertices, indices, frontCount: snapshot.frontCount,
      view: owner.view, homeView: d.mode.homeView, cameraValues: cameraWords(camera), cameraView: JSON.stringify(camera.view),
      cameraParent: camera.parent, arrays,
    };
  }
  function verify(before) {
    const failures = [], mode = d.mode, snapshot = before.host.snapshot;
    if (mode.host !== before.host || snapshot !== before.snapshot || snapshot.status !== before.status) failures.push('host/snapshot/status identity');
    if (!Object.is(snapshot.status.seaTime, before.seaTime) || !Object.is(before.host.outstandingSteps, before.outstanding)) failures.push('seaTime/outstandingSteps');
    if (mode.barrelLoft !== before.loft || before.loft.sliceCount !== before.slices || before.loft.vertexCount !== before.vertices || before.loft.indexCount !== before.indices || snapshot.frontCount !== before.frontCount) failures.push('loft/raw-front identity or active counts');
    if (mode.camera !== before.owner || before.owner.camera !== before.camera || before.owner.view !== before.view || mode.homeView !== before.homeView || before.camera.parent !== before.cameraParent || JSON.stringify(before.camera.view) !== before.cameraView) failures.push('normal camera ownership/view');
    const nowCamera = cameraWords(before.camera);
    if (nowCamera.length !== before.cameraValues.length || !nowCamera.every((value, i) => Object.is(value, before.cameraValues[i]))) failures.push('normal camera pose/projection');
    for (const item of before.arrays) {
      const current = item.key.startsWith('loft.') ? before.loft[item.key.slice(5)] : snapshot[item.key.slice(9)];
      if (current !== item.array || current.length < item.count) { failures.push(item.key + ': identity/count'); continue; }
      const bytes = new Uint8Array(current.buffer, current.byteOffset, item.bytes.length);
      for (let i = 0; i < bytes.length; i += 1) if (bytes[i] !== item.bytes[i]) { failures.push(item.key + ': active bytes'); break; }
    }
    return {
      checked: true, unchanged: failures.length === 0, failures, checkedLoftArrays: 37,
      checkedRawFrontWords: before.frontCount * FRONT_STRIDE, checkedBoardWords: 8, checkedRiderWords: 33,
      exactActiveByteComparison: true, originalCameraPoseAndProjectionChecked: true,
      rendererOwnedStateScope: 'Alternate renderer patch/underwater/caustic state restored by the normal render; no renderer-internal byte-equality claim',
    };
  }
  function world(loft, vertex) {
    const p = loft.positions, value = [p[3 * vertex], p[3 * vertex + 1], p[3 * vertex + 2]];
    must(finite(value), 'Stored active world position is nonfinite');
    return value;
  }
  function branch(first, last) {
    if (first >= 88 && last <= 112) return 'floor';
    if (first >= 68 && last <= 88) return 'inner-return';
    if (first >= 32 && last <= 68) return 'outer-roof';
    return 'other';
  }
  function airFromCrossings(crossings) {
    if (crossings.length !== 3 || !crossings.every(c => Number.isFinite(c.y))) return null;
    crossings.sort((a, b) => a.y - b.y);
    if (!(crossings[0].y < crossings[1].y && crossings[1].y < crossings[2].y)
      || crossings[0].branch !== 'floor' || crossings[1].branch !== 'inner-return' || crossings[2].branch !== 'outer-roof') return null;
    return { floorY: crossings[0].y, innerRoofY: crossings[1].y, outerRoofY: crossings[2].y,
      clearance: crossings[1].y - crossings[0].y, middleY: (crossings[0].y + crossings[1].y) / 2, crossings };
  }
  function rowAir(loft, row) {
    const ray = [loft.sliceRayX[row], loft.sliceRayZ[row]], norm = Math.hypot(...ray);
    if (!(Number.isFinite(norm) && norm > 0)) return null;
    const horizontalRay = ray.map(value => value / norm), origin = world(loft, row * STRIDE + E + 32);
    const qAt = vertex => { const p = world(loft, vertex); return (p[0] - origin[0]) * horizontalRay[0] + (p[2] - origin[2]) * horizontalRay[1]; };
    const q68 = qAt(row * STRIDE + E + 68), q88 = qAt(row * STRIDE + E + 88), q = (q68 + q88) / 2;
    if (!(Number.isFinite(q) && q68 > q88)) return null;
    const crossings = [];
    for (let local = 0; local + 1 < STRIDE; local += 1) {
      const a = row * STRIDE + local, b = a + 1, qa = qAt(a), qb = qAt(b);
      if (qa === qb) { if (q === qa) return null; continue; }
      if (!(Math.min(qa, qb) <= q && q < Math.max(qa, qb))) continue;
      const pa = world(loft, a), pb = world(loft, b), t = (q - qa) / (qb - qa);
      crossings.push({ y: pa[1] + (pb[1] - pa[1]) * t, branch: branch(local - E, local + 1 - E), vertices: [a, b], profiles: [local - E, local + 1 - E], t });
    }
    const air = airFromCrossings(crossings);
    return air && { ...air, row, q, qPolicy: 'midpoint of actual inner-return endpoints68/88', horizontalRay, origin,
      xz: [origin[0] + horizontalRay[0] * q, origin[2] + horizontalRay[1] * q] };
  }
  function select(loft) {
    const strips = Array.from({ length: Math.max(0, loft.sliceCount - 1) }, () => []);
    for (let i = 0; i < loft.indexCount; i += 3) {
      const triangle = [loft.indices[i], loft.indices[i + 1], loft.indices[i + 2]];
      must(triangle.every(vertex => vertex < loft.vertexCount), 'Active triangle addresses inactive world positions');
      const rows = triangle.map(vertex => Math.floor(vertex / STRIDE)), low = Math.min(...rows), high = Math.max(...rows);
      must(high === low + 1, 'Active indexed triangle does not span adjacent stored rows');
      strips[low].push(i);
    }
    const mature = row => row >= 0 && row < loft.sliceCount && loft.sliceWeight[row] === 1 && loft.slicePhase[row] === 1;
    const joined = strip => strip >= 0 && strip < strips.length && loft.sliceJoined[strip] === 1
      && loft.sliceFront[strip] === loft.sliceFront[strip + 1] && strips[strip].length === 2 * (STRIDE - 1);
    // First stored weight-1 phase-1 row with measured three-crossing air; pre-round analytic weights are not certified.
    for (let row = 0; row < loft.sliceCount; row += 1) {
      if (!mature(row)) continue;
      const air = rowAir(loft, row);
      if (!air) continue;
      for (const inwardRow of [row + 1, row - 1]) {
        const strip = Math.min(row, inwardRow);
        if (!mature(inwardRow) || !joined(strip)) continue;
        const inwardAir = rowAir(loft, inwardRow);
        if (inwardAir) return { row, inwardRow, strip, air, inwardAir, triangleOffsets: strips[strip] };
      }
      throw Error('First mature row with positive measured air has no fully mature joined neighbor; no later row search');
    }
    return null;
  }
  // Same vertex-ID half-open horizontal shared-edge rule as the actual BarrelWater classifier.
  function triangleY(loft, a, b, c, x, z) {
    const p = loft.positions;
    const edge = (u, v, px, pz) => {
      const lo = Math.min(u, v), hi = Math.max(u, v);
      const value = (p[3 * hi] - p[3 * lo]) * (pz - p[3 * lo + 2]) - (p[3 * hi + 2] - p[3 * lo + 2]) * (px - p[3 * lo]);
      return u < v ? value : -value;
    };
    const area = edge(a, b, p[3 * c], p[3 * c + 2]);
    if (area === 0) return undefined;
    const sign = area > 0 ? 1 : -1;
    const inside = (value, u, v) => value * sign > 0 || (value === 0 && (sign > 0) === (u < v));
    const wa = edge(b, c, x, z), wb = edge(c, a, x, z), wc = edge(a, b, x, z);
    if (!inside(wa, b, c) || !inside(wb, c, a) || !inside(wc, a, b)) return undefined;
    return (wa * p[3 * a + 1] + wb * p[3 * b + 1] + wc * p[3 * c + 1]) / area;
  }
  function stripAir(loft, selected, x, z) {
    const crossings = [];
    for (const offset of selected.triangleOffsets) {
      const vertices = [loft.indices[offset], loft.indices[offset + 1], loft.indices[offset + 2]], y = triangleY(loft, ...vertices, x, z);
      if (y === undefined) continue;
      const profiles = vertices.map(vertex => vertex % STRIDE - E);
      crossings.push({ y, branch: branch(Math.min(...profiles), Math.max(...profiles)), indexOffset: offset, vertices, profiles });
    }
    return airFromCrossings(crossings);
  }
  function obstructingTriangle(loft, eye, target) {
    const direction = subtract(target, eye);
    for (let i = 0; i < loft.indexCount; i += 3) {
      const vertices = [loft.indices[i], loft.indices[i + 1], loft.indices[i + 2]], [a, b, c] = vertices.map(v => world(loft, v));
      const ab = subtract(b, a), ac = subtract(c, a), normal = cross(ab, ac), p = cross(direction, ac), determinant = dot(ab, p), fromA = subtract(eye, a);
      if (determinant === 0) { if (dot(normal, normal) > 0 && dot(normal, fromA) === 0) return { indexOffset: i, vertices, reason: 'coplanar segment is ambiguous' }; continue; }
      const u = dot(fromA, p) / determinant;
      if (u < 0 || u > 1) continue;
      const q = cross(fromA, ab), v = dot(direction, q) / determinant;
      if (v < 0 || u + v > 1) continue;
      const t = dot(ac, q) / determinant;
      if (t > 0 && t < 1) return { indexOffset: i, vertices, t, reason: 'active drawn triangle intersects eye-to-target segment' };
    }
    return null;
  }
  function derive(loft, selected, original) {
    must(original.isPerspectiveCamera === true && typeof original.clone === 'function', 'Actual PerspectiveCamera cannot be cloned');
    must(!(original.view && original.view.enabled) && original.filmOffset === 0, 'Off-axis inherited projection is unsupported; no camera substitution attempted');
    must(finite([original.near, original.far]) && original.near > 0 && original.far > original.near, 'Inherited near/far projection is invalid');
    const columnPoint = fraction => {
      const xz = mix(selected.air.xz, selected.inwardAir.xz, fraction), air = stripAir(loft, selected, ...xz);
      must(air, 'Declared interior anchor has no actual three-crossing floor/inner-roof/outer-roof air interval');
      return { fraction, xz, air, world: [xz[0], air.middleY, xz[1]] };
    };
    // Fixed barycentric anchors inside the mature indexed strip, never a fitted outside eye or a pose search.
    const eyeAnchor = columnPoint(1 / 4), targetAnchor = columnPoint(3 / 4), eye = eyeAnchor.world, target = targetAnchor.world;
    const separation = Math.hypot(...subtract(target, eye));
    must(Number.isFinite(separation) && separation > original.near && separation < original.far, 'Declared adjacent interior direction cannot use inherited near/far planes');
    const obstruction = obstructingTriangle(loft, eye, target);
    must(!obstruction, 'Declared eye-to-target segment is blocked or ambiguous: ' + JSON.stringify(obstruction));
    const camera = original.clone(false);
    must(camera !== original && camera.isPerspectiveCamera === true, 'PerspectiveCamera clone aliases the normal camera');
    camera.position.set(...eye); camera.lookAt(...target); camera.updateMatrixWorld(true);
    must(finite(cameraWords(camera)), 'Derived inspection camera contains nonfinite pose/projection');
    must(['fov', 'aspect', 'near', 'far', 'zoom', 'filmGauge', 'filmOffset'].every(key => Object.is(camera[key], original[key])), 'Clone did not inherit exact normal perspective parameters');
    must(camera.projectionMatrix.elements.every((value, i) => Object.is(value, original.projectionMatrix.elements[i])), 'Clone projection differs from normal projection');
    const nearCorners = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, y]) => camera.position.clone().set(x, y, -1).unproject(camera).toArray());
    const checkedPoints = [eye, target, mix(eye, target, 1 / 2), ...nearCorners].map(point => {
      must(finite(point), 'Camera air-check point is nonfinite');
      const air = stripAir(loft, selected, point[0], point[2]);
      must(air && air.floorY < point[1] && point[1] < air.innerRoofY, 'Camera eye/target/near plane is outside the selected mature strip air interval');
      const swept = d.mode.sweptBarrel;
      must(swept && typeof swept.waterAt === 'function' && typeof d.mode.cameraBelowSurface === 'function', 'Existing drawn-water camera classifier unavailable');
      must(swept.waterAt(...point, 0) === false, 'Existing whole drawn-loft classifier does not confirm camera-check point as air');
      const vector = camera.position.clone().set(...point);
      must(d.mode.cameraBelowSurface(0.1, vector) === false, 'Existing renderer underwater classifier rejects camera-check point');
      return { world: point, floorY: air.floorY, innerRoofY: air.innerRoofY, clearance: air.clearance, wholeDrawnLoftAir: true, rendererBelowSurface: false };
    });
    return { camera, data: {
      policy: 'first-mature-core/fixed-quarter-to-three-quarter-indexed-air/inherited-perspective/v1',
      eyeAnchor, targetAnchor, eye, target, checkedPoints, nearCorners, eyeToTargetActiveTriangleObstruction: null,
      inheritedUp: original.up.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(),
      fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far, zoom: camera.zoom,
      limits: ['Stored weight-1 phase-1 interior core inspection, not an exposed run-end mouth or pre-round formation certificate.', 'Eye-to-target segment and four near-plane corners are checked; the entire near plane, full far frustum and pixels beyond target are not certified.', 'No full-profile framing or visual-quality guarantee.'],
    } };
  }
  function inspect() {
    let before, original, rendered = false, restored = false, restoreFailure = null, result, selectionEvidence = null, eligibleAttempted = false;
    let stage = 'prerequisites';
    try {
      const mode = d && d.mode, host = mode && mode.host, snapshot = host && host.snapshot;
      const owner = mode && mode.camera, loft = mode && mode.barrelLoft;
      original = owner && owner.camera;
      must(host && snapshot && snapshot.status && loft && original && d.canvas && typeof d.renderView === 'function', 'Published host/loft/camera/canvas/renderView unavailable');
      must(host.outstandingSteps === 0 && Number.isFinite(snapshot.status.seaTime), 'Inspection requires an already drained finite snapshot');
      before = capture(host, snapshot, loft, owner, original);
      stage = 'selector';
      const selected = select(loft);
      if (!selected) result = { available: false, reason: 'No fully weighted phase1 stored row with a measured three-crossing air interval', stage };
      else {
        eligibleAttempted = true;
        const selector = {
          policy: 'first-stored-weight1-phase1-positive-air-row/higher-then-lower-mature-neighbor/no-later-pose-search/v1', ...selected,
          front: loft.sliceFront[selected.row], sigma: loft.sliceSigma[selected.row], tau: loft.sliceTau[selected.row],
          phase: loft.slicePhase[selected.row], weight: loft.sliceWeight[selected.row], legacyFormedNotUsedForSelection: loft.sliceFormed[selected.row],
          inwardSigma: loft.sliceSigma[selected.inwardRow], inwardPhase: loft.slicePhase[selected.inwardRow], inwardWeight: loft.sliceWeight[selected.inwardRow], activeStripTriangleCount: 2 * (STRIDE - 1),
          positionSpace: 'public-stored-world-coordinates', stride: STRIDE, extensionSamples: E,
        };
        selectionEvidence = selector;
        stage = 'camera-derivation';
        const derived = derive(loft, selected, original);
        stage = 'inspection-render'; rendered = true;
        d.renderView(derived.camera);
        stage = 'png';
        const pngDataUrl = d.canvas.toDataURL('image/png');
        must(typeof pngDataUrl === 'string' && pngDataUrl.startsWith('data:image/png;base64,'), 'Canvas PNG unavailable');
        result = { available: true, kind: 'geometry-only-mature-core-interior-inspection', pngDataUrl, seaTime: before.seaTime, selector, cameraDerivation: derived.data, fullLoftSidecarIncluded: false, attachCallerNormalFull37SidecarAtSameEpoch: true };
      }
    } catch (error) {
      result = { available: false, reason: error instanceof Error ? error.message : String(error), stage, geometryFailure: stage === 'selector' || stage === 'camera-derivation', firstEligibleAttemptFailed: eligibleAttempted, selector: selectionEvidence };
    } finally {
      if (before) {
        try { d.renderView(original); restored = true; }
        catch (error) { restoreFailure = error instanceof Error ? error.message : String(error); }
      }
    }
    let nonmutation = { checked: false, unchanged: null, reason: 'Complete guard prerequisites were unavailable; caller must independently reject any mutation' };
    if (before) {
      try { nonmutation = verify(before); }
      catch (error) { nonmutation = { checked: true, unchanged: false, failures: [error instanceof Error ? error.message : String(error)] }; }
    }
    nonmutation.inspectionRenderAttempted = rendered;
    nonmutation.normalRenderRestored = restored;
    nonmutation.normalRenderRestoreFailure = restoreFailure;
    if (before && (!nonmutation.unchanged || !restored)) {
      const discardedPng = !!result.pngDataUrl;
      result = { available: false, reason: !restored ? 'Normal render restoration failed' : 'Inspection changed guarded published state', stage: 'nonmutation', discardedPng, nonmutation };
    } else result.nonmutation = nonmutation;
    result.geometryOrCameraSearch = false;
    result.eligibleAttempted = eligibleAttempted;
    result.openingOrBodyPassageClaim = false;
    return result;
  }
  return { inspect };
}
