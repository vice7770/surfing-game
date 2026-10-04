import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { authority, resolver, sha256, WORK, ROOT } from './authority.mjs';
const pin = authority(), { rolldown } = await import(pathToFileURL(resolve(ROOT, 'node_modules/rolldown/dist/index.mjs')).href);
const out = resolve(WORK, 'dist-authority-fixed'); mkdirSync(out);
const records = [], arms = [];
for (const arm of ['baseline', 'candidate']) {
  const dir = resolve(out, arm); mkdirSync(dir);
  const bundle = await rolldown({ input: resolve(WORK, 'entry.ts'), platform: 'browser', plugins: [resolver(arm, pin)],
    transform: { define: { __NATURAL_CANDIDATE__: String(arm === 'candidate') } } });
  await bundle.write({ dir, format: 'esm', entryFileNames: 'entry.js', codeSplitting: false }); await bundle.close();
  const emitted = readFileSync(resolve(dir, 'entry.js'), 'utf8');
  if (emitted.includes('__NATURAL_CANDIDATE__') || !emitted.includes(`const ARM = "${arm}";`)) throw Error('Wrong emitted arm binding: ' + arm);
  writeFileSync(resolve(dir, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><title>Natural tube lifecycle playback</title><style>html,body{margin:0;background:#000}canvas{display:block}</style></head><body><script type="module" src="./entry.js"></script></body></html>\n');
  for (const name of readdirSync(dir)) { const path = resolve(dir, name), bytes = readFileSync(path); records.push({ url: `/${arm}/${name}`, path, bytes: bytes.length, sha256: sha256(bytes) }); }
  arms.push({ arm, outputRoot: dir, componentOnly: true, productionMainImported: false });
}
const after = authority(); if (JSON.stringify(pin.records) !== JSON.stringify(after.records)) throw Error('Build changed source authority');
writeFileSync(resolve(WORK, 'compiled.json'), JSON.stringify({ schema: 'natural-tube-playback-compiled/v1', status: 'passed', readySha256: pin.readySha256,
  buildId: 'e3e630bc4-qa-natural-tube', arms, records, noWorkerEmitted: true, sourceCaptureReadonly: true, productionChanged: false }, null, 2) + '\n');
process.stdout.write(JSON.stringify({ status: 'passed', arms, records }) + '\n');
