import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { acrossFace, flat, trace } from './zz-snapLab';

it('trace', () => {
  const across = Number(process.env.ACROSS ?? 150);
  const speed = Number(process.env.SPEED ?? 6.7);
  const snap = Number(process.env.SNAPIN ?? 1);
  const trim = Number(process.env.TRIM ?? 0);
  const steer = Number(process.env.STEER ?? 1);
  const hold = Number(process.env.HOLD ?? 99);
  const setup = process.env.FLAT ? flat(speed) : acrossFace(across, speed);
  const f = trace(setup, Number(process.env.SECONDS ?? 1.6), (t, rider) => { if (t >= 0.2) { rider.steer = steer; rider.trim = trim; rider.snap = t < 0.2 + hold ? snap : 0; } });
  const lines = f.filter((_, i) => i % 3 === 2).map((x) => [x.t, x.turned, (x.rate * 180) / Math.PI, x.speed, x.pitch, x.drift, x.front, x.rail, x.bank, x.fin, x.finWet, x.legRest, x.twist, x.load].map((v) => (typeof v === 'number' ? v.toFixed(2) : String(v))).join('\t'));
  writeFileSync(process.env.OUT ?? '/dev/null', ['t\tturned\trate\tspeed\tpitch\tdrift\tfront\trail\tbank\tfin\tfinWet\tleg\ttwist\tload', ...lines].join('\n'));
});
