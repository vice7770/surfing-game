# Handoff, 2026-11-16 — the surfer track's chain, and the wave track parked on a ride

Written at 75 % of the weekly limit, by the orchestrating session, so the next one does not re-derive
twenty-two rounds. Everything below is merged on `main` at `698a25d1`.

## The owner's standing rules, which outrank every number

1. **Ship small, ship often**: one change, merge, **the owner rides**, repeat. No merge gated on a probe bar —
   keep only seatbelts (`tsc`, suites, Canyon bytes, the default game byte-identical, no unpaired forces).
2. **Physics only. No hidden motors** — motion from visible limbs, every force with its reaction. A *kinematic
   prescription realised by whatever force it takes* is a cheat (step 3.2y, on the old rider's counter-roll).
3. **The owner rides and judges. Never a bot ride as evidence of feel.**
4. Plain, short sentences in replies — the owner is not a native English reader.
5. **Their acceptance bar, set 2026-11-16 and unchanged:** *"In compress the surfer should not fall in the lower
   speed of getting positioning in a wave. Normal and maybe Crouch if the turn is too sharp but not compress,
   because the center of gravity is supposed to do that."* **100 %, not "fewer".** Tall may legitimately fall.
6. Their test spot is **Canyon with `?canyonWaves=true`**, spilling waves. Not the pool.
7. Two parallel tracks (surfer + wave), **one agent each**, model `opus`, effort by difficulty.

## Surfer track — where it actually is

**Every rider-side lever is measured and spent.** 360+ runs an arm, falls unchanged in all of them.

The chain, each link merged with its PR:

- **3.2w–3.2y** — ankle, hip, whole-body counter-roll: each **lowers the roll and none moves the fall**.
  **The old rider's "0 of 12" benchmark is RETIRED**: `AttachedRider.uprightVelocity:4622` holds its body plumb
  kinematically; drive off, it falls 12 of 12. **Never measure against it again.**
- **3.2z** — the fall test is **sourced and more generous than a human's** (Hof; Pai & Patton; at the edge of the
  base a human's recoverable velocity is **zero**, ours allows 0.788–1.733 m/s). **Nothing to loosen.**
- **3.3a–3.3c** — the bank gain. The advisor ruled it **our artefact, a direction not a size**; half was the felt
  vertical's filter being low-passed in the **world** and read on the **deck** (fixed opt-in, `?feltFrame=deck`,
  72 % of the rate term gone), half is `buoyancy` pointed at the water-surface normal.
- **3.3d** — `?buoyFrame=hull`, opt-in. **Gated by the deck's dry share: 49 % of the across force removed at 0–10°
  of roll, 6–8 % past 60° — and the falls are at 20.9–63.0°.** Prevented none.
- **3.3e** — our Compress is **already the deepest posture ever measured in surfing** (114° of flexion against
  Seixas's 113.78° on 97 landings by top-5 WSL pros). **Depth is the wrong axis.**
- **3.3f–3.3h** — `?kneeRoom=achieved`, `?stanceReach=keep` (the owner's ruling: a deep crouch keeps its arms and
  hips). Reach 1.8–2.0×, `a_max` unchanged, **24 of 24 still fall. The stance table cannot meet the bar.**
- **3.3h** — **the board is rolled by the rider's own feet and stopped by the hull**: rider **+33.47 N·m** against a
  water column of **−33.40**, net +0.04, the load **0.0525 m off the centreline, inside the feet's own 0.13 m**.
- **3.3i** — **the ankle already exists** (8th unknown of the board's solve, 800 N·m/rad, **already above a braced
  human's**) and **already carries the whole 33 N·m** at a median joint angle of 0.06°. **Bounding it makes the
  fall worse.** Its stills proved the deck rolls under him and **`captureFeet` is fixed in the board's frame, so
  "the board slides out from under him" was impossible by construction.**
- **3.3j** — **he falls 12 of 12 with the stick untouched**, and **a gentle turn loads the board LESS than no turn
  at all** (6.64 N·m at stick 0.10 against 24.37 with none). **The turn was never the problem.** The fall is three
  populations chosen by **stance**, not stick; **Compress gets the capsize**, the same fall as the hard turn.
- **3.3k** — the ankle-rest bound **tested against its stated prediction and innocent** (72 of 72 still fall, median
  Δ 0.000 s). 3.3j's "62 of 72 saturated" was **the predictor's sent command, not the joint** (the joint is at its
  bound in 1 of 72). The rail's bite and the 70° stop **both arrive after the fall is under way**.
- **3.3l** — `src/physics/bankLedger.ts`, the bank split by source with **residual exactly 0 to the last bit**.
  **The lean is inherited, not created**: body square to deck, deck square to water, so **8.69–8.71° of bank at
  frame 1 in 24 of 24**, and 3.3k's "passes 10°" is 1.3° of movement. **No single source causes it** (411–820 °/s²
  gross for a net of +2.4 to +68.7). **And the mechanism that closes nine rounds:**

  > **The ankle keeps only 0.25–0.40 of its own authority over the body, because the solve's board roll inertia is
  > 0.498–1.140 kg·m² against the body's 52–54.** Three quarters of every correction rolls the board instead.

  **The owner's own low-speed cell is WORSE**: 18 of 18 fall, median **0.600 s** below 3 m/s.

**Running now: step 3.3m** (`claude/rider-new-33m`) — is the board's roll resistance right, against the sourced
order (advisor: 0.1–0.5 kg·m² for a planing board) and against the body's own? **If it is right, the two-body
rider is the only route left and the search for a tuning fix should stop.** Also: is the added-mass term's
`cos³φ` decay (0.053–0.167 past 60° of rail) correct, or the frame error the advisor suspected?

**Queued behind it:** `AttachedRider.frame` **hard-clamps the measured bank at `MAX_BANK` = 70°** at three sites
and the ankle's torque is computed from the clamped angle — *"past 70° the spring pulls against a lean the body is
not at."* Always after the fall starts, so not the cause; still a force from a truncated reading. Its own round.

## Wave track — parked on the owner's ride, deliberately

Merged and opt-in: `?lipVeil=on` (5g/5h, spray as a real translucent cloud — the sd ratio of ON against OFF is
0.77–0.92 where a cloud attenuates and discrete objects add structure), `?foamAlbedo=on` (5i, foam at a sourced
0.50 reflectance; **within-frame ratio 1.310 → 1.102 against the photograph's 0.748**), `?foamAlbedo=bubbles`
(5j, physically principled and **measured worse on all five measures** — the foam's white is mixed over the water
by the cover, so **once the albedo falls below the lit water, lowering it brightens the pixel**).

**Four rounds shipped without a ride, which is my process error.** The track stops until the owner answers two
questions: does `&foamAlbedo=on` read right against the blue water in the same frame, and does `&foamAlbedo=bubbles`
make the aged lace behind the break look like a sandy stain. **If the lace is the complaint, the lever is
`FOAM_REFLECTANCE.aged`, one constant.** If not, it is a drawn ten-second age, which 5j made *more* necessary.

## Traps that have each cost a round — put these in every brief

- **`AttachedRider.separate` (`:4586`) sets `attached`, `climbing`, `inContact`, `separation` and NEVER `phase` or
  `upright`.** A probe testing `!upright` cannot see a balance separation, and afterwards `prepare` stops being
  called so **every rider column freezes at its last value**. **Test `!attached`.**
- **`captureFeet` is `board.toWorld(...)`, fixed in the board's frame** — `feetAcross` is a *carried* velocity.
- **A duration is not a timestamp** (a "post-turn gap" was `fellAt − turnFor` against a 0.2167 s mount guard).
- **A moment is not an inertia**; **medians do not sum**; **a sent command is not a joint angle**; **a threshold
  crossing an inherited offset is not a motion.**
- **`Math.sign(0) || 1`** picks +1 at random. **`Number(null) === 0`.** **`if (!inner.captureFeet)` guards nothing.**
- **Canyon bench, three cautions**: the wrapper must be `globalThis.location = { search: '?canyonWaves=true' }`
  **prepended to the bundle** (a bare string silently benches the default Canyon via `devTools.ts:9`); **read the
  grid** (B 400 × 451, default 400 × 507); **read the "spun up on the CPU in … s" line** — the bench *imports* an
  existing `--state` and a kept `.sea` does not reproduce the reference.
  Refs: B `a367d938f15fa934`/`9e5831f80e38abd9`, default `ea3d57a4d49f4b48`/`a1a2555739210f96`.
- **Never `npx tsc` in a worktree** — no `node_modules` makes it print an install banner and exit **0** or **1**.
  Symlink the main checkout's and run `./node_modules/.bin/tsc`. Type-check probes separately.
- **`src/wave/SurfZoneSimulation.test.ts` declares 644.5 minutes of per-test timeout**, one test allowed four hours.
  **It cannot gate a merge.** Close it by reading (`c2-step5g.md` §7.3).
- **`zsh` does not word-split an unquoted variable** (`env $BASE …` sets only the first; the tell is "fell: 1 of 1").
- **`gh pr comment --body` with backticks gets shell-substituted — use `--body-file`.**
- **The deletions column, before every push**: `git diff --stat origin/main HEAD`, read the deletions number.
  It has caught a silent revert on fifteen consecutive rounds — up to **20 157 deletions across 97 files**.
  `git merge-base --is-ancestor` caught **none** of them.

## The method that is producing the results

Every round is briefed to **refute its own brief**. Twenty-one consecutive rounds have, and the refutation has
been worth more than the build every time. Briefs say so explicitly, name the likeliest error in the brief, and
require a prediction written before the read plus a positive control. **Agents that publish their own failed
predictions are the ones producing the findings.**

## OWNER'S RULING, 2026-11-16 evening — the goal is bigger than the fall

I offered to ship the **old** rider as the playable one and keep the new one as research. **They declined, with a reason that redefines the target:**

> *"the older rider, was ok but the movement was fake as the speed increase and the balance were a bit off. The snap position showed that the physics behind it were not valid. We can always go back to it and improve it but **we need a new system to make the game work with all skills and make it a good game**."*

**So "stop falling" was too small a target.** The goal is a rider whose body is genuinely where the physics puts it, so that **every skill emerges rather than being posed**. The old rider's kinematic counter-roll is exactly why it cannot be extended: a pose is not a consequence.

**Two requirements nobody has ever tested, both from that sentence:**
- **"the movement was fake as the speed increased"** — every one of the 27 rounds ran one speed band. **Nobody has looked at what the body does as speed rises.**
- **"the snap showed the physics behind it were not valid"** — the snap has **never been measured on the new rider at all.** It is the hardest case and the one most likely to expose an approximately-real body.

**Measure progress by whether a skill works for the right reason, not by the fall count.**

## THE FIRST CONFIRMED WIN — owner's ride, 2026-11-16 night

Address ridden: **`?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two`** (confirmed by them).

Their two sentences, both unprompted:

> *"gets on the board down turn just falls very easily"*
> *"seems that the movement is very fluid in the sense that doesnt look like a stick but an actual human movement"*

**Both halves match step 3.4a's measurement exactly, and this is the first time the bench and the ride have agreed on a POSITIVE:**
- **the lean row improved in 96 of 96 live runs (3.515 → 1.039, a 70 % cut)** — and the owner felt it, calling it human movement rather than a stick, which is 3.4a's own shot-list question answered without being asked;
- **the bar was unchanged on their cell (median 1.033 s, 18 of 18)** — and they still fall easily on a bottom turn.

**So the split is clean and confirmed from both sides: the BODY is right and feels right; what remains wrong is what the board does underneath him and what the loop commands.** Those are the roll row and the gains — exactly step 3.4c's job.

**Keep the two-body plant.** It is the only change on this track that improved something without trading, and it is the foundation the owner's "system for all skills" needs: a body that moves like a person is what every skill has to be built on.

## THE OWNER'S OWN MOVEMENT REFERENCE — Kirra, read frame by frame (2026-11-17)

They gave **https://www.youtube.com/watch?v=3nfW6OLiyYw** ("Kelly Slater's Iconic session at Kirra | Slowed Down", first 50 s) with:

> *"this is a beautiful wave that translates what i would like this improvement movement mechanics to achieve. The wave itself is a tube, **that part I dont care for now**, what I care is the **movement pieces** of the wave and I wish I could have a playable movement like that."*

**Nobody here can watch video.** It was read by **screenshotting the browser pane** — 17 stills at 2.5 s steps plus 6 close crops — by a cheap low-effort agent, per the owner's own instruction. Written up at `docs/research/new-rider/3.4/kirra-reference.md` (merged `601f6629`).

**Two findings that change the work:**

1. **THE TURNS ARE TALL → LOW → TALL, and the hips go BACK OVER THE TAIL.** Entry: rise and square up. Load: hips drop back over the tail, chest down the face, held ~1.5–2 s. Exit: straighten as the board comes flat. **This REOPENS something step 3.3e closed.** The owner said *"crouching, not compressing"*; 3.3e refuted that as stated because **our** Compress is a held crouch with no cycle — **and the reference says the sport has the cycle and we do not.** It is also **two axes**: a vertical one we model and a **fore-aft** one — **and my first reading of that was wrong.** A second clip (`video-ref-2.md`, Samuel Pupo at Kirra) read the code and found the game **does** have a fore-aft weight target (the W/S trim) and Snap puts the weight on the tail. **What is missing is a visible hips-back STANCE tied to the turn's load**, not the axis itself.
2. **Depth is confirmed, again, as not the problem.** Tube (held 15+ s): knees 90–120°, hips 50–70 % of standing. Turn tall: 130–150°, 75–85 %. **Our Compress is ~66° on that scale — deeper than his deepest.** Second independent source after Seixas.

**Arms** stay at or below shoulder height and follow the trunk, spread one forward one back through a turn — which is what `?stanceReach=keep` only just gave back.

**Three limits it volunteered, all load-bearing:** the camera is **side-on, so lean and rail angle are precisely what cannot be read** (the quantity this whole track turns on); it is **a montage of at least three rides**; and **the slow-motion factor is unknown**, so "a turn takes 3–4 video seconds" is **not** comparable to Forsyth's measured 0.96 s. Pixel estimates, ±15° at best, every one labelled.

## THE FACE RULING (step 3.4g, merged) — READ THIS BEFORE QUOTING ANY RIDE TIME

> ***"The metric is right, the wave is the owner's own, and the 16° is that wave in the moment it BREAKS — not the face he rides along. And the probe has never put the board on 16° of anything: it sits where the test wave gives 12.3° and his spot gives 5.6°."***

Measured on **Canyon B, practice swell — the owner's own default** (earlier readings used `medium`, which is not his), 3 seeds, 22 989 faces, never pooled. Metric is **`local`**, and on these faces `turn` is identical to it, so the 16-vs-31 trap is not hiding here.

- **His clean ridable face: 11.5–11.9°.** His **breaking** face: 16.5–18.4°. The probes' `FACE=1.4,16,5.7` is **16.00° exactly** — the breaking figure.
- **Where the board actually sits** (`faceFrac` 0.16): test **12.1–12.3°** along the face / **8.8–9.0°** across the deck; **his spot 5.4–5.6°. ×2.2.**
- **The cause is the profile, not the peak**: his steepest is at **0.62–0.64 of H**, `FaceWater`'s at **0.50**. The two agree high on the face and are **×3 apart at 0.05 of it**. *"Matching a face by its steepest angle does not match it where a board sits."*
- **PR #223 fitted the spot FIVE rows and this folder has run ONE** (the arm steepens to 19.6–21.6° in the bowl; the peel runs ~12.5 m/s in sections, which `FaceWater` cannot carry).
- **5e and #223 do not disagree** — 5e's window ends offshore of the onsets. Its ruling stands; **its stated maximum should be 26.7°, not 20.7°.**

**FACE-CONDITIONAL (all measured on the one row — do not quote as facts about his spot):** every ride time and falls-per-runs figure since 3.3f (**triply** conditional — face, placement `AHEAD`, heading `SIDE`); the shipped medians 1.450 s / 1.033 s (**4.600 at 8°, 0.917 at 24°**); the datum arms' ordering; the clamp's relevance; **and `?mountAgree=deck`'s 1.033 → 1.167 s, the only switch in four rounds that has moved the owner's cell.**

**NOT CONDITIONAL (safe):** `both = predict + ref − off` and its 1.0×10⁻⁶ residual; `tiltSameSign` 0 of 56 757; `cancelShare` 1.575–1.686; the reach 202.02–206.00 °/s² per ° (validated *by* the sweep); `ANKLE_REST_RANGE`; "a ratio is not a repair"; the algebra, controls, constants and reads.

**AN UNNAMED CONDITIONALITY IN EVERY RIDE TIME, found sideways:** the board has **no face under it at all** (`faceFrac ≤ 0.001`, where `FaceWater` is exactly flat and exactly still) in **22.5 %** of the shipped glide arm's frames, **31.6 %** of the prediction arm's, 11.0 % of the owner's cell's — **and 0 of 845 / 0 of 497 on the two `both` arms, which die first.** A three-fold difference across the very arms whose ordering Part 5 could not explain. **This is a live candidate for that interaction.**

## WHERE TO RESUME (weekly budget reset)

**Surfer, step eight, in this order:**
1. **The placement arm — free, and start here.** `AHEAD` 0.50 / 0.65 / 0.75 / 0.90 puts the board on **16.0 / 14.6 / 12.3 / 5.9°** of the *same* wave — as wide as the whole `FACE` sweep without changing the wave.
2. Part 6's scale sweep (0.3/0.5/0.8/1.0/1.3×) on **three** of #223's rows, not one: take-off, **bowl** (`FACE=2.1,21,6.1 DEPTH=3.4`), **set** (`1.95,16,6.8 DEPTH=3.7`).
3. Re-run `?mountAgree=deck` on a second face before it is called progress again.

**Wave track: still parked on the owner's two questions** (`&foamAlbedo=on` — does the broken water read right against the blue in one frame; `&foamAlbedo=bubbles` — is the aged lace a sandy stain). **Five rounds shipped without a ride; do not ship a sixth.**

**Movement references:** `kirra-reference.md` and `video-ref-2.md`, plus the skill `.claude/skills/surf-video-read/` (model `sonnet`, effort default) that produced the second. Their two "not at all" rows are the standing gaps: **a lip manoeuvre has no stance and no arm control — our moves are named only after they happen** — and **head/gaze has no role at all.**

## STEP 3.4h (merged `0c3740b8`, PR #378) — THE FALLS ARE REAL, AND HALF THE FACE RULING'S CONDITIONAL LIST IS RELEASED

**626 rides, 29 arms, 9 placements from just under the crest to the bottom of the face, 2 faces, entries 1–10.4 m/s: 626 of 626 fell.** Compress fell **205 of 205**. Nothing reached nine seconds; the longest ride was 7.75 s.

**So the standing 24 of 24 at 12.3° was NOT a test artefact.** Every **falls-per-runs** figure the face ruling put on the FACE-CONDITIONAL list is **unconditional again, with no re-run needed**. Only the **ride time** was ever conditional on the face.

**The ride time moves a great deal, and that is the whole of what the wrong face cost us:**
- glide cell **1.467 → 4.650 s**; the owner's own cell **1.033 → 1.450 s** — and **18 of 18 still fall**.
- The knob that reaches his water is the **FACE, not the placement**: `FACE=1.4,7.32,5.7` at the shipped `AHEAD` 0.75 gives **5.50° at faceFrac 0.1560** (his 0.157), same entry baseline, heading and height, 1.2 % off-face frames, crest-to-trough 16.35 m against his measured 15.4 m (11.2–24.4). **This is the closest the folder has come to the water he rides**, and it is where 4.650 s comes from.
- **Room is worth as much as slope:** `f73-g` and `p9075-g` are the same slope (5.50 vs 5.52°) and ride **4.650 vs 2.750 s**.

**The fall changes CHARACTER, not KIND:** 70.0° of bank at 6.47 m/s through the water on the steep arm against **42.6–48.5° at 1.16–1.31 m/s** on the gentle one. **The same fall in slow motion.** And **no slow stalls at all — 0 in 309 glide runs**, which refutes the fall-kind prediction: what grows is a slow topple the published classifier has no name for. Its 45° threshold sits on a column `AttachedRider` **clamps at 70°**, so that mix **cannot be read until the clamp round runs**.

### Three refutations, two of them of this round's own brief

1. **"The placement arm is free" — WRONG, and it was my word.** `AHEAD` moves **four** quantities: the slope; the **room** before the board runs off the face (0.37–6.65 m); the **entry-speed band** (5.28 → 8.03 m/s, 45 % of the glide cell's own span, because the probe's `EXTRAS` entry subtracts the water's flow at the placement); and, since `4·AHEAD·(1−AHEAD)` is symmetric, **every slope is reached twice** — 12.30° high rides 1.100 s, 12.12° low rides 1.467 s. Six arms were discarded and re-run on absolute entries. The span itself is confirmed exactly: `AHEAD` 0.50/0.65/0.75/0.90 → **16.00 / 14.62 / 12.14 / 5.89°** along the face, **11.46 / 10.45 / 8.65 / 4.17°** across the deck, to 1.8×10⁻¹⁵° against `FaceWater.sampleAt`.
2. **The off-face hole is SURVIVORSHIP, not a mechanism.** It is the board running off the **onshore end** onto flat still water — `faceFrac` recomputed from `aheadFronts` closes to 1.2×10⁻⁴ over ~80 000 frames, every off-face frame is past the trough and **none** behind the crest. **At a matched age (t 0.2–0.7 s) the share is 0 on seven of eight arms**, so the three-fold spread is **ride length**. **The handoff's "live candidate for Part 5's unexplained ordering" is refuted by the arms' own frames.** Two things it did not know: the shipped glide arm's ride **ENDS on flat water in 15 of 24 runs**, chosen by entry speed (every `extra ≥ 0` run leaves, no `extra ≤ −1` run does), so the bias **lengthens** the ride; and removing those frames **flips an ordering in Part 6's own table** — `predict` vs `ref` is 2.250 vs 2.900 on face time against **4.033 vs 3.683 published**. **The owner's own cell was never contaminated (0–11 %).** Probe fix shipped in `place.ts`: published median, on-face prefix and total face time printed side by side.
3. **`?mountAgree=deck` is REFUTED as a headline.** On a second face its median goes ×1.13 → **×1.00**. On both faces it lifts the sub-4 m/s runs (0.617→1.000, 0.833→1.000) and leaves the 4–6 m/s runs **bit-identical in 9 of 9**. **It is a sub-floor mount fix; it stops no fall. Stop calling it the only switch that moved the owner's cell.** (I told the owner it was. That was wrong and they have been told.)

### What remains conditional, after 3.4h

**RELEASED (no longer face-conditional):** all falls-per-runs figures, including 24 of 24 and 12 of 12.
**STILL CONDITIONAL:** the ride-time medians 1.450 s / 1.033 s as *absolute* numbers — but their *direction* is now measured on two faces; the datum arms' ordering (and Part 6's `predict`/`ref` ordering is **flipped** by the flat-water fix); the clamp's relevance.
**DEAD:** `?mountAgree=deck` as progress.

### Part D's price for the rest

The datum arms on the corrected face and `mountAgree` are **done in this round**. Falls-per-runs **need no re-run**. The bowl row (`FACE=2.1,21,6.1 DEPTH=3.4`) and `ARANGE=wide` are **~1–2 min of CPU each and worth it**. Re-running Parts 1–6's ride tables is **~25 min, and the cost is the rewriting, not the CPU**.

Ten predictions were committed before the arms were read: **five upheld, four refuted, one half**; all four refutations were about mechanism, and P8/P9 were exactly backwards — the **upper** placements are the off-face ones (35.7 %, 47.3 %), not the lower.

### WHERE TO RESUME, revised by 3.4h

1. **Stop sweeping the wave.** Nine placements and two faces said what one face said. **The wave is no longer an excuse.**
2. **The roll-inertia finding (3.3l), which this round removes the last excuse for not facing:** the ankle keeps only **0.25–0.40** of its authority over the body because the board's roll inertia is **0.5–1.1 kg·m²** against the body's **52–54**.
3. **Then the clamp round** — §4b of Part 8 cannot be read until `AttachedRider`'s 70° clamp (three sites) is lifted behind a switch.
4. **The question only the owner can answer, and it is a ride question:** *does a slow topple at 1.2 m/s feel better or worse than being thrown at 6.5?* **If worse, "make the ride longer" is the wrong target** and step nine should change.

## STEP 3.4i (merged `abf4a591`, PR #379) — THE CAUSE IS NAMED: THE ANKLE AND THE HULL ARE IN SERIES, AND THE HULL IS THE SOFT ONE

**This is the round the whole track was walking toward. After twenty-four rounds the mechanism has a name, a number and a source.**

### Part C — the term a real surfer has that we do not

**The water's own roll answer: the centre of lift travelling across the board's beam as the rider loads a rail.**

- On the board's roll row the hull's whole water column answers only **11.2–17.2 %** of the moment the rider's weight puts on the deck — every arm, two faces, two speed bands. Divided by one body weight, that is a centre of lift that has travelled **0.0075–0.046 m of a 0.232 m half-beam: 3.3–19.9 % of the width the load could use.**
- **As a stiffness it is undersized 2–140 ×.** On the ride: **12–54 N·m/rad** (a fit, R² 0.514–0.822). On a bare-board static control: **70–153 N·m/rad at trim, collapsing to zero by 15–20° of heel and REVERSING past 20°** — i.e. gone at exactly the heel the rides reach. Against the game's own three figures: **100** (`DESIGN_PARAMS.hullStiffness`), **733** (what `ANKLE_REST_RANGE = 0.25` solves to), **850–1 700** (the carve lab's own measurement).
- **THE SERIES RESULT, which explains nine rounds of null results at once.** On the code's own two-spring reduction the ankle and the hull are in **series**, so `share = k/(k+K)` = **0.937–0.985**: **94–99 % of every ankle correction rolls the board instead of righting the body.** The owner's whole ±0.25 rad of commanded ankle rest buys **3.0–12.6 N·m** against the **316 N·m** gravity applies at the **52.3°** his own Compress runs fall at. **That is why widening, bounding and re-deriving the ankle for nine rounds changed nothing.**
- **Ruled out here and not to be re-proposed:** the roll inertia (3.3m sourced it generous; reproduced), the ankle's own 800 N·m/rad, counter-roll, board width, **added mass on the wall (−3.14 to +0.25 N·m on the board's roll row)**, and the clamp.
- **No counterfactual was run, deliberately:** nobody has measured `A₄₄`'s stiffness for a flat surface-piercing planing surface at our Froude number. **Step ten: ask the water-physics advisor what it should be, change that ONE thing, and have the owner ride it.**

### Part B — the budget closes exactly, and the term a body-only diagram omits

Over **9 016 frames of 84 rides on four arms**, the partition of the body's moment row and the identity `diagonal + coupling = Σ moments` both close at **0.0×10⁰ N·m — zero to the last bit**, not "within tolerance".

**A force diagram of the body alone is out by 1.24 / 3.32 / 1.24 / 2.55 ×** `|mTotal|` (median of per-run medians; 24/18/24/18 runs). The missing term is not a fudge: it is `Σ_{j≠7} A[7][j] x[j]·L/dt`, which `coupleStanding`'s own assembly makes **`m t̂·(Δv + Δω × b)·L/dt` — the rider's mass times the across acceleration of the stance point, at the leg's lever.** It is exactly the term an inverted pendulum omits by assuming its base is still, and it is the **largest single term on three of four arms** (`|mCoup|` 54.3 / 436.6 / 194.7 / 454.9 N·m against `|mTotal|` 39.3 / 57.0 / 137.8 / 103.1).

**Gravity, not the ankle, is the largest moment on the body — by 1.4 to 25 ×** (3.7–196.8 N·m against 0.2–26.9), on every arm and every stance.

### Part A — the clamp could never have moved the mix, by arithmetic

The classifier's first test is **45°** and the clamp is **70°**: **a truncation above a threshold cannot carry a reading across it.** The mix is identical on all eight arms, run for run (14/0/10, 8/0/10, 24/0/0, 15/0/3). **The handoff's "that mix cannot be read until the clamp round runs" is REFUTED — my claim, and two constants would have settled it before I wrote the brief.**

What the clamp did hide is the bank's **size**: **70.0 → 86.8°** at the same falls on the shipped face (3.4h's "70.00 in 21 of 24" reproduced exactly). And **the third population now has a name and is one thing: a balance fall at 20–45° of bank, in 23 of 23 runs** — 10 of 24 on the owner's own face. Nothing else.

**`?bankClamp=off` stops no fall** (84 of 84, Compress 28 of 28, both sides), moves no arm median (four ratios of 1.000; two Compress cells +6.7 % and +2.8 %), and its control holds: the two riders are identical in 19 columns on 84 of 84 runs until the clamp first bites.

### Two of the brief's three premises were dead, and one was my own re-import

- **The ankle does not carry the whole 33 N·m** — gravity is 1.4–25 × it.
- **"0.5–1.1 kg·m² against 52–54" is step 3.3m's ALREADY-REFUTED diagonal, and I put it back into a brief.** Reproduced independently here: `1/ankleOwn` **1.15–2.02 kg·m²**, inertia ratio **0.958–6.166**, and **on two arms the board is the HARDER end to roll.** This is the diagonal-of-`A` error for the third time in this track.
- **3.3h's static "+33.47 / −33.40, net +0.04" does not hold dynamically:** `bdTotal` runs **+8.0 to +137.2 N·m**.

### A HOLE IN THE CANYON SEATBELT, now a number

On `main` alone, with the same build, grid, seed and step count, a **fresh spin-up** gives `c601393e8d626f2a` / `23bc1585cc56f647` while an **imported `--state`** gives `1d7f9125628f21d2` / `ff3d2edee6c660ad`. **So the fresh and imported cases cannot be told apart from the hashes alone**, and the handoff's reference hashes are only meaningful for one path. **Put this in every future brief: the third caution is no longer advice, it is a measured divergence.**

Note also that this round's byte check ran as a **120-step A/B** rather than the 3 600-step reference, because the machine was at **57 MB of free RAM swapping onto a 98 %-full disk** and the long arm went from 10 minutes to over an hour. §10b records what 120 steps does and does not buy. Disk is back to 6.9 GB free (61 % used).

**My own count correction:** the round reported 2 467 insertions / 7 deletions; measured against the merge base it is **2 572 / 8**. All eight are lines replaced in place, and the physics change is `bankRaw = angle` recorded before a clamp by `this.bankMax`, which is `MAX_BANK` unless the switch says `off` — **default unchanged by construction**, and separately measured at 84 of 84 runs over 7 columns with 0 mismatches.

Predictions: **3 upheld, 5 refuted, 2 half.** Two refutations were of the round's own reasoning, and P2's "≥10 ×" came from **one frame of one smoke run** reading 33 × where the ride median is 1.3 × — this track's own error, inside a prediction file.

### WHERE TO RESUME (weekly hit 96 % on 2026-11-17; reset 14:00)

1. **Step ten, and it is now a one-constant question:** ask the **water-physics advisor** what `A₄₄`'s roll stiffness should be for a flat surface-piercing planing surface at our Froude number, change **that one thing**, and have the owner ride it. Do not re-derive the ankle.
2. **Do not sweep the wave** (3.4h) and **do not touch the clamp** (3.4i) — both are settled dead ends.
3. **The shot list for the owner** is Part 9 §12: `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&bankClamp=off` against the same address without it. **The round expects them to feel the same; if they do not, that is news.**
4. **The owner's own open question, from 3.4h:** does a slow topple at 1.2 m/s feel better or worse than being thrown at 6.5? **If worse, "make the ride longer" is the wrong target.**

### STEP TEN DISPATCHED — and the constant is not one number, it is FOUR that disagree

Located by the caller before briefing the advisor, so the next session does not have to:

| value (N·m/rad) | where it lives | what it actually is |
| --- | --- | --- |
| **100** | `src/physics/rollModel.ts:163`, `hullStiffness` in the default plant | what the rider's **balance controller assumes** |
| **860 / 1650** | `src/physics/rollModel.test.ts:71–82` | **our own carve lab's** measurement of the real board |
| **733** | derived | what `ANKLE_REST_RANGE = 0.25` **solves to** if the ankle is to have authority |
| **12–54** | 3.4i, on the ride | what the **simulated hull actually delivers** |

**And 3.4i's "series" result is not a discovery — it is written in our own code** at `src/physics/rollModel.ts:183–186`: `series = (k·hullStiffness)/(k + hullStiffness)`, `share = k/(k + hullStiffness)`. The round re-derived from measurement what `bankAuthority` already states in closed form. That is a *confirmation*, which is worth having, but it should not be reported as a new mechanism.

**The fork the advisor's answer decides:**
- **If the true stiffness is near 860–1650**, the board's water forces under-deliver roll stiffness by **20–100 ×** → a **hydrodynamics bug**, not a tuning constant, and `#285`'s "the board's planing forces are already realistic" needs re-reading, because **that study looked at heave and pitch, never roll.**
- **If the true stiffness is near 12–54**, then a board genuinely cannot hold a standing rider in a turn, and the rider's control has to come from somewhere else entirely — which would reframe the whole track.

**The sub-question that matters most to the owner's actual complaint:** our bare-board control loses all roll stiffness by **15–20° of heel and reverses past 20°**. The owner falls *the moment he commits to a turn*. If that collapse is physical, the game is right and the rider needs another route; if it is our artefact, **it is the bug, and it is one law.**

Advisor consulted 2026-11-17 at weekly 96 %; its doc lands in `docs/research/water-physics/` with a PR, unmerged.

## STEP TEN'S ANSWER (advisor, PR #380, merged) — THE HULL IS RIGHT, AND THE REAL FIND IS THAT NO HULL VALUE CAN SAVE THE RIDER

**`K_hull ≈ 100 N·m/rad at 5–7 m/s` (bracket 65–145); 0–65 and falling below 3 m/s; ≈350 at 12 m/s.** One constant cannot carry it: `K = C·Δ·b/(τ·λ)`, C = 0.055 ± 0.015, and λ halves and halves again with speed.

**So the hull is right within about 1.5×, and it is NOT the bug. This refutes step 3.4i's own headline, and the caller's report of it to the owner.**

### The four numbers, settled

- **100** (`src/physics/rollModel.ts:163`) — **right, and the only one that is.** It is `carve-lab.md`'s prone-rider kick: 1.35 Hz on 1.33 kg·m² = **97 N·m/rad**.
- **860–1650** (`rollModel.test.ts:71–82`) — **REJECTED.** It is couple ÷ steady rail with the board free to yaw, sway and turn, and **the lab's own table refutes it**: the rail reaches 63 % in **0.02–0.05 s** while the same board's free roll mode is 1.35 Hz. An 860 N·m/rad spring on 1.33 kg·m² rings at **4.0 Hz** and cannot settle in 0.03 s. What settles in 0.03 s is the **sway/yaw force balance** — a *manoeuvring compliance* with the fins and the turn's acceleration in it. Its two 3 m/s rows, taken before a turn builds, read **91 and 232** — the right order.
- **733** — a back-solve from `ANKLE_REST_RANGE`. **Discard.**
- **12–54** (3.4i's on-ride fit) — the saturated tail, see below.

### The collapse is real; the REVERSAL was ours

`M(φ)` rises near-linearly to **φ_c = 2τλ**, then saturates at **0.30·Δ·b = 103 N·m** (167 N·m under a 52° turn's load factor), stiffness decaying as **(φ_c/φ)² from the restoring side, never through zero.**

- Loaded board at 5–7 m/s: **φ_c = 25–33°** — past every rail those rides reach.
- `hull.ts`'s **bare** board at 8 m/s: its wetted area at trim gives **φ_c = 1.8°**, so **every row from 2° on is the saturated tail.** "Collapses to zero by 15–20°" is **φ_c = 1.8° seen through a sweep that starts at 2°.**
- **The sign reversal is an artefact of a control that carried 2.54 kg instead of 75.5.** Its plateau should be 7 N·m for its 50 N and reads −8.6 to −16.
- Reversal *is* documented, but elsewhere and not for us: transverse stability loss at **length Froude 2–5** (Katayama, Fujimoto & Ikeda 2006 — 8–21 m/s for us, and at *small* heel), and negative pressure on a flat plate's rolled-down chine (NACA TN 4187, unquantified). **Our shipped section is `'flat'` (`BoardBody.ts:551`), which is why `suction` reads 0.00 on all four of 3.4i's arms.**

### THE PREMISE THIS KILLS, AND IT IS THE TRACK'S BIGGEST RESULT

Through `bankAuthority`'s own two-spring formula at `k` = 800 and ±0.25 rad:

| K_hull | rolled into the board | ±0.25 rad buys | lean held |
| --- | --- | --- | --- |
| 12–54 (3.4i's fit) | 94–99 % | 3.0–12.6 N·m | 0.4–1.8° |
| **100 (physical)** | **89 %** | **22.2 N·m** | **3.2°** |
| 150 | 84 % | 31.6 | 4.5° |
| 860 (rejected) | 48 % | 104 | 15.6° |

**At a physically PERFECT hull, a standing rider's ankle holds about three degrees of lean.** We already deliver **~80 %** of a correct hull's authority; going to 150 buys **1.3° more**. **No reachable hull value stops a 42–52° fall.**

> **A surfer is not held up by the board's roll spring at all.** He is held by keeping his mass over the board and by the lateral acceleration of a turn he steers under himself — **which is what 3.4i's own `mCoup` already measures as the budget's largest term.**

### AND IT KILLS 3.4i's 316 N·m BAR — the runs ended in a pose no surfer reaches

- Holding **52.3°** needs **12.7 m/s²** of lateral acceleration: a turn of radius **0.13 m at the 1.3 m/s those runs are doing.**
- The holdable bank is **`θ = atan(v²/(g·R))`**: with R = 2–4 m, **2.5–4.9° at 1.3 m/s**, 13–25° at 3, 33–52° at 5.
- **Worse:** Savitsky plus the board's own 259 N of buoyancy says a **73 kg rider on this 25.75 L board sinks below ≈3.2–4.3 m/s** (perhaps 2.5 with the face's orbital lift). **The low-speed arms run at 1.16–1.31 m/s — below that, and below C_V 0.6 where Savitsky itself stops being valid.** Planing begins at **≈6.1 m/s**; the owner's turns at 1.2–6.5 m/s are displacement and semi-planing.

### Mechanisms, and what we have

Waterplane shift — **yes** (and it goes to **zero** once a 25.75 L board under 73 kg is submerged, below ≈3 m/s). Dynamic lift-centre migration — **yes**, `planingScales`' 1/√x spray-root law. Rail suction — **only under `?hull=rail`**. Added mass — correctly excluded (it is an inertia).

**The one place we are light, and it is bounded:** Savitsky's lift splits into dynamic ∝ λ^0.5 and buoyant ∝ λ^2.5; per unit beam those grade as ℓ^0.5 and ℓ², so the lift-weighted exponent is **0.9 at 7 m/s, 1.4 at 5.** We carry the dynamic grading and book the buoyant share as the board's slab volume, which saturates. **Our spanwise grading is low by 1.8–2.8× — a factor of two, not twenty.**

### Two of 3.4i's figures re-framed (frame errors, as asked)

- **"the hull answers 11.2–17.2 %"** — a **real** board answers a tenth to a sixth too: the law gives 4.8 of 44.5 N·m on `f73-g` (11 %) and 23.5 of 191.6 on `s16-g` (12 %); we book 5.40 (12 %) and 32.98 (17 %). **Our number was never the anomaly it was reported as.** And "3.3–19.9 % of the half-beam" sits **inside TN 4187's measured ±21 % envelope.**

### THE ONE CHANGE RECOMMENDED — and it needs the owner's ruling first

**Do not touch the hull's roll stiffness.** Instead **cap what the rider ASKS for at what the speed can hold:** the balance's reference bank and the steer's rail hold obey **`θ_max = atan(v²/(g·R_min))`, R_min = 2.0 m** → 4.9° at 1.3 m/s, 25° at 3, 52° at 5, 65° at 6.5. **Binding only where the falls are.**

**The advisor argues it is not a hidden motor** — it changes what the rider *tries* to do, not what the water does to him, and it is what a real surfer does. **THE OWNER MUST RULE ON THAT**, because they rejected #215's pivot on exactly this boundary. Do not build it until they do.

- **If right:** Compress stands through slow positioning; the 1.2–1.5 s topple stops being how runs end; the **20–45° balance-fall population (10 of 24 on his own face) mostly goes**; falls at speed unchanged.
- **If wrong:** he feels **locked upright and unable to initiate** at low speed, and runs end by running out of wave. A quick, clear read either way.
- **The one unsourced number is `R_min` = 2.0 m** — the advisor's judgement from a 1.778 m board's rail line. Nobody has published a shortboard's minimum carved radius.

**Water-side alternative:** carry Savitsky's buoyant share by local wetted length (ℓ²) instead of slab volume → exponent 0.5 → 0.9–1.4, stiffness 78–98 → **140–200**, free per frame, physically right — **and it will not stop the falls** (4.5° of lean instead of 3.1°). Large blast radius: sinkage and trim move with it.

### TWO CALLS ONLY THE OWNER CAN MAKE

1. **Does the board keep sinking below ≈3 m/s as physics says it must, or does it carry a rider slower than physics allows** so that the slow positioning they want is rideable? This is a game-design call dressed as a physics one.
2. **Does `?hull=rail` become the default?** It is the only route to the measured buried-rail suction and to a curve that droops at large rail.

Sources: NACA TN 4187 (fig. 14(a) read from the NTRS scan); Sadati, Zeraatgar & Babuei 2022 carrying Brown & Klosinski's PMM roll moments; Katayama, Fujimoto & Ikeda 2006. **Honest limit: nobody has measured a surfboard-proportioned planing surface under a standing rider at `Fn_∇` 0.5–3.** TN 4187 has the right section at C_V 7–18 against our 0.6–3.0; the PMM series has the right Froude band at 15–30° of deadrise. **They extrapolate through the same law and agree with each other — that agreement, not either number, is the warrant.**

## VIDEO REFERENCE 3 (merged `cee7bc42`, PR #381) — "3 feet Nias Glass": THE GAME'S COMPRESS IS A HELD SHAPE AND REAL RIDING HAS NO SUCH STATE

`docs/research/new-rider/3.4/video-ref-3.md`. The owner's **first-ever** movement reference, read at last (https://www.youtube.com/shorts/GD8vS7_faSo, 16.36 s, 480×854, rider 55–95 px, drone from high and behind — **bad for knees**, every figure ±15° on knees and ±10 points on hip height). Read with the `surf-video-read` skill on **sonnet at default effort**, which cost ~132 k tokens against an Opus round's ~460 k. **The cheap-model instruction in that skill is correct and should stay.**

### THE FINDING, and it is about the exact stance that fails

- **Between turns she is UPRIGHT: knees 150–165°, hips 85–95 % of standing.**
- **The deep position is a SPIKE, NOT A STATE.** Twice it goes to **hips 35–50 %** (at 6.0 s almost kneeling, front knee 70–90°; at 8.25–8.5 s folded over the board) and each shows in **one or two consecutive frames — 0.25–0.5 s as sampled**, released immediately.
- **A held crouch longer than 1 s: NEVER. No pump rhythm.** Five near-upright stances between turns; three sharp drops to hips ≤ 50 %.
- **The game's Compress is HELD, and that held shape has no counterpart anywhere in this clip.** This is the mapping table's most important row, and **Compress is the stance that falls 205 of 205.** We have spent the track trying to make a *held* deep posture survive a turn that real riders enter and leave in half a second.

### The owner's own reading, scored precisely

- *"crouching, not compressing"* — **right for most of the ride** (upright between turns, pulsing to a crouch of hips 55–65 % / knees 100–115° for 0.5–1 s on the tail in the foam at 10.5–11 s) — **and wrong at two points, where she is BELOW the game's Crouch (0.65 m) and at or below its Compress (0.55 m).**
- *"Compress should be more down and sharper"* — **confirmed.** The real dips are **deeper AND quicker** than a held Compress, and they release at once.
- *"around two seconds turning"* — **fits one of three turns.** Turn A (bottom turn into a rail carve) ≈ **1 s**; Turn B (lip turn) ≈ **1.5 s**; Turn C (carve into a tail crouch in the foam) ≈ **2 s**, exit unseen. **Slow-motion factor: none stated and NOT verifiable** (`playbackRate` 1, spray looks real-time, no clock in frame) — so treat as probably real time, unconfirmed. If real, turn C is **twice** the measured 0.96 s bottom turn.

### THE ARMS — a flat disagreement with both earlier references

Both Kirra and Pupo show arms **spread wide and level at the loaded part of the turn**. Here, at the two deepest moments, **both arms are LOW and drawn IN toward the board**, and they only go out level **after** the turn. **At the moment the board changes direction: low and pulled in, not thrown out.** Never above shoulder height in any frame — **not even in the near-vertical lip hit at 8.75 s.** They track the trunk; no independent swing seen.

### The four standing gaps, scored against this clip

| gap | this clip |
| --- | --- |
| tall → low → tall **inside** a turn | **Confirmed, but far faster: 1–1.5 s** against Kirra's 3–4 *slowed* seconds. And **the low comes at the START of the turn** — agrees with Pupo, **contradicts Kirra's tall-before-the-low shape.** |
| hips **fore-aft over the tail** | **Weakly** confirmed, foam turn only; from above, hips-over-tail cannot be separated from hips-low-over-centre. **Not an independent second confirmation.** |
| lip manoeuvre with **no stance and no arm control** | **Confirmed** — at 8.75 s the board is near vertical, trunk twisted, arms low. |
| **head / gaze** | **Cannot judge** — the face is a few pixels wide. Still unresolved after three clips. |

### New "not at all" rows

The **fast self-releasing dip**; a **turn-timed tall → deep → tall cycle**; a **body or arm stance for the lip manoeuvre**; **upper-body lead** (shoulders ~30–45° ahead of the hips coming down the face — **and body yaw was DROPPED**, see the snap-stance work). Partly-there: tail-weighted hips and arms pulling in at the deepest point (W/S trim and arm positions exist; **the stance and the stance-to-arms link do not**).

### Still unread

**The Kirra clip is 195.6 s and only the first 50 s have been read** (which is what the owner asked for). 145 s unread, and it is the richest remaining material if its later sections hold open-face turns.

## STEP 3.4j (merged `13001074`, PR #382) — THE RIDER IS **NOT** BLIND TO THE TERM, AND THE REAL LEAD IS A 4 m/s FLOOR

**Q1: PRESENT, with the right sign and frame, and it is the LARGEST term in the controller's own bank row** — **95.8–96.7 %** of that row's L1 norm across **12 table cells** (4 speeds × 3 stances, one number per cell; **a model read, not a ride**). `|coup|` 1 384.9–3 972.1 against `|rest|` (ankle/cop) 49.7–115.9 and `|grav|` 11.7–17.8. Under `?riderBody=two`: **0.596–0.678**.

**So the advisor's closing sentence is right as physics and WRONG as a diagnosis of our rider. The next round must NOT be briefed as "add the term".**

Where it lives, verified:
- **`src/physics/rollModel.ts:689–694`** (`yawRows`, the shipped no-`body` branch): `feet` = the board's lateral acceleration `a_y = V(β̇ + r)` plus the yaw lever `x_f ṙ`, and the body's bank row carries it at **`−feet / h`**. That **is** the `−m h a_f` term an inverted pendulum omits — the controller-side twin of `coupleStanding`'s `m t̂·(Δv + Δω × b)`. A state-dependent disturbance, not a separate state.
- **`predictiveBalance.ts:173`** (`continuousPlant`) and **`:996`** (`design`): Φ, Γ, K and L are all built on that plant, so **the Smith predictor and the Kalman filter have it.**
- **`humanBalance.ts:472`** carries it a second way as the felt vertical's tilt, from the pair's specific force assembled in `AttachedRider.captureStep` (`:5038–5072`).

**Not modelled-but-unusable:** observability **10 of 10** and controllability **10 of 10** in all six cells tested. **The shipped LQR actively feeds back on it:** `K_ankle[β]` = 2.461 / 3.974 / 3.280 at 1.31 m/s and 0.433 / 0.586 / 0.646 at 6.47, against `K_ankle[θ]` = 6.082 / 7.006 / 5.159 and 0.927 / 1.048 / 1.093 — **40–63 % of the gain carried on the bank itself.**

**Q3: no frame error. The eighteenth was not here.** A matrix-only identity, read off assembled `A` with no reference to any comment, holds **on every column of all twelve cells**: **`A[3][j] = −( V·(A[5][j] + [j = 4]) + x_f·A[4][j] ) / h`**. Worked at column 5, 1.31 m/s tall: predicted +1.5233e+2, actual +1.5233e+2.

**Genuinely absent, and small:** the `z_d φ̈` half-pair (0.031 m deck height; 3.4a measured it at **3.7 %** of the roll row; `?riderBody=two`'s `feetRoll` adds it), and `capture`'s **deliberate** omission of `Δω × b` (already on the don't-retry list).

**TWO OF MY BRIEF'S CUES WERE WRONG — correct them in any future brief:**
- `predictiveBalance.ts`'s *"feels and anticipates the board; it does not pretend to steer it"* (at **1031**, repeating at 1205) sits inside the comment on **`DesignWeights.heaveScale`** and is about the board's **heave and pitch** carrying no cost, because neither command can heave or pitch the board. **It is NOT an admission about the across acceleration**, and I offered it as one.
- **`humanBalance.ts:428` is the KNEES' MOTOR LAG.** The `px = offset.x − height·nx` line is twelve lines on, at **472**. My long-standing note cited 428 and was wrong.

### THE LEAD THIS ROUND ENDS ON, AND I VERIFIED IT MYSELF

> **`PLANT_SPEEDS` runs `4 4.5 5 5.5 6 6.5 7 7.5 8 8.5 9 9.5 10 10.5 11 11.5 12` — seventeen speeds, and the lowest is 4 m/s. `labAt` (`predictiveBalance.ts:618`) clamps with `Math.max(speeds[0], …)`.**

**So at the owner's own falling speeds — 1.16 and 1.31 m/s — the balance controller is designed on the water's derivatives at 4 m/s: a 3× extrapolation.** And today's advisor puts that regime **below planing entirely** (planing starts ≈6.1 m/s) with **the board sinking below ≈3.2–4.3 m/s**, so the clamped-to-4 derivatives describe water the board is not even in.

**This is 3.4k, it is the sharpest lead the track has, and it lands exactly on the owner's bar** (*"should not fall in the lower speed of getting positioning"*). The question: **do the modelled `a_y` and the solved one agree in size at 1.2–1.3 m/s, or does the 4 m/s floor make the controller's model wrong where the owner falls?** Note what it does *not* implicate: the hull's ~100, the clamp, the wave, the placement, or the ankle's range.

## KIRRA 50–196 s (merged `2b202100`, PR #383) — PULSED DEPTH CONFIRMED ON A SECOND CLIP, AND TWO CORRECTIONS TO THE FIRST 50 s

`docs/research/new-rider/3.4/kirra-reference-50-196s.md`. ~85 frames, 3–4 s steps over 50–196 s plus 1–1.5 s steps in the four close shots. Source 854×480; rider **90–110 px in the close shots** (57–65, 129–146, 163–195 s) and **25–45 px in the wide shots** (79–125 s), **which are unreadable**. Read on **sonnet at default effort**, ~158 k tokens.

### TWO CORRECTIONS TO `kirra-reference.md`, both load-bearing

1. **THE CLIP IS NOT ONE RIDER.** It is a montage of **at least five surfers** (bare-chested bald; long hair in a red rash vest; bare-chested on an orange board; dark clothes in the wides; one in a pink top), and the description also credits Rastovich and Parkinson. **Nothing from this clip may be quoted as "Kelly does X"** — including from the first 50 s, which never checked. Cross-clip comparisons drawn from it are **between riders**, not within one.
2. **THE SLOW-MOTION FACTOR IS FOUND AT LAST — about 3× or 4×.** The description says **"72fps / 96fps 4K"** and the frame timestamps fall on multiples of **1/24 s**, so at 24 fps playback real time = slowed time **÷ 3–4** (which shot is which is unverified). **Every duration in `kirra-reference.md` is therefore 3–4× too long**, and that doc's "a turn takes 3–4 slowed s" becomes **≈1 real s** — i.e. in line with Forsyth's measured 0.96 s, not three times it. **This retires the comparison problem the skill was written to warn about.**

### The three disagreements, answered

1. **Arms: it depends on the manoeuvre, and the deepest moments agree with Nias — but the shape is sharper than "both arms in".** At the deepest points of the red-vest rider's turns (182, 187, 191, 192 s) **the LEAD hand goes low, to the front knee or the board rail, and the other arm trails low and back.** It is **one hand reaching for the board**, not both pulled in. Arms go out roughly level **only when upright or mid-carve** (143, 184, 190, 195 s). **About 1 arm in ~20 turn frames is above shoulder height, and that one is uncertain.** The first 50 s's "arms wide at the crouch" is **a different rider**, so neither generalises.
2. **DEPTH IS PULSED IN EVERY TURN THAT COULD BE READ.** Dips to hips **45–60 %** last **1–2 slowed s = 0.25–0.7 REAL s**; **no dip lasted longer than two consecutive 1 s samples.** Counts: **3 dips** in shot A (57–64 s), **2** in the tube shot (129–140 s), **3** in the red-vest shot (182–195 s). **The first 50 s's "tube crouch held 15+ slowed s" was neither reproduced nor refuted** — the longest continuous rider shot in this section is only 8 s. **Honest, and the right answer.**
3. **The low comes AT TURN ENTRY through the spray peak, with tall on both sides** — 3 of 3 sampled turns, and a tall frame precedes the low in 2 of them (184 tall, 186 low, 187–188 low, 190 up). **Agrees with Nias and Pupo.**

### THE CONVERGENCE THAT MATTERS

**Two independent clips now agree that the deep stance is a pulse, with real durations that overlap:** Nias **0.25–0.5 s**, Kirra **0.25–0.7 s**. **The game's Compress is a HELD shape and it falls in 205 of 205 measured rides.** Three clips, five-plus riders, and **not one held deep stance over ~1 s anywhere that could be read.**

**Tall → low → tall inside a turn: confirmed three more times, 4–5 slowed s = 1–1.5 real s.**

**New "not at all" row: ARM HEIGHT THAT DEPENDS ON STANCE.** The arms go low at the deepest point and level after, and **nothing in the game ties the arms to the dip.**

**Still unreadable after four reads:** hips fore-aft over the tail (three-quarter/behind camera, spray over the board); head and gaze (**faces 5–8 px wide** — this may never be settleable from video and should stop being asked of it); the lip manoeuvre's hips.

**Caveat the round flagged itself:** its Part B mapping used **the earlier docs' description** of what the game has, **not a fresh read of the rider code.** Those 13 rows are second-hand and should be re-checked against the code before any of them is built on.

## STEP 3.4k (merged `52b68629`, PR #384) — THE FLOOR'S FAULT IS A **SIGN**, AND THE FIX IS MODEL-ONLY

`docs/research/new-rider/3.4/README.md` **Part 11**; probe `3.4/floor.ts` (model only, restores `PLANT_SPEEDS` and prints the restored row); results in `results/34k/`.

### PART A — the magnitude is the smaller half. **The finding is the SIGN.**

At the owner's own falling speeds (arms with median tick speed ≤ 1.6 m/s and **100 % of ticks clamped**, 34h + 34i):

| stance | arm-rows | live ticks | speed med | side force `|model/game|` | **sign right** |
| --- | --- | --- | --- | --- | --- |
| tall | 13 | 334 | **1.31** | 1.622 | **0.409** |
| crouch | 13 | 316 | 1.252 | 2.216 | **0.345** |
| compress | 12 | 274 | 1.226 | 2.329 | **0.280** |

**Where no tick is clamped (33 335 live ticks, three stances, both rounds): ratio 0.77–0.93 and sign right on 0.92–0.98.** Roll moment `K` is 2.5–3.6× in **both** bands (3.3o already published that), **so it is not `K` that moves — the side force and the yaw moment are, and they move only under the clamp.**

> **The term that is 95.8–96.7 % of the controller's own bank row (3.4j) points the WRONG WAY on 59–72 % of clamped ticks, against 2–8 % where the table is honest. Worse than a coin toss.**

### PART D — unambiguously **(a), model-only. NO OWNER'S RULING NEEDED.**

Traced, not asserted: `labAt`/`PLANT_SPEEDS` are read by **`plantAt` alone**; `plantAt` has exactly **two** shipped callers, both inside `predictiveBalance.ts` (`:1201`, `:1206`); a grep of `src/` and `server/` finds no other consumer (only the test file). From there the table reaches **Φ, Γ, K, L and nothing else. No water force in the game is computed from it** — those come from `BoardBody`'s ledgers, which is exactly what makes Part A's model-against-game comparison possible. The only change outside the model is the ankle's **commanded rest angle**, and the ankle is a real spring already paired by its reaction on the board's roll row. **Not a hidden motor; the shape of `?riderBody=two`; NOT the ask-cap's shape.**

### PART B — the mechanism: row `'4'` is the table's own **SIGN-TURNOVER ROW**

Negative control passes first: the shipped design reproduces 3.4j's gains exactly, and **the 6.47 m/s cells do not move a digit under any row swap.**

Swapping row `'4'` for the next **measured** row (4.5 m/s), at 1.31 m/s: `K_ankle[β]` 2.461/3.974/3.280 → **0.772/1.004/1.048** (÷2.5–4.0); `K_ankle[θ]` → 2.714/2.551/2.275 (÷2.2–2.8); and **`K_twist[θ]` in Compress FLIPS SIGN (+99.8 → −383.7).** Rows 4.5/5/6 agree within ~1.8× of each other and disagree with the shipped row by 2.5–4×, so **the shipped low-speed design is an outlier produced by ONE row.**

**Why:** yaw moment per rad of slip runs **+143.8 at 4, +41.3 at 4.5, −28.6 at 5, −161.0 at 6**, and stays negative to 12. Row `'4'`'s own comment records **trim 46.4°, draft 0.513 m**. **The clamp does not extrapolate the planing table downward — it pins every sub-4 m/s design to the one row where the hull changed regime and the signs turned over**, which is exactly why Part A's failure is a sign and not a size.

### A CORRECTION TO THE CALLER'S BRIEF — carry it forward

The brief said the clamped 4 m/s derivatives "may describe water the board is not even in." **Wrong.** Row `'4'` is **a measured row taken at 46.4° of trim and 0.513 m of draft — measured IN the non-planing regime.** The fault is not that it describes planing water; it is that it is **the sign-turnover row that every sub-4 speed inherits. Different fault, different fix.**

### THE LIMIT, MEASURED NOT ASSUMED — there is no honest row below 4 m/s

Pipeline verified first (group `all`, `Kdeck`, the 1° roll / 1° slip / −0.1 rad/s cases and the mean of the two `rollRate-deck` cases **reproduce all twelve of row `'4'`'s derivatives exactly** off the stored dump; a fresh run reproduces eleven exactly and the roll-rate triple to 2–3 %).

Then: **at 1.16, 1.31, 2 and 3 m/s the towed board settles to trim 90.00° and draft 3.002 m** — `Flat`'s own bed (`waterDepth: 3`, `bedY: -3`). **The board stands on end and sinks through the tank floor. 73 kg of rider on a 2.54 kg board has no equilibrium below planing**, so **there is no honest row to measure there.** The four low-speed triples are in the results **only so nobody re-runs the rig expecting a row; they must not enter `PLANT_SPEEDS`.**

**What it would take, cheapest first: (1)** add a **draft/trim column to the ride dump** — nobody knows whether the game's board at `speedUsed` ≈ 1.3 m/s is planing or half sunk, and **if it is half sunk then row `'4'` may be the NEAREST honest row and §2's 2.5–4× is overstated**; (2) captive holds in `FaceWater` instead of flat water; (3) a rider that floats (the real low-speed case); (4) system ID from the ride's own force columns.

### THE CONSTRAINT, CARRIED — this is NOT the phenomenon

3.4h's **626 of 626** falls span 1 to 10.4 m/s, and **the honest band falls too** (33 335 ticks, model right to 7–23 %, correctly signed 92–98 %). **The clamp can explain at most the low-speed cell and is already refuted as the cause of the falls.**

**Not claimed:** the sign share is **not** conditioned on magnitude at tick level (`|yGame|` medians 68.8–89.6 N, so not a median zero-crossing artefact, but the dumps carry no tick-level `yGame`) — **fix is one re-run of `3.3/plant.ts` on these arms keeping the tick rows, no new rider**; and the band confounds "clamped" with "slow" by construction, which §2 separates model-only.

### THE OWNER'S SHOT — cheap and decisive

**Canyon, `?canyonWaves=true`: two take-offs at a crawl and two with speed already made, same spot.** If the slow ones throw him over **toward his own lean** inside the first second and the fast ones do not, this is a real part of the low-speed cell. **If they feel the same, it is not, and the lead should be closed.** It predicts a **discontinuity at 4 m/s, not a trend.**

## STEP 3.4l (merged `2a95acfe`, PR #385) — 3.4k AUDITED: THE SIGN SURVIVES, THE MAGNITUDE IS OVERSTATED, AND §2 IS VINDICATED

`README.md` **Part 12**; results `results/34l/`. **`src/` and `server/` byte-identical to `main`** — the only code change is the probe `3.3/plant.ts`, whose existing `TICKS=` dump now carries the Part 7 force columns and six trim/draft columns. **Nothing is computed for the dump that was not already on the row**, and the identity check holds: `f73-l` re-run reproduces 3.4i's published arm **exactly — 18 of 18 fell, 0.617–2.533 s, median 1.450 s.** 4 990 tick rows, 4 038 live. `tsc --noEmit` clean.

### CHECK 1 — the wrong sign is NOT a zero-crossing artefact

Clamped live ticks at `speed ≤ 1.6 m/s`, terciles of `|yGame|` **within each stance**, never pooled. **Sign right:** tall **0.448 / 0.379 / 0.433**, crouch **0.174 / 0.333 / 0.458**, compress **0.222 / 0.519 / 0.250** (low/mid/high). At a fixed gate `|yGame| > 100 N`: **0.407 / 0.514 / 0.333** on 54 / 37 / 39 ticks.

**The control is what makes it conclusive.** In the honest unclamped band the share **RISES** with the force and reaches **1.000 on the top tercile in all three stances — 315 / 378 / 313 ticks, not one disagreement** — up from 0.841 / 0.844 / 0.913 on their own low terciles. **A correct model behaves exactly as this conditioning predicts; the clamped cell does not.**

**But 3.4k's MAGNITUDE claim is overstated.** `|model/game|` falls monotonically with the force in every cell: **1.86–6.06 on the low tercile against 0.61–1.16 on the high one.** So *"the side force is 1.6–2.3× too large"* describes the ticks where the force is **smallest**. **At the ticks that matter the model has roughly the RIGHT SIZE and the WRONG SIGN** — sharper than 3.4k's own "the magnitude is the smaller half of it".

### THE CONFOUND NEITHER 3.4k NOR THE BRIEF NAMED — and it changes one stance's verdict

**Only 19 / 34 / 29 % of the ≤ 1.6 m/s live ticks have the board rolled inside 25°** (against 64 / 61 / 64 % over the whole clamped band and 69 / 76 / 63 % honest): **at a crawl the live window is mostly the capsize itself.** On the inside-25° cut: **tall 0.824 (n = 17)**, crouch **0.167 (24)**, compress **0.292 (24)**, against **0.908 / 0.900 / 0.932** honest at the same filter.

> **So the wrong sign is REAL BEFORE THE FALL in crouch and compress — and TALL's published 0.409 is largely a reading of the capsize and must NOT be quoted as design error.** The defect is in the owner's own stance and the one next to it, not in standing up straight.

### CHECK 2 — HALF SUNK, but NOT at row `'4'`, so §2 is VINDICATED

Live ticks, board inside 25° of roll:

| band | ticks (t/c/c) | speed med | `trimFace` med | `draftFace` med | wetShare | nearest row |
| --- | --- | --- | --- | --- | --- | --- |
| clamped < 4 | 241 / 216 / 184 | 3.00 / 3.12 / 2.82 | **17.2 / 17.3 / 16.0°** | **0.301 / 0.281 / 0.273 m** | 0.60 / 0.56 / 0.58 | **`'4.5'` by draft, `'5.5'` by trim** |
| clamped ≤ 1.6 | 17 / 24 / 24 | 1.50 / 1.26 / 1.33 | 5.9 / 4.4 / 4.7° | 0.145 / 0.102 / 0.111 m | 0.65 / 0.59 / 0.59 | `'9'`–`'11'` / `'6'`–`'6.5'` |
| honest 4–12 | 653 / 862 / 588 | 6.09 / 6.39 / 6.02 | 3.0 / 4.5 / 3.8° | 0.039 / 0.068 / 0.044 m | 0.54 / 0.52 / 0.50 | `'10.5'`–`'12'` / `'8.5'`–`'9.5'` |

Table comments: `'4'` **46.4° / 0.513 m**, `'4.5'` 25.9 / 0.293, `'5'` 19.3 / 0.215, `'5.5'` 15.3 / 0.166, `'6'` 12.6 / 0.133, `'6.5'` 10.7 / 0.109.

1. **Not planing** — 4–7× the draft and 4–5× the trim of the honest band, 56–60 % of patches wet against 50–54 %. **3.4k's correction to its own brief is confirmed from the ride's side too.**
2. **But row `'4'` is NOT the nearest honest row** — it is the deepest, most-trimmed row the table owns, while the ride's own pair lands on **`'4.5'` by draft in all three stances** (per-tick modal nearest `'4.5'`, `'4'` second) and **`'5.5'` by trim.**
3. **Therefore §2's 2.5–4× is NOT overstated — it is VINDICATED.** §2 swapped row `'4'` for `'4.5'`, `'5'` and `'6'`, and **the rows the board's own trim and draft pick out are inside that swap cluster. 3.4k's own escape hatch does not fire, and the next round's model-only fix is pointed the right way.**

### A NEW LEAD, recorded not pursued

At 6.0–6.4 m/s the ride sits at **0.039–0.068 m / 3.0–4.5°** where the table's rows at that speed record **0.109–0.133 m / 10.7–12.6°**. **The game's board on a face is consistently LESS sunk than the captive rig at the same speed** — the face's own orbital lift, which is the advisor's and 3.4k's argument for captive holds in `FaceWater` rather than flat water. **So table and ride disagree about regime beyond the clamp as well** — but the honest band's sign is right 92–98 %, **so that mismatch is not costing the sign.**

**Not claimed:** trim and draft are a **geometric proxy** for the hull's regime, not derivatives, so §3's "no honest row exists below 4 m/s" is untouched and **no row was written.** `f73-g` was **abandoned, not truncated** — its design goes singular partway (pre-existing) and its partial dump is excluded. The clamp still does not cause the falls (626 of 626; the honest band falls too).

**The owner's shot is unchanged and still decisive:** Canyon `?canyonWaves=true`, **two take-offs at a crawl and two with speed already made, same spot** — thrown **toward his own lean** inside the first second on the slow ones only = real; same feel = close the lead.

## STEP 3.4m (PR #386, **NOT MERGED — the classifier refused the merge, so it is the owner's**) — THE FIX IS REFUTED BY ITS OWN PRIMARY METRIC, AND THE 4 m/s FLOOR LEAD IS CLOSED

Built: `?plantFloor=4.5` (also `=5`, `=6`), opt-in, `plantFloor: undefined` pinned in `main.ts`'s online overrides. Ride address: `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&plantFloor=4.5`.

**THE NULL IS THE RESULT, AND IT CLOSES THREE ROUNDS OF MY OWN REASONING.**

### The decisive read — same ticks, state held, row swapped and nothing else

A new `yModelFloor` counterfactual column: the sign flips on **4.1 % / 0.5 % / 0.0 %** of clamped ticks, and the share goes **0.718 → 0.718, 0.519 → 0.514, 0.397 → 0.397**. **Crouch's 0.167 and compress's 0.292 are BIT-IDENTICAL.** The magnitude gets **worse** (`|model/game|` 0.916 → 1.210, 1.470 → 1.976, 2.036 → 2.823). Ride-side, no floor meets the target and **tall gets worse on both cuts (0.824 → 0.083)** — those moves are **the trajectory, not the sign.**

### WHY, and this is the round's real finding

Read off `LabPlant`'s own `[N, Y, K]` header over all 17 rows: **only two of the twelve derivatives change sign across 4–12 m/s, and BOTH ARE YAW MOMENTS** (N per rad of slip, N per rad of roll rate). **Not one of the four SIDE-FORCE derivatives changes sign at any row** (Y_φ −177.6→−395.3, Y_β +343.8→+3741.4, Y_r +43→+117, Y_φ̇ −8.0→−30.1).

> **So no choice of row can repair the sign of Y.** It can only re-weight four fixed-sign terms, and the weights barely move (slipSide/heelSide −1.936 at `'4'`, −1.684 at `'4.5'`, −1.952 at `'5'`). **And the turnover that does exist lies between 4.5 and 5, so the fix eleven rounds converged on does not even cross the sign change it was named after.**
>
> **The diagnosis joined two true facts that share no mechanism.** Both halves are real — the clamp is a genuine flaw, and the sign is genuinely wrong in crouch and compress — **but the first does not cause the second.**

### TWO CORRECTIONS TO THE PUBLISHED RECORD — both mine, both reported to the owner

1. **3.4k Part 11 §2's "the roll moment per radian of roll is −37.2 at 4" reads `roll[0]`, which by the table's own `[N, Y, K]` header is the YAW moment per radian of roll.** The roll moment per radian of roll is `roll[2]` = **−268.7 / −322.0 / −310.0 — no anomaly at all.** (The slip yaw-moment figures 3.4k quoted are right.) **A column index read as the wrong physical quantity: the nineteenth frame error in this track.**
2. **THE SHIPPED CONTROLLER NEVER DESIGNS AT 1.31 m/s.** `PredictiveController.blend` clamps to `SCHEDULE_SPEEDS[0] = 4` and reads `scheduledDesign` at grid speeds only, so **every sub-4 tick runs the v = 4 column.** `floor.ts`'s 2.461/3.974/3.280 and 6.082/7.006/5.159 are the model **at the tick's own V** — the right quantity for a sign share, **but NOT the gains the game runs.** The schedule's 4.0 column is `K_ankle[β]` **0.180/0.642/0.884** and `K_ankle[θ]` **2.949/2.630/2.291**, so **the clamp's real cost is ~1.3–1.5× on the bank gain, not 2.5–4×.**
   **Consequence: 3.4l "VINDICATED" the wrong quantity, and I reported that vindication to the owner.** The sign claim itself survives — at the controller's own design point the shares are **0.689 / 0.509 / 0.380** against 0.718/0.519/0.397.

### Controls, all measured, all clean

**Default byte-identical:** 168 model comparisons **and the whole gain schedule (306 cells × 767 numbers) identical bit for bit**; `f73-l` reproduces 3.4i's arm exactly (**18 of 18, 0.617–2.533 s, median 1.450 s**). **The switch IS 3.4k's row swap** (bit-identical at floors 5 and 6; 3.6e−15 at 4.5, because the shipped lookup reaches row `'4.5'` as an f = 1 mix). **Schedule control is exact: exactly 18 of 306 cells move at floor 4.5 and they are exactly the 18 below the floor; largest difference at or above the floor is 0.** **The 6.47 m/s cells do not move a digit at any floor.**

**Canyon byte check, fresh spin-up both legs**, wrapper prepended, grid read as **B 400 × 451 = 180 400**, 3 600 steps, "spun up on the CPU" present (78.0 s main, 45.0 s branch): `main` **a367d938f15fa934 / 9e5831f80e38abd9**, branch **the same** — and that is also this handoff's recorded B reference. A 240-step imported-`.sea` leg covers the one guard line added after that bundle was built: all three bundles give **548f3db7ca81d898 / 475f8c56c9debccc**.

**Fall counts (reported, never targeted):** 18/18, 18/18, 24/24 at every floor; medians unmoved; **`s16-g`'s whole fall table byte-identical** at floor 4.5. One worsening: longest ride `s16-l` 6.233 → 1.417 s and `f73-l` 2.533 → 1.700 (one run each). Tests: **3 651 passed, 23 expected fail**, one perf test that **passes alone in 28.76 s** under three concurrent heavy jobs; `SurfZoneRunner.test.ts` 43/43; `tsc` clean. Diff **2 262 insertions / 20 deletions, every deletion a line replaced in place** (caller verified each one).

**A design choice worth keeping:** a floor was chosen over a **draft-keyed** lookup *because the numbers forbid the latter* — 3.4l measured the honest band's board at 0.039–0.068 m of draft, whose nearest rows are `'8.5'`–`'12'`, so a draft lookup would hand the controller the 9–12 m/s derivatives at 6 m/s **and wreck the one band that works.**

### WHERE THIS LEAVES THE TRACK

**CLOSE THE 4 m/s FLOOR LEAD.** It is a real flaw (~1.3–1.5× on the bank gain) but **it cannot be the sign fault**, and three rounds now have an answer.

**STILL OPEN AND NOW THE WHOLE QUESTION:** *why is the model's side force wrong-signed in crouch and compress, before the fall, below 4 m/s* — **0.167 and 0.292 against 0.900 and 0.932 honest** — when **no row of the table can produce that sign**? It is not the row. It is in how `Y` is assembled from the four fixed-sign derivatives, or in a state fed to them. **Tall is 0.824 and must not be targeted** (3.4l: its earlier figure was the capsize).

**The owner's shot:** the `&plantFloor=4.5` address against the same without it. **We expect the same feel or slightly worse slow take-offs. If a slow take-off feels clearly BETTER, that beats every measurement above and is news.**

## STEP 3.4n (merged `1a2cfd65`, PR #387) — ⚠️ THE "WRONG SIGN" WAS OUR OWN PROBE HOLDING LEFT AND RIGHT BACKWARDS. THE MODEL WAS RIGHT.

**READ THIS BEFORE QUOTING ANY `yModel`, `kModel` OR `nModel` FIGURE FROM PARTS 11, 12 OR 13.**

**The model's side force is not wrong-signed. The probe's derived slip is.** `docs/research/new-rider/3.3/plant.ts:1052` builds β as **`atan2(vSide, vFwd)` — positive sliding LEFT** — and feeds it to twelve derivatives the lab measured against **`atan2(−vb.x, vb.z)` — positive sliding RIGHT** (`roll-plant/plant.ts:368`). `boardDerivatives` (`rollModel.ts:968`) flips the lab's N and Y into the model's axes and **does not flip the slip variable**, so the model's β *is* the lab's. **The caller verified both lines and the switch directly.** Four independent reads agree the board's local `+x` is its **left**: `finForces.ts`' `side: 1`, `BoardBody.buildFoils`, the lab's own slip line, and the cross product.

**Why it masqueraded as a low-speed defect:** the slip term is the model's **largest** exactly where β is large — β median **0.90–1.10°** in the honest band, **4.64–9.42°** below 4 m/s, **19–43° in the owner's own cell.** So one flipped state produces a wrong-signed `Y` **below 4 m/s and nowhere else** — **precisely the band structure 3.4k read as the clamp, 3.4l audited as surviving conditioning, and 3.4m could not fix with any row. 3.4m's null is now EXPLAINED rather than merely confirmed: the fault was in a state, so no row could ever have moved it.**

### The proof, on 3.4l's arms and cuts, per stance, never pooled

`negB` = the slip term's sign flipped and nothing else. `yQuasi = yGame − ysAdded − ysRad` — **exactly the set of parts the lab's derivative contains.**

| cut | stance | n | published | negB | vs yQuasi | **both** |
| --- | --- | --- | --- | --- | --- | --- |
| A clamped, \|roll\| ≤ 25 | tall | 241 | 0.718 | 0.817 | 0.759 | **0.892** |
| | crouch | 216 | **0.519** | 0.727 | 0.611 | **0.931** |
| | compress | 184 | **0.397** | 0.663 | 0.505 | **0.848** |
| B ≤ 1.6 m/s | crouch | 24 | **0.167** | 0.667 | 0.167 | **1.000** |
| | compress | 24 | **0.292** | 0.792 | 0.417 | **1.000** |
| C honest | crouch | 862 | 0.900 | 0.947 | 0.896 | **0.942** |
| | compress | 588 | 0.932 | 0.997 | 0.922 | **0.986** |

**The honest band — the control that should merely not get WORSE — gets BETTER, to 0.942–0.986. That is what a frame fix does and a fudge does not.**

**An independent check with no frame argument in it:** the ride's own least-squares side-force derivatives reproduce the table in the honest band **with β in the model's frame** — Y_φ 382/409/494 vs 396/400/396, **Y_β −1016/−1305/−1516 vs −1062/−1164/−1036**, Y_r 99/123/147 vs 92/98/91 — and read **+1016/+1305/+1516** in the probe's frame. **The data picks the lab's frame.**

### BLAST RADIUS — what carries the flipped sign and what does not

**CARRIES IT:** `yModel`/`kModel`/`nModel`, their ratios and **every sign share** (3.3p, 3.4k, 3.4l, 3.4m), the one-step residuals, and the model's implied accelerations. `x[5]` is one column of the state the probe feeds every model-side instrument.

**DOES NOT:** anything read off the matrices themselves — **3.4j's bank-row shares (95.8–96.7 %) and its `A[3][j]` identity**, the gain tables, **3.4m's bit-identical row swap and its "no side-force derivative changes sign at any row"** — and **every ride, every fall count and every trim/draft column.** The probe never writes a state back into the game.

`SLIP=lab` is **opt-in** so the affected figures can be re-read in one run; **the round deliberately did not flip the default**, because that would move dozens of published columns in a single commit. **Good judgement — keep it that way until a round re-reads them deliberately.**

### H1 IS REAL, SECOND, AND NOT THE TERM THE BRIEF GUESSED

**45–56 % of the game's own side force in the owner's cell is added mass + wave radiation, which the twelve derivatives do not contain at all.** Measured in the lab's own per-part columns (`dY/dβ` at +1° off straight, 4 m/s): fins **315.1**, rails 22.9, friction 11.5, pressure −11.5, buoyancy **0.0**, **waterInertia 0.0, radiation 0.0** N/rad. **In that cell the inertial part OPPOSES the quasi-static one on 0.79–1.00 of ticks, against 0.10–0.26 in the honest band.** **It is an inertia, not a force** — the model's sway mass is the dry **2.54 kg** against the **2.78–3.69 kg** 3.3p measured off the game's own `A⁻¹` — **so no row can ever be it.**

**My brief's "test first and hardest" hypothesis is REFUTED:** hydrostatic pressure on the buried rail carries a median **13–17 N** in every band and is **never** the largest source. **Planing pressure is largest** (0.50–0.81 of ticks), fins second. **H3 (the assembly) is a null.**

### Instrument-only, so no ruling and no hashes

**Neither model-only nor a force change — INSTRUMENT-ONLY.** The shipped controller **has no slip sense** and never builds β from a velocity ratio (it reconstructs it in its filter); `PLANT_SPEEDS` is read by `plantAt` alone and `plantAt` by `predictiveBalance.ts` alone. **No byte under `src/` or `server/` changed** — 17 files, 1 213 insertions, **1 deletion**, verified by the caller. Controls: `f73-l` reproduces 3.4i exactly (18 of 18, median 1.450 s); the published metric returns **to the digit** at 3.4m's own n; the default dump is **byte-identical** with `SLIP=lab` added; `SLIP=lab` **moves no ride** (every ride column identical to 0.000e+00) and its `yModel` equals the default's `yModelNegB` **tick for tick at 0.000e+00 N**; the ten sources sum to `yGame` at 0.000e+00; `tsc` clean.

**Also corrected:** the Y-derivative signs quoted in my 3.4n brief (`Y_φ −177.6`, `Y_β +343.8`, …) are **the lab's**; the model's are flipped on N and Y. **3.4m's no-turnover conclusion is untouched.**

### STILL OPEN

**The magnitude below 4 m/s** (0.83–1.64× on cut A; the clamped band's fitted `Y_β` is a twentieth to a quarter of the row's, consistent with the derivative being 92 % fins and lift ∝ V²). **The missing inertial term** (H1 above) — the first genuinely unmodelled physics the track has found. And a **new lead, recorded with populations and deliberately NOT promoted to a cause:** the filter's own β is **2.5–4.2°** where the board's is 0.9–1.1°, and sign-agrees on only **0.65–0.75** of honest-band ticks.

**It does not move the falls.** 3.4h's **626 of 626** stands; every arm fell in every run. **What it changes is what eleven rounds of a metric meant.**

## ⚖️ TWO OWNER RULINGS, 2026-11-17 — BOTH AUTHORISED, ONE BUILDING, ONE QUEUED

### RULING A — "Yes, cap the ask." (step 3.5a, BUILDING)

Asked whether the game may limit what the rider **asks for** to what its speed can hold, given it targets 42–52° of lean at 1.3 m/s (a 13 cm turn radius), **the owner chose "Yes — cap the ask."** The option they picked states explicitly: *"The rider never requests a lean its speed cannot hold, **whether the request came from your stick or from its own balance**."*

**So the cap binds BOTH the balance's own reference AND the stick's request. Do not narrow it to one.** `θ_max = atan(v²/(g·R_min))`, `R_min = 2.0 m` → 4.9° at 1.3 m/s, 25° at 3, 52° at 5, 65° at 6.5. **Opt-in, default byte-identical. `R_min` is the advisor's judgement and the one unsourced number.**

**This is the first change in the whole track the owner has said yes to.** It is a bound on a reference, not a force — but it sits near the no-hidden-motors line, which is why they ruled. **If building it ever requires adding a force to make it stick, that is the cheat: stop and report instead.**

### RULING B — "Three depths." (QUEUED behind 3.5a)

Asked what Compress should become, given four videos and five-plus riders show **no held deep stance anywhere** (upright between turns at hips 85–95 %, a deep spike of **0.25–0.7 s** at turn entry, **never held beyond ~1 s in any readable clip**) while our Compress is held for as long as the key is pressed and **falls 205 of 205** — **the owner chose "Three depths."**

**What they authorised:**
1. **Upright**;
2. **a moderate crouch they CAN still hold** — explicitly kept, because *"getting into position at low speed"* is their stated priority and they must not lose a holdable low stance;
3. **a quick deep dip of about 0.5 s that springs back out on its own** — the very deep pose **stops being somewhere the rider can live**, which is where every fall happens.

**This matches the video evidence exactly** (`video-ref-3.md`, `kirra-reference-50-196s.md`, `video-ref-2.md`): the low comes **at turn entry**, tall on both sides, tall → low → tall in **1–1.5 real s**.

**Open sub-question NOT yet put to them:** whether the dip is **triggered by their input only**, or **fires automatically on turn entry** as the videos show. **Default to their input** — an automatic dip is the game moving the body for them, which is the same boundary Ruling A sits on. **Ask before choosing automatic.**

**Why queued, not parallel:** 3.5a edits the rider's bank reference and stance handling, and Ruling B edits stance depths and their timing — **the same files.** Two agents there at once would collide and neither result could be trusted. **Build B immediately after 3.5a merges.**

**One caveat the owner was shown and accepted:** the cap may change how Compress behaves enough that Ruling B looks different afterwards. They chose three depths anyway. **If 3.5a's result materially changes Compress's behaviour, say so before building B rather than building it blind.**

### ⚠️ RULING B SUPERSEDED — the owner revised it, and their version is better than mine

**Do not build "three depths" as recorded above.** The owner revised it in the same session, in their own words:

> *"your recommended suggestion is good, but I still want the stances and you want a button to make the stance deeper like the videos? the compress should be quite deep already, the crouch could be worked on to match the video to have a better system"*

and, asked whether holding a deep stance should cost anything:

> *"yes add the cost, legs that tire"*

**THE AGREED DESIGN (supersedes Ruling B):**
1. **Keep all four stances** — Tall, Crouch, Compress, Snap. Nothing is replaced or collapsed.
2. **Keep Compress's depth.** The owner's reading is that it is already about right, **and the footage agrees** — the videos' deepest moments land at or just below it. **The depth was never the fault; HOLDING it is.**
3. **Rework Crouch** to the sustained moderate crouch in the footage (hips 55–65 % of standing, knees 100–115°, held 0.5–1 s).
4. **A button that momentarily deepens the current stance**, self-releasing, like the videos' dips.
5. **Legs that tire** — holding a deep stance costs something real.

**Where I was wrong:** my "three depths" implied we needed a new, deeper place. We do not. **The owner found the smaller and more precise change before I did** — the deep position we have is right, and what no rider does is *live* in it.

**My argument that survived, and that they accepted:** if staying deep is free there is never a reason to come up, so the tall → low → tall rhythm can never emerge and would have to be animated instead. **That is why the cost is in.**

### ⚠️ TWO THINGS THAT MUST BE SETTLED BEFORE THIS IS BUILT (prep round dispatched, read-only)

1. **THE CONVERSION NOBODY HAS MEASURED.** The videos report depth as **a percentage of standing hip height**; our stances are in **metres**; **the game's own standing hip height has never been measured.** So the two frames cannot currently be compared, and **a Crouch rework tuned on a guessed conversion would be the twenty-first frame error.** The prep round measures it and re-expresses all four stances as percentages. It is also **re-checking `video-ref-3.md`'s claim** that the deep spikes are *"below the game's Crouch (0.65 m) and at or below its Compress (0.55 m)"* — **that claim may itself compare a hip fraction to a stance metre with no conversion.**
2. **A TIMESCALE OBJECTION TO "LEGS THAT TIRE", MINE, NOT YET CONFIRMED.** Muscle fatigue acts over **tens of seconds**; the footage's dips last **0.25–0.7 s** and the whole cycle **1–1.5 real s**. **If that holds, fatigue cannot be what brings a rider up after half a second** — it would only stop a rider camping in a crouch for ten seconds or more. **Worth having, but it will NOT produce the rhythm, and the owner has been told so plainly before the build is spent.** The prep round confirms or refutes it and, if I am right, **names what actually brings a surfer up out of the dip in half a second** (candidates: the turn ending; unweighting to change rail; the board's own loading and unloading; extending through the exit to project speed).

**The mechanism constraint:** fatigue is legitimate **only** as a fall in what the legs *can* do — their available force or torque declining with sustained effort and recovering when unloaded. **Never a brake, a damper, an added torque, or a timer that moves the body.** `?legPower=cap` already exists and the prep round says whether fatigue belongs there.

**Still unasked:** whether the dip fires **on the owner's input only** or **automatically at turn entry**. **Default to their input.**

### ⚠️ "LEGS THAT TIRE" IS REVERSED — INFINITE STAMINA STANDS. Do not build fatigue.

The owner reversed it within the hour, after being shown the timescale objection:

> *"lets stop the work of legs that tire, lets leave it as infite stamina"*

**So: no fatigue, no stamina drain, no cost on holding a stance. Stamina is infinite and that is settled.** The prep round's fatigue research was stopped mid-flight; its stance-height task continues.

**Why they were right to reverse:** fatigue acts over **tens of seconds**, while the footage's dips last **0.25–0.7 s** and the whole cycle **1–1.5 real s**. It could never have produced the rhythm — it would only have stopped a rider camping in a crouch for ten seconds or more. **Building it would have spent a round and a ride on something that cannot deliver what it was wanted for.** Raising the objection *before* the build was the cheapest thing done all day.

**WHAT THIS COSTS, AND IT SHOULD BE SAID PLAINLY:** my argument for the cost was that *if staying deep is free there is never a reason to come up, so the tall → low → tall rhythm cannot emerge and has to be animated instead.* **That argument is unanswered, not refuted** — it is simply no longer being acted on. **So the rhythm will not appear on its own.** Either it is driven by something else (see below), or it is authored.

**THE AGREED DESIGN, now final:**
1. **Keep all four stances** — Tall, Crouch, Compress, Snap.
2. **Keep Compress's depth.**
3. **Rework Crouch** to the footage's sustained moderate crouch.
4. **A button that momentarily deepens the current stance**, self-releasing.
5. **Infinite stamina. No fatigue.**

**THE QUESTION THIS PROMOTES TO THE TOP:** if neither fatigue nor a timer brings the rider up, **what does?** Candidates, none yet established: **the turn itself ending; unweighting to change rail; the board's own loading and unloading of the legs; extending through the exit to project speed.** The last is the most promising because it is a *reason* to rise rather than a limit on staying down — and a reason is what makes a skill emerge. **This is the next design question for the owner, and it is more interesting than the one just closed.**

**Still unasked:** whether the deepen button fires **on the owner's input only** or **automatically at turn entry**. **Default to their input.**

## STANCE FRAME (merged `63b4295c`, PR #388) — THE LADDER IS MEASURED, THE OWNER'S INSTINCT HOLDS, AND THE DIP ALREADY EXISTS IN THE CODE

`docs/research/new-rider/3.5/stance-frame.md`. **The caller verified every code line below personally.**

### The conversion, and my brief picked the wrong denominator

**Standing hip height is 0.78 m above the deck** (`riderPosture.ts:100`, the pelvis part's placed height — and that file says at `:83–87` that these heights are *"illustrative, not measured"*). `AttachedRider.ts:3853` uses it as the stance's hip. **The game's own STRAIGHT leg puts the hip at 0.88 m** (`:3854`, `stance + LEG_EXTENSION`, `LEG_EXTENSION = 0.1` at `:808`).

**0.88 m is the right denominator and 0.78 m is not.** All four video documents read the rider's upright, between-turns stance at **75–95 %, never 100 %** — their 100 % is a straight-legged stand no rater ever sees. Against 0.88 m the game's Tall reads **89 %, inside the footage's own resting band**; against 0.78 m it reads 100 %, outside every clip's. **The two frames differ by up to 20 points — more than the gap between the game's Crouch and its Compress.** This is a calibration against the videos' own resting reading, not a preference.

| stance | leg depth | hips, m | **÷ 0.88 m** | footage |
| --- | --- | --- | --- | --- |
| Tall | 0 | 0.78 | **89 %** | resting band 75–95 % ✔ |
| Crouch | 0.195 | 0.585 | **66 %** | **no counterpart in any clip** |
| Compress | 0.30 | 0.48 | **55 %** | sustained crouch 55–65 % ✔ |
| Snap (shipped) | 0.30 | 0.48 | 55 % | — |
| tuck / `?snapDepth=deep` | 0.45 | 0.33 | **38 %** | deep spikes 35–50 % ✔ |

### "Compress should be quite deep already" — THE OWNER IS RIGHT, and now we know what it is right FOR

**Compress at 55 % sits exactly in the footage's sustained, holdable crouch band (55–65 %).** So Compress's depth is already correct **for the moderate crouch they wanted kept.** The footage's **deep spikes are 35–50 %**, and Compress is 5–20 points shallower — nowhere near them.

> **So the 0.5 s dip belongs deeper, at 0.34–0.47 m of leg depth — which is `MANUAL_CROUCH_DEPTH` = 0.45 m, the tube tuck, ALREADY IN THE CODE and already shipped as the opt-in `?snapDepth=deep`.**

**Crouch is the stance that is actually wrong.** Its 0.195 m / 66 % falls in the gap between the footage's resting band and its crouch band — **no counterpart in any of the four clips.** The footage wants **0.21–0.30 m**.

**So the ladder the footage asks for is 0 / ~0.30 / ~0.45 m — and all three depths already exist as constants.**

**THE COLLISION TO RESOLVE BEFORE BUILDING:** move Crouch to 55–65 % while Compress keeps 55 %, and the two end up **0–10 points apart** — which is precisely the defect 3.3e measured **on the rider the owner actually rides**: on `?rider=new`, Compress adds only **0.025–0.115 m** over tall in 4 of 6 runs, against **0.300–0.336 in 6 of 6** on the default rider. **Crouch and Compress would collapse into each other.**

### THE ONE THING THAT BLOCKS THE BUILD

**`stanceAt` clamps the depth at 0.30 m** — `predictiveBalance.ts:607`, `Math.min(STANCE_TABLE[2].depth, depth)` (read and confirmed). **So every stance deeper than Compress — the tuck, `?snapDepth=deep`, and the dip if it goes where the footage says — is INVISIBLE TO THE BALANCE PLANT**, which designs it with Compress's pendulum length, Compress's body inertia and Compress's bank limit. **A fourth `STANCE_TABLE` row is needed**, and `BODY_FRONTAL_SHARE` (`:595`) and `hipRange` (`standingBody.ts:98–103`) are keyed on the same three depths.

### AND THE DIP SELF-RELEASES FOR A REASON WE ALREADY HAVE — no stamina system needed

**`kneeStrength` already makes the legs weaker as the dip deepens: 3.0 / 2.25 / 2.1 / 1.9 body weights** tall / crouch / Compress / tuck (`standingBody.ts:113–117`, `KNEE_TORQUE = 300`), matching **Zöger 2025 (n = 28)** and **Lynch 2021 (n = 59)** in direction and roughly in magnitude. **That is a static strength curve, not fatigue** — so it survives the owner's infinite-stamina ruling untouched, and it is the mechanical reason rung 3 should spring back. **It needs no new quantity.**

### WHAT BRINGS A SURFER UP IN 0.25–0.7 s — it is not fatigue, and (a) is measured

(a) **the turn ends — 0.96 ± 0.04 s (n = 6 riders / 835 turns, Forsyth 2024) and 0.8 ± 0.03 s (n = 4 / 2 060, Shormann 2020)** — high confidence and quantitative. **The dip's duration IS the turn's duration.**
(b) the legs cannot hold the load down there (1.9–2.25 vs 3.0 BW, three agreeing samples) — high in direction.
(c) the leg's travel runs out, so extension is the only move left — **certain, it is our own code.**
(d) extending through the exit drives the turn (Komissarov 2022, Kogelbauer 2024) — **borrowed from ski and skate, and the ski sign is OPPOSITE to the surf footage's. Do not lean on it.** (My own earlier guess that (d) was "the most promising" is therefore withdrawn; (a) is the answer.)

### THE ERROR BAR — carry it to the owner and do not tune past it

±10 points of video error is **±0.09 m** on a 0.88 m leg, and the denominator spread is worth another **±0.1 m**. **The conversion is good to about ±0.1 m against a ladder whose entire travel is 0.45 m.** Build to the three rungs and **judge by riding; do not tune to the centimetre.** The knee-angle cross-check (footage 100–115°; our Crouch 82.5°; the drawn rig's gauge 104°/102° at a 0.117 m drop) brackets the hold at **0.12–0.20 m** — a **0.1 m disagreement with the percentage route, unresolved on paper**, and that is the same error bar showing honestly.

### THE TWENTY-FIRST FRAME ERROR, in three of our own documents — and the conclusion survives it

`video-ref-3.md`'s "0.65 m" and "0.55 m" are `STANCE_TABLE`'s **whole-body centre-of-mass height above the feet** (`predictiveBalance.ts:555–557`, defined at `rollModel.ts:27–29` as the inverted pendulum's length), **not hips.** The hips in those stances are **0.585 and 0.48 m** — the CoM sits a constant **6–7 cm** above the pelvis in every stance, **a quarter of Compress's whole travel.** It propagated `video-ref-2.md:44` → `video-ref-3.md:37,57` → `kirra-reference-50-196s.md:103` (which states *"I did not re-read the rider code"*). **Converted properly, the spikes at 0.31–0.44 m of hip ARE deeper than both and land on the tube tuck — so the conclusion survives and only the arithmetic was wrong.**

**ROOT CAUSE FIXED:** `.claude/skills/surf-video-read/SKILL.md` asked for *"hip height as a fraction of standing height"* and **never defined the denominator.** It now says **straight-legged standing hip height**, explains why 100 % is a pose that never appears in a clip, and **forbids setting a video fraction beside a game metre without converting**, pointing at `3.5/stance-frame.md`.

## CROUCH COLLISION DIAGNOSED (merged `ace845fe`, PR #390) — ⚠️ COMPRESS IS NOT SHALLOW. TALL SINKS. And a published number of ours was 64–93 % frozen frames.

`docs/research/new-rider/3.5/crouch-collision.md` + probe `3.5/depth.ts`. **Read-only; 0 files under `src/`.** Population for every number: the Canyon-matched `FaceWater` (1.4 m, 2.6 m deep, 16°, 5.7 m/s — **a fit to Canyon, not Canyon**), 3 entry speeds × 2 sticks = **6 runs per stance per rider**, live window 0.5 s → the frame before `attached` goes false (**6 of 6 fall on both riders**). Per stance, never pooled.

### PROBLEM A — MY BRIEF'S PREMISE IS REFUTED. The category was a fourth one I did not list.

**The new rider achieves 100–111 % of its commanded depth — and reaches it FASTER than the default rider** (0.300 m at **0.600–0.717 s** vs **0.767–0.817 s**; `rest − got` = 0.000–0.003 m). All three of my candidate bugs are answered with a column: the command **arrives** (`cmd` 0.300 every live tick), is **followed**, and is **not lost** (minimum `rest` after arrival 0.295–0.298 m, in 1–11 ticks of 31–164).

> **The fourth category: THE DATUM MOVED.** Tall's own target reaches **0.003–0.299 m with nothing pressed**, putting its hips at **0.518–0.777 m** — within **0.067 m** of Compress's.

| live frames | `cmd` | `rest` | `got` | hips |
| --- | --- | --- | --- | --- |
| Compress, `?rider=new` | 0.300 | 0.300–0.333 | 0.300–0.329 | **0.451–0.480 m** |
| Compress, default | 0.300 | 0.300 | 0.298–0.299 | **0.481–0.482 m** |
| tall, `?rider=new` | 0 | 0.003–0.270 | 0.003–0.262 | **0.518–0.777 m** |
| tall, default | 0 | 0.000 | ≈0 | **0.780–0.781 m** |

**Compress is the same stance on both riders within 0.031 m. TALL is not.** Δ tall→Compress is **0.066–0.297 m (new)** against **0.299–0.300 (default)** — **the gap closed from the top, not the bottom.**

**Cause, read not inferred:** `stanceRoom(0).kneeTravel` **is** `CROUCH_DEPTH` = 0.30 (`humanBalance.ts:160`, verified: `at(0.3, 0.15, 0, 0.195)`), and `prepareLeg` **adds the balance's knee correction on top of the command** — `asked = Math.min(asked, -(heldDepth + human.knees × travel))` (`AttachedRider.ts:4088`, verified). **So a standing rider at `knees` = 1 sinks 0.295 m for free in 1.4 s, and the button then only adds 0.05 m.** This is **step 3.3f's finding, independently reproduced on a probe written from scratch.**

### ⚠️ 3.3e's PUBLISHED NUMBER — WHICH I QUOTED TO THE OWNER — WAS A FROZEN-FRAME ARTEFACT

3.3e's "Compress adds only 0.025–0.115 m in 4 of 6 runs" **reproduces exactly on its own window** (0.025 / 0.045 / 0.047 / 0.115 / 0.188 / 0.250 — its published band to the thousandth) **with 0.64–0.93 of that window being FROZEN FRAMES.** Right arithmetic, wrong window — **`AttachedRider.separate` (`:4586`) never sets `phase` or `upright`, so every rider column freezes after separation**, and that known trap had already corrupted a published figure. **The twenty-second.** *I presented that number to the owner as the collision.*

**Nothing clamps, scales, filters or rate-limits the depth downward:** the feet-only-push `slack` clamp (`:4137`) binds in **0.00 of live ticks in all three new-rider stances**; `CROUCH_SPEED`/`CROUCH_ACCELERATION` are identical on both riders.

### THE FOURTH `STANCE_TABLE` ROW IS NEEDED TODAY, NOT JUST FOR THE DIP

On the shipped `?rider=new` the **achieved** depth is already past `stanceAt`'s 0.30 m ceiling in **0.28–0.95 of Compress's live ticks, 6 of 6 runs** (0.006–0.417 of Crouch's), because the knee drop adds up to 0.044 m. **Cost today ≈0.042 m of pendulum length, 4 % in ω₀ — small, reported not promoted.** Missing-row cost if the dip goes to 0.45: pendulum **37 % high**, ω₀ **15 % low**, plant inertia **1.9×**, `riderYawInertia`/twist frozen at Compress's, and with `riderCost`'s `feetReach` the **bank limit frozen too**. **Measurable, not a guess:** `3.2/inertia.probe.ts` yields `height`/`lower`/`upper`/`BODY_FRONTAL_SHARE` from de Leva's segments — one posture line and a run.

**Two of my worries cleared by reading:** the plant is fed the **achieved** depth (`yawDepth`, `:3622, 4497`), **not** the commanded one, so it is *not* solving a knee-dropped tall stance on a tall pendulum; and **`stanceRoom` already has a 0.45 m row and `hipRange` already covers 0.30–0.45 m** — only `STANCE_TABLE`/`stanceAt` and `BODY_FRONTAL_SHARE` are keyed on three depths. **Half the fourth-row worry was unfounded.**

### PROBLEM B — the measured ladder is NOT the constants' ladder

On `?rider=new`, as % of the game's own straight leg (0.88 m): **tall 59–88 %, Crouch 56–66 %, Compress 51–55 % — OVERLAPPING**, with **0.26 m of spread on tall (86 % of Compress's whole travel) that nothing the player does controls.** **The measured Crouch already reaches inside the footage's 55–65 % band.**

**So the collision is not a design problem. It is the uncommanded knee drop.** Four options, costs stated, **none picked** (the owner decides):

1. **Crouch → 0.27–0.30, Compress → 0.34–0.45.** Touches `CROUCH_SHARE` and `CROUCH_DEPTH` — and `CROUCH_DEPTH` is **the unit for `SNAP_DEPTH`, `SNAP_DEPTH_DEEP`, `CARVE_FLEX`, `SNAP_DRIVE_DEPTH`, the tuck blend, the `deepest` window and the default rider's leg softening: one constant, six behaviours.** Fourth row + `BODY_FRONTAL_SHARE` required. Breaks: at the bands' inner edges the two end **0.04 m apart** — the very separation complained of; `stanceRoom(0.34–0.45).kneeTravel` = 0.036–0, so **the balance's knee strategy is nearly disabled in both deep stances**; every 3.2–3.4 population re-bases.
2. **Crouch → 0.27–0.30 alone, Compress held.** **One number, no fourth row, no re-basing — cheapest by far.** Breaks: at 1.00 Crouch **is** Compress (0.03 m apart at 0.90) — two buttons, one stance; and "Tall absorbs the gap" has nowhere to go, since **what already fills 66–89 % is the uncommanded knee drop.**
3. **Ladder untouched, dip on the new button.** No depth constant moves; 0.45 exists twice already (`MANUAL_CROUCH_DEPTH`, `?snapDepth=deep`), so it is an input plus a ~0.5 s clock. Fourth row required. **Lowest risk to everything tuned at 0 / 0.195 / 0.30.** Breaks: Crouch keeps 66 %, which no clip shows, and the footage's holdable crouch stays covered by Compress under the wrong name — **a naming problem, the owner's to accept.**
4. **Settle the ladder's DETERMINISM before its values** — `?kneeRoom=achieved` (shipped, opt-in, **off** by default) lifts tall's hips 0.518–0.777 → **0.615–0.777 m** and the Δ floor **0.066 → 0.157 m** (22 % → **52 %** of the designed 0.30). Answers none of B; **makes B judgeable by riding.**

### THE COUPLING THAT DECIDES THE ORDER

**A and B are NOT the same thing — but B cannot be judged by riding until A is settled**, because whatever B picks will be ridden on a tall stance that wanders 0.26 m on its own. **The owner's instruction was "fix the crouch collision first then build the dip", and this is what that means concretely: option 4 is the fix, and it is already shipped behind a switch.**

**Carried, settled:** `kneeStrength` 3.0 / 2.25 / 2.1 / 1.9 body weights comes from **geometry alone** (`standingBody.ts:113–117`), matching Zöger 2025 (n = 28) and Lynch 2021 (n = 59) — a static strength curve that **survives the infinite-stamina ruling intact**, so **every option inherits a self-releasing deep rung for free. No stamina system is proposed anywhere.**

## STEP 3.5a (PR #389, **NOT MERGED — a test gap, see the end**) — ⚠️⚠️ THE CAP THE OWNER AUTHORISED ALREADY SHIPS, AND TIGHTER. I PUT THE QUESTION TO THEM ON A WRONG FACT.

**Verified by the caller directly in `AttachedRider.ts` at `1a2cfd65`:**
```
const most = this.planing ? Math.min(MAX_BANK, Math.atan((speed*speed)/(WATER.gravity*radius))) : 0;
const asked = Math.max(-most, Math.min(most, this.steer*railRange + ...));   // the steer's reference
const own   = Math.max(-most, Math.min(most, this.steer*railRange + ...));   // the predictive rider's
```
`TURN_RADIUS = 4.5` (`:491`), `PLANING_DROP = 3` (`:343`), the bound at `:3434–3448`. **In place since 2026-10.**

- **`θ_max = atan(v²/(g·R))` already bounds BOTH lines the owner's ruling names** — the predictor's reference *and* the steer's.
- **At `R = 4.5 m` it is TIGHTER than the advisor's 2.0 m at all twelve speeds** — 2.19° vs 4.92° at 1.3 m/s, 29.5° vs 51.9° at 5. **So R_min = 2.0 m is a LOOSENING, not a cap.**
- **Below `PLANING_DROP = 3 m/s` the ask cap is EXACTLY 0** — stick hard over, peak as well as median, `planing` 0.000 across the whole live window of 9 runs. **The rider already asks to stand perfectly plumb there.**
- **THE 42–52° I QUOTED TO THE OWNER IS THE BANK THE BODY *REACHES* AT THE FALL, NOT THE LEAN IT *REQUESTS*.** The request is exactly `steer × 50° + handBend × 5.73°` — **0.00° at stick 0**, confirmed to the digit, peak = median in every run.

> **THE TWENTY-THIRD ERROR, AND THE MOST EXPENSIVE KIND: it cost the owner a decision, not a round.** I asked them to rule on whether the game may cap what the rider asks for, describing a 42–52° ask that does not exist. The quantity was already pinned, and tighter than the fix I proposed. **Before putting a design question to the owner, read the code that would implement it.**

### What the round measured anyway, and it is worth having

**28 arms, 540 runs, 540 of 540 fell, Compress 180 of 180.** The 100 % bar is unmet at every radius and stick setting. Published arms reproduce exactly (`f73-l` 18/18 at 1.450 s; `s16-l` 18/18 at 1.033; `f73-g` 24/24 at 4.650).

- **With the stick CENTRED the cap never clips — all five radii are BIT-IDENTICAL. The build is inert there, and that is the result.** So the 626-of-626 falls and the 20–45° balance-fall population are untouched **by measurement, not by inference.**
- With the stick **hard over** the shipped cap clips **every live tick**, holding the ask at **18–23° against a request of 50°**; **38–48 % of the owner's low cell's live ticks are off the plane, where the cap is 0.0°.**
- **Looser is SHORTER at every stick setting.** Compress medians hard over: ships **1.283 s** → 2 m 0.817 → 1.5 m 0.833 → 4.5 m 0.833 → **9 m 1.133**. `askCap=9` (double the shipped radius) is **the only value that lengthens anything** — 3 cells of 6, 6–8 runs each, fall count pinned at 100 %. **A lead, not a result.**
- **TURN INITIATION DID NOT GET WORSE:** time to 5° of rail **0.333 / 0.317 / 0.333 s** shipped vs the same at 2 m vs 0.350 / 0.317 / 0.317 at 9 m; peak yaw rate **rises** at both ends (100–148 °/s shipped, 165–193 at 2 m, 167–178 at 9 m).
- **BOTH OF THE ADVISOR'S PREDICTIONS ARE REFUTED, and its "locked upright, unable to initiate" failure mode IS THE SHIPPED GAME:** stick hard over at 1–3 m/s the ask is **0.00°** and the board still rails to **56–84°** and swings **21–36° of heading** before falling — never running out of wave. Both predictions reasoned about a quantity that was already pinned.
- **Positive control:** at `askCap=9` the half-stick and full-stick arms are **bit-identical over 18 runs** — both saturate the cap. **The rider acts on the ask, not the stick.**
- **No hidden motors, and none was tempted:** two factors inside one `min`/`max` pair bounding a commanded angle. **No torque, damper, brake or yaw moment; no force function, ledger or solver in the diff.** *"The bound's problem is that it has nothing to bind, not that it fails to hold."*

### Byte-identity measured, Canyon included

`f73-l` exact; the 37 new probe columns move no ride (**0 mismatches over 6 966 column-values of 18 runs**, 73 log lines identical); all five radii bit-identical with the stick centred on three arms. **Canyon byte check PASSED with a fresh spin-up on both legs** (`--state` deleted first so both printed the spin-up line, 48.9 s / 47.0 s; grid B 400 × 451 = 180 400, 3 600 steps): `main` and branch both **`a367d938f15fa934` / `9e5831f80e38abd9`**, the recorded reference. A 240-step imported leg gives `548f3db7ca81d898` / `475f8c56c9debccc` on all three bundles.

### ⚠️ WHY IT IS NOT MERGED — the one real gap

**The full `vitest run` never completed.** The machine has 8 GB and was at **~60 MB of free pages**; three attempts (default workers, `--maxWorkers=4`, `--maxWorkers=2` over `src/physics` alone) **died silently with no summary and no exit output — an OOM kill.** Passed on a quiet machine: **`PhysicalMode.test.ts` 106/106**, **`SurfZoneRunner.test.ts` 43/43** by hand, **`uniformSnapshot` + `poolBarrelPerf` 10/10** (both had failed at 270 s and 102 s against a 60 s timeout *in the saturated run* and pass alone — **load timeouts, not findings**). `tsc -b` clean. **The remaining physics suites were NOT run.**

**The caller checked the machine and found 15 MB of free pages with 8.8 GB of 10 GB swap in use, so re-running them would likely OOM again and would take the machine away from the owner while they are riding.** The merge is therefore **held on the owner's word**, not on a probe bar — the code change is two factors in a `min`/`max` with no force touched and default byte-identity *measured*, so the risk is low, but the suites are a seatbelt and seatbelts are the one thing not to skip.

### Ruling B is unblocked

**3.5a does NOT materially change Compress** — default byte-identical by construction, and with the stick centred identical at every radius across 60 runs. **So Ruling B can be built on exactly the Compress that was measured when it was ruled**, answering the caveat recorded with that ruling. Only caveat is a file one: 3.5a edits `prepareBank`, so **B should start from this branch, or from `main` after it lands.**

## VIDEO REFERENCE 5 (merged `ba3f92ba`, PR #391) — ⚠️ THE OWNER'S OWN FIFTH CLIP SHOWS **HELD LOWS**, AND RULING B'S PREMISE IS NOW CONTESTED

`docs/research/new-rider/3.5/video-ref-5-dave-rasta.md`. "Dave Rasta flowing." — title only, **rider identity not verified**. 12.24 s, **360×640**, ~24 fps, rider **80–120 px** → ±15° on a joint, **±10 points on a hip fraction**. ~60 stills plus zooms at 0.25–0.5 s steps. **Slow-motion factor: could not be determined** (`playbackRate` 1, page silent); looks real time but unproven, **and every duration below depends on it.** Probably more than one wave: same rider and board throughout, no hard cut, but framing changes at 2.5–3.0 s and 9.0–9.25 s → treated as three segments.

### THIN SPOT 1 — ANSWERED, AND AGAINST THE PREVIOUS FOUR CLIPS: **YES, THREE HELD LOWS IN THREE TURNS**

| segment | low period | duration | hips (% of straight-legged standing) | rung |
| --- | --- | --- | --- | --- |
| S1 turn | 0.5 → ~2.25 s | **~1.75 s** | 40–55 % at the deepest | Compress, reaching into the tuck band |
| S2 turn | 5.0 → ~7.0 s | **~2 s** | 45–55 % | Compress / tuck boundary |
| S3 turn | 9.25 s → clip end | **≥ 2.9 s, release never seen** | 45–60 % | Compress, touching the tuck band |

**None is a spike.** The hips stay low across 4–7 consecutive sampled frames while the board turns, and **the rider changes shape inside the low without coming up.**

**Sensitivity to the unknown slow-motion factor, which the round did itself:** at 2× slowed these become ~0.9 / 1 / ≥1.5 s — **still holds.** Only **~3× or more** turns them back into spikes, **and nothing observed suggests 3×.**

**Honest limits, stated by the round:** **solid** that the rider is well below the Tall band for seconds; **weak** at telling 45 % from 60 % in rear views at 100 px. **One rider, three turns, one of them cut off by the clip's end — it did not generalise.** And **trunk foreshortening biases the reported percentages HIGH, so the true holds may be deeper still.**

> **So "across four clips and five-plus riders, nobody holds a deep stance" — which I gave the owner as the basis for Ruling B — is contested by the owner's own fifth clip. This is the FIRST clip that SUPPORTS a held Compress instead of contradicting it.**

### THIN SPOT 2 — the low still arrives at ENTRY (3 of 3, tall before it 3 of 3) — but here it is **not released**

It stays through the peak in 3 of 3 and into the exit in 2 of 3. **So the shape is `tall → held low → tall` on a 2–3 s scale**, not the earlier clips' `tall → brief low → tall` on a 1–1.5 s scale. **Two distinct patterns now exist in the evidence, not one.**

### THE ARMS — a THIRD distinct answer, and a synthesis finally emerges

At the loaded low point of all three turns: **the lead hand is down at the rail, board or knee, and the REAR ARM IS UP AND BACK, fist at about head height or above.** Spread, level arms appear **only in the tall between-turn frames.** **And the rear arm moves against the trunk — which no earlier clip showed.**

Across five clips the arms read: wide-and-level (Kirra first 50 s, Pupo) / both-low-and-in (Nias) / lead-down-other-trailing-low (Kirra remainder) / **lead-down-rear-UP (this one)**. **The synthesis that now fits all five: arms are spread and level only when TALL; as soon as the rider is low the LEAD hand goes down. The disagreement is only about the OTHER arm** — and that may be the manoeuvre, not the rider.

### CROUCH'S 66 % GAP — CONFIRMED A FIFTH TIME

**No sustained frame sits at 66 %.** The rider passes through 65–75 % for ~0.5 s on the way up or down (2.5–2.75 s, 7.5 s) and **never stays.** Five clips, and Crouch-as-shipped still has no counterpart anywhere.

Where the clip's time goes: ~10 of its 25 half-second slots at **45–65 %** (Compress or deeper), ~10 more at **65–80 %**, and the **Tall rung (85–90 %) only at 8.0–8.5 s**, about 1 s, with arms fully spread.

### MAPPING

**Have it:** held Compress depth (**the first clip to support it**); Tall. **Partly:** the deepest hold touching the tuck band (the game has it only as `?snapDepth=deep`); the hand drag but not the stance-tied arm pose; hips over the tail; upper-body lead. **Not at all:** a `tall → low-at-entry → held → tall` sequence **timed to the turn**; and **the lead-hand-down + rear-arm-up pairing at the peak of a held low.** Not in the clip: drop-in, tube ride, pump (no rhythm seen). **Turn length 2.5–3.5 s of video clock — not comparable to the measured 0.96 s bottom turn until the slow-motion factor is known.**

### WHAT THIS DOES TO RULING B — THE OWNER MUST BE TOLD, NOT MANAGED

Ruling B (and its revision) rests on *"four videos, five-plus riders, no held deep stance anywhere."* **That statement is no longer true of the evidence.** The design still has support — Crouch's 66 % is unused in five clips out of five, and the low still arrives at entry in every readable turn — **but "the deep place must stop being somewhere the rider can live" is now contradicted by one of the owner's own references.** The honest position: **two patterns exist, a ~0.5 s dip and a ~2 s hold, and we have one clip for the hold and four for the dip.** Do not quietly keep building the dip as though this clip did not land.

## ⚖️ RULING C (2026-11-17) — "KEEP THE HELD COMPRESS, BOTH PATTERNS ARE REAL"

Shown that their own fifth clip holds a deep stance for 1.75–2.9 s where four earlier clips showed only 0.25–0.7 s spikes, the owner ruled:

> ***"keep the held compress, both patterns are real"***

**So the dip is an ADDITION, not a replacement, and the held Compress is now evidence-backed rather than a compromise.** The design, final:

1. **Keep all four stances. Compress stays HELD** — supported by video 5.
2. **A deepen button = the dip pattern**, self-releasing, landing in the footage's spike band (**35–50 % of standing = 0.45 m of leg depth**, which already exists as `MANUAL_CROUCH_DEPTH` and ships as `?snapDepth=deep`).
3. **Rework Crouch** — still the one unused rung, **confirmed 5 clips of 5.**
4. **Infinite stamina. No fatigue.**

**Supersedes the "three depths" framing and its revision.** Nothing is taken away from the owner.

### THE BUILD ORDER, AND WHY IT SPLITS

**Crouch's VALUE waits on the owner's ride** of `?kneeRoom=achieved`, because tall sinks up to 0.27 m on its own and *"B cannot be judged by riding until A is settled"*. **But two pieces do NOT wait, and one of them is overdue:**

- **The fourth `STANCE_TABLE` row is needed TODAY, not for the dip.** On the shipped `?rider=new` the **achieved** depth already passes `stanceAt`'s 0.30 m ceiling in **0.28–0.95 of Compress's live ticks, 6 of 6 runs**, so the balance plant is already designing those ticks with Compress's pendulum length, inertia and bank limit. Cost today ≈0.042 m / 4 % in ω₀; **if the dip reaches 0.45 m it becomes pendulum 37 % high, ω₀ 15 % low, inertia 1.9×, and the bank limit frozen.**
- **The deepen button** is a new input that need not touch Crouch's or Compress's constants.

**⚠️ A SUBTLETY THAT MUST NOT BE MISSED: the fourth row is NOT purely additive.** Because the 0.30 m clamp already bites in up to 95 % of Compress's ticks, adding the row **changes how existing Compress ticks are planned.** So **it has to be opt-in and its effect on existing Compress measured, not assumed** — otherwise "default byte-identical" is false while appearing true.

**Measure the row, do not guess it:** `3.2/inertia.probe.ts` yields `height`/`lower`/`upper`/`BODY_FRONTAL_SHARE` from de Leva's segments — one posture line and a run. **`stanceRoom` already has a 0.45 m row and `hipRange` already covers 0.30–0.45 m**, so only `STANCE_TABLE`/`stanceAt` and `BODY_FRONTAL_SHARE` are keyed on three depths.

**Still unasked, and the default stands:** whether the dip fires **on the owner's input only** (the default, and what is being built) or **automatically at turn entry** as all five clips show. An automatic dip is the game moving their body for them — the boundary Ruling A sits on — **so ask before choosing automatic.**

## STEP 3.5b (PR #392, **NOT MERGED — classifier refused the merge, so it is the owner's**, like #389) — THE FOURTH RUNG AND THE DIP, BUILT; AND MY "IT SELF-RELEASES FOR FREE" IS REFUTED

Switches, both off by default, both pinned `undefined` in `main.ts`'s online overrides with a test reading `main.ts`:

| | URL | what it turns on |
| --- | --- | --- |
| the fourth rung | **`?stanceDeep=on`** | `STANCE_TUCK` in the balance's plant **and** a fourth gain-schedule knot at 0.45 m |
| the dip | **`?deepen=on`** | the owner's **existing crouch key** reaches the tuck's 0.45 m anywhere, and Compress no longer fades it away |

**They are independent — either rides alone — but the dip wants the row with it** (without it, **0.98–1.00 of the dip's live ticks are clamped onto Compress's plant**).

### The measured row

```
STANCE_TUCK = { depth: 0.45, height: 0.40, lower: 0.857, upper: 2.440 }   BODY_FRONTAL_SHARE_TUCK = 0.2624
```
From `3.2/inertia.probe.ts` — de Leva (1996) segments posed at the tuck's hip height (0.78 − 0.45 = **0.33 m** over the deck), read by the same two functions that **reproduce the three shipped rows to the thousandth.** `height` 0.40 is **both** `design.md`'s own tube-tuck row *and* the probe's 0.394 m, which agree. **The posture is the error bar and it was swept, not asserted:** over back 0.10–0.16 m × lean 0.50–0.90 rad, `lower` ±14 %, `upper` ±18 %, share ±7 %. **Nothing tuned to the thousandth.**

Physics confirmed in a test: pendulum 0.55 → 0.40 m (**the missing row was 37.5 % high**), ω₀ 4.22 → 4.95 rad/s (**15 % low**), `m h²` 22.1 → 11.7 (**1.89×**). New: Compress → tuck, the rider's yaw inertia **on the board falls 31 %** while the **twist rotor's rises 25 %**, as the thighs' share moves from the board onto the twist when the knees fold.

### ⚠️ A SECOND CLAMP MY BRIEF MISSED — the row alone would have changed NOTHING

**`SCHEDULE_DEPTHS = [0, 0.195, 0.3]` (`:1220`) and `PredictiveController.blend` clamps to its last knot at `:1370` BEFORE picking the two designs to blend** — and a design is only ever built *at* a knot. **Verified by the caller directly.** So a fourth `STANCE_TABLE` row on its own would have left every design built at depth 0.30 reading Compress's row. The row reaches the gains **only** through a fourth knot (`SCHEDULE_DEPTHS_DEEP`), which is why one switch turns both on. **My brief's "only `STANCE_TABLE`/`stanceAt` and `BODY_FRONTAL_SHARE` are keyed on three depths" was wrong** (`stanceRoom` and `hipRange` were indeed already done, as it said).

### ⚠️ THE TRAP WAS REAL, AND IT COSTS 0.7 s OF COMPRESS'S RIDE

**Population:** Canyon-matched `FaceWater` (1.4 m, 16°, 5.7 m/s, 2.6 m deep — **a fit to Canyon, not Canyon**), **5 entry speeds × 4 sticks = 20 runs per stance per leg**, live window 0.5 s → the frame before `attached` goes false (**no frozen frames**). Per stance, never pooled.

| stance | fell | median ride | rows bit-identical | ride moved |
| --- | --- | --- | --- | --- |
| tall | 20/20 → 20/20 | 2.883 → **2.883** | **20 of 20** | 0 of 20 |
| crouch | 20/20 → 20/20 | 2.950 → **2.950** | 8 of 20 | 3 of 20, by ±0.017 s (one frame) |
| **Compress** | **20/20 → 20/20** | **3.067 → 2.367** | **0 of 20** | **17 of 20, −1.633 … +0.233 s** |
| default rider | 20/20 each | unchanged | **60 of 60** | 0 of 60 |

> **The correct pendulum, inertia and bank limit make the ride the owner already has SHORTER — 0.70 s off Compress's median (23 %), worst cell −1.633 s, and the fall count does not budge (20 of 20 → 20 of 20, cause `balance` every run).** Three runs gain up to +0.233 s. One cell, one rider.

Under Compress the plant goes L 0.550 **pinned** → 0.522–0.550 m, ω₀ 4.223 → 4.224–4.341, bank limit 4.38° → 4.38–4.62°, and the achieved depth passes the old 0.30 ceiling in **0.11–0.96 of Compress's live ticks, 20 of 20.** **So default-on would have been "byte-identical" in appearance only** — the trap recorded with Ruling C was real. **Crouch is the proportionality check:** the row's effect scales with how far past 0.30 m the leg actually got.

### ⚠️ THE DIP DOES NOT SELF-RELEASE, AND MY REASON WAS WRONG — I told the owner this twice

`?deepen=on` puts the hips at **0.331–0.353 m = 38–40 %** of the 0.88 m straight leg, **inside the footage's 35–50 % spike band** (20 runs). But:

| hold | reached 0.45 m | time to reach | **rose while still held** |
| --- | --- | --- | --- |
| 0.25 s | **0 of 19** | — | **0 of 19 runs, 0 ticks** |
| 0.50 s | 7 of 19 | 0.450–0.483 s | **0 of 19 runs, 0 ticks** |
| 0.70 s | 15 of 19 | 0.450–0.517 s | **0 of 19 runs, 0 ticks** |
| 1.50 s | 15 of 19 | 0.450–0.517 s | **0 of 19 runs, 0 ticks** |

**The dip's duration is the press's duration, full stop. And the reason I gave for a free self-release cannot work: `kneeStrength` bounds the FORCE the legs may push with, not the LENGTH they are held at** — the caller verified it returns `2·KNEE_TORQUE / d`, a force. **Too much load makes the body sink BELOW the rest, never rise.** **I told the owner "it springs back for a physical reason you already own" in two separate messages. That was wrong.** **A self-release needs a mechanism we do not have, and it would be a clock or a new rule. None is built, proposed or hidden.**

What the measurement does give: the leg's own pace needs **0.45–0.52 s** for the last 0.15 m (`CROUCH_ACCELERATION` 6 m/s², `CROUCH_SPEED` 1.5 m/s), so **a 0.25 s press never arrives** and the footage's 0.25–0.7 s band is **only half-reachable**; a 0.5–0.7 s press gives a whole tall → low → tall cycle of **0.85–1.05 s**, inside the footage's 1–1.5 s.

**And the deep stance is a worse place to live, on this cell:** held at the tuck for the whole ride the median is **1.650 s** (`?deepen=on`) or 1.750 s (with the row), against shipped Compress's 3.067 s. **A finding, not a bug** — and note it cuts *against* the four clips' dip reading and *with* video 5's holds being something other than a resting place.

### Seatbelts

**Default byte-identity MEASURED:** same probe on `main` and the branch, no switch set — **140 runs × 38 columns, 0 mismatches** (60 `?rider=new`, 60 default, 20 tuck arm); **the default rider is inert under `?stanceDeep=on` too, 60 of 60 identical with the switch ON.** **Canyon byte check passed on BOTH paths** at 240 steps (grid B 400×451 = 180 400, wrapper prepended): fresh spin-up `e3dbec2465df6c10`/`abb6419d6cca4c3a` identical; both-imported `548f3db7ca81d898`/`475f8c56c9debccc` identical, the pair the handoff already records for a 240-step imported leg. **Caution (3) reproduced on one bundle** — the two paths give different pairs. The 3 600-step reference is **not** quoted as a pass (different step count). Suites: `src/physics` **58 files / 637 passed** (21 expected fails), `src/scene/rig` + `src/game` **70 / 740**, `SurfZoneRunner` **43/43** by hand, `predictiveBalance.test.ts` 22/22, `PhysicalMode.test.ts` 107/107, `tsc -b` clean. **No force, torque, damper, brake, impulse or velocity assignment in the `src/` diff** — the caller read all 35 deletions and all are replacements in place.

### THREE QUESTIONS FOR THE OWNER

1. **The row costs 0.7 s of Compress's median ride on this cell, with falls unchanged at 100 %.** It is the *correct* pendulum, inertia and bank limit — and it makes the ride they already have shorter. **Keep it, or hold it until the dip is ridden with it?**
2. **Should the dip be automatic at turn entry?** All five clips tie it to entry; what is built is **their input only.**
3. **Nothing can bring the dip up on its own.** If they want that, it is **a clock or a new rule, and it needs their ruling before anyone builds it.**

## ⚖️ RULING D (2026-11-17) — "KEEP THE ROW"

Asked whether to keep the measured fourth rung — **the correct pendulum (0.40 m, not a 37.5 %-high 0.55), the correct inertia (1.89× out) and the correct bank limit — knowing it takes 0.70 s (23 %) off Compress's median ride on 20 runs with the fall count unchanged at 20 of 20**, or to hold it until the dip had been ridden with it, the owner ruled:

> ***"keep the row"***

**Read as: the correct physics SHIPS — default, not parked behind a switch**, since keeping it behind a switch is indistinguishable from holding it. **The owner was told that reading explicitly and that it is one line to reverse.**

### WHAT THIS COSTS, AND IT MUST BE SAID IN EVERY ROUND FROM NOW ON

> **Every ride time this track has published was measured on a pendulum 37.5 % too long and an inertia 1.89× out, in whatever share of Compress's ticks passed the old 0.30 m ceiling (0.11–0.96, 20 of 20 runs).** Making the row default **re-bases all of them**, including the standing reference arms every round cites — `f73-l` **18 of 18, 0.617–2.533 s, median 1.450 s**, `s16-l` 1.033 s, `f73-g` 4.650 s.

**So the next round's first job is to RE-MEASURE the reference arms on the new default and replace those numbers**, or every future byte-identity check and every ride comparison is against a figure from the wrong plant. **Until that is done, do not compare a new ride time to a pre-Ruling-D one.** Old numbers are not wrong *as records*; they are records of a different plant.

**Keep a switch for the old behaviour** (e.g. `?stanceDeep=off`) so the two can still be A/B'd — the comparison is the only way to price anything against the track's own history.

**Not changed by this ruling:** the fall counts. **20 of 20 → 20 of 20, cause `balance` in every run**, so nothing about the falls is re-based — only the ride times. Compress's and Crouch's **depth values** also stay out of scope (Ruling C, and Crouch's value still waits on the `?kneeRoom=achieved` ride).

### STILL OPEN, BOTH NEEDING THE OWNER

1. **Should the dip fire automatically at turn entry?** All five clips tie it to entry; what is built is **their input only.** An automatic dip is the game moving their body for them — Ruling A's boundary. **Ask, do not assume.**
2. **Do they want the dip to self-release at all**, knowing `kneeStrength` cannot do it (it bounds force, not length) and that **it would have to be a clock or a new rule?** Measured: **rose while still held, 0 of 19 runs, 0 ticks, at every hold length.**

**And PRs #389 (the ask-cap) and #392 (this row and the dip) are both the owner's to merge** — the classifier refused both.

## VIDEO REFERENCE 6 (merged `ce2cb0ee`, PR #393) — DEPTH TRACKS THE **MANOEUVRE**, AND TWO SETTLED RULES BREAK

`docs/research/new-rider/3.5/video-ref-6-mason-ho.md`. Mason Ho, @ripcurl Short, 25.98 s, **read after 11 s only on the owner's revised scope**. **The best-quality read of the series: 720×1280 with the rider 200–300 px, 2–4× every earlier clip.** Hard cut at 10.2 → 10.7 s, so the post-11 s footage is its own shot; he is invisible 12.95–16.30 s, long enough to hide a splice, so conclusions are per segment.

### THE LOWS — there are none

| # | window | duration | hips | rung | starts | released | manoeuvre |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | 11.32 → 11.95 | **≈0.63 s** | 65–75 % read (55–75 % with camera bias) | **the Crouch gap (66 %)** | **BEFORE the turn** — end of the pop-up, through the drop | **Yes, released INTO the turn** | take-off + drop, **not a turn** |
| L2 | 12.85 → 12.95 | ≈0.10–0.15 s | 65–75 % | Crouch gap | board running straight | not seen | **brace against foam — no game name** |
| L3 | 17.40 → 17.55 | ≈0.15 s | 75–80 % | Tall, low edge | mid-trim, no direction change | not seen | trim, a weight settle |

**No sustained low below 65 %. Nothing in the Compress band (55–65 %). Nothing near the tuck. Held lows: 0. Dips: 0.**

### WHAT DISTINGUISHES A HELD LOW FROM A DIP — **the MANOEUVRE, and the zero is the evidence**

The round says plainly it **cannot** separate the candidates from a clip containing neither, and reports itself as a **one-turn read.** But across six clips depth now tracks **how hard the manoeuvre loads the legs**: **deep spikes with snaps, lip hits and tubes (clips 1–4); held lows through long carves (clip 5); and here — a drop, one unhurried bottom turn and a coast along a shoulder — no low at all.** A pro rider, same sport: **when nothing asks the legs to bend, they stay long.**

> **This weakens "the rider" as the explanation — a sixth rider produced neither pattern — and supports the manoeuvre as the controlling variable.** Wave shape, speed, distance travelled and rail engagement: **cannot tell, stated as such.**

**And it names a THIRD kind of low neither category covers: a landing/absorption crouch that the NEXT manoeuvre spends** — not a turn-entry dip, not a sustained carve low.

### ⚠️ RULE BREAK 1 — the low can come BEFORE the turn and be spent BY it

All five earlier clips put the low at **turn entry: 8 of 8 readable turns.** Here he is **lowest at the end of the drop, already extending when the board starts to come round, and TALLEST at the turn's peak.** So `tall → low-at-entry → held → tall` **is not present**; the sequence is **low → tall, with the turn in the tall half.** **Now 8 of 9.** Caveats given: one turn, and a bottom turn off a take-off, so it may say more about take-offs than about turns.

**Notably this is the one time the ski/skate sign matches** — `stance-frame.md` §6(d)'s *extend through the arc*, which had disagreed with all the surf footage. **It was retired as "borrowed from ski and skate, opposite sign"; it now has one surf frame on its side.**

### ⚠️ RULE BREAK 2 — "tall ⇒ arms spread" is DEAD

Four arm patterns in 2.9 s: pop-up, **both hands on the deck/rail**; drop into the turn, **lead hand low + rear arm UP to head height** (video 5's pairing, **reproduced on a different rider** — caveat: which arm is lead is inferred from the nose direction, not observed); tall trim after the turn, **both arms spread wide and level** (5 frames, classic Kirra/Pupo); tall trim on the shoulder, **both arms hanging LOW below the waist** (7 frames, **no arm above the shoulder in any of them**).

> **He is in the Tall band in both of the last two, by the same measurement, and the arms are completely different. Arm height is NOT a function of leg depth. It tracks the manoeuvre.** The five-clip synthesis ("spread and level only when tall") is refuted.

### SLOW-MOTION FACTOR BOUNDED — a first for this series

**Not slowed, and ≥2× is ruled out.** `playbackRate` 1, nothing in title or page. The physical argument: **pop-up 0.20 s** (prone 11.117 → on feet 11.317) against published pop-ups of 0.4–0.7 s, so a 2× slowdown needs a real pop-up of ≤0.13 s; and **the bottom turn reads 0.35–0.40 s** against measured real bottom turns of **0.96 ± 0.04 s and 0.8 ± 0.03 s** — **far too short to be slowed.** Best reading: real time, possibly slightly sped up. A frame-cadence test **failed its own control** (same timestamp, two hashes) and is reported as a failure, not a number.

**Worth noting on its own: a real bottom turn here is 0.35–0.40 s against the 0.8–0.96 s this track has been using as the published benchmark.** Either this turn is unusually fast or the benchmark does not describe this kind of turn.

### THE 66 % CROUCH RUNG — something is finally near it, but it is not a riding stance

~0.6 s at 65–75 %, **the first time in six clips.** But **it is a drop, not a riding stance**, and the error bar spans the rung. **Not a confirmation** — and L1's own number (68–74 % read) is the one the doc flags as **not to be quoted without its caveat**, because a behind-and-above camera over-reads a folded trunk by up to 10 points, making **"does the deepest moment touch Compress" genuinely undecidable.**

### TWO METHOD FINDINGS NOW FOLDED INTO THE SKILL

1. **The stale-frame trap is worse than a 1 s wait fixes.** The pane falls to `document.hidden`, **painting freezes, and a screenshot silently returns the previous frame** — a failure that looks exactly like data. Proven defences, now in the skill: **print the reached `currentTime` and a frame counter into the canvas**, and **take two screenshots per draw and read the second.** Closing the artifact pane restored painting once; a local HTTP sink would bypass it but the pane blocks localhost with `ERR_BLOCKED_BY_CLIENT`.
2. **Above ~200 px the binding error is no longer resolution but the HIP LANDMARK** — a waistband sits at ≈0.60 of stature where the trochanter is at 0.53, so **±10–15 points on every hip figure however sharp the image.** Read from a **shoulder-to-waistband** scale, cross-check against head-to-hip, and **report disagreement rather than picking a winner.** Video 6 also reported **no knee angles at all** rather than guess them — the right call, now written down.

## ⚠️ RULING D'S PRICE WAS WRONG — CORRECTED BY STEP 3.5c (pushed to `claude/35b-fourth-row`, so **PR #392 now carries 3.5b + 3.5c as ONE merge**, still the owner's)

**The 0.70 s I quoted the owner is the PLAIN `?rider=new`'s. On the rider they actually ride it is +0.050 s, and on all three reference arms it is 0.000 s.**

| Compress, 20 runs, same face / entries / sticks | old plant | new default | Δ |
| --- | --- | --- | --- |
| plain `?rider=new`, 3.5b's own probe and cell | 3.067 | 2.367 | **−0.700 s** |
| plain `?rider=new`, this round's probe | 3.083 | 2.367 | **−0.716 s** |
| **`?rider=new&feltFrame=deck&riderBody=two` — the owner's own address, s16** | 2.517 | **2.567** | **+0.050 s** |
| the same, **f73 (the owner's own slope)** | 2.200 | **2.250** | **+0.050 s** |

**Cause, read then measured:** `3.5/depth.ts:180–187` passes **neither `feltFrame: 'deck'` nor `riderBody: 'two'`**, so 3.5b's headline is the **point-mass, world-felt-frame** rider. Swapping only that one thing moves the row's effect from **−0.716 s to +0.050 s.** The row is just as *active* on the owner's rider (15 and 17 of 20 runs move, single runs −1.450 … +1.533 s) — **the net loss is what is absent, not the effect.**

**3.5b is not wrong:** its arm is correctly measured and correctly labelled `?rider=new`. **What was wrong is my carrying that number to the owner as "the row's price" without saying which rider — and the ruling was taken on it.** The twenty-fourth number in the wrong frame, and the second time today a decision was put to the owner on one (the ask-cap was the first). **Falls are unchanged everywhere: 20/20 → 20/20, 18/18, 24/24. No fall count moves.**

### RULING D's "RE-MEASURE THE REFERENCE ARMS" IS DONE — AND NOTHING NEEDS REPLACING

| arm | published (old plant) | **new default** | runs moved |
| --- | --- | --- | --- |
| `f73-l` | 18 of 18, 0.617–2.533 s, median **1.450 s** | 18 of 18, 0.617–2.533 s, median **1.450 s** | 2 of 18 (Compress), −0.084 … +0.017 s |
| `s16-l` | 18 of 18, median **1.033 s** | 18 of 18, median **1.033 s** | 2 of 18 (Compress), −0.034 … −0.017 s |
| `f73-g` | 24 of 24, median **4.650 s** | 24 of 24, median **4.650 s** | 1 of 24 (Compress), −0.200 s |

Per stance identical on all three; **tall and crouch bit-identical run for run.** **So the three figures every round cites can be quoted as the NEW plant's, unchanged** — and the earlier warning that *"no new ride time may be compared to a pre-Ruling-D one"* is **withdrawn for these three arms.** It still holds for any figure measured on the plain `?rider=new` cell, where the plants genuinely differ by 0.7 s.

### The flip, and the seatbelts

**`?stanceDeep=off`** gives the old three-row ladder and the 0.30 m clamp; **nothing** gives the fourth rung (what now ships); `?stanceDeep=on` says the shipped behaviour out loud so 3.5b's published addresses keep working. **Five executable lines**, `DEFAULT_WEIGHTS.stanceDeep = true` and `?? true` at the two read sites. **All 50 `src/` deletions read individually — every one a comment or a type/assignment line replaced in place. No force, torque, damper, brake or velocity assignment.**

- **`?stanceDeep=off` is byte-identical to the pre-flip default on all three arms: 54 runs × 359 summary columns, 0 mismatches (`cmp` on whole files)** — and the pre-flip default reproduces the published figures exactly, **so the chain closes to print.**
- **The new default is byte-identical to the pre-flip `?stanceDeep=on`**, same 54 × 359. **The flip is a default change and nothing else; no third behaviour appeared.**
- Second instrument: `depth.ts` reproduces 3.5b's published `off` leg **60 of 60** and its `on` leg **60 of 60**, including 3.067 → 2.367.
- **THE CANYON REFERENCE PAIR DID NOT MOVE**, and this check is stronger than 3.5b's: **3 600 steps, FRESH SPIN-UP** (the "spun up on the CPU in 49.0 s" line printed — the path the reference was taken on), wrapper prepended **and verified by reading the bundle's first line**, grid read **B 400 × 451 = 180 400** → **`a367d938f15fa934` / `9e5831f80e38abd9`, identical in both columns. Nothing to re-record.**
- Suites: `src/physics` **58 files / 638 passed** (21 expected fails), `src/scene/rig` + `src/game` **70 / 740**, `SurfZoneRunner` **43/43** by hand, `predictiveBalance.test.ts` 23/23, `PhysicalMode.test.ts` 107/107, `tsc -b` clean.

### Two honest loose ends it recorded rather than smoothed

1. **`ceilingShare` does not predict the cost.** Ticks past the old 0.3005 m ceiling are **tall 0.00 everywhere** and Compress **0.00–0.16** on f73 (which explains `f73-l`/`f73-g`), **but 0.44–0.61 on s16 at stick 0 where the ride still does not move.** *"ceilingShare predicts the cost" is refuted as stated* — necessary, not sufficient. **The mechanism is half-explained and labelled as such.**
2. **`depth.ts` and `plant.ts` figures are NOT comparable for the owner's rider.** `depth.ts` has no `FELT`/`BODY` switches, **and** the two differ in the manoeuvre (`depth.ts:251` releases the stick at `ACROSS` = 85°; `plant.ts` holds it the whole run). The rider difference alone carries the −0.716 s, so the manoeuvre was not isolated. **Anyone comparing a `depth.ts` number with a `plant.ts` number must check both.**

Its own slip, recorded in the README: a policy test first called `scheduledDesign(7, 0.45, {weights})` — three args, so the weights landed in `rail` and every gain was `NaN`. **vitest does not type-check; `tsc -b` caught it.**

## ⚖️ RULING E (2026-11-17) — "THE DIP SHOULD FIRE ON MY INPUT ONLY"

Asked whether the deepen button should fire **automatically at turn entry** — which all five of the first clips tie it to — or only on their own input, the owner ruled:

> ***"the dip should fire on my input only"***

**No code change needed: that is exactly what step 3.5b built** (`?deepen=on`, the owner's existing crouch key reaching the tuck's 0.45 m, fired by them and nobody else). **The ruling confirms the default rather than changing it.**

**Why it matters anyway:** it settles the boundary a second time, the same one Ruling A sits on. **An automatic dip would be the game moving their body for them**, and the owner has now drawn that line twice in one day — **do not propose an automatic stance change again without putting it to them first.** Note that video 6 weakened the case for automatic-at-entry in any case: **the low there came BEFORE the turn and was spent BY it**, so "turn entry" is not even a reliable trigger (8 of 9 now, not 8 of 8).

### THE ONE STANCE QUESTION STILL OPEN

**Do they want the dip to self-release at all?** Measured: **it rose while still held in 0 of 19 runs, 0 ticks, at every hold length** (0.25 / 0.5 / 0.7 / 1.5 s). **`kneeStrength` cannot do it** — it returns `2·KNEE_TORQUE / d`, a **force** bounding what the legs may push with, not the **length** they are held at, and too much load makes the body sink *below* the rest rather than rise. **So a self-release can only be a clock or a new rule, and neither is built, proposed or hidden.** Also measured: the leg's own pace needs **0.45–0.52 s** for the last 0.15 m, so **a 0.25 s press never arrives** and the footage's 0.25–0.7 s band is only half-reachable at the leg's current speed.

### THE RULINGS, AS THEY NOW STAND

| | ruling | state |
| --- | --- | --- |
| **A** | cap what the rider asks for | **already shipped and tighter** (`TURN_RADIUS = 4.5 m`, 0 off the plane); the switch is PR #389 |
| **B** | Compress as a dip, not a pose | **superseded by C** |
| **C** | keep the held Compress, both patterns are real | the dip is an **addition**; nothing taken away |
| **D** | keep the row | shipped by default; **its price was the wrong rider's — on theirs it is +0.050 s, not −0.700** |
| **E** | the dip fires on their input only | **already built** |

**Open and waiting on them:** the dip's self-release; **Crouch's value** (waits on their `?kneeRoom=achieved` ride, because tall sinks up to 0.27 m on its own); and **PRs #389 and #392**, both refused to the caller by the classifier.

## ⭐ STEP 3.5d (merged `d15ce9f5`, PR #394) — **THE ANSWER: THE BOARD ROLLS OUT FROM UNDER HIM BECAUSE HE IS TRYING TO STAND UP STRAIGHT**

`docs/research/new-rider/3.5/README.md` Part 1; reader `3.5/roll.ts`. **Every number is the owner's own rider and address** — `RIDER=new FELT=deck BODY=two` = `?rider=new&feltFrame=deck&riderBody=two` — at the folder's placement (AHEAD 0.75, SIDE −45, 9 s, stance held). **None is the plain `?rider=new`'s.** Instrument-only: **no byte under `src/` or `server/` changed.**

### THE TERM IS THE RIDER'S OWN ANKLE, BEFORE THE FALL

`bankLedger.deck`'s exact 23-way partition of the deck's roll acceleration, owner's face (`FACE=1.4,7.32,5.7`), 1–3 m/s, inside 25° of roll, 3 runs and 85–99 frames each:

| stance | ankle | second | third | net | Σ\|terms\| |
| --- | --- | --- | --- | --- | --- |
| tall | **−606 °/s², 45 %** | addedMass +219 (16 %) | pressure +125 (9 %) | −80 | 1 344 |
| crouch | **−1 008, 56 %** | leg +341 (19 %) | addedMass +179 (10 %) | −283 | 1 807 |
| compress | **−920, 53 %** | leg +284 (16 %) | addedMass +204 (12 %) | −202 | 1 728 |

**3.6–5.3× the net, same sign in 3 of 3 runs of every stance**, identical on both windows. First or second in every other readable cell: **52/52/54 %** planing at 4–6 m/s; **15 / 19 / 32 %** on the 4.650 s glide arm over **1 373–1 557 frames of 8 runs a stance** (the round's largest population).

**IT IS A CORRECTION ACTING AS A DRIVE, AND IN THIS PLANT THOSE ARE THE SAME FRAMES BY IDENTITY, NOT CORRELATION:** `mAnkle = −τ_ankle` and `dk_ankle = ankleDeck × (−τ_ankle)` with `ankleDeck` negative. Measured: the ankle's moment **opposes the body's lean in 54.8–92.9 %** of booked frames, its deck roll **carries the body further the way it is already leaning in 54.8–92.3 %** (the same frames wherever `ankleDeck` keeps its sign), and goes with the deck's own roll rate in **73.7–100 %**.

> **The board rolls out from under him because he is trying to stand up straight.**

### BEFORE THE FALL OR PART OF IT — BOTH, AND SEPARATING THE WINDOWS CHANGED THE ANSWER

**The drive is before the fall; the ANGLE is the capsize.** The roll rate hits 90 % of its peak while still inside 25° of roll in **13 of 18 runs**, and **47–80 %** of the swing (owner's face; 18–55 % on the Canyon-matched one) arrives after that, **with the net at 0.1–1.6 % of the traffic throughout — a coast at 84–341 °/s with nothing restoring it.** **In the capsize window the largest term is planing pressure (38–43 %), not the ankle.** **Read pooled over the whole window, `tall` would have been attributed to `pressure` (27.2 % against the ankle's 25.6 %)** — so the instruction to split the windows changed the answer in one stance of three. **This is 3.4l's lesson applying a second time.**

### ⚠️ MY LEADING CANDIDATE IS REFUTED

I briefed added mass and radiation as *"the strongest candidate on the board — start here."* **They are the second largest term and they OPPOSE the roll on the median of every arm and window: −5.4 to −43.4 N·m against the rider's +12.1 to +61.2**, and in the deck attribution `addedMass` sits **against** the ankle in 3 of 3 runs of every stance. **3.4n's 45–56 % was the SIDE FORCE in the owner's cell; it does not carry to the roll row.**

### TWO NEW CONSTANTS, AND AN OLD ONE CONFIRMED TWICE

- **The board's roll inertia is 0.02620 kg·m² = 2 186 °/s² per N·m** (`bodyInertia[8]`, which *is* `ẑᵀ R I Rᵀ ẑ` exactly). **The net it takes is 0.01–1.09 % of the largest term** — terms **92–1 000× larger cancelling** — and the 0.013–0.665 N·m that survives is 28–1 450 °/s². **The board is a hair trigger, measured.**
- **Frame 1 of the mount alone puts 12–26 % of the peak roll rate on** at the crawl (−28 °/s on f73, −58 on s16), with a first ankle torque of **−12.3…−45.0 N·m, 6–24× the planing arms' −1.4…−2.0**, stance-independent to a tenth of a degree per second. This is 3.4f's "pinned on its bound for the mount's first seven frames" **seen on the board's roll row.**
- **3.3h's static +33.47 / −33.40 does not hold dynamically, a second time:** the hull answers only **−6.4…−14.5 N·m** of the rider's +12.1…+61.2, and `|ankleOwn/ankleRel|` = **0.071–0.579**, i.e. **42–93 % of every ankle correction is cancelled by the deck rolling the other way.** 3.4i's series result, now in the ledger's own terms, per arm.

### 🔸 FREE RESULT, AND IT IS HUGE FOR THE OWNER: THE STICK IS INERT AT 1–3 m/s

Stick hard over against stick never touched, same face, entries 1–3 m/s: **67 767 column-values over 461 frames of 9 runs on `f73`, 0 mismatches; 371 frames of 9 runs on `s16`, 0 mismatches** — every column but the `steer` input itself. At 4–6 m/s the same pair is a **different ride** (543 vs 903 frames).

> **At the speeds where the owner falls, their input makes no difference whatever.** The stick-side twin of 3.5a's `askCap=9` control, on the shipped build. **This is their *"the compress is still too slow and barely turns now, if turn a bit falls immediately"* — measured.**

### A NEW, UNEXAMINED MECHANISM ON HIS OWN TEST SPOT

On the **Canyon-matched face (`FACE=1.4,16,5.7`) at 1–3 m/s the standing contact is infeasible from frame 1 in 9 of 9 runs** — median **10–11 of 16 substeps `apart`**, only **22 % of frames fully booked** — so the per-source attribution has **no contiguous window there at all**, and **no published figure of this track has ever been read on those substeps.** On the 12–42 frames a stance that are booked the ankle is in the three largest of every row and largest in compress's own in25 (−3 454, 33 %), **but 12–29 frames is too thin to rank terms and the round does not.**

### WHAT IT EXPLICITLY DID NOT CLAIM

**It did not say the ankle's gain is too high.** Nine rounds moved the ankle's range, bound and datum and changed nothing; step ten settled that no hull value saves it; 3.2y retired the benchmark. **"A loop whose correction is its own disturbance is not fixed by changing its gain"** — a smaller correction makes a smaller disturbance and the same ride.

**What it names is the PATH:** the correction leaves the body through **the one joint in series with a ≈100 N·m/rad hull on a 0.0262 kg·m² board**, while **`swing` — the joint that would act against the rider's own mass, paired and visible — carries 0.1–0.4 % of the traffic on every arm and stance.**

### CONTROLS

`dkClose` and `dkSplit` = **0.0e+0 on every frame of every arm** (the 23-way partition is exact). Independent reconstruction of the headline term, `ankleDeck × (−τ)`, reproduces `dk_ankle`'s median within **0.93–1.08**. The model-free trajectory control (`−rlTotal/I_board`) agrees in sign on **90.4–95.2 % of 145–161 frames**, ratio 0.66–1.11. **Reference arms reproduce exactly** — `f73-l` 18 of 18 at median 1.450 s, `s16-l` 1.033 s, `f73-g` 24 of 24 at 4.650 s, step 3.5c's own three. `tsc -b` clean.

### THE THREE FOLLOW-UPS, IN THE ROUND'S OWN ORDER

1. **Whether the correction may leave through the UPPER BODY instead** — a question about what the owner's surfer does with his shoulders, **so it is HIS to rule on.**
2. **The mount's first frame**, where `?mountAgree=deck` is still the only measured handle (**and was once wrongly sold to him as the switch that mattered**).
3. **The Canyon face's infeasible contact** above.

## �video QUEUE — THREE CLIPS THE OWNER SENT, NOT YET READ (reads paused for the machine, 2026-11-17)

The owner paused the video reads so their own ride would not be judging my CPU load. **These three are owed and must not be lost:**

| # | URL | scope |
| --- | --- | --- |
| 7 | `https://www.youtube.com/shorts/oCelSQ2iteU` | whole clip |
| 8 | `https://www.youtube.com/shorts/Th2TMrOUx1E` | whole clip |
| 9 | `https://www.youtube.com/watch?v=qUm3eO2EFBc` | **first 30 seconds only** |

**Both paused reads were killed early** — #7 had barely started; #8 reported *"Good quality where the tracker locked on; it lost him in 3 of 6"* and was about to add temporal continuity and widen the crop. **Nothing was published, so both start fresh.**

**Read them with the skill, and note what the skill now says that it did not when the first six were read:**
1. **The standing purpose is first in the file now** — *"study surf movements to improve the riding engine"* — after the owner corrected a brief of mine that had made the day's hot question (foam) item 1. **Read broadly, without a thesis. The engine's thinnest part is the movement BETWEEN positions**: transitions, what leads and follows, what the legs do while the upper body does something else, fore-aft weight, how moves start and end, and counts for anything repeated.
2. **One tab per read.** Two reads ran at once in a single shared pane tab and could have handed each other's frames over as data. **`tabs_create` first, pass the `tabId` on every call, report which tab, and discard any frame not provably from your own clip at the intended timestamp.**
3. **The stale-frame trap survives a 1 s wait** — a hidden pane freezes painting and a screenshot silently returns the previous frame. **Stamp `currentTime` and a frame counter into the canvas; take two screenshots per draw and read the second.**
4. **Above ~200 px the binding error is the hip landmark, not resolution** (waistband ≈0.60 of stature vs trochanter 0.53) → **±10–15 points on every hip figure.** Shoulder-to-waistband scale, cross-checked, **report disagreement rather than picking a winner.**

## 🔴 TWO ROUNDS WERE IN FLIGHT WHEN THIS WAS WRITTEN (2026-11-17) — restart them if the session ended

The owner asked whether to quit the Claude app to free the machine. **Quitting kills these two.** Neither had published anything, so **both start fresh.**

### 1. The foam question — came from the owner's own ride, and is the newest lead

Their words after riding `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two`:

> *"there seems to be a balance improvement. Very similar to the pre refactor old surfer on the turning motion and the position. But still cannot surf, now the board slips underneath the surfer which we are aware, **this happen on turns and on tip of the wave foam that creates instability**"*

**"The board slips underneath the surfer" is step 3.5d's finding, felt from the ride** — that half is settled. **The question is the foam, which nobody has ever measured.**

**The brief, in order:** (1) **establish what the foam IS to the board** — does the solver give foamed water a different height, slope, velocity, density or drag, **or is the foam drawn only, with the board feeling nothing? Answer that first and cite the code, because it decides the round** — if draw-only, the owner's felt instability at the foam cannot be the foam's physics, and **that is itself the finding**; (2) if it reaches the board, measure its share in 3.5d's own exact 23-way partition (`3.5/roll.ts`, `dkClose`/`dkSplit` = 0.0e+0 on every frame), **separating foamed ticks from clean ones**; (3) if it does not, find what else differs where they feel it — a steeper or more curved surface near the tip, larger velocity shear, **or the board losing contact** (3.5d: on the Canyon-matched face at 1–3 m/s the standing contact is **infeasible from frame 1 in 9 of 9 runs**, median 10–11 of 16 substeps `apart`, only 22 % of frames fully booked, **and no published figure of this track has ever been read on those substeps**); (4) the owner says it happens **"on turns AND on the tip of the wave foam"** — **say whether those are one mechanism or two, with numbers, or that you cannot tell.**

**Why it is live rather than a guess:** the board's roll inertia is **0.02620 kg·m² = 2 186 °/s² per N·m**, and the net torque that turns it is **0.01–1.09 % of the largest term** — forces 92–1 000× larger cancelling. **On a balance that fine a foam patch under one rail could dominate.** Video 6 also caught a rider **bracing against foam**, logged with **"no game name"**.

### 2. The PR #392 rebase — the merge the owner authorised

**`main` is at the squash-merge of PR #389 (`660cc94e` and later).** **PR #392** (branch `claude/35b-fourth-row`) carries steps **3.5b** (the `STANCE_TUCK` row + the fourth gain knot + `?deepen=on`) and **3.5c** (which makes the row the **default** and adds `?stanceDeep=off`). A squash of it onto the new `main` **conflicts in nine files, seven of them source**: `PhysicalMode.ts`, `PhysicalMode.test.ts`, `main.ts`, `AttachedRider.ts`, `RideSession.ts`, `SurfZoneRunner.ts`, `SurfZoneSimulation.ts`, plus `3.3/plant.ts` and `3.5/README.md`.

**The conflicts are mechanical and of one kind — both branches add a dev switch, so both edit the same switch lists** (the import and assertions in `PhysicalMode.test.ts`, the comment line and `undefined`-pins list in `main.ts`, the passthrough in `SurfZoneRunner.ts`, the options plumbing elsewhere). **Both switches must survive: `?askCap` from main and `?stanceDeep`/`?deepen` from the branch — verify by reading.** `AttachedRider.ts` is the careful one: #389 refactored `prepareBank`'s `most`/`asked`/`own` around new `askRadius`/`askUngated` fields while #392 touched stance and plant plumbing. **Keep both behaviours; if a conflict cannot be resolved without choosing between them, stop and report.**

**`3.5/README.md` on `main` now holds TWO concatenated documents** (3.5d's, then 3.5a's, with a note at the join). **Append 3.5b and 3.5c rather than replacing anything.**

**Re-verify on the REBASED tree, because the earlier runs were on a different base:** the three reference arms must still read `f73-l` **18 of 18, 0.617–2.533 s, median 1.450 s**, `s16-l` **1.033 s**, `f73-g` **24 of 24, 4.650 s**; **`?stanceDeep=off` must reproduce the old plant** (3.5c had it byte-identical over 54 runs × 359 columns, 0 mismatches); **the two switches must not interact**; and the **Canyon pair must still be `a367d938f15fa934` / `9e5831f80e38abd9` at 3 600 steps with a fresh spin-up**. Suites `--maxWorkers=1`. **Report every deletion file by file.**

## STEP 3.5e (merged `9e6de1b8`, PR #395) — THE FOAM IS A PASSENGER, NOT A CAUSE — AND IT CORRECTS TWO THINGS 3.5d AND I TOLD THE OWNER

`docs/research/new-rider/3.5/README.md` Part 2; probe `3.5/foam.ts`, reader `3.5/foamread.ts`. **Read-only, no `src/` byte changed.** All figures `RIDER=new FELT=deck BODY=two` — the owner's own address — on the **real Canyon sea as `?canyonWaves=true` builds it** (`canyonBed: 'b'`), CPU, 1/60 s, stance held, stick untouched. **1 026 riders.**

### ⚠️ CORRECTION 1 — 3.5d MEASURED ON WATER WITH NO FOAM AT ALL, BY CONSTRUCTION

3.5d ran on `FaceWater`, which writes **`breaking: 0, voidFraction: 0`** and no roller lens on every sample — **the caller verified this directly at `src/physics/testing/FaceWater.ts:81`.** 3.5d's own dumps agree: **`dk_froth` and `rlFroth` are 0 on all 9 641 frames of all five arms.** So its celebrated partition was taken on foam-free synthetic water.

**The headline SURVIVES where the owner rides**, which is why this is a correction and not a retraction: on **foamed** ticks of the real Canyon the ankle still leads in all three stances at **34 % / 37 % / 42 %** (1 077 / 933 / 1 038 frames of 33 / 31 / 33 runs), and on the **practice swell — the owner's own default — where no roller lens ever reaches the hull (0 of 11 879 live frames)** it leads at **36 % / 47 % / 46 %** (1 078 / 1 019 / 961 frames, 18 runs each). **Three waters, one leader.**

### ⚠️ CORRECTION 2 — "HIS FEET ARE NOT IN CONTACT ON YOUR OWN CANYON FACE, 9 OF 9 RUNS" WAS THE SYNTHETIC 16° PLANE, NOT CANYON

I told the owner that as a fact about their spot. **On the real Canyon `apartSub`'s median is 0 of 16 at every placement.** s16's 10–11 of 16 was the **synthetic 16° plane's**, because the real face under the board is **0.86–5.41°** across the heading, not 16°. **The twenty-fifth number in the wrong frame, and the third today that reached the owner.**

**But the substeps were then read for the first time in this track, and the answer inverts the worry:** on fully booked frames the board's net roll moment is **0.12–0.18 % of its largest term** (3.5d's hair trigger reproduces on real water); on a frame holding an `apart` substep it is **1.5 / 10.2 / 31.2 %** (228 / 310 / 243 frames of 30 / 47 / 30 runs). **An infeasible contact is where the board is LEAST balanced — not a hole in the instrument.**

### ⚠️ CORRECTION 3 — THE PARTITION'S LEADER DEPENDS ON THE WATER, NOT ONLY THE RIDER

**On CLEAN ticks of the same real sea the leader is `addedMass` at 36–46 %, with the ankle second.** **This is a caution on every published share in this folder.** The ankle leads on foamed ticks and on the practice swell; it does not lead everywhere.

### THE FOAM DOES REACH THE BOARD — five channels, none of them in 3.5d's instrument

**(1) the hull's density** — `ρ(1−α)` multiplies hydrostatic support, planing pressure, submerged drag, rail suction *and its cap*, and skin friction, so a patch of air gives exactly `(1−α)` of clean water's force (`hullForces.ts:319`); **(2) the roller lens's froth drag**, with its own roll torque and ledger row (**Canyon only**); **(3) the lens's carried flow**; **(4) the lens's own height — the surface a body feels IS the lens's top** (`PhysicalSurfWater.ts:359`); **(5) the plate's added mass and the planing hollow.**

**Not reaching the board:** the drawn whitewater (`FoamField` is read by no body — physics only *writes* spray sheets), the plume's turbulence (fall body only), and the plume's effect on height or flow (never written back to the solver). **Lens α reaches 0.9; a plume is capped at 0.2.** At the hull (1 980 corridor frames): **α 0.49 at 0.02 m of draft, 0.17 at 0.05, 0.12 at 0.10**; lens 0.096 m thick, grip 27 Pa, dα/dy **4.88 per metre**.

### BUT ITS SHARE IS SMALL, AND OVER A RIDE IT CHANGES NOTHING

At the one frame where the A/B is exact, hull inside a lens, **32 cells a stance**: removing the **air** moves the deck's roll acceleration by a median **1.46 / 1.69 / 1.69 %** of Σ|terms| (roll rate 6.6/6.3/6.3 %, max cells 53–56 %); the **froth drag** by **0.42 / 0.38 / 0.38 %**; the **carried flow** by **0.12 %**. The froth row itself: `dk_froth` **median 0, p90 3.80 °/s², max 423.**

**Over a whole ride:** at the foam the fall is **0.917 s as it ships**, against **0.958 / 0.983 / 0.900 s** with the air / froth / carry removed; 8 m seaward, **1.433 / 1.425 / 1.433 / 1.433 s.** Peak rail and rate move 0–13 % with **no arm consistently better.**

### WHAT THE FOAM ACTUALLY ADDS — traffic, not a mechanism

**Σ|terms| 157–228 on foamed ticks against 37–79 clean (2.0–6.2×)**, and the ankle's own term **−66 to −79 °/s² against +8.4 to +21.6.** So the foam makes the same loop work harder.

**And the across-rail air asymmetry is made by the HEEL, not the field:** the corridor's horizontal gradient is **≤0.057 over a beam anywhere**, while under the board it goes **0.024 → 0.056 → 0.093 → 0.111 → 0.219** at 0–5 / 5–10 / 10–20 / 20–45 / 45–90° of rail (1 929 / 624 / 738 / 779 / 410 frames). **It follows the roll.** The asymmetry is a consequence of banking, not a cause of it.

**My hypothesis is refuted as a cause** — and **added mass again**, which opposes the rider's residual on **11 of 12 cells.**

### WHAT IT COULD NOT DO, STATED PLAINLY

**Channel 4 — the lens's own height — cannot be removed by a wrapper** (it is made inside `heightAt`, not on the sample), **and it is where the remaining signal is**: at the foam the surface under the board moves at **0.356 m/s** against 0.043 at the control, the hull is **entirely clear of the water on 3.5 %** of live frames, and only **61.6 %** of frames are fully booked against 88.7 %.

**And a confound it could not remove: the foam toe sits on a face six times steeper across the heading (5.41° vs 0.86°)**, so the earlier fall at the foam is **not** attributed to the foam — *"the only safe statement from it is the negative one."* A matched-steepness read, **offered as an indication only**, has the foamed runs peaking at **1.4–2.2×** the clean roll rate in three of four tilt bands.

### Controls

`dkClose`/`dkSplit` = 0 on all **59 228** rows. The null channels are **exactly 0.000000 °/s** on all 72 cells with no lens. **Reference arms on the base:** `f73-l` 18 of 18, 0.617–2.533 s, median **1.450 s**; `s16-l` **1.033 s**. **`main` moved twice mid-round and the round MEASURED the move rather than assuming it:** the water is byte-identical, the `tall` arm identical on all 3 799 rows, and `crouch`/`compress` diverge **no earlier than frame 37** (PR #392's stance work) — **so both ride arms were re-run on `0daeb64c`** and every table is that run's.

> **For the owner, in the round's own words:** *"the foam is not what is throwing you off — it is the same ankle that throws you off in a turn, working harder because the water at the foam is steeper, moving and sometimes not under the board at all."*

## ⭐ VIDEO REFERENCE 7 (merged `8ae99367`, PR #396) — **THE GAME HAS ONE NUMBER FOR THE BODY WHERE THE FOOTAGE HAS AT LEAST THREE**, AND OUR "CROUCHES" MAY HAVE BEEN TRUNK FOLDS

`docs/research/new-rider/3.5/video-ref-7-ripcurl-tube-and-trim.md`. One ride, one rider, **one continuous shot**, regular-footed and frontside, back to camera. **Read on a 1080×1920 stream with the rider ≈620 px tall — by far the best resolution of the series.** Read without a thesis, on the owner's correction.

**The clip is a tube and then nine seconds of trim, with ZERO direction changes in thirteen seconds** — no bottom turn, carve, cutback, snap, pump, floater, air or take-off, and she is **invisible inside the barrel for 2.95 s.** So it is almost entirely the "unglamorous" material, which is where the read went.

### ⚠️ THE FINDING THAT RE-READS THE WHOLE SERIES: "CROUCH" HAS BEEN READ TOO GENEROUSLY

**Three of this clip's four lows LOOK like crouches and measure 75–85 % — the low edge of Tall. The depth is in the TRUNK, not the legs.** Clip 6 brushed this (its L1 read 65–75 %); **with 3× the pixels it is unmistakable.**

> **So some of the series' middle-band numbers may be measuring a folded trunk over long legs.** Every hip percentage in the six earlier reads is now suspect in that specific way — **not wrong, but possibly measuring the wrong joint.**

**And the conclusion that follows is the most actionable thing the videos have produced:**

> **The game has ONE number for the body (leg depth) where the footage has at least THREE independent ones — leg depth, trunk fold, arm carriage — plus the fore-aft hip axis.** The round would act on **row 2 first: legs extended while the trunk stays folded.**

### THE TRANSITIONS — going down and coming up are NOT mirror images

- **Out of the tuck (3.80 → 5.40 s): the legs lead the trunk by about half a second.** The hips rise 3.85–4.70 while the trunk stays folded near horizontal, then she spends **~0.5 s standing on near-extended legs with the trunk still folded 50–60°**, and **the head comes up last.**
- **Down into a crouch (11.50 → 12.40 s): knees and trunk move together within 0.3 s.**
- The one complete cycle watchable end-to-end (5.85–6.70) is **symmetric** — so **the asymmetry may belong to recovering from a tuck, not to crouching generally.** Stated as a limit, not a law.
- **The arms run on their own clock: 120° of shoulder in 0.36 s with the legs and trunk unchanged.**
- **Fore-aft is worked by the HIPS, not the feet:** hips travel aft toward the rear foot while the shoulders go forward over the front foot, both feet planted — **0 steps in 13 s, rear foot never off the pad.** This **confirms Kirra's fore-aft "not at all" gap on a second rider and locates it in the hips.**

### MORE DISAGREEMENTS

- **"Deep ⇒ arms spread" now joins "tall ⇒ arms spread" as refuted.** Four arm carriages inside the Tall band in one clip, and **the narrowest, lowest arms at the single deepest leg position. Arm height and leg depth are independent channels.**
- **The top of the resting band is higher than we had it:** this rider reaches **90–100 % (essentially straight legs) for ~1.7 s** — above the 75–95 % all six clips reported, and **~10 points above the game's Tall ceiling (89 %).**
- **It cannot add to the 8-of-9 turn tally, because there are no turns.** *Worth recording that a ride can contain none.*
- **Agrees** with clips 1–4 on deep-moment depth (35–50 %) and with clip 6 that depth tracks how hard the manoeuvre loads the legs.
- **Seven clips, still no rider sustaining the shipped Crouch rung (66 %).**

### HONESTY NOTES TO CARRY

- **The hold-vs-spike question cannot be answered from this clip, structurally.** Its 0.45 s low at 35–50 % is a **LOWER BOUND, not a spike** — the 2.95 s immediately before it is inside the barrel, **exactly where a tube tuck would be held. Do not let it be quoted as a 0.45 s spike.**
- **Resolution finding worth reusing: the pane serves 360×640 until you enlarge the viewport AND RELOAD — then 1080×1920.** Enlarging alone did nothing. All depth figures were re-measured on the 1080 stream.
- **No knee angles reported, deliberately** — two scaling methods disagreed by **30 %** on the same frame.
- **Every hip figure carries ±15 points:** a one-piece suit with short legs hides the trochanter and the gluteal fold, so the scale had to be calibrated inside the clip.
- **Slow motion: not measured, but 3–4× excluded** by a 0.36 s / ~120° arm drop; reads at or near real time, no duplicated frames.
- **The rider is NOT named.** The "stephanie gilmore highlights" text beside the player is YouTube's search suggestion, not an identification.
- **The stale-frame trap fired FOUR times and the canvas stamp caught every one.** A `wait 0.55 s` between draw and screenshot made single screenshots reliable. **The one-tab rule worked:** `tab-1` created and passed on every call; the pre-existing `seed` tab also holds the URL because the first `navigate` opened the pane before `tab-1` existed, but **no measurement came from it.**

## ⭐ VIDEO REFERENCE 8 (merged `22004a4d`, PR #397) — **THE TRUNK IS THE LOUD CHANNEL AND THE LEGS ARE THE QUIET ONE**, and the game has one leg spring where a rider has two

`docs/research/new-rider/3.5/video-ref-8-malibu-montage.md`. 15.221 s, uploader **@hunterjoness**, **1080×1920 at 60 fps** (video 7's viewport-then-reload step works and is what got it — the pane served 720×1280 before). Rider 96–616 px, typically 250–400. `tabId` **`tab-1`**, passed on every call. **It is a MONTAGE — at least eight shots, at least three boards, so these are figures about *surfers*, not *a* surfer**; two cuts proven at 1/60 s and one suspected cut **refuted** the same way.

### THE FINDING, and it reproduces video 7 on a different rider, break and camera

**In ALL SIX frames where the leg chain is readable the legs sit at 76–99 % of their own straight length — the Tall band, every one. Over the same frames the trunk swings from ~20° to ~76° from vertical.** **One channel moves 23 points; the other 60 degrees.**

| t | leg depth | trunk fold | arm carriage |
| --- | --- | --- | --- |
| 14.30 | **99 %** — top of Tall | ~31° | **rear arm above the head** |
| 14.70 | **95 %** — Tall | **~76°, near horizontal** | **both hands hanging at the deck** |

> **t = 14.70 looks like the deepest crouch in the clip. It is a Tall stance wearing a crouch's silhouette.**

Counts: Tall-band frames **6**, Compress-band **0**, below 55 % **0**, **at the shipped Crouch depth (66 %) 0.** **Eight clips, still no rider there** — and the one near-66 % reading is low-confidence and **contradicted 0.2 s later by 88 % / 76 % on the same rider in the same turn.**

### TWO THINGS NO EARLIER READ HAS

1. **The rear arm goes overhead BEFORE the legs extend — 3 of the 4 resolvable direction changes (5.20, 9.45, 13.20) — and stays up through the manoeuvre.** Videos 6 and 7 showed arm carriage is *independent*; **this one TIMES it.** The arm is not decoration following the body; it leads.
2. **The two legs sit at different extensions in the same frame: 97 % / 86 % (14.40) and 88 % / 76 % (13.30). The game has ONE leg spring.**

### THE TRANSITIONS

- **T1, unfold in trim (~1.0 s): the legs finish before the trunk starts** — ~0.3 s of long legs under a 40–60° trunk. **Same order as video 7's T1.**
- **T2, fold-down (~0.3 s): TRUNK ONLY** — 35° → 76° while the leg goes 97 % → 95 %.
- **T3, the turn (~1.4 s) in four beats:** entry 0.15 s (**the rear leg extends back first**) → load 0.30 s (lead arm reaches forward-down past the rail) → **peak 0.20 s, where the first thing to rise is the REAR ARM, not a hip** → exit 0.25 s (lead arm thrown forward and down across the body). Then a carve alternating compress–extend–compress–extend in 0.5 s.
- **T5, pumping: ~4 trunk fold/unfold half-cycles in 2.9 s of trim with NO direction change** — and **the leg chain measured at 99 % mid-fold.** Pumping here is a trunk movement over straight legs.
- **T6, fore-aft:** shoulders forward over the front foot, hips back, feet planted — **three separate shots. The fore-aft gap is now confirmed a third time** (Kirra, video 7, this).

### ⚠️ TIMING — AND IT SHOULD WORRY US ABOUT THE ENGINE

60 fps, every frame distinct (31 samples at 1/120 s fell into 15 groups of exactly 2), so **slow motion is excluded; at or near real time.**

> **A complete bottom-turn → climb → top-turn runs 1.00 s, against the literature's 0.96 ± 0.04 s for a bottom turn ALONE. The snap runs 0.35 s.**

**This is the first time the series has timed a turn against a published one.** It also means **Kirra's unverified 3–4× is not a property of surf clips generally** — that clip was slowed, these are not.

### DISAGREEMENTS

- **DISAGREES with video 7 on the down-transition** — **trunk-only here, knees-and-trunk there.** Both single observations, so the reading is that **the down-transition is not one fixed thing**, not that either is wrong.
- **AGREES with video 7 against the first six** that the resting stance reaches **90–100 %**, above the game's Tall ceiling (89 %). **Two clips now.**

### METHOD — IT OVERRODE MY SKILL AND WAS RIGHT, so the skill now says its way

**It abandoned the shoulder-to-waistband scale and said why:** a full black wetsuit has no waistband, and the trunk scale **over-read the leg by ~50 % on the same frame.** It used **`|hip→ankle| ÷ (|hip→knee| + |knee→ankle|)`** instead — **no stature estimate needed, maps straight onto the game's leg spring, and it is an upper bound** (an unseen knee reads 100 %). **Both the method and its limit are now in the skill.**

**Also now in the skill:** a **consent gate stands in front of YouTube** (`Reject all` — the privacy-preserving option — is required **before any `<video>` exists**); the pane can return a **partially drawn canvas**, which is a **different failure from the stale frame and the timestamp stamp cannot catch it** (the stamp is right, the picture is incomplete — fix with a 2.2–2.5 s wait or a second screenshot); and the two tools without which no leg in this clip was readable — a **black-wetsuit auto-crop** (found the rider in **128 of 140** frames) and a **silhouette edge outline**.

**Declined honestly:** the two deepest-looking moments are **unmeasurable** — the board hides the feet in any loaded turn and the snap takes the trunk out of plane. **Structural, not a resolution problem.** And the page text naming a long-form video is reported as **adjacent page text, not an identification.**

### THE "NOT AT ALL" ROWS

Pumping with the trunk over straight legs; a crouch made of 76° of fold over a 95 % leg; **the arm leading a manoeuvre in time**; **the two legs at different depths**; the lead-arm reach through the load; the lead arm thrown across the body at the top.

> **Four of the six are one gap seen from different sides: the game has ONE number for the body where this footage has at least FOUR — leg depth, trunk fold, arm carriage, and arm TIMING.**

### VIDEO QUEUE, updated 2026-11-17 — the owner asked for **one video at a time**

| # | URL | scope | state |
| --- | --- | --- | --- |
| 7 | `https://www.youtube.com/shorts/oCelSQ2iteU` | whole | **DONE** — merged `8ae99367` |
| 8 | `https://www.youtube.com/shorts/Th2TMrOUx1E` | whole | **DONE** — merged `22004a4d` |
| 9 | `https://www.youtube.com/watch?v=qUm3eO2EFBc` | **first 30 s only** | reading |
| 10 | `https://www.youtube.com/watch?v=oRL0q5rDZWc` | **15 s → 55 s only** | queued |

**One at a time is the owner's instruction**, and it also keeps two reads out of one browser tab, which nearly corrupted a read earlier today.

**⭐ The owner's note on video 10 (`oRL0q5rDZWc`, 15–55 s), in their words: *"this video is similar to canyon spitting waves, also a good example"*.**

**Why this raises its value above the others:** Canyon with `?canyonWaves=true` is **the spot they actually ride and judge on** ([[rider-test-spot-canyon-b]]), so a clip on water of that kind makes its **movement** more directly transferable than a clip from a reef or a point break. **It does NOT mean read the wave** — the standing instruction to ignore the wave holds, and they confirmed it today when they corrected a brief of mine for making foam its item 1. **What it means is that whatever the rider does there is the closest thing we have to "what a surfer does on the owner's own wave."**

**So when video 10 is read, say for each movement whether it is one the owner's Canyon rider could even attempt**, given what the engine has: one body number (leg depth) against the footage's four (leg depth, trunk fold, arm carriage, arm timing), no fore-aft hip axis, and — measured today — **a stick that is inert below 4 m/s** and **an ankle correction that is itself what rolls the board.** That mapping is the point of the read.

**Queue, updated again 2026-11-17 — video 11 added:**

| # | URL | scope | state |
| --- | --- | --- | --- |
| 9 | `https://www.youtube.com/watch?v=qUm3eO2EFBc` | **first 30 s only** | reading |
| 10 | `https://www.youtube.com/watch?v=oRL0q5rDZWc` | **15 s → 55 s only** | queued — **the owner says its waves are like Canyon's**, so it gets the extra job of saying, per movement, whether their Canyon rider could even attempt it |
| 11 | `https://www.youtube.com/shorts/Ew5j1uqExVA` | whole (no scope given) | queued |

**One at a time**, on the owner's instruction — which also keeps two reads out of one browser tab, a collision that nearly corrupted a read earlier today.

**Queue, 2026-11-17 — video 12 added:**

| # | URL | scope | state |
| --- | --- | --- | --- |
| 9 | `https://www.youtube.com/watch?v=qUm3eO2EFBc` | **first 30 s only** | reading |
| 10 | `https://www.youtube.com/watch?v=oRL0q5rDZWc` | **15 s → 55 s only** | queued — **the owner says its waves are like Canyon's**; it gets the extra job of saying, per movement, whether their Canyon rider could even attempt it |
| 11 | `https://www.youtube.com/shorts/Ew5j1uqExVA` | whole | queued |
| 12 | `https://www.youtube.com/shorts/HhJo76wwkZc` | whole | queued |

**One at a time**, on the owner's instruction. **Four clips in the queue is now the most material this track has ever had waiting**, and the reads have got slower as they got better (video 8 took ~33 min for a 15 s clip, because the 1080p step, the auto-crop and the silhouette outline are what make a leg readable at all). **That is the right trade — six low-resolution reads produced an impression; two high-resolution ones produced the four-channel finding.**

**Queue, 2026-11-17 — video 13 added. FIVE waiting.**

| # | URL | scope |
| --- | --- | --- |
| 9 | `https://www.youtube.com/watch?v=qUm3eO2EFBc` | **first 30 s only** — reading |
| 10 | `https://www.youtube.com/watch?v=oRL0q5rDZWc` | **15 s → 55 s only** — **owner: its waves are like Canyon's**, so it also says per movement whether their Canyon rider could attempt it |
| 11 | `https://www.youtube.com/shorts/Ew5j1uqExVA` | whole |
| 12 | `https://www.youtube.com/shorts/HhJo76wwkZc` | whole |
| 13 | `https://www.youtube.com/shorts/9k-MU6Q5Lhc` | whole |

**The owner is sending clips faster than the reads complete** (~30 min each at the quality that produced the four-channel finding). They were offered a shallower, faster pass — four channels only, no transitions, roughly a third of the work — and **the default stays thorough until they say otherwise.** Do not silently speed up: the six low-resolution reads produced an impression, and the two high-resolution ones produced the finding the engine work now rests on.

## ⭐⭐ BODY-CHANNEL SURVEY (merged `7dc807c0`, PR #398) — THE FOUR-CHANNEL CLAIM IS WRONG IN BOTH DIRECTIONS, AND THAT IS THE GOOD NEWS

`docs/research/new-rider/3.5/body-channels.md`. **Read-only code survey; nothing measured, every number a code reading with three inferences marked `[I]`.** Surveyed `main` at `e8e5ef1e`.

> **"The game has ONE number for the body where the footage has at least FOUR" does not survive the code. The game holds SIX quantities answering to the five channels, and almost none is independently driven. So the footage's four channels are THREE DISCONNECTIONS AND ONE GENUINE ABSENCE — not four missing features.** Those cost completely different things to fix, which was the round's whole point.

| # | channel | exists? | independent or slaved? | player reach? | physics or drawing? | **fix** |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **leg depth** | yes — `leg.rest`/`leg.extension`, **one scalar for BOTH legs** (`AttachedRider.ts:2084`) | it **is** the independent variable | yes | **physics, fully** — a real spring, row 6 of the board's solve, key to four inertia tables | — |
| 2 | **trunk fold** | **three different things, none of them one fold.** Shipped rider: **none at all.** `?rider=new`: `StandingBody.hip.angle`. Drawing: `HumanoidRig.hingeAngle` | **drawing: SLAVED by a one-line formula.** `?rider=new`: angle independent, **range** slaved to `hipRange(depth)` | **no** | **split** — the new rider's hip is a **paired, booked torque**, but **the mass model never folds** | **geometry** for the cheap fix; force only if the player commands it |
| 3 | **arm carriage** | yes, **one scalar** — `HumanBalance.arms` 0–1, `?rider=new` only. **No height, no spread, no left/right** | **SLAVED TWICE** — capped by `stanceRoom(depth).arms`, and triggered by **the same expression that drops the knees** | on/off only | **physics, but as INERTIA only** (swing 6→10 kg·m², yaw +0.85, twist +0.87). **Where the arms ARE reaches nothing** | **geometry** for position; the inertia path is already honest |
| 4 | **arm timing** | **NO — and the sign is BACKWARDS** | simultaneous by construction | no | n/a | **sequencing** — two existing time constants |
| 5 | **fore-aft hip axis** | yes, but a **rigid translation** of pelvis, torso, head **and both arms together** | independent (W/S is its own axis) | **yes**, W/S | physics | **force**, and **downstream of channel 2** |

**One leg spring, not two.** Video 8's **97 % / 86 %** and **88 % / 76 %** splits **are not expressible.** The *drawing* already has two legs (separate `kneeFront`/`kneeRear` targets); **the physics has one rest length, one stiffness, one solve row.** A second spring is a **force** change → **the owner's ruling.**

### THE THREE FINDINGS FOR THE OWNER

**1. The drawn trunk fold IS the drawn leg depth, explicitly — and the caller verified the line.** `HumanoidRig.ts:1383–1385`: **`wanted = ((tall + (deep − tall) × depth) × π)/180`**, with `depth = (STANDING_PELVIS − pelvisOverDeck)/CROUCH_DEPTH` (`stanceBlend.ts:75`) — **the pelvis's height and nothing else.** The only second input is which of thirteen key poses is active. **At the backside bottom turn the drawn trunk cannot move with depth at all (30 → 30°)**; at trim frontside, **video 8's 23 points of leg buy about 8° against the footage's 60°.** **That is a mechanism for "every stance reads as a pose" — the round did NOT prove it is the cause and says so.**

**2. `?rider=new` ALREADY HAS AN HONEST TRUNK ROTOR THAT THE MASS MODEL CANNOT SEE — and this is the cheap end.** `StandingBody.hip` (**8 kg·m², 200 N·m**) is driven **independently of depth**, by the ankle loop's excess past 80 % of the feet's reach, **on its own delay and lag** — i.e. **the second clock video 7 says a body must have.** Its torque is **paired** (`rhs[8]`, `rhs[3..5]`) and its power is **booked**. **But `hip.angle` is read in only three places and never moves `this.parts`** — so the CoM, `bodyInertiaAt`, `riderYawInertia` and `stanceAt().height` are **all computed from an UNFOLDED trunk while a 23 kg torso and a 5 kg head swing through 60°.**

> **Rotating the parts with it is GEOMETRY, not force** — it states where the mass already is, for a torque already paired. **By the round's reading it needs no ruling.**

**3. The arms and knees share ONE trigger, and the knees are THREE TIMES faster — caller verified.** `humanBalance.ts:423–431`: both driven by **`Math.max(hip, capture)`**; knees drop at **`MOTOR_LAG` = 0.05 s**, arms spread at **`ARMS_TIME` = 0.15 s**, knees return at 0.6 s. **The footage has the arm overhead FIRST and HELD in 3 of 4 readable direction changes.** **The one orderable pair in the game runs the wrong way round — a pure sequencing change.**

### THE NARROWER, MORE USEFUL VERSION OF THE CLAIM

**On what the owner actually rides there is no trunk-fold quantity at all.** `StandingBody` is gated behind `freeBody = newRider && upright && standing` (`AttachedRider.ts:2610`) — the `?rider=new` opt-in. **The shipped physics body is seven point masses in one hard-coded posture, moved by exactly one scalar vertical shift (leg extension) and one rigid horizontal translation of five of the seven parts (`shifts()` excludes only the legs). NO PART IS EVER ROTATED ABOUT ANOTHER.** So the claim's strongest form is right **for the default rider**, which is narrower and more useful than what was being quoted.

### WHAT THE GAME ALREADY GETS RIGHT

**The feet.** Fixed at 0.30 m from the tail and +0.63 m, **never moved while standing — zero steps by construction**, which matches video 7's **0 steps in 13 s and the rear foot never off the pad.**

### THREE THINGS NOT TO CONFUSE WITH CHANNEL 2

**`?agile=on`'s trunk** is a genuinely paired pitch rotor whose reaction splits the two feet's loads — but it is **±10°** (the file records that 20° *"threw every rider"*) and runs **only inside a Snap stamp**. **The lateral `swing` (±1.2 rad) is NOT this channel** — it is trunk **roll**, drawn at only **0.35** of its angle, and cannot make video 8's silhouette. And **`kneeStrength = 2·KNEE_TORQUE/d` is a FORCE, not a depth limit.**

### FRAMES NAMED, since this track has mis-framed twenty-five numbers

**Pelvis 0.78 m is a placed part height**; **`STANCE_TABLE`'s 0.84 / 0.65 / 0.55 are whole-body CoM above the feet**; **`leg.rest`'s 0 / 0.195 / 0.30 / 0.45 are a spring rest-length shortening.** Using `stance-frame.md` §3's conversion: the game's Tall is **89 %** of its own straight leg, Crouch **66 %**, Compress **55 %**, tuck **38 %** — so against video 8's **6 of 6 frames between 76 % and 99 %**, **only the game's Tall rung is inside that clip's band, and every other rung sits below every readable frame in it.**

### WHAT IT DID NOT ESTABLISH

**The stage reader was not traced**, so the drawing's independence claim is **bounded to within one stage** — across-stage independence is unmeasured. **The multiplayer wire was not checked** (several channels are local-only, so another player's drawn body reads fewer channels than your own). `predictiveBalance`'s internal plant was not read beyond the stance tables.

## ⭐ VIDEO REFERENCE 9 (merged `5b5ce495`, PR #399) — **EITHER CHANNEL CAN CARRY A WHOLE POSTURE CHANGE ALONE**, and the leg-chain metric is SATURATED

`docs/research/new-rider/3.5/video-ref-9-ponta-preta.md`. First 30 s of a long-form clip, **Ponta Preta, Sal** — a long right-hand point. **TWO riders in THREE shots:** 0.00–12.15 rider A, **12.15–21.45 rider B (bare chest — the best hip landmark the series has had)**, 21.45–30.00 rider A again; cuts located to ±0.05 s by wardrobe. Both regular-footed and frontside. `tabId` **`tab-1`**.

**The movement is busy and chained: ≥13 direction changes in 30 s, one every ~2.3 s**, with the riders driving down the line **folded almost in half over straight legs** for ~0.4 s at a time. **This DISAGREES flatly with video 7's zero direction changes in 13 s.**

### ⭐ THE HEADLINE — it refines videos 7 and 8 rather than repeating them

Videos 7 and 8 said **the trunk is the loud channel.** **Rider A here agrees** (50–60° of trunk over a 96 % leg chain). **Rider B shows the OPPOSITE nine seconds later: +59 % of hip with the trunk motionless.**

> **Each channel is observed carrying a whole posture change ALONE, in one clip. They are not one dominant channel and one quiet one — they are genuinely independent, and either can do the work by itself.**

### ⚠️ AND IT UNDERMINES A FINDING I REPORTED FROM CLIPS 7 AND 8 — with a mechanism

**The leg chain is SATURATED in broadside footage, not merely an upper bound.** A surfer's knee bends **along the board**; the board lies **across the image**; the bend projects onto the hip–ankle line and largely disappears. Video 9's leg chain read **96–100 % on every frame — including a rider folded over his own board** — while a vertical ruler (hip ÷ head-length) read **~30–66 %** on the same frames. **The two disagree by ~30 points, and the round refused to reconcile them or name a rung for any frame.**

> **So "every rider stays in the Tall band" is UNTESTED wherever it rests on a leg chain in broadside footage — clips 7, 8 and 9.** **I reported that as a finding; it is weaker than I said.**

**Not a reason to return to the waistband scale** (it fails on wetsuits and over-read the leg by 50 %). **The robust ruler needs no hip landmark at all: apparent stature in head-lengths — 4.86–6.24 = 63–81 % of standing, moving 17 points in 0.27 s.** **And the actionable ask: footage shot from the water or down the line, not from the beach**, because the projection is what hides the knee.

### ARM TIMING — CONFIRMED AT FRAME LEVEL, third clip

Rider B at 1/30 s: rear arm **above the shoulder 18.034**, **above the head 18.067**, **rail bites 18.100**, **spray 18.134** — **the arm leads by 0.07–0.10 s and stays overhead 0.7 s.** Rider A: arm up 7.63, turn begins 7.90 — **0.3 s of lead. 2 of 2 resolved direction changes.**

**The one exception, and it is informative:** the **roundhouse cutback** (8.00–9.10, 1.10 s) is carried on the **LEAD** arm reaching past the rail, with **no overhead arm at all.** So the overhead arm belongs to some manoeuvres and not others.

### THE TRANSITIONS — and the sharpest gap yet

- **T2, rider B (13.77 → 15.23): down 0.33 s with the LEGS ALONE (trunk unchanged at 30–35°) → HOLD 0.60 s in which the trunk UN-FOLDS 35° → <10° WHILE THE LEGS STAY DOWN → up 0.27 s** (hips +59 %, trunk already vertical). **Arms spread wide AS the body arrives, not before.**

> **That hold is the sharpest "not at all" the series has produced: a deep leg position held 0.6 s while the trunk un-folds under it — TWO CHANNELS MOVING IN OPPOSITE DIRECTIONS AT THE SAME TIME.** The game's drawn trunk is a function of leg depth, so **it cannot represent this at all** — the two are forced to move together.

- **T4, rider B (17.97 → 18.80, 0.83 s): beat zero is THE ARM**, then entry 0.06 s, load 0.27 s, exit 0.40 s — and **the trunk is still folded 60–70° a full 0.4 s AFTER the board has come round.**
- **T1, rider A's trim pump: ~4 trunk fold/unfold half-cycles in 2.3 s, ~0.55 s each, leg chain 100 %.** **This AGREES with video 8 to within 10 % (~0.6 s) — the most reproducible figure the series has.**
- **A THIRD form of the down-transition (legs only)**, so video 7's knees-and-trunk versus video 8's trunk-only **stays unsettled** — now three forms, which is itself the finding.

### THE OTHER SCORES

- **Trunk fold ~5° to ~70°**, visiting the whole range; two sustained extremes — **50–60° held 0.40 s** and **under 10° held 0.53 s**.
- **Arm carriage: five carriages, counts 6/5/4/5/2, independent of depth again** — the deepest leg frame has arms at waist height, the tallest has them wide. **Both "tall ⇒ spread" and "deep ⇒ spread" stay refuted.**
- **Fore-aft hips: confirmed, FOURTH clip**, 0 steps in ~3.5 s of legible feet.
- **Crouch (66 %): this clip ABSTAINS for the first time** — its two rulers bracket 66 % from both sides.
- **At or near real time** (30 fps, every frame distinct; 4× excluded by a 0.27 s squat-to-stand, 2× by three manoeuvre durations against the published 0.96 s / 0.8 s).
- **Two legs separately: NOT measurable here** — rider B's boardshorts reach his knee, so the knee is inside black cloth **in exactly the deepest frames.**

### A NEW GAP NOBODY HAD NAMED: **RATE**

**Nothing in the game chains turns every 2.3 s.** The footage's density is itself a requirement, separate from any single movement.

### METHOD — four findings, now in the skill (the round did not edit it)

- **`setPlaybackQualityRange` reaches 1440p and 2160p** on long-form video where enlarge-and-reload stops at 1080p. **2160p is the WRONG choice — the pane dropped to ~1 fps and produced real stale frames; 1440p was reliable.** A long-form watch page may have **no consent gate**, unlike a Short.
- **The pane returns an 800×600 screenshot whatever the viewport**, so a **1020×760** overlay canvas is the largest that fits. **Tiles that look "undrawn" may simply be outside it — identical in appearance to the composited-canvas failure.**
- **☠️ A FOLLOWING AUTO-CROP NORMALISES THE RIDER'S APPARENT SIZE (±15 % between tiles) AND PRODUCED A FALSE "BIG EXTENSION" READING** before it was caught. **Never judge height from a strip of auto-cropped tiles.** Crop to find; measure on a fixed frame.
- Tools worth reusing: a **redness-based rider finder** and a **`seeked` + `requestVideoFrameCallback` seek with mediaTime verification and retry**, which **removed the stale-frame problem outright at 1440p.**

## ⚖️⚖️ RULING F (2026-11-18) — **SURVIVAL RATE IS REJECTED AS THE METRIC, AND THE OWNER WANTS A PLAYING AGENT.** This reverses a standing rule of theirs.

Their words:

> ***"we need to code some agent that will be able to play and have a evals to reach a objective of play. Because as of right now your are not skilled enough to play and keep the surfer up. All of it is up to me. So maybe the best approach is for you to scope and calculate if this videos will map to what is being built. Stating tests and survival rates is not a good metric"***

### 1. "626 of 626 fell" IS DEAD AS A MEASURE, and they are right

**It has not moved in twenty-five rounds, so it has NO GRADIENT** — it cannot tell anyone whether a change helped, only that the thing is still broken, which was already known. **And median ride time is a time-to-failure, not a measure of surfing.** **Stop reporting either as the headline of a round.**

**The replacement is already in hand: the videos' reproducible numbers.** Say which are reproduced and across how many clips:

| target | value | evidence |
| --- | --- | --- |
| pump half-cycle | **0.55–0.60 s** | clips 8 and 9, **within 10 % of each other — the most reproducible figure the series has** |
| arm leads the rail | **0.07–0.30 s**, overhead ~0.7 s | **frame-level on three clips**, 2 of 2 and 3 of 4 resolved turns |
| bottom-turn → climb → top-turn | **1.00 s** | clip 8, against the literature's **0.96 ± 0.04 s for a bottom turn ALONE** |
| snap | **0.35 s** | clip 8 |
| direction change | **one every ~2.3 s** (≥13 in 30 s) | clip 9 — **and clip 7 had ZERO in 13 s, so this is a capability, not a constant** |
| steps while standing | **zero** | clips 7 and 9 — **the game already matches this by construction** |
| trunk fold | **to 60°, independently of the legs** | clips 8 and 9 |

**"Your pump is 1.4 s against the footage's 0.55" is actionable in a way "he fell" never was.**

### 2. THE PLAYING AGENT — and it reverses their own rule, so handle it precisely

Their long-standing instruction was **the owner rides and judges; never use bot rides as evidence of feel** ([[owner-playtests-riding]]). **They are now asking for the bot, because they have become the bottleneck.** **Keep the half that was right:**

> **An agent can measure whether the movement matches the footage's numbers. It CANNOT tell anyone whether the game feels good.** The agent grinds measurable targets over many trials; **the owner still judges feel on a handful of rides.**

### 3. ⚠️ THE FAILURE MODE THAT WOULD MAKE THIS WORSE THAN USELESS

**An agent optimising a score finds the cheapest route to it, and this project has already lost months to exactly that:** the old rider's **`uprightVelocity` held the body plumb kinematically — a prescription realised by whatever force it took — and looked like a rider that did not fall.** Its benchmark is **retired and must never be measured against again.**

**So two constraints are non-negotiable in the design:**
- **The agent controls ONLY what a player controls** — the same stick, stance keys and W/S trim. **If it can set a state the player cannot, it is not playing the game and what it learns is worthless.**
- **Every eval must be cheat-resistant.** For each metric, ask *what is the laziest way to score well, and is that way surfing?* **A score that rewards "upright" rewards standing still.**

### 4. THE HONEST FEASIBILITY PROBLEM, which the scoping round must answer

**The rider falls in 1.0–1.45 s under every input tried so far, 626 of 626. So an agent cannot out-play the physics** — if no input sequence survives, it will not find one. **What the agent buys is therefore: a gradient where there is none, search over a space the owner cannot cover by hand, and measurement of MOVEMENT rather than SURVIVAL.** **If the scoping concludes the agent is premature until something else is fixed, that is a legitimate and valuable answer.**

### 5. What is in flight on this

- **`engine-target.md`** — the synthesis of nine reads plus the code survey, redirected to add **a "what would measure this" column** and **a feasibility section** (can the architecture express the target at all, or is it an **expressibility limit** rather than a tuning gap — a trunk that is a one-line function of leg depth cannot match a trunk moving opposite to the legs however it is tuned).
- **`playing-agent-scope.md`** — the agent and eval design: the objective of play (**proposed, not chosen — it is the owner's call**), the metric set split into **computable today / needs new columns / inexpressible**, what the agent controls, **rides per hour on this machine**, and the smallest useful first version. **Most of the harness already exists** (`SurfZoneRunner`, the dev switches, and five probes that already drive headless rides with scripted inputs and dump per-tick columns) — **the gap may be much smaller than "code an agent" suggests.**

## ⭐⭐ THE ENGINE TARGET (merged `a467a38f`, PR #400) — 18 ROWS, AND **NO BASELINE EXISTS FOR ANY OF THEM**

`docs/research/new-rider/3.5/engine-target.md`. Synthesis of the nine video reads plus the code survey, **written against Ruling F** (it landed mid-round and was folded in, not retro-fitted). **Read-only; nothing built, ridden, measured or proposed.**

### THE FIRST THREE ROWS, in priority order — and the first two need NO RULING

1. **The trunk's fold must move the body's mass.** `?rider=new`'s `StandingBody.hip` is **already honest** — paired torque (`standingBody.ts:379–384`), booked power, its own clock — but `hip.angle` is read in three places that **never touch `this.parts`**, so the CoM, `bodyInertiaAt`, `riderYawInertia` and `stanceAt().height` are computed from an **unfolded** trunk while a **23 kg torso and a 5 kg head swing through 60°.** **GEOMETRY — it states where the mass already is. No ruling.**
2. **The drawn trunk must stop being a function of leg depth.** `HumanoidRig.ts:1383–1385`. At trim frontside video 8's 23 points of leg buys **~8°** against the footage's **60°**; at the backside bottom turn (**30 → 30°**) it **cannot move with depth at all.** **GEOMETRY, drawing only. No ruling.**
3. **Then the two must move in OPPOSITE directions at the same time** — video 9's deep leg **held 0.6 s while the trunk un-folds 35° → <10°**, plus a trunk still folded 60–70° a full 0.4 s after the board came round. **This builds nothing: it is the ACCEPTANCE TEST for rows 1 and 2.**

**They are first because they are the only rows shippable without a ruling AND measurable without a longer ride** — and rows 3, 6, 9 and 11 are all downstream of them.

### THE 18 ROWS BY CHANGE-KIND

**geometry 9** (rows 1–6, 11, 12, 15) · **force 2** (row 9 the fore-aft differential, row 10 the second leg spring) · **blocked by survival 3** (row 7 turn beats, row 8 chaining rate, row 16 the foam brace) · **unknown 3** (13, 14, 18) · **already correct 1** (row 17, **zero steps — recorded so no round spends anything there**). Row 12 is geometry but **the owner has already ruled it** (C and E).

### ⚠️ THE SINGLE BIGGEST THING IT CANNOT SAY — and it is exactly the gap the owner just asked to fill

> **No quantity in the document has ever been computed on the game's OWN rider in the footage's units.** Every target is a footage number; **every game-side cell is a code reading.** **So there is no baseline, and therefore no eval, for any row.**

**The sharpest instance is depth:** video 9's two rulers disagree by ~30 points, so **the document cannot say what leg depth the engine should reach.** **This is the bridge between the target and the playing agent: the agent's first job is not to play well — it is to produce the baseline that does not exist.**

### CHEAT-RESISTANCE, as Ruling F demands

For **eight** metrics the laziest route to a good score is **not surfing** — shake the trunk, cycle the arms, hold the key, stand still at the right height — each with a guard. **The general rule it produced, and it should govern the agent's design:**

> **Every metric is a CHECK that the engine can express the footage, not an OBJECTIVE to maximise.** An objective of play is the owner's to choose, and the document deliberately **does not propose one.**

### FEASIBILITY IN FOUR WORDS, not two

**tuning gap / wiring gap / expressibility limit / absent quantity.** The governing sentence:

> **On what the owner actually rides, rows 1 through 11 are ABSENT QUANTITIES, not tuning gaps** — the shipped body is seven point masses in one hard-coded posture and **no part is ever rotated about another.** **On `?rider=new` they are mostly wiring gaps and expressibility limits, which is far cheaper.**

**Three things that cannot be asked for at all:** anything needing **a clock**, anything the game does **on its own initiative**, and any **kinematic prescription**.

### ⚠️ TWO CORRECTIONS TO MY OWN RECORD

1. **RULING F's TABLE OVERCOUNTS THE ARM LEAD: it is timed on TWO clips, not three.** The "2 of 2" is video 9; the "3 of 4" is video 8 — **two clips, three riders, two breaks.** The **three-clip** figure is the arm **PAIRING** (lead hand low + rear arm up: videos 5, 6, 7), and **none of those three times it against the board.** **Still the second-best reproduced figure after the pump period — but Ruling F's table must be read with this correction, not quoted as it stands.**
2. **THE HOLD-VERSUS-DIP TALLY WAS WRONG, AND RULING C IS BETTER SUPPORTED THAN WHEN IT WAS MADE.** **Video 2 (Pupo) is a HELD low, not a dip**, and **video 1 sits on BOTH sides of its own question** — a tube held 15+ slowed seconds *and* dipping turns in the same clip. So it is **3 clips of dips (V1's turns, V3, V4) against 3 of holds (V1's tube, V2, V5)**, with **3 abstaining** and video 9 a 0.6 s near-miss. **Not "video 5 alone against four", which is what I told the owner.**

### §8 — THE FRAMING I HAVE BEEN USING IS HALF RIGHT

**The four-channel framing is the right INVENTORY and the wrong ORDERING PRINCIPLE**, so the document uses it only as the inventory. And **"arm carriage" and "arm timing" are not two channels but ONE CHANNEL AND ITS CLOCK** — which is why **row 5's sequencing change buys nothing visible until row 4 exists.**

### Honesty carried

**Saturated leg chain marked beside all four rows that rest on it** (2, 6, 10, 14), with the mechanism, the consequence that **"no rider ever leaves the Tall band" is untested**, and the ask for **footage shot from the water or down the line.** **The frame of every number named in §4.3.** No metre figure inherited from the three reads that compared a hip fraction to a CoM height. **Single observations marked SINGLE** (rows 3, 11, 13, 16, both halves of 12). **Six disagreements stated rather than averaged** (§4.5). **No date and no certainty for rows 7, 8 and 16.** **Four asks of the owner in §6**, led by the footage-from-the-water one — *"the cheapest thing that would unblock the most."*

## ⭐⭐⭐ THE PLAYING-AGENT SCOPE (merged `fac29fc9`, PR #401) — **"BUILD THE EVAL. DO NOT BUILD THE OPTIMISER."** And the reason is not the fall count.

`docs/research/new-rider/3.5/playing-agent-scope.md`. Design only; no code, no constant, nothing measured.

### ⭐ THE SHARPEST FINDING: YOU CANNOT SEARCH A FLAT SPACE

> **The control space is provably flat where the owner rides.** 3.5d measured stick hard over against stick never touched at 1–3 m/s as **0 mismatches over 67 767 column-values**, and 3.5a names the mechanism — **below `PLANING_DROP = 3 m/s` the ask cap is exactly 0.** **An agent is a search over controls. You cannot search a flat space.**

> **So the precondition for search is NOT "fix the fall" — it is "make the input reach the outcome below 4 m/s." The 4 m/s floor thread unblocks search, not the agent.**

**And the design consequence: the first action space should be the STANCE KEYS and W/S, not the stick**, because the stick does nothing there.

### THE RECOMMENDED OBJECTIVE — scored against the only powered population in the evidence base

**One direction change, to the footage's shape, scored on what the game returns: duration, degrees turned, radius, lateral g, speed kept.** **Proposed, not chosen — the choice is the owner's.**

**Why: it is scored against Forsyth et al. 2024's 0.96 ± 0.04 s / 99° / 3.8 m / 1.41 g on n = 6 riders and 835 turns — the only properly powered population anywhere in our evidence.** **Every movement number in the nine video reads has a population of 1–8 instances, 1–2 riders, 1 clip.** It also **fits inside the 1.0–1.45 s every ride currently lasts, so it has a gradient today** (3.5a already saw time-to-5°-of-rail 0.317–0.350 s and peak yaw 100–193 °/s move between arms), and **most of it is already computed**: `Maneuver` (`src/game/rideAnalysis.ts:28–52`) carries all five and `docs/research/ride-report.md` already prints them beside the Forsyth row.

**⚠️ AND IT REJECTED MY OWN METRIC PROPOSAL, CORRECTLY: "match the footage's numbers" is CIRCULAR as stated, because the agent commands most of them — `PUMP_PERIOD` is already a constant (`Autopilot.ts:265`), so a pump-period score measures the constant.** *Link N direction changes* is the right **second** objective but scores 0 for every build today. *Ride a stretch of wave* is the rejected survival metric in another unit.

### THE METRIC SET

**Computable today with NO engine change — all five body channels are public readonly fields on `AttachedRider`:** `leg` (`:2084`), `standingBody.hip` (`:2239` → `standingBody.ts:158`), `swing` (`:2319`), `trunk` (`:1980`), `human.arms` (`:2247` → `humanBalance.ts:306`), plus turn duration/yaw/radius/lateral g/speed kept, direction-change count and time to 5° of rail. **So "needs new columns" almost never means "needs a game change" — it means a new file under `docs/research/`.**

**Needs a probe (not game code):** the pump half-cycle measured on the **output** — and **⚠️ only non-circular on `?rider=new`'s `hip.angle`, which is independently driven**; channel-order cross-correlation; the drawn trunk read beside the physics one; per-manoeuvre ankle share.

**⚠️ INEXPRESSIBLE — expressibility limits, not tuning gaps:** the arm lead (**no arm position exists**; `human.arms` shares the knees' trigger and the time constants run backwards); a **visible** trunk moving against the legs; two legs at different extensions (one spring, one solve row); hips-aft/shoulders-forward; arm carriage as a position.

**⚠️ AND ONE HALF-EXPRESSIBLE TRAP WORTH MORE THAN THE REST: `hip.angle` exists and is paired honestly but NEVER MOVES `this.parts` — so a trunk eval can PASS while nothing the owner feels or sees changes.** Any trunk metric must read the parts, not the angle.

### WHAT THE AGENT CONTROLS

**`RideInput` (`RideSession.ts:23–56`), forwarded one-for-one at `:444–450`: `steer`, `trim`, `crouch`, `compress`, `snap`, `hand`, `rotate`.** **`Autopilot.next()` returns a `RideInput` and nothing else — player-equivalent BY CONSTRUCTION, and that is the hardest constraint on the work.** **Must not touch** any field `RideInput` cannot reach, and **must not choose its own `RiderPlacement` as part of the objective** — legitimate for starting a trial, but **an agent that picks its placement picks the gentlest face** (3.4h: the same stance rides **4.650 s on one face and 1.033 s on another**).

### RIDES PER HOUR, AND PARALLELISM IS ZERO

- **Bench** (`FaceWater` + `AttachedRider`, no sea): **48 runs/min ≈ 2 880 rides/hour, single process** — two rows of the 3.4 cost table agree exactly. **Caveats: those runs END IN A FALL, so throughput falls as the agent succeeds**; no peel, curl or shoulder, so nothing positional; and **×2.2 off the owner's water where the board sits.**
- **Real sea:** `ride-report.md`'s own header — 58.4 min wall for 20 simulated min (**~2.9× real time**), **721 attempts → 5 stands → 4 rides ≥ 3 s. ~4 usable rides/hour** — **and it is a CATCH-RATE problem with a fix already in the code: `RiderPlacement` → ~120 rides/hour.**
- **⚠️ PARALLELISM IS ZERO: 76 MB free pages, 7 783 of 8 192 MB swap in use; 3.5a was OOM-KILLED at `--maxWorkers=2`. One process at a time.**

### ⚠️ `waveScore` CANNOT BE AN EVAL UNCHANGED

It contains **`length: min(1, duration/20)`** and **halves the score on a fall within 1.5 s.** With every ride ending at 1.0–1.45 s, **the shipped score is saturated at the bottom exactly as the fall count is saturated at the top.**

### THE SMALLEST USEFUL FIRST VERSION — no agent, no reward, no learning, no ruling

**One research probe, `3.5/shape.ts`, in `depth.ts`'s pattern:** place the rider, **script one direction change with player inputs only**, log the five emergent turn numbers plus every body channel, report against Forsyth, and **break on `!rider.attached`, never `!upright`** (the `separate` freeze trap). **Plus V1b: the apparent-stature baseline** conceded to `engine-target.md` row 14 — **compute it, publish it, DO NOT score it** (its target, 63–81 % from 6 frames of one clip, is contested and contradicted in direction by videos 7 and 8; **but a baseline needs no agreed target and cannot be cheated**).

### TWO MORE NUMBERS OF MINE IT CORRECTED RATHER THAN PROPAGATED

**The "overhead ~0.7 s" is a HOLD duration, not a lead** — the lead is 0.07–0.30 s and they are different quantities. And **"cross-step" appears nowhere in the nine reads: the 0.55–0.60 s figure is a TRUNK half-cycle, not footwork.**

### ITS ONE OPEN DISCREPANCY — **SETTLED HERE BY THE CALLER**

It flagged that `body-channels.md` calls the trunk rotor absent *"on what the owner actually rides"* while the handoff records their address as including `rider=new`, and said this **decides whether a trunk eval measures the build they ride.**

> **SETTLED: the owner rides `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two`.** It appears **24 times** in this handoff and they have confirmed it by riding it repeatedly. **So the trunk rotor IS present on the build they ride.** `body-channels.md`'s "absent" is true of the **shipped default** rider — which is **not** what the owner rides. **A trunk eval on their address measures a real rotor; it must still read `this.parts`, not `hip.angle`, because of the trap above.**

### Doubts carried, not smoothed

**No depth-matching eval is proposed at all** (leg-chain saturation and the 30-point ruler disagreement). **Clips 1–4's metre figures named tainted.** The down-transition's **three forms** mean an eval scores **separability, never one form**. The bottom turn's **1.00 s against 0.35–0.40 s clash is recorded, not averaged.** `engine-target.md` **defers the agent design to this document by name**, and §9 reconciles the two and states their one disagreement openly.

## ⭐⭐ VIDEO REFERENCE 10 (merged `06470a95`, PR #402) — **THE RIDE IS THE TRANSIT**, and one channel moves while the other three are frozen

`docs/research/new-rider/3.5/video-ref-10-mentawai-drone.md`. **"Mentawai Islands | November 2026"**, 280 s total, read **15–55 s only** on the owner's scope. **1080p is this upload's ceiling — it publishes no 1440p/2160p, so video 9's quality ladder is per-video.** A true **25 fps** (measured by seeking on a 0.01 s grid and hashing — the picture changes at exactly 0.04 s). Rider ~140–190 px. `tab-1`, the only tab, closed at the end. **The owner chose this clip because its waves are like Canyon's.**

### WHAT THE MOVEMENT IS

**Almost never still, almost never upright.** He cycles between a **long-legged trim with the trunk folded 30–50°** and a **deep fold with his head near the deck and both hands at the rail** — **about half a second each way, over and over** — and changes the board's direction every **1.2–1.9 s**.

> ***"The ride IS the transit; the postures are just its endpoints."***

### ⭐ WHICH CHANNEL CARRIES EACH CHANGE — and two forms the game cannot express

- **Through trim:** trunk and legs move **together, same direction** (could not be separated within ±15°).
- **Into the bottom turn (30.00 → 30.24): THE ARMS MOVE ALONE** — 0.12–0.16 s in which the arms go from tucked-low to wide-and-head-high **while the legs stay long, the trunk does not move and the board stays flat. One channel moving with the other three frozen.**
- **Through the top turn (30.76 → 31.20): THE BODY IS FROZEN WHILE THE BOARD DOES EVERYTHING** — legs down, trunk laid forward, both arms out and low, **unchanged for 0.44 s while the board climbs, hits the lip and reverses.**

### OPPOSITE DIRECTIONS — it abstains, and says why

**It did NOT catch one, and judges that this camera cannot show one:** the drone **orbits**, so trunk angle carries **±15°** (worse than video 9's ±10°) and **video 9's 35° un-fold would sit inside the error bar.** **An honest abstention rather than a weak confirmation.**

**But it reproduced video 9's other half to the tenth: the body's fold still held 0.4–0.5 s AFTER the board had come round.** Two clips now.

### TURN RATE — about twice video 9's, and the pump cadence lands a third time

**9 unambiguous direction changes (up to 14 counting likely ones) in rider A's ~17 s ride → one every 1.2–1.9 s.** The busiest stretch, 30.24–35.5, has **6 in 5.3 s — one every 0.9 s.** A complete **bottom turn → climb → top turn in 0.88 s** (0.26 / 0.45 / 0.17) — against video 8's **1.00 s** and the literature's **0.96 ± 0.04 s for a bottom turn alone.**

And against that, **a 3.2 s trim passage with ZERO direction changes and ~5 fold/unfold half-cycles at ~0.5 s** — **the third clip in a row on the pump cadence: 0.6, 0.55, 0.5.** **That is now the most reproduced figure in the series by a distance.**

### WHICH MANOEUVRES TAKE THE BIG ARM — the pattern is narrowing

**The bottom turn did; the top turn 0.5 s later did not.** On the stream's own 0.04 s grid: rear arm out **30.12**, head height **30.16**, **first rail spray 30.24 → a 0.12 s lead**, held through the turn. Then 30.76–31.20: **both arms out and low, nothing raised at all.**

**With video 9's roundhouse-cutback exception, the arm now looks like it belongs to the turn at the BOTTOM** — two clips, two different kinds of turn that go without it.

**⚠️ An important abstention: this clip CANNOT test "above the head."** The rear hand tops out level with the middle of the head, and **a drone looking down is exactly the geometry that hides a raised hand.** **The order and the lead time are confirmed; the height is not.**

### ⚠️ A DRONE DOES NOT FIX THE DEPTH PROBLEM — IT SWAPS IT, AND IT BREAKS THE REPLACEMENT RULER

Video 9 asked for footage *"from the water or down the line"*. **This is down the line, from above, and the leg chain was readable on only 2 of 7 frames attempted** — both of them frames where he is **visibly extended**, because **boardshorts cover the knee exactly when the thigh goes horizontal, and spray and foam cover the ankle.** **So it neither confirms nor refutes the saturation claim; it reproduces the same failure for a different reason.**

**And worse, new: the vertical ruler is corrupted outright here.** Apparent stature read **4.96 head-lengths at a 45° fold and 4.96 nearly upright, 0.4 s apart** — **identical across a posture change anyone can see** — **because a raised camera turns a forward fold into a sideways translation rather than a vertical shrink.** **It names no rung for any frame and says nothing in its document may be quoted as a depth.**

> **This bounds video 9's own claim that hip ÷ head-length is the figure to defend: SAFE FOR A LEVEL LENS, UNSAFE FOR A RAISED ONE.**
>
> **⭐ THE FOOTAGE ASK, CORRECTED — this replaces video 9's: WATER-LEVEL, SIDE-ON, AND A RIDER WHOSE KNEES ARE NOT INSIDE HIS BOARDSHORTS.**

### WHAT THE DRONE GAVE THAT NO EARLIER CLIP COULD

- **The feet on the deck from directly above — 0 steps in 12 frames** through turns, climb and whitewater. **The first time the series can SAY it rather than infer it.**
- **The fore-aft axis MEASURED:** on all three frames with placeable landmarks, **the hip sits at or beside the rear foot while the head sits forward of it**, feet planted. **Fifth clip to report it, first to measure it.**

### WHAT THE OWNER'S CANYON RIDER COULD NOT ATTEMPT — 7 of 15 rows

The arm leading by 0.12 s and held (**no arm position exists; the one scalar shares the knees' trigger and is three times slower, so the orderable pair runs backwards**); the body's fold lagging the board by 0.4 s (**the drawn trunk is affine in drawn leg depth — no clock of its own**); **the trim pump, which fails twice** — the game's pump is leg depth not trunk fold, **and the stick is inert below 4 m/s, so there is no pumping authority where it is needed**; chaining turns every 0.9–1.9 s; **the 0.17 s top turn — the solver holds ~15–20° where a snap needs 60–80°, and there is no lip at Canyon to hit** (a **wave-side** limit, not only a rider one); two legs at different extensions (96 % / 100 % in one frame, one spring); hips-aft-while-shoulders-forward (`TRIM_SHIFT` moves pelvis, torso, head and both arms **together**).

**The one row to be pleased about: the feet.** Fixed deck positions, nothing moves them while upright — **and checked from directly above for the first time, that is exactly right.**

### METHOD — four findings, now in the skill

- **☠️☠️ `javascript_tool` has a ~45 s ceiling AND A TIMED-OUT SCRIPT KEEPS RUNNING.** A 164-seek loop timed out and then spent **two minutes seeking the video underneath the measurement calls** — one frame returned `mediaTime = 30` while the canvas stamped `currentTime = 53.85`. **The stamp caught both bad frames and they were discarded; the `DUP!` flag on the re-take proved which had actually been t = 30.** **Rule: chunk loops under ~40 s, and discard any frame whose stamp disagrees with its seek's returned mediaTime.**
- **Measure the stream's own frame grid** (seek at 0.01 s and hash). **25 fps here, 60 in video 8, 30 in video 9 — do not assume.**
- **Canvas→screenshot scale is 0.784 at a 1280×1000 viewport**, not 0.625; the whole 1020×760 canvas is visible.
- **Fixed-size source crops centred on the finder make the auto-crop size trap structurally impossible.** A **red-clothing** detector found rider A in ~60 of 66 frames; a **dark-island** detector **failed** on rider B's wetsuit, **because the unbroken wave face is darker than the wetsuit** — he was placed by hand in 10 of 24 sampled seconds, **so nothing about rider B is a count.**

**Unresolved and stated:** whether there is a hard cut between rider A (ends ≈35.8) and rider B (≈44–55). A 16×9 luminance-signature detector over 35.0–44.6 found no discontinuity above the drone's own motion — **consistent with videos 8 and 9 finding such detectors useless on surf footage.**

## ⚖️ RULING F IS NARROWED — THE PLAYING AGENT IS DEFERRED (reported 2026-11-18 via the Codex session, **not yet heard from the owner directly**)

A peer session (**Codex**, coordinating movement work at the owner's request) reports a scope clarification received **in the Codex chat**, quoting the owner:

> ***"evaluation should not be played for now, it should be advising code. Im the one that plays the game and gives feedback."***

**So: playing-agent implementation, automated evaluation rides and optimisation are all DEFERRED.** The review work is to **advise the builder**, and **the Canyon bottom turn carrying speed into the climb is a DESIGN REFERENCE for the owner's playtest — not an agent objective.**

**HOW THIS WAS HANDLED, and why:** it came from a peer, not from the owner in this conversation. **A peer cannot grant authority** — but this is a **restriction**, not an expansion, and the asymmetry decides it: **deferring work on a wrongly-reported restriction costs time; building on a wrongly-reported authorisation does unauthorised work.** It is also **consistent with the owner's own long-standing rule** (*the owner rides and judges*, [[owner-playtests-riding]]) which Ruling F had reversed. **So the restriction is honoured and recorded, and the owner has been told it came via a peer so they can confirm or correct it cheaply.**

**What survives of Ruling F, and it is the more important half:** **survival rate and ride time are still rejected as metrics.** *"626 of 626 fell"* has no gradient and median ride time is a time-to-failure. **That stands independently of whether anything is automated.**

**What this changes in practice:** `playing-agent-scope.md` (merged `fac29fc9`) is **not cancelled but shelved** — its measurement set, its cheat-resistance analysis and its throughput figures remain the right reference **if** the owner ever revives automation. Its own conclusion already pointed this way: **"build the eval, do not build the optimiser"**, and **the control space is flat below planing (0 mismatches over 67 767 column-values), so there was nothing to search anyway.**

### ⚠️ A CORRECTION FROM CODEX TO A NUMBER I HAVE QUOTED THE OWNER TWICE

> **Forsyth reports 835 TOTAL turns OF MIXED TYPES** — not 835 bottom turns. **The project's radius and lateral-g values are DERIVED ESTIMATES, not measured.** And **turn-flow is a quantity measured ACROSS manoeuvres, which is NOT the same as bottom-turn exit/entry speed.**

**I have been quoting "Forsyth et al. 2024's 0.96 ± 0.04 s / 99° / 3.8 m / 1.41 g on n = 6 riders and 835 turns" as a measured bottom-turn population. It is not one.** The duration figure is the defensible part; **the radius and the lateral g are derived, and the 835 is a mixed-type total.** **Stop quoting the four together as one measured population**, and in particular **do not use the turn-flow figure as a bottom-turn speed target** — different quantity.

**This matters beyond tidiness:** the agent scope recommended that very row as *"the only properly powered population anywhere in the evidence base"*, and **it is better powered than the video reads but not the clean four-number measurement I presented.** The videos' own numbers remain population-1-to-8 — **so the honest position is that there is no well-powered four-number turn target yet, from either source.**

## ⚠️⚠️ THREE CORRECTIONS, AND ONE OF THEM IS A PROVENANCE PROBLEM WORTH MORE THAN THE OTHER TWO (2026-11-18)

### 1. I MISROUTED TWO MESSAGES — and the "Codex" claims have NO CONFIRMED ORIGIN

The two "From Codex" messages arrived **without an addressable `from=`**, so I guessed an address and replied to **`aaf7193536cb1fb32` — which is the VIDEO-10 READER subagent I had dispatched myself.** It replied, correctly and firmly, that it:

- **made no suggestion about torso/head inclination**;
- **asked for nothing about dispatch order**;
- **has never reported that the owner chose an objective, and HAS NEVER SPOKEN TO THE OWNER AT ALL.**

> **So the claims I acted on — that the owner chose "one Canyon bottom turn carrying speed into the climb" as the first objective, and the later scope clarification deferring the playing agent — came from a session I cannot identify, and the agent I thanked for them had nothing to do with them.**

**What this does and does not change:**
- **The DEFERRAL stays honoured**, on the asymmetry already recorded: **a restriction costs time if wrongly reported; an authorisation does unauthorised work.** It also restores the owner's own long-standing rule. **But it now rests on a message of unverified origin, and the owner has been told so and asked to confirm.**
- **The OBJECTIVE is not recorded as a ruling and nothing is built against it** — which was already the position, and is now plainly the right one.
- **The lesson, as the video-10 reader put it: an unattributed appeal to the owner's authority is a provenance problem, not a routine one.** **Before acting on a peer's report of the owner's words, establish which session is speaking.** `ListAgents` gives addresses; a message without one is not a known peer.

### 2. ⚠️ "THE STICK IS INERT BELOW 4 m/s" IS MY OWN ROUNDING ERROR — IT IS 3, AND THE 4 IS A DIFFERENT THING

The video-10 reader flagged that **3 and 4 are not the same threshold** and could not adjudicate. **The caller read the code and settled it:**

| | |
| --- | --- |
| **`PLANING_DROP = 3`** (`AttachedRider.ts:343`) | **below 3 m/s the ask cap is exactly 0** — this is the *mechanism* |
| **the 0-mismatch measurement** | taken over **1–3 m/s** — 67 767 column-values, stick hard over against never touched |
| **`PLANT_SPEEDS`' floor = 4 m/s** | a **completely different thing** — the balance controller's derivative table, where `labAt` clamps |

> **So the honest statement is: the stick is MEASURED inert at 1–3 m/s, and the mechanism is `PLANING_DROP = 3`. The 4 m/s belongs to the plant table, not to the stick.** I merged two real thresholds into one sentence and told the owner "below 4 m/s" repeatedly. **The twenty-seventh number in the wrong frame.**

### 3. THE VIDEO-10 WINDOW CORRECTION (merged `2dc6bdf3`, PR #403) — and the Forsyth citation earned it

Its own document reported a **0.26 s bottom turn** while `ride-report.md` prints **Forsyth's 0.96 ± 0.04 s** beside game numbers. **They are not the same quantity:** the 0.26 s is **first rail spray → board stops swinging**, excluding **0.16 s of arm and weight set-up and the whole exit.** **On a window closer to Forsyth's — first arm movement 30.08 to the top of the climb 30.95 — the same manoeuvre is 0.87 s, inside their interval.**

**So the apparent "real surfers turn three times faster than the literature" reading was a WINDOW artefact, not a speed difference.** The **0.88 s complete sequence** reported to the owner was the right figure all along; **the 0.26 s is a sub-window of it and must not be set against Forsyth.** §0.8's real-time conclusion is unchanged, because the figures that exclude 2× and 4× — **the pump half-cycle and the squat-to-stand — are whole-cycle quantities with no window ambiguity.**

**One factual point where the reader was mistaken, stated for the record:** it said PR #402 was closed and *"someone else copied the content across"*. **The content did land on `main` as `06470a95` by a verified fast-forward** (`video-ref-10-mentawai-drone.md` is on `main`); the PR reads CLOSED with `mergedAt: null` **only because the rebase changed the SHAs GitHub was tracking**, which is how every PR in this track has landed today. **Nothing was stranded except its follow-up branch, which #403 fixed.**

### And two things it confirmed independently, which is worth more than agreement usually is

**`hip.angle` never moving `this.parts`** — its whole Canyon column rests on that — and **the sub-planing dead zone.** It also sharpened the trunk trap into the right acceptance test: **the quantity to test is a LAG AGAINST THE BOARD, not an angle** — the body's fold is still held **0.4–0.5 s after the board has finished turning** (board reverses ≈31.12, body still laid forward at 31.20, still folded at 31.50), **video 9's number to the tenth** — *"a metric read off `hip.angle` could move through that entire window while nothing in `parts` changes."*

## ⭐ THE CODEX REVIEW — TWO CODE FINDINGS, **BOTH VERIFIED HERE BY READING**, and one is a no-hidden-motors violation

`docs/research/new-rider/3.5/canyon-movement-review.md` — an advisory review for the surfer-physics builder, written by the **Codex** session into this working tree as an **untracked file**, now committed with that attribution. **Its provenance is unverifiable (no addressable sender; `ListAgents` shows no such peer) — but its CONTENT is checkable, and content I can check needs no trusted provenance. Both findings check out.**

### FINDING 1 — ⚠️ **THE HIP'S JOINT STOP THROWS AWAY ANGULAR MOMENTUM WITH NO REACTION.** Verified.

`standingBody.ts` around `:301–311`, read directly:

```
this.hip.torque = burst - back * I * w * (w*angle + 2*rate);   // torque set HERE
this.hip.rate  += h * this.hip.torque / I;
this.hip.angle += h * this.hip.rate;
if (Math.abs(this.hip.angle) > range) {
  this.hip.angle = Math.sign(this.hip.angle) * range;
  if (this.hip.rate * this.hip.angle > 0) this.hip.rate = 0;   // ← RATE ZEROED, AFTER
}
```

And `couple()` (`:379`) pairs **`this.hip.torque`** — *"the hip's couple is the pair's"* — which was computed **before** that clamp.

> **So zeroing `hip.rate` discards `HIP_PITCH_INERTIA × rate` of angular momentum, and NOTHING anywhere carries the reaction. That is an unpaired impulse — precisely what the owner's hardest rule forbids.** [[no-hidden-motors]]

**The code does try to avoid reaching it:** `braking = (rate·|rate|·I)/(2·TORQUE)` computes the stopping distance and sets `burst = 0` while still short of the limit, **so the clamp is a backstop rather than the normal path.** **Codex's characterisation is exactly right: the mechanism is real, and its FREQUENCY on the owner's rides is unknown.** **That frequency is measurable and is the obvious next round** — count the clamp firings and sum the discarded `I × rate` on the owner's own address.

### FINDING 2 — the rig ALREADY compensates, so feeding it a rotor angle can double-apply. Verified.

`HumanoidRig.poseHinge` (`:1937`), its own comment: *"the pelvis back as far as keeps the centre of mass"*, then `const back = angle <= 0 ? 0 : this.backForMass(state, angle)` and `addScaledVector(levelForward, -back)`.

> **So the drawing already shifts the pelvis to preserve its ESTIMATED mass position. If the physics is later made to rotate the mass parts (engine-target row 1) and the rig is simply handed the rotor angle, the two compensations can CANCEL or DOUBLE.**

**Codex's prescription is the right one and should govern row 1's build: agree the pivot and the frame FIRST, then derive the visual fold from the same physical pose** — not from an angle handed across.

### ⚠️ AND A THIRD CORRECTION FROM CODEX, TO A DOC I MERGED MINUTES EARLIER

Clip 10's §0.8a said the 0.87 s window **"sits inside"** Forsyth's 0.96 ± 0.04 s. **It does not: the arithmetic band is 0.92–1.00 s and 0.87 is BELOW it.** And **the ± is a summary of a GROUP MEAN, not a range for individual surfers**, so "inside the interval" was never the right test. **Corrected in place** (`video-ref-10-mentawai-drone.md` §0.8a).

**What survives, and it is the useful part:** the **0.26 s** and **0.87 s** are **two honestly-labelled windows of the same manoeuvre** — 0.26 is first rail spray → board stops swinging, 0.87 adds the arm/weight set-up and the exit. **Both are useful when labelled; neither sets an animation duration; and the 0.26 s must never be set against Forsyth**, being a sub-window of a different quantity.

**This is the second Forsyth correction from the same source in one evening**, and together they retire that row as an anchor: **835 turns of mixed types, radius and lateral g derived rather than measured, the ± a group-mean summary.** **Only the duration column carries weight, and even that is not a per-rider range.**

### Two peer-handling notes worth keeping

**Codex reads this conversation directly** — *"I read your response in this same conversation; no Claude return address or relay via the video reader is needed"* — **so replies go in my own message text, not through `SendMessage`.** That resolves the misrouting that sent two messages to the video-10 reader. **And `ListAgents` shows no Codex peer, so there was never an address to find.**

**It asked twice that its messages not be treated as build requests, and they have not been.** Nothing here was built; the two findings are recorded and the measurement they imply is a separate round.

## 🔧 MERGE PRACTICE, CORRECTED (2026-11-18) — stop rebasing branches that do not need it

**The video-10 reader complained that "every PR I open is being closed and hand-copied to main", costing it a fresh ~1.1 GB worktree per cycle on an 8 GB machine, three cycles deep.** **Half of that is wrong and half is a fair hit:**

- **Wrong:** nothing is hand-copied. Each branch is **rebased onto `main` and fast-forwarded**, so its commits land intact.
- **Fair:** **because the rebase rewrites the SHAs, GitHub cannot auto-close the PR**, so it is closed by hand and reads `CLOSED, mergedAt: null` — **and any follow-up branch is stranded on a dead parent, which is what cost it three worktrees.**

**THE RULE FROM NOW ON:**

```
git merge-base --is-ancestor origin/main <branch>   # already descended from main?
  YES → push it AS-IS. No rebase. SHAs survive, GitHub auto-closes, nothing is stranded.
  NO  → rebase (it is genuinely behind), and expect to close by hand.
```

**And the deletions check earns its place again, in the sharpest way yet.** PR #404 was **behind** `main` and its diff read **`0 44`** on `canyon-movement-review.md` and **`0 46`** on this handoff — **merging it would have deleted 90 lines of content added minutes earlier.** **Its two real corrections were applied on top instead** (`376a0dbe`). **A branch's age is a hazard, not just an inconvenience: always read the deletions column against the merge base before merging anything, however trivial it looks.**

## 🔎 STILL UNTRACED: WHO SAID THE OWNER CHOSE AN OBJECTIVE

**The video-10 reader's corollary is correct and is adopted: a reported RESTRICTION deserves tracing too, even while it is honoured.** *"An unsourced restriction and an unsourced authorisation have the same unknown author; it is only the cost of being wrong that differs."*

**So the open item stands: some session told someone that the owner had chosen "one Canyon bottom turn carrying speed into the climb" as the first playing-agent objective. That source has not been identified.** `ListAgents` shows **no Codex peer** — only this session and one idle Claude Desktop session. **Codex reads this conversation directly and needs no return address, so it cannot be queried for its own sources through the usual channel.** **The owner has been told, and the objective is still not recorded as a ruling.**

## 📡 STANDING PRACTICE (owner's instruction, 2026-11-18): **"always stay in contact"** with the Codex agent

**The owner confirmed they have a Codex agent running on the same work and told Claude to hand off everything and consult continuously.** Their words: ***"good do that, always stay in contact"***.

### THE CHANNEL IS A FILE, and it is `docs/research/new-rider/3.5/consult-codex-2026-11-18.md`

**Why, so nobody re-litigates it:**
- **`SendMessage` is impossible** — `ListAgents` shows **no Codex session** (only this session's own subagents and one idle Claude Desktop session). **Two replies sent to a guessed address reached Claude's own video-10 reader**, which had never spoken to the owner and had made none of the suggestions attributed to it.
- **Codex reads this conversation directly** and has said so twice and demonstrated it — **so writing here does reach it, one direction at a time** — but a transcript **depends on both sides reading at the right moment.**
- **A file in the shared checkout does not**, it is unambiguous and durable, and **the owner can see both sides of it.**

**Convention, written into the file:** append under your own heading, **sign it**, **do not edit the other's text**, and **state the population and the frame with every number.**

### WHAT "STAY IN CONTACT" MEANS IN PRACTICE — do this, not just when asked

1. **After any round that lands a finding, a correction or a ruling, append a short entry to the consult file** — what landed, its commit, and anything that changes a question already posed there. **Do not wait to be prompted.**
2. **Read the `Codex → Claude` section before dispatching anything in the movement track**, so two agents do not measure the same thing twice.
3. **Keep the six open questions current.** When one is answered — by Codex, by a round, or by the owner — **mark it answered in place** rather than leaving it to look open.
4. **Anything Codex reports about the owner's words is traced, not assumed.** The asymmetry stands: **a restriction may be honoured from a peer; an authorisation may not.** And the corollary the video-10 reader added and Claude adopted: **a reported restriction deserves tracing too, even while it is honoured** — *"an unsourced restriction and an unsourced authorisation have the same unknown author; it is only the cost of being wrong that differs."*
5. **Content that can be checked needs no trusted provenance.** Both of Codex's code findings were **verified here by reading before being recorded**, which is why its unverifiable origin cost nothing.

**Status at the time of writing:** the file is committed at `1cd3a1df`; **Codex has not yet appended.** The six questions are open, led by **(Q1) whether pairing the hip clamp's impulse is geometry or force** — which decides whether the owner must rule — and **(Q2) which pivot and frame to agree before the trunk row is built**, which is the cheapest real change on the 18-row target.

### Queue, 2026-11-18 — video 14 added. **Owner's ruling: GEOMETRY ROWS FIRST.**

| # | URL | scope |
| --- | --- | --- |
| 11 | `https://www.youtube.com/shorts/Ew5j1uqExVA` | whole — **reading** |
| 12 | `https://www.youtube.com/shorts/HhJo76wwkZc` | whole |
| 13 | `https://www.youtube.com/shorts/9k-MU6Q5Lhc` | whole |
| 14 | `https://www.youtube.com/shorts/8d_lrXoiRa4` | whole |

**And the owner chose the build order when asked how long the work would take: *"geometry rows first"*.** They were given the split honestly — **the 9 geometry rows are 6–10 rounds, one to two days at this pace and estimable; the falling is diagnosed but has NO date after twenty-seven rounds** — and told that **the two halves are separable**, so they can have *"a surfer whose movement looks right, who still falls."* **They chose the look.**

**The gate on rows 1 and 2:** Codex's pivot-and-frame answer (consult file Q2). **`poseHinge` already shifts the pelvis by `backForMass` to hold its estimated CoM, so building the physics rotation without agreeing the pivot risks cancelling or doubling it.** Codex is out of usage. **So the build starts with the geometry rows that are NOT gated — and row 3 is an acceptance test, not a build; row 12 the owner has already ruled (C and E).**

## ⭐⭐⭐ STEP 3.5f (merged `c28d058f`, PR #405) — **THE HYSTERESIS LEAD IS CLOSED, AND THE GATE ITSELF IS THE ANSWER TO "UNRESPONSIVE"**

`docs/research/new-rider/3.5/planing-latch-band.md`, reader `3.5/latch.ts`. Read-only; **no `src/` change**. All figures **`RIDER=new FELT=deck BODY=two`** — the owner's own address. **Merged WITHOUT a rebase**, the first to use the corrected practice: the branch was already descended from `main`, so its SHAs survived.

### 1. The same stick DOES produce a different ride in the band — and it is TOTAL, not a gradient

Each run paired against itself with **one input changed** (stick never touched vs hard over), same water, placement, stance and entry; **133 numeric columns a frame.**

| face | state | run-pairs | frames | column-values | mismatches | share |
| --- | --- | --- | --- | --- | --- | --- |
| s16 (Canyon-matched) | **off the plane** | 24 | 561 | 74 613 | **0** | **0.00 %** |
| s16 | planing | 42 | 1 093 | 145 369 | 89 366 | **61.48 %** |
| f73 (owner's water) | **off the plane** | 27 | 1 095 | 145 635 | **0** | **0.00 %** |
| f73 | planing | 36 | 1 312 | 174 496 | 108 419 | **62.13 %** |

**Inside the band itself: 0 of 125 419 column-values on 943 off-plane frames at 3.0–4.0 m/s, against 61.6–63.5 % on the plane.** **So it is the GATE, not the speed** — the two latch states are **steering and no steering**, and inside the band which one you are in is history. **Both histories were built from entry speed alone, a thing a player causes; `planing` was never set by hand.** Null controls at matched speed spacing separate cleanly (heading 4.00–32.39° against 0.00–0.57°; peak yaw 98–339 against 2–44 °/s), and **100 of 100 latch changes across 204 runs match the rule in the source.**

### 2. ⚠️ BUT THE BAND IS THIN AND ONE-SIDED ON THE OWNER'S OWN SPOT — **so it CANNOT be carrying the complaint. The lead is CLOSED.**

Real Canyon (`?canyonWaves=true`, `canyonBed: 'b'`, stage 2, seed 1, medium), **24 riders, 1 291 live frames, stick at 0:**

| entry | riders | live | below 3 m/s | in the 3–4 band | band ON plane | band **OFF** plane |
| --- | --- | --- | --- | --- | --- | --- |
| **2 m/s** | 12 | 541 | **100.0 %** | **0.0 %** | 0 | **0** |
| **5 m/s** | 12 | 750 | 29.8–43.7 % | **8.1–10.2 %** | 66 | **0** |

**Every band frame on the owner's spot is ON the plane. The off-plane side of the band is never occupied.** On the bench the longest any run sits there is **0.033–0.733 s**.

### 3. ⭐ BUT IT DOES EXPLAIN "UNRESPONSIVE" — via the gate at `PLANING_DROP`, not the hysteresis above it

> **100 % of 541 live frames of the slow Canyon riders are below 3 m/s with the ask cap at EXACTLY 0.** **A rider positioning at walking pace on the real Canyon has no steering authority at all, whatever his history.**

And **6 of 12 fast riders cross `PLANING_DROP` at t = 0.77–0.82 s** and then spend **0.53–1.08 s off the plane while still attached.** **That is the measured form of the owner's own words.**

### 4. ⭐ THREE UNEXPECTED FINDINGS, TWO OF WHICH CORRECT MY BRIEF

**(a) Three speeds, two of them 4 — and THE POP-UP USES THE WRONG ONE.** The latch tests `hypot(v.x−flowX, v.z−flowZ)` (`:3493`); the cap tests **the component along the heading** (`:3524`); and the **mount** tests `board.velocity.length()` (`:2857`) — **with the water's flow still in it** — which runs a median **0.46–0.72 m/s ABOVE** the latch's own quantity. **So the pop-up latches the board ON at 3.655 m/s (s16) / 3.856 m/s (f73) through the water — inside the band — and the state the whole ride inherits is set by a quantity the latch never reads again.**

**(b) The mount flips TWO things off that one test, and my brief said "the stick's whole authority", which was too narrow.** `reset:2857–2860` sets `planing` **and `banked`** — the body's placement, plumb across versus square to the deck. At the crossing, frame-1 bank is **−0.039° off / +8.717° on** (the face's whole tilt). **With the stick never touched — the ask identically 0 on both sides — that channel ALONE carries peak |Δroll| of 48.95–70.03° and 8.04–32.39° of heading.** **The body's starting bank is a bigger lever at the mount than the cap is.**

**(c) Isolated, the cap's own channel turns the board WITHOUT rolling it.** With `?mountAgree=deck` pinning `banked`, the crossing flips `planing` alone: **Δheading 12.59–13.47° in 0.27 s** against nulls' 0.00–1.99°, but **peak |Δroll| only 2.12–2.89°** while peak **|Δbank| is 10.94–13.44°.** **The authority appears in yaw and the BODY's bank, not the board's roll — which sits exactly beside 3.5d's finding that the roll is the ankle's.** Stick never touched, the channel is inside its own nulls — inert, as it must be.

### 5. Refuted, including its own first design

The hysteresis band as the home of "unresponsive". That the latch gates only the ask cap (it also gates `banked` at the mount, `projecting` at `:3620`, the tall projection at `:4199`). **And its own opening design: a matched-speed bin comparison inside the band CANNOT answer the question** — the two states' frames in a bin come from different trajectories at different stages of their own roll, several bins are carried by one run, and the medians do not separate. **Printed with that caveat; the paired stick is the instrument that works.**

### 6. ⭐ THE SWITCH THAT ADDRESSES IT IS ALREADY ON `main`

The round named **`?askCap=4.5`** as *"the planing gate removed, `TURN_RADIUS = 4.5 m` kept"* and **believed PR #389 was unmerged. It is not — `askCap` shipped as `660cc94e`**, and the caller verified the line: **`const most = this.askUngated || this.planing ? held : 0;`** (`:3531`) — **so any `askCap` value removes the gate and applies the formula at every speed.**

> **So the owner can ride the fix tonight: `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&askCap=4.5` — the planing gate removed, their own radius kept. §3 and §6 say that is the switch that would give the slow Canyon rider a stick at all.**

**The other one-liner — the mount reading the latch's own speed — is named and explicitly NOT recommended**, because §5 shows the cap's channel there is small while §4(b) shows the `banked` channel beside it is not.

### Known gaps, stated

On the f73 face with `?mountAgree=deck` **the probe's own counterfactual `design()` throws `singular` four runs in**, so §5's single-channel read is **s16 only, 6 pairs**; whether the degeneracy is in the ride or only in the probe was not chased. **Untested: the stick moved DURING a run** (every arm holds its stick), and a **bigger or two-train Canyon sea** than seed 1's medium swell.

## ⭐ VIDEO REFERENCE 11 (merged `7081e34f`, PR #406) — **THE FIRST SINGLE CONTINUOUS RIDE**, the fastest turn rate in the series, and the "above the head" abstention settled

`docs/research/new-rider/3.5/video-ref-11-one-ride-60fps.md`. **One rider, one wave, one camera, NO CUT — 0 → 11.78 s, 707 frames, 60 fps.** `tabId` **`tab-2`**. **1080p ceiling** (the third clip in a row with a different ceiling). Rider 440–520 px.

**⭐ And it called itself a montage TWICE from 0.3–0.5 s thumbnails and was wrong both times**, then refuted itself with **four independent checks** — frame-to-frame luma at 60 fps peaking at only 2× the median, a horizon row drifting smoothly throughout, a continuous boardshorts centroid, and whole-frame verification of the four windows it doubted. **A second person paddles in the background at 2.40–2.76 and never rides.** **This is the series' best piece of self-correction: both of the skill's cut detectors are blind when every shot would share the same rider, board, beach and light.**

### WHAT THE MOVEMENT IS

**He rides folded and he never stops turning.** Across 10.4 s his **trunk sits at 40–50° from vertical nearly the whole time, over legs flexed nearly the whole time**, and he **reverses the board NINE times — one every 1.2–1.5 s, the fastest rate in the series.** **He is upright exactly once:** climbing the face at 7.86–7.92, trunk **15–20°**, legs long, arms wide. **Everything else is an arrangement of fold.**

**Rate across the series, and the spread is itself the finding:** V7 **0 in 13 s** → V9 **one per 2.3 s** → V10 **one per 1.2–1.9 s** → **V11 one per 1.2–1.5 s.**

### THE CHANNELS

- **Trunk fold ~15° → 75°, about 60° of travel — the THIRD clip to reproduce ≥60°** (V8 17→76, V9 5→70). Hand-measured, ±5–8°, 27 samples.
- **Arm carriage: five carriages, the commonest being BOTH HANDS LOW OVER THE DECK (4 windows)** — **a fourth clip for that row** — **and it occurs at both a moderate fold and the clip's deepest open-face fold, so carriage does not track depth.** Confirmed yet again.
- **Hips aft / shoulders forward on 7 frames**, and **0 steps in ~4.1 s** of legible feet.
- **Leg depth: NO RUNG NAMED.** See below.

### ⭐ THE BIG ARM — "ABOVE THE HEAD" IS SETTLED, and it is manoeuvre-specific

**2 of 2 climbing turns took it; 0 of 2 trim windows did.** Turn 1 at 1/60 s: rear arm above the shoulder **7.433**, **above the HEAD 7.467**, board still flat **7.500**, rail banks **7.533–7.567** → **lead +0.07 to +0.12 s**, the rise takes 0.17–0.22 s, held ≥0.17 s. Turn 2: **+0.13 to +0.20 s**.

> **Video 10 abstained on "above the head" because a drone looking down hides a raised hand. This clip settles it: IT DOES GO ABOVE THE HEAD.** And the arm-lead figure is now **three clips**, not two.

### ⚠️ OPPOSITE-DIRECTION CHANNELS — LOOKED FOR AND NOT FOUND

**Across seven resolved transitions, every one was same-sign or one-channel-alone.** **So V9's opposite-sign passage stays SINGLE and is now once-NOT-reproduced** — that matters, because it is the acceptance test for engine-target rows 1–3.

**But "one channel while the others are frozen" is reproduced THREE TIMES here:** **trunk alone 0.36 s** (6.61→6.97), **legs alone 0.10 s** (8.70→8.80), and **arms alone ~0.10 s** with legs bent, trunk folded and the board flat — **which is clip 10's finding reproduced on a different rider.**

### ⚠️ THE FOOTAGE ASK NEEDS A THIRD CLAUSE, and this clip earned it the hard way

**It delivered two thirds of the ask — bare legs, knees never inside the boardshorts, near side-on — and the leg chain STILL REFUSED on all 8 frames, at five magnifications (1.9×–3.0×) with a silhouette outline.** New cause: **at 1080p the rider is 440–520 px, his thigh ~110 px, and the two legs overlap in projection.**

> **Three refusals, three distinct causes: projection saturation (V7–V9), raised lens + boardshorts (V10), resolution + limb overlap (V11).** **THE ASK IS NOW: water-level, side-on, knees not inside the boardshorts, AND THE RIDER AT ≥900 SOURCE PIXELS.**

**And the backup ruler failed a second time, on a different camera: apparent stature read 7.6 head-lengths at t = 0.500 and 7.5 at t = 7.000** — two postures anyone can see differ — **on a long lens panning from above the rider's head, not a drone.** **So head-lengths are unsafe on ANY lens above the rider.** Check the horizon's row against the rider's.

### ⚠️ A DISAGREEMENT ON THE SERIES' MOST REPRODUCED FIGURE — recorded, NOT averaged in

**Its trim fold half-cycle reads ~0.36 s against V8/V9's 0.55–0.60 s**, which this handoff has been calling *"the most reproduced figure the series has."* **The round marked its own measurement WEAK — one rider, one 0.9 s window, 6 samples at 0.18 s — and refused to average it in. And the clip's OTHER trim window shows no cycle at all.** **So the pump cadence now has a dissenting measurement and must be quoted as 0.5–0.6 s across three clips with one weak dissent at 0.36 s, not as a settled number.**

**Also declined deliberately:** the deepest leg tuck is at the **top** of the manoeuvre, over the lip, and **it refused to add that to the turn-load row's population** — *"an airborne tuck, not a turn's load beat."*

### METHOD — six findings, all now in the skill

**`computer zoom` buys NO resolution** (its own result says *"cropped from a screenshot, not magnified"*) — five magnifications bought nothing. **A runaway `javascript_tool` loop is killed cleanly by RELOADING THE PAGE.** **`requestVideoFrameCallback` NEVER FIRES WHILE THE PANE IS HIDDEN**, so the seek that cured stale frames at 1440p needs the pane shown — it fell back to poll-based seeking. **Both cut detectors are blind on same-rider footage; only a whole-frame sheet at ≤0.1 s settles a cut.** **An automated 60 Hz trunk tracer was built, validated, FOUND READING 9° WHERE THE HAND READ 39–43°, and discarded** — recorded so no later round rebuilds it. **Slow motion: 2× and 4× excluded, but by duration comparison only** — **weaker than clip 10's whole-cycle exclusion**, because no ballistic quantity was available.

**Eleventh consecutive clip with nothing for head and gaze.** That row has now failed eleven times and should stop being asked of video.

## ⭐⭐⭐ STEP 3.5g (PR #407, **NOT MERGED — the classifier refused, the fourth time, so it is the OWNER'S**) — **THE ARM CARRIAGE CHANNEL. THE FIRST GEOMETRY ROW SHIPPED, AND THE FIRST THING THE OWNER WILL SEE.**

Branch `claude/arm-channel`, **descended from `main` — pushable with NO rebase, so it will auto-close.** **11 files, 1 115 insertions, 4 deletions** — all four the usual switch-list lines (the import list, `main.ts`'s comment and `undefined`-pins, `SurfZoneRunner`'s passthrough), **caller verified.** It renamed itself from 3.5f to **3.5g** because another session took 3.5f mid-build.

### THE SWITCH

**`?armCarry=on`** — the whole channel. **`?armCarry=rest`** — the rest carriage only, whatever the stick says (row 15 alone, for an A/B). Conventions followed, **and `armCarry: undefined` is pinned in `main.ts`'s online overrides with a test that reads `main.ts` — which matters more than usual here, because the drawn hands are ON THE WIRE (`RIDER_SNAPSHOT.points`).**

### IT BUILT THREE ROWS AND HANDED BACK TWO — the discipline is the point

| row | built | why |
| --- | --- | --- |
| **4** arm carriage as its own channel | **yes** | the drawn hand is placed from the **arm** and **trunk** parts; the pivot decision moves neither |
| **5** the arm **leads** then **holds** | **yes** | independent once row 4 exists |
| **15** both hands low over the deck | **yes, to the WAIST** | **hands at the *deck* is a trunk fold** (V8's most-crouched frame: hands at the deck, leg chain 95 %) — that is **row 2, gated.** Stops at **0.60 m**, below the pelvis's 0.78 m |
| **6** pumping is trunk fold not leg depth | **NO** | its own row says *"downstream of rows 1–2"* — the channel it must run in **is** the gated drawn trunk |
| **11** the down-transition is not one thing | **NO** | its own row says *"a constraint on rows 1–3, not separate work"*; two of its three forms are trunk forms |

> **Building 6 or 11 without the trunk would have produced a leg-depth pump and a single down-transition — exactly what those rows exist to say is wrong. The gate held.**

### WHAT THE OWNER WILL SEE — every figure off the DRAWN points, never a commanded value

Read off `AttachedRider.renderPoint` (what the rig solves `drawnHand` from and what goes on the wire), **never off `armCarriage.reach`:**

- **Stick straight:** both drawn hands drop **>0.25 m** and draw **in** along the board, on the stringer inside the rails to 1e−9, **legs untouched** (leg height and both drawn feet identical to the plain rider's **to the last bit**).
- **Stick over:** the **rear** hand ends **>0.5 m above** the lead; the lead goes **out across** toward the inside rail, the rear the **other** way. **Mirrored by the stick's sign to 2 dp, swapped by stance.**
- **Stick hard over:** the rear hand goes **above the head** — **1.55 m against the head's placed 1.38 m.** **A half stick keeps the pairing and does NOT raise it.**
- **Four distinct drawn carriages at ONE leg height** (sticks 0 / 0.45 / 0.8 / 1), against the footage's ≥4.
- **The lead, on 24 arms** (3 tow speeds × 2 stances × 4 sticks, flat water): hand at a fifth of its carriage in **1–2 frames**, board's first degree of roll at **6** → **+0.0667 to +0.0833 s, `qt(0.5)` +0.0833, positive 24 of 24, 18 of 24 inside the footage's 0.07–0.30 s band.** ⚠️ **One frame of resolution, threshold-dependent, flat water not a wave — the sign is solid, the magnitude is one frame wide.**
- **The hold:** 0.2 s after the stick returns the carriage is still **>60 %** loaded, falling by 0.5 s.
- **Snap composes rather than fights:** `HumanoidRig.snapHands` copies the snapshot point then lerps toward the water, **so the carriage sets where Snap's lerp starts.**

### DEFAULT BYTE-IDENTITY — measured, as a test

**The seven part masses, the board's full pose and the rider's own state, every frame of 3 s — 180 frames × 42 columns = 7 560 values a run — stick hard over, BOTH switch values against the default: 0 differences.** Reference arms exact: **`f73-l` 18 of 18, 0.617–2.533 s, `qt(0.5)` 1.450 s** and **`s16-l` 18 of 18, `qt(0.5)` 1.033 s**. **Canyon B byte check `a367d938f15fa934` / `9e5831f80e38abd9` — the published reference exactly**, 3 600 steps, **fresh spin-up (47.2 s)**, wrapper an **object** prepended so `devTools.ts:9` did not silently bench the default, grid read **400 × 451 = 180400**. Suites: `tsc -b` clean, `src/physics` **60 files / 651 passed / 21 expected fail**, `src/scene/rig` + `src/game` **70 / 742**, `SurfZoneRunner.test.ts` **43 of 43** by hand. **And `armCarriage.ts` contains no solve, ledger, mass or force code — the caller grepped it; the only matches are comments saying so.**

### ⚠️ TWO SEATBELT FACTS EVERY FUTURE ROUND NEEDS

1. **`f73-g` IS BROKEN ON `main`, AND IT IS PRE-EXISTING — established with a control.** Its documented spelling (`FACE=1.4,7.32,5.7`, default relative entries) throws **`Error: singular` out of `inverse()` identically on an UNMODIFIED `main` checkout at the same line.** The other obvious reading gives **24 of 24 at `qt(0.5)` 1.450 s — not 4.650 s** — so **its invocation is not recoverable from the docs and nothing rests on it.** **The third reference arm is unavailable to every round until its spelling is recovered.**
2. **⚠️ `qt(v, 0.5)` IS THE UPPER MIDDLE ELEMENT, NOT A MEDIAN.** **`f73-l`'s plain median is 1.3665 s; its `qt(0.5)` is the published 1.450 s.** **So every "median" in this track that came from `qt(0.5)` is an upper-middle quantile.** The trap was already in the handoff's trap list; **this is the first time it has been shown to change a published headline figure.**

### ⚠️ TWO PREMISES OF MY OWN BRIEF IT REFUTED

**(a) Row 5 is NOT "re-ordering two existing constants, no new constant".** `MOTOR_LAG` (0.05 s) and `ARMS_TIME` (0.15 s) are the clock of **`HumanBalance.arms`, which is an INERTIA** — re-ordering them moves `swingInertia` (6→10 kg·m²), `riderYawInertia` (+0.85) and `TWIST_BODY_ARMS`, i.e. **physics, inside an otherwise drawing-only switch.** **It left both exactly as they are** and gave the carriage **two NEW drawing-only constants** instead. **`engine-target.md` row 5's "no new constant" does not survive and should be corrected rather than quoted.**

**(b) Gating the carriage on the balance alarm was refuted ON THE BENCH BEFORE IT SHIPPED.** Its first build faded the carriage with the margin so a near-fall would read as it ships. Measured (default rider, `PlaneWater` 6 m/s, frames 31–180, 150 frames a cell, 1 run a cell, 3 cells): **`balanceMargin` median 0.948 / 0.444 / 0.537 at sticks 0 / 0.45 / 1, lowest 0.901 / 0.003 / 0.038.** **This rider's margin sits near a half through a turn, so a margin-gated carriage would have been 7–13 % present in a median turn frame — invisible in exactly the turns it is for, and the first ride would have looked like nothing was built.** Dropped. *(Small population, quoted as the reason for a design choice, not as a figure about surfing.)*

### VIDEO 11 LANDED MID-BUILD AND CONFIRMS EVERY DESIGN CHOICE

It rebased, read `video-ref-11-one-ride-60fps.md`, and folded it in. **The strongest confirmation: it had built `over` to answer the TOP of the stick's throw only, off V10's bottom-turn-yes/top-turn-no and V9's roundhouse — and V11's independent "2 of 2 climbing turns take it, 0 of 2 trim windows do" survives it as a count. Designed before that read landed.** Also: **"above the head" settled** (V10 abstained because a drone hides a raised hand; V11's lens is side-on) — **that is exactly the `over` carriage**; the lead's reproduction is now **three clips, four riders**, so **`engine-target.md` §4.6's "two clips" should be corrected**; row 15's population → **4 clips**; carriage's depth-independence → **4 clips refuting it.**

**⚠️ And one shape it names that the channel CANNOT draw, recorded so no round claims it:** **V11's carriage B — lead arm forward-down at chest height with the rear arm back and LOW (3 windows).** Its pairing takes the rear arm **up** and back (V5/V6/V7). **It needs no force and is not built.** Also **V11's carriage C pairs the overhead rear arm with the lead arm down-FORWARD where this draws it down-ACROSS** (V5/V6/V7's *"at the rail, board or knee"*) — **two clips point slightly different ways and it says so rather than smoothing it.**

### NOTHING WAS STOPPED FOR NEEDING A FORCE

**Exactly one expression changes — the standing hand branch of `renderPoint`.** `partPosition`, the seven point masses, the CoM, `bodyInertiaAt`, `riderYawInertia` and `HumanBalance.arms` are **untouched.** No clock, timer, fatigue or stamina; no self-release; nothing on the game's initiative (Ruling E). **The halves that DO need a force are named in the target and were not approached:** row 4's *"the owner's if the arms are to move the board by more than their inertia"*, row 15's *"the owner's if the hands are to do more than their existing drag"*.

### ⭐ THE OWNER'S SHOT LIST, on `?canyonWaves=true`

Base: `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two`
1. **`&armCarry=rest`**, stick straight — **both hands low and drawn in, legs exactly where they were.**
2. **`&armCarry=on`**, stick straight, then **hard over each way** — **lead hand down toward the inside rail, rear arm up and back, rear hand ABOVE THE HEAD at full stick, and still up for a moment after the stick comes back.**
3. **The same with a HALF stick** — the pairing arrives, **the overhead arm does not.**
4. **No switch**, as the control.

## ⭐⭐⭐ VIDEO REFERENCE 12 (merged `1c5fb7d9`, PR #408) — **ROW 2 IS MEASURED DIRECTLY: 80° OF TRUNK WHILE THE LEGS BARELY MOVE**

`docs/research/new-rider/3.5/video-ref-12-maldives-montage.md`. *"Jay Phillips in the Maldives"*, **39.341 s, 1440×2560, 24 fps**, read in full. `tabId` **`tab-3`**. **Merged as-is with no rebase — it auto-closed.** **The biggest rider the series has had:** head 76–130 px, standing-equivalent stature **≈650 px** and **≈1000 px** in the closest framings.

### ⭐ THE HEADLINE — the first clip ever to measure BOTH channels on the SAME frames of ONE shot

> **Two frames of the same shot, 2.4 s apart, same camera, same in-frame ruler: trunk `10°±8 → 90°±6` (+80°) while `hip-above-deck ÷ head-length` goes `3.83±0.4 → 3.22±0.5` — a ratio of ×0.84 ± 0.17, AN ERROR BAR THAT STILL CONTAINS "NO CHANGE AT ALL".**

**That is `engine-target.md` row 2 measured rather than argued**, and **80° is the widest trunk span in the series** (V8 59°, V9 65°, V11 60°). **The trunk moves the whole way while the legs essentially do not.** Every earlier clip could only show the two channels on different frames or different shots.

### ⚠️ THE LEG CHAIN REFUSED A FOURTH TIME — AND IT KILLED HALF OF MY OWN FOOTAGE ASK BY DELIVERING IT

**The clip removed every earlier obstacle at once: bare legs, the knee visible as a joint, a rider 1.3–2× bigger than clip 11's, and TWO WHOLE SHOTS FILMED DOWN THE LINE FROM BEHIND — which is exactly what engine-target §6 asked for. It still saturates.**

> **So V9's geometric mechanism is now DEMONSTRATED rather than inferred: the knee is visible, the bend is visible, and the ratio still reads 100 %.** Cause: **thigh foreshortening.** **And "down the line from behind" is WORSE, not better — from behind, the thigh points AT the lens instead of across it.**

**⭐ And it produced the admissibility test that should gate every leg-chain reading from now on, needing no hip landmark: the PROJECTED THIGH/SHIN RATIO.** Anatomy ~**1.0–1.1**; it measured **0.31, 0.58, 1.15, 1.38, 1.52**. **Five attempts: one clean, one marginal, three refused — and both admissible readings are on frames where he is plainly extended**, which is the saturation in miniature.

**⚠️ AND IT CORRECTED CLIPS 10 AND 11: "the backup ruler is dead on any raised lens" was TOO BROAD.** **Apparent stature is dead because it CONTAINS the fold; `hip-above-deck ÷ head-length` does not, and it still responds** (3.83 → 3.22, in the direction the eye says). **A usable ruler is rescued.**

> **THE FOOTAGE ASK, CORRECTED A THIRD TIME: water-level, SIDE-ON — emphatically NOT from behind — knees not inside the boardshorts, rider ≥900 source px.**

### OPPOSITE DIRECTIONS AND ONE-CHANNEL-FROZEN

- **Trunk-vs-legs opposite-sign: NOT FOUND in 6 resolved transitions.** **So row 3 is SINGLE and now TWICE-not-reproduced** (clip 11's 7 transitions, clip 12's 6). Its own framing is right: ***"it remains the right acceptance test; it is not a frequency claim."***
- **BUT arm-vs-trunk opposite signs: FOUND 3 of 3 turns** — the arm rises while the trunk folds, **0.17–0.33 s.** **Recorded as its own weaker line, not merged into row 3.**
- **One-channel-frozen: 5 instances**, including **the whole body frozen 0.25 s** while the board planes (**V10's 0.44 s reproduced**), **the arm held 0.58 s** while the board rotated from vertical to flat, and **trunk-alone for 0.88 s** (**clip 11's 0.36 s more than doubled**). **Now on FOUR clips — the best-reproduced transition fact the series has.**

### ⭐ TURN RATE — "THE RANGE IS THE REQUIREMENT" IS NOW DEMONSTRATED *WITHIN ONE RIDER*

**It is a montage of 8 shots, all seven cuts confirmed at the native 1/24 s grid, so the whole-clip number is worthless.** Per shot: **S3 ≈6 changes in 7.96 s = one per 1.3 s; S6 1.7 s; S5 2.3 s; S8 2 in 9.59 s = one per 4.8 s, with ZERO in its last 6.2 s.**

> **S3 and S8 are the same rider, same session, same camera — and they are 3.7× apart.** **Row 8's "the range is the requirement" is no longer a between-clips observation.**

### THE BIG ARM — four clips now, and the exception reproduced

**6 of 7 turns took it; 0 of 2 trim windows (1.75 s, 16 samples).** Lead **+0.04 to +0.12 s** on the three turns timeable (two more lower-bounded by cuts), **held 0.33–1.4 s.** **The one turn that declines it is carried on the LEAD arm reaching past the rail — V9's cutback exception reproduced in form, two clips, two riders.** **The arm lead is now on four clips**, against `engine-target.md` §4.6's corrected count of two — **that count needs updating again.**

### ⚠️ THE PUMP CADENCE WEAKENS FURTHER

**None — 0 half-cycles in 2 clean trim windows totalling 1.75 s at 0.125 s resolution (16 samples). This rider folds MONOTONICALLY rather than cycling.** It contributes **nothing either way**, and **it matches clip 11's other trim window, which also had no cycle.**

> **Population now: 0.55–0.60 s on TWO clips, one weak dissent at ~0.36 s (V11), and TWO clips with no cycle present to measure. It is no longer "the series' most reproduced figure" and must stop being quoted as one.**

### TWO FIRSTS, AND A THIRD FORE-AFT SEGMENT NOBODY HAD SEEN

- **A deep folded crouch held ≥5.7 s, still held when the clip ends — DOUBLE V5's 2.9 s record for row 12.** But **it names NO DEPTH for it** (the hip is unfindable in whitewater) and **an early "~47 %" was computed and WITHDRAWN.**
- **THE FIRST READABLE FACE IN TWELVE CLIPS** — eye, nose and mouth at a 90–130 px head, **head turned along the board's travel with the gaze below horizontal**, in 4 frames. **Row 18 has had no target at all in eleven clips; this is a start, not a target.**
- **⭐ NEW AND IN NO PRIOR READ: the head and neck are thrust FORWARD of the shoulders by 110–230 px — a THIRD fore-aft segment** — **and it explains why thumbnails read as "folded" at frames whose trunk measures 10–18°.**

### METHOD — four findings, all now in the skill, and two contradict what it said

**⭐ A SMALLER VIEWPORT IS STRICTLY BETTER FOR MEASURING.** The canvas→screenshot scale is **0.625 at 1280×1000 — not the 0.78 clip 9 recorded, so the scale is NOT a constant and must be measured** — and **exactly 1.0 at 800×640**, where a 790×594 crop renders **1:1 for ~55 % more usable pixels.** **Stream quality and screenshot scale are two different knobs: maximise the first, minimise the second.**

**☠️ SURVEY STRIPS LIE ABOUT ANGLES.** Reading 0.26× strips it wrote **"~70°"** for frames that measured **32–43°** at 1:1, and **"~45°"** for one that measured **10°**. **Strips find a moment; they never measure one.** Every angle it published came from a gridded frame at **≥0.86×.** **It did not rebuild the automated tracer.**

**A PUBLISHED QUALITY CEILING CAN BE FICTITIOUS:** `hd2160` is published here and **A/Bs identical to `hd1440`** at the same field of view and final size. **Four clips, four ceilings, and the fourth shows the label can mean nothing** — the binding limit here was **motion blur at 24 fps.**

### Housekeeping it raised, and the correction to it

Its §5 says *"main's `b3598cac` (step 3.5g) reports rows 4, 5 and 15 as built"*. **Precisely: `b3598cac` is the HANDOFF ENTRY recording 3.5g; the CODE is in PR #407, which the classifier refused and which is still the owner's to merge.** **So those three arm rows are accurate about `main`'s `src/` as it stands, and will stop being accurate the moment #407 lands.**

---

## 2026-11-18, late — CODEX ASKED A CHECK AND IT FOUND A DROPPED QUANTITY: ROW 19

Codex sent a clip-11 read and a code correction through another session. **Both halves of the correction were
verified here by reading before being recorded** — the standing rule is that content which can be checked needs no
trusted provenance.

### The correction: half reproduction, half a real find

**Reproduction (no change).** *Asymmetric drawn legs and arms are already expressible.* True —
`HumanoidRig.ts:1132` is `for (const side of SIDES)` with a per-side `ankleTarget`, a per-side `kneePole` and a
per-side `solveTwoBone(hip, …, this.joints.knee[side], …)` at `:1174`; `snapHands:2021` singles out the low rail's
hand; `freeArm`'s swing is gated on `isRearFoot(state, side)`. **But `engine-target.md` row 10 already said this**
from the caller's end (`stanceMap.ts:423–424`). **Two readers, two routes, same conclusion — worth recording as a
reproduction, and it does not move the classification.** Row 10 is **force** not because the drawing cannot show a
split but because **`standingBody.ts` has no per-side anything in 386 lines** (one leg line, one load, one rest;
two knees only as a strength cap `2 τ / d`), so **nothing physical differs between the two legs to drive a split
from.** A drawn split with no physical cause is the thing the owner's rules forbid.

### The find: THE HAND'S ROLL AND PITCH MOMENT IS COMPUTED EVERY SUBSTEP AND THROWN AWAY

Codex asked me to *check* — not asserted — whether a loaded hand's local roll/pitch moment is represented
separately from its net force and its yaw, before anyone proposes layback tuning. **It is not.**

```
applyWater   :4502   this.waterForce.add(force);
             :4504   this.waterMoment.add(cross(arm, force, …));   // arm = hand − position: the FULL moment, right lever
standingHand :4357   this.handYaw = this.waterMoment.y - moment;    // only .y is differenced out
couple       :4735   rhs[4] += torque.y + h * this.handYaw;         // only the yaw row receives it
```

- **The board** gets the hand's force at the **feet's** lever — `torque = cross(a, f)`, the same `a` gravity is
  booked at — plus the yaw patch. The hand's own roll and pitch moment about the board is **never added.**
- **The body** gets it as a **net force on its centre-of-mass line**: `standingBody.couple(…, f, …)` is handed
  `f`, never a per-part moment.
- **So a hand in the water can yaw the board and push the body, and cannot roll or pitch either one. A layback has
  nothing to lean on.** Tuning a layback today would be tuning a channel that cannot express what a layback does.

**It reads as an omission, not a decision.** Every `handYaw` line arrived under one commit, `58396bff`,
***"feat: drag a hand in the face to stall"*** — a stall is a yaw-and-drag effect, so **yaw was the feature's whole
scope**, and nothing in the code weighs the other two components. Contrast the swing, which carries its decision in
a comment — *"the board feels only the push at the feet, not its couple"* — **correct for an internal body torque,
and not the same case as an external force from the water.**

**Classified a LEVER CORRECTION, not a new force**, and this is the part Codex has been asked to push back on: the
force exists, is paired, and is booked in the bank ledger; **two of three components of its moment are discarded.**
Restoring a real force's real point of application **adds no energy and invents no motor**, so by the owner's rule
it needs **no ruling**. The contrast is **PR #215**, an *invented* yaw moment with no limb behind it, which the
owner rejected — **this is the opposite: a visible limb's real moment that was thrown away.** If that reasoning is
wrong the owner must rule, so it is recorded as contested until Codex answers.

**Not built.** The owner's live instruction is *"geometry rows first"* and this is not geometry. It ships behind a
switch when its turn comes, because it moves default physics for every rider and the owner rides the verdict.

**`engine-target.md` is now 19 rows**, with a new kind of its own: *lever correction — restores an existing paired
force's point of application; needs no ruling, but moves default physics.* Counts: geometry 9, force 2, blocked by
survival 3, unknown 3, already correct 1, **lever correction 1.**

### Still the only live blockers, still Codex's

**Q2, the pivot and the frame** — gates rows 1 and 2, the cheapest real change in the table, and video 12 has now
measured row 2 directly (**10° → 90° of trunk while hip-above-deck moved ×0.84 ± 0.17, an error bar containing "no
change"**). **Q1, the hip clamp's discarded `Δ(I·rate)`** — gates whether the owner must rule at all.

**Video 13 dispatched, deliberately blind:** Codex says it is reading clips 11, 12 and 13 too, and our reader has
**not** been told what Codex found. **Two blind reads that agree is evidence; two reads compared first is one read.**
Clip 11 is the precedent — Codex saw a leg asymmetry at 4.10 s, and the series' only other sighting is V8's two
frames.

---

## 2026-11-18, later — CODEX ANSWERS Q1 AND Q2, OVERTURNS MY ROW-19 CLASSIFICATION, AND THE TRUNK'S NUMBERS ALL FALL

Four exchanges in one evening. **Three of them corrected me**, and the largest correction is to a headline I had
already given the owner.

### 1. Row 19 reclassified — I was wrong three ways and Codex was right three ways

| my claim, hours old | Codex's correction |
| --- | --- |
| *"a hand in the water cannot roll or pitch the board or the body"* | **The net force already contributes roll and pitch through the coupled force path**, at the feet's lever. The missing quantity is narrower: the **hand-specific residual moment about the rider reference**, whose standing path retains **world Y only** |
| *"two of three components of its moment are discarded"* | **Two omitted components say nothing about the fraction of torque lost.** The residual's magnitude has never been measured. It counts components, not share of moment |
| *"restoring a real force's real point of application adds no energy, so it needs no ruling"* | **False. A change to the lever changes angular work by the residual moment dotted with the angular velocity.** Moving a force's point of application is a dynamics change, not bookkeeping |

**So row 19 is a force-application / constraint-model change and THE OWNER MUST RULE.** My "lever correction, mine
to build" is withdrawn; the kind has been removed from the table and row 19 moved into **force** (now 3: rows 9, 10,
19). Codex's conditions if it is ever built: **preserve the force and its reaction exactly once**, and check
**sign, reference origin, body DOFs and rotational work on every path.** Codex adds explicitly that its advice
**gives no authority to enable it** — correctly, since a peer cannot authorise anything.

**What still stands, and it is the useful part:** the hand's own roll and pitch moment about the board is computed
at `:4504` and discarded at `:4357`/`:4735`, so **a hand in the water cannot roll or pitch the board at its own
lever** — a layback leans on the feet, not on the hand. And `58396bff`'s scope (*"drag a hand in the face to
stall"*) still reads as an omission rather than a decision.

### 2. Q1 — ANSWERED

> *"The paired angular impulse at a hard stop is the constraint reaction. Finite braking alone cannot guarantee
> closure, especially at a moving limit. If inertia changes, separate momentum due to the stop from momentum due to
> the inertia change."*

So of the two options put to Codex, **it is the first**: pair the clamp's own `Δ(I·rate)` as a constraint reaction.
**Making `braking` sufficient cannot work** — and note the limit here *is* moving, because the hip's range is
`stanceRoom(depth)` and depth changes under it. The third sentence is a trap nobody had named: **`HIP_PITCH_INERTIA`
is not constant across a depth change, so the momentum bookkeeping must separate the stop's impulse from the
inertia change's.** A constraint reaction is force-class, so this is **the owner's** too.

### 3. Q2 — ANSWERED, and rows 1 and 2 are UNBLOCKED

> *"Use the physical pelvis point (part 0) and the rotor torque axis `this.across` in the same frame as `couple()`,
> with an explicit neutral offset and sign. Drive visual and physical trunks from that one state. Decide which
> coordinate is constrained (feet and solved COM) and solve one compatible pelvis translation; stacking
> `backForMass` on top can move the pelvis twice. Check regular and goofy and the board frame under bank."*

**Builder dispatched** on exactly that, in its own worktree, behind an opt-in switch with the default to be proven
unchanged. Codex's two rig additions are in the brief: **share the pelvis pivot and a single mass-position
correction**, and **keep the hand target free to change at similar leg heights** (V13 found 3 distinct carriages at
one leg state).

### 4. THE BIG ONE: ROW 2 HAS NO USABLE NUMBER, AND MY HEADLINE TO THE OWNER IS WITHDRAWN

I told the owner video 12 *"measured row 2 directly — 80° of trunk while the hips barely moved."* **Three
independent findings have since taken that apart, and all three arrived within the hour.**

1. **The trunk angle has an admissibility gate of its own** — the exact analogue of the leg chain's — and V13 is the
   first read in thirteen to test for it. Projected shoulder→waistband ÷ head length must sit near **1.6–1.8** for
   the trunk to lie in the image plane. **Six attempts: two clean (and both were *vertical* trunks), one marginal,
   three refused. No visibly-folded frame has ever passed it.**
2. **The companion ruler has a confound.** Hip-above-deck ÷ head length moves with **stance width** — the feet
   moving apart lowers the hip with **no knee change at all**. V12's ×0.84 was never checked for equal foot
   spacing. Codex adds that **the ± 0.17 contains 1, so it permits a modest hip drop just as much as no change.**
3. **And the decisive one: a span is not a lower bound.** Foreshortening can only shrink a **single** angle from
   vertical under a level camera **with fixed yaw**. *"Differences of two projected angles are not automatically
   lower bounds on true angular travel when yaw changes. A fixed lean swivelled from facing the lens to side-on
   changes its apparent angle with zero change in anatomical flexion."* **V12's two frames sit 2.4 s apart inside a
   turn.** V13's own consolation — *"foreshortening only shrinks an angle, so all four spans are safe as lower
   bounds"* — is refuted by its other half.

> **After thirteen clips there is no gated measurement of trunk angular travel anywhere in the series.** Not 80°,
> not 60°, not a rate. **Any 80-degree image-plane change is a reference for visual range, not a prescribed rotor
> angle.**

**The builder was corrected twice in flight** and told not to tune to any footage angle. **Rows 1 and 2 are
unaffected in their justification**, because that justification is structural and needs no camera:
`HumanoidRig.ts:1383–1385` leaves the drawn trunk with **no channel of its own.** **(Narrowed 2026-11-18 by Codex, correcting me: the default hinge is stage- *and* depth-driven, and the tall/deep followers and `leanIn` CAN change it at a fixed depth — so "impossible at any value" was too strong. The real defect is narrower and confirmed: there is no independent mass-coupled rotor. Nothing couples the drawn fold to the body's mass.)** The acceptance test is row 3's capability question, not a magnitude.

**This is my recurring error for the record, and it is the same one:** one clip, two frames, promoted to a headline,
then handed to a builder as an acceptance number. The rule stays *say the population with the number* — and now
also **say the gate with the angle.**

### 5. Video 13 (PR #410, not merged) — and its headline is refuted too

The clip is one unbroken 17.7 s shot at Kandui. The reader published **"one posture held 8.75 s continuously
visible."** Codex re-read it at **2160×3840** — about 3.6× the reader's 594 px canvas — and found:

- **2.31–2.66 s** hips near knee height, thighs approaching level, one arm trailing; **3.14 s** both legs lengthen
  and both arms project forward with the upper hand above the head; **3.45–3.70 s** the rider bends again. **One
  clear compress–extend–compress episode while setting the line**, with the board heading changing through it.
- **The rider is hidden at 4.68 s and 8.99 s, and only his legs are visible at 11.32 s** — so a *continuous* hold is
  **unverifiable**, never mind measurable.
- A quiet supported tube trim **does** exist: 7.15, 8.08, 12.67, 13.44, with small adjustments, and a **distinct
  late release at 13.72–14.07**.

**Row 12's duration and row 15's both-hands-low count must be corrected before either is quoted.** The reader has
been resumed to fix its own document and PR.

**What survives from V13, and it is a lot:**
- **Row 3 is three-times-not-reproduced: 18 resolved transitions, three riders, not one instance** of the two
  channels moving in opposite directions. Keep it as rows 1–2's acceptance test; **strike any reading of it as a
  frequency.** The footage does not ask for this to happen often — it asks that the engine not make it impossible.
- **Row 5 — CORRECTED, and the correction cut the OTHER way.** The reader first published *"the arm lead is absent in 3 of 3 direction changes"* — its first miss in the series. **Re-sampling at the native grid found a lead in the very passage its coarse survey had skipped:** rear hand above the crown at **3.100 ± 0.033 s**, the board still flat at 3.200 / 3.233 / 3.266 and banked by 3.300, so the rail bites at **3.283 ± 0.017** — **lead = +0.18 s ± 0.05, held ≥0.20 s**, inside the existing band. **So 0 of 3 becomes 1 of 4, and the series tally is 11 of 15 across five clips.** And the *shape* is worth more than the count: **the one lead is on the open-face turn where he sets his line; all three misses are inside the slab.** So a built lead should be **conditional**, not universal. A **fifth arm carriage** is added too — both arms forward, rear hand above the crown.
- **Row 6: 0 pump half-cycles in 1.70 s of trim.** The 0.55–0.60 s cadence now stands on 2 clips, 1 weak dissent and
  **3 clips of "no cycle present."**
- **Row 10 NOT MEASURED, and said so** — one knee admissible (thigh/shin 1.10), the other refused (2.66). Row 10
  stays at V8's one clip, two frames, **on footage that finally met the §6 geometry ask.**
- **Row 18:** the face is resolvable at 77–102 px, gaze down the line and below horizontal. Still no head-yaw
  figure, because **no frame has both the face and the board's nose legible** — that is the next footage ask.

### 6. ☠️ A STALE-FRAME FAILURE THAT DEFEATS BOTH EXISTING DEFENCES

With the pane **hidden**, decode froze while `document.hidden` reported `false`, `readyState` was 4, every seek
resolved, `currentTime` returned exactly what was asked, **and the canvas stamp was correct while the picture was
seconds old.** It produced two tidy 1.4 s runs of identical frames that read as editorial freeze-frames and **would
have been published as data.** Caught only by an **out-of-order probe: 45 pairs, all zero, including frames 7 s
apart.** Second new cause: **a YouTube Short carries two `<video>` elements after a reload**, and
`document.querySelector('video')` returns the empty one. Fix: show the pane, reload, select by `videoWidth > 0`.

Also: the binding cap on magnification is the **594 px canvas, not the viewport**, so a 700 px rider caps at 0.814×
however it is drawn — **paired comparison frames cost nothing in scale.**

### 7. Process note

A subagent switched the shared checkout to its own branch mid-commit, moving it off the branch this session was
committing on. **No work was lost** (the row-19 commits were already pushed and `main` was untouched), but from now
on **every agent that touches git gets a worktree.**

---

## 2026-11-18, §5 SUPERSEDED IN PART — the clip-13 reader corrected itself, and one correction ran backwards

The reader verified every one of Codex's points on its own frames before changing anything, **found them all right**, and then the same re-sampling **reversed one of its own claims in the opposite direction from the challenge.** PR #410 now carries both commits; it is still open and must not be merged on the first version's figures.

**What the clip actually supports:**

| claim | first version | corrected |
| --- | --- | --- |
| the held posture | "8.75 s, continuously visible" | **longest stretch shown unchanged: 0.60 s (19 native frames).** Longest *readable* stretch of any kind: **3.77 s** (4.98–8.75) |
| row 12 | "a new longest hold" | **row 12 gains nothing from this clip** and does not beat V12's ≥5.7 s |
| visibility | continuous | **t = 8.990 the rider is not in frame at all**; **4.680** an unreadable shape under the lip; **11.320** legs and board only |
| row 8 | ~3 direction changes | **4** |
| row 15 | carriage A credited "0.00–7.00" | **6 windows, each with its sampling interval** — the old span contained a hand above the head |

**Two method failures, both the reader's own and both now in the skill:**

1. **A 0.5 s survey landed on look-alike frames** at 2.50 / 3.00 / 3.50 and read a compress–extend–compress as a hold. **The episode is unmistakable at 0.1 s:** deepest 2.6–3.0, most extended 3.10–3.20, bending again from 3.33, board banked by 3.300.
2. **Three of that survey's twelve tiles were foreground paddlers, not the rider.** The reader *noticed they looked odd and did not act on it.* **That is the whole failure in one sentence** — and it is the same shape as every entry in my own error file: a sample whose frame was never checked.

**The rule that came out of it, and it is a good one:** ***a posture claim needs timing-grade sampling; a visibility claim needs full frames.*** One coarse contact sheet produced two opposite errors here — a hold that was not held, and a lead that was there and was missed.

**An instrument asymmetry worth carrying forward:** `hd2160` on this clip delivered 2160×3840 and then **froze the decode outright** — first frame real, every frame after identical, caught by the out-of-order probe. So **Codex's read had about 3.6× the resolution of ours on the same frames**, and where the two differ on a fine angle **the higher-resolution read wins.** The document marks which figures are ours alone at 1440p.

**The footage ask is rewritten a fourth time: ~45° off the board's axis, level with the deck.** Clip 12 delivered down-the-line, clip 13 delivered water-level side-on, and **the measurement chain refused on both.**

**Row 2's status is unchanged and explicitly stated in the document and the skill:** *after thirteen clips there is no gated measurement of trunk angular travel anywhere in the series, and the published spans are not even lower bounds wherever yaw moved.* **Rows 1 and 2 are left intact on the structural argument** — `HumanoidRig.ts:1383–1385` needs no camera. **What goes is the number in row 2's target column, not the row.**

### A note for PR #407 (the arm carriage channel), which is the owner's to merge

The corrected row 5 says a real lead is **conditional** — present on the open-face turn where the rider sets his line, absent in all three slab turns. **#407's lead is not conditioned on the wave at all**: it is emergent, from a carriage that *"rises fast and returns slowly, so the hand can arrive before the rail bites"*, driven by **the player's own stick and never leg depth**. **That may be the right kind of conditionality** — the player moves the stick deliberately when setting a line and holds it in a barrel — **but that is an inference, not a measurement**, and it is written down here as one. **It is not a reason to hold the PR**: #407 is drawing-only, opt-in, and the owner rides the verdict.

---

## 2026-11-18, night — CODEX PUBLISHES ITS REVIEW, ANSWERS ROW 1, AND FINDS A METRIC THAT CANNOT FAIL

### The review is now a durable artefact, not a relay

**Branch `codex/surf-motion-11-13`, commit `00428a45`, file `docs/research/new-rider/3.5/independent-video-review-11-13.md`** (38 lines, in this repo's refs — `git show codex/surf-motion-11-13:…` reads it). **Read by me in full before anything here was written.** It covers clips 11, 12 and 13, maps them to the engine, and reviews the trunk builder's working diff. **Its engine mapping agrees with ours on every row it touches**, including row 19's framing (*"the specific omission is the residual off-centre moment in the other two world components. Its magnitude and effect on a ride are unknown"*).

### ROW 1 IS ANSWERED — THE BUILDER CONTINUES, WITH THREE THINGS EXPLICITLY EXCLUDED

> *"Moving existing masses about a specified physical pivot is a geometry change in implementation with real dynamics consequences (gravity lever, inertia, wet position, possible energy exchange). Row 19 instead changes the explicitly applied generalized external torque. Both can change a ride. An isolated opt-in trunk branch for owner inspection fits the geometry brief, with no inference of energy neutrality or authority to enable defaults, add corrective forces, or accept the feel. If additional torque/work is needed, return that separately to the owner."*

**So row 1 stays geometry and the builder runs** — but note what is withheld: **no energy-neutrality claim**, and **no authority to enable by default, to add corrective forces, or to accept the feel.** The last is the owner's by standing rule anyway. **And the operative instruction for the builder: if the fold needs extra torque or work to behave, that is the FINDING, not a thing to add.** Relayed in those terms.

### ☠️ A METRIC THAT CANNOT FAIL, caught in the builder's live diff

**`comGapOf(parts, masses, hip − trunkFold)` yields ZERO BY CONSTRUCTION at matched angles — even if the wrong body parts or the wrong axis were rotated.** It is a tautology, and the builder may have been about to publish its zero as proof that the mass moved. **Replacement relayed:** derive expected positions from the **neutral geometry**, compare the **actual transformed head and torso** against them and the **pelvis and legs against being unchanged**, **including the rendered output.**

**This is the most expensive error family in the whole project** — a probe that reads correct whatever the code does. Compare the 64–93 % frozen frames, and the three rounds built on a slip term with the wrong sign.

**And a companion caution: a probe reading the rig's INPUT points stops upstream of the final skinned pose.** With the substep ordering (`updatePosture` / `foldTrunk` before `preparePitch` advances `hip.angle`), **the two likeliest ways this round produces a false result are both measurement frames, not code.**

**One scope limit, also relayed:** `waterForces` samples at the **folded part position** but computes only the **rigid-body velocity `v + ω × offset`** — **no relative hinge motion, no local-COM recentre term** — so **nothing may be claimed about what the fold does to drag or to work** from this code as it stands.

### A CORRECTION TO OUR OWN READER'S CLAIM ABOUT RESOLUTION

Our clip-13 reader wrote that *"the other read had ~3.6× my final resolution on the same frames"* and that **the higher-resolution read should win on any fine angle.** **The review's own method section narrows that:** clip 11 was reviewed at **720 × 1280**; clips 12 and 13 were **surveyed at 720 × 1280 and 360 × 640 respectively**, with **critical sequences** checked on the 2160 × 3840 streams, and the displayed portrait frames about **600 px wide** with the rider roughly **100–190 px tall early and ~250 px on exit**.

**So the 3.6× advantage holds for the sequences it chose to check at 2160, and NOT for its survey of clip 13, which was coarser than ours.** A blanket "their read wins" is itself a frame error. **Per-figure, not per-reader.** The clip-12 high hand *is* one of the verified ones — **23.52 and 23.68 on the 2160 stream** — so that one stands.

**Convergent, and worth noting because it was reached independently:** the review's own method section says *"A timestamp can stay stable while a player is painting an older frame."* **Two readers hit the stale-decode failure on the same day, from different tooling.**

### PROVENANCE RESOLVED — and the claim is still not the owner's

The handoff has carried an **unattributed** item: *some session reported that the owner had chosen "one Canyon bottom turn carrying speed into the climb" as a first objective.* **The source is now identified: it is this review**, whose opening paragraph states *"For Canyon, the owner's target is one bottom turn that carries speed into the climb."*

**Identifying the source does not confirm the claim.** A peer reporting the owner's words is not the owner's words — **a restriction may be honoured from a peer, an authorisation may not** — and this is an objective, which is closer to an authorisation. **Status: source known, claim unconfirmed, nothing built against it.** It needs one sentence from the owner, and until then it stays off every brief.

### Video 12's document is now marked

`video-ref-12-maldives-montage.md` carries a **banner after its title** and a **§CORRECTIONS section**: the 80° span withdrawn with all three reasons, the contested t = 23.5 frame, the intermediate reversal between the two headline frames, and **the knock-on nobody had noticed — if the 23.5 frame has a hand beside the head, then this clip's "carriage does not track depth" loses its first half, and what remains (high hand at the straightest legs, low hands at the deepest crouch) is CONSISTENT with arm height tracking depth.** Row 4's refutation survives on V6–V9 and V11, but **V12 is struck from that evidence until the frame is re-read**, and may become a dissent.

### A verified bug in the arm branch (PR #407), and why the cheap fix is insufficient

Codex found it on `bc5cf144`; **verified here by reading before acting.** In `stepArmCarriage`, `ask` is `Math.abs(steer)` and `reachAsked = ramp(ask, ARM_REACH_FROM = 0.25, ARM_REACH_FULL)` with `state.reach` decaying over `ARM_HOLD_TIME` — **but `const side = ask > 0 ? Math.sign(steer) : 0` adopts the sign of ANY nonzero stick in one substep.** The magnitude is thresholded and filtered; **the side is neither.**

**The failing input is exactly what the owner will produce while looking at the arms:** hold a full steer, release, nudge the other way in **0.06–0.24** — nonzero so the side flips, below the threshold so nothing pulls the reach in. **A still-extended lead hand crosses the board in one substep**, the raw target moving about **2 × 0.22 m**. Drawing only; no force implicated. Downstream IK softens it and a hand contact may mask it, **but the target jumps.**

**The cheap fix does not work, and the arithmetic is recorded so nobody proposes it again.** Gating the side latch on `reachAsked > 0` only **narrows the band**: hold +full, release, push **−0.3** with `reach` still 0.6 and the side still adopts instantly — the hand jumps `2 × 0.22 × 0.6 ≈ 0.26 m`. **Any reversal above the threshold with a residual reach reproduces it, scaled.** **The magnitude-plus-latched-sign representation is the defect.**

**Fix in flight on `claude/arm-channel` itself** (so #407 updates, no fork), on a **continuous signed reach** that sweeps the hand through centre — which the footage supports anyway. **Two risks named rather than assumed:** the `ARM_LEAD_TIME`/`ARM_HOLD_TIME` asymmetry **is** the arm-lead mechanism and must stay asymmetric about distance from zero; and **`ARM_SIDE_DROP`'s hold may conflict** — a naive signed filter would drift the hand to centre during the very hold that is supposed to keep the rail. If they conflict, **keep the lead and say so.**

**Budget at the time of dispatch, since the one-agent rule came from a credit squeeze that no longer binds:** Weekly · all models **30 %** with 6 d 3 h to reset, 5-hour **23 %**. Two surfer-track agents running deliberately.

### The arm snap is FIXED — and "0.44 m in half a millisecond" is the honest severity

**PR #407 now carries four commits** (`bc5cf144` the channel, then `816f3903` the fix, `a239308b` the seatbelt table, `684719d4` the runner). **1412 insertions / 4 deletions against the merge base — verified by me, and all four deletions are long single lines this branch itself had already replaced in place.**

**The representation changed, not a threshold.** `state.reach` is now **−1 to 1**, target `ramp(|steer|, FROM, FULL) * sign(steer)`, and a rail change is **the state passing through zero**. Verified by reading the shipped function: the rise/return asymmetry is kept as `reaching = |reachAsked| > |state.reach| && (state.reach === 0 || reachAsked * state.reach > 0)` — **away from zero on the side it is already on is fast; a return or a reversal is slow.** `armCarriagePlace` uses the **magnitude** for `out`/`lift` and the **signed** value for `across`; `renderPoint`'s `* this.carriage.inside` is gone; `state.inside` is now **derived** (`|reach| < ARM_SIDE_DROP ? 0 : sign(reach)`) and nothing in the drawing reads it.

| worst one-substep lateral move, lead hand, 18 cells | old | new |
| --- | --- | --- |
| reach 1.000 at the reversal | **0.4348–0.4400 m** | 0.0052–0.0497 m |
| reach 0.846 (0.1 s released) | 0.3681–0.3788 m | 0.0044–0.0437 m |
| reach 0.651 (0.3 s released) | 0.2833–0.3011 m | 0.0034–0.0501 m |

**Three things worth more than the fix:**

1. **"The narrow fix is not enough" is now MEASURED, not reasoned.** I had argued it by arithmetic — a reversal above the threshold with a residual reach jumps anyway, scaled. **The 0.651 row at −0.3 is exactly that case and it jumps 0.28 m.** The cheap gate is dead on evidence.
2. **The severity was understated by everyone, including me.** A standing rider runs at `STANDING_SUBSTEPS = 32`, so the real substep is **≈ 0.52 ms**. **The old latch moved 0.44 m in half a millisecond.** The signed carriage's largest possible move in one of those is **≈ 0.003 m.**
3. **It was NOT masked downstream** — the hoped-for negative result did not happen. Read on `renderPoint` as the carriage's own contribution (switch on minus an identical twin with it off, in the board's frame, so the board's roll and the body's swing difference out), a loaded +x turn then a **−0.12 flick** then hard over **stepped 0.3960 m in one frame** on the old code. **The jump reached the drawn hand.**

**`ARM_SIDE_DROP`'s hold survives with NO trade, and the reason is structural rather than lucky:** the rail is now the sign of `reach` itself and `reach` decays on **exactly the `ARM_HOLD_TIME` curve it always did**, so the hold keeps its rail for precisely as long as the reach lasts — **the identical curve, not a similar one.** The risk I flagged (a naive signed filter drifting the hand to centre during the hold) **cannot occur, because the quantity that holds and the quantity that carries the rail are now the same number.** All 13 existing assertions pass **unchanged**; 3 added, and **all 3 fail on the pre-fix code**, checked by restoring both files from `HEAD`.

**Default path proven, not asserted:** both call sites are gated on `this.armCarry` (`undefined` by default), and `armCarry.test.ts` compares the seven part masses, the board's full pose and the rider's state **every frame of 3 s — 7 560 values a run — with the switch on and off, 0 differences**, for both switch values. **No force, torque, damper, brake or velocity added or changed. Drawing only.**

#### ⚠️ ONE OPEN QUESTION, AND IT IS THE OWNER'S RIDE TO SETTLE

**A reversal is now slow on the way in and fast on the way out.** By the shipped condition the hand retracts on `ARM_HOLD_TIME` until `reach` crosses zero — **0.42 s to the stringer** — and then, the signs agreeing, goes out **fast** on the new rail, arriving at **~0.57 s**. **So the question is only about the first half.**

**The alternative — running the retraction on `ARM_LEAD_TIME` too, sweeping in ~0.24 s, which sits inside V11's measured 0.17–0.22 s rise — is NOT RULED OUT and NOT ADOPTED.** The builder kept the conservative rule because it changes nothing that already existed and nothing measured asks for the other. **It tried to measure whether the arm still *leads* the rail through a reversal and the bench failed outright:** towed at 6, 8, 10 m/s on `PlaneWater`, +1 for 1.2 s then −1 — the board's roll never returns inside the live window at 6 m/s, and **the rider separates at 0.50 s (8 m/s) and 0.25 s (10 m/s), so "rail answered" is `NaN` in 3 of 3 arms.** Recorded in the module, the commit and README §10.5. **This one goes to the owner's eye, not to another probe.**

**Housekeeping:** the fresh worktree arrived with **no `node_modules` at all** (not a stale symlink) — worth knowing for the next one. Two agent worktrees are left on disk (`.claude/worktrees/agent-a792386b9ee0b868c` and the clip-13 reader's `scratchpad/wt13`); at roughly **1.1 GB each** they want the owner's word before removal, per the standing cleanup rule.

---

## 2026-11-18, video 14 (PR #412) — ROW 6 REVERSES TOWARD THE GAME, AND THE TRUNK GATE LOSES ITS NUMBER

*"Erin Brooks On Her Last Wave"*, 18.781 s, **25 fps measured twice**, 1080p hard ceiling, one continuous shot, the rider visible in **every frame** of a ~16.6 s ride. Out-of-order staleness probe run and passed (45 pairs). **PR #412, 382 insertions, 0 deletions, open, not merged.**

### ⭐ THE RESULT: ROW 6 IS CONTESTED ON BOTH AXES, AND THE GAME MAY HAVE BEEN RIGHT

**This rider pumps with her LEGS** — four half-cycles in 0.88 s, **≈0.22 s each**, in trim with **no direction change** — **while the trunk stays folded 40–60° and completes no cycle at all.** That is **the opposite channel and 2.5× the rate** of row 6's target (*"pumping in trim is trunk fold, not leg depth"*, 0.55–0.60 s).

**And the reason it is a contest rather than a refutation is sharper still:** V8's and V9's *"the legs are not doing the work"* half was **read off a ⚠️ SAT leg chain** — i.e. **it was never measured.** So either row 6's trunk figure is a range, or its leg half has no evidence behind it. **The reader declined to choose, correctly.**

> **This is the one row in the table where the game is closer to the footage than the series claimed. The game's pump IS leg depth.**

### ⚠️ THE TRUNK GATE SURVIVES AS A METHOD AND LOSES ITS NUMBER

Last night's gate — projected shoulder→waistband ÷ head length near **1.6–1.8** — **does not transfer between clips.** Both of this clip's visibly-vertical trunks read **2.03 and 2.11**. Cause: **this rider wears a bikini bottom, which sits lower than a boardshorts waistband** (0.56 against 0.60 of stature moves the expectation to ≈2.0). **So the gate must be run WITHIN a clip, against that clip's own most-vertical frame — never against a cross-clip constant.** The finding holds; the constant was a frame error of its own.

**Bonus, and the cleanest saturation demonstration the series has produced:** the leg chain reads **95.9 % on a deep side-on crouch (t = 11.350)** and **99.9 % on visibly straight legs (t = 16.600)** — **same clip, same rider, same method, 5 s apart.** Four points across a posture anyone can see.

### ROW 3: ANOTHER ZERO — AND A TENSION WITH PR #411 THAT MUST NOT BE MISREAD

**8 resolved transitions, 0 opposite-sign.** Series: **26 transitions, four riders, four clips, not one instance.**

**PR #411 reports 754 of 1 734 moving frames (43.5 %) opposite-sign with `?trunk=mass` on.** **These are different populations and 43.5 % is NOT a match to anything** — the footage figure counts *resolved transitions in real clips*, the engine figure counts *moving frames on one synthetic `FaceWater` bench where the rotor fires*. **Row 3 is an acceptance test for a capability, and the table already says to strike any reading of it as a frequency.** Say it again here because it is exactly the number a later round would quote as realism: **the engine now does at 43.5 % a thing the footage has never shown once.** That is evidence the channel exists, and **nothing about whether it should fire that often.**

### ROW 5: 13 of 21 across six clips — AND CLIP 13's SEPARATOR DOES NOT HOLD

Two leads: **+0.16 s** (t = 6.60, **inside the broken lip**) and **+0.14 s ± 0.06** (t = 12.98, at the lip on the open face), each held ≥0.20 s. **Twice in six resolved direction changes, both at the TOP of the wave, with all four misses at the bottom.**

**Clip 13's separator was open face versus slab. This clip has a lead INSIDE the foam and a miss ON the open face.** Its separator is **top of the wave versus bottom.** **Two clips, two incompatible separators: the condition is unknown.** So the note against PR #407 is narrowed — **a built lead must only be required to be *conditional*, not conditional on any particular thing.** #407 conditions it on the player's stick, which remains defensible precisely because no wave-side condition has reproduced.

### The rest of the rows

- **Row 4 — the seventh refutation of "tall ⇒ arms spread", in its strongest form yet:** the clip's **straightest legs carry its narrowest, lowest arms** (hands by the hips, trunk vertical), **held ≈1.4 s, the clip's longest carriage.** 5 carriages, **4 at one leg state.**
- **Row 16 — second brace, and the first resolved at the native grid:** the body is **already folded and compressed 0.36 s BEFORE the foam impact and stays frozen on both channels through it.** **Anticipation, not reaction** — which is a different thing to build than a hit response.
- **Row 8 —** 8 direction changes in 16.6 s, **one per ~2.1 s**, the fast end beside V9.
- **Row 15 —** seventh clip, 6 windows at ≤0.25 s.
- **Row 11 —** fourth up-transition, and the **first with no resolvable lead either way** (0.12 s).
- **Row 18 — the first frames with the board's nose AND the head's orientation legible together** (head along the board's heading, 5 of 5 at 0.25 s). **Still no angle:** head 20–31 px against clip 13's 73–102, no facial feature at 5.5×. **The §6 footage ask is unchanged.**
- **Cannot touch, stated:** row 2 (no angle published at all), **row 10 (four legs, four refusals: 0.71 / 0.85 / 1.19 / 1.41 — stays at V8's one clip, two frames)**, row 14 (sixth refusal), row 17 (the board is white, unmarked and in foam, so "no steps" is an impression, not a count).

### Method, for the skill

- **25 fps is not rare — 2 of 14 clips.** A 1/30 step here **manufactures a motionless rider**: measured twice, the frame changes exactly every 0.040 s, **0 duplicates at 1/25 against 2 at 1/30.**
- **A tracker's failure is not the subject's absence.** The reader **withdrew two of its own readings** — four "obscured" windows and one "board only" — after checking full frames; she is visible in all of them. **Three crops had locked onto other surfers and were refused.** This is the same failure as clip 13's foreground paddlers, caught earlier this time.
- **The 2.2–2.5 s composited-canvas wait belongs INSIDE the drawing function**, not between tool calls — sheets returned with the last 2–5 tiles blank until it moved.
- **Fifth clip, fifth quality ceiling** (flat 1080, nothing above). Canvas→screenshot scale **1.0 at 800×640** reproduced a third time.

**The owner's video queue is now empty.**

---

## 2026-11-18, close of the 11–13 thread — CODEX VERIFIES BOTH BRANCHES INDEPENDENTLY, AND QUALIFIES ONE OF MY NUMBERS

**Codex's final review: `codex/surf-motion-11-13 @ fe55d9b4`, `docs/research/new-rider/3.5/independent-video-review-11-13.md`.** It declares the clips 11–13 handoff closed on its side. **The owner relayed the document itself**, which is how its new sections reached this session.

### It verified both builders' branches by reading them, not from our reports

| branch | what Codex confirmed |
| --- | --- |
| **#407** head `684719d4` | contains `816f3903`, and **`renderPoint` uses the signed `place.across` directly** — the latch multiplication really is gone |
| **#411** head `62847809` | **the pelvis ownership guard is present**, it **uses the effective session config** (not the URL), and **the independent neutral-geometry check exists** |

**That is a second reader confirming the two things that mattered most** — the arm fix's representation change, and the trunk build's three safeguards. It also notes independently that **default trim renders more upright** on the trunk branch, and that **the hip rotor stayed quiet in 42 of 60 cases are builder-reported results**, correctly marked as not independently reproduced.

### ⚠️ A FRAME QUALIFICATION ON A NUMBER I GAVE THE OWNER

> *"The reported 0.396 m to ≤0.06 m comparison is the carriage contribution to a hand target, upstream of the skinned wrist."*

**I told the owner it was "measured on the actual drawn hand." That overstates it.** `renderPoint` yields the point the rig **aims at**; the **skinned wrist** is downstream of the IK and was never measured. **So the bug reached the rig's hand target, and how much of 0.396 m survives to the visible wrist is unknown.** The fix's bound (≤0.06 m/frame) is on the same quantity, so **the comparison is sound and only its name was wrong** — but a 0.4 m jump in a hand target is not the same claim as 0.4 m of visible wrist, and this file's whole subject is that distinction. **Corrected to the owner.**

**This is the twenty-ninth entry in the same family**, and note where it came from: the builder wrote *"the jump reached the drawn point"*, which was accurate, and **I escalated "the drawn point" to "the actual drawn hand" in a sentence to the owner.** The error was introduced in the retelling, not in the measurement.

### The skill's gate is corrected where it lives

**Main's skill never carried the 1.6–1.8 constant** — I said earlier that it was "telling the next reader" to use a refuted number and **that was wrong**: the gate exists only on the unmerged `claude/video-13`. **Corrected there instead of in a second PR** (`33167f83`, pushed, #410 updated), so the gate and its correction **merge together** rather than the owner merging a known-wrong constant and a fix for it separately. Reused the clip-13 reader's existing worktree rather than creating one, with the disk at 98 %.

### The Canyon objective, third and last time

The review the owner relayed still opens with *"For Canyon, the owner's target is one bottom turn that carries speed into the climb."* **Codex's covering message now says only that "the Canyon bottom-turn speed and feel remain for Vicente to judge"**, which is a weaker and correct statement.

**Relaying a document is not endorsing a sentence inside it**, so the objective is still unconfirmed and **nothing is built against it.** The question is in front of the owner with the source named. **The review's judging rubric for it is worth keeping either way**, because it is a description of what to watch rather than a target: follow the board from the descent into the trough, through the curved section, into its first sustained climb; **the banked board's change of heading should FOLLOW contact** between rider, board and water; **the rider may lower the hips, fold at the trunk or reach BEFORE the nose visibly comes around**; during the climb the rider can release the turn while keeping enough travel along the face to continue. **Speed through the water and the arc of the board belong to the board model, and the camera pan gives neither a calibrated speed nor a turn radius.**

---

## THE OWNER'S VIDEO QUEUE (live list — the owner's standing rule is **one at a time**)

| # | URL | state |
| --- | --- | --- |
| 15 | `https://www.youtube.com/shorts/3yxY-F_AEds` | **reading now.** Brief leads with **row 6** — in trim with no direction change, which channel cycles? |
| 16 | `https://www.youtube.com/shorts/NQ6dkvD2gHU` | **queued**, dispatched when 15 reports. ⚠️ **ITS BRIEF MUST BE WRITTEN BLIND** — an independent read of this clip already exists in this handoff and **must not be quoted into the brief.** Ask it for a cadence and for the board's roll and heading beside any pumping; do not name a period |

| 17 | `https://www.youtube.com/shorts/nyABF8GNwrU` | **reading now.** Brief leads with **the feet and legs under acceleration**, on the owner's live complaint |
| 18 | `https://www.youtube.com/shorts/2Z_wZFjKAOU?t=2` | **queued** (starts at 2 s), dispatched when 17 reports |

Clips 1–16 are read. **Row 6 is the hottest row in the table** after video 14 contradicted both halves of it, so every brief from here leads with it until two clips agree.

---

## 2026-11-18 — ROW 6's RATE HALF SETTLED (PR #413), AND MY ARITHMETIC WAS WRONG IN THE HALF I WAS SURE OF

**The answer: the game's leg pump reaches the footage's rhythm and not its depth.** Achieved half-cycle **0.217 s** against video 14's 0.22 s — **401 half-cycles over 69 of 72 runs** — carrying **0.078 m of the 0.195 m rung, 40 %.** **The excursion falls below half the rung at 0.27 s, and that is row 6's number.** Governor: the critically damped follower at `LEG_FREQUENCY = 12` rad/s, needing **0.567 s** to come within 5 mm of the rung. **864 runs, 91 562 live ticks, 0 frozen.** Full table in `engine-target.md`'s new status block.

### My arithmetic, graded by the round that replaced it

| what I said | the verdict |
| --- | --- |
| *"√(2·0.195/6) ≈ 0.255 s for the down-stroke"* | **wrong twice.** It **omits the deceleration** — a bang-bang traverse that *ends at rest* needs `2√(d/a)` = **0.36 s** — and the acceleration limit **is not the governor anyway**: measured peak rest rate **0.791 m/s** against `CROUCH_SPEED`'s 1.5 (the speed cap never binds), and the acceleration clamp binds on **3.9 %** of ticks |
| *"4.75/ω ≈ 0.40 s to settle"* | **formula right, and it IS the governor** — but 4.80/ω is the **90 %** point, not 95 %. Measured: 50 % at 0.183 s, 90 % at 0.400 s, 95 % at 0.483 s, within 5 mm at 0.567 s |
| *"which one governs a pump is exactly what I cannot work out on paper"* | **the right instinct, and the answer is the settle.** Any half-period under ~0.6 s is amplitude-limited |
| *"half-cycles ≈0.21 s, essentially the footage's 0.22 s"* | **the right timing conclusion for the wrong reason — AND IT DOES NOT CARRY THE AMPLITUDE.** Timing and amplitude are separate answers and my arithmetic conflated them |

**Every constant I quoted checked out. Only the arithmetic on them did not.** And the shape of the error is the file's own: **I reported a timing match to the owner in a way that implied the pump matched.** It does not — it is 2.5× short on depth. **Corrected to them.**

### The round caught its own version of the same error, before publishing

Its first reading, **off a single tick trace**, blamed the balance's knee drop: released, `human.knees` went 0 → 0.63 in 0.15 s and refilled the target, and **in the key-never-pressed arm the leg walks itself to 0.30 m with `knees` ending at 0.98 in 72 of 72 runs.** Pooled over 864 runs **that is wrong at 0.22 s** — the chain's own asked-for excursion there is **0.194 m over 525 half-cycles.** The knee drop is a **real second mechanism at 0.30 s and longer** (`stanceRoom`'s knee travel is 0.30 m at tall but only 0.15 m at the pumping crouch, `humanBalance.ts:159–160`), **just not the one in the band that matters.** *"One trace is not a number"*, caught by the agent rather than by me.

### The gap that cannot be closed from here

**Nobody knows whether 0.078 m is what video 14's rider does**, because **the footage's leg figures come off a saturated chain (99–100 % on every readable frame).** **The series has no measured pump depth in any clip.** So **40 % of the rung is a fact about the game, not a verdict against the footage** — only the rate was ever comparable. **No change is warranted yet**: the game pumps at the right rhythm with an amplitude nobody has shown to be wrong.

**A metric that cannot fail was checked for, as instructed:** a flattened channel would record no turning point at all and report `none` in every arm — **which is exactly what the two no-pump arms do** (key never pressed: 0 half-cycles in 0 of 72; key held: 4 half-cycles in 4 of 72 at 0.005 m) **and exactly what the pumped arms do not.** The isolated follower at a 1.50 s half-cycle reaches **1.00 of the rung** as a positive control.

---

## 2026-11-18 — AN INDEPENDENT CLIP-14 READ TAKES THE FOOTAGE SIDE OF ROW 6 APART

Codex read clip 14 at 1080×1920 in its own tab. **It reproduces the finding's direction and dismantles its number.**

**What survives:** *"I can reproduce leg involvement and a low trunk."* **So legs cycling while the trunk stays folded stands as a direction.** Its own frames: chest low over the feet at 5.63, the board climbing at 6.12, hips low to the side with one high hand at 6.39, legs lengthening as the board points back down at 6.74; a different arm shape at the 8.44–8.86 crest passage; knees bent at 10.37, an obvious lengthening by 10.69–10.74, bending again by 11.18–11.31, **with no return to an upright trunk.**

**What does not survive — three qualifications, each fatal to a different use of the number:**

1. **The 0.22 s is a within-window average from one reader**, 0.88 s divided by four inside a single window — **not a general cadence**, and not shown to be sustained. *"Please label 0.22 s a within-window average from the original reader, not a general cadence."*
2. **Four equally identifiable half-strokes could not be independently counted**, and **no physical compression is measurable at that camera angle.**
3. ⚠️ **The board was rolling and turning through that passage — "from oblique to nearly end-on".** **So "in trim with no direction change" may not describe the window at all** — and **row 6 is specifically about pumping in trim.** If the pumping sits inside a turn, it is a different observation and row 6's footage evidence is not merely weak but possibly off-topic.

### What this does to last round's result, and what it does not

**PR #413's measurement is untouched.** 864 runs, 91 562 live ticks, `steer = 0` throughout: **the game's leg channel does 0.217 s half-cycles at 40 % of its rung, and 0.27 s is where the excursion halves.** That is a fact about the game and it stands.

**What is withdrawn is the comparison.** I wrote *"within 0.003 s of video 14's 0.22 s"* into `engine-target.md` and told the owner the rhythm matched. **The game figure is sound; the footage figure it was matched against is a one-window average that a second reader could not reproduce, taken over frames where the board was turning.** Corrected in the status block. **Row 6 now has no reliable footage target at all — neither rate nor depth** (the depth was already unavailable: the leg chain saturates at 99–100 % on every readable frame, so **no clip in fifteen has given a pump depth**).

> **So the state of row 6 is: the game's own numbers are known precisely, and there is nothing trustworthy to compare them to.** The classification correction stands (a quantitative shortfall, not an expressibility limit) **but the shortfall is against the game's own asked-for rung, not against any rider.**

**Codex's instruction, adopted:** *"compare achieved game stroke in metres only when a calibrated reference exists"*, and **keep leg depth and trunk angle separately observable** in every brief. **Relayed to video 15's reader while it was running**, told not to try to confirm or beat 0.22 s, and instead to establish for itself whether the clip contains a genuinely trim stretch — no roll, no heading change — before asking which channel cycles in it. **A clip with no such stretch is a legitimate answer.**

**Codex is sending clips 15 and 16 separately.** Ours are reading in parallel and blind, which is the arrangement that has produced every correction in this thread.

---

## 2026-11-18 — INDEPENDENT CLIP-15 READ ARRIVES EARLY, AND IT MAY MEAN ROW 6 IS THE WRONG QUESTION

Codex read clip 15 (**Mikey February, 1080×1440**) and sent its observations **"for the reader after its independent pass"**. **They are deliberately NOT being forwarded to our clip-15 reader until it reports** — the blind-read arrangement has produced every correction in this thread, and Codex asked for exactly that order. Held here.

**What it saw — two clear examples of a low trough entry releasing into a climbing board:**

| t | what |
| --- | --- |
| 7.02 | both hands lower |
| 7.25–7.46 | **the chest reaches nearly level**, one hand nears the water, the other trails |
| 8.10 | **the legs lengthen and both arms open with the nose up** |
| 10.68–11.14 | the low reach recurs |
| 11.50 | the body extends into the climb |
| 11.79 | the high arm and the board rise |
| 12.20 | **the board is nose-down and the knees have tucked again** |
| 13.19 | another low folded reach, preceding a wider turn |
| 14.04–14.89 | **upright chest, low hips, opposed hands** |

### ⭐ THE INTERPRETIVE POINT, AND IT IS BIGGER THAN THE TIMESTAMPS

> *"This clip distinguishes **bending for the turn, extending on the climb and re-compressing on redirection**; counting these phases as **periodic straight-trim pump strokes would overstate the evidence.** Let each transition be available **without cycling every trim**."*

**Two independent clips now point the same way.** Clip 14's "pump" turned out to sit inside a passage where **the board was rolling and turning from oblique to nearly end-on**; clip 15's depth changes are **phase-locked to the turn** — down to load it, up through the climb, down again on the redirect. **Neither is a periodic pump in trim.**

**So the hypothesis worth putting to the owner is that row 6 asks the wrong question.** Row 6 is *"pumping in trim is trunk fold, not leg depth"*, and **both halves may be answering a pattern the footage does not contain.** **Stated as a hypothesis, not a conclusion:** fifteen clips, and **the one window anybody called a periodic trim pump has now been shown to be a turning passage.** The build implication is Codex's own sentence — **make each transition reachable; do not make the engine cycle.**

### THE CONNECTION CODEX DID NOT MAKE: THIS IS ROW 13

**`engine-target.md` row 13 is already *"A low that the turn CONSUMES, rather than one the turn CAUSES"***, measured as *"the sign of the leg-depth change through a turn's load beat — compressing into the arc, or extending through it"*, and classified **"expressible either way today" / unknown, with no clip behind it.**

**Clip 15 is evidence for row 13, and it is the first.** *Bend for the turn → extend on the climb → re-compress on the redirect* is precisely that sign question answered: **the low is spent loading the turn and the body extends through the climb.** **So row 13 moves from "unknown, no evidence" to "one clip, phases named, no calibrated depth"** — and it is **already classified expressible either way**, which means **nothing needs building to allow it; what is needed is for the transitions not to be slaved to a cycle.**

### Row 19's first footage sighting, still not a measurement

> *"The low hand at 14.89 disturbs the surface; **contact is plausible and its load unknown**."*

**Fifteen clips have said contact is unmeasurable; this is the first to call it plausible.** It stays **unmeasured** — and row 19's own gap is that **the hand's residual roll/pitch moment is discarded**, so even a measured contact would have nowhere to act. **No speed gain, pressure split or calibrated depth is claimed**, and none is adopted.

**Where these land, as Codex asked:** this section of the handoff; the row 13 note above; and **delivery to our clip-15 reader deferred until after its independent pass.**

---

## 2026-11-18 — CLIP 16 REFUTES THE CLIP-15 HYPOTHESIS, AND AT ITS OWN CADENCE THE GAME'S PUMP IS NOT SHORT AT ALL

Codex's independent **blind** read of clip 16 (`NQ6dkvD2gHU`, *"Top speed mid length"*) **is a counterexample to the hypothesis I recorded one entry above** — and it says so itself. **Received, confirmed, and held back from our video-16 reader**, which has not been dispatched yet and **must not be given these observations in its brief.**

**An orange midlength keeps travelling screen-left while the rider alternates visibly taller and lower:**

| 7.92 | 8.55 | 9.18 | 9.84 | 10.09 | 10.69 | 11.29 |
|---|---|---|---|---|---|---|
| high | low | high | low | high | low | high |

**Rechecked out of order** (10.69 against 9.18 and 11.29 — the staleness defence applied unprompted): **the front knee folds, the hips approach the deck, then the hips rise and the knees open again with the feet still apart.** **At least three repeated height cycles**, the taller examples **roughly 0.9–1.3 s apart**, sampled postures rather than exact peaks.

> **So the clip-15 hypothesis is refuted, conditionally and on Codex's own stated condition — "IF trim means sustained down-the-line travel."** Clip 15's depth changes are turn-phase-locked; **clip 16's are rider-timed and repeat while the board holds its line.** **Both patterns are real.** That is the same shape as **Ruling C** on Compress, where the owner ruled *"keep the held compress, both patterns are real"* — and the instruction here is identical: **keep both reachable, schedule neither, and infer no required thrust and no global cadence.**

### ⭐ THE COMPARISON CODEX DECLINED TO MAKE, AND IT REVERSES LAST ROUND'S HEADLINE

Codex rightly refuses to compare leg stroke **in metres** — no calibrated depth exists. **But it has given the first properly sampled CADENCE in the series, and a cadence can be compared to the game's own rung fraction without claiming the footage's depth.**

Its highs: 7.92 → 9.18 → 10.09 → 11.29, i.e. **full cycles of 1.26, 0.91 and 1.20 s → half-cycles of about 0.46–0.63 s.** Against PR #413's own table:

| half-cycle | share of the 0.195 m rung the game reaches |
| --- | --- |
| 0.22 s (the withdrawn figure) | **0.40** |
| **0.45 s** | **0.82** |
| **0.60 s** | **0.93** |

> **CONDITIONALLY — and the conditions were pointed out to me, not by me.** The 82 % and 93 % **are valid for the
> prescribed 0.45 s and 0.60 s GAME inputs** and **cannot yet be assigned to this filmed rider**, because **three
> assumptions sit between the two numbers and none was checked**: the 1.26 / 0.91 / 1.20 s are **gaps between SAMPLED
> TALL POSTURES, not measured peaks** (Codex said so when it gave them); **the playback's retiming is unknown**, so
> the clip may not be real time; and **bending and rising need not take equal time**, so halving a full cycle to get a
> half-cycle assumes a symmetry nobody has shown. **The wording that holds: IF the footage is real time AND the
> strokes are symmetric AND the sampled postures sit near the peaks, the implied half-cycle is ~0.46–0.63 s, where the
> game's own table gives 82–93 % of its rung.**
>
> **What survives unconditionally is the direction:** the only cadence anybody has sampled sits **far** from the
> withdrawn 0.22 s, so **row 6's "2.5× short on depth" has lost its basis** — not because a better comparison replaced
> it but because **no comparison is currently available at all.** The game's own limit (**excursion halving at a
> 0.27 s half-cycle**) stands as a fact about the engine. **And the three qualitative cycles are clear and independent
> of every timing assumption above**, so **periodic pumping is real whatever its period turns out to be.**

**What this does NOT establish:** there is still **no footage depth**, so **nothing says 82–93 % of the game's rung is the right absolute depth.** The claim is narrower and worth having: **the follower is not the binding constraint at the cadence real riders use.** **No change to `LEG_FREQUENCY` is warranted, and the case for one is now weaker than it was an hour ago.**

### And a narrowing of my own round's frame — the third tonight

> *"The board rolls and changes angle on the face and the arms and trunk also shift, so this is **down-the-line pumping with board movement**; **a zero-steer fixed-orientation benchmark is a narrower case.**"*

**PR #413 ran at `steer = 0` throughout.** That was the right way to isolate the channel, **and it measures a narrower thing than the footage shows** — real pumping happens with the board rolling and changing angle, and with the arms and trunk moving too. **The 0.217 s / 40 % figures are sound for the case they measure and should always be quoted with that case attached.**

**Nothing measurable about propulsion, in either clip:** *"neither speed gain, absolute speed, leg stroke in meters, nor a unique source of propulsion can be measured from the footage."* At **16.4** the rider leans into a broader turn and **17.2–19.2 is obscured by spray**, so that turn's outcome is unknown.

### Delivery, as asked

**Confirmed received.** Landing here; **the row 6 and row 13 status blocks in `engine-target.md`; and a note on PR #413.** **Forwarding to our video-16 reader is deferred until after its own observations** — it has not been dispatched, and its brief will be written blind.

---

## 2026-11-18 — ☠️ THE PUMP ROUND'S NEGATIVE CONTROL WAS VACUOUS BY CONSTRUCTION, IN THE SECTION THAT WARNED ABOUT IT

Codex's code review of `pump.ts` at `ff750da4`. **Verified here by reading before recording.**

```js
:243   if (key > 0 && !Number.isFinite(firstPress)) firstPress = t;   // set ONLY when the key is pressed
:292   const after = (t: Turn[]) => t.filter((x) => x.t >= firstPress);
```

**In `hold0` the key is never pressed** — `arm === 'hold1' ? 1 : 0` gives 0, and `Number.isFinite(half)` is false, so the square-wave branch never runs. **`firstPress` stays `NaN`, every `x.t >= NaN` is `false`, and `after()` returns an empty array on all four channels** (`restTurns`, `gotS`, `drawnS`, `targetS`).

> **So "hold0: 0 half-cycles, 0 of 72 runs" was produced by the filter, not by the rider.** The round's own section is headed *"Beware a metric that cannot fail — what a broken channel looks like, and that this is not it"*, **and the thing it offered as proof is the tautology.** I quoted it to the owner as evidence the round had guarded itself.

**A control is the easiest place in a round to hide a tautology, because nobody interrogates a zero.** Add that to the file of recurring shapes: **`Number(null) === 0`, `Math.sign(0) || 1`, `qt(v, 0.5)` being the upper middle — and now `x >= NaN` silently emptying a filter.**

**What survives, and it is most of the round:**
- **every positive arm is untouched** — those press the key, `firstPress` is finite on the first tick, and the filter does what it was written for. **0.217 s half-cycles at 40 % of the rung, 0.27 s where the excursion halves, 864 runs: all stand.**
- **`hold1` is a VALID negative control and should carry that weight instead** — the key held down gives a finite `firstPress`, and **4 half-cycles in 4 of 72 runs at 0.005 m** is a real reading of a channel that is not pumping.
- the isolated-follower positive control at a 1.50 s half-cycle reaching **1.00 of the rung** also stands.

**Relayed to the probe author** with the reviewer's fix: a **finite observation start for `hold0` (`START`)**, `firstPress` kept for the actuated arms, and **the control then checked with a deliberately oscillating input trace at the detector boundary** — so the detector is shown to fire when it should, not merely to stay silent when nothing moves.

### AND A CORRECTION TO MY OWN FRAMING, THE FOURTH TONIGHT

> *"`steer = 0` in the probe locks player input only; it does not lock the board orientation or record trajectory/exit speed."*

**One entry above I wrote that #413 is a "zero-steer fixed-orientation benchmark" and that it therefore "measures a narrower thing than the footage shows."** **The first half is wrong: `steer = 0` holds the player's input, not the board's attitude**, so the probe's board could roll and turn like clip 16's. **The useful half of the point survives in a different form: the probe recorded neither trajectory nor exit speed, so a comparison with clip 16's board path is not available from it at all** — not because the benchmark is too narrow, but because the quantity was never logged.

**I took that phrase from Codex's earlier message and repeated it without checking what `steer = 0` reaches.** Same shape as every entry in `one-trace-is-not-a-number`: **a description of a measurement's frame, adopted rather than verified.**

### The filter fault is now EXPERIMENTAL, not inferred — and `hold0`'s real answer is unknown

Codex ran the exact detector and filter in isolation on **eight alternating 0 / 0.04 m samples: six turning points, five true half-cycles, ZERO after the existing `hold0` filter, five with a finite observation start.** **So the filter demonstrably destroys a signal that is there.** ⚠️ **What `hold0` actually gives remains OPEN until it is unmasked** — the control is not "wrong but probably fine", it is **unknown**, and no round may cite it either way until the probe author reports.

### Codex's consolidated clips 14–16 reference

**`codex/surf-motion-14-16` at `6bc742aa`**, file `docs/research/new-rider/3.5/video-review-14-16.md` — the full timestamped review for clips 14, 15 and 16 plus its code references and the minimal control check. **To be used as the common reference once our own independent readers finish**, never before, so the blind arrangement holds. **Clip 15's trough-and-climb cues are recorded two entries above** and are the thing to hand a rider/arms builder when one next runs; none is running now.

---

## 2026-11-18 — VIDEO 15 (PR #414): ROWS 1–2 GET A *REPRODUCED* ACCEPTANCE TEST, AND THE CLIP HAS NO TRIM IN IT

**Mikey February / SHORTYHEAD, 22.661 s, 25 fps, 1080×1440 — a 3:4 stream inside a 9:16 Short, which makes it the largest rider in five clips (head 37–90 px).** Two shots: a 4.08 s opener then **one continuous 18.56 s ride, the longest the series has read**, with **≥10 direction changes, one per ≤1.86 s.** 418 insertions, 0 deletions. Full detail in `engine-target.md`'s new status block.

### ⭐ The result: DECOUPLING, a category nobody was counting

**10 resolved transitions with both channels legible: 3 same-sign up, 1 same-sign down, 2 frozen, 4 DECOUPLED, 0 opposite-sign.** **Opposite-sign is now 0 in 36 transitions over five riders and five clips** — V9's single passage stays single and five-times-not-reproduced. **Decoupling was reproduced four times in one ride.**

**And both are equally impossible in the engine**: `HumanoidRig.ts:1383–1385` forces the drawn trunk's correlation with leg depth to **+1 within a stage**, so **0 is as unreachable as −1.** **So PR #411 should be judged on whether the channels can DECOUPLE, not only on whether they can oppose — and that gives rows 1 and 2 a reproduced acceptance test in place of a single-instance one.** It is the strongest footage justification those rows have ever had, and it came from a category that was not in the table.

### The reader refused the brief's premise, correctly, and it was the right call

**My brief said "a second clip could settle row 6". It could not, and the reason is structural:** the row assumes a clip contains a **stretch of trim** in which to measure a cadence. **This rider turns every ~1.9 s; the longest flat-board, constant-heading stretch in 22.661 s is 0.56 s.** The reader rejected **three** otherwise pump-looking passages after checking the board's roll and heading on full frames (10.80, 13.36, 17.28 — rail roll or a swinging nose), and says plainly: *"A clip with no such stretch is a legitimate answer, and this is one."*

**It also says my mid-run correction is what made that visible** — without it, it would have measured a "pump" across 12.88–14.00 **that contains a bottom turn at 13.4–13.6.** That is the correction chain working: Codex caught clip 14's turning passage, I relayed it, and it stopped clip 15 making the same mistake.

**In the two surviving windows the body's height over the board cycles once while the trunk's fold is visibly unchanged.** **No cadence and no depth published, deliberately** — and **the height change is not called a leg extension in any unit, because the knee is never identifiable as a joint in the whole clip.**

### Convergence with the independent read, and ours supplies the mechanism

Codex's blind read of the same clip found *bend for the turn → extend on the climb → re-compress on the redirect*, and warned that counting those as periodic trim strokes would overstate the evidence. **Ours independently explains WHY it looks that way: there is almost no trim in the clip to be periodic in.** **Two blind reads, one describing the pattern and the other its cause.** They also agree on the big arm event at 14.0–14.9 — Codex's *"opposed hands at 14.04–14.89"*, ours timing a **≥ +0.50 s lead at ~14.90, the longest in the series.**

### Method, all of it new

- **☠️ Trap 9 fired INVISIBLY and in a worse form than recorded.** The composited-canvas failure returned **a complete, plausible image of the PREVIOUS render** — not missing tiles. **Only a stamp drawn into the canvas caught it.** 0.9 s inside the draw was not enough; **2.7 s** was, over ~30 renders. **Stamp every composite.**
- **☠️ Trap 8 in a new form: a tracker's LOCK is not proof of the subject.** Six tiles were centred by a redness finder on **a foreground paddler.** Its failure is not absence and its success is not presence.
- **Cut detection: difference only the TOP THIRD of the frame.** Whole-frame gave one 5× nominee against a **1.4× noise floor**; top-third sits at **0.1–0.7 within a shot** and produced a **40× step** at the single real cut (4.08–4.10), cleanly separating three fast pans from cuts.
- **25 fps is now 3 of 15 clips** (2 duplicates in 9 steps at 1/30 here, 0 at 1/25). **A Short's stream need not be 9:16** — 3:4 buys more rider pixels at the same width.
- **Automated colour segmentation of a backlit rider returns garbage** — the "hair" mask covered the whole wave face. **Built, run, discarded, nothing quoted from it.** That last clause is the part worth imitating.

---

## 2026-11-18 — THE PUMP CONTROL, FIXED AND PUSHED (#413 at `9ab365b1`): IT WAS NEVER A ZERO, AND IT COST THE ROUND A ROW

**Verified: `claude/pump-rate` = `ff750da4` + `9ab365b1`, 2 files, +846, 0 deletions against the merge base, and `watchFrom = Number.isFinite(firstPress) ? firstPress : START` is on the branch.** PR body rewritten so #413 no longer advertises the broken control.

| | half-cycles | runs | rest excursion (med) | achieved half-cycle (med) |
| --- | --- | --- | --- | --- |
| `hold0` **as published** | **0** *(artefact)* | 0/72 | – | – |
| **`hold0` corrected** | **20** | **16/72** | **0.016 m** | **0.650 s** |

**The balance's own knee drop wanders measurably with the crouch key never touched** (`got` 0.004 m over 84 half-cycles, `drawn` 0.015 m over 76, `target` 0.020 m over 48).

### What it cost, reported by the round rather than found later

- ⚠️ **The 0.10 s arm is WITHDRAWN as an amplitude reading.** Its median excursion is **0.016 m — identical to the corrected control's.** **At that command period the channel's depth is indistinguishable from no input at all.** Its *timing* survives (841 half-cycles in 63 of 72 at 0.100 s against 20 in 16 of 72 at 0.650 s); its *excursion* does not.
- **Every other arm clears the floor**: 0.15 → 2.4×, **0.22 → 4.9×**, 0.30 → 7.0×, 0.60 → 11.4× the control's 0.016 m.
- **And it volunteered the overlap nobody asked for:** the control's tail reaches **0.125 m on one run of 72**, overlapping the 0.22 arm's 0.078 m median. **"The medians and counts separate them; a single run does not."** That sentence is the standard this track has been trying to reach all year.
- **`hold1` was never broken** and now carries the negative control: **4 half-cycles in 4 of 72 runs at 0.005 m, 2.6 % of the rung.**
- **The positive arms are byte-identical.** 0.217 s, 0.078 m, the 0.40 share, the follower's 0.567 s step response, the 82–96 % in-game ÷ follower ratios: unchanged. **The fix changed the control, not the result.**
- **The detector is now characterised in both directions:** silent at and below the 2 mm threshold, **firing from 3 mm**, recovering amplitude and period at every amplitude — and **under-recovering ~5 % at large amplitude** (0.186 m from a known 0.195 m, from 1/60 s sampling of a turning point). **So the halving point is now quoted as a bracket, 0.26–0.28 s**, with 0.27 s the midpoint. **A tightening of precision, not a changed number.**

### Two things it did without being asked, both worth imitating

1. **It kept the withdrawn footage column and relabelled it ⚠️ *withdrawn comparison*** — *"removing it would hide why these periods were chosen."* **Deleting a dead number also deletes the record of what the round was aiming at.**
2. **It wrote the `steer = 0` correction into the write-up without attributing it**, *"since the write-up is where it belongs, not a ledger of who said what."* §3.1 now states that `steer = 0` **locks the player's steering input only**, that **the board yaws, rolls and pitches freely under the water's forces and does**, that **the probe records neither trajectory nor exit speed**, and therefore that **it is not a fixed-orientation benchmark and no real clip's board path can be compared against this bench at all.**

**The write-up's §2 and §8 now say up front that row 6 has no reliable footage target — neither rate nor depth — that the headline is a fact about the game and not a verdict against any rider, and that 0.22 s is a probed command period throughout, never a footage target.**

**The round lists six refutations, four of them its own:** the brief's arithmetic (mine), its one-trace reading of the knee drop, **its own `hold0` control**, **its own 0.10 s amplitude row**, **its own description of the bench**, and row 6's classification on the rate half.

> **Unchanged answer: the game's leg-depth channel achieves a 0.217 s half-cycle on a 0.22 s command — the median of 401 half-cycles over 69 of 72 runs — carrying 0.078 m of the 0.195 m rung (40 %); the excursion falls below half the rung at a command half-cycle of 0.26–0.28 s. The governor is the follower at `LEG_FREQUENCY = 12` rad/s, not the acceleration or speed limits. Nothing tuned, no switch added, nothing under `src/`.**

---

## 2026-11-18 — GOAL-LEVEL REVIEW: NOTHING IN FLIGHT ADVANCES THE OBJECTIVE, AND THE OBJECTIVE HAS NO METRIC

The owner asked (via Codex) for the days of surfer work to be weighed against the big goal. **Full answer in `3.5/consult-codex-2026-11-18.md`.** The three load-bearing conclusions:

1. **None of the open branches advances the board-path outcome.** #407 is drawing-only; #413 is measurement-only; #411 is the only one that *can* touch the path (it moves body mass, which changes the gravity lever and the inertia) **and its rotor is silent in 42 of 60 SYNTHETIC BENCH arms — which cannot be assigned to the owner's own entries, and I wrote as though it could.** **The last several days are a PRECONDITION — the rider falls, and you cannot carry speed through a climb you fall out of — but not a contribution.** Codex's standard, adopted: *"a turned nose, a free trunk or a longer held carve is insufficient evidence for a transferable surfing skill."* **#411's own acceptance test is a free trunk, which is exactly the insufficient kind.**
2. **The owner's own evidence corroborates the priority and challenges its tractability.** Corroborating: his falls come **high on the face as the wave catches a rider slowed below the wave's speed** (#93, #96) — the objective's failure mode exactly. Challenging: **"hold the climb" already failed five ways with no switch shipped** (#221), and **Canyon B's peel at ~12.5 m/s outruns a rider.**
3. ⚠️ **CORRECTED — "the objective is unmeasurable" was too strong.** **The owner can already SEE and judge a successful climb**, and that is the judgement that counts here. What is missing is narrower and more useful: **a quantitative THROUGH-CLIMB READOUT IN THE EXISTING RIDE REPORT, on his own ride.** `rideAnalysis.ts` today tracks heading-rate windows and **planar speed over ground**, which is neither water-relative speed nor the along-face component a climb consumes — **so the readout he reads after a ride cannot yet tell him what the climb cost.** **The next round adds that readout, not a metric for autonomous evaluation** — which also keeps it inside Ruling F (*"evaluation should not be played… I'm the one that plays the game and gives feedback"*). Not dispatched while three rounds are out; it is next.

### The phase distinction, recorded for the next rider/board builder (none is running)

**Suppression of lean at low speed is NOT the same failure as ankle or support loss after lean has actually been requested, and a brief that conflates them will produce another null.** Signatures differ and the engine exposes both:

- **suppression:** `ask` pinned at `θ_max = atan(v²/(g·R))` with `TURN_RADIUS = 4.5` (`AttachedRider.prepareBank`, `:3434–3448`), and **below `PLANING_DROP = 3` m/s the cap is exactly 0** — 100 % of 541 live frames of a slow Canyon rider. **If `ask` is 0 there is nothing to lose.**
- **support loss:** a large `ask` with `achieved` falling away, ankle at range or torque saturated.
- ⚠️ **MY DISCRIMINATOR WAS OVERSTRONG AND IS WITHDRAWN.** *"Does `ask` exceed `achieved`"* is **neither necessary nor sufficient** for loss of support: **the bank reference is eased**, **sign and response lag matter**, and **deck or contact can fail while `ask` is zero.** A single signal cannot carry this. **Codex's set, adopted: pair the actual stick, the cap/planing state, the achieved bank, loaded foot contact, the local rail, the travelled course and wave-relative progress before assigning any mechanism.**
- ⚠️ **AND THE `?askCap=4.5` A/B IS NOT DECISIVE EITHER.** It ships on `main` and does remove the gate, **but a moved or unmoved fall cannot diagnose the cause on its own** — too many paths change with it. It is **one signal in the set above**, not a verdict.
- ⚠️ **CORRECTED: the 3–4 m/s band WAS already measured, in step 3.5f** — `docs/research/new-rider/3.5/planing-latch-band.md`, **which I wrote and then contradicted.** Its own headline: on the real Canyon sea (24 riders, 1 291 live frames) **the band holds 8.1–10.2 % of a planing ride's live frames and 0.0 % of a crawling one's, and in all 24 riders it was NEVER ONCE occupied in the off-plane state.** Codex's figures from the same source: **66 of 750 attached samples in [3,4) across twelve nominal 5 m/s neutral-stick placements, all planing**, and **all 541 attached samples of twelve 2 m/s placements below 3.** **So the band is closed, and what is actually unobserved is THE ORDINARY PLAYER START AND ITS PHASE — not the speed band.** That is a different and narrower gap.

### Provenance of the objective, resolved

Codex states the owner **explicitly selected** *"one bottom turn with speed carried into the climb"* in its chat, then clarified that he plays and we advise. **That explains the sentence this handoff has carried unattributed since 2026-11-16.** It is now **the working reference for ADVICE only.** **Nothing is built against it** — a peer relaying the owner's words is not the owner's words, and an objective is closer to an authorisation than to a restriction. **One sentence from the owner settles it.**

**Also taken from Codex: a historic synthetic 3.2L trace preserved water-relative speed at stick-up and then fell sideways in the climb** — so **speed preservation and survival are separate outcomes**, and a round can win the first while losing the second.

---

## 2026-11-18 — VIDEO 16 (PR #415): A REAL PUMP CADENCE AT LAST, AND THE TWO BLIND READS CONVERGE

**Zero direction changes in 14.0 s of continuous standing riding**, nose down the line in **45 of 45 frames**, the board's bottom never visible, inside one unbroken 24.0 s shot. 422 lines, 0 deletions. **Full detail in `engine-target.md`'s new status block.**

**The measurement sixteen clips could not produce: 0.92 s full period, four independent ways — two max→max and two min→min, all 0.92 — with half-cycles of 0.50 s down and 0.42 s up, each extreme located individually and one re-checked at the native 1/24 s grid to within 0.06 s.** ⭐ **And asymmetric: the rise beats the sink, 3 of 3.**

### The two blind reads of this clip agree, and ours resolves the other's own caveat

Codex sampled highs at **7.92 / 9.18 / 10.09 / 11.29** and reported *"roughly 0.9–1.3 s apart, sampled postures rather than exact peaks"* — gaps of **1.26, 0.91, 1.20.** **Ours measures 0.92 s consistently from individually located extremes.** Those are compatible: **at a 0.92 s period, a sample 1.26 s from the previous one has skipped part of a cycle** — which is precisely the caveat Codex attached to its own figures. **Two blind reads, one flagging its sampling and the other resolving it.**

**They also agree the board moves**, and ours gives the number: **the in-image long axis oscillates −16° to +19° in phase with the pump.** Codex's *"the board rolls and changes angle on the face… a zero-steer fixed-orientation benchmark is a narrower case"* is now quantified.

### What it refutes, including my own brief and its own first headline

1. ⚠️ **My strict trim test is refuted and this clip is the counter-example.** On a clip with **zero direction changes in 14 s**, the longest window steady to ±3° of heading is **~0.25 s — shorter than clip 15's 0.56 s.** **A flat-board, constant-heading test cannot tell a pump from a turn**, because the board's angle oscillating in phase with the pump *is* pumping. **Both readings reported; the strict criterion must not be used alone again.**
2. **Decoupling is not universal: 0 of 7 here against 4 of 4 in clip 15** — on the one clip that is nothing but trim. **So an acceptance test must read "the engine CAN decouple", not a rate.** PR #411 satisfies that; no frequency claim is available.
3. ⭐ **Row 3's two observables are not independent.** **Folding the trunk lowers the head by itself, so same-sign transitions are nearly free** and **should stop being counted as evidence.** Re-counted: this clip gives **one frozen window and nothing else**; clip 15 gives **four decoupled plus two frozen.**
4. **It withdrew its own first headline before publishing.** A 0.70× survey sheet read 12.667→13.000 as *"body rises, trunk unchanged"* — a decoupled window. **At 1:1 the same frames measure 237 / 240 / 235 px: flat to 2 %.** **Strips lie about heights, not only angles** — the recorded rule covered angles only.
5. ⚠️ **THE SUBJECT CHANGES WITHOUT A CUT.** From ~17.5 s the camera follows **a different surfer inside the same continuous shot.** **A cut detector returning "one shot" does not license reading the whole shot as one rider.** The top-third detector added one clip ago would have passed this.
6. **24 fps — a fourth rate** (60 / 30 / 25 / 24), and **24-versus-25 needed a nine-frame span to settle**; a four-frame sample cannot.

### On the asymmetry claim, which is the round's biggest and is NOT settled

The reader says the 0.50/0.42 split is *"what the engine's single leg spring cannot produce."* **Plausible, unverified, and the arithmetic cuts both ways:** the game's rate limits **are** asymmetric (`CROUCH_ACCELERATION = 6` down against `EXTEND_ACCELERATION = 15` up), **but PR #413 found the governor is the critically damped follower at `LEG_FREQUENCY = 12` rad/s with the acceleration clamp binding on only 3.9 % of ticks** — and a symmetric follower gives symmetric strokes. **Nobody has split the game's own half-cycles into down and up.** **Recorded open. It is a cheap, decisive follow-up and must not be guessed.**

**And a frame warning, because this is where the next error would go: do NOT compare this clip's 20–28 % excursion to the game's 40 % of its rung.** The denominators are different and unreconciled. **That is the exact shape this track has got wrong five times.**

### Method, and a standard worth copying

**Three of four automated body rulers were built, tested and DISCARDED, with nothing quoted from them:** a board-taper nose detector refuted by eye on its own frames; a shoulder finder that **locked onto a second person's head in the water**; and a flood-filled silhouette that **leaked into dark water and disagreed with the hand by 40 px** at 12.75–13.08 while agreeing within 5 px over 7.5–11.0. **Only the validated window is quoted, against six hand measurements at exactly 1:1.** Also: **the `<video>` element count went 1 → 2 when the viewport was resized**, so the `videoWidth > 0` check belongs in **every** call, not once at the start.

---

## 2026-11-18 — ⭐ THE OWNER PLAYED AND REPORTED A MECHANISM: THE BOARD LEAVES HIS FEET AS SPEED RISES

**His words, which are the specification:**

> *"Im playing the new code, the surfer cannot keep himself on the board. He falls when the speed increases, the board sleeps away from his feet and he falls. Looks quite realistic, but unplayable"*

**"sleeps away" is "slips away". And he has since confirmed: *"i played main"*.** `main` is at `1a29a6c7` and **has not moved all day**, so **nothing from today's branches is involved** — this is **pre-existing shipped behaviour**.

### Why this report is not the problem the last weeks have been solving

- **The trigger is RISING speed.** Earlier owner evidence had falls coming **high on the face as the wave caught a rider slowed BELOW the wave's speed** (#93, #96). **This is the other end of the speed range** and may be a different failure entirely.
- **The board leaves his FEET.** He is not describing a body toppling over a planted foot. **The entire balance track — ankle, roll, lean, bank authority, the two-body rider — is about the body's attitude over a contact that HOLDS.** **This is the contact itself.**
- **"Looks quite realistic, but unplayable"** — he is **not** saying the physics is wrong. He is saying **it is right and he cannot play it.** So any options table must include **options that keep the realism**, not only ones that remove the effect.

### ⚠️ AND THE BIGGEST QUESTION THE ROUND NOW LEADS WITH

**`?rider=new` is opt-in.** So *"plain main"* may mean he was riding **the SHIPPED rider, not the new one** — in which case **weeks of balance work are aimed at a code path he is not playing.** **The diagnosis round is testing both arms and leading with which reproduces:**

- **(a) plain `main`, no query string** — the shipped rider;
- **(b) `main` + `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two`** — the new rider on his usual address.

**If (a) only: the complaint is about code none of the recent work touches, and that is the most important possible result.** If both: the mechanism is shared. If (b) only: "main" meant main plus his usual switches.

### The one piece of prior work that matches his description

**The board study (merged #285)** found the standing rider's contact **MAKES ENERGY on steep water: 4–23 kW, with 17–58 g throws above roughly 26° upward or 30–38° downward slope**, the tube's wall steeper still. **That is a contact failure at speed and it is the closest thing in the repo to what he just described.** Its recommended first remedy was **A-lite, `?legPower=cap`** — and **`legPower` could not be found in `src/`, so it may never have been built.** The round is checking.

**Also flagged to the round: speed and the water's slope under the board rise together on a real wave, and his words name only speed.** They must be separated before a mechanism is assigned, and **no single signal may be used as the discriminator** — Codex's paired set is required (stick, cap/planing, achieved bank, loaded foot contact, local rail, travelled course, wave-relative progress).

---

## 2026-11-18 — ⭐⭐ THE OWNER'S ACTUAL ADDRESS, AND IT HAS TWO SWITCHES NO BENCH IN THIS PROJECT HAS EVER USED

**His words, in full:**

```
?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on
```

**`rider=new` IS on** — my alarm that he might be riding the shipped rider was unfounded and is withdrawn. **And `?physical` is NOT a physics gate:** `src/main.ts:89` is `const startRide = devFlag('physical') || demoMode !== null`, so it only starts the ride immediately. **Its absence from his address is harmless.**

### ⚠️ BUT `stanceReach=keep` AND `deepen=on` ARE NEW TO EVERY BENCH, AND BOTH ACT ON THE LEGS

| switch | what it does | source |
| --- | --- | --- |
| **`?stanceReach=keep`** | *"a deep crouch keeps the riding stance's hip range and free arms, so Compress keeps its catching reach as well as its lower centre of mass"* — **it changes the HIP RANGE in a deep crouch** | step 3.3h, **the owner's own ruling** |
| **`?deepen=on`** | *"full manual crouch reaches the tube tuck's 0.45 m anywhere and Compress does not fade it away, so the crouch key dips whatever stance is held"* — **it more than doubles the crouch key's reach** | step 3.5b, a ruling |

**Every probe this session ran `RIDER=new FELT=deck BODY=two` and nothing else.** So:

1. ⚠️ **PR #413's pump figures have the wrong denominator for him.** It measured the excursion as a **share of the 0.195 m pumping-crouch rung.** **With `deepen=on` the crouch key reaches 0.45 m** — more than twice as far — **so "40 % of the rung" is not a statement about his game**, and the numerator may differ too.
2. ⚠️ **`stanceReach=keep` alters `stanceRoom(depth)`**, which is **exactly** the quantity #413 identified as its second mechanism (knee travel narrowing from **0.30 m at tall to 0.15 m at the pumping crouch**, `humanBalance.ts:159–160`) **and** the **moving limit** a reviewer flagged behind the hip clamp. **Both of those analyses were done with the narrowing in place; he rides with it off.**
3. **PR #411's trunk bench is on the same incomplete address.**
4. **The 0.27 s halving point and the 0.016 m noise floor are on the wrong address too**, though they are still facts about *a* configuration.

**The live fall-diagnosis round has been corrected mid-run** and is now running four arms — his full address, then without `deepen=on`, then without `stanceReach=keep`, then neither — **and will report which switch, if any, the effect needs.** Given his complaint is that **the board leaves his feet**, and both switches change **how far and how freely the legs travel**, this is a live candidate rather than a technicality: **a leg that can reach 0.45 m anywhere, with a hip range that no longer narrows, is a different contact problem from the one our benches produce.**

### THE CANONICAL ADDRESS, written down once so this stops recurring

> **The owner's ride address is `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on`.** **Every brief must use it, and every figure quoted to him must say whether it was measured on it.** `?physical` may be added for convenience; it only skips the menu.

**This is my recorded error #24 recurring** — *"before quoting any figure to the owner, check it was measured on the rider AND ADDRESS they actually ride"* — and it recurred because **the address was never written down in one place.** It is now. **Caught this time before it cost a round, by asking him instead of assuming.**

---

## 2026-11-18 — ☠️ MY STATUS BLOCKS HAVE BEEN INVISIBLE TO EVERY AGENT I BRIEFED

**Video 17's reader refuted its own brief and it was right. Verified by me immediately:**

| ref | `engine-target.md` blob | `### STATUS` blocks |
| --- | --- | --- |
| `origin/main` | `3641c0e4` | **0** |
| `origin/claude/video-13` | `3641c0e4` | **0** |
| `origin/claude/video-16` | `3641c0e4` | **0** |
| **`origin/claude/hand-moment-row`** | `47089c12` | **5** |

**Every brief tonight said "read `engine-target.md`, including its status blocks". No agent working off `main` could see them** — all five live on the one branch nobody has merged. **Five readers were told to read a file that did not contain what the brief described.** They worked from the nine-clip synthesis instead, which is why several re-derived things that were already recorded.

**Immediate fix, applied to video 18's brief and to every brief from here: name the branch explicitly —**

```
git show origin/claude/hand-moment-row:docs/research/new-rider/3.5/engine-target.md
```

**Proper fix: the owner merges that branch.** It now carries **the entire session's record** — row 19, five status blocks, every correction, the clip registry, the goal-level review, and the canonical ride address. **Until it merges, the shared reference exists only on a branch, and "read the shared reference" is a broken instruction.**

---

## 2026-11-18 — VIDEO 17 (PR #417): THE FEET DO NOT MOVE, AND A REAL RIDER DOES NOT ANSWER SPEED WITH A DEPTH CHANGE

A **10.121 s** Malibu storm-surf ride — one long drive, one **vertical re-entry**, one whitewater recovery — on a **bright yellow deck with bare feet**, the clearest feet evidence since V7. 397 insertions, 0 deletions. **60 fps.**

### ⭐ The owner's complaint, answered as far as footage can

- **Row 17 gets its first reproduced ABSOLUTE number.** Front foot at **0.486 (t = 2.50) and 0.472 (t = 4.50) of board length from the nose, ±0.04, 2.0 s apart**; rear **0.890 / 0.861**; stance **0.404 / 0.389**. Hand-read at **1:1** with nose, tail and both contacts in one image. **It lands on top of V7's 44–49 %.** A third frame at t = 1.00 was **discarded for motion blur** rather than used.
- ⭐ **NOT ONE FRAME SHOWS A FOOT SLIDING OR RE-PLACING** — 12 board-anchored tiles at 0.25 s, 10 at 0.5 s, plus the whole turn at 1/15, 1/30 and 1/60 s. **Through the re-entry (6.90–7.13) the legs are visible on the far side of a board rotating through vertical: feet planted, knees folding.** The only unreadable window is the landing, inside the rider's own spray.
- ⭐⭐ **"Does the body drop into acceleration? No rule."** Head-above-deck falls **28 % in 0.58 s**, rises in 0.42 s, falls again over 0.75 s — **and then holds FLAT to ±4 % for 0.67 s in the middle of the drive, with the trunk frozen too (35–39° at both ends).** **A real rider does not answer speed with a depth change.** Directly relevant to the owner's report, and the next clip is briefed to confirm or refute it.
- **What footage cannot say, stated:** *what force holds the foot down.*

### Row 5 gains a conceptual problem bigger than its number

Hand above the crown on **three consecutive native 1/60 frames** (6.900 / 6.933 / 6.967), the board's redirect through vertical at **7.20 ± 0.07** → **lead +0.33 s ± 0.08, held ≥0.10 s.** **And then it dissented against itself: the rail was already set at ≤6.60, BEFORE the arm.** **In a vertical re-entry the rail bites at the bottom and the redirect happens a third of a second later — so "the arm leads the rail" is NOT ONE EVENT**, and every reading in the series needs to say which it timed. **Which arm: refused** (his back is to the camera and he rotates inside the window). Tally **17 of 29 across eight clips.**

**And it confirms clip 16's inference positively: a hand above the crown occurs EXACTLY ONCE in 9.6 s, in the clip's only turn.** **So a built arm lead must be conditional on a direction change** — which is a constraint on PR #407.

### The rest

**Row 3 under the corrected rule: 4 resolved — 2 same-sign down, 1 same-sign up, 1 frozen, 0 decoupled, 0 opposite-sign.** Series **47 resolved, no opposite sign, seven clips.** Decoupling: **4 of 4 in clip 15, 0 of 11 across clips 16 and 17.** Under the rule's own logic **this clip contributes one frozen window and nothing else.**

**Row 8 gains an interior point:** 0 in 14 s → **1 in 9.6 s** → ≥10 in 18.56 s → ≥13 in 30 s. **Neither pattern: one direction change in 9.6 s.**

**⛔ Rows 10 and 14 — bare legs and STILL refused**, an **eighth** distinct cause: **the rider is backlit**, so the legs are one dark mass with no placeable knee. **⛔ Row 2 — the red waistband DOES track the pelvis (first time in three clips) and the angles are readable (44°, 53°, 35°, 39°, ±8–10°) — but there is no HEAD LENGTH** (black hair merging into a shadowed back), so the ratio cannot be formed. **Seventeen clips, still no gated trunk travel.**

**The footage ask gains two clauses: the rider must be LIT ON THE CAMERA SIDE, and the face lit AND turned toward the lens.** A waistband that finally tracked the pelvis bought nothing because the head failed instead.

### Method

☠️ **At 60 fps the `seeked` + 30 ms recipe returns a ONE-FRAME-OFF decode — 3 of 6 same-time probe pairs disagreed. A 260 ms settle plus a two-decode stability check gave 6 of 6 and 0 of 39.** ☠️ **The composited-canvas failure fired TWICE despite a 2.7 s wait**, and **a second screenshot cured it both times**; **an unstamped sheet is indistinguishable from data.** **The Browser pane dropped every tab mid-session** and **viewport emulation is cleared between turns** — one screenshot returned at 1.6× and was discarded. Scale **exactly 1.000 at 800×640, sixth session.** Two of four automatic rulers built, failed, **discarded with nothing quoted** (a head finder returned 49/50/116/129 px on one rider; a red-shorts hip finder merged with the board's red rail). **And it suspected a subject change at 8.0 s and refuted its own suspicion** at 0.72× — same yellow deck with a red rail at a different roll angle.

---

## 2026-11-18 — BOTH DISCARDED QUANTITIES MEASURED (PR #418, round 3.5i): ONE RETIRES A DECISION, ONE NARROWS IT

**83 216 live substeps of 72 rides on the real Canyon B** (24 input cells, seed 1, medium, stage 2, `rider:'new' feltFrame:'deck' riderBody:'two'`) plus **4 544 substeps of three single-rider controls.** 1 411 insertions, 0 deletions, no `src/` change.

### A — the hip clamp: ⭐ **EXACTLY ZERO, AND IT RETIRES THE DECISION**

**0 N·m·s discarded, because the clamp NEVER FIRES.** The trunk rotor's angle **never exceeds 7.76°** of a range **never tighter than 21.1°**, and the rotor is away from rest on **237 of 83 216 substeps (0.28 %)**.

**But it is a zero of FREQUENCY, not of size, and the round says so:** a firing at the rotor's own peak momentum would have cost **11.74 N·m·s** — only **0.29 % of the pitch ankle's 4 086 N·m·s** torque impulse over the same window, **but 2.7× the body's own median angular momentum about that axis (4.32 N·m·s).**

> **RULING: there is nothing to pair. Leave the unpaired impulse as a comment. THE OWNER'S DECISION IS RETIRED** — which is the most useful outcome available, because this project has more open decisions than it has evenings to ride them.

### B — the hand's residual moment: **negligible NOW, not negligible if the hand ever carries weight**

Median **2.01 N·m**, max **23.68**, over **2 830 loaded substeps in 12 of 72 rides**:

| against | share |
| --- | --- |
| the ankle's own torque (median 71.85 N·m) | **3.4 %** |
| the weight moment about the feet (median 246.40 N·m) | **0.7 %** |
| **the moment that same force DOES put on the board** | **1.9×** |
| **the hand's own moment, by summed magnitude** | **63 %** (Σ\|dropped x,z\| 7 520 against Σ\|kept y\| 4 347 N·m) |

**It is small only because the hand carries a median 2.66 N against the engine's own 286 N cap.** **At a loaded hand it scales to 180–260 N·m — 2.5–3.6× the ankle** (stated as a **linear extrapolation to the cap, not a measurement**). Pairing it costs **0.05–0.24 % of a ride's water work but 0.8–11× the work the retained yaw already does.**

> **RULING: negligible as the engine stands; NOT negligible if the hand is ever made to carry weight. The decision is NARROWED, not retired** — and it becomes live the moment anyone builds a real hand-drag.

**The reviewer's sentence is retired:** *"its magnitude and effect on a ride are unknown"* → **63 % of the hand's own moment by magnitude, 3.4 % of the ankle, on 3.4 % of the substeps of one stance in three, +3.33 J if paired.**

### ⭐⭐ AND A USER-FACING BUG: HOLDING THE HAND KEY SWITCHES THE HAND OFF

| arm | `rider.hand` | runs | loaded | substeps |
|---|---|---|---|---|
| plain | false | 18 | 6 | 1 802 |
| stick | false | 18 | 5 | 893 |
| **hand (KeyE)** | **true** | 18 | **0** | **0** |
| handstick | true | 18 | 1 | 135 |

**Stances: tall 0 of 24, crouch 0 of 24, compress 12 of 24.**

**So the loaded hand in this game is the COMPRESS REACH, not the hand-drag feature row 19 is about.** `waveSide` (`:5719–5732`) **returns before the compress reach is considered when the key is held**, so **holding the key switches the reach off** and substitutes a wave-side test (water 0.05 m higher 0.6 m to one side) that passed on **163 of 41 328 key-held substeps (0.39 %), 28 of them dry.** The reach's own branch clamps the hand to the surface (`REACH_DIP` 0.03 m of a 0.08 m hand), which is why it always wets and why the force is 2.66 N.

> **Press the hand key and you get LESS hand contact than not pressing it. 0 of 18 runs.** That is a plain defect, it is the owner's to rule on, and **row 19 cannot be judged on a feature that never loads.**

### ⭐ And the finding that bears on PR #411: THE TRUNK ROTOR ONLY STIRS DURING THE FALL

**The hip's torque is non-zero at a frame's end on 17 of 5 201 frames, in 5 of 72 runs, at 91.0–99.9 % of their own rides (median 99.3 %).** **Its drive is the ankle's excess — a symptom of the collapse — and it arrives `PITCH_DELAY` = 0.1 s later.**

**So `?trunk=mass` can only act once the rider is already going.** It cannot help him stay up, because **its drive does not exist until he is falling.** This **independently reproduces PR #411's own caveat** ("inert on 42 of 60 arms", travel 0.05–4.49°) **on the owner's real spot with a different instrument** — so that caveat is no longer a synthetic-bench artefact.

### Three of my own citations were wrong, and the round named them

1. **`cross(hand − a, F_hand)` is not the residual.** It is **`cross(hand − CoM, F_hand)`** — `a` is *where the force reaches the board*, not a point in space. **I put the wrong formula in the brief and in the handoff.**
2. **`separate` is at `:5227–5232`, not `:4586`** — `:4586` is `coupleYaw`. **The claim about it is correct; I have been passing the wrong line number in briefs all session.**
3. **There is no "inertia changed" term to separate.** `HIP_PITCH_INERTIA` is a **module constant** (`standingBody.ts:93`); **the RANGE is what moves** (`hipRange(-leg.rest)`). I relayed a caution about separating an inertia change that does not exist — the round counted the range split anyway, and both classes are zero with both control-tested.

### Controls, and the round refuting its own draft twice

**Read-only proven:** probe on vs off, **5 273 rows, 56 unrounded columns, 295 288 values (400 748 with part arrays), 0 differences** — and since riders push water through `addReaction`, that covers the sea. **Positive A:** injected 2 rad/s at the limit → **15.9277 N·m·s recovered of an arithmetic 16.000**, and 15.9275 on the other classifier branch — **both branches exercised.** **Positive B:** an injected cross product recovered to **2.2 × 10⁻¹⁴ N·m.** **Identity: 83 216 of 83 216 unclamped substeps reproduce exactly, worst error 0.** 72 frozen frames dropped.

⭐ **And it withdrew two of its own draft headlines using the single-rider control:** the roll component's *"one-signed in 12 of 12 rides"* (**the control splits 234 + / 419 −**) and *"pairing would add energy on balance"* (**the control gives −1.38 J against the bench's +3.33 J**). **Both were cell artefacts; both halves withdrawn; only the pitch sign published.** It also found that **the force/moment identities cannot be exact** — differencing a running accumulator loses bits — and that its first build's *"140 of 142 bad"* was **the instrument, not the engine.**

**Not measured, stated so the zero is not over-read:** one spot, one seed, one swell size; rides 0.85–2.47 s, **all 72 detached**; `?trunk=mass` not used; the swing rotor's own clamp not measured; and the 180–260 N·m loaded-hand figure is an extrapolation.

---

## 2026-11-18 — ⭐⭐⭐ THE OWNER'S FALL IS DIAGNOSED (PR #419): THE BOARD ROTATES OUT FROM UNDER HIM, AND HIS STANCE TOLERATES 10.9° AGAINST A 20° TURN

> **The board does not slide across his soles and it does not fly off them — it ROTATES out from under them.** Turning on his own spot the deck banks past **20° at 0.683 s**, **the body does not bank with it**, and his foot support is only **0.260 m across**, so the line from his centre of mass to the deck **leaves his feet 0.08 s later**, the centre of pressure **pins at the support edge (`limit = 'tip'`, 90 of 90 riders)**, and from there the contact cannot put force where the body needs it while the board keeps rotating away.

**THE NUMBER THAT MAKES IT INEVITABLE: with the CoM a median 0.676 m above the deck, the stance allows 10.9° of mismatch between the body's lean and the deck's bank. A turn is worth 20°+.**

**And `riderPosture.ts:96` sets that ±0.130 m ONCE FOR EVERY STANDING POSE** — the crouch and Compress are leg-depth changes that never leave `phase === 'standing'` — **so no stance a player can hold changes it.** **That is why his report is stance-independent, exactly as he said it was.** He diagnosed the invariance from the couch; the code says why.

### The order of failure, 90 riders turning on his spot

**roll > 20° (0.683 s, 80/90) → `tip` (0.767 s, 90/90) → overhang > 5 cm (0.842) → cone binds (1.008, 6/90) → leg in tension (1.100, 32/90) → margin < 0.1 (1.150) → load zero (1.217, only 11/90) → posture error (1.650).**

**The contact failure is the LAST link, not the first.** Causes: `balance` **89**, `lost board` **1**, **`foot slip` 0.**

### FOUR OF MY FIVE PREMISES FELL — and the most important one in the project's favour

1. ⭐ **`legPower` EXISTS and is ALREADY ON for his rider.** `powerCapped = capsLegs || freeBody`, so `rider: 'new'` standing takes A-lite's branch **by default.** **Proved bit for bit: his address with and without `?legPower=cap` is identical over 416 832 values, 0 differences, 96 summaries identical.** **My strongest lead — "the one fix for this mechanism has been sitting unbuilt" — is wrong in the most useful way: it is built, shipped, running in what he rides, and he still falls.**
2. **#285 is NOT the same event, and my "your description and that study are the same event" was wrong.** On his spot **none of its four bands is reached**: slope > +26° **0/180**, < −30° **0/180**, feet > 17 g **0/180**, power > 4 kW **1/180**. **The water under his board is −11.6° to +6.8°; #285 is about 26–50°. The Canyon has not got that water.**
3. **"The trigger is increasing speed" is NOT reproduced in either stick arm.** Over 180 riders **faster rides last LONGER** — 0.95 → 3.62 s from 2 to 10 m/s at stick-zero, 0.95 → 2.28 s hard over. **What halves the ride is COMMITTING THE STICK.** (His *"stands 1 second"* is exact: **0.92–1.45 s turning at 4–8 m/s.**)
4. ⭐ **"This is about the contact itself, not the body's attitude over a contact that holds" — REFUTED, and it matters most.** **`tip` IS a statement about the body's attitude over a still-loaded contact.** **The balance track is aimed at exactly the right thing**, and I told the owner it was not. **Withdrawn.**
5. **`?physical` gates no physics** — only `start: 'ride'` vs `'menu'`. The benches have not been running a mode he does not use.

### Speed or slope: neither alone — a STEP that coincides with the hull leaving the water

Crossed on `FaceWater` with the wave's height and celerity held. **Boundary, as achieved speed: 8.60 m/s at 12°, 6.95 at 14°, 4.67 at 16°, 3.73 at 18°, below 2.03 at 20°.** Reproduces within **0.15 m/s** at 12–14° across two placements; moves 0.9–1.7 m/s at 16–18°. **Five slopes is five points and no closed form is offered.**

### THE OPTIONS — seven, ordered by realism kept

| row | option | what it costs / buys |
| --- | --- | --- |
| **0** | `?legPower=cap` | ⛔ **VOID — proved a no-op. Do not spend a ride on it** |
| **1** | **let the body BANK with the deck** (spec step 3.1) | **the only option that removes the cause. Unbuilt and large** — and A-lite's own L3 analysis independently concluded *"only the body lean can fix this"* |
| **2** | **widen the ±0.130 m foot support** | **the same function already uses ±0.18 m (prone) and ±0.23 m (push)**, so neither number is invented: they buy **14.9°** and **18.8°**. **Angle, not authority** — and **18.8° still does not cover a 20° turn** |
| 3 | ankle/sole roll moment | the ankle already carries 45–56 % (3.5d) |
| 4 | less roll per stick | **fights the thing he enjoys** |
| 5 | gentler water | **pushing on the wrong end — it is not the water that is steep, it is the board** |
| **6** | — | ⛔ **flagged as a CHEAT and recommended against**: a kinematic prescription, the retired `uprightVelocity` (3.2y), the shape rejected in #215 |
| 7 | change what the take-off asks | — |

### What to put to him first, in the round's own words

**His *"realistic but unplayable"* is well founded: nothing unphysical is firing on his spot** — the energy leak is **already capped** and the throws are **2.9–5.9 g, not 17–58.** **The gap is 11° of stance against a 20° turn.** The two cheap things aimed at the clamp that actually fires are **row 2** (a geometry constant **only he can set**) and **row 3**; **the real fix is row 1 and it is the balance track's open problem.**

⚠️ **And one gap named: his window is the first second after standing, and a real pop-up is not benched here at all** — every rider in every bench is **placed on the water already moving.**

### ⚠️ FOUR FAULTS OF ITS OWN, AND THE FIRST AFFECTS EVERY BENCH IN THIS TRACK

1. ⭐ **The flush placement every rig in this track uses** (`3.5/foam.ts`, `3.3/plant.ts`) **starts the hull DRY and the leg UNLOADED — frame 1 dry in 480 of 480** — costing a median **32 frames (0.53 s) of settling**, and **101 of 480 runs fell before ever becoming a ride.** **`SINK=0.06` fixes it.** **This contaminates existing benches in this track and should be fixed before the next one.**
2. **`limit` is one substep of 32**; read as a step summary it reported flight for frames whose peak load was 0.89 body weights. **`limitTime` is the class's own answer.**
3. Its first "slip rate" was measuring **the lean**, not the soles.
4. Its own proposed predictor `demand` was **refuted** (64.3 % agreement over 32 100 frames) and **kept, labelled, so nobody builds on it.**

**Instrument:** negative control (a mis-chosen first attempt documented rather than dropped), positive control (**`coneTan` sits at exactly 0.900 = `FOOT_FRICTION`**), two independent cone reads, `NaN` guarded explicitly, **probe inert over 81 575 values / 3 263 frames / 25 columns, 0 differences.** Canyon seatbelt: object-prepended wrapper, grid read off the solver **400 × 451 = 180 400**, spin-up 115.6 s. `vitest src/physics --maxWorkers=1`: **58 files, 638 passed, 21 expected fail.** **Every median a plain median — `qt(0.5)` used nowhere.**

---

## 2026-11-18 — VIDEO 18 (PR #420): IT HAD THE SERIES' FIRST OPPOSITE-SIGN INSTANCE AND REFUSED TO PUBLISH IT

**5.821 s at 60 fps, the shortest read, and the densest: TWO resolvable direction changes 1.583 s apart** — a cutback (roll reversal 2.575 ± 0.03) and an off-the-lip (board through vertical 4.158 ± 0.009) — **still riding when the clip stops.** 414 insertions, 0 deletions. One continuous shot, 117-sample top-third detector.

### ⭐ The discipline is the story: a candidate declined

**1.750 → 2.100: apparent stature 6.88 → 5.53 head-lengths (−17 %) WHILE THE TRUNK VISIBLY UN-FOLDS**, with the camera's scale pinned to 3.5 % by the head length (57 → 59 px). **That is the series' first opposite-sign instance in 47 resolved transitions across seven clips — and it was recorded and deliberately EXCLUDED**, for three reasons the ruler calibration itself names:

1. **the horizon is lost in haze**, so the lens elevation can be neither held nor checked — **two hand attempts disagreed by 365 source rows**, and an automatic detector **locked onto the wave crest** and was discarded;
2. **the yaw moves inside the window**;
3. **the trunk channel is eye-only.**

**Row 3's tally is therefore UNCHANGED at 47 resolved, no opposite-sign.** **That is the standard this track has been trying to reach all year, applied against the reader's own headline.**

### ⭐ Row 5's criterion is mechanically unsafe and must change

**In the window where the hands ARE above the crown, the arms are held LEVEL and it is the HEAD that has dropped.** **So the series' own test is aimed at the wrong channel: it should be the SHOULDER LINE, not the crown.** Every "hand above the head" reading in the series is now suspect in the same way.

**And "an overhead arm is conditional on a direction change" is necessary but NOT sufficient:** this clip has **two** direction changes and **one** overhead arm.

**Plus the row-5 ambiguity is now REPRODUCED on a different rider to within 0.04 s:** a lead of **+0.33 s over the board's redirect** but **0.00 s over the rail being set** became **+0.29 / 0.00**. **So "the arm leads the rail" really is two different events, and it is not a one-clip artefact.** **This is a constraint on PR #407.**

### The feet — eighteen clips, still nothing moves

**No slide, lift or re-placement in ~90 frames** (24 at 0.25 s, 11 at 0.1 s, 12 at 0.08 s, **30 at the native 1/60 s**, 8 at 1/6 s), **including six native frames (4.117–4.200) with the board rotating past vertical, deck to the camera, and both bare feet plainly on it.** The knees fold; the contact is never re-made.

⛔ **But row 17 does NOT get its third absolute clip** — the tail is inside spray or whitewater in every frame checked, so the board-length fraction is **refused.** **0.47–0.49 stands reproduced twice (V7, V17), not three times.** **Method contribution: the printed DECK LOGO is a board-fixed ruler that works where the tail does not** — front foot at **2.82 ± 0.11 logo-lengths from the nose (7 %)** over 0.35 s through a climb into a cutback.

⛔ **And the brief's primary ask had no footage: there is no take-off in this clip.** The rider is already standing at t = 0.000. **The owner's own `?t=2` marker lands on the start of the first turn, not a take-off.**

### The new aspect gate's first use — and a clean negative

**Rows 10 and 14 refused by the BOARD-ASPECT gate: ≥8.6 at t = 2.100 and ≥5.5 at 2.300 against a limit of 2.2** — **computed from the board alone, no body landmark touched, one frame each.** **Far cheaper than the 3–5-frame thigh/shin attempts it replaces.** ⭐ **And the negative worth keeping: a cutback's pivot does NOT open an admissible window — it ROLLS the board, which drives the projected width to a minimum and the aspect to its maximum.**

### Causes, and the clothing clause rewritten again

**Row 2 ⛔ no pelvis landmark: a black top over black boardshorts** — a **third** garment cause after V15's loose shirt and V16's one-piece, **and the commonest one in warm water.** **The ask's clothing clause should read "the waist must be a visible TONAL BREAK"**, not "boardshorts and a short top". **Row 18 ⛔ a new cause: the face is finally lit and legible (57–59 px, three-quarters to the lens) and the board's nose is never sharp in the same frame** — eighteen clips and the two have never co-occurred. **Row 6: a 5.8 s ride with two full-rail turns contains ZERO pumping.** **Row 16: compressed from ≥4.117, ≥0.33 s before contact at ~4.45 — consistent with clips 14 and 15 but not a third instance**, because contact is inside his own spray.

### ☠️ THREE METHOD REFUTATIONS, AND TWO ARE OF THE SKILL ITSELF

1. ☠️ **"Scale is exactly 1.000 at 800×640, six sessions running" IS CONDITIONAL AND BROKE.** It was 1.000 with the preview pane alone, **0.753 once the tasks pane opened beside it**, and 1.000 again after closing it. **Anyone trusting the constant across that gap publishes every length 33 % small.**
2. ☠️ **EVERY RECORDED CURE FOR THE STALE COMPOSITE FAILED.** A second screenshot failed **four** separate times (twice in a row each); a 2.6 s wait failed; a CSS transform/opacity toggle failed. **What worked: a `setInterval` repainting a small rectangle of the overlay every ~120 ms**, keeping the layer dirty so every later screenshot is current. **And a video seek only works to times the decoder has not already cached, so a fixed nudge sequence works once and never again.** Four screenshots were discarded on stamp mismatches with nothing quoted from them.
3. ☠️ **A survey sheet can lie about ASPECT too** — `drawImage` scales x and y by different factors whenever a tile's aspect differs from the crop's. Nothing published was affected, but it is silent.
4. ⚠️ **And it refutes the calibration's own rescue in practice: apparent stature's precondition is a fixed AND CHECKABLE lens elevation, which needs a horizon.** **The rescue is conditional on a landmark nobody has been checking for.**

**Confirmed:** the 260 ms + two-decode recipe passes **a second 60 fps source** (6 of 6, 0 of 39); carriage A on an **eleventh** clip; **zero foot steps on an eighteenth.** Three automatic rulers built and **all three discarded**, nothing quoted.

---

## 2026-11-18 — ⭐⭐⭐ THE BODY ALREADY BANKS. IT IS 0.1 s LATE. (PR #421, `?bodyBank=hip`)

**My brief said "the body does not bank with the deck". That is false, and the refutation is the fix.** On the **shipped** rider, on the owner's own address and spot, over **7 208 live frames**:

| | |
| --- | --- |
| `d(body bank)/d(deck bank)` through the origin | **0.8748** |
| body banked the **same way** as the deck, deck past 2° | **5 844 of 5 987 frames (0.976)** |
| at a deck bank of 28.7°, the body's own bank | **26.0°**, median mismatch **3.86°** |

**A body standing plumb gives 0 on all three.** **PR #419 was not wrong about anything it measured** — it said of this quantity, correctly, *"the body's bank against the deck's — the quantity that is currently absent"*, meaning **unmeasured** — **and my brief built a cause on that gap.** Thirty-first frame error, and the costliest shape: **I turned "nobody has measured it" into "it does not happen."**

### ⭐ WHAT THE BODY IS INSTEAD IS **LATE**

- **The follow gain reaches 1.0000 at a lag of 6 frames = 0.100 s** — which is **`BALANCE_DELAY` to the millisecond** (0.9987 measured).
- **On the analytic face the mismatch IS the deck's roll rate times a fixed time: 73, 73, 86, 88, 104 ms across five rate bands and 4 374 frames.**
- **A 0.100 s lag reaches the stance's 10.9° at 109 °/s.** On his spot turning, the median roll rate is **55.1 °/s** and the **median per-rider peak is 194.7 °/s**, with **21.0 % of frames above 109.**

> **THE STANCE IS NOT TOO NARROW FOR A BANKED DECK. IT IS TOO NARROW FOR A DECK THAT BANKS FAST.**

⚠️ **On the real sea the ratio is 40–80 ms and not flat** — the sea's spikes are briefer than the lag — **so this is a law on the face and a direction on the sea.**

### What was built: ONE MISSING TERM. No drive, no force, nothing invented.

`project` constrains the contact force to a line **through the body's centre of mass** — the moment balance of a body with **no angular momentum of its own.** **But this body has a trunk rotor.** The identity is

```
p_x = com_x − height·F_x/N − (dH/dt)_roll/N
```

**and the code had the first two terms.** `?bodyBank=hip` adds the third. **`moment === 0` is the shipped expression character for character**, so the default is the old code by construction.

⭐ **And the second finding: the actuator is `swing`, as suspected, but it did not need driving.** **3.5d's "0.1–0.4 % of the traffic" is the ankle's REST COMMAND it takes over — not its torque.** `humanSwingStep` adds the rotor's return and damping term **outside** its ±`SWING_TORQUE` clamp, so **the shipped rider's `swingTorque` already reaches a per-rider median peak of 165 N·m and a max of 303 N·m — and `project` discarded every newton-metre of it.** The term fires in **3 061 of 6 425 frames with the hip gain at zero.** **The rotor was already working hard; its effect was being thrown away.**

### Does `tip` still fire 90 of 90? **No.**

| 90 Canyon riders, stick hard over | shipped | `?bodyBank=hip` |
|---|---|---|
| **`tip` fired** | **90/90** at frame 46 | **66/90** at 38.5 |
| CoP pinned | 3 745/7 208 = **52.0 %** | 2 072/6 425 = **32.3 %** |
| mismatch past tolerance | 74/90, 0.101 of frames | **36/90, 0.025** |
| mismatch at a 40°+ deck bank | 7.40° | **5.17°** |
| tolerance, median peak | 12.4° | **38.6°** |
| bank clamp hit / margin < 0.1 | 42/90 / 52/90 | **14/90 / 14/90** |
| ⚠️ friction cone bound / `foot slip` | 6/90 / **0** | **28/90 / 2** |
| ⚠️ median ride | **1.333 s** | **1.083 s** |

**Sign checked WITHIN one run:** inward on **2 330 of 3 061 (76.1 %)**, median demand **0.0800 → 0.0355 m**, inside the ±0.130 m support **0.625 → 0.895.** **The 23.9 % that goes outward is the rotor's own damping term, reported rather than hidden.**

### ⭐ Where the reaction went — and it refuted its own prediction

**It wrote, before measuring, that the board's roll "is expected to get worse." It got BETTER:** median roll peak **65.7° → 52.4°**, median roll rate **55.1 → 45.2 °/s.**

**The mechanism, from the code: `tip` makes the contact infeasible → the pair is SOLVED APART → and apart, the body is driven by the clipped contact and gravity alone, so the ankle's torque, the rotor's torque AND the pitch hip all VANISH.** **The shipped rider loses his own joints in 52 % of frames.** With the term, 32 % — and the ankle's counter-roll (3.5d: 45–56 % of the deck's roll acceleration) **reaches the board.**

⚠️ **But that is a COST against `steep-faces-for-tricks`: 52° instead of 66° is a less committed turn, and only the owner can price it.**

### A hip drive was built beside it and the measurement removed it

| arm, same 90 riders | `tip` | median ride |
|---|---|---|
| **term alone** | **66/90** | 1.083 s |
| term + drive | 76/90 | 0.917 s |
| **drive alone** | **90/90 at frame 23.5** (shipped: 46) — ***earlier*** | — |

**Ordering `term < term+drive < drive alone`.** **3.2x's "the more the hip throws, the sooner he falls" survives the correction that was supposed to pay for it** (3.2z's `reachAcross` double count). **`HIP_CAPTURE_GAIN` left at 0 for the third time, with the third measurement.**

### Default unchanged — measured over 280 476 values, built TWICE

The probe built against **this branch's `src` and against the merge base `1a29a6c7`'s own `src`**, same 96 cells: **5 292 frames × 53 shared columns = 280 476 values, 0 differences**, 96/96 summaries identical, and the two new read-out fields **0 in all 5 292.** Probe inert over **76 296 values.** `vitest src/physics` **58 files / 638 passed / 21 expected fail**; new `bodyBank.test.ts` 3 passed; `PhysicalMode.test.ts` **109** (covers the rejections, all three spots, and the **online-room pin**); `SurfZoneRunner.test.ts` 43 by hand. **Deletions: 5 lines, all replaced in place**, each gaining a ternary **whose zero branch is the old expression verbatim.** Every bench **`SINK=0.06`**; every median a **plain** median.

### Three faults of its own, found by its own controls — and one pre-existing fact

1. A bound control compared a **substep** relief against a **step** load and flagged a 67 m relief. The bounded quantity is the **moment**: `|copMoment| ≤ |swingTorque|`, **0 breaches in 15 238 frames.**
2. **And `|copMoment| ≤ SWING_TORQUE` is NOT the bound** — the rotor's return term sits **outside** that clamp and reaches **303 N·m on the shipped rider.** **A pre-existing fact about `humanSwingStep`, found here and not fixed here.**
3. Its positive control put the pair **in flight from frame 10**, testing launch rather than the clamp; **recorded as useless rather than quoted.**

### Open, and the next lever named

**90 of 90 still fall and the ride is 0.25 s shorter.** On the analytic face the term buys much less (`tip` 85.5 % → 81.7 % of frames) and **the cone cost is worst there (2/72 → 37/72).** The **stick-zero arm was not re-run.** **No body lean was added — the bench says the body already leans.**

**Staged plan:** stage 2, the same term on `freeZ` for the pitch rotor (**three lines**); **stage 3, the lag — and the honest reading is that it may not be reducible** (the free body's own period is **~2.05 s against a 0.68 s roll**, and the ankle spring is a settled dead end), **with the one reachable lever being `HUMAN_BANK_FORWARD`, already in the code at 0.1 — a feed-forward on the player's own steering command, not a motor. That is the next thing to measure and it has not been.** Stage 4: 3.2z's double count.

---

## 2026-11-18 — ⭐⭐⭐ VIDEO 19 (PR #422): THE FIRST WIPEOUT IN NINETEEN CLIPS, AND ITS MECHANISM IS THE OWNER'S COMPLAINT

*"where the head goes, the body follows"*, `@hunterjoness` — **13.921 s, 1080×1920, 60 fps (59.94), read in full, one continuous shot.** 441 insertions, 0 deletions. **The third clip in a row from this poster, and a different rider from 17 and 18.**

### The fall, frame by frame — this is the footage the track has been missing

> From **12.63** the board's nose pitches up out of the whitewater, **passes his shoulder, then his head** (in-image board axis ≈**52° at 12.870**, nose above the crown), and **by 12.99 it is gone.**
>
> ⭐ **He answers it with BOTH ARMS THROWN UP AND OUT, GOING TALLER NOT LOWER.**
>
> ⭐ **And he stays upright about 0.4 s AFTER the board is past vertical**, before being thrown at ~13.15 and landing by 13.40.

**Two things there are directly comparable against the game and neither has ever been measured on either side:** **a real rider answers a board rotating out from under him by RISING with the arms up and out** — not by crouching — **and there is a ~0.4 s window between the board going and the rider going.** **One instance each. A second clip makes them findings; a counterexample is worth as much.**

⚠️ **And the clip's own hard limit, stated: his feet are invisible in foam from 12.20 onward — the entire fall. The one clip that finally shows a board leaving a rider cannot show whether a foot left first.**

### ⭐⭐ ROW 5's METRIC IS RETIRED, AND TWO CLIPS RETIRED IT BY CONTRADICTING EACH OTHER

**Clip 18's hands cleared the crown because THE HEAD DROPPED (arms level). Clip 19's cleared it because THE ARMS ROSE WHILE THE HEAD WENT UP** (crown source y 669 → 640 → 596 across 9.502–9.604). **Two clips, two opposite causes, one test ⇒ "a hand above the crown" distinguishes nothing.**

**The shoulder line does, and it has a number: a hand passes the shoulders at 9.528 ± 0.026 and the crown at 9.63 ± 0.03 — 0.10 ± 0.04 s apart — with BOTH hands crossing the shoulders and ONLY ONE ever crossing the crown.** **Every "hand above the head" reading in the series needs re-basing, and PR #407's `ARM_OVER_*` constants were set from them.**

### ⭐ The aspect gate generalises to something the series did not know

**A board standing at 63° IN THE IMAGE still gates at ≥6.0**, because **the gate measures BEARING TO THE LENS and image-plane rotation does not change it.** Rows 10 and 14 refused on **five** frames here (4.4, 6.0, 6.9, 10.2, ≥10 against the 2.2 limit), **no knee examined.**

> **NO MANOEUVRE OPENS THE WINDOW FROM A SHORE-SIDE LENS. The admissible shot is a property of the CAMERA, not of the surfing** — level with the rider, along the board's axis, from the nose or the tail. **Nothing in nineteen clips is that shot.**

### Row 3, and the blockers are now proven to be the instrument

**No transition classified** (one window recorded and classified same-sign up, which is not evidence). **Series unchanged at 47 resolved, seven clips, no opposite sign.** ⭐ **And the three blockers clip 18 named — no checkable elevation, no waist landmark, no fixed scale — are reproduced here on a different rider, break and garment. They are properties of the camera and the clothing, not of any one clip.**

### The feet, and one of my claims corrected

**No foot slide, lift or re-placement in ~160 frames. Nineteen clips, nothing has ever moved.** **Front ÷ rear distance from the nose = 0.595 ± 0.05** at one 1:1 gridded frame — **inside clip 18's 0.55–0.60, on a third rider.** ⛔ **Board-length fraction refused** (tail never clear), so **row 17 stays at two reproduced absolute clips (V7, V17).** Clip 18's deck-logo ruler could not be reused — the logo was legible with both ends visible in only one frame.

⚠️ **And it corrected something I wrote:** `engine-target.md` says a one-piece wetsuit *"removes the hip landmark AND the knee in the same garment."* **Wrong. It removes the WAIST and LEAVES the LEG** — form-fitting, so thigh, knee and shin read as three segments at 10.280 and 11.600. **The clothing clause splits in two, and no single garment in nineteen clips satisfies both halves.** Corrected above.

**⚠️ And the sharpest observation in the report: the owner titled this clip about the head, and the footage cannot measure the head.** Seven distinct causes now. **Row 18 needs a different KIND of clip, not another clip.**

### ☠️ METHOD: THREE NEW TRAPS, AND LAST CLIP'S CURE IS RETIRED

1. ☠️ **`+(t0 + i/60).toFixed(4)` puts THREE OF TEN asks in the same frame at 59.94 fps**, with `currentTime` reaching exactly what was asked. **Unhashed, that publishes three frozen micro-windows that do not exist. Step by 0.0170.**
2. ☠️ **THE SCALE IS NOT STABLE WITHIN A SESSION.** It flipped **1.000 ↔ 0.934 repeatedly with the viewport pinned at 800×640 and nothing opened or closed.** **So a separate ruler frame is no longer sufficient: every measurement frame must carry its own source-coordinate grid and self-calibrate.** All readings here were converted off a grid in the same image.
3. ⛔ **Clip 18's `setInterval` overlay repaint DID NOT PREVENT THE STALE COMPOSITE** — it ran all session and two frames still came back stale (the stamps caught both). ✅ **What worked: a `browser_batch` whose FIRST item is a throwaway `scale: 0.15` screenshot** — **8 of 9**, and two throwaways worked 3 of 3 where one failed.
4. ✅ **A `javascript_tool` timeout with the last seek completed and the token set is a `document.hidden` throttle, not a runaway.** **Check the token before paying for a reload** — none was needed.
5. ✅ **The 260 ms + two-decode seek recipe passes a THIRD 60 fps source** (6/6 same-time, 0/39 distinct-time, 0 unstable).
6. **Four rulers built, two discarded.** ⚠️ **The discarded board finder had GOOD ANGLES (3–8°) and an ASPECT WRONG BY A FACTOR OF TWO** (24.4 where the hand reads ≥10), returning nothing on 1 of 5 frames — **it would have corrupted the one gate the series now depends on.** Three screenshots discarded on stamp mismatches, nothing quoted.

⛔ **Clip 18's 1.583 s fastest chaining is NOT beaten** — the shortest confident gap here is ~6.5 s, over ≥4 resolvable direction changes in 13.9 s. **Second clip running with no take-off.**

---

## 2026-11-18 — ⚠️ **RETITLED AND CORRECTED:** THE OWNER REQUESTED `?bodyBank=hip`, AND THE BUILD ALMOST CERTAINLY DID NOT CONTAIN IT

> ⚠️ **CORRECTION, 2026-11-18, raised by Codex and VERIFIED HERE BY READING. The original title of this section was "The owner rode `?bodyBank=hip` and it did not save the ride". That is a conclusion about a feature that was probably not running.**
>
> **`bodyBank` is parsed 0 times in `src/game/PhysicalMode.ts` on `origin/main`, 0 times in this checkout's working tree, and 6 times only on `claude/body-banks` (PR #421, unmerged).** **So unless the owner checked out that branch and rebuilt, `&bodyBank=hip` was an inert query parameter** — and he had told me earlier, in his own words, ***"i played main"***.
>
> **Status: the switch was REQUESTED; the effective build is UNKNOWN.** **His fall remains entirely valid evidence — about the SHIPPED rider, not about PR #421.** **Everything below describes a real ride and says nothing about whether #421 helps.** One question to the owner settles it and has been asked.

**His address:** `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&bodyBank=hip` — **PR #421's switch ON.**

**Read by extracting frames with AVFoundation via `swift` (no `ffmpeg` on this machine; `AVAssetImageGenerator` with zero tolerance works and is now the method for any local file the owner sends).** 45 frames at 0.25 s plus 48 at 0.0334 s across the fall, cropped and upscaled with `sips`.

### What the ride actually was

| t | what |
| --- | --- |
| 0.0–6.6 | **paddling**, prone, HUD *"Hold RT to paddle into a wave"* |
| ~6.99 | HUD *"Getting up…"*, rider crouched on the board |
| **~7.3** | **standing, upright, arms out, riding a green face with spray off both rails** |
| 7.89–8.19 | **a real ride** — body stacked over the board, spray off both rails, the board angling across |
| **8.39** | **the board has rotated well off the body's line; the body is more upright than the board** |
| **8.59** | **the board is sliding out to the side and the body is upright behind it** |
| ~8.7 | gone |
| 8.99 | HUD *"Wiped out — hold A to pull the leash and climb back on, or Y to paddle out"* |

> ⚠️ **CORRECTED TWICE. (a) The switch was requested, not proven loaded — see the correction at the head of this section. (b) The standing duration above is VISUAL ELAPSED TIME ONLY.** Codex's reading of the same frames: the HUD still shows **"Getting up…" at 6.989, 7.489 AND 7.726** — *even though the rider looks upright by 7.726* — and **it has cleared by 7.993.** The deck and body diverge visibly over **8.39–8.83**, and the wipeout prompt is up at **8.993**. **And the HUD maps that prompt to both push and landing** (`src/ui/ridePrompt.ts:15`), so it is not a clean phase indicator either. **So: ~1.3 s of LOOKING upright, but the game's own reported phase does not clear until 7.99 — nearer 1.0 s — and the exact simulation transition, the speed, the loads and the cause of the fall are all unresolved from a phone recording.** **His "stands 1 second" is, if anything, more accurate than my reading of his video.**

**The visual signature matches PR #419's diagnosis: the board goes out from under him while the body stays upright behind it.** And **it matches what clip 19's real surfer does NOT do** — the real rider answers the same event by **throwing both arms up and out and going taller**, staying up ~0.4 s. **Nothing like that is visible here.**

### ⚠️ What this evidence can and cannot support

**It is a PHONE VIDEO OF A LAPTOP SCREEN playing back a QuickTime screen recording** (*"Screen Recording 2026-11-18 at 18.18.25"*, with QuickTime's scrub bar across the bottom). **The rider is roughly 40 px tall. No angle, no rate and no roll figure may be taken from it, and none is.** Everything above is **qualitative**.

**The single most valuable thing the owner could send next is the ORIGINAL screen recording** rather than a phone video of it. At that resolution the **board's roll and the body's bank could be measured directly from his own ride** — the exact two quantities PR #421 measured on the bench (`d(body bank)/d(deck bank) = 0.8748`, lag 0.100 s) — **which would close the loop between the bench and the thing he actually plays.** It has been asked for.

**Also worth noting and not over-read: this IS a working ride.** He paddles, catches it, pops up and rides a green face with spray off both rails for over a second. **The failure is the end of a ride, not the absence of one.**

---

## 2026-11-18 — ⭐⭐⭐ VIDEO 20 (PR #423): THE FOOTAGE ASK WAS GRANTED AND CHANGED NOTHING. THE CONSTRAINT IS THE CAMERA.

Rip Curl's *"We'd be stoked with that."* — **10.781 s, 29.97 fps, hd1080**, read in full. 419 lines, 0 deletions. Fourth poster, different rider and break.

### ⭐⭐ THE RESULT THAT SHOULD DECIDE WHETHER THE SERIES CONTINUES

**Clips 18 and 19 named three blockers for row 3 — uncheckable lens elevation, no waist landmark, no fixed scale. This clip REMOVES ALL THREE** (a checkable horizon, a bare torso over boardshorts giving a waistband at y 1200 ± 6, per-frame source grids) — **and row 3 is still unresolvable.**

**It is also the FIRST GARMENT IN TWENTY CLIPS to satisfy BOTH halves of the clothing clause** (a visible waistband **and** a bare knee, shin and ankle) — **and the trunk angle is still unpublishable.**

> **The footage ask was granted and it changed nothing. The real blocker is THE BOARD'S BEARING TO THE LENS, which no previous read named and which no clip from a shore-side camera can fix.**

**And for the first time the two causes of refusal are separated:** a **checkable horizon** puts the crown **530 px below eye level in a 1920 px frame** — a small depression, so **the lens is nearly level and the board's bearing alone does the refusing.** The **aspect gate refused the leg chain on four frames (9.0, 7.5, ≥6.4, ≥7.1 against 2.2), from the board alone, one frame each.**

### ⭐ The first recovery from a lost stance in twenty clips

A rider loses his stance at **≈4.97**, ends **chest-down over his own board with his HIPS ABOVE HIS SHOULDERS at 5.4186**, gets his hands off the deck by **5.70 ± 0.05**, and is **standing and riding again at 5.9022** — then surfs another **4.5 s including a barrel.**

| | |
| --- | --- |
| hands-off → tall | **0.20 ± 0.06 s** |
| lowest → tall | **0.48 ± 0.04 s** |
| **lost → tall** | **0.93 ± 0.06 s** |

**27 consecutive native frames plus three measured gridded frames.** **The nearest thing the series has to a pop-up, and the only recovery it has ever seen.**

### ⭐⭐ And it refutes the hypothesis I put in its brief

**Clip 19's rider threw both arms UP AND OUT and went taller. I asked for a second instance.** **This rider does the opposite: across five measured 1:1/1.4× gridded frames spanning the whole loss and recovery, NEITHER HAND EVER REACHES HIS OWN SHOULDER LINE** — −125, −110, −111, −165/−185, −87/−122 px — **and the hands go FURTHER DOWN as the loss develops. He answers with both hands AT THE DECK, not with his arms.**

**Bounded honestly by the reader: this board never passes vertical and never clearly leaves him**, so it refutes *"a rider answers a lost stance with his arms"* and **not clip 19's own frames.** **One instance each side, no third.**

> **The emerging shape, and it is worth more than either instance: the answer depends on whether the board is still under you. Board still there ⇒ hands to the deck. Board gone past vertical ⇒ arms up and tall.**

### ☠️ TWO METHOD FINDINGS, EACH OF WHICH COST A FINDING

1. ☠️ **A 0.33–0.45× survey strip MANUFACTURED the brief's headline.** At low magnification, 4.752 / 4.835 / 4.919 look exactly like *"both arms thrown up and out"*; **at 1.0–1.4× the same frames measure 110–185 px BELOW the shoulders.** **"Strips lie about angles" now extends to LIMB POSITION.**
2. ⛔ **A RETRACTION BEFORE PUBLICATION, and it nearly cost the series its biggest claim.** A 1.5× crop of a **164×129** source window showed what looked exactly like **a foot lifting off the deck on six consecutive native frames** — **row 17's first lift was written.** A 1.4× crop of **529×401 px, wide enough to contain the board**, shows **both feet planted.** **Retracted. Row 17 stands at twenty clips and zero.**
   > **Rule bought: every contact judgement needs a frame containing BOTH the limb AND the whole object. Magnification without context lies as readily as a strip.**

### The rest

**⛔ No take-off, third clip running.** **0 resolvable direction changes in 10.781 s** — V7's zero reproduced on a second rider and break. **Row 17: front ÷ rear from the nose = 0.596 ± 0.05 — a FOURTH rider inside 0.55–0.60**, matching clip 19's 0.595 to three decimals; ⚠️ **but the absolute fraction is ≤0.44, mildly BELOW the twice-reproduced 0.47–0.49, and is reported as a tension rather than a refutation.** **New and scale-free: stance width ÷ crown-to-deck = 0.36 ± 0.04, narrowing ≈21 % as he loses balance.** **Row 6: a second "zero pumping" clip** (no cycle in 4.5 s of trim). **Row 15: thirteenth clip and its most extreme instance — hands literally AT the deck for 0.65 s and ≈1.2 s, 17 % of the ride.** **Row 18: eighth distinct cause** (back to the lens plus a light cap removing the hairline).

### Method

`document.hidden` was true most of the session: **every seek cost ≈1.5 s and `setTimeout` was clamped to ≥1 s.** Cures that worked: an **unclamped `MessageChannel` delay**, and a **background-job-and-poll runner that cannot hit the 45 s ceiling.** ⛔ **Clip 19's throwaway-`scale:0.15` cure failed 3 of ~16** — a **second `browser_batch`** fixed all three, and the footer stamp caught all three. ☠️ **The 260 ms + two-decode seek recipe returned one stably-wrong frame in ≈25 on its first 30 fps source — its first failure after three 60p passes.**

### ⏸️ CLIP 21 IS HELD, NOT DISPATCHED

**The binding constraint is now identified and it is structural: the board's bearing to the lens.** **No clip from a shore-side camera can satisfy it, and twenty clips have proved the point.** **The owner's decision**, surfaced rather than quietly continued.

---

## 2026-11-18 — ⭐⭐⭐ STOP ATTACKING THE LAG (PR #424). THE LEVER WAS DEAD CODE, AND #421's IDENTIFICATION OF THE LAG IS REFUTED.

**Measurement only — nothing under `src/` or `server/`, no deletions against the merge base.**

### 1. `HUMAN_BANK_FORWARD` is a real feed-forward term AND DEAD CODE ON THE OWNER'S ADDRESS

```
:2526  this.bankForward = options.humanGains?.forward ?? HUMAN_BANK_FORWARD;
:2527  this.predictive  = this.newRider && options.humanGains === undefined;
:3600  private humanBank(...) { if (this.predictive) { this.predictiveBank(...); return; } ...
:3609    const wanted = this.bankForward * this.bankReference - ...   ← the ONLY use
```

**On `?rider=new` with no `humanGains`, `predictive` is true, `humanBank` returns early, and `:3609` never runs.** `grep -rn humanGains src server` finds **`AttachedRider.ts` and nothing else**; **no URL switch sets it** (its own comment: *"for the probes' sweeps only"*). **The shipped rider's feed-forward is the predictor's `ref.u` from `steadyTurn`, not a scalar at 0.1.** And **passing `humanGains` to sweep the constant replaces the whole controller**, so a "sweep" of it is not one lever.

**Proved, not asserted:** five values (0 / 0.05 / 0.4 / 1 / 2) × 72 riders = **1 050 840 column-values, 0 differences, 72/72 runs identical each**; and **20× on his own spot, 90 riders, 285 898 values, 0 differences, 90/90.** **Positive control — the delay constant down the same path — gives 87 944 differences and 10/72 identical**, so the instrument works. **No switch built. A null, per the brief.**

**And where the term IS live (the 3.2 reflex law), raising it is HARMFUL:** `g0.1 → g2` multiplies the deck's roll rate **×8.6** (5.39 → 46.36 °/s), the mismatch **×6.5**, pinned **12.2 → 39.5 %**, ride **1.000 → 0.300 s.** **A bigger anticipation is a bigger demand on the contact.** ⭐ **That is the FOURTH measurement of the same shape** — after `HIP_CAPTURE_GAIN` was left at 0 three times — **on a different joint.**

### 2. ⭐ IS THE LAG REDUCIBLE? MOSTLY NO — AND #421's IDENTIFICATION WAS A COINCIDENCE

**At a ONE-FRAME delay the follow gain still reaches 1.000 at 0.1016 s** — the very 0.100 s #421 matched to `BALANCE_DELAY` *"to the millisecond"*. **Over a twelvefold sweep (0.0167 → 0.200 s) the lag stays 0.081–0.120 s on the sea and 0.052–0.078 s on the face, and is not monotone.**

**τ = 53.1 + 0.131·delay (sea), 51.9 + 0.233·delay (face) → 53 of 72 ms and 52 of 81 ms survive at ZERO delay. 64–74 % of the lag is not the sense.**

**What is left is structural, from the code's own constants at the measured pendulum length** (`legLength` median 0.694 m, m = 73.00 kg): k − mgL = 315.9, I = 33.4, **T = 2.042 s** (reproducing #421's 2.05), ζ = 0.39 → **a step in the commanded rest delivers 4.3 % at 0.100 s and 50.1 % at 0.400 s**, against **a deck that banks 20° in 0.68 s.** On the ride the **command→joint gain peaks at 0.672 at 0.083–0.100 s and never reaches 1.** **And the command cannot anticipate the roll: corr(command rate, deck roll rate) = 0.138 at best over every lag in 0–0.5 s**, against the same instrument's control of 0.462; **command rate peaks at 80 °/s against the deck's 502 °/s.**

> **RECOMMENDATION: STOP ATTACKING THE LAG.** Reachable is **~19 ms of 72 (sea) and ~29 of 81 (face)**, behind a sourced constant (90–100 ms, Nashner 1977). **The rest is the ankle spring plus body inertia, both settled dead ends. THE REACHABLE QUANTITY IS THE ROLL RATE.**

⚠️ **One counter-note for the record, and it is not the same thing: a shorter delay DOES ride longer** — **1.067 s at 0.20 down to 1.617 s at one frame, monotone.** **The loop is delay-limited for SURVIVAL even though the body-deck lag is not the delay.**

### 3. Two further refutations of #421, one of which may reframe the whole diagnosis

- **Per frame, the rate law carries nothing.** `|mismatch| = B|rate|` gives B = 54.0 ms with **R² = −0.053** — worse than the mean. `|mismatch| = A|deck bank|` gives A = 0.169 °/° with R² = 0.144. **#421's band table reproduces (38.8–87.0 ms) because those are band MEDIANS; the per-frame law is the ANGLE, not the rate.**
- ⭐⭐ **A nonzero body-versus-deck angle is what a coordinated turn is SUPPOSED to have.** The schedule builds `tan(lean) = pull·tan(rail)` with pull 0.76–0.88. In the water's frame on his spot: at 20–40° of rail the body sits **27.28–28.54°** where the design wants **24.3°**; at 40°+ it sits **49.62–55.12°** where the design wants **48.6°** — **within 12 % and 8 % of the design's own steady turn.** **So `bank − roll` is the ankle's WORKING ANGLE, not pure error** — and **`ANKLE_REST_RANGE` (14.32°) already exceeds the support's 10.9°.** **Flagged by the round as needing its own round, and explicitly NOT claimed to overturn the fall diagnosis.** It is the most interesting loose thread on the table.

### 4. Instrument

**Reproduces #421's shipped column on EIGHT quantities** (follow slope 0.8782 vs 0.8748; median mismatch 2.951° vs 2.950; gain 1.000 at 0.105 s; `tip` 90/90; ride 1.367 vs 1.333; roll peak 66.84 vs 65.65; rate 49.2/210.5 vs 55.1/194.7; mismatch-per-rate 38.8–87.0 vs 40.0–79.9). **Two do not** — first `tip` frame 24 vs 46, pinned 22.1 % vs 52.0 % — **placement: its trials land on a 0.27–2.77° face.**

**`SINK=0.06` everywhere, and measured against flush for the first time: frame 1 reads 0.0611 m / 678.6 N / 0 of 72 dry, against 0.00024 m / 604.7 N / 30 of 72 dry — and 68 of 72 outcomes differ.** ⭐ **The plant estimator's synthetic positive control caught a real bug of its own** (a Gauss pivot dividing in place) **that had produced coefficients of 10⁴⁴** — **and the clean plant could NOT be recovered from a ride (R² 0.17–0.40), which is why its conclusion rests on arithmetic rather than a fit.** Probe inert: `INERT=1` → 72/72 identical. Plain medians throughout.

⚠️ **This branch is off `main`, so every arm is the SHIPPED rider** — #421 is unmerged, so its baseline had nothing offered against it. **But #421's own switched arm had the same follow gain (0.8718 vs 0.8748), so that term moves the CONTACT BOUND, not this loop's timing.** The two results are about different things and neither replaces the other.

---

## 2026-11-18 — ⚠️ THE PROPOSED THROUGH-CLIMB READOUT HAS NO DELIVERY PATH, AND I VERIFIED THAT TOO

Codex's second finding, **confirmed here by reading both files:**

```ts
// src/ui/App.ts, finishRide
const { report: _, timeScale: __, ...summary } = result;        // ← report destructured OUT
const records = this.logbook.add({ ...summary, spot, conditions, … });
…
if (!showsEndCard(result)) return;

// src/ui/RideEndCard.ts
export function showsEndCard(_result: RideResult): boolean { return false; }
```

**`report` is removed before `Logbook.add` ever sees it, and `showsEndCard` returns `false` unconditionally — by the owner's own instruction of 2026-10-31** (*"the popup to start a new wave or change beach is still there; remove it"*).

> **So a worker-only field, or anything added to the end card, would NEVER REACH HIM.** The readout I proposed earlier — *"a quantitative through-climb readout in the existing ride report"* — **had no delivery path, and I proposed it without checking one existed.**

**Codex's recommendation, adopted as the design when that round runs: an optional saved field in the existing `Logbook`, carrying honest early-fall / unknown results**, and — when internal telemetry exists — **distinguishing the effective input and the foot support from the aim or the failure label.**

**⚠️ And a measurement pitfall for any climb readout, reported by Codex and NOT yet verified here:** `waveFrame.ts` **selects the highest local crest anew**, so **it can restart its speed estimate on a crest switch while `valid` stays true.** **A fixed board simply overtaken by a crest must not be credited with an active climb.** Recorded as reported; whoever builds the readout verifies it first.

**No builder has taken the readout.** The only round running is the **save window** (`claude/save-window`), which the owner asked for in so many words.

### ☠️ A READOUT FAULT IN #421's EXPOSED CENTRE OF PRESSURE — confirmed by algebra from the source

Codex, at `3c6b8721`, `AttachedRider.project`:

```
:5501  const freeX = moment === 0 ? … : local.x - (height * j.x + moment) / j.y;      // moment IN
:5515  let tx      = moment === 0 ? … : ((local.x - copX) * normal - moment) / height; // moment IN
:5535  const cx    = local.x - (height * tx) / normal;                                 // moment NOT restored
```

**Substituting `:5515` into `:5535` gives `cx = copX + moment/normal` exactly.** Codex's executed example: `local.x = 0.19`, `height = 0.60`, `normal = 0.75`, `j.x = 0`, `moment = 0.0375`, feet ±0.13 → **free demand 0.14 m, support-limited 0.13 m, reported 0.18 m**, with a **zero-moment control agreeing.** **A five-centimetre readout difference in a constructed example; not measured on the owner's ride.**

**What survives:** `limit = 'tip'` is set at `:5512` from `copX !== freeX`, **upstream of the exposed reconstruction**, so **the published `tip` counts (90/90 shipped, 66/90 switched) are NOT invalidated.** #421's sign check reads as unaffected too — it used `freeX` and `copRelief = −moment/j.y` rather than the exposed column — **but that is a reading of its method, not a verification of its numbers, and #421's author should confirm it.**

**Relayed to the save-window builder mid-run, because my own brief had told it to test "does the CoP unpin when a hand loads" — an unsafe test as written, replaced with `tip`.** It is told **not** to fix the column in its branch (that is #421's, and a silent fix would make the two PRs disagree), and **to keep four meanings separate: raw demand, clipped support, post-friction effective line, actual load.**

### ⚠️ AND A SCOPE ERROR IN MY SAVE-WINDOW BRIEF: DECK LOAD IS NOT WATER FORCE

**My brief told the builder: *"your feature is exactly 'the hand is made to carry weight', so measure the discarded residual and report it for the owner's row-19 decision."* That is wrong, and Codex caught it mid-build.**

**PR #418 measured the EXTERNAL HAND-WATER force**, in `applyWater` (`AttachedRider.ts:4344, 4469, 4490`). **The save window puts a palm on the DRY DECK — an INTERNAL, equal-and-opposite impulse between rider and board at the palm.**

> **A dry palm can carry substantial deck load with ZERO hand-water residual. So this feature does NOT make row 19's decision live, and the 180–260 N·m wet-hand extrapolation is NOT a prediction for the recovery.**

**Relayed, with the instruction to log and name the two forces and the two moments separately — own normals, own frames, own denominators — and never to add the dry-deck load to `waterMoment`.** **My linkage is withdrawn.** If a dry-deck hand produces no water force, **row 19 stays exactly where #418 left it: shelved.**

**And Codex's control design is adopted, because it isolates the mechanism without prescribing an outcome:** ⭐ ***a dry loaded palm with zero water reaction, compared against a CLEAR-DECK MISS, distinguishes the two without prescribing a successful stand.***

**Two refinements also relayed:** my CoP warning **applies only where #421's hip term is active**, so **a save branch off unchanged `main` has zero of that mismatch** and is not hobbled (though `tip` remains the cleaner test); and **clip 20 is an ASSISTED RECOVERY, a different skill from carrying speed through a clean bottom turn** — the write-up must not blur them.

### Codex's through-climb readout criteria, for whoever builds it

**Follow the trajectory of a consistent point on the board; sample its velocity and the local water TOGETHER; and check actual up-face travel from turn entry through release.** ⚠️ **The local wave gauge reselects the highest crest, so a jump can reset its speed estimate while the frame still reports `valid`, and a crest passing a STATIONARY board can raise the face fraction.** **Separate a confirmed same-face climb from an early loss or an uncertain face identity.** Sources it cites: `waveFrame.ts:143`, `rideAnalysis.ts:249`, `App.ts:687`, `RideEndCard.ts:52`, `LogbookScreen.ts:26`. **Delivery: a compact optional field on the existing Logbook entry and screen, preserving early falls as partial observations** — a retry can end a ride before the worker publishes a detailed report, and **old entries have no such field.**

---

## 2026-11-18 — TWO MORE OWNER RIDES, AND ONE SHOWS THE `separate` BUG IS VISIBLE TO THE PLAYER

**Two further phone videos of the laptop screen** (576×576, ~30 fps, 8.2 s and 9.0 s), read the same way — AVFoundation via `swift`, frames at 0.5 s. **Same caveat as before: a phone video of a screen; the rider is tens of pixels; nothing here is measured.**

| | video A (8.234 s) | video B (8.982 s) |
| --- | --- | --- |
| paddling | to ~4.5 | to ~5.0 |
| *"Getting up…"* | **~4.97** | **~5.48** |
| standing and riding | — | **7.48, upright on a green face** |
| ⭐ *"Wiped out…"* **shown** | **~6.97** | **~7.98** |
| rider gone from the board | ~6.97 | **~8.48** |

**B is the longest of the three rides the owner has sent.** Both still end in the whitewater, and **no recovery appears in any of them** — which is the gap the save-window round is building against.

### ⭐ THE FINDING: AT 7.982 IN VIDEO B THE "WIPED OUT" PROMPT IS ALREADY SHOWING WHILE THE RIDER IS STILL DRAWN STANDING ON THE BOARD

**Arms out, upright, on the deck, on a green face — with the wipeout prompt up.** He is gone by 8.482.

> **There is a visible lag between the game declaring the wipeout and the drawn rider reflecting it.**
>
> ⚠️ **MY ATTRIBUTION OF IT WAS WRONG AND IS WITHDRAWN.** I blamed `AttachedRider.separate` (`:5227–5232`) for never clearing `phase`/`upright`. **Codex challenged it and the code agrees with Codex: `RideSession.ts:358` is `return this.rider.attached ? this.rider.phase : 'fallen';` and `:352` switches the drawn point to the detached surfer once `attached` goes false — so the PRODUCTION path never reads the stale field.** **The staleness is real and remains a PROBE hazard** (probes read `rider.phase` directly, and it corrupted one round to 64–93 % frozen frames) — **but it is not the player-visible bug I claimed.** Codex's explanation is the better one: **the snapshot drawing lags the HUD, and the detached rider starts at the outgoing pose.** **The symptom is real; the cause is not yet established, and Codex's independent visual read is underway.**

**That defect has been treated all session as a PROBE hazard** — "every rider column freezes after separation", which corrupted one earlier round's figures to 64–93 % frozen frames. **This is the first evidence it is also visible to the player.** **It is a bug the owner can see, not only one that spoils measurements**, and it should be raised with him as such.

⚠️ **Bounded: one instance, on a phone video, at ~0.5 s sampling.** A finer read of the original capture would pin it; **the mechanism is already known from the code either way.**

### Unknown and asked

**The owner sent all three videos without saying what differed between the runs** — same build, different switches, or different waves. **Given that `bodyBank` is parsed only on `claude/body-banks` and he said he played `main`, the likeliest reading is that all three are the shipped rider on main and the differences are wave and input.** **Asked, not assumed.**

**And the two falls may not be the same failure:** the first video's board **slid out on a green face**; **B's wipeout coincides with the whitewater arriving** (the foreground is entirely foam by 8.482). **A section closing out and a balance failure are different events and must not be pooled.**

---

## 2026-11-18 — ⭐⭐⭐ THE SAVE WINDOW IS BUILT AND IT DOES NOT SAVE HIM (PR #425). THE TWO REASONS POINT AT TWO OTHER PRs.

**`?saveHands=deck`, with `?saveHands=miss` as Codex's clear-deck control. Off unchanged `main`, beside #421, not on it.** **No force, no torque, no drive, no clock, no constant of its own** — **two geometry changes to the contact that already exists:**

1. **`project`** — while a palm is on the deck, the box the contact impulse's line may meet the deck inside **grows to that palm's patch edge**, limited by the palm's own strength at that substep's load: `span × min(1, cap/N)`, `cap = HAND_FORCE_LIMIT × m g × h`, **the engine's own hand cap.**
2. **`captureStep`** — the same distance credited to `HumanBalance.capture`'s `reachAcross`/`reachAlong`. **Without this the window could not exist**: measured, **68 of 90 falls on his address are the capture test (`human.fallen`) and 22 of 90 the contact's posture exit** (0 sway, 0 flight), **so the contact's box alone leaves three falls in four untouched.**

The palm's reach is from the shoulder, its travel from where the hand is carried, at `ARM_LENGTH / ARMS_TIME`. **It lifts the instant the demand returns inside the feet — nothing holds it down, so the window's length is the solve's answer**, not a clock. Drawn where the physics puts it.

### The five measurements

| | |
|---|---|
| **does `tip` clear?** | ⚠️ **sometimes, nowhere near enough.** The palm holds the clamp open on **14 of 176 palm-down frames (8.0 %), 8 of 16 runs** — but **`tip` binds in 90 of 90 runs either way**, 52.0 % → 52.1 % of frames |
| **window / recovery** | **22 windows in 16 of 90 runs**, median **0.093 s**, longest **0.441 s**. **2 of 22** ended with the demand back inside the feet and the rider still riding. **90 of 90 still fall**, causes unchanged |
| **hand force** | median **73.08 N**, **max 286.45 N against a 286.5 N cap** (11 frames at it) — **27× the water reach's 2.66 N median, 107× its peak** |
| **row 19** | ⭐ **NULL, AND IT CLOSES IT.** The hand-**water** force is **bit-identical on both arms — 522 frames, median 6.97415 N, max 63.4862 N, the same digits.** **A dry palm has zero water reaction, so row 19 stays shelved.** The dry palm's own moment (median 8.4, max 102.2 N·m) **is not discarded — it rides inside the one contact pair** |
| **default unchanged** | ⭐ **428 422 values over 84 shared columns and 7 298 matched rows, 0 differences; 90 of 90 outcomes identical** |

### ⭐⭐ THE TWO REFUTATIONS, WHICH ARE THE ROUND'S REAL OUTPUT

**1. THE DECK IS THE WRONG SURFACE FOR THIS FALL.** **A palm's patch edge cannot pass the rail**, so the across support grows by **0.102 m and no more** (measured ceiling 0.10194 m). **And when the palm lands, the demand is a median 0.327 m outside the feet — about twice the board's half-width — past what the palm covers on 159 of 176 palm-down frames.**

> **No deck palm reaches that. A WATER hand can.** **So `waveSide`'s early return (PR #418's bug — holding the hand key switches the reach OFF) is now ON THE CRITICAL PATH** — **and the water hand brings row 19's force-class ruling back with it. Needed for the water hand; NOT for this one.**

**2. THE RIDER CANNOT BEND, SO HE CAN BARELY REACH HIS OWN DECK.** Shoulder a median **0.829 m** above the deck against a **0.700 m** arm: **reachable on 0 of 2 481 tall frames, 59.7 % of crouch, and 1.0 % of compress — and all 22 windows were crouch windows.**

> **Clip 20's real rider gets his hands down by FOLDING until his hips are above his shoulders — which is `?trunk=mass`, PR #411.** **This feature's reach is gated on another PR's geometry.**

### Course corrections, each addressed

**`tip` not the CoP column** — done, **plus an independent corroboration: on `main` the arithmetic makes `cx ≡ copX` short of friction saturation, so off this switch the exposed column IS the clipped point by construction.** **#421's hip-term fault does not exist on this base** (verified by reading both copies) **and was not "corrected" here.** **Row 19 withdrawn** — nothing added to `waterMoment`, the two forces logged separately with their own normals and denominators, **and the null reported.** **The clear-deck-miss control** is `'miss'`, and it doubles as the default-unchanged proof. **Assisted recovery ≠ bottom turn** — §7 refuses the comparison: **the engine's fall here is a ROLL tip (escape across on 983 frames of 1 075); clip 20's save is a PITCH collapse. The deck is narrow for a roll and wide for a pitch.** Clip 20's 0.93 s is quoted as **one instance, on a different event.** **The broken hand path: not used, not fixed, and said so** — the save's hand is a **dry deck** contact through the feet's own support machinery, which is why it carries **73 N instead of 2.66 N.**

### ☠️ What went wrong, reported rather than smoothed

- **A filter without a finiteness guard read 40 of 40 frames "pressed" on the shipped arm, where the field does not exist.** **Exactly the warned failure mode**; guarded everywhere now.
- ☠️ **`shape.curves.width` is the FULL width and was read as a half-beam**, giving a 0.254 m span where the deck allows 0.102 m. **Caught because the arithmetic disagreed with the brief's own prediction.**
- **The travel model was corrected after the first numbers**, so §4.6 **publishes the whole bench both ways** — and **the correction is a measured null** (0.6379 → 0.6410 m, 0.137 s either way), **so the verdict does not rest on it.**
- Controls: determinism (487 076 values, 0 diffs), probe inert (109 470 values, 0 diffs), **palm and water hand never load on the same frame, 0 of 7 233 — measured, not assumed.**

### ⚠️ ONE VERIFICATION GAP, STATED PLAINLY

**The full `vitest run` was started and ABANDONED at ~25 minutes** — the machine was thrashing, the worker getting ~13 % of a CPU with swap near full. **Targeted suites all pass** (`saveHands` 6, `PhysicalMode` 109, `RideSession`, `AttachedRider`, `humanBalance`, `riderPosture`, `projection`, `projectionLean`, `riderBounds`, `SurfZoneRunner`, `deepCrouch`, three ledgers), typecheck clean. **The full suite has NOT been run on this branch.** **Deletions: 8 lines, every one a replaced line; nothing removed.**

**His address:** `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&saveHands=deck` — **and the palm only appears in a crouch, which is the second finding and not a bug.**

### ⚠️ TWO SUPPORT-GEOMETRY FAULTS IN THE SAVE BRANCH — they inflate exactly its positive numbers

Codex, reviewing `f4d0a09a`. **Relayed to the builder with an instruction to CHALLENGE them first**, then requalify.

1. **The palm extension is UNSIGNED, so a right hand is credited with LEFTWARD support.** `captureStep` (`:5417–5423`) adds unsigned palm extensions to `reachAcross`/`reachAlong`, and `HumanBalance.capture:486–500` applies them **to either side.** Worked case: feet ±0.13 m, a **right-only +0.08 m** extension, zero spare rotor reach, capture point at **−0.18 m** — **the code treats the leftward escape as within reach, and the right hand cannot supply it.**
2. **Independent x/z bounds leave PHANTOM CORNERS for a single palm.** `project:5603–5629` expands x and z independently, so the admissible region is a **rectangle** where it should be the **weighted convex region of the feet plus that one palm.** Worked case: feet x ±0.13, z ±0.35; palm patch x = [0.17, 0.23], z = [0.42, 0.48], palm capped at half the normal. **At x = 0.18 the maximum foot and palm x require 50 % of the load at the palm, so the resultant z must be ≥ 0.035 — yet the rectangle admits (0.18, −0.35), impossible even with that generous patch.**

> **Both faults can only make the feature look BETTER than it is, and both land on the round's only positive numbers — the 14 cleared frames and the 2 returns to the feet.** **The verdict is untouched:** 90 of 90 still fall, `tip` binds 90/90 either way, and **the demand is a median 0.327 m outside the feet against a 0.102 m ceiling.** **Incidence across the 90 runs is unknown.**

### The recount (`459f236c` on `claude/save-window`): both faults hold, 14 → 10, and the headline does not move

**Challenged first, as asked, and neither could be refuted.** Fault (2) was **re-derived independently before reading Codex's numbers** — the truth is the convex region `{(1−λ)f + λp : f ∈ feet, p ∈ palm, 0 ≤ λ ≤ share}`, and at full x-extension the share is pinned *and* the palm sits at its own edge, so z is pinned with them. Reproduced on the engine's own arithmetic. Fault (1) holds in the source: `capture:488` is `pastX = max(0, |across| − halfAcross)` and `:495` is `beyond = pastX > reachAcross`.

⚠️ **One correction back to Codex, to its worked case and not its conclusion: its palm patch is 0.03 m wide and the engine's is `HAND_RADIUS` = 0.08 m**, so its boundary figure (0.035) is not this engine's (**−0.11**). ☠️ **And the builder's own first test asserted Codex's number against the engine's patch and failed — the same frame error this track keeps making, recorded rather than smoothed.** **The fault reproduces either way.**

| | published | **recounted against a feasible foot-plus-palm region** |
|---|---|---|
| `saveCleared` frames | **14 of 176** | ⭐ **10 of 176 (5.7 %)** — **4 phantom (28.6 %)** |
| runs with any | **8 of 16** | ⭐ **5 of 16** |
| demand feasible at all | — | **17 of 176 (9.7 %)** |
| returns to the feet | **2 of 22** | **2** — ⚠️ **but 1 leaned on a phantom corner** |

**The recount instrument is read-only and proved so: 495 894 values over 103 columns and 7 323 rows, 0 differences, 90 of 90 outcomes identical.**

### ⭐ And fault (1) moves nothing measurable — for a reason worth keeping

**`HumanBalance.capture` sets `frozen = load < CAPTURE_LOAD` and RETURNS BEFORE IT READS `reachAcross` AT ALL.** `CAPTURE_LOAD` is 0.2 body weights, and **palm-down frames carry a median capture load of 0.048 — because the palm goes down exactly when the feet go light.**

> **So on 134 of 176 palm-down frames (76.1 %) the extension has no effect whatsoever.** On the 42 live frames: wrong-side credit **6**, the signed test flips `beyond` **1**, and `weightPast` (which `fallen` also requires) true on **0** of those. **The unsigned credit never changed `human.fallen` on an awake test.**

⛔ **And it REFUSED to publish the frozen-frame comparison** (51 flips, 12 with `weightPast`) **because on a frozen substep `s.across` is stale while the extensions are current — the substep-against-a-step trap this track has already paid for.** Its own frozen-window check caught it.

**Incidence:** 4 of 176 frames in 4 of 16 runs phantom-cleared; **47 of 176 carry a wrong-side credit, 6 of them on a live test**; of 22 windows, 4 affected by phantoms and 7 by wrong-side credit.

**It measured the geometry and did NOT fix it, with its reasons written down to be overruled:** a behaviour fix means **projecting onto the convex region** rather than testing membership, **plus a signed credit that `capture`'s unsigned `pastX` cannot express today**, and it would **invalidate the default-unchanged proof and every number in the round** on a machine taking ten minutes a bench pass. **It is now stage-plan item 0, ahead of the water hand, with its exact shape written down, and `saveHolds` is in the tree ready for it.**

### ⭐ And my `separate` claim is now conclusively dead, with the lines

- **`RideSession.renderPoint` (`:418–419`)**: `this.rider.attached && !this.ducking ? this.rider.renderPoint(...) : this.surfer.getPartPosition(...)` — **stops routing to the attached rider the instant `attached` goes false.**
- **`RideSession.phase` (`:361`)** returns `'fallen'` on the same flag.
- **The detached body starts at the outgoing pose:** `surfer.start(rider.handoffState(this.handoff))` (`:479`, `:516`), seeded from *"the rider's own body, its parts where they were."*

> **So `separate`'s frozen `phase`/`upright` CANNOT produce an upright rider under the "Wiped out" prompt. Production never reads it after the rider lets go. It matters only to probes calling the class directly — which is exactly what this handoff's note about it is for.** **And the same reading clears PR #425's own drawn palm: its `saveDown === 1` branch can never be reached after separation.**

---

## 2026-11-18 — ⭐⭐⭐ `claude/ride-all-three` (PR #426): ALL THREE SWITCHES ON ONE BRANCH, AND THE COMBINATION IS NOT WORSE

**The owner's line:**

```
git fetch && git checkout claude/ride-all-three && npm run dev
?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&armCarry=on&trunk=mass&bodyBank=hip
```

**90 Canyon riders on his own address and spot**, seatbelt read off the solver and printed (**400 × 451 = 180 400**, object wrapper, spin-up 63.6 s, `search` echoed), **`SINK=0.06`**, every run cut at its first `attached == 0` with the kept count in every row, **plain medians.**

| arm | `tip` of 90 | first `tip` frame | ride s | roll peak ° | pinned % | cone | slips |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **ships** | **90** | 46.0 | **1.3333** | **65.65** | **51.96** | 6 | 0 |
| `armCarry` | 90 | 46.0 | 1.3333 | 65.65 | 51.96 | 6 | 0 |
| `trunk` | 90 | 46.0 | 1.3333 | 65.65 | 51.57 | 6 | 0 |
| `bodyBank` | **66** | 38.5 | **1.0833** | 52.43 | 32.25 | 28 | 2 |
| trunk + bank | 66 | 38.5 | 1.0833 | **51.76** | **31.14** | 28 | 3 |
| **all three** | **66** | 38.5 | **1.0833** | **51.76** | **31.14** | 28 | **3** |

**All three together equal or beat `?bodyBank=hip` alone on every quantity named** — same `tip` and frame, same ride, **lower** roll peak and **lower** pinned share. **Cost: one more `foot slip` (3 vs 2) and 106 fewer live frames.** **The bench reproduced both of #421's published rows to the decimal before anything new was read off it.**

### Three findings beyond the table

1. ⭐ **`?armCarry=on` adds NOTHING to the physics in any combination — measured, not asserted.** Each of four arm pairings is **bit-identical** to its no-arm partner once the drawn hand points and carriage read-outs are set aside: **3 041 500 values, zero differences.** **It is exactly the drawing-only channel it was built as.**
2. ⭐⭐ **`?trunk=mass` FIRES HARD AND STILL DOES NOT MOVE THE FALL.** The fold is non-zero in **1 399 of 7 149 live frames (19.6 %), peaking at 0.748 rad = 42.9°** — **not dead code** — and it moves **342 757 of 865 859 values** against `ships`, diverging from frame 208. **Yet `tip`, the median first-tip frame, the median ride and the roll peak are unchanged to every decimal printed.** **On this bench the trunk's mass fold rewrites the ride in detail without changing whether or when he falls.**
3. **One real interaction**, in #421's own read-out: worst-case CoP relief falls from **10.50 m (bank alone) to 2.24 m (all three)** — a factor of **4.7** — while `copMoment`'s peak is unchanged at **271.30 N·m**, and the firing rate barely moves (47.6 % → 47.3 %). **#421's own published 3 061 of 6 425 reproduced to the frame on the combined branch.**

### The proofs

| | values | differing |
| --- | --- | --- |
| each switch alone vs its source branch (4 comparisons) | **791 597** | **0** |
| default vs `main` | **201 571** | **0** |
| the 6 read-out columns `main` lacks | 10 392 | **0 non-zero** |

**Suites:** `tsc -b` clean · `src/physics` **657 passed / 21 expected fail** · `src/scene/rig` **263** · `src/game` **485** · **`SurfZoneRunner.test.ts` by hand 43/43.**

**The instrument can fail, as required:** two **one-part-in-10⁹** perturbations both caught — `ARM_SPREAD` 0.7 → 0.7000000007 moved **9 465 values**, `FOOT_FRICTION` 0.9 → 0.9000000009 moved **53 948**. Both reverted, repo verified clean.

### The conflicts were resolved MECHANICALLY, not by eye

**15 blocks across SEVEN files** (the brief said six — `src/game/PhysicalMode.test.ts` conflicts too). Re-written in **`diff3` to expose the base**, then: **base-empty blocks → ours-then-theirs verbatim (8 of 15)**; **single-line blocks → `difflib` insertions from the base, REQUIRED TO BE PURE INSERTIONS OR ABORT (7 of 15).** **Verified both ways afterwards: the trunk merge gained exactly its 131 added lines, body-banks exactly its 1 273, and `AttachedRider.ts` and `PhysicalMode.ts` are pure insertions in both directions — not one line removed.** **No conflict required a judgement call about behaviour.**

### ☠️ TWO TRAPS, AND THE SECOND PRODUCES A CLEAN-LOOKING LIE

1. ☠️ **"CoP-pinned 52.0 %" is NOT the share of frames with `limit === 'tip'` — that reads 16.50 %.** **52.0 % is the share with `limitTime.tip > 0`, the step's decaying memory.** **Anyone re-measuring "pinned" off `limit` would publish a third of the figure and conclude the bench was broken.**
2. ☠️ **In zsh, `SECONDS=<x> node bench.mjs` goes through zsh's own special INTEGER variable.** **`4` survives as `"4"`, but `0.5` arrives as `"0"`, every run ends at frame 1, AND THE BENCH STILL PRINTS A TIDY SUMMARY WITH NO ERROR.** **Use `env SECONDS=…`.** **Published 4-second benches are unaffected — but any sub-second horizon passed that way has silently never run.**

**And a correction to me: `AttachedRider.separate` is at `:5428–5433` on the combined branch, not `:5227–5232`** — the merge shifted it ~201 lines. **I have been quoting the `main` number in briefs all session; it must be quoted with its branch.**

**#421's read-out fault was carried across UNFIXED as instructed**, and confirmed harmless: the `tip` counts come off `limit`, set from `copX`/`freeX` **before** that line, and **nothing outside `AttachedRider` and its tests reads `centreOfPressure` at all.**

### The merge bench is committed — `efa6e15b` on `claude/ride-all-three`

**`merge-bench.ts`, `compare.py`, `table.py` in `docs/research/new-rider/3.5/`, 584 insertions, nothing else changed.** Committed **because the scratchpad has been cleared twice today** and the disk hit 99 % twice; anything left there dies on the next sweep. **The table is now re-runnable.**

**Both traps are at the top of the files**, and a third in `compare.py` — *a zero means nothing unless the instrument can see a difference*, with the two one-part-in-10⁹ perturbations named as the thing to repeat, **and a warning that `SKIPCOLS` is both the honest way to compare across commits and the easy way to exclude the column that moved**, which is why it is echoed on every run. **That last one is a good instinct nobody asked for.**

**And it checked rather than assumed, on all four counts:** `git diff 6f844999 efa6e15b -- src` is **empty**, so the merge and every number stand; **the committed copy is provably the same bench** — the eight import prefixes had to change for the new location, so it was re-bundled at the new path, re-run and compared against the file that produced the published row: **211 963 values, zero differences**; `docs/` is outside `tsconfig`'s `include` and `vitest`'s globs **by construction**, with `tsc -b` re-run clean afterwards; and both Python scripts were **smoke-run from their committed paths** and reproduce the published rows. **The PR body never claimed the bench was off the branch, so nothing in it went stale and it was left alone.**

---

## 2026-11-18 — ⭐⭐⭐ THE OWNER RODE ALL THREE SWITCHES TOGETHER. VERDICT: BARELY FELT, CORE COMPLAINT UNCHANGED, ARMS A WIN.

**His address, confirmed, on `claude/ride-all-three`:** `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&armCarry=on&trunk=mass&bodyBank=hip`

**His words:**

> *"the stability might be a bit better but the surfer cant still turn and falls. also the surfer moves his arms as he turn looking a bit more real."*

| what was measured | what he felt |
| --- | --- |
| `tip` **90/90 → 66/90**, pinned 52.0 % → 31.1 %, roll peak 65.7° → 51.8° | **"might be a bit better"** — hedged, barely perceptible |
| `?trunk=mass` fires in 19.6 % of frames to 42.9° and moves 342 757 values | **not mentioned at all** — consistent with its measured null on the fall |
| `?armCarry=on` is **bit-identical in the physics** across 3 041 500 values | ⭐ **"moves his arms as he turn looking a bit more real"** — **the one unambiguous win** |

### Three things this settles

1. ⭐⭐ **A 27 % cut in tipping is NOT FELT.** 66 of 90 still fall, so **every ride still ends the same way** — and a failure that happens on every ride does not become noticeable by happening slightly less. **To be felt it has to move from "every ride" to "most rides survive". That is a far larger change than anything built today, and it reframes what "progress" has to mean here.**
2. ⭐ **The cosmetic channel is the win, and it was the cheapest thing built.** `?armCarry=on` is **proven inert in the physics** and he noticed it unprompted. **Worth remembering when choosing what to build next.**
3. ⚠️ **He names TWO complaints and they must not be pooled: "cant still turn" AND "falls".** The whole fall track has treated them as one event. **A rider who cannot initiate a turn and a rider who falls out of one are different failures**, and today's diagnosis (`tip`, the CoM leaving a 0.260 m support) is a story about **falling out of a turn he has already begun.**

### ⚠️ And the shallower turn: NOT reported

**He was asked directly whether 52° instead of 66° felt dead, and did not mention it.** **That is "not reported", not "approved"** — recorded as unanswered rather than taken as consent.

### The next thing for him costs nothing and has never been tried

**`?askCap=4.5` is already on `main`.** Step 3.5f measured that **below `PLANING_DROP = 3` m/s the ask cap is EXACTLY 0** — **100 % of 541 live frames of a slow Canyon rider** — so the stick asks for no lean at all down there, and `?askCap=4.5` removes that gate. **He has never ridden it.**

⚠️ **It is NOT a diagnosis** — Codex's correction stands: *"a moved or unmoved fall with askCap cannot diagnose the cause alone"*, and separating suppression from support loss needs the full paired set (stick, cap/planing, achieved bank, loaded foot contact, local rail, travelled course, wave-relative progress). **But as a RIDE it is free, and "can I turn at all" is exactly the question it bears on.**

### ⭐⭐⭐ HE CLARIFIED, AND IT IS A MUCH BETTER SIGNAL: THE DRIFT IS GONE, THE TURN WORKS, AND IT IS TOO SHALLOW

> *"to clarify, the stability is better as there is not drift like before. The hands seems to stabilize, but the turn now is doable not as sharp as i wanted. all ends up in falling"*

**Four separate statements, and three of them are new:**

| he said | what it maps to |
| --- | --- |
| **"not drift like before"** | ⭐ **a NAMED, concrete improvement, not the hedged "might be a bit better".** **And nobody has measured "drift" — it is not a column anyone has defined.** |
| **"the turn now is DOABLE"** | ⭐⭐ **he could not turn before, and now he can.** His previous report was *"the surfer cant still turn"* |
| **"not as sharp as i wanted"** | ⭐⭐ **THIS ANSWERS THE QUESTION HE DID NOT ANSWER EARLIER.** The measured trade is **roll peak 65.65° → 51.76°**, and **he feels it and does not like it.** **Recorded as answered now, where it was "not reported" before** |
| **"the hands seems to stabilize"** | ⚠️ **they CANNOT be.** `?armCarry=on` is **bit-identical in the physics across 3 041 500 values.** |
| **"all ends up in falling"** | unchanged |

### ⚠️ The hands cannot stabilise anything, and that is a finding rather than a mistake of his

**`?armCarry=on` is proven inert — 3 041 500 values across four pairings, zero differences.** So either he is attributing `?bodyBank=hip`'s effect to the arms, **or a purely cosmetic change made the rider FEEL more stable.** **If it is the second, that is worth more than most of today's physics**: it would mean a drawing-only channel bought perceived stability for nothing. **Told to him plainly rather than left to stand.**

### ⭐ The shallower turn is the mechanism, not a side-effect — which is why this is not a simple tuning job

PR #421's own chain: **`tip` makes the contact infeasible → the pair is SOLVED APART → and apart, the ankle's torque, the rotor's torque and the pitch hip ALL VANISH.** The shipped rider **loses his own joints in 52 % of frames**; with the switch, 32 %. **So the roll falls from 65.7° to 51.8° BECAUSE the rider now keeps his joints and his ankle's counter-roll (3.5d: 45–56 % of the deck's roll acceleration) reaches the board.**

> **The rider is resisting the roll because he is alive to resist it. Sharpness and the fix are coupled through the same mechanism, and that is exactly what makes this interesting rather than a constant to turn up.**

### What he has now asked for, in one line

> **Keep the drift gone, keep the turn, and make it sharp again — then find out whether the fall comes back with the sharpness.**

**Step 1 of that is not a build: NOBODY HAS DEFINED "DRIFT".** He named it, it is the one thing that improved, and **no column in any bench measures it.** **It cannot be protected if it cannot be identified.**

### ⭐ AND HE ANSWERED THE TWO QUESTIONS — THE SECOND ANSWER IS THE IMPORTANT ONE

> **"does the drift stay gone? i think so"**
> **"does the turn get sharper? maybe. not sure because the surfer falls"**

**The drift fix holds, with lower confidence than his first report** — *"i think so"* against the earlier *"there is not drift like before"*. **Recorded at the weaker strength.**

> ⭐⭐ **BUT THE SECOND ANSWER IS A VERDICT ON THE QUESTION, NOT ON THE TURN: HE CANNOT JUDGE THE TURN BECAUSE HE DOES NOT SURVIVE LONG ENOUGH TO FEEL IT.**

**That invalidates a whole class of question I have been putting to him all day.** *"Is the shallower turn acceptable?"*, *"does it feel dead?"*, *"is the sharpness worth the stability?"* — **every one of them assumes a ride long enough to have a feel.** **He has about one second.**

**So the ordering is settled, and he settled it rather than me:**

1. **Survive the take-off.** The new bench round is on exactly this, and it exists because he found that `?trunk=mass` — **measured inert to every decimal on a placement bench** — **wrecks his ride immediately on a real pop-up.**
2. **THEN ask him about the turn.**

**Nothing about turn quality should be put to him until a ride lasts long enough to have one.** **And `?askCap=4.5` doing nothing for him is a real result on its own**: for the gameplay he actually tests — *start the ride and turn* — **the low-speed ask gate is not what is stopping him.**

---

## 2026-11-18 — VIDEO 21 (PR #428): THE SECOND RECOVERY, AND IT KILLS THE ARMS RULE

*"Margo #surfing Vesper"* — **37.561 s, the longest clip in the series by 2.5×**, a montage of ~10 rides by one grey-bearded surfer, read in full. **30.000 fps exactly, not 29.97** (identical boundary phase at t = 5 and t = 30, where 29.97 would have drifted 0.025 s) — **a sixth rate for the skill's list.**

### ⭐ The second recovery — the first recovery figure with a population of two

Fold begins **22.6833** → **horizontal and head-down over his own board, the board alongside and above him, 23.1500** → fully engulfed 23.28–23.45 → **standing and riding again 23.8834.** **42 consecutive native frames, all distinct hashes, one unbroken take.**

| | clip 20 | **clip 21** |
| --- | --- | --- |
| fold → standing | 0.93 s | **1.200 s** |
| lowest attitude → standing | 0.48 s | **0.733 s** |

⚠️ **Whether his feet ever left the deck is undecidable** — he is inside his own whitewater for 23.28–23.45.

### ⭐⭐ AND IT REFUTES THE RULE CLIPS 19 AND 20 WERE ABOUT TO ESTABLISH

**I had it as: board still under you ⇒ hands to the deck; board gone past vertical ⇒ arms up and tall.** **Dead.** Six measured gridded frames, **one rider, one session**, upper hand against the near shoulder line:

| t | | |
| --- | --- | --- |
| **1.7167** | **+204 px** | ⭐ **a routine off-the-lip with nothing going wrong — the highest arm in the whole clip** |
| 4.9167 | +17…+37 | level, a carve |
| **23.75** | **+74** | **the recovery — and the OTHER hand is −230** |
| 29.45 / 30.52 | −273 / −41 | |

1. **"Board still there ⇒ hands down" is false** — the board is under him in all 13 native frames 23.55–23.98 and one hand is above the shoulder line anyway.
2. **Clip 19's "arms up and out" had no same-rider control. This clip IS that control, and it breaks the inference: arms up is a TURN signature.**
3. ⭐ **The two hands disagree WITHIN ONE FRAME — 230 px at 23.75, 273 px at 30.52.** **"The series has been asking a binary question of a two-armed animal."** **And the game's single `HumanBalance.arms` scalar cannot express that at all** — a concrete engine gap, found from footage.

### ⭐⭐ TAKE-OFF: NONE, FOURTH CLIP RUNNING — AND THE CONCLUSION IS NOW ABOUT THE CORPUS

**~200 sampled frames covering all 37.561 s** (0.5 s, 0.25–0.35 s, 0.1–0.15 s and native 1/30 s sheets, **including the opening second at 0.1 s**). **The rider is standing in every water frame.** **~10 ride-starts in ONE clip and ZERO pop-ups — highlight edits cut the paddling.**

> ⭐ **ASKING FOR MORE CLIPS OF THIS KIND WILL NOT PRODUCE A TAKE-OFF. The ask has to change to RAW, UNEDITED footage.** **This is the single most actionable thing to tell the owner about the video queue.**

### The feet, and a fifth rider

**front ÷ rear from the nose = 0.58 (0.55–0.61)** at t = 30.5167, measured at 0.86× and 1.2× on frames holding **the nose, the front sole and the rear ankle together** — a **fifth rider** on **a board class unlike any measured before (a long red single-fin)**, and **inside the 0.55–0.60 band.** **Zero slides, lifts or re-placements — twenty-one clips.** Board-length fraction refused: the tail is in whitewater everywhere.

### Rows moved, and one that gains a count

**Row 16 goes from V6's SINGLE to a count of 3** — **three foam encounters ridden out standing, all answered the same way: trunk folded hard forward, both hands down, feet unmoved.** **Row 4** strengthened and sharpened (the +204 → −273 px spread, and left/right disagreeing within a frame). **Row 17** strengthened. **Row 15** fourth clip. **Row 5** touched but not measured — the turn's peak is marked by the arm, agreeing with V8 T3 on a second rider, **but no lead time: the board is in spray when the rail is set.**

**⛔ Rows 2, 3, 6, 9, 10, 11, 12, 13, 14, 18, 19 cannot be touched** — **no horizon in any frame examined**, so apparent stature is unlicensed *everywhere* rather than just in the key passage; the board is never end-on (aspect ≥3.9 and ≈9.8 against a gate of 2.2); **the lens zooms by a factor of 0.56 in 0.3 s (measured), so no cross-frame height is comparable**; full wetsuit, no waistband; full grey beard, no chin or hairline. **Rows 7 and 8 cannot be touched because a chaining rate across a montage is the EDITOR's rate.**

### ☠️ Three method findings

1. ⚠️ **The board-aspect gate has an unstated precondition: IT NEEDS THE WHOLE BOARD**, and this clip never shows one, so both its figures are **lower bounds**. It still refuses by a wide margin here, **but a clip near 2.2 would be undecidable. First time hit.**
2. ⚠️ **One finding withdrawn before publication:** a raised bare limb at 22.9500 is **undecidable between a hand and a foot** on a barefoot wetsuited rider. **"A limb's identity can fail at a magnification where its position is already safe — a limb reading needs the joint chain back to the trunk in the same frame."**
3. ✅ **A new stale-composite cure that worked 6 of 6 where clip 20's "second batch" FAILED:** `style.transform='translateZ(0)'` + a *changing* `opacity` + double `requestAnimationFrame` + a **400 ms unclamped nap.** **The footer stamp caught all five failures** (2 wholly stale, 3 half-drawn). ☠️ **And the tab's renderer process DIED TWICE** after long seek jobs — distinct from the `document.hidden` throttle (the token is not even readable); the fix is a plain `navigate` to the same URL and reinstalling the toolkit, ~5 round trips each. ☠️ **The viewport emulation reset mid-session and one measurement screenshot came back 800×1205 at 1.6× — only the per-frame source grid saved it.**

---

## 2026-11-19 — ⭐⭐⭐ THE TAKE-OFF BENCH (PR #429): HIS "STANDS 1 SECOND" IS THE SHIPPED GAME, AND THE TRACK'S HEADLINE NUMBERS ARE ABOUT A BENCH

**2 437 additions, 0 deletions, all under `docs/research/new-rider/take-off/`. No `src/` change, no switch, no constant.**

### 1. A faithful pop-up CAN be driven — and my brief's claim needed a scope correction

The pop-up is a phase machine (`popUp()` → `'push'` 0.72 s → `'landing'` 0.48 s → `'standing'`), driven by one input bit through `RideSession.step`, and **the HUD's "Getting up…" is exactly push+landing — so the prompt clearing IS the frame `'standing'` begins, which makes the owner's video timings and these numbers the same quantity.**

⚠️ **And `docs/research/canyon-catch-2026-10-29/catch-probe.ts` has paddled, caught and popped up since 29 October.** **So "a real pop-up is not benched here at all" is wrong as I wrote it. What is true: of the 22 rider probes under `docs/research/new-rider/` (3.2–3.5), NOT ONE calls `popUp()` and NOT ONE places a rider prone.** The surfer track has never benched a take-off; the repo has.

### 2. ⭐⭐ HIS "STANDS 1 SECOND" IS THE SHIPPED GAME, WITH NO SWITCHES ON

**Stand − pop = 1.200 s in 90 of 90 stands.** Then, **fall after the stand**, two seeds:

| arm | seed 1 median | within 1 s | seed 2 | roll peak (s1/s2) |
|---|---|---|---|---|
| **ships** | **0.750 s** | 12 of 15 | **0.8333 s** | 28.9° / 18.8° |
| `trunk` | **identical to ships** | 12 of 15 | **identical** | 28.9° / 18.8° |
| **`bank`** | **0.683 s** | **15 of 15** | **0.6333 s** | **9.3° / 4.9°** |
| `all3` | **identical to `bank`** | 15 of 15 | identical | 9.3° / 4.9° |
| `all3cap` | 0.683, **min 0.42** | 15 of 15 | 0.6333 | 9.8° / 4.8° |

> ⭐⭐ **`?bodyBank=hip` MAKES THE IMMEDIATE FALL EARLIER — 0.683 s against 0.750 — and takes "within 1 s" from 12 of 15 to 15 of 15, while cutting the roll from 28.9° to 9.3°.** **What he rides as "all three" IS `?bodyBank=hip` as far as the fall goes** (0 of 388 472 values differ). **The switch that killed his drift costs him the first second.**

### 3. `?trunk=mass` does NOT reproduce "falls immediately" — but there is one thing this bench cannot see

Seed 1: **0 of 406 406 values differ** (the hip rotor reads 0 in all 4 147 frames). **Seed 2 refuted that as a property of the switch** — the rotor wakes, **non-zero in 67.7 % of standing frames, peaking at 5.5°**, moving **71 009 of 526 700 values** — **and the fall times are identical run for run.** A positive control confirms the wiring is live. **So #426's finding reproduces through a real take-off: it moves the state, not the fall.**

> ⭐ **BUT: `HumanoidRig.hinge` sets `wanted = 0` on every standing frame with the switch on, and stands `backForMass` down — so `?trunk=mass` DELETES THE RIG'S OWN 16–50° DRAWN TRUNK FOLD and hands the trunk to a rotor at 0–5.5°.** **Source reading, not a measurement — and it is the only hypothesis that fits the owner's words AND every number here.** **Testable with one drawn standing frame.** A round is going out to do exactly that.

### 4. `?askCap=4.5` is the opposite of "nothing", and it makes things worse

**Shipped, the lean a rider may ask for is 0 OFF THE PLANE.** A placement at ≥4 m/s is **on the plane from frame 1**, so askCap moves 2 of 216 placement values — **but a take-off is off the plane for ~82 % of the first second**, and askCap raises the median cap **0.000 → 0.238 rad** and **gave the earliest fall measured, 0.42 s.**

### 5. What fails first — and it is none of the suspects

At the stand, **identical across all arms**: 5.48 m/s over ground, **not planing** (on in 6 of 18), **cap 0.000, ask 0.000**, load 1.03 bw, roll 2.5°, margin 0.858, **1.26 m ahead of the crest, 0.943 up a 9.8° face**, deck-relative foot speed **0**. Then load rises to 1.22, the front foot slides 0.666 → 0.52, **the margin collapses 0.870 → 0.469 WHILE THE ROLL IS STILL 2–4°**, `limit` becomes `'tip'` at 0.50 s, roll runs to −26.9°, gone at 0.75 s.

> **"Not the roll (a consequence), not the stick (zero), not the feet (planted, foot speed 0.000), not grip. It is the BALANCE'S OWN DEMAND leaving the support box, on a rider who may ask for no lean at all and whose deck at the feet is under water."**

**And the stand is already refused before it starts:** `standRefusal` returns **`'feet under water'` in 12 of 18 stands (seed 1) and 18 of 21 (seed 2)**, landing peak 1.354 bw with 0.722 on the front foot. **The two stands it does NOT refuse are the only two that stand planing, lower (0.79–0.84) on a steeper face (15.9–16.9°), on half the wetted hull — and one of those is the only wave in the study whose stand survived the window, on all five arms.** **He never gets down the face:** stands 0.943 up, falls 0.968–0.978 up, slope 9.8° → 2.7°.

### 6. ⭐⭐⭐ AND THE TRACK'S HEADLINE NUMBERS ARE ABOUT A BENCH

**The flush placement's known defect is NOT what separates the benches** — load (0.86 vs 1.0 bw) and wetness agree, so **`SINK=0.06` did its job.** **What separates them is the REGIME:**

> **The mount seeds `planing` from |world velocity| > 4, so every placement at ≥4 m/s is ON THE PLANE FROM FRAME 1 with a 17–69° lean cap — while a pop-up mounts prone and the latch's test is speed THROUGH THE WATER, which a caught board does not sustain.**
>
> **So `tip` 90/90, the 10.9° stance, the 0.1 s lag and the 0.327 m demand are statements about a bench, not about his game, until re-measured through a stand.**

**CoP pinned in 89.8 % of the first second** (and `limit === 'tip'` in 26.8 % — **the factor 3.35 reproduced**), 100 % on seed 2. **The cue is a set-wave cue at his spot:** it lit on the 6 waves whose faces were 1.28–2.06 m and **on none of the six at 0.81–1.20 m**, where the window opens but the paddler tops out at **3.7 m/s against a crest at 5.3–5.5** (4.3 needed).

**Controls:** `PROBE=off` vs `on` — 54 runs, 2 538 values, **0 differ**; cross-build 48 runs, 2 016 values, **0 differ**; **113 147 of 113 222 frames live (99.93 %)**; the fall read off `atFall`, the last attached frame, **because `separate` never clears `phase`/`upright`**; `--diff` now **shouts when nothing aligns so "0 of 0" cannot pass as inertness.** **It refuted its own seed-1 wording with seed 2 and recorded it rather than quietly fixing it.**

⚠️ **Disclosed: it ran up to three bench processes at once against my "parallelism is zero"**, reading that as being about memory (0.16 GB RSS each, swap did not grow). **A reasonable reading, and disclosing it is the right call** — but the instruction was about the machine thrashing, and it should be stated as memory next time.
