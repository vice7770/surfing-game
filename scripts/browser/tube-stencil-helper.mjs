// Serialized into the committed frozen helper's closure by tube-stencil-prototype.mjs.
// Ephemeral diagnostic only: no renderer or shader source in production is changed.
export function installStencilOwnership(env) {
  const { d, mode, water, mesh, getDiagnostic, getCurrent } = env;
  const gl = d.canvas.getContext('webgl2');
  if (!gl || !gl.getContextAttributes().stencil || gl.getParameter(gl.STENCIL_BITS) < 1) throw Error('Stencil drawing buffer unavailable');
  const enabled = { value: 0 };
  const state = { mode: 'world', hidden: false, inactive: false };
  const sourceMaterial = mesh.mesh.material, waterMaterial = water.mesh.material;
  const originalCompile = sourceMaterial.onBeforeCompile, originalKey = sourceMaterial.customProgramCacheKey;
  const waterCompile = waterMaterial.onBeforeCompile, waterKey = waterMaterial.customProgramCacheKey;
  const originalOrders = new Map();
  for (const object of [mode.seabed.mesh, mesh.mesh, water.mesh, ...water.mesh.children]) originalOrders.set(object, object.renderOrder);
  const waterStencil = waterMaterial.stencilWrite;
  const owner = mesh.mesh.clone(false);
  owner.name = 'isolated-stencil-ownership';
  owner.geometry = mesh.mesh.geometry;
  owner.material = sourceMaterial.clone();
  owner.visible = false;
  owner.frustumCulled = mesh.mesh.frustumCulled;
  owner.matrixAutoUpdate = false;
  owner.material.onBeforeCompile = originalCompile;
  owner.material.customProgramCacheKey = originalKey;
  Object.assign(owner.material, { colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1,
    stencilFunc: gl.ALWAYS, stencilFuncMask: 1, stencilWriteMask: 1,
    stencilFail: gl.KEEP, stencilZFail: gl.KEEP, stencilZPass: gl.REPLACE });
  mode.scene.add(owner);
  const provenance = { stencil: { attributes: gl.getContextAttributes(), bits: gl.getParameter(gl.STENCIL_BITS),
    depthBits: gl.getParameter(gl.DEPTH_BITS) }, shaders: {} };
  function assertFragmentParity(shader, material, renderer, name) {
    const flags = { logdepth: Boolean(renderer.capabilities.logarithmicDepthBuffer), map: Boolean(material.map),
      alphaMap: Boolean(material.alphaMap), alphaTest: material.alphaTest, alphaHash: material.alphaHash,
      alphaToCoverage: material.alphaToCoverage, transmission: material.transmission, opacity: material.opacity,
      transparent: material.transparent, clippingPlanes: material.clippingPlanes?.length ?? 0 };
    if (flags.logdepth || flags.map || flags.alphaMap || flags.alphaTest || flags.alphaHash || flags.alphaToCoverage
      || flags.transmission || flags.transparent || flags.opacity !== 1 || flags.clippingPlanes) throw Error(name + ': fragment parity requires the recorded opaque/no-alpha/no-logdepth material');
    const discard = 'if ( waterBarrelMaskAt( vWaterWorld.xz ) <= waterBarrelDither( gl_FragCoord.xy ) ) discard;';
    if (shader.fragmentShader.split(discard).length !== 2) throw Error(name + ': expected exactly one original swept discard');
    const tail = shader.fragmentShader.slice(shader.fragmentShader.indexOf(discard) + discard.length);
    if (/\bdiscard\b|gl_FragDepth/.test(tail)) throw Error(name + ': later explicit depth/discard path');
    const guardedChunks = ['logdepthbuf_fragment', 'map_fragment', 'alphamap_fragment', 'alphatest_fragment', 'alphahash_fragment'];
    provenance.shaders[name] = { flags, laterExplicitDiscardOrDepth: false, guardedChunks,
      vertex: shader.vertexShader, fragment: shader.fragmentShader,
      depth: { test: material.depthTest, write: material.depthWrite, func: material.depthFunc, side: material.side,
        polygonOffset: material.polygonOffset, polygonOffsetFactor: material.polygonOffsetFactor, polygonOffsetUnits: material.polygonOffsetUnits } };
    return discard;
  }
  const activeGuard = 'if ( tubeStencilPrototype > 0.5 && waterBarrelMaskActive < 0.5 ) discard;';
  sourceMaterial.onBeforeCompile = (shader, renderer) => {
    originalCompile.call(sourceMaterial, shader, renderer);
    const discard = assertFragmentParity(shader, sourceMaterial, renderer, 'normalSwept');
    shader.uniforms.tubeStencilPrototype = enabled;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float tubeStencilPrototype;')
      .replace(discard, activeGuard + '\n' + discard);
  };
  sourceMaterial.customProgramCacheKey = () => originalKey.call(sourceMaterial) + '-isolated-stencil-normal-v1';
  sourceMaterial.needsUpdate = true;
  owner.material.onBeforeCompile = (shader, renderer) => {
    originalCompile.call(owner.material, shader, renderer);
    const discard = assertFragmentParity(shader, owner.material, renderer, 'ownershipPrepass');
    shader.uniforms.tubeStencilPrototype = enabled;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float tubeStencilPrototype;')
      .replace(discard, activeGuard + '\n' + discard + '\ngl_FragColor = vec4( 0.0 ); return;');
  };
  owner.material.customProgramCacheKey = () => originalKey.call(owner.material) + '-isolated-stencil-prepass-v1';
  waterMaterial.onBeforeCompile = (shader, renderer) => {
    waterCompile.call(waterMaterial, shader, renderer);
    const discard = 'if ( waterBarrelMaskActive > 0.5 && waterBarrelMaskAt( vWaterWorld.xz ) > waterBarrelDither( gl_FragCoord.xy ) ) discard;';
    if (shader.fragmentShader.split(discard).length !== 2) throw Error('Expected exactly one original water barrel discard');
    provenance.shaders.water = { vertex: shader.vertexShader, fragment: shader.fragmentShader };
    shader.uniforms.tubeStencilPrototype = enabled;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float tubeStencilPrototype;')
      .replace(discard, discard.replace('if ( ', 'if ( tubeStencilPrototype < 0.5 && '));
  };
  waterMaterial.customProgramCacheKey = () => waterKey.call(waterMaterial) + '-isolated-stencil-water-v1';
  waterMaterial.needsUpdate = true;
  const draw = mode.drawBarrel;
  mode.drawBarrel = () => {
    draw();
    const ordered = state.mode !== 'world', active = state.mode === 'stencil';
    enabled.value = active ? 1 : 0;
    if (state.inactive) water.setBarrelMask(null);
    if (state.hidden) mesh.mesh.visible = false;
    for (const [object, order] of originalOrders) object.renderOrder = ordered
      ? object === mode.seabed.mesh ? -30 : object === mesh.mesh ? 0 : -10 : order;
    owner.renderOrder = -20;
    owner.visible = active && mesh.mesh.visible && water.materialUniforms.waterBarrelMaskActive.value > 0.5;
    owner.geometry = mesh.mesh.geometry;
    owner.matrix.copy(mesh.mesh.matrix);
    owner.matrixWorld.copy(mesh.mesh.matrixWorld);
    Object.assign(waterMaterial, { stencilWrite: active ? true : waterStencil, stencilRef: 0,
      stencilFunc: gl.EQUAL, stencilFuncMask: 1, stencilWriteMask: 0,
      stencilFail: gl.KEEP, stencilZFail: gl.KEEP, stencilZPass: gl.KEEP });
  };
  const snapshots = {};
  const is = (buffer, n, r, g, b) => buffer[4 * n] === r && buffer[4 * n + 1] === g && buffer[4 * n + 2] === b;
  const equal = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  function remember(variant) {
    const pixels = getDiagnostic().pixels;
    snapshots[variant] = Object.fromEntries(['masked-ids', 'unmasked-ids', 'swept-solid'].map(k => [k, pixels[k].slice()]));
  }
  function set(renderMode, hidden = false, inactive = false) {
    if (!['world', 'order', 'stencil'].includes(renderMode)) throw Error('Unknown stencil prototype mode');
    Object.assign(state, { mode: renderMode, hidden, inactive });
  }
  function captureControl(name, renderMode, hide, inactive) {
    set(renderMode, hide, inactive);
    env.diagnosticRender('masked-ids');
    snapshots[name] = getDiagnostic().pixels['masked-ids'].slice();
    if (inactive && water.materialUniforms.waterBarrelMaskActive.value !== 0 || hide && mesh.mesh.visible
      || renderMode === 'stencil' && (hide || inactive) && owner.visible) throw Error('Inactive/hidden ownership guard failed');
    return { name, mode: renderMode, seaTime: mode.host.snapshot.status.seaTime,
      active: water.materialUniforms.waterBarrelMaskActive.value, sweptVisible: mesh.mesh.visible, prepassVisible: owner.visible };
  }
  async function summary() {
    const before = snapshots.baseline['masked-ids'], after = snapshots.current['masked-ids'];
    const wet = snapshots.baseline['unmasked-ids'];
    const counts = { roofPixelsBefore: 0, roofPixelsAfter: 0, lostOriginalRoofPixels: 0,
      newlyExposedSeabed: 0, exposedWetSeabedBefore: 0, exposedWetSeabedAfter: 0,
      restoredWaterFromSeabed: 0, newWaterFromFarField: 0, newWaterFromOther: 0 };
    for (let n = 0; n < before.length / 4; n++) {
      const roofA = is(before, n, 255, 0, 0), roofB = is(after, n, 255, 0, 0);
      const bedA = is(before, n, 255, 255, 0), bedB = is(after, n, 255, 255, 0);
      const waterB = is(after, n, 0, 0, 255), wetRef = is(wet, n, 0, 0, 255);
      counts.roofPixelsBefore += roofA; counts.roofPixelsAfter += roofB;
      counts.lostOriginalRoofPixels += roofA && !roofB;
      counts.newlyExposedSeabed += bedB && !bedA;
      counts.exposedWetSeabedBefore += bedA && wetRef;
      counts.exposedWetSeabedAfter += bedB && wetRef;
      counts.restoredWaterFromSeabed += bedA && waterB;
      counts.newWaterFromFarField += is(before, n, 255, 0, 255) && waterB;
      counts.newWaterFromOther += !roofA && !bedA && !is(before, n, 0, 0, 255) && !is(before, n, 255, 0, 255) && waterB;
    }
    const controls = { bedFirstIdsExact: equal(before, snapshots.orderOnly),
      inactiveIdsExact: equal(snapshots.reference, snapshots.inactive), hiddenIdsExact: equal(snapshots.reference, snapshots.hidden) };
    const shaders = {};
    for (const [name, entry] of Object.entries(provenance.shaders)) {
      shaders[name] = { ...entry, vertex: undefined, fragment: undefined,
        vertexSha256: await env.hash(new TextEncoder().encode(entry.vertex)), fragmentSha256: await env.hash(new TextEncoder().encode(entry.fragment)) };
    }
    const parity = { prepassVertexExact: provenance.shaders.normalSwept.vertex === provenance.shaders.ownershipPrepass.vertex,
      prepassOriginalFragmentExact: provenance.shaders.normalSwept.fragment === provenance.shaders.ownershipPrepass.fragment,
      sameGeometryObject: owner.geometry === mesh.mesh.geometry, sameDrawRange: owner.geometry.drawRange === mesh.mesh.geometry.drawRange,
      sameSide: owner.material.side === sourceMaterial.side, sameDepthTest: owner.material.depthTest === sourceMaterial.depthTest,
      sameDepthFunc: owner.material.depthFunc === sourceMaterial.depthFunc, prepassDepthWrite: owner.material.depthWrite,
      normalDepthWrite: sourceMaterial.depthWrite, prepassColourWrite: owner.material.colorWrite };
    if (!Object.values(controls).every(Boolean) || !parity.prepassVertexExact || !parity.prepassOriginalFragmentExact
      || counts.lostOriginalRoofPixels || counts.newlyExposedSeabed) throw Error('Stencil prototype failed ownership/control/parity check: ' + JSON.stringify({ counts, controls, parity }));
    return { counts, controls, parity, stencil: provenance.stencil, shaders,
      limitations: ['Newly restored water can fill an intended tube cavity. Hole and roof counts do not prove cavity shape is correct.',
        'Pure foreground IDs exclude antialiased boundaries; ID alpha overrides distant transparent far-field fades.'] };
  }
  function focus() {
    const loft = getCurrent().loft, camera = window.__tubeFrozenCamera, points = [], v = camera.position.clone();
    const stride = loft.vertexCount / loft.sliceCount;
    for (let s = 0; s < loft.sliceCount; s++) if (loft.sliceFormed[s] > 0.05 && loft.sliceWeight[s] > 0.3) {
      v.set(loft.sliceTipX[s], loft.sliceTipY[s], loft.sliceTipZ[s]).project(camera);
      if (Math.abs(v.x) < 0.8 && Math.abs(v.y) < 0.8 && v.z > -1 && v.z < 1) points.push({ s, x: (v.x + 1) * d.canvas.width / 2,
        y: (1 - v.y) * d.canvas.height / 2, mouth: loft.sliceMouth[s], stride });
    }
    points.sort((a, b) => b.mouth - a.mouth);
    if (!points.length) throw Error('No visible formed roof for focused image');
    const region = p => ({ slice: p.s, front: loft.sliceFront[p.s], sigma: loft.sliceSigma[p.s], mouth: p.mouth,
      clip: { x: Math.max(0, Math.min(d.canvas.width - 420, Math.round(p.x - 210))),
        y: Math.max(0, Math.min(d.canvas.height - 300, Math.round(p.y - 150))), width: 420, height: 300, scale: 1 } });
    return { roof: region(points[0]), mouthEdge: region(points.at(-1)) };
  }
  const normalOutput = () => {
    const diagnostic = getDiagnostic();
    diagnostic.output.value = 0;
    diagnostic.bypass.value = 0;
    for (const entry of diagnostic.entries) entry.mesh.visible = entry.visible;
  };
  window.__tubeStencil = { set, remember, captureControl, summary, focus, normalOutput };
  return { stencilBits: provenance.stencil.bits };
}
