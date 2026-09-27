# Wipeout and duck-dive, Part A: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a wipeout the rider swims on a physical leash, reels the board in and climbs on from any side; lying down, the player holds Duck-dive to push the board under broken water.

**Architecture:** Everything is a force between bodies that already exist. The leash is an elastic tether (`Leash`) between the fallen surfer's back-foot leg node and the board's tail plug, stepped by `RideSession` after the swimmer. The grab (`BoardRecovery`) first twists and rolls the board with hand forces, then pulls the chest on as today. The duck-dive is a prone posture change inside `AttachedRider` (arms straighten, then a knee on the tail): the composite board–rider solve turns the moving centre of mass into a push on the board, and the body's weight coming out of the water holds it under. The swimmer dives with a downward stroke. The new inputs (`duckDive`, `reel`) travel in `RideInput` from `Controls` through the worker; the snapshot carries the leash, the duck and the swim state to the HUD, hints, rig, sound and the online pose.

**Tech Stack:** TypeScript, three.js, Vitest (`npx vitest run --dir src <file>`), rolldown-built node scripts for reports.

**Spec:** `docs/superpowers/specs/2026-09-27-wipeout-and-duck-dive.md` (Part A). Research: `docs/research/surf-gameplay-research.md` §5 (duck-dive) and §6 (leash).

## Global Constraints

- Physical inputs, not scripted moves: no position or velocity is assigned to a body to make a manoeuvre happen; every effect is a force or impulse with an equal and opposite reaction.
- Study numbers: outcomes are validation checks; body limits are provisional design parameters citing their source in a doc comment. A failing check is investigated, never tuned into passing.
- Leash: 6 ft (1.83 m), back-foot ankle (right regular, left goofy), stretches about 30–50 % before its tension climbs steeply, snaps above about 1.2 kN, recoil. "Leash snapped" on the HUD; R relaunches with a new leash.
- Duck-dive: a rebindable action, live lying down and while swimming: S/↓ (ramped over 0.2 s), gamepad LT (analog) and D-pad down. Arms push the nose, the knee follows about 0.3 s later, release floats up. About 234 N net push to sink the reference board (25.75 L).
- No bail, no turtle roll, no stamina. The camera stays above the water. R stays the quick retry.
- Don't touch the standing rider's physics (Compress/re-catch/Reef run in parallel).
- Performance is measured, never a gate. English only; every player-facing string goes through `src/ui/strings.ts`.
- Tests run with `npx vitest run --dir src` (other sessions' worktrees live under `.claude/worktrees/`). The suite was 1,102 tests green at the start.
- Code style: match the surrounding code: doc comments that cite sources, `readonly` scratch vectors, no allocation in per-step paths.

## Review Focus

1. **A saved binding already on S, ↓, LT or D-pad down for another lying-down action** (the player rebound paddle to S): the new Duck-dive default must not steal it. Duck-dive takes only the defaults that are free, and the player's own binding keeps working. Pinned in Task 7.
2. **Holding Enter across a remount:** reeling holds Enter; once the rider is back on the board prone, the still-held Enter must not pop the rider up (the pop-up is a press, not a hold). Pinned in Task 2.
3. **Duck-dive held while standing, pushing up or landing:** nothing happens (S still trims back standing); a duck held when the pop-up is pressed refuses the pop-up. Pinned in Task 5.
4. **Reeling against a current:** the arms can't pull harder than they are able to, so reeling alone never snaps the leash, even with the board held in a rip. Pinned in Task 1.
5. **A retry or lesson restart mid-duck or with the leash snapped:** the rider comes back lying normally, with an intact leash. Pinned in Tasks 2 and 5.

---

## File map

| File | Change |
|---|---|
| `src/physics/Leash.ts` (new) | The tether: tension law, snap, reel, impulses between a body node and the board |
| `src/physics/RideSession.ts` | Owns the leash; reel/grab/dive input routing; resets on place |
| `src/physics/BoardRecovery.ts` | Grab from any side: twist and roll before pulling on |
| `src/physics/DetachedSurfer.ts` | Dive (downward stroke) and swimming up underwater |
| `src/physics/riderPosture.ts` | The duck-dive postures (press, knee) |
| `src/physics/AttachedRider.ts` | Duck state, posture blend and its drive, no paddling or pop-up while ducking, render points |
| `src/physics/testing/BoreWater.ts` (new) | An analytic bore with a surface roller, for body tests |
| `scripts/duck-dive-report.ts` (new), `package.json` | The validation report on the real surf zone |
| `src/game/Bindings.ts`, `src/game/Settings.ts`, `src/game/Controls.ts` | The Duck-dive action, its defaults and clash rule, the `duckDive` axis and `reel` hold |
| `src/wave/SurfZoneRunner.ts` | Snapshot and status fields |
| `src/ui/ridePrompt.ts`, `src/ui/strings.ts` | Prompts for reeling and a snapped leash; action names and help |
| `src/game/hints.ts`, `src/ui/App.ts` | Duck-dive and reel hints |
| `src/scene/rig/riderVisualState.ts`, `src/scene/rig/HumanoidRig.ts` | Duck and swim detail |
| `src/scene/board/LeashCord.ts` (new) + its owners | The drawn cord |
| `src/net/poseCodec.ts`, `src/net/ownPose.ts`, `src/scene/RemoteSurferViews.ts` | Flags for others to draw |
| `src/audio/soundMapping.ts`, `src/audio/synth.ts` (+ manifest) | Snap, knock, plunge |
| `src/game/school/lessons.ts`, `lessonWave.ts`, `lessonFlow.ts`, strings | The Duck-dive lesson |
| `ROADMAP.md`, the spec | Status |

---

### Task 1: The leash

**Files:**
- Create: `src/physics/Leash.ts`
- Test: `src/physics/Leash.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const LEASH = { length: 1.83, softShare: 0.4, softTension: 250, stiffness: 4000, damping: 25, snap: 1200, reelRate: 0.6, reelForce: 290, reach: 0.8 } as const;
  export interface LeashNode { readonly position: Vector3; readonly velocity: Vector3; readonly mass: number }
  export class Leash {
    /** The cord's working length, m: LEASH.length, shorter while reeled in. */
    length: number;
    snapped: boolean;
    /** Tension at the latest step, N; the ends' distance, m. */
    tension: number;
    distance: number;
    reeling: boolean;
    reset(): void;
    /** The cord's tension for a stretch (m past `length`) and its rate (m/s, positive lengthening). */
    tensionAt(stretch: number, rate: number): number;
    /** One step: reel, then pull the node and the board's plug together along the cord. */
    step(dt: number, ankle: Readonly<Vector3>, node: LeashNode, plug: Readonly<Vector3>, board: BoardContactBody, reel: boolean): void;
  }
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BoardBody } from './BoardBody';
import { LEASH, Leash } from './Leash';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;
const node = (mass = 7.5) => ({ position: new Vector3(), velocity: new Vector3(), mass });

describe('leash', () => {
  it('is slack up to its length, soft for 40 % more, then steep', () => {
    const leash = new Leash();
    expect(leash.tensionAt(-0.2, 0)).toBe(0);
    expect(leash.tensionAt(0.4 * LEASH.length, 0)).toBeCloseTo(LEASH.softTension, 5);
    const soft = leash.tensionAt(0.2, 0) / 0.2;
    const steep = (leash.tensionAt(0.4 * LEASH.length + 0.1, 0) - leash.tensionAt(0.4 * LEASH.length, 0)) / 0.1;
    expect(steep).toBeGreaterThan(8 * soft);
  });

  it('never pushes: a slack cord closing fast carries no tension', () => {
    expect(new Leash().tensionAt(0.05, -3)).toBe(0);
  });

  it('stops a board thrown away from a floating swimmer, and the pair settles', () => {
    const water = new PlaneWater();
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y - 0.02, 0.5), new Quaternion(), new Vector3(0, 0, 6));
    const ankle = node(73);
    const leash = new Leash();
    let furthest = 0;
    for (let i = 0; i < 600; i += 1) {
      board.step(STEP, water);
      leash.step(STEP, ankle.position, ankle, board.position, board, false);
      ankle.position.addScaledVector(ankle.velocity, STEP);
      furthest = Math.max(furthest, board.position.distanceTo(ankle.position));
      expect(Number.isFinite(board.position.z)).toBe(true);
    }
    expect(leash.snapped).toBe(false);
    expect(furthest).toBeLessThan(LEASH.length * 1.55);
    expect(board.velocity.length()).toBeLessThan(0.5);
  });

  it('snaps above about 1.2 kN and then holds nothing', () => {
    const board = new BoardBody();
    board.place(new Vector3(0, 0, LEASH.length));
    const ankle = node(1e6);
    const leash = new Leash();
    for (let i = 0; i < 60 && !leash.snapped; i += 1) {
      board.velocity.set(0, 0, 8);
      board.position.z += 8 * STEP;
      leash.step(STEP, ankle.position, ankle, board.position, board, false);
    }
    expect(leash.snapped).toBe(true);
    const before = board.velocity.clone();
    leash.step(STEP, ankle.position, ankle, board.position, board, false);
    expect(board.velocity.distanceTo(before)).toBe(0);
    expect(leash.tension).toBe(0);
  });

  it('reels the board in hand over hand, down to reach, and lets the cord out when released', () => {
    const board = new BoardBody();
    board.place(new Vector3(0, 0, 1.8));
    const ankle = node(1e6);
    const leash = new Leash();
    for (let i = 0; i < 300; i += 1) {
      leash.step(STEP, ankle.position, ankle, board.position, board, true);
      board.position.addScaledVector(board.velocity, STEP);
      board.velocity.multiplyScalar(0.9);
    }
    expect(leash.length).toBeCloseTo(LEASH.reach, 2);
    expect(board.position.distanceTo(ankle.position)).toBeLessThan(LEASH.reach + 0.2);
    leash.step(STEP, ankle.position, ankle, board.position, board, false);
    expect(leash.length).toBe(LEASH.length);
  });

  // Review Focus 4: the arms can't pull harder than they are able to.
  it('never reels harder than the arms can pull, so reeling alone cannot snap it', () => {
    const board = new BoardBody();
    board.place(new Vector3(0, 0, LEASH.length));
    const ankle = node(1e6);
    const leash = new Leash();
    let most = 0;
    for (let i = 0; i < 600; i += 1) {
      board.velocity.set(0, 0, 1.5); // held seaward by a rip
      leash.step(STEP, ankle.position, ankle, board.position, board, true);
      board.position.addScaledVector(board.velocity, STEP);
      most = Math.max(most, leash.tension);
    }
    expect(leash.snapped).toBe(false);
    expect(most).toBeLessThan(LEASH.snap);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run --dir src src/physics/Leash.test.ts`
Expected: FAIL, cannot resolve `./Leash`.

- [ ] **Step 3: Implement `src/physics/Leash.ts`**

```ts
import { Vector3 } from 'three';
import type { BoardContactBody } from './DetachedSurfer';

/**
 * The leash (the wipeout spec, Part A; survey §6), provisional design parameters:
 * - a 6 ft (1.83 m) urethane cord from the back-foot ankle to the tail plug;
 * - slack up to its length, then soft: SOFT_TENSION, N, at SOFT_SHARE of its length
 *   stretched (urethane cords stretch 30–50 % before they stiffen), then STIFFNESS, N/m;
 * - DAMPING, N·s/m, only while lengthening (the cord's hysteresis; recoil keeps its spring);
 * - it snaps above SNAP, N: manufacturers quote about 100 kg (~1 kN) for some cords, and a
 *   bore's drag on a tethered board is 0.6 kN edge-on to 3 kN flat-on at 4 m/s (survey §6);
 * - reeled hand over hand at REEL_RATE, m/s, down to REACH, m, never pulling harder than
 *   REEL_FORCE, N (0.4 body weights, the prone arm's HAND_FORCE_LIMIT).
 */
export const LEASH = { length: 1.83, softShare: 0.4, softTension: 250, stiffness: 4000, damping: 25, snap: 1200, reelRate: 0.6, reelForce: 290, reach: 0.8 } as const;

export interface LeashNode {
  readonly position: Vector3;
  readonly velocity: Vector3;
  readonly mass: number;
}

/** An elastic tether between one body node and the board's plug, applied as equal and opposite impulses. */
export class Leash {
  length: number = LEASH.length;
  snapped = false;
  tension = 0;
  distance = 0;
  reeling = false;
  private readonly along = new Vector3();
  private readonly plugVelocity = new Vector3();
  private readonly impulse = new Vector3();

  reset(): void {
    this.length = LEASH.length;
    this.snapped = false;
    this.tension = 0;
    this.distance = 0;
    this.reeling = false;
  }

  tensionAt(stretch: number, rate: number): number {
    if (!(stretch > 0)) return 0;
    const soft = LEASH.softShare * LEASH.length;
    const spring = stretch <= soft
      ? (LEASH.softTension * stretch) / soft
      : LEASH.softTension + LEASH.stiffness * (stretch - soft);
    return Math.max(0, spring + LEASH.damping * Math.max(0, rate));
  }

  step(dt: number, ankle: Readonly<Vector3>, node: LeashNode, plug: Readonly<Vector3>, board: BoardContactBody, reel: boolean): void {
    this.tension = 0;
    const along = this.along.subVectors(plug, ankle);
    this.distance = along.length();
    this.reeling = reel && !this.snapped && this.distance > LEASH.reach;
    if (!reel) this.length = LEASH.length;
    if (this.snapped || this.distance < 1e-6) return;
    along.divideScalar(this.distance);
    board.velocityAt(plug as Vector3, this.plugVelocity);
    const rate = this.plugVelocity.sub(node.velocity).dot(along);
    if (this.reeling) {
      // Hand over hand: the slack is taken up at once, then the cord shortens while the arms can still pull.
      this.length = Math.min(this.length, Math.max(LEASH.reach, this.distance));
      if (this.tensionAt(this.distance - this.length, rate) < LEASH.reelForce) this.length = Math.max(LEASH.reach, this.length - LEASH.reelRate * dt);
    }
    let tension = this.tensionAt(this.distance - this.length, rate);
    if (this.reeling) tension = Math.min(tension, LEASH.reelForce);
    if (tension > LEASH.snap) {
      this.snapped = true;
      return;
    }
    this.tension = tension;
    if (tension === 0) return;
    const impulse = this.impulse.copy(along).multiplyScalar(tension * dt);
    node.velocity.addScaledVector(impulse, 1 / node.mass);
    board.applyImpulse(impulse.multiplyScalar(-1), plug);
  }
}
```

Note: while reeling the cord's tension is capped at `reelForce` (the hands slip on the cord past it), which is what keeps reeling from snapping it.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run --dir src src/physics/Leash.test.ts`
Expected: PASS (5 tests). If the "stops a thrown board" test fails on `furthest`, print the peak tension and stretch before changing anything: the check is the survey's 30–50 % stretch plus the steep region, not a tuning target.

- [ ] **Step 5: Commit**

```bash
git add src/physics/Leash.ts src/physics/Leash.test.ts
git commit -m "feat: an elastic leash that snaps above 1.2 kN and reels in hand over hand"
```

---

### Task 2: The leash in the ride session

**Files:**
- Modify: `src/physics/RideSession.ts`
- Test: `src/physics/RideSession.test.ts`

**Interfaces:**
- Consumes: `Leash`, `LEASH` (Task 1).
- Produces:
  ```ts
  // RideInput gains:
  /** Lying down or swimming, the Duck-dive action: 0 to 1 (analog). */
  duckDive?: number;
  /** In the water, the pop-up key held: reel the leash in, and grab the board once it is in reach. */
  reel?: boolean;
  // RideSession gains:
  readonly leash: Leash;
  /** The tail plug in the world. */
  leashPlug(out: Vector3): Vector3;
  /** The back-foot ankle in the world: the attached rider's back foot, or the fallen surfer's. */
  leashAnkle(out: Vector3): Vector3;
  ```

- [ ] **Step 1: Write the failing tests** (append to `RideSession.test.ts`)

```ts
describe('the leash in a ride', () => {
  const fallen = () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(0, 0, 0), 0, water);
    session.separate('balance');
    session.step(STEP, water, idle);
    return { session, water };
  };

  it('keeps a board flung away from the fallen surfer within the stretched leash', () => {
    const { session, water } = fallen();
    session.board.velocity.set(0, 0, 5);
    let furthest = 0;
    const ankle = new Vector3();
    const plug = new Vector3();
    for (let i = 0; i < 300; i += 1) {
      session.step(STEP, water, idle);
      furthest = Math.max(furthest, session.leashPlug(plug).distanceTo(session.leashAnkle(ankle)));
    }
    expect(session.leash.snapped).toBe(false);
    expect(furthest).toBeLessThan(1.83 * 1.55);
  });

  it('ties the back foot: the right ankle regular, the left goofy', () => {
    for (const stance of ['regular', 'goofy'] as const) {
      const session = new RideSession({ stance });
      const water = new PlaneWater();
      session.reset(new Vector3(0, 0, 0), 0, water);
      session.separate('balance');
      session.step(STEP, water, idle);
      const ankle = session.leashAnkle(new Vector3());
      const leg = session.surfer.getPartPosition(stance === 'regular' ? 'rightLeg' : 'leftLeg', new Vector3());
      const other = session.surfer.getPartPosition(stance === 'regular' ? 'leftLeg' : 'rightLeg', new Vector3());
      expect(ankle.distanceTo(leg)).toBeLessThan(ankle.distanceTo(other));
    }
  });

  it('holding the pop-up key reels the board in and climbs back on', () => {
    const { session, water } = fallen();
    session.board.velocity.set(0, 0, 3);
    for (let i = 0; i < 90; i += 1) session.step(STEP, water, idle);
    let climbed = -1;
    for (let i = 0; i < 900 && climbed < 0; i += 1) {
      session.step(STEP, water, { ...idle, reel: true });
      if (session.rider.attached) climbed = i;
    }
    expect(climbed).toBeGreaterThan(0);
    expect(session.phase).toBe('prone');
  });

  // Review Focus 2: the pop-up is a press, not a hold.
  it('does not pop up when the reel is still held after climbing on', () => {
    const { session, water } = fallen();
    for (let i = 0; i < 900 && !session.rider.attached; i += 1) session.step(STEP, water, { ...idle, reel: true });
    expect(session.rider.attached).toBe(true);
    for (let i = 0; i < 120; i += 1) session.step(STEP, water, { ...idle, reel: true });
    expect(session.phase).toBe('prone');
  });

  // Review Focus 5.
  it('gives a new leash on a relaunch', () => {
    const { session, water } = fallen();
    session.leash.snapped = true;
    session.reset(new Vector3(0, 0, 0), 0, water);
    expect(session.leash.snapped).toBe(false);
    expect(session.leash.length).toBe(1.83);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run --dir src src/physics/RideSession.test.ts`
Expected: FAIL (`leash`, `leashPlug`, `leashAnkle` undefined; `reel` ignored).

- [ ] **Step 3: Implement**

In `RideSession.ts`:
- Add the two optional `RideInput` fields above, with their doc comments.
- `readonly leash = new Leash();` beside `recovery`; `place()` calls `this.leash.reset()`.
- Constants, with a doc comment: the plug sits `PLUG_FROM_TAIL = 0.05` m ahead of the tail on the deck; the ankle is `ANKLE_REACH = 1.85` of the way from the pelvis node through the leg node (the leg node is the leg's centre, 0.48 m below the hip of a 0.9 m leg, `DetachedSurfer`'s SPECS).
- `leashPlug(out)`: `this.board.toWorld(this.plugLocal, out)` where `plugLocal = (0, deckHeight(shape, z), z)` with `z = -shape.length / 2 + PLUG_FROM_TAIL` (import `deckHeight` from `riderPosture`), built once in the constructor.
- `leashAnkle(out)`: attached → `this.rider.renderPoint(backFoot, this.board, out)` (back foot index: 6 regular, 5 goofy — `renderPoint`'s feet are 5 left and 6 right); fallen → pelvis + (leg − pelvis) × ANKLE_REACH using the back leg node.
- In `step`, inside `if (surfer.active)`, after `surfer.resolveBoardContact(board)`:

```ts
      const back = surfer.nodes[this.rider.stance === 'regular' ? 6 : 5];
      this.leash.step(dt, this.leashAnkle(this.ankle), back, this.leashPlug(this.plug), board, input.reel ?? false);
      // Holding the pop-up key reels the board in; in reach, the hold grabs it as a press does.
      if ((input.popUp || input.reel) && this.recovery.state === 'free') this.recovery.tryGrab(board);
```

  (replacing the existing `if (input.popUp && …) tryGrab` line). `ankle` and `plug` are new private scratch vectors.
- When the rider is attached, set `this.leash.tension = 0` and `this.leash.reeling = false` so the status reads a slack cord.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run --dir src src/physics/RideSession.test.ts src/physics/Leash.test.ts`
Expected: PASS. The "reels the board in" test depends on the grab reaching; if it never climbs, check `tryGrab`'s reach against where reeling leaves the board (LEASH.reach 0.8 m from the ankle) before changing either — Task 3 rewrites the grab's reach to the board's nearest point.

- [ ] **Step 5: Commit**

```bash
git add src/physics/RideSession.ts src/physics/RideSession.test.ts
git commit -m "feat: the fallen surfer wears the leash, reels the board in and grabs it holding the pop-up key"
```

---

### Task 3: Grab from any side

**Files:**
- Modify: `src/physics/BoardRecovery.ts`
- Test: `src/physics/BoardRecovery.test.ts`

**Interfaces:**
- Consumes: `BoardContactBody`, `DetachedSurfer`.
- Produces: `RecoveryState` stays `'free' | 'holding' | 'prone-ready'`; `BoardRecovery` gains `aligned: boolean` (read-only in spirit: true once the board is deck-up and turned to the swimmer's heading, when the chest pull starts).

- [ ] **Step 1: Write the failing tests** (append to `BoardRecovery.test.ts`; reuse the file's existing helpers for a floating swimmer and board on `PlaneWater` — read the file's first 40 lines for them)

```ts
  it('grabs a board pointing the other way, turns it and climbs on', () => {
    const { session, water } = swimmerBesideBoard({ boardHeading: Math.PI, swimmerHeading: 0 });
    session.step(1 / 60, water, { paddle: false, popUp: true, steer: 0 });
    let steps = 0;
    while (!session.rider.attached && steps < 300) {
      session.step(1 / 60, water, { paddle: false, popUp: false, steer: 0 });
      steps += 1;
    }
    expect(session.rider.attached).toBe(true);
    const forward = new Vector3(0, 0, 1).applyQuaternion(session.board.orientation);
    expect(Math.abs(Math.atan2(forward.x, forward.z))).toBeLessThan((30 * Math.PI) / 180);
  });

  it('rights an upside-down board before climbing on', () => {
    const { session, water } = swimmerBesideBoard({ boardHeading: 0, swimmerHeading: 0, upsideDown: true });
    session.step(1 / 60, water, { paddle: false, popUp: true, steer: 0 });
    let steps = 0;
    while (!session.rider.attached && steps < 360) {
      session.step(1 / 60, water, { paddle: false, popUp: false, steer: 0 });
      steps += 1;
    }
    expect(session.rider.attached).toBe(true);
    expect(new Vector3(0, 1, 0).applyQuaternion(session.board.orientation).y).toBeGreaterThan(0.8);
  });

  it('twists the board with the hands: the swimmer takes the opposite turn', () => {
    const { session, water } = swimmerBesideBoard({ boardHeading: Math.PI / 2, swimmerHeading: 0 });
    session.step(1 / 60, water, { paddle: false, popUp: true, steer: 0 });
    const before = session.surfer.angularMomentum().y;
    session.step(1 / 60, water, { paddle: false, popUp: false, steer: 0 });
    // Water drag acts on both, so only the signs are pinned: the swimmer turns against the board.
    const swimmerTurn = session.surfer.angularMomentum().y - before;
    expect(session.board.angularVelocity.y).not.toBe(0);
    expect(Math.sign(swimmerTurn)).toBe(-Math.sign(session.board.angularVelocity.y));
  });
```

Write the helper `swimmerBesideBoard({ boardHeading, swimmerHeading, upsideDown })` in the test file: a `RideSession` reset on `PlaneWater`, `separate()`, one step, then `session.board.place(...)` at 0.5 m beside the swimmer's torso with the given heading (and rotated π about its length when `upsideDown`), and `session.surfer.heading = swimmerHeading`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run --dir src src/physics/BoardRecovery.test.ts`
Expected: FAIL (the reversed board is refused by the heading check; the upside-down board is never righted).

- [ ] **Step 3: Implement**

In `BoardRecovery.ts`:
- `tryGrab`: drop the heading check. Reach is the torso node's distance to the nearest point of the board's box (board-local clamp of the torso to `halfExtents`, back to world) ≤ `GRAB_REACH = 1.0` m, and relative speed < 1.5 m/s as today.
- `aligned = false` on grab and on `release()`.
- `step`: while `!aligned`, the hands twist and roll the board (no chest pull yet):

```ts
/**
 * Before pulling on (the wipeout spec: grab from any side), the hands turn the
 * board toward the swimmer's heading and roll it deck-up: a couple on the board
 * at its rails, and its reaction on the two arm nodes. TWIST, N·m per rad of
 * error up to MAX_TWIST, damped by TWIST_DAMPING, N·m·s/rad (provisional: a
 * light board turned by hand in about a second). Aligned within ALIGNED_YAW,
 * rad, deck up past ALIGNED_UP (the deck normal's vertical part).
 */
const TWIST = 60;
const TWIST_DAMPING = 8;
const MAX_TWIST = 40;
const ALIGNED_YAW = (25 * Math.PI) / 180;
const ALIGNED_UP = 0.7;
```

  The yaw error is `wrap(swimmer heading − board heading)`; the roll error is the angle between the deck normal and world up about the board's length (sign from the deck normal's x). Torque τ = clamp(TWIST·error − TWIST_DAMPING·ω, ±MAX_TWIST) about world up (yaw) and the board's forward axis (roll). Apply it to the board as a force couple: forces ±τ/(2r) at the two rail points ±r across (r = `halfExtents.x`), each `board.applyImpulse(F·dt, railPoint)`; apply the opposite forces to arm nodes 3 and 4 (`node.velocity += −F·dt / node.mass`). Keep a soft hold on the torso toward the nearer rail (the existing torso contact spring, but to the nearer rail point instead of the deck) so the swimmer stays by the board. When both errors are inside the thresholds, `aligned = true` and the existing contacts pull the chest on as today.
- Everything else (impulse caps, `prone-ready`) stays.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run --dir src src/physics/BoardRecovery.test.ts src/physics/RideSession.test.ts`
Expected: PASS, including the existing momentum-continuity remount tests.

- [ ] **Step 5: Commit**

```bash
git add src/physics/BoardRecovery.ts src/physics/BoardRecovery.test.ts
git commit -m "feat: grab the board from any side: the hands turn it and roll it deck-up before climbing on"
```

---

### Task 4: The swimmer dives and swims up

**Files:**
- Modify: `src/physics/DetachedSurfer.ts`, `src/physics/RideSession.ts`
- Test: `src/physics/DetachedSurfer.test.ts`, `src/physics/RideSession.test.ts`

**Interfaces:**
- Produces: `SwimInput` gains `dive?: number` (0–1). `DetachedSurfer` gains `diving: boolean` and `underwater: boolean` (head node fully submerged) for the snapshot.

- [ ] **Step 1: Write the failing tests**

In `DetachedSurfer.test.ts` (use the file's existing flat-water field; if it has none, wrap `PlaneWater` in `SurfWaterBodyField`):

```ts
  it('dives under while the dive is held, and floats back up when let go', () => {
    const { surfer, field } = floatingSurfer();
    let deepest = 0;
    for (let i = 0; i < 120; i += 1) {
      surfer.step(1 / 60, field, { stroke: false, steer: 0, dive: 1 });
      deepest = Math.max(deepest, -surfer.getPartPosition('head', new Vector3()).y);
    }
    expect(deepest).toBeGreaterThan(0.5);
    let surfaced = -1;
    for (let i = 0; i < 300 && surfaced < 0; i += 1) {
      surfer.step(1 / 60, field, { stroke: false, steer: 0 });
      if (surfer.getPartPosition('head', new Vector3()).y > -0.05) surfaced = i;
    }
    expect(surfaced).toBeGreaterThan(0);
  });

  it('underwater, stroking swims up faster than floating', () => {
    const rise = (stroke: boolean) => {
      const { surfer, field } = floatingSurfer();
      for (let i = 0; i < 90; i += 1) surfer.step(1 / 60, field, { stroke: false, steer: 0, dive: 1 });
      const from = surfer.centerOfMass().y;
      for (let i = 0; i < 30; i += 1) surfer.step(1 / 60, field, { stroke, steer: 0 });
      return surfer.centerOfMass().y - from;
    };
    expect(rise(true)).toBeGreaterThan(rise(false) + 0.05);
  });
```

In `RideSession.test.ts`:

```ts
  it('lets go of a held board to dive', () => {
    const { session, water } = fallen();
    // Hold the board without climbing on: grab, then dive at once.
    session.board.place(session.surfer.centerOfMass(new Vector3()).add(new Vector3(0.4, 0, 0)));
    session.step(STEP, water, { ...idle, popUp: true });
    expect(session.recovery.state).not.toBe('free');
    session.step(STEP, water, { ...idle, duckDive: 1 });
    expect(session.recovery.state).toBe('free');
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run --dir src src/physics/DetachedSurfer.test.ts src/physics/RideSession.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `DetachedSurfer.ts`, after the stroke block in `step`:

```ts
/**
 * Diving (the wipeout spec): the arms pull and the legs kick down and forward at
 * DIVE_PITCH below level, with the stroke's thrust per limb scaled by the dive
 * input. A body of density 950 floats with about 40 N to spare fully under, so
 * the ~150 N downward share takes it under; let go, it floats back up.
 * Underwater (the head's node fully wet), a stroke swims up and forward at
 * SURFACE_PITCH instead of along the surface. Provisional.
 */
const DIVE_PITCH = Math.PI / 4;
const SURFACE_PITCH = Math.PI / 3;
```

- `this.underwater = this.nodes[2].submersion >= 1` (set after the water pass).
- The stroke's direction: underwater → `(sin h·cos SURFACE_PITCH, sin SURFACE_PITCH, cos h·cos SURFACE_PITCH)`; otherwise today's.
- `const dive = clamp(input.dive ?? 0, 0, 1); this.diving = dive > 0.05 && this.controlGain > 0;` When diving, add the same per-limb thrust as the stroke (75 arms, 30 legs, × controlGain × submersion × dive) along `(sin h·cos DIVE_PITCH, −sin DIVE_PITCH, cos h·cos DIVE_PITCH)` into `forces` and `lastForces.swim`. A dive and a stroke together: the dive wins (skip the stroke).
- `start()` resets `diving` and `underwater`.

In `RideSession.step`, pass `dive: input.duckDive ?? 0` to `surfer.step`, and before the grab lines: `if ((input.duckDive ?? 0) > 0.3 && this.recovery.state !== 'free') this.recovery.release();`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run --dir src src/physics/DetachedSurfer.test.ts src/physics/RideSession.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/physics/DetachedSurfer.ts src/physics/DetachedSurfer.test.ts src/physics/RideSession.ts src/physics/RideSession.test.ts
git commit -m "feat: the swimmer dives under with the duck-dive key and swims up underwater"
```

---

### Task 5: The duck-dive

**Files:**
- Modify: `src/physics/riderPosture.ts`, `src/physics/AttachedRider.ts`, `src/physics/RideSession.ts`
- Test: `src/physics/duckDive.test.ts` (new)

**Interfaces:**
- Produces:
  ```ts
  // riderPosture.ts
  export type DuckPose = 'duckPress' | 'duckKnee';
  /** The duck-dive's postures (board frame, like riderPose), and the support while ducking. */
  export function duckPose(shape: BoardShape, pose: DuckPose, stance: StanceName): Posture;
  // AttachedRider
  /** Lying down, the Duck-dive input: 0 to 1. */
  duckDive: number;
  /** The duck-dive's progress: the arms' press and the knee on the tail, 0–1 each. */
  readonly duck: { press: number; knee: number; held: number };
  ```
  `RideSession.step` sets `rider.duckDive = input.duckDive ?? 0` with the other attached inputs.

- [ ] **Step 1: Write the failing tests** (`src/physics/duckDive.test.ts`)

```ts
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { REFERENCE_BOARD } from './boardReference';
import { buildBoardShape } from './boardShape';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;

/** A prone rider on flat water, the dive held `hold` s at `amount`, then released for `after` s: the deck's deepest point under the surface, and whether it came back up still on. */
function duckDive(amount: number, hold = 1.5, after = 3, shape = buildBoardShape()) {
  const water = new PlaneWater();
  const board = new BoardBody({ shape });
  board.place(new Vector3(0, shape.centerOfMass.y - 0.03, 0));
  const rider = new AttachedRider(board.shape);
  board.attach(rider);
  for (let i = 0; i < 120; i += 1) board.step(STEP, water); // settle
  let deepest = 0;
  const deck = new Vector3();
  for (let i = 0; i < (hold + after) / STEP; i += 1) {
    rider.duckDive = i * STEP < hold ? amount : 0;
    board.step(STEP, water);
    board.toWorld({ x: 0, y: shape.curves.thickness(0.5) + shape.curves.rocker(0.5), z: 0 }, deck);
    deepest = Math.max(deepest, -deck.y);
  }
  board.toWorld({ x: 0, y: shape.curves.thickness(0.5) + shape.curves.rocker(0.5), z: 0 }, deck);
  return { deepest, surfaced: deck.y > -0.05, attached: rider.attached, rider };
}

describe('duck-dive', () => {
  it('a strong push sinks the reference board 0.5–1 m (survey §5), and it comes back up with the rider on', () => {
    const full = duckDive(1);
    expect(full.deepest).toBeGreaterThan(0.5);
    expect(full.deepest).toBeLessThan(1.0);
    expect(full.attached).toBe(true);
    expect(full.surfaced).toBe(true);
  });

  it('pushes shallower on a lighter press (analog)', () => {
    expect(duckDive(0.5).deepest).toBeLessThan(duckDive(1).deepest - 0.1);
  });

  it('a 50 L board is practically un-diveable (survey §5)', () => {
    const big = buildBoardShape({ ...REFERENCE_BOARD, length: 2.13, width: 0.54, thickness: 0.076, volume: 0.05, mass: 4.5 });
    expect(duckDive(1, 1.5, 3, big).deepest).toBeLessThan(0.5 * duckDive(1).deepest);
  });

  it('the knee follows the arms about 0.3 s later, and both let go on release', () => {
    const water = new PlaneWater();
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y - 0.03, 0));
    const rider = new AttachedRider(board.shape);
    board.attach(rider);
    rider.duckDive = 1;
    for (let i = 0; i < 12; i += 1) board.step(STEP, water); // 0.2 s
    expect(rider.duck.press).toBeGreaterThan(0.5);
    expect(rider.duck.knee).toBe(0);
    for (let i = 0; i < 30; i += 1) board.step(STEP, water); // 0.7 s
    expect(rider.duck.knee).toBeGreaterThan(0.5);
    rider.duckDive = 0;
    for (let i = 0; i < 60; i += 1) board.step(STEP, water);
    expect(rider.duck.press + rider.duck.knee).toBe(0);
  });

  it('does not paddle while ducking', () => {
    const water = new PlaneWater();
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y - 0.03, 0));
    const rider = new AttachedRider(board.shape);
    board.attach(rider);
    rider.paddle = true;
    rider.duckDive = 1;
    for (let i = 0; i < 60; i += 1) board.step(STEP, water);
    expect(rider.handLoad[0] + rider.handLoad[1]).toBe(0);
  });

  // Review Focus 3.
  it('does nothing standing, and refuses a pop-up while ducking', () => {
    const water = new PlaneWater();
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y - 0.03, 0));
    const standing = new AttachedRider(board.shape, { phase: 'standing' });
    board.attach(standing);
    standing.duckDive = 1;
    board.step(STEP, water);
    expect(standing.duck.press).toBe(0);
    const prone = duckDive(1, 0.3, 0).rider;
    expect(prone.popUp()).toBe(false);
  });

  // Review Focus 5.
  it('comes back lying normally after a relaunch mid-duck', () => {
    const { rider } = duckDive(1, 0.5, 0);
    const board = new BoardBody();
    board.attach(rider);
    expect(rider.duck.press + rider.duck.knee).toBe(0);
  });
});
```

Before trusting the 50 L shape, check `buildBoardShape` accepts it (the outline must hold the volume with tapering rails); pick the nearest funboard dimensions that do and note them in the test's comment.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run --dir src src/physics/duckDive.test.ts`
Expected: FAIL (`duckDive`, `duck` undefined).

- [ ] **Step 3: Implement the postures** (`riderPosture.ts`)

```ts
/**
 * The duck-dive (the wipeout spec, Part A; coaching sources in survey §5):
 * - press: hands on the rails a little ahead of the chest, arms straight, the
 *   chest up over them (the shoulders an arm's length, about 0.55 m, over the
 *   deck) and the legs trailing: the body's weight comes out of the water onto
 *   the nose;
 * - knee: the back knee on the tail pad and the other leg kicked up, the body
 *   forward and low over the board, arms still long: the weight moves back and
 *   the tail goes under too.
 * Heights are illustrative, like the other postures. Support while ducking runs
 * from the knee on the tail to the hands.
 */
function duckPlaces(shape: BoardShape, pose: DuckPose): PartPlace[] {
  const tail = -shape.length / 2;
  switch (pose) {
    case 'duckPress':
      return [[0, 0.35, -0.45], [0, 0.55, -0.05], [0, 0.5, 0.25], [0.2, 0.3, 0.15], [-0.2, 0.3, 0.15], [0.1, 0.15, -1.0], [-0.1, 0.15, -1.0]];
    case 'duckKnee':
      // Regular: the back (right) knee on the tail, the front (left) leg kicked up.
      return [[0, 0.3, -0.35], [0, 0.45, 0], [0, 0.4, 0.3], [0.2, 0.25, 0.15], [-0.2, 0.25, 0.15], [0.1, 0.5, tail + 0.05], [-0.08, 0.1, tail + 0.2]];
  }
}
```

`duckPose(shape, pose, stance)` builds a `Posture` from these the way `riderPose` does (goofy mirrors, `upright: false`, `base` as prone's), with support `{ xMin: -0.23, xMax: 0.23, zMin: tail + 0.15, zMax: 0.3 }` (mirrored for goofy). Export `PartPlace`-free: only `duckPose` and `DuckPose` are public.

- [ ] **Step 4: Implement the duck state and posture blend** (`AttachedRider.ts`)

```ts
/**
 * The duck-dive's timing (the wipeout spec): the arms straighten over PRESS_TIME,
 * s; the knee starts KNEE_DELAY s after the press began and lands over KNEE_TIME;
 * released, both give back over RELEASE_TIME. The input's depth (analog) sets how
 * far each goes. Coaching sources [A] only: provisional.
 */
const PRESS_TIME = 0.25;
const KNEE_DELAY = 0.3;
const KNEE_TIME = 0.25;
const RELEASE_TIME = 0.4;
```

- Fields: `duckDive = 0`, `readonly duck = { press: 0, knee: 0, held: 0 }`, and `private readonly duckCenter = { press: new Vector3(), knee: new Vector3() }` (each pose's centre of mass minus the one before it, board frame, filled once in the constructor from `postureCenter`).
- `private duckStep(h: number)`: only while `attached && phase === 'prone'`; otherwise all three to 0. With `target = clamp(duckDive, 0, 1)`: if `target > 0.05`, `held += h`, `press` moves toward `target` at `1 / PRESS_TIME` per s, and `knee` toward `target` at `1 / KNEE_TIME` once `held ≥ KNEE_DELAY`; else `held = 0` and both move toward 0 at `1 / RELEASE_TIME`. Keep the rates of change (`pressRate`, `kneeRate`, per s) for the drive.
- Call `duckStep(h)` in `prepare` right after `advancePhase`.
- In `updatePosture`, when `phase === 'prone'` and either is above 0: blend the parts `prone + press·(pressPose − prone) + knee·(kneePose − pressPose)`, use the duck support while `press > 0.1`, and add `pressRate·duckCenter.press + kneeRate·duckCenter.knee` to `postureRate` (board frame, the same frame `prepare` rotates it from).
- `strokeEffort` returns 0 while `duck.press > 0.1` (the arms hold the rails).
- `popUp()` returns false while `duck.press > 0.1`.
- `mount()` zeroes the duck state (so a relaunch or remount lies down normally).
- `renderPoint`, prone hands while `duck.press > 0.1`: on the rails at the arm part's z (`board.toWorld((±halfWidth(z)), deckHeight(z), z)`); the legs keep today's extrapolation through the leg part.

- [ ] **Step 5: Route the input** — in `RideSession.step`'s attached block: `rider.duckDive = input.duckDive ?? 0;`.

- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run --dir src src/physics/duckDive.test.ts src/physics/AttachedRider.test.ts src/physics/RideSession.test.ts`
Expected: PASS. If the reference board does not reach 0.5 m, or goes past 1 m, **do not tune the posture heights toward the band.** Log, per step, the rider's height over the deck, the parts' buoyancy, the contact load and the board's depth, and write down which step of the mechanism (weight out of the water, the composite's pitch, the knee's shift) falls short. Report it before changing a design number; an anatomy change (arm length) needs its source.

- [ ] **Step 7: Commit**

```bash
git add src/physics/riderPosture.ts src/physics/AttachedRider.ts src/physics/RideSession.ts src/physics/duckDive.test.ts
git commit -m "feat: duck-dive: the arms press the nose under, the knee sinks the tail, release floats up"
```

---

### Task 6: Duck-diving under whitewater (validation)

**Files:**
- Create: `src/physics/testing/BoreWater.ts`, `src/physics/duckDiveBore.test.ts`
- Create: `scripts/duck-dive-report.ts`; Modify: `package.json` (`report:duckdive`)
- Create (by running the script): `docs/research/duck-dive-report.md`

**Interfaces:**
- Produces: `class BoreWater implements SurfWater` — `new BoreWater({ depth, height, speed, current, rollerShare, frontZ })` with `advance(dt)`: a step bore of `height` over still `depth`, its front at `frontZ + speed·t` moving toward +z; behind the front the depth-averaged current is `current` (+z) and the top `rollerShare × height` moves at `speed` (the `PhysicalSurfWater` roller rule: fading linearly to the current at the roller's bottom); `breaking` 1 behind the front within 10 m, 0 ahead; the surface slope is a smooth 1 m ramp at the front.

- [ ] **Step 1: Write the failing test** (`duckDiveBore.test.ts`)

```ts
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RideSession } from './RideSession';
import { BoreWater } from './testing/BoreWater';

const STEP = 1 / 60;

/** A prone paddler heading out to sea (−z) meets a 1.2 m bore; `diveAt` is the front's distance, m, when the dive starts (undefined: stays on top). Returns how far shoreward the board ended up, m, 4 s after the front reached it. */
function meetBore(diveAt?: number, depth = 2.5) {
  const water = new BoreWater({ depth, height: 1.2, speed: Math.sqrt(9.81 * depth), current: 1.5, rollerShare: 0.5, frontZ: -12 });
  const session = new RideSession();
  session.reset(new Vector3(0, 0, 0), Math.PI, water);
  let diving = false;
  let passedAt = -1;
  const start = session.board.position.z;
  for (let i = 0; i < 900; i += 1) {
    const front = water.frontZ();
    const gap = session.board.position.z - front;
    if (diveAt !== undefined && gap <= diveAt && passedAt < 0) diving = true;
    if (passedAt < 0 && gap <= 0) passedAt = i;
    if (passedAt >= 0 && i - passedAt > 1.2 / STEP) diving = false;
    session.step(STEP, water, { paddle: !diving, popUp: false, steer: 0, duckDive: diving ? 1 : 0 });
    water.advance(STEP);
    if (passedAt >= 0 && i - passedAt > 4 / STEP) break;
  }
  return { pushed: session.board.position.z - start, attached: session.rider.attached };
}

describe('duck-dive under a bore (survey §5)', () => {
  it('a well-timed dive is pushed back much less than staying on top', () => {
    const top = meetBore(undefined);
    const timed = meetBore(2.5); // about 1–2 body lengths
    expect(timed.pushed).toBeLessThan(0.5 * top.pushed);
  });

  it('diving early or late does worse than on time', () => {
    const timed = meetBore(2.5).pushed;
    expect(meetBore(9).pushed).toBeGreaterThan(timed);
    expect(meetBore(0.3).pushed).toBeGreaterThan(timed);
  });

  it('is weaker in shallow inside water', () => {
    const deep = meetBore(2.5, 2.5);
    const shallow = meetBore(2.5, 1.3);
    const deepTop = meetBore(undefined, 2.5);
    const shallowTop = meetBore(undefined, 1.3);
    expect(shallow.pushed / shallowTop.pushed).toBeGreaterThan(deep.pushed / deepTop.pushed);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run --dir src src/physics/duckDiveBore.test.ts` → FAIL (no `BoreWater`).

- [ ] **Step 3: Implement `BoreWater`** following `PlaneWater`'s sample layout (copy its `Object.assign` field list): `surfaceY` = still level + height behind the front (ramped over 1 m), `bedY = −depth`, flow `(0, 0, u(y))` with `u = current` below the roller and rising linearly to `speed` at the surface across the top `rollerShare × height`, `breaking` as above, `addReaction` a no-op tally, `frontZ()` the front's position. Doc comment: an analytic stand-in for `PhysicalSurfWater`'s roller rule, for body tests only.

- [ ] **Step 4: Run** — `npx vitest run --dir src src/physics/duckDiveBore.test.ts`. Expected: PASS. A failure here is a finding about the mechanism, not a threshold to move: report which comparison failed with the numbers.

- [ ] **Step 5: The report on the real surf zone** — `scripts/duck-dive-report.ts`, modelled on `scripts/ride-report.ts`'s option parsing and `SurfZoneRunner` setup (Practice swell, the Canyon): for each broken wave passing the inside, place a prone rider (`RideRequest.place`, heading seaward) where the wave will have broken, 25 m shoreward of the break point, and run four variants on the same seed: stay on top paddling; dive when the broken crest is 2.5 m away (held 1.2 s); dive at 9 m; dive at 0.3 m; plus the timed dive 15 m further inside. Measure the shoreward displacement over the 4 s after the front passes, and whether the rider stayed on. Write `docs/research/duck-dive-report.md`: a table per variant (median, range, stayed-on share) beside the survey's expectations, and the verdict per check (reported, not asserted). Add to `package.json`:

```json
"report:duckdive": "rolldown scripts/duck-dive-report.ts -o dist/scripts/duck-dive-report.mjs --format esm --platform node && node dist/scripts/duck-dive-report.mjs",
```

Run: `npm run report:duckdive -- --seeds 2 --minutes 3`. Expected: the report file written; read it and note the verdicts in the PR.

- [ ] **Step 6: Commit**

```bash
git add src/physics/testing/BoreWater.ts src/physics/duckDiveBore.test.ts scripts/duck-dive-report.ts package.json docs/research/duck-dive-report.md
git commit -m "test: duck-dives under a bore, and a report on the real surf zone"
```

---

### Task 7: The Duck-dive action and the reel hold

**Files:**
- Modify: `src/game/Bindings.ts`, `src/game/Settings.ts`, `src/game/Controls.ts`, `src/ui/strings.ts`
- Test: `src/game/Bindings.test.ts`, `src/game/Settings.test.ts`, `src/game/Controls.test.ts`

**Interfaces:**
- Produces: `Action` gains `'duckDive'` (context `'prone'`); defaults keyboard `['KeyS', 'ArrowDown']`, gamepad `[6, 13]`. `Controls.rideRequest(dt, standing)` returns `duckDive` (0–1) and `reel` (boolean) when not standing, 0/false standing. Strings `action.duckDive`, `action.duckDive.help`.

- [ ] **Step 1: Write the failing tests**

`Controls.test.ts` (use its existing fake target/pads helpers):

```ts
  it('ramps the duck-dive from S lying down, and leaves S to trim standing', () => {
    const { controls, press } = setup();
    press('KeyS');
    const prone = controls.rideRequest(0.1, false);
    expect(prone.duckDive).toBeGreaterThan(0);
    expect(prone.duckDive).toBeLessThan(1);
    expect(prone.trim ?? 0).toBe(0);
    const standing = controls.rideRequest(0.1, true);
    expect(standing.duckDive ?? 0).toBe(0);
  });

  it('reads the duck-dive from LT as an analog value', () => {
    const { controls, pads } = setup();
    pads.set([{ buttons: { 6: 0.4 } }]);
    controls.poll();
    expect(controls.rideRequest(1 / 60, false).duckDive).toBeCloseTo(0.4, 2);
  });

  it('holds the reel while the pop-up key is held in the water, and presses once', () => {
    const { controls, press } = setup();
    press('Enter');
    const first = controls.rideRequest(1 / 60, false);
    expect(first.reel).toBe(true);
    expect(first.popUp).toBe(true);
    controls.consumeGetUp();
    const held = controls.rideRequest(1 / 60, false);
    expect(held.reel).toBe(true);
    expect(held.popUp).toBe(false);
  });
```

(Adapt `setup`, `press` and the pad-state shape to the helpers the file already has.)

`Settings.test.ts`:

```ts
  // Review Focus 1.
  it('gives the new Duck-dive only the defaults a saved lying-down binding leaves free', () => {
    const saved = defaultSettings();
    saved.controls.bindings.keyboard.paddle = ['KeyS'];
    delete (saved.controls.bindings.keyboard as Partial<Record<string, string[]>>).duckDive;
    const loaded = loadSettings(fakeStorage(JSON.stringify(saved)));
    expect(loaded.controls.bindings.keyboard.paddle).toEqual(['KeyS']);
    expect(loaded.controls.bindings.keyboard.duckDive).toEqual(['ArrowDown']);
  });
```

(Use the file's own names for loading and default settings.)

- [ ] **Step 2: Run to verify they fail** — `npx vitest run --dir src src/game/Controls.test.ts src/game/Settings.test.ts src/game/Bindings.test.ts` → FAIL.

- [ ] **Step 3: Implement**
- `Bindings.ts`: add `'duckDive'` to `ACTIONS` after `'hand'`, `duckDive: 'prone'` in `ACTION_CONTEXT`, the defaults above. Update the P9 doc comment: "lying down, paddling and the duck-dive".
- `Settings.ts` `sanitizeBindings`: after copying the saved bindings, for each device, if a saved table had no `duckDive`, keep only the default keys/buttons that no other action live in the same context (`overlap`, export it from `Bindings.ts`) already uses; if none is free, leave it empty (`[]`), and make sure empty lists are allowed where bindings are read (`heldActions` over an empty list is fine; the settings screen must show "unbound").
- `Controls.ts`: a `duckDive` ramp beside the others; `duckKeys = !standing && has('duckDive') ? 1 : 0`; `padDuckValue = padValue(pads, bindings.gamepad.duckDive[0])` read in `poll` (0 when unbound), plus the D-pad as digital through `has`; `duckDive: !standing ? Math.max(pad && this.padDuckValue, ramp) : 0`; `reel: !standing && has('popUp')`. Add both to `lastRequest` and to `release()` resets.
- `strings.ts`: `'action.duckDive': 'Duck-dive'`, `'action.duckDive.help': 'Lying down: hold to push the board under a wave; in the water, dive'`.

- [ ] **Step 4: Run to verify they pass** — same command → PASS, and `npx vitest run --dir src src/ui` (the settings screen lists every action).

- [ ] **Step 5: Commit**

```bash
git add src/game/Bindings.ts src/game/Settings.ts src/game/Controls.ts src/ui/strings.ts src/game/*.test.ts
git commit -m "feat: the Duck-dive action (S/↓, LT, D-pad down) and the pop-up key's hold reels the leash"
```

---

### Task 8: Snapshot, status and prompts

**Files:**
- Modify: `src/wave/SurfZoneRunner.ts`, `src/scene/rig/riderVisualState.ts`, `src/ui/ridePrompt.ts`, `src/ui/strings.ts`
- Test: `src/wave/SurfZoneRunner.test.ts` (or the snapshot test file that already covers `RIDER_SNAPSHOT`), `src/ui/ridePrompt.test.ts`, `src/scene/rig/riderVisualState.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const RIDER_SNAPSHOT = { points: 0, phase: 21, cue: 22, present: 23, heading: 24, duck: 25, plug: 26, leash: 29, swim: 30, length: 31 } as const;
  /** RIDER_SNAPSHOT.leash bits: 1 worn and whole, 2 snapped, 4 reeling. RIDER_SNAPSHOT.swim bits: 1 stroking, 2 diving, 4 head under. */
  export const LEASH_BITS = { worn: 1, snapped: 2, reeling: 4 } as const;
  export const SWIM_BITS = { stroking: 1, diving: 2, under: 4 } as const;
  // SurfZoneStatus['ride'] gains:
  leash: { snapped: boolean; tension: number; distance: number; reeling: boolean };
  /** The duck-dive's press, 0–1. */
  duck: number;
  /** The fallen surfer's board is within the grab's reach. */
  boardInReach: boolean;
  /** The largest swimmer–board knock since the last snapshot, N·s (sound). */
  knock: number;
  // RiderVisualState gains: duck: number; leash: { plug: Vector3; snapped: boolean; reeling: boolean }; swim: { stroking: boolean; diving: boolean; under: boolean }
  ```
  `BoardRecovery` gains `inReach(board): boolean` (the grab's reach test without grabbing), used for `boardInReach`.
  Prompt strings: `'hud.prompt.fallen'` becomes "Wiped out — hold {popUp} to pull the leash and climb back on, or {retry} to paddle out"; new `'hud.prompt.inReach'`: "Press {popUp} to climb on"; `'hud.prompt.leashSnapped'`: "Leash snapped — swim to the board and press {popUp}, or {retry} for a new one".

- [ ] **Step 1: Write the failing tests**
- Snapshot: a runner with a rider, `session.separate()`, a step, then `snapshot()`: `rider[RIDER_SNAPSHOT.leash] & LEASH_BITS.worn` is set and the plug is within 0.3 m of the board's tail; after `session.leash.snapped = true` and a step, the snapped bit is set and `status.ride.leash.snapped` is true.
- `readRiderSnapshot` fills `duck`, `leash` and `swim` from those slots.
- `ridePrompt`: fallen with an intact leash and the board out of reach → the reel prompt; `boardInReach` → "Press … to climb on"; snapped → the snapped prompt.

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement** — fill the new slots in the runner's snapshot (`session.rider.duck.press`, `session.leashPlug`, the bits from `session.leash` and `session.surfer`), the status fields (knock = the largest `surfer.lastContacts.board.length()` over the batch's steps, reset each snapshot), `readRiderSnapshot`, `ridePrompt` (its `PromptKeys` is unchanged: the prompts use popUp and retry), and the strings. Grep for every other reader of `RIDER_SNAPSHOT.length` (`ownPose.ts`, dev tools) and check none assumes 25.

- [ ] **Step 4: Run** — `npx vitest run --dir src src/wave src/ui src/scene/rig src/net` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: the snapshot and HUD carry the leash, the duck-dive and the swimmer"`

---

### Task 9: Hints

**Files:**
- Modify: `src/game/hints.ts`, `src/ui/App.ts`, `src/ui/strings.ts`
- Test: `src/game/hints.test.ts`

**Interfaces:**
- Produces: `HintId` gains `'duckDive' | 'reel'`. `HintState` gains `phase: RiderPhase | undefined`, `whitewaterAhead: number` (distance to a broken crest coming at the rider, m; `Infinity` when none), `leashIntact: boolean`, `boardInReach: boolean`, and `input` gains `duckDive` and `reel`. Strings `'hint.duckDive': 'Hold {keys} to duck-dive under the whitewater'`, `'hint.reel': 'Hold {keys} to pull the leash in'`.

- [ ] **Step 1: Write the failing tests**

```ts
  it('offers the duck-dive when whitewater comes at a prone rider, and retires it once used', () => {
    const coach = new HintCoach(new HintBook());
    const prone = { standing: false, phase: 'prone' as const, crestBreaking: 0.8, whitewaterAhead: 6, leashIntact: true, boardInReach: false,
      input: { steer: 0, trim: 0, crouch: 0, hand: false, duckDive: 0, reel: false } };
    expect(coach.update(0.1, prone)).toBe('duckDive');
    for (let i = 0; i < 6; i += 1) coach.update(0.1, { ...prone, input: { ...prone.input, duckDive: 1 } });
    expect(coach.update(0.1, prone)).toBeUndefined();
  });

  it('offers the reel after a wipeout while the board is out of reach and the leash whole', () => {
    const coach = new HintCoach(new HintBook());
    const fallen = { standing: false, phase: 'fallen' as const, crestBreaking: 0, whitewaterAhead: Infinity, leashIntact: true, boardInReach: false,
      input: { steer: 0, trim: 0, crouch: 0, hand: false, duckDive: 0, reel: false } };
    expect(coach.update(0.1, fallen)).toBe('reel');
    expect(coach.update(0.1, { ...fallen, leashIntact: false })).toBeUndefined();
  });
```

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement** — in `HintCoach.update`, before the standing branch: prone with `whitewaterAhead ≤ DUCK_AHEAD` (8 m, about 3–4 body lengths: time to react before the 1–2 lengths the dive wants) → `'duckDive'`; fallen, leash whole and board out of reach → `'reel'`. Learned when held for `LEARNED_AFTER` (duck ≥ 0.5 lying down, reel held while fallen). Add both to `HINT_IDS` so the book keeps them. In `App.ts`, feed the new state from `this.game.rideStatus` (whitewaterAhead from `wave.valid && wave.crestBreaking > 0.3 && wave.aheadOfCrest > 0 ? wave.aheadOfCrest : Infinity`; check `aheadOfCrest`'s sign in `waveFrame.ts` first) and `hintText` gets the two ids (the keys from `bindings.keyboard.duckDive` / `popUp`, pad labels likewise; touch returns '' for both — touch has no duck-dive, per the milestone spec's touch subset).

- [ ] **Step 4: Run** — `npx vitest run --dir src src/game/hints.test.ts src/ui` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: one-time hints for the duck-dive and pulling the leash"`

---

### Task 10: Looks — duck-dive and swim poses, the leash cord, online

**Files:**
- Modify: `src/scene/rig/HumanoidRig.ts`, `src/scene/character/SurferView.ts` (or wherever the own surfer's view is updated each frame), `src/scene/RemoteSurferViews.ts`, `src/net/poseCodec.ts`, `src/net/ownPose.ts`
- Create: `src/scene/board/LeashCord.ts`, `src/scene/board/LeashCord.test.ts`
- Test: `src/scene/rig/HumanoidRig.test.ts`, `src/net/poseCodec.test.ts`

**Interfaces:**
- Consumes: `RiderVisualState.duck`, `.leash`, `.swim` (Task 8).
- Produces: `class LeashCord { readonly object: Object3D; update(ankle: Vector3, plug: Vector3, state: { snapped: boolean; reeling: boolean; hand?: Vector3 }): void }` — a thin tube (radius 3.5 mm, 12 segments) that sags as a parabola of depth `√(L² − d²)/2` when the ends are closer than L = 1.83 m, straight when taut; snapped, a 0.3 m stub hanging from the plug. `SurferPose` gains `leashSnapped`, `ducking` and `diving` (flags bits 8, 16, 32; older clients ignore unknown bits).

- [ ] **Step 1: Write the failing tests**
- `LeashCord`: its midpoint sits below the straight line by about `√(L² − d²)/2` when slack; lies on the line when `d ≥ L`; snapped, its far end is within 0.35 m of the plug.
- `HumanoidRig`: with `phase: 'prone'` and `duck: 1`, the elbows are straight (shoulder–wrist distance ≥ 0.95 × arm length) and the head faces down the board (facing · world up < 0); with `phase: 'fallen'` and `swim.stroking`, the hands move between two solves 0.25 s apart (the crawl cycle); `swim.diving` pitches the facing below level.
- `poseCodec`: encode/decode round-trips the three new flags; a decoder given a flags byte with bit 64 set ignores it.

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement** — `RIG_DETAIL` gains the duck's head-down pitch and the crawl's cycle (1 Hz, alternating arms) and flutter kick (2 Hz, 0.15 m), all code-driven detail on the physics points (the G7 spec's "code-driven detail"); the leash cord follows the own surfer's view (ankle = the back foot's point, plug = snapshot plug, hand = the leading hand while reeling) and each remote surfer's (ankle and plug from its points and board pose, snapped from the flag). `ownPose.write` sets the flags from the snapshot.

- [ ] **Step 4: Run** — `npx vitest run --dir src src/scene src/net` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: draw the duck-dive, the swim stroke and dive, and the leash cord, for everyone online"`

---

### Task 11: Sounds

**Files:**
- Modify: `src/audio/soundMapping.ts`, `src/audio/synth.ts`, `src/audio/soundManifest.ts` (whichever lists the one-shot recipes), the caller that builds `SoundFrame` (grep `SoundFrame`)
- Test: `src/audio/soundMapping.test.ts`, `src/audio/synth.test.ts`

**Interfaces:**
- Produces: `OneShotId` gains `'leashSnap' | 'knock' | 'duckDive'`; `SoundFrame.ride` gains `duck`, `previousDuck`, `leashSnapped`, `previouslySnapped`, `knock`.

- [ ] **Step 1: Write the failing tests** — a frame whose leash goes from whole to snapped plays one `leashSnap`; a knock over `KNOCK_MIN` (8 N·s, provisional, by ear) plays `knock` with gain rising with the impulse and none under it; the duck crossing 0.5 upward plays one `duckDive`; each has a synth recipe (the synth test lists every `OneShotId` has one).

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement** — the mapping rules above (each a physical cause, S1's rule), `MIN_INTERVAL` entries (snap 0, knock 0.15, duckDive 0.5), and three synth recipes in S1's style: the snap a short high crack with a rubbery twang; the knock a dull low thud; the plunge a gulping splash lower than the fall's.

- [ ] **Step 4: Run** — `npx vitest run --dir src src/audio` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: sounds for the leash snapping, the board knocking and the duck-dive"`

---

### Task 12: The Surf School's Duck-dive lesson

**Files:**
- Modify: `src/game/school/lessons.ts`, `src/game/school/lessonWave.ts`, `src/game/school/lessonFlow.ts`, `src/game/school/SchoolSession.ts` (where a start's placement is chosen), `src/ui/strings.ts`, and the lesson list model (`src/ui/schoolModel.ts`)
- Test: `src/game/school/lessonGoals.test.ts`, `src/game/school/lessonWave.test.ts`, `src/ui/schoolModel.test.ts`

**Interfaces:**
- Produces: `LessonId` gains `'duckDive'`; `LessonStart` gains `'inside'`, which restores the `'waiting'` recorded sea and places the rider prone, heading seaward, at `LessonWave.inside` (a new `RiderPlacement` on the recorded wave, chosen in Step 1); `LessonFrame` gains `x`, `z` (m) and `seaward: { x: number; z: number }` (unit vector toward the sea); `DuckDiveGoal`.

- [ ] **Step 1: Choose the inside placement** — with the stage 2 recording's `'waiting'` sea (`loadLessonSea` needs a fetch; in node read the file under `public/` directly), run the surf zone headless and find, along the recorded rider's line, the point where the wave's broken front passes 5–7 s after the start with a 1–1.5 m face behind it. Put it in `LESSON_WAVES` as `inside` with a comment giving the measured arrival time and bore height. (A throwaway script in the scratchpad is fine; the numbers go in the comment.)

- [ ] **Step 2: Write the failing tests**

```ts
  it('passes the duck-dive lesson when the rider comes up behind the whitewater, still on, pushed back at most 3 m', () => {
    const goal = lessonById('duckDive').goal();
    const frame = (z: number, ahead: number, phase: 'prone' | 'fallen' = 'prone') => ({
      dt: 0.1, phase, speed: 1, heading: Math.PI, x: 0, z, seaward: { x: 0, z: -1 },
      input: { steer: 0, trim: 0, crouch: 0, hand: false, paddle: true },
      wave: { valid: true, faceFraction: 0, crestBreaking: 0.8, aheadOfCrest: ahead },
    });
    goal.update(frame(0, 6));
    goal.update(frame(1, 0.5));
    const state = goal.update(frame(2, -2));
    expect(state.passed).toBe(true);
  });

  it('does not pass if the rider was carried more than 3 m', () => {
    const goal = lessonById('duckDive').goal();
    goal.update(frame(0, 6));
    goal.update(frame(5, 0.5));
    expect(goal.update(frame(6, -2)).passed).toBe(false);
  });

  it('does not pass if the rider fell off during the passage', () => {
    const goal = lessonById('duckDive').goal();
    goal.update(frame(0, 6));
    goal.update(frame(1, 0.5, 'fallen'));
    expect(goal.update(frame(2, -2)).passed).toBe(false);
  });
```

(Hoist `frame` out of the first test to the `describe` scope so all three share it.) Also: `schoolModel` lists the new lesson, and `lessonWave.test` checks `inside` sits shoreward of the `waiting` placement.

- [ ] **Step 3: Run to verify they fail.**

- [ ] **Step 4: Implement** — `DuckDiveGoal`: arms when `aheadOfCrest > 0` with `crestBreaking ≥ 0.3` (broken water coming), records the rider's seaward coordinate then; passes when `aheadOfCrest < 0` (the crest is behind) while the rider stayed on (never `'fallen'`) and the shoreward loss since arming is ≤ `DUCK_PUSHED = 3` m; a fall or a loss past 3 m misses (`lessonFlow`'s miss path, with a reason string `'lesson.duckDive.pushed'`: "Pushed back too far — dive a little earlier"). The lesson: `{ id: 'duckDive', start: 'inside', view: <the lessons' prone view>, actions: ['paddle', 'duckDive'], goal, hint: 'duckDive' }`, its title and card strings, and `LessonFrame`'s new fields filled where frames are built.

- [ ] **Step 5: Run** — `npx vitest run --dir src src/game/school src/ui` → PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat: a Surf School lesson for the duck-dive"`

---

### Task 13: Finish — docs, full suite, play check, PR

**Files:**
- Modify: `ROADMAP.md`, `docs/superpowers/specs/2026-09-27-wipeout-and-duck-dive.md` (status line)

- [ ] **Step 1:** `ROADMAP.md`: under P11, a line for this slice (Part A done, with the report's verdicts; Part B next).
- [ ] **Step 2:** Full suite: `npx vitest run --dir src` → all green (1,102 + the new tests). `npx tsc -b` → no errors.
- [ ] **Step 3:** Browser check (run vite as a background task on a free port, per the worktree memory; the pane must be shown for live play): wipe out, watch the leash cord hold the board, hold Enter to reel and climb on; duck-dive under a whitewater at the Canyon; snap the leash in big surf (Wave Lab, big swell) and see the prompt; take the Duck-dive lesson. Screenshot each.
- [ ] **Step 4:** Commit, push, open the PR (base `main`) with the report's verdicts and the screenshots; leave the merge to the user.

```bash
git add ROADMAP.md docs/superpowers/specs/2026-09-27-wipeout-and-duck-dive.md
git commit -m "docs: wipeout and duck-dive Part A on the roadmap"
git push -u origin claude/wipeout-duck-dive
gh pr create --base main --title "Wipeout and duck-dive, Part A: leash, swim back, duck-dive" --body-file <scratchpad body>
```

---

## Part B (planned after Part A's playtest)

Aeration (G9's `AerationField` void fraction sampled by bodies: buoyancy × (1 − void)), the turbulence field, breath, the muffled sound and darkened edges, the breath meter, and "Held down too long". Planned in its own document once Part A is played.
