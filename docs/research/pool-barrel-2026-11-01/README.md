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
  "extreme" to "very high" classes; Training's arms read X 31–39, Y 2.9–3.4), the bed's ξb 0.6–0.96. The solver's own
  void at the take-off is 0.70 m wide at 1.5 m faces and 0.79 m at 1.8 m (Training's 0.3–0.5 m).
- **One line along each arm, no gap.** The white leaves the tip and runs, as one line, to the take-off on 13 of 14 waves
  and to the barrel section's end (u 103 m along the crest line, |x| 45) on 11–12 of 14, at a steady 4.0–5.3 m/s along
  the arm. Before the gate it stalled for 3–7 s at |x| 34–38.
- **Identical waves:** every wave starts at the same moment of the period (sd 0.18 s) and place; it reaches the take-off
  6.9–7.2 s (1.5 m) and 5.3 s (1.8 m) later, sd 0.2–0.5 s; both arms match to 0.3 s.
- **The sizes:** H 0.99 and 1.24 m at the feed read 1.46–1.48 and 1.79–1.84 m on the surf meter at the take-off.
- **Where it falls short** (what the solver can say before Basilisk): the jets' fitted voids are 0.7–0.8 m wide, about
  0.9–1.05 m tall with their tilt, so 1.8 m meets the 1–1.2 m tube and 1.5 m is just under it; the plunging stretch past
  the take-off is 15–20 m of arm, about 3.5–4.5 s at the measured peel, which covers "2–3 s"; the peel is slow
  (4–5 m/s), so a rider stalls to stay in. Past |x| 34 the arm's waves (25 % smaller than near the tip, which focuses
  them) break over the crest and spill. Details below.
- **Step 2 is staged:** `npm run barrels:pool` on the owner's M4 (about 2.5–4.5 h), two cases on the take-off's ray.
- **Crests, health, cost and the catch:** below.

## The mode

- **Surf screen** (`src/ui/SurfScreen.ts`, `src/ui/strings.ts`): the Wave Pool's rows are Waves (Training | Barrel), Size and
  Time. Training's sizes are as before (1.0, 1.25, 1.5 m); Barrel's are 1.5 m and 1.8 m (`cond.swell.barrel.*`). The Waves
  choice rebuilds the size row. The sea spots never show it.
- **Conditions** (`src/game/SurfConditions.ts`): `SurfConditions.waves?: 'training' | 'barrel'` (missing means Training,
  as in rooms and logbooks from before). `poolBarrelSize(swell)`: Big is 1.8 m, any other choice 1.5 m. `poolFace`,
  `surfForecastFor(spot, swell, waves)` and the forecast line follow it. `physicalSettingsFor` gives the Barrel sizes'
  machine heights (`POOL_BARREL_EDGE_HEIGHT`) and `poolWaves: 'barrel'`; Training's settings are as before.
- **The sim** (`SurfZoneConfig.poolWaves`): the Barrel floor (`createSpot`'s `poolWaves`, `poolSpot(waves)`), its tank
  layout (the same zone; its 1 m cells from 10 m seaward of its platform), take-off depth (`poolBarrelBreakDepth`), ridden
  arm (`poolBarrelRiddenAt`) and breaking-age gate. `PhysicalMode`'s config and `roomSurfZoneConfig` pass it.
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
- **The face at onset:** the water's steepest slope near each onset 20–28° (1.8 m), against Training's 14–21° on its arms
  (its solver face clamp holds every spot near 17–27°; breaking.md).
- **Past |x| 34** the arm's waves break at 0.65–1.05 m, over the shallowing crest: rollers, few jets (the throw needs 0.4 of
  the breaker depth under the crest, and these breaks are shallower). That is the shoulder before the back-off.
- **Training, for comparison** (`runs/frame-r4-training-medium.txt`): jets too on its arms (it throws without a tube),
  X 31–39 (Y 2.9–3.4), voids 0.2–0.5 m wide.

**What the solver can't show:** the open tube itself (the solver cannot overturn; the voids above are Pick & Feddersen's
and Mead & Black's fits at each throw). Their size: W 0.70 m and L 1.4–1.6 m at the 1.5 m take-off, 0.79 × 1.8 m at 1.8 m,
tilted 23–35°, so about 0.9 m and 1.05 m tall. Step 2's Basilisk runs say what the transect really throws.

## Crests and health (600 s; `scripts/crest-angle-report.ts --spot pool --waves barrel`)

PENDING

## The start and the catch (`catch-probe.ts`, headless riders, as canyon-catch's)

PENDING

## Cost

PENDING

## Strips

PENDING

## The Basilisk cases (step 2, for the owner's M4)

PENDING

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

PENDING

## Shot list for the owner

PENDING
