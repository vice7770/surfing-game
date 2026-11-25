import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

/**
 * **Step 3.6c: the closed yaw ledger (`BoardBody.yawLedgerClosed`)** — `docs/research/stability/wobble/README.md` M1.
 *
 * The shipped yaw ledger books `waterTy` beside the settle loop's own water entries, which already carry its explicit
 * half, so a bare board shows a "rider" torque (Codex, consult log `27b026f5`: +38.43 N·m on one −20° step). Closed,
 * the residual of a board with no rider must be nothing, the shipped residual must be recoverable from the closed one
 * (`rider − duplicate + suction`), and the board's own motion must not move by a bit.
 */
describe('the closed yaw ledger (step 3.6c)', () => {
  const run = (deg: number, closed: boolean, steps = 1, ledger = true) => {
    const board = new BoardBody({ substeps: 4 });
    BoardBody.yawLedger = ledger;
    BoardBody.yawLedgerClosed = closed;
    try {
      const water = new PlaneWater({ slopeX: 0.2, slopeZ: -0.08 });
      board.place(
        new Vector3(0, board.shape.centerOfMass.y, 0),
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (deg * Math.PI) / 180),
        new Vector3(0.4, 0, 6),
        new Vector3(0, 0, 0),
      );
      const ledgers: { rider: number; duplicate: number; suction: number; total: number }[] = [];
      for (let k = 0; k < steps; k += 1) {
        board.step(1 / 60, water);
        ledgers.push({ rider: board.yaw.rider, duplicate: board.yaw.duplicate, suction: board.yaw.suction, total: board.yaw.total });
      }
      return { board, ledgers };
    } finally {
      BoardBody.yawLedger = false;
      BoardBody.yawLedgerClosed = false;
    }
  };

  it('closes on a bare board, and the shipped residual is the closed one less the duplicate', () => {
    for (const deg of [-20, -10, 0, 10, 20]) {
      const shipped = run(deg, false, 30);
      const closed = run(deg, true, 30);
      for (let k = 0; k < 30; k += 1) {
        expect(Math.abs(closed.ledgers[k].rider)).toBeLessThan(1e-9);
        const back = closed.ledgers[k].rider - closed.ledgers[k].duplicate + closed.ledgers[k].suction;
        expect(back).toBeCloseTo(shipped.ledgers[k].rider, 9);
      }
    }
    // Codex's case: the first −20° step books +38.43 N·m of rider torque with no rider.
    expect(run(-20, false).ledgers[0].rider).toBeCloseTo(38.43, 2);
  });

  it('moves nothing: the board after 30 steps is bit for bit the same with the ledger off, shipped and closed', () => {
    const off = run(-20, false, 30, false).board;
    const shipped = run(-20, false, 30).board;
    const closed = run(-20, true, 30).board;
    for (const b of [shipped, closed]) {
      expect(b.velocity.toArray()).toEqual(off.velocity.toArray());
      expect(b.angularVelocity.toArray()).toEqual(off.angularVelocity.toArray());
      expect(b.orientation.toArray()).toEqual(off.orientation.toArray());
    }
  });
});
