import { describe, expect, it } from 'vitest';
import { RIDER_PHASES, RIDER_SNAPSHOT, SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import { createPose } from './poseCodec';
import { OwnPoseTracker } from './ownPose';

function snapshot() {
  const board = Float64Array.of(4, 1.2, -95, 0, 0.6, 0, 0.8, 1);
  const rider = new Float64Array(RIDER_SNAPSHOT.length);
  for (let i = 0; i < 7; i += 1) {
    rider[i * 3] = 4 + i * 0.1;
    rider[i * 3 + 1] = 1.2 + 0.5;
    rider[i * 3 + 2] = -95 - 0.2;
  }
  rider[RIDER_SNAPSHOT.phase] = RIDER_PHASES.indexOf('standing');
  rider[RIDER_SNAPSHOT.present] = 1;
  rider[RIDER_SNAPSHOT.heading] = 1.25;
  return { board, rider };
}

describe('OwnPoseTracker', () => {
  it('describes the player\'s board and rider for the others', () => {
    const tracker = new OwnPoseTracker();
    const pose = tracker.write(snapshot(), () => 1.0, 600.004, true, createPose());
    expect(pose).toMatchObject({ step: Math.round(600.004 / SURF_ZONE_STEP), x: 4, z: -95, qy: 0.6, qw: 0.8, present: true, boardPresent: true, paddling: true, heading: 1.25 });
    expect(pose.phase).toBe(RIDER_PHASES.indexOf('standing'));
    expect(pose.lift).toBeCloseTo(0.2, 9);
    expect(pose.points[3]).toBeCloseTo(0.1, 6);
    expect(pose.points[4]).toBeCloseTo(0.5, 6);
    expect(pose.points[5]).toBeCloseTo(-0.2, 6);
  });

  it('marks a pose without a rider', () => {
    const { board } = snapshot();
    const pose = new OwnPoseTracker().write({ board, rider: new Float64Array(RIDER_SNAPSHOT.length) }, () => 1, 10, false, createPose());
    expect(pose).toMatchObject({ present: false, phase: -1, boardPresent: true });
  });

  it('sums the board\'s pushes over the snapshots between poses, then starts again', () => {
    const tracker = new OwnPoseTracker();
    tracker.accumulate(Float64Array.of(2, -90, 3, 4));
    tracker.accumulate(Float64Array.of(8, -90, 0, 0));
    tracker.accumulate(Float64Array.of(4, -80, 6, 8));
    let pose = tracker.write(snapshot(), () => 1, 10, false, createPose());
    // Weighted by |J|: 5 at (2, −90) and 10 at (4, −80).
    expect(pose.reaction.x).toBeCloseTo((5 * 2 + 10 * 4) / 15, 9);
    expect(pose.reaction.z).toBeCloseTo((5 * -90 + 10 * -80) / 15, 9);
    expect(pose.reaction.jx).toBeCloseTo(9, 9);
    expect(pose.reaction.jz).toBeCloseTo(12, 9);
    pose = tracker.write(snapshot(), () => 1, 10, false, createPose());
    expect(pose.reaction).toEqual({ x: 0, z: 0, jx: 0, jz: 0 });
  });
});
