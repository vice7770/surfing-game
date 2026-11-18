# Video reference 10 ("Mentawai Islands | November 2026"): the first read from a drone — the feet and the fore-aft axis finally visible, and both depth rulers failing in a new way

Source: **https://www.youtube.com/watch?v=oRL0q5rDZWc**, title *"Mentawai Islands | November 2026"*, watermarked `WWW.TENGIRRI.COM`. Total length **280.02 s**; **the owner scoped this read to 15–55 s and nothing outside that window was read.** Delivered to the browser pane at **1920×1080** — this video publishes **no 1440p and no 2160p** (§1.1) — and it is a true **25 fps** stream (measured, §1.3), `playbackRate` 1. Read 2026-11-17/18 by screenshotting the browser pane: **`yt-dlp` and `ffmpeg` are both absent from this machine** (checked, as the skill asks), so nothing was downloaded.

The **tenth** reference the owner has sent, and the **first shot from a drone**. Their standing instruction is the rider's **movement, not the wave**, so the wave, the lip, the foam and the spray appear here only where they hide a body.

**I was given no hypothesis and I did not adopt one.** The brief said the product is a general understanding of how these surfers move, with the **transitions** as the centrepiece and each of the four channels given its own number.

**The owner's extra job for this clip:** *"this video is similar to canyon spitting waves, also a good example."* Canyon with `?canyonWaves=true` is the spot they actually ride, so §4's mapping table carries an extra column — **could the shipped Canyon rider even attempt this?** — answered from the code survey in `3.5/body-channels.md`, not from anything I ran. **Nothing was ridden, built or benchmarked in the game.**

---

## 0. The answer first

### 0.1 — What this rider's movement is actually like

**He is almost never still, and almost never upright.** Through sixteen seconds of riding he cycles between a long-legged trim with a trunk folded 30–50° and a deep fold in which his head is down near the deck and both hands are at the rail — and he changes the board's direction every **1.2 to 1.9 seconds**. The two postures are not "stances he visits"; the ride is the *transit* between them, and the transit takes about **half a second** each way, over and over.

Three things about him that the engine does not have, in order of how sharply the clip shows them:

1. **An arm that moves before anything else does.** At the bottom turn at t = 30.24 the rear arm is out and up at head height **0.12 s before the rail bites**, and nothing else in the frame has changed — the board is flat, the legs are long, the trunk has not moved (§0.2).
2. **A body whose clock is not the board's.** Through the top turn at 30.76–31.20 the board swings from climbing to reversed while the body **does not change at all**: laid forward over the deck, both arms out and low, the legs down, for the whole 0.44 s and beyond. The board finishes at ≈31.12; the body is still folded at **31.50** (§2.3, T3).
3. **Shoulders forward of hips, hips over the rear foot, feet absolutely planted.** On all three frames where I could place the landmarks the hip sits at or beside the **rear** foot while the head sits forward of it — and across twelve frames seen from **directly above**, neither foot moves by as much as I can measure (§2.4).

### 0.2 — The arm leads: a third clip, a third rider, and here it is at the stream's own frame rate

Video 8 found the rear arm up first in 3 of 4 direction changes (0.1–0.2 s resolution). Video 9 resolved one at 1/30 s and got 0.07–0.10 s. **This clip resolves one at the stream's own 0.04 s grid:**

| t | the rear (his right) arm | the board |
|---|---|---|
| 30.00 | both hands **low** — left across the chest, right at the hip | flat, trimming |
| 30.04 | unchanged | flat |
| **30.08** | the **lead** hand leaves the body | flat |
| **30.12** | **the rear arm is out at shoulder height, clear of the body** | **flat — no rail spray** |
| **30.16** | both arms out; the rear hand rises to **head height** | **still flat** |
| 30.20 | both arms wide; the weight goes back; the wake broadens | no rail spray yet |
| **30.24** | arms wide, held | **first spray at the tail — the turn starts** |
| 30.28–30.40 | **the rear hand stays at head height; the lead arm out-left and down** | the carve runs underneath it |

**The rear arm is out 0.12 s (3 frames) before the board does anything, and the first arm movement of any kind is 0.16 s before.** The order is the same as videos 8 and 9; the lead is the same size.

**One qualification, and it matters: this clip cannot test "above the head."** In video 9 the hand went a full head-length above the crown. Here the rear hand tops out level with the **middle of the head** (measured on the gridded frame at 30.333: hand at source y = 592, head top 578, head centre ≈ 590). **But the camera is a drone looking down**, which is exactly the geometry that compresses anything raised above the head. So this read confirms **the order and the lead time**, and **abstains on the height**.

**And the second direction change in the same ride takes no raised arm at all** (§2.3, T3) — which reproduces video 9's roundhouse-cutback exception on a different kind of turn.

### 0.3 — The camera: a drone behind and above. It does **not** fix video 9's problem; it swaps it for two new ones.

Video 9 ended by asking for footage **shot from the water or down the line**, because a beach lens puts the board across the image and hides the knee bend. **This is down-the-line — and from above.** The result is worth writing down, because it changes what a future clip should be asked for.

**What the drone gives us, and no previous clip had:**
- **the feet, on the deck, from above** — footwork is directly observable instead of inferred (§2.4);
- **the hips' position along the board** — the fore-aft axis is read off the picture rather than guessed from a silhouette (§2.4);
- **the board's heading**, so a *direction change* can be counted as a fact rather than a judgement.

**What it takes away:**
- **the leg chain is still not measurable when it matters.** `|hip→ankle| ÷ (|hip→knee| + |knee→ankle|)` was readable on **2 of 7 frames attempted**, and both were frames where the rider is visibly extended; it read **96–100 %** on all four legs. On the five deep frames the knee or the ankle could not be placed at all — **modern boardshorts cover the knee exactly when the thigh goes horizontal** (video 9 hit this on its rider B), and spray or whitewater covers the ankle. So this clip **neither confirms nor refutes video 9's saturation claim**; it reproduces the same failure for a different reason.
- **the vertical ruler is now corrupted too, and in a way nobody has flagged.** A drone behind and above turns a **forward trunk fold into a forward translation in the image** rather than a vertical shrink. Measured: apparent stature (head-top to deck, in head-lengths) was **4.96 at t = 29.10, folded ~45°**, and **4.96 at t = 29.50, nearly upright** — *identical*, across a posture change anyone can see. **The number did not move because the fold moved the head sideways, not down.** Any depth read from this camera by a vertical ruler is worthless.

> **So: I name no rung for any frame in this clip, and nobody should quote one from it.** What survives is the *relative* leg motion visible to the eye, the leg chain on the two extended frames, and everything in §0.1 that does not need a depth figure.

**What footage would actually settle it:** a clip from **in the water, level with the rider, side-on**, where the knee bend is in-plane *and* vertical is vertical. Neither the beach lens (clips 7–9) nor the drone (this one) is that shot.

### 0.4 — The rate: faster than any clip in the series

| | |
|---|---|
| **Unambiguous direction changes** (the board visibly reverses across the face, with a spray fan) in rider A's ride, ≈18.8 → 35.8 s | **9** |
| Counting the five more I judged likely but did not resolve | **14** |
| **Interval** | **one every 1.2–1.9 s** |
| The busiest stretch, 30.24 → 35.5 (5.3 s) | **6 direction changes — one every 0.9 s** |
| The quietest stretch, 27.0 → 30.2 (3.2 s) | **0 direction changes, and ~5 fold/unfold half-cycles at ~0.5 s each** |

Video 9 recorded ≥13 in 30 s (one per 2.3 s) and called it the busiest footage the series had. **This is roughly twice that rate**, and it comes with a complete bottom-turn → climb → top-turn chained in **0.88 s** (§2.3, T2–T3). **Nothing in the game chains turns at this rate**, and the 2026-11-10 ruling on the calibrated Canyon B wave records that the rider *"can't carve up, falls"* — so the gap here is not stylistic.

### 0.5 — What is on screen: a wide drone shot, two riders, one long ride each

| window | who | what |
|---|---|---|
| **15.0 – 17.2** | **A** — black long-sleeve top, **salmon/navy boardshorts**, white board with an orange tail pad | **sitting on his board** in the lineup, legs over the side; a second person beside him |
| 17.5 – 18.5 | — | the drone is wide; I could not locate a body |
| **≈18.8 – 35.8** | **A** | **one long ride.** ≥9 direction changes, a 3.2 s trim/pump passage, a bottom turn → climb → top turn at 30.2–31.2, a foam section at 31.5–33, two more turns, finishing in whitewater at ≈35.5 |
| 36 – ≈43 | — | the drone flies on; a prone paddler at ≈43 |
| **≈44 – 55** | **B** — **dark wetsuit top, dark shorts, light-blue board** | a second ride; readable at 44.5–47.5, 50, 53, 54. Same vocabulary: a deep fold over the board at 47.0, a laid-out turn with a tail fan at 53.0, arms out and level at 54.0 |

**I did not locate a hard cut.** A 16×9 luminance-signature detector over 35.0–44.6 at 0.2 s found **no discontinuity above the drone's own motion**, and `video-ref-8` and `-9` both record that such detectors fail on surf footage. The two riders are unambiguously different people on different boards; whether the join is a cut or one continuous drone flight is **unresolved** (§6).

### 0.6 — Which channel carries the posture change here

Video 9's sharpest finding was that **either** channel can carry a whole posture change alone — rider A used the trunk, rider B used the legs, nine seconds apart. **This clip's rider uses both together and the arms separately.**

- **Into and out of the trim cycle (27.0–30.2):** the trunk and the legs move **in the same direction, together**. At 29.10 the trunk is folded ~45° and both knees are inside the shorts (bent enough to hide them); at 30.00 the trunk is ~25–30° and both legs measure **99 % and 100 %**. I could not separate their clocks within my ±15° on the trunk.
- **Into the bottom turn (30.00–30.24):** **the arms move alone.** For 0.12–0.16 s the arms travel from low-and-tucked to wide-and-head-high while the legs stay long, the trunk stays where it was, and the board stays flat. **That is one channel moving with the other three static, and it is the clearest single-channel event in the clip.**
- **Through the top turn (30.76–31.20):** **the body does not move at all while the board does everything.** The legs stay down, the trunk stays laid forward, both arms stay out and low, for 0.44 s, while the board goes from climbing to reversed.

**Did I see two channels moving in OPPOSITE directions at once?** **No — and I do not think this camera could show it.** The trunk angle carries ±15° here (worse than video 9's ±10°) because the drone **orbits** the rider, so its aspect changes continuously; a 35° un-fold under a held leg depth, which is what video 9 caught, would be inside my error bar. **What I did catch is the weaker but still unrepresentable form: one channel moving while the others are frozen, in both directions — the arms alone for 0.12 s, and the body frozen for 0.44 s while the board turns.** The game's trunk is an affine function of its leg depth within a stage, and its arms share the knees' trigger, so it can produce neither.

### 0.7 — Repeated, with counts

| thing | count | where |
|---|---|---|
| **Direction changes, rider A's ride (≈17 s)** | **9 certain, up to 14** | 19.75, 22.4, 25.5, 26.5, 30.25, 30.95, 31.5, 33.7, 34.5 (+21.3, 23.1, 24.5, 27.1, 35.2 likely) |
| **Fold/unfold half-cycles in trim with no direction change** | **≈5 in 2.5 s (~0.5 s each)** | down 27.0, up 27.5, down 28.0, up 28.4, down 29.1, up 29.5 |
| **Windows with the rear hand out at head height, held** | **3** | 19.25, 24.5, 30.12–30.40 (~0.3 s) |
| **Windows with a hand unambiguously ABOVE the crown** | **0 — but see §0.2; the drone cannot test this** | — |
| **Windows with both hands low and forward near the deck** | **6** | 27.0, 29.10, 33.5, 34.0, 35.0, and rider B at 47.0 |
| **Windows with both arms spread wide and roughly level** | **5** | 29.5–29.75, 30.25, 33.25, 34.75, rider B at 54.0 |
| **Visible steps along the board** | **0, in 12 frames seen from directly above where both feet and the deck were legible** | 27.0–33.0 |
| **Direction changes resolved on the 0.04 s grid** | **2** — one led by the rear arm (0.12 s), **one with no raised arm at all** | 30.24; 30.76–31.20 |
| **Riders swallowed by whitewater and still standing** | **2** | 32.0–33.0 (A), 35.5 (A) |

### 0.8 — Slow motion: at or near real time, for the third clip running

- **The stream is a true 25 fps**, measured directly: seeking on a 0.01 s grid and hashing the drawn pixels, the picture changes at **exactly 0.04 s intervals, seven times in a row**. (This matters for method as well: sampling at 1/30 s on this clip produces duplicate frames, and two of my early tiles were duplicates for that reason and nothing else.)
- **The durations settle it.** The pump half-cycle is **~0.5 s**; the bottom turn runs entry → board-round **30.24 → 30.50 = 0.26 s**; the climb **30.50 → 30.95 = 0.45 s**; the top turn **30.95 → 31.12 = 0.17 s**; the whole chain **0.88 s**. At 2× those become a 0.25 s pump half-cycle and a 0.44 s complete bottom-turn-climb-top-turn, which is not human. At 4× it is absurd.
- **Best reading: at or near real time**, the same conclusion as videos 8 and 9 by the same route, now on a third independent clip. A mild slowdown (≤ ~1.3×) cannot be excluded.

> ### ⚠️ 0.8a — My 0.26 s bottom turn is **not the same quantity** as the literature's 0.96 s. Do not set them side by side.
>
> **Forsyth et al. 2024** — **0.96 ± 0.04 s, 99° turned, 3.8 m radius, 1.41 g**, from **n = 6 riders and 835 turns**, the only properly powered population in this project's evidence base — measures *a bottom turn*. **My 0.26 s measures something narrower: first rail spray to the moment the board stops swinging and starts climbing.** It excludes the **0.16 s of arm and weight set-up before the rail bites** (§0.2) and it excludes the exit entirely.
>
> **Measured on a window closer to Forsyth's, the same manoeuvre is 0.87 s** — first arm movement at 30.08 to the top of the climb at 30.95.

**⚠️ CORRECTION (2026-11-18, raised by the Codex review and checked here): it does NOT sit inside their interval, and the interval is not what it was taken for.**
- **The arithmetic band of 0.96 ± 0.04 s is 0.92–1.00 s, and 0.87 is BELOW it.** The original sentence said "inside" and was simply wrong.
- **And the ± is a summary of a GROUP MEAN, not a range for individual surfers**, so "inside the interval" would not have been the right test even had the arithmetic worked. **Forsyth's own population is 6 riders and 835 turns OF MIXED TYPES, and its radius and lateral-g values are derived estimates rather than measurements** — so only the duration column carries weight at all.
- **What survives:** the 0.87 s and the 0.26 s are **two honestly-labelled windows of the same manoeuvre** — 0.26 s is first rail spray → board stops swinging; 0.87 s adds the 0.16 s of arm and weight set-up and the exit. **Both are useful WHEN LABELLED, and neither sets an animation duration.** The 0.26 s must never be set against Forsyth, because it is a sub-window of a different quantity.
- **§0.8's real-time conclusion is untouched**, because the figures that exclude 2× and 4× — the pump half-cycle and the squat-to-stand — are **whole-cycle quantities with no window ambiguity.**
>
> **So this clip is not evidence that these turns run four times faster than the published population.** It is evidence that *"a bottom turn"* has at least two defensible start and end points, and that **0.26 s and 0.96 s can describe the same turn.** Anyone quoting a duration from this document — or setting one beside a game figure — must say **which window** they mean. This project has had twenty-eight real numbers turn out to be in the wrong frame, and a turn duration with an unstated window is the next one.
>
> **This does not weaken §0.8's conclusion**, because the two measurements that exclude 2× and 4× — the **pump half-cycle** and rider B's **squat-to-stand** — are whole-cycle quantities with no such ambiguity.

---

## 1. Method and limits (read before any number)

### 1.1 The quality ladder is **per video** — this one stops at 1080p

`document.querySelector('#movie_player').getAvailableQualityLevels()` returned `["hd1080","hd720","large","medium","small","tiny","auto"]`. **There is no hd1440 and no hd2160 on this video**, so video 9's "always reach for 1440p" is a property of *that* upload, not of long-form YouTube. The viewport was enlarged to 1280×1000 and the page reloaded before anything was measured, and `setPlaybackQualityRange('hd1080','hd1080')` pinned the top rung. **There was no consent gate** (as video 9 also found on a long-form watch page).

**Rider height in pixels, in the 1920×1080 source:** about **140–190 px** through the readable part of rider A's ride (head-top to deck), falling to **≈30 px** in the widest drone framings at 17–19 and 37–44. Comparable to video 8's 250–400 and below video 7's 620. Every measurement frame below is a crop of **105–200 source pixels** drawn at **3.7–7.0×** onto the overlay canvas with a **10 px source-pixel grid** over it, so landmarks were read off a ruler rather than guessed. **Landmark error ±3 source px; trunk angles ±15°; any depth fraction ±15 points and, on this camera, meaningless in absolute terms (§0.3).**

### 1.2 The screenshot ceiling — video 9's figure confirmed, with the correct scale

**The pane returns an 800×600 screenshot however large the viewport.** With the viewport at 1280×1000 the canvas→screenshot scale measured **0.784**, not the naive 0.625 — so a **1020×760 canvas lands at 800×596 and is entirely visible**. (My first measurement crop was placed 200 px wrong because I assumed 0.625; the grid in the stamp caught it within one frame.) Video 9's 1020×760 figure is confirmed.

### 1.3 The traps, and what each one did here

**Every drawn frame carries the reached `currentTime`, a frame counter, the stream dimensions and the crop stamped into the canvas**, plus a hash of the drawn pixels with a red **`DUP!`** flag when two successive draws hash identically. `__seek` waits for the `seeked` event *and* `requestVideoFrameCallback`, then retries up to three times if `mediaTime` is more than 60 ms from the request.

**A new trap, and it cost me two frames before the stamp caught it: `javascript_tool` has a 45 s ceiling, and a script that times out KEEPS RUNNING.** A 164-seek cut-detection loop timed out — and for the next two minutes it was **still seeking the video underneath my measurement calls**. One `__big(30.00)` returned `mediaTime = 30` while the canvas stamped `currentTime = 53.85`; a second returned a crop of empty water. **Both were discarded on the stamp, and the `DUP!` flag on the re-take afterwards proved which of them had actually been the t = 30 frame.** The rules that follow: **split any loop into chunks that finish in under ~40 s**, and **discard any frame whose canvas stamp disagrees with the `mediaTime` its seek returned.**

**The partially-composited canvas did not fire** on this read; the 2.2–2.5 s wait before each screenshot was kept throughout.

**The auto-crop size trap was avoided by construction.** Every montage uses a **fixed crop size in source pixels** centred on the found rider, so the magnification is identical across every tile in a strip and apparent size is comparable. Video 9's false "big extension" came from variable crop widths; that cannot happen here. Absolute landmark measurements were still taken only on **single, gridded, fixed crops**, never off a strip.

**Finders.** A **red/salmon detector** (R−G > 22, R−B > 18, R > 85, then a median-filtered cluster) located rider A's boardshorts in **about 60 of 66** sampled frames and failed only when the wave face or a traction pad dominated. A **dark-island detector** (integral image, a 5×9 inner box scored against a 19×23 ring) was written for rider B's wetsuit and **failed** — the unbroken wave face is darker than the wetsuit. A skin detector also failed (too little exposed skin at this distance, cool grade). **Rider B was located by hand in 10 of 24 sampled seconds**, which is why §0.5's second row is thin.

### 1.4 Sampling, and the tab

About **150 drawn frames**. Steps: **2.0 s** for the survey of 15–55; **1.0 s** for 15–38; **0.5 s** for 15–26.5 and 44–55; **0.25 s** for 19.0–21.75 and 27.0–35.75; **0.1 s** for 22.0–23.1 and 30.0–31.1; **0.04 s** (the stream's own grid) through the two direction changes at 30.00–30.44 and 30.76–31.20; and a 0.01 s sweep across 29.00–29.30 for the frame-cadence test.

**Browser tab: `tab-1`**, created with `tabs_create` and **passed explicitly on every `navigate`, `resize_window`, `javascript_tool` and `computer` call.** The pane had to be opened first with a `navigate` (which created a `seed` tab); that tab was absorbed and **no measurement came from anything but `tab-1`**. The tab was closed at the end and the viewport reset. **No other video read was running.**

---

## 2. Part A — what the body does

**Stance.** The leash strap is on the **camera-right** ankle in every frame where it is visible, and that foot is the one nearer the tail — so the camera-right foot is the **rear** foot. In the same frames the shorts' seat faces the lens, so we are looking at the rider's **back**: his right is on our right, and the rider is **regular-footed (left foot forward)**. The drone sits on the **trough** side, so his chest faces the wave: **frontside**, though see §6 — the drone orbits and I would not defend that last word hard.

### 2.1 The measured frames

Landmarks in source pixels, ±3. **No rung is named, for the reason in §0.3.**

| t | what it looks like | trunk from image-vertical | **leg chain, front / rear** | arms | fore-aft |
|---|---|---|---|---|---|
| **27.00** | crouched, legs in spray | ~45° | **not measurable** (knee in spray) | both hands low and forward | — |
| **29.10** | folded over the board, head out over the nose | **~45°** (±15) | **not measurable** (both knees inside the shorts) | lead hand low at the thigh | head over the **front** foot, hip at 72 % of the way to the rear foot |
| **29.50** | tall, arms out and level | **~33°** (±15) | **100 % / 96 %** | both arms spread wide, roughly level | head at 40 % from the front foot, **hip at the rear foot** |
| **30.00** | trimming, legs long, hands tucked low | **~25–30°** | **99 % / 100 %** | left hand across the chest, right hand at the hip — **both low** | head forward of the hip; **hip at the rear foot** |
| **30.33** | mid bottom turn | — | — | **rear hand at head height, out to the side; lead hand out-left and below the shoulder** | — |
| **31.00** | laid almost flat over the board under the lip | not measurable | **not measurable** (half inside spray) | both arms out, low and wide | — |
| **32.25** | crouched in whitewater | ~45° | **not measurable** (ankles in foam) | both hands low | — |
| **34.00** | **deepest fold of the clip** — head down near the deck, both hands at the rail | not measurable (near-overhead view) | **not measurable** | both hands low and forward | — |

**The leg-chain population is 2 frames and 4 legs, all 96–100 %.** Five further attempts were abandoned. **That is an abstention, not a result**, and it should not be added to any tally of "riders in the Tall band".

### 2.2 Where this rider spends the clip

- **Trunk**: between about **25°** and a fold so deep the head reaches the deck (34.00). The ordinary cruising posture is **30–50° folded over long legs**, held for half a second at a time, exactly the posture videos 7, 8 and 9 all reported and which the game has no stance for.
- **Legs**: visibly long in trim (99–100 % on the two measurable frames) and visibly bent in every deep frame — but the bend was never measurable, so I give it no number.
- **Arms**: four carriages, five if the single lead-arm reach counts (§2.5).

### 2.3 The transitions — the centrepiece

**T1 — the trim passage (27.0 → 30.2, 3.2 s): five fold/unfold half-cycles at ~0.5 s, and zero direction changes.**
Down at 27.0, up at 27.5, down at 28.0, up at 28.4, down at 29.1, up at 29.5. Through all of it the board runs flat and fast and the heading does not change. At the one point in the cycle where both knees were readable (**30.00**, near the top of a cycle) the legs read **99 % and 100 %** — long. **Video 8 measured ~0.6 s per half-cycle, video 9 ~0.55 s, this clip ~0.5 s. Three riders, three oceans, the same number.** It remains the most reproducible figure the series has.

**T2 — the bottom turn (30.24 → 30.50 = 0.26 s on a rail-spray-to-board-round window, or 0.87 s counted from the first arm movement — read §0.8a before quoting either), and the arm is beat zero.**

| beat | window | duration | what happens |
|---|---|---|---|
| **arm** | **30.08 → 30.16** | **0.08 s** | The lead hand leaves the body, then **the rear arm goes out to shoulder and then head height. Nothing else changes: board flat, legs long, trunk unmoved.** |
| **set** | 30.16 → 30.24 | 0.08 s | Both arms wide and held; the weight travels back; the wake broadens. **Still no rail spray.** |
| **entry/load** | **30.24 → 30.36** | 0.12 s | The rail bites, the first spray appears at the tail, the fan grows, the body sinks onto the rail. **The arms do not move — they are parked.** |
| **exit** | 30.36 → 30.50 | 0.14 s | The board comes round and starts to climb; the arms are still wide. |

**T3 — the climb and the top turn (30.50 → 31.12, 0.62 s), and this one takes no raised arm at all.**
From 30.76 to 31.20 — eleven consecutive frames on the stream's own grid — **the body does not change**: laid forward over the deck, legs down, both arms out and low like wings, head down. The board, underneath it, climbs, reaches the lip at ≈30.96, and reverses by ≈31.12. **The body is still laid out at 31.20 and still folded at 31.50 — roughly 0.4–0.5 s after the board has finished.**

Two findings in one passage. First, **the big arm carriage is turn-specific**: the bottom turn took the rear arm out and up; the top turn took both arms low and wide and nothing went up. Video 9 found the same split (overhead arm on two direction changes, lead arm on a roundhouse cutback) — **so two clips now say the arm pattern names the manoeuvre**, and that is the live question the brief flagged. Second, **the body's exit lags the board's by ~0.4 s**, which is video 9's number to the tenth.

**T4 — the whole chain in 0.88 s.** Trim → bottom turn → climb → top turn → down the face, 30.24 → 31.12, with the next direction change at ≈31.5. Six direction changes follow in the next 4 s.

**T5 — recovery.** At 31.5–33.0 he is swallowed by whitewater and rides out of it still standing, folded 45–60° with both hands low; at 35.5 the same again, ending the ride. **Neither is a wipeout and neither is a clean trim — it is a third thing, and it happens twice.**

### 2.4 The two things only a drone could show

**The feet: zero steps, and this time it is not an inference.** Across twelve frames between 27.0 and 33.0, seen from **directly above the deck** at 2× magnification — including the bottom turn, the climb, the top turn and the whitewater — **both feet stay on the deck and the stance width does not change by as much as I can measure.** Videos 7, 8 and 9 all reported 0 steps and all three had to qualify it ("the feet are behind spray or the board for most of the clip"). **This is the first clip in the series where the feet are the clearest thing in the frame, and the answer is the same: they do not move.** The game gets this row right by construction, and it is worth saying so.

**The fore-aft axis, measured along the board instead of guessed from a silhouette.** On the three frames with both feet and the hips placeable:

| t | head, as a fraction of the way from the front foot to the rear foot | hip, same scale |
|---|---|---|
| 29.10 | **0.00** (over the front foot) | 0.72 |
| 29.50 | 0.40 | **1.00** (at the rear foot) |
| 30.00 | 0.73 | **1.04** (at/just past the rear foot) |

**In all three the hip sits at or beside the rear foot while the head sits forward of it, and the feet never move.** This is the fifth clip to report the differential (Kirra, 7, 8, 9, and this one) and the **first to measure it from above**. It is also the cleanest statement of it the series has: the rider works fore-and-aft by **where he puts his hips between two fixed feet**, with the shoulders on the other end of the lever.

### 2.5 The arms — four carriages, and carriage is independent of depth again

| # | carriage | windows | count |
|---|---|---|---|
| **A** | **both hands low and forward, near the deck**, trunk folded | 27.0, 29.10, 33.5, 34.0, 35.0, rider B 47.0 | **6** |
| **B** | **both hands tucked low against the body** (left across the chest, right at the hip), trunk only lightly folded, **legs long** | 30.00–30.04, 35.25 | **2** |
| **C** | **both arms spread wide and roughly level** | 29.5–29.75, 30.25, 33.25, 34.75, rider B 54.0 | **5** |
| **D** | **rear arm out and up at head height, held**, lead arm out and down | 19.25, 24.5, 30.12–30.40 | **3** |

**The decisive pair is 0.5 s apart in one shot: at t = 30.00 the legs measure 99 %/100 % — the longest reading in the clip — and both hands are tucked low and narrow; at t = 29.50 the legs measure 100 %/96 % and both arms are spread wide.** Same leg channel, opposite arm carriage. **Both "tall ⇒ arms spread" and "deep ⇒ arms spread" stay refuted, for the fourth clip running.** Carriage **D** is again a *held position with a duration* (~0.3 s here), not an instant.

### 2.6 Rider B, briefly

The same vocabulary at a smaller scale: a long-legged trim with a 40–45° fold (44.5–45.5), a direction change with the rear arm out (46.0), **the same deep fold over the board with the head down and both hands at the rail (47.0)**, a laid-out turn throwing a tail fan (53.0), and both arms out and level as he comes up (54.0). **Two riders, two boards, one grammar.** He was located by hand in only 10 of 24 sampled seconds, so nothing here is a count.

---

## 3. Against the nine existing reads — leading with disagreement

**3.1 — DISAGREES with video 9's implicit remedy.** Video 9 concluded that the leg chain is saturated in **broadside** footage and asked for footage **from the water or down the line**. This *is* down the line. **The chain still could not be read on a single deep frame** — not because of projection this time, but because **boardshorts cover the knee and spray covers the ankle**. The remedy video 9 proposed is therefore **not sufficient on its own**; what is needed is a water-level, side-on shot of a rider whose knees are **not** inside his shorts. That is a different request, and it should replace video 9's.

**3.2 — DISAGREES with the series on whether apparent stature is a safe ruler.** Video 9 called hip-÷-head-length *"the one depth statement in this document I would defend without qualification."* **On this camera it is worthless**: 4.96 head-lengths at a 45° fold and 4.96 at nearly upright, 0.4 s apart. **The ruler is safe for a level lens and unsafe for a raised one**, which no document in the series had said. It does not invalidate video 9's numbers (that lens was level, from the beach); it bounds where they apply.

**3.3 — CONFIRMS and extends the arm-lead finding, now on a third clip and a third rider**, at the stream's own frame rate: **0.12 s**, against video 9's 0.07–0.10 s and video 8's 0.1–0.2 s. **But it abstains on "above the head"** (§0.2) — the drone cannot test it.

**3.4 — CONFIRMS video 9's "not every turn takes the overhead arm", on a different kind of turn.** Video 9's exception was a slow roundhouse cutback carried on the lead arm. Here the exception is a **fast top turn / lip hit carried with both arms low and wide and nothing raised**. Two clips, two exceptions, two different manoeuvres. **The pattern now looks like: the arm that goes up belongs to the bottom turn, and the turn at the top does not get one.** Two samples is not a law, and I say so.

**3.5 — CONFIRMS video 9's trunk-lags-the-board finding, to the tenth of a second.** Video 9: *"the trunk is still folded 60–70° a full 0.4 s after the board had come round."* Here: the body is still laid forward **0.4–0.5 s** after the board has reversed.

**3.6 — CONFIRMS the pump cadence for the third time** (~0.5 s per half-cycle against 0.6 and 0.55), and **the fore-aft differential for the fifth time**, now measured rather than inferred (§2.4).

**3.7 — DISAGREES with video 9 on rate, in the same direction video 9 disagreed with video 7.** Video 7 had 0 direction changes in 13 s; video 9 had ≥13 in 30 s and called it the busy end. **This clip is about twice video 9's rate**, with a 0.88 s bottom-turn-climb-top-turn chain. **The busy end is busier than the series thought.**

**3.8 — AGREES on real time, by the same method, on a third clip** (§0.8), and adds a fourth timeable manoeuvre class (a 0.26 s bottom turn).

**3.9 — Does any rider sustain the game's shipped Crouch depth? This clip ABSTAINS**, as video 9 did, and for an additional reason: both of its rulers are broken here, not just one (§0.3).

**3.10 — No metre figure was inherited.** The centre-of-mass-for-hips error in `video-ref-2.md`, `video-ref-3.md` and `kirra-reference-50-196s.md` is avoided by construction: **this document quotes no game depth number at all.**

---

## 4. Part B — the mapping, with the owner's Canyon column

What the game has (`3.5/stance-frame.md`, `3.5/body-channels.md` and the code they cite): **Tall**, **Crouch as shipped**, **Compress**, **Snap**, the tube tuck; a fore-aft trim input, a rotation stick, a hand drag. Moves: trim, drop-in, bottom turn, carve, cutback, snap, pump, tube ride.

The **Canyon** column answers one question: *on what the owner actually rides — the shipped rider at Canyon with `?canyonWaves=true` — could it be attempted at all?* It is answered from `body-channels.md` (physics body = **7 point masses in one hard-coded posture**, moved by **one scalar vertical shift** and **one rigid horizontal translation of five of the seven parts**; **no part is ever rotated about another**) and from the rulings already on file. **I measured nothing in the game.**

| # | what the rider does (clip time) | game stance or move | have it? | **could the Canyon rider attempt it?** |
|---|---|---|---|---|
| 1 | **The rear arm goes out and up to head height 0.12 s BEFORE the rail bites, and is held ~0.3 s** (30.08–30.40) | — | **Not at all** | **No.** There is no arm *position* in the physics at all. `HumanBalance.arms` is one scalar with no height, no spread and no left/right, exists only on `?rider=new`, is triggered by **the same expression that drops the knees**, and its time constant (`ARMS_TIME` 0.15 s) is **three times slower** than the knees' (`MOTOR_LAG` 0.05 s) — so the one orderable pair runs backwards |
| 2 | **A turn carried with NO raised arm, both arms out and low** (30.76–31.20) | carve / top turn | **Partly** — the move exists | **No, as a distinct thing.** With no arm channel the two turns are indistinguishable; the drawn arm map is selected by stage × depth and is not addressable |
| 3 | **The body's fold still held 0.4–0.5 s AFTER the board has come round** (31.12 → 31.50) | — | **Not at all** | **No.** Within a stage the drawn trunk fold is `tall + (deep − tall) × depth` — an affine function of drawn leg depth (`HumanoidRig.hinge()`). It can lag only by its own smoothing of the depth signal; it has no clock of its own |
| 4 | **A 3.2 s trim passage: ~5 fold/unfold half-cycles at ~0.5 s over legs reading 99–100 %** (27.0–30.2) | **pump** | **Not at all, as the thing it is** | **No, twice over.** The game's pump is leg depth, not trunk fold; and on the Canyon/pool wave **the stick is inert below 4 m/s** (measured: 67 767 column-values, 0 differences), so the rider has no pumping authority at exactly the speeds where he would need it |
| 5 | **9–14 direction changes in a 17 s ride; 6 of them inside 5.3 s; a complete bottom-turn → climb → top-turn in 0.88 s** | all the turning moves | **Partly** — individually | **No.** Nothing chains turns at this rate, and the 2026-11-10 ruling on the calibrated Canyon B wave records *"can't carve up, falls"* with the five "hold the climb" routes all failed |
| 6 | **Both feet planted; 0 steps in 12 overhead frames; stance width constant** | — | **Have it** | **Yes — by construction.** The feet are at fixed deck positions and nothing moves them while upright. **The one row the game gets right, now checked from directly above** |
| 7 | **Hips at/beside the rear foot with the head forward of them, feet planted** (3 measured frames) | fore-aft trim input | **Partly at best** | **No.** `TRIM_SHIFT = 0.25 m` moves pelvis, torso, head **and both arms together**; a hips-aft/shoulders-forward differential is not expressible, and fixing it is downstream of a trunk joint in the mass model. **Fifth clip** |
| 8 | **A deep fold with the head down near the deck and both hands at the rail** (34.00; rider B 47.0) | Crouch / Compress | **Not at all** | **No.** The footage wants **fold**; the game has only **leg depth**, and at a backside bottom turn the drawn trunk cannot move with depth whatsoever (30 → 30°) |
| 9 | **One leg at 96 % while the other reads 100 % in the same frame** (29.50) | — | **Not at all** | **No.** One leg spring for both legs — one rest length, one stiffness, one row in the board's solve. A second spring is a force change and the owner's ruling |
| 10 | **Both arms spread wide and level arriving AS the body finishes extending, not before** (5 windows) | — | **Not at all** | **No.** Arm spread is capped by `stanceRoom(depth).arms` and triggered by the knees — it cannot arrive on its own schedule |
| 11 | **Both hands carried low and narrow against the body while the legs are at their longest** (30.00) | — | **Not at all** | **No.** The arms' only physics effect is inertia; where they are reaches nothing |
| 12 | **A 0.17 s top turn at the lip, and a 0.26 s bottom turn** (window-dependent — §0.8a) | snap / bottom turn | **Partly** | **Doubtful.** The owner's 2026-11-08 note stands: snaps and carves need **60–80°** lips and the solver holds **~15–20°**, so there is no lip at Canyon to hit at this rate |
| 13 | **Riding out of whitewater still on the feet, twice** (31.5–33.0, 35.5) | wipeout / recovery | **Partly** | A wipeout exists; "swallowed and still riding" does not |
| 14 | **Both hands low and forward near the deck, 6 windows across two riders** | hand drag | **Partly** | The `hand` input is **on/off** and **the game chooses which hand** |
| 15 | Drop-in / take-off, tube ride, air, snap | — | **Not readable in this window.** The only take-off is rider B's at ≈43 and he is ~30 px | — |

**The "not at all" rows are 1, 3, 4, 8, 9, 10 and 11 — seven of fifteen, and six of the seven are one gap seen from different sides: the body has one number where the footage has four independent ones.** Row 3 is the sharpest here, because it needs the trunk to run on a clock the board does not set. Row 5 is the **rate**, which video 9 raised and this clip doubles. **Row 6 is the one row to be pleased about.**

---

## 5. By-products for the open questions (not the point of this read)

- **Which manoeuvres take the big arm?** **The bottom turn did; the top turn did not.** With video 9's roundhouse exception that is now 2 clips and 2 kinds of turn that go without. **The open question has a shape: the arm belongs to the turn at the bottom.**
- **Held versus spike:** no leg-depth hold was measurable, because no deep frame's leg chain was readable (§0.3). **Abstain.**
- **Does the shipped Crouch depth exist in footage?** **Abstain**, with both rulers broken.
- **Is this footage real time?** Yes, to within about 1.3× (§0.8).
- **Does any rider step?** **No**, and this is the first clip that can say it from directly above (§2.4).
- **Carriage versus depth:** still independent, now with the clip's longest legs carrying its *narrowest* arms (§2.5).

---

## 6. Part C — what I could not see, and why

- **Absolute depth, in any form. I name no rung for any frame, and no hip fraction should be quoted from this document.** Both rulers fail on this camera, in the two different ways set out in §0.3.
- **Knee angles. I report none, deliberately** — the chain was readable on 2 of 7 attempted frames and both were extended ones; converting that into an angle would dress a sampling bias as a measurement.
- **The knee in every deep frame**, for two causes that compound: **boardshorts reach the knee** exactly when the thigh goes horizontal, and spray or whitewater covers the ankles in every loaded turn.
- **Whether a hand ever goes above the crown.** The drone looks down, which compresses exactly that. §0.2 reports the *order*, not the height.
- **Trunk angles better than ±15°**, because **the drone orbits** — at 24.5 and 54.0 the riders face the lens; at 29–31 we see their backs. Aspect changes continuously within a single ride, so trunk angles are not comparable frame to frame, and **a 35° un-fold of the kind video 9 caught would sit inside my error bar.** That is why §0.6 reports no opposite-direction pair.
- **Frontside versus backside.** Inferred from the leash side, the seat of the shorts and the drone's position relative to the trough. **Regular-footed is solid; frontside is an inference and I would not defend it hard.**
- **Where the cut between rider A and rider B lies**, or whether there is one (§0.5). A luminance-signature detector found nothing above the drone's own motion over 35.0–44.6.
- **17.5–18.5**, where the drone is wide and I could not locate a body; and **36–43**, which I sampled only at 1–2 s.
- **Rider B properly.** No red clothing, so every finder failed on him; he was placed by hand in 10 of 24 sampled seconds. **Nothing in §2.6 is a count.**
- **The take-off at ≈43** and the two foam recoveries at a useful size.
- **Any identification of either rider**, and whether the two shots are the same wave.
- **Anything outside 15–55 s.** The owner scoped this read and I did not look further, so nothing here says anything about the other 240 s.
- **Anything about the wave, the lip, the foam or the spray.** The owner has asked five times; this document does not describe them except where they hide a body.

---

## 7. What this round did not do

- **No file under `src/` or `server/` was touched.** This is evidence, not a fix.
- **Nothing was ridden, built, benchmarked or measured in the game.** Every game statement in §4 is quoted from `3.5/body-channels.md` and the rulings already on file.
- **The nine earlier reference documents were not edited**, as the brief required.
- **No video file was downloaded**, and no stream fetch was attempted.
- **The skill file was not edited.** Five method findings that belong in it are recorded here instead: the **per-video quality ladder** and that this upload stops at 1080p (§1.1); the **25 fps stream** and how to measure a stream's own frame grid by seeking and hashing (§0.8); the **45 s `javascript_tool` ceiling and the fact that a timed-out script keeps running and keeps seeking** (§1.3), which is the one a later read most needs; the confirmed **0.784 canvas→screenshot scale** (§1.2); and **what a drone camera does and does not fix** about the depth rulers (§0.3), together with the sharper footage request that follows from it.
