// The ledger's closure: on a free board (nothing held) the contributors' summed force plus the weight must equal the
// momentum change, and their summed moment the angular momentum change. One line per frame window ($OUT).
import { it } from 'vitest';
import { Vector3 } from 'three';
import { Flat, GROUPS, Lab, STEP, r, sum } from './plant';

it('closure', () => {
  const water = new Flat();
  for (const rider of ['point', 'human'] as const) {
    const lab = new Lab(water, rider);
    lab.place(7);
    lab.hold = { speed: 7, roll: 0, yawRate: 0, slip: 0 };
    for (let i = 0; i < 120; i += 1) lab.frame();
    // Free from here, with a small roll and yaw disturbance.
    lab.hold = {};
    lab.board.angularVelocity.add(new Vector3(0, 0.2, 0)).add(new Vector3(0, 0, 0.3).applyQuaternion(lab.board.orientation));
    const m = lab.board.mass;
    for (let i = 0; i < 30; i += 1) {
      const v0 = lab.board.velocity.clone();
      const I = [] as number[];
      lab.board.rotateTensor((lab.board as unknown as { bodyInertia: number[] }).bodyInertia, I);
      const L0 = new Vector3(I[0] * lab.board.angularVelocity.x + I[1] * lab.board.angularVelocity.y + I[2] * lab.board.angularVelocity.z, I[3] * lab.board.angularVelocity.x + I[4] * lab.board.angularVelocity.y + I[5] * lab.board.angularVelocity.z, I[6] * lab.board.angularVelocity.x + I[7] * lab.board.angularVelocity.y + I[8] * lab.board.angularVelocity.z);
      const book = lab.frame();
      const I1 = [] as number[];
      lab.board.rotateTensor((lab.board as unknown as { bodyInertia: number[] }).bodyInertia, I1);
      const w = lab.board.angularVelocity;
      const L1 = new Vector3(I1[0] * w.x + I1[1] * w.y + I1[2] * w.z, I1[3] * w.x + I1[4] * w.y + I1[5] * w.z, I1[6] * w.x + I1[7] * w.y + I1[8] * w.z);
      const F = sum(book.force, GROUPS.all).add(new Vector3(0, -m * 9.81, 0));
      const dP = lab.board.velocity.clone().sub(v0).multiplyScalar(m / STEP);
      const M = sum(book.moment, GROUPS.all);
      const dL = L1.clone().sub(L0).multiplyScalar(1 / STEP);
      if (i % 5 === 0) process.stdout.write(`${JSON.stringify({ rider, i, F: F.toArray().map((x) => r(x, 1)), dP: dP.toArray().map((x) => r(x, 1)), M: M.toArray().map((x) => r(x, 2)), dL: dL.toArray().map((x) => r(x, 2)) })}\n`);
    }
  }
});
