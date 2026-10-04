import { rolldown } from 'rolldown';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const work = fileURLToPath(new URL('.', import.meta.url));
const sha = b => createHash('sha256').update(b).digest('hex');
const readiness = readFileSync(`${work}/ready.json`), ready = JSON.parse(readiness);
for (const pin of ready.inputs) {
  const bytes = readFileSync(pin.path); if (bytes.length !== pin.bytes || sha(bytes) !== pin.sha256) throw Error(`Prepared input changed: ${pin.path}`);
}
const sourceAuthority = JSON.parse(readFileSync(`${work}/../source-authority.json`));
for (const pin of sourceAuthority.files) for (const arm of ['original', 'candidate']) {
  const expected = pin[`${arm}Sha256`]; if (expected === null) continue;
  const bytes = readFileSync(`${work}/../${arm}/${pin.path}`);
  if (bytes.length !== pin[`${arm}Bytes`] || sha(bytes) !== expected) throw Error(`Frozen arm source changed: ${arm}/${pin.path}`);
}
mkdirSync(`${work}/dist`, { recursive: true });
const bundle = await rolldown({ input: { page: `${work}/page-entry.ts`, worker: `${work}/worker-entry.ts` }, platform: 'browser', tsconfig: `${work}/tsconfig.json` });
const output = await bundle.write({ dir: `${work}/dist`, format: 'es', entryFileNames: '[name].js' });
await bundle.close();
const html = readFileSync(`${work}/index.html`); writeFileSync(`${work}/dist/index.html`, html);
const names = output.output.map(file => file.fileName).concat('index.html').sort();
if (names.join(',') !== 'index.html,page.js,worker.js') throw Error(`Unexpected compiled assets: ${names}`);
const files = names.map(name => { const bytes = readFileSync(`${work}/dist/${name}`); return { name, bytes: bytes.length, sha256: sha(bytes) }; });
const result = { status: 'passed', readySha256: sha(readiness), files };
writeFileSync(`${work}/compiled.json`, JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
