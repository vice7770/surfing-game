import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { flat, STEP } from './zz-snapLab';

it('straight snap on flat water', () => {
  const setup = flat(Number(process.env.SPEED ?? 7));
  const { board, rider, water } = setup;
  const lines: string[] = ['t\tspeed\tpitch\tfront\tcopZ\tbalZ\tleanZ\tleg\tdecel'];
  let last = board.velocity.length();
  for (let i = 0; i < 120; i += 1) {
    const t = i * STEP;
    rider.snap = t >= 0.2 ? 1 : 0;
    rider.steer = Number(process.env.STEER ?? 0) * (t >= 0.2 ? 1 : 0);
    board.step(STEP, water);
    const speed = board.velocity.length();
    const fwd = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    const r = rider as unknown as { balance: Vector3; lean: Vector3; smoothedCop: Vector3 };
    if (i % 4 === 3) lines.push([t + STEP, speed, (Math.asin(fwd.y) * 180) / Math.PI, rider.contact.frontShare, r.smoothedCop.z, r.balance.z, r.lean.z, rider.leg.rest, (last - speed) / STEP / 9.81].map((v) => v.toFixed(3)).join('\t'));
    last = speed;
  }
  writeFileSync(process.env.OUT ?? '/dev/null', lines.join('\n'));
});
