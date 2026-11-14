# C2, step 5b: the hand-back, the set-up and the bore's foam (2026-11-14)

Tags: [M] measured here, [C] read in the code, [S] sourced, [R] reasoned, [P] provisional.
The brief is ruling 37's "next"; the carried items are ruling 35's four. The consult behind the foam is
`water-physics/lip-thickness-and-foam-2026-11-13.md` §3 — the parts step 5a did not use. Everything is inside
`?wave=library`; **no new switch**, and with it off the program and the drawing are byte for byte as before.

**In one line:** the sea's own water is never touched by the library, so the mean level, the set-up and the rips are the
sea's own **to the bit**, not within 30 %; the hand-back no longer has to find the sea's crest again after the drift,
and the jump across it is small; and the bore now carries **its own foam** — opaque white behind the open curl ageing
on Koepke's ratios, milky turquoise on the flanks and in the roller — written as three numbers on the render nodes the
sea already draws, so no white layer is built anywhere and the page's shaders are untouched. **The foam is measured
and not seen:** it changes the foam channel by +0.45 of cover on 200 render nodes a wave, and it changes the stills
almost not at all, because the water sheet's cameras sit on the tube and the pool's water is too bright for white to
read on it (ruling 25e). The owner has not been shown the thing they asked for, and that is this step's main miss.

---

## 1. The hand-back

### 1.1 The plan's GPU forcing pass is not needed, and would cost the other two bars

The plan's step 5 names "`handBack.ts` with a GPU forcing pass". That was written when it looked as though the library
had taken the wave away from the sea and would have to give its water back. **It has not.** The sea's own wave is still
there, under the library's, running its own break: the zone writes the render nodes and nothing else, and the solver
never reads a number the zone produced [C, `WaveZone.step` and `applySnapshot`; measured in §3].

So the hand-back is a hand-back of the **drawn and felt surface**, not of water, and the other two bars of this step
come free: the mean level cannot drift, the water piled against the beach is the sea's own, and so are the backwash and
the rips. A forcing pass would put all three at risk to fix a bar that is not failing. **It is not built**, and that is
a deliberate departure from the plan, recorded here for the advisor to accept or send back.

### 1.2 What the hand-back has to get right instead

A slice's shape comes in and goes out in **the crest's own frame** (step 3's blend): while it blends, the shown crest
stands at (1 − a) the sea's crest + a the case's, so the sea's crest and the case's never show as two [C]. The case's
crest and the sea's drift apart over the slice's whole life, because they travel at their own speeds — about 6.0 m/s
against 6.8 — and the blend-out has to walk the shown wave back onto the sea's in 2.4 s. The gap it walks is what
matters, and so is whether the crest it walks back onto is the one the slice has been following.

### 1.3 What was built

**The sea's crest is followed every step of a slice's life, not only while it blends.** Step 3 dropped the track as soon
as a slice became whole (`slice.seaS = NaN`), so at the hand-back the blend had to find the sea's crest again, starting
from the case's own place — metres away by then — and searching ±10 m. Where it found a different crest the shown bore
moved by the difference as the blend took hold; where it found none it fell back to the case's own place, which left the
sea read at the case's own stations and the two curves blended out of phase [C, the old `composite`].

Now the track runs all along, and a crest lost for a step is carried on at a crest's pace instead of being re-found.
The probe counts the losses: **0 over the whole run**, against step 3's own `seaMissed` counter [M].

Nothing else about the hand-back was changed: its course is still step 3's 2.4 s in the crest's own frame.

### 1.4 What the bar measures, and why the first reading was thrown away

Round 1 read the bore's place as **the highest station** on the lane. A bore's top is nearly flat, so the highest
station hops metres from step to step: that reading gave a median place change of 0.33 m per 0.1 s where the
arithmetic of the blend says 0.08, and a worst of 24 m. **It measured the finder, not the wave** [M, round 1].

Round 2 reads **the bore's front**: the shoreward place where the surface falls through the half-height between the
bore's top and the water ahead of it. That is a steep single crossing, read to centimetres, and it is what the eye
tracks. The height is the bore's own — its top over the water ahead.

Two different things then get measured, and the plan's bar is the first of them:

- **the jump** across the hand-back itself: the one step on which the slice is dropped;
- **the drift** over the whole blend-out: a rolling 0.1 s window through it.

Both are reported as the **hand-back's own part** — the library's reading less the sea's own at the same moment — so
the water's own motion is out of the number. The sea's own reading is given beside them as the control.

### 1.5 The readings

**The jump across the hand-back passes, and it is not close** (316 hand-backs on every third lane, 40–115 s of the
pool) [M, `c2-step5b-runs/round3-a.txt`]:

| at the hand-back itself, the library's reading less the sea's | median | 90 % | 99 % | worst | bar | over it |
|---|---|---|---|---|---|---|
| the bore's place | 0.004 m | 0.013 | 0.045 | **0.277** | 0.30 | **0.0 %** |
| the bore's height | 0.002 m | 0.009 | 0.020 | **0.044** | 0.05 | **0.0 %** |

Every one of the 316 is inside both bars, worst included. The sea's crest was lost on **0** steps.

**The drift over the whole blend-out is not small, and it is the gap being paid back.** Over a rolling 0.1 s window
through the 2.4 s, the library's reading less the sea's moves by a median of **0.193 m** in place (39.7 % of windows
over 0.3 m) and 0.021 m in height (23.7 % over 0.05). The sea's own place moves 0.571 m median over the same window,
which is the bore running at about 5.7 m/s, so the drift is about a third of the water's own motion.

Its cause is measured, and it is not the overlap of two slices on one lane: with two live the drift is the same size
(29.1 % over 0.3 against 39.8 % with one), and two-slice windows are 602 of 61 747. It is **the gap**: when the
blend-out starts, the case's crest stands a median of **1.27 m** from the sea's, 90 % 3.79 m and 99 % 19.75 m, and the
blend walks the shown wave over that gap in 2.4 s. The bore's height has to move a median of 0.151 m over the same
2.4 s.

**This is reported, not fixed.** §7 says what would fix it and why it was left.

## 2. The bore's foam

### 2.1 Why it goes on the render nodes and not on a mesh

The sea already draws its own whitewater from three numbers a render node: the foam's **cover** (0–1, which the look
multiplies its foam colour by), the plume's **void fraction**, and the plume's **depth** [C]. The library's bore writes
the same three, by the same weight its heights take and in the same form, (1 − A) the sea's + the library's own
[C, `WaveZone.applySnapshot`].

Three things follow, and they are the reasons for doing it this way:

1. **No white layer anywhere.** Nothing is added or moved: the cover is a colour on the surface the nodes already draw.
   The consult's "about 2 cm of foam is already fully opaque, never build a thick white shell" holds by construction,
   as it did in step 5a [S, Koepke 1984; Dierssen 2019].
2. **No seam at the hand-back.** The library's cover and the sea's are the same quantity in the same units, so where a
   slice fades its white fades with it into the sea's own whitewater. This is also why Koepke's reflectances are used
   as **ratios** and not as absolutes: the sea's foam colour sets the absolute, and an absolute here would put a seam
   exactly where the owner asked for a seamless join [R; step 5a, ruling 37].
3. **No new draw cost.** The page's shaders are untouched.

### 2.2 The three materials

| Where | What it is | How it is drawn | The numbers' source |
|---|---|---|---|
| the back face, and everything before a slice's touchdown | clean water | no library foam at all, and the sea's own still held off until touchdown (`FOAM_HOLD`) | step 5a's rule, kept |
| behind the open curl: the pile, from the crest landmark to the roller's toe | already landed; above the water line it is 60–99 % air, so not a liquid | **opaque** white: the cover goes to 1 at the landing and ages 1 → 0.745 at 1 s → 0.291 at 10 s | [S] Koepke 1984's 0.55 → 0.41 → 0.16 as ratios; [M] Dierssen 2019 for the 60–99 % |
| the pile's two flanks and the roller's toe | aerated, not foam | void fraction 0.40 fresh falling to 0.13 as the white ages, with the plume 2 m deep: the look makes milky turquoise out of those two, the white carried up through about 2 m of water, so red goes first | [S] the consult's void band 0.13–0.4; [S] Pope & Fry 1997 for the tint; the 2 m is the recipe's one free number [P] |

The white's **edge** is torn by the water's own foam pattern — the lace's cells and the churn's clumps, which the look
already applies to any node carrying cover — so a foam line's edge is ragged and not ruled without a line of new code
[C]. Step 5a had to tear its own edge because the curl's mesh does not go through that pattern.

### 2.3 The stretch, and the clock

Each slice's white runs from its own **crest landmark** to its own **toe landmark**, which on a broken wave are the back
of the pile and the roller's toe, and tapers out over 0.5 m behind the crest and 1.5 m past the toe (`boreShape`). Those
two widths are reasoned, not measured: the consult names the materials, not their width [R, P].

The clock is the slice's own touchdown, as step 5a's lip white is: **water turns white at a time, not at a thickness**
[S, the consult §3]. The white comes in exactly as the sea's own foam hold goes out, over the same `FOAM_HOLD` (0.5 s),
so the two never add up to more than the slice's share and there is no flash and no gap at the landing [C]. Chanson's
spray burst inside 0.4 s of impact is the same order, so the existing 0.5 s was kept rather than a new constant added
[S, R].

## 5. The hand-over's height bar, re-read with ruling 31's ten cases

The bar (step 3): the case's H at the hand-over should be 0.95–1.05 of the sea's. Step 3b read **median 1.07** with
63.1 % outside the bar, and said the reason was that 962 of 1 264 slices clamped a key. Ruling 31's ten runs are now in
the library (19 cases): they fill the A0 0.12 row on the three beds, put slopes 0.055 and 0.085 between them, and give
slope 0.105 a second reef depth, so HS/h0 is a real key for the first time.

**Better, and still a miss** (1 266 slices, the same 90 s window as step 3b) [M, `c2-step5b-runs/round2-bars.txt`]:

| the case's H over the sea's | step 3b, 9 cases | step 5b, 19 cases |
|---|---|---|
| all slices | median 1.065, outside 63.1 % | **median 1.046, outside 54.8 %** |
| with no τ clamp over 5 % of the weight | median 0.973, outside 26.7 % (240) | **median 0.996, outside 34.2 % (471)** |
| with no clamp at all | median 1.121, outside 80.0 % (**10** slices) | **median 0.978, 90 % 1.028, outside 12.3 % (57** slices) |

**The shape is right where the keys cover it.** The population with no clamp at all has grown from 10 slices to 57 and
its median has moved from 1.12 to 0.978, with the 90th at 1.028 — inside the bar. What is left outside is clamps.

**The clamp that is left is τ, and ten more cases cannot fix it.** 814 of 1 274 slices still clamp τ, and every one of
them clamps **low** — the slice's H/d at the hand-over is under what the case reads at its own first stored frame. The
cases that clamp are the gentle beds: b1-a2 clamps on 0.97 of its weight, b15-a3 on 1.00, b1-a1 on 0.85, b1-a0 on 0.70,
b15-a2 on 0.49; the steeper beds (b25, b3) clamp on none of theirs. **That is a lead, not a key:** those runs do not
start early enough for the pool's own waves, and the fix is longer leads on the gentle beds, not more cases [M, R].

**One thing got worse, and it is worth the advisor's eye.** The A0 clamp went from 277 slices to **717**. The matcher
brackets the slope first and then runs the A0 polyline *within the chosen bed*, and the two new intermediate beds
(slopes 0.055 and 0.085) carry only **two** A0 rows each, 0.25 and 0.355. A slice at those slopes used to interpolate
between b1's four rows and b2's three; now it falls on a two-point polyline that starts at 0.25 and clamps below it.
**A sparse new bed is worse than no bed**, and the cure is the A0 0.12 and 0.15 rows on b15 and b25 [M, R].

## 6. The stills

Same shots and the same command as step 5a, on the 2 m pool at Big with the owner's switches and `&wave=library`,
**three legs**:

- **before** — main's `src` checked out in this worktree (so nine cases, no bore foam);
- **after** — this branch;
- **nofoam** — this branch with the bore's foam switched off in the code, so the foam's own contribution can be told
  from the ten new cases'.

Plus `after-ride-*` and `after-close-*`, which are new shots (the water sheet's pool view has no `bore` shot; `ride`
looks along the broken wave from the toe, which is the nearest thing to looking back at the bore).

| Pair | What changed |
|---|---|
| `before-*` against `after-*` | the whole step: 13.5 % of pixels in `front-midday` and 26.1 % in `channel-midday` differ by more than 2 of 255. **Almost all of that is the ten new cases**, which change the slices' shapes, not the foam |
| `nofoam-*` against `after-*` | the foam alone: **0 pixels** in `front-midday`, `channel-midday`, `channel-sunset`, `ride-midday`, `ride-sunset` and `close-midday`; 543 (0.06 %) in `behind-midday`; 5 743 (0.18 %) in the overview sheet |

JPEGs in `c2-step5b-stills/`.

## 4. Ruling 35's four carried items

### 2.4 Does it reach the page, and does it read?

**It reaches the page.** Stepping the pool's library sea and writing the snapshot the page draws, about **108 render
nodes a wave** carry the library's own foam at any instant, **93 of them over half cover**; the whitest reads **0.85**,
the void fraction runs **0.129–0.349** — inside the consult's 0.13–0.4 band — and the plume stands at the full 2.00 m
[M, `c2-step5b-runs/foam.txt`].

**And it is a large change to the foam channel where it lands.** At those same nodes the sea's own cover was a mean of
**0.11–0.20** (its whitewater is somewhere else, because its wave and the library's have drifted apart by a metre or
more), and the library writes a mean of **0.59–0.63** over it. The bore's white is the library's own, not the sea's
showing through [M, `c2-step5b-runs/foam.txt`].

**But the water sheet's shots barely show it, and I could not make one that does.** With the foam written and with it
switched off in the code, everything else the same build, the close-ups come out **identical to the pixel**:
`front-midday`, `channel-midday`, `channel-sunset`, `ride-midday`, `ride-sunset` and `close-midday` all read 0 of
921 600 pixels differing by more than 2 of 255; `behind-midday` differs in 543 pixels, 0.06 % of the frame. Only the
overview sheet shows it, as a thin band: **5 743 pixels, 0.18 %**, in the same y band of all six of its panels [M].

Those cameras sit on the tube, and the stretch the library's foam owns is down the line, where the wave broke earlier
and where a slice is still inside its 5.4 s of life after touchdown. **So the honest position is that the foam is
built and measured and the owner has not been shown it.** The `*-ride-*` stills are the nearest thing — they look
along the broken wave, and the pale misty band with the lacy pattern on its face is where the bore is — but the
foam-off leg proves that band is the sea's own, not the library's.

A third thing is in the way of seeing it, and it is ruling 25e's: **the pool's water is so bright that nothing drawn
on it reads as white**. Step 5a said the same of the lip. Until the water's light is fixed, "does the bore look like
broken water" cannot be answered from a still of this spot [R].

### 4.1 Item 1: the flow below the deeper stored depth

The cases store velocity at two depths and nothing under them; step 4 held the deeper stored value on down. Measured at
seats on the pool, that held value stood **1.26 m/s from the sea's own flow at 0.8 m and 1.18 m/s at 1.5 m**, with the
library's share still a whole 1.000 all the way down — so a submerged body felt water the library never ran [M,
round 1].

**Built:** the library's share of the flow now eases to 0 from the deeper stored depth over twice that depth
(`DEEP.fade` = 2, so 0.45 m → gone by 1.35 m on the pool), and the sea's own water takes over under it. `DEEP.fade` is
provisional [P]: 2 keeps the whole of a board and the first half-metre under it on the library's water, and puts a
duck-diving body back on the sea's.

### 4.2 Item 2: the surface's share and the flow's

The fault, as ruling 35 put it: the surface's share is resampled on the 1 m render nodes while the flow's is evaluated
at the point.

**The first try at this was wrong, and the step 4 test caught it.** `ZoneSurface.weightAt` — the nodes' weight A — is
the **frame's** weight alone: the blend with the sea is already inside the composite's heights, since a node's height is
(1 − A) η_sea + Σ w h and each h is itself a (the case) + (1 − a) (the sea). So a node's library share is A times the
blend share, not A. Handing the flow A gave it the whole of the library's water the instant a frame appeared — a step of
1 in one frame, which the step 4 test measured at once.

**Built:** the lanes carry the product Σ w a, the nodes resample it exactly as they resample the heights
(`ZoneSurface.shareAt`), and the flow takes that. The two shares at a seat are then the same number by construction.
A second thing had to go with it: the lane's own end taper was in the flow's weights as well as in the nodes', and
counting it twice left the field's last lanes reading no flow at all where the nodes still carried a twentieth of the
library's water.

### 4.3 Item 3: the kink in du/dt at a slice's throw

**It is real, it is in the data, and a rider does not feel it.** Before its throw each of a slice's cases runs at its
own rate, (−τ_h,i)/Δ, so that they all throw together; from the throw every case runs at rate 1 [C,
`WaveLibrary.tausAt`]. τ is continuous across the throw by construction, but dτ/dt is not, and the library's velocity
derivative is multiplied by that rate — so at the throw it steps by |rate − 1| of itself.

- Σ w |rate − 1| at the throw: **median 0.025, 90 % 0.081, worst 0.106**, over 1 326 slices blending a median of 3
  cases [M].
- The step in the library's own du/dt at the crest landmark across the throw: **median 13.6 m/s², 90 % 25.7, worst
  53.9** [M]. The crest just before the throw is the most violent place on the profile, which is why the number is
  large.
- What reaches a board is not that: the material acceleration is capped at 5 g and weighed by the share, and step 4
  measured the felt |Du/Dt| at **median 0.32 m/s², 99 % 1.63** [M, c2-step4.md §D].

**Not fixed, on purpose.** A C¹ clock means blending the rates over a window around the throw and then re-solving the
pre-throw rate so that τ(throw) is still exactly 0 — otherwise every slice's shapes shift in time. That is a change to
the library's clock for a kink below what a rider can feel, and it would need step 4's velocity bar and step 3b's whole
set re-measured. **Recommended: leave it, and revisit only if a rider ever reports a tick at the throw** [R].

### 4.4 Item 4: the lip blend was tuned for the old swept tube

The constant is `LIFT.collapse` = 0.6 s, the old swept loft's √(2W/g): it is how long after touchdown the loft lets go
of the tube, and it is also what sweeps the lip's landing white (`lipFoamAt`'s `collapse`) [C].

**Measured on the library's own 19 cases** (part K of the probe): after touchdown the stored profile is still **folded**
— its steepest segment reads 90° — at +0.3 τ, +1 τ and +3 τ in **every one of the 19**, and only **2 of 19** ever have
the fold go for good inside their stored frames (3.22 s and 2.17 s at the pool's scale). Five fall under `LIFT.bridge`
(50°) at 0.70–3.03 s.

**So the case's own curve cannot key the collapse, and that is not a tuning fault.** The 128 points keep their arc
parameterisation, so after touchdown the lip's points lie behind and under the landed water and the polyline stays
multi-valued by construction — it never unfolds, however long the bore runs. The honest reading:

- 0.6 s is **not** the library's own number, and nothing in the game's files can make it one;
- the quantity that would is the void's closing, which the runs hold in their air sections (QOUT) but the game's files
  do not carry;
- until then, keeping the swept tube's √(2W/g) is defensible, and what it decides — when the nodes' bridge takes the
  bore off the loft — is a drawing choice the owner has already ridden.

**Not changed.** Moving it would move the drawn tube's collapse, which is a look change this step was not asked for.

## 7. What I am unsure of

1. **The pay-back's course.** The blend-out walks the shown wave back onto the sea's crest over 2.4 s. A longer course
   (starting at touchdown, over 5–6 s) would cut the drift by about 2.5× and change no shape, only the slice's place —
   towards the sea's crest, which is where the wave belongs. I did not build it: it moves the place every lane's slice
   stands at, so it needs step 3b's whole set re-measured, and the bar as written (the jump at the hand-back) does not
   need it. **Recommended as the next step's first item** [R].
2. **The aerated tint's 2 m**, and the flanks' widths (0.5 m behind the crest, 1.5 m past the toe), are by eye, as step
   5a's feather was [P].
3. **The drawn white's absolute** is still the sea's foam colour, about 1.6× Koepke's densest fresh foam. That is
   ruling 25e's job and it must move for the whole scene at once, not for the bore alone [R, step 5a §5].
4. **`DEEP.fade` = 2** is provisional. Nothing measured says where the library's water should stop; 2 is the first
   scale-free choice that puts a board on the library's water and a submerged body on the sea's.
5. The library's files grow from 11.81 MB to **24.9 MB** for 19 cases, over the plan's step-2 bar of 15 MB. They are
   fetched only under the switch, and the ten new ones are what the height bar needed, but the bar is missed and is the
   advisor's to accept [M].
6. I did **not** ride it, and no rider session was run (the brief's rule). The owner rides and judges the foam.
