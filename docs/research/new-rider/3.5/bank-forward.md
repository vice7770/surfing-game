# `HUMAN_BANK_FORWARD` is not in the owner's loop, and the lag is not the delay

> **⭐ THE LEVER IS DEAD CODE ON HIS ADDRESS, PROVED BY MEASUREMENT AND NOT BY READING.** `HUMAN_BANK_FORWARD` *is*
> what PR #421 describes — a feed-forward on the player's own command, `K_ref θ_ref` in the ankle's commanded rest —
> but the line that reads it, `humanBank` [R, `AttachedRider.ts:3609`], **never runs on `?rider=new`**:
> `predictiveBank` takes every frame unless `options.humanGains` is passed [R, `:2527`, `:3600`], and **no URL switch
> sets `humanGains`** — it exists for probe sweeps only. Measured rather than asserted: the constant rebuilt at
> **0, 0.05, 0.4, 1 and 2** and run on the analytic face gives **1 050 840 column-values over 5 × 5 256 frames, 0
> differences**, and at **2.0 — twenty times the shipped value — on the owner's own Canyon spot it gives 285 898
> values over 7 526 frames, 0 differences, 90 of 90 run summaries identical.** The same rebuild method applied to the
> sensing delay changes **62 594–90 359 values and 62–66 of 72 run outcomes**, so the test can see a constant change.
>
> **⭐ AND WHERE IT IS LIVE, RAISING IT MAKES THE FALL WORSE BY DRIVING THE VERY QUANTITY THAT PINS THE STANCE.**
> On a matched 0.3 s window of the same 90 Canyon riders, the reflex law at feed-forward 0.1 → 2.0 multiplies the
> **deck's own roll rate by 8.6 ×** (median 5.39 → 46.36 °/s), the mismatch by **6.5 ×** (0.889 → 5.812°) and the
> share of frames with the contact pinned from **12.2 % to 39.5 %**; the median ride falls **1.000 → 0.300 s**. The
> mismatch is lag × rate and **the lever drives the rate**: the ankle's torque pushes the body across its leg
> (`rhs[7] -= h (ankleTorque + swingTorque) / length`, [R, `:4731`]) and the board feels it **through the contact
> force at the feet** — the centre of pressure, which `project` then has to keep inside the support. So a bigger
> commanded rest is a bigger demand on the contact, and 3.5d's own 45–56 % of the deck's roll acceleration is the
> channel it arrives by. **An anticipation large enough to matter is a disturbance.**
>
> **⭐⭐ AND THE LAG IS NOT `BALANCE_DELAY`.** #421's *"1.0000 at six frames = 0.100 s, which is `BALANCE_DELAY` to
> the millisecond"* is a coincidence that does not survive a sweep **of `BALANCE_DELAY` itself**. **With the delay cut
> to one frame — a sixth of the shipped value — the follow gain still reaches 1.000 at 0.1016 s on his own spot.**
> Over the whole twelvefold sweep the lag stays inside **0.081–0.120 s** there and **0.052–0.078 s** on the face, and
> on matched windows the mismatch-per-rate constant moves at only **0.131 ms per ms** (sea) and **0.233** (face),
> leaving **53 ms of the shipped 72 and 52 ms of 81 at zero delay: 64–74 % of the lag is not the sense.**
>
> **So the recommendation is the one the brief asked for if the null held: STOP ATTACKING THE LAG.** What is left of
> it after the sense delay is the body on the ankle spring, and the arithmetic of the code's own three constants says
> what that costs: at the bench's own measured pendulum length a **step** in the ankle's commanded rest has delivered
> **4.3 % of itself at 0.100 s and 50.1 % at 0.400 s** (1.7 % and 23.0 % at the tall stance's 0.849 m), against a
> deck that banks 20° in 0.68 s. **No gain on a command can beat that, because the gain does not change the spring.**

---

## 0. What this round did not do, said first

- **It built nothing.** No byte under `src/` or `server/` is changed on this branch; the only files added are the
  probe and its reader under `docs/research/new-rider/3.5/`. The sweeps were run by **rebuilding the probe bundle
  against a temporarily edited constant and restoring the file every time** (`git checkout --` after each build,
  `git status` clean), with the compiled constants printed in each run's own head row.
- **It did not reduce the lag**, and §5 says why no joint can without a prescription.
- **It did not touch the ankle's stiffness, the hull's roll stiffness, the bank clamp, the wave or the ±0.130 m
  stance** — the brief's settled dead ends.
- **It did not build a switch**, because the sweep's answer was a null on the shipped path: there is nothing to put
  behind a switch.
- ⚠️ **It is on `main`, not on #421.** `?bodyBank=hip` lives on `claude/body-banks` and is not merged, so every arm
  here is the **shipped** rider and the baseline to read against is #421's **`ships`** column, not its `bodyBank=hip`
  column. §2 shows this bench reproduces that `ships` column. **The brief's "baseline to beat" — `tip` 66/90, pinned
  32.3 %, ride 1.083 s, roll peak 52.4° — is the `bodyBank=hip` arm, and nothing here is offered against it, because
  nothing was built.** It would not change the lag answer either: #421 measured the follow gain on its own switched
  arm at **0.8718** against the shipped **0.8748**, so the term moves the contact's bound and not this loop's timing.
- **One thing I got wrong and my own control caught:** the plant-recovery estimator in §5 returned coefficients of
  10⁴⁴ because a Gauss elimination divided its pivot row by an already-normalised pivot. The synthetic control was
  there to catch exactly that and did. Fixed, the control recovers a known plant to 2 %.
- **One thing in §6 I am flagging rather than resolving**, because it reframes #421's headline and deserves its own
  round.

---

## 1. What `HUMAN_BANK_FORWARD` actually is — the reading, before any number

`AttachedRider` holds it in one field and reads that field in one expression:

```ts
this.bankForward = options.humanGains?.forward ?? HUMAN_BANK_FORWARD;                      // :2526
this.predictive  = this.newRider && options.humanGains === undefined;                       // :2527
...
private humanBank(h, roll, rail, rollRate) {
  if (this.predictive) { this.predictiveBank(h, roll, rail, rollRate); return; }            // :3600
  ...
  const wanted = this.bankForward * this.bankReference - this.bankGain * bank
               - this.bankRateGain * human.sensedBankRate() - this.anklePlumb * roll;       // :3609
```

So **the description in the brief is right about the term and wrong about where it lives:**

| the claim | the reading |
|---|---|
| *"a feed-forward on the player's own steering command"* | ✅ `bankReference` is the eased lean the player asks for (the steer and the hand) [R, `:2199`, `:3538`], and `bankForward` multiplies it with no sense and no delay in front of it. |
| *"it must still bank the body through a joint, with the reaction paired"* | ✅ `wanted` is the **ankle's commanded rest**, clamped to the feet's reach and the rail's bite; the ankle spring then acts on `bank.angle − roll − ankleRest`, and what the rest asks past HIP_SHARE of the reach goes to the hip rotor, whose couple is already booked on the board. **No new force exists in this term.** |
| *"already in the code at 0.1"* | ⚠️ True as a constant and **false as a lever on the owner's address**: `:3609` is inside `humanBank` after the `predictive` early return, and `predictive` is true for every `?rider=new` rider that is not handed `humanGains`. |
| *"the next thing I would measure"* | ✅ and the measurement's answer is §3. |

**There is no `humanGains` switch.** `grep -rn humanGains src server` returns `AttachedRider.ts` and nothing else —
no `PhysicalMode` dev param, no `SurfZoneConfig` field. The only way to reach `:3609` is from code, which is what
the field's own comment says: *"the roll balance's gains in place of HUMAN_BANK_GAIN… (for the probes' sweeps only)"*
[R, `:1544`].

### What the shipped rider has instead

`predictiveBank` has its own feed-forward and it is not a scalar: `steadyTurn(Φ, Γ, −leanAsked, …)` solves the
**steady turn that holds the lean asked** and the command is `u = ref.u − K (x̂ − ref.x)` [R,
`predictiveBalance.ts:1592–1608`]. The reference carries the ankle's own rest (state 8), so the player's command
already arrives as a feed-forward on every tick, at the gain the plant says balances it — not at 0.1.

> **⚠️ Consequence for any sweep: passing `humanGains` to move `HUMAN_BANK_FORWARD` also replaces the whole
> controller** — the Smith predictor and both LQR channels go away and step 3.2's delayed reflex law takes over,
> which is a different plant, a different reference and a different twist channel [R, `:2205`]. §3 therefore reports
> `ships` and `g0.1` separately: `ships → g0.1` is the controller flip with the lever held, `g0.1 → g2` is the lever
> with the controller held.

---

## 2. The instrument, and that it reproduces #421 before it is believed

`3.5/forward.ts` (the rig) and `3.5/forward-read.ts` (the reader), both new, both read-only. No ledger is turned on.
The private columns (`limit`, `limitTime`, `desiredCop`, `legLoad`, `rawMargin`, `ankleRest`, `swingTorque`,
`bankReference`, `leanAsked`, `schedRail`, `support`, `legLength`) are read through one cast that only gets.

- **The sea bench, the owner's own address and spot:** `?canyonWaves=true` as an **object** on `globalThis.location`
  (a bare string silently benches the default Canyon through `devTools.ts:9`), `canyonBed: 'b'`, seed 1, medium,
  stage 2, `compute: 'cpu'`. **Read off the solver and printed: grid `400 × 451 = 180 400` — Canyon B — spun up on
  the CPU in 64.9 s wall**, `search` echoed as `?canyonWaves=true`. **90 riders an arm** = 10 entry speeds (3–12 m/s)
  × 3 stances × 3 trials 1.5 s apart, placed 0.75 m seaward of the break point at 45° off the fall line, **stick hard
  over**, `rider: 'new', feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on'`.
- **The face bench, the second population:** the Canyon-matched `FaceWater` (1.4 m, 5.7 m/s) at 12/16/20°, 4 entry
  speeds, 3 stances, 2 sticks = **72 riders an arm**.
- ⚠️ **`SINK = 0.06` m in every arm**, and it is a column rather than a claim: frame 1's draft is **0.0611 m (span
  0.0598–0.0633) and the leg load 678.6 N, 0 of 72 runs dry**, against the flush placement's **0.00024 m
  (−0.0004–0.0012), 604.7 N and 30 of 72 dry** — and the flush arm's outcomes differ from the sunk arm's on **68 of
  72 runs**, so this is not a cosmetic choice.
- ⚠️ **Every run is cut at its first `attached == 0`** (`separate` [R, `:5227–5232`] never clears `phase` or
  `upright`, so every rider column freezes afterwards). **Kept: 7 436 of 7 526 sea frames and 5 184 of 5 256 face
  frames on the shipped arm** — the 90 and 72 dropped are one a run, the frame the rider came off on.
- **Every median below is a PLAIN median** (the mean of the two middle elements at even length), never this folder's
  `qt(v, 0.5)` upper middle, and **every share is printed beside its own count**.

### The controls, and what a broken result would have looked like

| control | a break would look like | what it showed |
|---|---|---|
| **the `tip` detector fires** | `tip` reading 0 of 90 would mean the detector is broken, not that nothing pinned (the fault: `limit` is one substep of 16–32, so every bind is read off `limitTime` rising) | **90 of 90 sea riders, 71 of 72 face riders** ✅ |
| **the identity test can see a change** | 0 differences everywhere would make §3's null meaningless | the delay constant through the same rebuild path: **87 944–90 359 of ~206 000 values differ, 62–66 of 72 run outcomes differ** ✅ |
| **the lever is live where it is claimed to be** | the `gX` arms reading the same as `ships` would mean a dead probe rather than a dead code path | the commanded rest's own median rises **0.483° → 1.957 → 5.179 → 9.780 → 10.963** across g0 → g2 and `corr(ask, rest)` **−0.17 → 0.27 → 0.90 → 0.88 → 0.85**; `restPeak` reaches **14.322°**, which is ANKLE_REST_RANGE = 0.25 rad exactly ✅ |
| **the probe is inert** | the extra reads changing the solve | `INERT=1` (every private read, the per-patch draft sweep and the second water sample skipped): **72 of 72 face run outcomes identical in (frames, fellAt, cause)** ✅ |
| **the plant estimator works** | the §5 fit returning anything it likes | a **synthetic second-order plant with known coefficients**, integrated on 16 substeps a frame and sampled at the frame as the game's dump is, recovered as **a1 −24.309 (known −23.81), a2 −2.346 (−2.381), a3 14.702 (14.4), R² 1.000** — and it **caught a real bug in my own elimination** first ✅ |
| **the mismatch is not a tautology** | the two columns being one read would make it identically 0 | `bank` is `AttachedRider.bank.angle` (the body's lean over its feet from the world's vertical), `roll` is `atan2(up · side, up.y)` off the board's orientation — `prepareBank`'s own `roll`; neither is computed from the other, and the shipped arm's own median is 2.951° ✅ |
| **no filter against `NaN`** | tonight's own published zero | every threshold is `Number.isFinite(x) && …` and every share prints its count ✅ |
| **the populations are matched where arms are compared** | an arm with shorter rides contributing fewer and later frames | `CAP=n` truncates every run to its first n live frames; the gains ladder is read at **CAP=18 (1 261–1 504 frames an arm)** and the delay ladder at **CAP=36 (2 123–2 250 frames an arm)**, both printed ✅ |

### It reproduces #421's `ships` column

| | #421 `ships` | this bench, shipped |
|---|---|---|
| live frames | 7 208 | **7 436** |
| `d(body bank)/d(deck bank)` at lag 0 | 0.8748 | **0.8782** |
| median \|mismatch\| at lag 0 | 2.950° | **2.951°** |
| the follow gain reaches 1.000 at | **6 frames = 0.100 s** | **6.30 frames = 0.105 s** |
| `tip` fired | 90/90 | **90/90** |
| median ride | 1.333 s | **1.367 s** |
| board roll, median peak | 65.651° | **66.842°** |
| board roll rate, median / median peak | 55.140 / 194.660 °/s | **49.224 / 210.462 °/s** |
| mismatch/rate, sea, 20 °/s and up | 40.0–79.9 ms | **38.8–87.0 ms** |

**Two columns do not reproduce and both are placement, not physics:** the median first `tip` frame (**24** against 46)
and the share of live frames with `tip` binding (**22.1 %** against 52.0 %). My trials land on a nearly level face
(the placement's own slope reads 0.27°, 2.74° and 2.77° on the three trials) where #421's rig is not described in
enough detail to reproduce exactly. **Every quantity this round's questions turn on — the follow gain, the lag at
which it reaches 1, the mismatch and its relation to the rate, the roll peak and rate, the ride — reproduces.**

---

## 3. The sweep the brief asked for

### 3.1 On the owner's own address the constant does nothing — five values and a 20 × overshoot

Each value is a **rebuild of the probe against an edited `humanBalance.ts`**, with the compiled constant printed in
the run's head row; every other byte of the bench is the same.

| `HUMAN_BANK_FORWARD` | bench | frames compared | column-values | **differences** | run summaries identical |
|---|---|---|---|---|---|
| 0 (the term removed) | face, 72 riders | 5 256 | 210 168 | **0** | **72 of 72** |
| 0.05 | face | 5 256 | 210 168 | **0** | **72 of 72** |
| 0.4 | face | 5 256 | 210 168 | **0** | **72 of 72** |
| 1 | face | 5 256 | 210 168 | **0** | **72 of 72** |
| 2 (20 × the shipped) | face | 5 256 | 210 168 | **0** | **72 of 72** |
| **2 (20 ×)** | **sea, his own spot, 90 riders** | **7 526** | **285 898** | **0** | **90 of 90** |
| *the positive control: the sensing delay at 0.05 through the same path* | face | 5 141 shared of 5 256 / 6 373 | 206 084 | **87 944** | 10 of 72 |

⚠️ **Two honest notes on that table.** The compared column count is the number of columns that are numeric or string
**in both** dumps on a shared frame (40 on the face pairs, 41 where a `draft` that is null in one run is numeric in
the other, **38 on the sea pair** — the sea baseline was dumped before two read-only columns, `mass` and `legLen`,
were added to the probe, so those two are not in the comparison). That makes the sea row **also a second inertness
proof**: a dump taken before those columns existed and one taken after agree on all 38 they share and on 90 of 90
outcomes.

> **So every column the brief asked for is UNCHANGED at every swept value, to the last bit, because the term is not
> in the loop.** Printed anyway at the two ends of the sweep on his own spot, because the request was for a table:

| sea, 90 riders | `HUMAN_BANK_FORWARD` = 0.1 (ships) | `HUMAN_BANK_FORWARD` = 2.0 |
|---|---|---|
| live frames | 7 436 | 7 436 |
| **the follow gain reaches 1 at** | **6.30 frames = 0.1050 s** | **6.30 frames = 0.1050 s** |
| mismatch/rate, all frames | 60.0 ms | 60.0 ms |
| `tip` fired / first frame | 90/90 at 24.0 | 90/90 at 24.0 |
| frames `tip` binding | 1 640 = 22.1 % | 1 640 = 22.1 % |
| median ride | 1.367 s | 1.367 s |
| board roll, median peak | 66.842° | 66.842° |
| \|roll rate\| median / per-rider peak median | 49.224 / 210.462 °/s | 49.224 / 210.462 °/s |

> The two runs are **separate processes against separately compiled bundles**, each printing its own compiled
> constant in its head row, and the dumps agree on **every one of 285 898 column-values.**

### 3.2 Where the term IS live, the lever is harmful — and it is harmful through the roll rate

The reflex law of step 3.2 (`humanGains` passed, so `predictive` is false), on the same 90 Canyon riders, the same
spot, the same seatbelt, the same `SINK`. `ships` is the owner's own controller for reference; **the step from
`ships` to `g0.1` is the controller flip, and the steps after it are the lever.**

| per-rider medians, 90 riders | `ships` | `g0` | `g0.1` | `g0.4` | `g1` | `g2` |
|---|---|---|---|---|---|---|
| live frames | 7 436 | 9 662 | 5 004 | 2 269 | 1 945 | 1 846 |
| **median ride, s** | **1.367** | 1.500 | **1.000** | **0.317** | **0.333** | **0.300** |
| `tip` fired | 90/90 | 82/90 | 86/90 | 58/90 | 82/90 | 87/90 |
| first `tip` frame | 24.0 | 61.5 | 44.0 | 20.0 | **6.0** | **4.0** |
| frames `tip` binding | 22.1 % | 9.3 % | 18.2 % | 16.5 % | 28.7 % | **38.4 %** |
| board roll, median peak ° | 66.84 | 74.78 | 81.56 | 5.74 | 6.40 | 8.58 |
| \|roll rate\| median °/s | 49.22 | 9.59 | 52.59 | 27.35 | 36.68 | 53.87 |
| **the follow gain reaches 1 at, s** | **0.105** | 0.062 | 0.040 | 0.039 | never in 0–0.4 s | never in 0–0.4 s |
| **mismatch/rate, all frames, ms** | **60.0** | 42.0 | 47.5 | **130.6** | **145.8** | **122.3** |

⚠️ **Those rows are not matched populations** — a rider who falls at 0.300 s contributes 18 frames and a rider who
holds 1.5 s contributes 90, and the roll peaks of 5.74–8.58° above are mostly *short rides*, not calm ones. Read on
the **same 0.3 s window** (`CAP=18`, 1 261–1 504 frames an arm), the ladder is monotone and says what the lever does:

| matched first 0.3 s, 90 riders | `ships` | `g0` | `g0.1` | `g0.4` | `g1` | `g2` |
|---|---|---|---|---|---|---|
| frames | 1 504 | 1 504 | 1 504 | 1 430 | 1 362 | 1 261 |
| **\|deck roll rate\| median, °/s** | 5.67 | 1.17 | **5.39** | 17.18 | 29.48 | **46.36** |
| per-rider roll-rate peak, median °/s | 44.53 | 4.85 | 17.57 | 51.26 | 85.61 | **98.94** |
| **median \|mismatch\|, °** | 0.949 | 0.032 | **0.889** | 2.198 | 4.666 | **5.812** |
| frames `tip` binding | 14.4 % | 12.2 % | **12.2 %** | 12.4 % | 27.2 % | **39.5 %** |
| `tip` fired | 38/90 | 26/90 | 26/90 | 26/90 | 66/90 | 81/90 |

> **The lever multiplies the deck's roll rate by 8.6 × and the mismatch by 6.5 × over the same window.** That is the
> mechanism in one line: the mismatch is `lag × rate`, the feed-forward commands the ankle's rest, **the ankle's
> torque pushes the body across its leg and the board feels that through the contact force at the feet** (`rhs[7]`,
> [R, `:4731`]; 3.5d measured that channel at 45–56 % of the deck's roll acceleration), and a larger commanded rest
> is a larger demand on the contact, which then pins. **An anticipation that is large
> enough to matter is a disturbance.** It is the same shape as the result the brief warned me about — `HIP_CAPTURE_GAIN`
> left at 0 three times, the derived hip drive making `tip` fire *earlier* at frame 23.5 against the shipped 46 — and
> this is a **fourth** measurement of that shape **on a different channel** (the ankle's rest, not the hip's torque):
> **on this rider, driving the roll axis harder makes the fall come sooner, whichever joint does the driving.**

**And the lever's own bound, measured, in case anyone wants to argue for a small one:** the commanded rest is clamped
to ±ANKLE_REST_RANGE = 0.25 rad = **14.32°**, and `restPeak` reaches **14.322°** at `g2` — the clamp. So the whole
authority a feed-forward on this channel can ever have is **14.32° of ankle rest**, and at the shipped 0.1 with the
ask capped near 50° it is asking for ~5° of it.

---

## 4. Is the lag the sensing delay? No — swept, and it is not

Both the sense line's own `BALANCE_DELAY` and the internal model's `PREDICT_DELAY` were moved **together** (they are
the same number in two files [R, `humanBalance.ts:27`, `predictiveBalance.ts:127–128`]) and the bundle rebuilt at each
value. ⚠️ **The populations are matched by `CAP=36`** (the first 0.6 s of every run, 2 123–2 250 frames an arm),
because longer delays ride shorter and an unmatched read of this ladder is misleading — both forms are below.

### 4.1 The face, matched window

| sensing delay, s | frames | **mismatch/rate, ms** | median ride, s (whole run) | `tip` fired (whole run) | the follow gain reaches 1 at, s (whole run) |
|---|---|---|---|---|---|
| **0.0167** (one frame) | 2 248 | **50.8** | 1.383 | 66/72 | 0.0780 |
| 0.05 | 2 246 | 63.6 | 1.308 | 70/72 | 0.0627 |
| **0.100** (ships) | 2 123 | **81.4** | 1.200 | 71/72 | **0.0519** |
| 0.15 | 2 169 | 92.5 | 0.983 | 67/72 | 0.0690 |
| 0.20 | 2 250 | 91.5 | 1.008 | 68/72 | 0.0571 |

> **Two readings, and they disagree in the way that settles the question.**
>
> 1. **The follow-gain-1 lag does not track the delay at all.** Over a twelvefold change in the delay it stays inside
>    **0.052–0.078 s**, and it is **largest at the shortest delay**. #421's *"0.100 s, which is `BALANCE_DELAY` to the
>    millisecond"* is a coincidence of one value.
> 2. **The mismatch-per-rate constant does track it, but at a slope of 0.23 ms per ms** — a least-squares line through
>    the five points gives **τ = 51.9 ms + 0.233 × delay**, so at **zero sensing delay 51.9 ms of the shipped 81.4
>    would remain: 64 % of it is not the delay.**
>
> ⚠️ And the unmatched read of the same five runs gives **48.3, 48.2, 48.4, 56.9, 59.3 ms** — nearly flat, because the
> longer-delay arms die before they reach the hard part of the face. **The matched window is the honest one and it is
> the one that gives the delay any credit at all.**

### 4.2 The sea, his own spot

**The whole run, 90 riders an arm** (`tip` is read off `limitTime` rising, as everywhere here):

| sensing delay, s | live frames | **the follow gain reaches 1 at, s** | mismatch/rate, all frames, ms | median ride, s | `tip` fired | frames `tip` binding | roll peak, median ° | \|roll rate\| median °/s |
|---|---|---|---|---|---|---|---|---|
| **0.0167** (one frame) | 8 588 | **0.1016** | 68.7 | **1.617** | 89/90 | 20.8 % | 66.58 | 40.57 |
| 0.05 | 8 017 | 0.0810 | 63.3 | 1.483 | 89/90 | 22.2 % | 65.15 | 42.90 |
| **0.100** (ships) | 7 436 | **0.1050** | 60.0 | **1.367** | 90/90 | 22.1 % | 66.84 | 49.22 |
| 0.15 | 6 025 | 0.1204 | 54.6 | 1.192 | 89/90 | 24.9 % | 60.28 | 52.79 |
| 0.20 | 5 601 | never in 0–0.4 s | 61.1 | **1.067** | 89/90 | 27.1 % | 51.66 | 52.66 |

> ⭐ **This is the cleanest single result of the round. With the sensing delay cut to ONE FRAME — a sixth of the
> shipped value — the follow gain still reaches 1.000 at a lag of 0.1016 s, which is the 0.100 s #421 identified as
> `BALANCE_DELAY`.** The lag the body carries behind the deck is **not** the sense delay. Over the whole twelvefold
> sweep it stays in **0.081–0.120 s** and is not monotone in the delay.

**The same five arms on the matched first 0.6 s** (`CAP=36`, 2 850–2 952 frames an arm):

| sensing delay, s | frames | **mismatch/rate, ms** | median \|roll rate\|, °/s |
|---|---|---|---|
| **0.0167** | 2 952 | **50.4** | 21.44 |
| 0.05 | 2 939 | 61.8 | 20.08 |
| **0.100** (ships) | 2 913 | **71.9** | 20.60 |
| 0.15 | 2 861 | 72.9 | 23.06 |
| 0.20 | 2 850 | 76.3 | 25.58 |

> On the matched window the constant does track the delay, at **0.131 ms per ms**: a least-squares line through the
> five points is **τ = 53.1 ms + 0.131 × delay**, so **at zero sensing delay 53.1 ms of the shipped 71.9 would remain
> — 74 % of it is not the delay.** The face gave the same shape and a slightly larger share for the delay
> (τ = 51.9 + 0.233 × delay, 64 % not the delay). **Two populations, the same answer: most of the lag is not the
> sense.**
>
> ⚠️ **And the delay is not free — a shorter one does ride longer.** The median ride goes **1.067 s at 0.20 to
> 1.617 s at one frame**, monotone over all five arms, +52 %. That is a real effect and it is **not a lever**:
> `BALANCE_DELAY` is sourced (leg postural responses start at 90–100 ms; Nashner 1977), the shipped 0.100 s sits in
> that band, and nothing here asks to change it. It is reported because a round that sweeps a constant owes the
> reader what the constant does.

---

## 5. ⭐ Is the lag reducible at all? The arithmetic says no, and the ride says the same

### 5.1 What a command can deliver, from the code's own three constants

The body standing free is a mass on its leg over its feet with the passive ankle across it:
`HUMAN_ANKLE_STIFFNESS = 800` N·m/rad and `HUMAN_ANKLE_DAMPING = 80` N·m·s/rad [R, `humanBalance.ts:50–51`], against
its own toppling stiffness `m g L`. The probe measures `L` on the ride (`legLength`, median **0.694 m**; the height
over the deck, median **0.689 m**) and `m` (**73.00 kg**), so nothing here is assumed:

| L, m | k − mgL, N·m/rad | I = mL², kg·m² | ω, rad/s | **T, s** | ζ | **step delivered at 0.100 s** | at 0.200 s | at 0.400 s | at 0.680 s |
|---|---|---|---|---|---|---|---|---|---|
| **0.676** (#421's own) | 315.9 | 33.36 | 3.077 | **2.042** | 0.390 | **4.3 %** | 15.8 % | 50.1 % | 97.9 % |
| 0.700 | 298.7 | 35.77 | 2.890 | 2.174 | 0.387 | 3.9 % | 14.1 % | 45.6 % | 92.1 % |
| 0.800 | 227.1 | 46.72 | 2.205 | 2.850 | 0.388 | 2.3 % | 8.6 % | 29.5 % | 66.4 % |
| **0.849** (tall, measured) | 192.0 | 52.62 | 1.910 | **3.289** | 0.398 | **1.7 %** | 6.5 % | 23.0 % | 53.9 % |

**T = 2.042 s at #421's own 0.676 m reproduces its 2.05 s from the same three constants.** The row that matters is
the step column: **a feed-forward is a multiplier on a command whose plant delivers 4 % of itself in 0.1 s.** Ten
times the gain is ten times 4 %, and the clamp at 14.32° of rest arrives long before that — which is exactly what
§3.2 measured happening.

### 5.2 The same thing measured on the ride: the command never arrives in full and never arrives early

`d(ankle angle at t)/d(commanded rest at t − lag)` through the origin, 90 Canyon riders, shipped rider:

| lag, s | 0 | 0.033 | 0.067 | **0.083** | **0.100** | 0.133 | 0.167 | 0.267 |
|---|---|---|---|---|---|---|---|---|
| gain | 0.349 | 0.532 | 0.646 | **0.670** | **0.672** | 0.622 | 0.526 | 0.244 |
| corr | 0.250 | 0.388 | 0.471 | **0.486** | 0.485 | 0.441 | 0.362 | 0.138 |

> **The command's best correspondence with the joint it commands is a gain of 0.672 at a lag of 0.083–0.100 s.** It
> never reaches 1 at any lag. ⚠️ This is a ride, not a step test, and the ankle angle is driven mostly by the water;
> the number is a bound on how well a command tracks, not a clean plant response.
>
> ⚠️ **And the clean plant could not be recovered from the ride.** Fitting the body's own bank acceleration to
> `a1 (θ − φ − δ) + a2 (θ̇ − φ̇) + a3 θ` gives **R² 0.17–0.40** with `a1` of inconsistent sign across arms
> (+21.5 on the face's shipped arm, −18.4 on `g0`), while the same estimator recovers a **known** plant to 2 % with
> R² 1.000. **So the ride's bank acceleration is not dominated by the ankle spring** — the water, the contact and the
> rotor carry most of it — and §5.1's arithmetic, not a fit, is what the structural claim rests on.

### 5.3 And the player's command cannot anticipate the roll in the first place

A feed-forward on the command can only cancel roll the command itself causes. On his own spot, shipped rider,
7 346 frames:

| | median | peak |
|---|---|---|
| \|d(lean asked)/dt\| | 28.67 °/s | 80.2 °/s |
| \|deck roll rate\| | 50.36 °/s | **502.5 °/s** |

| correlation | value | the same instrument's positive control |
|---|---|---|
| corr(command rate, deck roll rate) at lag 0 | **0.049** | — |
| the best over 31 lags from 0 to 0.5 s | **0.138 at 0.267 s** | **corr(command, deck roll) = 0.462 at 0.183 s** |

> **The command's level does predict the deck's bank (0.46 — the rider really does steer the board), and its rate
> does not predict the deck's roll rate (0.138 at best, over every lag out of half a second).** The deck's roll rate
> on this bench is the water's, not the player's: its peak is **six times** the command's own. **A feed-forward on the
> player's intention cannot anticipate a disturbance the player is not making.**

### 5.4 So: the lag is structural, and this is the number

- **≈ 52 ms of the shipped 81 ms mismatch-per-rate survives at zero sensing delay** (§4.1's fitted intercept), and the
  sensing delay is sourced at 90–100 ms (Nashner 1977) and is not a number to tune.
- **What remains is the body on the ankle spring**, whose own period is **2.04–3.29 s** across the measured stance
  range against a deck that banks in **0.68 s**, and which delivers **1.7–4.3 % of a commanded step in 0.100 s.**
- **Raising that spring is step 3.2's own settled dead end** (doubled to 1 600/160 and swept: it did not damp the
  roll), and the brief forbids re-opening it, the hull's roll stiffness, the clamp, the wave and the stance.
- **The one lever left that is LIVE on his address and acts on this channel is `balance.anklePlumb`** — the share of
  the deck's own roll the ankle's rest carries, shipped at 0, reachable for probes [R, `:1558`, `:3731`]. **I did not
  build it and it should not be built: it is the plumb-hold**, measured twice already (3.2x and 3.2z: *"it halves the
  body's bank peak and the across-speed goes UP 3 %, twelve of twelve still fall"*), and **step 3.2y retired the
  entire benchmark that kind of prescription produced.**

⚠️ **One thing in the other direction, so the recommendation is not read as "the delay does not matter".** The ride
**is** delay-limited for survival even though the body-against-deck lag is not the delay: the median ride goes
**1.067 s at a 0.20 s delay to 1.617 s at one frame**, monotone over five arms on his own spot (+52 %), while the
follow lag sits at 0.1016 s in both. **Those are two different quantities and only one of them is the sense.** The
delay is still not a lever — it is sourced, and the shipped 0.100 s is inside the measured 90–100 ms band — but a
future round that wants the rider to survive longer should know that the loop's own timing is worth more than this
channel's gain, and that **the honest way to buy that time is to give the loop less to react to** (the roll rate),
not to shorten a human reflex.

> **Recommendation: stop attacking the lag.** The reachable part is **~19 ms of 72 on his own spot and ~29 ms of 81
> on the face**, and it sits behind a sourced physiological constant; the rest is two constants the project has
> already settled. The quantity that is reachable is the one
> #421's own §7 named second — **the roll RATE** — and #421's own term already cut it 55 → 45 °/s as a side effect,
> without anyone aiming at it.

---

## 6. ⚠️ What refutes the brief, and #421, and needs its own round

**The brief, and #421's §7, both call the body-against-deck difference a lag. On the per-frame data it is better
described as a GAIN, and part of it is the design's own intended deficit.** Three measurements, all on the same
frames:

1. **At lag 0 the mismatch is at its smallest** (2.951° against 4.947° at six frames) while the follow gain is 0.878.
   #421 flagged this itself: *"the body is in phase and short, not late and full."*
2. **Fitted per frame rather than per rate band, the rate law carries nothing.** `|mismatch| = B |roll rate|` through
   the origin gives **B = 54.0 ms with R² = −0.053** on his own spot — **worse than predicting the mean** — while
   `|mismatch| = A |deck bank|` gives **A = 0.169° per ° with R² = 0.144**, and both together **R² = 0.164** with the
   rate term reduced to 16.2 ms. On the face: angle **R² 0.264**, rate **R² 0.088**. **#421's 73–104 ms band table
   reproduces here (38.8–87.0 ms on the sea), and it is a table of band medians — the per-frame law behind it is the
   angle, not the rate.**
3. **And a nonzero body-against-deck angle is what a coordinated turn is supposed to have.** The schedule builds its
   own rail from `tan(lean) = pull × tan(rail)` with `pull = railPull(speed, rail)`, *"the turn's pull over what the
   rail's own lean would balance"* [R, `predictiveBalance.ts:335–336`, `AttachedRider.ts:3722`]. Measured in the
   water's own frame (the body's lean and the deck's rail both less the water's tilt, since `bank` is from the
   world's vertical and `rail` is relative to the water — the first version of this read mixed the two and gave a
   ratio of 10):

   | \|rail\| band | **sea**, frames | med \|rail\| | med \|bankRel\| | `tan` ratio | the game's own `pull` | ratio / pull |
   |---|---|---|---|---|---|---|
   | 0–5° | 2 014 | 0.63° | 1.40° | 1.343 | 0.862 | 1.558 |
   | 5–10° | 701 | 7.57° | 9.21° | 1.227 | 0.862 | 1.423 |
   | 10–20° | 1 335 | 14.27° | 14.80° | 1.069 | 0.849 | 1.258 |
   | **20–40°** | **1 701** | **28.54°** | **27.28°** | **0.935** | **0.832** | **1.124** |
   | **40°+** | **1 685** | **55.12°** | **49.62°** | **0.778** | **0.844** | **0.922** |

   (the face gives the same shape: 1.04–1.06 at 5–20°, 0.98 at 20–40°, 0.89 at 40°+ against a `pull` of 0.82–0.87)

   > **In the two bands where the fall happens the body is leaning within 12 % and 8 % of exactly what the
   > coordinated turn's own pull says it should** — 27.28° of body to 28.54° of rail where the design wants 24.3°, and
   > 49.62° to 55.12° where it wants 48.6°. At small rail it overshoots the designed deficit by up to 56 %, which is
   > the transient. **So the body is not standing plumb, and it is not standing where a lag would put it either: it is
   > standing within a tenth of where the schedule's own steady turn puts it.**

> **What that means for the diagnosis, stated carefully because it is one population and one reading:** `bank − roll`
> **is the ankle's own joint angle by construction** (`HUMAN_ANKLE_STIFFNESS × (bank.angle − roll − ankleRest)`), and
> in a banked turn that joint angle **must** be nonzero — the ankle is what holds the deck at a rail the body does not
> match. So comparing it against the stance's 10.9° is not comparing an error against a budget; it is comparing a
> **working angle** against a budget. The code's own bound on the commanded version of that angle, ANKLE_REST_RANGE,
> is **14.32° — larger than the 10.9° the support can carry.**
>
> ⚠️ **I am not claiming this overturns #421's fall diagnosis.** §6.3's two populations are one seed and one spot
> each, the `pull` it is read against is a table interpolated at the rail the board is on rather than the rail the
> schedule asked for, and nothing here measures what the ankle angle *ought* to be in a turn the schedule is not
> holding. What I am claiming is that
> **"the body is 0.1 s late" is not the best per-frame description of the column, the rate law has no explanatory
> power per frame, and the next round on this should ask what the ankle angle in a hard coordinated turn is SUPPOSED
> to be before treating all of it as error.**

---

## 7. Known gaps, stated

- **No figure here is a ride.** Every rider is placed, holds one stance and holds the stick hard over or never
  touches it. The owner's standing instruction is that bot rides are not evidence of feel, and nothing here is
  offered as such.
- **One seed, one swell, one spot, three trials 1.5 s apart** — three phases of one swell, not three swells. And my
  three trials land on a nearly level face (0.27°, 2.74°, 2.77°), which is why two of #421's columns do not reproduce
  (§2).
- **The delay sweep is a measurement, not a proposal.** `BALANCE_DELAY` is sourced and nothing here asks to change
  it; it was moved only to find out whether the follow lag is it.
- **`g0.4`–`g2` are not a fair test of the reflex law**, only of the lever inside it: those arms fall in 0.3 s, so
  their whole-run columns are dominated by the first third of a second. That is why the matched `CAP=18` table exists.
- **§6.3 now has both populations** (the sea run that carries the `pull` column was made after the first draft), but it is still one seed and one spot each, and it compares the achieved lean against a `pull` interpolated at the rail the board is on — not a statement about what the ankle angle ought to be when the schedule is not holding its turn.
- **The plant could not be recovered from the ride** (§5.2) and §5.1 is arithmetic from three constants plus two
  measured columns, not a fit.
- **`?bodyBank=hip` is not in any arm** (§0): this branch is off `main` and #421 is unmerged.

---

## 8. Verification

| check | result |
|---|---|
| `./node_modules/.bin/tsc -b` | **clean, exit 0** |
| the two probe files typechecked explicitly (`tsconfig.json`'s `include` is `"src"` only, so `-b` does not see them) under the project's own flags — `--strict --noUnusedLocals --noUnusedParameters --verbatimModuleSyntax --isolatedModules`, `--types node,@webgpu/types` | **0 errors** |
| `vitest run src/physics --maxWorkers=1` | **58 files, 638 passed, 21 expected fail (659)**, 226 s, one worker |
| `vitest run src/wave/SurfZoneRunner.test.ts` | **43 passed**, 74 s, run by hand (it is outside the merge suite; memory `runner-test-file-excluded`) |
| probe builds | `rolldown` clean: the rig 2 194 kB, the reader 34 kB |
| **the constant is dead on the shipped path** | **5 values on the face: 1 050 840 values, 0 differences, 72 of 72 runs each; 2.0 on his own spot: 285 898 values, 0 differences, 90 of 90** |
| **the identity test can see a change** | the delay constant through the same path: **62 594–90 359 values differ, 6–10 of 72 runs identical** |
| **the lever is live where it is claimed** | commanded-rest median **0.483 → 10.963°** and `corr(ask, rest)` **−0.17 → 0.85** across g0 → g2; `restPeak` **14.322°** = the 0.25 rad clamp |
| **the probe is inert** | `INERT=1`: **72 of 72 face run outcomes identical** |
| **the estimator's positive control** | known plant recovered to **2 %**, R² 1.000 — and it caught a real bug in my own elimination |
| **the SINK control** | frame 1 draft **0.0611 m / load 678.6 N / 0 of 72 dry** against flush **0.00024 m / 604.7 N / 30 of 72 dry**; outcomes differ on 68 of 72 |
| Canyon seatbelt | wrapper prepended as an **object**; grid read off the solver as **400 × 451 = 180 400** (Canyon B); CPU spin-up **64.9 s** wall, `search` echoed |
| `src/` restored after every swept build | `git status --porcelain src/` **empty after all nine rebuilds** |
| deletions vs the merge base | **none**: two new files, no existing file touched |
| no ledger turned on | `bankLedger` and both `BoardBody` ledgers left off; the probe reads only, through one cast |

**Scratch files are in the session scratchpad and nothing was installed**; `node_modules` is a symlink to the main
checkout's and `tsc` was run as `./node_modules/.bin/tsc`.
