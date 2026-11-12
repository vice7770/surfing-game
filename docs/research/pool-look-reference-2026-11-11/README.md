# The pool wave against the owner's reference (2026-11-11)

**The owner's ask.** They rode the pool's Barrel with `?tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolFloor=inside` and filmed it (15 s; nine frames in `owner-build-sheet.jpg`). Two points:

1. The wave is too fast to catch: the tube reaches the surfer quickly.
2. The focus now is the wave itself. It must match this clip much more: https://youtu.be/JNbgaMo9PZo?t=13 (Surf Abu Dhabi, Kelly Slater; the owner said to watch 10 s from 0:13).

Nothing was built in this round. This page is the brief for the next one. The reference was watched in the browser at 0:14, 0:17, 0:17.6, 0:20 and 0:22.5; its frames are not stored here.

## What the reference shows (0:13 to 0:23)

- **A long wall ahead of the tube.** At 0:17.6, seen from the shore side, the unbroken face runs far ahead of the surfer at one height, about twice a crouched surfer. It is smooth and glassy.
- **The face is the darkest thing in the picture.** Deep blue, darker than the flat water in front of it and than the sky. The flat water is a lighter grey-blue.
- **A thin lip.** The lip throws as a thin curtain, pale and see-through where it is thin, with a feathered white edge along the crest for a few metres ahead of the throw.
- **A tall white pile right behind the tube.** The whitewater stands as high as the wave or higher, round and bright white, with no gap between it and the tube's mouth. Turns on the face throw white spray above the crest (0:14).
- **The surfer keeps up.** The break moves along the wall at the surfer's pace for the whole clip.

## What the owner's film of the game shows

- **The wave shows only where the tube is.** A short dark-blue box with a flat white lid travels over a flat pale sea. No wall can be seen ahead of it. Its front end is a hard vertical edge.
- **Everything else is pale.** The sea is a washed-out cyan and the sand's light pattern shows through everywhere. The tube is the only saturated thing.
- **The whitewater is flat.** Behind the tube it is a flat beige patch that reads as sand, not as water.
- **The lip is a flat white strip** on top of the box.
- **The tube arrives fast** and passes the waiting rider.

## The gaps, ranked by how much of the picture they are

| # | Gap | Likely cause in the game (reasoned from earlier measurements, not measured this round) |
|---|---|---|
| 1 | No tall dark wall ahead of the tube | The solver's wave is about 1 m with a face of about 17 to 19°. The tube's shape stands taller and steeper than the wave it sits on, so the tube reads as a separate box. The wall's height and steepness ahead of the throw are the wave generator's job (the floor and the machine's wave) |
| 2 | Pale water, no contrast | A steep face shows the sky less and the deep water more, so gap 1 causes part of this. The rest is the pool's bright sand under shallow clear water. The reference pool's water reads deep blue |
| 3 | Flat whitewater | The roller lens lifts the surface by only 0.06 to 0.14 of the wave's height (ruling 11). The height after the tube can only come from the solver's bore, or from a drawn pile |
| 4 | Flat white lid in place of a thin curtain | `lipLook=fray` has one of five parts. The eased, thin start of the lip and the feathered crest ahead of the throw are not built |
| 5 | The tube outruns the rider | The peel speed along the crest. On the default floor the break runs at about 9 m/s |

## Proposed order (for the advisor first, then the owner)

1. **Measure the gap in numbers.** From the reference: the wall's height against the surfer, the face's angle, how far the wall runs ahead of the tube, the pile's height against the wave, the peel's pace. From the game: the same five at the same view. A headless still from the shore side at the reference's angle, next to the reference.
2. **The wall (gaps 1 and 5 together).** Ask the advisor what floor and machine wave give a 2 m wall that stands steep for tens of metres ahead of the throw and peels at a surfer's pace (7 to 8 m/s). Both are set by the reef's angle to the wave and the depth along it. Behind a switch.
3. **Colour (gap 2).** A deeper, bluer water body for the pool behind a switch. Render only.
4. **The pile (gap 3).** The advisor's ruling 11 call 2: land the lip's water so the solver makes the bore, or draw a sourced splash-up body.
5. **The lip (gap 4).** The rest of `lipLook=fray`.

**The owner's decision (2026-11-11):** re-size the pool to the reference: faces of about 2 m, the break moving at a surfer's pace (7 to 8 m/s). The advisor's ruling on how is `ruling-13.md` beside this page.

## Ruling 13 in short (2026-11-11, the advisor; nothing measured, nothing built yet)

- **The pace.** A correction to the table above: the barrel section already peels at 6.45 to 7.1 m/s (measured 2026-11-01). Only the start section, where riders wait, runs 8.5 to 10.4 m/s. And 9 m/s is a normal pace for real riders: it is too fast for a 17° wall, not for a 2 m one.
- **The first step: `?poolSize=ref`.** Today's 1.8 m Barrel made 1.11 times larger in every length (platform 5.0 m, crest 1.0 m, period 10.5 s, a feed wave of about 1.47 m), with the big tube case scaled the same way. No new Basilisk run.
- **Then `?tubeForm=early`.** The tube's forming shape starts at the library's first frame, about 2.1 s before the throw: about 16 m of wall ahead of the tube against 2.7 m today.
- **Then the pool's colour**, render only.
- **The warning.** Size alone will likely not make the catch easy: outside the tube's shape the wall stays near 17°.
- **The owner's calls:** the rider waits further along the reef (about 70 m) or stays at 40; 2 m as a third size or in place of one; period 10.5 or 10 s; one wave or the train; whether a dark 15 to 19° wall is enough or a Basilisk run on a shallower platform is worth it.

## Step 1: `?poolSize=ref` (built 2026-11-11, opt-in)

- Built behind the switch. The default is unchanged. The write-up, the bars, the probe and two stills are in `step1/README.md`.
- It runs 600 s without a blow-up, and the fastest water is 1.11 × today's.
- It misses most bars. Faces at the take-off 2.3 to 2.7 m (aim 2.0). Peel 6.2 m/s (aim 7 to 8; today 6.45). Lip jets on 56 to 60 % of onsets (aim 90 %; today 90 to 96 %). The wall ahead of the tube is 1.3 to 1.5 m tall, as today.
- Likely cause: with the pool's wrapped sides, the 10.5 s wave leaves the machine at 41.8° where the 10 s wave leaves at 39.1°. The reef lies at 40°.

## Ruling 14: why step 1 missed, and what is next (2026-11-11)

- The ruling is `ruling-14.md` beside this page. Its two probe runs are in `ruling-14-runs/`.
- **The cause.** The build is not an exact larger copy, because the wrapped window stayed 280 m wide. Two wavelengths must fit across it, so the longer 10.5 s wave turned (41.8° at the machine, 30.6° on the platform, against 39.1° and 27.4°). That made the height uneven along the reef (2.42, 2.04, 1.92 m).
- **Two misses were the counting, not the wave.** The lip still throws once per wave in every column (93 % on u 40 to 90). The probe counted a second break line near the beach as failed throws. And the meter's 2.3 m came from that second line in 5 of 16 waves; at the reef the best faces have a median of 1.97 m.
- **The pace is not settled.** The probe's time step is too coarse to tell 6.2 from 6.45 m/s.
- **Next build: widen the window to 311 m for this size only** (280 × 1.11), period 10.5 s and feed 1.47 m unchanged. The advisor's short run with it: height along the reef 2.01, 2.06, 2.09 m; lip jets in every column out to u 110; peel 6.65 m/s (5 waves only); fastest water 8.01 m/s, right at the limit of 8.02.
- **Then**, if those hold: the reef's lengths along its line × 1.11 too.
- **The bars are re-stated** (A: the reef's own largest face per wave, 2.0 ± 0.1 m; B: 6.5 to 7.2 m/s over at least 20 waves at a 1/30 s frame; D: jets per column per wave on u 40 to 110, at least 90 %; E: a height share only; new: readings at 480 to 600 s within 10 % of 60 to 180 s).
- **The wall will not steepen with size.** Slopes do not change when a wave is scaled (14°, 11°, 9° at 10, 20, 30 m ahead). Steepness belongs to `?tubeForm=early` or a new Basilisk case.
- **The owner's calls:** whether "2 m" means the measured face or the drawn tube; a wall at the wrap against a slow drift over a session; where the rider waits (u 40 or about u 70); the fastest water at the limit.
- Next: the advisor on the period and the direction, before the owner rides it and before `?tubeForm=early`.

## Step 2: the 311 m window for `?poolSize=ref` (built 2026-11-11, opt-in)

- The write-up is `step2/README.md`, with the probe, its three outputs and four stills beside it.
- **Built:** under `?poolSize=ref` the wrapped window is 311 m wide. Period, feed and floor are unchanged. `?poolSize=ref&poolWindow=280` gives the first build again. The default pool is untouched.
- **What held:** the sea leaves at 36.8°. The height along the reef is even (2.01, 2.06, 1.97 m). The foot crest reads 1.14 m (about 1.21 m with the probe's 6 %). The GPU runs the 311-column grid.
- **What missed:** the reef's face is 2.13 m (bar 2.0 ± 0.1). The peel is 6.78 m/s (inside the bar) but from 9 waves, not 20: most white lines end near u 148. The first break is 1.85 m deep (aim 2.1 ± 0.15). The lip throws at the reef on only 55.6 % of column-waves on u 40 to 110 (bar 90 %).
- **Why the lip count is low:** a column throws at most once per 0.7 period. The beach's own break (150 m shoreward) throws first and takes the column's turn. Ruling 14's count by u did not see this. Today's pool reads 87.1 % by the same count, with the same loss from u 90 on.
- **Fastest water:** 8.01 m/s at the reef on waves of 60 to 180 s (the limit is 8.02). Once later, 8.12 m/s in the beach's swash.
- The 600 s drift run was not done, because the 60 to 180 s bars do not all pass. Nothing was tuned.
- Asked next: the advisor on bar D (the beach's break taking the reef's throw), before the reef's along-line lengths are scaled.

## Ruling 15: the lip count was read on the wrong path (2026-11-11, the advisor; no run made)

- The ruling is `ruling-15.md`. It rests on reading the code, not on a new run. Its first step tests it.
- **Main finding:** the probe builds the sea without the tube's profile library. So it runs the old ballistic lip, and that lip also throws at the beach (270 beach jets). The game does not do this in the pool. In the game the lip is thrown from the breaking front on the reef only (`SweptCrash`). So the 55.6 % is a number for water the player never gets. The same holds for the white line past u 60 and the 8.12 m/s swash.
- **The lock is real, but it is the onset clock:** one break per column per 0.7 period. With two break lines in one column (reef and beach) the reef's wave can lose its onset. In the game this costs only readouts (the surf meter, the peel mark). A switch for it is ranked last.
- **Face 2.13 m:** scatter of 12 waves (expected 2.07 m). Change nothing; read it again on 20 waves.
- **Pace bar, restated:** u 65 to 145, 6.5 to 7.2 m/s, at least 15 of 21 waves. The line ends near u 150 today as well.
- **Fastest water:** passes at the limit (8.01 against 8.02). The swash at the beach is reported apart.
- **311 m is better than 280 m. No falling back.**
- **Next, in this order:** (1) a probe with the library, today and ref 311: the crash's own throw counts become bar D; (2) the join table's row for ref (times × 1.054, lengths × 1.11): the likely cause of the folded leading end in the stills, not traced; (3) the reef's along-line lengths × 1.11, with `POOL_FRONT_REACH` (22.2 / 111 / 33.3); (4) an opt-in onset clock per break line.
- **The owner's calls:** margin on the fastest water or not; keep the hard break on the pool's beach or try a gentler beach; whether the ride should reach about u 165.

## Step 3: the lip count on the game's path (probe only, 2026-11-11)

Full write-up: `step3/README.md`. Raw outputs beside it.

- **Ruling 15's claim held.** With the tube library the pool has the swept crash, and the solver's own lip throws 0 times. Step 2's 55.6 % was on a path the game does not use.
- **Bar D, count: passes.** On s 20 to 100, 94.0 % of ref's front points that reached their throw did throw (today 93.1 %). Missed 0, lost 0.
- **Bar D, water: misses.** Ref throws 0.860 of the water it asks for (today 0.974). The crest runs short on s 60 to 100.
- **Bar A: misses.** Ref's face is 2.23 m (aim 2.0 ± 0.1). Today 1.87 m.
- **Bar B: pace in range, count misses.** 6.63 m/s, but from 12 of 20 waves (needs 15). Today 6.25 m/s from 18 of 21.
- **Bar F: passes.** 7.60 m/s at the reef, all finite. The beach swash reaches 7.58 m/s and does not grow.
- **The 600 s drift run was skipped**, because A, B and D's water share miss.

## Step 4: ruling 16's three builds (2026-11-12, opt-in)

Full write-up: `step4/README.md`. The ruling: `ruling-16.md`. All three act only with `?poolSize=ref`. The default is unchanged.

- **Build 1, the held frame.** `big` is now held at frame 175, not 176. Switch back: `?poolHeld=old`. The water share went from 0.860 to 0.993. But the fastest water at the reef read 8.04 m/s (limit 8.02).
- **Build 2, the reef 1.11 times longer along its line.** Switch back: `?poolReef=short`. Face 2.15 m, drawn tube 2.03 m, first break 1.79 m, points that threw 93.7 %, water share 0.986, fastest water at the reef 6.68 m/s. All pass.
- **Bar B misses, and worse than before.** Pace 6.64 m/s on u 72 to 161, but from 7 of 22 waves (needs 15). The white line's end is at u 134 (needs u 160).
- **The fold at the tube's leading end is still in the stills** after build 1 and after build 2.
- **Build 3, `?poolTubeCase` wins under ref.** With a38 the drawn tube is 2.45 m (expected 2.25 m), 1.03 m³ asked a jet, water share 0.902.
- The second break line is at the beach (z about −11) along the whole reef. Near the reef's new end (z −53) it is 43 m shoreward of it.
- The 600 s drift run was skipped, because B misses.
- Today's sea, run again with this code, prints step 3's numbers.

## Ruling 17: the white line, the longer tube, the fold, `?tubeForm=early` (2026-11-12, the advisor; three probe runs)

`ruling-17.md`; runs and the probe copies in `ruling-17-runs/`. Nothing built yet.

- **Bar B does not measure the peel.** On two waves in three a second white patch stands at u 155 to 180, 8 to 21 m seaward of the reef line, and the probe jumps to it. Throwing the lip to s 194 did not change the count. What the patch is, is not settled. B is restated: pace on u 72 to 117 (6.42 m/s from 20 of 22 waves: pass) and lips thrown per 10 m (pass).
- **The longer tube:** it can run to about s 150 today (128 m against 89 m). It shrinks from 2.1 m to 1.7 m, and from s 120 about 6 waves in 10 throw in each column. Past s 160 almost no lips. Build: `?poolReach=long` (reach to s 150).
- **The fold at the tube's front end:** the whole case shape is switched on over 3.7 m of crest, where it is 51 to 64° steep and the sea 18°. Points 1 m apart are different mixes: pleats.
- **The step half way along:** each column throws from its own 1 m cell and runs at its own pace; neighbours stand 0.47 m off their line. First test: `&crestLine=top`.
- **`?tubeForm=early`:** the case and the sea agree best 1 to 1.6 s before the throw, so the hand-over belongs there (share on at −2.3 √(h0/g), full at −0.7 √(h0/g)). Join bars J1 to J6 are in the ruling.
- **The honest limit:** this smooths the last 8 m before the lip. It cannot give a 2 m wall 20 to 30 m ahead: no case stands there. To remove the two parts fully, the sea's own face must steepen (finer cells in the surf zone, or a face model in the solver). That is a strategy call: see `docs/research/wave-strategy-alternatives/`.
- **The tube case at 2 m:** the advisor recommends `big` (2.03 m, all bars pass); a38 draws 2.45 m and is short of water. The owner decides.
- Builds in order: (0) stills and a probe run with `&crestLine=top`, then `&seamTau=-1.64,-0.5` (no code); (1) `?tubeForm=early`; (2) `?poolReach=long`; (3) a probe to trace the patch; (4) only if the step stays, a fit of the throw place along the front.


## Step 5: the join probe, `?poolReach=long`, `?tubeForm=early` (2026-11-12, opt-in, not merged yet)

Full write-up: `step5/README.md`. Branch `claude/pool-tube-early`. The default is unchanged.

- **Build 0, no game code.** A probe that reads the join (J1 to J5), the wall ahead of the throw and the surface's rise on the drawn tube surface, with no rider. Runs: base, `&crestLine=top`, `&seamTau=-1.64,-0.5`, and T2 (`&seamTau=-1.64,-1.4`).
- **`&crestLine=top` removes the step** half way along the tube. The open tube off its line by over 0.5 m: 46.5 % of pairs before, 0.2 % after. Points that threw 97.5 % (before 93.7 %). The fold at the leading end stays.
- **Build 1, `?poolSize=ref&poolReach=long`:** the lip is thrown to s 150. With the crest line on, all four 10 m pieces of s 111 to 150 pass (threw 86 to 93 %, water share 1.000, tube 1.70 to 1.85 m). Without it the last piece misses: 77.1 % threw (bar 80 %), tube 1.67 m (bar 1.70 m). Fastest water at the reef 6.83 m/s (limit 8.02).
- **Build 2, `?tubeForm=early`, fails its bars.** The wall 5 m ahead of the throw stands 45° (before 15°) and the height step along the crest is 0.036 m at 90 % (before 0.152 m; bar 0.05). But the surface's rise is 0.61 m/s median and 2.17 m/s at 95 % (bars 0.4 and 1.0; before 1.12 and 3.45). And neighbours 1 m apart differ in share by over 0.2 in 28.6 % of pairs (bar 5 %; before 70.8 %).
- **Why:** neighbours along the crest differ in clock by 0.135 s per metre, against a course 1.13 s long. And in the last 0.5 s, with the share whole, the case itself still grows over the sea at 0.68 m/s. The share's course cannot change that.
- **The stills: the pre-made part can still be seen.** It has ribs every few metres that the live sea does not have, and a dark crease stays where the open tube begins. Its far end fades into the sea without a sharp line.
- **T2** (the share whole 1.4 s before the throw) is worse on the join: J1 0.081 m, J5 82.8 %.
- The throw, the crash, the clock's rates and the case are untouched: the crash's counts with `?tubeForm=early` equal those with `&crestLine=top`.
- Not run: rider sessions, the #245 rise probe, a 600 s run. Not built: ruling 17's builds 3 and 4.

## Ruling 18: why `?tubeForm=early` still shows, and what to build (2026-11-12, the advisor; three probe runs)

`ruling-18.md`; runs, the probe and two crops in `ruling-18-runs/`. Nothing built yet.

- **The ribs are not the clock.** The slice clock is smooth along the crest (0.002 s off its line at 0.5 m). Ruling 17's bar "share step over 0.2" measured the ramp's own slope and is dropped. The ribs come from (1) the kept anchor shift, rough between records (0.048 m off its line at 1 m, 0.121 m at 2 m: about a 0.10 m kink on a 64° face) and joined by straight lines, and (2) the profile's lip mark sliding along the face before the throw, so quads joined by index pleat. Neighbouring quads differ by 44° at the median on the upper face; the open tube gives 5 to 10°.
- **The rise is the case's own growth:** in the last 0.5 s the case goes 1.89 to 2.04 m while the sea stays 1.77 to 1.79 m. The solver's breaking is on at only 3 to 14 % of points, so the sea is not being flattened. The fix is to carry the rise in the felt water (ruling 7), after the ribs. The "wall 1.5 to 1.6 m" bar was wrong: 1.87 m is the case drawn right.
- **The dark crease at the tube's mouth is a mesh fold:** around the throw 9.8 % of slices have quads turned over 90°.
- **Plan test T3 passes on a two-train sea:** of 1296 points that threw, none was first seen later than 1 s before its throw (median 1.76 s). Limit: two trains on one reef, not a full spectrum.
- **For the owner:** the two parts can be hidden on the pool with this method, but are not yet. One limit stays: the drawn crest is about 0.2 m above the sea's. If that still reads as two parts after the builds, it is the case for the library-only surf zone (C2).
- Builds in order: `?anchorLine=smooth` (bar R1), `?loftMesh=arc` (fold bars), carry the rise (W1, W2), then the owner rides.


## Step 6: `?anchorLine=smooth` and `?loftMesh=arc` (2026-11-12, opt-in)

Full write-up: `step6/README.md`. Merged as PR #264. The default is unchanged. Ruling 18's builds 1 and 2; build 3 (carry the rise) is not built.

- **Build 1, `&anchorLine=smooth`:** the drawn crest reads a smoothed line of the kept anchor shifts. The kept shift is not changed. **It misses bar R1:** off its line at 1 m, 0.051 → 0.039 m at 90 % (bar 0.010) and 0.116 → 0.080 m at 99 % (bar 0.03); at 2 m 0.127 → 0.101 m (bar 0.03). Two-train sea: 0.050 → 0.038 m.
- **Build 1 breaks a must-not: a new step in time.** The drawn crest's largest move in one step before the throw went 0.35 → 0.63 m (two trains 0.39 → 1.03 m). The median move is a little smaller (0.085 → 0.079 m). Not tuned.
- **One change from the ruling:** the crash's slices stay on the kept places. On the smoothed line each jet's asked water changed by 0.4 %, which breaks "D number for number" (`step6/smooth-crash-on-line.txt`).
- **Build 2, `&loftMesh=arc`:** before the throw the loft's vertices between the crest and the toe stand by arc length, not by the sliding lip mark. **The folds fall but miss the bars:** crest to lip at clock −0.5 to −0.15 s, 44° → 12° median and 74° → 37° at 90 % (bars 10° and 20°); lower face 40° → 12° and 73° → 30°. At the mouth, quads over 90°: crest to lip 11.1 % → 0 % (pass), lower face 4.9 % → 2.0 % (bar: none). Where the share ends, the slope change at 90 % went 84.9° → 42.2° (bar 10°).
- **Build 2 keeps the curve** within 0.0044 m at 99 % of slices; the largest is 0.010 m (bar 0.005 m, missed on 0.46 % of slices). From the throw on no vertex moves.
- **The throw and the crash are untouched:** the list of all 1722 jets (time, place, water) is byte-equal in the three runs. Bars A to F equal line for line. `?tubeForm=early` alone prints step 5's numbers.
- **The stills.** `anchorLine=smooth` alone: the ribs are not weaker. Both switches: the ribs are gone and the black slit at the tube's mouth is gone (a soft shade stays). **The pre-made part can still be pointed to, but less:** it stands up as a wall from the flat sea, with a rounded far end and a bright line at its foot.
- **What is left of the folds is the library's frame join** (`step6/frame-blend.txt`): two frames are joined point by point, and before the throw the lip mark jumps between frames, so the curve between frames wobbles by 0.016 m (median) to 0.098 m (most). The next fix, not built: space each frame by arc before joining. It changes the curve by up to 0.10 m, so it needs the advisor's yes.
- **`&loftMesh=arc` alone (run after the review):** the same fold numbers and the same stills as both switches, no step in time (largest move 0.3547 m, the base's), the throws' list byte-equal. **Ride with `&loftMesh=arc` and without `&anchorLine=smooth`.**
- Not run: a two-train run for build 2, rider sessions, the #245 rise probe, a 600 s run.

## Ruling 19: after `?loftMesh=arc` (2026-11-12, the advisor; one light run)

Full text: `ruling-19.md`; the run: `ruling-19-runs/frame-true.txt`. Nothing is built by it.

- **(a) The frame join: yes, space each frame by arc before joining, before the throw** (`?frameJoin=arc`, in the library's `profileAt`). It is the truer curve: each stored frame rebuilt from its two neighbours lies off the real frame by 0.097 m at 90 % today and 0.016 m arc-first, in the last 0.6 s. Before the throw the lip mark is noise (its share jumps 0.05 to 0.4 in 0.016 s). Interpolating the lip's share gains nothing.
- **Bars A1 to A6:** at each stored frame's time within 0.005 m of the raw frame; leave-one-out 0.02 m at 90 % in the last 0.6 s; no vertex moves from the throw on; no quad over 90° at the mouth; stills clean. The fold bars 10°/20° become a report.
- **(b) `anchorLine=smooth` is dropped.** The ribs were the mesh and the frame join, not the anchor line (ruling 18 was wrong on that). It stays off and is removed in the next clean-up.
- **(c) Carry the rise (`?wallRise=carry`) goes after (a):** it differences frames, and today's join wobbles by 1 to 6 m/s. Spec, bars W1 to W3 and the stop rule are in the ruling.
- **What still shows the pre-made part, and what this method can remove:** the bright line at the foot (yes, first; a probe before any build), the soft wobble near the throw (yes, by a), the surface moving through the felt water (yes, by c), the rounded far end (partly). **Not removable without the sea's own face changing (C2):** the drawn crest 0.2 m over the sea's, and the steep dark wall out of a flatter, paler sea. That is what would show on a large beach.
- **Build order:** `?frameJoin=arc`; the foot-line probe and a ruling; `?wallRise=carry`; the owner rides; remove `anchorLine=smooth`; C2 on the pool (the owner's call).

## Step 7: `?frameJoin=arc` (2026-11-12, opt-in, on branch `claude/pool-frame-join` only, NOT on main; four hard bars miss, nothing tuned)

Full write-up: `step7/README.md`. Ruling 19's step 1. The default is unchanged (step 3's probe on the default pool is equal line for line). Online rooms pin it off.

- **Built:** before the throw the library spaces both stored frames by arc (the lip and the throat at the throw's share), then joins them. From the throw on, today's join. The stored bytes are unchanged. The mixed case (one frame with a jet, one without) never happens: 0 of 120 frame pairs, in both cases.
- **A3 passes:** from the throw on no vertex moves (0.000000 m). The crest's largest step before the throw is 0.3547 m, as before. J3 is unchanged.
- **A1 and A2 miss on the ref pool's case (`big`):** at the stored frames' own times the curve is 0.0128 m off at most in the last 0.6 s (bar 0.005; 3 of 40 frames). Leave-one-out at 90 % in the last 0.6 s: 0.128 → 0.137 m (bar 0.02).
- **The cause is in the stored library:** the builder replaced 30 of `big`'s 120 frames before the throw (11 of the last 40) with the point-by-point join of their neighbours. The join cannot repair a stored frame. On the frames the run gave, A2 is 0.094 → 0.014 m. Ruling 19's 0.097 → 0.016 m was read on `a38` (2 such frames in the last 0.6 s); it reads the same again.
- **A4 misses, but is better:** lower-face quads over 90° at the mouth 2.1 % → 1.2 % (bar: none). Crest to lip stays 0 %.
- **A5 (report):** folds at −0.5 to −0.15 s, crest to lip 12 / 37 → 12 / 34° (median / 90 %), lower face 12 / 30 → 11 / 26°. J2 where the share ends: 6.1 / 41.4 → 4.0 / 41.0°.
- **The throws' list is not byte-equal** (995 of 1722 lines differ, most in the last digit of the asked water; 55 in time or place). Lines A and D drift a little (A 2.17 → 2.16 m; throws 1293 → 1294).
- **The reader is the face anchor** (`src/wave/barrel/faceAnchor.ts`): it reads where the curve comes down through the anchor's level, to place the case on the sea's face. The arc join moves that crossing by 0.0012 m median, 0.011 m at 90 %, 0.21 m at most. With the face anchor alone handed today's join (a trace, `join-anchor-today.txt`), the list is byte-equal and lines A to F, J3 and J4 are the base's. `CrashCurve.slice` and `endBlendLength` also read the curve, with no effect on the list.
- **The stills (A6):** no rib, no slit, nothing new. I see no difference from step 6's stills. The pre-made part can still be pointed to: a wall out of the flat sea, a rounded far end, a bright line at its foot.
- **For the advisor, not built:** (1) the refilled frames: re-make them by arc at load, or in the builder; (2) the face anchor: keep it on today's join, or let it read the truer curve and take a new base list.
- Not run: rider sessions, a two-train run, a 600 s run, stills for the trace run. A4's remainder is not traced.

## Ruling 20: the refilled frames and the face anchor (2026-11-12, the advisor; no sea run)

Full text: `ruling-20.md`; the measurements: `ruling-20-runs/`. Nothing is built by it. `?frameJoin=arc` stays on its branch, not merged, until the fixes below are in.

- **The main finding:** the stored tube library replaces about a quarter of the frames before the throw with a stand-in joined from their neighbours (`big` 30 of 120, `small` 18, Canyon `a38` 38). Every one was dropped for a jumped lip mark, which is noise before the throw. The run's own frames are sound: on `big` they lie 0.016 m off the arc join of their neighbours. The stored stand-in lies off them by 0.026 m median, 0.129 m at 90 %, 0.318 m most (at clock −0.05 s). This is in the default game too.
- **1. The refilled frames:** build a second stored library, loaded only under `?frameJoin=arc`, that keeps the run's own frames (spaced by arc) and refills by arc only the truly broken ones (three on `big`). From the throw on the bytes equal today's. Bars L1 to L5.
- **2. The face anchor reads the truer curve** (one water). The throws' list is then allowed to move once, within tolerances (count and asked water within 0.5 %, 99 % of jets in the same step and within 0.05 m, A to F and J3, J4 within small bands). The new list becomes the base.
- **3. Still worth finishing, after the foot-line probe:** by eye there is no gain, but `?wallRise=carry` differences frames and today's stored frames hold steps of about 0.12 m (about 4 m/s of false rise, an estimate).
- **4. Hold the merge** until 1 and 2 are in and pass.
- **A new thing to report, not fix:** on `big` the crest mark jumps 1.0 m in one frame at clock −0.86 s on frames flagged clean.
- **Corrected:** ruling 19's 0.097 → 0.016 m was read on `a38`, not on the ref pool's `big`.
- **Build order:** the foot-line probe and a ruling; the second library with `?frameJoin=arc` and the anchor on the same curve; `?wallRise=carry`; the owner rides; remove `anchorLine=smooth`; C2 on the pool (the owner's call).
- **The owner's call, later:** the default library has the same stand-in frames. Fixing the default changes every tube in the game.

