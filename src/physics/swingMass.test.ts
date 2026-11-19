import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import { RideSession } from './RideSession';
import { RIDER_PARTS, postureCenter, riderPartMasses, riderPose } from './riderPosture';

const STEP = 1 / 60;

/**
 * **Step 3.5j, `?swing=mass`: the lateral swing moves the body's mass.**
 *
 * The owner's ruling of 2026-11-19: *"The turn should not be limited, the turn is good, the fall is a result of the
 * inbuilt balance that lack the ability to stand."* The ability he names is a **sustained lateral weight shift** — the
 * advisor's `L·tan(tilt)`, the hips over the rail — and the shipped swing rotor cannot give one. Its angle moved the
 * **drawing** (`AttachedRider.swung`, at `SWING_DRAWN_CHEST` = 0.35 of it) and exerted a **torque** whose reaction is
 * already paired and booked (`rhs[7] -= h·swingTorque/length`, `rhs[3..5] -= h·swingTorque·rollAxis`), and **nothing
 * displaced any mass sideways**: `localCenter` is `postureCenter(this.parts, …)` taken after the parts receive only
 * `balance + lean + armsGive` and after `foldTrunk()`, which is the nose-ward fold. So the rotor pushed the body one
 * way with no mass going the other — a torque with half of its pair's geometry missing.
 *
 * The switch supplies that half, as the lateral twin of `?trunk=mass`: the same parts (torso, head, both arms), the
 * same pivot (the physical pelvis), the other axis. **Geometry, not force** — no torque, no drive, no constant, and
 * `postureRate` deliberately left at 0, because feeding the fold's own centre-of-mass motion to `this.drive` would be
 * a hidden kinematic motor. No command law changes, so the ankle's reach, rest, spring, damper and its large command
 * reversals are untouched.
 *
 * These tests are the code's own checks: the arithmetic of the fold against the standing posture, the sign that makes
 * it the missing half of a pair rather than a second copy of it, the inertness of the default, and the drawing no
 * longer saying the lean twice. **What they cannot do is say whether the turn survives** — that is the A/B on the
 * solver bench, and nothing here is evidence for it.
 */

/** The standing posture's rotor lever about the pelvis, `Σ m·Δy` in kg·m, and the body's total mass. */
function rotorLever(): { lever: number; mass: number; offsetPerSine: number } {
  const board = new BoardBody();
  const pose = riderPose(board.shape, 'standing', 'regular');
  const masses = riderPartMasses();
  const pivotY = pose.parts[1];
  let lever = 0;
  let mass = 0;
  for (let i = 0; i < RIDER_PARTS.length; i += 1) {
    mass += masses[i];
    // The rotor is the trunk, the head and the arms: the legs stand on the deck and the pelvis is the pivot.
    if (i === 0 || RIDER_PARTS[i] === 'leftLeg' || RIDER_PARTS[i] === 'rightLeg') continue;
    lever += masses[i] * (pose.parts[i * 3 + 1] - pivotY);
  }
  return { lever, mass, offsetPerSine: lever / mass };
}

/**
 * The standing posture with its rotor parts turned about the pelvis by `angle` rad about the board frame's +z, which
 * is the rotation `foldSwing` performs, and the posture centre that comes out of it.
 */
function foldedCentre(angle: number): { x: number; y: number; z: number } {
  const board = new BoardBody();
  const pose = riderPose(board.shape, 'standing', 'regular');
  const parts = Float64Array.from(pose.parts);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const pivotX = parts[0];
  const pivotY = parts[1];
  for (let i = 1; i < RIDER_PARTS.length; i += 1) {
    if (RIDER_PARTS[i] === 'leftLeg' || RIDER_PARTS[i] === 'rightLeg') continue;
    const x = parts[i * 3] - pivotX;
    const y = parts[i * 3 + 1] - pivotY;
    parts[i * 3] = pivotX + x * cos - y * sin;
    parts[i * 3 + 1] = pivotY + x * sin + y * cos;
  }
  return postureCenter(parts, riderPartMasses());
}

interface Peek {
  swing: { angle: number; rate: number };
  swingTorque: number;
  localCenter: Vector3;
  parts: Float64Array;
  partMasses: number[];
}

/** A new-rider pair standing on flat water at `speed` down +z, stepped `seconds` with the stick hard over from frame 13. */
function carve(seconds: number, swing?: 'mass', rider: 'new' | 'old' = 'new') {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 8));
  const made = new AttachedRider(board.shape, {
    phase: 'standing', feltFrame: 'deck', stanceReach: 'keep', deepen: 'on',
    ...(rider === 'new' ? { rider, riderBody: 'two' as const } : {}),
    ...(swing ? { swing } : {}),
  });
  board.attach(made);
  const water = new PlaneWater();
  const peek = made as unknown as Peek;
  const folds: number[] = [];
  const angles: number[] = [];
  const torques: number[] = [];
  const centresX: number[] = [];
  const centresY: number[] = [];
  for (let n = 0; n < Math.round(seconds / STEP) && made.attached; n += 1) {
    made.steer = n > 12 ? 1 : 0;
    board.step(STEP, water);
    folds.push(made.swingFold);
    angles.push(peek.swing.angle);
    torques.push(peek.swingTorque);
    centresX.push(peek.localCenter.x);
    centresY.push(peek.localCenter.y);
  }
  return { folds, angles, torques, centresX, centresY, rider: made, peek };
}

describe('step 3.5j: the lateral swing in the mass model (opt-in, `swing: \'mass\'`)', () => {
  it('sizes the rotor against the standing posture, so the 0.1563 m per unit sine is the posture\'s and not a constant', () => {
    const { lever, mass, offsetPerSine } = rotorLever();
    // Torso 23 kg at +0.27 m above the pelvis, head 5 at +0.60, arms 2 x 5 at about +0.22 - "about", because the arms
    // sit 0.45 m fore and aft of the trunk and the posture's heights are off the DECK, so the rocker under them counts.
    // Hand arithmetic on the nominal heights gives 11.41 kg.m; the posture's own answer is 11.459.
    expect(lever).toBeCloseTo(11.4594, 4);
    expect(mass).toBeCloseTo(73, 6);
    expect(offsetPerSine).toBeCloseTo(0.15698, 5);
    // 38 of the 73 kg is in the rotor: over half the body moves when the hip swings.
    const masses = riderPartMasses();
    expect(masses[1] + masses[2] + masses[3] + masses[4]).toBeCloseTo(38, 6);
  });

  it('moves the centre of mass across by `-0.1563 sin(angle)` m and drops it by `0.1563 (1 - cos)`', () => {
    const { offsetPerSine } = rotorLever();
    const level = foldedCentre(0);
    for (const angle of [0.1, 0.3, 0.6, 1.2]) {
      const folded = foldedCentre(angle);
      expect(folded.x - level.x).toBeCloseTo(-offsetPerSine * Math.sin(angle), 9);
      expect(folded.y - level.y).toBeCloseTo(-offsetPerSine * (1 - Math.cos(angle)), 9);
      // Nothing along: the rotation is in the x-y plane of the parts' own frame.
      expect(folded.z - level.z).toBeCloseTo(0, 12);
    }
    // The two figures the design is sold on, at 30 degrees and at the 1.2 rad hip range, against a 0.130 m sole.
    expect(Math.abs(foldedCentre(Math.PI / 6).x - level.x)).toBeCloseTo(0.07849, 4);
    expect(Math.abs(foldedCentre(1.2).x - level.x)).toBeCloseTo(0.14630, 4);
  });

  it('throws the trunk the OPPOSITE way to the body, which is what makes it the missing half of a pair', () => {
    // `humanSwingStep` writes `swing.rate -= h*swingTorque/I`, so a POSITIVE `swingTorque` drives the angle NEGATIVE;
    // and the same positive torque subtracts from `rhs[7]`, pushing the body's centre of mass toward -x. So for the
    // fold to be the other half of that pair, a NEGATIVE angle must throw the trunk's mass toward +x.
    const level = foldedCentre(0);
    expect(foldedCentre(-0.3).x - level.x).toBeGreaterThan(0);
    expect(foldedCentre(0.3).x - level.x).toBeLessThan(0);
    // And the pelvis and both legs are never moved: one pivot, and the posture's translation keeps its single owner.
    const board = new BoardBody();
    const pose = riderPose(board.shape, 'standing', 'regular');
    const parts = Float64Array.from(pose.parts);
    const made = new AttachedRider(board.shape, { phase: 'standing', rider: 'new', riderBody: 'two', swing: 'mass' });
    const peek = made as unknown as Peek;
    for (const i of [0, 5, 6]) {
      expect(peek.parts[i * 3]).toBeCloseTo(parts[i * 3], 12);
      expect(peek.parts[i * 3 + 1]).toBeCloseTo(parts[i * 3 + 1], 12);
    }
  });

  it('is INERT by default: the rotor turns and the mass model never hears it', () => {
    const off = carve(2);
    expect(off.folds.length).toBeGreaterThan(60);
    // The rotor really is turning on the shipped rider — the round is about this torque, so the test asserts it.
    expect(Math.max(...off.torques.map(Math.abs))).toBeGreaterThan(1);
    expect(Math.max(...off.angles.map(Math.abs))).toBeGreaterThan(1e-4);
    // And not one frame of it reaches the posture.
    for (const fold of off.folds) expect(fold).toBe(0);
  });

  it('with the switch on, the fold IS the rotor\'s own angle and nothing else', () => {
    const on = carve(2, 'mass');
    expect(on.folds.length).toBeGreaterThan(30);
    // `swingFold` is read where the posture is built and `swing.angle` after the whole frame, so they are the same
    // quantity a few substeps apart: the test asserts the identity it can - the fold is zero exactly when the rotor
    // is, carries its sign, and never exceeds the angle the frame ended on by more than the frame's own travel.
    for (let i = 0; i < on.folds.length; i += 1) {
      if (on.angles[i] === 0) expect(on.folds[i]).toBe(0);
      if (Math.abs(on.folds[i]) > 1e-6) expect(Math.sign(on.folds[i])).toBe(Math.sign(on.angles[i]));
      expect(Math.abs(on.folds[i] - on.angles[i])).toBeLessThan(0.02);
    }
    expect(Math.max(...on.folds.map(Math.abs))).toBeGreaterThan(1e-4);
  });

  it('and the centre of mass really does go sideways, where off the switch it cannot', () => {
    const off = carve(2);
    const on = carve(2, 'mass');
    const spread = (xs: number[]) => Math.max(...xs.map(Math.abs));
    // Off the switch the posture centre stays on the stringer to within the balance's own shift; on, it leaves it by
    // the fold. The bound is read off this test's own output, not off a clip.
    expect(spread(on.centresX)).toBeGreaterThan(spread(off.centresX) + 0.005);
    // The sign of the offset follows the rotor's angle, frame by frame, because it is that angle's geometry.
    for (let i = 0; i < on.folds.length; i += 1) {
      if (Math.abs(on.folds[i]) > 1e-3) expect(Math.sign(on.centresX[i] - off.centresX[Math.min(i, off.centresX.length - 1)])).toBe(-Math.sign(on.folds[i]));
    }
  });

  it('does nothing without the new surfer, because there is no swing rotor\'s mass anywhere else', () => {
    const old = carve(1.5, 'mass', 'old');
    for (const fold of old.folds) expect(fold).toBe(0);
  });

  it('stops the drawing saying the lean twice: the drawn trunk becomes the physics\' own', () => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 8));
    const on = new AttachedRider(board.shape, { phase: 'standing', rider: 'new', riderBody: 'two', feltFrame: 'deck', stanceReach: 'keep', deepen: 'on', swing: 'mass' });
    board.attach(on);
    const water = new PlaneWater();
    const peek = on as unknown as Peek;
    let checked = 0;
    for (let n = 0; n < 120 && on.attached; n += 1) {
      on.steer = n > 12 ? 1 : 0;
      board.step(STEP, water);
      if (Math.abs(peek.swing.angle) <= 1e-3) continue;
      checked += 1;
      // `swung` stands down, so the trunk's drawn point is exactly its physical part centre.
      for (const index of [1, 2]) {
        const drawn = on.renderPoint(index, board, new Vector3());
        const part = on.partPosition(index, new Vector3());
        expect(drawn.distanceTo(part)).toBeLessThan(1e-9);
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('off the switch the drawn trunk still carries its own 0.35 share, so the stand-down is what changed', () => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 8));
    const off = new AttachedRider(board.shape, { phase: 'standing', rider: 'new', riderBody: 'two', feltFrame: 'deck', stanceReach: 'keep', deepen: 'on' });
    board.attach(off);
    const water = new PlaneWater();
    const peek = off as unknown as Peek;
    let apart = 0;
    for (let n = 0; n < 120 && off.attached; n += 1) {
      off.steer = n > 12 ? 1 : 0;
      board.step(STEP, water);
      if (Math.abs(peek.swing.angle) <= 1e-3) continue;
      const drawn = off.renderPoint(2, board, new Vector3());
      const part = off.partPosition(2, new Vector3());
      if (drawn.distanceTo(part) > 1e-6) apart += 1;
    }
    expect(apart).toBeGreaterThan(10);
  });

  it('turns the mass about the very axis the reaction is booked on, at any pitch and bank', () => {
    // The objection this answers: `bodyFrame` is `heading x Rx(framePitch) x Rz(-bank)` while the rotor's reaction is
    // booked on `rollAxis`, the HEADING's -z. Those are one line only on a level-pitch rider - at 20 degrees of pitch
    // they are (0, -0.342, 0.940) against (0, 0, 1) - and a climb is exactly where a bottom turn ends. So the fold
    // turns about `rollAxis`'s own image in the parts' frame, and this is the check of that, not a note about it.
    // Written as the formula's own identity, with no clock in it, so it is exact rather than within a frame's lag.
    const axisFor = (pitch: number, bank: number) => new Vector3(-Math.sin(pitch) * Math.sin(bank), Math.sin(pitch) * Math.cos(bank), Math.cos(pitch));
    for (const yaw of [0, 0.7, -2.4]) {
      for (const pitch of [0, 0.1, -0.35, 0.6]) {
        for (const bank of [0, 0.3, -0.9]) {
          const heading = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
          const bodyFrame = heading.clone()
            .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), pitch))
            .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -bank));
          const rollAxis = new Vector3(0, 0, -1).applyQuaternion(heading);
          const axis = axisFor(pitch, bank);
          expect(axis.length()).toBeCloseTo(1, 14);
          const world = axis.clone().applyQuaternion(bodyFrame);
          expect(world.x).toBeCloseTo(-rollAxis.x, 12);
          expect(world.y).toBeCloseTo(-rollAxis.y, 12);
          expect(world.z).toBeCloseTo(-rollAxis.z, 12);
        }
      }
    }
    // And at zero pitch it is local +z for every bank, so the simple case is not approximated anywhere.
    for (const bank of [0, 0.4, -1.1]) expect(axisFor(0, bank).distanceTo(new Vector3(0, 0, 1))).toBeCloseTo(0, 14);
    // At 20 degrees of pitch it is NOT local +z, which is the whole reason the correction exists.
    expect(axisFor(20 / (180 / Math.PI), 0).distanceTo(new Vector3(0, 0, 1))).toBeGreaterThan(0.3);
  });

  it('publishes the axis it actually used, as a unit vector that lands on the booked line', () => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 8));
    const made = new AttachedRider(board.shape, { phase: 'standing', rider: 'new', riderBody: 'two', feltFrame: 'deck', stanceReach: 'keep', deepen: 'on', swing: 'mass' });
    board.attach(made);
    const water = new PlaneWater();
    const peek = made as unknown as Peek & { bodyFrame: Quaternion; rollAxis: Vector3 };
    let checked = 0;
    let worst = 0;
    for (let n = 0; n < 150 && made.attached; n += 1) {
      made.steer = n > 12 ? 1 : 0;
      board.step(STEP, water);
      if (made.swingFold === 0) continue;
      checked += 1;
      expect(made.swingFoldAxis.length()).toBeCloseTo(1, 12);
      const world = made.swingFoldAxis.clone().applyQuaternion(peek.bodyFrame);
      worst = Math.max(worst, world.distanceTo(peek.rollAxis.clone().negate()));
    }
    expect(checked).toBeGreaterThan(20);
    // Not exact, and the reason is stated rather than hidden: `updatePosture` runs one line before `frame(board)`, so
    // the pitch and bank the axis was built from are the PREVIOUS call's - one frame of lag, the same lag `foldTrunk`
    // already lives with. The formula itself is exact (the test above); this bounds what the lag costs.
    expect(worst).toBeLessThan(5e-3);
  });

  it('reaches the rider through a real `RideSession`, not only through a hand-built fixture', () => {
    // The trap this closes, and it has bitten this project twice: the URL parses, `SurfZoneRunner` forwards it, and
    // the hop in `RideSession`'s own `AttachedRider` options drops it - so every fixture test passes while the switch
    // does nothing in the game. `?bodyBank=hip` was parsed 0 times on main while a ride was being attributed to it.
    // No clock: a held 20 degrees of swing, the posture rebuilt, and the centre read. Two creation paths, one answer.
    const held = 20 / (180 / Math.PI);
    const shift = (through: 'session' | 'direct', swing?: 'mass') => {
      const options = { rider: 'new' as const, riderBody: 'two' as const, feltFrame: 'deck' as const, stanceReach: 'keep' as const, deepen: 'on' as const, ...(swing ? { swing } : {}) };
      const rider = through === 'session'
        ? new RideSession(options).rider
        : new AttachedRider(new BoardBody().shape, { phase: 'standing', ...options });
      rider.phase = 'standing';
      const peek = rider as unknown as Peek & { base: Vector3; updatePosture: () => void };
      peek.swing.angle = held;
      peek.updatePosture();
      return peek.localCenter.x - peek.base.x;
    };
    // Enabled: the same mass movement whichever way the rider was made. Off: nothing, either way.
    expect(shift('session', 'mass')).toBeCloseTo(shift('direct', 'mass'), 12);
    expect(Math.abs(shift('session', 'mass'))).toBeGreaterThan(0.04);
    expect(shift('session')).toBe(0);
    expect(shift('direct')).toBe(0);
    // And the figure itself, which is `-0.15698 sin(20 deg)` to the digit.
    expect(shift('session', 'mass')).toBeCloseTo(-0.15698 * Math.sin(held), 4);
  });

  it('is reached by the one option value and nothing else', () => {
    const board = new BoardBody();
    const made = (swing?: unknown) => new AttachedRider(board.shape, { phase: 'standing', rider: 'new', riderBody: 'two', ...(swing === undefined ? {} : { swing }) } as ConstructorParameters<typeof AttachedRider>[1]);
    const folds = (value: unknown) => (made(value) as unknown as { swingMass: boolean }).swingMass;
    expect(folds('mass')).toBe(true);
    for (const value of [undefined, 'on', 'Mass', 'MASS', '', 'across', 1, true, null]) expect(folds(value)).toBe(false);
  });
});
