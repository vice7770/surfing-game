# Video reference 23 (Mikey February, *SHORTYHEAD*, @cisurfboards): **the first clip in the series whose SLOW MOTION could be measured directly — two speed-ramped passages found by pixel-identical duplicate frames — and the first whose LENS HEIGHT was measured against a real horizon rather than inferred from its absence**

Source: **https://www.youtube.com/shorts/4cd6S0rD9pE**, title *"Mikey February as seen in his new film SHORTYHEAD"*, channel **`@cisurfboards`** (`getVideoData().author` = "CI Surfboards"). Length **18.901 s**, read in full. The **twenty-third** reference the owner has sent, registered as #23 in `CLIP-REGISTRY.md`.

> ⚠️ **SAME RIDER AND SAME FILM AS CLIP 15, DIFFERENT UPLOAD, AND — on the evidence below — A DIFFERENT RIDE.** Clip 15 (`3yxY-F_AEds`) is *"Mikey February as seen in SHORTYHEAD"*. **The registry's duplicate check is by YouTube ID, and an ID check cannot catch a second upload of the same source film.** §0.9 states the test that separated them and what it cannot rule out.

Delivered to the browser pane at **1080×1440** — a **3:4 stream inside a 9:16 Short**, the same aspect clip 15 recorded. `getAvailableQualityLevels()` returns `["hd1080","hd720","large","medium","small","auto"]`, so **`hd1080` is this clip's published ceiling**; `getStatsForNerds().resolution` reported `1080x1440@25`, codec `av01.0.08M.08`, `playbackRate` 1. ⛔ **`setPlaybackQualityRange` was NOT attempted** — clip 22 found it kills a Short's stream outright, and the pane already served 1080 after *enlarge-the-viewport-and-reload*. **No consent gate appeared.** `yt-dlp` and `ffmpeg` are both absent from this machine (checked), so nothing was downloaded; every frame is a screenshot of the browser pane.

**Tab: `tab-3` throughout**, claimed with `tabs_create` and passed explicitly on every `navigate`, `javascript_tool` and `computer` call. The tab held this clip and no other at all times. The pane was **shown**, not hidden, for every screenshot (`document.hidden` was stamped into every rendered frame and read `false` on all of them).

**Every figure below is an estimate from pixels**, and each carries its own error bar. **All medians are plain medians and are named as such; every number carries its population and its frame.**

---

## 0. The answer first

### 0.1 — ⛔ **NO TAKE-OFF. The clip begins with the rider already standing, and it is not an edit artefact**

At **t = 0.0000**, the first frame of the file, measured on a gridded crop at **1.99 image px per source px** (scale re-derived from the printed grid labels, §2.5), the rider is **already on his feet**: knees bent, trunk folded forward, one arm out level with the shoulder line and the other low, both feet on a tan-yellow deck, a white wake off the board. **Twenty-three clips, zero pop-ups.**

> ⭐ **And this clip sharpens clip 22's correction one notch further.** Clip 21 asked for *raw footage*; clip 22 showed raw is not enough because a raw take can be **trimmed** to start after the rider stands. **This clip is a third variant: it is not one continuous take trimmed late — it is a single continuous take whose wave was already underway when the file begins, with a broken wave in the foreground and the rider mid-drive.** The ask that would actually work is unchanged and is now three-times-confirmed: **footage that STARTS BEFORE THE RIDER IS ON HIS FEET.** Nothing weaker has produced one in twenty-three tries.

### 0.2 — ⭐⭐ **THE HEADLINE: THE CLIP CONTAINS TWO SLOW-MOTION PASSAGES, AND THEY WERE FOUND BY PIXEL-IDENTICAL DUPLICATE FRAMES**

**A full native-grid scan: 473 asks at exactly 1/25 s from 0.0000 to 18.8800, every frame hashed.** 462 unique hashes, **11 adjacent duplicates**, and the duplicates are not scattered — they are **exactly periodic inside two windows and absent everywhere else**:

| window | duplicates | period | **unique pictures per second** | what the timeline says |
|---|---|---|---|---|
| 0.00 → 7.96 | **0** | — | **25.00** | real time |
| **8.00 → 8.40** | **5** (8.04, 8.12, 8.20, 8.28, 8.36) | **every 2nd frame** | **12.50** | **0.40 s of timeline carries 0.20 s of pictures** |
| 8.44 → 16.00 | **0** | — | **25.00** | real time |
| **16.04 → 16.76** | **5** (16.08, 16.24, 16.40, 16.56, 16.72) | **every 4th frame** | **18.75** | **0.72 s of timeline carries 0.54 s of pictures** |
| 16.80 → 18.84 | **0** | — | **25.00** | real time |

**The duplicates are pixel-identical, not hash collisions.** Mean absolute RGB difference on a 270×360 downsample: **8.00 vs 8.04 = 0.0000** and **16.20 vs 16.24 = 0.0000**, against **12.86** for 8.04 vs 8.08, **24.59** for 16.24 vs 16.28 and **10.21** for a control pair at 1.00 vs 1.04. Each duplicate pair was re-asked **in two different orders** and returned the same picture both times, and its neighbours differed — so this is content, not a decode failure.

> ⭐⭐ **The series has asked on every clip "find the slow-motion factor or say you could not", and until now the answer came from duration-and-blur arguments. This is a direct measurement, and it is cheap: hash every native frame and look for exact duplicates.** A duplicated frame can only mean the timeline carries fewer unique pictures than it has slots — which is what frame-duplication slow motion is.
>
> ⚠️ **What it does NOT settle** is whether the editor slowed the shot or the camera's rate dipped. Either way the consequence is the same and it is the one that matters: **no duration measured inside 8.00–8.40 or 16.04–16.76 is real time**, and the second of those windows is exactly where this clip's one event happens (§0.4). **Every other duration in this document is in windows measured at a clean 25 unique fps.**
>
> ⚠️ **And it bounds the method, too: a ramp built by frame BLENDING, or a true high-rate camera slowed, leaves no duplicates and this test is blind to it.** A clean scan means *no duplication-based ramp*, not *no slow motion*.

**The container itself is a true 25.000 fps**, measured at three epochs 17 s apart by seeking a fine grid and hashing: boundaries at **1.0400 / 1.0800 / 1.1200** (0.005 s probe), **16.0000 / 16.0400 / 16.0825** and **18.0000 / 18.0400** (0.0025 s probe). At 24 fps the predicted boundaries near t = 16 and t = 18 are 16.0417, 16.0833 and 18.0417 — **outside every measured bracket, in the same direction each time.** The series' rate list stays at six (60, 59.94, 30.000, 29.97, 25, 24); **this is the second clip measured at 25.**

### 0.3 — ⭐⭐ **THE LENS IS ABOVE THE RIDER — MEASURED, FOR THE FIRST TIME IN THE SERIES, AGAINST A REAL SEA HORIZON**

Fourteen-plus clips have refused depth with the sentence *"no horizon, so apparent stature is unlicensed"*. **This clip has a horizon** — a dead-straight sky/sea line spanning the whole frame, visible by eye in every frame examined between **15.60 and 16.76**, where the camera is looking out over flat water rather than into a wave face.

Hand-measured on a gridded whole frame at **t = 16.2000**, scale re-derived from the grid at **0.536 px/src**:

| | source row |
|---|---|
| **sea horizon** | **y ≈ 147 ± 6** |
| rider's **crown** | y ≈ 287 ± 8 |
| rider's **feet on the deck** | y ≈ 601 ± 10 |

> ⭐ **The horizon sits ~140 src px ABOVE his crown, on a rider who is ~314 px from crown to sole in the same frame.** For a pinhole lens the vertical image offset of two points at the same distance is proportional to their height difference, so **the lens sits about 0.45 rider-heights above his head — ≈1.45 rider-heights above the water surface he is standing on, i.e. roughly 2.5–2.7 m if he is 1.75–1.85 m.** It is a long lens from the beach, panning and zooming.
>
> ⛔ **So apparent stature in head-lengths is NOT licensed here, and no depth rung is named anywhere in this document — fifteenth clip running.** The difference is that **this time the refusal is a measurement, not an absence.**
>
> ⭐ **And the clip demonstrates the mechanism the refusal rests on.** Apparent stature (crown-to-sole ÷ head length) read **7.3 head-lengths at t = 3.0000 while the trunk was folded about 53° from vertical** (§3.2). A standing human is ~7.7. **A 53° fold cannot leave a rider at 95 % of standing height in front of a level lens; it can in front of a raised one, because the fold translates him across the image instead of shrinking him.** Clip 10 inferred this from a drone; here it is visible with the lens height measured.

### 0.4 — ⭐ **THE EVENT: NOT A FALL AND NOT A RECOVERY — HE IS SWALLOWED STANDING, AND THE CAMERA NEVER GETS HIM BACK**

Read at the native 1/25 s grid from 16.60 to 17.04 (12 consecutive frames, whole frames), with **t = 16.7200 re-measured on a gridded crop at 2.00 px/src**:

| t | what the body does |
|---|---|
| **16.60 → 16.76** | **standing upright**, trunk near-vertical, head up and clear, both hands **below** the shoulder line, the board's nose visible ahead of him, whitewater rising around the board |
| **16.80** | foam to his chest; still upright, still head-up |
| **16.84 → 16.88** | only head and shoulders above an exploding whitewater mass |
| **16.92 → 17.00** | a dark head-sized shape at the top of the spray, shrinking |
| **17.04 → 18.84** | ⛔ **no rider anywhere in the frame.** The redness finder scores **0 on every one of the 19 frames** sampled at 0.1 s from 17.0 to 18.8, and whole frames at 0.2 s show nothing but whitewater |

**Measured at t = 16.7200 (2.00 px/src, grid-derived):** crown src y 197.5, chin 242.5 (**head 45 px**), shoulder line 251 ± 5, **both hands below it (−64 and −41 src px)**, trunk tilted about **14°** from vertical *in the image plane* — near-upright. He is seen from behind.

> ⭐⭐ **This is a third kind of ending for the series, and a third answer to row 16.** Clip 22 established two: the **forward brace** (trunk folded hard, hands down) when *driving through* foam, and the **lean-back layback** when *hitting* it. **Here a section breaks onto him from below and behind and he meets it STANDING TALL, trunk near-vertical, hands low, head up — and he does not survive it on camera.**
>
> ⛔ **I do not classify it as a wipeout.** Nothing in the clip shows him separating from the board, and nothing shows him riding out either; the camera simply loses him inside the foam and the clip ends 1.9 s later still pointed at the whitewater. **"Swallowed, outcome not shown" is the honest label**, and it is the first time the series has had one.
>
> ⛔ **No recovery duration is published, and this clip adds no instance to the 0.433 / 0.48 / 0.733 s set.** The brief is right that the duration cannot separate a save from a trick; this clip cannot even separate an ending from an occlusion.
>
> ⚠️ **And the whole approach runs inside the 16.04–16.76 speed ramp (§0.2).** The 0.16 s from "foam at the board" to "foam at the chest" is **0.12 s of real time** if the ramp is an editor's. Any attempt to time this contact would have been wrong by a third.

### 0.5 — ⛔ **THE FEET: FOUR FRAMES ATTEMPTED, NO RATIO PUBLISHED — AND A NEW ADMISSIBILITY TEST THAT KILLED MY OWN BEST READING**

| t | what it offered | verdict |
|---|---|---|
| **5.0000** | the whole board, both ends clear, **three fins visible** | ⛔ **the board's BOTTOM faces the lens, so the feet are on the far side and cannot be seen at all** |
| **3.0000** | deck to the lens, nose clear, both lower legs visible at 2.00 px/src | ⛔ **the two "feet" came out 18 src px apart on a board ≥207 px long — 0.09 L** |
| **7.2000** | deck to the lens, a tapered nose, both legs | ⛔ **30 src px apart on a board ≥243 px long — 0.12 L** |
| **11.6000** | the largest rider in the clip (232 px crown-to-sole) | ⛔ **both feet inside his own spray** |

> ⭐ **The new test, and it is what refused two of these frames.** A surfer's stance spans roughly **0.25–0.35 of the board's length** (≈55–65 cm on a 1.8 m board). **If the two "feet" you have placed are much closer than that, you have not found two feet — you have found one foot and a piece of the other leg.** My 3.0000 reading implies a stance 0.09 L wide (≈16 cm) and my 7.2000 reading 0.12 L (≈22 cm); **both are anatomically impossible and both are refused by their own arithmetic before any ratio is computed.**
>
> **This is the foot-measurement analogue of clip 12's thigh/shin gate, it needs no nose landmark, and it is cheap.** It should gate every foot reading in the series from now on. ⚠️ **I note without being able to test it that clip 22's two attempts imply stance spans of about 0.17 L and 0.19 L** (from its own published nose and foot positions) — **below this gate, and on the side that says "one foot and a shin".** That is a reason to look again at the 0.55–0.60 band, not a refutation of it.
>
> ⭐ **But the series finally gets a NOSE identified by something other than the direction of travel.** At **t = 5.0000** (1.66 px/src) the board's **bottom** faces the lens and **three dark fin shapes sit in a cluster near its lower-left end**. The tail is therefore the lower-left end and the nose the upper-right one, **established by the fins alone, with no assumption about which way he is going**. The two picture-based direction routes agree with it. **Every future read should say which of these two routes it used; "the pointed end" is not a route, because both ends of a modern shortboard taper.**
>
> ⚠️ **No foot slide, lift or re-placement was seen in any frame examined — and that is not evidence for row 17 here**, because this clip could not resolve the two feet apart at all.

### 0.6 — ⭐⭐ **THE GATE: THE WHOLE BOARD IS IN FRAME AT t = 5.0000 — WHICH REFUTES THE BRIEF — AND THE GATE REFUSES ANYWAY**

**Board aspect = projected length ÷ projected width**, hand-measured on gridded frames, no body landmark:

| t | projected length | perpendicular width | **aspect** | whole board in frame? |
|---|---|---|---|---|
| **5.0000** | **194.6 px** (tail 408,681 → nose 577,584) | **≈23.5 px** | **8.3** | ⭐ **YES — both ends clear of water, fins visible** |
| **3.0000** | ≥207 px | ≈11 px | **≥18.8** | ⛔ no — one end in foam |
| **7.2000** | ≥243 px | ≈20 px | **≥12** | ⛔ no — one end in foam |
| **0.0000** | ≥157 px | ≈12 px | **≥13** | ⛔ no — one end in foam |
| **16.2000** | ≥123 px | ≈20 px | **≥6** | ⛔ no — one end in spray |

> ⛔ **The gate refuses at ≥2.2 and all five frames are 3–9× past it. No knee was examined; no leg chain, no flexion, no depth rung.** Fifteenth clip running.
>
> ⭐⭐ **But clip 21's and clip 22's precondition claim is REFUTED: "a beach shot does not produce a whole board" is wrong.** This is a beach shot with a long lens, and **t = 5.0000 holds the entire board with both ends clear of water.** Two clips in a row without one was a sampling accident, not a property of the shot type.
>
> ⭐ **And having the whole board makes the refusal cleaner than it has ever been.** On the other four frames the aspect is a *lower bound* and someone could argue the missing end would have changed it. On 5.0000 it is a *measurement*: **8.3, against a true board aspect of about 3.8** — the excess is roll, and it checks out, because a board rolled ~60° onto its rail projects its width by cos 60°. **The board is broadside AND on its rail, which is exactly the geometry V9 named as the cause of leg-chain saturation.**
>
> ✅ **An internal consistency check the whole board allows:** 194.6 px of board at a real 1.8 m gives **108 px/m**, and the rider measures **184 px crown-to-sole in the same frame = 1.70 m with his knees bent.** The two scales agree within a few per cent. **Nothing in this document depends on it; it is offered because the series has never had a frame where it could be done.**

### 0.7 — ⭐ **THE ARMS: LEFT AND RIGHT MEASURED SEPARATELY ON FIVE FRAMES — AND THE "FRACTION OF STATURE" FRAMING IS REFUTED**

Hand height against the **near shoulder line**, **left and right separately**, on gridded frames each carrying its own source grid and its own re-derived scale:

| t | px/src | shoulder line (src y) | hand A (src y) | hand B (src y) | **A vs line** | **B vs line** | what he is doing |
|---|---|---|---|---|---|---|---|
| **0.0000** | 1.99 / 3.07 | 881 ± 6 | 885 ± 8 | 943 ± 10 | **−4 (level)** | −62 | driving, trunk folded |
| **3.0000** | 2.00 | 805.5 ± 5 | 863.5 ± 6 | 853.5 ± 8 | −58 | −48 | trim, trunk folded ~53° |
| **5.0000** | 1.66 | 500 ± 6 | 446 ± 8 | 587 ± 10 | ⭐ **+54 ABOVE** (and **15 px above the crown**) | −87 | **a turn — board rolled onto its rail, fins to the lens** |
| **11.6000** | 1.90 | 874 ± 6 | 1014 ± 8 | 958 ± 12 | −140 | −84 | driving through broken water, trunk folded ~38° |
| **16.7200** | 2.00 | 251 ± 5 | 315 ± 8 | 292 ± 12 | −64 | −41 | **standing upright, being engulfed** |

Every arm was traced **back to the trunk through its own joint chain in the same frame** (shoulder → elbow → hand), as clip 21's withdrawn limb requires. Arm B at 11.6000 and 16.7200 runs partly against dark shorts or spray and is marked medium confidence.

> ⭐ **"Arms up is a turn signature" survives, small-n:** the one frame with a hand above the shoulder line — **above the crown, in fact** — is the one frame where the board is demonstrably rolled onto its rail. The four frames with both hands low are trim, two drives and the engulfment. **1 of 1 turns up, 0 of 4 non-turns up.** A seventh rider, and no fall in the clip to confound it.
>
> ⚠️ **But it also hands clip 15's separator a counter-instance.** Clip 15 found all its arm leads at **the top of the wave** and all its clean misses at **the bottom**. **t = 5.0000 is a drive off the bottom with the board on its rail and a hand above the crown**, and **t = 9.2000 is a second rolled-rail turn with no hand above the shoulder line at all.** Top-versus-bottom is not a rule in this clip either.
>
> ⭐⭐ **THE REFUTATION: "7–27 % on one rider, 43–63 % on another" is a per-MOMENT quantity, not a per-rider one.** The two hands disagree in **5 of 5 frames where both were readable** — by **58, 10, 141, 56 and 23 src px** — and expressed as a fraction of crown-to-sole **in the same frame** that is **54 %, 4.3 %, 77 %, 24 % and (unmeasurable, he is buried)**. ⭐ **One rider, one ride, spanning 4 % to 77 % — wider than the two bands the brief treats as rider-specific, and straddling both.** **What reproduces is "never zero". The magnitude is a fact about what the body is doing at that instant and should not be banded by rider.**

### 0.8 — One unbroken shot, 0.0000 → ≈18.84, and a 1.2 s occlusion that is not a cut

| route | result |
|---|---|
| **whole-frame luminance correlation**, 236 consecutive steps at 0.08 s over the whole clip | **minimum r = 0.5828, plain median r = 0.8836, no step below 0.58.** The 18 steps under 0.75 are all inside 15.36–17.52, where an exploding whitewater mass fills the frame, plus two at 18.64–18.72 |
| **rider-blob continuity**, 148 consecutive steps at 0.1 s where the finder scored | **plain median displacement 43 px, 90th percentile 139 px.** The two steps over 400 px (12.2 and 15.9) are both frames where the finder locked onto a **paddler** |
| **eye**, on 24 + 12 + 12 + 12 + 9 survey tiles and 10 gridded frames | one rider, one board, one continuous pan along one beach; the backdrop never jumps |
| **session-wide hash check**, 473 native frames + ~600 probe frames | **zero frames repeated at a distant time.** No cut shows as a repeat either |

> ⚠️ **One passage needed checking and it is not a cut: from ≈14.6 to ≈15.8 the rider is not visible at all** (redness score 0 on 12 consecutive 0.1 s samples). Whole frames at 0.2 s across 14.40–16.00 show **the same wave rolling continuously toward the camera with the rider behind its crest** — he reappears at 15.9 on the same board in the same shirt. **He is occluded by the wave for ~1.2 s; the correlation across the window never drops below 0.73.**
>
> ⛔ **The last distinct picture is at t = 18.84.** Asks at 18.86, 18.88 and 18.90 all return it, so **the legible clip is 0.0000 → 18.84** of a stated 18.901. This is clip 22's "the last ~0.06 s never decodes", reproduced on a second clip and a second frame rate.

### 0.9 — ⚠️ **THE REGISTRY PROBLEM: AN ID CHECK CANNOT CATCH A RE-UPLOAD, AND THIS IS ONE**

Clip 15 is *"Mikey February as seen in SHORTYHEAD"* (`3yxY-F_AEds`, 22.661 s, 1080×1440, 25 fps). This clip is *"Mikey February as seen in his new film SHORTYHEAD"* (`4cd6S0rD9pE`, 18.901 s, 1080×1440, 25 fps), **posted by the board brand's own channel.** Same rider, same film, same stream geometry, same frame rate. **The registry's `grep` on the ID returns zero and would have let this through as new even if it were frame-for-frame identical.**

**Is it the same ride?** Clip 15's shot B is a single 18.56 s ride (4.10 → 22.66) — within 0.35 s of this clip's whole length, which is why the question had to be asked. **Three tests say no:**

| test | clip 15 says | this clip shows |
|---|---|---|
| **the board** | *"dark board with a VANS bottom"*, deck *"dark, unmarked and wet"* | **a bright yellow deck AND a bright yellow bottom**, with **three fins** visible at 5.0000 and no legible graphic |
| **the last second** | *"21.76–22.64 trim in foam to the end; trunk folded 60–70°"*, rider **~430 px** | **17.04 → 18.84: no rider anywhere in the frame**, 19 consecutive samples |
| **shot structure** | **a cut at 4.08–4.10** | **no cut anywhere**, by three routes (§0.8) |

> ⛔ **So this is a different ride from the same film, not a duplicate — but the board-colour test rests on another reader's word for a backlit board, so I state it as the weakest link rather than hide it.** The other two tests do not depend on it.
>
> ⭐ **The registry fix this argues for is one column: rider + film/edit + channel beside the ID.** Clip 15 and clip 23 would then have collided on *"Mikey February / SHORTYHEAD"* and a reader would have been told to check before spending a round, instead of after.

### 0.10 — The rider's size in source pixels, stated before anything was spent

| | |
|---|---|
| **Crown to sole, in-frame** | **107 px** at 0.0000 (deep crouch), **235 px** at 3.0000, **184 px** at 5.0000, **232 px** at 11.6000 |
| **Head length** | **22 px** (0.0000), **32** (3.0000), **33** (5.0000), **47** (11.6000), **45** (16.7200) |
| ⚠️ **The camera zooms by more than 2× across the ride** — head length 22 → 47 px — **so no cross-frame height or depth is comparable.** Only signs (above/below a line) and within-frame ratios are quoted across frames |
| **Board** | projected **123–243 px**; **the whole board is clear at 5.0000** and at no other frame examined |
| **Camera** | from the beach, long lens, panning and zooming, **elevation measured: ~1.45 rider-heights above the water at the rider** (§0.3). **A real sea horizon is present from ≈15.6 to ≈16.8** |
| **Other people in shot** | ⚠️ **paddlers in the band throughout**; the finder locked onto one in **2 of 148** scored steps (12.2, 15.9), both flagged automatically by a >400 px jump |
| **Frame grid** | **container 25.000 fps exactly** (three epochs); **unique-picture rate 25 / 12.5 / 18.75 depending on the passage** (§0.2) |

---

## 1. ⚠️ What this clip CANNOT touch, and why

| row | verdict | the reason, named |
|---|---|---|
| **10 — the two legs' split** | ⛔ **refused, fifteenth clip running** | §0.6. Board aspect **8.3 on a frame holding the WHOLE board**, and ≥6 to ≥18.8 on four others, against a gate of 2.2. No knee was examined |
| **14 — where a rider lives on the ladder** | ⛔ **no rung named, fifteenth clip running** | No admissible leg chain; and **the horizon is present and says the lens is above him** (§0.3), so apparent stature is unlicensed — this time by measurement, not by absence |
| **2 — trunk angular travel, gated** | ⛔ **no gated angle published** | The calibration licenses a projected trunk angle only at a **level** lens with the board **end-on**. The lens is measurably **raised** and the board is **never** end-on (aspect 6–19). The ~53°, ~38° and ~14° in §3.2 are **image-plane tilts, offered as signs and ordering, not as fold angles** |
| **3 — the two channels** | ⚠️ **no transition classified** | Leg depth has no admissible ruler and the trunk has no licensed angle, so "legs" and "trunk" are not two measurable things here |
| **6 — pump cadence in trim** | ⛔ **no period published** | The camera zooms 2× across the clip, so no cross-frame body height is comparable; and the one long flat-board stretch (2.8–3.6) was sampled at 0.1 s, not densely enough to resolve a half-cycle |
| **9 — hips aft while shoulders forward** | ⛔ **no hip landmark** | A loose T-shirt over boardshorts — clip 15's refusal, reproduced: **no garment edge tracks the pelvis anywhere in 18.9 s** |
| **11, 13 — which channel leads down, where the low sits** | ⛔ **refused** | Downstream of the two above |
| **12 — holds below the Compress band** | ⛔ **no rung, so no hold to time** | §0.3 |
| **17 — the feet** | ⛔ **no ratio published**, §0.5 — and the row gains a **gate**, not a confirmation |
| **18 — head and gaze** | ⛔ **no angle** | 22–47 px of head. **An eleventh distinct cause is not claimed; this is plain resolution** |
| **19 — the loaded hand** | ⛔ **not resolvable** | No hand is on the water in any frame examined; the one candidate region (16.80–17.00) is inside the whitewater |

---

## 2. Method findings

### 2.1 — ✅ **THE SESSION-WIDE HASH GUARD WORKS, AND IT WAS RUN AT SCALE**

Clip 22's rule was adopted literally: **every frame's hash is compared against every hash seen in the session, not against the previous ask.** Across **473 native-grid frames plus ~600 probe and survey frames, zero frames came back matching a hash first seen at a distant time.** The eleven matches that did occur were all **adjacent in time** and all turned out to be **real duplicate pictures** (§0.2), confirmed by a zero pixel difference.

> ⭐ **A consequence worth recording: the same guard that catches a stale frame is also what FOUND the slow motion.** They are the same measurement — "has this picture been seen before, and when" — and the second use is the more valuable one. **A reader who only tests "is this frame stale" is throwing away the frame-rate structure of the clip.**

### 2.2 — ⭐ **THE TWO-`<video>` TRAP FIRED IMMEDIATELY, AND `document.querySelector('video')` IS THE WRONG PICKER ON A SHORT**

The first toolkit install grabbed a video element with `duration = null` and `videoWidth = 0`: the Shorts feed holds **two** `<video>` elements, one of them the pre-loaded neighbour. Every subsequent call re-picks by assertion — **`videoWidth === 1080 && videoHeight === 1440 && |duration − 18.901| < 0.01`, throwing if the match is not unique** — and `pick()` was called at the top of every measurement batch. **Clip 15 recorded this trap; it is not rare, it is the default on a Short.**

### 2.3 — ☠️☠️ **THE SCREENSHOT SIZE CHANGED FIVE TIMES, `resize_window` DOES NOT PIN IT, AND AT THE SMALL SIZE THE CANVAS IS CLIPPED**

| | screenshot | canvas → screenshot scale |
|---|---|---|
| start (1200×1900 viewport) | **800×1267** | 0.667 |
| mid (820×1280 viewport) | **800×1249** | **0.975** |
| same viewport, minutes later | **384×598** | **0.48, and CLIPPED** — a 780 px canvas showed its left 384 px |
| after `resize_window` to 800×1240 | **386×390** (crop) | 0.483 |
| later, same viewport | **386×598** | 0.483 |

⚠️ **The same viewport produced two different screenshot sizes, and a deliberate `resize_window` did not move it back.** This is clip 22's finding reproduced on a second clip and a second day.

> ⭐ **The cure held: every measurement frame in this document carries its own printed source-coordinate grid, and the effective px/src was re-derived from the grid labels before any landmark was read.** That is why the five arm frames can be compared at all despite scales of 1.66, 1.90, 1.99, 2.00 and 3.07 px/src. **Re-deriving the scale from the grid is mandatory, not a precaution.**

### 2.4 — ⛔ **AN AUTOMATIC HORIZON DETECTOR WAS BUILT, VALIDATED AND DISCARDED**

A row-mean luminance profile with a ±3-row step detector was meant to find the sky/sea line automatically. Run on 8 frames it returned **y = 132 and 120 at t = 16.2 and 16.6 — correct, matching the hand measurement of 147 ± 6 within its 12 px window — and y = 552, 612, 540, 520, 368, 484 on the other six, every one of which is the WAVE'S WHITE LIP, not the horizon.**

> ⛔ **Nothing automatic is quoted. The lens-height result in §0.3 is hand-measured on a gridded frame.** The detector finds "the strongest bright-to-dark step", and in surfing footage that is almost always the lip. **It is only safe in frames where the camera is looking at open water, which is exactly the frames you do not need it for.**

### 2.5 — Kept, with their bounds

| tool | verdict |
|---|---|
| **redness rider finder** (R − max(G,B) ≥ 18, 9×9 box maximum on a ×4 downsample) | ✅ **KEPT.** Scored on 148 of 189 consecutive steps. ⚠️ **Two locks on paddlers**, both flagged automatically by a >400 px jump; **a score of 0 means "no maroon above threshold", which in 17.0–18.8 is a true absence and in 14.6–15.8 is an occlusion — the finder cannot tell those apart and did not try** |
| **fixed-size source crops centred on the finder** (video 10's structural fix) | ✅ **KEPT for survey only.** 36 tiles. **No angle, height or limb position is taken from any tile**; every landmark in this document comes from a gridded frame |
| **whole-frame correlation cut detector** | ✅ kept as a **cut** detector only. ⚠️ Its *values* are not used for anything else — clip 22's coconut grove is the standing warning, and this backdrop is a rolling swell, which is also periodic |
| **background job + poll runner** (clip 20) | ✅ confirmed again. The 473-ask native scan ran ~150 s across three polls with no timeout and no runaway |
| **unclamped `MessageChannel` nap** (clip 20) | ✅ kept and confirmed |
| **`setPlaybackQualityRange`** | ⛔ **not attempted**, on clip 22's evidence. 1080 was already being served after enlarge-and-reload, so the pin bought nothing |

---

## 3. What the body does

### 3.1 — The ride, as far as it can be read

Four survey sheets (0.8 s over the whole clip; 0.12 s over 7.68–9.00; 0.04 s over 16.60–17.04; 0.2 s over 14.40–16.00) plus ten gridded frames:

| window | what |
|---|---|
| **0.0 – 0.6** | already standing and driving, trunk folded, a broken wave in the foreground |
| **0.8 – 1.9** | climbs and turns off the top; spray at ≈1.3–1.6 |
| **2.0 – 3.6** | descends and trims; **t = 3.0000 is the clip's cleanest trim frame** — trunk folded ~53°, **both hands low and forward over the deck** |
| **4.0 – 4.9** | climbs again |
| **5.0** | ⭐ **a drive off the bottom with the board rolled onto its rail (fins to the lens) and one hand above the crown** |
| **5.6 – 7.4** | drive and descent, trunk folded |
| **7.7 – 8.5** | ⭐ the steep hollow section — **the deepest, most sustained crouch in the clip**, and **8.00–8.40 is the 2× speed ramp** (§0.2) |
| **8.6 – 9.2** | a second rolled-rail turn (**t = 9.2000**: the board's bottom fills the frame), **no hand above the shoulder line** |
| **9.5 – 10.4** | climb |
| **11.1 – 12.1** | ⭐ driving through broken water, **trunk folded ~38°, both hands low (−140 and −84 px)** — t = 11.6000, the largest body in the clip |
| **12.2 – 14.5** | descent, a turn at ≈13.6 with the board rolled, a large spray at ≈14.2 |
| **14.6 – 15.8** | ⚠️ **occluded by the wave — 1.2 s with no rider visible, and no cut** |
| **15.9 – 16.76** | ⭐ **the only sustained UPRIGHT passage in the clip** — trimming through the inside past paddlers, trunk near-vertical, hands low |
| **16.8 – 18.84** | engulfed, then whitewater only (§0.4) |

**About five or six identifiable direction changes in ~16.8 s of riding, ≈1 per 2.8–3.4 s.** ⚠️ **This is an eye count at 0.8 s sampling on a rider 107–235 px tall, so the interval is an upper bound and the rate a lower bound. No rate is published for row 8.**

### 3.2 — ⭐ The trunk is folded almost everywhere, and upright only at the end

Image-plane trunk tilt from vertical, measured shoulders-to-hips on gridded frames (⚠️ **projections, not fold angles** — §1):

| t | tilt | what he is doing |
|---|---|---|
| **3.0000** | **≈53°** | trim |
| **11.6000** | **≈38°** | driving through broken water |
| **16.7200** | **≈14°** | standing upright, being engulfed |

Of **27 frames examined at a size where the trunk was legible**, **22 show a pronounced forward fold** and **5 show a near-upright trunk** — and **all 5 of the upright frames are in the single window 16.00–16.76.**

> ⛔ **No duty cycle is published.** The 27 frames are not uniformly sampled — a third of them come from one dense 0.12 s sheet over the steep section — so a percentage would be a fact about my sampling. **What survives the sampling is the ordering: the fold is the resting posture and the upright trunk is the exception, and here the exception is a single late passage.** That is clip 15's sentence about the same rider, reached independently on different footage.
>
> ⭐ **And the thing the engine has no name for is the same thing clip 22 found.** The largest share of this ride is **neither trim nor a manoeuvre**: it is driving, folded, through and past broken water — 0.0–0.6, 5.6–7.4, 11.1–12.1, 15.9–16.8. **Two clips, two riders, same gap.**

### 3.3 — ⭐ In every deep fold the head stays up

Four gridded frames with the trunk folded or near-horizontal — **0.0000, 3.0000, 11.6000** and, in the engulfment, **16.7200** — show **the head held up and looking along the board, not dropped with the chest**, in all four.

> ⭐ **That is the condition the `hip-over-deck ÷ head` ruler's calibration needs, now checked on a seventh rider.** ⚠️ It is the *sign* of the head's attitude, not an angle: at 22–47 px of head there is no chin landmark worth the name, and **no gaze is published.**

### 3.4 — Arm carriages

| carriage | measured instances |
|---|---|
| **both hands low, below the shoulder line, over the deck** | 0.0000 (−4 / −62), 3.0000 (−58 / −48), 11.6000 (−140 / −84), 16.7200 (−64 / −41) |
| **one hand above the crown, the other low** | 5.0000 (+54 / −87) |

> ⭐ **"Both hands carried low over the deck with the trunk folded" (row 15) is again the clip's dominant carriage — the sixth clip.** V7, V8, V9, clip 21, clip 22 and now this.
>
> ⭐ **And the low carriage is NOT one carriage.** At 3.0000 the two hands are **10 px apart and both reaching forward past the nose**; at 11.6000 they are **56 px apart on opposite sides of the body**. **Row 4's "one scalar" cannot express either, and it certainly cannot express both.**

---

## 4. What could not be seen

- **The lens zooms by more than 2×** (head 22 → 47 px), so **no cross-frame height, depth or stature is comparable.** Only signs and within-frame ratios are quoted across frames.
- **The lens is measurably above the rider** (§0.3) ⇒ apparent stature is unlicensed ⇒ **no depth rung anywhere.**
- **Neither the knee nor the two feet are separable in any frame examined.** Board aspect 6–19 on five frames, including one with the whole board.
- **No waistband, no wetsuit seam, no bare skin at the hip** — a loose T-shirt over boardshorts for 18.9 s. **No hip landmark, so no fore-aft reading.**
- **1.2 s of the ride (14.6–15.8) is behind the wave**, and ~1.9 s at the end is inside whitewater.
- **The last ≈0.06 s does not decode** — the legible clip is 0.0000 → 18.84 of 18.901.
- **Whether the rider fell at 16.9 is not shown.** He is swallowed standing and never reappears.
- **Durations inside 8.00–8.40 and 16.04–16.76 are not real time** (§0.2), and nothing in this document times anything inside them.

---

## 5. The rows this clip moves, and how

| row | moves? | how |
|---|---|---|
| **16 — meeting whitewater** | ⭐⭐ **A THIRD POSTURE, AND THE FIRST WITH A CONSEQUENCE** | Clip 22 gave two answers — fold forward when *driving through* foam, lean back when *hitting* it. **Here a section breaks onto him and he meets it UPRIGHT**, trunk ~14° from vertical, both hands low, head up, feet unmoved — **and the camera loses him inside it 0.16 s later and he never reappears in the remaining 1.9 s.** The engine needs three postures, not two, and the trigger that selects them is still intent, not contact |
| **4 — arm carriage is its own channel** | ⭐⭐ **STRENGTHENED, AND THE SERIES' OWN FRAMING REFUTED** | The two hands disagree in **5 of 5 readable frames** — **4.3 %, 24 %, 54 %, 77 % of crown-to-sole, and one unmeasurable.** ⭐ **One rider spans a wider range than the two "per-rider" bands clips 21 and 22 established, and straddles both: the disagreement is a property of the MOMENT, not of the rider.** "Never zero" is what reproduces. And the low carriage itself splits into two incompatible shapes (§3.4) |
| **the frame grid / slow motion (method)** | ⭐⭐ **A NEW DIRECT TEST, AND TWO RAMPS FOUND** | **473 native frames, 462 unique, 11 duplicates, pixel-identical (MAD = 0.0000), exactly periodic in two windows.** Container 25.000 fps at three epochs; **unique-picture rate 12.5 fps over 8.00–8.40 and 18.75 fps over 16.04–16.76.** The series can now **measure** a duplication-based ramp instead of arguing about it — and must say so, because one of the two ramps covers this clip's only event |
| **14 / the depth refusal** | ⭐ **THE REFUSAL BECOMES A MEASUREMENT** | Fifteen clips have refused stature for want of a horizon. **This clip has one, and it puts the lens ~1.45 rider-heights above the water at the rider.** The refusal stands, but it is now evidence rather than an absence — **and §0.3 shows the mechanism in action: 7.3 head-lengths at a ~53° fold, which only a raised lens can produce** |
| **17 — the feet** | ⚠️ **NO RATIO — AND A GATE THAT NEEDS NO NOSE** | Four frames attempted, four refusals, **two of them refused by their own arithmetic**: a stance must span ≈0.25–0.35 of the board's length and mine came out **0.09 L and 0.12 L**, which means one foot and a shin. ⭐ **Propose this as row 17's admissibility gate.** ⚠️ Clip 22's two published attempts imply ≈0.17 L and ≈0.19 L — **below the gate**. ⭐ **And the series gets its first fin-based nose identification** (t = 5.0000), which does not assume the direction of travel |
| **the gate's precondition** | ⭐⭐ **REFUTED** | Clips 21 and 22 concluded that a beach shot never shows a whole board. **This is a beach shot and t = 5.0000 holds the whole board, both ends clear, fins visible.** The gate still refuses — **aspect 8.3 as a measurement, not a lower bound** — and the excess over a board's true 3.8 is accounted for by ~60° of rail roll |
| **15 — both hands low over the deck** | ⭐ **STRENGTHENED, sixth clip** | Four of five measured frames |
| **18 — head and gaze** (adjacent) | ⭐ **the head-up sign on a seventh rider** | Four frames with the trunk folded, head up in all four. **No angle; 22–47 px of head** |
| **1, 2, 6 — the trunk channel** (adjacent) | ⭐ **ordering, not a duty cycle** | **22 of 27 legible frames show a pronounced forward fold; all 5 upright frames fall in one late 0.76 s window.** No percentage is published because the sampling is not uniform |
| **8 — turns chained at a rate** | ⚠️ **TOUCHED, NOT QUANTIFIED** | ≈5–6 direction changes in 16.8 s, **an eye count at 0.8 s** ⇒ a lower bound on the rate. **No rate published.** The remainder is again the finding: most of the ride is **driving, folded, through broken water** — neither trim nor a manoeuvre, and the engine has no name for it |
| **the series' footage ask** | ⭐ **CONFIRMED a third time, unchanged** | Not an edit, not a late trim — **a continuous take that simply starts mid-wave.** Three different causes, one remedy: **footage that starts before the rider is on his feet** |
| **the CLIP REGISTRY (process)** | ⚠️ **A HOLE** | **An ID check cannot catch a re-upload.** This clip and clip 15 are the same rider and the same film on two channels; only a content comparison separated them, and only after the round was spent. **Add rider + film + channel to the registry row** |
| **3, 9, 10, 11, 12, 13, 19** | ⛔ **CANNOT TOUCH** | §1 |

### What this clip says against the brief it was given

1. ⭐⭐ **"TWO CLIPS RUNNING HAVE HAD NO WHOLE BOARD — THAT IS A PROPERTY OF BEACH SHOTS" IS WRONG.** This is a beach shot with a long lens and **t = 5.0000 holds the entire board with both ends clear of water and three fins legible.** It was a two-clip sampling accident. **The gate refuses anyway, and having the whole board is what makes the refusal a measurement (8.3) instead of a lower bound.**
2. ⭐⭐ **"MEASURE LEFT AND RIGHT SEPARATELY" IS RIGHT; THE BANDS ATTACHED TO IT ARE NOT.** The brief records 7–27 % on one rider and 43–63 % on another as if the spread were a rider trait. **One rider in one ride gave 4.3 %, 24 %, 54 % and 77 %** — wider than both bands and overlapping both. **The reproducible claim is "the two hands never agree"; the magnitude belongs to the moment.**
3. ⭐⭐ **THE SERIES HAS BEEN ARGUING ABOUT SLOW MOTION WHEN IT COULD HAVE BEEN MEASURING IT.** Hashing every native frame and looking for **pixel-identical adjacent duplicates** found two ramps in this clip in one 150 s background job — and **one of them covers the clip's only event**, so a naive reading would have overstated the contact by a third. **It costs one scan and it should be standard.** It is blind to blend-based and high-rate ramps, and the document says so.
4. ⭐ **A HORIZON DOES NOT RESCUE DEPTH; IT CONVICTS IT.** Fifteen clips said "no horizon, so stature is unlicensed", which quietly implies that a horizon would license it. **This clip has a clean horizon and it shows the lens sits above the rider's head — so stature is refused by measurement.** The useful by-product is that the clip also *demonstrates* the mechanism: **7.3 head-lengths at a ~53° fold.**
5. ⭐ **"CLASSIFY THE EVENT, DO NOT TIME IT" WAS THE RIGHT INSTRUCTION AND THIS CLIP COULD NOT EVEN CLASSIFY IT.** He is taken by the foam standing upright and never comes back on camera. **"Swallowed, outcome not shown" is a third category**, and no instance is added to the 0.433 / 0.48 / 0.733 s set.
6. ⭐ **THE FOOT ROW NEEDS A GATE BEFORE IT NEEDS MORE FRAMES.** The brief asks for two agreeing frames. **I could not produce one admissible frame, and the reason is checkable without a nose: a stance that measures 0.09–0.12 of the board's length is not a stance.** ⚠️ **Applied backwards, clip 22's own two attempts imply ≈0.17 L and ≈0.19 L**, which is the same failure one step milder. **The 0.55–0.60 band should be re-derived under this gate before it is quoted again.**
7. ⚠️ **THE DISPATCH PROCESS HAS A HOLE THE BRIEF DOES NOT MENTION.** The registry de-duplicates by YouTube ID. **This clip is the same rider and the same film as clip 15 from a second channel**, and establishing that it was nevertheless a *different ride* took three content tests, one of which rests on another reader's description of a backlit board.
