import { describe, expect, it } from 'vitest';
import { POSE_BYTES, createPose, decodePose, encodeBundle, encodePose, readBundle } from './poseCodec';

function samplePose() {
  const pose = createPose();
  Object.assign(pose, {
    step: 123456, x: -42.37, z: -101.25, lift: -0.043, qx: 0.1, qy: 0.7, qz: -0.1, qw: 0.7,
    phase: 3, present: true, boardPresent: true, paddling: false, heading: -2.5,
  });
  for (let i = 0; i < 21; i += 1) pose.points[i] = Math.sin(i) * 1.2;
  pose.reaction = { x: -41.9, z: -100.8, jx: 12.5, jz: -3.25 };
  return pose;
}

function roundTrip(pose = samplePose()) {
  const bytes = new Uint8Array(POSE_BYTES);
  encodePose(pose, new DataView(bytes.buffer), 0);
  return decodePose(new DataView(bytes.buffer), 0, createPose());
}

describe('pose codec', () => {
  it('round-trips a pose within its quantisation', () => {
    const back = roundTrip();
    const pose = samplePose();
    const norm = Math.hypot(pose.qx, pose.qy, pose.qz, pose.qw);
    expect(back.step).toBe(pose.step);
    expect(back.x).toBeCloseTo(pose.x, 2);
    expect(back.z).toBeCloseTo(pose.z, 2);
    expect(back.lift).toBeCloseTo(pose.lift, 3);
    expect(back.qy).toBeCloseTo(pose.qy / norm, 4);
    expect(back.qw).toBeCloseTo(pose.qw / norm, 4);
    for (let i = 0; i < 21; i += 1) expect(Math.abs(back.points[i] - pose.points[i])).toBeLessThanOrEqual(0.005 + 1e-9);
    expect(back).toMatchObject({ phase: 3, present: true, boardPresent: true, paddling: false });
    expect(back.heading).toBeCloseTo(-2.5, 3);
    expect(back.reaction.x).toBeCloseTo(-41.9, 2);
    expect(back.reaction.jx).toBeCloseTo(12.5, 4);
    expect(back.reaction.jz).toBeCloseTo(-3.25, 4);
  });

  it('clamps values beyond the range instead of wrapping', () => {
    const pose = samplePose();
    pose.x = 1e6;
    pose.lift = -1e6;
    const back = roundTrip(pose);
    expect(back.x).toBeCloseTo(327.67, 2);
    expect(back.lift).toBeCloseTo(-32.768, 3);
  });

  it('marks a pose without a rider, and one paddling', () => {
    const pose = samplePose();
    pose.phase = -1;
    pose.present = false;
    pose.paddling = true;
    expect(roundTrip(pose)).toMatchObject({ phase: -1, present: false, paddling: true });
  });

  it('bundles poses by player id', () => {
    const a = new Uint8Array(POSE_BYTES).fill(1);
    const b = new Uint8Array(POSE_BYTES).fill(2);
    const bundle = encodeBundle([{ id: 7, pose: a }, { id: 300, pose: b }]);
    const seen: [number, number][] = [];
    const count = readBundle(bundle.buffer as ArrayBuffer, (id, view, offset) => seen.push([id, view.getUint8(offset)]));
    expect(count).toBe(2);
    expect(seen).toEqual([[7, 1], [300, 2]]);
  });

  it('reads nothing from a malformed bundle', () => {
    const visit = () => {
      throw new Error('visited');
    };
    expect(readBundle(new Uint8Array([9, 0, 1, 0]).buffer, visit)).toBe(0);
    expect(readBundle(new Uint8Array([1, 0, 5, 0, 1, 2]).buffer, visit)).toBe(0);
    expect(readBundle(new ArrayBuffer(2), visit)).toBe(0);
  });
});

describe('pose flags (the wipeout spec)', () => {
  it('carries a snapped leash, a duck-dive and a dive, and ignores flags it does not know', () => {
    const pose = createPose();
    Object.assign(pose, { present: true, boardPresent: true, leashSnapped: true, ducking: true, diving: false });
    const view = new DataView(new ArrayBuffer(POSE_BYTES));
    encodePose(pose, view, 0);
    const back = decodePose(view, 0, createPose());
    expect(back).toMatchObject({ leashSnapped: true, ducking: true, diving: false, present: true, boardPresent: true });
    view.setUint8(61, view.getUint8(61) | 64);
    expect(decodePose(view, 0, createPose())).toMatchObject({ leashSnapped: true, ducking: true, present: true });
  });
});
