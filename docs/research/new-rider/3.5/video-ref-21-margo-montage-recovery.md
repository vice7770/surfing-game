# Video reference 21 (*Margo #surfing Vesper*, @Albumsurf): **a rider is thrown head-down over his own board in the whitewater and is standing again 0.73 s later — and while he does it ONE hand goes above his shoulder line and the other stays low, which breaks the rule clips 19 and 20 were about to establish**

Source: **https://www.youtube.com/shorts/JyuQD2apZHQ**, title *"Margo #surfing Vesper"*, channel **`@Albumsurf`**. Length **37.561 s**, read in full. The **twenty-first** reference the owner has sent, registered as #21 in `CLIP-REGISTRY.md`.

> ⭐ **The longest clip in the series by a factor of two and a half.** Clips 16–20 ran 5.8–14.0 s; this one runs **37.561 s**. It is a **montage** of roughly ten separate ride shots of what appears to be one surfer — grey-haired and bearded, black full wetsuit, **bare feet**, a long red/maroon board — and it ends with him **walking up the beach carrying the board** (32.75 → 37.5). Because it is a montage, "the rider" below means *this surfer across his shots*, not one ride.

Delivered to the browser pane at **1080×1920**. `getAvailableQualityLevels()` returns `["hd1080","hd720","large","medium","small","auto"]`, so **`hd1080` is this clip's published ceiling**; it was pinned with `setPlaybackQualityRange` and re-confirmed (`getStatsForNerds().resolution` = `1080x1920@30`, codec `av01.0.08M.08`). `playbackRate` 1. `yt-dlp` and `ffmpeg` are both absent from this machine (checked, as the skill asks), so nothing was downloaded; every frame is a screenshot of the browser pane, **tab `tab-1`**, claimed with `tabs_create` and passed explicitly on every call. **No consent gate appeared.**

**Every figure below is an estimate from pixels**, and each carries its own error bar. **All medians quoted are plain medians and are named as such; every number carries its population and its frame.**

---

## 0. The answer first

### 0.1 — ⛔ **NO TAKE-OFF. FOURTH CLIP RUNNING, AND THIS ONE HAD THE BEST CHANCE YET**

Clips 18, 19 and 20 each reported no take-off. **This clip is a montage of ~10 separate rides and 37.5 s long — the largest number of ride *beginnings* the series has ever been handed — and not one of them shows a pop-up.** Every shot is cut in with the rider already standing.

**Population: ~200 sampled frames covering the whole 37.561 s**, at 0.5 s (0.05–35.58, three sheets of 24), at 0.25–0.35 s (2.6–19.65, 22.4–25.7, 27.4–31.6), at 0.10–0.15 s (0.05–1.35, 1.3–2.4, 21.3–22.4, 25.6–27.25, 31.6–32.9) and at the **native 1/30 s** grid (22.55–23.00, 23.00–23.50, 23.55–24.00). **In every frame in which the rider is in the water he is on his feet.** The opening second — the only place a pop-up could plausibly hide, because it is buried in spray — was sampled at **0.1 s from 0.0834 to 1.3834** and shows a **standing** rider throughout.

> ⚠️ **So the owner's own complaint — falling in the first second after standing — is still unaddressed by footage, twenty-one clips in.** The editors cut the paddling out. **This is now a property of the submitted corpus, not an accident of any one clip**, and it will not change by reading more highlight edits.

### 0.2 — ⭐⭐ **THE EVENT: A LOSS AND A RECOVERY, AND IT REFUTES THE RULE THE BRIEF CAME WITH**

The brief said: *"The rule they suggest — board still there ⇒ hands down; board gone ⇒ arms up — needs a third case either way."* **Here is the third case, and it is neither.**

| t (s) | what the body does | how it was obtained |
|---|---|---|
| **22.5500 → 22.6500** | **standing and trimming**, body near-upright, riding right along a green face toward a foam section | native 1/30 s sheet, 14 frames, 22.55–22.98 |
| **22.6833 → 22.7833** | **the fold begins** — he drops forward and the shoulders go over the nose | native 1/30 s sheet |
| **22.8167 → 22.9833** | **deeply folded over the deck**, both arms out, the board's tail lifting | native 1/30 s sheet |
| **23.1500** | ⭐ **body ROUGHLY HORIZONTAL, head-down and to the left, the board alongside/above him on his right** — head crown source y ≈ 716, face 908–978, torso 867–937, board 867–960 | ⭐ measured, 0.86× gridded frame, src(170,600) |
| **23.2834 → 23.4500** | **fully engulfed** — only the back and the hood are above the foam | native 1/30 s sheet, 23.00–23.50 |
| **23.5500 → 23.6833** | emerging, folded, **the red board is visible under him in every native frame from 23.55 on** | native 1/30 s sheet, 23.55–24.00 |
| **23.7500** | ⭐⭐ **one hand ~74 px ABOVE the near shoulder line, fingers spread, the head dropped to shoulder level; the other hand ~230 px BELOW it** | ⭐ measured, **1.4×** gridded frame, src(350,850) |
| **23.8834** | ⭐ **standing, bent at the waist, head up, board under him** | ⭐ measured, 0.86× gridded frame, src(120,760) |
| **23.9167 → 23.9833** | **upright and riding on** | native 1/30 s sheet |

**Two timings, both to ±0.017 s (one native frame):**

| quantity | this clip | clip 20 |
|---|---|---|
| first frame of the fold → standing again | **22.6833 → 23.8834 = 1.200 s** | 0.93 ± 0.06 s |
| lowest attitude → standing again | **23.1500 → 23.8834 = 0.733 s** | 0.48 s |

> ⭐ **Two instances now, on two riders, in two breaks, and they agree in shape: a lost stance in mid-ride costs about three quarters of a second to get back, and roughly a second from the moment it starts going.** That is the first number in the series with a population of two.

#### The refutation, measured

| t | magnification | near shoulder line (source y) | upper hand (source y) | **hand vs shoulder line** |
|---|---|---|---|---|
| **1.7167** — *a routine off-the-lip, no loss of any kind* | 0.86 | **679 ± 12** | **475 ± 10** | ⭐ **+204 px ABOVE** |
| **4.9167** — *a big bottom turn / carve* | 0.86 | **802 ± 12** (far shoulder 785) | **765 ± 12** | **+17 to +37, i.e. LEVEL** |
| **18.6500** — *trim* | 1.0 | **877 ± 8** | **945 ± 10** | **−70 BELOW** |
| **23.7500** — *the recovery* | 1.4 | **980 ± 10** | **906 ± 8** | ⭐ **+74 px ABOVE** (other hand −230) |
| **29.4500** — *trim, side-on* | 0.86 | **667 ± 12** | **940 ± 12** | **−273 BELOW** (other hand −256) |
| **30.5167** — *trim/stall, the clearest frame in the clip* | 0.86 | **590 ± 12** | **631 ± 12** | **−41 BELOW** (other hand −314) |

> ⭐⭐ **Six measured gridded frames, one rider, one session. The hand is above the shoulder line in 2 of 6 — and one of those two is a plain off-the-lip with nothing going wrong.**
>
> **So "arms up" is NOT a fall signature for this rider. It is his TURN signature.** Clip 19 read a wipeout as *"both arms thrown UP AND OUT"* and had no same-rider control for what his arms do when nothing is wrong. **This clip is that control, and it breaks the inference.** The strongest arm-overhead in the whole clip (+204 px, at **1.7167**) happens in the middle of a successful top turn.
>
> ⭐ **And the "board still there ⇒ hands down" half is refuted directly.** At **23.7500** the board is still under him — it is visible in all 13 native frames from 23.5500 to 23.9833 — and yet **one hand is 74 px above the shoulder line** while the other is 230 px below. Clip 20's rider, with his board also still there, **never reached his shoulder line with either hand**. Two riders, same situation, opposite arms.
>
> ⚠️ **The honest limit on this refutation: the two hands do different things in the same frame, so neither "up" nor "down" describes the rider.** The series has been asking a binary question of a two-armed animal. **Row 4 already says arm carriage is its own channel with a height AND a spread; this says it also has a LEFT and a RIGHT that disagree.**

#### ⚠️ What this clip CANNOT say about the loss, and the limit is hard

**Whether he ever came off the board is undecidable.** From **23.2834 to 23.4500** he is inside his own whitewater and only the back and hood are above it — the 0.86× frame at 23.35 shows foam and a hood and nothing else. At **23.1500** the board is clearly *beside and above* him and his legs are lost in foam. **So I cannot say his feet left the deck, and I cannot say they did not.** What is measurable is the body's attitude (horizontal, head-down) and that he is standing 0.73 s later.

### 0.3 — ⭐ **THE FEET: A FIFTH RIDER REPRODUCES 0.55–0.60, ON A COMPLETELY DIFFERENT BOARD**

Measured on the clip's single cleanest frame, **t = 30.5167**, at two magnifications that agree, each carrying its own source-coordinate grid, and **both containing the nose, the front foot and the rear leg's ankle in the same picture** (clip 20's rule):

| landmark | source position | from |
|---|---|---|
| **board nose tip** | **(149, 943) ± 15** | 0.86× frame, src(140,445), confirmed on its own 1:1 zoom |
| **front foot, centre of sole** | **(595, 1013) ± 25** (toes 549, heel 641) | **1.2×** frame, src(420,830) |
| **rear ankle / leash cuff** | **(925, 1026) ± 40** | 1.2× frame, src(420,830) |

Along the board's own axis (which runs 6.1° below horizontal in the image, so the correction is 0.6 %):

- nose → front foot = **451 px**
- nose → rear foot = **780 px**
- ⭐ **front ÷ rear = 0.58, range 0.55–0.61 over the stated errors**

> ⭐ **That is inside the series' 0.55–0.60 band, on a fifth rider, and on a board unlike any previously measured — a long red single-fin that he carries up the beach at the end, not a shortboard.** The band now rests on five riders and at least two board classes.
>
> ⚠️ **The rear figure is placed at the ANKLE, not the sole**, because the rear foot itself is inside the spray. That is why the error is ±40 px and why the band is quoted rather than a point value.
>
> ⛔ **The board-length fraction is NOT published**: the tail runs into whitewater in every frame examined, so there is no denominator.

**Zero foot slides, lifts or re-placements seen — twenty-one clips, still zero.** Feet were legible in **four measured gridded frames** (18.6500 front foot flat on the deck; 28.0167 front foot at the rail; 29.4500 both feet bare and planted; 30.5167 front foot flat, rear ankle fixed) and in the native sheets across the loss. **No frame in this clip was good enough to publish a *second* nose-ratio and test for a step**: a second attempt at **30.8167**, 0.3 s later in the same ride, failed because the rear foot is in spray — and the camera had zoomed out by a factor of **0.56** in those 0.3 s, which is exactly why only the scale-free ratio is quotable at all.

### 0.4 — ⛔ The gate refuses, **and for the first time the gate itself hits a limit**

**Board aspect = projected length ÷ projected width**, hand-measured on gridded frames:

| t | magnification | projected length | projected width | **aspect** |
|---|---|---|---|---|
| **23.1500** | 0.86 | **≥373 px** — (623,867) to (984,960) | **≈95 px** | **≥3.9** |
| **30.5167** | 0.86 / 0.30 | **≈830 px** — nose (149,943) to the red's end at ≈(960,1030) | **85 ± 20 px** | **≈9.8 (7.9–12.6)** |

> **The gate refuses at ≥2.2. Both frames are 2–5× past the line**, and no knee was examined.
>
> ⭐ **But the new gate has a precondition nobody has stated: it needs the WHOLE board.** In this clip the nose or the tail is inside spray, inside whitewater, or outside the frame in **every** frame examined, so both numbers above are **lower bounds on length and therefore lower bounds on aspect**. They still refuse, because the true aspect is nowhere near 2.2. **A clip whose board sat near the threshold would be undecidable by this gate**, and the series should say so before quoting it as "one frame each, far cheaper". **First time this limitation has been reached.**

### 0.5 — ⛔ **NO HORIZON ANYWHERE. Apparent stature is not licensed in this clip at all**

Two whole-frame checks at **0.30×** — **t = 18.6500** and **t = 30.5167**, the two clearest shots — show **water from the top edge to the bottom edge**. The camera is on the beach with a long lens, zoomed in hard, and the sea surface fills the frame. No sea/sky line, no masts, no fixed object.

> So **no elevation is checkable**, **apparent stature is dead here by the calibration's own rule** (its killer is the elevation *changing between frames*, and this lens pans and zooms continuously), and **no depth rung is named anywhere in this document.** Thirteenth clip running with no rung.

### 0.6 — ⭐ The frame grid: **30.000 fps exactly, not 29.97 — and the phase proves it**

Measured **twice, 25 s apart**, by seeking on a 0.005 s grid and hashing a 96×171 downsample:

| window | frame boundaries found |
|---|---|
| **5.000 → 5.120** (25 asks) | between **5.030/5.035**, **5.065/5.070**, **5.095/5.100** |
| **30.000 → 30.100** (21 asks) | between **30.030/30.035**, **30.065/30.070**, **30.095/30.100** |

> **The boundary phase is identical at t = 5 and t = 30.** On a 29.97 fps stream the two grids would have drifted **750 × (1/29.97 − 1/30) = 0.025 s** apart over that separation — five times the 0.005 s probe resolution, and plainly visible. **It is 30.000 fps.** Clip 20 measured a true 29.97 on the same platform, so **the series now has both**, and the skill's "five rates seen" becomes six. **Step used throughout: 1/30 = 0.03333, sampled mid-frame at `round(t·30)/30 + 0.0167`.**
>
> ✅ **The out-of-order probe passed**: 5.060 and 5.010 were re-asked in reverse order after the ascending sweep and both returned their original hashes. **No stale decode was detected in this session**, in contrast to clip 20's 1-in-25 at 30 fps.

### 0.7 — ⚠️ **ONE FINDING WAS WITHDRAWN BEFORE PUBLICATION: A RAISED BARE LIMB IS NOT NECESSARILY A HAND**

At **t = 22.9500**, early in the loss, a bare pale limb-end is thrown up and to the left, at source **(291–311, 762–802)** — well above anything else on the body. I had it written as a second instance of "hand above the shoulder line".

**At 1.4× it is undecidable.** The limb is thick, the end is a rounded blur with one notch, and **this rider surfs barefoot in a full wetsuit**, so a bare foot and a bare hand look the same at this resolution. The body at that instant is folded nearly double with the face at lower-right, which puts the *feet* in roughly the direction the limb points.

> ⛔ **Retracted. Nothing at 22.9500 is quoted as an arm position.**
>
> ☠️ **The rule this buys, and it is new: in a full wetsuit with bare extremities, "which limb is this" is itself a measurement, and it fails at the magnification where limb POSITION is already safe.** Clip 20 learned that magnification without context lies about *contact*; this says it also lies about *identity*. **A limb reading needs the joint chain back to the trunk in the same frame**, not just the extremity.

### 0.8 — The rider's size in source pixels, stated before anything was spent

| | |
|---|---|
| **Crown to deck, standing** | **431 px** at 18.6500 (crown y 765, deck at the front foot 1190) and **533 px** at 30.5167 (crown 480, deck 1013). **The two differ by 23 % because the lens zooms**, not because the rider changed |
| **Closest shot** | **27.4 → 28.5**: at 28.0167 the trunk and one thigh alone fill a **780 × 580** source window. The rider is the largest any clip in this series has delivered |
| **Head length (crown→chin)** | ⛔ **NOT PUBLISHED.** The rider has a full grey beard and the chin is not placeable on any frame. **Nothing in this document is quoted in head-lengths** |
| **Board** | **≈830 px** of visible length at 30.5167; the tail runs into whitewater, so that is a lower bound |
| **Camera** | from the beach, **side-on to behind**, **long lens**, **zooming and panning continuously and fast** (a factor of 0.56 in 0.3 s, measured at 30.52 → 30.82). **No horizon in any frame examined** |
| **Other people in shot** | ⚠️ **a second surfer's head and arm at upper right at 30.5167**, and paddlers in several shots. Recorded because the finders can lock onto them |

---

## 1. ⚠️ What this clip CANNOT touch, and why

| row | verdict | the reason, named |
|---|---|---|
| **10 — the two legs' split** | ⛔ **refused, thirteenth clip running** | §0.4. **Board aspect ≥3.9 and ≈9.8 against a gate of 2.2**, on two frames, without examining a knee. Row 10 stays at V8's one clip, two frames |
| **14 — where a rider lives on the ladder** | ⛔ **no rung named, thirteenth clip running** | No admissible leg chain (§0.4); **no horizon in the entire clip**, so apparent stature is unlicensed everywhere (§0.5), not merely in the passage that matters |
| **2 — trunk angular travel, gated** | ⛔ **no angle published** | The lens is long, continuously zooming and of unknown and changing elevation, and the board is never end-on. The calibration licenses a projected trunk angle only at a **level** lens with the board **end-on, per frame**, and this clip meets neither |
| **3 — the two channels** | ⚠️ **no transition classified** | Channel 1 (leg depth) has no admissible ruler; channel 2 (trunk) has no licensed angle. **Candidate windows exist and are explicitly NOT counted**, per the brief |
| **6 — pump cadence in trim** | ⛔ **no period published** | The long trim passage (16.15 → 21.3) is the best candidate, but the camera zooms through all of it and there is no horizon to fix heights against, so no rise-and-fall cycle can be measured across frames |
| **18 — head and gaze** | ⛔ **no angle, twenty-first clip running** | A **ninth** distinct cause: the rider has a **full grey beard and grey hair**, so neither chin nor hairline is placeable, and the head is frequently hooded or foam-covered |
| **13 — where the low sits in a turn** | ⛔ **not readable** | No rung anywhere, so there is no low to place |
| **11 — which channel leads down** | ⛔ **refused** | With no admissible leg channel and no licensed trunk angle, "legs" and "trunk" are not two measurable things here |
| **7 / 8 — beats and chaining** | ⚠️ **partly, and not quantified** | The clip is **full** of direction changes — the 0.25 s sheets show turns in nearly every shot — but it is a **montage with ~10 cuts**, so a chaining *rate* measured across it would be an editor's rate, not a surfer's. **No rate is published.** One turn's shape is described qualitatively in §3.2 |
| **16 — meeting whitewater** | ⚠️ **partly** | §3.3. **Two engulfments ridden out standing** (22.7–23.9, and 25.6–26.8 where he holds a deep fold through a foam section for ≈1.2 s). **No contact instant could be timed** — both contacts are inside his own spray |
| **19 — the loaded hand** | ⛔ **not resolvable** | At 23.8834 the lower hand is at source (690, 1248) and the board's deck at that x is at y ≈ 1318–1411, i.e. **70–160 px clear**. So the hand is *near* the deck and **not on it** in the one frame holding both. No weight-bearing hand is resolvable anywhere |

---

## 2. Method findings

### 2.1 — ✅ **A NEW CURE FOR THE STALE COMPOSITE, AND IT WORKED 6 TIMES OUT OF 6 WHERE CLIP 20's CURE FAILED**

Clip 20's remedy — *"issue a second `browser_batch` and read its last screenshot"* — **failed here on the first attempt**: two successive batches both returned the *previous* sheet, with the previous sheet's wall-clock stamp, while `window.__done` was already `true` and the canvas had already been resized and redrawn.

✅ **What worked, 6 of 6:**

```js
window.__C.style.transform = 'translateZ(0)';
window.__C.style.opacity   = (0.99 + Math.random() * 0.009).toFixed(4);
await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
await window.__nap(400);               // unclamped MessageChannel delay
```

**A changing `opacity` plus a compositing-layer promotion plus a double `requestAnimationFrame`** forces the pane to recomposite. It cured both failure modes seen here — the wholly-stale composite (2 cases) and the half-drawn sheet (3 of 16 batches, e.g. 3 of 16 tiles, 8 of 12 tiles). ⭐ **The footer stamp caught every one**; without it, three sheets would have been read as data.

### 2.2 — ☠️ **THE TAB'S RENDERER PROCESS DIED TWICE, AND IT LOOKS NOTHING LIKE THE THROTTLE**

Twice, after a long seek job, `computer{screenshot}` returned **"The tab's renderer process is not running"** and `javascript_tool` timed out at 45 s with the pane *displayed*. Clip 19's rule — *"a timeout with the last seek completed and the token set is a `document.hidden` throttle, not a runaway"* — **does not cover this**: here the token was *not* readable at all, because the renderer was gone.

✅ **The fix is one `navigate` to the same URL, followed by reinstalling the whole toolkit.** `navigate` with `force: true` was *refused* the first time and the plain `navigate` succeeded on the next call. **Budget for a full re-boot of the measurement toolkit as a routine event on a 37 s clip**: the two crashes cost about five round trips each.

⚠️ **And after one re-navigation the pane reported "since an earlier tool call on this tab, the user clicked or pressed keys in this page."** The viewport emulation and the quality pin both had to be set again; the pause had to be re-applied.

### 2.3 — ☠️☠️ **THE VIEWPORT EMULATION WAS SILENTLY RESET MID-SESSION AND A MEASUREMENT FRAME CAME BACK AT 1.6× — THE SOURCE GRID IS WHAT SAVED IT**

One measurement screenshot returned **800×1205** instead of 800×640, with the canvas rendered at **1.607× its CSS size**: grid labels 50 source px apart landed **112 screenshot px** apart on a 1.4× canvas, where 70 was expected.

> ⭐ **The frame was still readable, because every measurement frame in this document carries its own source-coordinate grid and every landmark was read off the grid labels, never off an assumed canvas scale.** Clip 12's rule — *"the scale is not stable within a session; self-calibrate every frame"* — is confirmed for the **third** time, and this is the first instance where the *screenshot* scale, not the canvas scale, was the thing that moved.

**Guard adopted: re-issue `resize_window` before every measurement frame, and verify the grid spacing in the returned image before reading any landmark.**

### 2.4 — ⛔ **TWO AUTOMATED FINDERS BUILT, ONE DISCARDED**

| tool | verdict |
|---|---|
| **dark-wetsuit finder** (largest 22×28 box of pixels with R+G+B < 210 on a 96×171 downsample) | ⛔ **DISCARDED.** It locked onto the **dark green face of the wave** at 28.0167 and returned (799,1168) — the open water — producing a measurement frame containing nothing but water. **A black wetsuit against a *dark* wave face is not separable by luminance**, and three of this clip's shots have exactly that. Nothing from it is quoted |
| **red-board finder** (R>100, R−G>35, R−B>30, bounding box + centroid) | ✅ **KEPT**, with a caveat. It located the board in 20 of 20 frames tried, and its bounding box flagged the near-vertical board at 1.72 (bbox 259 wide × 472 tall) before any frame was spent. ⚠️ **But its bbox over-reaches**: at 29.45 it returned x 439–900 where the visible board ran only 671–938, because foam picks up a pink cast. **Use it to centre a crop, never to measure the board** |
| **the unclamped `MessageChannel` delay** (clip 20) | ✅ **kept and confirmed**, including through a period when the pane was hidden and every seek cost ≈1.5 s |
| **background-job + poll runner** (clip 20) | ✅ **kept and confirmed.** The one time a poll loop was written as `for(...) await setTimeout(800)` inside the measuring call it blew the 45 s ceiling; written as a short poll that returns immediately, nothing timed out |

**Two built, one discarded, one kept with a stated bound** — and **the discarded one would have corrupted a measurement frame, not just wasted a seek.**

### 2.5 — ⚠️ Cut detection was attempted and is reported as a weak null

A top-third histogram detector was run over the whole clip at **0.2 s, 187 differences**. **Plain median 3618, 90th percentile 10228, max 29238.** Only three differences stand clear of the noise: **14.28, 24.28 and 32.88** — and 32.88 is the cut to the beach. **The camera's own panning and zooming produces differences of the same size as a cut between two shots of the same surfer on the same beach in the same light**, which is precisely the blindness the skill warns about.

> **So the shot boundaries below are read from the 0.25–0.5 s sheets by eye and are approximate.** The clip is described as *"a montage of roughly ten shots"*, never as a specific number. **What IS settled, at the native 1/30 s grid, is that 22.55–24.00 is one continuous shot**: 42 consecutive native frames, all distinct hashes, smooth progression, same rider, board, wave and light. **The loss and the recovery are one unbroken take.**

---

## 3. What the body does

### 3.1 — The clip's structure, as read

| window | what it is |
|---|---|
| **0.00 → 2.5** | heavy whitewater, rider standing inside spray; at **1.6–1.8** a **near-vertical board** on a top turn |
| **2.5 → 6.5** | a green wall; **a big bottom turn / carve at 4.6–5.6** with the lead arm thrown out |
| **6.5 → 14.3** | several shots of turns, two with the board up on the lip (9.4–9.9, 12.1–12.4) |
| **14.3 → 16.1** | cut; a bluer, cleaner wave |
| **16.1 → 21.3** | ⭐ **the longest unbroken trim in the clip** — the rider stands tall and runs along an unbroken wall for ~5 s with few direction changes |
| **21.3 → 22.6** | low crouches through a steepening section |
| **22.6 → 24.3** | ⭐⭐ **the loss and the recovery** (§0.2) |
| **24.3 → 26.8** | ⭐ a deep, **held** fold through a foam section (§3.3) |
| **26.8 → 32.7** | several shots of clean turns, the closest framing in the clip (27.4–28.5) |
| **32.75 → 37.5** | **the beach**: the surfer walks out of the water carrying a long red board |

### 3.2 — ⭐ The one turn worth describing, at 1.3 → 2.4 (0.1 s sheet, 12 frames)

**Entry (1.31–1.42):** low over the board, moving up the face. **Load (1.42–1.62):** the board swings nose-up and the whole rider goes with it; the board reaches **near-vertical in the image**. **Peak (1.72):** ⭐ **one arm thrown STRAIGHT OVERHEAD**, hand 204 px above the shoulder line — the single highest arm in the clip. **Exit (1.82–2.42):** the board comes down and he rides away on the face, the arm dropping.

> ⭐ **The peak of this turn is marked by an ARM, not by a hip** — which is exactly what **V8 T3** said about its bottom-turn-to-top-turn (*"the peak is marked by an arm, not a hip"*). **Second clip, second rider, same observation.**
>
> ⛔ **No beat durations are published.** The window was sampled at 0.1 s, and the board is in spray at the instants that would define "rail set", so the three-digit timings V8 and V9 published are not reproducible here.

### 3.3 — ⭐ Meeting whitewater: **two engulfments, both ridden out standing, and the posture is a deep FOLD**

| window | what happens |
|---|---|
| **22.68 → 23.92** | the fold goes too far and becomes the loss of §0.2 — **ridden out** |
| **25.60 → 26.80** | ⭐ **a deep forward fold HELD through a foam section for ≈1.2 s** — the rider's back is horizontal, head low, both hands down toward the rails, and he comes out the other side still standing. 9 frames at 0.15 s |
| **31.60 → 32.68** | a third, shallower version on a small wave — folded forward, hands reaching down, ≈1.1 s. 9 frames at 0.12 s |

> **Three separate foam encounters, three times the same answer: fold the trunk hard forward, drop both hands toward the deck or rails, keep the feet where they are.** That is row 16's "brace", reproduced three times in one clip where the series previously had **one frame, in V6, marked SINGLE**.
>
> ⛔ **No contact instant could be timed** in any of the three — the foam arrives inside the rider's own spray — so **this is not an anticipation measurement.** It is a posture count.
>
> ⚠️ **And it sits uneasily beside §0.2.** The 22.68 fold *looks like* the 25.60 fold in its first 0.2 s and then becomes a wipeout-that-was-saved. **The brace posture and the beginning of the loss are the same movement**, which may be why the owner's rider "falls without warning": in the footage there is no warning either, only an outcome.

### 3.4 — ⭐ The arms are the channel this clip moves

Beyond §0.2's six-frame table, the measured frames show **four distinct arm carriages inside what is otherwise ordinary riding**:

| carriage | measured instance |
|---|---|
| **one arm straight overhead, the other low** | 1.7167 (+204 / —) |
| **lead arm extended horizontally at shoulder height, rear arm low** | 4.9167 (+17…+37 / −338) |
| **both hands low over the deck, inside the rails, trunk folded** | 18.6500 (−70 / −150), 29.4500 (−273 / −256), 30.5167 (−41 / −314) |
| **one hand above the shoulder, one near the deck** | 23.7500 (+74 / −230) |

> ⭐ **"Both hands carried low over the deck with the trunk folded" (row 15) is this clip's most common carriage**, as it was in V7, V8 and V9. **Fourth clip.**
>
> ⭐ **And at 30.5167 the two hands are 273 px apart vertically in a frame where the rider is simply trimming.** Row 4's "the arms are their own channel" is confirmed again; **row 4's "one scalar with no left/right" is the specific thing this frame breaks.**

---

## 4. What could not be seen

- **No horizon in any frame examined** (two whole-frame checks at 0.30×). The lens is long, from the beach, and zooms continuously and fast — a factor of **0.56 in 0.3 s**, measured. **Every absolute pixel length in this document is therefore valid only within its own frame**; the only cross-frame quantities quoted are **signs** (above/below the shoulder line) and **ratios** (front ÷ rear from the nose).
- **The board's tail and often its nose are inside spray or outside the frame**, in every frame examined. No board length, no board-length fraction, no exact aspect.
- **The rider is engulfed from 23.28 to 23.45**, which is the middle of the only event in the clip.
- **No chin and no hairline**: full grey beard and grey hair. No head-lengths, no gaze.
- **It is a montage**, so no ride is followed from start to finish except the one at 22.55–24.30, and even that one is cut in mid-ride.
- **Resolution was never the binding constraint.** At 1080×1920 the rider is 430–530 px crown-to-deck in the mid shots and far larger in the close ones. **What refused every angle was the camera's bearing and the spray, exactly as the brief predicted** — and the clothing clause is irrelevant here because the rider is in a full wetsuit with bare feet and hands, which is the *worst* combination for telling one bare limb from another (§0.7).

---

## 5. The rows this clip moves, and how

| row | moves? | how |
|---|---|---|
| **17 — the feet never move** | ⭐⭐ **STRENGTHENED** | **front ÷ rear from the nose = 0.58 (0.55–0.61)** on a **fifth rider** and a **long single-fin**, measured on a frame containing the nose, the front sole and the rear ankle together. **Zero slides, lifts or re-placements in 21 clips.** The row's "already correct" verdict stands |
| **4 — arm carriage is its own channel** | ⭐⭐ **STRENGTHENED, and sharpened** | **Six measured frames, one rider, one session: the upper hand runs from 204 px above the shoulder line to 273 px below it.** And at 23.7500 and 30.5167 the two hands disagree *within one frame* by 230 and 273 px. **The game's one scalar `HumanBalance.arms` cannot express either the range or the left/right disagreement** |
| **16 — meeting whitewater** | ⭐ **STRENGTHENED from SINGLE to a count of 3** | Three foam encounters in one clip, all ridden out standing, all answered by the same posture: **trunk folded hard forward, both hands down toward the deck/rails, feet unmoved.** V6's single frame now has company |
| **15 — both hands low over the deck** | ⭐ **STRENGTHENED** | The clip's most common carriage, measured on three gridded frames. **Fourth clip** |
| **the fall/recovery evidence (no row yet)** | ⭐⭐ **A SECOND INSTANCE, AND THE RULE IS BROKEN** | **1.200 s** fold-to-standing, **0.733 s** lowest-to-standing, at the native 1/30 s grid, in one unbroken 42-frame take. And the brief's proposed rule is refuted: the board stayed under him *and* one hand went above the shoulder line. **The engine has two states, riding and fallen; two clips now show a third** |
| **5 — the arm leads the rail** | ⚠️ **TOUCHED, NOT MEASURED** | The peak of the 1.3–2.4 turn is marked by the arm, not the hip — agreeing with V8 T3 on a second rider. **No lead time is published**: the board is in spray at the instant the rail is set |
| **7 / 8 — beats and chaining** | ⛔ **CANNOT TOUCH** | It is a montage; a chaining rate measured across it would be the editor's. No beat durations: 0.1 s sampling and spray |
| **2, 3, 6, 11, 13, 14, 18** | ⛔ **CANNOT TOUCH** | No horizon anywhere ⇒ apparent stature unlicensed; board never end-on ⇒ leg chain and projected trunk angle both refused; long zooming lens of unknown elevation ⇒ no cross-frame heights. **No depth rung is named anywhere in this document** |
| **10 — the two legs' split** | ⛔ **CANNOT TOUCH** | Board aspect ≥3.9 and ≈9.8 against a gate of 2.2 |
| **9, 12, 19** | ⛔ **CANNOT TOUCH** | No hip landmark (full wetsuit, no waistband); no depth rung, so no hold to time; the one frame holding hand and board together shows the hand 70–160 px clear of the deck |

### What this clip says against the brief it was given

1. ⭐⭐ **"Board still there ⇒ hands down; board gone ⇒ arms up" is dead as a rule.** Third case: board still there, **one hand up and one hand down**. The question was binary; the rider is not.
2. ⭐⭐ **Clip 19's "arms up and out" had no control, and this clip is the control.** The same rider's highest arm of the whole clip is in a **successful off-the-lip**, not in a fall. **An arm position measured only during falls cannot be a fall signature.**
3. ⭐ **The board-aspect gate needs the whole board, and this clip never shows one.** It still refuses, by a wide margin — but the gate's advertised cheapness assumes a precondition that four of the last five clips happened to meet and this one does not.
4. ⚠️ **"Twenty clips say angles are not in there" is confirmed, but the cause list grows again.** Here it is **no horizon in the entire clip** plus a lens that zooms by 44 % in 0.3 s — not bearing, not clothing, not resolution. **Tenth distinct cause.**
5. ⭐ **The brief hoped a take-off might be in this clip. The right conclusion is stronger and worse: the submitted corpus is highlight edits, and highlight edits cut the paddling.** Twenty-one clips, ~10 ride-starts in this one alone, zero pop-ups. **Asking for another clip of the same kind will not produce one; the ask has to change to raw or unedited footage.**
6. ⭐ **And one methodological refutation of the skill's own stable: a limb's IDENTITY can fail where its POSITION is already safe.** A bare foot and a bare hand at 1.4× on a wetsuited rider are the same blur, and the series' habit of reading "the hand" off an extremity needs the joint chain back to the trunk in the same frame.
