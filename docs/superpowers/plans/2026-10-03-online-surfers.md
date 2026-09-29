# The Online Surfers' Check Implementation Plan (the riding body, step 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Check that another player's surfer is drawn as fluidly and readably as the local one from what the network sends. Change the wire only if an essential cue cannot be derived from it.

**Architecture:** the body film gains a remote drawer that takes the local session's snapshots the way the game sends them:
- an own pose every third physics step (`POSE_HZ` 20), written by `OwnPoseTracker`;
- encoded into a bundle (`poseCodec`, float32 points);
- received and sampled by the real `RemoteSurfers`, 100 ms in the past (`INTERPOLATION_DELAY`);
- turned into the drawn state by `RemoteSurferViews`' own code, extracted into a shared function.

The same scenarios are then filmed locally and remotely and compared.

**Tech Stack:** TypeScript, three.js, vitest; the body film; `src/net`.

**Spec:** the grilling (memory `riding-body-animation`): online surfers get their cues from what they already send; a wire change only if the map shows an essential cue can't be derived.

## Global Constraints

- **No wire change** unless a must-have cue (balance, weight, edge, depth) or the fluidity fails remotely because of what is not sent.
- **The remote path is the game's own code:** the codec, `RemoteSurfers` and `RemoteSurferViews`' state building. The film must not reimplement it.
- **The local pipeline is untouched.** The view draws exactly as before the extraction.

## Review Focus

1. **The phase switch between two poses:** the phase comes from the nearer pose, so a switch lands mid-interval; it must still blend out.
2. **A retry or a teleport** between poses: the remote body starts over, with no fling across the sea.
3. **The float32 points:** no jitter in the drawn body from quantisation.
4. **The display rate:** remote bodies at 30 and 120 Hz.
5. **What is not sent** (the breath held, the balance margin): which cues still show.

---

### Task 1: The remote drawer

**Files:** modify `src/scene/RemoteSurferViews.ts` (extract `remoteRiderState`), `src/dev/bodyFilm.ts` (`remoteDrawer`), and their tests.

- `remoteRiderState(state: RemoteState, board: Float64Array, rider: Float64Array, plug: Vector3, out: RiderVisualState): RiderVisualState` builds the snapshot arrays from the remote pose and reads them. The view calls it; nothing else changes.
- `remoteDrawer()` is a `FilmDrawer`. `deliver()` writes an own pose every third step, encodes it and hands the bundle to a `RemoteSurfers`. `frame()` samples it at the drawn time less `INTERPOLATION_DELAY`, and returns the snapshot arrays that `remoteRiderState` fills.

- [ ] **Tests:**
  - the view's state is unchanged by the extraction (the same arrays, the same state);
  - a remote film of the straight ride draws the local film's body 0.1 s later, within 2 cm at the joints.
- [ ] Commit.

### Task 2: The checks

- [ ] **Remote films:**
  - the switch films (pop-up and landing, a fall, pumping into a fall) blend out as the local ones do;
  - a teleport starts over;
  - the weave's balance cue correlates above 0.7;
  - the paddle film breathes;
  - there is no jitter above the local film's in the wobble band (`shake`) and above it (4–30 Hz).
- [ ] **Anything that fails:** find why. Fix it in the drawing if it can be derived; propose a wire change to the user if it cannot.
- [ ] Commit.

### Task 3: The hand-over

- [ ] Findings, the ROADMAP line, the suites, the review, the PR.

## Findings

(Filled in during execution.)
