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
