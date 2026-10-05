// Source preparation only. Root owns compilation, runtime invocation and interpretation.
export function installMaskSupportInspection(expected, cameras) {
  const d = window.breaklineDiagnostics, lab = window.breaklineLab;
  const must = (yes, why) => { if (!yes) throw Error(why); };
  const mode = d?.mode, host = mode?.host, snapshot = host?.snapshot;
  const owner = mode?.barrelMesh, material = owner?.mesh.material;
  const originalCamera = mode?.camera.camera;
  const DISCARD = 'if ( waterBarrelMaskAt( vWaterWorld.xz ) <= waterBarrelDither( gl_FragCoord.xy ) ) discard;';
  must(d && lab && owner && material && host && originalCamera, 'Public drawn mode unavailable');
  must(lab.clock.paused && !lab.active && host.outstandingSteps === 0, 'Paused drained public startup required');
  must(owner.view === undefined && owner.sheetShown && owner.facesOut, 'Original ordinary sheet/view/winding required');
  const seaTime = snapshot.status.seaTime, originalStatus = snapshot.status, normalOwner = mode.camera;
  const compile = material.onBeforeCompile, programKey = material.customProgramCacheKey;
  const originalView = owner.view, originalCameraParent = originalCamera.parent;
  const originalCameraView = JSON.stringify(originalCamera.view);
  let variant = 'masked', active = true, compiled = [], completed = [];
  const geometryWidths = { positions: 3, normals: 3, mask: 1, lift: 1, sheet: 1, sheetWeight: 1, sheetBack: 1, throat: 4 };
  const stateKeys = ['depthTest', 'depthWrite', 'depthFunc', 'colorWrite', 'side', 'transparent', 'opacity', 'alphaTest',
    'stencilWrite', 'stencilRef', 'stencilFunc', 'stencilFuncMask', 'stencilWriteMask', 'stencilFail', 'stencilZFail', 'stencilZPass',
    'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits'];
  const words = camera => [...camera.position.toArray(), ...camera.quaternion.toArray(), ...camera.up.toArray(), ...camera.scale.toArray(),
    ...camera.matrix.toArray(), ...camera.matrixWorld.toArray(), ...camera.matrixWorldInverse.toArray(),
    ...camera.projectionMatrix.toArray(), ...camera.projectionMatrixInverse.toArray(),
    camera.fov, camera.aspect, camera.near, camera.far, camera.zoom, camera.filmGauge, camera.filmOffset];
  const equalWords = (a, b) => a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const normalWords = words(originalCamera);
  const bytes = (array, count) => {
    must(ArrayBuffer.isView(array) && Number.isSafeInteger(count) && count >= 0 && count <= array.length, 'Active typed array unavailable');
    return new Uint8Array(array.buffer, array.byteOffset, count * array.BYTES_PER_ELEMENT).slice();
  };
  const sameBytes = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
  const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
  const prior = Object.fromEntries(Object.entries(expected.arrays).map(([key, value]) => [key, decode(value.data)]));
  const priorFront = decode(expected.rawFrontPacket.data);
  const rawState = () => {
    const loft = mode.barrelLoft;
    must(loft && Object.keys(loft).filter(key => ArrayBuffer.isView(loft[key])).length === 37, 'Actual complete37 loft required');
    must(loft.sliceCount === expected.counts.slices && loft.vertexCount === expected.counts.vertices && loft.indexCount === expected.counts.indices, 'Prior cap active counts differ; no epoch search');
    const arrays = Object.entries(expected.arrays).map(([key, value]) => {
      const array = loft[key], count = key === 'indices' ? loft.indexCount : geometryWidths[key] ? geometryWidths[key] * loft.vertexCount : loft.sliceCount;
      must(count === value.count && array.constructor.name === value.dtype, 'Prior typed shape differs: ' + key);
      const copy = bytes(array, count);
      must(sameBytes(copy, prior[key]), 'Prior cap active words differ: ' + key);
      return { key, array, count, copy };
    });
    must(Object.is(seaTime, expected.epoch.seaTime) && Object.is(snapshot.status.seaTime, seaTime), 'Exact prior seeded zero-step sea clock differs');
    must(snapshot.frontCount === expected.rawFrontPacket.recordCount && sameBytes(bytes(snapshot.front, snapshot.frontCount * 9), priorFront), 'Prior raw-front words differ');
    return { loft, arrays, actor: [{ array: snapshot.board, count: 8, copy: bytes(snapshot.board, 8) },
      { array: snapshot.rider, count: 33, copy: bytes(snapshot.rider, 33) }], front: snapshot.front };
  };
  const verifyRaw = before => {
    must(mode.host === host && host.snapshot === snapshot && host.snapshot.status === originalStatus && host.outstandingSteps === 0,
      'Published owner/epoch changed during rendering');
    must(lab.clock.paused && !lab.active && mode.barrelLoft === before.loft && mode.barrelMesh === owner, 'Public mode/loft ownership changed');
    must(mode.camera === normalOwner && mode.camera.camera === originalCamera && originalCamera.parent === originalCameraParent
      && JSON.stringify(originalCamera.view) === originalCameraView && equalWords(words(originalCamera), normalWords), 'Normal camera pose/projection changed');
    rawState();
    for (const item of before.arrays) must(before.loft[item.key] === item.array && sameBytes(bytes(item.array, item.count), item.copy), 'Active loft identity/words changed: ' + item.key);
    must(snapshot.front === before.front, 'Raw front identity changed');
    for (const item of before.actor) must(sameBytes(bytes(item.array, item.count), item.copy), 'Actor words changed during rendering');
  };
  const geometryState = geometry => {
    const index = geometry.index, count = Number.isFinite(geometry.drawRange.count) ? geometry.drawRange.count : index?.count;
    must(index && Number.isSafeInteger(count) && geometry.drawRange.start === 0, 'Active indexed drawing required');
    const vertices = mode.barrelLoft.vertexCount;
    return { geometry, start: geometry.drawRange.start, count, index, indexBytes: bytes(index.array, count),
      attributes: Object.entries(geometry.attributes).map(([key, attribute]) => ({ key, attribute,
        count: vertices * attribute.itemSize, copy: bytes(attribute.array, vertices * attribute.itemSize) })) };
  };
  const verifyGeometry = before => {
    const geometry = owner.mesh.geometry;
    must(geometry === before.geometry && geometry.index === before.index && geometry.drawRange.start === before.start && geometry.drawRange.count === before.count
      && sameBytes(bytes(geometry.index.array, before.count), before.indexBytes), 'Actual draw indices/range changed between variants');
    must(Object.keys(geometry.attributes).length === before.attributes.length, 'Actual draw attribute set changed');
    for (const item of before.attributes) must(geometry.attributes[item.key] === item.attribute && sameBytes(bytes(item.attribute.array, item.count), item.copy), 'Actual draw attribute changed: ' + item.key);
  };
  const renderState = () => {
    const water = d.water, uniforms = water.materialUniforms;
    const meshes = [owner.mesh, water.mesh, water.patch, water.barrelFallback, water.barrelPatchFallback].filter(Boolean);
    const mask = uniforms.waterBarrelMask.value;
    return { water, mask, maskBytes: bytes(mask.image.data, mask.image.data.length), grid: uniforms.waterBarrelGrid.value.toArray(),
      gridSize: uniforms.waterBarrelGridSize.value.toArray(), maskActive: uniforms.waterBarrelMaskActive.value,
      fallbackActive: uniforms.waterBarrelScreenFallback.value,
      meshes: meshes.map(mesh => ({ mesh, material: mesh.material, geometry: mesh.geometry, visible: mesh.visible, renderOrder: mesh.renderOrder,
        matrix: mesh.matrixWorld.toArray(), drawRange: [mesh.geometry.drawRange.start, mesh.geometry.drawRange.count],
        geometryArrays: [...Object.entries(mesh.geometry.attributes).map(([key, attribute]) => ({ key, array: attribute.array,
          count: attribute.count * attribute.itemSize, copy: bytes(attribute.array, attribute.count * attribute.itemSize) })),
          ...(mesh.geometry.index ? [{ key: 'index', array: mesh.geometry.index.array, count: mesh.geometry.index.count,
            copy: bytes(mesh.geometry.index.array, mesh.geometry.index.count) }] : [])],
        values: stateKeys.map(key => mesh.material[key]), compile: mesh.material.onBeforeCompile, programKey: mesh.material.customProgramCacheKey })) };
  };
  const verifyRenderState = before => {
    const now = renderState();
    must(now.water === before.water && now.mask === before.mask && sameBytes(now.maskBytes, before.maskBytes)
      && equalWords(now.grid, before.grid) && equalWords(now.gridSize, before.gridSize)
      && now.maskActive === before.maskActive && now.fallbackActive === before.fallbackActive, 'Ordinary water mask bytes/grid/active state changed');
    must(now.meshes.length === before.meshes.length, 'Water/swept/repair object set changed');
    for (let i = 0; i < before.meshes.length; i++) {
      const a = before.meshes[i], b = now.meshes[i];
      must(b.mesh === a.mesh && b.material === a.material && b.geometry === a.geometry && b.visible === a.visible && b.renderOrder === a.renderOrder
        && equalWords(b.matrix, a.matrix) && equalWords(b.drawRange, a.drawRange)
        && equalWords(b.values, a.values) && b.compile === a.compile && b.programKey === a.programKey, 'Ordinary material, transform, depth or stencil parameters changed');
      must(a.geometryArrays.length === b.geometryArrays.length, 'Ordinary drawing attribute set changed');
      for (let j = 0; j < a.geometryArrays.length; j++) {
        const x = a.geometryArrays[j], y = b.geometryArrays[j];
        must(x.key === y.key && x.array === y.array && x.count === y.count && sameBytes(x.copy, y.copy), 'Ordinary drawing array identity/words changed');
      }
    }
  };
  const diagnosticCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    must(owner.view === 'region', 'Diagnostic compilation outside declared flat region view');
    must(shader.fragmentShader.split(DISCARD).length === 2, 'Expected exactly one original swept discard');
    const masked = shader.fragmentShader;
    if (variant === 'bypassed') shader.fragmentShader = masked.replace(DISCARD, '');
    compiled.push({ variant, exactlyOneOriginalDiscard: true, removedOnlySweptDiscard: variant === 'bypassed',
      fragmentCharacters: shader.fragmentShader.length, removedCharacters: masked.length - shader.fragmentShader.length,
      vertexShaderUntouchedByDiagnostic: true, waterShaderUntouchedByDiagnostic: true });
  };
  const diagnosticKey = function () { return programKey.call(this) + '-matched-mask-support-' + variant; };
  function setVariant(value) { variant = value; material.needsUpdate = true; }
  function cloneFixed(name) {
    const fixed = cameras[name], camera = originalCamera.clone(false);
    must(camera.isPerspectiveCamera && camera.parent === null && !camera.view?.enabled && camera.filmOffset === 0, 'Detached ordinary perspective clone required');
    must(equalWords(camera.projectionMatrix.toArray(), fixed.projection), 'Completed cap fixed projection differs');
    for (const key of ['fov', 'aspect', 'near', 'far', 'zoom']) must(Object.is(camera[key], fixed[key]), 'Completed cap camera projection parameter differs: ' + key);
    camera.position.fromArray(fixed.eye); camera.quaternion.fromArray(fixed.quaternion); camera.up.fromArray(fixed.inheritedUp);
    camera.updateMatrixWorld(true);
    return camera;
  }
  function capture(name) {
    must(active && ['side', 'interior'].includes(name) && !completed.includes(name), 'One declared pair per fixed camera');
    const camera = cloneFixed(name), cameraBefore = words(camera), rawBefore = rawState();
    let maskedPNG, bypassedPNG, geometry, render, repeatedIdentically;
    try {
      material.onBeforeCompile = diagnosticCompile; material.customProgramCacheKey = diagnosticKey;
      owner.setView('region'); setVariant('masked'); d.renderView(camera);
      must(owner.view === 'region', 'Declared region output missing');
      verifyRaw(rawBefore); geometry = geometryState(owner.mesh.geometry); render = renderState();
      maskedPNG = d.canvas.toDataURL('image/png');
      setVariant('bypassed'); d.renderView(camera);
      verifyRaw(rawBefore); verifyGeometry(geometry); verifyRenderState(render);
      must(equalWords(words(camera), cameraBefore), 'Fixed clone changed between variants');
      bypassedPNG = d.canvas.toDataURL('image/png');
      setVariant('masked'); d.renderView(camera);
      verifyRaw(rawBefore); verifyGeometry(geometry); verifyRenderState(render);
      repeatedIdentically = maskedPNG === d.canvas.toDataURL('image/png');
      must(repeatedIdentically, 'Masked repeat pixels differ; diagnostic is not causally matched');
      must(compiled.some(value => value.variant === 'masked') && compiled.some(value => value.variant === 'bypassed'), 'Both diagnostic shader programs must compile');
      completed.push(name);
    } finally {
      // Ordinary shader/view and normal camera are restored even after an unsuccessful capture.
      material.onBeforeCompile = compile; material.customProgramCacheKey = programKey;
      owner.setView(originalView); material.needsUpdate = true; d.renderView(originalCamera);
      verifyRaw(rawBefore);
      if (!completed.includes(name) || completed.length === 2) active = false;
    }
    return { complete: true, camera: name, seaTime, stepCount: 0, fixedPose: cameras[name], maskedPNG, bypassedPNG,
      shaderEvidence: compiled.slice(), maskedRepeatPixelsIdentical: repeatedIdentically,
      guards: { exactPriorFull37ActiveWords: true, exactPriorRawFrontWords: true, actualDrawAttributesAndIndicesIdentical: true,
        actorBoard8Rider33Unchanged: true, sameFixedCloneWords: true, waterMaskBytesAndGridIdentical: true,
        ordinaryWaterMaterialAndGeometryUnchanged: true, depthStencilParametersUnchanged: true, normalCameraRestored: true },
      interpretation: 'Only removal of the swept fragment discard differs. Stencil coverage may change as a consequence; its configuration is unchanged. No triangle, radiance, skin, air-volume or playability certification.' };
  }
  window.__maskSupport = { capture, finish() {
    must(completed.length === 2 && !active && material.onBeforeCompile === compile && material.customProgramCacheKey === programKey
      && owner.view === originalView, 'Both fixed-camera pairs and final ordinary restoration required');
    rawState(); must(equalWords(words(originalCamera), normalWords), 'Final normal camera changed');
    return { complete: true, completed, seaTime, stepCount: 0, originalShaderViewCameraRestored: true, shaderEvidence: compiled };
  } };
  rawState();
  return { installed: true, seaTime, stepCount: 0, exactPriorGeometryRequired: true, cameraSearch: false };
}
