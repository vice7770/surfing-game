// The steady glide's slope: the planar face on which a board and rider placed at v keep v (gravity along the face = the
// drag), found by bisection with the old rider over 3 s. One line per speed ($OUT).
import { it } from 'vitest';
import { Slope, STEP, emit, place, r, state } from '../../board-in-water/lab';
it('calibrate', () => {
  for (const v of [5, 7, 9, 12]) {
    let lo = 0; let hi = 25;
    let speeds: number[] = [];
    for (let k = 0; k < 14; k += 1) {
      const a = (lo + hi) / 2; const face = new Slope(a); const rig = place(face, 0, 0, v, 'standing');
      speeds = []; let fell = '';
      for (let i = 0; i < 180; i += 1) { rig.board.step(STEP, face); const s = state(rig, face, (i + 1) * STEP); speeds.push(s.speed); if (s.fell) { fell = s.fell; break; } }
      const late = speeds.slice(-60).reduce((x, y) => x + y, 0) / Math.max(1, speeds.slice(-60).length);
      if (fell || late < v) lo = a; else hi = a;
    }
    emit({ v, angle: r((lo + hi) / 2, 2), speedAt1: r(speeds[59], 2), speedAt2: r(speeds[119], 2), speedAt3: r(speeds[179], 2) });
  }
});
