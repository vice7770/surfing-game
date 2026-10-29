import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { ShallowWaterSolver, uniformEdges } from '../wave/ShallowWaterSolver';
import { SpillingRoller } from '../wave/SpillingRoller';
import { PhysicalSurfWater } from './PhysicalSurfWater';
import { RideSession } from './RideSession';
import type { SurfWater } from './SurfWater';
import { BoreWater } from './testing/BoreWater';
import { FaceWater } from './testing/FaceWater';

/**
 * The roller lens's feel (the Canyon roller lens, S3) changes the bodies only inside a lens: outside one, at every other
 * spot and in all plume water, a rider moves bit for bit as before. These fingerprints were recorded at 0d27853e, before
 * the lens-scoped body changes (the advisor's ruling of 2026-10-06), over riders in three waters with no lens in them.
 * Recorded again with the phase 5 physics plan's batch C, which changes these by design: the two paddlers with its
 * stroke (item 2.8: the rate, the roll, the line kept over the strokes and the 97 cm length), and the paddler in the
 * plume and the rider down the face, who fall within their runs, with the fall from the rider's own pose (item 2.10).
 * The still riders, unchanged, hold the lens's scope. Recorded again with the paddle-balance fix (2026-10-22), which
 * changes every prone rider by design: lying down, the balance comes first and keeps the water's level, not the
 * world's (`AttachedRider`'s STROKE_ROLL and PRONE_ROLL_SHIFT). The rider standing down the face, unchanged, holds the
 * lens's scope. Recorded again with canyon-catch (2026-10-29), which changes the two paddlers by design: a pulling hand
 * the board outruns feathers edge-on (`FEATHER_DRAG`, the sprint's blade refitted); with `stroke: 'old'` they move bit
 * for bit as before it. The still and standing riders, unchanged, hold the lens's scope. Recorded again with
 * popup-moving-face (2026-10-29), which changes every rider in the sea's water by design: its surface moves through the
 * bodies' step at its rise rate (here the riders' own pushes, the water never stepped, make it rise); with
 * `surfaceMotion: 'old'` they move bit for bit as before it. The riders in the test waters, unchanged, hold the scope.
 */

const STEP = 1 / 60;

/** FNV-1a over the doubles' IEEE bits: a 64-bit fingerprint of a trajectory. */
function fingerprint(values: number[]): string {
  const view = new DataView(new ArrayBuffer(8));
  let hash = 0xcbf29ce484222325n;
  for (const value of values) {
    view.setFloat64(0, value);
    for (let i = 0; i < 8; i += 1) {
      hash ^= BigInt(view.getUint8(i));
      hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
    }
  }
  return hash.toString(16).padStart(16, '0');
}

/** How a ride starts: prone at rest (the default), standing on the face, or the board landing hard. */
type Start = 'prone' | 'standing' | 'landing';

/** A rider on `water` for `steps`: the board's and rider's state every 10 steps, and the water's reactions. */
function ride(water: SurfWater, heading: number, steps: number, paddle: boolean, reactions: () => number[], start: Start = 'prone', stroke?: 'feather' | 'old'): string {
  const session = new RideSession(stroke ? { stroke } : {});
  if (start === 'standing') session.place({ x: 0, z: 0, heading, speed: 5, phase: 'standing', followSurface: true }, water);
  else session.reset(new Vector3(0, 0, 0), heading, water);
  // Landing hard: dropped 2 m/s onto the water, so its hull meets the surface as a slam (water entry).
  if (start === 'landing') session.board.velocity.set(0, -2, 1.5);
  const values: number[] = [];
  for (let n = 1; n <= steps; n += 1) {
    session.step(STEP, water, { paddle, popUp: false, steer: 0 });
    if (water instanceof BoreWater || water instanceof FaceWater) water.advance(STEP);
    if (n % 10 !== 0) continue;
    const { board, rider } = session;
    values.push(...board.position.toArray(), ...board.velocity.toArray(), ...board.orientation.toArray(), ...board.angularVelocity.toArray());
    values.push(...rider.velocity.toArray(), rider.attached ? 1 : 0, ...reactions());
  }
  return fingerprint(values);
}

/**
 * A 0.6 m bore over 3 m of still water, running 1 m/s shoreward depth-averaged, breaking fully, with a whitewater plume
 * 0.6 m deep at a void fraction of 0.15: P11's push at any other spot; with a roller (the Canyon), no lens anywhere.
 */
function plume(roller: boolean, surfaceMotion?: 'old'): PhysicalSurfWater {
  const solver = new ShallowWaterSolver({ nx: 40, xMin: -20, dx: 1, zEdges: uniformEdges(-20, 20, 40), xBoundary: 'open' }, () => 3);
  for (let i = 0; i < solver.h.length; i += 1) {
    solver.h[i] = 3.6;
    solver.qx[i] = 0.3;
    solver.qz[i] = 3.6;
  }
  const breaking = new Float64Array(solver.h.length).fill(1);
  const aeration = { voidFraction: () => 0.15, depth: new Float64Array(solver.h.length).fill(0.6) };
  return new PhysicalSurfWater(solver, {
    peakPeriod: 10, breaking, aeration, ...(roller ? { roller: new SpillingRoller(solver, { edgeColumns: 0 }) } : {}),
    ...(surfaceMotion ? { surfaceMotion } : {}),
  });
}

function drained(water: PhysicalSurfWater): () => number[] {
  const out = new Float64Array(4);
  return () => {
    water.drainReaction(out);
    return [...out];
  };
}

describe('the roller lens\'s feel, outside a lens', () => {
  it('leaves a prone rider in a plume on a P11 bore bit for bit as it was', () => {
    const water = plume(false);
    expect(ride(water, 0, 180, false, drained(water))).toBe('8ea7991eefa4e107');
    const paddling = plume(false);
    expect(ride(paddling, Math.PI, 180, true, drained(paddling))).toBe('9ca7b6a940941de4');
    const held = plume(false, 'old');
    expect(ride(held, 0, 180, false, drained(held))).toBe('0be636d78e413fc7');
    const paddlingHeld = plume(false, 'old');
    expect(ride(paddlingHeld, Math.PI, 180, true, drained(paddlingHeld))).toBe('841ba52cfdd336d6');
    const before = plume(false, 'old');
    expect(ride(before, Math.PI, 180, true, drained(before), 'prone', 'old')).toBe('b4d9c392aa3a30d6');
  });

  it('leaves a prone rider at the Canyon, in broken water outside any lens, bit for bit as it was', () => {
    const water = plume(true);
    expect(ride(water, 0, 180, false, drained(water))).toBe('b45fb3701e323ddd');
    const held = plume(true, 'old');
    expect(ride(held, 0, 180, false, drained(held))).toBe('b1c7512670a900f5');
  });

  it('leaves a board landing hard, in a plume and at the Canyon outside any lens, bit for bit as it was', () => {
    const water = plume(false);
    expect(ride(water, 0, 120, false, drained(water), 'landing')).toBe('76f50f33df7c82ff');
    const canyon = plume(true);
    expect(ride(canyon, 0, 120, false, drained(canyon), 'landing')).toBe('a340d8e6fc12aecd');
    const held = plume(false, 'old');
    expect(ride(held, 0, 120, false, drained(held), 'landing')).toBe('4932645fb9d072d5');
    const canyonHeld = plume(true, 'old');
    expect(ride(canyonHeld, 0, 120, false, drained(canyonHeld), 'landing')).toBe('8790302abf748303');
  });

  it('leaves a standing rider down a wave face bit for bit as it was', () => {
    const water = new FaceWater({ depth: 2, height: 1.2, slope: 25 });
    expect(ride(water, 0.6, 180, false, () => [], 'standing')).toBe('e9c8f8116dfc1253');
  });

  it('leaves a paddler meeting a broken wave on the duck-dive bore bit for bit as it was', () => {
    const water = new BoreWater({ depth: 2.5, height: 1.2, frontZ: -12 });
    expect(ride(water, Math.PI, 300, true, () => [water.reaction.x, water.reaction.y, water.reaction.z])).toBe('370592cdc64117bb');
    const before = new BoreWater({ depth: 2.5, height: 1.2, frontZ: -12 });
    expect(ride(before, Math.PI, 300, true, () => [before.reaction.x, before.reaction.y, before.reaction.z], 'prone', 'old')).toBe('8980791094de0a00');
  });
});
