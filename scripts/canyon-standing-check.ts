/** Exercise the live Canyon standing debug start. Each input gets the same restored sea and its own worker runner. */
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { deckHeight } from '../src/physics/riderPosture';
import { replayCanyonApproach, type CanyonApproach } from '../src/wave/canyonStandingApproach';
import { SurfZoneRunner, SURF_ZONE_STEP } from '../src/wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState, decompress } from '../src/wave/surfZoneState';

const folder = 'public/debug/canyon';
const start: CanyonApproach & { config: SurfZoneConfig; approachSolverTime: number } = JSON.parse(readFileSync(`${folder}/standing.json`, 'utf8'));
const sea = decodeSurfZoneState(await decompress(readFileSync(`${folder}/approach.sea`), true));
const seconds = Number(process.argv[2] ?? 3);
const filter = process.argv[3];
if (!Number.isFinite(seconds) || seconds < 1.7) throw new Error('Allow at least 1.7 simulated seconds for release and re-extension.');
if (start.approachPlacement.phase !== 'prone' || start.config.stage !== 2 || start.config.turnBalance !== 'planing') throw new Error('Expected the Canyon standing turn-balance checkpoint.');

const degrees = 180 / Math.PI;
const steerAt = 18;
const releaseAt = 72;
const cutoff = Math.round(seconds / SURF_ZONE_STEP);
const idle = { paddle: false, popUp: false, retry: false, steer: 0 };
const inputs = [
  { name: 'neutral', steer: 0, compress: 0 }, { name: 'left', steer: 1, compress: 0 },
  { name: 'right', steer: -1, compress: 0 }, { name: 'compress', steer: 0, compress: 1 },
  { name: 'left+compress', steer: 1, compress: 1 }, { name: 'right+compress', steer: -1, compress: 1 },
];
if (filter && !inputs.some(input => input.name === filter)) throw new Error('Unknown input ' + filter);
const local = new Vector3();

for (const input of inputs.filter(input => !filter || input.name === filter)) {
  for (const arm of ['control', 'candidate'] as const) {
    const config: SurfZoneConfig = { ...start.config, spinUpPeriods: 0, compute: 'cpu' };
    if (arm === 'control') delete config.turnBalance;
    const runner = SurfZoneRunner.forWorker(config, { rider: true });
    runner.simulation.importState(sea);
    if (Math.abs(runner.simulation.solver.time - start.approachSolverTime) > 1e-6) throw new Error('Approach and sea clocks do not match.');
    replayCanyonApproach(runner, start);
    const session = runner.session!;
    const { rider, board } = session;
    if (session.phase !== 'standing') throw new Error('The first player frame is not standing.');
    const startSolverTime = runner.simulation.solver.time;
    let course = Math.atan2(board.velocity.x, board.velocity.z);
    let courseChange = 0;
    let peakCourse = 0;
    let peakBank = 0;
    let beforePulse = 0;
    let pulseMin = Infinity;
    let releaseHeight: number | null = null;
    let extendedHeight: number | null = null;
    let releaseCourse: number | null = null;
    let minFaceAfter = Infinity;
    let maxClimb = 0;
    let speed = rider.leanProbe.speedThrough;
    let tick = 0;
    for (tick = 1; tick <= cutoff; tick++) {
      // tick is the one-based observation after the step, the button is read at its start.
      const pulse = tick - 1 >= steerAt && tick - 1 < releaseAt;
      runner.advance(1, { ...idle, steer: pulse ? input.steer : 0, compress: pulse ? input.compress : 0 });
      if (session.phase !== 'standing') break;
      const next = Math.atan2(board.velocity.x, board.velocity.z);
      courseChange += degrees * Math.atan2(Math.sin(next - course), Math.cos(next - course));
      course = next;
      if (Math.abs(courseChange) > Math.abs(peakCourse)) peakCourse = courseChange;
      const bank = rider.bank.angle * degrees;
      if (Math.abs(bank) > Math.abs(peakBank)) peakBank = bank;
      board.toLocal(rider.position, local);
      const height = local.y - deckHeight(board.shape, local.z);
      if (tick === steerAt) beforePulse = height;
      if (pulse) pulseMin = Math.min(pulseMin, height);
      if (tick === releaseAt) { releaseHeight = height; releaseCourse = courseChange; }
      if (tick === releaseAt + 30) extendedHeight = height;
      if (tick > releaseAt && runner.waveFrame?.valid) {
        const face = runner.waveFrame.faceHeight * runner.waveFrame.faceFraction;
        minFaceAfter = Math.min(minFaceAfter, face);
        maxClimb = Math.max(maxClimb, face - minFaceAfter);
      }
      speed = rider.leanProbe.speedThrough;
    }
    console.log(JSON.stringify({ arm, input: input.name, startSolverTime,
      outcome: session.phase === 'standing' ? 'standing at cutoff' : session.separation ?? session.phase,
      standingSeconds: Math.min(tick, cutoff) * SURF_ZONE_STEP, pulseStartSeconds: steerAt * SURF_ZONE_STEP,
      releaseSeconds: releaseAt * SURF_ZONE_STEP, peakCourseChangeDeg: peakCourse, courseAtReleaseDeg: releaseCourse,
      peakBodyBankDeg: peakBank, dropDuringPulseM: Number.isFinite(pulseMin) ? beforePulse - pulseMin : null,
      riseHalfSecondAfterReleaseM: releaseHeight !== null && extendedHeight !== null ? extendedHeight - releaseHeight : null,
      finalThroughWaterMps: speed, postReleaseClimbM: Number.isFinite(minFaceAfter) ? maxClimb : null,
    }));
  }
}
