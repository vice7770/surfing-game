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

### 0.7 Added after the switch-on organic baseline and the three arms, before running it (2026-11-23)

The baseline (§1) puts every switch-on organic sideways fall's first divergence in the balance's own command: from the
first tick after the 0.1 s blind start, the raw ankle command is 12–19° against 1–2° on the lasting stands and grows
(AUC 0.90 / 0.98 / 1.00 over +0.1, +0.2, +0.3 s), all at schedule speeds 3.25–4.20 (lasting 4.68–6.13). The effective
gains read off the ticks (`−tm/x̂`) at schedule speed ≤ 4.0 are 2.5 on the bank and 0.35 on its rate, against 1.0 and
0.18 at 5.5; `plantFloor=4.5` lowers them only to 1.9 and 0.25 (the 4.5 m/s design) and delays two of nine falls by
≥ 0.25 s. The question this leaves is whether a planing design holds these stands at all.

**One more causal arm, with an existing switch (no new code): `&plantFloor=6`** (the design read off the 6 m/s plant
row at every speed below it: bank gain about 0.8, rate 0.15). Prediction: if the falls are the bottom rows' gains on a
plant they do not describe, `plantFloor=6` rescues or delays (≥ 0.25 s) most of the switch-on organic sideways falls
and the catch collapses; if they are the landing's own disturbance beyond any design's reach, it does not, and the fall
is C. Same pairing and rule as §0.5. Run on organic (switch on and off) and the catch start (switch off).

## 1. The answer

**The sideways falls after a centred-stick stand are the balance's own loop going unstable at the bottom of its gain
schedule, set off by the roll the pop-up leaves in the board.** Not the phantom reference (A as 3.5o found it) and not
the face spiral (B).

1. **The trigger is the pop-up (C).** During the push the legs carry no load (`legBw` 0) and the board rolls freely,
   5–29° peak to peak over the 0.3 s before the stand. The stand inherits that roll and its rate.
2. **The balance is blind for the first 0.1 s** (its sense delay; the controller resets at the stand and sends 0 for
   six ticks), then starts correcting.
3. **Below a schedule speed of 4.5 m/s its corrections grow instead of decaying.** The raw ankle command (organic,
   switch on) reaches 12°, 19°, 45° over +0.1–0.2, +0.2–0.3, +0.3–0.4 s on the stands that fall, against 1.8°, 1.0°,
   0.8° on the stands that last (AUC 0.90, 0.98, 1.00). The first overflow of the ±14.3° ankle range (M4) comes at
   +0.13 to +0.28 s (s2w10 `cueC` 0.73), the hip takes the excess, and the board's own centre-of-mass acceleration
   carries the capture point out (the largest channel in 9 of 9 switch-on falls, 3.5o's picture). The sideways margin
   goes at +0.28 to +0.37 s (s2w10 `cueC` 0.83).
4. **Above 4.5 m/s the same balance damps the same landing.** On the test wave with the later cue (stands at schedule
   speed 4.77–5.37) the landings swing 2.4–11.2° and the command decays (run 5: 7.3° → 5.0° → 2.0°); 18 of 18 stands
   carry ≥ 3 s.
5. **Why the speed matters:** the effective gains the controller applies (read off its ticks as `−term/x̂`) at schedule
   speed ≤ 4.0 m/s are 2.5 on the body's bank and 0.35 on its rate, against 1.0 and 0.18 at 5.5 m/s. The design rows
   there (`PLANT_SPEEDS` `'4'`, `'4.5'`) describe a lab board at 46° and 26° of trim; these stands ride at −5° to +7°.
   **Causal test:** `plantFloor=6` (the 6 m/s design at every speed below it; an existing switch) turns the growing
   command into a decaying one on the same landings (organic s3w6: 12 → 21 → 43° becomes 8.2 → 7.1 → 2.7°) and rescues
   or delays (≥ 0.25 s) 6 of 9 switch-on organic falls, 12 of 12 catch collapses (9 rescued) and 12 of 19 switch-off
   organic falls that are not crest stalls, while breaking none of the 34 lasting controls. `plantFloor=4.5` (the
   4.5 m/s design) lowers the gains only to 1.9 and 0.25 and helps 2 of 9, 4 of 12, 9 of 19. `faceTrim` helps 0, 1, 2.

So the stands at 3.8–4.4 m/s fall and the faster ones last because the speed through the water decides which design
row the balance reads, and the rows below planing are not the board the rider stands on. **Within the balance's
authority:** the ankle and hip that lose the stand at 4.1 m/s hold it with a planing design. The fastest-growing cases
(the largest landings, raw > 14.3° at the first tick) stay beyond it.

The population held two surprises (§3): two of the six switch-on organic "sideways" falls are fore/aft (s2w6 and
s2w10 under `cue`: capture point past the nose), and the two pop-up separations are untouched by every arm.

## 2. Reproduction and inertness (the positive controls)

- **Frame rows:** the probe's base runs reproduce the committed rows of 3.5u (organic seeds 1–3 switch on: 4 002,
  3 250, 4 276 rows; switch off: 1 779, 2 790, 2 178; catch switch on runs 0, 3) and 3.5t (catch `cue` and `cueC`,
  runs 0–9) with **zero differences** in every field (the new `lat`, `bl`, `ctl`, `cps` and 3.5t's missing `cueT`
  excluded), keyed by script, wave and time. Every stand time, stand speed and fall time is therefore 3.5t's and 3.5u's.
- **Lateral wrappers inert:** catch run 3 with `LAT=off` against `LAT=on`: 124 of 124 rows identical.
- **The ledger's closure identity:** over every standing frame of every falling stand, worst |Σ sources − solve| on the
  body's lean is **0** at the 9 decimals logged (`closure`), the partition of `b` exact (`split` 0) and the moment
  budget exact (`mres` 0). The capture-point split's identity failed on 0 substeps (`bad` 0).
- **The reference is zero:** the controller's reference state `x_ref` is 0 on all 12 195 logged ticks of the base runs
  (max |x_ref| 0, lean asked 0), so 3.5o's phantom sideslip cannot act.
- **Pairing:** every arm reproduced the base arm's stand time and stand speed for every rider (the balance acts only
  after the stand), so every pair is a true pair.

Data: `results/35v/data/` (`o-s<seed>-<on|off>-<arm>.jsonl.gz`, `c-<script>-<on|off>-<arm>-<run>.jsonl.gz`; arms
`base`, `pf` = `plantFloor=4.5`, `ft` = `faceTrim=on`, `both`, `pf6` = `plantFloor=6`; arm files keep every summary and
a slimmed frame row). Tables: `results/35v/tables.md`, generated by `sideways-falls.py results/35v/data report`.

## 3. The population as measured

All speeds are horizontal |v_board − flow| at the board (m/s, world); the schedule speed is the `speed` the controller
was called with (the board's forward speed through the water along its heading); angles in degrees on the board's x
(+ its left rail); times after the first `standing` frame.

**Organic, `cueLater=on`, falls at the stand and at the first escape after the landing frame** (base arm, `cue`;
`cueC` has the same stands and escapes within 0.07 s; tables.md has both):

| stand | vW / sched | face | roll / bank | roll − face tilt | heading vs fall line | margins in order (s) | at the escape: vW, roll, bank, roll − face tilt | fell |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s1w8 | 3.76 / 3.25 | 0.89 | 8.5 / −0.4 | 6.3 | 11° | M2 0.00 (landing), M4 0.23, M1 0.38, M3 0.40 | 3.75, 5.7, −5.5, 4.2 (at 0.367) | 0.78 |
| s2w5 | 4.10 / 3.79 | 0.91 | 3.7 / −0.1 | 2.3 | 7° | M4 0.28, M2 0.32, M1 0.35, M3 0.38 | 4.40, 3.7, −6.7, 1.4 | 1.05 |
| s3w6 | 4.36 / 4.09 | 0.85 | −3.2 / 0.0 | −1.5 | 7° | M4 0.28, M2 0.37, M3 0.38, M1 0.43 | 5.24, −5.1, 0.7, −3.6 | 1.00 |
| s3w9 | 4.34 / 3.83 | 0.71 | −6.8 / 0.0 | −6.0 | 4° | M4 0.13, M1 0.33, M2 0.33, M3 0.40 | 3.88, 3.6, 2.1, 5.7 | 0.80 |
| s2w10 `cueC` | 4.32 / 4.20 | 0.70 | −0.2 / 0.0 | −0.3 | 1° | M4 0.73, M2 0.83, M1 0.87, M3 0.93 | 2.59, −0.4, 6.3, 0.9 | 1.02 |

- **Not sideways:** s2w6 `cue` (5.21 m/s, fell 1.78 s at the trough, face 0.15) and s2w10 `cue` (4.32, fell 0.72 s)
  separate **along**: capture point 0.21 and 0.41 m past the nose, nothing past across. On s2w10 the speed through the
  water falls from 4.44 to 1.24 m/s in 0.4 s while the speed over the ground stays 6.2–8.1 m/s (the water under the
  board accelerates to the board's speed); the capture point runs to the nose. Outside this question.
- **The pop-up separations** never reach the balance: catch run 3 (pop at 3.75 s at 3.67 m/s) rolls +17.6° → −19.5°
  during the push with the legs unloaded and separates (`balance`) 0.07 s into the landing; s3w2 pops from a submerged
  board (24 L under, buoyancy 0.26 W, dynamic pressure 0.07–0.35 W) high on the face (0.86–0.91), rolls to −14° in the
  push and loses the board 0.65 s after the pop. **No arm changes either time** (4.5667 s in all four arms): C, the
  pop-up.
- **None of the falls is across a face:** the heading is 0–12° from the fall line (straight down the face) and the
  face's tilt across the board is within ±3° at every stand. That is why `faceTrim` (built for the 11–13° tilt of a
  rider trimming across the face) has nothing to act on.
- **3.5t's kind b** (switch off; stands at 3.31–3.73 m/s, face 0.80–0.95, schedule 3.05–3.39): s1w7, s1w8, s1w11, s3w2,
  s2w5. Same sequence: M4 at 0.12–0.30 s, escape (after the landing frame) at 0.25–0.47 s. **The test-wave catch collapses** (switch off, runs
  2, 3, 4, 7, 8, 9, both scripts; stands 3.47–4.21 m/s, schedule 3.16–4.19): M4 at 0.17–0.30 s, escape at 0.30–0.48 s,
  all across. The crest stalls (kind a: s1w12, s2w8, s3w7, s3w10, 2.34–2.76 m/s) are 3.5t's lift-limited falls and
  are listed in the tables only.
- **Matched controls** (nearest lasting stand, same script, z-scored on stand speed, face fraction and heading):
  s1w8 ↔ s1w6 (4.90 m/s, distance 2.06), s2w5, s3w6, s3w9 ↔ s1w10 (4.47; 1.47, 1.09, 0.46), s2w10 `cueC` ↔ s3w12
  (4.45; 0.78); tables.md lists every population's. Every switch-on control is faster, by 0.11–1.14 m/s: no switch-on
  stand below 4.45 m/s lasted. The catch start gives
  the matched controls speed cannot: runs 0, 1, 5, 6 stood at 3.86–4.27 m/s on the same wave and lasted.

## 4. The first divergence

**Organic switch on** (9 sideways falls, 15 lasting; AUC = P(fall > lasting)):

| quantity | falls, median (range) | lasting | AUC |
| --- | --- | --- | --- |
| speed through the water at the stand | 4.32 (3.76–4.36) | 4.90 (4.45–6.23) | 0.00 |
| schedule speed at the first tick | 3.83 (3.25–4.20) | 5.32 (4.68–6.13) | 0.00 |
| deck pitch at the stand (+ nose up) | +1.5 (−4.7 to +6.9) | −10.1 (−17.2 to −8.6) | 1.00 |
| board's roll swing, 0.3 s before the stand | 14.6 (0.6–28.9) | 3.0 (1.7–11.7) | 0.89 |
| \|raw ankle command\| max, +0.1–0.2 s | 12.3 (0.7–24.5) | 1.8 (0.4–7.7) | 0.90 |
| the same, +0.2–0.3 s | 18.6 (2.7–24.8) | 1.0 (0.2–4.6) | 0.98 |
| the same, +0.3–0.4 s | 45.3 (3.4–49.7) | 0.8 (0.2–3.1) | 1.00 |
| body bank max, +0.2–0.3 s | 5.0 (0.6–6.1) | 0.9 (0.3–2.8) | 0.92 |

**Catch switch off** (12 collapses, 8 lasting, all on one wave at one speed band):

| quantity | falls | lasting | AUC |
| --- | --- | --- | --- |
| schedule speed at the first tick | 3.77 (3.16–4.19) | 4.03 (3.87–4.38) | 0.21 |
| board's roll swing, 0.3 s before the stand | **13.2 (5.5–15.2)** | **1.3 (0.3–3.3)** | **1.00** |
| roll at the stand | 3.3 (0.6–4.0) | 0.3 (0.1–0.7) | 0.96 |
| \|raw\| +0.1–0.2 / +0.2–0.3 / +0.3–0.4 s | 12.1 / 26.3 / 41.5 | 2.0 / 2.1 / 1.9 | 1.00 / 1.00 / 1.00 |

**The two together** (tables.md, "The landing against the schedule speed", every `cue` stand, 44): every stand at a
schedule speed ≥ 4.49 m/s that fell, fell along (s2w6 twice) or not at all, with landing swings up to 12.8°. Below
4.49, every stand that landed with a swing ≥ 4.3° fell sideways (two at 1.73 s, the rest at 0.55–1.32 s), and the four
that lasted landed still (swings 0.3–3.3°, catch runs 0, 1, 5, 6; s1w6 switch off, at 4.49 exactly, lasted with
6.2°). The command's terms: the bank-rate and the twist-
rate terms are the largest in the first 0.2 s in falls and in lasting stands alike; what differs is their size, not
which term leads.

**The first divergence:** the landing (the board's roll swing and its nose-up attitude) is already different at the
stand; the balance's command is the first thing that diverges *after* the stand, from its first tick, and it grows.

## 5. The ledger split to the escape

`bankLedger` per step, mirrored per frame (who leans the body, rad/s², + toward the board's +x), integrated from the
stand to the first escape after the landing frame and over the last 0.15 s, signed toward the fall side (the side the
demanded CoP leaves by), and 3.5o's capture-point split summed likewise. Full rows per fall in tables.md.

- **Closure:** worst |Σ − solve| 0 (9 decimals), split 0, moment residual 0, on every frame of every fall.
- **The capture point's escape is the board moving sideways under the body.** Over the last 0.15 s before the escape
  the board's centre-of-mass acceleration is the largest channel in 9 of 9 switch-on organic falls, 20 of 26 switch-off
  organic falls and 11 of 12 catch collapses, and carries the escape's sign in 9/9, 23/26, 12/12 (e.g. s3w6: board
  −0.68 m of a −0.58 m change; s1w8: −0.51 of −0.39). The rider's own mass channel is ≤ 0.03 m in every switch-on
  fall (at most 0.19 m in any window of any population).
- **Who leans the body** alternates within the oscillation, so the stand-to-escape sums are not one source's. The
  largest positive (toward the fall) source over the last 0.15 s is the hull's pressure (4 of 9 switch-on falls), the
  fins (2), the hip's swing (2) or the leg (1); in the switch-off falls the leg (14 of 26) and the swing (7). The ankle
  and the swing are the largest terms against the fall in most rows. The water's entries are the hull's response to a
  board that the feet are driving sideways and rolling; the drive is the command.
- **At the escape the command is not saturated toward recovery** in any switch-on fall (`raw · side > 0` over the last
  0.1 s in none of the 9; saturated throughout in 1): it is mid-swing in an oscillation it is driving.

## 6. Causal arms and the classification

Paired against the same stand without the switch, one run per process (§0.5's rule: rescue = carried ≥ 3 s, delay =
≥ +0.25 s; tables.md has every pair and its Δ):

| population | n | `plantFloor=4.5` rescue / delay / none / worse, median Δ | `faceTrim=on` | both | **`plantFloor=6`** (§0.7) |
| --- | --- | --- | --- | --- | --- |
| organic, switch on (sideways) | 9 | 0 / 2 / 7 / 0, +0.12 | 0 / 0 / 9 / 0, −0.02 | 0 / 2 / 7 / 0, +0.03 | **2 / 4 / 3 / 0, +0.50** |
| organic, switch off (not crest stalls) | 19 | 1 / 8 / 9 / 1, +0.13 | 0 / 2 / 14 / 3, +0.03 | 0 / 8 / 7 / 4, +0.12 | **4 / 8 / 6 / 1, +0.53** |
| catch, switch off (the collapses) | 12 | 0 / 4 / 8 / 0, +0.14 | 0 / 1 / 11 / 0, +0.01 | 0 / 2 / 10 / 0, +0.16 | **9 / 3 / 0 / 0, +2.08** |
| lasting controls (all populations) | 34 | 0 broken | 0 broken | 0 broken | **0 broken** |
| pop-up separations | 4 | unchanged | unchanged | unchanged | — |

**Per fall, by the pre-registered rule (`plantFloor=4.5`, `faceTrim`, both):**

| population | A | B | A+B | C |
| --- | --- | --- | --- | --- |
| organic, switch on (9) | 2 (s1w8 `cueC`, s2w10 `cueC`) | 0 | 0 | 7 |
| kind b, switch off (10) | 4 (s1w7 `cueC`, s1w8 ×2, s2w5 `cueC`) | 0 | 1 (s2w5 `cue`) | 5 (s1w7 `cue`, s1w11 ×2, s3w2 ×2) |
| catch collapses (12) | 3 (run 2 `cue`, run 8 ×2) | 0 | 1 (run 9 `cueC`) | 8 |

**Corroboration (§0.5):** every A-classed fall overflows the ankle (M4) before its escape with the schedule speed below
4.5, so A is corroborated where it is assigned. No fall meets B's corroboration: no board lies onto a downhill rail
across a face (face tilt within ±3°, heading 0–12° from the fall line); the one B and two A+B labels are `faceTrim`
effects without B's mechanism ("arm effect, mechanism unconfirmed").

**Read with `plantFloor=6`:** most of the pre-registered C falls are the same mechanism as A, which `plantFloor=4.5` was
too shallow to test: the 4.5 m/s design is still a sub-planing design (bank gain 1.9). Of the pre-registered C falls,
`plantFloor=6` rescues 2 and delays 2 of the 7 switch-on organic ones (s3w6 ×2 carried; s2w5 ×2 +1.10, +1.47 s) and
rescues 7 and delays 1 of the 8 catch ones; it moves none of kind b's five. The falls it does not move are the slowest
and roughest landings: s1w8 switch on `cue` (schedule 3.25, swing 28.9°, raw 17.6° at +0.1 s, past
the 14.3° limit at the first tick), s3w9 (3.83, 19.2°, raw 15.2° at +0.1 s), s1w11 and s3w2 switch off (3.23 and 3.07,
17.1° and 23.5°), s1w7 `cue` (3.05; every arm makes it worse). With `plantFloor=6` the command still decays on these
(s3w9: 15.2 → 12.4 → 7.3°) but the first correction already overflows.

## 7. Verdict: within the balance's authority?

- **Organic switch-on falls at 3.8–4.4 m/s and the test wave's catch collapses: within its authority, a defect of its
  own model.** The balance reads design rows built from a plant it is not standing on (the lab board at 46° and 26° of
  trim, not planing) whenever the forward speed through the water is under 4.5 m/s. Their gains turn the correction of
  an ordinary pop-up landing into a growing oscillation that the hip and the feet transmit to the 2.54 kg board. The
  same ankle and hip, with the 6 m/s row's design, damp the same landing (9 of 12 catch collapses carried ≥ 3 s, 2 of 9
  switch-on organic falls carried and 4 delayed 0.28–1.47 s), and no lasting stand is lost. No reference is involved
  (zero on every tick) and no face model is needed.
- **The roughest landings at schedule speeds ≈ 3.0–3.8 (s1w8 on, s3w9, s1w7, s1w11, s3w2 off): at the edge of
  authority.** The first correction after the 0.1 s blind start already exceeds the ankle's range under every design;
  the disturbance is the pop-up's. Whether a design for the true slow hull (rather than the 6 m/s one) holds them was
  not tested.
- **The pop-up separations (catch run 3 on, s3w2 on) and the crest stalls: outside the balance** (the balance never
  acts on the first; the second is 3.5t's lift limit).
- **The two fore/aft falls (s2w6, s2w10 `cue`):** not sideways; not diagnosed here.

## 8. Candidates for Vicente (not built)

1. **A low-speed row for the balance's own model, measured on the game's board.** Replace (or floor) the bottom of
   the design table with derivatives measured on the board as it actually rides at 3–4.5 m/s (nose up 0–7°, tail wet),
   as `PLANT_SPEEDS` was measured above it. *Evidence:* `plantFloor=6` (a planing design, wrong for these speeds in
   other ways) already turns the growing command into a decaying one and carries 9 of 12 catch collapses. *Cost not
   measured:* steering feel at low speed (the 3.5o turn), fore/aft (the heave-pitch block reads the same row).
2. **As a stopgap, a deeper `plantFloor`** (5 or 6) on the owner's address. Measured here only with the stick
   centred and Compress held; 0 of 34 lasting controls lost. 3.5o's sharp steer is the open cost: the 6 m/s design asks
   a different steady turn below 4.5.
3. **A quieter pop-up landing (C).** The board rolls 5–29° peak to peak while the legs push with no load; the stand
   inherits it. A landing whose push keeps some load on the feet, or a pop-up that hands over at a roll rate near zero,
   would shrink the disturbance the balance starts with. That is the pop-up sequence's design, and his call.
4. **The cue threshold (3.5u's fallback 3.8).** Every switch-on organic fall stood at a schedule speed of 3.25–4.20;
   a later cue moves stands out of the band, at the cost of cues lost on organic waves (3.5u §2.3).

## 9. What surprised me, and what is left

- **Surprised:** two of the six switch-on organic falls the brief listed are fore/aft, not sideways; `faceTrim` has no
  face to act on (every stand points down the fall line); the catch start's falling and lasting stands sit at the same
  speed, so speed alone could not have explained them; the landing's roll swing does (AUC 1.00). And on s1w8 (switch on) the
  controller's estimate of the yaw and twist rates reaches 110–320°/s within 0.2 s, against ≤ 60°/s on its control
  s1w10: one pair, but a hint that the slow rows mis-predict the twist channel as well.
- **Not done:** no new diagnostic arm (the ledger pointed at the design rows, which an existing switch tests); the
  board's true yaw rate was not logged beside the estimate; `plantFloor=5` was not run; the owner's steering was not
  tested with any arm; the catch switch-on arms were run on run 3 only (their cost to its 9 controls not measured); the
  fore/aft falls were not diagnosed; no design for the true slow hull was built (that is candidate 1).

## 10. Reproduce

    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/sideways-falls.ts -o <s>/raw.mjs --format esm --platform node
    printf "globalThis.location = { search: '' };\n" > <s>/sf.mjs && cat <s>/raw.mjs >> <s>/sf.mjs
    env MODE=organic SEED=<1-3> PERIODS=12 SCRIPTS=cue,cueC EXTRA='&cueLater=on[&plantFloor=4.5|6][&faceTrim=on]' OUT=<s>/o.jsonl node --max-old-space-size=3200 <s>/sf.mjs
    env MODE=catch RUN=<0-9> SCRIPT=<cue|cueC> EXTRA='[&cueLater=on][&plantFloor=...][&faceTrim=on]' OUT=<s>/c.jsonl node --max-old-space-size=3200 <s>/sf.mjs
    python3 docs/research/new-rider/3.5/sideways-falls.py docs/research/new-rider/3.5/results/35v/data report

Each organic seed takes about 10 minutes with four processes running; each catch run about 85 s.
