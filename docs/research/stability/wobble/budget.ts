/**
 * **3.6c M1, plane water** (README §0.3): a bare board (`new BoardBody({ substeps: 4 })`, no rider) on `PlaneWater`
 * slopes (0.20, −0.08), placed at the centre of mass's height, velocity (0.4, 0, 6) m/s, heeled about +z, 60 steps of
 * 1/60 s with the yaw ledger closed. Per heel: the first step's residual as shipped (`rider − duplicate + suction`) and
 * closed, and the largest |residual| of each over the 60 steps, N·m; the largest |total| beside them for scale.
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/wobble/budget.ts --file <s>/budget.mjs --format esm --platform node && node <s>/budget.mjs
 */
import { Quaternion, Vector3 } from 'three';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PlaneWater } from '../../../../src/physics/PlaneWater';

BoardBody.yawLedger = true;
BoardBody.yawLedgerClosed = true;
console.log('| heel (deg, about +z) | first step: shipped / closed (N·m) | max \\|shipped\\| over 60 steps | max \\|closed\\| over 60 steps | max \\|total\\| |');
console.log('| --- | --- | --- | --- | --- |');
for (const deg of [-20, -10, 0, 10, 20]) {
  const board = new BoardBody({ substeps: 4 });
  const water = new PlaneWater({ slopeX: 0.2, slopeZ: -0.08 });
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (deg * Math.PI) / 180), new Vector3(0.4, 0, 6), new Vector3());
  let first: [number, number] | undefined;
  let ms = 0, mc = 0, mt = 0;
  for (let k = 0; k < 60; k += 1) {
    board.step(1 / 60, water);
    const y = board.yaw;
    const shipped = y.rider - y.duplicate + y.suction;
    first ??= [shipped, y.rider];
    ms = Math.max(ms, Math.abs(shipped));
    mc = Math.max(mc, Math.abs(y.rider));
    mt = Math.max(mt, Math.abs(y.total));
  }
  console.log(`| ${deg} | ${first![0].toFixed(4)} / ${first![1].toExponential(2)} | ${ms.toFixed(3)} | ${mc.toExponential(2)} | ${mt.toFixed(3)} |`);
}
