// A-lite bars L1–L3 (2026-11-12, ruling 27): a standing rider at 6 m/s on a planar face of 20–50°, straight down (heading 0)
// and straight up (180), placed on the face at once and with the face tilted in under it from flat (down over 1.5 s, up
// over 0.8 s, as steep.probe.ts). Per row: the contact's net power on board and body together, its peak per frame (the
// study's measure) and per substep, and its most over any 0.5 s; the board's peak acceleration per frame, after the first
// 0.1 s and over all of it; the fall's time and cause, or how the run ends (speed through the water, along the fall line).
// LEG_POWER=cap runs it with the switch on.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { Slope, Tilting, emit, place, r, STEP, state } from '../lab';

const G = 9.81;

it('a-lite: bars L1 to L3', () => {
  for (const kind of ['placed', 'tilted'] as const) for (const heading of [0, 180]) for (const angle of [20, 25, 30, 35, 40, 45, 50]) {
    const ramp = heading === 0 ? 1.5 : 0.8;
    const water = kind === 'placed' ? new Slope(angle) : new Tilting(angle, ramp);
    const rig = place(water, 0, heading, 6, 'standing');
    const rider = rig.rider! as unknown as { finish: (h: number, b: unknown) => void; work: { contact: number }; attached: boolean; separation?: string; mass: number };
    const board = rig.board;
    // Each substep's net contact work and length.
    const works: number[] = [];
    const spans: number[] = [];
    const original = rider.finish.bind(rider);
    rider.finish = (h: number, b: unknown) => {
      const before = board.work.rider + rider.work.contact;
      original(h, b);
      works.push(board.work.rider + rider.work.contact - before);
      spans.push(h);
    };
    const seconds = kind === 'placed' ? 1.5 : 2.5;
    let frameW = 0; let accelAll = 0; let accelLate = 0; let fell = ''; let t = 0; let last = board.velocity.clone(); let lastW = board.work.rider + rider.work.contact;
    for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
      (water as { advance?: (dt: number) => void }).advance?.(STEP);
      board.step(STEP, water);
      t = (i + 1) * STEP;
      const w = board.work.rider + rider.work.contact;
      frameW = Math.max(frameW, (w - lastW) / STEP); lastW = w;
      const a = board.velocity.distanceTo(last) / STEP / G; last = board.velocity.clone();
      accelAll = Math.max(accelAll, a);
      if (t > 0.1) accelLate = Math.max(accelLate, a);
      if (!rider.attached) { fell = String(rider.separation); break; }
    }
    let subW = 0; for (let k = 0; k < works.length; k += 1) subW = Math.max(subW, works[k] / spans[k]);
    // The most net work over any 0.5 s (a window ending at each substep).
    let windowW = 0; let sum = 0; let span = 0; let from = 0;
    for (let k = 0; k < works.length; k += 1) {
      sum += works[k]; span += spans[k];
      while (span - spans[from] >= 0.5 - 1e-9) { sum -= works[from]; span -= spans[from]; from += 1; }
      windowW = Math.max(windowW, sum / 0.5);
    }
    const s = state(rig, water, t);
    const down = new Vector3(0, -Math.sin(angle / 57.29578), Math.cos(angle / 57.29578));
    emit({ kind, heading, angle, fell, t: r(t, 3), mass: rider.mass, frameW: r(frameW, 0), subW: r(subW, 0), window05W: r(windowW, 0), boardG: r(accelAll, 1), boardGafter01: r(accelLate, 1), speed: r(s.speed, 2), alongFallLine: r(board.velocity.dot(down), 2) });
  }
});
