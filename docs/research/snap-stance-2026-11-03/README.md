# Snap: the fourth stance (2026-11-03; round 2 2026-11-04)

Round 1: branch `claude/snap-stance`, merged as PR #186. Round 2: branch `claude/snap-load` (from main 60451f1e), worktree `.claude/worktrees/canyon-beach-break`. No PR; the owner merges.

## Where it stands (round 2)

- **The owner's round-1 ride:** "doesn't even turn or move deeply. just stays standing and the board moves by itself. The rider falls after." Diagnosed with numbers in **Round 2** below.
- **Built on `claude/snap-load`:**
  - d49c1c87 (the stopped agent's): the legs load as deep (0.3 m) and as fast as Compress; the shoulders wound toward where the turn ends (`snapAim`); the dev films carry the twist.
  - b15ce8af (this round's fix): **the hips over the back foot, not behind it.** Snap no longer leans the upper body back as full S does (`AttachedRider.balanceStep`). That lean put the centre of mass 0.14 m behind the back foot. Under braking it made the board pivot nose-up about the rider, run 60–70° off its path and spin back 100° when let go, and the drawn crouch read half its depth.
- **Measured** (Round 2, R2.4): the drawn crouch reads 0.80–0.82 of Compress's full depth, against 0.10–0.13 in round 1 and 0.53–0.55 at d49c1c87. On still water the rider no longer falls with the keys' input (0 of 6 falls; d49c1c87: 5 of 6). Off a climb Snap turns twice as far as the steer alone, with no falls (round 1 and d49c1c87 fell in 2–3 of 4).
- **Not solved: the two moves back to back.** A bottom turn up a face followed by a turn back down falls for every stance, Snap's included: 0 of 8 with Snap, 0 of 8 steering alone, 2 of 8 with Compress (which has its gameplay lean-out pull). R2.3 explains the physics and gives the owner's options.
- **Tests:** tsc clean; the main suite 3,030 passed, 23 expected fails, 0 failed; the Wave Pool subset 36 passed (R2.6).

## Next steps

1. The owner rides round 2 (the shot list, R2.7).
2. **The owner's decision on the two moves** (R2.3): (a) leave it, and accept that the top move works from an upright climb but not straight out of a leaning bottom turn; (b) let Snap borrow Compress's lean-out pull, a gameplay rule; measured in a probe, it brought 4 of 8 snaps back down the face, all falling 1.5–2 s later; (c) the physical fix: give the body its own yaw, so that the board can pivot under a lean that stays put in the world (a solver change).
3. Still open from round 1: the lean-in's first 0.3 s (the wall on the don't-retry list), the spray's fan (the water-physics advisor), and the static face giving nothing back.

## How to verify

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- `npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts --maxWorkers=3 -t "[Pp]ool|[Bb]arrel|[Tt]ube|[Pp]adang|[Rr]oller|[Bb]oard|[Rr]ider"`.
- Snap's own tests: `npx vitest run src/physics/snapStance.test.ts`. They cover byte identity, `?snap=off`, precedence, the physics including round 2's back-foot, fins-held and no-spin-back tests, and the pinned turns. The new tests fail on d49c1c87: 4 of 13.
- Round 2's probes (`probes/round2/`):
  1. Copy `zz-r2Lab.ts` and a `zz-r2*.test.ts` into `src/physics/`.
  2. Run with `OUT=<file>`:
     - `zz-r2Diag` with `CASE=load|flat|climb|two`. `RAMP=0` gives the pad's instant input; the default 0.2 s ramp is the keys'. `TRACE=1` adds per-frame rows.
     - `zz-r2Drawn` measures the drawn body (the GLB rig, the stance gauge).
     - `zz-r2Values` gives the values the tests assert.
     - `zz-r2Com` gives the centre of mass over the back foot.
  3. `python3 probes/round2/table.py round1-60451f1e round2-d49c1c87 round2-final` prints the three versions side by side from `probes/round2/data/`.
  4. Delete the copies afterwards: `src/**/zz-*.test.ts` is git-excluded, but `zz-r2Lab.ts` is not.
- The byte-identity hash (`BEFORE_SNAP`) is unchanged: every round-2 term runs only while Snap is held.

---

## Round 2 (2026-11-04)

The owner rode round 1 and tried both moves of the reference clip back to back (Surfers of Bali, "Snap In The Lip Over Shallow Reef"):
1. At the bottom, take the stance and turn up the face.
2. At the top, take it again and turn sharply back.

Verdict: "doesn't even turn or move deeply. just stays standing and the board moves by itself. The rider falls after ... the rider should load itself ready for the movement like the other stances".

All numbers below are headless (`probes/round2/`, data in `probes/round2/data/`), with no browser pane. Three versions are compared:
- round 1 (60451f1e);
- d49c1c87 (the first round-2 commit: the legs as deep and fast as Compress, the shoulders aimed at the turn's end);
- round 2's final (b15ce8af: the hips over the back foot).

Inputs ramp over 0.2 s as the keys do (`InputAxes`) unless marked "pad".

### R2.1 Diagnosis

**"Just stands".**

| Snap taken riding straight, 8 m/s, still water | round 1 | d49c1c87 | round 2 | Compress | the pumping crouch |
|---|---|---|---|---|---|
| The legs (physics, the centre of mass's drop) at 0.3 / 0.5 / 0.7 s | 0.09 / 0.14 / 0.15 m | 0.11 / 0.23 / 0.29 m | 0.11 / 0.23 / 0.29 m | 0.11 / 0.23 / 0.29 m | 0.11 / 0.19 / 0.20 m |
| The front foot's share of the load at 1 s | 0.24 | 0.21 | 0.40 | 0.69 | — |
| Board pitch, nose up, at 1 s | 19° | 21° | 14° | 11° | 10° |
| **Drawn** at 0.9 s, no steer / full steer: how deep the drawn crouch reads (`stanceBlend.depth`, Compress's full depth 1) | **0.10 / 0.13** | 0.53 / 0.55 | **0.82 / 0.80** | 0.98 | 0.67 |
| Drawn: the pelvis's drop over the back foot, level | **0.04 / 0.16 m** | 0.17 / 0.26 m | 0.21 / 0.28 m | 0.22 m | 0.14 m |
| Drawn: the hips over the back foot, level (+ ahead of it) | −0.17 / −0.16 m | −0.15 / −0.15 m | **+0.07 / +0.06 m** | +0.29 m | +0.28 m |
| Drawn: back knee / front knee | 111° / 153° (79° / 125°) | 86° / 117° (62° / 105°) | 76° / 90° (63° / 85°) | 75° / 72° | 90° / 88° |
| Drawn: head yaw / chest twist, full steer (90 / 29 riding straight) | 168 / 83 | 165 / 86 | 167 / 87 | — | — |

- **Round 1 really did just stand.** Its legs went down only 0.15 m, and the upper body leaned 0.25 m back as full S does. The hips ended up 0.17 m behind the back foot on a board pitched 19° nose up. The back foot sank with the tail and the front foot rose with the nose, so the drawn pelvis came down only 4 cm over the back foot. The front leg stayed straight (153°) and the crouch read 0.10 of its depth.
- d49c1c87 doubled the depth, but kept the lean back: the drawn crouch read half.
- In round 2 the hips sit over the back foot. The crouch reads 0.8, the back knee closes to 63–76° (the target was 90° or less), and the front leg is bent, not braced.
- The head and shoulders were already wound toward the turn in every version: the head turns about 75°, the chest about 58°.

**"The board moves by itself".** Still water, 7 m/s, Snap and a full steer for 0.6 s, then Snap let go with the steer held (d49c1c87; round 1 alike):
- The shoulders wind first: −21° by 0.3 s, −36° by 0.5 s.
- Then the board pivots at 160–240°/s about the rider standing over its tail.
- The rider's own path (the centre of mass's velocity) turns only about 30°/s. The bank reaches −30° against the −50° the balance asks for, which is the balance's lean-in time.
- By 0.8 s the heading has turned 70° and the rider's path 24°. The board's heading runs 60–70° off the system's path, the nose is up 26–47°, the centre fin's attack is 45–85° (stalled), and the speed falls from 7.2 to 0.2 m/s.
- Let go, the fins weathervane the board back +100° the other way, and the rider falls ("lost board", 1.85 s).
- **Cause:** the lean back past the back foot made the board pivot under a body whose path cannot follow. The path is limited by the lean, and the lean by the balance's ~0.5 s lean-in. The board spins under the rider.
- In round 2 the same run turns −119° by 2 s, and the rider's path turns −111° with it. The heading stays within 24° of the path, the nose comes up 28° at most, and the rider stays on.

**"Falls after", the two moves.** The owner's sequence, headless:
- Setups: the static 15° plane at 8/9/10 m/s along it; a moving analytic face (`FaceWater`) 1.2 m high at 20° at 7/8/9 m/s from a quarter up it heading 45° from the fall line; the Wave Pool's size, 0.85 m at 14° (4.7 m/s crest), at 7/8 m/s.
- The moves: the stance and a full steer up for 0.8 s, 0.15 s neutral, then the stance and a full steer back down for 0.8 s.
- Every stance falls (R2.4). Two causes stack up:
  1. **The deep U's root (all stances).** Move 1 ends with the body banked 37–42° into the bottom turn, while the board heads only 85–100° from the fall line, along the face, not up it. On a face, the rail's angle to the water is the body's lean plus the face's tilt, so the rail sits 55–60° into the face, past its 48° bite (RAIL_BITE, read against the water).
     - The feet's room to roll the board further and bring the body back up (the counter-steer) closes.
     - The upper body's swing is already spent braking the lean-in, and hits its 69° range within 0.3 s.
     - With the steer reversed or let go, nothing brings the body up, and it falls into the old turn (bank −70°) within 0.3–0.6 s.
     - It happens even for a bottom turn followed by a neutral steer: 30 of 45 such runs fell before any second move, the rider carried over the top of the face. In the two-move runs Compress stays on in 2 of 8, with its gameplay lean-out pull.
  2. **Snap's own (round 1, d49c1c87): the stall-spin above.** On the static plane, d49c1c87's second move pivoted the board 85–95° back, with drift 55–113°, the nose up 63°, and a fall.

### R2.2 The change (physics only)

- **The hips over the back foot, not behind it** (`balanceStep`: while Snap is held the upper body stays over the hips; full S keeps its TRIM_SHIFT). The pressure target still asks 85/15 on the back foot (Rapture: 80/20–90/10 at the lip), held within 0.05 m, and the balance's reach (0.25 m) carries the hips over the back foot.
- Under the board's braking (0.3–0.4 g) the load tips forward by the height times the deceleration. The feet then feel 0.40–0.47 of the load on the front foot riding straight, and 0.43 turning: the most the hips over the back foot give against the braking. Getting 85/15 under that braking takes the centre of mass about 0.2 m behind the back foot. That posture is the stall (the kick-out's), and it was the runaway: the further back, the more nose-up, the more braking.
- Sources:
  - the owner ("the hips low over the back foot");
  - Rapture (the weight on the back foot is the feet's pressure);
  - the coaching's sequence ("centre the weight, re-engage the fins": the fins must keep working);
  - the physics measured above.
- Kept from d49c1c87:
  - the depth: SNAP_DEPTH 1, 0.3 m, as fast as Compress, extending as Compress does when let go;
  - the shoulders' aim (`snapAim`);
  - SNAP_RADIUS 2.2 m;
  - SNAP_PRESSURE and SNAP_FREEDOM.
- The dev film's comment (`characterSheet.ts`, `snap-long`) carries the new numbers.

### R2.3 The two moves: why they still fall, physically

- The top move works when it starts from a climb with the body upright: from 150° or 120° up the static face, Snap turns twice as far as the steer alone, with no falls (R2.4).
- What fails is reversing straight out of a bottom turn's lean. In this model:
  1. **The lean is held in the board's frame.** The rider's centre of mass is carried rigidly with the board (`coupleStanding`); the body's bank is a roll about the board's heading.
     - In a real snap the board pivots under a body whose lean stays put in the world. After a pivot of 90° or more, the old lean (toward the bottom turn's centre) lies on the new turn's inside: the pivot itself changes the rails.
     - Here the lean turns with the board, so after any pivot the body still leans to the old side.
  2. **The counter-steer is blocked on a face.** Bringing the body up from 40° of lean needs the board rolled further onto the old rail. Climbing a 15–20° face, that rail is already past its bite against the water.
  3. **The swing's range is spent.** The upper body's swing is a rotor with a 69° range, and its momentum is used up braking the lean-in.
- Compress gets out of this only through its gameplay lean-out pull. Snap, physics only, has no way out.
- **Tried and rejected in round 2:**
  - Letting the board's yaw not carry the centre of mass round the feet (a 'yaw slip' in the solve) while Snap is held: the board did not pivot toward the new turn at all, because the old rail kept carving.
  - Easing the snap's radius or its tail weight out over 0.3–0.6 s after letting go.
  - Dropping the projection (the extension) when Snap is let go.
  - Each of these left the falls as they were or made them worse.
  - Snap borrowing Compress's lean-out pull (a gameplay rule, probe only): 4 of 8 snaps came back down the face (to 0–41° from the fall line), all falling 1.5–2 s later.
- **The physical fix** would give the body its own yaw against the board (the legs' and hips' rotation, limited and torque-coupled): the board pivots under a lean that stays in the world. It is a change to the 8-unknown standing solve, and the owner's call (Next steps 2c).

### R2.4 Measured: round 1, d49c1c87 and round 2

**The bottom move** (the trough, still water): the stance and a full steer for 0.6 s, then let go with the steer held on. Values are 7 m/s / 9 m/s.

| | Turned by 0.8 s | Peak | By 2 s (board / rider's path) | Speed kept at 0.8 s / 2 s | Heading off path, most | Nose up, most | Falls |
|---|---|---|---|---|---|---|---|
| The steer alone | −24° / −20° | 115 / 99°/s | −118° / −102° | 0.88 / 0.38; 0.91 / 0.57 | 25° / 11° | 20° / 13° | — |
| Compress (gameplay pull and carry) | −54° / −33° | 146 / 111°/s | −135° / −104° | 0.99 / 0.48; 0.94 / 0.69 | 16° / 7° | 18° / 12° | — |
| Snap, round 1 | −75° / −38° | 269 / 129°/s | **+23°** (rider −37°) / −68° | 0.51 / 0.05; 0.72 / 0.51 | 69° / 9° | 43° / 18° | 1.80 s / — |
| Snap, d49c1c87 | −70° / −45° | 242 / 148°/s | **+31°** (rider −34°) / −73° | 0.53 / 0.04; 0.74 / 0.75 | 68° / 27° | 47° / 21° | 1.85 s / 1.85 s |
| **Snap, round 2** | −44° / −29° | 123 / 148°/s | **−119° (rider −111°) / −119°** | 0.76 / 0.31; 0.83 / 0.55 | 24° / 12° | 28° / 16° | **—** |

- The shoulders lead the board by 39–43° in every Snap.
- **Falls** over 12 runs each (7 and 9 m/s; the steer held, eased to half, or let go with Snap; keys or pad): round 2 3 of 12, all with the pad's instant input; d49c1c87 10 of 12.
- The dev film (`snap-long`, pad, 8 m/s): d49c1c87 slowed to 4.2 m/s, turned 56° and fell at 1.9 s; round 2 slows to 5.9 m/s, turns 90° and stays on.

**The top move** (the static 15° face, climbing 150° or 120° from the fall line): the stance and a full steer back down for 0.6 s, the steer held. Each cell gives the heading by 1 s, the speed kept at 1.4 s and any fall.

| | 150°, 6.7 m/s | 150°, 8 m/s | 120°, 6.7 m/s | 120°, 8 m/s |
|---|---|---|---|---|
| The steer alone | 42°, 0.20 | 46°, 0.33 | 37°, 0.48 | 36°, 0.58 |
| Compress | 80°, 0.37 | 84°, 0.64 | 52°, 0.72 | 50°, 0.81 |
| Snap, round 1 | 112° (150° at 1.18 s), 0.24 | 130°, 0.04, **falls 1.35 s** | 156°, 0.08, **falls 1.27 s** | 66°, 0.21, **falls 1.48 s** |
| Snap, d49c1c87 | 124° (150° at 1.15 s), 0.18, sliding (heading 143° off path) | 144°, 0.10, **falls 1.37 s** | 150°, 0.28, **falls 1.37 s** | 63°, 0.56 |
| **Snap, round 2** | **89°, 0.20** | **62°, 0.40** | **62°, 0.42** | **43°, 0.60** |

Round 2's top move:
- it turns 1.2–2.1 times as far by 1 s as the steer alone, at the steer's or a greater speed cost, and never falls;
- it is weaker than Compress's gameplay-assisted turn in two of the four cases;
- its peak yaw rate is 144–214°/s.

The earlier versions pivoted further, but by sliding: the heading ran up to 180° off the path. The board stalled and the rider fell in 2–3 of 4.

**The two moves back to back** (the plane at 8/9/10 m/s, the 1.2 m moving face at 7/8/9 m/s, the 0.85 m moving face at 7/8 m/s; R2.1's setup). Riders on through the whole sequence:

| | round 1 | d49c1c87 | round 2 |
|---|---|---|---|
| Steer, then steer back | 0 of 8 | 0 of 8 | 0 of 8 |
| Compress, then Compress | 2 of 8 (the 0.85 m face) | 2 of 8 | 2 of 8 |
| Snap, then Snap | 0 of 8 | 0 of 8 | 0 of 8 |
| Snap's first move (the bottom turn up the face) | −23° to −64° in 0.8 s | −24° to −64° | −23° to −50° (steer −17° to −31°, Compress −30° to −42°) |

The falls are R2.1's deep U.

### R2.5 Coaching check

- de Sousa 2022's final phase of the bottom turn, which leads into the snap: knee and hip extension, the weight to the back foot, the rail released, the trunk rotating.
  - Round 2 loads and lets go as Compress does: deep, then the projection.
  - The weight goes to the back foot with the hips over it.
  - The trunk rotates first.
  - What the model cannot do is release the rail out of a deep lean on a face (R2.3).
- Rapture's snap:
  - the weight 80/20–90/10 on the back foot: round 2 holds 85/15 when not braking, and 57/43 against the board's braking;
  - the head and shoulders rotating first: yes, by about 75° and 58°;
  - the fins releasing and the tail sliding: no longer while the rider is on, in round 2 (held on at 7 m/s, the centre fin's attack stays within 7°). The spray comes from the 12–24° of drift that is left;
  - centre the weight and re-engage the fins: yes, the board carries on round.

### R2.6 Tests

- `snapStance.test.ts` rewritten to round 2's physics (the numbers are in each test's comment):
  - the weight on the tail: 0.43 on the front foot, against Compress's 0.70 and S's 0.49;
  - the straight run slowing nose-up;
  - the centre of mass over the back foot, not behind it (new);
  - the climb turning twice as far as the steer, the rider on;
  - the trough turn: sharper than the steer, as far as Compress, peaking 50°/s past both, costing speed;
  - more speed shed than a carve;
  - held on: the fins kept, slowing toward a stall, the rider on (this replaced "the fins let go");
  - let go: carrying on round, not spinning back (new).
- The pinned `it.fails` still fail.
- On d49c1c87's code 4 of the 13 fail: the back foot, the climb, the fins and the spin-back.
- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- The main suite (`--maxWorkers=3`, without `SurfZoneSimulation` and `SurfZoneRunner`): **316 files passed (31 skipped); 3,030 tests passed, 23 expected fails, 37 skipped, 0 failed** (415 s).
- The Wave Pool subset of `SurfZoneSimulation.test.ts` (`-t "[Pp]ool|[Bb]arrel|[Tt]ube|[Pp]adang|[Rr]oller|[Bb]oard|[Rr]ider"`): **36 passed, 68 filtered out, 0 failed** (6,102 s).

### R2.7 The owner's shot list (round 2)

1. **Wave Pool, the Training wave, chase camera, a right (frontside for a regular foot).**
   - Drop, and at the bottom hold **Q (R1)** with a **full steer toward the wave** for about half a second, then let go of Q.
   - *See:* the rider sinks at once into a deep crouch: the hips over the back foot, the back knee well bent, the front leg bent too, not braced straight. The head and shoulders turn toward the top of the wave before the board does, the board comes round under them, and the nose lifts a little.
   - *Feel:* a turn about as sharp as Compress's, more than steering alone, that costs speed.
   - Let go: the rider rises as after Compress, and the board carries on up the face. It does not spin back the other way.
2. **The same, then at the top:** hold Q again with a **full steer back down**.
   - From an upright climb, *see* the shoulders lead and the board come round twice as far as steering alone, slowing hard.
   - **Expect a fall if the bottom turn is still leaning when you reverse.** That is R2.3 (it happens with steering alone too, and with Compress in most cases). Try it both ways: straight out of the bottom turn, and after letting the board run straight up the face for a moment.
   - Tell us which it was.
3. **The Canyon, the same two moves, frontside and backside.**
4. **Hold Q too long at the bottom.** *See:* the board keeps slowing toward a stall with its fins under it and the rider stays on; it does not spin. On a pad (instant input), letting go of a full steer instantly at low speed can still throw you into the turn.
5. **A/B:** the same rides with **`?snap=off`**: Q and R1 do nothing.

---

# Round 1 (2026-11-03, PR #186)

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

## 7. The owner's shot list (round 1; superseded by R2.7)

1. **The Wave Pool, the Training wave, the chase camera, a right (frontside for a regular foot).** Drop crouched (Shift), Compress (Space / RT) and lean at the base for the bottom turn, let go climbing, and at the top hold **Q (RB)** with a **full steer** back down for about half a second, then let go. *Feel and see:* the hips drop over the back foot, the back knee bends, the nose lifts and the board pivots on its tail (a fast heading change, 200–300°/s at its peak), the speed falls away, a sheet of spray leaves the tail higher than a carve's, and the shoulders turn first. Let go, the fins grip again and the board comes down the face.
2. **The same, holding Q too long at the lip.** *See:* the tail slides out (the fins let go), the board stalls nose-up, and you fall about 1.3 s in.
3. **The same, Q without steering.** *See:* the board sits back on its tail and slows (a kick-out-like stall).
4. **The Canyon (a beach peak), the same sequence, frontside and backside.** Then a **cutback** from the shoulder: carve back toward the curl and take Q in the carve. *Feel:* the cutback tightens and slows.
5. **The A/B:** the same rides with **`?snap=off`** in the address bar: Q and RB do nothing, and every ride is as before.
6. **The camera** is on **R3** (the right-stick click) now; RB is Snap. A saved pad layout moves itself once.
7. **Touch:** the Snap button beside Compress, standing.

