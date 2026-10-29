# Board spray (board-spray, 2026-10-29)

The owner: "Add some splash effects while surfing; compressing and turning make more splash. Would it affect
performance?"

This work was done on the M1 Air (8 GB), branch `claude/board-spray`, from main at a507e556. It used headless probes and
the in-page strip tool on the Wave Pool; no SurfZoneRunner rider sessions in tests.

## In short

- **Every planing board now throws spray from its own hull,** drawn in the existing spray: the same particles,
  lighting and sunset colour, scaled by the Particles setting. It has no effect on the water, the rider or the sound.
- **The physics** (after the water-physics advisor's ruling of the same day; `src/physics/boardSpray.ts`):
  - **Turning (the bottom banked 15° or more against the surface):** each cross-section of the hull is a wedge entering
    the water (2D+t). Wagner's jet runs up the bottom from the waterline to the high (outside) rail, and leaves there
    or over the tail edge. Its water is k/(4 cos β)·ρ·W·D a metre of hull a second, from the speed into the water W and
    the low rail's depth D. Its speed over the water is 0.8 × 2V sin α along sin α f̂ + cos α ŝ, 8° above the bottom.
    Here α is the spray root's angle, tan α = k(β) tan τ / tan β (Savitsky; Zhao & Faltinsen's pile-up k). So the fan
    grows by itself with the bank, the drift and the load.
  - **Flat (under 5°):** no jet but Savitsky & Breslin's measured side blister off both rails at the spray root:
    0.25–0.57 V sideways at 42–51° up. Its water is the momentum the hull turns, ṁ = L tan τ / 2V. The two blend from 5°
    to 15°.
  - **Drops:** 2–5 mm off slow carve sheets (falling at 6.5–8.5 m/s), 1–3 mm off fast ones (4–6.5 m/s), with more
    mist the faster the sheet. Nothing is thrown backward over the water.
- **What it gives** (Wave Pool, Medium, the strip tool):

  | Case | Water thrown | Drawn particles over 1.5 s (High) |
  | --- | --- | --- |
  | Straight trim | 4–7 kg/s, off both rails | 69 |
  | Bottom turn (the steer) | 9–55 kg/s, off the outside rail | 286 |
  | Compressed bottom turn | 23–100 kg/s | 416 |

  On the Canyon's Big (the bottom-stop replay, 11–12 m/s): trim 1–5 kg/s a rail, a turn up to 124 kg/s, launched at
  10–12.5 m/s, 5–6 m/s up.
- **Cost (the M1):**
  - **CPU:** 3.2 µs a step for one hull's sheets. The spray's step takes +0.026 ms with a hard turn's 430 board
    particles at High (+0.012 Medium, +0.007 Low). Each other player costs about 4.5 µs a frame on the page.
  - **GPU:** the spray layer drawn against hidden at 720p, at the compressed turn's busiest frame (with the sea's spray,
    2686 particles): no measurable difference (−0.001 ms median of 60 alternating cycles, 22 ms frames).
  - So: no, it does not affect performance measurably.
- **The pool:** the boards' spray has a pool of its own (512 at High, 256 Medium, 128 Low), so the sea's spray, which
  fills its 4096 on busy Reef steps, never hides the rider's. The sea's spray is unchanged: its own random stream and
  pools.
- **Online:** other players' boards throw spray too, from their poses, by the same hull model: their position,
  orientation and height over this player's water, their velocity from the pose 0.05 s before. The water's own flow
  is taken as still on the page. Their sheets go to the worker with each frame's steps.
- **The A/B switch:** `?boardSpray=off`. Online rooms run the default.
- **Sound:** unchanged. The existing rail-spray loop already plays from sideslip × speed.

## The model

The advisor's report is summarised here; its sources are below.

- **A banked board is half a V hull.** NACA TN 4187 measured a rolled flat plate's spray root to match a wedge with
  dead-rise equal to the roll. That was tested to 15° of roll and trims from 6°; our 30–50° banks are an extrapolation.
- **The jet's direction.** On the hull, the water leaves the root at about V, turned 2α from the path. Over the water,
  it leaves at 2V sin α along the root's normal: m = sin α f̂ + cos α ŝ. Here f̂ is the path in the bottom's plane and
  ŝ is perpendicular to it in that plane, toward the side the bottom rises to.
- **The measured correction.** Savitsky & Breslin's blisters (a 0.23 m model, surfboard scale) give 0.77–0.87 of that
  speed (κ = 0.8), leaving 6–12° above the bottom's slope.
- **Drift.** β_e is the bottom's slope across the path, not across the board, so drift (the tail skidding) turns the
  trim into the bank: a faster, higher sheet. It makes the fan's height; load (Compress, a deeper rail) makes its mass.
- **The pile-up k(β):** π/2 at 0°, 1.56 at 10°, 1.51 at 20°, 1.42 at 30°, 1.29 at 40°, about 1.2 at 50° (Zhao &
  Faltinsen 1993's exact solution, via Iafrati).
- **Where it leaves.** The jet runs over the dry bottom at 2α from the path. It leaves at the high rail, or over the
  tail edge when it misses the rail, as it does at a light trim.
- **The low rail throws none.** With thick rails at large roll, the cross-flow does not separate there (TN 4187).
- **Flat.** The jet formula would throw a 16–20 m/s sheet forward. Measured flat plates throw a side blister off both
  chines instead:

  | τ | 4° | 6° | 8° | 10° | 12° | 15° |
  | --- | --- | --- | --- | --- | --- | --- |
  | Sideways speed | 0.25 V | 0.30 V | 0.37 V | 0.47 V | 0.52 V | 0.57 V |
  | Elevation | 47° | 51° | 47° | 42° | 44° | 49° |

  The 4° column is the advisor's extrapolation.
- **Drops.** The largest drop is set by the jet's thickness (Aalbers & Hoving 2019). The air breaks anything over
  12σ/(ρ_a U²): about 11 mm at 8 m/s and 5 mm at 12 m/s. Fall speeds are Gunn & Kinzer's.
- **Inferred, not measured:** spray volume has never been measured, even for boats (Payne 1986); W and D come from the
  game's hull. The mist share and the extrapolations above are inferred too.
- **The mapping:** 7 drawn particles per kilogram of water. The advisor's 6–8 keeps a hard compressed bottom turn's fan
  to a few hundred live. Each particle then stands for about 150 g of water, so the fan reads as distinct drops
  (Open).

## Measured

### Stills

`strips/`, from `?inpage&boardSprayStrip` (Wave Pool, Medium, midday). A standing rider is put in place on a wave,
as the ride recorder's placed starts do. Frames are at 0.6, 0.9, 1.2 and 1.5 s after the placement; the top row is
from behind the rider (chase), the bottom row from the side.
- `board-spray-trim.jpg`: straight, on the face. A few drops off both rails.
- `board-spray-turn.jpg`: a bottom turn from the trough (the steer from 0.3 s for 0.8 s). A spray off the outside rail.
- `board-spray-compress.jpg`: the same turn with Compress held. A heavier fan, trailing behind as the board runs on.
- `board-spray-compress-off.jpg`: `?boardSpray=off`. No spray off the board.

The strips' numbers are in `strips/log.txt`.

### CPU

`spray-bench.ts` (`node dist/scripts/spray-bench.mjs [--level high|medium|low]`), on an idle M1:
- `hullSpraySheets`: 3.2 µs a call. A board banked 35° at 11 m/s, drifting 6°, throws 86 kg/s.
- The spray's step on the test sea, with that sheet against without it:

  | Particles setting | Without the sheet | With it | Board particles live |
  | --- | --- | --- | --- |
  | High | 0.258 ms | 0.284 ms (+0.026) | 429 |
  | Medium | 0.138 ms | 0.149 ms (+0.012) | 215 |
  | Low | 0.074 ms | 0.081 ms (+0.007) | 107 |

- `RemoteSpray.add`: 4.5 µs per other player per frame.
- The board's 48 patches are copied once a step for its sheets; the physics' own step is unchanged.

### GPU

The strip tool times the spray layer at the compressed turn's busiest frame. It renders 720p from the chase camera,
the spray drawn and hidden in turns frame by frame, for 60 cycles (`waterSheetGpuAB`'s method):
- drawn 22.007 ms, hidden 21.979 ms, median of the per-cycle difference −0.001 ms;
- 2686 particles were in the air then, 328 of them the board's.

### Tests

- tsc: clean.
- Main suite (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude
  "**/SurfZoneRunner.test.ts"`): 2941 passed, 18 expected fail, 36 skipped.
  - `waterLooks.test.ts`: the spray points' capacity now counts the boards' pool.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`:
  11 passed (93 skipped by the filter), 10 min.
- **New:**
  - `boardSpray.test.ts`:
    - flat and trimmed, a light blister off both rails, sideways and up, its water about L tan τ / 2V;
    - banked, a heavier fan off the high rail, the more as it drifts;
    - more water the deeper the low rail is loaded;
    - none out of the water or at rest;
    - the pile-up and the drops in their ranges;
    - the packing round trip.
  - `SprayCloud.test.ts`:
    - BOARD_SPRAY_PER_KG per kilogram, out along the sheet;
    - its own pool, scaled by the Particles setting;
    - its own random stream: the sea's drops are as they were.
  - `remoteSpray.test.ts`: a banked remote board throws its sheet from its pose; a board at rest or out of the water
    throws none.
  - `PhysicalMode.test.ts`: the `?boardSpray=off` switch at every spot, and online rooms on the default.
- No rider sessions.

## Open

- **Classic:** the boards' spray is drawn in both water looks. The standing decision keeps Classic's lip-impact spray
  as it was before G9; this is a new source the owner asked for. Rich-only (like the roller front's toe spray) is a
  one-line change.
- **The look:** each drawn particle stands for about 150 g of water, so a fan reads as distinct drops. Larger, streaked
  sprites near the root (the Rich look's item 1) would read as a sheet.
- **Online:** the other players' water is taken as still on the page (their sheets' velocity is over still water), and
  their boards' angular velocity is not used.
- **Our banks (30–50°) are past TN 4187's tested 15° of roll,** and the sheet's water has never been measured. The look
  is the owner's to judge.

## Shot list for the owner

1. **Any spot, Medium, straight trim along the face:** a light sprinkle off both rails near the front foot, nothing
   behind you.
2. **A bottom turn with the steer:** a spray off the outside rail, growing as you lean in and as the tail skids.
3. **The same with Compress held through the turn:** a heavier fan. Say whether compressing reads as more splash than
   steering alone.
4. **A hard snap at the top, if one comes off:** the fastest, highest spray (drift makes the height).
5. **The Particles setting:** Low, Medium and High, in a compressed turn. The fan thins, but stays.
6. **Big, the Canyon or the Reef in a busy whitewater:** the board's spray still shows while the breaking wave's spray
   fills the air.
7. **`?boardSpray=off`** for the A/B, and the frame rate with and without (the measured cost is none).
8. **Online room:** the other surfers throw spray as they turn.
9. **The look in Classic:** keep it, or Rich only?

## Tools

Build each tool with `rolldown <file> -o dist/scripts/<name>.mjs --format esm --platform node`.

- **`src/dev/boardSprayStrip.ts`** (`?inpage&boardSprayStrip`, with `npm run record:ride` receiving): the strips and
  the GPU timing.
  - `&cases=trim,turn,compress`
  - `&times=0.6,0.9,1.2,1.5`
  - `&size=medium`
  - `&arm=left`
  - `&steer=±1`
  - `&boardSpray=off`
- **`spray-bench.ts`:** the CPU costs above.
- **`docs/research/bottom-stop-2026-10-29/bottom-replay.ts`** adds `--spray-dx D`: the sheets of the rider at dx D every
  0.1 s.

## Sources

- Savitsky, D. & Breslin, J. P. (1958) and Savitsky & Morabito (2010), via USNA EN486 ch. 7 (Spray):
  https://www.usna.edu/NAOE/_files/documents/Courses/EN486/07_-_Spray.pdf
- Savitsky, D., Prowse, R. E. & Lueders, D. H. (1958). NACA TN 4187. https://ntrs.nasa.gov/citations/19930085133
- Zhao, R. & Faltinsen, O. (1993), via Iafrati, arXiv 1212.6699, Table 1.
- Wagner, H. (1932); Faltinsen, O. M. (2005). Hydrodynamics of High-Speed Marine Vehicles, ch. 9 (2D+t).
- Savitsky, D. (1964). Hydrodynamic design of planing hulls.
- Payne, P. R. (1986), via TRID 391066; Latorre, R. & Ryan, S. (1989), via TRID 401250.
- Aalbers, A. & Hoving, J. (2019). POAC19-127.
- arXiv 2407.13160 (the critical Weber number, about 12).
- Gunn, R. & Kinzer, G. D. (1949). The terminal velocity of fall for water droplets.
