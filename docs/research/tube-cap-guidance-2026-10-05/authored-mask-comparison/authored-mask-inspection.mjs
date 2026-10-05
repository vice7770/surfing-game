// Source preparation only. Root owns compilation, runtime invocation and interpretation.
export function installAuthoredMaskInspection(expected, cameras, declaredPairs) {
  const d = window.breaklineDiagnostics, lab = window.breaklineLab;
  const must = (yes, why) => { if (!yes) throw Error(why); };
  const mode = d?.mode, host = mode?.host, snapshot = host?.snapshot;
  const owner = mode?.barrelMesh, material = owner?.mesh.material;
  const originalCamera = mode?.camera.camera;
  const ATTRIBUTE = 'sweptMask';
  const DISCARD = 'if ( waterBarrelMaskAt( vWaterWorld.xz ) <= waterBarrelDither( gl_FragCoord.xy ) ) discard;';
  const SUPPORTED_DISCARD = 'if ( max( waterBarrelMaskAt( vWaterWorld.xz ), vSweptMask ) <= waterBarrelDither( gl_FragCoord.xy ) ) discard;';
  // Exact A statements from the completed, source-pinned matched-sheet-fill capture.
  const SKY = 'sweptSkyTransmission * PI * textureCubeUV( envMap, envMapRotation * sweptSkyRay, roughnessFactor ).rgb * envMapIntensity';
  const SKY_ONCE = 'PI * textureCubeUV( envMap, envMapRotation * sweptSkyRay, roughnessFactor ).rgb * envMapIntensity';
  const BACK = 'vec3 sweptBack = vSweptSheetBack * sweptSky + ( 1.0 - vSweptSheetBack ) * sweptWall;';
  const BACK_FILL = 'float sweptSkyShare = clamp( vSweptSheetBack, 0.0, 1.0 ) * sweptSkyTransmission;\n    vec3 sweptBack = sweptSkyShare * sweptSky + ( 1.0 - sweptSkyShare ) * sweptWall;';
  const THROAT = 'radiance *= mix( 1.0, sweptLeaves( sweptMirror, sweptTip ) ? 1.0 : 0.0, vSweptThroat.w );';
  const GATE = 'sweptSkyTransmission = dot( sweptInside, sweptFarInwardN ) < 0.0 && length( sweptOutgoing ) > 0.0 ? 1.0 : 0.0;';
  const SAFE_RAY = 'sweptSkyRay = sweptSkyTransmission > 0.0 ? sweptOutgoing : -waterV;';
  const LIFT = 'attribute float sweptLift;';
  const VARYING = 'varying float vSweptSheet;';
  const FLOW = 'vWaterFlow = waterFlowAt( position.xz );';
  const LIFT_SUPPORTED = LIFT + '\nattribute float sweptMask;';
  const VARYING_SUPPORTED = 'varying float vSweptMask;\n' + VARYING;
  const FLOW_SUPPORTED = FLOW + '\nvSweptMask = sweptMask;';
  must(d && lab && owner && material && host && originalCamera, 'Public drawn mode unavailable');
  must(lab.clock.paused && !lab.active && host.outstandingSteps === 0, 'Paused drained public startup required');
  must(owner.view === undefined && owner.sheetShown && owner.facesOut, 'Original ordinary sheet/view/winding required');
  const seaTime = snapshot.status.seaTime, originalStatus = snapshot.status, normalOwner = mode.camera;
  const compile = material.onBeforeCompile, programKey = material.customProgramCacheKey;
  const originalView = owner.view, originalCameraParent = originalCamera.parent;
  const originalCameraView = JSON.stringify(originalCamera.view);
  const originalGeometry = owner.mesh.geometry;
  const originalAttributes = Object.entries(originalGeometry.attributes);
  must(!originalGeometry.getAttribute(ATTRIBUTE), 'Frozen baseline must have no authored-mask draw attribute');
  let variant = 'baseline', active = true, compiled = [], completed = [], pairState = null, regionAttribute;
  const geometryWidths = { positions: 3, normals: 3, mask: 1, lift: 1, sheet: 1, sheetWeight: 1, sheetBack: 1, throat: 4 };
  const stateKeys = ['depthTest', 'depthWrite', 'depthFunc', 'colorWrite', 'side', 'transparent', 'opacity', 'alphaTest',
    'stencilWrite', 'stencilRef', 'stencilFunc', 'stencilFuncMask', 'stencilWriteMask', 'stencilFail', 'stencilZFail', 'stencilZPass',
    'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'envMap', 'envMapIntensity', 'roughness', 'metalness', 'ior', 'emissiveIntensity'];
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
    for (const item of before.actor) must(snapshot[item.count === 8 ? 'board' : 'rider'] === item.array && sameBytes(bytes(item.array, item.count), item.copy), 'Actor identity/words changed during rendering');
  };
  const geometryState = geometry => {
    const index = geometry.index, count = Number.isFinite(geometry.drawRange.count) ? geometry.drawRange.count : index?.count;
    must(index && Number.isSafeInteger(count) && geometry.drawRange.start === 0, 'Active indexed drawing required');
    const vertices = mode.barrelLoft.vertexCount;
    const position = geometry.getAttribute('position');
    must(position.itemSize === 3 && position.array instanceof Float32Array
      && sameBytes(bytes(position.array, 3 * vertices), bytes(mode.barrelLoft.positions, 3 * vertices)), 'Actual drawn positions must be exact final loft F32 words');
    return { geometry, start: geometry.drawRange.start, count, index, indexBytes: bytes(index.array, count),
      attributes: Object.entries(geometry.attributes).filter(([key]) => key !== ATTRIBUTE).map(([key, attribute]) => ({ key, attribute,
        count: vertices * attribute.itemSize, copy: bytes(attribute.array, vertices * attribute.itemSize) })) };
  };
  const verifyGeometry = before => {
    const geometry = owner.mesh.geometry;
    must(geometry === before.geometry && geometry.index === before.index && geometry.drawRange.start === before.start && geometry.drawRange.count === before.count
      && sameBytes(bytes(geometry.index.array, before.count), before.indexBytes), 'Actual draw indices/range changed between variants');
    must(Object.keys(geometry.attributes).filter(key => key !== ATTRIBUTE).length === before.attributes.length, 'Original draw attribute set changed');
    for (const item of before.attributes) must(geometry.attributes[item.key] === item.attribute && sameBytes(bytes(item.attribute.array, item.count), item.copy), 'Original draw attribute changed: ' + item.key);
    if (variant === 'authored-support' || variant === 'authored-support-plus-sheet-fill-A') {
      const a = geometry.getAttribute(ATTRIBUTE), v = mode.barrelLoft.vertexCount;
      must(a === pairState.attribute && a.itemSize === 1 && a.array instanceof Float32Array && !a.normalized
        && a.constructor === geometry.getAttribute('sweptLift').constructor && a.usage === geometry.getAttribute('sweptLift').usage && a.count === geometry.getAttribute('sweptLift').count
        && sameBytes(bytes(a.array, v), bytes(mode.barrelLoft.mask, v)), 'Added scalar attribute must be exact final F32 authored-mask prefix');
    } else must(!geometry.getAttribute(ATTRIBUTE), 'Baseline must have no additive authored attribute');
  };
  const renderState = () => {
    const water = d.water, uniforms = water.materialUniforms;
    const meshes = [owner.mesh, water.mesh, water.patch, water.barrelFallback, water.barrelPatchFallback].filter(Boolean);
    const mask = uniforms.waterBarrelMask.value;
    return { water, mask, maskImage: mask.image, maskArray: mask.image.data, maskBytes: bytes(mask.image.data, mask.image.data.length),
      maskProperties: [mask.image.width, mask.image.height, mask.format, mask.type, mask.minFilter, mask.magFilter, mask.wrapS, mask.wrapT],
      grid: uniforms.waterBarrelGrid.value.toArray(), gridSize: uniforms.waterBarrelGridSize.value.toArray(), maskActive: uniforms.waterBarrelMaskActive.value,
      fallbackActive: uniforms.waterBarrelScreenFallback.value,
      meshes: meshes.map(mesh => ({ mesh, material: mesh.material, geometry: mesh.geometry, visible: mesh.visible, renderOrder: mesh.renderOrder,
        matrix: mesh.matrixWorld.toArray(), drawRange: [mesh.geometry.drawRange.start, mesh.geometry.drawRange.count],
        geometryArrays: [...Object.entries(mesh.geometry.attributes).filter(([key]) => mesh !== owner.mesh || key !== ATTRIBUTE).map(([key, attribute]) => ({ key, array: attribute.array,
          count: attribute.count * attribute.itemSize, copy: bytes(attribute.array, attribute.count * attribute.itemSize) })),
          ...(mesh.geometry.index ? [{ key: 'index', array: mesh.geometry.index.array, count: mesh.geometry.index.count,
            copy: bytes(mesh.geometry.index.array, mesh.geometry.index.count) }] : [])],
        values: stateKeys.map(key => mesh.material[key]), compile: mesh.material.onBeforeCompile, programKey: mesh.material.customProgramCacheKey,
        shaderValues: [mesh.material.vertexShader, mesh.material.fragmentShader, JSON.stringify(mesh.material.defines)] })) };
  };
  const verifyRenderState = before => {
    const now = renderState();
    must(now.water === before.water && now.mask === before.mask && now.maskImage === before.maskImage && now.maskArray === before.maskArray && sameBytes(now.maskBytes, before.maskBytes)
      && equalWords(now.maskProperties, before.maskProperties) && equalWords(now.grid, before.grid) && equalWords(now.gridSize, before.gridSize)
      && now.maskActive === before.maskActive && now.fallbackActive === before.fallbackActive, 'Ordinary water mask bytes/grid/texture state changed');
    must(now.meshes.length === before.meshes.length, 'Water/swept/repair object set changed');
    for (let i = 0; i < before.meshes.length; i++) {
      const a = before.meshes[i], b = now.meshes[i];
      must(b.mesh === a.mesh && b.material === a.material && b.geometry === a.geometry && b.visible === a.visible && b.renderOrder === a.renderOrder
        && equalWords(b.matrix, a.matrix) && equalWords(b.drawRange, a.drawRange) && equalWords(b.shaderValues, a.shaderValues)
        && equalWords(b.values, a.values) && b.compile === a.compile && b.programKey === a.programKey, 'Ordinary shader, material, transform, depth or stencil parameters changed');
      must(a.geometryArrays.length === b.geometryArrays.length, 'Original drawing attribute set changed');
      for (let j = 0; j < a.geometryArrays.length; j++) {
        const x = a.geometryArrays[j], y = b.geometryArrays[j];
        must(x.key === y.key && x.array === y.array && x.count === y.count && sameBytes(x.copy, y.copy), 'Original drawing array identity/words changed');
      }
    }
  };
  const exactlyOne = (source, token) => must(source.split(token).length === 2, 'Expected exactly one shader token: ' + token);
  const diagnosticCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    must(pairState && owner.view === pairState.view, 'Diagnostic compilation outside declared view');
    must(programKey.call(this) === 'breakline-swept-barrel-rich' + (pairState.view ? '-view-region' : ''), 'Only original Rich shader is declared');
    const vertex = shader.vertexShader, fragment = shader.fragmentShader;
    exactlyOne(fragment, DISCARD);
    for (const statement of [THROAT, GATE, SAFE_RAY]) exactlyOne(fragment, statement);
    must(!vertex.includes('attribute float sweptMask;') && !vertex.includes('varying float vSweptMask;') && !fragment.includes('varying float vSweptMask;'), 'Sealed original shader already has candidate additions');
    if (variant === 'baseline') {
      pairState.baselineVertex ??= vertex; pairState.baselineFragment ??= fragment;
      must(vertex === pairState.baselineVertex && fragment === pairState.baselineFragment, 'Original shader differs on baseline repeat');
      must(!owner.mesh.geometry.getAttribute(ATTRIBUTE), 'Original baseline compile has added draw attribute');
    } else {
      must(variant === pairState.supportedVariant && vertex === pairState.baselineVertex && fragment === pairState.baselineFragment, 'Variant must start from byte-identical original shader');
      exactlyOne(vertex, LIFT); exactlyOne(vertex, VARYING); exactlyOne(vertex, FLOW); exactlyOne(fragment, VARYING);
      shader.vertexShader = vertex.replace(LIFT, LIFT_SUPPORTED).replace(VARYING, VARYING_SUPPORTED).replace(FLOW, FLOW_SUPPORTED);
      shader.fragmentShader = fragment.replace(VARYING, VARYING_SUPPORTED).replace(DISCARD, SUPPORTED_DISCARD);
      must(shader.vertexShader.replace(LIFT_SUPPORTED, LIFT).replace(VARYING_SUPPORTED, VARYING).replace(FLOW_SUPPORTED, FLOW) === vertex,
        'Variant vertex must equal original plus exactly one scalar attribute/varying/assignment');
      must(shader.fragmentShader.replace(VARYING_SUPPORTED, VARYING).replace(SUPPORTED_DISCARD, DISCARD) === fragment,
        'Variant fragment must equal original plus exactly one varying and one max predicate');
      if (pairState.combined) {
        must(pairState.view === undefined && variant === 'authored-support-plus-sheet-fill-A', 'Combined A only applies to the declared normal Rich pair');
        for (const statement of [SKY, BACK, THROAT, GATE, SAFE_RAY]) exactlyOne(fragment, statement);
        const maskOnlyFragment = shader.fragmentShader;
        shader.fragmentShader = maskOnlyFragment.replace(SKY, SKY_ONCE).replace(BACK, BACK_FILL);
        must(shader.fragmentShader.replace(SKY_ONCE, SKY).replace(BACK_FILL, BACK) === maskOnlyFragment,
          'Combined variant must equal mask-only shader plus exactly the tested A sky and background statements');
        for (const statement of [BACK_FILL, THROAT, GATE, SAFE_RAY, SUPPORTED_DISCARD]) exactlyOne(shader.fragmentShader, statement);
        must(!shader.fragmentShader.includes(SKY) && !shader.fragmentShader.includes(BACK), 'Combined A must replace both original sky/background statements');
      }
    }
    compiled.push({ pair: pairState.id, variant, view: pairState.view ?? 'rich', exactlyOneOriginalDiscard: true,
      originalShaderByteIdenticalBeforeInjection: true, baselineShaderUnchanged: variant === 'baseline',
      onlyDeclaredScalarAndPredicateAdded: variant === 'authored-support', retainsOriginalTextureMaskAndDither: true,
      onlyDeclaredScalarPredicateAndExactSheetFillAAdded: variant === 'authored-support-plus-sheet-fill-A',
      wallLightAEnabled: variant === 'authored-support-plus-sheet-fill-A',
      directionTIRGatePreserved: true, safeNonzeroEnvironmentRayPreserved: true, throatOcclusionPreserved: true, ClassicUntouchedByDiagnostic: true,
      authoredPredicate: variant !== 'baseline' ? SUPPORTED_DISCARD : null,
      vertexAddedCharacters: shader.vertexShader.length - vertex.length, fragmentAddedCharacters: shader.fragmentShader.length - fragment.length,
      waterShaderUntouchedByDiagnostic: true });
  };
  const diagnosticKey = function () { return programKey.call(this) + '-matched-authored-mask-' + pairState.id + '-' + variant; };
  function setVariant(value) {
    variant = value;
    const geometry = owner.mesh.geometry;
    if (value === 'authored-support' || value === 'authored-support-plus-sheet-fill-A') {
      must(!geometry.getAttribute(ATTRIBUTE), 'Only one additive attribute is allowed');
      const reference = geometry.getAttribute('sweptLift'), vertices = mode.barrelLoft.vertexCount;
      must(reference.array instanceof Float32Array && reference.itemSize === 1 && reference.count >= vertices && reference.usage === 35048, 'Existing F32 DynamicDrawUsage scalar attribute required');
      const attribute = new reference.constructor(new Float32Array(reference.count), 1).setUsage(reference.usage);
      attribute.array.set(mode.barrelLoft.mask.subarray(0, vertices)); attribute.clearUpdateRanges(); attribute.addUpdateRange(0, vertices); attribute.needsUpdate = true;
      must(attribute.updateRanges.length === 1 && attribute.updateRanges[0].start === 0 && attribute.updateRanges[0].count === vertices, 'Only active authored prefix is uploaded');
      pairState.attribute = attribute; pairState.requestedUploadRanges = attribute.updateRanges.map(value => ({ ...value })); geometry.setAttribute(ATTRIBUTE, attribute);
    } else { geometry.deleteAttribute(ATTRIBUTE); }
    material.needsUpdate = true;
  }
  function restoreAttributes() {
    must(owner.mesh.geometry === originalGeometry, 'Original mesh geometry owner changed');
    for (const key of Object.keys(originalGeometry.attributes)) if (!originalAttributes.some(([original]) => original === key)) originalGeometry.deleteAttribute(key);
    for (const [key, attribute] of originalAttributes) originalGeometry.setAttribute(key, attribute);
    must(Object.keys(originalGeometry.attributes).length === originalAttributes.length && originalAttributes.every(([key, a]) => originalGeometry.getAttribute(key) === a), 'Original attribute set/identities not restored');
  }
  function cloneFixed(name) {
    const fixed = cameras[name], camera = originalCamera.clone(false);
    must(camera.isPerspectiveCamera && camera.parent === null && !camera.view?.enabled && camera.filmOffset === 0, 'Detached ordinary perspective clone required');
    must(equalWords(camera.projectionMatrix.toArray(), fixed.projection), 'Completed cap fixed projection differs');
    for (const key of ['fov', 'aspect', 'near', 'far', 'zoom']) must(Object.is(camera[key], fixed[key]), 'Completed cap projection parameter differs: ' + key);
    camera.position.fromArray(fixed.eye); camera.quaternion.fromArray(fixed.quaternion); camera.up.fromArray(fixed.inheritedUp); camera.updateMatrixWorld(true); return camera;
  }
  function capture(name, viewLabel, treatment) {
    const declaration = declaredPairs[completed.length];
    must(active && declaration?.camera === name && declaration.view === viewLabel && declaration.treatment === treatment, 'Exactly the declared ordered fixed-camera/view/treatment pairs are allowed');
    const combined = treatment === 'authored-mask-plus-sheet-fill-A';
    must(treatment === undefined || combined, 'Only the declared combined A treatment can extend mask-only pairs');
    const id = name + '-' + viewLabel + (combined ? '-combined-A' : ''), view = viewLabel === 'region' ? 'region' : undefined;
    must(!combined || (name === 'interior' && viewLabel === 'rich'), 'Combined A uses only the fixed interior Rich pair');
    must(viewLabel === 'rich' || viewLabel === 'region', 'Only normal Rich and flat region views are declared');
    const camera = cloneFixed(name), cameraBefore = words(camera), rawBefore = rawState(), originalDrawingBefore = geometryState(originalGeometry), evidenceStart = compiled.length;
    pairState = { id, view, combined, supportedVariant: combined ? 'authored-support-plus-sheet-fill-A' : 'authored-support' };
    let baselinePNG, authoredPNG, geometry, render, repeatedIdentically, attributeEvidence, pairComplete = false;
    try {
      material.onBeforeCompile = diagnosticCompile; material.customProgramCacheKey = diagnosticKey;
      owner.setView(view);
      if (view === 'region') {
        regionAttribute ??= owner.mesh.geometry.getAttribute('sweptView');
        must(regionAttribute, 'Original region-colour attribute unavailable'); owner.mesh.geometry.setAttribute('sweptView', regionAttribute);
      }
      setVariant('baseline'); d.renderView(camera);
      must(owner.view === view, 'Declared view output missing'); verifyRaw(rawBefore);
      geometry = geometryState(owner.mesh.geometry); render = renderState(); verifyGeometry(geometry);
      baselinePNG = d.canvas.toDataURL('image/png');
      setVariant(pairState.supportedVariant); d.renderView(camera);
      verifyRaw(rawBefore); verifyGeometry(geometry); verifyRenderState(render);
      must(equalWords(words(camera), cameraBefore), 'Fixed clone changed between variants');
      const a = pairState.attribute;
      attributeEvidence = { name: ATTRIBUTE, itemSize: a.itemSize, dtype: a.array.constructor.name, count: a.count, usage: a.usage,
        normalized: a.normalized, activeCopiedWords: mode.barrelLoft.vertexCount, actualFinalMaskBytesExact: true, constructorAndUsageFromExistingScalar: true,
        requestedUploadRanges: pairState.requestedUploadRanges, postRenderUpdateRanges: a.updateRanges.map(value => ({ ...value })) };
      authoredPNG = d.canvas.toDataURL('image/png');
      setVariant('baseline'); d.renderView(camera);
      verifyRaw(rawBefore); verifyGeometry(geometry); verifyRenderState(render);
      must(equalWords(words(camera), cameraBefore), 'Fixed clone changed on restored repeat');
      repeatedIdentically = baselinePNG === d.canvas.toDataURL('image/png'); must(repeatedIdentically, 'Restored baseline pixels differ');
      const evidence = compiled.slice(evidenceStart);
      must(evidence.some(value => value.variant === 'baseline') && evidence.some(value => value.variant === pairState.supportedVariant), 'Both pair shaders must compile');
      completed.push({ ...declaration }); pairComplete = true;
    } finally {
      material.onBeforeCompile = compile; material.customProgramCacheKey = programKey;
      owner.setView(originalView); variant = 'baseline'; restoreAttributes(); material.needsUpdate = true; d.renderView(originalCamera);
      verifyRaw(rawBefore); restoreAttributes(); verifyGeometry(originalDrawingBefore);
      if (!pairComplete) active = false;
      if (completed.length === declaredPairs.length) active = false;
    }
    return { complete: true, camera: name, view: viewLabel, seaTime, stepCount: 0, fixedPose: cameras[name], baselinePNG, authoredPNG,
      ...(combined ? { treatment } : {}),
      shaderEvidence: compiled.slice(evidenceStart), baselineRepeatPixelsIdentical: repeatedIdentically, attributeEvidence,
      guards: { exactPriorFull37ActiveWords: true, exactPriorRawFrontWords: true, originalDrawAttributesAndIndicesIdentical: true,
        onlyDeclaredFinalF32ScalarAttributeAdded: true, actorBoard8Rider33Unchanged: true, sameFixedCloneWords: true,
        waterMaskBytesImageAndGridIdentical: true, ordinaryWaterShaderMaterialAndGeometryUnchanged: true, depthStencilParametersUnchanged: true,
        originalShaderCacheViewAndAttributeSetRestored: true, normalCameraRestored: true, wallLightMatchesOnlyCompletedAOrOff: true },
      interpretation: (combined ? 'Exact final authored scalar support plus the source-pinned tested A sky/wall mixture; B throat bypass remains off. ' : 'Only final authored scalar support is added to the swept discard max. ') + 'Authored fade/dither remain. Additional coverage may overlap ordinary water, resolved by unchanged depth/stencil. No exact seam complementarity, core1-loss, radiance, skin, air-volume or ride certification.' };
  }
  window.__authoredMask = { capture, finish() {
    must(completed.length === declaredPairs.length && !active && material.onBeforeCompile === compile && material.customProgramCacheKey === programKey
      && owner.view === originalView, 'All declared pairs and final ordinary restoration required');
    restoreAttributes(); rawState(); must(equalWords(words(originalCamera), normalWords), 'Final normal camera changed');
    return { complete: true, completed, seaTime, stepCount: 0, originalShaderViewCameraRestored: true, originalAttributeSetRestored: true, shaderEvidence: compiled };
  } };
  rawState(); restoreAttributes();
  return { installed: true, seaTime, stepCount: 0, exactPriorGeometryRequired: true, declaredPairs, cameraSearch: false };
}
