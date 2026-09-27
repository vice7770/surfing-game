import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BoardRecovery } from './BoardRecovery';
import { DetachedSurfer, type BoardContactBody, type BodyWaterField } from './DetachedSurfer';
import { PlaneWater } from './PlaneWater';
import { RideSession } from './RideSession';

class ContactBoard implements BoardContactBody {
  readonly position = new Vector3();
  readonly orientation = new Quaternion();
  readonly halfExtents = new Vector3(0.55, 0.05, 1.1);
  readonly velocity = new Vector3();
  readonly angularVelocity = new Vector3();

  constructor(readonly inverseMass = 1 / 3) {}

  velocityAt(worldPoint: Readonly<Vector3>, out: Vector3): Vector3 {
    return out.copy(this.angularVelocity).cross(
      new Vector3().subVectors(worldPoint, this.position),
    ).add(this.velocity);
  }

  inverseEffectiveMass(): number { return this.inverseMass; }

  applyImpulse(impulse: Readonly<Vector3>, _worldPoint: Readonly<Vector3>): void {
    this.velocity.addScaledVector(impulse, this.inverseMass);
  }
}

const calmWater: BodyWaterField = {
  sampleAt(_position, out): void {
    out.surfaceY = 1;
    out.bedY = -10;
    out.flow.set(0, 0, 0);
    out.wet = true;
    out.outsideDomain = false;
    out.breaking = 0;
  },
};

function swimmer(x = 0): DetachedSurfer {
  const body = new DetachedSurfer();
  body.start({ center: new Vector3(x, 0.3, 0), orientation: new Quaternion(),
    velocity: new Vector3(), angularVelocity: new Vector3() });
  for (let frame = 0; frame < 75; frame += 1) body.step(1 / 60, calmWater);
  return body;
}

describe('BoardRecovery', () => {
  it('rejects a distant board without pulling it toward the swimmer', () => {
    const body = swimmer(8);
    const board = new ContactBoard();
    const recovery = new BoardRecovery(body);

    expect(recovery.tryGrab(board)).toBe(false);
    expect(recovery.step(1 / 60, board)).toBe('free');
    expect(board.position.toArray()).toEqual([0, 0, 0]);
    expect(board.velocity.length()).toBe(0);
  });

  it('starts a nearby grab through equal and opposite impulses without moving positions', () => {
    const body = swimmer();
    const board = new ContactBoard();
    const recovery = new BoardRecovery(body);
    const beforePositions = body.nodes.map((node) => node.position.clone());
    const beforeMomentum = body.linearMomentum().addScaledVector(board.velocity, 1 / board.inverseMass);

    expect(recovery.tryGrab(board)).toBe(true);
    expect(recovery.step(1 / 60, board)).toBe('holding');
    const afterMomentum = body.linearMomentum().addScaledVector(board.velocity, 1 / board.inverseMass);
    expect(afterMomentum.distanceTo(beforeMomentum)).toBeLessThan(1e-8);
    expect(body.nodes.every((node, index) => node.position.equals(beforePositions[index]))).toBe(true);
    expect(board.position.toArray()).toEqual([0, 0, 0]);
  });

  it('breaks the grab if the board moves beyond reach', () => {
    const body = swimmer();
    const board = new ContactBoard();
    const recovery = new BoardRecovery(body);
    expect(recovery.tryGrab(board)).toBe(true);
    board.position.x = 10;

    expect(recovery.step(1 / 60, board)).toBe('free');
    expect(board.velocity.length()).toBe(0);
  });

  it('can draw a reachable swimmer into prone contact without a position jump', () => {
    const body = swimmer();
    const board = new ContactBoard(0);
    const recovery = new BoardRecovery(body);
    expect(recovery.tryGrab(board)).toBe(true);
    let ready = false;
    for (let frame = 0; frame < 240; frame += 1) {
      body.step(1 / 60, calmWater);
      ready = recovery.step(1 / 60, board) === 'prone-ready';
      if (ready) break;
    }
    expect(ready).toBe(true);
  });
});

/**
 * A fallen surfer floating calm on flat water with its board 0.5 m to its side:
 * the board turned to `boardHeading` (and upside down if asked), the swimmer
 * facing `swimmerHeading` (radians from +z toward +x).
 */
function swimmerBesideBoard(options: { boardHeading: number; swimmerHeading: number; upsideDown?: boolean }) {
  const session = new RideSession();
  const water = new PlaneWater();
  session.reset(new Vector3(0, 0, 0), 0, water);
  session.separate('balance');
  for (let i = 0; i < 180; i += 1) session.step(1 / 60, water, { paddle: false, popUp: false, steer: 0 });
  const torso = session.surfer.getPartPosition('torso', new Vector3());
  const orientation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), options.boardHeading);
  if (options.upsideDown) orientation.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI));
  session.board.place(new Vector3(torso.x + 0.5, session.board.shape.centerOfMass.y - 0.03, torso.z), orientation);
  session.surfer.heading = options.swimmerHeading;
  return { session, water };
}

const idle = { paddle: false, popUp: false, steer: 0 };

describe('grabbing the board from any side', () => {
  it('grabs a board pointing the other way, turns it and climbs on', () => {
    const { session, water } = swimmerBesideBoard({ boardHeading: Math.PI, swimmerHeading: 0 });
    session.step(1 / 60, water, { ...idle, popUp: true });
    for (let steps = 0; steps < 300 && !session.rider.attached; steps += 1) session.step(1 / 60, water, idle);
    expect(session.rider.attached).toBe(true);
    const forward = new Vector3(0, 0, 1).applyQuaternion(session.board.orientation);
    expect(Math.abs(Math.atan2(forward.x, forward.z))).toBeLessThan((30 * Math.PI) / 180);
  });

  it('rights an upside-down board before climbing on', () => {
    const { session, water } = swimmerBesideBoard({ boardHeading: 0, swimmerHeading: 0, upsideDown: true });
    session.step(1 / 60, water, { ...idle, popUp: true });
    for (let steps = 0; steps < 360 && !session.rider.attached; steps += 1) session.step(1 / 60, water, idle);
    expect(session.rider.attached).toBe(true);
    expect(new Vector3(0, 1, 0).applyQuaternion(session.board.orientation).y).toBeGreaterThan(0.7);
    // Lying on it, the rider's balance levels the board.
    for (let steps = 0; steps < 60; steps += 1) session.step(1 / 60, water, idle);
    expect(session.rider.attached).toBe(true);
    expect(new Vector3(0, 1, 0).applyQuaternion(session.board.orientation).y).toBeGreaterThan(0.9);
  });

  it('twists the board with the hands: the swimmer takes the opposite turn', () => {
    const turn = (grab: boolean) => {
      const { session, water } = swimmerBesideBoard({ boardHeading: Math.PI / 2, swimmerHeading: 0 });
      session.step(1 / 60, water, { ...idle, popUp: grab });
      const before = session.surfer.angularMomentum().y;
      session.step(1 / 60, water, idle);
      return { swimmer: session.surfer.angularMomentum().y - before, board: session.board.angularVelocity.y };
    };
    const grabbed = turn(true);
    const alone = turn(false);
    expect(Math.abs(grabbed.board)).toBeGreaterThan(Math.abs(alone.board) + 1e-3);
    expect(Math.sign(grabbed.swimmer - alone.swimmer)).toBe(-Math.sign(grabbed.board - alone.board));
  });
});
