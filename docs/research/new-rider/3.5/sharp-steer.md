# 3.5o — The sharp steer's sideways collapse, at the solver step

Branch `claude/sharp-steer-collapse`, cut from `claude/ride-everything` at `1710444c`. Written 2026-11-20 by the
surfer-track builder (Claude, Opus 5.5) for the coordinator's review. **Nothing under `src/` changed.** The probes are
`3.5/sharp-steer.ts` (the ride, per substep), `3.5/sharp-steer-ref.ts` (the controller's reference off the model) and
`3.5/sharp-steer-split.ts` (the frozen-state split), all on this branch.

## 1. The answer

**The balance's own internal model causes the fall, at the bottom of its speed table.** The steer only asks it a
question it answers wrongly. On Canyon seed 2 wave 1 the board's speed through the water falls through 4.5 m/s between
+0.55 and +0.60 s. That is the moment the steer's lean ask reaches its cap of about 21°. Below 4.5 m/s the gain
schedule (`PredictiveController.blend`) blends in the plant table's lowest row, `PLANT_SPEEDS['4']`. Step 3.4m recorded that row as a board at 46.4° of trim that is
not planing; the game's own board at those speeds rides at 16–17°. On that blend the **reference** goes wrong. The
reference is the steady turn the controller solves for the lean asked (`tick` → `steadyTurn`). At a 21° lean it is
singular near 4.3 m/s (450° of sideslip) and asks for **35° of sideslip** below it. The 4.5 m/s design asks for 5°. The
gains change with it: the gain on sideslip rises 0.217 → 2.43 and the gain on bank 2.1 → 7.1.

The first large correction follows from that. The command's sideslip term outweighs its bank term, so the correction
points **outward**. The first ankle-command overflow comes at +0.569 s on the left turn (−18.9°) and +0.602 s on the
right (+22.2°), against a ±14.3° range. The hip rotor takes the overflow and reaches 183 N·m. Ankle and hip together
push the 2.54 kg board **inward**, 80–117 N along its own x. The board slides sideways at 20–31 m/s² at frame ends,
with a substep peak of 34.6. The rider's own mass barely moves (±0.3 m/s²). The capture point runs out from under him
at the board's speed.

**This answers Codex's question.** The first large correction does **not** move the rider into the bank. It pushes the
board sideways beneath him, and the next corrections grow from −18.9° to −56° and +22° to +79°.

Wave 2 receives the identical command at 6 m/s, where the reference asks for 2–4° of sideslip. The command never
overflows (peak 10.6°), the hip never fires and the water holds the board. The neutral wave-1 rider also drops below
4.5 m/s, but he asks for no lean, so his reference stays at zero. **This also explains the owner's "not that sharply":
below 4.5 m/s the phantom sideslip grows with the lean asked.** At 4.0 m/s it is 3° for a 5° lean, 16° for 10°, 24°
for 15° and 35° for 21°.

## 2. The matched sample, reproduced

`sharp-steer.ts` copies `take-off/four-numbers.ts`'s MODE=takeoff drive (`claude/the-record`) verbatim. **The starts
are organic.** Riders are placed prone and at rest at the game's lineup, paddle in, pop at the game's own cue and
stand. `mount`'s placed-standing `banked` branch (`AttachedRider.ts:3037`) is never taken, and the body starts 0.068° /
0.049° off plumb on waves 1 / 2. The seed-2 controls' launch commands say `MODE=takeoff` too.

**Reproduction:** 813 of the 815 matched steer-only rows in `seed2-controls.jsonl.gz` match with **zero difference** in
roll, bank, course, speed through the water, `wantX`, capture point, capture position, lean asked and held ankle
command. The other two are the fallers' separation frames, which this probe does not emit. All substeps pass three
identity checks: the relative velocity's four-way split, the rebuilt capture point against the engine's
`human.state.across`, and the capture-point split's sum (`relOk`, `cpOk`, `splitOk`). The probe is also inert: a
`PROBE=off` run, with no wrapper installed, gives the same six fall times.

**Un-censored fall times** (seconds after standing, `STAND_HOLD=5`). Wave 1: neutral **3.900**, left 0.700, right
0.717. Wave 2: neutral ≥ 5.000 (censored), left 3.700, right 3.133. **The neutral arm's "≥ 3.017" was censoring; it falls
at 3.900 on this sea.** The wave-2 survivors fall 1.9–2.5 s after the turn ends. That is a later, separate event.

## 3. The three arms at the solver step (seed 2; each frame's last substep; the command is the tick's)

Rider signs: + is the board's left (+x).

- **"Command"** is **requested**: the controller's raw ankle command before the ±14.3° clamp. The hip takes the excess.
- **"Ankle"** is the spring/damper's explicit torque plus the solve's implicit part, **post-solve**.
- **"Hip"** is the rotor's torque as the coupled solve applies it.
- **"Feet → board x"** is **delivered**: the contact reaction the board actually received along its own x, N. On a
  substep the feet cannot carry (`feasible = 0`) that is the clamped, projected contact. In that case the ankle's and
  the hip's own couples do not reach the board.

| t (s) | arm | v through (m/s) | lean asked | command (requested) | hip N·m | ankle N·m (post-solve) | feet → board x (delivered) | board aₓ (m/s²) | rider aₓ | capture pt (m) | β_ref |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.567 | w1 neutral | 4.39 | 0 | −0.3° | 0 | −2.3 | 5 | −2.2 | −0.07 | −0.018 | 0° |
| | **w1 left** | 4.39 | 21.2° | −3.1° | 0 | 11.7 | 7 | 3.2 | 0.40 | 0.122 | 4.6° |
| | w2 left | 5.98 | 21.4° | −0.3° | 0 | 16.5 | 6 | −0.9 | 0.55 | 0.151 | 2.4° |
| 0.583 | w1 neutral | 4.18 | 0 | 0.5° | 0 | −2.8 | 4 | −2.3 | −0.06 | −0.009 | 0° |
| | **w1 left** | 4.19 | 21.4° | **−18.9°** | 14.6 | 23.0 | **42** | **12.3** | 0.06 | 0.081 | **126.5°** |
| | w2 left | 5.98 | 22.7° | −0.4° | 0 | 15.7 | 6 | −1.1 | 0.65 | 0.163 | 2.6° |
| 0.600 | **w1 left** | 4.02 | 21.1° | **−33.8°** | **54** | 12.3 | **80** | **20.0** | −0.30 | −0.003 | **35.8°** |
| | w2 left | 5.98 | 24.1° | −0.6° | 0 | 15.4 | 6 | −0.7 | 0.73 | 0.174 | 2.7° |
| 0.617 | **w1 left** | 3.96 | 20.6° | −53.3° | **121** | −46.2 | **92** | **20.2** | −0.22 | −0.107 | 34.9° |
| | w1 right | 3.80 | −20.2° | **+22.2°** | −21 | −25.3 | −37 | −18.8 | 0.13 | −0.129 | −34.5° |
| 0.650 | **w1 left** | 3.86 | 19.8° | −55.8° | **176** | −111.6 | **114** | **26.7** | 0.07 | −0.375 | 33.2° |
| | w1 right | 3.75 | −18.8° | +47.0° | −112 | 50.8 | −70 | −23.6 | 0.08 | 0.095 | −31.7° |
| | w2 left | 6.06 | 28.1° | −1.4° | 0 | 25.1 | 20 | 1.1 | 0.85 | 0.198 | 3.3° |

On the left turn the support is first exceeded on the substep at +0.597 s (`feasible = 0`, `tip`). The capture point
goes beyond reach at +0.667 s and the rider separates at +0.700 s. The right turn mirrors this. Wave 2 left stays
feasible throughout. Wave 2 right exceeds the support on 12 substeps between +0.732 and +0.748 s and survives the turn.

## 4. The decomposition the peer asked for

The capture point across is `px + vx/ω` (`humanBalance.capture`, board +x). Its change over each substep splits exactly
by channel. The table sums those per-substep changes over the collapse: from +0.551 s to +0.686 s (wave 1 left, its
last attached substep) or to +0.700 s (the other three).

| channel (m of capture point) | w1 left | w1 right | w2 left | w1 neutral |
|---|---|---|---|---|
| **total** | **−0.864** | **+0.733** | +0.078 | +0.067 |
| board's centre-of-mass acceleration on its own x | **−0.835** | **+0.764** | −0.024 | +0.050 |
| deck's rotational velocity at the feet | +0.220 | −0.218 | +0.019 | −0.006 |
| deck's axes turning under the relative velocity | −0.079 | +0.054 | −0.007 | +0.005 |
| **rider's own mass acceleration** | **+0.002** | **−0.003** | +0.037 | −0.002 |
| **felt-vertical projection** (position + velocity) | +0.043 | −0.016 | +0.022 | −0.006 |
| offset (accumulated relative velocity) | −0.185 | +0.156 | −0.001 | +0.021 |
| 1/ω change | −0.030 | −0.003 | +0.032 | +0.004 |

**The board's lateral acceleration is the whole escape, at 97% / 104%.** The rider's mass motion is nil. The
felt-vertical projection is small and pushes the other way. Over the same window the feet push the board along its x
with +10.7 N·s, against the water's −4.4 N·s (wave 2: +2.3 against −2.5).

## 5. Why the controller makes that correction

**Off the model** (`sharp-steer-ref.ts`, the owner's weights, 21° lean, standing depth 0):

| v through (m/s) | 4.0 | 4.1 | 4.2 | 4.3 | 4.4 | 4.5 | 5.0 | 6.0 |
|---|---|---|---|---|---|---|---|---|
| β_ref, shipped | 34.8° | 35.4° | 43.5° | **449.9°** | −5.7° | 5.2° | 4.7° | 2.5° |
| β_ref, `plantFloor 4.5` | 4.9° | 5.0° | 5.1° | 5.1° | 5.2° | 5.2° | 4.7° | 2.5° |
| gain on sideslip / on bank, shipped | 2.43 / 7.08 | 1.99 / 6.09 | 1.54 / 5.09 | 1.10 / 4.10 | 0.66 / 3.10 | 0.22 / 2.11 | −0.08 / 1.87 | −0.04 / 1.81 |

**Live, in a running session**, the controller the host built for the owner's address reads the same values: 34.78° at
4.0 m/s, 449.86° at 4.3 and 5.22° at 4.5. With `&plantFloor=4.5` it reads 4.92°, 5.12° and 5.22° (§7).

**The frozen-state split** (`sharp-steer-split.ts`) recomputes the command at the shipped ride's own predicted state,
one factor at a time. It reproduces the logged command to within 0.16° through +0.65 s. On the left turn at +0.585,
+0.602 and +0.619 s:

- the shipped design gives **33.8°, 53.3° and 56.3°**;
- the shipped gains with the floor's reference give −25.5°, −24.2° and −19.1°, the **opposite sign**: into the bank;
- the floor's gains with the shipped reference give 5.8°, 15.2° and 14.2°;
- the floor's whole design gives **4.0°, 3.9° and 3.1°**, inside the range.

The values are in the model's sign; the rider sign is the negative. **The phantom reference sets the direction and the
high gains set the size.** Seed 3 wave 12 shows the same pattern on both turns. β_ref flips to −117° / −204° at
4.28 / 4.32 m/s, then sits at 34–39° (right) and 33–63° (left). The shipped command runs to −222° / +235°, while the
floor's design at the same states stays within −32° / +52°.

**This was flagged once and never worked.** 3.3 Part 37 §6 item 4 (`3.3/README.md:6680` on `claude/ride-everything`)
saw `steadyTurn`'s `ref.u[0]` reach 2 675° in 1 of 18 placed steered runs. It named the cause, normal equations solved
through a pivot guard on a blended model, and set it aside because "the clamp contains it". **The clamp does not.** The
overflow goes to the hip. Below about 4.25 m/s the error is also not a spike: it is a sustained 33–36° sideslip in the
reference.

## 6. Diagnostic arms (seed 2, waves 1–2; diagnostics, not fixes)

| arm | w1 left | w1 right | w1 neutral | w2 left | w2 right |
|---|---|---|---|---|---|
| shipped | 0.700 | 0.717 | 3.900 | 3.700 | 3.133 |
| `HIP_OFF` (the hip gets no demand) | **0.717** | **0.750** | 3.883 | 3.833 | 2.833 |
| `SCHED_FLOOR=4.5` (schedule read at ≥ 4.5 m/s) | 3.983 | 3.850 | 3.667 | 3.817 | 4.167 |
| `plantFloor=4.5` (the existing switch) | 3.983 | 3.717 | 3.683 | 3.683 | 4.033 |

**With the hip silenced he still falls,** because the ankle alone pushes the board sideways (peak 24.7 m/s²). The hip
carries the correction; it does not cause it. That is consistent with the closed "hip allocation" lead. Holding the
schedule at or above 4.5 m/s rescues both turns, so the trigger is the bottom of the table.

## 7. The switch: `?plantFloor=4.5`, already built (step 3.4m)

`plantFloor=4.5` makes the internal model read the 4.5 m/s row below 4.5 m/s, the row that matches the board's
measured trim. It changes the plant the design, filter and reference are built on, and nothing else. It does not cap
the ask, slow the stick or limit the rate, and it adds no force. It is opt-in, off by default and pinned off online
(`main.ts` online overrides: `plantFloor: undefined`).

⚠️ **Step 3.4m refuted it on a different question:** the sign of the model's side force, and falls that were all
measured on **placed standing starts** (`3.3/plant.ts` places `phase: 'standing'` at an entry speed). Per the
coordinator's 2026-11-20 note, those starts measure recovery from the mount's tilt. **It was never measured on organic
take-offs or on a sharp steer.** This round measures exactly that.

**Verified in a running session** on the dev server at 5175, serving this worktree, with the owner's address plus
`&plantFloor=4.5`:

- **In-page host** (`&inpage`): the live `AttachedRider` read back `predictor.weights.plantFloor = 4.5`,
  `riderBody = 'two'`, `deckFelt = true`, `deepens = true` and `stanceReach = 'keep'`, with the reference values above.
  The shipped address read `plantFloor: null` and the shipped values.
- **Worker host** (the default): the `start` message the page posted to the worker carried `plantFloor: '4.5'`, with
  `canyonBed: 'b'`, `rider: 'new'`, `feltFrame: 'deck'`, `riderBody: 'two'`, `stanceReach: 'keep'` and `deepen: 'on'`.

## 8. Off against on, matched, on the owner's address

The setup is the same take-off drive: Canyon B, `PERIODS=12`, scripts neutral / left / right, `STAND_HOLD=5`. Every
rider in the `plantFloor` arm rides the same sea and the same stand as its shipped twin. The waves are identical,
because riders never push the water.

**The classification rule**, said plainly about its timing: I wrote it after I had seen seeds 1–3 in both arms, and fixed
it before seeds 4–9 ran. Seeds 4–9 hold out-of-sample checks: they add 5 collapses (seed 4 wave 6 L, seed 8 waves 2 and
5 L/R), and the floor makes all 5 later, by median +1.100 s (+0.467 to +3.383). A steered rider is a
**sharp-steer collapse** when, on the shipped arm:

1. it falls during the held steer or within 0.3 s of its release (0.3 < fall ≤ 1.5 s);
2. the same wave's neutral rider outlives it by at least 0.5 s (a censored neutral counts at its floor);
3. the board is still planing on its last attached frame (the engine's own latch).

Every other rider sits in its own bucket and is never pooled. Fall times are in seconds after standing. A median
counts a censored ride at its floor.

**Steer only** (`TURN_COMPRESS=0`; seeds 1–9, 12 periods each):

| bucket (steer only) | n | shipped: fell, median (range) | `plantFloor 4.5`: fell, median (range) | paired floor − shipped: later / sooner / same, median (range) |
|---|---|---|---|---|
| **sharp-steer collapse** | **10** | 10 of 10, **0.717** (0.467–0.983) | 10 of 10, **3.067** (1.050–4.333) | **10 / 0 / 0, +2.083 (+0.467 to +3.383)** |
| turn window, neutral outlives, off the plane | 1 | 0.783 | 1.217 | later, +0.433 |
| turn window, neutral falls too (slow take-offs) | 83 | 83 of 83, 0.867 (0.467–1.333) | 83 of 83, 0.933 (0.533–2.217) | 42 / 32 / 9, +0.017 (−0.617 to +1.300) |
| outside the turn window (before +0.3 s or after +1.5 s) | 21 | 21 of 21, 2.700 (0.183–4.383) | 20 of 21 (1 censored), 2.883 (0.183–≥5.000) | 9 / 8 / 4, +0.000 (−0.800 to +2.200) |
| censored on shipped (late stands) | 3 | 0 of 3, ≥1.333–≥3.983 | 1 of 3 | 0 / 1 / 2 |
| neutral (no input) | 59 | 51 of 59 (8 censored), 1.050 (0.183–≥5.000) | 51 of 59 (8 censored), 1.167 (0.183–≥5.000) | 20 / 21 / 18, +0.000 (−0.617 to +0.750) |

**The 10 collapses** are seed 2 wave 1 L/R, seed 3 wave 9 R, seed 3 wave 12 L/R, seed 4 wave 6 L, seed 8 wave 2 L/R and
seed 8 wave 5 L/R. In 7 of the 10, the first sustained overflow (3 ticks running) comes at 3.85–4.39 m/s with 21–24°
of lean asked, and the reference asks for 68–203° of sideslip around it. That is the phantom of §5. Two others (seed 3
wave 9 R, seed 4 wave 6 L) overflow at 3.2–3.8 m/s before the lean has built. That is the same table row's gains with
no phantom. One (seed 3 wave 12 R) first overflows at 5.1 m/s, and the phantom follows once it slows.

**The rule's margin moves n but not the result:** at 0.3 s, 15 of 15 later (median +1.100 s); at 0.8 s, 8 of 8 later
(median +2.642 s).

**Steer + Compress** (`TURN_COMPRESS=1`, the owner's habit; seeds 1–3):

| bucket (steer + Compress) | n | shipped: fell, median (range) | `plantFloor 4.5`: fell, median (range) | paired floor − shipped: later / sooner / same, median (range) |
|---|---|---|---|---|
| **sharp-steer collapse** | **6** | 6 of 6, **0.842** (0.450–1.183) | 6 of 6, **1.700** (1.317–2.267) | **6 / 0 / 0, +0.933 (+0.317 to +1.817)** |
| turn window, neutral falls too | 24 | 24 of 24, 0.867 (0.533–1.250) | 24 of 24, 0.833 (0.550–1.800) | 12 / 12 / 0, −0.008 (−0.617 to +1.067) |
| outside the turn window | 8 | 8 of 8, 3.075 (1.650–4.783) | 8 of 8, 3.200 (1.450–4.267) | 3 / 5 / 0, −0.158 (−0.750 to +1.000) |
| neutral (no input) | 20 | 16 of 20 (4 censored), 1.108 (0.550–≥5.000) | 16 of 20 (4 censored), 1.342 (0.550–≥5.000) | 6 / 6 / 8, +0.000 (−0.383 to +0.750) |

The 6 collapses are seed 2 wave 1 L/R, seed 2 wave 6 L/R and seed 3 wave 9 L/R. Two riders were censored on both arms,
standing late in the trial's clock. The neutral script gets neither steer nor Compress, so its rows repeat the
steer-only neutrals of seeds 1–3.

Read the tables separately:

- **The sharp-steer collapse** is the owner's Group B. Every one falls later, and 8 of 10 outlast the turn window
  (+1.5 s). The other two gain 0.47–1.03 s and still fall inside it: the two slow ones, seed 3 wave 9 R and seed 4
  wave 6 L, at about 2.5 m/s. The turn still happens. On wave 1 with the floor, the left turn banks to 15.5° and its
  heading turns +22.5° between +0.6 and +1.5 s. The right turn
  banks to −14.8° and turns −22.4° by +1.6 s. The lean ask law is untouched; the cap still binds at the same speeds.
- **The slow take-off falls** ("neutral falls too", mostly off the plane under 3 m/s) are Group A and lead B. The floor
  moves them both ways (42 later, 32 sooner, median +0.017 s) and is not their fix. Neither does it help or harm the
  neutral riders: 20 later, 21 sooner, median 0.000 s.
- **With Compress held** the floor removes the 0.7 s collapse, 6 of 6 later. He still falls 1.3–2.3 s after standing,
  around and after the Compress release. At seed 2 wave 1 right (fall at +1.317 s) the floor's reference is sane (β_ref
  −2 to −8°). The command still swings −42° → +79° within 0.17 s, driven by the bank and bank-rate terms. 2 of the 6
  falls show no lateral escape, with capture point and CoM inside ±0.13 m on their last attached frame. **That is lead B's window,
  not this one.**
- **Over every standing controller tick** (steer only, seeds 1–9, standing, 0.25–1.3 s), take the ticks below 4.5 m/s
  with a lean of 10° or more. The shipped reference asks for more than 15° of sideslip on 411 of 440 (93%). The floor's
  asks for it on 0 of 525. The command overflows the ankle range on 378 of 440 shipped (86%) and 142 of 525 floored
  (27%). At 4.5 m/s and above the two arms match: phantom 0–0.3%, overflow 4–10%. Below 4.5 m/s with less than 10° of lean,
  the shipped command still overflows on 67% of ticks against 29% floored. That is the bottom row's gains. It is part of the
  slow take-off and is not fixed by the floor.

**The wave-2 survivor's turn** is seed 2 wave 2 left, steer alone. The shipped arm reproduces the peer's row table
exactly: 42.83° peak bank at +1.367 s; 0.50 m at +2.067 s with 4.24 m/s and 48.6° of course; 0.90 m at +2.783 s with
3.31 m/s and 46.4°. **With the floor the turn is identical**: the same 42.83° at +1.367 s and every frame the same
through +1.95 s. At 0.50 m it carries 4.26 m/s and 49.9°. **At 0.90 m it carries 3.03 m/s and 40.8° against 3.31 and
46.4°.** The climb is where the speed falls back under 4.5 m/s, and the two controllers differ there. So the peer's
acceptance point at 0.90 m is met on the turn and missed by 0.28 m/s and 5.5° on the climb.

## 9. What this does not establish

- **Feel.** The owner rides and judges it, at his address plus one flag:
  `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&plantFloor=4.5`.
- **Where the rescued riders end.** On seed 2 wave 1 they now fall at 3.7–4.0 s, after the board has slowed to
  0.4–1.2 m/s through the water and come off the plane. That is a later, slow event.
- **The slow take-off falls (lead A/B, Group A)** are a separate fault. In those waves the neutral rider falls too,
  mostly off the plane below 3 m/s, and `plantFloor` moves them both ways. It is not their fix.
- **A second singular corner** of the reference exists at small leans near 4.5–5 m/s, where the schedule interpolates
  between its rail designs. On seed 3 wave 12 at +0.319 s, at 4.9 m/s and a 2.8° lean, the reference asked ±20° and
  the command spiked for one tick in **both** arms. `plantFloor` does not touch it. It is an open lead.
- **The later falls at 2.5–4 s**, after the turn, in every arm including neutral, are another event. Their axis was not
  classified.
- **The weak lateral hold of the board** at about 4 m/s (water −13 to −51 N against the feet's 42–117 N) is part of the
  path. It was not changed and was not shown to be wrong.
- **The size of the evidence.** There are 10 collapses on the strict rule over 9 seeds (steer only) and 6 over 3 seeds
  with Compress. Most waves in this drive give slow take-offs, not carves.
- **Why row 4.5 is the right plant at 4 m/s** rests on step 3.4m's reading of the game board's trim and draft (16–17°,
  0.27–0.30 m). That reading was taken on its own placed cells. Placement tilts the rider rather than the hull, but it
  was not re-measured here.
- **The phantom's arithmetic.** The singularity was located, not taken apart. It comes from normal equations solved on a
  linear blend of two state-space designs: row '4' and row '4.5'. Which row or column goes singular was not isolated.

## 10. Reproduce

    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/sharp-steer.ts -o <s>/raw.mjs --format esm --platform node
    printf "globalThis.location = { search: '' };\n" > <s>/sharp-steer.mjs && cat <s>/raw.mjs >> <s>/sharp-steer.mjs
    cd <s> && env SEED=2 PERIODS=2 TURN_STEER=1 TURN_COMPRESS=0 STAND_HOLD=5 OUT=<s>/ships.jsonl node --max-old-space-size=3200 sharp-steer.mjs
    cd <s> && env SEED=2 PERIODS=2 TURN_STEER=1 TURN_COMPRESS=0 STAND_HOLD=5 EXTRA='{"plantFloor":"4.5"}' OUT=<s>/floor.jsonl node --max-old-space-size=3200 sharp-steer.mjs
    # diagnostics: SCHED_FLOOR=4.5, HIP_OFF=1. The population: SEED=1..9, PERIODS=12, TURN_COMPRESS=0|1.

The population ran on the bundle of the committed `sharp-steer.ts`, SHA-256
`107cfcdd89a89687d86e51c081497418b036d082c3bdd07fb528d8fea063e9f2` (rebuilt from the commit and compared byte for
byte). `results/35o/` on this branch holds the portable numbers:

- `seed2-waves12-{ships,floor}-substeps.jsonl.gz`: every substep row of the matched seed-2 pair;
- `seed2-waves12-arms-summaries.jsonl`: the shipped, floor, `SCHED_FLOOR`, `HIP_OFF` and `PROBE=off` arms;
- `population-summaries.jsonl.gz`: every rider's summary and printed-back build, 9 seeds × 2 arms steer only and
  3 seeds × 2 arms with Compress;
- `buckets-*.txt` and `classify-*.txt`: the tables of §8;
- `phantom-ticks-steer-only.txt`;
- `reference-{shipped,floor45}.jsonl`: §5's model table.

The two substep files were made with earlier builds of this probe. They are identical in physics and in the substep
reads, but lack the frame columns `climb`, `heading`, `schedRail` and `depth`; the shipped one also lacks the `built`
line. Their fall times match the 12-period population run of seed 2 exactly. §8's climb numbers come from that run.
