/**
 * **The bank ledger (step 3.3l, a measurement tool and not part of the sim): who LEANS the body, per source, in
 * rad/s² of the body's own lean.** The roll ledger's (`BoardBody.roll`) sibling one joint out.
 *
 * Step 3.3k measured the strongest ordering this track has produced — *the body's bank passes 10° before the deck's
 * roll does in 48 of 48 runs, median +0.100 s* — and closed with the one sentence it was not entitled to answer:
 * *"what makes the body's bank run away from 0.22 s is the next question and this round does not answer it."* This is
 * the instrument for that question, and it is built on the same two facts the roll ledger is built on.
 *
 * **(1) The bank is an unknown of a linear solve, so its attribution is exact.** Standing, `BoardBody.advance`
 * assembles one system `A x = b` over `x = (Δv, Δω, Δṡ, Δu̇[, Δẇ])` — the board's six, the leg's rate, the bank's
 * speed across the leg, and for the new surfer the body's speed along it (`AttachedRider.coupleStanding`). `A` holds
 * the plant: the two masses, the board's inertia tensor, the water's added mass and damping, and the ankle's and the
 * leg's own implicit stiffness over the substep. `b` holds **the sources**: every explicit force and torque of the
 * substep. Because the solve is linear in `b`, splitting `b` into named parts and solving once per part gives an
 * attribution that **sums to the solve's own answer identically** — not a regression, not a correlation, and with no
 * assumption about which term dominates. That identity is this ledger's positive control (`closure`, `residual`).
 *
 * **(2) The body's own lean rate is the sum of two of those unknowns, and `AttachedRider.finish` says so in the
 * code**: `angularVelocity = … + rollAxis · (bankSpeedAfter / legLength)` and, for the new surfer,
 * `+ rollAxis · (ω_board · rollAxis)`. So
 *
 * > `θ̇_body = Δu̇ / L + ω_board · rollAxis`
 *
 * — the leg's own angle at the ankle **plus** the deck rolling underneath it. A ledger that booked only the eighth
 * unknown would miss the half of the lean that is the board rotating under the feet, and a ledger that booked only
 * the roll would miss the ankle. Each entry below is therefore booked in **three** columns: `own`, the body's own
 * lean; `relative`, its `Δu̇ / L` half; and `deck`, its `ω · rollAxis` half. `own = relative + deck`, per source and
 * in total, by construction.
 *
 * **The datum, stated, because every angle on this track must carry one.** Every entry is a mean angular acceleration
 * over the latest step, **rad/s²**, about the heading's own roll axis — `AttachedRider.rollAxis`, the world vector
 * `(0, 0, −1)` turned by the board's heading (yaw only, no roll and no pitch), which is the axis `AttachedRider`'s own
 * `roll`, `rail`, `bank.angle` and `rollRate` are all measured about. **Positive leans the body, and rolls the deck,
 * toward the board's own +x** — its left — which is the raw board-frame sense of step 3.3j §2 and step 3.3k §2, and
 * **not** the `dir`-signed "toward the turn's inside" convention. Standing still there is no commanded turn to have an
 * inside.
 *
 * **What is a source and what is not.** `b` is the substep's explicit forces and torques; `A` is the plant. So the
 * water's added mass, its radiation damping and the ankle's own spring taken implicitly over the substep are **not**
 * entries here — they are the denominator every entry is divided by, and `A`'s own 8×8 inverse is what turns each
 * newton-metre into a lean. The ankle's and the leg's springs appear as entries only for the part of their torque that
 * is explicit at the start of the substep (`AttachedRider.ankleTorque`, `leg.force`), which is how they enter `b`.
 * This is a decomposition of the drive, not of the response, and §"Entries" below names each one.
 *
 * Only filled while `on` is true, so the default game pays one branch per substep and nothing else. Nothing in this
 * file is read by the game: `bankLedger.test.ts` asserts the rider is byte-identical with it on and off.
 */

/**
 * The sources, in the order they are booked. The first eleven are the board's own rows, straight off
 * `BoardBody.advance`'s own right-hand side, and the rest are the rider's, off `AttachedRider.coupleStanding`:
 *
 * - `weight` — the board's own weight, N, row 1 only (the rider's is `gravity`).
 * - `buoyancy`, `pressure`, `suction`, `friction` — the hull's four patch totals.
 * - `fins`, `rails` — the foils' two.
 * - `froth` — the whitewater's push.
 * - `addedMass` — the explicit half of the surface-normal push (`waterX…waterTz`), the one the roll ledger
 *   deliberately leaves out of its own sum because its settle twin carries it; here it belongs, because this is a
 *   decomposition of `b` and it is in `b`.
 * - `gyro` — `−ω × Iω`, the board's own gyroscopic term.
 * - `yawCouple` — `AttachedRider.coupleYaw`'s kick: the body's yaw inertia and the legs' twist, on the board's rows.
 * - `gravity` — the rider's weight, as it enters through `h · external`.
 * - `riderWater` — the water's own force on the rider's body (`waterForce`).
 * - `assist` — every other `external` term (COMPRESS_PULL, CARVE_CARRY, LEAN_OUT_PULL, the leg drive's force). **All
 *   four are zero for the new surfer by construction** (`compressAssist` returns at once on `newRider`), and the
 *   entry is booked anyway so the partition is exact without that being assumed.
 * - `carry` — `−m · mismatch`: the momentum the constraint must supply, the gap between the body's velocity now and
 *   the velocity the rigid carry plus the current joint rates would give it. It is the board having moved under the
 *   feet since the body's velocity was last set, and it is the term with no name in any force diagram.
 * - `leg` — the leg spring's explicit force, row 6.
 * - `ankle` — `−h τ_ankle / L`, row 7: the ankle's own torque as it stood at the start of the substep.
 * - `swing` — the upper body's swing, rows 3–5 and 7.
 * - `twist` — the legs' twist torque on the board, rows 3–5.
 * - `hand` — `h · handYaw`, row 4.
 * - `pitch` — the pitch ankle's and the pitch hip's torques (`StandingBody.couple`), rows 3–5 and 8.
 * - `drive` — the leg drive's reaction on the board (`pushDrive`).
 * - `limbs` — `?agile=on`'s limb forces and torques.
 */
export const BANK_SOURCES = [
  'weight', 'buoyancy', 'pressure', 'suction', 'friction', 'fins', 'rails', 'froth', 'addedMass', 'gyro', 'yawCouple',
  'gravity', 'riderWater', 'assist', 'carry', 'leg', 'ankle', 'swing', 'twist', 'hand', 'pitch', 'drive', 'limbs',
] as const;

export type BankSource = (typeof BANK_SOURCES)[number];

const COUNT = BANK_SOURCES.length;
/** The widest system the ledger books: the new surfer standing is 9 x 9. */
const MAX = 9;

const zeroes = (): Record<BankSource, number> => {
  const out = {} as Record<BankSource, number>;
  for (const key of BANK_SOURCES) out[key] = 0;
  return out;
};

/** `b` split by source, row-major: COUNT x MAX. */
const parts = new Float64Array(COUNT * MAX);
/** The substep's own total `b`, as the game assembled it, for the closure test. */
const whole = new Float64Array(MAX);
/** The LU of `A`, its pivots, and the scratch a back-substitution needs. */
const lu = new Float64Array(MAX * MAX);
const pivots = new Int32Array(MAX);
/**
 * Step 3.3p: a SECOND factorisation, of the same `A` with the bank row's own diagonal multiplied by `RIGID`, so the
 * body cannot move across the leg at all. It is the positive control on the lateral unit reads below (P0c): with the
 * ankle rigid the effective sway mass must read the two masses SUMMED, which is the number my brief took the
 * diagonal `system[i][i] += m` to mean. Nothing in the game reads it; it is only built while `on`.
 */
const luRigid = new Float64Array(MAX * MAX);
const pivotsRigid = new Int32Array(MAX);
const RIGID = 1e6;
const solution = new Float64Array(MAX);
const total = new Float64Array(MAX);
/**
 * Step 3.3m: the scratch one UNIT right-hand side is built in, so the plant's own compliances can be read off the
 * same LU the attribution uses. Nothing in the game writes it.
 */
const unit = new Float64Array(MAX);
const response = new Float64Array(MAX);

let factored = false;
let order = 0;

function factor(a: Float64Array, n: number, piv: Int32Array = pivots): boolean {
  for (let i = 0; i < n; i += 1) piv[i] = i;
  for (let k = 0; k < n; k += 1) {
    let p = k;
    let best = Math.abs(a[k * n + k]);
    for (let i = k + 1; i < n; i += 1) {
      const v = Math.abs(a[i * n + k]);
      if (v > best) {
        best = v;
        p = i;
      }
    }
    if (!(best > 0)) return false;
    if (p !== k) {
      for (let j = 0; j < n; j += 1) {
        const t = a[k * n + j];
        a[k * n + j] = a[p * n + j];
        a[p * n + j] = t;
      }
      const t = piv[k];
      piv[k] = piv[p];
      piv[p] = t;
    }
    const d = a[k * n + k];
    for (let i = k + 1; i < n; i += 1) {
      const factorIK = a[i * n + k] / d;
      a[i * n + k] = factorIK;
      for (let j = k + 1; j < n; j += 1) a[i * n + j] -= factorIK * a[k * n + j];
    }
  }
  return true;
}

function substitute(a: Float64Array, n: number, b: Float64Array, offset: number, out: Float64Array, piv: Int32Array = pivots): void {
  for (let i = 0; i < n; i += 1) out[i] = b[offset + piv[i]];
  for (let i = 1; i < n; i += 1) {
    let s = out[i];
    for (let j = 0; j < i; j += 1) s -= a[i * n + j] * out[j];
    out[i] = s;
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    let s = out[i];
    for (let j = i + 1; j < n; j += 1) s -= a[i * n + j] * out[j];
    out[i] = s / a[i * n + i];
  }
}

/**
 * The ledger itself. `own`, `relative` and `deck` are per-source means over the latest step, rad/s²; `ownTotal`,
 * `relativeTotal` and `deckTotal` are the same three read off the solve's own whole right-hand side.
 */
export const bankLedger = {
  /** Off in the game. A probe sets it before the step it wants and reads the entries after. */
  on: false,
  /** The body's own lean acceleration per source, rad/s², + toward the board's +x. */
  own: zeroes(),
  /** Its `Δu̇ / L` half: the leg's own angle opening at the ankle. */
  relative: zeroes(),
  /** Its `ω · rollAxis` half: the deck rolling under the feet. */
  deck: zeroes(),
  /** The same three off the whole right-hand side, so the sum has something to be checked against. */
  ownTotal: 0,
  relativeTotal: 0,
  deckTotal: 0,
  /** Substeps booked, and those the standing 8x8/9x9 did NOT decide (the solve-apart paths: the attribution is of the system that ran). */
  steps: 0,
  apart: 0,
  /** The positive controls, all three a max over the step's substeps, all three in the units of the thing compared. */
  /** `max |Σ parts − b|` over the rows: the partition of the right-hand side is exact or it is not. */
  split: 0,
  /** `max |Σ_source A⁻¹ part − A⁻¹ b|` over the four rows that matter (3, 4, 5, 7), m/s or rad/s. */
  closure: 0,
  /** `max |this file's A⁻¹ b − the game's own solveLinear answer|` over the same rows: the denominator is the game's. */
  residual: 0,
  /** Substeps whose matrix this file could not factor (reported, never hidden). */
  singular: 0,

  /**
   * **Step 3.3m: the PLANT's own compliances, read off the same LU, with no force in any of them.**
   *
   * The attribution above divides every source by `A⁻¹`. These rows read `A⁻¹` itself, by back-substituting **unit**
   * right-hand sides, so each is a property of the plant alone on the substep it was taken. Every one is a mean over
   * the step (`close` divides by `unitSteps`, not by `dt` — they are not time integrals).
   *
   * The axis is **`AttachedRider.rollAxis`**, the same axis the `deck` column is read on, so an inertia here and an
   * entry above are about one axis and one can be divided by the other.
   *
   * - `rollDeckPer`, `rollRelativePer` — the response to **one unit of roll impulse on the board's own rows**
   *   (`b = r̂` on rows 3–5, zero elsewhere), rad/s per N·m·s: the deck's own roll and the joint's `Δu̇ / L`.
   *   `1 / rollDeckPer` is **the roll inertia the integrator actually divides a roll moment by, with the rider
   *   coupled** — which is not `r̂ᵀ A_rot r̂` on `BoardBody.system`, because that array is the board's rows **before**
   *   `coupleStanding` adds the rider, and because the board's roll is coupled to its own translation and to both
   *   joint rates.
   * - `ankleOwn`, `ankleRelative`, `ankleDeck` — the response to **one unit of ankle torque-impulse as the code
   *   books it**: `b[7] = 1/L` and nothing else, which is `coupleStanding`'s own `rhs[7] += −h τ / L` with τ = −1.
   *   `u` is a **relative** coordinate (the body's speed across the leg, over and above the rigid carry), so a joint
   *   torque belongs in its row alone and the reaction on the board is carried by the kinematics; `pair…` below is
   *   the counterfactual that books the couple twice, kept so that is read and not assumed.
   *   `ankleOwn = ankleRelative + ankleDeck`, as the ledger's own three columns do.
   *   `|ankleOwn / ankleRelative|` is **the ankle's own authority over the body's absolute lean, from `A` alone** —
   *   the same ratio step 3.3l measured through the ankle's actual torque, with the torque divided out.
   * - `pairOwn`, `pairRelative`, `pairDeck` — the same unit torque with `−r̂` also booked on rows 3–5.
   * - `bodyHeld` — `A[7][7] · L²`, kg·m²: the body's own roll inertia about the stance point as the matrix holds it,
   *   which is `m L² + h (k_ankle h + c_ankle)` by `coupleStanding`'s own line, i.e. the body's end of the ratio read
   *   off the matrix instead of inferred from `m L²`.
   */
  unitSteps: 0,
  /**
   * Substeps skipped because the body was **not banking** (`AttachedRider.banking` false — landing, or standing below
   * planing, which the owner's own low-speed cell reaches). There row 7 is not the ankle's at all: `coupleStanding`
   * writes `system[7][7] += 1` and no coupling, and `rhs[7]` is never written [R], so a unit read of it would be a
   * read of a dummy row. Counted and skipped rather than reported.
   */
  unitSkipped: 0,
  /**
   * **Step 3.3p: the LATERAL compliances, off the same LU, with no force in any of them.**
   *
   * The internal model divides a side force by `YawPlant.boardMass` = **2.54 kg, the dry board**, and divides the
   * board's roll moment by `boardRollInertia`, which is already the game's own measured value
   * [R, `predictiveBalance.ts:627`, `:569`]. 3.3o's brief called the first one "29.7 times too small" by comparing it
   * with `coupleStanding`'s DIAGONAL `system[i * N + i] += m`. Part 36's own reading 2 is that a diagonal of `A` is
   * not an effective inertia — the same loop writes `system[i * N + 7] += m t_i` two lines down — so the quantity the
   * model's `boardMass` should be compared with is this one, and these rows are it.
   *
   * - `sideSwayPer` — the board's own sway, m/s per N·s, for one unit of side impulse on its three translational rows
   *   (`b = t̂` on rows 0–2, zero elsewhere). **`1 / sideSwayPer` is the mass the integrator actually divides a side
   *   force by, with the rider coupled.**
   * - `sideRollPer`, `sideRelativePer` — the same impulse's roll of the deck and its `Δu̇ / L`: the cross terms the
   *   model writes as `deckHeight · push` (a 0.031 m lever) and as the feet's own acceleration.
   * - `rollSwayPer` — the other corner of the same 2×2: the sway one unit of **roll** impulse makes.
   * - `yawPer` — the board's own turn, rad/s per N·m·s, for one unit of yaw impulse about the body's `up`
   *   (`b = n̂` on rows 3–5). **`1 / yawPer` is the yaw inertia the solve meets**, against the model's
   *   `boardYawInertia + riderYawInertia`.
   * - `sideSwayRigid` — the same side impulse with the **bank row's** diagonal multiplied by 10⁶, so the body cannot
   *   move across the leg. (My own prediction P0c was that this alone must read the two masses summed. It does not,
   *   and the reason is the next row: the board can still roll and yaw out from under a rider whose across freedom is
   *   welded. **The failed prediction is the mechanism.**)
   * - `sideSwayFrozen` — **the positive control that works**: the same impulse with the diagonals of rows 3–5
   *   (rotation), 6 (the leg), 7 (the bank) and 8 (along) all multiplied by 10⁶, so nothing can give way and the
   *   pair is one rigid translating mass. `1 / sideSwayFrozen` must read the masses SUMMED — the board's own and its
   *   water's, plus the rider's 73 kg — which is the number my brief took the diagonal `system[i][i] += m` to mean.
   *
   * **And the instrument's own free control: `A` is symmetric, so `sideRollPer` and `rollSwayPer` are the same entry
   * of `A⁻¹` read from two different back-substitutions and must agree.** They are reported separately so that is
   * read rather than asserted. `sideYawPer`/`yawSwayPer`, `rollYawPer`/`yawRollPer`, `ankleSwayPer`,
   * `ankleYawPer`/`yawRelativePer` and `rollRelativePer`/`ankleDeck` are the remaining corners, so the four
   * generalised coordinates the lateral problem lives in — the deck's roll, the board's sway, its turn and the
   * joint's own angle — have their **whole 4×4 compliance** read off the game's own matrix. That is the block the
   * internal model builds by hand out of three independent divisions by `boardRollInertia`, `boardMass · V` and
   * `boardYawInertia + riderYawInertia`, with the two off-diagonal corners it keeps taken at a 0.031 m lever.
   *
   * The datum: `t̂` is `AttachedRider.across` and `n̂` is its `up` — the rider's own two axes, the ones
   * `coupleStanding` writes the bank's and the leg's rows on, so an entry here and a row of `A` are about one axis.
   * `sideRollPer` is about `rollAxis`, as every other `deck` reading on this ledger is.
   */
  sideSwayPer: 0,
  sideRollPer: 0,
  sideRelativePer: 0,
  sideYawPer: 0,
  rollSwayPer: 0,
  rollYawPer: 0,
  yawPer: 0,
  yawRollPer: 0,
  yawSwayPer: 0,
  yawRelativePer: 0,
  ankleSwayPer: 0,
  ankleYawPer: 0,
  sideSwayRigid: 0,
  sideSwayFrozen: 0,
  /** Substeps whose rigid-ankle or frozen counterfactual could not be factored (reported, never hidden). */
  rigidSingular: 0,
  rollDeckPer: 0,
  rollRelativePer: 0,
  ankleOwn: 0,
  ankleRelative: 0,
  ankleDeck: 0,
  pairOwn: 0,
  pairRelative: 0,
  pairDeck: 0,
  bodyHeld: 0,
  /**
   * **Step 3.4i: the same partition read as MOMENTS, N·m, so the roll budget can be closed instead of attributed.**
   *
   * Everything above divides `b` by `A⁻¹`, which answers *who leans him*. These rows read `b` itself, which answers
   * *what moment is on him* — and the two are different questions, because `A` is not diagonal. The conversion is
   * exact and has no derivative in it: `coupleStanding` writes the bank's row as a **generalized impulse across the
   * leg**, N·s (`rhs[7] += t̂·f − h(τ_ankle + τ_swing)/L` [R]), so
   *
   * > `moment = Σ_substeps b[7] · L / dt`, N·m
   *
   * is the mean over the step of the moment that source applies to the body about the stance point, on the body's
   * own across axis `t̂` at the leg's own lever `L`. The ankle's entry comes back as exactly `−τ_ankle`; gravity's as
   * `−m g L sin θ_body`, the inverted pendulum's own term. **The datum and sign are the ledger's throughout: positive
   * leans the body toward the board's +x.**
   *
   * - `moment` / `momentTotal` — per source, and off the whole right-hand side. `momentSplit` is the partition's own
   *   positive control, N·m.
   * - `diagonal` — `A[7][7] · x[7] · L / dt`: the body's **own** inertia times its **relative** lean acceleration,
   *   which is the only part of the budget a single-body reading would contain.
   * - `coupling` — `Σ_{j≠7} A[7][j] · x[j] · L / dt`: everything the rest of the solve puts on the same row — the
   *   stance point's own acceleration under the feet, which is the budget's **inertial term** and has no entry in any
   *   force diagram. `diagonal + coupling = momentTotal` identically, and `momentResidual` is the max departure.
   * - `boardMoment` / `boardMomentTotal` — the same sources' moments about `rollAxis` on the **board's** rows, N·m:
   *   the hull's roll spring, the water on the rail, the fins, and the rider's own share through the arm. These have
   *   **no entry in the body's row at all** — they reach the body only through `coupling` — and that is a read, not a
   *   claim: `bookBoard` writes rows 0–5 and nothing else [R].
   *
   * Only filled while `on`, like everything else here, and read by nothing in the game.
   */
  moment: zeroes(),
  momentTotal: 0,
  diagonal: 0,
  coupling: 0,
  momentSplit: 0,
  momentResidual: 0,
  boardMoment: zeroes(),
  boardMomentTotal: 0,

  /** A new step: every entry back to zero. `BoardBody.step` calls it. */
  begin(): void {
    for (const key of BANK_SOURCES) {
      this.own[key] = 0;
      this.relative[key] = 0;
      this.deck[key] = 0;
      this.moment[key] = 0;
      this.boardMoment[key] = 0;
    }
    this.momentTotal = 0;
    this.diagonal = 0;
    this.coupling = 0;
    this.momentSplit = 0;
    this.momentResidual = 0;
    this.boardMomentTotal = 0;
    this.ownTotal = 0;
    this.relativeTotal = 0;
    this.deckTotal = 0;
    this.steps = 0;
    this.apart = 0;
    this.split = 0;
    this.closure = 0;
    this.residual = 0;
    this.singular = 0;
    this.unitSteps = 0;
    this.unitSkipped = 0;
    this.sideSwayPer = 0;
    this.sideRollPer = 0;
    this.sideRelativePer = 0;
    this.sideYawPer = 0;
    this.rollSwayPer = 0;
    this.rollYawPer = 0;
    this.yawPer = 0;
    this.yawRollPer = 0;
    this.yawSwayPer = 0;
    this.yawRelativePer = 0;
    this.ankleSwayPer = 0;
    this.ankleYawPer = 0;
    this.sideSwayRigid = 0;
    this.sideSwayFrozen = 0;
    this.rigidSingular = 0;
    this.rollDeckPer = 0;
    this.rollRelativePer = 0;
    this.ankleOwn = 0;
    this.ankleRelative = 0;
    this.ankleDeck = 0;
    this.pairOwn = 0;
    this.pairRelative = 0;
    this.pairDeck = 0;
    this.bodyHeld = 0;
  },

  /** A new substep: the split of `b` back to zero. `BoardBody.advance` calls it where it assembles its own rows. */
  beginSubstep(): void {
    parts.fill(0);
    factored = false;
  },

  /** A board row: a force, N·s, and a torque, N·m·s, already multiplied by the substep as `b` holds them. */
  bookBoard(source: BankSource, fx: number, fy: number, fz: number, tx: number, ty: number, tz: number): void {
    const at = BANK_SOURCES.indexOf(source) * MAX;
    parts[at] += fx;
    parts[at + 1] += fy;
    parts[at + 2] += fz;
    parts[at + 3] += tx;
    parts[at + 4] += ty;
    parts[at + 5] += tz;
  },

  /** One row of the rider's own: the leg's (6), the bank's (7) or the body's along (8). */
  bookRow(source: BankSource, row: number, value: number): void {
    parts[BANK_SOURCES.indexOf(source) * MAX + row] += value;
  },

  /**
   * A force on the rider's body, N·s, as `coupleStanding` spreads one: its own three rows, the board's three through
   * the arm, and the joints' through the body's own axes. The caller passes the same vectors the solve uses.
   */
  bookBody(
    source: BankSource,
    fx: number, fy: number, fz: number,
    ax: number, ay: number, az: number,
    nx: number, ny: number, nz: number,
    tx: number, ty: number, tz: number,
    wx: number, wy: number, wz: number,
    banking: boolean, free: boolean,
  ): void {
    const at = BANK_SOURCES.indexOf(source) * MAX;
    parts[at] += fx;
    parts[at + 1] += fy;
    parts[at + 2] += fz;
    parts[at + 3] += ay * fz - az * fy;
    parts[at + 4] += az * fx - ax * fz;
    parts[at + 5] += ax * fy - ay * fx;
    parts[at + 6] += nx * fx + ny * fy + nz * fz;
    if (banking) parts[at + 7] += tx * fx + ty * fy + tz * fz;
    if (free) parts[at + 8] += wx * fx + wy * fy + wz * fz;
  },

  /** A torque on the board's rows alone, N·m·s about a world axis. */
  bookTorque(source: BankSource, tx: number, ty: number, tz: number): void {
    const at = BANK_SOURCES.indexOf(source) * MAX;
    parts[at + 3] += tx;
    parts[at + 4] += ty;
    parts[at + 5] += tz;
  },

  /**
   * The substep's attribution: `A` as the game assembled it and `b` as it stands, the leg's length and the heading's
   * own roll axis. Called at the end of `AttachedRider.coupleStanding`, before `solveLinear` destroys either.
   */
  solve(
    system: Float64Array, rhs: Float64Array, n: number, length: number,
    rx: number, ry: number, rz: number, banking: boolean,
    tx = 0, ty = 0, tz = 0, nx = 0, ny = 0, nz = 0,
  ): void {
    order = n;
    for (let i = 0; i < n * n; i += 1) lu[i] = system[i];
    for (let i = 0; i < n; i += 1) whole[i] = rhs[i];
    if (!factor(lu, n)) {
      this.singular += 1;
      factored = false;
      return;
    }
    factored = true;
    this.steps += 1;
    // The partition of b, read rather than assumed.
    for (let row = 0; row < n; row += 1) {
      let sum = 0;
      for (let s = 0; s < COUNT; s += 1) sum += parts[s * MAX + row];
      const off = Math.abs(sum - rhs[row]);
      if (off > this.split) this.split = off;
    }
    substitute(lu, n, whole, 0, total);
    // **Step 3.4i: the moment budget, off the same `b`, the same `A` and the same solution.** The board's roll row
    // first, because it is read whether or not the body is banking; then the body's own row and its exact split into
    // the diagonal and the coupling, which is the budget's inertial term.
    this.boardMomentTotal += whole[3] * rx + whole[4] * ry + whole[5] * rz;
    if (banking && n > 7) {
      const mWhole = whole[7] * length;
      const mDiagonal = system[7 * n + 7] * total[7] * length;
      let mCross = 0;
      for (let j = 0; j < n; j += 1) if (j !== 7) mCross += system[7 * n + j] * total[j];
      mCross *= length;
      this.momentTotal += mWhole;
      this.diagonal += mDiagonal;
      this.coupling += mCross;
      const off = Math.abs(mDiagonal + mCross - mWhole);
      if (off > this.momentResidual) this.momentResidual = off;
    }
    this.relativeTotal += total[7] / length;
    this.deckTotal += total[3] * rx + total[4] * ry + total[5] * rz;
    this.ownTotal += total[7] / length + total[3] * rx + total[4] * ry + total[5] * rz;
    let sumRelative = 0;
    let sumDeck = 0;
    let sumMoment = 0;
    for (let s = 0; s < COUNT; s += 1) {
      let any = false;
      for (let row = 0; row < n; row += 1) {
        if (parts[s * MAX + row] !== 0) {
          any = true;
          break;
        }
      }
      const keyM = BANK_SOURCES[s];
      // Step 3.4i: the moments are the right-hand side itself, so they are booked before the `continue` that skips
      // a source with no entry at all — an all-zero source books zero, which is the honest reading of it.
      this.boardMoment[keyM] += parts[s * MAX + 3] * rx + parts[s * MAX + 4] * ry + parts[s * MAX + 5] * rz;
      if (banking && n > 7) {
        const own = parts[s * MAX + 7] * length;
        this.moment[keyM] += own;
        sumMoment += own;
      }
      if (!any) continue;
      substitute(lu, n, parts, s * MAX, solution);
      const key = BANK_SOURCES[s];
      const relative = solution[7] / length;
      const deck = solution[3] * rx + solution[4] * ry + solution[5] * rz;
      this.relative[key] += relative;
      this.deck[key] += deck;
      this.own[key] += relative + deck;
      sumRelative += relative;
      sumDeck += deck;
    }
    const gap = Math.max(
      Math.abs(sumRelative - total[7] / length),
      Math.abs(sumDeck - (total[3] * rx + total[4] * ry + total[5] * rz)),
    );
    if (gap > this.closure) this.closure = gap;
    // Step 3.4i: the moments' own partition, in N·m·s, against the whole row the game assembled.
    if (banking && n > 7) {
      const offM = Math.abs(sumMoment - whole[7] * length);
      if (offM > this.momentSplit) this.momentSplit = offM;
    }
    // **Step 3.3m: the plant's own compliances off the same LU.** Three unit right-hand sides, no force in any of
    // them. Read after the attribution so nothing above can see them; `lu` and `pivots` are the same factorisation.
    // Not banking, row 7 is a dummy (`system[7][7] = 1`, no coupling, `rhs[7]` unwritten), so the read is skipped.
    if (!banking) {
      this.unitSkipped += 1;
      return;
    }
    this.unitSteps += 1;
    // (i) one unit of roll impulse on the board's own rows.
    unit.fill(0);
    unit[3] = rx;
    unit[4] = ry;
    unit[5] = rz;
    substitute(lu, n, unit, 0, response);
    this.rollDeckPer += response[3] * rx + response[4] * ry + response[5] * rz;
    this.rollRelativePer += response[7] / length;
    // Step 3.3p: the other corners of the same row of A⁻¹, off the same back-substitution.
    this.rollSwayPer += response[0] * tx + response[1] * ty + response[2] * tz;
    this.rollYawPer += response[3] * nx + response[4] * ny + response[5] * nz;
    // (ii) one unit of ankle torque-impulse, as `coupleStanding` books it: row 7 alone.
    unit.fill(0);
    unit[7] = 1 / length;
    substitute(lu, n, unit, 0, response);
    {
      const rel = response[7] / length;
      const deck = response[3] * rx + response[4] * ry + response[5] * rz;
      this.ankleRelative += rel;
      this.ankleDeck += deck;
      this.ankleOwn += rel + deck;
      // Step 3.3p: the rest of the ankle's own row of A⁻¹.
      this.ankleSwayPer += response[0] * tx + response[1] * ty + response[2] * tz;
      this.ankleYawPer += response[3] * nx + response[4] * ny + response[5] * nz;
    }
    // (iii) the counterfactual: the same torque with the board's reaction couple booked as well.
    unit.fill(0);
    unit[7] = 1 / length;
    unit[3] = -rx;
    unit[4] = -ry;
    unit[5] = -rz;
    substitute(lu, n, unit, 0, response);
    {
      const rel = response[7] / length;
      const deck = response[3] * rx + response[4] * ry + response[5] * rz;
      this.pairRelative += rel;
      this.pairDeck += deck;
      this.pairOwn += rel + deck;
    }
    this.bodyHeld += system[7 * n + 7] * length * length;
    // **Step 3.3p: (iv) one unit of SIDE impulse on the board's own three translational rows.** `b = t̂` on rows 0–2
    // and nothing else — the same shape `bookBody` spreads a lateral force on the board over, with the arm's and the
    // joints' rows left empty, so what comes out is the plant's own answer and not a force's.
    unit.fill(0);
    unit[0] = tx;
    unit[1] = ty;
    unit[2] = tz;
    substitute(lu, n, unit, 0, response);
    this.sideSwayPer += response[0] * tx + response[1] * ty + response[2] * tz;
    this.sideRollPer += response[3] * rx + response[4] * ry + response[5] * rz;
    this.sideRelativePer += response[7] / length;
    this.sideYawPer += response[3] * nx + response[4] * ny + response[5] * nz;
    // (v) one unit of YAW impulse about the body's own up, the axis `coupleYaw` turns the rider's yaw inertia on.
    unit.fill(0);
    unit[3] = nx;
    unit[4] = ny;
    unit[5] = nz;
    substitute(lu, n, unit, 0, response);
    this.yawPer += response[3] * nx + response[4] * ny + response[5] * nz;
    this.yawRollPer += response[3] * rx + response[4] * ry + response[5] * rz;
    this.yawSwayPer += response[0] * tx + response[1] * ty + response[2] * tz;
    this.yawRelativePer += response[7] / length;
    // (vi) **the positive control**: the same side impulse with the bank row's diagonal multiplied by 10⁶, so the
    // body is welded across. A second factorisation of the same `A`; `system` is still the assembled matrix here
    // (`solveLinear` runs after this call returns, and `factor` above worked on the copy `lu`) [R].
    for (let i = 0; i < n * n; i += 1) luRigid[i] = system[i];
    luRigid[7 * n + 7] *= RIGID;
    if (factor(luRigid, n, pivotsRigid)) {
      unit.fill(0);
      unit[0] = tx;
      unit[1] = ty;
      unit[2] = tz;
      substitute(luRigid, n, unit, 0, response, pivotsRigid);
      this.sideSwayRigid += response[0] * tx + response[1] * ty + response[2] * tz;
    } else {
      this.rigidSingular += 1;
    }
    // (vii) the control that works: every row but the three translations welded, so the pair is one rigid mass.
    for (let i = 0; i < n * n; i += 1) luRigid[i] = system[i];
    for (let row = 3; row < n; row += 1) luRigid[row * n + row] *= RIGID;
    if (factor(luRigid, n, pivotsRigid)) {
      unit.fill(0);
      unit[0] = tx;
      unit[1] = ty;
      unit[2] = tz;
      substitute(luRigid, n, unit, 0, response, pivotsRigid);
      this.sideSwayFrozen += response[0] * tx + response[1] * ty + response[2] * tz;
    } else {
      this.rigidSingular += 1;
    }
  },

  /** After `solveLinear`: this file's own answer against the game's, on the four rows the ledger reads. */
  verify(x: Float64Array): void {
    if (!factored) return;
    for (const row of [3, 4, 5, 7]) {
      if (row >= order) continue;
      const off = Math.abs(total[row] - x[row]);
      if (off > this.residual) this.residual = off;
    }
  },

  /** The step closes: every entry becomes a mean over it. */
  close(dt: number): void {
    const inverse = 1 / dt;
    for (const key of BANK_SOURCES) {
      this.own[key] *= inverse;
      this.relative[key] *= inverse;
      this.deck[key] *= inverse;
      // Step 3.4i: an impulse-moment over the step becomes the step's mean moment, N·m.
      this.moment[key] *= inverse;
      this.boardMoment[key] *= inverse;
    }
    this.momentTotal *= inverse;
    this.diagonal *= inverse;
    this.coupling *= inverse;
    this.boardMomentTotal *= inverse;
    this.ownTotal *= inverse;
    this.relativeTotal *= inverse;
    this.deckTotal *= inverse;
    // Step 3.3m: the compliances are not time integrals, so they are means over the substeps that were read.
    const over = this.unitSteps > 0 ? 1 / this.unitSteps : 0;
    this.rollDeckPer *= over;
    this.rollRelativePer *= over;
    this.sideSwayPer *= over;
    this.sideRollPer *= over;
    this.sideRelativePer *= over;
    this.sideYawPer *= over;
    this.rollSwayPer *= over;
    this.rollYawPer *= over;
    this.yawPer *= over;
    this.yawRollPer *= over;
    this.yawSwayPer *= over;
    this.yawRelativePer *= over;
    this.ankleSwayPer *= over;
    this.ankleYawPer *= over;
    this.sideSwayRigid *= over;
    this.sideSwayFrozen *= over;
    this.ankleOwn *= over;
    this.ankleRelative *= over;
    this.ankleDeck *= over;
    this.pairOwn *= over;
    this.pairRelative *= over;
    this.pairDeck *= over;
    this.bodyHeld *= over;
  },
};
