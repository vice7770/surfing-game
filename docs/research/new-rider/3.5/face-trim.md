# 3.5r — Face trim: a face model for the new rider's balance (design note)

Branch `claude/face-trim`, cut from `claude/straight-line-fall` at `2e4b1de1`. Written 2026-11-23 by the surfer-track
builder (Claude, Opus 5.5) **before** the switch was built, as the coordinator's brief asks. The results are §8, added
after the measurement; nothing above §8 was changed by it.

The owner (2026-11-20): *"The surfer cannot stand up."* His ruling binds: *"The turn should not be limited, the turn
is good, the fall is a result of the inbuilt balance that lack the ability to stand."* 3.5p found the balance has no
trim across a face; 3.5q found the existing datum (`?waterHeel`) makes every arm fall sooner, and named what it never
tried: the filter never sees the face, and the pair's weight across the face is not in its column.

The model-side numbers below come from the code's own functions (`plantAt`, `continuousPlant`, `heelColumn`,
`scheduledDesign`) on the owner's design (`riderBody: 'two'`, the shipped ladder), tall stance, rail 0, with a face
tilt of 12° under the board (the test wave's 11–13°). Signs are the model's: φ the board's roll and θ the body's bank,
both + toward the board's right; the face here falls to the right (downhill = +y), so a board flush with it has
φ = τ = +12°.

## 1. The steady state across a planing face, from the game's own physics

**The water's force on a face is the lab's force turned through the face.** Every derivative the balance uses
(`PLANT_SPEEDS`, `RAIL_PLANT`) was measured on flat water, as a function of the board's heel, slip, yaw rate and roll
rate, with the side force taken on the **level** axis (`roll-plant/plant.probe.ts`: `Y: F.dot(levelLeft)`). The game's
hull meets the water's own surface, so on a face the same force arises at the same heel **relative to the face**,
ψ = φ − τ, but expressed in the face's frame. Turned into the level frame the model works in, to first order in τ:

- roll moment about the board's long axis: unchanged by the turn, `K = K_φ ψ + K_β β + …`;
- yaw moment: `N = N_φ ψ + N_β β + …` (the pitching moment the turn mixes in is the trimmed hull's, ≈ 0);
- **side force: `Y = Y_φ ψ + Y_β β + … + L τ`**, where `L` is the water's support of the pair, ≈ (73 + 2.54) kg × g
  = 741 N. The face tilts the support that holds the pair up, so it has a level part L sin τ pointing **downhill**.

At 6.5 m/s the table gives Y_φ = +401 N/rad, K_φ = −296 N·m/rad, Y_β = −1203 N/rad, K_β = −459 N·m/rad. So a level
board on a 12° face (ψ = −12°) is pushed **downhill** by (L − Y_φ) τ = (741 − 401) × 0.209 = **+71 N** and rolled
toward flush by −K_φ τ = **+62 N·m**; a flush board (ψ = 0) feels no roll moment but is pushed downhill by the whole
L τ = **+155 N**, so with no slip it accelerates down the face at about g sin τ. That last fact is the felt vertical
3.5p measured: a body on a freely sliding flush board leans with the face normal (−15.1° in 3.5p's sign at 0.55 s).

**The steady straight trim** (no acceleration of the board's roll or sway, none of the body's bank; the feet then carry
no lateral push, `push = τ_a/h − m g θ = 0`):

| balance | equation |
|---|---|
| sway (the line held) | Y_φ ψ + Y_β β + L τ = 0 |
| board roll | K_φ ψ + K_β β + τ_a = 0 (τ_a the ankle's torque on the board) |
| body bank | τ_a = m g h θ |

Three equations in four unknowns (ψ, β, θ, τ_a): a **one-parameter family**, the rider trading rail for slip. At
12°, 6.5 m/s, tall (m g h = 601 N·m/rad):

| point of the family | rail ψ (uphill rail into the face) | board roll φ | slip β (downhill +) | body θ | ankle torque on the board |
|---|---|---|---|---|---|
| flush | 0 | +12.0° | +7.4° | +5.6° (downhill) | +59 N·m (pressing the downhill rail) |
| **neutral** (no ankle torque) | **−7.6°** | **+4.4°** | **+4.9°** | **0 (plumb)** | **0** |
| level (the old rider's) | −12.0° | 0 | +3.4° | −3.3° (uphill) | −35 N·m (pressing the uphill rail) |

The rail's own roll moment (toward flush) and the slip's (toward the uphill rail, K_β < 0) cancel at the neutral point,
so a plumb body holds it with no ankle effort. Every point needs some downhill slip: the rail alone would need
ψ = −L τ / Y_φ = −22° to hold the line, and then −115 N·m, past the feet's 93 N·m (`m g d`, 716 N × 0.13 m).

**The yaw.** No point of this family balances the yaw. The slip the line needs gives N_β β > 0 (at the board's
centre of mass N_β = +510 N·m/rad at 6.5 m/s), nose downhill: in the model, 17–21 rad/s² of yaw acceleration at 12°.
Including the yaw row and freeing the turn rate gives the full steady state, and it is not a trim: with the body
plumb it is a 26°/s turn down the face, ψ = −20°, slip −7.7°, ankle −181 N·m (`steadyTurn` with the face on its
right-hand side). The board's heading drifts down a face unless the rider steers it; the old rider's `holdLine`
(a heading loop that sets its lean from the heading error) is what slows its drift to 54° → 37° over 6 s.

## 2. Measured against the game

| quantity | derived (level point, 12°) | game, old rider (3.5p, 27 cells unless said) |
|---|---|---|
| water's roll moment on a level board, toward flush | +35 N·m (6.5 m/s), +34 (7) | **+32.0 N·m (+3.8 to +43.5)**, 0.5 s to the end, delivered (roll ledger) |
| uphill rail with the board level | 12° (= τ) | 10–16° (base cell) |
| slip, down the face | 3.4° (6.5 m/s), 2.8° (7) | 3–8° (base cell; it also turns down at 4–14°/s, which the derivation sets to 0) |
| body | −3.3° (uphill, to deliver the torque) | −2.3 to +3.0° (carried by `uprightVelocity`, so a contrast, not a template) |
| water's yaw moment | the slip's, nose downhill | +5.4 N·m (+2.4 to +12.7) toward the face, against the rider's −5.4 |

| quantity | derived (flush) | game, new rider (3.5p) |
|---|---|---|
| water's roll moment, flush | 0 from the rail | −2.4 N·m at 0.55 s, rail −0.8° (base cell) |
| body on a freely sliding flush board | leans with the face normal, +τ | −15.1° (−15.8 to −14.2) at 0.55 s (3.5p's sign: downhill) |

The roll moment, the rail and the slip's direction agree. The yaw does not: the model's flat-water N_β turns a
slipping board downhill, and the game's water yaw moment on the old rider is small and toward the face. The yaw ledger
carries the peer's caution about its surface-normal term (3.5p §4.2), so this is recorded, not resolved.

## 3. How the internal model should represent it

1. **The face is a sensed input.** τ, the face's tilt across the heading (`atan2(waterUp·side, waterUp.y)`, the angle
   `rail` is `roll` less, already computed for `waterHeel`), enters the internal model as a third input. It is sensed
   like everything else: it rides the same 0.1 s line as the seven senses, so the controller knows the tilt as it was
   `delay` ago, and holds it over the delay.
2. **Its column is the whole first-order face**, E = −(heel column) + L × (side-force column): the heel datum (the
   water's three heel terms read at ψ instead of φ) **and** the support tilted by τ on the board's sway row. Built by
   differencing the code's own `continuousPlant`, as `heelColumn` is, so in the two-body plant the side force reaches
   every row through the same mass matrix. At 6.5 m/s, per radian of τ, on [φ̈, θ̈, ṙ, β̇]: **+272, −27, +28, +3.8**.
3. **The plant is linearised about the face, not about level.** The derivatives are a function of the heel against
   the water, so A, B, the gains and the filter's gain are the shipped ones; what moves is the operating point (the
   trim of §1, an affine term) and the input the model is driven by. Φ, Γ, K and L are untouched, and with τ = 0 the
   controller is the shipped one exactly.
4. **What the filter sees.** Shipped, the filter's one-step model has no face, so the face's roll moment and push are
   an innovation it explains with its slow command bias (3.5p §5: the ankle bias at −3.3° by 1.0 s) — but a command bias
   acts on the board **and** reacts on the body, where the face acts on the board alone, so the body's estimated state
   is bent to fit. With the switch the filter's prediction step carries E τ too; the bias states are left for what the
   model still gets wrong.
5. **The reference's roll and bank targets.** The shipped reference is the steady turn for the lean asked, with the
   bank pinned at that lean and the rest solved (`steadyTurn`). On a face it adds the trim of §1 at the **neutral
   point**: the bank target stays the lean asked (plumb with the stick centred), and the board's roll target moves
   toward the face until the rail's roll moment and the slip's cancel (+4.4° of roll, 7.6° of uphill rail at 12°), with
   the slip target the line needs (+4.9°) and the ankle rest that leaves the ankle unloaded (−4.4°). The correction is
   solved per design point from that point's own derivatives (the force balance of §1, closed form), blended like every
   other matrix, and scaled by the sensed τ. The yaw row is left out (§1): the reference does not ask the board to hold
   a heading against the face, and the turn rate target is the shipped one.
   The level point is the same family's other end; it is described here and not built (two variants at most).

## 4. Why this is not `waterHeel`

| | `waterHeel` (3.3p/3.4e) | face trim |
|---|---|---|
| side force from the face, level board, 12°, 6.5 m/s | −Y_φ τ = **−84 N (uphill)** | (L − Y_φ) τ = **+71 N (downhill)** |
| column on [θ̈, ṙ, β̇] per rad of τ | +27, −43, −7.1 | **−27, +28, +3.8** (each the other sign) |
| reference with the stick centred | flush, no slip, ankle rest at the mounted −12.4°: not an equilibrium (the pair slides down at g sin τ) | rail 7.6°, slip 4.9° downhill, body plumb, rest −4.4°: the force balance of §1 |
| the filter | never sees the face | its one-step model carries the face |
| the tilt's timing | the tilt now, undelayed | sensed, 0.1 s late, like every sense |

`waterHeel` read the derivatives at the heel against the water but left the force in the water's frame. In the level
frame the model integrates in, the support tilts with the face, and that term is larger than the heel terms and of the
other sign: `waterHeel`'s model expected a level board on a face to be pushed **up** it. The game's old rider slips
3–8° **down** it. 3.5q's datum arms all fell toward the uphill rail.

## 5. Authority

None is added. The controller's outputs are the same two commands (the ankle's rest and the twist's torque), through
the same ±14.3° clamp, the same hip share and the same twist bound. No force is added to the game's physics: the
face's support and push already act on the board in the game; only the controller's **expectation** of them and its
**target** change. The lean ask, its cap, its pace, the stick and the turn are untouched (the reference keeps the lean
asked as its bank target). The tilt is a sensed quantity through the same delay. Off by default; pinned off in online
rooms; printed back from the running host.

## 6. The switch

`?faceTrim=on|model` (`DesignWeights.faceTrim`, `AttachedRiderOptions.faceTrim`, `SurfZoneConfig.faceTrim`):

- `on` — the face's column in the filter and the predictor, and the neutral-point trim in the reference (§3.1–5);
- `model` — the face's column in the filter and the predictor only, the reference as shipped (so the reference's share
  can be read off the pair).

Not meant to be combined with `?waterHeel` (both would carry the heel datum).

## 7. What the model itself predicts (stated before the ride)

The design's own closed loop (true plant = the model with the face's input, the shipped gains, a perfect estimate)
does **not** settle at the trim, in either variant: the trim leaves the yaw unbalanced (§1), and the shipped cost
(yaw rate scale 0.2 rad/s, slip 0.02 rad) answers by railing the board up the face. Its equilibrium at 6.5–7 m/s, 12°,
is roll −16 to −20°, body −11 to −18° (uphill), ankle −180 to −210 N·m (both variants, and the level point too): past
the feet. So the model predicts this
switch will not by itself give a straight trim; whether the clamp, the bias and the game's own yaw let the ride
settle somewhere standing is what §8 measures. If it fails toward the uphill rail, the yaw cost is the next suspect,
not the face column.

## 8. Results (measured once, 2026-11-23)

**The build.** Every arm was printed back from the live `AttachedRider.predictor.weights` of a session built on the
game's own config path (`surfZoneConfigFor` under the address; `SurfZoneRunner` for the test wave, `RideSession` for
3.5o's drive): `faceTrim` `'on'`/`'model'` and `plantFloor` 4.5/null exactly as asked, `riderBody` `'two'`, in every
cell and every rider (`results/35r/grid-arms.txt`, `organic-arms.txt`, the `built` rows). **Inert when off:** this
build's shipped arm reproduces 3.5p's grid in **27 of 27** cells and 3.5q's organic seed 2 in **21 of 21** riders, on
the same frame. Fall times are seconds after the placement (grid) or the stand (organic); a median counts a censored
ride at its floor, labelled ≥.

### 8.1 The test wave's 27-cell plumb ride grid, no input

| arm | fell | median (range), s | paired vs shipped | side of the separation (sign of the capture point across) | falls below 3 m/s through the water, 0.25 s before | body within 3° of plumb | 0.5 s to the end: rail / bank (medians) | heading turned |
|---|---|---|---|---|---|---|---|---|
| shipped | 27 | 2.533 (2.050–3.550) | — | downhill 27 | **0 of 27** (median 9.24 m/s) | 9.3 % | −12.1° / −23.1° | −96.3° |
| floor (3.5q B) | 27 | 2.533 | same frame 27 / 27 | downhill 27 | — | 9.3 % | — | — |
| **on** | **25** | **5.267 (4.167 to ≥ 6.000)** | **later 27 / 27, +2.867 (+0.667 to +3.767)** | uphill 14, downhill 11 | **24 of 25** (1.94 m/s) | **41.4 %** | −2.5° / −3.6° | −75.9° |
| on + floor | 27 | 5.067 (4.100–5.967) | later 27 / 27, +2.550 (+0.550 to +3.650) | uphill 15, downhill 12 | 26 of 27 (2.42 m/s) | 37.3 % | −2.5° / −3.9° | −55.6° |
| model | 27 | 3.350 (2.133–5.417) | later 21 / sooner 6, +0.583 (−0.633 to +3.067) | downhill 18, uphill 9 | 8 of 27 (6.61 m/s) | 10.1 % | −22.6° / −29.5° | −108.4° |
| model + floor | 27 | 3.350 (2.133–5.317) | later 21 / sooner 6, +0.583 (−0.633 to +2.883) | downhill 18, uphill 9 | 6 of 27 | 10.1 % | −22.6° / −29.5° | −108.4° |

Rail is 3.5p's (+ = uphill rail into the face), bank + toward the face; the heading turned is to the last attached
frame (− = down the face). The share of frames from 0.5 s with an uphill rail **and** the body within 3° of plumb is
0 % shipped, 8.4 % (0–32.4) `on`, 8.6 % (0–28.6) `on + floor`, 0 % (0–44.4) `model`.

- **`on` removes the spiral, and only the spiral.** No `on` fall is the shipped roll-over at the trough: 24 of 25 come
  off the plane, below 3 m/s through the water, after the wave's push is spent. In the base cell the body is still
  thrown to −19.7° by 0.5 s (the placement's snap; the tilt is sensed only from 0.1 s), comes back to −1 to −9° by
  2–3.5 s while the board turns down the face, rides the bottom near plumb, and falls at 5.3 s when its speed through
  the water has dropped from 8 to 1.3 m/s.
- **It does not give him the trim it asks for.** Over the ride the board sits about flush (rail −2.5°), not on the
  neutral point's 7.6° of uphill rail, and it still turns down the face (−76° median), more slowly than shipped.
- **`model` alone does little:** later by a median 0.58 s, the body leans further downhill (−29.4° at 1.0 s against
  −15.5°), and the falls stay mostly planing. On this ride the reference does the work, not the model change.
- **The floor**, inert on the shipped ride (3.5q), now moves 26 of 27 `on` cells, slightly sooner (5.067 against
  5.267): the longer rides end below 4.5 m/s.

### 8.2 Organic rides on the owner's address (3.5o's drive, steer only, seeds 1–3, 60 riders)

A is 3.5q's shipped arm, B 3.5o's own floor population for these seeds; the buckets are 3.5o's rule on A, as 3.5q
listed them. Paired median (range); later / sooner / same.

| bucket (n) | A shipped | E on | G model | F on + floor | H model + floor |
|---|---|---|---|---|---|
| **outside the turn window, the post-turn rides across the face** (9) | 2.517 (1.733–3.700) | **1.967; vs A 0 / 8 / 1, −0.733** | 1.950; vs A 5 / 4 / 0, +0.017 | 1.967; **vs B 2 / 7 / 0, −0.317** | 1.983; vs B 3 / 6 / 0, −0.167 |
| sharp-steer collapse (5) | 0.700 (0.467–0.983) | 0.700; 0 / 1 / 4 | 0.700; 0 / 1 / 4 | see §8.4 | see §8.4 |
| turn window, neutral falls too (23) | 0.750 (0.500–1.283) | 0.683; 3 / 11 / 9, +0.000 | 0.867; 9 / 7 / 7, +0.000 | 0.933; vs B 7 / 6 / 10, +0.000 | 0.933; vs B 9 / 3 / 11, +0.000 |
| censored on shipped (3) | 0 of 3 fell | 1 of 3 | 1 of 3 | 1 of 3 | 1 of 3 |
| neutral (20) | 16 of 20 fell, 1.108 (0.550 to ≥ 5.000) | 1.033; 4 / 7 / 9, +0.000 | 1.108; 8 / 3 / 9, +0.000 | 1.300; vs B 4 / 5 / 11, +0.000 | 1.358; vs B 7 / 3 / 10, +0.000 |

| rider | A | B floor | E on | F on + floor | G model | H model + floor |
|---|---|---|---|---|---|---|
| seed 2 wave 2 left (post-turn) | 3.700 | 3.683 | **2.750** | **2.650** | **2.633** | 2.900 |
| seed 2 wave 2 right (post-turn) | 3.133 | 4.033 | 2.917 | 2.900 | 3.150 | 3.233 |
| seed 2 wave 1 neutral | 3.900 | 3.683 | 3.850 | 3.050 | 3.933 | 3.667 |

**The post-turn rides across the face fall sooner with `on`**: 8 of 9 against shipped (median −0.733 s), 7 of 9 with
the floor against the floor alone (−0.317 s). Those are the rides the owner rides after every turn.

### 8.3 The wave-2 survivor's turn (seed 2 wave 2 left, steer alone)

| arm | turn peak bank | at 0.50 m of climb | at 0.90 m of climb | fall |
|---|---|---|---|---|
| shipped (this build) | 42.83° at +1.367 s | +2.067 s, 4.24 m/s, course 48.6° | +2.783 s, 3.31 m/s, course 46.4° | +3.683 s |
| on | 43.49° at +1.367 s | +2.017 s, 4.09 m/s, 52.0° | **not reached** (0.89 m at most) | **+2.733 s** |
| on + floor | 43.49° at +1.367 s | +2.017 s, 4.08 m/s, 51.3° | not reached (0.84 m) | +2.633 s |
| model | 43.12° at +1.350 s | +2.000 s, 4.06 m/s, 55.9° | not reached (0.83 m) | +2.617 s |
| model + floor | 43.12° at +1.350 s | +2.000 s, 3.97 m/s, 50.3° | +2.683 s, 4.33 m/s, 62.2° | +2.883 s |

**The turn is not damaged** (43.5° against 42.8°, at the same instant). **The climb is**: with `on` the ankle's
command (requested, pre-clamp) swings −36.4° → +56.9° → −25.2° at +2.00 / +2.25 / +2.50 s, at 4.0–4.6 m/s through
the water, against −6.7° / −0.6° / −2.5° shipped, and he falls 0.95 s sooner. Over the whole post-turn bucket the
share of frames with the command past ±14.3° is about the same in both arms (median 46–50 % from +1.5 s), so this
trace is the survivor's, not a bucket-wide mechanism.

### 8.4 With `plantFloor=4.5`: the sharp-steer collapses (n 5: seeds 2.1 L/R, 3.9 R, 3.12 L/R)

| arm | fell | median (range) | vs A | vs B (the floor alone) |
|---|---|---|---|---|
| B floor | 5 | 3.717 (1.500–3.983) | later 5 / 5, +3.000 | — |
| F on + floor | 5 | 3.633 (1.667–4.000) | later 5 / 5, +2.933 | later 3 / sooner 2, +0.017 (−0.300 to +0.167) |
| H model + floor | 5 | 3.433 (1.617–3.983) | later 5 / 5, +2.733 | later 2 / sooner 2 / same 1, +0.000 (−0.350 to +0.117) |

**They compose**: the switch keeps the floor's rescue of the sharp steer (seed 2 wave 1 left 4.000, right 3.883),
where `waterHeel` took part of it back (3.5q: sooner than the floor in 4 of 5). On its own neither variant rescues a
collapse (0.700 s, as shipped), as expected: that fault is row '4'.

### 8.5 Verdict

**No variant gives the new rider a trim across the face, and neither should go on the owner's address as built.**
`on` is the first arm in this thread to make the test wave's straight-line fall later in every cell (27 of 27, median
+2.9 s), with the trough roll-over gone and the body near plumb four times as often: evidence that the face's
support term and the face-aware reference are the right axis for that ride. But the board still turns down the face
and rides flush rather than railed, the remaining falls are off-the-plane stalls, and it **costs the organic
post-turn rides across the face** (8 of 9 sooner, the survivor 0.95 s sooner on his climb). `model` alone changes
little on the test wave and also costs the post-turn rides. The sharp-steer floor composes with both.

### 8.6 What remains uncertain, and what I would try next (not built: two variants were the budget)

- **Why the post-turn climbs fall sooner is not separated.** One candidate, from the model's own numbers: the neutral
  trim's slip target per radian of tilt grows as the speed falls (0.41 at 6.5 m/s, 1.0 on row '4.5', 1.9 on row
  '4'), which those climbs cross; the floor halves the cost (−0.733 → −0.317 against each arm's own control).
  Consistent with it, not proven.
- **The trim is built on the derivatives at zero rail** (the schedule's rail is still the lean asked). The trim's own
  rail (7.6°) and slip (4–5°, far more when slow) are where the plant should be linearised; `RAIL_PLANT` has the
  held-rail derivatives at 10°. That is the next model change I would try: the same switch, the trim and its
  derivatives read at the trim's own rail.
- **The yaw**, as §1 and §7 said: no point of the trim family balances it, and with `on` the board still turns
  56–76° down the face. Holding a line across a face is a heading question (the old rider's `holdLine`), which is an
  authority the owner has not opened; it is not attempted here.
- **The level point** (the old rider's trim: 12° of rail, 2.8–3.4° of slip, 34 N·m on the ankle) is the family's other
  end and was not built.
- **The placement's snap** still throws the body at 0.5 s; the organic stands across a face that would start this
  balance cold were not measured. Feel is not measured: a bot ride is not evidence of feel. Seeds 1–3 only; the
  buckets are small; the grid is one wave.

## 9. Reproduce

    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/straight-fall.ts -o <s>/sf.mjs --format esm --platform node
    env GRID=1 SECONDS=6 FRAMES=1 EXTRA='&faceTrim=on' OUT=<s>/g-on.jsonl node --max-old-space-size=3200 <s>/sf.mjs   # model; &plantFloor=4.5
    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/sharp-steer.ts -o <s>/raw.mjs --format esm --platform node
    printf "globalThis.location = { search: '' };\n" > <s>/ss.mjs && cat <s>/raw.mjs >> <s>/ss.mjs
    env ADDRESS='?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&faceTrim=on' SEED=2 PERIODS=12 TURN_STEER=1 TURN_COMPRESS=0 STAND_HOLD=5 SUB_FROM=99 SUB_TO=99 OUT=<s>/o-on-s2.jsonl node --max-old-space-size=3200 <s>/ss.mjs
    python3 docs/research/new-rider/3.5/face-trim-grid.py ship=<g-ship> on=<g-on> ...     # §8.1; face-trim-ends.py the end speeds
    python3 docs/research/new-rider/3.5/face-trim-organic.py <dir with o-*.jsonl and done.txt>   # §8.2-8.4

`results/35r/`: `model-side.jsonl` (§1, §3, §4, §7), `grid-arms.txt` and `organic-arms.txt` (every table above),
`grid-{on,onf,model,modelf}-frames-thin.jsonl.gz` (the grid's frames, the columns the tables read; the shipped grid is
3.5p's own `grid-new-frames.jsonl.gz`, identical cell for cell), `organic-o-*-summaries.jsonl.gz` (each organic run's
control, `built` and summary rows, and the survivor's own frame rows).
