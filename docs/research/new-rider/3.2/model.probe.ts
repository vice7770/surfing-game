// The new surfer, step 3.2 (ruling 29, item 5): the roll and pitch models with the human delay (0.10 s) and motor lag
// (0.05 s), to choose the gains before building and to read their margins. One line per row ($OUT).
// - Roll (`src/physics/rollModel.ts` `humanRollModes`, `humanRollKick`): the carve lab's plant (the hull rights the
//   board about the load line, 860–1,650 N·m/rad, the rail settling in 0.05 s, the turn's pull following in 0.035 s at
//   1.3–1.6 times the rail), the body 0.5–0.79 m over its feet, the board's roll inertia with the water's 0.03–0.3 kg·m²,
//   the felt gravity 1–1.8 g; and a stronger turn (3 times the rail), the one the probes' growing mode points to.
// - Pitch (`../3.1/pitchModel.ts`): the hull's measured stiffness and drag at 5, 7 and 9 m/s, its pitch damping as the
//   kicks measured it (20–30 N·m·s/rad), the board's pitch inertia 0.43–6 kg·m².
// Mode A is the 12–17 Hz band; Mode B the 2.5–4.5 Hz band; the 3.1c pitch swing near 1.7–1.8 Hz.
import { it } from 'vitest';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { HUMAN_ANKLE_DAMPING, HUMAN_ANKLE_STIFFNESS, HUMAN_BANK_GAIN, HUMAN_BANK_RATE_GAIN } from '../../../../src/physics/humanBalance';
import { humanReferenceGain, humanRollKick, humanRollModes, type HumanRollGains, type RollParams } from '../../../../src/physics/rollModel';
import { PITCH_ANKLE, PITCH_DAMPING_TIME, PITCH_LEAN_GAIN, PITCH_RATE_GAIN } from '../../../../src/physics/standingBody';
import { emit, r } from '../../board-in-water/lab';
import { leastDamped, type PitchGains, type PitchParams } from '../3.1/pitchModel';

const DELAY = 0.1;
const LAG = 0.05;
/** The Padé approximant's own poles sit at fixed frequencies whatever the plant, well damped: left out of "the plant's modes". */
const physical = (ms: { frequency: number; damping: number }[]) => ms.filter((m) => !(m.damping > 0.5 && m.frequency > 3.5));

function rollPlants(turnGains: number[], loads: number[]) {
  const out: { p: RollParams; turnGain: number; load: number; tag: string }[] = [];
  for (const K of [860, 1330, 1650]) for (const h of [0.79, 0.6, 0.5]) for (const ib of [0.03, 0.1, 0.3]) for (const turnGain of turnGains) for (const load of loads) {
    out.push({ p: { boardInertia: ib, hullStiffness: K, hullDamping: 0.05 * K, mass: 73, height: h, ankleStiffness: HUMAN_ANKLE_STIFFNESS, ankleDamping: HUMAN_ANKLE_DAMPING, turnLag: 0.035 }, turnGain, load, tag: `K ${K}, h ${h}, Ib ${ib}, turn ${turnGain}, ${load} g` });
  }
  return out;
}

function worstRoll(g: HumanRollGains, turnGains: number[], loads: number[], delay = DELAY) {
  let worst = { damping: Infinity, frequency: 0, at: '' };
  for (const c of rollPlants(turnGains, loads)) {
    const m = physical(humanRollModes(c.p, { delay, motorLag: LAG, turnGain: c.turnGain, load: c.load }, g))[0];
    if (m && m.damping < worst.damping) worst = { damping: m.damping, frequency: m.frequency, at: c.tag };
  }
  return { damping: r(worst.damping, 3), frequencyHz: r(worst.frequency, 2), at: worst.at };
}

/** Each band's least damped mode over the plants (Mode A 12–17 Hz, Mode B 2.5–4.5 Hz). */
function bandsRoll(g: HumanRollGains, turnGains: number[], loads: number[]) {
  let a = Infinity; let b = Infinity;
  for (const c of rollPlants(turnGains, loads)) for (const m of physical(humanRollModes(c.p, { delay: DELAY, motorLag: LAG, turnGain: c.turnGain, load: c.load }, g))) {
    if (m.frequency >= 12 && m.frequency <= 17) a = Math.min(a, m.damping);
    if (m.frequency >= 2.5 && m.frequency <= 4.5) b = Math.min(b, m.damping);
  }
  return { modeA: Number.isFinite(a) ? r(a, 3) : 'none', modeB: Number.isFinite(b) ? r(b, 3) : 'none' };
}

it('the roll model with the human delay: the gains and their margins', () => {
  const chosen: HumanRollGains = { bank: HUMAN_BANK_GAIN, bankRate: HUMAN_BANK_RATE_GAIN };
  const carveLab = [1.3, 1.6];
  // 1. With no balance, and with the old rider's bank law undelayed (7.4 and 3.6 s, a 0.01 s lag).
  emit({ table: 'roll: passive', carveLab: worstRoll({ bank: 0, bankRate: 0 }, carveLab, [1, 1.4]), turn3: worstRoll({ bank: 0, bankRate: 0 }, [3], [1, 1.4]) });
  // 2. The best gains over the carve lab's envelope (1–1.4 g), and at 1.8 g, from a grid.
  for (const loads of [[1, 1.4], [1.8]]) for (const turnGains of [carveLab, [3]]) {
    let best = { bank: 0, bankRate: 0, damping: -Infinity };
    for (let bank = -1; bank <= 2.001; bank += 0.25) for (let bankRate = 0; bankRate <= 0.6001; bankRate += 0.05) {
      const w = worstRoll({ bank, bankRate }, turnGains, loads).damping as number;
      if (w > best.damping) best = { bank: r(bank, 2) as number, bankRate: r(bankRate, 2) as number, damping: w };
    }
    emit({ table: 'roll: best gains', turnGains, loads, best });
  }
  // 3. The chosen gains: the least damped mode, Modes A and B, the margins (gain factor, delay), and a kick with the delay exact.
  const holds = (f: number, delay: number) => (worstRoll({ bank: chosen.bank * f, bankRate: chosen.bankRate * f }, carveLab, [1, 1.4], delay).damping as number) > 0;
  let up = 1; while (up < 8 && holds(up * 1.05, DELAY)) up *= 1.05;
  let down = 1; while (down > 0.02 && holds(down / 1.05, DELAY)) down /= 1.05;
  let delay = DELAY; while (delay < 0.4 && holds(1, delay + 0.005)) delay += 0.005;
  emit({
    table: 'roll: chosen', chosen, carveLab: worstRoll(chosen, carveLab, [1, 1.4]), carveLab18g: worstRoll(chosen, carveLab, [1.8]), turn3: worstRoll(chosen, [3], [1, 1.4]),
    bands: bandsRoll(chosen, carveLab, [1, 1.4]), gainUp: r(up, 2), gainDown: r(down, 2), delayUpToS: r(delay, 3),
    kick: (() => { const p = rollPlants([1.3], [1])[0].p; const k = humanRollKick(p, { delay: DELAY, motorLag: LAG, turnGain: 1.3 }, chosen); return { decayPerCycle: r(k.decay, 3), settled: k.settled }; })(),
    referenceGainAt7: r(humanReferenceGain(rollPlants([1.3], [1])[0].p, { delay: DELAY, motorLag: LAG, turnGain: 1.3 }, chosen), 3),
  });
  // 4. The old law undelayed, for scale (it carried the body with a kinematic drive in the game; here the body is free).
  emit({ table: 'roll: old law undelayed', carveLab: worstRoll({ bank: 7.4, bankRate: 3.6 }, carveLab, [1, 1.4], 1e-4) });
});

const SPEEDS = [
  { speed: 5, loads: [1, 1.2], hullStiffness: 1200, drag: 77 },
  { speed: 7, loads: [1, 1.25, 1.5], hullStiffness: 1900, drag: 40 },
  { speed: 9, loads: [1, 1.4, 1.8], hullStiffness: 2800, drag: 31 },
];
const boardMass = new BoardBody().mass;
function pitchPlants(dampingTime: number): PitchParams[] {
  const out: PitchParams[] = [];
  for (const s of SPEEDS) for (const n of s.loads) for (const hullDamping of [20, 30]) for (const boardInertia of [0.43, 3, 6]) {
    const k = PITCH_ANKLE * 73 * 9.81 * 0.79 * Math.max(1, Math.min(2, n));
    out.push({ mass: 73, length: 0.79, boardMass, load: n, drag: s.drag, boardInertia, hullStiffness: s.hullStiffness, hullDamping, ankleStiffness: k, ankleDamping: dampingTime * k, feltTime: 0.1, referenceTime: 0.5, delay: DELAY, motorLag: LAG, source: 'body' });
  }
  return out;
}
const worstPitch = (g: PitchGains, dampingTime: number) => {
  let worst = { damping: Infinity, frequency: 0 };
  for (const p of pitchPlants(dampingTime)) { const m = leastDamped(p, g); if (m.damping < worst.damping) worst = m; }
  return { damping: r(worst.damping, 3), frequencyHz: r(worst.frequency, 2) };
};

it('the pitch model at the hull\'s measured pitch damping: 3.1c against 3.2', () => {
  emit({ table: 'pitch: 3.1c (damping time 0.1 s, gains 0.25 and 0.1 s)', worst: worstPitch({ lean: 0.25, rate: 0.1 }, 0.1) });
  emit({ table: 'pitch: 3.1c gains, damping time 0.3 s', worst: worstPitch({ lean: 0.25, rate: 0.1 }, 0.3) });
  emit({ table: 'pitch: 3.2 (damping time and gains as built)', dampingTime: PITCH_DAMPING_TIME, lean: PITCH_LEAN_GAIN, rate: PITCH_RATE_GAIN, worst: worstPitch({ lean: PITCH_LEAN_GAIN, rate: PITCH_RATE_GAIN }, PITCH_DAMPING_TIME) });
  const holds = (f: number) => (worstPitch({ lean: PITCH_LEAN_GAIN * f, rate: PITCH_RATE_GAIN * f }, PITCH_DAMPING_TIME).damping as number) > 0;
  let up = 1; while (up < 8 && holds(up * 1.05)) up *= 1.05;
  let down = 1; while (down > 0.02 && holds(down / 1.05)) down /= 1.05;
  emit({ table: 'pitch: 3.2 gain margins', gainUp: r(up, 2), gainDown: r(down, 2) });
});
