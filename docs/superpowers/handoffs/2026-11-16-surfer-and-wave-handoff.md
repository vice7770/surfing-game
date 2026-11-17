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
