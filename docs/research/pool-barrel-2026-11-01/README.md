# The Wave Pool's Barrel mode, step 1: the floor and the mode (2026-11-01)

The owner's decisions (2026-10-31): the Wave Pool becomes the testing ground for a stable tube wave.
- **Q3:** machine-made, the identical wave every time.
- **Q4:** a "Barrel" mode beside today's pool waves, which stay exactly as they are (Small 1.0, Medium 1.25, Big 1.5 m).
- **Q5:** both arms barrel, mirrored: a left and a right each wave.
- **Q6:** faces 1.5–1.8 m, so a crouched rider fits: an open tube about 1–1.2 m tall, open 2–3 s per arm; 1.5 m is the
  smallest setting.
- **Q7:** (1) the wave, i.e. the pool floor (this step); (2) the owner's M4 Basilisk runs for its transect; (3) the drawing;
  (4) tube riding. Each step merges on its own.

Branch `claude/pool-barrel` from main at 32860d6e. Wave work only: no rider sessions (the catch is headless riders).
**The switch is the mode itself:** the Training waves, floor, sizes and code path are main's (their hashes match main's,
below). The one shared mechanism the Barrel floor turns on, the breaking-age gate, has its own `?poolAgeJoin=0`.

## Results

- **The mode.** The Surf screen's Wave Pool has a Waves row, Training | Barrel; Barrel's sizes are 1.5 m and 1.8 m. Rooms
  carry it in their conditions (`waves`); a room without it runs Training.
- **The floor** (`POOL_BARREL`, `poolBarrelDepth`): the training finger's planform under the same machine, crossed by a
  level 4.5 m platform to one steep face (1:9.5 square to the crest line, 1:14 at the tip), a crest 1.0 m at the tip,
  0.9 m at |x| 25 and 0.6 m at |x| 45, then a back-off into the platform by |x| 70. Its breaking age is gated along the
  crests at J 0.5, as the Canyon's.
- **It plunges along both arms.** From the tip's flanks to |x| 30–34 every column throws a lip jet on every wave
  (97–100 % of its onsets at |x| 10–30). Along the crest's travel, Mead & Black's X is 13–21 there (Y 1.7–2.2, their
  "extreme" to "very high" classes; Training's arms read X 31–39, Y 2.8–3.4), the bed's ξb 0.6–0.96. The solver's own
  void at the take-off is 0.70 m wide at 1.5 m faces and 0.79 m at 1.8 m (Training's 0.3–0.5 m).
- **One line along each arm, no gap.** The white leaves the tip and runs, as one line, to the take-off on 13 of 14 waves
  and to the barrel section's end (u 103 m along the crest line, |x| 45) on 11–12 of 14, at a steady 4.0–5.3 m/s along
  the arm. Before the gate it stalled for 3–7 s at |x| 34–38.
- **Identical waves:** every wave starts at the same moment of the period (sd 0.18 s) and place; it reaches the take-off
  6.9–7.2 s (1.5 m) and 5.3 s (1.8 m) later, sd 0.2–0.5 s; both arms match to 0.3 s.
- **The sizes:** H 0.99 and 1.24 m at the feed read 1.46–1.48 and 1.79–1.84 m on the surf meter at the take-off.
- **Where it falls short** (what the solver can say before Basilisk): the jets' fitted voids are 0.7–0.8 m wide, about
  0.85–1.05 m tall with their tilt, so 1.8 m meets the 1–1.2 m tube and 1.5 m is just under it; the plunging stretch past
  the take-off is 15–20 m of arm, about 3.5–4.5 s at the measured peel, which covers "2–3 s"; the peel is slow: 4–5 m/s
  along the arm, a peel angle of about 45–60° at 1.5 m and 75–80° at 1.8 m (Hutt's sin α = c_b / V with c_b = √(g h_b)),
  so a rider stalls to stay in, nearly stops at 1.8 m. Past |x| 34 the arm's waves (25 % smaller than near the tip, which
  focuses them) break over the crest and spill. Details below.
- **The catch is hard:** the headless riders caught a quarter to a half of the Barrel's waves (Training's Big: nine in
  ten), most left on the crest of the steep, fast wave. Riders now start 6 m out, not 11, which helped at 1.8 m (3 of 12
  against 0–2). The owner's open item.
- **Crests come straight to the face** (p90 under 5° to the take-off, none from two sides; straighter than Training's,
  whose ridges bend them); inside the finger the arms' bores meet in a V, as Training's do. Healthy over 600 s.
- **Step 2 is staged:** `npm run barrels:pool` on the owner's M4 (about 2.5–4.5 h), two cases on the take-off's ray.
- **The breaker readout** at the Barrel's take-off reads plunging (ξ 0.79) from the bed's steepest slope; it read spilling
  (0.35) from the slope along +z.

## The mode

- **Surf screen** (`src/ui/SurfScreen.ts`, `src/ui/strings.ts`): the Wave Pool's rows are Waves (Training | Barrel), Size and
  Time. Training's sizes are as before (1.0, 1.25, 1.5 m); Barrel's are 1.5 m and 1.8 m (`cond.swell.barrel.*`). The Waves
  choice rebuilds the size row. The sea spots never show it.
- **Conditions** (`src/game/SurfConditions.ts`): `SurfConditions.waves?: 'training' | 'barrel'` (missing means Training,
  as in rooms and logbooks from before). `poolBarrelSize(swell)`: Big is 1.8 m, any other choice 1.5 m. `poolFace`,
  `surfForecastFor(spot, swell, waves)` and the forecast line follow it. `physicalSettingsFor` gives the Barrel sizes'
  machine heights (`POOL_BARREL_EDGE_HEIGHT`) and `poolWaves: 'barrel'`; Training's settings are as before.
- **The sim** (`SurfZoneConfig.poolWaves`): the Barrel floor (`createSpot`'s `poolWaves`, `poolSpot(waves)`), its tank
  layout (the same zone; its 1 m cells from 10 m seaward of its platform), take-off (`POOL_BARREL.takeOffX`, x 27, at
  `poolBarrelBreakDepth`), start (`POOL_BARREL.startOut`, 6 m out), ridden arm (`poolBarrelRiddenAt`), breaking-age gate
  and breaker readout. `PhysicalMode`'s config, `roomSurfZoneConfig` and the online start pass it.
- **Online rooms** (`src/net/protocol.ts`): `parseRoomSettings` carries `conditions.waves` when present and valid, rejects
  an invalid one, and leaves a room without it as it was (Training). Every player builds the room's floor from it
  (`roomSurfZoneConfig`). The rooms run the default gate whatever `?poolAgeJoin` says (`main.ts`'s overrides).
- **Dev tools:** the water sheet runs the pool's own machine at `&spot=pool&swell=<size>` (it ran the shared swell before),
  and its Barrel floor with `&waves=barrel`; the crest-angle report takes `--waves barrel`; `PoolStart` works on either
  floor (the take-off's x is the same).

## The design (the water-physics advisor's, 2026-11-01) and what the measurements changed

The consult is logged in `docs/research/water-physics/consult-log.md` (one consult, a follow-up on the measured stall).

**The advisor's floor:**
- the training finger's planform (tip at z −210, b = 15 m, arms 71° easing to 65° about |x| 40) under the same machine;
- **no ridges seaward:** seaward of the platform the bed is the ramp alone, square to the crests, so the zone's inner
  edge is the plain 9 m feed (the training's 1:18 faces run on there as Mead's focus; a 1:9.5 face would reach the zone
  about 6 m deep);
- **a level platform** 3.25 m deep, so 1.8 m faces cross it at H/h 0.48–0.52 (Nelson's and Gourlay's 0.55 limit on a level
  bed and a reef flat, via Saket et al. 2017);
- **one steep face** square to the crest line at 1:9.5 (about 1:14.5 along the breaking ray at α_b 50°: X 14–15, Y
  1.73–1.80, Mead & Black's "extreme" class, Pipeline 1.56–1.92), 1:15 at the tip (X 15 met square), a knee rounded ±3 m;
  one slope, not two, because Mead & Black's band (h_b ± 2.5 m) spans the whole face;
- **a 0.9 m crest** (1.0 at the tip): low relative crest submergence (h_c/H 0.5–0.6; Blenkinsopp & Chaplin's 1:10 reef broke
  more intensely as it fell; Surf Ranch 0.48), no shallower than 0.8 m;
- **the barrel section** to |x| 45 (u 24–103 m along the crest line), then a back-off over 25 m, the crest deepening to the
  platform with the face's gradient held: the shoulder to kick out on.

**The four measured changes** (frame probe, 8–12 periods per run; `runs/scout-r*.txt`, `runs/frame-r*.txt`):

| Change | Why (measured) |
| --- | --- |
| **Platform 3.25 → 4.5 m** | At 3.25 m the machine's wave crossed it at H/h 0.50 (1.5 m faces; H 1.62 m at the knee) and 0.60 (1.8 m), and the arms broke at 2.4–3.1 m, by the knee. At 4.0 m: 0.32 / 0.41; at 4.5 m: 0.26 / 0.32, with no onset deeper than 2.6 m at 1.5 m faces. 4.5 m also refracts the crests further before they break: X along the crest's travel 14–15.5 at x 20–35 against 16.5–20 at 4.0 m. |
| **Its edge 20 m seaward of the training terrace's** (`platformLead`), **the tip face 1:14** | Room for the deeper knee: at 4.5 m and the terrace's edge the face's knee lay up to 10 m seaward of it near x 5–20, a 0.3–0.5 m step. The ramp keeps its foot (z −315.5), so it is 1:8.6 instead of the advisor's 1:10.2 (the training's is 1:9); the zone is unchanged. |
| **The breaking age gated along the crests at J 0.5** (`ageJoin`, as the Canyon's `CANYON.ageJoin`) | Under rule A (the training's) the tip's focused break ran along the inner arm at 6–20 m/s through the breaking age's diagonals, onsets at 2.0–2.2 m under 1.3 m crests (H/h about 0.6), and died at x 33–38 where the tip's focus fades: the line stalled 3–7 s (u 75 at 5–7 s, u 85 at 9–11 s), then the natural break took over. Tip crest 1.3 m, outer crests 0.6–0.7 m, no bend, arms at 66°, b = 25: none removed it; a bend to 77–80° closed the arm out (u 55–103 in 2 s). The advisor's reading and ruling (follow-up): gate it, as each part of a crest breaks at its own threshold in nature (Dally 1990; Goda 1992's sideways spread 0–C_b; Surf Ranch's 0.48 C). |
| **The crest shallowing from 0.9 m at |x| 25 to 0.6 m at 45** (`outerCrestDepth`) | Gated, the arm broke in order but its outer waves, 25 % smaller than near the tip (H 1.06 against 1.42 m at the 3 m contour), broke only over the 0.9 m crest: the line reached u 103 on 1 of 11 waves and peeled at 4.4 m/s. The training's lever (its crest ramp, 1.0 → 0.5 m): at 0.7 m it reached u 103 on 6 of 11, at 0.6 m on 8 of 11 (1.5 m) and 9 of 11 (1.8 m), at 5.0–5.1 m/s. The cost: the least water on the reef top falls to 0.05–0.09 m (the advisor's bar 0.3 m; 0.17 m at 0.7). |

- **Not adopted** (measured): the tip crest 1.3 m (gap 3–5 s under rule A), b = 25 (the drop moved out to x 35–40), arms
  66° (the same), a concave bend to 77–80° (a close-out down the arm; the advisor: K_r falls, and a second focus), a
  narrower reef top (2 m: least water 0.10 against 0.09 m), a two-slope face with a gentler toe (it reached the ramp and
  needs the ridges; the advisor's fallback if the owner refuses the gate).

## Frame by frame (the final floor; `frame-probe.ts`, 12 periods each, `runs/frame-small.txt`, `runs/frame-big.txt`)

The probe follows the white as a player sees it, every 0.25 s, for the solver's breaking (strength > 0.3), in each arm's
region (|x| −3 to 75), as canyon-b's. A line is one: it never vanishes for a frame and its end never jumps more than 6 m.
u is the crest line's arc length from the tip: the take-off (x 27) is at u 55, the barrel section's end (x 45) at u 103.
`summary.py` leaves out the wave already white when the record starts.

| | 1.5 m faces (H 0.99) | 1.8 m faces (H 1.24) | Training Medium (main's) |
| --- | --- | --- | --- |
| Surf meter at the take-off | 1.46 / 1.48 m | 1.79 / 1.84 m | 1.28 / 1.30 m |
| Where it starts | the tip, x −4…3, z −216…−218, 1.54 m deep | x −6…−2, 1.74–1.82 m deep | x −2…−4, 1.38 m |
| Its start in the period, sd | 0.18 s | 0.18 s | 0.20 s |
| One line to the take-off (u 55) | 13 of 14 waves, +7.2 s (sd 0.46) | 13 of 14, +5.3 s (sd 0.21) | 13 of 13, +2.9 s |
| … to u 75 | 13 of 14, +11.5 s | 13 of 14, +9.9 s | 13 of 13, +4.3 s |
| … to the barrel's end (u 103) | 11 of 14, +17.3 s | 12 of 14, +16.3 s | 8 of 13, +11.2 s |
| Peel along the arm, u 55–75 / 75–103 | 4.2 / 5.0–5.3 m/s | 4.0–4.4 / 4.4 m/s | 15 / 4.1 m/s |
| Peel angle, sin α = √(g h_b) / V | about 60° / 45° | about 80° / 80° | |
| The start's line 1 s / 2 s on | 17–18 / 20–21 m | 19–21 / 23–24 m | 21 / 27 m |
| Frames with a patch beside the line | 1–2 % | 0 % | 8 % |
| Both arms | the same to 0.3 s | the same to 0.1 s | |

**The shape along the arm** (each column's onsets, 5 m bins of |x|; both arms alike, the right's here):

| |x| | 1.5 m: onset depth, jets (% of onsets), X, void W | 1.8 m: onset depth, jets, X, void W |
| --- | --- | --- |
| 0–5 (the tip) | 1.54 m, 28 %, 18.9, 0.85 m | 1.74 m, 44 %, 17.9, 1.02 m |
| 5–10 | 1.56, 72 %, 20.1, 0.77 | 1.80, 88 %, 19.0, 0.94 |
| 10–15 | 1.69, 99 %, 20.1, 0.75 | 1.94, 100 %, 20.5, 0.83 |
| 15–20 | 1.67, 100 %, 17.4, 0.73 | 2.03, 100 %, 20.7, 0.77 |
| 20–25 | 1.57, 100 %, 15.6, 0.70 | 1.98, 100 %, 20.5, 0.73 |
| 25–30 (the take-off) | 1.36, 100 %, 13.4, 0.70 | 1.86, 97 %, 17.7, 0.79 |
| 30–35 | 1.13, 64 %, 12.7, 0.68 | 1.64, 87 %, 15.5, 0.81 |
| 35–40 | 0.84, 15 %, — | 1.03, 16 %, 15.4, 0.82 |
| 40–45 | 0.65, 8 %, — | 0.71, 18 %, — |

- **Plunging:** jets on every column's every wave from |x| 10 to 30 at both sizes, and to 34 at 1.8 m; at the tip itself
  (|x| 0–5) on 28–44 % (its section breaks over metres at once, and a column throws once a wave). That is u 10–70 m of each
  arm at 1.5 m and u 10–75 at 1.8 m: 60–65 m of plunging arm a side, and 15–20 m (3.5–4.5 s at the peel) past the take-off.
- **ξb along the crest's travel,** (1/X)/√(H/L0) with the solver's wave at the throw: 0.44–0.69 at 1.8 m (0.55–0.69 from
  the take-off on); the bed's (its steepest slope, as the throw reads it) 0.6–0.96. Plunging from about 0.4–0.5 (Battjes
  1974).
- **The face at onset:** the water's steepest slope near each onset 18–28° on the plunging section (20–21° at the take-off),
  against Training's 16–24° (17° at its take-off); the solver's face clamp holds every spot near 17–27° (breaking.md).
- **Past |x| 34** the arm's waves break at 0.65–1.05 m, over the shallowing crest: rollers, few jets (the throw needs 0.4 of
  the breaker depth under the crest, and these breaks are shallower). That is the shoulder before the back-off.
- **Training, for comparison** (`runs/frame-r4-training-medium.txt`): jets too on its arms (it throws without a tube),
  X 31–39 (Y 2.8–3.4), voids 0.2–0.5 m wide.

**What the solver can't show:** the open tube itself (the solver cannot overturn; the voids above are Pick & Feddersen's
and Mead & Black's fits at each throw). Their size: W 0.70–0.72 m by L 1.35–1.45 m at the 1.5 m take-off, 0.79 × 1.8 m at
1.8 m, tilted 23–28°, so about 0.85–0.9 m and 1.05 m tall. Step 2's Basilisk runs say what the transect really throws.

## Crests and health (600 s; `scripts/crest-angle-report.ts --spot pool --waves barrel`, `runs/crests-*.txt`)

|angle| p50 / p90, °, by band across shore from the take-off (seaward of it; its 30 m; inside to halfway to the waterline;
the rest), over the whole window; then the edge chevron (2 |angle| at the open edges' stations) and the crests leaning
opposite ways over the window's outer thirds ("two-sided", each past 5°). (These runs placed the take-off at z −199, the
first fit's; the final take-off is at −176.5 and −190.5, so the bands sit 9–22 m further out than the game's.)

| Band | 1.5 m: window | edge chevron −x / +x (p50 / p90) | two-sided | 1.8 m: window | edge chevron | two-sided | Training Medium: window | two-sided |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| seaward | 0.6 / 1.8 | 1.1 / 3.3 · 1.1 / 3.4 | 0 of 469 | 0.5 / 1.4 | 0.8 / 2.3 · 0.8 / 2.3 | 0 of 391 | 4.3 / 7.7 | 0 of 180 |
| take-off | 1.0 / 5.2 | 1.1 / 3.1 · 1.3 / 4.6 | 0 of 242 | 0.6 / 2.9 | 0.8 / 2.1 · 0.8 / 2.0 | 0 of 268 | 3.6 / 6.1 | 0 of 360 |
| inside | 2.9 / 19.0 | 2.0 / 5.9 · 3.4 / 14.8 | 7 of 721 | 2.3 / 15.5 | 1.7 / 8.5 · 1.8 / 8.9 | 1 of 697 | 4.2 / 15.0 | 33 of 656 |
| inner | 9.7 / 33.8 | 9.8 / 26.2 · 11.5 / 29.7 | 19 of 30 | 9.5 / 35.2 | 11.6 / 28.5 · 10.7 / 26.7 | 48 of 62 | 9.8 / 31.8 | 36 of 37 |

- **Straight to the beach** from the tank's edge through the take-off: p90 under 5.2° and no crest from two sides at either
  size, the open edges' chevrons 2–5° (the Beach's reference: 2.6 and 8.4° p90 seaward and at the take-off; canyon-b).
- **Inside the finger** (the inner band: the lagoon and the beach face behind the A-frame) the crests are the two arms'
  bores: a V, the −x third leaning −3.5° and the +x third +3.6° (signed medians), so most whole crests there read
  "two-sided". It is the A-frame's own whitewater meeting on the centre line, mirrored, not a crest arriving from two sides
  of the tank. Training's (main's) does the same and more: 36 of 37 whole crests there two-sided, its outer thirds at
  −5.5° / +5.5°.
- **Straighter than Training seaward:** Training's ridges (Mead's focus) bend its crests into a shallow V before they reach
  the finger (seaward p90 7.7°, outer thirds −2.5° / +2.5°); the Barrel floor has no ridges, so its crests reach the face
  straight (p90 1.4–1.8°).
- **Health over the 600 s:** finite at both sizes; the fastest water 5.56 m/s (1.5 m) and 5.93 m/s (1.8 m); no Froude cap;
  the volume +0.24 % and −0.53 %. Training Medium: 4.27 m/s, no cap, +0.34 %, finite.

## The start and the catch (`catch-probe.ts`, headless riders, as canyon-catch's; `runs/catch-*.txt`)

canyon-catch's probe with `--spot pool --waves barrel`: for every wave, headless riders (`RideSession`, the game's) placed
prone at the start, nose to the beach, each with a script (good: sprint 2 s before the crest and pop at the game's cue;
early: 4 s; late: 0.8 s; lift: also pop when the crest lifts the board). A ride is standing at least 2 s on the face ahead
of the crest. 12 waves each (one seed: every wave is the same, so they differ only by the riders' timing against the
water's small wave-to-wave changes). No rider sessions.

**The take-off:** x 27, where the bed reaches `poolBarrelBreakDepth` (1.36 m at 1.5 m faces, z −176.5; 1.90 m at 1.8 m,
z −190.5), the frame probe's first breaks there.

Rides of 12 waves (good / early / late / lift):

| Start | Barrel 1.5 m | Barrel 1.8 m | Training Big (1.5 m, main's) |
| --- | --- | --- | --- |
| 4 m out | 4 / 5 / 3 / 3 | 4 / 6 / 2 / 4 | |
| **6 m out (the Barrel's start)** | **3 / 5 / 1 / 3** | **3 / 3 / 3 / 3** | |
| 8 m out | 4 / 8 / 1 / 4 | 3 / 4 / 2 / 3 | |
| 11 m out (every other spot's) | 3 / 5 / 1 / 3 | 0 / 2 / 0 / 0 | **10 / 11 / 5 / 10** |
| 15 m out | 2 / 5 / 0 / 1 | 1 / 4 / 1 / 1 | |
| x 20, 6 m out (the advisor's fallback) | 1 / 6 / 0 / 1 | 4 / 9 / 1 / 4 | |
| x 20, 11 m out | 3 / 6 / 1 / 1 | 0 / 2 / 0 / 0 | |

- **The Barrel is much harder to catch than Training:** a quarter to a half of the waves against Training's nine in ten.
  The misses are mostly "left on the crest" (popped, but the wave went on without the rider) and, from the nearer starts,
  "white water". No rider fell. The pops come 1.4–2.1 s after the crest passes the start, on 13–18° of face, 0.5–0.8 of the
  way up (Training's 1.9 s, 19–20°, 0.6–0.7).
- **Why** (inferred): the Barrel's waves cross the deep platform fast and stand up over a few metres of steep face; the
  face along +z at the take-off is 1:26, so the start sits barely deeper than the break (11 m out is 0.42 m deeper at
  either size), and a rider paddling at 4–5 m/s has little time between the wave lifting the board and its pitching.
  The training finger's long 1:49 approach (its ridges) lifts riders gently for longer.
- **The start moved to 6 m** (`POOL_BARREL.startOut`): at 1.8 m the 11 m start lost nearly every wave (0–2 of 12), 4–8 m
  out caught 2–6. At 1.5 m the start changes little.
- **Not tried** (each a floor change for the owner): a gentler stretch of face at the take-off itself (a deeper or gentler
  take-off break would read as a softer Y there), the ridges (the advisor's rule-A alternative, which also gave Training its
  gentle take-off), or riders' technique for steep take-offs (a late, angled take-off: step 4's tube riding).

## Cost (`step-bench.ts`, `cost.txt`)

The game's sea (`surfZoneConfigFor`, the GPU tier's config; the pool's one regular wave), stage 2 on this M1's CPU, spun
up, then 200 steps of 1/30 s timed one by one; Training and Barrel alternately on a quiet machine.

| | Cells | Step p50 | p95 |
| --- | --- | --- | --- |
| Training Medium | 280 × 359 | 43.3 and 43.3 ms | 43.7 and 43.6 ms |
| Training Big | 280 × 359 | 43.5 ms | 44.0 ms |
| Barrel 1.5 m | 280 × 374 | 44.3 and 44.3 ms | 44.6 and 44.7 ms |
| Barrel 1.8 m | 280 × 374 | 44.6 ms | 45.0 ms |

- **About 2–3 % dearer than Training,** from its 4 % more cells (its 1 m cells start 20 m further out, with its platform).
  The zone, the grid along shore and the feed are the same. Every step costs the same (p95 within 1 % of p50), so none
  took the solver's second CFL substep, though the Barrel's water runs faster (5.6–5.9 m/s at most over 600 s, against
  Training's 4.3). The GPU's cost on the M4 is not measured here.

## Strips (the water sheet, `?inpage&waterSheet&spot=pool&swell=small|big&waves=barrel&compute=gpu&graphics=ultra`, Rich, midday)

`window.waterSheetStrip`, one frame a second, each from about 1 s before the tip breaks (the Barrel's sea time phased on the
frame probe's starts). Shot in a hidden browser pane; the water is the GPU's.
- **From the start camera** (beside and inshore of the right arm's take-off: eye x 80, z −110, 16 m up, looking at x 20,
  z −185; 12 frames): `strip-small-start.jpg` and `strip-big-start.jpg`. The tip breaks far out, top centre (+1–2 s), and one
  white line runs down the arm toward the camera's left (+3–9 s), the next wave's crest behind it. The lip sheet shows as
  the thin bright line on the line's seaward edge.
- **From above** (150 m up over x 0, z −105, looking at z −150; 18 frames; the tip at the top, the beach below, the pool's
  walls the grey wedges at the corners): `strip-small-above.jpg` and `strip-big-above.jpg`. The finger's two arms and the
  white running down both, mirrored. From 150 m the lip doesn't show.
- The tube drawing is off (step 3); what shows is what the pool draws today: the solver's white, the foam, the lip sheet.

## The Basilisk cases (step 2, for the owner's M4)

Only the owner's M4 runs Basilisk; nothing ran here. The arms are mirrored and their plunging section is one transect, so
there is one case per size, on the right arm's ray at the take-off (x 27), as the Canyon's tube runs were staged
(`tools/basilisk/run_periodic.sh`'s `pool_barrel_*`; `tools/basilisk/README.md`, "The Wave Pool's Barrel tube runs"):

| Case | h0 | H/h0 | T | S1 (the face along the ray) | HS (the crest) | Domain | What |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pool_barrel_small` | 4.5 m (the platform) | 0.268 | 10 s | 0.0733 (1:13.6) | 0.1933 (0.87 m) | 64 h0 | Barrel 1.5 m faces |
| `pool_barrel_big` | 4.5 m | 0.333 | 10 s | 0.0565 (1:17.7) | 0.1933 | 64 h0 | Barrel 1.8 m faces |

- **The transect along the ray:** the machine's 9 m floor and its ramp square to the crests (1:8.6, z −315.5 to −277); the
  4.5 m platform (level; at x 27 only about 10 m of it along +z, since the face, 1:26 along +z there, runs 103 m seaward of
  the crest line); the knee, rounded ±3 m; the face, 1:9.5 square to the crest line,
  which the crests climb at 1:13.6 (1.5 m) and 1:17.7 (1.8 m) along their travel at the take-off (the solver's Mead & Black X
  at the jets of |x| 25–30; the bigger wave breaks deeper, its crest less turned); the crest 0.87 m at x 27; then the reef
  top (6 m across), the lagoon's slope at 1:18 to 1.8 m. The case keeps the platform, the face and the crest, flat to the
  closed wall (`slope.c`'s one-slope bed); the advisor's caveat: the 2D case's backwash over the crest is stronger than the
  lagoon's sideways drain.
- **H/h0** is the machine's wave on the platform at the knee, measured: 1.16 m for H 0.95 and 1.45 m for 1.2 at the feed
  (`runs/scout-r3-*.txt`), so 1.21 and 1.50 m at the sizes' 0.99 and 1.24.
- **Windows:** provisional; `run_pool.sh` scouts each case at level 10 and places the switch, the end and the window, as
  `run_canyon.sh` does.
- **The commands** (the owner, on the M4, from the repo; about 2.5–4.5 h in all, both cases at once, one core each):

```
git fetch origin && git checkout claude/pool-barrel && git pull     # or main, once merged
npm run barrels:pool -- check      # what's missing and how to install it (Xcode tools, Basilisk, Python with numpy/scipy)
npm run barrels:pool -- setup      # only if check asks: Basilisk into ~/basilisk-C (2.8 GB, a minute), the Python packages
npm run barrels:pool -- smoke      # optional, about a minute: proves the compile, run and analysis plumbing
npm run barrels:pool               # starts both cases in the background, kept awake; Ctrl-C stops following, not the runs
npm run barrels:pool -- status     # each case's phase and ETA; `-- log` follows again, `-- stop` stops (rerun resumes)
```

  Then commit `public/barrels/periodic-pool-barrel-*.bin` and `docs/research/pool-tube-runs/` (the report, `data/`, the
  figures). If the report shows fewer than about 4 cells across the lip, `LEVEL2=14 npm run barrels:pool` reruns phase 2
  one level finer (about 5× the cost).
- **What they answer:** whether the transect throws an open tube, its height and how long it stays open (vertical to
  touchdown), against the fits' 0.9 / 1.05 m; the advisor's levers if 1.5 m comes out small (under about 0.9 m): X 12–13,
  a 0.8 m crest at the take-off, or offshore wind (the owner's call).
- **The tip** (normal incidence, X 18–19, crest 1.0 m) has no case; `POOL_CASES` can add one later.

## Byte identity

`pin-check.ts` steps each spot 60 steps (shared Medium swell) and the Wave Pool's three Training sizes on its own machine,
on the branch and on main 32860d6e (a `git archive` of its `src` with this script), and hashes the bed, h, qx, qz and the
breaking strength (FNV-1a), with the take-off, start and tank.
- Every line matches (`runs/pin-main.txt`, `runs/pin-branch.txt`): the Beach d65e9541, the Point 0f9561cb, the Reef 08eeae3a,
  Padang Padang b49c761c, the Canyon 316bb67a, the pool on the shared swell 042a89cb, and Training Small b68588f4, Medium
  564d0e2f and Big 1b0d2434.
- The Barrel floor's lines (the branch only) are its own: its grid is 280 × 374 (Training's 280 × 359; its 1 m cells start
  20 m further out), the same zone.

## Tests

PENDING

## Risks and open items

- **The owner's call: the breaking-age gate.** The Barrel floor gates rule A along its crests at J 0.5, as the Canyon does;
  it reopens "rule A left alone" (2026-10-07) at the pool, so it is the owner's (the advisor). Without it the line stalls
  3–7 s a third of the way down each arm (`?poolAgeJoin=0` to see it). The advisor's alternative if the owner keeps rule A:
  a two-slope face whose 1:18 toe runs on seaward as ridges (the training's focus), which evens the heights so the fuse runs
  the whole arm, at the cost of a softer Y (about 1.9–2.1, a smaller tube) and a zone-edge step.
- **The catch is the big one:** see "The catch". The Barrel's steeper, faster waves leave most headless riders on the crest.
- **The peel is slow,** 4–5 m/s along the arm against the advisor's 6.2–6.6 m/s (the platform's trace speed), a peel angle
  of about 45–60° at 1.5 m and 75–80° at 1.8 m, where the break point moves along the crest at only about 1 m/s: the arm's
  waves shrink away from the tip's focus (1.42 → 1.06 m at the 3 m contour), so each breaks a little shallower and later
  than its neighbour nearer the tip. A rider must stall to stay in the tube. Levers, each a trade: the ridges above (even
  heights), arms less oblique (66°: more height, a faster trace speed), or a bigger machine wave.
- **The plunging section ends at |x| 30–34,** short of the advisor's 45: past it the arm's smaller waves break over the
  shallowing crest and spill. The plunge past the take-off is 15–20 m of arm, 3.5–4.5 s at the peel: the owner's "2–3 s"
  with little to spare.
- **The tube's size** is the fits' until step 2: 0.85–0.9 m tall at 1.5 m faces, under the owner's 1–1.2 m; 1.05 m at 1.8 m.
  Our periodic Basilisk runs have come out under the fits on gentler slopes (Padang's 1:19: 0.03–0.23 H²). If the 1.5 m case
  is small, the advisor's levers: a steeper face (X 12–13), a 0.8 m crest at the take-off, offshore wind; the owner's call.
- **The reef top nearly dries** on the outer arm in the trough: 0.09 m of water (1.5 m) and 0.05 m (1.8 m) at its least,
  under the advisor's 0.3 m (0.27 and 0.20 m with the crest held at 0.9 m). It is the shoulder, past the plunging section.
  At 0.7 m the least is 0.17 m and the line reaches the barrel's end less often (6 of 11 against 8 of 11 waves).
- **The platform's height ran 30 % over the advisor's estimate** (H 1.62 m at the 3.25 m knee for H 1.05 at the feed): the
  ramp and the steep face shoal more than linear theory; the 4.5 m platform answers it.
- **Feed harmonics:** at H 1.24 m the 9 m feed's Ursell number is about 14 (Training's 8); the regular input sheds a free
  second harmonic. The waves are still identical (sd 0.2 s), but the crest's shape changes along z (unmeasured).
- **The ramp is 1:8.6** (the training's 1:9), 38.5 m long: about 0.45 of the feed's wavelength (the advisor's rule: at least
  half). Its reflection is not measured; the zone absorbs what comes back.
- **The lagoon's return flow and rips** at |x| 45–70, where riders kick out: not measured.
- **The readout's fix** reads the steepest bed slope for the Barrel floor only; the Training pool and the other spots read
  the slope along +z (their arms' readouts read low too; the training's take-off reads spilling at ξ 0.35). Not changed
  here.
- **Lip jet water:** the throw takes ψ0 from the feed's Hs over 9 m (0.16–0.21; for a regular wave √2 H), beyond the fits,
  so it throws the Teahupo'o slab (about 0.5 H thick) rather than Pick & Feddersen's jet at the platform's H/h (the advisor).
  The drawing step (3) owns it.
- **Not run here:** Basilisk (step 2), rider sessions (the owner rides), the GPU's step cost on the M4.

## Shot list for the owner

The Wave Pool, Waves: Barrel, Rich water, midday. Riders wait on the right arm (x 27); the left arm is its mirror. A
wave starts at the tip about 7 s (1.5 m) or 5 s (1.8 m) before its white reaches the take-off.

1. **1.5 m, from the start camera (the overview, before paddling):** watch three waves. One white line should leave the
   tip and run down each arm to about where the reef backs off, with no gap, the same every wave. Note any wave that
   breaks differently.
2. **1.5 m, the take-off:** paddle for five waves from the default start. Say how many you catch and how: too early, left
   on the crest, or caught by the lip. (The headless riders caught few; see "The catch".)
3. **1.5 m, the ride:** after the take-off, ride down the arm in the pocket, slowly (the peel is about 4–5 m/s). Does the
   lip throw ahead of you (the lip sheet, not yet a tube) for about 3–4 s, then the wave spill over the shallow outer reef,
   then a shoulder to kick out on?
4. **1.8 m, the same three:** the lip should throw from deeper water and further down the arm; the take-off is harder.
5. **Training at 1.5 m (Big), for A/B:** the same take-off and ride; Barrel's face should look steeper, its lip thicker.
6. **`?poolAgeJoin=0` at Barrel 1.5 m:** the floor without the breaking-age gate (rule A, as Training runs): the white
   should race from the tip down the inner arm and stall for several seconds at about a third of the way along it.
7. **The reef top at 1.8 m:** from above, the outer reef's crest (past the take-off) nearly dries in the trough (5–9 cm
   of water measured). Say whether that reads wrong.
8. **The readout** (HUD, Wave Lab) at the Barrel take-off: it should say plunging (it said spilling before this branch's
   fix to the Barrel's readout).
9. **Online:** create a room with Waves: Barrel and join it from a second client: both should ride the Barrel floor.
