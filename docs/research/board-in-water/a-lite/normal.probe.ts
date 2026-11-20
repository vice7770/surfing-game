// A-lite, normal riding (2026-11-12): the contact's net power in a straight glide, a held carve (standing and Compress),
// a pop-up (from the paddle's speed and from 5 m/s prone), paddling, and a 20° face 45° off the fall line: its peak per
// frame and per substep, its most over any 0.5 s, and how many substeps the switch changed (solved apart for power, or
// the push cut). LEG_POWER=cap runs it with the switch on. Analytic water only.
import { it } from 'vitest';
import { Slope, emit, place, r, STEP, type Rig } from '../lab';

function measure(name: string, rig: Rig, water: Slope, seconds: number, before?: (t: number) => void): void {
  const board = rig.board;
  const rider = rig.rider! as unknown as { finish: (h: number, b: unknown) => void; limitPush?: (b: unknown, f: unknown, h: number) => number; overPower?: (x: unknown, h: number) => boolean; work: { contact: number }; attached: boolean; separation?: string; upright: boolean };
  const works: number[] = []; const spans: number[] = [];
  let cut = 0; let over = 0;
  const finish = rider.finish.bind(rider);
  rider.finish = (h, b) => { const w0 = board.work.rider + rider.work.contact; finish(h, b); works.push(board.work.rider + rider.work.contact - w0); spans.push(h); };
  if (rider.limitPush) { const f = rider.limitPush.bind(rider); rider.limitPush = (b, x, h) => { const s = f(b, x, h); if (s < 1) cut += 1; return s; }; }
  if (rider.overPower) { const f = rider.overPower.bind(rider); rider.overPower = (x, h) => { const o = f(x, h); if (o) over += 1; return o; }; }
  let frameW = -Infinity; let lastW = board.work.rider + rider.work.contact; let t = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    t = (i + 1) * STEP;
    before?.(t);
    board.step(STEP, water);
    const w = board.work.rider + rider.work.contact;
    frameW = Math.max(frameW, (w - lastW) / STEP); lastW = w;
    if (!rider.attached) break;
  }
  let subW = -Infinity; for (let k = 0; k < works.length; k += 1) subW = Math.max(subW, works[k] / spans[k]);
  let windowW = -Infinity; let sum = 0; let span = 0; let from = 0;
  for (let k = 0; k < works.length; k += 1) {
    sum += works[k]; span += spans[k];
    while (span - spans[from] >= 0.5 - 1e-9) { sum -= works[from]; span -= spans[from]; from += 1; }
    if (span >= 0.5 - 1e-3) windowW = Math.max(windowW, sum / 0.5);
  }
  emit({ name, t: r(t, 2), fell: rider.attached ? '' : String(rider.separation), frameW: r(frameW, 0), subW: r(subW, 0), window05W: r(windowW, 0), substeps: works.length, overPower: over, pushCut: cut });
}

it('a-lite: leg power in normal riding', () => {
  const flat = new Slope(0);
  measure('glide 7 m/s', place(flat, 0, 0, 7.8, 'standing'), flat, 3);
  for (const compress of [0, 1]) {
    const rig = place(flat, 0, 0, 7.7, 'standing');
    measure(`held carve (${compress ? 'Compress' : 'standing'})`, rig, flat, 3, (t) => {
      if (t > 0.2) { rig.rider!.steer = 1; rig.rider!.compress = compress; rig.rider!.crouch = compress ? 0.6 : 0; }
    });
  }
  {
    const rig = place(flat, 0, 0, 0, 'prone');
    rig.rider!.paddle = true;
    measure('paddling 8 s', rig, flat, 8);
    rig.rider!.paddle = false;
    rig.rider!.popUp();
    measure('pop-up from the paddle speed, 2.5 s', rig, flat, 2.5);
  }
  {
    const rig = place(flat, 0, 0, 5.3, 'prone');
    let up = false;
    measure('pop-up from 5 m/s prone, 2.8 s', rig, flat, 2.8, (t) => { if (t > 0.3 && !up) { up = true; rig.rider!.popUp(); } });
  }
  const face = new Slope(20);
  measure('20° face, 45° off the fall line, 7 m/s, 3 s', place(face, 0, 45, 7, 'standing'), face, 3);
});
