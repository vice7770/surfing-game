// The 2 m pool's Barrel sea from a cached state, `wave` unset: a hash of the solver's arrays, the foam and every step's
// snapshot surface, so two builds that print the same hash stepped and drew the same bytes.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../../src/game/SurfConditions';
import { libraryFromBytes } from '../../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../../src/wave/barrel/nodeBarrelCases';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState } from '../../../../src/wave/surfZoneState';
const [cache, stepsArg] = process.argv.slice(2);
(globalThis as unknown as { location: { search: string } }).location = { search: '?poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long' };
const settings = physicalSettingsFor('pool', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'cpu' });
const config = surfZoneConfigFor(settings as never, 1, false) as SurfZoneConfig;
const barrel = libraryFromBytes(readBarrelCases(config.spot, undefined, config.poolTubeCase), config.tubeShape, config.spot, config.heldRule);
const sim = new SurfZoneSimulation(config, 'warm', barrel);
sim.importState(decodeSurfZoneState(new Uint8Array(readFileSync(cache))));
const grid = sim.renderGrid(1);
const surface = new Float32Array(grid.nx * grid.nz * 2);
const flow = new Float32Array(grid.nx * grid.nz * 2);
const aeration = new Float32Array(grid.nx * grid.nz * 2);
const front = new Float32Array(4096 * 16);
const hash = createHash('sha256');
const steps = Number(stepsArg ?? 900);
for (let k = 0; k < steps; k += 1) {
  sim.step(1 / 60);
  sim.writeUniformSnapshot(surface, flow, aeration, grid);
  hash.update(new Uint8Array(surface.buffer));
  hash.update(new Uint8Array(aeration.buffer));
  const n = sim.writeTubeRecords(front);
  hash.update(new Uint8Array(front.buffer, 0, n * 16 * 4));
}
const state = sim.exportState();
for (const name of Object.keys(state.arrays).sort()) hash.update(new Uint8Array(state.arrays[name].buffer));
console.log(`pool ref Barrel, ${steps} steps from ${cache}: solver t ${sim.solver.time.toFixed(3)}, lip jets ${state.counters.lipJets}, hash ${hash.digest('hex').slice(0, 16)}, library key ${'library' in state}`);
