# Video reference 12 (Jay Phillips, Maldives): the depth is in the trunk — 80° of fold against a hip that barely moves, measured on the same two frames of the same shot

> ⚠️ **THIS DOCUMENT'S HEADLINE IS WITHDRAWN AND TWO OF ITS FRAME READINGS ARE CONTESTED. See §CORRECTIONS at the end before quoting anything from it.** The 80° span is not a usable figure — not a target, and not a lower bound — and the **t = 23.5 "hands low"** reading is contradicted by an independent read at higher resolution.


Source: **https://www.youtube.com/shorts/HhJo76wwkZc**, title *"Jay Phillips in the Maldives #surf #maldives #snapperrocks"* (`@jacobk_media`). Length **39.341 s**, read in full. The **twelfth** reference the owner has sent.

Delivered to the browser pane at **1440×2560** (`hd1440`), pinned for every measurement frame. This video is the **first Short in the series to publish `hd2160`** — and §1.2 records that 2160p bought **no extra detail at all**, which is worth knowing before another round spends a quality ladder on it. Stream is **24 fps** (§1.3), `playbackRate` 1, at or near real time (§1.4). `yt-dlp`, `ffmpeg` and `ffprobe` are all absent from this machine (checked, as the skill asks), so nothing was downloaded; every frame is a screenshot of the browser pane, **tab `tab-3`**, claimed with `tabs_create` and passed explicitly on every call.

**I was given no hypothesis and I did not adopt one.** The brief named the movement *between* positions as the centrepiece.

**Every figure below is an estimate from pixels**, and each carries its own error bar.

---

## 0. The answer first

### 0.1 — What this rider's movement is actually like

**He rides with a near-vertical trunk when he is standing and folds it to horizontal when he wants to be low — and his hips hardly move while he does it.** That is the clip's one sentence.

Two frames of the **same shot**, 2.4 s apart, same camera, measured with the same in-frame ruler:

| | t = 23.500 | t = 25.900 | change |
|---|---|---|---|
| **trunk from vertical** (shoulder→hip, hand-measured) | **10° ± 8°** | **90° ± 6°** | **+80°** |
| **hip above the deck ÷ head length** (same frame, scale-free) | **3.83 ± 0.4** | **3.22 ± 0.5** | **×0.84 ± 0.17** |
| legs, by eye | near straight | bent | — |

**Eighty degrees of trunk against a hip ratio whose error bar still contains "no change at all."** This is `engine-target.md` **row 2** — *"a crouch that is trunk fold over long legs"* — and it is the **first time any clip in the series has measured both channels on the same frames of the same shot**. V7 inferred it from leg chains, V8 from one frame, V9 from a rider it could not place on a ladder.

The other three things the clip shows sharply:

1. **A deep folded crouch held from ~33.1 s to the clip's end — at least 5.7 s, and still held when the footage runs out.** The previous record in the series was V5's 2.9 s. I name **no depth** for it (§3.1: the hip cannot be placed in that passage), but the **duration** needs no hip landmark and is not in doubt.
2. **The big arm goes up before the board turns, on 3 of 3 turns I could time** — lead **+0.04 to +0.12 s**, held **0.33–1.4 s** — and it is **absent in both trim windows** (1.75 s, 16 samples). One turn declines it and carries the move on the lead arm reaching past the rail instead, which is **V9's cutback exception reproduced in form**.
3. **The face is readable.** Eleven clips running have had nothing for `engine-target` **row 18**. This one has a profile with eye, nose and mouth at a 90–130 px head. §4.3.

### 0.2 — The brief's first question, answered before anything was spent

> *"Measure the rider's height in source pixels and say it."*

| | |
|---|---|
| **Head length** (hair-top to chin, measured) | **76–130 source px**, depending where the camera has zoomed to |
| **Standing-equivalent stature** at the clip's tallest frame (t = 23.5: head 90 px, waistband 345 px above the deck, legs near straight) | **≈ 650 source px** |
| Same, in the closest framings (t = 9.9, head 130 px) | **≈ 1000 source px** |
| **Actual head-to-foot extent in frame** | **390–650 px** — because he is never straight |

**So the clip half-meets the footage ask.** The ask is *"the rider at ≥900 source pixels"*; this rider is **650 px standing-equivalent through most of the ride and ~1000 px in the closest shots** — against clip 11's 440–520. **It is the biggest rider the series has had, and it was still not enough** (§0.3), which is itself the finding: the binding constraint turned out not to be resolution.

### 0.3 — The leg chain: a FOURTH refusal, and the first one that proves the mechanism instead of inferring it

Three clips refused for three different reasons: projection saturation (7–9, **inferred**), a raised lens plus boardshorts (10), resolution plus limb overlap (11). **This clip removes every one of those obstacles and the chain still saturates.**

What it gives, which no earlier clip gave at once:
- **Bare legs.** Short-leg wetsuit top with boardshorts cut well above the knee; **the knee is never inside the shorts**.
- **The knee visible as a joint**, not just a shape — at t = 11.0, 23.5 and 32.2 I can put a landmark on it.
- **A rider 1.3–2× bigger in head-lengths than clip 11's.**
- **A down-the-line bearing for two whole shots** (S7, S8 are shot from *behind* the rider) — `engine-target.md` §6 ask 1, delivered.

And the chain still reads ~100 % on a rider anyone can see is crouched.

**The reason, and the new test that makes it checkable on any frame.** A knee bend only shows in the hip→ankle ratio if the thigh lies in the image plane. **So measure the projected thigh/shin ratio**, which needs **no hip landmark at all** and which anatomy fixes at about **1.0–1.1**:

| frame | leg | projected thigh/shin | leg chain | admissible? |
|---|---|---|---|---|
| 11.0 | rear | **0.31** | 90 % | **no** — thigh foreshortened 3× |
| 11.0 | front | **1.15** | **100 %** | yes — and he really is near straight on that leg |
| 32.2 | near | **0.58** | 100 % | **no** |
| 0.958 | front | **1.52** | 84 % | **no** — *shin* foreshortened |
| 23.5 | front | **1.38** | **100 %** | marginal — and he is visibly straight-legged, so it is honest |

**Five leg attempts, one clean, one marginal, three refused.** Both readings that pass the test land at **100 %**, and both are on frames where the rider is plainly extended. **No frame in which he is plainly crouched passed the test.**

> **So I name no rung for any frame, and nothing here may be quoted as a leg depth.** What is new is that §4.1's saturation claim is no longer an inference: **the knee is visible, the bend is visible, and the ratio still reads 100 %.**

**And the fix the series keeps asking for will not work either.** `engine-target.md` §6 ask 1 is *"footage shot from the water, or down the line."* **Shots 7 and 8 are down the line, and the chain refuses on them too** — because from behind, the thigh points at the camera instead of across it. **The projection that hides the knee bend is not an artefact of the beach angle; it is what a surfing stance is.** A lens that sees the knee bend in-plane has to sit roughly **45° off the board's axis and level with the deck**, and no clip in twelve is that shot.

### 0.4 — The second ruler: apparent stature is still dead, but hip-above-deck is ALIVE on this camera

**The lens is above the rider in every shot.** The sea/shore line sits at source rows **740–1100** of 2560 while the rider occupies rows **1000–2200**; at t = 11.0 the horizon is **712 px above his head, ≈ 8.4 head-lengths**. So, per the skill and clips 10 and 11, **apparent stature in head-lengths is refused and not reported.**

**But hip-above-deck ÷ head-length is a different quantity and it did not fail.** It moved **3.83 → 3.22** across two visibly different postures in the same shot (§0.1), in the direction the eye says.

**Why it survives where apparent stature dies, stated so the next read can rely on it:** a raised lens turns a forward *fold* into a forward *translation*, which is exactly what defeats head-top-to-deck — that measurement has the whole folded trunk inside it. **Hip-above-deck does not contain the trunk at all.** It still carries the raised lens's vertical compression, so its **level** is untrustworthy; its **change within one shot** is not.

> **That is a methodological result worth more than the number: clips 10 and 11 concluded "the backup ruler is dead on a raised lens." It is more precise than that — *apparent stature* is dead. *Hip above the deck* is not.**

The caveat that keeps it honest: **×0.84 ± 0.17 includes 1.00.** I cannot claim the hip dropped significantly. **That is the point of §0.1** — the trunk moved 80° and the hip's movement cannot be distinguished from zero.

### 0.5 — Opposite-direction channels: trunk-vs-legs NOT found; arm-vs-trunk found 3 of 3

The brief named this the single most valuable thing the clip could contain.

**Trunk against leg depth, in opposite directions: I looked and did not find it.**

| window | length | leg depth | trunk fold | verdict |
|---|---|---|---|---|
| 0.333 → 1.208 (S1 trim) | 0.88 s, 8 samples | bends | **folds 18° → 88°** | same sign |
| 2.208 → 2.792 (S1 turn) | 0.58 s, 8 samples | extends then bends | folds | **not resolvable** — board rotates through the plane |
| 13.125 → 13.708 (S3 landing) | 0.58 s, 8 samples | bent throughout | un-folds then folds | **trunk alone** (legs hold) |
| 19.800 → 20.675 (S5 trim) | 0.88 s, 8 samples | holds | **un-folds 55° → 40°** | **trunk alone** |
| 29.750 → 30.000 (S8) | 0.25 s, 6 native frames | holds | holds | **nothing moves** |
| 32.250 → 33.125 (S8) | 0.88 s, 8 samples | extended → bent | folds | same sign |

> **Every resolved transition is same-sign, one-channel-alone, or frozen. None is opposite-sign.**
> **V9's opposite-sign passage is therefore SINGLE and now TWICE-not-reproduced** (clip 11 looked at seven transitions, this clip at six). It remains the right acceptance test for `engine-target` rows 1–2; **it is not evidence about how often surfers do it.**

**But a different pair of channels moves in opposite directions, and it does so every time he turns.** In **3 of 3** timed turns the **arm rises while the trunk folds**, for **0.17–0.33 s**:

| turn | arm | trunk | window |
|---|---|---|---|
| S1, 2.375 → 2.625 | hip height → above the head | folds | 0.25 s |
| S3, 13.042 → 13.292 | low → both hands at/above the head | folds over the board | 0.25 s |
| S7, 28.542 → 28.875 | at the head → fully overhead and spread | folds | 0.33 s |

**That is two drawn channels with opposite signs, reproduced three times in one clip**, and the game cannot express it: `HumanBalance.arms` is one scalar **triggered by the same expression that drops the knees** (`humanBalance.ts:423–431`), while the drawn trunk is an affine function of drawn leg depth (`HumanoidRig.ts:1383–1385`). **It is a weaker claim than row 3's** — a reach over the rail is arguably one coordinated action rather than two independent channels — **so it is recorded as its own line, not merged into row 3.**

### 0.6 — One channel moving while the others are frozen: four instances

| # | window | length | what moves | what is frozen |
|---|---|---|---|---|
| 1 | **29.750 → 30.000** | **0.25 s**, 6 native frames | **nothing in the body** | trunk, legs, both arms — while the board planes and the spray changes |
| 2 | **32.250 → 32.500** | **0.25 s** | nothing | hand held above the head, trunk and legs unchanged |
| 3 | **2.458 → 2.792** | **0.33 s** | the board rotates through the turn | **the raised arm is still** |
| 4 | **13.125 → 13.708** | **0.58 s** | the board goes from vertical to flat | **the arm stays high**, legs stay tucked |
| 5 | **19.800 → 20.675** | **0.88 s** | **trunk alone**, 55° → 40° | legs hold |

Instance 1 is **video 10's "body entirely frozen for 0.44 s while the board worked"**, reproduced at a finer grid on a fourth camera. Instance 5 is **clip 11's "trunk alone for 0.36 s"**, reproduced at **0.88 s** — more than twice as long.

> **One-channel-frozen is now on four clips and is the best-reproduced transition fact the series has. Opposite-sign trunk-vs-legs is on one clip and has failed to reproduce twice.** Those two sentences should travel together.

### 0.7 — Which manoeuvres take the big arm — the brief's open question, answered

| manoeuvre | t | overhead arm? |
|---|---|---|
| S1 top turn / off-the-lip | 2.38–2.79 | **yes**, lead +0.083 s, held ≥0.33 s |
| S3 bottom turn | ~15.9 | **yes** (rear arm above the head) |
| S3 off-the-lip, board through vertical | 13.04–13.71 | **yes**, lead ~+0.04–0.08 s, held ≥0.58 s |
| S4 turn | ~17.6 | **yes** (rear arm above the head) |
| S7 big turn | 28.54–29.05 | **yes**, lead ≥ +0.12 s (bounded by the cut at 28.458) |
| S8 climbing turn | 29.90–32.50 | **yes**, held **≈ 1.4 s**; arm already up at the shot's first frame, so no lead measurable |
| **S6 bottom turn** | **27.1** | **NO** — lead arm reaching forward-down past the rail, rear arm back and low |
| **S1 trim** | 0.333–1.208, 8 samples | **no** — both hands low over the deck throughout |
| **S5 trim** | 19.800–20.675, 8 samples | **no** — both hands low over the deck throughout |

**Turns 6 of 7. Trim 0 of 2 windows (1.75 s, 16 samples).**

And the exception has a **shape**: at 27.1 the move is carried on the **lead arm reaching past the rail** — which is exactly the form V9 recorded for its 1.10 s roundhouse cutback. **Two clips, two riders, same substitute.** So the arm lead is not "always"; it is **"when the rear arm is the one doing the work."**

Running tally with this clip: **the arm lead, timed against the rail biting, is now on four clips** (V8 3 of 4, V9 2 of 2, V11 2 of 2, V12 3 of 3) — against `engine-target.md` §4.6's corrected count of two. **Lead +0.04 to +0.30 s across the four; hold 0.17–1.4 s.**

### 0.8 — The rate, and why this clip's headline number is worthless

**This is a montage of 8 shots** (§1.5), so a whole-clip rate mixes eight different moments of eight different waves. **The per-shot rates are the usable figures:**

| shot | length | unambiguous direction changes | interval |
|---|---|---|---|
| S3 (9.250–17.208) | 7.96 s | **≈ 6** | **one per 1.3 s** |
| S6 (23.333–28.417) | 5.08 s | ≈ 3 | one per 1.7 s |
| S5 (18.750–23.292) | 4.54 s | ≈ 2 | one per 2.3 s |
| **S8 (29.750–39.341)** | **9.59 s** | **2** | **one per 4.8 s — and ZERO in its last 6.2 s** |

**Against the series:** V7 **0 in 13 s**; V9 one per 2.3 s; V10 one per 1.2–1.9 s; V11 one per 1.2–1.5 s.

> **S3 and S8 come from the same rider, the same session and the same camera, and they are 3.7× apart.** That is the strongest single piece of evidence yet for `engine-target` **row 8's** claim that **the range is the requirement**, not a number — and it removes the last way of reading V7's zero as a quirk of that clip.

### 0.9 — Lead with the disagreements

| # | this clip | the existing reads | what it does to them |
|---|---|---|---|
| 1 | **A deep folded crouch held ≥5.7 s**, still held when the clip ends | Row 12: holds are V5's 1.75/2/≥2.9 s (one rider), V2's 3–4 s, V9's 0.6 s; dips are 0.25–0.7 s | **Doubles the longest hold in the series.** Ruling C already keeps both patterns; this makes the hold half much harder to dismiss as one rider's habit. **But I name no depth for it (§3.1), so it strengthens the DURATION claim and not the depth one** |
| 2 | **Leg chain refuses on down-the-line footage too** | `engine-target` §6 ask 1: *"footage shot from the water, or down the line"* would settle depth | **The ask as written will not settle it.** From behind, the thigh points at the lens instead of across it. §0.3 restates what geometry the shot actually needs |
| 3 | **Apparent stature refused; hip-above-deck ÷ head-length WORKS** (3.83 → 3.22) | Clips 10 and 11: *"the backup ruler is dead on any raised lens"* | **Too broad.** *Apparent stature* is dead because it contains the fold. *Hip above deck* does not and still responds |
| 4 | **80° of trunk against a hip ratio of 0.84 ± 0.17, same shot, 2.4 s apart** | Row 2 is carried by V7's leg chains, V8's single frame, V9's 0.40 s | **First time both channels are measured on the same frames of one shot.** Row 2's strongest evidence to date |
| 5 | **No opposite-sign trunk-vs-leg passage in 6 resolved transitions** | V9 row 3: one 0.6 s opposite-sign passage, SINGLE | **Row 3 is now SINGLE and twice-not-reproduced** (clip 11, 7 transitions; this clip, 6). Still the right acceptance test; not a frequency claim |
| 6 | **0 pump half-cycles in 2 trim windows totalling 1.75 s at 0.125 s** | V8 and V9: 0.55–0.60 s; V11 dissents at ~0.36 s (marked weak) | **No contribution either way, and that is the honest result.** Two clean trim windows, 16 samples, and **this rider does not pump in them** — he folds monotonically. It matches V11's *other* trim window, which also had no cycle. **The 0.55–0.60 figure stands on 2 clips, with 1 weak dissent and now 2 clips of "no cycle present to measure"** |
| 7 | **`hd2160` exists and adds nothing** | V9's 1440p ladder; V10 and V11 both capped at 1080p | **Four clips, four different ceilings — and the fourth shows the ceiling can be fictitious.** Ask the player, then **A/B it**, because a published 2160p may be an upscale |
| 8 | **The face is readable** — eye, nose, mouth, in ≥4 frames | Row 18: eleven clips, no usable observation | **The first observation for row 18.** §4.3. Four frames and no yaw measurement, so it is a start, not a target |
| 9 | **S3 at one change per 1.3 s and S8 at one per 4.8 s, same rider, same session** | Row 8's range runs V7's 0-in-13-s to V11's 1.2 s | **The range is now demonstrated WITHIN one rider and one session**, not only across clips |

---

## 1. The source, and what the numbers are worth

### 1.1 Delivery

`#movie_player` does not exist on a Short; the player is `#shorts-player`. `getAvailableQualityLevels()` returns `["hd2160","hd1440","hd1080","hd720","large","medium","small","auto"]`. **`hd1440` was pinned and `getPlaybackQuality()` confirmed before every measurement frame**; `video.videoWidth/videoHeight` = **1440×2560**.

**No consent gate appeared** on this Short; nothing was accepted or rejected because nothing was offered.

### 1.2 ⚠️ 2160p is published and buys nothing — A/B'd

The skill warns *"2160p is the wrong choice — the pane dropped to ~1 fps."* **On this clip the frame rate was fine** (`setPlaybackQualityRange('hd2160','hd2160')` gave 2160×3840 with 300 ms exact seeks, paused and stable). **The problem was different: there is no extra detail in it.**

The test: the **same field of view** of the same frame (t = 11.0, the rider's legs), rendered to the **same final size** — a 400×300 crop at 1440p magnified 1.98×, against the identical 600×450 region at 2160p magnified 1.32×. If the 2160 stream carried real detail the second would show **2.25× more real pixels** and look sharper. **It looked the same, if anything slightly softer.**

> **The binding limit on this clip is motion blur, not resolution.** 24 fps with a cinematic shutter blurs a fast hand and a spray sheet, and no stream above 1440p recovers it. **All measurement was done at `hd1440`.**

### 1.3 The frame grid: 24 fps, measured

Seeking on a **0.005 s** grid from 12.000 to 12.205 and hashing the decoded frame, the picture changes at **12.045, 12.085, 12.125, 12.170** — intervals of 0.040, 0.040, 0.045, i.e. the first 0.005-grid sample at or after each multiple of **1/24 = 0.041667** (12.0417, 12.0833, 12.1250, 12.1667). **Four of four match; 25 fps does not fit** (it predicts 12.040 / 12.080 / 12.120 / 12.160).

**23.976 is not excluded** and is mildly favoured by a second symptom: sampling later windows on an exact 1/24 grid returned **duplicate frames in alternating slots** (the `d = 0` rows throughout §1.5's probes), which is what a 24.000 sampler does against a 23.976 stream as the drift accumulates. **The difference is 0.1 % and changes no figure here.**

### 1.4 Slow motion: excluded, on three independent grounds

Stronger than clip 11's, which rested on duration comparison alone.

1. **Rotation rate.** The off-the-lip at 12.958→13.292 swings the board from roughly +30° through vertical to about −30° — call it **~140° in 0.33 s ≈ 420 °/s**. That is a believable pro snap at real time. At 2× slow it would be 840 °/s and at 5× over 2000 °/s, which no surfer does.
2. **Motion blur.** 24 fps with a ~180° shutter is ~1/48 s, and the hands at t = 13.0 and the spray sheets throughout are **visibly blurred**. A 120 fps camera conformed to 24p would run a ≤1/120 s shutter and the same hands would be sharp.
3. **Durations.** The complete S3 sequence bottom turn → climb → over the lip → landing runs **12.96 → 13.71 = 0.75 s**, and the S1 turn **2.21 → 2.79 = 0.58 s**, against the published bottom turn **0.96 ± 0.04 s** (n = 6, 835 turns, **mixed types — only the duration column carries weight**) and V8's 0.35 s snap.

**Verdict: at or near real time.**

### 1.5 It is a MONTAGE — eight shots, every cut confirmed on the native grid

**This matters more than usual**, because a "transition" measured across a cut is a fabricated finding, and clip 11 called itself a montage twice and was wrong both times.

Method, in two stages. A whole-clip trace at **0.1 s** (393 samples, a 96×171 luminance grid plus mean colour plus a horizon-row detector) nominated seven boundaries where **a single-sample spike coincided with a step change in mean colour that then persisted**. Each nominee was then re-probed at the **native 1/24 s grid**, ±4 frames. **All seven spike 3–7× above their own local level:**

| cut | native frame | spike | local neighbours |
|---|---|---|---|
| 1 | **3.708** | 60.7 | 13–21 |
| 2 | **9.250** | 86.1 | 9–13 |
| 3 | **17.250** | 73.0 | 8–16 |
| 4 | **18.750** | 79.5 | 9–17 |
| 5 | **23.333** | 53.4 | 11–18 |
| 6 | **28.458** | 57.3 | 17–21 |
| 7 | **29.750** | 54.9 | 10–21 |

Cut 7 was also **verified by eye** on a 1/24 s strip (29.708 → 29.750): wave, framing, rider bearing and background all change between two consecutive frames. Two candidates the 0.1 s pass had nominated — **11.2–11.4 and 25.0–25.3** — showed colour drift **without** a frame-diff spike and are **camera moves, not cuts**.

| shot | span | length | what it is |
|---|---|---|---|
| **S1** | 0.000–3.667 | 3.67 s | side-on trim into a top turn, then driving into whitewater |
| **S2** | 3.708–9.208 | 5.50 s | a very low lens; board-dominated |
| **S3** | 9.250–17.208 | **7.96 s** | the busiest shot — ~6 direction changes, an off-the-lip through vertical |
| **S4** | 17.250–18.708 | 1.46 s | one turn with the rear arm above the head |
| **S5** | 18.750–23.292 | 4.54 s | driving and trimming on a clean face |
| **S6** | 23.333–28.417 | 5.08 s | the clip's tallest frame **and** its deepest open-face fold |
| **S7** | 28.458–29.708 | 1.25 s | one big turn, from behind, huge spray |
| **S8** | 29.750–39.341 | **9.59 s** | down the line from behind: a climbing turn, then a **≥5.7 s held crouch** |

One rider, one board (white deck, dark logos), one wetsuit top, bare legs, red-and-black boardshorts, in every shot. **Eight shots, so figures here are about *a* surfer across eight waves, not about one ride.**

### 1.6 What the error bar is

- **Source 1440×2560.** Rider **390–650 px** head-to-foot as he actually stands; **650–1000 px** standing-equivalent; head **76–130 px**; thigh **100–150 px** projected.
- **The camera zooms and pans continuously**, so **no apparent size is compared between two frames without a head-length normalisation.** Every ratio below is computed **inside a single frame**.
- **Trunk angles** are hand-measured shoulder-to-hip from vertical on gridded single frames at 0.9–1.35× : **±6–8°** where the hip is a readable waistband, **±12°** where it is not. **No automated tracer was built** — clip 11 built one, validated it, found it reading 9° where the hand read 39–43°, and discarded it. **I did not rebuild it.**
- ⚠️ **The thumbnails lie about trunk angle, and they lied to me.** Reading the 0.26× survey strips I wrote "trunk ~70°" for frames that measured **32–43°** at 1:1, and "~45°" for a frame that measured **10°**. **Every trunk number in §3.2 comes from a gridded frame at ≥0.86×; none comes from a strip.** This is the same trap as the skill's cut-detection warning, in a different channel.
- **Hip position** carries the skill's standing caveat — a waistband sits near 0.60 of stature where the trochanter is at 0.53 — so **every hip figure is ±10–15 points however sharp the image.**
- **Pane geometry, corrected for the next read.** At a **1280×1000** viewport the screenshot came back **800×625** and the canvas→screenshot scale was **0.625**, not the 0.78 the skill records. **Shrinking the viewport to 800×640 made the screenshot 800×640 and the scale exactly 1.0**, so a **790×594 source crop renders 1:1** — about **55 % more usable pixels** than the large-viewport arrangement. **A smaller viewport is strictly better for this work.** `computer zoom` was not used: it reports *"cropped from a screenshot, not magnified"* and buys nothing.

---

## 2. The ride, shot by shot

Times are the player's own clock. **Body descriptions here are qualitative**; the measured numbers are in §3.

| window | what the board does | what the body does |
|---|---|---|
| **0.33–1.21** (S1) | flat, trimming, then meeting whitewater | **trunk folds 18° → 88° monotonically over 0.88 s**, legs bend, **both hands low and forward over the deck in all 8 samples**. Not a pump — a brace into foam |
| **2.21–2.79** (S1) | board banks at 2.458, climbs, big spray | **rear arm rises from hip height to above the head at 2.375–2.458 — one frame before the bank — and is held to 2.792** |
| **4.4–6.8** (S2) | very low lens; board fills frame | legs and board only; body largely out of frame |
| **9.4–10.9** (S3) | trim → top → bottom | trim with hands low; at the top the legs are long and the torso upright; at the bottom the arms spread low and wide |
| **11.0** (S3) | driving, board across the image | crouched, **both legs bare and separable** — the frame used for the leg chain |
| **12.96–13.71** (S3) | **board through vertical**, nose up, then over and flat | **arms rise 13.04–13.13 and stay up through 13.71 (≥0.58 s)** while the board rotates under them; legs stay tucked throughout |
| **13.9–16.9** (S3) | bottom turn, climb, top turn | rear arm above the head at 15.9; arms spread wide at 16.4; hands back low at 16.9 |
| **17.6** (S4) | one turn | **rear arm above the head**, legs extended, trunk ~40° |
| **19.8–20.68** (S5) | driving a clean face, no direction change | **trunk un-folds 55° → 40° over 0.75 s while the legs hold**; hands low over the deck in all 8 samples |
| **23.5** (S6) | flat, planing | **the clip's tallest frame — trunk 10°, legs near straight, hands low** |
| **25.9** (S6) | low on the face | **the clip's deepest open-face fold — trunk 90°, hips level with the shoulders, lead hand reaching forward-down** |
| **27.1** (S6) | bottom turn, board to ~45° | **lead arm forward-down past the rail, rear arm back and low — no overhead arm** |
| **28.54–29.05** (S7) | board banks ~28.67–28.75, then a big turn | **arm overhead at 28.542 (first frame of the shot), both arms high and spread through 29.05** |
| **29.75–30.00** (S8) | planing, spray changing | **the whole body frozen for 0.25 s / 6 native frames** |
| **30.1–32.5** (S8) | climbing turn, board nose-up | **both arms high and wide, held ~1.4 s** |
| **32.5–33.1** (S8) | board flattens, foam arrives | **arms come down from overhead to low-and-forward over 0.5 s as the trunk folds** |
| **33.1–39.34** (S8) | riding inside/behind whitewater to the end of the clip | **deep folded crouch, both hands low and forward, held ≥5.7 s and still held when the footage ends** |

---

## 3. The four channels, each with its own number

### 3.1 Leg depth — **no rung named**, for the fourth clip running

§0.3 has the refusal and the new admissibility test. What is left that is honest:

**(a) The in-frame, scale-free ruler — hip above the deck ÷ head length, measured in the same frame.** Both frames are in **shot 6**, same camera, 2.4 s apart:

| t | head length | hip above deck | ratio | what the frame looks like |
|---|---|---|---|---|
| **23.500** | 90 ± 8 px | 345 ± 20 px | **3.83 ± 0.4** | legs near straight, trunk 10°, hands low |
| **25.900** | 76 ± 8 px | 245 ± 30 px | **3.22 ± 0.5** | legs bent, trunk 90°, hips level with the shoulders |

**×0.84 ± 0.17.** **The error bar contains 1.00, so I do not claim the hip dropped.** What is certain is that the **trunk** moved 80° between the same two frames.

**This is not a percentage of straight-legged standing hip height and must not be placed on `stance-frame.md`'s ladder.** The denominator is the clip's own tallest *riding* frame, and a rider on a board is never straight-legged, so the true straight-legged figure would be larger and every percentage smaller.

**(b) The held crouch, 33.1 → 39.34: duration only.** Across **≥5.7 s** he stays folded and compact. I attempted the hip at t = 34.0 and t = 35.2 at ~1.0× with a 25 px grid and **could not place it**: he is inside whitewater, the wetsuit is black on a bright spray background, and the buttock–shorts boundary is not findable. **An early estimate of "~47 % of the tallest frame" was computed and then discarded** when the second frame showed the hip landmark was a guess. **No depth is reported for the clip's most interesting passage**, and the duration — which needs no hip — is reported instead.

**(c) Qualitatively**, the legs are flexed for nearly the whole clip; near straight only at **23.5** and at the top of the S8 climb; most tucked at **13.13–13.38** (over the lip) and throughout **33.1–39.34**.

### 3.2 Trunk fold — ~80° of travel, the largest span in the series

Hand-measured shoulder-to-hip from vertical, on gridded frames at 0.86–1.35×. **Six measurements; none from a survey strip.**

| t | shot | fold from vertical | ± | context |
|---|---|---|---|---|
| **23.500** | S6 | **10°** | 8 | tallest frame, legs near straight |
| 0.583 | S1 | **18°** | 12 | trim; hip inferred, hence the wider bar |
| 34.000 | S8 | **35°** | 12 | held crouch; shoulder uncertain in spray |
| 0.958 | S1 | **64°** | 8 | trim, 0.375 s later |
| 1.208 | S1 | **88°** | 10 | meeting whitewater |
| **25.900** | S6 | **90°** | 6 | deepest open-face fold; trunk horizontal |

**Total travel ≈ 10° → 90°, about 80°.** **Fourth clip to reproduce ≥60°** (V8 17→76° = 59°, V9 5→70° = 65°, V11 15→75° = 60°) and **the widest span of the four**.

**Rates, which the engine has no analogue for at all:**
- **18° → 64° in 0.375 s** (S1) ≈ **120 °/s**
- **55° → 40° in 0.75 s** (S5) ≈ **20 °/s**

> **A six-fold difference in trunk rate inside one clip.** The drawn trunk today moves at whatever rate leg depth moves, because it *is* leg depth (`HumanoidRig.ts:1383–1385`), so it has one rate by construction.

**Independence from leg depth** is shown twice: **trunk alone for 0.88 s** at 19.800→20.675 (legs hold, trunk un-folds 15°), and **legs bent while the trunk un-folds then re-folds** at 13.125→13.708.

### 3.3 Arm carriage — five carriages, and it does not follow depth

| carriage | windows | count |
|---|---|---|
| **A — both hands low and forward over the deck**, inside the rails | 0.33–1.21, 9.4, 13.6–13.8, 19.8–20.68, 23.1, 23.5, 25.3–25.9, 27.7, 33.1–39.34 | **≥ 8 — the clip's most common by a wide margin** |
| **B — one arm above the head, the other low** | 2.46–2.79, 13.13–13.71, 15.9, 17.6, 28.54–29.05, 29.75–32.6 | 6 |
| **C — both arms spread wide, roughly level** | 10.4, 16.4, 26.5, 31.3–32.2 | 4 |
| **D — both arms high/overhead with the body tucked** | 13.13–13.21, 28.88–29.05, 31.3–32.5 | 3 |
| **E — lead arm reaching forward-down past the rail, rear arm back and low** | 0.333, 27.1, 29.22 | 3 |

**Carriage A occurs at the clip's straightest legs (23.5) and through its deepest, longest crouch (33.1–39.34).** So **carriage does not track depth** — consistent with V7, V8, V9 and V11 refuting both *"tall ⇒ spread"* and *"deep ⇒ spread"*.

**Carriage A reproduces `engine-target` row 15 on a fifth clip** (V7 4 windows, V8 5, V9 6, V11 4, here ≥8). The hands are over the **deck**, usually both at once — not the single hand in the water of a tube ride.

### 3.4 Arm timing — §0.7. **Lead +0.04 to +0.12 s, 3 of 3 timed turns, 6 of 7 turns overall, 0 of 2 trim windows, held 0.33–1.4 s.**

The finest resolution available is **one native frame = 0.042 s**, so the S1 lead of **+0.083 s** is **two frames ± one**. The S7 lead is a **lower bound** because the shot's first frame already has the arm overhead.

---

## 4. The fore-aft hip axis, the feet, and the face

### 4.1 Hips aft, shoulders forward — on 8 frames, and a fifth degree of freedom

On every frame where I could place the landmarks — **0.333, 0.583, 0.958, 1.208, 11.0, 23.5, 25.9, 34.0** — the **shoulders sit forward of the hips toward the nose** and the **hip sits at or just behind the rear foot**. **8 frames.** This reproduces V1, V7, V8, V9, V10 and V11. **No magnitude: direction and sign only**, as in every previous clip.

**And one thing no earlier read has flagged: the head and neck are thrust forward of the shoulders**, measurably so — at **t = 0.958** the head centre sits **230 px forward and only 172 px above** the hip, and at **t = 23.5** the head is **110 px forward of the shoulder** on an otherwise near-vertical trunk (10°).

> **That is a third segment in the fore-aft chain, not two.** It also explains why the survey strips read as "folded" at frames whose trunk measured 10–18°: **what the eye reads as a fold is partly a forward head on an upright trunk.** The game's rig has a head part (`riderPosture.ts`) carried rigidly; **a forward head is as absent as a folded trunk, and it is a quarter of the visual impression.**

### 4.2 Feet: 0 steps

In the windows where both feet and the deck were legible — **0.333–1.208, 23.5, 29.750–30.000, 32.250–33.125**, about **2.0 s in total** — neither foot changes its place on the deck, judged against the board's own logos. **Weaker than V7's 13 s count**, and recorded as "none seen", not as a measurement. **Stance: regular/natural (left foot forward)**, read from the rear views in S7 and S8.

### 4.3 ⭐ Head and gaze — the first observation in twelve clips

**The face is resolvable.** At **t = 0.958** (head 77 px) and **t = 23.5** (head 90 px) the profile shows **eyebrow, eye, nose, mouth and chin** as separate features; at **t = 9.9** the head is **130 px**. Eleven clips running could not do this (5–8 px faces in V4, "never resolvable" in V6–V9, 55–70 px in V11).

What it supports, and nothing more:

- In every readable frame the **head is turned to face along the board's direction of travel**, down the line, **not** square to the shoulders and **not** toward the camera.
- The **gaze line is below horizontal** — he is looking at the water ahead of the nose, not at the lip above him — in all four readable frames, including the near-upright one at 23.5.
- The head **leads the fore-aft chain** (§4.1): it is forward of the shoulders, which are forward of the hips.

> **`engine-target` row 18 has had no target at all for eleven clips. This is four frames on one rider and no measurement of head yaw against the board's heading, so it is a start, not a target** — but it is the first evidence that there is something there to model, and it says what to measure next: **head yaw and pitch relative to the board's heading, through a turn.**

---

## 5. Part B — the mapping

Game-side entries are **code readings quoted from `3.5/body-channels.md` and `3.5/engine-target.md`**. **Nothing was built, ridden or benchmarked.**

> ⚠️ **Work in flight that this table does not credit.** `main` at **b3598cac** (step 3.5g) records that `engine-target` **rows 4, 5 and 15 — the arm carriage channel, the arm lead and the two-handed low carriage — have been built**, with *"four distinct carriages at one leg height, all read off the drawn points"*. **That commit adds no `src/` change to `main`**, so the three arm rows below describe the game as `main`'s source still stands and should be re-read against 3.5g's branch before any of them is quoted as a gap. **Rows 6 and 11 were handed back there as downstream of the gated trunk, which is exactly what §0.1 and §3.2 are about.**

| what the rider does | the game's name for it | have it / partly / not at all |
|---|---|---|
| **Trunk 10° → 90° across the clip; 80° of travel** | — | **not at all.** Expressibility limit: `HumanoidRig.ts:1383–1385` makes the drawn trunk an affine function of drawn leg depth, worth ~8° at trim frontside across the whole leg range (`engine-target` row 2) |
| **Goes low by folding 80° while the hip ratio moves ×0.84 ± 0.17 — same shot, 2.4 s apart** | `Crouch` / `Compress` | **not at all.** The game's only way down is the leg spring, so it would reach that silhouette by dropping the hips — measuring a rung or two too deep and losing the trunk entirely |
| **Trunk at two rates — 120 °/s and 20 °/s — in one clip** | — | **not at all.** The drawn trunk has exactly one rate, because it has exactly one input |
| **Trunk un-folds 15° over 0.88 s while the legs hold** | — | **not at all.** Within a stage the drawn correlation with depth is exactly +1 |
| **Arm above the head 0.04–0.12 s before the board banks, 3 of 3 timed turns, held 0.33–1.4 s** | entry to `bottom turn` / `carve` | **not at all.** No arm position exists to lead with, and the one orderable pair runs backwards — knees at `MOTOR_LAG` 0.05 s against arms at `ARMS_TIME` 0.15 s, with `KNEE_RETURN_TIME` 0.6 s |
| **The arm rises while the trunk folds — 3 of 3 turns, 0.17–0.33 s** | — | **not at all.** `HumanBalance.arms` is one scalar, capped by `stanceRoom(depth).arms` and **triggered by the same expression that drops the knees** (`humanBalance.ts:423–431`), so the two cannot take opposite signs |
| **A turn declines the overhead arm and is carried on the lead arm past the rail instead** (27.1) | — | **not at all.** The `hand` input puts **one** hand in the water, on/off, and **the game chooses which** (`AttachedRider.ts:5720–5732`) |
| **Both hands low and forward over the deck, ≥8 windows** — the clip's commonest position | — | **not at all.** One hand, on/off, pointed at the water, side chosen by the game |
| **5 arm carriages, independent of leg depth** | — | **not at all.** One scalar has no height, no spread and no left/right |
| **The whole body frozen 0.25 s while the board planes; the arm still 0.58 s while the board rotates from vertical to flat** | — | **not at all.** There is no arm position to hold still, and nothing sequences a body against a board phase |
| **A deep folded crouch held ≥5.7 s, still held at the clip's end** | `Compress`, **held** (Ruling C) | **partly.** Compress is held for as long as the key is pressed, which is the right shape. **But the posture is a fold plus a leg bend, and the game can only supply the leg bend** |
| **Rides inside/behind whitewater for ~6 s, still on his feet, in one sustained brace** | — | **not at all** as a posture; `engine-target` row 16. The foam does reach the board (step 3.5e, five channels); **no brace posture exists**, and the ride-through is not judgeable while rides end first |
| **Board through vertical (±90°) over the lip with the body tucked and both arms high** | `snap` + `?snapDepth=deep` | **partly.** The tuck depth exists; **the board going past vertical does not**, and the arms cannot be high |
| **Head and shoulders forward of the hips over planted feet, 8 frames** | `trim` weight (W/S) | **not at all** as a differential. `TRIM_SHIFT = 0.25 m` moves pelvis, torso, head and both arms **together** (`AttachedRider.ts:5514–5518`) |
| **The head thrust forward of the shoulders, 110–230 px, on an upright trunk** | — | **not at all**, and it is a **new row** — a third fore-aft segment no earlier read flagged |
| **Head turned along the board's travel, gaze below horizontal, 4 frames** | — | **not at all.** No head or gaze role in the stance or the rig; `engine-target` row 18 |
| **0 steps in ~2.0 s of legible feet** | — | **have it.** Feet fixed at 0.30 m from the tail and +0.63 m ahead of it; nothing moves them while upright. The one row where the game and the footage agree |
| **One direction change per 1.3 s in one shot and per 4.8 s in another, same rider and session** | chaining `bottom turn` / `top turn` / `carve` | **not at all.** No chaining notion exists, and the sample cannot be taken while rides end first (`engine-target` row 8) |
| **Bottom turn → vertical → landing in 0.75 s with distinguishable beats** | `bottom turn` + `snap` | **partly.** The moves exist but are **named after the fact** by `rideAnalysis`; there is no beat clock |
| **No trim pump at all: 0 half-cycles in 1.75 s across two windows** | `pump` | **n/a — the clip has nothing to map.** Recorded so the 0.55–0.60 s figure is not credited to this clip in either direction |

---

## 6. Part C — what I could not see, and why

- **The leg chain, on 3 of 5 attempts** — and on **both** of the frames where the rider is visibly crouched. Cause: **thigh foreshortening**, measured by the projected thigh/shin ratio (0.31, 0.58, 1.52 against anatomy's ~1.0–1.1). **Not resolution, not clothing, not occlusion** — this clip has none of those problems (§0.3).
- **Any leg depth at all during 33.1–39.34**, the clip's longest and most interesting passage. The hip landmark is unfindable inside whitewater against a black wetsuit. **The duration is reported; the depth is not.**
- **Apparent stature in head-lengths.** Refused outright: the lens is above the rider in every shot (§0.4).
- **The two legs' split** (V8's 10–12 points at 97/86 and 88/76). Never were both knees unambiguous in one frame with both thighs in-plane.
- **Knee angles** to better than about ±20°. Not reported, as videos 6, 9 and 11 also declined.
- **Whether the S1 turn at 2.4–2.8 is a top turn, an off-the-lip or a cutback.** The lens is behind and to the side and I could not fix the wave's peel direction against his chest. **The arm timing is reported; the manoeuvre's name is not.**
- **Frontside versus backside** anywhere in the clip, for the same reason. **The stance (regular) is reported; the orientation is not.**
- **The lead on S8's climbing turn.** The arm is already overhead in the shot's first frame (29.750), so the lead is **unmeasurable, not zero** — the cut truncates it. Same for S7, where only a **lower bound** of +0.12 s survives.
- **Any magnitude for the fore-aft hip travel.** Direction and sign only, as in all six earlier clips.
- **Shot 2 (3.708–9.208) almost entirely.** The lens is very low and the board fills the frame; the body is out of shot or occluded for most of its 5.5 s.
- **A whole-cycle or ballistic slow-motion check.** The board is never in free flight and spray droplets are not resolvable through the motion blur, so §1.4's exclusion rests on rotation rate, blur and duration comparison. **Three independent grounds, but none of them a measured gravity.**

---

## 7. What this round did not do

- **No file under `src/` or `server/` was touched.** This is evidence, not a fix.
- **Nothing was built, ridden, benchmarked or measured in the game.** Every game-side statement is quoted from `3.5/body-channels.md` or `3.5/engine-target.md`.
- **No constant is proposed, and no stance rung is named for any frame.**
- **The eleven earlier video documents were not edited.**
- **No automated trunk tracer was built.** Clip 11 built one, validated it against hand measurement, found it reading 9° where the hand read 39–43°, and discarded it; this round did not rebuild it, and §1.6 records that the **survey strips** mislead on trunk angle by 30–40° so that no later round reads angles off a thumbnail.
- **An early depth figure for the held crouch (~47 % of the tallest frame) was computed and then withdrawn** when a second frame showed the hip landmark was a guess (§3.1b). It appears nowhere as a number.
- **No conclusion is drawn about the wave, the lip, the foam or the spray**, which the owner has now asked six times.

---

# CORRECTIONS (2026-11-18, added after publication)

**Two separate problems. The first withdraws this document's headline; the second contradicts one frame reading and has a knock-on effect on row 4.**

## 1. The 80° span is withdrawn — it is not a target and not a lower bound

Three findings, none of them from this read:

1. **The trunk angle has an admissibility gate of its own**, the analogue of the leg chain's: projected shoulder→waistband ÷ head length must sit near **1.6–1.8** for the trunk to lie in the image plane. Video 13 is the first read in the series to test for it. **Six attempts, two passes — and both passes were VERTICAL trunks.** No visibly-folded frame has ever passed, in thirteen clips. **The 10° and 90° readings here were never gated.**
2. **Hip-above-deck ÷ head length moves with STANCE WIDTH** — the feet moving apart lowers the hip with no knee change at all. **The ×0.84 was never checked for equal foot spacing between the two frames.** And the ±0.17 **contains 1**, so it permits a modest hip drop as readily as no change; this document's "an error bar that contains *no change*" stated only one of the two.
3. **Decisively: a span is not a lower bound.** Foreshortening can only shrink a **single** angle from vertical, under a level camera, **with fixed yaw**. A **difference of two projected angles** has no such protection: *a fixed lean swivelled from facing the lens to side-on changes its apparent angle with zero anatomical flexion.* **These two frames are 2.4 s apart inside a turn, and the independent review confirms the board heading and the perspective both changed between them.** Its words: *"the two frames cannot calibrate an 80° hip rotor."*

> **After thirteen clips there is no gated measurement of trunk angular travel anywhere in the series.** An image-plane angle is **a reference for visual range, not a prescribed rotor angle.** Row 2's target column loses its number; **row 2 itself survives on the code, which needs no camera.**

## 2. The t = 23.5 frame: "hands low" is contradicted

An independent read at **2160 × 3840** reports that at **23.47–23.68** — and verified again at **23.52 and 23.68** — the rider **stands tall with one hand alongside the back of his head, elbow high, and the opposite arm lower.** This read has it as *"hands low"* at 23.5, in four places (§the stature table, §the hip/trunk table, §the carriage list and §the carriage conclusion).

**This read cannot adjudicate it** — its own frames are lower-resolution, and a stale-frame failure discovered the same day **defeats both of the defences this document relied on**: decode can freeze while `document.hidden` is false, `readyState` is 4, every seek resolves, `currentTime` returns exactly what was asked **and the canvas stamp is correct**. Only an out-of-order probe catches it. **So the frame labelled 23.5 here may not be the frame that was measured.** The higher-resolution read is taken as correct pending a re-read.

**It also reports an intermediate reversal between the two headline frames**, which this document treats as a single transition: **24.20–24.35 lower, 24.87 partway up, 25.90 the trunk nearly level, 26.47 the nose rising and the arms spreading.** So the 23.5 → 25.9 pair spans **a recovery**, not one continuous fold.

### The knock-on, and it runs against this document's own conclusion

§ *"Carriage A occurs at the clip's straightest legs (23.5) and through its deepest, longest crouch (33.1–39.34). So carriage does not track depth."* **If the 23.5 frame has a hand beside the head, that sentence loses its first half** — and what remains (a **high** hand at the straightest legs, **low** hands at the deepest crouch) points the other way: it is **consistent with** arm height tracking leg depth in this clip.

**This does not overturn row 4**, whose refutation of both depth links rests on **V6, V7, V8, V9 and V11**. But **V12 must be struck from that evidence until the frame is re-read**, and if the high hand holds, V12 is a **dissent** rather than a confirmation. Recorded here rather than quietly amended, because the measurement is not this read's to change.
