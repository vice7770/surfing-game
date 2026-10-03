// Same frozen physical states + continuous tube geometry, with original versus temporal FFT shading.
// Rejected candidate: this prepared visual trial remains unrun. Explicitly apply the archived
// candidate patch before producing another candidate preview, or identify the retained immutable build.
// Preparation: node scripts/browser/fft-temporal-visual-trial.mjs --plan --afterUrl=http://localhost:4204/ --afterDir=/immutable/4204
// After exclusive GPU coordination, replace --plan with --run. No production or base-harness edits.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const base = join(root, 'scripts/browser/tube-frozen-render.mjs');
const imageMetrics = join(root, 'scripts/browser/compare-performance-images.py');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  if (!arg.startsWith('--')) throw Error('Use --name=value or --plan/--run');
  const at = arg.indexOf('=');
  return [arg.slice(2, at < 0 ? undefined : at), at < 0 ? 'true' : arg.slice(at + 1)];
}));
const input = resolve(args.input ?? '/private/tmp/tube-live-original');
const geometry = resolve(args.geometry ?? '/private/tmp/tube-geometry-final');
const out = resolve(args.out ?? '/private/tmp/fft-temporal-visual-trial');
const width = Number(args.width ?? 1280), height = Number(args.height ?? 720);
if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 2160)) throw Error('Invalid viewport');
const editions = [
  { label: 'original', url: args.beforeUrl ?? 'http://localhost:4201/', dir: resolve(args.beforeDir ?? '/private/tmp/surf-tube-stability-current-20261003') },
  { label: 'temporal30', url: args.afterUrl ?? 'http://localhost:4204/', dir: args.afterDir ? resolve(args.afterDir) : null },
];
for (const edition of editions) {
  const url = new URL(edition.url);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.port === '4200') throw Error('Use isolated local previews, never 4200');
}
const frames = [10, 20];
const fixtures = frames.map(at => {
  const path = join(input, `at-${at}.json`), bytes = readFileSync(path), capture = JSON.parse(bytes);
  const geometryPath = join(geometry, `at-${at}.current.json`), geometryBytes = readFileSync(geometryPath), data = JSON.parse(geometryBytes);
  if (data.fixture.sha256 !== sha(bytes) || data.fixture.seaTime !== capture.status.seaTime) throw Error('Geometry/capture mismatch at ' + at);
  return { at, path, sha256: sha(bytes), seaTime: capture.status.seaTime, interpolationShare: capture.status.seaTime * 30 - Math.floor(capture.status.seaTime * 30),
    geometryPath, geometryFileSha256: sha(geometryBytes), geometryHash: data.geometryHash, sourceRuntime: data.sourceRuntime };
});
const plan = {
  schema: 1, method: 'Invoke the unchanged frozen renderer once per fixture/edition, with the same current geometry under baseline/current names.',
  editions, fixtures, width, height, pixelRatio: 1, camera: 'tube', look: 'high/rich', timeOfDay: 'midday',
  caustics: 'Actual game caustics remain enabled, recomputed at held seaTime. No target freeze, FBO mask diagnostics or shader instrumentation.',
  sequence: ['original-at10', 'temporal30-at10', 'original-at20', 'temporal30-at20'],
  passesPerCase: 'Original mesh visible, hidden visibility control, original mesh repeated; no physics advances.',
  harness: { path: base, sha256: sha(readFileSync(base)) },
  imageMetrics: { path: imageMetrics, sha256: sha(readFileSync(imageMetrics)) },
  driverSha256: sha(readFileSync(import.meta.filename)),
  limitations: [
    'Saved captures contain height/foam/front; bed is reconstructed and flow/aeration are zero. Missing particles/rider/lip sheet are hidden identically.',
    'Normal PNG repeat variability with caustics enabled is measured, but not uniquely attributed to caustics without a separate controlled diagnostic.',
    'Image channel differences are descriptive. This driver sets no arbitrary visual acceptance threshold and makes no FPS claim.',
  ],
};
if (args.run !== 'true') { console.log(JSON.stringify({ ...plan, browserLaunched: false, pending: editions.filter(e => !e.dir).map(e => e.label + ' immutable --afterDir') }, null, 2)); process.exit(0); }
if (!args.afterUrl || !args.afterDir) throw Error('Rejected candidate requires explicit --afterUrl and --afterDir from an applied candidate patch or retained candidate build');
if (args.plan === 'true' || editions.some(e => !e.dir || !existsSync(join(e.dir, 'index.html')))) throw Error('Run requires two immutable directories and exclusive GPU authorization');
mkdirSync(out, { recursive: true });
const sharedGeometry = join(out, 'same-current-geometry');
mkdirSync(sharedGeometry, { recursive: true });
for (const fixture of fixtures) for (const suffix of ['baseline', 'current']) {
  copyFileSync(fixture.geometryPath, join(sharedGeometry, `at-${fixture.at}.${suffix}.json`));
}
const report = { ...plan, date: new Date().toISOString(), runs: [], comparisons: [], validHeldInputs: false, allHarnessRepeatsExact: false };
const save = () => writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
async function run(command, commandArgs) {
  const child = spawn(command, commandArgs, { cwd: root, stdio: 'inherit' });
  return await new Promise((resolveExit, reject) => { child.once('error', reject); child.once('exit', code => resolveExit(code ?? 1)); });
}
function comparable(state) {
  const copy = structuredClone(state.common);
  // UUIDs identify newly constructed resources, not their pixels. Hashes/dimensions/uniforms remain checked.
  for (const texture of Object.values(copy.textures)) delete texture.uuid;
  delete copy.environment;
  if (typeof copy.background === 'string') delete copy.background;
  return { common: copy, variant: state.variant };
}
async function compare(a, b, filename) {
  const path = join(out, filename);
  const code = await run(args.python ?? 'python3', [imageMetrics, a, b, '--out=' + path]);
  if (code !== 0) throw Error('Pixel metrics failed; retain PNGs at ' + out);
  return { path, sha256: sha(readFileSync(path)), metrics: JSON.parse(readFileSync(path)) };
}
save();
try {
  for (const fixture of fixtures) {
    for (const edition of editions) {
      const destination = join(out, edition.label, `at-${fixture.at}`);
      const commandArgs = [base, '--url=' + edition.url, '--dir=' + edition.dir, '--input=' + input,
        '--baseline=' + sharedGeometry, '--current=' + sharedGeometry, '--out=' + destination,
        '--frames=' + fixture.at, '--camera=tube', '--baseline-only=true', '--mask-diagnostic=false', '--freeze-caustics=false',
        '--width=' + width, '--height=' + height, '--timeoutSeconds=60', '--cdp=' + (args.cdp ?? '9472')];
      console.log(`Held FFT visual: ${edition.label}, capture ${fixture.at}; caustics enabled`);
      const code = await run(process.execPath, commandArgs);
      const path = join(destination, 'report.json'), capture = JSON.parse(readFileSync(path));
      const pair = capture.pairs.find(p => p.at === fixture.at), first = pair?.shots.find(s => s.mode === 'baseline'), repeat = pair?.shots.find(s => s.mode === 'baseline-repeat');
      const heldInputsValid = Boolean(pair?.commonUnchanged && pair?.baselineStateExact && pair?.tubeChangesImage && first && repeat && capture.rendererRuntime?.verifiedDirectory && !capture.failures.length);
      // The base harness intentionally rejects any repeat pixel difference. Retain that rejection;
      // only this exact failure may still yield a measured, state-valid visual trial.
      const repeatVariabilityOnly = code !== 0 && heldInputsValid && !pair.baselineImageExact
        && capture.failure?.includes('Held rendering failed visibility/state/image checks');
      const entry = { edition: edition.label, at: fixture.at, path, sha256: sha(readFileSync(path)), commandArgs, exitCode: code,
        heldInputsValid, repeatVariabilityOnly, harnessValid: capture.valid, baselineImageExact: pair?.baselineImageExact,
        rendererRuntime: capture.rendererRuntime, first, repeat, failures: capture.failures, failure: capture.failure };
      report.runs.push(entry); save();
      if (!heldInputsValid || code !== 0 && !repeatVariabilityOnly) throw Error('Frozen trial failed its input/provenance/visibility checks: ' + edition.label + '/' + fixture.at);
      entry.repeatPixelMetrics = await compare(first.path, repeat.path, `at-${fixture.at}.${edition.label}.repeat-difference.json`);
      save();
    }
    const original = report.runs.find(r => r.edition === 'original' && r.at === fixture.at);
    const candidate = report.runs.find(r => r.edition === 'temporal30' && r.at === fixture.at);
    const sameInputs = JSON.stringify(comparable(original.first.state)) === JSON.stringify(comparable(candidate.first.state));
    if (!sameInputs || original.first.geometryHash !== candidate.first.geometryHash) throw Error('Cross-build geometry, uniforms, camera, lighting or CPU fields changed');
    const pixels = await compare(original.first.path, candidate.first.path, `at-${fixture.at}.original-vs-temporal30.json`);
    report.comparisons.push({ at: fixture.at, sameInputs, geometryHash: original.first.geometryHash, pixels,
      originalRepeat: original.repeatPixelMetrics.metrics, candidateRepeat: candidate.repeatPixelMetrics.metrics });
    save();
  }
  report.validHeldInputs = report.runs.length === 4 && report.comparisons.length === 2 && report.runs.every(r => r.heldInputsValid);
  report.allHarnessRepeatsExact = report.runs.every(r => r.baselineImageExact);
} catch (error) { report.failure = String(error.stack ?? error); process.exitCode = 1; }
finally { save(); }
console.log(JSON.stringify({ report: join(out, 'report.json'), validHeldInputs: report.validHeldInputs, allHarnessRepeatsExact: report.allHarnessRepeatsExact, failure: report.failure }));
