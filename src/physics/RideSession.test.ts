import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { LipContactParcel, LipParcelSource } from './DetachedSurfer';
import { PlaneWater } from './PlaneWater';
import { RideSession, type RideInput } from './RideSession';
import { SwellWater } from './SwellWater';
import { createWaterSample } from './SurfWater';

const STEP = 1 / 60;
const idle = { paddle: false, popUp: false, steer: 0 };

describe('ride session', () => {
  it('rides the same with or without the standing inputs left at rest', () => {
    const ride = (input: typeof idle & { trim?: number; crouch?: number; hand?: boolean }) => {
      const session = new RideSession();
      const water = new SwellWater({ height: 1, period: 9, depth: 5 });
      session.reset(new Vector3(0, 0, 0), 0, water);
      for (let i = 0; i < 300; i += 1) {
        session.step(STEP, water, { ...input, paddle: i < 240, popUp: i === 200 });
        water.advance(STEP);
      }
      return session.board.position.clone();
    };
    const plain = ride(idle);
    const explicit = ride({ ...idle, trim: 0, crouch: 0, hand: false });
    expect(explicit.distanceTo(plain)).toBe(0);
  });

  // The playtest: the pop-up key toggles, lying down only when the player asks.
  it('lies the standing rider back down on the pop-up key', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(0, 0, 0), 0, water);
    session.rider.phase = 'standing';
    session.board.attach(session.rider);
    const tow = () => {
      session.board.velocity.z = 6;
      session.rider.velocity.z = 6;
    };
    for (let i = 0; i < 30; i += 1) {
      tow();
      session.step(STEP, water, idle);
    }
    tow();
    session.step(STEP, water, { ...idle, popUp: true });
    for (let i = 0; i < 60; i += 1) {
      tow();
      session.step(STEP, water, idle);
    }
    expect(session.rider.attached).toBe(true);
    expect(session.rider.phase).toBe('prone');
  });

  // L2: a lesson places the rider on the wave, standing or lying, moving with the water plus a speed along its heading.
  it('places the rider standing on the face, moving with the water and along its heading', () => {
    const swell = new SwellWater({ height: 1, period: 9, depth: 5 });
    swell.advance(2);
    const session = new RideSession();
    session.place({ x: 1, z: -3, heading: 0.5, speed: 6, phase: 'standing' }, swell);
    expect(session.rider.attached).toBe(true);
    expect(session.rider.phase).toBe('standing');
    expect(session.surfer.active).toBe(false);
    expect(session.heading).toBeCloseTo(0.5, 2);
    const surface = swell.surfaceAt(1, -3);
    const flow = swell.sampleAt(1, surface - 0.05, -3, createWaterSample());
    const along = (session.board.velocity.x - flow.flowX) * Math.sin(0.5) + (session.board.velocity.z - flow.flowZ) * Math.cos(0.5);
    expect(along).toBeCloseTo(6, 1);
    expect(session.rider.velocity.distanceTo(session.board.velocity)).toBeLessThan(0.05);
    session.place({ x: 1, z: -3, heading: 0, speed: 0, phase: 'prone' }, swell);
    expect(session.rider.phase).toBe('prone');
  });

  it('places anywhere on the water, even in the whitewater, and stays finite', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.place({ x: 0, z: 0, heading: -1, speed: 8, phase: 'standing' }, water);
    for (let i = 0; i < 60; i += 1) session.step(STEP, water, idle);
    const { position } = session.phase === 'fallen' ? { position: session.surfer.centerOfMass() } : session.board;
    expect(Number.isFinite(position.x + position.y + position.z)).toBe(true);
  });

  it('starts prone on a board floating level at the given point, heading the given way', () => {
    const session = new RideSession();
    session.reset(new Vector3(2, 0, -5), Math.PI / 2, new PlaneWater());
    expect(session.rider.attached).toBe(true);
    expect(session.rider.phase).toBe('prone');
    const forward = new Vector3(0, 0, 1).applyQuaternion(session.board.orientation);
    expect(forward.x).toBeCloseTo(1, 6);
    expect(session.board.position.x).toBeCloseTo(2, 6);
    expect(session.surfer.active).toBe(false);
  });

  it('relaunches drifting with the water and lying along its surface, so paddling off does not throw the rider', () => {
    // A quarter period past the crest: the surface falls and the orbital flow runs shoreward.
    const swell = new SwellWater({ height: 1.6, period: 10, direction: 0.3 });
    swell.advance(2.5);
    const at = new Vector3(3, 0, -4);
    const session = new RideSession();
    session.reset(at, 0.2, swell);
    const sample = swell.sampleAt(at.x, swell.surfaceAt(at.x, at.z) - 0.05, at.z, createWaterSample());
    const { board, rider } = session;
    expect(board.velocity.x).toBeCloseTo(sample.flowX, 2);
    expect(board.velocity.z).toBeCloseTo(sample.flowZ, 2);
    expect(rider.velocity.distanceTo(board.velocity)).toBeLessThan(0.05);
    const up = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
    expect(up.angleTo(new Vector3(sample.normalX, sample.normalY, sample.normalZ))).toBeLessThan(0.01);
    const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    expect(Math.atan2(forward.x, forward.z)).toBeCloseTo(0.2, 2);
    for (let i = 0; i < 120; i += 1) {
      session.step(STEP, swell, { ...idle, paddle: true });
      swell.advance(STEP);
    }
    expect(rider.attached).toBe(true);
  });

  it('throws the rider off a board stopped dead, into a fall body that keeps its momentum', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(), 0, water);
    session.board.velocity.z = 6;
    session.rider.velocity.z = 6;
    for (let i = 0; i < 180; i += 1) {
      session.step(STEP, water, i === 30 ? { ...idle, popUp: true } : idle);
      if (session.rider.phase !== 'standing' || session.rider.popUpReport.outcome !== 'stood') {
        session.board.velocity.z = 6;
        session.rider.velocity.z = 6;
      }
    }
    expect(session.rider.phase).toBe('standing');
    // The board jams on something and is held still: the rider cannot hold on.
    let handed: { momentum: Vector3; centre: Vector3 } | undefined;
    for (let i = 0; i < 20 && !handed; i += 1) {
      session.board.velocity.set(0, 0, 0);
      session.board.angularVelocity.set(0, 0, 0);
      session.step(STEP, water, idle);
      if (session.surfer.active) handed = { momentum: session.started.momentum.clone(), centre: session.started.center.clone() };
    }
    expect(handed).toBeDefined();
    expect(session.rider.attached).toBe(false);
    expect(session.rider.separation).toBeDefined();
    expect(handed!.momentum.distanceTo(session.handoff.velocity.clone().multiplyScalar(session.rider.mass))).toBeLessThan(1e-9);
    expect(handed!.centre.distanceTo(session.handoff.center)).toBeLessThan(1e-9);
    // Still moving forward when it lets go: thrown over the nose.
    expect(handed!.momentum.z).toBeGreaterThan(50);
  });

  it('keeps the riderless board floating while the rider falls and swims', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(), 0, water);
    session.rider.popUp();
    for (let i = 0; i < 600; i += 1) session.step(STEP, water, idle);
    // At rest the pop-up fails and the rider lies back down; force a separation to check the aftermath.
    session.separate();
    for (let i = 0; i < 300; i += 1) session.step(STEP, water, { ...idle, paddle: true });
    expect(session.surfer.active).toBe(true);
    expect(Number.isFinite(session.surfer.centerOfMass().y)).toBe(true);
    expect(session.board.lowestPoint()).toBeGreaterThan(-0.05);
    expect(session.board.lowestPoint()).toBeLessThan(0.02);
  });

  it('lets the lip strike the rider on the board, and the surfer once fallen', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(), 0, water);
    session.step(STEP, water, idle);
    /** One parcel crossing `point` from +x to −x over the latest step. */
    const aimedAt = (point: Vector3, id: number): LipParcelSource => ({
      forEachContactNear(_center: Vector3, _reach: number, visit: (parcel: LipContactParcel) => void) {
        visit({ id, previousPosition: point.clone().add(new Vector3(1.5, 0, 0)), position: point.clone().add(new Vector3(-1.5, 0, 0)), velocity: new Vector3(-8, 0, 0), volume: 0.2, radius: 0.3 });
      },
    });
    session.strike(aimedAt(session.rider.partPosition(1, new Vector3()), 1));
    expect(session.rider.lastLipImpulse.x).toBeLessThan(0);
    session.separate();
    session.step(STEP, water, idle);
    session.step(STEP, water, idle);
    expect(session.surfer.active).toBe(true);
    session.strike(aimedAt(session.surfer.getPartPosition('torso', new Vector3()), 2));
    expect(session.surfer.lastContacts.lip.x).toBeLessThan(0);
  });

  it('lets the swimmer climb back onto a board within reach, the pair keeping its momentum', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(), 0, water);
    session.separate();
    for (let i = 0; i < 30; i += 1) session.step(STEP, water, idle);
    expect(session.surfer.active).toBe(true);
    // Still beside the board: reach for it.
    for (let i = 0; i < 900 && !session.rider.attached; i += 1) session.step(STEP, water, { ...idle, popUp: true });
    expect(session.rider.attached).toBe(true);
    expect(session.rider.phase).toBe('prone');
    expect(session.surfer.active).toBe(false);
    expect(session.remount.count).toBe(1);
    expect(session.remount.after.distanceTo(session.remount.before)).toBeLessThan(1e-9);
    // Back on the board it paddles again.
    for (let i = 0; i < 240; i += 1) session.step(STEP, water, { ...idle, paddle: true });
    expect(session.board.velocity.length()).toBeGreaterThan(0.8);
  });

  it('cannot climb onto a board out of reach', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(), 0, water);
    session.separate();
    for (let i = 0; i < 180; i += 1) session.step(STEP, water, idle);
    session.board.place(new Vector3(6, session.board.position.y, 6), session.board.orientation.clone());
    for (let i = 0; i < 300; i += 1) session.step(STEP, water, { ...idle, popUp: true });
    expect(session.rider.attached).toBe(false);
    expect(session.remount.count).toBe(0);
  });
});

describe('the duck-dive in a ride', () => {
  it('passes the Duck-dive input to the rider lying down', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(0, 0, 0), 0, water);
    for (let i = 0; i < 12; i += 1) session.step(STEP, water, { ...idle, duckDive: 1 });
    expect(session.rider.duck.press).toBeGreaterThan(0.5);
  });
});

describe('the leash in a ride', () => {
  const fallen = (stance: 'regular' | 'goofy' = 'regular') => {
    const session = new RideSession({ stance });
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
    expect(furthest).toBeGreaterThan(1.83);
    expect(furthest).toBeLessThan(1.83 * 1.55);
  });

  it('ties the back foot: the right ankle regular, the left goofy', () => {
    for (const stance of ['regular', 'goofy'] as const) {
      const { session } = fallen(stance);
      const ankle = session.leashAnkle(new Vector3());
      const leg = session.surfer.getPartPosition(stance === 'regular' ? 'rightLeg' : 'leftLeg', new Vector3());
      const other = session.surfer.getPartPosition(stance === 'regular' ? 'leftLeg' : 'rightLeg', new Vector3());
      expect(ankle.distanceTo(leg)).toBeLessThan(ankle.distanceTo(other));
    }
  });

  it('puts the plug on the deck at the tail', () => {
    const { session } = fallen();
    const plug = session.board.toLocal(session.leashPlug(new Vector3()), new Vector3());
    expect(plug.z).toBeLessThan(-session.board.shape.length / 2 + 0.1);
    expect(Math.abs(plug.x)).toBeLessThan(1e-9);
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

  it('lets go of a held board to dive', () => {
    const { session, water } = fallen();
    for (let i = 0; i < 180; i += 1) session.step(STEP, water, idle);
    const torso = session.surfer.getPartPosition('torso', new Vector3());
    session.board.place(new Vector3(torso.x + 0.5, session.board.shape.centerOfMass.y - 0.03, torso.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI));
    session.step(STEP, water, { ...idle, popUp: true });
    expect(session.recovery.state).not.toBe('free');
    session.step(STEP, water, { ...idle, duckDive: 1 });
    expect(session.recovery.state).toBe('free');
    for (let i = 0; i < 60; i += 1) session.step(STEP, water, { ...idle, duckDive: 1 });
    expect(session.surfer.diving).toBe(true);
  });

  // Review Focus 5.
  it('gives a new leash on a relaunch', () => {
    const { session, water } = fallen();
    session.leash.snapped = true;
    session.leash.length = 1;
    session.reset(new Vector3(0, 0, 0), 0, water);
    expect(session.leash.snapped).toBe(false);
    expect(session.leash.length).toBe(1.83);
  });
});

// The wipeout spec, Part B: breath.
describe('breath in a ride', () => {
  it('never drains lying on the board, even with the deck under water', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(0, 0, 0), 0, water);
    for (let i = 0; i < 270; i += 1) session.step(STEP, water, { ...idle, duckDive: i < 90 ? 1 : 0 });
    expect(session.rider.attached).toBe(true);
    expect(session.breath.level).toBe(1);
  });

  it('drains while the fallen surfer is held under, faster diving than relaxed', () => {
    const drained = (duckDive: number) => {
      const session = new RideSession();
      const water = new PlaneWater({ voidFraction: 0.18 });
      session.reset(new Vector3(0, 0, 0), 0, water);
      session.separate('balance');
      for (let i = 0; i < 300; i += 1) session.step(STEP, water, { ...idle, duckDive });
      return 1 - session.breath.level;
    };
    expect(drained(0)).toBeGreaterThan(0);
    expect(drained(1)).toBeGreaterThan(drained(0));
  });

  it('comes back full on a relaunch', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(0, 0, 0), 0, water);
    session.breath.level = 0.2;
    session.reset(new Vector3(0, 0, 0), 0, water);
    expect(session.breath.level).toBe(1);
  });
});

describe('hitting the reef (Teahupo\'o Reef, Part C)', () => {
  const idle: RideInput = { paddle: false, popUp: false, steer: 0 };

  it('names a fall that comes as the board strikes the reef "reef", and one in open water by its own cause', () => {
    const session = new RideSession();
    session.place({ x: 0, z: 0, heading: 0, speed: 0, phase: 'standing' }, new PlaneWater({ depth: 3 }));
    // The trough drains: dry reef 0.3 m below (water would brake the board before it struck). The board drops onto it:
    // a strike, then the rider lets go in the same breath.
    const reef = new PlaneWater({ level: -0.3, depth: 0, bedMaterial: 'reef' });
    session.board.velocity.y = -3;
    for (let t = 0; t < 0.1; t += 1 / 120) session.step(1 / 120, reef, idle);
    session.separate('impact');
    expect(session.separation).toBe('reef');
    const open = new RideSession();
    const deep = new PlaneWater({ depth: 3 });
    open.place({ x: 0, z: 0, heading: 0, speed: 0, phase: 'standing' }, deep);
    open.separate('balance');
    expect(open.separation).toBe('balance');
  });

  it('ends nothing when a paddler\'s board just touches the reef', () => {
    const session = new RideSession();
    const shallow = new PlaneWater({ depth: 0.15, bedMaterial: 'reef' });
    session.place({ x: 0, z: 0, heading: 0, speed: 0, phase: 'prone' }, shallow);
    for (let t = 0; t < 2; t += 1 / 120) session.step(1 / 120, shallow, { ...idle, paddle: true });
    expect(session.phase).not.toBe('fallen');
  });
});
