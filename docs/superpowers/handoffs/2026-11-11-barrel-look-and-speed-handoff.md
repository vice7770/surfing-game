# Handoff, 2026-11-11: the Barrel's look, its speed next to the tube, and the wave body

Written at 81 % of the weekly Fable usage (86 % at the lip-fray PR, 92 % at the after-tube PR, 95 % at the inside-floor PR: stop at 99 %) (resets 2026-11-17 14:00 UTC; the usage card shows extra usage off). Main was at 437da029 before this PR.

## Where the owner stands (2026-11-11)

The owner rode the Wave Pool Barrel with every switch and reported:

1. **`wallBody=stream` made it rideable.** The ride URL is `?tubeSeam=blend&wallBody=stream` on the pool's Barrel.
2. **It is slow.** On the M4 they went from Ultra to Medium, and next to the tube the frame rate still dropped a lot. They ask whether the sea is on the CPU again.
3. **It is ugly.** The falling lip is thick from the start. In a pool it should start thin with foam, then get thicker, still with foam.
4. **"Is there a way that the tube and the rest of the wave merge seamlessly?"**

So the order of work is now: speed next to the tube (waits for the owner's log), the tube's joins with the wave (first part merged, `?tubeLook=merge`), the lip's look (`?lipLook=fray`, step 1 merged). The wave-body thread (ruling 8) waits behind these.

## 1. Speed next to the tube

- **Found, not yet confirmed on the M4:** a standing rider runs 32 substeps a step against 4 lying (`STANDING_SUBSTEPS`, `src/physics/BoardBody.ts`). Each substep samples the water under every hull patch, the fins and the body. In the tube's water each sample goes through the case's contact (`sweptContact.query`).
- Measured headless on the M1 (probe run, rideable build): the rider's step is 0.44 ms lying, 4.7 ms standing (median), 9.7 ms at the 90th percentile in the case's water. The M4's worker was at 7.5 ms a step with a lying rider (the 11-06 survey). A step has 16.7 ms.
- Medium only changes the drawing. Still slow on Medium fits the worker (CPU) running over its 16.7 ms, so the sea falls behind real time. This is a reading, not a measurement.
- **Built in this PR: `?perfLog=on`.** A row a second of riding: frames a second, the worst frame, sea seconds per second, GPU or CPU, the worker's time and its dearest stages, the rider's phase. F9 saves it as a text file and copies it. The badge sits top-left.
- **The ask to the owner:** ride with `&perfLog=on`, press F9 after a slow stretch next to the tube, send the file. `npm run survey:barrel` now also has a `rideable` row.
- **Then:** if the log shows the worker's `board` or `contact` stage, make the standing step near the tube cheaper behind a switch (sample the water less often within a step and carry it by its slope; or a cheaper contact query). A bit-identical speed-up of the 32 substeps was not found. If the log shows the drawing, look at the tube's shader up close.

## 2. The lip's look (ruling 9, filed)

`docs/research/lip-look-2026-11-11/README.md`. The owner is right about the start of the fall and the foam, not about the total water. Ranked:

1. **`?lipLook=fray`, render only (step 1 of 5 merged, opt-in):** built: the lip's foam follows its thickness, and the frayed part is lit from both faces (without that the tip drew near black). Small change so far: a matt white tip. Not built: the teeth (the owner's call on 0.10 m), the drops, the veil, the eased `SHEET.formed` (`src/wave/barrel/lipSheet.ts`; check what else reads `formed` first). Measured: the white roll is the lip's underside passing the sky; the dashed line under the lip is the wall's shade. The ruling's section 4. The whole rank: whiten by the sheet's thickness (white under about 4 cm, clean over 15 cm), a toothed tip (fixed cut-outs in the last 15 % of the underside), drops from the finger ends through `SprayCloud` (at most 400 live points), a crest veil through `feather()`, and `SHEET.formed` eased from 0.035 to about 0.15 h0. Bars are in the ruling.
2. Ride `?poolTubeCase=pool` (the pool's own case, thinner lip).
3. A Bo 4000 Basilisk case on the M4 (about a day).
4. `?lipCap=off-underside`, provisional.

## 3. The tube's joins with the wave (ruling 10)

- Headless stills of the rideable build show the joins (take them again with `node scripts/browser/headless-shot.mjs sheet --url=http://127.0.0.1:<port>/ --port=<port> --out=<dir> --spot="pool&waves=barrel&swell=medium&tubeSeam=blend&wallBody=stream" --shots=curl-close:rich:midday,curl-front:rich:midday,curl-ride:rich:midday,curl-inside:rich:midday,curl-channel:rich:midday,curl-behind:rich:midday`; the pool's shots are named `curl-*`):
  1. the tube is a saturated mid blue, the face and sea a pale hazy cyan;
  2. the lip is a white rounded roll with a flat lid;
  3. hard ends along the crest (a vertical edge at the shoulder, a flat grey-green foam patch at the broken end);
  4. a dark seam line from behind;
  5. staircase stripes on the wall and a jagged underside seen from inside;
  6. thin dark dashed lines on the sea near the joins;
  7. the broken water behind the peel is a flat matt patch.
- The water-physics advisor's ruling 10: `docs/research/tube-merge-2026-11-11/README.md`. The body colour already agrees across the join; the read causes were navy outline lines (a missing normal guard), a wrongly sky-lit lip, ripple stripes on the wall, a lip that starts at full size, a roof that stops at touchdown, and missing surface detail.
- **Built and merged, opt-in: `?tubeLook=merge`** (`src/scene/water/tubeLook.ts`, render only; ranks 1 and 3). Measured on stills (the ruling's section 9):
  - the navy lines: gone from behind (34 → 0 pixels) and on the sea; fewer from inside (2054 → 1835) and close (184 → 129). A teal dashed line at the lip's tip and a thin ridge line from behind stay;
  - the white lip: **the read cause was wrong.** With no sky through the lip at all, the roll did not change. It is the designed light through the thin lip. Nothing was built for it; it goes to `?lipLook=fray`, which must bring the sheet's light down where the sheet is thick;
  - the wall's stripes: 5.4–6.1 → 5.0–5.7 (bar 2). Another source is left; find it with the `region` dev view first (the sea's ripples at grazing, the bed's light pattern, the lace, the loft's steps).
- **Next for the joins:** the stripes' source; rank 4's eased lip start together with `fray`; then ranks 5 (broken end) and 6 (surface detail, measure its cost).
- The owner's ride URL to judge it: `?tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray` on the pool's Barrel.

## 4. The wave body (ruling 8, merged with #247)

`docs/research/crest-line-2026-11-11/ruling-8/README.md`. Order: (1) trace the anchor, log only, with carried places every 5 m of crest; (2) the anchor takes its target while the share is zero; (3) `top`'s 0.3 H throw offset; (4) carry the rise as a probe run. Probe: `PROBE=1 H=1.05 CASE=pool SWITCHES=tubeSeam=blend,wallBody=stream[,crestLine=top][,formClock=c1] LOG=<file> npx vitest run src/wave/probes/ruling7.probe.test.ts`.

## 5. After the tube (ruling 11, the owner's newest ask)

The owner (2026-11-11, after the stills): the tube sits between the wave before it and the "old" after-tube part, out of place, with wrong sizes; "the after tube part needs to be redone, maybe look at how canyon has it for the foam part".

- `docs/research/after-tube-2026-11-11/README.md`, the advisor's ruling 11 beside it.
- **Built and merged, opt-in: `?afterTube=roller`.** The Canyon's roller lens, seeded where the lip touches down, drawn only.
- **It changed little at first, and the cause was the floor.** The default floor has no lagoon: behind its 6 m top it slopes 1:10 straight down to the 4.5 m platform. On that slope every lens was shed about 1.2 s after touchdown.
- **Ruling 12 (`docs/research/after-tube-2026-11-11/ruling-12.md`), built and merged, opt-in:**
  - Step 0, inside `?afterTube=roller`: the pool's roller reads its Froude number by the wave's height over the trough's depth (`AFTER_TUBE.froudeBy`). Lens life 1.17 → about 3 s.
  - `?poolFloor=inside` (`POOL_INSIDE`, `src/wave/pool.ts`): a 1.2 m shelf from 9 to 25 m behind the crest line. Lens life about 6 s; the white ends 25 m behind the crest line. The touchdown place holds within 1 m.
  - **It misses bars, so it stays opt-in:** the current along the reef on the shelf is 1.32 m/s (bar 0.5; the same strip on the default floor 0.87); the wave 30 m seaward is +14 % against the default at 300 s (the default loses 10 % over 300 s, the inside floor does not); the mean flow over the crest line changed (0.21 → 0.00 m/s shoreward).
  - Not measured: Froude caps, 600 s, the 1.8 m wave on the shelf, peel speed, bars D and E.
- **Next:** the owner's calls on the floor (below). Then the roller's slot overflow (712 on the default floor, 1653 on the inside floor over 300 s; two fronts on one crest make two lenses), ruling 10 rank 5 (one foam make-up across the join; the roof whitening over its last 0.2 s), a drawn collapsing tube after touchdown, the lens felt by the rider.
- The owner's ride URL: `?tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolFloor=inside` on the pool's Barrel.
- **No stills of the inside floor yet.** After the merge `scripts/browser/headless-shot.mjs` hung twice without logging anything (sheet: "no upload water-sheet.png in 900000 ms"; page mode: no output). Leftover headless Chrome processes were found and stopped; try again first. Until then the inside floor is checked by tests and solver probes only, not in a browser.
- Probe: `PROBE=1 [FLOOR=inside] [FROUDE=depths|height] SETTLE=27 SECONDS=30 LOG=<file> npx vitest run src/wave/probes/afterTube.probe.test.ts`.
- The sheet's stills hold at the pool's first waves (31 s). For a steady sea, let it hold at a later tube. The sheet's `status.txt` now lists the drawn band's runs.
- Known flaws: two fronts on one crest give two lenses in a column; no spray at the lens's toe.

## 6. The owner's reference for the pool wave (the newest ask, 2026-11-11 evening)

The owner filmed the ride URL and sent a reference clip (Surf Abu Dhabi, https://youtu.be/JNbgaMo9PZo?t=13, 10 s). "The wave is too fast to catch as the tunnel reaches the surfer quite fast. But I want to focus on the wave itself. It needs to match this video more."

- The brief, with what both films show and the ranked gaps: `docs/research/pool-look-reference-2026-11-11/README.md`.
- In short: the game's wave shows only as a short blue box where the tube is, on a flat pale sea, with flat beige whitewater. The reference has a long dark 2 m wall ahead of the tube, a thin lip, a tall white pile right behind the tube, and a break that moves at the surfer's pace.
- The owner chose to re-size the pool to the reference (2 m faces, the break at a surfer's pace). The advisor's ruling 13 is beside the brief (`ruling-13.md`; the brief ends with it in short).
- Nothing built yet (stopped at 97 to 98 % of the weekly usage). **Start here:** build `?poolSize=ref` with ruling 13's numbers and bars, then `?tubeForm=early`, then the pool's colour.
- **Built, opt-in (2026-11-11 night): `?poolSize=ref`** on `claude/pool-size-ref`. The default is unchanged. It misses most of ruling 13's bars (faces 2.3 to 2.7 m, peel 6.2 m/s, lip jets on 56 to 60 % of onsets, no taller wall ahead). Likely cause: the 10.5 s wave leaves the machine at 41.8°, not 39.1°. Write-up: `docs/research/pool-look-reference-2026-11-11/step1/README.md`. The advisor answered the same night (**ruling 14**, `docs/research/pool-look-reference-2026-11-11/ruling-14.md`): the wrapped 280 m window turned the wave; the lost lip jets and the 2.3 m faces were the probe's and the meter's counting (a second break line near the beach), not the wave. **Start here:** `alongShore: 311` for `poolSize` ref only (in `poolRefConfig`), measured against ruling 14's re-stated bars on 60 to 180 s; check the GPU's periodic path takes nx 311 and the scene follows the width; then the reef's along-line lengths × 1.11. Before the merge: the Canyon hash check and the headless fps trace, old against new.
- **Step 2, built opt-in (2026-11-11 late night): the 311 m window for `?poolSize=ref`** on `claude/pool-ref-window` (ruling 14's first choice, its step 1). `?poolSize=ref&poolWindow=280` is the first build again. The default is unchanged. The height along the reef is now even (2.01, 2.06, 1.97 m) and the sea leaves at 36.8°. But three bars miss: the reef's face is 2.13 m (bar 2.0 ± 0.1), the peel's 6.78 m/s comes from 9 waves (bar 20), and the lip throws at the reef on 55.6 % of column-waves (bar 90 %). The cause of the last one is new: the beach's own break throws first and takes the column's one throw per wave; today's pool reads 87.1 % by the same count. The 600 s run was skipped. Write-up: `docs/research/pool-look-reference-2026-11-11/step2/README.md`. **Ruling 15** (`docs/research/pool-look-reference-2026-11-11/ruling-15.md`, a code reading, no run): that lip count was read on the probe's fallback lip. The probe has no profile library; the game has, and throws the pool's lip from the breaking front on the reef only (`SweptCrash`). So bar D, the white line past u 60 and the swash speed must be read again on the game's path. The face is within scatter. The pace bar is now u 65 to 145, 6.5 to 7.2 m/s, at least 15 of 21 waves. 311 m stays. **Start here:** (1) a solver probe WITH the library (third constructor value, as `SurfZoneRunner.ts:448`), today and ref 311, 300 s: `sim.crash.counts` per 10 m bin is the new bar D (throws at least 90 % of the front's points on s 20 to 100; thrown / asked at least 0.9); re-read A (20 waves), B and F on that water; then the 600 s drift run if they pass. (2) The join table's row for ref (today's 10 s row: times × 1.054, lengths × 1.11). (3) The reef's along-line lengths × 1.11, with `POOL_FRONT_REACH` 22.2 / 111 / 33.3. (4) An opt-in onset clock per break line (`?onsetClock=line`, name provisional). One change at a time; the Canyon hash check and fps trace before each merge.
- **Ruling 15's step 1, done (2026-11-11 night, probe only):** `docs/research/pool-look-reference-2026-11-11/step3/README.md`. The claim held: with the library the solver's own lip throws 0 times, every jet is the swept crash's. On the game's path ref 311 throws on 94.0 % of the front's points on s 20 to 100 (today 93.1 %), and the fastest water near the reef is 7.60 m/s (limit 8.02). Still missed for ref 311: the face reads 2.23 m (bar 2.0 ± 0.1; today 1.87 m), the pace 6.63 m/s comes from 12 of 20 waves (bar 15), and the crash gets 0.86 of the water it asks (bar 0.9; the crest runs short on s 60 to 100). The drawn tube at the throw is 1.92 m (today 2.03 m, on the Canyon's case). No lip is thrown past about u 110 in either sea (`POOL_FRONT_REACH`). The owner's answers (2026-11-11): accept the fastest water at the limit; keep the beach's break; yes to the longer ride (about u 165). (Ruling 16 is filed: `docs/research/pool-look-reference-2026-11-11/ruling-16.md`.)
- **Ruling 16's three builds, done (2026-11-12, opt-in, merged from `claude/pool-ref-held-frame`; the default is unchanged):** `docs/research/pool-look-reference-2026-11-11/step4/README.md`. All act only with `?poolSize=ref`. (1) The tube case `big` is held at frame 175, not 176 (`?poolHeld=old` goes back): the water share went from 0.860 to 0.993, but the fastest water at the reef read 8.04 m/s (limit 8.02). (2) The reef is 1.11 times longer along its line (`?poolReef=short` goes back): face 2.15 m, drawn tube 2.03 m, first break 1.79 m, points that threw 93.7 %, water share 0.986, fastest water 6.68 m/s; all pass. (3) `?poolTubeCase=a38|pool` now wins over `big` under ref: with a38 the drawn tube is 2.45 m and the water share 0.902. Still missed: bar B (6.64 m/s on u 72 to 161, but from 7 of 22 waves, bar 15; the white line ends at u 134, bar u 160), and the folded leading end of the tube is still in the stills. The 600 s drift run was skipped (B misses). **Start here:** the advisor on why the white line stops at u 134 on the long reef (the lip is thrown only to s 111) and on the fold (the held frame was not its cause); then the owner's call on the tube case (`big` 2.03 m or a38 2.45 m); the default is not switched.
- **Ruling 17 (2026-11-12, `docs/research/pool-look-reference-2026-11-11/ruling-17.md`; nothing built yet):** bar B tripped on a second white patch at u 155 to 180 (not settled what it is), not on the peel; B restated and passing. The tube can run to about s 150 (`?poolReach=long`, to build). The fold is the case switched on over 3.7 m of crest; the step is 1 m cells (test `&crestLine=top` first). `?tubeForm=early` = hand over 1 to 1.6 s before the throw; join bars J1 to J6. It cannot give a 2 m wall 20 to 30 m ahead: that needs the sea's own face steeper (strategy call, `docs/research/wave-strategy-alternatives/`). The advisor recommends the `big` case at 2 m. **Start here:** ruling 17's builds 0, then `?poolReach=long`, then `?tubeForm=early` (the owner's order).
- **The wave-strategy alternatives plan (2026-11-12, `docs/research/wave-strategy-alternatives/README.md`; docs only):** ranking B grown toward C2 (the whole surf-zone wave from the 2D library, a coarse sea outside), D1 (0.5 m cells) as a helper, D4 (one displaced surface) as the long shot. Tests T1 to T6; T1 = `?tubeForm=early` judged on J1 to J6, T2 = `&crestLine=top&seamTau=-1.64,-1.4` (no build), T3 = how many crests are seen late on a short-crested feed. Three calls wait for the owner (on the plan's first page).
- **The owner's calls on 2026-11-12 (night):** (1) the order after step 4 is: the longer tube (the advisor first), then `?tubeForm=early`, and only then the colour, the white pile and the lip. (2) The Wave Pool is a test for larger beaches: whatever wave method is chosen must stay playable at large scale. The owner doubts that the live sea and the placed tube can be joined without the two parts showing; so `?tubeForm=early` is judged first on whether the join shows (stills, then the owner's ride). A docs-only plan of alternatives to the live sea + placed tube is owed (`docs/research/wave-strategy-alternatives/`, when written). (3) The Canyon fps investigation is dropped; keep only the Canyon byte check and the fps trace before pool merges. (4) No default switch to 2 m and no menu cleanup before the owner has ridden `?poolSize=ref`.

## Rules that still hold

- The owner rides. No rider sessions, catch reports or autopilot rides by agents; no browser pane, no dev server by agents. Headless stills and solver probes are fine.
- Every change behind a URL switch; the default build stays identical; online rooms pinned to the default.
- Physics with named causes; no hidden motors; no time low-pass of the flow; the throw stays at the throw depth.
- Consult the water-physics advisor before any wave, lip, tube or foam shape, and log it in `docs/research/water-physics/consult-log.md`.
- Merge by PR when the tests pass (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`, both `tsc` configs). One agent at a time.
- Disk is short: reuse the one shared worktree; ask before removing others.

## The owner's open calls

- Make `tubeSeam=blend` + `wallBody=stream` the default.
- Ruling 9: tip cut-outs up to 0.10 m, riding the pool's own case, the Bo 4000 run, `lipCap`.
- Ruling 8's four calls and ruling 7's six.
- Which join bothers most.
- Ruling 11's five: the lens drawn only for now; the pool's whitewater running on behind the reef or dying on the back slope (the floor; see ruling 12); a drawn collapsing tube after touchdown; a low bore's fix if one shows; Rich only or Classic too.
- Ruling 12's: a shelf strip as built or a full bay rising to a beach; the current along the shelf (accept, a wall at the wrap side, or a deeper channel); if kept, default and the A-frame too.
- Whether extra usage is on (the card says no).
- The Basilisk velocity data landed (28191dc1). Two looks: `docs/research/pool-tube-flow/README.md`. Against one steady wave speed (pool small 6.25 m/s, Canyon 7.90) the crest water's share is 0.80 to 0.85 at the throw (the game's 0.85 holds), but lower before it in the pool (0.6 at 0.7 s before, 0.7 at 0.34 s before); the first look's "1 at 0.35 s after" was partly the measure (the highest point falls back). No shear in the top 10 cm. Next: the advisor on a before-the-throw ramp (0.6 to 0.8 over 0.7 s), then a switch, then `wallBody=stream` against the data point by point. Stopped at 97 % of the weekly Fable usage.
