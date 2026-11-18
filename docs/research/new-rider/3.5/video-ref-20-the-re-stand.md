# Video reference 20 (*We'd be stoked with that.*, @ripcurl): **the rider loses his stance, goes chest-down over his own board, and STANDS BACK UP in about a second — and through the whole thing his hands never once rise above his own shoulder line**

Source: **https://www.youtube.com/shorts/G1qplJLdOJM**, title *"We'd be stoked with that.⁠"*, channel **`Rip Curl` (`@ripcurl`)**. Length **10.781 s**, read in full. The **twentieth** reference the owner has sent, registered as #20 in `CLIP-REGISTRY.md`.

> ⚠️ **A new poster, after three clips running from `@hunterjoness`.** This is **Rip Curl** — the same channel that supplied clip 7 (`video-ref-7-ripcurl-tube-and-trim.md`), but a different rider, break and session: **bare-chested, black boardshorts, a light-coloured cap, a long pale board with a red rail stripe and an orange deck patch**, in bright sun on a green point/reef wall with catamarans and sailing dinghies on the beach behind. **Other surfers are in the water in shot** (paddlers' heads at 0.70–1.20 and at 4.65–4.99), which matters because the subject finder can lock onto them.

Delivered to the browser pane at **1080×1920**. `getAvailableQualityLevels()` returns `["hd1080","hd720","large","medium","small","auto"]`, so **`hd1080` is this clip's published ceiling**; it was already serving `hd1080` and was pinned with `setPlaybackQualityRange` and re-confirmed (`getStatsForNerds().resolution` = `1080x1920@30`). Stream is **29.97 fps**, measured twice (§5.3) — the series' **first 30p after three 60p clips in a row**. `playbackRate` 1. `yt-dlp` and `ffmpeg` are both absent from this machine (checked, as the skill asks), so nothing was downloaded; every frame is a screenshot of the browser pane, **tab `tab-3`**, claimed with `tabs_create` and passed explicitly on every call. **No consent gate appeared.**

**Every figure below is an estimate from pixels**, and each carries its own error bar.

---

## 0. The answer first

### 0.1 — ⭐⭐ THE HEADLINE: **A RIDER LOSES HIS STANCE AND GETS IT BACK, IN FRAME, WITHOUT FALLING — THE FIRST RE-STAND IN TWENTY CLIPS**

**Twenty clips, and this is the first one that shows a rider go from standing, to chest-down over his board with his feet off it, back to standing, and ride on.** Clip 19 showed a loss that ended in a wipeout. This one shows a loss that ends in a **save**, and the whole thing is one unbroken shot at 29.97 fps.

| t | what the body does | how it was obtained |
|---|---|---|
| **0.000 → 4.55** | standing and trimming leftward along a green wall, knees bent, hands low | whole-frame tiles at 0.10 s (0.100–1.202) and 0.30 s (1.20–4.45) |
| **4.5520** | **standing, both feet on the deck**, stance 125 ± 10 px, hands **125 px below the shoulder line** | ⭐ measured, 1:1 gridded frame |
| **4.7524** | **still standing, both feet still on the deck**, hands **110 px below the shoulder line** | ⭐ measured, 1.4× gridded frame |
| **4.8192 / 4.8355** | standing, dropping, hands **111 px / 165–185 px below the shoulder line** — **the hands go DOWN, not up** | ⭐ measured, 1.4× and 1:1 gridded frames |
| **≈4.95 → 5.05** | the stance goes; the rider folds hard forward and puts both hands down | native 1/29.97 tiles 4.886–5.053 at 1.2× |
| **5.4186** | ⭐ **chest-down attitude over the board: hips ABOVE the shoulders and the head, both feet trailing clear of the tail in the foam, both hands down** | ⭐ measured, 1.4× gridded frame |
| **5.485 → 5.652** | held in that attitude, carried by the whitewater | whole-frame native tiles (S9), 6 frames |
| **≈5.70 ± 0.05** | ⭐ **hands come off, hips come over the feet** | bracketed on whole-frame native tiles 5.668 / 5.702 / 5.735 |
| **5.9022** | ⭐ **standing again and riding**, hands **87–122 px below the shoulder line** | ⭐ measured, 1:1 gridded frame |
| **6.00 → 7.58** | rides on down a big green wall, crouching as it stands up | whole-frame tiles at 0.128 s |
| **7.19 → 7.45** | deep under the lip | whole-frame tiles at 0.128 s |
| **8.00 → 10.05** | out, standing, then folded over the deck with both hands at the rails for ≈1.2 s | whole-frame tiles at 0.10 s; 1:1 at 9.7500 |
| **10.22 → 10.32** | goes into the water; the wave ahead of him is already flat | 0.45× fixed crops at 0.067 s |

> ⭐ **The three things in that sequence the engine cannot do, and they are this clip's contribution:**
>
> 1. **Losing the stance is NOT the end of the ride.** The rider spends **≈0.95 s** (≈4.95 → ≈5.90) off his feet, chest-down over his board, **and then stands back up and surfs another 4.5 s, including a barrel.** The engine has two states — riding and fallen — and nothing between them.
> 2. **The re-stand itself is ≈0.48 s** from the lowest attitude (5.4186, measured) to standing tall (5.9022, measured), with the **hands leaving the deck at 5.70 ± 0.05** — so **≈0.20 s of hands-on, ≈0.28 s of rising**. That is the same movement as a pop-up, and it is the closest thing to one the series has ever had on film.
> 3. **The answer to losing the platform is the HANDS GOING DOWN, not the arms going up.** See §0.2.
>
> ⚠️ **What this clip CANNOT say, and the limit is hard: the board is invisible under the foam from ≈5.05 to ≈5.65.** At **5.4186** a board nose with a red rail stripe sits at source **(45–130, 1350–1430)**, about **100 px clear of his nearest foot**, and a dark shape lies under him at **(250–420, 1360–1400)** — consistent with *one* board running under his chest, and consistent with *two* objects. **So I cannot say whether he ever fully left the board, or whether his feet merely came off the tail while his chest stayed on the deck.** What is measurable is the body's attitude and that he is back on his feet 0.48 s later.
>
> ⚠️ **And the honest deflation: this is a loss of balance in a whitewater section in the middle of a ride, not a take-off failure.** The owner's complaint is about falling **one second after standing**. **This clip has no take-off at all** (§0.3), so it cannot address the first second. It addresses a *different* loss — and, unlike every previous clip, it shows the loss being **survived**.

### 0.2 — ⭐⭐ THE BRIEF'S OWN HYPOTHESIS IS REFUTED: **THIS RIDER'S HANDS NEVER GO ABOVE HIS SHOULDER LINE, AND THEY GO FURTHER BELOW AS THE LOSS DEVELOPS**

The brief asked, on the strength of clip 19: *"Does the rider go TALLER with the arms up and out, or lower?"* and said a counterexample would be as valuable as a second instance. **This is the counterexample, measured on five gridded frames.**

| t | magnification | shoulder line (source y) | nearer hand (source y) | **hand below the shoulder line** |
|---|---|---|---|---|
| **4.5520** | 1.0 | **1035 ± 8** | **≈1160** | **125 px** |
| **4.7524** | 1.4 | **1120 ± 6** | **≈1230** | **110 px** |
| **4.8192** | 1.4 | **1151 ± 6** | **≈1262** | **111 px** |
| **4.8355** | 1.0 | **1145 ± 8** | **≈1312 / ≈1330** | **165 / 185 px** |
| **5.9022** | 1.0 | **1188 ± 8** | **≈1275 / ≈1310** | **87 / 122 px** |

> ⭐⭐ **Five measured frames spanning 1.35 s across the whole loss and the recovery, and in NOT ONE of them does either hand reach the shoulder line.** The crossing that clip 19 timed to ±0.026 s **never happens here at all.** Against the loss, the hands move the *wrong* way: from 110–125 px below at 4.75–4.82 to **165–185 px below** at 4.8355, as the body drops.
>
> ⭐ **What this rider does instead is put both hands ON OR AT the deck** (5.05 → 5.70, ≈0.65 s, 20 native frames) **and push back up.** Where clip 19's rider answered a departing board by going taller and was thrown, this one answers a departing stance by going **lower and forward onto his hands**, and keeps the wave.
>
> ⚠️ **The two events are not identical and the refutation is bounded.** Clip 19's board **left the rider and passed his head**; this board **never passes vertical and never clearly leaves him**. So the fair statement is narrower than "clip 19 is wrong": **"arms up and out" is not what a rider does when he loses his footing — at most it is what he does when the board is already gone.** One clip each. **The series has one instance on each side and no third.**

#### ☠️ And the methodological sting: **I READ "BOTH ARMS THROWN UP AND OUT" OFF THE SURVEY STRIPS FOR THESE EXACT FRAMES**

At **0.33–0.45×**, frames 4.752 / 4.835 / 4.919 looked unmistakably like a rider with **both arms raised** — I wrote it down that way. At **1.0–1.4×**, with a source grid, the same three frames have the hands **110–185 px BELOW the shoulder line**. ⭐⭐ **A low-magnification strip manufactured the brief's headline hypothesis out of a rider whose arms were down.** Clip 12's rule *"use strips to FIND a moment, never to measure one"* was written about **angles**; this extends it to **limb position**, which is a cruder observable and felt safe. It was not.

### 0.3 — ⛔ NO TAKE-OFF, **THIRD CLIP RUNNING**

At **t = 0.000 the rider is already standing**, trimming leftward on a clean green wall. Verified on **12 whole-frame tiles at 0.10 s from 0.100 to 1.202**, in all of which he is upright on the board with the arms spread. **Nothing before 1.2 s is a take-off.** Clips 18 and 19 reported the same; **three clips in a row have no footage of the thing the owner's complaint is about.**

> ⭐ **But the re-stand of §0.1 is the nearest substitute the series has ever had**, and it is the same chain of events as a pop-up: chest over the deck → hands push → hips over the feet → stand. **It is read at the native frame grid in §3.6.**

### 0.4 — Which pattern this clip is: **one continuous ride, zero direction changes, and an ending that is not a wipeout**

| | clip 16 | clip 17 | clip 18 | clip 19 | **this clip** |
|---|---|---|---|---|---|
| length | 14.0 s | 9.6 s | 5.821 s | 13.921 s | **10.781 s** |
| direction changes | 0 | 1 | 2 | ≥4 | **0 resolvable** (§4.3) |
| how it ends | still riding | by decision | still riding | **wipeout** | ⭐ **the rider folds onto the deck and goes into flat water** |

**The ride, as read:** **0.000–4.55** standing, trimming leftward along a green wall past paddling surfers; **4.55–4.95** the stance comes apart; **4.95–5.65** ⭐ **chest-down over the board, hips high, hands down, feet trailing**; **5.65–5.90** ⭐ **the re-stand**; **5.90–7.19** riding on, the wave standing up behind him; **7.19–7.45** deep under the lip; **7.45–8.10** out of the whitewater, still standing; **8.10–8.90** upright and trimming a reforming section with the horizon and moored boats behind; **8.90–10.10** folded over the deck with both hands at the rails; **10.22–10.32** into the water, wave finished.

**Continuity verified at ≤0.13 s** over **0.100–1.202** (0.10 s), **4.450–6.169** (0.033–0.067 s), **6.169–7.577** (0.128 s), **7.700–8.802** (0.10 s) and **8.800–10.700** (0.095 s) — **no cut seen anywhere**, same rider, board, break and light throughout. ⚠️ **1.202–4.450 was sampled only at 0.30 s**, and per the skill a 0.30 s sheet **cannot settle cuts**, so this document says *"no cut was seen"*, not *"it is one shot"*.

> ⚠️ **A signature-based cut detector was built and it found nothing** — frame-to-frame distance over 0.050–5.450 at 0.10 s ran a flat **10–30** with no spike. **Consistent with one shot and equally consistent with the blindness the skill warns about**, since every shot here would share rider, board, beach and light. **It is reported as a null, not as evidence.**

### 0.5 — ⛔ The leg chain is refused — **by the board-aspect gate, on four frames, without touching a body landmark**

**Board aspect = projected length ÷ projected width**, hand-measured on gridded frames each carrying its own source-coordinate grid:

| t | magnification | projected length | projected width | **aspect** |
|---|---|---|---|---|
| **4.5520** | 1.0 | **407 px** — (160,1427) to (555,1328), 14.1° from horizontal in image | **45 ± 10 px** | **≈9.0 (7.4–11.6)** |
| **4.8355** | 1.0 | **413 px** — (255,1455) to (650,1360) | **≈55 px** | **≈7.5** |
| **5.9022** | 1.0 | **≥288 px** — (195,1500) to (480,1455), board on its rail | **≈45 px** | **≥6.4** |
| **9.7500** | 1.0 | **≥390 px**, tail in foam | **≈55 px** | **≥7.1** |

> **The gate refuses at ≥2.2. Every frame is 3–5× past the line.** No knee was examined and no thigh/shin ratio was computed. ⭐ **Third clip running in which the new gate does in one frame what the previous ten clips each spent three to five frames failing at.**
>
> ⭐ **And a clean separation this clip can make that clips 18 and 19 could not: here the LENS is nearly level and it is the BOARD'S BEARING alone that refuses.** §0.6 measures the horizon. **The two causes of refusal have never before been separated on one clip.**

### 0.6 — ⭐ A CHECKABLE HORIZON — **the thing clips 18 and 19 both lacked**

At **t = 9.0850**, read off a two-band 1:1 frame carrying its own source grid (bands y 330–510 and y 700–1080, sx 120):

| | source y | ± |
|---|---|---|
| **sea/sky horizon** (moored dinghies' masts rise above it) | **≈499** | ±5 |
| **the rider's crown** | **≈1030** | ±10 |
| **crown below the horizon** | **≈530 px** | ±12 |

> ⭐ **The lens sits ABOVE the rider — but only just.** In a **1920 px** frame, 530 px below eye level is a **small depression**: at a 30° vertical field of view it is ≈8°, at 10° (a long lens, which this is) ≈3°. ⛔ **The exact angle needs the focal length, which a continuously zooming long lens does not give, so no angle is published** — but **the elevation is CHECKABLE here, per frame, which is the condition the skill sets and which two clips running could not meet.**
>
> ⚠️ **It is checkable only in the 8.1–10.3 passage**, where the camera is wide enough to include the horizon. In the 4.4–6.0 passage — the one that matters — **the frame is filled by the wave and there is no horizon**, so apparent stature is **not licensed** for the loss and the re-stand, and no rung is named anywhere in this document.

### 0.7 — ⭐⭐ THE GARMENT THE SERIES HAS BEEN ASKING FOR — **both halves of the clothing clause, satisfied for the first time in twenty clips**

Clip 19 split the clothing clause in two and recorded that **no garment in nineteen clips satisfied both halves**. **This one does:**

| half of the clause | this clip |
|---|---|
| **a pelvis landmark** | ✅ **bare torso above black boardshorts.** The waistband is a hard skin/fabric boundary at source **y ≈ 1200 ± 6 across x 325–420** at t = 4.8192 (1.4×), and **y ≈ 1172 ± 6** at t = 4.7524 |
| **a visible knee** | ✅ **the boardshorts end mid-thigh and the knee, shin and ankle are bare** — read as three segments at 4.7524, 4.8192 and 5.4186 |

> ⭐ **So the ask's clothing clause is MET, and the trunk angle is still not publishable** — because the **board is never end-on** (§0.5), and the calibration licenses the projected trunk angle only at a level lens **with the board end-on, per frame**. **The clothing was never the binding constraint; the camera's bearing to the board is.** That is worth more to the footage ask than another clip would be: **asking for bare legs and a waistband has now been satisfied and has changed nothing.**

### 0.8 — The rider's size in source pixels, stated before anything was spent

| | |
|---|---|
| **Crown to deck, standing** | **347 px** at 4.5520 (crown y 998, deck at the feet y ≈ 1345) and **342 px** at 5.9022 (crown 1118, deck 1460) — **two independent frames agreeing to 1.5 %** |
| **Head length (crown→chin)** | ⛔ **NOT PUBLISHED.** The rider's back is to the lens for the whole 4.4–6.0 passage and the chin is not placeable. **Nothing in this document is quoted in head-lengths** |
| **Board** | **407 px** of visible length at 4.5520, the clearest board frame in the clip; **the tail may extend into spray, so 407 px is a lower bound** |
| **Camera** | from the beach, **side-on to behind**, **long lens**, **zooming and panning continuously**, **slightly above the rider** (§0.6) |
| **Other people in shot** | ⚠️ **paddlers' heads in the water at 0.70–1.20 and a head at bottom-right at 4.65–4.99.** Recorded because the skin finder can lock onto them |

---

## 1. ⚠️ What this clip CANNOT touch, and why

| row | verdict | the reason, named |
|---|---|---|
| **10 — the two legs' split** | ⛔ **refused, twelfth clip running** | §0.5. **Board aspect 6.4–9.0 against a gate of 2.2**, on four frames, without examining a knee. Row 10 stays at V8's one clip, two frames |
| **14 — where a rider lives on the ladder** | ⛔ **no rung named, twelfth clip running** | No admissible leg chain (§0.5); **apparent stature not licensed in the passage that matters, because the horizon is only in frame from 8.1 s** (§0.6) |
| **2 — trunk angular travel, gated** | ⛔ **no angle published** — ⭐ **but for a new reason** | §3.3. **The pelvis landmark EXISTS here** (§0.7) and the lens is nearly level (§0.6). What refuses it is **the board's bearing**: side-on at aspect 6.4–9.0, where the calibration gives 8.9–11.8° of trunk error and the manufactured swivel span swamps the signal |
| **3 — the two channels** | ⚠️ **no transition classified** | Channel 1 (leg depth) has no admissible ruler; channel 2 (trunk) has a landmark but no licensed angle. **One candidate window recorded (§3.2) and explicitly NOT counted**, per the brief |
| **17 — foot position as a fraction of board length** | ⚠️ **ratio published, absolute refused** | §4.2. **front ÷ rear from the nose = 0.596 ± 0.05** at 4.5520. The **board-length fraction is an upper bound of ≤0.44**, because the tail may run into spray |
| **6 — pump cadence in trim** | ⛔ **no period published** | §3.4. The rider trims for 4.5 s before the loss with no legible rise-and-fall cycle; the camera zooms throughout, which destroys cross-frame height comparison, and there is no horizon in that passage to fix it against |
| **18 — head yaw vs the board** | ⛔ **no angle, twentieth clip running** | §4.4. **An EIGHTH distinct cause: for the whole 4.4–6.0 passage the rider's back is to the lens, and he is wearing a light-coloured cap that removes the hairline** — the one head landmark the previous clips at least had |
| **13 — where the low sits in a turn** | ⛔ **not readable** | No rung anywhere, and **no turn**: the clip has zero direction changes (§4.3) |
| **11 — which channel leads down** | ⛔ **refused** | With no admissible leg channel and no licensed trunk angle, "legs" and "trunk" are not two measurable things here |
| **7 / 8 — beats and chaining** | ⛔ **nothing to time** | **No direction change in 10.781 s.** There is no manoeuvre in this clip with an entry, a load, a peak and an exit |
| **16 — the anticipatory brace** | ⚠️ **partly** | §3.5. He meets whitewater at ≈4.95 and at ≈7.45 and stays on the board both times, but **no contact instant could be timed** — the contacts are inside his own spray. **Not a new anticipation instance** |

---

## 2. Method findings

### 2.1 — ☠️☠️ **`document.hidden` WAS TRUE FOR MOST OF THIS SESSION, AND IT CHANGED THE ECONOMICS, NOT JUST THE RELIABILITY**

The pane reported *"currently displayed"* in tool results while `document.hidden` read **`true`**, and `document.hasFocus()` was `false`. In that state:

- **every seek cost ≈1.5 s** instead of ≈0.35 s, so a 25-seek loop **blew the 45 s `javascript_tool` ceiling** — twice, before the pattern below was adopted;
- **`setTimeout` is clamped to ≥1 s**, so the skill's seek recipe (260 ms settle, 45 ms stability steps) became **≈1.5–7 s per frame**;
- ✅ **the cure that worked, and it is general: replace `setTimeout` with an unclamped yield.** `await new Promise(r => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); })` in a `while (performance.now() < end)` loop gives real sub-ms waits while hidden. **This restored the recipe's timings exactly**;
- ✅ **and the structural cure: never await the work inside the call.** Every batch here was launched by a function that **returns immediately** and writes into `window.__out`, with a separate call polling `window.__done`. **The 45 s ceiling then cannot be hit at all**, however slow the page is. **Nine sheets of 6–21 frames ran this way with no timeout.**
- ✅ Clip 19's rule is confirmed: **a timeout with the last seek completed is a throttle, not a runaway.** It fired twice and a reload was never needed.

### 2.2 — ⛔ **THE THROWAWAY-SCREENSHOT CURE FAILED THREE TIMES, AND THE ONLY THING THAT WORKED WAS TAKING THE SCREENSHOT AGAIN**

Clip 19 found that a `browser_batch` whose first item is a throwaway `scale: 0.15` screenshot cured stale composites **8 of 9** times. **Here it failed 3 times out of ~16** — twice returning a half-drawn sheet (12 of 21 tiles; 7 of 12 tiles) and once returning **the YouTube page with no overlay at all**, in each case after `window.__done` was already `true`.

✅ **What worked, 3 of 3: issue a second `browser_batch` and read its last screenshot.** Adding a *second* throwaway inside the same batch did **not** help.
⭐ **The footer stamp caught all three** — in each failure the stamp was either absent or carried the previous sheet's wall-clock time. **Stamp every composite; it is the only thing that has ever caught this.**

### 2.3 — ☠️ **ONE SEEK RETURNED A ONE-FRAME-OFF DECODE THAT PASSED THE TWO-DECODE STABILITY CHECK**

Measuring the frame grid at 0.005 s steps over 5.000–5.025, the ask at **5.010** returned hash `6970df58` while **both its neighbours at 5.005 and 5.015 returned `6f36cc4e`** — impossible on any monotone frame grid. The stability loop had read the same hash twice, 45 ms apart, so **it was stably wrong, not flickering**.

> ⚠️ **So the 260 ms + two-decode recipe is NOT infallible at 30 fps: 1 bad frame in ≈25 in this session.** It has passed three 60 fps sources; this is its first 30p and its first failure. **Mitigation used here: every published instant is corroborated by a neighbouring frame at ≤0.034 s**, and every sheet's hashes were checked for duplicates and for ordering against the measured grid (they agreed in every case — e.g. ask 5.3000 and ask 5.3184 both returned `191b9…`, which is the same native frame and is correct).

### 2.4 — ☠️☠️ **A TIGHT MAGNIFIED CROP MADE A PLANTED FOOT LOOK AIRBORNE, ON SIX CONSECUTIVE NATIVE FRAMES — AND I ALMOST PUBLISHED IT AS ROW 17's FIRST FOOT LIFT**

A 1.5× fixed-size crop of **164 × 129 source px** centred on the rider's feet showed, at 4.719 → 4.886, what looked exactly like a **plantar-flexed foot hovering above the deck with water beneath it**. I had the finding written: *"row 17's zero-lifts-in-nineteen-clips is broken."*

**It is not.** A **1.4× crop of 529 × 401 source px** at **4.7524** and **4.8192** — wide enough to contain the board — shows **both feet on the deck**: at 4.7524 the left foot's sole sits at y ≈ 1385 where the board's rail at that x is at y ≈ 1408, and the right foot is flat on the orange deck patch at (420–470, 1325–1350).

> ⛔ **The claim is retracted before publication. Row 17 is unchanged, at twenty clips and zero lifts.**
>
> ☠️ **The rule this buys: MAGNIFICATION WITHOUT CONTEXT LIES AS READILY AS A LOW-SCALE STRIP.** Clip 12 taught *"strips lie about angles"*; **§0.2 above extends that to limb position at low magnification, and this extends it to CONTACT at high magnification.** A crop that excludes the surface a limb might be touching cannot answer whether it is touching it — **and it will produce a confident, wrong answer rather than a refusal.** **Every contact judgement must be made on a frame that contains both the limb and the whole object.**

### 2.5 — ⚠️ The skin finder locked onto a beach catamaran's orange sail for 6 consecutive frames

A redness finder (`R>105, R−B>32, R−G>12`) over the whole frame returned the **orange/red sail of a moored catamaran** for every ask from 4.700 to 5.201 — the rider was in the lower third and the sail in the upper. **Fixed by restricting the search to source y ∈ [700, 1840].** ⚠️ **Noted because clips 8–12 all used colour finders and none had a brightly coloured object on the beach.** The whole-frame sheets were unaffected; only the finder-centred crops were.

### 2.6 — Rulers built, and what was kept

| tool | verdict |
|---|---|
| **unclamped `MessageChannel` delay** | ✅ **kept** — §2.1, the single most useful thing built |
| **background-job + poll seek runner** | ✅ **kept** — §2.1 |
| **whole-frame sheet with per-tile `currentTime` + hash stamp** | ✅ **kept for FINDING and for CUT-HUNTING**; nothing was measured on it |
| **finder-centred FIXED-size crop sheet** | ⚠️ **kept for sequence reading only.** Fixed source size, per video 10's rule, so apparent scale cannot drift — **but §2.4 shows the window must be wide enough to contain the board** |
| **1:1 / 1.4× single frame with its own source-coordinate grid** | ✅ **the only thing anything was measured on.** Every number in §0 comes from one of these |
| **two-band 1:1 frame (horizon + rider in one image)** | ✅ **kept** — §0.6; it is how the elevation was checked without a 900 px-tall canvas |
| **8×14 signature cut detector** | ⛔ **discarded as evidence** — §0.4; it found nothing and cannot be distinguished from blindness |
| **1.5× foot crop** | ⛔ **DISCARDED, and the finding it produced was retracted** — §2.4 |

### 2.7 — Scale, and the self-calibration the brief demanded

The viewport was pinned at **800 × 640** and the pane returned screenshots at both **748 × 598** and **800 × 640** during the same session with nothing opened or closed — ⚠️ **clip 19's "the scale is not stable within a session" is reproduced, on a different clip.** **It cost nothing here, because every measurement frame carries its own source-coordinate grid drawn in the same image** and every reading in this document is taken off those labels, never off screenshot pixels. **That is now the only safe practice and this clip is its second confirmation.**

---

## 3. The body channels

### 3.1 — Leg depth: **no rung, twelfth clip running** (§0.5)

What is describable without a ruler, from the measured frames:

- **(a) 4.5520, standing and trimming:** knees bent, hips over the feet, **stance 125 ± 10 px** between foot centres against a 347 px crown-to-deck — ⭐ a stance **≈0.36 of the rider's own standing height**, which is a scale-free number the series has not previously recorded.
- **(b) 4.8192, the stance coming apart:** foot centres **≈99 px** apart — ⭐ **the stance NARROWS by ≈21 % as he loses it**, not widens. ⚠️ One pair of frames, one rider; and the lens is panning, so this is only safe because both numbers are measured inside their own frames.
- **(c) 5.4186, the lowest attitude:** the hips are **ABOVE** the shoulders and the head — hip y ≈ 1300, shoulder y ≈ 1325, crown y ≈ 1288 in the same gridded frame. ⛔ **No rung: "leg depth" has no meaning when the body is horizontal.**
- **(d) 5.9022, back on his feet:** crown 1118, hips ≈1290, feet ≈1460 — **hip above deck ÷ crown-to-deck = 170/342 = 0.50 ± 0.04**, an intra-frame ratio needing no stature estimate. ⛔ **Not converted to a rung**, because the ladder in `stance-frame.md` is defined against **straight-legged standing hip height**, which this frame does not contain.

### 3.2 — Row 3: ⚠️ one window recorded, **and NOT counted as evidence**

**4.7524 → 4.8355 (0.083 s, 3 native frames).** Over it, the hands go from **110 px** to **165–185 px** below the shoulder line, and the trunk visibly folds forward. **Both of those are the same channel going the same way (down).** The **leg** channel has no admissible ruler in these frames (§0.5).

> ⚠️ **Classified: same-sign down, with one channel unmeasured — which the brief says is NOT evidence.** **The series tally is UNCHANGED at 47 resolved transitions across seven clips with no opposite-sign instance.**
>
> ⭐ **But the blocker list changes shape.** Clips 18 and 19 named three blockers — no checkable elevation, no waist landmark, no fixed scale — and called them properties of the camera and the clothing. **This clip removes two of the three**: the waist landmark is present (§0.7) and the elevation is checkable in part of the clip (§0.6), and the third (fixed scale) is solved by per-frame grids (§2.7). **What still blocks row 3 is the one thing none of the three named: the BOARD'S BEARING TO THE LENS**, which refuses the leg chain and the trunk angle at the same time. ⭐⭐ **So the series' standing diagnosis of row 3 was incomplete, and this clip is the one that shows it** — remove every blocker clips 18 and 19 listed and row 3 is **still** unresolvable.

### 3.3 — Trunk fold: ⛔ **no body angle published, and the cause is NEW**

The in-image trunk axis at **5.4186** runs from the hip (330, 1300) to the shoulder midpoint (472, 1325) — **≈10° from horizontal in the image**, read off the frame's own grid. ⛔ **That is an IN-IMAGE angle and is not a body angle:** the calibration licenses the projected trunk angle only at a **level** lens **with the board end-on**, and this board is side-on at aspect 6.4–9.0.

> ⭐ **The new part: this is the first clip where the refusal is NOT the garment.** Clip 16 and clip 19 refused on a wetsuit with no waistband; clip 13's trunk gate died on the method. **Here the landmark is clean and the refusal is purely geometric.** **Twenty clips, still no gated trunk travel — and the list of causes is now three garment-driven and one geometry-driven.**

### 3.4 — ⛔ Pump: **no cadence, and nothing that looks like one**

The 4.5 s of trim before the loss shows **no legible rise-and-fall cycle** at 0.10–0.30 s sampling: the rider holds one crouch and drives. ⛔ **No period, no half-cycle, no excursion published** — and **no cycle observed**, which is a different and slightly stronger statement than clips 18 and 19 could make.

> ⭐ **This is a second clip on the "zero pumping" side of row 6's contested column** (clip 18 was the first). Row 6 now has **V8 and V9 with ~4 half-cycles each, and clips 18 and 20 with none.**

### 3.5 — Arm carriage: **three carriages in 10.8 s, and two of them are the same one**

| carriage | window | what it is | population |
|---|---|---|---|
| **A — low and spread** | 0.10–4.95, and again 5.90–8.90 | both hands **87–125 px below the shoulder line**, elbows soft, hands outside the hips | 2 windows, 5 measured frames |
| **B — both hands at the deck** | ≈5.05–5.70 (**0.65 s**) and ≈8.90–10.10 (**≈1.2 s**) | both hands down at or on the deck/rails, trunk within ~10–20° of horizontal in image | ⭐ **2 windows, ≈1.85 s of the clip's 10.8 s — 17 % of the whole ride** |
| **C — hands dropping further** | 4.75–4.84 | the hands move from 110 px to 165–185 px below the shoulder line as the body drops | 1 window, 3 native frames |

> ⭐ **Carriage B is the clip's signature, and it appears twice for two different reasons** — once to save a lost stance (§0.1) and once to end the ride. **Row 15's "both hands low over the deck" gets a thirteenth clip, and its most extreme instance: hands actually AT the deck, not merely low.**
> ⛔ **Carriage A's "spread" is not quantified**: measuring hand separation across frames needs a fixed scale the zooming lens does not give, and the two frames where both hands are placeable are 1.35 s apart.

### 3.6 — ⭐ The re-stand, in beats

Read at the native **1/29.97 s** grid on whole-frame tiles (S7, S9, S8: 5.118 → 6.002, **27 consecutive native frames, no gap**) and anchored on three measured gridded frames.

| beat | t | how obtained |
|---|---|---|
| stance lost, body folding forward | **≈4.97 ± 0.03** | bracketed, native tiles 4.9528 / 4.9862 |
| both hands down | **≈5.05 ± 0.03** | bracketed, native tiles at 1.2× |
| **lowest attitude — hips above shoulders, feet trailing** | **5.4186** | ⭐ **measured, 1.4× gridded frame** |
| held in that attitude | **5.485 → 5.652** | 6 consecutive whole-frame native tiles |
| **hands off the deck, hips over the feet** | **5.70 ± 0.05** | bracketed, whole-frame native tiles 5.668 / 5.702 / 5.735 |
| standing crouch | **≈5.80 ± 0.03** | whole-frame native tiles |
| **standing tall, riding** | **5.9022** | ⭐ **measured, 1:1 gridded frame** |

> ⭐ **Hands-off to standing tall: 0.20 ± 0.06 s. Lowest attitude to standing tall: 0.48 ± 0.04 s. Stance lost to standing tall: 0.93 ± 0.06 s.**
>
> ⭐ **Against the series' only comparable figures:** clip 18's fastest manoeuvre chaining is 1.583 s and clip 19's whole re-entry is 0.48 s. **A rider gets back on his feet in the same time it takes him to do a re-entry.**
>
> **This is also this clip's slow-motion check.** A 0.20 s rise and visible motion blur at 29.97 fps place it **at or near real time**; `playbackRate` is 1 and the stream reports 30 fps.

---

## 4. The feet, the structure, the head

### 4.1 — The opening: already standing

Verified on 12 whole-frame tiles at 0.10 s from 0.100 to 1.202 (§0.3). In every one the rider is upright on the board, arms low and spread, trimming leftward.

### 4.2 — ⭐ Feet: **no slide, lift or re-placement seen, twentieth clip — after a retraction**

| measurement | value | frame |
|---|---|---|
| **front ÷ rear foot distance from the nose** | ⭐ **0.596 ± 0.05** | 4.5520, 1:1 gridded. Nose **(160, 1427)**; front foot centre **(320, 1345)** → 180 px; rear foot centre **(442, 1318)** → 302 px |
| **front foot as a fraction of board length** | ⚠️ **≤0.44** (an **upper bound**) | same frame: 180 ÷ 407, and **407 px of visible board is a lower bound** because the tail may run into spray, so the fraction can only be smaller |
| **stance width ÷ crown-to-deck** | **0.36 ± 0.04** | same frame: 125 px ÷ 347 px |
| **feet seen to move** | **none, in ≈150 frames inspected** | including the whole loss and the whole re-stand |

> ⭐⭐ **0.596 ± 0.05 reproduces clip 19's 0.595 ± 0.05 to three decimals and sits at the top of clip 18's 0.55–0.60 — a FOURTH rider, a fourth break, a fourth board.** This is now the most reproducible body number in the series after the pump cadence.
>
> ⚠️ **The absolute fraction DISAGREES, mildly.** ≤0.44 sits **below** the 0.47–0.49 reproduced twice by clips 18 and 19. **It is an upper bound against a two-clip band, with a ±3–5 % reading error on each — so it is a tension, not a refutation.** The honest reading: **either this rider stands further forward, or his board is longer than its visible 407 px.** The second is likelier and cannot be checked.
>
> ⛔ **And the retraction that matters: §2.4.** I had a measured foot lift at 4.735 ± 0.017 and a re-placement at 4.970, from six magnified native frames, and **it was an artefact of a crop too tight to contain the board.** **Row 17's count stands at twenty clips and zero.** ⚠️ **This clip is also the one where it was most nearly broken: the rider's feet stay put through a loss of balance severe enough to put his hips above his shoulders.**

### 4.3 — Direction changes: **0 resolvable in 10.781 s**

Across every sheet — 0.10 s over 0.100–1.202, 0.30 s over 1.20–4.45, 0.033–0.067 s over 4.450–6.169, 0.128 s over 6.169–7.577, 0.10 s over 7.700–8.802, 0.095 s over 8.800–10.700 — the rider travels **leftward in frame throughout**, trimming and driving along one wall. **There is no bottom turn, no top turn, no cutback and no snap in this clip.**

> ⭐ **This reproduces V7's "zero direction changes in 13 s" on a second clip, a second rider and a second break.** Row 8's range is **0 to ≥13 in 30 s**, and the zero end now has **two** instances rather than one. ⚠️ **A camera panning with the rider can hide a small course change**; what is certain is that **no manoeuvre with a legible entry, load, peak and exit occurs**, which is what row 7 would need.

### 4.4 — ⛔ Row 18: an eighth cause, and this one removes a landmark the others still had

**No head or gaze angle, twentieth clip running.** The cause here is new: **for the entire 4.4–6.0 passage the rider's back is to the lens**, and he wears a **light-coloured cap**, which removes the hairline — the one head landmark that clips with unresolvable faces could at least use to tell which way the skull was pointing. In the 8.1–10.3 passage, where his profile is available, **his head is inside his own spray or below the foam line in every frame checked.**

> ⛔ **Eight clips, eight distinct causes, no angle.** Clip 19's conclusion stands and hardens: **row 18 needs a different KIND of clip** — a water-level or follow-cam shot of the face — **not another beach clip.**

### 4.5 — The fore-aft axis: direction only

Through the loss the **shoulders go forward of the feet** (at 4.8192 the shoulder midpoint is at x ≈ 352 against foot centres at 330 and 425, and by 5.4186 the shoulders are 140 px forward of the hips), and through the re-stand they come back over them. **Thirteenth clip for the fore-aft axis, fourteenth observation.** ⛔ **No magnitude: the camera zooms and this clip has no usable head-length scale** (§0.8).

---

## 5. The source, and what the numbers are worth

### 5.1 Delivery

`hd1080` is the published ceiling (`getAvailableQualityLevels()`), already being served and then pinned with `setPlaybackQualityRange('hd1080','hd1080')` and re-confirmed via `getVideoData().video_quality`. `getStatsForNerds().resolution` reads `1080x1920@30`. Codec `av01.0.08M.08`. **Fifth clip, fifth different ceiling story — this one needed no intervention at all.**

### 5.2 Pane geometry

Viewport pinned at 800 × 640; screenshots came back at both 748 × 598 and 800 × 640 within one session (§2.7). Overlay canvas 740 × 580–594, which fits inside the smaller of the two. **Every measurement frame carries its own source-coordinate grid**, labelled every 25 or 50 source px with heavier rules every 100 or 250, so no reading depends on the screenshot scale.

### 5.3 The frame grid: ⭐ **29.97 fps**

Measured by seeking on a **0.005 s** grid and hashing a 48 × 85 downsample.

- **Window 1 (25 asks, 1.000 → 1.120):** picture changes within **(1.030, 1.035]**, **(1.065, 1.070]**, **(1.095, 1.100]** → spacing **0.0333–0.0334 s**.
- **Window 2 (6 asks, 5.000 → 5.025):** no change expected and none seen, except the single bad decode of §2.3.
- Boundaries at 1.0334 + k·0.033367 land on **integer + 0.97** of a 29.97 Hz grid, consistent to **±0.002 s**.

**Native step used throughout: 0.0334**, never `1/30` rounded to four decimals. **All 18 hashes in the 4.552–5.120 native sheet are distinct**, and all 12 in the 5.300–5.667 sheet; **no frozen micro-window was published.**

### 5.4 Shot structure: **no cut seen, and one gap where none could be ruled out**

See §0.4. **Continuity checked at ≤0.13 s over 7.53 s of the clip's 10.78 s**; the remaining **3.25 s (1.202–4.450) was sampled only at 0.30 s**, and per the skill that is **not** fine enough to pronounce on cuts.

### 5.5 What the error bar is

The rider is **342–347 px crown-to-deck**, so landmark placement is the binding constraint, not resolution:

- **crown** placeable to **±8 px** (and **±12** under the cap);
- **shoulder line** to **±6–8 px**, read as the midpoint of the two acromia in a back view;
- **hands** to **±10 px** against foam;
- **waistband** to **±6 px** (a hard skin/fabric edge);
- **feet** to **±10 px** on the deck, **±20 px** in spray;
- **board ends** to **±15 px** at the nose, **unbounded at the tail** wherever spray covers it — which is why §4.2 publishes a ratio and an upper bound rather than a fraction;
- **board width** to **±10 px**, which is why §0.5's aspects carry ranges. **The gate is 3–5× from its limit in every case, so the width error cannot change a single verdict.**

---

## 6. Part C — what I could not see, and why

- ⛔ **Whether the rider ever fully left the board during the loss.** From ≈5.05 to ≈5.65 the board is under foam. §0.1.
- ⛔ **Whether the ending at 10.22–10.32 is a dismount or a slow fall.** He folds onto the deck, takes both rails and goes into the water; **the water ahead of him is flat in the same frames**, which favours a dismount, but the footage does not settle it.
- ⛔ **Any knee angle, any leg depth, any rung.** §0.5.
- ⛔ **Any trunk angle in body coordinates.** §3.3 — and for the first time the garment is not the reason.
- ⛔ **Any head or gaze angle.** §4.4.
- ⛔ **The lens elevation as an angle.** §0.6 gives the horizon's row and the rider's row; converting to degrees needs the focal length of a continuously zooming long lens.
- ⛔ **Any pump period.** §3.4 — and no cycle was observed to measure.
- ⚠️ **Cuts between 1.202 and 4.450.** §5.4.
- ⚠️ **Hand spread as a number.** §3.5.

---

## 7. What this round did not do

- **No `src/` change.** `git diff --stat origin/main HEAD` reads **1 file changed, deletions 0**.
- **Nothing was built, ridden, benchmarked or profiled.** Every game-side entry in §8 is a **code reading quoted from `3.5/engine-target.md`**, as that document's own §4.3 requires.
- **No `node_modules`, no install, no `npx tsc`.** Nothing was downloaded; every frame is a browser-pane screenshot.
- **Did not re-read clips 13–19's documents before measuring.** Comparisons were made against the brief's stated numbers and `engine-target.md` on `origin/claude/hand-moment-row` **after** this clip's frames were taken, so the agreement in §4.2 is not a primed one.
- **Did not settle the shot structure of 1.202–4.450**, and says so rather than guessing (§5.4).
- **Did not measure the second surfer** visible at 0.70–1.20 and 4.65–4.99.

---

## 8. Part B — the mapping

Game-side entries are **code readings quoted from `3.5/engine-target.md` and `3.5/body-channels.md`**. **Nothing was built, ridden or benchmarked.**

| what the rider does | the game's name for it | have it / partly / not at all |
|---|---|---|
| ⭐⭐ **Loses his stance, goes chest-down over the board with his hips above his shoulders for ≈0.65 s, and STANDS BACK UP in 0.48 s — then surfs another 4.5 s including a barrel** | — | **not at all.** The engine has **riding** and **fallen** and nothing between. There is no chest-down state, no hands-on-deck state, and **no way back from a lost stance**. ⭐ **This is the single biggest gap this clip exposes, and it is exactly the owner's complaint seen from the other side: real riders lose it and get it back** |
| ⭐⭐ **Answers a lost stance by putting BOTH HANDS DOWN at the deck, with the hands never rising above his own shoulder line** | — | **not at all**, and ⭐ **it refutes the hypothesis this read was dispatched to confirm.** No arm position exists (row 4); arms reach physics as **inertia only** — `swingInertia` 6→10 kg·m², `riderYawInertia` +0.85 |
| ⭐ **Keeps both feet exactly where they were through the whole loss and recovery, front ÷ rear = 0.596 from the nose** | row 17 (feet fixed by construction) | ✅ **already correct**, and ⭐ **the strongest test row 17 has had: the feet hold through a near-fall** |
| **Trims one wall for 10.8 s with ZERO direction changes** | `trim` | **partly.** Trim exists; ⭐ **but the engine's falls make a 10.8 s uninterrupted trim unreachable**, which is row 8's "blocked by survival" in its plainest form |
| **Goes through whitewater twice and stays on the board both times** | — | **not at all.** No brace posture; row 16. **Not a new anticipation instance** — no contact instant could be timed |
| **Holds both hands at the deck for 17 % of the whole ride, in two separate windows and for two different reasons** | `hand` input | **not at all.** One hand, on/off, pointed at the water, side chosen by the game (`AttachedRider.ts:5720–5732`) |
| **Ends the ride by folding onto the deck and stepping off into flat water** | — | **not at all.** There is no dismount; a ride ends by falling or by the wave ending |
| **A stance 0.36 of his own standing height, narrowing by ≈21 % as he loses balance** | stance width | **partly** — a stance width exists as a constant; **nothing narrows it under load** |

---

## 9. Rows this clip moves, and how

| row | the measurement | the population | which way it moves |
|---|---|---|---|
| **NEW — survival and recovery** | ⭐⭐ **A rider loses his stance at ≈4.97, is chest-down over the board with his hips above his shoulders by 5.4186, has his hands off the deck by 5.70 ± 0.05 and is standing and riding at 5.9022 — then surfs 4.5 s more.** Beats: hands-off→tall **0.20 ± 0.06 s**; lowest→tall **0.48 ± 0.04 s**; lost→tall **0.93 ± 0.06 s** | 1 event, 1 rider, 1 unbroken shot; 27 consecutive native frames + 3 measured gridded frames | ⭐⭐ **The series' first re-stand in twenty clips, and the first evidence that a lost stance is RECOVERABLE.** Rows 7, 8 and 16 are all marked *"blocked by survival"* in `engine-target.md`; **this clip shows what survival actually looks like in a body** |
| **5** | ⭐⭐ **REFUTED for this event: neither hand crosses the shoulder line at any point in the loss or the recovery.** Shoulder line vs nearer hand: **4.5520 −125 px, 4.7524 −110, 4.8192 −111, 4.8355 −165/−185, 5.9022 −87/−122** | 5 measured gridded frames spanning 1.35 s, 1 rider | ⭐⭐ **The brief asked for a second instance of "arms up and out" or a counterexample. This is the counterexample, with numbers.** ⚠️ **Bounded: this board never passes vertical and never clearly leaves him, so it refutes "a rider answers a lost stance with his arms", not clip 19's own frames.** ⛔ **No lead time of any kind is published — there is no rail set and no redirect in this clip to time against** |
| **17** | ⭐ **front ÷ rear from the nose = 0.596 ± 0.05** at 4.5520 (nose (160,1427), front (320,1345), rear (442,1318)); **stance width ÷ crown-to-deck = 0.36 ± 0.04**; **no foot seen to move in ≈150 frames** | 1 measured frame; ~150 frames of "none seen" | ✅ **Twentieth clip, zero steps — and the hardest test yet, since the feet hold through a near-fall.** ⭐ **0.55–0.60 reproduced on a FOURTH rider.** ⚠️ **The absolute fraction is ≤0.44, mildly BELOW the twice-reproduced 0.47–0.49** — a tension, not a refutation, since the tail may be in spray. ⛔ **And a retracted claim: §2.4** |
| **4** | **Three carriages in 10.8 s; carriage B (both hands at the deck) occupies ≈1.85 s = 17 % of the ride, in 2 separate windows** | 2 windows, 5 measured frames | ⭐ **Tenth clip for row 4.** ⭐ **And the carriage that matters is the LOW one**, which is the opposite of what clip 19's event suggested |
| **15** | **Both hands low over the deck throughout, and literally AT the deck for 0.65 s and ≈1.2 s** | 2 extreme windows + 2 trim windows | **Thirteenth clip for row 15, and its most extreme instance** |
| **10** | ⛔ **NOT MEASURED. Refused by the board-aspect gate on FOUR frames: 9.0, 7.5, ≥6.4 and ≥7.1, against a limit of 2.2** — computed from the board alone | 4 frames gated, 0 attempted | **No change.** ⭐ **The gate's third use.** ⭐⭐ **And a clean separation the series has never had: here the LENS is nearly level (§0.6, crown 530 px below the horizon in a 1920 px frame) and the BOARD'S BEARING alone does the refusing** |
| **14** | ⛔ **No rung named, twelfth clip running** | — | Unchanged. ⭐ **But apparent stature is now CONDITIONALLY licensable** — §0.6 gives the first checkable horizon in three clips — **just not in the 4.4–6.0 passage, where the frame is full of wave** |
| **2** | ⛔ **No trunk angle** — ⭐ **and for the FIRST time, not because of the garment** | 2 frames attempted at 1.4× | ⭐⭐ **A REFUTATION of the footage ask's premise: this clip SATISFIES both halves of clip 19's clothing clause** (bare torso over boardshorts = waistband at y 1200 ± 6; bare knee, shin and ankle) **and the trunk angle is still unpublishable**, because the board is side-on. **Asking for the right clothes has now been granted and has changed nothing** |
| **3** | ⚠️ **NO transition classified.** One window (4.7524 → 4.8355) recorded and classified **same-sign down with one channel unmeasured**, which the brief says is not evidence | 1 window, not counted | **Tally UNCHANGED at 47 resolved transitions across seven clips, no opposite-sign instance.** ⭐⭐ **But the diagnosis changes: clips 18 and 19 named three blockers — uncheckable elevation, no waist landmark, no fixed scale — and this clip REMOVES ALL THREE and row 3 is still unresolvable.** The real blocker is **the board's bearing to the lens**, which no previous read named |
| **8** | **0 resolvable direction changes in 10.781 s**, verified at ≤0.13 s over 7.53 s of it | 1 ride, 1 rider | ⭐ **V7's zero is REPRODUCED on a second clip, a second rider and a second break.** Row 8's low end is no longer a single observation |
| **7** | ⛔ **No manoeuvre to time** — no entry/load/peak/exit anywhere in the clip | — | **Unchanged.** ⭐ **The only timed sequence here is the re-stand (§3.6), which is not a turn** |
| **6** | ⛔ **No period published, and NO CYCLE OBSERVED** in 4.5 s of trim at 0.10–0.30 s sampling | 1 window | ⭐ **A second clip on the "zero pumping" side**, after clip 18. Row 6's target column stays *"contested"*, now 2 clips each side |
| **16** | ⚠️ **Whitewater met twice, ridden out standing both times**, including the engulfment at ≈7.45 | 2 windows | **Consistent with clips 6, 8, 9, 14, 15; NOT a new anticipation instance**, because no contact instant could be timed |
| **9** | ⚠️ **Shoulders forward of the feet through the loss, 140 px forward of the hips at 5.4186, back over them by 5.9022 — DIRECTION ONLY** | 2 windows | **Fourteenth observation of the fore-aft axis.** ⛔ **No magnitude: no head-length scale** |
| **18** | ⛔ **No yaw, and an EIGHTH cause: the rider's back is to the lens for the whole key passage AND he wears a light cap, which removes the hairline** | ~150 frames observed | ⛔ **Eight clips, eight causes, no angle.** **Row 18 still needs a different KIND of clip** |
| **12 / 13 / 11** | ⛔ **Not readable** — no rung anywhere; no turn, so "the low in a turn" has no referent; and with one channel unmeasurable, "which leads" is undefined | — | **Unchanged** |

**Method results that belong in the skill, not in a row:** §2.1's finding that **`document.hidden` makes every seek cost ≈1.5 s and clamps `setTimeout` to ≥1 s, and that the cure is an unclamped `MessageChannel` delay plus a background-job-and-poll runner that can never hit the 45 s ceiling**; §2.2's finding that **clip 19's throwaway-screenshot cure failed 3 of ~16 times here and that the only reliable fix is to issue a SECOND `browser_batch`, with the footer stamp catching all three**; §2.3's finding that **the 260 ms + two-decode recipe returned one stably-wrong frame in ≈25 on its first 30 fps source**; ⭐⭐ §2.4's finding that **a tight magnified crop that excludes the board made a planted foot look airborne on six consecutive native frames and produced a false row-17 foot-lift that was retracted before publication — so every CONTACT judgement needs a frame containing both the limb and the whole object**; ⭐⭐ §0.2's finding that **a 0.33–0.45× survey strip manufactured "both arms thrown up and out" out of a rider whose hands were 110–185 px below his shoulders, which extends clip 12's "strips lie about angles" to limb POSITION**; §2.5's finding that **a redness finder locked onto a beach catamaran's orange sail for 6 consecutive frames**; and §2.7's second confirmation that **the screenshot scale is unstable within a session, and that a per-frame source-coordinate grid makes it irrelevant.**
