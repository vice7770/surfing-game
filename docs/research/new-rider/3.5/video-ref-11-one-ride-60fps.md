# Video reference 11 ("nothing better!!"): the first single unbroken ride, at 60 fps — the arm lead reproduced on a third clip, and the depth rulers failing for a *third* distinct reason

Source: **https://www.youtube.com/shorts/Ew5j1uqExVA**, title *"nothing better!!"*. Length **11.821 s**, read in full. Delivered to the browser pane at **1080×1920** — this video publishes **no 1440p and no 2160p**; `getAvailableQualityLevels()` returns `hd1080, hd720, large, medium, small, auto` and `hd1080` was pinned for every frame (§1.1). The stream is a true **60.0 fps** (measured, §1.2), `playbackRate` 1. Read 2026-11-18 by screenshotting the browser pane: **`yt-dlp`, `ffmpeg` and `ffprobe` are all absent from this machine** (checked, as the skill asks), so nothing was downloaded.

The **eleventh** reference the owner has sent, and **the first that is one continuous ride from one camera with no cut anywhere** (§1.4 — established against my own two wrong calls). The owner's standing instruction is the rider's **movement, not the wave**, so the wave, the lip, the foam and the spray appear here only where they hide a body.

**I was given no hypothesis and I did not adopt one.** The brief named the transitions as the centrepiece and asked for each channel's own number.

**Every figure below is an estimate from pixels.** The rider stands **374–680 source px** tall across the ride (hair-top to feet; typically **440–520 px**), and the camera zooms in through the clip, so **no apparent size may be compared between two frames without a scale** (§1.5).

---

## 0. The answer first

### 0.1 — What this rider's movement is actually like

**He rides folded, and he changes direction constantly.** Across 10.4 s of riding his trunk sits between **40° and 50° from vertical** almost the whole time, over legs that are flexed almost the whole time, and he reverses the board's direction **nine times — one every 1.2–1.5 s**, the fastest rate in the series. He is upright exactly once: climbing the face at 7.86–7.92, where the trunk comes to **15–20°** and the legs go long. Everything else is some arrangement of fold.

Three things the clip shows sharply that the engine does not have:

1. **The arm goes up before the board does anything — twice, both resolved at the stream's own frame grid.** At the bottom turn the rear arm is above the head at **7.467** and the rail does not bite until **7.533–7.567**: a lead of **+0.07 to +0.12 s**, with the board flat, the legs bent and the trunk unmoved in between (§0.2). The final climb repeats it at **+0.13 to +0.20 s**.
2. **Two channels with two clocks — but never running the opposite way.** At 6.61→6.97 the trunk folds ~15° in **0.36 s** while the legs hold; at 8.70→8.80 the legs extend markedly while the trunk holds within ~5°. **In no transition I resolved did the two move in opposite directions at once** (§0.5). That is an honest negative and it matters, because it was the single most valuable thing the clip could have contained.
3. **Both hands carried low over the deck**, inside the rails, in **4 separate windows** — the clip's most common arm position, and present at both a moderate fold and the clip's deepest open-face fold.

### 0.2 — The arm leads: a third clip, a third rider, at 1/60 s

Video 8 found the rear arm up first in 3 of 4 direction changes (0.1–0.2 s resolution). Video 9 resolved one at 1/30 s and got 0.07–0.10 s. Video 10 resolved one at 1/25 s and got 0.12 s but **could not test "above the head"**, because a drone looking down hides a raised hand. **This clip's lens is near side-on, so the abstention video 10 left open is settled here: the hand does go above the head.**

**Turn 1 — the bottom turn into the climb** (samples every 2nd frame, 0.033 s):

| t | the rear arm | the board |
|---|---|---|
| 7.250 | out sideways at **hip/waist height**, lead hand low and forward | flat, thin tail spray |
| 7.300 | **rising** — hand clear of the body, above the hip | flat |
| 7.350 | out and up, **at shoulder height** | flat |
| 7.400 | **above the shoulder** | flat |
| **7.433** | **above the shoulder, clearly** | **flat — no rail spray** |
| **7.467** | **fingers above the head** | **still flat** |
| 7.500 | held above the head | board still fairly flat, spray modest |
| **7.533** | held | **the rail starts to bank — the spray sheet begins** |
| **7.567** | held | **the board is clearly on its rail, spray sheet formed** |
| 7.600 | held | **full rail spray, nose up, climbing** |

**The rear arm is above the head 0.07–0.10 s before the rail bites and above the shoulder 0.10–0.13 s before, and the rise itself takes ~0.17–0.22 s** (7.250 → 7.467). **It is then held**: above the shoulder from 7.43 to at least 7.60 (**≥0.17 s**), and through the whole lip hit 7.85–8.65 both arms are high and wide (**~0.8 s**).

**Turn 2 — the final climb** (samples every 4th frame, 0.067 s): arm raised and bent at **9.900**, fist clearly above the shoulder at **9.970**, still high at **10.030**; the board banks at **10.100** and is on the rail at **10.170**. **Lead = +0.13 to +0.20 s.**

**Which manoeuvres take it — the brief's question, answered for this clip: 2 of 2 direction changes into a climb take it. Trim does not.** Through 0.20–1.40 (1.2 s, 6 samples) and 6.43–7.15 (0.7 s, 5 samples) both hands stay low over the deck and no arm goes above the shoulder at any point.

> So the engine-target §4.6 count — *"the arm lead, timed against the rail biting, is on two clips"* — **becomes three**, and this is the first at 60 fps and the first that can see a hand above a head.

### 0.3 — The camera: raised, near side-on, long lens. It gives the legs back and still cannot measure them.

`engine-target.md` §6 ask 1 is *"footage shot from the water, or down the line — not from the beach"*, because a beach lens puts the board across the image and hides the knee bend. Video 10 sharpened it to *"water-level, side-on, and a rider whose knees are not inside his boardshorts."*

**This clip delivers two of those three and still fails, for a reason nobody has flagged.**

**What it gives:**
- **Bare legs.** The rider wears red boardshorts cut above the knee and no wetsuit. **The knee is never inside the shorts**, which is what defeated video 9's rider B and video 10's five deep frames.
- **A near side-on bearing** for much of the ride, so the knee bend is substantially in-plane rather than pointing at the lens. The knee flexion is **plainly visible as a shape** in dozens of frames.
- **60 fps**, the finest grid in the series.

**What it takes away:**
- **The lens is above the rider's head for the whole ride.** The sea horizon — which sits at the camera's eye level by construction — is at rows **198–530** of the 1920-row frame while the rider occupies rows **~550–1510**. The horizon is above his head in every frame, so the lens is above his head, and since he is standing on a wave face, above the wave crest too. It is **not** a drone: the bearing is near side-on with a long lens, and it pans and zooms.
- **So the head-length ruler fails again, on a second camera.** Apparent stature (head-top to deck ÷ head length) read **7.6 head-lengths at t = 0.500** and **7.5 at t = 7.000** — two postures that are visibly different in depth, and both at or above a standing adult's 7.5–7.7. The mechanism is video 10's exactly: **a raised lens turns a forward fold into a forward translation in the image rather than a vertical shrink.** Video 10 saw this on a drone; this clip sees it on a modest elevation, which means the failure is not a drone problem but a **lens-above-the-rider** problem.
- **And the leg chain is still not measurable — for a third, new reason: resolution and limb overlap.** At 1080p the rider is 440–520 source px, his thigh ~110 px and his shin ~120 px; a 340-px crop blown up 3× magnifies compression artefacts rather than detail, and the two legs overlap in projection through most of the ride. I built a silhouette-outline tool (as video 8 did) and tried crops at 1.9×, 2.1×, 2.5× and 3.0×; **on no frame could I place hip, knee and ankle on both legs to a standard worth quoting.**

> **So I name no rung for any frame in this clip, and nothing here may be quoted as a depth.** This is the third clip in a row to refuse, and the three refusals have three different causes: **projection saturation** (7–9), **a raised lens plus boardshorts** (10), and **resolution plus limb overlap** (11).

**What footage would actually settle it, re-stated:** side-on, **level with the rider or below**, bare-legged, **and the rider at least ~900 source px tall** — which at 1080p means he fills half the frame height, i.e. a much longer lens or a much closer water housing. None of the eleven clips is that shot, and **the pixel-height requirement has never been stated before.**

### 0.4 — The rate: the fastest in the series

| | |
|---|---|
| **Unambiguous direction changes** (the board reverses between climbing and descending, or changes rail) in 10.4 s of riding | **7** |
| Counting the two more I judged likely but did not fully resolve | **9** |
| **Interval** | **one every 1.2–1.5 s** |

Changes at approximately **1.5, 3.5, 4.3, 4.8, 5.7, 7.5, 8.3, 8.8, 10.1 s**. Corroborated independently by the rider's own yaw relative to the camera: his chest is toward the lens at 0.2–7.0 and 8.8–9.3, his back at 7.25–8.5 and 9.9–10.2 — **three ~180° body reversals** in a continuous shot from a roughly fixed bearing.

**Against the series:** V7 had **0 in 13 s**; V9 had one every **2.3 s**; V10 one every **1.2–1.9 s**. **This clip is at V10's fast end or faster, and widens the range the engine must cover rather than narrowing it.**

### 0.5 — The two channels: independent clocks, confirmed; opposite directions, NOT found

The brief named this the single most valuable thing the clip could contain. **I looked and did not find it.**

| window | leg depth | trunk fold | verdict |
|---|---|---|---|
| 6.25 → 6.61 (0.36 s) | holds, flexed | **un-folds 45° → 35°** | **trunk alone** |
| 6.61 → 6.97 (0.36 s) | holds, flexed | **folds 35° → 50°** | **trunk alone** |
| 7.43 → 7.53 (0.10 s) | holds, flexed | holds, ~40° | **arms alone** (board still flat) |
| 7.50 → 7.60 (0.10 s) | **extends** | un-folds slightly | same sign |
| 7.62 → 7.92 (0.30 s) | long | upright 15–20° | both at the tall end |
| 8.70 → 8.80 (0.10 s) | **extends markedly** | holds within ~5° (45° → 40°) | **legs alone** |
| 8.80 → 9.20 (0.40 s) | bends | folds 40° → 52° | same sign |

> **Every resolved transition is either same-sign or one-channel-alone. None is opposite-sign.**
> **V9's opposite-sign passage therefore remains SINGLE and is not reproduced.** V10 abstained (its drone orbit carries ±15°); this clip had a near-side-on lens at 60 fps, looked at seven transitions, and found none.

**But the weaker and still-decisive claim is reproduced three times over:** **one channel moving while the others are frozen** — the trunk alone for **0.36 s**, the legs alone for **0.10 s**, and **the arms alone for ~0.10 s** with the legs bent, the trunk folded and the board flat. That last one is video 10's *"the arms alone for 0.12–0.16 s"*, reproduced on a different camera at a finer grid.

### 0.6 — Lead with the disagreements

| # | this clip | the existing reads | what it does to them |
|---|---|---|---|
| 1 | **One direction change every 1.2–1.5 s**, 9 in 10.4 s | V7: 0 in 13 s. V9: one per 2.3 s. V10: one per 1.2–1.9 s | **Row 8's range widens at the fast end.** Not averaged — it is a fourth point in a spread that is itself the finding |
| 2 | **No opposite-sign channel motion in 7 resolved transitions** | V9 row 3: a 0.6 s opposite-sign passage, SINGLE | **Row 3 stays SINGLE and is now once-not-reproduced.** It remains the right acceptance test for rows 1–2; it is no longer evidence of how often surfers do it |
| 3 | **Trim fold half-cycle ≈ 0.36 s** (6.25→6.61→6.97) | V8 and V9: **0.55–0.60 s**, *"the most reproducible figure the series has"* | **A disagreement.** Weak — one rider, one 0.9 s window, 6 samples at 0.18 s so anything under 0.36 s is unresolvable — but it should be recorded, not averaged in. The clip's other trim window (0.20–1.40) shows **no cycle at all**: trunk steady at 40–45° for 1.2 s |
| 4 | **Head-lengths read 7.6 and 7.5 at two visibly different depths** | The skill calls apparent stature *"the most robust thing available"*; V10 found it fails on a drone | **It fails on any lens above the rider, not only a drone.** Second camera, same failure. The skill's §"report a second, independent ruler" needs the qualification |
| 5 | **Leg chain unmeasurable despite bare legs and a side-on bearing** | §4.1 blames projection saturation; V10 blames boardshorts and spray | **A third, independent cause: source resolution and limb overlap.** The footage ask needs a pixel-height clause (§0.3) |
| 6 | **Arm lead +0.07–0.20 s, 2 of 2 turns, hand above the head, 1/60 s** | engine-target §4.6: *"the lead's reproduction is two clips"* | **Three clips, four riders.** And video 10's abstention on *"above the head"* is settled: **it does go above the head** |
| 7 | **The deepest leg flexion is at the top of the manoeuvre** (8.35–8.65, tucked over the lip), not at entry | Row 13: 8 of 9 readable turns put the low at entry; V6 is the exception | **Not a clean second vote.** The 8.35–8.65 tuck is an airborne/over-the-lip tuck, not a turn's load beat, so it does not belong in row 13's population. Recorded so no later round promotes it |

---

## 1. The source, and what the numbers are worth

### 1.1 Quality

`#movie_player` does not exist on a Short; the player element is `#shorts-player`. It reports `getAvailableQualityLevels() = ["hd1080","hd720","large","medium","small","auto"]` — **1080p is this video's ceiling, as it was video 10's**, so video 9's 1440p ladder is again not a general route. `setPlaybackQualityRange('hd1080','hd1080')` was pinned and `getPlaybackQuality()` confirmed `hd1080` before any measurement frame. `video.videoWidth/videoHeight` = **1080×1920**.

**A consent gate did not appear** on this Short, unlike the gate the skill warns about; nothing was accepted or rejected because nothing was offered.

### 1.2 The frame grid: 60.0 fps, measured

Seeking on a 0.01 s grid from 5.000 to 5.190 and hashing the decoded frame, the picture changes at **5.020, 5.040, 5.050, 5.070, 5.090, 5.100, 5.120, 5.140, 5.150, 5.170, 5.190** — the first 0.01 s sample at or after each multiple of **1/60 = 0.016667 s** (5.0167, 5.0333, 5.0500, 5.0667, 5.0833, 5.1000, 5.1167, 5.1333, 5.1500, 5.1667, 5.1833). **Eleven of eleven boundaries match.** Every 1/60 slot carries a distinct hash, so these are **60 distinct frames per second, not 30 doubled**. A playback pass collapsed to **707–708 distinct frames over 11.78 s = 60.0 fps**.

### 1.3 Slow motion: 2× and 4× excluded, by duration comparison only

The skill asks for **whole-cycle quantities** in preference to manoeuvre durations. **I could not get one.** The obvious candidate — a ballistic fit to recover apparent gravity — fails because the board is **never in free flight** (the yellow-blob tracker found it only 6 times with usable area through 10.13–10.38, and it is being driven by the wave throughout), and individual spray droplets are not resolvable at 1080p.

So the exclusion rests on durations, which have arguable windows:

- the **arm→rail lead** is **+0.07–0.20 s** on 2 of 2 turns; at 2× slow that would be 0.035–0.10 s real, below V9's 0.07–0.10 and V10's 0.12 measured on footage believed near real time;
- the complete **bottom turn → climb → over the lip → landing** runs **7.85 → 8.95 = 1.10 s**, against the published bottom turn **0.96 ± 0.04 s** (n = 6, 835 turns, mixed types — only its duration column carries weight);
- direction changes every **1.2–1.5 s**, against V10's 1.2–1.9 s.

**Verdict: at or near real time.** 60 fps is what a 60p camera gives at real speed. **This is weaker evidence than video 10's pump-half-cycle exclusion and should be quoted with that caveat.**

### 1.4 One ride or a montage: ONE CONTINUOUS RIDE, and I was wrong twice first

**This matters more than usual**, because a "transition" measured across a cut is a fabricated finding.

**I called it a montage twice and both calls were wrong.** A contact sheet at 0.3 s steps and another at 0.5 s steps appeared to show ride → crash → ride → crash → ride → crash in 11.8 s, which is impossible in one shot. Both were **fast action plus a camera zoom, read off thumbnails 170–265 px wide.** Four checks refute the montage reading:

1. **Frame-to-frame luminance on a 27×48 grid at 60 fps**: median **3.59**, 90th pct 5.06, 99th 6.69, **max 7.05** — the largest inter-frame step in the whole clip is **2× the median**. A hard cut between two surf shots is far larger. (A coarser 8×8 grid gave max 3.7 against a median 1.66 — same conclusion.)
2. **The horizon row drifts smoothly** across the entire clip: 135 → 107 (0–3 s), ~108 (3–4.3 s), 107 → 82 (4.4–6.2 s), → 91 (6.3–8.3 s), 90 → 49 (9.0–10.0 s), → 82 (10.6 s), in the 270×480 working frame. The excursions to 153/205/240 at 4.30, 8.28–9.00 and 10.65–11.02 are the gradient detector latching onto a **spray edge** and snap back to the local trend within a few frames.
3. **The red boardshorts' centroid is continuous at 60 Hz.** The only inter-frame steps over 18 px are at 0.747, 5.195 and 7.912, all inside heavy spray where the red pixel count collapses to single digits.
4. **Direct visual verification of the four windows I doubted** — **2.40–3.39, 3.30–3.65, 4.40–5.72, 8.30–9.40** — all unbroken, with the wave, the foam and a background paddler evolving smoothly through them.

Plus continuity of wardrobe and board, the cue the skill says has worked where luminance has not: **red boardshorts, bare torso, yellow deck with red rails, every frame.**

> **One rider, one wave, one camera, one shot, 0 → 11.78 s.** A second person is visible paddling in the background at **2.40–2.76**; they never ride.

**The lesson for the next read:** on footage where every shot would share a rider, a board, a beach and a light, *both* of the skill's cut detectors are blind — and so is a thumbnail. **Only a whole-frame sheet at ≤0.1 s steps settles it.**

### 1.5 What the error bar is here

- **Source 1080×1920.** Rider **374–680 source px** hair-top to feet, typically **440–520**; head ~**55–70 px**; thigh ~**110 px**; shin ~**120 px**.
- **The camera zooms in through the ride**, so apparent size is not comparable between frames. Every ratio below is computed **within a single frame**, where the zoom cancels.
- **Trunk angles** are hand-measured shoulder-to-hip from vertical: **±5°** on the four frames read at 1.15 css/src with a 25-px grid, **±8°** on the six-up sheets.
- **Hip position** carries the skill's standing caveat: a boardshorts waistband sits near 0.60 of stature where the trochanter is at 0.53, so **every hip figure here is ±0.04 of the frame's own body length** at best.
- **The browser pane returns an 800×600 screenshot whatever the viewport**, and at a 1280×1000 viewport the canvas→screenshot scale is **0.781** (so a 1020×764 overlay canvas is the largest that fits — confirmed, matching the skill). `computer zoom` reports *"cropped from a screenshot, not magnified"* and therefore **buys no extra resolution**; that is worth recording, because it looks like it should.

---

## 2. The ride, beat by beat

All times are the player's own clock.

| window | what the board does | what the body does |
|---|---|---|
| **0.00–2.35** | flat, trimming, board angle ~0 to −10° | **trunk folded 40–45°, legs flexed, both hands low over the deck.** Steady — the trunk moves less than ~5° across 1.2 s (6 samples) |
| **2.35–2.95** | a section breaks on him; buried in whitewater | compact, folded, arms in |
| **2.95–3.40** | emerges on a clean face | rises, arms begin to spread |
| **3.40–4.15** | a pivot: board angle **+25° → −8°** | arms spread wide; at 3.70 the rear fist is raised high |
| **4.15–4.60** | up to the lip, board to **+53°** | extended |
| **4.60–5.00** | down off it | folding |
| **5.00–5.70** | driving through foam | **trunk folded 70°+** — among the deepest folds in the clip |
| **5.70–7.20** | riding a clean face, board ~0 to −5° | **the trunk cycles: 45 → 40 → 35 → 40 → 50 → 48°** across 6.25–7.15 |
| **7.25–7.55** | still flat | **the rear arm rises and goes above the head (§0.2)** |
| **7.55–7.95** | bottom turn → climb, board **0° → +52°** | legs extend; **trunk comes upright to 15–20° at 7.86–7.92** — the most upright moment in the ride; both arms spread wide |
| **7.95–8.65** | **over the lip**: board **0° → −84° → +67°**, i.e. through vertical | **the tightest leg tuck in the clip**, heels toward the buttocks, knees out; **both arms high and wide for ~0.8 s** |
| **8.65–9.00** | the board comes flat, nose-down | **legs extend 8.70→8.80 while the trunk holds within ~5°** |
| **9.00–9.85** | riding | **the deepest open-face fold: trunk ~52° at 9.10**, both hands low over the deck |
| **9.85–10.35** | final climb, board **+17° → +52°** | **the rear arm goes up again at 9.90–9.97 (§0.2)** |
| **10.35–11.00** | the board goes over him | the fall |
| **11.00–11.78** | whitewater | rider not visible |

Board angles are the principal axis of the yellow-deck blob, traced at 60 Hz and usable on **265 of 708 frames (37 %)** — the board is often edge-on, occluded by the rider, or buried in spray.

---

## 3. The four channels, each with its own number

### 3.1 Leg depth — **no rung named** (§0.3)

**The leg chain `|hip→ankle| ÷ (|hip→knee| + |knee→ankle|)` was attempted on both legs at 1.92×, 2.14×, 2.46×, 2.65× and 2.99× magnification, with and without a silhouette outline, on frames at 0.200, 1.000, 2.200, 6.600, 7.000, 8.420, 8.500 and 9.500. On none of them could hip, knee and ankle be placed on both legs to a standard worth quoting.** The cause is §0.3's: 110-px thighs at 1080p, and two legs overlapping in projection.

**The one ruler that is internally honest** is in-frame and scale-free: **hip (waistband) above the deck ÷ head-top-to-deck, measured in the same frame.**

| t | hip above deck ÷ head-top-to-deck | what the frame looks like |
|---|---|---|
| 0.500 | **0.56** | trim, trunk 39° |
| 2.200 | **0.59** | trim in broken water, trunk 39° |
| 6.600 | **0.56** | clean face, trunk 39–43° |
| 7.000 | **0.51** | the deeper of the two trim postures, trunk 34° |

**Each ±0.04.** **This is not a percentage of straight-legged standing hip height and must not be placed on `stance-frame.md`'s ladder** — it is a fraction of the rider's own *crouched* apparent length in that frame. Its **changes** are the signal; its level is not.

**Qualitatively:** the legs are flexed for essentially the whole ride; longest at the top of the climb (7.74–7.92); shortest in the tuck over the lip (8.20–8.65, ~0.45 s). **Whether he ever holds a depth below the game's Compress band is untestable here.**

**The second ruler, apparent stature in head-lengths, is reported and then withdrawn:** **7.6 at t = 0.500, 7.5 at t = 7.000.** Two postures a reader can see are different. **The ruler is dead on this camera** (§0.3).

### 3.2 Trunk fold — its own clock, ~60° of travel

Hand-measured, shoulder-to-hip from vertical.

| window | fold | n |
|---|---|---|
| trim 0.20–1.40 | **40–45°**, steady | 6 |
| trim 6.25–7.15 | **45 → 40 → 35 → 40 → 50 → 48°** | 6 |
| climb 7.86–7.92 | **15–20°** | 2 |
| over the lip 8.35–8.65 | **~70°+** | 3 |
| landing 8.70–9.20 | **45 → 40 → 45 → 45 → 52 → 50°** | 6 |
| foam recovery 5.10–5.60 | **~70°+** | 4 |

**Total travel ≈ 15° → 75°, about 60°.** **Third clip to reproduce ≥60°** (V8 17→76°, V9 5→70°) — and the first to do it on a rider who is continuously visible from one camera.

**Independence from leg depth** is shown twice (§0.5): trunk alone for 0.36 s at 6.61→6.97, legs alone for 0.10 s at 8.70→8.80.

> **An automated 60 Hz trunk trace was built and REJECTED.** Taking the angle of the shorts-centroid→head-centroid line, it read **9° at t = 6.60** where direct measurement reads **39–43°**, because this rider's shaded torso classifies as "dark" and the dark-pixel centroid picks up water and limbs. Two further attempts (topmost-skin cluster; flood-filled non-water component) failed the same validation. **No number from any of them appears in this document.** It is recorded only so the next read does not spend a round rebuilding it.

### 3.3 Arm carriage — five carriages, and it does not follow depth

| carriage | windows | count |
|---|---|---|
| **A — both hands low and forward over the deck**, inside the rails | 0.68–1.40, 6.43–6.79, 6.97–7.15, 8.90–9.20 | **4 — the clip's most common** |
| **B — lead arm forward-down at about chest height, rear arm back and low** | 0.20–0.44, 6.25, 8.80 | 3 |
| **C — rear arm above the shoulder/head, lead arm extended down-forward** | 7.30–7.55, 9.90–10.10 | 2 |
| **D — both arms spread wide, one high one low** | 3.39–3.50, 7.86–7.92, 8.65 | 3 |
| **E — both arms high/overhead with the body tucked** | 8.20–8.55 | 1 |

**Carriage A occurs at both a moderate fold (0.68–1.40, trunk 40–45°) and the clip's deepest open-face fold (9.10, trunk ~52°)**, so carriage does not track depth — consistent with V7, V8 and V9 refuting both *"tall ⇒ spread"* and *"deep ⇒ spread"*.

**Carriage A also reproduces engine-target row 15 on a fourth clip** (V7, V8 5 windows, V9 6 windows, here 4). The hands are over the **deck**, usually both at once — not the single hand in the water of a tube ride.

### 3.4 Arm timing — §0.2. **Lead +0.07–0.20 s, 2 of 2 climbing turns, 0 of 2 trim windows, held ≥0.17 s.**

---

## 4. The fore-aft hip axis, and the feet

**Hips aft, shoulders forward, over planted feet.** On every frame where I could place the landmarks — **0.500, 1.100, 2.200, 6.600, 7.000, 9.000, 9.100** — the shoulders sit forward of the hips toward the nose and the hip sits at or just behind the rear foot, with the head forward of the hip. **7 frames.** This reproduces V7, V8, V9 and V10. **No magnitude: direction and sign only**, as in every previous clip.

**Feet: 0 steps.** In the windows where both feet and the deck were legible — **0.20–1.40, 6.25–7.15, 7.25–7.60, 8.70–9.20, about 4.1 s in total** — neither foot changes its place on the deck, judged against the board's own logo and stripes. The rear-view frames at 7.25–7.60 and 9.90–10.10 are the strongest, because both feet and the full deck are square to the lens.

**Stance: regular/natural (left foot forward)**, read from those rear views — the nose is frame-left and, viewed from behind, the rider's left stays on the viewer's left. **Frontside versus backside I could not settle** (§6).

---

## 5. Part B — the mapping

Game-side entries are code readings quoted from `3.5/body-channels.md` and `3.5/engine-target.md`. **Nothing was built, ridden or benchmarked.**

| what the rider does | the game's name for it | have it / partly / not at all |
|---|---|---|
| Trims with the trunk folded **40–45°** over flexed legs, held 1.2 s | Tall or Crouch + `trim` | **partly.** The stance and the move exist; the **fold at a fixed leg depth does not** — `HumanoidRig.ts:1383–1385` makes the drawn trunk an affine function of drawn leg depth, worth ~8° at trim frontside across the whole leg range |
| Cycles the trunk fold ~15° in **0.36 s** half-cycles in trim while the legs hold | `pump` | **not at all.** The game's pump *is* leg depth. The footage wants fold without leg depth; the game has only leg depth without fold |
| Trunk travel **~15° → 75°** across the ride | — | **not at all.** Expressibility limit, not tuning (engine-target row 2) |
| **Rear arm above the head 0.07–0.20 s before the rail bites**, 2 of 2 climbing turns, then **held ≥0.17 s** | entry to `bottom turn` / `carve` | **not at all.** No arm position exists to lead with, and the one orderable pair runs backwards — knees at `MOTOR_LAG` 0.05 s against arms at `ARMS_TIME` 0.15 s, with `KNEE_RETURN_TIME` 0.6 s |
| **Both hands low over the deck**, inside the rails, 4 windows | — | **not at all.** One hand, on/off, pointed at the water, and **the game picks which hand** (`AttachedRider.ts:5720–5732`) |
| **5 arm carriages**, carriage independent of leg depth | — | **not at all.** `HumanBalance.arms` is one scalar, capped by `stanceRoom(depth).arms` and triggered by the same expression that drops the knees |
| **Legs extend while the trunk holds** (8.70→8.80, 0.10 s); **trunk folds while the legs hold** (6.61→6.97, 0.36 s) | — | **not at all.** Within a stage the drawn correlation is exactly +1 |
| **Hips aft / shoulders forward** over planted feet, 7 frames | `trim` weight (W/S) | **not at all** as a differential. `TRIM_SHIFT = 0.25 m` moves pelvis, torso, head and both arms **together** |
| **0 steps** in ~4.1 s of legible feet | — | **have it.** Feet fixed at 0.30 m from the tail and +0.63 m ahead of it; nothing moves them while upright. The one row where the game and the footage agree |
| **9 direction changes in 10.4 s**, one every 1.2–1.5 s | chaining `bottom turn` / `top turn` / `carve` | **not at all.** No chaining notion exists, and the sample cannot be taken while rides end first |
| **Bottom turn → climb → over the lip → landing in 1.10 s**, with distinguishable beats | `bottom turn` + `snap` | **partly.** The moves exist but are **named after the fact** by `rideAnalysis`; there is no beat clock to carry entry/load/peak/exit |
| **Board through vertical (±84°) over the lip** with the body in a tight tuck | `snap` | **partly.** Snap exists and `?snapDepth=deep` gives the tuck; **the board going past vertical does not** |
| **Legs tuck tight for ~0.45 s at the top of the manoeuvre, then extend on landing** | `Compress` / the tube tuck | **partly.** The depths exist and Compress is held (Ruling C); **the arrival of the low at the top of a manoeuvre rather than at its entry is row 13's open question, and this instance does not settle it** (§0.6 row 7) |
| **Rides out of a broken section still standing** (2.35–2.95 and 5.00–5.70, trunk 70°+) | — | **not at all.** No brace posture; and the ride-through is not judgeable while rides end first |
| **The most upright moment of the ride is the climb** (trunk 15–20°, legs long, arms wide, 7.86–7.92) | — | **not at all** as a coupling. Nothing ties an extension to a climb's phase |
| Falls at 10.35 | `wipeout` | **have it** |

---

## 6. Part C — what I could not see, and why

- **The leg chain.** Attempted on 8 frames at five magnifications with a silhouette outline; refused on all of them (§0.3, §3.1). **Resolution and limb overlap**, not projection.
- **Knee angles** to better than about ±20°. Not reported, as videos 6 and 9 also declined.
- **The two legs' split** (V8's 10–12 points at 97/86 and 88/76). Never were both knees unambiguous in one frame.
- **Frontside versus backside.** The camera's bearing relative to the rider changes through the ride — his chest faces the lens at 0.2–7.0 and 8.8–9.3, his back at 7.25–8.5 and 9.9–10.2 — and I could not fix the wave's peel direction against his chest with enough confidence to call it. **The stance (regular) is reported; the orientation is not.**
- **The face and gaze.** The head is 55–70 source px and the features are not resolvable. **Eleventh consecutive clip with nothing for engine-target row 18.**
- **The slow-motion factor by a whole-cycle or ballistic quantity.** The board is never in free flight and spray droplets are unresolvable, so §1.3's exclusion rests on duration comparison alone — **weaker than video 10's**.
- **Any magnitude for the fore-aft hip travel.** Direction and sign only, as in all four earlier clips.
- **11.00–11.78 s.** Whitewater; the rider is not visible and the finder returns nothing.
- **Trunk fold during 8.35–8.65.** Quoted as "~70°+" from the body's visible attitude over the board; the rider is partly behind the board and the shoulder–hip line cannot be placed to ±5°, so the number is coarse and should not be used as a bound.

---

## 7. What this round did not do

- **No file under `src/` or `server/` was touched.** This is evidence, not a fix.
- **Nothing was built, ridden, benchmarked or measured in the game.** Every game-side statement is quoted from `3.5/body-channels.md` or `3.5/engine-target.md`.
- **No constant is proposed, and no stance rung is named for any frame.**
- **The ten earlier video documents were not edited.**
- **No conclusion is drawn about the wave, the lip, the foam or the spray**, which the owner has asked five times.
- **The automated channel traces were built, validated, and discarded** where they failed validation (§3.2). Only the board-attitude trace, the horizon trace, the boardshorts-centroid trace and the frame-grid measurement survived, and each is quoted with its coverage.
