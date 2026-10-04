from pathlib import Path
W=Path('/private/tmp/surf-tube-rowband-moving-native-20261004');D=Path('/private/tmp/surf-tube-rowband-diagnostic-20261004')
s=(D/'device-gate.mjs').read_text().replace('First-frame same-context rowband diagnostic','Moving same-context rowband parity')
s=s.replace('ROWBAND_DIAGNOSTIC_READY_SHA256','ROWBAND_MOVING_READY_SHA256').replace('ROWBAND_DIAGNOSTIC_COMPILED_SHA256','ROWBAND_MOVING_COMPILED_SHA256')
s=s.replace('4226','4227').replace('9636','9637').replace('40_000','60_000').replace('Native40s','Native60s').replace('rowband-diagnostic-','rowband-moving-')
a=s.index('const stages = ');b=s.index('const served = ',a)
s=s[:a]+'''const stages = ['initial-narrow', 'repeat-narrow', 'private-full', 'restore-narrow'];
const plan = { schema: 'natural-tube-rowband-moving-plan/v1', readySha256: pin.readySha256, compiledSha256: sha256(compiledRaw), run,
  serverPort: 4227, cdpPort: 9637, offPort: 4200, untouchedPort: 5173, boundMs: 60_000, stages,
  context: 'one actual tested candidate context', views: 2, framesPerView: 21, cases: 42, draws: 168, checkpoints: [0, 14, 15, 20],
  firstStep: 664, lastStep: 684, pointId: 3, jetStrip: 2, solverSteps: 0,
  scope: 'Exact same-context settled repeat-narrow/full/restored normal pixels on all42 fixed natural cases. Initial/repeat changes separately retained. No initial/cross-context parity, tolerance, physics/FPS/quality acceptance.' };
''' +s[b:]
a=s.index('const comparisons = [');b=s.index('// Ordinary lossless PNG',a);s=s[:a]+s[b:]
a=s.index('function comparePixels(');b=s.index('try {\n  report.prePorts',a);s=s[:a]+s[b:]
a=s.index('  const retained = new Map();');b=s.index('} catch (error) { report.failures.push',a)
s=s[:a]+'''  const arm = 'candidate';
  await bounded(page.send('Page.navigate', { url: `http://127.0.0.1:4227/${arm}/` }), 'candidate navigate');
  await bounded(page.waitFor('window.movingRowbandQA', 8000), 'candidate component ready');
  const failure = await bounded(page.eval('window.movingRowbandQA.failure'), 'init failure'); if (failure) throw Error(failure);
  const init = await bounded(page.eval('window.movingRowbandQA.initialize()'), 'candidate initialize');
  if (init.arm !== arm || init.decodedFrames !== 21 || !init.context.stencil || JSON.stringify(init.stages) !== JSON.stringify(stages)) throw Error('Original moving capture/held context unavailable');
  const row = { arm, init, views: [] }; report.arms.push(row);
  const retainPayload = async (frame, all, reason) => {
    const payload = await bounded(page.eval(`window.movingRowbandQA.retainedPayload(${all})`), 'current controls payload', 12000);
    // Save all requested images/bytes BEFORE subsequent transport guards or abort. Framebuffer bytes remain authoritative.
    const saved = [];
    for (const packet of payload.payload) {
      const rgba = Buffer.from(packet.rgbaBase64, 'base64'), stem = `view${payload.view}-step${payload.step}-${packet.draw}-${packet.stage}`;
      let raw;
      if (all) { const path = resolve(out, stem + '.rgba'); writeFileSync(path, rgba); raw = { path, bytes: rgba.length, sha256: sha256(rgba) }; }
      const png = framebufferPNG(rgba, 960, 540), path = resolve(out, stem + '.png'); writeFileSync(path, png);
      saved.push({ draw: packet.draw, stage: packet.stage, raw, png: { path, bytes: png.length, sha256: sha256(png), dimensions: [960, 540],
        encoding: 'Exact retained RGBA8, lossless PNG, bottom-up→top-down rows only; no compositor/color edits.' }, rgbaSha256: sha256(rgba), rgbaBytes: rgba.length });
    }
    let mask;
    if (all) { const bytes = Buffer.from(payload.maskBase64, 'base64'), path = resolve(out, `view${payload.view}-step${payload.step}-actual-mask.u8`); writeFileSync(path, bytes); mask = { path, bytes: bytes.length, sha256: sha256(bytes) }; }
    const result = { reason, view: payload.view, frame: payload.frame, step: payload.step, saved, mask };
    (frame.retention ??= []).push(result); save('report.json', report);
    if (payload.view !== frame.view || payload.frame !== frame.frame || payload.step !== frame.step) throw Error('Retained controls identity differs');
    for (const image of saved) if (image.rgbaSha256 !== frame.controls[image.draw].framebuffer.sha256 || image.rgbaBytes !== frame.controls[image.draw].framebuffer.byteLength) throw Error('Retained framebuffer transport differs');
    if (all && mask.sha256 !== frame.controls[0].witnesses.mask.sha256) throw Error('Retained mask transport differs');
    return result;
  };
  for (let view = 0; view < 2; view++) {
    const camera = await bounded(page.eval(`window.movingRowbandQA.beginView(${view})`), 'fixed original view');
    const viewRow = { ...camera, frames: [] }; row.views.push(viewRow);
    for (let index = 0; index < 21; index++) {
      const frame = await bounded(page.eval(`window.movingRowbandQA.frame(${index})`), 'actual four-draw case');
      viewRow.frames.push(frame); save('report.json', report);
      const controls = frame.controls, reference = exactReference(controls[0]);
      frame.primaryInputExact = controls.every(control => JSON.stringify(exactReference(control)) === JSON.stringify(reference));
      frame.fixedOrderExact = frame.arm === arm && frame.view === view && frame.frame === index && frame.step === 664 + index && controls.length === 4
        && controls.every((control, draw) => control.stage === stages[draw] && control.draw === draw && control.view === view && control.frame === index && control.step === 664 + index);
      frame.fixedOpticsExact = controls.every(control => control.witnesses.setupCalls === frame.counts.setupCalls && control.witnesses.causticCalls === frame.counts.causticCalls
        && control.witnesses.opticalReferences.causticTexture && control.witnesses.opticalReferences.reflection);
      const valid = frame.primaryInputExact && frame.fixedOrderExact && frame.fixedOpticsExact && frame.settled.repeatVsFullExact && frame.settled.repeatVsRestoredExact;
      if (!valid) {
        report.firstDifference = { view, index, frame, kind: !frame.primaryInputExact || !frame.fixedOrderExact || !frame.fixedOpticsExact ? 'provenance' : 'settled-normal-framebuffer' };
        await retainPayload(frame, true, 'first-failure-all-four-controls-before-abort');
        throw Error('First exact moving settled/provenance failure at ' + view + ':' + index);
      }
      if (plan.checkpoints.includes(index)) await retainPayload(frame, false, 'matched-checkpoint-repeat-narrow-and-private-full');
      save('report.json', report);
    }
  }
  const frames = row.views.flatMap(view => view.frames);
  report.counts = { cases: frames.length, draws: frames.reduce((sum, frame) => sum + frame.controls.length, 0),
    settledExactCases: frames.filter(frame => frame.settled.repeatVsFullExact && frame.settled.repeatVsRestoredExact).length,
    firstRepeatDifferentCases: frames.filter(frame => !frame.firstRepeat.exactRGBA).length,
    positiveActiveCroppedCases: frames.filter(frame => { const c = frame.controls[1]; return c.rowRanges.repairVisible && c.witnesses.mask.nonzero > 0
      && c.rowRanges.repair.effectiveCount > 0 && c.rowRanges.repair.effectiveCount < c.rowRanges.coarseAfter.effectiveCount; }).length,
    checkpointPNGs: frames.flatMap(frame => frame.retention ?? []).flatMap(record => record.saved).length };
  if (report.counts.cases !== 42 || report.counts.draws !== 168 || report.counts.settledExactCases !== 42 || report.counts.checkpointPNGs !== 16 || !report.counts.positiveActiveCroppedCases) throw Error('Original42 cases/168 draws/16 checkpoint/actual positive crop gate failed');
  row.finish = await bounded(page.eval('window.movingRowbandQA.finish()'), 'actual renderer/context retirement');
  if (!row.finish.contextLost || row.finish.solverSteps !== 0) throw Error('Actual context/zero-solver retirement guard');
  report.valid = true; report.qualityAccepted = false; report.initialOrCrossContextParityClaimed = false;
  report.scopeLimit = 'Exact settled same-context rowband versus full repair for42 fixed naturalCPUframe/view cases only. All first/repeat differences retained separately without tolerance. No initial/cross-context parity, general grazing/cavity, BigPadang, physics, FPS or quality acceptance.';
''' +s[b:]
(W/'device-gate.mjs').write_text(s)
