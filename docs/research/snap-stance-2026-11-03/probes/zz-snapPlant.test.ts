import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { acrossFace, flat, summary, trace } from './zz-snapLab';

it('plant: snap', () => {
  const rows: Record<string, unknown>[] = [];
  const holdFor = Number(process.env.HOLD ?? 99);
  for (const speed of [6.7, 8]) {
    for (const snap of [0, 1]) {
      const setup = acrossFace(150, speed);
      const f = trace(setup, 1.6, (t, rider) => { if (t >= 0.2) { rider.steer = 1; rider.trim = snap ? 0 : -1; rider.snap = t < 0.2 + holdFor ? snap : 0; } });
      rows.push({ case: `climb150 v${speed} ${snap ? 'snap' : 'S'}`, ...summary(f.slice(12)) });
    }
  }
  for (const speed of [7, 9]) {
    for (const snap of [0, 1]) {
      const setup = acrossFace(80, speed);
      const f = trace(setup, 2.2, (t, rider) => { if (t >= 0.2) { rider.steer = -1; rider.trim = snap ? 0 : -1; rider.snap = t < 0.2 + holdFor ? snap : 0; } });
      rows.push({ case: `cutback80 v${speed} ${snap ? 'snap' : 'S'}`, ...summary(f.slice(12)) });
    }
  }
  for (const snap of [0, 1]) {
    const setup = flat(7);
    const f = trace(setup, 1.4, (t, rider) => { if (t >= 0.2) { rider.steer = 1; rider.trim = snap ? 0 : -1; rider.snap = t < 0.2 + holdFor ? snap : 0; } });
    rows.push({ case: `flat v7 ${snap ? 'snap' : 'S'}`, ...summary(f.slice(12)) });
  }
  writeFileSync(process.env.OUT ?? '/dev/null', JSON.stringify(rows, null, 1));
});
