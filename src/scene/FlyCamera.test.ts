import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { FLY_IDLE, FLY_SPEED, FlyCamera, type FlyBounds } from './FlyCamera';

const open: FlyBounds = { xMin: -1000, xMax: 1000, zMin: -1000, zMax: 1000, yMax: 120, floor: () => -50 };
const run = (fly: FlyCamera, seconds: number, control = FLY_IDLE, bounds = open) => {
  for (let t = 0; t < seconds; t += 1 / 60) fly.update(1 / 60, control, bounds);
};

describe('FlyCamera', () => {
  it('looks along +z at yaw 0 and along +x at a quarter turn', () => {
    const fly = new FlyCamera();
    expect(fly.forward(new Vector3()).z).toBeCloseTo(1, 6);
    fly.update(0, { ...FLY_IDLE, yaw: Math.PI / 2 }, open);
    expect(fly.forward(new Vector3()).x).toBeCloseTo(1, 6);
  });

  it('clamps the pitch at ±85°', () => {
    const fly = new FlyCamera();
    fly.update(0, { ...FLY_IDLE, pitch: 3 }, open);
    expect(fly.pitch).toBeCloseTo((85 * Math.PI) / 180, 6);
    fly.update(0, { ...FLY_IDLE, pitch: -6 }, open);
    expect(fly.pitch).toBeCloseTo((-85 * Math.PI) / 180, 6);
  });

  it('eases up to the base speed along the view, and four times that when fast', () => {
    const fly = new FlyCamera();
    fly.update(1 / 60, { ...FLY_IDLE, forward: 1 }, open);
    const first = fly.position.z;
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(FLY_SPEED.base / 60);
    const slow = new FlyCamera();
    run(slow, 2, { ...FLY_IDLE, forward: 1 });
    const fast = new FlyCamera();
    run(fast, 2, { ...FLY_IDLE, forward: 1, fast: true });
    expect(fast.position.z / slow.position.z).toBeGreaterThan(3.5);
    expect(slow.position.z).toBeGreaterThan(FLY_SPEED.base * 1.6);
  });

  it('strafes to the screen right and rises straight up', () => {
    const fly = new FlyCamera();
    run(fly, 1, { ...FLY_IDLE, strafe: 1, rise: 1 });
    // Facing +z, the screen's right is −x.
    expect(fly.position.x).toBeLessThan(-2);
    expect(fly.position.y).toBeGreaterThan(2);
  });

  it('stays inside the bounds and above the floor', () => {
    const fly = new FlyCamera();
    const box: FlyBounds = { xMin: -5, xMax: 5, zMin: -5, zMax: 5, yMax: 3, floor: () => -1 };
    run(fly, 5, { ...FLY_IDLE, forward: 1, fast: true }, box);
    expect(fly.position.z).toBeCloseTo(5, 6);
    run(fly, 5, { ...FLY_IDLE, rise: -1, fast: true }, box);
    expect(fly.position.y).toBeCloseTo(-1 + 0.3, 6);
    run(fly, 5, { ...FLY_IDLE, rise: 1, fast: true }, box);
    expect(fly.position.y).toBeCloseTo(3, 6);
  });

  it('scales its speed by wheel notches within 1–40 m/s', () => {
    const fly = new FlyCamera();
    fly.scaleSpeed(1);
    expect(fly.speed).toBeCloseTo(FLY_SPEED.base * 1.25, 6);
    fly.scaleSpeed(100);
    expect(fly.speed).toBe(FLY_SPEED.max);
    fly.scaleSpeed(-100);
    expect(fly.speed).toBe(FLY_SPEED.min);
  });

  it('points at a target and writes the camera', () => {
    const fly = new FlyCamera();
    fly.lookAt(new Vector3(0, 10, 0), new Vector3(10, 0, 0));
    expect(fly.yaw).toBeCloseTo(Math.PI / 2, 6);
    expect(fly.pitch).toBeCloseTo(-Math.PI / 4, 6);
    const camera = new PerspectiveCamera();
    fly.applyTo(camera);
    camera.updateMatrixWorld();
    const look = camera.getWorldDirection(new Vector3());
    expect(look.x).toBeCloseTo(Math.SQRT1_2, 5);
    expect(look.y).toBeCloseTo(-Math.SQRT1_2, 5);
  });
});
