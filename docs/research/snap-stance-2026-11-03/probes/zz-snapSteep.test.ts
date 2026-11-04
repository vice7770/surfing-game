import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { acrossFace, deg, headingOf, STEP } from './zz-snapLab';

/** A snap at the lip: climbing a steep face nearly straight up, Snap + full steer for `hold` s, then steer only. */
it('steep face snaps', () => {
  const rows: Record<string, unknown>[] = [];
  const hold = Number(process.env.HOLD ?? 0.6);
  const modes = (process.env.MODES ?? 'S,snap').split(',');
  for (const slope of [25, 35, 45]) {
    for (const speed of [6, 7.5]) {
      for (const mode of modes) {
        const setup = acrossFace(Number(process.env.ACROSS ?? 160), speed, 'regular', 0, slope);
        const { board, rider, water, normal } = setup;
        for (let i = 0; i < 6; i += 1) board.step(STEP, water);
        const fall = new Vector3(0, -Math.sin((slope * Math.PI) / 180), Math.cos((slope * Math.PI) / 180));
        const along = () => board.velocity.dot(fall); // + downhill
        const v0 = board.velocity.length();
        let last = headingOf(board); let turned = 0; let peak = 0; let fell = NaN; let t150 = NaN; let vmin = Infinity; let tApex = NaN; let downAt = NaN;
        const series: number[] = [];
        for (let i = 0; i < 150; i += 1) {
          const t = i * STEP;
          rider.steer = 1;
          rider.snap = mode === 'snap' && t < hold ? 1 : 0;
          rider.trim = mode === 'S' && t < hold ? -1 : 0;
          board.step(STEP, water);
          if (!rider.attached) { fell = t; break; }
          const now = headingOf(board); const d = Math.atan2(Math.sin(now - last), Math.cos(now - last)); last = now; turned += d;
          peak = Math.max(peak, Math.abs(d / STEP));
          if (Number.isNaN(t150) && Math.abs(deg(turned)) >= 150) t150 = t + STEP;
          const v = board.velocity.length(); if (v < vmin) { vmin = v; }
          if (Number.isNaN(tApex) && along() > 0) tApex = t + STEP;
          const fwd = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
          const fp = fwd.addScaledVector(normal, -fwd.dot(normal)).normalize();
          if (Number.isNaN(downAt) && deg(Math.acos(Math.max(-1, Math.min(1, fp.dot(fall))))) < 45) downAt = t + STEP;
          series.push(v);
        }
        const at = (s: number) => series[Math.min(series.length - 1, Math.round(s / STEP) - 1)];
        rows.push({ case: `${slope}° v${speed} ${mode}`, peak: Math.round(deg(peak)), turned: Math.round(deg(turned)), t150, v0: +v0.toFixed(1), vmin: +vmin.toFixed(1), v1: +(at(1) ?? NaN).toFixed(1), v2: +(at(2) ?? NaN).toFixed(1), apex: tApex, noseDown45: downAt, fell });
      }
    }
  }
  writeFileSync(process.env.OUT ?? '/dev/null', JSON.stringify(rows, null, 1));
});
