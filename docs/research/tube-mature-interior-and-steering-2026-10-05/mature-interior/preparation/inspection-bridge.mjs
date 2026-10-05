// Source-only browser bridge; root must install the unchanged borrowed __naturalEntry driver first.
export function installMatureCoreInspection(createMatureMouthInspection) {
  const d = window.breaklineDiagnostics, lab = window.breaklineLab, ordinary = window.__naturalEntry;
  const must = (condition, reason) => { if (!condition) throw Error(reason); };
  must(d && lab && ordinary && typeof ordinary.step === 'function' && typeof ordinary.checkpoint === 'function', 'Borrowed ordinary driver is required');
  must(lab.clock.paused && !lab.active && d.mode.host.outstandingSteps === 0, 'Paused drained actual menu/replay required');
  const inspection = createMatureMouthInspection(d);
  let step = 0, stopped = false, lastAttempt = -1;
  const attempts = [];
  function attempt() {
    must(!stopped && step % 30 === 0 && step <= 360 && lastAttempt < step, 'One inspection at each declared cadence only');
    lastAttempt = step;
    const result = inspection.inspect();
    must(result.nonmutation?.checked && result.nonmutation.unchanged && result.nonmutation.normalRenderRestored, 'Inspection public-state guard/normal restoration failed');
    attempts.push({ step, seaTime: d.mode.host.snapshot.status.seaTime, available: result.available,
      stage: result.stage ?? null, reason: result.reason ?? null, geometryFailure: result.geometryFailure ?? false });
    stopped = result.available || result.geometryFailure === true || result.firstEligibleAttemptFailed === true || step === 360;
    if (!stopped) return { stopped: false, step, latest: attempts.at(-1) };
    // One normal PNG and the existing exact complete37 sidecar at the same terminal inspection epoch.
    // The borrowed label is genuinely terminal for this one-off session, not a false phase/event label.
    const normal = ordinary.checkpoint('terminal');
    must(normal.step === step && Object.is(normal.seaTime, result.seaTime ?? d.mode.host.snapshot.status.seaTime), 'Normal checkpoint does not match inspection epoch');
    must(normal.loftSnapshot?.available === true && Object.keys(normal.loftSnapshot.arrays).length === 37, 'Complete37 terminal sidecar unavailable');
    return { stopped: true, step, physicalSeconds: step / 60, attempts, inspection: result, normal,
      geometryOnly: true, knownSeedRestartDeclared: true, normalProductionGameplayClaim: false,
      actorPlacement: false, actorOrMeshPlacementRequested: false, passageClaim: false, visualAcceptanceClaim: false };
  }
  async function advance() {
    must(!stopped && lastAttempt >= 0 && step < 360 && d.mode.host.outstandingSteps === 0 && lab.clock.paused && !lab.active, 'Finite paused one-step ordinary advance required');
    const row = await ordinary.step();
    step += 1;
    must(row.step === step && Math.abs(row.physicalSeconds - step / 60) < 1e-9, 'Borrowed ordinary step index/physical duration differs');
    const compact = { step, physicalSeconds: row.physicalSeconds, seaTime: row.seaTime, phase: row.ride.phase, input: row.input,
      resets: row.ride.resets, separation: row.separation ?? null };
    return { row: compact, inspection: step % 30 === 0 ? attempt() : null };
  }
  window.__matureCoreInspection = { attemptInitial: attempt, advance };
}
