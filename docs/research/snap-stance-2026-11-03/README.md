# Snap: the fourth stance (2026-11-03)

Branch `claude/snap-stance` (from `origin/claude/playtest-1103b`: main 632f3f13 plus the pool tube case swap). Worktree `.claude/worktrees/canyon-beach-break`. No PR; the owner merges.

## Where it stands

- **Research:** done (below, with links).
- **Design and the plant:** measured on still water and the 15° plane face (below). The physics is in `src/physics/AttachedRider.ts` (`snap`, the SNAP_* constants). It does nothing while Snap is not held.
- **Build:** in progress. Next is the input (Q, RB, R3 for the camera, the pad layout 4 migration), the session, `?snap=off`, the drawing, the help line and the tests.

## Next steps

1. The input: `Bindings.ts` (`snap`, Q / RB; camera to R3), `Settings.ts` (`padLayout` 4 and its migration), `Controls.ts` (the axis and a touch button), `RideInput.snap`, and the pocket reflex standing aside.
2. `?snap=off` (`SurfZoneConfig.snap` → `RideSessionOptions.snap`); online rooms pin to the default.
3. The drawn body and online: the snap reads from the physics' points (the pelvis low and over the back foot) and the yaw rate, so remote surfers show it with no wire change. Check the stages it blends (`stageBlend.ts`: redirect, cutback).
4. The spray: the existing board spray reads the hull's drift. Measure the sheets in a snap against a carve.
5. Help line (`strings.ts`), a Practice hint (`hints.ts`), the HUD's stance readout.
6. Tests: the bindings migration, the precedence, `?snap=off`, byte identity; the measurement tables below, as a lab section.
7. The full suites (`--maxWorkers=3`).

## How to verify

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- `npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts --maxWorkers=3 -t "[Pp]ool|[Bb]arrel|[Tt]ube|[Pp]adang|[Rr]oller|[Bb]oard|[Rr]ider"`.
- The probes in `probes/` measure the tables: copy `snapLab.ts` to `src/physics/zz-snapLab.ts` and a `zz-*.test.ts` beside it, run it with `OUT=<file.json>`, then `python3 probes/show.py <file.json>`. Delete the copies afterwards (they are not part of the suite).

---

## 1. Research

### What real surfers do: rates, durations, speed

| Source | What | Numbers |
|---|---|---|
| Forsyth et al. 2024, *Sci Rep* 14:8734 ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11021506/)), Table 2; 6 surfers, 214 waves, a board-embedded GPS (10 Hz) and IMU (200 Hz) | Cutbacks and top turns (pooled; under 90° filtered out) | 152 ± 3° in 0.96 ± 0.03 s; **mean** angular velocity 3.0 ± 0.1 rad/s (172°/s); 6.7 m/s; rail 75 ± 3°; pitch 42 ± 2°. Bottom turns: 99° in 0.96 s, 1.9 rad/s, 7.3 m/s, rail 42°. "Turn flow" 0.92 ± 0.02 (not defined in the text). |
| US 9697743 B2 ([Google Patents](https://patents.google.com/patent/US9697743B2/en)), one instrumented ride | A snap off the top after two pumps to 9.13 m/s; a cutback | Snap: peak rotation "over 200 degrees/second", peak 1.77 g. Cutback: peak "over 300 degrees/second". |
| Shormann, Oggiano & in het Panhuis 2020, *Proceedings* 49:132 and 49:158 (MDPI; the full text is blocked to fetch, read through its abstract and a search summary of its table) | Cutback rates from ~2,000 tracked waves, used as CFD inputs | Yaw 2.25 / 2.75 / 3.25 rad/s (intermediate / expert / WCT) at 7 m/s; roll 1.0–1.5, pitch 0.5–1.0 rad/s. Rates rise with skill; "in a real turn the speed usually decreases as the turn progresses", and the speed in the cutback depends mostly on the wave's energy. |
| Rapture Surfcamps, [the snap](https://www.rapturecamps.com/learn-to-surf/surf-maneuvers/snap) (coaching) | The snap's technique | A deep bottom turn; climb at 60–80° to the lip; **weight 80/20 to 90/10 on the back foot** (the nose unweighted, the tail loaded); the head and shoulders rotate "as fast as possible" toward the base of the wave, and that rotation sets the snap's speed; the fins release and the tail slides through the lip; centre the weight and re-engage the fins; spray off the tail. A snap "consumes enormous speed". |
| Surfertoday, [frontside snap](https://www.surfertoday.com/surfing/how-to-do-a-frontside-snap-in-surfing) and [layback snap](https://www.surfertoday.com/surfing/how-to-do-a-layback-snap) (coaching) | Where and how | The steepest part of the lip; the back foot far back; speed, pivoting and the body's adjustment. |
| de Sousa 2022 (the owner's PDF; quoted in `docs/superpowers/specs/2026-09-27-stances.md`) | The bottom turn's final phase, which leads into the snap | Knee and hip extension; weight to the back foot; the rail released; the trunk rotates; the chest and the leading arm to the lip. |
| Animation-realism plan §5.11 and §5.15 (`docs/superpowers/plans/2026-10-22-animation-realism.md`) | The top turn's and kick-out's drawn targets | Top turn: about 70/30 on the back foot, compressing through the redirect. Kick-out: weight 0.15–0.3, the front leg long (20–45°), the back knee bent (60–90°). |

**The speed a snap costs is not published as a number.** No IMU or GPS study found reports speed in and out of a snap or re-entry: Forsyth gives each turn's mean speed (cutbacks 6.7 m/s against bottom turns 7.3, 8 % less) and an undefined "turn flow" of 0.92; Shormann et al. say the speed falls through a turn and depends on the wave; the smartphone-IMU detection study ([PMC7256581](https://pmc.ncbi.nlm.nih.gov/articles/PMC7256581/), 71 snaps and 94 cutbacks) reports none; neither does the GNSS review ([Mejuto et al. 2024, PMC11174645](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11174645/)). Coaching is qualitative ("consumes enormous speed"). So the measured speed kept is reported against Forsyth's 0.92 as the upper bound for a turn the wave feeds, and against the physics.

### Weight on the tail of a planing board

- **The board trims nose up.** Moving the load aft moves gravity behind the hull's lift, and the board rotates nose up until the lift has moved back under it (the Exploratorium's surfing physics, cited in the phase-5 physics plan §1.3; Savitsky 1964: the trim rises as the longitudinal centre of gravity moves aft).
- **The wetted length shortens into the tail.** At a given load a planing plate at a higher trim needs a shorter mean wetted length (Savitsky's C_L = τ^1.1 (0.012 λ^0.5 + 0.0055 λ^2.5 / C_V²)). The board's rocker is steepest in the tail, so the wetted region is the most curved part of the hull.
- **The drag rises past the best trim.** A planing hull's drag is least near 4° of trim; above it the pressure's backward share, Δ tan τ, grows (Savitsky 1964; Hendricks 1969: the trim is a compromise between friction and lift drag). The game's hull already matches Savitsky's plate within 10–25 % (`carve-drag-study.md`).
- **The nose leaves the water, and with it the yaw resistance there.** A long wetted hull resists turning about its centre (each station's sideways speed is the yaw rate times its distance). A short wetted tail resists little, so the board pivots about the tail, where the fins are.

### Fins: lift, stall and the slide

- The game's fins (`src/physics/finForces.ts`): Helmbold's low-aspect lift slope, and stall at FIN_STALL 18°, blending to a flat plate with lift at 0.35 sin 2α, below the attached peak (separated, air-drawn flow loses grip while the drag rises).
- Falk et al. 2019 (a thruster set in CFD) find separation above about 20°; Surf Simply's write-up of that work: the flow is "complicated, with large turbulence and separated flow, around the stall angle of about 20°" ([Surf Simply](https://surfsimply.com/magazine/raking-the-surface)).
- MacNeill & Barkdoll 2025 ([PMC12024775](https://pmc.ncbi.nlm.nih.gov/articles/PMC12024775/)): the best lift-to-drag ratio near 10°; past 25° separation's drag is "excessive".
- Brandner & Walker (U. Melbourne, AFMC) tested an AR 3 swept foil standing for a surfboard fin and expect fins to run over a wide incidence range, stall included.
- **So "the fins let go" is in the physics already:** when the tail swings across its path faster than the board moves (the fin's attack ≈ atan of the sideways speed at the fin over the forward speed) past about 18°, the fins' grip falls and the tail slides. Nothing here is new.

### The coaching's body sequence

1. Come off a deep bottom turn, extend up the face (de Sousa's final phase: knees and hips extend, the weight goes back, the rail is released).
2. At the lip: the weight onto the back foot, 80/20 to 90/10 (Rapture); the back foot far back (Surfertoday).
3. The head and shoulders rotate toward the base of the wave first, as fast as possible (Rapture; de Sousa: the trunk rotates, the chest to the lip).
4. The tail pivots and the fins release; spray off the tail.
5. Centre the weight, re-engage the fins, compress to land.

---

## 2. Design: the mechanism in this game's model

### What Snap changes (held, standing; `AttachedRider`)

Each is a term the rider already has, set by the stance. No force is added to the board or the body.

| Term | Snap | Why (physical cause) | Source |
|---|---|---|---|
| The pressure the balance holds along the board (`copTarget.z`) | 0.15 of the load on the front foot (SNAP_PRESSURE 0.7 of half the stance back), held within 0.05 m (SNAP_FREEDOM) where the trim lets it wander 0.2 m | The rider drives the back foot; the hull trims nose up until its lift is under the load | Rapture 80/20–90/10 |
| The upper body's lean along the board | full back (TRIM_SHIFT), as full S | The hips over the back foot | as full S |
| The legs' rest (`leg.rest`) | down 0.15 m (SNAP_DEPTH 0.5 of CROUCH_DEPTH) | The back knee about 90°, the front leg about 30°: a lower load tips less forward under braking | the kick-out's and top turn's knee targets |
| The upper body's twist (`twist`, existing rotor, through the feet's grip) | toward the steer, up to its 45° | The shoulders turn first | Rapture; de Sousa 2022 |
| The lean the turn can hold (`TURN_RADIUS` in `prepareBank`) | 2.2 m (SNAP_RADIUS) in place of 4.5 m | The tail's rocker carves tighter than the whole rail | Forsyth 2024's cutback radius |
| The crouch, Compress and the trim held with it | ignored | Snap wins (the owner's default) | — |

What it does not change: the balance's gains (BANK_GAIN 7.4, BANK_RATE_GAIN 3.6), the feet's rule against rolling the board away from the lean, the rail's bite, the fins, the hull. Compress is untouched.

### Why the pivot turns faster and costs speed

- **Force:** the hull's pressure carries the load. With the load aft, the board trims nose up (measured 10–30° against 7–12° in a level carve) until the hull's lift is under the load: the wetted region is the rockered tail. Its pressure's backward share (Δ tan τ) is the speed lost; the climb's gravity adds to it on a face.
- **Moment:** the board's yaw is set by the wetted rail line (the carve's geometry). The tail's line curves more, and the short wetted hull resists yaw less, so for the same rail the board turns faster and its heading runs ahead of its path (drift, measured 10–35°). The fins are under the back foot; they see the tail's sideways speed over the board's forward speed. Past 18° they stall (`finForces`), and the tail slides (drift up to 50–100° when held into a stall).
- **The twist** spins the upper body into the turn; its reaction yaws the board out through the feet, held there by the fins and the water, and when the shoulders stop at their range the board is yawed in. Measured, it adds about 10–25° by 0.8 s (below).

### A/B switches

- `?snap=off`: Snap's input is ignored (the session's `snap` option). Online rooms pin to the default.
- No shared physics changes: every term above runs only while Snap is held (`snapping > 0`). With Snap at 0 every line computes what it did before (pinned by a byte-identity test).

### The bars

- Peak yaw rate 200–300°/s (US 9697743; Forsyth's 3.0 rad/s is a mean).
- 150–180° in well under a second (Forsyth's cutbacks: 152° in 0.96 s).
- The speed drops (no published number for a snap; Forsyth's turn flow 0.92 bounds a wave-fed turn).
- The fins let go when pushed too hard; the rider stays on when Snap is let go in time.
- Byte identity without Snap; the pinned `it.fails` reported, not loosened.

---

## 3. The plant (measured before building)

The probes (`probes/`): a standing rider (`AttachedRider` on `BoardBody`), full steer, on flat still water or the 15° plane face, climbing 150° from its fall line (the pinned snap's start) or across it at 80° (the pinned cutback's). Times are from the steer, which starts 0.2 s into each run; "at 0.8 s" is 0.8 s after the steer.

### Today's code: weight back (S) is already a pivot, and it stalls

| Case | Peak yaw | At 0.3 s | At 0.8 s | Speed at 0.8 s | Least speed | Most nose-up | Front share | Fell |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Climb 150°, 6.7 m/s, level | 174°/s | −7° | 38° | 3.6 | 1.3 | 40° | 0.73 | — |
| Climb 150°, 6.7 m/s, full S | 345°/s | −8° | 61° | 4.2 | 0.4 | 74° | 0.43 | — (150° at 1.13 s, sliding backward) |
| Climb 150°, 8 m/s, full S | 199°/s | −8° | 65° | 4.5 | 1.5 | 51° | 0.53 | — |
| Cutback 80°, 9 m/s, full S | 231°/s | 5° | −24° | 7.3 | 5.1 | 13° | 0.49 | 1.43 s |
| Flat, 7 m/s, full S | 150°/s | −7° | 33° | 5.8 | 4.1 | 19° | 0.52 | — |

- **The first 0.3 s turn the wrong way (6–9°).** The body must lean in, and to lean in the feet push the board out (the counter-steer; the entry study). This is the balance's 0.49 s lean time constant, the wall of the don't-retry list.
- Then the weight-back board pivots at 200–345°/s, faster the slower it goes, while it slows and the tail sinks: it ends in a stall-spin on the static face.

### Each part of Snap, measured (held 0.6 s, then let go with the steer still held)

| | Climb 150°, 6.7 m/s: at 0.8 s / peak | Climb 8 m/s | Flat 7 m/s | Cutback 7 m/s |
|---|---|---|---|---|
| **Snap** (pressure 0.7 in 0.05 m, depth 0.5, twist, radius 2.2 m) | 82° / 295°/s | 95° / 324°/s | 65° / 192°/s | −66° / 206°/s |
| without the twist | 58° / 226 | 83° / 286 | 54° / 182 | −52° / 165 |
| without the depth | 50° / 214 | 70° / 231 | 60° / 201 | −55° / 171 |
| with the trim's zone (0.2 m) | 82° / 295 | 94° / 321 | 53° / 136 | −56° / 180 |
| with the trim's radius (4.5 m) | 110° / 397, falls 1.3 s | 95° / 318 | 64° / 188 | −66° / 205 |
| pressure as full S (0.2) | 82° / 294 | 94° / 322 | 52° / 135 | −56° / 179 |

- The twist and the depth each add 10–25° by 0.8 s. The pressure target and its zone matter on flat water; on the climb the balance's reach (0.25 m) is already spent against the braking (the pressure reads 0.25–0.45 on the front foot, not 0.15: at 0.4 g of braking the load tips forward by H·d ≈ 0.3 m).
- **Rail first (the back foot rolling the tail onto the new rail ahead of the body) was tried as a probe and refuted again:** the yaw starts at once (14° by 0.3 s), but the board bogs (6.3 → 1.4 m/s in 0.7 s), the pressure goes to the nose (0.89–0.96 on the front foot) and the rider falls at 0.85–0.93 s. Not built.
- A steep face (25–45° plane faces, climbing nearly straight up) cannot be used: the upright rider placed there falls within 0.15 s, before any input.

### Straight on flat water, Snap held, no steer

From 7 m/s the board trims from 4° to 15–20° nose up within 0.5 s and slows at 0.3–0.5 g (0.15–0.2 g in level trim), 7 → 4.8 m/s in 0.8 s; the pressure settles at 0.25–0.3 on the front foot with the balance at its reach. The front foot is loaded for the first 0.15 s (0.88): moving the body back pushes the feet forward first.
