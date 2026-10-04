from pathlib import Path
W=Path('/private/tmp/surf-tube-rowband-diagnostic-20261004'); P=Path('/private/tmp/surf-tube-rowband-native-20261004')
s=(W/'entry.ts').read_text().replace('let below = false;', 'let below = false; let fixedCaustic: Texture | null = null;')
s=s.replace("const gpu = renderer.properties.get(repair.material).currentProgram as CompiledProgram | undefined;", "const materialProperties = renderer.properties.get(repair.material) as { currentProgram?: CompiledProgram };\n    const gpu = materialProperties.currentProgram;")
s=s.replace("water.causticUniforms.causticMap.value === caustics.texture", "water.causticUniforms.causticMap.value === fixedCaustic")
s=s.replace('reflection: water.mesh.material.envMap === reflection.texture },', 'reflection: water.mesh.material.envMap === reflection.texture,\n        causticDomain: water.causticUniforms.causticDomain.value.toArray(), causticStrength: water.causticUniforms.causticStrength.value },')
s=s.replace('); causticCalls++;', '); causticCalls++; fixedCaustic = water.causticUniforms.causticMap.value;')
(W/'entry.ts').write_text(s)
s=(P/'device-gate.mjs').read_text()
s=s.replace('// One fixed natural-cycle full-fallback versus rowband normal-framebuffer parity, zero solver steps/FPS instrumentation.', '// One fixed first-frame same-context rowband diagnostic. Pixel differences are retained evidence, never toleranced acceptance.')
s=s.replace('ROWBAND_NATIVE_READY_SHA256','ROWBAND_DIAGNOSTIC_READY_SHA256').replace('ROWBAND_NATIVE_COMPILED_SHA256','ROWBAND_DIAGNOSTIC_COMPILED_SHA256')
s=s.replace('4225','4226').replace('9635','9636').replace('60_000','40_000').replace('Native60s','Native40s').replace('rowband-native-','rowband-diagnostic-')
a=s.index('const plan = '); b=s.index('const served = ',a)
s=s[:a]+'''const stages = { baseline: ['initial-full', 'repeat-full-1', 'repeat-full-2'],
  candidate: ['initial-narrow', 'repeat-narrow', 'private-full', 'repeat-private-full', 'source-alias-full', 'restore-narrow'] };
const plan = { schema: 'natural-tube-rowband-diagnostic-plan/v1', readySha256: pin.readySha256, compiledSha256: sha256(compiledRaw), run,
  serverPort: 4226, cdpPort: 9636, offPort: 4200, untouchedPort: 5173, boundMs: 40_000, stages,
  draws: 9, step: 664, view: 0, pointId: 3, jetStrip: 2, solverSteps: 0,
  scope: 'Unchanged normal optics; fixed-scene repeat/narrow/private-full/source-alias/restore controls. Exact RGBA differences are diagnostic evidence, not toleranced or universal parity acceptance.' };
''' + s[b:]
a=s.index('const exactReference = ');b=s.index('try {\n  report.prePorts',a)
s=s[:a]+'''const exactReference = frame => ({ step: frame.step, clock: frame.clock, sourceHash: frame.sourceHash, camera: frame.camera,
  belowSurface: frame.belowSurface, hostHeightAtCamera: frame.hostHeightAtCamera, stillLevel: frame.stillLevel,
  selectedBracket: frame.selectedBracket, frontCount: frame.frontCount, geometry: frame.geometry, primaryGeometry: frame.primaryGeometry,
  sourceDrawRanges: [frame.rowRanges.coarseBefore, frame.rowRanges.coarseAfter, frame.rowRanges.patchBefore, frame.rowRanges.patchAfter],
  mask: frame.witnesses.mask, matrices: frame.witnesses.matrices, opticalReferences: frame.witnesses.opticalReferences,
  setupCalls: frame.witnesses.setupCalls, causticCalls: frame.witnesses.causticCalls });
const comparisons = [
  ['baseline-repeat-1', 'baseline:initial-full', 'baseline:repeat-full-1'],
  ['baseline-repeat-2', 'baseline:repeat-full-1', 'baseline:repeat-full-2'],
  ['candidate-repeat-narrow', 'candidate:initial-narrow', 'candidate:repeat-narrow'],
  ['same-private-narrow-versus-full', 'candidate:repeat-narrow', 'candidate:private-full'],
  ['same-private-repeat-full', 'candidate:private-full', 'candidate:repeat-private-full'],
  ['private-full-versus-source-alias-full', 'candidate:repeat-private-full', 'candidate:source-alias-full'],
  ['restore-narrow-versus-initial', 'candidate:initial-narrow', 'candidate:restore-narrow'],
  ['cross-context-initial', 'baseline:initial-full', 'candidate:initial-narrow'],
  ['cross-context-full-private', 'baseline:initial-full', 'candidate:private-full'],
  ['cross-context-full-source-alias', 'baseline:initial-full', 'candidate:source-alias-full'] ];
function comparePixels(label, a, b) {
  const left = readFileSync(a.raw.path), right = readFileSync(b.raw.path);
  if (left.length !== right.length || left.length !== 960 * 540 * 4) throw Error('Retained raw dimensions differ');
  let channels = 0, pixels = 0, max = 0, absoluteSum = 0, first = null, minX = 960, maxX = -1, minY = 540, maxY = -1;
  for (let p = 0; p < left.length; p += 4) { let changed = false;
    for (let c = 0; c < 4; c++) { const delta = Math.abs(left[p + c] - right[p + c]); if (delta) {
      changed = true; channels++; absoluteSum += delta; max = Math.max(max, delta);
      if (first === null) first = { byte: p + c, bottomUpPixel: p / 4, channel: c, left: left[p + c], right: right[p + c] };
    } }
    if (changed) { pixels++; const x = p / 4 % 960, y = 539 - Math.floor(p / 4 / 960); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  return { label, left: a.arm + ':' + a.stage, right: b.arm + ':' + b.stage,
    exactRGBA: left.equals(right), leftSha256: a.raw.sha256, rightSha256: b.raw.sha256,
    changedPixels: pixels, totalPixels: 960 * 540, changedChannels: channels, maxAbsoluteChannelDelta: max,
    meanAbsoluteChannelDelta: absoluteSum / left.length, firstDifference: first, topDownBBox: pixels ? { minX, maxX, minY, maxY } : null };
}
''' +s[b:]
a=s.index('  const originals = new Map();');b=s.index('} catch (error) { report.failures.push',a)
s=s[:a]+'''  const retained = new Map();
  for (const arm of ['baseline', 'candidate']) {
    process.stdout.write(JSON.stringify({ stage: arm, status: 'start', at: new Date().toISOString() }) + '\\n');
    await bounded(page.send('Page.navigate', { url: `http://127.0.0.1:4226/${arm}/` }), arm + ' navigate');
    await bounded(page.waitFor('window.rowbandDiagnosticQA', 8000), arm + ' component ready');
    const failure = await bounded(page.eval('window.rowbandDiagnosticQA.failure'), 'init failure'); if (failure) throw Error(failure);
    const init = await bounded(page.eval('window.rowbandDiagnosticQA.initialize()'), arm + ' initialize');
    if (init.decodedFrames !== 1 || !init.context.stencil || JSON.stringify(init.stages) !== JSON.stringify(stages[arm])) throw Error('Fixed held first-frame context unavailable');
    const row = { arm, init, frames: [] }; report.arms.push(row);
    for (let index = 0; index < stages[arm].length; index++) {
      const frame = await bounded(page.eval(`window.rowbandDiagnosticQA.draw(${index})`), arm + ' draw ' + index);
      // SAVE raw RGBA and its PNG BEFORE any comparisons or semantic guards. A failure never erases the first image.
      const payload = frame.payload, rgba = Buffer.from(payload.rgbaBase64, 'base64'), png = Buffer.from(payload.pngBase64, 'base64');
      const stem = `${arm}-${index}-${frame.stage}`;
      const rawPath = resolve(out, stem + '.rgba'), pngPath = resolve(out, stem + '.png'); writeFileSync(rawPath, rgba); writeFileSync(pngPath, png);
      frame.raw = { path: rawPath, bytes: rgba.length, sha256: sha256(rgba), order: frame.framebuffer.order };
      frame.png = { path: pngPath, bytes: png.length, sha256: sha256(png), dimensions: [png.readUInt32BE(16), png.readUInt32BE(20)], encoding: payload.pngEncoding };
      const mask = frame.witnesses.mask;
      if (mask.rawBase64 !== undefined) {
        const maskBytes = Buffer.from(mask.rawBase64, 'base64'), maskPath = resolve(out, arm + '-actual-mask.u8'); writeFileSync(maskPath, maskBytes);
        row.mask = { path: maskPath, bytes: maskBytes.length, sha256: sha256(maskBytes), width: mask.width, height: mask.height };
        delete mask.rawBase64;
      }
      delete frame.payload; row.frames.push(frame); retained.set(arm + ':' + frame.stage, frame); save('report.json', report);
      if (frame.arm !== arm || frame.stage !== stages[arm][index] || frame.draw !== index || frame.step !== 664 || frame.view !== 0) throw Error('Fixed first-frame diagnostic order differs');
      if (rgba.length !== frame.framebuffer.byteLength || sha256(rgba) !== frame.framebuffer.sha256 || png.length !== payload.pngBytes || sha256(png) !== payload.pngSha256) throw Error('Saved framebuffer/PNG transport differs');
      if (row.mask?.sha256 !== mask.sha256 || row.mask.bytes !== mask.bytes) throw Error('Saved actual mask transport differs');
      if (frame.witnesses.setupCalls !== 1 || frame.witnesses.causticCalls !== 1 || !frame.witnesses.opticalReferences.causticTexture || !frame.witnesses.opticalReferences.reflection) throw Error('Diagnostic recomputed or replaced fixed optics');
    }
    row.finish = await bounded(page.eval('window.rowbandDiagnosticQA.finish()'), 'actual renderer/context cleanup');
    if (!row.finish.contextLost || row.finish.solverSteps !== 0) throw Error('Context/zero-solver retirement guard');
    save('report.json', report); process.stdout.write(JSON.stringify({ stage: arm, status: 'completed', at: new Date().toISOString() }) + '\\n');
  }
  // All nine raw RGBA/PNG pairs are on disk BEFORE any pixel comparisons. Exact deltas are evidence, never an allowed error budget.
  report.comparisons = comparisons.map(([label, left, right]) => comparePixels(label, retained.get(left), retained.get(right)));
  report.primaryInputChecks = comparisons.map(([label, left, right]) => ({ label,
    exact: JSON.stringify(exactReference(retained.get(left))) === JSON.stringify(exactReference(retained.get(right))) }));
  report.valid = true; report.rowbandParityAccepted = false; report.qualityAccepted = false;
  report.scopeLimit = 'One original natural frame664/fixed overview camera. Same-context changes are QA repair range/view controls only. No ID shader, numerical/physics/FPS claim or toleranced pixel acceptance. Cross-context differences remain separately disclosed.';
''' +s[b:]
(W/'device-gate.mjs').write_text(s)
