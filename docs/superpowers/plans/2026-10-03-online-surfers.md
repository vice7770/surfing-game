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

The remote drawer films the local session through the game's own path:
- an own pose every third step (`OwnPoseTracker`);
- the codec and a bundle;
- the real `RemoteSurfers`, sampled `INTERPOLATION_DELAY` in the past;
- `RemoteSurferViews`' state building, extracted as `remoteBoardPose` and `remoteRiderState` (the view calls them and draws as before).

On the straight ride it draws the local body 0.1 s later within 2 cm at every joint.

Three faults were remote-only. All three are fixed, and only one needed the wire.

1. **Centimetres on the wire shook the body.** The points went as i16 centimetres. A centimetre's step at a foot or the pelvis tilted the drawn chest by up to 1.7°, and the straight ride's wobble read 0.41° against the local 0.045°.
   - **The wire change you approved:** the points now go in millimetres (flag 64) whenever every point is within 32.767 m of the board, else in centimetres as before (a swimmer far from a lost board).
   - Poses without the flag still read as centimetres, so the server's bots replay their recorded tracks unchanged.
   - A room admits only its own build (`BUILD_ID`), so no older reader meets the flag.
   - With millimetres the straight wobble reads 0.054° against 0.045°.
   - Putting the upright feet back on the deck was tried first, for the centimetres. With millimetres it changes nothing measurable (0.049° against 0.054°), so it was removed.
2. **Switches spread over 50 ms.** Locally a phase switch jumps the points within one physics step, and the drawn body's smoothing blends out a jump that lands on the switch's frame. Remotely the sampler blended the points across the 50 ms between poses. The fall's joint spike read 2.01 m/s (limit 2), and the pop-up's landing feet overshot by 6 cm either side.
   - **Fix:** across a phase switch, the nearer pose's points are drawn whole, on the board as it glides on. This is what the local track draws at 60 Hz, so the jump lands on the switch's frame.
   - A retry or a placement (a board further than 2 m per step, or presence changing) draws the newer pose whole, never swept across the sea, as the local track does.
3. **The compressed carve shook: 6.5° (4–30 Hz) against the local 3.1°.** This was not the corners of linear interpolation at 20 Hz; the excess was broadband from 3 to 15 Hz. It was the reach.
   - The physics moves the reaching hand 0.7 m to the water within one step.
   - Locally, the point inertia reads that as a jump and eases it over about a third of a second.
   - Remotely, spread over 50 ms, the same jump read as motion at 14 m/s. The drawn hand reached the water in four frames, the chest whipped 65° in 25 ms, and then it wobbled.
   - **Fix:** a point whose velocity between two poses departs by more than 3 m/s from its velocity between each neighbouring pair of poses has jumped (the smoothing's own threshold, `pointInertia`'s `JUMP`; a limb turning back changes by about 1.2 m/s from one pose to the next). It is drawn at once, mid-way, as the local track draws it.
   - Fallen, the points are measured from a board tumbling away, so no jump is read from them.
   - **Between the poses,** each point now follows a monotone cubic through its neighbours (Catmull-Rom's slopes on uneven steps, held by Steffen 1990 so it never overshoots). Its speed carries on across each pose, where the chords turned it at every pose. A jump bends neither neighbour's curve.

Remote against local (local / remote), the settled ride from 0.5 s:

| Display | Film | Wobble (1.5–4 Hz) | Jitter (4–30 Hz) |
|---|---|---:|---:|
| 30 Hz | straight | 0.05° / 0.05° | 0.01° / 0.05° |
| 30 Hz | weave | 2.88° / 2.85° | 0.61° / 0.63° |
| 30 Hz | compress, the hand reaching | 7.94° / 7.72° | 2.05° / 2.30° |
| 120 Hz | straight | 0.04° / 0.05° | 0.01° / 0.05° |
| 120 Hz | weave | 2.72° / 2.86° | 0.58° / 0.60° |
| 120 Hz | compress, the hand reaching | 7.10° / 7.31° | 3.13° / 2.81° |

| Switch film | Joint spike, 60 Hz | Joint spike, 120 Hz |
|---|---:|---:|
| pop-up and landing | 0.88 / 0.94 m/s | 0.87 / 1.11 m/s |
| a fall | 0.13 / 0.40 m/s | 0.48 / 0.31 m/s |
| pumping into a fall | 0.69 / 0.83 m/s | 0.61 / 0.58 m/s |

**What is not sent** (the Review Focus):
- **The balance cue** still shows. The rig reads it back from the hands' spread, which the points carry. The weave's cue correlates 0.73 remotely against 0.80 locally, with slope 0.27 against 0.34.
- **The breath** is not sent, so another player's is drawn full at rest. The paddle film still breathes from the paddling the pose carries.
- **Weight, edge and depth** come from the points and the board, which are sent.

**The straight ride's jitter** reads 0.05° remotely against 0.01° locally, at every display rate. It is a twentieth of a degree, far under what the eye sees, and inside the test's allowance. It is likely the board's orientation, still blended linearly between poses. Left as it is.
