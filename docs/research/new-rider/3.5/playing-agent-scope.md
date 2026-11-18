# Scoping a playing agent and its evals

**A scoping round. No code, no constant, no measurement, no ride.** Nothing under `src/` or `server/` is touched, and
this document proposes no change to either. Every number below is either read in the file cited, quoted from a merged
document with its population, or my own arithmetic over published figures — marked **[R]** read, **[Q]** quoted with
its source, **[A]** my arithmetic on their numbers, **[I]** my inference with the model stated.

The owner's ask (Ruling F, 2026-11-18):

> *"we need to code some agent that will be able to play and have a evals to reach a objective of play. Because as of
> right now your are not skilled enough to play and keep the surfer up. All of it is up to me. So maybe the best
> approach is for you to scope and calculate if this videos will map to what is being built. Stating tests and
> survival rates is not a good metric"*

---

## 0. The answer first

**1. Most of the agent already exists.** `src/dev/Autopilot.ts` (707 lines) paddles, catches, pops up and rides, in
four styles, and **emits only a `RideInput`** — the same struct a player's keyboard fills. It is used in 14 places
including `src/main.ts` and `scripts/ride-report.ts`. `scripts/ride-report.ts` already rides every spot, reads each
ride with `RideAnalyzer`, and **already tabulates the turns against Forsyth et al. 2024**. `src/game/waveScore.ts`
already scores a ride on WSL criteria. **"Code an agent" is not the gap.**

**2. The gap is a metric reader, and it is small.** Every body channel the physics has is already a **public readonly
field** on `AttachedRider`. No engine change is needed to measure any of them.

**3. But the agent must not be given a search to run yet, and this is the round's real finding.** Step 3.5d measured
that **with entries of 1–3 m/s, stick hard over against stick never touched gives 0 mismatches over 67 767
column-values** (461 frames of 9 runs on one face, 371 frames of 9 runs on another; every column but the `steer` input
itself). [Q handoff §3.5d] The mechanism is named in 3.5a: below `PLANING_DROP = 3` m/s the bank the rider may ask for
is **exactly 0**. [Q handoff §3.5a] So in the owner's own speed band, **the stick does nothing at all, measurably.**

> **An agent is a search over controls. You cannot search a space that is provably flat.**
> **So: build the eval. Do not build the optimiser.**

This is a sharper statement than "626 of 626 fell". The fall count says the outcome does not move. The inert stick
says **the input does not even reach the outcome** in the band that matters.

**4. Three of the footage's headline numbers are inexpressible**, not untuned. An arm lead cannot be nonzero in a body
with no arm position. A visible trunk cannot move opposite to the legs when the drawn hinge is a one-line function of
drawn leg depth. Two legs cannot differ when there is one leg spring. **No agent and no tuning will move these.**

**5. Rides per hour on this machine:** ~**2 880** on the analytic bench, single process; ~**4 usable rides per hour**
on the real sea in the one published configuration, which is a catch-rate problem with a known fix (place the rider
instead of paddling). **Parallelism is zero** — 76 MB of free pages and 7.8 GB of 8 GB swap in use as this was written.

**6. Recommended objective of play: one direction change, to the footage's shape, scored on what the game returns.**
Reasons in §1. It fits inside the 1.0–1.45 s every ride currently lasts, so it has a gradient **today**.

---

## 1. What is the "objective of play"?

**This is the owner's call.** Three candidates, with what each rewards and what each lets an agent get away with.

### Candidate A — "match the footage's movement numbers"

Score = distance between the agent's measured movement timings and the nine reads' targets.

- **Rewards:** timing fidelity, which is what the owner asked for.
- **What it lets the agent get away with — and this is fatal as stated:** *the agent commands most of these numbers
  directly.* The footage's best figure is a pump half-cycle of 0.55–0.60 s. The game's pump is already a scripted
  sinusoid with a constant period: `PUMP_PERIOD = 2` and `crouch = 0.5 + 0.5·cos(4π·t/PUMP_PERIOD + PUMP_PHASE)`
  (`src/dev/Autopilot.ts:265–267`, `:657`). [R] An agent told to score on pump period edits one number and scores
  perfectly. **The physics never participates.** Worse, the drawn trunk is an affine function of drawn leg depth
  (§3), so a "trunk fold period" measured on the drawing is also just the commanded crouch, read back.
- **Verdict: reject as stated; keep the reformulation.** Score only quantities the agent does **not** command —
  what the board and the emergent body *return*. That is candidate A′, and it is the recommendation.

### Candidate B — "link N direction changes in a row"

- **Rewards:** chaining, which is the newest gap the reads named ("nothing chains moves at the footage's rate",
  `video-ref-9-ponta-preta.md:506`). [Q]
- **What it lets the agent get away with:** "direction change" **has no threshold anywhere in the nine documents** —
  it is the reader's visual judgement. [Q, from the metric extraction over all nine] So micro-oscillating the stick
  scores. It needs a minimum turned angle *and* a minimum speed kept, and those thresholds already exist in the code:
  `TURN_RATE = 0.6` rad/s held for `TURN_TIME = 0.3` s (`src/game/rideAnalysis.ts:73–74`) and `LINK_GAP = 2` s with
  `LINK_KEPT = 0.85` (`src/game/waveScore.ts:11–12`). [R]
- **The disqualifying problem is that it has no gradient today.** The footage's rate is one change every ~2.3 s.
  The rider falls in 1.0–1.45 s. A single footage direction change takes 0.35–1.10 s. **So N = 2 is unreachable, and
  the score is 0 for every build** — exactly the defect the owner rejected in "626 of 626".
- **Verdict: the right second objective, not the first.** It becomes measurable the moment a ride reaches ~3 s.

### Candidate C — "ride a given stretch of wave"

- **Rewards:** nothing new. Distance ridden is speed × time, and time is the time to failure. **This is the rejected
  metric wearing a different unit.** `waveScore` already contains it: `length: min(1, duration / FULL_LENGTH)` with
  `FULL_LENGTH = 20` s (`src/game/waveScore.ts:16`, `:52`). [R]
- **Verdict: reject.**

### ⭐ RECOMMENDED — A′: "one direction change, to the footage's shape, scored on what the game returns"

**The objective of play is to complete a single bottom turn whose measured shape matches a real one.** Not how long
the rider stayed up; not what the agent asked for. Five numbers, all of them the physics' answer rather than the
agent's command:

| what is scored | the target | population of the target |
| --- | --- | --- |
| duration of the turn | **0.96 ± 0.04 s** | **n = 6 riders, 835 turns** (Forsyth et al. 2024) |
| heading turned | **99°** | same population |
| path radius | **3.8 m** | same population |
| lateral pull | **1.41 g** | same population |
| speed kept through it | speed out ÷ speed in | `LINK_KEPT = 0.85` is the code's own bar [R] |

**Why this one:**

1. **It is the only target in the whole evidence base with a real population.** Every movement number in the nine
   video reads has a population of **1 to 8 instances, on 1 to 2 riders, from 1 clip**. The two literature figures
   (n = 6 riders / 835 turns; n = 4 / 2 060 cutbacks) are the only properly powered numbers anywhere in the set.
2. **It has a gradient today.** All five numbers are produced inside the first second of a ride, and the rider has
   1.0–1.45 s. Step 3.5a already measured two of them moving between builds: time to 5° of rail 0.317–0.350 s, peak
   yaw rate 100–193 °/s across arms. [Q handoff §3.5a] **The fall count has not moved in 25 rounds; these did.**
3. **Most of it is already built.** `Maneuver` in `src/game/rideAnalysis.ts:28–52` already carries `start`, `end`,
   `yaw`, `peakYawRate`, `speedIn`, `speedOut`, `radius`, `lateralG`, `roll`, `faceFraction`, `pocket`. [R]
   `docs/research/ride-report.md` already prints these in one table beside the Forsyth row. [R]
4. **It is cheat-resistant in the way the others are not**, because the agent cannot command any of the five. It asks
   for a rail; the water and the hull decide the radius.
5. **It extends.** Pass it, then candidate B is next: link two, then N.

**What A′ still lets an agent get away with, stated plainly:** it says nothing about the body. A board can trace a
3.8 m radius with a rider posed rigidly on top of it. So A′ must be reported **beside** the body-channel columns of
§2, never instead of them. And `radius`, not `peakYawRate`, must carry the difficulty — the code's own comment says
why: *"a board that pivots, or rides moving water, swings its heading about its path"* (`rideAnalysis.ts:41`). [R]
**A yaw-rate score rewards pivoting on the spot.**

---

## 2. The metric set

Split three ways, as asked. **Every number carries its population and its frame.** Where a target is untested, it
says so and no eval is built on it.

### 2a. Computable today — no change to `src/` or `server/`

Every body channel the physics has is a **public readonly field**, verified in the file: [R]

| channel | field | file |
| --- | --- | --- |
| leg depth (commanded / achieved) | `rider.leg.rest`, `rider.leg.extension`, `.rate`, `.force` | `AttachedRider.ts:2084` |
| trunk fold, sagittal (`?rider=new`) | `rider.standingBody.hip.angle`, `.rate`, `.torque` | `standingBody.ts:158`, held at `AttachedRider.ts:2239` |
| trunk roll (both riders) | `rider.swing.angle`, `.rate` | `AttachedRider.ts:2319` |
| trunk pitch (`?agile=on`, ±10°) | `rider.trunk.angle`, `.rate` | `AttachedRider.ts:1980` |
| arm carriage, one scalar 0–1 | `rider.human.arms` | `humanBalance.ts:306`, held at `AttachedRider.ts:2247` |
| knee strategy 0–1 | `rider.human.knees` | already dumped by `3.5/depth.ts:265` |

So **"needs new columns" almost never means "needs a game change"** — it means a new file under
`docs/research/`, built the way the five existing probes are built (`rolldown … --platform node`, then `node`).

Computable today, with its footage counterpart and that counterpart's honest population:

| quantity | game-side source | footage counterpart | population of the counterpart |
| --- | --- | --- | --- |
| turn duration / yaw / radius / lateral g / speed kept | `Maneuver`, already computed | **0.96 ± 0.04 s, 99°, 3.8 m, 1.41 g** | **n = 6 riders, 835 turns** (literature) |
| time to 5° of rail; peak yaw rate | measured in 3.5a | — | no footage equivalent; use as a response column |
| direction changes per ride, and their spacing | `Maneuver` list; heading unwrap (`3.5/depth.ts:241–248`) | **≥ 13 in 30 s, one every ~2.3 s** | **1 clip, 2 riders, 3 shots, a LOWER BOUND; clip 7 had 0 in 13.0 s** |
| leg-depth trace, m of spring shortening | `leg.rest` / `leg.extension` | **apparent stature 63–81 % of standing** | **6 frames, 2 riders, 1 clip** — the only depth figure its author will defend unqualified |
| trunk-fold angle, rad (`?rider=new` only) | `standingBody.hip.angle` | trunk **5°–76°** from **image vertical** | ~30 moments, 2 riders (clip 9); ~25 moments, ≥1 rider (clip 8); ±10° |
| steps along the board | 0 by construction | **0** | 3 clips: measured (5 frames, clip 7), "unverified" (clip 8), "weak none seen" (clip 9) |
| manoeuvre mix and ride end | `RideReport`, `RideEnd` | manoeuvre counts per clip | per clip, 1 rider each |

**Two notes on that table.**

- **"Steps = zero" must not be made an eval.** The feet are at fixed deck positions and nothing moves them while
  upright (`riderPosture.ts:55–61`, `AttachedRider.ts:3035–3038`). [R, via `body-channels.md` §5] The game matches
  the footage **by construction**, so the metric cannot move and measures nothing. It belongs in a "already right"
  list, not in a score.
- **The direction-change rate is a capability, not a constant**, and the reads say so: clip 9 gives ≥13 in 30 s while
  clip 7 gives **0 in 13.021 s**. An eval must ask whether the engine *can* reach the busy end, never whether a given
  ride does.

### 2b. Needs new columns — a new research probe, still no game change

1. **A pump half-cycle measured on the OUTPUT.** Log `leg.extension` and `standingBody.hip.angle` together and take
   zero-crossings of each about its own mean. Footage target **0.55–0.60 s per half-cycle**; population **2 clips,
   2 riders, ~8 half-cycles, agreement claimed to within 10 %** — and **4 of the 9 clips report no pumping at all**.
   It is the series' most reproducible figure and it is still n ≈ 8.
   ⚠️ **This is only non-circular on `?rider=new`'s `hip.angle`**, which is driven independently of leg depth by the
   share of the ankle's own torque asking past 0.8 of the feet's reach (`standingBody.ts:274–275`). [R, via
   `body-channels.md` §2.2] Measured on leg depth, or on the drawing, it reads back the agent's own crouch script.
2. **Channel order — which channel moves first, and by how long.** A cross-correlation column over
   `leg.extension`, `hip.angle`, `human.arms`. This is the one that maps onto the reads' sharpest finding: *"either
   channel can carry a whole posture change on its own"* (`video-ref-9-ponta-preta.md:440–441`). [Q]
3. **The drawn body's trunk angle — what the owner actually sees.** `HumanoidRig.hinge` is in the render layer, but
   `scripts/stance-report.ts` already drives the drawn body headless on the four surfers' own skeletons and measures
   it with `StanceGauge`. [R] So this exists in pieces and needs wiring, not inventing. **It is required:** see the
   cheat in §4.7.
4. **Ankle-torque share per turn.** `bankLedger.ts` already partitions the deck's roll 23 ways with a residual of
   exactly 0. [Q handoff §3.5d] Reading it per manoeuvre rather than per window is a probe change.

### 2c. ⚠️ INEXPRESSIBLE — an expressibility limit, not a tuning gap

**No agent, no eval and no amount of tuning will move these. They need a force or a geometry change the owner must
rule on.** All five are read in the file by the body-channel survey, which I take as given.

| the footage's target | its population | why the engine cannot express it |
| --- | --- | --- |
| **the trunk folds 60° while the legs stay straight, as the VISIBLE body** | trunk 17°→76° against 23 points of leg (clip 8); the 0.6 s opposite-direction case (clip 9, rider B) | the drawn hinge is `tall + (deep − tall) × depth` — **one input, the drawn leg depth** (`HumanoidRig.ts:1385`, `stanceBlend.ts:73`). At trim frontside, 23 points of leg buys ~8°. At the backside bottom turn the pose is 30 → 30°, so the drawn trunk **cannot move with depth at all** |
| **the arm leads the rail by 0.07–0.10 s** | **1 direction change, rider B, 1 clip**, at 1/30 s true frames; the *order* in 3 of 4 changes (clip 8) | there is **no arm position in the physics**. `human.arms` is one scalar whose trigger is the knees' own expression (`humanBalance.ts:423–431`) — **simultaneous by construction** — and the two time constants run the wrong way: knees down `MOTOR_LAG = 0.05` s against arms `ARMS_TIME = 0.15` s |
| **the two legs sit 10–12 points apart in one frame** | **2 frames, clip 8**, and inside the saturated ruler of §2d | **one leg spring**: `leg = { extension, rate, rest, force, height }`, one rest, one row (index 6) of the board's solve |
| **hips travel aft while the shoulders go forward** | 4 clips report the fore-aft range, none with a foot moving | `TRIM_SHIFT = 0.25 m` translates pelvis, torso, head **and both arms together**. A differential needs a trunk joint in the mass model first |
| **four to six arm carriages inside one stance band** | 5–6 carriages per clip, clips 7/8/9 | the arms reach physics as **inertia only**; where they are reaches nothing |

**And one half-expressible case that matters more than the five**, because it will produce a passing eval and an
unchanged game: on `?rider=new` the trunk angle **exists, is independently driven, and is paired honestly** — but
`standingBody.hip.angle` **never moves `this.parts`**, so the body's centre of mass, inertia and pendulum length are
all computed from an unfolded posture. [R, via `body-channels.md` §2.2] **A trunk that folds 60° with no mass
consequence can match a timing target while changing nothing the owner can feel or see.**

### 2d. ⚠️ Targets that are UNTESTED — carry this into every eval brief

- **Every depth target from clips 7, 8 and 9 is untested.** Clip 9 showed the leg-chain ruler is **saturated** in
  broadside footage: *"the knee bend points at or away from the camera, the knee projects onto the hip–ankle line,
  the leg looks straight, and the ratio reads ~100 % no matter how deep the rider is"*
  (`video-ref-9-ponta-preta.md:74–78`). [Q] On the same frames, ruler 1 said 96–100 % and ruler 2 said 46–50 % — a
  **30-point** disagreement its author could not close. **So "every rider lives in the Tall band" and "no rider ever
  sits at the game's Crouch" may both be artefacts of the ruler.** ⚠️ **Do not build a depth-matching eval.**
- **Do not inherit the metre figures of clips 1–4.** Three early reads set a video hip fraction beside
  `STANCE_TABLE`'s **whole-body centre-of-mass height** as if it were a hip height. The tainted reads are named
  identically in four later documents: `video-ref-2.md`, `video-ref-3.md`, `kirra-reference-50-196s.md`. The figures
  not to reuse are Tall 0.85 / Crouch 0.65 / Compress 0.55 / tuck 0.40 m.
- **The down-transition has three forms, one instance each, and zero reproduction:** knees + trunk together over
  ~0.9 s (clip 7); **trunk alone** over ~0.3 s (clip 8, shot 11); **legs alone** over 0.33 s (clip 9, rider B).
  *"The engine should not be built as if it were one thing"* (`video-ref-9-ponta-preta.md:369–370`). [Q]
  ⚠️ **An eval must not demand one of the three.** Score *separability* — that the two channels can move apart at all
  — never a particular form. And note clip 7's resolution is 0.3 s, which is the whole duration of clips 8 and 9's
  transitions, so its "together" may be a resolution artefact.
- **Bottom-turn duration is a flat disagreement:** **1.00 s** (clip 8, n = 1) against **0.35–0.40 s** (clip 6, n = 1).
  Both clips claim real time; nobody in the set reconciles them. Clip 8 also disagrees with itself — its headline
  1.00 s window against four beats summing to 0.90 s. **Use the literature's 0.96 ± 0.04 s and record the clash.**
- **Two numbers in my own brief were wrong, and I am correcting them rather than passing them on:**
  **(a)** the "overhead ~0.7 s" is a **hold** duration, not a lead, and **no clip in the set has an overhead camera
  that produced any arm number** — clip 9's camera is a beach-level long lens, near side-on. **(b)** "cross-step"
  appears **nowhere** in the nine documents; the 0.55–0.60 s figure is a **trunk** fold/unfold half-cycle, not
  footwork. Do not build a cross-step eval on it.
- **Clips 1 and 2 are slowed 3–4×, unverified, and never converted.** Their durations are not comparable with
  anything else and their own documents say so.

---

## 3. What the agent controls, and what it must not

### The real player input surface, read from the code

`RideInput` (`src/physics/RideSession.ts:23–56`) is the whole of it, and `RideSession` forwards the standing fields to
the rider one-for-one at `:444–450`: [R]

```
rider.steer = input.steer;              rider.trim  = input.trim ?? 0;
rider.crouch = input.crouch ?? 0;       rider.compress = input.compress ?? 0;
rider.snap = … input.snap ?? 0;         rider.rotate = input.rotate ?? NaN;
rider.hand = input.hand ?? false;
```

| field | range | what it is |
| --- | --- | --- |
| `steer` | −1 … 1 | standing: weight onto a rail |
| `trim` | −1 … 1 | W/S, weight along the board |
| `crouch` | 0 … 1 | the riding stance to the pumping crouch; past 0.6 under a curl, the tuck |
| `compress` | 0 … 1 | the sharp-turn stance, **held** (Ruling C) |
| `snap` | 0 … 1 | the snap stance, held; wins over crouch, Compress and trim |
| `hand` | bool | the wave-side hand in the water — **the game picks which hand** |
| `rotate` | −1 … 1 | upper-body rotation; every device since 2026-10-22 gives this to the camera |
| `paddle`, `sprint`, `popUp`, `duckDive`, `reel` | — | prone and in the water |

**The agent gets exactly these and nothing else.** `Autopilot.next()` returns a `RideInput` and its own doc comment
says so: *"It only produces a `RideInput`, like a player"* (`Autopilot.ts:275`). [R] **It is player-equivalent by
construction, and that property must be preserved as the single hardest constraint on this work.**

### What it must not touch

- **Never a field on `AttachedRider` or `BoardBody` that `RideInput` does not reach.** The retired
  `uprightVelocity` is the cautionary case: it held the body plumb kinematically and looked like a rider that did
  not fall. Its benchmark is **retired** (3.2y) and must never be measured against again.
- **Never `RiderPlacement` as part of the objective.** Placement is legitimate for *starting* a trial cheaply (§5),
  and the probes already use it — but where the board starts is the **experiment's** parameter, not the agent's
  action. If the agent may choose its own placement it will choose the gentlest face, and 3.4h measured how much that
  is worth: the same stance rides **4.650 s** on one face and **1.033 s** on another. **Fix placement per cell and
  publish it with every number.**
- **No clock the player does not have.** A press is the agent's input, exactly as a player's would be — the way
  `3.5/depth.ts`'s `DIP` does it, *"Nothing is timed inside the game"* (`depth.ts:111`). [R]

### ⚠️ The control space is flat where the owner plays

| band | is the stick live? | evidence |
| --- | --- | --- |
| **1–3 m/s** | **no** | hard over vs never touched: **0 mismatches over 67 767 column-values**, 461 frames of 9 runs on one face and 371 of 9 on another, every column but `steer` itself [Q 3.5d] |
| **below 3 m/s** | **no, by mechanism** | `PLANING_DROP = 3`; below it the bank the rider may ask for is **exactly 0**, peak as well as median, `planing` 0.000 across the live window of 9 runs [Q 3.5a] |
| **4–6 m/s** | **yes** | the same pair becomes a different ride (543 vs 903 frames) [Q 3.5d] |

**So the agent's live controls in the owner's own band are the stance keys and W/S, not the stick.** If a first
action space is picked, pick that one. And **do not let an optimiser loose on `steer` below 4 m/s** — it would be
searching a space in which the objective is constant, and it would return noise that looks like a result.

---

## 4. Cheat-resistance, metric by metric

For each, *what is the laziest way to score well, and is that way surfing?*

| # | metric | laziest route | surfing? | verdict |
| --- | --- | --- | --- | --- |
| 1 | survival / fall count | pick the gentlest face and stand still | no | **rejected** — and the owner rejected it first |
| 2 | ride time, distance ridden | as above | no | **rejected**; it is #1 in another unit |
| 3 | "upright", roll magnitude | stand still; and 3.2w–3.2y measured that ankle, hip and whole-body counter-roll each **lower the roll and none moves the fall** | no | **rejected** |
| 4 | commanded pump period | write the number into the script — `PUMP_PERIOD` is already a constant | no — **circular** | **rejected** unless measured on `hip.angle`, which the agent does not command |
| 5 | peak yaw rate (`waveScore`'s `difficulty`) | pivot on the spot; the code's own comment says a board can swing its heading about its path | no | **use `radius` and speed kept instead** |
| 6 | direction-change count | micro-oscillate the stick; the reads define no threshold | no | **needs a floor on turned angle and on speed kept** — adopt `TURN_RATE` 0.6 rad/s × 0.3 s and `LINK_KEPT` 0.85 |
| 7 | trunk-fold timing on `hip.angle` alone | match the number while the **drawn** body still does its depth-slaved ~8° | no — the owner sees nothing change | **any trunk metric must read the drawn trunk too** (§2b.3) |
| 8 | pocket time, `faceFraction` | sit high on the face and do nothing | no | only ever **paired** with a completed turn |
| 9 | turn duration alone | a brief twitch satisfies a 0.35 s target | partly | pair duration **with** yaw ≥ 99° and radius |

### ⚠️ The shipped score is not usable as an eval unchanged

`scoreRide` (`src/game/waveScore.ts`) is the obvious thing to reach for, and it contains **two of the rejected
metrics**: [R]

- `length: Math.min(1, report.duration / FULL_LENGTH)` with `FULL_LENGTH = 20` s — **time to failure, weighted**;
- `completion`: halved when the ride ends in a fall within `FAILED_WITHIN = 1.5` s of the last manoeuvre.

With 626 of 626 falling at 1.0–1.45 s, **`completion` is halved on every ride and `length` is ≈ 0.05 on every ride.**
**The shipped score is saturated at the bottom exactly as the fall count is saturated at the top.** If `scoreRide` is
used, its six parts must be reported separately and `length` and `completion` dropped from the eval's own total.

---

## 5. How it searches, and what it costs on this machine

### Two harnesses, 700× apart

**The bench — `AttachedRider` + `BoardBody` + `FaceWater`, no sea at all.** This is what all five probes use
(`3.3/plant.ts`, `3.5/roll.ts`, `3.5/depth.ts`, `3.4/place.ts`, `3.5/foam.ts`). `FaceWater` is an **analytic endless
face** (`src/physics/testing/FaceWater.ts`, 98 lines): one crest over a trough, same along x, running at a given
speed. [R] The rider is placed on it, scripted inputs are set on the public fields, and per-tick columns are dumped.

Cost, from the 3.4 cost table's two explicit rows: [A over Q]

| row | runs | published cost | runs/min |
| --- | --- | --- | --- |
| every falls-per-runs figure of 3.3f–3.4f | ~24 × 24 = **576** | **~12 min** | **48** |
| `ARANGE=wide` on the corrected face | 4 × 24 = **96** | **~2 min** | **48** |

Two independent rows agree exactly: **48 runs/min ≈ 2 880 rides/hour, single process.**

⚠️ **Three caveats on that figure, all load-bearing.**
1. Those runs **end in a fall at 1.0–4.7 s**, and the probe breaks out of the loop on the fall
   (`depth.ts:321`). [R] **Cost scales with ride length.** A 10-s ride costs roughly 7–10× a 1.2-s one, so the
   moment the agent starts succeeding, throughput falls. Budget in **simulated seconds**, not rides.
2. `FaceWater` **has no wave** — no peel, no curl, no shoulder, no breaking crest. So nothing positional can be
   measured on it: not pocket time, not curl distance, not "a direction change in response to the wave".
3. The bench face is **not the owner's water.** The face ruling: the probes' `FACE=1.4,16,5.7` is the wave's
   **breaking** angle, and where the board actually sits the bench gives 12.1–12.3° against his spot's 5.4–5.6° —
   **×2.2.** [Q] Bench numbers are a *fit* to Canyon, not Canyon.

**The real sea — `SurfZoneRunner` on the CPU.** The one published figure is `docs/research/ride-report.md`: [R]

> `npm run report:ride -- --ghosts --style turns --seeds 2 --minutes 5` — **58.4 min** wall, 2 seeds × 5 min per spot,
> 2 spots = **20 simulated minutes**, stage 2 on the CPU. Result: **721 paddle attempts, 5 stands, 4 rides ≥ 3 s.**

So **~2.9× slower than real time [A], and ~4 usable rides per wall-clock hour.** Plus a Canyon spin-up of **47–49 s**
before any ride at all. [Q 3.5a] ⚠️ That run is from 2026-09-26 and the catch chain has changed since, so the 0.7 %
stand rate should be re-read before it is quoted as current. **But the shape of the problem is not the physics speed
— it is the catch.** 717 of 721 attempts produced nothing.

**The fix is already in the code.** `RiderPlacement` (`RideSession.ts:77–83`) places the board on the water with a
heading, a speed and `followSurface`, standing or prone — Surf School's placed start, and what every probe uses. [R]
**Place the rider; do not paddle.** At 2.9× real time, a placed 10-s ride on the real sea costs ~29 s, so
**~120 rides/hour** — a 30× improvement over paddling, on the owner's own spot.

### ⚠️ Parallelism is zero on this machine

Read as this was written: **4 642 free pages of 16 KB = ~76 MB free**, with **7 783 MB of 8 192 MB swap in use** on
8 GB of RAM and 8 cores. [R] Step 3.5a's round could not complete `vitest run` at all — three attempts, including
`--maxWorkers=2` over `src/physics` alone, **died silently with no summary: an OOM kill.** [Q]

**So: one process at a time. Do not design a fleet, and do not plan on 8 cores.** The ~2 880/hour bench figure is
the ceiling, not a per-core rate. And a long run takes the machine away from the owner while they are riding, which
the handoff already records as a reason a round was held.

### What kind of search, honestly

| approach | feasible now? | why |
| --- | --- | --- |
| **scripted sweep** (what the 29 arms already are) | **yes, and it is what to do** | deterministic, reproducible, publishable; 2 880 bench rides/hour is far more than the question needs |
| **search over input sequences** | **no, not yet** | the stick is inert below 4 m/s (0 of 67 767), so the sequence space is flat in the owner's band; and every rider-side lever is already measured and spent — 360+ runs an arm over 29 arms |
| **adaptive / learned policy** | **no** | needs thousands of episodes with a gradient, one process, a saturated 8 GB machine, and a reward we have just shown is either circular or flat |

**The agent does not need to learn. It needs to measure.**

---

## 6. ⚠️ The hard feasibility question: what does the agent buy, given 626 of 626?

**The agent cannot out-play the physics.** 626 rides, 29 arms, 9 placements from just under the crest to the bottom
of the face, 2 faces, entries 1–10.4 m/s: **626 of 626 fell**, Compress 205 of 205, the longest ride 7.75 s. [Q 3.4h]
If no input sequence survives, an agent will not find one. **That part of the brief is correct and I am not softening
it.** Here is what it buys anyway, and what it does not.

**What it genuinely buys:**

1. **A gradient where there is none.** The fall count has not moved in 25 rounds. The five numbers of §1's A′ *do*
   move: 3.5a measured time-to-5°-of-rail and peak yaw rate differing across arms, and 3.4h measured the fall
   changing **character** rather than kind — 70.0° of bank at 6.47 m/s on one arm against 42.6–48.5° at
   1.16–1.31 m/s on another, *"the same fall in slow motion"*. [Q] **That is a gradient, measured, inside the 1.45 s
   every ride lasts.** It is exactly what "your pump is 1.0 s against the footage's 0.55" needs.
2. **The owner stops being the bottleneck for anything measurable.** This is their actual complaint —
   *"All of it is up to me"* — and it is the clearest win. A metric reader answers "did this change move the number"
   in minutes, without a ride.
3. **Search over a space no hand-written sweep covers.** The 29 arms are each a *held* configuration. A closed-loop
   agent reacting to the wave produces input *sequences*, which a parameter sweep cannot reach. **This is real, but
   it is the thing to build second**, because of the inert stick.
4. **Measurement of movement rather than survival** — the whole of §2.

**What it does not buy, and must never be claimed to:**

- **It cannot say whether the game feels good.** Keep that half of the owner's standing rule intact.
- **It cannot move the five inexpressible targets of §2c.** Those need a force or a geometry change and the owner's
  ruling. An eval on them would report zero forever and teach nothing.
- **It cannot validate itself on the bench.** `FaceWater` is ×2.2 off the owner's water where the board sits.

### Is the agent premature? — **Half of it is. Say so plainly.**

- **The eval is NOT premature.** The harness exists, the channels are public, the Forsyth comparison is already
  printed in `ride-report.md`, and the first version is a research probe with no `src/` change and no ruling needed.
  It returns a real gradient on the first run. **Build it.**
- **The optimiser IS premature**, and for a sharper reason than the fall count: **the stick is measurably inert in
  the band the owner rides** (0 differences over 67 767 column-values at 1–3 m/s; the ask cap is exactly 0 below
  3 m/s). A search over controls in a flat control space returns noise. **The precondition for an optimiser is not
  "fix the fall" — it is "make the input reach the outcome below 4 m/s".** The 4 m/s floor is already a named lead
  (3.4j, 3.4k, 3.4l, 3.4m), and 3.4m closed the particular fix it tried. **That thread, not the agent, is what
  unblocks search.**

---

## 7. The division of labour — which questions are the agent's, and which stay the owner's

**The agent grinds measurable targets over many trials. The owner judges feel on a handful of rides.**

| the agent's questions | the owner's questions |
| --- | --- |
| How long does the turn take? How far does it turn? What radius, what speed kept? | Does it look like a person? |
| Did this change move that number, and by how much, over how many runs? | Is the fall acceptable where it happens? |
| Does a channel move at all, or is it pinned by a clamp or a cap? | **Which of the three down-transition forms should the game have?** Nothing in the footage settles it |
| Do the two body channels separate, ever? | **Is the bottom turn they want 0.35 s or 1.0 s?** The two clips disagree and only they can choose |
| Is the default build byte-identical? Did a probe column move a ride? | Should the trunk become something the player commands? (a force — their ruling) |
| What is the spread across runs, and the population behind every number? | Is a slow topple at 1.2 m/s better or worse than being thrown at 6.5? |

**No eval in this design claims to measure feel, fun, fluidity or "looks human".** Those words must not appear in a
score. The one time the bench and the ride agreed on a positive — *"doesnt look like a stick but an actual human
movement"* beside the lean row's 70 % cut over 96 of 96 runs — the bench measured the **lean row**, and the owner
supplied the word "human". That is the correct division and it should be the template.

---

## 8. What it costs, and the smallest useful first version

### Effort, per piece

| piece | effort | touches `src/`? | needs the owner's ruling? |
| --- | --- | --- | --- |
| **V1 — the turn-shape probe** (below) | **one round** | **no** — one file under `docs/research/` | **no** |
| **V1b — the apparent-stature BASELINE**, `engine-target.md` row 14's ruler applied to the game's own rider (§9) | **the same round** | no (a script, render-side) | **no** — it is a baseline, not a score |
| V2 — the same reader on the real sea, placed start, on Canyon | one round | no (reuses `ride-report.ts`'s pattern) | no |
| V3 — body-channel order columns (`hip.angle` × `leg` × `arms`) | one round | no | no |
| V4 — the drawn trunk read beside the physics one (`StanceGauge` wiring) | one round | no (a script) | no, but **show them**: it is what they see |
| V5 — direction-change linkage (candidate B) | one round, **blocked** | no | no — but needs a ride to reach ~3 s first |
| an optimiser / learned policy | **not scoped** | — | **blocked on the 4 m/s floor** |
| anything on the five inexpressible targets | — | **yes, a force or geometry** | **yes** |

### ⭐ The smallest useful first version

**One new research probe. No agent, no reward, no learning, no `src/` change.**

`docs/research/new-rider/3.5/shape.ts`, built in the pattern of `3.5/depth.ts` (~400 lines, same env-var cells, same
`rolldown … --platform node` build, same published-median discipline):

1. **Place** the rider on a `FaceWater` cell — fixed `FACE`, `AHEAD`, `SIDE`, published with every number. No paddle.
2. **Script one direction change** with the inputs a player has, and only those: hold a stance, ask for a rail, let
   go. The press is the probe's input, timed by the probe, not by the game.
3. **Log per tick:** `leg.rest`, `leg.extension`, `standingBody.hip.angle`, `human.arms`, `human.knees`,
   `swing.angle`, heading (unwrapped, as `depth.ts:241–248` already does), roll, speed over ground, `faceFraction`,
   and the ankle's torque. All of these are public fields today.
4. **Report, per run:** the turn's duration, degrees turned, path **radius**, lateral g, speed kept, and time to 5°
   of rail — set beside **Forsyth et al. 2024's 0.96 ± 0.04 s / 99° / 3.8 m / 1.41 g (n = 6 riders, 835 turns)**,
   which `ride-report.md` already prints in exactly that shape.
5. **Break on `!rider.attached`**, never on `!upright` — `separate` sets neither `phase` nor `upright`, and after it
   every rider column freezes at its last value. This trap has cost the track a round.
6. **Report the population with every number**, and never a median over a frozen window.

**Why this is the right first thing:** it returns four or five numbers that **differ between builds inside the
1.0–1.45 s every ride currently lasts**; it is scored on what the game returns, not on what the script asks for; it
is measured against the only properly powered population in the whole evidence base; it costs one round and risks
nothing, because it changes no byte of the game; and it answers the owner's complaint directly — after it exists,
"did this change help?" no longer requires them to ride.

**What V1 deliberately does not do:** it does not score the body (V3 does, and §2c says how much of the body cannot
be scored at all); it does not score survival or length; it does not optimise anything; and it does not claim
anything about feel.

---

## 9. The sibling document, and the one place we disagree

**`3.5/engine-target.md` merged while this was being written** (it is on `main` at `a52b6ced`), so it is no longer in
flight. **The division is clean and it set it itself:** *"The agent and eval design itself is a sibling document,
`playing-agent-scope.md`, not this one."* [Q] **It is the authority on what the target is** — 18 rows, each with its
footage number, its reproduction count, its code reading and its cost. **This document is only about how an agent and
an eval would reach one.** Read §2 here as the *harness* view of its rows, not as a second target list.

**Three places it independently confirms this document, which is worth more than agreement by construction:**

1. **Its "blocked by survival" category is rows 7, 8 and 16** — beat structure inside a manoeuvre, turns chained at a
   rate, and riding out of foam. [Q] That is reached by a different route from §1's and lands in the same place:
   **candidate B cannot be scored yet.**
2. **Its row 3 is an expressibility limit in the same terms:** *"no values of `hinge.tall`/`hinge.deep` produce
   opposite signs"*, and its metric for it is *"the fraction of frames where d(trunk)/dt and d(leg depth)/dt have
   opposite signs"*, which today is *"exactly 0, by construction"*. [Q] That is §2c's first row, with a better metric
   than I proposed — **take theirs.**
3. **Its row 17 agrees that zero steps is already right** and records it *"so that no round spends anything here"*. [Q]

### ⚠️ Where we disagree, and it is about V1

Its row 14 says apparent stature measured on the game's rider is *"the cheapest missing eval in the document: it
needs a render and a ruler, not a ride."* [Q] **On cheapness it is right and I was wrong to leave it out of §8.** But
I do not think it should be the first *eval*, and the reason is in its own row: the target is **63–81 % from 6 frames
and 2 riders of one clip**, it is tagged ⚠️ SAT, it is *"contradicted in direction by V7 and V8's 90–100 % under a
different ruler"*, and the row's own verdict is **"unknown / the owner's"**. [Q] §2d's rule applies: **do not score
against a contested target.**

**The reconciliation is that these are not the same act.** Their row 14 asks for a **baseline**; §8's V1 asks for a
**score**. A baseline needs no agreed target and cannot be cheated, because nothing is being optimised toward it.

> **So: compute apparent stature on the game's rider and publish it as a baseline. Do not score it.**
> It is cheap, it is honest, and it fills the gap the sibling names as its biggest — *"no quantity in this document
> has ever been computed on the game's own rider in the footage's own units … so there is no baseline for any row,
> and therefore no eval for any row."* [Q]

**That sentence is also the strongest argument for V1 as §8 states it**, and I had not seen it put that well: V1's
real job is not to score anything. **It is to produce the first baseline in the footage's own units**, on the one row
whose target has a population of 835 turns rather than 6 frames. Both can be in the same round — the ruler is a
render-side read, the turn shape is a physics-side read, and neither touches `src/`.

### Still owed

- **The tenth video read.** Its numbers are not in §2 and must be added with their own population and frame. ⚠️ If it
  is broadside footage, its depth numbers inherit §2d's saturation and must be labelled untested on arrival.
- **A clip shot from the water or down the line** would settle the saturated leg chain, which is the single largest
  provenance problem in the evidence base, and both documents independently ask for one. **It is worth asking the
  owner for it**, and it costs them one link.

## 10. What I did not establish, and would not want quoted as settled

- **I rode nothing and measured nothing.** This was a scoping round under that instruction. Every runtime figure in
  §5 is either read in a generated report's own header or my arithmetic over the 3.4 cost table's published rows,
  marked as such. **None of it is a timing I took.**
- **The ~2 880 rides/hour is for runs that end in a fall.** I did not measure the cost of a long ride, and the
  scaling claim in §5 is an inference from the probe's break-on-fall loop, not a measurement.
- **The real-sea figure rests on one run from 2026-09-26.** The catch chain has changed. **It should be re-read
  before it is quoted**, and I would not let the 0.7 % stand rate stand as current.
- **I did not verify the footage numbers against the clips.** They come from a read of the nine merged documents,
  with a verbatim quote and a line number behind each, and I have carried their authors' own caveats rather than
  smoothing them.
- **One discrepancy I could not settle.** `body-channels.md` §2.1 says the trunk rotor is `?rider=new`-only and
  therefore absent *"on what the owner actually rides"*. But the handoff records the owner's own confirmed ride
  address as `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two` — which **includes** `rider=new`.
  Both cannot be read the same way. It matters, because it decides whether a trunk-fold eval measures the build the
  owner rides or one they do not. **Settle it before V3.**
- **I did not trace the stage reader** that picks which drawn key pose is active, so §2c's first row is bounded
  correctly — *within one stage* the drawn fold is depth — but the across-stage behaviour is unmeasured.
- **"The agent is premature for search" is an argument, not a measurement.** It rests on 3.5d's inert-stick result,
  which was measured on two `FaceWater` faces at 1–3 m/s, not on Canyon. **If the stick turns out to be live on the
  owner's own water at those speeds, §6's conclusion weakens and should be re-argued.**
