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
line). On the Canyon, one process per (sea, seed, script): each such process carries every wave of that seed for that
one script. At most 4 processes at once, from one queue. Each runs with `node --max-old-space-size=3200`.

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

## 7. Status

Written before the runner. The controls, the baseline and the gain lock are recorded below as they land.
