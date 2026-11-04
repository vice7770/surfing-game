import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { acrossFace, deg, headingOf, STEP } from './zz-snapLab';

it('surfing order: bottom turn up the face, snap at the top', () => {
  const rows: Record<string, unknown>[] = [];
  const hold = Number(process.env.HOLD ?? 0.6);
  for (const speed of [8, 9, 10]) {
    for (const mode of ['steer', 'snap', 'snapS']) {
      const { board, rider, water } = acrossFace(90, speed);
      for (let i = 0; i < 12; i += 1) board.step(STEP, water);
      const fromFall = () => Math.abs(deg(headingOf(board)));
      rider.steer = -1; rider.compress = 1; rider.crouch = 0.6;
      let t = 0;
      for (let i = 0; i < 180 && rider.attached && fromFall() < 120; i += 1) { board.step(STEP, water); t += STEP; }
      const speedTop = board.velocity.length();
      rider.compress = 0; rider.crouch = 0; rider.steer = 1;
      let lowest = 180; let peak = 0; let last = headingOf(board); let fell = NaN; let turned = 0; let t150 = NaN; let speedAt = NaN;
      for (let i = 0; i < 150; i += 1) {
        const ts = i * STEP;
        rider.snap = mode !== 'steer' && ts < hold ? 1 : 0;
        rider.trim = mode === 'snapS' && ts < hold ? 0 : mode === 'steer' ? -1 : 0;
        board.step(STEP, water);
        if (!rider.attached) { fell = ts; break; }
        const now = headingOf(board); const d = Math.atan2(Math.sin(now - last), Math.cos(now - last)); last = now; turned += d;
        peak = Math.max(peak, Math.abs(d / STEP)); lowest = Math.min(lowest, fromFall());
        if (Number.isNaN(t150) && Math.abs(deg(turned)) >= 120) t150 = ts;
        if (Math.abs(ts - 0.6) < 1e-6) speedAt = board.velocity.length();
      }
      rows.push({ case: `v${speed} ${mode}`, bottomTime: +t.toFixed(2), speedTop: +speedTop.toFixed(2), turned: Math.round(deg(turned)), peak: Math.round(deg(peak)), lowestFromFall: Math.round(lowest), t120: t150, speed06: +speedAt.toFixed(2), fell: +fell.toFixed(2) });
    }
  }
  writeFileSync(process.env.OUT ?? '/dev/null', JSON.stringify(rows, null, 1));
});
