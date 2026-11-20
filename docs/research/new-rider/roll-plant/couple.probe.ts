// The carve lab's "under a couple" plant test (scripts/carve-lab.ts `underCouple`, 2026-09-27), rerun on today's code:
// the held rider (`HeldRider`, the old rider bolted at its bank) on flat water, towed along its heading, a couple of 20
// or 40 N·m about the roll axis for 1.5 s. Adds the trace's early yaw (the overshoot) and the pull per rail at 0.1 s.
// One line per row ($OUT). Not a ride: flat water only.
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Vector3 } from 'three';
import { HeldRider, towAlongHeading } from '../../../../src/dev/heldRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PlaneWater } from '../../../../src/physics/PlaneWater';
import { WATER } from '../../../../src/physics/hullForces';

const STEP = 1 / 60;
const flat = new PlaneWater();
const rail = (board: BoardBody) => -Math.asin(Math.max(-1, Math.min(1, new Vector3(1, 0, 0).applyQuaternion(board.orientation).y)));
const mean = (values: readonly number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
const r = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
function emit(line: unknown): void {
  if (process.env.OUT) appendFileSync(process.env.OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

it('under a couple, today', () => {
  for (const speed of [5, 7, 9]) for (const couple of [20, 40]) {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), undefined, new Vector3(0, 0, speed));
    const rider = new HeldRider(board.shape);
    board.attach(rider);
    const step = () => { towAlongHeading(board, rider, speed); board.step(STEP, flat); };
    for (let i = 0; i < 30; i += 1) step();
    const pitch0 = (Math.asin(new Vector3(0, 0, 1).applyQuaternion(board.orientation).y) * 180) / Math.PI;
    const riderAt = board.toLocal(rider.position, new Vector3());
    rider.rollCouple = couple;
    const rails: number[] = [];
    const yaws: number[] = [];
    for (let i = 0; i < 90 && rider.attached; i += 1) { step(); rails.push(rail(board)); yaws.push(board.angularVelocity.y); }
    const steadyRail = mean(rails.slice(-30));
    const steadyYaw = mean(yaws.slice(-30));
    const g = (yaw: number, rl: number) => (speed * yaw) / WATER.gravity / Math.tan(rl);
    const peak = yaws.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
    emit({
      part: 'couple', speed, couple, pitchBefore: r(pitch0, 2), riderLocal: [r(riderAt.x), r(riderAt.y), r(riderAt.z)],
      slipEndDeg: r((Math.atan2(-board.velocity.clone().applyQuaternion(board.orientation.clone().invert()).x, board.velocity.clone().applyQuaternion(board.orientation.clone().invert()).z) * 180) / Math.PI, 3), attached: rider.attached, railDeg: r((steadyRail * 180) / Math.PI, 2), stiffness: r(couple / steadyRail, 0),
      rail63: r(rails.findIndex((x) => x >= 0.63 * steadyRail) * STEP, 3), yawEnd: r(steadyYaw, 4), yawPerDeg: r(steadyYaw / ((steadyRail * 180) / Math.PI), 4),
      G: r(g(steadyYaw, steadyRail), 2), peakYaw: r(peak, 4), yawAt: [1, 3, 6, 15, 30].map((i) => r(yaws[i - 1], 4)), railAt: [1, 3, 6, 15, 30].map((i) => r((rails[i - 1] * 180) / Math.PI, 3)),
    });
  }
});
