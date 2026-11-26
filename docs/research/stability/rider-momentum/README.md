# 3.6f: where the rider's sideways momentum goes when the board turns

*Surfer-track builder, Claude Opus 5.5, xhigh effort, 2026-11-26. Branch `claude/rider-momentum`, from `claude/board-fit`
`ef7908f2` (3.6e, reviewed), at `abe24730`. The brief is `BRIEF.md` in this folder (sha1 `ee917386…`). Diagnosis only:
code reading, probes and scripts; no arm, no change to the game, no fix. His address throughout:
`?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.*

## 0. Pre-registration (written and committed before any run of this round)

**What I had read when writing this.** The brief; 3.6e's README (all of it) and its `fitLib.ts` (`ledgerSet`, `regress`,
`modelCoefs`, `loadRuns`, `fitSets`); the consult log on `claude/the-record` from `4144ff19` through `dab31365`; 3.6d's
`response-probe.ts` (all of it); and the code: `AttachedRider.ts` (`prepare`, `preparePitch`, `prepareBank`,
`humanBank`, `prepareLeg`'s rates, `couple`, `settle`, `coupleYaw`, `coupleStanding`, `settleStanding`, `pushBoard`,
`overPower`, `limitPush`, `finish`, `frame`, `uprightVelocity`, `project`), `standingBody.ts` (`measure`, `prepare`,
`hipStep`, `couple`), `BoardBody.ts` (`step`, `advance`, `substep` from the water's explicit rows to `finish`, `pushCapped`,
the yaw and roll ledgers), `bankLedger.ts` (the unit reads (i)–(vi)), `rollModel.ts` (`lateralMass`, `twoBody`,
`yawRows`, `boardDerivatives`), `riderPosture.ts` (`stanceFeet`, `regularPlaces`), and `boardShape.ts`'s centre of mass.
One computation, no ride: the reference board's geometry (`buildBoardShape()`): length 1.778 m, mass 2.54 kg, centre of
mass at z = −0.056 m (board frame, + toward the nose), the stance's middle at z = −0.274 m, so the standing posture puts
the rider's centre **0.218 m behind the board's centre of mass** at rest (the model's `feetStation` is −0.244 m).
**No ride, no probe and no twin of this round exists yet.**

### 0.1 What the code read already says (question 1, to be written out with `file:line` in §1)

- Standing (the new surfer), the board's solve is one N × N system (N = 9) over (Δv, Δω, Δs′, Δu′, Δw′)
  (`BoardBody.ts` substep → `AttachedRider.coupleStanding`). The body's velocity after the solve is
  v_b′ + ω′ × b + drive + n s′ + t u′ + f w′, and **rows 0–5 are the composite's** (board plus body): the body's momentum
  change m Δv_r enters rows 3–5 at the arm a = position − board.centerOfMass through m [a]× G. With the free body,
  b (`carried`) = a, and `drive` and the mismatch are zero to rounding (s′, u′, w′ are re-measured from the velocity
  each substep: `prepareBank`, `prepareLeg`, `preparePitch`).
- So, read from the code, **no standing path changes the body's velocity without its reaction on the board** inside
  the solve: the body is a point mass joined to the board by three implicit springs (the leg along n, the ankle across t,
  the pitch ankle along f), its reaction is booked at its own arm, and the yaw rotors (`coupleYaw`'s rigid `lower`, the
  twist's `upper`) carry their own reactions. The apart solves (`pushBoard`, `pushCapped`) give the board −J at the
  same arm. Paths outside the solve that I will count: the bed (`resolveBed` runs after the solve and before `finish`
  reads the board's velocity), the bounds (`RideSession.holdInside`), lip strikes, and the rotors' re-set on re-coupling
  (`coupleYaw`: `yawSpin = turn`, `tb.upper = turn + tb.rate` when not coupled).
- u′ is the body's speed across the leg relative to the board's rigid motion at the body: u′ / L = θ̇ − φ̇ (`finish`),
  the bank's own rate relative to the deck, as in the model's pendulum. The freedoms the model lacks are the body's along
  the board (w′, the pitch ankle) and along the leg (s′); the freedom the game lacks is the body's own rotational inertia
  about its centre (the model's J; the game has the rotors instead).
- **A point the brief's premise depends on.** In the model too (`twoBody`), the body's lateral force H = m a_m comes out
  of the solve, and the board's own side freedom has only the dry board's 2.54 kg (`lateralMass`'s m_b). For a unit yaw
  moment on the board the model's own instantaneous yaw inertia (`lateralCompliance`) is therefore expected to be close to
  I_z (board plus legs), not I_z + m x_f²: the 73 kg body barely follows a sudden turn of a 2.54 kg board whose centre is
  free to swing sideways. 3.6e's −5.59 kg·m² per ṙ is the partial derivative of one representation of the model's yaw row
  (H written through its kinematics, H = m [V (β̇ + r) + z_d φ̈ + x_f ṙ + h θ̈]). Through the body's own equation of
  motion H can be written equally through the joint's states (H ≈ −(τ_ankle + τ_swing) / L + m g θ), and a least-squares
  fit on 14 regressors that include both sets may return either form, or a mixture. This is tested by a known-answer
  control (§0.4, C4).

### 0.2 The probe (instrumentation from the probe side; `src` is not expected to change)

`momentum-probe.ts`, this folder: 3.6d's `response-probe.ts` with these additions and nothing else changed.
- **A read-only wrapper of `BoardBody.prototype.substep`** (and of `AttachedRider.prototype.coupleYaw` and
  `coupleStanding`, which only copy their inputs and outputs). Before and after each substep it reads the board (v, ω, c,
  the world inertia), the rider (v_r, p, the lower rotor's spin and inertia, the twist's upper spin and inertia, the hip
  rotor's rate), the yaw ledger's running sums (closed, `yawLedgerClosed` on as in 3.6d) and the board's `forces` running
  sums, and after `finish` the rider's contact impulse J (`impulse`: m Δv_r − h F_ext, or the projected impulse apart).
- **Per substep** it forms, in the game's signs (world up, + nose to the left; moments about the board's centre of mass
  at the substep's start unless said):
  - the ledger's rider term R_led = Δtotal − Σ Δwater − Δgyro (the closed ledger's residual, per substep);
  - the predicted rider term R_pred = −(a × J)_y − [lower (n·ω′ − spin₀)] n_y − [I_u (upper′ − upper₀)] n_y
    − h τ_hip across_y − h τ_twist n_y + h handYaw (prone: − [I_r (ω′ − ω_r,0)]_y + h waterMoment_y), with a, n, the
    rotors' values as the solve used them;
  - **the solve-level residual** R_s = R_led − R_pred;
  - **the composite's linear residual** ΔP_board + ΔP_body − W_b − h (M_b + m) g − h F_w,body (W_b the board's water
    impulse from the `forces` sums);
  - **the composite's yaw angular momentum about a fixed world point O** (the board's centre of mass at the frame's
    start, held through the frame): L_O = [(c − O) × M_b v_b]_y + (I_w ω)_y + [(p − O) × m v_r]_y + the rotors' y
    parts (lower spin n, upper spin n, hip rate across), and its residual R_O = ΔL_O − [Σ Δwater_y (about c) +
    ((c − O) × W_b)_y + ((p − O) × h F_w,body)_y + h handYaw (+ prone h waterMoment_y)];
  - the jump between substeps (L_O at the end of one against the start of the next) and between frames;
  - counts: infeasible substeps, apart solves, bed contact, rotor re-sets, `agile` or `drives` on.
- **Per frame** (sums over its substeps, ÷ dt as the ledgers are): R_s, R_O, the jumps, the linear residual's largest
  norm; the lever moment lev = Σ −(a × J)_y and its parts levL = Σ −a_fwd J_side (the lateral force at the along-board
  arm) and levF = Σ a_side J_fwd (heading frame: side = the heading's +x, fwd = the heading's +z); the rotors' parts;
  J in the heading frame (side, fwd, up) ÷ dt; the arm in the heading frame (mean over substeps).
- **The unit reads** (question 3), per standing substep of a base ride, on the substep's own matrices, solved in the
  probe (LU with pivoting, as `bankLedger`): the board's yaw-rate answer n·Δω to a unit yaw impulse about n on rows 3–5,
  and the board's yaw-rate answer and sway to a unit side impulse t at the feet's station (rows 0–2: t; rows 3–5:
  (x_feet − c) × t, x_feet the stance point `baseWorld`), on
  - (A) the board and the water alone (the 6 × 6 system as `coupleYaw` receives it),
  - (B) (A) plus the yaw rotors (as `coupleYaw` returns it),
  - (C) the full standing system (as `coupleStanding` returns it; = `bankLedger`'s `yawPer` and `sideYawPer`, checked),
  - (D) (C) with the body's three relative rows made rigid (their diagonals × 10⁶, `bankLedger`'s `RIGID` device): the
    body carried rigidly at its arm, the known answer.
  Reported as inertias 1 / (n·Δω) per unit yaw impulse, kg·m², mean over the frame's substeps. With the steady glides
  (§0.3) `bankLedger.on` is set too, and its own `yawPer` and `sideYawPer` are recorded beside.
- **The kicked twins' frame channels** gain `res` (R_s), `resO` (R_O), `lev`, `levL`, `levF`, `rot` (the rotors and the
  hand), `jS`, `jF`, `jU`, `aS`, `aF`, `aU`, so 3.6e's per-unit twin differences can be formed of each.
- **Restrictions to keep it small:** `TWIN_MODES=open` builds only the open-loop twins (3.6e's question 1 read only open
  sets); everything else of the twins is 3.6d's.
- **Read-only check:** with the wrappers on, the base rides of this round's Big seed 1 run reproduce 3.6d's
  `36d/twins/big_s1.jsonl` rows bit for bit (the `stand`, `f`, `o`, `w` and `kbase` rows of the same rides, and the
  `kick` rows' `d` and 3.6d's `e` channels of the open twins). If they do not, every number below is void until the
  cause is found.

### 0.3 The rides (a few, not a campaign)

1. **The steady glides**: the test wave, `MODE=tw TW=catch`, `compress:straight`, `none:straight` (tall),
   `crouch:straight` (the tuck), HOLD 5 s, `bankLedger.on`; one process each.
2. **His three straight stances on Canyon Big seed 1**, organic, PERIODS 12, HOLD 5, his address, knobs off, with the
   open twins at 3.6d's kick times (1.0, 1.5, 2.0, 2.5 s; ankle and twist; +1, −1, +2 δ), one process per stance
   (the rides do not interact: the organic water takes no reaction), `BARE=on` in the tall process (3.6c's bare board,
   copied from the `none:straight` ride at tS 0.5 s and stepped 120 steps on the same water: the no-rider control on a
   Canyon face).
3. **The prone control** comes from the same rides' prone phase (paddling and the take-off), before the stand.

At most 8 game processes at once. Raw runs in `scratchpad/36f/`.

### 0.4 The controls, with their pass lines (each must pass before any standing number counts)

- **C1, the bare board on a Canyon face** (`bare` rows and the substep accounting run on the bare board too): the closed
  yaw ledger's residual per frame |rider| ≤ 10⁻⁶ N·m; the linear residual ≤ 10⁻⁶ N·s per substep; R_O reported.
- **C2, the rider prone** (carried rigidly, `couple`): |R_s| ≤ 10⁻⁹ × (the largest |term| of R_pred that substep) + 10⁻⁹
  N·m·s per substep, over all prone substeps; the linear residual the same.
- **C3, the known answer for the unit reads**: (D)'s yaw inertia less (B)'s equals, to 2 %, the yaw inertia a rigid point
  mass m at the arm a adds to the board-and-water system as (B) holds it — computed independently by the parallel-axis
  algebra on (B)'s 6 × 6 (the Schur complement of the rigid composite), not by the game's code; and (C) equals
  `bankLedger.yawPer` to 10⁻⁹ relative on the glides.
- **C4, the known answer for 3.6e's regression** (the brief's "a case whose answer is known", built from the probe
  side): on this round's open twins, a synthetic rider-yaw term in the model's signs built from **the game's own measured
  lateral force on the body at the model's lever**, y_syn = −x_f H_game (x_f = −0.244 m, H_game = the twin difference of
  J_side ÷ dt in model signs), plus the lower rotor's −I_r ṙ, is put through **3.6e's own `ledgerSet` and `regress`**
  (unchanged, imported) with 3.6e's 14 regressors, Compress, all kick speeds ≥ 4 m/s pooled and by 3.6e's bins where the
  sets allow. The regression *sees the lever* if its coefficients per r and per β̇ come out within 30 % of the model's
  m V x_f (the sets' mean V) and per ṙ within 30 % of −(I_r + m x_f²). If it does not, 3.6e's term table cannot see the
  lever even where the game has it by construction, and its "0–9 %" is then not evidence that the board lacks the
  moment.
- **C4b, the kinematic identity**: H_game regressed (the same weights, the same sets) on [β̇, r, ṙ, θ̈, φ̈] alone returns
  m (V, V, x_f, L, z_d) within 30 % (L the leg's length, the frame's mean) with R² ≥ 0.8; reported either way.
- **The read-only check** of §0.2.

### 0.5 What is computed for each question

- **Q1:** the trace in §1 with `file:line`, from the code read, checked against C2 and the standing R_s.
- **Q2:** per ride and stance, the distributions over standing substeps and frames of R_s, R_O, the jumps and the linear
  residual, beside the lever moment's own size (RMS of lev) and m V x_f × RMS(r). Then **the residual's twin differences
  regressed as 3.6e's question 1** (its `ledgerSet`, `regress` and the 14 regressors; Compress, pooled ≥ 4 m/s, and the
  three bins), its coefficients per r and per ṙ against the missing +m V x_f and −m x_f².
- **Q3:** the unit-read table: per stance, on the steady glide (frames 60–299 after the stand) and on the Big seed 1 base
  rides' frames at 3.6d's kick times (frames m … m + 59 after each kick time), the medians of (A)–(D) as inertias, beside
  1 / (I_board + the legs) and 1 / (I_board + the legs + m x_f²), with I_board = (A)'s; the side-impulse reads likewise.
  **Beside them, the model's own instantaneous answers** at each sample's speed, depth and rail: (`lateralCompliance`
  on `plantAt`'s plant, his options) the ṙ per unit yaw moment and per unit side force at x_f, as inertias.
- **Q4:** C1 on the Canyon face; with the rider standing, R_s (if R_s closes, the ledger's rider term *is* the body's
  reaction at its arm plus the rotors, and no water entry holds a part of it); and the water entries' twin differences
  regressed on the predicted lever term lev (the water's yaw per unit of the rider's reaction), reported.
- **Q5:** the verdict with sizes: (a) is the part of the regressed gap that R_s and R_O carry (N·m per rad/s and per
  rad/s²); (b) the part a water entry carries in Q4; (c) the part carried through the body's freedoms, sized by (C)
  against (D) (instantaneous) and by lev's own twin-difference regression against −x_f H_game's (on the swing's
  timescale); and, if C4 fails to see the lever, **(d) the method**: the part of 3.6e's gap that is the regression's
  representation, sized by C4's coefficients against the model's.

### 0.6 Predictions (made before any data)

1. **Q1/Q2:** no leak. R_s closes to rounding (≤ 10⁻⁹ relative) on every standing and prone substep except bed contact
   (expected none on these faces); the linear residual likewise; R_O is O(h²) (the board's inertia rotated after the
   velocity update, the arms' motion), below 1 % of RMS(lev). So (a) carries none of the gap.
2. **Q3:** at the substep the board meets (B): the board, the water and the legs (with the twist's share β). (C) is within
   5 % of (B); the rigid (D) adds about the reduced mass at the arm (m_b m / (m_b + m) |a_⊥|² ≈ 0.1 kg·m²) plus what the
   water's added mass holds of the board's sway, far below m x_f² = 4.35. The model's own instantaneous answer
   (`lateralCompliance`) is likewise within 0.5 kg·m² of its I_z: "the legs alone" holds of the model too, at the instant.
3. **Q4:** C1 closes on the Canyon face (≤ 10⁻⁶ N·m); standing, R_s closes, so no water entry books the rider's
   reaction; the water's yaw answers lev with a small negative coefficient (the added mass resisting the board's
   rider-driven sway).
4. **C4:** 3.6e's regression on y_syn = −x_f H_game does **not** see the lever: its per-r and per-β̇ coefficients come out
   below 30 % of m V x_f, because H_game is carried, in the regressors, by the ankle's states. C4b: the kinematic identity
   holds only loosely in the measured regressors (R² < 0.8), β̇ being the noisiest (the water's flow, the heading frame).
5. **Q5:** the verdict is (d) for most of 3.6e's gap, with (c) for the rest: the body's reaction acts on the board at its
   arm (0.20–0.24 m behind), but through the ankle, so on the swing's timescale it follows the joint's states rather than
   the board's turn; and the model, written as a two-body solve, does the same.

### 0.7 Guards and order

Diagnosis only: nothing in `src` changes; if a measurement switch proves necessary it is off by default and read by no
address, and the quick stability report is run after it and must be identical. No fix, even of a leak: a leak is
reported with its size and place. Raw runs, bundles and scratch in `scratchpad/36f/`; the rows the tables need archived
into `runs/` here. Later changes to §0 go in as dated amendments, committed before the rows they govern are read. The
full stability report, the Canyon byte check, `npx tsc -b` and the gain lock before review. I stop at a clean, pushed
commit if the coordinator says so.

### 0.8 Amendments

1. *2026-11-26, about 15:22 UTC, after reading the three glides' `m` and `mprone` rows (`36f/glide/`, probe sha1
   `c6d69c9a…`) and before reading any row of the Big seed 1 runs, which are still running:*
   - **What the glides showed that this amendment answers.** R_s closes (largest 2.3 × 10⁻¹⁴ N·m·s per substep,
     relative ≤ 2 × 10⁻¹¹) and the linear residual closes (≤ 3.3 × 10⁻¹³ N·s) on every standing substep, apart ones
     included; the prone control passes; the unit reads pass C3 (≤ 4 × 10⁻⁸) and (C) equals `bankLedger.yawPer`. But
     R_O (about the fixed point) has a median |R_O| of 0.003 N·m on the 281 Compress glide frames with no apart substep
     and up to 176 N·m on the 20 frames whose substeps all went apart, plus 54 N·m on the stand's first frame.
   - **Two causes, read from the code, that the registered R_O does not separate.** (i) My bookkeeping: R_O drops the
     yaw rotors' angular momentum on a substep where they are not coupled (`coupleYaw` inactive, the feet out of
     contact), though `coupleYaw`'s own note says they keep their spin then; and it takes the rotors' axis and inertia
     from the substep before, so a change of either shows in R_O. (ii) A candidate leak in the game: on an apart substep
     (`pushBoard`, `pushCapped`) the board is solved on its 6 × 6 rows, so the couples `coupleStanding` wrote into the
     standing right-hand side — the pitch hip's (`standingBody.couple`), the swing's, the hand's — never reach the board,
     while the hip's and the swing's rotors were already moved in `prepare`.
   - **The change (instrument only; R_s, the linear residual, the unit reads and every twin channel unchanged).** R_O
     carries the rotors whenever the rider stands, coupled or not (the lower's inertia from the last coupled substep, the
     kept spins), and is split per frame into: `roF` (feasible substeps) and `roA` (apart substeps); `hipA`, the trunk
     rotor's y angular momentum change on apart substeps (I_hip Δ(rate) across_y, the couple the apart solve leaves out);
     `axis`, the rotors' axis and inertia change (spin′ (I_now n_now,y − I_prev n_prev,y) for the lower and the upper);
     `stand`, R_O on the substep the solve changes from prone to standing; and counts of flight substeps (standing,
     uncoupled). The swing's rotor turns about `rollAxis`, which is horizontal, so it has no yaw part.
   - **Reruns with the amended probe:** the three glides, and Big seed 1's three base rides **without twins** (one
     process; the rides are the twin runs' base rides, which the read-only check compares). The twin runs carry on with
     the registered probe: their R_s, lever, J and arm channels, which C4 and Q2's regressions read, are unchanged by
     this amendment.
   - **The prediction for R_O after the split**: roF closes to the axis term plus O(h²) (≤ 1 % of RMS(lev)); roA equals
     hipA plus the axis term to 1 %; `stand` is the prone body's spin and the rotors' start, one substep per ride.
2. *2026-11-26, about 15:26 UTC, after reading amendment 1's glide rerun (`36f/glide2/`, probe sha1 `8b6e64e1…`) and
   before reading any Big seed 1 row:*
   - **What the rerun showed.** On frames with no apart substep and no rotor start, |roF − axis| has a median of a few
     10⁻³ N·m; the one large frame per ride (54 N·m) is the stand, where the rotors start from the board's turn
     (`rst` = 1; my `stand` flag missed it because the `landing` phase lies between prone and standing). On the apart
     frames hipA explains most of roA in Compress (RMS 82 against 78) but not all (RMS of roA − hipA 51), and none of it
     in the tuck (11 N·m RMS left, hipA 0.003).
   - **A further term, read from the code:** on an apart substep the light board takes the whole contact impulse on its
     own 2.54 kg rows, so its Δω in one substep is large, and its rotation integrator (the explicit gyro −h ω × Iω on the
     right-hand side, `BB:1476–1483`, with the inertia rotated after the velocity update, `BB:1714–1717`) is only
     consistent to O(h Δω). The change (instrument only): per substep gy = ((I₁ − I₀) ω₁)_y + Δgyro_y, the board's
     integrator's own yaw angular momentum error, split feasible (`gyF`) and apart (`gyA`), and the axis term on apart
     substeps alone (`axisA`). The stand is identified by the rotor start (`rst` > 0), not by `stand`.
   - **Reruns with this probe (sha1 `19a792ec…`)**: the three glides again and Big seed 1's base rides without twins
     (amendment 1's base rerun was stopped at 15:25, before its first ride; no row of it was read).
   - **Prediction:** roA − hipA − gyA − axisA closes to ≤ 1 % of RMS(roA); roF − axis − gyF closes likewise.
3. *2026-11-26, about 15:36 UTC, after reading the twin regressions of `regress.ts` (C4, C4b, Q2, Q4, all three stances)
   and before running the analysis it adds; exploratory, it decides nothing:* **the lever's twin difference split into
   the force's change at the base's arm and the arm's change against the base's force.** Per frame, with the base ride's
   own arm and contact force (its `m` rows, the same wave and frame): δ(levL) ≈ −a_fwd,0 δJ_side − J_side,0 δa_fwd and
   δ(levF) ≈ a_side,0 δJ_fwd + J_fwd,0 δa_side, each regressed with 3.6e's 14 regressors as in `regress.ts`
   (`decomp.ts`). Why: in `regress.ts` the rider's yaw per β (−250 N·m/rad in Compress above 8.7 m/s, "a term the model
   lacks" in 3.6e) sits in the lever (−lev −208 of −251), and the arm along the board moves with the body's pitch
   freedom w′, which the model lacks; this split says which part carries it.

### 0.9 The order of the round (UTC, 2026-11-26)

| time | step |
| --- | --- |
| 2026-11-26 | Vicente approves the round: "Yes, start 3.6f" (relayed by the coordinator, consult log `dab31365`) |
| 14:52 | the worktree at `abe24730`; the brief's sha1 checked (`ee917386…`) |
| 15:03 | one geometry computation (no ride): the board's centre of mass and the stance's middle |

---

## 1. Question 1: the trace, substep by substep (new rider standing, his address)

*Code at `ef7908f2` (unchanged here). `AR` = `src/physics/AttachedRider.ts`, `BB` = `src/physics/BoardBody.ts`, `SB` =
`src/physics/standingBody.ts`. Each claim below is checked numerically in §2 (R_s, the linear residual) on every standing
and prone substep of this round's rides.*

**Before the solve** (`BB:1546` `rider.prepare`):
- The arm a = position − board.centerOfMass (`AR:3684`); the frame (up n, across t, forward f) from the heading, the leg
  line's pitch and its measured bank (`AR:5553–5593`). `carried` b = target − c plus the body's offsets along n, t and,
  for the new rider, f (`AR:3703–3711`): with n, t, f orthonormal, **b = a**.
- `drive` = 0 for the free body: `uprightVelocity` returns nothing (`AR:5631`), the balance shift and sway are not added
  (`AR:3717`), and the posture correction's error has its n, t and f parts removed (`AR:3726–3729`), so it is 0.
- The three relative rates are **re-measured from the body's velocity** every substep: the leg's s = (v_r − carried
  velocity)·n (`AR:4563`), the bank's u = (v_r − carried velocity)·t (`AR:3807`), the pitch's w along f (`AR:3772–3773`).
  So the solve's `mismatch` (`AR:5004–5007`) is zero to rounding: **no velocity is re-set** at a substep's start.
- The rotors move here: the swing (the hip across, `AR:4078`, about `rollAxis`, horizontal) and the trunk in pitch
  (`SB:305–310`, about t, with a clamp at its range that zeroes its rate).

**The solve** (`BB:1549–1575`), one 9 × 9 system over (Δv, Δω, Δs′, Δu′, Δw′):
- Rows 0–5 are **the composite's** (board plus body). The board's own mass, inertia and the water's implicit terms are
  the 6 × 6 block (`BB:1422`, `1539–1542`); `coupleYaw` adds the legs' rigid yaw share and the twist's β on n nᵀ and their
  kick on the right-hand side (`AR:4928–4933`); `coupleStanding` adds the body: m on rows 0–2 (`AR:4969`), −m [b]× and
  m [a]× (`AR:4981–4992`, **the m [a]× terms that carry the body's momentum into the board's angular rows**),
  m ((a·b) I − b aᵀ) (`AR:4994`), the columns and rows of the three relative unknowns m n, m (a × n), m t, m (a × t)
  (`AR:4971–4979`) and m f, m (a × f) (`SB:371–374`).
- Rows 6–8 are the body's own along n, t and f, with the leg's spring and damper (`AR:4996`), the ankle's across
  (`AR:5002`, k = 800, c = 80 over L²) and the pitch ankle's (`SB:376`) taken implicitly. They are springs, not
  constraints: at the substep's scale the body is a free point mass on three soft joints.
- The right-hand side: f = h F_ext − m·mismatch on rows 0–2 and a × f on rows 3–5 (`AR:5008`, `5028–5034`); the joints'
  explicit forces on rows 6–8 (`AR:5036`, `5038`, `SB:379`); the swing's, the twist's, the pitch hip's couples on rows
  3–5 (`AR:5042–5048`, `SB:380–384`); the hand's yaw on row 4 (`AR:5033`).
- Solved by `solveLinear` (`BB:1560`). The board's new velocity is the solution's rows 0–5 (`BB:1566`).

**Whether the feet can give it** (`AR:5099–5116` `settleStanding`): the body's new velocity v_b′ + ω′ × b + n s″ + t u″
+ f w″ gives the contact impulse J = m Δv_r − h F_ext, projected onto what a body on a deck can give (`AR:5656–5743`
`project`: pushing only, the centre of pressure inside the support, the friction cone, the knees' cap), and the legs'
power (`AR:5192–5224` `overPower`). **If the projection changes it, or the power is over**, the two are solved apart
(`BB:1567–1575`, `pushCapped` `BB:1728–1740`): the board on its own 6 × 6 rows (with `coupleYaw`'s rotors) with
−J at the arm (`AR:5119–5129` `pushBoard`), scaled by the legs' share (`AR:5271–5286`); the body gets J (`AR:5350–5351`).

**After the solve** (`BB:1600–1720`): the water's implicit impulses from the solution (`BB:1626–1627`, plate, foils), the
board's velocity (`BB:1704–1709`), the bed (`BB:1711`, after the solve), the board's position and orientation
(`BB:1713–1718`), then `finish` (`BB:1719`): the body's velocity is set to the solve's (`AR:5330–5332`), J recorded
(`AR:5333`), the rotors' spins moved on (`AR:5304`, `5308–5319`), the position advanced by v_r h (`AR:5420`) and the
frame re-read (`AR:5421`). `carried` and `arm` are re-set at the next substep's `prepare` from the new positions: a
geometric re-reading, not a change of any velocity.

**The paths, named.**
- *Where the body's reaction reaches the board:* every standing substep, coupled (rows 0–5 are the composite's, the
  body's momentum change at its own arm) or apart (−J at the arm, `pushBoard`); the yaw rotors through `coupleYaw` in
  both; the twist, swing, pitch-hip and hand couples on coupled substeps.
- *Where a velocity or spin changes without its reaction on the board* (counted in §2):
  1. **the apart substeps' couples**: on an apart substep the board is solved on its 6 × 6 rows, so the couples
     written into the 9 × 9 right-hand side — the pitch hip's, the swing's and the hand's — never reach it, while the
     trunk and swing rotors were moved in `prepare`;
  2. **the rotors' re-set on re-coupling**: back on the deck after an uncoupled substep, `coupleYaw` starts the legs'
     spin and the upper body's from the board's own turn (`AR:4907`, `4912`), with no impulse;
  3. **the trunk rotor's clamp** at its range (`SB:307–310`);
  4. **the bed**: `resolveBed` changes the board's velocity after the solve and `finish` reads it (`BB:1711`, `1719`);
  5. outside the substep: the bounds (`RideSession.holdInside`, the pair together) and lip strikes (external).
  None of them is the body's sideways momentum: the body's own linear momentum is always the solve's or J's.
- **u′ is the bank's own rate relative to the deck**: u′ / L = θ̇ − φ̇ (`AR:5335–5337`, the body's bank rate is u″ / L
  plus the board's roll rate about `rollAxis`), as in the model's pendulum. The freedoms the model lacks are the body's
  along the board (w′, the pitch ankle) and along the leg (s′); the freedom the game lacks is the body's own rotational
  inertia J about its centre (the model's `bodyInertiaAt`; the game has the swing and trunk rotors instead).
