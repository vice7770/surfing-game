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

**What the drawn body does now** (the rig, `src/scene/rig/HumanoidRig.ts`; its blend of the physics' state, `stanceBlend.ts`):
- **The trunk hinges at the hips toward the stance's hip angle:**
  - 147.5° standing tall down to 75° at Compress's depth (the map's middles: Weiss 2025 and SurfDeeper; de Sousa 2022);
  - the pelvis moves back over the heels as far as keeps the body's centre of mass where the upright body has it (Winter 2009's segments, solved on a model of the posed body: within 0.1 cm in trim and the drop, 1 cm in Compress);
  - backside, no further over the toes than the middle of Hobgood's ±20°, so the heel-side hand still reaches the water;
  - no faster than a brisk trunk bend (4 rad/s).
- **The legs** may straighten to about 160°, never locked (the rig had stopped them at 152°).
- **Free arms take the stance's shape:** 40° from the trunk's down standing tall and 55° crouched, the elbow at 155°, keeping the physics' hand's heading about the trunk. Hands in the water, on a rail or in the face stay on their points.
- **The clavicles follow their arms:** a third of the arm's rise above 30° (the scapulohumeral rhythm), forward with a forward reach.
- **Past 40° of loaded ankle flexion the heel lifts** about the ball, the toes flat on the deck (weight-bearing dorsiflexion: 30° or more healthy, about 40° typical). The gauge now reads the ankle as the joint's flexion, shin to foot.
- **In a snap the chest turns with the turn either way:**
  - the trim's opening toward the nose yields to the snap, and the snap's twist is 45°;
  - the backside snap's chest had faced the toes (Hobgood, the Bali camp).
  - The head leads a turn over 0.6 s, toward the lip in the frontside bottom turn (de Sousa 2022).

**Against the map:** 38 of 99 targets miss, against step 2's 46; 61 are met, against 53 ([stance-map.md](../../research/stance-map.md)).
- **Newly met:**
  - Compress frontside's front hip (127° → 73°) and rear knee (97° → 88°);
  - trim's trunk over the toes (0° → 14°), rear hip, ankles and arms;
  - the drop's leading elbow (180° → 155°);
  - the backside snap's chest (−1° → −24°);
  - Compress's head (75° → 67°) and trailing elbow;
  - the hand in the face's lower hand.
- **Low-confidence misses:** 21 → 13.
- **Medium and high misses: 25 either way.** Two new ones come from the pelvis moving back:
  - Compress frontside's front knee, 69° against 70–90°;
  - extension's rear knee, 147° against 150° or more.
- **The stance-target test** (`src/dev/stanceTargets.test.ts`) holds every medium or high target the drawn pose owns on surfer2, Regular and Goofy. Thirteen known misses are listed with their reasons (the physics' weight and timing, the backside trunk's conflict, the hand's blend, the landing's glide). A new miss or a fixed one fails it.

**Fixed on the way:**
- **The frontside Compress hand now reaches the water.** It was Part B's pinned 6.6 cm miss; folded over the toes, the shoulder comes over the hand.
- **The snapshot track no longer blends a riding body's points into a fallen one's across the fall.** Tips and limb centres are different points, and the blend drew a "standing" body with its feet half-way to the fallen legs' centres (step 1's).
- **The arm no longer reads its shoulder from last frame's clavicle.**
- **Found by the regenerated map:**
  - a free hand now moves with its clavicle (the clavicle had closed the arm on its own target: the lead elbow at 97° in Compress);
  - the free arm's elevation is the upper arm's, the soft elbow below the wrist's line;
  - in a snap the trailing arm swings up (the Bali camp), where the free arm had lowered it.
- **The clavicles and toes return to rest when not driven,** and the smoothing layer blends them.

**Open, for the user's eye and for later steps:**
- **The snap's and top turn's raised leading arm bends sharply at the elbow,** an open hand up, which can read as a wave: Part B's leading-arm cue on top of the soft elbow.
- **The pump's arms,** pushing down as it extends and pulling up as it compresses, need to know whether the body is rising or falling: step 4.
- **The drawn Compress hand still blends down to the water** 0.4 s in (0.39 m where the physics' is at 0.12 m): step 1's point blend carries the hand's switch.
- **The landing's feet glide apart** for about 0.6 s after it (the physics jumps them from the lying legs): step 6, then the blend.
- **The physics' weight sits forward.** Trim reads 0.64, extending 0.71 against the thesis's 0.35–0.45, and the pump's extension 0.78; this bends the front knees in trim and extension (step 6).
- **The backside Compress hips** stay at 97–143° against the thesis's 90° or less: the upright trunk Hobgood's cue asks for, a conflict between sources.
- **Compress's front ankle floats 2 cm above its target** on the 47° rail, with or without the hinge.
- **Performance:** the hinge costs about 1.6× a plain solve, a fraction of a millisecond per surfer.
- **Under load, the heavy film tests take minutes.** Their timeout is 240 s.
