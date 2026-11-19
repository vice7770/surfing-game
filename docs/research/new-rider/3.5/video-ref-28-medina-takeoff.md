# Video reference 28 (Gabriel Medina, `@GabrielMedina10`): **the first take-off in twenty-eight clips — and the first slow-motion factor this series has ever been able to MEASURE rather than assume**

Source: **https://www.youtube.com/shorts/g3fe9BRoeaI**, title *"Few more days to go!"*, channel **`@GabrielMedina10`**.
Length **27.461 s**, read in full. Registered as **#28** in `CLIP-REGISTRY.md`; the owner pulled it ahead of #27 himself.

> ⭐⭐ **THE HEADLINE, IN FOUR LINES.**
>
> 1. **There is a take-off, it starts with the rider prone and paddling, and it is filmed from the front.** Twenty-seven
>    clips produced none. This one opens with **1.6 s of prone paddling** before anything else happens.
> 2. **The slow-motion factor is pinned: `k = 0.55 ± 0.06` real seconds per media second**, i.e. the clip runs about
>    **1.8× slower than life.** It is measured from a **free-flight parabola** (an aerial at 9.70–10.93 s) with two
>    independent length scales that agree, **not** assumed. Real time ÷ media time has never been available on this
>    track before; clip 26 could not get it and therefore converted nothing.
> 3. **The pop-up is SHORTER than the game's, on every definition of its start.** Narrowest (trunk first rises →
>    standing over the feet): **0.44 ± 0.07 real s.** Most generous (hands planted on the rails → upright and trimming):
>    **0.97 ± 0.10 real s.** The shipped machine is `PUSH_TIME` 0.72 s + `LANDING_TIME` 0.48 s = **1.20 s**.
> 4. **And its shape is not the shipped shape.** The trunk rises, then **PAUSES for ~0.11 real s**, then rises again.
>    The pause is where the lower body swings through under a parked head. The game's push → landing is monotone.
>
> ⛔ **AND THE THING THE OWNER MOST WANTED IS NOT HERE.** **No sideways body speed relative to the board is produced**,
> in any unit, including board-lengths per media second. §5 gives the geometric reason and the one frame class in this
> clip where the components *do* separate — which turns out to give **height above the deck**, not offset across it.
> A number in a convenient unit would not have been the quantity the fall model wants, and inventing one would have
> been worse than this refusal.

---

## 0. Provenance, instrument, and what the numbers are worth

| | |
| --- | --- |
| ID / URL | `g3fe9BRoeaI` — https://www.youtube.com/shorts/g3fe9BRoeaI |
| Channel | **`@GabrielMedina10`** — the rider's own channel. A **sixth poster** for this series, and the first whose uploader is the subject. |
| Rider | **Gabriel Medina**, read off the jersey itself: at 26.900–27.434 the jersey fills the frame and reads **MEDINA** over **10**. Competition jersey with the Brazilian flag on both shoulders, so this is contest or contest-warm-up footage, not an edit. |
| Served stream | **1080 × 1920** portrait (`videoWidth`/`videoHeight`), after enlarging the viewport to 1280×1000 **and reloading**. |
| Measured frame grid | **≈ 30 fps.** Seeking on a 0.01 s grid and hashing the drawn frame, picture transitions fell at 5.01 / 5.04 / 5.08 / 5.11 and, in an independent window, 15.02 / 15.05 / 15.09 / 15.12 / 15.15 — a 3,3,4 pattern on a 0.0333 s period. **Not assumed; three clips in a row before this one had three different answers.** |
| End of file | The last two frames (27.368, 27.434) hash **identically** — the final frame repeats. |
| Rider size | **300–900 source px** depending on the section; 585 px of board at 9.87, and by 25–27 s he fills the 1080 px frame. |
| Tab | **`tab-2`**, claimed with `tabs_create` and passed explicitly on every call. |
| Screenshot scale | **Re-derived from the printed source-pixel grid on EVERY measurement frame.** Viewport 800×640 → screenshot 800×640 → **scale exactly 1.000**, so a canvas drawn at `m` renders at `m`. (The stream was acquired at 1280×1000 and the viewport then shrunk: the small viewport is the magnifier.) |

**Instrument guards, all three traps carried:**

- **Every drawn frame is hashed**, and the sheets below all came back with distinct hashes. The only identical pair in
  the whole read is the duplicated final frame above.
- ☠️ **A dead `<video>` element nearly cost the whole read.** After the quality reload the page held **two** `<video>`
  elements — a stale one at `readyState 0`, `videoWidth 0`, and the live one. The first harness bound the stale one and
  returned **ten identical hashes across ten different `currentTime`s** with the stamp reading `0x0`. The fix is in
  every draw since: re-select the live element each time and **throw unless exactly one element has `videoWidth > 0`
  and `readyState ≥ 2`**, and throw again unless it is 1080×1920. That guard fired once more mid-read (`live videos: 0`
  during a buffer stall) and the affected chunk was re-scanned.
- **No draw was ever batched with its screenshot.** Each sheet was finished, then a style touch + two `requestAnimationFrame`s
  + a **2.4 s wait** in a separate call, then the screenshot in a third call.
- ☠️ **`javascript_tool`'s ~45 s ceiling fired twice.** Both runaway loops were allowed to finish, their accumulated
  rows checked for duplicate or missing timestamps (**none**, and no gaps > 0.15 s), and only then continued. One chunk
  that died mid-way left a stale previous-frame reference and produced a **spurious cut candidate at 18.05 s** — which
  §3 then disproved at 1/30 s. **The artefact looked exactly like data until it was checked.**

**What every figure below is worth.** Landmarks read by eye off gridded frames at 0.75–1.0× carry **±10–15 source px**.
Automatically tracked quantities (the red-jersey centroid, the dark-head centroid, the background patch) carry **±2–4 px**
in the 540×960 working frame. Every metric conversion inherits the length-scale uncertainty in §2, which is **±8 %**.
**Nothing here is a population.** One clip, one rider, one ride, one take-off, one aerial.

---

## 1. The owner's five claims, each checked

| # | His claim | Verdict | What establishes it |
| --- | --- | --- | --- |
| 1 | ⭐⭐ **A take-off, filmed BEFORE the feet are on the board** | ✅ **CONFIRMED, and it is the real thing** | At t = 0.000 the rider is **prone on the deck, chest down, head up, mid paddle-stroke**, one arm reaching forward into the water. He is still prone at 1.800. §4 measures the whole sequence. |
| 2 | ⭐⭐ **A readable sideways body speed relative to the board** | ⛔ **NOT CONFIRMED — no number produced** | §5. The geometry defeats it, in both halves of the clip, for two different reasons. |
| 3 | **Filmed from the FRONT** | ⚠️ **CONFIRMED FOR THE TAKE-OFF ONLY** | One fixed camera on a long lens. He paddles **toward** it (0–3.1 s, front-on), rides **across and away** from it (3.4–22 s, side-on and from behind), and comes **back toward** it at the end. The front-on window is the take-off and nothing else. |
| 4 | **Long, unbroken, one rider** | ✅ **CONFIRMED as far as a detector can take it** | §3. |
| 5 | **Slow motion** | ✅ **CONFIRMED — and measured for the first time** | §2. `k = 0.55 ± 0.06`. |

**So four of five stand, and the fifth is the one he most wanted.** That is said plainly here rather than buried: he
would rather know.

---

## 2. ⭐⭐ The slow-motion factor, measured from a free-flight parabola

**Why this matters more than the clip.** Every timing this series has ever published is in media seconds. The skill's
own instruction — *"Find the slow-motion factor or say you could not"* — has been answered "could not" every time, and
clip 26 therefore converted no media second into a real second anywhere. **This clip contains an aerial, and a body in
free flight is a clock.**

### 2.1 The parabola

Between **9.70 and 10.93 media s** the rider launches off the lip, flies clear over open water, and lands. Through that
window the red-jersey centroid was tracked at **1/30 s** in a 540×960 working frame (37 frames), and the camera's pan was
estimated by normalised cross-correlation of a **200×110 background water patch** (correlation **r = 0.62–0.95**).

- The camera pans **horizontally** at 8–14 px/frame and **barely at all vertically** (|dy| ≤ 4 px/frame, 46 px over the
  whole window), so the rider's image-y is nearly a world vertical already.
- The pan-corrected trace fits **y = y₀ + vt + ½at²** with

| window | a (px/media-s², 540-frame) | apex (media s) | RMS residual |
| --- | --- | --- | --- |
| full, pan-corrected (35 fr) | **465.3** | 10.007 | 2.66 px |
| full, **uncorrected** (35 fr) | 425.0 | 10.046 | 4.08 px |
| first half only (17 fr) | 473.7 | 10.001 | **0.77 px** |
| second half only (21 fr) | 466.8 | 10.006 | 3.34 px |
| 9.80–10.80 (29 fr) | 480.1 | 10.014 | 2.78 px |

**Seventeen consecutive frames fit a parabola to 0.77 px.** The sub-windows agree to ±3 %, the apex to ±0.01 s, and the
pan correction moves `a` by 9 % — which is carried as error, not hidden. In source pixels, **a = 930.6 ± 60 source px
per media-second²**.

### 2.2 Two independent length scales, which agree

| scale | measurement | metres per source px |
| --- | --- | --- |
| **the board** | On gridded frames at **1:1** (t = 9.933) and **0.75×** (t = 9.867), nose → tail = **585 ± 25 source px**, measured twice from different crops and agreeing. A CT shortboard is **1.75–1.90 m**. | 0.00299 – 0.00325 |
| **the rider's stature** | At t = 11.034 he stands with legs near-straight just after landing: crown → feet = **472 source px**, corrected to **≈ 513 px** for leg splay and trunk fold. Borgonovo-Santos et al. 2021's own surfer population is **1.73 ± 0.07 m**. | 0.00327 – 0.00351 |

### 2.3 The answer, and what it rules out

`k = √( a_px × (m/px) ÷ 9.81 )`

| scale used | k (real s per media s) | implied slow-motion |
| --- | --- | --- |
| board | **0.540** | 1.85× |
| stature | **0.569** | 1.76× |
| **combined** | **k = 0.55 ± 0.06** | **≈ 1.8×, consistent with an exact 2× (60 fps conformed to 30)** |

> ⭐ **The falsification is what makes this trustworthy, because the wrong answers are absurd, not merely unlikely.**
> If the clip were **real time** (k = 1), the same parabola would require the board to be **6.17 m** long. If it were
> **4× slow** (k = 0.25), the board would be **0.39 m**. The measured board is 585 px; a surfboard puts that at
> 1.75–1.90 m and nothing else does.

**Three corroborations, all independent of the fit:**

- Real airtime **1.23 × 0.55 = 0.68 s** — an ordinary surf aerial.
- Vertical speed at touchdown **g·t_down·k = 4.96 m/s** — hard, survivable; at k = 1 it would be 9.0 m/s.
- Apex-to-landing drop **1.21 m**; and the landing stance measured at 11.034 (feet **244 source px** apart along the
  board) comes out at **0.75–0.83 m**, against Borgonovo-Santos' laboratory pop-up landing of **0.63 ± 0.10 m** — wider,
  as an aerial landing should be, and **a scale wrong by 2× would have put it at 1.5 m**.

> ⚠️ **The three honest limits on this number.** (a) It is measured in **one 1.23 s window**; whether the whole clip
> carries the same factor is **untested**, and a speed ramp would break it. (b) The tracked point is the **red jersey's
> centroid**, a chest proxy for the centre of mass, and he tucks and extends in flight — that is what the 0.8–3.3 px
> residual is. (c) The board length is a **bracket from the class of board**, not a measurement of his board.
> **Everything below that is quoted in real seconds is quoted at k = 0.55 ± 0.06 and says so.**

---

## 3. Is it one unbroken ride? As far as a detector can say, yes

**The skill's warning is that both cut detectors go blind when every shot would share the same rider, beach and light —
which is exactly this clip** (grey sky, green water, white foam, one jersey, throughout). Clip 11 called itself a
montage twice from coarse thumbnails and was wrong. So this is stated with its method attached.

- **275 samples at 0.1 s** across the whole 27.46 s, each giving a **60-cell (6×10) mean-luminance signature** and the
  red-jersey blob. Frame-to-frame signature distance: **mean 6.8, sd 3.5, max 26**.
- **The red jersey is present in all 275 samples** (minimum 329 red px, no nulls), and its area grows almost
  monotonically from **329 to 7814 px** — the signature of a rider coming steadily toward a fixed camera, which is the
  positive evidence here, not merely the absence of a spike.
- **The single candidate, at 18.05 s, was an artefact of my own timed-out chunk** (a stale previous-frame reference).
  Re-sampled at **1/30 s** across 17.83–18.13, the signature distance is a flat **4–7** and the blob area declines
  smoothly. **No cut.** A second candidate at 20.85 was checked the same way: distances 4–8, smooth.
- No sample gap exceeded 0.15 s anywhere in the scan.

**What this does and does not establish.** It establishes that nothing in this clip behaves like a cut at 0.1 s
resolution, on two different channels, with the strongest candidate individually disproved at native frame rate. It does
**not** establish that a cut between two near-identical shots of the same rider on the same wave could not hide inside
it. **Claim 4 is confirmed to the strength of that evidence and no further.**

---

## 4. ⭐⭐ The take-off, measured

All times are **media seconds**, converted at **k = 0.55 ± 0.06**. The head's dark blob and the red jersey's bounding
box were tracked at **1/15 s** from 1.40 to 3.57 in the 540×960 working frame; the sheets were then read by eye at
0.45–0.75×.

> ⚠️ **The pan correction is NOT usable in this window.** The background here is moving foam and the NCC correlation
> falls to **r = 0.26–0.55**. So **the head's image height contains camera motion**, and only the *shape* of the curve
> is used below, never its absolute travel. Where a conclusion needs to be camera-proof, a **within-body** measure is
> given instead.

### 4.1 The sequence

| media s | real s (Δ) | what the body does | confidence |
| --- | --- | --- | --- |
| 0.00 – ≈1.60 | — | **Prone paddling, front-on.** Chest on the deck, head up, arms alternating; roughly **two full stroke cycles in 1.8 media s**. The jersey's visible area climbs steadily (2274 → 3753 px) as the chest comes off the deck and the torso turns toward the lens. | clear |
| ≈1.60 – 2.27 | 0.37 | **BOTH HANDS AT THE RAILS, elbows out and bent, and nothing rises.** The head's image height is flat to **±5 px across the entire 0.67 media s**. ⭐ **The hands are planted and loaded well before the body moves.** | clear |
| **2.27 ± 0.05** | — | **The trunk starts up.** Camera-proof check: **head-above-jersey-hem grows 72 → 138 px between 2.27 and 2.64**, a within-body measure, so the first stage is a real trunk extension. | clear |
| 2.60 – 2.73 | 0.07 | **The hands come off.** At 2.60 one arm is still down to the rail with a bent, loaded elbow; by 2.73 **both arms hang free, outside the rail line, swinging**. | ⚠️ bounded, see below |
| **2.64 – 2.84** | **0.11** | ⭐⭐ **THE HEAD'S CLIMB PAUSES.** 321.1 → 315.3 px — **~6 px in six frames**, against 44 px in the eleven frames before it. | clear in the trace |
| 2.84 – 3.37 | 0.29 | **The trunk climbs again**, 315.3 → 234.7 px, and comes upright over the feet. | clear |
| **2.97 – 3.04** | — | **First frame with a planted leg visible under the hips** (dark wetsuit leg, image right). | ⚠️ bounded, see below |
| 3.07 – 3.14 | — | **Standing**: both feet down, torso folded forward over the board, arms out. | clear |
| 3.40 | — | **Trimming**, upright, front arm high above the shoulder, board broadside to the lens. | clear |

> ⚠️ **TWO BOUNDS, NOT TWO MEASUREMENTS — and clip 26's lesson is the reason.**
>
> **The hands.** The exact frame of release is **not resolvable**: the deck is white, the foam is white, and the hands
> are inside that white. At **1.2× magnification** the region is mush. What is resolvable is the **arm's posture**:
> loaded-and-down at 2.60, free-and-hanging at 2.73. **Bound: hands clear by 2.73 ± 0.07.**
>
> **The feet.** Front-on, the feet sit **behind the board's deck and the spray**. Whether they touched before 2.97
> **cannot be determined** — *hidden* and *not yet there* look identical, which is precisely the trap clip 26's reader
> named. **Bound: the feet were planted at or before 3.00 ± 0.04, and possibly earlier.**
>
> **Therefore the "unsupported transit" — hands gone, feet not yet seen — is AT MOST 0.27 ± 0.08 media s
> (0.15 ± 0.05 real s), and may be zero.** It is reported as a ceiling, not a finding.

### 4.2 Four durations, because where you start the clock changes the answer

| from → to | media s | **real s at k = 0.55** |
| --- | --- | --- |
| trunk first rises → standing over the feet (2.27 → 3.07) | 0.80 ± 0.10 | **0.44 ± 0.07** |
| trunk first rises → upright and trimming (2.27 → 3.37) | 1.10 ± 0.10 | **0.61 ± 0.08** |
| hands planted at the rails → standing (1.60 → 3.07) | 1.47 ± 0.12 | **0.81 ± 0.10** |
| hands planted at the rails → upright and trimming (1.60 → 3.37) | 1.77 ± 0.12 | **0.97 ± 0.10** |

### 4.3 ⭐ Against the game, which is the point

The shipped pop-up is a fixed phase machine in `src/physics/AttachedRider.ts`: **`PUSH_TIME = 0.72` s** then
**`LANDING_TIME = 0.48` s**, **1.20 s** in all, with `SETTLE_TIME = 0.8` s after it. The 0.72 s is attributed in the
source comment to Borgonovo-Santos 2021 — whose measurement `3.5/stance-frame.md`'s own table records as a **laboratory
simulated pop-up on force plates laid out as a 74-inch board, n = 23, no riding stance at all**.

**Every definition measured on this real take-off is shorter than 1.20 s**, and the narrowest is **under half of it**.
Even the most generous start (hands already planted on the rails) gives 0.97 ± 0.10 s.

**And the shape is wrong in a way the duration does not capture.** The shipped machine ramps push → landing monotonically.
The real one goes **up (0.20 real s) → PAUSE (0.11 real s) → up (0.29 real s)**. The pause is the frames in which the
head parks and the lower body swings through beneath it.

> ⚠️ **One take-off, one rider, one clip.** This is the first real one in twenty-eight, so it is worth a great deal and
> it is still n = 1. It should move a prior, not set a constant.

**On the game's own 55° → 10° collapse in 1.2 s, as the weight climbs 0.124 m → 0.711 m above the deck:** this read
**cannot** check it. The vertical travel in metres is not measurable in this window (pan uncorrectable against foam,
§4 preamble), and the tolerance angle is not an observable at all. **What it does say is that the 1.2 s over which the
game spends that collapse is longer than the real transit it is modelling** — on this one.

---

## 5. ⛔ The sideways body speed relative to the board: refused, and exactly why

**This is the number the brief called the one the whole fall model rests on, and it is not in this clip.** The reason is
not resolution and not the rider — it is that the quantity needs a camera looking **down the board's long axis at a
moment when the body is moving across the rails**, and those two conditions never coincide here.

- **Front-on (0 – 3.1 s)** the board's axis does point at the lens, so across-the-rails *is* in the image plane. But the
  body's motion through a pop-up is almost entirely **along** the board — the feet come forward under the chest — and
  along is the line of sight. **There is nothing lateral happening while the geometry is good.**
- **Side-on (3.4 – 22 s)** the body does move across the rails, in every turn. But across-the-rails is now **along the
  line of sight**. **The geometry is bad exactly while the motion is good.**

### 5.1 The one frame class where the components DO separate — and what it actually yields

A front-on camera does not by itself break the mixing the brief warned about; **the board's attitude does.**

- At **t = 9.867** the board is almost exactly **edge-on**: a rail profile with no visible width. The deck normal is
  therefore nearly perpendicular to the view, so the image perpendicular from a body landmark to the board's long axis
  is **height above the deck**, with the across-rails component suppressed by the cosine of a near-right angle.
  Measured on the 0.75× gridded frame (board axis nose (253, 589) → tail (704, 961) in source px):
  **hip 249 px = 0.77 m, chest 342 px = 1.05 m.** ⚠️ **These are HEIGHTS, and the rider is airborne and extended, so
  they are not a riding stance and no rung is named from them.**
- At **t = 12.30** the board shows width (its bottom partly toward the lens) and the same perpendicular is a **mixture**
  of height and offset in unknown proportion. The hip reads **85 source px = 0.168 board-lengths = 0.30 m**, and that
  figure is quoted here **only to be labelled a mixture**. It is not an offset.
- The board's attitude changes **continuously** through a turn, so the mixing fraction changes frame to frame — which
  means even a sequence of such perpendiculars cannot be differentiated into a speed.

> ⛔ **So no sideways speed is reported, in m/s or in board-lengths per media second.** The brief offered the
> media-second unit as a fallback for an unpinned clock. **The clock is pinned (§2); the quantity is not isolated.**
> Putting an un-isolated projection into a tidy unit would have produced a number that reads like a measurement and
> is not one, and this track has retracted six of those.
>
> ✅ **What the clip does give the question**: a large, clean **body-to-board relative travel** through the aerial —
> chest **1.05 m** off the board's axis at 9.867, drawn compactly over it by 10.47, back under him by 10.90. It is a
> **deliberate manoeuvre**, so it answers clip 26's open question no better than clip 26 did.

### 5.2 Questions 3 and 4 return nulls, and clip 26's reasoning survives this clip

- **Q3, the torso against the board through a turn: NULL.** A projected angle between two lines at different depths
  bounds the true angle in neither direction. Nothing in the front-on window is a turn, and nothing in the turning
  window is front-on.
- **Q4, the hips' lateral offset: NULL**, except as §5.1 qualifies it. **A front-on camera does not break the
  height/offset mixing on its own; only a board held square to the lens does, and the board is never held square to
  the lens while the hips are doing anything interesting.**

### 5.3 Q5 — the board moved under a body that is failing: NULL, for a clean reason

**The rider never loses it.** Across 275 samples at 0.1 s and every detailed sheet taken, the ride is continuous and
controlled; the clip **ends at 27.434 with him upright, filling the frame, back to camera, still riding**, and the final
frame repeats. There is exactly one event in which the board is moved decisively under the body — **the aerial at
9.70–10.93** — and it is deliberate. **The distinction the next build hangs on is not settled here either.**

---

## 6. The leg-chain admissibility gate, run early

**Run before anything was written, as clip 26 did and as the standing rule now requires.** The clearest frame in the
clip for it is **t = 9.867** (0.75×, gridded, both legs unobstructed against open water, bare feet visible):

| leg | projected thigh | projected shin | ratio (anatomy ≈ 1.0–1.1) | verdict |
| --- | --- | --- | --- | --- |
| rear | 103 px | 85 px | **1.21** | marginal pass |
| front | 90.5 px | 102 px | **0.89** | marginal pass |

Landmarks carry ±10–15 px, so each ratio carries **±0.1**. **The gate passes, marginally** — the first clip since 12 to
pass it on both legs. The chain then reads:

- rear `|hip→ankle| ÷ (thigh + shin)` = 187.2 / 188 = **99.6 %**
- front = 193.0 / 192.5 = **100 %**

> ⚠️ **And it is uninformative anyway, in exactly the way clip 12 predicted.** The rider is **visibly extended** in that
> frame — it is the launch of an aerial — so 100 % is what the eye says too. **Both admissible readings in this clip, as
> in clip 12, land on a frame where the rider is plainly extended.** **No stance rung is named anywhere in this
> document.**
>
> ⚠️ **The backup ruler is not used either.** The **lens height is not established** — no horizon is resolved in any
> frame measured — so apparent stature is not treated as a depth. It is used **once**, as a pure length scale at a
> single near-upright frame (§2.2), and flagged there.

---

## 7. What the body does elsewhere — the standing purpose

The skill's standing purpose outranks the day's questions: the product is a general understanding of how surfers move.
These are the things this ride shows that are not about the take-off.

**The camera.** One fixed position, long lens. The rider paddles toward it, rides across and away, and comes back. His
apparent size grows **24-fold in area** across the clip. That is useful to note as a *bias*: this is a single long-lens
view, and several of the series' standing refusals are properties of cameras, not of surfers.

**Arm carriage inside ONE continuing ride — four different carriages:**

| media s | arms |
| --- | --- |
| 3.40 | front arm **high above the shoulder**, rear arm down |
| 12.30 | **both hands low and forward**, near the deck |
| 15.90 | both arms forward over the board, elbows bent |
| 24.33 – 24.60 | trailing hand **down at the water**, body compressed |

**Four carriages, one ride, no fall.** ⛔ **No pose rule is proposed**, and this is a within-clip count on one ride, as
the standing refusal requires. It is consistent with clips 18–24: low arms, high arms and a folded torso all appear on
lines that continue.

**The aerial, as a movement, is a four-beat the game has no name for:**

1. **launch, 9.70–9.87** — the legs **extend** hard as the board leaves the lip;
2. **flight, 10.13–10.50** — the body **tucks**, knees up, board drawn to the body (the jersey's visible area falls from
   5758 to 3271 px as he folds);
3. **approach, 10.60–10.93** — the legs **extend again** to meet the water, feet reaching for the deck;
4. **absorb, 11.10–11.20** — the body **compresses** on touchdown, arms out wide.

**Extend → tuck → extend → absorb.** The landing stance is **0.75–0.83 m** of fore-aft foot spacing (§2.3) — wider than
the only laboratory number this project holds (0.63 ± 0.10 m), which is what an aerial landing ought to be.

**Between the turns** he spends long stretches crouched and quiet — trimming, adjusting, riding foam — with the hands
low. The unglamorous parts are most of the 27 s.

---

## 8. Part B — the mapping

*What the rider does* → *which of the game's own things it is* → *have it / partly / not at all*.
Game-side claims below are grounded in `src/physics/AttachedRider.ts` and `src/physics/predictiveBalance.ts` as read on
this branch; rows marked **(not checked in code)** were not traced to a source file.

| what the rider does | the game's thing | have it? |
| --- | --- | --- |
| Prone paddling with alternating strokes, 1.6 s of it, front-on | `RideInput.paddle` / the prone posture (`PRONE_GRIP`, `PRONE_SHIFT`) | **partly** — a prone phase exists; the stroke itself is not a visible-limb motion, which the owner's no-hidden-motors rule would want |
| **Both hands planted on the rails and loaded for 0.37 real s before anything rises** | — | ⭐ **not at all.** The shipped `'push'` begins at the input bit; there is no loaded pre-phase |
| **A two-stage trunk rise with a ~0.11 real s pause between the stages** | `PUSH_TIME` → `LANDING_TIME`, a monotone two-phase ramp | ⭐⭐ **not at all** |
| **Hands clear of the deck before any foot is seen planted** (≤ 0.15 real s, possibly 0) | — | **not at all** |
| Pop-up complete in **0.44–0.97 real s** depending on where the clock starts | `PUSH_TIME + LANDING_TIME = 1.20 s`, fixed | ⭐ **partly** — the move exists; **its duration is longer than every definition measured here** |
| Standing, trimming, adjusting between turns | trim | **have it** |
| Bottom turns and carves on an open face (9.0, 11.2–12.8, 19–22) | bottom turn, carve | **have it** (not re-measured here — the projection refusals in §5 apply) |
| **A full aerial: extend → tuck → extend → absorb, 0.68 real s of flight** | — | ⭐ **not at all.** No air exists |
| **Landing stance 0.75–0.83 m of fore-aft foot spacing** | the stance ladder sets hip height; fore-aft foot spacing is not a ridden quantity | **not at all** — and this is the fourth read to land on the **fore-aft axis** as a gap (clip 7's hips travelling aft, the Kirra clip's hips over the tail) |
| Four arm carriages on one continuing ride | the arm channel | **partly** — the channel exists; no rule, and none proposed |
| Leg depth / stance rung | Tall / Crouch / Compress / tube tuck (`STANCE_TABLE`) | ⛔ **not read.** §6: the gate passes but saturates, the lens height is unknown, **no rung is named** |

---

## 9. Part C — what could not be seen

- **The exact frame the hands leave the deck.** White deck, white foam, white hands. Bounded to 2.73 ± 0.07 media.
- **The feet landing.** Hidden behind the board and the spray in a front-on view. Bounded to ≤ 3.00 ± 0.04 media; could
  be earlier. **Marked obscured; the outcome is left unknown.**
- **Any lateral body-vs-board quantity.** §5. Not a resolution problem.
- **Vertical travel in metres through the pop-up.** The pan is uncorrectable against foam (NCC r = 0.26–0.55), so only
  the *shape* of the head's trace is used there, not its magnitude.
- **The lens height.** No horizon is resolved in any measured frame, so apparent stature is not used as a depth.
- **Whether the slow-motion factor is constant.** Measured in one 1.23 s window only.
- **Whether a cut could hide between two near-identical shots.** §3 bounds the detector, not the possibility.
- **The rider's actual board length.** A class bracket (1.75–1.90 m), not a measurement; it carries ±4 % into every
  metric figure.

---

## 10. Where this disagrees with, and extends, what is already on file

- **It does not contradict any earlier read.** It extends them.
- **It ends the "no take-off in the corpus" run at twenty-seven**, and it does so with the rider prone and paddling
  from the first frame of the file — the opposite of clip 25, whose subject was standing at t = 0.0167.
- ⭐ **It supplies the one thing every earlier read had to leave out: a media→real conversion.** Nothing in clips 1–27
  was convertible. **Their durations remain in media seconds and must not retroactively be converted with this clip's
  k — the factor is a property of this file, not of slow-motion surf footage.**
- **It confirms clip 26's two refusals rather than overturning them**, and adds the mechanism: the mixing of height and
  offset is broken by the **board's attitude to the lens**, not by the camera being in front.
- **It is the second clip (after 12) to pass the leg-chain gate on both legs, and the second to find the pass
  worthless**, because both admissible frames are frames where the rider is already extended.
- **Poster bias:** channel `@GabrielMedina10`, a **sixth** poster. The registry's standing note (four of nine clips from
  `@hunterjoness`) is unchanged by this one; this is the first clip in the series uploaded by its own subject.
