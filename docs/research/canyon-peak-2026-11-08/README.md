# Canyon C take-off peak (2026-11-08)

The spec is the water-physics advisor's third ruling: `docs/research/canyon-c-2026-11-03/advisor-ruling-3.md`. These are the owner's calls: ranks 1, 2 and 3.

## Status

- **Built, opt-in:**
  - `?canyonPeak=on` adds a take-off peak: a lobe of the bank centred on the start (x 75).
  - `&canyonPeakFace=steep` gives the lobe a 1:26 face.
  - The start is refitted for the peak.
- **Off by default.** With the switches off, the Canyon is main's (07164a7c) byte for byte. A test hashes the bed.
- **The result: the peak, as specced, misses most of the ruling's bars.**
  - It does not focus the swell at the start. H stays about 0.86 m.
  - Down the line, it adds a close-out section at x 40–60.
  - Lines get shorter, and the peel gets faster.
  - The first breaks do move to the peak (x 85, against 57 today), and the refit start catches well.
- **Budget:** Medium had seed 1 only, 12 periods. Small and Big had seed 1, 10 periods, and only the take-off probe. The ruling asked for 3 seeds. The numbers are indicative.

## The shape (`src/wave/Bathymetry.ts`, `CANYON.peak*`)

- **The crest contour (1.9 m):** bulges 25 m seaward at x 75. It is a biweight (1 − u²)² over ±36 m, so the tip is rounded about 13 m, and it is half as far out at ±19.5 m.
- **The edge:** shallows from 2.17 m to 1.6 m at the centre, and blends back over ±25 m.
- **The face:** 1:30 on the lobe (1:26 with steep). It eases back to the bank's 1:44 with the bulge.
- **The lobe is a mound on the bank:** the bed takes the shallower of the two. Off ±36 m the bed is exactly today's. On the lobe it bulges only the contours above about 3.8 m.
- `canyonBankEdge` and `canyonBankEdgeZ` follow the lobe's edge, so the bed-keyed join follows it too.
- **The layouts:** `CANYON_PEAK` and `CANYON_PEAK_STEEP` (beds `'peak'` and `'peak-steep'`). B, A and `'half'` keep their pins.

## The refit (`src/wave/SurfZoneSimulation.ts`)

- **The catch model:** canyon-wave-r2's `catch-model.mjs` (a point-mass paddler) on `catch-probe.ts`'s column at x 75. Medium, seed 1, 12 periods.
- **The best start is 2.36 m deep:**
  - 5 of 5 sets caught (100 %);
  - 11 of 14 waves caught;
  - 0 % breaking on the paddler.
- **Nearby starts:**
  - 2.46 m: 3 of 5 sets.
  - 2.26 m: 4 of 5 sets, but 1 set broke on the paddler.
- **The new values:**
  - `CANYON_PEAK_TAKE_OFF_DEPTH` = 0.806 + 1.11 Hs: Medium 2.36 m, at the bank's slope.
  - `CANYON_PEAK_RIDE_LINEUP`: Medium 0 m. Small 6 m and Big 3 m are kept, so Small and Big are provisional.
- **Caveat:** 5 sets on one seed is a small sample.

## The bars (Medium unless stated)

- **"Off"** is main's C, from the ruling and the canyon-c runs (`runs/a-medium-s1/s2`).
- **"Peak"** is at the old start (z −216, 2.79 m) unless marked refit. The refit start is about z −204 (2.36 m). The `--zshift 15` run (z −201, 2.29 m) stands in for it.

| Bar | Off | Peak | Peak + steep |
| --- | --- | --- | --- |
| H p50 at the start ≥ 1.2 m | 0.86 m | 0.86 m; refit ≈ 0.91 m unbroken, 1.06 m all | 0.83 m |
| ≥ 40 % break 5–25 m in, at a face ≥ 15° | 2/10 break, 0 at 15° | 5/12 break (42 %), 2 at a break face ≥ 15° (17 %); refit 5/13, 3 (23 %) | 5/13, 2 (15 %) |
| Onset face p50 ≥ 16° (≥ 20° steep) | 10–16° | 15° at x 70–80, 18° at x 80–90 | not measured (frame probe not run) |
| H 20 m down the line ≥ 0.8 of the peak's | n/a | x 55, along the contour: 1.01 against 1.06 m (0.95) | not measured |
| Peak-to-arm ratio ≤ 1.2–1.3 | n/a | onset H 1.23 m at x 70–80, 1.22 at x 50–60 (1.0): no focus, and no focus close-out | not measured |
| −x end, no worse | 26 / 50 m (6 m / 15 m jump limits, seed 1) | 19 / 36 m: worse | not measured |
| The join, no worse | 3–4 of 10 bank waves reach it | 3–4 of 20: worse | not measured |
| Peel 40–60° over x 30–75 | 57° (seed 1), 48° (seed 2) | 29°; x 40–60 at 3° (a close-out section, V 109 m/s) | not measured |
| First breaks, x p50 | 57 | 85 (on the peak) | not measured |
| Small: ≥ 2 of 10 break nearby | 0 of 10 | 3 of 10 (2 at ≥ 15°) | not measured |
| Big: no close-out wider than ±20 m | n/a | not measured (take-off probe only: H 1.72 m, 5/16 break 5–25 m in) | not measured |
| Catch model: ≥ 70 % of sets, ≤ 10 % broke on | n/a | 100 % sets, 0 % broke on (refit start) | not measured |
| Solver finite, no new Froude caps | yes | finite, 0 caps, volume 0.17 %, fastest 4.53 m/s | finite (take-off probe ran clean) |

## Why the peak did not focus (for the advisor)

- **The lobe bends only the shallow contours.** It is a mound that ends at about 3.8 m. B's V-tip bends the whole bar down to the floor.
- **The waves feel the bed early.** At Tp 11 s, kh is small all the way out from 5 m. The rays bend over the deep contours too, and those are unchanged.
- **The steep face changes nothing at the start.** At the old start the take-off probe saw the same waves: H 0.83 against 0.86 m.
- **The close-out at x 40–60:** the waves now break first on the lobe (x 85). The bank's shallow 1.3–1.7 m edge at x 40–60 then breaks at almost the same time, so the line jumps instead of peeling.
- **A next try for the advisor to weigh** (not built): move the whole bank face seaward under the lobe, all depths, like B's tip, not only its top.

## Tests

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- **The main suite:** `npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`.
  - 325 files passed; 3150 tests passed; 23 expected fails.
  - 1 timeout: `poolBarrelPerf.test.ts`, a 60 s limit, while 5 probes ran beside it. It passed when rerun alone.
  - `PhysicalMode.test.ts` and `Bathymetry.test.ts` were rerun after the refit: they pass.
- **The SurfZoneSimulation `[Cc]anyon` subset was not run:** the default did not change.
- **New tests:**
  - `Bathymetry.test.ts`, the peak's shape: off the lobe it is today's bed; on it, a mound that is never deeper; the contour, edge, face and edge line are checked.
  - `Bathymetry.test.ts`, the default bed's hash (`4cf4fbef`), taken from main's `Bathymetry.ts`.
  - `PhysicalMode.test.ts`, the switches: their precedence, and the online room's default; also the refit's start.

## Probes and runs

- **The probes:**
  - `takeoff.ts`: the ruling's probe, with `--zshift` and each break's own face.
  - `frame-probe.ts`: canyon-c's, with `--bed peak|peak-steep`.
  - `catch-probe.ts`: canyon-wave-r2's, with any `--bed`.
- **Build and run:** `npx rolldown <probe> -o <out>.mjs --format esm --platform node`, then `node <out>.mjs --bed peak --size medium --seed 1 --periods 12`.
- **The runs** (`runs/`):
  - `to-peak-m1`, `to-steep-m1`, `to-peak-m1-z15`, `to-peak-m1-x55`, `to-peak-s1`, `to-peak-b1`: the take-off probe.
  - `fr-peak-m1`: the frame probe, with bins.
  - `catch-peak-m1`: the catch model.
- **Cost:** each 12-period run took about 12 min of one core.

## Shot list for the owner

The Canyon, solo:

1. `?canyonPeak=on` at Medium.
   - Does a peak stand up at the start?
   - Can you catch from the start?
   - Watch x 40–60 down the line: does it close out?
2. `?canyonPeak=on&canyonPeakFace=steep` at Medium: the same, with an eye on whether the face is steeper.
3. Both at Small: do any waves break near the start?
4. Both at Big: does the peak close out wide (more than ±20 m)?
5. For comparison, the Canyon with no switch at Medium.
