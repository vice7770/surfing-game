# The Stance Poses Implementation Plan (the riding body, step 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shape the drawn riding body toward the stance map (step 2): the trunk hinging at the hips, the arms and elbows, the clavicles and toes, the twist and the head. The physics keeps its feet, its centre of mass and its hands where they touch something.

**Architecture:** This is the grilling's hybrid (Q6).
- **What the physics still decides:** the lean, the crouch, the weight and the balance.
- **What each stance adds:** a reference shape, blended continuously by the physics state:
  - how deep the crouch is;
  - how hard it turns, and toward which rail;
  - how far back the weight is;
  - whether a hand reaches down.
- **How the shape is applied:** in `HumanoidRig`, before the limbs are solved.
  - The trunk hinges at the hips until the hips reach the stance's angle.
  - The pelvis moves back over the heels, so the drawn centre of mass stays where the physics' upright body puts it.
  - Free arms take the stance's shape.
  - The clavicles follow the arms; the toes lie on the deck.
- **Checks:** tests read each stance through the step-2 tools (`drawnStance`, the stance gauge) against the map's ranges.

**Tech Stack:** TypeScript, three.js, vitest; the step-2 tools; the surfer sheet in the browser.

**Spec:**
- The grilling (memory `riding-body-animation`): the hybrid (Q6), realistic by default (Q3), the physics posture changed only where the map proves it wrong and as a separate step (Q9), all four surfers (Q18), clavicles and toes (Q15), and tests of each stance's angles against the map (Q14).
- The stance map: `docs/research/stance-map.md` and `docs/superpowers/plans/2026-09-28-stance-map.md#findings`.

## Global Constraints

- **The physics' anchors hold:**
  - the feet on their points;
  - the centre of mass where the physics' upright body puts it (within 2 cm);
  - a hand the physics puts in the water, on a rail or in the wave's face stays there.
- **The shapes come from the map's targets** (the middles of their ranges). The targets are never moved to pass a test. A target the anchors cannot reach stays a recorded miss.
- **Tests assert** every target of medium or high confidence that step 3 owns. Low-confidence ones steer the shape and are reported, not asserted: they rest on a frame read by eye, or a cue turned into a number.
- **No bone stretches;** only rotations change, plus the hips' place.
- **Regular and Goofy mirror;** frontside and backside follow the turn.
- **Online surfers** are posed by the same rig; the wire format is unchanged.
- **The steering and the physics are untouched.**
- Performance is never a gate. English only.

## Review Focus

1. **Crossing from lying, pushing or fallen into standing** (and back): the shapes blend in with the standing blend, with no pop the step-1 layers would have to blend out.
2. **A hand reaching the water or the face** keeps its point while the trunk hinges: the arm reaches, the hinge adds to the reach bend rather than fighting it.
3. **A board rolled onto a rail at 40–50°:** the hinge is toward the toes on the deck, not toward the world's horizon.
4. **Goofy, and each of the four skeletons:** the same angles within a few degrees.
5. **A stance the physics cannot reach** (a fall, a transition): nothing new applies outside standing, and the landing keeps its current easing.

---

### Task 1: The stance blend

**Files:** create `src/scene/rig/stanceBlend.ts` and its test.

**Interfaces:**
- `stanceBlend(state, standingPelvis) → { depth, turn, back, reach }`:
  - `depth` (0 standing tall → 1 at Compress's full depth) from the pelvis's drop below the physics' standing height on the deck;
  - `turn` (−1 to 1, + toward the toes' rail) from the yaw rate and the stance's side;
  - `back`: the weight onto the back foot (the rig's `weightBack`);
  - `reach`: a hand below the hips (`reachDepth`).
- Pure: no bones.

- [ ] **Failing tests** (states from `stanceState`):
  - `depth` rises trim < drop < Compress;
  - `turn` is positive in Compress frontside and negative backside, for both stances;
  - `back` is 0 in trim and the most in the snap;
  - `reach` is above 0 in Compress.
- [ ] Implement; commit.

### Task 2: The trunk hinges at the hips, the centre of mass kept

**Files:** modify `src/scene/rig/HumanoidRig.ts`; test in `HumanoidRig.test.ts` and a stance-target test in `src/dev/stanceTargets.test.ts`.

**Interfaces:**
- `RIG_DETAIL.hipAngle: { tall, deep }`: the hips' included angle at `depth` 0 and 1, the map's middles.
  - Trim: 147.5° (Weiss 2025 and SurfDeeper, 130–165°).
  - Compress: 75° (de Sousa 2022, 60–90°).
- Standing, the trunk bends forward at the hips toward the toes on the deck.
  - It stops where the hips' mean angle reaches `lerp(tall, deep, depth)`.
  - The pelvis moves back along the same line, so the body's centre of mass (Winter 2009's segment shares) stays at the upright body's.
  - It blends in with `standingBlend`.
- The reach bend applies after the hinge, adding to it.

- [ ] **Failing tests:**
  - trim's trunk over the toes lands in 10–35° (low: reported);
  - Compress's hips reach 60–90° (medium: asserted);
  - the centre of mass moves under 2 cm, standing and compressed;
  - the feet stay on their points;
  - Compress's reaching hand stays on its point;
  - the drawn body lying, pushing and fallen is unchanged.
- [ ] Implement; commit.

### Task 3: The legs' reach

**Files:** modify `HumanoidRig.ts` and its test.

- The rear knee stops at 152° because the rig caps a leg's reach at 0.97 of its length. The map wants 150° or more when extending (de Sousa 2022, medium). The cap becomes `legReach: 0.99` (about 164°). The front knee's extra bend is the physics' weight (step 6), recorded.

- [ ] **Failing test:** extension's rear knee reaches 150° or more; no leg straightens past 165°.
- [ ] Implement; commit.

### Task 4: The free arms and the elbows

**Files:** modify `HumanoidRig.ts`; `RIG_DETAIL.arms`.

- A standing arm the physics does not hold anywhere (its hand above the hips, not reaching) takes the stance's shape, blended by the stance blend:
  - trim, out from the trunk 40°, elbows soft (SurfDeeper: hands over their rails, quiet);
  - the drop, the lead arm 55° forward and low, elbow 155° (Kerr);
  - extending up the face, both arms out wide (the lead 95°, the trailing 85°), elbows 150–160° (de Sousa 2022; Gudauskas);
  - Compress, the arm that does not reach bends, elbow about 95° (Gudauskas).
- The leading arm's turn cue (Part B) and the snap's raise still apply on top.

- [ ] **Failing tests:** each arm target lands in range for Regular and Goofy. All are low, so this test asserts they move toward the middle from today's values and do not cross the other way.
- [ ] Implement; commit.

### Task 5: The clavicles and the toes

**Files:** modify `HumanoidRig.ts`; `REQUIRED_BONES` already holds the shoulders and toes.

- **The clavicle** lifts and swings forward with its arm: a third of the arm's elevation above 30° (the scapulohumeral rhythm, Inman et al. 1944: about 2:1, glenohumeral to scapular), and protracts with the arm reaching forward.
- **The toe** lies on the deck: the toe base turns so the toes meet the deck, whatever the ankle's flexion.

- [ ] **Failing tests:**
  - an arm raised 90° lifts its clavicle 15–25°;
  - the toes' tips stay within 1 cm of the deck standing and compressed.
- [ ] Implement; commit.

### Task 6: The twist and the head

- **The backside snap's chest:** the map wants it turned toward the tail (Hobgood, low); today it reads −1°. Find why the snap's twist is lost backside and fix it (systematic-debugging).
- **Compress's head:** the map wants it turned toward the lip within 70° (de Sousa 2022, low); today it reads 75°.

- [ ] **Failing tests** for both, reported as low.
- [ ] Fix; commit.

### Task 7: The stance targets, the report and the hand-over

- [ ] `src/dev/stanceTargets.test.ts` asserts every target of medium or high confidence owned by step 3, on the test humanoid and surfer2, Regular and Goofy. A target the anchors cannot reach is pinned `it.fails` with its reason.
- [ ] Regenerate `npm run report:stances` and compare with step 2's 46 misses.
- [ ] Take before and after surfer-sheet images (`?stances`, `?riding`) and send them to the user (the plan's clips after step 3). The session recorder cannot catch a wave.
- [ ] Findings, the ROADMAP line, the whole suite, the final review, the PR (stacked on #56; left to the user to merge).

## Findings

(Filled in during execution.)
