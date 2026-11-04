// Probe helpers for the Snap stance (not committed). Copied into src/physics as zz-snapLab.ts when used.
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import { createWaterSample, type SurfWater } from './SurfWater';
const SAMPLE = createWaterSample();

export const STEP = 1 / 60;
export const SLOPE = (15 * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;

export function acrossFace(acrossDegrees: number, speed: number, stance: 'regular' | 'goofy' = 'regular', flow = 0, slopeDegrees = 15) {
  const SLOPE = (slopeDegrees * Math.PI) / 180;
  const yaw = (acrossDegrees * Math.PI) / 180;
  const normal = new Vector3(0, 1, Math.tan(SLOPE)).normalize();
  const fall = new Vector3(0, -Math.sin(SLOPE), Math.cos(SLOPE));
  const side = new Vector3().crossVectors(normal, fall).normalize();
  const forward = fall.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(side, -Math.sin(yaw)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward));
  const up = fall.clone().multiplyScalar(-flow);
  const board = new BoardBody();
  board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), orientation, forward.clone().multiplyScalar(speed).add(up));
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance });
  board.attach(rider);
  return { board, rider, water: new PlaneWater({ slopeZ: -Math.tan(SLOPE), flow: { x: up.x, y: up.y, z: up.z } }) as SurfWater, normal };
}

export function flat(speed: number, stance: 'regular' | 'goofy' = 'regular') {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance });
  board.attach(rider);
  return { board, rider, water: new PlaneWater() as SurfWater, normal: new Vector3(0, 1, 0) };
}

export const headingOf = (board: BoardBody) => {
  const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  return Math.atan2(f.x, f.z);
};

export interface Frame { t: number; turned: number; rate: number; speed: number; pitch: number; drift: number; front: number; weight: number; rail: number; bank: number; fin: number; finWet: number; attached: boolean; legRest: number; twist: number; load: number }

/** Run `seconds`, sampling each frame; `each` may set inputs before each step (t from 0). */
export function trace(setup: ReturnType<typeof acrossFace>, seconds: number, each: (t: number, rider: AttachedRider, board: BoardBody) => void): Frame[] {
  const { board, rider, water, normal } = setup;
  const frames: Frame[] = [];
  let last = headingOf(board);
  let turned = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    const t = i * STEP;
    each(t, rider, board);
    board.step(STEP, water);
    const now = headingOf(board);
    const d = Math.atan2(Math.sin(now - last), Math.cos(now - last));
    turned += d;
    last = now;
    const fwd = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    const vel = board.velocity.clone();
    const speed = vel.length();
    // drift: angle between heading and velocity, both projected into the water plane
    const fp = fwd.clone().addScaledVector(normal, -fwd.dot(normal)).normalize();
    const vp = vel.clone().addScaledVector(normal, -vel.dot(normal));
    const drift = vp.lengthSq() > 1e-6 ? Math.atan2(fp.clone().cross(vp.clone().normalize()).dot(normal), fp.dot(vp.clone().normalize())) : 0;
    const pitch = Math.asin(Math.max(-1, Math.min(1, fwd.dot(normal))));
    const left = new Vector3(1, 0, 0).applyQuaternion(board.orientation);
    const rail = -Math.asin(Math.max(-1, Math.min(1, left.dot(normal))));
    // centre fin: 0.09 m from the tail, board frame velocity across
    const local = new Vector3(0, 0, -board.shape.length / 2 + 0.09).sub(board.shape.centerOfMass as unknown as Vector3);
    const r = local.clone().applyQuaternion(board.orientation);
    const v = board.velocity.clone().add(new Vector3().crossVectors(board.angularVelocity, r));
    const vb = v.applyQuaternion(board.orientation.clone().invert());
    const fin = Math.atan2(vb.x, vb.z);
    const finWorld = r.clone().add(board.centerOfMass);
    const surface = water.sampleAt(finWorld.x, finWorld.y, finWorld.z, SAMPLE);
    frames.push({
      t: t + STEP, turned: deg(turned), rate: d / STEP, speed, pitch: deg(pitch), drift: deg(drift), front: rider.contact.frontShare, weight: rider.contact.weight,
      rail: deg(rail), bank: deg(rider.bank.angle), fin: deg(fin), finWet: surface ? surface.surfaceY - finWorld.y : NaN, attached: rider.attached,
      legRest: rider.leg.rest, twist: deg(rider.twist.angle), load: rider.contact.load,
    });
    if (!rider.attached) break;
  }
  return frames;
}

export function summary(frames: Frame[]) {
  const on = frames.filter((f) => f.attached);
  const peak = Math.max(...on.map((f) => Math.abs(f.rate)));
  const at = (time: number) => frames.find((f) => f.t >= time - 1e-9) ?? frames[frames.length - 1];
  const t150 = frames.find((f) => Math.abs(f.turned) >= 150);
  const fell = frames.find((f) => !f.attached);
  return {
    peakDegS: Math.round(deg(peak)), at05: Math.round(at(0.5).turned), at1: Math.round(at(1).turned), end: Math.round(frames[frames.length - 1].turned),
    t150: t150 ? +t150.t.toFixed(2) : null, speed0: +frames[0].speed.toFixed(2), speed1: +at(1).speed.toFixed(2), speedEnd: +frames[frames.length - 1].speed.toFixed(2),
    minSpeed: +Math.min(...on.map((f) => f.speed)).toFixed(2), maxPitch: Math.round(Math.max(...on.map((f) => f.pitch))), maxDrift: Math.round(Math.max(...on.map((f) => Math.abs(f.drift)))),
    maxFin: Math.round(Math.max(...on.map((f) => Math.abs(f.fin)))), meanFront: +(on.reduce((a, f) => a + f.front, 0) / on.length).toFixed(2),
    fell: fell ? +fell.t.toFixed(2) : null,
  };
}
