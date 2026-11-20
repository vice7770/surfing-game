// Probe 3 (board-in-water, 2026-11-12): what a 5 cm step, or the surface rising under the board, does to a standing
// rider gliding at 7 m/s on flat water. Analytic water only.
import { it } from 'vitest';
import { Vector3 } from 'three';
import type { SurfWater, WaterSample } from '../../../src/physics/SurfWater';
import { DEG, Rising, STEP, Step, emit, place, r, state } from './lab';

/** `Rising`, with every sample marked as the case's wall water (`WaterSample.wallWater`): the hull then also takes the water's own acceleration on its added mass, as in the pool's Barrel wall. */
class WallRising extends Rising {
  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    super.sampleAt(x, y, z, out);
    out.wallWater = true;
    return out;
  }
}

function probe(name: string, water: SurfWater, eventAt: number): void {
  const rig = place(water, 0, 0, 7.4, 'standing');
  const { board, rider } = rig;
  const weight = (board.mass + rider!.mass) * 9.81;
  const advance = (water as { advance?: (dt: number) => void }).advance?.bind(water);
  const before: number[] = [];
  let peakForce = -Infinity;
  let peakLoad = 0;
  let peakPitchRate = 0;
  let pitch0 = Number.NaN;
  let pitchMax = -Infinity;
  let pitchMin = Infinity;
  let legMin = Infinity;
  let peakAddedMass = 0;
  let fell = '';
  let fellAt = Number.NaN;
  let lastPitch = Number.NaN;
  for (let i = 0; i < Math.round((eventAt + 1.2) / STEP); i += 1) {
    const t = (i + 1) * STEP;
    advance?.(STEP);
    board.step(STEP, water);
    const f = board.forces;
    const vertical = (f.pressure.y + f.buoyancy.y + f.addedMass.y + f.radiation.y) / weight;
    const s = state(rig, water, t);
    if (t > eventAt - 0.25 && t <= eventAt) {
      before.push(vertical);
      pitch0 = s.pitch;
    }
    if (t > eventAt && t <= eventAt + 1.2) {
      peakForce = Math.max(peakForce, vertical);
      peakAddedMass = Math.max(peakAddedMass, Math.abs(f.addedMass.y) / weight);
      peakLoad = Math.max(peakLoad, rider!.contact.load);
      if (lastPitch === lastPitch) peakPitchRate = Math.max(peakPitchRate, Math.abs(s.pitch - lastPitch) / STEP);
      pitchMax = Math.max(pitchMax, s.pitch);
      pitchMin = Math.min(pitchMin, s.pitch);
      legMin = Math.min(legMin, rider!.leg.extension);
    }
    lastPitch = s.pitch;
    if (s.fell) {
      fell = s.fell;
      fellAt = t - eventAt;
      break;
    }
  }
  const base = before.reduce((a, b) => a + b, 0) / before.length;
  emit({
    name, baseForce: r(base, 2), peakForce: r(peakForce, 2), spike: r(peakForce - base, 2), peakAddedMass: r(peakAddedMass, 2), peakLoad: r(peakLoad, 2),
    pitchBefore: r(pitch0, 1), pitchRange: [r(pitchMin, 1), r(pitchMax, 1)], peakPitchRate: r(peakPitchRate, 0), kneesMin: r(legMin * 100, 1), fell, fellAfter: r(fellAt, 2),
  });
}

it('a 5 cm step, and the surface rising under the board', () => {
  // The board reaches z = 3.4 m at about 0.48 s: the step stands there.
  probe('flat (control)', new Step(1e9, 0.05, 0.05), 0.5);
  probe('static step 5 cm over 5 cm', new Step(3.4, 0.05, 0.05), 0.5);
  probe('static step 5 cm over 50 cm', new Step(3.4, 0.05, 0.5), 0.5);
  probe('static step 5 cm down over 5 cm', new Step(3.4, -0.05, 0.05), 0.5);
  for (const rate of [0.4, 1, 2, 4]) probe(`surface rises 5 cm at ${rate} m/s`, new Rising(0.5, rate, 0.05), 0.5);
  for (const rate of [0.4, 1, 2, 4]) probe(`surface rises 20 cm at ${rate} m/s`, new Rising(0.5, rate, 0.2), 0.5);
  for (const rate of [1, 2, 4]) probe(`surface rises 20 cm at ${rate} m/s through still water (no upward flow)`, new Rising(0.5, rate, 0.2, false), 0.5);
  for (const rate of [1, 2, 4]) probe(`wall water (added-mass inertia on): rises 20 cm at ${rate} m/s`, new WallRising(0.5, rate, 0.2), 0.5);
  void DEG;
  void Vector3;
});
