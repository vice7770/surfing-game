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

## 8. Results

(to be filled in after the measurement)
