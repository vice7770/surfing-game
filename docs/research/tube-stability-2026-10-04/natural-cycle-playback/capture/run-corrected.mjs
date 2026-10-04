import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readyBytes = readFileSync(join(root, 'ready.json'));
if (process.env.TUBE_VISUAL_CAPTURE_READY_SHA256 !== sha(readyBytes)) throw new Error('Exact reviewed readiness pin is required; no simulation started');
const ready = JSON.parse(readyBytes);
const authority = JSON.parse(readFileSync(join(root, 'source-manifest.json'), 'utf8'));
function verify() {
  const results = [];
  for (const record of [...ready.records, ...authority.files, ...authority.cases, ...authority.dependencies]) {
    const path = record.externalPath ?? join(root, record.path);
    const bytes = readFileSync(path);
    if (bytes.length !== record.bytes || sha(bytes) !== record.sha256) throw new Error(`Pinned input differs: ${path}`);
    results.push({ path, bytes: bytes.length, sha256: record.sha256 });
  }
  return results;
}
const checks = join(root, 'checks-capture-corrected');
mkdirSync(checks); // Never overwrite a prior attempt.
const before = verify();
writeFileSync(join(checks, 'before.json'), JSON.stringify(before, null, 2) + '\n');
const commands = [
  { name: 'strict', executable: './node_modules/.bin/tsc', args: ['--noEmit', '--incremental', 'false', '-p', 'tsconfig.capture.json'], timeout: 60_000 },
  { name: 'capture', executable: './node_modules/.bin/vitest', args: ['run', '--config', 'vitest.capture.config.ts', '--maxWorkers', '1', 'capture.test.ts'], timeout: 125_000 },
];
const terminal = { schema: 1, readySha256: sha(readyBytes), started: new Date().toISOString(), status: 'failed', commands: [] };
try {
  for (const command of commands) {
    const result = await new Promise((resolve, reject) => {
      const started = new Date().toISOString();
      const child = spawn(command.executable, command.args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      process.stdout.write(JSON.stringify({ phase: command.name, pid: child.pid, started, argv: [command.executable, ...command.args] }) + '\n');
      const stdout = []; const stderr = []; let timedOut = false;
      const deadline = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, command.timeout);
      child.stdout.on('data', chunk => { stdout.push(chunk); process.stdout.write(chunk); });
      child.stderr.on('data', chunk => { stderr.push(chunk); process.stderr.write(chunk); });
      child.on('error', error => { clearTimeout(deadline); reject(error); });
      child.on('close', (code, signal) => {
        clearTimeout(deadline);
        writeFileSync(join(checks, `${command.name}.stdout.log`), Buffer.concat(stdout));
        writeFileSync(join(checks, `${command.name}.stderr.log`), Buffer.concat(stderr));
        resolve({ ...command, pid: child.pid, started, ended: new Date().toISOString(), code, signal, timedOut });
      });
    });
    terminal.commands.push(result);
    if (result.code !== 0 || result.timedOut) throw new Error(`First terminal failure in ${command.name}; stopped without repair/retry`);
  }
  terminal.status = 'passed';
} catch (error) {
  terminal.error = { name: error.name, message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  try { writeFileSync(join(checks, 'after.json'), JSON.stringify(verify(), null, 2) + '\n'); }
  catch (error) { terminal.afterError = String(error); process.exitCode = 1; terminal.status = 'failed'; }
  terminal.ended = new Date().toISOString();
  writeFileSync(join(checks, 'terminal.json'), JSON.stringify(terminal, null, 2) + '\n');
  process.stdout.write(JSON.stringify(terminal) + '\n');
}
