# The Riding Body, Step 1: Smoothing Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The drawn surfer moves fluidly: no repeated or uneven frames, no one-frame pops at the body's switches, and less of the board's wobble shaking the upper body. The steering physics is unchanged.

**Architecture:**
- The drawing gets a layer between the physics and the skeleton.
- **The local rider:**
  1. The board, the camera's target and the rider are drawn blended between the last two physics snapshots, one step behind the newest (Fiedler's "Fix Your Timestep").
  2. The body's upper points (pelvis, torso, head, hands) are smoothed relative to the planted feet by critically damped springs (Holden's).
  3. After the rig solves, each bone's jump at a switch is carried as an offset that decays (inertialization: Bollo, GDC 2018; Holden's dead blending).
- **Online surfers** get 2 and 3; they already interpolate their poses.
- A test harness, the body film, runs the real ride session through the whole drawing pipeline and measures fluidity before and after.

**Tech Stack:** TypeScript, three.js, Vitest.

**Spec:** the 2026-09-28 grilling (memory `riding-body-animation`), step 1 of 8.
- The user's symptoms: jitter, pops, stiffness, wrong pose, disconnected; the body looks static.
- The research: `docs/research/body-animation-research.md`, written in Task 1 from the web study.

## Global Constraints

- Only the drawing changes. The physics, the snapshot's contents and the online wire format are unchanged.
- Added lag between an input and the body showing it: at most about 0.1 s.
- Teleports (a retry, a placement, a new session) are never blended across.
- Performance is never a gate. English only.

## Review Focus

1. **A teleport** (R to retry, the Surf School placing the rider, a new spot) snaps: nothing sweeps across the sea.
2. **Slow motion** (Surf School 0.5×, a paused game) keeps drawing blended poses, and never runs ahead of the newest snapshot.
3. **The feet stay on the deck** while standing, whatever the springs and the offsets do.
4. **A fall** still leaves the board as the physics throws the body; blending never holds the body on a board it has left.
5. **Online surfers** look the same as before, only smoother, with no wire change.

---

### Task 1: The body film

**Files:**
- Create `src/wave/riderSnapshot.ts`: `writeRiderSnapshot(session, cue, out, point)`, extracted from `SurfZoneRunner.fill`, which uses it.
- Create `src/dev/bodyFilm.ts` and `src/dev/bodyFilm.test.ts`.
- Create `docs/research/body-animation-research.md` (the web study) and `docs/research/body-fluidity.md` (the film's measures before and after).

**Interfaces:**
- `filmBody(scenario, options) → BodyFilm`.
  - `scenario` is a list of timed inputs on a water (flat or the 15° face), starting from a placement.
  - `options`: the display rate (60 or 120 Hz), the delivery (every step, or batched by 3), and the drawing pipeline to use.
  - Each display frame records the world positions of the hips, knees, ankles, shoulders, elbows, wrists and head, the hips' and chest's world quaternions, the phase, and the board's pose.
- **Measures:**
  - `switchSpeeds(film)`: at each phase change, and at each frame where a drawn point moved more than 0.1 m in one physics step, the largest joint speed relative to the board (m/s) and the largest bone rotation speed (rad/s) within ±0.3 s.
  - `repeatedFrames(film)`: the share of frames in which the board moved but no joint did.
  - `unevenness(film)`: the coefficient of variation of the hips' per-frame travel while riding straight.
  - `shake(film)`: the chest's roll rate in the 1.5–4 Hz band (DFT over the window) during a steady carve.
  - `drawnLag(film)`: the delay between the physics' own torso roll and the drawn chest's roll over a lean, by cross-correlation.

**Scenarios:**
1. The pop-up and the landing on flat water.
2. Straight riding at 7 m/s.
3. A full-steer carve at 8 m/s.
4. Compress with the hand reaching.
5. A rail change.
6. Lying back down.
7. A fall, on a hand-made separation.

- [ ] Write `body-animation-research.md` from the study, with its sources and the candidate reference set (for step 2).
- [ ] Extract `writeRiderSnapshot`. The SurfZoneRunner tests stay green (a pure refactor).
- [ ] Write failing tests for the harness: the film has one frame per display frame, and its measures are right on hand-made films. For example, a known jump gives its speed; a 2.5 Hz sine gives its band shake.
- [ ] Implement the film and the measures.
- [ ] Record the baseline (today's drawing) in `body-fluidity.md`: every scenario at 60 and 120 Hz, each delivery.
- [ ] Commit.

### Task 2: Blended between physics steps

**Files:**
- Create `src/game/snapshotTrack.ts` and `src/game/snapshotTrack.test.ts`.
- Modify `src/game/PhysicalMode.ts` (`update`).

**Interfaces:**
- `SnapshotTrack.push(seaTime, rider, board)` keeps the latest 6 snapshots.
- `SnapshotTrack.sample(renderTime, outRider, outBoard) → boolean` returns false when empty.
- The render time advances by each frame's simulated time and is held a fixed step (1/60 s) behind the newest snapshot.
  - It drifts toward that target at most 10 % per frame.
  - It snaps when more than 4 steps off.
  - It is clamped to the buffer.
- **Blending:**
  - Points and the board's position are blended linearly; the board's orientation by slerp; the heading by the shorter angle; breath and duck linearly.
  - Every other field, and the phase, comes from the nearer snapshot.
  - No blending across a teleport (the board more than 2 m apart between neighbours) or a change of `present`: the newer snapshot is drawn.
- `PhysicalMode.update` draws the board mesh, the camera's follow target, the rider and the leash from the sampled arrays. It resets the track on a new host.

- [ ] **Failing tests:**
  - At 120 Hz with one snapshot per 60 Hz step, no two consecutive drawn frames are equal while the board moves.
  - With snapshots batched by 3, the drawn board's per-frame travel varies by under 10 % on a straight run (the raw snapshots: 100 % or more).
  - A 20 m teleport draws no in-between position.
  - The drawn time never passes the newest snapshot and trails it by at most 2 steps once settled.
  - A paused clock holds the pose.
- [ ] Implement, wire into `PhysicalMode`, and run the film at 120 Hz and batched.
- [ ] Commit.

### Task 3: Pops blended out

**Files:**
- Create `src/scene/rig/bodyInertia.ts` and `bodyInertia.test.ts`.
- Modify `src/scene/character/SkinnedSurfer.ts` (after `rig.solve`) and `SurferView` as needed.

**Interfaces:**
- `BodyInertia(bones)` holds each driven bone's last drawn local rotation and angular velocity, and the hips' position and velocity.
- `apply(state, dt)` runs after the solve.
  - **Detection:** a bone's new rotation departs from its extrapolated last one by more than 0.25 rad, or the hips by more than 0.05 m, or the phase changed.
  - **Absorbing a jump:** the offset takes it (Holden's inertialization: offset = extrapolated last − new; offset velocity = last velocity − new velocity).
  - **Decay:** offsets decay with a critically damped spring of half-life `INERTIA_HALF_LIFE` = 0.05 s, which is about 0.2 s to settle.
  - **Reset:** on a teleport (the hips more than 1 m from the last drawn), and on `dt ≤ 0` or `dt > 0.25`.
  - `dt` comes from `state.clock`: sea time for the local rider, wall time for online ones.

- [ ] **Failing tests (film):**
  - At every switch of the scenarios (landing, the hand to the water, the swing reset, lying down, a fall), no bone turns faster than 15 rad/s and no joint moves faster than 5 m/s relative to the board: fast human limb motion, not a pop.
  - The same film with no switch is unchanged: every bone within 1e-6 of the plain solve.
  - A teleport draws the new place at once.
- [ ] Implement; run the film.
- [ ] Commit.

### Task 4: The upper body's springs

**Files:**
- Create `src/scene/rig/bodySprings.ts` and `bodySprings.test.ts`.
- Modify `SkinnedSurfer.update` to run it before the solve.

**Interfaces:**
- `BodySprings.apply(state, dt)` runs in the upright phases (landing, standing).
- The pelvis, torso, head and hands, taken relative to the middle of the feet in a frame that turns only with the board's heading, follow their drawn places through critically damped springs with half-life `BODY_HALF_LIFE`.
- `BODY_HALF_LIFE` comes from the lag budget: a critically damped spring delays low frequencies by 2/ω₀, and ω₀ = 2 ln 2 / half-life. For ≤ 0.1 s of delay, ω₀ ≥ 20 rad/s, so the half-life is at most 0.069 s.
- A hand the physics puts in the water (below the hips) is not smoothed.
- The springs re-seat on a phase change or a teleport, and on `dt ≤ 0` or `dt > 0.25`.

- [ ] **Failing tests (film):**
  - The chest's 1.5–4 Hz shake in the carve drops by at least a third from the baseline.
  - `drawnLag` stays ≤ 0.1 s.
  - The feet are unmoved (the ankles within 1 mm of the plain solve).
  - The reaching hand stays at its water point.
- [ ] Implement; run the film.
- [ ] Commit.

### Task 5: Your surfer on the full model

**Files:** modify `src/main.ts` (`applyGraphics`) through a small function in `src/game/Graphics.ts`: `ownSurferDetail(resolved) → { lodDistance: Infinity, textureCap }`, with a test.

- [ ] Failing test for `ownSurferDetail`; implement; wire it in.
- [ ] Commit.

### Task 6: Validate and hand over

- [ ] Fill `body-fluidity.md` with every measure, before and after.
- [ ] Record before/after clips at the gameplay camera if the browser can film (the in-page ride recorder or the session recorder). Otherwise say so.
- [ ] Findings, the ROADMAP line, the whole suite, and the final review.
- [ ] The PR: merged once validated (the user's standing request).

## Findings

(Filled in during execution.)
