import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { REFERENCE_RIDER } from './boardReference';
import { WATER } from './hullForces';
import { PlaneWater } from './PlaneWater';
import { stanceFeet } from './riderPosture';
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
    expect(rider.inContact).toBe(false);
    expect(rider.contact.feasible).toBe(false);
    expect(rider.velocity.y).toBeGreaterThan(riderFall - WATER.gravity * STEP - 1e-6);
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
  const ride = (steer: number, stance: 'regular' | 'goofy' = 'regular') => {
    const angle = (15 * Math.PI) / 180;
    const board = new BoardBody();
    const along = new Vector3(0, -Math.sin(angle), Math.cos(angle));
    board.place(new Vector3(0, board.shape.centerOfMass.y * Math.cos(angle), 0), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle), along.multiplyScalar(6));
    const rider = new AttachedRider(board.shape, { phase: 'standing', stance });
    board.attach(rider);
    const water = new PlaneWater({ slopeZ: -Math.tan(angle) });
    run(board, water, 1);
    rider.steer = steer;
    // Half a second: without fins (P4e) nothing holds the heading, and a rolled board soon spins out.
    run(board, water, 0.5);
    return { board, rider, roll: new Vector3(0, 1, 0).applyQuaternion(board.orientation).x };
  };

  // Weight on a rail rolls the board onto it and its fins turn it that way. (Held at full steer for
  // over a second the carve still throws the rider: an open P4e item.)
  it('loads the rail on the requested side, rolling the board and turning it that way', () => {
    const left = ride(1);
    const right = ride(-1);
    const straight = ride(0);
    const heading = (board: BoardBody) => {
      const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
      return Math.atan2(forward.x, forward.z);
    };
    expect(left.rider.attached && right.rider.attached).toBe(true);
    expect(left.roll).toBeGreaterThan(0.05);
    expect(right.roll).toBeLessThan(-0.05);
    expect(heading(left.board)).toBeGreaterThan(heading(straight.board));
    expect(heading(right.board)).toBeLessThan(heading(straight.board));
    expect(left.board.velocity.x).toBeGreaterThan(straight.board.velocity.x);
    expect(right.board.velocity.x).toBeLessThan(straight.board.velocity.x);
  });

  it('means the same direction in either stance', () => {
    const regular = ride(1, 'regular');
    const goofy = ride(1, 'goofy');
    expect(Math.sign(goofy.roll)).toBe(Math.sign(regular.roll));
    expect(Math.sign(goofy.board.velocity.x)).toBe(Math.sign(regular.board.velocity.x));
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
