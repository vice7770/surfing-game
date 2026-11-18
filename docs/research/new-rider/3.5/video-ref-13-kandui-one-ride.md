# Video reference 13 (Kandui, Mentawais): one unbroken 16-second ride in a single held fold — and the trunk angle turns out to have an admissibility problem of its own

Source: **https://www.youtube.com/shorts/9k-MU6Q5Lhc**, title *"10FT KANDUI! 😱 MASSIVE BARRELS & INSANE WAVES — 2026 #subcribe"* (`@kantorpulau8356`). Length **17.741 s**, read in full. The **thirteenth** reference the owner has sent.

Delivered to the browser pane at **1440×2560** (`hd1440`), pinned before every measurement frame. Stream is **30 fps** (§1.3), `playbackRate` 1. `yt-dlp`, `ffmpeg` and `youtube-dl` are all absent from this machine (checked, as the skill asks), so nothing was downloaded; every frame is a screenshot of the browser pane, **tab `tab-1`**, claimed with `tabs_create` and passed explicitly on every call. A second agent was reading the same clip independently; **I did not look for its notes and nothing here is informed by them.**

**I was given no hypothesis and I did not adopt one.** The owner's standing purpose — *"study surf movements to improve the riding engine"* — is the brief; the wave is somebody else's track.

**Every figure below is an estimate from pixels**, and each carries its own error bar.

---

## 0. The answer first

### 0.1 — What this rider's movement is actually like

**He takes one posture at the start of the ride and holds it for eight seconds at a stretch — folded forward, knees bent, both hands low over the deck — through a climb, a drop, a barrel and a bottom turn, and he changes it exactly once, when the wave lets him go.** That is the clip's one sentence.

The whole body-movement content of a 16-second ride is:

| | |
|---|---|
| **0.00 → 8.75** | folded forward, knees bent, both hands low over the deck. Unchanged across **8.75 s** of continuously visible riding, 36 sampled frames, including a climb to the lip (6.2–6.5), a drop (6.5–6.8) and 1.7 s of trim |
| **8.88 → 10.00** | behind the curtain. Not visible |
| **10.14 → 13.85** | the same posture again, **3.7 s**, including the bottom turn at 11.9–12.2 |
| **13.85 → 14.20** | the one transition: **up**, trunk and legs together, in **0.35 s** |
| **14.20 → 16.10** | upright: trunk within ~5° of vertical, legs extended, **1.9 s**. Hands to the head 14.35–15.55, then low and forward |
| **16.10 → 16.50** | leaves the board in a deliberate head-first dive, arms extended forward |

**Two postures and one transition, in sixteen seconds.** Compare `engine-target.md` row 8's range: V7's 0 direction changes in 13 s, V9's one per 2.3 s, V11's one per 1.2–1.5 s, V12's 1.3 s and 4.8 s in one session. **This clip sits at V7's end and is the second clip to put it there** — but unlike V7 it is not a tube plus a trim, it is a worked ride with a barrel and turns in it, and the body still does not change.

### 0.2 — The brief's first question, answered before anything was spent

> *"Measure the rider's height in source pixels and say it."*

| | |
|---|---|
| **Head length** (hair-top to chin, measured, 6 frames) | **73–102 source px**, rising through the ride as the camera zooms in |
| **Actual head-to-foot extent in frame** | **355–620 px** — because he is folded for most of it |
| **Standing-equivalent stature** (7.7 × head) | **560–790 px** |
| **Camera** | **side-on, near water level, from the channel**; the rider is 1.3–2× bigger than clip 11's and about the same as clip 12's |

**This clip delivers most of `engine-target.md` §6 ask 1** — water-level, side-on, bare legs, knee visible as a joint, no boardshorts over the knee — and §0.3 records what happened when the rulers were applied to it anyway.

### 0.3 — ⭐ THE TRUNK ANGLE HAS AN ADMISSIBILITY PROBLEM TOO, and this clip is the first to measure it

This is the finding I would put first if I could only keep one.

Clip 12 gave the series a test for the **leg** chain: measure the projected thigh/shin ratio, anatomy fixes it near 1.0–1.1, and a ratio far from that means the limb is pointing at the lens. **The same test exists for the trunk and nobody has run it.**

Measure the **projected shoulder-to-waistband distance ÷ head length in the same frame.** Standard proportions put the acromion at ≈0.82 of stature and a boardshorts waistband at ≈0.60, so an in-plane trunk projects **≈1.6–1.8 head-lengths**. Anything much shorter means the trunk is pointing at or away from the camera and **the in-plane fold angle under-reads**.

| t | trunk from vertical (hand-measured, shoulder→waistband) | trunk ÷ head | admissible? | head px |
|---|---|---|---|---|
| **11.900** | **REFUSED** | **0.39** | **no** — trunk foreshortened 4× | 75 ± 8 |
| **12.300** | **≥ 41° ± 10** | **1.03** | **no** | 77 ± 8 |
| **13.700** | **≥ 32° ± 10** | **1.34** | marginal | 73 ± 8 |
| **13.900** | **≥ 24° ± 10** | **1.18** | **no** | 85 ± 8 |
| **14.200** | **2° ± 8** | **1.63** | **yes** | 95 ± 10 |
| **15.000** | **5° ± 8** | **1.59** | **yes** | 102 ± 10 |

**Six trunk attempts, two clean, one marginal, three refused — and both clean readings are on frames where the trunk is visibly vertical. No frame in which he is visibly folded passed the test.** That is the leg chain's saturation story told again in a different joint, on the same clip, with the same shape of result.

**Why it happens, and it is not this camera's fault.** A surfer stands across his board. His hip fold carries his chest toward his toes — **perpendicular to the board's long axis**. In a side-on shot the board's long axis lies across the image, so the fold direction points **at or away from the lens**. The trunk projects short and the measured angle collapses toward zero. It is the identical geometry V9 named for the knee.

> **What this does to the series: it bounds, it does not refute.** Foreshortening makes a measured fold **smaller** than the truth, never larger. So **V8's 17°→76°, V9's 5°→70°, V11's 15°→75° and V12's 10°→90° are all safe as lower bounds** — and V12's 90° is at the ceiling anyway. **But none of them was gated**, so the series does not know how much larger the true folds were, and **a trunk angle measured broadside and quoted as a target would set the engine's travel too low.** The fix is the same lens geometry the leg chain needs: **about 45° off the board's axis and level with the deck.**

### 0.4 — ☠️ A NEW AND WORSE STALE-FRAME TRAP: the canvas stamp was CORRECT and the picture was still three seconds old

The skill's defences are a timestamp stamped into the canvas and a doubled screenshot. **Both passed while the read was being poisoned**, and this is worth more than any measurement in the document.

What happened: with the **browser pane hidden**, the page's video decode froze. `document.hidden` reported `false`, `visibilityState` reported `"visible"`, `readyState` was 4, `buffered` covered the whole clip, every seek resolved and `video.currentTime` returned **exactly the value asked for**. `drawImage(video, …)` returned the **same frame every time**. A 0.1 s whole-clip trace came back with two tidy 1.4-second runs of pixel-identical frames at 9.4–10.7 and 16.4–17.7 — which reads exactly like **two editorial freeze-frames**, and would have been published as one.

**Nothing in the image says it is wrong. The stamp is right. The second screenshot matches the first.** The only thing that caught it was an **out-of-order probe**: seek 10.7, 9.4, 10.0, 9.3, 10.7, 9.4, 16.8, 17.4, 16.3 and difference every pair. All 45 pairs returned **0**, including frames 7 s apart. A real freeze-frame cannot do that.

Two causes, both new to this series:

1. **The pane was hidden.** `tabs_context` says so in one line and I had not read it. Showing the pane (`mcp__ccd_view__show_pane`, `pane: "preview"`) half-fixed it; a **page reload** fixed it completely.
2. **A YouTube Short has TWO `<video>` elements after a reload, and `document.querySelector('video')` returns the empty one** (`videoWidth` 0, `duration` null). The right one is `[...document.querySelectorAll('video')].find(v => v.videoWidth > 0)`. Building the harness on the first match silently measures nothing.

> **Rule to add to the skill: never trust a run of zero frame-differences. Probe out of order and difference every pair. The stamp proves the clock, not the pixels.** Every number in this document was taken after the reload, with the pane shown, on the element with `videoWidth > 0`.

### 0.5 — Opposite-direction channels: looked for in five windows, found in none

The brief named this the single most valuable thing the clip could contain.

| window | length | samples | leg depth | trunk fold | verdict |
|---|---|---|---|---|---|
| 6.200 → 6.766 | 0.57 s | 18 native frames | knees bent, held | held folded | **frozen** |
| 7.000 → 8.700 | 1.70 s | 18 | knees bent, held | held folded | **frozen** |
| 11.700 → 12.266 | 0.57 s | 18 native frames | knees bent, held | held folded | **frozen** |
| 13.700 → 13.900 | 0.20 s | 3 | knees straighten (visible) | un-folds ≥32° → ≥24° | **same sign (up)** |
| 13.900 → 14.200 | 0.30 s | 4 | hip÷head 2.80 → 3.16 | un-folds ≥24° → 2° | **same sign (up)** |
| 15.600 → 16.050 | 0.45 s | 10 | extended, held | vertical, held | **frozen** |

> **Every resolved transition is same-sign or frozen. None is opposite-sign.**
> **V9's opposite-sign passage is therefore SINGLE and now THREE-TIMES-not-reproduced** — clip 11 looked at seven transitions, clip 12 at six, this clip at five, **eighteen transitions across three clips and three riders with no instance.** It remains the right acceptance test for `engine-target` rows 1–2, because an engine that *cannot* do it cannot do the thing V9 filmed; **it is now firmly not a frequency claim.**

**And the frozen half keeps growing.** One-channel-frozen (or whole-body-frozen) is now on **five clips**: V10's 0.44 s, V11's 0.36 s, V12's 0.25 s and 0.88 s, and here **1.70 s at 18 samples** — four times V12's longest. On this clip the frozen state is the *default*, and movement is the exception.

### 0.6 — The arm lead is ABSENT, in 3 of 3 resolvable direction changes

`engine-target.md` §7 names this explicitly as something that would change row 5: *"the arm lead **absent** in a resolvable direction change."*

| direction change | t | overhead arm before the rail? |
|---|---|---|
| climb to the lip | 6.30–6.50, read at **1/30 s**, 18 frames | **NO** — both hands low and forward over the deck throughout |
| drop off the top | 6.50–6.80, read at **1/30 s** | **NO** — same carriage |
| bottom turn / climb | 11.90–12.20, read at **1/30 s**, 18 frames | **NO** — both hands low, then the rear arm goes **back and low**, never above the shoulder |

**0 of 3.** Against the running tally in V12 §0.7 — V8 3 of 4, V9 2 of 2, V11 2 of 2, V12 3 of 3, i.e. **10 of 11 resolved turns across four clips** — this clip is **0 of 3** and takes it to **10 of 14**.

**The exception has a shape, and it is V9's and V12's shape.** Where the other clips put an arm overhead, this rider puts the **lead arm forward-down past the rail and the rear arm back and low**, held **0.8 s** (7.10–7.90, 9 samples). That is exactly the substitute V9 recorded for its 1.10 s roundhouse cutback and V12 for its 27.1 bottom turn. **Three clips, three riders, same substitute.**

**The honest caveat, which matters:** every direction change in this clip happens inside a fast, hollow, barrelling section. There is **no open-face snap and no off-the-lip** anywhere in 17.7 s. So the clip does not refute the arm lead; **it bounds it to the manoeuvres that have an arm in them**, and it says the engine must not make the lead unconditional.

**The one arm-overhead event in the clip has no turn attached at all.** Both hands come to the head at **14.35** and stay there to **15.55** — **1.2 s** — which is **0.4 s after** the board has straightened and the body has come upright. It is a relief gesture at the end of a barrel, not a load.

### 0.7 — A held fold, 8.75 s unbroken, and no depth named for it

The posture of §0.1 is held across **0.000 → 8.750 (8.75 s)** and again across **10.14 → 13.85 (3.71 s)**, with the rider inside the wave between. **The 8.75 s stretch is the longest continuously visible held posture in the series** — V5's record was 2.9 s, V12 raised it to ≥5.7 s.

**I name no depth for it.** §3.1 has the refusal: the leg chain gives one admissible reading in the whole clip and it is on an extended leg, the trunk ruler is refused on every folded frame (§0.3), apparent stature is refused because **the sea horizon is not visible in a single frame of this clip** so the lens height cannot be checked, and hip-above-deck ÷ head has a confound this clip exposes (§3.1c). **The duration needs none of those and is not in doubt.**

### 0.8 — Lead with the disagreements

| # | this clip | the existing reads | what it does to them |
|---|---|---|---|
| 1 | **The trunk angle is itself inadmissible on broadside footage when the rider is folded** — 6 attempts, 2 clean, 3 refused, and the clean ones are the vertical ones | §4.1 gates the **leg** chain; no read has ever gated the **trunk** | **New.** It does not refute V8/V9/V11/V12's 59–80° spans — foreshortening only shrinks an angle — but it makes every one of them a **lower bound**, and it means row 2's target of "≥60°" is a floor, not a figure |
| 2 | **No opposite-sign trunk-vs-leg transition in 5 resolved windows** | V9 row 3: one 0.6 s passage, SINGLE | **Row 3 is SINGLE and three-times-not-reproduced** (11, 12, 13; 18 transitions). Still the right acceptance test; emphatically not a frequency |
| 3 | **Arm lead absent, 0 of 3 direction changes** | 10 of 11 resolved turns across V8, V9, V11, V12 | **The first miss in the series.** Row 5's target becomes *"the engine can lead"*, never *"it always leads"* — which §2 row 5 already says, and this is the evidence for it |
| 4 | **One posture held 8.75 s, through a climb, a drop, a barrel and a turn** | Row 12's holds: V5 1.75/2/≥2.9 s, V12 ≥5.7 s | **A new longest, and a harder one to dismiss** — V12's hold was inside whitewater at the end of a ride; this one has a bottom turn and a lip climb inside it |
| 5 | **The sea horizon is not visible in any frame**, so the lens-height test cannot be run at all | Clips 10, 11, 12 all ran it and refused apparent stature | **A fourth outcome: not "raised" or "level" but "unknowable".** The skill should say what to do then — I report no stature-derived depth |
| 6 | **Hip-above-deck ÷ head is confounded by stance width** — at 13.900 the knees are visibly straighter than at 13.700 while the ratio goes **down** (2.84 → 2.80), because the feet move apart | V12 §0.4 rescued hip-above-deck as the one surviving ruler | **A named confound, not a refutation.** Splaying the feet lowers the hip with no knee change. Quote the ratio only when the stance width is unchanged |
| 7 | **A `<video>` element with `videoWidth === 0` sits in front of the real one, and a hidden pane freezes the decode while `currentTime` keeps lying correctly** | The skill's stamp-and-double-screenshot defences | **Both defences pass while the data is wrong.** §0.4 has the out-of-order probe that catches it |
| 8 | **0 pump half-cycles in 1.70 s of trim**, 18 samples at 0.1 s | V8 and V9: 0.55–0.60 s; V11 dissents at ~0.36 s (weak); V12: 0 in 1.75 s | **A second clip with no cycle to measure.** The 0.55–0.60 figure now stands on 2 clips, 1 weak dissent, **3 clips of "no cycle present"** |
| 9 | **The whole ride is one shot, 17.741 s, rider up and riding at frame 0** | V11's 11.78 s single ride was the longest | **A new longest single ride**, and the second clip in a row that is not a montage |

---

## 1. The source, and what the numbers are worth

### 1.1 Delivery

`#movie_player` does not exist on a Short; the player is `#shorts-player`. `getAvailableQualityLevels()` returns `["hd2160","hd1440","hd1080","hd720","large","medium","small","auto"]` — the same ladder clip 12 published. **`hd1440` was pinned with `setPlaybackQualityRange` and `getPlaybackQuality()` confirmed `hd1440` before every measurement frame**; `video.videoWidth/videoHeight` = **1440×2560**.

**No consent gate appeared.** Nothing was accepted or rejected because nothing was offered.

**2160p was not used.** Clip 12 A/B'd `hd2160` against `hd1440` on an identically-published ladder and found **no extra detail at all**; this round took that result rather than spending the ladder again. **Five clips, five ceilings, and two of them published a 2160 that is not worth taking.**

### 1.2 Pane geometry — clip 12's smaller-viewport result reproduced exactly

At a **1280×1000** viewport the screenshot came back **800×625** and the canvas→screenshot scale was **0.625**. **Shrinking the viewport to 800×640 made the screenshot 800×640 and the scale exactly 1.0.** That is clip 12's measurement reproduced to the digit on a different session, so it is now a fact rather than one reading: **get the high-quality stream at a large viewport, then shrink the viewport to take the frames.**

The binding limit on scale turned out not to be the viewport at all: the overlay canvas is **790×594**, so **570 px of usable height**, and a rider 700 px tall caps at **0.814×** in any arrangement — single panel or two panels, it makes no difference, because height is the constraint. **Two-panel comparisons therefore cost nothing in scale** and every paired frame below was taken that way.

`computer zoom` was used once and discarded: its own result says *"cropped from a screenshot, not magnified"*, exactly as the skill records.

### 1.3 The frame grid: 30 fps, measured

Seeking on a **0.005 s** grid from 8.000 to 8.205 and hashing the decoded frame, the picture changes at **8.035, 8.070, 8.100, 8.135, 8.170, 8.205** — intervals 0.035, 0.030, 0.035, 0.035, 0.035. The first 0.005-grid sample at or after each multiple of **1/30 = 0.03333** predicts 8.035, 8.070, 8.100, 8.135, 8.170, 8.200: **five of six exact, the sixth one grid step late**, which is what 29.97 does as drift accumulates. **25 fps predicts 8.040/8.080/8.120/8.160 and does not fit. 24 fps predicts 8.045/8.085/8.125/8.170 and does not fit.**

**Verdict: 30 fps, with 29.97 not excluded.** Native frame = 0.0333 s, which is the finest timing resolution quoted anywhere below.

### 1.4 Slow motion: **not excluded as rigorously as clip 12**

Honest statement up front: **clip 12 excluded slow motion on three independent grounds and I have only two, neither of them a measured gravity.**

1. **Durations.** The up-transition from deep fold to upright runs **13.85 → 14.20 = 0.35 s**; the dive off the board runs **16.10 → 16.45 = 0.35 s** from upright to fully extended and horizontal. A real dive takes about that. At 2× slow they would be 0.18 s, which no body does.
2. **Motion blur.** Spray sheets and the hands at 13.700 are **visibly blurred**, consistent with a ~1/60 s shutter at 30p. A high-speed camera conformed to 30p would render the same hands sharp.

**What I could not do:** the board is never in free flight and the rider's only airborne moment is the dive, which enters water immediately, so **no ballistic check was possible.** The board never passes through vertical, so clip 12's rotation-rate argument is unavailable too.

**Verdict: at or near real time, on duration and blur only.**

### 1.5 It is ONE SHOT — no cut anywhere in 17.741 s

**This matters, because clip 11 called itself a montage twice from coarse sheets and was wrong both times, and clip 12 was a montage of eight.**

A whole-clip trace at **0.1 s** (178 samples, a 24×42 luminance grid plus mean colour) gives frame-to-frame differences spanning **6.87 to 15.06**, median ≈ **9.7**. The largest, 15.06 at t = 14.4, is **1.55× the median** and **1.2× its own local neighbours** — against the **3–7× above local level** that every one of clip 12's seven confirmed cuts produced. **No nominee exists to re-probe.**

Independently, five windows were sampled densely and every one is continuous motion of the same rider, same board, same wave, same lens drift: **6.200–6.766** and **11.700–12.266** at the native 1/30 s (18 frames each), **7.000–8.700** and **11.800–12.900** at 0.1 s, **15.600–16.450** at 0.05 s, and **8.700–11.760** at 0.18 s across the barrel. The rider disappears at **8.88–10.00** — behind the curtain, not behind a cut; the wave and the camera move continuously through it.

| span | length | what it is |
|---|---|---|
| **0.000–17.741** | **17.741 s** | **one continuous shot**: side-on from the channel at near water level, a right-hand barrelling wave, the rider already up and riding in frame 0, three other surfers paddling in the foreground |

One rider throughout: bare-chested, **black boardshorts cut above the knee**, white board with dark rail logos. **Stance: regular/natural (left foot forward)**, read from the board's nose direction against his shoulders in the 13.3–14.2 frames.

### 1.6 What the error bar is

- **Source 1440×2560.** Rider **355–620 px** head-to-foot as he actually stands, **560–790 px** standing-equivalent, head **73–102 px**, thigh **100–170 px** projected.
- **The camera zooms and pans continuously** (head 73 px at t = 13.7 and 102 px at t = 15.0), so **no apparent size is compared between two frames without a head-length normalisation.** Every ratio below is computed **inside a single frame.**
- **Trunk angles** are hand-measured shoulder-to-waistband from vertical on gridded single frames at **0.81–1.02×**: **±8°** where the waistband is a clean edge, **±10–12°** where it is not. **And §0.3's admissibility gate applies to every one of them.**
- ⚠️ **No automated tracer was built.** Clip 11 built one, validated it, found it reading 9° where the hand read 39–43°, and discarded it. **I did not rebuild it.**
- ⚠️ **No angle anywhere in this document comes from a survey strip.** Clip 12 recorded reading "~70°" off 0.26× strips for frames that measured 32–43° at 1:1. The strips here (0.18–0.27×) were used **only to find moments**; every measured frame was re-rendered at **≥0.81×** with a 25 px grid.
- **Hip position** carries the skill's standing caveat — a waistband sits near 0.60 of stature where the trochanter is at 0.53 — so **every hip figure is ±10–15 points however sharp the image.** The single hip landmark used for the leg chain (§3.1b) was **inferred** from the waistband, not seen, and is marked as such.
- **Landmarks were verified, not guessed.** For the leg-chain frame the proposed points were drawn back onto the image as labelled crosshairs with the segments between them and checked against the anatomy, then the angles were computed from the verified coordinates. Two rounds of correction were needed.

---

## 2. The ride, in order

Times are the player's own clock. **Body descriptions here are qualitative**; the measured numbers are in §3.

| window | what the board does | what the body does |
|---|---|---|
| **0.00–5.50** | trimming and driving across a steepening face, high then low | **folded forward, knees bent, both hands low and forward over the deck.** 12 samples at 0.5 s, no change |
| **5.50–6.20** | driving along the face | same |
| **6.20–6.50** | **climbs to the lip** | **no change in the body** — 10 native frames, hands stay low, trunk stays folded |
| **6.50–6.80** | **drops down the face** | **no change in the body** — 9 native frames |
| **7.00–7.90** | trimming, no direction change | **carriage changes without the posture changing: the lead arm reaches forward-down past the rail and the rear arm goes back and low, held 0.8 s.** Trunk and legs unchanged |
| **7.90–8.75** | driving into the pocket | hands return low and forward; trunk and legs unchanged |
| **8.88–10.00** | **inside the barrel** | **not visible** |
| **10.14–11.70** | emerging, driving on a steep face | the same fold, the same bent knees, hands low |
| **11.90–12.20** | **bottom turn, board climbs** | **no overhead arm.** Rear arm goes **back and low** at 12.00–12.10; trunk and legs unchanged. 18 native frames |
| **12.20–13.70** | climbing and driving under the lip | the clip's deepest-looking fold, trunk refused at 12.3 (§0.3). Hands low and spread |
| **13.70–13.90** | board flattening | **knees straighten visibly; trunk un-folds ≥32°→≥24°.** Same sign |
| **13.90–14.20** | board straightens out | **trunk to vertical (2°), legs extend. 0.35 s for the whole transition** |
| **14.20–14.35** | riding straight in the whitewater | upright, **both arms low and spread, roughly level** |
| **14.35–15.55** | riding straight | **both hands to the head, held ≈1.2 s.** Trunk vertical, legs extended, feet wide apart |
| **15.55–16.10** | riding straight through foam | **hands come down to low-and-forward** — the clip's commonest carriage again, now at its tallest posture |
| **16.10–16.50** | the board goes | **a deliberate head-first dive, arms extended forward, body streamlined.** Not a tumble |

---

## 3. The channels, each with its own number

### 3.1 Leg depth — **no rung named**, for the fifth clip running

**(a) The leg chain, with clip 12's admissibility gate.** Measured at **t = 14.000**, the single best frame in the clip for it: side-on, near-level lens, both bare legs separated, both knees unmistakable as joints, rendered at **1.36×** with every landmark drawn back onto the image and checked.

| leg | hip→knee ÷ knee→ankle (anatomy ≈ 1.0–1.1) | leg chain | admissible? |
|---|---|---|---|
| **front** | **1.10** | **100.0 %** ⚠️ **SAT** | **yes** — and he is visibly straight on that leg |
| **rear** | **2.66** | 94.1 % | **no** — shin foreshortened 2.4× |

**One admissible leg in the clip's best frame, and it reads 100 % on a leg anyone can see is straight.** A second frame (t = 13.400) was attempted and refused: both thighs foreshortened, the waistband outside the readable region.

> **This is the fifth refusal in five clips, and the fifth distinct cause is absent — the cause here is V9's original one, projection, on the very footage geometry §6 asked for.** Clip 12 already demonstrated it on down-the-line shots; this clip demonstrates it **water-level and side-on**, which was the other half of the ask. **The lens that would work has to be about 45° off the board's axis and level with the deck, and thirteen clips have not produced one.**

⚠️ **The hip used above was inferred, not seen** — placed 0.54 head-lengths below the measured waistband line, per the 0.60/0.53-of-stature offset. The waistband itself was drawn on the image and verified. **A hip error of ±25 px moves the front leg's thigh/shin ratio by about ±0.15, which is enough to push it out of the admissible band**, so even the one clean reading is one landmark away from being refused.

**(b) The split, row 10: NOT MEASURED, and I will not estimate it.** The brief asks for front-leg minus rear-leg extension in the same frame and asks me to say so when I cannot. **I cannot.** The one frame with both knees unmistakable has one admissible leg and one inadmissible one. The arithmetic difference is 5.9 points; **it is not reportable**, because the rear leg's 94.1 % is a number about the camera, not about the leg. **Row 10 stays at V8's one clip, two frames.**

**(c) ⚠️ Hip-above-deck ÷ head length has a confound this clip exposes.** V12 rescued this ruler and was right to; here is the fine print.

| t | head | hip above deck | ratio | what the frame looks like |
|---|---|---|---|---|
| **12.300** | 77 ± 8 | 238 ± 25 | **3.09 ± 0.40** | deep fold, knees bent, feet close together |
| **13.700** | 73 ± 8 | 207 ± 25 | **2.84 ± 0.40** | deep fold, knees bent |
| **13.900** | 85 ± 8 | 238 ± 25 | **2.80 ± 0.35** | **knees visibly straighter than 13.700 — and the ratio went DOWN** |
| **14.200** | 95 ± 10 | 300 ± 25 | **3.16 ± 0.35** | upright, legs extended |
| **15.000** | 102 ± 10 | 278 ± 30 | **2.73 ± 0.45** | upright, legs extended, **feet very wide apart**, board not visible |

**13.700 → 13.900 is the problem:** the knees straighten and the ratio falls. **15.000 is the same problem larger:** the trunk is vertical and the legs are extended, and the ratio is the lowest in the table. The cause in both is the same and it is visible — **the feet move apart, and a wide stance lowers the hip with no change in knee flexion at all.**

> **So hip-above-deck ÷ head is a leg-depth ruler only while the stance width is unchanged.** It survives V12's lens problem (it does not contain the trunk) and dies on this one. **Quote it across frames with the same foot spacing, or not at all.** Nothing in §3.1c may be read as a depth rung.

**(d) Qualitatively**, the knees are flexed for the whole ride from frame 0 to 13.85, and near-extended from 14.0 to 16.1. The deepest-looking frames are **11.90** and **12.30**; the straightest is **15.00**. **No rung is named for any of them.**

### 3.2 Trunk fold — §0.3 is the result, and it is a gate rather than a number

**Six hand measurements, all from gridded frames at ≥0.81×, none from a strip.** The table is in §0.3. What survives the gate:

- **Two admissible readings: 2° ± 8 at t = 14.200 and 5° ± 8 at t = 15.000.** The trunk is vertical when he stands up, and that is all this clip can say about an angle.
- **Three refusals and one marginal, all on folded frames.** The best lower bound on the fold is **≥ 41°** at t = 12.300, where the trunk projects 1.03 head-lengths against an expected 1.6–1.8.
- **Travel, as a bound: ≥ 39°** (2° → ≥41°), **and the true figure is larger by an unknown amount.** This is **not** a fourth reproduction of the ≥60° span; it is a floor under one, measured with a gate the other clips did not have.

**Rate:** the one measurable un-fold runs **≥41° → 2° between 13.70 and 14.20**, i.e. **≥ 78 °/s** over 0.50 s, and the steep part **≥24° → 2° in 0.30 s ≈ 73 °/s**. Both are lower bounds for the same reason. Against V12's measured 120 °/s and 20 °/s — **the drawn trunk in the game has exactly one rate, because it has exactly one input** (`HumanoidRig.ts:1383–1385`, quoted from `engine-target.md` row 2).

### 3.3 Arm carriage — four carriages, and it still does not follow depth

| carriage | windows | count |
|---|---|---|
| **A — both hands low and forward over the deck**, inside the rails | 0.00–7.00, 7.90–8.75, 10.14–11.90, 12.20–13.90, 15.55–16.10 | **5 windows, by far the clip's most common — ~13 s of a 16 s ride** |
| **B — lead arm reaching forward-down past the rail, rear arm back and low** | 6.30–6.50, 7.10–7.90, 12.00–12.20 | 3 |
| **C — both arms low and spread, roughly level** | 12.20–12.60, 14.20–14.35, 15.60–15.90 | 3 |
| **D — both hands at the head** | 14.35–15.55 | 1, held **≈1.2 s** |

**Carriage A occurs at the clip's deepest fold (12.300) and at its most upright, straightest-legged moment (15.700).** So **carriage does not track depth** — a sixth clip agreeing with V7, V8, V9, V11 and V12, and refuting both *"tall ⇒ spread"* and *"deep ⇒ spread"*.

**Distinct carriages reachable at one leg state: 3** (A, C and D all occur between 14.20 and 16.10, 1.9 s, legs extended and trunk vertical throughout). At the folded leg state: **2** (A and B).

**Carriage A reproduces `engine-target` row 15 on a sixth clip** (V7 4 windows, V8 5, V9 6, V11 4, V12 ≥8, here 5). The hands are over the **deck**, usually both at once — **not** the single hand in the water of a tube ride, and **not** a hand drag: in the barrel section at 10.14–11.90 both hands stay over the deck.

### 3.4 Arm timing — §0.6. **Lead 0 of 3 resolved direction changes; the one overhead carriage trails the board by ~0.4 s and is held 1.2 s.**

The finest resolution available is **one native frame = 0.0333 s**, and the three direction changes were each read at that grid over 18 frames. **There is no overhead arm to time.**

---

## 4. The fore-aft hip axis, the feet, and the face

### 4.1 Hips aft, shoulders forward — on 6 frames, and the forward head reproduced

On every frame where both landmarks could be placed — **12.300, 13.400, 13.700, 13.900, 14.000, 14.200** — the **shoulders sit forward of the hips toward the nose** and the **hip sits at or just behind the rear foot**. **6 frames.** This reproduces V1, V7, V8, V9, V10, V11 and V12. **No magnitude: direction and sign only**, as in every previous clip.

**V12's new finding reproduces.** The **head and neck are thrust forward of the shoulders** in every folded frame: at **t = 12.300** the head centre sits about **70 px forward of the shoulder line** on a trunk measuring only 79 px projected — i.e. **the head's forward offset is comparable to the whole projected trunk.** It is the second clip to flag it and it explains the same illusion V12 named: **what the eye reads as a deep trunk fold is substantially a forward head and a forward neck on a trunk that is doing less than it looks.** That is now a two-clip finding and it is directly relevant to §0.3 — part of the "missing" fold is in the neck, which no ruler in this series measures.

**And one thing to be careful about:** between **13.700 and 14.200** the rider rotates from facing down the line to facing the camera, shoulders square. **I could not separate how much of that is the trunk yawing on the pelvis and how much is the board turning**, because the board leaves the readable region in exactly those frames. **No upper-body-yaw-relative-to-board figure is reported.**

### 4.2 Feet: 0 steps

In the windows where both feet and the deck were legible — **13.300–14.000** and **11.700–12.300**, about **1.3 s in total** — neither foot changes its place on the deck, judged against the board's own rail logos and the stringer. **Weaker than V7's 13 s count**, and recorded as **"none seen"**, not as a measurement. The front foot sits at roughly **45–50 % of board length from the nose** across the 13.3–14.0 frames, consistent with V7's 44–49 %.

### 4.3 Head and gaze — a second clip for row 18

**The face is resolvable in at least six frames.** At **t = 14.200** the head is **95 px** and the eyebrow, eye, nose, open mouth and chin are separate features; at **15.000** it is **102 px**; at **12.300** it is **77 px** in clean profile. Eleven clips could not do this; V12 was the first and this is the second.

What it supports, and nothing more:

- While riding folded (0.0–13.85), **the head is turned to face along the board's direction of travel, down the line**, and the **gaze line is below horizontal** — he is looking at the water ahead of the nose, not at the lip above him. Readable at 12.300 and 13.400.
- At **13.700** the head is pitched **down**, face toward the deck, as spray lands on him.
- From **14.200** the head faces the camera, square with the shoulders — but see §4.1's caveat: the board's heading is not measurable in those frames, **so no head-yaw-against-board figure is reported.**
- The head **leads the fore-aft chain** (§4.1): forward of the shoulders, which are forward of the hips.

> **Row 18 now has two clips of qualitative observation and still no measurement of head yaw against the board's heading.** It says the same thing V12 said about what to measure next, and adds that the measurement needs a frame where **both the face and the board's nose are legible** — which neither clip has yet delivered.

---

## 5. Part B — the mapping

Game-side entries are **code readings quoted from `3.5/engine-target.md` and `3.5/body-channels.md`**. **Nothing was built, ridden or benchmarked.**

> ⚠️ **Work in flight that this table does not credit.** `main` at **b3598cac** (step 3.5g) records that `engine-target` **rows 4, 5 and 15 — the arm carriage channel, the arm lead and the two-handed low carriage — have been built**, with *"four distinct carriages at one leg height"*. As V12 recorded, that commit adds no `src/` change to `main`, so the arm rows below describe the game as `main`'s source still stands and should be re-read against 3.5g's branch before any of them is quoted as a gap.

| what the rider does | the game's name for it | have it / partly / not at all |
|---|---|---|
| **Holds one folded, knees-bent posture for 8.75 s through a climb, a drop, a barrel and a turn** | `Compress`, **held** (Ruling C) | **partly.** Holding while the key is pressed is the right shape. **But the posture is a fold plus a leg bend and the game can only supply the leg bend**, so it would reach this silhouette by dropping the hips — a rung or two too deep, with the trunk lost |
| **Changes posture exactly once in 16 s** | — | **not at all**, and it is the opposite of the engine's problem. The engine cannot hold anything for 8 s because the ride ends first (`engine-target` §4.7) |
| **Trunk un-folds ≥39° while the legs extend, in 0.35 s** | — | **not at all.** `HumanoidRig.ts:1383–1385` makes the drawn trunk an affine function of drawn leg depth, worth ~8° at trim frontside across the whole leg range (row 2) |
| **Trunk and legs move together on the way up, with the legs leading inside 0.2 s** | — | **partly, accidentally.** The game's drawn correlation is exactly +1 by construction, so it gets "together" for free and can never get "legs first" |
| **Nothing in the body moves for 1.70 s while the board trims and the spray changes** | — | **not at all** as an expressible state. There is no arm position to hold still and nothing sequences a body against a board phase |
| **A carriage change with no posture change: lead arm past the rail, rear arm back and low, held 0.8 s** | — | **not at all.** `HumanBalance.arms` is one scalar, capped by `stanceRoom(depth).arms` and **triggered by the same expression that drops the knees** (`humanBalance.ts:423–431`) |
| **3 distinct arm carriages at one leg state (1.9 s, legs extended)** | — | **not at all.** One scalar has no height, no spread and no left/right; one pose per stage × depth |
| **Both hands low and forward over the deck for ~13 s of a 16 s ride** | — | **not at all.** One hand, on/off, pointed at the water, side chosen by the game (`AttachedRider.ts:5720–5732`) |
| **Three direction changes with NO arm lead** | entry to `bottom turn` / `carve` | **n/a — and worth recording.** The game has no arm position either way; the point is that **a built arm lead must be conditional**, not unconditional |
| **Hands to the head for 1.2 s, 0.4 s after the board straightens, with no turn attached** | — | **not at all.** No arm position; and nothing in the game puts a gesture after a manoeuvre |
| **Rides out of a barrel and through ~2 s of whitewater still on his feet** | — | **not at all** as a posture; `engine-target` row 16. The foam does reach the board (step 3.5e, five channels); **no brace posture exists**, and the ride-through is not judgeable while rides end first |
| **Leaves the board in a deliberate streamlined dive** | `wipeout` | **not at all.** A wipeout exists; a chosen, shaped exit does not |
| **Head and shoulders forward of the hips over planted feet, 6 frames** | `trim` weight (W/S) | **not at all** as a differential. `TRIM_SHIFT = 0.25 m` moves pelvis, torso, head and both arms **together** (`AttachedRider.ts:5514–5518`) |
| **The head thrust forward of the shoulders by about a whole projected trunk length** | — | **not at all**, and V12 already opened this row. Second clip |
| **Head turned along the board's travel, gaze below horizontal** | — | **not at all.** No head or gaze role in the stance or the rig; `engine-target` row 18 |
| **0 steps in ~1.3 s of legible feet; front foot at 45–50 % of board length** | — | **have it.** Feet fixed at 0.30 m from the tail and +0.63 m ahead of it; nothing moves them while upright |
| **One direction change per ~5 s across 16 s** | chaining `bottom turn` / `top turn` / `carve` | **not at all.** No chaining notion exists (`engine-target` row 8) — and this clip is at the **slow** end of the range the engine must cover |
| **No trim pump: 0 half-cycles in 1.70 s, 18 samples** | `pump` | **n/a — the clip has nothing to map.** Recorded so the 0.55–0.60 s figure is not credited to this clip in either direction |

---

## 6. Part C — what I could not see, and why

- **The leg chain, on 1 of 2 legs in the one frame that allowed it, and on the whole second attempt.** Cause: **thigh and shin foreshortening**, measured at 1.10 (admissible) and 2.66 (refused) against anatomy's ~1.0–1.1. **Not resolution, not clothing, not occlusion** — this clip has bare legs, visible knees, a near-level side-on lens and a 600 px rider.
- **The two legs' split (row 10).** Never were both legs admissible in one frame. **No estimate is given.**
- **The trunk angle on every frame where the rider is visibly folded** — §0.3. Three refused, one marginal, and the two clean ones are both vertical trunks.
- **Apparent stature in head-lengths.** Refused, for a reason no earlier clip has hit: **the sea horizon is not visible in a single frame of the clip** — the wave fills the background everywhere, and the one open-water region (x 900–1440, rows 1850–2250 at t = 15.0) shows texture and no line. **The lens height is therefore unknown, not "level" and not "raised"**, and the skill's gate cannot be opened either way.
- **Any body channel at all during 8.88–10.00**, the barrel. The rider is behind the curtain. **1.12 s of the ride is simply absent.**
- **Knee angles** to better than about ±10°, and **hip angles** at all. Not reported, as videos 6, 9, 11 and 12 also declined.
- **How much of the 13.7→14.2 rotation is trunk yaw and how much is the board turning.** The board leaves the readable region in exactly those frames.
- **Frontside versus backside.** The stance (regular) is reported; the wave is a right and he is riding it, which would make him frontside, **but I could not fix the peel direction against his chest in the frames that matter and I am not reporting it.**
- **A measured-gravity check on the playback speed.** The board is never in free flight; §1.4 rests on two grounds, not three.
- **Whether the posture before t = 0 was the same.** The ride is already in progress at frame 0, so **8.75 s is a lower bound on the hold, truncated by the clip's start** — exactly the complement of V12's hold, which was truncated by the clip's end.

---

## 7. What this round did not do

- **No file under `src/` or `server/` was touched.** This is evidence, not a fix.
- **Nothing was built, ridden, benchmarked or measured in the game.** Every game-side statement is quoted from `3.5/engine-target.md` or `3.5/body-channels.md`.
- **No constant is proposed, and no stance rung is named for any frame.**
- **`engine-target.md` was not edited**, as the brief required, and the twelve earlier video documents were not edited.
- **No automated trunk tracer was built.**
- **No angle was read from a survey strip.**
- **The second agent reading this clip was not consulted and its notes were not sought.**
- **No conclusion is drawn about the wave, the lip, the foam or the spray**, which the owner has now asked seven times. One line, because the skill allows it and it is striking: the wave is a thick, fast, below-sea-level slab and the rider spends the whole ride in survival trim — **which is itself the reason the body does so little, and it is the context every number above sits in.**

---

## 8. Rows this clip moves, and how

| row | the measurement | the population | which way it moves |
|---|---|---|---|
| **2** | **A new admissibility gate for the trunk: projected shoulder→waistband ÷ head, in-plane expectation 1.6–1.8.** Six attempts: **two clean (2°, 5°, both vertical), one marginal (≥32°), three refused (1.03, 1.18, 0.39)** | 6 frames, 1 rider, 1 clip | **Does not refute the ≥60° target — makes it a FLOOR.** Foreshortening only shrinks a measured fold, so V8's 59°, V9's 65°, V11's 60° and V12's 80° are all lower bounds, and none of them was gated. **Row 2's "≥60°" should be read as "at least 60°, true value unknown and larger."** This clip's own bound is **≥39°** of travel |
| **3** | **Opposite-sign trunk-vs-leg-depth: looked for in 5 resolved windows (0.20–1.70 s, 3–18 samples each), found in 0.** Every transition is same-sign or frozen | 5 windows, 1 rider, 1 clip | **Row 3 is SINGLE and now THREE-times-not-reproduced** — 18 transitions across clips 11, 12, 13, three riders, three oceans. **Keep it as rows 1–2's acceptance test; delete any reading of it as a frequency** |
| **4** | **3 distinct arm carriages at one leg state** (A, C, D between 14.20 and 16.10, legs extended and trunk vertical throughout), and **carriage A at both the clip's deepest fold and its straightest legs** | 4 carriages, 12 windows, 1 clip | **Sixth clip to refute both "tall ⇒ spread" and "deep ⇒ spread."** The target of "≥4 carriages at one depth" is unchanged; this clip adds 3 |
| **5** | **The arm lead is ABSENT in 3 of 3 direction changes, each read at the native 1/30 s over 18 frames.** The substitute is the lead arm past the rail with the rear arm back and low, held 0.8 s | 3 direction changes, 1 rider, 1 clip | **The first miss in the series.** Running tally **10 of 14 resolved turns across five clips** (was 10 of 11 across four). **`engine-target` §7 named this exact event as something that would change row 5: the target must be "the engine CAN lead", never "it always leads."** The substitute carriage is now on three clips |
| **6** | **0 pump half-cycles in 1.70 s of trim with no direction change**, 18 samples at 0.1 s | 1 window, 1 rider, 1 clip | **A second clip with no cycle present to measure** (V12 had 1.75 s, also zero). The 0.55–0.60 s figure stands on **2 clips, 1 weak dissent, 3 clips of "no cycle"** — it is a thing some riders do, not a property of trimming |
| **10** | **NOT MEASURED.** One frame with both knees unmistakable; one leg admissible (thigh/shin 1.10, chain 100 % ⚠️ SAT), one refused (2.66). Second frame refused outright | 2 frames attempted, 1 clip | **No change. Row 10 stays at V8's one clip, two frames** — and this is the third clip running that could not touch it, on footage that met the geometry ask |
| **11** | **The up-transition: legs and trunk both rise inside 13.70→14.20; the legs are visibly straighter at 13.900 while the trunk is still ≥24° folded** | 1 transition, 0.1 s resolution | **Third clip with legs leading the trunk on the way up** (V7 ~0.5 s, V8 ~0.3 s, here ≤0.2 s). **The up-order is now the best-reproduced transition fact in the series after the pump period.** No down-transition was resolvable |
| **12** | **One folded, knees-bent posture held 8.75 s continuously visible**, through a lip climb, a drop, 1.7 s of trim and a bottom turn; and again 3.7 s after the barrel. **Truncated by the clip's START, so it is a lower bound** | 1 rider, 1 ride, 2 stretches | **A new longest hold in the series** (V5 2.9 s, V12 ≥5.7 s) and a harder one to dismiss, because it contains manoeuvres. **It strengthens the DURATION half only — no depth is named (§3.1)** |
| **15** | **Both hands low and forward over the deck in 5 windows totalling ~13 s of a 16 s ride** — including inside the barrel, where it is not a hand drag | 5 windows, 1 clip | **Sixth clip.** Row 15's "reachable at any depth" is reproduced: the carriage appears at the deepest fold and the straightest legs in the same ride |
| **17** | **0 steps in ~1.3 s of legible feet**; front foot at **45–50 % of board length from the nose**, consistent with V7's 44–49 % | 2 windows, 1 clip, weak | **Unchanged — the game still agrees with the footage.** Recorded only as a regression guard |
| **18** | **The face is resolvable in ≥6 frames at 77–102 px.** Gaze down the line and below horizontal while riding folded; head pitched down under spray at 13.700 | 6 frames, 1 rider | **Second clip with any observation at all.** Still no head-yaw measurement against the board's heading, because **no frame has both the face and the board's nose legible** — which is the next footage ask |
| **8** | **~3 unambiguous direction changes in 16.1 s of riding — one per ~5 s** | 1 ride, 1 clip | **A second clip at V7's slow end**, and this one is not a tube-plus-trim: it has a barrel, a lip climb and a bottom turn in it. **Row 8's "the range is the requirement" gains its strongest case for the slow end** |
| **—** | **A new fore-aft segment, reproduced:** the head and neck thrust forward of the shoulders, by about one whole projected trunk length at t = 12.300 | 1 frame measured, several observed | **V12 opened this as a new row; this is its second clip.** It also partly explains §0.3: some of the fold the eye sees is in the neck, which no ruler in this series measures |

**Method notes that belong in the skill, not in a row:** §0.4's two-`<video>`-element and hidden-pane stale-decode trap, with the out-of-order probe that catches it; §0.3's trunk admissibility test; §1.2's confirmation that the canvas height, not the viewport, caps the magnification at 0.814× for a 700 px rider; and §3.1c's stance-width confound on hip-above-deck ÷ head.
