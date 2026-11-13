# C2, step 3b: the overturn's loft cleaned up on the 2 m pool (2026-11-13)

Tags: [M] measured here, [C] read in the code, [R] reasoned, [P] provisional.
The contract is `ruling-32-c2-step3.md` (step 3b, one round). Step 3 is `c2-step3.md`. Everything is still behind
`?wave=library` (off by default, rooms pinned).

**In one line:** one build round, seven fixes. **The bars do not all pass.** The box ends, the pleats on the face and
the faceted bore are gone from the stills. The folded quads fall from 6.1 % to 1.45 %, and drawn = felt at its worst
falls from 0.95 m to 0.06 m (the rest is the after-tube lens, drawn only by design) and to 0.16 m in the dithered band.
J2, J1's worst, the folded quads, drawn = felt in the band and the height bar still miss. A small stipple and a stepped
lip edge remain in the stills.

| Passes | Misses |
|---|---|
| crest (at 90 %), mean step (at 90 %), the rise under a board, J1 (at 90 %), J3 (at 90 %), J5 (both parts), drawn = felt where the mask is on at 99 %, off unchanged (the pool; Canyon B; the default Canyon: section 6), the page's draw cost unchanged | the height (the clamps), J1's and J3's worst, J2, the folded quads (1.45 %, not 0), drawn = felt in the band (p99 0.036 m) and at its worst where the mask is on (0.023 m), the stills (a small stipple, a stepped lip edge) |

## 1. The seven fixes

1. **A robust fit for the raw hand-overs** (`Handover.ts`, `OUTLIER`, `outlierRaws`) [C]. Before the fit, each raw
   that is not yet fitted is judged against its neighbours of the same wave within 16 m along the crest (at least 4 of
   them). It goes when its H is under 0.6 or over 1.6 times their weighted median H, or when its place past the toe is
   more than 2.5 m off the line through them. Step 3's bad wave (lanes at H/d 0.11 between 0.27–0.37, crests 5 m
   ahead) is this case: the bumps' H is about a third of their neighbours'. [M] 33 of 1 868 raws go (1.8 %). A lane
   whose raw went borrows its neighbours' (10 lanes; step 3: 0).
2. **The A0 polyline's segment** (`StateMatcher.match`, `A0_SWITCH`) [C]. I checked it on the 1 274 slices of the
   bars run (`c2-step3b-a0-segments.ts`, `c2-step3b-runs/a0-segments.txt`) [M]:
   - with step 3's rule (the nearest segment alone), 5.4 % of neighbouring pairs of one wave stand on different
     segments. The weights step more there: Σ|Δw| median 0.072, 90 % 0.225 (elsewhere 0.024 and 0.118).
   - So it does jump, a little. The fix: every segment whose gap is within 0.25 of its length of the nearest one's
     shares the weights, by a smoothstep. The weights are then continuous across the switch. On the same slices:
     median 0.059, 90 % 0.199.
   - **The three big jumps (Σ|Δw| over 0.5) are not the segment.** All three are lanes 6/7, where the lane's bed slope
     doubles (0.022 → 0.047, the reef's convex end; their throw points 112 m and 100 m along). Their t_h are 1.5–2.5 s
     apart. That is the lanes' geometry, which this step does not change.
3. **The bridge by the loft's lift** (`ZoneSurface.lane`) [C]. Where a curve folds or stands over 50°, the nodes take
   (1 − L) × the curve's lowest crossing + L × the bridge. L is the same lift the loft draws with (its course, the
   field's end, the run's taper, the collapse). A slice with a small lift keeps its nodes on its own curve, and the
   loft over them with it.
4. **A taper along the crest** (`ZoneSurface.chainRuns`, `LIFT.taper` 3 m) [C]. Along a run the lift goes to 0 by a
   smoothstep over 3 m of crest from each end and from any lane in the run with no lift. A run's last three lanes are
   always on the water (its pads). The lift is computed for all slices first, then the lanes are written (two passes).
5. **The contact answers only where its mask is whole** (`SweptContact.maskRule`, `MASK_ON` 0.999; only for
   `forLoft`) [C]. The mask is read at the lowest crossing, by its triangle's weights. Elsewhere the strip does not
   answer, so the water's nodes answer, as they are drawn there. The old swept tube's contact is unchanged (the rule
   is off for it). Probes read the drawn loft with `floorAtUnmasked`.
6. **Wider pads** (`PAD_LANES` 3, `LIFT.pad` 2 m) [C]. Two unlifted lanes with a whole mask, then the fading lane;
   along the curve the mask stays whole 2 m past the lift's ease. **Added in the same round:** a pad lane takes its
   places along its lane from the run's nearest lifted lane, across the rays (`padSource`). Before, a pad's points
   stood at its own clock, metres along the lane from its neighbour's, and the flat triangles between them left the
   water (step 3's 0.95 m drawn = felt). [M] in a short run (40–56 s), the band's worst fell from 1.21 m to 0.08 m.
7. **Lift only the tube** (`ZoneSurface.update`, `LIFT.collapse` 0.6 s) [C]. The raw lift is multiplied by
   1 − smoothstep((t − throw − touchdown) / 0.6 s). After that the loft lets go; the bridge weight goes to 1, so the
   bore's small folds are bridged in the nodes, and the nodes draw and feel the bore. I did not design the roller's
   look (step 5).

Tests: `zone.test.ts` +3 (the outlier rule, the contact's mask rule, a pad's places). The library's tests: 30 pass.

## 2. The cases

The nine level-12 cases of step 3, unchanged (`public/library/`). Ruling 31's ten runs are still running on this M1;
they are not used here.

## 3. The bars

Same probe as step 3, with two changes (`c2-step3b-bars.ts`): the drawn loft is read whatever its mask (the felt
contact now has the mask rule), and `--states` keeps each slice's state. Same sea (`sea21.bin`), 40 to 130 s, the
owner's switches, nine cases. Run: `c2-step3b-runs/bars-nine-cases.txt`.

| Bar | Step 3 (nine cases) | Step 3b | |
|---|---|---|---|
| Crest gap within 0.25 m | p90 0.187; 8.5 % over; most 1.13 | p90 0.177; 6.9 % over; most 0.44 | pass at 90 % |
| Height 0.95–1.05 | median 1.07; 60 % outside | median 1.065; 63 % outside | **miss** (clamps) |
| … without a τ clamp | median 0.987, p90 1.036; 16 % outside (245) | median 0.973, p90 1.023; 27 % outside (240) | **miss** [P] |
| Mean step ≤ 0.03 m | p90 0.018; 3.1 % over; most 0.125 | p90 0.017; 2.6 % over; most 0.057 | pass at 90 % |
| Rise under a board ≤ 0.4 m/s median | median 0.01; p90 0.19 | median 0.01; p90 0.19 | **pass** |
| J1 0.05 at 90 %, 0.10 most | p90 0.044; most 1.07 | p90 0.043; most 0.99 (1.9 % over 0.10) | pass at 90 %, **miss at most** |
| J2 2° at 90 %, 4° most | start p90 2.83, most 5.8; end p90 4.94, most 119 | start p90 2.85, most 5.7; end p90 4.64, most 123 | **miss** |
| J3 0.01 m, 2° | p90 0.0044 m, 1.0°; most 0.025 m, 5.7° | p90 0.0044 m, 1.0°; most 0.026 m, 5.9° | pass at 90 % |
| J5 share step: under 5 % over 0.2 | 4.7 % | 4.9 % | **pass** (close) |
| J5 crest place: under 10 % over 0.5 m | 7.5 % | 7.4 % | **pass** |
| No quad over 90° (lifted quads) | 86 878 of 1 420 866 (6.1 %) | 8 344 of 573 984 (1.45 %) | **miss** |
| … before the throw | 45 | 5 | |
| … the open tube | 1 436 | 928 | |
| … after touchdown | 80 842 | 3 962 (all in the collapse's 0.6 s) | |
| … between neighbours in other phases | 4 435 | 3 444 | |
| Drawn = felt, mask off | p99 0.011; most 0.95 | p99 0.012; most 0.056 | **miss** (the lens, below) |
| … mask on | p99 0.007; most 0.040 | p99 0.0009; most 0.023 | **miss at most** |
| … the dithered band | p90 0.032; p99 0.20; most 0.98 | p90 0.008; p99 0.036; most 0.158 | **miss** |
| Off unchanged | pass | pass (section 6) | **pass** |

What the breakdowns say [M]:
- **Drawn = felt where the mask is off is now the after-tube lens only.** Every point over 0.005 m there has no loft
  at all: the felt nodes against the drawn nodes, inside the library's partial weight. In a short run without
  `afterTube=roller` the mask-off error is 0.0000 at its worst. The lens is drawn only, by its own design (step 3 said
  the same).
- **The band and the mask-on worst are flat triangles over curved water.** All 251 band points over 0.02 m sit at
  unlifted pad vertices (lift 0). Their triangles span 0.5–1 m lanes on the wave's face, which curves; the water
  between the vertices is the cubic surface, the loft is flat. I see no cheap fix inside this method: finer pads, or a
  mask that ends where the loft lifts, are each a design change [R].
- **The folds left** are the open tube's lip-to-throat between neighbours (678), pairs where one lane has thrown and
  the next not (3 444), and the tube collapsing in its 0.6 s (3 045 on the throat-to-toe part). The bore after the
  collapse no longer folds the loft (it is the nodes').
- **J1's and J2's worst** are still neighbouring lanes at other clocks. One place is known (lanes 6/7, section 1
  point 2). J2's end is measured on the slices' own curves (not the drawn nodes), near the throw, where the face
  steepens tens of degrees in a fraction of a second; a small clock difference between lanes shows there [R].
- **The height without a τ clamp** got wider (16 % → 27 % outside, on a similar count). The robust fit moves which
  slices fall in this group, and some slices change clocks. I did not trace it further; the clamps (ruling 31's runs)
  are the main fix for this bar [P].

## 4. The stills

Same shots as step 3 (`headless-shot.mjs sheet`, Rich, the 2 m pool at Big, the owner's switches, nine cases).
**Before** is main's code (step 3) and holds at 70 s. **After** is this branch and holds at 72 s: the sheet picks its
own hold time from the sea, so the two moments are 2 s apart and the camera follows the curl. JPEGs in
`c2-step3b-stills/`.

| Still | Before (step 3) | After (step 3b) |
|---|---|---|
| `*-front-midday.jpg` | A slab with a hard vertical box end on the shoulder side, a stipple at that end, pleats on the face, the bore behind as jagged facets. | One smooth tube peeling into the shoulder: no box end, no pleats. The bore behind is smooth water. A small stipple patch where the tube meets the whitewater on the right, and a fine dither speckle on the water in front. |
| `*-front-sunset.jpg` | The same block, plainer: box end, horizontal pleats, faceted bore. | Smooth tube and shoulder, no block. The same small stipple at the right, faint speckle in front. |
| `*-channel-midday.jpg` | A box-shaped slab on the crest with stippled edges. | A continuous lip along the crest. Its white edge has small steps lane by lane. Some stipple on the back of the wave at the far left. |
| `*-channel-sunset.jpg` | The slab and stipple. | The same lip; **the steps in the lip's edge show more** (small blocks, lane by lane). Stipple on the back at the left. |
| `*-inside-midday.jpg` | The camera is under the water (nothing to judge). | Inside the tube: a smooth wall, the lip's curtain as a flat dark sheet (ruled between slices), a little dither on the shoulder at the left. |

So, plainly: **the box ends, the pleats on the face and the faceted bore are gone.** What still shows: a small stipple
where the tube meets the whitewater and on the wave's back, a faint speckle on the water in front, and **steps in the
lip's edge from lane to lane** (neighbouring clocks; the same cause as J1's and J2's worst).

## 5. The cost

- **The page's library draw** (headless fps trace, Chrome, WebGPU, 70 s, back to back, `c2-step3b-runs/fps-*.txt`):
  5.4 ms mean (4.0–8.9 a second); step 3: 5.2 ms. 60.5 fps mean, lowest second 60; without the switch 60.4, lowest 57.
  The worker's whole step is about 51.5 ms both ways on this loaded M1 (three Basilisk runs and my probes), so the
  library's worker cost does not show in it.
- **The worker's extra** (the bars probe, median / 90 %, ms a step; step 3 in brackets):
  - the hand-over and slices: 0.97 / 1.71 (0.91 / 1.19); the outlier test adds a little;
  - the zone's surface: 3.10 / 5.54 (2.58 / 2.95); two passes and the lowest-crossing scan;
  - the contact's loft (every lifted slice, in the probe): 1.19 / 1.97 (2.15 / 2.59); fewer lifted slices now.
  - In all about 5.3 ms (step 3: 5.6). In the game the contact's loft is built only near the bodies. The machine was
    busier during this run than step 3's, so the 90 % values are noisy [P].

## 6. Off is unchanged

- The 2 m pool (`c2-step3-runs/pool-off-hash.ts`, 900 steps from `sea21.bin`, `wave` unset): **0545d279d79bafe7**,
  lip jets 278: the same as main (`c2-step3b-runs/pool-off-hash.txt`).
- The Canyon byte check (`scripts/m1-cpu-bench.ts`, medium, 3600 steps, a fresh spin-up):
  - Canyon B (`?canyonWaves=true`): snapshots **a367d938f15fa934**, state **9e5831f80e38abd9**: the same as main;
  - the default Canyon: snapshots **ea3d57a4d49f4b48**, state **a1a2555739210f96**: the same as main.
- `npx tsc --noEmit -p .`: clean. The suite and the server's `tsc` were not run (the bars miss; the brief keeps the
  merge checks for a passing round).

## 7. What I would change next (for the advisor)

1. **The lip's steps and J1/J2's worst: neighbouring clocks.** The robust fit removed the bumps, but neighbours still
   differ where the lanes themselves change (lanes 6/7: the bed slope doubles between two lanes). A smoothing of the
   lanes' slope key along the crest (like the keys' 8 m fit), or of the throw time itself, would be next [R].
2. **The band (flat pads over curved water).** Either pads at half the lane spacing, or let the mask end where the lift
   ends and keep the pads only under the texture's one-node reach [R]. Both change the design of point 6.
3. **The folds in the collapse.** The 0.6 s collapse keeps the loft over a tube that is falling onto its face; a
   shorter collapse, or lifting only the lip part (not the throat-to-toe) after touchdown, would cut most of the 3 045
   [R]. This touches step 5's foam.
4. **The height bar** waits on ruling 31's ten runs, as before.

## Files and how to run them again

- `c2-step3b-bars.ts`: the bars' probe (step 3's, plus `--states` and `floorAtUnmasked`):
  ```
  npx rolldown docs/research/wave-strategy-alternatives/c2-step3b-bars.ts -o <scratch>/bars.mjs --format esm --platform node
  node <scratch>/bars.mjs --cases public/library --cache <scratch>/sea21.bin --from 40 --until 130 --states <scratch>/states.json
  ```
- `c2-step3b-a0-segments.ts`: the A0 segment check on a `--states` file (`--cases public/library --states …`).
- `c2-step3b-runs/`: the bars run, the A0 check, the fps traces, the pool's off hash, the Canyon check.
- `c2-step3b-stills/`: before (step 3, 70 s) and after (step 3b, 72 s), five shots each. Taken with step 3's
  command (`c2-step3.md`, end); the before shots with main's `src` checked out in the same worktree.
