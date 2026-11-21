# 3.5p — The straight-line fall on the test wave: the balance has no trim across a face

Branch `claude/straight-line-fall`, cut from `claude/test-wave` (`72514820`) with the docs-only
`claude/sharp-steer-collapse` (3.5o) merged in (`3eab762f`). Written 2026-11-21 by the surfer-track builder (Claude,
Opus 5.5) for the coordinator's review. **Nothing under `src/` changed.** The probes are `3.5/straight-fall.ts` (the
test wave's ride, per frame and per substep, on the game's own config path), `3.5/straight-plane.ts` (the same tilt on
a still plane, the control) and 3.5o's `3.5/sharp-steer.ts` (the organic take-offs), all on this branch.

The owner (2026-11-20): *"The surfer cannot stand up."* His ruling binds: *"The turn should not be limited, the turn
is good, the fall is a result of the inbuilt balance that lack the ability to stand."*

## 1. The answer

**The new rider's balance has no straight trim on a face.** Its internal model and its reference are flat water's:
with the stick centred it holds the board level with the world and the body plumb, and it expects the water to hold
the board level too. On this face the water holds the board **flush with the face**, 11–13° rolled across the heading.
To ride across the face a rider has to hold the **uphill rail** into it. The old rider does that: over 0.5 s to the end
of its 27 rides the water's mean roll moment pushes its level board toward the face, **+32.0 N·m (+3.8 to +43.5) per
cell**, and its feet hold the board against it; its body stays within −2.3 to +3.0° of plumb (it is carried) and the
board keeps 10–16° of uphill rail (base cell). The new rider never applies that torque. What happens instead, in order (all
27 cells, §3):

1. **0.30–0.35 s: the first divergence.** The placement's snap (§9) tips the body toward the face (+3.7°, +3.1 to
   +4.4, by 0.2 s), and the balance catches it the way its model knows: it commands the ankle's rest to −13.0°
   (−14.9 to −10.9) and rolls the board onto its uphill rail (+19°). That catch pushes the 2.54 kg board sideways out
   from under the body: the feet deliver **+12.6 N·s** (median; +10.6 to +14.3) to the board along its +x (toward the
   face) against the water's −9.7 N·s, and **the board's centre-of-mass acceleration is 109 % (105–114 %) of the
   capture point's 0.34 m escape** toward the trough in 0.20–0.35 s; the rider's own mass is 4 %. At 0.333 s
   (0.300–0.350) the ankle spring's explicit torque passes through zero — the balance stops holding the uphill rail —
   and the body's bank goes past −2° downhill **and never comes back**. The rail falls below +5° at 0.47 s
   (0.43–0.48), below 0 at 0.80 s (0.48–1.08).
2. **By 0.55 s** the board lies flush with the face (rail −0.9°; −4.4 to +1.6) and the body leans **−15.1° downhill
   (−15.8 to −14.2) with it** — the felt vertical of a board sliding freely down its face. The board turns down the
   face (heading 5° down by 0.85 s, 0.80–0.95).
3. **The spiral.** The body's lean is now coordinated with the turn (the capture point stays inside the feet for
   about another second), so the balance reads a 15° bank error and **catches it by rolling the board under it**:
   its ankle command's bank term (−1.01 per rad, model) outweighs its roll term (+0.61), and for board and body leaning
   together the net command is to roll the board further onto the downhill rail. Through the whole spiral **the water
   rights the board** — its mean roll moment from 1.0 s to 0.1 s before the fall is righting in 27 of 27 cells,
   −36.4 N·m (−47.2 to −26.4), and its yaw moment turns the board back toward the face — **so it is the body, through
   the ankle, that carries the board over**. The board descends the face (face fraction 0.51 → 0.05, base cell).
4. **At the trough** there is no face left to carry the carve; the board rolls over (roll at the last attached frame
   **−83°**, −90 to −51) with the body at the 70° bank stop, and the rider separates **across, toward the board's
   right rail — the downhill side, the inside of the turn — in 27 of 27** cells, at **2.53 s (2.05–3.55)**.

**This is not 3.5o's mechanism.** The speed through the water never falls below 4.47 m/s (before the last 0.2 s:
5.55–7.16, median 6.58), so the schedule never reads row '4', and **`?plantFloor=4.5` changes nothing: 27 of 27 cells
fall on the same frame** (the host printed back `plantFloor 4.5`). The lean asked is 0, so the rail designs never
enter (`schedRail` 0 throughout) and the reference is exactly zero on every tick: no phantom.

**It is the same identity 3.5d and 3.5o found, met on a face.** The ankle's correction of the body's lean is the
board's roll and slide ("a correction that acts as a drive", 3.5d Part 1). On flat water a catch that rolls the board
under the body is how this balance recovers. On a face the first catch throws the body downhill and the second gives
up the uphill rail, after which every catch tightens the turn down the face.

## 2. Reproduction and population

`scripts/test-wave-probe.ts ridegrid --mode ride` (bundled, `--seconds 6`), the 3×3×3 grid (x ±1 m, heading ±5°,
speed ±0.5 m/s), deterministic per cell, so the population is the grid:

| arm | n | fell | median (range), s | paired against the new rider |
|---|---|---|---|---|
| new rider, owner's address | 27 | 27 | **2.533 (2.050–3.550)** | — |
| old rider (`?canyonWaves=true`) | 27 | 3 | ≥ 6.000 (5.467–≥ 6.000; 24 censored at 6 s) | later 27 / sooner 0, median +3.467 |
| new rider + `&plantFloor=4.5` | 27 | 27 | 2.533 (2.050–3.550) | **same frame 27 / 27** |
| `straight-fall.ts`, `PROBE=off` (inertness) | 27 | 27 | 2.533 (2.050–3.550) | same frame 27 / 27 |

`straight-fall.ts` reproduces `ridegrid` cell for cell. Its wrappers only read: the `PROBE=off` arm installs none and
gives the same 27 fall times. On every one of 15 120 substeps read (27 cells, 0–0.6 s) the capture point's split
sums exactly (`splitOk`) and the rebuilt capture point equals the engine's `human.state` (`cpOk`), on both axes.

## 3. The axis and the first divergence (27 cells, median and range)

| event | new rider | old rider |
|---|---|---|
| peak uphill rail in the first 0.45 s (the placement's snap, §9) | +19.0° (+16.0 to +21.5) | — |
| peak left yaw (up the face) in the first 0.45 s | +70.8°/s (+66.3 to +83.3) | — |
| **ankle spring's explicit torque through zero** (stops holding the uphill rail) | **0.333 s (0.300–0.350)** | dips 0.117–0.217 s, recovers |
| **body bank past −2° downhill, for good** | **0.333 s (0.333–0.350)** | never |
| yaw rate past −10°/s (turning down) | 0.417 s (0.400–0.433) | — |
| rail below +5°, for good | 0.467 s (0.433–0.483) | after 4.7 s in 5 cells |
| rail below 0, for good | 0.800 s (0.483–1.083) | — |
| heading 5° down the face, for good | 0.850 s (0.800–0.950) | — |
| body bank at 0.55 s | −15.1° (−15.8 to −14.2) | about 0 |
| rail at 0.55 s | −0.9° (−4.4 to +1.6) | +10.1° (base cell) |
| torso at its +45° stop | 0.967 s (0.883–1.367) | — |
| capture point out of the feet toward −x, for good | 1.567 s (1.033–2.883) | — |
| rail past −10° (downhill), for good | 1.567 s (0.900–1.750) | — |
| fall | 2.533 s (2.050–3.550) | ≥ 6 s in 24 |
| at the last attached frame: roll / heading turned | −83° (−90 to −51) / −96° (−128 to −31) | — |
| axis of the separation | **across, toward −x (downhill rail), 27 / 27** | — |

## 4. At the solver step

### 4.1 The first divergence (0.20–0.35 s), 3.5o's split of the capture point across

`straight-fall.ts` uses `sharp-steer.ts`'s exact split (board +x is the board's left, here the face's uphill side).
Sums over the window, m of capture point, 27 cells:

| channel | 0.00–0.20 s | **0.20–0.35 s** | 0.35–0.55 s |
|---|---|---|---|
| **total** | −0.100 (−0.119 to −0.070) | **−0.337 (−0.368 to −0.292)** | +0.342 (+0.291 to +0.497) |
| **board's centre-of-mass acceleration** | −0.088 | **−0.369 (−0.392 to −0.324)** | +0.547 |
| deck rotation at the feet | +0.066 | +0.020 | −0.124 |
| deck axes turning | +0.008 | +0.007 | +0.003 |
| **rider's own mass** | −0.033 | **−0.012 (−0.014 to −0.011)** | −0.093 |
| felt vertical (position + velocity) | +0.121 | +0.080 | −0.010 |
| position | −0.176 | −0.075 | +0.073 |
| 1/ω | 0.000 | +0.012 | −0.062 |
| board's share of the total | 0.87 | **1.09 (1.05–1.14)** | 1.62 |

On the board's x over 0.20–0.35 s the feet delivered **+12.6 N·s (+10.6 to +14.3)** and the water −9.7 N·s (−11.3 to
−7.2); the board's peak acceleration along its x was 14.9 m/s² (13.9–16.9); every substep was feasible. In 0.35–0.55 s
the reversed catch brings the capture point back (+0.34 m) by rolling the board downhill: that is where the uphill rail
is given up.

### 4.2 The spiral (1.0 s to the fall)

Here the split is dominated by the turn itself: the rider's and the board's accelerations along the deck's x are large
and nearly cancel (base cell, 1.5–2.2 s: −0.963 and +0.926 m), and the capture point drifts out slowly (−0.21 m over
those 0.7 s). The question at this stage is not what throws the capture point but **what rolls the board over**, and
the board's own ledgers (`BoardBody.rollLedger`, `yawLedger`: read-only tools, the rider's entry is the residual)
answer it — see §6 for the old rider's same columns:

| base cell | 0.55 s | 1.0 s | 1.5 s | 2.0 s | 2.4 s |
|---|---|---|---|---|---|
| rail (roll − face tilt) | −0.8° | −5.3° | −8.3° | −35.3° | −68.6° |
| water's roll moment (+ lifts the uphill rail) | −2.4 | +5.0 | −11.2 | −45.5 | −108.4 |
| rider's roll moment (residual) | +2.0 | −5.4 | +11.4 | **+45.4** | **+108.9** |
| ankle spring's explicit torque (requested, pre-solve) | −2.6 | +6.5 | −14.1 | −43.5 | −19.0 |
| water's yaw moment (+ toward the face) | +15.7 | +12.8 | +49.2 | +16.8 | +273.6 |
| rider's yaw moment (residual) | −15.3 | +8.6 | −50.2 | −18.9 | −274.8 |

N·m. The ledger columns are delivered (the board's own `I·Δω` less every water source; the rider's entry is that
residual). From 1.5 s on the water rights the board and turns it back up the face, and the rider's coupling holds it on
the downhill rail and turns it down. The yaw residual includes the body's centripetal load at the feet, which stand 0.244 m behind
the board's centre of mass (`feetStation`), so a body leaning into the turn yaws the board further into it. The yaw
ledger is used here for its sign only (the peer's caution on 2026-11-20 about the yaw diagnostic's surface-normal term
applies to `yawLedger`'s pressure column too; `suction` reads 0 on this address).

**What the ledger can and cannot say.** The board is light (2.54 kg, about 1 kg·m² in roll with the water's share),
so its own `I·Δω` is small and the rider's residual is close to minus the water's on every frame, whichever way the
board is moving. The ledger's evidence is therefore the **sign of the water's moment**: over 1.0 s to 0.1 s before the
fall the water's mean roll moment is **righting in 27 of 27 cells, −36.4 N·m (−47.2 to −26.4)**, and its mean yaw
moment turns the board back toward the face, +47.6 N·m (+23.1 to +70.2). The hull's righting does not turn over on the
way down; **the board goes where the body takes it through the ankle**, and the body is leaning into the turn. (The old
rider's water moment has the opposite sign, toward the face, and its ankle holds the board level against it: §6.)

The capture point across over the same stretch (1.0 s to the fall, 41 711 substeps, every identity holding): total
−0.440 m (−0.8 to −0.2). The rider's and the board's centre-of-mass terms are the turn's own centripetal acceleration,
common to both (−1.710 and +1.591); their difference is −0.188 (−0.519 to +0.047); the deck's rotation at the feet
−0.107, the deck's axes turning −0.173, the felt vertical −0.086, position −0.067, 1/ω +0.192. **No single channel
carries the late escape**, unlike the first divergence (§4.1).

## 5. The controller along the trajectory (27 cells)

- **Speed through the water against 4.5 m/s:** never below it before the last 0.2 s (5.55–7.16 m/s, median 6.58). The
  gain schedule sits between rows 6 and 9.5; row '4' and the 4.3 m/s singularity never enter.
- **The reference:** `|x_ref|` and `|u_ref|` are exactly 0 on every tick of every cell (lean asked 0, so the `'tan'`
  branch is skipped and `steadyTurn` has a zero right-hand side). **The rail-design blend:** `schedRail` is 0 on every
  tick; the designs at 10–40° of rail never enter.
- **The gains:** the ankle row at 1.0 s and 2.0 s (base cell) is φ −0.608 / −0.629, θ +1.013 / +0.890, r −0.098,
  β +0.402, δ +0.367. The command's terms at 1.0 s: φ +10.3° (+8.1 to +13.7), θ −14.7° (−16.9 to −10.5), r +3.2°,
  torso angle −3.8°, torso rate −5.1°, ankle rest +2.2°; at 2.0 s: φ +22.1° (+15.9 to +40.0), θ −32.2° (−59.5 to
  −24.3), r +9.5°. Model signs; the rider's are the negative. The bank term outweighs the roll term at every sampled
  instant, so a board and body leaning together are answered by rolling the board further the same way.
- **The ankle commands and their overflows:** the raw command passes the ±14.3° range on 0 frames (0–6) before the
  last 0.2 s; the first overflow comes 0.11 s (0.00–2.70) before the fall, and 5 cells have none. **The ankle spring's
  explicit torque is −41 N·m (−50 to +51) at 2.0 s** (requested, pre-solve), the downhill-rail holding torque whose
  delivered value is the roll ledger's rider entry in §4.2.
- **The hip:** its largest torque before the last 0.2 s is 12 N·m (0.6–74). It is not part of the path.
- **The torso:** the torso command is dominated by the same bank term (−360 to −440 N·m per rad of bank); the upper
  body reaches its +45° stop at 0.97 s (0.88–1.37), after the first divergence and the body's lean, and its command
  reaches the 100 N·m bound around 1.9–2.1 s (base cell). **Downstream, as Lead C found.** The estimated bias on the
  ankle command sits at −3.3° (−3.7 to −3.1) at 1.0 s: the filter has learned an offset of the right size for the
  face's roll moment, and the gains still steer into the lean.
- **Lead C's signature** — a raw-target jump with the stick centred — does not appear before the roll-over here.

## 6. The old rider at the same instants (base cell)

| t (s) | rider | roll | rail | bank | yaw °/s | slip | ankle spring N·m (requested) | water roll N·m | rider roll N·m | face frac |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.12 | new | −4.1 | +7.6 | +2.0 | −22.2 | −5.8 | +40.8 | +35.9 | −36.1 | 0.42 |
| | old | −0.4 | +11.3 | +1.4 | +2.3 | −3.5 | +24.9 | +50.1 | −50.2 | 0.42 |
| 0.55 | new | −14.5 | −0.8 | −15.1 | −68.1 | −9.2 | −2.6 | −2.4 | +2.0 | 0.50 |
| | old | −3.1 | +10.1 | −0.3 | −13.6 | −6.9 | +55.7 | +55.7 | −56.4 | 0.46 |
| 1.00 | new | −17.7 | −5.3 | −14.9 | +10.0 | −4.0 | +6.5 | +5.0 | −5.4 | 0.46 |
| | old | −2.8 | +11.4 | −0.8 | −9.5 | −6.9 | +32.5 | +35.3 | −35.2 | 0.51 |
| 2.00 | new | −39.6 | −35.3 | −39.6 | −46.4 | −1.0 | −43.5 | −45.5 | +45.4 | 0.17 |
| | old | −0.5 | +14.7 | +1.7 | −4.3 | −8.3 | +36.2 | +41.4 | −41.2 | 0.57 |

Over the grid (0.5 s to the end, 27 cells) the old rider's water roll moment is +32.0 N·m (+3.8 to +43.5) toward the
face and its body's bank stays within −2.3 to +3.0°. The old rider's own ankle law sets its rest to −11.4° on the first
frame and rolls the board level within 0.1 s; its
body is carried plumb (`uprightVelocity`), so the board's carve up the face cannot throw it. It holds the uphill rail
with a steady ankle torque against the water's moment toward the face, slips 3–8° down the face (the hull's uphill
force), and drifts slowly down the line (heading 54 → 37° over 6 s, face fraction 0.42 → 0.16).

## 7. `?plantFloor=4.5`

Built and verified: the host printed back `predictor.weights.plantFloor = 4.5` (config `plantFloor: '4.5'`) in every
cell. 27 of 27 cells fall on the same frame (§2). The floor is inert here because the speed never reaches it.

## 8. The organic neutral rides (3.5o's drive, the owner's address)

3.5o's 9-seed population (`results/35o/population-summaries.jsonl.gz`) has 59 neutral riders who stood: 48 fall at
0.18–1.73 s (mostly the slow take-offs, Group A), 8 are censored (floors ≥ 1.33 to ≥ 5.00 s), and **three fall between
2.3 and 4.8 s**:
seed 2 wave 6 (2.300), seed 2 wave 1 (3.900), seed 8 wave 5 (4.800). I re-ran seeds 2 and 8 (`PERIODS` 7 and 6,
`SCRIPTS=cue`) and reproduced all seven of their neutral outcomes exactly (2.1 3.900, 2.2 ≥ 5, 2.5 0.950, 2.6 2.300,
8.1 1.183, 8.2 1.650, 8.5 4.800). **None of the three is this mechanism.** These riders pop up heading down the fall
line (heading within −3° and +9° of it until their last second), so the face is barely tilted across the board and
there is no trim across it to hold:

- **seed 2 wave 6, 2.300 s:** straight down the face, roll and bank within ±1.7°, capture point across within
  ±0.05 m to the last row, at the bottom of the face (fraction 0.08). Not an across fall.
- **seed 2 wave 1, 3.900 s:** down the face to the bottom (fraction 0.20 at 1.8 s), then the speed through the water
  falls 7.8 → 1.1 m/s, the board comes off the plane at 3.6 s and rolls to +58° with the body at +41°.
- **seed 8 wave 5, 4.800 s:** straight to the bottom (fraction 0.04 at 2.75 s), the speed through the water goes to
  0.2 and then negative, off the plane, and the board rolls to +82° at 4.5–4.8 s.

A switch built for the face trim would not be expected to move these, and 3.5o found `plantFloor` does not either.

## 9. Diagnostic arms (base cell unless a population is given; they change the ride and are never a fix)

| arm (prototype wrapper in `straight-fall.ts`) | fall |
|---|---|
| shipped | 2.500 s |
| `WARM=1`: the balance starts from the posture it is placed in (the ankle's rest at the mounted 12.4°, the predictor's estimate and its sent commands holding it) | 4.567 s; **grid: 27 of 27 fall, 4.567 s (2.667–5.750), later in 27 / 27 (+1.867, +0.300 to +3.250)** |
| `PLACE_LEVEL=1`: board turned level across after the placement, the rider mounted plumb on it (the old rider's own trim, no ankle preload) | 4.167 s; **grid: 27 of 27 fall, 4.167 s (2.667–5.817), later in 27 / 27 (+1.617, +0.367 to +3.067)** |
| `SCHED_RAIL=actual`: the schedule read at the board's own rail | 1.183 s |
| `SCHED_RAIL=face`: the schedule read at the rail a level board holds on this face | 1.500 s (1.933 s with `PLACE_LEVEL`) |
| `GAIN_SCALE` bank gain ×0.6 / roll gain ×1.66 | 1.300 / 1.317 s (1.900 s with `PLACE_LEVEL`) |
| a held stick: +0.1 / +0.2 / +0.35 (into the face), −0.1 | 1.783 / 0.583 / 0.567 / 2.000 s |
| the same tilt on a still plane (`straight-plane.ts`, 14.6° falling toward +z, heading 49/54/59° × 7.2/7.7/8.2 m/s) | 7 of 9 ≥ 6 s; 2 fall (2.033, 2.833 s, both at 7.2 m/s) |

Read them together:

- **The placement is part of it, and only part.** The plumb posture puts a plumb body on a deck rolled 11–13° across
  the heading, so the ankle starts 12° off its rest of 0 (117 N·m on the first frame) while the predictor's first
  command waits for its 0.1 s line. Starting the balance from the posture it is in removes most of the snap (peak
  uphill rail 11.8° against 19.0°, peak yaw up the face 20.6°/s against 70.8°/s, body at −8.3° at 0.55 s against
  −15.1°; medians over 27) and moves the grid's median fall from 2.53 to 4.57 s; starting the board level moves it
  to 4.17 s. **Neither saves him: 27 of 27 still fall in both**, after the same drift down the face (axis across in
  27 of 27), at or after the trough. The organic stands measured here (§8) head down the fall line, where the deck is
  barely tilted across, so the snap belongs to the placed start; an organic stand made while angled across a steep face
  would start the balance just as cold, and that was not measured.
- **Reading the existing rail designs does not help**, at the board's own rail or at the face's, and rebalancing the
  two gains is worse. The design is coherent as a set.
- **On a still plane** the same rider makes the same turn down the slope and then, with no trough to meet, mostly
  survives by gliding down the fall line. The plane is the face without its bottom.

## 10. What the evidence points to, and what I did not do

No switch is delivered. **Nothing I could build within the rules moved the fall to a ride he can feel**: the arms that
delay it only remove the test wave's placement snap; the arms aimed at the controller make it worse.

The defect the evidence names is the one 3.3p named by reading: **every water derivative the internal model uses was
measured per radian of heel against a flat free surface, and the model is fed the board's roll from the world's level;
on a face the two differ by the face's tilt.** That is why this balance expects the water to level a board the face
actually holds flush, and why it has no straight trim there. The repair in the record is `?waterHeel`, which is on the
work order's dead-end list (§5), so **I did not run it**: one attempt to run it as a labelled diagnostic on the base
cell was refused by this session's permission classifier before it started, and I did not try again. Two things the
coordinator may want to weigh, since only the coordinator and the owner can reopen a closed thread:

- it was closed on the owner's low-speed cell (18 of 18 fell in every arm, 1.033 s off), and 3.5o has since shown that
  cell's water sits under 4.5 m/s, on row '4';
- its own record says *"the 2.5–2.8× gain is on the glide, which is not his water"* — and the glide across a face is
  now exactly his water: this is the test wave he asked for.

With no switch, the brief's composition checks — 3.5o's sharp-steer collapses with `plantFloor=4.5`, the organic
neutrals off against on, and the wave-2 survivor's turn — have nothing to compare; the organic neutrals are §8, and
`plantFloor=4.5` is inert on this ride (§7).

## 11. What this does not establish

- **Feel.** A bot ride is not evidence of feel; the owner rides and judges.
- **The organic face-trim case.** No organic run here rides across the face with the stick centred: 3.5o's drive
  always pops up toward the beach. The mechanism predicts the same spiral whenever he angles across and lets go, but
  that is a prediction, not a measurement.
- **The first trigger without any placement.** Both placement-free arms still begin with the board's uphill rail
  carving it up the face and the balance's catch giving the rail up; I did not measure a start that is already in a
  steady trim, because this balance has none on this face.
- **The torso's share.** The upper body is on its stop for most of the spiral; that thread is closed and I did not
  reopen it.

## 12. The numbers on this branch

`results/35p/`: `grid-fall-times.txt` (every cell of every grid arm, paired), `classify-new.txt` (the per-cell
classification, the first-departure times and the controller's grid statistics, shipped, `WARM` and `PLACE_LEVEL`),
`solver-step.txt` (the capture point's split on both axes, 0–0.55 s, and the spiral's ledgers and split, new and old),
`diagnostics.txt` (every diagnostic arm, the still plane and the organic runs, each with its control row as built),
and the frame traces: `grid-new-frames.jsonl.gz`, `grid-old-frames.jsonl.gz`, `base-{new,old}-ledgers.jsonl.gz`,
`base-new-substeps.jsonl.gz` (the base cell, every substep 0–2.6 s).

## 13. Reproduce

    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/straight-fall.ts -o <s>/sf.mjs --format esm --platform node
    env GRID=1 OUT=<s>/g-new.jsonl node --max-old-space-size=3200 <s>/sf.mjs           # the 27-cell grid, frames
    env GRID=1 RIDER=old OUT=<s>/g-old.jsonl node --max-old-space-size=3200 <s>/sf.mjs
    env GRID=1 EXTRA='&plantFloor=4.5' OUT=<s>/g-floor.jsonl node --max-old-space-size=3200 <s>/sf.mjs
    env GRID=1 PROBE=off FRAMES=0 OUT=<s>/g-off.jsonl node --max-old-space-size=3200 <s>/sf.mjs
    env GRID=1 SUB_FROM=0 SUB_TO=0.6 FRAMES=0 SECONDS=0.7 OUT=<s>/g-early.jsonl node --max-old-space-size=3200 <s>/sf.mjs
    env LEDGER=1 SECONDS=3 OUT=<s>/led.jsonl node --max-old-space-size=3200 <s>/sf.mjs   # the base cell's ledgers
    env WARM=1 | PLACE_LEVEL=1 | SCHED_RAIL=actual|face | GAIN_SCALE=2:0.6 | STEER=0.2 ...  # the diagnostic arms
    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/straight-plane.ts -o <s>/sp.mjs --format esm --platform node
    env RIDER=new ACROSS=1 HEADINGS=49,54,59 SPEEDS=7.2,7.7,8.2 OUT=<s>/plane.jsonl node <s>/sp.mjs
