# 3.5s — Hold the line: a heading hold for the new rider's balance (design note)

Branch `claude/hold-line`, cut from `claude/face-trim` at `41748e53`. Written 2026-11-23 by the surfer-track builder
(Claude, Opus 5.5, high effort) **before** the switch was built. The results are §7, added after the measurement;
nothing above §7 was changed by it.

The owner (2026-11-23), asked *"With the stick centred, should his balance hold the line across the face?"*:
**"Hold the line."** His standing rulings bind: the turn is not limited, and nothing yaws, rolls or pushes the board but
the rider's own commands through his body and the water's own forces.

Signs. Model signs (`predictiveBalance.ts`) unless said: x forward, y right; on the test wave the face falls to the
board's right, so the face's tilt across the heading τ > 0, the slip β > 0 downhill, the yaw rate r > 0 turns the nose
down the face, the heading ψ > 0 is the nose turned down from the line, and the rail ψ_r = φ − τ > 0 is the downhill
rail down. Game signs where a frame row is quoted (`straight-fall.ts`: bank + toward the face, yaw + up the face,
rail + the uphill rail into the face).

## 1. What physically holds the heading across the face

3.5r §1 found that in the model no straight trim balances the yaw: the slip the line needs turns the nose downhill
through the lab's flat-water N_β (+510 N·m/rad at 6.5 m/s), and with the body plumb the model's full steady state on a
12° face is a **26°/s turn down the face** needing −181 N·m at the ankle. 3.5r §2 found the game's water yaw on the old
rider small and toward the face. Before building on either, the game's own yaw was measured, two ways.

### 1.1 The water's yaw moment on the face (the board's yaw ledger)

`straight-fall.ts LEDGER=1` on the test wave, 7 cells of `?faceTrim=on` (base and the six one-axis neighbours) and 3 of
the old rider (dh −5, 0, +5), 6 s each, plus 3.5p's shipped base cell. Per frame from 0.3 s at ≥ 4.5 m/s through the
water, the water's delivered yaw moment (every ledger source but the rider's residual and the gyroscopic term) beside
what the model expects from the same frame (`plantAt`'s flat-water derivatives at the frame's speed: N_φ at the rail
against the face, N_β β, N_r r, N_p p). `hold-line-yaw.ts`, `results/35s/game-yaw-ledger.jsonl`:

| arm (cells, frames) | mean τ | mean slip | water's yaw, game | the model's expectation | residual | residual per rad of τ |
|---|---|---|---|---|---|---|
| `on` (7, 1564) | 4.3–5.1° | 0.3–1.5° | −12.1 to −16.1 N·m | +1.8 to +6.8 | −15.6 to −22.8 | **−243 to −335** |
| shipped (1, 132) | 8.8° | 3.1° | −50.3 | +21.3 | −71.6 | −303 |
| old rider (3, 924) | 8.7–13.7° | 4.7–12.4° | −4.2 to −8.7 | +54 to +102 | −58 to −109 | −263 to −553 |

**The water's yaw on a face is toward the face (−), in every arm, where the model expects it down the face (+).**
In the `on` cells (board near flush, little slip) the residual grows with the tilt: binned by τ it is +5 to +28 N·m at
0°, −15 to −27 at 4°, −30 to −43 at 8° and −52 to −78 at 12°. Pooled least squares on the residual: `on` alone,
τ −291 N·m/rad (R² 0.76), and with the lab's N_β β as a second column it keeps −223 and takes 24 % of N_β back
(R² 0.78); the old rider alone, the residual is almost all slip: **−105 % of the lab's N_β β** and τ −16 (R² 0.94).
The two arms disagree on which term carries it (in each, tilt and slip co-vary differently), so the ledger says the
**direction** (the face turns a slipping board toward itself in the game, not away) and not a clean derivative. The
peer's caution about the ledger's surface-normal term (3.5p §4.2) applies; I did not resolve it.

### 1.2 The whole turn: the game turns the board at the coordinated rate of the body's bank

The ledger is one source; what the hold must answer is the **board's turn**, water and rider together. Per frame from
1.0 s (0.6 s for 3.5p), the board's yaw rate beside the coordinated turn of the body's bank, r_c = g tan(bank) / v
(v through the water), binned by τ (`hold-line-turn.py`, `results/35s/game-turn-vs-bank.jsonl`, game signs):

| arm (frames) | τ 0° | τ 4° | τ 8° | τ 12° | median residual |
|---|---|---|---|---|---|
| `on` grid, 27 cells (5008) | yaw −4.5 / coord. −3.4 (bank −2.1°) | −15.9 / −11.4 (−9.7°) | −19.3 / −16.9 (−13.6°) | −17.1 / −20.0 (−15.2°) | **−1.5°/s** |
| shipped grid (3267) | −43.6 / −84.1 | −39.8 / −50.1 | −39.6 / −33.8 | −22.1 / −22.5 | +11.2°/s (the spiral's end) |
| old rider grid (7953) | −1.2 / 0.0 | +0.7 / +1.2 | −1.2 / +3.3 | −1.6 / +3.4 | −4.6°/s |

**On the face, at every tilt, the new rider's board turns at the coordinated rate of his own bank within ±5°/s**
(`on`: residual −4.5 to +2.1°/s by bin). Neither model holds: the 3.5r column says a plumb body is carried down the
face at 20–26°/s, and the ledger's face yaw, put in the model's column, says it is carried **up** at 8–13°/s
(`hold-line-model.ts PART=trim`, `measured` rows). `on`'s 76° turn down the face is **its body's downhill lean**
(−10 to −15° at 4–12° of tilt, the placement's snap carried on) turning the board as any lean does.

### 1.3 So

**What holds the heading across a face is the body's lean, as on flat water**: plumb, the board holds its line within a
few degrees a second; leaning downhill, it turns down. The hold therefore needs no model of the face's yaw. It asks the
lean of the coordinated turn back to the line, and the face's small residual yaw is left to the heading feedback (a
steady residual of 2°/s leaves a steady error of 2° at the gain below).

**I do not use the model's own yaw row for the turn rate.** `steadyHold` (the model's steady state with the yaw rate
pinned, the bank free) is ill-conditioned at 5 m/s: it asks **133–273° of bank for 11.5°/s** (−14.5 to −24.7 at
4.5 m/s, −3.6 to −4.5 at 5.5), because the flat-water table's yaw-per-bank nearly vanishes there
(`results/35s/model-trim.jsonl`, `modelYaw…`). The coordinated turn is the relation the game measures (§1.2), and the
controller's own `steadyTurn` then carries the rest of the trade (roll, slip, rest, twist) exactly as it does for the
stick's lean. That is my replacement for the brief's (A): the reference's yaw row asks for the turn rate back to the
line, through the coordinated lean, not through the model's yaw derivatives.

## 2. Does the hold fit inside the existing authority?

The hold changes only the bank the reference asks. Its largest ask is ±0.20 rad/s (11.5°/s) of turn, i.e. the
coordinated lean atan(v · 0.20 / g): 5.2° at 4.5 m/s, 8.1° at 7, 13.7° at 12. On a 12° face, `on`'s neutral trim plus the
controller's `steadyTurn` at that lean (`hold-line-model.ts PART=trim`, `results/35s/model-trim.jsonl`; the three
stances, 4.5–12 m/s):

| | the ankle's commanded rest | the ankle's torque | the twist's torque |
|---|---|---|---|
| the neutral trim (`on`, no hold) | −3.2 to −7.7° | 0 | 0 |
| the hold at 11.5°/s up the face | −10.6° to +1.6° | −61 to +35 N·m | 0 |
| the hold at 11.5°/s down the face | −10.3° to +1.8° | −35 to +61 N·m | 0 |
| bound | **±14.3°** (clamp); the hip takes past ±11.46° (HIP_SHARE 0.8) | **~93 N·m** (m g d) | 100 N·m / grip |

Every steady ask is inside the ankle's clamp **and** inside the hip share (worst −10.6°, compress 12 m/s; the tuck at
12 m/s, −12.4°, is the one point past the hip share). The ankle torque stays ≤ 61 N·m against 93. No bound is widened.
**3.5r §7's −180 to −210 N·m does not arise**: it was the shipped cost's equilibrium against the model's own N_β
(which §1 finds the game does not have); the hold's reference is a coordinated turn, whose steady ankle torque is the
small residual above.

## 3. The design and the model gate

### 3.1 The hold (variant A, `?holdLine=ref`)

- **When**: standing and attached, the stick inside its dead band (|steer| ≤ 0.05), the hand not in use — the old rider's
  `holdLine` conditions, read from the same `holdLine` (it already runs for every rider).
- **The line**: the old rider's rule — the board's heading in the **world** frame (atan2 of its forward on the level),
  latched once the yaw rate has settled below `STANDING_HOLD_SETTLE` (0.15 rad/s) after a turn; cleared the moment the
  stick leaves the dead band or the hand is used. World, not face: the waves here peel along a fixed shore, so a line
  across the face is a world direction; the face's own fall line is undefined where the face flattens (the trough, the
  shoulder, τ → 0) and turns under the board as the wave shoals, so a face-relative line would steer him with every
  ripple; and it is the line the old rider holds.
- **What he senses**: the heading through the same 0.1 s line as every other sense, brought forward over the
  predictor's six frames by the mean of the estimate's and the prediction's yaw rate.
- **What he asks**: the turn rate back to the line, r_cmd = −ψ̂ / 1.0 s, clamped to ±0.20 rad/s; the bank of its
  coordinated turn, atan(v r_cmd / g), within the same lean cap the stick's ask has (`most`: none below planing);
  added to the bank asked (zero, with the stick centred) before the controller's own steady turn and `on`'s neutral
  trim. No integral (§3.3).
- **What is unchanged**: with the stick off centre or the hand in use the hold asks nothing, and the controller is
  `on`'s tick for tick (the added bank is exactly 0). The latch is the old rider's, on the board's own heading and yaw
  rate, which it already reads. The commands are the same two, through the same clamps. No force, no torque, no clamp
  in the game's physics. The lean ask, its cap and pace, the stick and the turn are untouched.

### 3.2 Variant B (the old rider's `holdLine` as the lean asked): not built

The old rider's hold — the TRUE heading now and its yaw rate smoothed over 0.25 s, full lean at 5°, at most
0.5 × HOLD_BANK, the lean asked eased over REFERENCE_TIME — fed into the lean asked, fails the gate below **at 4–11.5 m/s
tall, 4–10.5 crouched, 4–10 in Compress** (and the tuck at 4–5.5 and 7.5): a 0.5–1.1 Hz heading mode with damping
−0.46 to −0.00 (a frame off either way), and a real divergence at 5 m/s tall. **3.2e's ring stands in the model after the inertia fix.** Per the stop rule, B is reported
here and not built or ridden.

### 3.3 The model gate (`hold-line-model.ts PART=gate`, `results/35s/model-gate.txt`)

The loop is `closedLoop`'s (the true plant the model at the table point, the shipped filter, predictor and gains; the
owner's design: `riderBody: 'two'`, `faceTrim: 'on'`, the shipped ladder), with the heading as a state, its 0.1 s sense
line, and the hold's reference as rows over the whole state. The true delay is 5 and 7 frames against the predictor's 6.
`none` is the same augmented loop with no hold (the heading free: `on` as it ships).

| least damping, a frame off either way | 5–12 m/s, three stances | 5–12 m/s, tuck | 4–4.5 m/s, three stances |
|---|---|---|---|
| `none` (`on`) | +0.039 (5 m/s tall) | +0.034 | **−0.125** (4 m/s compress, 5.0 Hz) |
| **A, 1.0 s** (built) | **+0.053** (5 m/s tall) | +0.045 | −0.122 (4 m/s compress, 5.0 Hz) |
| A, 0.75 s | +0.057 | +0.048 | −0.121 |
| A, 0.5 s | −0.304 (5 m/s tall, 0.37 Hz) | +0.055 | −0.119 |
| A, 0.75 s with an integral (3 s) | −0.378 (5 m/s tall, 0.03 Hz) | −0.232 | −0.121 |
| B | −1 (5 m/s tall, a real divergence); −0.46 to −0.01 to 11.5 m/s | −0.094 | −0.457 |

- **A at 1.0 s passes the 3.2e mark (≥ +0.029) at 5–12 m/s in all three stances (worst +0.053)** and is at or above
  `none` at 65 of the 68 table points (4–12 m/s, four stances; the three below it are the tuck at 7.5–8.5 m/s, by
  0.003–0.009, at +0.187 or more). 1.0 s rather than 0.75: the same timing margin, and the hold's own mode is better
  damped nominally at 5 m/s (+0.279 to +0.335 against +0.114 for 0.75 s).
- ⚠️ **At 4–4.5 m/s the gate is failed by `on` itself** (the 5.0 Hz delay mode, −0.125; 3.2e's gate was 5–12 m/s and
  never measured these rows). The hold moves it by +0.003 to +0.010. I proceed on that reading and flag it: the hold
  neither causes nor worsens it, but the brief's 4–12 m/s mark is not met by any arm, the starting one included.
- **An integral fails at 5 m/s**, where the table's yaw-per-bank nearly vanishes (§1.3): the integral winds up against a
  plant that barely turns. So the hold is proportional only, and a steady residual yaw leaves a steady error of
  1.0 s × the residual (2° for 2°/s).
- **The face's tilt changes as the heading turns** (τ falls as the nose turns down; on the test wave about −0.15 rad
  of tilt per rad of heading). With that coupling in the true plant (`model-gate-couple015.jsonl`), `none` diverges
  slowly (a real root, radius 1.00006–1.016 per frame) at 4.5–5 m/s in every stance and at 7.5–12 m/s standing
  (8–12 crouched, 10–11 in Compress): the model's own weathervane, built on the N_β §1 finds the game does not have.
  A removes it at 5.5–12 m/s (passing +0.029 there) and not at 5 m/s (radius 1.017–1.022) or 4.5 m/s in Compress and
  the tuck. Reported as a sensitivity; the
  gate is the uncoupled loop, as 3.2e's was.

## 4. What I predict the game will do (stated before the ride)

- **Inert off**: byte for byte; the shipped arm reproduces 3.5p's 27 cells and 3.5q's 21 riders on the same frame.
- **The test wave's grid, no input**: the line latches at the placement (yaw under 8.6°/s from the first frame). The
  placement's snap still throws the body downhill by 0.5 s (`on`: −19.7°), and the hold's ask saturates against it, so
  the heading still runs 15–30° down the face in the first 1.5 s; then the hold brings it back toward the line and holds
  it within 5–10° (no ring: the model's heading mode is damped at every speed). The rail moves uphill (into the face)
  compared with `on`'s −2.5°, and the body sits about plumb from 2 s. Fewer off-the-plane stalls, because he stays on
  the face instead of running down to the trough: **later than `on` in most cells**, with more of them censored at 6 s.
  The falls that remain, I expect to the uphill side more often than `on`'s 14 of 25.
- **The turn**: unchanged while the stick is held. If the line latched before the turn, the turn starts from a slightly
  different state; I predict the survivor's peak bank within 1° of 43.49°, at the same instant ±1 frame.
- **Organic post-turn rides (n 9)**: the hold latches once the yaw rate settles (the climb), and asks lean back toward
  the line he came out on. At 4–4.6 m/s the coordinated lean for 11.5°/s is 5°, small; I do not expect it to undo
  3.5r's cost on the climbs (−0.733 s against shipped), whose cause is not the heading. Uncertain; ±0.3 s against `on`.
- **Sharp-steer collapses with `plantFloor=4.5`**: the hold is inactive while the stick is held, so they compose as
  `on` did (3.5r: 3.633 s).
- **The neutral and slow take-off buckets**: the hold engages on every neutral ride; small changes either way.

## 5. The switch

`?holdLine=ref` (`DesignWeights.holdLine`, `AttachedRiderOptions.holdLine`, `SurfZoneConfig.holdLine`,
`RideSessionOptions.holdLine`, `holdLineSwitch`): off by default, pinned off in online rooms, printed back from the
running host (`predictor.weights.holdLine`) by `straight-fall.ts` and `sharp-steer.ts`. Meant on top of
`?faceTrim=on` (the hold adds its bank before `on`'s trim); it does not need it.

## 6. Reproduce (model side)

    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/hold-line-yaw.ts -o <s>/hly.mjs --format esm --platform node
    node <s>/hly.mjs on_0_0_0=results/35s/ledgers/on_0_0_0.jsonl.gz ...; env POOL=1 node <s>/hly.mjs ...     # §1.1
    python3 docs/research/new-rider/3.5/hold-line-turn.py results/35r/grid-on-frames-thin.jsonl.gz 1.0      # §1.2
    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/hold-line-model.ts -o <s>/hlm.mjs --format esm --platform node
    env PART=trim node <s>/hlm.mjs                     # §2 (DEPTHS, SPEEDS, RATE_MAX)
    env PART=gate COUPLE=0 node <s>/hlm.mjs            # §3.3 (HOLD_TIME, INTEGRAL_TIME, VARIANTS, COUPLE=-0.15)
    python3 docs/research/new-rider/3.5/hold-line-gate.py results/35s/model-gate-*.jsonl

The ledger cells: `env SECONDS=6 LEDGER=1 DH=.. DX=.. DV=.. EXTRA='&faceTrim=on' OUT=.. node <s>/sf.mjs` (and `RIDER=old`),
thinned to the columns read, in `results/35s/ledgers/`.

## 7. Results (measured once, 2026-11-23)

**The build.** `1a70bf32`. Every arm was printed back from the live `AttachedRider.predictor.weights` of a host built
on the game's own config path (`straight-fall.ts`, `sharp-steer.ts` `built` rows): `faceTrim` `'on'`, `holdLine`
`'ref'`, `plantFloor` 4.5 or none, `riderBody` `'two'`, exactly as asked, in every cell and every rider. Fall times
are seconds after the placement (grid) or the stand (organic). A bot ride is not evidence of feel.

**A note on the grid's run mode, found on the way.** For speed I ran the grid one cell per process (27 processes per
arm). 3.5p and 3.5r ran it with `GRID=1`, all 27 cells in one process. **The two modes do not give the same fall times
for the same build**: the starting commit `41748e53`, rebuilt and run one cell per process, gives 3.583 / 2.433 / 5.683 s
on three cells where its own `GRID=1` run gave 3.550 / 2.383 / 5.233 (`results/35s/grid-arms.txt`, `p35` and `r35on`
columns against `ship` and `on`): something carries from one cell to the next inside one process. So the grid's
**pairings below are all within one mode (one cell per process, this build)**, and the inertness check against 3.5p is
run in 3.5p's own mode (§7.1). What carries over between cells was not chased.

### 7.1 Inert when off

- **The test wave, 3.5p's mode** (`GRID=1`, this build, switch off): **27 of 27** cells on 3.5p's frame; and this build's `on` in the same mode reproduces 3.5r's `on` grid in **27 of 27** (`results/35s/grid-{ship,on}-GRID1-summaries.jsonl.gz`). The same build, one cell per process,
  matches the starting commit run the same way on every cell tried (3 of 3).
- **Organic** (3.5o's drive, steer only): this build's shipped seed 2 reproduces 3.5q's arm A in **21 of 21** riders on
  the same frame, and this build's `on` reproduces 3.5r's E in **60 of 60** riders (seeds 1-3).
- **The Canyon byte check** (`scripts/m1-cpu-bench.ts`, Canyon B medium, 3 600 steps, fresh spin-up,
  `globalThis.location = { search: '?canyonWaves=true' }` prepended as an object; grid 400 × 451 = 180 400): this
  branch and `41748e53` both give **snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`**, 3.5c's published
  reference pair, and the spun-up seas hash the same (`d6ba1d99…48f88aa`). ⚠️ I did not find a test that prints the
  brief's `75ffaf2b…164525` (it appears only in the consult log's test-wave entry); this is the protocol the folder's
  byte checks use (`results/35c-canyon-byte-check.txt`). `results/35s/canyon-byte-check.txt`.
- `npx tsc -b` exits 0; `predictiveBalance.test.ts` 28 of 28 (two new: the inert controller, the hold's sign, delay,
  bound and cap); `PhysicalMode.test.ts` the switch tests 3 of 3 (one new: `?holdLine=ref` and its online pin).

### 7.2 The test wave's 27-cell plumb ride grid, no input (one cell per process, this build)

| arm | fell | median (range), s | paired | side of the separation | speed through the water 0.25 s before the end (fell rides) | body within 3° of plumb | 0.5 s to the end: rail / bank (medians) |
|---|---|---|---|---|---|---|---|
| shipped | 27 | 2.533 (2.050–3.583) | — | downhill 27 | 9.24 m/s (5.73–9.85), 0 under 3 | 9.3 % | −12.1° / −23.0° |
| on | 25 | 5.300 (4.183 to ≥ 6.000) | vs shipped later 27 / 0, +2.900 | uphill 13, downhill 12 | 1.94 (−0.19 to 2.95), 25 of 25 under 3 | 41.4 % | −2.6° / −4.0° |
| **hold** | **27** | **4.750 (3.733–5.383)** | **vs on sooner 27 / 27, −0.617 (−1.033 to −0.167); vs shipped later 27 / 0, +2.300 (+0.250 to +2.967)** | **uphill 27** | **4.37 (2.98–5.32), 1 under 3** | 27.5 % | **+3.5° / +1.5°** |

Rail + is the uphill rail into the face, bank + toward the face (3.5p's signs). The share of frames from 0.5 s with an
uphill rail **and** the body within 3° of plumb: shipped 0 %, on 8.4 % (0–32.4), **hold 21.6 % (10.2–36.0)**.

**The heading against the latched line** (`hold-line-grid.py`, `results/35s/grid-line.txt`; the line latches on the
first frame in every cell of every arm, the old rider's rule; game sign, + up the face):

| arm | mean \|heading − line\| | worst | at the last attached frame | within 5° / 10° of the line | yaw oscillation about its 1 s mean, RMS early (0.5–2 s) → late (2 s–end), late/early |
|---|---|---|---|---|---|
| shipped | 21.6° (11.0–42.4) | −96.1° (−128.1 to −31.1) | −96.1° | 23 % / 44 % (it falls early) | 30.2 → 7.8°/s, 0.27; grows in 0 of 23 |
| on | 36.5° (25.5–43.9) | −77.5° (−147.1 to −37.9) | −77.5° (−145.2 to −15.1) | 9 % / 15 % | 27.9 → 14.4°/s, 0.49; grows in 1 of 27 |
| **hold** | **20.3° (13.8–26.2)** | **−31.6° (−41.4 to +46.7)** | **+2.7° (−35.7 to +46.7)** | 12 % / 18 % | 27.1 → 19.2°/s, **0.72 (0.43–1.42); grows in 4 of 27** |

**What the hold does, and how its rides end** (`hold-line-ends.py`, `results/35s/grid-hold-ends.txt`):

- **It halves the weathervane, and does not hold the line.** The heading runs down the face to −31.6° (median worst)
  against `on`'s −77.5°, the body sits within −0.2 to +3.9° of plumb from 0.5 s (bank +1.5° median, against `on`'s
  −4.0°), and the board rides on its uphill rail (+3.5°, against −2.6°): the trim 3.5r asked for and never got. But only
  12 % of the ride is within 5° of the line.
- **The body does not take the lean the hold asks.** Over 1–3 s the hold asks +8.9° (+7.9 to +9.7) toward the face —
  its rate bound, held there — and the body's bank is −2.6° (−6.6 to +2.3): **11.7° short**. The controller's own
  trade delivers a small part of the ask; the rest is the steady error the proportional hold then carries (median
  |error| 20°).
- **Every ride ends in a turn back up the face.** In 26 of 27 cells the last 0.27 s (0.02–0.87) is an unbroken turn up
  the face: yaw rate up to +85°/s (+41 to +119), the uphill rail at +69° (+52 to +100), at 4.82 m/s (3.83–5.56) through
  the water, heading still −17° from the line, the hold asking +5.1° — and he separates **uphill, toward the face, in
  27 of 27**. So the hold trades `on`'s off-the-plane stalls (25 of 25 under 3 m/s) for a carve back up at 4–5.5 m/s,
  the speed band where the model gate already fails for `on` itself (§3.3). It ends the rides **0.62 s sooner than
  `on` in every cell**.
- **The ring**: none in the sense of 3.2e (no growing heading oscillation; the late/early ratio stays under 1 in 23 of
  27 cells), but the late oscillation is larger than `on`'s (19.2 against 14.4°/s RMS), and the end is a single
  divergent turn, not a ring.

### 7.3 Organic rides on the owner's address (3.5o's drive, steer only, seeds 1–3, 60 riders)

A is 3.5q's shipped arm, B 3.5o's floor population, E `on` (this build, = 3.5r's E on all 60), F `on` + floor (3.5r),
I hold, J hold + floor. Paired median (range); later / sooner / same. `results/35s/organic-arms.txt`.

| bucket (n) | A shipped | E on | I hold | J hold + floor | F on + floor |
|---|---|---|---|---|---|
| **outside the turn window, the post-turn rides across the face (9)** | 2.517 (1.733–3.700) | 1.967; vs A 0 / 8 / 1, −0.733 | **1.983; vs A 0 / 7 / 2, −0.717; vs E 3 / 3 / 3, +0.000 (−0.183 to +0.150)** | 1.983; vs B 3 / 6 / 0, −0.383; vs F 3 / 3 / 3, +0.000 | 1.967; vs B 2 / 7 / 0, −0.317 |
| sharp-steer collapse (5) | 0.700 (0.467–0.983) | 0.700 | 0.700; vs E 1 / 3 / 1, −0.017 | see §7.5 | see §7.5 |
| turn window, neutral falls too (23) | 0.750 (0.500–1.283) | 0.683 | 0.683; vs E 1 / 3 / 19, +0.000 | 0.933; vs F 1 / 2 / 20, +0.000 | 0.933 |
| censored on shipped (3) | 0 of 3 fell | 1 of 3 | 1 of 3; vs E 1 / 0 / 2 | 1 of 3 | 1 of 3 |
| neutral (20) | 16 of 20 fell, 1.108 | 1.033 | 1.017; vs E 4 / 3 / 13, +0.000 | 1.300; vs F 4 / 1 / 15, +0.000 | 1.300 |

| rider | A | E on | I hold | J hold + floor |
|---|---|---|---|---|
| seed 2 wave 2 left (post-turn) | 3.700 | 2.750 | **2.700** | 2.750 |
| seed 2 wave 2 right (post-turn) | 3.133 | 2.917 | **2.733** | 2.667 |
| seed 2 wave 1 neutral | 3.900 | 3.850 | 3.917 | 3.833 |

**On the owner's address the hold changes almost nothing**: the post-turn bucket is +0.000 against `on` (3 later,
3 sooner, 3 the same, within ±0.18 s), and it keeps 3.5r's cost against shipped (7 of 9 sooner, −0.717 s). The
neutral and turn-window buckets move on 4–7 riders of 20–23, by a median of nothing.

### 7.4 The turn is not limited: the wave-2 survivor (seed 2 wave 2 left, steer alone)

| arm | turn peak bank | at 0.50 m of climb | at 0.90 m of climb | fall |
|---|---|---|---|---|
| shipped (this build) | 42.83° at +1.367 s | +2.067 s, 4.24 m/s, course 48.6° | +2.783 s, 3.31 m/s, 46.4° | +3.683 s |
| on | **43.49° at +1.367 s** | +2.017 s, 4.09 m/s, 52.0° | not reached (0.89 m at most) | +2.733 s |
| **hold** | **43.58° at +1.367 s** | +2.033 s, 4.07 m/s, 49.2° | not reached (0.86 m) | **+2.683 s** |
| hold + floor | 43.58° at +1.367 s | +2.017 s, 4.05 m/s, 49.4° | not reached (0.90 m, short of it) | +2.733 s |

The peak bank is `on`'s within 0.09°, at the same instant: the stick's turn is untouched (the difference is the state
the pre-turn hold left at the turn's start; the hold was active from the stand to the steer). After the turn the line
latches at +1.683 s on a 71.7° heading (course 52.3°); the heading then runs 19.3° off it by +1.933 s and the hold asks
−4.8° to +2.6° (model sign) through the climb; he falls 0.05 s sooner than `on`.

### 7.5 With `&plantFloor=4.5`: the sharp-steer collapses (n 5)

| arm | fell | median (range) | vs A | vs B (the floor alone) | vs F (on + floor) |
|---|---|---|---|---|---|
| B floor | 5 | 3.717 (1.500–3.983) | later 5 / 5, +3.000 | — | — |
| F on + floor | 5 | 3.633 (1.667–4.000) | later 5 / 5, +2.933 | 3 / 2 / 0, +0.017 | — |
| **J hold + floor** | 5 | **3.550 (1.700–3.950)** | **later 5 / 5, +2.833** | later 1 / sooner 4, −0.067 (−0.300 to +0.200) | 2 / 2 / 1, +0.000 (−0.333 to +0.083) |

**They compose**: the floor's rescue of the sharp steer stands with the hold (2.1L 3.950, 2.1R 3.550 s). The hold is
inactive while the stick is held, so the collapse itself is untouched; the small differences come after the turn,
once the line latches.

### 7.6 Verdict

**He does not hold the line, and the hold should not go on Vicente's address as built.** The game's own measurement
settled the axis — on the face the board turns at the coordinated rate of the body's lean (§1.2), so holding the line
is holding the lean, and the model's N_β weathervane is not the game's — and the hold, built on it inside the
controller's reference, passes the model gate where `on` passes it. On the test wave it halves the turn down the face
(worst −32° against −78°), keeps the body near plumb and the uphill rail in, and does not ring. But the body takes only
a small part of the lean it asks (11.7° short over 1–3 s), so the line is held to within 5° for 12 % of the ride, and
every ride ends in a turn back up the face at 4–5.5 m/s: **sooner than `on` in 27 of 27 cells (−0.62 s)**, and on the
owner's address it changes nothing against `on` (post-turn +0.000, survivor −0.05 s). Its cost is not authority —
nothing past a bound was asked — but the low-speed end, where the gate already fails for `on` itself. No force, torque
or clamp in the game was changed.

### 7.7 What remains uncertain, and what I would try next (not built)

- **Why the body does not take the ask.** The hold's lean goes through the same reference the stick's does, yet the
  bank stays 11.7° short on the face. Candidates, not separated: the model's face column (3.5r) expects the face to
  turn him down hard (the N_β §1 finds the game lacks), so the controller's own yaw cost resists the turn the hold
  asks; and the filter's bias states absorb part of the ask. A test: the hold with the face column's yaw row removed.
- **The turn back up at 4–5.5 m/s.** The hold's ask is a lean at the coordinated rate for 11.5°/s whatever the
  speed; below ~5.5 m/s the gate already fails, and the rides end there. A speed fade (no ask below the gate's
  5 m/s) is the obvious next arm; it was not designed before the ride, so it is not built here.
- **B (`holdLine` as the lean asked)** fails the model gate and was not ridden; the ring is the model's word only.
- **The grid's run mode**: cells run in one process do not give the same fall times as cells run alone, on the
  starting commit too. Every pairing here is within one mode; what carries over was not found.
- Seeds 1–3 only; the buckets are small; the grid is one wave; feel is not measured.

## 8. Reproduce (the rides)

`straight-fall.ts` one cell per process, `env SECONDS=6 FRAMES=1 DH=.. DX=.. DV=.. EXTRA='&faceTrim=on&holdLine=ref' OUT=..`
(and `GRID=1 FRAMES=0` for the inert check, 3.5p's mode); `sharp-steer.ts` as face-trim.md §9 with
`&faceTrim=on&holdLine=ref[&plantFloor=4.5]`; then `face-trim-grid.py`, `face-trim-ends.py`, `hold-line-grid.py`,
`hold-line-ends.py` on the grid files and `hold-line-organic.py <dir>` on the organic ones. `results/35s/`:
`grid-*-percell-frames-thin.jsonl.gz`, `organic-o-*-summaries.jsonl.gz` (summaries, `built` rows and the survivor's
rows), `canyon-byte-check.txt`, and every table above as `.txt`.
