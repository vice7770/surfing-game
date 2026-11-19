# The take-off bench: the owner's own first second, measured for the first time

**The round's question.** PR #426 measured `?trunk=mass` on 90 Canyon riders and found it changed **nothing** about the
fall: `tip` 90 of 90 either way, median first-`tip` frame 46.0 both, median ride 1.3333 s both, roll peak 65.65° both —
unchanged to every decimal printed. The owner then rode it and reported the opposite: *"trunk=mass messes up the balance
completely and the surfer just falls imediatly after starting the ride."* Both cannot be statements about the same
moment, because **the bench never had that moment in it**: every rider in every bench on this track is **placed** on
moving water already in a riding stance, and the owner **paddles, is caught, and pops up**.

This round built the bench that does his sequence — paddle → catch → pop up → stand → turn — and measured the fall
**against the stand**.

**The answer, in five lines** (Canyon B, Medium, seed 1: 12 waves, 6 of them lit the game's own cue, 180 runs):

1. **The immediate fall is the shipped game.** A median **0.750 s** after *"Getting up…"* clears, 12 of 15 inside the
   owner's own one second, `'balance'` every time — **with no new switches on at all**.
2. **`?trunk=mass` does not move the fall.** On seed 1 it differs from shipped in **0 of 406 406 values** — the hip
   rotor it folds never left zero in 4 147 frames. On seed 2 the rotor *does* fire (1 388 of 5 267 frames, peaking at
   **5.5°**) and the arm moves **71 009 of 526 700 values** — **with the fall times identical, run for run** (14 falls
   each, median 0.8333 s both). Either way it is not what makes him fall.
3. **What he rides as "all three" is `?bodyBank=hip` alone** (`bank` vs `all3`: 0 of 388 472) — and that one makes the
   fall **sooner** (0.683 s, 15 of 15 inside a second) while cutting the roll peak from 28.9° to 9.3°.
4. **`?askCap=4.5` is invisible on a placement and not on a take-off**, because a placement is on the plane from
   frame 1 and a take-off is not: it is the only arm that gives an off-plane rider a lean to ask for.
5. **The regime, not the initial condition, is what separates the benches.** Load and wetness agree; the **planing
   latch** and the **lean cap** do not. So `tip` 90/90, the 10.9° stance, the 0.1 s lag and the 0.327 m demand are
   statements about a bench until they are re-measured through a stand.

---

## 1. Can a faithful pop-up be driven headlessly at all?

**Yes, and the machinery was already here.** The pop-up is not a placement switch: it is a phase machine on the rider
(`AttachedRider.popUp` → `'push'` 0.72 s → `'landing'` 0.48 s → `'standing'`, with `SETTLE_TIME` 0.8 s after it;
Borgonovo-Santos et al. 2021's 1.20 s), driven by one input bit (`RideInput.popUp`) through `RideSession.step`. The HUD's
*"Getting up…"* is exactly `'push'` and `'landing'` (`ui/ridePrompt.ts`), so **the prompt clearing is the frame
`'standing'` begins** — which is what makes the owner's video timings and this bench's numbers the same quantity.

`docs/research/canyon-catch-2026-10-29/catch-probe.ts` has driven that sequence since 29 October: the game's own Canyon
sea, riders placed **prone at rest** at the game's own lineup, paddling in, sprinting, popping at the HUD's own cue.
This bench is its descendant, carrying `3.5/merge-bench.ts`'s column set and its Canyon seatbelt.

**So the brief's claim needs one correction, and it is a correction of scope, not of substance.** A real pop-up *is*
benched in this repo. It is **not benched anywhere on this track**: of the probes under `docs/research/new-rider/` that
build a rider —

    3.2/libturn.ts  3.2/rollspring.ts  3.2/trimbank.ts  3.2/turnpath.ts
    3.3/across.ts  3.3/bank.ts  3.3/buoy.ts  3.3/deck.ts  3.3/fall.ts  3.3/felt.ts  3.3/inertia.ts
    3.3/loop.ts  3.3/plant.ts  3.3/roll.ts  3.3/stance.ts  3.3/stills.ts  3.3/turn.ts
    3.5/bank.ts  3.5/depth.ts  3.5/foam.ts  3.5/trunk.ts  3.5/merge-bench.ts

— **not one calls `popUp()` and not one places a rider prone** (`grep -rln "popUp\|phase: 'prone'" docs/research/new-rider/`
hits only prose and this bench). Every published number on this track — `tip` 90/90, the 10.9° stance, the 0.1 s lag,
the 0.327 m demand — is a measurement of a rider that was **put** on the water standing.

---

## 2. The bench

`bench.ts`, run as its header says. What it is:

| Piece | What it does | Why |
| --- | --- | --- |
| The address | `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on`, **parsed by the game's own switch code** (`surfZoneConfigFor` → `switchedConfigFor`, reading `globalThis.location.search`) | An arm is a suffix on the owner's own address; nothing is hand-mapped |
| The sea | One Canyon B sea, CPU, worker step 1/60 s, seatbelt **read off the solver** | Every arm rides the same water, wave for wave |
| The start | `RideSession.place({ phase: 'prone', speed: 0 })` at `focus.x + rideLineupAlong`, `focus.z − rideLineupOffset` | Exactly `SurfZoneRunner.launchRide` |
| The catch | Paddle in; sprint when the crest is 2 s away; **pop at the game's own cue** (`rider.popUpCue \|\| inTakeOffWindow(frame)`) | The HUD's cue, not a bench's rule |
| The ride | `cue` (pop at the cue, then stand and ride with the stick at zero), `cueL`, `cueR` (the same, plus Compress and a **full** steer from 0.3 s after the stand, for 0.9 s) | A stand alone, and a stand that is then asked to turn either way |
| The clock | Every time is **against the stand**: `fellAfterStand = fell − stand` | The owner's window is the first second after *"Getting up…"* clears |

**The riders read the water and never push it** (`addReaction` is a no-op), which is how they share one sea; in the game
a board's reaction does reach the solver. That is this bench's one deliberate difference, inherited from `catch-probe`.
The other cross-talk a shared water could have is the bodies' sample time, and the engine already closes it:
`BoardBody.step` ends with `water.setSampleTime?.(0)` — *"back to the water's own time for whatever samples it next
(the rider's cue, other bodies)"* — so no rider reads the sea at another rider's substep offset.

### What a broken result would look like here

* **The address not arriving.** A bare-string `globalThis.location` has no `.search` (`devTools.ts:9`), so every switch
  goes missing and the bench quietly measures the default Canyon with the default rider. The `control` line prints the
  solver's own grid and the parsed switches per arm, and the bench **exits non-zero** unless `canyonBed === 'b'` and
  `rider === 'new'`. Measured: grid **400 × 451 = 180 400**, and all five arms parsed exactly as typed.
* **An arm moving the sea.** Each arm's config is compared with the first arm's, key by key, with the rider keys removed
  from both sides; a difference aborts the run. Measured: **none**.
* **A metric that cannot fail.** `fellAfterStand` does not exist for a rider that never stands, so every table carries
  **stood** and **popped** beside it; a drop in falls that is really a drop in stands cannot hide.
* **A frozen column read as a live one.** `AttachedRider.separate` (`:5428–5433` on `claude/ride-all-three`) clears
  `attached`, `climbing`, `inContact` and sets `separation`, and **never clears `phase` or `upright`**. Every rider
  column therefore freezes at the separation. A run stops at its first `attached === 0`, and the fall is read off
  `atFall` — **the last frame on which the rider was still attached** — never off the frozen frame.
* **Pinning read off the wrong field.** `pinned` here is `limitTime.tip > 0` (the published quantity, the step's
  decaying memory); `pinNow` is `limit === 'tip'`, one substep of 32. Both are emitted and both are named.
* **The zsh integer trap.** `SECONDS=0.5 node …` arrives as `"0"` through zsh's special variable and the bench still
  prints a tidy summary. This bench has no `SECONDS`: its horizons are `STAND_HOLD` (s after the stand) and `PERIODS`
  (of sea), and every invocation in the header uses `env`.
* **The probe changing the thing it measures.** `PROBE=off` builds no per-frame row, which also skips the probe's own
  two reads — the drawn feet (`renderPoint`, twice) and the second `sampleAt` under the board. A `PROBE=off` run and a
  `PROBE=on` run must agree value for value.

---

## 3. The catch: what the game's own cue does at his spot

**Canyon B, Medium, seed 1, the game's own start (9 m out, Canyon B's own `rideLineupOffset`).** Riders paddle in and
sprint 2 s before the crest, as `catch-probe`'s `good` script does.

`inTakeOffWindow` wants the board shoreward at **0.8 of the crest's speed** while it sits 1.1–2.2 face heights ahead
of the crest. **The cue lit on 6 of the 12 waves** — waves 6, 7, 8, 10, 11 and 12, whose faces at the start were
**1.28–2.06 m** — and on **none** of the other six, whose faces were **0.81–1.20 m**. On one of those misses, traced
frame by frame, the geometric half of the window was satisfied for about 0.7 s (1.2–2.2 m ahead of a 1.06 m crest,
which wants 1.17–2.33 m, at 0.92–0.97 up the face) and
the speed half never was: the paddler topped out at **3.7 m/s shoreward against a crest at 5.3–5.5 m/s**, needing 4.3,
and the crest passed under him.

**So the cue is a set-wave cue at this spot**, and a player pressing the key on his own feel is doing something the
bench had no script for. Two more pop rules are therefore in the bench (`lift`, the crest about to pass under a
sprinting rider; `early`, the key pressed 2 s before the crest arrives, so the wave meets a rider already standing).

## 4. What a placement gives, and what a take-off gives: not the same rider

The same bench, the same sea, the same second. **The placement** is `merge-bench.ts`'s own rig — flush on the surface at
the break point, 45° off the fall line, `SINK = 0.06`, the rider constructed with `phase: 'standing'` — and **the
take-off** is the first second after *"Getting up…"* clears on that same water.

| | the placement (`results/placement-first-second.txt`: 60 runs, 5 arms × 2 `SINK` × 6 entries, 1 s each) | the take-off (`ships`: 18 stands, **716 frames** in the first second after the stand) |
| --- | --- | --- |
| planing at the first frame | **1 at every entry ≥ 4 m/s** (5 of 6 entries), by the mount's own seed | **0** (median over 18 stands; on in **6 of 18**) |
| planing through the second | 1 (median) | **0** (median); on in **18.0 % of 716 frames** (`ships`), 23–25 % with the switches |
| the lean the rider may ask for (`leanProbe.cap`, rad) | **0.30 / 0.46 / 0.77 / 1.05 / 1.21** at 4 / 6 / 8 / 10 / 12 m/s | **0.000** (median); a non-zero `leanAsk` in only **48 of 716 frames** |
| speed | the entry, 2–12 m/s | 4.94 m/s over ground (median), **under 4 m/s through the water** |
| load at the feet | 1.0 body weights (median) | 0.86 body weights (median) |
| leg load | 1.0 body weights | 0.90 body weights (697 N) |
| wetted hull | 0.35–0.52 m² | 0.363 m² |
| roll peak in the second | 0.7–25° at every entry ≥ 4; **57–63° at 2 m/s** | **28.9°** (median of the per-run peaks) |
| falls inside the second | **2 of 12 per arm** — and both are the 2 m/s entries | **12 of 15** (Part 5) |

**The brief asked for the load and the wetness, and they are the part that agrees.** The take-off's first second
carries **0.86 body weights** at the feet against the placement's 1.0, and **0.363 m²** of wetted hull against
0.35–0.52 — within the placement's own spread, and about two thirds of a 1.778 × 0.464 m planform either way. So
`SINK = 0.06` did its job: the flush placement's old complaint (a dry hull and an unloaded leg at frame 1) is **not**
what separates the two benches. What separates them is the latch and the cap.

**The mount seeds the planing latch from the magnitude of the board's world velocity** — `AttachedRider`'s mount:
`if (this.upright && this.phase === 'standing' && board.velocity.length() > PLANING_SPEED) { planing = true; banked =
true; }` — so a rider *constructed* standing at 4 m/s or more is **on the plane from frame 1**. A rider who gets there
by popping up is mounted **prone**, with `planing = false`, and can only latch it later through `planingStep`, whose
speed is measured **horizontally relative to the water under the board**. On a wave face the water runs shoreward with
the wave, so a caught board makes 4.9 m/s over the ground and **less than 4 m/s through the water**: the latch never
enters. `takeOffCue.ts`'s own header says the same thing from the other side — *"a caught board barely planes"*.

The consequence is not cosmetic. Shipped, **the lean the rider asks for is 0 off the plane**, so a placement bench has
measured a rider who may lean 17–69°, while a take-off stands a rider who may lean **nothing at all** — in 12 of 18
stands, and in 82 % of the first second's 716 frames. The
`canyon-movement-review` of 18 November predicted exactly this from source (*"an already-standing test placement seeds
the latch from the magnitude of world velocity… that makes placement evidence ambiguous in the transition band"*);
this is the measurement.

## 5. When he falls, measured against the stand

**Population: Canyon B, Medium, seed 1, 12 periods → 12 waves; 5 arms × 3 scripts × 12 waves = 180 runs; 1 183 s
wall.** Of the 12 waves, **6 lit the game's own cue** and every rider that popped **stood** — `popUpReport.outcome` is
`'stood'` in 90 of 90, and the stand comes **1.200 s after the press in every one of them** (the set of
`stand − pop` over 18 stands is `{1.2}`: `PUSH_TIME` + `LANDING_TIME`, which is also what the HUD shows).

| arm | popped / 36 | stood | fell after the stand | median, s | range, s | within 1 s | roll peak in the first second | CoP-pinned share of the first second (`limitTime.tip > 0`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ships` | 18 | 18 | 15 | **0.750** | 0.63–1.73 | 12 of 15 | 28.9° | 89.8 % (`limit === 'tip'`: 26.8 %) |
| `trunk` (`?trunk=mass`) | 18 | 18 | 15 | **0.750** | 0.63–1.73 | 12 of 15 | 28.9° | 89.8 % (26.8 %) |
| `bank` (`?bodyBank=hip`) | 18 | 18 | 15 | **0.683** | 0.58–0.75 | **15 of 15** | 9.3° | 84.0 % (12.6 %) |
| `all3` (all three) | 18 | 18 | 15 | **0.683** | 0.58–0.75 | **15 of 15** | 9.3° | 84.0 % (12.6 %) |
| `all3cap` (all three + `?askCap=4.5`) | 18 | 18 | 15 | **0.683** | **0.42**–0.98 | **15 of 15** | 9.8° | 83.3 % (13.2 %) |

**The population, said plainly.** The 15 falls per arm are **5 waves × 3 scripts**, not 15 independent draws: the
three scripts ride the same wave with the same paddling and diverge only after the stand, and the sixth cue wave
(wave 6) never fell. So the independent unit here is the **wave**, and there are six of them on this sea; the medians
are over runs, as the earlier placement tables' were, and the wave identities are in `results/seed1-summaries.jsonl`.

**Every separation is `'balance'`.** Nobody slips a foot, nobody loses the board, nothing hits the reef, and
`inContact` is true in **698 of 698** first-second frames on the shipped address: the feet never leave the deck.

**Nor does an input save it.** The first script leaves the stick at zero; the other two put Compress and a **full**
steer in 0.3 s after the stand, either way. Shipped, the medians are 0.700 s (no stick), 0.767 s (turning one way) and
0.767 s (the other) — the turn neither rescues the ride nor ends it sooner, so the fall is not something the stick does or fails
to do.

**This is the owner's own report, and it is the shipped behaviour.** His words across three reports are *"stands 1
second"*, and the video timings handed to this round are *"Getting up…"* clearing at ≈ 7.99 s with the wipeout prompt
at ≈ 8.99 s, i.e. **1.00 s** (reported, not measured here — the videos were read by an earlier round).
The shipped address, through its own take-off, gives a **median of 0.750 s and 12 of 15 inside his one second** — with
no new switches on at all.

**Wave by wave, the stand's own conditions decide whether it is carried** (the shipped address; the six waves that lit
the cue; the stand frame, and the no-stick script's outcome):

| wave | speed, m/s | planing | load, bw | front share | margin | wetted, m² | ahead, m | up the face | face under the board | the stand's refusal | fell after the stand |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | 6.13 | **1** | 0.83 | 0.43 | 0.912 | **0.263** | 2.15 | **0.79** | **16.9°** | **none** | **never** (rode the 3 s out) |
| 10 | 6.02 | **1** | 0.92 | 0.48 | 0.836 | **0.263** | 1.83 | 0.84 | 15.9° | **none** | 0.70 s |
| 7 | 5.36 | 0 | 1.07 | 0.67 | 0.879 | 0.389 | 1.06 | 0.95 | 9.2° | feet under water | 1.73 s |
| 8 | 5.18 | 0 | 1.05 | 0.66 | 0.898 | 0.375 | 1.18 | 0.94 | 10.3° | feet under water | 0.75 s |
| 11 | 5.59 | 0 | 1.02 | 0.68 | 0.579 | 0.566 | 1.33 | 0.95 | 7.9° | feet under water | 0.68 s |
| 12 | 3.92 | 0 | 1.06 | 0.70 | 0.724 | 0.469 | 0.54 | 0.99 | 3.4° | feet under water | 0.63 s |

The two stands that are **not** refused are the two that are **planing**, **lower on the face** (0.79–0.84 against
0.94–0.99), on a **steeper** one (15.9–16.9° against 3.4–10.3°), with **half the wetted hull** (0.263 m² against
0.375–0.566) and the weight **off** the front foot (0.43–0.48 against 0.66–0.70). One of those two — wave 6 — is the
**only wave in the study whose stand survived the window**, and it survived on all five arms (15 of 15 runs).
**The refused four all stand high on a flattening crest on a buried board, and every one of them is gone inside
1.73 s.**

**And the stand itself is already not carried.** `AttachedRider.standRefusal` ran at the `'landing'` → `'standing'`
transition and returned **`'feet under water'` in 12 of the 18 stands** (and nothing in the other 6): at the moment
the rider stands, a foot's deck point is more than `FEET_DEPTH` under the surface. The game records the refusal and
stands anyway — *"the rider stands whatever the board can carry… a stand without support is noted, and the physics
decides what follows"* — and what follows, three quarters of a second later, is a fall. The landing's own peak is
**1.354 body weights with 0.722 of it on the front foot** (`popUpReport`), so the body arrives forward and heavy on a
deck that is under water.

## 6. The arms, on a real take-off

Each arm is the same sea, the same wave, the same paddling, the same press — so the comparison is paired wave by wave,
frame by frame. The diff counts below are over **every column the three switches can move**, aligned on
`(script, wave, frame)`.

Seed 1 (seed 2's counts are in Part 10 and differ; the first column is this sea's):

| pair | values that differ | first frame that differs |
| --- | --- | --- |
| `ships` vs `trunk` (`?trunk=mass`) | **0 of 406 406** over 4 147 aligned frames in 36 runs | — (none) |
| `ships` vs `bank` (`?bodyBank=hip`) | 15 314 of 387 394 | frame 484–584 of each run: **only once standing** |
| `bank` vs `all3` (`+ ?armCarry=on + ?trunk=mass`) | **0 of 388 472** | — (none) |
| `all3` vs `all3cap` (`+ ?askCap=4.5`) | 8 721 of 384 160, `leanCap` first (441 frames) | frame 477–577: once standing |

**`?trunk=mass` is bit-for-bit inert on this sea — and that is a fact about the sea, not a law.** On seed 1 it moves
**nothing**, and the reason is in the rider's own columns: on the `trunk` arm, `StandingBody.hip.angle` reads **0 in
all 4 147 logged frames, including all 787 standing frames**, and so does `trunkFold`. The hip rotor answers excess
ankle demand, and on these six waves there was none to answer, because (Part 4) the rider is off the plane and the
lean he may ask for is zero. **A fold that never fires cannot move the mass it folds.**

**On a second sea the rotor does fire, the switch does move the state — and the fall still does not move.** Seed 2
(Part 10): `StandingBody.hip.angle` is non-zero in **1 388 of 5 267 frames** on the `trunk` arm — **67.7 % of its
standing frames**, from 0.1 s after the stand on — **peaking at 5.5° (0.096 rad)**, against the **42.9°** PR #426
measured on its placed riders, so the fold a take-off asks for is about an eighth of a placement's. With the rotor
awake the arm differs from shipped in **71 009 of 526 700 values**, `trunkFold` first — and **the fall times are
identical, run for run** (14 falls each, median **0.8333 s** both). `bank` versus `all3` is the same story on this
sea: 68 953 of 511 300 values, identical falls.

**So the honest statement is the narrow one.** `?trunk=mass` is inert while the hip rotor is idle (all of seed 1,
a third of seed 2's standing frames), and when the rotor wakes it moves the state without moving the outcome — which
is **PR #426's own finding, now reproduced through a real take-off**. What it never does, on either sea, is make the
rider fall sooner.

**On a placement the same switch is live — and that is this measurement's positive control.** A "0 of 406 406" is
worthless unless the same bench, with the same arm wiring, can be shown to see the switch when it acts. It can: on the
flush placement — same bench, same sea, same second — `trunk` differs from `ships` in **26 of 216** summary values
(`results/placement-first-second.txt`: at the 12 m/s entry it even moves the fall frame, 30 → 32), and PR #426's own
placement bench put it at **342 757 of 865 859 values, the fold firing in 19.6 % of live frames and peaking at 42.9°**.
So the switch is not broken, the bench's wiring is not dead, and #426 is not wrong: **the two benches are measuring two
different riders.**

**`?bodyBank=hip` is the arm that acts**, and `all3` is `bank` exactly (0 of 388 472): on a take-off, `armCarry`
(drawing only) and `trunk` (inert) contribute nothing, so **what the owner rides as "all three" is `?bodyBank=hip`
alone**. It does what its branch claims — the roll peak in the first second falls from **28.9° to 9.3°** and the
CoP-pinned share from 89.8 % to 84.0 % — and the fall comes **sooner**: median 0.750 s → 0.683 s, and **15 of 15**
inside one second against 12 of 15. This is the balance-redesign thread's own ruling again, now on a take-off: *the
counter-roll lowers the roll and does not move the fall* — except that here it moves it the wrong way.

**`?askCap=4.5` is not nothing on a take-off, and that is new.** Shipped, the lean the rider asks for is 0 off the
plane; `askCap=4.5` gives him `atan(v²/(g·4.5))` instead. On a placement at 4 m/s or more the rider is already on the
plane, so the switch changes **2 of 216** placement values — it looks like nothing, which is what the owner reported.
Through a take-off, where the rider is off the plane for 76–82 % of the first second, it raises the median `leanCap`
from **0.000 to 0.238 rad (13.6°)** and the frames with a non-zero ask from **48 of 716 to 192 of 580**, and it
produces the **earliest fall in the whole study (0.42 s)**.

## 7. What fails first, through the stand — paired, never one signal

Medians at two frames, over the runs that stood (18 per arm) and then fell (15 per arm). The columns are the brief's
own list: the stick, the cap and the planing state, the achieved bank, the loaded foot's contact, the local rail (the
board's roll), the travelled course against the heading (`drift`), the wave-relative progress, the leg's load and
stretch, and the deck-relative foot speed.

Definitions, so no sign is guessed: **roll** is `atan2(up · s, up.y)` in degrees, where `up` is the board's own up and
`s` the horizontal right-hand normal to its heading, so it is the board's rotation about its own nose-to-tail line;
**drift** is the travelled course minus the heading, both as compass angles from +z, so a non-zero drift is the board
going somewhere other than where it points; **leg stretch** is `leg.extension`, negative when the leg is shorter than
its rest; **foot speed** is each drawn foot's world point taken into the board's frame and differenced, so it is zero
while the feet stay put on the deck however the board moves.

| frame | speed | stick | planing | `leanCap` | `leanAsk` | load, bw | legLoad, N | leg stretch, m | front share | roll | bank | margin | `tTip` | wetted, m² | ahead, m | up the face | face under the board | drift | foot speed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **the stand** (all arms, 18 each — they are identical until the standing contact runs) | 5.48 | 0 | **0** (on in **6 of 18**) | **0.000** | **0.000** | 1.03 | 720 | **+0.006** | 0.666 | 2.5° | 0.001 | 0.858 | 0 | 0.382 | 1.26 | 0.943 | 9.8° | ≈0 | **0** |
| **the fall**, `ships`/`trunk` (15) | 3.63 | 0 | 0 (on in 3 of 15) | 0.000 | 0.000 | **0.45** | 621 | **−0.150** | 0.483 | +3.2° | 0.09 | **0.212** | 0.072 | 0.410 | 0.43 | 0.978 | 2.7° | −18.2° | **0** |
| **the fall**, `bank`/`all3` (15) | 5.51 | 0 | 1 (on in 9 of 15) | 0.094 | 0.000 | **0.51** | 600 | −0.096 | 0.312 | −5.9° | 0.17 | 0.259 | 0.057 | 0.331 | 0.72 | 0.978 | 6.6° | **−43.8°** | **0** |
| **the fall**, `all3cap` (15) | 5.44 | 0 | 1 (on in 9 of 15) | 0.095 | 0.000 | 0.51 | 606 | −0.072 | 0.312 | −5.4° | 0.11 | 0.320 | 0.048 | 0.348 | 0.86 | 0.968 | 7.6° | −24.0° | **0** |

`limit` at the fall is `'tip'` in **15 of 15** runs for `bank`, `all3` and `all3cap`, and `'tip'` in 9, `'none'` in 5
and `'flight'` in 1 for `ships` and `trunk`.

**The order, read off one run frame by frame** (`results/trace-ships-hold-wave8.txt` — the file names carry the script's old name, `hold`; the shipped address, stick at
zero throughout):

| t after the stand | what has happened |
| --- | --- |
| 0.00 s | stands: load 1.05 bw, leg 725 N, front share 0.66, **margin 0.898**, roll 2.2°, **not planing, cap 0, ask 0**, 1.18 m ahead of the crest, 0.94 up a 10.3° face |
| 0.10–0.20 s | load rises to 1.22 bw, the front share slides 0.66 → 0.52, **the roll is still under 2°** |
| **0.30–0.40 s** | **the balance margin collapses, 0.870 → 0.691 → 0.469, with the roll still 2–4° and the stick at zero** |
| 0.50 s | `limit` = **`tip`**: the demanded centre of pressure is outside the support box. Leg load peaks at 861 N, roll −10.8° |
| 0.60 s | roll −26.9°, margin 0.098, the leg compressing (stretch −0.076 m) |
| 0.75 s | gone — `'balance'` |

**So it is not the roll, not the stick, not the feet and not the water's grip.** The feet never move on the deck
(`foot5`/`foot6` are 0.000 at every frame, `inContact` 698 of 698). The stick is zero. The roll is a **consequence**:
it starts to run only after the margin has already halved. What fails first is **the balance's own demand** — the
centre of pressure it wants leaves the support box — on a rider who, at that moment, **may not ask for any lean at
all** (cap 0, ask 0, off the plane) and whose board has its deck at the feet **under water** (the stand's own refusal
in 12 of 18). The rider has one authority left, the sole, and that is the one that saturates (`tip`).

**And he never gets down the face.** He stands **0.943 up the face, 1.26 m ahead of the crest, on a 9.8° slope**, and
he falls **0.968–0.978 up it, 0.43–0.86 m ahead of the crest, on a 2.7–7.6° slope**. The drop-in never happens: the
whole measured ride is spent **on the crest**, which is also why the board does not sustain 4 m/s **through the water**
(the latch's own test) and why the lean cap stays at zero in 12 of 18 stands. Any work on this first second that
assumes the rider is on a face is assuming something the take-off does not deliver here.

`?bodyBank=hip` changes which way it goes rather than whether, **and it fails in the same order**
(`results/trace-bank-hold-wave8.txt`): the margin goes 0.898 → 0.766 → 0.611 → 0.400 by 0.47 s with the roll still
−2.5°, the leg peaks at 888 N, `tip` arrives at 0.60 s, and it is gone at 0.633 s. What differs is the end: with the
trunk's angular-momentum rate in the contact's bound, the roll stays small (9.3° against 28.9°) and the board
**slides** instead — the travelled course leaves the heading by **−43.8°** against the shipped **−18.2°**, speed is
kept (5.5 m/s against 3.6), and the CoP is pinned in 15 of 15 falls.

## 8. The one thing `?trunk=mass` does change, and this bench cannot see it

The switch has two halves. The physics half folds the mass model's trunk about the pelvis by the hip rotor's angle —
and that angle is **0 in every frame measured here**, which is why the arm is bit-for-bit identical to shipped.

The drawing half is **not conditional on the rotor**. `HumanoidRig.hinge` on `claude/ride-all-three`:

    this.physicsTrunk = RIG_SWITCHES.trunk === 'mass' && state.phase === 'standing';
    if (this.physicsTrunk) wanted = 0;

— and `poseHinge`'s mass-position correction (`backForMass`) is stood down with it. `PhysicalMode` turns it on for
exactly the owner's address: `RIG_SWITCHES.trunk = config.trunk === 'mass' && config.rider === 'new' ? 'mass' :
undefined`. So **whenever the rider is standing, `?trunk=mass` deletes the rig's own trunk fold** and hands the trunk
to a physical rotor which, on a take-off, is at zero. The fold it deletes is the stance sheet's own: `hinge.tall` **16–44°** and `hinge.deep`
**30–56°** by stage (`stagePoses.ts`), plus `leanIn`. A rider who used to fold 16–50° over his toes now **stands bolt
upright**, and then falls at 0.75 s exactly as he always did.

That is a *reading* of the rig's source, not a measurement — this bench measures physics and the rig is scene code —
and it is offered as the one hypothesis that fits both the owner's words and every number here: *"messes up the
balance completely"* (the body's drawn posture changes the moment he stands, unconditionally) *"and the surfer just
falls imediatly after starting the ride"* (0.75 s, which is the shipped fall he would also get with the switch off).
**It is testable without him: draw one standing frame with and without `?trunk=mass` on the same ride.**

## 9. The player's own timing, on the waves the cue ignores

A second, independent population: the shipped address alone, seed 1, 4 periods → the **first 4 waves**, the ones the
game's cue never lights on (Part 3). Three pop rules, one rider each per wave:

| pop rule | popped / 4 | stood | fell after the stand | median, s | values, s | the stand's own refusal |
| --- | --- | --- | --- | --- | --- | --- |
| `cue` — the HUD's cue | **0** | 0 | — | — | — | — |
| `lift` — the crest about to pass under a sprinting rider | 2 | 2 | 2 | 0.575 | 0.35, 0.80 | `feet under water`, 2 of 2 |
| `early` — pressed 2 s before the crest arrives | 3 | 3 | 3 | **0.400** | 0.35, 0.40, 0.63 | `feet under water`, 3 of 3 |

A player who presses the key on his own feel, on a wave the cue never sanctioned, **stands and falls even faster** —
0.35–0.80 s — and every one of those stands is refused for the same reason. Whatever the owner's timing is, the first
second after the stand is where his ride ends.

**And those stands are on a far more buried board**, which is what the refusal says: in the first second after the
stand, `early` carries **0.4 body weights** at the feet (`lift` 0.6–0.7) over **0.557–0.601 m²** of wetted hull —
against the cue stands' 0.86 bw over 0.363 m² — with a roll peak of **43–44°** and the CoP pinned in **100 %** of the
frames (`results/pop-rules-tables.txt`). Standing earlier does not buy a better platform; it buys a wetter one.

## 10. The controls

**The address arrived.** The `control` line is printed off the solver before anything is measured: grid
**400 × 451 = 180 400** (Canyon B's own seatbelt), **spun up in 57 s** to a sea time of 22 s, the start at
(−122.0, −134.0) — 9 m out, Canyon B's own `rideLineupOffset` — on an Hs 1.40 m, Tp 11.0 s sea, and the five arms
parsed as
`{canyonBed: b, rider: new, feltFrame: deck, stanceReach: keep, deepen: on, riderBody: two}` plus, per arm,
`trunk: mass` / `bodyBank: hip` / `armCarry: on` / `askCap: '4.5'` exactly as the suffix says. **Sea differences
between arms: none.** The bench exits non-zero if either check fails, so a bare-string `globalThis.location` cannot
quietly bench the default Canyon.

**The bench's own refactor changed nothing.** Seed 1 was produced by an earlier build in which the three scripts
popped at the cue by default; the file in this PR says so with named pop rules (`cue`, `lift`, `early`) and carries the
`PROBE` switch and three new columns. Re-run at seed 1 on the overlapping waves, the two builds agree:
**0 of 2 016 values differ** over 48 runs (3 arms × 2 scripts × 8 waves), on every column both builds emit; the only
differences are the four columns the old build did not have (`popBy`, `fsCapMed`, `fsPlaningFirst`, `fsPlaningMed`).

**A second sea keeps both findings and breaks one of this document's first words.** Seed 2, run with the file in this
PR (`SCRIPTS=cue,cueL,cueR`, 12 periods, 1 043 s): **11 waves, 7 of them lit the cue, 165 runs; 21 stands and 14 falls
per arm** (`results/seed2-*`). What carries over:

| arm | stood | fell | median after the stand | within 1 s | roll peak in the first second | pinned | the stand's refusal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ships` | 21 | 14 | **0.8333 s** | 11 of 14 | 18.8° | 100.0 % | 18 of 21 |
| `trunk` | 21 | 14 | **0.8333 s** — the same 14 values | 11 of 14 | 18.8° | 100.0 % | 18 of 21 |
| `bank` | 21 | 14 | **0.6333 s** | 13 of 14 | 4.9° | 100.0 % | 18 of 21 |
| `all3` | 21 | 14 | **0.6333 s** — the same 14 values as `bank` | 13 of 14 | 4.9° | 100.0 % | 18 of 21 |
| `all3cap` | 21 | 14 | 0.6333 s (one value apart from `bank`) | 13 of 14 | 4.8° | 100.0 % | 18 of 21 |

The fall is still immediate (the shipped median moves with the sea, 0.750 → 0.8333 s), `?bodyBank=hip` still brings it
**sooner** and still cuts the roll (18.8° → 4.9°), the stand is still refused as `feet under water` in **18 of 21**,
and the CoP is pinned in **100 %** of first-second frames.

**What does *not* carry over is "`?trunk=mass` moves nothing".** On this sea the hip rotor wakes: non-zero in
**1 388 of 5 267 `trunk`-arm frames — 67.7 % of its standing frames — peaking at 5.5°** (against 0 of 4 147 on seed 1,
and against the **42.9°** PR #426 measured on placed riders). With the rotor awake the arm differs from shipped in
**71 009 of 526 700 values**, and `bank` from `all3` in **68 953 of 511 300** — **while the fall times stay identical,
run for run.** Seed 1's *0 of 406 406* was a fact about six waves on which the rotor happened never to fire; reading
it as a property of the switch would have been exactly the error this project keeps warning itself about. **The claim
that survives both seas is the narrow one: `?trunk=mass` moves the state and not the fall** — which is PR #426's own
finding, reproduced through a real take-off.

**The probe is inert, over 2 538 values.** `PROBE=off` reruns the drive with the per-frame row never built, which also
removes the only two reads the probe makes of its own accord — the drawn feet (`renderPoint`, twice, taken into the
board's frame) and a second `sampleAt` under the board (`slopeUnder`) — while the outcomes and the first-second
columns are computed exactly as before (`LOG` only gates the write, so it cannot matter). At seed 1, 8 periods,
3 arms × 2 scripts: **54 runs aligned, 2 538 summary values compared, 0 differ.** A broken result here would have
been a changed fall frame or a changed first-second median, and there is none.

**Live frames, counted.** Seed 1 stepped **113 222** rider frames in all, of which **113 147 (99.93 %)** were live
(`attached === 1`); the 75 that were not are the one frame per fallen run on which the separation is seen, and each
run stops there. **20 162** frames were emitted (the whole window from 0.5 s before the pop, every 10th frame while
paddling), **3 437** of them at or after a stand. No frozen frame enters any median: the `atFall` row is the last
attached frame, and the first-second columns count only frames with `attached === 1`.

**The pinning trap reproduces.** `pinned` here is `limitTime.tip > 0` (the published quantity, the step's decaying
memory) and `pinNow` is `limit === 'tip'` (one substep of 32, the last one kept). On the shipped address they read
**89.8 %** and **26.8 %** of the same 698 frames — a factor of **3.35**, which is the "about a third" the earlier
round warned about, measured again on a different bench. Anyone re-deriving a pinned share off `limit` would publish a
third of the real figure.

**Every median here is a PLAIN median** — the mean of the two middle values at even length — in the bench and in
`read.py` alike. Counts carry their population; no number in this document is a mean of medians.

## 11. What this makes conditional

**Every number this track has published is a statement about a placed rider, and a placed rider is not the rider the
owner plays.** The difference is not a nuance of initial conditions; it is the regime:

* the mount seeds `planing` from the magnitude of the board's **world** velocity, so a placement at 4 m/s or more is
  **on the plane from frame 1** (measured: every entry ≥ 4 m/s, both `SINK`s, all five arms);
* a pop-up mounts **prone** and reaches standing with `planing` false, and the latch's own test is **horizontal speed
  relative to the water under the board** — which, on a face whose water runs with the wave, stays under 4 m/s. The
  take-off stands are planing in **6 of 18**, and the first second is planing in **18 % of 716 frames**;
* shipped, the lean a rider may ask for is **0 off the plane**. So the placement benches measure a rider who may lean
  **17–69°** and the take-off a rider who may lean **nothing**, and `leanAsk` is non-zero in **48 of 716** frames.

So: `tip` 90/90, the 10.9° stance, the 0.1 s lag and the 0.327 m demand are **statements about a bench**, not about
his game, until each is re-measured through a stand. They are not thereby wrong — the placement is a legitimate,
repeatable laboratory, and its own finding for `?trunk=mass` (the switch moves values, the fall does not move) is
reproduced on the placement side of this very bench — but the
inference *"this switch does nothing to his ride"* does not follow from them, and neither does *"this switch is what
ruins his ride"*. Both were drawn from the wrong second.

**What the owner's report turns out to be, measured:**

1. **"Falls immediately after starting the ride" is the shipped game at his spot.** Median **0.750 s** after the
   prompt clears, 12 of 15 inside one second, `'balance'` every time, with **no new switches on**.
2. **`?trunk=mass` does not cause it**: 0 of 406 406 values on seed 1 (the rotor idle in all 4 147 frames), and on
   seed 2, where the rotor wakes in 67.7 % of standing frames and the arm moves 71 009 of 526 700 values, **the fall
   times are identical, run for run**. It moves the state, never the outcome.
3. **What he rides as "all three" is `?bodyBank=hip` as far as the fall is concerned** (0 of 388 472 between them on
   seed 1; on seed 2 they differ in state and fall identically), and that one does move the fall — **earlier**,
   0.750 → 0.683 s, 15 of 15 inside a second.
4. **`?askCap=4.5` is the opposite of "nothing" here**: off the plane it is the only arm that gives the rider a lean
   to ask for, and it produced the earliest fall measured (0.42 s).
5. The most likely source of the *word* "balance" in his report is **the drawing** (Part 8): standing,
   `?trunk=mass` deletes the rig's own 16–50° trunk fold unconditionally and hands the trunk to a rotor that is at
   zero.

## 12. What would refute this, and what I did not measure

* **The fall is the take-off's, or the spot's?** Everything here is Canyon B, Medium, where 6 of 12 waves lit the cue. A size, a seed or a spot where the catch puts the rider on the plane would make a different
  rider stand up, and the whole of Part 4 would then be about Canyon B at Medium rather than about placements.
* **The owner's own ride is not this ride.** His stick is not zero, he is not on a 3 s clock, and his pop timing is
  his own. The three pop rules here bracket it (0.40 s, 0.575 s, 0.750 s medians) but none of them *is* him.
* **The bench's riders do not push the water** (Part 2). A single rider whose reaction reaches the solver is the one
  fidelity gap left in the drive, and the cheap way to close it is a state save at the placement
  (`encodeSurfZoneState`, as `catch-probe --state` does) and one rider per restored sea.
* **The drawing claim in Part 8 is a source reading, not a measurement.** It needs one standing frame drawn with and
  without the switch.
* **`?trunk=mass`'s inertness is conditional on the rotor being idle, and seed 2 showed that condition breaking.**
  The rotor woke on the second sea (1 388 of 5 267 frames, 5.5° peak) and the arm moved 71 009 of 526 700 values with
  the falls unchanged. On a longer ride, on the plane, it will fire harder — PR #426 measured 42.9°. Nothing here says
  the switch is harmless on a ride that gets going; it says it does not move the fall in the first second after a
  stand, on either sea measured.
