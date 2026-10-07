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
function ride(water: SurfWater, heading: number, steps: number, paddle: boolean, reactions: () => number[], start: Start = 'prone'): string {
  const session = new RideSession();
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
function plume(roller: boolean): PhysicalSurfWater {
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
    expect(ride(water, 0, 180, false, drained(water))).toBe('f986e92101dc4f34');
    const paddling = plume(false);
    expect(ride(paddling, Math.PI, 180, true, drained(paddling))).toBe('655c590b740a3445');
  });

  it('leaves a prone rider at the Canyon, in broken water outside any lens, bit for bit as it was', () => {
    const water = plume(true);
    expect(ride(water, 0, 180, false, drained(water))).toBe('5dd0d8aa28c12675');
  });

  it('leaves a board landing hard, in a plume and at the Canyon outside any lens, bit for bit as it was', () => {
    const water = plume(false);
    expect(ride(water, 0, 120, false, drained(water), 'landing')).toBe('00636756353438e0');
    const canyon = plume(true);
    expect(ride(canyon, 0, 120, false, drained(canyon), 'landing')).toBe('e10779712b438b01');
  });

  it('leaves a standing rider down a wave face bit for bit as it was', () => {
    const water = new FaceWater({ depth: 2, height: 1.2, slope: 25 });
    expect(ride(water, 0.6, 180, false, () => [], 'standing')).toBe('70e814f4d3a6ebfa');
  });

  it('leaves a paddler meeting a broken wave on the duck-dive bore bit for bit as it was', () => {
    const water = new BoreWater({ depth: 2.5, height: 1.2, frontZ: -12 });
    expect(ride(water, Math.PI, 300, true, () => [water.reaction.x, water.reaction.y, water.reaction.z])).toBe('c00f4f9655ac20a9');
  });
});
