# Handoff, 2026-11-11: the Barrel's look, its speed next to the tube, and the wave body

Written at 81 % of the weekly Fable usage (86 % at the lip-fray PR, 92 % at the after-tube PR) (resets 2026-11-17 14:00 UTC; the usage card shows extra usage off). Main was at 437da029 before this PR.

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
- **It changes little, and the cause is the floor.** Behind the reef the floor drops into the lagoon (2–3.4 m). The bore's Froude number falls to 1.03 and every lens is shed about 1.2 s after touchdown (479 of 479 by that test). The bore itself is not low at touchdown (0.89 of the roof top).
- **Next is the owner's call:** let the whitewater run on behind the reef (a shallow inside in place of the lagoon, behind a switch, sized with the advisor), or leave it dying in the lagoon. Then ruling 10 rank 5 (one foam make-up across the join; the roof whitening over its last 0.2 s).
- The sheet's stills hold at the pool's first waves (31 s). For a steady sea, let it hold at a later tube. The sheet's `status.txt` now lists the drawn band's runs.
- Known flaws: two fronts on one crest give two lenses in a column; no spray at the lens's toe.

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
- Ruling 11's five: the lens drawn only for now; the pool's whitewater running on behind the reef or dying in the lagoon (the floor); a drawn collapsing tube after touchdown; a low bore's fix if one shows; Rich only or Classic too.
- Whether extra usage is on (the card says no).
- The Basilisk velocity run: when its data lands in `docs/research/pool-tube-flow/data`, commit and use it.
