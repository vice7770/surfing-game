/**
 * Step 3.3j, read (a): **the solve's own roll inertia, read off the matrix the integrator inverts.**
 *
 * The wave-shape advisor's ruling of 2026-11-16 (`docs/research/water-physics/consult-log.md`, merged `5481822d`)
 * closed the inertia hypothesis twice over and left one free read behind it, ranked (a) of five:
 *
 * > **Free, read-only, and it decides the question: report the solve's own roll inertia.** One read of `x̂ᵀ A x̂` on the
 * > rotational block of `system` after `BoardBody.ts:1388–1400` and `:1485–1487`, with x̂ the board's long axis in
 * > world, pooled per substep. **Prediction: 0.6–1.2 kg·m² at trim, falling as cos³ of the deck-to-surface roll to
 * > ~0.15 past 60°. If it reads 0.03, the added-mass matrix is not reaching the roll equation and *that* is the bug —
 * > a frame error, which is this project's recurring one.**
 *
 * **It needs no source change, and that is the point.** `BoardBody.system` is a `private readonly Float64Array(36)`,
 * which TypeScript hides and the run time does not, and on the path a standing rider actually takes the assembled
 * matrix **survives the step**: `coupleStanding` copies rows 0–5 into its own 8×8 or 9×9 (`system8`/`system9`) and
 * `solveLinear` eliminates on **that** copy, so `system` is still the matrix as assembled when `step` returns. It is
 * destroyed in place only on the two fallback paths (`pushCapped`, `rider.pushBoard` then `solve6`), which are the
 * steps whose contact was infeasible.
 *
 * **So the probe needs a test for "is this matrix the assembled one or a half-eliminated one", and the assembly gives
 * it one for free: every term of it is symmetric.** Rows 0–5 are built as `Σ coefficient · a_i a_j` over patches
 * (`:1017`, `:1340`, `:1398`, `:2076`), plus `mass` on the translational diagonal and the world inertia tensor `I` on
 * the rotational block (`:1486–1488`) — all symmetric. Gaussian elimination with partial pivoting is not. The probe
 * therefore prints the matrix's own asymmetry, `max|A_ij − A_ji| / max|A|`, pools only the steps that pass at 1e-12,
 * and **reports the share that passed** rather than assuming it.
 *
 * ## What it reports, and the datum of every number
 *
 * - **`rollSolve`** — `x̂ᵀ A x̂` over the rotational block, `A_rot[i][j] = system[(3+i)·6 + (3+j)]`, with
 *   **x̂ the board's long axis in the world**, `(rotation[2], rotation[5], rotation[8])` — the **same datum**
 *   `BoardBody.rollOf` uses for every entry of the roll ledger, so this inertia and that ledger's moments are on one
 *   axis. kg·m². Rows 3–5 of the solve are `(dωx, dωy, dωz)` in the world and `rhs[3..5]` the angular impulses, so
 *   this is the generalized inertia the integrator divides the roll moment by — board, water and foils together.
 * - **`rollDry`** — `x̂ᵀ I x̂` on the same axis from the world inertia tensor alone (`worldInertia`), which is what
 *   step 3.3h's `I_zz` = 0.0262 kg·m² is, and `rollWater` = `rollSolve − rollDry`, the water's share.
 * - **`heaveSolve`** — `ŷᵀ A ŷ` on the translational block with ŷ the world vertical, kg, as a second axis the same
 *   read has to be right about: it must never be below the board's own 2.54 kg.
 * - the deck's roll from the **water's surface normal across** (the rail) and from the **world vertical**, both °, so
 *   the advisor's cos³ law has a datum: their ruling says "the deck-to-surface roll", which is the rail.
 *
 * ## The positive control, and the three predictions written before the probe ran once
 *
 * `MODE=dry` lifts the board clear of the water and takes one step with no rider. **P1: with no wetted patch there is
 * nothing to add, so `rollSolve` must equal `rollDry` exactly** — 0.0262 kg·m² — **and `heaveSolve` must equal the
 * board's own mass exactly, 2.54 kg.** That is a control of the read, of the frame and of the two block offsets at
 * once: an off-by-three in the block index would read a translational element (tens of kg) into the roll, and a wrong
 * axis would read the pitch or yaw inertia (order 1 kg·m², the same order as the answer — which is exactly why the
 * control is run dry, where the answer is known to the digit).
 *
 * `MODE=float` drops the board on still water with no rider. **P2: `rollSolve` > `rollDry`, by the order the advisor
 * sourced** (0.2–0.5 kg·m² planing, 0.6–1.2 by our own constants at trim).
 *
 * `MODE=ride` (the default) is `fall.ts`'s own cell, stance by stance and stick by stick, with the shipped standing
 * rider. **P3: 0.6–1.2 kg·m² while the deck is near trim, falling as the deck rolls away from the surface.**
 *
 * **The falsification, stated in advance: if `rollSolve` reads 0.03 kg·m² on a wetted board, the generalized
 * added-mass matrix is not reaching the roll equation**, step 3.3h's 0.0262 denominator is the live one, and the bug
 * is a frame error of this project's recurring kind.
 *
 * Read-only: it sets no field on the board and reads no private it does not name here (`system`, `rotation`,
 * `worldInertia`, `mass`). No source file is touched by this round at all.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.3/inertia.ts -o <scratch>/in.mjs --format esm --platform node
 *   MODE=dry node <scratch>/in.mjs
 *   MODE=float node <scratch>/in.mjs
 *   MODE=ride STANCES=tall,compress STEERS=0.25,1 EXTRAS=0,1.5,3 node <scratch>/in.mjs
 *
 * Env: `MODE=dry|float|ride`, `RIDER`, `STANCES`, `EXTRAS`, `STEERS`, `SECONDS`, `FELT=deck`, `ACROSS`, `OUT`, `TRACE`.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { PlaneWater } from '../../../../src/physics/PlaneWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;

const MODE = process.env.MODE === 'dry' ? 'dry' : process.env.MODE === 'float' ? 'float' : 'ride';
const RIDER = process.env.RIDER === 'old' ? 'old' : 'new';
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
const SECONDS = Number(process.env.SECONDS ?? 9);
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0.25,1').split(',').map(Number);
const ACROSS = Number(process.env.ACROSS ?? 85);
const FELT = process.env.FELT === 'deck' ? 'deck' as const : undefined;
const OUT = process.env.OUT;
const TRACE = process.env.TRACE === '1';

type Stance = 'tall' | 'crouch' | 'compress';
const STANCES = (process.env.STANCES ?? 'tall,compress').split(',') as Stance[];

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 4) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const median = (v: number[]) => qt(v, 0.5);
const span = (v: number[], d = 3) => { const s = sorted(v); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };

function emit(line: unknown): void {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

interface Read {
  t: number;
  /** `max|A_ij − A_ji| / max|A|` over the 6 × 6: 0 on an assembled matrix, large on an eliminated one. */
  asym: number;
  /** `x̂ᵀ A x̂` on the rotational block, kg·m², x̂ the board's long axis in world (`rollOf`'s own datum). */
  rollSolve: number;
  /** `x̂ᵀ I x̂` on the same axis from `worldInertia` alone, kg·m². */
  rollDry: number;
  /** `ŷᵀ A ŷ` on the translational block with ŷ the world vertical, kg. */
  heaveSolve: number;
  /** The deck's roll from the WORLD vertical, ° (+ = the deck normal toward board +x). */
  roll: number;
  /** The deck's roll from the WATER's own surface normal across, ° — the rail, the advisor's "deck-to-surface". */
  rail: number;
  /** The board's own wetted bottom area and submerged volume at the latest substep. */
  wetted: number;
  volume: number;
  /**
   * **The decomposition, reconstructed by hand from the per-patch arrays the assembly used** — the positive control
   * that says the read is on the right block and the right axis, because the two routes must close.
   * `added` is `Σ (h·radiation + addedMass + entrained)·((r × û)·x̂)²`, the generalized ADDED INERTIA (`:1398`);
   * `damp` is `Σ damping·((r × n̂)·x̂)²` with `damping = pressureDamping · h` (`:1329`), so it is **h times a damping
   * coefficient and not an inertia at all**; `rest` is what the two plus the dry tensor do not account for — the
   * foils (`:1017`), the duck plate (`:2076`) and the rider's own yaw inertia (`coupleYaw`).
   */
  added: number;
  /** `Σ (addedMass + entrained)·((r × û)·x̂)²` alone, kg·m² — the part of `added` that really is an inertia. */
  addedOnly: number;
  /** `Σ h·radiation·((r × û)·x̂)²`, kg·m² — the part of `added` that is h times a RADIATION damping. */
  radDamp: number;
  damp: number;
  rest: number;
  /** The substep the assembly used, s (`BoardBody.substepSpan`), so `damp / h` is a damping in N·m·s/rad. */
  h: number;
}

/** The read itself: one call, on whatever state the board is in now. */
function readBoard(board: BoardBody, t: number, roll: number, rail: number): Read {
  const inner = board as unknown as {
    system: Float64Array; rotation: number[]; worldInertia: number[]; substepSpan: number; count: number;
    arm: Float64Array; normal: Float64Array; surfaceNormal: Float64Array;
    damping: Float64Array; addedMass: Float64Array; entrained: Float64Array; radiation: Float64Array;
  };
  const A = inner.system;
  const rot = inner.rotation;
  const I = inner.worldInertia;
  let biggest = 0;
  let asym = 0;
  for (let i = 0; i < 6; i += 1) {
    for (let j = 0; j < 6; j += 1) {
      biggest = Math.max(biggest, Math.abs(A[i * 6 + j]));
      asym = Math.max(asym, Math.abs(A[i * 6 + j] - A[j * 6 + i]));
    }
  }
  // x̂, the board's long axis in the world: `BoardBody.rollOf`'s own datum, so this inertia and the roll ledger's
  // moments are about one axis and nothing has to be re-projected to divide one by the other.
  const x = [rot[2], rot[5], rot[8]];
  let rollSolve = 0;
  let rollDry = 0;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      rollSolve += x[i] * x[j] * A[(3 + i) * 6 + (3 + j)];
      rollDry += x[i] * x[j] * I[i * 3 + j];
    }
  }
  // The hand reconstruction, patch by patch, out of the same arrays the assembly read.
  const h = inner.substepSpan;
  let added = 0;
  let addedOnly = 0;
  let radDamp = 0;
  let damp = 0;
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
    const cn = (ry * nz - rz * ny) * x[0] + (rz * nx - rx * nz) * x[1] + (rx * ny - ry * nx) * x[2];
    const cu = (ry * uz - rz * uy) * x[0] + (rz * ux - rx * uz) * x[1] + (rx * uy - ry * ux) * x[2];
    const inertia = h * inner.radiation[k] + inner.addedMass[k] + inner.entrained[k];
    if (inertia > 0) {
      added += inertia * cu * cu;
      addedOnly += (inner.addedMass[k] + inner.entrained[k]) * cu * cu;
      radDamp += h * inner.radiation[k] * cu * cu;
    }
    if (inner.damping[k] > 0) damp += inner.damping[k] * cn * cn;
  }
  return {
    t,
    asym: biggest > 0 ? asym / biggest : 0,
    rollSolve,
    rollDry,
    heaveSolve: A[1 * 6 + 1],
    roll,
    rail,
    wetted: board.wettedArea,
    volume: board.submergedVolume,
    added,
    addedOnly,
    radDamp,
    damp,
    rest: rollSolve - rollDry - added - damp,
    h,
  };
}

/**
 * The controls: a board on still water (lifted clear of it for `dry`), with and without a standing rider.
 *
 * **`rider = false` is the gate's own negative control, and it is why the gate exists.** With no rider the solve takes
 * the `else { solve6(system, rhs) }` branch, which eliminates the matrix **in place**, so what a probe reads after
 * `step` is a half-eliminated matrix and not an inertia. **Predicted before it ran: that read is ASYMMETRIC and the
 * gate rejects it.** With a standing rider the assembled rows are copied into `system8`/`system9` and eliminated
 * there, so `system` survives and the read is symmetric to the last bit.
 */
function control(dry: boolean, withRider: boolean): Record<string, unknown> {
  const water = new PlaneWater({});
  const board = new BoardBody({});
  board.place(
    new Vector3(0, (dry ? 4 : 0) + board.shape.centerOfMass.y, 0),
    new Quaternion(),
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
  );
  if (withRider) {
    const rider = new AttachedRider(board.shape, {
      phase: 'standing',
      ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    } as ConstructorParameters<typeof AttachedRider>[1]);
    board.attach(rider);
  }
  const reads: Read[] = [];
  for (let i = 0; i < (dry ? 2 : 30); i += 1) {
    board.step(STEP, water);
    reads.push(readBoard(board, (i + 1) * STEP, 0, 0));
  }
  const last = reads[reads.length - 1];
  return {
    mode: dry ? 'dry' : 'float',
    rider: withRider ? 'standing' : 'none',
    steps: reads.length,
    mass: (board as unknown as { mass: number }).mass,
    asymPeak: r(Math.max(...reads.map((x) => x.asym)), 15),
    rollSolve: r(last.rollSolve, 6),
    rollDry: r(last.rollDry, 6),
    rollWater: r(last.rollSolve - last.rollDry, 6),
    heaveSolve: r(last.heaveSolve, 4),
    wetted: r(last.wetted, 4),
    volume: r(last.volume, 6),
    rollSolveSpan: `${f(Math.min(...reads.map((x) => x.rollSolve)), 4)}–${f(Math.max(...reads.map((x) => x.rollSolve)), 4)}`,
    added: r(last.added, 4), addedOnly: r(last.addedOnly, 4), radDamp: r(last.radDamp, 4), damp: r(last.damp, 4), restTerm: r(last.rest, 4), h: r(last.h, 8),
    dampCoeff: r(last.h > 0 ? last.damp / last.h : Number.NaN, 2),
  };
}

function oneRun(st: Stance, extra: number, steer: number): Record<string, unknown> {
  const water = new FaceWater({ depth: DEPTH, height: FACE[0], slope: FACE[1], speed: FACE[2] });
  const sample = createWaterSample();
  const fall = new Vector3(0, 0, 1);
  const pz = water.crestZ() + AHEAD * water.front;
  const here = water.sampleAt(0, 50, pz, sample);
  const alongFlow = here.flowX * fall.x + here.flowZ * fall.z;
  const entry = (FACE[2] - alongFlow) / Math.cos(45 / DEG) + extra;
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
  rider.crouch = st === 'crouch' ? 1 : st === 'compress' ? 0.6 : 0;
  rider.compress = st === 'compress' ? 1 : 0;
  rider.steer = 0;

  const fwd = new Vector3();
  const side = new Vector3();
  const boardUp = new Vector3();
  const nW = new Vector3();
  const reads: Read[] = [];
  let lastHeading = Number.NaN;
  let net = 0;
  let centred = false;
  let fellAt = Number.NaN;

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    side.set(fwd.z, 0, -fwd.x);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y) * DEG;
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const rail = roll - Math.atan2(nW.dot(side), nW.y) * DEG;
    reads.push(readBoard(board, t, roll, rail));
    const heading = Math.atan2(fwd.x, fwd.z);
    if (!Number.isFinite(lastHeading)) lastHeading = heading;
    let d = heading - lastHeading;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    lastHeading = heading;
    net += d * DEG;
    if (!centred && Math.abs(net) >= ACROSS) centred = true;
    rider.steer = centred ? 0 : steer;
    if (!rider.attached || !rider.upright || rider.phase !== 'standing') { fellAt = t; break; }
  }

  if (TRACE) {
    process.stdout.write(`# TRACE ${st} extra=${extra} steer=${steer}\n`);
    const keys = Object.keys(reads[0] ?? {}) as (keyof Read)[];
    process.stdout.write(`${keys.join('\t')}\n`);
    for (const x of reads) process.stdout.write(`${keys.map((k) => x[k].toFixed(6)).join('\t')}\n`);
  }

  // The mount's own contact transient is the first ~0.17 s in every probe of this folder.
  const live = reads.filter((x) => x.t > 0.2);
  // **Only the steps whose matrix is still the assembled one.** The two fallback paths eliminate `system` in place,
  // so an asymmetric read is a half-eliminated matrix and not an inertia; the share that passes is printed.
  const clean = live.filter((x) => x.asym < 1e-12);
  const trim = clean.filter((x) => Math.abs(x.rail) < 10);
  const steep = clean.filter((x) => Math.abs(x.rail) >= 60);
  // The cos³ law the advisor predicted, fitted as a power on |cos(rail)| over the clean steps with a wetted hull.
  const fitPts = clean.filter((x) => x.wetted > 1e-4 && Math.abs(x.rail) < 85);
  let power = Number.NaN;
  if (fitPts.length > 20) {
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    let n = 0;
    for (const p of fitPts) {
      const c = Math.cos(p.rail / DEG);
      if (!(c > 0.05) || !(p.rollSolve - p.rollDry > 1e-6)) continue;
      const lx = Math.log(c);
      const ly = Math.log(p.rollSolve - p.rollDry);
      sx += lx; sy += ly; sxx += lx * lx; sxy += lx * ly; n += 1;
    }
    if (n > 20) power = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  }
  return {
    mode: 'ride', rider: RIDER, stance: st, extra, steer, felt: FELT ?? 'world',
    steps: reads.length, live: live.length, clean: clean.length,
    cleanShare: r(live.length ? clean.length / live.length : Number.NaN, 3),
    asymPeakClean: r(clean.length ? Math.max(...clean.map((x) => x.asym)) : Number.NaN, 15),
    asymPeakDirty: r(live.length > clean.length ? Math.max(...live.filter((x) => x.asym >= 1e-12).map((x) => x.asym)) : Number.NaN, 6),
    fellAt: r(fellAt, 3),
    rollDryMedian: r(median(clean.map((x) => x.rollDry)), 6),
    rollSolveMedian: r(median(clean.map((x) => x.rollSolve)), 4),
    rollSolveMin: r(clean.length ? Math.min(...clean.map((x) => x.rollSolve)) : Number.NaN, 4),
    rollSolveMax: r(clean.length ? Math.max(...clean.map((x) => x.rollSolve)) : Number.NaN, 4),
    rollWaterMedian: r(median(clean.map((x) => x.rollSolve - x.rollDry)), 4),
    ratioMedian: r(median(clean.map((x) => x.rollSolve / x.rollDry)), 2),
    trimN: trim.length, rollSolveTrim: r(median(trim.map((x) => x.rollSolve)), 4),
    steepN: steep.length, rollSolveSteep: r(median(steep.map((x) => x.rollSolve)), 4),
    heaveMedian: r(median(clean.map((x) => x.heaveSolve)), 2),
    wettedMedian: r(median(clean.map((x) => x.wetted)), 4),
    railMedian: r(median(clean.map((x) => Math.abs(x.rail))), 1),
    railPeak: r(clean.length ? Math.max(...clean.map((x) => Math.abs(x.rail))) : Number.NaN, 1),
    cosPower: r(power, 2), fitN: fitPts.length,
    // The decomposition, medians over the clean steps.
    addedMedian: r(median(clean.map((x) => x.added)), 4),
    addedOnlyMedian: r(median(clean.map((x) => x.addedOnly)), 4),
    radDampMedian: r(median(clean.map((x) => x.radDamp)), 4),
    dampAllMedian: r(median(clean.map((x) => (x.h > 0 ? (x.damp + x.radDamp) / x.h : Number.NaN))), 2),
    dampAllTrim: r(median(trim.map((x) => (x.h > 0 ? (x.damp + x.radDamp) / x.h : Number.NaN))), 2),
    addedOnlyTrim: r(median(trim.map((x) => x.addedOnly)), 4),
    dampMedian: r(median(clean.map((x) => x.damp)), 4),
    restMedian: r(median(clean.map((x) => x.rest)), 4),
    closePeak: r(clean.length ? Math.max(...clean.map((x) => Math.abs(x.rest))) : Number.NaN, 4),
    hMedian: r(median(clean.map((x) => x.h)), 8),
    // **The hull's own roll damping, read straight off the assembly**: `damp / h` is `Σ pressureDamping·((r × n̂)·x̂)²`,
    // N·m·s/rad — the same quantity the advisor sourced at 12.7 (ITTC 7.5-02-07-04.5 4.2.4) and predicted at 11–19
    // from our own constants, here measured rather than regressed.
    dampCoeffMedian: r(median(clean.map((x) => (x.h > 0 ? x.damp / x.h : Number.NaN))), 2),
    dampCoeffTrim: r(median(trim.map((x) => (x.h > 0 ? x.damp / x.h : Number.NaN))), 2),
    // 3.3h's own denominator and this one, as the °/s² a newton-metre buys on each.
    alphaPerNmDry: r(DEG / median(clean.map((x) => x.rollDry)), 0),
    alphaPerNmSolve: r(DEG / median(clean.map((x) => x.rollSolve)), 1),
  };
}

if (MODE !== 'ride') {
  const rows = [control(MODE === 'dry', true), control(MODE === 'dry', false)];
  for (const row of rows) emit(row);
  console.log(`\n# step 3.3j read (a) — the ${MODE} CONTROL, a board on PlaneWater, with a standing rider and without one`);
  console.log(`# P1 (dry, standing): rollSolve must EQUAL rollDry exactly (0.0262 kg·m²) and heaveSolve the board's own mass (2.54 kg).`);
  console.log(`# P2 (float, standing): rollSolve > rollDry by order 0.2–1.2 kg·m².`);
  console.log(`# The GATE's own negative control: with no rider the solve eliminates \`system\` IN PLACE, so that read must be ASYMMETRIC.`);
  console.log(`\n| mode | rider | steps | x̂ᵀAx̂ kg·m² | x̂ᵀIx̂ kg·m² | the water's share | ŷᵀAŷ kg | the board's mass kg | wetted m² | volume m³ | asymmetry peak | rollSolve over the run |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const row of rows) {
    console.log(`| ${row.mode} | ${row.rider} | ${row.steps} | ${row.rollSolve} | ${row.rollDry} | ${row.rollWater} | ${row.heaveSolve} | ${row.mass} | ${row.wetted} | ${row.volume} | ${row.asymPeak} | ${row.rollSolveSpan} |`);
  }
  console.log(`\n# the hand reconstruction, patch by patch, out of the arrays the assembly read — P4: the three must close on x̂ᵀAx̂.`);
  console.log(`| mode | rider | x̂ᵀAx̂ | x̂ᵀIx̂ (dry) | + added inertia | + h·damping | = REST (foils, plate, rider yaw) | the substep h, s | the damping h⁻¹·damp, N·m·s/rad |`);
  console.log(`|---|---|---|---|---|---|---|---|---|`);
  for (const row of rows) {
    console.log(`| ${row.mode} | ${row.rider} | ${row.rollSolve} | ${row.rollDry} | ${row.added} | ${row.damp} | ${row.restTerm} | ${row.h} | ${row.dampCoeff} |`);
  }
} else {
  const rows: Record<string, unknown>[] = [];
  for (const extra of EXTRAS) for (const steer of STEERS) for (const st of STANCES) {
    const row = oneRun(st, extra, steer);
    rows.push(row);
    if (!TRACE) emit(row);
  }
  if (!TRACE) {
    const col = (pick: (x: Record<string, unknown>) => boolean, k: string) => rows.filter(pick).map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])));
    console.log(`\n# step 3.3j read (a) — the solve's own roll inertia, rider=${RIDER}, felt=${FELT ?? 'world'}`);
    console.log(`# Canyon-matched FaceWater ${FACE[0]} m / ${FACE[1]}° / ${FACE[2]} m/s, ${DEPTH} m deep — a FIT to Canyon, not Canyon.`);
    console.log(`# ${EXTRAS.length} entry speeds × ${STEERS.length} sticks × ${STANCES.length} stances = ${rows.length} runs.`);
    console.log(`# P3: 0.6–1.2 kg·m² near trim, falling as cos³ of the rail. FALSIFICATION: 0.03 kg·m² means the matrix never reaches the roll equation.`);
    const groups: { name: string; pick: (x: Record<string, unknown>) => boolean }[] = [
      ...STANCES.map((st) => ({ name: st as string, pick: (x: Record<string, unknown>) => x.stance === st })),
      ...STEERS.map((s) => ({ name: `stick ${s}`, pick: (x: Record<string, unknown>) => x.steer === s })),
      { name: 'all', pick: () => true },
    ];
    console.log(`\n| group | n | clean steps, share | x̂ᵀAx̂ median kg·m² | its span | x̂ᵀIx̂ (3.3h's I_zz) | ratio | near trim (rail < 10°) | past 60° | cos power | ŷᵀAŷ kg |`);
    console.log(`|---|---|---|---|---|---|---|---|---|---|---|`);
    for (const g of groups) {
      const n = rows.filter(g.pick).length;
      console.log(`| ${g.name} | ${n} | ${span(col(g.pick, 'cleanShare'), 3)} | ${span(col(g.pick, 'rollSolveMedian'), 3)} `
        + `| ${f(Math.min(...col(g.pick, 'rollSolveMin')), 3)}–${f(Math.max(...col(g.pick, 'rollSolveMax')), 3)} | ${span(col(g.pick, 'rollDryMedian'), 4)} `
        + `| ${span(col(g.pick, 'ratioMedian'), 1)} | ${span(col(g.pick, 'rollSolveTrim'), 3)} | ${span(col(g.pick, 'rollSolveSteep'), 3)} `
        + `| ${span(col(g.pick, 'cosPower'), 2)} | ${span(col(g.pick, 'heaveMedian'), 1)} |`);
    }
    console.log(`\n| group | rail median ° | rail peak ° | wetted m² | 1 N·m on 3.3h's I_zz, °/s² | 1 N·m on the SOLVE's, °/s² | asymmetry peak, clean | the same, rejected |`);
    console.log(`|---|---|---|---|---|---|---|---|`);
    for (const g of groups) {
      console.log(`| ${g.name} | ${span(col(g.pick, 'railMedian'), 1)} | ${span(col(g.pick, 'railPeak'), 1)} | ${span(col(g.pick, 'wettedMedian'), 4)} `
        + `| ${span(col(g.pick, 'alphaPerNmDry'), 0)} | ${span(col(g.pick, 'alphaPerNmSolve'), 1)} | ${span(col(g.pick, 'asymPeakClean'), 15)} | ${span(col(g.pick, 'asymPeakDirty'), 4)} |`);
    }
    console.log(`\n# the decomposition (P4: the three close on x̂ᵀAx̂) and the hull's own roll DAMPING off the same assembly (sourced 12.7 N·m·s/rad)`);
    console.log(`| group | x̂ᵀAx̂ | dry | added inertia | h·damping | REST (foils, plate, yaw) | closure peak | h, s | damping N·m·s/rad | the same near trim |`);
    console.log(`|---|---|---|---|---|---|---|---|---|---|`);
    for (const g of groups) {
      console.log(`| ${g.name} | ${span(col(g.pick, 'rollSolveMedian'), 3)} | ${span(col(g.pick, 'rollDryMedian'), 4)} | ${span(col(g.pick, 'addedMedian'), 3)} `
        + `| ${span(col(g.pick, 'dampMedian'), 4)} | ${span(col(g.pick, 'restMedian'), 4)} | ${span(col(g.pick, 'closePeak'), 4)} | ${span(col(g.pick, 'hMedian'), 8)} `
        + `| ${span(col(g.pick, 'dampCoeffMedian'), 1)} | ${span(col(g.pick, 'dampCoeffTrim'), 1)} |`);
    }
    console.log(`\n# and the added term split into what is an INERTIA and what is h times a damping (h·radiation), both read off the same arrays`);
    console.log(`| group | added inertia, all | addedMass + entrained ALONE | the same near trim | h·radiation | pressure + radiation damping, N·m·s/rad | the same near trim |`);
    console.log(`|---|---|---|---|---|---|---|`);
    for (const g of groups) {
      console.log(`| ${g.name} | ${span(col(g.pick, 'addedMedian'), 3)} | ${span(col(g.pick, 'addedOnlyMedian'), 3)} | ${span(col(g.pick, 'addedOnlyTrim'), 3)} `
        + `| ${span(col(g.pick, 'radDampMedian'), 4)} | ${span(col(g.pick, 'dampAllMedian'), 1)} | ${span(col(g.pick, 'dampAllTrim'), 1)} |`);
    }
  }
}
