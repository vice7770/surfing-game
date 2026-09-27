# Part B: the Riding Surfer's Body Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The skinned surfer rides with a body the physics poses: real knee bend and extension, the upper body's swing drawn, the trunk turning into turns with the leading arm, the head looking where the board goes, and a reaching hand the arm actually reaches. Other surfers online get the same.

**Architecture:** The physics stays the authority. Its seven drawn points already carry the crouch (the pelvis drops), the weight (the torso shifts), the balance (the arms spread) and the reaching hand. `renderPoint` adds the upper body's swing to them, so the online wire format is unchanged. The rig learns three new things:
- it maps the physics' standing height to the model's extended legs, so the knees read true;
- a small motion estimate, from the drawn states over sea time, gives the turn rate, the travel direction and the climb for local and remote surfers alike;
- poses written in code (G7's rule) use that motion to turn the trunk, the head and the leading arm, and to bend toward an out-of-reach hand.

**Tech Stack:** TypeScript, three.js, Vitest; the character sheet (`character-sheet.html`, `src/dev/characterSheet.ts`) and the browser pane for the visual check.

**Spec:** `docs/superpowers/specs/2026-09-27-riding-the-wave.md` item 6 and `docs/superpowers/specs/2026-09-27-stances.md` item 5, with its reference, de Sousa 2022. The G7 direction applies: surf motions are poses written in code and driven by physics state, with no hand-made clips.

## Global Constraints

- Physics is the authority. The rig follows the physics' points; code poses fill only what the physics leaves open and never move a foot off its point.
- No hand-made clips. No bone ever stretches: only rotations change, plus the hips' place.
- Regular and Goofy both work (Goofy mirrors every cue).
- Other surfers online included, with the wire format unchanged (the server validates `POSE_BYTES`).
- Reference cues (de Sousa 2022):
  - knees 90–110° crouched on the drop, 90° or less compressed, 150° or more extended;
  - the head toward the lip in the turn;
  - the trunk rotating into the extension;
  - the chest and the leading arm toward the lip;
  - the inside hand to the water.
- Riding-the-wave item 6: clearly visible crouch and extension; the torso and shoulders turning into turns with the arms leading (the upper-body swing, drawn); the head looking where the rider goes; the arms reacting to balance.
- Performance is never a gate. English only.

## Review Focus

1. **Goofy:** every cue mirrors. The leading arm is the right arm, and the twist and the look turn the same way as the board does.
2. **A retry, a teleport, or a remote surfer appearing:** the motion estimate starts over, with no yaw-rate spike twisting the body.
3. **The heading wrapping at ±π:** no spurious turn rate.
4. **Lying, pushing, landing and fallen:** the new cues stay out, and the prone and paddling poses are unchanged.
5. **Remote poses repeating or going back in time** (dt ≤ 0): no NaN, and no change to the estimate.

---

### Task 1: The motion estimate

**Files:**
- Create: `src/scene/rig/riderMotion.ts`, `src/scene/rig/riderMotion.test.ts`
- Modify: `src/scene/rig/riderVisualState.ts` (the new fields)
- Modify: `src/game/PhysicalMode.ts` (the local rider)
- Modify: `src/scene/RemoteSurferViews.ts` and its caller (remote riders; the shown sea time)

**Interfaces:**
- Produces:
  - `RiderVisualState.yawRate: number`: rad/s, positive as the heading grows (toward +x from +z).
  - `RiderVisualState.travel: Vector3`: the board's horizontal travel, a unit vector; along the heading when slower than 0.5 m/s.
  - `RiderVisualState.speed: number`: horizontal m/s.
  - `RiderVisualState.climb: number`: the board's vertical speed, m/s.
  - `class RiderMotion { update(state: RiderVisualState, time: number): void; reset(): void }`, where `time` is sea seconds. Samples are smoothed over `MOTION_TIME` (0.15 s). A sample with dt ≤ 0 changes nothing. A board more than `MOTION_JUMP` (3 m) from its last sample, or a phase coming back from `fallen`, starts over at yawRate 0, climb 0 and the heading's travel.

- [ ] Failing tests (`riderMotion.test.ts`):
  - a heading ramp at 1 rad/s sampled every 1/60 s reads a yaw rate within 0.05 of 1 after 0.5 s;
  - the same state sampled twice at one time changes nothing;
  - a ramp through +π to −π reads the same yaw rate, with no spike (Review Focus 3);
  - a board moved 10 m between samples, or one going fallen → prone, starts over (Review Focus 2);
  - travel follows the board's positions, and falls back to the heading below 0.5 m/s;
  - climb reads a board going down at 2 m/s as −2 (within 0.1);
  - no NaN for dt ≤ 0 (Review Focus 5).
- [ ] Implement: `riderMotion.ts`, the fields with their defaults in `createRiderVisualState` (yawRate 0, travel (0, 0, 1), speed 0, climb 0), and the calls:
  - local: `PhysicalMode`, with `host.snapshot.status.seaTime`, before `this.surfer.update`;
  - remote: `RemoteSurferViews.update`, which gains a `time` parameter passed from its caller (the room's shown sea time), one `RiderMotion` per remote view;
  - the character sheet: states it builds keep the defaults.
- [ ] Run `npx vitest run src/scene src/game/PhysicalMode.test.ts`; commit.

### Task 2: Knees that read true

**Files:**
- Modify: `src/scene/rig/HumanoidRig.ts` (the hips' place standing)
- Test: `src/scene/rig/HumanoidRig.test.ts`

**Interfaces:**
- Consumes: the physics' standing pelvis height above the deck, `STANDING_PELVIS` — the pelvis part's height in `riderPose(shape, 'standing', 'regular')` above `deckHeight` at the stance's middle — exported from `src/scene/rig/posturePoints.ts`.
- Produces: `RIG_DETAIL.standingKnee` (155°). Standing, the hips sit at the pelvis point raised by `lift`: the model's hip height above its ankles with both knees at `standingKnee` for the current stance width, less `STANDING_PELVIS`. The physics' crouch drop (up to 0.3 m) then bends the knees from there.

- [ ] Failing tests, on a real `AttachedRider`'s `renderPoint`s solved on the test humanoid (7 m/s on flat water, settled 1.5 s):
  - standing, both knees 140–165°;
  - crouched at 0.6, both knees 90–115°;
  - compressed (crouch 0.6 and Compress 1), both knees at most 95°;
  - no bone stretched in any of them.
  - Today they read 98°/136°, 65°/94° and 44°/81°.
- [ ] Implement; run the rig tests (the standing, prone and fallen tests must stay green); commit.

### Task 3: The upper body's swing, drawn

**Files:**
- Modify: `src/physics/AttachedRider.ts` (`renderPoint`, standing only)
- Test: `src/physics/AttachedRider.test.ts`

**Interfaces:**
- Produces: standing, the drawn torso and head turn about the body's forward axis through the pelvis by `SWING_DRAWN_CHEST` (0.35) of `swing.angle`. The drawn hands (any not reaching) turn by the whole swing about the forward axis through the torso point: the arms carry most of it. The physics' parts do not change. The swing's side follows its own sign: the upper body turns against the body's balance correction. The points carry it to online surfers.

- [ ] Failing tests:
  - in a full-steer turn on flat water at 8 m/s, once `|swing.angle|` passes 30°, the drawn head leaves `partPosition(head)` toward the swing's side by at least 0.1 m, and a drawn hand by more;
  - with the swing at 0, the drawn points are unchanged;
  - lying down nothing changes (Review Focus 4);
  - the physics' energy and work tests stay green.
- [ ] Implement; run the rider tests; commit.

### Task 4: The head looks where the board goes

**Files:**
- Modify: `src/scene/rig/HumanoidRig.ts` (the head standing)
- Test: `src/scene/rig/HumanoidRig.test.ts`

**Interfaces:**
- Consumes: `yawRate`, `travel` and `climb` (Task 1).
- Produces:
  - Standing, the head faces the travel turned about up by `RIG_DETAIL.lookAhead` (0.4 s) × yawRate, within `RIG_DETAIL.neckTurn` (80°) of the chest's facing. In a turn it leads into the turn, toward the lip in a bottom turn.
  - It pitches down while the board descends and up while it climbs, `atan2(climb, max(speed, 1))`, within `lookPitch` (30°).
  - Lying, pushing and fallen are unchanged.

- [ ] Failing tests:
  - going straight along +z, the head faces +z within 20°;
  - turning at +2 rad/s, the head turns toward +x by 30° or more;
  - at −2 rad/s it turns toward −x;
  - Goofy mirrors the stance but still looks along the travel (Review Focus 1);
  - descending at 3 m/s it pitches down by 10° or more;
  - prone, the head is where it was before this task (Review Focus 4).
- [ ] Implement; run the rig tests; commit.

### Task 5: The trunk turns into the turn

**Files:**
- Modify: `src/scene/rig/HumanoidRig.ts` (hips and chest facing standing)
- Test: `src/scene/rig/HumanoidRig.test.ts`

**Interfaces:**
- Consumes: `yawRate`.
- Produces: standing, the chest turns about up toward the turn by `RIG_DETAIL.twistGain` (0.25 s) × yawRate, within `twistMost` (35°). The hips turn `hipsTwistShare` (0.35) of that. This is on top of the stance's `chestTurn` and `hipsTurn`, so the shoulders lead the hips (the reference's trunk rotation).

- [ ] Failing tests:
  - at +2 rad/s, the chest's facing turns toward +x by 20° or more against the same pose at 0, and the hips by less;
  - at −2 rad/s it turns the other way;
  - Goofy mirrors it (Review Focus 1);
  - the feet stay on their points;
  - no bone stretches.
- [ ] Implement; run the rig tests; commit.

### Task 6: The arms lead, and a hand that reaches is reached

**Files:**
- Modify: `src/scene/rig/HumanoidRig.ts` (the arms standing, the spine's side bend)
- Test: `src/scene/rig/HumanoidRig.test.ts`

**Interfaces:**
- Consumes: `yawRate` and the look direction (Task 4); the stance's front foot, which gives the leading arm (left for Regular, right for Goofy).
- Produces:
  - Standing, the leading hand's target blends from the physics' drawn hand toward the shoulder plus 0.9 of the arm along the look direction, raised 15°, by `min(1, |yawRate| / armLeadRate)` (armLeadRate 1.5 rad/s). The rear hand stays the physics' drawn hand, which carries the balance spread and the swing.
  - A hand whose target lies beyond the arm's reach bends the spine toward it about the chest's forward axis, up to `reachBend` (35°), until the arm reaches. This covers the reaching hand and E's hand.
  - A hand the physics reaches with is never blended away.

- [ ] Failing tests:
  - turning at 2 rad/s, the leading wrist sits ahead of the chest along the look direction by 0.3 m or more, and Goofy's leading wrist is the right one (Review Focus 1);
  - straight ahead, the hands are the physics' points;
  - a hand target 0.95 m out and down from the shoulder is reached within 0.05 m, where it fell short by more than 0.15 m before the bend;
  - no bone stretches.
- [ ] Implement; run the rig tests; commit.

### Task 7: Validate and hand over

- [ ] **Character sheet:** poses from motion, for Regular and Goofy:
  - straight;
  - a bottom turn (crouched, then compressed and reaching);
  - a top turn (yaw rate reversed);
  - falling back.

  Screenshots taken in the browser pane, and the reference's cues checked against them.
- [ ] **Online:** a `RemoteSurferViews` test in which a turning remote pose stream gives the view's state a yaw rate.
- [ ] **Hand-over:** Findings below, the ROADMAP line, the whole suite green, the final review, and the PR for the user's playtest.

## Findings

**Built** (each with a test that failed first):
- **The motion estimate** (`RiderMotion`): the turn rate, travel, speed and climb, read from the drawn states over sea time for the local rider and each remote one.
  - A jump, climbing back on after a fall, or a surfer not drawn starts it over.
  - A heading wrap or a repeated sample changes nothing.
- **Knees from the physics:** standing, the rig lifts its hips from the physics' pelvis to the model's extended legs, so the physics' crouch drop bends the knees from there. The knees' mean now reads 129° / 102° / 80° standing, crouched and compressed (before: 117° / 80° / 62°), against de Sousa 2022's ≥ 150° / 90–110° / ≤ 90°.
  - Planing at 7 m/s the board rides about 12° nose-up, with the front foot 12 cm above the rear. So the front knee always bends more (106° standing), and the rear leg reaches its full length first (152°).
- **The upper body's swing, drawn:** chest, head and arms turn together by 0.35 of the swing, about the forward axis through the pelvis (up to 24° at its ±69° range).
  - The arms, held along the board in the sideways stance, lie close to the swing's axis and move little.
  - The drawn points carry it to online surfers.
- **The head looks where the board goes:** along the travel, led into a turn by the turn over 0.4 s, within 80° of the chest, and pitched down the face on the drop and up it climbing (within 30°).
- **The trunk turns into the turn:** the chest by the turn over 0.25 s (within 35°), the hips by a third of that.
- **The arms:**
  - In a turn the leading arm (the front foot's side) reaches where the head looks, raised 15°, blended in by the turn over 1.5 rad/s.
  - A hand the physics reaches down past the hips (E's, or Compress's inside hand) bends the spine toward it, up to 35°, until the arm reaches.
- **Online:** every cue comes from the drawn points plus each view's own motion estimate, so the wire format is unchanged.
- **The surfer sheet's riding moments** (`character-sheet.html?riding`): straight, the drop, a compressed frontside and backside bottom turn, and a top turn, for Regular and Goofy, each simulated by the real rider.
  - All stand.
  - The compressed frontside turn reads as a deep carve: low, leaning in, the inside hand at the water, the leading arm out ahead, the head turned into the turn.

**Open, for the playtest:**
- Riding straight, the arms stay the physics' spread along the board (G7's pose), close to a T.
- The balance's swing shows in the trunk, not as arms flailing across the board.
- The front knee reads bent (106°) standing on a planing board.
