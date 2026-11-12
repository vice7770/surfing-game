// Probe 5 (board-in-water, 2026-11-12): the speed budget, from the bodies' work ledgers, on still analytic water
// (ground frame = water frame). Each term is its power over (M g v): "g along the path".
import { it } from 'vitest';
import { STEP, Slope, emit, place, r, state, type Rig } from './lab';

const G = 9.81;

function ledger(rig: Rig) {
  const b = rig.board.work;
  const w = rig.rider!.work;
  return {
    gravity: b.gravity + w.gravity,
    hullPressure: b.pressure + b.addedMass + b.radiation + b.buoyancy,
    hullFriction: b.friction,
    fins: b.fins,
    rails: b.rails,
    riderWater: w.water,
    legs: b.rider + w.contact + w.legDrive,
    rules: w.assist + w.carry + w.leanOut,
    carry: w.carry,
  };
}

function budget(name: string, angle: number, heading: number, v: number, input?: (rig: Rig) => void, from = 0.3, to = 0.5): void {
  const water = new Slope(angle);
  const rig = place(water, 0, heading, v, 'standing');
  const M = rig.board.mass + rig.rider!.mass;
  let a: ReturnType<typeof ledger> | undefined;
  let ke0 = 0;
  let speedSum = 0;
  let n = 0;
  let fell = '';
  let t = 0;
  for (let i = 0; i < Math.round(to / STEP); i += 1) {
    t = (i + 1) * STEP;
    if (input && t > 0.2) input(rig);
    rig.board.step(STEP, water);
    const s = state(rig, water, t);
    if (s.fell) { fell = s.fell; break; }
    if (Math.abs(t - from) < STEP / 2) { a = ledger(rig); ke0 = rig.board.kineticEnergy() + rig.rider!.kineticEnergy(); }
    if (t > from) { speedSum += s.speed; n += 1; }
  }
  if (!a || fell) { emit({ name, fell, t: r(t) }); return; }
  const b = ledger(rig);
  const span = t - from;
  const speed = speedSum / n;
  const out: Record<string, number | null | string> = { name, speed: r(speed, 2) };
  let sum = 0;
  for (const k of Object.keys(b) as (keyof typeof b)[]) {
    const g = (b[k] - a[k]) / span / (M * G * speed);
    if (k !== 'carry') sum += g;
    out[k] = r(g, 3);
  }
  out.sum = r(sum, 3);
  out.dKE = r((rig.board.kineticEnergy() + rig.rider!.kineticEnergy() - ke0) / span / (M * G * speed), 3);
  emit(out);
}

it('speed budget', () => {
  for (const v of [5, 7, 9, 12]) budget(`flat, straight, ${v} m/s`, 0, 0, v);
  for (const v of [5, 7, 9, 12]) budget(`20° face, 45° off the fall line, ${v} m/s`, 20, 45, v);
  for (const v of [5, 7, 9]) budget(`flat, held carve with Compress, stick 1, from ${v} m/s (0.5–0.9 s)`, 0, 0, v, (rig) => { rig.rider!.steer = 1; rig.rider!.compress = 1; rig.rider!.crouch = 0.6; }, 0.5, 0.9);
  for (const v of [5, 7, 9]) budget(`flat, held carve standing, stick 1, from ${v} m/s (0.5–0.9 s)`, 0, 0, v, (rig) => { rig.rider!.steer = 1; }, 0.5, 0.9);
});

it('terminal speed in trim on planar faces', () => {
  for (const angle of [10, 16, 20]) for (const heading of [45, 60]) {
    const water = new Slope(angle);
    const rig = place(water, 0, heading, 6, 'standing');
    let t = 0; let fell = ''; const speeds: number[] = [];
    for (let i = 0; i < 600; i += 1) {
      t = (i + 1) * STEP;
      rig.board.step(STEP, water);
      const s = state(rig, water, t);
      if (s.fell) { fell = s.fell; break; }
      if (i % 60 === 59) speeds.push(r(s.speed, 1) as number);
    }
    emit({ name: `${angle}° face, ${heading}° off the fall line, from 6 m/s`, speedEachSecond: speeds, fell, t: r(t) });
  }
});
