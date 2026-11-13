import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider, LEG_POWER_HELD, LEG_POWER_PEAK, LEG_POWER_WINDOW, type AttachedRiderOptions } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

// The legs' power limit (ruling 27's A-lite, `legPower: 'cap'`, the `?legPower=cap` dev switch;
// docs/research/board-in-water/a-lite): standing on steep water, the contact between feet and board made kilowatts and threw
// the light board (the board study, docs/research/board-in-water). With the cap the board takes only what the legs give,
// and the contact's net power stays within a human's; on flat water nothing changes.

const STEP = 1 / 60;
const G = 9.81;

interface Run { peakSub: number; peakWindow: number; peakFrame: number; boardG: number; fellAt: number; mass: number; positions: number[] }

/** A standing rider at `speed` straight down a planar face of `angle`°, placed on it, for `seconds`. */
function ride(angle: number, options: AttachedRiderOptions, seconds = 1, speed = 6): Run {
  const slope = -Math.tan((angle * Math.PI) / 180);
  const water = new PlaneWater({ slopeZ: slope });
  const normal = new Vector3(0, 1, -slope).normalize();
  const forward = new Vector3(0, 0, 1).addScaledVector(normal, -normal.z).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(new Vector3(0, 0, 0).addScaledVector(normal, board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)), forward.clone().multiplyScalar(speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...options });
  board.attach(rider);
  const works: number[] = [];
  const spans: number[] = [];
  const inner = rider as unknown as { finish: (h: number, b: BoardBody) => void };
  const finish = inner.finish.bind(rider);
  inner.finish = (h, b) => {
    const before = board.work.rider + rider.work.contact;
    finish(h, b);
    works.push(board.work.rider + rider.work.contact - before);
    spans.push(h);
  };
  let peakFrame = 0;
  let boardG = 0;
  let fellAt = Infinity;
  let last = board.velocity.clone();
  let lastWork = 0;
  const positions: number[] = [];
  for (let n = 0; n < Math.round(seconds / STEP); n += 1) {
    board.step(STEP, water);
    const work = board.work.rider + rider.work.contact;
    peakFrame = Math.max(peakFrame, (work - lastWork) / STEP);
    lastWork = work;
    if ((n + 1) * STEP > 0.1) boardG = Math.max(boardG, board.velocity.distanceTo(last) / STEP / G);
    last.copy(board.velocity);
    positions.push(board.position.x, board.position.y, board.position.z);
    if (!rider.attached) {
      fellAt = (n + 1) * STEP;
      break;
    }
  }
  let peakSub = 0;
  let peakWindow = 0;
  let sum = 0;
  let span = 0;
  let from = 0;
  for (let k = 0; k < works.length; k += 1) {
    peakSub = Math.max(peakSub, works[k] / spans[k]);
    sum += works[k];
    span += spans[k];
    while (span - spans[from] >= LEG_POWER_WINDOW - 1e-9) {
      sum -= works[from];
      span -= spans[from];
      from += 1;
    }
    peakWindow = Math.max(peakWindow, sum);
  }
  return { peakSub, peakWindow, peakFrame, boardG, fellAt, mass: rider.mass, positions };
}

describe('the legs\' power limit (legPower: cap)', () => {
  it('by default, the contact on a 35° face straight down makes kilowatts and throws the board (the study\'s leak)', () => {
    const run = ride(35, {});
    expect(run.peakFrame).toBeGreaterThan(8000);
    expect(run.fellAt).toBeLessThan(0.15);
  });

  it('with the cap, the contact on steep faces up and down stays within a human\'s power and does not throw the board', () => {
    for (const angle of [35, 45]) {
      for (const heading of ['down', 'up'] as const) {
        const run = heading === 'down' ? ride(angle, { legPower: 'cap' }) : rideUp(angle);
        const label = `${angle}° ${heading}`;
        // At any instant (each substep) and over any 0.5 s (a joule's slack for rounding).
        expect(run.peakSub, label).toBeLessThanOrEqual(LEG_POWER_PEAK * run.mass * 1.0001);
        expect(run.peakWindow, label).toBeLessThanOrEqual(LEG_POWER_HELD * run.mass * LEG_POWER_WINDOW + 1);
        expect(run.boardG, label).toBeLessThan(5);
        expect(run.fellAt, label).toBeGreaterThan(0.15);
      }
    }
  });

  it('with the cap, a straight glide on flat water is the same, step for step', () => {
    const off = ride(0, {}, 2, 7);
    const on = ride(0, { legPower: 'cap' }, 2, 7);
    expect(on.positions).toEqual(off.positions);
    expect(on.fellAt).toBe(Infinity);
  });
});

/** As `ride`, the board heading straight up the face (placed on it). */
function rideUp(angle: number): Run {
  return ride(-angle, { legPower: 'cap' });
}
