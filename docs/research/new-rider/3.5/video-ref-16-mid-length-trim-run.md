# Video reference 16 (*Top speed mid length*): fourteen seconds of trim with ZERO direction changes, a pump cadence reproduced six times, and zero decoupled transitions — clip 15's headline not reproduced

Source: **https://www.youtube.com/shorts/NQ6dkvD2gHU**, title *"Top speed mid length #surf"*, channel `@KalesBroccoli`. Length **24.001 s**, read in full. The **sixteenth** reference the owner has sent.

Delivered to the browser pane at **1080×1920** (a 9:16 stream, unlike clip 15's 3:4). `getAvailableQualityLevels()` returns `["hd1080","hd720","large","medium","small","tiny","auto"]`, so **`hd1080` is this clip's published ceiling**; it was pinned with `setPlaybackQualityRange` and `getPlaybackQuality()` confirmed `hd1080`. Stream is **24 fps, measured three ways** (§5.3) — a rate the series has not had to handle before. `playbackRate` 1. `yt-dlp` and `ffmpeg` are both absent from this machine (checked, as the skill asks), so nothing was downloaded; every frame is a screenshot of the browser pane, **tab `tab-2`**, claimed with `tabs_create` and passed explicitly on every call. The pane was **shown** for every measurement. **No consent gate appeared.**

**Every figure below is an estimate from pixels**, and each carries its own error bar.

---

## 0. The answer first

### 0.1 — ⭐ The question the brief put first: IS THERE ANY TRIM IN THIS CLIP?

**Yes — and almost nothing else. This clip is the opposite of clip 15.**

| the test, as the brief set it | result |
|---|---|
| **Does the board's nose ever swing round — a heading reversal?** | ⭐ **NO. Not once.** The board's nose points **left, down the line, in every one of 45 frames checked by eye on full or near-full frames** across **3.0 → 16.9 s** (6 frames at 0.5 s over 3.0–5.5; 3 at 0.5 s over 6.0–7.0; **35 at 0.25 s over 7.5–16.0**; 4 at 0.3 s over 16.0–16.9) |
| **Does the board's bottom ever become visible — a rail roll toward the camera?** | ⭐ **NO.** In all 45 frames the camera sees the **orange deck** or the rail edge. The bottom of the board is never shown |
| **So how long is the longest stretch with no direction change?** | ⭐ **≈ 14.0 s** — the whole standing ride, 3.0 → ~17.0 |
| **How long is the longest stretch with the board's in-image long axis steady to ±3°?** | ⛔ **about 0.25 s**, and that is the honest strict answer (§0.3) |

**So the brief's strict criterion and the surfing fact point in opposite directions in this clip, and both must be reported.** The board's in-image angle oscillates between about **−16° and +19°** with a ~0.9 s period — it is **pitching and rolling through a pump**, not turning — while its heading never reverses. Clip 15 rejected windows because the nose swung; here the nose swings *within* one unbroken heading. **A "flat board, constant heading" test cannot tell a pump from a turn, and this clip is the counter-example that shows it.**

> **Against clip 15, which is the direct comparison the brief asked for:** clip 15's reader found a turn every ~1.9 s and a longest flat stretch of 0.56 s. **This clip has zero turns in 14.0 s.** Both are real surfing. The engine has to cover both, which is exactly what `engine-target` row 8 already says — and **this clip pushes row 8's "zero" end out from V7's 13 s to 14.0 s**.

### 0.2 — The second headline: a pump cadence with a real population, and it is asymmetric

Measured as **the height of the top of the rider's head above the board's deck under his feet**, on a per-frame track validated against **six hand measurements on 1:1 gridded frames** (§3.2), sampled at **1/12 s** across **7.5 → 11.0 s**:

| extreme | t | head-above-deck (source px) |
|---|---|---|
| max | **7.917–8.000** | 255 |
| min | **8.750** | 214 *(hand: 217)* |
| max | **9.167** | 280 *(hand: 272)* |
| min | **9.667** | 215 |
| max | **10.083** | 273 |
| min | **10.583** | 210 *(hand: 205)* |
| max | **11.000** | 282 *(hand: 280)* |

- **Full period 0.92 s, measured three independent ways** — max→max at 9.167→10.083 and 10.083→11.000, min→min at 8.750→9.667 and 9.667→10.583 — **all four intervals are 0.92 s** at a 1/12 s sampling grid (±0.083 s).
- **Half-cycles are NOT symmetric: down 0.50 s (×2), up 0.42 s (×3).** The rise is consistently faster than the sink.
- **Excursion 45–72 px on a 210–282 px baseline — 20–28 % of the head's height over the board.**
- **Population: 6 half-cycles in 3.04 s, one rider, one shot, one window.** Not a within-window division: **every extreme was located individually**, and one of them was re-checked at the **native 1/24 s grid** (10.458 → 10.750, 8 frames) which put the low at **10.54–10.63** against the 1/12 s estimate of 10.583 — **so the sampled extremes are within ~0.06 s of the real peaks.** That is the brief's own test, run and passed.

**Against `engine-target` row 6**, whose target is **0.55–0.60 s per half-cycle, in the TRUNK, with the legs not doing the work:**

- ⚠️ **The period is FASTER: 0.42–0.50 s per half-cycle, mean 0.46 s**, 15–25 % below row 6's band. That is outside V8's and V9's agreement-within-10 %.
- ⛔ **And the channel cannot be assigned.** This rider wears a **one-piece black wetsuit**: there is no hip landmark anywhere in the clip (§2.1), so I cannot say whether the legs, the trunk or both produce the head's travel. **What I measured is the head's height over the board, which is what the brief asked to be kept separate from leg depth — and I am keeping it separate by refusing to convert it.**

### 0.3 — ⚠️ A correction to my own first reading, made before publication

**From 0.70× sheets I read the window 12.667 → 13.000 as "the body rises while the trunk's fold does not change" — a DECOUPLED transition, which would have been this clip's headline.** Re-rendered at **1:1 with a 40 px source grid**, the head's height above the board under the rider's front foot measures **237, 240, 235 px** across those three frames. **It does not rise. It is flat to ±5 px (±2 %).**

> **The rule this re-confirms, with a new instance: the skill says survey strips lie about angles. They lie about HEIGHTS too.** 0.70× was enough to see the big 20–28 % excursions of §0.2 and not enough to see that a 2 % change was 2 % and not 10 %. **Every classification in §3.3 that is not inside the hand-validated window carries that warning.**

### 0.4 — The third headline, and it is a negative that matters: **zero decoupled transitions, zero opposite-sign**

**Seven transitions resolved with both observables legible: 3 same-sign down, 3 same-sign up, 1 frozen, ZERO decoupled, ZERO opposite-sign.** §3.3.

> ⭐ **Clip 15 reproduced decoupling four times in one ride and proposed it as rows 1–2's acceptance test. This clip looked for it explicitly and did not find it once in 14 s.** That does not refute clip 15 — it is one rider on a mid-length board doing one thing — but **it means decoupling is now 4 instances in 1 clip of 2 that counted it, not a general feature of riding**, and the acceptance-test proposal should carry that.
>
> ⚠️ **And a method caution that applies to clip 15's count as much as to mine.** The two observables used in both clips are **"body height over the board"** and **"trunk fold"**, and they are not independent: *folding the trunk lowers the head on its own.* So **"same-sign down" is partly guaranteed by the geometry and carries very little information.** The informative categories are **decoupled** (height moves, trunk does not ⇒ the legs did it) and **opposite-sign**. **The series should stop counting same-sign transitions as evidence and count only the other three categories** — on that accounting this clip contributes **1 frozen and nothing else**, and clip 15 contributes **4 decoupled and 2 frozen**.

Running series tally of resolved transitions with **no opposite-sign instance**: was 36 across five clips; with this clip's 7, **43 across six clips.**

### 0.5 — ⛔ Row 5 cannot be touched, and the reason is new

**There is no direction change in this clip, so there is nothing for an arm to lead.** Every previous refusal on row 5 was a resolution or an occlusion problem. **This is the first refusal caused by the surfing itself.** The tally stays at **16 of 28 across seven clips.**

And a count that is worth more than a miss: ⭐ **in 14.0 s of standing riding, sampled at ≤0.25 s throughout, neither hand ever goes above the rider's shoulder, let alone above the crown.** Both hands stay low, over the deck or just outside the rails, for essentially the whole ride (§3.5). **The overhead arm is a turn's gesture, and a rider who does not turn never makes it.**

### 0.6 — The rider's size in source pixels, stated before anything was spent

| | |
|---|---|
| **Head above the board's deck** (the measured quantity) | **205–282 px**, hand-read at 1:1 on six frames |
| **Head length** (cap top to chin) | **≈ 40 ± 8 px**, read at 4.2× on a 10 px source grid at t = 11.333 — **too small and too shaded for any feature** (§4.3) |
| **Board's visible extent** | **240 px at t = 8.5 rising to ~330 px by t = 13–15** — the lens zooms in continuously at roughly **5 % per second** |
| **Camera** | **from the beach, side-on, zooming in through the whole clip, and THE LENS SITS ABOVE THE RIDER** — the sea horizon is above his head in every full frame checked (§5.6) |

> ⚠️ **The lens height decides row 14's licensing again. The rider is below the horizon in every frame, so head-length rulers are not licensed. No depth rung is named anywhere in this document.**

### 0.7 — What this clip has that no previous clip in the series has

⭐ **The whole take-off, inside the same unbroken shot as the ride.** At **1.0–2.0 s** the rider is **prone, paddling**, arms stroking; at **~2.4–2.6** he pops up inside his own spray; he is **standing by 3.0** and still standing at **16.9**. There is **no cut anywhere in 0 → 18.3 s** (§5.5). Fifteen previous clips either began mid-ride or cut to one.

---

## 1. ⚠️ What this clip CANNOT touch, and why — the honest half

Stated before the measurements, because for most of these rows it is the whole result.

| row | verdict | the reason, named |
|---|---|---|
| **2 — trunk travel** | ⛔ **the gate could not be RUN, second clip running, and a NEW cause** | §2.1. The rider wears a **one-piece black wetsuit**. Its only garment edges are a **light panel across the chest and shoulders** and a **light band on the forearms**. **There is no edge at the pelvis in 24.0 s** — and the chest panel's lower edge is a **torso** landmark that moves *with* the trunk, which is precisely the failure clip 15's rule names. **No trunk angle, span or rate is published** |
| **5 — the arm lead** | ⛔ **nothing to lead** | §0.5. **Zero direction changes in 14.0 s.** This is a refusal caused by the surfing, not by the footage |
| **7 — beats inside a manoeuvre** | ⛔ **no manoeuvre** | There is no turn in the clip to decompose |
| **10 — the two legs' split** | ⛔ **not measurable, and the gate cannot be computed** | §3.1. Four frames attempted at 1.45×. **The knee is not identifiable as a joint in any of them**: the wetsuit is uniform black with no knee panel and no crease, and the leg is seen against dark water, so thigh and shin read as one column. **The thigh/shin admissibility ratio cannot be computed.** Row 10 stays at V8's one clip, two frames |
| **11 — which channel leads down** | ⛔ **the channels cannot be separated** | With no hip landmark (§2.1) and no knee (§3.1), "legs" and "trunk" are not two measurable things in this clip. **I will not guess an order** |
| **12 — held vs dipped lows** | ⛔ **no rung, so no band** | What *can* be said without a rung: **the head's height over the board never rests at its minimum.** The lows are turning points of a 0.92 s cycle, not plateaux — the longest flat bottom in the validated track is **≤ 0.17 s** |
| **13 — where the low sits in a turn** | ⛔ **no turn** | Same reason as row 7 |
| **14 — where a rider lives on the ladder** | ⛔ **no rung named, eighth clip running** | §3.1. No knee, no hip, and the lens is above the rider |
| **16 — the anticipatory brace** | ⛔ **contact cannot be timed** | §4.4. From ~14.0 s the rider runs through continuous foam and backwash; **there is no discrete whitewater-contact event to time a brace against.** What I can record is a **0.83 s window (14.33–15.17, 6 samples) with the body low and the trunk folded and both visibly unchanged, inside foam** — consistent with the brace, **not a third instance of it** |
| **18 — head yaw vs the board** | ⛔ **no yaw, and a new cause** | §4.3. The head is **≈ 40 px** and the face sits **in the shadow of a cap brim** at every moment it is turned toward the lens. Rendered at **4.2×** on a 10 px grid it is a blur with no brow, nose or chin. **The series' footage ask is unchanged and unmet** |

---

## 2. The two method findings

### 2.1 — ⭐ A ONE-PIECE WETSUIT KILLS BOTH LANDMARKS AT ONCE, AND THAT IS WORSE THAN A LOOSE SHIRT

Clip 13 gave the series the gate — **projected shoulder→waistband ÷ head length**. Clip 14 said calibrate it within the clip. Clip 15 said it needs **a garment edge that tracks the pelvis**, and could not run it because the rider wore a loose T-shirt.

**Here the rider wears a full one-piece wetsuit, and I could not run it either — for a different and more general reason.** Rendered at **1.75×** on a 20 px source grid at **t = 9.167 and t = 10.583** (§ the torso frames), the suit shows exactly two garment edges: a **light grey panel over the chest and shoulders**, and a **light band at the forearms**. Below the chest panel the suit is unbroken black from the ribs through the hips into the legs. **There is no seam, no colour break and no tonal step at the pelvis in any frame of the clip.**

> **The correction this clip adds, stated so it can be quoted: a one-piece wetsuit removes the hip landmark AND the knee landmark in the same garment.** A loose shirt (clip 15) at least leaves bare legs with a visible knee. **A full suit defeats row 2's gate and row 10's leg chain simultaneously, and it is the single most common thing a surfer wears in cold water.** The footage ask therefore gains a clause it has never carried: **the rider must be in boardshorts and a short-sleeved or sleeveless top, not a steamer** — or the clip can answer neither depth question whatever its resolution.

**Consequence: no trunk angle, no trunk span, no trunk rate, no leg chain, no rung.** The series still has **no gated measurement of trunk angular travel anywhere, now across sixteen clips.**

**This does not weaken `engine-target` rows 1 and 2.** Their case is `HumanoidRig.ts:1383–1385` — the drawn trunk is a one-line function of drawn leg depth — which is a code reading and needs no camera.

### 2.2 — ⭐ EVERY AUTOMATED BODY RULER I BUILT FOR THIS CLIP FAILED, AND TWO OF THEM FAILED PLAUSIBLY

Four were built and three are discarded outright. **Nothing from the discarded three is quoted anywhere.**

| ruler | what it did | verdict |
|---|---|---|
| **orange-board finder** (centroid, bounding box, principal axis) | located the board in 7.5–16.6 reliably, n = 300–3 800 px | ✅ **kept.** High contrast, validated against every frame I rendered |
| **board nose-taper detector** (width profile along the principal axis, narrow end = nose) | reported the **nose on the RIGHT at t = 12.0 and 13.5** | ⛔ **DISCARDED — refuted by eye on 1:1 frames**, where the nose is unmistakably on the left in both. The board's taper is too gentle against a 540-px downsample |
| **topmost-dark-pixel shoulder finder** (lum < 115, chroma < 42, within ±150 px of the board) | gave a clean-looking cycle | ⚠️ **contaminated.** At **t = 11.083–11.167 it jumped 282 → 315 px** — and a **second person's head is in the water at exactly that x and y in exactly those frames.** The "lock" was on the wrong human being |
| **flood-filled suit silhouette** (same mask, connected from the feet) | returned the same numbers **and a component area of 50 000 px inside a 300×520 ROI** — a third of the ROI is "suit" | ⚠️ **leaks into dark water.** Its *top row* happened to agree with the hand at six frames in 7.5–11.0 and **disagreed with the hand by 20–40 px at 12.75–13.08**, where the hand says flat and it says a 50 px swing in 0.08 s |

> **So the only numbers in §0.2 are the ones from the window where the automatic track was checked against the hand and agreed — 7.5 → 11.0 s, six hand points, mean absolute error 5 px (2 %).** Outside that window the automatic track is **not quoted as a measurement anywhere in this document**, and the one place it contradicted the hand (12.75–13.08) is recorded in §0.3 as my own withdrawn finding.
>
> **The general lesson, which is the skill's and is now paid for a third time: a black wetsuit against dark water with bright spray defeats luminance and chroma segmentation alike.** Clip 15 found colour segmentation of a backlit rider returns garbage; this adds that **a silhouette mask can return the right answer for 3.5 s and the wrong answer for the next 2**, and only hand measurement tells you which you have.

### 2.3 — The staleness probe, run and passed; and the two-`<video>` trap, which fired

The skill's out-of-order probe was run before any measurement: ten seeks in the shuffled order **12.0, 3.0, 12.0, 7.5, 3.0, 16.0, 7.5, 16.0, 1.0, 12.0**, hashing a 64×114 decode of each and differencing all 45 pairs.

- **Six same-time pairs: identical, 6 of 6** — the decode is deterministic.
- **Thirty-nine distinct-time pairs: 0 of 39 identical.**

**Clip 13's two-element trap fired, but late:** on first load `document.querySelectorAll('video')` returned **1**; after the viewport was shrunk to 800×640 it returned **2**, the extra one with `videoWidth = 0`. **Every call selects by `videoWidth > 0`,** so nothing was read from the wrong element — but the count changes *during* a session, so a check made once at the start is not enough.

**The composited-canvas wait was set to 2.7 s inside the draw from the first render** (clip 15's figure) and **the failure did not recur in ~25 renders.** Every composite carries a stamp with a random token; every stamp matched its call.

---

## 3. The body channels

### 3.1 — Leg depth: **no rung named, eighth clip running** — and a seventh distinct cause

**(a) The leg chain, with clip 12's thigh/shin admissibility gate. Four frames attempted at 1.45×, four refusals, and in all four the gate could not even be computed.**

| frame | what the eye sees | why the chain is refused |
|---|---|---|
| **t = 11.500**, at **1.45×**, 25 px grid | the near leg as a long dark column from the hip to a bare foot on the deck | **No knee.** The wetsuit is uniform black and the water behind is dark green; there is no crease, no shading step and no silhouette kink that can be placed. **Thigh/shin not computable** |
| **t = 11.833**, at **1.45×** | the rear leg visibly bent, against lighter backwash | **The bend is visible; the joint is not.** The outline curves smoothly over ~40 px, and thigh and shin are each ~35 px wide. **Not computable** |
| **t = 8.500**, at **1.45×** | the best-lit frame in the clip, the rider facing the sun | **Both legs inside spray and foam below mid-thigh** |
| **t = 9.333**, at **1.45×** | the near leg lit, the foot unmistakable | **No knee; the far leg is entirely hidden behind the near one** |

> **This is a seventh distinct cause, and it is the first where the garment alone is sufficient to defeat the gate.** The previous six were projection saturation (V7–V9), a raised lens plus boardshorts (V10), resolution plus limb overlap (V11), thigh-at-the-lens from behind (V12), both ends foreshortened at once (V14), and knee-in-shorts plus ankle-in-spray (V15). **Here the rider is large, side-on, lit, and in a full wetsuit — and there is simply no joint in the image.** Eight clips, eight refusals.

**(b) Row 10, the split: NOT MEASURED, and I will not estimate it.** **Row 10 stays at V8's one clip, two frames** — the sixth clip running that could not touch it.

**(c) The backup rulers are not licensed either.** `hip-above-deck ÷ head length` needs a hip, and §2.1 says there is none. **Apparent stature in head-lengths is dead on a raised lens**, and §5.6 establishes the lens is raised. **So this clip names no rung for any frame.**

**(d) What *is* observable, and is reported instead**, is the **top of the head's height above the board's deck under the rider's feet**, hand-read on 1:1 gridded frames with the deck line read by eye in each tile. That is §3.2, and it is reported as a **height over the board**, never as a depth, never as a leg extension, and never in metres or rungs.

**(e) Qualitatively**, the knees are flexed for the whole ride and the legs visibly lengthen and shorten with the cycle. The straightest-legged moments are **9.167, 10.083, 11.0–11.5, 12.0–12.167**; the most compressed are **8.75, 9.667, 10.583, 11.833, 12.5, 13.5, 14.5–15.2**. **No rung is named for any of them, and no leg extension is given in any unit.**

### 3.2 — Body height over the board: the one number this clip can carry

Hand measurements, all on **1:1 renders** (`mag = 1.0`, 260×380 fixed-size source crops, 40 px source grid), reading the **top of the cap** and the **board's deck edge directly under the rider's front foot** in the same tile:

| t | head above deck (px) | automatic track at the same t | what the body is doing |
|---|---|---|---|
| **8.750** | **217** | 214 | lowest of its cycle, trunk deeply folded |
| **9.167** | **272** | 280 | highest, trunk least folded |
| **10.333** | **253** | 261 | descending |
| **10.583** | **205** | 210 | lowest of its cycle |
| **10.833** | **253** | 258 | rising |
| **11.000** | **280** | 282 | highest |
| **12.667** | **237** | — | §0.3 |
| **12.833** | **240** | — | §0.3 |
| **13.000** | **235** | — | §0.3 |

**Mean absolute difference between hand and automatic over the six validated frames: 5 px (2 %).**

⚠️ **The camera zooms at roughly 5 % per second**, so comparisons are only made **within a single half-cycle (≤0.5 s, ≤2.5 % of scale)**, and every ratio is computed inside one frame. **The 20–28 % excursion is 8–11× the zoom over the same interval**, which is why it survives.

⚠️ **This quantity is NOT leg depth.** It contains leg depth, trunk fold and neck pose at once. **The brief asked for them separate and only this one is measurable here.**

### 3.3 — Transitions: seven resolved, **zero opposite-sign, zero decoupled, one frozen**

Channel 1 is **head height above the board** (the validated track, §3.2). Channel 2 is **trunk fold**, by eye, **direction only** at the stated interval — never an angle (§2.1).

| window | length | samples | head above board | trunk fold | verdict |
|---|---|---|---|---|---|
| **7.917 → 8.750** | 0.83 s | 11 at 1/12 | **falls 255 → 214** | **folds further** | **same sign (down)** |
| **8.750 → 9.167** | 0.42 s | 6 at 1/12 | **rises 214 → 280** | **un-folds** | **same sign (up)** |
| **9.167 → 9.667** | 0.50 s | 7 at 1/12 | **falls 280 → 215** | **folds further** | **same sign (down)** |
| **9.667 → 10.083** | 0.42 s | 6 at 1/12 | **rises 215 → 273** | **un-folds** | **same sign (up)** |
| **10.083 → 10.583** | 0.50 s | 7 at 1/12, re-checked at **native 1/24** | **falls 273 → 210** | **folds further** | **same sign (down)** |
| **10.583 → 11.000** | 0.42 s | 6 at 1/12 | **rises 210 → 282** | **un-folds** | **same sign (up)** |
| **12.667 → 13.000** | 0.33 s | 3 at 1/6, **hand-measured at 1:1** | **flat, 237 / 240 / 235 ± 5** | **visibly unchanged** | **frozen — both channels** |

> **Seven resolved transitions: three same-sign up, three same-sign down, one frozen, ZERO decoupled, ZERO opposite-sign.** With the series' existing 36, that is **43 resolved transitions across six riders and six clips with no opposite-sign instance.**
>
> ⭐ **And the new result is the absence of the other thing.** Clip 15 counted decoupling for the first time and found **four instances in one ride**. This clip looked for it with the same definition and found **none in 14 s**. **Decoupling is therefore 4 of 4 in one clip and 0 of 7 in the next** — it is real, it is reproduced within one ride, and it is **not** a universal feature of riding. If rows 1–2 are given an acceptance test built on it, the test must be "the engine *can* decouple", not "riders always do".
>
> ⚠️ **The caution in §0.4 applies to this whole table.** Folding the trunk lowers the head by itself, so the six same-sign rows are only weak evidence. **The one row that carries information is the frozen one** — and a frozen pair is reachable in the engine today, so it moves nothing.

### 3.4 — Pump: §0.2 is the result, and this is the first clip that can publish one

**0.92 s per full cycle, 0.50 s down and 0.42 s up, six half-cycles in 3.04 s, one rider, one shot, one window (7.5 → 11.0 s), with the extremes individually located and one re-checked at the native grid.**

**It is not a within-window division.** The four independent full-period intervals are 0.92, 0.92, 0.92 and 0.92 s.

⚠️ **The board's roll and heading beside it, which is the thing the brief demands:** across the same window the board's **nose points left in every frame checked at 0.25 s and its bottom is never visible**, and its **in-image long-axis angle oscillates between about −16° and +19° with the same ~0.9 s period** — pitching up on the climb and down on the drop. **No heading reversal; no rail roll toward the camera.**

⚠️ **And the thing I will not say:** which channel drives it. **No leg extension in any unit, no trunk angle, no rung** (§2.1, §3.1).

### 3.5 — Arm carriage: three carriages, no overhead arm in fourteen seconds

Only windows sampled at **≤0.25 s** are counted, and the interval is given for each.

| carriage | verified windows (interval) | count |
|---|---|---|
| **A — both hands low and forward over the deck**, inside or just outside the rails | 9.33–9.50 (1/6), 11.33–11.50 (1/6), 12.00–12.50 (1/6), 12.67–13.17 (1/6), 13.33–13.83 (1/6), 14.33–15.17 (1/6), 15.25–16.00 (0.25) | **7 windows — the clip's dominant carriage, ~4.5 s of readable riding** |
| **B — lead arm extended forward-and-down past the rail or nose**, rear arm back and low | 8.00–8.50 (1/6), 10.00–10.25 (1/12), 10.33–10.83 (1/12) | 3 |
| **C — both arms spread wide, roughly level, at waist-to-chest height** | 7.50–7.75 (0.25), 11.00–11.25 (1/12) | 2 |
| **D — a hand above the crown** | ⛔ **never. Zero frames in 14.0 s** | **0** |

**Carriage A reproduces `engine-target` row 15 on a NINTH clip** (V7 4 windows, V8 5, V9 6, V11 4, V12 ≥8, V13 6, V14 6, V15 6, here **7 verified at ≤0.25 s**). The hands are over the **deck**, usually both at once.

⭐ **On row 4, this clip gives the cleanest form the series has had.** Carriage A is held, unchanged, across **12.00 → 13.17 (1.17 s, 8 samples at 1/6 s)** and across **14.33 → 15.17 (0.83 s, 6 samples)** — and **12.00 → 13.17 contains a complete head-height excursion.** Carriages A and B each occur at both a visibly high body and a visibly low one. **So: the arms hold one position through the depth channel's full travel, twice.** That is "carriage is its own channel" without needing a single number.

⚠️ **On "tall ⇒ arms spread", this clip is neutral.** Its highest frames (9.167, 10.083, 11.0) carry carriages B, B and C; its lowest (8.75, 9.667, 10.583) carry A, A and B. **No relationship either way. It neither adds to nor subtracts from the seven clips that refuted the implication.**

### 3.6 — Arm timing: ⛔ not available (§0.5)

---

## 4. The fore-aft axis, the feet, and the head

### 4.1 Hips aft, shoulders forward — 5 frames, and the forward head reproduced for a fifth clip

On every 1:1 frame where the board's nose direction was identifiable **and the buttock curve could be placed in silhouette** — **8.750, 9.167, 10.583, 12.667, 13.000** — the **shoulders sit forward of the hips toward the nose**. **5 frames**, reproducing V1, V7, V8, V9, V10, V11, V12, V13, V14 and V15. **Direction and sign only; no magnitude**, as in every previous clip. ⚠️ The hip here is the **buttock silhouette**, not a trochanter and not a waistband, so this is weaker than clip 15's.

**The head-forward finding reproduces for a fifth clip.** At **10.583, 12.667 and 13.500** the head sits well forward of the shoulder line, out over the front foot, the neck near-horizontal and the chin leading the chest. **No magnitude is given.**

**And a fourth axis the clip shows plainly without a number: the rider works fore-and-aft by folding and un-folding over stationary feet.** Across all 45 heading-check frames **no step was seen** (§4.2), while the head travels 20–28 % of its height over the board six times.

### 4.2 Feet: ⚠️ measurable here, and this is the first clip since V7 where it is — but only weakly

**The deck is bright plain orange and both feet are bare and light against it.** That is the landmark clip 14 and clip 15 both lacked.

Measured at **1.72×** on frames chosen for minimum foreshortening (the board near broadside):

| t | front foot, as a fraction of the visible board length from the nose |
|---|---|
| **10.500** | **0.62 ± 0.06** |
| **13.250** | **0.63 ± 0.06** |

**Two frames, 2.75 s apart, agreeing within the reading error. No step detected.** ⚠️ **The error is dominated by the TAIL, not the foot**: the tail is inside the rider's own spray in both frames, so the board's full length is an extrapolation. **This is "no step seen on two frames", not V7's five-frame count, and it should be quoted as the weaker thing.**

> Note the absolute figure differs from V7's **44–49 %**. This is a **mid-length board** (the clip's own title) and the rider stands relatively further back on it. **The two numbers are about different boards and must not be averaged.**

### 4.3 Head and gaze — ⛔ refused, with a new cause

Rendered at **4.2×** on a 10 px source grid at **t = 11.333**, the frame with the largest head that is turned toward the lens:

- The head is **≈ 40 ± 8 px** (cap top to chin).
- The rider wears a **light grey cap with a brim**, and **his face sits inside the brim's shadow** in every frame where he is turned toward the camera. At 4.2× the head is a light cap over an undifferentiated dark mass. **No brow, no nose, no chin, no eye.**
- The cap's own outline is trackable as a **position**, which is what §3.2 uses, but its **brim direction is not resolvable** at 40 px.

> **So: no yaw, and `engine-target` row 18 should not be given one.** **The new cause is a hat.** Clip 13 had the face and not the nose; clip 14 had the nose and not the head; clip 15 had the nose and a 90 px head and lost it to backlighting; **this clip loses it to a cap brim.** **The footage ask gains one clause: the board's nose legible AND a head ≥60 px AND the face lit AND the rider bare-headed or in a hood, not a brimmed cap.**

**What can be said without a yaw:** in every readable frame from **11.3 to 16.0** the head is held **low and pitched down toward the water ahead of the board's nose**, not up and not across the heading. **That is a direction, on one rider, and it is not a measurement.**

### 4.4 Whitewater — ⛔ no timable contact

From about **14.0 s** the rider runs along a crumbling section with foam and backwash continuously around the board; at **16.0–16.9** he is inside it. **There is no moment of first contact to time a brace against**, so row 16 gets nothing from this clip. What is recorded, because it is a frozen-pair observation and they are rare: **14.33 → 15.17, 0.83 s, 6 samples at 1/6 s, the body held low and the trunk held folded, inside foam, and the rider still standing.** He rides out of it still standing for a further **~1.8 s** to the end of the ride.

---

## 5. The source, and what the numbers are worth

### 5.1 Delivery

`#movie_player` does not exist on a Short; the player is `#shorts-player`. `getAvailableQualityLevels()` returns **`["hd1080","hd720","large","medium","small","tiny","auto"]`** — **1080p is this clip's hard ceiling**, with no `hd1440` or `hd2160` to try. `hd1080` was pinned with `setPlaybackQualityRange` and confirmed with `getPlaybackQuality()`; `videoWidth/videoHeight` = **1080×1920**, a conventional 9:16. **Seventh clip, seventh set of delivery facts** (V11 1080, V12 a fictitious 2160, V13 a real 1440 with a frozen 2160, V14 a flat 1080 at 9:16, V15 a flat 1080 at **3:4**, here a flat 1080 at 9:16).

### 5.2 Pane geometry — clips 12–15's result reproduced a fifth time

At a **1280×1000** viewport the screenshot came back **800×625**, canvas→screenshot scale **0.625**. **At 800×640 the screenshot is 800×640 and the scale is exactly 1.0.** Measured in a fifth independent session. Stream quality was taken at the large viewport (enlarge **and reload**) and every measurement frame at the small one. **The 2.7 s wait inside the draw was used from the first render and the composited-canvas failure did not occur in ~25 renders.**

### 5.3 The frame grid: ⭐ **24 fps — a fourth rate for the series, and 25 fps would have been wrong**

Seeking on a **0.005 s** grid and hashing the decoded frame:

- **8.000 → 8.210:** the picture changes at **8.020, 8.065, 8.105, 8.145, 8.190** — intervals 0.045 / 0.040 / 0.040 / 0.045.
- **15.000 → 15.210:** changes at **15.035, 15.080, 15.120, 15.160, 15.205** — the same pattern.
- **10.000 → 10.420, the decisive one:** changes at **10.025, 10.065, 10.110, 10.150, 10.195, 10.235, 10.275, 10.320, 10.360, 10.400** — **nine intervals spanning 0.375 s, mean 0.04167 s = exactly 1/24.**

Cross-check by duplicate counting over a moving span from t = 5.0: stepping at **1/24** gave **0 duplicates in 9 steps**, at **1/25** also **0**, and at **1/30** **2 duplicates in 9 steps**. The 1/24-vs-1/25 tie is broken by the span measurement above: 9 intervals at 1/25 would span 0.360 s, at 1/24 0.375 s. **Measured: 0.375 s.**

**24 fps. Native frame = 0.041667 s.**

> ⚠️ **Four frame rates in sixteen clips — 60, 30, 25 and now 24 — and the 24-vs-25 distinction needed a nine-frame span to settle, because a four-frame sample cannot.** On a clip whose headline is a 0.92 s period, a 4 % rate error is 0.04 s, which is less than the sampling error; but **had I assumed 30 fps I would have sampled duplicates and read them as a motionless rider**, which on this clip would have destroyed the cadence outright.

### 5.4 Slow motion: excluded on blur and plausibility; no measured-gravity check was possible

1. **Motion blur.** The rider's hands at 10.0 and 13.0 and the spray sheets at 13.6–14.2 are **visibly blurred**, consistent with a normal shutter at 24p and inconsistent with a high-rate capture played slow.
2. **Plausibility.** A **0.92 s** climb-and-drop cycle is an ordinary pump rate. At 2× slow it would be 0.46 s per full cycle, which no body does; the paddling stroke rate at 1.0–2.0 s is likewise ordinary.

**What I could not do:** the board never leaves the water, so **no ballistic and no rotation-rate check was possible**. **Verdict: at or near real time, on blur and plausibility only** — weaker than clip 15's, which had manoeuvre durations to compare against published figures. **This clip has no manoeuvre, so it has no duration check.**

### 5.5 Shot structure: **one continuous shot, no cut, 0 → 18.3 s at least**

The top-third luminance detector (32×16 grid over the frame's upper third, mean absolute difference at 0.1 s, **239 samples over the whole 24.0 s**) gives:

- **0.1–0.9 through the wide opening (0.15 → 4.0)**;
- rising **smoothly** to 1.5–5 (6–9 s), 3–8 (9–13 s) and **10–25 (14–24 s)** as the lens zooms in and the frame fills with moving water. **There is no step anywhere.**
- **One nominee: t = 2.417 at 2.84 against a local level of 0.1–0.7.** Probed at the **native 1/24 s grid** it is a **ramp, not a step** — 0.24, 0.54, 0.69, **2.84**, 1.09, 0.27, 0.14 — and full frames at **2.375, 2.417, 2.458, 2.500** show the **same beach, the same rocks in the foreground, the same horizon and the same rider**. It is the rider's own take-off spray crossing the upper third. **Not a cut.**

Independently, **full frames were inspected at 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0 and then at 0.25 s from 7.5 to 16.0, and at 16.0–18.3**: one beach, one lens drift, one zoom, continuous.

> **So: one shot. 0.0–2.5 the rider is prone and paddling; ~2.4–2.6 he pops up inside his own spray; 3.0–~17.0 he rides standing; ~17.2 he drops to prone and the ride ends.** **One rider throughout: black one-piece wetsuit with a light chest panel, light grey brimmed cap, bare feet, orange mid-length board.**
>
> ⚠️ **AND THE SUBJECT CHANGES WITHOUT A CUT.** From **~17.5 the camera follows a DIFFERENT surfer** — a second rider on a pinker board who drops in at the top right of the frame at 17.3 and rides the whitewater through 18.3 — **inside the same continuous shot.** **Nothing after 17.3 is read, used or counted anywhere in this document.** The lineup also contains at least two other people, one of whom passes close at **11.8–12.1** and one of whom is **the head in the water that contaminated my shoulder detector at 11.083** (§2.2).

**Direction-change rate (row 8): ZERO in 14.0 s of standing riding, verified on 45 frames.**

### 5.6 What the error bar is

- **Source 1080×1920** — this clip's ceiling. **Head above the board 205–282 px; head ≈ 40 px; board extent 240–330 px.**
- **The camera zooms continuously at ~5 %/s**, so **no apparent size is compared across more than 0.5 s**, and every ratio is computed **inside a single frame**.
- ⚠️ **No trunk angle is published at all** (§2.1), and therefore no trunk rate and no trunk span.
- ⚠️ **No leg depth, no rung, no leg split** (§3.1). Four frames attempted at 1.45×, four refusals.
- ⚠️ **Three of four automated rulers were built, tested and discarded** (§2.2), and **nothing from them is quoted**. The fourth (the orange board) is kept and was checked on every rendered frame.
- ⚠️ **No angle or posture claim anywhere comes from a survey strip.** Strips at 0.09–0.70× were used **only to find moments**; every measured height was re-read at **exactly 1.00×** with a 40 px source grid, and the head, torso, legs and feet were re-read at **1.45×, 1.72×, 1.75× and 4.2×**. **§0.3 records the one time I let a 0.70× strip stand as a finding and the 1:1 re-read that killed it.**
- **Rider-centred crops were FIXED-SIZE** (220–480 source px at a fixed magnification per sheet, anchored on the board's own centroid), so the skill's auto-crop size trap could not fire.
- **The lens height is KNOWN and it is raised.** The sea horizon is a clean line in the upper third of every full frame, and the rider's head is **below it** in every frame checked (1.0–4.0, 4.5–8.0, 11.0, 13.0, 16.0–18.3). **This is a beach shot from above the rider's head height, so head-length rulers are not licensed.**

---

## 6. Part C — what I could not see, and why

- **Any facial feature.** The head is ≈40 px and the face is **inside the shadow of a cap brim**; checked at 4.2×.
- **Any trunk angle**, and therefore any trunk rate or span (§2.1) — **because a one-piece wetsuit has no edge at the pelvis.**
- **Any knee as a joint**, in four frames attempted at 1.45×. Therefore **no leg chain, no leg split and no depth rung.**
- **Which channel — legs or trunk — produces the 0.92 s cycle.** This is the clip's biggest hole and it follows directly from the wetsuit.
- **Any turn, any arm lead, any manoeuvre beat, any whitewater-contact moment** — the clip contains none of them.
- **The board's tail** in the foot-position frames; it is inside the rider's spray, which is what the ±6 % is.
- **Frontside versus backside, and regular versus goofy.** ⚠️ I also cannot exclude that the clip has been horizontally mirrored, which is common in short-form reposts and would invert any handedness claim. **I am reporting neither.**
- **Anything after t = 17.3**, where the camera moves to a different surfer inside the same shot.
- **Anything above 1080p.** The clip publishes nothing higher.

---

## 7. What this round did not do

- **No file under `src/` or `server/` was touched.** This is evidence, not a fix.
- **Nothing was built, ridden, benchmarked or measured in the game.** Every game-side statement is quoted from `3.5/engine-target.md` or `3.5/body-channels.md`.
- **No constant is proposed, and no stance rung is named for any frame.**
- **No trunk angle is published**, and no trunk span.
- **No leg extension is given in any unit**, as the brief required, because the knee is not identifiable as a joint.
- **No comparison is made between anything here and the game's own pump depth in metres or in rungs.** The series has **no calibrated depth reference from any footage** — the leg chain has now been refused on eight consecutive clips.
- **`engine-target.md` was not edited**, and the fifteen earlier video documents were not edited.
- **Three automated rulers were built and discarded, and nothing from them is quoted.**
- **No conclusion is drawn about the wave, the lip, the foam or the spray.** One line, because it is the context every number sits in: the wave is a long, waist-to-chest-high, slow-peeling sand-bottom wall with no barrel and no steep lip — **which is why a mid-length board on a pure trim line is the right tool for it, and why there is nothing in the clip to turn off.**

---

## 8. Part B — the mapping

Game-side entries are **code readings quoted from `3.5/engine-target.md` and `3.5/body-channels.md`**. **Nothing was built, ridden or benchmarked.**

| what the rider does | the game's name for it | have it / partly / not at all |
|---|---|---|
| **Rides 14.0 s on one heading with no direction change at all, nose left in 45 of 45 frames, board's bottom never shown** | `trim` | ⭐ **PARTLY, and this is the one row where the game is close.** The engine can hold a heading. What it cannot do is the thing the rider does *while* holding it — the cycle below |
| **A 0.92 s climb-and-drop cycle repeated six times, the head's height over the board moving 20–28 %, asymmetric: 0.50 s down and 0.42 s up** | `pump` | **partly.** The game's pump *is* leg depth, so a cycle exists — but it is **symmetric by construction** (one spring, one rest length, one return time constant `KNEE_RETURN_TIME` 0.6 s against `MOTOR_LAG` 0.05 s). **A rise that is consistently faster than the sink is not expressible**, and the footage's rise is the faster half in 3 of 3 |
| **The board pitching −16° to +19° in the image with the same 0.9 s period, with no heading change** | — | **not at all as a distinct quantity.** The game has board pitch, but nothing ties it to a body cycle, and `rideAnalysis` would have no name for what the rider is doing |
| **Seven transitions, zero opposite-sign, zero decoupled, one frozen** | — | **n/a — and it is a constraint rather than a target.** It says decoupling is not universal, so rows 1–2's acceptance test should be "can decouple", not "must" |
| **Both hands low and forward over the deck in 7 windows, ~4.5 s of riding; carriage A held unchanged across a 1.17 s window that contains a full depth excursion** | `hand` input | **not at all.** One hand, on/off, pointed at the water, side chosen by the game (`AttachedRider.ts:5720–5732`) |
| **Three carriages, two of them occurring at both a high and a low body** | — | **not at all.** One pose per stage × depth; `HumanBalance.arms` is one scalar, capped by `stanceRoom(depth).arms` |
| **ZERO overhead arms in 14.0 s** | entry to `top turn` / `carve` | **n/a — and it is the condition on row 5.** A rider who does not turn never raises a hand. **Any built arm lead must be conditional on a direction change** |
| **A trunk folded through the whole ride, deepest at every cycle low, with no measurable angle** | — | **not at all.** `hip.angle` exists on `?rider=new`, is paired and booked, and is read in three places that never touch `this.parts` (row 1) |
| **Head and shoulders forward of the hips over stationary feet, 5 frames** | `trim` weight (W/S) | **not at all** as a differential. `TRIM_SHIFT = 0.25 m` moves pelvis, torso, head and both arms **together** (`AttachedRider.ts:5514–5518`) |
| **The head thrust forward of the shoulders, out over the front foot** | — | **not at all**, fifth clip |
| **Head held low and pitched down ahead of the nose in every readable frame** | — | **not at all.** Row 18, still with no yaw |
| **The front foot at 0.62–0.63 of board length from the nose, unmoved over 2.75 s** | — | ✅ **already correct** (row 17): feet fixed by construction. **Weak evidence — 2 frames, ±6 %** |
| **The whole take-off, prone paddling → pop-up → standing, in one unbroken shot** | `drop-in` / pop-up | **partly.** A pop-up exists; nothing in this document measures it, and the rider is 60–100 px through the paddle |
| **Riding through continuous foam for ~2 s, body low and trunk folded and both held, still standing** | — | **not at all** as a posture; row 16. The foam does reach the board (3.5e, five channels); **no brace posture exists** — and this clip cannot time a contact anyway |

---

## 9. Rows this clip moves, and how

| row | the measurement | the population | which way it moves |
|---|---|---|---|
| **8** | ⭐ **ZERO direction changes in 14.0 s of continuous standing riding.** The board's nose points left in **45 of 45 frames** checked by eye on full or near-full frames at ≤0.5 s throughout and at 0.25 s from 7.5 to 16.0, and **the board's bottom is never visible in any of them** | 45 frames, 1 rider, 1 unbroken shot | ⭐ **Row 8's "zero" end is now LONGER than V7's, and it is on a second clip.** Was 0 in 13 s (V7) against ≥13 in 30 s (V9) and ≥10 in 18.56 s (V15). **Now 0 in 14.0 s.** The range the engine must cover is confirmed, not narrowed, and **this is the strongest single trim observation the series has** |
| **6** | ⭐ **A pump cadence: full period 0.92 s, measured four independent ways (two max→max, two min→min), half-cycles 0.50 s down ×2 and 0.42 s up ×3, head-above-board excursion 20–28 %.** Window **7.5 → 11.0 s**; extremes individually located at 1/12 s and one re-checked at the native 1/24 s grid, which put it within 0.06 s | 6 half-cycles in 3.04 s, 1 rider, 1 shot, 1 window; track validated against 6 hand measurements at 1:1 | ⚠️ **The period DISAGREES with row 6's target and is the third clip to bear on it.** Row 6 asks **0.55–0.60 s**; this is **0.42–0.50 s, mean 0.46 s**, 15–25 % faster. ⛔ **And the channel cannot be assigned**: no hip landmark, so "the trunk does it and the legs do not" is neither confirmed nor refuted. ⭐ **What is NEW is the asymmetry — the rise is faster than the sink, 3 of 3 — which no clip has recorded and which the engine's single spring cannot produce** |
| **3** | ⭐ **Seven resolved transitions with both observables legible: 3 same-sign up, 3 same-sign down, 1 frozen, ZERO decoupled, ZERO opposite-sign** | 7 windows, 0.33–0.83 s, 3–11 samples each, 1 rider | **The no-opposite-sign count goes 36 → 43 across six clips.** ⭐ **But the real result is the zero in the OTHER column: clip 15's four decoupled windows are NOT reproduced here, in 14 s of trim, on the one clip in the series with nothing but trim to look at.** Decoupling stands at 4 of 4 in clip 15 and 0 of 7 here. ⚠️ **And a method correction the row needs: "body height over the board" and "trunk fold" are not independent — folding lowers the head — so same-sign transitions are nearly free and should stop being counted as evidence** |
| **4** | ⭐ **Carriage A held visibly unchanged across 12.00 → 13.17 (1.17 s, 8 samples at 1/6 s), a window that contains a complete head-height excursion**; and again across 14.33 → 15.17 (0.83 s, 6 samples). Three carriages in all; A and B each occur at both a visibly high and a visibly low body | 3 carriages, 12 windows, 1 rider | **Row 4's "carriage is its own channel" gets its longest hold yet — 1.17 s of unchanged arms through a full depth cycle**, against clip 15's 0.56 s. ⚠️ **Neutral on "tall ⇒ arms spread"**: the clip's highest frames carry two different carriages and its lowest carry two different carriages |
| **15** | **Both hands low and forward over the deck in 7 windows**, each verified at **≤0.25 s**, ~4.5 s of readable riding | 7 windows, intervals stated per window | **Ninth clip for row 15.** V7 4, V8 5, V9 6, V11 4, V12 ≥8, V13 6, V14 6, V15 6, here 7 |
| **9** | **Shoulders forward of the hips toward the nose in 5 frames** at 1:1; **the head thrust forward of the shoulders over the front foot in 3 frames** | 5 frames (shoulders), 3 (head) | **Eleventh clip for the hips-aft/shoulders-forward pattern; fifth for the head-forward finding.** ⚠️ **Weaker than clip 15's**: the "hip" here is a buttock silhouette, not a waistband. **Direction and sign only; no magnitude** |
| **17** | **Front foot at 0.62 ± 0.06 and 0.63 ± 0.06 of board length from the nose, at t = 10.5 and 13.25 — 2.75 s apart, agreeing inside the error. No step seen in 45 heading-check frames** | 2 measured frames, 1 rider; 45 frames of "none seen" | **First clip since V7 where the feet are measurable at all** — a plain orange deck and bare feet. ⚠️ **But the tail is in spray, so the denominator is extrapolated and the error is ±6 %.** Quote it as the weaker of the two counts. **The absolute fraction differs from V7's 44–49 % because this is a mid-length board; the two must not be averaged** |
| **5** | ⛔ **CANNOT BE TOUCHED — zero direction changes, so nothing to lead.** And a count beside it: **zero overhead arms in 14.0 s, sampled at ≤0.25 s throughout** | 14.0 s, 1 rider | **Tally unchanged at 16 of 28 across seven clips.** ⭐ **The new thing is the refusal's cause: every earlier miss was a turn without an overhead arm; this is a clip without a turn.** It is a constraint on the built behaviour — **the lead must be conditional on a direction change, not on riding** |
| **2** | ⚠️ **The trunk gate could not be RUN, second clip running, and a new cause: a ONE-PIECE WETSUIT with garment edges only at the chest and forearms** | whole clip, 1 rider | ⚠️ **Clip 15's rule — the gate needs a garment edge that tracks the pelvis — survives and gains its sharpest instance.** A wetsuit removes the hip landmark **and** the knee in one garment. **The footage ask gains a clause: boardshorts and a short top, not a steamer.** The series still has **no gated measurement of trunk angular travel across sixteen clips** |
| **14** | ⛔ **No rung named, eighth clip running.** Four frames attempted at 1.45× with the rider 250–330 px; **the knee is not identifiable as a joint in any.** And **the lens sits above the rider in every frame** | 4 frames, 1 rider | **A seventh distinct cause, and the first where the garment alone is sufficient.** Previous: projection saturation (V7–V9), raised lens + boardshorts (V10), resolution + limb overlap (V11), thigh-at-lens (V12), both ends foreshortened (V14), knee-in-shorts + ankle-in-spray (V15) |
| **10** | ⛔ **NOT MEASURED.** The thigh/shin admissibility ratio could not be **computed** on any frame | 4 frames attempted | **No change. Row 10 stays at V8's one clip, two frames** — sixth clip running that could not touch it |
| **11** | ⛔ **REFUSED.** With no hip and no knee, "legs" and "trunk" are not two measurable channels in this clip | — | **Unchanged.** Three forms, each still SINGLE except V9's "legs only", which clip 15 reproduced twice |
| **12** | ⚠️ **No rung, so no band — but one thing can be said without one: the head's height over the board never rests at its minimum.** The longest flat bottom in the validated track is **≤0.17 s** | 3 minima, 1 window | **Weakly on the "dip" side**, and only as a shape: the lows here are turning points of a 0.92 s cycle, not plateaux. **Not comparable to V5's held lows, which were measured at a rung** |
| **16** | ⛔ **Contact cannot be timed** — the rider runs through continuous foam from ~14.0 rather than meeting it at a moment. Recorded anyway: **14.33 → 15.17, 0.83 s, 6 samples, body low and trunk folded and both visibly unchanged, inside foam, still standing** | 1 window | **No third instance of the anticipatory brace.** Clip 15's two-clip finding is neither added to nor contradicted |
| **18** | ⛔ **No yaw, and a new cause: a brimmed cap.** The head is **≈40 px** and the face is inside the brim's shadow at 4.2× on a 10 px grid | 1 frame measured, ~20 observed | ⛔ **The footage ask gains a clause: a lit face AND a bare head.** Clip 13 had the face and not the nose; clip 14 the nose and not the head; clip 15 a 90 px head lost to backlight; **here a 40 px head lost to a hat** |

**Method results that belong in the skill, not in a row:** §5.3's finding that **24 fps is a fourth rate and that 24-vs-25 needs a nine-frame span to settle, because a four-frame sample cannot**; §2.1's finding that **a one-piece wetsuit defeats the trunk gate and the leg chain in the same garment**; §2.2's record that **three of four automated body rulers failed, that a silhouette tracker can be right for 3.5 s and wrong for the next 2, and that a board-taper nose detector was refuted by eye on its own frames**; §0.3's instance that **a 0.70× strip reported a 2 % height change as a visible rise and the 1:1 re-read killed it — strips lie about heights, not only about angles**; §5.5's record that **the SUBJECT can change without a cut**, so a cut detector returning "one shot" does not license reading the whole shot as one rider; and §2.3's note that **the number of `<video>` elements changed from 1 to 2 when the viewport was resized**, so the `videoWidth > 0` check must be in every call, not made once.
