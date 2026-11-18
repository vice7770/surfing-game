# The engine target: what nine clips ask the new rider to do, and what each ask costs

**A synthesis round. Nothing was built, ridden, measured or proposed.** No file under `src/` or `server/` was
touched. Every footage number is quoted from one of the nine video documents; every game number is a code reading
quoted from `3.5/body-channels.md`, `3.5/stance-frame.md` or the 2026-11-16 handoff. **No constant is proposed
anywhere.**

## Why this document exists — the owner's words

> ***"is this something that the game will be able to do in the future, the idea of this videos is to map what the
> new engine will be able to achieve"***

That is the purpose of the whole video series, and it had never been written in one place. Nine reads and a code
survey were scattered across `3.4/` and `3.5/`. This is them in one table.

And, from the same day, the sentence that sets how the table must be read:

> ***"we need to code some agent that will be able to play and have a evals to reach a objective of play. Because
> as of right now your are not skilled enough to play and keep the surfer up. All of it is up to me. So maybe the
> best approach is for you to scope and calculate if this videos will map to what is being built. Stating tests
> and survival rates is not a good metric"***

**They are right and this document obeys it.** "626 of 626 fell" has not moved in twenty-five rounds, so it has no
gradient: it cannot tell anyone whether a change helped. Median ride time is a time-to-failure, not a measure of
surfing. **So no row below succeeds by "he stops falling" or "the ride lasts longer."** Every row names its own
quantity instead (§2), and §3 says whether the engine can express that quantity at all.

That instruction is recorded as **Ruling F** (2026-11-18) in the handoff, together with two constraints this
document inherits: **the agent controls only what a player controls**, and **every metric must be cheat-resistant —
for each one, what is the laziest way to score well, and is that way surfing?** §2 answers that question per row.
The agent and eval design itself is a **sibling document, `playing-agent-scope.md`, not this one.**

---

## The answer first

### The first three rows, in priority order

**1. The trunk's fold must move the body's mass. 2. The drawn trunk must stop being a function of leg depth.
3. Then the two must be able to move in opposite directions at the same time.**

Rows 1 and 2 are **geometry**, need **no ruling**, are one change each, and every other body row in the table is
downstream of them. Row 3 builds nothing — it is the **acceptance test** for rows 1 and 2, and it is the sharpest
single thing the footage asks for that the engine cannot do.

They are first for a reason worth stating: they are the only rows that are **shippable without a ruling and
measurable without a longer ride**. The rows that need the rider to survive longer (7, 8, 16) are not first,
because nothing can be learned from them yet.

### STATUS 2026-11-18: ROWS 1 AND 2 ARE BUILT, AND ROW 3 IS ANSWERED YES

**PR #411, branch `claude/trunk-mass-3-5h`, opt-in behind `?trunk=mass`, open and not merged.** The rotor's own
parts — torso, head, both arms, i.e. what `HIP_PITCH_INERTIA` models — now turn about the **physical pelvis** by
`StandingBody.hip.angle` on local `+x`, and **local `+x` is `across`**: `orientation` is `bodyFrame` when upright
(`AttachedRider.ts:5113`) and `across` is `X` turned by `bodyFrame` (`:5278`), **so the fold's axis is the one
`StandingBody.couple` already pairs its couple on, in every stance and at every bank, with no frame correction.**
Verified here by reading both lines, because a fold about any other axis would be an unpaired couple.

| | default | `?trunk=mass` |
|---|---|---|
| trunk travel while the **leg spring's compression** holds within 2 mm | **0.00°** | **0.05–4.49°**, > 0 on 18 of 18 |
| trunk travel while the **drawn pelvis** holds within 2 mm | **0.00°** | **0.05–5.35°**, > 0 on 18 of 18 |
| **row 3 — opposite-sign frames** | **no moving frames at all** | **754 of 1 734 moving frames, 43.5 %** |
| centre of mass moved by the fold | **0.0000 m** | up to **0.1067 m** |

**Row 3 was the acceptance test and it passes: it was impossible, and it is now possible.** 60 paired arms, one
`FaceWater` bench (Canyon-matched 1.4 m / 16° / 5.7 m/s), 6 576 default and 6 484 switched live frames,
`RIDER=new FELT=deck BODY=two`. **No footage figure appears in the code, the probe or the test** — row 2's target
column has no number to build to and the round did not invent one.

**Three things the round itself says against it, and they matter more than the table:**

1. ⭐ **The rotor is INERT on 42 of 60 arms.** Its drive is the ankle's excess past 0.8 of the feet's reach, and on
   a gentle entry that is zero. **Making the fold possible and making it appear are different questions, and only
   the first is done.**
2. ⚠️ **The visual cost: the drawn trunk is 17.34° from vertical with the switch off and 6.18° with it on, at zero
   physics fold.** The rider **stands straighter in plain trim.** That is the honest trade.
3. ⭐ **A new one-owner coupling, found by the skinned-pose test and pinned rather than fixed:** `HumanoidRig`'s
   `this.up` is **both** the trunk's direction **and** the axis the drawn hips are lifted along (`standingLift`).
   Folded, those stop being one vector and **the drawn hips travel ~55 mm per radian.** It is **not** caused by
   standing the rig's own `backForMass` down (0.0499 m with the switch off, within 3 mm) — **it arrives with row 1
   itself.** What the lift axis should be is a rig question for the owner's eye.

**Falls: 60 of 60 on both arms**, time-to-fall unchanged on 46 arms, shorter on 10, longer on 4, upper middle
0.000 s — no direction. **Ruling F rejects that as a metric anyway.** **One bench**, and `FaceWater` writes
`breaking: 0, voidFraction: 0` with no foam. **No drag or work claim is made**, because `waterForces` samples at the
folded position but computes only `v + ω × offset` — no relative hinge motion, no local-centre recentre term.

**Nothing was added to make the fold behave** — no torque, no drive, no constant. **It did not need any.**

### STATUS 2026-11-18: ROW 6's RATE HALF IS SETTLED, AND ITS CLASSIFICATION IS WRONG

**PR #413, `claude/pump-rate`, measurement only — no constant tuned, no switch added, nothing under `src/` touched.**
**864 runs, 12 arms, 91 562 live ticks, 0 frozen**, `rider:'new' feltFrame:'deck' riderBody:'two'`, `steer = 0`
throughout (trim, no direction change), on `FaceWater`'s Canyon-**fit** face (1.4 m / 16° / 5.7 m/s; `breaking: 0`,
`voidFraction: 0`, **no foam**). Half-cycles taken from a **2 mm zigzag on the signal**, never from the input's
toggles. Medians are `qt(v, 0.5)`, the upper middle.

| asked half-cycle | achieved | rest excursion | **share of the 0.195 m rung** |
|---|---|---|---|
| 0.10 s | 0.100 s | 0.016 m | ⚠️ **0.08 — WITHDRAWN as an amplitude reading**, see below |
| 0.15 s | 0.150 s | 0.038 m | 0.20 |
| **0.22 s (the footage)** | **0.217 s** | **0.078 m** | **0.40** |
| 0.28 s | 0.267 s | 0.100 m | **0.51** |
| 0.45 s | 0.433 s | 0.160 m | 0.82 |
| 0.60 s | 0.600 s | 0.182 m | 0.93 |
| **key never pressed (the control)** | **0.650 s** | **0.016 m** | **20 half-cycles in 16 of 72 runs — NOT a zero** |

> **The channel completes a half-cycle at 0.217 s** — over **401 half-cycles in 69 of 72 runs** — **while carrying
> 40 % of the rung.** **The excursion falls below half the rung at a half-cycle of 0.27 s, and 0.27 s is row 6's
> number.**
>
> ⚠️ **DO NOT READ THIS AS A MATCH TO THE FOOTAGE. CORRECTED 2026-11-18 after an independent clip-14 read.** The
> 0.22 s it was briefly compared to is **a within-window average from one reader — 0.88 s divided by four, inside a
> single window — not a cadence the rider was shown to sustain.** The reviewer **reproduces leg involvement and a
> low trunk**, so the row's *direction* stands, but **could not independently count four equally identifiable
> half-strokes, nor measure any physical compression at that camera angle.** And ⚠️ **the board was rolling and
> turning through that passage — "from oblique to nearly end-on" — so "in trim with no direction change" may not
> describe the window at all.** Row 6 is specifically about pumping **in trim**. **The game figure is sound; it is
> the footage side of the comparison that has no reliable number — neither rate nor depth.**

**⚠️ CORRECTED 2026-11-18 (PR #413 at `9ab365b1`): the control was never a zero, and fixing it cost the round a row.**
The published `hold0` zero was an artefact — `firstPress` stayed `NaN` with the key never pressed and `x.t >= NaN`
emptied the filter. **Corrected, the control gives 20 half-cycles in 16 of 72 runs at a median 0.016 m** — the
balance's own knee drop wanders measurably **with the crouch key never touched.** Consequences, all stated by the
round rather than found later:

- **The 0.10 s arm is WITHDRAWN as an amplitude measurement.** Its median excursion is **0.016 m — identical to the
  control's.** At that command period the channel's depth is **indistinguishable from no input at all.** Its *timing*
  is still a reading (841 half-cycles in 63 of 72 runs at a median 0.100 s against 20 in 16 of 72 at 0.650 s); its
  *excursion* is not.
- **Every other arm clears the floor** as multiples of 0.016 m: 0.15 → **2.4×**, **0.22 → 4.9×**, 0.30 → **7.0×**,
  0.60 → **11.4×**.
- **And the round volunteered the overlap:** the control's own tail reaches **0.125 m on one run of 72**, which
  overlaps the 0.22 arm's 0.078 m median. **The medians and counts separate them; a single run does not.**
- **`hold1` was never broken** (a held key gives a finite `firstPress`) and **now carries the negative control's
  weight: 4 half-cycles in 4 of 72 runs at 0.005 m, 2.6 % of the rung.**
- **The positive arms are byte-identical** — 0.217 s, 0.078 m, the 0.40 share and the halving point are exactly as
  first measured. **The fix changed the control, not the result.**
- **The detector self-test now characterises both directions:** silent at and below the 2 mm threshold, **firing from
  3 mm**, and recovering amplitude and period at every amplitude tested — but **under-recovering ~5 % at large
  amplitude** (0.186 m from a known 0.195 m, 1/60 s sampling of a turning point), so **the halving point is quoted
  bracketed at 0.26–0.28 s** with 0.27 s the midpoint. A tightening of the stated precision, not a changed number.

**The governor is the critically damped follower at `LEG_FREQUENCY = 12` rad/s**, whose step response needs
**0.567 s** to come within 5 mm of the rung (50 % at 0.183 s, 90 % at 0.400 s, 95 % at 0.483 s). **Any half-period
under about 0.6 s is amplitude-limited.** An isolated replica of `prepareLeg`'s own lines reproduces **82–96 % of
the in-game excursion at all seven periods**, so the attribution is clean: **the follower governs and the game's
coupling costs 4–18 %.**

**So row 6's kind is wrong for the rate half.** The leg-depth pump is **not inexpressible at the footage's beat** —
it is present, timed to within 0.003 s, and **short on depth by a measured factor of 2.5.** That is a
**quantitative shortfall with a number**, not an expressibility limit. **Nothing here touches row 6's trunk half:
`hip.angle` was not read.**

**⚠️ AND THE COMPARISON CANNOT BE CLOSED, FOR THE REASON ROW 6 ALREADY CARRIES.** Whether 0.078 m is what video
14's rider does **is unknown**, because the footage's leg figures come off a **saturated** leg chain (99–100 % on
every readable frame). **The series has no measured depth for any pump, in any clip.** So **"40 % of the rung" is a
fact about the game and not a verdict against the footage** — only the *rate* was ever comparable. Closing it needs
a non-saturating depth excursion measured **from footage**, and no round has one.

**A second mechanism, real but not the one at 0.22 s:** at **0.30 s and longer** the chain's own asked-for excursion
falls to 0.166 m, because `stanceRoom`'s knee travel is **0.30 m at tall but only 0.15 m at the pumping crouch**
(`humanBalance.ts:159–160`), narrowing the square wave's ends to 0.045 m at saturated `knees`. **At 0.22 s the
asked-for excursion is 0.194 m over 525 half-cycles — essentially the whole rung** — so the knee drop moves the
pump's **mean depth**, not its **excursion**, in the band that matters.

**What to do about the follower is deliberately not proposed and is the owner's.** My own read, offered with low
confidence because I have been wrong on exactly this kind of call twice today: `LEG_FREQUENCY` looks like a
**capability constant** — how fast a leg can change its commanded length — rather than an invented force, since
every newton still arrives through the leg spring. **But there is no reason to touch it yet: the game pumps at the
right rhythm with an amplitude nobody has shown to be wrong.**

### STATUS 2026-11-18: ⭐ ROW 3's ACCEPTANCE TEST SHOULD BE **DECOUPLING**, NOT AN OPPOSITE SIGN

**Video 15 (PR #414) counted a category the series had never counted.** Over **10 resolved transitions with both
channels legible, in one 18.56 s ride**: 3 same-sign up, 1 same-sign down, 2 frozen, **4 DECOUPLED — one channel
moves while the other visibly does not — and 0 opposite-sign.**

| | count | status |
|---|---|---|
| **opposite-sign** (row 3 as written) | **0 in 36 resolved transitions, five riders, five clips** | V9's single passage stays **SINGLE and five-times-not-reproduced** |
| **DECOUPLED** | **4 in one ride** | **reproduced** |

> **Both are equally unreachable in the engine.** `HumanoidRig.ts:1383–1385` forces the drawn trunk's correlation
> with leg depth to **+1 within a stage**, so **a correlation of 0 is exactly as impossible as −1.** **So rows 1 and
> 2 can have a REPRODUCED acceptance test instead of a single-instance one** — and PR #411 should be judged on
> whether the two channels can **decouple**, not only on whether they can oppose.

**That is the strongest footage justification rows 1–2 have ever had**, and it arrives from a category nobody was
looking for. **Row 3's wording should be widened to "a correlation other than +1" rather than "opposite signs".**

### ROW 6: THE CLIP CONTAINS ALMOST NO TRIM, AND THAT IS THE FINDING

**The rider turns every ~1.9 s and the longest flat-board, constant-heading stretch in 22.661 s is 0.56 s.** Board
roll and heading were checked on **full frames** for every candidate, and **three otherwise pump-looking passages
were rejected** because the board's bottom became visible (rail roll) or its nose swung — at **10.80, 13.36,
17.28**. Three survived: **10.16–10.72 (0.56 s), 12.88–13.20 (0.32 s), 16.80–17.12 (0.32 s)**.

In the two longest, **the body's height over the board rises then falls once while the trunk's fold is visibly
unchanged** (6 frames at 0.08 s, fixed 260 px crops at magnification **exactly 1.00**, head length 40/40/37 px so
it is not a zoom). In the third, **both channels rise together — no cycle.** **The arm carriage does not change at
all through either.**

**No cadence and no depth were published, deliberately** — two half-strokes in 0.56 s is not a rhythm, and dividing
the window would be the **within-window average** this series has already withdrawn once. **And the height change is
not called a leg extension in any unit, because the knee is never identifiable as a joint anywhere in the clip**
(thigh inside boardshorts, ankle in spray; three attempts at 2.3–3.0×, three refusals).

**Against row 6's target (0.55–0.60 s, in the TRUNK, legs not working): neither half reproduces, and clips 14 and 15
are on the same side of it.** **Target column should read: "contested, and no clip has yet shown a sustained trim
cadence."**

### Row 5: its own evidence row is clip-specific, and the arm is not fixed

Row 5's evidence quotes V9's **rear** arm, which is correct for V9. **Video 15 shows the LEAD hand doing the same
job at ~14.36** (reaching up and forward over the nose) **and the REAR hand at 20.28.** **Both arms do it** — so the
row's intent is "an arm leads the rail", not "the rear arm leads". **Three leads in 7 resolved direction changes**
(+0.10 s ± 0.04 at 20.38, ≥ +0.20 s at 8.44, **≥ +0.50 s at ~14.90 — the longest in the series**). Tally **16 of 28
across seven clips.**

**Clip 14's top-of-wave / bottom-of-wave separator is REPRODUCED** (all three leads at the top, all four clean
misses at the bottom) and **clip 13's open-face/slab separator is contradicted again** — **but a borderline at the
top that does NOT lead (11.70) means it is not a rule even inside this clip.** **No separator may be built from
this.**

### Row 16 becomes a finding, and two rows gain reproductions

- **Row 16 — second anticipatory brace, resolved at the native grid.** A floater lands into whitewater at ~18.08,
  met with the body **already folded and compressed from ≤17.92**, **both channels frozen across 4 native frames**,
  and the ride continues standing for a further **4.3 s**. **With clip 14 that is a finding, not a sighting:
  the brace is anticipation, not a reaction after contact.**
- **Row 11 — the first reproduction of any down-transition form in the series:** two more instances of V9's
  "legs only" (10.32→10.56, 13.04→13.20). V7's and V8's forms stay single.
- **Row 8 —** fastest sustained chaining in the series (**≤1.86 s**, a lower bound) on the **longest single ride read
  (18.56 s)**. **Row 15 —** carriage A on an eighth clip. **Row 9 —** shoulders forward of hips in 5 frames.
- **Row 4 — its first NON-confirming clip**, recorded as a counterweight rather than skipped: this clip's
  straightest-legged, most upright passage (17.04–17.20) carries its **widest** arms, which is consistent with
  "tall ⇒ arms spread". **Seven clips refuted that implication and one consistent case does not restore it.**

### Two ⛔ refusals whose CAUSES are new

- **Row 2 — the trunk gate cannot be RUN at all**, not merely not passed: **this rider wears a loose T-shirt over his
  boardshorts, so there is no visible waistband anywhere in 22.661 s.** **The gate needs a garment edge that TRACKS
  THE PELVIS** — a waistband, a wetsuit seam, bare skin. **A loose shirt hem in a 5 m/s airflow is not a landmark.**
  So "calibrate within the clip" was necessary and **not sufficient.**
- **Row 18 — the series finally got its frame and lost it to LIGHT.** For the first time in fifteen clips a **90 px
  head and the board's nose are unambiguous together** (t = 19.000) — and the head is a **backlit flat silhouette,
  no eye, no mouth.** The in-image angle between the head's facing line and the board's long axis is **16° ± 8°**,
  head below the axis, **reported as a projection mixing yaw with pitch, not a yaw.** **The footage ask gains a
  clause: nose legible AND head ≥60 px AND the face LIT, not backlit.**

### Rows by kind of change

| kind | count | rows |
|---|---|---|
| **geometry** — states where mass already is, or sequences existing constants; **needs no ruling** | **9** | 1, 2, 3, 4, 5, 6, 11, 12, 15 |
| **force** — adds or changes a paired force, **or changes where one is applied**; **the owner must rule** (no hidden motors) | **3** | 9, 10, 19 |
| **blocked by survival** — cannot be judged while the rides end first | **3** | 7, 8, 16 |
| **unknown** | **3** | 13, 14, 18 |
| **none — the game already matches** | **1** | 17 |
| | **19** | |

Row 12 is geometry but its **whose call** is the owner's, because they have already ruled on it (Rulings C and E).

### The single biggest thing this document cannot yet say

**No quantity in this document has ever been computed on the game's own rider in the footage's own units.** Every
target in §2 is a footage number; every game-side entry in §1 is a **code reading, not a measurement**. So there is
no baseline for any row, and therefore no eval for any row. **That is the gap between this document and the agent
the owner just asked for.**

The sharpest instance is **depth**, the one quantity the whole engine is built around:

> Video 9 measured the same frames with two rulers and they disagree by about **thirty points** — the leg chain
> says **96–100 %** on every frame it could read, *including a rider folded over his own board*, while a vertical
> ruler (hip above deck ÷ head-length) says **30–66 %** on those same frames. The round refused to reconcile them
> and named **no rung for any frame**. So this document **cannot say what leg depth the engine should reach.**

Runners-up, in order: whether a rider ever **holds** a deep leg position (V5 says 1.75–2.9 s, V1–V4 say 0.25–0.7 s
spikes, V6/V7/V8 abstain, V9 has one hold of ~0.6 s — see row 12); which channel leads the **down**-transition
(three forms in three clips, row 11); and anything at all about **head and gaze** (nine clips, no readable face).

---

## 1. The spine

**Clip labels**, used throughout. V1 and V4 are the same source read in two parts.

| label | source | what it is for this table |
|---|---|---|
| **V1** | `3.4/kirra-reference.md` — Kirra, first 50 s | ⚠️ **slowed 3–4× (unverified per shot)** and **a montage of at least three rides**; its own remainder read found **at least five different surfers** in the source. **Any conclusion drawn from V1 as one person is unsafe.** Its metre figures are not inherited (§4.2). |
| **V4** | `3.4/kirra-reference-50-196s.md` — Kirra, 50–195.6 s | same source, 5+ riders, slowed; metre figures not inherited |
| **V2** | `3.4/video-ref-2.md` — Samuel Pupo (title only), Kirra | real speed unconfirmed; metre figures not inherited |
| **V3** | `3.4/video-ref-3.md` — "3 feet Nias Glass" | the owner's first-ever reference; drone from high and behind, **worst angle for knees** |
| **V5** | `3.5/video-ref-5-dave-rasta.md` | the one clip with **held** lows; one rider, 3 turns, one cut off by the clip's end |
| **V6** | `3.5/video-ref-6-mason-ho.md` | **one turn**, a bottom turn off a take-off; a structural zero on depth |
| **V7** | `3.5/video-ref-7-ripcurl-tube-and-trim.md` | a tube and 9 s of trim; **zero direction changes in 13 s**; 620 px, sharpest footage |
| **V8** | `3.5/video-ref-8-malibu-montage.md` | a montage, **≥8 shots, at least 3 boards**; figures are about *surfers*, not *a* surfer |
| **V9** | `3.5/video-ref-9-ponta-preta.md` | two riders, three shots, **≥13 direction changes in 30 s**; frame-level timing |

**⚠️ SAT** beside a row means that row rests on the **saturated leg chain** and is therefore **untested**: see §4.1.
**SINGLE** means one observation, on one rider, in one clip.

| # | what the footage shows | evidence (clips, numbers, population) | what the game has today | **why it cannot do it** | **kind of change** | **whose call** |
|---|---|---|---|---|---|---|
| **1** | The trunk folds through large angles and **the body's mass goes with it** — a surfer puts his weight over the nose by folding, not by crouching | Trunk from vertical spans **~17°→~76°** over six readable frames (V8 §0.2) and **~5°→~70°** visiting the whole range (V9 §2.2). A 23 kg torso and a 5 kg head over a hip ~0.78 m up. Three clips, three riders, three breaks (V7, V8, V9) | `?rider=new` has an honest trunk rotor: `StandingBody.hip` (8 kg·m², 200 N·m), driven **independently of leg depth** by the ankle loop's excess past 80 % of the feet's reach, on its own delay and lag; its torque is **paired** (`standingBody.ts:379–384`) and its power **booked** (`AttachedRider.ts:5076–5078`). **The shipped rider has no trunk-fold quantity at all** | **`hip.angle` is read in three places and never moves `this.parts`** (`AttachedRider.ts:4186`, `:5209`, and inside `StandingBody`). So the CoM, `bodyInertiaAt`, `riderYawInertia` and `stanceAt().height` are all computed from an **unfolded** trunk while the trunk folds 60°. The physics body is seven point masses in one hard-coded posture (`riderPosture.ts:93–102`, whose own comment at `:83–87` says the heights "are illustrative, not measured"), moved by one scalar vertical shift and one rigid translation of five of seven parts — **no part is ever rotated about another** | **geometry** — it states where the mass already is, for a torque already paired and already booked. No force, no constant | **mine / no ruling needed.** A hip rotor on the **shipped** rider would be a **force** → the owner's |
| **2** | A **"crouch" that is trunk fold over long legs** — the body is low and the legs are not | V7 §0.4: three of four lows measure **75–85 %** of straight-legged standing, the depth is in the trunk. V8 §0.2: the frame that looks most crouched (t = 14.70) is **trunk ~76°, leg chain 95 %**. V9 §2.5: rider A drives **0.40 s** with trunk 50–60° over a **96 %** leg chain. Three clips, three riders ⚠️ **SAT** (the leg numbers; the trunk angles are in-plane and not affected) | `HumanoidRig.hinge()` draws the trunk; `?turnTrunk=lean` (opt-in, drawing only) is the one place a drawn trunk angle reads a physics quantity other than depth | **`HumanoidRig.ts:1383–1385`: `wanted = ((tall + (deep − tall) × depth) × π)/180`, with `depth = (STANDING_PELVIS − pelvisOverDeck)/CROUCH_DEPTH` (`stanceBlend.ts:75`) — the drawn pelvis height and nothing else.** The drawn trunk is a one-line function of leg depth, so **it can only repeat what the legs said.** At trim frontside (16→50°) V8's 23 points of leg buys about **8°** against the footage's **60°**; at the backside bottom turn (30→30°) the drawn trunk **cannot move with depth at all** | **geometry**, drawing only. The second input is already sitting there unread (`hip.angle`) | **mine / no ruling needed** — but it is visible, so show it |
| **3** | **Two channels moving in opposite directions at the same time** | V9 T2: a deep leg position **held 0.6 s (14.10→14.70) while the trunk UN-FOLDS from ~35° to under 10°**. V9 T4: the trunk is **still folded 60–70° a full 0.4 s after the board has come round**. **SINGLE** (one rider, one passage, one clip) — but resolved at 1/15–1/30 s | Nothing. Within one stage the drawn trunk's correlation with drawn depth is exactly **+1** by construction | **The same one-line formula.** A trunk slaved to depth cannot represent either half: not the hold (the fold must change while depth does not), and not the lag (the fold must persist after the board is done). **This is an expressibility limit, not a tuning gap: no values of `hinge.tall`/`hinge.deep` produce opposite signs** | **geometry** — nothing to build beyond rows 1 and 2. **This row is their acceptance test** | **mine / no ruling needed** |
| **4** | **Arm carriage is its own channel**, with a height and a spread, independent of leg depth | V7 §2.3: **four carriages inside the Tall band**, held 0.4–1.7 s each, and the **narrowest, lowest** arms at the clip's **deepest** leg position. V8 §2.3: five carriages, four inside Tall; the decisive pair is 0.4 s apart in one shot — legs 99 % with the rear arm above the head, legs 95 % with both hands at the deck. V9 §2.4: five carriages, counts 6/5/4/5/2. **Four clips (V6, V7, V8, V9).** Both "tall ⇒ arms spread" and "deep ⇒ arms spread" are refuted | `HumanBalance.arms`, **one scalar 0–1**, `?rider=new` only (`humanBalance.ts:306`). The drawing has a rich arm map (`stanceMap`'s `leadArm`/`trailArm`, `snapArms`, `armSwing.ts:68–75` as a passive mass-damper) | **The one scalar has no height, no spread and no left/right**, and it is **slaved twice**: capped by `stanceRoom(depth).arms` and triggered by **the same expression that drops the knees** (`humanBalance.ts:423–431`, `Math.max(hip, capture)`). What physics sees is **inertia only** — `swingInertia` 6→10 kg·m², `riderYawInertia` +0.85, the twist rotor's +0.87 — **where the arms *are* reaches nothing.** The drawn map is selected by stage × depth, so **at one stage and one depth there is exactly one pose** | **geometry** for the position; the inertia path is already force-honest | **mine / no ruling needed** for a drawn position. **The owner's** if the arms are to move the board by more than their inertia |
| **5** | **The arm leads the rail and then holds** | V9 §0.2 at **1/30 s**: rear arm above the shoulder 18.034, **above the head 18.067**, rail bites 18.100, spray 18.134 — a lead of **0.07–0.10 s** — and **overhead for ~0.7 s** (18.03→18.80). Rider A: arm up 7.63, rotation begins 7.90 — **0.3 s**. **2 of 2** resolved at ≥15 fps. V8 §0.3: overhead before the legs extend in **3 of 4** resolvable direction changes, held ~0.3 s through a snap. **Two clips, three riders, two breaks.** The exception is informative: V9's **roundhouse cutback (1.10 s) has no overhead arm at all** and is carried on the lead arm reaching past the rail | Nothing to lead with. The one orderable pair exists: knees drop at `MOTOR_LAG` **0.05 s**, arms spread at `ARMS_TIME` **0.15 s**, knees return at `KNEE_RETURN_TIME` **0.6 s** | **No arm position exists, so there is nothing to put first.** And the one pair the game *does* order runs **backwards**: the knees reach their drop **three times faster** than the arms reach their spread, and the arms come back **four times faster** than the knees. The footage has the arm **first and held** | **geometry / sequencing** — re-ordering two existing time constants, no new force and no new constant. **The visible lead needs row 4 first** | **mine / no ruling needed** — but it changes what a rider does, so show it |
| **6** | **Pumping in trim is trunk fold, not leg depth** | V8 T5: **~4 fold/unfold half-cycles in 2.9 s**, ~0.6 s each, no direction change, leg chain **99 %** at the one readable point. V9 T1: **~4 half-cycles in 2.3 s, ~0.55 s each**, leg chain **100 %**. Different rider, different ocean, **agreeing within 10 % — the most reproducible figure the series has.** ⚠️ **SAT** (the "straight legs" half only; the **period** needs no hip landmark and is unaffected) | The game's pump is **leg depth** (the pump lesson is crouch-and-stand in rhythm) | Row 2's formula again, from the other side. To look like the footage the game must **drop the legs**, which measures a rung or two too deep and loses the trunk entirely. The footage wants **fold without leg depth**; the game has only **leg depth without fold** | **geometry**, downstream of rows 1–2. The period is then a tuning question | **mine / no ruling needed** |
| **7** | **A turn is a sequence of beats with durations** | V8 T3: bottom turn → climb → top turn in **1.00 s**, beats entry 0.15 / load 0.30 / peak 0.20 / exit 0.25, and **the peak is marked by an arm, not a hip**. V8 T4: a snap in **0.35 s**. V9 T4: a carve in **0.83 s**, beats arm 0.07 / entry 0.06 / load 0.27 / exit 0.40. V9 T5: a roundhouse cutback in **1.10 s**. Against the literature in `stance-frame.md` §6: a bottom turn **0.96 ± 0.04 s** (n = 6, 835 turns) and a cutback **0.8 ± 0.03 s** (n = 4, 2 060 cutbacks) | Moves are **named only after the fact** by `rideAnalysis` (`bottom turn`, `top turn`, `snap`, `cutback`). There is no beat clock | **There is no manoeuvre object to have beats.** A name applied afterwards cannot sequence anything. And the engine cannot currently **produce the sample**: rides end before a second beat structure exists to read | **blocked by survival** to judge; **geometry / sequencing** afterwards | **mine / no ruling needed**, when it becomes judgeable. **No date is promised** |
| **8** | **Turns chained at a rate** — one direction change every ~2.3 s, sustained | V9 §0.7: **≥13 direction changes in 30 s** (≥5 / ≥4 / ≥4 across three shots). **And V7 §0.2: ZERO direction changes in 13 s.** **The clips disagree and both are true of their clip** — V7 is a tube then a long trim, V9 is open-face turning. The engine has to cover **both ends of that range**, which is itself the requirement | Individually the moves exist. **Nothing in the game chains them** | No chaining notion exists, and the sample cannot be taken while rides end first. **This is a sixth axis no read before V9 had flagged: rate** | **blocked by survival** | **mine / no ruling needed**, when judgeable. **No date is promised** |
| **9** | **The hips travel aft while the shoulders travel forward, over planted feet** | V7 T5 (11.70–12.95 and its mirror at 4.70–5.10), **located in the hips over stationary feet with 0 steps in 13 s**; V8 T6 (three separate shots); V9 T6 (7.17–7.57, 14.30–14.43, 1.23–1.43, **0 steps in ~3.5 s** of legible feet); and V1's original observation. **Four clips, and in none of them does a foot move to do it.** No clip gives a magnitude — **direction and sign only** | **Default rider: a rigid translation.** `TRIM_SHIFT = 0.25 m` driven by W/S lands in `lean.z` and is added to **every part for which `shifts(i)` is true — pelvis, torso, head and both arms, together** (`AttachedRider.ts:5514–5518`). **`?rider=new`: no translation at all** — W/S becomes the pitch ankle's reference lean through `copTarget.z`, a torque with its reaction | **Hips and shoulders are welded.** They translate by the same 0.25 m in the same direction, so a differential is **not expressible at any value**. `STAMP_BACK` under Snap is the one place the upper body is asked back past the hips, and it is a **prescribed lean target, not a joint**. A real differential is a **hip joint**, so it needs row 1 in the mass model first | **force** — and **downstream of row 1** | **the owner's.** Bounded by no hidden motors: paired reaction, visible limb, and a kinematic prescription realised by whatever force it takes is a cheat |
| **10** | **The two legs at different extensions in the same frame** | V8 §0.4: front **97 %** / rear **86 %** at t = 14.40; front **88 %** / rear **76 %** at t = 13.30. Both from the same self-calibrating measurement on the same frame, **so the difference is more reliable than either absolute number** — and the two frames where the knee was unmistakable are the ones that read lowest, which is the bias showing itself honestly. **One clip, two frames** ⚠️ **SAT** (the absolute levels; V9 could not measure the split at all, because rider B's boardshorts reach his knee in exactly the deepest frames) | **One leg spring.** `readonly leg = { extension, rate, rest, force, height }` (`AttachedRider.ts:2084`) — one rest length, one stiffness, one damping, **one row (index 6) in the board's solve** | A 10–12 point split between the legs is **not expressible at any value.** The *drawing* already has two legs with separate targets (`stanceMap.ts:423–424`), but they differ only because the two feet sit at different places on the deck and the IK solves each from one pelvis point. **Codex reproduced this half independently on 2026-11-18** and cites the IK itself — `HumanoidRig.ts:1132–1174`, a `for (const side of SIDES)` loop with a per-side `ankleTarget`, a per-side `kneePole` and a per-side `solveTwoBone` — **verified here by reading.** Two readers, two sites, same conclusion. **It does not move this row's classification:** the row asks for a split that something *physical* drives, and `standingBody.ts` has no per-side anything in 386 lines — one leg line, one load, two knees only as a strength cap | **force** — a second spring, each with its own load and reaction at its own foot | **the owner's** |
| **11** | **The down-transition is not one thing** | **Three forms in three clips.** V7 T2: **knees and trunk together**, within its 0.3 s resolution. V8 T2: **trunk only** — 35°→76° while the leg chain moves 97 %→95 %. V9 T2 (down beat): **legs only** — hips drop over 0.33 s with the trunk unchanged within ±10°. **Each is SINGLE, on a different rider.** The up-transition is clearer and more reproduced: **legs lead the trunk by ~0.5 s** (V7 T1, 620 px) and **~0.3 s** (V8 T1) — **two riders, two breaks, same order** | One thing by construction | Row 2's formula allows exactly one form: both together, in fixed proportion. **That it is not one fixed thing IS the finding, and the engine must not be built as if it were** | **geometry** — a constraint on rows 1–3, not separate work | **mine / no ruling needed** |
| **12** | **A deep low: sometimes a 0.25–0.7 s dip, sometimes held for seconds** | **The clips disagree and the disagreement is the evidence.** **Dips:** V3 **2 of 2** at hips 35–50 % for 0.25–0.5 s as sampled, and *"a sustained crouch of more than 1 s: never"*; V4 **8 dips in ~30 slowed s of readable footage**, each 1–2 slowed s (**≈0.25–0.7 real s at 3–4×, unverified**), none over 2 consecutive samples; V1's **turns**, low phase 1.5–2 slowed s. **Holds:** V1's **tube**, held 15+ slowed s with only 10–15 points of change — but V4 found **no tube shot long enough to test it**, so it is neither reproduced nor refuted; **V2**, a long carve held 3–4 s of video clock with ~10 points of change; **V5, 3 of 3 turns, 1.75 / 2 / ≥2.9 s at 45–60 %** — one rider, the third cut off by the clip's end; V9, **one leg-depth hold of ~0.6 s**, the longest and clearest the series has, trunk upright throughout — **SINGLE**. **Abstaining:** V6 (no low below ~65 % at all), V7 (its tuck begins inside an invisible 2.95 s barrel, so **0.45 s is a lower bound, not a duration**), V8 (both deepest moments unmeasurable) | **All four stances, with Compress HELD** (Ruling C). The fourth `STANCE_TABLE` row and the deepen button `?deepen=on` are **built** (step 3.5b/3.5c) and ship by default; the dip fires on the owner's input only (Ruling E) | The pieces exist. **What does not exist is a self-release, and it cannot be added within the owner's rules**: measured, the dip **rose while still held in 0 of 19 runs, 0 ticks, at every hold length**; `kneeStrength = 2·KNEE_TORQUE/d` bounds a **force**, not a length, so it cannot raise the body; and a clock, timer, fatigue or stamina is **cancelled** (*"lets leave it as infite stamina"*). **A second measured limit: the leg's own pace needs 0.45–0.52 s for the last 0.15 m, so a 0.25 s press never arrives and only the upper half of the footage's 0.25–0.7 s band is reachable at the leg's current speed** | **geometry** — the depths and the button exist; what is left is sequencing | **the owner's — already ruled** (C: both patterns are real, the dip is an addition; E: it fires on their input only). **Crouch's value waits on their `?kneeRoom=achieved` ride** |
| **13** | **A low that the turn consumes, rather than one the turn causes** | V6 §3.1: the rider is at his lowest at the **end of the drop** (11.63–11.88), is **already extending when the board starts to come round**, and is at his **tallest at the peak of the turn** (12.25–12.50). **Low → tall, with the turn in the "tall" half. SINGLE — one turn, and it is a bottom turn off a take-off, so the low it spends is the pop-up's.** It is the **1 of 9**: eight earlier readable turns put the low at entry. It is also the one surf frame that matches the ski and skateboard literature's sign (`stance-frame.md` §6(d): flex between turns, extend through the arc) | Nothing ties a depth change to a turn's phase in either direction | The timing the game has, where it has one, is **compress into the turn** — the opposite. But with one observation on one take-off turn, **the footage does not establish which way round it should be**, and this document does not pick | **unknown** | **the owner's** — it is a feel question and they ride |
| **14** | **Where a rider actually lives on the depth ladder** | **The robust ruler, which needs no hip landmark: apparent stature in head-lengths against a standing human's 7.7.** V9 §0.6: **4.86–6.24 head-lengths = 63–81 % of standing height, moving 17 points in 0.27 s** — *"the one depth statement in this document I would defend without qualification."* Against it: V7 and V8 both put the resting stance at **90–100 %** of the straight leg and reach 99 % twice, **above the game's Tall** — in the **opposite direction** from V9. **Those two readings use different denominators and different rulers and must not be averaged** ⚠️ **SAT** | The ladder in the game's own units (`stance-frame.md` §3): Tall **89 %** of its own straight leg, Crouch **66 %**, Compress **55 %**, tuck **38 %** | **Not a code limit — a measurement limit.** The two rulers disagree by ~30 points (§4.1) and the game's rider has **never been measured in the footage's robust ruler at all**. Eight clips said no rider sustains the game's Crouch rung; **V9 is the first to abstain, with a stated reason** — its two rulers bracket 66 % from both sides | **unknown** | **the owner's** — and it carries an **ask** (§6) |
| **15** | **Both hands carried low over the deck, inside the rails, with the trunk folded** | V8 §2.4: **5 separate windows, ~15 frames — the clip's single most common arm position**, in trim, driving into foam and recovering from whitewater. V9 §2.4 carriage A: **6 windows, the clip's most common.** V7: lead hand low at the deck, rail or water in **9 frames across 4 windows**. **Three clips.** It is *not* the hand drag of a tube ride — the hands are over the **deck**, usually both at once | A `hand` input that puts **one** hand in the face, with a real flat-plate drag (C_dA = 1.1 × 0.013 m², Berger et al. 1995) whose moment turns the board through the feet | **It is on/off, it points at the water, and the game chooses which hand** — `handSide` comes from the bank's sign or from which side the water stands higher (`AttachedRider.ts:5720–5732`). There is no two-handed carriage, and no arm position at all (row 4) | **geometry** for the position | **mine / no ruling needed** for a drawn carriage; **the owner's** if the hands are to do more than their existing drag |
| **16** | **Meeting whitewater: a brace, and riding out of it still standing** | V6 §5 row 7: at 12.88 the trunk folds sharply forward and both arms go down and forward **as the foam lands** — **SINGLE**, one frame, end not seen. Riding out of an engulfment still on the feet: V6 (3.35 s invisible, then riding), V8 (**2 shots**), V9 (**2**, one over the falls). **Three clips** | A wipeout exists. **No absorb-an-impact posture; the rider meets foam with whatever stance it already holds.** Separately, step 3.5e established the foam **does** reach the board, through five channels | No posture exists to brace with, and the ride-through cannot be judged while rides end first. The owner's own words name this as felt: *"this happen on turns and on tip of the wave foam that creates instability"* | **blocked by survival** to judge; the posture itself is **geometry** | **mine / no ruling needed** for the posture. **No date is promised** |
| **17** | **The feet never move while standing** | V7 §2.4, the strongest count in the series: the **front foot sits at 44–49 % of board length from the nose across 5 frames spanning 9.80–11.40 s**, inside a ±3–5 % reading error, and **the rear foot never leaves the traction pad — 0 steps in 13 s.** V8: 0 seen, but **weaker** (the deck and both feet were rarely both in frame). V9: 0 in ~3.5 s of legible feet, **also weaker** | The feet are fixed at **0.30 m from the tail and +0.63 m ahead of it** (`riderPosture.ts:59–62`, the measured pop-up spacing from Borgonovo-Santos et al. 2021) and **nothing moves them while upright** (`AttachedRider.ts:3035–3038`) | **Nothing to fix. Zero steps by construction, and the footage asks for zero steps.** This is the one row where the game and the footage simply agree — recorded so that no round spends anything here | **none — already correct** | **mine / nothing to decide** |
| **18** | **Head and gaze** | **Nine clips, no usable observation.** The face is 5–8 px wide in the close shots (V4), a few pixels from the drone (V3), never resolvable (V6, V7, V8, V9). All any read could say is that the head is turned with the trunk where it is visible | No head or gaze role in the stance or the rig | Nothing to compare against. **The footage cannot supply a target, so this document will not invent one** | **unknown** | **the owner's** — whether they want it at all |
| **19** | **The loaded hand torques the body** — a layback, a hand-drag stall, a hand set in the face | V11 (**Codex's independent read**, 4.10 s): one arm raised, the other hand approaching the water. V2 §7 (6.5-7.5 s): the rider draped over a horizontal board, one leg extended. **Contact is not measurable in any clip** - no read in the series has ever resolved whether a hand carries weight, and Codex says so for V11 too | The hand's water force is real and already paired: `applyWater` builds it, `waterForce.add(force)` sums it (`AttachedRider.ts:4502`), and `waterMoment.add(cross(arm, force))` computes **its full moment at the hand's own lever** (`:4504`). Then only `waterMoment.y` is differenced out - `handYaw = this.waterMoment.y - moment` (`:4357`) - and only `rhs[4]` receives it (`:4735`). **The x and z components are computed and then dropped** | The hand's force reaches the **board** at the feet's lever (`cross(a, f)`), and reaches the **body** as a net force on its centre-of-mass line - `standingBody.couple` is handed `f`, never a per-part moment. **CORRECTED 2026-11-18 by Codex, who is right:** the hand's force *does* roll and pitch the board — through the coupled force path, at the feet's lever. What is missing is the **hand-specific residual moment about the rider reference**, `cross(hand − a, F_hand)`, whose standing path retains **world Y only**. **And two omitted components say nothing about the fraction of torque lost** — the residual's size has never been measured, so "two of three" counts components, not share of moment. What survives: **a hand in the water cannot roll or pitch the board at its own lever**, so a layback leans on the feet, not on the hand. Introduced by `58396bff`, *"feat: drag a hand in the face to stall"* - a **yaw feature whose scope was yaw**; nothing in the code says the other two components were considered | **force-application / constraint-model change** — Codex's classification, and **it overturns mine.** I called it energy-neutral. It is not: **a change to the lever changes angular work by the residual moment dotted with the angular velocity**, so moving a force's point of application is a dynamics change, not bookkeeping. Codex's conditions if it is ever built: **preserve the force and its reaction exactly once**, and check **sign, reference origin, body DOFs and rotational work on every path** | **the owner's** — a force-class change by the owner's own rule. My argument that it needed no ruling was wrong |

---

## 2. What would measure each row

The owner rejected survival rate and ride time, so each row needs its own quantity. **The footage's own number is
the target.** Where a row has no computable target, that is said plainly.

**Reproduction is stated for every target**, because a figure reproduced on two riders at two breaks is worth more
than a figure from one frame.

| # | the quantity to measure | footage target | reproduced across | how it reads today |
|---|---|---|---|---|
| **1** | The difference between the CoM the mass model uses and the CoM implied by `hip.angle`. **An internal consistency check, with target zero** | **No footage number, and none is needed** — the footage's contribution is only that the fold is large (trunk to 60–76°) so the error is large. The CoM error is of order **0.1 m** [an inference, from the part masses and a 0.78 m hip] | n/a — this is a code-consistency metric | The error is **unmeasured**. `hip.angle` is computed, paired, booked, and then discarded by `parts` |
| **2** | **Trunk travel from vertical reachable at a fixed leg depth**, per stage | **≥ 60°** | **3 clips, 3 riders, 3 breaks** (V7, V8, V9); V8's own span is 17°→76° | **~8°** at trim frontside for 23 points of leg; **0°** at the backside bottom turn. Not a ride measurement — read off `HumanoidRig.ts:1383–1385` and `stagePoses.ts` |
| **3** | **The fraction of frames where d(trunk)/dt and d(leg depth)/dt have opposite signs** | **> 0.** The footage's instance is a **0.6 s** window with the trunk going one way and the legs the other, plus a **0.4 s** trunk lag after the board finishes | **SINGLE** (V9, one rider, one passage, resolved at 1/15–1/30 s) | **Exactly 0, by construction** — the correlation within a stage is +1 |
| **4** | **The number of distinct arm carriages reachable at one leg depth**, and the arm's height band | **≥ 4 carriages at one depth** (V7's four inside the Tall band; V8's five with four inside it; V9's five, counts 6/5/4/5/2) | **4 clips** (V6, V7, V8, V9) | **1** — one pose per stage × depth |
| **5** | **The signed lead time** from the arm reaching its carriage to the rail biting, and the **hold** duration | **lead +0.07 to +0.30 s; hold ~0.7 s** | **2 clips, 3 riders, 2 breaks** — V9 **2 of 2** resolved at ≥15 fps (one at 1/30 s), V8 **3 of 4** at 0.1–0.2 s. **Exception recorded: V9's 1.10 s roundhouse has no overhead arm, so the target is "the engine can lead", not "it always leads"** | **The wrong sign.** The arms trail the knees by about **0.10 s of time constant** — `MOTOR_LAG` 0.05 s against `ARMS_TIME` 0.15 s — and come back **four times faster** (`KNEE_RETURN_TIME` 0.6 s). **That is an inference from two constants, not a measured lead**, and there is no arm position for a lead to be visible in anyway |
| **6** | **Fold/unfold half-cycle period in trim with no direction change**, and the leg-depth excursion during it | **0.55–0.60 s per half-cycle**, ~4 half-cycles in 2.3–2.9 s, with the legs **not** doing the work | **2 clips, 2 riders, 2 oceans, within 10 % — the most reproducible figure the series has.** ⚠️ **SAT** applies to "the legs are straight"; **the period does not depend on the ruler** | The game's pump **is** the leg excursion. The trunk period at fixed depth is **0** |
| **7** | **Beat durations inside one manoeuvre** | bottom turn → climb → top turn **1.00 s** (beats 0.15 / 0.30 / 0.20 / 0.25); snap **0.35 s**; carve **0.83 s** (beats 0.07 / 0.06 / 0.27 / 0.40); roundhouse **1.10 s**. Independently: bottom turn **0.96 ± 0.04 s** (n = 6, 835 turns), cutback **0.8 ± 0.03 s** (n = 4, 2 060) | V8 (one complete unoccluded sequence) and V9 (two) — **2 clips**, and the agreement with the published turn durations is what established that the footage runs at or near real time | **No metric exists**: moves are named after the fact, so there is nothing with beats. **And the sample cannot be produced yet** |
| **8** | **Direction changes per second, sustained over tens of seconds** | **A range, not a number: 0 in 13 s (V7) to ≥13 in 30 s — one every ~2.3 s (V9).** Both are real surfing; the engine must cover both | **2 clips, and they disagree — deliberately not averaged** | **Not samplable yet.** No chaining notion exists |
| **9** | **The signed difference between hip travel and shoulder travel along the board, with the feet fixed** | **Sign and direction only — hips aft, shoulders forward, and the mirror.** **No clip gives a magnitude, so there is no number to aim at.** The companion figure is **0 steps**, which row 17 already matches | **4 clips** (V1, V7, V8, V9) for the pattern; **V7 located it in the hips over planted feet** | **Exactly 0 by construction** on the default rider (one rigid translation); **no translation at all** on `?rider=new` |
| **10** | **Front-leg minus rear-leg extension, in the same frame** | **~10–12 points** (97/86 and 88/76) | **1 clip, 2 frames, one montage** ⚠️ **SAT** for the absolute levels; the *difference* is the more reliable part, and V9 could not measure the split at all | **Exactly 0** — one rest length, one solve row |
| **11** | **Which channel moves first on the way down, as a distribution over transitions** | **All three forms must be reachable** — knees+trunk together, trunk only, legs only. **No proportion to aim at: the variety is the target.** On the way **up** there is a figure: **legs lead the trunk by 0.3–0.5 s** | down: **3 clips, 3 forms, each SINGLE.** up: **2 clips, 2 riders, same order** | One form, in fixed proportion |
| **12** | **The duration distribution of lows below the Compress band**, separated by whether the key is tapped or held | **A distribution covering both patterns, by Ruling C** — a **0.25–0.7 s** dip band *and* **held** lows of 1.75–2.9 s. The reachable part of the dip band today is its **upper half only** (the leg needs 0.45–0.52 s for the last 0.15 m) | **dips: 3 clips** (V1's turns, V3, V4) — and V1/V4's durations are **slowed-footage seconds divided by an unverified 3–4×**. **holds: 3 clips** (V1's tube, unreproducible; V2; V5, 3 of 3 turns on one rider) plus V9's ~0.6 s near-miss, SINGLE. **3 clips abstain.** **Not averaged — both patterns ship** | Held for as long as the key is pressed; **rose while still held in 0 of 19 runs**. The dip exists (`?deepen=on`) and fires on the owner's input |
| **13** | **The sign of the leg-depth change through a turn's load beat** — compressing into the arc, or extending through it | **Both signs must be reachable. No proportion: 8 of 9 readable turns put the low at entry and V6's one turn is the opposite, and one observation does not set a target** | **SINGLE** for the exception (V6, one take-off turn); 8 earlier turns for the majority, several of them on slowed or unverified footage | The game's one shipped timing is **compress into the turn** |
| **14** | **Apparent stature in head-lengths, measured on the game's rider from the same camera geometry as the footage** | **63–81 % of standing height, with 17 points of travel in 0.27 s** (V9's defended figure) | **1 clip, 2 riders** for the figure; **and it is contradicted in direction** by V7 and V8's 90–100 % under a different ruler. ⚠️ **SAT** | **Never computed on the game at all.** This is the cheapest missing eval in the document: it needs a render and a ruler, not a ride |
| **15** | **The share of riding frames with both hands low over the deck**, and whether it is reachable at both shallow and deep legs | **The most common arm position in two of the three sharpest clips** (V8: 5 windows; V9: 6 windows). **No percentage is published, so there is no share to aim at — only "reachable, and at any depth"** | **3 clips** (V7, V8, V9) | One hand, on/off, pointed at the water, side chosen by the game |
| **16** | **Whether a distinct posture exists at foam contact**, and whether a ride survives an engulfment | **No duration or angle target — one frame of brace in nine clips.** The ride-through is observed in 3 clips but never measured | **SINGLE** for the brace; **3 clips** for riding out of foam | No posture. The ride-through is **not judgeable yet** |
| **17** | **Foot travel along the board while standing** | **0 steps.** V7's own count: front foot at 44–49 % of board length across 5 frames over 1.6 s | **3 clips** (V7 strong, V8 and V9 weak "none seen") | **0 by construction. The target is already met** |
| **18** | **Head yaw relative to the trunk or the board's heading** | **None. Nine clips cannot supply one.** An honest "no metric yet" | **0 clips** | No quantity exists |
| **19** | **The roll and pitch moment a loaded hand puts on the body**, against the ankle's own torque | **No footage target** - contact is unmeasurable in eleven clips. The code-side target is an identity: `cross(hand - CoM, F_hand)` is computed every substep and discarded | **0 clips.** This row comes from reading code, not footage - the only row in the table that does | **Yaw only.** `handYaw` is `waterMoment.y`; x and z are computed and thrown away. **Their magnitude has never been measured**, so no fraction-of-torque claim may be made from this row |

### 2.1 Which of these an agent could score today

The owner asked for *"some agent that will be able to play and have a evals to reach a objective of play."* **This
table is the eval list, not the agent** — the agent is scoped in `playing-agent-scope.md`.

| | rows |
|---|---|
| **computable without a longer ride** (a short ride, or in rows 1, 2 and 14's case no ride at all) | **1, 2, 3, 4, 5, 6, 9, 10, 11, 14, 17** |
| **not samplable yet** — the ride ends before the behaviour exists to measure | **7, 8, 16** |
| **no target at all** — the footage cannot supply one | **13, 18** |
| **a distribution, not a number** — by Ruling C, both patterns must be reachable | **12** |

### 2.2 ⚠️ Cheat-resistance, as Ruling F requires

For each metric: **what is the laziest way to score well, and is that way surfing?** This matters more here than
usual, because `uprightVelocity` already cost this project months by looking like a rider that did not fall.

| metric | the lazy route to a good score | is it surfing? | the guard |
|---|---|---|---|
| **rows 2, 3, 6, 11** (trunk travel, opposite signs, pump period, transition forms) | **Shake the trunk.** A trunk rotor driven by noise scores full marks on travel, on opposite signs and on a 0.55 s period | **No** | These are **necessary, not sufficient**. The trunk must be driven by a **paired torque with a cause** — `StandingBody.hip`'s existing driver is the ankle loop's excess, which is a cause. **A metric on trunk motion alone must never be the objective; it is a precondition check** |
| **row 4** (carriages at one depth) | **Cycle the arms at random.** Four distinct positions is trivially reachable | **No** | Score the carriage against **what the rider is doing**, which is the footage's own finding (V6 §0.6: the thing that switches carriage is the manoeuvre, not the depth). Without a manoeuvre notion (row 7) this metric is weak and should be reported as weak |
| **row 5** (arm lead) | **Move the arm constantly**, so it is always "already up" before any rail bite | **No** | The footage's lead comes with a **hold** (~0.7 s) and with the arm **still** before it. Score lead **and** stillness before it **and** hold after it, or the metric is gameable |
| **row 9** (fore-aft differential) | **Oscillate hips against shoulders** with no relation to the turn | **No** | Only meaningful once the differential is a **paired force** (it is the owner's ruling), and then it is scored by its reaction, not its displacement |
| **row 10** (leg split) | Trivially gamed by any asymmetric drive | **No** | Score the **load** at each foot, which a second spring makes real, not the geometric split |
| **row 12** (low durations) | **Hold the key.** Scoring "reaches the deep band" rewards camping in it — which is exactly what no rider does | **No** | Score the **distribution** of durations against the footage's two modes, not the depth reached |
| **row 14** (apparent stature) | **Stand still at the right height.** A score that rewards "63–81 % of standing" rewards a statue | **No** | The footage's figure moves **17 points in 0.27 s**. Score the **travel and its rate**, never the level alone |
| **row 17** (zero steps) | **Already satisfied by construction** | n/a | **It is a regression guard, not a target.** Score it only to catch a change that breaks it |

**The general rule this produces:** every metric in §2 is a **check that the engine can express the footage**, not
an objective to maximise. **An objective of play is the owner's to choose** and is not proposed here.

---

## 3. Feasibility: does the footage map onto what is being built?

The owner asked to *"scope and calculate if this videos will map to what is being built."* Four different answers
are possible and they deserve four different words.

| word | meaning |
|---|---|
| **tuning gap** | the quantity exists, is wired, and is simply at the wrong value |
| **wiring gap** | the quantity exists and is honest, but nothing downstream reads it |
| **expressibility limit** | **no value of any existing constant can produce the behaviour** — the shape of the model forbids it |
| **absent quantity** | there is no number for it at all |

**The one sentence that governs the whole section.** The shipped physics body is **seven point masses in one
hard-coded standing posture**, moved by exactly **one scalar vertical shift** (leg extension) and **one rigid
horizontal translation of five of the seven parts** — and **no part is ever rotated about another**
(`riderPosture.ts:93–102`, `AttachedRider.ts:2709`, `:5514–5518`). `StandingBody` — the only place a trunk angle
exists in physics — is reached only through `freeBody = newRider && upright && standing`
(`AttachedRider.ts:2610–2612`), the **`?rider=new` opt-in**.

> **So on what the owner actually rides today, rows 1 through 11 are not tuning gaps. They are absent quantities.**
> **On `?rider=new` they are mostly wiring gaps and expressibility limits, which is much cheaper.** That difference
> is the single most useful thing in this section.

| # | verdict | what it turns on |
|---|---|---|
| **1** | **wiring gap** on `?rider=new`; **absent quantity** on the shipped rider | `hip.angle` exists, is paired, is booked, and is read in three places that never touch `this.parts`. Rotating the parts with it adds **no force** |
| **2** | **expressibility limit** | `wanted = tall + (deep − tall) × depth`. **No values of `hinge.tall` or `hinge.deep` let the trunk move while the legs do not** — the formula has one input. Removable by **wiring** a second input, not by tuning. `?turnTrunk=lean` already proves a second input is possible |
| **3** | **expressibility limit, the hardest in the table** | Downstream of 1 and 2. **A trunk that is a one-line function of leg depth cannot express a trunk moving opposite to the legs, no matter what is tuned.** Once rows 1 and 2 land it becomes reachable; until then it is impossible, not merely wrong |
| **4** | **expressibility limit** | One dimensionless scalar cannot hold a height, a spread and a left/right. Four carriages at one depth need at least two more quantities. The drawing's rich map is **selected by stage × depth**, so it adds no independence at fixed stage and depth |
| **5** | **tuning gap** for the order; **absent quantity** for the visible lead | The two time constants exist and can be re-ordered. But with no arm position (row 4) **there is nothing for the lead to be seen in**, so the sequencing change alone buys an inertia change and no movement |
| **6** | **expressibility limit** while row 2 holds; **tuning gap** after | The period (0.55–0.60 s) is a value; the channel it must run in does not exist yet |
| **7** | **absent quantity**, twice over | No manoeuvre object to carry beats, and no sample while rides end first |
| **8** | **absent quantity** | No chaining notion; no sample |
| **9** | **expressibility limit** | One translation applied to five parts together. A differential is **not reachable at any value of `TRIM_SHIFT`**. It needs a hip joint in the mass model (row 1) and then a **force** |
| **10** | **expressibility limit** | One rest length, one stiffness, one solve row. A split is not reachable at any value. A second spring is a **force** |
| **11** | **expressibility limit** while row 2 holds | Then a sequencing question. **And the engine must be able to express all three forms, not pick one** |
| **12** | **mostly built**; the self-release is an **absent quantity that cannot be added within the rules** | The four stances, the fourth `STANCE_TABLE` row and `?deepen=on` exist. `kneeStrength` bounds a force, not a length, so it cannot raise the body; a clock, timer, fatigue or stamina is cancelled. **Two measured limits: it rose while still held in 0 of 19 runs, and the leg's own pace puts a 0.25 s press out of reach** |
| **13** | **expressible either way** today | Leg depth already moves in both directions, so neither timing is blocked. **What is missing is not a quantity but an answer: the footage does not say which way round it should be** |
| **14** | **not a code limit — a measurement one** | The game's rider **can** be measured in the footage's robust ruler (apparent stature in head-lengths) from a render at the footage's camera geometry. **Nothing is blocking it except that nobody has done it.** The code-side obstacle is only that the game's rungs use a different denominator (§4.3) |
| **15** | **expressibility limit** | One hand, on/off, side chosen by the game. A two-handed carriage needs row 4's positions |
| **16** | **absent quantity** for the posture; **not samplable** for the ride-through | The foam does reach the board (3.5e, five channels), so the physics side exists; the body side does not |
| **17** | **already correct** | Feet fixed by construction; the footage asks for exactly that |
| **18** | **absent quantity, and no target** | Nine clips give nothing to build against |
| **19** | **force-application / constraint-model change** | The hand-specific residual moment about the rider reference; world Y only survives. **Not energy-neutral** — the residual dotted with angular velocity is work — so **the owner must rule.** My own "lever correction, needs no ruling" was overturned by Codex within the hour |

### What the architecture cannot be asked for at all

Three things in the footage are **not reachable by any amount of work on the rows above**, and they should be named
so no round chases them:

1. **Anything that needs a clock.** A dip that releases itself after half a second is a clock. The owner cancelled
   clocks, timers, fatigue and stamina. Measured: `kneeStrength` cannot do it, and the dip rose while still held in
   **0 of 19 runs**. **So the dip releases when the owner releases the key, and that is what ships.**
2. **Anything that moves the body on the game's initiative.** The owner drew that line twice in one day — Ruling A
   (cap what the rider asks) and Ruling E (*"the dip should fire on my input only"*). **An automatic dip at turn
   entry, which all five of the first clips show, is on the wrong side of it.** Do not propose one again without
   asking.
3. **A kinematic prescription.** The old rider's `uprightVelocity` held its body plumb kinematically; its benchmark
   is **retired** and must never be measured against again. **Any force row below that only works by prescribing a
   pose and paying whatever force it takes is a cheat, and the round should stop and report instead of building it.**

---

## 4. Honesty requirements this document carries

### 4.1 ⚠️ The leg-chain metric is saturated, so every depth rung from clips 7, 8 and 9 is UNTESTED

The skill prescribes `leg % = |hip→ankle| ÷ (|hip→knee| + |knee→ankle|)` and warns it is an upper bound. **V9 §0.3
found it is not an upper bound — it is saturated**, and gave the mechanism:

> **A surfer's knees bend forward over the toes — perpendicular to the board's long axis. In shore-shot footage the
> board's long axis lies across the image. So the knee bend points at or away from the camera, the knee projects
> onto the hip–ankle line, the leg looks straight, and the ratio reads ~100 % no matter how deep the rider is.**

V9's leg chain read **96–100 % on every frame it could read, including a rider folded over his own board**, while
the vertical ruler read **30–66 %** on the same frames. The two disagree by about thirty points and **V9 refused to
reconcile them or name a rung for any frame.**

**Consequences, stated plainly:**

- **"No rider ever leaves the Tall band" is untested.** It rests on a leg chain measured in broadside footage —
  clips 7, 8 and 9.
- **Every depth rung drawn from clips 7, 8 and 9 is untested.** Rows **2, 6, 10 and 14** are marked ⚠️ **SAT** for
  exactly this reason, and nothing in them should be quoted as a depth without this paragraph.
- **The "no rider has ever been measured at the game's Crouch rung" puzzle has a candidate mechanical
  explanation** — and V9 is the first clip to **abstain** on it rather than vote no, because its two rulers bracket
  66 % from both sides.
- **This is not a reason to go back to the waistband scale**, which fails on a wetsuit and over-read the leg by
  50 % on V8's own frames.
- **The robust ruler is apparent stature in head-lengths**, which needs no hip landmark at all.
- **The fix is footage shot from the water or down the line, not from the beach**, because the projection is what
  hides the knee. **That is recorded in §6 as an ask of the owner.**

### 4.2 The three earliest reads' arithmetic is not inherited

`video-ref-2.md`, `video-ref-3.md` and `kirra-reference-50-196s.md` each compared a **video hip fraction** against
`STANCE_TABLE`'s **whole-body centre-of-mass height** as though it were a hip height. **Their conclusions survived;
their arithmetic did not.** **No metre figure from those three documents appears anywhere in this one.**

### 4.3 The frame of every number quoted here

This track has produced **twenty-five numbers in the wrong frame**. So:

| number | what it actually is |
|---|---|
| `riderPosture.ts:100`'s **0.78 m** | the **pelvis part's placed height above the deck**, standing — not a hip height to compare with footage |
| **0.88 m** | the game's **straight leg** |
| `STANCE_TABLE`'s **0.84 / 0.65 / 0.55** | the **whole body's centre of mass above the feet** — the inverted pendulum's length, a different quantity 0.06–0.07 m above the pelvis |
| `leg.rest`'s **0 / 0.195 / 0.30 / 0.45** | a **spring rest-length shortening**, not a depth of anything |
| `kneeStrength = 2·KNEE_TORQUE/d` | a **force**, N — the most the knees may push along the leg. **Not a depth limit** |
| **89 / 66 / 55 / 38 %** | the four rungs expressed as a fraction of the game's **own straight leg**, via `stance-frame.md` §3 |
| footage **hip %** | hip height as a fraction of **straight-legged standing hip height** (trochanter ≈ 0.53 × stature) — **a different denominator from the game's rungs** |
| footage **leg chain %** | the rider's **own straight leg in the same frame** — the one that converts to the game's units without a frame error, **and the one that is saturated** |
| footage **apparent stature** | head-top to deck in **head-lengths**, against a standing human's 7.7. **Needs no hip landmark** |
| **0.96 ± 0.04 s / 0.8 ± 0.03 s** | published **bottom turn** (n = 6, 835 turns) and **cutback** (n = 4, 2 060 cutbacks) durations, quoted in `stance-frame.md` §6 |
| **626 of 626**, **1.0–1.45 s** | falls over **29 arms, 9 placements, 2 faces, entries 1–10.4 m/s**; and a **median ride**, which is a **time to failure**. **Rejected as this document's metric** |
| **67 767 column-values, 0 differences** | the stick's inertness below 4 m/s, over **461 frames of 9 runs** on one face plus 371 frames of 9 runs on another |
| **45–56 %** | the **ankle's own correction as a share of the deck's roll** — and it **is** the roll by identity, not by correlation |

### 4.4 Single observations, marked

- Row 3's two-channel passage: **one rider, one clip, one passage.**
- Row 11's three down-transition forms: **each one SINGLE, on a different rider.** **That it is not one fixed thing
  IS the finding, and this document does not pick one.**
- Row 13's low-spent-by-the-turn: **one turn, and it is a bottom turn off a take-off.**
- Row 16's brace: **one frame, end not seen.**
- Row 12's held lows: **one rider, 3 turns, the third cut off by the clip's end.** Row 12's leg hold: **one rider,
  one passage.**
- Row 10's leg split: **one clip, two frames**, and V9 could not measure it at all.

### 4.5 Where the clips disagree, said rather than averaged

| question | one answer | the other | this document's position |
|---|---|---|---|
| How much surfing is in a clip? | **V7: 0 direction changes in 13 s** | **V9: ≥13 in 30 s, one every ~2.3 s** | **Both are true of their clip.** The engine must cover the range (row 8) |
| Is a deep low held or a dip? | **Held — V5: 1.75 / 2 / ≥2.9 s, 3 of 3 turns, one rider; V2's long carve; V1's tube at 15+ slowed s** | **A dip — V3: 2 of 2 at 0.25–0.5 s, never held past 1 s; V4: 8 dips, none past 2 samples; V1's own turns.** V9: one ~0.6 s hold. **V6, V7, V8 abstain** | **The owner ruled: both patterns are real** (Ruling C). The dip is an addition. **And V1 is on both sides of its own question** — a held tube and dipping turns in one clip |
| Where is the resting stance? | **V7 and V8: 90–100 %, above the game's Tall** | **V9: 63–81 % of standing height, below it** | **Different rulers and different denominators. Not averaged. Row 14 is `unknown`** |
| Which channel leads down? | **V7: knees + trunk together** | **V8: trunk only. V9: legs only** | **Three forms, three clips, unsettled** (row 11) |
| Where in a turn is the low? | **8 of 9 readable turns: at entry** | **V6: before the turn, spent by it** | One observation against eight, and the eight include slowed and unverified footage. Row 13 is `unknown` |
| Arms at the loaded part of a turn | **V1, V2: spread wide and level** | **V3: both low and drawn in. V5, V6: lead hand down + rear arm up. V4: low when crouched, wide when upright** | **No rule. Which is exactly why row 4 asks for carriage as a channel, not a pose** |

### 4.6 One count in Ruling F that this synthesis cannot reproduce

Ruling F's target table records the arm lead as **"frame-level on three clips, 2 of 2 and 3 of 4 resolved turns."**
**I can find only two.** The "2 of 2" is V9 and the "3 of 4" is V8 — **two clips, three riders, two breaks** — and
no third clip times an arm against the rail at all.

**The distinction worth keeping is between two different findings that are easy to merge by accident:**

- **The arm *pairing*** — a lead hand low with the rear arm up and back — **is on three clips** (V5, 3 of 3 turns;
  V6, 2 frames with a which-arm caveat; V7, carriages A and D). **None of those three times it against the board.**
- **The arm *lead*, timed against the rail biting, is on two clips** (V8 at 0.1–0.2 s resolution, V9 at 1/30 s).

So the lead's reproduction is **two clips, not three** — still the second-best reproduced figure in the series
after the pump period, and still worth the target. **The handoff's table should be corrected rather than quoted.**

### 4.7 Nothing is promised for the rows the falling blocks

Rows **7, 8 and 16** are marked **blocked by survival**, and **no date and no certainty is offered for any of
them.** Twenty-five rounds have narrowed the falling to the ankle's correction being its own disturbance —
*"a loop whose correction is its own disturbance is not fixed by changing its gain"* — and that is as close as the
project is.

**What the owner's new instruction changes:** being blocked by survival is **no longer a success criterion in its
own right.** It is an obstacle to measuring rows 7, 8 and 16, and nothing more. **No row in this document succeeds
because the rider stopped falling.**

---

## 5. The owner's standing rulings, which this document respects

1. **Keep all four stances — Tall, Crouch, Compress, Snap. Compress stays HELD** (Ruling C). Their fifth clip
   showed held lows, so **the dip is an addition, not a replacement. Nothing is taken away.**
2. **The dip fires on their input only** (Ruling E). An automatic dip is the game moving their body for them.
3. **Keep the row** (Ruling D) — the measured fourth `STANCE_TABLE` rung ships by **default**, not behind a switch.
4. **Infinite stamina. No fatigue, no clock, no timer** — *"lets stop the work of legs that tire, lets leave it as
   infite stamina."* The earlier *"yes add the cost, legs that tire"* was **reversed within the hour** and must not
   be re-proposed.
5. **Crouch is the one rung no clip has sustained** — five clips of five, and V9 abstains. **Its value waits on
   their `?kneeRoom=achieved` ride.**
6. **No hidden motors**: motion only from visible limbs, every force paired with its reaction, and **a kinematic
   prescription realised by whatever force it takes is a cheat.** This bounds rows **9 and 10**, the only two marked
   **force**.
7. **Ship small, ship often. The owner rides and judges.** Rows 1 and 2 are each one change and need no ruling,
   which is why they are first.
8. **Ruling F: survival rate and ride time are rejected as the metric**, replaced by the footage's reproducible
   numbers. **An agent may measure whether the movement matches those numbers; it cannot tell anyone whether the
   game feels good** — the owner still judges feel. **The agent controls only what a player controls**, and every
   metric must be cheat-resistant (§2.2). This reverses their older *"never a bot ride as evidence"* rule only in
   its measuring half; **the feel half stands.**

---

## 6. Asks of the owner

1. **Footage shot from the water, or down the line — not from the beach.** This is the cheapest thing that would
   unblock the most. The leg chain is saturated **because** the board lies across the image (§4.1); a clip filmed
   from in the water or along the line of travel would make the knee visible and would settle, in one read: whether
   any rider leaves the Tall band, whether the game's Crouch rung has a counterpart, and whether the two legs
   really sit 10–12 points apart.
2. **Is a visual reference agent worth building before the body rows land?** Row 14's metric — the game's rider
   measured in apparent stature in head-lengths, from the footage's own camera geometry — **needs a render and a
   ruler, not a ride**, and it would give the first game-side number in this entire document.
3. **Row 13 is a feel question only they can answer:** should a turn be entered by compressing into it, or driven
   by extending out of an inherited crouch? Eight readable turns say the first; one says the second; the ski and
   skateboard literature says the second.
4. **Row 18: do they want head and gaze at all?** Nine clips could not read a face, so there is no evidence either
   way and no reason to spend a round guessing.

---

## 7. The tenth read's place, left open

**A tenth video read was in flight when this was written and will land after it.** It is deliberately not guessed
at. When it lands, it should be slotted here, and these are the places where it could change this document:

| if the tenth read shows… | it changes |
|---|---|
| footage from the water or down the line | **§4.1 and row 14** — the one thing that could settle depth |
| a readable **knee** in a loaded turn | **rows 2, 6, 10, 14** — all four ⚠️ **SAT** marks |
| a low **held** beyond a second, or a clean spike, with a visible knee | **row 12's split**, which Ruling C currently holds open on purpose |
| a fourth form of the down-transition, or a repeat of one of the three | **row 11** — a repeat would be the first reproduction of any single form |
| the arm lead **absent** in a resolvable direction change | **row 5** — it is 5 of 6 resolved changes across two clips, and a miss would matter |
| a **readable face** | **row 18**, which has no target at all today |
| a rider **stepping** on the board | **row 17**, the one row the game already matches |

**Nothing in this document should be read as complete at nine clips.** Twelve of the last fourteen rounds refuted a
premise of their own brief.

---

## 8. A note on this document's own spine, as the brief required

The brief offered the **four-channel framing** — leg depth, trunk fold, arm carriage, arm timing, plus the fore-aft
hip axis — as the spine. **It is the right inventory and the wrong ordering principle, and this document uses it
only as the inventory.**

Two reasons. First, `3.5/body-channels.md` already showed the four channels are **three disconnections and one
genuine absence**, and those cost completely different things — so a table with one row per channel would put a
free wiring fix and an owner-ruled force change side by side as though they were comparable. Second, the brief
asked for rows ordered by **what unblocks the most**, and the channels are not independent in cost: rows 3, 6, 9
and 11 are all downstream of rows 1 and 2, and row 5's visible half is downstream of row 4. **So the spine here is
one row per thing the footage shows, ordered by dependency, with the channel it belongs to visible in its "why it
cannot do it" cell.**

The one place the four-channel framing is actively misleading is the arms, and it is worth saying: **"arm carriage"
and "arm timing" are not two channels — they are one channel and its clock.** Without a position there is nothing
to time, which is why row 5's sequencing change buys nothing visible until row 4 exists.

---

## 9. What this round did not do

- **No file under `src/` or `server/` was touched.** This is a synthesis, not a change.
- **Nothing was built, ridden or measured.** Every game figure is a code reading quoted from
  `3.5/body-channels.md`, `3.5/stance-frame.md` or the 2026-11-16 handoff.
- **No constant is proposed anywhere**, and no row is given a value.
- **The nine video documents were not edited.**
- **No conclusion is drawn about the wave, the lip, the foam or the spray**, which the owner has asked four times.
- **No agent and no eval harness was scoped or built.** §2 is the list of quantities such a harness would score;
  the harness itself is a separate round.
