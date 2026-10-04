from pathlib import Path
import json, hashlib, difflib, os
W=Path('/private/tmp/surf-tube-rowband-diagnostic-20261004')
P=Path('/private/tmp/surf-tube-rowband-native-20261004')
s=(P/'entry.ts').read_text()
s=s.replace('type BufferGeometry, type Material', 'type BufferGeometry, type Material, type Mesh, type Texture, type Vector2, type Vector4')
s=s.replace('__ROWBAND_CANDIDATE__','__ROWBAND_DIAGNOSTIC_CANDIDATE__')
s=s.replace("const apiWindow = window as unknown as { naturalTubeQA?: unknown };", "const apiWindow = window as unknown as { rowbandDiagnosticQA?: unknown };\nconst STAGES = __ROWBAND_DIAGNOSTIC_CANDIDATE__\n  ? ['initial-narrow', 'repeat-narrow', 'private-full', 'repeat-private-full', 'source-alias-full', 'restore-narrow']\n  : ['initial-full', 'repeat-full-1', 'repeat-full-2'];\nconst base64 = (bytes: Uint8Array) => {\n  let binary = ''; for (let o = 0; o < bytes.length; o += 8192) binary += String.fromCharCode(...bytes.subarray(o, o + 8192));\n  return btoa(binary);\n};\ninterface CompiledProgram { id: number; cacheKey: string; program: WebGLProgram; vertexShader: WebGLShader; fragmentShader: WebGLShader }\ninterface PassiveWater { uniforms: { waterBarrelMask: { value: Texture }; waterBarrelGrid: { value: Vector4 }; waterBarrelGridSize: { value: Vector2 }; waterBarrelMaskActive: { value: number }; waterBarrelScreenFallback: { value: number } } }")
a=s.index('  const decoded: Decoded[] = [];')
b=s.index("  const cases = barrelCasesFor('padang');",a)
s=s[:a]+'''  // Decode only the unchanged first actual frame. Full manifest/binary authority remains verified.
  const frame = capture.frames[0];
  assert(frame.index === 0 && frame.step === 664 && frame.selected.pointId === 3 && frame.selected.jetStrip === 2, 'Fixed first physical frame required');
  const field = (name: string) => { const f = frame.fields.find(v => v.name === name); assert(f, 'Captured field missing: ' + name); return f; };
  const initial: Decoded = { frame, front: await decode(field('frontControls')), surface: await decode(field('surface')),
    flow: await decode(field('flow')), aeration: await decode(field('aeration')), tubes: await decode(field('actualTubeTable')) };
''' +s[b:]
s=s.replace('  const initial = decoded[0];\n','')
s=s.replace('  let view = -1, previous = -1;', '''  let previous = -1, setupCalls = 0, causticCalls = 0;
  let savedView: BufferGeometry | undefined, savedHook: Mesh['onBeforeRender'] | undefined;
  let fixedPrimary: { coarse: ReturnType<typeof range>; patch: ReturnType<typeof range> } | undefined;
  let below = false;
  const pngCanvas = document.createElement('canvas'); pngCanvas.width = WIDTH; pngCanvas.height = HEIGHT;
  const pngContext = pngCanvas.getContext('2d'); assert(pngContext, 'Lossless raw-RGBA PNG encoder unavailable');
  const pngImage = pngContext.createImageData(WIDTH, HEIGHT);''')
s=s.replace("      assert(__ROWBAND_DIAGNOSTIC_CANDIDATE__ ? repair.geometry !== owner : repair.geometry === owner, 'Actual full/rowband geometry identity differs');", "      const shouldAlias = !__ROWBAND_DIAGNOSTIC_CANDIDATE__ || STAGES[previous] === 'source-alias-full';\n      assert(shouldAlias ? repair.geometry === owner : repair.geometry === savedView && repair.geometry !== owner, 'Diagnostic private/alias geometry identity differs');")
a=s.index('  const qa = {')
b=s.index('    async finish() {',a)
s=s[:a]+'''  const passive = async (includeBytes: boolean) => {
    const repair = water.barrelFallback; assert(repair, 'First frame must have an actual coarse fallback');
    // Read actual existing owner fields without calling mutating mask-grid getters or cache hooks.
    const uniforms = (water as unknown as PassiveWater).uniforms, texture = uniforms.waterBarrelMask.value;
    const image = texture.image as { data: Uint8Array; width: number; height: number };
    assert(image.data instanceof Uint8Array && image.width * image.height === image.data.length, 'Actual U8 mask texture required');
    let minX = image.width, minZ = image.height, maxX = -1, maxZ = -1, nonzero = 0, max = 0;
    for (let j = 0; j < image.height; j++) for (let i = 0; i < image.width; i++) { const v = image.data[j * image.width + i];
      if (v) { nonzero++; minX = Math.min(minX, i); maxX = Math.max(maxX, i); minZ = Math.min(minZ, j); maxZ = Math.max(maxZ, j); max = Math.max(max, v); }
    }
    const gpu = renderer.properties.get(repair.material).currentProgram as CompiledProgram | undefined;
    const actualUniform = (name: string) => {
      if (!gpu?.program) return null;
      const location = gl.getUniformLocation(gpu.program, name); if (location === null) return null;
      const value: unknown = gl.getUniform(gpu.program, location);
      return value instanceof Float32Array || value instanceof Int32Array || value instanceof Uint32Array ? Array.from(value) : value;
    };
    const textHash = (text: string | null) => text === null ? null : hash(new TextEncoder().encode(text));
    const gridF32 = Float32Array.from(uniforms.waterBarrelGrid.value.toArray()), sizeF32 = Float32Array.from(uniforms.waterBarrelGridSize.value.toArray());
    return { mask: { bytes: image.data.byteLength, width: image.width, height: image.height, sha256: await hash(image.data),
        nonzero, max, positiveBBox: nonzero ? { minX, maxX, minZ, maxZ } : null,
        rawBase64: includeBytes ? base64(image.data) : undefined,
        gridJS: uniforms.waterBarrelGrid.value.toArray(), gridF32: Array.from(gridF32), gridF32Sha256: await hash(gridF32),
        gridSizeF32: Array.from(sizeF32), gridSizeF32Sha256: await hash(sizeF32),
        active: uniforms.waterBarrelMaskActive.value, fallback: uniforms.waterBarrelScreenFallback.value,
        texture: { version: texture.version, width: image.width, height: image.height, wrapS: texture.wrapS, wrapT: texture.wrapT,
          minFilter: texture.minFilter, magFilter: texture.magFilter, flipY: texture.flipY, generateMipmaps: texture.generateMipmaps } },
      matrices: { sourceWorld: water.mesh.matrixWorld.toArray(), repairWorld: repair.matrixWorld.toArray(),
        repairModelView: repair.modelViewMatrix.toArray(), repairNormal: repair.normalMatrix.toArray() },
      program: gpu ? { id: gpu.id, cacheKey: gpu.cacheKey, vertexSha256: await textHash(gl.getShaderSource(gpu.vertexShader)),
        fragmentSha256: await textHash(gl.getShaderSource(gpu.fragmentShader)),
        maskGridGPU: actualUniform('waterBarrelGrid'), maskGridSizeGPU: actualUniform('waterBarrelGridSize'),
        maskActiveGPU: actualUniform('waterBarrelMaskActive'), fallbackGPU: actualUniform('waterBarrelScreenFallback') } : null,
      opticalReferences: { causticTexture: water.causticUniforms.causticMap.value === caustics.texture,
        reflection: water.mesh.material.envMap === reflection.texture },
      setupCalls, causticCalls };
  };
  const qa = {
    arm: ARM, stages: STAGES, canvas: renderer.domElement,
    async initialize() { return { arm: ARM, decodedFrames: 1, sourceCaptureFrames: capture.frames.length, cases: await Promise.all(bytes.map(hash)),
      context: gl.getContextAttributes(), stencilBits: gl.getParameter(gl.STENCIL_BITS), grid: capture.meta.renderGrid,
      camera: cameras[0], stages: STAGES,
      light: { method: 'Unchanged production Environment/light/painted sky/actual water.setSun; no optical, fog, camera or shader replacement.', sunSettings },
      methods: 'Actual SnapshotSampler→SnapshotSurfZone(swept)→PhysicalSurfaceSource→WaterSurface.update→PhysicalMode.drawBarrel once; actual caustics once.' }; },
    async draw(index: number) {
      assert(index === previous + 1 && index < STAGES.length, 'Fixed diagnostic order only'); previous = index;
      if (index === 0) {
        camera.position.fromArray(cameras[0].position); camera.lookAt(new Vector3().fromArray(cameras[0].target)); camera.updateMatrixWorld();
        water.update(); PhysicalMode.prototype.drawBarrel.call(mode); setupCalls++;
        const repair = water.barrelFallback; assert(repair, 'Actual first-frame fallback required');
        savedView = repair.geometry; savedHook = repair.onBeforeRender;
        fixedPrimary = { coarse: range(water.mesh.geometry), patch: range(water.patch.geometry) };
        below = PhysicalMode.prototype.cameraBelowSurface.call(mode);
        scene.fog = below ? new FogExp2('#1e7a87', .12) : null; environment.group.position.copy(camera.position);
        camera.getWorldDirection(ahead); caustics.render(renderer, camera.position.x + ahead.x * CAUSTIC_WINDOW / 3, camera.position.z + ahead.z * CAUSTIC_WINDOW / 3); causticCalls++;
      }
      const repair = water.barrelFallback; assert(repair && savedView && savedHook && fixedPrimary, 'Fixed scene setup missing');
      if (__ROWBAND_DIAGNOSTIC_CANDIDATE__ && index === 2) {
        // QA counterfactual: preserve original hook/callback effects, then override ONLY the private range.
        const hook = savedHook, view = savedView;
        repair.onBeforeRender = (...args) => { hook.apply(repair, args); view.setDrawRange(water.mesh.geometry.drawRange.start, water.mesh.geometry.drawRange.count); };
      } else if (__ROWBAND_DIAGNOSTIC_CANDIDATE__ && index === 4) {
        repair.geometry = water.mesh.geometry; repair.onBeforeRender = () => {};
      } else if (__ROWBAND_DIAGNOSTIC_CANDIDATE__ && index === 5) {
        repair.geometry = savedView; repair.onBeforeRender = savedHook;
      }
      renderer.render(scene, camera);
      assert(renderer.getRenderTarget() === null && gl.drawingBufferWidth === WIDTH && gl.drawingBufferHeight === HEIGHT, 'Actual normal default framebuffer dimensions differ');
      // Retain exact bytes synchronously before any await. No further draw/update occurs until driver requests next stage.
      gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, framePixels);
      assert(gl.getError() === gl.NO_ERROR, 'Normal framebuffer render/read error');
      const retained = new Uint8Array(framePixels), ranges = rowRanges(fixedPrimary.coarse, fixedPrimary.patch);
      const pixelSha256 = await hash(retained), witnesses = await passive(index === 0);
      // Lossless PNG encodes this SAME saved raw framebuffer. Flip bottom-up rows only; no resizing/color edits.
      for (let j = 0; j < HEIGHT; j++) pngImage.data.set(retained.subarray((HEIGHT - j - 1) * WIDTH * 4, (HEIGHT - j) * WIDTH * 4), j * WIDTH * 4);
      pngContext.putImageData(pngImage, 0, 0);
      const blob = await new Promise<Blob>((accept, reject) => pngCanvas.toBlob(value => value ? accept(value) : reject(Error('PNG encode failed')), 'image/png'));
      const png = new Uint8Array(await blob.arrayBuffer());
      const loft = barrel.lastLoft;
      const sourceHash = { front: await hash(initial.front), surface: await hash(initial.surface), flow: await hash(initial.flow), aeration: await hash(initial.aeration) };
      assert(sourceHash.surface === await hash(water.surfaceData), 'Uploaded actual water differs from captured field');
      projection.set(frame.selected.point.x, .6, frame.selected.point.z).project(camera);
      return { arm: ARM, stage: STAGES[index], draw: index, view: 0, frame: 0, step: 664,
        clock: { time: frame.time, seaTime: frame.seaTime }, sourceHash, rowRanges: ranges, witnesses,
        framebuffer: { width: WIDTH, height: HEIGHT, byteLength: retained.byteLength, order: 'RGBA8 bottom-up WebGL readPixels', sha256: pixelSha256 },
        payload: { rgbaBase64: base64(retained), pngBase64: base64(png), pngBytes: png.byteLength, pngSha256: await hash(png),
          pngEncoding: 'Native 2D canvas lossless PNG from exact saved framebuffer RGBA with bottom-to-top row flip only; 960×540; no compositor screenshot.' },
        primaryGeometry: { positionSha256: await hash(water.mesh.geometry.getAttribute('position').array), indexSha256: await hash(water.mesh.geometry.index!.array) },
        belowSurface: below, hostHeightAtCamera: host.heightAt(camera.position.x, camera.position.z), stillLevel: capture.meta.fixture.tide,
        camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray() },
        selectedWorldProjection: projection.toArray(), selectedBracket: bracket(loft, frame), frontCount: frame.frontCount,
        geometry: loft ? { slices: loft.sliceCount, vertices: loft.vertexCount, indices: loft.indexCount,
          positionSha256: await hash(loft.positions.subarray(0, loft.vertexCount * 3)), indexSha256: await hash(loft.indices.subarray(0, loft.indexCount)) } : null,
        viewport: { css: [innerWidth, innerHeight], dpr: devicePixelRatio, buffer: [renderer.domElement.width, renderer.domElement.height] },
        scope: 'First actual natural frame/fixed overview camera. Normal pixels are diagnostic evidence, no toleranced acceptance.' };
    },
''' +s[b:]
s=s.replace("      assert(view === cameras.length - 1 && previous === 20, 'Both fixed complete21frame views required');", "      assert(previous === STAGES.length - 1 && setupCalls === 1 && causticCalls === 1, 'Exactly one setup/caustic render and complete fixed diagnostic draws required');\n      const repair = water.barrelFallback; assert(repair?.geometry === savedView && repair.onBeforeRender === savedHook, 'Original geometry/hook must be restored before retirement');")
s=s.replace('apiWindow.naturalTubeQA', 'apiWindow.rowbandDiagnosticQA')
(W/'entry.ts').write_text(s)
for name in ['cameras.json','tsconfig.json']:(W/name).write_bytes((P/name).read_bytes())
authority=(P/'authority.mjs').read_text().replace('ROWBAND_NATIVE_READY_SHA256','ROWBAND_DIAGNOSTIC_READY_SHA256').replace('Reviewed rowband native readiness required','Reviewed rowband diagnostic readiness required')
(W/'authority.mjs').write_text(authority)
build=(P/'build.mjs').read_text().replace('__ROWBAND_CANDIDATE__','__ROWBAND_DIAGNOSTIC_CANDIDATE__').replace('Natural tube rowband framebuffer parity','Natural tube rowband first-frame controls').replace('natural-tube-rowband-compiled/v1','natural-tube-rowband-diagnostic-compiled/v1').replace('e3e630bc4-qa-rowband-native','e3e630bc4-qa-rowband-diagnostic')
(W/'build.mjs').write_text(build)
os.symlink('/Users/regina/Desktop/Projects/surfing-game/node_modules',W/'node_modules')
