/**
 * A saved sea, aged (canyon-perf, 2026-10-29): scripts/m1-cpu-bench.ts saves its sea right after the spin-up, when the
 * Canyon's sets have barely broken; this steps it `--seconds` more at the worker's 1/60 s, ridden by the same idle rider,
 * and saves it again, for A/Bs on a developed surf zone.
 *   rolldown docs/research/canyon-perf-2026-10-29/age-sea.ts -o dist/scripts/age-sea.mjs --format esm --platform node \
 *     && node dist/scripts/age-sea.mjs --state <in.sea> --out <out.sea> [--size medium] [--seconds 60]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import { SurfZoneRunner } from '../../../src/wave/SurfZoneRunner';
import { decodeSurfZoneState, encodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const size = (option('size') ?? 'medium') as SwellSize;
const seconds = Number(option('seconds') ?? 60);
const settings = physicalSettingsFor('canyon', { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
const runner = SurfZoneRunner.forWorker(surfZoneConfigFor(settings, 8761, true), { rider: true }, 'warm');
runner.simulation.importState(decodeSurfZoneState(new Uint8Array(readFileSync(option('state')!))));
await runner.spinUp();
for (let k = 0; k < Math.round(seconds * 60); k += 1) runner.advance(1, { paddle: false, popUp: false, steer: 0, retry: false });
writeFileSync(option('out')!, encodeSurfZoneState(runner.simulation.exportState()));
console.log(`canyon ${size}: aged to t ${runner.simulation.solver.time.toFixed(1)} s, saved ${option('out')}`);
