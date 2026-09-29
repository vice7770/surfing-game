# Feedback Cues Implementation Plan (the riding body, step 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A player reads the rider's state from the drawn body at the gameplay camera: how near the rider is to falling (balance), where the weight is (fore and aft), which rail it is on (edge and lean), and how low it is (depth).

**Architecture:** First measure each cue, then fix only what the measure proves unreadable.
- **The measure:** each cue's reading is how far the drawn body moves, in centimetres, between the extremes of its input, at the points a player watches (the hands, the head, the hips).
  - The front view sits about 11 m from the rider with a 52° field of view: about 100 pixels per metre at 1080p.
  - A cue moving 10 cm (about 10 pixels) or more is readable.
- **Balance, found lost:** the physics spreads its drawn hands as the balance margin runs out (`AttachedRider`: `ARM_SPREAD` 0.7 at ease, up to `ARM_ALARM` 0.8 more). Since step 3, the rig's free arms keep only the hands' heading and set their own reach, so the drawn arms no longer show it: 49–52 cm from the shoulder at any balance, where the physics' hands go from 79 to 110 cm.
  - The rig reads the alarm back from the physics' hand points: their distance from the torso over the arm's rest offset in the physics posture. So remote surfers get the same cue, with no wire change.
  - The free arms rise and straighten toward outstretched with the alarm. Outstretched arms steady a challenging stance (Patel et al. 2014), and the arms matter most when side-to-side balance is challenged (Objero et al. 2019).
- **Weight, edge and depth** come from the physics' pelvis, lean and crouch. They are checked for readability; any found under 10 cm gets the smallest real-surfer exaggeration, sourced.
- **Speed and ride phase** (nice-to-haves): out of scope unless a cue falls out of the measures for free.

**Tech Stack:** TypeScript, three.js, vitest; the body film and stance recipes; the surfer sheet's motion view and `scripts/browser/motion-clip.mjs` for the clips.

**Spec:** the grilling (memory `riding-body-animation`):
- feedback cues: balance, weight fore and aft, edge and lean, and depth are must-haves; speed and ride phase are nice-to-haves;
- realistic by default, exaggerating only feedback cues, and only as far as a real surfer might;
- readability judged at the gameplay cameras;
- online surfers get their cues from what they already send (no wire change);
- clips after step 5.

## Global Constraints

- **Realistic first:** a cue exaggerates only as far as a real surfer might, with a source.
- **From the physics only:** every cue reads the drawn state, which the physics sets: its points, board, motion and clock. No new wire fields.
- **The anchors hold:** the feet on their points, and a hand on a point stays on it.
- **Nothing pops:** the switch tests pass, and each cue changes smoothly with its input.
- **The steering and the physics are untouched.** Constants are cited in their `RIG_DETAIL` comments, and provisional ones are marked.
- **The stance map:** `stanceTargets.test.ts` holds. A low target that moves with a cue is reported, not tuned.
- Performance is never a gate. English only.

## Review Focus

1. **The alarm read at the physics' own spread:** at ease (balance 1) the arms keep step 3's shape exactly; the alarm rises only with the physics' spread, for Regular and Goofy, standing only.
2. **A hand on a point** (in the water, in the face) never rises with the alarm.
3. **A fall:** the arms flung out just before it must hand over to the fallen body without a pop (`blendsOut('a fall')`, `'pumping into a fall'`).
4. **Online surfers:** the alarm read from batched snapshots rises and falls smoothly.
5. **The turn cues on top** (the lead arm, the snap's trailing arm) still show with the alarm.

---

### Task 1: The cue measures

**Files:** modify `src/dev/bodyFilm.ts` (the frame's `balance` and `physicsHands`), its test; `scripts/body-report.ts`.

- **`balanceCue(film)`:** the regression of the drawn hands' distance from their shoulders on the physics' alarm (1 − balance), over the standing frames. It reports the slope (cm per full alarm) and the correlation.
- **The static cues,** each from stance recipes drawn as the game draws them:
  - **weight:** trim back against trim forward, the drawn hips' and head's shift along the board;
  - **edge:** Compress frontside against backside, the head's shift across the board;
  - **depth:** trim against Compress, the hips' drop.
  - Each is the largest of its points' shifts, cm.
- [ ] **Tests:** the measures on hand-built frames (a known slope; a known shift). Record the baseline in the ledger: balance, weight, edge and depth.
- [ ] Commit.

### Task 2: The balance cue restored

**Files:** modify `src/scene/rig/HumanoidRig.ts` (`freeArm`; a `balanceAlarm` reading); export `ARM_SPREAD` and `ARM_ALARM` from `src/physics/AttachedRider.ts`; tests in `src/scene/rig/stanceMotion.test.ts` and the film.

- **`balanceAlarm(state, side)`, 0–1:** the physics hand's distance from the torso point over the arm's rest offset from it in the physics' standing posture (`riderPose`), less 1 and `ARM_SPREAD`, over `ARM_ALARM`. It is 0 at ease and 1 with no margin left, standing only, and none for a hand on a point.
- **The free arm, as the alarm rises:**
  - its elevation rises from the stance's (40–55°) toward `arms.alarmElevation` (90°: arms out to the side);
  - its elbow straightens from 155° toward `arms.alarmElbow` (175°);
  - both follow the alarm (Patel et al. 2014; Objero et al. 2019).
  - The turn cues (the lead arm, the snap's swing) apply on top as before.
- [ ] **Failing tests:**
  - through the weave and the rail change (film, 30 and 60 Hz), the drawn hands' distance from the shoulders correlates with the physics' alarm above 0.7, and the slope is 10 cm or more per full alarm;
  - at ease the arms read step 3's angles (the stance targets hold);
  - a hand on a point stays on it;
  - the switch films still pass;
  - delivery 3 shows no jerk (the hands' acceleration no more than 1.5 times delivery 1's).
- [ ] Implement; commit.

### Task 3: Weight, edge and depth

- [ ] **Readability tests:** each of the three reads 10 cm or more (Task 1's measures), for Regular and Goofy.
- [ ] **If one fails:** find why (systematic-debugging) and give it the smallest exaggeration a real surfer shows, with a source:
  - weight: the trunk over the loaded foot (coaching: 60/40 to 40/60);
  - edge: the lean into the rail;
  - depth: the crouch.
  - The ruling goes in the ledger.
- [ ] Commit.

### Task 4: Validation and the hand-over

- [ ] `stanceTargets.test.ts` holds; `npm run report:stances`; `npm run report:body` with the cue rows.
- [ ] **Clips (the plan's clips come after step 5):**
  - `scripts/browser/motion-clip.mjs` films the weave with its loss of balance, a trim fore and aft, a rail change and a Compress;
  - step 3's clip and a clip at step 4's end are the "before";
  - send them to the user.
- [ ] Findings, the ROADMAP line, the whole suite, the final review, the PR.

## Findings

**The balance cue had been lost, and is back:**
- Since step 3 the free arms kept only the physics' hands' heading and set their own reach. The physics spreads its hands from 79 cm off the torso at ease to 110 cm with no margin left, but the drawn hands stayed 49–52 cm from their shoulders at any balance. Their height followed the turn cues, correlating 0.30–0.37 with the alarm.
- **The rig now reads the physics' alarm back from its hand points:** their distance from the torso over the arm's rest offset in the physics posture, the lesser of the two hands. Online surfers send the same points, so there is no wire change.
- **Each free arm goes that share of the way to outstretched (90°) and straight (175°).** Outstretched arms steady a challenging stance (Patel et al. 2014), and the arms matter most when side-to-side balance is challenged (Objero et al. 2019). In a turn the leading arm stays the turn's, reaching where the head looks; the trailing arm shows the balance.
- **Measured through the weave:** the hands rise 29 cm per full alarm, correlating 0.77. The trailing arm goes the alarm's share of the way to outstretched (0.85 through the weave, 0.95 through the rail change). Batched snapshots don't jerk it.
- **At ease, step 3's arms are unchanged:** the stance targets hold.

**Weight, edge and depth already read well** at the hips and head (the front view: about 100 pixels per metre at 11 m), on all four surfers:
- weight, trim back to forward: 30 cm along the board;
- edge, Compress frontside to backside: 20–24 cm across it;
- depth, trim to Compress: 36–38 cm.

No exaggeration was needed.

**Against the map:** 39 of 99 targets miss (step 4: 37). Two low-confidence arm targets moved:
- the pump's extending lead arm, 40° → 56°;
- the pump's extending trailing arm, 32° → 50°.

The physics' balance margin falls to about 0.05 at each pump extension, and the cue shows it. The coaching cue has the arms pushing down on the extension, an active drive the arms don't have (step 4). Every medium and high target is unchanged.

**Clips:** the surfer sheet's motion view films the same motions with the cue on and off (`&alarm=0`): pumping, trim back and forward, and Compress frontside and backside.

**Open, for the user's eye and for later steps:**
- **A pump reads as a near fall.** The physics' margin nearly empties at each extension. Whether it should is step 6's (the physics posture).
- **The arms' active drive** (pushing down to pump) is not modelled.
- **Speed and ride phase** (the nice-to-haves) are not drawn as cues.
- **While a hand is in the face,** the balance shows only as far as the placed hand's reading allows (the lesser of the two).

