// The new surfer, step 3.1: the board's step time with a standing rider (32 substeps a frame), old against new
// (RIDER=new). A standing glide at 7 m/s on flat water and a run down a 20° face, 4 s each, five repeats; the median
// of each repeat's mean ms per 1/60 s step. Analytic water: the water samples cost what a flat sample costs.
import { it } from 'vitest';
import { STEP, Slope, emit, place, r } from '../../board-in-water/lab';

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';

it('step time standing', () => {
  for (const [name, angle, speed] of [['flat glide 7 m/s', 0, 7.8], ['20° face, straight down', 20, 6]] as const) {
    const means: number[] = [];
    for (let repeat = 0; repeat < 5; repeat += 1) {
      const water = new Slope(angle);
      const rig = place(water, 0, 0, speed, 'standing');
      const steps = Math.round(4 / STEP);
      const start = performance.now();
      let done = 0;
      for (let i = 0; i < steps && rig.rider!.attached; i += 1) { rig.board.step(STEP, water); done += 1; }
      means.push((performance.now() - start) / done);
    }
    means.sort((a, b) => a - b);
    emit({ rider: RIDER, name, msPerStep: r(means[2], 3), all: means.map((m) => r(m, 3)) });
  }
});
