# The stability benchmark (3.6a part 1)

*Surfer-track builder, Claude Opus 5.5, high effort, 2026-11-25. Branch `claude/stability-report`, from
`claude/take-off-stall` `b66eb87c` (the ride build's `src`, `claude/plant-rows` `1be12ee7`). The spec is the consult-log
entry "The stability system, agreed with Vicente by grilling; 3.6a dispatched" (`claude/the-record`). This note was
written and committed before any baseline was computed. Its thresholds are fixed from here on.*

The benchmark reads the game's own `balanceReserve` (`src/physics/AttachedRider.ts`): the least of the capture point's
margin, the grip left and the knees left. Only the margin can end a ride. The HUD's red line is 0.3 (`LOW_BALANCE`,
`src/ui/RideHud.ts`). Nothing here feeds back into the physics: the runner only reads, and no file under `src/` other
than the new gain-lock test changes.

## 1. How to run it

    npm run report:stability                      # quick: the test wave only
    npm run report:stability -- --mode full       # quick plus the Canyon rides
    npm run report:stability -- --extra '&cueLater=on'      # another build (default '&cueLater=on&plantFloor=6')
    npm run report:stability -- --update-baseline # write this run as the baseline (only when asked)

Options: `--jobs <n>` (processes at once, default 4, at most 4), `--out <dir>` (where the per-ride files go, default
`dist/stability/<mode>-<time>`), `--baseline <file>` (default `docs/research/stability/baseline-<mode>.json`),
`--only <id prefix>` (a subset, for debugging; never compared as a whole run).

**Exit code:** 0 when no regression; 1 on a regression (§5); 2 when a ride was refused (its printed build is not the
requested one) or a ride process failed.

## 2. The address and the build check

His address, `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on`, plus the ride
build's switches, `--extra`, default `&cueLater=on&plantFloor=6`. Every ride process parses the address through the
game's own `surfZoneConfigFor` and prints back, from the config it built, every requested switch (`canyonWaves=true` as
`canyonBed: 'b'`), and from the rider's predictor its `plantFloor`, `plantSpeed` and whole weights. **The report refuses a
ride whose printed switches are not the requested ones** (exit 2).

## 3. The rides

**Times** are seconds after the ride's first `standing` frame (`tS`). Every ride runs until 5 s after that frame or
until he separates. **The step** is the game's fixed 1/60 s.

**Stances:** none; Crouch (`crouch` 1); Compress (`compress` 1); Snap (`snap` 1). Each is held from +0.2 s to the end.
**The steer:** the stick at full lock from +1.0 s for 1.0 s, then centred. **Left** is `steer` +1 and **right** is
`steer` −1, in the session's own sign (`RideInput.steer`: +1 the board's left, its +x rail). This is 3.5x's `L` and `R`.
In the game the arrow keys are mapped through the camera (`PhysicalMode.screenSteer`). On the test wave the
coordinator's "right" key (D) turned the board toward +x, so his right steer is this benchmark's **left**; §7 pairs them
by the course.

**His way** (his answers of 2026-11-25): Compress 1 from +0.2 s to the end; the trim at +1 from the first standing
frame, released (0, latched) from the step after the first standing frame whose speed through the water is
≥ 4.4 m/s; the stick centred. This is 3.5z's `cueCTv`, whose drive code is reused verbatim.

**Inputs** are sent as the probes send them: a stance, trim or steer field only when nonzero, so the base drives' input
objects are the probes' byte for byte.

| group | mode | sea | rides |
| --- | --- | --- | --- |
| `tw-catch` | quick | the test wave, `&testWave=catch`: lying down, paddling from the first step, popping on the cue's first frame | 4 stances × {straight, left, right}, plus his way (13), plus the prone twin |
| `tw-ride` | quick | the test wave, `&testWave=ride`: placed standing on the face at sea time 62.5 s | the same 13 |
| `med` | full | Canyon B Medium (`physicalSettingsFor('canyon', { swell: 'medium' … })`), organic seeds 1–3, `PERIODS=12` | his way, steer left and steer right (no stance), plus the prone twin |
| `big` | full | Canyon at the Surf screen's Big (`swell: 'big'`: Hs 2.4 m, Tp 14 s, spread 0.2), organic seeds 1–3, `PERIODS=12` | his way, and every stance (none included) steering left and right (9), plus the prone twin |

**The drives.** The test wave runs on the game's own `SurfZoneRunner`, exactly as 3.5t–3.5z's catch mode drives it:
the recorded sea restored, the rider placed on the first step, the cue read from the runner's status. The Canyon rides
run 3.5o–3.5z's organic drive: the sea stepped once, a rider placed prone at the lineup for each wave the probe
detects, paddling, sprinting and popping on the player's cue (`playerCue`, with `cueLater`). Riders there read the water
and never push it.

**Processes.** One fresh process per ride on the test wave (3.5t's warning: in-process restarts carry state on this
line). On the Canyon, one process per sea and seed, carrying every script of that group (his way, the steer rides and
the twin) on every wave of that seed, as 3.5x and 3.5z ran them. At most 4 processes at once, from one queue. Each runs
with `node --max-old-space-size=3200`.

*Amended 2026-11-25, about 12:42 UTC, before any baseline:* the note first said one process per (sea, seed, script).
One such process, Canyon Medium seed 1 with one script, had stepped its sea for 6 min and stood once, so the full mode's
42 of them would take well over an hour with 4 at once. The Canyon riders read the water and never push it, and 3.5z
§2 reproduced every frame row of `cue` and `cueC` from processes with other script sets, so the rides do not depend on
which other scripts share the sea. §8's inertness control checks this again: a one-script process against the grouped
ones.

*Amended 2026-11-25, about 13:40 UTC, after the first full run and before the full baseline:* the probes' organic drive
drops a wave's whole trial 20 s (`TRIAL`) after placing its riders. On the first full run that cut 12 late stands
(Medium s3w5, Big s2w5) at about 1.2 s; 10 of them had not fallen, and the report would have counted those as lasting. The runner now drops
only the riders that have not stood at 20 s, exactly as before, and lets a rider that stood ride on to its hold or its
fall. No rider stands that did not stand in the probes, and nothing before 20 s changes. The report also marks any ride
that neither fell nor reached 5 s as **cut**, never as lasting.

**A ride** is one stand: on the test wave, one per process; on the Canyon, one per (sea, seed, wave, script). Its id is
`tw-catch:compress:left`, `med:s2:w6:hisway`, and so on.

## 4. What each ride records (`rides.jsonl`, one JSON line per ride)

- **stood**, the stand's time on the sea's clock and its speed through the water (vW, horizontal |v_board − flow|, m/s).
- **fell**, and **when** (`tS` of the first frame he is off the board: phase `fallen` on the test wave, not attached on
  the Canyon, as the probes read it). For take-offs (`tw-catch`, `med`, `big`) also **fell within 3 s**.
- **The lowest reserve**, over the standing frames from the stand to the fall or to +5 s.
- **The time in the red:** the standing time with the reserve below 0.3, s (frames × 1/60 s).
- **Recovery** (steer rides): from the release (+2.0 s), the time until the reserve is above 0.3 again. 0 if it is above
  0.3 on the release frame; `null` with `recoveryFell` if he falls first; censored at the end of the hold.
- **Turning** (steer rides), from the board's ground velocity (course = atan2(vx, vz), world, deg) and its yaw rate
  (`angularVelocity.y`, world, deg/s): the course change from the steer's start (+1.0 s) to +1.5 s and to +2.0 s, and the
  peak yaw rate in +1.0 to +3.0 s. Each is signed **toward the steer** (positive: the board turns the way the stick
  asks), with the raw world value beside it.
- **Warning** (every fall): how long the reserve had been continuously below 0.3 at the fall, s (the last run of red
  frames ending at the last standing frame; gaps ≤ 0.05 s bridged). 0 if the last standing frame was not red.
- **The cause** of a fall (§4.1).

### 4.1 The cause labels (fixed before the baseline)

In this order:

1. **wave** (take-offs only): the prone twin on the same wave is slower than **3.6 m/s through the water at +0.7 s after
   the stand's sea time** (3.5z §5.1's line). The twin is 3.5z's `never` on the Canyon (the same sea, the same lineup,
   placed with the same wave; never pops, keeps paddling and sprinting) and the test wave's `paddle` on the test wave
   (the same recorded sea; never pops). Its vW is read on its frame at the stand's sea time + 0.7 s (the nearest step). A
   twin with no frame there (its run has ended because the crest passed it) counts as below the line.
2. **whitewater**: the froth brake acts before the escape. On at least one standing frame with `tS` from 0 to the
   escape's onset, the froth force along the board's track through the water (`BoardBody.forces.froth` dotted with the
   horizontal unit of v_board − flow, 3.5z's `z35` budget) is **≤ −0.10 W**, where W = (board mass + rider mass) × g.
   - Why −0.10 W (3.5z §5.2): on the whitewater falls the term reached −0.16 to −0.25 W (N) and −0.15 to −0.46 W (L); on
     the one L fall with "no froth to speak of", s2w5, −0.04 to −0.09 W; on the stands that lasted, the least froth over
     0–1.5 s was a median 0.00 W, and 10 of 38 reached −0.05 W. −0.10 W lies between the two.
   - **The escape** is 3.5z's final escape (§0.4): the onset of the last run of margin loss that ends at the separation,
     gaps ≤ 0.05 s bridged. Margin loss on a frame is any of M1 (`headX ≤ 0`, the demanded pressure at the feet's edge
     across), M2 (a substep whose coupled contact was infeasible, `settleStanding` false), M3 (`beyond`, the capture point
     past the room's reach) and F (`pastZ > 0`, past the nose or the tail). With no margin loss, the escape is the fall.
3. **balance**: anything else.

Rides that start standing (`tw-ride`) have no twin: their falls are whitewater or balance. A take-off with no stand is
reported as **no stand**, not as a fall.

## 5. The regression rule

Against the committed baseline of the same mode (rides matched by id):

- **Fail** (exit 1) if a ride that lasted its hold (5 s) in the baseline now falls, or no longer stands.
- **Fail** if any ride's lowest reserve is lower than the baseline's by more than 0.10.
- **Report** every improvement (a baseline fall that now lasts or falls later, a lowest reserve higher by more than
  0.10), every changed cause, and every ride present in only one of the two. Nothing is written into the baseline
  unless `--update-baseline` is given.
- **Report** balance falls separately from wave and whitewater falls, per group, against the baseline's counts.

## 6. The file layout

| path | what |
| --- | --- |
| `scripts/stability-ride.ts` | one ride process: the drives, the build print-back, one row per frame from the stand, the summary |
| `scripts/stability-report.ts` | the queue, the metrics, the labels, the tables, the comparison and the exit code |
| `package.json` `report:stability` | bundles both into `dist/scripts/` and runs the report |
| `docs/research/stability/baseline-quick.json`, `baseline-full.json` | the committed baselines (one object per ride, with the run's build) |
| `docs/research/stability/baseline-quick.md`, `baseline-full.md` | their Markdown tables |
| `docs/research/stability/gains.md`, `gains.json` | the ride build's controller gains and the delay check's map (the gain lock's expected values) |
| `src/physics/stabilityGains.test.ts` | the gain lock (`npx vitest run src/physics/stabilityGains`) |
| `dist/stability/…` | a run's raw files (not committed) |

## 7. Status (2026-11-25, about 14:30 UTC)

Done: the runner and the report, both modes; the controls below; the quick and full baselines of the ride build; the
gain lock. Everything in this section was measured on `claude/stability-report`, whose `src` is the ride build's
(`git diff b66eb87c -- src` shows only the new test).

### 7.1 Run times (this machine, on AC power, 4 processes at once)

| mode | processes | rides | wall time |
| --- | --- | --- | --- |
| quick | 27 (26 rides and the twin) | 26 | 10.2 min and 10.2 min (two runs) |
| full | 33 (the 27 and six Canyon processes) | 227 | 29.5 min (first run, before the §3 trial fix) and 29.3 min |

The quick mode is slower than the 5–8 min aimed at: each test-wave process spends about 62 s spinning the sea up before
its 5–10 s of riding (about 100 s a process with four running). A shared spin-up would need the recorded sea restored
in-process, which 3.5t warns carries state on this line, so I did not do it. A Canyon Big process takes 14–16 min and a
Medium one about 10 min.

### 8. Controls (all before the baselines were committed)

| control | result |
| --- | --- |
| Determinism: two quick runs (`q1`, `q2`) | 26 of 26 ride lines identical; 5 805 of 5 805 rows of the 27 ride files identical (the wall-clock fields `spinUp` and `seconds` left out). The full runs' test-wave part equals `q1` the same way. |
| Inertness, Canyon, the probes' drives: one grouped process per seed 1–3 with `TURN_AT` 0.3, `TURN_FOR` 0.9 (3.5x's turn), the old drive (trial cut at 20 s, as the probes) | `cue` (3.5z), `cueC` (3.5z), `cueL`, `cueR`, `cueCL`, `cueCR` (3.5x arm A): 35 of 35 riders each, 210 in all, with the same cue, pop, stand and fall time. Frame rows of `cue` and `cueC` against 3.5z's: 5 017 of 5 017 standing frames identical in vW, vG and phase. |
| Inertness, his way: the full runs' `hisway` against 3.5z's `cueCTv` (seeds 1–3) | 35 of 35 riders with the same cue, pop, stand and fall time, in both full runs. Two of them (Medium s1w6, s3w5) stood late and were cut by the 20 s trial in 3.5z and in the first full run; in the second they ride their 5 s and still last. |
| Inertness, one script per process: Medium seed 1, `compress:straight` alone, against 3.5z's `cueC` | 12 of 12 riders identical (the grouped processes do not change a rider). |
| Inertness, the test wave: `tw-catch` `none:straight` and `compress:straight` against 3.5x's catch runs (3.5v's probe, run 0, `cue` and `cueC`, held 3 s) | cue at 3.683 s and stand at 4.900 s on both; 182 of 182 standing frames (tS 0–3.02 s) identical in vW, vG and phase, each. |
| Every ride's printed build | every requested switch built as asked on all 120 processes of the four runs on the ride build (`q1`, `q2`, both full runs; the report refuses a ride otherwise, and all four exited 0); the predictor's `plantFloor` 6 and `plantSpeed` none on every stand. |
| The Canyon byte check (`byte-check.txt`) | snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`: identical to the reference. |
| `npx tsc -b` | clean. The two scripts also typecheck on their own (`tsc --noEmit --strict`). |
| `npx vitest run src/physics/stabilityGains` | 5 of 5 pass in 0.9 s. |

The rule demonstrated is §8.3.

### 8.1 The test wave against the coordinator's browser rides

His runs were on the same build in the browser, lying down (catch), the keys sampled about once per frame at about
3 fps, the stance and steer keys ramped in by the game's `AxisRamp`. Mine are the bot's: the inputs at full value from
their first step. His "right" (D) turned the board toward +x, which is the session's steer +1, this benchmark's
**left** (`tw-catch:none:left`'s course goes +33.6° toward +x by +2.0 s).

| stance | straight: his / mine (s) | his right steer = my `left` (s) | his left steer = my `right` (s) |
| --- | --- | --- | --- |
| none | +4.82 / +4.80 | +3.75 / +3.50 | +3.42 / +3.78 |
| Crouch | +3.93 / +4.18 | +1.97 / +1.80 | — / +3.30 |
| Compress | +4.85 / lasts 5 s | +2.63 / +3.65 | — / +3.10 |
| Snap | +3.82 / +3.67 | +2.40 / +1.90 | — / +2.38 |

The straight rides agree within 0.25 s, Compress's apart (he fell at +4.85 s, the bot lasts the 5 s with the reserve
at 0.17 on its last frame). The steer rides differ by 0.17–1.02 s. Their inputs differ (a ramped key at 3 fps against a
full step input), so I read no more into it. In both, every steer throws him and Crouch falls inside the steer.

### 8.2 The baselines

`baseline-quick.md` and `baseline-full.md` list every ride. The summary below is recomputed from `baseline-full.json`
by `checks/summary.py`. Times are s after the stand; the reserve is `balanceReserve` (0–1); "toward" is signed toward
the steer; course is the ground track's (world, deg); yaw is the board's (world, deg/s). "Lowest reserve" is over the
lasting rides only; "recovery" counts the steer rides whose reserve came back above 0.3 after the release, fell first,
or were censored.

| group | drive | rides | lasted 5 s | cut | falls: balance / wave / whitewater | fell ≤ 3 s | lowest reserve, median (lasting rides) | red s, median | warning s, median (range) | recovery s, median (n back / fell first / censored) | course +0.5 / +1.0 deg toward, median | peak yaw deg/s toward, median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tw-catch | none straight | 1 | 0 | 0 | 1 / 0 / 0 | 0 | — | 0.18 | 0.18 (0.18–0.18) |  |  |  |
| tw-catch | none steer | 2 | 0 | 0 | 2 / 0 / 0 | 0 | — | 0.57 | 0.31 (0.25–0.37) | 0.04 (2 / 0 / 0) | 0.19 / 33.22 | 129.62 |
| tw-catch | crouch straight | 1 | 0 | 0 | 1 / 0 / 0 | 0 | — | 0.32 | 0.00 (0.00–0.00) |  |  |  |
| tw-catch | crouch steer | 2 | 0 | 0 | 2 / 0 / 0 | 1 | — | 0.43 | 0.13 (0.10–0.17) | 0.00 (1 / 1 / 0) | -2.60 / 15.70 | 174.86 |
| tw-catch | compress straight | 1 | 1 | 0 | 0 / 0 / 0 | 0 | 0.00 | 0.48 | — (—) |  |  |  |
| tw-catch | compress steer | 2 | 0 | 0 | 2 / 0 / 0 | 0 | — | 0.62 | 0.23 (0.12–0.33) | 0.01 (2 / 0 / 0) | -1.82 / 4.15 | 167.78 |
| tw-catch | snap straight | 1 | 0 | 0 | 1 / 0 / 0 | 0 | — | 0.12 | 0.12 (0.12–0.12) |  |  |  |
| tw-catch | snap steer | 2 | 0 | 0 | 2 / 0 / 0 | 2 | — | 0.19 | 0.19 (0.12–0.27) | 0.00 (1 / 1 / 0) | 7.96 / 0.51 | 138.87 |
| tw-catch | his way | 1 | 1 | 0 | 0 / 0 / 0 | 0 | 0.00 | 0.48 | — (—) |  |  |  |
| tw-catch | all | 13 | 2 | 0 | 11 / 0 / 0 | 3 | 0.00 | 0.45 | 0.17 (0.00–0.37) | 0.01 (6 / 2 / 0) | 0.28 / 11.02 | 142.00 |
| tw-ride | none straight | 1 | 0 | 0 | 1 / 0 / 0 | — | — | 0.40 | 0.23 (0.23–0.23) |  |  |  |
| tw-ride | none steer | 2 | 0 | 0 | 2 / 0 / 0 | — | — | 0.97 | 0.35 (0.22–0.48) | 0.00 (2 / 0 / 0) | -2.09 / 5.95 | 111.79 |
| tw-ride | crouch straight | 1 | 0 | 0 | 1 / 0 / 0 | — | — | 0.38 | 0.15 (0.15–0.15) |  |  |  |
| tw-ride | crouch steer | 2 | 0 | 0 | 2 / 0 / 0 | — | — | 0.23 | 0.08 (0.08–0.08) | — (0 / 2 / 0) | -0.94 / — | 147.99 |
| tw-ride | compress straight | 1 | 0 | 0 | 1 / 0 / 0 | — | — | 0.62 | 0.00 (0.00–0.00) |  |  |  |
| tw-ride | compress steer | 2 | 0 | 0 | 2 / 0 / 0 | — | — | 0.26 | 0.11 (0.10–0.12) | — (0 / 2 / 0) | 0.55 / — | 73.19 |
| tw-ride | snap straight | 1 | 0 | 0 | 1 / 0 / 0 | — | — | 0.47 | 0.25 (0.25–0.25) |  |  |  |
| tw-ride | snap steer | 2 | 0 | 0 | 2 / 0 / 0 | — | — | 0.36 | 0.14 (0.08–0.20) | — (0 / 2 / 0) | — / — | 22.18 |
| tw-ride | his way | 1 | 0 | 0 | 1 / 0 / 0 | — | — | 0.62 | 0.00 (0.00–0.00) |  |  |  |
| tw-ride | all | 13 | 0 | 0 | 13 / 0 / 0 | — | — | 0.40 | 0.12 (0.00–0.48) | 0.00 (2 / 6 / 0) | 0.55 / 5.95 | 94.47 |
| med | his way | 13 | 8 | 0 | 0 / 4 / 1 | 4 | 0.07 | 0.15 | 0.15 (0.08–0.35) |  |  |  |
| med | none steer | 26 | 0 | 0 | 14 / 10 / 2 | 13 | — | 0.47 | 0.24 (0.07–0.52) | 0.15 (19 / 7 / 0) | 0.89 / 21.63 | 134.19 |
| med | all | 39 | 8 | 0 | 14 / 14 / 3 | 17 | 0.07 | 0.37 | 0.22 (0.07–0.52) | 0.15 (19 / 7 / 0) | 0.89 / 21.63 | 134.19 |
| big | his way | 18 | 11 | 0 | 1 / 6 / 0 | 5 | 0.33 | 0.02 | 0.23 (0.13–0.38) |  |  |  |
| big | none steer | 36 | 7 | 0 | 15 / 12 / 2 | 18 | 0.08 | 0.43 | 0.30 (0.02–0.50) | 0.00 (23 / 13 / 0) | 0.96 / 13.46 | 105.59 |
| big | crouch steer | 36 | 4 | 0 | 20 / 12 / 0 | 28 | 0.14 | 0.28 | 0.11 (0.00–0.50) | 0.00 (15 / 21 / 0) | -1.10 / 6.09 | 88.46 |
| big | compress steer | 36 | 5 | 0 | 19 / 12 / 0 | 24 | 0.26 | 0.25 | 0.15 (0.05–0.43) | 0.00 (16 / 20 / 0) | -0.29 / 9.84 | 91.29 |
| big | snap steer | 36 | 0 | 0 | 22 / 12 / 2 | 33 | — | 0.28 | 0.23 (0.00–0.57) | 0.00 (15 / 21 / 0) | 2.60 / 12.92 | 110.56 |
| big | all | 162 | 27 | 0 | 77 / 54 / 4 | 108 | 0.25 | 0.28 | 0.20 (0.00–0.57) | 0.00 (69 / 75 / 0) | 0.71 / 10.01 | 100.27 |

What the baseline shows (measured):
- **Most rides touch 0.** 149 of the 190 falls and 8 of the 37 lasting rides have a lowest reserve of 0; 14 of the 37
  lasting rides go below 0.10. On lasting rides the 0 is the grip term (`1 − frictionUsed`), late in the ride, as the
  board slows off the wave (`tw-catch:compress:straight` at +4.68 s). So the rule's "lowest reserve 0.10 lower" can
  only fire where the lowest is above 0.10 today: on 23 of the 37 lasting rides, and on few falls (149 of 190 reach
  0).
- **The warning is short.** Of the 190 falls, 54 had the reserve continuously red for 0.3 s or more at the fall.
- **The turn is slow to start.** Over the first 0.5 s of the full steer the ground course changes by a median 2.4° (all
  186 steer rides, absolute); most of the turn comes in the second half second, and 78 of the 186 fall before the
  release at +2.0 s.
- **On the Big swell the stances fall inside the steer.** With Crouch, Compress or Snap, 21, 20 and 21 of 36 rides fall
  before the reserve can recover after the release; with no stance 13 of 36. His way lasts 11 of 18.
- **The cause labels.** On the Canyon, 54 of 135 Big falls and 14 of 31 Medium falls are wave (the prone twin below
  3.6 m/s at +0.7 s), 4 and 3 whitewater; the rest balance. On the test wave every fall is balance: the twin is at
  6.06 m/s at +0.7 s and no froth reaches −0.10 W.

### 8.3 The rule demonstrated

- **An unchanged rerun passes:** `q2` against the quick baseline (`q1`): 0 regressions, 0 improvements, exit 0.
- **The shipped balance fails:** `--extra '&cueLater=on'` (no `plantFloor`), a fresh quick run (`s1`, 10.3 min), against
  the ride build's quick baseline: **exit 1, 2 regressions.** `tw-catch:compress:straight` and `tw-catch:hisway` lasted
  5 s on the ride build and fall at +4.90 s (balance) on the shipped balance. The report also lists 7 improvements, among
  them `tw-catch:none:straight`, which falls at +4.80 s on the ride build and lasts 5 s on the shipped balance, and four
  falls 0.27–0.35 s later. Every ride printed `cueLater` on and the predictor's `plantFloor` none, so none was refused.
  Its raw files are `runs/quick-shipped-s1.tar.gz`.

### 9. The gain lock

`gains.md` lists the ride build's gains (the ankle row K[0] and the twist row K[1], every state) at every schedule knot,
17 speeds (4–12 m/s) × 4 depths (0, 0.195, 0.30, 0.45 m), rail 0, through `scheduledDesign`, and checks that the
runtime's `PredictiveController.blend` reads the same values at the knots. The weights come from a `RideSession` built
with the ride build's rider options and equal what every ride printed. `gains.json` is the fixture.

`src/physics/stabilityGains.test.ts` fails if any gain moves by more than 1e-7 (relative, absolute below 1), if the delay
changes, or if a cell of the map below that is stable today becomes unstable. Checked by editing the fixture: one gain
moved by 2 × 10⁻⁷ (relative) failed the knot and blend tests, and a cell marked stable that is unstable today failed
the map test; the fixture restored, all 5 pass.

The delay check (3.5x §8, table truth, rail 0), least damping at 5 / 6 / 7 ticks of delay; −1.00 marks a real root
outside the unit circle:

Positive is a decaying loop; −1 marks a real root outside the unit circle (3.5x's "div"). The test asserts that every
cell positive here stays positive.

| stance (depth, m) | 5 m/s | 5.25 m/s | 5.5 m/s | 5.75 m/s | 6 m/s | 6.5 m/s | 7 m/s | 7.5 m/s | 8 m/s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tall (0) | -1.00 / -1.00 / -1.00 | 0.18 / 0.20 / 0.16 | 0.18 / 0.39 / 0.16 | 0.17 / 0.41 / 0.16 | 0.16 / 0.67 / 0.16 | 0.19 / 0.65 / 0.17 | 0.20 / 0.69 / 0.18 | 0.20 / 0.69 / 0.18 | 0.21 / 0.66 / 0.19 |
| crouch (0.195) | -1.00 / -1.00 / -1.00 | 0.17 / 0.20 / 0.16 | 0.16 / 0.40 / 0.16 | 0.16 / 0.42 / 0.16 | 0.15 / 0.64 / 0.16 | 0.20 / 0.65 / 0.17 | 0.20 / 0.66 / 0.18 | 0.21 / 0.66 / 0.18 | 0.22 / 0.70 / 0.19 |
| compress (0.3) | -1.00 / -1.00 / -1.00 | -1.00 / -1.00 / -1.00 | 0.16 / 0.41 / 0.16 | 0.16 / 0.43 / 0.16 | 0.15 / 0.68 / 0.16 | 0.20 / 0.66 / 0.18 | 0.21 / 0.68 / 0.18 | 0.21 / 0.68 / 0.19 | 0.22 / 0.69 / 0.20 |
| tuck (0.45) | -1.00 / -1.00 / -1.00 | -1.00 / -1.00 / -1.00 | 0.19 / 0.43 / 0.17 | 0.19 / 0.46 / 0.17 | 0.19 / 0.67 / 0.17 | 0.21 / 0.67 / 0.18 | 0.22 / 0.67 / 0.19 | 0.23 / 0.68 / 0.20 | 0.24 / 0.68 / 0.21 |

Each cell: 5 / 6 / 7 ticks.

All 108 cells agree with 3.5x's `model-table.jsonl` (arm A) to within 0.0005, its rounding. Below 5 m/s nothing is
asserted (3.5x §8: the linear model does not describe the game there); part 2 identifies the slow board from the
game's own ticks.

### 10. Recompute

- The baselines from the raw runs: `tar xzf runs/full-f2.tar.gz` (or `quick-q1.tar.gz`), then
  `node dist/scripts/stability-report.mjs --mode full --out f2 --reuse` (after `npm run report:stability` has bundled it,
  or bundle with the two rolldown lines of `package.json`).
- The summary: `python3 checks/summary.py baseline-full.json`. Determinism: `python3 checks/determinism.py <run A> <run B>`.
- Inertness: `checks/inert.py <run dir>` and `checks/inert_catch.py <run dir>` read 3.5z's and 3.5x's saved runs from the
  session scratchpad (`35z/runs/`, `35x/catch/`) and 3.5x's committed `run-summaries.jsonl.gz`.
- The gain table: `STABILITY_GAINS_WRITE=1 npx vitest run src/physics/stabilityGains`.

### 11. Not done

- The bar's UI (a later piece), part 2 of the gains (below 5 m/s), and skills in the benchmark.
- The quick mode's 5–8 min: it takes 10.2 min (§7.1).
- A fall's axis or limit name is in the frame rows (`lim`) but not in the tables.
