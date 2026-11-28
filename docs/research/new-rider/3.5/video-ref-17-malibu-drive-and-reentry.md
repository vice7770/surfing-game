# Video reference 17 (*FELT SO GOOD*, Malibu storm surf): ten seconds, one re-entry, and the clearest feet in the series since V7 — the front foot at 0.47–0.49 of board length, unmoved, and not one frame where a foot slides

Source: **https://www.youtube.com/shorts/nyABF8GNwrU**, title *"☝️FELT SO GOOD"*, channel `@hunterjoness`, described on the page as *"MALIBU GOES OFF: Hurricane Marie 2.0 (storm surf)"*. Length **10.121 s — the shortest clip the series has read** — and read in full. The **seventeenth** reference the owner has sent.

Delivered to the browser pane at **1080×1920**. `getAvailableQualityLevels()` returns `["hd1080","hd720","large","medium","small","auto"]`, so **`hd1080` is this clip's published ceiling**, with nothing above it; `getPlaybackQuality()` already reported `hd1080` at a 497-px-wide pane, and it was pinned with `setPlaybackQualityRange` and re-confirmed. Stream is **60 fps, measured on a 0.005 s grid over a 13-interval span** (§5.3) — the series' fifth rate and the fastest it has had since clip 11. `playbackRate` 1. `yt-dlp` and `ffmpeg` are both absent from this machine (checked, as the skill asks), so nothing was downloaded; every frame is a screenshot of the browser pane, **tab `tab-1`**, claimed with `tabs_create` and passed explicitly on every call. The pane was **shown** for every measurement. **No consent gate appeared.**

**Every figure below is an estimate from pixels**, and each carries its own error bar.

---

## 0. The answer first

### 0.1 — ⭐ THE OWNER'S LIVE COMPLAINT, WHICH IS WHAT THIS CLIP WAS READ FOR

He is playing and reports: *"the surfer cannot keep himself on the board. He falls when the speed increases, the board sleeps [slips] away from his feet and he falls."* So the question put to this clip was: **what do a real surfer's feet and legs do as speed rises?**

This clip can answer it better than any since V7, because the deck is **bright plain yellow**, the feet are **bare and dark against it**, and the rider is in **boardshorts with no top** — the footage ask, delivered.

| the test | result |
|---|---|
| **Front foot's position along the board, from the nose** | **0.486 at t = 2.50 and 0.472 at t = 4.50, ± 0.04** — hand-read at 1.19–1.45× on 1:1-scale gridded frames, nose and tail both visible in both, **2.0 s apart and agreeing inside the error** |
| **Rear foot** | **0.890 and 0.861 of board length from the nose, ± 0.04**, same two frames |
| **Stance width along the board** | **0.404 and 0.389 of board length** — unchanged inside the error |
| **Any frame where a foot slides or re-places?** | ⭐ **NO. Not one.** Twelve board-anchored tiles at 0.25 s from 1.00 to 3.75, ten more at 0.5 s from 1.00 to 5.50, and every frame of the re-entry sequence (18 at 1/15 s, 15 at 1/60 s, 8 at 1/30 s): the two dark foot patches hold the same places on the yellow deck wherever the deck is legible |
| **Do the feet stay on through the violent part?** | ⭐ **YES, and this is the part that bears on the complaint.** Through the re-entry (6.90–7.13) the board rotates **through vertical** with its bottom to the camera, and the rider's legs are visible on the far side of it: **the feet stay planted and the knees fold.** Nothing slips |
| **Does the body drop into acceleration?** | ⛔ **No rule visible, and the honest answer is "both".** See 0.2 |

> ⭐ **Seventeen clips, zero steps while standing, and no counterexample here either.** Row 17 gains its fourth clip, and the absolute fraction — **0.47–0.49** — **lands on top of V7's 44–49 %**, which is the first time two clips have agreed on *where on the board* a shortboarder stands. (Clip 16's 0.62–0.63 is a **mid-length** board and must not be averaged with these.)
>
> ⚠️ **The complaint is about the engine's rider slipping, and what this clip says is narrower than "real feet never slip":** it says that on this 10 s ride, at every speed in it including a vertical re-entry and a whitewater landing, **the contact is never re-made.** The ankle and knee do the absorbing. **It cannot say what force holds the foot down**, because nothing in a video measures that.

### 0.2 — What happens to body height as the drive builds: **both directions, and one 0.67 s window with nothing moving at all**

Measured as **the head's height above the board's deck under the rider**, in source pixels, on an automatic track **gated to frames where the deck line rests on ≥400 board pixel-columns** (§3.2). The camera's scale drift is bounded in §5.6; **no two numbers more than 0.8 s apart are compared.**

| window | length | head-above-deck | verdict |
|---|---|---|---|
| **2.083 → 2.667** | 0.58 s | **398 → 288 px (−28 %)** | the body **sinks** through the fastest part of the first drive |
| **2.667 → 3.083** | 0.42 s | **288 → 380 px** | and **rises** again |
| **3.083 → 3.833** | 0.75 s | **380 → 304 px** | sinks |
| **4.500 → 5.166** | 0.67 s | **396 → 410 → 410 → 424 → 418 px — flat to ±4 %** | ⭐ **frozen**, and the trunk is frozen with it (35–39° by hand at both ends, §3.3) |

> **So: no "drop into acceleration" rule.** The body sinks and rises repeatedly through the drive, and the single longest stretch I could gate — **0.67 s in the middle of the run** — has **both channels still.** If the engine's rider is falling as speed rises, this clip gives **no evidence that a real rider answers speed with a depth change at all.**

### 0.3 — Which pattern this clip is: **NEITHER clip 15 nor clip 16**

| | clip 15 | clip 16 | **this clip** |
|---|---|---|---|
| direction changes | ≥10 in 18.56 s | **0 in 14.0 s** | ⭐ **exactly 1, in 9.6 s of standing riding** |
| what it is | all turns | all trim | **one long drive, one big manoeuvre, one foam recovery** |

The ride: **0.0–6.5** standing and driving down the line on one heading; **~6.4–6.6** the board rolls onto its rail (its bottom turns to the camera) and climbs; **6.87** a hand goes above the crown; **6.90–7.20** a **vertical re-entry** — the board rotates through vertical at the lip; **7.4–7.6** the landing, inside its own spray; **7.7–9.5** riding out through whitewater, standing, deeply crouched; **9.6–9.8** he **drops to prone deliberately** and the ride ends. Verified on **41 full or near-full frames at 0.25 s**, plus 18 at 1/15 s, 15 at 1/60 s and 8 at 1/30 s through the turn.

> **Row 8's range now has a third point inside it, not just its two ends:** 0 in 14.0 s (clip 16), **1 in 9.6 s (here)**, ≥10 in 18.56 s (clip 15), ≥13 in 30 s (V9). **The engine has to cover a continuum, not two modes.**

### 0.4 — Row 3 under the new counting rule: **4 resolved, 0 decoupled, 0 opposite-sign, 1 frozen**

**Two same-sign down, one same-sign up, one frozen** (§3.3). Under the rule clip 16 added — *folding the trunk lowers the head by itself, so same-sign transitions are nearly free* — **this clip contributes one frozen window and nothing else**, exactly as clip 16 did.

> **Series tally of resolved transitions with no opposite-sign instance: was 43 across six clips; with this clip's 4, 47 across seven clips.**
>
> ⭐ **And decoupling is not reproduced for a second clip running.** Clip 15 found 4 in one ride; clip 16 found 0 of 7; **this clip finds 0 of 4.** So decoupling stands at **4 instances in 1 of the 3 clips that have counted it, and 0 in 11 transitions across the other two.** Any acceptance test built on it must read *"the engine can decouple"*, never *"riders do"*.

### 0.5 — Row 5: **one resolvable direction change, one arm lead, and an ambiguity the series has not had to face before**

At the native **1/60 s** grid: the hand is at **head height and borderline at 6.850**, and **unmistakably above the crown at 6.900, 6.933 and 6.967** (three consecutive native frames). The board's **redirect through vertical** is at **7.20 ± 0.07** (1/15 s sheet: nose up-left at 7.13, nose down at 7.27).

- **Lead over the redirect: +0.33 s ± 0.08**, held ≥0.10 s before the body is occluded by the board.
- ⚠️ **But the rail was set BEFORE the arm.** The board's bottom already faces the camera at **6.60**, the first frame of the turn sequence — so against *"the rail bites"*, as V8 and V9 timed it, **this arm is late, not early.** The two readings are not reconcilable in a vertical re-entry, where the rail is set at the bottom and the redirect happens in the air a third of a second later. **I report both and pick neither.**
- ⛔ **Which arm: not identified.** The rider's **back is to the camera** through the whole window and his body rotates inside it; the raised arm appears on the image-right at 6.850 and image-left at 6.900. **I will not name lead or rear from that.**
- **Wave section: the top of the wave, at the lip.**

**Tally: 16 of 28 across seven clips → 17 of 29 across eight**, if the redirect reading is the one counted. **Record the dissent beside it.**

> ⭐ **And one positive that clip 16 could only infer.** Clip 16 said *"the overhead arm is a turn's gesture, and a rider who does not turn never makes it"* from 14 s with zero turns and zero overhead arms. **This clip has exactly one turn and exactly one overhead-arm window — 6.87→6.97, and nowhere else in 9.6 s of riding.** That is the positive instance of clip 16's negative, on a different rider.

### 0.6 — The rider's size in source pixels, stated before anything was spent

| | |
|---|---|
| **Crown to deck** | **≈ 410–460 px** on the 1:1 frames (hand) |
| **Head-above-deck, the tracked quantity** | **288–428 px** across the gated windows |
| **Board's measured length** when both ends are clear | **390 px (t = 1.00), 436 (2.50), 394 (4.50)** |
| **Head** | ⛔ **not measurable as a length.** Black hair merges into a shadowed back and shoulders in every frame checked; the crown is placeable, the chin is not (§4.3) |
| **Camera** | **from the beach, side-on, zooming through the clip, and THE LENS SITS ABOVE THE RIDER** — the rider's head is below the sea horizon in every full frame checked, by ~15 source px at t = 2.00 and ~330 px at t = 8.60 (§5.6) |

> ⚠️ **Lens height decides row 14 again. Head-length rulers are not licensed, and no depth rung is named anywhere in this document** — the ninth clip running.

### 0.7 — ⚠️ Three things in the brief that this read does not confirm

1. **`engine-target.md` has NOT changed today.** The brief said *"several rows changed today"* and to read its status blocks. **There are no status blocks**, and the file is **byte-identical** (blob `3641c0e4`) on `origin/main` and on **every** video branch 13, 14, 15 and 16. It is still the nine-clip synthesis. The clip 13–16 documents live on their unmerged branches; **nothing has folded them into the table.**
2. **The brief's framing "clip 15 was all turns, clip 16 was all trim, place this one between them" presumes a line with two ends.** This clip is not between them: it is **one of each**, sequentially, inside 10 s. The useful axis is not turns-vs-trim but **how a rider gets from one to the other**, which is the thing the skill says the engine most lacks.
3. **A pump cadence could not be timed the way clip 16's was, and I did not fake one** (§3.4). Two extremes of the four bracket **gaps where the board was not legible**, so they were *not* individually located. The numbers that survive are the half-cycles of §0.2, not a period.

---

## 1. ⚠️ What this clip CANNOT touch, and why

| row | verdict | the reason, named |
|---|---|---|
| **10 — the two legs' split** | ⛔ **refused, ninth clip running, and the gate could not be computed** | §3.1. Three frames attempted at 1.9× on bare legs. **The rider is backlit**: his camera-side legs are one dark red-brown mass with no placeable knee, and in the one frame where the near leg's edge is lit (5.50) **the two legs overlap in projection**. **Thigh/shin ratio not computable on any frame.** Row 10 stays at V8's one clip, two frames |
| **14 — where a rider lives on the ladder** | ⛔ **no rung named, ninth clip running** | No knee (§3.1), and the lens is above the rider (§5.6). The backup ruler is not licensed |
| **2 — trunk angular travel, gated** | ⚠️ **angles read, gate only partly run** | §3.3. The waistband **does** track the pelvis here (red shorts against a bare torso) — the first time in three clips the landmark exists — but **the head length does not exist** (§4.3), so clip 13's ratio gate cannot be formed. I substituted a within-clip gate (projected trunk length at a comparable camera scale) and report angles with ±8–10° |
| **16 — the anticipatory brace** | ⛔ **contact cannot be timed** | §4.4. The landing at **7.4–7.6** happens **inside the rider's own spray cloud**; the body is not visible at the moment of contact. Recorded instead: he is already compressed with the knees drawn up at 6.85–7.13, *before* it, and rides out standing for ~1.9 s |
| **18 — head yaw vs the board** | ⛔ **no yaw, and the cause is the oldest one** | §4.3. **His back is to the camera for essentially the whole ride.** The face is turned away in every frame where the head is large |
| **12 — held vs dipped lows** | ⛔ **no rung, so no band** | What can be said without one: the body's height over the board **has a 0.67 s plateau** (4.50→5.17) and the two minima I could gate are **turning points, not plateaux** |
| **13 — where the low sits in a turn** | ⛔ **not readable** | The turn's entry (the rail set, ≤6.60) is at the edge of the sequence I sampled densely, and the body is behind the board from 7.00 |
| **7 — beats inside a manoeuvre** | ⚠️ **partly** | The re-entry's beats can be given to ±0.07 s but its entry is not bounded (§3.6) |

---

## 2. Method findings

### 2.1 — ⭐ THE SKILL'S SEEK RECIPE IS NOT ENOUGH ON A 60 fps SOURCE, AND THE OUT-OF-ORDER PROBE CAUGHT IT

The probe was run first: ten seeks in the shuffled order **1.0, 5.0, 1.0, 3.0, 5.0, 8.0, 3.0, 8.0, 0.5, 1.0**, hashing a 64×114 decode of each, differencing all 45 pairs.

| recipe | same-time pairs identical | distinct-time pairs identical |
|---|---|---|
| **`seeked` + 30 ms, as the earlier clips used** | ⛔ **3 of 6** | 0 of 39 |
| **`seeked` + 260 ms + a two-decode stability check** | ✅ **6 of 6** | **0 of 39** |

**The failures were one frame off, not one second off** — the two readings of t = 1.000 differed by 75 in a 2.16 M luminance sum. **At 60 fps a frame is 16.7 ms, so a decode that has not settled returns a neighbour, and nothing in the image says so.** The stamp cannot catch this one; only a repeat-visit probe can.

> **The rule this adds: re-visit at least two times twice in the probe and require the hashes to match, and settle ≥250 ms after `seeked` before decoding. A 30 ms settle is a one-frame lottery at 60 fps.**

### 2.2 — ☠️ The composited-canvas failure fired TWICE, and a second screenshot cured it both times

Once on a sheet **I had forgotten to stamp** — caught only because the returned image was recognisably the *previous* sheet — and once on a stamped one, where the stamp read `VAL-1eil6a` when the call had drawn `W-lbt7ji`. **Both times the immediately following screenshot returned the correct render.** A 2.7 s wait inside the draw was in place from the first render and did not prevent either.

> **So the 2.7 s wait is necessary and not sufficient. Stamp every composite with a fresh random token, compare it to the token the call returned, and take a second shot whenever they disagree** — and **never render a sheet without a stamp**, because an unstamped stale composite is indistinguishable from data.

### 2.3 — Four automatic rulers built; **two kept, two discarded, and nothing from the discarded two is quoted**

| ruler | what it did | verdict |
|---|---|---|
| **yellow-board finder** (mask → centroid → principal axis → 0.4/99.6 percentile endpoints) | located the board whenever ≥250 mask pixels survived; its nose and tail **agreed with the eye to ~15 px at t = 2.50 and t = 4.50** on 1:1 gridded frames | ✅ **kept**, and used only as an anchor and as the deck line. **Its board *length* is not quoted as a length** except on the two frames where the eye confirmed both ends |
| **warm-pixel person anchor** (`r − b > 18`) | centred a fixed-size crop on the rider in every frame attempted | ✅ **kept** (anchor only, fixed source size, so the auto-crop size trap cannot fire) |
| **skin/hair head finder** | the "topmost warm pixel" is the **forehead, not the crown**, and the dark-hair crown search **ran away into dark water**: head length came back **49, 50, 116, 129 px** on four frames of the same rider | ⛔ **DISCARDED.** No head length is quoted anywhere |
| **red-shorts hip finder** | the shorts mask **merged with the board's red rail stripe** (bbox 378–424 px wide); after excluding everything below the board it caught only a **16–40 px patch** of the lit corner of the shorts | ⛔ **DISCARDED.** No hip height is quoted anywhere |

> **The first discard is the one worth keeping in the skill: this clip has a visible waistband *and* bare legs — the footage ask — and it still has no measurable head, because black hair against a shadowed back has no lower edge.** Clip 16's ask gains a clause: **the face must be lit *and* turned toward the lens**, or there is no head length and therefore no ratio gate, whatever else the clip gives.

---

## 3. The body channels

### 3.1 — Leg depth: **no rung, ninth clip running, and the cause is backlighting on bare legs**

**(a) The leg chain with clip 12's thigh/shin admissibility gate. Three frames attempted at 1.9× on a 10 px source grid; three refusals; the gate could not be computed in any of them.**

| frame | what the eye sees | why it is refused |
|---|---|---|
| **t = 4.500** | both legs from the waistband to bare feet on the deck, ~260 source px of leg | **The camera-side of the rider is in shadow.** Thigh and shin are one dark column against bright spray; the silhouette curves smoothly over ~50 px with no step, crease or highlight at the knee. **Thigh/shin not computable** |
| **t = 5.500** | the best-lit frame of the run; lit edges on the shin | **The two legs overlap in projection** (clip 11's failure) and the lit edge is partial; the hip–knee segment cannot be separated from the knee–ankle one |
| **t = 1.000** | both legs, board fully visible | **Motion blur.** The leg edges smear over ~13 source px; see §5.6 |

> **This is a ninth clip and the causes now number eight: projection saturation (V7–V9), raised lens plus boardshorts (V10), resolution plus limb overlap (V11), thigh-at-the-lens from behind (V12), both ends foreshortened (V14), knee-in-shorts plus ankle-in-spray (V15), a one-piece wetsuit (V16), and here — **bare legs, large, side-on, and in shadow.** The footage ask gains its last clause: **the rider must be LIT ON THE CAMERA SIDE.** Bare legs are not enough if the sun is behind him.

**(b) Row 10, the split: NOT MEASURED**, and I will not estimate it. **Row 10 stays at V8's one clip, two frames** — the seventh clip running that could not touch it.

**(c) Qualitatively**, the knees are flexed for the whole ride; the deepest folds are at **6.85–7.13** (knees drawn up at the top of the re-entry) and **8.05–8.60** (deep crouch in the whitewater, one hand down at the deck). **No rung is named for any of them and no leg extension is given in any unit.**

### 3.2 — Head-above-deck: the one height this clip can carry

The quantity is **the topmost warm pixel of the rider** (forehead, a consistent landmark — *not* the crown) minus **the board's deck line under him**, in source px. Frames are published **only where the deck line rests on ≥400 board pixel-columns**; everything else is listed as a gap.

| t | head-above-deck (px) | columns |
|---|---|---|
| 2.000 | 374 | 838 |
| **2.083** | **398** *(local max)* | 821 |
| 2.417 | 360 | 1101 |
| 2.500 | 326 | 1251 |
| 2.583 | 310 | 883 |
| **2.667** | **288** *(local min, bracketed on both sides)* | 810 |
| 3.083 | 380 | 562 |
| 3.416 | 358 | 415 |
| 3.500 | 374 | 530 |
| 3.750 | 316 | 1255 |
| **3.833** | **304** | 1199 |
| 4.500 | 396 | 688 |
| 4.583 | 410 | 783 |
| 4.666 | 410 | 719 |
| 5.083 | 424 | 515 |
| 5.166 | 418 | 435 |

**Gaps where the board was lost or nearly lost: 2.167–2.333, 2.750–3.000, 3.166–3.333, 3.916–4.416, 4.750–4.916, 5.250–5.416.** Sampling was **1/12 s** throughout.

⚠️ **This quantity is NOT leg depth.** It contains leg depth, trunk fold and neck pose at once, and the brief asked for them separate — **only this one is measurable here, and it is reported as a height over the board, never as a depth, never in rungs and never in metres.**

### 3.3 — Transitions: four resolved, **0 decoupled, 0 opposite-sign, 1 frozen**

Channel 1 is **head above the board** (§3.2). Channel 2 is **trunk fold**, read by eye, **direction only**, off the board-anchored 0.25 s sheet (1.00–3.75) and off 1:1 frames at 4.50 and 5.167 — never an angle from a strip.

| window | length | head above board | trunk | verdict |
|---|---|---|---|---|
| **2.083 → 2.667** | 0.58 s | **falls 398 → 288** (5 gated samples) | **folds further** | **same sign (down)** |
| **2.667 → 3.083** | 0.42 s | **rises 288 → 380** (a 2-frame gap inside) | **un-folds** | **same sign (up)** |
| **3.083 → 3.833** | 0.75 s | **falls 380 → 304** (5 gated samples) | **folds further** | **same sign (down)** |
| **4.500 → 5.166** | 0.67 s | **flat 396 / 410 / 410 / 424 / 418 — ±4 %** | **35–39° at both ends, hand-read at 1:1, inside my ±8° reading error** | ⭐ **frozen — both channels** |

> **Four resolved transitions: 2 same-sign down, 1 same-sign up, 1 frozen, ZERO decoupled, ZERO opposite-sign.** With the series' 43, that is **47 across seven riders and seven clips with no opposite-sign instance.**
>
> ⚠️ **Clip 16's caution applies in full and is the reason this read is thin here:** the three same-sign rows are **nearly free** — folding the trunk lowers the head by itself — so the only informative row is the frozen one, **and a frozen pair is reachable in the engine today, so it moves nothing.** The informative categories keep coming back empty.

### 3.4 — ⛔ Pump: a rise-and-fall is plainly there, and I am NOT publishing a period

The body rises and falls at least three times between 2.0 and 4.0 s. If the gated extremes of §3.2 were the real ones the arithmetic would be **max→max 2.083 → 3.083 = 1.00 s**, **min→min 2.667 → 3.833 = 1.17 s**, with half-cycles **down 0.58 s, up 0.42 s, down 0.75 s**.

**They are not the real ones.** The 3.083 maximum and the 3.833 minimum each sit **against a gap** where the board was not legible, so neither was individually located — which is precisely the test clip 16 ran and passed and this clip fails. **So no period is published.**

What survives: **the one half-cycle whose extremes are both bracketed — the fall 2.083 → 2.667, 0.58 s, −28 % of head height** — and the observation that **the single rise I could time (0.42 s) is shorter than both falls (0.58, 0.75 s)**, which is **the same sign as clip 16's asymmetry** (rise faster than sink, 3 of 3 there). **One agreeing instance against a gap is not a reproduction, and it is offered as nothing more.**

### 3.5 — Arm carriage: four carriages in 9.6 s, and the overhead one happens exactly once

Windows counted only where sampled at ≤0.25 s.

| carriage | windows | count |
|---|---|---|
| **A — both hands low and forward over the deck**, inside or just outside the rails | 1.25, 2.50–2.75, 3.25, 3.75, 5.50, 8.05–8.60 | **6 windows — the dominant carriage** |
| **B — lead arm extended forward-and-down past the rail**, rear arm back and low | 1.00, 2.00, 3.50, 4.50 | 4 |
| **C — both arms spread wide, roughly level, at waist-to-chest height** | 1.50, 2.25 | 2 |
| **D — a hand above the crown** | **6.900, 6.933, 6.967** (three consecutive native frames), borderline at 6.850 | **1 window, 0.10 s, and it is the turn** |

**Carriage A reproduces `engine-target` row 15 on a TENTH clip** (V7 4 windows, V8 5, V9 6, V11 4, V12 ≥8, V13 6, V14 6, V15 6, V16 7, here 6).

⭐ **On row 4**, carriage A is held across **2.50 → 2.75** while the head height falls 326 → 312 → (min 288 at 2.667), i.e. **through a depth change**, and carriage B occurs at both a high body (2.00, h = 374) and a low one (4.50, h = 396 but deeply folded). **The arms are not a function of the depth.**

### 3.6 — The re-entry, in beats

| beat | window | what moves |
|---|---|---|
| **rail set** | **≤ 6.60** (first frame of the sequence; the board's bottom already faces the camera) | not bounded on its early side — **the entry is older than my sampling** |
| **climb** | 6.60 → 6.85, **0.25 s** | the board rotates nose-up; the rider's knees draw up under him |
| **arm** | **6.87 ± 0.03** | a hand above the crown, held ≥0.10 s |
| **redirect** | **7.20 ± 0.07** | the board passes through vertical and the nose swings down |
| **landing** | **7.40 → 7.60** | inside the rider's own spray; the body is not visible |
| **recovery** | 7.70 → 9.50, **1.8 s** | standing, deeply crouched, both hands low, riding whitewater |

**Climb-to-landing ≈ 0.80–1.00 s**, which sits inside the published bottom-turn/cutback band quoted in `stance-frame.md` §6 and is **the strongest single argument that this clip runs at real time** (§5.4).

---

## 4. The fore-aft axis, the feet, and the head

### 4.1 Hips aft, shoulders forward — 4 frames, and a twelfth clip for the pattern

On the 1:1 frames where the waistband and the shoulder line were both placeable — **1.00, 2.00, 4.50, 5.167** — the **shoulders sit forward of the hips toward the nose** in all four. **Direction and sign only; no magnitude**, as in every previous clip. ⚠️ Weaker than clip 15's: the shoulder point is the top of a shadowed back.

**Trunk angle from vertical**, hand-read from the waistband centre to the mid-shoulder on 1:1 gridded frames, **± 8–10° each**: **44° (t = 1.00), 53° (t = 2.00), 35° (4.50), 39° (5.167)**. The within-clip foreshortening check — the **projected** shoulder-to-waistband length at a comparable camera scale — reads **164 and 162 px** at t = 1.00 and 2.00, i.e. **consistent to 1 %**, so those two are not differently foreshortened and their 9° difference is real. **No head-length ratio gate was possible (§2.3), so these are reported as angles with a within-clip consistency check, not as gated angles.**

### 4.2 Feet: ⭐ **the clearest in the series since V7**

Hand-read on 1:1-scale gridded crops (mag 1.19 and 1.45, 20 px source grid), with the board's nose, tail and both foot contacts read in the **same** image:

| t | board length (px) | front foot, fraction of board length from the nose | rear foot | stance |
|---|---|---|---|---|
| **2.500** | 436 | **0.486 ± 0.04** | **0.890 ± 0.04** | **0.404** |
| **4.500** | 422 | **0.472 ± 0.04** | **0.861 ± 0.04** | **0.389** |

**Two frames, 2.0 s apart, agreeing inside the error. No step detected anywhere in the clip.**

⚠️ **The error is dominated by the foot-contact landmark, not the board:** the dark notch where a foot meets the yellow deck spans ~40 source px (a foot is ~0.13 of a board), so the contact point is placeable to about ±15 px = ±0.04 of board length. **A third frame (t = 1.000) read 0.55 / 0.90 and is DISCARDED as a measurement** — it is the most motion-blurred frame of the three and the blur is ~13 px on every edge.

> **Against V7's 44–49 % of board length for the front foot: these two frames are 47–49 %.** Two clips, two riders, two shortboards, **agreeing** — the first time row 17 has had an absolute number reproduced. **Clip 16's 0.62–0.63 is a mid-length and stays separate.**

**And the part that answers the owner directly:** through the re-entry at **1/60 s** (6.767 → 7.000, 15 frames) and **1/30 s** (6.900 → 7.133, 8 frames), with the board rotating through vertical and its bottom to the camera, **the feet never leave the deck and never change place on it.** The knees fold instead. The one window I cannot see is **7.40–7.60**, inside the landing spray.

### 4.3 Head and gaze — ⛔ refused, and the cause is the plainest one yet

**The rider's back is to the camera for essentially the whole ride.** The face is turned away in every frame where the head is large; where he looks across the heading (6.85) the head is a dark mass of hair against a bright sky. **No yaw. And no head *length* either**: the black hair merges into the shadowed back and shoulders, so the chin has no edge — which is what killed §2.3's ruler and, with it, row 2's ratio gate.

> **`engine-target` row 18 should not be given a number. The footage ask gains a clause: the camera must be on the rider's CHEST side, not his back.**

### 4.4 Whitewater — ⛔ no timable contact, and a recovery worth recording

The landing at **7.40–7.60** is **inside the rider's own spray cloud** — the board is visible, the body is not. So **row 16 gets no third instance of the anticipatory brace.** What is recorded, because it is what the owner is asking about: **the rider is already compressed with the knees drawn up from 6.85, before the landing**, and **he rides out of the whitewater standing for ~1.8 s (7.70 → 9.50)**, deeply crouched with both hands low over the deck, before **choosing** to drop to prone at 9.60–9.80. **The ride ends by decision, not by falling.**

---

## 5. The source, and what the numbers are worth

### 5.1 Delivery

`#movie_player` does not exist on a Short; the player is `#shorts-player`. `getAvailableQualityLevels()` returns **`["hd1080","hd720","large","medium","small","auto"]`** — **1080p is the hard ceiling**, no `hd1440`, no `hd2160`. Unusually, **`getPlaybackQuality()` already read `hd1080` at a 497 px pane**, before any enlarge-and-reload; it was pinned anyway and re-confirmed. `videoWidth/videoHeight` = **1080×1920**. **Eighth clip, eighth set of delivery facts.**

**Two `<video>` elements were present from the first load** (one with `videoWidth = 0`). Every call selects by `videoWidth > 0`.

⚠️ **And a pane hazard worth recording: the Browser pane dropped every tab mid-session.** After a `resize_window` + `navigate`, `tabs_context` returned a single `seed` tab and my claimed `tab-3` was gone; I re-claimed `tab-1` with `tabs_create` and re-navigated. **Everything in this document was measured in `tab-1` after that point**, and nothing from before it is quoted except the quality ladder, which was re-read afterwards.

### 5.2 Pane geometry — clips 12–16's result reproduced a sixth time

At **800×640** the screenshot comes back **800×640** and the canvas→screenshot scale is **exactly 1.000**, verified against a drawn ruler (ticks at 0…700 px landed at 0…700). **Every measurement frame was taken at that viewport**; survey strips were used only to find moments. ⚠️ **The viewport emulation is cleared by the app between turns** — one screenshot came back **800×1205** with the canvas at 1.6×, and it was discarded. **Re-set the viewport and re-check the scale after any gap.**

### 5.3 The frame grid: ⭐ **60 fps**

Seeking on a **0.005 s** grid and hashing a 48×85 decode: the picture changes at **4.020, 4.035, 4.050, 4.070, 4.085, 4.105, 4.120, 4.135, 4.150, 4.170, 4.185, 4.200, 4.220, 4.235** — **13 intervals spanning 0.215 s, mean 0.01654 s = 1/60.5.** At 1/50 those 13 intervals would span 0.260 s and at 1/30, 0.433 s. **Measured: 0.215 s.**

> **Five rates in seventeen clips — 60, 30, 25, 24 and 60 again.** Here the rate mattered in the other direction from clip 16's: **a 1/30 step would have been perfectly usable for the body, but the 1/60 grid is what resolved the overhead arm to three consecutive frames** and it is what exposed §2.1's one-frame decode lottery.

### 5.4 Slow motion: excluded, with a duration check this time

1. **Manoeuvre duration.** The climb-to-landing is **0.80–1.00 s**, which matches the published bottom-turn figure (0.96 ± 0.04 s, n = 6, 835 turns) quoted in `stance-frame.md` §6. At 2× slow it would be a 0.4–0.5 s re-entry, which nothing does.
2. **Motion blur.** The t = 1.000 frame smears the leg edges over ~13 source px, consistent with a normal shutter at 60p.
3. **Plausibility.** The paddle-free, continuous drive and the 0.42–0.75 s body half-cycles are ordinary rates.

**Verdict: at or near real time, on a duration check plus blur** — stronger than clip 16's, which had no manoeuvre to time.

### 5.5 Shot structure: **one continuous shot, one rider, 0 → 10.121 s**

- **Top-third luminance detector** (32×16 grid over the upper third, mean absolute difference at 0.1 s, **102 samples over the whole clip**): **0.15–0.9 through 0.3–2.2 s**, rising **smoothly** to 2–3 (2.3–2.6), 0.5–1.5 (2.7–4.7), 1–2.5 (4.8–6.5), **4–6.4 (6.9–8.2)** as the re-entry's spray crosses the upper third, then **1–3.4 (8.3–10.1)**. **There is no step anywhere**, and the largest values are a spray plume, not a cut.
- **The subject-change check, run because clip 16 was burned by it.** The board *appears* to change colour at 8.0 — yellow before, orange-red after. Checked at **0.72×** on 7.80, 8.05, 8.60 and 9.75: it is **the same board**, a yellow deck with a wide **red-orange rail stripe**, seen from a different roll angle. The rider is the same in all of them — black hair, bare torso, **red boardshorts** — and the same at 1.00 and 5.50.
- Full frames were inspected at **0.5 s across the whole clip, 0.25 s across the whole clip, 0.1 s from 7.0 to 9.0, 1/15 s from 6.60 to 7.73, 1/60 s from 6.767 to 7.00, 1/30 s from 6.90 to 7.13, and 0.15 s from 9.30 to 10.05.** One beach, one rider, one board, one lens drift.

> **0.0–0.3 the rider is already standing** (the take-off is not in the clip); **0.3–6.5** he drives down the line; **6.6–7.6** the re-entry and its landing; **7.7–9.5** riding whitewater; **9.6–9.8** down to prone; **9.9–10.12** the board alone in foam, the camera zoomed out to the beach.

### 5.6 What the error bar is

- **Source 1080×1920** — the clip's ceiling. **Rider 410–460 px crown-to-deck; head-above-deck 288–428 px; board 390–436 px.**
- ⚠️ **The camera zooms and pans continuously** and ends **zoomed out** (the rider is ~80 px at 10.05). **The board's own length — 390 px at t = 1.00, 436 at 2.50, 394 at 4.50 — bounds the scale drift at roughly ±10 % over 1.0–4.5 s**, so **no two heights more than 0.8 s apart are compared anywhere in this document**, and §0.2's "flat to ±4 %" window is 0.67 s long.
- ⚠️ **Motion blur is a real limit at 60p in bright sun**: ~13 source px on limb edges at t = 1.000, which is why that frame's foot fractions are discarded.
- ⚠️ **No leg depth, no rung, no leg split, no head length, no head yaw** (§3.1, §4.3).
- ⚠️ **Trunk angles carry ±8–10°** and come from 1:1 gridded frames only, with a within-clip projected-length check, **not** a head-length gate.
- ⚠️ **Two of four automatic rulers were discarded and nothing from them is quoted** (§2.3).
- **Rider-centred crops were FIXED-SIZE** at a fixed magnification per sheet, anchored on the board's or the rider's centroid, so the auto-crop size trap could not fire.
- **The lens is RAISED.** The sea horizon sits above the rider's head in every full frame checked — by ~15 source px at t = 2.00 (nearly level) and ~330 px at t = 8.60. **Head-length rulers are not licensed.**

---

## 6. Part C — what I could not see, and why

- **Any knee as a joint**, in three frames at 1.9× on **bare** legs — the rider is backlit and the legs read as one dark mass; where one edge is lit the legs overlap.
- **Any face, and therefore any head length and any gaze** — his back is to the camera for the whole ride.
- **The moment of foam contact** at 7.4–7.6; it is inside his own spray.
- **The turn's entry**: the board was already on its rail in the first frame of my dense sequence, so the rail set is only bounded as **≤ 6.60**.
- **Anything before 0.3 s** as riding: the clip opens with the rider already up.
- **Whether the clip is horizontally mirrored**, which short-form reposts do; **so no frontside/backside and no regular/goofy claim is made**, and that is also why the raised arm is not named lead or rear.
- **A pump period**, because two of four extremes bracket gaps (§3.4).
- **Anything above 1080p.** The clip publishes nothing higher.

---

## 7. What this round did not do

- **No file under `src/` or `server/` was touched.** This is evidence, not a fix.
- **Nothing was built, ridden, benchmarked or measured in the game.** Every game-side statement is quoted from `3.5/engine-target.md` or `3.5/body-channels.md`.
- **No constant is proposed, and no stance rung is named for any frame.**
- **No leg extension is given in any unit**, because the knee is not identifiable as a joint.
- **No pump period is published.**
- **`engine-target.md` was not edited**, and the sixteen earlier video documents were not edited.
- **Two automatic rulers were built and discarded, and nothing from them is quoted.**
- **No conclusion is drawn about the wave, the lip, the foam or the spray.** One line, because it is the context the numbers sit in: it is a **steep, fast, head-high storm-surf wall with a throwing lip** — which is why there is something to hit, and why the single manoeuvre is a vertical re-entry rather than a trim line.

---

## 8. Part B — the mapping

Game-side entries are **code readings quoted from `3.5/engine-target.md` and `3.5/body-channels.md`**. **Nothing was built, ridden or benchmarked.**

| what the rider does | the game's name for it | have it / partly / not at all |
|---|---|---|
| **Keeps both feet in the same place on the deck for the whole ride — front foot 0.47–0.49 of board length from the nose at t = 2.50 and 4.50, stance 0.39–0.40 — through a drive, a vertical re-entry and a whitewater landing** | row 17 (feet fixed by construction) | ✅ **already correct — and this is the strongest confirmation row 17 has had.** Two measured frames plus ~60 frames of "no step seen", on a board whose deck is legible |
| **Answers rising speed with the knees and ankles, not with a new foot position** | — | **not at all as a quantity.** The game has one leg spring (`AttachedRider.ts:2084`); it has no notion of the contact being *kept* |
| **Body height over the board falls 28 % in 0.58 s, rises in 0.42 s, and then holds flat for 0.67 s mid-drive** | `pump` / leg depth | **partly.** A cycle exists, but it is symmetric by construction, and **a 0.67 s plateau inside a drive is reachable only by the player holding still** |
| **One direction change in 9.6 s — a vertical re-entry — between two long stretches with none** | `top turn` / `snap` (named after the fact by `rideAnalysis`) | **partly.** The move has a name; **nothing chains it to the drive before it or the recovery after it** (row 8) |
| **A hand above the crown for 0.10 s, 0.33 s before the board's redirect, and nowhere else in the ride** | — | **not at all.** No arm position exists (row 4), so there is nothing for a lead to be visible in; and **the lead must be conditional on a direction change**, which clip 16 asked for and this clip's single instance confirms |
| **Four arm carriages, the dominant one both hands low over the deck in 6 windows; carriage held through a depth change** | `hand` input | **not at all.** One hand, on/off, pointed at the water, side chosen by the game (`AttachedRider.ts:5720–5732`) |
| **Trunk folded 35–53° throughout, moving 9° between two frames 1 s apart with the same projected length** | — | **not at all.** The drawn trunk is a one-line function of drawn leg depth (`HumanoidRig.ts:1383–1385`); row 2 |
| **Knees drawn up under the body at the top of the re-entry, before the landing** | — | **not at all.** No brace posture; row 16 |
| **Rides out of whitewater standing for 1.8 s, then CHOOSES to drop to prone** | — | **not at all.** A ride that ends by decision has no representation; the game's rides end by falling |
| **Shoulders forward of the hips over planted feet, 4 frames** | `trim` weight (W/S) | **not at all** as a differential. `TRIM_SHIFT = 0.25 m` moves pelvis, torso, head and both arms together |
| **Back to the camera, head turned down the line** | — | **not at all.** Row 18, still with no number |

---

## 9. Rows this clip moves, and how

| row | the measurement | the population | which way it moves |
|---|---|---|---|
| **17** | ⭐ **Front foot at 0.486 ± 0.04 and 0.472 ± 0.04 of board length from the nose at t = 2.50 and 4.50; rear foot 0.890 and 0.861; stance 0.404 and 0.389. No step or slide in any frame checked — 12 board-anchored tiles at 0.25 s, 10 at 0.5 s, and the whole re-entry at 1/15, 1/30 and 1/60 s** | 2 measured frames 2.0 s apart; ~60 frames of "none seen"; 1 rider, 1 shot | ⭐ **Row 17's first reproduced ABSOLUTE figure.** V7 measured 44–49 % on a shortboard; this is 47–49 % on another shortboard, by a different method on a different continent. Clip 16's 0.62–0.63 is a mid-length and stays separate. **And the owner's complaint gets its direct answer: the feet are never re-placed, at any speed in this clip** |
| **16** | ⛔ **Contact cannot be timed** — the landing is inside the rider's own spray. Recorded: knees drawn up and body compressed from **6.85, before the landing at 7.40–7.60**, and **1.8 s of standing recovery through whitewater** afterwards | 1 window | **No third instance of the anticipatory brace.** Clip 15's two-clip finding is neither added to nor contradicted. ⭐ **But the recovery is new: a rider who meets foam compressed rides out of it standing and then chooses to lie down** |
| **5** | ⭐ **One resolvable direction change. Hand above the crown at 6.900, 6.933, 6.967 (native 1/60 s), borderline at 6.850; board's redirect through vertical at 7.20 ± 0.07. Lead +0.33 s ± 0.08, held ≥0.10 s** — ⚠️ **but the rail was already set at 6.60, before the arm** | 1 turn, 1 rider, native 1/60 s | **17 of 29 across eight clips** if the redirect is what is timed; **a miss** if the rail set is. ⭐ **The ambiguity is the finding: in a vertical re-entry the rail is set at the bottom and the redirect happens a third of a second later in the air, so "the arm leads the rail" is not one event.** ⛔ **Which arm: refused** — his back is to the camera and he rotates inside the window |
| **3** | ⭐ **Four resolved transitions with both channels legible: 2 same-sign down, 1 same-sign up, 1 frozen, ZERO decoupled, ZERO opposite-sign** | 4 windows, 0.42–0.75 s, 5–9 samples each, 1 rider | **The no-opposite-sign count goes 43 → 47 across seven clips.** ⭐ **Decoupling is NOT reproduced for a second clip running: 4 of 4 in clip 15, 0 of 7 in clip 16, 0 of 4 here.** ⚠️ And clip 16's accounting rule bites: the three same-sign rows are nearly free, so **this clip contributes one frozen window and nothing else** |
| **8** | ⭐ **Exactly ONE direction change in 9.6 s of standing riding**, verified on 41 frames at 0.25 s plus 41 more at 1/15–1/60 s through the turn | 1 ride, 1 rider, 1 unbroken shot | **Row 8 gains an interior point, not another end.** 0 in 14.0 s (V16), **1 in 9.6 s (here)**, ≥10 in 18.56 s (V15), ≥13 in 30 s (V9). **The engine must cover a continuum** |
| **6** | ⚠️ **Half-cycles 0.58 s down, 0.42 s up, 0.75 s down, head-above-board excursion −28 % on the one fully bracketed fall (2.083 → 2.667)** | 3 half-cycles, 1 rider, 1 window, **2 of 4 extremes against gaps** | ⛔ **NO PERIOD PUBLISHED** — the extremes were not individually located, which is the test clip 16 passed and this clip fails. ⚠️ The half-cycles **straddle** row 6's 0.55–0.60 s band rather than confirming it. ⭐ **The one rise is faster than both falls, the same sign as clip 16's asymmetry — one agreeing instance, not a reproduction** |
| **4** | **Four carriages in 9.6 s; carriage A (both hands low over the deck) in 6 windows; carriage A held across 2.50 → 2.75 through a falling body; carriage B at both a high body and a low one** | 4 carriages, 13 windows, 1 rider | **Row 4 holds.** ⭐ **And carriage D — a hand above the crown — occurs exactly once, in the clip's only turn**, which is the positive instance of clip 16's negative ("a rider who does not turn never raises a hand") |
| **15** | **Both hands low and forward over the deck in 6 windows**, each verified at ≤0.25 s, including the whole whitewater recovery | 6 windows | **Tenth clip for row 15.** V7 4, V8 5, V9 6, V11 4, V12 ≥8, V13 6, V14 6, V15 6, V16 7, here 6 |
| **9** | **Shoulders forward of the hips toward the nose in 4 frames** at 1:1 | 4 frames | **Twelfth clip for the pattern. Direction and sign only; no magnitude.** ⚠️ Weaker than clip 15's — the shoulder point is the top of a shadowed back |
| **2** | ⚠️ **Trunk angles ARE readable here — 44°, 53°, 35°, 39° (±8–10°) — because the red waistband tracks the pelvis against a bare torso.** But **the ratio gate could not be formed**: there is no measurable head length (black hair into a shadowed back), so a within-clip projected-length check was substituted (164 vs 162 px at t = 1.00 and 2.00) | 4 frames, 1 rider | ⚠️ **The series still has NO gated measurement of trunk angular travel, now across seventeen clips** — but for a **new** reason. Clip 15 lost the waistband, clip 16 lost it to a wetsuit; **this clip has the waistband and loses the head.** **The footage ask gains a clause: the face must be LIT and turned toward the lens** |
| **10** | ⛔ **NOT MEASURED. Three frames attempted at 1.9× on BARE legs; the thigh/shin admissibility ratio could not be computed on any of them** | 3 frames attempted | **No change. Row 10 stays at V8's one clip, two frames** — the seventh clip running that could not touch it. ⭐ **An eighth distinct cause, and the one that most sharpens the ask: bare legs are not enough — the rider must be LIT ON THE CAMERA SIDE.** Here he is backlit and the legs are one dark mass |
| **14** | ⛔ **No rung named, ninth clip running.** No knee, no head length, and the lens sits above the rider in every frame | — | Unchanged |
| **11** | ⛔ **REFUSED.** With no knee and no separable leg channel, "legs" and "trunk" are not two measurable things here | — | **Unchanged.** Three forms, each still SINGLE except V9's "legs only", which clip 15 reproduced twice |
| **12** | ⚠️ **No rung, so no band.** What can be said without one: the two gated minima are **turning points, not plateaux**, and the one plateau in the clip is at a **mid** height (396–424 px, 0.67 s), not a low | 2 minima, 1 plateau | **Weakly on the "dip" side for the lows; and the plateau is an observation row 12 has no slot for** |
| **18** | ⛔ **No yaw, and the plainest cause yet: his back is to the camera for the whole ride** | ~20 frames observed | ⛔ **The footage ask gains a clause: the camera must be on the rider's CHEST side.** V13 had the face and not the nose; V14 the nose and not the head; V15 a 90 px head lost to backlight; V16 a 40 px head lost to a cap brim; **here a large head that is never turned toward the lens** |
| **7** | **The re-entry's beats: climb 0.25 s (6.60 → 6.85), arm 6.87, redirect 7.20 ± 0.07, landing 7.40–7.60, recovery 1.8 s. Climb-to-landing ≈ 0.80–1.00 s** | 1 manoeuvre | **A fourth timed manoeuvre for row 7**, and the first **vertical re-entry**. ⚠️ Its entry is only bounded as **≤6.60**, so the full beat structure is incomplete |

**Method results that belong in the skill, not in a row:** §2.1's finding that **the `seeked` + 30 ms recipe returns a one-frame-off decode on a 60 fps source — 3 of 6 same-time probe pairs disagreed — and that a 260 ms settle plus a two-decode stability check fixed it (6 of 6, 0 of 39)**; §2.2's record that the **composited-canvas failure fired twice despite a 2.7 s wait and that a second screenshot cured it both times — and that an unstamped sheet is indistinguishable from data**; §2.3's record that **two of four automatic rulers were discarded, one of them because black hair against a shadowed back has no lower edge, which is what also killed row 2's gate**; §5.1's record that **the Browser pane dropped every tab mid-session and the claimed tab had to be re-made**; §5.2's note that **the viewport emulation is cleared between turns, and one screenshot came back at 1.6× scale and had to be discarded**; and §5.5's confirmation that **a board appearing to change colour is a rail roll, not a second rider — checked at 0.72× before it was believed.**
