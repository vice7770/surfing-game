// The new surfer, step 3.2: one run frame by frame, the human balance's state. One line per frame ($OUT).
// CASE: flat (a plane of FACE°), chopN (seed N on it), riseR (a 20 cm rise at R m/s from RISE_AT s, on it), straight15;
// SPEED, m/s; KICK_AT s (a 0.5 rad/s roll kick); STEER, COMPRESS, CROUCH (STEER from STEER_AT s); SECONDS.
// TOW=1 / TOW=slow: the pulls tried and dropped for the steady start (README section 3), kept to reproduce it.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { Chop, OnFace, Rising, Slope, STEP, emit, place, r, state } from '../../board-in-water/lab';

const DEG = 180 / Math.PI;
it('trace', () => {
  const kind = process.env.CASE ?? 'straight15';
  const face = Number(process.env.FACE ?? 0);
  const water = kind === 'straight15' ? new Slope(15) : kind.startsWith('chop') ? new OnFace(face, new Chop(Number(kind.slice(4)) || 1))
    : kind.startsWith('rise') ? new OnFace(face, new Rising(Number(process.env.RISE_AT ?? 3), Number(kind.slice(4)) || 2, 0.2)) : new Slope(face);
  const kickAt = Number(process.env.KICK_AT ?? 1e9); let kicked = false;
  const speed = Number(process.env.SPEED ?? 6);
  const rig = place(water, 0, 0, speed, 'standing');
  const q = rig.rider! as any;
  const steerAt = Number(process.env.STEER_AT ?? 1e9);
  let integral = 0;
  for (let i = 0; i < Math.round(Number(process.env.SECONDS ?? 1.5) / STEP); i += 1) {
    const t = (i + 1) * STEP;
    if (t >= steerAt) { q.steer = Number(process.env.STEER ?? 0); }
    q.compress = Number(process.env.COMPRESS ?? 0); q.crouch = Number(process.env.CROUCH ?? 0);
    if (t >= kickAt && !kicked) { kicked = true; rig.board.angularVelocity.addScaledVector(new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation), 0.5); }
    (water as any).advance?.(STEP);
    rig.board.step(STEP, water);
    if (process.env.TOW === '1') { const f = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation).setY(0).normalize(); const d = speed - rig.board.velocity.dot(f); rig.board.velocity.addScaledVector(f, d); if (q.attached) q.velocity.addScaledVector(f, d); }
    if (process.env.TOW === 'slow') {
      // A slow governor: a uniform pull (as a gentle slope's) set by the speed's error, P 1/s and I 1/s², so only the slow common motion is held.
      const f = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation).setY(0).normalize();
      const e = speed - rig.board.velocity.dot(f); integral += e * STEP;
      const a = 1.5 * e + 0.8 * integral;
      rig.board.velocity.addScaledVector(f, a * STEP); if (q.attached) q.velocity.addScaledVector(f, a * STEP);
    }
    const s = state(rig, water, t);
    const c = q.human?.state ?? {};
    emit({ t: r(t, 3), v: r(s.speed, 2), pitch: r(s.pitch, 1), roll: r(s.roll, 1), bank: r(q.bank.angle * DEG, 1), ref: r(q.bankReference * DEG, 1), rest: r(q.ankleRest * DEG, 1), aT: r(q.ankleTorque, 0), ankle: r(q.standingBody.pitch.angle * DEG, 1), hipP: r(q.standingBody.hip.angle * DEG, 1), swing: r(q.swing.angle * DEG, 1), sT: r(q.swingTorque, 0), rr: r(rig.board.angularVelocity.dot(new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation)), 2),
      capX: r(c.across, 3), px: r(c.pointAcross, 3), vx: r(c.speedAcross, 3), tilt: r((c.tiltAcross ?? 0) * DEG, 1), yaw: r(rig.board.angularVelocity.y, 2), capZ: r(c.along, 3), past: r(c.past, 3), reach: r(c.reach, 3), wp: c.weightPast, h: r(c.height, 2), knees: r(q.human?.knees ?? 0, 2), cause: q.human?.kneeCause, arms: r(q.human?.arms ?? 0, 2),
      legRest: r(q.leg.rest, 3), load: r(s.load, 2), copX: r(q.contact.centreOfPressure.x, 3), copZ: r(q.contact.centreOfPressure.z, 3), lim: q.limit, reserve: r(q.balanceReserve, 2), fell: s.fell ?? '' });
    if (s.fell) break;
  }
});
