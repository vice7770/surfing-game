// QA-only serial passive pair. Default is a local plan; execution needs a separate root lease.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { sleep, tcpProof } from './native-owned.mjs';

const WORK = '/private/tmp/contact-height-demand-fps-20261004';
const BUILD = '/private/tmp/contact-height-demand-build-20261004';
const args = Object.fromEntries(process.argv.slice(2).map((arg) => { const at = arg.indexOf('='); assert(arg.startsWith('--') && at > 2, 'Use --name=value'); return [arg.slice(2, at), arg.slice(at + 1)]; }));
assert(Object.keys(args).every((key) => ['run', 'out'].includes(key)) && [undefined, 'false', 'true'].includes(args.run), 'Only run/out may vary');
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const record = (path) => { const bytes = readFileSync(path); return { path, bytes: bytes.length, sha256: hash(bytes) }; };
const verify = (path, expected) => { const actual = record(path); assert.equal(actual.bytes, expected.bytes, path); assert.equal(actual.sha256, expected.sha256, path); return actual; };
const write = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
const bindings = json(join(WORK, 'bindings.json'));
const plan = json(join(WORK, 'plan.json'));

function armAuthority(name) {
  assert.equal(bindings.pending, false, 'Compiled/public asset bindings must be completed and reviewed');
  verify(bindings.buildReady.path, bindings.buildReady); verify(bindings.sourceManifest.path, bindings.sourceManifest);
  verify(bindings.buildTerminal.path, bindings.buildTerminal); assert.equal(json(bindings.buildTerminal.path).status, 'passed');
  const source = json(bindings.sourceManifest.path), armSource = source.arms.find((row) => row.arm === name);
  assert(armSource && armSource.files.length === 246, 'Exact literal source closure absent');
  for (const row of armSource.files) verify(join(armSource.root, row.path), row);
  const pin = bindings.arms[name]; verify(pin.path, pin);
  const manifest = json(pin.path);
  assert.equal(manifest.schema, 'contact-height-build-arm/v1'); assert.equal(manifest.status, 'passed'); assert.equal(manifest.arm, name);
  assert.equal(manifest.runtimeBaseline, source.baseline); assert.equal(manifest.buildId, '68e263250-qa-contact-height');
  assert.equal(manifest.readySha256, bindings.buildReady.sha256); assert.equal(manifest.sourceManifest.sha256, bindings.sourceManifest.sha256);
  assert.equal(manifest.outputRoot, join(BUILD, name, 'dist')); assert.equal(manifest.publicAssetCopies, false);
  assert.equal(manifest.inlineBuildFlags.configLoader, 'runner'); assert.equal(manifest.inlineBuildFlags.build.copyPublicDir, false); assert.equal(manifest.inlineBuildFlags.build.emptyOutDir, false);
  for (const row of manifest.outputRecords) verify(join(manifest.outputRoot, row.path), row);
  const workers = manifest.outputRecords.filter((row) => /^assets\/surfZoneWorker-[^/]+\.js$/.test(row.path));
  assert.equal(workers.length, 1); assert.equal(workers[0].path, manifest.surfZoneWorker);
  assert.equal(json(join(manifest.outputRoot, 'build.json')).build, manifest.buildId);
  assert(manifest.outputRecords.some((row) => row.path === manifest.clientEntry));
  verify(bindings.publicAssets.path, bindings.publicAssets);
  const publicAssets = json(bindings.publicAssets.path);
  assert.equal(publicAssets.schema, 'contact-height-fps-public-assets/v1');
  assert.equal(publicAssets.root, '/Users/regina/Desktop/Projects/surfing-game/public');
  for (const row of publicAssets.files) verify(join(publicAssets.root, row.path), row);
  return { manifest, armSource, publicAssets, manifestPin: pin };
}

if (args.run !== 'true') {
  // After a separate check lease this prints the exact available bindings, without network or game import.
  const local = bindings.pending ? { pending: true } : Object.fromEntries(['baseline', 'candidate'].map((name) => [name, armAuthority(name).manifestPin]));
  console.log(JSON.stringify({ planOnly: true, plan, local, chromeStarted: false, serverStarted: false }, null, 2));
  process.exit(0);
}
const readyPath = join(WORK, 'ready.json'); assert.equal(hash(readFileSync(readyPath)), process.env.CONTACT_HEIGHT_FPS_READY_SHA256, 'Reviewed harness-ready pin required');
for (const row of [...json(readyPath).artifacts, ...json(readyPath).borrowedSourceAuthorities]) verify(row.path, row);
const OUT = resolve(args.out ?? join(WORK, 'run')); assert(OUT.startsWith(WORK + '/') && !existsSync(OUT), 'Fresh owned output required'); mkdirSync(OUT, { recursive: true });
const report = { schema: 'contact-height-passive-pair/v1', plan, valid: false, incomplete: true, startedAt: new Date().toISOString(), arms: [] };
const save = () => write(join(OUT, 'report.json'), report); save();
const slots = [{ name: 'baseline', port: 4216, cdp: 9626 }, { name: 'candidate', port: 4217, cdp: 9627 }];

async function runArm(slot, baselinePath) {
  const started = Date.now(), authority = armAuthority(slot.name), { manifest, publicAssets } = authority;
  const root = join(OUT, slot.name); mkdirSync(root);
  const row = { arm: slot.name, startedAt: new Date(started).toISOString(), manifest: authority.manifestPin, valid: false, compiledServed: [] }; report.arms.push(row); save();
  let child, server, deadline, commandLog, abortOperation;
  const operationFailure = new Promise((_, reject) => { abortOperation = reject; });
  // A pre-child static failure still reaches the enclosing first-failure/cleanup path.
  operationFailure.catch(() => {});
  const failServing = (message) => { if (row.firstServingFailure) return; row.firstServingFailure = message; save(); child?.kill('SIGTERM'); abortOperation(Error('First serving failure: ' + message)); };
  const compiled = new Map(manifest.outputRecords.map((item) => [item.path, item]));
  const assets = new Map(publicAssets.files.map((item) => [item.path, item]));
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.hdr': 'application/octet-stream', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
  try {
    row.port4200 = await tcpProof(4200); assert.equal(row.port4200.closed, true, 'User play port4200 must stay closed');
    row.serverPreSpawn = await tcpProof(slot.port); row.cdpPreSpawn = await tcpProof(slot.cdp);
    assert.equal(row.serverPreSpawn.closed, true); assert.equal(row.cdpPreSpawn.closed, true);
    server = createServer((request, response) => {
      try {
        assert(['GET', 'HEAD'].includes(request.method));
        const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'index.html';
        const pin = compiled.get(pathname) ?? assets.get(pathname);
        if (!pin) { response.writeHead(404); response.end(); if (pathname !== 'favicon.ico') failServing(pathname); return; }
        const base = compiled.has(pathname) ? manifest.outputRoot : publicAssets.root;
        const file = resolve(base, pathname); assert(file.startsWith(resolve(base) + '/'));
        response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Content-Length': statSync(file).size, 'Cache-Control': 'no-store' });
        if (request.method === 'HEAD') response.end(); else createReadStream(file).pipe(response);
      } catch (error) { failServing(String(error)); response.writeHead(500); response.end(); }
    });
    await new Promise((resolveServer, reject) => { server.once('error', reject); server.listen(slot.port, '127.0.0.1', resolveServer); });
    for (const pin of manifest.outputRecords) {
      const response = await fetch(`http://127.0.0.1:${slot.port}/${pin.path}`, { signal: AbortSignal.timeout(2000) }); assert(response.ok);
      const bytes = Buffer.from(await response.arrayBuffer()); assert.equal(bytes.length, pin.bytes); assert.equal(hash(bytes), pin.sha256);
      row.compiledServed.push({ path: pin.path, bytes: pin.bytes, sha256: pin.sha256 });
    }
    const fps = join(root, 'fps.json');
    const command = [join(WORK, 'survey.mjs'), fps, `--url=http://127.0.0.1:${slot.port}/?diagnostics`, `--dir=${manifest.outputRoot}`, '--features=true', '--only=High (baseline)', '--spot=Padang', '--swell=Big', '--warmSeconds=5', '--rideSeconds=90', '--gpuTiming=false', '--diagnosticGpu=false', '--edition=single-step-publication', '--width=1708', '--height=966', `--cdp=${slot.cdp}`, `--commit=${manifest.runtimeBaseline}`, ...(baselinePath ? [`--baseline=${baselinePath}`] : [])];
    commandLog = createWriteStream(join(root, 'stdout.log'), { flags: 'wx' });
    child = spawn(process.execPath, command, { cwd: WORK, env: { ...process.env, CONTACT_FPS_LAUNCHER_REPORT: join(root, 'launcher.json'), CONTACT_FPS_EXPECTED_WORKER: manifest.surfZoneWorker }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(commandLog, { end: false }); child.stderr.pipe(commandLog, { end: false }); row.command = [process.execPath, ...command]; row.pid = child.pid; save();
    const remaining = Math.max(1, 175000 - (Date.now() - started));
    const hardDeadline = new Promise((_, reject) => { deadline = setTimeout(() => { row.hardDeadline = '175s command abort; remaining5s reserved for owned cleanup'; child.kill('SIGTERM'); reject(Error('Hard arm command deadline; no retry')); }, remaining); });
    console.log(JSON.stringify({ stage: 'START', arm: slot.name, pid: child.pid, server: slot.port, cdp: slot.cdp, sourceManifest: bindings.sourceManifest.sha256, compiledManifest: authority.manifestPin.sha256 }));
    const terminal = await Promise.race([hardDeadline, operationFailure, new Promise((resolveChild, reject) => { child.once('error', reject); child.once('exit', (code, signal) => resolveChild({ code, signal, at: new Date().toISOString() })); })]);
    clearTimeout(deadline); commandLog.end(); row.terminal = terminal;
    assert.equal(terminal.code, 0, 'First arm command failure stops pair'); assert(!row.hardDeadline);
    assert(!row.firstServingFailure, 'Source-required static asset unavailable');
    const result = json(fps), launcher = json(join(root, 'launcher.json'));
    assert.equal(result.valid, true); assert.equal(result.results.length, 1); assert.equal(result.nativeAudit.valid, true); assert.equal(launcher.ownedChromeClosed, true);
    assert.equal(result.gpuTiming, 'disabled (passive counters)'); assert.equal(result.results[0].ordinaryConfigMatches, true);
    armAuthority(slot.name); row.authorityUnchangedAfter = true; row.fps = record(fps); row.nativeAudit = record(join(root, 'native-audit.json')); row.launcher = record(join(root, 'launcher.json')); row.valid = true;
    return fps;
  } catch (error) { row.error = String(error); throw error; }
  finally {
    clearTimeout(deadline);
    if (child && child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await sleep(500); if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }
    const launcherPath = join(root, 'launcher.json');
    if (existsSync(launcherPath)) { const launcher = json(launcherPath); if (launcher.pid && (await tcpProof(slot.cdp)).closed !== true) { try { process.kill(launcher.pid, 'SIGTERM'); } catch {} await sleep(500); if ((await tcpProof(slot.cdp)).closed !== true) { try { process.kill(launcher.pid, 'SIGKILL'); } catch {} } } }
    if (server) { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
    if (commandLog && !commandLog.writableEnded) commandLog.end();
    row.cdpClosure = await tcpProof(slot.cdp); row.serverClosure = await tcpProof(slot.port); row.port4200End = await tcpProof(4200);
    row.valid &&= row.cdpClosure.closed === true && row.serverClosure.closed === true && row.port4200End.closed === true && Date.now() - started <= 180000;
    row.endedAt = new Date().toISOString(); row.elapsedSeconds = (Date.now() - started) / 1000; save();
  }
}
try {
  const baseline = await runArm(slots[0]); assert.equal(report.arms[0].valid, true, 'Baseline cleanup invalid; candidate prohibited');
  await runArm(slots[1], baseline); assert.equal(report.arms[1].valid, true);
  report.valid = true; report.incomplete = false;
} catch (error) { report.firstFailure = String(error); process.exitCode = 1; }
finally { report.endedAt = new Date().toISOString(); save(); console.log(JSON.stringify({ valid: report.valid, incomplete: report.incomplete, firstFailure: report.firstFailure, report: join(OUT, 'report.json') })); }
