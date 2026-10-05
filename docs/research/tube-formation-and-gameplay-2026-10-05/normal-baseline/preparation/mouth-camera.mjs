// Source-only helper. Root owns execution and acceptance; no geometry/body query is used here.
export function createMouthCameraInspection(d) {
  // Every binding stays inside the factory so createMouthCameraInspection.toString() is browser-safe.
  const STRIDE = 134, E = 3, FIRST = 32, LAST = 112, FRONT_STRIDE = 9, MARGIN = 1.2;
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
  function select(loft) {
    const stripTriangles = new Uint16Array(Math.max(0, loft.sliceCount - 1));
    for (let i = 0; i < loft.indexCount; i += 3) {
      const triangle = [loft.indices[i], loft.indices[i + 1], loft.indices[i + 2]];
      must(triangle.every(vertex => vertex < loft.vertexCount), 'Active triangle addresses inactive world positions');
      const rows = triangle.map(vertex => Math.floor(vertex / STRIDE)), low = Math.min(...rows), high = Math.max(...rows);
      must(high === low + 1, 'Active indexed triangle does not span adjacent stored rows');
      stripTriangles[low] += 1;
    }
    const joined = strip => strip >= 0 && strip + 1 < loft.sliceCount && loft.sliceJoined[strip] === 1
      && loft.sliceFront[strip] === loft.sliceFront[strip + 1] && stripTriangles[strip] === 2 * (STRIDE - 1);
    const formedOpen = row => row >= 0 && row < loft.sliceCount && loft.sliceWeight[row] > 0
      && loft.sliceFormed[row] > 0 && loft.slicePhase[row] === 1;
    const unformed = row => Number.isFinite(loft.sliceFormed[row]) && loft.sliceFormed[row] === 0;
    // Stored formed-row order, lower side before upper side. No camera or visible-quality score selects a candidate.
    for (let row = 0; row < loft.sliceCount; row += 1) {
      if (!formedOpen(row)) continue;
      if (joined(row - 1) && unformed(row - 1)) return { formedRow: row, boundaryRow: row - 1, inwardRow: row, strip: row - 1, side: 'lower', kind: 'adjacent-unformed-row' };
      if (!joined(row - 1) && joined(row) && formedOpen(row + 1)) return { formedRow: row, boundaryRow: row, inwardRow: row + 1, strip: row, side: 'lower', kind: 'joined-run-end' };
      if (joined(row) && unformed(row + 1)) return { formedRow: row, boundaryRow: row + 1, inwardRow: row, strip: row, side: 'upper', kind: 'adjacent-unformed-row' };
      if (!joined(row) && joined(row - 1) && formedOpen(row - 1)) return { formedRow: row, boundaryRow: row, inwardRow: row - 1, strip: row - 1, side: 'upper', kind: 'joined-run-end' };
    }
    return null;
  }
  function derive(loft, selection, original) {
    const point = (row, profile) => {
      const vertex = row * STRIDE + E + profile, offset = 3 * vertex;
      const world = [loft.positions[offset], loft.positions[offset + 1], loft.positions[offset + 2]];
      must(finite(world), 'Selected stored profile has nonfinite world coordinates');
      return { row, profile, vertex, positionOffset: offset, world };
    };
    const boundaryCrest = point(selection.boundaryRow, FIRST), inwardCrest = point(selection.inwardRow, FIRST);
    const dx = inwardCrest.world[0] - boundaryCrest.world[0], dz = inwardCrest.world[2] - boundaryCrest.world[2], length = Math.hypot(dx, dz);
    must(Number.isFinite(length) && length > 0, 'Selected adjacent stored crests have no horizontal inward tangent');
    const forward = [dx / length, 0, dz / length], right = [-forward[2], 0, forward[0]], up = [0, 1, 0];
    const contour = [], min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let profile = FIRST; profile <= LAST; profile += 1) {
      const world = point(selection.formedRow, profile).world;
      contour.push(world);
      for (let i = 0; i < 3; i += 1) { min[i] = Math.min(min[i], world[i]); max[i] = Math.max(max[i], world[i]); }
    }
    const target = min.map((value, i) => (value + max[i]) / 2);
    must(max[1] > min[1] && Math.hypot(max[0] - min[0], max[2] - min[2]) > 0, 'Selected full crest-to-toe contour bounds are degenerate');
    must(original.isPerspectiveCamera === true && typeof original.clone === 'function' && typeof original.getEffectiveFOV === 'function', 'Actual PerspectiveCamera cannot be cloned');
    must(!(original.view && original.view.enabled) && original.filmOffset === 0, 'Off-axis inherited projection is unsupported; no camera substitution attempted');
    const effectiveFov = original.getEffectiveFOV(), halfVertical = effectiveFov * Math.PI / 360;
    const tanVertical = Math.tan(halfVertical), tanHorizontal = tanVertical * original.aspect;
    must(finite([effectiveFov, tanVertical, tanHorizontal, original.near, original.far]) && tanVertical > 0 && tanHorizontal > 0 && original.near > 0 && original.far > original.near, 'Inherited perspective projection cannot fit a finite contour');
    let horizontalFit = -Infinity, verticalFit = -Infinity, nearFit = -Infinity, minDepth = Infinity, maxDepth = -Infinity;
    for (const world of contour) {
      const relative = subtract(world, target), depth = dot(relative, forward);
      horizontalFit = Math.max(horizontalFit, MARGIN * Math.abs(dot(relative, right)) / tanHorizontal - depth);
      verticalFit = Math.max(verticalFit, MARGIN * Math.abs(relative[1]) / tanVertical - depth);
      nearFit = Math.max(nearFit, MARGIN * original.near - depth);
      minDepth = Math.min(minDepth, depth); maxDepth = Math.max(maxDepth, depth);
    }
    // Keep the eye on the outside of the stored boundary as well as outside every contour point.
    const outsideBoundaryFit = dot(subtract(target, boundaryCrest.world), forward) + MARGIN * original.near;
    const distance = Math.max(horizontalFit, verticalFit, nearFit, outsideBoundaryFit);
    must(Number.isFinite(distance) && distance > 0 && distance + maxDepth < original.far / MARGIN, 'Derived contour fit exceeds inherited near/far projection');
    const eye = target.map((value, i) => value - forward[i] * distance);
    must(finite(eye) && dot(subtract(eye, boundaryCrest.world), forward) < 0, 'Derived eye is not outside the selected boundary');
    const camera = original.clone(false);
    must(camera !== original && camera.isPerspectiveCamera === true, 'PerspectiveCamera clone aliases the normal camera');
    camera.up.set(...up); camera.position.set(...eye); camera.lookAt(...target); camera.updateMatrixWorld(true);
    must(finite(cameraWords(camera)), 'Derived inspection camera contains nonfinite pose/projection');
    must(['fov', 'aspect', 'near', 'far', 'zoom', 'filmGauge', 'filmOffset'].every(key => Object.is(camera[key], original[key])), 'Clone did not inherit the exact normal perspective parameters');
    must(camera.projectionMatrix.elements.every((value, i) => Object.is(value, original.projectionMatrix.elements[i])), 'Clone projection differs from the normal projection');
    const landmarks = [32, 64, 88, 112].map(profile => point(selection.formedRow, profile));
    return {
      camera,
      data: {
        policy: 'stored-full-crest-to-toe-bounds-fit/inherited-perspective/world-up/v1', fixedMargin: MARGIN,
        boundaryCrest, inwardCrest, inwardHorizontalTangent: forward, right, worldUp: up,
        profileBounds: { row: selection.formedRow, first: FIRST, last: LAST, count: LAST - FIRST + 1, firstWorldVertex: selection.formedRow * STRIDE + E + FIRST, lastWorldVertex: selection.formedRow * STRIDE + E + LAST, min, max, target, landmarks },
        fit: { effectiveVerticalFovDegrees: effectiveFov, tanHalfVertical: tanVertical, tanHalfHorizontal: tanHorizontal, horizontalFit, verticalFit, nearFit, outsideBoundaryFit, minDepth, maxDepth, distance },
        eye, target, quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(),
        fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far, zoom: camera.zoom,
      },
    };
  }
  function inspect() {
    let before, original, rendered = false, restored = false, restoreFailure = null, result;
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
      if (!selected) result = { available: false, reason: 'No eligible public joined same-front formed phase1 mouth boundary', stage };
      else {
        const selector = {
          policy: 'first-stored-formed-open-row/lower-before-upper/no-visible-quality-search/v1', ...selected,
          front: loft.sliceFront[selected.formedRow], sigma: loft.sliceSigma[selected.formedRow], tau: loft.sliceTau[selected.formedRow],
          phase: loft.slicePhase[selected.formedRow], weight: loft.sliceWeight[selected.formedRow], formed: loft.sliceFormed[selected.formedRow],
          boundarySigma: loft.sliceSigma[selected.boundaryRow], activeStripTriangleCount: 2 * (STRIDE - 1),
          positionSpace: 'public-stored-world-coordinates', stride: STRIDE, extensionSamples: E,
        };
        stage = 'camera-derivation';
        const derived = derive(loft, selected, original);
        stage = 'inspection-render'; rendered = true;
        d.renderView(derived.camera);
        stage = 'png';
        const pngDataUrl = d.canvas.toDataURL('image/png');
        must(typeof pngDataUrl === 'string' && pngDataUrl.startsWith('data:image/png;base64,'), 'Canvas PNG unavailable');
        result = { available: true, kind: 'geometry-only-cloned-camera-inspection', pngDataUrl, seaTime: before.seaTime, selector, cameraDerivation: derived.data, fullLoftSidecarIncluded: false, attachCallerNormalFull37SidecarAtSameEpoch: true };
      }
    } catch (error) {
      result = { available: false, reason: error instanceof Error ? error.message : String(error), stage, geometryFailure: stage === 'selector' || stage === 'camera-derivation' };
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
    result.openingOrBodyPassageClaim = false;
    return result;
  }
  return { inspect };
}
