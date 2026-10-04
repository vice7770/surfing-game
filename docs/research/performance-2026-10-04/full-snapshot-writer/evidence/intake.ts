// Exact retained F32 post-state intake; no historical pre-update or gated-whitewater claim.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync, inflateSync } from 'node:zlib';
import { decodeSurfZoneState } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/surfZoneState';
import type { SurfZoneConfig, RenderGrid } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/SurfZoneSimulation';
export const FIXTURE = '/Users/regina/Desktop/Projects/surfing-game/docs/research/performance-2026-10-03/render-scale/baseline-held-source.json.gz';
export const FIXTURE_GZIP_SHA = '95f3937160eff73a9c751fcbdc2246a811978b49be7dbbda0e56ed9dea69e584';
export const FIXTURE_JSON_SHA = '8e73b4d10d268081891d0bf89b93c6706b37617a6bea5543af443d6963443587';
export const FIXTURE_SET1_SHA = '38b63fbe297eeb143c6449902855be39802455d4f14d540a07d152ead7ec32e0';
export const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export function intake() {
  const compressedSource = readFileSync(FIXTURE);
  if (sha(compressedSource) !== FIXTURE_GZIP_SHA) throw Error('Fixture gzip bytes changed');
  const sourceJson = gunzipSync(compressedSource);
  if (sha(sourceJson) !== FIXTURE_JSON_SHA) throw Error('Fixture JSON bytes changed');
  const capture = JSON.parse(sourceJson.toString('utf8')) as { scalars: { config: SurfZoneConfig; waterGrid: RenderGrid }; serialized: { deflated: boolean; rawSha256: string; compressed: { base64: string; sha256: string } } };
  const serialized = Buffer.from(capture.serialized.compressed.base64, 'base64');
  if (sha(serialized) !== capture.serialized.compressed.sha256) throw Error('Serialized compressed bytes changed');
  const raw = capture.serialized.deflated ? inflateSync(serialized) : serialized;
  if (sha(raw) !== FIXTURE_SET1_SHA || sha(raw) !== capture.serialized.rawSha256) throw Error('Serialized SET1 bytes changed');
  const owningBytes = new Uint8Array(raw); // Buffer.slice is a view: use an owning plain Uint8Array before browser codec.
  const state = decodeSurfZoneState(owningBytes), view = new DataView(owningBytes.buffer);
  const headerBytes = view.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(owningBytes.subarray(8, 8 + headerBytes))) as { arrays: [string, number][] };
  let offset = 8 + Math.ceil(headerBytes / 4) * 4, wordsChecked = 0;
  for (const [name, count] of header.arrays) {
    const array = state.arrays[name];
    if (!array || array.length !== count) throw Error('Decoded array count changed:' + name);
    const words = new Uint32Array(array.buffer, array.byteOffset, array.length);
    for (let i = 0; i < count; i += 1) if (words[i] !== view.getUint32(offset + i * 4, true)) throw Error('Decoded/raw word offset differs:' + name);
    offset += count * 4; wordsChecked += count;
  }
  if (offset !== raw.byteLength) throw Error('SET1 trailing/truncated bytes');
  const consumed = ['h', 'qx', 'qz', 'foam.dense', 'foam.residual', 'aeration.air', 'aeration.depth', 'breakingStrength'] as const;
  for (const name of consumed) {
    const values = state.arrays[name];
    if (!values || values.length !== state.nx * state.nz || !values.every(Number.isFinite)) throw Error('Consumed retained material differs/nonfinite:' + name);
  }
  const { config, waterGrid } = capture.scalars;
  if (config.spot !== 'padang' || config.stage !== 2 || config.seed !== 8761 || config.significantHeight !== 3.8
    || config.peakPeriod !== 18 || config.directionDegrees !== 0 || config.spreading !== 150 || config.componentCount !== 64
    || config.dx !== 2 || config.fineSpacing !== 1 || state.nx !== 160 || state.nz !== 725
    || waterGrid.spacing !== 2 || waterGrid.nx !== 161 || waterGrid.nz !== 633 || waterGrid.xMin !== -160) throw Error('Retained ordinary material/config/render-grid authority changed');
  return { config, grid: waterGrid, state, authority: { fixture: FIXTURE, gzipSha256: FIXTURE_GZIP_SHA, jsonSha256: FIXTURE_JSON_SHA,
    set1Sha256: FIXTURE_SET1_SHA, rawWordsChecked: wordsChecked, rawOffsetsAndCountsVerified: true, consumedFiniteNames: Array.from(consumed),
    validUnconsumedHistorySentinelsAllowed: true, postStateF32ControlledSnapshot: true, historicalPrestate: false,
    sourceProxy: 'Snapshot writer only. No solver/source/material update, BreakingModel.update(0), ProfileLibrary or front/crash replay. Retained fields are a controlled F32 poststate, not a historical prestate.',
    bedAuthority: 'Original same-config solver constructor regenerates bed/centers/dz. Retained render-grid xMin and generated full render grid must match before measurements.',
    turbulenceAuthority: 'Original importState zeroes turbulence (not serialized); both variants start with zero turbulence/stirred. No aerateBores injections or other evolution.' } };
}
