import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BoardBody, type BoardPayload } from './BoardBody';
import { REFERENCE_RIDER } from './boardReference';
import type { SurfWater, WaterSample } from './SurfWater';

class StillWater implements SurfWater {
  surfaceAt(): number { return 0; }
  sampleAt(_x: number, _y: number, _z: number, out: WaterSample): WaterSample {
    Object.assign(out, {
      surfaceY: 0, stillDepth: 3, waterDepth: 3, bedY: -3,
      wet: true, outsideDomain: false, slopeX: 0, slopeZ: 0,
      normalX: 0, normalY: 1, normalZ: 0,
      flowX: 0, flowY: 0, flowZ: 0, regime: 'profile', breaking: 0,
    });
    return out;
  }
  addReaction(): void {}
}

const STEP = 1 / 60;

function boardWithLoad(x: number, z: number): BoardBody {
  const payloads: BoardPayload[] = [{
    mass: REFERENCE_RIDER.mass,
    point: { x, y: 0.8, z },
  }];
  const board = new BoardBody({ payloads });
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0));
  board.velocity.z = 6;
  return board;
}

function tow(board: BoardBody, seconds: number): void {
  const water = new StillWater();
  for (let step = 0; step < Math.round(seconds / STEP); step += 1) {
    board.step(STEP, water);
    board.velocity.z = 6;
  }
}

describe('maneuver force paths', () => {
  it('fore and aft rider load changes pitch through hull support', () => {
    const aft = boardWithLoad(0, -0.35);
    const forward = boardWithLoad(0, 0.2);
    tow(aft, 1);
    tow(forward, 1);
    const aftUp = new Vector3(0, 1, 0).applyQuaternion(aft.orientation);
    const forwardUp = new Vector3(0, 1, 0).applyQuaternion(forward.orientation);
    expect(Math.abs(aftUp.z - forwardUp.z)).toBeGreaterThan(0.01);
    expect(aft.forces.pressure.y).toBeGreaterThan(0);
    expect(forward.forces.pressure.y).toBeGreaterThan(0);
  });

  it('opposite rail loads produce opposite roll without inventing a fin turn', () => {
    const left = boardWithLoad(-0.1, -0.1);
    const right = boardWithLoad(0.1, -0.1);
    tow(left, 0.5);
    tow(right, 0.5);
    const leftUp = new Vector3(0, 1, 0).applyQuaternion(left.orientation);
    const rightUp = new Vector3(0, 1, 0).applyQuaternion(right.orientation);
    expect(leftUp.x * rightUp.x).toBeLessThan(0);
    expect(Math.abs(leftUp.x)).toBeGreaterThan(0.005);
    expect(Math.abs(rightUp.x)).toBeGreaterThan(0.005);
  });

});
