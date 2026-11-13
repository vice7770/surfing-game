// Why the held old rider's turn pulls 1.3–1.6 times the rail while a rigid mass pulls 0.85–0.95 on the same water: the
// carve lab's couple test (`couple.probe.ts`) with this lab's ledger on the board. The water's force and yaw moment on
// the board, and the rider's contact on it as the rest of the board's own momentum change (board alone, 2.54 kg).
// One line per row ($OUT). Flat water only.
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Vector3 } from 'three';
import { HeldRider, towAlongHeading } from '../../../../src/dev/heldRider';
import { Flat, GROUPS, Lab, STEP, sum } from './plant';

const r = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
function emit(line: unknown): void {
  if (process.env.OUT) appendFileSync(process.env.OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

it('held rider: water against contact', () => {
  const water = new Flat();
  for (const speed of [5, 7, 9]) {
    const lab = new Lab(water, 'none');
    const board = lab.board;
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), undefined, new Vector3(0, 0, speed));
    const rider = new HeldRider(board.shape);
    board.attach(rider);
    for (let i = 0; i < 30; i += 1) { towAlongHeading(board, rider, speed); lab.frame(); }
    rider.rollCouple = 40;
    const rows: Record<string, number>[] = [];
    for (let i = 0; i < 90 && rider.attached; i += 1) {
      towAlongHeading(board, rider, speed);
      const w0 = board.angularVelocity.y;
      const book = lab.frame();
      const left = new Vector3(1, 0, 0).applyQuaternion(board.orientation).setY(0).normalize();
      const Nw = sum(book.moment, GROUPS.all).y;
      const Yw = sum(book.force, GROUPS.all).dot(left);
      // Board alone about its own centre (yaw): I ω̇ ≈ N_water + N_contact (+ the couple, about the long axis only).
      const I = [] as number[];
      board.rotateTensor((board as unknown as { bodyInertia: number[] }).bodyInertia, I);
      const Nc = I[4] * (board.angularVelocity.y - w0) / STEP - Nw;
      const cop = rider.contact.centreOfPressure;
      const copLocal = cop; // already board frame (shape coordinates)
      const riderLocal = board.toLocal(rider.position, new Vector3());
      const railDeg = -Math.asin(Math.max(-1, Math.min(1, new Vector3(1, 0, 0).applyQuaternion(board.orientation).y))) * 180 / Math.PI;
      rows.push({ t: (i + 1) * STEP, rail: railDeg, yaw: board.angularVelocity.y, Nw, Yw, Nc, copZ: copLocal.z, copX: copLocal.x, riderZ: riderLocal.z, riderX: riderLocal.x, Nf: sum(book.moment, GROUPS.fins).y, Np: sum(book.moment, GROUPS.pressure).y });
    }
    const tail = rows.slice(-30);
    const m = (k: string) => tail.reduce((a, b) => a + b[k], 0) / tail.length;
    emit({ part: 'held', speed, steady: Object.fromEntries(['rail', 'yaw', 'Nw', 'Nc', 'Yw', 'Nf', 'Np', 'copZ', 'copX', 'riderZ', 'riderX'].map((k) => [k, r(m(k), 4)])), early: rows.slice(0, 12).map((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, r(v, 3)]))) });
  }
});
