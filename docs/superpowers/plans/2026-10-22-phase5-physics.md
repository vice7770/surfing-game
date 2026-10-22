# Phase 5 Physics Plan (the rider's physics, so the ride matches real surfing)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to build the batches the owner picks. Steps use checkbox (`- [ ]`) syntax for tracking. The owner has chosen (§4): every recommendation, approved.

**Status:** approved. The owner took every recommendation of §4 ("use all recommended", 2026-10-22). Written on branch `claude/anim-p5-plan` (from `main` at e445f06b); it lands in `main` with batch A (branch `claude/phys5-a`). Batch C is built on `claude/phys5-c`; the follow-up (batch D: W2 option (a), the keyboard's rotation, the assists against the water) on `claude/phys5-d`, and W2 (a) finished (batch E) on `claude/phys5-e`.

**The owner's principle (2026-10-22):** "I don't want to change something that is not physics based." The animation stays physics-driven. Where the drawing can't match real surfing without the physics, "we can compromise the physics after." This plan is that step: the animation-realism plan's phase 5 (`2026-10-22-animation-realism.md` §8, "Phase 5").

**What it covers:**
- the "needs physics" steps of phase 2's video check against the owner's reel (barefoot_surf, Jesse Mendes, a goofy frontside top turn on a left; `docs/research/animation-realism-2026-10-22/phase2-video-check.md`): steps 2, 5, 7 and 8;
- the other physics gaps the animation plan lists: trim weight, the pump, paddling, the kick-out, the deep U, the fall from lying down and the remote swimmer;
- phase 2's "drawable but not done": the head turning before the board moves.

**How each item reads:**
- what the owner sees;
- the cause in the physics code, with file and line (`AttachedRider.ts` unless named);
- what real surfing does, sourced;
- two or three options, each with the code change, what the owner would feel, the risk to tuned behaviour and the tests it touches;
- one recommendation.

§1 comes first because one cause sits under five of the items: where the weight goes along the board. §3 groups the items into three build batches, each with a shot list. §4 holds the decisions for a grilling round.

---

## 0. The ground rules

**The bars that pin the feel** (a change that moves one is the owner's call):

| Bar | Where | Today |
|---|---|---|
| The still-water compressed bottom turn: 90° in ≤ 1.15 s keeping > 0.85 of its speed | `compressTurn.test.ts:82–90` | 1.117 s frontside, 1.15 s backside (the owner's decision of 2026-10-07) |
| Compress's sideways pull ≤ 1.41 g (Forsyth 2024's peak) | `TURN_PULL_LIMIT`, `:347` | binding above about 43° asked |
| The projection let go at 12° keeps > 0.83 of its speed; at 25° < 0.74 | `projectionLean.test.ts:76–82` | 0.731 at 25° |
| W/S moves the feet's pressure as far compressed as standing | `stanceLadder.test.ts:83–90` | range > 0.15 |
| The stance map on all four surfers, Regular and Goofy, with the physics' ten medium-confidence misses pinned | `stanceTargets.test.ts:36–47` (`PHASE5_MISSES`) | ten pinned |
| The pinned physics fails (`it.fails`) | `AttachedRider.test.ts:998, 1274, 1433, 1455, 1473`; `bodyFilm.test.ts:638` | the hard turn, Compress at 11 m/s, the snap, the bottom turn into a top turn, the cutback, the paddle's length |
| The catch and the pop-up | the prone grip (`PRONE_GRIP` 0.6, P4f, `:30`), the pop-up's timing (`:603–606`) | the owner's ride |

**The test policy** (memories `owner-playtests-riding`, 2026-10-22): a physics change runs the main suite plus the Wave Pool's `SurfZoneSimulation` tests (`-t "pool"`). `SurfZoneRunner` riding sessions, ride reports, catch reports and bot rides are skipped. The owner rides; each batch ends with a shot list.

**The walls** (tried, measured and reverted; don't retry: memories `p4e-carve-root-cause`, `bottom-turn-check`):
- lean-in feed-forward of the asked bank, reference shaping and rate feed-forward (`lean-in-study.md`);
- `BANK_RATE_GAIN` below 3.6, everywhere or at the entry only;
- rail-first: the feet's rest rolling the rail past the body (`bottom-turn-entry-study.md`);
- rail grip (refuted: a banked planing hull has about no side force along its beam);
- an ankle rest that lays the board flat on the water;
- banking by the felt stance force, by the path's pull or by the board's roll;
- crouch-pulse unweighting for reversals;
- a free pitch pendulum along the leg (P4e's rewrite 3: it chattered between the load cap and flight).

---

## 1. One cause under five items: where the weight goes along the board

The top turn's weight (step 7), the extension's weight (step 5), the weight out of the redirect (step 8), trim's weight and the kick-out's knees all trace to the same three things. A static calculation shows how they add up (a scratch script, not a rider session; constants from the code at e445f06b).

### 1.1 How the physics places the weight

- **The body is carried world-upright along the board.** Standing, the body's frame is the board's heading banked about it (`frame()`, `:2216–2234`: `bodyFrame` at `:2231`, the target at `:2234`). It has no pitch. The correction drive holds the body to that target along the board (`prepare()`, `:1524–1529`). So when the deck pitches nose-up by τ, the pelvis sits 0.78 sin τ m forward of the stance's middle *along the deck*: 0.022 of the stance per degree.
- **The feet's pressure is where the contact's line meets the deck** (`project()`, `:2294–2302`; its share between the feet, `contact.frontShare`, `:2325–2326`). With the body world-upright, the pressure moves ahead of the centre of mass by H × d / n:
  - H = 0.85 m, the centre of mass over the deck (`riderPosture.ts:100`'s places and masses);
  - d is the board's deceleration along its deck in g, gravity's share included;
  - n is the load factor.

  At steady speed d = 0, and the pressure is centred whatever the pitch. A board slowing at 0.3 g puts the pressure 0.25 m ahead: 0.40 of the stance onto the front foot. This is the weight transfer of a braking car, and it is real.
- **The balance lets the pressure wander.** It acts only once the pressure is more than `TRIM_FREEDOM` (0.2 m, `:138–142`) from the stance's middle (`balanceStep`, `:2472–2475`). That is ±0.32 of the stance, so 0.18 to 0.82 on the front foot is left alone. The hook for a pressure the rider wants is there and unused: `copTarget.z` is always 0 (`:881`, `:2452`).
- **W/S moves only the upper body,** by `TRIM_SHIFT` 0.25 m (`:470`, `:2482–2484`, applied at `updatePosture`, `:2426–2430`). The legs stay put, so the centre of mass moves 0.795 × 0.25 = 0.20 m. That is 0.32 of the stance.

### 1.2 The calculation

The pressure is the feet's share on the front foot. The pelvis is its place between the ankles, the stance map's `weight` today.

| Case | Pressure today | Pelvis today | Pressure, W2 (§1.4) | Pelvis, W2 |
|---|---:|---:|---:|---:|
| Trim at steady speed, deck 6° nose-up | 0.50 | 0.63 | 0.50 | 0.63 |
| Trim at steady speed, deck 12° nose-up | 0.50 | 0.76 | 0.50 | 0.76 |
| Bottom turn shedding 0.18 g, no W | 0.74 | 0.61 | 0.66 | 0.50 |
| Climbing, slowing 0.2 g, no S | 0.77 | 0.82 | 0.66 | 0.68 |
| Climbing, slowing 0.2 g, full S | 0.45 | 0.42 | 0.45 | 0.42 |
| Top turn, half S, 0.15 g | 0.54 | 0.52 | 0.54 | 0.52 |
| Top turn, full S, 0.3 g | 0.59 | 0.32 | 0.46 | 0.15 |
| Top turn, full S, 0.45 g (the static face) | 0.79 | 0.42 | 0.48 | 0.03 |
| Snap on a wave, full S, 0.1 g | 0.32 | 0.28 | 0.32 | 0.28 |
| Down the face, speeding up 0.2 g, no input | 0.23 | 0.33 | 0.34 | 0.47 |
| Kick-out recipe: full S, deck 20° up, slowing 0.3 g | 0.59 | 0.53 | 0.46 | 0.36 |

What the table says:
- **The pelvis reads the deck's pitch, not the weight.** The planing board's 0.67–0.74 that phase 1 drew at 0.58 (`stagePoses.ts:169–170`) is a deck 7–11° nose-up under a world-upright body. The pressure there is centred. The physics-posture study found the same on the real wave: the feet's pressure matches the coaching in trim (0.59), descending (0.56) and the bottom turn (0.74), with the pelvis 0.1–0.25 ahead (`2026-10-02-physics-posture.md`).
- **The top turn's measured 0.53–0.65 were read at half S.** The stance map's top turn uses trim −0.5 (`ridingPoses.ts`, `top-turn-*`), and so did the autopilot. The Beach's 0.65 at half S fits a carve slowing about 0.25 g. At full S on a wave the pressure is already 0.32 (70/30 back). The snap, read at full S, already meets the map (phase 2 struck `snap-*.weight` off).
- **Full S falls short only where the board slows hard.** That means a decelerating carve, a climb, and above all the static test face, which sheds 0.45 g and gives nothing back. There, 70/30 back needs the centre of mass far behind the middle: 0.21 m at 0.1 g, 0.30 m at 0.2 g, 0.38 m at 0.3 g and 0.51 m at 0.45 g. That is a lean 14–31° behind the force line through the middle. S reaches 0.20 m, and the dead zone hides the rest.

### 1.3 What real surfing does

- **The weight a surfer feels is the feet's pressure,** and they place it by moving the hips. The coaching's 60/40 and 70/30 describe that pressure: Rapture's stance and top-turn pages (top turn about 70/30 on the back foot); SurfDeeper; Cornish Wave (trim 0.50–0.62); de Sousa 2022 (the bottom turn's preparation 60–75 % front, its final phase "weight to the back foot").
- **Slowing loads the front foot unless the surfer leans back.** That is plain mechanics: the contact's force must decelerate the body.
- **Weight back sinks the tail.** It moves gravity behind buoyancy, and the board rotates nose-up until the centre of buoyancy has moved back under it (the Exploratorium's surfing physics). A planing hull's trim angle is a compromise between friction and lift drag (Hendricks 1969). So a tail held down slows the board, which is why the snap is a short push.
- **On a real wave the board slows little.** Bottom turns and cutbacks keep 0.88–0.95 of their speed (Forsyth et al. 2024, cited at `CARVE_CARRY`, `:349–352`), because the wave feeds them. So the 0.1 g row is the real one, and the 0.45 g row is the static face's.
- **Weiß et al. 2025** (seven surfers on a river wave): the muscle forces are higher in the front leg. The authors read it as the front leg carrying the weight and the rear leg's moments stabilising. The differences were not significant.

### 1.4 The options (they serve items 2.2, 2.3, 2.5, 2.6 and 2.9)

**W1: weight is the feet's pressure (measurement and plumbing, no physics change).**
- *Change:*
  - the stance map's `weight` reads the physics' `contact.frontShare`, low-passed over 0.3 s (the coaching's sustained feel), sent to the drawing in a new local snapshot slot (`RIDER_SNAPSHOT`, `SurfZoneRunner.ts:154`, `:166–182`);
  - the pelvis stays as its own measure (`hipsOver`);
  - the recipes that read weight run at steady speed: a towed board, as the pop-up recipe is, or a face whose slope balances the drag. Flat water's own drag loads the front foot (the physics-posture study: read at one instant on flat water, the pressure missed more, 42 against 39);
  - remote surfers draw nothing from it.
- *Feel:* none.
- *Risk:* none to the physics. The map's weight rows read differently, so `PHASE5_MISSES` is re-pinned.
- *Tests:* `stanceTargets`, `stanceMap`, `stanceGauge`; the snapshot's layout tests.

**W2: W/S sets the pressure the rider holds (physics: the balance's target).**
- *Change:* in `balanceStep` (`:2450–2475`), standing only:
  - `copTarget.z` = trim × `TRIM_PRESSURE` × half the stance (provisional 0.4), so S holds 0.30 on the front foot, W 0.70 and nothing 0.50;
  - `TRIM_FREEDOM` 0.2 → 0.1 m;
  - `TRIM_SHIFT` stays as the feed-forward;
  - the landing keeps today's (the pop-up's 72/28 forward landing);
  - the reach, `STANDING_SHIFT.z` 0.25 m, can stay. In the calculation it binds only at 0.45 g.
- *Feel:*
  - S is the back foot at any speed: in a top turn the board pivots on its tail. Held, the nose lifts, and the board slows and sinks (physics: decision 4);
  - with no input, the board's own decelerations move the weight less. The bottom turn reads 0.66 on the front instead of 0.74, still the preparation's 60–75 %; the climb 0.66 instead of 0.77; the drop 0.34 instead of 0.23. The rider re-centres more, as a surfer does;
  - W runs the board flatter and faster.
- *Risk:*
  1. **The balance loop along the board.** Moving the body moves the pressure the other way first: its own acceleration, up to `STANDING_SHIFT_ACCELERATION` 3 m/s² (`:394–398`), shifts the pressure by H × 3 / g = 0.26 m. Today's 0.2 m zone hides that; a 0.1 m zone could ring in pitch. A fast unit probe comes first (§3, batch A, task 2). If it rings, the balance reads a longer-smoothed pressure (`COP_SMOOTHING` 0.05 s → 0.2 s).
  2. The tail sinks sooner under S (the pinned snap).
  3. The board's pitch under a centred pressure changes its drag. Re-measure the still-water bar (it sits on its 1.15 s backside limit) and `projectionLean`.
  4. The 1.41 g cap is sideways: unaffected. Prone, the catch, the push and the landing: unaffected (their branches are unchanged).
- *Tests:* `stanceLadder` (a larger W/S range), `compressTurn`, `projectionLean`, `pumping` (the hull's load under a pump moves), `cutback.test`, `leanOut`, `AttachedRider.test`'s standing block, `stanceTargets` (re-pinned, with W1).

**W3: the body carried along its force line (physics, research-sized).**
- *Change:* the target along the board follows the low-passed specific force, as the leg's load already does (`prepareLeg`, `:1699–1704`), instead of the world's vertical, with W/S's shift on top. The body then leans back against a slowing board by itself: 17° behind the deck's normal at 0.3 g.
- *Feel:* the most like a surfer. The pressure sits exactly where W/S put it, whatever the board does.
- *Risk:* high. The board's acceleration is partly the rider's own push: the P9 lesson, where banking by the felt stance force exploded. It needs the carve lab's plant along the board first.
- *Tests:* everything standing.

**Recommendation:** W1, then W2 with a 0.1 m zone. W3 is not for now.

---

## 2. The items

### 2.1 Leaning before the rail bites (reel step 2)

**Seen:** in the reel the surfer leans toward the wave at the flat, before the bottom turn. In the game the lean comes only as the board banks.

**Cause:**
- **The lean starts at the steer.** The asked bank is `steer × RAIL_RANGE`, eased in over `REFERENCE_TIME` 0.05 s (`prepareBank`, `:1583–1585`). Nothing leans before the player steers.
- **The physics already leans the body first.** Steering into a lean the body lags, the feet hold their rest at nothing and the upper body's swing throws the body in (`:1594–1600`; `swingStep`, `:1613–1627`). The ankle then drags the board's roll after the body (`:1603`). But the rail follows within about 0.05 s, and the pull 0.04 s after it (`rail-control-study.md`), so the two read as one.
- **The swing that throws the lean rolls the upper body the other way,** by its reaction (`:1616`). It is drawn at 0.35 of the swing (`SWING_DRAWN_CHEST`, `:440`; `swung`, `:1301–1306`), and phase 1 kept a third of that within 15°. So at a turn's start the drawn chest tips slightly *out*.
- **The lean-in is slow,** with a time constant of about 0.49 s (`BANK_GAIN` 7.4, `BANK_RATE_GAIN` 3.6, `:223–224`). The board has turned only 13° after 0.6 s (memory `bottom-turn-check`). So the body does lean well before the board visibly turns. And the drawn lean trails the physics' bank by 0.08–0.11 s (phase 1's filter).

**Real surfing:**
- Rapture's bottom turn: look and lean into the turn at the flat, then drive off the rail;
- WSL flow (Mauro 2017): head, shoulders, hips, knees, toes;
- the lean is the body falling into the turn, held by the turn's pull. A bicycle steers out to lean in (the game's own rail-change study);
- Forsyth et al. 2024: 99° in 0.96 s, so the lean is in within about 0.3 s.

**Options:**
- **A. No physics change: the player's timing, and a lead the eye can read.**
  - *Change:* steer at the flat. The drawn head, inside shoulder and lead arm turn and drop into the turn as soon as the body's bank starts to move. Its rate is read from the drawn points, the same for local and remote surfers, which is item 2.12's lead.
  - *Feel:* none. *Risk:* the cascade's and the motion filter's drawn tests only. *Tests:* `stanceTurns`, `causeFilter`, the body film.
- **B. The braking curve (physics, designed and measured, not built: `rail-control-study.md`).**
  - *Change:* the balance brakes the lean on √(2A·e) at A = 1.5 rad/s² instead of a straight line. The body leans 29° by 0.5 s (23° today). The deep U reaches 56° by 1.0 s (46° today), and 99° 0.12 s sooner.
  - *Feel:* a quicker lean-in, a slightly sharper bottom turn, and more falls in rail changes.
  - *Risk:* it fixes two pins (the hard turn, Compress at 11 m/s) and breaks six tests (the rail change from a carve at 8 m/s, the held rider settling, four drawn, online and HUD tests). On the Canyon's waves it changed nothing measurable (falls 72 against 75, rides of 3 s or more 14 against 18).
  - *Tests:* those six, plus `compressTurn` (the still-water bar may improve).
- **C. A rail-angle controller (physics, research):** the rail leads the body by a small angle held below its bite, so the pull builds first and the body falls in inside it. This is the lean-in study's last lead. It needs the board's yaw build-up in the roll model, and it borders the rail-first wall.

**Recommendation:** A. The physics already leans first. What's missing is an earlier steer (the player's) and a lead the eye can read. B only if the owner's ride finds the lean-in too slow.

### 2.2 Extending on the climb, with the weight back (reel step 5)

**Seen:** 0.3 s after Compress the drawn knees are still 82–111°, where the extension wants 0–30°. On flat water the weight is forward (0.74–0.77).

**Cause:**
- **The ladder's top is the riding stance.** Letting Compress go returns the leg's rest to 0 (`prepareLeg`, `:1709–1711`): the posture's own height, the pelvis 0.78 m over the deck (`riderPosture.ts:100`).
  - By the follower's limits (`LEG_FREQUENCY` 12 rad/s, `EXTEND_ACCELERATION` 15 m/s², `MAX_LEG_SPEED` 2.5 m/s; `:512–515`, `:1714–1722`) the body is half-way up at 0.18 s and within 10 % at 0.29 s (the calculation).
  - So the physics' pelvis is up by 0.3 s, but it never rises past the riding stance, where phase 1's drawn knees stand at 42°.
  - The extension's 0–30° (de Sousa 2022's final phase, the knee at 150° or more included) needs the pelvis over the riding stance by 3–5 cm. With two 0.45 m bones: +2 cm gives 34°, +4 cm 24°, +6 cm straight.
  - The leg has the room: `LEG_EXTENSION` is 0.1 m of travel up (`:427`).
  - The 0.62 depth that the video check read at 0.3 s is then likely the drawn pelvis's follow (16 rad/s) plus flat water's 17° nose-up board, which brings the pelvis 3 cm nearer the deck's plane. To confirm in the build's first test.
- **The weight back is S's alone** (the movement-flow spec: weight is always W/S). Climbing, the board slows, and the pressure moves ahead of the body (§1): 0.77 with no S at 0.2 g, 0.45 with full S. The recipe holds no S (`ridingPoses.ts`, `extension-*`, trim 0). Its pelvis reading adds the 17° pitch: 0.23 m.

**Real surfing:** de Sousa 2022's final phase: the knees and hips extend progressively, the weight goes to the back foot and the rail is released. Rapture's compression and extension: extend up the face, unweighting. The reel, step 5.

**Options:**
- **A. The projection rises tall.**
  - *Change:* letting Compress or the crouch go while planing (the existing `extending`, `:1735`), the leg's rest aims `EXTENSION_TALL` (provisional 0.04 m) over the riding stance, then settles back over about 0.5 s.
  - *Feel:* a livelier release. The board is unweighted a beat longer and its rail lets go sooner, and the rider stands tall up the face, then settles. It may keep a little more speed when timed at the turn's load, as the pumping tests' leg work does.
  - *Risk:* `projectionLean`'s 0.83 and 0.74; the pumping tests' work; the leg's stability (`legSpring` tests); the posture-error guard (inside `LEG_EXTENSION`'s 0.1 m). `extending` lasts longer, so the projection's neutral feet (`:1597–1599`) hold longer.
  - *Tests:* `stanceLadder`, `projectionLean`, `pumping`, `compressTurn`, `legSpring`; the map's `extension-*.knee*` known misses (struck off when met).
- **B. A tall rung while climbing.**
  - *Change:* whenever the board climbs faster than 0.5 m/s with no crouch or Compress held, the rest aims tall.
  - *Feel:* every climb stands tall by itself. It's less a player's move.
  - *Risk:* as A, plus the timing of every pump on a rising face.
- **C. No physics change.** The drawn knees could only straighten by drawing the pelvis higher than the physics puts it, against the principle.

**Recommendation:** A, with W2 (§1.4) so that S holds the back foot on the climb.

### 2.3 The back foot holding the rail at the top (reel step 7)

**Seen:** the top turn's weight is 0.53–0.55 on the front foot on flat water and 0.65 on the Beach, against the reel's and Rapture's 70/30 back.

**Cause** (§1):
- **Those readings were taken at half S:** the stance map's top turn uses trim −0.5, as did the autopilot. At full S on a wave the pressure is about 0.32 already.
- **A carve's deceleration moves the pressure forward** by H × d: 0.59 at full S and 0.3 g, 0.79 on the static face's 0.45 g. Inside the 0.2 m dead zone nothing pulls it back (`:2472`), and S moves the centre of mass only 0.20 m (`:470`, `:2426–2430`).
- **The tail sinks under the weight** (the pinned snap, `AttachedRider.test.ts:1426–1447`). With the pressure aft, the hull trims nose-up until its lift has moved back with it: 40° nose-up within a second, slowing from 6.3 to 1.8 m/s on a face that gives nothing back. That is physics (§1.3), made worse by the static face (item 2.4).

**Real surfing:**
- Rapture's top turn: the weight onto the back foot to pivot, about 70/30;
- the reel, step 7: push the back foot to hold the rail;
- a snap comes round 152° in under a second (Forsyth 2024), so the back foot's push is short;
- on a real wave the board slows little (§1.3).

**Options:** W1, W2 or W3 (§1.4), plus reading the map's top turn and kick-out at full S (decision 5). The recipe is the player's input, not the target.

**Recommendation:** W1 and W2, with the map's top turn read at full S. The tail sinking under held S stays physics (decision 4).

### 2.4 The redirect off a face, and the deep-U stall (reel step 7; open since 2026-09-27)

**Seen:** on the plane face, steering onto the heels with the weight back after a bottom turn spins the board on onto the toes and nearly throws the rider. On the static face, snaps and cutbacks stall. Three tests are pinned: `AttachedRider.test.ts:1433` (the snap), `:1455` (a bottom turn carried into a top turn) and `:1473` (the cutback).

**Cause:**
- **The static face gives nothing back.** Its water is still (`PlaneWater.ts`). A carve sheds about 0.45 g on a 40–48° rail (the snap pin's comment, `AttachedRider.test.ts:1426–1431`). That is the hull's planing drag under load: Savitsky's within 10–25 % (`carve-drag-study.md`), so it is physical. A real top turn rides water moving up the face on a face that feeds it gravity. The game's own waves move 1.1 m/s under their bottom turns (`angulation-study.md`).
- **Carried up the face, the body still leans into the old turn.** The rail follows the body (the ankle, `:1603`; the hull rights about the rider's load line), so the old turn runs on until the body is across. It reaches 160–180°, and the rider falls 0.3–1.1 s later (`AttachedRider.test.ts:1449–1454`). `LEAN_OUT_PULL` helps only under Compress (`:1657`, `:1674–1678`).
- **The rail's bite is judged against the world, not the water** (a lead, found in this read):
  - `prepareBank` reads the board's roll about the heading against the world's vertical (`:1575–1577`). It closes the feet's room past `RAIL_BITE` 48° (`:248`, `:1589–1590`), and the pull's bite likewise (`railAhead`, `:1592`; `compressAssist`, `:1666`).
  - The bog is the water's: the carve lab measured it on flat water, where the two agree.
  - Across a face tilted α, the downhill rail reaches the bite α early and the uphill rail α late. The downhill rail is the redirect's: the heels frontside, the toes backside.
  - On a 30° face near the lip, the redirect's rail has 18° against the water before the feet's room and Compress's pull close.

**Real surfing:**
- Forsyth et al. 2024: top turns and cutbacks come round 152° in 0.96 s, at up to 3 rad/s, on a 2.2 m radius, at about 2 g, on a rail near 75°. On a steep face that roll is partly the face's own tilt;
- the face's water moves up toward the lip.

**Options:**
- **A. Measure first: a moving-face test water (no feel change).**
  - *Change:* `PlaneWater`'s `flow` option (it exists) runs up the face at the wave's surface speed (1–2 m/s). The redirect tests run on it beside the static ones.
  - *Says:* whether the deep U is the static face's.
  - *Risk:* none to the game.
  - *Tests:* new ones; the pins stay.
- **B. The bite against the water (physics).**
  - *Change:* the roll that `RAIL_BITE`, `RAIL_EASE` and `railAhead` read is measured from the water's normal under the board (the sample's normal). The ankle and the body's bank stay against gravity.
  - *Feel:* on flat water, nothing. On a face, redirects and cutbacks on the downhill rail hold more rail and keep Compress's pull. Carving onto the uphill rail (a bottom turn climbing the face) bites a little earlier: a touch softer.
  - *Risk:* falls into turns high on faces (the lean-in study's capsize past the bite, now at the water's bite). The still-water bar and the 1.41 g cap are unchanged (flat water).
  - *Tests:* `AttachedRider.test`'s across-the-face block (six turns back down the face, four partial steers, two holds, three stalls that must not pull); `compressTurn`; `leanOut`; `cutback.test` (a 5° face). The pins may start passing and be struck off.
- **C. A gameplay rule (against the principle):** extend `CARVE_CARRY` to redirects without Compress. Named only so the owner knows it exists. Not recommended.

**Recommendation:** A, then B.

### 2.5 Out of the redirect: the weight onto both feet, and no near fall (reel step 8)

**Seen:** after the plane-face redirect the arms are out (the physics' alarm 0.6–0.8 from 1.8 s), and the weight's place is whatever the physics left.

**Cause:**
- the near fall is item 2.4's failed redirect;
- the weight: coming down the face the board speeds up, and the pressure goes back (−H × a: 0.23 on the front foot at 0.2 g). That is inside the dead zone, so nothing re-centres it.

**Real surfing:** the reel's step 8: weight back onto both feet, compress, look back toward the shoulder.

**Options:**
- **A. Nothing of its own.** Item 2.4 removes the near fall. W2 re-centres the weight to within 0.1 m with no input (0.34 at 0.2 g).
- **B. A re-centre on S's release** (the balance aiming at the middle for a moment). A rule on top of W2, not needed if W2 holds.

**Recommendation:** A. Judge it after batches A and B.

### 2.6 Trim weight (0.58 drawn against the physics' pelvis)

**Seen:** phase 1 draws the hips in trim at about 0.58. The physics' pelvis reads 0.64–0.70 on flat water and 0.74 on the Beach.

**Cause:** the pelvis reads the deck's pitch (§1.1). The planing board rides 7–11° nose-up under a world-upright body. At steady speed the feet's pressure is centred, and on the Beach it is 0.59: within the coaching's 0.50–0.62. The drawn bias (`stagePoses.ts:169–170`, `weight: { pivot: 0.52, keep: 0.3, most: 0.1 }`) moves the drawn hips off the physics' points to meet a pelvis-based target.

**Real surfing:**
- at steady speed only gravity loads the feet, so a surfer stands world-upright too, and the hips sit uphill of the stance's middle along a nose-up deck by the same geometry;
- the coaching's 60/40 is the feet's pressure (Cornish Wave; SurfDeeper);
- Weiß 2025: the front leg's muscles carry more.

**Options:**
- **A. W1:** weight is the pressure. Then the drawn bias goes, and the hips are drawn where the physics' points put them (decision 7).
  - *Feel:* none. *Risk:* the drawn trim's knees: the front foot sits 8–12 cm higher on a nose-up deck, so the front knee bends a little more. Checked on the ride.
  - *Tests:* `stanceTargets`; phase 1's trim tests.
- **B. W2** changes nothing at steady speed.
- **C. Move the posture's places back** (`riderPosture.ts:100`) until the pelvis reads 0.58 on a nose-up deck. The pressure would then sit back at steady speed (about 0.40), against the coaching. Not recommended.

**Recommendation:** A.

### 2.7 The pump reading as a near fall

**Seen:** while pumping, the physics' balance margin dips toward a near fall. The drawn arms and the HUD's balance meter read it.

**Cause:**
- **The margin is one instant's ratio** (`rawMargin`, `:2317–2321`): the free centre of pressure against the feet's edges (±0.13 m across). That centre is the contact's line: the height times the sideways force over the normal force (`:2294–2295`).
- **The pump unloads the feet.** The crouch drops the legs at up to 0.6 g (`CROUCH_ACCELERATION` 6 m/s², `:513`), leaving about 0.4 of the weight on the feet. The same sideways push from the board's wobble then moves the centre of pressure 2.5 times as far, so the margin dips with every pump.
- **It is a read-out only.** It drives the drawn alarm (`renderPoint`, `:1273`) and the HUD's meter (`SurfZoneRunner.ts:939`). No physics decision reads it: falls come from the posture error and the sway (`:2185–2187`).
- Phases 1 and 2's drawn deadband already keeps the pump's alarm under 0.2 (the pump's push test).

**Real surfing:**
- pumping unweights the board on purpose (Rapture, speed generation), and nobody nearly falls;
- biomechanics measures dynamic balance by the extrapolated centre of mass: the position plus the velocity over ω₀, against the support's edge (Hof et al. 2005).

**Options:**
- **A. Leave the physics.** The drawn deadband holds.
- **B. The margin by the extrapolated centre of mass:** the bank's θ + θ̇/ω₀ across, and the sway along (`swayStep` already computes its capture point, `:2557–2563`).
  - *Feel:* the meter and the arms read threats the body is moving into, not unloaded instants. Falls come from the dynamics as today.
  - *Risk:* the meter's behaviour; the balance cue's 25 cm per alarm (phase 1's bar).
  - *Tests:* the body film's alarm and cue tests, the feedback-cue tests, the HUD's meter tests.
- **C. Weight the margin by the load:** an unloaded instant counts less. Simple, but ad hoc.

**Recommendation:** A, unless the owner sees the meter dip or the arms rise while pumping. Then B.

### 2.8 Paddling: the board's roll, the stroke rate and the stroke's length

**Seen:**
- the board rolls 7° through a stroke, against 27–45°;
- 60 strokes a minute a side, against about 50;
- the drawn stroke is 73 cm long, against 97.

**Cause:**
- **The rate:** `ARM_CYCLE` 1.0 s for each arm (`:59`).
- **The length:**
  - the physics' pull runs from `REACH` 0.45 m to `HIP` −0.45 m along the board (`:61–62`): 0.90 m;
  - the drawn hand stops at 73 cm, because the physics' hand enters and leaves 0.7 m from the drawn shoulder, past the arm's reach (`2026-10-04-paddle-swim.md`);
  - real paddlers reach with the shoulder as the board and body roll to the pulling side.
- **The roll:**
  - the prone balance levels the board: the hips shift toward the high rail by 0.4 m per rad and 0.16 m per rad/s (`PRONE_ROLL_SHIFT`, `PRONE_ROLL_DAMPING`, `:134–135`; `balanceStep`'s prone branch, `:2453–2463`);
  - nothing rolls the body toward the pulling arm, so the board rolls only from the hand's off-centre drag.
- **The calibration:** `PULL_SHARE` is set so that a flat-water paddle settles near 1.6 m/s (`:52–58`). Any change re-fits it.

**Real surfing:**
- Nessler et al. 2019, a swim flume on a short board:
  - 36–54 strokes a minute a side over 0.6–2.0 m/s;
  - a roll through each stroke of 27–45°, more on smaller boards;
  - a pitch of 12.3°;
- Nessler et al. 2015: a stroke 970 mm long and 170 mm wide;
- Rapture, paddle technique: a left-and-right cycle every 2–3 s cruising, long reaching strokes;
- Sheppard et al. 2013: chest down.

**The static check:**

| Stroke | Pull share | Mean thrust at 1.6 m/s | Hand's peak speed |
|---|---:|---:|---:|
| Today: a 1.0 s cycle, 0.90 m | 0.32 | 68 N | 4.4 m/s |
| A 1.2 s cycle (50 a minute), 0.97 m | 0.275 | 68 N | 4.6 m/s |

The physics' own model is quasi-steady hand drag.

**Options:**
- **A. Rate, roll and length together** (Nessler measured them as one motion).
  - *Change:*
    - `ARM_CYCLE` 1.2 s cruising, quickening toward 1.0 s as the board catches: the sprint (the pop-up cue, or the board pitched down a face; Nessler's top rate is 54);
    - `REACH`/`HIP` ±0.485 m;
    - `PULL_SHARE` re-fit (0.275), so the cruise still settles at 1.6 m/s;
    - the prone balance's level target swings toward the pulling arm in time with the stroke, an offset sized for a 27–35° roll at cruise.
  - *Feel:* the same cruising speed, with a slower, longer stroke. The board rocks rail to rail. On a wave the strokes quicken. The catch's timing may move (the last strokes' thrust is the sprint's): the owner's ride.
  - *Risk:*
    - the prone roll's stability: a board tipped 15° capsizes in 2 s on its own, and the shift catches it;
    - `PRONE_GRIP`'s calibration (P4f, `:24–30`);
    - the duck-dive pins;
    - the paddle speed bar (1.5–2 m/s, `AttachedRider.test.ts:168`);
    - the take-off cue; `rollerFeel`;
    - the catch.
  - *Tests:* `AttachedRider.test`'s prone block, `takeOffCue`, `duckDive*`, `rollerFeel`, the body film's paddle pin (`bodyFilm.test.ts:638`, struck off when met).
- **B. Rate and length only.** A without the roll. Lower risk, but the drawn length stays short, because the drawn shoulder can't reach without the roll.
- **C. Leave the paddle.**

**Recommendation:** A, in two commits (the rate and the sprint, then the roll and the length), with one ride check.

### 2.9 The kick-out pivot (the knees over a nose-up board)

**Seen:**
- phase 2's kick-out reads the front knee at 79° and the rear at 27°, against a long front leg (20–45°) and a bent rear (60–90°);
- whether the board swings over the back is open (phase 2's shot 6).

**Cause:**
- **The knees are geometry.** The recipe climbs a 15° face with full S. On a deck 20° nose-up the front foot is 0.22 m higher than the rear (0.63 sin 20°). The world-upright pelvis sits about over the stance's middle along the deck (0.53 by the calculation: S's 0.25 m about cancels the pitch's 0.27 m). So the front leg folds to reach its higher foot, and the rear leg straightens.
- **The pressure stays at 0.59 even at full S.** The board slows at about 0.3 g, inside the dead zone.
- **The swing over the back is a yaw on the tail.** Nothing yaws the board but the steer's rail, the hand and the twist rotor. The rotor is pad only (`rotate` is NaN on the keyboard, `:1634`), and its net yaw is about nothing by angular momentum.

**Real surfing:** hard back-foot pressure swings the nose over the back of the wave, with the hips over the back foot and the front leg long (coaching; Rapture names it, with no measured source).

**Options:**
- **A. Nothing of its own.** W2 brings the hips back on the climb (the pelvis to 0.36, the pressure to 0.46), and the knees follow.
- **B. The keyboard's rotation.**
  - *Change:* with no pad rotation, the twist rotor follows the steer's anticipation. This is the movement-flow spec's "keyboard and touch rotate automatically", never built in the physics. The hips then twist the board on its tail.
  - *Feel:* on the keyboard, every steer starts with a small twist. The board's first yaw goes briefly the other way (`twist.test.ts:46`).
  - *Risk:* the still-water bar; the top turns' wrong-way start (the top-turn plan's lesson); the heading hold.
- **C. A kick-out input.** Not physics.

**Recommendation:** A. B only if the ride shows that the board won't swing over.

### 2.10 The fall from lying down flinging the arms (5–8 m/s)

**Seen:** falling off while lying down, the drawn arms fling at 5–8 m/s. The switch spike reads 2.3 m/s at 120 Hz, over its 2 m/s limit (`2026-10-04-paddle-swim.md`).

**Cause:**
- **The fallen body doesn't start from the rider's posture.** `DetachedSurfer.start` (`DetachedSurfer.ts:319–330`) places its seven nodes at its own default body about the rider's centre of mass and frame (`handoffState`, `AttachedRider.ts:1234–1241`).
  - That default body (`SPECS`, `DetachedSurfer.ts:113–121`) has the arms out at ±0.36 m at chest height and the legs side by side.
  - `riderPosture.ts:7` says the parts are shared "so a fall starts from the same body", but the start doesn't use them.
- **Lying, the hands were at the rails or mid-stroke.** At the switch they jump to the default arms, and the drawn blend spreads the jump.
- From standing, the legs jump from along the board to side by side too, also blended.

**Real surfing:** a body keeps its shape at the instant it falls. Momentum and posture are continuous.

**Options:**
- **A. Start from the rider's own body.**
  - *Change:* the nodes start at the rider's part centres (the same order, `RIDER_PARTS`), each with the rider's v + ω × r. The distance joints close the few centimetres between the posture's lengths and the fallen body's own over a few substeps, with the momentum kept.
  - *Feel:* wipeouts start from the pose you were in, so their first 0.2 s look continuous. The tumble after is the same physics.
  - *Risk:*
    - the fallen body's first steps: a joint-limit snap where the posture lies outside the limits (`:218–222`). For example, prone's arms beside the waist;
    - the hold-down, leash and climb-on tests;
    - the reef strike's timing.
  - *Tests:* `DetachedSurfer.test`, `RideSession.test`, `Leash.test`, `BoardRecovery.test`; the body film's fall spikes, which should improve.
- **B. Leave the physics.** Phase 4's reflex layer and the point blend draw it.
- **C. A and B.**

**Recommendation:** A. Phase 4's reflexes are then drawn on a continuous start.

### 2.11 Another player's swimmer turning its head to breathe under water

**Cause:** not physics. The pose on the wire carries no "head under": `SWIM_BITS.under` is local only (`SurfZoneRunner.ts:158`, `:180–181`). The codec's flags byte (`poseCodec.ts:16`, `:51–57`) is full once phase 4's flag 128 is in.

**Options:**
- **A. Derive it where the pose arrives:** the remote head point against the local sea's surface. Each client runs the sea, and `heightAt` already places remote boards (`ownPose.ts:42`). No wire change.
- **B. A wire bit:** a new flags byte, which changes the wire format.
- **C. Leave it.**

**Recommendation:** A.

### 2.12 The head turning before the board moves (phase 2's "drawable but not done")

**Answer: plumbing, not physics.** The physics answers the steer within a substep (the asked bank, `:1583–1585`), and the body's bank moves first (the swing). The drawing gets neither the steer nor the asked bank: they are not in `RIDER_SNAPSHOT` (`SurfZoneRunner.ts:154`) and not on the wire (`ownPose.ts:36–62`).

**Options:**
- **A. Lead from the body's bank** (the drawn points).
  - *Change:* the cascade's head lead (`HumanoidRig.ts:211–230`, `:615–625`, `:1505`) reads the bank's rate as well as the yaw rate.
  - *Why it works:* the bank's rate shows within about 0.1 s of a steer. The swing's 200 N·m on the leaning body gives about 4 rad/s², 0.2–0.4 s before the board's yaw builds.
  - *Feel:* none. It works for local and remote surfers alike, with no wire change.
  - *Tests:* the cascade's order tests, the motion filter's.
- **B. The asked bank on the local snapshot.** `bankReference` is a physics state, put in a new slot. The head moves at the key press, 0.05–0.1 s sooner than A. Remote surfers would need a wire byte (the flags are full), or keep A.
- **C. The keyboard's rotation from the steer** (item 2.9 B). That is physics: the twist is already drawn (`HumanoidRig.ts:624–625`, `:1505`), but it is local only.

**Recommendation:** A.

---

## 3. The build batches (ordered by payoff for the reel's top turn)

Each batch is its own PR from `main`, merged only when the owner says so in the turn. Each runs `tsc`, the main suite and the Wave Pool's `SurfZoneSimulation` tests, and ends with the owner's ride. The cost on the M1 is measured and reported, never a gate: a few more numbers per substep, nothing measurable expected.

### Batch A: the top turn's weight and height (reel steps 5, 7, 8; items 2.2, 2.3, 2.5, 2.6, 2.9)

- [x] **Task 1: W1 (weight is the pressure).** The pressure slot on the snapshot. The gauge and the map read it, low-passed, on steady-speed recipes. `PHASE5_MISSES` re-pinned. The top turn and the kick-out read at full S (decision 5).
- [x] **Task 2: the along-board loop probe** (a fast unit test, not a ride). W/S steps on a towed board: the pressure and the board's pitch rate, with today's 0.2 m zone and a 0.1 m zone. If 0.1 m rings, smooth the pressure the balance reads over 0.2 s.
- [ ] **Task 3: W2** (S 0.30, W 0.70, a 0.1 m zone, standing only). *Held back: it breaks the bars (below); the owner's call.* The bars re-measured: the still-water bar, `projectionLean`, `stanceLadder`, `pumping`.
- [x] **Task 4: the projection rises tall** (item 2.2 A, 0.04 m, settling over 0.5 s).
- [ ] **Task 5:** *held back (below).* Phase 1's drawn trim bias removed (decision 7); the stance stills and the before/after clip of a top turn (`motion-clip.mjs`).

**Shot list (batch A):**
1. Beach, medium, the chase camera, a right (frontside for a regular foot). Drop, Compress at the base for the bottom turn, let Compress go as the board climbs, then hold S with the steer back (the top turn). *Look for:*
   - as you let go, the rider stands tall, knees nearly straight, for about half a second;
   - at the top, the hips over the back foot, the back knee bent, the front leg long, and the board pivoting.

   Then hold S for a full second at the top. The nose should lift and the board slow and sink: that's the physics (decision 4). Say if it feels unfair.
2. The same on a left (backside).
3. Wave Pool, 1.25 m: 5 s of trim across the face with no input, then 3 s of W, then 3 s of S. *Look for:* no input, the rider stands centred; with W, the board flattens and runs; with S, the nose lifts and the board slows.
4. Beach: one bottom turn with no W and one with W held. *Look for:* both still drive off the front foot; W's a little more.
5. Point: ride straight up the face with S held and over the back. *Look for:* the hips back over the back foot and the front leg long, not the front knee folded.
6. Goofy (in the settings): a frontside top turn on a left, filmed beside the reel. Steps 5, 7 and 8 of `phase2-video-check.md`.

**Built (batch A, 2026-10-22, `claude/phys5-a`).** Decisions 1, 5 and 6 are built, and the quick test run; decisions 2, 3 and 7 are held back, each with the bars they break and the options. Decision 4 needs nothing built (no tail-lift term).

- **W1, the weight is the feet's pressure (decision 1; commits 4918a1af, d1741c63).**
  - `AttachedRider.contact.weight`: `frontShare` low-passed over 0.3 s while upright (NaN otherwise), a read-out nothing in the physics reads. A local snapshot slot (`RIDER_SNAPSHOT.weight`) carries it to `RiderVisualState.weight`; it is not on the wire, so another player's surfer reads none.
  - The gauge's `weight` is that pressure; the hips' place along the stance (the weight until now) is `hipsOver`. The figures stand their hips over the pressure.
  - Riding straight (trim, W/S, the pump), the map reads the weight at steady speed: the same run down a 10° face that holds trim's speed (`STEADY_SLOPE` 0.18: 7.9 of 8 m/s kept over 2 s). A tow does not do it: the drag still slows the board within each step, and the contact passes that on. A face fed along the travel was tried for the turns too and could not give back what a carve sheds on still water (0.3–0.6 g), so the turns are read on their own water.
  - Decision 5: the top turn's recipe holds full S (half until now); the kick-out's already did.
  - `PHASE5_MISSES` re-pinned (below).
- **The quick test (task 2).** W/S steps on a board towed at 5, 7 and 9 m/s (standing, crouched, compressed), with today's 0.2 m zone and W2's 0.1 m:
  - the balance does not oscillate: after every step its shift moves one way and stops;
  - after an S step the board's pitch rings about 3 cycles at about 3 Hz and settles (about 1.5 with 0.2 m), to the wobble a towed board had before W2 (0.005–0.053 rad/s about its running mean, against 0.010–0.049);
  - one exception: towed at 5 m/s with S held, the body ends near its reach (the shift 0.24 of 0.25 m) and the hull keeps a 7 Hz pitch limit cycle (±0.3° at 21° nose up, the pressure ±0.03) with the balance still: a hull and leg mode at that trim, not the balance;
  - the plan's remedy, the pressure the balance reads smoothed over 0.2 s, does not help (the step transients grow slightly).
  - Kept as a test of the 0.1 m zone on `claude/phys5-a-w2` (below).
- **W2 held back (decisions 2 and 3).** Built as specified it holds the still-water bar (1.067 / 1.050 s, keeping 0.90–0.92) and `projectionLean` (0.833–0.858 / 0.640–0.730), but the 0.1 m zone breaks the bars in turns. On still water every carve sheds 0.2–0.6 g, the pressure moves ahead by the body's height times that, and the balance now pulls the body back to hold it: the tail sinks, the drag grows, and the balance pulls further, to its reach.
  - The Compress cap's 11 m/s guard: the yaw rate swings 1.32 rad/s against 0.87 (0.83 before); with the 0.2 s smoothing, 1.57.
  - The coached cutback at half S bogs (1.2 m/s against over 4.5); the timed pumps no longer gain; a leaning body off the plane falls to 70° instead of standing up; the margin, the hand in the face, the reef strike's naming and a deep-crouch ramp tests fail; twelve body-film tests (the balls of the feet slide 14 cm riding straight on flat water, the weave's chest rolls 0.84° against 0.25°).
  - With today's 0.2 m zone and W2's targets (decision 2 alone): the 11 m/s guard holds and the still-water bar is unchanged, but the late projection keeps 0.744 (bar < 0.74) and the half-S cutbacks 4.27 m/s (bar > 4.5) and 3.10 (> 3.2).
  - At steady speed TRIM_SHIFT's feed-forward carries the pressure past S's 0.30 and W's 0.70 toward the zone's far edges: S 0.19 and W 0.84 with W2 (0.24 and 0.81 today).
  - **Options for the owner:** (a) re-bench W2 on batch B's moving face first, where a carve sheds about what a wave's does (0.1 g), since the still face's 0.2–0.6 g is what drives the zone to the body's reach; (b) decision 2 alone with today's 0.2 m zone, accepting the late projection at 0.744 and the half-S cutbacks just under their bars; (c) the 0.1 m zone riding straight only, today's in a carve (a rule, needs measuring); (d) W3, the body along its force line (research-sized). The experiment as built is on the local branch `claude/phys5-a-w2` (not for main).
- **The projection rises tall (decision 6; commit 6533becb).** Letting Compress go while planing, the leg rises to the riding stance as before and, within 2 cm of it, on to 0.04 m over it (about 24° at the knees); tall (the body over 0.024 m) from about 0.6 to 1.0 s after letting go, back by about 1.5 s. Two first forms broke the bars and are not kept: aimed tall from the moment of letting go, the leg rose faster through the turn's load and pumped the board on (the late projection kept 0.766 against 0.74); and the pumping crouch let go tall read as a near fall (the drawn alarm 0.26 against 0.2). The map's extension, read 0.3 s after letting go, is unchanged: its knees stay pinned (still rising then).
- **Decision 7 held back.** Drawn where the physics' pelvis is, trim's hips sit 0.64–0.70 of the way along a deck pitched nose up by flat water's drag, and the rear leg reaches its length: the knees' give over chop correlates 0.60 with the physics' leg (bar 0.8), trim-backside's trailing arm hangs at 7° (≥ 10°), the frontside tube's rear knee 60.4° (≤ 60°), the pump's hands swing 4.3 cm (≤ 4). The plan expected only a more bent front knee. Options: keep the bias until W2 is decided (W2 brings the pelvis back on a slowing board); or take it and re-pin those four with the knees' give lowered.

**The bars** (before is `main` at 2dd9ba52):

| Bar | Before | After (batch A as built) | W2 as specified (held) |
|---|---|---|---|
| Still-water bottom turn, frontside / backside | 1.117 / 1.150 s, keeping 0.913 / 0.910 | the same | 1.067 / 1.050 s, keeping 0.897 / 0.921 |
| Compress cap, 11 m/s guard (≤ 0.87 rad/s) | 0.83 | unchanged (code untouched) | 1.32 (0.2 s smoothing: 1.57) |
| `projectionLean` at 12° (> 0.83) / 25° (< 0.74), 7.3 and 8.5 m/s | 0.864, 0.873 / 0.639, 0.731 | 0.864, 0.873 / 0.633, 0.727 | 0.833, 0.858 / 0.640, 0.730 |
| `stanceLadder` W/S range standing / compressed (> 0.15) | 0.241 / 0.249 | the same | 0.226 / 0.233 |
| The pinned fails | 15 expected | 15 expected | 14 (Compress at 11 m/s now stays on, swinging) |

**The map's weights** (surfer1 Regular, all four and Goofy alike; before is the pelvis's place, after the pressure): trim 0.64 → 0.52 (target 0.50–0.62, met); W 0.86 → 0.68 (0.60–0.75, met); S 0.37 → 0.39 (0.35–0.45, met); the compressed bottom turn 0.56 → 0.69 (0.60–0.75, met). At full S: the top turn 0.54 at half S (0.34 at full) → 0.46 (0.25–0.35, pinned); the snap 0.36 → 0.49 (0.30–0.45, pinned: the still water's 0.5–0.6 g); the kick-out 0.84 → 0.71 (0.15–0.30, low confidence). Pinned too: the cutback 0.51, the extension 0.74 (no S held), the pumps 0.51 / 0.63, the landing 0.81.

**Shot list (batch A as built):**
1. Beach, medium, the chase camera, a right (frontside for a regular foot). Drop, Compress at the base for the bottom turn, let Compress go as the board climbs. *Look for:* the rider comes up to the riding stance as before, then on up, knees nearly straight, for about half a second from about 0.6 s after letting go, then settles. Say if it comes too late for the climb.
2. The same on a left (backside).
3. Wave Pool: pump with Shift (on and off about once a second). *Look for:* no change from before (the crouch does not rise tall).
4. Any spot: let Compress go below planing speed (a slow board). *Look for:* no tall stance.

### Batch B: the redirect off a face, and the lead (items 2.4, 2.1, 2.12; 2.9 re-read)

- [x] **Task 1: the moving-face test water** (item 2.4 A). The redirect tests (the snap, the bottom turn into a top turn, the cutback) run on it beside the static face. Report which pins pass. *None (below).*
- [x] **Task 2: the bite against the water** (item 2.4 B). The across-the-face block re-measured; pins struck off if met. *None met.*
- [x] **Task 3: the lead from the body's bank** (items 2.1 A and 2.12 A). Drawn only.
- [x] **Task 4:** the kick-out re-read after batch A. If the board won't swing over, the owner decides on item 2.9 B. *It doesn't (below).*
- [x] **Then: W2 re-tested** on the moving face with the bite fix. *Still breaks bars; not built (below).*

**Shot list (batch B):**
1. Beach or Point, medium: a bottom turn carried high into a top turn, three frontside and three backside. *Look for:* the board comes back down the face instead of spinning on up, with no arms thrown out after it.
2. Point: two cutbacks each side. *Look for:* the board holds its rail round, with no stall.
3. The steepest section you can find (the Point, or the Reef at a size that walls up): two snaps. *Look for:* more bite than before. Say if there are new falls into the turn.
4. Trim across a steep face and carve up onto the uphill rail (frontside, the toes). *Look for:* whether it feels any looser than before (the uphill rail now bites a little earlier).
5. Any spot: one bottom turn steered early at the flat and one steered late at the base. *Look for:* the head and the inside shoulder turn in as the body starts to lean, before the board turns.
6. Online, if handy: the other surfer's head leads as yours does.

**Built (batch B, 2026-10-22, `claude/phys5-b` from `claude/phys5-a`).** Decisions 8, 9 and 11 are built; decision 10 needs nothing (the physics leans first). W2 (decisions 2 and 3) is re-tested and still held back.

- **The moving face (decision 8; commit 54a8ab4d).** `acrossFace` takes the face's water running up it (`FACE_FLOW`, 1.5 m/s) and starts the board at its speed through the water; the three redirects run on it beside the still face, pinned.
  - **A plane face's uniform flow feeds nothing.** It is the still face seen from a frame moving with the water: the hull, its fins and the water's pressure read only the board's motion through the water and the surface's tilt, both unchanged in that frame. At the same speed through the water the carve is the same to the degree (the carve up from across reaches 164° either way). So the moving face cannot be the energy-feeding bar the plan wanted, and it answers item 2.4 A's question: the deep U is not the still face's alone.
  - Only the rider's readings over the ground differ (`TURN_RADIUS`'s speed, Compress's path and carry). From 1 to 2 m/s the snap turns 70–83° in its second (82° still) and falls at 1.05–1.57 s (1.67 s); the cutback comes round 74° (74°) and falls.
  - Started at the same speed over the ground instead, the board climbs slower through the water and the top-turn block's 6 m/s riders fall from 1.5 m/s of flow.
  - A face that feeds needs the face itself to move: `FaceWater` (the game's own model, the water rising past the board at ∂η/∂t, as `faceTrim.test.ts` measures). The redirect there is a research-sized test: the face is finite, so a top turn must finish before the board leaves it.
- **The rail's bite against the water (decision 9; commits fc215c34, daa8b680).** The bug confirmed first, as a pinned test: along a 30° face the downhill rail 20° into the water read 50°, past the 48° bite, and Compress's pull was off (0 N); the uphill rail 52° in read 22° and pulled (29.9 N). Fixed: `prepareBank` reads the board's roll into the water (less the water's own roll about the heading, from the sample's normal under the board) for `RAIL_BITE`'s room and `railAhead`, so Compress's pull too; the ankle and the body's bank stay against gravity.
  - The across-the-face block passes as before; no pin is met. The snap turns 81.7° (81.7°); the carve up from across 164° (168.7°); the cutback pin 74° (87°): its turn up the face rides the uphill rail, which now bites 15° sooner on the 15° face, and keeps more speed (4.7 m/s at the least, 3.2).
  - On a 30° test face every redirect still falls, as before (outside the tuned envelope).
- **The head leads from the body's lean (decisions 10 and 11; commit f7c291f8).** No physics, no wire.
  - `RiderMotion` reads `leanRate`: the drawn pelvis over the feet (the swing does not turn it), standing only, smoothed as the turn rate is; the cause filter gives it the yaw rate's second pole (the feet ride the board's wobble: without it the weave's head turned up to 0.8° against the board, bar 0.4°).
  - The head alone looks on by the turn the lean is bringing: g/v times the lean's rate over `RIG_DETAIL.leanLead` (0.5 s), followed as the gaze is, within the neck's reach. The leading arm keeps the board's look (led too, it pointed 114–118° from the trunk's down, bar 110°).
  - Found on the way: steered at 8 m/s on flat water, the board first yaws about 7° the other way (the counter-steer that leans the body in) and comes 10° into the turn 0.62 s after the steer. The head led by the yaw rate alone looked 13.5° the wrong way with it and came in 0.07 s after the board; now at most 5° and 0.05 s before the board. Another player's head alike (the rail change's first turn: 16.8° → 8.3° the wrong way).
  - Not kept: 0.75 s (the cutback's head turned 0.37 s before its chest, past the cascade's 0.35); the chest led from the lean too (it broke the cascade's order).
- **The kick-out (task 4).** Straight up the still 15° face at 6 m/s with full S, the board does not yaw without a steer (it stalls nose-up at 38°). With the steer it turns 3° in 0.5 s and 65° by 1 s (41° without S), and the rider falls at 1.2 s (8 m/s: 81°, 1.28 s). It won't swing over the back: item 2.9 B is the owner's call.
- **W2 re-tested on the moving face with the bite fix: still breaks bars; not built.** The moving face is still water in another frame, so the bars read what they read on still water (the flat-water ones identically), and its ground-frame differences made the cutbacks worse.
  - W2 as specified (S 0.30, W 0.70, a 0.1 m zone): 34 tests fail (physics, body film, stance map). The Compress guard at 11 m/s swings 1.32 rad/s (≤ 0.87; the held turn 2.53 with two sign flips); the coached cutbacks bog to 1.17–1.25 m/s still and 0.93 moving (> 4.5); the leaning body off the plane falls to 70° (< 1°); the 12° S-turn pumps fall off; the bumps' gain drops to 0.43 (0.66); 16 body-film tests (the feet sliding, the weave, the knees' give, the arms' alarm and others). The still-water bar improves (1.067 / 1.050 s, keeping 0.897 / 0.921) and `projectionLean` holds (0.833, 0.858 / 0.631, 0.718).
  - Decision 2 alone with today's 0.2 m zone: the guard, the still-water bar and re-standing are untouched (they hold no W/S), `projectionLean` holds (0.894, 0.888 / 0.642, 0.737), but the coached cutbacks miss: 4.21–4.44 m/s on the 10° face (> 4.5; 3.57–4.12 moving) and 3.10 on the 5° face goofy (> 3.2). Six tests fail.
  - Measured as an option, not built: decision 2 at half strength (S 0.40, W 0.60) with the 0.2 m zone holds the probe's bars (cutbacks 4.57–4.75 and 3.24–3.40; `projectionLean` 0.881–0.885 / 0.633–0.729; the ladder 0.241); the full suite not run on it.
  - **Options for the owner:** (a) S 0.40 / W 0.60 with the 0.2 m zone (above); (b) decision 2 as specified with the coached cutback bars lowered to 4.2 and 3.1 m/s; (c) a test water that feeds (`FaceWater`) before deciding; (d) W3, the body along its force line (research-sized).
- **Found: the compressed turn's rules read the ground, not the water.** On the moving face the cutback across a 5° face bogs to 1.09–1.29 m/s through the water (3.47–3.65 still) at the same speed through the water. `COMPRESS_PULL` and `CARVE_CARRY` act along `board.velocity` (the path over the ground) and `TURN_RADIUS` reads the speed over the ground, so on moving water they pull and carry off the board's path through it. The game's waves move about 1.1 m/s under their turns. A follow-up, measured on waves before any change.

**The bars** (before is batch A at 36718c12):

| Bar | Before | After (batch B) |
|---|---|---|
| Still-water bottom turn, frontside / backside | 1.117 / 1.150 s, keeping 0.913 / 0.910 | the same (flat water: the bite reads alike) |
| Compress cap, 11 m/s guard (≤ 0.87 rad/s) | 0.83 | 0.83 |
| `projectionLean` at 12° (> 0.83) / 25° (< 0.74), 7.3 and 8.5 m/s | 0.864, 0.873 / 0.633, 0.727 | the same |
| `stanceLadder` W/S range standing / compressed (> 0.15) | 0.241 / 0.249 | the same |
| The stance map's misses | pinned | unchanged |
| The coached cutback, 10° / 5° face (> 4.5 / > 3.2) | 5.02–5.03 / 3.47–3.65 | 4.83–5.01 / 3.47–3.65 |
| The pinned fails | the six | the six, and the three redirects on the moving face |

The moving face replaces no bar: the still-water bar, the cap and `projectionLean` stay on still water, and the redirect pins stay on both faces.

**Shot list (batch B as built):**
1. Beach or Point, medium: a bottom turn carried high into a top turn, three frontside and three backside. *Look for:* on the redirect's rail (the heels frontside, the toes backside) Compress keeps pulling deeper into a steep face than before. The test faces still fall here; say whether the waves do.
2. Point: two cutbacks each side. *Look for:* the turn up the face rides the uphill rail, which now bites a little sooner: say if it feels looser or bogs.
3. The steepest section you can find (the Point, or the Reef at a size that walls up): two snaps. *Look for:* more bite than before. Say if there are new falls into the turn.
4. Trim across a steep face and carve up onto the uphill rail (frontside, the toes). *Look for:* whether it feels any looser than before.
5. Any spot: one bottom turn steered early at the flat and one steered late at the base. *Look for:* the head turns into the turn as the body starts to lean, before the board turns, instead of glancing the other way with the board's first yaw.
6. Online, if handy: the other surfer's head leads as yours does.
7. Point: ride straight up the face, then hold S with the steer (the kick-out). *Look for:* whether the board swings over the back or the rider falls (about 65° in a second here): item 2.9 B's call.

### Batch C: the water (items 2.8, 2.10, 2.11; 2.7 if asked)

- [ ] **Task 1: the paddle's rate and sprint**, `PULL_SHARE` re-fit, the paddle speed bar.
- [ ] **Task 2: the paddle's roll and length**, the prone stability tests, the body film's paddle pin.
- [ ] **Task 3: the fall starts from the rider's own body** (item 2.10 A).
- [ ] **Task 4: the remote swimmer's head under**, from the local sea (item 2.11 A).
- [ ] **Task 5 (only if the owner asks, decision 15):** the margin by the extrapolated centre of mass (item 2.7 B).

**Shot list (batch C):**
1. Beach, small: paddle out for 20 s, with the chase and side cameras. *Look for:* a slower, longer stroke (about one every 1.2 s a side), and the board rocking rail to rail with each stroke.
2. Beach and Point, medium: catch three waves each. *Look for:* the last strokes quicken as the wave picks you up. Say if the catch is harder than before.
3. Paddle into whitewater or a closing section and fall off lying down. *Look for:* the arms don't fling out.
4. Online: wipe out and get held under. *Look for:* the other player's swimmer keeps its face down under water.
5. Wave Pool: 5 s of pumping (Shift on and off about once a second). *Look for:* whether the HUD's balance meter dips or the arms rise. Only if they do, decision 15.

### Follow-up (batch D, 2026-10-22, `claude/phys5-d`): W2 (a), the keyboard's rotation, the assists against the water

From batch B's record (`claude/playtest-2026-10-22n`, batches A, B and C). The owner took batch B's option (a) for W2, decision 16's keyboard rotation, and the assists measured against the water.

- **W2, option (a) (S 0.40 / W 0.60 held in today's 0.2 m zone): not built; one stance bar misses by a frame.** Built and run (kept on the local branch `claude/phys5-d-w2a`, not pushed): `copTarget.z` = trim × `TRIM_PRESSURE` 0.2 × half the stance, standing only.
  - Every physics bar holds. The still-water bar, the 11 m/s guard, re-standing and the pumps hold no W/S, so they are unchanged by construction (and pass). `projectionLean` 0.864, 0.873 / 0.633, 0.727 → 0.885, 0.881 / 0.633, 0.729. The coached cutbacks 4.83–5.01 → 4.57–4.75 m/s (> 4.5) and 3.47–3.65 → 3.24–3.40 on 5° (> 3.2). The ladder 0.241 / 0.249 → 0.241 / 0.250. The body films, the stance map's misses and the 18 pinned fails pass as before.
  - The miss: `stanceTurns.test.ts`, the frontside cutback's cascade. The head's turn peaks 0.367 s before the chest's (bar ≤ 0.35; 0.333 before), Regular and Goofy alike: the head's peak comes three frames sooner. One test in 920.
  - At steady speed (a face that holds trim's speed) it changes little: S still holds 0.23 on the front foot (TRIM_SHIFT's feed-forward carries it past 0.40), W 0.82 → 0.83; on flat water W 0.81 → 0.91. What (a) moves is a slowing carve's: the zone's front edge at full S comes back from 0.82 to 0.72.
- **The keyboard's rotation (item 2.9 B): not built; the stick doesn't swing the kick-out over either.** The kick-out recipe (straight up the still 15° face, full S, full steer):
  - today's keyboard: the rider falls at 1.20–1.32 s from 5–7 m/s (72–125° round, still planing at 2.9–3.6 m/s); 1.58 s from 8 m/s (193°);
  - the pad's stick held into the turn: 1.33 s (121°) at 6 m/s; a rotation the keyboard would give (the steer's while S is held, ramped): 1.25–1.28 s from 5–6 m/s, still planing; from 7–8 m/s the board stalls after 71–129° and the rider falls 0.6–0.8 s later;
  - 80 pad techniques at 6 m/s (steer 0.3–1, held 0.3 s to the end, the rotation either way from the start or 0.4 s): every rider falls by 1.9 s; one (steer 0.7 for 0.3 s, the stick into the turn) comes 131° round before the board stalls and falls 0.4 s after it.
  - The fall is the redirect pins' (the body falls into the turn as the board bleeds its speed: the bank runs to 70° with the swing at its range), which a twist cannot catch (it gives no net yaw). The still face's stall throws even a rider riding straight up with no steer (2.1 s). The owner's ride at the Point decides whether real waves take the board over the back.
- **The assists against the water (built; commit below).** The sea alone (no rider): the Beach and the Point at Medium (Hs 1.4 m, Tp 11 s, s = 150, the GPU tier's 64 components), seeds 1 and 2, 60 s each after the spin-up, every 0.5 s. On every unbroken crest 0.5 m+ high and steeper than 15° within 60 m along shore and from 20 m seaward to 50 m shoreward of the take-off, the surface flow at 0.1–0.9 of the face's height (123,615 points).
  - The water's level flow, medians: at the base 0.31 m/s (Beach) and 0.56 (Point), seaward; half way up 1.05–1.09, shoreward; near the top 1.40–1.74. Next to breaking crests 3.5–4.6 m/s (the 90th percentile at mid-face).
  - The assists read both ways, statically, for boards on those points (the heading along the path through the water): bottom turns at the base at 6 and 7.5 m/s, headed 20° down to 60° up the face; top turns and cutbacks at 0.5–0.9 of the face at 4 and 5.5 m/s, headed 30–150° up it. Read over the ground:
    - bottom turns: the pull and the carry differ by 6 % (Beach) and 9–10 % (Point) at the median; over 10 % in 25–50 % of the cases; the lean cap within ±2–6°;
    - top turns and cutbacks: the board reads 18 % slower (it climbs against the water's shoreward flow), the lean cap 10° less, the pull 0.68–0.70 weaker (its fade 0.31 lower) and 13° off its path; the pull's vector differs by 73–75 %, the carry's by 47 %; over 10 % in 97–99 % of the cases. Leaving out the flows next to breaking crests: 59–62 %, 10°, 40 %.
  - So `TURN_RADIUS`'s speed, Compress's path and fade, the carry's and the lean-out pull's direction now read the board's motion through the water under it (the flow `planingStep` samples, as planing already did). On still water nothing changes, so every bar holds as it was; on uniformly moving water the turn is the still water's: the coached cutback on a 5° face whose water runs 1.1–1.5 m/s up it keeps 3.47–3.65 m/s (1.02–1.29 over the ground's reading), and the moving face's three pins read the still face's to the degree (the snap 81.7° in its second, falling at 1.67 s; the cutback 73.9°). A new test pins it (`cutback.test.ts`).

**The bars** (before is `claude/playtest-2026-10-22n` at 6b9cb4c8):

| Bar | Before | After (batch D as built) | W2 (a) (held) |
|---|---|---|---|
| Still-water bottom turn, frontside / backside (≤ 1.15 s, > 0.85 kept) | 1.117 / 1.150 s, keeping 0.913 / 0.910 | the same (still water) | the same |
| Compress cap, 11 m/s guard (≤ 0.87 rad/s) | 0.83 | the same | the same |
| `projectionLean` at 12° (> 0.83) / 25° (< 0.74), 7.3 and 8.5 m/s | 0.864, 0.873 / 0.633, 0.727 | the same | 0.885, 0.881 / 0.633, 0.729 |
| The coached cutback, 10° / 5° face (> 4.5 / > 3.2) | 4.83–5.01 / 3.47–3.65 | the same; moving water 1.1–1.5 m/s: the same (5°: 1.02–1.29 before) | 4.57–4.75 / 3.24–3.40 |
| `stanceLadder` W/S range standing / compressed (> 0.15) | 0.241 / 0.249 | the same | 0.241 / 0.250 |
| The frontside cutback's head before its chest (0.1–0.35 s) | 0.333 s | the same | 0.367 s (misses) |
| Pumps, re-standing, body films, stance tests, pinned fails | pass | pass | pass but the cascade |

**Shot list (batch D):**
1. Point, Medium: three top turns and three cutbacks each side, Compress (Space) held with the steer. *Look for:* on the face the turn now leans and pulls as on still water (up to about 10° deeper into a climbing turn): the board should hold its rail round and keep more speed. Say if there are new falls into the turn.
2. Beach, Medium: three compressed bottom turns. *Look for:* about as before (the water at the base hardly moves).
3. Point: a cutback back toward the curl with Compress and S. *Look for:* it should bog less on the face than before.
4. Near the curl, a compressed turn in fast water. *Look for:* where the water runs with the board the assists now read it slow and fade; say if turns there feel weaker.
5. Point: ride straight up the face, hold S and steer (the kick-out). *Look for:* whether the board swings over the back on a real wave or the rider falls; that decides whether the keyboard's rotation is worth a second look.

### W2 (a) finished (batch E, 2026-10-22, `claude/phys5-e` from `claude/phys5-d`)

The coordinator's call on batch D's one miss: the frontside cutback's cascade is a drawing timing, not physics, so W2 (a) goes in with the head's lead trimmed, the 0.35 s bar kept.

- **W2 option (a) (commit 8c4743a4):** as batch D measured it: `copTarget.z` = trim × `TRIM_PRESSURE` 0.2 × half the stance, standing only; the zone stays 0.2 m (S 0.40 on the front foot, W 0.60, nothing 0.50).
- **The head's lead trimmed (commit 77affeb5, drawn only):** `RIG_DETAIL.lookAhead` 0.85 → 0.7 (a steady turn looked into 0.45 s ahead, 0.6 before) and `leanLead.time` 0.5 → 0.55 (the lean's lead, which `lookAhead` also scales, given back). Neither alone held: the look at 0.7 left the head 0.017 s ahead of the board into a bottom turn (bar 0.03); the lean at 0.45, or the look at 0.75–0.8, left the cutback at the bar's 0.350 s exactly; leading the chest more (`cascade.chest` 0.35–0.45) did not move it.

| Bar | Before (batch D) | W2 (a) alone | Batch E as built |
|---|---|---|---|
| Frontside cutback, the head before the chest (0.1–0.35 s), Regular and Goofy | 0.333 s | 0.367 s | 0.333 s |
| Backside cutback, the head before the chest | 0.117 s | 0.150 s | 0.150 s |
| The chest before the hips (> 0), frontside / backside | 0.050 / 0.250 s | 0.067 / 0.217 s | 0.067 / 0.217 s |
| The head 10° into a bottom turn before the board (≥ 0.03 s), and the wrong way (> −6°) | 0.050 s, −5.0° | 0.050 s, −5.0° | 0.033 s, −4.7° |
| The rail change's head the wrong way, local / another player's (> −10°) | −9.0° / −8.3° | — | −8.7° / −7.9° |
| `projectionLean`, coached cutbacks, the ladder | 0.864, 0.873 / 0.633, 0.727; 4.83–5.01 / 3.47–3.65; 0.241 / 0.249 | — | 0.885, 0.881 / 0.633, 0.729; 4.57–4.75 / 3.24–3.40; 0.241 / 0.250 |
| Still-water bar, 11 m/s guard, re-standing, pumps | 1.117 / 1.150 s; 0.83; pass; pass | — | the same (they hold no W/S) |
| The test set (physics, rig, stance, body films, `stanceTargets`, Bindings, Controls, net) | 904 + 18 pinned | 1 failure | 904 passed, 18 pinned fails as before; tsc clean |

**Shot list (batch E):**
1. Beach, Medium: a top turn with S held hard at the top, three each side. *Look for:* the board pivots on the tail with the weight back; say if it bogs more than before.
2. Point: two coached cutbacks each side (Compress, S, the steer). *Look for:* they still plane round (a little slower than before: 4.6–4.8 m/s against 4.8–5.0 on the test face).
3. Any spot: W held through a bottom turn. *Look for:* more drive off the front foot than before.
4. Any spot: a bottom turn and a cutback, watching the head. *Look for:* it still turns into the turn first, a touch later than before (it looks 0.45 s ahead of a turn, not 0.6).

### The paddle balance (2026-10-22, `claude/paddle-balance`, after batches A–E)

The owner's ride: "too unbalanced on the board and getting up from it. While paddling he loses balance and falls off." Reproduced first, with headless probes of `RideSession` (the board and the attached rider, no `SurfZoneRunner`):
- paddling: 55 runs on flat water, chop (`ChopWater`), swell (1.2 and 2 m, 10 s, from five directions) and a 1.4 m face running up behind the paddler (12°, 18° and 25°, headed along it and 30° across), each straight and weaving (full steer one way, none, the other way, none, 2 s each);
- a chop sweep: 72 runs of 30 s (12 seeds, `ChopWater` at scale 1, 1.6 and 2, straight and weaving);
- pop-ups: on a static 15° slope, at each tenth of a second through a stroke (12); on a 1.2 m face (14° and 18°, headed along it and 30° across) at the cue and 0.15, 0.3 and 0.45 s after it (20); on flat water with no wave (12).

**The causes:**
- **Paddling (batch C, item 2.8).** The stroke's roll asked the hips for its tracking error, and its rate alone asks 0.22 m of their 0.1 m reach. When chop, a steering stroke or a face rolled the board the other way, the hips were held 0.03–0.08 m toward the low rail while it rolled toward it at 50–70°/s. Past about 36° the hips' 0.1 m cannot right the board (its roll with the hips held there, on flat water). It capsized, and the rider slid off ('lost board').
- **Sloping water (older).** The prone balance levelled the board to the world's horizontal. Lying awash, the body moves with the surface water, so the vertical it feels is the surface's normal: the free surface is a surface of equal pressure, so g − a is normal to it. Across sloping water the hips spent their reach against the water's own level.
- **The pop-up (batch C).** The push took the duck-dive's hold (1.0 m of shift per rad), made for a board under water. On a floating or planing board the body's shift came a quarter cycle or more behind the board's roll and rang it up. The board rolled 22–79° in the rise. Carried rigidly with the deck, the rising body also swings across by its height per radian of roll (0.45 m by the push's end).

**The fix (`AttachedRider.ts`; the reasoning in STROKE_ROLL's, PRONE_ROLL_SHIFT's and `armsGiveStep`'s comments):**
1. **The balance first** (the "posture first" principle of dual-task balance, Shumway-Cook and Woollacott). The hips level the board within their reach; the stroke's swing has what is left. On flat water the board rocks as before.
2. **The water's level.** Lying down, the roll the balance reads is from the water's surface normal under the board (`waterUp`, the otoliths' vertical); the rate is the board's own. On flat water the two levels are the same.
3. **Pushing up, the hips' balance and the arms' give.** The push leaves the duck-dive's hold for the prone balance. As the chest leaves the deck, the board rolls under the hands while the body's centre of mass stays over the board's middle: its lift over the prone posture times tan of the roll, within the hands' span (DUCK_SHIFT).

| Probe | `main` (a246523d) | Before batch C (2dd9ba52) | The balance first | As built |
|---|---|---|---|---|
| Paddling, 55 runs: falls | 8 (chop ×1.6, weaving and straight; the 12° face at ±30°; the 18° face weaving) | 0 | 1 (chop ×1.6, seed 3, weaving) | 0 |
| Chop sweep, 72 runs: falls (×1 / ×1.6 / ×2) | 18 (3 / 8 / 7) | 0 | 3 (0 / 1 / 2) | 0 (the board's roll at most 35°) |
| Flat water: the roll rail to rail; the cruise | 18.6°; 1.62 m/s | 11.4°; 1.64 | 18.6°; 1.62 | 18.6°; 1.62 |
| Pop-up on the 15° slope, 12: falls (in the rise) | 11 (10), the board 22–79° in the rise | 0 of 6, the board 9–19° | — | 0, the board 15° on average and 18° at most in the rise |
| …the first 2 s standing: the board's largest roll, its range, the balance margin's least (means) | — (1 stood) | 11–14°, 17–23°, 0.23–0.45 | — | 7.2°, 11°, 0.63 (the margin's mean 0.86) |
| Pop-up on the face, 20: falls (in the rise) | 17 (12) | — | — | 4 (3, nose-diving at the foot of the 18° face; 1 standing on a board that had lost the wave) |
| Pop-up on flat water, 12: falls (in the rise) | 12 (2) | — | — | 12 (2): no wave carries a standing rider |

`ChopWater` at scale 1 is a choppy sea, Hs 0.65–0.8 m of 2.2–4.2 s waves, sloped 8–12° at the 99th percentile. At 1.6 and 2 (Hs 1.0–1.55 m, slopes to 23–28°) it is steeper than linear waves stand without breaking.

**Tried and not kept** (don't retry):
- **The push carried upright like the landing.** Kept level in pitch as well, the body's centre of mass moved out of the landing's support on a nose-up board, and the towed 6 m/s pop-up fell.
- **The push's reach widened to the hands' span** (0.2 m, at the prone gains or more). It rang like the duck-dive's hold.
- **The rails held when the hips run out,** paddling on the duck-dive's hold. All 72 chop runs fell.
- **A leg-spread reflex** past an extrapolated 18–28°. It came too late: 3 of 72 as before.
- **The legs spread all the time.** It cut the flat-water roll to 14°, against the stroke's bar of 15°.
- **Easing the stroke's roll by the extrapolated roll.** It changed nothing.
- **Levelling to the board's own felt acceleration** (low-passed over 0.1 s). 2 of 72 fell: it is noisier than the water's normal.

**Tests:**
- New (`AttachedRider.test.ts`, "the paddle's balance"):
  - a choppy sea, straight and weaving;
  - the face lifting the board at ±30°;
  - pop-ups at six points of the stroke on the 15° slope.
  
  All three failed on `main`.
- The roller lens's fingerprints were re-recorded for its four prone riders, whose balance changes by design. The standing rider is unchanged.
- Results, after merging `main` at 7b79f085 (the camera stick, the Canyon rock bed):
  - the main suite: 2,843 passed, with 18 pinned fails as before;
    - the barrel library's two files and the surf forecast need `docs/research` data. They were run again with it checked out (20 passed);
  - `SurfZoneSimulation`'s rider subset: 11 passed;
  - `tsc --noEmit` is clean.

**Shot list (paddle balance):**
1. Beach or Point, Medium: paddle 30 s through the chop, weaving left and right. *Look for:* no falls. The board still rocks rail to rail with each stroke on flat water; in chop it rides the water's tilt instead of fighting it.
2. Paddle 30° across a wave's face as it lifts you, and don't pop up. *Look for:* you stay on.
3. Catch three waves each way, popping up at the cue. *Look for:*
   - the board stays flatter while you push up;
   - the body stays over the board as it rolls under the hands;
   - the first second standing is calmer.

   Say if the pop-up feels slower or heavier.
4. Pop up late on a steep face. *Look for:* a nose-dive at the bottom still throws you. That is a real cause.
5. Paddle into whitewater or under a closing lip, and duck-dive once. *Look for:* the bore and the lip still knock you off; the duck-dive works as before.

### The sprint paddle (2026-10-22, `claude/sprint-paddle` from `claude/paddle-balance`)

The owner's choices of 2026-10-22, built as given.

**Control.** Double-press the paddle and keep holding it to sprint; letting go stops the sprint, and the paddling with it. A single press held cruises, as before.
- `SprintPress` (`InputAxes.ts`) reads the paddle as `Controls` combines it across the keyboard (Space, ↑), the pads (RT, and the Steam Controller through them) and the touch paddle button.
- The double press is a release and a press again within `DOUBLE_PRESS_WINDOW`, 0.3 s:
  - deliberate double presses come 0.1–0.25 s apart;
  - a quarter of a cruising stroke is too short a stop to mean one.
- `RideInput.sprint` carries it to the worker.

**The physics** (`AttachedRider`'s SPRINT_PADDLE_* constants, with their reasoning). The strokes go over to the sprint in 0.3 s:
- **Rate:** 70 a minute a side, against 50 cruising (the owner's figure, from Sheppard et al. 2013, Nessler et al. 2019 and Volschenk et al. 2021).
- **Overlapping pulls:** 0.43 of each arm's cycle, against 0.28. Swimmers' arm phases overlap more as they speed up (Chollet, Chalies and Chatard 2000).
- **A deeper catch:**
  - the hand 0.32 m down, against 0.25;
  - the forearm upright and the upper arm in the water. Their extra drag area (×2.4 the hand's and forearm's) pushes as a plate, along the stroke only.
- **The arm pulling all out:** it gives way at 0.8 body weights, against 0.4. Sprint paddling is limited by pulling strength (Sheppard et al. 2012).

The catch's own quickening (SPRINT_CYCLE) stays, and stays free.

**The reserve** (`PaddleReserve`):
- **Model:** the anaerobic reserve, as W′ in the critical-power model (Skiba et al. 2012), with surfing's short sprints between long paddles (Farley et al. 2012).
- **Owner's numbers, linear both ways:**
  - 8 s of sprinting;
  - 15 s to refill, at anything else (cruising, lying still, riding, swimming);
  - emptied, it cruises until a quarter is back.
- **Where it lives:** in `RideSession`, as the surfer's own. It is kept through falls and climbs back on, and is full at each placement (a new session, a retry, a lesson's start), like the breath.

**The HUD:**
- a small bar at the bottom centre;
- shown while paddling below full, and fading out at full;
- the accent colour while spent;
- high-contrast and reduced-motion rules like the balance meter's;
- strings `hud.sprint` and `action.paddle.help`.

The status carries `ride.sprint` (the reserve, spent, paddling, sprinting).

**Online:** no wire field. The pose sends the seven drawn points, the hands among them, 20 times a second, so another player's sprint shows as its faster, deeper strokes.

| On flat water (the speed averaged over a stroke) | Cruise | Sprint |
|---|---|---|
| Top speed | 1.59 m/s | 2.08 m/s |
| 1 m/s from rest | 1.12 s | 0.55 s |
| 90 % of its own top speed | 2.42 s | 1.83 s |
| The cruise's 90 % (1.43 m/s) | 2.43 s | 1.00 s |
| The hand's greatest load | 0.40 body weights | 0.78 |
| Strokes a minute a side | 50 | 70 |

**The balance while sprinting** (the paddle-balance probes, the sprint held):

| Probe | With an endless reserve | With the 8 s reserve |
|---|---|---|
| Paddling, 55 runs | 0 falls | 0 falls |
| Chop sweep, 72 runs | 2 falls, both at ×2 | 4 falls, all at ×2 |

`ChopWater` ×2 is Hs 1.3–1.55 m at 2–4 s, sloped to 28°: steeper than linear waves stand unbroken. Cruising holds it with no falls.
- **Tried first:** the sprint's extra area as a sphere's drag, the way the hand's is drawn. It turned the chop's flow across the stroke into side forces on the arm: 11 of 72 fell. As a plate along the stroke, 2.
- **Also tried:** easing the sprint whenever the hips run out of reach. It changed nothing.

**Tests:**
- the double press, from the keyboard (Space, ↑) and a pad's RT; none standing;
- the reserve's drain, refill and lockout;
- the sprint's top speed and its sooner reach to it;
- 70 strokes a minute with the drawn hand deeper;
- running out at 8 s, back after 3.75 s, full at a new placement;
- the bar's visibility (`showsSprintBar`).

Results:
- the main suite: 2,852 passed (the settings test updated for the paddle's new help line, re-run on its own), with the 18 pinned fails as before;
- `SurfZoneSimulation`'s rider subset: 11 passed;
- `tsc --noEmit` is clean.

**Shot list (sprint paddle):**
1. Any spot: hold paddle for 10 s, then double-press and hold. *Look for:*
   - the strokes quicken and dig deeper;
   - the board picks up speed within a second;
   - the bar appears at the bottom centre and empties over about 8 s;
   - the paddler drops back to cruise when it runs out.
2. Keep holding after it empties. *Look for:* the sprint comes back by itself about 4 s later (a quarter refilled). Let go, and it refills in 15 s; it fades out when full.
3. Paddle for a wave, and sprint the last two seconds. *Look for:* a catch that is easier than before. Say if it feels too easy.
4. Sprint through chop, steering. *Look for:* no falls.
5. Try it on the pad (RT twice), with touch (the paddle button tapped twice and held), and with high-contrast HUD and reduced motion on.

---

## 4. Decisions for the owner (each with the recommended answer)

**Approved, 2026-10-22:** the owner took every recommended answer below ("use all recommended"). Batch A builds decisions 1–7 (§3).

1. **Is "weight" the feet's pressure** (the physics' `contact.frontShare`, low-passed over 0.3 s), with the pelvis kept as its own measure? *Recommended: yes* (W1). The pelvis reads the deck's pitch.
2. **Should W/S set the pressure the rider holds** (S 0.30 on the front foot, W 0.70, nothing 0.50)? *Recommended: yes* (W2).
3. **How far may the board's own pushes move the weight before the rider re-centres?**
   - 0.2 m (today);
   - 0.1 m: the bottom turn stays front-loaded with no W (0.66);
   - 0.05 m: more centred, but the bottom turn then needs W.

   *Recommended: 0.1 m.*
4. **Is the tail sinking under a held S physics to keep,** with no tail-lift term? *Recommended: keep it,* and judge it on the moving face and real waves (batch B).
5. **Should the map's top turn and kick-out be read at full S,** as the coaching describes them? This changes the recipe (the player's input), not the targets. *Recommended: yes.*
6. **Should the projection rise above the riding stance?** *Recommended: yes, by 0.04 m* (the knees to about 24°), settling over 0.5 s. The alternative is 0.06 m (straight legs).
7. **Should phase 1's drawn trim bias go** once the weight reads by pressure, drawing the hips where the physics puts them? *Recommended: yes,* checked on batch A's ride.
8. **Should a moving-face test water be the redirect's bar,** with the static-face pins kept? *Recommended: yes.*
9. **Should the rail's bite be judged against the water's surface** instead of the world? *Recommended: yes,* after decision 8's measurement.
10. **The lean before the rail bites: change the physics?** *Recommended: no.* The physics leans first. Steer at the flat, and draw the lead (decision 11). The braking curve (item 2.1 B) only if the ride says the lean-in is too slow.
11. **Should the head lead from the body's bank** (drawn, local and remote, no wire)? *Recommended: yes.* The alternative is the asked bank on the local snapshot, with a wire byte for remote surfers.
12. **Paddling: rate, roll and length together, with a sprint on a wave?** *Recommended: yes,* in two commits and one ride. The alternative is the rate and length only.
13. **Should the fall start from the rider's own body?** *Recommended: yes.*
14. **Should the remote swimmer's head-under come from the local sea** (no wire)? *Recommended: yes.*
15. **The pump's near-fall reading: leave the physics?** *Recommended: leave it,* unless the meter or the arms dip on the ride. Then use the extrapolated centre of mass.
16. **The kick-out: no change of its own?** *Recommended: yes.* The keyboard's rotation only if the board won't swing over the back after batch A.
17. **The order: batch A, then B, then C,** one PR each, merged on the owner's word? *Recommended: yes.*

---

## 5. Sources

**Measured studies** (the animation plan's §11 has the full references):
- Forsyth JR et al. (2024). *Sci Rep* 14:8734. https://doi.org/10.1038/s41598-024-58387-y
  - bottom turn: 42° roll, 99° in 0.96 s;
  - cutback: 75° roll, 152°;
  - bottom turns and cutbacks keep 0.88–0.95 of their speed.
- de Sousa (2022), U. Lisboa thesis: the bottom turn's phases, via `src/scene/rig/stanceMap.ts` and memory `stances-compress-requirements`.
- Weiß A et al. (2024), *Proc. 29th ECSS*. Weiss A et al. (2025). *Multibody Syst Dyn* 66(4):955–975. https://doi.org/10.1007/s11044-025-10071-3 (abstract: https://cris.fau.de/publications/342918955)
  - the front leg's muscle forces are higher;
  - by the abstract, the front leg carries the weight and the rear leg's moments stabilise;
  - not significant (n = 7).
- Borgonovo-Santos M et al. (2021). *Sensors* 21(5):1783. https://doi.org/10.3390/s21051783
  - the stance 0.63 m wide;
  - the pop-up's timing.
- Nessler JA et al. (2019). *JSCR* 33(4):1102–1110. https://doi.org/10.1519/JSC.0000000000003070
  - strokes a minute a side, the board's roll and pitch.
- Nessler JA et al. (2015). *PLoS One* 10(11):e0142325. https://doi.org/10.1371/journal.pone.0142325
  - the stroke's length and width.
- Sheppard JM et al. (2013). *Int J Sports Sci Coach* 8(1):43–51. https://doi.org/10.1260/1747-9541.8.1.43
- Hof AL, Gazendam MGJ, Sinke WE (2005). The condition for dynamic stability. *J Biomech* 38(1):1–8. https://doi.org/10.1016/j.jbiomech.2004.03.025
  - the extrapolated centre of mass.

**The physics of the board:**
- The Exploratorium, *The Science of Surfing: physics*. https://annex.exploratorium.edu/the-world/surfing/physics/
  - weight back puts gravity behind buoyancy, and the board rotates nose-up until the centre of buoyancy has moved back;
  - fins resist sliding sideways.
- Hendricks T (1969). Surfboard hydrodynamics, part 2. *Surfer*. https://www.surfresearch.com.au/1969_03_Hendricks_Hydronamics_2_Surfer.html
  - planing begins at about 7–8 mph;
  - the trim angle is a compromise between friction drag and the drag of lift.
- Savitsky (1964), via `hullForces.ts` and `carve-drag-study.md`: the hull's planing drag under load.

**Coaching** (Rapture Camps, under https://www.rapturecamps.com/learn-to-surf/):
- `surf-maneuvers/bottom-turn`, `surf-maneuvers/top-turn`, `surf-maneuvers/compression-and-extension`, `surf-maneuvers/speed-generation`;
- `surf-fundamentals/stance`;
- `paddling/paddle-technique`.

Also:
- Mauro C (2017), WSL Performance Center, 5 Ways to Find Your Flow;
- SurfDeeper; Cornish Wave (via the stance map);
- the owner's reel: barefoot_surf, Jesse Mendes (`phase2-video-check.md`).

**The game's own studies:**
- `docs/research/rail-control-study.md`, `lean-in-study.md`, `bottom-turn-entry-study.md`, `body-lean-study.md`, `carve-drag-study.md`, `angulation-study.md`, `rail-change-study.md`;
- `docs/superpowers/plans/2026-10-02-physics-posture.md`, `2026-10-04-paddle-swim.md`, `2026-10-22-animation-realism.md`.

**The static calculation** behind §1.2, §2.2 and §2.8 is a scratch script, not in the repo. Its inputs are the constants named above. Its model:
- the pressure is the centre of mass's shift plus H × d / n, with the dead zone and the reach;
- the pelvis is 0.78 sin τ plus the shifts;
- the knee comes from two 0.45 m bones;
- the paddle thrust is quasi-steady hand drag, as `handLocal` (`:1317–1339`) moves the hand.
