# Animation Realism Plan (the rider's stages, stances and motion)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan phase by phase. Steps use checkbox (`- [ ]`) syntax for tracking. **Build nothing until the owner approves this plan.**

**Status:** approved by the owner on 2026-10-22 ("all recommended" on §10, now decided). Phase 0 (this plan, the dev view `character-sheet.html?realism`, the stance sheet's stills) on `claude/animation-plan`. **Phase 1 built** on `claude/anim-p1` (from `main` at fade7dd2), awaiting the owner's ride check: see §8, phase 1, "Built". **Phase 2 built** on `claude/anim-p2` (from `claude/playtest-2026-10-22f`, 052337d2), awaiting the owner's ride check: see §8, phase 2, "Built". **Phase 3 built** on `claude/anim-p3` (from `main` at e445f06b, phases 1 and 2 in), awaiting the owner's ride check: see §8, phase 3, "Built". **Phase 4 built** on `claude/anim-p4` (from `main` at 90ef34a1, phases 1 to 3 in), awaiting the owner's ride check: see §8, phase 4, "Built".

**The ask (owner, 2026-10-22):** "All movements need to be more realistic, right now a bit too random. All stages need proper animation; transitions are not so bad, but the stances are incorrect."

**Goal:** every stage of a ride, from sitting in the lineup to climbing back on after a wipeout, drawn in a correct, sourced pose, frontside and backside. Every movement must trace to a named cause. The ride's feel stays exactly as it is.

**Architecture, in one line:** authored key poses per stage, taken from real references, blended by a stage reader that works off the drawn state. The physics-driven body moves them only for named causes, and a motion filter keeps the board's fast wobble in the legs. All of it lives in the drawing layer (`src/scene/rig/`), so the physics, the controls and the wire stay as they are. One wire bit is asked for in phase 4.

**The phases (in order of visibility, as decided):**

| Phase | What | Visible change |
|---|---|---|
| 0 (this branch) | The plan, the stance sheet, `?realism` | none in the game |
| 1 | Riding stance (trim frontside/backside, the drop), the global stance numbers and the **motion filter** | the "random" look goes: the chest is calm, the arms are low and still, the knees are bent with the rear knee in |
| 2 | Turns and riding moves, each with its own frontside and backside pose: bottom turn, top turn, cutback, pump, the tube (grab-rail, pig-dog) and the kick-out over the back | turns read as surfing: the head leads, the lead arm points, the arms stay close |
| 3 | The take-off and the water: pop-up push and landing, paddling, **the catch**, **the lineup sit**, the duck-dive check, the prone kick-out | the pop-up lands planted; idle riders sit up |
| 4 | Falls and recovery: protective reflexes over the ragdoll, a shape for each cause, surfacing, sighting while swimming, **reeling the leash**, **climbing back on** | wipeouts look like people protecting themselves, not mannequins |
| 5 (later, separate) | The physics gaps the owner ride-checks: weight, paddle rate and roll, the top turn's tail | only if the owner asks for it |

---

## 1. Settled decisions (grilling with the owner, 2026-10-22)

1. **Deliverable:** this plan plus a stance sheet. The owner approves; the build then goes phase by phase, riding stance and turns first, then pop-up and paddling, then falls and recovery.
2. **Method:** a hybrid. Authored key poses per stage come from real references, and the physics-driven body adjusts them only for named causes.
3. **No unmotivated motion.** Every movement traces to one of:
   - board roll or pitch;
   - sideways g or vertical g;
   - a wave or bump hit;
   - anticipating the next turn (head → shoulders → hips → board, each delayed);
   - arms as counterweight and pointer;
   - breathing.
4. **"Correct" form:** coaching-textbook form as the base, with pro-style references for turns and big moves.
5. **Regular and goofy are an exact mirror.** Frontside and backside are distinct, each with its own poses for trim, bottom turn, top turn, cutback, pump and tube.
6. **Mocap is reference only.** No CC0 surfing mocap exists. CMU subject #134 (skateboard) is free to use but not CC0.
7. **The "random" look:** filter what the *drawn* body shows. The ride's feel is unchanged. Legs and hips absorb the board's fast wobble, arms move only with intent or for balance, and the chest stays calm. A physics retune comes later, and only if the owner asks.
8. **Stages to add:**
   - the lineup sit: visual only (sit when idle, lie down to paddle) and no new controls;
   - the catch: the last explosive strokes, the chest lifting;
   - the kick-out;
   - climbing back on;
   - reeling the leash.
9. **Stance faults:** fix the drawn ones now. The physics ones (for example the top turn's weight on the front foot, tied to the tail sinking) form a later phase that the owner ride-checks.
10. **The four surfers share one correct style.**
11. **Falls keep the `DetachedSurfer` ragdoll, with protective reflexes:**
    - forearms shield the head, and the body holds a loose curl while tumbling;
    - feet first by default, then a reach for the board;
    - the right shape for a pearl, for going over the falls, and for falling off the back.
12. **The tube:**
    - frontside is the grab-rail: the back hand on the outside rail, the front palm toward the face, the back knee dropped;
    - backside is the pig-dog: the rear knee dropped, the trailing arm crossing to grab the shoreward rail near the front foot;
    - the lead arm points at the exit.

The prior plans' rules still hold (memory `riding-body-animation`, plans 2026-09-28 to 2026-10-04):
- the feet stay on their points, and so does a hand placed on a point (water, rail, face);
- the steering response is untouched;
- every drawn constant is cited, and the targets are never tuned to what is drawn;
- motion faults are tested through a recipe over time and at 30 Hz, not at one instant.

---

## 2. How the rider is drawn today (verified)

The survey's facts, checked against the code on `main` (2a3bf73d):

- **There are no clips; everything is procedural.**
  - The physics' seven points come from `AttachedRider.renderPoint` (`src/physics/AttachedRider.ts:1253`) while on the board, and from `DetachedSurfer` (seven mass points at the limb centres, with no elbows or knees) once fallen.
  - They go through `RiderMotion` (`src/scene/rig/riderMotion.ts`), which gives the yaw rate, travel, speed and climb over 0.15 s, plus `uprightBlend` (0.4 s) and `standingBlend` (0.3 s).
  - Then `PosedBody` (`posedBody.ts`): `PointInertia`, then `HumanoidRig.solve` with `RIG_DETAIL` (`HumanoidRig.ts:42–266`), then `BodyInertia`.
- **Place tables:** `riderPosture.ts:93–123` holds standing, landing, push and prone; the duck-dive is at 151–159. The stance targets are in `src/scene/rig/stanceMap.ts`, and `stanceBlend.ts` reads depth, turn and weight back from the drawn state.
- **Phases:** prone, push, landing, standing, recover, fallen.
- **No `Math.random`, and no noise:** none in `src/scene/rig`, `AttachedRider` or `DetachedSurfer`. What reaches the drawn body are the physics' own oscillations:
  - the board's 3–5 Hz roll-yaw wobble, carried to the chest by the bank and the drawn swing (`SWING_DRAWN_CHEST` 0.35);
  - the sway pendulum (an inverted pendulum, ω₀ = √(g/h), about 0.5 Hz, `SWAY_RECOVERY` 0.15 s);
  - the arm pendulum (`ArmSwing`, critically damped at about 4.8 rad/s, so 0.76 Hz, within 35°);
  - the alarm arms (`ARM_SPREAD` 0.7 + `ARM_ALARM` 0.8 of the margin, which is smoothed over only 0.1 s);
  - the leg spring at ζ 0.35 (`LEG_STIFFNESS` 44 kN/m, about 3.9 Hz).
- **The stance constants:**

  | Constant | Value | Where |
  |---|---|---|
  | Feet on the stringer, apart | 0.63 m | `stanceFeet`, `riderPosture.ts` |
  | Front foot, rear foot | turned 20° and 5° toward the nose: **70° and 85° to the stringer** | `frontFootTurn`, `rearFootTurn` |
  | Knees standing tall | 155° (25° of flexion); the soft cap at `legReach` 0.985 is about 160° | `standingKnee`, `legReach` |
  | Rear knee in | 0.5 (the pole nudged toward the nose) | `rearKneeIn` |
  | Hips | 147.5° tall to 75° deep (the hinge) | `hipAngle` |
  | Chest | 25° toward the nose; the yaw-rate twist at most 35° | `chestTurn`, `twistMost` |
  | Free arms | 40–55° from the trunk's down, elbow 155° | `arms` |
  | Head | looks along the travel, led by 0.6 s of yaw rate | `lookAhead` |

- **Known misses:**
  - `src/dev/stanceTargets.test.ts` pins 12 misses of medium or high confidence;
  - `docs/research/stance-map.md` lists 39 of 99 targets missed: 24 belong to the drawn pose and 15 to the physics. The largest are the extension's front knee (−40°), backside Compress's rear hip (+52°), the landing's width and weight, and the weights in trim (W), pump and extension.

### What reads as "random": measured

The body film was run in the page's pipeline (track drawer plus `PosedBody`) on the test humanoid at 120 Hz, from 0.8 s on. The measures are RMS values in a frequency band:

| Scenario | Chest roll 3–5 Hz | Chest yaw 3–5 Hz | Head yaw 3–5 Hz | Hips up/down 3–5 Hz | Hand height about the shoulder, 0.5–2 Hz / 2–8 Hz |
|---|---:|---:|---:|---:|---:|
| Straight, 7 m/s | 0.01° | 0.00° | 0.00° | 0.2 mm | 0.2 / 0.0 cm |
| Weave, 8 m/s | 0.75° | 0.58° | 1.18° | 0.7 mm | 9.7 / 2.1 cm |
| Compress mid-turn, 10 m/s | 1.90° | 0.59° | 0.79° | 2.1 mm | 8.2 / 4.1 cm |
| Pumping | 0.49° | 0.08° | 0.00° | 6.0 mm | 4.8 / 1.4 cm |
| Chop | 0.13° | 0.01° | 0.00° | 0.6 mm | 3.0 / 0.1 cm |

Other readings, from the body report of 2026-09-29 (`docs/research/body-fluidity.md`):
- the free hands swing 11.7 and 9.0 cm RMS about their shoulders while pumping;
- the balance cue moves the hands 33.7 cm per full alarm;
- the head tilts 0.08 / 0.25 / 0.38 of the chest's tilt (weaving, pumping, chop).

**Reading these numbers:**
- **The wobble lands where it shouldn't.** In turns it reaches the chest (up to 1.9° in roll) and the head (about 1° in yaw), but barely the hips (2 mm). It should be the other way round: legs and hips absorb, the chest stays calm.
- **The arms move without intent.** In turns the hands rise and fall 8–10 cm at 0.5–2 Hz. That is the alarm following a 0.1 s margin, plus the passive swing. Pumping reads as a near fall for the same reason.

**The stance sheet** shows the static faults (figures below, and §5):
- Trim: the rear leg is near straight (24°) while the front is bent (63°), and the arms are held out about 45° each side.
- Backside looks the same as frontside.
- Top turns and cutbacks are drawn with straight legs and raised arms ("airplane").
- The bottom turn is folded 74° from vertical.
- There is no tube stance, no sit, no catch, no kick-out and no climb.
- Every fall is the same spread ragdoll.

---

## 3. The method: key poses, named causes, one filter

### 3.1 The pieces (all drawing-side)

| New or changed | What it holds | Notes |
|---|---|---|
| `src/scene/rig/stagePoses.ts` (new) | The authored key poses as data, one per stage and per side (frontside/backside), in this plan's conventions. | Same shape as `StandingSpec` / `FreeSpec` in `src/dev/stageFigures.ts`, which is the sheet's prototype. Each number carries its source and confidence, as in `stanceMap.ts`. Goofy mirrors it. |
| `src/scene/rig/stageBlend.ts` (new, extends `stanceBlend.ts`) | The stage reader: a weight for each stage from the drawn state only (phase, points, board pose, `RiderMotion`, twist, duck, swim and leash bits). | Each weight changes no faster than a set rate and has hysteresis, so poses never flicker. Remote surfers read the same state, so there is no wire change. |
| `src/scene/rig/causeFilter.ts` (new) | The motion filter (§4): the drawn trunk points and motion signals, filtered by cause. | Runs in `PosedBody` between `PointInertia` and the rig. |
| `HumanoidRig.ts` | Takes the blended key pose as its targets (feet angles, knee flexion, rear knee in, hinge, chest and hips yaw, shoulder drop, head, arm aims). The physics still sets the depth, weight, lean, twist, alarm and reach. | `RIG_DETAIL`'s stance constants move into the key poses. |
| `stanceGauge.ts`, `stanceMap.ts` | New measures, and the plan's targets per stage (§8). | The gauge gains foot angles, rear knee in, shoulder drop, and lying, sitting and water measures. |

### 3.2 The cause model: what may move what

The key pose gives the shape. Only these physics signals may move it, each through its own channel:

| Cause | Signal (drawn state) | Moves | Not allowed to move |
|---|---|---|---|
| Board roll and pitch (the fast wobble, bumps) | The board's quaternion, raw | Feet and ankles (locked to the deck), knees and the rear knee's caving in. The legs are solved between the raw board and the filtered pelvis. | Chest, head, arms |
| Sideways g | v × yaw rate, filtered (§4) | The body's lean into the turn (atan(a/g)), on top of the physics' bank | — |
| Vertical g | The pelvis' height over the deck (the leg spring, the crouch ladder) | Knee and hip flexion, the hinge's depth | Arms (except the pump's small push) |
| Weight fore and aft | The pelvis along the stance (`weightBack`) | The hips' place along the board; the snap and kick-out blends | — |
| Wave or bump hit | The pelvis' acceleration spike (> 1.5 g) | One critically damped knee absorb (ζ ≥ 0.8) and a 0.2 s arm brace | No ringing |
| Anticipation | Yaw rate below the wobble band (§4) and the pad's twist | The cascade: head first, shoulders 0.15 s later, hips 0.15 s after that, then the board (as the physics turns it) | — |
| Arms as counterweight | The physics' balance margin (read from its hand spread, `balanceAlarm`), with hysteresis | Free arms up toward 90° | No flutter below the deadband |
| Arms as pointer | The turn's target (travel, led by the turn) | The lead arm along the line or at the lip | — |
| Breathing | `Breathing` (16–36 breaths a minute) | The upper spine | — |

### 3.3 Frontside and backside, from the drawn state

- **In a turn:** the rail it is on. `stanceBlend.turn` is positive on the toes' rail (frontside) and negative on the heels' (backside).
- **In trim and the tube:** which side the face is on. The deck's normal tilts away from the face, so a face on the toes' side reads as frontside. This is filtered over 0.5 s, needs a 6° tilt, and falls back to the last known side on flat water (the Wave Pool's flat stretch).
- Both remote and local surfers read it from the same state.

---

## 4. The motion filter (decision 7): what reaches which part

The physics is not touched: the board, the points and the feel stay the same. The filter only changes how the drawn trunk and arms follow those points.

**The frequency budget** (attenuation at 4 Hz, the wobble's middle):

| Drawn part | Passes | Stops | How |
|---|---|---|---|
| Feet, ankles | everything: they are on the deck | — | Unchanged: placed on the raw board |
| Knees, shins (the legs) | the board's roll and pitch at any rate, and bumps | — | Two-bone IK between the raw ankle targets and the **filtered** pelvis. The legs show the difference: that is the absorption |
| Pelvis (its place in the board's levelled frame: across, along, up) | pumps (~1 Hz), the crouch ladder, weight shifts, lean | the 3–5 Hz wobble, ≥ 10 dB | A critically damped second-order follower, ω = 16 rad/s (fc ≈ 2.5 Hz): 0.29× at 4 Hz, 0.86× at 1 Hz, and 0.12 s lag below 1 Hz. Two cascaded one-pole stages, stepped exactly at any frame rate, as `ArmSwing` is |
| Torso and head points (the trunk's lean and roll) | the lean model from sideways g; the physics' bank below 1.5 Hz | the wobble, ≥ 15 dB | The pelvis filter, plus a second stage on the trunk's roll about the board's forward axis, ω = 12 rad/s. The drawn swing (`SWING_DRAWN_CHEST`) is filtered with it |
| Head (pitch and roll in the world) | the look (yaw) and turns | the chest's tilt (Pozzo et al. 1990) | Its own follower toward the horizon, ω = 8 rad/s, on top of the trunk filters |
| Yaw-rate cues (chest twist, head lead, lead arm, snap blend) | turns (< 1.5 Hz) | the wobble's yaw | Read from the yaw rate, second-order filtered at ω = 9 rad/s instead of `RiderMotion`'s one-pole 0.15 s (which passes 26 % at 4 Hz). `lookAhead` is raised so the lead stays about 0.6 s in time |
| Free arms (alarm) | real balance threats | margin flutter | The alarm through a deadband (< 0.25 counts as none), rising over 0.25 s and falling over 0.6 s, so a pump's dips don't lift the arms |
| Free arms (passive swing) | landings and big hits | the turn-and-pump flop | `swing.share` 1 → 0.35, `swing.most` 35° → 15° |
| Breathing | — | — | Unchanged |

**Switches:** the filter re-seeds on every phase switch, a teleport or a fall. `PointInertia` and `BodyInertia` keep handling switches, so the two layers never fight. Over a jump of the points (a lip hit), the filter carries the pelvis smoothly and the legs take the rest. If the legs can't reach, the hips drop: the existing `softCap` / `legEase`.

**Acceptance, in the body film:** new measures in `bodyFilm.ts` and `report:body`. Today's values are in the table in §2.

| Measure | Today | Target |
|---|---:|---:|
| Chest roll 3–5 Hz, compress mid-turn | 1.90° | ≤ 0.6° |
| Chest roll 3–5 Hz, weave | 0.75° | ≤ 0.25° |
| Head yaw 3–5 Hz, weave | 1.18° | ≤ 0.4° |
| Hand height about the shoulder 0.5–2 Hz, weave | 9.7 cm | ≤ 3 cm |
| The same, compress mid-turn | 8.2 cm | ≤ 3 cm |
| Hands' swing while pumping | 11.7 / 9.0 cm | ≤ 4 cm |
| The drawn lean against the physics' bank, below 1 Hz | — | within 3°, lag ≤ 0.12 s |
| The balance cue per full alarm | 33.7 cm | ≥ 25 cm (the cue stays readable) |
| Feet sliding on the deck | — | ≤ 1 cm |
| The switch spikes (body report) | — | no worse than today |
| The physics points and every rider test | — | bit for bit unchanged, so the feel is unchanged |

---

## 5. Stage by stage: today, the target, the gaps, the fix

Each stage's still is in `docs/research/animation-realism-2026-10-22/`. Each image is a pair: today as the game draws it (left), and the target figure built from the numbers below (magenta, right). The tiles' readings are in the stills.

**Conventions:**
- Knee and hip angles are **flexion (0° straight)**. `stanceMap.ts` stores the included angle, 180° minus the flexion.
- A foot's angle is measured **to the stringer** (90° is square across).
- Chest and head yaw run from the toes (0°) toward the nose (+).
- Trunk angles are from the world's vertical (the gauge's `trunkTilt`).
- Weight is the hips' share of the way from the rear ankle to the front.

Today's readings come from surfer1 (Regular) on the real rider, recipe by recipe.

**Overview:** [`00-overview.jpg`](../../research/animation-realism-2026-10-22/00-overview.jpg)

### 5.1 The global stance, used by every standing stage

**Target:**
- width 1.3–1.6 × shoulder width, so 0.63 ± 0.10 m, up to 1.9 × on landings (Borgonovo-Santos 2021; Seixas 2023 measured 0.79 ± 0.14 m on aerial landings);
- front foot 45–70°, back foot 65–90°, over the fins;
- knees 30–80° flexed, the rear knee caving in toward the front;
- front ankle dorsiflexed about 33° (Seixas 2023: 32.7 ± 14.5°, aerial landings);
- trunk 20–30° from vertical: bend the knees, not the waist, with the head over the board (WSL, Barton Lynch).

**Today:**
- feet at 70° / 85°;
- trim knees 63° front and 24° rear;
- trunk 14°;
- arms held out 45–48°.

**Gaps (drawn):**
- the rear leg is near straight;
- the front foot sits at the edge of its range;
- the rear knee hardly caves in (a 0.5 nudge of the pole);
- the arms are out.

**Fix (drawn):**
- `frontFootTurn` 20 → 30 (60° to the stringer) and `rearFootTurn` 5 → 10 (80°), into the key poses;
- `standingKnee` 155 → 140, so standing tall is about 40° of flexion; the physics' crouch drop bends from there;
- the rear knee's pole turned 20° toward the nose and 10° down (the figure's `rearKneeIn`);
- `maxDorsiflexion` 40 → 35 (Seixas' 33° mean);
- the hinge target `hipAngle.tall` 147.5 → 140, so the trunk tilts about 22°.

**Cause model:** depth and lean as in §3.2.

**Physics, phase 5:** the pelvis sits forward (trim weight 0.70 drawn, 0.64 in the map), which keeps the front knee more bent than the rear.

### 5.2 The lineup sit (new): [`01-lineup-sit.jpg`](../../research/animation-realism-2026-10-22/01-lineup-sit.jpg)

**Target** (coaching cue; no measured source):
- straddling the board, legs hanging slightly apart, knees about 70°, the hips on the deck just behind the middle;
- torso within 15° of vertical, the head scanning behind and over the shoulders;
- hands free (thighs or rails);
- board level with the nose just out of the water. This is the physics' prone trim, so nothing to change.

**Today:** idle means lying prone with the hands at the rails.

**Fix (drawn only):** a `sit` key pose, with its trigger in §6. The legs go below the deck into the water, and the board stays where the physics floats it.

**Cause model:**
- a slow head scan: yaw ±90° over 4–6 s, toward the open sea and then the peak, timed off the clock with no noise; a fixed cycle stands in for "watching the sets";
- breathing;
- the board's roll and pitch move only the legs and hips.

### 5.3 Paddling: [`02-paddle-catch.jpg`](../../research/animation-realism-2026-10-22/02-paddle-catch.jpg), left pair

**Target:**
- sternum on the stringer, the chest only slightly lifted (5–15°; Sheppard 2013: chest-down paddles faster);
- hand entry 15–20 cm ahead of the head with the elbow high, then a pull 15–25 cm deep to past the hip (Rapture, paddle technique);
- head neutral, with a look-up scan every 5–10 strokes;
- legs together, no kick;
- one left-plus-right cycle every 2–3 s cruising (Rapture). Nessler 2019 measures 36–54 strokes a minute per arm over 0.6–2.0 m/s.

**Today:**
- 60 strokes a minute per arm (the physics' `ARM_CYCLE` 1.0 s);
- hand path 73 cm along, 19 cm across, 37 cm up and down (Nessler 2015: 97 / 17 / 42–47);
- board roll 7° per stroke (Nessler 2019: 27–45°);
- the chest is lifted by the torso point at 0.18 m, and the head sits high.

**Fix (drawn):**
- the prone chest drawn lower (5–15°), with the spine's arch at the upper chest only;
- the head held neutral, plus a scan every 8 strokes (counted from the stroke phase): a 0.6 s look up and ahead;
- legs together (≤ 0.15 m apart).

**Physics, phase 5:** the stroke rate, the stroke length and the board's roll (open since step 8).

### 5.4 The catch (new): [`02-paddle-catch.jpg`](../../research/animation-realism-2026-10-22/02-paddle-catch.jpg), right pair

**Target** (Rapture, catching unbroken waves):
- 5–8 strokes, then 3 more once the tail lifts: explosive full strokes, head down;
- steep: the weight back and the chest up (the cobra, 20–35°);
- the board nose-down on the face.

**Today:** the cruising stroke goes on unchanged until the pop-up.

**Fix (drawn):**
- a `catch` key pose layered on paddling: the chest lifts 20–35°, the head pitches down 20–40°, and the arms reach full (`armReach` cap 0.97 → 1.0 for the pull);
- trigger in §6. The physics' stroke rate already fits a sprint; the cruise is what is slow.

**Cause model:** board pitch (nose down) sets the cobra's depth; speed rising sets the blend.

### 5.5 The duck-dive: [`03-duck-dive.jpg`](../../research/animation-realism-2026-10-22/03-duck-dive.jpg)

**Target** (Rapture, duck dive; Barefoot Surf):
- 3–4 strokes first;
- arms straight on the rails, a third back from the nose, the nose pushed down 30–45°;
- the back knee on the tail pad, the other leg kicked up;
- the head tucked.

**Today:** the press and the knee exist (`duckPlaces`). Parked with the physics (memory `wipeout-duck-dive`: the two-body rider).

**Fix:** only a review in phase 3: the head tuck and the kicked leg's height. No physics.

### 5.6 The pop-up push: [`04-pop-up.jpg`](../../research/animation-realism-2026-10-22/04-pop-up.jpg), left pair

**Target** (Borgonovo-Santos 2021; Rapture pop-up):
- hands flat beside the lower ribs, 0.46 m apart;
- push 0.71 s, with the elbows from about 70° of flexion to full extension at 80 % of the push (110° at peak force);
- chest up, eyes forward;
- under 1 s is good (Rapture: competition under 0.8 s, intermediate 1.0–1.5 s).

**Today:**
- the physics draws the push hands *on* the rails beside the chest (`renderPoint`, `halfWidth`). That is 0.45 m apart, which is right, but they grip the rails and sit at the chest, not the lower ribs;
- the trunk's rise and the legs' swing are unsourced in the map.

**Fix (drawn):**
- the hand's back faces up, palm flat, fingers forward, 2 cm inboard of the rail and 10 cm toward the tail;
- the chest rises with the push;
- the eyes stay forward (head pitch −10° to 20°).

The timing is the physics': 0.72 s.

### 5.7 The landing: [`04-pop-up.jpg`](../../research/animation-realism-2026-10-22/04-pop-up.jpg), right pair

**Target** (Borgonovo-Santos 2021; Rapture):
- the feet land together: the back foot at about 45° over the tail pad, the front foot between the hands at about 45°;
- reach and land 0.48 s, knees about 80–100° flexed, 72 ± 8 % of the impulse on the front foot;
- eyes forward.

**Today:**
- the feet are 0.42 m apart at the landing's end and still gliding (weight 1.06): the physics jumps them from the lying legs and `PointInertia` blends the jump over about 0.6 s;
- the trunk is upright (0°) with the arms out;
- the feet are already at 70° / 85°.

**Fix (drawn):**
- **the feet planted:** each foot swings in the air during the reach (a minimum-jerk arc above the deck, timed by the landing's clock) and lands on its stance point. They never slide along the deck;
- the landing's feet at 45° / 45°, turning to the stance's angles over the settle (0.8 s);
- the trunk hinge allowed in `landing`, not only `standing`;
- the arms low and forward.

**Test:** after touchdown, foot slide ≤ 3 cm. This clears the known misses `landing.stanceWidth` and `landing.weight`.

### 5.8 The drop: [`05-drop.jpg`](../../research/animation-realism-2026-10-22/05-drop.jpg)

**Target** (the research brief of 2026-10-22; Rapture's take-off pages, the exact page to confirm in the build; Kerr via the map):
- the deepest crouch, knees past 90° flexed, the back fairly upright (trunk 20–40°);
- arms at waist height or below, the lead arm along the line;
- eyes on the base (head pitch 20–45° down);
- 55–60 % of the weight on the back foot.

**Today:**
- knees 81° / 83°, trunk 34°, arms 49° / 48°;
- weight 0.53.

**Fix (drawn):** the crouch's knees deepened by the new `standingKnee`; the arms low (see §4); the head pitched to the base by the climb (already led by `lookPitch` 30°; raise it to 40°).

**Owner's call (§10):** the drop's weight. The map says front (de Sousa); this research says back.

### 5.9 Trim, frontside and backside: [`06-trim.jpg`](../../research/animation-realism-2026-10-22/06-trim.jpg)

**Target, frontside:**
- knees 30–65° front and 35–70° rear, the rear knee in, the hips low and slightly open;
- the lead shoulder low (3–15°), pointing down the line;
- front arm loose toward the travel, back arm at the side, hands at waist height (arms 20–50° and 10–35°);
- eyes down the line (head yaw 60–90°), the upper body quiet (WSL flow; Barton Lynch; Rapture stance).

**Target, backside:** the same legs, with the shoulders open along the rails (chest 45–70°) and the head over the lead shoulder (yaw 75–110°).

**Today:**

| Side | Knees F / R | Trunk | Chest | Arms | Weight |
|---|---|---:|---:|---|---:|
| Frontside | 63° / 24° | 14° | 27° | 48° / 45° | 0.70 |
| Backside | 66° / 28° | 7° | 20° | about the same | 0.71 |

Backside is drawn as frontside.

**Fix (drawn):**
- `trim-frontside` and `trim-backside` key poses (§5.1's stance);
- backside: chest 55°, hips 25°, head 95°, the lead arm along the line and the trailing arm at the side;
- the side is read as in §3.3;
- the arms quiet (§4).

**Cause model:**
- the chest and head get no wobble (§4);
- the lean follows sideways g;
- weight shifts come from W/S (the physics).

### 5.10 The bottom turn, frontside and backside: [`07-bottom-turn.jpg`](../../research/animation-realism-2026-10-22/07-bottom-turn.jpg)

**Target, frontside** (Rapture, bottom turn; de Sousa 2022; Forsyth 2024):
- compress at the base, extend while climbing;
- the board rolled 30–40° onto its rail (Forsyth 2024: 42° measured), the body leaning with it (lean 30–50°), the trunk 40–60° from vertical;
- the chest and lead shoulder rotated to the wave (chest −10° to 25°);
- the lead arm pointing at the target, up the face (60–110°);
- the hands out of the water, the inside hand near it (0.05–0.3 m).

**Target, backside** (Hobgood; Knox):
- the shoulders square to the lip (chest −15° to 15°), looking over the front shoulder (head 100–140°);
- rotated with the hips rather than bent over;
- on the heels' rail 30–40°, the lead arm at the target.

**Today:**
- frontside: trunk 74° from vertical (folded), lead arm 122° (raised, not aimed), the inside hand arriving late through the blend;
- backside: chest open 48°, arms wide (125° / 49°), rear hip 52° off the map.

**Fix (drawn):**
- `bottom-frontside` and `bottom-backside` key poses;
- the hinge capped by the pose (`trunkTiltMost` 75 → 60 in turns);
- the lead arm aimed at the turn's target, which is the travel turned by the turn over 0.6 s (the yaw-rate lead in §4), raised 15–35°, not the alarm's 90°;
- the inside hand's point blend shortened for the reach (the `compress-frontside.lowHand` miss).

**Cause model:** the lean from sideways g; depth from the crouch ladder; the head from the anticipation cascade.

### 5.11 The top turn, frontside and backside: [`08-top-turn.jpg`](../../research/animation-realism-2026-10-22/08-top-turn.jpg)

**Target** (Rapture, top turn; Bali Surfing Camp; Hobgood):
- extend climbing, then compress through the redirect, the front knee dropping (front flexion 50–80°, rear 40–70°);
- the head and lead shoulder swing back to the pocket: frontside chest 70–110°, head 110–160°; backside chest −60° to −20°, head −40° to 10°;
- the arms at chest height or below, close (30–70°, the lead elbow 90–140°);
- about 70/30 on the back foot (weight 0.25–0.35).

**Today:**
- frontside: legs straight (20° / 24°), arms raised 95° / 76° (the airplane, from the alarm and the snap raise), weight 0.48 on flat water and 0.65 on the real wave;
- backside: arms 94° / 75°, weight 0.48.

**Fix (drawn):**
- `top-frontside` and `top-backside` key poses;
- `snapRaise` 60° → 25°: in the step 3 review the raised lead arm read as a wave;
- `arms.snapSwing` 100° → 60°.

**Physics, phase 5:** the weight back (the tail sinks, pinned `it.fails`).

### 5.12 The cutback, frontside and backside: [`09-cutback.jpg`](../../research/animation-realism-2026-10-22/09-cutback.jpg)

**Target** (Rapture, cutback; WSL flow; Knox; Forsyth 2024):
- the head, then the lead shoulder, the trail shoulder, the hips and the board rotate about 180° in sequence, each delayed;
- the lead arm extends, then sweeps back;
- 65–70 % on the back foot;
- the rail at about 75° (Forsyth 2024), the body leaning with it (lean 40–75°);
- frontside onto the heels (chest 90–150°, hips 40–80°, head 140–180°); backside onto the toes (chest −120° to −60°, hips −50° to −20°, head −150° to −100°).

**Today:**
- frontside: chest 63°, turning with the hips, so there is no head-first sequence; arms raised 128° / 86°;
- backside: arms 136° / 85°; not in the map.

**Fix (drawn):**
- `cutback-frontside` and `cutback-backside` key poses;
- **the cascade:** the head leads by 0.35 s, the chest by 0.2 s and the hips by 0.1 s, as delays of one filtered yaw-rate signal. This replaces `twistGain` and `hipsTwistShare`'s instant proportional twist;
- the lead arm sweeps back with the chest.

**Physics, phase 5:** the deep-U root (the cutback stalls on the static face).

### 5.13 The pump: [`10-pump.jpg`](../../research/animation-realism-2026-10-22/10-pump.jpg)

**Target** (Rapture, speed generation and compression-extension):
- extend going downhill (55 % front), compress going uphill (55 % back);
- small arm motions in sync, pushing down and not rising;
- about 1 pump a second, the vertical range 20–30 cm for an intermediate surfer.

**Today:**
- compressing: arms 54° / 51°, rising with the alarm (it reads as a near fall), weight 0.59;
- extending: rear leg straight (26°), front bent (73°), weight 0.76.

**Fix (drawn):**
- the alarm's deadband (§4);
- an arm channel driven by the pelvis' vertical velocity: ±10° of elevation, pushing down while extending, in phase.

**Physics, phase 5:** the pump's weight.

### 5.14 The tube: frontside grab-rail, backside pig-dog: [`11-tube.jpg`](../../research/animation-realism-2026-10-22/11-tube.jpg)

**Target, frontside** (decision 12; Jordy Smith in Stab: the lead arm forward, low and close):
- the back hand on the outside (heels') rail beside the back foot;
- the back knee dropped (rear flexion 120–150°, the knee ≤ 0.15 m off the deck);
- the front palm toward the face, the lead arm at the exit.

**Target, backside** (decision 12; eos.surf "pigdog"; Mark Healey in The Inertia: on the backhand, the front arm rests on the face and the chest squares to the exit):
- the rear knee dropped;
- the trailing hand on the shoreward (toes') rail by the front foot;
- the lead arm at the exit, the chest 40–70° toward it.

**Today:**
- there is no tube stance. The deep tuck (`MANUAL_CROUCH_DEPTH` 0.45 m) exists only under a curl, plus the hand in the face (E);
- on a face: frontside trunk 78°, weight 0.75; backside weight 0.80;
- the rear knee never drops.

**Fix (drawn):**
- `tube-frontside` and `tube-backside` key poses, blended in by depth past the pumping crouch (only the tube's tuck goes there: §6);
- the trailing hand placed on its rail by IK, which is a new hand point like E's;
- E in the tube is the front palm on the face.

**Cause model:** the depth (the tuck) sets the knee drop; the lean comes from sideways g.

### 5.15 The kick-out: [`12-kick-out.jpg`](../../research/animation-realism-2026-10-22/12-kick-out.jpg)

**Target (over the back)** (coaching cue; Rapture's etiquette page names it; there is no measured source):
- hard back-foot pressure swinging the nose over the back of the wave (weight 0.15–0.3);
- front leg long (20–45°), back knee bent (60–90°);
- the arms out for balance.

**Target (prone):** drop to the chest, hands on the rails, knees to the deck, and paddle out over the back.

**Today:**
- no kick-out: the nearest is S with a hard steer (the snap: legs straight 20° / 44°, arms up);
- lying back down (Enter) exists but is unsourced.

**Fix (drawn):**
- a `kick-out` key pose with its trigger in §6;
- the lie-down's path reshaped: the chest first, then the hands to the rails, then the knees.

**Physics, phase 5:** whether the board swings over the back under the hard back foot is the physics'. If it doesn't, the owner's ride check says so.

### 5.16 Falls: [`13-falls.jpg`](../../research/animation-realism-2026-10-22/13-falls.jpg), [`14-fall-shapes.jpg`](../../research/animation-realism-2026-10-22/14-fall-shapes.jpg)

**Target** (Rapture, safety basics and staying calm underwater):
- fall flat, to the side or behind the board, away from it, feet first;
- forearms over the head, a loose curl (knees about 90°);
- go limp underwater ("ragdoll") but keep the head covered;
- the shape depends on the cause: a pearl throws you forward over the nose; going over the falls makes a ball; falling off the back is seat first.

**Today:**
- the ragdoll's limbs point at the physics' limb centres (`fallenReach` 0.92), so the arms are spread;
- there is no protective pose;
- every cause looks the same.

**Fix:** the reflex layer in §7.

### 5.17 Recovery: [`15-surface-swim.jpg`](../../research/animation-realism-2026-10-22/15-surface-swim.jpg), [`16-reel-climb.jpg`](../../research/animation-realism-2026-10-22/16-reel-climb.jpg)

**Target** (Rapture):
- surfacing with the forearms crossed overhead;
- pulling the leash hand over hand;
- both hands at the rail's middle, then belly onto the board from the side;
- then lying prone.

**Today:**
- the ragdoll rises as it floats;
- the crawl (kept: 0.38 cycles a second, roll 57° / 66°) never sights the board;
- the reel is drawn only in the cord, from the left hand;
- the grab pulls the ragdoll on, then it snaps to prone (`climbOn`).

**Fix (drawn):**
- `surfacing`, `reel` and `climb-on` key poses (§6, §7);
- the swim sights the board: the head lifts every 4–6 strokes, toward the board's bearing.

---

## 6. New stages: how each is read from the existing state (no new controls)

| Stage | Enters when | Leaves when | Blend | Remote surfers |
|---|---|---|---|---|
| **Lineup sit** (drawn only) | prone, not stroking (`stroking` 0, physics paddle off), no duck, the board slower than 0.5 m/s, for 2 s | a stroke, a steer sweep (a hand point leaving the rail), a duck, or the board faster than 0.8 m/s | in 0.8 s, out 0.4 s. The first stroke is drawn as the arms come down: the risk in §8 | the pose's paddling flag (wire flag 4) and the board's speed: derivable |
| **The catch** | prone and stroking, and either the local `popUpCue` (snapshot slot 22, written today but not read) or the board faster than 2.5 m/s and pitched nose-down more than 5° | the pop-up (phase push), or the cue gone for 1 s | in 0.3 s; the cobra's depth set by the pitch | speed and pitch from `RiderMotion` and the board pose (no cue on the wire) |
| **Kick-out over the back** | standing, the weight back (`weightBack` > 0.5), the board climbing (climb > 0.5 m/s) and pitched more than 15° nose-up, the speed falling | the pitch below 5°, or prone | in 0.25 s | derivable |
| **Kick-out prone** | the existing lie-down (phase `recover` from standing) | prone | its own 0.6 s path | as today |
| **Tube stance** | standing, the depth past the pumping crouch (`CROUCH_SHARE` × `CROUCH_DEPTH`, 0.195 m: only reachable under a curl, where `covered` lets the tuck go to 0.45 m) | the depth back above it | by the depth, 0.195 → 0.3 m | derivable (the points) |
| **Reeling the leash** | fallen and the snapshot's `LEASH_BITS.reeling` | the bit off | in 0.3 s | not on the wire: remote surfers swim or float as today, unless the owner grants wire flag 128 (below) |
| **Climbing back on** | fallen and the recovery holding the board: **a new snapshot bit** `SWIM_BITS.holding` (8), from `session.recovery.state === 'holding'` | prone (`climbOn`) | in 0.25 s; at `climbOn` the prone pose blends in over 0.4 s instead of snapping | wire flag 128 "recovering" (holding or reeling): **the owner's call**. Without it, remote surfers fall back to "fallen, within 0.6 m of the board's rail, slower than 0.5 m/s" |

**No new controls:**
- the sit is idle;
- the catch is paddling on a wave;
- the kick-out is S with a climb;
- the tube is the crouch under a curl;
- reeling and climbing are the existing in-water pop-up key.

---

## 7. Falls: the reflex layer over the ragdoll (decision 11)

**The physics is untouched:** `DetachedSurfer` keeps its seven mass points and their joint limits, and the drawn trunk follows the pelvis, torso and head points. The reflexes are drawn only, in the rig's fallen branch (`HumanoidRig.solve`: today `fallenReach` 0.92 toward each limb centre).

**How it blends:**
- each limb's drawn target is blended from the ragdoll's limb centre toward a reflex target, set in the trunk's frame (spine axis, facing);
- the reflex weight is at most 0.8, so the ragdoll still reads;
- the IK keeps the limb's length, so a limb never stretches;
- the drawn limb stays within its arm's reach of the physics' mass point, so the apparent mass doesn't wander.

**The reflexes:**

| Reflex | When | Shape | Source |
|---|---|---|---|
| **Brace** | 0.12–0.25 s after the separation (a protective reaction's latency) | the arms start up toward the head; the knees start to bend | protective-response timing: to verify and cite in the build (for example Hsiao and Robinovitch 1998, *J Biomech*, on protective movements in falls) |
| **Shield** | from 0.25 s, and always under water | forearms crossed over the head and face, wrists within 0.25 m of the head, elbows forward | Rapture, safety basics and staying calm underwater |
| **Loose curl** | tumbling: the body's rotation rate > 3 rad/s, or aerated (the void fraction) | knees 60–110°, hips about 100–120° | Rapture: go limp |
| **Feet first** | in the air above the water (the pelvis above the surface and falling) | the legs reach toward the water along the fall's direction | Rapture: fall flat or feet first |
| **Reach for the board** | surfaced, the board within 1.5 m, and not under a breaking wave | the near hand reaches for the rail, handing over to the climb-on | decision 11 |

**The shape by cause.** It is read once, at the switch to fallen, from the drawn history:

| Cause | Read from | Shape |
|---|---|---|
| **Pearl** | the board pitched nose-down more than 25° at the separation, the body moving forward against the board | thrown forward, arms forward and round the head, chin tucked, then the shield |
| **Over the falls** | separation `impact` (the lip) locally, or the body lifted with the lip (the pelvis rising faster than 1 m/s while aerated) | a ball: knees to the chest, forearms over the head |
| **Off the back** | the body moving backward against the board, or the board more than 20° nose-up | seat first, the arms out and back, then the shield |
| **To the side** (the default) | the rest (`balance`, `foot slip`) | to the side, feet first, then the shield |

Locally, the cause is the session's `separation` (`balance`, `foot slip`, `lost board`, `impact`, `reef`). It is not in the snapshot today, so add it as a snapshot slot (local, no wire). Remote surfers read the motion only.

**Surfacing:** when the head point rises through the surface (`swim.under` going off), the forearms stay crossed overhead until the head is out. Then the head turns toward the board's bearing and the wave.

**Today's switch spikes stay as they are:** `PointInertia` and `BodyInertia` blend the fall's start. The reflexes ease in from 0.12 s, so they never pop.

---

## 8. Phases, with acceptance

Each phase:
- is its own PR from `main`, merged only when the owner says so in the turn;
- runs `tsc` and the rig, dev and stance tests. It runs no riding reports and no bot rides (memory `owner-playtests-riding`);
- ends with the owner's videos. The shot list says what to record.

**The new targets** go into `stanceMap.ts`, so `stanceTargets.test.ts` checks them on **all four surfers**, Regular and Goofy. Today it checks surfer2 only. Each target carries its source and its confidence; the confidence never exceeds what its source allows (the map's rule). The tables give flexion; the map stores the included angle, 180 − flexion.

### Phase 1: the riding stance and the motion filter

- [x] **Gauge:** add `footFront`, `footRear`, `rearKneeIn` (the rear knee's bend from the toes toward the nose) and `shoulderDrop`.
- [x] **Map:**
  - add `trim-frontside` and `trim-backside`, read on an across-the-face recipe: the sheet's `across` and `across-back` water, already on this branch;
  - update `trim` and `drop`.
- [x] **`causeFilter.ts`** (§4), in `PosedBody`, with body-film tests for the measures in §4.
- [x] **`stagePoses.ts` / `stageBlend.ts`:** the stance and trim key poses; the side reader (§3.3).
- [x] **`RIG_DETAIL`:** the constants in §5.1, moved into the key poses.
- [x] **The arms (the owner's addendum, 2026-10-22):** relaxed and close in, framing the knees (his reference photo), never spread; the alarm reaches out only for a real balance loss.

**Targets (Phase 1):**

| Stage | Measure | Range | Source | Confidence |
|---|---|---|---|---|
| all standing | stance width | 0.53–0.73 m | Borgonovo-Santos 2021 | high |
| all standing | front foot / rear foot | 45–70° / 65–90° | the research; Rapture stance | medium |
| all standing | rear knee in | 10–35° | coaching | low |
| trim (both sides) | knee flexion front / rear | 30–65° / 35–70° | Borgonovo-Santos 2021 (citing earlier work); Weiß 2024; Bruton 2013 | medium |
| trim (both sides) | trunk from vertical | 15–30° | WSL flow; Barton Lynch | medium |
| trim (both sides) | lead arm / trailing arm | 20–50° / 10–35° | WSL flow; Rapture | low |
| trim (both sides) | shoulder drop (lead lower) | 3–15° | coaching | low |
| trim (both sides) | weight | 0.50–0.62 | SurfDeeper; Cornish Wave | medium (physics, phase 5) |
| trim, frontside | chest / head | 20–40° / 60–90° | Rapture; SurfDeeper | low |
| trim, backside | chest / head | 45–70° / 75–110° | the research | low |
| drop | knee flexion front / rear | 90–115° / 85–110° | the research brief; de Sousa 2022 | medium |
| drop | trunk from vertical | 20–40° | the research brief | low |
| drop | arms | 20–50° / 10–40° | the research brief | low |
| drop | head pitch (down) | 20–45° | the research brief; de Sousa 2022 | low |
| drop | weight | owner's call (§10) | — | — |

**Motion tests (body film, at 30, 60 and 120 Hz):** the §4 table.

**Shot list for the owner (Phase 1, as built):**
1. Beach, medium swell, the chase camera behind: a right (frontside for a regular foot). Ride 6–8 s of trim with no input, then 3 s with W and 3 s with S. *Look for:* knees bent and about equal with the rear knee in, feet at about 60° and 80°; the chest quiet (no shimmy at the turn's speed); the arms hanging relaxed in front of the thighs, not held out; the head down the line.
2. The same on a left (backside). *Look for:* the chest turned toward the wave (about 55°) and the trunk bent further over the toes, the hips toward the face: not the frontside pose mirrored.
3. The same right, holding Shift for 3 s of crouched trim. *Look for:* the hands near the knees, the front hand forward and down along the line, the back hand by the back knee, the torso over the knees (compare with the reference photo of 2026-10-22).
4. Point, medium, the side camera: a take-off and the drop. *Look for:* the deepest crouch, the back fairly upright, the hands low in front of the knees, the eyes on the base, the hips back (weight on the back foot).
5. Wave Pool, any size: a long weave (alternating steer every second). *Look for:* the board wobbles but the chest and head don't; the knees take it. The arms go out only when the rider nearly falls, and come back.
6. Any spot, Goofy (in the settings), one frontside and one backside ride: the mirror.
7. Online with a second player, if handy: the other surfer's body as calm as your own.

**M1 cost:**
- The rig today costs 0.10–0.15 ms per surfer per frame on this M1, measured for `PosedBody.update` over a recorded compress recipe on the test humanoid, in the dev page.
- The filter adds three second-order followers per point. With the pose blend, the budget is +0.03 ms per surfer, so ≤ 0.25 ms per surfer and ≤ 2 ms for an eight-surfer room.
- It is measured by a micro-benchmark in the phase's PR and reported, never a gate (memory `user-hardware-performance`).
- **Measured (phase 1, this M1, Node):** `PosedBody.update` over 480 drawn frames (compress, trim backside, the drop, a snap): surfer2 0.103 ms before and 0.103 ms after; the test humanoid 0.056 → 0.060 ms. The followers cost about what the hinge's old search (eight leg solves a frame) saved.

**Risks:**
- *The upper body looks late in a sharp turn* (up to 0.12 s): the anticipation cascade and the lean model carry the turn, not the raw points.
- *The legs can't absorb what the filter holds back* (a big hit): the hips come down (the soft cap), and the filter re-seeds past 3 m/s of point speed.
- *The balance cue grows less readable:* its amplitude is kept (≥ 25 cm per full alarm) and only the flutter is removed.
- *Remote surfers* (poses at 20 Hz, drawn 0.1 s behind): the filter runs on the drawn state, and the body film's remote drawer is part of the tests.
- *The frontside/backside reader on flat water:* it keeps the last side.

**Built (phase 1, 2026-10-22, `claude/anim-p1`).** Drawn only: the physics, its points and every rider test are untouched.

- **The motion filter** (`src/scene/rig/causeFilter.ts`, in `PosedBody` between the point blend and the rig). Standing:
  - the pelvis follows the physics' on the board's levelled frame, critically damped at 16 rad/s (the plan's);
  - the trunk's lean and pitch follow theirs at 18 rad/s, damped 0.7, so the drawn lean trails the physics' bank by 0.08–0.11 s (the plan's 12 rad/s, critically damped, would lag 0.17 s);
  - the yaw rate gets one more pole (0.08 s): with `RiderMotion`'s, the plan's second order at 9 rad/s;
  - the pelvis is held within 0.15 m of the physics' (a body thrown hard), and the filter starts over at every switch.

  The probe found the physics' own lean carried little of the board's wobble mid-turn (0.05° of the chest's 1.9°): the rig's hinge (1.3°) and reach bend (0.9°) drew it in. So, in the rig:
  - the hinge, its backside bound and the reach bend follow their solved values (12, 12 and 6 rad/s);
  - the hinge is now a trunk angle by the depth, not a hip angle (hinged to a hip angle, the pelvis's way back undid most of each degree, so the solved hinge moved ten times the legs' motion);
  - the gaze holds steady in the world (8 rad/s, the plan's head follower, on its heading too), the lead longer by its lag (0.85 s);
  - the swing keeps a third, within 15°; the alarm counts under 0.25 as none, rising over 0.25 s and falling over 0.6 s.
- **The key poses** (`stagePoses.ts`) and **the stage reader** (`stageBlend.ts`: the side from the face's tilt in trim, held on flat water; the drop from the descent; each rate-limited). Riding: feet 60° / 80°; the knees standing tall at 42° (the plan's 40° left the rear knee at 31–33°); the rear knee's pole 20° toward the nose and 10° down from the rear foot's line; the ankle's reach 35°; the hinge 16° frontside, 42° backside (leaning into the face), 21° in the drop; the chest and hips 30°/15° frontside, 55°/25° backside; the lead shoulder dropped 8°; the drop's gaze 15° further down; the drawn hips biased back out of turns (trim toward 0.58, the drop toward 0.42: the owner's call).
- **The arms** (the owner's addendum and reference photo, 2026-10-22): the free hands hang relaxed and close in, at their knees (followed, so the legs' absorption doesn't bob them), elbows soft; the leading arm turns toward the look by at most 20° in a turn; a hand handing over to the physics' point (the water, the face) does so over 0.25 s. Pulled forward from phase 2 for it: none (`snapRaise` and `snapSwing` stay for phase 2).
- **Map and tests:** `trim-frontside`, `trim-backside` and the drop's new numbers; every riding stance's feet (45–70° / 65–90°, medium) and rear knee in (10–35°, low). `stanceTargets.test.ts` now reads all four surfers, Regular and Goofy. Struck from its known misses: `trim.kneeFront`, `compress-frontside.kneeFront`, `compress-frontside.lowHand`. New ones, each with why: `compress-backside.kneeFront` (0.8° over, the filter's lag), `extension-backside.kneeRear` (trim's taller knees: phase 2's bottom-turn pose), `snap-*.weight` (0.01–0.02 over, the filter's lag), `pop-up.*Elbow` (surfers 3 and 4, seen once all four were read: phase 3's flat hands).

**Results** (the body film, 120 Hz, the page's pipeline on the test humanoid from 0.8 s while standing; before is `d8c6e88f`, the plan's §2 table):

| Measure | Before | After | Target |
|---|---:|---:|---:|
| Chest roll 3–5 Hz, compress mid-turn | 1.90° | 0.38° | ≤ 0.6° |
| Chest roll 3–5 Hz, weave | 0.75° | 0.23° | ≤ 0.25° |
| Head yaw 3–5 Hz (against the board), weave | 1.18° | 0.29° | ≤ 0.4° |
| Head yaw 3–5 Hz, rail change | 2.86° | 1.14° | — |
| Lead hand's height about its shoulder 0.5–2 Hz, on the board, weave / compress (the plan's measure, the cue on) | 9.7 / 8.2 cm | 5.4 / 4.1 cm | ≤ 3 cm |
| The hands' height about their shoulders 0.5–2 Hz in the world, the cue off: weave / compress / pumping / rail change | 7.1 / 8.2 / 6.2 / 9.2 cm | 4.1 / 2.4 / 0.2 / 4.4 cm | ≤ 3 cm |
| The hands' swing pumping (`handSwing`, standing) | 7.9 / 5.9 cm | 2.3 / 2.9 cm | ≤ 4 cm |
| The cue's own part per full alarm (on less off, against the alarm the arms show), rail change | 20.5 cm (r 0.78) | 37 cm (r 0.97) | ≥ 25 cm |
| The drawn lean against the drawn state's own below 1 Hz: lag / RMS miss | — | 0.08–0.11 s / ≤ 2° | ≤ 0.12 s / 3° |
| The balls of the feet sliding (straight, compress, pumping, chop, rail change) | — | ≤ 0.05 cm | ≤ 1 cm |
| Switch spikes (the film's blend tests) | — | under the tests' 6 rad/s and 2 m/s | no worse |

The 3 cm for the hands holds mid-turn and pumping. Weaving and through a rail change the body banks 40° each way with the relaxed arms held to it, and the leading arm turns toward the look: 4.1 and 4.4 cm with the cue off. The film's weave also nears a fall at every reversal (the balance reserve falls to 0.1–0.2; it falls at 1.94 s), so with the cue on its arms rise for real threats. The plan's measure (on the board's frame, the cue on) mixes the board's 40° roll into the height; the world frame with the cue off is the one the tests pin.

**Stances** (surfer1 Regular, as the plan's §5 read them; all four surfers and Goofy agree within a few degrees; the hands from the arms stills):

| Stance | Knees F / R | Feet | Trunk | Chest | Arms lead / trail | Weight | Hands above the knees F / R |
|---|---|---|---:|---:|---|---:|---|
| Trim frontside, before | 63° / 24° | 70° / 85° | 14° | 27° | 48° / 45° | 0.70 | 0.54 / 0.60 m |
| Trim frontside, after | 57° / 46° | 60° / 80° | 28° | 32° | 32° / 20° | 0.58 | 0.23 / 0.28 m |
| Trim backside, before | 66° / 28° | 70° / 85° | 7° | 20° | about the same | 0.71 | 0.53 / 0.59 m |
| Trim backside, after | 63° / 57° | 60° / 80° | 23° | 54° | 32° / 19° | 0.60 | 0.24 / 0.27 m |
| Crouched trim (the owner's photo), before | — | 70° / 85° | — | — | spread | — | 0.37 / 0.53 m |
| Crouched trim, after | 94° / 90° | 60° / 80° | 49° | 38° | 55° / 46° | 0.58 | 0.00 / 0.05 m |
| The drop, before | 81° / 83° | 70° / 85° | 34° | — | 49° / 48° | 0.53 | 0.39 / 0.49 m |
| The drop, after | 92° / 109° | 60° / 80° | 32° | 35° | 46° / 29° | 0.42 | 0.09 / 0.11 m |

The rear knee caves in 31–34° toward the nose from the toes (the rear foot's 10° and the pole's 20°: in the map's 10–35°). **Open (low confidence):** the lead shoulder. Read against the level, as a picture shows it, it sits 9° (frontside) and 16° (backside) *above* the trailing one: the chest turned toward the nose and bent over the toes about the feet's line raises it, and the 8° side bend doesn't make up for it. Hinging toward where the chest faces (as the stage figures do) fixed it, but carried the hips back past trim's weight range (backside 0.42, the drop 0.33); it is left for phase 2's chest-led turns, with the weight kept.

**Stills and clips** (in `docs/research/animation-realism-2026-10-22/`):
- `05-drop-phase1.jpg`, `06-trim-phase1.jpg`: today against the target figure, beside the plan's `05-drop.jpg` and `06-trim.jpg`;
- `17-arms-before.jpg`, `17-arms-after.jpg`: crouched trim, trim frontside and backside, and the drop, from three-quarter front slightly above (the owner's photo's angle) and from the nose (`character-sheet.html?realism&arms&label=…`);
- `phase1-motion-before.mp4`, `phase1-motion-after.mp4`: trim, a bottom turn and a weave with the weight back on surfer2 (`scripts/browser/motion-clip.mjs … "trim,bottom-turn,weave"`).

### Phase 2: turns and riding moves (frontside and backside)

- [x] Key poses: `bottom-*`, `top-*`, `cutback-*`, `pump-*`, `tube-*`, `kick-out` (§5.10–5.15). The pump is trim's pose with an arm channel, not a pose of its own.
- [x] The anticipation cascade (head → chest → hips, delayed), replacing the instant twist.
- [x] The lead arm aimed at the target; `snapRaise` and `snapSwing` gone (the redirect's key poses set the arms); the pump's arm channel.
- [x] The tube's rail grab: a new IK hand point. Map entries `tube-frontside` and `tube-backside`, read with a recipe crouched past the pumping depth under a test curl.
- [x] The kick-out's trigger (§6), and its recipe: climbing with S and a nose-up board.

**Targets (Phase 2):**

| Stage | Measure | Range | Source | Confidence |
|---|---|---|---|---|
| bottom turn, frontside | knee flexion | 90–110° (both) | de Sousa 2022; Rapture | medium |
| bottom turn, frontside | lean / trunk | 30–50° / 40–60° | Forsyth 2024; Gudauskas | low |
| bottom turn, frontside | chest | −10° to 25° | the research | low |
| bottom turn, frontside | lead arm / lead elbow | 60–110° / 150–180° | de Sousa 2022; Gudauskas | low |
| bottom turn, frontside | lower hand | 0.05–0.3 m | de Sousa 2022 | medium |
| bottom turn, backside | knees | 90–110° | de Sousa 2022 | medium |
| bottom turn, backside | lean | −50° to −30° | Forsyth 2024 | low |
| bottom turn, backside | chest / head | −15° to 15° / 100–140° | Hobgood; the research | low |
| bottom turn, backside | trunk on the deck | −20° to 20° | Hobgood | low |
| top turn, frontside | knee flexion front / rear | 50–80° / 40–70° (front ≥ rear) | the research | low |
| top turn, frontside | chest / head | 70–110° / 110–160° | Bali Surfing Camp; the research | low |
| top turn, frontside | arms / lead elbow | 30–70° / 90–140° | the research | low |
| top turn, frontside | weight | 0.25–0.35 | Rapture | medium (physics, phase 5) |
| top turn, backside | chest / head | −60° to −20° / −40° to 10° | Hobgood | low |
| top turn, backside | arms | 30–70° | the research | low |
| cutback, frontside | lean | −75° to −40° | Forsyth 2024 | low |
| cutback, frontside | chest / hips / head | 90–150° / 40–80° / 140–180° | Rapture; WSL flow | low |
| cutback, frontside | weight | 0.30–0.35 | Rapture | medium (physics) |
| cutback, backside | lean | 40–75° | Forsyth 2024 | low |
| cutback, backside | chest / hips / head | −120° to −60° / −50° to −20° / −150° to −100° | Rapture | low |
| pump, compressing | knees | 70–90° | Rapture | low |
| pump, compressing | arms | 30–55° / 15–40° | Rapture | low |
| pump, compressing | weight | 0.40–0.50 | Rapture | medium (physics) |
| pump, extending | knees | 30–50° | Rapture | low |
| pump, extending | arms | 15–40° | Rapture | low |
| pump, extending | weight | 0.50–0.60 | Rapture | medium (physics) |
| tube, frontside | rear knee flexion / its height off the deck | 120–150° / ≤ 0.15 m | decision 12 | low |
| tube, frontside | trailing wrist to the heels' rail | ≤ 0.08 m | decision 12 | low |
| tube, frontside | lead arm toward the nose | 40–80° | Stab (Jordy Smith) | low |
| tube, backside | rear knee | 125–155° | eos.surf | low |
| tube, backside | trailing wrist to the toes' rail | ≤ 0.08 m, within 0.25 m of the front foot | eos.surf | low |
| tube, backside | chest | 40–70° | Healey | low |
| kick-out | weight | 0.15–0.30 | coaching | low |
| kick-out | knee flexion front / rear | 20–45° / 60–90° | coaching | low |

**Motion tests:**
- the cutback's sequence: the head's yaw peak leads the chest's by 0.1–0.35 s, and the chest's leads the hips';
- the pump's arm elevation correlates with the pelvis' vertical velocity (≥ 0.5) and the alarm stays under 0.2;
- no frame-to-frame arm flip when a weave reverses (step 3's lesson: `stanceMotion.test.ts`).

**Shot list (Phase 2):**
1. Beach, medium, chase camera: on a right, bottom turn (Shift on the drop, then Space with the steer at the base), up the face, then top turn (S with the steer back). *Look for:* compressed at the base with the lead arm pointing up the face; at the top the head and lead shoulder swing back first; arms close.
2. The same on a left (backside). *Look for:* the shoulders square to the lip and the look over the front shoulder.
3. Point, medium: two cutbacks frontside and two backside. *Look for:* the head turning first, then shoulders, hips and board; the lead arm sweeping back.
4. Wave Pool: 5 s of pumping (Shift on and off about once a second). *Look for:* small arm pushes in time, no arms flying up.
5. Padang or the Reef, a size that barrels: a tube frontside and one backside, crouching fully under the curl (E in the frontside tube). *Look for:* the dropped back knee, the rail grab, the lead arm at the exit.
6. Any spot: ride up the face with S and steer over the back. *Look for:* the kick-out pose, and whether the board swings over (if not, that is phase 5).

**M1 cost:** key-pose blending of at most 3 active poses, plus one more hand IK in the tube: +0.02 ms per surfer, measured.

**Built (phase 2, 2026-10-22, `claude/anim-p2`).** Drawn only: the physics, its points and every rider test are untouched (commits 9497c612, bac168c9, 239b33bc, 78935ee2).

- **The key poses** (`stagePoses.ts`), each frontside and backside, Goofy the mirror:
  - *the bottom turn*: frontside the trunk stopped at 58° from vertical (it folded 65–74°), hinged 30–40° to dig the rail, the chest 28° before the cascade turns it on to the wave, the lead arm along the look about level, long; backside the chest about square to the toes (−25° before the cascade), hinged no further over the toes than Hobgood's bound, the rear knee bent past 90°;
  - *the top turn and snap*: on the heels' rail frontside (the toes' backside) with the weight back, the knees standing tall at 60° and the hips 0.08 m lower (compressing through the redirect), the chest 72° (backside −35°) and the look led 50° (backside 100°) back to the pocket, the leading hand dropped low in front, the trailing arm swung round in front to 55° at most;
  - *the cutback*: the redirect low (crouched), the chest 95° (backside −75°), the hips 55° (−40°), the look 75° (130°), the lead arm long and low along the look;
  - *the tube*: the rear knee's pole turned 55° down to the deck; frontside the back hand to the heels' rail beside the back foot, backside the trailing hand on the toes' rail by the front foot (the pig-dog), the lead arm forward and low at the exit, the spine's bend to a reaching hand held to 20° (a full bend folded the trunk onto the thighs);
  - *the kick-out*: the arms out for balance, the trailing arm swung, no higher than the shoulders.
- **The stage reader** (`stageBlend.ts`): a turn's rail is its side (a bottom turn frontside on the toes', a redirect frontside on the heels'); its kind is read from the face once one has been read (turning away from it is a redirect), and on flat water from the weight back; a bottom turn carried on round with the weight going back stays one (the climb). The cutback is the redirect crouched; the tube the pelvis 0.31–0.40 m below standing (past Compress's 0.3 m: only the deep tuck under a curl reaches it; the plan's 0.195 m is the pumping crouch's, which Compress passes too); the kick-out climbing faster than 0.5 m/s, nose up past 15°, the weight back, slowing and straight. Each weight swings at its rate (0.25–0.35 s); the side holds through a turn (read only under 0.12 of a full turn: at 0.3 a carve's first roll flipped it).
- **The cascade** (`RIG_DETAIL.cascade`): the head leads by the look (0.6 s of the yaw rate, or the pose's lead in a redirect where that is further; the gaze fed its own 0.25 s lag; turning, the look starts from where the board points), the neck's reach counted from where the chest is turning to; the chest and the hips follow at 4 and 2.8 rad/s, each led into the turn by 0.3 s and 0.12 s of the yaw rate. This replaces the instant twist (`twistGain`, `hipsTwistShare`, `snapTwist`).
- **The arms**: the leading arm as pointer (`StandingPose.lead`: toward the look within the pose's reach, lifted toward its elevation, held in a turn's reversal so it does not drop to the knee between turns); the alarm's spread held to 50° with the elbows bent in a redirect and the tube; the pump pushes the free arms down up to 4° as the body rises, never lifting them (the plan's ±10° drew 4.7 cm of swing pumping against the motion filter's 4 cm).
- **From phase 1:** the lead shoulder drawn low (`RIG_DETAIL.shoulderBend`: the upper spine bent up to 8° toward the nose, then up to 22° sideways, as far as shows the pose's drop against the level: a chest open toward the nose and hinged over the toes raises the lead shoulder, by geometry); the front hand forward along the line (0.15 m ahead of the knee in trim, the photo's).
- **The recipes:** the redirects read once the drawn body has come round (top turn 1.5 s, snap 1.4, cutback 1.5: the head, chest and hips each behind the last); the tubes crouched fully under a test curl (`CoveredWater`), read at 1.6 and 1.5 s; the kick-out climbing a 15° face with S, read at 1.1 s.
- **Map and tests:** the phase-2 targets above in `stanceMap.ts` (the bottom turn's trunk 40–60°, chest and lead arm; the top turn's and snap's knees compressing, chest, head and arms at chest height; the cutbacks; the pump's knees and arms; new `tube-frontside`, `tube-backside`, `kick-out`, `cutback-backside`), and the gauge's tube measures (`rearKneeDeck`, `trailHeelRail`, `trailToeRail`, `trailFromFront`, `leadToNose`). `stanceTargets.test.ts`: struck off `compress-backside.kneeFront` and `snap-*.weight`; the physics' own misses of medium confidence (the turns', the pump's and the extension's weights, ten) are now pinned as phase 5's. New tests: the cascade's order in a cutback, frontside and backside, Regular and Goofy; the bottom turn's lead arm; the arms at chest height or below in the redirects; the top turn's chest; the tube's rear knee and the pig-dog's grab; the pump's push (correlated −0.5 or less with the body's rise, never lifting, the alarm under 0.2); the stage reader's rails, kinds, tube, kick-out and rates.

**Results** (surfer1 Regular unless said; the sheet's tiles; before is phase 1's code on the same recipes):

| Stance | Measure | Before | After | Target |
|---|---|---:|---:|---|
| Bottom turn, frontside | trunk / lead arm / chest | 65° / 57° / 22° | 59° / 82° / 22° | 40–60° / 60–110° / −10–25° |
| Bottom turn, backside (1.1 s, still coming round) | chest / arms | 70° / 27°, 21° | 31° / 62°, 22° | −15–15° / — |
| Top turn, frontside | knees F / R | 26° / 18° | 66° / 68° | 50–80° / 40–70° |
| Top turn, frontside | chest / head / arms | 48° / 84° / 67°, 53° | 73° / 125° / 29°, 43° | 70–110° / 110–160° / 30–70° |
| Top turn, backside | chest / arms | 4° / 61°, 51° | −25° / 52°, 58° | −60 to −20° / 30–70° |
| Cutback, frontside | chest / hips / head / arms | 63° / 21° / 100° / 95°, 72° | 82° / 30° / 129° / 41°, 33° | 90–150° / 40–80° / 140–180° / — |
| Cutback, backside | chest / arms | −43° / 80°, 79° | −36° / 68°, 55° | −120 to −60° / — |
| Pump, compressing / extending | arms | 27°, 16° / 38°, 28° | 36°, 16° / 47°, 25° | 30–55°, 15–40° / 15–40° |
| Tube, frontside | trunk / chest / rear knee off the deck | 91° / −155° / — | 55° / −24° / 0.01–0.05 m | — / — / ≤ 0.15 m |
| Tube, backside | rear knee / trailing wrist to the toes' rail, from the front foot | 115° / — | 125° / 0.04–0.06 m, 0.07–0.10 m | 125–155° / ≤ 0.08 m, ≤ 0.25 m |
| Kick-out | arms | 30°, 11° | 73°, 42° | out for balance |
| Trim, frontside / backside | lead shoulder drop (as a picture shows it) | −9° / −16° | +8° / +3° | 3–15° |
| Crouched trim (the owner's photo) | lead shoulder / front hand ahead of the knee | −20° / 0.08 m | −5° / 0.18 m | lead lower / forward along the line |

- **The cascade** (the test humanoid, the surfer sheet's films; the parts' world turn rates' peaks): the cutbacks, the head 0.28 s (frontside) and 0.10 s (backside) before the chest, the chest 0.05 s and 0.25 s before the hips; the top turn 0.15 s and 0.10 s; the bottom turn 0.33 s and 0.03 s, the hips about with the chest. Before, the chest and the hips turned together and the head trailed the chest's neck reach.
- **The motion filter kept** (the body film, 30/60/120 Hz): the chest's 3–5 Hz roll mid-turn 0.34–0.37° (≤ 0.6°; phase 1 0.38°), weaving 0.07–0.08° (≤ 0.25°; 0.23°), the head's yaw weaving 0.30° (≤ 0.4°; 0.29°); the hands' swing pumping 3.9 cm at most (≤ 4 cm); every other film test as before. The weave's chest roll is read on a 1.1 s stretch (it falls at 1.94 s): there the band was set by the slow turn's shape more than the board's wobble (with the filter off it read lower than on), so it moved with the turn poses' hinge (0.19–0.52° between 30° and 40°); the bottom turns' hinge settled it at 0.07°.
- **Stances still short, and why:** the backside readings of the map's moments are mid-way round (the chest 0.5 s behind its pose by design: the head first); the redirects' heads backside (the plan's −40° to 10° top, −150° to −100° cutback) are 20–30° and 8–21° (looking back past the tail is beyond the look's lead: the target needs the turn's destination, not a lead); the cutback's hips 30° (40–80°); the tube frontside's back hand reaches 0.2–0.5 m short of the heels' rail (behind a trunk folded over the toes in the deep tuck); the kick-out's knees front 79° / rear 27° (the body stands upright over the nose-up board: the physics' weight).

**The video check** ([`phase2-video-check.md`](../../research/animation-realism-2026-10-22/phase2-video-check.md), stills `phase2-video-check.jpg` and `phase2-video-check-redirect.jpg`, each with its `-before`): the owner's reel (barefoot_surf, a frontside top turn, goofy, on a left) against the game's, step by step. Matched: 1 (the drop's pose), 3 (the bottom turn), 4 (the head first), 6 (the redirect led by the head), 7 (the leading hand dropped, the rotation to the curl, the compression), 8 (the crouch and the look). Needs physics: 2 (the lean before the rail bites), 5 (the extension climbing, the weight back), 7 (the back foot holding the rail: the top turn's weight; the redirect off a face), 8 (the weight onto both feet; the near fall out of the redirect). Drawable but not done: the head turning before the board (it needs the steer, local only).

**Stills and clips** (in `docs/research/animation-realism-2026-10-22/`):
- `07-bottom-turn`, `08-top-turn`, `09-cutback`, `10-pump`, `11-tube` and `12-kick-out`, each `-phase2-before.jpg` (phase 1's code) and `-phase2.jpg`; `06-trim-phase2.jpg` and `17-arms-phase2.jpg` (the lead shoulder and the front hand, beside phase 1's `06-trim-phase1.jpg` and `17-arms-after.jpg`). The sheet: `character-sheet.html?realism&only=<id>&gaps=0&when=…`.
- `phase2-motion-before-frontside.mp4` / `phase2-motion-after-frontside.mp4` (the bottom turn, the snap, the cutback, pumping, the weave) and `phase2-motion-before-backside.mp4` / `phase2-motion-after-backside.mp4` (the backside bottom turn, snap and cutback, both tubes, the kick-out), surfer2 Regular: `node scripts/browser/motion-clip.mjs <out> "<recipes>" --bitrate=1200000`.

**M1 cost (this M1, Node):** `PosedBody.update` over the same drawn frames (compress, trim backside, the drop, a snap): surfer2 0.104 ms a frame on phase 1's code, 0.093 ms on phase 2's (0.090 ms with a cutback, a tube and a top turn added); the test humanoid 0.054 → 0.050 ms. No measurable cost: the cascade's and the shoulder's followers and the pose blends (at most eight blends of twenty-odd numbers) cost about what the old twist's and snap's paths did.

**Shot list for the owner (Phase 2, as built):**
1. Beach, medium swell, the chase camera: a right (frontside for a regular foot). Drop crouched (Shift), bottom turn at the base (Space with the steer onto the toes), up the face with S, then steer back onto the heels with S held (the top turn). *Look for:* at the base the trunk over the knees, not folded flat, the lead arm pointing along the line about level; as the turn comes in the head turns first, then the shoulders, then the hips; at the top the leading hand drops low in front and the arms stay at chest height or below, the knees bent; the chest and head swing back toward the curl.
2. The same on a left (backside). *Look for:* in the bottom turn the shoulders come square to the lip and the head looks over the front shoulder; at the top the shoulders open toward the tail, the head back to the pocket.
3. Point, medium: two cutbacks frontside and two backside (crouched, S with the steer back toward the curl). *Look for:* the head first, then the shoulders, hips and board, about a quarter second apart; the lead arm long and low, sweeping back with the chest; no arms thrown up.
4. Wave Pool: 5 s of pumping (Shift on and off about once a second). *Look for:* the hands pushing down a little as the body rises, never lifting; no arms flying up.
5. Padang or the Reef, a size that barrels: a frontside tube (crouch fully under the curl, E for the hand in the face) and a backside one. *Look for:* the back knee dropped to the deck; backside the trailing hand on the shoreward rail by the front foot (the pig-dog); the lead arm forward and low at the exit. Frontside the back hand reaches toward the outside rail but may not get there (an open item).
6. Any spot: ride straight up the face with S held and let the board go over the back. *Look for:* the arms out for balance (no higher than the shoulders); whether the board swings over the back (if not, that is phase 5).
7. Any spot, trim frontside and backside for 3 s each (the phase-1 fix carried in): the lead shoulder lower than the trailing one, the front hand forward along the line ahead of the front knee.
8. Goofy (in the settings): one frontside top turn on a left, filmed beside the reel (barefoot_surf): the eight steps of `phase2-video-check.md`.

**Risks:**
- *Stage weights flickering in rail changes:* rate limits and hysteresis, tested over a weave.
- *The aimed lead arm whipping as the target turns* (step 3's 150° in 0.12 s): it reads the filtered yaw rate and an `armRate` limit.
- *The tube pose is never reached when the curl's `covered` misses:* only then does the depth pass 0.195 m, so the pose cannot misfire in the open face.
- *The kick-out misfires on a steep climb that isn't a kick-out:* it needs S held (the weight back) and the speed falling.

### Phase 3: the take-off and the water

- [x] The pop-up: hands flat (§5.6); the landing's planted feet (§5.7); the hinge in `landing`.
- [x] Paddling: the lower chest, legs together, the scan; the catch (§5.4, §6); the lineup sit (§5.2, §6).
- [x] The prone kick-out's path (§5.15): tried, not kept (below); the duck-dive review (§5.5).
- [x] **Gauge (lying, sitting):** `chestLift` (the sternum's line above the deck), `handAhead` (the entry ahead of the head), `pullDepth`, `legsApart`, `sitTrunk`; and `hipsDeck`, `handsApart`, `handsBack`, `palmFlat`.

**Targets (Phase 3):**

| Stage | Measure | Range | Source | Confidence |
|---|---|---|---|---|
| pop-up push | hands apart | 0.40–0.50 m | Borgonovo-Santos 2021 | high |
| pop-up push | hands at the lower ribs | 0.05–0.15 m behind the torso point | Rapture | medium |
| pop-up push | palm flat (hand normal to the deck's) | ≤ 30° | Rapture | low |
| pop-up push | elbows at peak force | 90–130° (kept) | Borgonovo-Santos 2021 | medium |
| pop-up push | head pitch | −10° to 20° | Rapture | low |
| landing | feet (both) | 35–55° | Rapture | medium |
| landing | width | 0.53–0.80 m | Borgonovo-Santos 2021; Seixas 2023 | medium |
| landing | knee flexion | 70–100° | Borgonovo-Santos 2021 | low |
| landing | weight (kept) | 0.64–0.80 | Borgonovo-Santos 2021 | medium |
| landing | foot slide after touchdown | ≤ 3 cm | — | — |
| paddling | chest lift | 5–15° | Sheppard 2013; Rapture | medium |
| paddling | hand entry ahead of the head | 0.15–0.20 m | Rapture | medium |
| paddling | pull depth | 0.15–0.25 m | Rapture | medium |
| paddling | legs apart | ≤ 0.15 m | Rapture | low |
| catch | chest lift | 20–35° | Rapture | low |
| catch | head pitch (down) | 20–40° | Rapture | low |
| sit | trunk from vertical | ≤ 15° | coaching | low |
| sit | knee flexion | 60–100° | coaching | low |
| sit | hips over the deck | 0.05–0.15 m | coaching | low |

**Shot list (Phase 3):**
1. Beach, small: paddle out 20 s, then stop and wait 5 s. *Look for:* chest down, legs together, the look-up; then the rider sits up; then lies down when paddling again.
2. Beach, medium: catch three waves, the chase camera. *Look for:* the last strokes, the chest lift, the pop-up with flat hands and planted feet, eyes forward.
3. The same, side camera: the same, to see the landing's feet at 45°.
4. Duck-dive two waves. *Look for:* the head tuck.
5. Ride, then lie down (Enter) to kick out prone.

**M1 cost:** the lying and sitting poses replace the prone solve's targets. The foot-swing arc is about two IK solves for 0.5 s. Budget +0.02 ms.

**Risks:**
- *The sit hides the first stroke:* the paddle's hands come from the physics, so as the sit blends out (0.4 s) the first stroke shows partly drawn. Accepted; check it in shot 1.
- *Planted landing feet against the physics' jump:* the drawn feet travel an arc for 0.48 s. `PointInertia` stops blending the feet in landing; the switch tests must still pass.
- *The catch cue isn't on the wire:* remote catches come from speed and pitch and may start later.

**Built (phase 3, 2026-10-21, `claude/anim-p3`).** Drawn only: the physics, its points and every rider test are untouched; the pop-up's phase timings are exported from `AttachedRider` for the drawing to keep time by them (commits 4a7af926, 22996086, c289c25f, 3cb614e6, 76b9feac, 912c322f; stills and clips 77ecdeeb).

- **The push** (`TAKE_OFF.hand`, `press`): the hands planted flat on the deck beside the drawn lower ribs (0.4 of the way from the hips to the neck along the lying trunk) as the push begins, 2 cm inside the rails, the back of the hand up and the fingers toward the nose, placed over 0.2 s (faster read as a jump). The chest is pushed up by the arms: the elbows' included angle runs from 60° at 15 % of the push to straight at 80 % (Borgonovo-Santos 2021), and the chest's line is solved on the skeleton so the shoulders are that far from the planted hands, the lower back lifting half of it (hips low, chest high), within 35° over the physics' own trunk and never lower than it (eased into either over 5°), no faster than 5 rad/s. The hips are held where they lay until 30 % of the push; from 65 % the trunk hands over to the physics' own, and the straight arms lift the hands off the deck (the reach begins).
- **The landing** (`STAGE_POSES.landing`, `TAKE_OFF.touch`): each foot swings on a minimum-jerk arc from where its lying ankle was to its stance point, lifted 0.10 m (front, between the hands) and 0.05 m (back, across the stringer), both landing together at 90 % of the reach, at 45° (the owner's call, §10.3); `PointInertia` no longer blends the landing's feet, so nothing glides on into standing. Over the swing the feet, the toes and the elbows turn from how they lay, the knees drive forward and up under the chest before turning out, the facing turns from the deck to the stance's, and the hands come from where the push left them (about the shoulders) to low and forward in front of the hips. The landing's key pose hinges the trunk (the drop's, deep 40°), weighs the drawn hips back from the physics' 0.74 toward 0.62 only past it, and keeps the eyes forward; standing, it and the feet settle into riding's (60° / 80°) over the physics' 0.8 s settle (`StageWeights.landing`).
- **Paddling** (`LYING_POSES.paddle`, `scan`): the lower back at 4° and the upper chest at 17° over the deck (the trunk's line reads 14–15°: lower, the shoulders came down to the physics' recovery height and the arm, folding tight past them, read as a jump at a 30 Hz display, as in step 8); the head neutral, its look 20° below the deck, lifting to −2° for a 0.6 s look-up every eight strokes (`WaterStages`, counted at each hand's reach on the board, so a remote surfer's poses count alike); the feet 0.08 m apart; no kick.
- **The catch** (`LYING_POSES.catch`, `cobra`, `WATER_READING.catch*`): stroking with the take-off cue (the snapshot's slot, now read: local only), or faster than 2.5 m/s nose down past 5° (remote surfers): the chest up 30° (shallow) to 44° (the cobra, by the nose-down pitch from 5° to 15°), the head down 30–32°, the arm reaching all of its length; held a second after the condition goes, through the push (whose pose takes over), in and out over 0.3 s.
- **The lineup sit** (`SIT`, `WATER_READING.sit*`): prone, not stroking, no duck, the hands at rest at the rails and the board slower than 0.5 m/s for 2 s: the drawn body sits up over 0.8 s, the hips on the deck (0.09 m) over the prone body's mass, the trunk 8° forward of the vertical in the world (the board's roll and pitch move only the legs and hips), straddling with the thighs out over the rails and the shins in the water, the hands on the thighs within a soft elbow, the head scanning a fixed 5 s cycle (85° over one shoulder, then 70° across to the other: the drawn state carries no set to follow), the chest turning a third of it. It lies down over 0.4 s on a stroke, a sweep of a hand, a duck or the board passing 0.8 m/s (the hysteresis). The leash follows the drawn feet.
- **The duck-dive** (the review, §5.5): unchanged, the head tucked 79° down toward the deck, the back knee on the tail with the other leg kicked up (`03-duck-dive-phase3.jpg`). One fix found by it: the paddle's low chest hands over to the press within its first 0.15 (still handing over as the hands slide to straight arms at 0.3, the switch's blend swung the arms across the body).
- **The prone kick-out** (§5.15, the chest first, then the hands to the rails, then the knees): tried and not kept. Leading the chest down while the physics' hips still stood high swung the arms through their shoulders at 23–27 rad/s (phase 2: 7), and a drawn path for the hands from held out to the rails did too. The lie-down keeps the physics' order (the parts together), the lying pose easing in over its last 40 %.
- **Map and tests:** the gauge's new measures and the phase-3 targets (`pop-up-hands` read once the hands are placed, 0.22 s in; `pop-up` at 0.3 s; `landing`; `paddling` read over a stroke of each arm, its entry and depth at their extremes; `catch` down a 15° face; `sit` after 2 s still), sourced (Sheppard 2013; Rapture's paddle technique, pop-up, catching unbroken waves and board control). `stanceTargets.test.ts`: struck off `landing.stanceWidth`, `landing.weight` and `pop-up.leadElbow` / `trailElbow` (surfers 3 and 4); pinned `paddling.pullDepth` and `pop-up-hands.handsApart` (below). New `waterStages.test.ts`: the reader's sit and lying down (each cause, within 0.4 s; the speed's hysteresis), the catch (the cue while stroking; speed and pitch; held a second; the cobra by the pitch), the look-up every eight strokes and none in the catch; drawn on a real session, the sit's shape, the scan, the press's planted hands, straight elbows by 80 % and low hips, and the landing's soles and feet. The film: the pop-ups' switches checked blended only (the rig itself now carries them: raw 9 rad/s at 60 Hz against 108–131 at a fall or a lie-down); the glide's breathing read with the sit held off; the stand-up test's states carry the clock as the page's do.

**Results** (the map's readings, the four surfers Regular and Goofy, mean (range); before is phase 2's code on the same recipes and gauge):

| Stage | Measure | Before | After | Target |
|---|---|---:|---:|---|
| Sit | trunk from vertical / knees flexed / hips over the deck / legs apart | lying: 63° / 0° / 0.10 m / 0.29 m | 11° / 75° / 0.09 m / 0.62 m | ≤ 15° / 60–100° / 0.05–0.15 m / slightly apart |
| Paddling | chest lift / legs apart / head (look below the deck) | 21.6° / 0.29 m / 17° | 14.7° / 0.10 m / 20°, −2° looking up every 8 strokes | 5–15° / ≤ 0.15 m / neutral |
| Paddling | hand's entry ahead of the face / pull depth | 0.16 m / 0.23 m | 0.17 m / 0.25 m | 0.15–0.20 / 0.15–0.25 m |
| Catch (15° face) | chest lift / head pitch down | 19.4° / 17° (no stage) | 27.2° / 31° | 20–35° / 20–40° |
| Push, hands placed | hands apart / behind the trunk's middle / palm from flat | 0.47 m / −0.14 m (ahead) / 36° | 0.37 m / 0.07 m / 0° | 0.40–0.50 / 0.05–0.15 m / ≤ 30° |
| Push, 0.3 s | elbows / chest lift / palm | 89° (82–97) / 26° / 43° | 99° (97–100) / 50° / 0° | 90–130° / chest high / ≤ 30° |
| Landing (0.45 s) | width / weight / feet | 0.41 m / 1.07 / 81° / 87° | 0.63 m / 0.71 / 45° / 45° | 0.53–0.80 m / 0.64–0.80 / 35–55° |
| Landing | knees flexed front / rear; trunk; arms | 118° / 96°; 0°; 46° / 47° | 112° / 92°; 29°; 49° / 27° | 70–100° (low); —; low and forward |
| Landing → standing | each sole's middle after touchdown; the balls of the feet | glides 25–26 cm (20 cm still to go at the landing's end) | 1.9 cm (the settle's turn about the mid-foot); 4.2 cm | ≤ 3 cm |
| Switches (the film, blended, 60 / 120 Hz) | pop-up: bone spike / joint spike | under 6 rad/s, 2 m/s | 2.9 / 2.3 rad/s; 1.0 / 0.6 m/s (crouched 5.4 rad/s at 120 Hz) | < 6 rad/s, < 2 m/s |

The riding stances, the motion filter and the turns are as phase 2 left them: every stance target, film and rig test as before; `PosedBody.update` over phase 2's riding frames unchanged.

**Stills and clips** (in `docs/research/animation-realism-2026-10-22/`):
- `01-lineup-sit`, `02-paddle-catch`, `03-duck-dive` and `04-pop-up`, each `-phase3-before.jpg` (phase 2's code, the same tiles) and `-phase3.jpg`: the sit, paddling, the catch, the push and the landing against the target figures (`character-sheet.html?realism&only=<id>&gaps=0&when=…`; the catch tile now down a 15° face).
- `phase3-strip-takeoff`, `phase3-strip-sit`, `phase3-strip-paddle`, each with `-before`: eight stills each, captioned (`character-sheet.html?motion=<recipe>&strip=…`).
- `phase3-motion-before-water.mp4` / `phase3-motion-after-water.mp4` (paddling with its look-ups; sitting up after 2 s still, the scan, a stroke lying down, paddling off) and `phase3-motion-before-takeoff.mp4` / `phase3-motion-after-takeoff.mp4` (the catch down a 15° face into the pop-up and the landing; a ride let go with Enter, lying back down), surfer2 Regular: `node scripts/browser/motion-clip.mjs <out> "paddle,sit-and-paddle"` and `"catch-pop-up,lie-down"`.

**M1 cost (this machine, Node):** `PosedBody.update` over recorded drawn frames (surfer2): the water's (paddling, the sit, the catch into the pop-up and the landing) 0.061 ms a frame on phase 2's code, 0.072 ms on phase 3's: prone 0.052 → 0.056 ms, the push 0.055 → 0.140 ms (the press's solve on the skeleton, twelve poses of the hips and spine a frame, for 0.72 s), the landing 0.065 → 0.077 ms; standing 0.084 → 0.089 ms; phase 2's riding frames 0.092 → 0.093 ms. Measured, not a gate.

**Missed, and why (pinned):**
- `paddling.pullDepth` (0.25–0.26 m for 0.15–0.25): the drawn wrist now follows the physics' hand to the bottom of its pull (`HAND_DEPTH` 0.25 m under the deck beside the rail, the board rolling with it); phase 2's higher chest left the arm short of it (0.23 m). Phase 5, with the stroke's rate and length.
- `pop-up-hands.handsApart` (0.37 m for 0.40–0.50): the hands flat 2 cm inside the rails beside the drawn lower ribs, where this 1.78 m board is 0.42 m wide: the physics lays the prone body far back (its pelvis 0.37 m from the tail; the same placement leaves the shins and feet over the tail, not "the toes just off it"). Borgonovo-Santos' 0.46 m is the board's width at the chest.
- The landing's front knee (low confidence, not pinned): flexed 112° for 70–100°, over the physics' landing pelvis, low (0.48 m over the deck) and forward (0.74 of the stance).
- The catch's weight back on a steep face, and the board's trim with a seated rider (the nose higher as the body sits back): the physics' prone body and its place (phase 5). The scan's head follows a fixed cycle: the drawn state carries no set to follow.
- The hands' roll through the landing can turn fast where the forearm passes the deck's normal (the hand bone is outside the film's measured bones): watch it in shot 3.

**Shot list for the owner (Phase 3, as built):**
1. Beach, small: paddle out 20 s, then stop and wait 5 s, then paddle again. *Look for:* the chest low over the board, the legs together, a look up every eight strokes or so; once still for 2 s, the rider sits up: straddling, upright, the legs in the water, the head turning over each shoulder; at the first stroke the rider lies straight back down (within half a second; the first stroke shows partly drawn).
2. Beach, medium: catch three waves, the chase camera. *Look for:* the last strokes with the chest up and the head down as the board tips onto the face; the hands placed flat beside the ribs, the chest rising first with the hips low, then the hips up and the hands off the deck; the feet landing together, planted, not sliding in.
3. The same, side camera. *Look for:* the front knee driving through under the chest, both feet landing at about 45°, then turning to about 60° front and 80° back over the next second; no foot gliding along the deck; the arms low and forward, not out.
4. Duck-dive two waves. *Look for:* the head tucked toward the deck, the back knee on the tail; the arms straight onto the rails without swinging across the body.
5. Ride, then lie down (Enter) to kick out prone. *Look for:* the lie-down as before (the drawn chest-first path was not kept); the low paddling chest easing in at its end.
6. Online with a second player, if handy: the other surfer sitting when idle, paddling chest down, and their pop-up (their catch starts only from speed and pitch: the cue is not on the wire).

### Phase 4: falls and recovery

- [x] The reflex layer (§7) in the rig's fallen branch; the shape by cause (read on the page from the ride's status, not a snapshot slot: below).
- [x] Surfacing; the swim's sight toward the board.
- [x] The reel and the climb-on key poses (§6); the hold read on the page (`HoldReading`) in place of `SWIM_BITS.holding`; `climbOn` blended over 0.4 s.
- [x] **Owner's call:** wire flag 128 "recovering" (Q20).

**Targets (Phase 4)** (new fallen measures read from the drawn joints over a recipe):

| Measure | Range | Source | Confidence |
|---|---|---|---|
| reflex onset after the separation | 0.12–0.25 s | protective-reaction latency | low |
| shield: both wrists to the head, from 0.4 s (not reaching for the board) | ≤ 0.25 m | Rapture | medium |
| loose curl, tumbling: knee flexion | 60–110° | Rapture | low |
| over the falls: knee / hip flexion | ≥ 100° / ≥ 90° | Rapture | low |
| surfacing: wrists above the head while it rises | 0–0.25 m | Rapture | medium |
| reel: trunk from vertical | ≤ 30° | coaching | low |
| reel: the hands alternating along the cord | 0.8–1.5 pulls a second at the leash's 0.6 m/s | `Leash.ts` | low |
| climb-on: both wrists within 0.15 m of the near rail's middle (|z| ≤ 0.3 m) at the grab | — | Rapture | low |
| climb-on: the chest over the deck before the legs swing on | — | Rapture | low |
| the ragdoll still reads: each drawn wrist within an arm's reach of its physics point | — | — | — |

**Shot list (Phase 4):**
1. Beach, medium: three wipeouts on purpose: steer hard off the bottom (to the side), trim W into a steep drop (a pearl), and stall under the lip (over the falls). *Look for:* arms over the head; a different shape each time.
2. One fall off the back: climb with S and lose it.
3. After each: hold Enter to reel and climb on. *Look for:* hand over hand, then both hands at the rail and belly on from the side.
4. Snap the leash (big swell) and swim to the board. *Look for:* the head up to sight it every few strokes.

**M1 cost:** reflex targets on 4 limbs, with no new solves. Budget +0.01 ms.

**Risks:**
- *A reflex fights the ragdoll's own motion* (an arm drawn over the head while the physics' arm is spread): capped at 0.8 weight, and within an arm's reach of the point.
- *The cause misread for remote surfers:* they get the default shape.
- *Reaching for the board near a breaking wave:* the reach is off under a breaking wave.

**Built (phase 4, 2026-10-21, `claude/anim-p4`).** Drawn only: the ragdoll, its points and every physics test are untouched; the page reads what the snapshot lacks, and one wire bit carries the recovery (commits 3209e28b, 7ddb8b20, 25d7d88b, 9a295362, 55f3a207, e4d9d9df, 67225182, 50088d48, 9cd53661; stills and clips fc94787d).

- **The limbs by side** (`FallenSides`, 7ddb8b20): the fall body (`DetachedSurfer`) builds its arm and leg points on the rider's frame with its "left" at the drawn body's right, so each drawn arm reached across the chest for the point of its name for the whole fall (the arms crossed in 44–96 % of fallen frames; a fall from lying down flung both hands over the body at 7.7 m/s). The points now trade places when they lie the other way round across the drawn body, with a margin (0.1 m arms, 0.06 m legs). This was the drawing, not the physics: the 5–8 m/s fling the plan asked about is gone (4.0 m/s, the reflex's own pace).
- **The stages** (`FallStages`, `FALL_READING`): the reflex starts 0.12 s after the fall (the first muscle responses to a sudden fall come at 54–85 ms, the deltoid's at 80: Bisdorff et al. 1999, *J Neurol Neurosurg Psychiatry* 66: 447–455; plus the 40 ms before a muscle moves the limb), the knees bend by 0.4 s and the forearms cover the head by 0.45 s, held until the swimmer has surfaced. The shape by cause: the session's `separation` (over the falls for `impact`, flat for `reef`), else the board's pitch at the fall (a pearl nose down past 25°, off the back nose up past 20°); remote surfers read the motion (slipping back off the board, or lifted with the lip). Tumbling (the drawn spine turning faster than 3 rad/s) curls the body loosely; over the falls, a ball for 1.5 s. Feet first in the air (the pelvis 0.15–0.4 m over the board's centre and falling). Surfacing: rising under water, the forearms crossed overhead; up, treading water upright, looking to the board, then away (a fixed scan: the drawn state carries no wave), then back; calm by the board, the near hand reaches for it.
- **The key poses** (`FALL_POSES`): the cage (the wrists before the face, crossed; the elbows forward and out), the pearl's arms round the head, off the back's arms out and back, the overhead cross, sculling, the legs' bends (brace, curl, ball, pencil, flat, tread, kick), the chin's tuck. Each reflex at most 0.8 of the way over the ragdoll's limb (§7), never past the limb's reach of its physics point (eased in from 0.6 s); the holds (surfacing, the cord, the rail) all of it.
- **Their pace** (9cd53661): each arm blends from the ragdoll's way to the aim through a way kept in the chest's frame (it swung round as the ragdoll's arm came opposite the aim: a standing fall's hands at 6 m/s stopped in a frame, a pearl's at 11); the cause's throw comes in at the shield's pace (in 0.13 s, 15 m/s off the back); the reflex and the hold combine softly; the kept elbows', hands' and ways' turns ease at their limits; the fallen arm comes straight smoothly. The hands now move 3.6–5.9 m/s about the shoulders in the chest's frame from the onset, never stopping dead (a protective arm's pace: the film test below).
- **The reel** (§6): upright in the water (the trunk drawn toward upright over the pelvis, at most 60° off the floating physics' trunk), hand over hand along the line from the chest to the leash's plug, each pull drawing the cord at the leash's 0.6 m/s (1.33 pulls a second), the back foot's hand first; the cord runs from the hand on it (before: always the left hand).
- **The climb** (§6): both hands at the near rail's middle either side of the chest (the rail held while the chest wanders under the board), the elbows back and down; the kick and pull with the chest over the deck facing up; back on the board, the prone pose eases in over 0.4 s, the knees and elbows turning from how they held, the feet planted and swung on over the rail (`PointInertia` no longer blends them).
- **The swim:** the crawl as it was (step 8); the head lifts to sight the board every five strokes (the plan's 4–6), within 70° of the heading.
- **The page** (e4d9d9df): the drawn state carries the ride status's `separation` and the player's stance (the snapshot lives in `src/wave`, out of this phase's bounds: a two-line slot there would replace the page's reading). `HoldReading` reads the hold from what the page asks and sees, as `RideSession` grabs: the pop-up key with the chest within 1 m of the board's box takes it (the status shows the board in reach only while the key is up), released diving, 2.3 m from the board, or once a newer status finds the board free and in reach (agrees with the session on more than 99 % of fallen frames).
- **The wire** (67225182): flag 128 "recovering", in the water reeling the leash in or holding the board; another player's swimmer holds the board with its chest within 0.7 m of the board's box, else reels (its cord from the right hand: the stance is not sent).
- **Map and tests:** the gauge's `wristsToHead`, `wristsOverHead`, `railGrip`; the phase-4 targets (`fall-side`, `fall-tumble`, `fall-over`, `surfacing`, `reel`, `climb-grab`; `fall-pearl` and `fall-back` read for their tiles) with the Rapture pages on safety, staying calm underwater and recovering after a wipeout, and Bisdorff 1999. `stanceTargets.test.ts`: three before-misses struck; `fall-side.wristsToHead` met on all four surfers. New `fallStages.test.ts` (each shape's trigger, the onset, surfacing and bobbing, the look, the reel's flicker, the hold and the pull, the rail kept, the reach), `fallReflexes.test.ts` (the shield by 0.5 s and held, each arm within reach of its point and on its side, the curl, a shape per cause, feet first, surfacing overhead, treading, the reel hand over hand with the back foot's hand first, both hands at the rail, the chest over the deck before the feet swing on, the sight every five strokes), `holdReading.test.ts`, wire flag 128 (`poseCodec`, `ownPose`, `RemoteSurfers`, `RemoteSurferViews`); the film (`bodyFilm.test.ts`): the switches of over the falls, a fall from lying down and climbing back on blended out at 60 and 120 Hz, the fling gone, each fall's hands at a protective pace, another player's reel and climb from the flag.

**Results** (surfer2, Regular and Goofy alike unless noted; before is phase 3's drawing on the same recipes and gauge; the stance map's reading moments):

| Stage | Measure | Before | After | Target |
|---|---|---:|---:|---|
| Fall to the side (0.5 s) | wrists to the head | 0.47 m (the four surfers' mean 0.49) | 0.19 m (all four ≤ 0.25) | ≤ 0.25 m (medium) |
| Fall to the side | the shield first in (wrists within 0.25 m) | never | 0.40 s | onset 0.12–0.25 s; from 0.4 s |
| Tumble (0.7 s) | knees flexed / wrists to the head | 46° / 0.41 m | 79° / 0.17 m | 60–110° |
| Over the falls (0.6 s) | knees / hips flexed | 46° / 38–44° | 113° / 93–110° | ≥ 100° / ≥ 90° |
| Pearl (0.45 s) | wrists to the head / hands apart | 0.55 m / — | 0.21 m / 0.38 m (round the head) | arms forward round the head |
| Off the back (0.45 s) | hands apart | — | 0.96 m (out and back) | arms out to the sides behind |
| Surfacing (rising) | wrists over the head | −0.44 m (below) | +0.19 m | 0–0.25 m (medium) |
| Reel | trunk from vertical / the cord's hand | 84–85° (floating flat) / the left, always | 25–26° / alternating, 1.33 pulls a second, the back foot's first | ≤ 30° / 0.8–1.5 a second |
| Climb (2.2 s after the grab) | the wrists' middle from the near rail | 0.38 m (Regular) / 0.32 m (Goofy) | 0.15 m / 0.06 m | ≤ 0.15 m |
| Climb on | chest over the deck, then the feet | the prone pose in a frame | chest first; the feet on within 0.45 s | chest over before the legs swing on |
| Fall from lying down | fastest hand in the first 0.5 s | 7.7 m/s (crossing the body) | 4.0 m/s (3.5 before the reflex's onset) | a protective pace |
| The falls, 0.12–1 s | the hands about the shoulders, chest's frame | 3.0–4.8 m/s (the ragdoll alone) | 3.6–5.9 m/s, steps ≤ 2.9 m/s a frame | — |

Riding, the take-off and the water are as phase 3 left them: every stance target, film and rig test as before.

**Stills and clips** (in `docs/research/animation-realism-2026-10-22/`):
- `13-falls`, `14-fall-shapes`, `15-surface-swim`, `16-reel-climb`, each `-phase4-before.jpg` (phase 3's drawing) and `-phase4.jpg` (`character-sheet.html?realism&only=<id>&gaps=0&when=…`).
- `phase4-motion-before-falls.mp4` / `phase4-motion-after-falls.mp4` (to the side, a pearl, over the falls, off the back) and `phase4-motion-before-recovery.mp4` / `phase4-motion-after-recovery.mp4` (surfacing, the reel, the climb), surfer2 Regular: `node scripts/browser/motion-clip.mjs <out> "fall-side,fall-pearl,fall-over,fall-back"` and `"surfacing,reel,climb"`.

**M1 cost (this machine, Node):** `PosedBody.update` over 2502 recorded fallen frames (the falls, surfacing, the reel, the climb on, swimming; surfer2): 0.052 ms a frame on phase 3's drawing, 0.058 ms on phase 4's (+0.006; budget +0.01). Measured, not a gate.

**Missed, and why (pinned for phase 5, batch C, or the owner):**
- *The fall's direction is the physics':* the fall body starts on the board's frame, facing its nose, arms at the board's ±x; to the side at an arm's length and not over the nose is `DetachedSurfer`'s placement and throw (phase 5, batch C). Only its sides were the drawing's (fixed).
- *No righting moment:* the ragdoll floats flat and can hang head down for 2–4 s; the surfacing tile's body is inverted (trunk 112° from vertical) with the arms overhead along it. Treading is drawn upright (≤ 60° off the physics' trunk) over its pelvis; the physics' buoyancy is phase 5.
- *The physics' climb is slow:* the board rolls on its side under the pull for 1–17 s and holds the chest 0.35 m off; the drawn grip follows the rail (0.15 m Regular at 2.2 s, the board on its side in the tile). The reel stops at the leash's 0.8 m reach.
- *The cause and the hold are not in the snapshot:* read on the page (the status's separation, `HoldReading`); a slot in `SurfZoneRunner` would make them exact (out of bounds here). The reef's flat shape comes from the cause only (the drawn state carries no depth).
- *The next-wave look is a fixed scan* (the drawn state carries no wave); the remote breathing head is unchanged (phase 5); a remote surfer's stance is not sent (its cord runs from the right hand).
- *Residual blips:* 0.5 s into a fall the body flips over entering the water (10 rad/s) and the drawn hands trail it for a few frames (up to 5 m/s); the climb film's reel resuming by the board (the near hand handing over) moves one hand 7 m/s for four frames.

**Shot list for the owner (Phase 4, as built):**
1. Beach, medium: three wipeouts on purpose: steer hard off the bottom (to the side), W into a steep drop (a pearl), stall under the lip (over the falls). *Look for:* the forearms coming up over the head within half a second and staying there under water; the legs reaching down feet first in the air; a pearl's arms forward round the head, over the falls a ball (knees to the chest); no arm crossing the body or snapping into place.
2. One fall off the back (climb with S and lose it). *Look for:* the arms out and back first, then the shield.
3. After each fall, wait to surface. *Look for:* rising with the forearms crossed overhead; once up, treading upright, looking to the board, then away, then back.
4. Hold Enter to reel and climb on. *Look for:* hand over hand along the cord, your back foot's hand first, the cord running from the hand on it; then both hands at the rail's middle, belly on from the side, the legs swung on, the prone pose easing in (no snap).
5. Snap the leash (big swell) and swim to the board. *Look for:* the crawl as before, the head lifting to sight the board every five strokes or so.
6. Online with a second player, if handy: their reel and climb drawn (flag 128); their falls take a shape from the motion (slipping back, or lifted with the lip), else to the side.

### Phase 5 (later, separate): the physics gaps, owner ride-checked

These change the physics, so they change the feel. Each goes only when the owner asks, as its own measured step: the physics-posture rule of the riding-body plan, re-checking the riding tests the owner allows.

| Gap | Measured | Target | Where | Note |
|---|---|---|---|---|
| Trim and W weight forward | the pelvis 0.64–0.70 (flat water); on the real wave the pressure is right but the pelvis sits 0.1–0.25 forward | 0.50–0.62 | `riderPosture.ts` standing places, `TRIM_SHIFT` | step 6 (2026-10-02) found that more reach sinks the tail |
| Top turn weight | 0.65 on the real wave | 0.25–0.45 | the trim's reach, the tail's sinking | pinned `it.fails` (the snap test) |
| The pump's and the extension's weight | 0.76 / +0.30 | 0.50–0.60 / 0.35–0.45 | the same | |
| Paddle stroke rate | 60 a minute per arm | 36–54 (Nessler 2019); a left-plus-right cycle every 2–3 s cruising (Rapture) | `ARM_CYCLE`, `PULL_SHARE` (the paddle speed is calibrated on them) | changes the paddle's speed: needs a ride check |
| Board roll per stroke | 7° | 27–45° (Nessler 2019) | the prone roll model | |
| Stroke length | 73 cm | 97 cm (Nessler 2015) | `REACH`, `HIP` | |
| The kick-out's pivot | — | the nose over the back under a hard back foot | the snap's physics | only if phase 2's shot 6 shows it missing |
| The deep U (snaps and cutbacks stalling on the static face) | pinned `it.fails` | | the turn's physics | open since 2026-09-27 |
| Upright backside tube | — | — | — | decision 12: later |
| The paddle's pull depth | 0.25–0.26 m under the waterline (drawn, following the physics' hand) | 0.15–0.25 m (Rapture) | `HAND_DEPTH` | with the stroke's rate and length (phase 3's pinned miss) |
| The prone body's place along the board | the pelvis 0.37 m from the tail: the feet past the tail, the lower ribs where the board is 0.42 m wide (the push's hands 0.37 m apart) | the toes just off the tail; the hands 0.40–0.50 m apart | the prone posture's places | moves the board's trim: a ride check |
| The catch's weight back, and the seated rider's trim | the prone body's place and mass | the weight back on a steep face; the nose up as the body sits | the prone posture, a seated posture | phase 3 draws the closest honest version |
| The landing's pelvis | 0.48 m over the deck, 0.74 of the stance forward: the front knee flexed 112° | knees 70–100° | the landing posture's places | |

---

## 9. Mocap and photographs

- **No CC0 surfing mocap exists.**
  - CMU's Graphics Lab database, subject #134 "Skateboard Motions" (15 trials at 120 fps: lean turns, pumps, push turns), is "free for all uses", with no formal licence or CC0 deed: http://mocap.cs.cmu.edu/search.php?subjectnumber=134. Use it as reference only: timing of pumps and lean turns.
  - The Bandai Namco Research Motiondataset is CC BY-NC 4.0, with no surfing.
  - Mixamo is royalty-free but not CC0, and its raw files can't be redistributed.
- **Photographs are not copied** into the repo. The sheet's reference figures are built from the numbers. The sources' pages are linked in §11, so look there for the photographs.

---

## 10. Where the sources disagree (the owner's calls): decided 2026-10-22

The owner took every recommendation ("all recommended", 2026-10-22). Each call stays below with what the sources said.

1. **Trim knees: about equal, each within 30–70°.** The front bends more only in compressions and landings.
   - Weiß et al. 2024 (one surfer, nine river-wave turns): the front knee peaks 8 % higher (69.8°);
   - Weiss et al. 2025 (seven surfers): the rear knee 51.1° against 44.7° front;
   - SurfDeeper: the front leg straighter;
   - Seixas 2023: the front knee 113.8° included at landing.
2. **The drop's weight on the back foot; the bottom turn's preparation on the front foot.**
   - the research brief: 55–60 % on the back foot on a steep drop (its source page to confirm);
   - the map (de Sousa 2022 preparation; Cornish Wave): 60–75 % front, now the bottom turn's preparation (phase 2).

   The pose's weight is drawn from the physics' pelvis, so this sets the test's range (the drop: 0.40–0.45) and the drawn bias back (phase 1); the weights themselves are phase 5.
3. **Foot angles: 45° on the pop-up's landing, settling to about 60° front and 80° back while riding.**
   - Rapture's stance page: the front foot 20–30° and the back 15–25° off square, so 60–70° and 65–75° to the stringer, with 60 % on the back foot;
   - its pop-up page: both feet at 45°, 60 % front.

   Riding (phase 1): 60° / 80°, the back foot over the fins. The landing's 45° and its settle are phase 3.
4. **Pop-up hands flat beside the lower ribs, 0.4–0.5 m apart** (phase 3).
   - Borgonovo-Santos 2021 measures 0.46 m apart, which is where the rails are at the chest;
   - Rapture: beside the lower ribs, flat.
5. **Wire flag 128 for remote reeling and climbing: yes** (phase 4, §6).

## 11. Sources

**Measured studies:**
- Borgonovo-Santos M, Telles T, Nessler J, de Castro MP, Fernandes RJ, Vilas-Boas JP (2021). Are the kinetics and kinematics of the surf pop-up related to the anthropometric characteristics of the surfer? *Sensors* 21(5):1783. https://doi.org/10.3390/s21051783 (open: https://pmc.ncbi.nlm.nih.gov/articles/PMC7961430/)
  - pop-up 1.20 ± 0.19 s (push 0.71 s, reach 0.48 s); hands 0.46 m apart; feet 0.63 ± 0.10 m apart;
  - the front foot takes 72 % of the landing impulse; elbows from about 70° of flexion to full extension at 80 % of the push.
- Weiß A, Koelewijn A, Masmoudi I, Lluch È (2024). Combining pose estimation and inertial measurement tracking data for a biomechanical simulation of river wave surfing using optimal control. *Proc. 29th ECSS*, Glasgow. https://cris.fau.de/publications/331306594
  - front-leg peaks above the rear's: hip flexion 58.7°, knee 69.8°.
- Weiss A, Lluch È, Masmoudi I, Döllinger M, Heinrich D, Koelewijn AD (2025). Simulating surfing with optimal control: sensor fusion for biomechanical analysis. *Multibody System Dynamics* 66(4):955–975. https://doi.org/10.1007/s11044-025-10071-3
  - seven surfers on a river wave; peak flexion hip 55.0° / 50.0°, knee 51.1° / 44.7°, ankle 21.1° / 18.3° (rear / front).
- Seixas P, Oliveira R, Carita AI, Moreira M (2023). Setting qualitative performance parameters of elite surfing aerial manoeuvres with 360° rotation. *Cuadernos de Psicología del Deporte* 23(2):169–193. https://doi.org/10.6018/cpd.534281
  - landings: base of support 79.2 ± 13.7 cm, front knee 113.8 ± 19.9°, front ankle 32.7 ± 14.5°.
- Forsyth JR, Riddiford-Harland DL, Whitting JW, Sheppard JM, Steele JR (2018). Understanding successful and unsuccessful landings of aerial maneuver variations in professional surfing. *Scand J Med Sci Sports* 28(5):1615–1624. https://doi.org/10.1111/sms.13055
  - landing over the board's centre with the lead ankle dorsiflexed predicts success.
- Forsyth JR, et al. (2024). Understanding the relationship between surfing performance and fin design. *Sci Rep* 14:8734. https://doi.org/10.1038/s41598-024-58387-y (PMC11021506)
  - bottom turn: roll 42°, yaw 99° in 0.96 s; cutback: roll 75°, yaw 152°.
- Sheppard JM, Osborne M, Chapman DW, Andrews M, McNamara P (2013). Technique adjustments influence the performance of sprint paddling in competitive male surfers. *Int J Sports Sci Coach* 8(1):43–51. https://doi.org/10.1260/1747-9541.8.1.43
  - chest down beats chest up; a low arm recovery beats a high one.
- Gosney S, MacDonald L, Parsonage J, et al., Minahan C (2025). Stroke characteristics are associated with sprint-paddling performance in female and male competitive surfers. *Sports Biomechanics*. https://doi.org/10.1080/14763141.2025.2549137
  - glide, pull, push, recovery; longer push and pull distances.
- Furness J, Hing W, Walsh J, Abbott A, Sheppard JM, Climstein M (2015). Acute injuries in recreational and competitive surfers. *Am J Sports Med* 43(5):1246–1254. https://doi.org/10.1177/0363546514567062
  - head and face 13.3 % of injuries: why the falls' shield matters.
- Bruton MR, O'Dwyer NJ, Adams RD (2013). Neuromuscular characteristics of recreational and competitive male and female surfers. *Int J Perform Anal Sport* 13(2):388–402. https://doi.org/10.1080/24748668.2013.11868656
  - the simulated crouch; recreational women crouch shallower.
- Secomb JL, Sheppard JM, Dascombe BJ (2015). Time–motion analysis of a 2-hour surfing training session. *IJSPP* 10(1):17–22. https://doi.org/10.1123/ijspp.2014-0002
  - 52.8 % stationary (the sit), 42.6 % paddling, 2.5 % riding: why the sit and the paddle are the stages seen most.
- Nessler JA, et al. (2015). Wearing a wetsuit alters upper extremity motion during simulated surfboard paddling. *PLoS One* 10(11):e0142325. https://doi.org/10.1371/journal.pone.0142325
- Nessler JA, et al. (2019). Electromyographic analysis of the surf paddling stroke across multiple intensities. *JSCR* 33(4):1102–1110. https://doi.org/10.1519/JSC.0000000000003070
- de Sousa 2022 (thesis), Moreira and Peixoto 2014, Kerr, Gudauskas, Hobgood, Knox, Fanning, Pozzo et al. 1990: as cited in `src/scene/rig/stanceMap.ts` and `docs/research/stance-map.md`.

**Coaching and technique:**
- Rapture Camps, *Learn to surf*, all under https://www.rapturecamps.com/learn-to-surf/:
  - `surf-fundamentals/stance`;
  - `surf-fundamentals/pop-up`;
  - `take-off/pop-up-speed-training`;
  - `surf-fundamentals/prone-positioning`;
  - `paddling/paddle-technique`;
  - `paddling/duck-dive`;
  - `wave-knowledge/catching-unbroken-waves`;
  - `take-off/take-off-techniques`;
  - `take-off/frontside-vs-backside-take-off`;
  - `surf-maneuvers/bottom-turn`;
  - `surf-maneuvers/top-turn`;
  - `surf-maneuvers/cutback`;
  - `surf-maneuvers/speed-generation`;
  - `surf-maneuvers/compression-and-extension`;
  - `surf-etiquette/safety-basics`;
  - `surf-mindset/staying-calm-underwater`.

  There is no page on sitting on the board and none on the kick-out.
- Mauro C (2017). 5 Ways to Find Your Flow. WSL Performance Center. https://www.worldsurfleague.com/posts/269518/performance-center-5-ways-to-fix-your-flow
  - a quiet upper body, the front arm pointing where you go; bend the knees, not the back; turns unwind head → shoulders → hips → knees → toes.
- Stab (2016). The Average Surfer Makes These Common Mistakes Says The World Champ (Barton Lynch). https://stabmag.com/style/the-average-surfer-makes-these-common-mistakes-says-the-world-champ
  - the front arm, head and eyes lead; squat at the knees; the head centred.
- Encyclopedia of Surfing, "pigdog". https://www.eos.surf/encyclopedia/pigdog
  - the rear knee dropped; the trailing hand on the shoreward rail beside the front foot.
- Stab (2018). Technique: Your Backside Tuberiding Is Likely All Wrong (Jordy Smith). https://stabmag.com/style/technique-your-backside-tuberiding-is-likely-all-wrong/
  - the lead arm forward, low and close, not jammed into the wall.
- Healey M (2020). Mark Healey Shares Two Simple Tips To Improve Your Tube-Riding Overnight. The Inertia. https://www.theinertia.com/surf/mark-healey-shares-two-simple-tips-to-improve-your-tube-riding-overnight/
  - on the backhand, the front arm on the face while grabbing the rail, the chest squared to the exit.
  - His hold-down pieces in The Inertia, for the falls' reading, weren't readable from here (403): https://www.theinertia.com/surf/mark-healey-shares-3-essential-breathing-tips-for-hold-downs-and-heavy-surf/
- CMU Graphics Lab Motion Capture Database, subject #134. http://mocap.cs.cmu.edu/search.php?subjectnumber=134 (reference only).

---

## Appendix: the stance sheet

- **View:** `character-sheet.html?sky=midday&realism`, built by `src/dev/realismSheet.ts` with the figures from `src/dev/stageFigures.ts` (tested in `stageFigures.test.ts`).
  - `&surfer=0–3` picks the surfer;
  - `&only=06-trim` draws one image;
  - `&save` posts the JPEGs to a receiver at `http://127.0.0.1:5194/upload?name=…`;
  - `&waterOpacity=` sets how see-through the water is, so the limbs and boards under it read.
- **How today is drawn:** the real rider is simulated (the stance recipes in `ridingPoses.ts`, which gain an `across-back` water for backside, or a ride session for the water's stages), and every step goes through `RiderMotion` and `PosedBody`, as the page draws it.
- **How the targets are drawn:** each figure is built on the surfer's own proportions, from this plan's numbers, on the same board (or the stage's own board: pitched, sunk or level).
- **The tiles' readings** are on `window.realismReadouts`.
- **The images** are in `docs/research/animation-realism-2026-10-22/`:
  - `00-overview.jpg`
  - `01-lineup-sit.jpg`
  - `02-paddle-catch.jpg`
  - `03-duck-dive.jpg`
  - `04-pop-up.jpg`
  - `05-drop.jpg`
  - `06-trim.jpg`
  - `07-bottom-turn.jpg`
  - `08-top-turn.jpg`
  - `09-cutback.jpg`
  - `10-pump.jpg`
  - `11-tube.jpg`
  - `12-kick-out.jpg`
  - `13-falls.jpg`
  - `14-fall-shapes.jpg`
  - `15-surface-swim.jpg`
  - `16-reel-climb.jpg`
- **Regular only:** Goofy is the exact mirror, and the stance tests check both.
