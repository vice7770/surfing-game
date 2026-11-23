import type { RiderPlacement } from '../physics/RideSession';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { TEST_WAVE, type TestWaveMode } from '../wave/testWave';

/**
 * The test wave's sea for a Surf session (`?testWave=ride|catch`, the owner's request of 2026-11-20), whatever the menu
 * says: the Canyon's version B (`?canyonWaves=true`) with the Medium swell's period and direction, as one regular train of
 * `TEST_WAVE.height` waves (`SurfZoneConfig.testWave`), one component, no tide or wind, spun up so the sea stands at the
 * mode's start (`TEST_WAVE_STARTS`) when the session opens. `testFoam` 'on' lets the foam push again.
 */
export function testWaveOverrides(mode: TestWaveMode, testFoam?: 'on'): Partial<SurfZoneConfig> {
  const start = TEST_WAVE_STARTS[mode];
  return {
    spot: 'canyon', canyonBed: 'b', testWave: mode, testFoam,
    significantHeight: TEST_WAVE.height, peakPeriod: TEST_WAVE.period, directionDegrees: TEST_WAVE.directionDegrees,
    spreading: TEST_WAVE.spreading, bandwidth: undefined, heightAt: undefined, componentCount: TEST_WAVE.componentCount,
    tide: 0, windSpeed: 0, startSeaTime: start.seaTime, spinUpPeriods: TEST_WAVE_SPIN_UP_PERIODS, lead: undefined,
  };
}

/** Periods the test wave's sea spins up before its start: enough for the train's breaking to repeat wave after wave. */
export const TEST_WAVE_SPIN_UP_PERIODS = 5;

/**
 * Each mode's start: the sea time the session opens at (the train's phase), where the rider is put then, and how long the
 * wave lasts from there, s (its white has run the arm into the bowl). Measured on the in-page solver
 * (scripts/test-wave-probe.ts).
 * - 'ride': standing, his body plumb (`posture` 'plumb'), on the open face at mid-height, about 10 m along the arm (+x)
 *   ahead of the white, moving with the
 *   wave as it peels: along the arm at the white's speed and shoreward with the face, the board flat on it, its nose
 *   along its motion through the water (no slip).
 * - 'catch': lying at the take-off, nose to the beach, paddling speed, before the wave reaches the peak: paddled on, the
 *   wave picks the board up.
 * Both are `fresh`: each start and restart places a never-ridden rider, so no run inherits the last one's state.
 */
export const TEST_WAVE_STARTS: Record<TestWaveMode, { seaTime: number; placement: RiderPlacement; life: number }> = {
  ride: { seaTime: 62.5, placement: { x: -93.5, z: -94.65, heading: (54 * Math.PI) / 180, speed: 7.7, phase: 'standing', followSurface: true, posture: 'plumb', fresh: true }, life: 8 },
  catch: { seaTime: 58, placement: { x: -108, z: -109, heading: 0, speed: 1.7, phase: 'prone', followSurface: true, fresh: true }, life: 12.5 },
};

/** After a fall or the wave's end, the same wave starts again this many seconds later (sea time). */
export const TEST_WAVE_RESTART_DELAY = 2;

/** What a test wave run reads each frame from the host's status. */
export interface TestWaveStatus {
  seaTime: number;
  ride?: { phase: string };
}

/**
 * One test wave session's restarts: the sea recorded at the start (`exportState`, on the game's own compute path), and the
 * clock that starts the same wave again `TEST_WAVE_RESTART_DELAY` s after a fall or the wave's end (`frame`). R restarts it
 * at once (the page's `quickRetry`).
 */
export class TestWaveRun {
  readonly placement: RiderPlacement;
  readonly life: number;
  /** The sea time the run (re)started at, and when its fall or its wave's end was seen. */
  private startedAt: number;
  private endedAt?: number;
  /** After a restart, until the host's status shows the restored sea (a worker answers a frame or two later). */
  private settling = false;
  restarts = 0;

  constructor(readonly mode: TestWaveMode, readonly sea: Uint8Array, startSeaTime: number) {
    this.placement = TEST_WAVE_STARTS[mode].placement;
    this.life = TEST_WAVE_STARTS[mode].life;
    this.startedAt = startSeaTime;
  }

  /** True when the wave should start again now. */
  frame(status: TestWaveStatus): boolean {
    const { seaTime } = status;
    if (this.settling) {
      if (Math.abs(seaTime - this.startedAt) > 0.5) return false;
      this.settling = false;
    }
    if (this.endedAt === undefined && (status.ride?.phase === 'fallen' || seaTime - this.startedAt >= this.life)) this.endedAt = seaTime;
    return this.endedAt !== undefined && seaTime - this.endedAt >= TEST_WAVE_RESTART_DELAY;
  }

  /** The host has been given the recorded sea again and the rider placed: the clock starts over. */
  restarted(): void {
    this.endedAt = undefined;
    this.settling = true;
    this.restarts += 1;
  }

  /** A copy of the recorded sea for a restore (a worker takes the bytes). */
  seaCopy(): Uint8Array {
    return this.sea.slice();
  }
}
