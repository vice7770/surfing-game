import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { assertAuthority, commands, WORK } from './check-authority.mjs';
const run = process.argv.includes('--run=true');
const authority = assertAuthority();
const plan = { schema: 'coarse-fallback-rowband-cpu-check-plan/v1', readySha256: authority.readySha256, sourceReadySha256: authority.sourceReadySha256, commands: commands(), run, boundMs: 120_000, scope: 'Strict TypeScript, then four complete test files only. No build, cost or hardware.' };
if (!run) { process.stdout.write(JSON.stringify(plan, null, 2) + '\n'); } else {
  const out = resolve(WORK, 'checks-v2');
  mkdirSync(out); // Fresh evidence only; refuse overwrite.
  const save = (name, value) => writeFileSync(resolve(out, name), JSON.stringify(value, null, 2) + '\n');
  save('before.json', authority);
  save('plan.json', plan);
  const startedAt = new Date().toISOString(), deadline = Date.now() + plan.boundMs;
  const terminal = { schema: 'coarse-fallback-rowband-cpu-check-terminal/v1', startedAt, pid: process.pid, readySha256: authority.readySha256, stages: [], status: 'running' };
  try {
    for (const command of plan.commands) {
      if (Date.now() >= deadline) throw Error('CPU check hard deadline');
      const row = { ...command, cwd: WORK, startedAt: new Date().toISOString() };
      process.stdout.write(JSON.stringify({ stage: row.stage, status: 'start', startedAt: row.startedAt }) + '\n');
      const stdout = createWriteStream(resolve(out, row.stage + '.stdout.txt'), { flags: 'wx' });
      const stderr = createWriteStream(resolve(out, row.stage + '.stderr.txt'), { flags: 'wx' });
      const child = spawn(command.executable, command.args, { cwd: WORK, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
      row.pid = child.pid; terminal.stages.push(row); save('terminal.json', terminal);
      child.stdout.pipe(stdout); child.stderr.pipe(stderr);
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, Math.max(1, deadline - Date.now()));
      const outcome = await new Promise((accept, reject) => {
        child.once('error', reject);
        child.once('close', (exitCode, signal) => accept({ exitCode, signal }));
      }).finally(() => clearTimeout(timer));
      await Promise.all([stdout, stderr].map(stream => stream.closed ? Promise.resolve() : new Promise(resolve => stream.once('close', resolve))));
      Object.assign(row, outcome, { endedAt: new Date().toISOString(), timedOut });
      save('terminal.json', terminal);
      process.stdout.write(JSON.stringify({ stage: row.stage, status: 'terminal', ...outcome, timedOut }) + '\n');
      if (timedOut || outcome.exitCode !== 0) throw Error(`First check failure: ${row.stage}`);
    }
    terminal.status = 'passed';
  } catch (error) {
    terminal.status = 'failed'; terminal.failure = String(error?.stack ?? error); process.exitCode = 1;
  } finally {
    try { const after = assertAuthority(); save('after.json', after); terminal.authorityUnchanged = JSON.stringify(authority) === JSON.stringify(after); }
    catch (error) { terminal.authorityUnchanged = false; terminal.authorityFailure = String(error?.stack ?? error); terminal.status = 'failed'; process.exitCode = 1; }
    terminal.endedAt = new Date().toISOString(); save('terminal.json', terminal);
    process.stdout.write(JSON.stringify({ status: terminal.status, authorityUnchanged: terminal.authorityUnchanged, endedAt: terminal.endedAt }) + '\n');
  }
}
