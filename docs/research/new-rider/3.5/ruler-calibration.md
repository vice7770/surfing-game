# The rulers, calibrated: sixteen clips' photogrammetry run against a subject whose true joint angles are known

`engine-target.md` names its own biggest gap: *"No quantity in this document has ever been computed on the game's own
rider in the footage's own units. Every target in §2 is a footage number; every game-side entry in §1 is a code
reading, not a measurement."* This closes it from the other end. **Every ruler in the video series is a ratio of
projected distances between joints, so a subject whose true joint angles are known can be put in front of a pinhole
camera and each ruler computed from the projected points. The discrepancy is the ruler's bias.** No render, no
screenshots, no browser: the probe is `3.5/rulers.ts`, the truth comes from the game's own `StanceGauge` in 3D, and the
full output is `3.5/results/35r/out.txt`.

**Measurement only. Nothing under `src/` or `server/` was touched, no constant was tuned, no switch was added, and no
behaviour was changed.** The probe imports `readGlbSkeleton`, `HumanoidRig`, `StanceGauge`, `posturePoints` and
`boardDeck` and reads them; no export was needed.

**What this document read, so its quotations can be checked:** the twelve merged video reads in `3.5/`, the skill
`.claude/skills/surf-video-read/SKILL.md`, `3.5/engine-target.md`, and video reads **13, 14 and 15** from the open
branches of PRs **#410**, **#412** and **#414**. The sixteenth read is not in this repository and nothing here quotes
it; where a figure below is attributed to V13–V15 it is quoted from those branches as they stood on 2026-11-18, and
those documents are still the owner's to merge.

---

## 0. The answer first

> **⭐ A trunk held at a FIXED lean, with zero anatomical flexion by construction, manufactures 32.7–53.9° of apparent
> angle as the body swivels through ±90° of yaw under a LEVEL lens, 27.8–46.9° within ±30° of yaw, and 49.3–124.1° once
> the lens is raised 45°** (5 subjects × 2 poses, true tilts 33.2–55.3°, 90 px head, no landmark error). **So every
> published trunk span is inside what a swivel alone can make, and on a raised lens — which is most of the series —
> they carry no information about anatomical travel at all.**

And the second finding, which was not asked for and matters as much:

> **The leg chain is not broken by "side-on versus down the line" the way the series concluded. It is broken by ONE
> bearing: the direction the knees point.** On the game's own bodies that is 24–29° off the toes' rail toward the nose,
> and at that bearing the chain reads **100.0 % at every knee angle from 24° to 99° of flexion — a range of 0.0 points
> over the whole sweep.** The error falls off monotonically with the view's angular distance from that bearing (folded
> at 90°, since opposite view directions project alike), measured at a 99° knee: **within 10° of it, 30–36 points;
> 20–30° away, 17–25; 35–45° away, 5–15; 55–65° away, 1.7–4.6; 75–90° away, 0.1–2.0.** So the usable shot is the board
> **nearly end-on**, |bearing| ≥ 80°, from the nose *or* the tail. **The series' corrected footage ask — "water-level,
> SIDE-ON, emphatically NOT from behind" — asks for the camera that cannot see the bend and refuses the two that can.**

---

## 1. ⭐ The table a video reader should apply

Every row is measured in §§2–7 below. "Bearing" is the camera's angle from the toes' rail toward the nose, and a reader
who cannot measure it directly can read it off the **board**: its projected length ÷ width, against its true 4.2.

| ruler | use it when | refuse it when | its bias where usable | what it resolves at a 40 px head, ±3 px landmarks |
|---|---|---|---|---|
| **leg chain** `\|hip→ankle\| ÷ (\|hip→knee\|+\|knee→ankle\|)` | the **board is nearly end-on**: projected length ÷ width ≤ 0.7, i.e. \|bearing\| ≥ 80° | the board shows any of its length (aspect ≥ 2.2, \|bearing\| ≤ 60°), and **always** within 45° of where the knees point | **−1.4 to +5.3 points at \|bearing\| ≥ 80°, −0.6 to +2.6 at 90°** (it over-reads: an upper bound within 1.5 points, as the skill says) | **15°** of knee flexion; 6.8° at a 90 px head, 30° at 20 px |
| **in-plane inverse** | an admissible frame, by the row above | anything else | `flexion = 2·arccos(chain)`, exact to **0.14 points** over 145 poses | — |
| **thigh/shin 1.0–1.1 gate** | ⛔ **never as published** | always | its band is wrong before any projection: these bodies' own 3D ratio is **0.89–1.03**, and it **false-rejects exactly the bearings where the chain works** | — |
| **board aspect** (the replacement gate) | any frame with the board's nose, tail and both rails visible | the board is hidden | needs **no body landmark**; **aspect ≈ 0.1 ⇒ within 2.6 points, ≤ 0.7 ⇒ within 5.3, ≤ 1.4 ⇒ within 9.6.** Above 2.2 the aspect gives \|bearing\| but not its sign, and the two signs differ by up to 30 points — so refuse unless you can also tell which end of the board is nearer | — |
| **trunk gate** `\|shoulder→waistband\| ÷ head` | ⛔ **never as a gate** | always | it reads **1.95–2.24 at every bearing** on a near-vertical trunk while the angle error runs 0–23.6°; one number, two unknowns (§4.4) | — |
| **projected trunk angle** | the **lens is level** (horizon through the rider) **and** the board is end-on (\|bearing\| ≈ 90°), **and** only per frame | a raised lens; any **span** between two frames whose yaw may have changed | ≤ **2.8°** at \|bearing\| ≈ 90° and at −45…−90 (it is 4.6–6.3° at +75: the trunk's lean has a sign too); a lower bound only at a level lens — it **over-reads** by 1.3° at 10° of elevation, 16.6° at 30°, 120.3° at 45° | about 1° of angle; the yaw, not the pixels, is the error |
| **hip above deck ÷ head** | within one shot, one fixed lens, **the stance's width unchanged** and **the head's projected length unchanged** | the feet move apart (±0.15 m of span = ∓0.11–0.17 head-lengths), or the head tips toward the lens | fold-invariant to **0.08 head-lengths** with the head upright at ≤20° of elevation; **+0.51 to +0.84** if the head goes with the chest | ±0.5 head-lengths of noise, which is 3–4× the fold bias |
| **apparent stature in head-lengths** | within one shot at **one fixed lens elevation** | the lens's elevation changes between the frames (**50–67° cancels a 45° fold**), or the head's projected length shrinks (the head pointing at the lens makes the ruler explode) | responds to a 45° fold by **1.06–4.69 head-lengths at every elevation from 0 to 60°** — it is **not** dead on a raised lens; its *level* is biased (7.13–7.31 at 0° of elevation falling to 5.35–6.21 at 60°) | ±0.5 head-lengths; the fold signal is 1.1–1.5, so a fold of about 20° is the floor |

**One lens serves both the leg and the trunk: level with the rider, looking along the board's axis, from the nose or
the tail** (the trunk's error there is 1.3–2.8°, the leg's −0.6 to +2.6 points). Nothing in sixteen clips is that shot, and
it is not the shot the series has been asking for.

---

## 2. What the probe is, so the numbers can be checked

**Subjects — the game's own bodies.** The four committed surfer skeletons (`public/assets/surfers/surfer1–4.glb`, read
with the game's own `readGlbSkeleton`) and `createTestHumanoid`, the stand-in every rig test and every published rig
figure was read on. Five subjects:

| subject | stature m | head length m | thigh m | shin m | thigh/shin 3D | acromion / stature | hip joints / stature | knee flexion in the game's standing pose ° (front / rear) |
|---|---|---|---|---|---|---|---|---|
| surfer1 | 1.665 | 0.216 | 0.390 | 0.405 | **0.96** | 0.787 | 0.516 | 42.2 / 43.6 |
| surfer2 | 1.664 | 0.216 | 0.408 | 0.397 | **1.03** | 0.792 | 0.523 | 42.4 / 43.6 |
| surfer3 | 1.751 | 0.227 | 0.409 | 0.459 | **0.89** | 0.791 | 0.533 | 39.3 / 44.2 |
| surfer4 | 1.722 | 0.224 | 0.434 | 0.422 | **1.03** | 0.795 | 0.535 | 39.4 / 44.3 |
| test-rig | 1.720 | 0.223 | 0.400 | 0.420 | **0.95** | 0.814 | 0.523 | 42.3 / 43.6 |

Stature is the GLB's own bind-pose bounding box (its POSITION accessors' bounds, so the crown is a real vertex, not an
estimate); head length is **stature ÷ 7.7**, the series' own denominator, and the chin is one head-length below the
crown — **that chin is a convention, and §8 says what it costs.**

**Poses.** The physics' seven points from `posturePoints('standing', …)` with the five trunk-and-hand points dropped by
`depth`, which is how `AttachedRider` crouches. The ladder runs from 0.12 m **above** the standing pelvis to Compress's
own `CROUCH_DEPTH` of 0.30 m, 29 rungs, which spans **21.5–100.5° of true front-knee flexion**. Each pose is solved 240
times at 60 Hz from a `reset()` and the knees are checked identical over the last second; the trunk never settles
exactly because the rig breathes, and that breath is **0.30–0.35° inside a second**, recorded rather than hidden.

**Truth.** `StanceGauge.measure()` in 3D for the knees, and the 3D angle of the **same segment the ruler measures**
(acromion → waistband) for the trunk — not `StanceAngles.trunkTilt`, which is the spine's base to the neck.

**The camera.** A pinhole looking at the hips, no roll, at 20 m (8–200 m moves the leg chain by ≤0.5 points: §8 of the
output — the whole result is a near-orthographic one, which is what a long lens on a surfer is). Bearing 0 is side-on
from the side the rider faces; ±90 is along the board's axis. A body swivelled in yaw and a camera swung in bearing are
the same projection, so one sweep serves both.

**The pixel grid is part of the measurement.** Every landmark is projected, scaled so the subject's **projected** head
is 20, 40 or 90 px — the clips' own range — and **rounded to a whole pixel**. On top of that a seeded Monte Carlo of 240
draws adds an independent uniform ±1 or ±3 px to each coordinate: the reader's own placement error, which the clips
quote as ±3 source px. **The report is deterministic and reproduces byte for byte** — checked by re-running it, and
again by adding the pose cache the probe now uses, which cut 150 s to 12 s and changed **not one character** of the
output.

`qt(v, 0.5)` in this codebase is the **upper middle** element, not a mean of two, and that is the one used wherever
"upper-middle" appears below. Everything else is a plain min–max across the stated population.

---

## 3. ☠️ Controls — what a broken ruler would look like, and that these do not

The last round published a negative control reading zero because a filter compared against `NaN`, inside its own
section warning about that. So:

**N2, the finite guard.** Every ruler value passes through `finite(x, what)`, which **throws** where the value is made.
Nothing is filtered, nothing is compared against `NaN`, and a non-finite anywhere kills the run. The run exits 0.

**N3, the range guard.** A broken ruler's output range over a sweep is 0. The leg chain's range over the ladder's
24–99° of true flexion (subject means) is **15.8 points side-on, 8.5 at bearing 45, 32.6 down the line** — and **0.0 at
bearing 30**, which is the finding of §5.3, not a bug: that one bearing is a ruler that cannot fail, and the probe
reports it as such. The gate's own reachable range on one body over 15 folds × 37 bearings is **0.21–3.80**.

**N1, the shuffle.** `r(chain, true flexion)` = **−0.952** side-on, **−0.889** at 45°, **−0.981** down the line; against
a seeded shuffle of the same truths, **r = 0.027** in all three. A metric that cannot fail would score alike both ways.

**P1, the positive control for the leg chain.** The one camera where the ruler is correct by construction is the leg's
own plane. Projected from exactly there, the 2D chain recovers the 3D chain to **0.00–0.66 points, upper-middle 0.08**,
over 45 readings (5 subjects × 3 depths × 3 head sizes).

**P2, the positive control for the trunk angle.** From the plane containing the trunk and the vertical, the projected
angle recovers the 3D angle to **0.01–0.71°, upper-middle 0.09°**, over the same 45 readings — and the rig's own breath
is 0.30–0.35° of that.

**If P1 and P2 had not recovered, nothing else in this document would mean anything.** They do, on a pipeline that
cannot silently swallow a bad value.

---

## 4. R3 — the trunk gate is not a gate

Clip 13 proposed it: projected shoulder→waistband ÷ head length, **1.6–1.8 in-plane** from standard proportions, "much
shorter means the trunk points at or away from the camera". Clip 14 found the band did not transfer (two visibly
vertical trunks read **2.03 and 2.11**) and corrected it to a method: run it within a clip against that clip's own most
vertical frame.

**4.1 The band is a garment convention, not an anatomy.** On the game's own bodies, in the game's standing pose, the
segment the ruler measures is:

| waistband landmark | in-plane value, head-lengths (5 subjects) |
|---|---|
| the **hip joints** (the trochanter line, where a low waistband or a bikini bottom sits) | **2.08–2.24** |
| the **0.60-of-stature line** (the skill's boardshorts figure, which the 1.6–1.8 band is derived from) | **1.45–1.69** |

**The published band contains no subject on the hip line and only two of five on the 0.60 line.** Moving the landmark
by the width of a waistband moves the ruler by **0.6 head-lengths**, three to six times what 45° of yaw does to it on
the same pose (0.1–0.2).

**4.2 It cannot see the failure it was invented to catch.** At the game's standing pose, swept −90° to +90° of bearing
with a level lens and a 90 px head:

| bearing ° | gate (hip line) | projected trunk ° | true 3D angle ° | **error °** |
|---|---|---|---|---|
| −90 | 2.15–2.22 | 15.4–21.1 | 17.5–23.9 | 2.1–2.8 |
| −60 | 2.19–2.24 | 17.6–23.8 | 17.5–23.9 | **0.0–0.1** |
| −15 | 2.04–2.18 | 12.3–17.1 | 17.5–23.9 | 5.1–6.8 |
| 0 | 1.99–2.16 | 8.6–12.1 | 17.5–23.9 | 8.9–11.8 |
| +30 | 1.96–2.13 | 0.3–0.6 | 17.5–23.9 | **16.9–23.6** |
| +60 | 2.01–2.16 | 9.5–12.7 | 17.5–23.9 | 8.0–11.2 |
| +90 | 2.12–2.21 | 15.4–21.2 | 17.5–23.9 | 2.1–2.7 |

**The gate reads 1.95–2.24 — "admissible" by any reading of the published rule — at every bearing, including the one
where the angle is wrong by 17–24°.** It responds only once the trunk is *already* deeply folded (at Compress's 0.30 m,
with a true 49–55°, it runs 1.30 at bearing +15 to 2.35 at −75), and then it conflates the fold with the yaw.

**4.3 One number, two unknowns.** The gate is the projected *length* of the trunk segment, and a fold shortens that
length exactly as a yaw does. Folding `surfer1`'s trunk from the standing pose in 5° steps (legs untouched) and sweeping
the bearing in 5° steps:

| the gate reads | (fold, bearing) pairs that produce it | the true 3D angle among them | **the truth it cannot separate** |
|---|---|---|---|
| 1.40 ± 0.03 | 8 | 60.1–90.1° | **30.0°** |
| 1.60 ± 0.03 | 16 | 50.1–90.1° | **40.0°** |
| 1.80 ± 0.03 | 26 | 35.1–90.1° | **55.0°** |
| 2.00 ± 0.03 | 45 | 20.1–90.1° | **70.0°** |

**A single projected length cannot separate two unknowns.** No band, no per-clip normalisation and no "most vertical
frame" fixes that; the gate would need a second measurement that is sensitive to yaw alone, and the board is one.

---

## 5. R1 and R2 — the leg chain, and the bearing that kills it

**5.1 The mapping, with the pixel noise beside it.** Side-on at a level lens, 5 subjects × 29 depths:

| true front-knee flexion ° | 3D chain % | projected @90 px | @40 px | @20 px | ±3 px band @40 px |
|---|---|---|---|---|---|
| 21.5–25.6 | 97.5–98.2 | 99.4–99.6 | 99.3–99.6 | 99.2–99.6 | 98.6–99.9 |
| 39.3–42.4 | 93.2–94.2 | 98.2–98.5 | 98.1–98.4 | 98.0–98.6 | 97.1–99.2 |
| 55.8–59.3 | 86.9–88.4 | 96.1–96.6 | 96.1–96.7 | 95.9–96.6 | 94.5–97.8 |
| 73.7–77.7 | 77.9–80.1 | 92.3–93.1 | 92.4–93.4 | 92.3–92.9 | 90.2–95.1 |
| 96.4–100.5 | 64.0–66.8 | 82.5–85.0 | 82.4–85.3 | 83.3–85.3 | 78.8–88.3 |

**Side-on, 34 points of true range become 17 projected points, and the ruler over-reads by 17.5–18.9 points at a deep
knee.** Down the line (|bearing| 90°) the same sweep tracks the truth within −0.6 to +2.6 points at every rung of the
ladder.

**The sign, because "an upper bound" is a claim about the sign.** Over 5 subjects × 29 depths × 19 bearings the chain
**over-reads by up to +36.0 points and under-reads by at most 1.5**; inside the usable window (|bearing| ≥ 70°, which
includes the marginal +70) it over-reads by up to +9.6 and under-reads by at most 1.5. **The skill's "it is an upper
bound" is correct to within 1.5 points.**

**The in-plane inverse, for a reader with an admissible frame: `flexion = 2·arccos(chain)`.** For equal thigh and shin
that is exact; against the probe's own 3D readings over 145 poses (thigh/shin 0.89–1.03) it deviates **0.00–0.14
points, upper-middle 0.01**.

**5.2 The resolution — the answer to "the flexion range over which the ratio moves by more than the pixel noise".**
The slope is fitted over the whole sweep; the noise is the 5th–95th band of 240 seeded draws at the deepest pose.

| camera | slope, points per ° | resolution at 90 px | at 40 px | at 20 px |
|---|---|---|---|---|
| bearing 0 (side-on) | −0.182 | 1.9° / 6.3° / **16.8°** | 5.9° / 14.1° / **37.7°** | 16.2° / 27.4° / **73.2°** |
| bearing 30 (where the knees point) | **−0.000** | **none at any head size** — the implied resolution runs 358° to 113 000° | | |
| bearing 45 | −0.083 | 7.3° / 17.0° / **44.4°** | 11.9° / 38.3° / **98.5°** | 40.3° / 74.4° / **183.4°** |
| bearing 60 | −0.233 | 2.1° / 5.7° / **14.9°** | 4.5° / 13.0° / **33.4°** | 10.0° / 25.9° / **64.9°** |
| bearing 90 (down the line) | −0.409 | 1.1° / 2.5° / **6.8°** | 4.0° / 5.7° / **15.2°** | 4.5° / 11.6° / **30.2°** |

The three figures in each cell are ±0 px (the whole-pixel grid alone), ±1 px and ±3 px of landmark error. **At the
clips' own small heads the ruler resolves nothing finer than a rung of the stance ladder**, and at 20 px with ±3 px it
resolves nothing at all.

**5.3 ☠️ The dead bearing, and why it is where it is.** A fine sweep at a 90 px head, over the whole 21–101° ladder:

| bearing ° | chain at 24° of flexion | at 86° | at 99° | **range over the whole sweep** |
|---|---|---|---|---|
| 20 | 99.9 | 97.4–98.1 | 95.6–97.1 | 2.8–4.3 points |
| 25 | 100.0 | 99.3–99.5 | 98.6–99.2 | 0.8–1.4 |
| **30** | **100.0** | **100.0** | **100.0** | **0.0** |
| 35 | 100.0 | 99.4–99.5 | 98.5–99.2 | 0.8–1.5 |
| 45 | 99.8–99.9 | 93.9–95.9 | 89.2–93.6 | 6.3–10.6 |

And the mechanism, measured on each subject: **the knee's own bend bearing is 24–29° in the deep crouch and 28–29°
standing** — the dead bearing *is* the direction the knee is displaced in. That is not a property of this rig: it is
wherever a given rider's knees point, and **a reader can see where the knees point in the frame.** The game aims them
over the toes and slightly toward the nose; a real surfing crouch does the same thing, which is why eight clips
saturated.

**5.4 R2, the thigh/shin gate: it refuses the bearings that work.** At 99° of true flexion, 19 bearings:

| | the published 1.0–1.1 band |
|---|---|
| admits | **4 of 19** (bearings −70, −60, −50, −40) |
| false accepts (admitted, chain >2 points out) | **1 of 4** (−40, 2.2–3.1 points) |
| **false rejects (refused, chain within 2 points)** | **3 of 15 — bearings −90, −80 and +90: the three bearings along the board's axis** |
| bearings where the chain is within 2 points | −90, −80, −70, −60, −50, +90 |
| bearings where it is more than 10 points out | −10, 0, +10, +20, +30, +40, +50, +60 |

At 76° of flexion it admits 6 of 19 with **3 false accepts** (−40, −30, −20, up to 7.7 points out) and 2 false rejects
(−90, −80). **And its band is mis-centred before any projection: these bodies' 3D thigh/shin is 0.89–1.03, not
1.0–1.1.**

**5.5 The replacement gate, which needs no body landmark: the board.** The game's board is 1.78 m by 0.42 m, true
aspect 4.2. Its projected length ÷ width, at a level lens:

| bearing ° | 0 | ±10 | ±20 | ±30 | ±40 | ±50 | ±60 | ±70 | ±80 | ±90 |
|---|---|---|---|---|---|---|---|---|---|---|
| board aspect | 35.0 | 17.0 | 8.0–8.3 | 7.5 | 4.5 | 3.2 | 2.2 | 1.3 | 0.7 | 0.1 |

**Aspect ≈ 0.1 (|bearing| ≈ 90°) ⇒ the chain is within 2.6 points; ≤ 0.7 (≥ 80°) ⇒ within 5.3; ≤ 1.4 (≥ 70°) ⇒ within
9.6; ≥ 2.2 (≤ 60°) ⇒ refuse.** The aspect gives |bearing| and **not its sign**, and the signs are not alike: at 99° of
flexion, −70 is 0.1–1.8 points out and +70 is 5.2–9.5, because the dead bearing sits at +25 to +30. A reader who can also tell
which end of the board is nearer gets a second usable window at −50 to −70; a reader who cannot should hold to the
end-on rule.

---

## 6. R4 — the span claim, tested directly

The argument, from clip 13: foreshortening only shrinks a single angle from vertical under a level camera at fixed
yaw, but the **difference** of two projected angles is not a lower bound on true angular travel when the yaw changes —
*"a fixed lean, swivelled from facing the lens to side-on, changes its apparent angle with zero anatomical flexion."*

**The test.** A pose is solved once; the **same** 3D body is then viewed from every bearing. No joint moves. 90 px
head, no landmark error, 5 subjects × 2 depths.

| subject, pose | true tilt ° | apparent at bearing 0 | min | max | **range manufactured** | over ±45° of yaw | over ±30° |
|---|---|---|---|---|---|---|---|
| surfer1, 0.15 m | 35.8 | 16.4 | 0.4 | 35.7 | **35.3°** | 33.6° | 30.0° |
| surfer1, 0.30 m | 51.8 | 21.5 | 2.3 | 51.9 | **49.6°** | 46.2° | 41.0° |
| surfer3, 0.30 m | 55.3 | 27.3 | 1.5 | 55.4 | **53.9°** | 51.3° | 46.9° |
| test-rig, 0.30 m | 49.3 | 19.3 | 2.9 | 49.2 | **46.3°** | 42.9° | 37.8° |

(the full ten rows are in the output: the range runs 32.7–53.9° over ±90°, 31.1–51.3° over ±45°, 27.8–46.9° over ±30°.)

And with the lens raised, which is most of the series:

| elevation ° | apparent range over ±90° of yaw | over ±45° | over ±30° |
|---|---|---|---|
| 0 | 32.7–53.9 | 31.1–51.3 | 27.8–46.9 |
| 10 | 33.5–54.7 | 32.5–54.4 | 29.7–51.5 |
| 20 | 35.2–58.1 | 35.0–58.1 | 32.9–57.5 |
| 30 | 38.7–63.0 | 38.5–63.0 | 37.7–63.0 |
| 45 | **49.3–124.1** | 49.1–98.0 | 49.1–89.0 |

**6.1 And the premise under the premise fails too.** "Foreshortening only shrinks" is itself only true at a level lens:

| elevation ° | most the apparent angle under-reads ° | most it **over**-reads ° |
|---|---|---|
| 0 | 53.9 | **0.1** |
| 10 | 53.4 | 1.3 |
| 20 | 52.2 | 5.9 |
| 30 | 46.6 | 16.6 |
| 45 | 33.3 | 120.3 |

At 45° of elevation the shoulders can project **below** the waistband, which a careful reader would notice; at 20–30°
of elevation the over-reading is 6–17° and looks like nothing at all. **So on a raised lens a projected trunk angle is
not a bound in either direction, per frame or across frames.**

---

## 7. R5 and R6 — the two rulers the series had given up on

**7.1 R5, hip above the deck ÷ head length: the stance-width confound, quantified.** The stance's span is swept with
the crouch's depth re-solved by bisection so the **true** front-knee flexion is held to within 0.5° (it holds to 0.00°
in every row). 5 subjects, span −0.15 to +0.30 m about the game's own 0.63 m, 90 px head, level lens, bearing 0:

| span m | 0.48 | 0.63 (the game's) | 0.78 | 0.93 |
|---|---|---|---|---|
| true hip over deck, m (surfer1) | 0.609 | 0.586 | 0.551 | 0.499 |
| R5, head-lengths (5 subjects) | 2.80–3.00 | 2.68–2.96 | 2.52–2.80 | 2.29–2.67 |
| **R5's move from the game's span** | **+0.03 to +0.11** | — | **−0.15 to −0.17** | **−0.29 to −0.40** |

**Zero change in knee flexion, up to 0.40 head-lengths of apparent hip drop** — and the true 3D hip height moves with
it, so this is **real geometry, not a projection bias**: a wide stance lowers the hip. Clip 13 saw it and was right.
Clip 12's measured 3.83 → 3.22 (−0.61) is **two thirds reproducible by a stance 0.3 m wider**.

**7.2 R5 under a pure fold — clip 12's rescue, bounded.** The rig ties its drawn trunk to leg depth, so a fold over a
hip that does not move has to be applied by hand: the trunk's landmarks turned rigidly about the hip joints, legs, feet
and deck untouched (`foldedFurther`). Clip 12 argued R5 survives a fold because *"hip above the deck does not contain
the trunk at all."* **It contains the head, and the head goes with the trunk.** Over elevations 0–60° and bearings
0/±45/90, for a 45° fold:

| the head | R5's move under a pure 45° fold |
|---|---|
| **upright** (the rider looking down the line) | **−0.04 to +0.33 head-lengths** — ≤0.08 at elevations up to 20° |
| **carried** (chin to chest) | **+0.51 to +0.84** at a level lens, and up to **+20** at 45° of elevation and bearing 45, where the head points at the lens and the denominator collapses |

**So clip 12's rescue holds — for a rider whose head stays up, read at a modest elevation — and its own finding that
the head sits 110–230 px forward of the shoulders is exactly the thing that breaks it.** The bias has a sign: a tipped
head makes the hip look **higher**, so clip 12's observed *fall* of 0.61 is if anything understated by it.

**7.3 ⭐ R6, apparent stature: NOT dead on a raised lens.** Clips 10 and 11 retired it (4.96 head-lengths at a 45° fold
and 4.96 nearly upright; 7.6 and 7.5 at two visibly different depths), and clip 12 narrowed the verdict to *"apparent
stature is dead because it contains the fold."* **Measured, with the head upright, a pure 45° fold shrinks it by
1.06–4.69 head-lengths at every elevation from 0 to 60° and every bearing tested**, smallest 1.15 (elevation 30°,
bearing −45°), against ±0.5 head-lengths of noise at a 40 px head with ±3 px landmarks. **It never stops responding.**

What does kill it:

| the failure | the number |
|---|---|
| **the lens's elevation CHANGING between the two frames** | an elevation change of **50–67°** makes an upright body read exactly what a 45°-folded one reads at a level lens |
| the elevation's own bias on the **level** | 7.13–7.31 head-lengths at 0° of elevation, 6.82–6.88 at 20°, 6.55–6.72 at 30°, 5.35–6.21 at 60° |
| the **head-length denominator collapsing** (the head pointing at the lens) | with the head carried, at bearing 45 and 30° of elevation, the ruler reads 9.5–35.5 head-lengths and the fold makes apparent stature **grow** |
| the denominator's own convention | the game's **tall riding stance** reads **7.13–7.31**, not a standing human's 7.7 — so every "% of standing" taken against 7.7 under-reads by 5–8 points |

---

## 8. What this invalidates, and what it rescues

### Invalidated

1. **Every published trunk span, on every raised lens.** V8's 17→76° (59°), V9's 5→70° (65°), V11's 15→75° (60°) and
   V12's 10→90° (80°). A zero-flexion swivel manufactures 33–63° at elevations 0–30° and 49–124° at 45°, so on a raised
   lens — V10, V11, V12, V15 all state theirs is raised — **none of them bounds anything.** Clip 13's own retirement is
   confirmed and given its number.
2. **The trunk rates.** V12's 120 °/s and 20 °/s, V13's ≥78 °/s and ≥73 °/s: same objection, same number. A rate is a
   span divided by a time.
3. **Clip 13's trunk gate, in both halves.** Its band (1.6–1.8) contains none of the game's five bodies on the hip line
   and two on the 0.60 line; and as a gate it **admits every bearing on a near-vertical trunk while the angle is wrong
   by up to 23.6°** (§4.2), and cannot separate a 70° range of true angles at one gate value (§4.3). Clip 14's
   correction ("keep the method, lose the number") does not save it: the method is blind, not just mis-scaled.
4. **The corrected footage ask** — *"water-level, SIDE-ON — emphatically NOT from behind"*. Side-on is 17.5–18.9 points
   of leg-chain error at a deep knee and 8.9–11.8° of trunk error; **along the board's axis, from the nose or the tail,
   is −0.6 to +2.6 points and 1.3–2.8°.** The ask should be: **level with the rider, looking along the board's axis, with the
   board nearly end-on in the frame.**
5. **Clip 12's mechanism for its down-the-line refusals** — *"from behind, the thigh points AT the lens instead of
   across it, so the foreshortening is worse, not better."* Measured, from the tail (bearing −80 to −90) the chain is
   accurate to −0.6 to +2.6 points. What refused those frames was the **thigh/shin gate**, which false-rejects exactly there.
   And clip 12's measured 0.31 and 0.58 ratios correspond to bearings of about **20–30°** in this sweep (the probe's own
   minimum is 0.21 at bearing 30) — oblique, in the dead quadrant — **not** to a true end-on view, so those shots were
   not as far round as they read. **The ratio is a bearing meter, not a gate**, and that is the use it should be put to.
6. **"The backup ruler is dead on a raised lens"** (V10, V11), as stated. The ruler responds at every fixed elevation
   to 60°. Their observed failures need another cause: an elevation that changed between the frames, or the head's own
   projected length.

### Rescued

1. **Clip 14's "impossible" 2.03 and 2.11 — and its 3.6 as well.** The game's own rider reads **2.03 at bearing 0 and
   2.08–2.24 in-plane** on the hip line. Those two readings were not landmark errors; the published band was wrong for a
   garment that sits at the trochanter. Clip 14's own diagnosis — a bikini bottom sits lower, moving the expectation to
   ≈2.0 — is confirmed to two decimals. **And the 3.6 it called "impossible, the landmarks were wrong" is reachable:**
   the probe's own fold grid runs to **3.80**, and since projection can only *shorten* the numerator, anything above
   2.24 is the **head-length denominator collapsing** — a head tipped toward the lens. 3.6 is not an error, it is a
   diagnostic of a tipped head, and the frame should be refused for that reason and not for the landmarks.
2. **Clip 12's hip-above-deck rescue**, within stated bounds: fold-invariant to 0.08 head-lengths with the head upright
   at ≤20° of elevation, and its bias has the opposite sign to clip 12's observed change.
3. **Apparent stature in head-lengths**, as a within-shot, fixed-elevation ruler — the series' only remaining depth
   ruler, retired on a mechanism that does not hold. Its *level* needs the elevation bias in §7.3; its *change* inside
   one shot at one elevation is sound to about 20° of fold at a 40 px head.
4. **The skill's own caveat that the leg chain is an upper bound.** Confirmed: where it is wrong it over-reads, by up to
   **+36.0** points, and it under-reads by at most **1.5** points anywhere in 2 755 readings.
5. **Every leg-chain reading refused by the thigh/shin gate on a frame whose board is end-on.** Those refusals were the
   gate's false rejects, and the chain there is good to 2.6 points. **They can be revisited** — with the inverse
   `flexion = 2·arccos(chain)` and the resolution table in §5.2 to say what the reading is worth.
6. **The saturated readings themselves, as bounds.** V10's 96–100 % and V14's 95.9–99.9 % now have an inverse: if the
   frame is admissible, 96 % is 32° of flexion and 100 % is 0°. Where the frame is not admissible they remain nothing.

---

## 9. ⚠️ What refutes this brief, and what refutes this document

**The brief said most of the rulers are broken. Two are not.** Apparent stature is rescued outright, hip-above-deck is
rescued within bounds, and the leg chain's published caveat ("an upper bound") is confirmed rather than overturned. The
genuinely broken one is the **trunk gate**, which was the newest and the most confidently published.

**The brief's ruler-2 question assumed anatomy ≈1.0–1.1.** The game's own four surfers are **0.89–1.03**. The band was
mis-centred before any camera entered the argument, so "does the band admit in-plane legs?" has a trivial part to its
answer that no sweep was needed for.

**The span test does not retire the published spans as completely as the brief expected.** At a **level** lens the
manufactured ceiling is **53.9°**, below V9's 65° and V12's 80°. Taken strictly, an apparent span of 65° at a level
lens implies **at least 11°** of true angular travel, and 80° implies at least 26°. V9's lens was level (V10 §3.2 says
so of it, from the beach); so **V9's 65° survives as "≥11°"** rather than dying. Everything on a raised lens dies.
⚠️ **And that subtraction is optimistic**: the manufactured range grows with the lean (46.3–53.9° at a true 49–55°
against 32.7–37.8° at a true 33–40°), so a clip whose true lean is bigger than this probe's 55° has a bigger ceiling
than 53.9° and keeps less of its span. The 11° is an upper bound on what survives, not a measurement of it.

**The brief's framing of the leg chain — "side-on versus down the line" — is the wrong axis.** The axis is the knees'
own bend bearing, and both of the series' candidate shots sit on the wrong side of it for different reasons.

**And what refutes this document:**

- **The subject is the game's rig, and its knee pole and hinge direction are the game's own choices** (`RIG_DETAIL`,
  `HumanoidRig.kneePole`, `HumanoidRig.hinge`). The *law* — the dead bearing is where the knees point — transfers to any
  rider; the specific **24–29°** does not. A real surfer who points his knees further along the board moves the dead
  bearing with them, and then side-on becomes the good shot. **This document cannot tell anyone where a real surfer's
  knees point; it can only tell them that it is the question.**
- **The chin is a convention.** Head length is stature ÷ 7.7 and the chin is one head-length under a real crown vertex.
  Every head-length ratio (R3, R5, R6) scales inversely with that choice: a head length 8 % different moves R3 by 0.17
  and R6 by 0.6. The *changes* within a frame are unaffected; the *levels* are not.
- **The board is level in every sweep.** No roll and no pitch were tested, and a real bottom turn rolls the board 20–40°,
  which rotates the body against the image's vertical — the one place a reader's "angle from vertical" could be wrong
  for a reason this document has not measured. **Named as a gap, not estimated.**
- **No camera roll** (no tilted horizon), **Regular stance only** (Goofy mirrors the bearing's sign), and the pure fold
  rotates the trunk rigidly about the hip joints, where the rig's own `hinge` also moves the pelvis back. The
  `upright`/`carried` head modes bracket the head, but nothing brackets that pelvis translation.
- **The rig's standing pose is not a straight leg: 39–42° of front-knee flexion.** So this calibration says nothing
  about the 0–20° band, which is where the footage's "extended" frames may actually sit — the sweep had to reach 0.12 m
  *above* the standing pelvis to get to 21°.
- **One trace is not a number, and nor is one rig.** Five subjects, one of them a stand-in, all built from the same
  MPFB proportions (acromion 0.787–0.814 of stature, hips 0.516–0.535). That is a narrow population: a short-torsoed or
  long-legged rider would move the in-plane gate values, though not the structure of any finding.

---

## 10. Populations and frames, for every number above

| number | population | frame |
|---|---|---|
| the span's 32.7–53.9° | 5 subjects × 2 depths, bearings −90…+90 at 5°, 90 px head, no jitter | apparent angle from the **image's** vertical, level lens; truth is the 3D angle of acromion→hip-joints from the **world's** vertical |
| the leg chain's −0.6 to +2.6 points | 5 subjects × 29 depths, bearings ±90, 90 px, no jitter | projected ratio against the **3D** ratio of the same joints |
| the signed bias (+36.0 / −1.5) | 5 subjects × 29 depths × 19 bearings = 2 755 readings, 90 px, no jitter | projected minus 3D, in points of the ratio |
| the dead bearing's 0.0 points | 5 subjects × 29 depths at bearing 30° | the same |
| the resolution table | 5 subjects × 29 depths for the slope; 240 seeded jitter draws at depth 0.30 for the noise | points of chain per ° of **true** flexion |
| the gate's 2.08–2.24 and 1.45–1.69 | 5 subjects, the game's standing pose | 3D segment length ÷ head length, the ruler's best case |
| the gate's ambiguity (70° at one value) | `surfer1`, 15 folds × 37 bearings | projected gate vs the 3D angle |
| R5's −0.40 to +0.11 | 5 subjects × 4 spans at a **fixed true** knee flexion (held to 0.00°) | head-lengths, 90 px, level lens, bearing 0 |
| R5's fold bias (−0.04…+0.33 upright, +0.51…+0.84 carried) | 5 subjects × 6 elevations × 4 bearings, a 45° synthetic fold | head-lengths |
| R6's 1.06–4.69 | the same population | head-lengths |
| R6's 50–67° cancellation | 5 subjects, bearing 0, elevation stepped 1° | the elevation at which an upright body reads the folded value |
| the board's aspect | the game's own `boardShape` (1.78 m × 0.42 m), level lens | projected length ÷ projected width, rounded on the same pixel grid |
| P1 0.00–0.66 points, P2 0.01–0.71° | 45 readings each (5 subjects × 3 depths × 3 head sizes) | projected against 3D, from the known-correct camera |

**Not measured, and not estimated:** anything about a real surfer's knee or fold bearing; board roll and pitch; camera
roll; motion blur, rolling shutter and interlacing, which are real error sources in 24–30 fps footage and are not in
this model at all; and the occlusion that actually defeated most of the sixteen reads — this probe can always see every
landmark, and a reader cannot.
