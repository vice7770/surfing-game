/**
 * **Step 3.4i's static control: the hull's own ROLL STIFFNESS, on a bare board at planing speed, with no ride in it.**
 *
 * Part C of this round argues from a number that Part B produced as a **fit** — a least-squares slope of the hull's
 * roll moment against the board's heel over a trajectory, R² 0.51–0.82 — and a fit over a trajectory confounds the
 * heel with the speed, the trim, the depth and the face under the board. This file measures the same quantity with
 * none of those moving: a **bare board** (no rider, so nothing of the ride's dynamics is in it) on a flat free
 * surface, driven forward at a held speed and **held** at a heel about its own long axis, one cell per (speed, heel).
 * It is step 3.3m's own §4 static cell with two columns added — the roll ledger instead of the added-mass arrays, and
 * a forward speed instead of still water, because a planing hull's roll stiffness is a *hydrodynamic* quantity and
 * at zero speed only the hydrostatic part of it exists.
 *
 * **The instrument is the game's own roll ledger** (`BoardBody.rollLedger`, step 3.3h): each entry a mean torque over
 * the step, N·m, about **the board's own long axis** (board +z), positive lifting the +x rail [R, `BoardBody.ts`].
 * Step 3.3m measured that axis against `AttachedRider.rollAxis` at **0.674–0.911 against 0.699–0.932 kg·m², a 2–5 %
 * difference** [R], so the datum here and the datum in Part B are the same axis to within that, and the stiffness is
 * quoted on this one.
 *
 * **What is read, and what is derived.** `hull` is the sum of the six entries the water's own pressure field owns —
 * buoyancy, pressure, suction, friction, fins, rails — and is a **read**. `K` is the central difference of that sum
 * with respect to heel, N·m/rad, and is **derived from two reads**; it is a stiffness only in the sense that a
 * spring's `dτ/dφ` is, and it is quoted per interval rather than as one number, because nothing here assumes it is
 * linear. `addedMass`, `radiation` and `gyro` are printed but excluded from `hull`: the first two are the water's
 * *inertia and damping*, which resist a roll rate and not a roll angle, and the third is the board's own.
 *
 * Three honesties stated before the table is read:
 * 1. **A held pose is not a trimmed pose.** The board is re-placed every step, so it never settles to the sinkage and
 *    trim the same speed would give it freely, and the column `sink m` prints where its own centre sat so that is
 *    visible rather than assumed.
 * 2. **The free surface is flat.** `PlaneWater` has no face, no flow and no curvature, so this is the stiffness of a
 *    planing hull on calm water and not of one on the owner's own wave. Part B's fitted slope is the one on the wave,
 *    and the two are printed against each other in the README rather than one standing for the other.
 * 3. **One cell per (speed, heel), deterministically, so there is no population here to take a median over.** Every
 *    number below is a single value and is labelled as one.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.4/hull.ts -o <scratch>/hu.mjs --format esm --platform node
 *   node <scratch>/hu.mjs
 *
 * Env: `HEELS` (°, default 0,2,5,10,15,20,30), `SPEEDS` (m/s, default 0,4,6,8), `STEPS` (default 40).
 */
import { Quaternion, Vector3 } from 'three';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PlaneWater } from '../../../../src/physics/PlaneWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const HEELS = (process.env.HEELS ?? '0,2,5,10,15,20,30').split(',').map(Number);
const SPEEDS = (process.env.SPEEDS ?? '0,4,6,8').split(',').map(Number);
const STEPS = Number(process.env.STEPS ?? 40);

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const pad = (s: string, w: number) => s.padStart(w);
const out = (s: string) => process.stdout.write(`${s}\n`);

interface Cell { speed: number; heel: number; hull: number; buoyancy: number; pressure: number; suction: number; friction: number; fins: number; rails: number; added: number; radiation: number; gyro: number; total: number; wetted: number; sink: number }

function cell(speed: number, heel: number): Cell {
  const water = new PlaneWater({});
  const board = new BoardBody({});
  const axis = new Vector3(0, 0, 1);
  const q = new Quaternion().setFromAxisAngle(axis, heel / DEG);
  const velocity = new Vector3(0, 0, speed);
  BoardBody.rollLedger = true;
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), q, velocity.clone(), new Vector3(0, 0, 0));
  for (let i = 0; i < STEPS; i += 1) {
    // Held: the heel and the forward speed are re-imposed every step, so the read is at the pose asked for and not
    // wherever the hull settled. The height is left where the previous step put it, which is what `sink` prints.
    board.place(board.position.clone(), q, velocity.clone(), new Vector3(0, 0, 0));
    board.step(STEP, water);
  }
  const r = board.roll;
  BoardBody.rollLedger = false;
  return {
    speed, heel,
    hull: r.buoyancy + r.pressure + r.suction + r.friction + r.fins + r.rails,
    buoyancy: r.buoyancy, pressure: r.pressure, suction: r.suction, friction: r.friction, fins: r.fins, rails: r.rails,
    added: r.addedMass, radiation: r.radiation, gyro: r.gyro, total: r.total,
    wetted: board.wettedArea, sink: board.position.y - board.shape.centerOfMass.y,
  };
}

out('## The hull\'s own roll stiffness, bare board, held heel and held forward speed, flat free surface');
out('  (`hull` = buoyancy + pressure + suction + friction + fins + rails, N·m about the BOARD\'S OWN LONG AXIS, the');
out('   roll ledger\'s datum [R]; positive lifts the +x rail. `K` is the central difference of `hull` in heel,');
out('   N·m/rad, DERIVED from two reads. `added` and `radiation` resist a roll RATE, not an angle, and are excluded');
out('   from `hull` and printed beside it. One deterministic cell per row: there is no population here.)');
for (const speed of SPEEDS) {
  const rows = HEELS.map((h) => cell(speed, h));
  out(`\n### forward speed ${f(speed, 1)} m/s`);
  out(['heel °', 'hull N·m', 'K N·m/rad', 'pressure', 'buoyancy', 'suction', 'fins', 'rails', 'friction', 'addedMass', 'radiation', 'gyro', 'ledger total', 'wetted m²', 'sink m'].map((s, i) => pad(s, i ? 13 : 8)).join(''));
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    // The central difference where both neighbours exist, the one-sided one at the ends, in radians of heel.
    const lo = rows[Math.max(0, i - 1)];
    const hi = rows[Math.min(rows.length - 1, i + 1)];
    const dPhi = (hi.heel - lo.heel) / DEG;
    const k = dPhi > 0 ? (hi.hull - lo.hull) / dPhi : Number.NaN;
    out([f(r.heel, 1), f(r.hull, 2), f(k, 1), f(r.pressure, 2), f(r.buoyancy, 2), f(r.suction, 2), f(r.fins, 3),
      f(r.rails, 3), f(r.friction, 3), f(r.added, 2), f(r.radiation, 2), f(r.gyro, 3), f(r.total, 2),
      f(r.wetted, 4), f(r.sink, 4),
    ].map((s, i2) => pad(s, i2 ? 13 : 8)).join(''));
  }
  // The one derived figure Part C quotes, and the two reads it is made of, printed together.
  const first = rows[0];
  const last = rows[rows.length - 1];
  const chord = ((last.hull - first.hull) / (last.heel - first.heel)) * DEG;
  out(`  the chord over the whole sweep, 0 → ${f(last.heel, 0)}°: ${f(last.hull - first.hull, 2)} N·m over ${f((last.heel - first.heel) / DEG, 4)} rad = **${f(chord, 1)} N·m/rad** [A on two reads]`);
}
