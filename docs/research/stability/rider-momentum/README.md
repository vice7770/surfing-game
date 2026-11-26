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

(none yet)

### 0.9 The order of the round (UTC, 2026-11-26)

| time | step |
| --- | --- |
| 2026-11-26 | Vicente approves the round: "Yes, start 3.6f" (relayed by the coordinator, consult log `dab31365`) |
| 14:52 | the worktree at `abe24730`; the brief's sha1 checked (`ee917386…`) |
| 15:03 | one geometry computation (no ride): the board's centre of mass and the stance's middle |
