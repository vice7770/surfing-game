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
2. *2026-11-26, about 15:25 UTC, after reading amendment 1's glide rerun (`36f/glide2/`, probe sha1 `8b6e64e1…`) and
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
3. *2026-11-26, about 15:35 UTC, after reading the twin regressions of `regress.ts` (C4, C4b, Q2, Q4, all three stances)
   and before running the analysis it adds; exploratory, it decides nothing:* **the lever's twin difference split into
   the force's change at the base's arm and the arm's change against the base's force.** Per frame, with the base ride's
   own arm and contact force (its `m` rows, the same wave and frame): δ(levL) ≈ −a_fwd,0 δJ_side − J_side,0 δa_fwd and
   δ(levF) ≈ a_side,0 δJ_fwd + J_fwd,0 δa_side, each regressed with 3.6e's 14 regressors as in `regress.ts`
   (`decomp.ts`). Why: in `regress.ts` the rider's yaw per β (−250 N·m/rad in Compress above 8.7 m/s, "a term the model
   lacks" in 3.6e) sits in the lever (−lev −208 of −251), and the arm along the board moves with the body's pitch
   freedom w′, which the model lacks; this split says which part carries it.
4. *2026-11-26, about 15:37 UTC, after the unit reads on Big seed 1 and the model's first unit reads (`model.ts`), and
   before running what this adds; exploratory and model-only, it decides nothing:* **the model's unit reads with the
   body's own rotational inertia J removed** (`body: { inertia: 0 }`, `twoBody`'s own control), and J, h and the
   pendulum's effective mass at the feet m J / (J + m h²) printed beside. Why: the game's side impulse at the feet turns
   the board about 3.6 times as much as the model's (−0.076 against −0.021 rad/s per N·s, Compress), and with the body
   rigid (D) only 1.3 times; the game's body is a point mass on its leg (no J), the model's has J; this says how much of
   the difference J carries.

### 0.9 The order of the round (UTC, 2026-11-26)

| time | step |
| --- | --- |
| 2026-11-26 | Vicente approves the round: "Yes, start 3.6f" (relayed by the coordinator, consult log `dab31365`) |
| 14:52 | the worktree at `abe24730`; the brief's sha1 checked (`ee917386…`) |
| 15:03 | one geometry computation (no ride): the board's centre of mass and the stance's middle |
| **15:07:57** | **this pre-registration** (`b954e321`), before any run |
| 15:13:21 | the probe bundled (sha1 `c6d69c9a…`); the three glides and Big seed 1's three twin runs launched (6 processes) |
| 15:15:09 | the glides exit 0 (104–107 s); their `m` and `mprone` rows read (15:16–15:20) |
| **15:22:31** | **amendment 1** (`372e9ee2`, with `regress.ts`, `model.ts`, `accounting.py`); probe `8b6e64e1…`; the glides and the base rides rerun |
| 15:24:28 | amendment 1's glides exit 0; read |
| 15:25 | amendment 1's base rerun stopped before its first ride (no row read) |
| **15:25:43** | **amendment 2** (`0bed1af3`); probe `19a792ec…`; the glides and the base rides rerun |
| 15:27:35 | amendment 2's glides exit 0; read 15:27:39 |
| 15:27:57 | the full stability report starts (4 processes; `src` unchanged) |
| 15:28 | `npx tsc -b` clean; the gain lock 5 of 5 |
| 15:31:13–15:31:50 | the Big seed 1 twin runs exit 0 (1,071–1,107 s) |
| 15:31:46–15:32:03 | the read-only check against 3.6d's `big_s1.jsonl`: identical |
| 15:32–15:34 | **the first Big seed 1 values read**: `regress.ts` (C4, C4b, Q2, Q4), all three stances; the twin runs' accounting |
| **15:35:07** | **amendment 3** (`39d4910e`, `decomp.ts`), then run |
| **15:37:12** | **amendment 4** (`48a3b9eb`), then the model's reads without J |
| 15:37:48–15:42:37 | the Canyon byte check: identical |
| 15:40:07 | the amended base rerun exits 0 (861 s); its accounting (R_O's split) and its read-only check (identical) |
| 15:43 | the archive (`runs/`), checked: the regressions rerun on the slim twin rows give the same JSON |
| 15:58:07 | the full report ends: 227 of 227 and 26 of 26 identical, 0 regressions |

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

## 2. Question 2: the momentum accounting, measured

*Every standing substep of the three glides (the test wave, `TW=catch`, 5 s each; probe `19a792ec`, amendments 1–2) and
of Big seed 1's three base rides (organic, PERIODS 12, six standing rides per stance, 5 s each; the twin runs' probe
`c6d69c9a` for R_s and the lever, the base rerun's `19a792ec` for R_O's split; the two give the same R_s, bit for bit).
Game signs: yaw about the world's up, + nose to the board's left; R_s and R_led about the board's centre of mass at
the substep's start; R_O about the board's centre of mass at the frame's start, held through the frame. Per substep in
N·m·s, per frame as the frame's mean in N·m. Tables: `results/accounting.md` (Big seed 1 and the glides).*

**The controls first (they pass).**

| control | sample | result | pass line |
| --- | --- | --- | --- |
| **C1** the bare board on the Canyon face | 6 boards × 120 steps (720 frames), copied from the tall rides at tS 0.5 s, 6.9 m/s | closed ledger's residual per frame ≤ **3.9 × 10⁻¹⁵ N·m** (the water's yaw sum RMS 0.42 N·m; the shipped ledger's duplicate RMS 0.64 N·m); linear ≤ 1.4 × 10⁻¹⁴ N·s per substep; R_O RMS 0.007 N·m (the board's own rotation integrator) | ≤ 10⁻⁶: **pass** |
| **C2** the rider prone (`couple`) | 27,128 prone substeps on Big seed 1 per stance file (27,014 feasible), 1,163 on the glide | R_s ≤ **1.2 × 10⁻¹⁴ N·m·s**; linear ≤ 1.4 × 10⁻¹³ N·s | ≤ 10⁻⁹ × scale + 10⁻⁹: **pass** |
| **C3** the unit reads' known answer | every unit-read substep | (D) − (B) = (K) − (B) to ≤ 6.3 × 10⁻⁸ relative; (C) = `bankLedger.yawPer` exactly on the glides | ≤ 2 %: **pass** |
| the read-only check | Big seed 1 | 18 of 18 `stand`, 4,164 of 4,164 `f`, 4,155 `o` and 4,155 `w` rows and 60 of 60 `kbase` rows identical to 3.6d's `big_s1.jsonl`; the 975 open `kick` rows identical in every 3.6d field except `maxDiff`, which is taken over the channels this probe adds | **pass** |

**The standing substeps.**

| ride | stance | standing frames (substeps) | R_s, largest per substep | linear residual, largest | jumps between substeps | the arm along (median [5 %, 95 %]) | RMS lever lev (its lateral part, its forward part) | apart substeps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| glide | Compress | 301 (4,832) | 2.3 × 10⁻¹⁴ N·m·s | 3.3 × 10⁻¹³ N·s | 0 | −0.267 [−0.472, −0.117] m | 2.5 (5.4, 3.9) N·m | 311 (6.4 %) |
| glide | tall | 288 (4,624) | 1.0 × 10⁻¹⁴ | 3.2 × 10⁻¹³ | 0 | −0.317 [−0.689, −0.102] | 2.6 (2.1, 0.7) | 89 (1.9 %) |
| glide | tuck | 251 (4,032) | 8.5 × 10⁻¹⁵ | 3.3 × 10⁻¹³ | 0 | −0.245 [−0.348, −0.119] | 7.0 (11.2, 4.8) | 315 (7.8 %) |
| Big s1 | Compress | 1,383 (22,224) | 5.1 × 10⁻¹⁴ | 4.4 × 10⁻¹³ | 0 | −0.258 [−0.377, −0.083] | 8.7 (16.1, 8.5) | 466 (2.1 %) |
| Big s1 | tall | 1,387 (22,288) | 6.7 × 10⁻¹⁴ | 4.1 × 10⁻¹³ | 0 | −0.298 [−0.502, −0.032] | 6.6 (15.6, 10.1) | 62 (0.3 %) |
| Big s1 | tuck | 1,385 (22,256) | 4.7 × 10⁻¹⁴ | 4.5 × 10⁻¹³ | 0 | −0.245 [−0.341, −0.110] | 8.2 (12.8, 6.2) | 964 (4.3 %) |

No substep had bed contact, `agile` or `drives` on. Beside the lever, the size the model's own term would have if the
board's path turned with its heading, m V x_f r: RMS 17.5 / 17.5 / 19.9 N·m on the glides and 55 / 29 / 27 N·m on Big
seed 1 (the model's term is m V x_f (r + β̇), which is near 0 when the heading swings and the path does not, so this is
an upper size, not a prediction). The arm is the body's centre from the board's, in the heading frame
(across within 0.01 m, up 0.40–0.83 m by stance).

1. **The solve creates or destroys nothing.** On every standing substep, feasible and apart, the closed ledger's
   rider term equals the body's reaction at its own arm plus the two yaw rotors' reactions,
   R_led = −(a × J)_y − lower (n·ω′ − spin₀) n_y − I_u (upper′ − upper₀) n_y (− h τ_hip across_y + h handYaw when
   feasible), to **≤ 6.7 × 10⁻¹⁴ N·m·s** per substep; over the twin sets ‖yRid − (lev + rot)‖ / ‖yRid‖ =
   1.3–1.6 × 10⁻¹⁰. The composite's linear momentum closes to ≤ 4.5 × 10⁻¹³ N·s against the water's impulses
   (the `forces` sums), gravity and the water on the body. Nothing changes between substeps (the jumps are exactly 0).
2. **About a fixed point** (amendments 1–2), the composite's yaw angular momentum (the board, the body as a point, the
   yaw and trunk rotors) closes to **≤ 2.7 × 10⁻⁹ N·m** per frame once three named terms are booked:

   | Big s1 | frames with no apart substep: RMS R_O = RMS (rotor axis + integrator); rest, largest | frames with apart substeps: n; RMS R_O; of it the trunk rotor (hipA), the integrator (gyA); rest, largest | the stand's frame (6 rides) |
   | --- | --- | --- | --- |
   | Compress | 0.46 N·m; 2.5 × 10⁻⁹ | 31; 16.0; 2.6 × 10⁻⁵, 0.010; 7.1 × 10⁻¹⁰ | −65 to +51 N·m |
   | tall | 0.63; 2.2 × 10⁻⁹ | 4; 2.8; 0, 0.006; 4.9 × 10⁻¹⁰ | the same |
   | tuck | 0.32; 2.5 × 10⁻⁹ | 67; 21.0; 1.4, 0.021; 2.7 × 10⁻⁹ | the same |

   (The glides: the same, with the Compress glide's 20 apart frames at its end carrying hipA RMS 82 N·m.) The three:
   - **the yaw rotors' axis**: `coupleYaw` keeps each rotor's spin as a number about the current leg line, so when the
     leg line tilts the rotor's angular momentum turns with it with no torque (`AR:4904–4933`, `5304`): RMS 0.3–0.6 N·m
     on feasible frames, the bulk of R_O on apart ones (3–21 N·m);
   - **the trunk rotor on apart substeps** (path 1 of §1): its rate moves in `prepare` (`SB:305`) and its couple, written
     only into the 9 × 9 right-hand side (`SB:380–384`), never reaches the 6 × 6 apart solve: up to 1.4 N·m RMS on Big's
     apart frames, 82 on the Compress glide's; the swing rotor's couple is lost the same way but turns about the
     horizontal `rollAxis`, so it has no yaw part (it is a roll-side loss, not measured here);
   - **the rotors' start at the stand** (path 2): the legs' and the upper body's spins start from the board's turn,
     6 frames, −65 to +51 N·m each;
   - beside them the board's rotation integrator (the explicit gyro and the inertia rotated after the velocity update):
     0.006–0.021 N·m RMS.
   None of them is the body's linear momentum.
3. **The residuals regressed as 3.6e's question 1** (`results/regress-<stance>.md`; Big seed 1's open twins at ≥ 4 m/s,
   3.6e's 14 regressors, its frozen bins; model signs, per unit command): R_s's coefficients are ≤ 1.1 × 10⁻⁹ in
   every entry. R_O's, pooled, per yaw rate r: **+0.28 ± 0.25 (Compress), +1.05 ± 0.80 (tall), +0.22 ± 0.10 (tuck) N·m per
   rad/s**, against the missing m V x_f = 182 / 185 / 175; per yaw acceleration ṙ: +0.04 ± 0.04 / −0.03 ± 0.02 /
   +0.002 ± 0.002 N·m per rad/s², against the missing m x_f² = 4.35. **The coupling's own residual carries under 0.6 %
   of either.**

**Deviations, stated.** (i) My prediction gave R_s's line as "≤ 10⁻⁹ relative"; on substeps where every term is
about 10⁻¹² N·m·s (the feet nearly unloaded) the relative measure reaches 3 × 10⁻⁷, so I report the absolute
(≤ 6.7 × 10⁻¹⁴ N·m·s) and C2's form (≤ 10⁻⁹ × scale + 10⁻⁹), which every substep passes. (ii) The model's unit reads
were taken at 8 and 10.5 m/s, rail 0, each stance's depth, not at each sample's own speed, depth and rail as §0.5
said; across 6–10.5 m/s they move by under 1 %.

My prediction 1 held for R_s and the linear residual; it was wrong about R_O, which needed the rotors' axis and the
apart substeps' trunk rotor named before it closed (amendments 1–2, after the glides' first rows).

## 3. Question 3: the yaw inertia the board feels, from the unit impulses

*Per standing substep of the base rides, the board's yaw-rate answer n·Δω to a unit yaw impulse about the body's up n on
the substep's own matrices, as an inertia 1 / (n·Δω), kg·m²; medians over frames. The glides: frames 60–299 after the
stand (7.9 m/s); Big seed 1: the frames m … m + 59 after 3.6d's kick times (about 10.4 m/s). (C) is the bank ledger's
own (v) `yawPer` (checked on the glides). The model's: `lateralCompliance` of his plant (`plantAt`, his options) at
8 and 10.5 m/s, rail 0, `results/model.md`.*

| | Compress glide / Big | tall glide / Big | tuck glide / Big |
| --- | --- | --- | --- |
| (A) the board and the water | 0.50 / 0.55 | 0.51 / 0.55 | 0.50 / 0.55 |
| (B) plus the yaw rotors = I_board + the legs | 1.75 / 1.80 | 1.88 / 1.93 | 1.36 / 1.41 |
| **(C) the full standing system: what the board feels** | **1.77 / 1.81** | **1.89 / 1.93** | **1.39 / 1.43** |
| (D) the body welded at its arm (= the known answer (K), to 10⁻⁷) | 1.88 / 1.86 | 2.00 / 1.98 | 1.50 / 1.48 |
| I_board + the legs + m x_f² (3.6e's −5.59 per ṙ) | 6.09 / 6.14 | 6.22 / 6.27 | 5.70 / 5.76 |
| the model, instantaneous (its I_z = board + legs) | 1.93 (1.81) / 1.95 (1.82) | 2.06 (1.94) / 2.07 (1.95) | 1.55 (1.42) / 1.57 (1.44) |
| the model, its board's sway held | 2.55 / 2.56 | 2.55 / 2.57 | 2.31 / 2.32 |
| the model without the body's own inertia J (amendment 4) | 1.81 / 1.82 | 1.94 / 1.95 | 1.42 / 1.44 |

| a unit side impulse at the feet's station: the board's yaw-rate answer, rad/s per N·s | Compress glide / Big | tall | tuck |
| --- | --- | --- | --- |
| the game, (C) / the body welded (D) | −0.087 / −0.076; (D) −0.014 / −0.027 | −0.088 / −0.075; (D) −0.029 / −0.040 | −0.103 / −0.088; (D) +0.001 / −0.020 |
| the model / without J | −0.021 / −0.135 | −0.023 / −0.126 | −0.022 / −0.170 |

1. **The board feels the board, the water and the legs, in the game and in the model alike.** At the substep the
   body's 73 kg adds 0.01–0.03 kg·m² in the game ((C) − (B)), and even welded at its arm only 0.05–0.11 ((D) − (B)):
   the 2.54 kg board's centre is free to swing sideways under a turn, so a pure yaw impulse turns the pair about a
   point near the body (the reduced mass, 2.45 kg, at the 0.25–0.30 m arm). **The model does the same**: its own
   instantaneous yaw inertia is its I_z plus 0.13 kg·m², and 2.55 only with its board's sway held. **m x_f² (4.35) is
   felt by neither.** The −5.59 kg·m² of 3.6e's table is a partial derivative of the model's yaw row written through H's
   kinematics (§4), not the inertia its board meets.
2. **The one difference at the substep is the body's own inertia J.** The model's two-body body (`riderBody=two`) has a
   frontal inertia J (4.6 kg·m² in Compress, 8.7 tall, 3.1 the tuck) that ties m J / (J + m h²) = 12.7 / 10.5 / 15.2 kg
   of it to the feet's sideways motion; the game's body is a point mass on its leg (its swing rotor is moved by the hip's
   torque, not by the feet), so nothing of it is tied to the feet. A side push at the feet therefore turns the game's
   board 3.3–4.7 times as much as the model's; the model without J turns it more than the game (−0.13 to −0.17). Removing
   J also brings the model's instantaneous yaw inertia to the game's (1.81 against 1.81 in Compress).

My prediction 2 held ((C) within 5 % of (B), the welded body adding about 0.1, the model's own answer within 0.5 of its
I_z).

## 4. Question 4: does the ledger book any of the rider's reaction as water?

1. **The closed ledger closes on a Canyon face with no rider**: ≤ 3.9 × 10⁻¹⁵ N·m per frame (C1, §2).
2. **Standing, it books the body's reaction as the rider's, all of it**: the rider term equals −(a × J)_y plus the
   rotors to 6.7 × 10⁻¹⁴ N·m·s per substep (§2). No water entry holds any part of the body's reaction.
3. **But the water answers the body's push physically, and that answer is what made part of 3.6e's water terms look
   odd.** The water's yaw sum's twin difference, regressed on 3.6e's seven water regressors plus the lever moment −lev
   (model signs), takes **−1.56 ± 0.11 (Compress), −1.15 ± 0.08 (tall), −1.72 ± 0.14 (tuck) N·m per N·m of the
   rider's lever** (pooled ≥ 4 m/s; by bin −1.05 to −1.90), and R² rises from 0.66 / 0.33 / 0.78 to 0.89 / 0.82 / 0.90:
   the hull and the fins resist the sway the body's push gives the light board, with a yaw moment of the other sign.
   With the lever in the regression **the water's "yaw per ṙ" falls from +0.93 to +0.41 (Compress) and from +0.55 to
   +0.24 (the tuck)** (tall +0.14 → +0.15): about half of 3.6e's "negative added inertia" is the water's answer to the
   rider's push, aliased onto ṙ.

My prediction 3 held for the booking; the water's answer to the lever is about −1.5 per unit, larger than the "small
negative coefficient" I guessed.

## 5. The known answer for 3.6e's regression (C4, C4b) and the lever's parts

*Big seed 1's open twins passing over 1.0 s at ≥ 4 m/s (Compress 22, tall 19, the tuck 28; Compress has none below
8.7 m/s on this seed), 3.6e's own `ledgerSet` and `regress`, imported unchanged, its 14 rider regressors; model signs,
N·m per unit command; ± cluster-robust standard errors (by set). `results/regress-<stance>.md`.*

**C4.** The synthetic term y_syn = −x_f H_game − I_r ṙ — the game's own measured lateral force on the body, H_game
= −J_side / dt, put at **the model's own lever** x_f = −0.244 m by construction — returns:

| stance, group (sets, mean speed) | per r: y_syn / its expected m V x_f | per β̇ | per ṙ: y_syn / −(I_r + m x_f²) | 3.6e's term on the same sets: per r, per β̇, per ṙ |
| --- | --- | --- | --- | --- |
| Compress, [8.7, 10.1) (10, 9.6 m/s) | 7.5 / 171 (**0.044**) | 2.0 / 171 (0.011) | −1.34 / −5.59 (0.24) | +9.7, −0.4, −1.17 |
| Compress, [10.1, ∞) (12, 11.0) | 5.3 / 196 (**0.027**) | 1.6 / 196 (0.008) | −1.38 / −5.59 (0.25) | +9.2, +0.5, −1.34 |
| Compress, all (22, 10.4) | 6.7 / 185 (**0.036**) | 1.6 / 185 (0.008) | −1.33 / −5.59 (0.24) | +8.8, +0.8, −1.28 |
| tall, all (19, 10.5) | 7.6 / 188 (0.041) | 1.0 / 188 (0.006) | −1.13 / −5.72 (0.20) | +14.3, −0.2, −1.86 |
| the tuck, all (28, 10.0) | 7.7 / 178 (0.043) | 2.7 / 178 (0.015) | −0.99 / −5.21 (0.19) | +20.9, +2.8, −0.81 |

- **The regression does not see the lever even where it is there by construction** (C4's line, all three within 30 %,
  fails in every group): per r 2–6 %, per β̇ 0.6–2.5 %, per ṙ the legs' share alone. **This is 3.6e's "gap", reproduced
  from a term that has the model's m V x_f and m x_f² ṙ in it by construction.** 3.6e's own term on the same sets (the
  table's last column) matches 3.6e's published Compress bins 2 and 3 (+10 / +10 per r, ≈ 0 per β̇, −1.3 per ṙ;
  seed 1 has no Compress set below 8.7 m/s).
- **Where the regression puts the lever instead: on the ankle's states.** y_syn's coefficients per φ, θ and δ are
  +355 ± 29, −176 ± 22 and +324 ± 31 (Compress, [8.7, 10.1)): x_f k / h = 0.244 × 800 / 0.55 = 355, and −x_f (k − m g h)
  / h = −178. The body's lateral force *is* the ankle's torque over the leg plus its weight's lean: H_game on the
  14 regressors has R² 0.95–0.99 with per φ +1,453 and per δ +1,326 against k / h = 1,455, per θ −722 against
  −(k / h − m g) = −739 (Compress). In the model too H = (−τ + m g h θ − J θ̈) / h exactly (`twoBody`'s bank row), so the
  model's yaw row has two equal representations, and 3.6e's "model coefficients" are the kinematic one only.
- **C4b, the kinematic identity, fails in the measured regressors**: H_game on [β̇, r, ṙ, θ̈, φ̈] returns per r 180 /
  306 / 202 and per β̇ 52 / 43 / 110 against m V = 757 / 769 / 729, R² 0.61 / 0.75 / 0.53 (Compress / tall / tuck): the
  regressors as measured do not rebuild the body's sideways acceleration, so least squares takes the ankle's
  representation, which they rebuild almost exactly. Why they do not (β measured against the water's flow, the leg's
  length changing, finite differences at 60 Hz) I did not settle.
- **The lever's parts** (amendment 3, exploratory): the lateral force at the base ride's own arm carries −levL whole
  (per φ 311 of 314, per β −139 of −141, Compress); the arm's own motion along the board (the pitch freedom w′, which
  the model lacks) carries ≈ 1 % (R² 0.04–0.14). The forward part −levF is the body's forward load (about −130 N on the
  glide) at its sideways swing, the analogue of the model's −(F_x / m g) τ. 3.6e's "rider's yaw per β" (−251 ± 52,
  Compress) sits in the lever (−208) and the rotors (−42); it is not the pitch freedom's. Its mechanism I did not settle.

My prediction 4 held.

## 6. Question 5: the verdict, with sizes

3.6e's gap: the rider's yaw per r and per β̇ at 0–9 % of m V x_f (110–190 N·m per rad/s), and per ṙ the legs' 1.1–1.3
kg·m² against −(I_r + m x_f²) = −5.59.

| candidate | carries of the gap | sizes (N·m per rad/s of r; per rad/s² of ṙ; Compress unless said) |
| --- | --- | --- |
| **(a) a leak or hidden source in the coupling** | **none** | R_s per r ≤ 3 × 10⁻¹¹, per ṙ ≤ 2 × 10⁻¹²; R_O per r +0.28 ± 0.25 (tall +1.05 ± 0.80, tuck +0.22 ± 0.10), per ṙ +0.04 ± 0.04: under 0.6 % of the missing 182 and 4.35. Three real non-conservations exist, all small and none the body's sideways momentum: the yaw rotors' axis (RMS 0.3–0.6 N·m), the trunk rotor's couple lost on apart substeps (≤ 1.4 N·m RMS on Big's apart frames, 82 on the Compress glide's last 20; the swing rotor's is lost the same way, in roll), the rotors' start at the stand (−65 to +51 N·m in one frame per ride). Places: `AR:4904–4933` and `5304`; `SB:305` against `SB:380–384` and `BB:1567–1575`; `AR:4907`, `4912`. **Not fixed.** |
| **(b) the reaction booked as water** | **none** as booking | the ledger's rider term is the body's reaction at its arm plus the rotors to 1.4 × 10⁻¹⁰ relative; the bare board closes to 4 × 10⁻¹⁵ N·m on the face. The water's *physical* answer to the push, −1.56 ± 0.11 N·m per N·m of the lever, carries about half of 3.6e's water yaw per ṙ (+0.93 → +0.41; the tuck +0.55 → +0.24). |
| **(c) a freedom the model lacks** | **none of the regressed gap**; one real difference at the substep | the pitch freedom carries ≈ 1 % of the lever's lateral part. The difference found is the other way round: the model's body has a frontal inertia J (4.6 kg·m² in Compress) that ties 12.7 kg of it to the feet's sideways motion, the game's point-mass body ties none: a side push at the feet turns the game's board 3.3–4.7 times as much, and J adds 0.13 kg·m² to the model's instantaneous yaw inertia (0.74 with its sway held; the game's (C) is 0.14–0.16 below the model's). Its effect at the swing's 2.5–3 Hz is not measured. |
| **(d) the method** (registered as a candidate in §0.5) | **all of it** | C4: 3.6e's own regression returns per r 2.7–5.7 %, per β̇ 0.6–2.5 %, per ṙ 19–25 % of the model's from a term built with the model's lever by construction: the same pattern as 3.6e's 0–9 % and "the legs alone". The body's reaction acts on the game's board at its own arm, 0.245–0.30 m behind the board's centre (median), and 3.6e's regression files it under the ankle's states (φ, θ, δ), whose coefficients 3.6e left unread (VIF 36–150). |

**So: the board does feel the rider's sideways momentum, at the 0.25–0.30 m lever, exactly as the solve is written;
3.6e's term table could not see it.** "The yaw inertia the board feels is the legs' alone" is true at the substep, and
true of the balance's own model as well (§3): a sudden turn of a 2.54 kg board does not drag a 73 kg body sideways in
either. My prediction 5 said (d) for most of the gap and (c) for the rest; the regressed gap is (d) whole, and the (c)
difference found (the body's J) is the model's extra, not the game's.

## 7. Controls of the round

| control | result |
| --- | --- |
| `git diff ef7908f2 --stat -- src scripts` | empty: no `src` or `scripts` change, so no measurement switch, and the quick report is not required |
| the full stability report, `npm run report:stability -- --mode full`, 15:27:57–15:58:07 UTC (30.1 min), beside the reruns and the byte check | exit 0, **0 regressions**, 0 improvements; **227 of 227** ride lines identical to `baseline-full.json` in every field, its **26 of 26** test-wave lines identical to `baseline-quick.json` (3.6c's `same.py`; `results/report-full.txt`). The quick report was not run: `src` is unchanged |
| the Canyon byte check (`scripts/m1-cpu-bench.ts`, fresh spin-up, 3,600 steps) | snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`: **identical** (`results/byte-check.txt`) |
| `npx tsc -b` | clean (15:28) |
| the gain lock, `npx vitest run src/physics/stabilityGains` | 5 of 5 (15:28) |
| C1–C4, the read-only check | §2, §5 |
| no arm, no hidden motor, no bound touched | the round ran the shipped game; every probe wrapper calls the shipped method and only reads |

## 8. For Vicente

- **The game's physics is not dropping the rider's sideways momentum.** Every time the board turns, the rider's push
  on it is applied where the rider stands, about a quarter of a metre behind the board's middle, and the books balance to
  the last digit the computer keeps. The last round's reading — that the board barely feels the rider when it turns —
  came from how that round took the numbers apart, not from the game: given a test case with the full effect built in,
  the same method reported it as almost absent.
- **What is true is gentler:** at the instant the board starts to turn, neither the game nor the balance's own picture of
  the board makes the rider's body resist it much, because the light board slides sideways under the heavy body.
- **One real difference between the game and the balance's picture:** the picture gives the rider's body a rotational
  inertia of its own, which makes the feet drag part of the body sideways; the game's body has none. A sideways push at
  the feet turns the game's board three to five times as much as the picture expects. Whether that matters for the wobble
  at 2.5–3 Hz is not measured yet.
- **Three small bookkeeping faults in the game, all found and none fixed** (a fix changes the physics and needs your
  word): the legs' spin is tilted with the leg without a torque; on the substeps where the feet cannot hold, the trunk's
  and the hips' rotations push on nothing; and at the stand the legs' spin starts from the board's. None is the rider's
  sideways momentum, and they are small except in the moments the feet lose their hold.

**No change is proposed or made.** What this suggests, each needing your word: (1) do not correct the balance's picture
of the rider's lever from 3.6e's term table; (2) the body's missing rotational inertia (game) against the picture's is
the next model-only test, on the twins' responses rather than on coefficients; (3) whether to fix the apart substeps'
lost couples is a game-physics question for you.

## 9. What I could not settle

- **Why the kinematic identity fails in the measured regressors** (C4b, R² 0.53–0.79): the regressors as measured do
  not rebuild the body's sideways acceleration. Candidates: β measured against the water's flow under the board, the
  leg's length changing with the stance, 60 Hz differences of a 2.5–3 Hz ring.
- **Whether the game's and the model's rider moments agree on the swing's timescale.** C4 shows 3.6e's coefficients
  cannot decide it; a like-for-like test is the model's own twins (3.6e's known-plant machinery) through the same
  regression, or the responses compared directly. The body's J (§3) is the first candidate difference.
- **The rider's yaw per β** (−251 ± 52 N·m/rad in Compress): it is in the body's reaction at its arm (lateral −139 and
  forward −67) and the rotors (−42), not the pitch freedom's; what makes the body's lateral force follow the slip I did
  not trace.
- **The roll side**: the swing rotor's couple lost on apart substeps acts in roll; R_O was taken in yaw only.
- **One seed.** Big seed 1 alone (22 / 19 / 28 open sets), as the brief asked; C4's result does not depend on the
  sampling (it holds in every group), but the coefficients' sizes do.

## 10. Where everything is, and how to recompute it

- **Raw runs** (session scratchpad):
  `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36f/`:
  `glide/`, `glide2/`, `glide3/` (the glides with the registered probe and amendments 1 and 2), `big/` (Big seed 1's
  twin runs, one file per stance, with the tall file's bare boards), `base3/` (amendment 2's base rerun), `bin/` (every
  bundle: `mp.mjs` `c6d69c9a…`, `mp2.mjs` `8b6e64e1…`, `mp3.mjs` `19a792ec…`, and the readers), `reg/` (the regressions),
  `rep/full/` (the full report), `byte/` (the byte check), `status.txt` (every run's exit and time). 3.6d's
  `36d/twins/` and 3.6e's `36e/` were read only.
- **Archived here** (`runs/`): `glides.tar.gz` (amendment 2's glides: `stand`, `weights`, `m`, `mprone`, `summary`),
  `base.tar.gz` (amendment 2's Big seed 1 base rides and bare boards: the same kinds and `bare`), `twins.tar.gz`
  (Big seed 1's twin runs: `kbase`, every open `kick` row with its `d` and `e`, the base rides' `m` rows, `bare`;
  checked: `regress.ts` on these rows gives its JSON identically).
- **The scripts** (bundle with `./node_modules/.bin/rolldown <file> --file <out>.mjs --format esm --platform node`, then
  prepend `globalThis.location = { search: '' };`):
  - `momentum-probe.ts`: the probe (3.6d's with §0.2's additions and amendments 1–2); its environment as 3.6d's, plus
    `TWIN_MODES=open` and `BANK=on`. The rides: `MODE=tw TW=catch SCRIPT=<stance>:straight BANK=on`, and
    `MODE=organic SWELL=big PERIODS=12 SEED=1 SCRIPTS=<s> TWINS=<s> TWIN_MODES=open [BARE=on]`, with
    `EXTRA='&cueLater=on&plantFloor=6' HOLD=5 TURN_AT=1 TURN_FOR=1 KNOBS=`;
  - `accounting.py <glide dir> <big dir> <out.md> <out.json>` (Q2, C1–C3, Q3's game side);
  - `regress.mjs <script> <twins.jsonl> <out.md> <out.json> <lower>` (C4, C4b, Q2's regressions, Q4);
  - `decomp.mjs <script> <twins.jsonl> <out.md>` (amendment 3); `model.mjs` (Q3's model side, amendment 4);
  - `repro.py <3.6d big_s1.jsonl> <files…>` (the read-only check).
- **The results**: `results/accounting.md` (the glides and Big seed 1 from the amended probe; `accounting-twinruns.md`
  the same from the twin runs, R_O unsplit), `results/regress-<stance>.md`, `results/regress-summary.txt`,
  `results/decomp-<stance>.md`, `results/model.md`, `results/readonly-check.txt`, `results/byte-check.txt`,
  `results/report-full.txt`.
