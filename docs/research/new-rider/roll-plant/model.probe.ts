// Step 3.2's delayed roll model (`rollModel32.ts`, copied from claude/rider-new-32 f894d23d, src/physics/rollModel.ts,
// unchanged) rerun with the plant measured here (`plant.probe.ts`, `couple.probe.ts`). A human loop: delay 0.10 s,
// motor lag 0.05 s, the bank and bank-rate gains searched on 3.2's grid. One JSON line per case ($OUT).
//
// The turn's pull gets an instant share: a = G0 φ + s, ṡ = ((G − G0) φ − s) / T (the rigid-rider roll steps: the tilted
// lift acts at once, the fins' share follows the slip). G0 = 0 is 3.2's model.
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { eigenvalues, humanRollLoop, type HumanRollGains, type RollParams } from './rollModel32';

const DELAY = Number(process.env.DELAY ?? 0.1);
const LAG = 0.05;
const r = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
function emit(line: unknown): void {
  if (process.env.OUT) appendFileSync(process.env.OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

interface Plant {
  /** Hull roll stiffness about the load line, N·m/rad (list), and its roll damping: a share of it (3.2: 0.05) or N·m·s/rad. */
  K: number[];
  damping: { share?: number; value?: number[] };
  /** The board's roll inertia with the water's, kg·m². */
  Ib: number[];
  /** The turn's pull per rail: steady G (list), the instant share G0, its lag T. */
  G: number[];
  G0: number;
  T: number;
  loads: number[];
}
const H = [0.79, 0.6, 0.5];

function loop(p: RollParams, G: number, G0: number, load: number, g: HumanRollGains, delay: number): number[][] {
  const m = humanRollLoop(p, { delay, motorLag: LAG, turnGain: G, load }, g);
  // The instant share: the pull's state carries only G − G0, and the body feels G0 φ at once.
  m[4][0] = (G - G0) / p.turnLag;
  m[3][0] -= ((load * 9.81) / p.height) * G0;
  return m;
}
function leastDamping(m: number[][]): { damping: number; frequency: number } {
  let worst = { damping: Infinity, frequency: 0 };
  for (const v of eigenvalues(m)) {
    if (v.im < 0) continue;
    const size = Math.hypot(v.re, v.im);
    const damping = size > 0 ? -v.re / size : 1;
    const frequency = Math.abs(v.im) / (2 * Math.PI);
    if (damping > 0.5 && frequency > 3.5) continue; // the Padé approximant's own poles (as 3.2's `physical`)
    if (size < 1e-9) continue;
    if (damping < worst.damping) worst = { damping, frequency };
  }
  return worst;
}
function plants(c: Plant): { p: RollParams; G: number; load: number; tag: string }[] {
  const out: { p: RollParams; G: number; load: number; tag: string }[] = [];
  for (const K of c.K) for (const h of H) for (const ib of c.Ib) for (const G of c.G) for (const load of c.loads) {
    for (const C of c.damping.value ?? [c.damping.share! * K]) {
      out.push({ p: { boardInertia: ib, hullStiffness: K, hullDamping: C, mass: 73, height: h, ankleStiffness: 800, ankleDamping: 80, turnLag: c.T }, G, load, tag: `K ${K}, C ${r(C, 0)}, h ${h}, Ib ${ib}, G ${G}, ${load} g` });
    }
  }
  return out;
}
function worst(c: Plant, g: HumanRollGains, delay = DELAY) {
  let w = { damping: Infinity, frequency: 0, at: '' };
  for (const x of plants(c)) {
    const m = leastDamping(loop(x.p, x.G, c.G0, x.load, g, delay));
    if (m.damping < w.damping) w = { ...m, at: x.tag };
  }
  return w;
}
function best(c: Plant) {
  let b = { bank: 0, bankRate: 0, damping: -Infinity, frequency: 0, at: '' };
  for (let bank = -1; bank <= 2.001; bank += 0.25) for (let bankRate = 0; bankRate <= 0.6001; bankRate += 0.05) {
    const w = worst(c, { bank, bankRate });
    if (w.damping > b.damping) b = { bank: +bank.toFixed(2), bankRate: +bankRate.toFixed(2), ...w };
  }
  const g = { bank: b.bank, bankRate: b.bankRate };
  const holds = (f: number, delay: number) => worst(c, { bank: g.bank * f, bankRate: g.bankRate * f }, delay).damping > 0;
  let up = 1; while (up < 8 && holds(up * 1.05, DELAY)) up *= 1.05;
  let down = 1; while (down > 0.02 && holds(down / 1.05, DELAY)) down /= 1.05;
  let delay = DELAY; while (delay < 0.4 && holds(1, delay + 0.005)) delay += 0.005;
  const passive = worst(c, { bank: 0, bankRate: 0 });
  return { best: { ...g, damping: r(b.damping), frequencyHz: r(b.frequency, 2), at: b.at }, gainUp: b.damping > 0 ? r(up, 2) : null, gainDown: b.damping > 0 ? r(down, 2) : null, delayUpToS: b.damping > 0 ? r(delay, 3) : null, passive: { damping: r(passive.damping), frequencyHz: r(passive.frequency, 2) } };
}

const K = [860, 1330, 1650];
const IB = [0.03, 0.1, 0.3];
const CASES: Record<string, Plant> = {
  // 3.2 as built: the carve lab's pull (1.3–1.6, 0.035 s, nothing at once), hull damping 0.05 K (43–83 N·m·s/rad).
  '3.2 as built': { K, damping: { share: 0.05 }, Ib: IB, G: [1.3, 1.6], G0: 0, T: 0.035, loads: [1, 1.4] },
  '3.2, the turn 3 times the rail': { K, damping: { share: 0.05 }, Ib: IB, G: [3], G0: 0, T: 0.035, loads: [1, 1.4] },
  // Measured here: the rigid rider's pull, steady 0.83–0.93, 0.5–0.63 at once, the rest in about 0.05 s.
  'measured pull, 3.2 damping': { K, damping: { share: 0.05 }, Ib: IB, G: [0.83, 0.93], G0: 0.55, T: 0.05, loads: [1, 1.4] },
  // Measured here: the water's roll damping about the deck 12–20 N·m·s/rad (5–9 m/s).
  '3.2 pull, measured damping': { K, damping: { value: [12, 20] }, Ib: IB, G: [1.3, 1.6], G0: 0, T: 0.035, loads: [1, 1.4] },
  'measured pull, measured damping': { K, damping: { value: [12, 20] }, Ib: IB, G: [0.83, 0.93], G0: 0.55, T: 0.05, loads: [1, 1.4] },
};
// The fixes' sweeps (filled by SWEEP=…): the hull's roll damping, and the pull's lag.
const SWEEP = process.env.SWEEP ?? '';
if (SWEEP.includes('damping')) for (const C of [40, 80, 150, 300]) {
  CASES[`measured pull, damping ${C}`] = { K, damping: { value: [C] }, Ib: IB, G: [0.83, 0.93], G0: 0.55, T: 0.05, loads: [1, 1.4] };
  CASES[`3.2 pull, damping ${C}`] = { K, damping: { value: [C] }, Ib: IB, G: [1.3, 1.6], G0: 0, T: 0.035, loads: [1, 1.4] };
}
if (SWEEP.includes('lag')) for (const T of [0.1, 0.2, 0.3]) {
  CASES[`measured pull, lag ${T}`] = { K, damping: { value: [12, 20] }, Ib: IB, G: [0.83, 0.93], G0: 0.55, T, loads: [1, 1.4] };
  CASES[`3.2 pull, lag ${T}`] = { K, damping: { value: [12, 20] }, Ib: IB, G: [1.3, 1.6], G0: 0, T, loads: [1, 1.4] };
}
if (SWEEP.includes('gain')) for (const G of [0.5, 0.7, 1.0, 1.15]) {
  CASES[`pull ${G}, instant 0.55·G/0.88`] = { K, damping: { value: [12, 20] }, Ib: IB, G: [G], G0: (0.55 * G) / 0.88, T: 0.05, loads: [1, 1.4] };
}
if (SWEEP.includes('instant')) for (const G of [1.3, 1.6, 2, 3]) for (const share of [0, 0.5, 0.63, 0.8]) {
  CASES[`pull ${G}, instant share ${share}`] = { K, damping: { value: [12, 20] }, Ib: IB, G: [G], G0: share * G, T: 0.05, loads: [1, 1.4] };
}
const ONLY = process.env.CASES?.split('|');

it('the delayed roll model: margins by plant', () => {
  for (const [name, c] of Object.entries(CASES)) {
    if (ONLY && !ONLY.includes(name)) continue;
    emit({ case: name, delay: DELAY, ...best(c) });
  }
});
