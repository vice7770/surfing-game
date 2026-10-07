import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { PlaneWater } from '../../physics/PlaneWater';
import { CoveredWater } from '../../physics/testing/CoveredWater';
import { RideSession, type RideInput } from '../../physics/RideSession';
import { readGlbSkeleton } from './glbSkeleton';
import { BONES } from './humanoidBones';
import { PosedBody } from './posedBody';
import { RiderMotion } from './riderMotion';
import { POINT, createRiderVisualState } from './riderVisualState';

const STEP = 1 / 60;
const idle: RideInput = { paddle: false, popUp: false, steer: 0 };
const surfers: { id: string }[] = JSON.parse(readFileSync('public/assets/surfers/surfers.json', 'utf8')).surfers;

/** Ordinary physics and the game's posing/smoothing layers, with no forced body pose. */
function ridePose(id: string, input: RideInput) {
  const bytes = readFileSync(`public/assets/surfers/${id}.glb`);
  const { root, bones } = readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const body = new PosedBody(bones);
  const motion = new RiderMotion();
  const state = createRiderVisualState();
  const session = new RideSession();
  // Under a tube's curl: the deep tuck is for tube clearance only (the owner's decision of 2026-10-06).
  const water = new CoveredWater(new PlaneWater());
  session.place({ x: 0, z: 0, heading: 0, speed: 8, phase: 'standing' }, water);
  const samples: {
    publishedPelvis: number; publishedHead: number; drawnHips: number; drawnNeck: number; drawnHead: number;
    footError: number; phase: string; attached: boolean; rest: number;
  }[] = [];
  for (let tick = 0; tick < 120; tick += 1) {
    session.step(STEP, water, tick < 60 ? idle : input);
    state.points.forEach((point, index) => session.renderPoint(index, point));
    state.phase = session.phase;
    state.heading = session.heading;
    state.boardPosition.copy(session.board.position);
    state.boardQuaternion.copy(session.board.orientation);
    state.twist = session.rider.twist.angle;
    state.clock = (tick + 1) * STEP;
    motion.update(state, state.clock);
    // PosedBody mutates its points; keep the actual physics publication first.
    const feet = (state.points[POINT.leftFoot].y + state.points[POINT.rightFoot].y) / 2;
    const publishedPelvis = state.points[POINT.pelvis].y - feet;
    const publishedHead = state.points[POINT.head].y - feet;
    body.update(state);
    root.updateMatrixWorld(true);
    const joint = (name: string) => bones.get(name)!.getWorldPosition(new Vector3());
    samples.push({
      publishedPelvis, publishedHead,
      drawnHips: joint(BONES.hips).y - feet,
      drawnNeck: joint(BONES.neck).y - feet,
      drawnHead: joint(BONES.head).y - feet,
      footError: Math.max(...(['left', 'right'] as const).map((side) => joint(BONES.foot[side]).distanceTo(body.rig.joints.ankle[side]))),
      phase: session.phase, attached: session.rider.attached, rest: session.rider.leg.rest,
    });
  }
  return { after: samples[119], samples };
}

describe('the loaded surfer skeletons in the deeper manual tube tuck', () => {
  it.each(surfers.map(({ id }) => id))('%s lowers the drawn hips and head beyond Compress while keeping its feet', (id) => {
    const standing = ridePose(id, idle);
    const compressed = ridePose(id, { ...idle, compress: 1 });
    const tucked = ridePose(id, { ...idle, crouch: 1, compress: 0 });
    for (const run of [standing, compressed, tucked]) {
      expect(run.samples.every((sample) => sample.attached && sample.phase === 'standing')).toBe(true);
      expect(Math.max(...run.samples.map((sample) => sample.footError))).toBeLessThan(0.01);
    }
    expect(compressed.after.publishedHead).toBeLessThan(standing.after.publishedHead - 0.25);
    expect(tucked.after.publishedPelvis).toBeLessThan(compressed.after.publishedPelvis - 0.1);
    expect(tucked.after.publishedHead).toBeLessThan(compressed.after.publishedHead - 0.1);
    expect(tucked.after.drawnHips).toBeLessThan(compressed.after.drawnHips - 0.1);
    // The head is a rig joint, not the physics sphere centre. A deeper knee bend
    // also straightens the trunk, so the extra head lowering is smaller than
    // the pelvis's: at least 4 cm on all four committed skeletons.
    expect(tucked.after.drawnHead).toBeLessThan(compressed.after.drawnHead - 0.04);
  });
});
