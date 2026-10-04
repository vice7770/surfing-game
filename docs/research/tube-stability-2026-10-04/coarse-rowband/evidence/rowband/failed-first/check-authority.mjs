import { readFileSync, readlinkSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const WORK = dirname(fileURLToPath(import.meta.url));
export const ROOT = '/Users/regina/Desktop/Projects/surfing-game';
export const sha256 = raw => createHash('sha256').update(raw).digest('hex');
function checked(row) {
  const raw = readFileSync(row.path);
  if (raw.length !== row.bytes || sha256(raw) !== row.sha256) throw Error(`Changed authority: ${row.path}`);
  return raw;
}
export function assertAuthority() {
  const raw = readFileSync(resolve(WORK, 'harness-ready.json')), readySha256 = sha256(raw);
  if (process.env.TUBE_ROWBAND_CHECK_READY_SHA256 !== readySha256) throw Error('Reviewed harness readiness is required');
  const ready = JSON.parse(raw);
  if (ready.status !== 'SOURCE_ONLY_UNEXECUTED' || ready.baseGitRef !== 'e3e630bc45339e0f7564e59cfdd556275c06de92') throw Error('Unexpected harness authority');
  const records = new Map();
  function add(row) {
    const old = records.get(row.path);
    if (old && (old.bytes !== row.bytes || old.sha256 !== row.sha256)) throw Error(`Conflicting authority: ${row.path}`);
    records.set(row.path, row);
  }
  add(ready.frozenSourceReady);
  const original = JSON.parse(checked(ready.frozenSourceReady));
  for (const row of original.artifacts) add(row);
  for (const row of ready.ownedRecords) add(row);
  const inputs = JSON.parse(checked(ready.checkInputs));
  add(inputs.previousCheckedClosure);
  for (const row of inputs.sourceLinks) {
    if (!lstatSync(row.linkPath).isSymbolicLink() || readlinkSync(row.linkPath) !== row.linkTarget) throw Error(`Changed source link: ${row.linkPath}`);
    add(row);
  }
  for (const row of [...inputs.installedPackagesAndCriticalThreeReferences, ...inputs.canonicalConfigs]) add(row);
  const link = inputs.dependencyLink;
  if (!lstatSync(link.path).isSymbolicLink() || readlinkSync(link.path) !== link.target) throw Error('Changed readonly dependency link');
  for (const row of records.values()) checked(row);
  return { readySha256, sourceReadySha256: ready.frozenSourceReady.sha256, records: [...records.values()], sourceLinks: inputs.sourceLinks.length };
}
export const commands = () => [
  { stage: 'strict', executable: resolve(ROOT, 'node_modules/.bin/tsc'), args: ['-p', 'tsconfig.qa.json', '--pretty', 'false'] },
  { stage: 'four-complete-test-files', executable: resolve(ROOT, 'node_modules/.bin/vitest'), args: ['run', '--config', 'vitest.config.ts', '--maxWorkers=1', '--reporter=json', '--outputFile=checks/vitest.json'] },
];
