# Video reference 24 (Kelly Slater, filmed by Dan Scott / `@danscotttt`): **the board's nose goes ABOVE the rider's crown and he keeps the wave — the counterexample clip 19 asked for — and the same laid-out attitude appears TWICE in one ride, five seconds apart, at two different depths**

Source: **https://www.youtube.com/shorts/jPOoZnxF3Sw**, title *"Roundhouse up the point | Kelly Slater"*, channel **`@danscotttt`** (`getVideoData().author` = "Dan Scott"). Length **12.861 s**, read in full. The **twenty-fourth** reference the owner has sent; registered as #24 in `CLIP-REGISTRY.md`.

> ⚠️ **Re-upload check (clip 23's hole).** The registry's ID check passes, but an ID check cannot catch a re-upload, so the content is named here as clip 23 recommended: **rider = Kelly Slater** (named only by the uploader's title — it is not independently verifiable from 130–180 px of rider, and it is **not** load-bearing for anything below); **film/source = an original clip by the poster, not an excerpt from a named film**; **channel = `@danscotttt`, a fifth distinct poster.** The break is a right-hand **point** (the title's word), shot with a long lens from an elevated position along the point. Nothing in it matches any earlier clip's board, break or light.

Delivered to the browser pane at **1080×1920**. `getAvailableQualityLevels()` returns `["hd1080","hd720","large","medium","small","auto"]`, so **`hd1080` is this clip's published ceiling**; `getStatsForNerds().resolution` reported `1080x1920@24`, codec `av01.0.08M.08`, `playbackRate` 1. ⛔ **`setPlaybackQualityRange` was NOT attempted** — clip 22 found it kills a Short's stream outright, and the pane already served 1080 after *enlarge-the-viewport-and-reload*. A **consent gate** stood in front of the Short and was answered **`Reject all`** before any `<video>` existed. `yt-dlp` and `ffmpeg` are both absent from this machine (checked), so nothing was downloaded; every frame is a screenshot of the browser pane.

**Tab: `tab-4` throughout**, claimed with `tabs_create` and passed explicitly on every `navigate`, `javascript_tool`, `resize_window` and `computer` call. The tab held this clip and no other at all times. The pane was **shown** for every screenshot; `document.hidden` was stamped into every rendered frame and read `false` on all of them.

**Every figure below is an estimate from pixels**, and each carries its own error bar and its population. **All medians are plain medians and are named as such.**

---

## 0. The answer first

### 0.1 — ⛔ **NO TAKE-OFF. The clip opens with the rider already on his feet. Twenty-four clips, zero.**

Measured on a gridded crop at **1.92 screenshot px per source px** (scale re-derived from the printed grid labels), at **t = 0.0208 — the first native frame of the file** — the rider is **standing**: crown at source y ≈ 1256, shoulders ≈ 1272, hips ≈ 1327, knees bent, both feet on a planing board whose wake is already laid out behind him, one hand forward and low. The trunk is **29° from vertical** in the image plane.

> **Cause, and it is a FOURTH distinct one.** Clip 21's cause was a highlight edit; clip 22's was a raw take trimmed late; clip 23's was a continuous take whose wave was already underway. **This clip is a continuous take of ONE ride that the poster cut to start partway along the wall** — there is broken water already behind the rider at t = 0 and an open green wall ahead, so the wave has been breaking for some seconds, but unlike clip 23 the take also *ends* mid-ride (he is still riding, still standing, at the last decodable frame). **It is a middle slice of a ride, trimmed at both ends.**
>
> **Four causes, one remedy, unchanged and now four-times-confirmed: footage that STARTS BEFORE THE RIDER IS ON HIS FEET.** Nothing weaker has produced a pop-up in twenty-four tries.

### 0.2 — ⭐⭐ **THE HEADLINE: THE BOARD'S NOSE PASSES ABOVE HIS CROWN AND HE DOES NOT GO. Clip 19's mechanism, with the opposite outcome.**

Clip 19 recorded the series' only wipeout and described its mechanism: *"the board's nose pitches up out of the whitewater, passes his shoulder, then his head … and by 12.99 it is gone."* That is the owner's own complaint about the game, and it was **one instance with no counterexample.**

**Here is the counterexample, measured on a gridded frame at 1.92 px/src, t = 8.7708:**

| | source | |
|---|---|---|
| board's **nose** | y ≈ **1054** | |
| rider's **crown** | y ≈ **1125** | **the nose is ~71 px ABOVE the crown** |
| rider's shoulders | y ≈ 1130 | |
| board's **tail** (where it enters the water) | ≈ (737, 1204) | |
| **board axis, in the image plane** | **≈ 28° from vertical, nose up** | from (816, 1054) → (737, 1204) |

**And he keeps the wave.** He is standing and riding again at **t = 10.6042** — 1.83 s later — and still riding when the file stops at 12.77.

> ⭐ **So "the board's nose above the rider's head" does NOT by itself predict a fall.** The difference between this and clip 19 is visible in the same two numbers: clip 19's board went **past** vertical and **left** him; this one stops at **28° short of vertical** and he goes **with** it, folded over it, rather than being left behind by it.
>
> ⭐⭐ **And the answer with the body is the opposite of clip 19's too.** Clip 19's rider *"answers it with BOTH ARMS THROWN UP AND OUT, GOING TALLER NOT LOWER."* **This rider answers it FOLDED DOWN OVER THE BOARD**, trunk collapsed, upper body low and to the inside of the board's arc. ⚠️ One of the two limbs reaching down-left at 8.7708 is an arm and one is a leg, and **I decline to say which is which at 25–30 px of head** — clip 21's rule ("a limb reading needs the joint chain back to the trunk in the same frame") refuses it. **The direction of the answer — down, not up — does not depend on that identification**, because *both* candidate limbs are below the shoulder line.
>
> **One instance each side now, on two riders.** Clip 20's proposed rule — *board still there ⇒ hands to the deck; board gone past vertical ⇒ arms up and tall* — was already killed by clip 21. **This clip supports the first half of it and says nothing about the second**, because the board never leaves him.

### 0.3 — ⭐⭐ **THE EVENT, CLASSIFIED NOT TIMED: a ~1.9 s laid-out passage he rides out of — and the SAME attitude happens FIVE SECONDS EARLIER in the same ride, shallower**

**What the body does**, read on gridded frames at 1.72–2.91 px/src plus two native-rate sheets (24 tiles at 2/24 s over 8.46–10.40; 24 tiles at 1/24 s over 10.35–11.31):

| t | what the body does |
|---|---|
| **8.479 → 8.646** | **standing, crouched over the board**, climbing; board under him, nose up-left |
| **8.771** | ⭐ **board ~28° from vertical, nose ABOVE his crown**; he is folded over it, upper body low and inside (§0.2) |
| **8.896 → 9.063** | body comes **horizontal**, board up and to his right, legs bent beneath |
| **9.229** | **fully extended and horizontal**, board above-right at ~20° above horizontal, one arm reaching down-line to the hand, one leg hanging toward the board's tail |
| **9.479** | ⭐ the frame of the passage: **body horizontal, board horizontal alongside, one hand ~60 px down-line of the shoulders, one foot low near the tail** |
| **9.646 → 10.063** | horizontal and **inside his own whitewater**; the board is white-on-white and not separately resolvable |
| **10.146 → 10.396** | still horizontal, **head bowed and forward**, both arms hanging low, legs below |
| **10.604** | ⭐ **standing again**: trunk **61° from vertical**, head bowed, both arms forward and low, knees bent, driving through foam |
| **10.8 → 12.77** | standing, folded hard forward, driving through broken water, still riding when the file ends |

> ⛔ **NO DURATION IS PUBLISHED AS IF IT DISCRIMINATED.** Clip 22 proved the clock cannot tell a save from a trick — its *deliberate* layback recovered faster (0.433 s lowest→standing) than either involuntary save (0.48 s, 0.733 s). **This passage's "lowest → standing" would read ≈1.1–1.3 s and its "onset → standing" ≈1.83 s** — longer than all three — **and that tells you nothing about intent.** The figures are recorded here only so a later reader can see they were not used.
>
> ⭐⭐ **What DOES discriminate, and it is new: the same rider performs the same attitude TWICE in one 12.8 s ride.** At **4.02–5.27** he is laid out horizontal over a rolled board with both arms spread, comes back up, and keeps riding; at **9.06–10.40** he does it again, deeper and longer, inside the foam. **A posture a rider reaches twice in thirteen seconds, on the same wave, at two depths, is a MOVE with a depth knob — not an accident that happened to repeat.** That is a stronger argument than any duration, and it is the first time the series has had the same rider do the same thing twice in one ride.
>
> ⚠️ **The uploader's own word is "Roundhouse", and that is evidence of intent — but it is a CAPTION, not a measurement**, and it names the clip, not necessarily this passage. It is reported as what it is.
>
> ⛔ **Whether his feet stayed on the deck through the passage is UNDECIDABLE.** At 9.2292 and 9.4792 a foot reads **28–47 source px below the board's visible outline**, which is exactly what a layback looks like when the deck faces away from the lens *and* exactly what a foot coming off looks like. Clip 20's rule (*"every contact judgement needs a frame containing BOTH the limb AND the whole object"*) was obeyed — both readings come from frames holding the whole board — and the frames still do not settle it, because the board's **deck is turned away** in every one. **No claim is made either way.**

### 0.4 — ⭐⭐ **ROW 17 REFUSED THREE TIMES — AND THE THIRD REFUSAL KILLS THE PROJECTION EXCUSE**

Three attempts, each on a gridded frame holding the board and both candidate contacts, each gated by clip 23's **stance-span test** (a stance spans ≈0.25–0.35 of the board's projected length):

| t | board projected length | candidate "feet" apart | **stance ÷ L** | verdict |
|---|---|---|---|---|
| **1.2708** | ≥157 px (one end lost in spray) | 89 px | **0.57 L** | ⛔ **refused — too WIDE** |
| **2.0208** | 182 px | 33–40 px | **0.18–0.22 L** | ⛔ refused — too narrow |
| **7.0208** | 138–217 px (wake ambiguity) | 29 px | **0.13–0.21 L** | ⛔ refused — too narrow |

> ⭐ **FIRST CONTRIBUTION: the stance-span gate is TWO-SIDED, and clip 23 only described one side.** Clip 23 read the low side — *"much closer than 0.25 L means one foot and a piece of the other leg."* **My t = 1.2708 attempt failed HIGH at 0.57 L, and the high side diagnoses something different: a TRUNCATED BOARD.** A stance cannot be 57 % of a board, so the denominator is wrong, not the numerator. **Both tails of the gate are informative, and they name different faults.**
>
> ⭐⭐ **SECOND CONTRIBUTION, and it is the one that matters: t = 7.0208's board is MAXIMALLY BROADSIDE — projected aspect ≥12.5 — and the stance still reads 0.13–0.21 L.** If projection were hiding the stance, a broadside board is precisely the geometry that would reveal it: the stance runs *along* the board, the board runs *across* the image, so the two feet should project to ~0.3 × 217 ≈ 65 px and they read 29. **Foreshortening cannot explain it.** What is left is the landmark: at **130–180 source px of rider**, a foot is **~8–10 px** and the two contacts are not separable from the shin, the shadow and the wake. A 1.74× magnified crop of the contact band (holding the whole board) showed **a white streak with no resolvable feet at all.**
>
> ⚠️ **This is a THIRD independent caution on the series' most-reproduced number, and it is the strongest of the three.** Clip 22's two attempts did not overlap and never stated how the nose was found; clip 23's two attempts failed the gate at 0.09 L and 0.12 L on partly end-on boards; **this clip fails it on a board that is demonstrably broadside.** **The 0.55–0.60 band must be re-derived under the gate before it is quoted again, and the re-derivation needs a clip where the rider is several hundred source pixels tall — not another clip of this kind.**
>
> ⛔ **And the nose could not be identified by clip 23's fin method.** **No frame examined in 12.861 s shows a fin cluster** — the board's bottom is turned to the lens only during the laid-out passage, and there it is inside spray. **"The pointed end" is not a route and was not used.** The three attempts above are reported as board-length fractions with no front/rear assignment at all, which is why no 0.55–0.60-style ratio appears anywhere in this document.
>
> ⚠️ **No foot slide, lift or re-placement was seen — and that is NOT evidence for row 17 here**, because this clip cannot resolve the two feet apart. Clip 22's caution applies in full.

### 0.5 — ⭐ **A STATE THE ENGINE HAS NO NAME FOR: ~4.5 of 12.8 s driving folded through broken water. Third clip running.**

Clip 22 found *"~8 of 12.6 s spent crouched or folded DRIVING THROUGH BROKEN WATER — neither trim nor a manoeuvre, and THE ENGINE HAS NO NAME FOR IT."* Clip 23 reproduced it qualitatively.

**It is here twice, in two separated windows, and both end with him still standing:**

- **0.02 → ~1.95 s** — the clip opens inside it. Trunk **29° from vertical** at 0.0208 on a gridded frame, folded hard forward, broken water on his inside rail and a wake off the tail, both arms low and forward.
- **~10.6 → 12.77 s** — after the laid-out passage. Trunk **61°** at 10.6042 and **47°** at 11.7708, head bowed, both arms forward and low, knees bent, whitewater over the board.

> **≈4.5 s of 12.77 is in this state — a third of the ride — and it is the state the clip opens AND closes in.** ⛔ **No percentage is published**: see §2.5 — my tile-level posture census disagreed with a gridded measurement on the one tile I cross-checked, so the classification that would produce a percentage is not trustworthy here. **The window boundaries above are eye-read at 0.25 s and are quoted as windows, not as a duty cycle.**
>
> ⭐ **And a sharpening of clip 22's trigger question.** Clip 22 found the brace is *"what a surfer does DRIVING THROUGH whitewater, not what he does MEETING it"*, with intent as the separator. **Here the rider drives through foam folded at 29° early and at 47–61° late — the same state at twice the depth — and the deep instance is the one immediately after the laid-out passage.** The depth looks like a response to how much broken water is on him, not a mode switch.

### 0.6 — ⭐ **THE TRUNK, FIVE GRIDDED FRAMES: 5° to 61°, and the MOST UPRIGHT moment is TRIM AT SPEED**

Image-plane trunk tilt (shoulder midpoint → hip), hand-measured on gridded frames, scale re-derived from each frame's own grid. **±8–10°** each, dominated by the hip landmark at this rider size.

| t | what he is doing | **trunk from vertical** |
|---|---|---|
| **7.0208** | ⭐ **trimming at speed under a hollow section** | **5°** |
| 0.0208 | driving through broken water | 29° |
| 2.0208 | standing up out of the drive, setting up the first turn | 43° |
| 11.7708 | driving through broken water | 47° |
| **10.6042** | **first frame standing after the laid-out passage** | **61°** |

Plain median of the five: **43°**. **Population: 5 frames, one rider, one ride.**

> ⛔ **These are IMAGE-PLANE TILTS, not fold angles, and no rung is named from them.** The ruler calibration licenses a projected trunk angle only at a **level** lens with the board **end-on**; §0.7 shows the lens is raised and §0.8 shows the board is never end-on. They are published as **signs and ordering** only.
>
> ⭐ **The ordering is the finding: the trunk is NEAREST VERTICAL when he is going fastest in clean water, and deepest when broken water is on him.** The engine's trim pose is not where a real rider is most folded — it is where he is most upright.

### 0.7 — ⛔ **DEPTH REFUSED, FIFTEENTH CLIP — and a NEW sign of a raised lens that needs no horizon**

**There is no horizon anywhere in this clip, and not because of haze: there is no SKY.** A whole-frame gridded view at t = 9.0208 (and the same at 0.0208) shows the frame filled top-to-bottom with water: **open ocean at source y = 0, the wave in the middle band, inside water and the shore break at y = 1920.** The camera is a long lens on the point, tilted **down**.

> ⭐ **The new sign, offered as a cheap qualitative test rather than a measurement:** *when a frame contains open sea at its TOP, the shoreline at its BOTTOM, and no sky at all, the lens is above the subject and tilted down.* Clip 23 measured the lens height against a real horizon and used it to **convict** depth. **This clip has no horizon and convicts it anyway, on composition alone.** The two tests agree on the verdict; this one is available on far more clips.
>
> ⛔ **So apparent stature in head-lengths is unlicensed, and no depth rung is named anywhere in this document — fifteenth clip running.** The leg chain is separately refused by the aspect gate (§0.8).

### 0.8 — ⛔ **THE BOARD-ASPECT GATE: four measurements, 4.7 to ≥12.5, against a limit of 2.2**

Board aspect = projected length ÷ projected perpendicular width, hand-measured on gridded frames, **no body landmark touched**:

| t | projected length | width | **aspect** | note |
|---|---|---|---|---|
| **9.4792** | 171 px | ≈36 px | **4.7** | ⭐ the **laid-out apex** — the least broadside moment in the clip |
| 8.7708 | 170 px | ≈23 px | 7.4 | board 28° from vertical in-image |
| 2.0208 | 182 px | ≈21 px | 8.7 | |
| 7.0208 | 138–217 px | ≈11 px | **≥12.5** | flat and broadside in trim |

> ⛔ **All four are 2.1× to 5.7× past the gate. No knee was examined; no leg chain, no flexion, no depth rung. Fifteenth clip running.**
>
> ⭐ **A refinement of clip 18's negative.** Clip 18 found *"a cutback's pivot does NOT open an admissible window — it ROLLS the board, which drives the aspect to its MAXIMUM."* **Here the laid-out apex produces the clip's MINIMUM aspect (4.7), not its maximum** — because this board is rolled *and* yawed toward the lens, which shortens the projection and fattens the width at the same time. **So the laid-out apex is the closest any manoeuvre in this clip comes to opening the window — and it still fails by a factor of 2.1.** Clip 19's conclusion stands untouched: *no manoeuvre opens the window from a shore-side lens; the admissible shot is a property of the CAMERA.*

### 0.9 — ⭐ **THE SECOND GARMENT IN TWENTY-FOUR CLIPS TO SATISFY BOTH HALVES OF THE CLOTHING CLAUSE — and it changes nothing**

The rider is **bare-torsoed in dark boardshorts, with bare legs, bare knees and bare feet**. The waist is a **tonal break** (skin above, black below), visible at t = 7.0208 and 11.7708 — the clause clip 18 wrote. The knee is a visible joint — the clause clip 19 split out. **Clip 20 was the first garment to satisfy both; this is the second.**

> ⭐ **And rows 2, 3, 10 and 14 are refused anyway** — by the board's bearing to the lens (§0.8) and by plain resolution (§0.10). **This is clip 20's headline reproduced on a second clip, a second rider and a second break: the footage ask was granted and it changed nothing. The binding constraint is the camera, not the clothing.**
>
> ⚠️ In the first ~2 s the torso reads dark in survey tiles and skin-toned later; the gridded frames show this is **backlighting**, not a garment change.

### 0.10 — The rider's size in source pixels, stated before anything was spent

Crown-to-sole on four gridded frames: **129, 147, ~174, ~180 source px** (he is crouched in all four, so straight-legged stature would be larger). **Plain median ≈ 150 px.** Head length **25–30 px**. A foot is **~8–10 px**.

> **This is the budget every number above is drawn against: roughly ±8–12° on any joint angle, no gaze, no separable feet.** It is well below the footage ask's "≥900 source pixels" and below clip 23's 314 px. ⭐ **The clip is 1080×1920 at the format's ceiling and the rider is still 150 px, because the operator framed the WAVE, not the surfer** — a reminder that source resolution and subject resolution are different knobs and only the second one matters.

---

## 1. ⚠️ What this clip CANNOT touch, and why

| row | verdict | the reason, named |
|---|---|---|
| **10 — the two legs' split** | ⛔ **refused, fifteenth clip running** | §0.8. Aspect 4.7 to ≥12.5 against a gate of 2.2, on four frames, board only. No knee examined |
| **14 — where a rider lives on the ladder** | ⛔ **no rung named, fifteenth clip running** | No admissible leg chain; and §0.7 — no horizon, and the composition says the lens is raised |
| **2 — trunk angular travel, gated** | ⛔ **no gated angle** | The calibration needs a level lens and an end-on board; neither holds. The 5–61° in §0.6 are image-plane tilts, offered as ordering |
| **3 — the two channels** | ⚠️ **no transition classified** | Leg depth has no admissible ruler here, so "legs" and "trunk" are not two measurable things. **Series stays at 47 resolved, no opposite sign, seven clips** |
| **5 — the arm's lead over the rail** | ⛔ **no lead time** | The one clean overhead arm (§3.2, t = 8.0208) sits in a turn whose rail is inside spray; the moment the rail bites is not resolvable to better than ±0.15 s, which is the whole quantity |
| **6 — pump cadence in trim** | ⛔ **no period** | The only uninterrupted trim is ~6.9–7.5 s, and the camera's zoom changes across it, so no cross-frame body height is comparable. **A third clip with no resolvable pumping** |
| **9 — hips aft while shoulders forward** | ⛔ **no magnitude** | The waistband IS a usable landmark (§0.9) but the fore-aft axis lies along the board, which is 4.7–12.5 aspect, i.e. the axis most compressed by the projection |
| **11, 13 — which channel leads down, where the low sits** | ⛔ **refused** | Downstream of rows 2 and 10 |
| **12 — holds below the Compress band** | ⛔ **no rung, so no hold to time** | §0.7 |
| **17 — the feet** | ⛔ **no ratio**, §0.4 — three refusals, and the row gains a **two-sided** gate and a killed excuse |
| **18 — head and gaze** | ⛔ **no angle** | 25–30 px of head. Not a new cause — plain resolution, as in clip 22 |
| **19 — the loaded hand** | ⚠️ **not resolvable** | The one candidate (the down-line hand at 9.4792) is 35–45 px from the water in a frame full of spray; whether it bears weight is undecidable. **Row 19 unresolved at twenty-four clips** |
| **7 — beat durations inside a manoeuvre** | ⛔ **not attempted** | §2.1: the clip is a clean 24.000 fps with no duplication ramp, so timing *would* be safe — but every manoeuvre here has at least one endpoint inside spray, and a beat boundary you cannot see is not a duration |

**Row 8 — turns chained at a rate: ⚠️ TOUCHED, NOT QUANTIFIED.** **≈5 resolvable direction changes in 12.77 s** by eye at a 0.25 s sampling (≈2.8 s, ≈4.7 s, ≈5.6 s, ≈8.0 s, ≈9.2 s). **No rate is published** — an eye count at 0.25 s is a lower bound on the count and says nothing about the rate's stability. It sits between V7's 0 in 13 s and V9's ≥13 in 30 s and does not resolve their disagreement.

---

## 2. Method findings

### 2.1 — ⭐⭐ **THE FRAME GRID: a true 24.000 fps at three epochs, and the clip is CLEARED of a duplication ramp**

**Rate.** Frame boundaries bracketed by 0.005 s probes at three epochs ~5 and ~11 s apart (123 probes):

| epoch | measured boundary brackets | 24.000 predicts | 23.976 predicts |
|---|---|---|---|
| ~1.0 s | (0.915, 0.920], (0.955, 0.960], (0.995, 1.000], (1.040, 1.045], (1.080, 1.085] | 0.9167, 0.9583, **1.0000**, 1.0417, 1.0833 ✅ | …, **1.0010** ❌ outside |
| ~6.0 s | (5.915, 5.920], (5.955, 5.960], (5.995, 6.000], (6.040, 6.045], (6.080, 6.085] | 5.9167, 5.9583, **6.0000**, 6.0417, 6.0833 ✅ | …, **6.0060** ❌ outside |
| ~11.9 s | (11.830, 11.835], (11.870, 11.875], (11.915, 11.920], (11.955, 11.960], (11.995, 12.000] | 11.8333, 11.8750, 11.9167, 11.9583, **12.0000** ✅ | …, **12.0120** ❌ outside |

**23.976 fps is excluded at all three epochs, in the same direction each time.** This is a **true 24.000 fps** — the seventh rate on the skill's list and the second clip measured at 24.

**Ramp scan (clip 23's test, run in full).** **307 asks at the native mid-frame grid `t = (k+0.5)/24` from 0.0208 to 12.7708, every frame hashed: 307 unique hashes, ZERO adjacent duplicates, zero anywhere.**

> ⭐ **This is the first clip the series has positively CLEARED of a duplication-based speed ramp**, by the same scan that found two of them in clip 23. **Every duration in this document is in real time to the container's own clock** (and none of the ones that would have mattered is published anyway).
>
> ⚠️ **Honest bounds, both of them.** (1) The test is **blind to blend-based ramps and to a true high-rate camera slowed in the edit** — a clean scan means *no duplication ramp*, not *no slow motion*. (2) ⛔ **I built the obvious second test — adjacent-frame mean-absolute-difference as a motion proxy, on the theory that a slowed passage shows a lower MAD — and DISCARDED it.** Adjacent MAD is **14.48** (plain median of 306 pairs, range 11.2–18.5) while MAD at a **six-frame (0.25 s) baseline is 23.8** — only **1.6×** larger for a **6×** longer interval. **The measure is saturated by uncorrelated water texture, so it cannot bound a blend ramp and nothing is claimed from it.**

### 2.2 — ⭐ **ONE UNBROKEN SHOT, 0.0208 → 12.7708, proved by coarse structural correlation**

Each native frame reduced to a **9 × 16 grid of block means** and correlated with its predecessor: **306 adjacent pairs, plain median r = 0.9989, minimum r = 0.9978, nothing below 0.95, nothing below 0.90.** The whole-frame MAD detector agrees: maximum adjacent MAD **18.52 = 1.28×** the median, no outlier anywhere.

> **Tighter than clip 22's proof** (median r 0.9899, nothing below 0.90) and on a 24 fps source. ⚠️ **Both detectors would be blind to a cut between two near-identical shots of the same wave** — but the rider's tracked position is continuous across the whole clip too (§2.4), which a cut would almost certainly break.

### 2.3 — ⭐⭐ **A WORKING CURE FOR THE SCREENSHOT-SIZE TRAP: a ±1 px `resize_window` immediately before the screenshot**

Clip 22 recorded the screenshot size changing four times; clip 23 five times, with `resize_window` failing to pin it. **Here the size alternated between `800×~1443` and `332×598` / `378×598` from one call to the next with the viewport untouched.**

> ✅ **The cure, used 12 times and successful 12 of 12: issue `resize_window` to a size one pixel different from the current one as the FIRST item of the `browser_batch`, with the screenshot as the last item.** Every measurement screenshot in this document came back at 800×~1443 that way. **This is the first control the series has for this trap**, and it is cheap.
>
> ⭐ **And a correction to the skill's constant.** The skill says *"scale is exactly 1.000 at 800×640"* and clip 18 found that conditional. **The real rule is `screenshot width ÷ viewport width`, and it is a MAGNIFIER when the viewport is small:** at a **420×758** viewport the pane returned **800×1443**, a **1.90× upscale**, so a `mag = 1.0` canvas reads at **1.91 screenshot px per source px**. **Shrinking the viewport buys magnification, not merely scale fidelity.** Effective scales used in this document ranged **1.72 to 5.70 px/src**, and every one was **re-derived from the printed grid labels in the same image** before any landmark was read.

### 2.4 — ☠️ **A CLAMPED FIXED-SIZE CROP MASQUERADES AS A STATIONARY RIDER — and I nearly wrote it up**

Video 10's structural fix (fixed-size source crops centred on the finder) was used throughout. **Its failure mode is new and it is silent.** My first event sheet used `S = 460`, which clamps the crop origin to `sx ≤ 620`; the sheet's labels printed `620,878` for **nine consecutive samples** over 9.56–10.40, and I read that as *"the rider has stopped moving in image space."*

**He had not.** Re-run with the finder printed instead of the crop origin, his position goes **850 → 868 → 860** across the same window and keeps changing every frame.

> ⭐ **Rule bought: print the FINDER's position, never the crop's origin.** A clamped crop reports the clamp, and a clamp looks exactly like stillness.

### 2.5 — ⛔ **A TILE-LEVEL POSTURE CENSUS WAS BUILT, CROSS-CHECKED AND DISCARDED — and it questions clip 22's duty cycle**

I built a uniform **0.25 s** census (48 tiles, 0.0208 → 11.7708, fixed-size crops centred on the finder) intending to publish a trunk duty cycle the way clip 22 did — clip 23 refused one only because its sampling was non-uniform, so uniform sampling looked like the fix.

**It is not the fix.** On the one tile I cross-checked against a gridded frame — **t = 2.0208** — the tile reads *"upright"* and the gridded frame measures **43° from vertical**.

> ⛔ **No duty cycle is published.** ⚠️ **And this is a caution on clip 22's 45 % / 21 % / 18 % / 11 %**, which came from 65 tiles at 0.1833 s with no gridded cross-check recorded. **Uniform sampling fixes the sampling; it does not fix the classifier.** The failure is clip 12's and clip 20's rule arriving at a third target: **strips lie about angles, strips lie about limb position, and strips lie about POSTURE CLASS.**

### 2.6 — Rulers, kept and discarded

| tool | verdict |
|---|---|
| **darkness rider finder** (luminance < 60 on a ×4 downsample, 9×9 box maximum) | ✅ **KEPT.** Validated on a 24-tile sheet across the whole clip: **24 of 24 centred the rider.** Tracked smoothly over 99 consecutive native frames (8.0 → 12.0) with box scores 62–81 of 81 and no jumps. ⚠️ Used **only** to place crops; **no angle, height or limb position is taken from a finder-derived number** |
| **fixed-size source crops centred on the finder** | ✅ **KEPT for survey only** — with §2.4's correction |
| **coarse 9×16 block-mean correlation** | ✅ **KEPT as a cut detector only** (§2.2). Its values are not used for anything else |
| **adjacent-frame MAD as a motion/slow-motion proxy** | ⛔ **DISCARDED** — saturated by water texture (§2.1). Nothing quoted |
| **tile-level posture census** | ⛔ **DISCARDED** — failed its gridded cross-check (§2.5). Nothing quoted |
| **session-wide hash guard** (clip 22's rule, clip 23's implementation) | ✅ **KEPT and run at scale: 720 asks, 308 distinct pictures, ZERO stale frames.** Every repeat was explained by asking for the same native frame again |
| **260 ms settle + two-decode stability seek** | ✅ **Passes its first 24 fps source: 720 asks, 0 unstable, 0 `currentTime` mismatches.** Better than clip 20's 30 fps result (one stably-wrong frame in ≈25) |
| **background job + poll runner** (clip 20) | ✅ confirmed again — a 307-ask scan ran ~110 s over three polls with no 45 s timeout and no runaway |
| **unclamped `MessageChannel` nap** (clip 20) | ✅ kept and confirmed |
| **`setPlaybackQualityRange`** | ⛔ **not attempted**, on clip 22's evidence |

### 2.7 — Two traps that reproduced exactly as briefed

- ⭐ **The two-`<video>` trap fired on the first install**: element 0 had `duration = null` and `videoWidth = 0`. Every later call re-picked by assertion — `videoWidth === 1080 && videoHeight === 1920 && |duration − 12.861| < 0.01`, **throwing unless the match is unique** — and `pick()` ran at the top of every measurement. **Fourth clip running; it is the DEFAULT on a Short.**
- ☠️ **The end-of-file non-decode reproduces, third clip running.** Seeks to **12.8125, 12.8542, 12.8600 and 12.8605** all return **the same picture** while `currentTime` reports exactly what was asked and `seeked` fires. The native scan was stopped at 12.7708, so **nothing published is affected** — but on a 12.861 s file that is the last **0.05 s**, and a reader sampling to the stated duration would publish a frozen tail.

---

## 3. What the body does

### 3.1 — The ride, as far as it can be read

Read on two uniform 0.25 s survey sheets (48 tiles), two native-rate sheets (48 tiles over 8.46–11.31), and **eleven gridded measurement frames** at 1.72–5.70 px/src.

| window | what it is |
|---|---|
| **0.02 → ~1.95** | **driving through broken water, folded hard forward** (trunk 29° at 0.0208), both arms low and forward, whitewater on the inside rail. The clip opens inside this state |
| ~1.95 → ~2.8 | he **stands up out of it** (trunk 43° at 2.0208) and sets up; the board flattens |
| ~2.8 → ~4.0 | **a bottom turn into a long carve**, board progressively onto its rail, body dropping |
| **~4.0 → ~5.3** | ⭐ **laid out horizontal over a rolled board, both arms spread** — the shallower of the clip's two instances of the laid-out attitude |
| ~5.3 → ~6.0 | **rebound**, one hand **+23 px above the shoulder line** at 5.5208, one leg extended, body extending |
| ~6.0 → ~6.9 | **driving in a crouch under a hollow, pitching section** — the closest the clip comes to a tube |
| **~6.9 → ~7.5** | ⭐ **trim at speed: trunk 5° from vertical**, both arms forward and low, board flat and broadside |
| ~7.5 → ~8.4 | **climb and top turn**; at **8.0208** one hand is **+74 px above the shoulder line** and the other **−36 px below it** |
| **~8.5 → ~10.5** | ⭐⭐ **the laid-out passage** (§0.3): board to 28° from vertical with its nose above his crown at 8.771, body horizontal 8.9–10.4, inside his own whitewater 9.6–10.1 |
| **~10.6 → 12.77** | **standing again and driving folded through broken water** (trunk 61° at 10.6042, 47° at 11.7708), head bowed, both arms forward and low. **Still riding when the file stops** |

### 3.2 — ⭐ The arms: both hands measured separately, and the one clean pair is in a TURN

**Hand height relative to the SHOULDER LINE** (clip 19's corrected metric, not the retired crown test), on gridded frames:

| t | what he is doing | upper hand | lower hand | spread |
|---|---|---|---|---|
| **8.0208** | ⭐ **a top turn** | **+74 src px** (+2.7 head-lengths) | **−36 src px** | **110 px** |
| 5.5208 | the first rebound | **+23 src px** | ⛔ not identifiable | — |
| 0.0208 | driving through foam | ⛔ not identifiable | **−37 src px** | — |
| 10.6042 | first frame standing after the passage | **−37 src px** | ⛔ not identifiable | — |
| 7.0208 | **trim at speed** | both hands **within ±10 px of the shoulder line**, held **forward**, neither above | | ≈0 vertically |

> ⭐ **"Arms up is a TURN signature" reproduces on a SEVENTH rider, and the negative control holds:** the only frame with a hand clearly above the shoulder line that is **not** a turn is the rebound at 5.5208, which is the exit of one. **In trim at speed (7.0208) neither hand reaches the shoulder line.**
>
> ⭐ **"The two hands never agree" reproduces**, but on a **population of one** here: 110 src px apart at 8.0208, ≈73 % of this frame's crown-to-sole. ⚠️ **Three of five frames yielded only ONE identifiable hand** — the other arm is behind the trunk, inside spray, or indistinguishable from a leg at 25–30 px of head. **The brief is right that both hands must be measured; this clip shows that at 150 px of rider you often only get one, and that a read which quietly measures "the arm" is measuring whichever one happened to be visible.**
>
> ⭐ **And clip 23's refutation is supported, not contradicted:** the one spread here (≈73 % of crown-to-sole) lands inside clip 23's own 4.3–77 % range for one rider and outside both of the earlier "per-rider bands". **The magnitude belongs to the moment.**

### 3.3 — The head stays up through the deep folds, and goes DOWN in broken water

In the three deepest-fold frames (10.6042 at 61°, 11.7708 at 47°, 0.0208 at 29°) **the head is bowed forward, following the trunk, not held up** — the crown is forward of the shoulders in all three. In the turn frames (8.0208, 5.5208) **the head is up and turned toward the direction of travel.**

> ⚠️ **This contradicts clip 23's "in every deep fold the head stays up" — on the deep folds that happen in BROKEN WATER.** ⛔ **No angle is published** (25–30 px of head, row 18 refused), so this is a **sign**, not a measurement, and it is reported because the two clips disagree and the disagreement is the information. **A plausible reconciliation, not tested: the head goes up when there is something to look at down the line and down when the rider is bracing through foam.**

---

## 4. What could not be seen

- **Resolution is the binding constraint on the body**, not the stream: 1080×1920 at the format's ceiling, and the rider is **129–180 source px** because the frame is composed around the wave. No gaze, no separable feet, no knee.
- **The board's DECK is turned away from the lens throughout the laid-out passage**, which is why §0.3's feet question is undecidable rather than merely hard.
- **No fin is visible in any frame examined**, so clip 23's nose identification could not be used and no front/rear foot assignment was attempted.
- **No horizon and no sky anywhere**, so lens elevation is qualitative (§0.7).
- **Spray covers at least one endpoint of every manoeuvre**, which is why row 7's beat durations were not attempted on a clip whose clock is clean.
- **The camera zooms and pans continuously**; no cross-frame height or length is comparable, and none is used.
- **The last ~0.05 s of the file never decodes** (§2.7).

---

## 5. The rows this clip moves, and how

| row | moves? | how |
|---|---|---|
| **the wipeout mechanism** (clip 19's finding, no row of its own) | ⭐⭐ **A COUNTEREXAMPLE, AND IT NARROWS THE MECHANISM** | Clip 19: board's nose passes the crown → board gone → rider thrown. **Here the nose is 71 src px above the crown at 8.7708 and he rides away 1.8 s later.** The board stops **28° short of vertical** and he folds DOWN over it rather than going taller. **"Nose above the head" is not the predictor; "past vertical and leaving him" is.** One instance each side, two riders |
| **the event categories** (clips 20/21/22/23) | ⭐⭐ **A FIFTH SHAPE, AND THE FIRST WITH AN INTERNAL CONTROL** | A **~1.9 s laid-out passage** ending standing, and **the same attitude appears 5 s earlier in the same ride at a shallower depth.** **A posture a rider reaches twice in one wave at two depths is a move with a depth knob.** ⛔ No duration added to the 0.433 / 0.48 / 0.733 set — clip 22's refutation is respected in full |
| **17 — the feet** | ⭐⭐ **THREE REFUSALS, A TWO-SIDED GATE, AND A KILLED EXCUSE** | 0.57 L, 0.18–0.22 L, 0.13–0.21 L. ⭐ The gate's **high** side diagnoses a **truncated board**, which clip 23 did not describe. ⭐⭐ **The 0.13–0.21 L reading is on a MAXIMALLY BROADSIDE board (aspect ≥12.5), so foreshortening cannot explain it — the fault is the landmark at 8–10 px per foot.** **Third independent caution on the 0.55–0.60 band, and the first that rules out projection** |
| **the engine's unnamed state** | ⭐ **THIRD CLIP RUNNING** | **≈4.5 of 12.77 s driving folded through broken water, in two windows, and the clip both OPENS and CLOSES in that state.** Trunk 29° early, 47–61° late — the same state at twice the depth |
| **4 — arm carriage is its own channel** | ⭐ **STRENGTHENED, seventh rider** | "Arms up is a turn signature" reproduces with a negative control: **in trim at speed neither hand reaches the shoulder line.** The one measurable pair is **+74 / −36 src px.** ⚠️ **Three of five frames gave only ONE identifiable hand** — a caution on every "the arm" reading in the series |
| **the trunk channel** (1, 2, 6, adjacent) | ⭐ **ORDERING, NOT A DUTY CYCLE** | Five gridded frames, **5° to 61°**, plain median 43°. ⭐ **The most upright moment is TRIM AT SPEED (5°); the deepest are driving through broken water (47–61°).** ⛔ No duty cycle (§2.5) |
| **18 — head and gaze** (adjacent) | ⚠️ **A DISAGREEMENT WITH CLIP 23** | Clip 23: *"in every deep fold the head stays up."* **Here the head is bowed in all three deep folds — and all three are in broken water**, while the head is up in both turn frames. **Sign only; no angle** |
| **the clothing clause** | ⭐ **SECOND GARMENT IN TWENTY-FOUR CLIPS TO SATISFY BOTH HALVES — and it changes nothing** | Bare torso, visible waistband, bare knees and feet. **Rows 2/3/10/14 refused anyway.** Clip 20's headline reproduced on a second rider and break |
| **the aspect gate** | ⭐ **A REFINEMENT OF CLIP 18's NEGATIVE** | Four measurements, **4.7 to ≥12.5.** ⭐ The **laid-out apex** gives the clip's **minimum** aspect, not its maximum as clip 18's cutback did — rolled *and* yawed toward the lens. **It is the closest any manoeuvre comes to opening the window, and it still fails by 2.1×** |
| **depth (14) / the lens** | ⭐ **A NEW SIGN THAT NEEDS NO HORIZON** | **Open sea at the frame's top, shoreline at its bottom, NO SKY anywhere ⇒ the lens is raised and tilted down.** Clip 23 convicted depth with a horizon; **this convicts it without one**, and the test is available on far more clips |
| **the frame grid (method)** | ⭐⭐ **FIRST CLIP CLEARED OF A RAMP** | **True 24.000 fps at three epochs (23.976 excluded at all three); 307 native asks, 307 unique hashes, zero duplicates.** And ⛔ the obvious second test (adjacent MAD) was built and **discarded as saturated by water texture** |
| **the screenshot-size trap (method)** | ⭐⭐ **A WORKING CURE, 12 OF 12** | **A ±1 px `resize_window` as the first item of the batch, the screenshot as the last.** The first control the series has for a trap clips 22 and 23 could only report |
| **the posture census (method)** | ⛔ **BUILT, CROSS-CHECKED, DISCARDED — and it questions clip 22's number** | Uniform 0.25 s sampling, and the tile still read "upright" where the gridded frame measured **43°**. **Uniform sampling fixes the sampling, not the classifier** |
| **the take-off** | ⛔ **FOURTH CAUSE, SAME REMEDY** | A continuous take of one ride **trimmed at BOTH ends**. Twenty-four clips, zero pop-ups |
| **3, 5, 7, 9, 10, 11, 12, 13, 19** | ⛔ **CANNOT TOUCH** | §1 |

### What this clip says against the brief it was given

1. ⭐⭐ **"A FOOT RATIO FAILS BECAUSE OF PROJECTION" IS NO LONGER AVAILABLE AS AN EXCUSE.** The brief carries clip 23's gate and clip 22's two cautions. **This clip adds the test that separates the two candidate causes: a board at aspect ≥12.5 is as broadside as a board gets, the stance runs along it, and the stance still reads 0.13–0.21 L.** The fault is the landmark at 8–10 px per foot, not the geometry. **More clips of this kind will not fix row 17; only a clip with the rider at several hundred source pixels will.**
2. ⭐⭐ **THE BRIEF'S CLIP-19 MECHANISM IS TOO BROAD, AND THE NARROWING IS MEASURABLE.** A board whose nose rises **above the rider's crown** does not take him with it — here it does so and he keeps the wave for another four seconds. **The predictor has to be the board going PAST vertical and leaving him, not the nose clearing his head.**
3. ⭐⭐ **"CLASSIFY THE EVENT, DO NOT TIME IT" IS RIGHT, AND THERE IS A BETTER DISCRIMINATOR THAN EITHER.** Not the duration, and not the posture alone: **repetition within one ride.** The same laid-out attitude at 4.0–5.3 and again, deeper, at 8.5–10.5. **A rider does not have an accident twice on the same wave in the same shape.**
4. ⭐ **A HORIZON IS NOT REQUIRED TO CONVICT DEPTH.** Fifteen clips said *"no horizon, so stature is unlicensed"*; clip 23 showed a horizon **convicts** rather than licenses. **This clip has no horizon and convicts anyway, on composition: open sea at the top, shore at the bottom, no sky.**
5. ⭐ **THE SKILL'S SCREENSHOT SCALE RULE IS BACKWARDS AND THERE IS A CURE FOR THE SIZE TRAP.** The scale is `screenshot width ÷ viewport width`, so **a small viewport is a 1.90× magnifier**, not merely a 1.000 scale; and **a ±1 px `resize_window` immediately before the screenshot restored the large screenshot 12 of 12 times.**
6. ⚠️ **THE BRIEF SAYS "PUBLISH NO PERCENTAGE FROM NON-UNIFORM SAMPLING". THAT IS NECESSARY AND NOT SUFFICIENT.** I sampled uniformly at 0.25 s and the census still had to be discarded, because the **tile-level classifier** was wrong where a gridded frame could check it. **Clip 22's published duty cycle rests on the same kind of classifier with no cross-check recorded.**
7. ⚠️ **"MEASURE BOTH HANDS, NEVER THE ARM" IS RIGHT AND OFTEN IMPOSSIBLE.** Three of my five arm frames yielded **one** identifiable hand. **A read that measures "the arm" at this rider size is not choosing an arm — it is reporting whichever one was visible**, and the series should record which hand count a figure came from.
