/**
 * Step 3.3m: **is the board's roll resistance right — against the sourced order, and against the body's own?**
 *
 * Step 3.3l closed with one recommendation and one condition on it (Part 35 §12 item 4):
 *
 * > *"Measure whether the board's roll resistance is right (0.5–1.1 kg·m² in the solve). My recommendation is (a) — a
 * > measurement before a change, and if the board's roll resistance is right then (b) the two-body rider is the only
 * > route left and we should stop looking for a tuning fix."*
 *
 * and it explained nine rounds of innocent ankle verdicts with one arithmetic line:
 *
 * > *"The board's roll inertia in the solve is 0.498–1.140 kg·m² against the body's `m L²` ≈ 52–54 kg·m² … a torque
 * > between them moves the lighter one, and the lighter one is the board by a factor of 46–109."*
 *
 * ## The one thing this probe is for, and why it needed a new read
 *
 * **0.498–1.140 kg·m² is a read of `BoardBody.system`, which is the board's own six rows BEFORE the rider is in
 * them.** `BoardBody.ts:1519–1525` copies rows 0–5 of `system` into `system8`/`system9` and **then** calls
 * `AttachedRider.coupleStanding`, which adds `m((a·b) δ_ij − b_i a_j)` to the same rotational block — about
 * `rollAxis` that is `m |a||b| ≈ m L²`, the very 52–54 kg·m² step 3.3l put on the other side of the ratio. Step
 * 3.3j's number is a correct read of the board alone; the ratio built on it compares a pre-coupling block with a
 * post-coupling body.
 *
 * So this probe reads **`A⁻¹` itself**, on the matrix the integrator inverts, by back-substituting three **unit**
 * right-hand sides through the same LU `bankLedger` already factors every substep (`bankLedger.ts`, step 3.3m's nine
 * read-only rows). There is no force in any of them: each is a property of the plant.
 *
 * - **the coupled roll inertia** `1 / rollDeckPer` — one unit of roll impulse on the board's rows, the deck's own
 *   roll out. kg·m². *This* is what a roll moment is divided by.
 * - **the ankle's own authority** `|ankleOwn / ankleRelative|` — one unit of ankle torque-impulse booked exactly as
 *   `coupleStanding` books it (row 7 alone, `1/L`), read in the ledger's own two halves. Step 3.3l measured the same
 *   ratio *through the ankle's actual torque*; here the torque is divided out, so the number is `A`'s alone.
 * - **the body's own end** `1 / ankleOwn` and `bodyHeld` = `A[7][7] · L²`, the body's roll inertia about the stance
 *   point as the matrix holds it, instead of inferred from `m L²`.
 * - **the paired counterfactual** `pair…` — the same torque with the board's reaction couple booked as well, kept so
 *   that "the reaction is carried by the kinematics because `u` is a relative coordinate" is read and not assumed.
 *
 * ## And the second question: is the `cos³φ` decay correct, or the frame error the advisor suspected?
 *
 * The advisor's roll-inertia consult (merged `5481822d`) flagged its own arithmetic as suspect:
 *
 * > *"`projection = |n·ν|` times `(r × ν)·x̂ = y cos φ` gives **cos³φ**, so ≈0.45 of its trim value at 40° and 0.13 at
 * > 60°, which is an artefact of pointing the whole water inertia at the **surface** normal and is worth naming."*
 *
 * and step 3.3j measured 0.053–0.167 kg·m² past 60° of rail against 0.582–1.196 near trim. Located in the code
 * [R, `BoardBody.ts:1352–1382`]: the water's inertia is pointed along the **water's own surface normal û**
 * (`sample.normalX…`), its magnitude scaled by `projection = |n̂·û|`, and assembled on the generalized direction
 * `[û, r × û]`. This probe reconstructs, off the **same stored arrays on the same substeps**, the plate-normal form
 *
 *     Σ (m_a / |n̂·û|) · ((r × n̂)·x̂)²
 *
 * — the plate's added mass on its own wetted beam, reacting along its own normal — and prints the ratio of the two
 * against the measured rail, so the `cos⁻³` claim is a measurement and not an algebraic assertion.
 *
 * ## The populations, named, and never pooled
 *
 * 1. **step 3.3k's and 3.3l's own unsteered arm**: the Canyon-matched `FaceWater` (1.4 m / 16° / 5.7 m/s, 2.6 m deep,
 *    the board 0.75 fronts ahead of the crest and 45° off the fall line), the stance held, the stick **never
 *    touched**, eight relative entry speeds × three stances, 9 s a run — 24 trajectories.
 * 2. **the owner's own low-speed cell** (`ENTRIES`): the same water and placement with the entry set **absolutely**
 *    at 1–6 m/s through the water × three stances — 18 runs. This is the bar.
 * 3. **the controls** (`MODE=dry|float`): a board lifted clear of the water, and a board on still water.
 *
 * Read-only: it drives the shipped inputs, reads public fields, names every private it reads, and turns on one
 * read-only ledger. Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.3/roll.ts -o <scratch>/rl.mjs --format esm --platform node
 *   RIDER=new FELT=deck node <scratch>/rl.mjs
 *
 * Env: `MODE=ride|dry|float`, `RIDER=new|old`, `STANCES`, `EXTRAS` (relative entries), `ENTRIES` (absolute entries,
 * m/s — when set, `EXTRAS` is ignored), `STEERS`, `SECONDS`, `FELT=deck`, `LEDGER=off`, `OUT`, `TRACE`.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { bankLedger } from '../../../../src/physics/bankLedger';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { PlaneWater } from '../../../../src/physics/PlaneWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
/** `AttachedRider`'s own MAX_BANK, °, restated so the probe never imports a private: the clamp 3.3k flagged. */
const MAX_BANK = 70;

const MODE = process.env.MODE === 'dry' ? 'dry' : process.env.MODE === 'float' ? 'float' : process.env.MODE === 'heel' ? 'heel' : 'ride';
/** `MODE=heel`: the static heel sweep, ° about the board's own long axis, the P4 control. */
const HEELS = (process.env.HEELS ?? '0,10,20,30,40,50,60,70').split(',').map(Number);
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
const SECONDS = Number(process.env.SECONDS ?? 9);
const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '-3,-2,-1,0,1,1.5,2,3').split(',').map(Number);
const ENTRIES = process.env.ENTRIES ? process.env.ENTRIES.split(',').map(Number) : null;
const STEERS = (process.env.STEERS ?? '0').split(',').map(Number);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE === '1';
const FELT = process.env.FELT === 'deck' ? 'deck' : undefined;
const LEDGER = process.env.LEDGER !== 'off';

type Stance = 'tall' | 'crouch' | 'compress';
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 4) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const median = (v: number[]) => qt(v, 0.5);
const span = (v: number[], d = 2) => { const s = sorted(v); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };
const count = (v: number[]) => v.filter(Number.isFinite).length;
/** `Math.max(...list, NaN)` is NaN for every list — this folder's own trap, avoided by hand. */
const peak = (v: number[]) => { const s = sorted(v); return s.length ? s[s.length - 1] : Number.NaN; };

/** As `fall.ts`, `bank.ts` and `deck.ts`: the deeper of crouch and Compress wins, so Compress holds the crouch at 0.6. */
function stanceInputs(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
}

function emit(line: unknown): void {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

/**
 * The board's own rows as `BoardBody.system` holds them AFTER the step — on the standing path the array survives,
 * because `coupleStanding` writes into a copy (`BoardBody.ts:1519–1525`). Step 3.3j's own read, on two axes, with
 * step 3.3j's own gate: every term of the assembly is symmetric and Gaussian elimination is not, so a substep whose
 * matrix was eliminated in place is rejected rather than pooled.
 */
interface Pre {
  /** `max|A_ij − A_ji| / max|A|` over the 6 × 6: 0 on an assembled matrix, large on an eliminated one. */
  asym: number;
  /** `r̂ᵀ A_rot r̂`, the board's rows alone, on the LEAN's own axis (`rollAxis`). kg·m². */
  preRoll: number;
  /** The same on the board's long axis — step 3.3j's own datum, for the like-for-like with its 0.498–1.140. */
  preRollLong: number;
  /** `r̂ᵀ I r̂` from `worldInertia` alone, the dry board, on the lean's axis. kg·m². */
  dryRoll: number;
  /** The shipped generalized added inertia on the lean's axis: `Σ (h·rad + m_a + entrained)((r × û)·r̂)²`. */
  addedSurface: number;
  /** The plate-normal reconstruction: `Σ ((h·rad + m_a + entrained) / |n̂·û|)((r × n̂)·r̂)²`, same arrays, same substep. */
  addedPlate: number;
  /** `Σ (h·rad + m_a + entrained)`, kg: the water's inertia the patches carry, so the arm it acts at can be read. */
  addedTotal: number;
  /** `Σ damping ((r × n̂)·r̂)²` and the substep, so `damp / h` is a roll damping in N·m·s/rad. */
  damp: number;
  h: number;
  /** The patches' own mean `|n̂·û|`, area-weighted by their added mass: the cosine the shipped form carries. */
  projection: number;
  wetted: number;
}

function readPre(board: BoardBody, ax: number, ay: number, az: number): Pre {
  const inner = board as unknown as {
    system: Float64Array; rotation: number[]; worldInertia: number[]; substepSpan: number; count: number;
    arm: Float64Array; normal: Float64Array; surfaceNormal: Float64Array;
    damping: Float64Array; addedMass: Float64Array; entrained: Float64Array; radiation: Float64Array;
  };
  const A = inner.system;
  const I = inner.worldInertia;
  let biggest = 0;
  let asym = 0;
  for (let i = 0; i < 6; i += 1) {
    for (let j = 0; j < 6; j += 1) {
      biggest = Math.max(biggest, Math.abs(A[i * 6 + j]));
      asym = Math.max(asym, Math.abs(A[i * 6 + j] - A[j * 6 + i]));
    }
  }
  const u = [ax, ay, az];
  const x = [inner.rotation[2], inner.rotation[5], inner.rotation[8]];
  let preRoll = 0;
  let preRollLong = 0;
  let dryRoll = 0;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      preRoll += u[i] * u[j] * A[(3 + i) * 6 + (3 + j)];
      preRollLong += x[i] * x[j] * A[(3 + i) * 6 + (3 + j)];
      dryRoll += u[i] * u[j] * I[i * 3 + j];
    }
  }
  const h = inner.substepSpan;
  let addedSurface = 0;
  let addedPlate = 0;
  let addedTotal = 0;
  let damp = 0;
  let weight = 0;
  let projection = 0;
  for (let k = 0; k < inner.count; k += 1) {
    const rx = inner.arm[k * 3];
    const ry = inner.arm[k * 3 + 1];
    const rz = inner.arm[k * 3 + 2];
    const nx = inner.normal[k * 3];
    const ny = inner.normal[k * 3 + 1];
    const nz = inner.normal[k * 3 + 2];
    const ux = inner.surfaceNormal[k * 3];
    const uy = inner.surfaceNormal[k * 3 + 1];
    const uz = inner.surfaceNormal[k * 3 + 2];
    // `(r × n̂)·r̂` and `(r × û)·r̂`: the two generalized arms, the hull's own normal and the water's surface normal.
    const cn = (ry * nz - rz * ny) * ax + (rz * nx - rx * nz) * ay + (rx * ny - ry * nx) * az;
    const cu = (ry * uz - rz * uy) * ax + (rz * ux - rx * uz) * ay + (rx * uy - ry * ux) * az;
    const inertia = h * inner.radiation[k] + inner.addedMass[k] + inner.entrained[k];
    if (inertia > 0) {
      addedSurface += inertia * cu * cu;
      // `projection` is not stored, but both normals are, so it is read back rather than assumed:
      // `addedMass[k] = ρ(π/8) b A_wet · |n̂·û|`, so dividing by `|n̂·û|` restores the plate's own beam.
      const p = Math.abs(nx * ux + ny * uy + nz * uz);
      if (p > 1e-6) addedPlate += (inertia / p) * cn * cn;
      weight += inertia;
      addedTotal += inertia;
      projection += inertia * p;
    }
    if (inner.damping[k] > 0) damp += inner.damping[k] * cn * cn;
  }
  return {
    asym: biggest > 0 ? asym / biggest : 0,
    preRoll,
    preRollLong,
    dryRoll,
    addedSurface,
    addedPlate,
    addedTotal,
    damp,
    h,
    projection: weight > 0 ? projection / weight : Number.NaN,
    wetted: board.wettedArea,
  };
}

interface Frame {
  t: number;
  through: number;
  roll: number;
  bank: number;
  rel: number;
  rail: number;
  clamped: number;
  apart: number;
  steps: number;
  /** The pre-coupling read, step 3.3j's quantity, on the lean's axis and on the board's long axis. */
  preRoll: number;
  preRollLong: number;
  dryRoll: number;
  asym: number;
  addedSurface: number;
  addedPlate: number;
  addedTotal: number;
  /** `√(addedSurface / addedTotal)`, m: the arm the water's roll inertia acts at, in the shipped form. */
  arm: number;
  plateRatio: number;
  wetted: number;
  projection: number;
  dampCoeff: number;
  /** **The coupled roll inertia**: `1 / (Δω·r̂)` for one unit of roll impulse on the board's rows. kg·m². */
  coupledRoll: number;
  /** Its joint half, `Δu̇ / L` per unit roll impulse: how much of a roll impulse the ankle's joint takes up. */
  rollRelative: number;
  /** The ankle's own unit response, the ledger's three columns, rad/s per N·m·s. */
  ankleOwn: number;
  ankleRelative: number;
  ankleDeck: number;
  /** `|ankleOwn / ankleRelative|`: the ankle's authority over the body's ABSOLUTE lean, from `A` alone. */
  authority: number;
  /** `1 / ankleOwn`, kg·m²: the inertia the ankle's own torque sees at the body. */
  bodyOwn: number;
  /** `A[7][7] · L²`, kg·m²: the body's own roll inertia about the stance point as the matrix holds it. */
  bodyHeld: number;
  /** `authority / (1 − authority)`: the board-to-body inertia ratio the measured authority implies. */
  impliedRatio: number;
  /**
   * `1 / |ankleDeck|`, kg·m². Derived before the probe ran, for a plant whose board is free to slide and roll:
   * an ankle torque τ rolls the deck at exactly `τ / I₀`, `I₀` the BOARD-ALONE roll inertia — so this column must
   * reproduce `preRoll` (`r̂ᵀ A_rot r̂` off `BoardBody.system`) and ties step 3.3j's pre-coupling read to the solve.
   */
  boardFromDeck: number;
  /** `bodyOwn / L²`, kg: the REDUCED mass across of body and board, which is what `bodyOwn` turns out to be made of. */
  reducedMass: number;
  /** `ankleOwn` in °/s² per N·m: the ankle's absolute authority over the body's lean, in the units of §2.3's table. */
  ankleAlpha: number;
  /** The leg's own length, m, the datum of every `/L` above. */
  legL: number;
  /** Step 3.3l's own instrument beside this one: the ankle's booked entry, its two halves, and the torque. */
  ownAnkle: number;
  relAnkle: number;
  deckAnkle: number;
  ankleTq: number;
  /** `|ownAnkle / relAnkle|`: step 3.3l's ratio, on this round's frames. P2a: it must equal `authority`. */
  bookedAuthority: number;
  /** The paired counterfactual's authority, and the linearity control P0a. */
  pairAuthority: number;
  linear: number;
  split: number;
  closure: number;
  residual: number;
  singular: number;
  /** Substeps the ledger skipped because the body was not banking: row 7 is a dummy there. */
  skipped: number;
}

function oneRun(st: Stance, extra: number, entry0: number | null, steer: number): Record<string, unknown> {
  bankLedger.on = LEDGER;
  AttachedRider.ankleLedger = true;
  const water = new FaceWater({ depth: DEPTH, height: FACE[0], slope: FACE[1], speed: FACE[2] });
  const sample = createWaterSample();
  const fall = new Vector3(0, 0, 1);
  const pz = water.crestZ() + AHEAD * water.front;
  const here = water.sampleAt(0, 50, pz, sample);
  const alongFlow = here.flowX * fall.x + here.flowZ * fall.z;
  const entry = entry0 ?? ((FACE[2] - alongFlow) / Math.cos(45 / DEG) + extra);
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(
    new Vector3(0, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(FELT ? { feltFrame: FELT } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  stanceInputs(rider, st);
  rider.steer = steer;

  const fwd = new Vector3();
  const side = new Vector3();
  const boardUp = new Vector3();
  const rollAxis = new Vector3();
  const nW = new Vector3();
  const frames: Frame[] = [];
  let fell = '';
  let fellAt = Number.NaN;

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    side.set(fwd.z, 0, -fwd.x);
    // `rollAxis` as `AttachedRider` builds it: `(0, 0, −1)` turned by the heading, yaw only. The ledger's own datum.
    rollAxis.set(-fwd.x, 0, -fwd.z);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y) * DEG;
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    const through = Math.hypot(board.velocity.x - (cen.outsideDomain ? 0 : cen.flowX), board.velocity.z - (cen.outsideDomain ? 0 : cen.flowZ));
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const tilt = Math.atan2(nW.dot(side), nW.y) * DEG;
    const bank = rider.bank.angle * DEG;
    const pre = readPre(board, rollAxis.x, rollAxis.y, rollAxis.z);
    const ankleOwn = LEDGER ? bankLedger.ankleOwn : Number.NaN;
    const ankleRelative = LEDGER ? bankLedger.ankleRelative : Number.NaN;
    const deckPer = LEDGER ? bankLedger.rollDeckPer : Number.NaN;
    const authority = Math.abs(ankleOwn / ankleRelative);
    const legL = Math.max(0.4, rider.leg.height + rider.leg.extension);
    const ownAnkle = LEDGER ? bankLedger.own.ankle * DEG : Number.NaN;
    const relAnkle = LEDGER ? bankLedger.relative.ankle * DEG : Number.NaN;
    frames.push({
      t,
      through,
      roll,
      bank,
      rel: bank - roll,
      rail: roll - tilt,
      clamped: Math.abs(bank) >= MAX_BANK - 1e-6 ? 1 : 0,
      apart: LEDGER ? bankLedger.apart : Number.NaN,
      steps: LEDGER ? bankLedger.steps : Number.NaN,
      preRoll: pre.preRoll,
      preRollLong: pre.preRollLong,
      dryRoll: pre.dryRoll,
      asym: pre.asym,
      addedSurface: pre.addedSurface,
      addedPlate: pre.addedPlate,
      addedTotal: pre.addedTotal,
      arm: pre.addedTotal > 0 ? Math.sqrt(pre.addedSurface / pre.addedTotal) : Number.NaN,
      wetted: pre.wetted,
      plateRatio: pre.addedSurface > 0 ? pre.addedPlate / pre.addedSurface : Number.NaN,
      projection: pre.projection,
      dampCoeff: pre.h > 0 ? pre.damp / pre.h : Number.NaN,
      coupledRoll: 1 / deckPer,
      rollRelative: LEDGER ? bankLedger.rollRelativePer : Number.NaN,
      ankleOwn,
      ankleRelative,
      ankleDeck: LEDGER ? bankLedger.ankleDeck : Number.NaN,
      authority,
      bodyOwn: 1 / ankleOwn,
      bodyHeld: LEDGER ? bankLedger.bodyHeld : Number.NaN,
      impliedRatio: authority / (1 - authority),
      boardFromDeck: LEDGER ? 1 / Math.abs(bankLedger.ankleDeck) : Number.NaN,
      reducedMass: (1 / ankleOwn) / (legL * legL),
      ankleAlpha: ankleOwn * DEG,
      legL,
      ownAnkle,
      relAnkle,
      deckAnkle: LEDGER ? bankLedger.deck.ankle * DEG : Number.NaN,
      ankleTq: rider.ankle.substeps > 0 ? rider.ankle.torque : Number.NaN,
      bookedAuthority: Math.abs(ownAnkle / relAnkle),
      pairAuthority: LEDGER ? Math.abs(bankLedger.pairOwn / bankLedger.pairRelative) : Number.NaN,
      // P0a, the linearity control: the three unit solves go through one `A⁻¹`, so
      // `pairOwn = ankleOwn − (rollRelativePer + rollDeckPer)` identically. Reported relative to the largest term.
      linear: LEDGER
        ? Math.abs(bankLedger.pairOwn - (bankLedger.ankleOwn - (bankLedger.rollRelativePer + bankLedger.rollDeckPer)))
          / Math.max(1e-30, Math.abs(bankLedger.pairOwn), Math.abs(bankLedger.ankleOwn))
        : Number.NaN,
      split: LEDGER ? bankLedger.split : Number.NaN,
      closure: LEDGER ? bankLedger.closure : Number.NaN,
      residual: LEDGER ? bankLedger.residual : Number.NaN,
      singular: LEDGER ? bankLedger.singular : Number.NaN,
      skipped: LEDGER ? bankLedger.unitSkipped : Number.NaN,
    });
    // `attached` is the test (step 3.3f §1): `separate` leaves `phase` and `upright` untouched.
    if (!rider.attached || !rider.upright || rider.phase !== 'standing') {
      fell = rider.attached ? rider.phase : (rider.separation ?? 'separated');
      fellAt = t;
      break;
    }
  }
  bankLedger.on = false;

  if (TRACE) {
    process.stdout.write(`# TRACE ${RIDER} ${st} entry=${f(entry, 3)} steer=${steer} felt=${FELT ?? 'world'}\n`);
    const keys = Object.keys(frames[0]);
    process.stdout.write(`${keys.join('\t')}\n`);
    for (const x of frames) {
      const row = x as unknown as Record<string, number>;
      process.stdout.write(`${keys.map((k) => (Number.isFinite(row[k]) ? row[k].toFixed(6) : 'NaN')).join('\t')}\n`);
    }
  }

  // Every window starts after 0.2 s: the placement's contact transient, as every probe in this folder.
  // The clamp (`AttachedRider.frame` hard-clamps the measured bank at MAX_BANK, a known defect, queued, not this
  // round's) is excluded frame by frame and the count published. `clean` keeps only the substeps the standing
  // 8×8/9×9 decided whole, which are the only ones whose `A` the unit reads describe.
  const live = frames.filter((x) => x.t > 0.2 && x.clamped === 0);
  // **`clean` is the only window the unit reads describe**: the standing 8×8/9×9 decided every substep of the frame
  // (`apart === 0`) AND the body was banking on every one of them (`skipped === 0`), so row 7 was the ankle's.
  const clean = live.filter((x) => x.apart === 0 && x.skipped === 0);
  const trim = clean.filter((x) => Math.abs(x.rail) < 10);
  const steep = clean.filter((x) => Math.abs(x.rail) > 60);
  const end = frames[frames.length - 1];
  const out: Record<string, unknown> = {
    mode: MODE,
    rider: RIDER,
    stance: st,
    extra: entry0 === null ? extra : null,
    entryAsked: entry0,
    entry: r(entry, 3),
    steer,
    felt: FELT ?? 'world',
    ledger: LEDGER ? 'on' : 'off',
    fell,
    fellAt: r(fellAt, 3),
    frames: frames.length,
    liveFrames: live.length,
    cleanFrames: clean.length,
    cleanShare: r(clean.length / Math.max(1, live.length), 3),
    clampedFrames: frames.filter((x) => x.clamped === 1).length,
    throughFirst: r(frames.filter((x) => x.t > 0.2)[0]?.through ?? Number.NaN, 3),
    throughFall: r(end?.through ?? Number.NaN, 3),
    rollFall: r(end?.roll ?? Number.NaN, 2),
    bankFall: r(end?.bank ?? Number.NaN, 2),
    railFall: r(end?.rail ?? Number.NaN, 2),
    railMedian: r(median(clean.map((x) => Math.abs(x.rail))), 1),
    railPeak: r(peak(clean.map((x) => Math.abs(x.rail))), 1),
  };
  if (!LEDGER) return out;
  // ---- the pre-coupling read: step 3.3j's quantity, on two axes, with step 3.3j's own symmetry gate.
  out.asymPeakClean = r(peak([0, ...clean.map((x) => x.asym)]), 15);
  out.preRollMedian = r(median(clean.map((x) => x.preRoll)), 4);
  out.preRollSpan = span(clean.map((x) => x.preRoll), 4);
  out.preRollLongMedian = r(median(clean.map((x) => x.preRollLong)), 4);
  out.preRollTrim = r(median(trim.map((x) => x.preRoll)), 4);
  out.preRollSteep = steep.length ? r(median(steep.map((x) => x.preRoll)), 4) : null;
  out.trimN = trim.length;
  out.steepN = steep.length;
  out.dryRollMedian = r(median(clean.map((x) => x.dryRoll)), 6);
  out.dampCoeffMedian = r(median(clean.map((x) => x.dampCoeff)), 2);
  out.dampCoeffTrim = r(median(trim.map((x) => x.dampCoeff)), 2);
  // ---- the coupled read: what the integrator actually divides by.
  out.coupledRollMedian = r(median(clean.map((x) => x.coupledRoll)), 3);
  out.coupledRollSpan = span(clean.map((x) => x.coupledRoll), 3);
  out.coupledRollTrim = r(median(trim.map((x) => x.coupledRoll)), 3);
  out.coupledRollSteep = steep.length ? r(median(steep.map((x) => x.coupledRoll)), 3) : null;
  out.coupledOverPre = r(median(clean.map((x) => x.coupledRoll / x.preRoll)), 2);
  out.rollRelativeMedian = r(median(clean.map((x) => x.rollRelative)), 6);
  // ---- the ankle's own authority, from `A` alone.
  out.authorityMedian = r(median(clean.map((x) => x.authority)), 4);
  out.authoritySpan = span(clean.map((x) => x.authority), 4);
  out.authorityTrim = r(median(trim.map((x) => x.authority)), 4);
  out.authoritySteep = steep.length ? r(median(steep.map((x) => x.authority)), 4) : null;
  out.authorityMax = r(peak(clean.map((x) => x.authority)), 4);
  out.pairAuthorityMedian = r(median(clean.map((x) => x.pairAuthority)), 4);
  // ---- the two ends of the ratio, both read off the matrix.
  out.bodyOwnMedian = r(median(clean.map((x) => x.bodyOwn)), 3);
  out.bodyOwnSpan = span(clean.map((x) => x.bodyOwn), 3);
  out.bodyHeldMedian = r(median(clean.map((x) => x.bodyHeld)), 3);
  out.bodyOwnVsHeld = r(median(clean.map((x) => x.bodyOwn / x.bodyHeld)), 4);
  out.impliedRatioMedian = r(median(clean.map((x) => x.impliedRatio)), 4);
  out.impliedRatioSpan = span(clean.map((x) => x.impliedRatio), 4);
  // `impliedBoard` is the board-side inertia the measured authority implies, against the body's own EFFECTIVE one
  // (`bodyOwn`, `1/ankleOwn`) — not against the matrix's diagonal `A[7][7]·L²`, which is a different quantity.
  out.impliedBoardMedian = r(median(clean.map((x) => x.impliedRatio * x.bodyOwn)), 3);
  out.impliedOverPre = r(median(clean.map((x) => (x.impliedRatio * x.bodyOwn) / x.preRoll)), 3);
  // The derived identity, measured: `1/|ankleDeck|` must be the BOARD-ALONE roll inertia `preRoll`.
  out.boardFromDeckMedian = r(median(clean.map((x) => x.boardFromDeck)), 4);
  out.deckVsPre = r(median(clean.map((x) => x.boardFromDeck / x.preRoll)), 4);
  out.deckVsPreSpan = span(clean.map((x) => x.boardFromDeck / x.preRoll), 4);
  out.reducedMassMedian = r(median(clean.map((x) => x.reducedMass)), 3);
  out.reducedMassSpan = span(clean.map((x) => x.reducedMass), 3);
  out.legLMedian = r(median(clean.map((x) => x.legL)), 4);
  // The ankle's absolute authority in the units of step 3.3l §2.3's own table, and the torque it actually delivered.
  out.ankleAlphaMedian = r(median(clean.map((x) => x.ankleAlpha)), 1);
  out.ankleAlphaSpan = span(clean.map((x) => x.ankleAlpha), 1);
  out.ankleTqMedian = r(median(clean.map((x) => x.ankleTq)), 2);
  out.ankleTqAbsMedian = r(median(clean.map((x) => Math.abs(x.ankleTq))), 2);
  out.ankleTqAbsPeak = r(peak(clean.map((x) => Math.abs(x.ankleTq))), 2);
  // Step 3.3l's own instrument on this round's frames: P2a, the two must agree.
  out.ownAnkleMedian = r(median(clean.map((x) => x.ownAnkle)), 1);
  out.relAnkleMedian = r(median(clean.map((x) => x.relAnkle)), 1);
  out.deckAnkleMedian = r(median(clean.map((x) => x.deckAnkle)), 1);
  out.bookedAuthorityMedian = r(median(clean.map((x) => x.bookedAuthority)), 4);
  out.bookedVsUnit = r(median(clean.map((x) => x.bookedAuthority - x.authority)), 6);
  out.bookedVsUnitPeak = r(peak(clean.map((x) => Math.abs(x.bookedAuthority - x.authority))), 6);
  // The same gap on the frames where the booked ratio HAS a denominator: `relAnkle` passing through zero makes
  // `|own/relative|` blow up with no bug in either instrument, so those frames are named and excluded here.
  const lively = clean.filter((x) => Math.abs(x.relAnkle) > 10);
  out.livelyFrames = lively.length;
  out.bookedVsUnitLively = r(median(lively.map((x) => Math.abs(x.bookedAuthority - x.authority))), 6);
  out.bookedVsUnitLivelyPeak = r(peak(lively.map((x) => Math.abs(x.bookedAuthority - x.authority))), 6);
  // And the ankle's booked entry against the plant's own response times the torque it delivered, which is what the
  // entry is made of: `own.ankle ≈ −τ · ankleOwn` (both step means, so the agreement is not an identity).
  out.ankleEntryVsPlant = r(median(clean.map((x) => x.ownAnkle / (-x.ankleTq * x.ankleAlpha))), 3);
  // ---- the cos³ question: the plate-normal reconstruction against the shipped surface-normal one.
  out.addedSurfaceMedian = r(median(clean.map((x) => x.addedSurface)), 4);
  out.addedPlateMedian = r(median(clean.map((x) => x.addedPlate)), 4);
  out.plateRatioMedian = r(median(clean.map((x) => x.plateRatio)), 3);
  out.plateRatioTrim = r(median(trim.map((x) => x.plateRatio)), 3);
  out.plateRatioSteep = steep.length ? r(median(steep.map((x) => x.plateRatio)), 3) : null;
  out.addedPlateTrim = r(median(trim.map((x) => x.addedPlate)), 4);
  out.addedPlateSteep = steep.length ? r(median(steep.map((x) => x.addedPlate)), 4) : null;
  out.addedSurfaceSteep = steep.length ? r(median(steep.map((x) => x.addedSurface)), 4) : null;
  out.projectionMedian = r(median(clean.map((x) => x.projection)), 4);
  out.wettedMedian = r(median(clean.map((x) => x.wetted)), 4);
  out.wettedTrim = r(median(trim.map((x) => x.wetted)), 4);
  out.addedTotalMedian = r(median(clean.map((x) => x.addedTotal)), 2);
  out.addedTotalTrim = r(median(trim.map((x) => x.addedTotal)), 2);
  out.armMedian = r(median(clean.map((x) => x.arm)), 4);
  out.armTrim = r(median(trim.map((x) => x.arm)), 4);
  // The `cos⁻³` law itself, measured: the ratio against `cos⁻³` of the frame's own rail, per frame.
  const law = clean.filter((x) => Number.isFinite(x.plateRatio) && Math.abs(x.rail) < 89)
    .map((x) => x.plateRatio * Math.cos(Math.abs(x.rail) / DEG) ** 3);
  out.lawMedian = r(median(law), 3);
  out.lawSpan = span(law, 3);
  out.lawN = count(law);
  // ---- the controls.
  out.linearMax = r(peak([0, ...clean.map((x) => x.linear)]), 15);
  out.splitMax = r(peak(frames.map((x) => x.split)), 15);
  out.closureMax = r(peak(frames.map((x) => x.closure)), 15);
  out.residualMax = r(peak(frames.map((x) => x.residual)), 15);
  out.apartSubsteps = frames.reduce((a, x) => a + x.apart, 0);
  out.bookedSubsteps = frames.reduce((a, x) => a + x.steps, 0);
  out.singularMax = peak(frames.map((x) => x.singular));
  out.skippedSubsteps = frames.reduce((a, x) => a + x.skipped, 0);
  return out;
}

/** The dry and float controls: a board lifted clear of the water, and a board on still water, with a standing rider. */
function control(dry: boolean): Record<string, unknown> {
  bankLedger.on = LEDGER;
  const water = new PlaneWater({});
  const board = new BoardBody({});
  board.place(
    new Vector3(0, (dry ? 4 : 0) + board.shape.centerOfMass.y, 0),
    new Quaternion(),
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  const fwd = new Vector3();
  const rollAxis = new Vector3();
  const reads: Pre[] = [];
  const rows: Record<string, number>[] = [];
  for (let i = 0; i < (dry ? 4 : 30); i += 1) {
    board.step(STEP, water);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    rollAxis.set(-fwd.x, 0, -fwd.z);
    reads.push(readPre(board, rollAxis.x, rollAxis.y, rollAxis.z));
    rows.push({
      coupledRoll: 1 / bankLedger.rollDeckPer,
      authority: Math.abs(bankLedger.ankleOwn / bankLedger.ankleRelative),
      bodyOwn: 1 / bankLedger.ankleOwn,
      bodyHeld: bankLedger.bodyHeld,
      pairAuthority: Math.abs(bankLedger.pairOwn / bankLedger.pairRelative),
      steps: bankLedger.steps,
      apart: bankLedger.apart,
      skipped: bankLedger.unitSkipped,
    });
  }
  bankLedger.on = false;
  const last = reads[reads.length - 1];
  const lastRow = rows[rows.length - 1];
  return {
    mode: dry ? 'dry' : 'float',
    rider: RIDER,
    steps: reads.length,
    mass: (board as unknown as { mass: number }).mass,
    asymPeak: r(peak(reads.map((x) => x.asym)), 15),
    preRoll: r(last.preRoll, 6),
    preRollLong: r(last.preRollLong, 6),
    dryRoll: r(last.dryRoll, 6),
    addedSurface: r(last.addedSurface, 6),
    addedPlate: r(last.addedPlate, 6),
    plateRatio: r(last.addedSurface > 0 ? last.addedPlate / last.addedSurface : Number.NaN, 4),
    projection: r(last.projection, 6),
    wetted: r(last.wetted, 4),
    coupledRoll: r(lastRow.coupledRoll, 4),
    authority: r(lastRow.authority, 6),
    bodyOwn: r(lastRow.bodyOwn, 4),
    bodyHeld: r(lastRow.bodyHeld, 4),
    pairAuthority: r(lastRow.pairAuthority, 6),
    bookedSubsteps: lastRow.steps,
    apart: lastRow.apart,
    notBanking: lastRow.skipped,
    coupledRollSpan: span(rows.map((x) => x.coupledRoll), 4),
    authoritySpan: span(rows.map((x) => x.authority), 5),
  };
}

/**
 * **`MODE=heel`: the static control for P4, which separates the cosines from the area.**
 *
 * A bare board (no rider, so nothing of the ride's dynamics is in it) dropped on still water at a **held** heel about
 * its own long axis, one cell per angle. The two forms are then read off the same arrays at the same heel, so the
 * ratio between them is the cosines alone — while the wetted area is printed beside it, because an area that shrinks
 * with heel is a second, legitimate reason the shipped inertia falls and must not be credited to the cosines.
 *
 * With no rider the solve takes `solve6`, which eliminates `system` in place, so `preRoll` is NOT read here (step
 * 3.3j's gate would reject it); only the patch arrays are read, and they are written before the solve.
 */
function heelSweep(): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const heel of HEELS) {
    const water = new PlaneWater({});
    const board = new BoardBody({});
    const x = new Vector3(0, 0, 1);
    board.place(
      new Vector3(0, board.shape.centerOfMass.y, 0),
      new Quaternion().setFromAxisAngle(x, heel / DEG),
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 0),
    );
    // Held: the heel is re-imposed every step, so the read is at the angle asked and not wherever it settled.
    let last: Pre | undefined;
    for (let i = 0; i < 30; i += 1) {
      board.place(
        board.position.clone(),
        new Quaternion().setFromAxisAngle(x, heel / DEG),
        new Vector3(0, 0, 0),
        new Vector3(0, 0, 0),
      );
      board.step(STEP, water);
      last = readPre(board, 0, 0, 1);
    }
    const p = last!;
    const c = Math.cos(heel / DEG);
    out.push({
      mode: 'heel',
      heel,
      wetted: r(p.wetted, 4),
      projection: r(p.projection, 4),
      addedTotal: r(p.addedTotal, 2),
      addedSurface: r(p.addedSurface, 5),
      addedPlate: r(p.addedPlate, 5),
      plateRatio: r(p.addedSurface > 0 ? p.addedPlate / p.addedSurface : Number.NaN, 3),
      cosCubedInverse: r(1 / (c * c * c), 3),
      law: r(p.addedSurface > 0 ? (p.addedPlate / p.addedSurface) * c * c * c : Number.NaN, 3),
      arm: r(p.addedTotal > 0 ? Math.sqrt(p.addedSurface / p.addedTotal) : Number.NaN, 4),
      armPlate: r(p.addedTotal > 0 ? Math.sqrt(p.addedPlate / p.addedTotal) : Number.NaN, 4),
    });
  }
  return out;
}

if (MODE === 'heel') {
  const rows = heelSweep();
  for (const row of rows) emit(row);
  const lines = [
    "# step 3.3m, P4's static control: a BARE board on still water at a HELD heel about its own long axis.",
    '# the shipped generalized added roll inertia (surface normal, area x |n.u|) against the PLATE-normal form',
    '# (own normal, own wetted area), off the same arrays at the same heel. No rider: the ride is not in this cell.',
    '',
    '| heel ° | wetted m² | the patches own \\|n.u\\| | water inertia kg | shipped kg·m² | plate kg·m² | ratio | cos^-3 | ratio x cos^3 | arm m | plate arm m |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((x) => `| ${x.heel} | ${x.wetted} | ${x.projection} | ${x.addedTotal} | ${x.addedSurface} | ${x.addedPlate} | ${x.plateRatio} | ${x.cosCubedInverse} | ${x.law} | ${x.arm} | ${x.armPlate} |`),
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
  if (OUT) appendFileSync(OUT, `${lines.join('\n')}\n`);
} else if (MODE !== 'ride') {
  emit(control(MODE === 'dry'));
} else {
  const rows: Record<string, unknown>[] = [];
  for (const st of STANCES) {
    for (const e of ENTRIES ?? EXTRAS) {
      for (const steer of STEERS) {
        const row = ENTRIES ? oneRun(st, Number.NaN, e, steer) : oneRun(st, e, null, steer);
        rows.push(row);
        emit(row);
      }
    }
  }
  // `Number(null) === 0` — this folder's own named trap. A run with no frames in a window writes `null`, and a
  // null read as a zero would drag every "past 60°" median to 0.000. Nulls are dropped, not counted.
  const num = (k: string) => rows
    .map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])))
    .filter(Number.isFinite);
  const head = `# step 3.3m — the roll resistance both ends, read off the matrix the integrator inverts.`;
  const lines = [
    head,
    `# cell: ${ENTRIES ? `ABSOLUTE entries ${ENTRIES.join(',')} m/s (the owner's own low-speed cell)` : `relative entries ${EXTRAS.join(',')}`} x ${STANCES.join(',')} x steer ${STEERS.join(',')}; felt=${FELT ?? 'world'}; rider=${RIDER}; ledger=${LEDGER ? 'on' : 'off'}`,
    `# n = ${rows.length} runs. FaceWater ${FACE.join('/')} , ${DEPTH} m deep — a FIT to Canyon, not Canyon.`,
    '',
    `| what | n | median | span |`,
    `|---|---|---|---|`,
    `| the ride ended | ${rows.filter((x) => x.fell).length} of ${rows.length} | — | ${span(num('fellAt'), 3)} s |`,
    `| … as a balance fall | ${rows.filter((x) => x.fell === 'balance').length} | — | — |`,
    `| the speed through the water at the fall, m/s | ${rows.length} | ${f(median(num('throughFall')), 2)} | ${span(num('throughFall'), 2)} |`,
    `| the rail at the fall, ° | ${rows.length} | ${f(median(num('railFall')), 1)} | ${span(num('railFall'), 1)} |`,
    `| clean frames, share of live | ${rows.length} | ${f(median(num('cleanShare')), 3)} | ${span(num('cleanShare'), 3)} |`,
    `| **the board ALONE, r̂ᵀA_rot r̂ (3.3j's quantity), kg·m²** | ${count(num('preRollMedian'))} | ${f(median(num('preRollMedian')), 3)} | ${span(num('preRollMedian'), 3)} |`,
    `| … the same on the board's LONG axis (3.3j's datum) | ${count(num('preRollLongMedian'))} | ${f(median(num('preRollLongMedian')), 3)} | ${span(num('preRollLongMedian'), 3)} |`,
    `| … near trim (rail < 10°) | ${count(num('preRollTrim'))} | ${f(median(num('preRollTrim')), 3)} | ${span(num('preRollTrim'), 3)} |`,
    `| … past 60° of rail | ${count(num('preRollSteep'))} | ${f(median(num('preRollSteep')), 3)} | ${span(num('preRollSteep'), 3)} |`,
    `| the dry board, r̂ᵀIr̂, kg·m² | ${count(num('dryRollMedian'))} | ${f(median(num('dryRollMedian')), 4)} | ${span(num('dryRollMedian'), 4)} |`,
    `| the hull's roll damping, N·m·s/rad | ${count(num('dampCoeffMedian'))} | ${f(median(num('dampCoeffMedian')), 1)} | ${span(num('dampCoeffMedian'), 1)} |`,
    `| **the COUPLED roll inertia, 1/(Δω·r̂), kg·m²** | ${count(num('coupledRollMedian'))} | ${f(median(num('coupledRollMedian')), 2)} | ${span(num('coupledRollMedian'), 2)} |`,
    `| … near trim | ${count(num('coupledRollTrim'))} | ${f(median(num('coupledRollTrim')), 2)} | ${span(num('coupledRollTrim'), 2)} |`,
    `| … past 60° of rail | ${count(num('coupledRollSteep'))} | ${f(median(num('coupledRollSteep')), 2)} | ${span(num('coupledRollSteep'), 2)} |`,
    `| … over the board-alone read | ${count(num('coupledOverPre'))} | ${f(median(num('coupledOverPre')), 1)} | ${span(num('coupledOverPre'), 1)} |`,
    `| **the ankle's authority \\|own/relative\\|, from A alone** | ${count(num('authorityMedian'))} | ${f(median(num('authorityMedian')), 3)} | ${span(num('authorityMedian'), 3)} |`,
    `| … near trim | ${count(num('authorityTrim'))} | ${f(median(num('authorityTrim')), 3)} | ${span(num('authorityTrim'), 3)} |`,
    `| … past 60° of rail | ${count(num('authoritySteep'))} | ${f(median(num('authoritySteep')), 3)} | ${span(num('authoritySteep'), 3)} |`,
    `| … the paired counterfactual's | ${count(num('pairAuthorityMedian'))} | ${f(median(num('pairAuthorityMedian')), 3)} | ${span(num('pairAuthorityMedian'), 3)} |`,
    `| **the body's own, 1/ankleOwn, kg·m²** | ${count(num('bodyOwnMedian'))} | ${f(median(num('bodyOwnMedian')), 2)} | ${span(num('bodyOwnMedian'), 2)} |`,
    `| **the body's own as HELD, A[7][7]·L², kg·m²** | ${count(num('bodyHeldMedian'))} | ${f(median(num('bodyHeldMedian')), 2)} | ${span(num('bodyHeldMedian'), 2)} |`,
    `| … their ratio (P1a: 1.00) | ${count(num('bodyOwnVsHeld'))} | ${f(median(num('bodyOwnVsHeld')), 4)} | ${span(num('bodyOwnVsHeld'), 4)} |`,
    `| **the inertia ratio the authority implies, I_board/I_body** | ${count(num('impliedRatioMedian'))} | ${f(median(num('impliedRatioMedian')), 3)} | ${span(num('impliedRatioMedian'), 3)} |`,
    `| … as a board inertia (× bodyOwn), kg·m² | ${count(num('impliedBoardMedian'))} | ${f(median(num('impliedBoardMedian')), 3)} | ${span(num('impliedBoardMedian'), 3)} |`,
    `| … over the board-alone read | ${count(num('impliedOverPre'))} | ${f(median(num('impliedOverPre')), 3)} | ${span(num('impliedOverPre'), 3)} |`,
    `| **1/\\|ankleDeck\\|, kg·m² — must BE the board-alone read** | ${count(num('boardFromDeckMedian'))} | ${f(median(num('boardFromDeckMedian')), 3)} | ${span(num('boardFromDeckMedian'), 3)} |`,
    `| … over the board-alone read (derived: 1.000) | ${count(num('deckVsPre'))} | ${f(median(num('deckVsPre')), 4)} | ${span(num('deckVsPre'), 4)} |`,
    `| the REDUCED mass across, bodyOwn/L², kg | ${count(num('reducedMassMedian'))} | ${f(median(num('reducedMassMedian')), 2)} | ${span(num('reducedMassMedian'), 2)} |`,
    `| the leg's own length L, m | ${count(num('legLMedian'))} | ${f(median(num('legLMedian')), 3)} | ${span(num('legLMedian'), 3)} |`,
    `| **the ankle's absolute authority, °/s² per N·m** | ${count(num('ankleAlphaMedian'))} | ${f(median(num('ankleAlphaMedian')), 0)} | ${span(num('ankleAlphaMedian'), 0)} |`,
    `| the ankle torque actually delivered, \\|N·m\\| | ${count(num('ankleTqAbsMedian'))} | ${f(median(num('ankleTqAbsMedian')), 2)} | ${span(num('ankleTqAbsMedian'), 2)} |`,
    `| … its peak over the ride, \\|N·m\\| | ${count(num('ankleTqAbsPeak'))} | ${f(median(num('ankleTqAbsPeak')), 2)} | ${span(num('ankleTqAbsPeak'), 2)} |`,
    `| **3.3l's own booked ankle ratio, same frames (P2a)** | ${count(num('bookedAuthorityMedian'))} | ${f(median(num('bookedAuthorityMedian')), 3)} | ${span(num('bookedAuthorityMedian'), 3)} |`,
    `| … its gap to the unit read, peak | ${count(num('bookedVsUnitPeak'))} | ${f(median(num('bookedVsUnitPeak')), 6)} | ${span(num('bookedVsUnitPeak'), 6)} |`,
    `| … the same where \|relAnkle\| > 10 °/s², median | ${count(num('bookedVsUnitLively'))} | ${f(median(num('bookedVsUnitLively')), 6)} | ${span(num('bookedVsUnitLively'), 6)} |`,
    `| … the same, peak | ${count(num('bookedVsUnitLivelyPeak'))} | ${f(median(num('bookedVsUnitLivelyPeak')), 6)} | ${span(num('bookedVsUnitLivelyPeak'), 6)} |`,
    `| the ankle's booked entry over −τ·plant (≈1) | ${count(num('ankleEntryVsPlant'))} | ${f(median(num('ankleEntryVsPlant')), 3)} | ${span(num('ankleEntryVsPlant'), 3)} |`,
    `| the shipped added roll inertia, surface normal, kg·m² | ${count(num('addedSurfaceMedian'))} | ${f(median(num('addedSurfaceMedian')), 3)} | ${span(num('addedSurfaceMedian'), 3)} |`,
    `| the PLATE-normal reconstruction, kg·m² | ${count(num('addedPlateMedian'))} | ${f(median(num('addedPlateMedian')), 3)} | ${span(num('addedPlateMedian'), 3)} |`,
    `| … their ratio, all | ${count(num('plateRatioMedian'))} | ${f(median(num('plateRatioMedian')), 2)} | ${span(num('plateRatioMedian'), 2)} |`,
    `| … near trim | ${count(num('plateRatioTrim'))} | ${f(median(num('plateRatioTrim')), 2)} | ${span(num('plateRatioTrim'), 2)} |`,
    `| … past 60° of rail | ${count(num('plateRatioSteep'))} | ${f(median(num('plateRatioSteep')), 2)} | ${span(num('plateRatioSteep'), 2)} |`,
    `| the shipped form past 60° of rail, kg·m² | ${count(num('addedSurfaceSteep'))} | ${f(median(num('addedSurfaceSteep')), 3)} | ${span(num('addedSurfaceSteep'), 3)} |`,
    `| the PLATE form past 60° of rail, kg·m² | ${count(num('addedPlateSteep'))} | ${f(median(num('addedPlateSteep')), 3)} | ${span(num('addedPlateSteep'), 3)} |`,
    `| **the cos⁻³ law: ratio × cos³(rail) (P4a: 1.00)** | ${count(num('lawMedian'))} | ${f(median(num('lawMedian')), 3)} | ${span(num('lawMedian'), 3)} |`,
    `| the patches' own \\|n̂·û\\| | ${count(num('projectionMedian'))} | ${f(median(num('projectionMedian')), 4)} | ${span(num('projectionMedian'), 4)} |`,
    `| the wetted bottom area, m² | ${count(num('wettedMedian'))} | ${f(median(num('wettedMedian')), 4)} | ${span(num('wettedMedian'), 4)} |`,
    `| … near trim | ${count(num('wettedTrim'))} | ${f(median(num('wettedTrim')), 4)} | ${span(num('wettedTrim'), 4)} |`,
    `| the water's inertia the patches carry, kg | ${count(num('addedTotalMedian'))} | ${f(median(num('addedTotalMedian')), 1)} | ${span(num('addedTotalMedian'), 1)} |`,
    `| … near trim | ${count(num('addedTotalTrim'))} | ${f(median(num('addedTotalTrim')), 1)} | ${span(num('addedTotalTrim'), 1)} |`,
    `| the arm it acts at, √(I/m), m | ${count(num('armMedian'))} | ${f(median(num('armMedian')), 4)} | ${span(num('armMedian'), 4)} |`,
    `| … near trim | ${count(num('armTrim'))} | ${f(median(num('armTrim')), 4)} | ${span(num('armTrim'), 4)} |`,
    '',
    `# the controls, worst over every run`,
    `| linearity P0a | split | closure | residual | singular | apart substeps | booked substeps | not-banking substeps |`,
    `|---|---|---|---|---|---|---|---|`,
    `| ${span(num('linearMax'), 15)} | ${span(num('splitMax'), 15)} | ${span(num('closureMax'), 15)} | ${span(num('residualMax'), 15)} | ${span(num('singularMax'), 0)} | ${num('apartSubsteps').reduce((a, b) => a + b, 0)} | ${num('bookedSubsteps').reduce((a, b) => a + b, 0)} | ${num('skippedSubsteps').reduce((a, b) => a + b, 0)} |`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
  if (OUT) appendFileSync(OUT, `${lines.join('\n')}\n`);
}
