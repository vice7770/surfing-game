// Scratch (not committed): the Reef's CI probes on the CPU in Node, measured by TierRecorder as the browser page does.
import { it } from 'vitest';
import { TierRecorder } from './dev/tierParity';
import { SurfZoneSimulation, type SurfZoneConfig } from './wave/SurfZoneSimulation';

const CI: SurfZoneConfig = {
  spot: 'reef', seed: 3, significantHeight: 3, peakPeriod: 17, directionDegrees: 20, spreading: 24, tide: 0,
  componentCount: 12, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
};
const cases: [string, Partial<SurfZoneConfig>][] = [
  ['ci-big', {}], ['ci-low', { tide: -0.6 }], ['ci-minus', { directionDegrees: -25, alongShore: 60 }],
  ['ci-plus', { directionDegrees: 25, alongShore: 60 }], ['ci-lagoon', { tide: -1, alongShore: 60 }], ['ci-edge', { directionDegrees: 25 }],
];
it('prints the CI probes in Node', () => {
  for (const [name, overrides] of cases) {
    const simulation = new SurfZoneSimulation({ ...CI, ...overrides });
    const recorder = new TierRecorder(simulation);
    for (let frame = 0; frame < 45 * 30; frame += 1) {
      simulation.step(1 / 30);
      recorder.record(1 / 30);
    }
    const { fastest, throws, brokenSteps, jetLandings, plungePeak } = recorder.activity;
    console.log(`NODE ${name}: fastest ${fastest.speed.toFixed(2)} m/s at x ${fastest.x}, z ${fastest.z}, t ${fastest.time.toFixed(2)} s, depth ${fastest.depth.toFixed(2)}; throws ${throws}, jet landings ${jetLandings}, plunge peak ${plungePeak}, broken ${brokenSteps}`);
  }
}, 3_600_000);
