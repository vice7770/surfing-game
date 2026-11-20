import type { WaveNumberFunction } from './dispersion';
import { SeaState } from './SeaState';

/**
 * The test wave (the owner's request of 2026-11-20: "create a single wave just for testing this wave scenario"): the
 * Canyon's version B Medium wave (`?canyonWaves=true`, Medium) as one regular train on calm water, so every wave is the
 * same wave and every run meets it at the same time and place. 'ride' starts the rider standing on its open face ahead of
 * the white water; 'catch' starts him lying at the take-off, paddling into it (`?testWave=ride|catch`).
 */
export type TestWaveMode = 'ride' | 'catch';

/**
 * The test wave's sea and spot, whatever the menu says: Canyon version B ('b'), the Medium swell's period and direction
 * (`SWELLS.medium`: Tp 11 s, 0°), one component, no tide or wind, a fixed seed (a regular train has no random phases;
 * the seed only names the sea). `height` is the regular wave's height at the Canyon's 5 m swell depth
 * (`CANYON_SWELL_DEPTH`), shoaled to the tank's edge as the Canyon's swells are (`edgeHeight`): chosen so the train breaks
 * where the Medium sea's waves break at the upcoast peak's tip and peels the same way (scripts/test-wave-report.ts).
 */
export const TEST_WAVE = {
  height: 0.8,
  significantHeight: 1.4,
  period: 11,
  directionDegrees: 0,
  spreading: 150,
  seed: 2,
  componentCount: 1,
} as const;

/**
 * The regular train at the tank's edge: one component of height `edgeHeight`, period `period`, from `direction` rad
 * (from +z toward +x), phase 0, as the Wave Pool's machine (`poolSea`), so it carries no seed.
 */
export function testWaveSea(edgeHeight: number, period: number, direction: number, depth: number, waveNumberAt: WaveNumberFunction): SeaState {
  return new SeaState([{ amplitude: edgeHeight / 2, omega: (2 * Math.PI) / period, direction, phase: 0 }], depth, waveNumberAt);
}

/**
 * Whether a sea's foam pushes the board and the rider: always, unless it is the test wave without `?testFoam=on`
 * (`SurfZoneConfig.testFoam`). The foam is drawn either way.
 */
export function foamFelt(config: { testWave?: TestWaveMode; testFoam?: 'on' }): boolean {
  return config.testWave === undefined || config.testFoam === 'on';
}
