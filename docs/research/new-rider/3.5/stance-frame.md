# Step 3.5 (prep) — the conversion between the videos' hip percentages and the game's stance metres

Written 2026-11-17 by a research round (Opus 5) on branch `claude/stance-frame`, cut from `main` at **a60b1866**
(the owner's two rulings). **Read-only: no file under `src/` or `server/` is touched, nothing was built and nothing was
ridden.** Step 3.5a is editing the rider's stance and bank handling in the main checkout at the same time, so this
round ran in a separate worktree and adds this document and nothing else.

Tags as in 3.2–3.4: **[M]** measured by a probe (here: re-read from step 3.3e's probe output, not re-run);
**[R]** read in the code, with file and line; **[S]** from a source opened; **[I]** inferred from a model that is
stated.

**Why this round exists.** The video references report depth as a **percentage of standing hip height**. The game's
stances are **metres of leg shortening**, and the game holds *three different vertical quantities* that all look like
a stance depth. Nobody had put the two sides in one frame, and Ruling B ("three depths") is about to be built against
them.

---

## 0. The answer in seven sentences

1. **The game's standing hip height is 0.78 m above the deck** [R, `src/physics/riderPosture.ts:100`], and the
   game's own straight leg puts the hip at **0.88 m** [R, `src/physics/AttachedRider.ts:3854`]. Both are needed,
   because which one is "100 %" decides every percentage below.
2. **As percentages of the game's own standing hip height (0.78 m):** Tall **100 %**, Crouch **75 %**, Compress
   **61 %**, Snap **61 %** as shipped (the opt-in deep Snap and the tube tuck **42 %**).
3. **But that frame does not match the videos' frame**, and the videos tell us so themselves: all four read the
   rider's *upright, between-turns* stance at **75–95 %, never 100 %**, so their 100 % is a straight-legged stand the
   rater never actually sees. Against the game's own straight leg (0.88 m) the ladder reads Tall **89 %**, Crouch
   **66 %**, Compress **55 %**, tuck **38 %** — and the game's Tall then lands **inside** the videos' resting band.
   **That is the frame this document recommends, and §3 shows the work.**
4. **Crouch is the stance that is wrong.** The footage's sustained moderate crouch is **55–65 %**; the game's Crouch
   sits at **66 %**, just above the band, and its 0.195 m of leg travel has **no counterpart anywhere in the four
   clips**. To land mid-band it needs **0.21–0.30 m** of leg depth (both frames' overlap: **0.27–0.30 m**).
5. **The owner's belief "Compress should be quite deep already" HOLDS — but for rung 2, not rung 3.** In the shared
   frame Compress (55 %) sits exactly where the footage's *holdable* crouch is, not where its deep spikes are. So
   Compress's **depth** is the right depth for Ruling B's "moderate crouch they can still hold", and the **0.5 s dip**
   belongs **deeper**, at the spikes' 35–50 % — which is **0.34–0.47 m**, i.e. the tube tuck's `MANUAL_CROUCH_DEPTH`
   = 0.45 m that already exists in the code.
6. **Yes — `video-ref-3.md`'s claim is a frame error, and it has propagated into two more documents.** Its "the game's
   crouch (0.65 m centre of mass)" and "Compress depth (0.55 m)" are `STANCE_TABLE`'s **whole-body centre-of-mass
   height above the feet** [R, `src/physics/predictiveBalance.ts:555–557` with `src/physics/rollModel.ts:27–29`],
   compared directly against a **hip-height fraction** with no conversion. The hips in those two stances are **0.585
   and 0.48 m**, 0.065–0.07 m lower than the numbers quoted. **The claim's conclusion survives the correction; its
   arithmetic does not.**
7. **And the conversion is only good to about ±0.1 m, which is a third of the whole stance ladder's travel.** The
   videos' own error is ±10 points (±0.09 m) and the choice of denominator is worth another ±0.1 m. **So Ruling B
   should be built to the rungs in §5 and then judged by the owner riding it, not tuned to these numbers to the
   centimetre.**

---

## 1. The three vertical quantities the game holds, and which is which

This is the part that has bitten the track before, so every row says what the number *is*, not what a comment calls
it.

| # | Quantity | Where | Values | What it actually is |
|---|---|---|---|---|
| 1 | `STANCE_TABLE[].height` | `src/physics/predictiveBalance.ts:554–558` [R] | **0.84 / 0.65 / 0.55 m** | The **whole body's centre-of-mass height above the feet**, m — `src/physics/rollModel.ts:27–29` defines the field it feeds: *"The rider's mass, kg, and its centre of mass's height over the feet, m."* It is the **inverted pendulum's length** in the balance plant (`rollModel.ts:51–52`: `inertia = m h²`, `topple = m g h`), and it also scales the body's own frontal inertia (`bodyInertiaAt`, `predictiveBalance.ts:598–604`) and the bank limit (`predictiveBalance.ts:1050`). **It is not a hip height and it is not a posture.** |
| 2 | the standing posture's pelvis | `src/physics/riderPosture.ts:100` [R] | **0.78 m** | The **pelvis part's placed height above the deck** in the physics' seven-part mass model, standing. `riderPosture.ts:83–87` states plainly that these heights *"are illustrative, not measured"*. This is the closest thing the game has to a hip joint, and it is what `AttachedRider` itself uses as the stance's hip (`AttachedRider.ts:3853`, `const stance = this.parts[1] - this.base.y`; `parts[1]` is the pelvis's y). |
| 3 | `leg.rest` / "depth" | `src/physics/AttachedRider.ts:1014–1016, 3652–3654` [R] | **0 / 0.195 / 0.30 / 0.45 m** | The **leg spring's rest-length shortening**, m — how much shorter the one equivalent leg is asked to be than standing. It is the stance ladder's own key: it indexes `stanceAt`, `hipRange` (`standingBody.ts:98–103`) and `kneeStrength`. **The hips are quantity 2 minus this** (plus `leg.extension`, which is what `legDrive` computes at `AttachedRider.ts:3853–3855`). |

**Quantities 1 and 2 run parallel and differ by a constant 0.06–0.07 m**, which is exactly why they get swapped: the
centre of mass sits that far above the pelvis in every stance, because both drop by the same leg shortening
(0.84 − 0.78 = 0.06; 0.65 − 0.585 = 0.065; 0.55 − 0.48 = 0.07). **0.07 m is a quarter of Compress's entire travel**,
so the swap is not cosmetic.

**A fourth number that is a reading, not a quantity.** Step 3.3e's knee angles (and this document's §3) come from a
two-link conversion *h* = *L*·sin(θ/2) with *L* = 0.88 m, validated against the drawn rig's own independent stance
gauge at two points to within 3° and 6° (`docs/research/new-rider/3.3/stance-depth.md` §2). **Our physics body is a
point mass on one spring leg and has no knee at all**, so a knee angle is a reading of our stance in the literature's
units, never something the model holds. (I checked whether adding the ankle's own height — `ANKLE_HEIGHT` = 0.075 m,
`standingBody.ts:37` — and the true two-bone length of 0.90 m would improve that conversion: it makes the agreement
with the stance gauge **worse**, by 16–22° at both check points. **The simple *L* = 0.88 reading is the calibrated
one; do not "correct" it.** [I])

### 1.1 The leg lengths, read out

- `LEG_EXTENSION` = **0.10 m**, `AttachedRider.ts:808` [R] — the travel the leg has *upward* from the standing stance.
- So the game's own **straight leg** is `stance + LEG_EXTENSION` = 0.78 + 0.10 = **0.88 m** of hip height,
  `AttachedRider.ts:3854` [R]. Its own comment checks the arithmetic: √(0.88² − 0.78²) = 0.407 ≈ the stated 0.41 m of
  sideways reach standing.
- `BONE_LENGTH` = **0.45 m**, `standingBody.ts:35` [R], two of them, so an anatomically straight leg would put the hip
  at 0.45 + 0.45 + `ANKLE_HEIGHT` = **0.975 m**. **The game never goes there** — `LEG_EXTENSION` stops it at 0.88 m.
  Both are reported below because the denominator is the whole question.

---

## 2. The four stances, in metres, with every column named

Depths: Tall = 0; **Crouch** = `CROUCH_SHARE · CROUCH_DEPTH` = 0.65 × 0.30 = **0.195 m** (`AttachedRider.ts:1014–1015`
[R]); **Compress** = `CROUCH_DEPTH` = **0.30 m**; **Snap** = `SNAP_DEPTH · CROUCH_DEPTH` = 1 × 0.30 = **0.30 m**,
identical to Compress as shipped (`AttachedRider.ts:894` [R]), or **0.45 m** with the opt-in `?snapDepth=deep`
(`SNAP_DEPTH_DEEP` = `MANUAL_CROUCH_DEPTH`/`CROUCH_DEPTH` = 1.5, `AttachedRider.ts:1029` [R]); the **tube tuck** =
`MANUAL_CROUCH_DEPTH` = **0.45 m** (`AttachedRider.ts:1016` [R]).

| Stance | leg depth, m [R] | **hips above the deck, m** [I from quantities 2+3] | CoM above the feet, m [R] | measured hips, m [M] |
|---|---|---|---|---|
| **Tall** | 0 | **0.78** | 0.84 | 0.78–0.82 |
| **Crouch** (full manual) | 0.195 | **0.585** | 0.65 | 0.58–0.60 |
| **Compress** | 0.30 | **0.48** | 0.55 | 0.48 (6 of 6) |
| **Snap**, as shipped | 0.30 | **0.48** | 0.55 | 0.25–0.59 (overshoots under load) |
| *Snap deep / tube tuck* (opt-in) | 0.45 | **0.33** | *0.40 by design.md; **0.55** as the plant reads it* | 0.34–0.36 |

**The measured column** is step 3.3e's probe, re-read not re-run: **the default rider, six runs per stance** (3 entry
speeds × 2 stick positions) on the **Canyon-matched** `FaceWater` cell — 1.4 m, 2.6 m deep, 16°, 5.7 m/s, PR #223's
fit to the arm of Canyon B — in trim 45° off the fall line, stick over to 85°, columns started at 0.5 s to clear the
mount transient. **It is a fit to Canyon, not Canyon.** Nominal and measured agree to 0.02 m everywhere except Snap,
which overshoots.

**Two code facts the builder of Ruling B needs, both read not inferred:**

1. **`stanceAt` clamps the depth at 0.30 m** (`predictiveBalance.ts:607`, `const d = Math.max(0, Math.min(STANCE_TABLE[2].depth, depth))`). **So every stance deeper than Compress is invisible to the balance plant**: the tube tuck and `?snapDepth=deep` are designed with *Compress's* pendulum length (0.55 m), *Compress's* body inertia and *Compress's* bank limit. **If Ruling B's 0.5 s dip goes to 0.34–0.47 m as §5 recommends, `STANCE_TABLE` needs a fourth row or the balance will be solving the wrong pendulum.** This is the single most build-relevant thing in this document.
2. **`design.md`'s stance-room table has a centre-of-mass column, not a hip column** (`docs/research/new-rider/design.md:63–69`: header *"Centre of mass height"*, rows 0.85 / 0.65 / 0.55 / 0.40 m). **That table is where the video documents' 0.65 and 0.55 came from.** Its tuck row (0.40) is consistent with the leg depth (0.85 − 0.45 = 0.40); `STANCE_TABLE` has no such row, which is point 1 again.

---

## 3. The same four stances as percentages — and why the denominator is the whole question

**The brief asked for percentages of the game's own standing hip height. Here they are, and then here is why that
frame does not meet the videos.**

| Stance | **÷ 0.78 m** (the game's standing riding posture) | ÷ 0.88 m (the game's own straight leg) | ÷ 0.975 m (two bones + ankle) |
|---|---|---|---|
| **Tall** | **100 %** (measured 100–105) | **89 %** (measured 89–93) | 80 % |
| **Crouch** | **75 %** (measured 74–77) | **66 %** (measured 66–68) | 60 % |
| **Compress** | **61 %** (measured 62) | **55 %** (measured 55) | 49 % |
| **Snap**, shipped | **61 %** (measured 32–76) | **55 %** (measured 28–67) | 49 % |
| *tuck / deep Snap* | **42 %** (measured 44–46) | **38 %** (measured 39–41) | 34 % |

**The three columns differ by up to 20 points — more than the whole gap between the game's Crouch and its Compress.**
Picking one is therefore not bookkeeping.

### 3.1 What the videos' "100 %" is, read out of the videos themselves

The reading skill asks only for *"hip height as a fraction of standing height"*
(`.claude/skills/surf-video-read/SKILL.md:32`) and **never defines the denominator** [R]. But all four documents give
it away, because each reads the rider's **upright, between-turns** stance **below** 100 %:

| Document | population | upright / between turns | sustained crouch | brief dips | deep spikes |
|---|---|---|---|---|---|
| `video-ref-3.md` (Nias, drone) | 1 rider, rider 55–95 px tall, ±10 points | **85–95 %** | **55–65 %**, knees 100–115°, 0.5–1 s | — | **35–50 %**, 0.25–0.5 s, ×2 |
| `kirra-reference-50-196s.md` | **a montage, 5+ riders**, 90–110 px close, ±10 points | **75–90 %** | — | **45–60 %**, 0.25–0.7 real s, counts 3 + 2 + 3 | — |
| `kirra-reference.md` (first 50 s) | **a different rider again**, durations **3–4× long** (slowed footage) | 80–85 % | 50–60 % reported held for seconds, **never reproduced or refuted** | — | — |
| `video-ref-2.md` (Pupo) | 1 rider, 100–190 px, ±10 points | 65–85 % | 50–60 % | — | — |

**Every figure above is a pixel estimate, good to about ±10 points at best, by each document's own statement.**

**So their 100 % is a straight-legged stand that is never in frame** — it was estimated from the rider's proportions,
not measured off a tall frame. The game's analogue of that is its own straight leg, **0.88 m**. And the check
works: with 0.88 m as the denominator the game's **Tall reads 89 %, inside the videos' 85–95 % resting band**, where
the 0.78 m denominator puts it at 100 %, outside every clip's resting band. **That is the frame the rest of this
document uses, and it is a calibration against the videos' own resting reading, not a preference.** [I, with the model
stated]

**The honest error bar.** ±10 points of video error is **±0.09 m** on a 0.88 m leg. The denominator spread (0.78 ↔
0.975) is worth about another **±0.1 m**. **Total: the conversion is good to roughly ±0.1 m, against a stance ladder
whose entire travel from Tall to the tuck is 0.45 m.** Every recommendation below is stated as a band for that reason.

---

## 4. Answering the two questions that were put

### 4.1 Does "Compress should be quite deep already" hold in the shared frame? **Yes, for rung 2 — not for rung 3.**

In the shared frame Compress is **55 %**. The footage says:

- its **sustained, holdable** crouch is **55–65 %** → **Compress sits on the deep edge of exactly that band**;
- its **brief dips** are **45–60 %** → Compress sits at the **shallow edge** of those;
- its **deep spikes** are **35–50 %** → **Compress is 5–20 points shallower than these, and nowhere near them.**

**So the owner is right that Compress's depth is already about right — and what it is already right *for* is Ruling
B's second rung, "a moderate crouch they can still hold."** It is not deep enough to be Ruling B's third rung, the
0.5 s dip. [I from the footage's bands and §2's metres]

**The collision this creates, stated because the build has to resolve it.** If Crouch moves to the footage's 55–65 %
(§4.2) *and* Compress keeps 55 %, the two stances end up **0–10 points apart** — and step 3.3e already measured that
failure mode on the rider the owner actually rides: on `?rider=new`, Compress adds only **0.025–0.115 m over standing
tall in 4 of 6 paired runs**, against 0.300–0.336 m in 6 of 6 on the default rider, because the balance's own knee
drop has already crouched the tall stance [M]. **"Not down enough" was a true report of a stance that barely changes.**
Two stances 5 points apart would reproduce that complaint by construction.

### 4.2 What should Crouch become? **0.27–0.30 m of leg depth, from today's 0.195 m.**

The footage's sustained moderate crouch is **55–65 %** at knees **100–115°**, held **0.5–1 s** (`video-ref-3.md`,
1 rider, ±10 points). Converting that band to the game's leg depth:

| frame | 55–65 % is hips of | leg depth that gives it |
|---|---|---|
| ÷ 0.88 m (recommended) | 0.484–0.572 m | **0.21–0.30 m** |
| ÷ 0.78 m (the brief's) | 0.429–0.507 m | **0.27–0.35 m** |
| **both frames' overlap** | | **0.27–0.30 m** |

**Today's Crouch is 0.195 m, which is outside both bands.** And its 66 % has **no counterpart in any of the four
clips**: it falls in the gap between the resting band (75–95 %) and the crouch band (55–65 %). **The reading is
therefore that Crouch is the stance that is wrong, and that the depth the footage's holdable crouch wants is
approximately the depth Compress already has.**

The knee-angle cross-check agrees and is an independent instrument: the footage's crouch is **100–115° included**;
step 3.3e's conversion puts the game's Crouch at **82.5° included** and its 0.117 m drop at **97.8°**, with the drawn
rig's stance gauge reading **104°/102°** at that same drop [M, S]. **So on angles too, today's Crouch is deeper than
it reads in percent and still short of the footage's hold.** The two instruments bracket the footage's 100–115° at
about 0.12–0.20 m, *shallower* than the percentage conversion says — a 0.1 m disagreement, which is the error bar in
§3.1 showing up honestly. **Do not resolve it on paper; it is within the method's own noise.**

### 4.3 Is `video-ref-3.md`'s depth claim a frame error? **Yes, and it is in three documents.**

The claim, `video-ref-3.md:37` and repeated at `:62`:

> the rider is *"deeper than the game's crouch (0.65 m centre of mass) and at or below the Compress depth (0.55 m)"*

compared against hip fractions of **35–50 % of standing**.

**What is wrong with it, in three parts:**

1. **0.65 and 0.55 are centre-of-mass heights above the feet** — quantity 1 in §1, `STANCE_TABLE`'s `height` column
   via `design.md`'s table, whose header says *"Centre of mass height"* in as many words. **The hips in those two
   stances are 0.585 and 0.48 m.** The document names the quantity correctly ("centre of mass") and then uses it as
   the comparator for a hip fraction anyway.
2. **A percentage cannot be compared to a metre without the denominator**, and the denominator was never stated —
   §3.1 shows it is worth 20 points.
3. **It propagated.** `video-ref-2.md:44` introduced the CoM row ("Design stance depths: Tall 0.85 m centre of mass,
   crouch 0.65, Compress/Snap 0.55, tube tuck 0.40"), `video-ref-3.md:37,57` used it as a depth comparator, and
   `kirra-reference-50-196s.md:103` inherited it as *"Crouch (0.65 m centre of mass), Compress and Snap (0.55 m)"* —
   stating explicitly *"I did not re-read the rider code; I only used the three earlier docs' account of it."*
   **Three documents, one unconverted number.**

**Does the conclusion survive? Yes.** Converted properly, the spikes' 35–50 % is **0.31–0.44 m of hip**, against the
game's Crouch at 0.585 and Compress at 0.48. **The spikes are deeper than both, as claimed** — and they land on the
game's opt-in tube tuck (0.33 m, 38 %). **The arithmetic was in the wrong frame; the direction it pointed was right.**
It is the twenty-first frame error and, unusually for this track, a harmless one.

**One recommendation outside this round's scope:** `.claude/skills/surf-video-read/SKILL.md:32` should define the
denominator ("hip height as a fraction of the rider's *straight-legged standing* hip height, and say so") and should
forbid comparing a fraction to a game metre without the conversion. **I did not edit it: this round is read-only.**

---

## 5. What this means for Ruling B's three rungs, in the units the builder needs

Ruling B authorises upright, a holdable moderate crouch, and a self-releasing dip of about 0.5 s. **All three depths
already exist as constants in the code.**

| Ruling B's rung | footage band | hips, m | **leg depth, m** | already in the code as |
|---|---|---|---|---|
| 1. **upright** | 85–95 % resting | 0.75–0.84 | **0** (today's Tall, 89 %) | Tall — **keep unchanged** |
| 2. **holdable moderate crouch** | 55–65 % sustained, 0.5–1 s | 0.48–0.57 | **0.27–0.30** | `CROUCH_DEPTH` = 0.30 (Compress's depth today) |
| 3. **self-releasing dip, ~0.5 s** | 35–50 % spikes, 0.25–0.7 s | 0.31–0.44 | **0.34–0.47** | `MANUAL_CROUCH_DEPTH` = **0.45** (the tube tuck; already the opt-in `?snapDepth=deep`) |

**So the whole ladder the footage asks for is 0 / ~0.30 / ~0.45 m — and the 0.195 m rung is the one with no
counterpart in any clip.** [I from §3 and §4; every band carries the ±0.1 m of §3.1]

**Three cautions for that build, in order of how much they would cost to miss:**

1. **`stanceAt`'s clamp at 0.30 m** (`predictiveBalance.ts:607`): rung 3 at 0.34–0.47 m is **invisible to the balance
   plant**, which will design for Compress's pendulum. A fourth `STANCE_TABLE` row is needed, and `BODY_FRONTAL_SHARE`
   (`predictiveBalance.ts:595`) and `hipRange` (`standingBody.ts:98–103`) are keyed on the same three depths.
2. **The legs get weaker as rung 3 gets deeper, and the code already says so.** `kneeStrength`
   (`standingBody.ts:113–117`, `KNEE_TORQUE` = 300 N·m per knee) gives **3.0 body weights standing, 2.25 at the
   crouch, 2.1 at Compress, 1.9 at the tuck** [R]. The literature agrees on the direction and on roughly the
   magnitude: two-legged isometric extension **5461 ± 1131 N at a 140° knee against 2920 ± 633 N at 100°** (n = 28,
   Zöger et al. 2025, *BMC SSMR* 17:14) and isometric squat **1.92 BW at 120° against 1.26 BW at 90°** (n = 59,
   Lynch et al. 2021, *Sports* 9(10):140), replicated at 1.94× in a third sample (n = 35) [S, via 3.3e]. **Rung 3 is
   therefore a place a rider cannot hold a hard turn's load, which is the mechanical reason it should self-release —
   and it needs no new quantity to express.**
3. **Rungs 2 and 3 must stay far enough apart to be felt.** 3.3e measured the owner's own rider's *tall* stance
   already sitting at 0.48–0.73 m of hip (55–83 % in the shared frame) because the balance's own knee drop spends the
   stance's travel [M]. **Any new rung has to be measured against where the rider actually is, not against the
   constant it is given.**

---

## 6. Kept from a dropped task, as a note and nothing more

Task 2 of this round's brief ("legs that tire") was withdrawn mid-round: the owner reversed that decision and stamina
stays infinite. **No fatigue research is reported here and none should be started.** The one thing worth keeping, in
case Ruling B's dip needs a reason to release:

**What brings a real surfer up out of a 0.25–0.7 s dip is not fatigue.** Muscle fatigue acts over seconds to minutes;
the dip is half a second. The mechanisms that act on the dip's own timescale, best-sourced first: **(a) the turn
simply ends** — two independent populations put a bottom turn at **0.96 ± 0.04 s** (n = 6, 835 turns, Forsyth et al.
2024) and **0.8 ± 0.03 s** (n = 4, 2,060 cutbacks, Shormann & In Het Panhuis 2020), so a 0.25–0.7 s low **is** the
loaded part of a ~1 s turn [S]; **(b) the legs cannot hold the load down there** — §5's 1.9–2.25 against 3.0 body
weights, three agreeing samples [S, R]; **(c) the travel runs out** — the leg has 0.30–0.45 m and nothing below it, so
extension is the only move left [R]; **(d) extending through the exit is how the turn is driven**, which the
neighbouring sports say in a measured voice: expert skiers flex between turns and extend through the arc (Komissarov
2022, *Sports Biomech* 21(2):912–939; corroborated by Supej & Holmberg 2019 and Falda-Buscaiot et al. 2017), and the
one skateboard half-pipe physics paper finds the optimal pump is to stay crouched into the bottom and **extend
immediately after passing it** (n = 2, Kogelbauer et al. 2024, *Phys Rev Research* 6:033132) [S, via 3.3e §1.4].
**Confidence: (a) high and quantitative; (b) high in direction, our own numbers for magnitude; (c) certain, it is our
code; (d) borrowed from ski and skate, and the ski sign is the opposite of the surf footage's (lowest between turns,
not at the load), so do not lean on it.**

---

## 7. What this round did not do

- **Nothing was ridden and nothing was re-measured.** Every **[M]** here is step 3.3e's probe output re-read; its
  population is six runs per stance on a Canyon-matched cell with the default rider, plus six per stance on
  `?rider=new`. **If Ruling B's rungs matter to a tenth of a point, they need their own measurement.**
- **No video was re-read.** All footage figures are the four documents' own estimates, each ±10 points, from **at
  least seven different riders across four clips**, one of them slowed by an unverified 3–4×.
- **The denominator is an inference, not a measurement.** §3.1 argues for 0.88 m from the videos' own resting band; it
  was not confirmed with the raters, and **no video document states its denominator anywhere**.
- **The two-link knee conversion is a reading of our point-mass leg, not a quantity the model holds** (§1).
- **Nothing under `src/` or `server/` was touched**, so the game is unchanged by construction.
