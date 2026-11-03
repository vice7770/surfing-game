# Snap: the fourth stance (2026-11-03)

Branch `claude/snap-stance` (from `origin/claude/playtest-1103b`: main 632f3f13 plus the pool tube case swap). Worktree `.claude/worktrees/canyon-beach-break`. No PR; the owner merges.

## Where it stands

- **Built** on `claude/snap-stance` (no PR; the owner merges):
  - **The physics** (`src/physics/AttachedRider.ts`: `snap`, SNAP_PRESSURE, SNAP_FREEDOM, SNAP_DEPTH, SNAP_RADIUS, the twist toward the steer). It does nothing unless Snap is held: a scripted ride reproduces the pre-snap code bit for bit (`snapStance.test.ts`).
  - **The input:** Q and RB, held, standing only; the camera moved from RB to R3; pad layout 4 with its migration (`Bindings.ts`, `Settings.ts`, `Controls.ts`); a touch button beside Compress (`index.html`, `App.ts`).
  - **The session and the switch:** `RideInput.snap`; `?snap=off` (`SurfZoneConfig.snap` → `RideSessionOptions.snap`); online rooms pin to the default (`main.ts`). The pocket reflex stands aside while Snap is held.
  - **The UI:** the Controls help line, a Practice hint after Compress's (`hints.ts`), the HUD's stance readout ("Snap", the weight dot on the tail).
  - **Drawn and online:** no new drawing; the drawn body reads the physics (below). No wire change.
  - **Dev:** the character sheet's `?motion=snap` and `?motion=snap-backside` films (flat water, 8 m/s, Snap 0.6 s).
- **Measured** (section 4): peaks of 192–324°/s; 150° at 1.07 s off the climb; the speed drops; the fins let go when held on; the pinned turns still fail (section 5).
- **Tests:** all green (section 6): tsc clean; the main suite 3,026 passed, 23 expected fails (3 new pins), 0 failed; the Wave Pool subset 36 passed.

## Next steps

1. The owner's ride (the shot list, section 7).
2. If the snap's spray needs a bigger fan than the existing board spray throws, that is a shape change for the water-physics advisor (section 4, the spray).
3. Open physics (the owner's call): the deep U's root (a bottom turn carried up into the snap still falls), the lean-in's first 0.3 s, and the static face giving nothing back.

## How to verify

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- `npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts --maxWorkers=3 -t "[Pp]ool|[Bb]arrel|[Tt]ube|[Pp]adang|[Rr]oller|[Bb]oard|[Rr]ider"`.
- Snap's own tests: `npx vitest run src/physics/snapStance.test.ts` (byte identity, `?snap=off`, precedence, the physics, and the pinned turns with Snap).
- The probes in `probes/` measure the tables: copy `snapLab.ts` to `src/physics/zz-snapLab.ts` and a `zz-*.test.ts` beside it, run it with `OUT=<file.json>`, then `python3 probes/show.py <file.json>`. Delete the copies afterwards (they are not part of the suite). `report.json` and `report-order.json` are section 4's raw rows.
- The byte-identity hash (`BEFORE_SNAP` in `snapStance.test.ts`) was measured by swapping in 4eee1e5f's `AttachedRider.ts` and `RideSession.ts`.

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

---

## 4. Measured (headless, the probes; Snap held 0.6 s and let go, the steer held on)

Times are from the steer. "Kept" is the speed over the speed at the steer. Still water and the 15° plane face give nothing back: on a wave the face's gravity and the water's own motion feed the climb.

### Against the targets

| | Target | Snap | The steer alone | Full S (today's weight back) |
|---|---|---|---|---|
| Peak yaw rate, the climb 150° at 6.7 / 8 m/s | 200–300°/s (US 9697743; Forsyth's 3.0 rad/s is a mean) | **295 / 324°/s** | 174 / 133 | 345 / 199 |
| Peak yaw rate, flat water at 7 / 9 m/s | | 192 / 154°/s | 115 / 98 | — |
| Heading, the climb at 6.7 m/s | 150–180° in well under 1 s (Forsyth: 152° in 0.96 s) | **80° at 0.8 s, 136° at 1.0 s, 150° at 1.07 s** | 36°, 44°, never | 60°, 109°, 1.15 s |
| Heading, the climb at 8 m/s | | 94° at 0.8 s, 124° at 1.0 s (120° at 0.98 s) | 34°, 50° | 64°, 82° |
| Heading, flat water at 7 m/s | | 65° at 0.8 s; let go, the fins grip and the heading comes back 55° to the path | 27° | — |
| Speed kept at 0.8 s, flat water 7 / 9 m/s | drops (no published snap number; Forsyth's wave-fed turn flow 0.92 bounds it) | **0.55 / 0.74** | 0.89 / 0.91 (Compress: 1.00 / 0.98, its carry) | — |
| Speed kept, the climb at 6.7 m/s | | 0.67 at 0.8 s, 0.08 at the apex | 0.58, 0.20 | 0.68, 0.06 |
| The fins let go | when pushed too hard | held on (flat 7 m/s): the centre fin's attack to 90°, the board sliding 106° off its path; let go at 0.6 s: 49°, 51° | 3°, 7° | — |
| Stays on, let go in time | yes | the climb at 6.7: on; flat 7 and 9: on; the climb at 8: falls at 1.15 s | on | on |
| Stays on, held on | the physics decides | the climbs: falls at 1.27–1.28 s (stalled, sliding); flat: on, sliding | — | — |

- **The rates meet the target, and the turn off the climb comes within about 0.1 s of Forsyth's** (150° at 1.07 s against 152° in 0.96 s). Its first 0.3 s still turn the wrong way (8–12°): the body leans in first (the balance's 0.49 s time constant, the don't-retry wall).
- **The speed drops:** on still water at 7 m/s it costs about 1.7 times a carve's speed per degree turned (0.45 of the speed for 65° against 0.11 for 27°), where Compress, fed by its gameplay carry, keeps all of it.
- **Off the climb the snap keeps more speed at 0.8 s than the steer alone,** because it turns back down sooner; then it stalls at the apex (the static face). On a wave the face feeds it.
- **Held on, the fins let go** past their 18° stall and the board slides (drift to 106–179°), and on a climb the rider falls about 1.3 s in. Nothing scripts it.

### The cutback (80° across the 15° face)

| | 7 m/s | 9 m/s |
|---|---|---|
| The steer alone | −42° by 1 s, falls 1.30 s | −40°, falls 1.38 s |
| Snap from the steer | −52°, peak 206°/s, falls 1.53 s | −27°, falls 1.75 s |
| A carve 0.4 s, then Snap 0.6 s | **−93° by 1 s, −145° at the end, peak 255°/s**, falls 1.25 s | −76°, peak 178°/s, falls 1.77 s |
| Snap held | −67°, falls 1.58 s | −39°, falls 1.72 s |

Every cutback on the static face falls (the pinned cutback's root: the board, climbing a face that gives nothing back, slows off the plane). Snap taken in the carve turns it about twice as far by 1 s before the fall.

### In surfing order (a compressed bottom turn from 90° across to 120° from the fall line, then the turn back)

| | 8 m/s | 9 m/s | 10 m/s |
|---|---|---|---|
| The bottom turn | 0.62 s, 127°/s peak, kept 0.91 | 0.68 s, 125°/s, 0.88 | 0.73 s, 137°/s, 0.87 |
| Steer back | −24° (carried on), falls 0.83 s | −32°, 0.83 s | −31°, 0.97 s |
| Snap 0.6 s with the steer back | −43°, falls 0.95 s | **+30°**, back to 91° from the fall line, falls 1.17 s | **+32°**, 88°, falls 1.45 s |
| A neutral 0.3 s, then Snap | −44°, 0.87 s | −63°, 0.90 s | −82°, 1.18 s |
| Snap, the steer 0.2 s after it | −96°, 1.02 s | −32°, 1.07 s | **+102°, back to 18°**, falls 1.97 s |

- **The deep U's root holds:** the body still leans into the bottom turn, and Snap pivots the board on the rail it is on, the old one. At 9–10 m/s Snap reverses the carry-on (the board turns back the new way), but the rider still falls 1.2–2 s later.

### The spray (the existing board spray, `boardSpray.ts`, fed by the hull's drift)

| | Peak flux | Mean flux | The sheet's fastest rise |
|---|---:|---:|---:|
| Flat 7 m/s: carve / Snap 0.6 s | 93 / 75 | 48 / 33 | 3.0 / **4.6 m/s** |
| Flat 9 m/s: carve / Snap 0.6 s | 126 / 124 | 69 / 43 | 3.3 / **5.6 m/s** |
| The climb at 8 m/s: steer / Snap 0.6 s | 22 / 40 | 10 / 9 | 3.3 / 3.6 m/s |

The spray answers the snap with no new code: the drift turns the trim into the tail's jet, which leaves 50–70 % faster upward. It throws less water than a fast carve because the board slows. A bigger fan off the tail would be a shape change: the advisor's call, noted for the owner.

### The drawn body (`stageBlend.ts`, read from the physics' points and motion, so online alike)

Read from a snap climbing the 15° face (the probe `zz-snapDrawn.test.ts`), frontside and backside alike: the weight on the back foot (`back` 1.0 from 0.2 s into the snap), the redirect pose in full by 0.3 s, the low pelvis (`depth` 0.2), and, climbing nose-up and slowing, the kick-out's pose (front leg long, back knee bent, arms out). On flat water (the sheet's films) the kick-out's pose stays out: it needs the climb. The shoulders turn with the twist (the local surfer's `twist`); another player's surfer turns its chest with the yaw rate (the twist is not on the wire). No wire change: older clients draw a snapping surfer from the points as they draw any other.

## 5. The pinned `it.fails`

| Pin | Today | With Snap |
|---|---|---|
| The snap (the climb, 150° in 1 s) | 61° by 0.8 s with full S | **136° at 1 s, 150° at 1.07 s**: short by 0.07 s (`snapStance.test.ts`, pinned) |
| The cutback (80°, 9 m/s, 150° in 2 s, on) | 74°, falls | −76° (a carve then Snap), falls 1.77 s (pinned) |
| A bottom turn carried into a top turn | falls 0.8–1 s | turns back at 9–10 m/s but falls 1.2–2 s later (pinned) |
| The hard turn (60° in 1.2 s keeping 0.7) | 52° | not Snap's: it sheds speed by design |
| Compress mid-turn at 11 m/s | unchanged | unchanged |

None turns into a pass. The two roots are unchanged: the balance's lean-in (0.3 s the wrong way) and a face that gives nothing back.

## 6. Tests

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- The main suite (`--maxWorkers=3`, without `SurfZoneSimulation` and `SurfZoneRunner`): **316 files passed (31 skipped); 3,026 tests passed, 23 expected fails (3 of them Snap's new pins), 37 skipped, 0 failed** (580 s on the M1 Air, beside another session's run).
- The Wave Pool subset of `SurfZoneSimulation.test.ts` (`-t "[Pp]ool|[Bb]arrel|[Tt]ube|[Pp]adang|[Rr]oller|[Bb]oard|[Rr]ider"`): **36 passed, 68 filtered out, 0 failed** (7,500 s beside another session's run).
- New: `src/physics/snapStance.test.ts` (12: byte identity against the pre-snap code, Snap at 0 and absent alike, `?snap=off`, nothing lying down, precedence over the crouch, Compress and the trim, the slowing straight, the pivot off the climb, the speed shed on still water, the fins letting go held on; and three pinned `it.fails`); Snap's cases in `Bindings.test.ts`, `Settings.test.ts` (the layout 4 migration: moved once, the player's own choices kept, unbound where taken), `Controls.test.ts`, `hints.test.ts`, `pocketReflex.test.ts`, `PhysicalMode.test.ts` (`?snap=off`, online pinned), `RideHud.test.ts`, `settingsModel.test.ts`.
- Updated because the owner moved the camera to R3: `Bindings.test.ts` (R3 is the camera's), `settingsModel.test.ts` (a call rebound to L5 in place of R3; eighteen actions), `Settings.test.ts` (the layout is 4).

## 7. The owner's shot list

1. **The Wave Pool, the Training wave, the chase camera, a right (frontside for a regular foot).** Drop crouched (Shift), Compress (Space / RT) and lean at the base for the bottom turn, let go climbing, and at the top hold **Q (RB)** with a **full steer** back down for about half a second, then let go. *Feel and see:* the hips drop over the back foot, the back knee bends, the nose lifts and the board pivots on its tail (a fast heading change, 200–300°/s at its peak), the speed falls away, a sheet of spray leaves the tail higher than a carve's, and the shoulders turn first. Let go, the fins grip again and the board comes down the face.
2. **The same, holding Q too long at the lip.** *See:* the tail slides out (the fins let go), the board stalls nose-up, and you fall about 1.3 s in.
3. **The same, Q without steering.** *See:* the board sits back on its tail and slows (a kick-out-like stall).
4. **The Canyon (a beach peak), the same sequence, frontside and backside.** Then a **cutback** from the shoulder: carve back toward the curl and take Q in the carve. *Feel:* the cutback tightens and slows.
5. **The A/B:** the same rides with **`?snap=off`** in the address bar: Q and RB do nothing, and every ride is as before.
6. **The camera** is on **R3** (the right-stick click) now; RB is Snap. A saved pad layout moves itself once.
7. **Touch:** the Snap button beside Compress, standing.

