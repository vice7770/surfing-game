// Scout: where the old rider's centre of mass sits on the board in a steady glide, and the board's own inertia.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { Slope, STEP, emit, place, r, state } from '../../board-in-water/lab';
it('scout', () => {
  for (const [v, a] of [[5, 13.37], [7, 11.01], [9, 10.37]]) {
    const water = new Slope(a);
    const rig = place(water, 0, 0, v, 'standing');
    let s = state(rig, water, 0);
    const loc = new Vector3();
    const acc = new Vector3(); let n = 0;
    for (let i = 0; i < 180; i += 1) { rig.board.step(STEP, water); s = state(rig, water, (i + 1) * STEP); if (i >= 120) { acc.add(rig.board.toLocal(rig.rider!.position, loc)); n += 1; } }
    acc.multiplyScalar(1 / n);
    emit({ v, riderLocal: [r(acc.x, 3), r(acc.y, 3), r(acc.z, 3)], pitch: r(s.pitch), draft: r(s.draft, 3), speed: r(s.speed), mass: rig.rider!.mass, boardMass: rig.board.shape.mass, boardInertia: rig.board.shape.inertia.map((x) => r(x, 4)), com: rig.board.shape.centerOfMass });
  }
});
