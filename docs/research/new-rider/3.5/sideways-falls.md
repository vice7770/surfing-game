# 3.5v: the sideways falls after a centred-stick stand (diagnosis)

*Surfer-track builder, Claude Opus 5.5, high effort (a diagnosis with open causes; the instruments exist), 2026-11-23.
Branch `claude/sideways-falls` from `claude/cue-later` `4ccda729`. Diagnosis only: no fix ships. The owner (2026-11-23),
asked "Start the sideways-fall diagnosis next?": **"Yes, diagnose it."** His standing rulings: the turn is not to be
limited, the fall is the balance's lack of the ability to stand, no hidden motors.*

## 0. Pre-registration (written and committed before any arm ran)

### 0.1 The question

With the stick centred after a pop at the cue, why do stands that land at about 3.8–4.4 m/s through the water fall
sideways within about a second, while faster stands last? The same question for 3.5t's kind-b stands (mid-face,
3.3–3.7 m/s) and for the test wave's catch-start planing collapses (3.5t, switch off, 15–25° of roll by +0.5 s). For
each fall: (1) what fails first, by source, at the solver step; (2) is it a defect of the balance's own model or
reference, or something outside its authority.

### 0.2 The population (all re-run on one probe, one run per process)

Probe: `sideways-falls.ts` (3.5t's `slow-take-off.ts` drives, unchanged, plus the lateral instruments of §0.4). Owner's
address `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on`.

1. **Organic, `?cueLater=on`** (3.5u), Canyon B Medium, seeds 1–3, 12 periods, scripts `cue` and `cueC` (Compress from
   +0.2 s after the stand: the owner's way). Falls: s2w10, s1w8, s3w9, s3w6, s2w5 (both scripts), s2w6 (`cue`). Pop-up
   separation: s3w2.
2. **Catch, `?cueLater=on`**, the test wave's catch start, runs 0–9, `cue` and `cueC`. Run 3 separates in the pop-up;
   the other 9 are controls.
3. **3.5t switch off.** Organic kind b: s1w7, s1w8, s3w2 (and s1w11, s2w5 at 3.72–3.73), identified in §1 from 3.5t's
   rule (stand < 3.75 m/s, slope ahead stays > 0 for 0.5 s after the stand, lateral headroom goes first). Catch, runs
   0–9: the six planing collapses (`cue`, and the same runs under `cueC`); four controls.
4. **Controls:** every stand on the same arm that lasts ≥ 3 s (organic on: 7 `cue`, 8 `cueC`; catch on 9; catch off 4).
   Each fall is matched to the control nearest it in (speed through the water at the stand, face fraction, heading
   against the fall line), scaled by the population's spread (Euclidean on z-scores); the match is stated per fall.

The reproduction check: the probe's switch-on and switch-off baselines must reproduce 3.5u's and 3.5t's stand times,
stand speeds and fall times for every rider. If a rider differs, the probe is not inert and nothing is read until it is.

### 0.3 Margins (how "the sideways margin goes" is decided)

All in the board's frame, + toward the board's +x (its left rail), as the engine's capture point and CoP are.

- **M1, CoP demand:** the lateral headroom `headX = 1 − |copX| / halfwidth` ≤ 0, i.e. the demanded centre of pressure
  across (`desiredCop.x`) at or past the support's edge (3.5t's measure).
- **M2, infeasible contact:** the first substep at which the coupled solve's contact is infeasible (`settleStanding`
  returns false), with the engine's `limit`.
- **M3, capture point out of reach:** the engine's `human.state.beyond` (capture point across past the feet's reach).
- **M4, ankle overflow:** the first controller tick at which the raw ankle command exceeds the controller's own
  `limits.ankle` (`|raw| > range`), i.e. the hip is handed an excess.

**The first sideways escape** is the earliest of M1–M3 (the ways the balance can lose the lateral margin). M4 is a
mechanism marker, not an escape. For the pop-up separations (no `standing` frame), the escape is the separation itself
and only the roll, bank and the board's lateral motion are read.

### 0.4 The instruments, per frame from 0.1 s before the stand to the separation

- The fall's geometry: speed through the water, face fraction, the board's roll, the body's bank, the face's tilt
  across the board (`faceX`, the surface's slope on the board's horizontal x, + rising toward +x), the board's roll
  against the face (`roll − faceX`), the heading against the fall line (0° straight down the face, 90° along it).
- **The lateral ledger:** `bankLedger` per step (who leans the body, rad/s², per source; the moment per source on the
  body's row and on the board's roll row, N·m) with its closure, split and residual.
- **The controller:** each tick's schedule speed (the `speed` argument `tick` is called with), the raw ankle command,
  the limit, the sent command, and its exact decomposition `raw = ref.u − bias − Σ K·(x̂ − x_ref)` per state (board
  roll, its rate, body bank, its rate, yaw rate, sideslip, twist, …), the hip's torque.
- **3.5o's capture-point split on the board's x**, summed over each frame's substeps: board centre-of-mass
  acceleration / deck rotation at the feet / deck axes turning / rider's own mass / felt vertical / position / 1/ω,
  with its identity checked against the engine's capture point each substep.

### 0.5 The classification rule

Causal arms, each paired against the same stand without it, one run per process: `&plantFloor=4.5` (holds the gain
schedule and plant table at ≥ 4.5 m/s: mechanism A), `&faceTrim=on` (the face model: mechanism B), and both. The
stand itself must be identical across arms (same stand time and speed), or the pair is reported as unpaired.

Per falling stand, an arm **rescues** it if it carries ≥ 3 s, **delays** it if it adds ≥ 0.25 s, and otherwise does
nothing. Then:

- **A** — `plantFloor` alone rescues or delays it, `faceTrim` alone does not.
- **B** — `faceTrim` alone rescues or delays it, `plantFloor` alone does not.
- **A+B** — both alone do, or only the two together do.
- **C** — no arm rescues or delays it.

The ledger must corroborate the arm before a mechanism is named:
- A needs, before the escape, either an ankle overflow (M4) or a command dominated (largest |term|) by the sideslip or
  yaw-rate term, with the schedule speed < 4.5 m/s;
- B needs the board rolled onto its downhill rail against the face (or flush with the face) before the escape, with the
  command's bank term rolling it further;
- A or B without its corroboration is reported as "arm effect, mechanism unconfirmed".

For C, the ledger names the leading term: the source with the largest share of the body's lean acceleration toward
the fall side, integrated from the stand to the escape, and the capture-point channel with the largest share of the
escape.

**Within the balance's authority?** A fall is **within** it when, at the escape, the command is unsaturated or points
away from the fall side (the balance did not use the ankle and hip it had), or when A or B rescues it (its own model or
reference failed). It is **outside** it when the command is saturated toward recovery (raw at or past the limit, the
right sign) for the last 0.1 s before the escape and the leading term is the water's (hull pressure, rails, fins,
buoyancy) or the pop-up's landing.

### 0.6 What I expect (stated before any arm runs)

- The organic switch-on falls at 3.8–4.4 m/s sit in the row-`'4'` blend band (schedule speed < 4.5) with no lean
  asked, so the reference is zero (no phantom sideslip); I expect the row-`'4'` **gains** (sideslip 0.2 → 2.4, bank
  2.1 → 7.1) acting on a real sideslip on the face to overflow the ankle and push the board out (A-like), and
  `plantFloor=4.5` to delay some of them.
- Kind b (3.3–3.7) is below the schedule's floor (4.0 clamps): the same, and more so.
- The catch collapses, planing at 3.8–4.3, roll 15–25° by +0.5 s: I expect B (flush with the face, the bank term
  rolling it further) more than A.
- If neither arm moves the falls, the candidate is (C) the landing: the first command's 0.1 s sense delay against the
  pop-up's landing posture.
