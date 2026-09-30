# Compress, the height ladder and the rotation stick: implementation plan (step 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Compress a distinct, fast, deep, sharp-turning stance, put the weight on W/S in every stance, add the pad's rotation stick, and show the stance inputs on the HUD.

**Architecture:** The physics (`AttachedRider`) keeps one leg rest.
- **Depth:** the crouch maps to about two thirds of `CROUCH_DEPTH` and Compress to all of it; Compress drops at least as fast as the crouch.
- **Weight:** the forward weight Compress used to add is removed.
- **Twist:** a new upper-body twist rotor turns about the leg axis. Its reaction reaches the board as a yaw torque through the feet. It is driven only by the pad's right stick X (`RideInput.rotate`); the keyboard and touch leave it at rest, so they ride as today.
- **Drawing:** the snapshot carries the twist to the drawn chest.
- **HUD:** a stance readout shows the ride request.
- **Sharper turns:** a probe first measures whether physics alone reaches the bar. If it does not, a compress-only turning assist goes in.

**Tech Stack:** TypeScript, three.js, vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-movement-flow-wave-pool.md` (step 1).

## Global Constraints

- **Checks are the user's rule (Q22):**
  - no ride reports, autopilot sweeps or slow physics suites. `AttachedRider.test.ts` and the other long riding suites are not run and not edited;
  - fast unit tests only for new logic;
  - `npx tsc -b`, `npm run build`, and one quick browser look;
  - short probes only for the Compress bar.
- The pad is the design target; the keyboard is its digital approximation.
- No move recognition (Q8): the readout shows inputs only.
- Player-facing text goes in `src/ui/strings.ts`, in English.
- The rotation stick points where the rider looks, in the same sense as steering: it goes through `screenSteer` like the steer.
- Compress bar (Q16): on flat water at about 7 m/s, a compressed bottom turn comes round about 90° in about 1 s. It must be clearly sharper than the crouch, keep most of its speed, and stay on, frontside and backside.
- Don't retry: reference shaping or rate feed-forward of the lean-in, rail grip as physics, or the feet never rolling the board past the body (`bottom-turn-check` memory).

## Review Focus

1. **Space held from paddling through the pop-up:** Compress waits for a fresh press (kept), and the readout shows that nothing is pressed, so the player can see why.
2. **A pad whose right stick rests slightly off centre:** the rotation must read 0 inside the dead zone, or the board wanders. Test in Task 2.
3. **Switching from the pad to the keyboard mid-ride:** rotation goes back to automatic (undefined), with no twist left stuck. Test in Task 2.
4. **Compress with no steer on a straight line:** no turning assist and no yaw. Test in Task 5.
5. **Settings saved before this change:** the new readout setting falls back to its default. Test in Task 4.

---

### Task 1: The height ladder and the weight

**Files:**
- Modify: `src/physics/AttachedRider.ts` (the leg rest in `prepareLeg`; `COMPRESS_WEIGHT` in `balanceStep`; the docs of `CROUCH_DEPTH`, `COMPRESS_KEEP`)
- Modify: `src/physics/RideSession.ts` (`RideInput.compress` doc)
- Test: `src/physics/stanceLadder.test.ts` (new)

**Interfaces:**
- Produces: `export const CROUCH_SHARE = 0.65` (the crouch's share of `CROUCH_DEPTH`), and `AttachedRider.legRest` (a read-only getter for `leg.rest`, m, ≤ 0).

- [ ] **Step 1: the failing test.** A rider stands on still water on a gliding board at 6 m/s (`PlaneWater`, `BoardBody.place` with a velocity), steps at 1/60 s, and reads `rider.legRest`:
  - crouch 1 settles at `−CROUCH_SHARE × CROUCH_DEPTH` (±1 cm);
  - Compress 1 settles at `−CROUCH_DEPTH` (±1 cm);
  - Compress 1 over crouch 1 goes deeper than crouch 1;
  - from standing, Compress reaches 90 % of its depth within 0.45 s;
  - Compress with trim 0 puts the centre of mass no further forward along the board than standing with trim 0 (≤ 1 cm), while trim 1 does (> 3 cm).
- [ ] **Step 2:** run `npx vitest run src/physics/stanceLadder.test.ts`. It fails: there is no `legRest` and no `CROUCH_SHARE`.
- [ ] **Step 3: implement.**
  - The rest becomes `-Math.max(CROUCH_SHARE * crouch, compress) * CROUCH_DEPTH`.
  - `compressing` becomes `compress > CROUCH_SHARE * crouch`.
  - The compressing acceleration limit becomes `Math.max(CROUCH_ACCELERATION, legLoad / mass − COMPRESS_KEEP g)`: never slower than the crouch, and faster under a turn's load.
  - The trim no longer adds `COMPRESS_WEIGHT × compress`.
  - Add the getter `get legRest(): number { return this.leg.rest; }`.
- [ ] **Step 4:** run the test until it passes, then `npx tsc -b`.
- [ ] **Step 5: commit** `feat: Compress goes deeper than the crouch and drops as fast; the weight stays on W/S`.

### Task 2: The rotation input

**Files:**
- Modify: `src/game/Sticks.ts` (`padSticks` returns `rotate`, right stick X, axis 2)
- Modify: `src/game/Controls.ts`:
  - `padRotateValue`;
  - `rideRequest` sets `rotate` only while `lastDevice === 'gamepad'` and standing;
  - `lastRequest`'s default.
- Modify: `src/physics/RideSession.ts` (`RideInput.rotate?: number`, −1 right to 1 left like `steer`; passed to `rider.rotate`)
- Modify: `src/main.ts` (both ride frames map `rotate` through `screenSteer`, as `steer`)
- Test: `src/game/Sticks.test.ts`, `src/game/Controls.test.ts`

**Interfaces:**
- Produces:
  - `padSticks(...) → { steer, trim, rotate }`;
  - `RideInput.rotate?: number`: undefined means automatic, as today;
  - `AttachedRider.rotate = Number.NaN`: NaN means automatic.

- [ ] **Step 1: the failing tests.**
  - Sticks: the right stick X past the dead zone gives `rotate` (positive right), 0 inside it; with `trimStick: 'left'` the right stick X still rotates.
  - Controls:
    - a pad with the right stick at 0.8 gives `rotate` ≈ (0.8 − 0.15)/0.85 standing and undefined prone;
    - after a key press (`lastDevice` 'keyboard') `rotate` is undefined.
- [ ] **Step 2:** run the two files. They fail.
- [ ] **Step 3: implement** as listed. `rideRequest`: `rotate: standing && this.lastDevice === 'gamepad' ? this.padRotateValue : undefined`. main.ts: `rotate: request.rotate === undefined ? undefined : this.physicalMode.screenSteer(request.rotate)` in both frames.
- [ ] **Step 4:** the tests pass; `npx tsc -b`.
- [ ] **Step 5: commit** `feat: the pad's right stick X asks for the upper body's rotation`.

### Task 3: The twist rotor, and the drawn chest following it

**Files:**
- Modify: `src/physics/AttachedRider.ts`:
  - `rotate`;
  - `twist` state `{ angle, rate }`;
  - `twistStep(h)`, called in `prepare` while standing;
  - the reaction in `coupleStanding` on rows 3–5 about `this.up`;
  - reset while landing, prone or fallen.
- Modify: `src/wave/SurfZoneRunner.ts` (`RIDER_SNAPSHOT.twist = 32`, `length: 33`; written from `rider.twist.angle`)
- Modify: `src/game/snapshotTrack.ts` (the twist is smoothed like the other scalar fields)
- Modify: `src/scene/rig/riderVisualState.ts` (`twist: number`, read from the snapshot, default 0)
- Modify: `src/scene/rig/HumanoidRig.ts` (the chest's facing adds `state.twist × standingBlend`, the hips `hipsTwistShare` of it; the total is bounded by `twistMost + snapTwist`)
- Test: `src/physics/twist.test.ts` (new), `src/scene/rig/riderVisualState.test.ts`

**Physics (cited, provisional):**
- `TWIST_INERTIA = 1.5` kg·m²: the trunk, arms and head about the spine (de Leva 1996 segment parameters; the arms held off the trunk).
- `TWIST_RANGE = 45°`: thoracolumbar axial rotation about 40–50° (Neumann, *Kinesiology of the Musculoskeletal System*).
- `TWIST_TORQUE = 120` N·m: peak trunk axial rotation torque, about 100–150 N·m.
- A critically damped PD toward `rotate × TWIST_RANGE` at `TWIST_FREQUENCY = 10` rad/s, bounded by the torque.
- The reaction on the board is the hips' torque, limited to the feet's yaw grip `FOOT_FRICTION × legLoad × 0.15` m.
- With `rotate` NaN (automatic) the target is 0 and the rotor rests, so the keyboard rides as today.

- [ ] **Step 1: the failing tests.**
  - The rotor reaches 90 % of `rotate × TWIST_RANGE` within 0.4 s on a gliding board, and never exceeds the range.
  - With `rotate` NaN it stays at 0.
  - While the upper body twists toward +y (left), the board yaws the other way (the reaction's sign).
  - `readRiderSnapshot` reads the twist; an old-length array reads 0.
- [ ] **Step 2:** run them. They fail.
- [ ] **Step 3: implement.**
- [ ] **Step 4:** the tests pass; `npx tsc -b`.
- [ ] **Step 5: commit** `feat: the upper body twists on the pad's rotation, turning the board through the feet; the drawn chest follows`.

### Task 4: The HUD stance readout

**Files:**
- Modify: `src/game/Settings.ts` (`gameplay.stanceReadout: 'always' | 'never'`, default `'always'`, sanitised)
- Modify: `src/ui/settingsModel.ts` (a choice row, in the gameplay set)
- Modify: `src/ui/strings.ts` (the row and its options, `hud.stance.*` labels)
- Modify: `src/ui/RideHud.ts`:
  - `export function stanceLevel(input) → 'normal' | 'crouch' | 'compress'`;
  - `updateStance(input: RideInput | undefined, show: boolean)`: shown only standing;
  - the height label, a weight bar (front/back) and a rotation bar (left/right).
- Modify: `src/ui/App.ts` (call `updateStance` with `controls.lastRequest`)
- Modify: `src/ui/ui.css` (the small panel beside the balance meter)
- Test: `src/ui/RideHud.test.ts`, `src/game/Settings.test.ts`

- [ ] **Step 1: the failing tests.**
  - `stanceLevel`: compress ≥ 0.5 gives compress; crouch ≥ 0.3 gives crouch; otherwise normal.
  - The readout is hidden when `show` is false or not standing.
  - A save without `stanceReadout` sanitises to `'always'`.
- [ ] **Step 2:** run them. They fail.
- [ ] **Step 3: implement.**
- [ ] **Step 4:** the tests pass; `npx tsc -b`.
- [ ] **Step 5: commit** `feat: a stance readout on the HUD (height, weight, rotation), off in Settings`.

### Task 5: Sharper compressed turns (physics first, then an assist)

**Files:**
- Probe: `src/physics/zz-compress-probe.test.ts` (untracked), the stances spec's `FaceToFlat` bottom turn: 7.0 m/s entry, crouched 0.6 on the drop, full lean 1 m before the flat.
- Modify (if the assist is needed): `src/physics/AttachedRider.ts`
- Test: `src/physics/compressTurn.test.ts` (new, the bar, about 2 s of simulated riding)

**Baseline (main, 2026-09-30), yaw at 1.0 s and at 1.5 s, and the speed kept at 1.5 s:**

| Stance | 1.0 s | 1.5 s | Speed kept |
| --- | --- | --- | --- |
| Standing | 50° | 103° | 0.47 |
| Crouch 0.6 | 46° | 95° | 0.40 |
| Crouch 1 | 45° | 87° | 0.31 |
| Compress over the crouch | 42° | 84° | 0.31 |
| Compress alone | 49° | 86° | 0.26 |

The first 0.5 s turns only 6–8° (the lean-in).

- [ ] **Step 1: the physics route.** After Tasks 1 and 3, rerun the probe with Compress, and with Compress plus a full rotation flick at the lean. Record the table. A lower body is already a shorter pendulum (`legLength`), so expect little change.
- [ ] **Step 2: if the bar is missed, the assist.**
  - **Force:** while compressing past the crouch's depth (`compress > CROUCH_SHARE × crouch`), planing and banked, the board takes a pull across its velocity toward the body's bank. That pull is perpendicular to the velocity in the water's plane, so it does no work. It is sized so the turn's pull matches what the body's lean balances:
    - `F = COMPRESS_PULL × s × m_total × max(0, g tan|θ_body| − a_across)`;
    - `s` = how far Compress is past the crouch (0–1);
    - `a_across` = the board's measured acceleration across its path.
  - **Heading:** a yaw servo turns the heading with the path, so the fins keep their angle and do not skid: `τ = K_yaw × s × (ω_path − ω_board)`, bounded.
  - Because the pull follows the lean and never leads it, the body neither falls in nor high-sides.
  - Tune `COMPRESS_PULL` and `K_yaw` in the probe to the bar.
- [ ] **Step 3: the test** (`compressTurn.test.ts`):
  - Compress frontside and backside: ≥ 80° by 1.1 s, attached, speed kept ≥ 0.6;
  - Compress turns at least 20° more than the crouch at 1.0 s;
  - Compress with steer 0 yaws under 3° in 1 s.
- [ ] **Step 4:** the tests pass; `npx tsc -b`.
- [ ] **Step 5: commit** `feat: a compressed turn comes round sharply: its pull follows the body's lean` (or the physics-only finding, if it met the bar).

### Task 6: Texts, roadmap, checks and the PR

**Files:**
- Modify: `src/ui/strings.ts` (the Controls line, the Compress hint and the bottom-turn lesson say: Compress = deeper and faster, the weight on W/S; the pad's right stick rotates)
- Modify: `ROADMAP.md` (a short entry under the movement flow)

- [ ] **Step 1:** update the texts. Run `src/game/hints.test.ts` and the lesson goal tests if they are fast.
- [ ] **Step 2:** run `npx tsc -b && npm run build`.
- [ ] **Step 3: the browser look.** Start vite on a free port in the background (the worktree's own server), open Surf, stand up, and hold Space and Shift. The readout must show Compress and Crouch, and the body must drop.
- [ ] **Step 4:** push the branch and open the PR, with the probe numbers and the old pinned tests the change may flip (not run, per Q22).
