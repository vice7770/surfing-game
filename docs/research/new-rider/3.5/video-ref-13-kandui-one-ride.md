# Video reference 13 (Kandui, Mentawais): one unbroken ride with two gaps in it, a compress–extend–compress that a coarse sheet hid, and a trunk-angle gate that turns out to retire the series' trunk spans

Source: **https://www.youtube.com/shorts/9k-MU6Q5Lhc**, title *"10FT KANDUI! 😱 MASSIVE BARRELS & INSANE WAVES — 2026 #subcribe"* (`@kantorpulau8356`). Length **17.741 s**, read in full. The **thirteenth** reference the owner has sent.

Delivered to the browser pane at **1440×2560** (`hd1440`), pinned before every measurement frame. Stream is **30 fps** (§1.3), `playbackRate` 1. `yt-dlp`, `ffmpeg` and `youtube-dl` are all absent from this machine (checked, as the skill asks), so nothing was downloaded; every frame is a screenshot of the browser pane, **tab `tab-1`**, claimed with `tabs_create` and passed explicitly on every call.

**Every figure below is an estimate from pixels**, and each carries its own error bar.

---

## ⚠️ 0.0 — This document is a CORRECTED version, and what it got wrong is the most instructive thing in it

The first version of this read was made blind, alongside an independent read of the same clip at **2160×3840**. It published **"one posture held 8.75 s continuously visible, unchanged through a climb, a drop, 1.7 s of trim and a bottom turn."** **That is false, and I refuted it myself on my own footage once I was told where to look.**

Three separate errors, all with the same root:

1. **The early ride was surveyed at 0.5 s and pronounced on.** At 0.5 s steps the frames at 2.50, 3.00 and 3.50 happen to look alike. **At 0.1 s there is an unmistakable compress → extend → compress episode at 2.4–3.8 s** (§0.5), with the body at its most extended at **3.10–3.20** and a hand above the head. The skill's own warning — *"do not pronounce on cuts from a coarse sheet"* — applies to **postures** exactly as it applies to cuts, and nothing in the skill said so.
2. **Three of the twelve tiles in that survey were not the rider at all.** The blob finder locked onto foreground paddlers at 1.50, 2.00 and 4.50. I noticed the tiles looked odd and did not act on it. **A "continuously visible" claim built on a strip in which a quarter of the tiles are somebody else is not a claim at all.**
3. **"Continuously visible" was never checked.** It is false: **at t = 4.680 the rider is a barely-separable shape under the lip, at t = 8.990 he is not in the frame at all, and at t = 11.320 only his legs and board are out of the whitewater.** All three verified here on full frames (§0.7).

**And the correction cuts both ways.** The same re-sampling that destroyed the hold **also destroyed my row-5 headline in the opposite direction**: the clip *does* contain an arm lead, at **+0.18 s ± 0.05**, in the very passage the coarse sheet skipped (§0.6). My "0 of 3" becomes **1 of 4**.

> **The method lesson, which belongs in the skill: a posture claim needs the same sampling density as a timing claim, and a visibility claim needs full frames, not rider-centred crops — a crop centred on a finder will happily render a confident-looking tile of water.** Both are now in `.claude/skills/surf-video-read/SKILL.md`.

Everything below is the corrected read. Where a figure changed, the old one is named so no one quotes it from the PR history.

---

## 1. The answer first

### 1.1 — What this rider's movement actually is

**He rides a fast hollow slab in a quiet, supported trim, makes one clear compress–extend–compress while setting his line early, spends a third of the ride invisible behind the wave, and releases once at the end.** That is the clip's one sentence, and it is a much smaller claim than the one it replaces.

| window | status | what the body does |
|---|---|---|
| **0.00–2.20** | readable, rider small | riding high on the face; crouch depth and arm height both vary. **18 samples at 0.125 s.** No single posture is held across it |
| **2.20–3.80** | readable | **one clear compress → extend → compress** (§0.5). Deepest at 2.6–3.0, most extended at **3.10–3.20**, bending again from 3.33. **The board's heading changes through the second half** |
| **3.80–4.55** | readable, small | driving on the face, crouched |
| **4.55–4.98** | ⚠️ **largely obscured** | under the lip and behind spray. **t = 4.680 verified: body not readable** |
| **4.98–8.75** | readable | quiet trim with small adjustments; a climb to the lip at 6.2–6.5 and a drop at 6.5–6.8 with **no change in the body across 19 native frames**; a carriage change at 7.10–7.90 with no posture change |
| **8.88–10.00** | ☠️ **not visible** | behind the curtain. **t = 8.990 verified: no rider in the frame** |
| **10.14–11.20** | readable | emerging, crouched |
| **~11.32** | ⚠️ **legs only** | upper body behind the whitewater. Verified |
| **11.70–13.85** | readable | the quiet trim again, including the bottom turn at 11.90–12.20 — **18 native frames, body unchanged** |
| **13.85–14.20** | readable | **the release: trunk to vertical and legs extended in 0.35 s** |
| **14.20–16.10** | readable | upright, 1.9 s. Hands to the head 14.35–15.55, then low and forward |
| **16.10–16.50** | readable | leaves the board in a deliberate head-first dive, arms extended forward |

**So the honest shape is: a quiet trim with two episodes in it and two holes through it.** The longest stretch in which I can show the body is unchanged is **6.20–6.80, 0.60 s, 19 native frames**, and the longest readable stretch of *any* kind is **4.98–8.75, 3.77 s**. **Neither is a measured hold of a depth** (§3.1).

**What the previous version claimed, and what replaces it:**

| old | new |
|---|---|
| *"one posture held 8.75 s continuously visible"* | **no continuous hold is verifiable.** Two blackouts and one legs-only frame sit inside the span, and a compress–extend–compress sits at 2.4–3.8 s |
| *"two postures and one transition in sixteen seconds"* | **at least two episodes and one release**, plus adjustments too small to name at 0.1 s |
| *"~3 direction changes in 16.1 s"* | **4 direction changes** — the board's heading change at 3.3–3.7 was missed |

### 1.2 — The brief's first question, answered before anything was spent

> *"Measure the rider's height in source pixels and say it."*

| | |
|---|---|
| **Head length** (hair-top to chin, measured, 6 frames) | **73–102 source px**, rising through the ride as the camera zooms in |
| **Actual head-to-foot extent in frame** | **355–620 px** |
| **Standing-equivalent stature** (7.7 × head) | **560–790 px** |
| **Camera** | **side-on, from the channel, near water level**; rider 1.3–2× bigger than clip 11's, about clip 12's |

**This clip delivers most of `engine-target.md` §6 ask 1** — water-level, side-on, bare legs, knee visible as a joint, no boardshorts over the knee — and §2.1 records what happened when the rulers were applied to it anyway.

---

## 2. The two findings that change other documents

### 2.1 — ⭐ THE TRUNK ANGLE HAS AN ADMISSIBILITY PROBLEM, and its second half retires the series' trunk spans

**Part one: the per-frame gate.** Clip 12 gave the series a test for the **leg** chain — projected thigh/shin, anatomy ≈1.0–1.1. **The same test exists for the trunk and nobody has run it.**

Measure the **projected shoulder-to-waistband distance ÷ head length in the same frame.** Standard proportions put the acromion at ≈0.82 of stature and a boardshorts waistband at ≈0.60, so an in-plane trunk projects **≈1.6–1.8 head-lengths**. Much shorter means the trunk points at or away from the camera and the in-plane fold angle **under-reads**.

| t | trunk from vertical (hand-measured, shoulder→waistband) | trunk ÷ head | admissible? | head px |
|---|---|---|---|---|
| **11.900** | **REFUSED** | **0.39** | **no** — foreshortened 4× | 75 ± 8 |
| **12.300** | **≥ 41° ± 10** | **1.03** | **no** | 77 ± 8 |
| **13.700** | **≥ 32° ± 10** | **1.34** | marginal | 73 ± 8 |
| **13.900** | **≥ 24° ± 10** | **1.18** | **no** | 85 ± 8 |
| **14.200** | **2° ± 8** | **1.63** | **yes** | 95 ± 10 |
| **15.000** | **5° ± 8** | **1.59** | **yes** | 102 ± 10 |

**Six attempts, two clean, one marginal, three refused — and both clean readings are frames where the trunk is visibly vertical. No visibly-folded frame passed.** The cause is V9's own geometry in a different joint: a surfer's hip fold carries his chest toward his **toes**, perpendicular to the board's long axis, which in a side-on shot points **at the lens**.

**Part two, and it is the half I got wrong.** The first version of this document consoled itself that *"foreshortening only shrinks an angle, so V8's 59°, V9's 65°, V11's 60° and V12's 80° are all safe as lower bounds."*

> **⚠️ That is true only for a single angle from vertical, under a level camera, at fixed yaw. It is NOT true for the difference of two projected angles when the yaw changes between them — and a *span* is exactly such a difference.**
>
> **A fixed lean, swivelled from facing the lens to side-on, changes its apparent angle from near 0° to its true value with zero anatomical flexion.** The reverse swivel manufactures the opposite. Video 12's two frames are **2.4 s apart inside a turn**, so the yaw certainly changed between them; the same objection applies to every multi-frame span in the series, including this clip's own ≥39°.

**The consequence, stated so it can be quoted:**

> **After thirteen clips there is no gated measurement of trunk angular travel anywhere in the series, and the published spans are not even lower bounds wherever yaw moved between the two frames.** The gate in part one is a **per-frame** test and must stay one; a span needs **both** frames admissible **and** the yaw unchanged between them, and **no pair in thirteen clips has been shown to meet that.**

**This does not weaken `engine-target` rows 1 and 2, and the reason is structural, not photographic.** `HumanoidRig.ts:1383–1385` interpolates the drawn trunk from drawn leg depth, so **folding at a fixed leg depth is impossible at any value of any constant** — that argument stands on code and needs no camera. What the paragraph above removes is the *number* in row 2's target column, not the row.

**Rates, with the same qualification.** The one un-fold I can time runs **≥41° → 2° between 13.70 and 14.20**, i.e. **≥78 °/s**, and **≥24° → 2° in 0.30 s ≈ 73 °/s**. Both are **lower bounds on a projected angle whose yaw I did not hold fixed**, so they bound nothing anatomically. They are reported because V12's measured 120 °/s and 20 °/s carry the same unexamined assumption and should now be read the same way. **The engine-side point survives untouched: the drawn trunk has exactly one rate because it has exactly one input.**

### 2.2 — ☠️ A STALE-FRAME TRAP THAT DEFEATS BOTH OF THE SKILL'S DEFENCES

The skill's defences are a timestamp stamped into the canvas and a doubled screenshot. **Both passed while the read was being poisoned.**

With the **browser pane hidden**, the page's video decode froze. `document.hidden` reported `false`, `visibilityState` `"visible"`, `readyState` 4, `buffered` covered the whole clip, every seek resolved and `video.currentTime` returned **exactly** the value asked for. `drawImage(video, …)` returned the **same frame every time**. A 0.1 s whole-clip trace came back with two tidy 1.4-second runs of pixel-identical frames at 9.4–10.7 and 16.4–17.7 — which reads exactly like **two editorial freeze-frames**, and would have been published as one.

**Nothing in the image says it is wrong. The stamp is right. The second screenshot matches the first.** The only thing that caught it was an **out-of-order probe**: seek 10.7, 9.4, 10.0, 9.3, 10.7, 9.4, 16.8, 17.4, 16.3 and difference every pair. All **45 pairs returned 0**, including frames 7 s apart. A real freeze-frame cannot do that.

Two causes, both new to this series:

1. **The pane was hidden.** `tabs_context` says so in one line and I had not read it. Showing the pane half-fixed it; a **page reload** fixed it completely.
2. **A YouTube Short carries TWO `<video>` elements after a reload, and `document.querySelector('video')` returns the empty one** (`videoWidth` 0, `duration` null). The right one is `[...document.querySelectorAll('video')].find(v => v.videoWidth > 0)`.

> **Rule, now in the skill: never trust a run of zero frame-differences. Probe out of order and difference every pair. The stamp proves the clock, not the pixels.**

Every number in this document was taken after the reload, with the pane shown, on the element with `videoWidth > 0`, and the probe was re-run after every quality change.

---

## 3. The body channels

### 3.1 — Leg depth: **no rung named**, for the fifth clip running

**(a) The leg chain, with clip 12's admissibility gate.** Measured at **t = 14.000**, the best frame in the clip for it: side-on, near-level lens, both bare legs separated, both knees unmistakable, rendered at **1.36×** with every landmark drawn back onto the image and checked.

| leg | hip→knee ÷ knee→ankle (anatomy ≈ 1.0–1.1) | leg chain | admissible? |
|---|---|---|---|
| **front** | **1.10** | **100.0 %** ⚠️ **SAT** | **yes** — and he is visibly straight on that leg |
| **rear** | **2.66** | 94.1 % | **no** — shin foreshortened 2.4× |

**One admissible leg in the clip's best frame, and it reads 100 % on a leg anyone can see is straight.** A second frame (t = 13.400) was attempted and refused: both thighs foreshortened.

> **Fifth refusal in five clips — and here the cause is V9's original one, projection, on the very footage geometry §6 asked for.** The lens that would work sits ~45° off the board's axis and level with the deck; thirteen clips have not produced one.

⚠️ **The hip used above was inferred, not seen** — placed 0.54 head-lengths below the measured waistband line. **A hip error of ±25 px moves the front leg's thigh/shin ratio by ±0.15, enough to push it out of the admissible band**, so even the clean reading is one landmark from refusal.

**(b) Row 10, the split: NOT MEASURED, and I will not estimate it.** The one frame with both knees unmistakable has one admissible leg and one inadmissible one. The arithmetic difference is 5.9 points; **it is not reportable**, because 94.1 % is a number about the camera. **Row 10 stays at V8's one clip, two frames.**

**(c) ⚠️ Hip-above-deck ÷ head length has a confound this clip exposes.**

| t | head | hip above deck | ratio | what the frame looks like |
|---|---|---|---|---|
| **12.300** | 77 ± 8 | 238 ± 25 | **3.09 ± 0.40** | deep fold, knees bent, feet close together |
| **13.700** | 73 ± 8 | 207 ± 25 | **2.84 ± 0.40** | deep fold, knees bent |
| **13.900** | 85 ± 8 | 238 ± 25 | **2.80 ± 0.35** | **knees visibly straighter than 13.700 — and the ratio went DOWN** |
| **14.200** | 95 ± 10 | 300 ± 25 | **3.16 ± 0.35** | upright, legs extended |
| **15.000** | 102 ± 10 | 278 ± 30 | **2.73 ± 0.45** | upright, legs extended, **feet very wide apart**, board not visible |

**13.700 → 13.900 is the problem:** the knees straighten and the ratio falls. **15.000 is the same problem larger.** The cause in both is visible — **the feet move apart, and a wide stance lowers the hip with no change in knee flexion.**

> **So hip-above-deck ÷ head is a leg-depth ruler only while the stance width is unchanged.** It survives V12's lens problem and dies on this one. **Nothing in §3.1c may be read as a depth rung.**

**(d) Qualitatively** the knees are flexed for most of the ride, extended at 3.10–3.20 and again from 14.0 to 16.1. Deepest-looking: 11.90, 12.30, and 2.60–3.00. Straightest: 15.00. **No rung is named for any of them.**

### 3.2 — Trunk fold

§2.1 is the result. What survives both halves of the gate: **two admissible per-frame readings, 2° ± 8 at t = 14.200 and 5° ± 8 at t = 15.000, and no admissible span at all.**

### 3.3 — Arm carriage: five carriages, counted at 0.1 s or finer, and it still does not track depth

**The previous version's counts came partly from 0.5 s strips and were wrong** — carriage A was credited with "0.00–7.00", a window that contains an arm above the head at 3.10. **Only windows I sampled at ≤0.125 s are counted below**, and the sampling interval is given for each.

| carriage | verified windows (sampling interval) | count |
|---|---|---|
| **A — both hands low and forward over the deck**, inside the rails | 2.80–3.00 (0.033 s), 4.98–7.00 (0.1 s), 7.90–8.75 (0.1 s), 10.14–11.20 (0.18 s), 12.20–13.70 (0.0333/0.1 s), 15.55–16.10 (0.05 s) | **6 windows, the clip's most common — roughly 7 s of readable riding** |
| **B — lead arm reaching forward-down past the rail, rear arm back and low** | 6.30–6.50 (0.0333 s), 7.10–7.90 (0.1 s, held 0.8 s), 12.00–12.20 (0.0333 s) | 3 |
| **C — both arms low and spread, roughly level** | 3.40–3.80 (0.0333 s), 12.20–12.60 (0.1 s), 14.20–14.35 (0.1 s), 15.60–15.90 (0.05 s) | 4 |
| **D — both hands at the head** | 14.35–15.55 (0.05 s), held **≈1.2 s** | 1 |
| **E — both arms projecting forward, the rear hand ABOVE the head** ⭐ **new, and the one the 0.5 s strip hid** | **3.100–3.300 (0.0333 s), held ≈0.20 s** | 1 |

**Carriage A occurs at the clip's deepest fold (12.300) and at its most upright, straightest-legged moment (15.700).** Sixth clip to refute both *"tall ⇒ spread"* and *"deep ⇒ spread"*.

**Distinct carriages reachable at one leg state: 3** (A, C and D all occur between 14.20 and 16.10, legs extended and trunk vertical throughout). At the folded leg state: **3** (A, B and C).

**Carriage A reproduces `engine-target` row 15 on a sixth clip** (V7 4 windows, V8 5, V9 6, V11 4, V12 ≥8, here **6 verified at ≤0.18 s**). The hands are over the **deck**, usually both at once — not the single hand in the water of a tube ride, and not a hand drag: through the barrel section at 10.14–11.20 both hands stay over the deck.

### 3.4 — Arm timing: **the lead is present once and absent three times, and where it is absent is the finding**

**The previous version published "0 of 3" and that is wrong.** It was wrong because the 0.5 s survey skipped the only passage that has one.

| direction change | resolution | overhead arm before the rail? |
|---|---|---|
| **bottom turn / line set, 3.10–3.40** | **1/30 s**, 15 frames at ≥0.877× | ⭐ **YES.** **Rear hand above the crown first seen at 3.100** (not at 3.067, where it is at head height — so **3.100 ± 0.033**). **The board is still flat at 3.200, 3.233 and 3.266 and is banked by 3.300**, so the rail bites at **3.283 ± 0.017**. **Lead = +0.18 s ± 0.05**, and the arm is **held up ≥0.20 s** (3.100 through 3.300), coming down by 3.400 |
| climb to the lip, 6.30–6.50 | **1/30 s**, 18 frames | **NO** — both hands low and forward throughout |
| drop off the top, 6.50–6.80 | **1/30 s** | **NO** — same carriage |
| bottom turn / climb, 11.90–12.20 | **1/30 s**, 18 frames | **NO** — rear arm goes **back and low**, never above the shoulder |

**1 of 4.** Running tally across the series: was *10 of 11 resolved turns across four clips*; with this clip it is **11 of 15 across five clips**, and the lead's measured value here (**+0.18 s**) sits inside the existing band (V8 0.1–0.2 s, V9 0.07–0.30 s, V12 0.04–0.12 s).

> **The shape of the miss is the contribution, not the count.** The one turn **with** the lead is the one on the open face, where he is setting his line. **The three without it are all inside the fast hollow slab section**, where the substitute appears instead: **lead arm forward-down past the rail, rear arm back and low** — V9's cutback form and V12's 27.1 form, now on a third clip. **So the engine must be able to lead and must be able not to**, and the thing that selects between them looks like the manoeuvre, not the depth.

**And the clip's one *other* overhead event has no turn attached at all.** Both hands come to the head at **14.35** and stay to **15.55** — **1.2 s** — which is **0.4 s after** the board has straightened. A relief gesture, not a load.

### 3.5 — Opposite-direction channels: six resolved windows, none opposite-sign

| window | length | samples | leg depth | trunk fold | verdict |
|---|---|---|---|---|---|
| **2.400 → 3.800** ⭐ new | **1.40 s** | 15 at 0.0333–0.1 s | **compresses, extends, compresses** | folds, un-folds, folds | **same sign throughout** |
| 6.200 → 6.800 | 0.60 s | 19 native frames | knees bent, held | held folded | **frozen** |
| 7.000 → 8.700 | 1.70 s | 18 at 0.1 s | knees bent, held | held folded | **frozen** |
| 11.700 → 12.266 | 0.57 s | 18 native frames | knees bent, held | held folded | **frozen** |
| 13.700 → 13.900 | 0.20 s | 3 | knees straighten (visible) | un-folds ≥32° → ≥24° | **same sign (up)** |
| 13.900 → 14.200 | 0.30 s | 4 | hip÷head 2.80 → 3.16 | un-folds ≥24° → 2° | **same sign (up)** |

> **Every resolved transition is same-sign or frozen. None is opposite-sign** — including the compress–extend–compress the first version missed, which is the one place an opposite sign could plausibly have hidden.
> **V9's opposite-sign passage is therefore SINGLE and now THREE-TIMES-not-reproduced** — clip 11 looked at seven transitions, clip 12 at six, this clip at six: **nineteen transitions across three clips and three riders with no instance.** It stays the right **acceptance test** for rows 1–2 — an engine that cannot do it cannot do the thing V9 filmed — and it is **not** a frequency claim.

**And the frozen half keeps growing.** One-channel-frozen or whole-body-frozen is now on **five clips**: V10's 0.44 s, V11's 0.36 s, V12's 0.25 s and 0.88 s, and here **1.70 s at 18 samples** — though §0.0's lesson applies to this too, and **the frozen windows above are frozen *at the sampling interval given*, not provably frozen.**

### 3.6 — Pump: 0 half-cycles in 1.70 s of trim

**7.000 → 8.700, 18 samples at 0.1 s, no direction change: no fold/unfold cycle.** A 0.55–0.60 s half-cycle cannot hide at that interval; an excursion shorter than ~0.2 s could. **Second clip with no cycle present to measure** (V12 had 1.75 s, also zero). The 0.55–0.60 s figure stands on **2 clips, 1 weak dissent, 3 clips of "no cycle."**

**The 2.4–3.8 episode is not a pump** and is not counted as one: the board's heading changes through its second half, which is exactly what row 6 excludes.

---

## 4. The fore-aft hip axis, the feet, and the face

### 4.1 Hips aft, shoulders forward — 6 frames, and the forward head reproduced

On every frame where both landmarks could be placed — **12.300, 13.400, 13.700, 13.900, 14.000, 14.200** — the **shoulders sit forward of the hips toward the nose** and the **hip sits at or just behind the rear foot**. **6 frames**, reproducing V1, V7, V8, V9, V10, V11 and V12. **Direction and sign only; no magnitude**, as in every previous clip.

**V12's new finding reproduces.** The **head and neck are thrust forward of the shoulders** in every folded frame: at **t = 12.300** the head centre sits about **70 px forward of the shoulder line** on a trunk measuring only 79 px projected — **the head's forward offset is comparable to the whole projected trunk.** Second clip. It also feeds §2.1: part of the fold the eye reads is in the **neck**, which no ruler in this series measures.

**A caveat to keep:** between **13.700 and 14.200** the rider rotates from facing down the line to facing the camera, shoulders square. **I could not separate trunk yaw from board yaw**, because the board leaves the readable region in exactly those frames. **No upper-body-yaw figure is reported** — and §2.1 part two is why that matters more than it looks.

### 4.2 Feet: 0 steps

In the windows where both feet and the deck were legible — **11.700–12.300** and **13.300–14.000**, about **1.3 s** — neither foot changes its place on the deck, judged against the board's rail logos and stringer. **Weaker than V7's 13 s count**, recorded as **"none seen"**, not as a measurement. Front foot at roughly **45–50 % of board length from the nose**, consistent with V7's 44–49 %.

### 4.3 Head and gaze — a second clip for row 18

**The face is resolvable in at least six frames**, 77–102 px: at **14.200** eyebrow, eye, nose, open mouth and chin are separate features.

- While riding folded, **the head faces along the board's direction of travel, down the line**, with the **gaze below horizontal** — at the water ahead of the nose, not the lip above. Readable at 12.300 and 13.400.
- At **13.700** the head is pitched **down**, face toward the deck, as spray lands on him.
- From **14.200** the head faces the camera, square with the shoulders — **but see §4.1: the board's heading is not measurable there, so no head-yaw-against-board figure is reported.**
- The head **leads the fore-aft chain** (§4.1).

> **Row 18 has two clips of qualitative observation and still no measurement.** The next footage ask is a frame where **both the face and the board's nose are legible** — which neither clip has delivered.

---

## 5. The source, and what the numbers are worth

### 5.1 Delivery, and ⚠️ what happened when I tried 2160p

`#movie_player` does not exist on a Short; the player is `#shorts-player`. `getAvailableQualityLevels()` returns `["hd2160","hd1440","hd1080","hd720","large","medium","small","auto"]`. **`hd1440` was pinned with `setPlaybackQualityRange` and confirmed with `getPlaybackQuality()` before every measurement frame**; `videoWidth/videoHeight` = **1440×2560**. **No consent gate appeared.**

**The independent read of this clip worked at 2160×3840. I could not.** `setPlaybackQualityRange('hd2160','hd2160')` does deliver **2160×3840**, and the first drawn frame is real — **and then the decode freezes.** The out-of-order probe (§2.2) over five seeks returned the first frame distinct and **every subsequent pair identical**, which is the skill's own warning about 2160p (*"the pane dropped to ~1 fps and produced real stale frames"*) arriving as a hard stop rather than a slowdown. **All measurement stayed at `hd1440`, and dropping back was verified with the same probe before continuing.**

**That is a real asymmetry between the two reads and it should be recorded as one:** my binding cap was the **594 px overlay canvas** (§5.2), so the other read had roughly 3.6× the final resolution on the same frames. **Where the two reads disagree about something gross — is the rider in the frame, is the hand above the crown — resolution is not the arbiter and I verified those myself. Where they might disagree about a fine angle, the higher-resolution read should win.**

### 5.2 Pane geometry — clip 12's result reproduced exactly, and one correction

At a **1280×1000** viewport the screenshot came back **800×625**, canvas→screenshot scale **0.625**. **At 800×640 the screenshot is 800×640 and the scale is exactly 1.0.** Clip 12's measurement reproduced to the digit in a different session, so it is now a fact: **get the stream at a large viewport, then shrink the viewport to take the frames.**

**The correction:** the binding limit on magnification is **not the viewport**. The overlay canvas is **790×594**, so **570 px of usable height**, and a rider 700 px tall caps at **0.814×** in any arrangement — one panel or three, it makes no difference. **Multi-panel comparison frames therefore cost nothing in scale**, and every paired frame here was taken that way.

`computer zoom` was used once and discarded: *"cropped from a screenshot, not magnified"*, exactly as the skill records.

### 5.3 The frame grid: 30 fps, measured

Seeking on a **0.005 s** grid from 8.000 to 8.205 and hashing the decoded frame, the picture changes at **8.035, 8.070, 8.100, 8.135, 8.170, 8.205**. The first 0.005-grid sample at or after each multiple of **1/30 = 0.03333** predicts 8.035, 8.070, 8.100, 8.135, 8.170, 8.200: **five of six exact, the sixth one grid step late** — 29.97 drift. **25 fps predicts 8.040/8.080/8.120/8.160 and does not fit; 24 fps predicts 8.045/8.085/8.125/8.170 and does not fit.**

**30 fps, 29.97 not excluded.** Native frame = 0.0333 s, which is the resolution behind every timing in §3.4.

### 5.4 Slow motion: **not excluded as rigorously as clip 12**

Clip 12 excluded it on three independent grounds; **I have two, neither a measured gravity.**

1. **Durations.** The release runs **13.85 → 14.20 = 0.35 s**; the dive runs **16.10 → 16.45 = 0.35 s** from upright to fully extended. At 2× slow both would be 0.18 s, which no body does.
2. **Motion blur.** Spray sheets and the hands at 13.700 are **visibly blurred**, consistent with ~1/60 s at 30p.

**What I could not do:** the board is never in free flight and the only airborne moment enters water immediately, so **no ballistic check was possible**, and the board never passes through vertical, so clip 12's rotation-rate argument is unavailable. **Verdict: at or near real time, on duration and blur only.**

### 5.5 It is ONE SHOT — no cut anywhere in 17.741 s

A whole-clip trace at **0.1 s** (178 samples, 24×42 luminance grid plus mean colour) gives frame-to-frame differences spanning **6.87 to 15.06**, median ≈ **9.7**. The largest, 15.06 at t = 14.4, is **1.55× the median** and **1.2× its own local neighbours** — against the **3–7× above local level** that each of clip 12's seven confirmed cuts produced. **No nominee exists to re-probe.**

Independently, seven windows were sampled densely and every one is continuous motion of the same rider, board, wave and lens drift: **0.000–2.125** at 0.125 s, **2.200–3.800** at 0.1 s, **3.000–3.567** and **6.200–6.766** and **11.700–12.266** at the native 1/30 s, **7.000–8.700** and **11.800–12.900** at 0.1 s, **8.700–11.760** at 0.18 s, **15.600–16.450** at 0.05 s.

| span | length | what it is |
|---|---|---|
| **0.000–17.741** | **17.741 s** | **one continuous shot**: side-on from the channel at near water level, a barrelling wave, the rider already up and riding in frame 0, other surfers paddling in the foreground |

One rider throughout: bare-chested, **black boardshorts cut above the knee**, white board with dark rail logos. **Stance: regular/natural (left foot forward).**

### 5.6 What the error bar is

- **Source 1440×2560.** Rider **355–620 px** head-to-foot as he stands, **560–790 px** standing-equivalent, head **73–102 px**, thigh **100–170 px** projected.
- **The camera zooms and pans continuously** (head 73 px at 13.7, 102 px at 15.0), so **no apparent size is compared between two frames without a head-length normalisation.** Every ratio is computed **inside a single frame.**
- **Trunk angles** are hand-measured shoulder-to-waistband from vertical on gridded single frames at **0.81–1.02×**: **±8°** on a clean waistband, **±10–12°** otherwise — **and §2.1's gate applies per frame, and no span is admissible at all.**
- ⚠️ **No automated tracer was built.** Clip 11 built one, validated it, found it reading 9° where the hand read 39–43°, and discarded it.
- ⚠️ **No angle anywhere comes from a survey strip.** The strips (0.18–0.27×) were used **only to find moments** — **and §0.0 records that even for finding, 0.5 s is too coarse.** Every measured frame was re-rendered at **≥0.81×** with a 25 px grid.
- **Hip position** carries the skill's standing caveat — waistband ≈0.60 of stature, trochanter ≈0.53 — so **every hip figure is ±10–15 points however sharp the image.** The single hip landmark used in §3.1a was **inferred, not seen.**
- **Landmarks were verified, not guessed.** Proposed points were drawn back onto the image as labelled crosshairs with the segments between them and checked against the anatomy; two rounds of correction were needed on the leg-chain frame.

---

## 6. Part C — what I could not see, and why

- **The rider himself, at t = 8.990** — not in the frame. And **at t = 4.680** he is a barely-separable shape under the lip; **at t = 11.320** only legs and board are clear of the whitewater. **Verified on full frames.** These three are why no continuous hold is claimed.
- **Any body channel during roughly 8.88–10.00**, the barrel — **1.12 s of the ride simply absent.**
- **The leg chain on 1 of 2 legs** in the one frame that allowed it, and on the whole second attempt. Cause: thigh and shin foreshortening (1.10 admissible, 2.66 refused). **Not resolution, not clothing, not occlusion.**
- **The two legs' split (row 10).** No estimate given.
- **The trunk angle on every frame where the rider is visibly folded** (§2.1), **and any trunk span at all**, because no pair is both per-frame admissible and yaw-matched.
- **Apparent stature in head-lengths.** Refused for a reason no earlier clip has hit: **the sea horizon is not visible in a single frame** — the wave fills the background everywhere, and the one open-water region (x 900–1440, rows 1850–2250 at t = 15.0) shows texture and no line. **The lens height is unknown, not "level" and not "raised"**, so the skill's gate cannot be opened either way.
- **2160p**, which the independent read had and I did not (§5.1).
- **Knee angles** better than ~±10°, and **hip angles** at all.
- **How much of the 13.7→14.2 rotation is trunk yaw and how much is the board turning.**
- **Frontside versus backside.** The wave is a right and he is riding it, which would make him frontside, **but I could not fix the peel direction against his chest and I am not reporting it.**
- **A measured-gravity check on playback speed** (§5.4).
- **Whether the ride's start was like its middle.** The ride is already in progress at frame 0.

---

## 7. What this round did not do

- **No file under `src/` or `server/` was touched.** This is evidence, not a fix.
- **Nothing was built, ridden, benchmarked or measured in the game.** Every game-side statement is quoted from `3.5/engine-target.md` or `3.5/body-channels.md`.
- **No constant is proposed, and no stance rung is named for any frame.**
- **No speed gain, intent, load or force is assigned to the compress–extend–compress at 2.4–3.8 s.** It is reported as a kinematic episode and nothing more — that reading is the owner's.
- **`engine-target.md` was not edited**, and the twelve earlier video documents were not edited.
- **No automated trunk tracer was built. No angle was read from a survey strip.**
- **No conclusion is drawn about the wave, the lip, the foam or the spray.** One line, because it is the context every number sits in: the wave is a thick fast slab, and the rider spends most of the ride in supported trim — **which is why the body does little, and why the one arm lead is on the open face and the three misses are inside the barrel.**

---

## 8. Part B — the mapping

Game-side entries are **code readings quoted from `3.5/engine-target.md` and `3.5/body-channels.md`**. **Nothing was built, ridden or benchmarked.**

> ⚠️ **Work in flight that this table does not credit.** `main` at **b3598cac** (step 3.5g) records that `engine-target` **rows 4, 5 and 15 have been built**, with *"four distinct carriages at one leg height"*. That commit adds no `src/` change to `main`, so the arm rows below describe the game as `main`'s source still stands and should be re-read against 3.5g's branch before being quoted as a gap.

| what the rider does | the game's name for it | have it / partly / not at all |
|---|---|---|
| **A compress → extend → compress while setting the line, 1.4 s, with the board's heading changing through it** | `Compress` + `bottom turn` | **partly.** Leg depth moves in both directions already; **what is missing is that the trunk cannot move independently of it** (`HumanoidRig.ts:1383–1385`) |
| **Trunk un-folds while the legs extend, 0.35 s release** | — | **not at all** as two channels. The drawn correlation is exactly +1 by construction, so "together" is free and "legs first" is unreachable |
| **Rear hand above the crown 0.18 s before the rail bites, held 0.20 s — on 1 turn of 4** | entry to `bottom turn` / `carve` | **not at all**, and the conditionality is the point: **no arm position exists to lead with**, and the one orderable pair runs backwards (`MOTOR_LAG` 0.05 s vs `ARMS_TIME` 0.15 s, `KNEE_RETURN_TIME` 0.6 s) |
| **Three direction changes with NO arm lead, all inside the slab section** | — | **n/a — and it is a constraint on what gets built.** A built lead must be **conditional**, not unconditional |
| **A carriage change with no posture change: lead arm past the rail, rear arm back and low, held 0.8 s** | — | **not at all.** `HumanBalance.arms` is one scalar, capped by `stanceRoom(depth).arms` and **triggered by the same expression that drops the knees** (`humanBalance.ts:423–431`) |
| **5 carriages; 3 distinct at one leg state** | — | **not at all.** One scalar has no height, no spread and no left/right; one pose per stage × depth |
| **Both hands low and forward over the deck in 6 verified windows, including inside the barrel** | — | **not at all.** One hand, on/off, pointed at the water, side chosen by the game (`AttachedRider.ts:5720–5732`) |
| **Hands to the head for 1.2 s, 0.4 s after the board straightens, with no turn attached** | — | **not at all.** No arm position, and nothing puts a gesture after a manoeuvre |
| **Nothing in the body moves for 1.70 s while the board trims and the spray changes** | — | **not at all** as an expressible state |
| **Rides out of a barrel and through ~2 s of whitewater still on his feet** | — | **not at all** as a posture; row 16. The foam does reach the board (3.5e, five channels); **no brace posture exists** |
| **Leaves the board in a deliberate streamlined dive** | `wipeout` | **not at all.** A wipeout exists; a chosen, shaped exit does not |
| **Head and shoulders forward of the hips over planted feet, 6 frames** | `trim` weight (W/S) | **not at all** as a differential. `TRIM_SHIFT = 0.25 m` moves pelvis, torso, head and both arms **together** (`AttachedRider.ts:5514–5518`) |
| **The head thrust forward of the shoulders by about one projected trunk length** | — | **not at all**, second clip |
| **Head turned along the board's travel, gaze below horizontal** | — | **not at all.** Row 18 |
| **0 steps in ~1.3 s of legible feet; front foot at 45–50 % of board length** | — | **have it.** Feet fixed; nothing moves them while upright |
| **4 direction changes in 16.1 s — one per ~4 s** | chaining `bottom turn` / `top turn` / `carve` | **not at all.** No chaining notion exists (row 8); this clip sits at the **slow** end of the range |
| **No trim pump: 0 half-cycles in 1.70 s, 18 samples** | `pump` | **n/a — nothing to map.** Recorded so the 0.55–0.60 s figure is not credited either way |

---

## 9. Rows this clip moves, and how

**Every row below is stated at its corrected value.** Where the first version of this document said something different, the superseded figure is named.

| row | the measurement | the population | which way it moves |
|---|---|---|---|
| **2** | **A per-frame admissibility gate for the trunk** — projected shoulder→waistband ÷ head, in-plane expectation 1.6–1.8. Six attempts: **two clean (2°, 5°, both vertical), one marginal, three refused (1.03, 1.18, 0.39).** **And its second half: a span is a difference of two projected angles, so it is invalid when the yaw changes between the frames, and a fixed lean swivelled from facing the lens to side-on changes its apparent angle with zero flexion** | 6 frames, 1 rider; the yaw argument is geometric and applies to every clip | ⚠️ **Stronger than the first version claimed, and in the other direction.** That version said the series' 59–80° spans were *"safe as lower bounds"*. **They are not, wherever yaw moved — and V12's two frames are 2.4 s apart inside a turn.** **State it as: after thirteen clips there is no gated measurement of trunk angular travel anywhere in the series.** Row 2's target column loses its number; **the row itself is untouched, because the reason to build it is `HumanoidRig.ts:1383–1385`, which needs no camera** |
| **3** | **Opposite-sign trunk-vs-leg: six resolved windows, zero instances** — now including the 1.40 s compress–extend–compress the first version missed | 6 windows, 0.20–1.70 s, 3–19 samples each | **Row 3 is SINGLE and three-times-not-reproduced — 19 transitions across clips 11, 12, 13.** Keep it as rows 1–2's acceptance test; **not** a frequency claim |
| **5** | **The lead is PRESENT once and absent three times.** Present: **rear hand above the crown at 3.100 ± 0.033, rail bites at 3.283 ± 0.017, lead = +0.18 s ± 0.05, held ≥0.20 s.** Absent at 6.30–6.50, 6.50–6.80 and 11.90–12.20, each read at 1/30 s | 4 direction changes, all at the native frame grid | ⚠️ **Supersedes the first version's "0 of 3", which was an artefact of a 0.5 s survey.** Tally goes 10-of-11-across-four-clips → **11 of 15 across five.** The measured +0.18 s sits inside the existing band. **The contribution is the shape: the lead is on the open-face turn and absent on all three inside the slab, so the engine must be able to lead AND not lead** |
| **12** | ⚠️ **NO CONTINUOUS HOLD IS VERIFIABLE.** The rider is **not in frame at 8.990**, **not readable at 4.680**, **legs-only at 11.320** — all verified on full frames. Longest stretch in which the body is shown unchanged: **6.20–6.80, 0.60 s, 19 native frames.** Longest readable stretch of any kind: **4.98–8.75, 3.77 s** | 1 ride, verified gaps | ⚠️ **Supersedes the first version's "8.75 s continuously visible", which must not be quoted.** **This clip does not beat V12's ≥5.7 s and does not extend row 12's hold evidence at all.** What it contributes instead is a **quiet supported trim with named occupied windows, one early compress–extend–compress episode, one late release, and explicit gaps** |
| **15** | **Both hands low and forward over the deck in 6 windows**, each verified at **≤0.18 s sampling**, including through the barrel section | 6 windows, intervals stated per window | ⚠️ **The window list is corrected** — the first version credited carriage A with "0.00–7.00", which contains a hand above the head at 3.100. **Sixth clip for row 15; the count is 6 verified windows, not a continuous span** |
| **4** | **5 carriages; 3 distinct at one leg state** (A, C, D between 14.20 and 16.10, legs extended and trunk vertical); **carriage A at both the deepest fold and the straightest legs** | 5 carriages, 15 windows | **Sixth clip to refute both "tall ⇒ spread" and "deep ⇒ spread."** Adds a fifth carriage type — **both arms forward with the rear hand above the crown** — which is distinct from the hands-to-head gesture |
| **6** | **0 pump half-cycles in 1.70 s of trim with no direction change**, 18 samples at 0.1 s. The 2.4–3.8 episode is **excluded** because the board's heading changes through it | 1 window | **Second clip with no cycle present.** The 0.55–0.60 s figure stands on 2 clips, 1 weak dissent, **3 clips of "no cycle"** |
| **10** | **NOT MEASURED.** One frame with both knees unmistakable: one leg admissible (thigh/shin 1.10, chain 100 % ⚠️ **SAT**), one refused (2.66) | 2 frames attempted | **No change. Row 10 stays at V8's one clip, two frames** — third clip running that could not touch it, on footage that met the geometry ask |
| **11** | **The release: legs and trunk both rise inside 13.70→14.20; the legs are visibly straighter at 13.900 while the trunk is still ≥24° folded** | 1 transition, 0.1 s resolution | **Third clip with legs leading the trunk on the way up** (V7 ~0.5 s, V8 ~0.3 s, here ≤0.2 s). No down-transition was resolvable |
| **18** | **Face resolvable in ≥6 frames at 77–102 px.** Gaze down the line and below horizontal while riding; head pitched down under spray | 6 frames | **Second clip with any observation.** Still no head-yaw measurement, because **no frame has both the face and the board's nose legible** |
| **8** | **4 unambiguous direction changes in 16.1 s — one per ~4 s** | 1 ride | ⚠️ **Corrected from 3** (the heading change at 3.3–3.7 was missed). Still at the slow end, and this clip has a barrel, a lip climb and two bottom turns in it — **row 8's "the range is the requirement" keeps its case for the slow end** |
| **17** | **0 steps in ~1.3 s of legible feet**; front foot at **45–50 %** of board length, consistent with V7's 44–49 % | 2 windows, weak | **Unchanged — the game still agrees with the footage.** A regression guard only |
| **—** | **The head and neck thrust forward of the shoulders**, by about one whole projected trunk length at t = 12.300 | 1 frame measured, several observed | **V12 opened this row; this is its second clip.** It also feeds §2.1 — some of the "fold" is in the neck, which no ruler measures |

**Method results that belong in the skill, not in a row** (all four are now written into `.claude/skills/surf-video-read/SKILL.md`): §2.2's hidden-pane stale-decode and two-`<video>`-element traps with the out-of-order probe that catches them; §2.1's trunk admissibility gate and its yaw clause; §0.0's rule that a posture claim needs timing-grade sampling and a visibility claim needs full frames; and §5.2's correction that the 594 px canvas, not the viewport, caps magnification.

---

## 10. Where the independent read and this one agree

The two reads were made blind and compared afterwards. **The second read, at 2160×3840, is what forced §0.0.** Recorded here so the agreement is not mistaken for one read:

| fact | independent read | this read, verified after being told where to look |
|---|---|---|
| compress–extend–compress while setting the line | 2.31–2.66 compressed, 3.14 extended with the upper hand above the head, 3.45–3.70 bending again with the board heading changing | **Confirmed.** Deepest 2.6–3.0, most extended **3.10–3.20**, hand above the crown first at **3.100**, bending from 3.33, board banked by **3.300** |
| rider hidden | 4.68 and 8.99; legs only at 11.32 | **Confirmed on full frames at all three** |
| quiet supported trim with small adjustments | 7.15, 8.08, 12.67, 13.44 | **Consistent** with my 7.0–8.7 at 0.1 s and 11.7–13.9 at 1/30 s |
| a distinct late release | 13.72–14.07 | **Measured here as 13.85 → 14.20, 0.35 s.** Same event; the 0.13 s offset is within the two reads' sampling |
| intent and speed gain of the episode | undetermined — do not assign | **Not assigned** (§7) |

**Where the two reads were not compared and should not be merged:** every angle, ratio and timing in §2.1, §3.1, §3.4 and §5.3 is mine alone, measured at 1440p, and §5.1 records why the other read has ~3.6× the final resolution on the same frames.
