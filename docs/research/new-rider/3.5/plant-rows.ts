/**
 * **Step 3.5w: the captive derivatives at the attitude the game's board rides** (`plant-rows.md` §3).
 *
 * MEASUREMENT ONLY; nothing under `src/` changes. `roll-plant/plant.ts`'s `Lab` (rigid 73 kg point rider, 32 substeps,
 * flat still water) and `rail-dig/settled.probe.ts`'s `frozen` procedure, copied unchanged (`force`, `ladder`): roll,
 * slip, yaw rate, pitch and the centre of mass's height held; central differences (roll ±1°, slip ±1°, yaw rate
 * ±0.1 rad/s, roll rate ±0.2 rad/s about the deck); each perturbation held HOLD s after BACK s of the base, the last
 * KEEP s kept, a ladder printed. One point per process:
 *
 *   V=4 TRIM=10.3 TAIL=0.101   the game's attitude: pitch = TRIM (deg, against the flat surface), the height set so the
 *                              rocker line 5 cm in from the tail sits TAIL m under the surface (`slow-take-off.ts`'s `tail`)
 *   V=5 TRIM=lab               the method control: the lab's own free trim (rail-dig's `trimAt` at rail 0, 8 s)
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/plant-rows.ts -o <s>/raw.mjs --format esm --platform node
 *   printf "globalThis.location = { search: '' };\n" > <s>/pr.mjs && cat <s>/raw.mjs >> <s>/pr.mjs
 *   env V=4 TRIM=10.3 TAIL=0.101 TAG=ride OUT=<s>/rows.jsonl node --max-old-space-size=3200 <s>/pr.mjs
 */
import { appendFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { DEG, Flat, G, GROUPS, Lab, STEP, r, sum, type Hold, type Ledger } from '../roll-plant/plant';

const V = Number(process.env.V ?? 4);
const TRIM = process.env.TRIM ?? 'lab';
const TAIL = Number(process.env.TAIL ?? 0.1);
const TAG = process.env.TAG ?? '';
/**
 * `ZW` (added after the first smoke run, see `plant-rows.md` §7): instead of TAIL, the tail immersion is searched
 * (bisection, 0.01–0.6 m) so that the hull's vertical force at the held attitude is ZW of the pair's weight: the
 * load-matched bracket, since at the game's geometry the flat-water lab carries far less of the weight than the
 * game's hull does on the face.
 */
const ZW = process.env.ZW !== undefined ? Number(process.env.ZW) : undefined;
const HOLD = Number(process.env.HOLD ?? 4);
const BACK = 0.8;
const WINDOW = 0.25;
const KEEP = 1;
const LADDER = [0.35, 0.6, 1, 1.5, 2, 3, 4];
const DECK = { x: 0, y: 0.07, z: -0.30 };
const water = new Flat();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function emit(line: unknown): void {
  const out = process.env.OUT;
  if (out) appendFileSync(out, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

/** rail-dig's `force`: [N about the centre of mass, Y level left, K about the deck along the long axis, M about the deck nose up, Z up]. */
function force(lab: Lab, book: Ledger): number[] {
  const { fwd, left } = lab.axes();
  const levelLeft = left.clone().setY(0).normalize();
  const deck = lab.board.toWorld(DECK, new Vector3());
  const arm = lab.board.centerOfMass.clone().sub(deck);
  const F = sum(book.force, GROUPS.all);
  const about = sum(book.moment, GROUPS.all);
  const atDeck = about.clone().add(arm.clone().cross(F));
  // The sixth: the drag, the force against the level heading (the tow's direction), N.
  const level = fwd.clone().setY(0).normalize();
  return [about.y, F.dot(levelLeft), atDeck.dot(fwd), -atDeck.dot(left), F.y, -F.dot(level)];
}

function windowMean(trace: number[][], endSeconds: number, width = WINDOW): number[] {
  const end = Math.min(trace.length, Math.round(endSeconds / STEP));
  const start = Math.max(0, end - Math.round(width / STEP));
  const out = new Array<number>(trace[0].length).fill(0);
  for (let i = start; i < end; i += 1) for (let k = 0; k < out.length; k += 1) out[k] += trace[i][k] / (end - start);
  return out;
}

/** rail-dig's `ladder`, unchanged in substance (no per-part split). */
function ladder(lab: Lab, base: Hold, lo: Hold, hi: Hold, step: number) {
  const run = (h: Hold) => {
    lab.hold = base;
    for (let i = 0; i < Math.round(BACK / STEP); i += 1) lab.frame();
    lab.hold = { ...base, ...h };
    const trace: number[][] = [];
    for (let i = 0; i < Math.round(HOLD / STEP); i += 1) trace.push(force(lab, lab.frame()));
    return trace;
  };
  const a = run(lo);
  const b = run(hi);
  const at = (t: number, width = WINDOW) => {
    const x = windowMean(a, t, width);
    const y = windowMean(b, t, width);
    return y.map((v, k) => r((v - x[k]) / step, 1)!);
  };
  const end = at(HOLD, KEEP);
  const first = at(HOLD - KEEP / 2, KEEP / 2);
  const second = at(HOLD, KEEP / 2);
  const ok = first.slice(0, 3).every((v, k) => Math.abs(second[k] - v) <= Math.max(3, 0.03 * Math.abs(end[k])));
  return { per: end, settled: ok, move: first.slice(0, 3).map((v, k) => r(second[k] - v, 1)), ladder: LADDER.filter((t) => t <= HOLD).map((t) => [t, ...at(t).slice(0, 3)]) };
}

/** The board's tail point (rocker line, 5 cm in from the tail) in the world. */
function tailPoint(lab: Lab): Vector3 {
  const s = lab.board.shape as Any;
  const L = s.length as number;
  const z = -L / 2 + 0.05;
  return lab.board.toWorld(new Vector3(0, s.curves.rocker(z / L + 0.5), z), new Vector3());
}
function nosePoint(lab: Lab): Vector3 {
  const s = lab.board.shape as Any;
  const L = s.length as number;
  const z = L / 2 - 0.05;
  return lab.board.toWorld(new Vector3(0, s.curves.rocker(z / L + 0.5), z), new Vector3());
}

const lab = new Lab(water, 'point');
let pitch0: number;
let y0: number;
const t0 = Date.now();
if (TRIM === 'lab') {
  // rail-dig's `settled` then `trimAt` at rail 0: 2.5 s towed, then 8 s with the roll held and the yaw and slip free.
  lab.place(V);
  lab.hold = { speed: V, roll: 0, yawRate: 0, slip: 0 };
  for (let i = 0; i < Math.round(2.5 / STEP); i += 1) lab.frame();
  lab.hold = { speed: V, roll: 0 };
  const ps: number[] = []; const ys: number[] = [];
  const n = Math.round(8 / STEP);
  for (let i = 0; i < n; i += 1) {
    lab.frame();
    if (i >= n - Math.round(2 / STEP)) { ps.push(lab.read().pitch); ys.push(lab.board.centerOfMass.y); }
  }
  pitch0 = ps.reduce((a, x) => a + x, 0) / ps.length / DEG;
  y0 = ys.reduce((a, x) => a + x, 0) / ys.length;
} else {
  pitch0 = Number(TRIM) / DEG;
  const heightFor = (tail: number): number => {
    lab.place(V, 0.08, pitch0);
    // The height that puts the tail point `tail` m under the surface (y = 0), at this pitch.
    return lab.board.centerOfMass.y + (-tail - tailPoint(lab).y);
  };
  if (ZW === undefined) y0 = heightFor(TAIL);
  else {
    const Wt = (73 + (lab.board as Any).mass) * G;
    const zAt = (tail: number): number => {
      const y = heightFor(tail);
      lab.hold = { speed: V, roll: 0, yawRate: 0, slip: 0, pitch: pitch0, height: y };
      const tr: number[][] = [];
      for (let i = 0; i < Math.round(0.4 / STEP); i += 1) tr.push(force(lab, lab.frame()));
      return windowMean(tr, 0.4, 0.2)[4] / Wt;
    };
    let lo = 0.01; let hi = 0.6;
    for (let k = 0; k < 14; k += 1) { const mid = (lo + hi) / 2; if (zAt(mid) < ZW) lo = mid; else hi = mid; }
    y0 = heightFor((lo + hi) / 2);
  }
}
const base: Hold = { speed: V, roll: 0, yawRate: 0, slip: 0, pitch: pitch0, height: y0 };
lab.hold = base;
const baseTrace: number[][] = [];
for (let i = 0; i < Math.round(1 / STEP); i += 1) baseTrace.push(force(lab, lab.frame()));
const b = windowMean(baseTrace, 1, 0.5);
const read = lab.read();
const W = (73 + (lab.board as Any).mass) * G;
const attitude = {
  pitchDeg: r(read.pitch, 3), heightM: r(y0, 4), draftM: r(read.draft, 4), tailM: r(-tailPoint(lab).y, 4), noseM: r(-nosePoint(lab).y, 4),
  wetM2: r((lab.board as Any).wettedArea, 3), subL: r((lab.board as Any).submergedVolume * 1000, 2),
  zOverW: r(b[4] / W, 3), dragN: r(b[5], 1), dragOverW: r(b[5] / W, 4), baseNYK: [r(b[0], 2), r(b[1], 2), r(b[2], 2)],
};
const out: Record<string, unknown> = { part: 'plant-rows', tag: TAG, v: V, trimAsked: TRIM, tailAsked: TRIM === 'lab' || ZW !== undefined ? null : TAIL, zwAsked: ZW ?? null, hold: HOLD, attitude };
const one = (name: string, lo: Hold, hi: Hold, step: number) => { out[name] = ladder(lab, base, lo, hi, step); };
one('roll', { roll: -1 / DEG }, { roll: 1 / DEG }, 2 / DEG);
one('slip', { slip: -1 / DEG }, { slip: 1 / DEG }, 2 / DEG);
one('yaw', { yawRate: -0.1 }, { yawRate: 0.1 }, 0.2);
one('rate', { rollRate: -0.2, rollAxis: DECK }, { rollRate: 0.2, rollAxis: DECK }, 0.4);
// The row in `PLANT_SPEEDS`' own shape, [N, Y, K] per rad, per rad, per rad/s, per rad/s.
const pick = (k: string) => ((out[k] as { per: number[] }).per.slice(0, 3));
out.row = { roll: pick('roll'), slip: pick('slip'), yaw: pick('yaw'), rate: pick('rate') };
out.seconds = r((Date.now() - t0) / 1000, 1);
emit(out);
