from pathlib import Path
import os
W=Path('/private/tmp/surf-tube-rowband-moving-native-20261004');D=Path('/private/tmp/surf-tube-rowband-diagnostic-20261004');P=Path('/private/tmp/surf-tube-rowband-native-20261004')
s=(D/'entry.ts').read_text()
s=s.replace('declare const __ROWBAND_DIAGNOSTIC_CANDIDATE__: boolean;\n','').replace("const ARM = __ROWBAND_DIAGNOSTIC_CANDIDATE__ ? 'candidate' : 'baseline';", "const ARM = 'candidate';")
s=s.replace('rowbandDiagnosticQA','movingRowbandQA')
a=s.index('const STAGES = ');b=s.index('const base64',a);s=s[:a]+"const STAGES = ['initial-narrow', 'repeat-narrow', 'private-full', 'restore-narrow'];\n"+s[b:]
a=s.index('  // Decode only the unchanged first actual frame.');b=s.index("  const cases = barrelCasesFor('padang');",a)
orig=(P/'entry.ts').read_text();c=orig.index('  const decoded: Decoded[] = [];');e=orig.index("  const cases = barrelCasesFor('padang');",c)
s=s[:a]+orig[c:e]+"  const initial = decoded[0];\n"+s[b:]
s=s.replace('  let previous = -1, setupCalls = 0, causticCalls = 0;', '  let view = -1, previous = -1, caseCount = 0, normalDraws = 0, setupCalls = 0, causticCalls = 0;')
s=s.replace("      const shouldAlias = !__ROWBAND_DIAGNOSTIC_CANDIDATE__ || STAGES[previous] === 'source-alias-full';\n      assert(shouldAlias ? repair.geometry === owner : repair.geometry === savedView && repair.geometry !== owner, 'Diagnostic private/alias geometry identity differs');", "      assert(repair.geometry === savedView && repair.geometry !== owner, 'Actual same private rowband view required');")
s=s.replace('const passive = async (includeBytes: boolean) => {', 'const passive = async () => {').replace('        rawBase64: includeBytes ? base64(image.data) : undefined,\n','')
a=s.index('  const qa = {'); b=s.index('    async finish() {',a)
s=s[:a]+'''  const pixels = STAGES.map(() => new Uint8Array(WIDTH * HEIGHT * 4));
  let retained: { view: number; frame: number; step: number; controls: Array<Record<string, unknown>> } | undefined;
  let retainedMask: Uint8Array | undefined;
  const differences = (left: Uint8Array, right: Uint8Array) => {
    let pixels = 0, channels = 0, max = 0, absolute = 0, minX = WIDTH, maxX = -1, minY = HEIGHT, maxY = -1;
    let first: { byte: number; left: number; right: number } | null = null;
    for (let o = 0; o < left.length; o += 4) { let changed = false;
      for (let c = 0; c < 4; c++) { const delta = Math.abs(left[o + c] - right[o + c]); if (delta) {
        channels++; changed = true; max = Math.max(max, delta); absolute += delta;
        if (first === null) first = { byte: o + c, left: left[o + c], right: right[o + c] };
      } }
      if (changed) { pixels++; const x = o / 4 % WIDTH, y = HEIGHT - 1 - Math.floor(o / 4 / WIDTH);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    }
    return { changedPixels: pixels, changedChannels: channels, maxAbsoluteChannelDelta: max, meanAbsoluteChannelDelta: absolute / left.length,
      firstDifference: first, topDownBBox: pixels ? { minX, maxX, minY, maxY } : null };
  };
  const qa = {
    arm: ARM, stages: STAGES, canvas: renderer.domElement, checkpoints: [0, 14, 15, 20],
    async initialize() { return { arm: ARM, decodedFrames: decoded.length, cases: await Promise.all(bytes.map(hash)),
      context: gl.getContextAttributes(), stencilBits: gl.getParameter(gl.STENCIL_BITS), grid: capture.meta.renderGrid,
      cameras, stages: STAGES, methods: 'Actual original21 captured frames/two views in one candidate context. Each case updates water/barrel/caustics once; four fixed normal draws.' }; },
    beginView(index: number) {
      assert(index === view + 1 && index < cameras.length && (view < 0 || previous === 20), 'Both fixed full views in original order only');
      view = index; previous = -1;
      camera.position.fromArray(cameras[index].position); camera.lookAt(new Vector3().fromArray(cameras[index].target)); camera.updateMatrixWorld();
      return { view: index, name: cameras[index].name, position: camera.position.toArray(), target: cameras[index].target };
    },
    async frame(index: number) {
      assert(view >= 0 && index === previous + 1 && index < decoded.length, 'Every original consecutive frame required'); previous = index;
      const current = decoded[index], frame = current.frame;
      retained = { view, frame: index, step: frame.step, controls: [] }; retainedMask = undefined;
      host.init.grid = { ...frame.grid }; host.init.windowXMin = frame.windowXMin;
      Object.assign(host.snapshot, { front: current.front, frontCount: frame.frontCount, surface: current.surface, flow: current.flow,
        aeration: current.aeration, tubes: current.tubes, tubeCount: frame.actualTubeCount,
        status: { seaTime: frame.seaTime, naturalFrame: index, view } });
      water.update(); PhysicalMode.prototype.drawBarrel.call(mode); setupCalls++;
      const repair: Mesh<BufferGeometry> | undefined = water.barrelFallback; assert(repair, 'Naturally activated fallback owner required');
      savedView = repair.geometry; savedHook = repair.onBeforeRender;
      fixedPrimary = { coarse: range(water.mesh.geometry), patch: range(water.patch.geometry) };
      const maskImage = (water.materialUniforms.waterBarrelMask.value as Texture).image as { data: Uint8Array };
      retainedMask = new Uint8Array(maskImage.data);
      below = PhysicalMode.prototype.cameraBelowSurface.call(mode);
      scene.fog = below ? new FogExp2('#1e7a87', .12) : null; environment.group.position.copy(camera.position);
      camera.getWorldDirection(ahead); caustics.render(renderer, camera.position.x + ahead.x * CAUSTIC_WINDOW / 3, camera.position.z + ahead.z * CAUSTIC_WINDOW / 3); causticCalls++;
      fixedCaustic = water.causticUniforms.causticMap.value;
      const controls = [];
      try {
        for (let draw = 0; draw < STAGES.length; draw++) {
          if (draw === 2) { const hook = savedHook, privateView = savedView;
            repair.onBeforeRender = (...args) => { hook.apply(repair, args); privateView.setDrawRange(water.mesh.geometry.drawRange.start, water.mesh.geometry.drawRange.count); };
          } else if (draw === 3) repair.onBeforeRender = savedHook;
          renderer.render(scene, camera); normalDraws++;
          assert(renderer.getRenderTarget() === null && gl.drawingBufferWidth === WIDTH && gl.drawingBufferHeight === HEIGHT, 'Normal default framebuffer dimensions differ');
          // Exact own stage buffer is populated synchronously before any await/next draw.
          gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels[draw]);
          assert(gl.getError() === gl.NO_ERROR, 'Normal framebuffer render/read error');
          const ranges = rowRanges(fixedPrimary.coarse, fixedPrimary.patch), sha256 = await hash(pixels[draw]), witnesses = await passive();
          const loft = barrel.lastLoft;
          const sourceHash = { front: await hash(current.front), surface: await hash(current.surface), flow: await hash(current.flow), aeration: await hash(current.aeration) };
          assert(sourceHash.surface === await hash(water.surfaceData), 'Uploaded actual surface differs from captured field');
          projection.set(frame.selected.point.x, .6, frame.selected.point.z).project(camera);
          const control = { arm: ARM, view, frame: index, step: frame.step, stage: STAGES[draw], draw,
            clock: { time: frame.time, seaTime: frame.seaTime }, sourceHash, rowRanges: ranges, witnesses,
            framebuffer: { width: WIDTH, height: HEIGHT, byteLength: pixels[draw].byteLength, order: 'RGBA8 bottom-up WebGL readPixels', sha256 },
            primaryGeometry: { positionSha256: await hash(water.mesh.geometry.getAttribute('position').array), indexSha256: await hash(water.mesh.geometry.index!.array) },
            belowSurface: below, hostHeightAtCamera: host.heightAt(camera.position.x, camera.position.z), stillLevel: capture.meta.fixture.tide,
            camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray() },
            selectedWorldProjection: projection.toArray(), selectedBracket: bracket(loft, frame), frontCount: frame.frontCount,
            geometry: loft ? { slices: loft.sliceCount, vertices: loft.vertexCount, indices: loft.indexCount,
              positionSha256: await hash(loft.positions.subarray(0, loft.vertexCount * 3)), indexSha256: await hash(loft.indices.subarray(0, loft.indexCount)) } : null };
          controls.push(control); retained.controls.push(control);
        }
      } finally { repair.geometry = savedView; repair.onBeforeRender = savedHook; }
      caseCount++;
      const firstRepeatExact = controls[0].framebuffer.sha256 === controls[1].framebuffer.sha256;
      return { arm: ARM, view, frame: index, step: frame.step, controls,
        firstRepeat: { exactRGBA: firstRepeatExact, ...(firstRepeatExact ? { changedPixels: 0, changedChannels: 0, maxAbsoluteChannelDelta: 0, meanAbsoluteChannelDelta: 0, firstDifference: null, topDownBBox: null } : differences(pixels[0], pixels[1])) },
        settled: { repeatVsFullExact: controls[1].framebuffer.sha256 === controls[2].framebuffer.sha256,
          repeatVsRestoredExact: controls[1].framebuffer.sha256 === controls[3].framebuffer.sha256 },
        counts: { caseCount, normalDraws, setupCalls, causticCalls } };
    },
    retainedPayload(all: boolean) {
      assert(retained && retainedMask, 'Current actual case retention unavailable');
      // Only checkpoint repeat/full buffers or first-failure all four buffers cross CDP. No350MB corpus is streamed.
      const indices = all ? [0, 1, 2, 3] : [1, 2];
      return { ...retained, maskBase64: base64(retainedMask), maskBytes: retainedMask.length,
        payload: indices.filter(draw => draw < retained!.controls.length).map(draw => ({ draw, stage: STAGES[draw], rgbaBase64: base64(pixels[draw]) })) };
    },
''' +s[b:]
s=s.replace("assert(previous === STAGES.length - 1 && setupCalls === 1 && causticCalls === 1, 'Exactly one setup/caustic render and complete fixed diagnostic draws required');", "assert(view === 1 && previous === 20 && caseCount === 42 && normalDraws === 168 && setupCalls === 42 && causticCalls === 42, 'Exact42 original cases/168 normal draws/one setup and caustic percase required');")
s=s.replace('  const framePixels = new Uint8Array(WIDTH * HEIGHT * 4);\n','')
(W/'entry.ts').write_text(s)
for n in ['cameras.json','tsconfig.json']:(W/n).write_bytes((D/n).read_bytes())
s=(D/'authority.mjs').read_text().replace('ROWBAND_DIAGNOSTIC_READY_SHA256','ROWBAND_MOVING_READY_SHA256').replace('Reviewed rowband diagnostic readiness required','Reviewed moving rowband readiness required');(W/'authority.mjs').write_text(s)
s=(D/'build.mjs').read_text().replace("for (const arm of ['baseline', 'candidate'])", "for (const arm of ['candidate'])")
s=s.replace("transform: { define: { __ROWBAND_DIAGNOSTIC_CANDIDATE__: String(arm === 'candidate') } }", "transform: { define: {} }")
s=s.replace("if (emitted.includes('__ROWBAND_DIAGNOSTIC_CANDIDATE__') || !emitted.includes", "if (!emitted.includes")
s=s.replace('Natural tube rowband first-frame controls','Natural tube moving rowband parity').replace('natural-tube-rowband-diagnostic-compiled/v1','natural-tube-rowband-moving-compiled/v1').replace('e3e630bc4-qa-rowband-diagnostic','e3e630bc4-qa-rowband-moving');(W/'build.mjs').write_text(s)
os.symlink('/Users/regina/Desktop/Projects/surfing-game/node_modules',W/'node_modules')
