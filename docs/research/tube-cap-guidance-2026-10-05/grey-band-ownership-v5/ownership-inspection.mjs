// Source-only preparation. Root owns checking, sealing, and native execution.
// Self-contained: CDP serializes this function, without module lexical bindings.
export function installGreyOwnershipInspection(expected, fixed, samples, baselineAuthority) {
  const d = window.breaklineDiagnostics, lab = window.breaklineLab, mode = d?.mode;
  const must = (value, why) => { if (!value) throw Error(why); };
  const host = mode?.host, snapshot = host?.snapshot, owner = mode?.barrelMesh, normalCamera = mode?.camera.camera;
  must(d && lab && host && snapshot && owner && normalCamera, 'Actual public physical draw owner required');
  must(!lab.active && lab.clock.paused && host.outstandingSteps === 0, 'Paused drained ordinary mode required');
  must(owner.view === undefined && owner.facesOut && owner.sheetShown && d.water.drawnLook === 'rich', 'Original ordinary Rich sheet required');
  const seaTime = snapshot.status.seaTime, status = snapshot.status, normalOwner = mode.camera;
  const cameraParent = normalCamera.parent, cameraView = JSON.stringify(normalCamera.view);
  const widths = { positions: 3, normals: 3, mask: 1, lift: 1, sheet: 1, sheetWeight: 1, sheetBack: 1, throat: 4 };
  const words = c => [...c.position.toArray(), ...c.quaternion.toArray(), ...c.up.toArray(), ...c.scale.toArray(),
    ...c.matrix.toArray(), ...c.matrixWorld.toArray(), ...c.matrixWorldInverse.toArray(), ...c.projectionMatrix.toArray(),
    ...c.projectionMatrixInverse.toArray(), c.fov, c.aspect, c.near, c.far, c.zoom, c.filmGauge, c.filmOffset];
  const equal = (a, b) => a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const normalWords = words(normalCamera);
  const bytes = (a, n) => {
    must(ArrayBuffer.isView(a) && Number.isSafeInteger(n) && n >= 0 && n <= a.length, 'Bounded typed prefix required');
    return new Uint8Array(a.buffer, a.byteOffset, n * a.BYTES_PER_ELEMENT).slice();
  };
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const decode = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const expectedArrays = Object.fromEntries(Object.entries(expected.arrays).map(([key, value]) => [key, decode(value.data)]));
  const expectedFront = decode(expected.rawFrontPacket.data);
  function assertActualDrawWinding(loft) {
    const geometry = owner.mesh.geometry;
    const attribute = geometry.index;
    const count = loft.indexCount;
    must(Number.isSafeInteger(count) && count >= 0 && count % 3 === 0
      && geometry.drawRange.start === 0 && geometry.drawRange.count === count
      && attribute && attribute.itemSize === 1 && attribute.array instanceof Uint32Array
      && attribute.array.length >= count && attribute.count >= count,
      'Actual indexed loft draw range/type/capacity differs');
    const index = attribute.array;
    const { positions: p, normals: n, indices: from } = loft;
    for (let i = 0; i < count; i += 3) {
      const a = from[i];
      const b = from[i + 1];
      const c = from[i + 2];
      must(a < loft.vertexCount && b < loft.vertexCount && c < loft.vertexCount,
        'Historical triangle index exceeds active vertex prefix at triangle ' + i / 3);
      const [a3, b3, c3] = [3 * a, 3 * b, 3 * c];
      const e1x = p[b3] - p[a3];
      const e1y = p[b3 + 1] - p[a3 + 1];
      const e1z = p[b3 + 2] - p[a3 + 2];
      const e2x = p[c3] - p[a3];
      const e2y = p[c3 + 1] - p[a3 + 1];
      const e2z = p[c3 + 2] - p[a3 + 2];
      // Identical arithmetic and < 0 branch to pinned historical renderer lines515–519.
      const facing = (e1y * e2z - e1z * e2y) * (n[a3] + n[b3] + n[c3]) + (e1z * e2x - e1x * e2z) * (n[a3 + 1] + n[b3 + 1] + n[c3 + 1])
        + (e1x * e2y - e1y * e2x) * (n[a3 + 2] + n[b3 + 2] + n[c3 + 2]);
      const flip = owner.facesOut && facing < 0;
      must(index[i] === a && index[i + 1] === (flip ? c : b) && index[i + 2] === (flip ? b : c),
        'Actual draw triangle differs from exact existing winding rule at triangle ' + i / 3);
    }
  }
  function raw() {
    const loft = mode.barrelLoft;
    must(loft && Object.keys(loft).filter(k => ArrayBuffer.isView(loft[k])).length === 37, 'Actual full37 loft required');
    must(loft.sliceCount === expected.counts.slices && loft.vertexCount === expected.counts.vertices && loft.indexCount === expected.counts.indices, 'Historical active counts differ; no search');
    const arrays = Object.entries(expected.arrays).map(([key, item]) => {
      const a = loft[key], n = key === 'indices' ? loft.indexCount : widths[key] ? widths[key] * loft.vertexCount : loft.sliceCount;
      must(n === item.count && a.constructor.name === item.dtype && same(bytes(a, n), expectedArrays[key]), 'Exact historical active words differ: ' + key);
      return { key, array: a, count: n, copy: bytes(a, n) };
    });
    must(Object.is(seaTime, expected.epoch.seaTime) && Object.is(snapshot.status.seaTime, seaTime), 'Historical zero-step epoch differs');
    must(snapshot.frontCount === expected.rawFrontPacket.recordCount && same(bytes(snapshot.front, snapshot.frontCount * 9), expectedFront), 'Historical raw333 front differs');
    const a = owner.mesh.geometry.getAttribute('sweptMask'), v = loft.vertexCount;
    must(a && a.itemSize === 1 && a.array instanceof Float32Array && a.usage === 35048 && !a.normalized
      && same(bytes(a.array, v), bytes(loft.mask, v)), 'Optical app must draw exact final authored F32 mask');
    const p = owner.mesh.geometry.getAttribute('position');
    must(p.itemSize === 3 && p.array instanceof Float32Array && same(bytes(p.array, 3 * v), bytes(loft.positions, 3 * v)), 'Actual loft draw positions differ');
    assertActualDrawWinding(loft);
    return { loft, arrays, front: snapshot.front, actors: [{ key: 'board', array: snapshot.board, count: 8, copy: bytes(snapshot.board, 8) },
      { key: 'rider', array: snapshot.rider, count: 33, copy: bytes(snapshot.rider, 33) }] };
  }
  function verifyRaw(before) {
    must(mode.host === host && host.snapshot === snapshot && snapshot.status === status && host.outstandingSteps === 0 && lab.clock.paused && !lab.active,
      'Published physical ownership or pause changed');
    must(mode.barrelMesh === owner && mode.barrelLoft === before.loft && mode.camera === normalOwner && mode.camera.camera === normalCamera
      && normalCamera.parent === cameraParent && JSON.stringify(normalCamera.view) === cameraView && equal(words(normalCamera), normalWords), 'Normal mode or camera changed');
    raw();
    for (const item of before.arrays) must(before.loft[item.key] === item.array && same(bytes(item.array, item.count), item.copy), 'Loft identity/words changed: ' + item.key);
    must(snapshot.front === before.front, 'Raw front identity changed');
    for (const item of before.actors) must(snapshot[item.key] === item.array && same(bytes(item.array, item.count), item.copy), 'Actor words changed: ' + item.key);
  }
  const water = d.water, repair = water.barrelFallback, repairPatch = water.barrelPatchFallback;
  must(repair && repairPatch && water.mesh.material === water.patch.material && repair.material === repairPatch.material
    && repair.material !== water.mesh.material, 'Actual separate ordinary and dynamically delegated repair materials required');
  const descriptors = [
    { kind: 'loft', id: 1, meshes: [owner.mesh], body: true },
    { kind: 'originalWater', id: 2, meshes: [water.mesh, water.patch], body: true },
    { kind: 'lateRepair', id: 3, meshes: [repair, repairPatch], body: true },
    { kind: 'seabed', id: 4, meshes: [mode.seabed.mesh], body: false },
    { kind: 'farOcean', id: 5, meshes: [mode.farField.mesh], body: true },
  ].map(item => ({ ...item, material: item.meshes[0].material }));
  must(new Set(descriptors.map(x => x.material)).size === 5, 'Five distinct actual material groups required');
  const DEFINE = 'BREAKLINE_TUBE_GREY_OWNER', COMMON = '#include <common>', FINAL = '#include <dithering_fragment>';
  const BODY = 'float waterViewCos = dot( waterN, waterV );', DECL = '\nfloat tubeGreyMeasuredBodyCos = 2.0;', ASSIGN = '\ntubeGreyMeasuredBodyCos = waterViewCos;';
  const WATER = 'if ( waterBarrelMaskActive > 0.5 && waterBarrelMaskAt( vWaterWorld.xz ) > waterBarrelDither( gl_FragCoord.xy ) ) discard;';
  const REPAIR = 'if ( waterBarrelMaskActive < 0.5 || waterBarrelMaskAt( vWaterWorld.xz ) <= waterBarrelDither( gl_FragCoord.xy ) ) discard;';
  const LOFT = 'if ( max( waterBarrelMaskAt( vWaterWorld.xz ), vSweptMask ) <= waterBarrelDither( gl_FragCoord.xy ) ) discard;';
  const outputs = {
    owner: `\n// tube-grey-owner-output-begin
  if ( BREAKLINE_TUBE_GREY_OWNER == 1 ) gl_FragColor.rgb = vec3( 1.0, 0.0, 1.0 );
  else if ( BREAKLINE_TUBE_GREY_OWNER == 2 ) gl_FragColor.rgb = vec3( 0.0, 1.0, 1.0 );
  else if ( BREAKLINE_TUBE_GREY_OWNER == 3 ) gl_FragColor.rgb = vec3( 1.0, 1.0, 0.0 );
  else if ( BREAKLINE_TUBE_GREY_OWNER == 4 ) gl_FragColor.rgb = vec3( 1.0, 0.0, 0.0 );
  else if ( BREAKLINE_TUBE_GREY_OWNER == 5 ) gl_FragColor.rgb = vec3( 0.0, 0.0, 1.0 );
// tube-grey-owner-output-end`,
    rasterFace: `\n// tube-grey-raster-face-output-begin
  gl_FragColor.rgb = gl_FrontFacing ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
// tube-grey-raster-face-output-end`,
    bodyCos: `\n// tube-grey-body-cos-output-begin
  if ( BREAKLINE_TUBE_GREY_OWNER == 4 ) gl_FragColor.rgb = vec3( 0.0, 0.0, 1.0 );
  else if ( isnan( tubeGreyMeasuredBodyCos ) || isinf( tubeGreyMeasuredBodyCos ) ) gl_FragColor.rgb = vec3( 1.0, 0.0, 1.0 );
  else if ( tubeGreyMeasuredBodyCos >= 0.0 ) gl_FragColor.rgb = vec3( 0.0, 1.0, clamp( tubeGreyMeasuredBodyCos, 0.0, 1.0 ) );
  else gl_FragColor.rgb = vec3( 1.0, 0.0, clamp( -tubeGreyMeasuredBodyCos, 0.0, 1.0 ) );
// tube-grey-body-cos-output-end`,
  };
  const occurrences = (s, token) => s.split(token).length - 1;
  const one = (s, token) => must(occurrences(s, token) === 1, 'One original shader anchor required: ' + token);
  function delta(fragment, treatment, hasBody) {
    const baseline = fragment;
    must(Object.hasOwn(outputs, treatment) && !fragment.includes('tube-grey-') && !fragment.includes('tubeGreyMeasuredBodyCos'), 'Only declared RGB probe permitted');
    one(fragment, FINAL);
    if (treatment === 'bodyCos') {
      one(fragment, COMMON); must(occurrences(fragment, BODY) === (hasBody ? 1 : 0), 'Body measurement must use actual water-body path');
      fragment = fragment.replace(COMMON, COMMON + DECL);
      if (hasBody) fragment = fragment.replace(BODY, BODY + ASSIGN);
    }
    fragment = fragment.replace(FINAL, FINAL + outputs[treatment]);
    let reversed = fragment.replace(outputs[treatment], '');
    if (treatment === 'bodyCos') { reversed = reversed.replace(DECL, ''); if (hasBody) reversed = reversed.replace(ASSIGN, ''); }
    must(reversed === baseline, 'Probe reverse must reproduce exact original fragment bytes');
    return fragment;
  }
  const stateKeys = ['depthTest','depthWrite','depthFunc','colorWrite','side','transparent','opacity','alphaTest','alphaHash','alphaToCoverage','premultipliedAlpha',
    'blending','blendSrc','blendDst','blendEquation','blendSrcAlpha','blendDstAlpha','blendEquationAlpha','stencilWrite','stencilRef','stencilFunc','stencilFuncMask',
    'stencilWriteMask','stencilFail','stencilZFail','stencilZPass','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','envMap','envMapIntensity','roughness',
    'metalness','ior','emissiveIntensity','displacementMap','displacementScale','displacementBias','depthPacking','toneMapped','fog','vertexColors'];
  const allMeshes = descriptors.flatMap(x => x.meshes);
  const legacy = mode.lipSheet.mesh;
  function legacyLipState() {
    const geometry=legacy.geometry,index=geometry.index,position=geometry.getAttribute('position');
    must(index && position && index.count===0 && position.count===0, 'Untargeted legacy lip must retain empty indexed geometry');
    const encoded=value=>Number.isFinite(value)?value:String(value);
    return {meshUUID:legacy.uuid,geometryUUID:geometry.uuid,visible:legacy.visible,indexPresent:true,indexCount:index.count,
      positionCount:position.count,drawRange:{start:encoded(geometry.drawRange.start),count:encoded(geometry.drawRange.count)},
      nonfiniteRangeEncoding:'String preserves Infinity rather than JSON null'};
  }
  const legacyAtInstallation=legacyLipState();
  function verifyLegacyLip() {
    must(JSON.stringify(legacyLipState())===JSON.stringify(legacyAtInstallation), 'Untargeted legacy lip indexed state changed');
  }
  const original = descriptors.map(x => ({ descriptor: x, compile: x.material.onBeforeCompile, key: x.material.customProgramCacheKey,
    originalKeyValue: x.material.customProgramCacheKey(), defines: x.material.defines, definesJSON: JSON.stringify(x.material.defines), shaderValues: [x.material.vertexShader, x.material.fragmentShader],
    values: stateKeys.map(k => x.material[k]), baselineVertex: null, baselineFragment: null }));
  must(original.every(x => !x.defines || !Object.hasOwn(x.defines, DEFINE)), 'No prior owner define');
  let stage = 'baseline', active = true, delegatedDepth = 0, completed = false, restored = false;
  const evidence = [], renderedStages = [];
  function materialGuard() {
    for (const saved of original) {
      const item = saved.descriptor, m = item.material;
      must(item.meshes.every(mesh => mesh.material === m) && equal(stateKeys.map(k => m[k]), saved.values)
        && equal([m.vertexShader,m.fragmentShader], saved.shaderValues), 'Original material, alpha, depth, stencil or shader properties changed: ' + item.kind);
      const defs = stage === 'baseline' ? saved.definesJSON : JSON.stringify({ ...saved.defines, [DEFINE]: item.id });
      must(JSON.stringify(m.defines) === defs && (stage !== 'baseline' || m.defines === saved.defines), 'Only exact ID define addition allowed');
      must(m.onBeforeCompile === saved.wrapper && m.customProgramCacheKey === saved.wrapperKey, 'Actual callback/cache wrapper changed');
    }
  }
  function drawState() {
    const u = water.materialUniforms, mask = u.waterBarrelMask.value;
    return { water, mask, image: mask.image, array: mask.image.data, maskBytes: bytes(mask.image.data, mask.image.data.length),
      maskProperties: [mask.image.width,mask.image.height,mask.format,mask.type,mask.minFilter,mask.magFilter,mask.wrapS,mask.wrapT],
      grid: u.waterBarrelGrid.value.toArray(), gridSize: u.waterBarrelGridSize.value.toArray(), maskActive: u.waterBarrelMaskActive.value,
      repairActive: u.waterBarrelScreenFallback.value,
      meshStates: [...allMeshes,legacy].map(mesh => ({ mesh, material: mesh.material, geometry: mesh.geometry,
        flags: [mesh.visible,mesh.renderOrder,mesh.frustumCulled,mesh.castShadow,mesh.receiveShadow], matrix: mesh.matrixWorld.toArray(),
        draw: [mesh.geometry.drawRange.start,mesh.geometry.drawRange.count], groups: JSON.stringify(mesh.geometry.groups),
        arrays: [...Object.entries(mesh.geometry.attributes).map(([key,a]) => ({ key, attribute:a, array:a.array, itemSize:a.itemSize,
          count:a.count, normalized:a.normalized, usage:a.usage, copy:bytes(a.array,a.count*a.itemSize) })),
          ...(mesh.geometry.index ? [{key:'@index',attribute:mesh.geometry.index,array:mesh.geometry.index.array,itemSize:1,count:mesh.geometry.index.count,
            normalized:mesh.geometry.index.normalized,usage:mesh.geometry.index.usage,copy:bytes(mesh.geometry.index.array,mesh.geometry.index.count)}] : [])] })) };
  }
  function verifyDraw(before) {
    const now = drawState();
    must(now.water === before.water && now.mask === before.mask && now.image === before.image && now.array === before.array
      && same(now.maskBytes,before.maskBytes) && equal(now.maskProperties,before.maskProperties) && equal(now.grid,before.grid)
      && equal(now.gridSize,before.gridSize) && now.maskActive === before.maskActive && now.repairActive === before.repairActive, 'Original mask bytes/grid/texture/repair state changed');
    must(now.maskActive === 1 && now.repairActive === 1 && water.barrelFallback === repair && water.barrelPatchFallback === repairPatch, 'Actual active fallback owner changed');
    for (let i = 0; i < before.meshStates.length; i++) {
      const a = before.meshStates[i], b = now.meshStates[i];
      must(a.mesh === b.mesh && a.material === b.material && a.geometry === b.geometry && equal(a.flags,b.flags) && equal(a.matrix,b.matrix)
        && equal(a.draw,b.draw) && a.groups === b.groups && a.arrays.length === b.arrays.length, 'Drawable transform/geometry/range changed');
      for (let j = 0; j < a.arrays.length; j++) {
        const x=a.arrays[j], y=b.arrays[j];
        must(x.key===y.key && x.attribute===y.attribute && x.array===y.array && x.itemSize===y.itemSize && x.count===y.count
          && x.normalized===y.normalized && x.usage===y.usage && same(x.copy,y.copy), 'Original drawable array identity/words changed');
      }
    }
    verifyLegacyLip();materialGuard();
  }
  for (const saved of original) {
    const item = saved.descriptor;
    saved.wrapper = function(shader, renderer) {
      must(active && ['baseline','owner','rasterFace','bodyCos'].includes(stage), 'Compile outside finite probe');
      if (item.kind === 'lateRepair') {
        delegatedDepth++;
        try { saved.compile.call(this, shader, renderer); } finally { delegatedDepth--; }
      } else saved.compile.call(this, shader, renderer);
      // The late clone dynamically calls original.onBeforeCompile. Do not mark/record that intermediate water shader.
      if (item.kind === 'originalWater' && delegatedDepth > 0) return;
      must(renderer.getContext() instanceof WebGL2RenderingContext, 'Actual WebGL2 compile required for finite cosine status');
      const vertex = shader.vertexShader, fragment = shader.fragmentShader;
      if (item.kind === 'loft') {
        one(fragment, LOFT); one(vertex,'attribute float sweptMask;'); one(fragment,'varying float vSweptMask;');
        one(fragment,'float sweptSkyShare = clamp( vSweptSheetBack, 0.0, 1.0 ) * sweptSkyTransmission;');
        one(fragment,'vec3 sweptBack = sweptSkyShare * sweptSky + ( 1.0 - sweptSkyShare ) * sweptWall;');
        one(fragment,'PI * textureCubeUV( envMap, envMapRotation * sweptSkyRay, roughnessFactor ).rgb * envMapIntensity');
        must(!fragment.includes('sweptSkyTransmission * PI * textureCubeUV'), 'Optical baseline must retain tested A');
        for (const s of ['sweptSkyTransmission = dot( sweptInside, sweptFarInwardN ) < 0.0 && length( sweptOutgoing ) > 0.0 ? 1.0 : 0.0;',
          'sweptSkyRay = sweptSkyTransmission > 0.0 ? sweptOutgoing : -waterV;',
          'radiance *= mix( 1.0, sweptLeaves( sweptMirror, sweptTip ) ? 1.0 : 0.0, vSweptThroat.w );']) one(fragment,s);
      }
      if (item.kind === 'originalWater') { one(fragment,WATER); must(!fragment.includes(REPAIR),'Ordinary shader cannot inherit repair predicate'); }
      if (item.kind === 'lateRepair') { one(fragment,REPAIR); must(!fragment.includes(WATER),'Repair must complete dynamic original callback and replace only its predicate first'); }
      must(occurrences(fragment,BODY)===(item.body?1:0),'Actual body path ownership differs');
      if (stage === 'baseline') {
        saved.baselineVertex ??= vertex; saved.baselineFragment ??= fragment;
        must(vertex===saved.baselineVertex && fragment===saved.baselineFragment,'Original baseline shader changed');
        must(shader.defines===saved.defines && (!shader.defines || !Object.hasOwn(shader.defines,DEFINE)), 'Baseline shader has probe define');
      } else {
        must(saved.baselineVertex!==null && vertex===saved.baselineVertex && fragment===saved.baselineFragment,'Original generated shader differs before RGB probe');
        must(shader.defines===item.material.defines && shader.defines[DEFINE]===item.id,'Actual final material compile must carry its distinct owner ID');
        shader.fragmentShader=delta(fragment,stage,item.body);
      }
      evidence.push({stage,kind:item.kind,ownerId:stage==='baseline'?null:item.id,materialUUID:item.material.uuid,
        meshUUIDs:item.meshes.map(m=>m.uuid),actualFinalMaterialDefinesVerified:true,vertexUnchanged:true,originalGeneratedSourceByteIdentical:true,
        onlyDeclaredReversibleRGBAndCosineDelta:stage!=='baseline',baselineShaderUnchanged:stage==='baseline',
        dynamicRepairDelegationResolved:item.kind==='lateRepair',allOriginalPredicatesAndAlphaRetained:true,
        beforeVertex:vertex,beforeFragment:fragment,afterVertex:shader.vertexShader,afterFragment:shader.fragmentShader});
    };
    saved.wrapperKey = function() { return saved.key.call(this)+'-grey-ownership-'+stage; };
  }
  function setStage(next) {
    must(active && ['baseline','owner','rasterFace','bodyCos'].includes(next),'Undeclared stage'); stage=next;
    for (const saved of original) {
      const m=saved.descriptor.material;
      m.onBeforeCompile=saved.wrapper; m.customProgramCacheKey=saved.wrapperKey;
      m.defines=next==='baseline'?saved.defines:{...saved.defines,[DEFINE]:saved.descriptor.id}; m.needsUpdate=true;
    }
  }
  const fixedCamera = normalCamera.clone(false);
  must(fixedCamera.isPerspectiveCamera && fixedCamera.parent===null && !fixedCamera.view?.enabled && fixedCamera.filmOffset===0, 'Detached original perspective clone required');
  must(equal(fixedCamera.projectionMatrix.toArray(),fixed.projection), 'Historical projection differs');
  for (const key of ['fov','aspect','near','far','zoom']) must(Object.is(fixedCamera[key],fixed[key]),'Historical camera parameter differs');
  fixedCamera.position.fromArray(fixed.eye); fixedCamera.quaternion.fromArray(fixed.quaternion); fixedCamera.up.fromArray(fixed.inheritedUp); fixedCamera.updateMatrixWorld(true);
  const fixedWords=words(fixedCamera), beforeRaw=raw();
  const ownerRGB={1:[255,0,255],2:[0,255,255],3:[255,255,0],4:[255,0,0],5:[0,0,255]};
  async function pngPixels(url) {
    const img=new Image(); img.src=url; await img.decode();
    must(img.width===1708 && img.height===879,'Fixed PNG dimensions differ');
    const canvas=document.createElement('canvas');canvas.width=1708;canvas.height=879;
    const context=canvas.getContext('2d',{willReadFrequently:true});must(context,'Independent encoded-PNG readback required');context.drawImage(img,0,0);
    return samples.map(sample=>({...sample,rgba:Array.from(context.getImageData(sample.pixel[0],sample.pixel[1],1,1).data)}));
  }
  async function sourceHash(source) { const b=new TextEncoder().encode(source);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join(''); }
  async function capture() {
    must(active && !completed,'One fixed interior capture only');
    let baselinePNG, beforeDraw, result;
    try {
      setStage('baseline'); d.renderView(fixedCamera); verifyRaw(beforeRaw);materialGuard();beforeDraw=drawState();verifyDraw(beforeDraw);
      must(original.every(x=>x.baselineFragment!==null),'All five actual drawable callbacks must compile in baseline');
      baselinePNG=d.canvas.toDataURL('image/png');
      const nativeBytes=decode(baselinePNG.slice(22));
      const nativeSHA=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',nativeBytes)),x=>x.toString(16).padStart(2,'0')).join('');
      must(nativeBytes.length===baselineAuthority.bytes && nativeSHA===baselineAuthority.sha256,'First fixed native baseline differs from completed combined authority; abort without any probe or search');
      verifyRaw(beforeRaw);verifyDraw(beforeDraw);
      const baselineSamples=await pngPixels(baselinePNG);verifyRaw(beforeRaw);verifyDraw(beforeDraw);
      const pngs={baseline:baselinePNG}, sampleOutputs={baseline:baselineSamples}, repeats=[];
      for (const treatment of ['owner','rasterFace','bodyCos']) {
        setStage(treatment);d.renderView(fixedCamera);verifyRaw(beforeRaw);verifyDraw(beforeDraw);
        must(equal(words(fixedCamera),fixedWords),'Fixed camera words changed');
        must(descriptors.every(x=>evidence.some(e=>e.stage===treatment&&e.kind===x.kind)),'All five actual probe callbacks must compile');
        pngs[treatment]=d.canvas.toDataURL('image/png');sampleOutputs[treatment]=await pngPixels(pngs[treatment]);verifyRaw(beforeRaw);verifyDraw(beforeDraw);
        renderedStages.push(treatment);
        setStage('baseline');d.renderView(fixedCamera);verifyRaw(beforeRaw);verifyDraw(beforeDraw);
        const exact=baselinePNG===d.canvas.toDataURL('image/png');must(exact,'Restored original baseline PNG differs after '+treatment);
        repeats.push({after:treatment,baselineRepeatPNGByteIdentical:true,originalDefinesObjectRestored:true});
      }
      const sampleEvidence=samples.map((sample,index)=>{
        const rgba=sampleOutputs.owner[index].rgba;
        const ids=Object.entries(ownerRGB).filter(([,rgb])=>rgba[3]===255&&equal(rgba.slice(0,3),rgb)).map(([id])=>Number(id));
        return {...sample,baselineRGBA:sampleOutputs.baseline[index].rgba,ownerRGBA:rgba,rasterFaceRGBA:sampleOutputs.rasterFace[index].rgba,
          bodyCosRGBA:sampleOutputs.bodyCos[index].rgba,unmixedEncodedOwnerId:ids.length===1?ids[0]:null,
          unmixedEncodedOwnerKind:ids.length===1?descriptors.find(x=>x.id===ids[0]).kind:null,
          qualification:'An exact marker identifies only the encoded surviving contribution. Blended, MSAA or unmarked results remain ambiguous; facing/cos require a separately unmixed contribution.'};
      });
      const shaderEvidence=[];
      for (const e of evidence) {
        const {beforeVertex,beforeFragment,afterVertex,afterFragment,...fields}=e;
        shaderEvidence.push({...fields,vertexCharacters:beforeVertex.length,originalFragmentCharacters:beforeFragment.length,
          addedFragmentCharacters:afterFragment.length-beforeFragment.length,
          originalVertexSHA256:await sourceHash(beforeVertex),originalFragmentSHA256:await sourceHash(beforeFragment),
          actualVertexSHA256:await sourceHash(afterVertex),actualFragmentSHA256:await sourceHash(afterFragment)});
      }
      verifyRaw(beforeRaw);verifyDraw(beforeDraw);completed=true;
      result={complete:true,stepCount:0,seaTime,camera:'interior',view:'rich',fixedPose:fixed,pngs,restoredRepeats:repeats,samples:sampleEvidence,legacyLipState:legacyLipState(),
        shaderEvidence,renderedStages,materialGroups:descriptors.map(x=>({kind:x.kind,id:x.id,materialUUID:x.material.uuid,meshUUIDs:x.meshes.map(m=>m.uuid),
          originalDefines:original.find(y=>y.descriptor===x).definesJSON,originalCacheKey:original.find(y=>y.descriptor===x).originalKeyValue})),
        guards:{exactHistoricalFull37Words:true,exactHistoricalRaw333FrontWords:true,exactFinalAuthoredMaskDrawWords:true,actualLoftPositionAndIndexPrefix:true,
          allOriginalDrawableArrayIdentitiesAndWords:true,allOriginalPredicatesAndAlpha:true,waterMaskBytesImageGridAndShaderProperties:true,
          materialDepthStencilBlendingAndOpacity:true,allFiveActualMaterialIdDefines:true,lateRepairDynamicDelegation:true,normalCameraAndActorWords:true,
          fixedCameraWords:true,legacyLipIndexedGeometryEmpty:true,noPhysicalSteps:true,firstBaselineNativePNGMatchesCombinedAuthorityBeforeAnyProbe:true},
        interpretation:'RGB-only surviving-contribution instrumentation; mixed IDs remain ambiguous. No geometry fix, support repair, lighting fix, playability, air-volume or whole-body certification.'};
    } finally {
      for (const saved of original) {const m=saved.descriptor.material;m.onBeforeCompile=saved.compile;m.customProgramCacheKey=saved.key;m.defines=saved.defines;m.needsUpdate=true;}
      active=false;d.renderView(normalCamera);verifyRaw(beforeRaw);
      must(original.every(x=>x.descriptor.material.onBeforeCompile===x.compile&&x.descriptor.material.customProgramCacheKey===x.key
        && x.descriptor.material.defines===x.defines && JSON.stringify(x.descriptor.material.defines)===x.definesJSON),'Original callback/cache/define identities not restored');
      must(owner.view===undefined && equal(words(normalCamera),normalWords),'Original Rich view/camera not restored');restored=true;
    }
    return result;
  }
  window.__greyOwnership={capture,finish(){must(completed&&restored&&!active,'Complete fixed capture and exact original restoration required');verifyRaw(beforeRaw);
    return {complete:true,stepCount:0,seaTime,originalShaderCacheDefineViewAndCameraRestored:true,originalAttributesNeverModified:true,completedStages:[...renderedStages]};}};
  return {installed:true,stepCount:0,seaTime,exactHistoricalGeometryRequired:true,legacyLipIndexedGeometryEmpty:true,legacyLipState:legacyAtInstallation,declaredMaterials:descriptors.map(x=>({kind:x.kind,id:x.id})),cameraSearch:false,epochSearch:false};
}
