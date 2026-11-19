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
