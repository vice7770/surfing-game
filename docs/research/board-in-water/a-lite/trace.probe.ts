// A-lite trace (2026-11-12): the steep-face leak substep by substep. Standing at 6 m/s, placed on a 35° face, straight
// down (heading 0) and straight up (180), and 25° down as the control. Each substep: whether the contact was met, which
// limit bound it, the impulse the coupled solve asked for against the one the feet gave (board frame: normal, along the
// deck), the contact's net power on the pair, the board's acceleration, the leg's rate and the drive.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { Slope, emit, place, r, STEP } from '../lab';

it('a-lite: the leak, substep by substep', () => {
  for (const [angle, heading] of [[25, 0], [35, 0], [35, 180]]) {
    const face = new Slope(angle);
    const rig = place(face, 0, heading, 6, 'standing');
    const rider = rig.rider! as unknown as Record<string, unknown> & {
      impulse: Vector3; projected: Vector3; feasible: boolean; limit: string; leg: { rate: number; extension: number }; drive: Vector3; up: Vector3;
      velocity: Vector3; mass: number; finish: (h: number, b: unknown) => void; work: { contact: number }; attached: boolean;
    };
    const board = rig.board;
    const original = rider.finish.bind(rider);
    let sub = 0;
    let frame = 0;
    rider.finish = (h: number, b: unknown) => {
      const needed = rider.impulse.clone();
      const given = rider.projected.clone();
      const feasible = rider.feasible;
      const limit = rider.limit;
      const wBefore = board.work.rider + rider.work.contact;
      const vBefore = (board as unknown as { lastV?: Vector3 }).lastV ?? board.velocity.clone();
      original(h, b);
      const wAfter = board.work.rider + rider.work.contact;
      const inv = board.orientation.clone().invert();
      const n = needed.clone().applyQuaternion(inv);
      const g = given.clone().applyQuaternion(inv);
      const scale = 1 / (h * rider.mass * 9.81);
      const accel = board.velocity.distanceTo(vBefore) / h / 9.81;
      (board as unknown as { lastV?: Vector3 }).lastV = board.velocity.clone();
      if (frame < 4 || sub % 8 === 0) {
        emit({ legLoad: r(((rider as unknown as { legLoad: number }).legLoad) / (rider.mass * 9.81), 2), legForce: r(((rider.leg as unknown as { force: number }).force) / (rider.mass * 9.81), 2), angle, heading, frame, sub, feasible, limit, neededN: r(n.y * scale, 2), neededT: r(Math.hypot(n.x, n.z) * scale, 2), givenN: r(g.y * scale, 2), givenT: r(Math.hypot(g.x, g.z) * scale, 2), powerW: r((wAfter - wBefore) / h, 0), boardG: r(accel, 1), legRate: r(rider.leg.rate, 2), legExt: r(rider.leg.extension, 3), drive: r(rider.drive.length(), 2), spin: r(board.angularVelocity.length(), 2), v: r(board.velocity.length(), 2) });
      }
      sub += 1;
    };
    for (frame = 0; frame < 12; frame += 1) {
      rig.board.step(STEP, face);
      if (!rider.attached) { emit({ angle, heading, fellAt: r((frame + 1) * STEP, 3), cause: (rig.rider as unknown as { separation: string }).separation }); break; }
    }
  }
});
