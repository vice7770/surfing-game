# Video reference 22 (*beng beng fun*, @surgaMentawai123Surf, Rifles, Mentawai): **the whole clip is ONE unbroken 12.6 s ride — the longest in the series — and its one big move is a LAYBACK SNAP whose recovery (0.433 s) is FASTER than either of the two involuntary recoveries the series has on file**

Source: **https://www.youtube.com/shorts/YybXum0o4YI**, title *"beng beng fun #bengbeng #mentawaisurf"*, channel **`@surgaMentawai123Surf`**, description *"the best waves in Rifles"*. Length **12.681 s**, read in full. The **twenty-second** reference the owner has sent, registered as #22 in `CLIP-REGISTRY.md`.

> ⭐ **The first clip in twenty-two whose entire length is a single unbroken shot of a single ride**, proved three ways (§0.2). Clip 11's 11.78 s continuous ride was the previous longest; this is **12.62 s of legible ride** and the clip has no cuts at all. **So the series finally has a whole ride, start of clip to end of clip, on one rider at one break.**

Delivered to the browser pane at **1080×1920**, but the picture inside that frame is a **letterboxed landscape band at source y ≈ 500–1430** (1080 × 930); above and below it is YouTube's blurred fill, which is not picture and was never measured. `getAvailableQualityLevels()` returns `["hd1080","hd720","large","medium","small","auto"]`, so **`hd1080` is this clip's published ceiling**; `getStatsForNerds().resolution` reported `1080x1920@60`, codec `av01.0.09M.08`. `playbackRate` 1. **`setPlaybackQualityRange` was tried once and KILLED the stream** (`readyState` 0, `networkState` 0, no recovery in 14 s of polling); a plain `navigate` reload restored it at the same 1080×1920, so **the pin was never needed and is not recommended on a Short**. `yt-dlp` and `ffmpeg` are both absent from this machine (checked), so nothing was downloaded; every frame is a screenshot of the browser pane. **No consent gate appeared.**

**Tabs:** `tab-2` for the first half of the session and `tab-1` for the second, both claimed with `tabs_create` and passed explicitly on every call. The change was forced: **the Browser pane closed itself mid-read** (§2.3). Both tabs held this clip and no other, at all times.

**Every figure below is an estimate from pixels**, and each carries its own error bar. **All medians quoted are plain medians and are named as such; every number carries its population and its frame.**

---

## 0. The answer first

### 0.1 — ⛔ **NO TAKE-OFF — AND THIS CLIP KILLS THE "ASK FOR RAW FOOTAGE" FIX**

At **t = 0.0000**, the very first frame of the file, measured on a gridded crop at **2.385 image px per source px**, the rider is **already standing**, in a forward-folded crouch, one bare arm reaching down past his knee, the board under his feet and a white wake off its tail. Twenty-two clips, zero pop-ups.

> ⭐ **But the useful part is what kind of clip this is.** Clip 21 concluded that highlight edits cut the paddling and that *"the ask has to change to raw or unedited footage."* **This clip IS raw and unedited** — one continuous camera take, no cuts anywhere (§0.2) — **and it still has no take-off, because the take was TRIMMED to begin after he stood up.**
>
> **So the corrected ask is narrower than clip 21's: not "raw footage", but footage that STARTS BEFORE THE RIDER IS ON HIS FEET.** A single unbroken take is not sufficient; a clip that opens on a standing rider cannot contain a pop-up however raw its interior is.

### 0.2 — ⭐⭐ **ONE UNBROKEN SHOT, 0.0000 → ≈12.62 s, BY THREE INDEPENDENT ROUTES**

| route | result |
|---|---|
| **background cross-correlation**, consecutive frames at 0.1 s over the whole clip, best-shift-aligned, on the treeline band (source y 580–740) | **126 steps. Minimum r = 0.9103, plain median r = 0.9899, no step below 0.90.** A cut between two shots crashes this to near zero even when the two shots share a beach |
| **rider-blob continuity**, consecutive frames at 0.0667 s | **188 steps. Plain median \|Δx\| = 11 px, 90th percentile 36 px.** Only **5** steps exceed 60 px (at 2.95, 3.35, 4.35, 4.62, 5.29) and **all five are at times where the tracked survey sheets show the finder locked onto a PADDLER**, not the rider |
| **eye**, on 116 survey tiles (0.1833 s, 0.0667 s and 0.0333 s sheets) and 14 gridded 1:1 frames | one rider, one board, one wave, continuous light, and a background that changes **continuously** — palms, then beach, then a thatched-roof building — never jumps |

> ⚠️ **The correlation route survives as a CUT detector but its shift VALUES are discarded** — see §2.6. Aliasing moves the peak; it does not raise a cut's correlation.
>
> ⛔ **The last ≈0.06 s of the file does not decode at all** (§2.1), so the legible ride is **0.0000 → 12.6167**, and at **12.6167 he is still standing and still riding** (gridded 1:1 frame, 1.977 px/src: trunk folded forward, both hands below the shoulder line, whitewater all round). **No wipeout and no kick-out in this clip.**

### 0.3 — ⭐⭐ **THE EVENT: A LAYBACK SNAP, AND IT REFUTES WHAT THE SERIES' TWO RECOVERY TIMES MEAN**

Measured at the native 1/60 s grid, with both endpoints re-measured on gridded 1:1 frames:

| t (s) | what the body does | how it was obtained |
|---|---|---|
| **11.0500** | **standing**, trunk near-vertical with a slight back-lean, both hands **below** the shoulder line (−31 and −73 px), board clearly under his feet | ⭐ measured, 1.908 px/src, src(460,1040) |
| **11.117** | first tile in which the recline has begun | 0.0333 s tracked sheet, 28 tiles |
| **11.1500** | **reclined** — trunk tilted back, legs extending forward, one hand level with the shoulder line (−13), the other −43 | ⭐ measured, 1.908 px/src, src(480,980) |
| **11.3500** | ⭐⭐ **LOWEST ATTITUDE — the board is thrown to NEAR-VERTICAL** (projected 190 × 40 px, nose up), the body reclined onto the foam, **one hand +58 px ABOVE the shoulder line**, the other down toward the water | ⭐ measured, 2.43–2.48 px/src, src(520,900) |
| **11.5500** | still reclined, hips within ~15 px of the foam, **one hand +60 px ABOVE the shoulder line** | ⭐ measured, 2.35 px/src, src(490,920) |
| **11.7833** | ⭐ **standing upright again**, head up, board under him, riding on | ⭐ measured, 1.908 px/src, src(500,950) |

**Two timings:**

| quantity | this clip | clip 20 | clip 21 |
|---|---|---|---|
| onset of the loss of upright → standing again | **0.667 s** ± 0.05 | 0.93 ± 0.06 s | 1.200 s |
| **lowest attitude → standing again** | **0.433 s** ± 0.033 | 0.48 s | 0.733 s |

> ⭐ **Three instances now, three riders, three breaks.** Lowest-to-standing: **0.433, 0.48, 0.733 s**, plain median **0.48 s**. Onset-to-standing: **0.667, 0.93, 1.200 s**, plain median **0.93 s**. The pair clip 21 created is now a population of three.
>
> ⭐⭐ **AND HERE IS THE REFUTATION, AND IT IS ABOUT WHAT THOSE NUMBERS MEAN.** Clips 19, 20 and 21 read their events as **losses of stance**. **This one is almost certainly a deliberate manoeuvre**: the board is driven to vertical *with his feet on it*, it rotates about him and comes back down underneath him, and he rides away — the signature of a layback snap, not of a save. **And its recovery time is the SHORTEST of the three.**
>
> ⇒ **"Time from lowest attitude back to standing" does not separate a save from a manoeuvre.** Any engine state machine, eval or metric built on that duration is built on a quantity that cannot tell the two apart. The series should stop treating 0.48 s as "how long a recovery takes" and start treating it as **"how long a surfer takes to come back up from a low attitude, for any reason."**
>
> ⚠️ **What this clip CANNOT say about the event**: whether his back or his trailing hand took weight on the water at 11.35–11.55. He is inside his own spray; the lower hand is 0–20 source px from white, and **the white is not a surface**. So **row 19 is still not resolvable** — twenty-two clips.

### 0.4 — ⭐ **THE ARMS: A SIXTH RIDER REPRODUCES CLIP 21'S REFUTATION — IN A CLIP WITH NO FALL AT ALL**

Hand height measured against the **near shoulder line**, **left and right separately**, on gridded 1:1 frames, each carrying its own source grid:

| t | eff. px/src | shoulder line (src y) | hand A (src y) | hand B (src y) | **A vs line** | **B vs line** | what he is doing |
|---|---|---|---|---|---|---|---|
| **1.6667** | 1.977 | 1036 ± 8 | 1015 ± 8 | 1060 ± 8 | ⭐ **+21 ABOVE** | −24 | a turn off the top |
| **6.2500** | 1.670 | 1019 ± 8 | 1070 ± 10 | 1080 ± 10 | −51 | −61 | trimming |
| **8.4500** | 1.750 | 883 ± 10 | 830 ± 10 | hidden | ⭐ **+53 ABOVE** | — | off-the-lip |
| **11.0500** | 1.908 | 1097 ± 8 | 1128 ± 8 | 1170 ± 8 | −31 | −73 | trim, 0.3 s before the snap |
| **11.1500** | 1.908 | 1065 ± 8 | 1078 ± 8 | 1108 ± 10 | −13 (level) | −43 | snap entry |
| **11.3500** | 2.455 | 1020 ± 12 | 962 ± 10 | hidden | ⭐ **+58 ABOVE** | — | snap, lowest attitude |
| **11.5500** | 2.350 | 1000 ± 12 | 940 ± 10 | hidden | ⭐ **+60 ABOVE** | — | snap |
| **12.6167** | 1.977 | 1104 ± 8 | 1161 ± 8 | 1181 ± 8 | −57 | −77 | folded, driving through whitewater |

> ⭐⭐ **A hand is above the shoulder line in 4 of 8 measured frames, and every one of the four is a TURN. There is no fall anywhere in this clip to confound it.** Clip 21 had to use a rider who also fell; this clip is the cleaner control, and it gives the same answer. **"Arms up" is a turn signature. Confirmed on a sixth rider.**
>
> ⭐ **The two hands disagree in 5 of 5 frames where both were readable**: 45, 10, 42, 30 and 20 source px. As a fraction of the rider's apparent stature (136–165 px) that is **7–27 %, and never zero**. Clip 21 measured 230–273 px on a 430–530 px rider — **43–63 %**. **Two clips, two riders, left ≠ right in every frame either of us could read both.** Row 4's "one scalar, no left/right" is now broken on two independent riders.
>
> ⚠️ The disagreement here is **smaller in relative terms** than clip 21's. That is probably the clip, not the rider: clip 21's frames were in a recovery and an off-the-lip; five of these eight are ordinary riding.

### 0.5 — ⛔ **THE FEET: ATTEMPTED TWICE, AND THE TWO ATTEMPTS DISAGREE BY MORE THAN THE BAND THEY WERE TESTING**

| t | magnification | nose | front foot | rear foot | **front ÷ rear** |
|---|---|---|---|---|---|
| **6.2500** | **3.737 px/src**, a frame holding the nose, both feet and both legs together | src x **405 ± 5** | **443 ± 4** | **475 ± 6** | **0.54** (range 0.43–0.67) |
| **1.6667** | 1.977 px/src, a frame holding the whole *visible* board and both feet | visible end src x **479 ± 6** | **557 ± 5** | **582 ± 5** | **0.76** (range 0.70–0.82) |

> ⛔ **No foot ratio is published.** The two readings do not overlap, and the series' band (0.55–0.60) sits between them. Worse, the 1.6667 reading implies foot positions of **0.60 L and 0.79 L from the nose**, which is not an anatomically sensible stance — so at least one landmark in it is wrong, and I cannot say which.
>
> **The cause is size.** The rider is **136–165 px crown-to-sole** (§0.8) and a foot is **12–18 px**. The board's nose or its tail is inside spray, inside foam or outside the frame in **every** frame examined. **Clip 20 nearly published a foot measurement from a 164×129 crop and a wider crop refuted it; this is the same failure caught one step earlier.**
>
> ⚠️⚠️ **AND THE NEW CAUTION THIS BUYS ROW 17, WHICH IS BIGGER THAN THIS CLIP.** The ratio is defined **from the nose**, so it depends entirely on knowing **which end of the board is the nose** — and §0.6 shows this clip could not settle which way the rider was even travelling. **No read in the twenty-two-clip series has ever stated how it established which end was the nose.** Swapping the ends does not produce an obviously wrong number; it produces a different plausible one. **Before the 0.55–0.60 band is quoted again, each contributing read should say how its nose was identified, and every new read should publish TWO frames per clip and show that they agree** — this clip is the first to try two, and they did not.
>
> ⚠️ **No foot slide, lift or re-placement was SEEN** in any of the 14 gridded frames or 116 survey tiles. **That is not evidence for row 17 here**: at 12–18 px per foot this clip cannot resolve a slide of less than about half a foot-length.

### 0.6 — ⛔ **WHICH WAY HE IS TRAVELLING IS NOT SETTLED — FOUR ROUTES, TWO ANSWERS**

| route | says |
|---|---|
| **broken water vs unbroken wall** — at 0.0167 and 2.0167 (whole-band gridded frames at 0.741 and 0.371 px/src) the foam is to his LEFT and a clean green wall to his RIGHT; a surfer rides ahead of the foam | **rightward** |
| **the tapered board end** — a clean, slender, tapering end at the RIGHT at 1.1167 (against green water) and at 11.0500 (against foam) | **rightward** |
| **camera pan by cross-correlation** — the background shift is positive on 120 of 126 steps at 0.1 s | **leftward** |
| **a paddler pair** — moved +190 src px in 0.3 s (2.0167 → 2.3167) while the rider's image position moved −14 px | **leftward** |

> ☠️ **I discard the correlation route outright** (§2.6: the backdrop is a coconut grove and the tracker aliases on it), and the paddler route is unsafe too — the line-up holds 4–8 paddlers inside the band and I cannot prove I matched the same person across 0.3 s.
>
> ⛔ **So this document does not state the direction of travel**, and **nothing in it depends on the direction** — because the one thing that did, the foot ratio, is refused in §0.5. **Recording the failure is the point**: at this camera distance the series could not establish which way the rider was going, which is the cleanest possible statement of why no angle, no rung and no foot ratio can come out of a beach shot at 136–165 px of rider.

### 0.7 — ⛔ The gate refuses on four frames, and **again there is no whole board anywhere**

**Board aspect = projected length ÷ projected width**, hand-measured on gridded frames:

| t | projected length | projected width | **aspect** | whole board in frame? |
|---|---|---|---|---|
| **1.6667** | **≥131 px** | ≈9 px (hard on rail) | **≥15** | ⛔ no — one end in foam |
| **6.2500** | **≥84 px** | ≈18 px | **≥4.7** | ⛔ no — tail in spray |
| **11.0500** | **≥159 px** | ≈18 px | **≥8.8** | ⛔ no — one end in foam |
| **11.3500** | **≥190 px** | ≈40 px | **≥4.8** | ⛔ no — tail in spray |

> **The gate refuses at ≥2.2, and all four are 2–7× past it.** No knee was examined. **No leg chain, no flexion, no leg-depth rung.**
>
> ⚠️ **Clip 21's precondition is unmet for the second clip running: not one frame in this clip holds a whole board.** All four numbers are therefore **lower bounds on length and so on aspect**. They refuse anyway, by a wide margin — but **two clips in a row now would have been UNDECIDABLE if their boards had sat near 2.2**, and that is no longer a one-off limitation of clip 21. It is what a beach shot does.

### 0.8 — ⛔ **NO HORIZON. The camera points at the beach, not at the sea**

The lens is long and looks **from the water's edge back toward the land behind the wave**: every frame examined is filled from the top of the content band to the bottom with palm grove, sand, buildings and water. **There is no sea/sky line anywhere**, no mast and no fixed object with a known height.

> **No checkable lens elevation ⇒ apparent stature is unlicensed everywhere ⇒ no depth rung is named anywhere in this document. Fourteenth clip running.**

### 0.9 — The rider's size in source pixels, stated before anything was spent

| | |
|---|---|
| **Crown to sole, standing** | **136 px** at 6.2500 (crown src y 986, sole ≈1122, knees bent) and **165 px** at 11.0500 (crown 1066, sole 1231, knees bent, trunk leaning back). **The 21 % difference is a slow zoom-in across the ride, not the rider** |
| **Head** | ≈45 px crown-to-chin. **The face is visible and unobstructed in several frames — no hood, no beard — and it is still far too small for any gaze angle.** Twenty-second clip, no gaze |
| **Board** | projected **84–204 px**; neither end is clear of spray or foam in any frame examined |
| **Camera** | from the beach, **long lens**, panning fast and zooming slowly, elevation unknown and unverifiable. **No horizon** |
| **Other people in shot** | ⚠️ **4–8 paddlers in the band at all times.** The dark-blob finder locked onto one in **5 of 189** frames, all identifiable (§0.2) |
| **Frame grid** | **60.000 fps exactly** (§2.2) |

---

## 1. ⚠️ What this clip CANNOT touch, and why

| row | verdict | the reason, named |
|---|---|---|
| **10 — the two legs' split** | ⛔ **refused, fourteenth clip running** | §0.7. Board aspect ≥4.7 to ≥15 against a gate of 2.2, on four frames, without examining a knee |
| **14 — where a rider lives on the ladder** | ⛔ **no rung named, fourteenth clip running** | No admissible leg chain (§0.7); **no horizon in the entire clip**, so apparent stature is unlicensed everywhere (§0.8) |
| **2 — trunk angular travel, gated** | ⛔ **no angle published** | The lens is long, of unknown and unverifiable elevation, slowly zooming, and the board is never end-on. The calibration licenses a projected trunk angle only at a **level** lens with the board **end-on, per frame**; this clip meets neither, and cannot even show it meets them |
| **3 — the two channels** | ⚠️ **no transition classified** | Leg depth has no admissible ruler and the trunk has no licensed angle. §3.1's trunk duty cycle is a **count of gross postures**, not a channel trace, and it is not offered as one |
| **6 — pump cadence in trim** | ⛔ **no period published** | There is almost no trim in this ride (§3.2) and no cross-frame height reference; the camera zooms by 21 % across the clip |
| **9 — hips aft while shoulders go forward** | ⛔ **no hip landmark** | Dark wetsuit top over dark boardshorts, no waistband, 136–165 px of rider |
| **11, 13 — which channel leads down, where the low sits** | ⛔ **refused** | With no admissible leg channel and no licensed trunk angle, "legs" and "trunk" are not two measurable things here |
| **12 — holds below the Compress band** | ⛔ **no rung, so no hold to time** | §0.8 |
| **18 — head and gaze** | ⛔ **no angle, twenty-second clip** | A **tenth** distinct cause: the face is clear and unobstructed, and the head is 45 px. **Resolution, plain** |
| **19 — the loaded hand** | ⛔ **not resolvable** | §0.3. The one candidate (the trailing hand through the layback) is inside his own spray in every frame |
| **17 — the feet** | ⛔ **no ratio published**, §0.5 — and the row gains a **caution**, not a confirmation |

---

## 2. Method findings

### 2.1 — ☠️☠️ **A SEEK INTO THE LAST 0.06 s NEVER DECODES — AND MY OWN STALE-GUARD TURNED THAT INTO FABRICATED DATA**

Seeks to **t = 12.6333, 12.6500 and 12.6667** return pictures **from elsewhere in the clip**, while `currentTime` reports the asked time exactly and the `seeked` event fires. Proved by hash on a 96×83 downsample of the content band:

| ask | hash | identical to |
|---|---|---|
| **12.6500** | `…22411` | ⭐ **t = 11.3500** |
| **12.6667** | `…43255` | ⭐ **t = 11.3667** |
| **12.6333** | `…54510` | **t = 12.6167** |

**The last decodable time in this 12.681 s file is ≈12.6167.**

☠️☠️ **And the trap is worse than that, because the guard I had written CREATED the contamination.** The guard was: *if this frame's hash equals the previous ask's, nudge by seeking to `t − 1.3` and back.* For `t = 12.65` the nudge target was **11.35**, which decodes perfectly — so the re-seek to 12.65 left **11.35's picture** on screen, and because 11.35's hash differs from the previous ask's, **the guard passed a stale frame as fresh and I briefly wrote it up as a second layback at the end of the ride.**

> ☠️ **Rule: a nudge-based stale guard is a stale-frame generator.** Comparing against **the previous ask** is not enough. **Compare every frame's hash against EVERY hash seen in the session** — that, and only that, caught this.
>
> ✅ The rest of the measurement set is clean: the 189-frame background job contains **zero exact duplicates**, on the rider blob *and* on the background profile, checked explicitly.
> ⛔ **Discarded because of this**: the final tile of one 0.1833 s tracked sheet (labelled 12.666).

### 2.2 — ⭐ The frame grid: **60.000 fps exactly, not 59.94 — and the phase at two epochs proves it**

Seeking on a fine grid and hashing a 96×83 downsample:

| window | step | boundaries found |
|---|---|---|
| **1.000 → 1.070** | 0.005 s, 15 asks | 1.0175, 1.0325, 1.0475, 1.0675 |
| **11.980 → 12.080** | 0.0025 s, 41 asks | **11.9838, 11.9988, 12.0162, 12.0338, 12.0488, 12.0663** |

**At 60.000 fps the boundaries near t = 12 are 11.9833, 12.0000, 12.0167, 12.0333, 12.0500, 12.0667** — every measured boundary is within **±0.0013 s**, i.e. within the 0.0025 s probe resolution. **At 59.94 they would be 11.9953, 12.0120, 12.0287, 12.0454, 12.0621** — off by **+0.0034 to +0.0051**, two to four times the resolution, in the same direction every time. **It is 60.000.**

> ✅ The 41-ask sequence came back **monotonic with no out-of-order decode**. **Step used throughout: 1/60 = 0.016667, asked as explicit `toFixed(4)` values, never as `t0 + i/60`.**
>
> The series' rate list stays at six (60, 59.94, 30.000, 29.97, 25, 24); this is the **second clip measured at a true 60.000**.

### 2.3 — ☠️ **THE BROWSER PANE CLOSED ITSELF MID-READ — a third distinct way to lose the tab**

Between one `javascript_tool` call and the next, a `__frame` call returned **"Preview tab tab-2 is no longer open"** and `tabs_context` returned **`browserOpen: false`, no tabs at all**. `tabs_create` then fails with *"The Browser pane isn't open yet"*.

✅ **Recovery: `navigate` with a URL reopens the pane and creates a tab called `seed`; then `tabs_create` gives a clean tab; then the whole toolkit must be reinstalled.** Budget ~4 round trips. The `seed` tab was closed immediately so that no other agent could inherit a tab pointing at this clip.

**This is distinct from clip 21's renderer-process death** (there the tab existed and screenshots errored) **and from the throttle below** (there everything works except the picture).

### 2.4 — ☠️ **`document.hidden` WENT TRUE TWICE BY ITSELF — AND THE SPLIT IT CAUSES IS THE USEFUL PART**

Twice, with no action of mine, the page became hidden. In that state:

| | |
|---|---|
| `drawImage(video, …)` | ✅ **kept decoding NEW frames correctly** — hashes at 3.0167 and 5.0167 differed, blob positions tracked |
| `computer{screenshot}` | ⛔ **froze** — returned the previous composite, old stamp and all, three times |
| `requestAnimationFrame` | ⛔ **stopped firing**, timing out `javascript_tool` at 45 s |
| `mcp__ccd_view__show_pane` | ⚠️ reported success **without clearing `document.hidden`** |

> ⭐ **The rule this buys: when the pane is hidden, NUMERIC analysis of the video is still sound — only the picture you look at is stale.** That is the opposite of the usual assumption, and it means a hidden pane does not invalidate a measurement job; it invalidates the screenshots you take of its results. **Check `document.hidden` from inside the page and report it beside every screenshot**, rather than trusting the tool's own "the pane is currently displayed".
>
> ⚠️ All three failures of clip 21's composite cure (`translateZ(0)` + changing opacity + double rAF + 400 ms nap) in this session happened **while `document.hidden` was true**. The cure is not weak; it cannot work at all in that state. **Un-hide the pane, do not repaint harder.**

### 2.5 — ☠️☠️ **THE SCREENSHOT SIZE CHANGED FOUR TIMES, AND `resize_window` DOES NOT CONTROL IT**

| | screenshot | canvas → screenshot scale |
|---|---|---|
| start of session | 800×1267 (reported frame) | 0.315 at a 1200 viewport |
| after the first survey | 378×598 | 0.475 at an 800 viewport |
| mid-session | **800×1266** | **1.058** |
| later | **800×600** | **0.795** |
| end | **378×598** | **0.824, and CLIPPED** |

⚠️ **The same viewport (756×1196) produced three different screenshot sizes**, and at the smaller sizes the canvas is **clipped, not scaled** — a 720 px canvas showed only its left 378 px, which looks exactly like a half-drawn composite.

> ⭐ **Every measurement frame in this document carries its own source-coordinate grid, and every landmark was read off the grid labels; the scale was re-derived from the printed grid in each frame before any landmark was taken.** That is the fourth confirmation of clip 12's rule and the second time the *screenshot* scale, not the canvas scale, was the thing that moved. **Re-deriving the scale from the grid is now mandatory, not a precaution**, because `resize_window` demonstrably does not pin it.

### 2.6 — ⛔ **A CAMERA-PAN TRACKER WAS BUILT AND DISCARDED: A COCONUT GROVE ALIASES CROSS-CORRELATION**

The tracker aligned consecutive background profiles and accumulated the shift, to measure how far along the beach the rider travelled. Its per-step correlations looked **excellent** — plain median r = 0.9899 — and an internal check (**a DIRECT alignment across 0.533 s versus the SUM of the eight 0.0667 s steps**) agreed to **3 px at t = 1.02, 3.02 and 5.02**.

Then the same check **failed outright** at t = 7.02 (273 vs 228), 9.02 (111 vs 318) and 11.02 (**−420 vs +213 — opposite signs**), with r falling to 0.374.

☠️ **The cause is the backdrop: a coconut grove whose trunks are 30–60 source px apart, searched over ±90 source px — more than one period.** A periodic texture matches beautifully at the wrong offset, so **high correlation is evidence of nothing**, and the direct-versus-summed check **aliases identically and therefore validates the error.**

> ⛔ **Nothing from it is quoted. No ride length, no along-shore speed, no mean velocity.** It also produced the leftward answer in §0.6 that conflicts with the two picture-based routes, and that conflict is left standing rather than resolved by the discarded ruler.
>
> ⭐ **The general rule: before trusting any correlation-based tracker, measure the backdrop's own spatial period and keep the search range inside it — and do not let a self-consistency check stand in for that, because a consistent aliaser is still an aliaser.** Five readers before this one discarded 3 of 4, 2 of 4, 3 of 3, 2 of 4 and 1 of 2 rulers; this round built two and discarded one.

### 2.7 — Kept, with their bounds

| tool | verdict |
|---|---|
| **dark-blob rider finder** (darkest clustered region in source y 570–1430, R+G+B < 190, on a ×4 downsample) | ✅ **KEPT.** Located the rider in **184 of 189** frames. ⚠️ Its five failures are all **paddlers**, and all five are flagged automatically by a >60 px jump in the blob position — so the failure mode is detectable without looking |
| **fixed-size source crops centred on the finder** (video 10's structural fix) | ✅ **KEPT** for survey only. 116 tiles. ⚠️ **No angle, height or limb position is taken from any tile**; 8 tile classifications were re-checked on gridded 1:1 frames and **agreed 8 of 8** |
| **unclamped `MessageChannel` nap** (clip 20) | ✅ kept and confirmed |
| **background-job + poll runner** (clip 20) | ✅ kept and confirmed — **and a counter-example to show why it is needed**: a 29-ask loop at 0.0025 s written inline **blew the 45 s ceiling and then kept seeking underneath two subsequent measuring calls**, returning an out-of-order hash sequence (12.0475, 12.05 … 12.015, 12.0625). **A page reload was the clean stop**, exactly as the skill says |
| **`setPlaybackQualityRange`** | ⛔ **DO NOT USE ON A SHORT.** It killed the stream dead (`readyState` 0, `networkState` 0, no recovery in 14 s); a `navigate` reload restored the same 1080×1920 without it |

---

## 3. What the body does

### 3.1 — ⭐ **A NEW KIND OF NUMBER: THE TRUNK'S DUTY CYCLE OVER A WHOLE RIDE**

Because this is one unbroken ride from the first frame to the last, the clip can say something no montage can: **what fraction of a ride the trunk spends folded.**

**Population: 65 classifiable survey tiles at 0.1833 s spanning 0.017 → 12.666**, classified by eye at a stated 0.49× tile scale, with **8 classifications re-checked on gridded 1:1 frames and 8 of 8 agreeing**:

| trunk posture | tiles | share |
|---|---|---|
| **pronounced forward fold** (3 of them extreme — trunk near-horizontal over the deck) | **29** | **45 %** |
| upright | 14 | 21 % |
| intermediate | 12 | 18 % |
| **reclined / leaning back** | **7** | **11 %** |
| unusable (finder on a paddler) | 5 | — |

> ⚠️ **This is a count of gross postures, not an angle and not a leg depth.** It is not offered to row 2, row 3 or row 14 and it names no rung. **But the series has never been able to say what proportion of a ride the trunk is folded, and on this ride it is nearly half.**
>
> ⭐ **And all 7 reclined tiles sit inside the clip's two turns** (8.2–8.8 and 11.1–11.8). **The trunk's backward lean is not a resting posture; it appears only in manoeuvres.**

### 3.2 — ⭐ The ride is a long drive through broken water, not a sequence of carves

Four identifiable direction-change manoeuvres in 12.62 s:

| window | what |
|---|---|
| **≈1.3 → 1.9** | a turn up and off the top; at **1.6667** one hand is **+21 px above** the shoulder line (measured) |
| **≈4.2 → 4.7** | a turn on a steep wall, arms wide |
| **8.2 → 8.8** | ⭐ a clear **off-the-lip**; at **8.4500** one hand is **+53 px above** the shoulder line (measured), the body leaning back, spray thrown behind |
| **11.1 → 11.8** | ⭐⭐ **the layback snap** (§0.3) |

**≈ one direction change every 3.2 s.**

> ⚠️ **An eye count at 0.1833 s sampling on a 136–165 px rider.** A pump or a small rail change is not separable from a crouch at that scale, so **3.2 s is an upper bound on the interval and the rate is a lower bound.** **No chaining rate is published for row 8.**
>
> ⭐ **The finding is the remainder.** Roughly **8 of the 12.6 s** is spent crouched or deeply folded, **driving through broken water** — not trimming, not turning. This is what the ride mostly consists of, and the engine has no name for it: it is neither "trim" nor a manoeuvre.

### 3.3 — ⭐⭐ **FOAM: FOUR MORE FORWARD BRACES, AND THE FIRST COUNTEREXAMPLE**

| window | duration | what happens |
|---|---|---|
| **1.85 → 2.3** | ≈0.45 s | folded forward, hands down, ridden out standing |
| **2.9 → 3.6** | ≈0.7 s | folded forward, hands down, ridden out standing |
| **6.6 → 7.9** | **≈1.3 s held** | folded forward, both hands down toward the deck, ridden out standing. Measured at **7.5333** (1.977 px/src): trunk near-horizontal, head up, one bare arm reaching down to the board |
| **9.0 → 10.9** | **≈1.9 s held** | the deepest folds in the clip. Measured at **10.6500** (2.306 px/src): trunk horizontal over the deck, head up, both arms down, feet apart on the board |
| **11.1 → 11.8** | 0.7 s | ⭐⭐ **the same rider meets the same foam and leans BACK** — the layback snap, trunk reclined onto the water, one hand **above** the shoulder line |

> ⭐ **Row 16 goes from a count of 3 to a count of 7** — four more instances, same rider, same ride, all answered identically: **trunk folded hard forward, both hands down toward the deck, feet unmoved, and he rides out of it standing.** Two of the four are **held for more than a second**, which the previous three were not.
>
> ⭐⭐ **And row 16 gets its first counterexample, 0.2 s after the longest brace in the clip.** The brace is **not** "what a surfer does when he meets whitewater". It is what he does when he is **driving through** it. When he chooses to **hit** it, he does the opposite: he leans back, puts a hand up and throws the board. **The engine needs both, and the trigger that separates them is intent, not contact.**
>
> ⛔ **No contact instant could be timed** in any of the five — the foam arrives inside the rider's own spray. **This is a posture count, not an anticipation measurement.**

### 3.4 — ⭐ **IN EVERY DEEP FOLD, THE HEAD STAYS UP**

Four gridded 1:1 frames show the trunk at or near horizontal — **0.0000, 7.5333, 10.6500, 12.6167** — and in **all four the head is held up and level, looking along the board, not dropped with the chest.**

> ⭐ **This licenses the `hip over deck ÷ head` ruler's stated assumption on a sixth rider.** The calibration says that ruler is fold-invariant to 0.08 head-lengths **with the head upright at ≤20° elevation**, and drifts **+0.51 to +0.84 if the head goes with the chest**. **Four frames, one rider, one ride: the head did not go with the chest in any of them.**
>
> ⚠️ It is not a measurement of the head's angle — 45 px of head, no chin landmark worth the name. It is the sign of the head's attitude, which is all the ruler's assumption needs.

### 3.5 — The arms carry the clip, as in V7, V8, V9 and clip 21

| carriage | measured instances |
|---|---|
| **both hands low, below the shoulder line, over the deck** | 6.2500 (−51 / −61), 11.0500 (−31 / −73), 12.6167 (−57 / −77) — **and it is the posture of all four foam passages** |
| **one hand above the shoulder line, the other low** | 1.6667 (+21 / −24), 8.4500 (+53 / —), 11.3500 (+58 / —), 11.5500 (+60 / —) |
| **both hands level, extended out** | 11.1500 (−13 / −43) |

> ⭐ **"Both hands carried low over the deck with the trunk folded" (row 15) is again the clip's most common carriage** — V7, V8, V9, clip 21 and now this. **Fifth clip.**

---

## 4. What could not be seen

- **No horizon in any frame examined.** The lens looks from the water's edge back at the land; palm grove, sand, buildings and water fill the content band top to bottom. **Every absolute pixel length here is valid only within its own frame.** The only cross-frame quantities quoted are **signs** (above/below the shoulder line) and **durations**.
- **A slow zoom**: the rider's crown-to-sole goes 136 px at 6.25 to 165 px at 11.05, a **21 % change**, so no cross-frame height is comparable.
- **136–165 px of rider, 45 px of head, 12–18 px of foot, 9–40 px of board width.** **Resolution is the binding constraint in this clip**, which is unusual for the series — clip 21's limits were bearing and spray. Here the rider is simply small.
- **Neither end of the board is clear of spray, foam or the frame edge in any frame examined.**
- **4–8 paddlers in the band at all times**, and the automated finder locked onto one in 5 of 189 frames.
- **The last ≈0.06 s does not decode** (§2.1), so the ride is read to 12.6167 of 12.681.
- **Which way the rider is travelling** (§0.6) — unresolved, by four routes that split two–two.

---

## 5. The rows this clip moves, and how

| row | moves? | how |
|---|---|---|
| **16 — meeting whitewater** | ⭐⭐ **STRENGTHENED 3 → 7, AND GIVEN ITS FIRST COUNTEREXAMPLE** | Four more forward braces in one ride (two of them **held >1 s**, which none of the previous three were), all answered identically: trunk folded hard forward, both hands down, feet unmoved, ridden out standing. **And 0.2 s after the longest of them the same rider meets the same foam and leans BACK into a layback snap.** The brace is what a rider does *driving through* foam, not what he does *meeting* it |
| **4 — arm carriage is its own channel** | ⭐⭐ **STRENGTHENED on a sixth rider, and clip 21's refutation reproduced in a cleaner control** | A hand is above the shoulder line in **4 of 8 measured frames and all four are TURNS — in a clip containing no fall at all.** Clip 21 needed a rider who also fell; this one has no confound. **And the two hands disagree in 5 of 5 frames where both were readable** (7–27 % of stature; clip 21: 43–63 %) — **never zero, on two independent riders** |
| **the fall/recovery evidence (no row yet)** | ⭐⭐ **A THIRD INSTANCE — AND IT BREAKS WHAT THE NUMBER MEANS** | **0.433 s** lowest-to-standing and **0.667 s** onset-to-standing, both endpoints on gridded 1:1 frames at the native 1/60 grid. Lowest-to-standing is now **0.433 / 0.48 / 0.733 s** (plain median 0.48, n = 3, three riders). ⭐ **But this one is a deliberate layback, not a save — and it is the FASTEST of the three. The duration cannot distinguish a manoeuvre from a recovery**, so no engine state or eval may be built on it as if it could |
| **15 — both hands low over the deck** | ⭐ **STRENGTHENED, fifth clip** | Measured on three gridded frames and the posture of all four foam passages |
| **18 — head and gaze** (adjacent) | ⭐ **A USABLE SIGN, FOR THE FIRST TIME** | No angle (45 px of head). **But four gridded frames with the trunk at or near horizontal all show the head held UP, not dropped with the chest** — which is exactly the condition the `hip over deck ÷ head` ruler needs, now checked on a sixth rider |
| **the series' footage ask** | ⭐⭐ **SHARPENED** | Clip 21 asked for raw footage. **This clip IS raw — one unbroken 12.68 s take, no cuts — and still has no take-off, because it was trimmed to start after he stood.** The ask must be *footage that starts before the rider is on his feet*, not *raw footage* |
| **17 — the feet** | ⚠️ **NOT STRENGTHENED — AND A CAUTION ADDED** | Two attempts, **0.54 and 0.76, non-overlapping**, with the series' band between them; the second implies an impossible stance, so a landmark is wrong. **No ratio published.** ⚠️ And the ratio is defined *from the nose*, while this clip could not settle which way the rider was travelling — **no read in the series has ever stated how it identified the nose.** Future reads should publish **two frames per clip** and show they agree |
| **8 — turns chained at a rate** | ⚠️ **TOUCHED, NOT QUANTIFIED** | ⭐ The series finally has an unbroken ride to measure a rate on — and **4 identifiable direction changes in 12.62 s, ≈1 per 3.2 s**, is an **eye count at 0.1833 s on a 136-px rider**, so it is a lower bound on the rate. **No rate published.** The real finding is the remainder: ~8 of 12.6 s is spent **driving through broken water**, which is neither trim nor a manoeuvre and has no name in the engine |
| **1, 2, 6 — the trunk channel** (adjacent) | ⭐ **A NEW KIND OF NUMBER** | **45 % of 65 survey tiles across one whole ride show a pronounced forward trunk fold**, 21 % upright, 11 % reclined — and **all 7 reclined tiles are inside the two turns.** A posture count, not an angle; it names no rung and is not offered to row 3 or 14. But it is the first time the series can state a **duty cycle** for the trunk over a complete ride |
| **3, 9, 10, 11, 12, 13, 14, 19** | ⛔ **CANNOT TOUCH** | §1. No horizon anywhere ⇒ stature unlicensed; board aspect ≥4.7 on four frames ⇒ leg chain refused; no waistband ⇒ no hip; the one loaded-hand candidate is inside spray |

### What this clip says against the brief it was given

1. ⭐⭐ **"Highlight edits never contain a take-off" was the right observation and the wrong diagnosis.** This clip is **not** a highlight edit — it is a single unbroken camera take, proved three ways — **and it still has no take-off.** The cause is trimming, not editing. **Asking for raw footage will not fix it; only footage that begins before the rider stands will.**
2. ⭐⭐ **The brief asked for "a FALL or a RECOVERY — a third would make those a population rather than a pair." It got a third, and the third refutes the pair's interpretation.** A **deliberate layback** returns to standing in **0.433 s** — faster than either event the series classified as a loss (0.48, 0.733). **The recovery time is not a recovery signature.**
3. ⭐ **The brief's gate precondition is now a property of the shot type, not a one-off.** Clip 21 found that board aspect needs a whole board and never showed one. **Neither does this one, on four frames.** Two consecutive beach-shot clips, zero whole boards. **A beach shot does not produce one.**
4. ⭐⭐ **The feet — the series' most reproduced number — rest on an unstated landmark decision.** This is the first read to attempt **two** ratios in one clip; they disagree by 0.22, which is four times the width of the 0.55–0.60 band. And the ratio is measured *from the nose*, while **four independent routes in this clip split two–two on which way the rider was even going.** The band may well be right; but **no contributing read has said how it knew which end was the nose**, and that should be fixed before it is quoted again.
5. ☠️ **A stale-frame guard built on "compare with the previous frame" is not a guard; it can fabricate data.** Mine nudged by seeking backwards, which planted an 11.35 s frame under a 12.65 s label and passed its own check. **Only comparing against every hash seen in the session caught it**, and it had already been written into a draft as a second event.
6. ☠️ **High correlation is not evidence when the backdrop is periodic.** A coconut grove aliased a cross-correlation pan tracker, its direct-versus-summed self-check **aliased identically and certified it**, and the tracker was discarded only because the check later failed at other epochs. **Measure the backdrop's spatial period before trusting any correlation tracker, and never let a self-consistency check substitute for that.**
7. ⭐ **A hidden pane does not invalidate a measurement — only the screenshot of it.** `drawImage` kept decoding new frames correctly while `document.hidden` was true; the compositor froze and `requestAnimationFrame` stopped. **The numbers were sound and the pictures were lies, which is the reverse of the assumption the series has been working under.**
