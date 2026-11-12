// Probe 1b (board-in-water, 2026-11-12): a standing rider in trim on the analytic moving face (`FaceWater`, test-only:
// one crest, the water under it moving), the Canyon-matched wave (1.4 m over 2.6 m) made steeper. Mid-face start.
import { it } from 'vitest';
import { FaceWater } from '../../../src/physics/testing/FaceWater';
import { STEP, emit, mean, place, r, state, type State } from './lab';

const AT = Number(process.env.AT ?? 0.75);
it('trim on a steepening moving face', () => {
  for (const slope of [16, 25, 30, 35, 45, 55]) for (const heading of [-45, -70]) {
    const water = new FaceWater({ depth: 2.6, height: 1.4, slope, speed: 5.7, vertical: 'particle' });
    const z = water.crestZ() + AT * water.front;
    const rig = place(water, z, heading, 7.5, 'standing');
    const frames: State[] = [];
    let peakLeg = 0; let lastW = 0; let fell = ''; let t = 0; let maxLocal = 0; let peakLoad = 0;
    for (let i = 0; i < 180; i += 1) {
      t = (i + 1) * STEP;
      water.advance(STEP);
      rig.board.step(STEP, water);
      const w = rig.board.work.rider + rig.rider!.work.contact + rig.rider!.work.legDrive;
      peakLeg = Math.max(peakLeg, (w - lastW) / STEP); lastW = w;
      const s = state(rig, water, t);
      maxLocal = Math.max(maxLocal, Math.atan(Math.abs(water.sampleAt(0, 0, rig.board.position.z, {} as never).slopeZ)) * 57.3);
      peakLoad = Math.max(peakLoad, rig.rider!.contact.load);
      frames.push(s);
      if (s.fell) { fell = s.fell; break; }
    }
    const window = frames.filter((s) => s.t >= 0.4 && s.t <= 0.8);
    const m = window.length ? mean(window) : frames[frames.length - 1];
    emit({ slope, heading, fell, t: r(t), face: r(water.faceFraction(rig.board.position.z), 2), steepestSeen: r(maxLocal, 0), peakLegW: r(peakLeg, 0), peakLoad: r(peakLoad, 2),
      at: { v: r(m.speed, 1), draft: r(m.draft * 100, 1), wetL: r(m.wetLength, 2), roll: r(m.roll, 1), slip: r(m.slip, 1), railBot: r(m.railBottom * 100, 1), fin: r(m.finSide, 3), rail: r(m.railSide, 3), bank: r(m.bank, 1) } });
  }
});
