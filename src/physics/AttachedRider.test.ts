import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { LIP_CONTACT } from './DetachedSurfer';
import { BoardBody } from './BoardBody';
import { REFERENCE_RIDER } from './boardReference';
import { WATER } from './hullForces';
import { PlaneWater } from './PlaneWater';
import { stanceFeet } from './riderPosture';
import { SwellWater } from './SwellWater';
import type { SurfWater } from './SurfWater';

const STEP = 1 / 60;

/** A board level at the surface (lowest bottom point at `bottomY`) with a rider mounted in `phase`. */
function mounted(phase: 'standing' | 'prone' = 'standing', bottomY = 0) {
  const board = new BoardBody();
  board.place(new Vector3(0, bottomY + board.shape.centerOfMass.y, 0));
  const rider = new AttachedRider(board.shape, { phase });
  board.attach(rider);
  return { board, rider };
}

function run(board: BoardBody, water: SurfWater, seconds: number, each?: () => void): void {
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    board.step(STEP, water);
    each?.();
  }
}

const totalWork = (board: BoardBody, rider: AttachedRider) =>
  Object.values(board.work).reduce((a, b) => a + b, 0) + Object.values(rider.work).reduce((a, b) => a + b, 0);

describe('rider coupled to the board', () => {
  it('reports more front-foot load during landing than in the settled stance', () => {
    const read = (phase: 'landing' | 'standing') => {
      const board = new BoardBody();
      board.place(new Vector3(0, board.shape.centerOfMass.y, 0));
      const rider = new AttachedRider(board.shape, { phase });
      board.attach(rider);
      const tow = () => {
        board.velocity.z = 6;
        rider.velocity.z = 6;
      };
      tow();
      run(board, new PlaneWater(), 1, tow);
      return { front: rider.contact.frontShare, force: rider.contact.force.y, feasible: rider.contact.feasible };
    };
    const landing = read('landing');
    const standing = read('standing');
    expect(landing.feasible).toBe(true);
    expect(standing.feasible).toBe(true);
    expect(landing.force).toBeGreaterThan(0);
    expect(standing.force).toBeGreaterThan(0);
    expect(landing.front).toBeGreaterThan(standing.front);
  });

  it('rides a board towed at 6 m/s, pressing its weight onto the deck between its feet', () => {
    const { board, rider } = mounted('standing');
    const tow = () => {
      board.velocity.z = 6;
      rider.velocity.z = 6;
    };
    tow();
    run(board, new PlaneWater(), 4, tow);
    expect(rider.attached).toBe(true);
    expect(rider.inContact).toBe(true);
    expect(Math.abs(board.velocity.y)).toBeLessThan(0.01);
    expect(Math.abs(rider.velocity.y)).toBeLessThan(0.01);
    const up = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
    expect(rider.contact.force.dot(up) / (REFERENCE_RIDER.mass * WATER.gravity)).toBeCloseTo(1, 1);
    const { rear, front } = stanceFeet(board.shape);
    expect(rider.contact.centreOfPressure.z).toBeGreaterThan(rear - 0.06);
    expect(rider.contact.centreOfPressure.z).toBeLessThan(front + 0.06);
    expect(Math.abs(rider.contact.centreOfPressure.x)).toBeLessThan(0.13);
    expect(rider.postureError).toBeLessThan(0.01);
  });

  it('sinks a board it stands on at rest', () => {
    const { board, rider } = mounted('standing');
    run(board, new PlaneWater(), 1);
    expect(board.position.y).toBeLessThan(-0.1);
    expect(rider.position.y - board.position.y).toBeGreaterThan(0.5);
  });

  it('lets go once it tips beyond recovery, and stops loading the board', () => {
    const { board, rider } = mounted('standing');
    run(board, new PlaneWater(), 4);
    expect(rider.attached).toBe(false);
    expect(['balance', 'foot slip', 'lost board']).toContain(rider.separation);
    // Relieved of the rider, the board floats back to its own draft.
    expect(board.lowestPoint()).toBeGreaterThan(-0.05);
  });

  it('falls with the board as one body in the air, conserving momentum', () => {
    const { board, rider } = mounted('standing', 5);
    const water = new PlaneWater({ inside: () => false });
    const before = board.velocity.clone().multiplyScalar(board.mass).addScaledVector(rider.velocity, rider.mass);
    run(board, water, 0.5);
    const after = board.velocity.clone().multiplyScalar(board.mass).addScaledVector(rider.velocity, rider.mass);
    const gravity = -(board.mass + rider.mass) * WATER.gravity * 0.5;
    expect(after.y - before.y).toBeCloseTo(gravity, 6);
    expect(Math.abs(after.x) + Math.abs(after.z)).toBeLessThan(1e-9);
    expect(rider.postureError).toBeLessThan(0.01);
  });

  it('closes the board and rider energy ledger through a landing', () => {
    const { board, rider } = mounted('prone', 0.3);
    const before = board.kineticEnergy() + rider.kineticEnergy();
    run(board, new PlaneWater(), 2);
    const change = board.kineticEnergy() + rider.kineticEnergy() - before;
    const scale = (board.mass + rider.mass) * WATER.gravity * 0.3;
    expect(Math.abs(change - totalWork(board, rider)) / scale).toBeLessThan(0.01);
  });

  // A 25.75 L board under 73 kg (0.35 L/kg, the field study's intermediate) floats awash under a prone rider.
  it('floats prone, nose up with the nose at the surface and the head well above water', () => {
    const { board, rider } = mounted('prone');
    run(board, new PlaneWater(), 6);
    expect(rider.attached).toBe(true);
    expect(Math.abs(board.velocity.y)).toBeLessThan(0.01);
    expect(Math.abs(rider.velocity.y)).toBeLessThan(0.01);
    const head = rider.partPosition(2, new Vector3());
    expect(head.y).toBeGreaterThan(0.2);
    const deck = board.toWorld({ x: 0, y: board.shape.curves.rocker(0.5) + board.shape.curves.thickness(0.5), z: 0 }, new Vector3());
    expect(deck.y).toBeLessThan(0);
    expect(deck.y).toBeGreaterThan(-0.15);
    const nose = board.toWorld({ x: 0, y: board.shape.curves.rocker(1), z: board.shape.length / 2 }, new Vector3());
    expect(Math.abs(nose.y)).toBeLessThan(0.05);
    // Part of the load is the rider's own buoyancy: the board alone floats only 26 kg.
    expect(rider.buoyancy.y).toBeGreaterThan(0);
  });

  // Plan §1.10: a sustainable paddling speed of about 1.5–2 m/s (provisional).
  it('paddles up to a steady 1.5–2 m/s in flat water without planing, pushing the water back', () => {
    const { board, rider } = mounted('prone');
    rider.paddle = true;
    const water = new PlaneWater();
    run(board, water, 20);
    let speed = 0;
    run(board, water, 5, () => {
      speed += board.velocity.z / 300;
    });
    expect(speed).toBeGreaterThan(1.5);
    expect(speed).toBeLessThan(2);
    expect(board.forces.pressure.y).toBeLessThan(0.5 * (board.mass + rider.mass) * WATER.gravity);
    const momentum = board.mass * board.velocity.z + rider.mass * rider.velocity.z;
    expect(water.reaction.z).toBeCloseTo(momentum, 6);
  });

  it('paddles faster over the ground with a following current', () => {
    const cruise = (current: number) => {
      const { board, rider } = mounted('prone');
      // Drifting with the current from the start: a light coupling to the water takes long to pick it up.
      board.velocity.z = current;
      rider.velocity.z = current;
      rider.paddle = true;
      const water = new PlaneWater({ flow: { x: 0, y: 0, z: current } });
      run(board, water, 20);
      let speed = 0;
      run(board, water, 5, () => {
        speed += board.velocity.z / 300;
      });
      return speed;
    };
    const gain = cruise(0.5) - cruise(0);
    expect(gain).toBeGreaterThan(0.35);
    expect(gain).toBeLessThan(0.65);
  });

  it('gets no stroke force with its hands out of the water', () => {
    const { board, rider } = mounted('prone', 3);
    rider.paddle = true;
    run(board, new PlaneWater({ level: -10 }), 0.5);
    expect(Math.abs(board.mass * board.velocity.z + rider.mass * rider.velocity.z)).toBeLessThan(1e-9);
  });

  it('cannot pull the rider down with a board that drops away: it flies instead', () => {
    const { board, rider } = mounted('standing');
    const water = new PlaneWater();
    const tow = () => {
      board.velocity.z = 6;
      rider.velocity.z = 6;
    };
    tow();
    run(board, water, 1, tow);
    const riderFall = rider.velocity.y;
    board.velocity.y = -4;
    board.step(STEP, water);
    // The leg cannot pull: the rider is not dragged down, only gravity acts on it.
    expect(rider.contact.feasible).toBe(false);
    expect(rider.velocity.y).toBeGreaterThan(riderFall - WATER.gravity * STEP - 1e-6);
    // Standing on a leg, the feet stay on the deck, unloaded, until it drops out of the leg's reach; then it flies.
    board.velocity.y = -4;
    board.step(STEP, water);
    board.velocity.y = -4;
    board.step(STEP, water);
    expect(rider.inContact).toBe(false);
  });
});

/** A board on a face sloping down toward +z, level across, sliding down it at 5 m/s with a rider in `phase`. */
function onFace(degrees: number, phase: 'prone' | 'standing') {
  const angle = (degrees * Math.PI) / 180;
  const board = new BoardBody();
  const along = new Vector3(0, -Math.sin(angle), Math.cos(angle));
  board.place(new Vector3(0, board.shape.centerOfMass.y * Math.cos(angle), 0), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle), along.multiplyScalar(5));
  const rider = new AttachedRider(board.shape, { phase });
  board.attach(rider);
  return { board, rider, water: new PlaneWater({ slopeZ: -Math.tan(angle) }) };
}

describe('pop-up', () => {
  const towedProne = (speed: number, water = new PlaneWater()) => {
    const { board, rider } = mounted('prone');
    const tow = () => {
      board.velocity.z = speed;
      rider.velocity.z = speed;
    };
    tow();
    run(board, water, 3, tow);
    return { board, rider, tow, water };
  };

  // Borgonovo-Santos et al. 2021: 1.20 ± 0.19 s, about 60 % push and 40 % landing, peak landing 1.63 ± 0.18 BW, front-foot biased.
  it('stands from prone in about 1.2 s on a planing board, landing on the front foot', () => {
    const { board, rider, tow, water } = towedProne(6);
    expect(rider.popUp()).toBe(true);
    expect(rider.phase).toBe('push');
    let standingAt = 0;
    run(board, water, 2, () => {
      tow();
      if (!standingAt && rider.phase === 'standing') standingAt = rider.popUpReport.duration;
    });
    expect(rider.attached).toBe(true);
    expect(rider.phase).toBe('standing');
    expect(rider.popUpReport.outcome).toBe('stood');
    expect(rider.popUpReport.duration).toBeCloseTo(1.2, 1);
    expect(rider.popUpReport.landingPeak).toBeGreaterThan(1.2);
    expect(rider.popUpReport.landingPeak).toBeLessThan(2.0);
    expect(rider.popUpReport.frontShare).toBeGreaterThan(0.5);
    expect(standingAt).toBeGreaterThan(0);
  });

  it('cannot stand on a board at rest in flat water: it sinks, and the rider lies back down', () => {
    const { board, rider } = mounted('prone');
    const water = new PlaneWater();
    run(board, water, 3);
    rider.popUp();
    run(board, water, 3);
    expect(rider.attached).toBe(true);
    expect(rider.phase).toBe('prone');
    expect(rider.popUpReport.outcome).toBe('no support');
  });

  it('stops paddling once the hands push up', () => {
    const { board, rider, tow, water } = towedProne(3);
    rider.paddle = true;
    rider.popUp();
    run(board, water, 0.3, tow);
    expect(rider.stroking).toBe(false);
  });

  it('cues the pop-up only when planing down a face', () => {
    const rest = mounted('prone');
    run(rest.board, new PlaneWater(), 2);
    expect(rest.rider.popUpCue).toBe(false);
    const flat = towedProne(6);
    expect(flat.rider.popUpCue).toBe(false);
    const down = onFace(15, 'prone');
    run(down.board, down.water, 2);
    expect(down.rider.popUpCue).toBe(true);
  });

  // A static sloping sheet of water stands in for a wave face: gravity along it balances the drag.
  it('stands up on a steep face, but not on one too gentle to plane on', () => {
    for (const [degrees, outcome] of [[15, 'stood'], [10, 'no support']] as const) {
      const { board, rider, water } = onFace(degrees, 'prone');
      run(board, water, 3);
      rider.popUp();
      run(board, water, 2.5);
      expect(rider.popUpReport.outcome, `${degrees}°`).toBe(outcome);
      expect(rider.attached, `${degrees}°`).toBe(true);
    }
  });
});

describe('weight-shift steering', () => {
  const ride = (steer: number, stance: 'regular' | 'goofy' = 'regular', seconds = 0.5) => {
    const angle = (15 * Math.PI) / 180;
    const board = new BoardBody();
    const along = new Vector3(0, -Math.sin(angle), Math.cos(angle));
    board.place(new Vector3(0, board.shape.centerOfMass.y * Math.cos(angle), 0), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle), along.multiplyScalar(6));
    const rider = new AttachedRider(board.shape, { phase: 'standing', stance });
    board.attach(rider);
    const water = new PlaneWater({ slopeZ: -Math.tan(angle) });
    run(board, water, 1);
    rider.steer = steer;
    run(board, water, seconds);
    return { board, rider, roll: new Vector3(0, 1, 0).applyQuaternion(board.orientation).x };
  };

  const heading = (board: BoardBody) => {
    const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    return Math.atan2(forward.x, forward.z);
  };

  // Weight on a rail rolls the board onto it and its fins turn it that way.
  it('loads the rail on the requested side, rolling the board and turning it that way', () => {
    const left = ride(1);
    const right = ride(-1);
    const straight = ride(0);
    expect(left.rider.attached && right.rider.attached).toBe(true);
    expect(left.roll).toBeGreaterThan(0.05);
    expect(right.roll).toBeLessThan(-0.05);
    expect(heading(left.board)).toBeGreaterThan(heading(straight.board));
    expect(heading(right.board)).toBeLessThan(heading(straight.board));
    expect(left.board.velocity.x).toBeGreaterThan(straight.board.velocity.x);
    expect(right.board.velocity.x).toBeLessThan(straight.board.velocity.x);
  });

  // Carried at the stance point but pushing through its centre of mass, the rider made the coupled
  // solve singular as the carve turned, and it blew up after 2.3 s ('lost board').
  it('holds a full carve across the face for 2.5 s', () => {
    const { board, rider } = ride(1, 'regular', 2.5);
    expect(rider.attached).toBe(true);
    expect(heading(board)).toBeGreaterThan((20 * Math.PI) / 180);
    expect(board.velocity.length()).toBeGreaterThan(4);
  });

  // Open P4e item: after about 2.8 s at full steer a 3.3 BW load spike still throws the rider ('balance').
  it.fails('holds a full carve across the face for 4 s', () => {
    const { rider } = ride(1, 'regular', 4);
    expect(rider.attached).toBe(true);
  });

  it('holds a three-quarter carve for 4 s', () => {
    const { board, rider } = ride(0.75, 'regular', 4);
    expect(rider.attached).toBe(true);
    expect(heading(board)).toBeGreaterThan((20 * Math.PI) / 180);
  });

  it('means the same direction in either stance', () => {
    const regular = ride(1, 'regular');
    const goofy = ride(1, 'goofy');
    expect(Math.sign(goofy.roll)).toBe(Math.sign(regular.roll));
    expect(Math.sign(goofy.board.velocity.x)).toBe(Math.sign(regular.board.velocity.x));
  });
});

describe('standing on the leg', () => {
  const weight = REFERENCE_RIDER.mass * WATER.gravity;
  /** A board sliding down a 15° face at 6 m/s with a standing rider (the steering tests' set-up). */
  const onSlope = () => {
    const angle = (15 * Math.PI) / 180;
    const board = new BoardBody();
    const along = new Vector3(0, -Math.sin(angle), Math.cos(angle));
    board.place(new Vector3(0, board.shape.centerOfMass.y * Math.cos(angle), 0), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle), along.multiplyScalar(6));
    const rider = new AttachedRider(board.shape, { phase: 'standing' });
    board.attach(rider);
    return { board, rider, water: new PlaneWater({ slopeZ: -Math.tan(angle) }) };
  };

  it('stands balanced down a face for 20 s with no input, the load between its feet', () => {
    const { board, rider, water } = onSlope();
    let widest = 0;
    let time = 0;
    run(board, water, 20, () => {
      time += STEP;
      if (time > 1 && rider.attached) widest = Math.max(widest, Math.abs(rider.contact.centreOfPressure.x));
    });
    expect(rider.attached).toBe(true);
    expect(widest).toBeLessThan(0.06);
  });

  it('holds its weight on the leg riding a towed board, and settles within a second when the water drops away', () => {
    const { board, rider } = mounted('standing');
    const tow = () => {
      board.velocity.z = 6;
      rider.velocity.z = 6;
    };
    tow();
    run(board, new PlaneWater(), 1, tow);
    expect(rider.leg.force / weight).toBeCloseTo(1, 1);
    const dropped = new PlaneWater({ level: -0.05 });
    const deviation: number[] = [];
    run(board, dropped, 1.5, () => {
      tow();
      deviation.push(Math.abs(rider.leg.extension - rider.leg.rest));
    });
    expect(rider.attached).toBe(true);
    const peak = Math.max(...deviation);
    expect(peak).toBeGreaterThan(0.002);
    expect(Math.max(...deviation.slice(Math.round(1 / STEP)))).toBeLessThan(0.2 * peak);
  });

  it('only pushes: dropped 0.3 m at speed it flies unloaded, lands through its leg and rides on, the ledger closed', () => {
    // A board at rest cannot carry a standing rider (it sinks), so the drop lands planing, at 7 m/s. From 0.5 m
    // the flat landing digs the nose in and pitches the rider off, rigid or on a leg alike.
    const { board, rider } = mounted('standing', 0.3);
    board.velocity.z = 7;
    rider.velocity.z = 7;
    const water = new PlaneWater();
    const before = board.kineticEnergy() + rider.kineticEnergy();
    const loads: number[] = [];
    let airborne = true;
    let flightLoad = 0;
    let deepest = 0;
    run(board, water, 1.2, () => {
      if (airborne && board.lowestPoint() < 0) airborne = false;
      if (airborne) flightLoad = Math.max(flightLoad, rider.contact.load);
      loads.push(rider.contact.load);
      deepest = Math.min(deepest, rider.leg.extension);
    });
    expect(flightLoad).toBeLessThan(0.05);
    expect(rider.attached).toBe(true);
    expect(Math.max(...loads)).toBeGreaterThan(1.5);
    expect(Math.max(...loads)).toBeLessThanOrEqual(4 + 1e-3);
    // The leg took the landing: it compressed.
    expect(deepest).toBeLessThan(-0.02);
    const change = board.kineticEnergy() + rider.kineticEnergy() - before;
    const scale = (board.mass + rider.mass) * WATER.gravity * 0.3;
    expect(Math.abs(change - totalWork(board, rider)) / scale).toBeLessThan(0.02);
  });

  it('starts a relaunch in its neutral stance, whatever it was doing before', () => {
    const { board, rider, water } = onSlope();
    rider.steer = 1;
    run(board, water, 1);
    const fresh = onSlope();
    // Relaunching places the board afresh and mounts the rider on it, as `RideSession.reset` does.
    rider.steer = 0;
    board.place(fresh.board.position, fresh.board.orientation, fresh.board.velocity);
    board.attach(rider);
    expect(rider.leg.extension).toBe(0);
    expect(rider.leg.rate).toBe(0);
    run(board, water, 1);
    run(fresh.board, fresh.water, 1);
    expect(rider.attached).toBe(true);
    expect(rider.leg.force).toBeCloseTo(fresh.rider.leg.force, 6);
    expect(rider.position.distanceTo(fresh.rider.position)).toBeLessThan(1e-9);
  });
});

describe('steering while lying down', () => {
  const heading = (board: BoardBody) => {
    const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    return Math.atan2(forward.x, forward.z);
  };
  const turn = (steer: number, paddle: boolean) => {
    const { board, rider } = mounted('prone');
    const water = new PlaneWater();
    run(board, water, 2);
    rider.paddle = paddle;
    rider.steer = steer;
    run(board, water, 4);
    return { heading: heading(board), speed: board.velocity.length(), attached: rider.attached };
  };

  // Without fins and a paddler keeping its line, the board wandered 45° in 20 s. The first pull, one
  // arm from rest before the fins grip, still yaws it about 15°; under way it holds its line.
  it('holds its line within 10° over 20 s of paddling through oblique swell', () => {
    const swell = new SwellWater({ height: 0.8, period: 8, direction: Math.PI / 4 });
    const { board, rider } = mounted('prone', swell.surfaceAt(0, 0));
    rider.paddle = true;
    const start = heading(board);
    let startUp = 0;
    for (let i = 0; i < 2 * 60; i += 1) {
      board.step(STEP, swell);
      swell.advance(STEP);
      startUp = Math.max(startUp, Math.abs(heading(board) - start));
    }
    const line = heading(board);
    let worst = 0;
    for (let i = 0; i < 20 * 60; i += 1) {
      board.step(STEP, swell);
      swell.advance(STEP);
      worst = Math.max(worst, Math.abs(heading(board) - line));
    }
    expect(rider.attached).toBe(true);
    expect(board.velocity.length()).toBeGreaterThan(1);
    expect(startUp).toBeLessThan((20 * Math.PI) / 180);
    expect(worst).toBeLessThan((10 * Math.PI) / 180);
  });

  it('turns toward the requested side by pulling harder with the other arm', () => {
    const left = turn(1, true);
    const right = turn(-1, true);
    const straight = turn(0, true);
    expect(left.attached && right.attached).toBe(true);
    expect(left.heading).toBeGreaterThan(straight.heading + 0.2);
    expect(right.heading).toBeLessThan(straight.heading - 0.2);
    expect(left.speed).toBeGreaterThan(0.8);
  });

  it('turns without paddling by sweeping one arm', () => {
    const left = turn(1, false);
    const right = turn(-1, false);
    expect(left.heading).toBeGreaterThan(0.2);
    expect(right.heading).toBeLessThan(-0.2);
    expect(turn(0, false).heading).toBeCloseTo(0, 6);
  });
});

describe('lip strikes', () => {
  const towed = () => {
    const { board, rider } = mounted('standing');
    const water = new PlaneWater();
    const tow = () => {
      board.velocity.z = 6;
      rider.velocity.z = 6;
    };
    tow();
    run(board, water, 1, tow);
    return { board, rider, water, tow };
  };
  /** A lip parcel crossing the board from +x to −x at 8 m/s, at torso height plus `above`, over the latest step. */
  const crossing = (rider: AttachedRider, above = 0) => {
    const torso = rider.partPosition(1, new Vector3());
    return {
      id: 7,
      previousPosition: new Vector3(torso.x + 1.5, torso.y + above, torso.z - 6 * STEP),
      position: new Vector3(torso.x - 1.5, torso.y + above, torso.z),
      velocity: new Vector3(-8, 0, 6),
      volume: 0.2,
      radius: 0.3,
    };
  };

  it('knocks a standing rider off, taking the equal and opposite impulse from the parcel', () => {
    const { board, rider, water, tow } = towed();
    const parcel = crossing(rider);
    const parcelBefore = parcel.velocity.clone();
    const riderBefore = rider.velocity.clone();
    expect(rider.resolveLipContact(parcel, board)).toBeGreaterThan(0);
    const parcelMass = LIP_CONTACT.density * parcel.volume;
    const riderGain = rider.velocity.clone().sub(riderBefore).multiplyScalar(rider.mass);
    const parcelGain = parcel.velocity.clone().sub(parcelBefore).multiplyScalar(parcelMass);
    expect(riderGain.x).toBeLessThan(-10);
    expect(riderGain.clone().add(parcelGain).length()).toBeLessThan(1e-9);
    expect(rider.lastLipImpulse.distanceTo(riderGain)).toBeLessThan(1e-9);
    // The same parcel strikes once.
    expect(rider.resolveLipContact(parcel, board)).toBe(0);
    run(board, water, 1.5, tow);
    expect(rider.attached).toBe(false);
    expect(['impact', 'balance', 'foot slip']).toContain(rider.separation);
  });

  // A push whose capture point stays inside the feet is caught by moving the centre of pressure.
  it('rides out a light splash', () => {
    const { board, rider, water, tow } = towed();
    const parcel = { ...crossing(rider), volume: 0.01 };
    expect(rider.resolveLipContact(parcel, board)).toBe(1);
    expect(rider.lastLipImpulse.length()).toBeGreaterThan(1);
    run(board, water, 1.5, tow);
    expect(rider.attached).toBe(true);
  });

  it('leaves a rider alone when the parcel passes clear overhead', () => {
    const { board, rider, water, tow } = towed();
    const parcel = crossing(rider, 1.5);
    const before = parcel.velocity.clone();
    expect(rider.resolveLipContact(parcel, board)).toBe(0);
    expect(parcel.velocity.equals(before)).toBe(true);
    run(board, water, 1.5, tow);
    expect(rider.attached).toBe(true);
  });
});

// Wave plan §1.10: a catch comes from the wave, never from paddling alone.
/** The board's roll, rad: positive with its left rail (+x) up. */
function roll(board: BoardBody): number {
  const side = new Vector3(1, 0, 0).applyQuaternion(board.orientation);
  return Math.asin(Math.max(-1, Math.min(1, side.y)));
}

describe('prone balance', () => {
  // A shortboard carrying a prone rider floats awash with the rider's weight above it: passively
  // it capsizes. A paddler balances the roll by shifting toward the high rail.
  it('rights a board tipped 15° under a prone rider', () => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (15 * Math.PI) / 180));
    const rider = new AttachedRider(board.shape, { phase: 'prone' });
    board.attach(rider);
    run(board, new PlaneWater(), 3);
    expect(rider.attached).toBe(true);
    expect(Math.abs(roll(board))).toBeLessThan((5 * Math.PI) / 180);
  });

  it('never pushes a hand harder than an arm can, however fast the board runs', () => {
    const { board, rider } = mounted('prone');
    board.velocity.z = 5;
    rider.velocity.z = 5;
    rider.paddle = true;
    let hardest = 0;
    run(board, new PlaneWater({ level: 0.3 }), 3, () => {
      hardest = Math.max(hardest, rider.handLoad[0], rider.handLoad[1]);
    });
    const weight = rider.mass * WATER.gravity;
    expect(hardest).toBeGreaterThan(0.3 * weight);
    expect(hardest).toBeLessThanOrEqual(0.4 * weight + 1e-9);
    expect(rider.attached).toBe(true);
  });

  it('stays on the board lying still through a minute of oblique swell', () => {
    const swell = new SwellWater({ height: 1.2, period: 10, direction: Math.PI / 6 });
    const { board, rider } = mounted('prone', swell.surfaceAt(0, 0));
    let worst = 0;
    for (let i = 0; i < 60 * 60 && rider.attached; i += 1) {
      board.step(STEP, swell);
      swell.advance(STEP);
      worst = Math.max(worst, Math.abs(roll(board)));
    }
    expect(rider.attached).toBe(true);
    expect(worst).toBeLessThan((20 * Math.PI) / 180);
  });
});

describe('catching', () => {
  it('never cues or stands from paddling on flat water', () => {
    const { board, rider } = mounted('prone');
    const water = new PlaneWater();
    rider.paddle = true;
    let cued = false;
    run(board, water, 30, () => {
      cued ||= rider.popUpCue;
    });
    expect(board.velocity.length()).toBeGreaterThan(1.2);
    expect(cued).toBe(false);
    rider.popUp();
    run(board, water, 2.5);
    expect(rider.popUpReport.outcome).toBe('no support');
    expect(rider.popUpReport.refusal).toBeDefined();
  });

  it('paddles faster down a passing swell’s face than on flat water', () => {
    const fastest = (water: PlaneWater | SwellWater) => {
      const { board, rider } = mounted('prone', water.surfaceAt(0, 0));
      rider.paddle = true;
      let top = 0;
      for (let i = 0; i < 20 * 60; i += 1) {
        board.step(STEP, water);
        if (water instanceof SwellWater) water.advance(STEP);
        top = Math.max(top, board.velocity.z);
      }
      return top;
    };
    const flat = fastest(new PlaneWater());
    const swell = fastest(new SwellWater({ height: 1.2, period: 10, depth: 3 }));
    expect(swell).toBeGreaterThan(flat + 0.3);
  });
});

