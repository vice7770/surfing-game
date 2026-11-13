# Step 3.1: the body leans with the face, and the knees (`?rider=new`)

Written 2026-11-13 by the build agent (Opus 5.5, effort xhigh), on branch `claude/rider-new-31` from main 256a1e44. The
contract: `../design.md` §1 and §7, `../ruling-29.md`, the spec `docs/superpowers/specs/2026-11-12-surfer-physics-redesign.md`.

Tags: [M] measured by a probe here; [R] read in the code; [I] my inference.

All numbers come from probes on analytic water: flat water, planar faces, a face that tilts in, a rising surface. No
ride session, no catch report, no autopilot ride, no game page.

This page has two parts: **3.1b** (the second round, ruling 29a, sections 10–14) first, then **3.1** (the first build,
sections 1–9), kept as it was handed back.

# Part 2: step 3.1b (ruling 29a)

## 10. Short answer (3.1b)

- **Built, behind `?rider=new`:** an active pitch ankle (feedback on the body's own lean and lean rate, delayed 0.10 s,
  motor lag 0.05 s) on top of the passive ankle, which now acts at once on the ankle's own angle; the ankle stiffening
  with the leg's load (up to 2×); a new start square to the deck across as well. The gains were chosen on a linear model
  first (`pitchModel.ts`), with the board's numbers measured (`hull.probe.ts`).
- **Two things the model forced, beyond the ruling's list** (for the advisor):
  1. **The reference's slow trim now reads the body's own push through the feet**, not the board's specific force. With
     the board's felt force (3.1's), no gain pair holds the loop unless that part is slowed past about 3 s: the body's
     own push on the 2.5 kg board tilts the board's felt vertical, and the reference follows (the don't-retry loop, in
     pitch). Slowed to 3 s, the rider cannot lean back on a braking board and falls over the nose on the flat (traced).
     The body's push (the line from the centre of pressure to the centre of mass, the soles' sense) is smooth and holds
     the loop at 0.5 s. The feedback still reads only the lean and its rate.
  2. **Step 2 (stiffening) is needed:** without it the model is unstable at 1.8 g, and the held carves toppled.
- **The 45° start is fixed and explained (step 4):** 3.1's start was square to the deck in pitch but plumb across. On a
  face crossed at 45° that is neither balanced nor the old rider's plumb start; the feet's load fell to 0.5 body weights
  and the bank ran uphill. Square to the deck in both (the felt vertical of a board sliding down its face), all 18 starts
  on the 0°, 20° and 45° lines hold 1.5 s at 25–50° (old: the 45° line 3 of 6). The ruling's guess (the free body
  sliding along the board) was tested and is not the cause: a near-rigid pitch falls the same way.
- **The bars still miss** (section 12): N3 at 2 m/s falls; the 12 m/s placed glide falls; the standing held carve lasts
  2.13 s (bar 2.28); the roll's 2.5–4.5 Hz share is 0.2–0.7 (bar: the old's + 0.1); N2's trim over its last 0.5 s is
  9.1° (bar 5–8°). So, by the stop rule, I hand back. No merge checks were run.
- **Why, in one line:** with a 0.15 s sensing-to-muscle delay on a 2.5 kg board, only small active gains stay damped
  (the model: ζ 0.27 at lean gain 0.25; above about 2× the gains it rings). That loop is too weak to lean the body back
  in time when the board brakes hard (a placed 12 m/s glide settling at 0.45 g, the drag after a rising surface), so the
  body tips over the nose. The hip (the ruling's step 3) is the next lever; I did not build it in this round.

## 11. What changed in 3.1b

- `src/physics/standingBody.ts`: the active loop (`prepare`, a time-stamped delay line `push`/`at`, the motor lag), the
  stiffening, the constants and their sources (`PITCH_DELAY`, `PITCH_MOTOR_LAG`, `PITCH_LEAN_GAIN` 0.25,
  `PITCH_RATE_GAIN` 0.1 s, `PITCH_REFERENCE_TIME` 0.5 s, `PITCH_ACTIVATION_TIME` 0.2 s, `PITCH_ACTIVATION_MAX` 2).
- The rest is now the delayed, lagged command: (the reference − the deck's pitch − the trim's stretch) + 0.25 (reference
  − lean) − 0.1 s × lean rate. The passive torque k (ankle angle − rest) + c × rate acts at once. In 3.1 the rest
  followed the deck's pitch at once, so the spring was really tied to the reference.
- `src/physics/AttachedRider.ts`: `bodyPush`, the body's own push through the feet low-passed 0.1 s (`finish`, after the
  contact impulse), fed to the reference; the mount square to the deck across on a planing board (`mount`, `frame`).
- `pitchModel.ts` and `pitchModel.probe.ts` (the model and the gains), `hull.probe.ts` (the board's numbers).

## 12. The bars, 3.1b (old / 3.1 / 3.1b)

Results: `results/bars-old.jsonl`, `results/bars-new.jsonl` (3.1), `results/bars-new-31b.jsonl` (3.1b).

| Bar | Old | 3.1 | 3.1b | Pass? |
|---|---|---|---|---|
| N0, `rider=old` byte-identical | — | yes | yes (20 of 20 files) | yes |
| N1, legs per frame < ~2 kW (60 rows) | to 30.9 kW | 58 of 60 | 60 of 60 (at most 0.46 kW) | yes |
| N1, ≤ 1.46 kW over 0.5 s | to 1.57 kW | 0.10 kW | 0.08 kW | yes |
| N2, 20° from 4 m/s: gain ≥ 3.5 m/s | +1.73 | +3.85 | +3.63 | yes |
| N2, trim 5–8° to the face | 15.6° (last 0.5 s) | 8.5° / 7.6° end | 9.1° (last 0.5 s) / 7.5° end | no, by 1.1° |
| N3, 20 cm at 2 m/s: no fall (a bar) | holds | falls 0.48 s | falls 0.40 s | no |
| N3, 20 cm at 4 m/s (report) | falls 0.27 s, 4.0 BW | falls 0.35 s | falls 0.35 s, 2.93 BW, knees 2.6 cm | — |
| N3, 20 cm at 1 m/s (not a bar) | holds | holds | falls 0.40 s | — |
| N4, placed 25–50° down and up: no fall in 0.5 s | 2 of 12 | 12 of 12 | 12 of 12 | yes |
| N4, the board under 5 g (placed) | to 16.8 g | to 2.2 g | to 5.9 g (one row, up 25°) | no, one row |
| N4, placed up: hold or slide to 1.5 s | — | all slide back | fall at 0.8–1.4 s after stopping | (see below) |
| N4, tilted 40° down (report the cause) | falls 1.42 s | falls 1.68 s | falls 1.23 s (section 14) | — |
| The 45° line placed, 25–50° (step 4) | holds 25–35° | falls ~0.5 s | holds all 6 | yes |
| N5, glides within ±2 cm draft | 20.8 / 10.8 / 5.7 / 1.7 | 20.9 / 11.6 / 6.8 / 2.1 | 19.4 / 9.0 / 4.9 / falls at 12 m/s | no (12 m/s) |
| N5, drag at 7 m/s falls | 0.216 g | 0.190 | 0.144 | yes |
| N5, held carve standing ≥ 2.28 s (old without the carry) | 2.28 | 1.62 | 2.13 | no, by 0.15 s |
| N5, held carve Compress ≥ 2.30 s | 3.0 (2.30 without the carry) | 1.73 | 3.0 | yes |
| 15° 4 s full carve (report) | 2.18 / 1.90 / 2.27 s | 1.53 / 1.20 / 1.27 | 1.83 / 1.80 / 2.22 | — |
| Mode B, damping after a kick > 0 | −0.015 / +0.05 / +0.06 | +0.03 / +0.16 / +0.21 | +0.02 / +0.09 / +0.14 | yes |
| Mode B, roll 2.5–4.5 Hz share ≤ old + 0.1 (kick) | 0.06 / 0.01 / 0.00 | 0.30 / 0.44 / 0.24 | 0.18 / 0.46 / 0.40 | no |
| Mode B, the same riding straight (6 / 8 m/s) | 0.12 / 0.03 | 0.18 / 0.04 | 0.68 / 0.14 | no |
| Mode A, 12–17 Hz share | ≤ 0.08 | ≤ 0.05 | ≤ 0.02 | yes |

The placed starts going up: the board climbs, stops at 0.3–0.8 s and the rider falls as it slides back (3.1: it slid
back on its feet). Inside the bar's 0.5 s every one holds.

Two gain points were also run on the bars (not kept): lean gain 0.5 holds the 1 m/s rise but drops the 5 m/s glide and
raises the 6 m/s roll share to 0.83; lean gain 0 drops N2 (falls at 1.1 s) and the full carve at 9 m/s (0.42 s). Step 1 alone (no
stiffening, gains 0.75 / 0.1 s, the board's felt force at 3 s) held the glides to 9 m/s but rang riding straight
(roll share 0.81–0.91) and fell at 12 m/s.

## 13. The model: the gains and their margins

`pitchModel.ts`: along the board, linearised about a glide with felt gravity n g. The states:
- the body's lean on the feet;
- the board's speed, with its water drag;
- the board's pitch on the hull;
- the reference's two low-passes;
- the motor lag;
- the 0.10 s delay (a Padé approximant; `simulate` checks it with the delay exact).

The board's numbers measured (`hull.probe.ts`, towed at a steady speed, W/S −1 / 0 / +1):

| Speed | Hull pitch stiffness about the load | Drag's slope (2 D / v) | Loads reachable |
|---|---|---|---|
| 5 m/s | 1200 N·m/rad | 77 N·s/m | 1.0–1.2 g |
| 7 m/s | 1900 | 40 | 1.0–1.5 g |
| 9 m/s | 2800 | 31 | 1.0–1.8 g |

The hull's pitch damping and the board's pitch inertia (with the water's added mass) are not well measured: a pitch kick
at 7 m/s gives about 23 N·m·s/rad and 3.5 kg·m², muddied by the old rider's coupling. They are swept (30–300, 0.43–6).

Results (`results/pitch-model.jsonl`):
- **The felt source.** With the board's specific force in the reference, the best gains' least damping is −0.33 at 0.1 s
  (3.1's), −0.13 at 0.5 s, −0.04 at 1 s, +0.07 at 3 s (no stiffening). With the body's push: +0.20 at 0.5 s.
- **The chosen gains** (lean 0.25, rate 0.1 s, the body's push at 0.5 s, stiffening to 2×), at each speed's measured
  plant: damping ratio 0.27–0.29 at every load from 1.0 to 1.8 g (the least damped mode about 11 Hz); with the delay
  exact, the lean decays at every load (log-decrement 0.24–0.64).
- **Margins:** the gains may be scaled by 0.34 to 1.8 and the delay grown to 0.195 s before a mode is undamped.
- **Corners:** over the hull's damping 30–300, the board's inertia 0.43–6 and the drag × 0.5–2, the least damping is
  −0.025, at the hull's damping of 30 (+0.044 at 100, +0.097 at 300). So the margin rests on the hull's pitch damping,
  which is not well measured.
- **Without stiffening:** 1.8 g is unstable (the felt gravity outgrows the passive ankle; the board slides from under
  the body faster than a 0.15 s loop can answer).

## 14. 3.1b's N0, the tilted 40° drop, step time, and what was not run

- **N0:** with `rider=old`, the six study probes, A-lite's 12 result files, and B-wall's bars and trace print the same
  bytes (20 of 20). B-wall's `realwall` was not run.
- **The tilted 40° drop (`results/trace31b-tilt40.jsonl`): the probe's face falls away from under the board.** The face
  turns about z = 0 while the board runs down it, so the surface under the board drops at nearly free fall (about 0.8 g
  downward at 0.45 s, my reckoning from the tilt's rate and the board's speed [I]). The board leaves the water at 0.42 s; the
  feet then carry nothing (load 0), and at 1.23 s the old rule `MAX_FLIGHT` (0.4 s in the air) separates the rider. The
  body stays square to the deck through it (the ankle within 7°), at 5–6 m/s. So it is neither a nose-dig from the body
  leaning too far forward nor a pearl at 41 km/h: the face drops away nearly as fast as the board can fall, and the hull's lift lifts it clear. The
  old rider fails it the same way (lost board, 1.42 s).
- **Step time standing** (`time.probe.ts`, median of 5, under the Basilisk load): flat glide 2.62 → 2.49 ms a step,
  20° face 2.45 → 2.48 ms. The same within the noise; the delay line costs nothing visible.
- **Not run:** the merge checks (the suite, the Canyon hashes, the fps trace), since the bars miss. Run: `tsc` (app and
  server), `standingBody.test.ts` (4 pass). No ride, no game page.
- **Traces of the misses:** `results/trace31b-rise2.jsonl` (the 2 m/s rise), `trace31b-glide12.jsonl` (the 12 m/s
  placed glide), `trace31b-carve.jsonl` (the standing held carve), `trace31b-cross45.jsonl` (the 45° start, now held),
  `trace31b-tilt40.jsonl`.

### What I would try next (for the advisor; not built)

1. **The hip in pitch (the ruling's step 3).** The falls are the body tipping over the nose with the feet's pressure
   at the toes (the 12 m/s settle, the rises, the carve). A trunk rotor in pitch adds torque past the feet's edge
   without moving the pressure.
2. **The hull's pitch damping, measured cleanly** (a held rider, as the carve lab measured the roll). The model's margin
   rests on it: at 30 N·m·s/rad it is gone, at 100 it is +0.04.
3. **The roll's 3 Hz share** rose with the active loop (riding straight, 0.68 against 0.12). The bank law's `rollAxis`
   and its roll half of the upright drive are about the level heading, while the body now pitches; that mismatch
   grows with the lean. I did not trace it.

# Part 1: step 3.1 (the first build, handed back before ruling 29a)

## Short answer

- **Built, behind `?rider=new`.** Standing, the body is now free along the board too: its speed along its own forward
  axis is a ninth unknown in the board's solve (9 × 9). A pitch ankle holds it. The body's frame is heading × pitch ×
  bank, from the leg line. The knees are softer (20 kN/m) and have a strength cap in place of `MAX_LOAD`. A-lite's power
  window applies. The old rider stays byte-identical (N0).
- **The steep-water leak is gone.** Placed straight down or straight up a 25–50° face, the new rider holds all 12 starts
  for the whole 1.5 s (the old rider: 2 of 12). The legs do at most 0.14 kW there, the board stays under 2.2 g. [M]
- **N2 passes** after the tuning round: down a 20° face from 4 m/s the board trims at 7.6–8.5° to the face at speed (old
  15–18°) and gains 3.85 m/s in 2.5 s (old 1.7). [M]
- **N3, N4's tilted 40° drop and N5's carves still miss** after the one tuning round. So I stopped (the stop rule). I
  added no drive and no gameplay force.
- **The cause, measured: a passive pitch ankle inside 0.7–1.2 m g h is too soft** to hold a 73 kg body on a 2.5 kg
  board. Three effects (section 4):
  1. Along the board, the body and the board are joined by only (k − m g L) / L², about 180 N/m. A drag spike stops the
     light board alone in 0.1–0.2 s, and the body runs forward over the feet.
  2. The body's balance is so soft that any error in its reference shows up about five times larger in its lean.
  3. Under a load over 1.2 g (a carve, a bump) the felt gravity is stronger than the ankle, and the body topples in pitch.
- **For the advisor:** 3.1 cannot pass N3–N5 with a passive pitch ankle alone. The design's own §1 says the ankle has
  "active rest torques from the balance". A diagnostic with the bank law's own active rest on the pitch (section 5)
  helps (the 2 m/s rise holds, carves last 0.3–0.6 s longer) but does not pass everything. The board's light fore-aft
  coupling must be part of the next ruling.

## 1. What changed

New files:
- `src/physics/standingBody.ts` (201 lines): the constants, `kneeStrength`, and `StandingBody` (the pitch's frame,
  reference, rest, torque and the ninth row of the solve).
- `src/physics/standingBody.test.ts` (4 tests).

`src/physics/AttachedRider.ts`, all under `rider: 'new'` and standing (`freeBody`), unless said:
- the option `rider` (1137–1144); the fields `newRider`, `windowed`, `standingBody`, `forward` (1605–1610, 1732–1733);
- `freeBody` and `powerCapped` (1771–1782);
- `mount`: the pitch's state reset before the frame (2000–2001); the power window reset with the new rider too (2021);
- `prepare`: the carried point along the board too (2438–2445); no along-board correction drive (2460–2461); the pitch's
  prepare after the leg's (2472–2473); the power window (2488);
- `preparePitch` (2491–2502): the body's speed along its forward axis and the pitch rate on the deck;
- `prepareLeg`: a fresh leg feels the face's normal (2872–2873); the knees' 20 kN/m (2945–2948);
- `coupleStanding`: N = 9 (3271–3273), the forward speed in the mismatch and the ninth row (3320–3326), the agile legs'
  ledger on it (3358);
- `settleStanding`: the forward speed after the solve (3369–3372);
- `legShare`: rule 1 is the new body's own (3499–3500);
- `finish`: the forward speed, the body's pitch rate in its spin (3567–3578); the power window's ledger with the new
  rider too (3559, 3613, 3638);
- `frame`: heading × pitch × bank from the leg line; square to the deck on a mount (3700–3728);
- `uprightVelocity`: the roll half only (3760–3766);
- `project`: the knees' strength in `MAX_LOAD`'s place (3804–3805);
- `balanceStep`: no upper-body shift along the board (4002, 4072–4086). The trim's job (W/S, Snap) goes to the pitch
  ankle's rest through `copTarget`. With the body free along the board, a shift there would only redraw it.
- `swung`: the drawn swing about the body's own forward axis (2162–2163). `renderPoint` and `handoffState` read
  `orientation`, which is now the pitched frame.

`src/physics/BoardBody.ts`: the 9 × 9 branch (1225–1243) and its arrays (403–405); `powerCapped` in place of
`capsLegs` there.

The switch: `riderSwitch` in `src/game/PhysicalMode.ts` (1000–1009, read at 542–543), `SurfZoneConfig.rider`
(`src/wave/SurfZoneSimulation.ts` 262–268), `src/wave/SurfZoneRunner.ts` 496, `RideSessionOptions.rider`
(`src/physics/RideSession.ts` 155–156, 249). Online rooms pin it: `rider: undefined` in `src/main.ts` 538. The test
in `src/game/PhysicalMode.test.ts` reads that line; I checked it fails with the pin removed.

The probes' lab (`docs/research/board-in-water/lab.ts`) reads `RIDER=new`, as it reads `LEG_POWER=cap`.

### The numbers in the new body (all inside the design's sourced ranges)

| Number | Value | Range | Note |
|---|---|---|---|
| Knee spring | 20 kN/m | 15–25 | constant (no crouch softening); damping ratio 0.35 |
| Knee strength | 300 N·m a knee, bones 0.45 m | — | 3.0 / 2.25 / 2.1 / 1.9 body weights standing / crouch / Compress / tuck |
| Pitch ankle | 1.2 m g L | 0.7–1.2 m g h | L the leg's length now; damping 0.1 s × k (the bank ankle's ratio) |
| Pitch reference | the felt force (0.1 s) with the face's normal as feed-forward, the difference smoothed 0.1 s | — | tuned from 0.5 s |
| Pitch range | ±45° off the deck's normal | — | past it the body is off its posture |

The pitch's rest: the reference lean, plus the angle that puts the feet's pressure at the trim's target, plus the
ankle's own stretch that holds the body's weight there. No feedback on the body's lean: the design's "passive impedance,
plus a rest from the trim's CoP target".

## 2. The bars, old against new

Probe: `bars.probe.ts`. Results: `results/bars-old.jsonl`, `results/bars-new.jsonl`. The study's probes under
`RIDER=new`: `results/study-*-new.jsonl`.

| Bar | What | Old rider | New rider | Pass? |
|---|---|---|---|---|
| N0 | `rider=old` prints the same bytes | — | the six study probes, A-lite's 12 result files, B-wall's bars and trace: all the same | yes |
| N1 | legs per frame under about 2 kW, at 25–50°, five lines, placed and tilted (60 rows) | up to 30.9 kW; 28 rows over 2 kW | 58 rows under 0.36 kW; 2 rows 2.1 and 2.7 kW, in the frame they fall (tilted 40°, down and 20° off) | 58 of 60 |
| N1 | at most 1.46 kW over any 0.5 s | up to 1.57 kW | at most 0.10 kW | yes |
| N2 | 20° straight down from 4 m/s: pitch to the face 5–8° | 17.8° at 5 m/s, 15.6° last 0.5 s | 10.7° at 5 m/s, 7.9° at 7 m/s, 8.5° last 0.5 s, 7.6° at the end | yes (at speed) |
| N2 | speed gain in 2.5 s at least 3.5 m/s | +1.73 | +3.85 | yes |
| N3 | 20 cm rise at 4 m/s: knees 5–20 cm, load 2–2.5 BW, no fall | 2.6 cm, 4.0 BW, falls 0.27 s | 3.8 cm, 2.96 BW (the knee cap), falls 0.35 s | no |
| N3 | 20 cm rise at 2 m/s: no fall | 1.2 cm, 2.62 BW, holds | 1.7 cm, 2.31 BW, falls 0.48 s | no |
| N4 | placed 25–50°, down and up: no fall in 0.5 s, a hold or a slide | 2 of 12 | 12 of 12, all 1.5 s: down speeds up to 9.9–15.2 m/s; up climbs, stops and slides back | yes |
| N4 | the board under 5 g (placed) | 0.6–16.8 g after 0.1 s | 0.5–2.2 g | yes |
| N4 | tilted 40° down: holds or slides | falls 1.42 s (24 g) | falls 1.68 s (impact, 10 g) | no |
| N5 | flat glide 5, 7, 9, 12 m/s: draft within ±2 cm | 20.8 / 10.8 / 5.7 / 1.7 cm | 20.9 / 11.6 / 6.8 / 2.1 cm | yes |
| N5 | the drag should fall at 7 m/s | 0.216 g | 0.190 g | yes |
| N5 | held carve, flat, full steer from 7.7 m/s: holds 3 s | standing falls 2.28 s; Compress holds | standing falls 1.62 s; Compress falls 1.73 s | no |
| N5 | the 4 s full carve on the 15° plane (the carve lab's) | falls 2.18 / 1.90 / 2.27 s at 5 / 7 / 9 m/s | falls 1.53 / 1.20 / 1.27 s | no (the old misses too) |

The 60 steep rows, line by line, are in `results/bars-*.jsonl` (`bar: "N1/N4"`).

Two notes on the old rider's own numbers:
- Its Compress carve holds 3 s only because of `CARVE_CARRY`. With the carry off (a diagnostic), it falls at 2.30 s.
- It also misses the 4 s full carve on the 15° plane.

## 3. The tuning round (one, inside the ranges)

| Run | N2 (20°) | N3 2 m/s | N3 4 m/s | N4 placed (12) | N4 tilted 40° | Held carves | Full carve 15° |
|---|---|---|---|---|---|---|---|
| Built: reference 0.5 s | falls 1.38 s | falls 0.32 s | falls 0.28 s | 12 hold | falls 1.58 s | 1.60 / 1.75 s | 1.30 / 1.03 / 0.95 s |
| Reference 0.2 s | +3.83 m/s, 7.6–8.4° | falls 0.42 s | falls 0.33 s | 12 hold | falls 1.63 s | 1.67 / 1.77 s | 1.48 / 1.15 / 1.20 s |
| **Reference 0.1 s (kept)** | **+3.85 m/s, 7.6–8.5°** | **falls 0.48 s** | **falls 0.35 s** | **12 hold** | **falls 1.68 s** | **1.62 / 1.73 s** | **1.53 / 1.20 / 1.27 s** |
| 0.1 s, knees 15 kN/m | the same | falls 0.58 s | falls 0.38 s | 12 hold | falls 1.72 s | 1.62 / 1.77 s | the same |
| 0.1 s, knees 25 kN/m | the same | falls 0.43 s | falls 0.32 s | 12 hold | falls 1.67 s | 1.62 / 1.73 s | the same |

- The ankle stayed at the top of its range (1.2). Lower is worse: below 1 the body topples on its own.
- The knees change little: the falls are pitch falls, not knee falls.
- Kept: reference 0.1 s, knees 20 kN/m, ankle 1.2.

## 4. Why N3, N4 and N5 miss (the traces)

`trace.probe.ts` prints one run frame by frame. Results: `results/trace-*.jsonl` (the kept build).

**(1) The board and the body are joined softly along the board.** [M, R] Along the board the body feels its ankle
spring, k ψ / L, and gravity tipping it, m g ψ. The board feels the opposite. So the coupling is (k − m g L) / L²: at
1.2 m g L about 180 N/m (the old body was rigid there). The board weighs 2.5 kg, so its own drag sets its speed within
about 0.06 s. A drag spike stops the board alone, and the body runs on over the feet:
- the 20 cm rise at 4 m/s (`trace-rise4`): the knees reach their cap (2.94 body weights, "impact") as the water rises;
  then the board slows from 6.5 to 3.6 m/s in 0.1 s (0.58–0.68 s), the body's ankle goes from 24° to 32° forward, the
  pressure reaches the front of the feet (tip, 0.63 s), and the load falls to 0. The 2 m/s rise falls the same way;
- the face tilting in to 40° (`trace-tilt40`): the falling face first unloads the feet (1.2–1.3 s); when the load comes
  back (2.4–2.7 body weights) the board trims nose-up to 31° and slows from 11.5 to 3.5 m/s in 0.2 s (1.42–1.62 s); the
  body's ankle goes from 18° back to 39° forward, and the rider falls at 1.68 s.

**(2) The body's balance is soft.** [M] Its stiffness against tipping is only k − m g L = 0.2 m g L. So if the reference
is wrong by 1°, the body sits about 5° off it, and it comes back slowly (a mode of about 0.25 Hz). Before the rise, on
the flat glide, the body sits about 12° ahead of its reference, with the pressure at +0.2 m (the feet's edge is
+0.375 m). Then a small push tips it.

**(3) Under load the passive ankle is weaker than gravity.** [M, I] In a carve banked 35°, or on a bump, the body feels
about 1.2 g or more. The ankle (1.2 m g L, set with plain g) is then below the toppling stiffness, and the body topples
forward in pitch. In the held carve (`trace-carve`) the body's frame goes from 6° to 30° forward between 0.8 and 1.5 s
while its reference is 1–17° back; the pressure reaches the front edge at 1.32 s.

On flat water the glide itself (`trace-glide5`, from 5.8 m/s) slows to a stall, as the old rider's does: the board
stands up as it stops (2.3–2.9 s).

**The 20° drop with the slow reference (fixed by the tuning).** With 0.5 s, the face's normal said "lean 20° forward",
but at 4–5 m/s the board is dragged hard, so the felt vertical was only 3–10°. The body leaned too far and tipped at
1.38 s (`trace-down20` shows the kept build, which holds).

## 5. Diagnostics (not built; removed before the commit)

- **The bank law's active rest on the pitch.** I gave the pitch ankle's rest the bank law's own form (gains 7.4 and
  3.6 s, lag 0.01 s, ±0.4 rad), reading only the body's own lean and rate. Results (`results` not kept; numbers here):
  N3 2 m/s holds (2.42 BW, 1.9 cm); 4 m/s still falls at 0.57 s (5.0 cm, 2.99 BW); the tilted 40° drop falls at 2.15 s;
  held carves 1.90 / 2.00 s; the full carve 1.85 / 1.68 / 2.12 s; N2 +3.51 m/s, 8.3–9.2°; placed starts 10 of 12 hold
  1.5 s (12 of 12 hold 0.5 s); N1 at most 3.9 kW in a frame, 0.97 kW over 0.5 s.
  So an active pitch loop helps, but alone it is not enough.
- **`CARVE_CARRY` off.** The new rider's Compress carve falls at 1.75 s with or without the carry (the old rider falls at
  2.30 s without it). So the carry does not cause the new rider's carve falls.
- **The fresh leg's felt force.** Started as the old (straight up, 1 g) instead of along the face's normal, the placed
  starts got worse (3 of 6 straight-up starts fall). Kept along the face's normal.

## 6. Modes A and B

`bars.probe.ts` ("Modes"): the carve lab's roll kick (0.5 rad/s, riding straight down the 15° face), and 5 s riding
straight; the share of the board's roll rate in two bands.

- **Mode A (13–16 Hz roll): not seen.** The share in 12–17 Hz stays at 0.00–0.05 in every run, as the old's (0.00–0.08).
- **Mode B (3–4 Hz roll–yaw wobble): no growth, but watch it.** After the kick the yaw rate rings at 2.1 / 2.9 / 4.4 Hz
  (5 / 7 / 9 m/s) and decays, damping ratio +0.03 / +0.16 / +0.21 (old: 1.9 / 5.4 / 7.1 Hz, −0.015 / +0.05 / +0.06).
  The roll's share in 2.5–4.5 Hz is larger: 0.24–0.44 after the kick (old 0.01–0.06), 0.23–0.58 in the full carves
  (old 0.15–0.38). Riding straight, no yaw sign flips (as the old).

## 7. Other findings

- **The placed start across the face (the 45° line) is worse.** At 25–35° the old rider holds 1.5 s; the new falls in
  about 0.5 s (`trace-cross45`). The bank runs uphill to 70°: the leg's load is only about 0.5 body weights there (old
  0.7–1.0), so the feet give the bank half the torque. The pitch is not the cause (its ankle stays within 6°). The fair
  tilted-in starts on that line hold at 25–30°. Not a bar; noted.
- **The tilted-in starts going up (135° and 180°) fall in 0.42–0.62 s** (old 0.43–1.03 s), with no leg power. The board
  stops and sinks; it was a stall before too.
- **Step time standing** (`time.probe.ts`, under the Basilisk load, median of 5): flat glide 2.90 → 3.04 ms a step,
  20° face 2.79 → 2.87 ms (+3 to +5 %). The 9 × 9 costs little; 32 substeps are kept.

## 8. What was not run

- The merge checks: the full suite, the Canyon byte check and the headless fps trace. The brief runs them only if the
  bars pass. Run instead: `tsc` (app and server), `standingBody.test.ts`, `legPower.test.ts`, and the switch and pin
  tests in `PhysicalMode.test.ts`.
- B-wall's `realwall.probe.ts` (the pool's case water, a long run).
- No ride session, no game page, no Basilisk case.

## 9. How the owner rides it

The new rider is not ready for a ride judgement: on flat water and in carves it falls sooner than the old one. If the
owner wants to feel the lean on a drop anyway:
- Canyon: Menu → Canyon with `?canyonWaves=true&turnBody=on&snapLegs=drive&snapCross=on&rider=new`.
- The 2 m pool: Menu → Wave Pool → Waves: Barrel with
  `?poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&tubeForm=early&poolReach=long&loftMesh=arc&wallFoot=dug&rider=new`.
- What to look for: the body should lean into steep drops and the start on a steep face should not throw the rider.
  Expect falls in turns and over chop: the pitch has no active balance yet.

## Files

- `bars.probe.ts`: N1–N5 and the mode checks. `trace.probe.ts`: one run frame by frame (`CASE=glide5`, `down20`,
  `rise1`, `rise2`, `rise4`, `tilt25`, `tilt40`, `cross45`, `carve`). `time.probe.ts`: the step time.
- `vitest.probe.config.ts`. From the repo root:
  `OUT=/tmp/out.jsonl RIDER=new npx vitest run --config docs/research/new-rider/3.1/vitest.probe.config.ts bars`
  (without `RIDER=new`, the old rider).
- `results/`: `bars-old.jsonl`, `bars-new.jsonl`, `study-*-new.jsonl` (the board study's probes with `RIDER=new`),
  `trace-*.jsonl`.
