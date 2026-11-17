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
