# Step 3.5 — the owner's two rulings

The owner's bar is unchanged and is still the acceptance test: **in Compress the surfer must never fall at the low
speeds of getting into position — 100 %, not "fewer".** Tall may legitimately fall on a sharp turn.

This folder holds the two changes the **owner explicitly authorised** on 2026-11-17 — the first the whole new-rider
track has had. **Ruling A, the ask cap, is step 3.5a and is Part 1 below.** Ruling B, the stance rework, is queued
behind it and its prep round is `stance-frame.md` in this folder.

Ruling A: asked whether the game may limit what the rider *asks* for to what its speed can hold, they answered
**"Yes — cap the ask"**, on the water-physics advisor's recommendation
(`docs/research/water-physics/board-roll-stiffness.md` §7), and the option they chose says the bound applies
*"whether the request came from your stick or from its own balance"* — so both reference lines, not one.

Tags as in 3.2, 3.3 and 3.4: **[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source;
**[I]** my inference from a stated model; **[A]** arithmetic on measured numbers, labelled as such.

# Part 1 — step 3.5a: the cap the owner authorised is **already in the game, and tighter**, so building it can only
loosen what the rider asks for — and on the stick-untouched falls it is provably inert, bit for bit

**The question the owner was asked carried a false premise, and finding that is this round's result.** They were told
their *"rider's balance targets 42–52° of lean at 1.3 m/s"* and asked whether the game may cap the ask at
`θ_max = atan(v²/(g R_min))`. It may, and it already does. `AttachedRider.prepareBank` has bounded **both** of the
lines the ruling names — the balance's own reference (`leanAsked`, which is what the predictor is handed) and the
steer's request (`bankReference`) — by exactly that formula since 2026-10, at `TURN_RADIUS = 4.5 m`, **and the bound
is 0 whenever the board is not planing** [R, `AttachedRider.ts` on `main` at `1a2cfd65`: `:3434–3448` the expression,
`:474` MAX_BANK, `:491` TURN_RADIUS, `:342–343` the planing latch]. The 42–52° is
the bank the body **reaches** at the fall, not the lean it requests.

**So the advisor's `R_min = 2.0 m` is a loosening, not a cap.** It allows ×2.25 the lean at 1.3 m/s (4.92° against
2.19°) and ×1.76 at 5 m/s (51.88° against 29.52°), and it is no tighter than the shipped radius at any of twelve
speeds from 0.5 to 10 m/s [A, `3.5/cap.ts` §3, from `WATER.gravity` and `MAX_BANK` as the code holds them]. And in
the band the owner's complaint is about the shipped cap is not 2.19° but **exactly zero**: below `PLANING_DROP = 3 m/s`
the rider already asks to stand perfectly plumb, however hard the stick is held.

**Measured, on the arms this folder judges everything on:**

- **With the stick centred the cap never binds and the switch cannot move anything — not "barely", identically.** On
  3.4i's own `f73-l`, the requested bank is **0.00° on every live tick of all 18 runs**, so the clip share is
  **0.000 in every speed band** (n = 418 / 351 / 343 live ticks, tall / crouch / compress). Every value of the switch
  — 1.5, 2, 4, 4.5 and 9 m — reproduces the arm with **0 differing values across 6 966 column-values of 18 runs**,
  the only exceptions being the two instrument columns that *describe* the cap. Same on `s16-l` (18 runs) and `f73-g`
  (24 runs). **The 626-of-626 falls, and the 20–45° balance-fall population inside them, are untouched by
  construction, and that is measured rather than argued.**
- **Where the stick is held the shipped cap clips everything, and loosening it shortens the ride.** At full stick on
  `f73-l` the request is a flat **50.00°** (`RAIL_RANGE`) and the shipped cap clips **1.000 of live ticks in every
  band**, holding the ask at 18–23°. At `R_min = 2 m` the clip share falls to **0.649–0.693** and the ask reaches
  25–36° — and **Compress's median ride goes 1.283 → 0.817 s**. At 1.5 m, 0.504–0.578 and 0.833 s.
- **Falls: 18 of 18, 18 of 18, 24 of 24 and Compress 6 of 6 / 8 of 8 on every arm at every value, stick centred or
  hard over.** **28 arms, 540 runs, 540 of 540 fell, Compress 180 of 180.** The owner's bar is not met at any radius.
- **The advisor's first prediction is refuted and its second is refuted too, in the same arms.** The Compress rider
  does not stand through slow positioning (6 of 6 still fall, at the same millisecond with the stick centred); and he
  is **not** locked upright and unable to initiate, because *shipped* he is already asking for zero lean below 3 m/s
  and the board still reaches 20° of rail in 0.30–0.75 s and swings 21–36° of heading there. **Neither branch of the
  advisor's "quick, clear read" happens, because the quantity it reasons about was already pinned.**
- **The opposite direction is the only one with any sign of life, and it is not a fix either.** `?askCap=9` — double
  the shipped radius, a genuinely *tighter* cap wherever the board planes — holds the ask at 9–12° instead of 18–23°
  and **lengthens** the steered rides: Compress 1.283 → **1.133 s** on `f73-l`, 2.150 → **2.483 s** on the glide
  cell. Still 6 of 6 and 8 of 8. On the 12.1° face it is **mixed**: Compress 0.783 → 0.850 s, but tall 1.000 → 0.617
  and crouch 0.883 → 0.617. Three cells of six the right way, 6–8 runs each — a lead, not a result.

**Nothing here re-opens** the hull's ≈100 N·m/rad, the 70° clamp, the wave, the placement, the ankle's own range,
3.4j's across-acceleration finding, the 4 m/s plant floor as a cause (3.4m closed it) or 3.4l's `tall` sign share.
**No `yModel`-derived sign share is quoted anywhere in this round**, so 3.4n's slip-sign correction (`SLIP=lab`) is
not in the measurement path at all.

## 0. What was built, by line

One mechanism, one constant: **the minimum carved radius the commanded lean is bounded by.**

- `AttachedRider.prepareBank` — `TURN_RADIUS` in the `most` expression becomes `this.askRadius`, and the planing gate
  becomes `this.askUngated || this.planing`. Both privates are set once in the constructor from `options.askCap`,
  matched **as strings** against the five values and never parsed (`Number(null) === 0`), so with the switch unset
  `askRadius === TURN_RADIUS` and `askUngated === false` and the expression is the shipped one **by construction**.
  Snap's blend toward `SNAP_RADIUS` is unchanged: it now blends from the switch's radius instead of the constant.
- `AttachedRiderOptions.askCap?: '1.5' | '2' | '4' | '4.5' | '9'` → `RideSessionOptions` → `SurfZoneConfig` →
  `SurfZoneRunner`'s passthrough → `PhysicalMode.ts`'s `askCapSwitch()` with its line in the switch-list comment, its
  own test, and **`askCap: undefined` in `main.ts`'s online-room overrides**, which the test asserts by reading
  `main.ts` — the route `?plantFloor`, `?bankClamp`, `?mountAgree` and `?riderBody` each travel.
- `AttachedRider.leanProbe` gains three **read-only** members — `want` (the request before the cap), `held` (the
  formula before the planing gate) and `radius` — beside the `cap`, `ask`, `speedThrough` and `planing` step 3.3f
  already put there. Nothing in the game reads any of them. Their additivity is measured in §1.
- `3.3/plant.ts` — the `ASKCAP=1.5|2|4|4.5|9` arm, eight per-tick columns off `leanProbe` (one of them the single
  comparison `|want| > cap`, taken in **radians**), the clip shares by speed band on the per-run row, and eight
  turn-initiation columns. Probe-only.
- `3.5/cap.ts` — the arithmetic: θ_max at the five radii, the advisor's four quoted cells reproduced, the direction of
  the change, and the planing gate's own band. Model only, no ride.

**Why the switch carries the radius rather than a boolean.** The owner authorised the *shape* of the bound, not a
number, and the number is the one thing in the advisor's recommendation that is **not sourced**: nobody has published a
shortboard's minimum carved radius, and §7 says so itself. 2.0 m is the advisor's judgement [I] from a 1.778 m board's
rail line; 1.5 and 4 m are the bracket it offered beside it; **4.5 m is the constant the game already chose** in
2026-10 from a Canyon ride report and Forsyth et al. 2024's measured 3.8 m bottom turns [R, `:476–491`]; and **9 m is
this round's own addition**, because the loosening direction measured worse and the tightening one had to be measured
too rather than assumed.

**It is not a hidden motor, and the check is structural rather than a promise.** The change is two factors inside one
`Math.min`/`Math.max` pair that bound a *commanded angle*. No torque, damper, brake, yaw moment or force appears
anywhere in the diff; `git diff` touches no force function, no ledger and no solver. The only thing downstream of the
two reference lines that moves is the rail the gain schedule is read at, which is already a pure function of
`leanAsked` [R, `:3619–3622`]. **At no point did making the bound "stick" tempt a force**: with the stick centred the
bound has nothing to bind, and the honest finding is that it is inert, not that it needs help.

## 1. The default is byte-identical, and the instrument is additive — both measured, neither asserted

1. **The ride, switch unset.** `f73-l` reproduces step 3.4i's, 3.4l's, 3.4m's and 3.4n's published arm **exactly:
   18 of 18 fell, 0.617–2.533 s, median 1.450 s.** `s16-l` reproduces **18 of 18, median 1.033 s** and `f73-g`
   **24 of 24, median 4.650 s** — 3.4h's own two other published cells.
2. **The 37 new probe columns move no ride** (8 per tick, 29 per run). The same `f73-l` command before and after the
   columns were added:
   **0 mismatches over 6 966 column-values of 18 runs**, and the log's 73 non-JSON lines **identical**.
3. **The switch is inert with the stick centred, at every value.** Against `f73-l.ships`: `a15`, `a2`, `a4` and `a9`
   differ in **two columns only** (`askCapMed`, `askHeldMed` — both instrument columns describing the cap), `a45` in
   **one** (`askCapMed`; the radius is unchanged so `askHeldMed` cannot move, which is the check that `4.5` isolates
   the gate). Every physics column — `fell`, `fellAt`, `bankFall`, `rollFall`, `railFall` and the rest — is identical.
   Same on `s16-l` and `f73-g`.
4. **The Canyon byte check, fresh spin-up on both legs.** Protocol as 3.4i requires it, since a fresh spin-up and an
   imported `--state` give different hashes on `main` alone: the wrapper
   `globalThis.location = { search: '?canyonWaves=true' }` **prepended to the bundle**, the grid read as **B,
   400 × 451 = 180 400 cells**, `--spot canyon --steps 3600`, a `--state` path deleted first so the
   "spun up on the CPU in … s" line is present on both (48.9 s on `main`, 47.0 s on the branch — wall clock, which
   the hash does not depend on). **`main` gives `a367d938f15fa934` / `9e5831f80e38abd9` — the handoff's own recorded B reference, to the
   digit — and the branch gives the same two.** A second, cheap leg covers the doc-comment edits made to
   `AttachedRider.ts` after that bundle was built: **from the same imported `.sea` over 240 steps, the `main` bundle,
   the branch bundle and the final branch bundle all give `548f3db7ca81d898` / `475f8c56c9debccc`**, which is also
   3.4m's own recorded 240-step pair.
5. **The model's own identity.** `3.5/cap.ts` reproduces the advisor's four quoted cells at `R = 2 m` (4.92 / 24.64 /
   51.88 / 65.09° against 4.9 / 25 / 52 / 65) and checks the direction claim over twelve speeds.

## 2. What the cap actually binds — and the request is not a distribution, it is the stick

**The brief asked for "the distribution of requested bank against θ_max". There is no distribution.** The request the
cap bounds is, for the new rider, exactly

> `want = steer × RAIL_RANGE + HAND_BEND × handBend × HOLD_BANK` = **steer × 50° + handBend × 5.73°**  [R, `AttachedRider.ts` on `main` at `1a2cfd65`, `:3440–3448`]

— a deterministic function of the stick. On these arms the hand is never used, so the request is **steer × 50°**, and
the measurement confirms it to the printed digit: `want` is **0.00°** at stick 0, **15.00°** at 0.3, **25.00°** at 0.5
and **50.00°** at 1.0, with peak equal to median in every run. **So the clip share is a function of two things only:
how far the stick is pushed, and the speed.** [M]

**The clip share, tick-weighted over live ticks, per stance, never pooled.** Ranges are across the three stances, 6
runs a stance on the `-l` cells and 8 on the glide cell; the bracketed numbers are the live-tick populations
(tall / crouch / compress), and a band with no ticks prints as an em dash:

| stick | arm | overall clip | < 2 m/s | 2–3 | 3–4 | 4–6 | ≥ 6 |
|---|---|---|---|---|---|---|---|
| **centred** | `f73-l.ships` | **0.000** | 0.000 (82/74/75) | 0.000 (103/54/74) | 0.000 (109/90/54) | 0.000 (116/122/140) | 0.000 (8/11/0) |
| 0.3 | `f73-l.s0.3.ships` | 0.351–0.439 | **1.000** | **1.000** | 0.500–0.727 | 0.000 | — |
| 0.5 | `f73-l.s0.5.ships` | 0.573–0.612 | **1.000** | **1.000** | **1.000** | 0.142–0.267 | — |
| **hard over** | `f73-ls.ships` | **1.000** | **1.000** (45/52/52) | **1.000** (48/31/50) | **1.000** (30/36/43) | **1.000** (102/102/129) | 1.000 (20/13/0) |
| hard over | `f73-ls.a2` | 0.649–0.693 | 1.000 | 1.000 | 1.000 | 0.320–0.523 | 0.000 |
| hard over | `f73-ls.a15` | 0.504–0.578 | 1.000 | 1.000 | 1.000 | 0.054–0.220 | 0.000 |
| hard over | `f73-ls.a9` | **1.000** | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| hard over | `f73-gs.ships` (glide) | 0.494–0.525 | — | 1.000 | 1.000 | 1.000 | 0.310–0.344 |
| hard over | `f73-gs.a2` (glide) | 0.114–0.155 | 1.000 | 1.000 | 0.289–0.555 | 0.000 | 0.000 |

**Three readings.**

1. **Shipped, the cap binds EVERY live tick when the stick is hard over — at every speed, 6 m/s and above included —
   and nothing at all when the stick is centred.** That is the whole answer to "what does the cap bind": at full stick
   the rider gets 18–23° of ask where it asked for 50°; with the stick centred it asks for 0° and the cap is a no-op.
   At partial stick it binds from the slowest band upward and releases where the speed catches the request: at 0.3 it
   is 1.000 below 3 m/s, 0.50–0.73 at 3–4 and 0.000 at 4–6.
2. **The shipped cap is already the strictest thing in the chain below 3 m/s**, because the planing gate makes it
   exactly 0 there, and **38–48 % of the live ticks of the owner's own low cell are off the plane** (`askPlaningShare`
   0.382 / 0.462 / 0.480). Those are the ticks the advisor's 4.9° was aimed at, and they currently allow 0.0°.
3. **The 4–6 m/s band is where the switch has real authority** and it is the band where the clip share moves most:
   1.000 → 0.32–0.52 at 2 m, → 0.05–0.22 at 1.5 m, and stays 1.000 at 9 m.

## 3. The falls and the ride times, on 3.4i's and 3.4h's own arms

**Stick centred — the arms the published figures were taken on. Every value of the switch is bit-identical here; the
single row is the measurement, not a shorthand.**

| arm (all five switch values) | runs | fell | median s | span | Compress | Compress med | published |
|---|---|---|---|---|---|---|---|
| `f73-l` | 18 | **18 of 18** | **1.450** | 0.617–2.533 | **6 of 6** | 1.450 | 18/18, 1.450 ✔ |
| `s16-l` | 18 | **18 of 18** | **1.033** | 0.500–6.233 | **6 of 6** | 1.167 | 18/18, 1.033 ✔ |
| `f73-g` | 24 | **24 of 24** | **4.650** | 1.667–5.183 | **8 of 8** | 4.650 | 24/24, 4.650 ✔ |

**Stick hard over — where the cap is live. Compress medians in bold; the fall count never moves.**

| arm | runs | fell | tall med | crouch med | **Compress** med |
|---|---|---|---|---|---|
| `f73-ls.ships` | 18 | 18 of 18 | 0.933 | 0.850 | **1.283** |
| `f73-ls.a45` (gate off only) | 18 | 18 of 18 | 0.883 | 0.917 | **0.833** |
| `f73-ls.a4` | 18 | 18 of 18 | 0.883 | 0.900 | **0.817** |
| `f73-ls.a2` (the advisor's) | 18 | 18 of 18 | 1.233 | 0.833 | **0.817** |
| `f73-ls.a15` | 18 | 18 of 18 | 1.233 | 0.833 | **0.833** |
| **`f73-ls.a9`** (tighter) | 18 | 18 of 18 | 0.933 | 1.000 | **1.133** |
| `f73-gs.ships` (glide) | 24 | 24 of 24 | 2.017 | 1.967 | **2.150** |
| `f73-gs.a2` | 24 | 24 of 24 | 2.017 | 1.967 | **2.133** |
| **`f73-gs.a9`** | 24 | 24 of 24 | 2.333 | 2.650 | **2.483** |
| `s16-ls.ships` (12.1°) | 18 | 18 of 18 | 1.000 | 0.883 | **0.783** |
| `s16-ls.a2` | 18 | 18 of 18 | 0.900 | 0.683 | **0.617** |
| `s16-ls.a9` | 18 | 18 of 18 | 0.617 | 0.617 | **0.850** |

**Half stick and a third, for the shape across the stick** (`f73-l`, 18 runs an arm): at 0.3 the Compress median goes
1.283 → 0.817 s under `a2`; at 0.5, 1.283 → 0.817. **Every stick setting moves the same way: looser is shorter.**

**And one control worth more than its cost.** At `askCap=9` the half-stick arm (`STEERS=0.5`, request 25°) and the
full-stick arm (`STEERS=1`, request 50°) are **bit-identical over all 18 runs** — the only two columns that differ are
`askWantMed` and `askWantPeak`, the instrument's record of the request itself. Both sticks saturate a 9 m cap, so the
rider acts on the **ask** and not on the stick, and the cap is demonstrably the binding constraint on that arm. It is
the positive control the stick-centred arms cannot give, since there the cap binds nothing. [M]

**540 of 540 runs fell across the 28 arms, and Compress 180 of 180.** No arm, no stick setting and no radius produced
a single standing Compress run. **The owner's bar is not met, and nothing here is close to meeting it.**

## 4. The advisor's two predictions, scored

> **"If I am right, the Compress rider stands up and stays up through the slow positioning … the 1.2–1.5 s topple
> stops being how the run ends, and the third fall population (the 20–45° balance fall, 10 of 24 on his own face)
> should mostly go."**

**REFUTED, and not narrowly.** With the stick centred — which is the condition that population was measured under —
the whole ride is **bit-identical** at every radius, so the 20–45° balance-fall population is unchanged *by
measurement*, not by inference: no column of any of the 18 runs differs. With the stick held, Compress still falls
6 of 6 and 8 of 8 at every radius, and at the advisor's own 2.0 m the topple arrives **sooner** (1.283 → 0.817 s).

> **"If I am wrong, he will feel locked upright and unable to initiate at low speed — refusing to bank when the owner
> asks — and runs will end by running out of wave instead of by falling. That is a quick, clear read."**

**Also refuted, and this is the more interesting half: the failure mode it describes is the SHIPPED game, and it is
not what the ride looks like.** Shipped, with the stick hard over at entries 1–3 (1–3 m/s), the cap is **0.00°** and
the ask is **0.00° at the peak as well as the median, with `planing` 0.000 over the whole live window of all nine
runs** — the rider does refuse to bank, exactly as predicted for the "wrong" branch, and it refuses completely rather
than reluctantly. And yet:

| `f73-ls`, entries 1–3, stick hard over | shipped cap ° | shipped ask ° | to rail 5° | to rail 20° | rail peak ° | turned ° | fell at |
|---|---|---|---|---|---|---|---|
| tall 1 / 2 / 3 | 0.00 | 0.00 | 0.15 / 0.17 / 0.18 s | 0.30 / 0.37 / 0.73 s | 56.0 / 55.2 / 59.3 | 22.4 / 21.2 / 23.9 | 0.633 / 0.800 / 1.050 s |
| compress 1 / 2 / 3 | 0.00 | 0.00 | 0.17 / 0.18 / 0.18 s | 0.35 / 0.43 / 0.75 s | 67.0 / 60.4 / 84.4 | 21.3 / 24.1 / 36.4 | 0.617 / 0.833 / 1.283 s |

**The board rails to 56–84° and swings 21–36° of heading while the rider asks for nothing at all, and the run ends in
a fall, never by running out of wave.** So "locked upright" is not observable as a *ride* symptom here: the rail and
the turn below the planing speed do not come from the ask, and the run is over in 0.6–1.3 s either way. **Both of the
advisor's branches are predictions about a quantity that has no authority on this water.**

## 5. Turn initiation, measured — and the one thing this instrument cannot say

The brief asked for initiation measured as carefully as the fall count. Columns, all over **every** tick from the
mount: the first time the board's rail against the water reaches 5, 10 and 20°, how many runs reach each, the rail and
bank peaks, the peak yaw rate and `turned` = ∫|yaw rate| dt.

| `f73-l`, stick hard over | to 5° | to 10° | to 20° | reached 20° | rail peak ° | yaw peak °/s | turned ° |
|---|---|---|---|---|---|---|---|
| ships, tall / crouch / compress | 0.333 / 0.317 / 0.333 s | 0.367 / 0.417 / 0.383 | 0.667 / 0.583 / 0.600 | 5/6, 5/6, **6/6** | 56.0 / 57.9 / 81.0 | 100.1 / 147.9 / 115.9 | 31.6 / 35.6 / 38.9 |
| `a2` | 0.333 / 0.317 / 0.333 | 0.367 / 0.350 / 0.367 | 0.683 / 0.433 / 0.433 | **4/6**, 5/6, 6/6 | 46.0 / 75.9 / 76.0 | 175.6 / 192.8 / 165.4 | 34.9 / 51.1 / 39.5 |
| `a9` | 0.350 / 0.317 / 0.317 | 0.383 / 0.367 / 0.367 | 0.667 / 0.667 / 0.667 | 5/6, **6/6**, 6/6 | 57.5 / 83.5 / 81.5 | 177.3 / 177.6 / 167.4 | 49.5 / 56.7 / 62.2 |

**Initiation did not get worse at any radius** — the times to 5° and 10° are the same to within one or two
ticks (0.317–0.350 s and 0.350–0.417 s on all three arms), the peak yaw rate goes **up** at both ends
(100–148 °/s shipped against 165–193 at 2 m and 167–178 at 9 m) and the heading turned goes up at both ends too.
The only column that degrades is **"reached 20°" for tall at `a2`, 5 of 6 → 4 of 6**, and that is the ride ending
sooner, not the turn failing to start.

**The limit, stated rather than buried.** Three things this instrument genuinely cannot settle:

1. **The stick is on from t = 0 on these arms**, so "time to rail 5°" contains the mount transient and is not a
   latency from a stick *change*. A stepped-stick probe would measure that properly — but the runs end in 0.4–1.7 s,
   so there is no window to step in. **An honest initiation latency needs a rider that survives first.**
2. **The rail reaching a threshold is not proof of a commanded turn.** On an arm where the rider falls, the board
   rails over because it is capsizing, and the two cannot be separated by this column. The columns that *are* clean
   are `cap` and `ask`, which are the command itself.
3. **The threshold medians are over different sub-populations** (a run that never reaches 20° contributes nothing), so
   they are not monotone in the threshold — on the stick-CENTRED `f73-l.ships`, compress reads 1.017 s to 10° and
   0.750 s to 20° with only 5 of 6 reaching 20°. The "reached" column carries that and must be read beside the time.

## 6. What I refuted, and what I will not claim

**Refuted:**

- **The brief's and the advisor's premise that the rider's balance targets 42–52° of lean at 1.3 m/s.** It targets
  **0°** with the stick centred (18 runs, peak as well as median) and **0°** with the stick hard over below 3 m/s
  (the 9 sub-planing runs, peak as well as median). 42–52° is where the body ends up, not what it asks for.
- **"The cap would fix both the stick-untouched falls and the ones where you are steering."** It cannot touch the
  stick-untouched falls at all: `f73-l` bit-identical at all five radii (6 966 column-values an arm), `s16-l` at 2 m,
  `f73-g` at 2 and 9 m (9 288 an arm).
- **Both halves of the advisor's own if-right/if-wrong read** (§4).
- **My own first instinct, that the `?askCap=4.5` arm would be a pure no-op.** It is not: removing the planing gate
  alone moves the steered rides (Compress 1.283 → 0.833 s), because below 3 m/s the gate is the binding constraint and
  nothing else is.

**Not claimed:**

- **That `?askCap=9` is a fix or a direction.** It lengthens three steered Compress cells (1.283 → 1.133, 2.150 →
  2.483, 0.783 → 0.850) and shortens two other stances on the 12.1° face. **Three cells of six moving the right way,
  on 6–8 runs each, with the fall count pinned at 100 %, is a lead and not a result**, and the arm also removes the
  planing gate, so its two effects are not separated.
- **That the planing gate is wrong.** It is the reason the shipped game is the strictest possible cap below 3 m/s, and
  the falls happen anyway. Whether a surfer may ask for a few degrees at walking pace is a *feel* question, and the
  owner is the only one who can answer it from a ride.
- **Anything about what the owner will feel.** Every number here is headless, with the stance held, on `FACE` rows
  that are 3.4h's and not his spot's five.
- **That 2.0 m or 9 m is the right R_min.** `R_min` remains the one unsourced number in the chain.

## 7. What this round did NOT do

- No force, torque, damper, brake or yaw moment was added anywhere, and no force function, ledger or solver is in the
  diff. **The temptation the brief warned about never arose**, because the bound's problem is that it has nothing to
  bind, not that it fails to hold.
- No probe was weakened, suspended or re-cut. `3.3/plant.ts` gains one arm, eight per-tick columns and 29 per-run
  ones, and loses nothing; its published arm is reproduced to the millisecond.
- No fall classifier was re-run under `bankClamp=off`, because the stick-centred rides are bit-identical and the mix
  is therefore identical by measurement. Re-running it would have produced the same table at the cost of 10 minutes.
- No new face, placement, hull law, ankle range or plant row was touched.
- The owner's spot's own five `FACE` rows (PR #223) are still unrun in this folder, as they were in 3.4.
- **The full `vitest run` did NOT complete, and that is an environment limit rather than a result.** This machine has
  8 GB and was down to ~60 MB of free pages; three attempts at the whole suite (once at the default worker count,
  once at `--maxWorkers=4`, once at `--maxWorkers=2` over `src/physics` alone) **died silently with no summary line
  and no exit output**, which is what an OOM kill looks like here. What *was* run and passed, each on a quiet
  machine: **`src/game/PhysicalMode.test.ts` 106 of 106** (the switch's own test, including the `main.ts` online-room
  pin), **`src/wave/SurfZoneRunner.test.ts` 43 of 43** by hand as the standing note requires, and
  **`src/wave/uniformSnapshot.test.ts` + `src/wave/barrel/poolBarrelPerf.test.ts` 10 of 10** — the last two because
  they had failed in the saturated run at 270 s and 102 s against a 60 s timeout, and they pass alone, so those were
  load timeouts and not findings. `tsc -b` is clean. **The physics suites beyond those were not run; a caller with
  more RAM should run them before merging.**

## 8. Files (3.5a)

- `src/physics/AttachedRider.ts` — `askCap`, `askRadius`, `askUngated`, the two factors in `prepareBank`, and the
  three read-only `leanProbe` members.
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts` — the passthrough.
- `src/game/PhysicalMode.ts` — `askCapSwitch()` and its line in the switch-list comment.
- `src/game/PhysicalMode.test.ts` — the switch's own test, including the online-room pin read out of `main.ts`.
- `src/main.ts` — the switch-list line and `askCap: undefined` in the online-room overrides.
- `docs/research/new-rider/3.3/plant.ts` — the `ASKCAP` arm, the eight `ask*` tick columns, the clip shares by band
  and the eight turn-initiation columns. Identity-checked against step 3.4i's published arm.
- `docs/research/new-rider/3.5/cap.ts` — the model-only arithmetic; `results/35a/35a-model.txt` is its output.
- `docs/research/new-rider/3.5/read.py` — every table above, rebuilt from the dumps (gunzip them first).
- `docs/research/new-rider/3.5/results/35a/*.log.gz` — the 28 arms, raw; `35a-read.txt` the read;
  `35a-canyon-main.txt` and `35a-canyon-branch.txt` the two fresh 3 600-step Canyon legs, `35a-canyon-240.txt` the
  three-bundle 240-step leg.

## 9. The handoff's own caveat about Ruling B, answered

The handoff records: *"the cap may change how Compress behaves enough that Ruling B looks different afterwards … if
3.5a's result materially changes Compress's behaviour, say so before building B rather than building it blind."*

**It does not, and the answer is as strong as it can be: on the default rider the diff is byte-identical by
construction and measured identical on 60 runs, and with the stick centred it is identical at every radius too.**
Compress falls 6 of 6 at the same millisecond on `f73-l` at all five radii. **Ruling B can be built on exactly the
Compress that was measured when it was ruled.** The only caveat left is a file one: 3.5a edits `prepareBank`, which is
in the same method as the stance's bank handling, so B should start from this branch or from main after it lands.

## 10. For the owner, in plain words

**The thing you said yes to is already in the game, and it is stricter than what you were offered.** Your rider has
never been allowed to ask for a big lean at walking pace: since October it has been limited to the lean a 4.5-metre
turn can hold, and below about 3 m/s it is limited to **nothing at all** — it asks to stand perfectly straight even
with the stick pushed all the way over. The 42-to-52 degrees in the question was how far the body had already
toppled, not what it was trying to do. I am sorry the question was put to you on a wrong fact; the fact was checkable
and nobody checked it.

**So I built the switch anyway, because the useful version of your ruling is the number in it**, and the number the
advisor picked — a 2-metre turn — lets the rider ask for *more* lean than it can now, not less. Here is what the
measurements say:

- **With the stick untouched the switch changes nothing whatsoever.** Not "a little": the eighteen runs come out
  identical to the last digit at every setting. Your rider falls while asking to stand up straight.
- **With the stick held over, the looser setting makes it worse** — Compress rides 1.28 s now and 0.82 s with the
  advisor's number.
- **The opposite setting, a tighter cap, is the only one that helped at all** — Compress 1.28 → 1.13 s, and 2.15 →
  2.48 s on the faster cell. It still fell in every single run.

**To ride it:**

> `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&askCap=9`

and the same address with **`&askCap=2`** for the advisor's own number, and without the `askCap` at all for the game
as it ships. **I expect `askCap=2` to feel looser and sloppier at slow speed and `askCap=9` to feel stiffer and
slower to bank; I do not expect either to stop a fall.** If `askCap=9` feels better in the water, that is news and it
points the next round at the cap's radius rather than at the cap's existence.

**The one thing only you can decide, and it is a feel question, not a physics one:** below 3 m/s your rider is
currently forbidden to lean at all. Physics says a turn that slow holds about 2°, and a real surfer at walking pace
does stay nearly plumb. Should the game let it ask for those 2–5° anyway — `&askCap=4.5` is exactly that and nothing
else — or keep the zero? Nothing I can measure answers that; it is whether the board feels dead in your hands.
