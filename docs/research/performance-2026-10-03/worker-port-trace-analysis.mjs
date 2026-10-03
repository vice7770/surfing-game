// Pure JSON postprocessing. No browser, network, solver, benchmark or polling.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
const opts = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')));
const input = opts.in ?? '/private/tmp/worker-port-trace.json';
const output = opts.out ?? '/private/tmp/worker-port-trace-summary.json';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const result = { input, generatedAt: new Date().toISOString(), method: 'Per-request pairing, then linear-interpolated quantiles; no subtraction of independent quantiles.', analysisSha256: sha(readFileSync(new URL(import.meta.url))) };
function require(condition, message) { if (!condition) throw Error(message); }
function finite(value, context) { require(Number.isFinite(value), `Nonfinite ${context}`); return value; }
function stats(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return { count: 0 };
  const quantile = (p) => { const at = (sorted.length - 1) * p, lo = Math.floor(at), hi = Math.ceil(at); return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo); };
  return { count: sorted.length, p50: quantile(.5), p95: quantile(.95), p99: quantile(.99), mean: sorted.reduce((a, b) => a + b, 0) / sorted.length, min: sorted[0], max: sorted.at(-1) };
}
try {
  const stored = readFileSync(input), raw = input.endsWith('.gz') ? gunzipSync(stored) : stored;
  result.inputFileSha256 = sha(stored); result.rawSha256 = sha(raw);
  const run = JSON.parse(raw);
  const rows = run.results.filter((row) => row.setting === 'High (baseline)' && row.screen === 'Ride · Padang' && Array.isArray(row.workerPortTrace));
  require(rows.length === 1, `Expected one High Ride trace, found ${rows.length}`);
  const ride = rows[0], trace = ride.workerPortTrace;
  require(ride.ordinaryConfigMatches === true && ride.portTimingDiagnostic === true && ride.baselineComparable === false, 'Missing ordinary/diagnostic guards');
  require(run.workerPortProbe?.sourceSha256 && run.workerPortProbe?.driverSha256 && run.workerPortProbe?.derivedSha256, 'Missing callback/source provenance');
  require(trace.length >= 3, 'Insufficient trace');
  const worker = trace[0].worker;
  const derived = trace.map((row, i) => {
    const context = `row ${i}/request ${row.request?.id}`;
    require(row.hostPortMatches === true && row.worker === worker, `${context}: host/worker mismatch`);
    require(Number.isInteger(row.request?.id) && row.request.id > 0, `${context}: bad ID`);
    require(row.request.sampling === true && row.request.steps === 1 && row.pipeline?.batchSteps === 1 && row.inFlightBeforeReceipt === 1, `${context}: not a matched one-step request`);
    require(Number.isInteger(row.pendingBeforeReceipt) && row.pendingBeforeReceipt >= 0 && row.pendingBeforeReceipt <= 6, `${context}: invalid pending count`);
    const send = finite(row.request.wall, context + ' send'), receipt = finite(row.wall, context + ' receipt');
    const started = finite(row.handlerStarted, context + ' handlerStarted'), finished = finite(row.handlerFinished, context + ' handlerFinished');
    const sea = finite(row.sea, context + ' sea'), pipeline = finite(row.pipeline.total, context + ' pipeline');
    require(send <= receipt && receipt <= started && started <= finished && pipeline >= 0, `${context}: invalid timestamp ordering`);
    if (i > 0) {
      const previous = trace[i - 1], delta = row.request.id - previous.request.id;
      require(delta > 0 && sea > previous.sea, `${context}: IDs/sea not monotone`);
      require(Math.abs((sea - previous.sea) - delta / 60) < 1e-6, `${context}: clock does not match one-step ID delta`);
    }
    const next = trace[i + 1];
    if (row.nextSend) {
      require(row.nextSend.steps === 1 && row.nextSend.id === row.request.id + 1, `${context}: invalid next-send ID/steps`);
      require(row.nextSend.wall >= started && row.nextSend.wall <= finished, `${context}: next send not inside handler`);
      require(row.pendingBeforeReceipt > 0, `${context}: inline send with no queued step`);
      if (next) require(row.nextSend.id === next.request.id && row.nextSend.wall === next.request.wall, `${context}: next-send/next-row mismatch`);
      // Final next-send has no receipt inside this trace; it is excluded below.
    } else require(row.pendingBeforeReceipt === 0, `${context}: queued step did not flush`);
    require(row.pendingAfterReceipt === Math.max(0, row.pendingBeforeReceipt - (row.nextSend ? 1 : 0)), `${context}: pending after handler mismatch`);
    return { index: i, id: row.request.id, sea, relativeSea: sea - trace[0].sea, pending: row.pendingBeforeReceipt,
      latency: receipt - send, workerPipeline: pipeline, nonPipeline: receipt - send - pipeline,
      handler: finished - started, receiptToHandlerStart: started - receipt,
      queuedGap: row.pendingBeforeReceipt > 0 && next ? row.nextSend.wall - receipt : null,
      queuedCycle: row.pendingBeforeReceipt > 0 && next ? row.nextSend.wall - send : null,
      cycleOutsidePipeline: row.pendingBeforeReceipt > 0 && next ? row.nextSend.wall - send - pipeline : null,
      water: row.pipeline.water, deviceMap: row.pipeline.deviceMap, contact: row.pipeline.contact, snapshot: row.pipeline.snapshot,
      negativeNonPipeline: receipt - send - pipeline < 0 };
  });
  // Conservative boundary exclusions: the driver already omitted replies whose sends predated sampling.
  // Dropping both recorded edge rows also ensures no first/final partial cycle is summarized.
  const interior = derived.slice(1, -1);
  const keys = ['latency', 'workerPipeline', 'nonPipeline', 'handler', 'receiptToHandlerStart', 'queuedGap', 'queuedCycle', 'cycleOutsidePipeline', 'water', 'deviceMap', 'contact', 'snapshot'];
  const summarize = (items) => ({ rows: items.length, queued: items.filter((r) => r.pending > 0).length,
    negativeResiduals: items.filter((r) => r.negativeNonPipeline).length,
    metricsMs: Object.fromEntries(keys.map((key) => [key, stats(items.map((r) => r[key]).filter((value) => typeof value === 'number'))])),
    backlogOutsidePipelineFraction: (() => {
      const queued = items.filter((r) => r.queuedCycle !== null);
      const cycles = queued.reduce((sum, r) => sum + r.queuedCycle, 0);
      return cycles > 0 ? queued.reduce((sum, r) => sum + r.cycleOutsidePipeline, 0) / cycles : null;
    })() });
  const bins = new Map();
  for (const row of interior) { const bin = Math.floor(row.relativeSea / 10) * 10; if (!bins.has(bin)) bins.set(bin, []); bins.get(bin).push(row); }
  Object.assign(result, { validity: { passed: true, rawTraceRows: trace.length, analyzedInteriorRows: interior.length, worker,
      boundaryExclusions: { driver: 'Replies whose request was sent before sampling are not retained; their count is not recorded.', firstRecordedRow: { id: derived[0].id, reason: 'Conservative first boundary/cycle exclusion; matched request itself may be complete.' }, lastRecordedRow: { id: derived.at(-1).id, nextSendWithoutReceipt: trace.at(-1).nextSend?.id ?? null, reason: 'Conservative final boundary exclusion, including any next send without a retained reply.' } } },
    provenance: { artifact: run.artifact, workerPortProbe: run.workerPortProbe, commit: run.commit, build: run.build, url: run.url },
    ordinary: { config: ride.config, observed: ride.observed, canvas: ride.canvas, sourceValidationPassed: ride.ordinaryConfigMatches,
      renderedFps: ride.renderedFps, freshSnapshotsPerSecond: ride.freshSnapshotsPerSecond, physicsStepsPerWallSecond: ride.physicsStepsPerWallSecond, simulationSecondsPerWallSecond: ride.simulationSecondsPerWallSecond, diagnosticComparableToPassive: false },
    overall: summarize(interior), seaBins: [...bins].map(([from, items]) => ({ relativeSeaFrom: from, relativeSeaTo: from + 10, absoluteSeaOrigin: trace[0].sea, ...summarize(items) })),
    late: { selection: 'Predeclared relative sea >=60 s; includes paired rows, not selected by measured latency.', ...summarize(interior.filter((r) => r.relativeSea >= 60)) },
    pairedRows: interior,
    limitations: ['Observer adds timestamp/metadata allocations and a forwarding callback; this is a diagnostic, not a pristine passive cadence comparison.', 'Non-pipeline latency combines post serialization, worker receive/main delivery scheduling, reply transport, timer granularity and omitted bookkeeping; it is not separated one-way latency or proven worker idle.', 'Pipeline includes device/GPU-map wall waiting; it is not CPU-active time.', 'Queued gap measures main-thread handoff only. No-backlog demand waits are excluded from cycle/handoff statistics.', 'Quantiles are computed from paired row differences, never independent quantile subtraction. Stage quantiles are not summed. Negative residuals are retained.', 'Both recorded boundary rows are conservatively excluded; initial unsampled request/reply and final unmatched-send counts are limited by what the driver retained.'] });
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ output, validity: result.validity, sourceHashes: result.provenance.workerPortProbe, overall: result.overall, late: result.late }, null, 2));
} catch (error) {
  result.failure = { message: error.message, stack: error.stack }; writeFileSync(output, JSON.stringify(result, null, 2) + '\n'); throw error;
}
