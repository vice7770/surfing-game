import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WORK, sha, assertReady } from './authority.mjs';
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const at = arg.indexOf('='); if (!arg.startsWith('--') || at < 0) throw Error('Use --name=value'); return [arg.slice(2, at), arg.slice(at + 1)];
}));
if (Object.keys(args).some(key => !['run', 'out'].includes(key)) || !['true', 'false'].includes(args.run ?? 'false')) throw Error('Only run/out supported');
const authority = assertReady();
const meta = JSON.parse(readFileSync(resolve(WORK, 'compiled.json'), 'utf8'));
if (meta.schema !== 'full-snapshot-writer-compiled/v1' || meta.readySha256 !== authority.sha256) throw Error('Compiled readiness mismatch');
const bytes = readFileSync(meta.output.path);
if (bytes.length !== meta.output.bytes || sha(bytes) !== meta.output.sha256) throw Error('Compiled bytes changed');
const out = args.out ? resolve(args.out) : resolve(WORK, 'cost/report.json');
if (existsSync(out)) throw Error('Refuse overwrite existing result');
if (args.run !== 'true') {
  console.log(JSON.stringify({ armed: false, sourceReadySha256: authority.sha256, compiled: meta.output, out,
    scope: 'Complete snapshot-fields writer only; no runner metadata/material/solver/GPU work', warmPairs: 8, measuredPairs: 24,
    orderBlock: ['AB', 'BA', 'BA', 'AB'], hardBoundMs: 20000, retries: 0 }));
} else {
  mkdirSync(dirname(out), { recursive: true });
  const module = await import(pathToFileURL(meta.output.path).href);
  module.run(out, authority.sha256);
  assertReady();
}
