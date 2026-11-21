# Video reference 14 (Erin Brooks, Bali): a leg pump at 0.22 s a half-cycle, two arm leads both off the top, and a trunk gate that does not transfer between clips

Source: **https://www.youtube.com/shorts/8d_lrXoiRa4**, title *"Erin Brooks On Her Last Wave #surfersofbali #surfingbali #surfer"*. Length **18.781 s**, read in full. The **fourteenth** reference the owner has sent, and the last one queued.

Delivered to the browser pane at **1080×1920** (`hd1080`), which is this clip's **published ceiling** — `getAvailableQualityLevels()` returns `["hd1080","hd720","large","medium","small","auto"]` and nothing above it. Stream is **25 fps, measured twice** (§5.3), `playbackRate` 1. `yt-dlp` and `ffmpeg` are both absent from this machine (checked, as the skill asks), so nothing was downloaded; every frame is a screenshot of the browser pane, **tab `tab-2`**, claimed with `tabs_create` and passed explicitly on every call. The pane was **shown**, not hidden, for every measurement.

**Every figure below is an estimate from pixels**, and each carries its own error bar.

---

## 0. The answer first

### 0.1 — What this rider's movement actually is

**She rides one continuous 16.6-second wave, visible in every frame of it, pumping with her LEGS at about four half-cycles a second while her trunk stays folded, and she puts an arm above her head exactly twice — both times at the top of the wave, never at the bottom.** The clip's own sentence is that the body does a great deal and almost none of it is a pose held still.

| window | status | what the body does |
|---|---|---|
| **0.00–1.5** | lineup | several surfers paddling; the ride is not yet legible as hers |
| **1.60–2.70** | readable, rider small | riding the face, **trunk folded hard forward, both hands low over the deck** throughout |
| **2.70–2.85** | readable | **trunk un-folds and legs extend together** — she comes up tall, arms out |
| **3.10–4.85** | readable | climb at ~3.45, drop at ~3.7, then low trim; arms low and spread |
| **4.9–6.2** | readable, **rider small (~100–150 px)** | climbing to the lip and riding high under it. ⚠️ **Not obscured — see §0.3** |
| **6.24–6.44** | readable, native 0.04 s | **rear arm thrown above the crown, body deeply folded and compressed, in the broken lip.** Held ≥0.20 s |
| **6.48–6.76** | readable, native | arm comes down and forward past the rail; trunk stays folded; board reverses at **6.60 ± 0.04** |
| **6.76–7.70** | readable | the drop down the face and the bottom; **both hands low over the deck**, trunk folded |
| **8.10–9.35** | readable | high on the face under the lip, driving; **both hands low over the deck for ~1.2 s** |
| **9.6–10.4** | readable | descending to the bottom |
| **10.45–11.35** | **the clip's best passage** — readable at native 0.04 s, rider ~190 px | **trim with no direction change and a visible leg pump** (§0.4); 5 carriages pass through it |
| **11.6–12.44** | readable, camera zoomed out | trim; at 12.36–12.40 both arms out at head height, legs extended |
| **12.48–12.96** | readable, native | **bottom turn into a climb**; no overhead arm at entry |
| **12.84–13.04** | readable, native | **rear hand above the crown at 12.84 ± 0.04; the board's heading reverses at 12.98 ± 0.04. Lead = +0.14 s ± 0.06**, held ≥0.20 s |
| **13.08–14.12** | readable | the descent and recovery; **body unchanged across 13.52–14.12, 0.60 s, 6 samples at 0.12 s** |
| **14.3–15.5** | readable | in the whitewater, crouched, hands low |
| **15.50–15.98** | readable, rider ~215 px | **the stand-up: legs extend and trunk un-folds together, 0.48 s** |
| **15.98–17.35** | readable, the clip's sharpest | **standing tall, arms down at the sides, held ≈1.4 s** — the longest single carriage |
| **17.4–18.1** | readable | she bends, the board bogs in the foam, and she steps off |
| **18.2–18.78** | — | foam only; the ride is over |

### 0.2 — The rider's size in source pixels, stated before anything was spent

| | |
|---|---|
| **Head length** (hair-top to chin, hand-measured, 5 frames) | **20–31 source px** |
| **Head-to-foot extent in frame** | **≈120–290 px**, varying with a camera that zooms through the ride |
| **Camera** | **from the beach, side-on to slightly oblique, height unknown** (§5.5) |
| **Comparison** | **the smallest rider of the last four clips** — clip 13's head was **73–102 px**, three times this one's |

> ⚠️ **This single fact decides which rows this clip can and cannot move.** At a 20–31 px head, a joint landmark carries **±3–5 px**, so any ratio built on head length carries **±15–25 %**. Arm position, which is a whole-limb feature at 40–90 px, survives that. **Trunk angle and the leg split do not** (§2.1, §3.1).

### 0.3 — ⚠️ Two of my own readings, corrected before publication

Both are the clip-13 lesson arriving again, and both are recorded because the first version of each would have been published as data:

1. **"The rider is obscured at 5.6–6.1, 7.6–7.9, 8.1 and 12.2–12.5."** **False.** Those were frames where my blob tracker lost her, not frames where she is hidden. **Checked on full frames at 5.30, 5.50, 5.70, 5.90, 6.10, 7.60, 7.80, 8.10, 12.20, 12.28, 12.48 — she is plainly visible in all eleven.** She is simply small, and the camera is zoomed out. **This clip has no blackout anywhere in the ride.**
2. **"Only the board is visible at 6.64–6.68."** **False, same cause.** Re-run with the global finder, **6.56, 6.60, 6.64, 6.68, 6.72 and 6.76 all show the whole rider** low over the board with the lead arm past the rail.

> **The rule this re-confirms: a visibility claim needs full frames, and a tracker's failure is not the subject's absence.** Three of clip 13's twelve tiles were the wrong person; four of my tracked windows were the wrong *place*. **Check the subject of every tile, and when a tile looks empty, go and look at the whole frame.**

### 0.4 — ⭐ The headline: this rider pumps with her LEGS, and the published 0.55–0.60 s trunk period is not what is on screen here

**Window 10.45 → 11.33, 0.88 s, no direction change, sampled at the native 0.04 s grid for its first half and 0.08 s for the rest.**

| phase | what the knees do | what the trunk does |
|---|---|---|
| 10.45 → 10.61 (0.16 s) | **bent → visibly straighter** | folded ~55° → ~45° |
| 10.61 → 10.85 (0.24 s) | **straight → visibly lower**, hip over deck drops | folded ~45° → ~60° |
| 10.85 → 11.09 (0.24 s) | **lower → taller** | ~60° → ~45° |
| 11.09 → 11.33 (0.24 s) | **taller → bent again** | ~45° → ~55° |

**Four leg half-cycles in 0.88 s — about 0.22 s each — in trim with no direction change.** The trunk never leaves the 40–60° band and **completes no fold/unfold cycle of its own** in that window.

**This disagrees with `engine-target` row 6 and I am leading with the disagreement, as the skill requires.** Row 6's target is **0.55–0.60 s per half-cycle, in the TRUNK, with the legs not doing the work** — from V8 (4 half-cycles in 2.9 s) and V9 (4 in 2.3 s), *"the most reproducible figure the series has."* Here the period is **2.5× faster and in the other channel.**

**Two readings of that, and I cannot choose between them:**

- **(a) It is a real difference** — a different rider, a smaller wave section, a different kind of trim. Then row 6's target is a range, not a figure, exactly as row 8's turned out to be.
- **(b) V8's and V9's "the legs are not doing the work" half was never measured.** Both read it off the **leg chain at 99–100 %**, and `engine-target` §4.1 already marks that half ⚠️ **SAT** — clips 11, 12 and 13 all showed the chain reading ~100 % on knees anyone can see are bent. **On this clip the knee bend is visible as a joint and the legs are plainly cycling.** If (b) is right, then the period difference may also be an artefact: a trunk reading taken where the legs were invisible.

**What is NOT in doubt either way:** in this window the **legs move and the trunk does not complete a cycle**, which is the **opposite of what row 6 asks the engine to express** — and, usefully, **it is the one thing the game's pump already does**, because the game's pump *is* leg depth.

### 0.5 — ⭐ The second headline: both arm leads are at the TOP of the wave, and all four misses are at the bottom

| # | direction change | section of the wave | resolution | rear hand above the crown before the board reverses? |
|---|---|---|---|---|
| 1 | ~3.45 climb | open face, mid | 0.25 s — **weak** | no |
| 2 | ~3.70 drop | open face, mid | 0.25 s — **weak** | no |
| 3 | ~5.0–5.3 climb | under the lip | **not resolved** | — |
| 4 | **6.60 ± 0.04, off the top** | **in the broken lip / foam** | **0.04 s, 14 frames** | ⭐ **YES.** Above the crown from **≤6.24** (earliest frame sampled) through **6.44**, down by **6.60**. **Lead ≥ +0.16 s, held ≥0.20 s** |
| 5 | ~7.50 bottom turn | open face, bottom | 0.10 s | **no** — both hands low over the deck throughout |
| 6 | ~9.20 drop | high on the face | 0.08 s, 6 frames | **no** — both hands low over the deck throughout |
| 7 | **12.48 ± 0.06, bottom turn into the climb** | open face, bottom | **0.04 s, 6 frames** | **no.** Both hands are at **head height** at 12.36–12.40, neither clearly above the crown — **borderline, and recorded as borderline** |
| 8 | **12.98 ± 0.04, top turn / re-entry** | **open face, at the lip** | **0.04 s, 10 frames** | ⭐ **YES.** Above the crown at **12.84 ± 0.04**, vertical by 12.88–12.96, board reverses at **12.98 ± 0.04**. **Lead = +0.14 s ± 0.06**, held ≥0.20 s (12.84 → 13.04) |

**2 of 6 resolved direction changes.** The measured lead (**+0.14 s**) sits inside the series band (V8 0.1–0.2 s, V9 0.07–0.30 s, V12 0.04–0.12 s, V13 +0.18 s).

> ⚠️ **And the shape of it contradicts clip 13's shape.** Clip 13 found its one lead **on the open face where the rider set his line**, and its three misses **all inside the slab** — so "open face ⇒ lead, inside the wave ⇒ no lead." **This clip has a lead INSIDE the broken lip (#4) and a miss on the open face at the bottom (#7).** The factor that separates leads from misses here is **not open-face versus slab — it is top of the wave versus bottom of the wave.** Both leads are off the top; all four misses are bottom turns, drops, or driving along the face.
>
> **Two clips, two different separating variables, one shared conclusion:** the lead is **conditional**, and the condition is **not leg depth**. Whatever the engine builds must be able to lead **and** able not to, selected by something about the manoeuvre.

Running tally across the series: was **11 of 15 across five clips**; with this clip **13 of 21 across six clips**.

---

## 1. ⚠️ What this clip CANNOT touch, and why — the honest half

This is stated before the measurements rather than after, because for four rows it is the whole result.

| row | verdict | the reason, named |
|---|---|---|
| **2 — trunk travel** | ⛔ **no admissible angle anywhere** | §2.1. At a **20–31 px head**, and with a rider in a **bikini bottom rather than boardshorts**, the gate's calibration does not hold and its numeric band does not transfer. **No trunk angle from this clip may be quoted.** |
| **3 — opposite-sign channels** | ✅ **moved, but only on signs** | §3.3. Eight transitions resolved; the trunk is read **qualitatively** (visibly more/less folded), never as an angle. **Zero opposite-sign instances.** |
| **10 — the two legs' split** | ⛔ **not measurable** | §3.1. **Two frames attempted, four legs, four refusals** by the thigh/shin gate (0.71, 0.85, 1.19, 1.41). **Row 10 stays at V8's one clip, two frames — fourth clip running that could not touch it.** |
| **14 — where a rider lives on the ladder** | ⛔ **no rung named**, sixth clip running | §3.1. The leg chain reads **95.9–99.9 % ⚠️ SAT** on a visibly deep crouch *and* on a visibly straight leg. The lens height is unknown, so head-length rulers are not licensed either. |
| **17 — foot travel** | ⛔ **not a measurement** | §4.2. **The board carries no visible landmark** — no logo, no stringer, white against foam — so "no steps seen" here is an impression, not a count. |
| **18 — head yaw vs the board** | ⚠️ **half of it arrives, and it is the half nobody had** | §4.3. The **board's nose is legible** in ≥6 frames and the **head's facing direction is legible from the silhouette** in the same frames — but **the face is not resolvable at 5.5× magnification** (no eye, no nose, no mouth at a 30 px head). **No angle is reported.** |

---

## 2. The two method findings

### 2.1 — ⭐ THE TRUNK ADMISSIBILITY GATE IS NOT TRANSFERABLE BETWEEN CLIPS, AND THIS CLIP SHOWS WHY

Clip 13 gave the series a per-frame gate: **projected shoulder→waistband ÷ head length**, with an in-plane expectation of **1.6–1.8**, derived from standard proportions (acromion ≈ 0.82 of stature, **boardshorts waistband ≈ 0.60**).

I ran it. **Both of my most clearly vertical trunks read ABOVE the band, not inside it.**

| t | what the frame shows | shoulder→waistband (px) | head (px) | ratio |
|---|---|---|---|---|
| **16.600** | standing, trunk visibly near-vertical | 63 ± 6 | 31 ± 4 | **2.03** |
| **12.360** | standing tall, trunk visibly near-vertical | 55 ± 6 | 26 ± 4 | **2.11** |
| **12.520** | visibly folded far forward | 69 ± 8 | 19 ± 4 | **3.6** — physically impossible; the landmarks are wrong |

**Two causes, and they are different in kind:**

1. **The landmark is not the same garment.** This rider wears a **bikini bottom / high-cut suit**, whose waistband sits lower on the torso than boardshorts. A waistband at ≈0.56 of stature instead of 0.60 moves the expected ratio from **1.69 to ≈2.0** — which is exactly where my two vertical frames landed. **The band 1.6–1.8 is a property of boardshorts, not of anatomy.**
2. **At a 20–31 px head the ratio's own error is ±0.25 to ±0.5**, which is as wide as the gap between "admissible" and "refused".

> **The correction this clip asks for, stated so it can be quoted: the gate must be run WITHIN a clip, against that clip's own most-vertical frame, not against an absolute 1.6–1.8 band imported from another rider in different shorts.** Clip 13's finding — that a gate is needed at all, and that no visibly-folded frame has ever passed one — **stands untouched.** What does not transfer is **the number**.

**And clip 13's second half holds here too.** The 12.520 row above is the demonstration: a trunk anyone can see is folded produced a shoulder→waistband *longer* than the vertical frames', because my "head" and "hip" were not the head and the hip. **I am publishing no trunk angle from this clip, and no trunk span.** The series still has **no gated measurement of trunk angular travel anywhere**, now across fourteen clips.

**This does not weaken `engine-target` rows 1 and 2.** Their case is `HumanoidRig.ts:1383–1385` — the drawn trunk is a one-line function of drawn leg depth — which is a code reading and needs no camera.

### 2.2 — The staleness probe, run and passed

The skill's out-of-order probe (clip 13's §2.2) was run before any measurement: ten seeks in the shuffled order **12.0, 3.0, 12.0, 7.5, 3.0, 16.0, 7.5, 16.0, 1.0, 12.0**, differencing all 45 pairs.

- **Six same-time pairs: difference exactly 0** — the decode is deterministic.
- **Thirty-nine distinct-time pairs: 21.2 to 60.1, none zero.**

Decode was live. It was re-checked implicitly on every frame-grid measurement (§5.3), each of which depends on frames differing where they should.

Two incidental notes for the skill: **this clip's player exposes only one `<video>` element** (clip 13's two-element trap did not fire), and **no consent gate appeared**.

---

## 3. The body channels

### 3.1 — Leg depth: **no rung named**, sixth clip running — and the clearest demonstration yet of *why*

**(a) The leg chain, with clip 12's thigh/shin admissibility gate. Two frames, four legs, four refusals.**

| frame | what the eye sees | leg | thigh/shin (anatomy ≈ 1.0–1.1) | leg chain | admissible? |
|---|---|---|---|---|---|
| **t = 11.350** | a **deep, side-on crouch**, both knees unmistakable, rider ≈ 190 px | front | **1.41** | 95.9 % ⚠️ **SAT** | **no** — shin foreshortened |
| | | rear | **1.19** | 95.9 % ⚠️ **SAT** | **no** — marginal |
| **t = 16.600** | **standing, legs visibly straight**, both bare legs separated, rider ≈ 215 px, the clip's sharpest frame | front | **0.71** | 99.9 % ⚠️ **SAT** | **no** — thigh foreshortened |
| | | rear | **0.85** | 99.9 % ⚠️ **SAT** | **no** |

> **The two frames are the demonstration.** One shows a rider **deep in a crouch**; the other shows her **standing straight**. **The leg chain cannot tell them apart — 95.9 % against 99.9 %, four points, on a posture difference anyone can see from across a room.** This is V9's saturation, reproduced for the **sixth** clip, and here with the deep and the straight frame **measured side by side in the same clip with the same method**.

**Six refusals, six clips, and now five distinct causes:** projection saturation (V7–V9), raised lens plus boardshorts (V10), resolution plus limb overlap (V11), thigh-at-the-lens from behind (V12), projection again on water-level side-on footage (V13), and here **both ends foreshortened at once on the same rider 5 s apart** — the thigh at 16.600, the shin at 11.350.

⚠️ **Every hip above was inferred, not seen** — placed from the waistband line. A ±15 px hip error moves the thigh/shin ratio by about ±0.3, which is wide enough to swallow the 1.19 marginal case. **The saturation conclusion survives it** (hip, knee and ankle are near-collinear in projection whatever the exact hip), **the refusals are robust** (0.71 and 1.41 are far outside the band), **and the split is not reportable at any error bar.**

**(b) Row 10, the split: NOT MEASURED, and I will not estimate it.** The two chains read **95.9 / 95.9** and **99.9 / 99.9** — a difference of **0.0 points in both frames** — but every leg is inadmissible, so **0.0 is a number about the camera, not about the rider.** **Row 10 stays at V8's one clip, two frames.**

**(c) Hip-above-deck ÷ head length: used only for signs, never for a level.** Clip 13 found this ruler moves with **stance width**. This clip adds a second confound: **the camera zooms continuously** (head 20 px at 12.92, 31 px at 16.600), so no apparent size may be compared across frames without normalising, and the normaliser is itself ±15–25 %. Where I quote it below it is **only to corroborate a knee bend the eye already sees in the same window**, never to name a depth.

**(d) Qualitatively**, the knees are flexed for most of the ride. The deepest-looking moments are **2.10–2.70, 6.24–6.60, 7.40–7.70 and 13.52–14.12**; the straightest are **15.98–17.35**, held ≈1.4 s with the trunk vertical. **No rung is named for any of them.**

### 3.2 — Trunk fold: §2.1 is the result

**No admissible angle, no span, nothing quoted.** Everything the trunk does below is reported as a **direction** — visibly more folded, visibly less folded, or visibly unchanged at the stated sampling interval.

### 3.3 — Opposite-direction channels: eight resolved transitions, none opposite-sign

| window | length | samples | leg depth | trunk fold | verdict |
|---|---|---|---|---|---|
| **2.60 → 2.85** | 0.25 s | 3 at 0.10–0.25 s | extends | un-folds | **same sign (up)** |
| **6.24 → 6.60** ⭐ | 0.36 s | 10 at **native 0.04 s** | compressed, held | folded, held | **frozen — both channels, through a foam impact** |
| **10.45 → 10.61** | 0.16 s | 5 at **native 0.04 s** | extends | un-folds slightly | **same sign (up)** |
| **10.61 → 10.89** | 0.28 s | 8 at **native 0.04 s** | lowers | folds further | **same sign (down)** |
| **11.01 → 11.33** | 0.32 s | 5 at 0.08 s | bends | folds further | **same sign (down)** |
| **12.36 → 12.56** | 0.20 s | 6 at **native 0.04 s** | bends | folds | **same sign (down)** |
| **13.52 → 14.12** | 0.60 s | 6 at 0.12 s | bent, held | folded, held | **frozen — both channels** |
| **15.50 → 15.98** | 0.48 s | 5 at 0.12 s | extends | un-folds | **same sign (up)** |

> **Eight resolved transitions, three same-sign up, three same-sign down, two frozen, zero opposite-sign.** With the series' existing 18, that is **26 resolved transitions across four riders and four clips with no instance.**
>
> **V9's opposite-sign passage is therefore SINGLE and four-times-not-reproduced.** It remains the right **acceptance test** for `engine-target` rows 1–2 — an engine that cannot do it cannot do the thing V9 filmed — and it is **not** a frequency claim. **Another zero is informative and this is the fourth.**

**The frozen count also keeps growing**, and this clip's two are the longest and densest so far: **0.36 s at the native frame grid through a foam impact**, and **0.60 s at 0.12 s** immediately after a re-entry. Both are frozen **at the stated sampling interval**, not provably frozen.

### 3.4 — Pump: §0.4 is the result

**Four leg half-cycles in 0.88 s (≈ 0.22 s each) in trim with no direction change**, judged on visible knee bend at the native 0.04 s grid, with **no completed trunk cycle** in the same window. **This is the opposite channel and 2.5× the rate of row 6's target**, and §0.4 gives the two readings of that and declines to choose.

### 3.5 — Arm carriage: five carriages, four of them at one leg state

Only windows sampled at **≤0.25 s** are counted, and the interval is given for each.

| carriage | verified windows (sampling interval) | count |
|---|---|---|
| **A — both hands low and forward over the deck**, inside the rails | 1.85–2.70 (0.10–0.25), 4.10–4.85 (0.25), 7.00–7.70 (0.08–0.10), 8.10–9.35 (0.08), 13.32–14.12 (0.08–0.12), 15.50–15.86 (0.12) | **6 windows, the clip's most common — roughly 4.5 s of readable riding** |
| **B — lead arm reaching forward-down past the rail**, rear arm back and low | 6.48–6.76 (**0.04**), 9.60–10.45 (0.25), 11.60 (0.25) | 3 |
| **C — both arms low and spread, roughly level** | 3.35 (0.25), 3.85 (0.25), 10.77–10.93 (**0.04**) | 3 |
| **D — both arms down at the sides, hands by the hips, trunk vertical** | 15.98–17.35 (0.25), held **≈1.4 s** | **1 — the longest single carriage in the clip** |
| **E — rear arm extended above the crown** | **6.24–6.44 (0.04, held ≥0.20 s)**, **12.84–13.04 (0.04, held ≥0.20 s)** | **2** |

**Distinct carriages reachable at one leg state: 4** — A, B, C and E all occur with the knees **visibly flexed**. At the visibly extended leg state (15.98–17.35) the carriage is **D**, which occurs nowhere else.

**Carriage A reproduces `engine-target` row 15 on a SEVENTH clip** (V7 4 windows, V8 5, V9 6, V11 4, V12 ≥8, V13 6, here **6 verified at ≤0.25 s**). The hands are over the **deck**, usually both at once.

**And carriage D is a direct hit on row 4's refutations, from a new direction:** the clip's **straightest-legged, most upright** passage has the **lowest, narrowest** arms of the whole ride — hands hanging by the hips for 1.4 s. **Seventh clip to refute "tall ⇒ arms spread"**, and this time with the longest-held carriage in the clip.

### 3.6 — Arm timing: §0.5 is the result

**2 leads in 6 resolved direction changes**, both at the top of the wave, all four misses at the bottom, and the separating variable **differs from clip 13's**. One other overhead event has no turn attached in this clip — unlike clip 13, **every overhead arm here is attached to a turn.**

---

## 4. The fore-aft axis, the feet, and the head

### 4.1 Hips aft, shoulders forward — 5 frames, and the forward head reproduced

On every frame where both landmarks could be placed **and the board's nose direction was identifiable** — **10.450, 10.610, 11.350, 15.500, 16.600** — the **shoulders sit forward of the hips toward the nose**. **5 frames**, reproducing V1, V7, V8, V9, V10, V11, V12 and V13. **Direction and sign only; no magnitude**, as in every previous clip.

**V12's and V13's head-forward finding reproduces for a third clip.** At **t = 11.350** the head sits clearly **forward of the shoulder line** over the front foot, and the same is visible at 10.450 and 10.610. **No magnitude is given** — at a 30 px head the offset is 2–3 head-widths of pixels and I will not put a number on it.

### 4.2 Feet: ⛔ not measurable, and the reason is new

No foot change was seen in the windows where both feet and the deck were legible. **But I am not recording that as a count, and the reason is worth adding to the series:** this board is **white, unmarked, and spends most of the ride inside foam or spray**. Rendered at **3.8×** at 10.450 and 10.850 the deck is a featureless bright blur — **no logo, no stringer, no rail graphic** to measure a foot against. V7's 44–49 % count was possible because that board had rail logos. **Here it is not. "None seen" is an impression.**

### 4.3 Head and gaze — the half of row 18 nobody had, and still no angle

- ⛔ **The face is NOT resolvable.** At **t = 16.600 and 17.100, rendered at 5.5×**, the head is a blurred mass with hair. **No eye, no nose, no mouth, no chin edge.** The head is 20–31 px, against clip 13's 73–102 px.
- ✅ **But the board's nose IS legible**, clearly, in at least six frames between 15.5 and 17.1 — and in those same frames **the head's facing direction is legible from the silhouette and the fall of the hair**.
- In **5 frames sampled at 0.25 s between 15.98 and 17.10**, the head is **turned toward the board's nose, along the direction of travel**, and appears **pitched slightly down**. The head does not swivel away from the board's heading in any of them.

> **So row 18 gets its first frames with the board's nose and the head's orientation legible together — and still no measurement, because the limiting feature is the face and it is three times too small here.** The next footage ask is unchanged and now sharper: **a frame with the board's nose legible AND a head of at least 60 source pixels.** Clip 13 had the head and not the nose; this clip has the nose and not the head.

---

## 5. The source, and what the numbers are worth

### 5.1 Delivery

`#movie_player` does not exist on a Short; the player is `#shorts-player`. `getAvailableQualityLevels()` returns **`["hd1080","hd720","large","medium","small","auto"]`** — **1080p is this clip's hard ceiling**, with no `hd1440` or `hd2160` to try. `hd1080` was pinned with `setPlaybackQualityRange` and confirmed with `getPlaybackQuality()`; `videoWidth/videoHeight` = **1080×1920**. **No consent gate appeared.** One `<video>` element only.

> **Fifth clip, fifth different ceiling** — V11 1080, V12 a fictitious 2160, V13 a real 1440 with a frozen 2160, and here a flat 1080 with nothing above it. **Ask the player; never assume.**

### 5.2 Pane geometry — clip 12's and clip 13's result reproduced a third time

At a **1280×1000** viewport the screenshot came back **800×625**, canvas→screenshot scale **0.625**. **At 800×640 the screenshot is 800×640 and the scale is exactly 1.0.** Measured in a third independent session; **it is now a fact, not an observation.** Stream quality was taken at the large viewport and every frame at the small one.

**One addition.** `__S.sheet`/`__S.gSheet` initially returned sheets with the **last two to five tiles blank**, which looks exactly like the skill's composited-canvas failure. **A 2.5 s wait inside the draw function, before the screenshot, fixed it completely and permanently.** It is the skill's own 2.2–2.5 s rule, and the fix belongs **inside the drawing function**, not between tool calls — otherwise it is forgotten on every new sheet.

### 5.3 The frame grid: **25 fps, measured twice and cross-checked**

Seeking on a **0.005 s** grid and hashing the decoded frame:

- **8.000 → 8.210:** the picture changes at **8.045, 8.080, 8.125, 8.160, 8.205** — intervals 0.035 / 0.045 / 0.035 / 0.045, mean **0.040**.
- **12.000 → 12.210:** changes at **12.000, 12.040, 12.080, 12.120, 12.160, 12.200** — **exactly 0.040, five intervals, no drift.**

Cross-check by duplicate counting over a moving span from t = 5.0: stepping at **1/25 = 0.040** gave **0 duplicates in 9 steps**; stepping at **1/30 = 0.0333** gave **2 duplicates in 9 steps**.

**25 fps. Native frame = 0.040 s**, which is the resolution behind every timing in §0.5.

> ⚠️ **Had I assumed 30 fps I would have sampled duplicates and read them as a motionless rider** — which is precisely the error the skill records against clip 10, the other 25 fps clip in the series. **Two of fourteen clips are 25 fps; four different rates have now appeared.**

### 5.4 Slow motion: **not excluded as rigorously as clip 12**; two grounds, neither a measured gravity

1. **Durations.** The stand-up runs **15.50 → 15.98 = 0.48 s**; the bottom-turn-to-re-entry sequence runs **12.48 → 13.32 = 0.84 s**, against published figures of **0.96 ± 0.04 s** for a bottom turn and **0.8 ± 0.03 s** for a cutback. At 2× slow these would be 0.24 s and 0.42 s, which no body does.
2. **Motion blur.** The spread hands at 10.850 and the spray sheets at 13.00 are **visibly blurred**, consistent with a short shutter at 25p and inconsistent with a high-rate capture played slow.

**What I could not do:** the board never leaves the water and never passes through vertical, so **no ballistic and no rotation-rate check was possible**. **Verdict: at or near real time, on duration and blur only.**

### 5.5 It is ONE SHOT — no cut anywhere in 18.781 s

A whole-clip trace at **0.1 s** (**188 samples**, 24×42 luminance grid) gives frame-to-frame differences spanning **8.63 to 19.70**, median **12.1**. The largest, **19.70 at t = 5.6, is 1.63× the median** — against the **3–7× above local level** that clip 12's seven confirmed cuts produced. **No nominee exists to re-probe.**

One suspicion was raised and killed by hand: the rider appears far smaller at 12.28 than at 12.36 in tracked crops, which would suggest a cut. **Full frames at 12.24, 12.28, 12.32, 12.36, 12.40 and 12.44 show continuous motion, identical framing and the same lineup of paddlers in the background.** The apparent jump was my own mis-estimate of a tile's scale. **No cut.**

Independently, eleven windows were sampled densely and every one is continuous motion of the same rider, board, wave and lens drift: **6.24–6.76**, **10.45–10.89**, **12.36–12.56**, **12.56–12.76**, **12.76–12.96**, **13.08–13.48** at the **native 0.04 s**; **8.70–9.10**, **10.93–11.33** at 0.08; **13.52–14.12**, **15.50–16.10** at 0.12; and **1.60–18.10** at 0.25.

**One rider throughout:** dark one-piece or bikini top with bare arms and bare legs, long hair, white board. **The lineup behind her contains at least six other surfers**, two of whom my tracker locked onto at 12.20, 12.28 and 12.48 — **those three tiles are refused, not read.**

### 5.6 What the error bar is

- **Source 1080×1920** — this clip's ceiling. **Rider 120–290 px head-to-foot, head 20–31 px, thigh 40–68 px projected.**
- **The camera zooms and pans continuously**, so **no apparent size is compared between two frames without a head-length normalisation**, and every ratio is computed **inside a single frame**.
- ⚠️ **No trunk angle is published at all** (§2.1), and therefore no trunk rate and no trunk span.
- ⚠️ **No automated tracer was built.** Clip 11 built one, validated it, found it reading 9° where the hand read 39–43°, and discarded it.
- ⚠️ **No angle or posture claim anywhere comes from a survey strip.** Strips at 0.72–0.82× were used **only to find moments**; every measured frame was re-rendered at **1.55–5.5×** with a 10 or 25 px source grid.
- **Rider-centred crops were FIXED-SIZE** (240–360 source px at a fixed magnification per sheet), so the skill's auto-crop size trap could not fire.
- **Hip position** carries the skill's standing caveat — waistband ≈ 0.60 of stature, trochanter ≈ 0.53 — so **every hip figure is ±10–15 points however sharp the image**, and here every hip used was **inferred, not seen**.
- **The lens height is unknown.** The sea horizon is visible as a line in the upper third of the frame in the zoomed-out passages (e.g. 12.24–12.44), but the rider is 60–80 px there and I could not place her head against it reliably. **So head-length rulers are not licensed either way**, exactly as in clip 13.

---

## 6. Part C — what I could not see, and why

- **The face, in every frame of the clip.** Checked at **5.5×** on the two largest-head frames. **No facial feature at all.**
- **Any trunk angle**, and therefore any trunk rate or span (§2.1).
- **The two legs' split (row 10).** Four legs attempted, four refused. **No estimate given.**
- **Any leg-depth rung.** The chain saturates at **95.9–99.9 %** across a posture range anyone can see.
- **Foot placement on the deck** — the board has no visible landmark (§4.2).
- **Frontside versus backside**, and **regular versus goofy.** The camera angle changes through the ride and I could not fix the peel direction against her chest with confidence. **I am not reporting either.**
- **A measured-gravity check on playback speed** (§5.4).
- **Direction change #3 (~5.0–5.3)** — the rider is 100–150 px there and the board's heading is not legible frame to frame.
- **The take-off.** The ride is already under way when she first becomes identifiable at ~1.6 s.
- **Anything above 1080p.** The clip publishes nothing higher.

---

## 7. What this round did not do

- **No file under `src/` or `server/` was touched.** This is evidence, not a fix.
- **Nothing was built, ridden, benchmarked or measured in the game.** Every game-side statement is quoted from `3.5/engine-target.md` or `3.5/body-channels.md`.
- **No constant is proposed, and no stance rung is named for any frame.**
- **No trunk angle is published**, and no trunk span.
- **`engine-target.md` was not edited**, and the thirteen earlier video documents were not edited.
- **No automated tracer was built. No angle was read from a survey strip.**
- **No conclusion is drawn about the wave, the lip, the foam or the spray.** One line, because it is the context every number sits in: the wave is a medium-sized, fast, mostly open-faced right-hand point-style wall with one section that breaks over her at ~6.3 s and a long foam run-out after 14 s — **which is why the two overhead arms are at the top of the wave and why the long quiet carriage is on the inside.**

---

## 8. Part B — the mapping

Game-side entries are **code readings quoted from `3.5/engine-target.md` and `3.5/body-channels.md`**. **Nothing was built, ridden or benchmarked.**

| what the rider does | the game's name for it | have it / partly / not at all |
|---|---|---|
| **Four leg half-cycles in 0.88 s of trim with no direction change, ≈0.22 s each, trunk folded throughout** | `pump` | ⭐ **PARTLY — and this is the one row where the game is closer to the footage than the series said.** The game's pump *is* leg depth, which is the channel doing the work here. **What is missing is the rate** (0.22 s a half-cycle) **and that the trunk must stay folded while it happens** — impossible while `HumanoidRig.ts:1383–1385` slaves the drawn trunk to drawn depth |
| **Rear hand above the crown 0.14 s before the board reverses, held ≥0.20 s — on 2 turns of 6, both off the top** | entry to `top turn` / `carve` | **not at all**, and the conditionality is the point: **no arm position exists to lead with**, and the one orderable pair runs backwards (`MOTOR_LAG` 0.05 s vs `ARMS_TIME` 0.15 s, `KNEE_RETURN_TIME` 0.6 s) |
| **Four direction changes with NO arm lead, all at the bottom of the wave** | — | **n/a — and it is a constraint on what gets built.** A built lead must be **conditional**, and this clip's condition is **not** clip 13's |
| **Both arms down at the sides, hands by the hips, trunk vertical, legs straight, held ≈1.4 s** | — | **not at all.** `HumanBalance.arms` is one scalar with no height, no spread and no left/right, **capped by `stanceRoom(depth).arms`** — so the clip's straightest legs could not carry its narrowest arms |
| **Both hands low and forward over the deck in 6 verified windows, ~4.5 s of riding** | `hand` input | **not at all.** One hand, on/off, pointed at the water, side chosen by the game (`AttachedRider.ts:5720–5732`) |
| **5 carriages; 4 distinct at one leg state** | — | **not at all.** One pose per stage × depth |
| **A foam impact met with the body already folded and compressed, both channels frozen for 0.36 s at the native frame grid, and ridden out still standing** | — | **not at all** as a posture; row 16. The foam does reach the board (3.5e, five channels); **no brace posture exists** |
| **Nothing in the body changes for 0.60 s immediately after a re-entry** | — | **not at all** as an expressible state |
| **Trunk and legs rise together over 0.48 s to a full stand-up** | — | **partly.** "Together" is free by construction; **"legs first" and "trunk first" are both unreachable** |
| **Head and shoulders forward of the hips over the feet, 5 frames** | `trim` weight (W/S) | **not at all** as a differential. `TRIM_SHIFT = 0.25 m` moves pelvis, torso, head and both arms **together** (`AttachedRider.ts:5514–5518`) |
| **The head thrust forward of the shoulders** | — | **not at all**, third clip |
| **Head turned along the board's heading through a 1.4 s run** | — | **not at all.** Row 18, still with no angle |
| **8 direction changes in 16.6 s — one per ~2.1 s** | chaining `bottom turn` / `top turn` / `carve` | **not at all.** No chaining notion exists (row 8); **this clip sits at the FAST end of the range**, with V9 |
| **Steps on the board** | — | **cannot be judged here** — the board carries no landmark (§4.2) |

---

## 9. Rows this clip moves, and how

| row | the measurement | the population | which way it moves |
|---|---|---|---|
| **6** | ⭐ **Four LEG half-cycles in 0.88 s (≈0.22 s each) in trim with no direction change, with the trunk folded 40–60° throughout and completing no cycle.** Judged on visible knee bend at the **native 0.04 s** grid | 1 window, 0.88 s, 12 native samples + 5 at 0.08 s, 1 rider | ⚠️ **DISAGREES with row 6's target on BOTH axes — channel and rate.** Row 6 asks for **0.55–0.60 s in the trunk with the legs not working**, from V8 and V9. §0.4 gives the two readings and declines to choose: either the target is a range, **or** V8's and V9's "legs not working" half was never measured, because both read it off a ⚠️ **SAT** leg chain. **Row 6's target column should be marked contested** |
| **5** | ⭐ **2 leads in 6 resolved direction changes**, each with the wave section recorded. Present at **6.60 ± 0.04 (lead ≥ +0.16 s, in the broken lip)** and **12.98 ± 0.04 (lead = +0.14 s ± 0.06, at the lip on the open face)**, both held ≥0.20 s. Absent at ~3.45, ~3.70, ~7.50, ~9.20 and borderline-absent at 12.48 | 6 direction changes, 4 at the native grid | Tally **11 of 15 across five clips → 13 of 21 across six.** The measured +0.14 s sits inside the band. ⚠️ **AND IT CONTRADICTS CLIP 13'S SHAPE: clip 13's separator was open face vs slab; here it is TOP of the wave vs BOTTOM.** A lead occurs **inside** the foam and a miss occurs **on the open face**. **Two clips, two separators — so the condition is not yet known, and the engine must only be required to lead conditionally** |
| **3** | **Opposite-sign trunk-vs-leg: eight resolved transitions, zero instances** — three same-sign up, three same-sign down, two frozen. Trunk read as **direction only**, never as an angle | 8 windows, 0.16–0.60 s, 3–10 samples each, 1 rider | **Row 3 is SINGLE and now FOUR-TIMES-not-reproduced — 26 resolved transitions across clips 11, 12, 13, 14 and four riders.** Keep it as rows 1–2's acceptance test; **not** a frequency claim |
| **4** | **5 carriages; 4 distinct at one (visibly flexed) leg state.** And ⭐ **the clip's straightest legs carry its narrowest, lowest arms** — hands by the hips, trunk vertical, **held ≈1.4 s**, the longest carriage in the clip | 5 carriages, 15 windows | **Seventh clip to refute "tall ⇒ arms spread."** This one refutes it with the clip's **longest-held** carriage rather than a transient, which is the strongest form the refutation has taken |
| **15** | **Both hands low and forward over the deck in 6 windows**, each verified at **≤0.25 s**, ~4.5 s of readable riding | 6 windows, intervals stated per window | **Seventh clip for row 15.** V7 4, V8 5, V9 6, V11 4, V12 ≥8, V13 6, here 6 |
| **8** | **8 direction changes in 16.6 s — one per ~2.1 s**, of which 6 were resolved well enough to time and 2 at the native grid | 1 ride | **This clip sits at the FAST end of row 8's range**, beside V9's one per 2.3 s — and the range (V7's 0 in 13 s to this) is the requirement |
| **16** | **A foam impact at ~6.3 s met with the body ALREADY folded and compressed, both channels frozen for 0.36 s across 10 native frames, with the rear arm thrown above the crown — and ridden out still standing.** A second ride-through of ~2 s of whitewater at 14.3–16.1 | 1 impact, 10 native frames; 2 ride-throughs | **Second clip with a brace observed, and the first where it is resolved at the native frame grid rather than on one frame.** V6's was SINGLE and one frame. **The posture is: already folded, already compressed, arm high — not a reaction after contact** |
| **11** | **The stand-up at 15.50 → 15.98: legs and trunk rise together across 5 samples at 0.12 s, with no resolvable lead either way** | 1 transition, 0.12 s resolution | **A fourth up-transition, and the first that does NOT show legs leading the trunk.** V7 ~0.5 s and V8 ~0.3 s had legs first; V13 had legs first by ≤0.2 s; here **nothing separable at 0.12 s.** Row 11's "the variety is the target" holds |
| **18** | ⭐ **The board's nose is legible and the head's facing direction is legible in the SAME ≥6 frames** (15.5–17.1) — the head is turned along the board's heading in 5 of 5 frames sampled at 0.25 s. **But the face is NOT resolvable at 5.5×** (no eye, nose or mouth at a 20–31 px head), so **no angle is reported** | 6 frames, 1 rider | **The first clip to deliver the board's nose alongside a legible head orientation.** Clip 13 had the face and not the nose; this has the nose and not the face. **The footage ask is now exact: a frame with the board's nose legible AND a head of ≥60 source px** |
| **2** | ⚠️ **The trunk gate's 1.6–1.8 band does NOT transfer between clips.** Two visibly vertical trunks read **2.03 and 2.11**; one visibly folded trunk read **3.6**, which is impossible and means the landmarks were wrong. Cause: **a bikini bottom sits lower than a boardshorts waistband** (0.56 vs 0.60 of stature moves the expectation from 1.69 to ≈2.0), **plus ±0.25–0.5 of ratio error at a 20–31 px head** | 3 frames, 1 rider | ⚠️ **Clip 13's gate survives as a METHOD and loses its NUMBER.** Run it **within** a clip against that clip's own most-vertical frame. **No trunk angle is published from this clip**, so the series still has **no gated measurement of trunk angular travel across fourteen clips** |
| **14** | **No rung named, sixth clip running.** The leg chain reads **95.9 % on a deep side-on crouch (11.350)** and **99.9 % on visibly straight legs (16.600)** — **four points apart across a posture difference anyone can see** | 2 frames, 4 legs, 1 rider | **The cleanest demonstration of the saturation the series has**, because the deep frame and the straight frame are in the same clip, same rider, same method, 5 s apart |
| **10** | ⛔ **NOT MEASURED.** Two frames with both knees unmistakable; **four legs, four refusals** by the thigh/shin gate (**0.71, 0.85, 1.19, 1.41**). Both chains read 0.0 points apart, which is a number about the camera | 2 frames attempted | **No change. Row 10 stays at V8's one clip, two frames** — fourth clip running that could not touch it |
| **17** | ⛔ **Not a measurement.** No foot change seen, **but the board is white, unmarked and mostly in foam** — at 3.8× the deck is a featureless blur with no logo, stringer or rail graphic | 2 windows | **Unchanged, and a new reason recorded for why a clip can fail to test it.** V7's count was possible because that board had rail logos |
| **—** | **The head and neck thrust forward of the shoulders**, visible at 10.450, 10.610 and 11.350. **No magnitude given** | 3 frames | **V12 opened this row, V13 was its second clip; this is the third** |

**Method results that belong in the skill, not in a row:** §2.1's finding that the trunk gate must be calibrated **within** a clip; §5.3's reminder that **25 fps is not rare** — two of fourteen clips — and that a 1/30 step on one manufactures a motionless rider; §0.3's rule that **a tracker's failure is not the subject's absence**, checked on full frames; §5.2's result that the **2.5 s composited-canvas wait belongs inside the drawing function**, not between tool calls; and §5.1's fifth different quality ceiling in five clips.
