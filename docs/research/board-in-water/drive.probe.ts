// Probe 1d (board-in-water, 2026-11-12): the steep-face run step by step (35° against 25°): the legs' power, the board's spin, the drives, the contact's feasibility.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { Slope, emit, place, r, STEP, state } from './lab';
it('steep: which drive', () => {
  for (const angle of [25, 35]) {
    const face = new Slope(angle);
    const rig = place(face, 0, 0, 6, 'standing');
    const p = rig.rider as unknown as { drive: Vector3; balanceRate: Vector3; postureRate: Vector3; uprightVelocity(b: unknown, o: Vector3): Vector3; leg: { extension: number; rate: number } };
    let lastW = 0;
    for (let i = 0; i < 8; i += 1) {
      rig.board.step(STEP, face);
      const w = rig.board.work.rider + rig.rider!.work.contact;
      const s = state(rig, face, (i + 1) * STEP);
      const up = rig.rider!.attached ? p.uprightVelocity(rig.board, new Vector3()).length() : Number.NaN;
      emit({ angle, i, legW: r((w - lastW) / STEP, 0), boardSpin: r(rig.board.angularVelocity.length(), 2), pitch: r(s.pitch, 1), drive: r(p.drive.length(), 2), upright: r(up, 2), balanceRate: r(p.balanceRate.length(), 2), leg: r(p.leg.rate, 2), feasible: rig.rider!.contact.feasible, cone: r(Math.acos(Math.max(-1, Math.min(1, rig.rider!.contact.force.clone().normalize().dot(new Vector3(0, 1, 0).applyQuaternion(rig.board.orientation))))) * 57.3, 0), v: r(s.speed, 1), fell: s.fell ?? '' });
      lastW = w;
      if (s.fell) break;
    }
  }
});
