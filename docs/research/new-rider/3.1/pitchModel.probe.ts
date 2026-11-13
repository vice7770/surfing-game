// The new surfer, step 3.1b (ruling 29a): the active pitch ankle's gains, chosen on the linear model (`pitchModel.ts`),
// and their margins. The board's numbers are measured (`hull.probe.ts`): the hull's pitch stiffness about the load at 5,
// 7 and 9 m/s and the drag's slope 2 D / v; the board's pitch inertia (with the water's added mass) and the hull's pitch
// damping are uncertain and swept. Load factors: those reachable at each speed (a 1.8 g turn at 5 m/s has a 1.4 m radius).
import { it } from 'vitest';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { emit, r } from '../../board-in-water/lab';
import { leastDamped, simulate, type PitchGains, type PitchParams } from './pitchModel';

const SPEEDS = [
  { speed: 5, loads: [1, 1.2], hullStiffness: 1200, drag: 77 },
  { speed: 7, loads: [1, 1.25, 1.5], hullStiffness: 1900, drag: 40 },
  { speed: 9, loads: [1, 1.4, 1.8], hullStiffness: 2800, drag: 31 },
];
const MASS = 73;
const LENGTH = 0.79;
const CHOSEN: PitchGains = { lean: 0.25, rate: 0.1 };

/** The plant at `load` (activation: the ankle's stiffening with the load, at most this many times its base; 1: none). */
function plant(load: number, change: Partial<PitchParams> = {}, activation = 2): PitchParams {
  const k = 1.2 * MASS * 9.81 * LENGTH * Math.max(1, Math.min(activation, load));
  return {
    mass: MASS, length: LENGTH, boardMass: new BoardBody().mass, load, drag: 40, boardInertia: 3, hullStiffness: 1900, hullDamping: 100,
    ankleStiffness: k, ankleDamping: 0.1 * k, feltTime: 0.1, referenceTime: 0.5, delay: 0.1, motorLag: 0.05, source: 'body', ...change,
  };
}

/** Each (speed, load) at its measured hull and drag, with `change` on top. */
function envelope(change: Partial<PitchParams> = {}, activation = 2): PitchParams[] {
  return SPEEDS.flatMap((s) => s.loads.map((n) => plant(n, { hullStiffness: s.hullStiffness, drag: s.drag, ...change }, activation)));
}

/** The corners: the hull's damping 30–300, the board's pitch inertia 0.43 (dry) to 6 kg·m², the drag's slope × 0.5–2. */
function corners(change: Partial<PitchParams> = {}, activation = 2): PitchParams[] {
  const out: PitchParams[] = [];
  for (const s of SPEEDS) for (const n of s.loads) for (const hullDamping of [30, 100, 300]) for (const boardInertia of [0.43, 3, 6]) for (const scale of [0.5, 1, 2]) {
    out.push(plant(n, { hullStiffness: s.hullStiffness, drag: s.drag * scale, hullDamping, boardInertia, ...change }, activation));
  }
  return out;
}

const least = (ps: PitchParams[], g: PitchGains) => Math.min(...ps.map((p) => leastDamped(p, g).damping));

function bestOver(ps: PitchParams[]): { lean: number; rate: number; damping: number } {
  let best = { lean: 0, rate: 0, damping: -Infinity };
  for (let lean = 0; lean <= 3 + 1e-9; lean += 0.25) for (let rate = 0; rate <= 0.5 + 1e-9; rate += 0.05) {
    const d = least(ps, { lean, rate });
    if (d > best.damping) best = { lean, rate: r(rate, 2) as number, damping: r(d, 3) as number };
  }
  return best;
}

it('pitch model: the felt source, the gains and their margins', () => {
  emit({ table: 'plant', ...plant(1), speeds: SPEEDS });
  // 1. Which felt vertical leaves any gains that hold (the best gains' least damping over the measured envelope).
  for (const activation of [1, 2]) {
    for (const time of [0.1, 0.5, 1, 3]) emit({ table: 'source', activation, source: 'board (3.1)', referenceTime: time, best: bestOver(envelope({ source: 'board', referenceTime: time }, activation)) });
    for (const time of [0.2, 0.5, 1]) emit({ table: 'source', activation, source: 'body push', referenceTime: time, best: bestOver(envelope({ source: 'body', referenceTime: time }, activation)) });
  }
  // 2. The chosen gains (body push 0.5 s, stiffening to 2×): each speed and load, and the exact delay in time.
  for (const s of SPEEDS) for (const n of s.loads) {
    const p = plant(n, { hullStiffness: s.hullStiffness, drag: s.drag });
    const mode = leastDamped(p, CHOSEN);
    const time = simulate(p, CHOSEN);
    emit({ table: 'chosen', speed: s.speed, load: n, damping: r(mode.damping, 3), frequencyHz: r(mode.frequency, 2), exactDelay: { growthOver8s: r(time.growth, 4), damping: r(time.damping, 3) } });
  }
  // 3. Over the uncertain numbers.
  emit({ table: 'corners', chosen: r(least(corners(), CHOSEN), 3), leanZero: r(least(corners(), { lean: 0, rate: 0.1 }), 3) });
  for (const hullDamping of [30, 100, 300]) emit({ table: 'corners by hull damping', hullDamping, chosen: r(least(corners().filter((p) => p.hullDamping === hullDamping), CHOSEN), 3) });
  // 4. Margins at the measured plant: the factor on both gains, and the delay, that keep every mode damped.
  const holds = (f: number, delay: number) => least(envelope({ delay }), { lean: CHOSEN.lean * f, rate: CHOSEN.rate * f }) > 0;
  let up = 1; while (up < 20 && holds(up * 1.05, 0.1)) up *= 1.05;
  let down = 1; while (down > 0.02 && holds(down / 1.05, 0.1)) down /= 1.05;
  let delay = 0.1; while (delay < 1 && holds(1, delay + 0.005)) delay += 0.005;
  emit({ table: 'margins', gainUp: r(up, 2), gainDown: r(down, 2), delayUpToS: r(delay, 3) });
  // 5. Step 1 alone (no stiffening), the same gains: each load.
  for (const s of SPEEDS) for (const n of s.loads) emit({ table: 'no stiffening', speed: s.speed, load: n, damping: r(leastDamped(plant(n, { hullStiffness: s.hullStiffness, drag: s.drag }, 1), CHOSEN).damping, 3) });
});
