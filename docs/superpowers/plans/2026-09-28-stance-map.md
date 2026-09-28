# The Stance Map Implementation Plan (the riding body, step 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Map the riding stances (stance × phase × frontside/backside) with cited references and target joint angles, and measure how far today's drawn surfer is from them, on all four real skeletons and on the surfer sheet.

**Architecture:**
- **The map is data** (`stanceMap.ts`): stances, targets as ranges, each with its source and confidence. A document cites the pictures (video timestamps and photo pages, linked, never copied).
- **A gauge** reads the same angles from any posed skeleton, in the board's frame.
- **Measurement:**
  - A report measures today's drawn stances, simulated by the real rider, on the four surfers' skeletons, read from their GLBs in node.
  - The sheet draws each stance beside a reference figure built from the map's targets, with the joints that fall outside their ranges listed.

**Tech Stack:** TypeScript, three.js, vitest, rolldown for the report script, the in-app browser for the sheet and the video reads.

**Spec:**
- The 2026-09-28 grilling, in memory `riding-body-animation`:
  - step 2;
  - the reference set approved by the user (Q19);
  - the provenance rule (Q20).
- The references study: `docs/research/body-animation-research.md`.
- The thesis's cues: `docs/superpowers/specs/2026-09-27-stances.md`.

## Global Constraints

- **Provenance order (Q20):**
  - peer-reviewed measurements first, then the thesis (de Sousa 2022), then coaching cues, then the reference videos as I read them;
  - every target names its source and a confidence (high, medium or low);
  - a video read is always low confidence.
- **References:** the 13 approved (Q19). A near-fall recovery comes from heat footage, cited when found, or is marked missing.
- **No copyrighted frames or photos in the repo.** Pictures are cited by link and timestamp. The sheet's reference is a figure built from the targets.
- **Relative joint-angle targets**, so they hold for all four MPFB surfers.
- **Regular and Goofy mirror.** Frontside and backside are mapped separately where they differ (which hand is inside, which arm leads).
- **Scope: map and measure only.**
  - No change to the rig's poses (step 3) or to the physics' posture (step 6).
  - A gap the map finds is recorded as a finding for the step that owns it.
- **Never tune a target to what is drawn.**
- Performance is never a gate. English only.

## Review Focus

1. **Goofy** reads the same angles as Regular for the mirrored pose: the lead arm is the right arm, the twist and the head turn the other way.
2. **A skeleton whose bind pose is not a T-pose along +z** (the MPFB GLBs' rest orientation, or armature scale) still gives straight legs as 180° and the rest facing as 0°.
3. **A stance the rider cannot reach** (it falls, or ends in another phase) is reported as not reached, never as measured angles of the wrong pose.
4. **Sources:** a target whose source is a video is never above low confidence, and every cited source resolves to a reference with a link.
5. **Joint angles near 0° or 180°** (a straight knee, a hanging arm) stay finite and continuous: no NaN from `acos` just past ±1.

---

### Task 1: The surfers' skeletons in node

**Files:**
- Create: `src/scene/rig/glbSkeleton.ts` and its test.

**Interfaces:**
- Produces:
  - `readGlbSkeleton(bytes: ArrayBuffer): { root: Object3D; bones: Map<string, Bone> }`;
  - the GLB's scene nodes with their translation, rotation and scale, skin joints as `Bone`s;
  - names sanitized as three's GLTFLoader does (`mixamorig:Hips` → `mixamorigHips`).
- It is the skeleton the game poses, without meshes or textures.

- [ ] **Failing tests:**
  - each of `public/assets/surfers/surfer1–4.glb` has every `REQUIRED_BONES` name;
  - the head bone stands at 0.85–0.95 of the height in `surfers.json`;
  - the feet are near the ground;
  - `HumanoidRig` solves a standing posture on it with the feet within 1 cm of their points.
- [ ] Implement; run; commit.

### Task 2: The stance gauge

**Files:**
- Create: `src/scene/rig/stanceGauge.ts` and its test.

**Interfaces:**
- Produces `StanceJoints`, a joint record:
  - the hips' centre, the neck, the head, the head's facing;
  - both sides' shoulder, elbow, wrist, hip joint, knee, ankle and toe;
  - the chest's facing.
- `jointsOf(bones, rest)` reads it from a posed skeleton.
- `StanceGauge` (built from the skeleton at rest) measures `StanceAngles` in degrees and metres, in the board's frame:
  - x across, y the deck's normal, z the nose;
  - Regular faces −x, Goofy +x.
- The measures:
  - `kneeFront` and `kneeRear`, included (180° straight);
  - `hipFront` and `hipRear`, included between the trunk and the thigh;
  - `ankleFront` and `ankleRear`: dorsiflexion from the shin square to the foot;
  - `trunkFlexion`: the trunk from the deck's normal toward the toes;
  - `trunkPitch`: toward the nose;
  - `lean`: feet to neck from the world's vertical, toward the toes;
  - `chestTwist` and `hipTwist`: the facing from the toes toward the nose;
  - `headYaw`: from the toes toward the nose;
  - `headPitch`: below the horizon;
  - `leadArm` and `trailArm`: the upper arm from the trunk's down;
  - `leadElbow` and `trailElbow`, included;
  - `lowHand`: the lower hand's height above the deck;
  - `stanceWidth`: the ankles along the stringer;
  - `weight`: the hips' centre between the rear ankle (0) and the front ankle (1).
- `measureJoints(joints, board, stance)` takes a joint record directly (for the reference figure).

- [ ] **Failing tests** on the test humanoid:
  - posed by hand: straight legs read 180°; a knee bent 90° reads 90°; the spine bent 30° toward the toes reads a trunk flexion of 30°; the head turned 45° toward the nose reads 45°; an arm at 90° reads 90°;
  - the posture points' stance: width and weight as the physics sets them;
  - Goofy mirrors;
  - finite at 0° and 180°;
  - a GLB skeleton at rest reads straight legs and a 0° facing (Review Focus 2).
- [ ] Implement; run; commit.

### Task 3: The map: references, targets and the document

**Files:**
- Create: `src/scene/rig/stanceMap.ts` and its test; `docs/research/stance-map.md`.

**Interfaces:**
- `SOURCES`: id → `{ kind: 'measured' | 'thesis' | 'coaching' | 'video'; cite; url; at? }`.
- `STANCES`: `{ id; name; how the game reaches it; sides: 'both' | 'frontside' | 'backside'; targets: Partial<Record<keyof StanceAngles, { min; max; source; confidence; note? }>> }[]`.
- The stances:
  - trim;
  - trim forward (W) and trim back (S);
  - crouch (the drop, the thesis's preparation);
  - Compress (the bottom turn's base, the thesis's fundamental), frontside and backside;
  - the extension into the top turn (the thesis's final), frontside and backside;
  - the snap, frontside and backside;
  - the cutback;
  - the pump (its compression and its extension);
  - the pop-up's push and the landing;
  - lying back down;
  - a fall's start;
  - the hand in the face.
- Where no source reaches a measure, it is left without a target, and the document lists it as a gap.

- [ ] **Research:** read the approved videos at their timestamps in the browser. Measure the angles no higher source gives (arms, head, twist, lean) from paused frames, recorded as low-confidence video reads with the timestamp. Nothing is saved from the video.
- [ ] **Failing tests** (map integrity):
  - every target's source exists and has a link;
  - min ≤ max, inside the measure's domain;
  - a video target is low confidence and a coaching one at most medium;
  - every stance names how the game reaches it;
  - frontside and backside stances both exist for the turns.
- [ ] Write the map and the document (sources, per stance: pictures cited, targets with provenance, gaps). Commit.

### Task 4: Every stance, simulated

**Files:**
- Modify `src/dev/ridingPoses.ts`, which becomes the map's stances, keeping the sheet's riding moments; add its test.

**Interfaces:**
- `stanceState(id, stance, at, out): { state: RiderVisualState; reached: boolean }`:
  - it is simulated by the real rider, as the riding moments are;
  - frontside and backside come from the stance's id;
  - `reached` is false when the rider fell or ended in another phase (Review Focus 3).

- [ ] **Failing tests:**
  - each stance reaches its phase for Regular and Goofy;
  - Compress is deeper than the crouch, and the crouch deeper than trim;
  - trim back has its hips behind trim forward's;
  - the landing ends in 'landing' or 'standing';
  - a stance the rider falls out of reports not reached.
- [ ] Implement; run; commit.

### Task 5: Today against the map

**Files:**
- Create: `scripts/stance-report.ts`, `npm run report:stances` and `docs/research/stance-report.md` (generated).

- [ ] The report:
  - for each stance, for Regular and Goofy, it poses the four surfers' skeletons (Task 1) with the rig alone, since a stance is held;
  - it measures them (Task 2) against the map (Task 3), with the out-of-range joints marked;
  - it also sums each stance's gaps and names the step that owns each (3: the drawn pose; 6: the physics' points, when the rig follows them into the gap).
- [ ] A test: the report's table builder marks a value out of range, and marks a stance not reached.
- [ ] Run it; commit the generated report.

### Task 6: The sheet, side by side

**Files:**
- Create `src/dev/stanceFigure.ts` and its test; modify `src/dev/characterSheet.ts` (`?stances`).

**Interfaces:**
- `referenceJoints(targets, lengths, feet, stance) → StanceJoints` builds a figure from the targets' mid-values, using the surfer's own segment lengths:
  - the feet at the physics' stance points;
  - each leg in its plane, the ankle, knee and hip angles set; the pelvis between the legs;
  - the trunk at its flexion, pitch and twist; the head at its yaw; the arms at their elevation and elbow.

- [ ] **Failing test (round trip):** the gauge reads the figure's angles back within 2° (and 1 cm for the width), for every stance and both stances.
- [ ] **The sheet:**
  - `?stances` draws each map stance for the four surfers;
  - the reference figure is overlaid in a contrasting colour at the same feet;
  - the out-of-range joints are listed under each tile;
  - `?stances&row&col` shows one tile large.
- [ ] Check it in the browser; commit.

### Task 7: Validate and hand over

- [ ] Findings (below): the biggest gaps per stance and which step owns each; the gaps in the sources; the ROADMAP line.
- [ ] The whole suite; the final review; the PR.

## Findings

**The map** ([stance-map.md](../../research/stance-map.md), generated by `npm run report:stances` from `src/scene/rig/stanceMap.ts`):
- **20 stances,** each with frontside and backside where they differ:
  - riding: trim, trim forward and back, the drop, Compress, extension up the face, the top turn, the snap, the cutback, the pump's two beats, the hand in the face;
  - transitions: the pop-up's push, the landing, lying down, a fall's start.
- **99 targets,** each a range with its sources, best first, and a confidence no higher than its best source allows. Where nothing reaches a measure it is a gap, listed under its stance. Lying down and a fall's start have no source at all.
- **Sources:**
  - measured: Weiss 2025, Borgonovo-Santos 2021, Forsyth 2024, Moreira 2014;
  - the thesis: de Sousa 2022 (not online: the user's copy);
  - coaching pages: SurfDeeper, Cornish Wave, Rapture (two pages), Bali Surfing Camp;
  - the pros' spoken cues, read from the captions: Hobgood (backside), Knox (the cutback, backside extension);
  - frames read by eye (low): Kerr 0:58–1:00, Gudauskas 2:32, 2:36, 3:20.5 and 3:21.5, Fanning 0:33 (cited, no target: its pump beat cannot be told).
  - Cited only: the snap video, for its sequence (360 × 640, far off).
  - Not read yet: Whitaker, Reyes, Brock, and the two pop-up references. Rob Case and the duck-dive belong to step 8.

**The tools:**
- **The stance gauge** reads 21 measures from any posed skeleton on the board. `trunkTilt` is taken against the world's vertical, as a picture shows it. `measurePoints` reads the physics' own seven points.
- **The four surfers' skeletons** are read from their GLBs in node.
- **Every stance is simulated by the real rider,** Regular and Goofy, and drawn as the game draws it: every step through the motion estimate and the smoothing layer (`drawnStance`).
- **The sheet's `?stances` view** (`&surfer=0–3`, `&side=goofy`) draws each stance beside a reference figure built from the targets on the surfer's own proportions. The figure's trunk bends for the hips where their source ranks at least as high. Each tile lists the drawn body's misses and what the figure itself cannot meet.

**Today against the map: 46 of 99 miss.** Regular and Goofy read alike on all four skeletons. A miss belongs to the physics (step 6) when its own points miss too; otherwise to the drawn pose (step 3).

| Stance | Measure | Drawn | Physics' points | Target | Owner |
|---|---|---:|---:|---:|---|
| Trim | trunk over the toes | 0° | 0° | 10–35° | 6 |
| The drop | trunk from the vertical | 0° | 0° | 45–65° | 6 |
| Trim | front knee (rear 152°) | 123° | | 135–165° | 3 (6: the weight) |
| Compress, frontside | hips, front / rear | 127° / 144° | | 60–90° | 3 |
| Compress, frontside | lower hand | 0.46 m | 0.12 m | 0–0.3 m | 3 |
| Compress, frontside | inside (trailing) elbow | 173° | | 70–120° | 3 |
| Extension, frontside | weight | 0.75 | 0.71 | 0.35–0.45 | 6 |
| Pump, extending | weight | 0.82 | 0.78 | 0.50–0.60 | 6 |
| Trim forward | weight | 0.89 | 0.86 | 0.60–0.75 | 6 |
| Extension, frontside | front knee | 113° | | 150–180° | 3 |
| The landing, at its end | stance width | 0.41 m | 0.63 m | 0.53–0.73 m | 3 and 6 |

- **The physics' trunk does not hinge.**
  - In trim, the trims, the drop and the pump it stays upright on the deck (0°), where surfers bend 10–65°. This is the plainest cause of "the stance is not a real stance".
  - In Compress and the hand in the face it tilts with the lean (27° from the vertical frontside), still short of the 45–75° read from pictures.
  - Owner: step 6.
- **The front knee bends more than the rear.** It reads 123° against 152° in trim, and 113° against 152° extending; coaching wants the front leg straighter.
  - The rear knee stops at 152°: the rig caps the leg's reach at 0.97 of its length.
  - The front knee bends because the physics' hips sit forward (trim's weight 0.64 at the points).
  - The final review's probe: moving the hips 0.1 m back straightens the front knee from 121° to 141°. The board's nose-up pitch (6° in trim) is not the cause.
  - Owner: step 6 for the weight, then step 3 for the cap.
- **The weight goes forward, not back.**
  - Releasing Compress up the face leaves it at 0.71 in the physics' own points; the thesis and Knox move it to the back foot (0.35–0.45).
  - The pump's extension sits at 0.78 (the source's 55/45 front is 0.55), and W at 0.86.
  - Owner: step 6.
- **Compress folds the knees but not the hips.** The knees reach 73° front, within the thesis's 90° or less. The hips stay at 127–144° frontside and 115–156° backside.
  - Owner: step 3, for the bend at the hips the thesis asks for.
- **The drawn inside hand lags the physics'.** Compress's physics hand is at 0.12 m, but the drawn hand is still at 0.46 m 0.4 s after Compress begins: step 1's point blend carries the hand's switch slowly. It reaches with a locked arm (173°).
  - Owner: step 3, which should shape the reach rather than have it blend in.
- **The landing's feet glide.**
  - The physics jumps the feet from the lying legs to the stance at the landing, and step 1's blend spreads them over about 0.6 s.
  - The drawn feet are 0.41 m apart at the landing's end (the physics' 0.63 m), with the hips ahead of the front foot.
  - A real surfer's feet travel during the reach, not after landing.
  - Owner: step 6 (the push should carry the feet), then step 3.

**Rulings** (in the ledger, with their costs):
- **The document is generated** from the data, so the tables cannot drift.
- **Video reads are few and low confidence,** and trunk angles read from pictures are held against the vertical.
- **The figure's pelvis tilts** to meet two knee angles.
- **Extension and the top turn are split:** extension is the bottom turn's release up the face.
- **The report and the sheet measure the drawn body** through the smoothing layer, not the rig on the physics' last step.
- **A miss's owner comes from the physics' own points.**
- **The landing is read at its end,** and the weight is left unread while the feet are closer than 0.1 m.
- **The figure's trunk comes from the hips** when their source ranks at least as high.
- **The pros' spoken cues count as coaching.**
- **The pump's weights follow Rapture:** compressing uphill onto the back foot, extending downhill onto the front.

**Fixed on the way:**
- **Every sheet had drawn each tile as the tile before,** since step 1. The sheet poses at a clock that never moves, which the blending layers read as time standing still. `PosedBody.reset` and `SkinnedSurfer.resetMotion` are now called per tile.
- **The hand in the face needed a wave.** The physics reaches for the wave's side, so the stance now rides across a face.

**Next:** step 3, the stance poses. The rig should shape the spine, hips, shoulders, arms and head toward the map, with clavicles and toes, and stance-target tests read from this map. Step 6 then takes the physics' trunk hinge, the weight's return to the back foot, and the push carrying the feet.
