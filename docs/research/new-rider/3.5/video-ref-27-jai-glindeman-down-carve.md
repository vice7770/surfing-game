# Video reference 27 (Jai Glindeman, `@danscotttt`, *"Down carve"*): **no take-off — the file opens with the board already planing and its fins out of the water; the lens elevation is UNESTABLISHED again; and the sideways body speed is refused for a THIRD distinct reason, which is the first one that is not the camera's fault**

> ⭐⭐ **THE BRIEF'S FIRST QUESTION, IN THE FIRST LINE: NO. THIS CLIP DOES NOT START BEFORE THE RIDER IS ON HIS FEET.**
> At **t = 0.0000 s — the first native frame of the file** — the subject is already riding: trunk folded forward over
> the board, shoulders and hips high, head up and turned down the line, **one hand resolved, open and free in mid-air
> over the wave face with no board surface beneath it**, and the **board's fins visible above the foam** at the lower
> right. There is no prone frame, no kneeling frame and no hands-on-deck frame anywhere in the 8.621 s.
>
> **With this read, twenty-seven clips in the series have been read and exactly ONE contains a take-off (clip 28).**

Source: **https://www.youtube.com/shorts/OhZwR1dW_RQ**, submitted as `?feature=share`. Title *"Down carve | Jai
Glindeman"* (the uploader's own words), channel **`@danscotttt`**, `getVideoData().author` = **"Dan Scott"**.
Length **8.621 s**, read in full. Registered as **#27** in `CLIP-REGISTRY.md`.

> ⚠️ **PROVENANCE, and it is worse than clip 26 reported.** The ID check passes — `OhZwR1dW_RQ` appears nowhere else
> in the registry. **But `@danscotttt` is the same poster as clips 24 AND 26.** This is the **third** clip in the
> series from Dan Scott. Clip 25 flagged a concentration, clip 26 said it was getting worse, and it has got worse
> again: **of the last eleven clips, four come from `@hunterjoness` and three from `@danscotttt` — seven of eleven
> from two posters.** It is not the same footage as either (different rider, different board, different break,
> different light; clip 24's uploader titled it for Kelly Slater, clip 26's for "Steph", this one for Jai Glindeman).
>
> **Rider:** the uploader's title says *"Jai Glindeman"*. ⛔ **That is not verified here and nothing below depends on
> it.** No jersey, no name and no legible board decal identifies the subject; the one piece of hard text on the board
> is a dark logo near the nose that does not resolve at any magnification tried. **Nothing in this document depends
> on who he is.** The break is not identified either and no attempt was made.

---

## 0. Provenance, instrument, and what the numbers are worth

| | |
| --- | --- |
| ID / URL | `OhZwR1dW_RQ` — https://www.youtube.com/shorts/OhZwR1dW_RQ |
| Channel | **`@danscotttt`** ("Dan Scott") — **a third clip from this poster** (also 24 and 26) |
| Served stream | **1080 × 1920** portrait (`videoWidth`/`videoHeight`) |
| Published ceiling | `getAvailableQualityLevels()` = `["hd1080","hd720","large","medium","small","auto"]`, and `video_quality` was already `hd1080`. **`hd1080` is this clip's ceiling — a sixth clip, and the second in a row to stop at 1080p.** `setPlaybackQualityRange` was **not** attempted (clip 22 found it kills a Short's stream). |
| Codec / player stats | `av01.0.08M.08 (399) / opus (251)`; `getStatsForNerds().resolution` = `1080x1920@24 / 1080x1920@24`; `playbackRate` 1 |
| **Measured frame grid** | ⭐ **24 fps, measured, not assumed — see §0.1.** |
| Length | **8.621 s** ≈ 207 native frames. **The shortest clip in the series so far.** |
| Consent gate | **None**, as on clips 25 and 26 |
| Extraction tools | `ffmpeg`, `yt-dlp`, `youtube-dl` **all absent from this machine (checked this session)**, so nothing was downloaded: **every frame below is a screenshot of the browser pane.** |
| Rider size | **~500–900 source px** head-to-foot depending on the section; the head alone is **~100–130 source px** on the close frames. This is the closest framing in the series after clip 28's ending. |
| Tab | **`tab-1`**, claimed with `tabs_create` and **passed explicitly on every `navigate`, `resize_window`, `javascript_tool` and `computer` call.** |
| Screenshot scale | **Re-derived from the printed source-pixel grid on EVERY measurement frame.** Viewport 800×640 → screenshot 800×640 → **scale 1.000 on all seven measurement frames** (checked individually at mag 0.42, 0.56, 0.70, 0.72, 0.78, 0.82, 0.86, 0.95, 1.1 and 1.4; the grid spacing came back at exactly `100 × mag` screen px every time). |

### 0.1 — The frame grid, measured by hashing

Seeking on a **0.01 s grid** and hashing the drawn frame, in two adjacent windows:

- **3.00 – 3.29**: picture transitions at **3.05, 3.09, 3.13, 3.17, 3.21, 3.25, 3.30**
- **3.30 – 3.59**: transitions at **3.34, 3.38, 3.42, 3.46, 3.50, 3.55, 3.59**

The step pattern is **4, 4, 4, 4, 4, 5** hundredths, repeating — i.e. **six frames per 0.25 s = exactly 1/24 s**.
⭐ **The two 5-hundredth steps (3.25→3.30 and 3.50→3.55) are what separates 24 from 25 fps**: a true 25 fps would
have given an unbroken run of 4s. **Five clips in a row have now had their frame rate measured and the answers were
60, 30, 25, 30 and 24 — do not assume.**

**Cross-check:** every sheet below was then sampled on the native `n/24` grid, and the hashes agreed with the 0.01 s
scan wherever the two overlapped (3.008 ↔ 3.00, 3.050 ↔ 3.05, 3.217 ↔ 3.21, 3.300 ↔ 3.30, 3.592 ↔ 3.59 — five
independent matches). The harness and the grid corroborate each other.

### 0.2 — Instrument guards: all three traps carried, and the first one was already armed

- ☠️ **THE TWO-`<video>` TRAP WAS PRESENT IN THIS PAGE FROM THE FIRST INSPECTION.** The very first probe returned
  **two** `<video>` elements: index 0 at `videoWidth 0, readyState 0`, and index 1 at `1080×1920, readyState 4`.
  **Clip 28's defence was therefore in place before a single frame was drawn**: every draw re-selects the live
  element and **throws unless exactly one element has `videoWidth > 0` and `readyState ≥ 2`**, and throws again
  unless it is 1080×1920. It never bound the dead one and it never threw. **The trap did not fire here because the
  guard existed, not because the page was clean — the dead element was there the whole time.**
- **Every drawn frame was hashed** (FNV over the decoded picture, re-drawn from the live element at grab time, not
  over the overlay). **Every sheet came back with all-distinct hashes**: 24/24, 24/24, 24/24, 24/24, 8/8, 8/8 and
  8/8, plus 87/87 in the continuity scan. **The only duplicate hash in the entire read is at the end of file**, where
  seeks to 8.5 and 8.6 both clamp to the last decoded frame.
- **No draw was ever batched with its screenshot.** Each sheet or frame was finished and settled (a style touch, then
  a **2.4 s wait**) inside the `javascript_tool` call, and the `computer` screenshot was always a **separate** call.
- ☠️ **`javascript_tool` TIMED OUT ONCE, AND THE CAUSE IS A NEW SYMPTOM OF A KNOWN HAZARD.** The first frame-grid
  loop died at 45 s. **The reason was that the Browser pane was HIDDEN, so `requestAnimationFrame` never fired and
  the seek's settle step blocked** — clip 11 recorded this for `requestVideoFrameCallback`; **it is true of plain
  `rAF` too.** Two things were then done before anything else: the pane was **shown**
  (`mcp__ccd_view__show_pane`), and the loop was **proved stopped** by reading `currentTime` twice 2.5 s apart
  (**2.29 and 2.29**) rather than assumed stopped. The seek was then rewritten with `seeked` + `setTimeout` polling
  and **no `rAF` at all**. **No frame in this document was taken while that loop could have been seeking underneath
  it.**
- ⚠️ **The pane did NOT reset its viewport mid-session this time** (clip 26 had that happen). The grid was re-read on
  every frame anyway, which is the only reason that statement can be made at all.

**What every figure below is worth.** Landmarks read by eye off gridded frames at 0.78–1.4× carry **±10–15 source
px**. **Angles are image-plane angles unless the text says otherwise.** **Nothing here is a population.** One clip,
one rider, one ride.

---

## 1. The answers, in the brief's own order

| # | Question | Answer |
| --- | --- | --- |
| 1 | ⭐⭐ Does it start before the rider is on his feet? | ⛔ **NO.** §2. |
| 2 | ⭐⭐ If there is a take-off, measure its shape | **N/A — there is no take-off.** Nothing here tests Medina's shape in either direction. |
| 3 | ⭐ A sideways body speed relative to the board | ⛔ **NULL.** §4 — and **the reason is new, and it is not the camera.** |
| 4 | Is the board ever moved under a body that is LOSING it? | ⛔ **NULL — and this time the negative is well evidenced.** §5. |
| 5 | The slow-motion factor | ⛔ **NOT PINNED.** §6. **No media second is converted to a real second anywhere in this document.** |

---

## 2. ⛔ No take-off. The file opens mid-ride, on a board that is already planing

Measured on a **1.4× gridded crop** (`src[620,1450,480,400]`, scale re-derived = 1.000) and a **0.72× wide crop**
(`src[380,1150,700,770]`, scale 1.000), both at **t = 0.0000 s, the first native frame** (hash `a87dea41`):

- **The trunk is folded forward** over the board, shoulders well above hips, in a riding crouch.
- **The head is up and turned down the line** (facing image-left, ahead of the board), not down at the deck.
- ⭐ **One hand is resolved, open, and free.** It sits at **src ≈ (906–956, 1604–1664)** with a dark wetsuit cuff at
  the wrist above it, and it is **surrounded on every side by wave face and spray**. The nearest solid surface is the
  whitewater at **src y > 1740**, below and offset. **There is no deck under that hand.** A pop-up's push phase puts
  the hands ON the deck.
- ⭐⭐ **The board is already planing, and its FINS are out of the water.** A dark fin-shaped object sits at
  **src ≈ (988–1063, 1729–1750)**, on the foam line at the lower right of the first frame. At **t = 0.417** the same
  object resolves unambiguously as **two fins on the board's underside**, and from **t = 0.625** the board is a
  continuous white plank under the rider with **bare feet on the deck**. **A board with its fins clear of the water
  and a rail engaged is a planing board, not a board being popped up on.**

> ⚠️ **THE HONEST BOUND, and it is tighter than clip 26's.** At **t = 0.0000 the feet are NOT resolved** — they are
> behind spray and the board's near rail — so, per the standing refusal that **foam makes *hidden* and *gone*
> identical**, the claim above rests on the **trunk, the hips, the resolved free hand and the board's attitude**, and
> **not on the feet.** ⚠️ **Nor are BOTH hands resolved at t = 0**: the far arm is on the other side of the body and
> is not separable. **One hand, not two** — clip 26 was able to say two and this read is not, and that is said rather
> than rounded up.
>
> **The first frame in which a bare foot is unambiguously resolved on the deck is t ≈ 0.625**, and by **t = 1.042**
> both feet are plain. **That is 8.3 s earlier in the file than clip 26's equivalent (t ≈ 8.93).**

**Cause: the same one as clips 23, 25 and 26 — the file begins on a wave that is already breaking and already being
ridden**, and it is **trimmed at the end too**: the file stops at 8.621 s with the rider still upright and driving,
**no kick-out and no wipeout shown**. Unlike clip 26, the camera here is **not** zooming in from a wide search — it
is already on a tight framing at frame one, which is the signature of an editor who **cut into** a longer take rather
than of an operator who found the ride late.

> **Seven causes now, one remedy, unchanged and seven-times-confirmed: footage that STARTS BEFORE THE RIDER IS ON HIS
> FEET.** ⭐ **And the remedy now has a worked example — clip 28 delivered it.** The useful request to the owner is no
> longer abstract: **ask for clips shaped like clip 28** (the ride filmed from the paddle), not merely for "a
> take-off".

---

## 3. One unbroken ride, 8.621 s — stated with its method

**The skill's warning is that both cut detectors go blind when every shot would share the same rider, board, beach and
light — which is exactly this clip** (hazy sky, blue-green water, white foam, one black wetsuit, throughout). Clip 11
called itself a montage twice from coarse thumbnails and was wrong. So:

- **87 samples at 0.1 s** across the whole 8.621 s, each giving a **60-cell (6×10) mean-luminance signature**.
- Frame-to-frame signature distance: **mean 3.06, sd 1.12, max 6.10**.
- ⭐ **The maximum is less than three standard deviations above the mean.** There is **no spike at all** — not a
  candidate that was then disproved, as in clip 28, but **no candidate**. The six largest distances (at 2.0, 2.3,
  2.5, 2.8, 6.0 and 6.8 s) all sit inside the carve and the spray burst, where the picture genuinely changes fastest.
- **All 87 hashes distinct** except the end-of-file clamp. No sample gap exceeded 0.1 s anywhere.
- Independently, the rider is visible and continuously tracked across **four whole-clip sheets at 0.125–0.36 s** and
  **three native-rate sheets at 1/24 s**; his apparent size changes smoothly throughout, with no step.

**What this does and does not establish.** It establishes that nothing in this clip behaves like a cut at 0.1 s
resolution on a luminance channel, with no candidate to disprove. It does **not** establish that a cut between two
near-identical shots of the same rider on the same wave could not hide inside it. **One ride, to the strength of that
evidence and no further.**

---

## 4. ⛔ The sideways body speed relative to the board: NULL — and the third distinct reason, which is the first that is not the camera's fault

**The brief named the exact frame class to hunt for:** *"look for frames where the board is flat-on to the camera
while the body moves across it."* Clip 28 could not produce it; its board was either edge-on or at an unknown
mixing angle.

> ⭐ **THIS CLIP PRODUCES THE FIRST HALF OF THAT CONDITION. It is the first clip in the series to do so.**

### 4.1 The frame class exists here: the board goes deck-on at 2.800–3.092

Through **2.800 – 3.092 media s** (8 consecutive native frames, hashes `8df3a4cd, 2f81c1b0, b244e160, 67f9a85c,
ed8a4d6b, 71aaa369, c97973c1, b50b9315`, all distinct) the board comes up on its rail into the top turn and its
**deck turns substantially toward the lens**: the white planform, the stringer line, the rail outline on both sides,
a red deck decal and the rider's **bare front foot standing on the deck** are all simultaneously visible.

**And the squareness can be tested WITHOUT a length scale, which is the point.** Measured on the **1.1× gridded
frame at t = 2.8833** (`src[0,880,700,420]`, scale re-derived = 1.000):

| quantity | measured | ± |
| --- | --- | --- |
| stringer direction, src (36, 889) → (273, 1107) | unit **(0.736, 0.677)**, 42.6° below horizontal | ±3° |
| imaged deck width across the stringer, src (227, 935) ↔ (109, 1075) | **183 px** | ±20 |
| imaged nose → front-foot station, along the axis | **324 px** | ±25 |
| **ratio width / along-distance** | **0.565** | **±0.08** |

A shortboard at the station roughly 0.8 m back from the nose is near its widest, **~0.42–0.47 m wide**, giving a
true ratio of **~0.56**. **The measured ratio is 0.565.** Rotation of the deck about the board's long axis would
shrink the width and not the along-distance, so `cos θ = 1.00 ± 0.17`:

> ⭐ **Severe foreshortening is RULED OUT** — the deck really is substantially square to the lens here —
> ⚠️ **but the bound is weak: θ is only constrained to ≲ 35°.** Both halves of that sentence are load-bearing.

### 4.2 And it still yields no number, because the blocker moved to the BODY

**The hip landmark cannot be placed on any of those eight frames.** Four reasons, all visible in the frames:

1. **Full black wetsuit, ankle to neck — there is no waistband**, which is the landmark the series' own error-bar
   rule is written around (`±10–15 points even on a sharp image`).
2. **The trunk is laid back and rotated**, so the pelvis presents as the narrowest, most foreshortened part of a
   black silhouette.
3. **That silhouette sits against dark water and spray**, not sky, so the body's own outline is the lowest-contrast
   edge in the frame.
4. **The rider's own thigh and his trailing arm cross the pelvis** in six of the eight frames.

> ⛔ **So no sideways speed is reported — not in m/s, not in board-lengths per media second, not in any unit.**
> An offset formed from a hip I cannot place is not a measurement of a hip, and this track has retracted six numbers
> that looked exactly like measurements. **A wrong number here is worse than none**, and the brief said so.

### 4.3 ⭐ What the three refusals now say together — the diagnosis has changed

| clip | geometry of the board | why the quantity failed |
| --- | --- | --- |
| 28 (front-on pop-up) | axis at the lens | the body's motion ran **along** the line of sight |
| 28 (side-on turns) | rails at the lens | **across-rails** ran along the line of sight |
| 28 (one edge-on frame) | board edge-on | the perpendicular was **height above the deck**, not offset |
| **27 (this clip)** | ⭐ **deck substantially square to the lens** | ⛔ **the BODY landmark, not the camera** |

> ⭐⭐ **This is the useful finding, and it is a correction to the standing ask.** Clip 28 concluded *"it is the
> board's attitude to the lens that breaks it, not the camera's position."* **That is right and it is not
> sufficient.** This clip supplies the board attitude clip 28 said was missing — and the number still does not come
> out, because **a hip inside a black wetsuit against dark water is not a landmark at any board attitude.**
>
> **So the footage ask for THIS quantity needs a fourth clause, and it is about the rider, not the camera:**
> **a rider whose waist is visible — boardshorts, a contrasting waistband, or a bare torso — not a full black
> wetsuit.** Every clip that has reached the right geometry has then been stopped by the suit.

---

## 5. ⛔ Q4 — the board moved under a body that is LOSING it: NULL, and the negative is well evidenced here

**The brief's warning is exactly the trap this clip sets.** From **2.800 to ~4.5 media s** the rider goes into a
**laid-back top turn** — the move the title calls a "down carve" — in which the board is driven hard under and past
an outboard body. Read from a thumbnail it looks like a save. It is not.

**What the native-rate sheets show** (two sheets, 2.800–3.758 and 3.758–4.716, 48 consecutive frames at 1/24 s, all
hashes distinct):

- The attitude is **entered smoothly** over ~0.3 media s and **held**: from **3.758 to ~4.5** the trunk is near
  horizontal, the lead arm is **straight and high above the head**, and the head is up — and this configuration
  persists across **23 consecutive native frames (0.96 media s)** with no twitch, no correction, and no change of
  arm position.
- It is **exited under control**: by **4.675–4.716** he is re-centred over the board, and by **5.275** he is driving
  across the face again.
- The ride then continues for another **4 s** and the file ends at **8.621** with him still up.

> ⭐ **A body that is losing it does not hold a pose for 23 frames.** The sustained, unchanging arm and trunk
> configuration **through** the most extreme part of the move is the discriminator, and it points at *deliberate*.
> **So this is a third consecutive clip in which the board is swung under an outboard body and it is a manoeuvre, not
> a save** (clips 26, 28, 27). **The distinction the next build hangs on is still not settled by footage.**
>
> ⚠️ **And the honest limit:** "deliberate" is an inference from the held configuration and the controlled exit, not
> a direct observation of intent. What is directly observed is that **nothing in the 8.621 s file is a loss of
> stance** — there is no wipeout, no recovery, no stumble and no foot slip anywhere in the four whole-clip sheets.

---

## 6. ⛔ Q5 — the slow-motion factor is NOT pinned, so nothing is converted

**Clip 28 pinned `k = 0.55 ± 0.06` from a free-flight parabola. The brief is explicit that this is a property of
THAT file and must not be carried here. It is not carried here.**

**What was looked for and what was found:**

- **A body in free flight.** ⛔ **There is none.** The rider's board is in contact with water at every one of the
  ~110 frames examined at native rate. The clip contains a bottom turn, a climb, a laid-back top turn and a long
  drive — **no aerial**, and in the layback the tail stays engaged throughout.
- **A free-flying water mass.** ⛔ **Refused rather than pushed to a conclusion.** The spray through
  3.966–4.258 was inspected at **4.9×** the magnification of the whole-clip sheets (`src[150,250,780,780]` into
  195 px tiles). It is a **connected curtain**, not a field of separable blobs: no droplet or parcel could be matched
  frame-to-frame with any confidence, and the ones that are individually bright are also the ones most affected by
  drag. **A parabola fitted to mis-matched blobs would have produced a `k` that reads exactly like clip 28's and
  means nothing.**
- **No other in-frame clock.** No horizon, no fixed object, no second rider, no splash of known size.

> ⛔ **THEREFORE: every duration in this document is in MEDIA SECONDS and is labelled as such. No real-second figure
> appears anywhere.** The held layback is **0.96 media s**; what that is in life is **unknown**, and the file's own
> 24 fps tells us the delivery rate, not the capture rate.
>
> ⚠️ **It is not even established that this clip IS slow motion.** `playbackRate` is 1 and the stream is a true 24 fps
> (§0.1), which says nothing about whether the camera ran at 24 or at 120. **It looks slowed to the eye; the eye is
> not an instrument and no number rests on it.**

---

## 7. ⛔ The leg-chain admissibility gate — run before anything was published, and it REFUSES

**Run per the standing rule, on the clip's best-resolved standing frame.** The clearest is **t = 6.4750** (rider
~500 px, both legs descending to a visible board, bare front foot resolved on the deck), measured on the **0.82×
gridded frame** `src[300,900,620,700]`, scale re-derived = 1.000:

| leg at t = 6.4750 | projected thigh | projected shin | thigh/shin (anatomy ≈ 1.0–1.1) | verdict |
| --- | --- | --- | --- | --- |
| image-right leg (hip 824,1107 → knee 873,1205 → ankle 776,1327) | **110 px** | **156 px** | **0.70 ± 0.13** | ⛔ **inadmissible** |
| image-left leg (hip 666,1120 → knee 574,1229 → ankle ~556,1363) | 143 px | 135 px | *(1.05)* | ⛔ **not formed — the ankle is inside white spray** |

> **The image-right thigh is pointing at the lens**, and even at the top of its error bar (0.83) it does not reach
> the admissible band. The image-left leg would pass **if its ankle were resolved, and it is not** — it disappears
> into foam, and per the series' own refusal a landmark inside foam is not a landmark.
>
> ⭐ **So no leg-depth figure and no rung on the game's stance ladder is quoted anywhere in this document — a SIXTH
> refusal in the series, and the second in a row where the gate fired before a number was published rather than
> after.** The gate is working as designed.
>
> ⚠️ **And the backup ruler is unavailable too, for a reason that is now CHECKED rather than assumed.** The skill
> requires the lens elevation before head-lengths may be read as a depth. **Three widely separated frames were
> examined for a horizon — t = 0.5, t = 2.8 and t = 8.0, each rendered across the full frame width from src y = 0** —
> and **there is no resolvable sea horizon in any of them**: above the wave the image is uniform haze, and the
> grey band that reads as a headland on small tiles is the back of the wave plus that haze. **The lens elevation is
> UNESTABLISHED.** ⛔ **So apparent stature names no rung here, exactly as in clip 26.**

---

## 8. What the body does — the standing purpose, which outranks the day's questions

*"What i really want from this videos is for you to study surf movements to improve the riding engine."* These are
read off sheets at **0.125 s** and at the native **1/24 s**, and they are **one ride, one rider**. Counts are
within-clip counts.

### 8.1 The ride, in six beats (all times MEDIA seconds)

| media s | what the body does |
| --- | --- |
| **0.000 – 0.833** | **Traverse, high on a steep dark face.** Trunk folded well forward over the board; shoulders high over hips; **both arms LOW and forward, hands at about waist height**; head up and turned down the line. The board is on its rail with the fins visible; from 0.625 bare feet resolve on the deck. **The depth is carried by the trunk here, not visibly by the legs** — the hips do not drop noticeably across these 20 frames. |
| **0.833 – 2.000** | **Descent and bottom turn.** The board flattens and the whole plank becomes visible; the rider comes upright as he drops, then the **lead arm rises and reaches forward** as he banks. The arms stop being a matched pair at ~1.4. |
| **2.000 – 2.800** | **The climb.** Arms wide and asymmetric — lead arm up and forward, trailing arm back and low. The trunk is more upright than at any other point in the clip. |
| **2.800 – 3.758** | ⭐ **The "down carve": a laid-back top turn.** The board comes onto its rail and its **deck turns toward the lens**; the trunk goes back and down **toward the tail**; the **lead arm is thrown up and back over the head** while the **trailing hand drops toward the water** — at t = 2.8833 it is open, fingers spread, just above the face at src ≈ (418–491, 1098–1144). |
| **3.758 – 4.716** | **The attitude is HELD.** Trunk near horizontal, lead arm straight and high, head up looking back along that arm — **23 consecutive native frames, 0.96 media s, unchanged** — then a controlled re-centring over the board by 4.716. |
| **4.716 – 8.621** | **Drive.** Re-extended over the board, lead arm forward and low; the wave spills behind him; he is **still riding at the final frame**, and the last two sampled times return the same decoded picture. |

### 8.2 ⭐ Three things worth carrying to the engine

1. ⭐⭐ **THE ARMS ARE ASYMMETRIC WHENEVER ANYTHING IS HAPPENING, AND SYMMETRIC WHEN NOTHING IS.** Through the
   traverse (0.000–0.833) the two arms are a matched low pair. From the bottom turn onward they **never match
   again**: through the whole carve one arm is straight and high above the head while the other is low, trailing,
   and at one point dropped to the water. **Count: ~20 frames symmetric-low, ~45 frames strongly asymmetric, one
   ride.** The game's arm carriage is one channel; **this clip says the two arms are doing different jobs and the
   split is the signal, not the height.**
2. ⭐ **THE GAZE IS AHEAD OR INTO THE TURN IN EVERY FRAME MEASURED, AND NEVER AT THE BOARD OR THE FEET.** At
   0.000–0.833 the head is up and turned down the line **while the trunk is folded** — i.e. **the head does not
   follow the trunk**. Through the layback the head is up and turned back along the raised arm. **Count: 8 of 8
   closely examined frames; 0 of 8 looking down.** The head is an **independent channel**, and this clip is a second
   witness for clip 28's observation that the head is already looking down the line before the body has settled.
3. **THE TRUNK CARRIES THE DEPTH IN THE OPENING TRAVERSE.** The hips do not visibly drop across 0.000–0.833 while
   the trunk folds hard forward. ⚠️ **No percentage and no rung is attached to this** — §7 forbids both — **but the
   direction is the same one video 7 found, and it is the thing the game's single leg-depth channel cannot
   represent.**

### 8.3 The standing refusal holds again: there is no pose rule

Within this one ride, **a continuing ride** shows:

- **low arms** (0.000–0.833), **a high straight arm** (3.758–4.716), **a hand in the water** (2.883);
- **a near-horizontal torso held for 0.96 media s** (3.758–4.716);
- **an upright trunk** (2.000–2.800).

> **All of them on a ride that continues to the end of the file.** ⚠️ **Labelled as one ride** — this is a
> within-clip count and it is not a population. **It kills nothing and it confirms nothing; it is one more clip in
> which "surfers do X" has no X.**

---

## 9. Part B — the mapping

| what the rider does | the game's stance or move | have it? |
| --- | --- | --- |
| Trims across a steep face, trunk folded, arms low and matched | `trim` | **partly** — the game trims, but the fold is in the trunk and the game's one channel is leg depth |
| Drops down the face and banks off the bottom | `bottom turn` | **have it** |
| Climbs the face with asymmetric arms | `pump` / climb | **partly** — no arm asymmetry in the game |
| ⭐ **Laid-back top turn, trunk near horizontal, board driven under an outboard body, HELD 0.96 media s** | `snap` is the nearest, `carve` next | ⛔ **not at all as shown.** The game's `Snap` is a short tail stamp; **this is a sustained attitude, not a stamp**, and §5 says it is deliberate |
| ⭐⭐ **Two arms doing different jobs for ~45 frames** | — | ⛔ **not at all.** The game has one arm carriage |
| ⭐ **Head aimed down the line independently of the trunk** | — | ⛔ **not at all.** The game has no gaze channel |
| **Hand dropped to the water through a turn** | — | ⛔ **not at all** |
| Pop-up / take-off | `PUSH_TIME` + `LANDING_TIME` | **nothing here tests it** — §2 |

> **The "not at all" rows are the point.** This clip adds **two** that the series has been circling and one that is
> new: **arm asymmetry**, **gaze**, and **a held laid-back attitude that is not a snap**.

---

## 10. Part C — what I could not see

- ⛔ **The rider's feet at t = 0.000** — behind spray and the board's near rail. The no-take-off claim does not rest
  on them (§2).
- ⛔ **The far hand at t = 0.000** — on the other side of the body, not separable. **One hand, not two.**
- ⛔ **The hip, on every frame of the carve** — full black wetsuit, no waistband, dark water behind, crossed by his
  own thigh and arm. **This is what killed Q3** (§4.2).
- ⛔ **The image-left ankle at t = 6.4750** — inside white spray. **This is what killed the second half of the leg
  gate** (§7).
- ⛔ **Any horizon, at t = 0.5, 2.8 or 8.0** — uniform haze above the wave. **The lens elevation is unestablished**,
  so no head-length depth and no stance rung (§7).
- ⛔ **The board's tail and full length**, on every deck-on frame — buried in spray or occluded by the rider. The
  board's **width** could be measured and its length could not, which is why §4.1's squareness test is deliberately
  built as a **scale-free ratio**.
- ⛔ **The capture frame rate.** The delivery rate is a measured 24 fps; whether the camera ran at 24 or at 120 is
  not observable here (§6).
- ⛔ **The rider's identity and the break.** Uploader's title only; not verified; nothing depends on either.
- ⚠️ **Motion blur** is visible on the hands and on spray through the carve at 24 fps. It is the binding limit on the
  hand landmarks in §8.1, not resolution.

---

## 11. Checked against what is already on file

- ⭐ **Agrees with clip 26 on the lens:** no horizon, elevation unestablished, no rung. **Two clips in a row from the
  same poster with the same defect** — which is itself a reason to read §0's provenance warning as a warning about
  *cameras*, not just about variety.
- ⭐ **Disagrees with nothing in clip 28, but CORRECTS its conclusion's scope.** Clip 28 said the board's attitude to
  the lens was what broke the sideways measurement. **This clip supplies the attitude and the measurement still
  fails**, on the body landmark (§4.3). The diagnosis is now two-part, and the footage ask gains a clause about the
  rider's suit.
- **Agrees with clips 23, 25 and 26** that the series' clips are cut into mid-ride, and adds a distinguishing
  observation: **here the framing is tight at frame one**, so this is an editor's in-point, not a late find.
- **Agrees with clips 12 and 28** that the leg chain fires its own gate rather than yielding a reading.
- ⚠️ **It can confirm nothing about the pop-up**, so clip 28's `0.44 ± 0.07` / `0.97 ± 0.10` remains **n = 1**.

---

## 12. One line for the registry

**No take-off (27 clips read, one take-off in the series); one unbroken 8.621 s ride at a measured 24 fps; sideways
body speed NULL for a NEW reason — the board finally goes deck-on and the black wetsuit's hip is what defeats it; no
slow-motion factor pinned, so nothing converted; leg gate and lens elevation both refuse; the "down carve" is a held
0.96 media s laid-back attitude with strongly asymmetric arms, and the game has no name for it.**
