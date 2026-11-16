import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

/**
 * **Step 3.3h: the roll ledger (`BoardBody.roll`, `BoardBody.rollLedger`) and its positive control.**
 *
 * Step 3.3g measured the deck at **63.7–91.4° of roll at the fall in 12 of 12 full-stick runs** against a largest
 * commandable lean of 40.8–50.0°, and closed by saying it had measured the in-plane **force** and not the roll
 * **moment**, which are not the same thing. The ledger is that instrument, and these tests are what makes a number
 * off it worth printing.
 *
 * **The datum**, restated here because every angle and every moment on this track must carry one: a mean torque over
 * the step about the board's own long axis — board frame +z in the world — positive in the right-hand sense, which
 * **lifts the +x rail**.
 *
 * **The positive control** is a case where a roll moment is known to exist and its sign is known in advance: a bare
 * board heeled in still water has a **righting** moment, because the submerged volume shifts to the buried side and
 * the hydrostatic support goes up through it. Heel the board so its **+x rail is buried** and the prediction is a
 * **positive** net moment (lifting that rail) and a roll rate that turns positive. Written before it was run; both
 * held. The control is not the sum identity, which is true by construction — `rider` is defined as the residual — but
 * (a) the sign against a physical prediction, (b) the sign against the board's own measured roll **rate**, and
 * (c) that the residual closes to zero when there is no rider for it to belong to, which is what proves the water
 * entries are not quietly leaving a share of the moment in the residual column.
 */
describe('the roll ledger (step 3.3h)', () => {
  /** A bare board placed heeled `deg` about its own long axis in still water, stepped once with the ledger on. */
  const heeled = (deg: number) => {
    const board = new BoardBody({});
    BoardBody.rollLedger = true;
    try {
      const water = new PlaneWater({});
      board.place(
        new Vector3(0, board.shape.centerOfMass.y, 0),
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (deg * Math.PI) / 180),
        new Vector3(0, 0, 0),
        new Vector3(0, 0, 0),
      );
      const before = board.angularVelocity.z;
      board.step(1 / 60, water);
      const q = board.roll;
      const sum = q.buoyancy + q.pressure + q.addedMass + q.radiation + q.friction + q.bed
        + q.fins + q.rails + q.froth + q.suction + q.gyro;
      return { board, q, sum, rate: board.angularVelocity.z - before };
    } finally {
      BoardBody.rollLedger = false;
    }
  };

  it('sees the righting moment on a heeled board, with the sign the board\'s own roll rate takes', () => {
    // −20° about +z takes the board's +x rail DOWN, so the buried rail is +x and the righting moment must be positive.
    const down = heeled(-20);
    // The hydrostatic entry is the righting moment itself, 5.47 N·m on this heel; the NET is only 0.46, because the
    // water's added mass answers the first substep's rotation and takes most of it back (−4.86). Both signs are the
    // prediction's, and the small net is why the control reads the sign against the rate rather than a size.
    expect(down.q.buoyancy).toBeGreaterThan(1);
    expect(down.sum).toBeGreaterThan(0.1);
    // (b) the instrument's sign against the board's own measured roll rate, which is an independent reading.
    expect(Math.sign(down.sum)).toBe(Math.sign(down.rate));
    expect(down.rate).toBeGreaterThan(0);
    // Mirrored: the other rail buried gives the mirrored moment, to the digit, and the mirrored rate.
    const up = heeled(20);
    expect(up.sum).toBeCloseTo(-down.sum, 9);
    expect(up.rate).toBeCloseTo(-down.rate, 9);
    expect(Math.sign(up.sum)).toBe(Math.sign(up.rate));
  });

  it('closes on a board with no rider, so the residual is not carrying the water', () => {
    // `rider` is `total` less every water entry and the gyroscopic term. With no rider there is nothing for it to
    // carry, so it must be zero — and it is only zero because `waterT`'s explicit half is NOT booked twice (the yaw
    // ledger books it alongside its settle entries and reads 0.086 N·m on a total of 0.463 here; see `BoardBody.roll`).
    const { q, sum } = heeled(-20);
    expect(Math.abs(q.rider)).toBeLessThan(1e-6);
    expect(sum).toBeCloseTo(q.total, 9);
  });

  it('books each entry as an angular impulse, bounded by its own force times the board\'s length', () => {
    // The same bound step 3.2v put on the yaw ledger's suction: a mean torque about an axis through the centre of mass
    // cannot exceed the mean force times the longest arm on the board. It catches an entry that accumulated a torque
    // where the rest accumulate `h ×` one, which the `/ dt` would then leave a factor `substeps` too large.
    const { board, q } = heeled(-20);
    const arm = board.shape.length;
    for (const key of ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'fins', 'rails', 'froth', 'suction'] as const) {
      expect(Math.abs(q[key]), key).toBeLessThanOrEqual(board.forces[key].length() * arm + 1e-9);
    }
  });

  it('is off by default and changes nothing about the board when it is on', () => {
    const run = (ledger: boolean) => {
      BoardBody.rollLedger = ledger;
      try {
        const board = new BoardBody({});
        const water = new PlaneWater({});
        board.place(
          new Vector3(0, board.shape.centerOfMass.y, 0),
          new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -0.2),
          new Vector3(0.4, 0, 6),
          new Vector3(0, 0, 0.3),
        );
        for (let i = 0; i < 30; i += 1) board.step(1 / 60, water);
        return board;
      } finally {
        BoardBody.rollLedger = false;
      }
    };
    const off = run(false);
    // Off by default: nothing was written, so every entry is still its initial zero.
    for (const value of Object.values(off.roll)) expect(value).toBe(0);
    // And a pure observer: the trajectory is identical to the digit with it on.
    const on = run(true);
    expect(on.centerOfMass.toArray()).toEqual(off.centerOfMass.toArray());
    expect(on.velocity.toArray()).toEqual(off.velocity.toArray());
    expect(on.angularVelocity.toArray()).toEqual(off.angularVelocity.toArray());
    expect(on.orientation.toArray()).toEqual(off.orientation.toArray());
    expect(BoardBody.rollLedger).toBe(false);
  });
});
