# Secondary Motion and Breathing Implementation Plan (the riding body, step 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The drawn body moves with the physics' motion, not only its pose: the free arms swing with the body's accelerations, the head holds steady, the knees give with the board, and the chest breathes, faster when the surfer has worked.

**Architecture:** Two new modules drive what the physics does not already give, and the rest is checked where the physics already gives it.
- **What the physics already gives** (checked, changed only if the checks fail):
  - the knees' give: the physics' leg is a spring and damper along the vertical (Matsumoto & Griffin 1998's 2.75–5.5 Hz; `AttachedRider`'s LEG_STIFFNESS), so the pelvis point already heaves against the board;
  - the trunk's counter-motion: the physics' banked body, sway and swing (P4e, P9, Part B).
- **The rig already holds the head to the world's vertical** (Part B's look): checked against the chest.
- **New:**
  - `armSwing.ts`: each free hand is a mass on a critically damped spring about its target, in a frame that moves with the target. The target's own accelerations (the body's pump, a turn, a cue changing) make the hand lag. The arms act as passive mass dampers driven by the body (Pontzer et al. 2009).
  - `breathing.ts`: a breathing cycle from the clock, at a rate and depth set by an exertion that rises with the physics' work (paddling, pumping, swimming, a held breath) and eases back at rest.
- Both are stateful per clock, like step 3's hinge. A standing clock keeps them, a fresh solve or `reset()` starts them at rest. Both live in `HumanoidRig`'s solve, before the limbs are solved, so step 1's smoothing layer sees them as the rig's own motion.

**Tech Stack:** TypeScript, three.js, vitest; the body film (`src/dev/bodyFilm.ts`); `drawnRecipe` and the stance gauge; the surfer sheet's motion view and `scripts/browser/motion-clip.mjs`.

**Spec:**
- The grilling (memory `riding-body-animation`): secondary motion from the physics only (arms and hands, head stabilisation, knee compliance, trunk counter-motion), plus breathing; no random idle sway; realistic by default (Q3); all four surfers; online surfers from the same rig with no wire change.
- Step 3's hand-offs (`docs/superpowers/plans/2026-09-29-stance-poses.md#findings`): the pump's arms, pushing down as the body extends and up as it compresses; the arms' turn rate (`armRate`) as a stand-in for arm dynamics.

## Global Constraints

- **From the physics only:** every motion here is driven by the drawn state's motion (the points, the board, the clock, the physics' stroking, swimming and breath). No noise, no random idle sway.
- **The anchors hold:** the feet on their points; a hand the physics puts in the water, on a rail, in the face, paddling or pushing stays on its point. Only free hands swing.
- **Rates:** the drawn body is the same at any display rate (30–144 Hz) and with snapshots drawn twice or batched by three (online surfers at 20 Hz), within the body film's tolerances.
- **Switches** stay blended out (step 1's `blendsOut` film tests keep passing): nothing new pops at a phase change.
- **Constants come from sources or from the skeleton**, each cited in its `RIG_DETAIL` comment; a modelling choice is marked provisional. Nothing is tuned to pass a test.
- **The stance map's readings** stay where step 3 left them (38 of 99 miss): breathing is symmetric about the neutral pose, and a settled swing adds nothing.
- **The steering and the physics are untouched.** Online surfers are posed by the same rig; the wire format is unchanged.
- Performance is never a gate. English only.

## Review Focus

1. **Display rates and repeated frames:** at 30, 60 and 144 Hz, and with each 60 Hz snapshot drawn twice at 120 Hz, the swing and the breath match (a clock standing still keeps them). Task 2 and Task 4 each carry a rate test.
2. **Switches and restarts:** a pop-up, a landing, a fall, lying down, a retry or a teleport: the swing starts from rest in the new phase, with no carried-over fling; `reset()` clears both modules. Task 2 adds a film case to `blendsOut`.
3. **Hands on points never leave them:** paddling, pushing, a hand in the water or the face. Task 2 tests each.
4. **Online surfers** (snapshots batched by three): the swing driven by their stepped motion stays smooth, with no jerk at each batch. Task 2 tests delivery 3.
5. **The stance map's readings** after both modules: `stanceTargets.test.ts` unchanged, and the regenerated map still 38 of 99. Task 5 checks.

---

### Task 1: The film's secondary-motion measures, and chop

**Files:** modify `src/dev/bodyFilm.ts` and `src/dev/bodyFilm.test.ts`; `scripts/body-report.ts` (the `report:body` script) if it lists measures.

**Interfaces:**
- **A bumpy water** for the film: `water: 'chop'` is a surface `0.05 m × sin(2π z / 4 m)` along the travel, with its slope. At 8 m/s the board meets two bumps a second. It is a test surface, not a sea state.
- **`FilmFrame`** gains, in the world:
  - the head's and the chest's rotations;
  - each shoulder's and each hand's position;
  - the drawn pelvis's height over the deck, and the physics' own;
  - the board's height.
- **Measures:**
  - `headSteadiness(film)`: the RMS of the head's world turning speed over the chest's, riding frames only (1: none; under 1: the head steadier than the chest).
  - `handSwing(film, side)`: the RMS of the hand's position relative to its shoulder after removing its 1 s running mean, m. It is 0 for an arm locked to its cue.
  - `kneeGive(film)`: the correlation between the drawn pelvis's height over the deck and the physics' own, on chop.
  - `breathing(film)`: the chest's rise relative to the pelvis, band-passed at 0.15–1 Hz, RMS, m.
- **New film scenarios:**
  - `pumping`: three pulses (`crouch` 1 and 0 every 0.4 s from 0.4 s), 8 m/s, flat;
  - `chop`: straight at 8 m/s on chop;
  - `paddle then sit`: prone and stroking for 20 s, then gliding still for 10 s, for breathing.

- [ ] **Tests (the baseline, recorded in the ledger):**
  - each measure reads 0 on a still film built by hand, and the right value on a hand-built sine;
  - on the real films, record today's values: head steadiness through the weave, pumping and chop; hand swing through pumping; knee give on chop; breathing (expected 0).
- [ ] Implement; commit.

### Task 2: The arms swing (Pontzer et al. 2009)

**Files:** create `src/scene/rig/armSwing.ts` and `armSwing.test.ts`; modify `src/scene/rig/HumanoidRig.ts` (the arms loop, `reset()`); test in `src/scene/rig/stanceMotion.test.ts` and the film test.

**Interfaces:**
- `class ArmSwing`:
  - `constructor(omega: number)`: the arm's pendulum frequency, rad/s, which the rig computes from its skeleton;
  - `follow(side: Side, target: Vector3, share: number, clock: number): void` moves `target` to where the hand hangs.
    - `share` (0–1) is how free the hand is: the rig's `1 − reachDepth(hand)` standing, 0 for a hand on a point or any phase but standing.
    - A hand with share 0 is left alone, and its state set at rest on the target.
  - `reset(): void`.
- **Dynamics:** the hand's offset from its target, x, with velocity v, follows `x'' = −ω²x − 2ζω x' − a` over the time since the last call.
  - `a` is the target's acceleration: the change of its velocity since the last call, applied to v as an impulse.
  - The step is the exact solution of the critically damped spring over dt, so it is the same at any rate.
  - A clock standing still keeps the state; a gap over 0.25 s or a fresh start begins at rest.
- **ω** is the arm's own pendulum from the skeleton: `√(g·d/k²)`.
  - d is the arm's centre of mass from the shoulder, and k its radius of gyration about the shoulder, from the upper arm, forearm and hand (Winter 2009's segment masses, centres and radii).
  - About 4–5 rad/s, computed by the rig once.
- **ζ = 1:** critically damped, provisional.
  - Pontzer's arms are passive mass dampers.
  - A standing surfer holds them by muscle tone, and the grilling rules out wobble.
- The offset stays within `swingMost`, 35° of the shoulder-to-target direction, at the target's reach (provisional: the arm's travel before it is held).
- **`armRate`** (step 3's stand-in) stays unless the swing alone keeps the weave's hand under 20 rad/s. If so, drop it (a ruling).

- [ ] **Failing tests:**
  - **pump** (`stanceMotion.test.ts`, surfer2, both stances): through pumping, the free hands dip relative to their shoulders as the body rises. The correlation between the hand's vertical offset and the shoulder's vertical acceleration is below −0.5. The swing's RMS is 2–15 cm (Pontzer: the arms counter the body's motion);
  - **settles:** riding straight, the offset is under 1 cm after 1 s;
  - **rates:** the pumping film at 30, 60 and 144 Hz and delivery 3: the hands' offsets agree within 1 cm at matching times, and no jerk at the batches;
  - **anchors:** paddling, pushing, Compress's hand in the water and the hand in the face stay within 1 cm of their points;
  - **switches:** a fall mid-pump and lying down from a pump, filmed: no spike above the existing `blendsOut` limits;
  - **weave:** the hand's spin stays under 20 rad/s (step 3's test) with the swing.
- [ ] Implement; run the rig, dev and film suites; commit.

### Task 3: The head and the knees, from the physics

**Files:** tests in `src/scene/rig/stanceMotion.test.ts` and `src/dev/bodyFilm.test.ts`; code only if a test fails.

- **The head holds steadier than the chest** (Pozzo, Berthoz & Lefort 1990: the head's pitch held near the horizontal through walking, running and hopping, while the trunk moves): `headSteadiness` under 0.7 through the weave, pumping and chop, at 30 and 60 Hz.
- **The knees give with the physics' leg:** on chop, `kneeGive` above 0.8. The drawn pelvis heaves as the physics' does; the rig's standing lift and legs' reach do not flatten it.
- **Trunk counter-motion** is the physics' (the banked body and sway): nothing drawn is added.

- [ ] **Tests:**
  - If they pass at once they pin what the physics and Part B already give. Ledger it as a pin, not a RED.
  - If one fails, find why (systematic-debugging) and fix it in the rig, RED → GREEN.
- [ ] Commit.

### Task 4: Breathing

**Files:** create `src/scene/rig/breathing.ts` and `breathing.test.ts`; modify `HumanoidRig.ts` (after the spine's reach bend, before the neck; `reset()`); `RIG_DETAIL.breath`.

**Interfaces:**
- `class Breathing`:
  - `update(state: RiderVisualState): number` returns the chest's extension this solve, rad (+ inhaling, back about the body's left), and advances the cycle with `state.clock`;
  - `reset(): void`;
  - `exertion` (0–1) and `rate` (breaths/min) are readable for tests.
- **Rate:** 16 breaths/min at rest, within the clinical 12–20, up to 36 at full exertion (Blackie et al. 1991: 36 ± 9 at maximal exercise).
- **Depth:** the upper chest's front-to-back growth per breath.
  - At rest, 1.5 % (quiet breathing); at full exertion, 21 % (deep breathing). Yang et al. 2022 measured 1.01–1.02 quiet and 1.20–1.22 deep, by MRI at the aortic arch.
  - On a 0.2 m chest, the growth moves the sternum 3 mm to 4.2 cm.
  - The rig turns the upper spine back by the angle that moves the sternum that far about the spine's middle: its lever is half the skeleton's trunk length, so about 1° to 12°.
- **The cycle is a sine, symmetric about the neutral pose,** so the stance map reads the same on average.
- **Exertion is a slow average of the physics' work:**
  - activity is `max(stroking lying down, 1 while swimming, the legs' speed over 0.4 m/s standing)`;
  - it rises toward the activity over 5 s (breathing rises fast at the onset: Nicolò et al. 2017) and eases over 30 s (provisional);
  - coming up from a held breath adds `1 − breath`.
- **Holding the breath:** under water (`swim.under`) or duck-diving, the cycle stops at its current point and resumes at the surface.
- The upper two spine bones take half the extension each. The neck and head keep their world directions: the shoulders and a free arm move with the chest, and a hand on a point stays on it.

- [ ] **Failing tests:**
  - at rest, the rate is 16 and the chest's rise under 5 mm;
  - after 20 s of paddling, the rate is above 28 and the rise above 1.5 cm; 30 s after stopping, the rate is back under 22;
  - the cycle holds under water and resumes;
  - the same cycle at 30, 60 and 144 Hz and with repeated frames (within 2 % of phase);
  - the film's `breathing` reads above 0 in the paddle film, and the switch tests still pass;
  - the stance gauge's readings over a whole breath average to step 3's within 0.5°.
- [ ] Implement; commit.

### Task 5: Validation and the hand-over

- [ ] `src/dev/stanceTargets.test.ts` unchanged; `npm run report:stances` still 38 of 99.
- [ ] The body film's fluidity tests all pass at every rate. `npm run report:body` records the new measures against Task 1's baseline.
- [ ] **Clips** (the plan's clips come after steps 1, 3 and 5, and step 4 changes motion): `scripts/browser/motion-clip.mjs` films trim, the bottom turn, the snap, pumping and the weave after step 4. Step 3's clip is the "before". Send both to the user.
- [ ] Findings in this plan, the ROADMAP line, the whole suite, the final review, the PR (stacked on #59; left to the user to merge).

## Findings

**What the drawn body does now** (`src/scene/rig/armSwing.ts`, `breathing.ts`, in `HumanoidRig`):
- **The free hands swing with the body** (Pontzer et al. 2009: the arms as passive mass dampers driven by the body):
  - each is a mass on a critically damped spring about its cued place, at the arm's own pendulum: about 4.8 rad/s (0.76 Hz), from Winter 2009's segments on each skeleton's arm;
  - the swing is driven by the shoulder's motion less its running mean over 0.5 s, so a pump leaves the hands trailing below the shoulders as the body rises, while a glide slowing or a carve's steady pull (the body leans against it) does not hold them off;
  - a hand on a point keeps it, and lying, pushing and fallen the swing rests.
- **The chest breathes:**
  - 16 breaths a minute at rest, up to 36 at full work (Blackie et al. 1991);
  - the upper chest grows 1.5 % to 21 % of its depth per breath (Yang et al. 2022), about 0.4° to 6° each way at the upper spine;
  - the work comes from paddling, swimming, the legs pumping and a held breath; it rises within 5 s (Nicolò et al. 2017) and eases over 30 s;
  - the breath is held under water and while duck-diving;
  - the neck and head keep their world directions.
- **Already given, now pinned:**
  - the head's tilting is 0.08 of the chest's through a weave, 0.25 through a pump and 0.38 on chop (Part B's world-up head; Pozzo et al. 1990);
  - the drawn hips follow the physics' leg over chop (correlation 0.93: P9's leg spring);
  - the trunk's counter-motion is the physics' banked body and sway.

**Measured** (the body film, `docs/research/body-fluidity.md`, the page's pipeline):
- the free hands' swing about their shoulders through a pump: 12.6 and 10.6 cm RMS, against 8.4 and 7.4 cm before (then only the cue's elevation following the crouch);
- breathing, gliding after 20 s of paddling: the head moves 13.3 mm RMS about the hips (0 before);
- the head, the knees and the switches: unchanged; the switch tests pass at 60 and 120 Hz, a fall from a pump included.

**Against the map:** 37 of 99 targets miss (step 3: 38). Three low-confidence arm targets are read mid-motion:
- extending up the face, the trailing arm: 61° → 53°, now a miss;
- pumping while extending, the lead arm: 42° → 40°, now met;
- pumping while extending, the trailing arm: 43° → 32°, now met.

Every medium and high target is unchanged (`stanceTargets.test.ts`).

**Fixed on the way:** the body report's lag row had read 300 ms, the search's cap, for every pipeline since step 3: the drawn chest hinges and turns off the physics' torso roll, which no time shift matches. It now reads the drawn chest against the rig's own chest on the newest snapshot: 0 ms for the rig on the newest snapshot, 17 ms blended between physics steps, 34 ms with the switches blended out (step 1 read 0, 25 and 54 ms against the physics).

**Open, for the user's eye and for later steps:**
- **The arms are passive.** A surfer also swings them to drive a pump, and that active drive is not modelled.
- **`armRate` stays.** The swing follows the body, not the cue, so a snap's arm reversing still needs step 3's rate. Without it the weave's hand turns at 24.6 rad/s.
- **The drawn body differs a little from one display rate to another** (the hand about its shoulder, 4.3 cm at 30 vs 120 Hz through a pump, with no swing): step 3's hard rate limits chase a moving target step by step.
- **A hand reaching the water still arrives through step 1's smoothing,** over about 0.15 s.
- **Final review:** a self-review, not a fresh reviewer (below, in the PR).

