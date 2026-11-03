# The Canyon's version C: one straight bank peeling from +x into the reef bowl (2026-11-03)

Branch `claude/canyon-c` from main at 4eee1e5f. The design is the water-physics advisor's ruling with the owner's decisions
(`advisor-ruling.md`, logged in `docs/research/water-physics/consult-log.md`). Wave work only: no rider sessions in tests,
no tube work at the Canyon.

## Where it stands

- **Built and pinned** (commit 61e3fb14 and after): version C is the default Canyon; `?canyonBed=b` is version B byte for
  byte (sea hash 316bb67a, main's Canyon at 4eee1e5f) and `?canyonBed=old` version A (110c2d83); every other spot hashes as
  on main (`runs/pin.txt`).
- **Provisional:** the take-off depth and the starts at x +75 (`CANYON_BANK_TAKE_OFF_DEPTH`, `CANYON_BANK_RIDE_LINEUP`
  carry B's numbers until measured there) and `SWELL_SURF.canyon` (B's faces).
- **Measuring:** the frame probe at Medium, seeds 1 and 2 (rule A on the bank).

## Next steps

1. Medium seeds 1–2: bar 1 (white up the line). If more than 10 % of waves run white more than 10 m up the line, put
   the age gate on the take-off zone (`bankGateFrom` 31) and re-run.
2. The frame probe for Medium seed 3, Small and Big × 3 seeds (`frame-probe.ts`; 12 periods, 2 at a time).
3. Fit `CANYON_BANK_TAKE_OFF_DEPTH` from the runs' take-off column (x 75 ± 4: each wave's most seaward break, p90 depth),
   then the catch probe at several starts for `CANYON_BANK_RIDE_LINEUP` (canyon-catch's `catch-probe.ts`).
4. `crest-current.ts` at Medium, seed 1, 1800 s (bars 6 and 7, health); Big 600 s for bar 6.
5. The cost (canyon-beach-break's `step-bench.ts`, C against B), the stills, the notes, the tests.

## How to verify

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- `npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts --maxWorkers=3 -t "[Cc]anyon"`.
- The pins: bundle `pin-check.ts` and `pin-values.ts` against a `git archive 4eee1e5f` and against the branch (both with
  `--bed b`, then `--bed old`) and compare (`runs/pin.txt`).

## The bed (`src/wave/Bathymetry.ts`, `CANYON`'s `bank*` keys; the ruling's §1–4)

- **The bank:** its 1.9 m contour (the bowl's crest contour) runs straight at 45° to the shore from the join (x −22,
  z −67.3) out to its tip at x +140 (z −229.3), and the bank fades into the floor over x +140…+165, clear of the +x open
  edge's 20 m band.
  - **The join** is the flipped bowl's seaward (+x) end: B's bowl's −x end (u 55 from B's up-coast tip) mirrored, on its
    base bar's crest contour (`canyonBankJoin`). Re-deriving it after the flip, as the ruling asked, puts the bank 18 m
    further out than the advisor's sketch, which ran it through B's +x end (−24, −47): the flipped bowl's +x end lies 20 m
    further out than B's.
  - **The face:** 1:44 along +z, planar, from the floor up to the edge.
  - **The edge** (the top of the face): 1.2 m deep from the bowl to x +31, deepening linearly to 3.6 m at the tip
    (0.022 m per m). Each depth's contour is straight at 45° and ends where the edge reaches it.
  - **Behind the edge:** level for 8 m, then down at 1:30 to the inside, max(2 m, edge + 0.5 m), which the 1:15 beach
    face closes.
- **The bowl, flipped:** B's bowl and the bar under it, mirrored along shore about x −39.5 (the middle of the whole bowl,
  where its readout reads its breaker). Over the whole bowl and its back-off (x −55…−32) the bed is B's at the mirrored
  x, value for value: its transect (platform, knee, 1:18 face, 1.2 m crest, top, back), rock, rules and curl. It ramps in
  at its +x end (x −32…−22), where the bank fades out over the same 10 m, and backs off at its −x end (x −55), its base
  bar fading into the floor over 15 m to x −70.
- **The channel:** the plain floor and beach face from x −70 to the −x edge: 5 m inside z −230, the 6 m platform
  seaward of −260. Both A-frames are gone.
- **The tank:** the zone's inner edge moves from z −390 to −446, so the blend ends 20 m seaward of the tip's 5 m foot
  (z −365.7, `canyonFootZ`), the advisor's margin: 56 m, not the advisor's 40 m, because the join moved 18 m out.
  400 × 507 cells against B's 400 × 451 (+12.4 %).

## The spot's settings (`src/wave/SurfZoneSimulation.ts`)

- **The front:** `SPILLING_FRONT.canyon.direction` −1 (the bowl's own waves peel −x); B and A keep +1.
- **One beach-look group** for the bank (`CANYON_BANK_LOOK`): the beach peaks' 20° cap and no upcoast gate, each wave
  kept 30 s, not 20 s: the bank's line runs 162 m along shore from the tip to the bowl at 6.3–8.6 m/s (the advisor's peel
  speeds along the line, 8.9–12.1 m/s, times cos 45°), 19–26 s. The bowl's own front takes over where it ramps in.
- **The start:** x +75 for every size (`CANYON.takeOffX`), on the bank's face where it is as deep as the sets start
  breaking there, no shallower than the edge (2.17 m at x 75).
- **The readout:** "Spilling bank into a plunging reef bowl, right …°" (the bank's −x arm's peel and the bowl's breaker;
  the bank's breaker at the start).
- **Switches:** `?canyonBed=b` (`CANYON_B`) and `?canyonBed=old` (`CANYON_BEACH`); online rooms run the default.
