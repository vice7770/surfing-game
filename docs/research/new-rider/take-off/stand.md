# The stand itself: what the refusal costs, why the feet are under water, and what a ride needs to last

**The round's question**, from PR #429's bench: `standRefusal` returns `'feet under water'` in 12 of 18 stands, the
rider stands anyway, and he is gone in a median 0.750 s. What does the refusal cost? Why are the feet under water?
And the starred one: two stands were **not** refused, and they were *planing, lower on a steeper face, on half the
wetted hull* — which of those four is the cause?

**The answer, in six lines.**

1. **The refusal costs nothing.** `standRefusal`'s return value has exactly **one** consumer in the whole source tree
   — a string in the dev-tools readout. The stand happens on the next line whatever it says, and no force, no
   threshold and no phase anywhere reads it. It is a label, not a gate (Part 1).
2. **⭐ And it must not become one.** The project's own design says it should (`design.md`: *"`standRefusal` today only
   reports… That goes"*). On the evidence here, gating the stand on it would have **refused every ride that lasted**:
   on seed 2, all 7 of the stands that carried a full 3 s were refused stands (Part 5).
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
5. **The refusal does not predict the fall in either direction** — and the brief's two survivors do not survive. One
   of them (seed 1, wave 6) was a **harness artefact**: it stood at 16.0167 s on a trial the bench retired at 16 s, so
   it was observed for one frame. The other fell at 0.70 s, the study's median. On seed 1, **no stand survived at all**
   (Part 5).
6. **A ride can last, and what it needs is measurable at the stand.** On seed 2, 7 of 21 stands carried the full
   window, and every one of them was planing, with a lean cap of 0.54–0.78 rad; every non-planing stand on that sea
   fell inside 1.17 s. So the answer to *"is a longer ride reachable from the take-off's side"* is **not a null**: it is
   reachable on the waves that give the board speed through the water, and the take-off's job is to put the rider on
   one (Part 6).

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

## 5. ⭐ The refusal against the fall: it predicts nothing, in either direction

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
* **The refusal is anti-predictive here.** 7 of 15 refused stands held; **0 of 3** unrefused stands did, and those
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
