# The stand itself: what the refusal costs, why the feet are under water, and what a ride needs to last

**The round's question**, from PR #429's bench: `standRefusal` returns `'feet under water'` in 12 of 18 stands, the
rider stands anyway, and he is gone in a median 0.750 s. What does the refusal cost? Why are the feet under water?
And the starred one: two stands were **not** refused, and they were *planing, lower on a steeper face, on half the
wetted hull* — which of those four is the cause?

**The answer, in six lines.**

1. **The refusal costs nothing.** `standRefusal`'s return value has exactly **one** consumer in the whole source tree
   — a string in the dev-tools readout. The stand happens on the next line whatever it says, and no force, no
   threshold and no phase anywhere reads it. It is a label, not a gate (Part 1).
2. **⭐ And it must not become one as it stands.** The project's own design says it should (`design.md` §4:
   *"`standRefusal` today only reports… That goes"*). **Its two live verdicts point opposite ways**, so the single flag
   is uninformative: across both seas, `'feet under water'` held **0 of 29** — it really is a death sentence — while
   `'sinking'` held **8 of 18**, which is every ride in this study that lasted bar one. A gate on the flag would refuse
   exactly the good ones, and the reason is mechanical: `into > SINK_RATE` is motion into the water relative to the
   flow, which is what a **planing** hull does by construction. Measured: `asin(into/V)` is **+2.60° at 6.21 m/s** on
   planing frames — a trim angle — and integrated over wave 10's surviving ride the test claims **1.13 m of descent**
   while the board's draft moves **0.040 m** and stays above the water throughout. **`sinking` is reading planing
   lift.** Part 5.
3. **The feet are under water because a 25.75 L board cannot float a 73 kg rider, and the pop-up is what hands it the
   whole job.** Fully submerged, the board displaces **26.4 kg of a 75.5 kg** system — **65 % unsupported, a 49.2 kg
   deficit** that only planing lift or the rider's own body in the water can find (`boardReference.referenceFlotation`,
   already in the repo). Prone, the body is in the water and the contact carries 0.16–0.69 bw; standing, the body is
   out of it and the board carries everything. Measured through the sequence, the feet go under **during the pop-up's
   own 1.2 s**, not at the cue and not while paddling (Part 3).
4. **⭐ Of the survivors' four properties, the lever is speed through the water — and `planing` is its marker, not its
   cause.** A near-threshold entry sweep across the planing latch moves the fall by **one frame** (3.80 m/s → 1.167 s,
   3.90 m/s → 1.183 s) while the latch's own consequence, the lean cap, goes **0 → 0.324 rad**. Over the whole sweep
   the fall time rises smoothly and monotonically with entry speed, 0.950 s at 2 m/s to 2.933 s at 8 m/s, **with no
   step anywhere at the threshold**. Wetted hull is a consequence of the same speed; the steeper face is where the
   speed comes from (Part 4).
5. **The brief's two survivors need correcting in both directions.** Seed 1's wave 6 was **reported without being
   observed** — it stood at 16.0167 s on a trial the bench retired at 16 s, one frame stepped, `fsN = 0`. Re-run with
   the window actually followed, **it does hold 3.02 s**: the artefact was in the evidence, not in the outcome. The
   other unrefused stand, wave 10, fell at **0.70 s** — the study's own median — and **holds 3 s only if the press is
   moved 250 ms later**, which is the clearest lever test in this round (Part 5.3).
6. **A ride can last, and what it needs is measurable at the stand. This is not a null.** **9 rides of 55 stands
   carried their full 3 s window, on 5 waves of 23**, across the two seas — 4 of 34 on seed 1 (waves 6 and 10) and
   7 of 21 on seed 2 (waves 1, 2, 11). Every one of the nine is planing; the single quantity that separates them is
   **speed through the water at the stand: 4.422 m/s held against 2.169 m/s fell** (seed 1 medians, 4 held on 2 waves
   against 30 fell). Read together the five properties are one event — **a drop-in** — and the rides that die are the
   ones spent high on a flattening crest on a buried board (Part 6).

---

## 1. ⭐ What the refusal costs: nothing at all

`AttachedRider.advancePhase`, at the `'landing'` → `'standing'` boundary (`AttachedRider.ts:2734–2740`):

    } else if (ended === 'landing') {
      this.popUpReport.refusal = this.standRefusal(board, water);
      this.beginTransition('standing', SETTLE_TIME, board);
      this.popUpReport.outcome = 'stood';

**There is no branch.** The refusal is assigned to a report field and the next statement stands the rider up. It
changes no phase, no duration, no force, no threshold, nothing in the contact, nothing in the balance, and nothing in
the separation test.

**And nothing downstream reads it.** Over the whole source tree, `StandRefusal` and `popUpReport.refusal` have exactly
one consumer outside the write itself and the test suite:

| site | what it does |
| --- | --- |
| `AttachedRider.ts:2737` | writes it |
| `SurfZoneRunner.ts:1183` | copies `popUpReport` into the status object, whole |
| `PhysicalMode.ts:293, 364` | turns it into dev-tools readout text — *"no support: feet landed under water"* |

(The other files that match `refusal` — `App.ts`, `MultiplayerScreen.ts`, `OnlineController.ts` — are the multiplayer
room's own unrelated `Refusal`.)

**So "the stand is refused" is not a statement about the physics of that ride.** The code says so in its own comment:
*"The rider stands whatever the board can carry (the playtest: laid back down on its own, it seemed a fault); a stand
without support is noted, and the physics decides what follows."* The 12-of-18 figure has no causal path to the fall;
it can only be a **correlate**, and Part 5 measures whether it is even that.

Two source notes, reported and not changed:

* ⚠️ **One `popUp()` docstring still describes the gate that was removed** (`:2650–2652`: *"It stands only if the board
  still carries the rider then; otherwise the rider lies back down"*), which is stale against the code 85 lines below.
* ⭐ **`design.md` plans to restore the gate** (§4: *"`standRefusal` today only reports, and the rider 'stands anyway'
  (1866–1868). That goes, and `popUpReport` gains the outcome 'fell'."*). Part 5 bears directly on that plan.

## 2. The bench

`stand.ts` beside this file. The drive is #429's `bench.ts`, carried over unchanged in everything that touches the
water or the rider: the owner's address through the game's own switch parsing, one Canyon B sea shared by all riders,
`RideSession.place({ phase: 'prone', speed: 0 })` at the game's own lineup, the sprint 2 s before the crest, the press
at the game's own cue, the Canyon seatbelt read off the solver. **No behaviour changed, no constant tuned, no switch
added.** What is added is instrumentation:

| added | why |
| --- | --- |
| **`standRefusal`'s four tests, recomputed read-only every frame** | #429 could say *that* a stand was refused — not when, nor by how much, nor what the other tests read |
| ⭐ **every test's own number whatever the verdict** | `standRefusal` returns on the **first** test that fires, so a `sinking` return at `:2789` happens **before a single foot is sampled** and establishes nothing about the feet. Only unconditioned numbers can say whether the two are the same stand |
| ⭐ **the fall test's own two channels** | the fall standing is `human.fallen` = `beyond && weightPast`, and `beyond` is `pastAcross > reachAcross \|\| pastAlong > reachAlong` — **two channels**. `pastX` and `pastZ` are recomputed from `human.state` and the support's extents, so the binding one can be named |
| **the three reserves separately** (`balanceLimits`) | `balanceReserve` returns their minimum and throws away which one it was |
| **the contact's three headrooms separately** | `rawMargin` is `min(across, along, 1 − tangential/friction)` inside `project`. ⚠️ **A falling minimum cannot name which term fell**, so `desiredCop`, the support and `frictionUsed` are logged and all three reconstructed |
| **the planing latch's own speed** | `hypot(v.x − flow.x, v.z − flow.z)` (what `planingStep` tests) beside `leanProbe.speedThrough` (the along-heading speed the cap is built on). Different numbers; only the first latches |
| ⭐ **`heldFull` / `truncated` / `observedAfterStand`** | see the trap below |
| **a `d<ms>` pop delay** | the only lever this drive has on *where on the face the stand happens*, on the same wave in the same water |

### ☠️ The harness trap that manufactured a survivor

`bench.ts:512` retires a trial at `TRIAL` s (16) **whatever its riders are doing**. Seed 1's wave 6 stood at
**16.0167 s**, was stepped for **one frame**, fell on none of them, had `fsN = 0` and `riding = 0.017`, and read as the
one ride in the study that carried the window — on all five arms, which is what made it look like a result. It was
never observed. In `stand.ts` a trial is retired only when every rider is done, or when the clock is past `TRIAL`
**and no rider is still inside its own stand window**; `truncated` flags any rider that neither fell nor was followed
the full `STAND_HOLD` regardless. **No survivor count in this document is reported without `heldFull` and `truncated`
beside it.**

### What a broken result would look like here

* **The address not arriving.** A bare-string `globalThis.location` has no `.search`, every switch goes missing and the
  bench quietly measures the default Canyon with the default rider. The `control` line prints the solver's own grid and
  the parsed switches, and the run exits non-zero unless `canyonBed === 'b'` and `rider === 'new'`. Measured: grid
  **400 × 451 = 180 400**, spun up in 56–59 s to a sea time of 22 s, Hs 1.40 m / Tp 11.0 s, the start at
  (−122, −134) — 9 m out, Canyon B's own `rideLineupOffset`, switches exactly as typed. Identical to #429's.
* **A mirror that is not the game's test.** The positive control is the game's own verdict: the mirror must return
  `popUpReport.refusal`. ⚠️ `standRefusal` runs inside `prepare`, which runs **per substep** (16 of them), so the
  game's reading falls strictly between the probe's last landing frame and its first standing frame; both bracketing
  verdicts are reported and agreement is counted on both.
* **A depth that cannot read dry.** If the feet's depth were only ever positive the column would be useless. The entry
  sweep's 8 m/s placement reads **0.077 m**, under `FEET_DEPTH` — the column can and does read clear.
* **A probe that changes what it measures.** `PROBE=off` builds no per-frame row, which removes every read this probe
  makes of its own accord — the mirror's three `sampleAt` calls, the two foot transforms, the slope read. A `PROBE=on`
  and a `PROBE=off` run must agree value for value on every outcome column.
* **A metric that cannot fail.** `fellAfterStand` does not exist for a rider that never stands and `heldFull` does not
  exist for one that was not followed; every table carries `stood`, `popped`, `heldFull` and `truncated`.

### The frames kept, counted

⚠️ `AttachedRider.separate` clears `attached`, `climbing` and `inContact` and **never clears `phase` or `upright`**, so
every rider column freezes at the separation. Seed 1, the whole run:

| | |
| --- | --- |
| runs | 60 (12 waves × 5 pop timings) |
| rider frames stepped | **36 512** |
| **live** (`attached === 1`) | **36 479 = 99.9096 %** |
| not live | **33** — **exactly one per fallen run**, and 33 runs fell: each run stops at its first `attached === 0` |
| rows emitted | 7 883, of which **2 153** at or after a stand and **33** with `attached === 0` |
| summaries whose `atFall` row is a frozen frame | **0** (it is by construction the last frame with `attached === 1`) |
| **stands whose window was truncated** | **0** |

So no frozen frame enters any median here, and every at-the-fall value in this document is read off the last attached
frame. (37 riders popped, 34 stood, 33 fell — 30 of them after a stand and 3 during the pop-up.)

## 3. ⭐ Why the feet are under water: the pop-up takes the body out of the water, and the board cannot carry it

### 3.1 The arithmetic, which the repo already states

`boardReference.ts`, and its own test beside it:

| | |
| --- | --- |
| the reference board | 1.778 × 0.464 × 0.0667 m, **25.75 L**, 2.54 kg (Connellan et al. 2026, Table 1) |
| the reference rider | **73 kg** (Shormann & in het Panhuis 2020, Table 1) |
| **fully submerged, the board floats** | **26.39 kg** of a **75.54 kg** system |
| **unsupported** | **65.1 %** — a **49.15 kg** deficit |

`referenceFlotation()` returns exactly this, and `boardReference.test.ts` names the consequence in one line:
*"25.75 L of seawater carries about 26 kg: a shortboard cannot float a standing 73 kg rider at rest"* — the test is
titled **"cannot float its rider at rest, so standing needs planing lift"**.

**Prone, the deficit is not there to be found**, because the body is in the water and its own parts are buoyant
(`wetForce`, `this.buoyancy`). #429's own trace shows it: paddling, the contact at the body carries only
**0.16–0.69 body weights**. **The pop-up's 1.2 s takes the body out of the water and hands the whole 75.5 kg to the
board.** Off the plane there is nothing to carry it, so the board goes down and the deck at the feet goes under. That
is not a fault; it is the physics the repo chose, and `standRefusal`'s `feet under water` is detecting it correctly.

### 3.2 Measured through the sequence, the depth is made during the pop-up

Seed 1, 12 waves, five pop timings, **34 stands**, the worst of the two feet, plain medians
(`results/stand-seed1-sequence.txt`). `FEET_DEPTH` is 0.1 m:

| instant | the feet's depth, m | over FEET_DEPTH |
| --- | --- | --- |
| paddling, the 0.5 s before the press | **+0.071** | 14 of 34 |
| **at the cue** | **+0.011** | **2 of 20** |
| at the press | **+0.071** | 13 of 34 |
| at the push → landing boundary | **+0.164** | 20 of 34 |
| **at the stand** | **+0.288** | **28 of 34** |

**So the three candidates separate cleanly.**

* **Where the cue puts him is not it.** At the frame the cue lights, the deck under the feet is **+0.011 m** below the
  surface — flush — and only **2 of 20** cued riders are already over the threshold. The cue fires on a board that is
  carrying a prone rider perfectly well.
* **Where the paddle leaves him is a minor term, and it is the player's own timing.** The 0.5 s of paddling before the
  press reads **+0.071 m**, and the 13–14 stands that are already over the threshold there are almost all the `early`
  script's — a press **before** the wave has taken the board, which buries it (the `early` rows run **+0.598 to
  +0.992 m** deep at the stand, against the cue rows' +0.113 to +0.396).
* ⭐ **The pop-up's own 1.2 s is it.** The depth **quadruples** across it, +0.071 → +0.164 → **+0.288 m**, and the count
  over the threshold goes **13 → 20 → 28 of 34**. Nothing else in the sequence moves it that far.

And the mechanism is visible in the draft and the wetted hull on the same rows. Where the board has speed through the
water, the pop-up's load is answered by planing lift and **the board rises**: wave 6's draft goes +0.001 → **−0.064 m**
and its wetted hull 0.398 → **0.263 m²**, and the feet end **dry** (−0.000 m). Where it has not, the board sinks: wave
12's draft goes +0.030 → **+0.133 m** with the wetted hull rising 0.456 → 0.469 m², and wave 8 `early`'s +0.124 →
**+0.574 m** on 0.621 m² of hull.

**The `sinking` test behaves the same way across the sequence** — over `SINK_RATE` in **15 of 34** at the press, **16
of 34** at the landing boundary, and only **5 of 34** at the stand — so the board's descent into the surface is
driven by the press itself, and mostly over by the time the rider is up.

## 4. ⭐ Which of the survivors' four properties is the cause: the near-threshold entry sweep

The brief's four properties — **planing, lower on the face, a steeper face, half the wetted hull** — are not four
independent facts. Read off the source they are one quantity seen four ways:

* `planingStep` latches `planing` on when `hypot(v.x − flow.x, v.z − flow.z)` passes **PLANING_SPEED = 4 m/s** — the
  board's **horizontal speed through the water under it**;
* a **steeper face** is where that speed comes from (gravity along the face);
* **lower on the face** is where a board that is making speed ends up;
* **wetted hull** falls as the board rises on its own dynamic lift, so it is a *consequence* of the same speed.

So the question is whether the **latch** does anything, or whether the **speed** does everything and the latch merely
rides along. The latch has exactly one physical consequence: off the plane the lean a rider may ask for is **0**
(`prepareBank`: `const most = this.askUngated || this.planing ? held : 0`), and on it he may ask for
`atan(v²/(g·R))`.

**The test.** `AttachedRider`'s mount seeds the latch from the magnitude of the board's **world** velocity, and a flush
placement is given `forward × entry + flow`, so its speed *through* the water at frame 1 is the entry exactly. Two
entries either side of the threshold therefore differ **in the latch and in almost nothing else**. 15 placements, one
Canyon B sea, seed 1, `SINK = 0.06`, followed **3 s** each (`results/stand-entry-sweep.txt`):

| entry, m/s | planing at frame 1 | lean cap at frame 1, rad | fell at, s | past the feet ACROSS, peak, m | past ALONG, peak, m | wetted, m² | the feet's depth, m |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.00 | 0 | 0.000 | **0.950** | 0.444 | 0.0000 | 0.516 | 0.268 |
| 3.00 | 0 | 0.000 | **1.033** | 0.495 | 0.0000 | 0.461 | 0.283 |
| 3.50 | 0 | 0.000 | **1.100** | 0.521 | 0.0000 | 0.461 | 0.292 |
| **3.80** | **0** | **0.000** | **1.167** | 0.571 | 0.0000 | 0.440 | 0.301 |
| **3.90** | **1** | **0.324** | **1.183** | 0.565 | 0.0000 | 0.446 | 0.301 |
| 3.95 | 1 | 0.332 | 1.200 | 0.561 | 0.0000 | 0.446 | 0.303 |
| 3.99 | 1 | 0.338 | 1.200 | 0.559 | 0.0000 | 0.446 | 0.301 |
| 4.01 | 1 | 0.341 | 1.217 | 0.558 | 0.0000 | 0.446 | 0.304 |
| 4.05 | 1 | 0.347 | 1.217 | 0.552 | 0.0000 | 0.448 | 0.302 |
| 4.10 | 1 | 0.355 | 1.233 | 0.540 | 0.0000 | 0.451 | 0.303 |
| 4.20 | 1 | 0.370 | 1.250 | 0.522 | 0.0000 | 0.457 | 0.301 |
| 4.50 | 1 | 0.417 | 1.350 | 0.408 | 0.0000 | 0.461 | 0.300 |
| 5.00 | 1 | 0.498 | 1.550 | 0.339 | 0.0000 | 0.465 | 0.278 |
| 6.00 | 1 | 0.658 | 2.000 | 0.365 | 0.0000 | 0.452 | 0.181 |
| 8.00 | 1 | 0.931 | **2.933** | 0.722 | 0.0356 | 0.380 | **0.077** |

**The latch is worth one frame.** Across the threshold — 3.80 against 3.90 m/s, a 2.6 % change in entry — the lean cap
goes from **0 to 0.324 rad (18.6°)**, which is the whole of what the latch does, and the fall moves from **1.167 s to
1.183 s**: **one frame of 60.** Over the sweep as a whole the fall time rises **smoothly and monotonically** with
entry speed, 0.950 s at 2 m/s to 2.933 s at 8 m/s, **with no step anywhere at the threshold.**

**So, of the four: speed through the water is the lever; `planing` is its marker; the wetted hull and the depth are its
consequences** (wetted 0.52 → 0.38 m², the feet's depth 0.268 → 0.077 m as entry goes 2 → 8 m/s); **and the steeper,
lower part of the face is simply where a board gets that speed.** The cause is not the latch, and it is not any of the
four as a state — it is the speed each of them reports.

**Two further things this sweep settles, neither of them asked for.**

* ⚠️ **Every placement falls.** 15 of 15, `'balance'` every time, at 0.950–2.933 s. #429's placement table reported
  *"falls inside the second: 2 of 12 per arm — and both are the 2 m/s entries"*, and that is true **of a 1 s window**:
  the `PLACE` block ran `Math.round(1 / STEP)` frames. Followed 3 s, the flush placement is not a stable laboratory
  either; it is the same fall, later. **Speed buys time and does not prevent the fall.**
* ⭐ **The channel that fails is ACROSS, in 14 of 15.** `pastZ` (the capture point past the feet toward nose or tail) is
  **exactly 0.0000** in every run but the 8 m/s one, while `pastX` reaches **0.34–0.72 m** past the feet's edge. The
  rider goes down **sideways off the board's narrow way**, never over the nose or the tail. This is the decomposition
  the filtered `rawMargin` could not give.

### 4.1 ⭐⭐ And the latch cannot be the cause, because its cap bounds a request that is zero

The take-off runs settle it from the other side. Over **2 123 live standing frames** on seed 1
(`results/stand-seed1-channels.txt`):

| column | what it is | non-zero in | max |
| --- | --- | --- | --- |
| `leanHeld` | the formula itself, `atan(v²/(g·R))` — live whatever the plane | **2 123 of 2 123** | 1.0042 |
| `leanCap` | that value **after** the planing gate | **796 of 2 123** | 1.0042 |
| `leanWant` | **the request the cap bounds**: `steer × railRange` plus the hand | **0 of 2 123** | **0.0000** |
| `leanAsk` | the reference the predictor is actually given | **0 of 2 123** | **0.0000** |

**With the stick at zero the rider asks for no lean, so there is nothing for the cap to bind, so the planing latch has
no consequence for the rider at all.** It is a state variable that nothing in the body reads. The entry sweep's one
frame is therefore not a small effect — it is numerical noise around **no effect**.

So the correlation between planing and a ride that lasts (Parts 5 and 6, which is real and large) **cannot run through
the rider's control authority**. It runs through the board: at speed the hull takes its load dynamically, rises, halves
its wetted area, and lifts the deck clear of the water. **The lever is the board's speed through the water; everything
else on the brief's list is that speed reported by another instrument.**

### 4.2 Three more decompositions a single scalar was hiding

* ⭐ **The fall is sideways, and only sideways.** Past the feet **ACROSS** in **983 of 2 123** standing frames, peak
  **0.824 m**; **ALONG** in **2 of 2 123**, peak **0.003 m**. No rider in this study goes over the nose or the tail.
* ⭐ **The reserve that binds is usually not the one that can kill.** `balanceLimits.limit` over the same frames:
  **knee 1 010, margin 800, grip 313**. Only `margin` — the capture point — can end a ride (`endStep` tests
  `human.fallen` and nothing else of the three), so the balance meter reads the **knees' strength** about half the time
  while the thing that ends the ride is the capture point.
* ⚠️ **`rawMargin` is not a trend and it is not the fall test.** On wave 10 `cue` it reads, frame to frame,
  0.891, 0.840, 0.777, 0.938, 0.559, 0.302, 0.562, 0.859, 0.538, 0.112, **0.000**, **0.000**, 0.107, 0.788, 0.454 and
  then **0.199 at the fall** — it touches zero twice without a fall and is nowhere near zero when the rider goes. And
  in #429's own published trace of wave 8, the smoothed `balanceMargin` had bottomed at **0.090** and **risen back to
  0.234** by the frame the rider separated. The reviewer's warning is confirmed from the data as well as the source:
  **a filtered minimum of three headrooms cannot name the first failing constraint, and here it does not even track
  the fall.**
* **The pinning trap reproduces**, with a bigger factor than before: `limitTime.tip > 0` is **97.6 %** of those 2 123
  frames and `limit === 'tip'` is **21.3 %** — a factor of **4.6**. Say which you mean.

## 5. ⭐ The refusal against the fall: one flag over two opposite conditions

### 5.1 #429's own data, re-counted off its own files

`results/seed1-summaries.jsonl` and `results/seed2-summaries.jsonl` on `claude/take-off-bench`, the `ships` arm alone
(the owner's address with no extra switches), every stand listed:

| | seed 1 | seed 2 |
| --- | --- | --- |
| stands | 18 of 36 runs | 21 of 33 |
| `'feet under water'` | **12** | **3** |
| `'sinking'` | **0** | **15** |
| not refused | 6 | 3 |
| fell inside the 3 s window | 15 | 14 |
| **carried the full 3 s window** | **0 observed** (3 unobserved) | **7** |

**The two seas refuse for different reasons**, so a fix aimed at wet feet and a fix aimed at a board descending into
the surface are different fixes. ⚠️ **And a `sinking` verdict says nothing at all about the feet**: `standRefusal`
returns at `:2789`, before the loop at `:2790` samples a single foot. Those 15 seed-2 stands establish neither wet nor
dry feet. (Part 3 measures both unconditionally and settles it.)

**Seed 1 has no survivors.** Its three apparently-unfallen stands are all **wave 6**, which stood at 16.0167 s on a
trial the bench retired at 16 s: `fsN = 0`, `riding = 0.017`, **one frame stepped**. The other unrefused wave, wave 10,
fell at **0.70 s** — the study's own median. So *"the two stands it does NOT refuse are the only two that stand
planing, lower, on a steeper face, on half the wetted hull"* describes two **unrefused** stands, and **neither of them
survives**. The brief's starred premise does not hold.

**Seed 2's real survivors are all refused stands.** Every one of the 7 that carried 3 s is a `'sinking'` stand:

| wave | script | refusal | planing | lean cap (median, rad) | wetted, m² | up the face at the press | face, m | outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | cue | `sinking` | **1** | 0.539 | 0.350 | 0.750 | 1.894 | **held 3 s** |
| 2 | cue / cueL / cueR | `sinking` | **1** | 0.752 / 0.782 / 0.783 | 0.254–0.257 | 0.722 | 1.669 | **held 3 s** (all three) |
| 11 | cue / cueL / cueR | `sinking` | **1** | 0.750 / 0.781 / 0.781 | 0.255–0.263 | 0.698 | 1.605 | **held 3 s** (all three) |
| 6 | cue / cueL / cueR | `sinking` | 1 | 0.609–0.632 | 0.262–0.273 | 0.782 | 1.799 | fell 0.97–2.30 s |
| 10 | cue / cueL / cueR | `sinking` | 1 | 0.363–0.399 | 0.331–0.349 | 0.779 | 1.939 | fell 0.70–0.93 s |
| 1 | cueL / cueR | `sinking` | 1 | 0.526–0.538 | 0.330–0.331 | 0.750 | 1.894 | fell 0.72–1.00 s |
| 5 | cue / cueL / cueR | **none** | **0** | **0.000** | 0.320–0.331 | 0.774 | 1.412 | fell 0.73–1.17 s |
| 8 | cue / cueL / cueR | `feet under water` | **0** | **0.000** | **0.506–0.507** | 0.875 | 1.131 | fell 0.53–0.55 s |

Read down the table:

* **Planing is necessary and not sufficient.** All 6 non-planing stands fell, inside **0.53–1.17 s**. Of the 15 planing
  stands, **7 held and 8 fell**.
* **On this sea the refusal is anti-predictive** (on seed 1 it is not — see Part 5.3, where the split by verdict
  reconciles the two). 7 of 15 refused stands held; **0 of 3** unrefused stands did, and those
  three fell at 0.73–1.17 s, sooner than the median refused stand.
* ⭐ **So gating the stand on the refusal — which `design.md` §4 plans — would have refused every ride on this sea that
  lasted.** That is the strongest practical finding in this document, and it is an argument against a change the
  project has already written down as settled.
* The ordering that *does* track the outcome is the **lean cap**, which is `atan(v²/(g·R))` gated by the planing latch
  and therefore a reading of **speed through the water**: cap ≥ 0.75 held **6 of 6**, cap 0.36–0.63 held **1 of 9**,
  cap 0 held **0 of 6**.

### 5.2 ⭐⭐ And one column separates them better than any of the four: where on the face the press happened

The same two files, both seas, every stand, sorted by `popFraction` — **how far up the face the rider was at the
frame he pressed.** The independent unit is the **wave** (13 of them across the two seas); the three stands per wave
are the same paddling diverging only after the stand.

| seed | wave | up the face at the press | stands | **held 3 s** | fell | unobserved |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | 11 | **0.698** | 3 | **3** | 0 | 0 |
| 2 | 2 | **0.722** | 3 | **3** | 0 | 0 |
| 2 | 1 | **0.750** | 3 | **1** | 2 | 0 |
| 1 | 6 | 0.755 | 3 | 0 | 0 | **3** |
| 1 | 10 | 0.772 | 3 | 0 | 3 | 0 |
| 2 | 5 | 0.774 | 3 | 0 | 3 | 0 |
| 2 | 10 | 0.779 | 3 | 0 | 3 | 0 |
| 2 | 6 | 0.782 | 3 | 0 | 3 | 0 |
| 1 | 8 | 0.824 | 3 | 0 | 3 | 0 |
| 1 | 11 | 0.839 | 3 | 0 | 3 | 0 |
| 1 | 7 | 0.841 | 3 | 0 | 3 | 0 |
| 1 | 12 | 0.854 | 3 | 0 | 3 | 0 |
| 2 | 8 | 0.875 | 3 | 0 | 3 | 0 |

**Pressed at or below 0.750 up the face: 6 held of 6** (plus wave 1's two stick runs, which fell — the only runs in
the table where the stick mattered). **Pressed at 0.755 or above: 1 held of 33**, and that one is wave 1 again at
exactly 0.750. Ten waves, thirty stands, above the threshold: **none held.** No other column in this study — not
planing, not the wetted hull, not the slope, not the landing peak — separates the two groups without overlap.

**And the cue has no upper bound on it.** `inTakeOffWindow` (`takeOffCue.ts`) asks `frame.faceFraction >= HIGH_ON_FACE`
with **HIGH_ON_FACE = 0.5 and no ceiling**; the only upper bound in the window is on `aheadOfCrest`. So the game's own
cue is content to light at **0.875** up the face, and on this evidence a press there is a ride of 0.53 s.

⚠️ **Read the mechanism before reading it as a fix.** The cue's two halves do not become true together: its geometric
half is satisfied early and its **speed** half (`speedShoreward ≥ 0.8 × crestSpeed`) only once the wave has taken the
board, by which time the rider has been carried high. Capping the cue's face fraction would therefore not move the
press down the face — it would mostly stop the cue lighting at all. Part 6 measures what a press **lower** on the face
actually produces, using the rules that fire there.

### 5.3 ⭐ The same question on my own run, with the window actually followed — and a correction to the correction

Seed 1, 12 waves, five pop timings, **34 stands of 60 runs**, `truncated = 0` (every stand was followed its full 3 s):

| the refusal, as the game returns it | held the full 3 s | fell | median fall |
| --- | --- | --- | --- |
| **not refused** | **3** | 2 | 0.700 s |
| refused `sinking` | **1** | 2 | 1.083 s |
| refused `feet under water` | **0** | 26 | 0.633 s |
| any refusal | 1 | 29 | 0.633 s |

**⚠️ And wave 6 really does carry the window.** #429's wave 6 was unobserved — `fsN = 0`, one frame stepped, the trial
retired beneath it — so its "survival" was **not evidence**. With the harness fixed and the window actually followed,
wave 6 stands at 16.017 s and is **still up 3.02 s later**, on both scripts that reach it. So the right correction is
narrower than "the survivor was an artefact": **the artefact was in the evidence, not in the outcome.** It is a real
ride, and it was reported without having been watched.

**Wave 10 is the other half of the story, and it is the lever test** (`results/stand-seed1-wave10-popdelay.txt`) —
one wave, one sea, identical paddling, the press moved by a quarter and a half second:

| script | pressed at | stood at | speed through the water | lean cap | up the face | slope | wetted | the feet | outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cue` | 7.02 s | 8.22 s | **4.26 m/s** | 0.390 | 0.84 | 15.9° | 0.263 m² | dry | **fell 0.700 s** |
| `cued250` | 7.27 s | 8.47 s | **4.42 m/s** | 0.416 | 0.82 | 16.3° | 0.263 m² | dry | **held 3.00 s** |
| `cued500` | 7.52 s | 8.72 s | **4.56 m/s** | 0.442 | 0.78 | 18.0° | 0.206 m² | dry | **held 3.00 s** |

**A quarter of a second of delay turned a 0.70 s ride into a 3 s one**, and it did so by standing the rider a little
lower on a slightly steeper face with 0.16 m/s more speed through the water. The boundary is that sharp. (On the waves
where no stand reaches 4 m/s at all — 7, 8, 11, 12, with latch speeds of 2.1–3.7 — the same delays move the fall
around between 0.50 s and 1.65 s and never produce a ride.)

**Across the two seas, the refusal's two categories mean opposite things:**

| verdict | held | of | where |
| --- | --- | --- | --- |
| `feet under water` | **0** | **29** | my seed 1 (0 of 26) + #429's seed 2 (0 of 3) |
| `sinking` | **8** | **18** | my seed 1 (1 of 3) + #429's seed 2 (7 of 15) |
| not refused | 3 | 8 | my seed 1 (3 of 5) + #429's seed 2 (0 of 3) |

⭐ **`feet under water` is a death sentence and `sinking` is not.** And the reason the two differ is mechanical, and it
can be put as arithmetic rather than as a correlation.

`standRefusal`'s sinking test is `into > SINK_RATE`, where `into` is `−(v_rel · n̂)` — the board's velocity **relative
to the local flow**, along the inward normal of the free surface. That is not a quantity peculiar to a board going
under: **it is the defining kinematics of a planing surface**, whose whole lift is `∝ ρ V² sin α` for a trim angle α
against the oncoming water. So `into ≈ V sin α`, and with `SINK_RATE = 0.3 m/s` the trim that trips it is:

| speed through the water | trim angle that reaches `into = 0.3` |
| --- | --- |
| 3 m/s | 5.74° |
| 4 m/s | **4.30°** |
| 5 m/s | **3.44°** |
| 6 m/s | **2.87°** |
| 8 m/s | 2.15° |

Planing trim on a board is a few degrees, so **above about 4 m/s the test is tripped by ordinary planing** — and 4 m/s
is `PLANING_SPEED` itself.

**And `into` on a planing board measures exactly that trim.** Inverting it frame by frame — `asin(into / V)`, over the
796 live planing frames — gives a median of **+2.60°** (quartiles +0.23° and +5.50°) at a median speed through the
water of **6.21 m/s**; and `6.21 × sin(2.60°) = 0.282 m/s`, which is the measured median `into` of **+0.280 m/s** to
the last digit. **That is not a board descending 0.28 m/s into the sea for seconds on end; it is a hull riding at
two and a half degrees of trim.** On the 1 317 non-planing frames the implied angle is larger (**+5.48°**) but the
speed is only **1.89 m/s**, so `into` stays near **+0.194 m/s** and the test rarely fires.

That is why the overlap is partial rather than total: `into > 0.3` holds in **47.9 % of planing frames** against
**18.8 % of non-planing ones**.

**And the clincher: integrate it.** If `into` were the descent rate the test's name claims, its integral over a ride
*is* the sinking. Over the four seed-1 rides that carried the window:

| run | standing frames | `sinking` frames | the board's own draft, first → last (min/max) | ∫`into` dt | over-read |
| --- | --- | --- | --- | --- | --- |
| wave 10 `cued250` | 181 (3.00 s) | **129** | **−0.055 → −0.015 m** (−0.077 / +0.024) | **+1.126 m** | **27.9×** |
| wave 10 `cued500` | 181 (3.00 s) | 108 | −0.073 → −0.030 m (−0.086 / +0.036) | +0.958 m | 22.0× |
| wave 6 `cue` | 182 (3.02 s) | 45 | −0.064 → −0.020 m (−0.081 / −0.019) | +0.513 m | 11.5× |
| wave 6 `lift` | 182 (3.02 s) | 45 | −0.064 → −0.020 m (−0.081 / −0.019) | +0.513 m | 11.5× |

**The test says the board descended 1.13 m; the board moved 0.040 m, and never left a 0.10 m band — on the negative
side of it, the deck above the water, the whole time.** `standRefusal`'s `sinking` verdict is not reporting a board
going under. It is reporting a hull on the plane.

**So `sinking` cannot distinguish a board going under from a board riding on its own lift**, it fires more than twice
as often on the latter, and the stands it refuses are disproportionately the good ones.

**Which settles the design question.** `design.md` §4 plans to turn the refusal into a gate that lies the rider back
down. On this evidence that gate would refuse **8 of the 9 rides in this study that lasted** (every `sinking` one), and
it would be refusing them for a test that is partly a detector of the very thing those rides have.

## 6. ⭐ Is a longer ride reachable from the take-off's side? Yes, and here is what it costs

**It is not a null.** Counting only stands that were actually followed their full window:

| sea | stands | **held the full 3 s** | waves that produced them | truncated |
| --- | --- | --- | --- | --- |
| seed 1 (this round, 5 pop timings) | 34 | **4** | 2 of 12 (waves 6, 10) | 0 |
| seed 2 (#429's own files, 3 scripts) | 21 | **7** | 3 of 11 (waves 1, 2, 11) | 0 |

**9 rides of 55 stands carried their window, on 5 waves of 23.** So the take-off can deliver a ride; it delivers one
rarely, and what it delivers is decided at the stand by one quantity.

**Held against fell, seed 1, plain medians** (`results/stand-seed1-held.txt`; held 4 — two independent waves — against
fell 30):

| at the stand | held | fell |
| --- | --- | --- |
| **speed through the water, m/s** (the latch's own test) | **4.422** | **2.169** |
| planing | 1 | 0 |
| wetted hull, m² | **0.263** | **0.558** |
| up the face | **0.789** | **0.937** |
| face slope under the board | **16.9°** | **8.1°** |
| ahead of the crest, m | **2.13** | **1.18** |
| **the feet's depth, m** | **−0.000** | **+0.365** |
| the descent into the surface, m/s | **0.384** | 0.182 |
| the front foot's **load share** | 0.432 | 0.681 |
| load at the feet, bw | 0.833 | 1.043 |
| landing peak, bw | 1.415 | 1.183 |
| capture margin, min over the first second | 0.542 | **0.000** |
| grip left, min | 0.876 | 0.414 |
| knees left, min | 0.399 | 0.527 |
| **past the feet ACROSS, peak, m** | **0.000** | **0.394** |
| **past the feet ALONG, peak, m** | **0.000** | **0.000** |
| roll peak in the first second | 5.1° | 27.8° |

**Read as one event, this is a drop-in.** The ride that lasts stands **lower on a steeper face, further ahead of the
crest, descending into the surface twice as fast, making twice the speed through the water, on half the wetted hull,
with the deck clear of the water and the weight off the front foot.** The ride that dies stands high on a flattening
crest on a buried board. Those are not two lists of properties; they are a rider who got down the face and a rider who
did not.

**⚠️ And "he never gets down the face" is a statement about the falling runs only.** #429 concluded *"the drop-in never
happens: the whole measured ride is spent on the crest."* On the 4 seed-1 rides that lasted the drop-in does happen —
the stand is 0.78–0.84 up a 15.9–18.0° face and the board is descending into the surface at 0.355–0.490 m/s, and on
wave 10 `cued250` the speed through the water runs from 4.42 m/s at the stand to **7.36 m/s** a second later. The
generalisation was drawn from a population that happened to contain no such ride.

**What it costs, and why this is narrow.** The take-off's only handles on that speed are *when* the press happens and
*how fast the paddle got the board going*, and the cue sits on the late edge of a narrow window:

* **press later** (wave 10, +250 ms): speed through the water 4.26 → 4.42 m/s, and a 0.70 s ride becomes a 3 s one.
  But on a wave that cannot reach 4 m/s at all (waves 7, 8, 11, 12, at 2.1–3.7 m/s) the same delay buys nothing —
  it moves the fall between 0.50 s and 1.65 s and never produces a ride;
* **press earlier** is measured and it is much worse. The `early` rule (2 s before the crest arrives) stands the rider
  on a board buried **0.598–0.992 m** at the feet over **0.579–0.621 m²** of hull, and every one of those 11 stands
  fell, in **0.350–1.767 s**, median 0.400 s. #429 found the same thing on the waves the cue ignores;
* **the `lift` rule is not a third option at this spot.** On every wave where the cue lights, `lift`'s numbers are
  identical to `cue`'s to every decimal, because the cue fires first.

So the honest answer to the brief's fourth question: **a longer ride is reachable, the gate is the board's speed
through the water at the stand, and the take-off reaches it on about one wave in five at Canyon B, Medium.** Nothing
the rider's body does changes it, which is why every attempt on this track to find the fix in the rider has failed.

## 7. Options, with their costs — the owner rules

**Nothing here was changed.** These are what the measurements imply, each with what it would cost.

1. ⭐ **Do not turn `standRefusal` into a gate** (`design.md` §4's *"That goes"*). **Cost: none** — it is a decision not
   to build something. **What it buys:** the gate would have refused **8 of the 9 rides in this study that lasted**,
   because they are `sinking` stands and `sinking` is partly a detector of planing (47.9 % of planing frames against
   18.8 % of the rest). If a gate is wanted anyway, `feet under water` is the only one of the four verdicts that is
   actually predictive (**0 held of 29**).
2. **If the `sinking` test is kept, it cannot stay as written.** `into > SINK_RATE` is `V sin α` against the free
   surface, so at `PLANING_SPEED` itself a **4.3°** trim trips it and at 6 m/s a **2.9°** one does — ordinary planing
   trim. A test meant to catch a board going under is reading the lift that holds it up. **Cost:** today the test is
   report-only, so changing it changes **no behaviour at all** — it would reach only the HUD string and any future
   gate. **No new force, no hidden motor; it is a measurement being corrected, not a rule being added.**
3. **The lever is the board's speed through the water at the stand, and the take-off's handle on it is the press's
   timing.** Wave 10 shows +250 ms buying a ride. **Cost:** the cue's speed half (`speedShoreward ≥ 0.8 × crestSpeed`)
   is what makes the press late and high, and its geometric half has **no upper bound on face fraction** (`>= 0.5`,
   no ceiling) so it will light at 0.875 up the face, where nothing survives. Capping the face fraction would mostly
   stop the cue lighting rather than move it down the face, because the two halves do not come true together. **Any
   change here is a change to when the HUD says "POP UP NOW" — it adds no force.**
4. ⚠️ **Do not look for this in the rider's lean authority.** `leanWant` is **0 in all 2 123 standing frames**, so the
   planing gate on the cap binds nothing; and `?askCap=4.5`, which ungates it, produced **the earliest fall in #429's
   whole study (0.42 s)**. This route is measured and it does not work.
5. **The one lever that attacks the 49 kg deficit directly is the board's volume, and it is expensive.**
   `REFERENCE_BOARD` is a **25.75 L** performance shortboard under a **73 kg** rider — a board a competent surfer sinks
   standing still, which is why standing off the plane puts the feet 0.288 m under. **Cost:** the volume is a sourced
   measurement (Connellan et al. 2026, Table 1), and the shape it drives carries the inertia, the added mass, the
   planing scales and the whole P4e calibration, so changing it is a re-calibration and a change to a cited reference,
   not a tweak. **It is listed because it is the only thing measured here that would make a stand off the plane
   survivable; it is not a recommendation.**

## 8. What would refute this, and what I did not measure

* **The held population is 4 runs on 2 waves (seed 1) and 7 on 3 waves (seed 2).** The independent unit is the wave,
  and there are 5 of them. Every median for the held group is a median over a handful of runs on a handful of waves,
  and it is labelled as such everywhere above. A third sea could move the 4 m/s boundary.
* **One spot, one size.** All of this is Canyon B at Medium. A spot or a size where the catch hands the board 5–6 m/s
  through the water would make most stands look like the survivors here, and then the whole of Part 6 is about
  Canyon B at Medium rather than about take-offs.
* **The stick is at zero in every run.** That is deliberate — the owner cannot judge a turn while the ride ends in
  under a second — but it is also what makes `leanWant` zero, and therefore what makes the planing latch inert. **On a
  rider who is actually steering, the cap would bind and Part 4.1's conclusion would need re-measuring.** It would not
  change the entry sweep, which is a placed rider with the steer at zero too.
* **The bench's riders do not push the water** (`addReaction` is a no-op), inherited from `catch-probe` through #429.
  A single rider whose reaction reaches the solver is the one fidelity gap left in the drive.
* **The mirror is not the game's own call, only a bracket around it.** `standRefusal` runs per substep inside
  `prepare`, so the probe's verdict is read one frame early or one frame late; agreement is 30 of 34 at the stand and
  33 of 34 at the last landing frame, and the four disagreements are all within a few hundredths of `SINK_RATE`.
* **`sinking`'s relation to planing is an association, not an identity** — 47.9 % against 18.8 %. The claim that it
  "detects planing" is an inference from the formula plus that association; a direct test would compute the hull's
  angle of attack and compare.
* **Not every fall is the capture point.** Causes on seed 1: `balance` 27, `lost board` 2, `foot slip` 1. And `beyond`
  (the capture point past the feet beyond the rotor's reach) is reached and **survived** repeatedly — on wave 10 `cue`
  at 0.367 s, recovered by 0.467 s, and the rider lasted to 0.700 s. It is the conjunction with `weightPast` that ends
  a ride, so "the demanded centre of pressure leaves the support box" is necessary and not sufficient.
* **I did not measure the drawing.** #429's Part 8 hypothesis about `?trunk=mass` deleting the rig's trunk fold is
  still a source reading needing one drawn frame.

## Appendix: how every number here was made

    ./node_modules/.bin/rolldown docs/research/new-rider/take-off/stand.ts -o <s>/raw.mjs --format esm --platform node
    printf "globalThis.location = { search: '' };\n" > <s>/stand.mjs     # an OBJECT, never a string
    cat <s>/raw.mjs >> <s>/stand.mjs
    cd <s>

    # Part 4, the entry sweep (PERIODS=0: no waves, the placement block alone)
    env SEED=1 PERIODS=0 PLACE=1 STAND_HOLD=3 LOG=none \
      ENTRIES=2.0,3.0,3.5,3.8,3.9,3.95,3.99,4.01,4.05,4.1,4.2,4.5,5.0,6.0,8.0 \
      OUT=<s>/place1.jsonl node --max-old-space-size=3200 stand.mjs
    python3 -I docs/research/new-rider/take-off/stand.py <s>/place1.jsonl --place

    # Parts 3, 5, 6: the take-off, two seas, five pop timings
    env SEED=1 PERIODS=12 SCRIPTS=cue,cued250,cued500,lift,early LOG=window STAND_HOLD=3 \
      OUT=<s>/s1.jsonl node --max-old-space-size=3600 stand.mjs
    env SEED=2 PERIODS=12 SCRIPTS=cue,cued250,cued500,lift,early LOG=window STAND_HOLD=3 \
      OUT=<s>/s2.jsonl node --max-old-space-size=3600 stand.mjs
    python3 -I docs/research/new-rider/take-off/stand.py <s>/s1.jsonl              # the stands
    python3 -I docs/research/new-rider/take-off/stand.py <s>/s1.jsonl --refusal    # the sequence
    python3 -I docs/research/new-rider/take-off/stand.py <s>/s1.jsonl --held       # held vs fell
    python3 -I docs/research/new-rider/take-off/stand.py <s>/s1.jsonl --trace 8 cue

    # the probe's own inertness
    env SEED=1 PERIODS=8 SCRIPTS=cue,lift PROBE=on  LOG=none OUT=<s>/ctrl-on.jsonl  node stand.mjs
    env SEED=1 PERIODS=8 SCRIPTS=cue,lift PROBE=off LOG=none OUT=<s>/ctrl-off.jsonl node stand.mjs
    python3 -I docs/research/new-rider/take-off/stand.py <s>/ctrl-on.jsonl --control <s>/ctrl-off.jsonl

☠️ Every invocation uses `env`: in zsh `SECONDS=…` passes through the shell's special **integer** variable and arrives
as `"0"`. This file has no `SECONDS`; its horizons are `STAND_HOLD` and `PERIODS`.
