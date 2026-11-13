// Step 2 of the surfer track (2026-11-13): the wall water's added-mass push, along the board's path ('path') against the
// water's own material acceleration ('follow', `WaterSample.wallFollow`). A standing rider gliding at 7 m/s on flat
// analytic water, every sample marked as the case's wall water. Bars B1–B4 (README.md).
import { it } from 'vitest';
import type { SurfWater, WaterSample } from '../../../../src/physics/SurfWater';
import { STEP, emit, place, r, state } from '../lab';

type Rule = 'path' | 'follow';
const G = 9.81;
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Flat water, 3 m deep; its surface and its vertical flow given by the subclass. */
abstract class Wall implements SurfWater {
  time = 0;
  private offset = 0;
  constructor(readonly rule: Rule) {}
  advance(dt: number): void { this.time += dt; }
  setSampleTime(offset: number): void { this.offset = offset; }
  abstract level(t: number): number;
  abstract rise(t: number, z: number): number;
  surfaceAt(_x: number, _z: number): number { return this.level(this.time); }
  sampleAt(_x: number, _y: number, z: number, out: WaterSample): WaterSample {
    const t = this.time + this.offset;
    const surfaceY = this.level(t);
    Object.assign(out, {
      surfaceY, stillDepth: 3, waterDepth: 3, bedY: surfaceY - 3, wet: true, outsideDomain: false, slopeX: 0, slopeZ: 0,
      normalX: 0, normalY: 1, normalZ: 0, flowX: 0, flowY: this.rise(t, z), flowZ: 0, regime: 'profile', breaking: 0, voidFraction: 0,
      bedNormalX: 0, bedNormalY: 1, bedNormalZ: 0, bedMaterial: 'sand',
    });
    out.wallWater = true;
    out.wallFollow = this.rule === 'follow' ? true : undefined;
    return out;
  }
  addReaction(): void {}
}

/** lab.ts's `Rising`: the surface rises `height` at `rate` from `start`, its water moving up with it (∂u/∂t a step at each end). */
class Rising extends Wall {
  constructor(rule: Rule, readonly start: number, readonly rate: number, readonly height: number) { super(rule); }
  level(t: number): number { return Math.min(this.height, Math.max(0, (t - this.start) * this.rate)); }
  rise(t: number): number { return t > this.start && this.level(t) < this.height ? this.rate : 0; }
}

/** Still in time: the water's upward flow steps from 0 to `w` over `ramp` m of z from `at` (no surface change). */
class FlowStep extends Wall {
  constructor(rule: Rule, readonly at: number, readonly w: number, readonly ramp: number) { super(rule); }
  level(): number { return 0; }
  rise(_t: number, z: number): number { return this.w * smooth((z - this.at) / this.ramp); }
}

/** The water truly accelerating: from `start`, upward flow a·(t − start) everywhere (surface ½ a (t − start)²), plus an optional still flow step. */
class Accelerating extends Wall {
  constructor(rule: Rule, readonly start: number, readonly a: number, readonly step = 0, readonly at = 3.4, readonly ramp = 0.1) { super(rule); }
  level(t: number): number { const s = Math.max(0, t - this.start); return 0.5 * this.a * s * s; }
  rise(t: number, z: number): number { return this.a * Math.max(0, t - this.start) + this.step * smooth((z - this.at) / this.ramp); }
}

interface Hidden { wallPush: Float64Array; addedMass: Float64Array; substepSpan: number }

function probe(name: string, water: Wall, eventAt: number, seconds = 1.2, window?: [number, number], a = 0): void {
  const rig = place(water, 0, 0, 7.4, 'standing');
  const { board, rider } = rig;
  const hidden = board as unknown as Hidden;
  const weight = (board.mass + rider!.mass) * G;
  const before: number[] = [];
  let peakForce = -Infinity;
  let peakPush = 0;
  let peakLoad = 0;
  let fell = '';
  let fellAt = Number.NaN;
  let pushSum = 0;
  let handSum = 0;
  let frames = 0;
  for (let i = 0; i < Math.round((eventAt + seconds) / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    const f = board.forces;
    const vertical = (f.pressure.y + f.buoyancy.y + f.addedMass.y + f.radiation.y) / weight;
    // The wall push in the step's last substep (N, up) and ρ C_a V a by hand (Σ the patches' added mass × a).
    let push = 0;
    let mass = 0;
    for (let k = 0; k < hidden.wallPush.length; k += 1) { push += hidden.wallPush[k]; mass += hidden.addedMass[k]; }
    push /= hidden.substepSpan;
    const s = state(rig, water, t);
    if (t > eventAt - 0.25 && t <= eventAt) before.push(vertical);
    if (t > eventAt) {
      peakForce = Math.max(peakForce, vertical);
      peakPush = Math.max(peakPush, Math.abs(push) / weight);
      peakLoad = Math.max(peakLoad, rider!.contact.load);
    }
    if (window && t > window[0] && t <= window[1]) { pushSum += push; handSum += mass * a; frames += 1; }
    if (s.fell) { fell = s.fell; fellAt = t - eventAt; break; }
  }
  const base = before.reduce((x, y) => x + y, 0) / before.length;
  emit({
    name, rule: water.rule, baseForce: r(base, 2), spike: r(peakForce - base, 2), peakWallPush: r(peakPush, 2), peakLoad: r(peakLoad, 2), fell, fellAfter: r(fellAt, 2),
    ...(window ? { meanWallPushN: r(pushSum / frames, 0), handN: r(handSum / frames, 0), ratio: r(pushSum / handSum, 3) } : {}),
  });
}

it('B1–B4: the wall push along the path against the water\'s own acceleration', () => {
  for (const rule of ['path', 'follow'] as const) {
    // B1, B3: the surface rising with its water (∂u/∂t a step: real in this field), 5 cm and 20 cm.
    for (const height of [0.05, 0.2]) for (const rate of [1, 2, 4]) probe(`rises ${height * 100} cm at ${rate} m/s`, new Rising(rule, 0.5, rate, height), 0.5);
    // B2: the board at 7 m/s crosses a still step in the upward flow (0 → w over 10 cm at z = 3.4 m, reached at ~0.48 s).
    for (const w of [1, 2]) probe(`still flow step 0 → ${w} m/s over 10 cm`, new FlowStep(rule, 3.4, w, 0.1), 0.4, 0.6);
    // B4: the water accelerating up at 3 m/s² from 0.5 s (0.4 s: 0.24 m, 1.2 m/s), alone and with B2's 1 m/s step on it.
    probe('accelerating 3 m/s²', new Accelerating(rule, 0.5, 3), 0.5, 0.4, [0.65, 0.9], 3);
    probe('accelerating 3 m/s² + still step 1 m/s', new Accelerating(rule, 0.5, 3, 1), 0.5, 0.4, [0.65, 0.9], 3);
  }
});

it('trace: B1\'s row (rises 20 cm at 2 m/s), frame by frame, both rules', () => {
  for (const rule of ['path', 'follow'] as const) {
    const water = new Rising(rule, 0.5, 2, 0.2);
    const rig = place(water, 0, 0, 7.4, 'standing');
    const { board, rider } = rig;
    const hidden = board as unknown as Hidden & { wallAccel: Float64Array };
    const weight = (board.mass + rider!.mass) * G;
    for (let i = 0; i < Math.round(0.8 / STEP); i += 1) {
      const t = (i + 1) * STEP;
      water.advance(STEP);
      board.step(STEP, water);
      if (t < 0.45) continue;
      let push = 0; let accY = 0; let n = 0; let mass = 0;
      for (let k = 0; k < hidden.wallPush.length; k += 1) {
        push += hidden.wallPush[k]; mass += hidden.addedMass[k];
        if (hidden.addedMass[k] > 0) { accY += hidden.wallAccel[3 * k + 1]; n += 1; }
      }
      const f = board.forces;
      const s = state(rig, water, t);
      emit({ trace: 'rises 20 cm at 2 m/s', rule, t: r(t, 3), flowY: water.rise(water.time), level: r(water.level(water.time), 3), meanAccY: r(accY / Math.max(1, n), 2), addedMassKg: r(mass, 0), wallPushBW: r(push / hidden.substepSpan / weight, 2), vertical: r((f.pressure.y + f.buoyancy.y + f.addedMass.y + f.radiation.y) / weight, 2), load: r(rider!.contact.load, 2), fell: s.fell ?? '' });
      if (s.fell) break;
    }
  }
});
