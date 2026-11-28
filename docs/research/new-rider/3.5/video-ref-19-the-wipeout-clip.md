# Video reference 19 (*where the head goes, the body follows*, @hunterjoness): **13.9 seconds that END IN A WIPEOUT — the first the series has read — and the board comes out from under him exactly the way the owner says it does in the game**

Source: **https://www.youtube.com/shorts/V8SCdpuYnKM**, title *"where the head goes, the body follows"*, channel **`@hunterjoness`**. Length **13.921 s**, read in full. The **nineteenth** reference the owner has sent.

> ⚠️ **Third clip in a row from this one poster.** Clip 17 (*"☝️FELT SO GOOD"*) and clip 18 (*"this felt sooooo good 🤲🏽"*) came from `@hunterjoness` too. **This is a different rider and a different session from both**: clip 17's rider was bare-chested in red boardshorts on a yellow-decked board, clip 18's wore a black top over black boardshorts on a white board; **this rider wears a one-piece black wetsuit — long sleeves and full legs — on a yellow board with a red/orange rail stripe and a dark deck logo**, in flat overcast light on teal water. **Three clips from one poster in four days; the series should expect more and should keep checking the subject rather than assuming.**

Delivered to the browser pane at **1080×1920**. `getAvailableQualityLevels()` returns `["hd1080","hd720","large","medium","small","auto"]`, so **`hd1080` is this clip's published ceiling**; it was already serving `hd1080` and was pinned with `setPlaybackQualityRange` and re-confirmed. Stream is **60 fps (59.94)**, measured twice on a 0.005 s grid (§5.3) — the series' seventh measurement and **the third 60p in a row**. `playbackRate` 1. `yt-dlp` and `ffmpeg` are both absent from this machine (checked, as the skill asks), so nothing was downloaded; every frame is a screenshot of the browser pane, **tab `tab-2`**, claimed with `tabs_create` and passed explicitly on every call. **No consent gate appeared.**

**Every figure below is an estimate from pixels**, and each carries its own error bar.

---

## 0. The answer first

### 0.1 — ⭐⭐ THE HEADLINE: **THE RIDE ENDS IN A WIPEOUT, AND THE MECHANISM IS THE OWNER'S OWN COMPLAINT**

**Nineteen clips, and this is the first one in which the rider falls.** Clip 18 simply stopped while he was still riding; clip 17 "ended by decision"; every earlier clip either cut away or ran out. **Here the ride ends because the board leaves him**, in frame, at 60 fps, over about half a second.

The owner's standing report of the game is: *"The surfer stands 1 second in the board, falls down due to the board slipping under him either in compress or not."* **This clip is a real surfer losing a board out from under him, and the sequence is legible.**

| t | what the board does | what the body does |
|---|---|---|
| **12.20 → 12.56** | buried in whitewater, nose **left and down**, rider driving through a foam section | ⭐ **trunk folded to near-horizontal, head down near hip height, arms low and back** — held across **5 frames at 0.09 s** (§3.4) |
| **12.59 → 12.71** | the nose begins to **pitch up** out of the foam | the trunk **un-folds**, the head comes up, both arms begin to rise |
| **12.75 → 12.87** | the nose passes the rider's **shoulder**, then his **head** | **both arms thrown up and out**, trunk upright, rider waist-deep in whitewater |
| **12.870** (measured, 1:1) | board's in-image long axis at **≈52° from horizontal**, nose at source **(741, 609)** — **above and behind the crown at (650, 689)** | both hands out, left at source **(420, 710)**, right at **(859, 614)** — i.e. **the right hand is 75 px above the crown and the left 21 px below it** |
| **12.91 → 12.99** | board continues up and away, separating | arms still spread, body upright, feet invisible in foam |
| **13.05 → 13.15** | gone | rider leans back, arms drop, loses the platform |
| **13.20 → 13.35** | — | ⭐ **airborne, limbs out, head going down** |
| **13.40 → 13.55** | — | **lands in the water; by 13.55 only whitewater is in frame** |

> ⭐ **Three things in that sequence that the engine cannot currently do, and they are the clip's contribution:**
>
> 1. **The board's nose pitches up THROUGH the rider's own height while he is still standing on it.** The loss takes **≈0.36 s from the first visible pitch (12.63) to clear separation (12.99)** — it is not instantaneous, and **the rider spends all of it trying to stay on**.
> 2. **The response is ARMS, not legs.** Across 12.59 → 12.99 the arms go from low-and-back to fully up-and-out. **There is no visible attempt to crouch.** The body goes *taller*, not lower, as the board escapes.
> 3. **He stays upright for ~0.4 s after the board is past vertical.** The fall itself (13.05 → 13.40) is a separate, later event.
>
> ⚠️ **What this clip CANNOT say, and the limit is hard:** **his feet are never visible from 12.20 onward** — he is in whitewater to the waist. **So I cannot say whether the board left his feet before or after the nose came up, and I cannot say what, if anything, slipped.** The observable is the board's attitude and the body's response, not the contact.
>
> ⚠️ **And one honest deflation: this is a wipeout in a foam section at the end of a 13-second ride, not a take-off failure.** The owner's complaint is about falling **one second after standing**. **This clip has no take-off at all** (§0.3), so it cannot address the first second. It addresses a *different* fall.

### 0.2 — ⭐⭐ ROW 5's RE-BASE, WITH A NUMBER: **THE SHOULDER-LINE TEST FIRES 0.10 s BEFORE THE CROWN TEST, AND THEY DO NOT EVEN COUNT THE SAME NUMBER OF ARMS**

The brief asked for the arm reported **against the shoulders** and **against the head**, so the series can re-base. **This clip measures both on one arm in one turn, from gridded frames, and they are not the same event.**

The turn: a **vertical re-entry at 9.47 → 9.95**, read at the native frame grid.

| event | time | how it was obtained |
|---|---|---|
| board leaves flat / begins to roll and tilt | **9.49 ± 0.03** | bracketed by eye on native 1/60 s tiles (9.468 flat, 9.502 tilting) — **a bracket, not a measurement** |
| ⭐ **a hand first passes the SHOULDER LINE** | ⭐ **9.528 ± 0.026** | **two measured gridded frames.** At **9.502** (mag 1.5, source grid) both hands are at source y **840** against a shoulder line at **817** — **23 px below**. At **9.553** (mag 1.6) the right hand is at **705** against a shoulder line at **731** — **26 px above** |
| ⭐ **a hand first passes the CROWN** | ⭐ **9.63 ± 0.03** | **two measured gridded frames.** At **9.604** (mag 1.5) the right hand is at source y **616** against a crown at **596** — **20 px below**. At **9.655** the right hand is at **533** against a crown at **≈529** — at or above it |
| board at its steepest (the redirect) | **9.74 ± 0.04** | bracketed by eye on native tiles 9.706–9.774 — **a bracket** |
| board flat again, nose down the line | **≈9.88** | native tiles |

> ⭐⭐ **THE TWO CHANNELS ARE 0.10 ± 0.04 s APART ON THE SAME ARM IN THE SAME TURN.** A rule written on "a hand above the crown" fires **one tenth of a second late** against a rule written on the shoulder line. At 60 fps that is **six frames**; against this turn's whole 0.48 s it is **21 % of the manoeuvre**.
>
> ⭐⭐ **AND THEY COUNT DIFFERENT NUMBERS OF ARMS.** At 9.604 **both** hands are above the shoulder line (left +22 px, right +82 px) — but **only the right hand ever reaches the crown**; the left is **80 px below it at 9.604 and 114 px below at 9.655**, and never crosses. **So "hands above the shoulders" is a two-arm event here and "a hand above the crown" is a one-arm event.** They are not a stricter and a looser version of one test; they are two different observables.
>
> **Against the board:** the shoulder crossing leads the **redirect** by **+0.21 ± 0.05 s** and the **rail set** by **+0.04 ± 0.04 s — i.e. simultaneous within error**. The crown crossing leads the redirect by **+0.11 ± 0.05 s**. ⭐ **The "zero over the rail" half of clip 17's and clip 18's dissent is reproduced a third time, on a third rider — but it is reproduced by the SHOULDER channel, not the crown one.**
>
> ⚠️ **Say which event, and now also which channel.** The board events here are **brackets off native tiles, not measurements** — a re-entry that does not pass vertical has no instant as sharp as clip 18's 4.158 ± 0.009. **The two arm crossings are measured; the two board events are bracketed; the differences inherit the brackets' error.**

#### ⚠️ And the mechanism finding that CONTRADICTS clip 18 — which is what makes the test unsafe

Clip 18 found its hands above the crown because **the head had dropped** (its carriage E) and concluded the test was aimed at the wrong channel. **This clip satisfies the same test the opposite way.** Through 9.50 → 9.72 the rider is **extending**: the trunk comes upright, the crown **rises** in the frame, and the arms rise **faster**. Measured crown heights: source y **669** at 9.502, **640** at 9.553, **596** at 9.604 — the head is going **up**, not down, while the hands cross it.

> ⭐ **So "a hand above the crown" is now satisfied by a TRUNK FOLD in clip 18 and by an ARM LIFT in clip 19.** It is not a mis-aimed test; **it is an ambiguous one — it cannot distinguish the two channels at all.** That is a stronger statement than clip 18's and it is the second half of the proof. **The shoulder line is the channel that means what it says**, and this clip supplies its first measured crossing.

### 0.3 — ⛔ NO TAKE-OFF, **SECOND CLIP RUNNING**

At **t = 0.000 the rider is already standing**, trunk folded forward over a yellow board, trimming on a clean teal wall. Verified on six frames at 0.05 s from 0.000 to 0.300 (§4.1). **Nothing before 0.5 s is a take-off.** Clip 18 reported the same; **two clips in a row have no footage of the thing the owner's complaint is about.**

### 0.4 — Which pattern this clip is: **the densest long ride the series has read, and the only one with an ending**

| | clip 16 | clip 17 | clip 18 | clip 15 | **this clip** |
|---|---|---|---|---|---|
| length | 14.0 s | 9.6 s | 5.821 s | 18.56 s | **13.921 s** |
| direction changes | 0 | 1 | 2 | ≥10 | **≥4 resolvable** (§4.3) |
| how it ends | still riding | by decision | still riding | still riding | ⭐ **WIPEOUT, in frame** |

**The ride, as read:** **0.000–0.50** already standing, trimming leftward on a clean wall; **0.50–1.82** a constant-heading stretch in which the body visibly rises and falls at least twice (§3.4 — **no period published**); **≈2.0–2.3** a bottom turn into a climb; **≈2.9–3.1** off the top and back down, into and out of a foam/lip section; **3.2–5.0** descending and driving leftward; **5.0–9.3** a long leftward run through several foam sections, mostly crouched; **9.47–9.95** ⭐ **a vertical re-entry, the clip's sharpest manoeuvre** (§3.6); **9.95–10.3** landing in a deep crouch; **10.3–10.7** extending with one arm high; **10.7–11.3** engulfed, then back on top at the lip; **11.6–12.56** driving through whitewater in a deep, held trunk fold; **12.63–12.99** ⭐ **the board comes out**; **13.05–13.55** thrown, airborne, into the water. **Verified on 24 full frames at 0.575 s, 42 at 0.33 s, 21 at 0.10 s, 14 at 0.05 s, 12 at 0.04 s, 12 at 0.12 s, 21 at 0.08 s, 10 at 0.09 s and 30 at the native 1/60 s inside the re-entry.**

### 0.5 — ⛔ The leg chain is refused — **by the board-aspect gate, on five frames, without touching a body landmark**

**Board aspect = projected length ÷ projected width**, hand-measured on gridded frames with a source-coordinate grid:

| t | magnification | projected length | projected width | **aspect** |
|---|---|---|---|---|
| **8.300** | 1.0 | ≥382 px (tail in whitewater) | ≈86 px | **≥4.4** |
| **9.655** | 1.0 | ≥580 px | ≈96 px | **≥6.0** |
| **9.950** | 1.25 | ≥520 px | ≈75 px | **≥6.9** |
| **10.280** | 1.0 | ≥540 px | ≈53 px | **≥10.2** |
| **2.400** | 1.0 | ≥226 px, board on its rail | ≈9–20 px | **≥10** |

> **The gate refuses at ≥2.2. Every frame is 2–5× past the line.** No knee was examined and no thigh/shin ratio was computed. ⭐ **Second clip running in which the new gate does in one frame what the previous ten clips each spent three to five frames failing at.**
>
> ⭐⭐ **AND A NEW CLEAN NEGATIVE, worth more than the refusal: A RE-ENTRY THAT STANDS THE BOARD UP TO 63° IN THE IMAGE DOES NOT OPEN AN ADMISSIBLE WINDOW EITHER.** At **9.655** the board's in-image long axis runs from source **(655, 527)** to **(918, 1051)** — **63.3° from horizontal, near-vertical to the eye** — and the aspect is still **≥6.0**. **Clip 18 showed a cutback's pivot rolls the board and maximises the aspect; this clip shows that standing the board up in the IMAGE PLANE does nothing at all.** The reason is that the gate measures the board's **bearing to the lens**, and rotating it within the image plane leaves that bearing unchanged. ⭐ **So no manoeuvre of any kind opens the window from a shore-side lens. The admissible shot is a property of the CAMERA, not of what the surfer does** — and nineteen clips have now tested that from three different directions.

### 0.6 — The rider's size in source pixels, stated before anything was spent

| | |
|---|---|
| **Crown to deck** | **≈330–420 px** on the 1:1 frames, the clip's working range |
| **Head length (crown→chin)** | ⛔ **NOT PUBLISHED.** Two attempts on the same turn 0.05 s apart gave **89 px (9.502)** and **62 px (9.553)** — a 40 % disagreement no camera zoom can produce in three frames. **The rider's back is to the lens and the chin/neck boundary is not placeable in silhouette.** ⭐ **The CROWN is placeable to ±4 px and is used; the chin is not, and nothing in this document is quoted in head-lengths** |
| **Board** | **≥580 px of visible length at 9.655**; the **tail is never visible in any frame examined** |
| **Camera** | from the shore, **side-on**, **long lens**, **zooming continuously**, **above the rider** (his crown sits below the apparent water boundary in the early frames) |
| **Lens elevation** | ⛔ **NO FIGURE.** The background is **uniform hazy overcast meeting teal water with no crisp boundary**, and in most measurement frames the camera is tight enough that no horizon is in shot at all. **The elevation cannot be checked, so apparent stature is not licensed here** (§1) |
| **Other people in shot** | ⚠️ **a second surfer's head and shoulders sit in the water at bottom-left of the t = 8.300 frame.** Recorded because the dark-subject finder can lock onto them |

---

## 1. ⚠️ What this clip CANNOT touch, and why

| row | verdict | the reason, named |
|---|---|---|
| **10 — the two legs' split** | ⛔ **refused, eleventh clip running** | §0.5. **Board aspect ≥4.4–10.2 against a gate of 2.2**, on five frames, without examining a knee. Row 10 stays at V8's one clip, two frames |
| **14 — where a rider lives on the ladder** | ⛔ **no rung named, eleventh clip running** | No admissible leg chain (§0.5); **apparent stature not licensed because there is no checkable horizon** (§0.6). **No rung is named for any frame in this document** |
| **2 — trunk angular travel, gated** | ⛔ **no angle published** | §3.3. **A one-piece black wetsuit: there is no waistband and no garment edge anywhere that tracks the pelvis.** This **reproduces clip 16's cause** rather than adding a fourth |
| **3 — the two channels** | ⚠️ **no transition classified** | Channel 2 has no landmark; channel 1 needs a fixed reference the zooming camera does not give. **One same-sign-up window recorded (§3.2) and explicitly NOT counted as evidence**, per the brief |
| **17 — foot position as a fraction of board length** | ⛔ **refused** | §4.2. **The tail is in spray or whitewater in every frame checked.** One **front ÷ rear** ratio is published instead |
| **6 — pump cadence in trim** | ⛔ **no period published** | §3.4. A **≥1.32 s constant-heading stretch with a visible rise and fall exists** — more than clip 18 had — but the sampling was 0.12 s and the tiles were auto-cropped, which **destroys cross-tile height comparison**. **A period from that would be the within-window average the series has already withdrawn once** |
| **18 — head yaw vs the board** | ⛔ **no angle, nineteenth clip running** | §4.4. **A NEW cause: the rider is a whole-body silhouette.** A one-piece black wetsuit under flat overcast light, with the camera on the shore side, means **no face is legible in any of ~160 frames inspected** — and in the clip's largest frames his back is to the lens. **The clip is titled "where the head goes, the body follows" and cannot measure the head.** |
| **12 — held vs dipped lows** | ⚠️ **a long hold is OBSERVED and no rung can be put on it** | §3.1(c). The rider is visibly crouched for most of 5.0–9.3 s, and **deeply folded from 12.20 to 12.56 (0.36 s)**. ⛔ **No rung** (§0.5), so neither enters row 12's distribution |
| **13 — where the low sits in a turn** | ⛔ **not readable** | No rung anywhere, so "the low" has no definition in this clip |
| **11 — which channel leads down** | ⛔ **refused** | With no admissible leg channel and no trunk landmark, "legs" and "trunk" are not two measurable things here |
| **16 — the anticipatory brace** | ⚠️ **partly** | §3.4. He meets several foam sections already folded, but **no contact instant could be timed** — the contacts are inside his own spray. **Not a new instance** |
| **9 — the fore-aft axis** | ⚠️ **direction only** | §4.5. No magnitude: the camera zooms and this clip has **no usable head-length scale** (§0.6), so clip 18's head-length trick is unavailable |

---

## 2. Method findings

### 2.1 — ✅ The 260 ms + two-decode seek recipe PASSED a THIRD 60 fps source

Out-of-order probe, ten seeks in the shuffled order **2.0, 6.0, 2.0, 4.0, 6.0, 10.0, 4.0, 10.0, 1.0, 2.0**, hashing a 48×85 decode and differencing all 45 pairs:

| | result |
|---|---|
| same-time pairs identical | ✅ **6 of 6** |
| distinct-time pairs identical | ✅ **0 of 39** |
| frames reported unstable by the two-decode check | **0 of ~300** |
| `currentTime` reached ≠ asked | **0 of 10** |

> **Three independent 60 fps sources, 18 of 18 same-time and 0 of 117 distinct-time.** Keep running the probe: it is ten seeks.

### 2.2 — ☠️☠️ **A STEP SIZE OF 1/60 ROUNDED TO FOUR DECIMALS PUTS THREE OF TEN ASKS IN THE SAME FRAME**

Stepping **`+(t0 + i/60).toFixed(4)`** from 9.400 gave **7 distinct pictures from 10 asks** — the pairs (9.4167, 9.4333), (9.4667, 9.4833) and (9.5167, 9.5333) were byte-identical, confirmed with a 200×356 decode and with the asks interleaved in both orders. `currentTime` reached the asked value exactly every time, so **it is not a seek failure.** The rounding turns every third step into **0.0166 s against a true frame period of 0.016683 s (59.94 fps)**, and those steps fail to cross a boundary.

> ⭐ **The rule: step by 0.0170, not by 1/60.** 0.0170 exceeds the frame period, so it advances exactly one frame for runs up to ~50 frames. Re-run at 0.0170 the same window gave **10 distinct frames from 10 asks**, twice.
>
> ☠️ **Why this matters beyond tidiness:** three duplicate frames inside a ten-frame native sheet look exactly like **a rider who held still for 0.05 s**. **Had I not hashed, this clip would have published three frozen micro-windows that do not exist.**

### 2.3 — ☠️ **"SCALE IS 1.000 AT 800×640" FAILED AGAIN — AND THIS TIME IT FLIPPED BACK AND FORTH MID-SESSION**

Clip 18 found the constant was conditional on the preview pane having the window to itself. **Here it changed repeatedly, with nothing opened or closed by me**, and with the viewport pinned at 800×640 throughout:

| when | screenshot size | canvas→screenshot scale |
|---|---|---|
| first ruler | 800×640 | ✅ **1.000** (ticks at 0…700 landed at 0…700) |
| after one sheet | **748×598** | ⛔ **0.934** |
| two calls later | 800×640 | **1.000** |
| and again, alternating | 748×598 ↔ 800×640 | **0.934 ↔ 1.000** |

> ⭐ **The structural fix, and it is the most reusable thing in this document: DRAW THE SOURCE-COORDINATE GRID INTO EVERY MEASUREMENT FRAME AND READ THE SCALE OFF THE GRID ITSELF.** Every gridded frame here carries lines at known 50-source-pixel intervals, so the frame **self-calibrates** and the pane's scale cannot corrupt a reading even if it changes between the draw and the screenshot. **A separate ruler frame is no longer sufficient, because the scale can change between the ruler and the measurement.** Every length and ratio below was converted using the grid spacing read in that same image.

### 2.4 — The stale composite: **a throwaway low-scale screenshot in the SAME `browser_batch` is a cheap cure that mostly works**

The stale composite fired **twice** (tokens `beb66` and `89764` returned where `abb21` and `7fd88` were expected) and a **blank** composite once. Both were caught by the stamp and the frames discarded.

| cure | result |
|---|---|
| a second plain screenshot | ✅ worked on the blank composite; ⛔ had already failed on the stale one |
| ✅ **`browser_batch` of [screenshot `scale: 0.2`, screenshot]** | ✅ **worked 5 of 6 times** |
| ✅ **`browser_batch` of [screenshot `scale: 0.15`, screenshot `scale: 0.15`, screenshot]** | ✅ **worked 3 of 3**, including the one case the two-item batch failed |
| the `setInterval` repaint (clip 18's cure) | **was running for the whole session** and did **not** prevent either stale frame — ⚠️ **so it is not sufficient on its own** |

> ⚠️ **A correction to clip 18's rule.** Its ticking repaint was in place here from the first draw and the composite still froze twice. **Keep it, but do not trust it alone** — pair it with the throwaway-screenshot batch, and **keep stamping, because the stamp is what caught both.**

### 2.5 — ⚠️ `document.hidden` went TRUE mid-session and a 14-seek loop then timed out at 45 s

One `javascript_tool` call (a 14-seek sheet that normally takes ~8 s) **timed out**. Inspection showed `document.hidden === true` — the pane had been backgrounded, which throttles everything. ⭐ **It was not a runaway:** `currentTime` was at the loop's last time and the token had been set, so the script had in fact finished. **Nothing was killed and no reload was needed.** `tabs_select` was called to re-front the tab; `hidden` stayed true afterwards and loops were cut to ≤12 seeks.

> **The distinction is worth recording, because the skill's advice (reload the page, rebuild the harness) is expensive and was not needed here: a timeout with a completed last seek and a set token is a THROTTLE, not a runaway. Check the token before reloading.**

### 2.6 — Rulers built: **two discarded, two kept for FINDING only, nothing automatic measured anything**

| ruler | what it did | verdict |
|---|---|---|
| **yellow-board finder** (RGB mask → centroid → principal axis → 1st/99th-percentile endpoints) | validated against hand measurement on 5 frames: **angle within 3–8°** (55.2 vs 63.3 at 9.655; 46.5 vs 52 at 12.870; −9.7 vs ≈−7 at 9.950), but **length wrong by 2–9×** (63 px where the hand reads ≥580) and **aspect nonsense** (24.4 on a frame the hand reads ≥10); **returned nothing at all at t = 8.300** | ⛔ **DISCARDED. Nothing from it is quoted** — and note it would have been *catastrophic* for §0.5, since the gate is an aspect |
| **head-top crop** (centre a fixed crop on the top of the dark mass) | the dark mass's bounding-box top is not the head; six tiles came back showing water and shoulders | ⛔ **DISCARDED** |
| **dark-subject finder** (2nd-percentile luminance threshold → centroid + box) | located the rider in **every frame it was asked for**, including inside whitewater | ✅ **KEPT FOR CENTRING ONLY.** ⚠️ It normalises the rider's apparent position, so **no height, depth or across-tile comparison in this document comes from an auto-cropped tile** |
| **top-frame luminance cut detector** (18×32 whole-frame signature, 140 samples at 0.1 s) | max consecutive difference **12.28 against a median of 7.0 — no step anywhere** | ✅ **KEPT, and corroborated** (§5.4), because the skill warns it is blind when every shot would share rider, board and light |

> **Four built, two discarded.** Readers have now discarded 3 of 4, 2 of 4, 3 of 3 and **2 of 4**.

### 2.7 — ⚠️ A tile-aspect check that the last reader asked for

Clip 18 found `drawImage` scales x and y by different factors when a tile's aspect differs from the crop's. **Every sheet function here returns an `isotropic` flag comparing `dw/sw` with `dh/sh`.** Two sheets reported **false** — and the discrepancy was **0.4 %**, from integer rounding of the tile size, not from a geometry error. **Those sheets were used only to find moments.** Every length, ratio and angle in this document comes from a **single gridded frame** with a source-coordinate grid drawn into it at a stated magnification.

---

## 3. The body channels

### 3.1 — Leg depth: **no rung, eleventh clip running** (§0.5)

**(a)** The leg chain is refused by the **board-aspect gate** at **≥4.4–10.2 against a limit of 2.2**, on five frames, without a body landmark.

**(b) Row 10, the split: NOT MEASURED**, and not estimated.

**(c) Qualitatively**, the knees are flexed for the whole 13.921 s. The clip's deepest-looking positions are **9.94–10.26** (the landing from the re-entry) and **12.20–12.56** (driving through whitewater with the trunk near-horizontal). **No rung is named for any of them and no leg extension is given in any unit.**

**(d)** ⭐⭐ **A REFUTATION OF `engine-target.md`'s OWN WORDING, and it matters for the footage ask.** The document states, of clip 16: *"a one-piece black wetsuit removes the hip landmark AND the knee in the same garment."* **Half of that is wrong here.** This rider wears a one-piece black wetsuit and:

- the **waist is gone** — no seam, no waistband, no tonal break anywhere from shoulder to ankle (§3.3). ✅ that half holds;
- the **leg is NOT gone.** The suit is form-fitting and the **thigh, knee and shin read as three separate segments** at **11.600** (mag 1.0) and **10.280** (mag 1.0) — far more clearly than boardshorts, which hide the knee exactly when the thigh goes horizontal (clip 10's cause). **A wetsuit is the BEST garment this series has seen for the leg and the worst for the waist.**

> **The ask's garment clause should therefore be split in two, because one garment cannot satisfy both:** *the waist must be a **visible tonal break** (bare skin or a contrasting waistband)* **and** *the knee must be outside the shorts.* **A one-piece wetsuit passes the second and fails the first; boardshorts with a bare torso pass the first and fail the second.** ⚠️ **Nineteen clips and no single garment has passed both.** The combination that does is **boardshorts worn low with a bare or contrasting-coloured torso**, and it has not yet arrived.

### 3.2 — Row 3: ⚠️ one window recorded, **classified as same-sign up, and therefore NOT counted as evidence**

Between **12.47 and 12.75** (0.28 s) the rider comes out of a deep fold:

| | 12.47 | 12.75 |
|---|---|---|
| **trunk, by eye at 0.22× and confirmed at 1.0×** | folded to near-horizontal, head down about hip height | upright |
| **head's height over the board/foam line, by eye** | low | high |

**Both channels move the same way.** Per the brief — *"same-sign is NOT evidence — folding the trunk lowers the head by itself"* — **this contributes nothing to row 3's tally**, and it is recorded only so no later reader counts it.

**No DECOUPLED and no opposite-sign window was found**, and I would not have been able to publish one if I had: **channel 2 has no landmark** (§3.3), **channel 1 has no fixed reference** because the camera zooms continuously and this clip yields **no usable head-length** (§0.6), and **the lens elevation cannot be checked** because there is no horizon. ⭐ **That is three of the same three blockers clip 18 named, on a different rider and a different break — the pattern is now reproduced and it is about the CAMERA, not the clip.**

> **The series tally is UNCHANGED at 47 resolved transitions across seven clips with no opposite-sign instance.**

### 3.3 — Trunk fold: ⛔ **no angle published; clip 16's garment cause is REPRODUCED**

**The rider wears a one-piece black wetsuit.** From the shoulders to the ankles the body is a single unbroken dark silhouette. On the 1:1 gridded frame at **11.600** I could place the crown, both shoulders and both hands to ±4 px, and **could not place the pelvis at all** — there is no seam, no colour change and no garment edge anywhere between the shoulder line and the knee.

> **The series' garment-failure list is now: a loose shirt over the shorts (V15), a one-piece wetsuit (V16 **and here**), and a dark top over dark shorts (V18). Three causes, four instances — and the wetsuit is the first to repeat.**

**Direction only, by eye at 1:1 or better:** folded forward in trim at **0.00–0.50**; cycling between folded and upright through **0.50–1.82**; folded hard through the foam sections; **upright and extending through the re-entry at 9.50–9.72**; **folded to near-horizontal with the head down from 12.20 to 12.56**, the deepest and longest fold in the clip; **un-folding to fully upright 12.59 → 12.87** as the board comes out.

### 3.4 — ⛔ Pump: **a cadence is VISIBLE and no period is published**

The clip's clearest constant-heading stretch is **0.50 → 1.82 (1.32 s)**: across **12 frames at 0.12 s** the board's nose points **left in all twelve** and the board's bottom never becomes visible, so there is no rail roll and no direction change. **In that window the body visibly rises and falls at least twice** — apparently tall near 0.56, low near 0.98, tall near 1.22, low near 1.46.

> ⛔ **No period, no half-cycle and no excursion is published**, for three reasons each of which the series has already been burned by:
> 1. **0.12 s sampling cannot locate an extremum better than ±0.06 s**, which is 10–20 % of any half-cycle in play;
> 2. the tiles were **auto-cropped**, and an auto-crop normalises the rider's position — ☠️ **cross-tile height comparison from auto-cropped tiles is exactly the trap video 9 fell into and video 10 named**;
> 3. there is **no pelvis landmark and no stable scale**, so the "height" being eyeballed is not a measured channel at all.
>
> ⭐ **What this still contributes, and it is not nothing:** **clip 18 reported a 5.8 s ride with two turns and ZERO pumping.** This clip has a **1.32 s constant-heading stretch in which the body plainly cycles** — so the two clips are on **opposite sides** of the "does a rider pump at all" question, and row 6's target column (*"contested, and no clip has yet shown a sustained trim cadence"*) stays contested with one more voice on each side. **Settling it needs a fixed-crop, gridded, ≤0.04 s pass on a non-zooming shot, which this is not.**

### 3.5 — Arm carriage: five carriages in 13.9 s

Windows counted only where sampled at ≤0.33 s.

| carriage | windows | count |
|---|---|---|
| **A — both hands low and forward over the deck** | 0.00–0.30, 0.86–1.10, 6.65–7.31, 7.64–8.00, 12.20–12.56 | **5 windows — the dominant carriage again** |
| **B — both arms out, roughly level, waist-to-shoulder** | 0.50–0.74, 1.22–1.34, 5.33–5.99, 9.94–10.26, 11.75–12.11 | 5 |
| **C — one arm high, the other low and forward** | 2.36–2.50, 10.34–10.66 | 2 |
| ⭐ **D — both hands above the crown, HEAD UP, trunk upright** | **9.63 → ≥9.80** | **1 window, ~0.17 s** — and it is the **mirror** of clip 18's carriage E (§0.2) |
| **E — both arms thrown up and out while the board escapes** | 12.75–12.99 | **1 window — new, and it is the fall's signature** |

**Carriage A reproduces `engine-target` row 15 on a TWELFTH clip** (V7 4, V8 5, V9 6, V11 4, V12 ≥8, V13 6, V14 6, V15 6, V16 7, V17 6, V18 4, here 5).

⭐ **On row 4:** carriage A appears at both the clip's **flattest trim** (0.00–0.30) and its **deepest fold** (12.20–12.56); carriage B appears at both the **tallest** posture (0.50–0.74) and the clip's **deepest crouch** (9.94–10.26). **Ninth clip for "the arms are not a function of the depth", and this one has two different carriages each spanning the depth range.**

### 3.6 — The one manoeuvre that could be timed in beats

| beat | **the re-entry, 9.47 → 9.95** |
|---|---|
| entry / board leaves flat | **9.49 ± 0.03** (bracket) |
| **hand above the shoulder line** | ⭐ **9.528 ± 0.026** (measured) |
| **hand above the crown** | ⭐ **9.63 ± 0.03** (measured) |
| board at its steepest, 63° in-image | **9.74 ± 0.04** (bracket; the 63° is measured at 9.655) |
| board flat again, nose down the line | **≈9.88** |
| exit, into a deep crouch | **≈9.95** |
| **duration** | **≈0.48 s** |

**Against `stance-frame.md` §6** (bottom turn 0.96 ± 0.04 s, carve 0.83 s, cutback 0.8 ± 0.03 s) and against clip 18's re-entry (0.62 s): **0.48 s is a short, sharp vertical hit, and it is an ordinary real-time duration.** Together with visible motion blur on the limb edges at 60 fps, that is the slow-motion check: ⭐ **at or near real time, not slowed.**

⛔ **The board never passes vertical in this clip** except during the fall, so there is **no instant as sharp as clip 18's 4.158 ± 0.009** and the board events above are brackets.

---

## 4. The feet, the structure, the head

### 4.1 — The opening: already standing

Six frames at 0.05 s from **0.000 to 0.300**, full-frame: the rider is **standing throughout**, trunk folded forward, both arms low over the deck, board nose left, driving along a clean teal wall. **No take-off, no pop-up, no prone paddling.**

### 4.2 — ⭐ Feet: no slide seen anywhere; **one measured ratio; the absolute fraction REFUSED**

| test | result |
|---|---|
| **Any frame where a foot slides, lifts or re-places while standing?** | ⭐ **NONE SEEN**, across every frame inspected — 24 at 0.575 s, 42 at 0.33 s, 21 at 0.10 s, 12 at 0.12 s, 21 at 0.08 s, 10 at 0.09 s, 14 at 0.05 s, 12 at 0.04 s and 30 at the native 1/60 s. **Nineteen clips, zero foot slides** |
| **Front-foot ÷ rear-foot distance from the nose** | **0.595 ± 0.05** at **t = 8.300** (1:1 gridded frame, scale read off the frame's own grid): nose at source **(368, 1553)**, front foot at **(691, 1535)**, rear foot at **(911, ≈1520)** ⇒ 323 px and 543 px from the nose. ⭐ **Inside clip 18's 0.55–0.60 band, on a third rider** |
| **Front foot as a fraction of BOARD LENGTH** | ⛔ **REFUSED. The tail is in spray or whitewater in every frame checked.** Row 17 does **not** get its third absolute clip |
| **A board-fixed ruler** | ⚠️ **the deck logo exists** — legible as a dark word on the yellow deck at **t = 9.950**, spanning source x **575 → 639 (64 px)** — **but it was legible with BOTH ends visible in only ONE frame**, so it is not usable as the cross-frame ruler clip 18 made of it. **Recorded, not used** |
| **Do the feet stay on through the violent part?** | ⚠️ **UNKNOWN, and this is the clip's sharpest limitation.** From **12.20 onward the rider is in whitewater to the waist and his feet are never visible again.** The whole fall happens inside that blind window |

> ⚠️ **The narrowing clips 17 and 18 wrote applies, and this clip adds a second one:** "no foot slides" is a statement about **frames where the feet are visible**, and in this clip **the one event where a foot might have slipped — the board coming out at 12.63–12.99 — is precisely the one the foam hides.** **A clip that finally shows a board leaving a rider cannot show whether the foot left first.**

### 4.3 — Direction changes: **≥4 resolvable in 13.921 s**

| # | time | what it is | confidence |
|---|---|---|---|
| 1 | **≈2.0–2.3** | bottom turn into a climb to the lip | from 0.33 s and 0.10 s sheets — **confident in the event, ±0.15 s on the time** |
| 2 | **≈2.9–3.1** | off the top, back down the face | 0.10 s sheet, 21 frames — **confident** |
| 3 | **9.49 → 9.95** | ⭐ the vertical re-entry (§3.6) | **native 1/60 s, 30 frames — the only one timed** |
| 4 | **≈11.2–11.4** | up to the lip and back down | 0.33 s sheet — **confident in the event** |
| — | ≈5.5–5.8 and ≈10.4–10.7 | two further candidates | ⚠️ **NOT COUNTED** — each sits inside spray and neither could be resolved |

> **Row 8's span becomes: 0 in 14.0 s (V16) · 1 in 9.6 s (V17) · ≥4 in 13.9 s (here) · 2 in 5.8 s with a 1.58 s gap (V18) · ≥10 in 18.56 s (V15) · ≥13 in 30 s (V9).** ⛔ **The fastest-chaining record is NOT broken** — the gap between changes 2 and 3 here is ~6.5 s, and clip 18's **1.583 s** stands.

### 4.4 — ⛔ Row 18: the clip is TITLED about the head and cannot measure the head

**A new cause, and it is the most total of the six on file.** The rider is in a **one-piece black wetsuit** under **flat overcast light** with the camera on the **shore side**, so **he is a whole-body silhouette in every one of ~160 frames inspected.** There is no face, no eye, no mouth and no jaw line anywhere. Worse for this row: in the clip's **largest** frames — the re-entry at 9.5–9.8, where the crown is placeable to ±4 px — **his back is to the lens.**

> **The row-18 cause list is now: V13 face-no-nose · V14 nose-no-head · V15 backlit head · V16 cap brim · V17 back to camera · V18 nose and face never sharp together · V19 whole-body silhouette.** **Seven clips, seven causes, no angle.**
>
> ⚠️ **And a note the series should carry: the owner titled this clip "where the head goes, the body follows".** That is a claim about the head leading, and **the footage he chose cannot test it** — which is itself worth telling him, because it is the clearest signal yet that **row 18 needs a different KIND of clip, not another clip.**

### 4.5 — The fore-aft axis: direction only

Through the re-entry (9.50 → 9.72) the shoulders travel **forward of the feet** as the body extends and the arms go up; through the deep fold (12.20 → 12.56) the shoulders are **far forward over the nose** with the head down. ⛔ **No magnitude is published** — clip 18 got one by using its head length as a within-clip scale, and **this clip has no usable head length** (§0.6). **Thirteenth clip for the axis, direction only.**

---

## 5. The source, and what the numbers are worth

### 5.1 Delivery

`#movie_player` does not exist on a Short; the player is `#shorts-player`. `getAvailableQualityLevels()` returns **`["hd1080","hd720","large","medium","small","auto"]`** — **1080p is the hard ceiling**, no `hd1440`, no `hd2160`. `getPlaybackQuality()` already read `hd1080` before any enlarge-and-reload; it was pinned and re-confirmed. `videoWidth/videoHeight` = **1080×1920**. **Two `<video>` elements** were present (the second with `videoWidth === 0`), and every call selects by `videoWidth > 0`.

### 5.2 Pane geometry

⛔ **The canvas→screenshot scale was NOT constant and changed repeatedly without my touching the layout** — 1.000, then 0.934, then 1.000, alternating (§2.3). **Every measurement frame in this document carries a source-coordinate grid drawn into it and was converted using the grid spacing read in that same image**, so no reading depends on the scale being what it was a call earlier.

### 5.3 The frame grid: ⭐ **60 fps (59.94)**

Measured **twice**, on a 0.005 s grid, hashing a 48×85 decode:

- from **4.000**: the picture changes at 4.020, 4.035, 4.050, 4.070, 4.085, 4.105, 4.120, 4.135, 4.150, 4.170, 4.185 — **10 intervals spanning 0.165 s, mean 0.0165 s = 1/60.6**;
- from **9.400**: 9.420, 9.435, 9.450, 9.470, 9.485, 9.500, 9.520, 9.535, 9.550, 9.570, 9.585 — **10 intervals spanning 0.165 s**, with the gap pattern **0.015, 0.015, 0.020** repeating, which is exactly 1/60 boundaries quantised onto a 0.005 s sampling grid.

At 1/30 those 10 intervals would span 0.333 s and at 1/24, 0.417 s. **Measured: 0.165 s, twice.** **Six distinct rates across nineteen clips — 60, 30, 25, 24 — and 60 three times running.**

### 5.4 Shot structure: **one continuous shot, one rider, 0 → 13.921 s**

- **Whole-frame luminance detector** (18×32 signature, mean absolute difference, **140 samples at 0.1 s over the whole clip**): **median consecutive difference 7.0, maximum 12.28** (at 10.3). **There is no step anywhere** — the largest difference is 1.75× the median, where a cut between two waves would be several times it.
- ⚠️ **The skill warns both detectors are blind when every shot would share rider, board, beach and light**, which is exactly this clip's situation. **So the one window where a cut could have hidden — 2.4 to 4.4 s, where the rider is inside spray — was checked separately with 21 full frames at 0.1 s**, and the sequence is continuous: he climbs the face (2.40–2.80), goes through the lip and foam (2.90–3.10), descends (3.20–3.70) and runs on (3.80–4.40), with the wave shape and framing evolving smoothly.
- **The subject check, run because clip 16 was burned by it:** one-piece black wetsuit, yellow board with a red/orange rail stripe and a dark deck logo, teal water, flat overcast sky — **identical at 0.300, 1.300, 2.400, 3.600, 5.850, 7.000, 9.880, 11.600 and 12.750**, inspected at ≥0.33× at all nine and at 1.0× at four.

### 5.5 What the error bar is

- **Source 1080×1920** — the clip's ceiling. **Rider ≈330–420 px crown-to-deck; board ≥580 px of visible length.**
- ⚠️ **The camera zooms in and out continuously**, and ⛔ **this clip has NO usable within-clip scale proxy**, because the head length could not be read (§0.6). **No two lengths from different frames are compared anywhere in this document.** Every published ratio is **internal to one frame**.
- ⚠️ **No leg depth, no rung, no leg split, no trunk angle, no head length, no head yaw, no pump period, no board-length foot fraction, no lens elevation, no fore-aft magnitude.**
- ⚠️ **No lens-elevation figure may be quoted.** There is no crisp horizon anywhere; in most measurement frames the camera is tight enough that no horizon is in shot at all. **Apparent stature is therefore not licensed and is not used.**
- **Every length, ratio and angle comes from a single gridded frame at magnification 1.0–1.6 with a source-coordinate grid drawn into it**, and the scale was read off that grid. Survey sheets were used only to find moments.
- **Three screenshots were discarded on a stamp mismatch** (two stale, one blank) and nothing from them is quoted (§2.4).
- ⚠️ **Whether the clip is horizontally mirrored is unknown**, as short-form reposts often are, **so no frontside/backside and no regular/goofy claim is made**, and the raised arm in §0.2 is **not named lead or rear**.

---

## 6. Part C — what I could not see, and why

- **Any take-off.** The clip opens with the rider standing.
- **Any knee as an admissible joint** — refused by the board-aspect gate at ≥4.4–10.2 against a limit of 2.2, on five frames, without looking at a knee.
- **Any pelvis landmark** — one-piece wetsuit.
- **The board's tail**, in any frame, ever — spray or whitewater.
- **Any horizon** — uniform haze, and the camera is usually too tight.
- **Any face** — whole-body silhouette; and in the largest frames his back is to the lens.
- **Any head length** — the chin is not placeable in silhouette; two attempts 0.05 s apart disagreed by 40 %.
- ⭐ **The feet from 12.20 onward — which is the entire fall.** The board comes out, and the contact is inside the foam.
- **The board passing through vertical in a manoeuvre** — this clip's one near-vertical event is the re-entry at 63°, and the only true pass-through-vertical is the board escaping during the fall.
- **Two further candidate direction changes** at ≈5.6 and ≈10.5 — both inside spray, both uncounted.
- **Anything above 1080p.** The clip publishes nothing higher.

---

## 7. What this round did not do

- **No file under `src/` or `server/` was touched.** This is evidence, not a fix.
- **Nothing was built, ridden, benchmarked or measured in the game.** Every game-side statement is quoted from `3.5/engine-target.md` (read at `origin/claude/hand-moment-row`, **not** the stale copy on `main`) or `3.5/body-channels.md`.
- **No constant is proposed, and no stance rung is named for any frame.**
- **No leg extension is given in any unit.**
- **No pump period, no trunk angle, no head length, no lens elevation and no board-length foot fraction is published.**
- **The same-sign window of §3.2 is excluded from every tally.**
- **`engine-target.md` and `CLIP-REGISTRY.md` were not edited** — both live on another branch — and the eighteen earlier video documents were not edited.
- **Four automatic rulers were built, two discarded**, and nothing from the discarded two is quoted.
- **No conclusion is drawn about the wave, the lip, the foam or the spray.** One line, because it is the context the numbers sit in: it is a **head-high-plus, fast, foam-heavy wall in flat overcast light** — which is why so much of this ride is spent driving through whitewater rather than on a clean face.

---

## 8. Part B — the mapping

Game-side entries are **code readings quoted from `3.5/engine-target.md` and `3.5/body-channels.md`**. **Nothing was built, ridden or benchmarked.**

| what the rider does | the game's name for it | have it / partly / not at all |
|---|---|---|
| ⭐ **Loses the board out from under him over ≈0.36 s — the nose pitching up past his own head — and stays on his feet for ~0.4 s after it has gone** | wipeout | **partly, and in the wrong shape.** A wipeout exists, but **nothing models the board escaping as a process** with a body fighting it; and the engine's own falls are the thing the owner wants fixed |
| ⭐ **Answers the board escaping by throwing BOTH ARMS UP AND OUT, and by going taller, not lower** | — | **not at all.** No arm position exists (row 4), and the arms reach physics as **inertia only** — `swingInertia` 6→10 kg·m², `riderYawInertia` +0.85. **A rider who answers a loss of platform with his arms is answering it with a channel the engine does not have** |
| ⭐ **Raises a hand past the SHOULDER LINE 0.10 s before it passes the CROWN, and raises BOTH past the shoulders but only ONE past the crown** | — | **not at all**, and ⭐ **the series' own metric must change: the two tests differ by 0.10 s and by one whole arm** |
| **Puts the hands above the crown by RAISING THE ARMS with the head going UP** | — | **not at all** — and ⭐ **together with clip 18's opposite mechanism this retires "a hand above the crown" as a channel test entirely** |
| **Keeps both feet in the same place on the deck through a re-entry, with front ÷ rear = 0.595 from the nose** | row 17 (feet fixed by construction) | ✅ **already correct.** Nineteenth clip with zero steps seen |
| **≥4 direction changes in 13.9 s, one of them a 0.48 s vertical re-entry** | `top turn` / `snap` / `cutback`, named after the fact by `rideAnalysis` | **partly.** The moves have names; **nothing chains one to the next** (row 8) |
| **Holds a near-horizontal trunk fold with the head down for 0.36 s while driving through whitewater** | — | **not at all.** Row 1 / row 2; the drawn trunk is a one-line function of leg depth (`HumanoidRig.ts:1383–1385`) |
| **A 1.32 s constant-heading stretch in which the body visibly rises and falls at least twice** | leg depth / `pump` | **partly** — the game pumps in the legs at 0.217 s half-cycles (PR #413). ⛔ **No footage number to compare against: no period is published here** |
| **Five arm carriages, two of them spanning the clip's whole depth range** | `hand` input | **not at all.** One hand, on/off, pointed at the water, side chosen by the game (`AttachedRider.ts:5720–5732`) |
| **Meets several foam sections already folded and compressed** | — | **not at all.** No brace posture; row 16. **Not a new instance** — no contact instant could be timed |

---

## 9. Rows this clip moves, and how

| row | the measurement | the population | which way it moves |
|---|---|---|---|
| **5** | ⭐⭐ **Hand above the SHOULDER LINE at 9.528 ± 0.026; hand above the CROWN at 9.63 ± 0.03 — the same arm, the same turn, 0.10 ± 0.04 s apart.** Both from measured gridded frames (9.502: hands 23 px below the shoulder line; 9.553: 26 px above it; 9.604: right hand 20 px below the crown; 9.655: at it). **Both hands cross the shoulder line; only one ever crosses the crown** (the other is 80–114 px below it). Against the board: **+0.04 ± 0.04 s over the rail set (simultaneous) and +0.21 ± 0.05 s over the redirect** for the shoulder channel; **+0.11 ± 0.05 s over the redirect** for the crown channel | 1 turn, 1 rider, 1 unbroken shot, 4 measured frames + 30 native frames | ⭐ **19 of 32 across ten clips.** ⭐⭐ **The brief asked for the re-base and this is it, with a number: the crown test is 0.10 s LATE and counts one arm where the shoulder test counts two.** ⭐ **And the "zero over the rail" dissent is reproduced a THIRD time (V17 +0.33/0.00, V18 +0.29/0.00, here +0.21/+0.04) — but here it is the SHOULDER channel that lands on zero.** ⚠️ The board events are brackets off native tiles, not measurements |
| **4** | ⭐ **Carriage D — both hands above the crown with the HEAD UP and the trunk upright (9.63 → ≥9.80)**, the exact mirror of clip 18's carriage E | 1 window, 1 rider | ⭐⭐ **This is the finding that retires the crown test.** Clip 18 satisfied "hand above the crown" by dropping the head; **this clip satisfies it by raising the arms.** **Two clips, two opposite mechanisms, one metric — so the metric distinguishes nothing.** Row 4 also holds on its own terms: **five carriages, two of them present at BOTH extremes of depth — ninth clip** |
| **17** | ⭐ **Front ÷ rear foot distance from the nose = 0.595 ± 0.05 at t = 8.300** (one 1:1 gridded frame; nose (368,1553), front (691,1535), rear (911,≈1520)). **No foot slide, lift or re-placement seen in ~160 frames** | 1 measured frame; ~160 frames of "none seen"; 1 rider, 1 shot | ✅ **The "0 steps" count gains a nineteenth clip.** ⭐ **The 0.55–0.60 front÷rear ratio is reproduced on a third rider.** ⛔ **The ABSOLUTE fraction is REFUSED again — the tail is never clear — so row 17 stays at TWO reproduced absolute clips (V7, V17).** ⚠️ **And a new caveat: the one moment where a foot could have slipped (the board coming out) is inside foam** |
| **8** | **≥4 resolvable direction changes in 13.921 s; two further candidates uncounted because they sit inside spray** | 1 ride, 1 rider, 1 unbroken shot | **Row 8's span widens in the middle, not at the ends.** ⛔ **Clip 18's 1.583 s fastest chaining is NOT beaten** — the shortest confident gap here is ~6.5 s |
| **7** | **A re-entry in ≈0.48 s** (entry 9.49, shoulder-arm 9.528, crown-arm 9.63, board at 63° 9.74, flat 9.88, exit 9.95) | 1 manoeuvre | ⭐ **Seventh timed manoeuvre, and the shortest** — below `stance-frame.md` §6's published band, which together with visible 60 fps motion blur is this clip's slow-motion check: **at or near real time** |
| **15** | **Both hands low over the deck in 5 windows**, each verified at ≤0.33 s | 5 windows | **Twelfth clip for row 15** |
| **10** | ⛔ **NOT MEASURED. Refused by the board-aspect gate on FIVE frames: 4.4, 6.0, 6.9, 10.2 and ≥10, against a limit of 2.2** — computed from the board alone, no body landmark touched | 5 frames gated, 0 attempted | **No change. Row 10 stays at V8's one clip, two frames.** ⭐⭐ **But the method moves twice: the gate's second use, now on five frames in five single frames; and a CLEAN NEGATIVE that generalises clip 18's — a board standing at 63° in the image is still aspect ≥6.0, because the gate measures BEARING TO THE LENS and an image-plane rotation does not change it. No manoeuvre opens the window from a shore-side lens. The admissible shot is a property of the camera, not of the surfing** |
| **14** | ⛔ **No rung named, eleventh clip running** | — | Unchanged. **Apparent stature is not licensed: no checkable horizon, and no usable head length either** |
| **2** | ⛔ **No trunk angle at all** — one-piece wetsuit, no pelvis landmark | 1 frame attempted at 1.0× | ⚠️ **Nineteen clips, still no gated trunk travel. Clip 16's garment cause is REPRODUCED** (second wetsuit), so the list is three causes and four instances. ⭐⭐ **And a REFUTATION of `engine-target`'s wording: a one-piece wetsuit removes the HIP landmark but NOT the knee — the suit is form-fitting and the thigh/knee/shin read as three segments at 10.280 and 11.600. The ask's clothing clause must be split in two, because no single garment has yet satisfied both halves** |
| **3** | ⚠️ **NO transition classified.** One window (12.47 → 12.75) recorded and classified **same-sign up**, which the brief says is not evidence | 1 window, not counted | **The series tally is UNCHANGED at 47 resolved transitions across seven clips with no opposite-sign instance.** ⭐ **And the three blockers are the SAME three clip 18 named — no checkable elevation, no waist landmark, no fixed scale — now reproduced on a different rider, a different break and a different garment. They are properties of the CAMERA and the clothing, not of any one clip** |
| **6** | ⚠️ **A 1.32 s constant-heading stretch (0.50–1.82) in which the body visibly rises and falls at least twice.** ⛔ **No period, no half-cycle, no excursion published** | 1 window, 12 frames at 0.12 s | ⭐ **A counterweight to clip 18, which found a ride with two turns and ZERO pumping.** Row 6's target column stays *"contested"* with one more clip on each side. **Settling it needs a fixed-crop, gridded, ≤0.04 s pass on a non-zooming shot** |
| **12** | ⚠️ **A 0.36 s near-horizontal trunk fold (12.20–12.56) and a long crouched passage through 5.0–9.3 s** | 2 windows | **Observations only — no rung can be put on either** (§0.5). Nineteen clips, same blocker every time: the depth ruler, not the behaviour |
| **16** | ⚠️ **Meets several foam sections already folded** | several windows | **Consistent with clips 14 and 15; NOT a new instance**, because no contact instant could be timed |
| **9** | ⚠️ **Shoulders forward of the feet through the re-entry and far forward through the deep fold — DIRECTION ONLY** | 2 windows | **Thirteenth clip for the fore-aft axis.** ⛔ **No magnitude: clip 18's head-length scale is unavailable here** |
| **18** | ⛔ **No yaw, and a NEW cause: the rider is a WHOLE-BODY SILHOUETTE** — one-piece black wetsuit, flat overcast light, shore-side lens — and in the clip's largest frames his back is to the camera | ~160 frames observed | ⛔ **Seven clips, seven distinct causes, no angle.** ⭐ **And the pointed one: the owner titled this clip "where the head goes, the body follows" and the footage he chose cannot measure the head at all. Row 18 needs a different KIND of clip, not another clip** |
| **11** | ⛔ **REFUSED.** With no admissible leg channel and no trunk landmark, "legs" and "trunk" are not two measurable things here | — | **Unchanged** |
| **13** | ⛔ **Not readable** — no rung anywhere, so "the low" has no definition in this clip | — | **Unchanged** |

**Method results that belong in the skill, not in a row:** §2.2's finding that **a native step of `1/60` rounded to four decimals puts three of ten asks in the same frame at 59.94 fps, which would have published three frozen micro-windows that do not exist — step by 0.0170 and hash every frame**; §2.3's finding that **the canvas→screenshot scale flipped between 1.000 and 0.934 repeatedly within one session with the viewport pinned and nothing opened or closed, so a separate ruler frame is no longer sufficient and every measurement frame must carry its own source-coordinate grid**; §2.4's finding that **clip 18's `setInterval` repaint was running throughout and did NOT prevent two stale composites, while a `browser_batch` whose first item is a throwaway `scale: 0.15` screenshot cured them 8 of 9 times**; §2.5's finding that **a `javascript_tool` timeout with the last seek completed and the token set is a `document.hidden` THROTTLE, not a runaway — check the token before paying for a reload**; §2.1's confirmation that **the 260 ms-plus-stability seek recipe passes a third 60 fps source, 6 of 6 and 0 of 39**; and §2.6's record that **four automatic rulers were built and two discarded, including a board finder whose angle was good to 3–8° but whose ASPECT was wrong by a factor of two — which would have corrupted the one gate the series now depends on.**
