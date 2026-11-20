/**
 * How much the spilling look carries at once (canyon-beach-look, 2026-10-28; wave only): every frame, the curl slices
 * written (`writeCurls`, at most CURL_CAPACITY), the spilling front's live waves, the roller's live lenses, and its
 * counts (lenses that found no slot, steps the table had no slot for), with the beach look on or off.
 *   rolldown docs/research/canyon-reef-sequence-2026-10-27/look-load.ts -o dist/scripts/look-load.mjs --format esm --platform node \
 *     && node dist/scripts/look-load.mjs --size medium --seed 1 --periods 6 [--beach-look off]
 */
import { SWELLS } from '../../../src/game/SurfConditions';
import { CURL_CAPACITY, CURL_STRIDE } from '../../../src/wave/SpillingCurl';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const size = (option('size') ?? 'medium') as keyof typeof SWELLS;
const swell = SWELLS[size];
const sim = new SurfZoneSimulation({
  spot: 'canyon', seed: Number(option('seed') ?? 1), significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0,
  spreading: swell.spreading ?? 150, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', ...(option('beach-look') === 'off' ? { canyonBeachLook: false } : {}),
} as unknown as SurfZoneConfig);
const internals = sim as unknown as { spilling: { waves: unknown[] }; roller?: { counts: Record<string, number>; table: Float32Array } };
const curls = new Float32Array(CURL_CAPACITY * CURL_STRIDE);
// Each onset the front hears, by group: did it start a wave, and how deep was it?
const front = sim as unknown as { spilling: { observeOnset(c: number, t: number, z: number, g?: number): void; waves: { group: number }[] } };
const heard = new Map<number, { joined: number; started: number; depths: number[] }>();
const observe = front.spilling.observeOnset.bind(front.spilling);
front.spilling.observeOnset = (c, t, z, g = 0) => {
  const before = front.spilling.waves.length;
  const count = front.spilling.waves.filter((w) => w.group === g).length;
  observe(c, t, z, g);
  const entry = heard.get(g) ?? { joined: 0, started: 0, depths: [] };
  const after = front.spilling.waves.filter((w) => w.group === g).length;
  if (after > count || front.spilling.waves.length > before) { entry.started += 1; const i = sim.solver.rowBelow(z) * sim.solver.nx + c; entry.depths.push(sim.solver.restLevel - sim.solver.bed[i]); } else entry.joined += 1;
  heard.set(g, entry);
};
const steps = Math.round((Number(option('periods') ?? 6) * swell.peakPeriod) * 30);
const slices: number[] = [];
const waves: number[] = [];
const cost = { breaking: 0, roller: 0, foam: 0, step: 0 };
for (let n = 0; n < steps; n += 1) {
  const t0 = performance.now();
  sim.step(1 / 30);
  cost.step += performance.now() - t0;
  cost.breaking += sim.stepCosts.breaking;
  cost.roller += sim.stepCosts.roller;
  cost.foam += sim.stepCosts.foam;
  slices.push(sim.writeCurls(curls));
  waves.push(internals.spilling.waves.length);
}
console.log(`CPU per 1/30 s frame, ms: whole step ${(cost.step / steps).toFixed(2)}; breaking + onsets + front ${(cost.breaking / steps).toFixed(2)}, roller + curl ${(cost.roller / steps).toFixed(2)}, foam ${(cost.foam / steps).toFixed(2)}`);
const q = (v: number[], p: number) => [...v].sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(p * v.length))];
console.log(`curl slices per frame: p50 ${q(slices, 0.5)}, p90 ${q(slices, 0.9)}, max ${Math.max(...slices)} of ${CURL_CAPACITY}; frames at capacity ${slices.filter((v) => v >= CURL_CAPACITY).length} of ${slices.length}`);
console.log(`front's live waves: p50 ${q(waves, 0.5)}, max ${Math.max(...waves)}; roller counts ${JSON.stringify(internals.roller?.counts)}`);
for (const [g, e] of [...heard.entries()].sort((a, b) => a[0] - b[0])) console.log(`group ${g}: onsets joined ${e.joined}, waves started ${e.started}; started at depth p10 ${q(e.depths, 0.1).toFixed(1)} p50 ${q(e.depths, 0.5).toFixed(1)} p90 ${q(e.depths, 0.9).toFixed(1)} m`);
