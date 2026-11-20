// Step 3.2b (ruling 29f): the delayed roll model with the board's yaw, its sway and the feet's centre-of-pressure
// steering (`src/physics/rollModel.ts` `humanYawLoop`), with and without the rider's yaw inertia. One line per row ($OUT).
// From the repo root:
//   OUT=/tmp/yaw.jsonl PART=rigid,check,inertia,gains npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts yaw.probe
// (also PART=sens, the terms one by one; PART=box, a random search over the physical box; env SPEEDS, RIDERS, HEIGHTS,
// IBX, DELAY, LAG, STATION, FX, BOARD_MASS, CROSS, CROSS_FROM, CROSS_TO, HIP, BOX_SPEEDS, BOX_RIDER, SAMPLES).
// The plant: the board on the water's captive derivatives with the rigid point rider (`../roll-plant` results, all 12:
// yaw moment, side force and roll moment per roll, slip, yaw rate and roll rate), turned into aircraft axes (x forward,
// y right, z down) and moved from the composite's centre of mass to the board's own, 0.236 m ahead (`boardDerivatives`);
// checked first against the lab's free roll decay (PART=rigid). The feet's forward force (1.5 N·m per cm at 7 m/s,
// scaled with speed by the terminal planes' drag), their middle 0.244 m behind the board's centre of mass and the deck
// 0.031 m over it (`BoardBody`'s reference board), the board's roll inertia with the water's 0.03–0.3 kg·m², and the body
// over its feet by stance (0.84 m tall, as the traces read it; 0.65 crouched; 0.55 in Compress).
import { it } from 'vitest';
import { boardDerivatives, eigenvalues, humanYawKick, humanYawModes, type HumanRollGains, type YawPlant } from '../../../../src/physics/rollModel';
import { emit, r } from '../../board-in-water/lab';

const PARTS = (process.env.PART ?? 'rigid,check,inertia,gains').split(',');
const DELAY = Number(process.env.DELAY ?? 0.1);
const LAG = Number(process.env.LAG ?? 0.05);

/**
 * The lab's captive derivatives with the rigid point rider (roll-plant results/plant-point.jsonl, the lab's axes and
 * reference points: N, Y about the composite centre of mass over the feet; K about the deck under them), per rad and
 * per rad/s: [N, Y, K] for roll (1°), slip (1°), yaw rate and roll rate about the deck.
 */
const LAB: Record<number, { roll: number[]; slip: number[]; yaw: number[]; rate: number[] }> = {
  5: { roll: [-98.0, -361.0, -310.0], slip: [-28.6, 704.7, -272.7], yaw: [-3.3, 37.0, -30.0], rate: [-1.65, -13.9, -0.85] },
  7: { roll: [-104.9, -412.5, -285.3], slip: [-296.2, 1398.0, -530.6], yaw: [-13.1, 63.0, -34.5], rate: [2.65, -19.5, -1.5] },
  9: { roll: [-122.0, -418.3, -326.6], slip: [-573.0, 2234.5, -775.2], yaw: [-21.5, 86.0, -40.7], rate: [4.9, -24.0, -2.6] },
};
/** The board's own centre of mass is 0.236 m ahead of the composite's (and 0.244 m ahead of the feet's middle), 0.031 m under the deck (`BoardBody`, the reference board). */
const AHEAD = 0.236;
const STATION = Number(process.env.STATION ?? -0.244);
/** The terminal planes' drag over weight (sin of `bars.probe.ts`'s TERMINAL): the feet carry it forward. 1.5 N·m per cm at 7 m/s (roll-plant 4). */
const DRAG: Record<number, number> = { 5: Math.sin((13.37 * Math.PI) / 180), 7: Math.sin((11.01 * Math.PI) / 180), 9: Math.sin((10.37 * Math.PI) / 180) };
const FEET_AT_7 = Number(process.env.FX ?? 150);
const BOARD_MASS = Number(process.env.BOARD_MASS ?? 2.54);
/** CROSS=c: the reserve lever, a hull cross-flow damping c N·s/m per m over CROSS_FROM..CROSS_TO m from the board's centre of mass (default its back half, the planing part). HIP=κ: the hip's share of the rest, N·m/rad. */
const CROSS = Number(process.env.CROSS ?? 0);
const CROSS_FROM = Number(process.env.CROSS_FROM ?? -0.833);
const CROSS_TO = Number(process.env.CROSS_TO ?? 0);
const HIP = Number(process.env.HIP ?? 0);

function yawPlant(speed: number, rider: number, height: number, rollInertia: number): YawPlant {
  return {
    speed, boardRollInertia: rollInertia, boardYawInertia: 0.449, riderYawInertia: rider, boardMass: BOARD_MASS,
    mass: 73, height, ankleStiffness: 800, ankleDamping: 80, ...boardDerivatives(LAB[speed], speed, AHEAD),
    feetForward: (FEET_AT_7 * DRAG[speed]) / DRAG[7], feetStation: STATION, deckHeight: 0.031,
    ...(CROSS ? { crossFlow: { c: CROSS, from: CROSS_FROM, to: CROSS_TO } } : {}), ...(HIP ? { hip: HIP } : {}),
  };
}

const HEIGHTS = (process.env.HEIGHTS ?? '0.84,0.65,0.55').split(',').map(Number);
const ROLL_INERTIAS = (process.env.IBX ?? '0.03,0.1,0.3').split(',').map(Number);
interface Case { y: YawPlant; tag: string }
function plants(rider: number | number[], speeds = [5, 7, 9]): Case[] {
  const out: Case[] = [];
  const riders = Array.isArray(rider) ? rider : [rider];
  for (const v of speeds) for (const h of HEIGHTS) for (const ib of ROLL_INERTIAS) for (const ir of riders) {
    out.push({ y: yawPlant(v, ir, h, ib), tag: `${v} m/s, h ${h}, Ib ${ib}, Ir ${ir}` });
  }
  return out;
}
function worst(cases: Case[], g: HumanRollGains, delay = DELAY) {
  let w = { damping: Infinity, frequency: 0, at: '' };
  for (const c of cases) {
    const m = humanYawModes(c.y, { delay, motorLag: LAG }, g)[0];
    if (m && m.damping < w.damping) w = { damping: m.damping, frequency: m.frequency, at: c.tag };
  }
  return { damping: r(w.damping, 3), frequencyHz: r(w.frequency, 2), at: w.at };
}
/** By speed: the least damped mode over the plants, and the tall body's (0.84 m, the board's roll inertia 0.1) mode and kick with the delay exact. */
function bySpeed(rider: number, g: HumanRollGains) {
  const out: Record<string, unknown> = {};
  for (const v of [5, 7, 9]) {
    const w = worst(plants(rider, [v]), g);
    const y = yawPlant(v, rider, HEIGHTS[0], 0.1);
    const m = humanYawModes(y, { delay: DELAY, motorLag: LAG }, g)[0];
    const kick = humanYawKick(y, { delay: DELAY, motorLag: LAG }, g);
    out[`v${v}`] = { worst: w, tall: { damping: r(m.damping, 3), frequencyHz: r(m.frequency, 2), kickDecayPerCycle: r(kick.decay, 2), peakBankDeg: r((kick.peakBank * 180) / Math.PI, 2) } };
  }
  return out;
}
const G32: HumanRollGains = { bank: 0, bankRate: 0.1 };

it('the yaw model: 3.2 without the inertia, then with it', () => {
  if (PARTS.includes('rigid')) for (const v of [5, 7, 9]) {
    // The water's derivatives checked against the lab's free roll decay with the rigid point rider (roll-plant 3.4: 5 m/s
    // grows and capsizes; 7 m/s 0.945 Hz, -0.021; 9 m/s 0.882 Hz, +0.081). The composite (board and rigid rider, 75.54 kg,
    // yaw inertia 0.595 kg·m²) rolls about the deck under the rider (the rider 0.845 m over it); x = [φ, φ̇, r, β_C].
    const L = LAB[v];
    const d = { Np: -L.roll[0], Yp: -L.roll[1], Kp: L.roll[2], Nb: -L.slip[0], Yb: -L.slip[1], Kb: L.slip[2], Nr: L.yaw[0], Yr: L.yaw[1], Kr: -L.yaw[2], Nq: -L.rate[0], Yq: -L.rate[1], Kq: L.rate[2] };
    const m = 73; const mt = 75.54; const h = 0.845; const ip = 0.03 + m * h * h; const iz = 0.595; const g = 9.81;
    const r1 = [m * g * h + d.Kp, d.Kq, d.Kr, d.Kb];
    const r2 = [d.Yp, d.Yq, d.Yr, d.Yb];
    const det = ip * mt - m * h * m * h;
    const rowP = r1.map((_, j) => (mt * r1[j] - m * h * r2[j]) / det);
    const rowA = r1.map((_, j) => (ip * r2[j] - m * h * r1[j]) / det);
    const rowB = rowA.map((x) => x / v); rowB[2] -= 1;
    const modes = eigenvalues([[0, 1, 0, 0], rowP, [d.Np / iz, d.Nq / iz, d.Nr / iz, d.Nb / iz], rowB])
      .filter((e) => e.im >= 0).map((e) => ({ frequencyHz: r(e.im / (2 * Math.PI), 3), damping: r(-e.re / Math.hypot(e.re, e.im), 3) }));
    emit({ part: 'rigid', v, lab: { 5: 'grows, capsizes at 1.6 s', 7: '0.945 Hz, -0.021', 9: '0.882 Hz, +0.081' }[v], model: modes });
  }
  if (PARTS.includes('check')) {
    emit({ part: 'check', note: "3.2's gains (bank 0, rate 0.1 s), no rider yaw inertia: the game's kick grew, -0.109 / -0.075 / -0.131 at 1.18 / 1.07 / 1.43 Hz", ...bySpeed(0, G32) });
    emit({ part: 'check', note: 'passive (no active balance), no rider yaw inertia', ...bySpeed(0, { bank: 0, bankRate: 0 }) });
    emit({ part: 'check', note: "3.2's gains, no CoP steering (F_x 0)", v7: (() => { const c = plants(0, [7]); for (const x of c) x.y.feetForward = 0; return worst(c, G32); })() });
    emit({ part: 'check', note: "3.2's gains, the feet at the board's centre (x_f 0)", v7: (() => { const c = plants(0, [7]); for (const x of c) x.y.feetStation = 0; return worst(c, G32); })() });
  }
  if (PARTS.includes('inertia')) for (const ir of [1, 1.5, 2.15, 2.8, 3.2, 3.65]) {
    emit({ part: 'inertia', riderYawInertia: ir, gains: G32, ...bySpeed(ir, G32) });
  }
  if (PARTS.includes('gains')) {
    const riders = (process.env.RIDERS ?? '2.15,2.8,3.2').split(',').map(Number);
    const cases = plants(riders, (process.env.SPEEDS ?? '5,7,9').split(',').map(Number));
    let b = { bank: 0, bankRate: 0, damping: -Infinity, frequency: 0, at: '' };
    for (let bank = -2; bank <= 4.001; bank += 0.25) for (let bankRate = -0.3; bankRate <= 0.8001; bankRate += 0.05) {
      const w = worst(cases, { bank, bankRate });
      if ((w.damping ?? -Infinity) > b.damping) b = { bank: r(bank, 2) as number, bankRate: r(bankRate, 2) as number, damping: w.damping as number, frequency: w.frequencyHz as number, at: w.at };
    }
    const g = { bank: b.bank, bankRate: b.bankRate };
    const holds = (f: number, delay: number) => (worst(cases, { bank: g.bank * f, bankRate: g.bankRate * f }, delay).damping as number) > 0;
    let up = 1; while (up < 8 && holds(up * 1.05, DELAY)) up *= 1.05;
    let down = 1; while (down > 0.02 && holds(down / 1.05, DELAY)) down /= 1.05;
    let delay = DELAY; while (delay < 0.4 && holds(1, delay + 0.005)) delay += 0.005;
    let shortest = DELAY; while (shortest > 0.01 && holds(1, shortest - 0.005)) shortest -= 0.005;
    emit({ part: 'gains', riders, best: b, gainScale: [r(down, 2), r(up, 2)], delayHolds: [r(shortest, 3), r(delay, 3)], bySpeed: bySpeed(riders[1] ?? riders[0], g) });
    // The grid around it, for the README.
    for (const bank of [-0.5, 0, 0.25, 0.5, 1]) for (const bankRate of [0, 0.05, 0.1, 0.15, 0.2, 0.3]) {
      emit({ part: 'grid', riders, bank, bankRate, ...worst(cases, { bank, bankRate }) });
    }
  }
  if (PARTS.includes('sens')) {
    // Each term of the plant scaled by 0 and 2 at 7 m/s (the tall body, the board's roll inertia 0.1), passive and with 3.2's gains, with and without the rider's yaw inertia.
    const keys = ['heelYaw', 'heelSide', 'heelRoll', 'slipYaw', 'slipSide', 'slipRoll', 'yawDamping', 'yawSide', 'yawRoll', 'rollRateYaw', 'rollRateSide', 'rollDamping', 'feetForward', 'feetStation', 'deckHeight', 'ankleStiffness', 'ankleDamping', 'boardMass', 'boardRollInertia'] as const;
    const v = Number(process.env.SPEED ?? 7);
    for (const ir of [0, 2.8]) for (const [name, g] of [['passive', { bank: 0, bankRate: 0 }], ['3.2', G32]] as const) {
      const base = yawPlant(v, ir, 0.84, 0.1);
      const at = (y: YawPlant) => { try { const m = humanYawModes(y, { delay: DELAY, motorLag: LAG }, g)[0]; return [r(m.damping, 3), r(m.frequency, 2)]; } catch { return null; } };
      const row: Record<string, unknown> = { part: 'sens', v, riderYawInertia: ir, law: name, base: at(base) };
      const low = (k: string) => (['boardMass', 'boardRollInertia', 'ankleStiffness'].includes(k) ? 0.5 : 0);
      for (const k of keys) row[k] = [at({ ...base, [k]: low(k) * (base[k] as number) }), at({ ...base, [k]: 2 * (base[k] as number) })];
      emit(row);
    }
  }
  if (PARTS.includes('box')) {
    // A seeded random search over the physical box: the ankle across 0.7–2.7 m g h (420–1,600 N·m/rad) and its damping
    // 40–320 N·m·s/rad (3.2's braced range), the delay 0.08–0.15 s, the motor lag 0.03–0.05 s, the rider's yaw inertia
    // over its postures (2.15–3.65 kg·m², or 0 for 3.2's), the gains on the bank and its rate. Each sample's worst over
    // 5, 7 and 9 m/s, the three stance heights and the board's roll inertia 0.03 and 0.3.
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const span = (a: number, b: number) => a + (b - a) * rand();
    const riders = process.env.BOX_RIDER === '0' ? [0, 0] : [2.15, 3.65];
    let bestRow: Record<string, unknown> = { damping: -Infinity };
    for (let i = 0; i < Number(process.env.SAMPLES ?? 400); i += 1) {
      const k = span(420, 1600); const c = span(40, 320); const delay = span(0.08, 0.15); const lag = span(0.03, 0.05);
      const ir = span(riders[0], riders[1]); const g = { bank: span(-2, 4), bankRate: span(-0.3, 0.8) };
      let w = Infinity; let at = '';
      for (const v of (process.env.BOX_SPEEDS ?? '5,7,9').split(',').map(Number)) for (const h of HEIGHTS) for (const ib of [0.03, 0.3]) {
        const y = { ...yawPlant(v, ir, h, ib), ankleStiffness: k, ankleDamping: c };
        let m;
        try { m = humanYawModes(y, { delay, motorLag: lag }, g)[0]; } catch { m = { damping: -Infinity, frequency: 0 }; }
        if (m.damping < w) { w = m.damping; at = `${v} m/s, h ${h}, Ib ${ib}`; }
        if (w < (bestRow.damping as number)) break;
      }
      if (w > (bestRow.damping as number)) bestRow = { damping: r(w, 3), at, k: r(k, 0), c: r(c, 0), delay: r(delay, 3), lag: r(lag, 3), riderYawInertia: r(ir, 2), ...g };
    }
    emit({ part: 'box', riders, best: bestRow });
  }
});
