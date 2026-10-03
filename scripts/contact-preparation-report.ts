/** Frozen contact differential/cost report; no solver, browser or GPU. Build with rolldown for Node. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sampleCubicSurface } from '../src/scene/water/cubicSurface';
import { barrelCasesFor } from '../src/wave/barrel/barrelLibrary';
import type { SweptContact } from '../src/wave/barrel/sweptContact';

const option = (name: string, fallback?: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1];
};
const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const beforePath = resolve(option('before', '/private/tmp/contact-preparation-1bcc7c0c9-before.mjs')!);
const afterPath = resolve(option('after', '/private/tmp/contact-preparation-after.mjs')!);
const input = resolve(option('input', 'docs/research/tube-stability-2026-10-03/fixtures')!);
const out = resolve(option('out', '/private/tmp/contact-preparation-report.json')!);
// Import the existing bundled oracle separately so its CLI entry guard stays false.
const oraclePath = resolve(option('oracle', '/private/tmp/contact-preparation-oracle.mjs')!);
const { assessContact, geometryHash } = await import(pathToFileURL(oraclePath).href) as typeof import('./tube-geometry-regression-report');
const runtimes = await Promise.all([beforePath, afterPath].map(async (path, i) => ({
  label: i === 0 ? 'canonical-1bcc7c0c9' : 'per-slice-bounds-fusion', path,
  sha256: sha256(readFileSync(path)), module: await import(pathToFileURL(path).href),
})));
const cases = barrelCasesFor('padang');
const caseBytes = cases.map((entry) => new Uint8Array(readFileSync(`public/${entry.asset}`)));
const fixtures = [10, 20].map((at) => {
  const path = resolve(input, `at-${at}.json`), bytes = readFileSync(path), data = JSON.parse(bytes.toString());
  const front = Float32Array.from(data.front, (v: number | null) => v === null ? Number.NaN : v);
  const water = Float32Array.from(data.surfaceData);
  const heightAt = (x: number, z: number) => sampleCubicSurface(water, data.waterGrid, x, z).height;
  return { at, path, sha256: sha256(bytes), front, water, data, heightAt };
});

// Compare all existing preparation storage, including padding and cell/strip order, not just query answers.
const preparationFields = ['own', 'prior', 'boxes', 'cellStart', 'cellStrips', 'cellFill', 'x0', 'z0', 'nx', 'nz',
  'quadLow', 'quadHigh', 'stripLow', 'stripBuckets', 'stripFirst', 'stripReady', 'nextBucket', 'nextEntry',
  'bucketStart', 'bucketQuads', 'bucketFill'] as const;
const preparation = (contact: SweptContact) => Object.fromEntries(preparationFields.map((key) =>
  [key, (contact as unknown as Record<string, unknown>)[key]]));
const contacts: SweptContact[] = runtimes.map((runtime) =>
  new runtime.module.SweptContact(runtime.module.libraryFromBytes(caseBytes), 1 / 19));
const differential = [];
for (const [label, fixture, empty] of [
  ['at-10', fixtures[0], false], ['at-20-grow', fixtures[1], false],
  ['empty', fixtures[1], true], ['at-10-reused', fixtures[0], false],
] as const) {
  const inputHash = sha256(Buffer.concat([Buffer.from(fixture.front.buffer), Buffer.from(fixture.water.buffer)]));
  for (const contact of contacts) contact.update(fixture.front, empty ? 0 : fixture.data.frontCount, fixture.data.config.tide, fixture.heightAt);
  assert.deepStrictEqual(contacts[1].last, contacts[0].last, `${label}: all loft arrays and scalar attributes`);
  assert.deepStrictEqual(preparation(contacts[1]), preparation(contacts[0]), `${label}: exact grid, strip order and bucket storage`);
  const queries = empty ? undefined : assessContact(contacts[1], contacts[0]);
  assert.equal(queries?.pass ?? true, true, `${label}: strict hit values and independent half-open geometric oracle`);
  assert.deepStrictEqual(preparation(contacts[1]), preparation(contacts[0]), `${label}: identical reached buckets after queries`);
  assert.equal(sha256(Buffer.concat([Buffer.from(fixture.front.buffer), Buffer.from(fixture.water.buffer)])), inputHash);
  differential.push({ label, fixtureSha256: fixture.sha256, empty, exactLoftAndPreparation: true,
    geometryHash: geometryHash(contacts[1].last!), queries });
}

const percentile = (values: number[], fraction: number) => [...values].sort((a, b) => a - b)[Math.floor(fraction * (values.length - 1))];
const samples = [];
if (process.argv.includes('--measure')) {
  for (const fixture of fixtures) for (const phase of ['complete-update', 'projection-and-index'] as const) {
    const builds = runtimes.map((runtime) => {
      const contact: SweptContact = new runtime.module.SweptContact(runtime.module.libraryFromBytes(caseBytes), 1 / 19);
      contact.update(fixture.front, fixture.data.frontCount, fixture.data.config.tide, fixture.heightAt);
      if (phase === 'projection-and-index') {
        // Isolate the changed traversal, reusing this runtime's identical frozen loft, without any production hook.
        const loft = contact.last!;
        (contact as unknown as { loft: { build: () => typeof loft } }).loft.build = () => loft;
      }
      return { runtime, contact, times: [] as number[], sink: 0 };
    });
    for (let warm = 0; warm < 25; warm += 1) for (const build of builds) {
      build.contact.update(fixture.front, fixture.data.frontCount, fixture.data.config.tide, fixture.heightAt);
    }
    for (let repeat = 0; repeat < 101; repeat += 1) for (let slot = 0; slot < builds.length; slot += 1) {
      const build = builds[(slot + repeat) % builds.length];
      const start = performance.now();
      build.contact.update(fixture.front, fixture.data.frontCount, fixture.data.config.tide, fixture.heightAt);
      build.times.push(performance.now() - start);
      build.sink += build.contact.last!.vertexCount;
    }
    for (const build of builds) samples.push({ fixture: fixture.at, phase, runtime: build.runtime.label,
      repeats: build.times.length, medianMs: percentile(build.times, .5), p95Ms: percentile(build.times, .95),
      minMs: Math.min(...build.times), timesMs: build.times, sink: build.sink,
      slices: build.contact.last!.sliceCount, joined: build.contact.last!.sliceJoined.subarray(0, build.contact.last!.sliceCount)
        .reduce((sum, joined) => sum + joined, 0) });
  }
}
const report = { schema: 1, pass: true,
  method: 'Exact frozen front/cubic water inputs. All loft attributes and existing preparation arrays compared, including padding and index order; shared geometric/query oracle. Cost: 25 warmups, 101 builds per runtime/fixture/phase, rotating old/new order. Complete update includes actual loft rebuild; isolated traversal replaces only loft.build with its already frozen result. No simulation, browser, GPU or FPS inference.',
  runtimes: runtimes.map(({ module: _module, ...metadata }) => metadata),
  oracle: { path: oraclePath, sha256: sha256(readFileSync(oraclePath)) },
  cases: cases.map((entry, i) => ({ asset: entry.asset, sha256: sha256(caseBytes[i]) })),
  fixtures: fixtures.map(({ at, path, sha256: hash, data }) => ({ at, path, sha256: hash, frontCount: data.frontCount,
    seaTime: data.seaTime, waterGrid: data.waterGrid, config: data.config })), differential, samples,
  pairedSummary: samples.filter((_, i) => i % 2 === 0).map((before, pair) => {
    const after = samples[2 * pair + 1];
    const savings = before.timesMs.map((time, i) => time - after.timesMs[i]);
    return { fixture: before.fixture, phase: before.phase, pairedMedianSavingMs: percentile(savings, .5),
      p10SavingMs: percentile(savings, .1), p90SavingMs: percentile(savings, .9) };
  }) };
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ pass: report.pass, out, differential: differential.map(({ label, queries }) => ({ label, queries: queries?.queries })),
  samples: samples.map(({ timesMs: _times, sink: _sink, ...sample }) => sample) }, null, 2));
