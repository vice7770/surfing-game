# Video reference 15 (Mikey February, SHORTYHEAD): one 18.6-second ride with ten turns, the first reproduction of a down-transition form, and four transitions where one channel moves and the other does not

Source: **https://www.youtube.com/shorts/3yxY-F_AEds**, title *"Mikey February as seen in SHORTYHEAD"*. Length **22.661 s**, read in full. The **fifteenth** reference the owner has sent.

Delivered to the browser pane at **1080×1440** — note the aspect: this Short's stream is **3:4, not 9:16**, the first in the series that is not a phone-shaped frame. `getAvailableQualityLevels()` returns `["hd1080","hd720","large","medium","small","auto"]`, so **`hd1080` is this clip's published ceiling** with nothing above it; it was pinned with `setPlaybackQualityRange` and confirmed with `getPlaybackQuality()`. Stream is **25 fps, measured twice and cross-checked** (§5.3), `playbackRate` 1. `yt-dlp` and `ffmpeg` are both absent from this machine (checked, as the skill asks), so nothing was downloaded; every frame is a screenshot of the browser pane, **tab `tab-1`**, claimed with `tabs_create` and passed explicitly on every call. The pane was **shown**, not hidden, for every measurement.

**Every figure below is an estimate from pixels**, and each carries its own error bar.

---

## 0. The answer first

### 0.1 — What this rider's movement actually is

**After a 4.08-second opening shot, this is one continuous 18.56-second ride in which the rider changes direction at least ten times — about one turn every 1.9 seconds, the fastest sustained rate in the series — and spends almost all of the time in between with his trunk folded 50–70° and both hands low over the deck.** The clip's own sentence is that the trunk fold is the rider's *resting* posture, not an event: it is held through trim, through foam, through the climb, and it releases only at the two or three moments when he stands up to project off the top.

| window | status | what the body does |
|---|---|---|
| **0.00–4.08** | **shot A** | a separate ride: a bottom turn at ~0.7, then riding the broken lip down from ~0.9 to ~1.3 **deeply compressed with both arms drawn in low**, then foam, then recovery and trim |
| **4.08–4.10** | **the clip's only cut** (§5.5) | |
| **4.10–5.1** | readable, rider small | take-off and first drive |
| **5.2** | readable | a big top turn, spray over the top third of the frame |
| **5.8–6.3** | readable at native 0.04 | descending through the foam, body folded, a paddler in the foreground throughout |
| **6.3–7.6** | readable, rider ~230 px | trim and climb; **both hands low over the deck** |
| **8.24–8.52** | readable, native 0.04 | **a hand above the crown from ≤8.24; the board's heading reverses at 8.44 ± 0.04. Lead ≥ +0.20 s**, held ≥0.28 s |
| **9.5–10.1** | readable | descent and bottom turn |
| **10.16–10.72** | **the clip's best trim passage** (§0.4) | **0.56 s of flat-board trim, no roll, no heading change**; both hands low over the deck throughout |
| **10.7–11.1** | readable | climb, body deeply folded, arms past the nose |
| **11.60–11.76** | readable, native 0.04 | **top turn at the lip; arms spread wide at shoulder-to-head height, NOT clearly above the crown — recorded as borderline.** Heading reverses 11.70 ± 0.04 |
| **11.9–12.4** | readable, native | the descent from the re-entry inside a large spray plume |
| **12.88–13.20** | readable, native-adjacent 0.08 | **a second flat-board trim stretch, 0.32 s** |
| **13.3–13.7** | readable | bottom turn; the board rolls onto its rail (the bottom of the board becomes visible) |
| **14.10–14.90** | readable, 0.10 | **climb with a hand above the crown from ≤14.36; heading reverses ~14.90. Lead ≥ +0.50 s — the longest in the series** |
| **15.0–16.1** | readable | descent, trim, re-entry at ~16.05 |
| **16.32–17.28** | readable, 0.08, rider ~300 px | **a 0.96 s rise from deeply folded and bent to upright and extended** — both channels together |
| **17.44–18.00** | readable | **a floater**: the board comes up over the breaking section, the "VANS" bottom of the board fully exposed |
| **18.00–18.32** | readable, native 0.04 | **the landing into whitewater, met with the body already folded and compressed** (§0.5) |
| **18.4–19.5** | readable, **rider ~430 px, head ~90 px — the sharpest body in the series** | riding out of the foam, driving; both hands low over the deck |
| **19.40–19.84** | readable, native | **bottom turn, both hands low over the deck throughout — no overhead arm.** Heading reverses ~19.72 |
| **20.20–20.64** | readable, native | **top turn / re-entry. Rear hand above the crown at 20.28 ± 0.02; heading reverses at 20.38 ± 0.02. Lead = +0.10 s ± 0.04**, held ≥0.20 s |
| **20.80–21.40** | readable, native | **a carve in the whitewater, lead arm extended forward past the nose, no overhead arm** |
| **21.76–22.64** | readable, 0.08 | trim in foam to the end; **trunk folded 60–70° and visibly unchanged for 0.88 s** |

### 0.2 — The rider's size in source pixels, stated before anything was spent

| | |
|---|---|
| **Head length** (hair-top to chin, hand-measured at 4.4× on the clip's largest frame, t = 19.000) | **90 ± 6 px** |
| **Head length elsewhere** | 37–40 px (10.2–10.6), 40–48 px (12.9–13.5), 60–72 px (16.3–17.3) |
| **Head-to-foot extent in frame** | **≈190 px (10.3) to ≈430 px (19.0)** — the camera zooms and pans continuously |
| **Camera** | **from the beach, side-on to oblique, and the LENS SITS ABOVE THE RIDER** — the sea horizon is above his head in every full frame checked (§5.6) |
| **Comparison** | **the largest rider of the last five clips.** Clip 14's head was 20–31 px; clip 13's 73–102 px; this clip's best frame is **90 px and the facial profile is legible in silhouette** |

> ⚠️ **The lens height is the fact that decides row 14.** The rider is *below* the horizon in every frame, so this is a raised lens, and the skill's own rule says head-length rulers are **not licensed** on one. **No depth rung is named anywhere in this document.**

### 0.3 — ⚠️ One of my own readings, corrected before publication

**"6.20–6.95 shows the rider's board with his body cut off."** **False.** Those six tiles were centred by my redness finder on **a paddler in the foreground**, not on the rider — the rider was at the top of each tile, mostly out of crop. Re-run on full frames at **5.80, 5.84 … 6.24 at the native 0.04 s grid**, the rider is plainly visible and riding in all twelve.

> **The rule this re-confirms, for the third clip running: a tracker's failure is not the subject's absence, and a tracker's lock is not proof of the subject's presence.** Clip 13 had three of twelve tiles on the wrong person; clip 14 withdrew five "obscured" windows; **here six tiles were centred on a different human being in the same frame.** **Check the subject of every tile.**

### 0.4 — ⭐ The headline: this clip has only ~0.5 s of genuine trim, and in it the LEGS move while the TRUNK does not

**The coordinator's correction was the right instruction and it changed the answer.** I did not look for a 0.22 s cadence. I first asked which stretches of this clip are **genuinely trim — flat board, no roll onto a rail, no heading reversal** — and only then looked at the channels.

**Finding the trim first eliminated almost the whole clip.** The rider turns about every 1.9 s, and in most of the "trimming-looking" passages the board is **rolled onto a rail** (its bottom, not its deck, faces the camera) or its nose is swinging. **Three stretches survive**, and all three are short:

| stretch | length | how the board was checked | verdict |
|---|---|---|---|
| **10.16 → 10.72** | **0.56 s** | full frames at **0.10 s** (10.20, 10.30 … 10.70): the board's **dark deck faces the camera throughout — no rail roll** — and its nose holds a steady shallow down-the-line angle. No heading reversal | **genuine trim.** The clip's longest |
| **12.88 → 13.20** | 0.32 s | full frames at **0.16 s** (12.88, 13.04, 13.20): deck up, nose steady left-down. At 13.36 the board's **bottom** becomes visible — the bottom turn starts there, and that is where this stretch ends | **genuine trim** |
| **16.80 → 17.12** | 0.32 s | full frames (16.80, 17.04) plus a 0.08 s crop sheet: deck up, nose steady. At 17.28 the nose lifts | **genuine trim** |

**In the longest stretch (10.16 → 10.72, 6 frames at 0.08 s, rendered at fixed 260 px source crops at magnification 1.00 — exactly 1:1):**

| | 10.16 | 10.24 | 10.32 | 10.40 | 10.48 | 10.56 |
|---|---|---|---|---|---|---|
| **body height over the board** | low | rising | **highest** | falling | low | **lowest** |
| **trunk fold from vertical** | folded | folded | folded | folded | folded | folded |
| **arm carriage** | both hands low over the deck | — | unchanged | — | unchanged | unchanged |

- **The body's height over the board rises and then falls once**, extreme at **10.32**, low at **10.56** — **one half-cycle up in ~0.16 s and one down in ~0.24 s.** Head length across the three compared frames was **40, 40 and 37 px**, so the apparent scale is constant to within 8 % and the change is not a zoom.
- **The trunk stays folded in a 55–65° band across the same six frames and completes no cycle.** (The band is a by-eye band, not a gated angle — §2.1.)
- **The arm carriage does not change at all** across the whole stretch.

**The same pattern repeats in 12.88 → 13.20** (extreme at 13.04, low at 13.20) — **so: two windows, one rider, one shot.**

**What I will NOT say, and why it matters:**

- ⛔ **I will not call the body-height change a leg extension in metres, head-lengths or percent.** The knee is **never identifiable as a joint** anywhere in this clip (§3.1), so no leg chain, no knee angle and no hip-over-deck ratio is admissible.
- ⛔ **I will not publish a cadence.** One up-stroke and one down-stroke in one 0.56 s window is **not a rhythm**; it is two half-strokes. Calling it "≈0.2 s a half-cycle" would be the same within-window division the reviewer has just qualified on clip 14, and I am not repeating it.
- ✅ **What I will say** is the thing that survives: in genuine trim, **one channel moved and the other did not.** The trunk is the one that did not.

**Against `engine-target` row 6:** row 6's target is **0.55–0.60 s per half-cycle, in the TRUNK, with the legs not doing the work.** **This clip reproduces neither half.** The trunk did not cycle at all in any of the three trim stretches, and the only thing that moved was the body's height over the board. **Row 6's target column should be marked contested on both axes, with clip 14 and this clip on the same side of it.**

### 0.5 — The second headline: ten turns in one ride, two measured arm leads, both at the top of the wave

| # | direction change | section of the wave | resolution | a hand above the crown before the board reverses? |
|---|---|---|---|---|
| 1 | ~0.7 bottom turn (shot A) | open face, bottom | 0.5 s — **weak** | no |
| 2 | ~5.2 off the top | at the lip | 0.5 s — **weak** | not resolved |
| 3 | **8.44 ± 0.04, off the top** | **at the lip, open face** | **0.04 s, 6 frames** | ⭐ **YES.** Above the crown from **≤8.24** (earliest frame sampled) through 8.52. **Lead ≥ +0.20 s, held ≥0.28 s** |
| 4 | ~9.5–10.0 bottom turn | open face, bottom | 0.5 s — **weak** | no |
| 5 | ~11.1 bottom turn | open face, bottom | 0.5 s — **weak** | no |
| 6 | **11.70 ± 0.04, top turn / re-entry** | **at the lip, open face** | **0.04 s, 8 frames** | **BORDERLINE — recorded as borderline.** Both arms spread wide and roughly level at 11.60–11.68; the rear hand reaches about **head height** at 11.68 but is **not clearly above the crown** |
| 7 | ~13.55 bottom turn | open face, bottom | 0.10 s | **no** — arms spread low and level |
| 8 | **~14.90, off the top** | **at the lip** | **0.10 s, 8 frames** | ⭐ **YES.** A hand (the **lead** hand, reaching up and forward over the nose) above the crown from **≤14.36** through 14.76. **Lead ≥ +0.50 s — the longest the series has recorded** |
| 9 | ~16.05 re-entry | at the lip | 0.24 s | not resolved |
| 10 | ~17.8 floater | over the breaking section | 0.08 s | **no** — arms low and spread |
| 11 | **19.72 ± 0.04, bottom turn** | **open face, bottom** | **0.04 s, 12 frames** | **no.** Both hands low over the deck throughout |
| 12 | **20.38 ± 0.02, top turn / re-entry** | **at the lip, open face** | **0.04 s, 12 frames** | ⭐ **YES.** **Rear** hand above the crown at **20.28 ± 0.02**, fully extended by 20.32–20.48. **Lead = +0.10 s ± 0.04**, held ≥0.20 s |
| 13 | **~20.95, carve/cutback** | **in the whitewater, bottom** | **0.04 s, 12 frames** | **no.** Lead arm extended forward-down past the nose, rear arm back and low |

**3 leads in 7 resolved direction changes** (plus one borderline). The measured **+0.10 s** sits inside the series band (V8 0.1–0.2, V9 0.07–0.30, V12 0.04–0.12, V13 +0.18, V14 +0.14); **the ≥ +0.50 s at 14.36 sits outside it and above it.**

> ⚠️ **On the condition, which is the open question:** **all three leads here are at the top of the wave, at or near the lip. All four clean misses are at the bottom** — two bottom turns, a carve in the foam, and a floater. **That is clip 14's separator (top vs bottom), reproduced.** It is **not** clip 13's (open face vs slab): this clip has a miss on the open face at the bottom and leads on the open face at the top.
>
> **But the borderline at 11.70 is at the top and does not lead**, so "top ⇒ lead" is not a rule even inside this clip. **Two clips now agree on top-vs-bottom and one clip (13) disagrees with both. The lead stays conditional, and nothing here licenses a rule.**
>
> ⚠️ **And one distinction the series has been blurring:** at 20.28 it is the **rear** hand; at 14.36 it is the **lead** hand, reaching up and forward over the nose. `engine-target` row 5's wording is *"rear arm above the shoulder"*. **This clip shows both arms used for the same job, so the metric should be "a hand above the crown", not "the rear hand".**

Running tally across the series: was **13 of 21 across six clips**; with this clip **16 of 28 across seven clips**.

### 0.6 — The third headline, and it is the one row-3 result the series did not have

**Ten transitions resolved with both channels legible. Zero opposite-sign instances — and FOUR where one channel moves and the other visibly does not.** §3.3. The series has been counting "same sign up", "same sign down" and "frozen"; **this clip is the first to count decoupling as its own category**, and decoupling is just as unreachable for the engine as an opposite sign, for exactly the same reason: `HumanoidRig.ts:1383–1385` makes the drawn trunk a one-line function of drawn depth, so within a stage the correlation is **+1 by construction** and **zero is as impossible as −1**.

---

## 1. ⚠️ What this clip CANNOT touch, and why — the honest half

Stated before the measurements, because for five rows it is the whole result.

| row | verdict | the reason, named |
|---|---|---|
| **2 — trunk travel** | ⛔ **no admissible angle anywhere, and a NEW cause** | §2.1. **This rider wears a loose T-shirt that hangs over his boardshorts. There is no visible waistband anywhere in 22.661 s**, so clip 13's gate — *projected shoulder→waistband ÷ head length* — has no hip landmark to run against, **within this clip or any other.** Every trunk statement below is a **direction**, never an angle |
| **10 — the two legs' split** | ⛔ **not measurable** | §3.1. **Three frames attempted, and in all three the knee is not identifiable as a joint**: the thigh is inside the boardshorts and the shin and ankle are in spray or foam. **The thigh/shin admissibility test cannot even be computed, let alone passed.** Row 10 stays at V8's one clip, two frames |
| **14 — where a rider lives on the ladder** | ⛔ **no rung named, seventh clip running** | §3.1 and §5.6. The leg chain needs a knee and there isn't one; and **the lens sits above the rider** (he is below the horizon in every full frame), so head-length rulers are not licensed either |
| **17 — foot travel** | ⛔ **not a measurement** | §4.2. The deck is **dark and unmarked** and spends most of the ride in spray. The only board graphic ("VANS") is on the **bottom**, visible only when the board is rolled or airborne — exactly when the feet are not |
| **6 — a pump CADENCE** | ⛔ **refused** | §0.4. The clip's longest genuine trim is **0.56 s** — two half-strokes. **A rhythm cannot be read off two half-strokes and I am not publishing one** |
| **18 — head yaw vs the board** | ⚠️ **the closest the series has come, and still not a yaw** | §4.3. One frame (t = 19.000) has **a 90 px head whose brow, nose and chin are legible in silhouette** AND **the board's pointed nose unambiguous**. The in-image angle between them is **16° ± 8°** — but that is a **projected** angle that mixes yaw with pitch, and the face is **backlit to a flat silhouette** so I cannot tell which way the head is rotated in depth. **No yaw is reported** |

---

## 2. The two method findings

### 2.1 — ⭐ THE TRUNK GATE NEEDS A WAISTBAND, AND A LOOSE SHIRT DOES NOT HAVE ONE

Clip 13 gave the series a per-frame gate: **projected shoulder→waistband ÷ head length**, in-plane expectation 1.6–1.8. Clip 14 found the **number** does not transfer between clips and corrected the method to *"run it within a clip, against that clip's own most-vertical frame."*

**I tried to run it within this clip and could not run it at all.** This rider wears a **loose maroon T-shirt that hangs over black boardshorts**; its hem flaps and sits at a different place on the torso in every frame (visible at 16.80, 19.00 and 22.08). **There is no waistband in the image, in any frame of the clip.** Placing a "hip" means placing the shirt hem, and the shirt hem is not a landmark — it is cloth in a 5 m/s airflow.

> **The correction this clip adds, stated so it can be quoted: clip 14's "calibrate the gate within the clip" is necessary but not sufficient. The gate needs a GARMENT EDGE THAT TRACKS THE PELVIS. A boardshorts waistband is one. A bikini bottom is one at a different height (clip 14). A loose shirt hem is not one at any height.** The footage ask for the gate is therefore sharper: **a rider whose torso and hip are separated by a fitted edge — a wetsuit seam, a waistband, or bare skin above the shorts.**

**Consequence: no trunk angle, no trunk span and no trunk rate is published from this clip.** The series still has **no gated measurement of trunk angular travel anywhere, now across fifteen clips.**

**This does not weaken `engine-target` rows 1 and 2.** Their case is `HumanoidRig.ts:1383–1385` — the drawn trunk is a one-line function of drawn leg depth — which is a code reading and needs no camera.

### 2.2 — The staleness probe, run and passed; and the two-`<video>` trap, which fired

The skill's out-of-order probe was run before any measurement: ten seeks in the shuffled order **12.0, 3.0, 12.0, 7.5, 3.0, 16.0, 7.5, 16.0, 1.0, 12.0**, hashing a 64×85 decode of each and differencing all 45 pairs.

- **Six same-time pairs: identical, 6 of 6** — the decode is deterministic.
- **Thirty-nine distinct-time pairs: 0 of 39 identical.**

Decode was live, and it was re-checked implicitly by every frame-grid measurement (§5.3).

**Clip 13's two-element trap fired here:** `document.querySelectorAll('video')` returns **2** elements, the first with `videoWidth = 0` and `readyState = 0`. **Every call selects by `videoWidth > 0`.** **No consent gate appeared.**

**And the composited-canvas failure fired once and was caught by the stamp**, not by the picture: a single-frame render returned the *previous* sheet's image while reporting the correct `currentTime` from the JS call. The canvas stamp read `cropSheet sw=440` where the call had drawn a single frame — **the stamp is what caught it.** Fix: the wait inside the drawing function was raised from 0.9 s to **2.7 s**, and it did not recur in ~30 later renders. **This is the skill's 2.2–2.5 s rule and it belongs inside the draw, which is where clip 14 also put it.**

---

## 3. The body channels

### 3.1 — Leg depth: **no rung named, seventh clip running** — and a sixth distinct cause

**(a) The leg chain, with clip 12's thigh/shin admissibility gate. Three frames attempted, three refusals — and in all three the gate could not even be computed.**

| frame | what the eye sees | why the chain is refused |
|---|---|---|
| **t = 12.960**, rendered at **3.04×** | the front leg bare from mid-thigh to the foot on the deck, the foot unmistakable | **No knee.** The thigh is inside the black boardshorts to below the joint; the bare segment reads as one straight limb with no identifiable bulge or crease. **Thigh/shin is not computable** |
| **t = 16.800**, rendered at **2.93×** | the rear leg bare, hem to foot | **No knee, and no ankle.** The lower third of the leg and the foot are inside whitewater. **Not computable** |
| **t = 17.040**, rendered at **2.32×** | both legs separated, the clip's widest stance | **Both ankles in spray.** Only the upper shins emerge; the feet are a white blur. **Not computable** |

> **This is a sixth distinct cause, and it is the first that defeats the gate rather than failing it.** The previous five were projection saturation (V7–V9), a raised lens plus boardshorts (V10), resolution plus limb overlap (V11), thigh-at-the-lens from behind (V12), and both ends foreshortened at once (V14). **Here the rider is large (190–430 px), side-on, with bare lower legs — and the knee is simply inside his shorts while the ankle is inside the foam.** Seven clips, seven refusals.

**(b) Row 10, the split: NOT MEASURED, and I will not estimate it.** **Row 10 stays at V8's one clip, two frames** — the fifth clip running that could not touch it.

**(c) The backup rulers are not licensed either.** `hip-above-deck ÷ head length` needs a hip, and §2.1 says there isn't one. **Apparent stature in head-lengths is dead on a raised lens**, and §5.6 establishes the lens is raised. **So this clip names no rung for any frame.**

**(d) What *is* observable** is the body's height over the board, on **fixed-size** crops at a stated magnification with the head length checked frame-to-frame. That is what §0.4 uses, and it is reported as a **direction**, never a depth.

**(e) Qualitatively**, the knees are flexed for essentially the whole ride. The straightest-legged passage is **17.04–17.20**; the most compressed are **0.96–1.28** (riding the broken lip), **10.72–11.04**, **14.10–14.30** and **18.04–18.32**. **No rung is named for any of them.**

### 3.2 — Trunk fold: §2.1 is the result

**No admissible angle, no span, nothing quoted.** Every trunk statement in this document is a **direction** — visibly more folded, visibly less folded, or visibly unchanged at the stated sampling interval. The "50–70°" bands quoted in §0.1 and §0.4 are **by-eye bands given for orientation only and must not be quoted as measurements.**

**The one trunk observation that needs no angle, and it is the clip's most reproduced:** the folded trunk is this rider's **default**, not an event. It is visibly folded in **every** readable frame of the ride except **17.04–17.28** and the two moments of projection off the top (**11.60–11.72**, **20.28–20.44**). Across **21.76 → 22.64, 0.88 s, 12 samples at 0.08 s**, it is folded and **visibly unchanged throughout**.

### 3.3 — Opposite-direction channels: ten resolved transitions, zero opposite-sign, **four decoupled**

| window | length | samples | body height over board (legs) | trunk fold | verdict |
|---|---|---|---|---|---|
| **10.16 → 10.32** | 0.16 s | 3 at 0.08 | **rises** | **visibly unchanged** | ⭐ **decoupled** |
| **10.32 → 10.56** | 0.24 s | 4 at 0.08 | **falls** | **visibly unchanged** | ⭐ **decoupled** |
| **12.88 → 13.04** | 0.16 s | 3 at 0.08 | **rises** | **visibly unchanged** | ⭐ **decoupled** |
| **13.04 → 13.20** | 0.16 s | 3 at 0.08 | **falls** | **visibly unchanged** | ⭐ **decoupled** |
| **16.32 → 16.56** | 0.24 s | 4 at 0.08 | low, held | folded, held | **frozen — both channels** |
| **16.56 → 16.64** | 0.08 s | 2 at 0.08 | rises | un-folds | **same sign (up)** |
| **16.64 → 17.12** | 0.48 s | 7 at 0.08 | rises | un-folds | **same sign (up)** |
| **17.76 → 18.16** | 0.40 s | 6 at 0.08 | falls | folds further | **same sign (down)** |
| **18.20 → 18.32** ⭐ | 0.12 s | 4 at **native 0.04** | compressed, held | folded, held | **frozen — both channels, through a foam landing** |
| **20.20 → 20.36** | 0.16 s | 5 at **native 0.04** | rises | un-folds | **same sign (up)** |

> **Ten resolved transitions: three same-sign up, one same-sign down, two frozen, FOUR DECOUPLED, zero opposite-sign.** With the series' existing 26, that is **36 resolved transitions across five riders and five clips with no opposite-sign instance.**
>
> **V9's opposite-sign passage is therefore SINGLE and five-times-not-reproduced.** It remains the right **acceptance test** for `engine-target` rows 1–2 and it is **not** a frequency claim. **A fifth zero is informative.**
>
> ⭐ **But the four decoupled windows are new, and they are the first time the series has counted that category.** They matter because **decoupling is as unreachable for the engine as an opposite sign.** Row 2's formula `wanted = tall + (deep − tall) × depth` forces a correlation of exactly **+1** within a stage: the engine can produce "both up" and "both down" and nothing else. **A trunk that holds still while the body's height over the board changes is impossible at any value of `hinge.tall` or `hinge.deep`** — and unlike V9's opposite-sign passage, **this clip reproduces it four times in one ride.** **If rows 1–2 need an acceptance test that is reproduced rather than SINGLE, this is it.**

### 3.4 — Pump: §0.4 is the result, and it is mostly a refusal

**Three genuine trim stretches, 0.56 s / 0.32 s / 0.32 s. In two of them the body's height over the board completes one up-and-down while the trunk does not change; in the third both channels rise together over 0.32 s. No cadence is published** — the longest trim in the clip is 0.56 s, which is two half-strokes, and two half-strokes are not a rhythm.

⚠️ **And the thing clip 14's reader found missing is recorded here for every window**: the board's roll and heading were checked on **full frames** before each stretch was accepted, and **three otherwise pump-looking passages were rejected** because the board's bottom became visible (a rail roll) or its nose swung — at **13.36**, **17.28** and **10.80**.

### 3.5 — Arm carriage: five carriages, four of them at one leg state

Only windows sampled at **≤0.25 s** are counted, and the interval is given for each.

| carriage | verified windows (sampling interval) | count |
|---|---|---|
| **A — both hands low and forward over the deck**, inside the rails | 7.08–7.58 (0.125), 10.16–10.90 (0.08), 12.88–13.40 (0.08), 16.32–16.56 (0.08), 18.76–19.40 (0.08), 21.76–22.64 (0.08) | **6 windows, the clip's most common — roughly 3.5 s of readable riding** |
| **B — lead arm extended forward-down past the nose or rail**, rear arm back and low | 13.60 (0.10), 18.20–18.32 (**0.04**), 20.80–21.24 (**0.04**) | 3 |
| **C — both arms spread wide, roughly level, at shoulder-to-head height** | 11.60–11.68 (**0.04**), 13.50 (0.10), 16.96–17.20 (0.08) | 3 |
| **D — a hand extended above the crown** | 8.24–8.52 (**0.04**, rear or lead ambiguous), 14.36–14.76 (0.10, **lead** hand), 20.28–20.48 (**0.04**, **rear** hand) | 3 |
| **E — both arms drawn in low and close to the body, trunk and legs deeply compressed** | 0.96–1.28 (**0.04**), riding the broken lip down | 1 |

**Distinct carriages reachable at one leg state: 4** — A, B, D and E all occur with the body visibly low over the board.

**Carriage A reproduces `engine-target` row 15 on an EIGHTH clip** (V7 4 windows, V8 5, V9 6, V11 4, V12 ≥8, V13 6, V14 6, here **6 verified at ≤0.25 s**). The hands are over the **deck**, usually both at once.

⚠️ **On row 4's "tall ⇒ arms spread" refutation, this clip is the first in several that does NOT add to it.** The clip's **straightest-legged, most upright** passage (17.04–17.20) carries **carriage C — its widest arms.** That is *consistent* with "tall ⇒ spread". **It does not restore the claim** — seven clips refuted the implication and one consistent case cannot un-refute it — **but it is the honest counterweight and it is recorded.** What row 4 still gets from this clip is the other half: **carriage A is held unchanged across 10.16–10.72 while the body's height over the board rises and falls** — arm carriage is independent of leg depth in the same window where leg depth moves.

### 3.6 — Arm timing: §0.5 is the result

**3 leads in 7 resolved direction changes**, one borderline, all three leads at the top of the wave and all four clean misses at the bottom — **clip 14's separator reproduced, clip 13's contradicted again.** And **the lead hand does the job as often as the rear hand**, which the row's current wording does not allow for.

---

## 4. The fore-aft axis, the feet, and the head

### 4.1 Hips aft, shoulders forward — 5 frames, and the forward head reproduced for a fourth clip

On every frame where both landmarks could be placed **and the board's nose direction was identifiable** — **10.320, 12.960, 13.040, 16.800, 19.000** — the **shoulders sit forward of the hips toward the nose**. **5 frames**, reproducing V1, V7, V8, V9, V10, V11, V12, V13 and V14. **Direction and sign only; no magnitude**, as in every previous clip.

**V12's, V13's and V14's head-forward finding reproduces for a fourth clip, and here it is the clearest the series has had.** At **t = 19.000**, rendered at **1.19×** and the head again at **4.39×**, the head sits **well forward of the shoulder line, out over the front foot** — the neck is nearly horizontal and the chin leads the chest. The same is visible at 16.800 and 12.960. **No magnitude is given.**

### 4.2 Feet: ⛔ not measurable, and the reason is clip 14's reason again

No foot change was seen in the windows where both feet and the deck were legible. **I am not recording that as a count.** The deck is **dark, unmarked and wet**, and in the frames where it is cleanest (16.80–17.12, 12.88–13.20) it renders as a featureless dark band at 2.9–3.0× with **no logo, stringer or rail graphic** to measure a foot against. The clip's one board graphic — "VANS" — is on the **bottom**, and it is visible only at **17.44–17.60** and **20.36–20.48**, which are precisely the moments the board is rolled or airborne and the feet are therefore not readable against the deck. **"None seen" is an impression.**

### 4.3 Head and gaze — ⭐ the first frame in the series with both, measured, and still not a yaw

**At t = 19.000 the clip delivers what fourteen clips could not: a head and a board nose legible together at usable size.**

- ✅ **The head is 90 ± 6 px** (hair top at source y ≈ 705, chin at y ≈ 795, read at **4.39×** on a 10 px source grid). **The profile is unmistakable in silhouette** — brow, nose and chin all readable as outline.
- ⛔ **But the head is backlit against bright foam and renders as a flat black silhouette.** **No eye, no mouth, no shading.** So I can read the head's *outline* direction and **not** its rotation in depth.
- ✅ **The board's nose is unambiguous**: a sharp point at source **(706, 1135)**, with the board's long axis running to **(864, 1149)** — read at **1.72×** on a 20 px grid.

**The measurement, with its frame stated:**

| quantity | value | what it is |
|---|---|---|
| board's long axis, toward the nose | **5° above horizontal, pointing left** | in the **image plane** |
| head's facing line (back-of-skull → nose) | **11° below horizontal, pointing left** | in the **image plane** |
| **angle between them** | **16° ± 8°**, head **below** the board's axis | **a projected angle, mixing yaw with pitch** |

> **So: the head is turned ALONG the board's heading, not across it, and it is pitched down toward the water ahead of the nose.** In the other five frames where both were legible — **12.960, 13.040, 16.800, 16.880, 17.040** — the head is turned toward the nose in all five. **6 frames, 1 rider, no frame with the head across the heading.**
>
> ⚠️ **This is still NOT a head yaw, and `engine-target` row 18 should not be given one.** A 16° in-image angle between a profile silhouette and a board axis is a projection; it cannot be decomposed into yaw and pitch without the face, and the face is a silhouette. **The footage ask is now exactly one clause narrower than clip 14 left it: a frame with the board's nose legible AND a head of ≥60 source px AND THE FACE LIT RATHER THAN BACKLIT.** Clip 13 had the face and not the nose; clip 14 had the nose and not the head; **this clip has the nose and a big head and loses it to the sun.**

---

## 5. The source, and what the numbers are worth

### 5.1 Delivery

`#movie_player` does not exist on a Short; the player is `#shorts-player`. `getAvailableQualityLevels()` returns **`["hd1080","hd720","large","medium","small","auto"]`** — **1080p is this clip's hard ceiling**, with no `hd1440` or `hd2160` to try. `hd1080` was pinned with `setPlaybackQualityRange` and confirmed with `getPlaybackQuality()`; `videoWidth/videoHeight` = **1080×1440**.

> **Sixth clip, and the aspect is new.** V11 1080, V12 a fictitious 2160, V13 a real 1440 with a frozen 2160, V14 a flat 1080 at 1080×1920, and **here a flat 1080 at 1080×1440 — a 3:4 stream inside a 9:16 Short, letterboxed by the player.** The practical consequence is good: **for the same 1080 px width the rider occupies more of the frame height than in a 9:16 Short**, which is part of why this clip's rider is the largest in five.

### 5.2 Pane geometry — clips 12, 13 and 14's result reproduced a fourth time

At a **1280×1000** viewport the screenshot came back **800×625**, canvas→screenshot scale **0.625**. **At 800×640 the screenshot is 800×640 and the scale is exactly 1.0.** Measured in a fourth independent session. Stream quality was taken at the large viewport (enlarge **and reload**) and every measurement frame at the small one.

**One addition to the skill, and it cost a frame.** The composited-canvas failure here did **not** look like missing tiles — it returned a **complete, correct-looking image of the previous render**. **Only the stamp caught it**, because the stamp said `cropSheet sw=440` while the call had drawn a single frame. **A 0.9 s wait inside the draw was not enough; 2.7 s was, across ~30 subsequent renders.**

### 5.3 The frame grid: **25 fps, measured twice and cross-checked**

Seeking on a **0.005 s** grid and hashing the decoded frame:

- **8.000 → 8.210:** the picture changes at **8.045, 8.080, 8.125, 8.160, 8.205** — intervals 0.035 / 0.045 / 0.035 / 0.045, mean **0.040**.
- **14.000 → 14.210:** changes at **14.040, 14.080, 14.120, 14.160, 14.200** — **exactly 0.040, four intervals, no drift.**

Cross-check by duplicate counting over a moving span from t = 5.0: stepping at **1/25 = 0.040** gave **0 duplicates in 9 steps**; stepping at **1/30 = 0.0333** gave **2 duplicates in 9 steps**.

**25 fps. Native frame = 0.040 s.**

> ⚠️ **Three of fifteen clips are now 25 fps** (V10, V14, this one). **Had I assumed 30 fps I would have sampled duplicates and read them as a motionless rider** — and on a clip whose headline is "the trunk did not move", that error would have manufactured the answer.

### 5.4 Slow motion: excluded on duration and blur; no measured-gravity check was possible

1. **Durations.** The re-entry at 20.20 → 20.64 runs the whole rotation in **0.44 s**; the off-the-top at 8.24 → 8.52 in **0.28 s**; the bottom-turn-to-climb at 19.40 → 19.84 in **0.44 s**. Against published figures of **0.96 ± 0.04 s** for a bottom turn and **0.8 ± 0.03 s** for a cutback, these are at or **faster** than real time, not slower. At 2× slow they would be 0.14–0.22 s, which no body does.
2. **Motion blur.** The spread hands at 13.00 and the spray sheets at 20.80–21.20 are **visibly blurred**, consistent with a short shutter at 25p and inconsistent with a high-rate capture played slow.

**What I could not do:** the board leaves the water only briefly at 17.44–17.60, and it is inside spray there, so **no ballistic and no rotation-rate check was possible**. **Verdict: at or near real time, on duration and blur only.**

### 5.5 Shot structure: **exactly two shots, one cut at t = 4.08–4.10**

The whole-frame luminance detector (24×32 grid, mean absolute difference at 0.1 s, 227 samples) gave **one** nominee: **t = 4.10 at 49.1 against a local level of 8–11 — about 5× local.** Nothing else exceeded 1.4× its local level.

**A second, much cleaner detector settled it.** Differencing only the **top third** of the frame (sky, horizon, background — insensitive to the rider and to spray) over the whole clip at 0.1 s gives values of **0.1–0.7 inside a shot**, rising smoothly to 3–25 wherever the camera pans fast or spray reaches the top third. **The only step is at 4.10: 7.6 against 0.1 either side — a 40× step, probed at the native 0.04 s grid (3.94 … 4.30) and resolved to a single frame interval.**

Three sustained elevations were checked and are **not** cuts: **11.8 → 12.4** (a smooth ramp 1.6 → 7.7 at 0.04 s, plus full frames at 11.92 … 12.36 showing continuous motion inside one spray plume), **14.2 → 14.8** (smooth, plus full frames at 14.10 … 15.20), and **20.5 → 21.4** (the carve's spray).

Independently, **ten windows were sampled densely and every one is continuous motion of the same rider, board, wave and lens drift**: **0.84–1.28**, **5.80–6.24**, **8.24–8.92**, **11.48–11.92**, **11.92–12.36**, **18.04–18.32**, **19.40–19.84**, **20.20–20.64**, **20.80–21.24** at the **native 0.04 s**; **10.16–11.04**, **12.88–14.00**, **14.10–15.20**, **16.32–17.60**, **18.20–20.40**, **21.76–22.64** at 0.08–0.125 s.

> **So: shot A is 0.00–4.08 (4.08 s) and shot B is 4.10–22.66 (18.56 s).** **Shot B is the longest single continuous ride in the series** — longer than clip 11's 11.78 s and clip 14's 16.6 s. **One rider throughout both: maroon loose T-shirt, black boardshorts, bare legs, dark board with a "VANS" bottom.** The lineup contains at least two other people; **my redness finder locked onto a foreground paddler in six tiles at 6.20–6.95 and those six are refused, not read** (§0.3).

**Direction-change rate (row 8):** **≥10 direction changes located to ±0.1 s or better inside shot B's 18.56 s — one per ≤1.86 s.** This is a **lower bound**: three further changes are visible on 0.5 s sheets but were not resolved. **It puts this clip at the fast end of row 8's range, beside V9 (one per 2.3 s) and clip 14 (one per 2.1 s), and at the opposite end from V7's zero in 13 s.**

### 5.6 What the error bar is

- **Source 1080×1440** — this clip's ceiling. **Rider 190–430 px head-to-foot, head 37–90 px.**
- **The camera zooms and pans continuously**, so **no apparent size is compared between two frames without checking the head length in both**, and every ratio is computed **inside a single frame**.
- ⚠️ **No trunk angle is published at all** (§2.1), and therefore no trunk rate and no trunk span.
- ⚠️ **No leg depth, no rung, no leg split** (§3.1). Three frames attempted at 2.3–3.0×, three refusals.
- ⚠️ **No automated tracer was built.** Clip 11 built one, validated it, found it reading 9° where the hand read 39–43°, and discarded it. **I also tried automated colour segmentation of the shirt, skin and hair to place the hip and the ankle objectively, ran it at t = 13.04, and discarded it**: the rider is backlit and in shadow against sunlit water, so the "hair" mask returned 34 445 px covering the whole wave face and the "skin" mask returned 256 px. **Nothing from it is quoted.**
- ⚠️ **No angle or posture claim anywhere comes from a survey strip.** Strips at 0.28–0.46× were used **only to find moments**; every measured frame was re-rendered at **0.87–4.39×** with a 10, 20, 25, 40 or 50 px source grid, and the two frames behind §0.4's comparison were rendered at **exactly 1.00×**.
- **Rider-centred crops were FIXED-SIZE** (220–620 source px at a fixed magnification per sheet), so the skill's auto-crop size trap could not fire.
- **The lens height is KNOWN and it is raised.** The sea horizon is visible as a clean line in the upper third of every full frame, and **the rider's head is below it in every frame checked** (0.84–1.28, 5.80–6.24, 8.48–8.92, 10.20–10.90, 12.88–14.00, 14.10–15.20, 19.40–19.84, 20.20–20.64). **This is a beach shot from above the rider's head height, so head-length rulers are not licensed.**

---

## 6. Part C — what I could not see, and why

- **Any facial feature.** The head is 90 px at its largest and **backlit to a flat silhouette**; checked at 4.39× on the clip's two largest-head frames.
- **Any trunk angle**, and therefore any trunk rate or span (§2.1) — **because the rider has no waistband.**
- **Any knee as a joint**, in any of three frames attempted at 2.3–3.0×. Therefore **no leg chain, no leg split and no depth rung.**
- **A pump cadence.** The clip's longest genuine trim is 0.56 s (§0.4).
- **Foot placement on the deck** — the deck is dark and unmarked (§4.2).
- **Frontside versus backside, and regular versus goofy.** The rider is back-to-camera through 12.9–17.3 and in profile at 19.0, and the camera's position relative to the peel is not established. ⚠️ **I also cannot exclude that the clip has been horizontally mirrored, which is common in short-form reposts and would invert any handedness claim. I am reporting neither.**
- **The take-off and the end of shot B.** The ride is under way at 4.10 and still under way at 22.661 when the clip ends.
- **Direction changes 2, 4, 5 and 9** at better than 0.24–0.5 s.
- **Anything above 1080p.** The clip publishes nothing higher.

---

## 7. What this round did not do

- **No file under `src/` or `server/` was touched.** This is evidence, not a fix.
- **Nothing was built, ridden, benchmarked or measured in the game.** Every game-side statement is quoted from `3.5/engine-target.md` or `3.5/body-channels.md`.
- **No constant is proposed, and no stance rung is named for any frame.**
- **No trunk angle is published**, and no trunk span.
- **No comparison is made between anything here and the game's own pump depth in metres or in rungs.** The series has **no calibrated depth reference from any footage** — the leg chain has now been refused on seven consecutive clips — so a metre-for-metre comparison is not available and claiming one would be the frame error this project keeps making.
- **`engine-target.md` was not edited**, and the fourteen earlier video documents were not edited.
- **No automated tracer and no colour segmenter survived. No angle was read from a survey strip.**
- **No conclusion is drawn about the wave, the lip, the foam or the spray.** One line, because it is the context every number sits in: the wave is a chest-to-head-high, fast, mostly open-faced point-style wall with two sections that break over the rider at ~17.9 s and ~21 s — **which is why the three overhead arms are all at the top of the wave and why the long carriage-A stretches are all along the face.**

---

## 8. Part B — the mapping

Game-side entries are **code readings quoted from `3.5/engine-target.md` and `3.5/body-channels.md`**. **Nothing was built, ridden or benchmarked.**

| what the rider does | the game's name for it | have it / partly / not at all |
|---|---|---|
| **In 0.56 s of flat-board trim, the body's height over the board rises and falls once while the trunk's fold does not change** | `pump` | ⭐ **NOT AT ALL, and this is sharper than "partly".** The game's pump *is* leg depth, so the moving channel exists — but **the trunk must hold still while it moves**, and `HumanoidRig.ts:1383–1385` forces the drawn trunk to follow drawn depth with correlation +1. **A still trunk over a moving leg is unreachable at any value of `hinge.tall` or `hinge.deep`** |
| **Four transitions where one channel moves and the other visibly does not, in one ride** | — | ⭐ **not at all**, and it is **reproduced four times**, unlike V9's opposite-sign passage which is SINGLE. **Row 3's acceptance test could be built on this instead** |
| **A hand above the crown 0.10–0.50 s before the board reverses, held ≥0.2 s — on 3 turns of 7, all three at the top of the wave** | entry to `top turn` / `carve` | **not at all.** No arm position exists to lead with, and the one orderable pair runs backwards (`MOTOR_LAG` 0.05 s vs `ARMS_TIME` 0.15 s, `KNEE_RETURN_TIME` 0.6 s) |
| **The LEAD hand doing that job at 14.36, and the REAR hand doing it at 20.28** | — | **n/a — and it is a correction to row 5's wording**, which says "rear arm". The metric should be "a hand above the crown" |
| **Four direction changes with no overhead arm, all at the bottom of the wave** | — | **n/a — a constraint on what gets built.** A built lead must be **conditional** |
| **Both hands low and forward over the deck in 6 windows, ~3.5 s of riding** | `hand` input | **not at all.** One hand, on/off, pointed at the water, side chosen by the game (`AttachedRider.ts:5720–5732`) |
| **5 carriages; 4 distinct at one leg state; carriage A held unchanged across a window in which leg depth moved** | — | **not at all.** One pose per stage × depth; `HumanBalance.arms` is one scalar, capped by `stanceRoom(depth).arms` |
| **A trunk folded 50–70° held as the DEFAULT posture for essentially a whole 18.6 s ride, including 0.88 s of trim with no visible change** | — | **not at all.** `hip.angle` exists on `?rider=new`, is paired and booked, and is read in three places that never touch `this.parts` (row 1) |
| **A foam landing met with the body already folded and compressed 0.16 s before contact, both channels frozen for 0.12 s across 4 native frames, and ridden out still standing for a further 4.3 s** | — | **not at all** as a posture; row 16. The foam does reach the board (3.5e, five channels); **no brace posture exists** |
| **Legs and trunk rising together over 0.48 s with no resolvable lead either way** | — | **partly.** "Together" is free by construction; **"legs first" and "trunk first" are both unreachable** |
| **Head and shoulders forward of the hips over the feet, 5 frames** | `trim` weight (W/S) | **not at all** as a differential. `TRIM_SHIFT = 0.25 m` moves pelvis, torso, head and both arms **together** (`AttachedRider.ts:5514–5518`) |
| **The head thrust well forward of the shoulders, out over the front foot** | — | **not at all**, fourth clip |
| **Head turned along the board's heading in 6 of 6 legible frames, pitched down ahead of the nose** | — | **not at all.** Row 18, still with no yaw |
| **≥10 direction changes in one 18.56 s ride — one per ≤1.86 s** | chaining `bottom turn` / `top turn` / `carve` | **not at all.** No chaining notion exists (row 8); **this clip sits at the fast end of the range** |
| **Steps on the board** | — | **cannot be judged here** — the deck carries no landmark (§4.2) |

---

## 9. Rows this clip moves, and how

| row | the measurement | the population | which way it moves |
|---|---|---|---|
| **6** | ⭐ **In the clip's longest genuine trim (10.16–10.72, 0.56 s; board deck toward the camera, no rail roll, no heading reversal, verified on full frames at 0.10 s), the body's height over the board rises then falls once while the trunk's fold is visibly unchanged.** Repeated at 12.88–13.20 (0.32 s). **No cadence published; no depth published** | 2 windows, 0.56 s and 0.32 s, 6 and 3 samples at 0.08 s, 1 rider, 1 shot | ⚠️ **DISAGREES with row 6's target on both axes, with clip 14.** Row 6 asks for **0.55–0.60 s in the TRUNK with the legs not working**; here the trunk does not cycle in any trim stretch and the moving channel is the body's height over the board. ⛔ **And it REFUSES to supply a replacement period**: the clip has no trim stretch long enough to contain a rhythm. **Row 6's target column should read "contested, and no clip has yet shown a sustained trim cadence"** |
| **3** | ⭐ **Ten resolved transitions with both channels legible: 3 same-sign up, 1 same-sign down, 2 frozen, FOUR DECOUPLED (one channel moves, the other visibly does not), ZERO opposite-sign** | 10 windows, 0.08–0.48 s, 2–7 samples each, 1 rider | **Row 3 is SINGLE and now FIVE-TIMES-not-reproduced — 36 resolved transitions across five riders and five clips with no instance.** ⭐ **But the four decoupled windows are NEW as a counted category, and decoupling is equally unreachable** (correlation +1 by construction). **A reproduced acceptance test for rows 1–2 is now available where only a SINGLE one existed** |
| **5** | ⭐ **3 leads in 7 resolved direction changes**, each with the wave section recorded. **8.44 ± 0.04 (lead ≥ +0.20 s), ~14.90 (lead ≥ +0.50 s — the longest in the series), 20.38 ± 0.02 (lead = +0.10 s ± 0.04)**, all held ≥0.2 s. Absent at ~0.7, ~13.55, ~17.8, 19.72 ± 0.04 and ~20.95; borderline at 11.70 ± 0.04 | 7 direction changes, 5 at the native 0.04 s grid | Tally **13 of 21 across six clips → 16 of 28 across seven.** ⭐ **Clip 14's separator REPRODUCED: all three leads at the top of the wave, all four clean misses at the bottom** — and clip 13's open-face-vs-slab separator contradicted again. **But the borderline at 11.70 is at the top and does not lead, so it is not a rule even inside this clip.** ⚠️ **And the metric's wording needs fixing: at 14.36 it is the LEAD hand, at 20.28 the REAR** |
| **11** | ⭐ **Two down-transitions of the "legs only" form — 10.32→10.56 and 13.04→13.20** — the body's height over the board falls while the trunk is visibly unchanged. Plus one up-transition (16.64→17.12, 0.48 s, 7 samples) with **legs and trunk together, no resolvable lead** | 2 down-transitions + 1 up-transition, 1 rider, 1 shot | ⭐ **THE FIRST REPRODUCTION OF ANY SINGLE DOWN-TRANSITION FORM IN THE SERIES.** V9's "legs only" was SINGLE; it now has two more instances on a different rider at a different break. V7's "knees and trunk together" and V8's "trunk only" remain SINGLE. **Row 11's "the variety is the target" holds, and one of the three forms is now reproduced** |
| **15** | **Both hands low and forward over the deck in 6 windows**, each verified at **≤0.25 s**, ~3.5 s of readable riding | 6 windows, intervals stated per window | **Eighth clip for row 15.** V7 4, V8 5, V9 6, V11 4, V12 ≥8, V13 6, V14 6, here 6 |
| **4** | **5 carriages; 4 distinct at one (visibly low) leg state.** ⭐ **And carriage A is held unchanged across 10.16–10.72 while the body's height over the board rises and falls** | 5 carriages, 16 windows | **Row 4's "carriage is its own channel" gets a new and cleaner form: the arms held still through a leg excursion, in one window, at 0.08 s.** ⚠️ **But this clip does NOT add to the "tall ⇒ arms spread" refutation: its straightest-legged passage carries its widest arms.** Seven clips refuted the implication; one consistent case does not restore it, and it is recorded as the counterweight |
| **8** | **≥10 direction changes in one continuous 18.56 s ride — one per ≤1.86 s**, of which 7 were resolved well enough to time and 5 at the native grid. **A lower bound** | 1 ride, 18.56 s | **The fastest sustained rate in the series**, ahead of clip 14's 2.1 s and V9's 2.3 s. **And shot B is the LONGEST single continuous ride the series has read** — 18.56 s against clip 14's 16.6 s and clip 11's 11.78 s |
| **16** | **A floater landing into whitewater at ~18.08 ± 0.04, met with the body ALREADY folded and compressed from ≤17.92 (0.16 s before contact), both channels frozen across 4 native frames (18.20–18.32), and ridden out still standing for a further 4.3 s to the end of the clip** | 1 landing, 4 native frames; 1 ride-through of 4.3 s | **Third clip with a brace observed, and the second resolved at the native frame grid.** V6's was SINGLE and one frame; clip 14's was 0.36 s at the native grid. ⭐ **"Already folded, already compressed before contact" is now on two clips and two riders — it is a finding, not a sighting** |
| **18** | ⭐ **The first frame in the series with a 90 px head AND the board's nose unambiguous. In-image angle between the head's facing line and the board's long axis: 16° ± 8°, head below the axis.** In 6 of 6 legible frames the head is turned **along** the heading | 1 measured frame, 6 observed, 1 rider | ⛔ **Still no yaw, and the reason is new: the head is BACKLIT to a flat silhouette.** The 16° is a projection mixing yaw with pitch. **The footage ask gains one clause: the board's nose legible AND a head ≥60 px AND the face LIT, not backlit** |
| **2** | ⚠️ **The trunk gate could not be RUN, not merely not passed. This rider wears a loose T-shirt over his boardshorts and there is NO VISIBLE WAISTBAND in 22.661 s** | whole clip, 1 rider | ⚠️ **Clip 13's gate and clip 14's within-clip calibration both survive; what this adds is a precondition neither stated — the gate needs a garment edge that tracks the pelvis.** A loose hem is not one. **No trunk angle is published**, so the series still has **no gated measurement of trunk angular travel across fifteen clips** |
| **14** | ⛔ **No rung named, seventh clip running.** Three frames attempted at 2.3–3.0× with the rider 190–430 px and both legs bare below the shorts; **in all three the knee is not identifiable as a joint** (thigh inside the boardshorts, ankle in spray). And **the lens sits above the rider in every frame**, so head-length rulers are not licensed | 3 frames, 1 rider | **A sixth distinct cause, and the first that defeats the gate rather than failing it.** Previous causes: projection saturation (V7–V9), raised lens + boardshorts (V10), resolution + limb overlap (V11), thigh-at-lens (V12), both ends foreshortened (V14) |
| **10** | ⛔ **NOT MEASURED.** The thigh/shin admissibility ratio could not be **computed** on any frame, let alone passed | 3 frames attempted | **No change. Row 10 stays at V8's one clip, two frames** — fifth clip running that could not touch it |
| **17** | ⛔ **Not a measurement.** No foot change seen, **but the deck is dark and unmarked**; the board's only graphic is on its **bottom** and is visible only when the board is rolled or airborne | 2 windows | **Unchanged.** Clip 14's reason, reproduced |
| **9** | **Shoulders forward of the hips toward the nose in 5 frames**; ⭐ **the head thrust well forward of the shoulders out over the front foot, clearest instance in the series at t = 19.000 (head 90 px, rendered at 4.39×)** | 5 frames (shoulders), 3 frames (head) | **Tenth clip for the hips-aft/shoulders-forward pattern; fourth clip for the head-forward finding.** **Direction and sign only; no magnitude**, as in every previous clip |

**Method results that belong in the skill, not in a row:** §2.1's finding that **the trunk gate needs a garment edge that tracks the pelvis, and a loose shirt hem is not one**; §5.3's reminder that **25 fps is now 3 of 15 clips**; §0.3's rule that **a tracker's LOCK is not proof of the subject's presence** — six tiles were centred on a foreground paddler; §5.2's result that the composited-canvas failure can return **a complete, plausible image of the previous render**, caught only by the stamp, and that **2.7 s inside the draw fixed it where 0.9 s did not**; §5.5's two-detector method — **differencing only the top third of the frame separates cuts from fast pans cleanly where a whole-frame detector gives a 5× nominee and a 1.4× noise floor**; §5.1's note that a Short's stream need not be 9:16 (**this one is 3:4**); and §5.6's record that **automated colour segmentation of a backlit rider returns garbage and should not be attempted on a shadowed subject against sunlit water.**
