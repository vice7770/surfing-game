// Probe 1c (board-in-water, 2026-11-12): a standing rider placed on a planar face, or with the face tilting in under it, along and near the fall line: where the legs start to do kilowatts.
import { it } from 'vitest';
import { Slope, Tilting, emit, place, r, STEP, state, DEG } from './lab';
it('steep: threshold', () => {
  // Placed on the face at once.
  for (const angle of [25, 28, 30, 32, 35, 40, 45]) for (const heading of [0, 20, 45, 135, 160, 180]) {
    const face = new Slope(angle);
    const rig = place(face, 0, heading, 6, 'standing');
    let peakPower = 0; let peakAccel = 0; let fell = ''; let t = 0; let last = rig.board.velocity.clone(); let lastW = rig.board.work.rider + rig.rider!.work.contact;
    for (let i = 0; i < 90; i += 1) {
      rig.board.step(STEP, face);
      t = (i + 1) * STEP;
      const w = rig.board.work.rider + rig.rider!.work.contact;
      peakPower = Math.max(peakPower, (w - lastW) / STEP); lastW = w;
      peakAccel = Math.max(peakAccel, rig.board.velocity.distanceTo(last) / STEP / 9.81); last = rig.board.velocity.clone();
      if (!rig.rider!.attached) { fell = String(rig.rider!.separation); break; }
    }
    emit({ kind: 'placed', angle, heading, fell, t: r(t), legPowerPeakW: r(peakPower, 0), boardAccelPeakG: r(peakAccel, 1), end: r(state(rig, face, t).speed, 1) });
  }
  // Tilted in under a rider already gliding straight down (6 m/s).
  for (const [angle, heading, ramp] of [[30, 0, 1.5], [30, 20, 1.5], [40, 0, 1.5], [40, 20, 1.5], [50, 0, 1.5], [50, 20, 1.5], [20, 180, 0.8], [30, 180, 0.8], [40, 180, 0.8]]) {
    const tilt = new Tilting(angle, ramp);
    const rig = place(tilt, 0, heading, 6, 'standing');
    let peakPower = 0; let fell = ''; let t = 0; let lastW = 0; let at = Number.NaN;
    for (let i = 0; i < 150; i += 1) {
      tilt.advance(STEP);
      rig.board.step(STEP, tilt);
      t = (i + 1) * STEP;
      const w = rig.board.work.rider + rig.rider!.work.contact;
      const p = (w - lastW) / STEP; lastW = w;
      if (p > 2000 && !(at === at)) at = t;
      peakPower = Math.max(peakPower, p);
      if (!rig.rider!.attached) { fell = String(rig.rider!.separation); break; }
    }
    const x = Math.min(1, t / ramp);
    emit({ kind: 'tilted', angle, heading, ramp, fell, t: r(t), slopeAtEnd: r(angle * x * x * (3 - 2 * x), 1), legPowerPeakW: r(peakPower, 0), over2kWat: r(at), end: r(state(rig, tilt, t).speed, 1) });
  }
  void DEG;
});
