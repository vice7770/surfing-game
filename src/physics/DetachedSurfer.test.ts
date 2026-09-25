import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  DetachedSurfer, type BoardContactBody, type BodyWaterField, type BodyWaterSample,
} from './DetachedSurfer';

class TestBoard implements BoardContactBody {
  readonly position = new Vector3();
  readonly orientation = new Quaternion();
  readonly halfExtents = new Vector3(0.55, 0.05, 1.1);
  readonly inverseMass = 1 / 3;
  readonly velocity = new Vector3();
  readonly angularVelocity = new Vector3();
  private readonly inverseInertia = 0.5;

  velocityAt(worldPoint: Readonly<Vector3>, out: Vector3): Vector3 {
    return out.copy(this.angularVelocity).cross(
      new Vector3().subVectors(worldPoint, this.position),
    ).add(this.velocity);
  }

  inverseEffectiveMass(worldPoint: Readonly<Vector3>, normal: Readonly<Vector3>): number {
    const torqueAxis = new Vector3().subVectors(worldPoint, this.position).cross(normal);
    return this.inverseMass + torqueAxis.lengthSq() * this.inverseInertia;
  }

  applyImpulse(impulse: Readonly<Vector3>, worldPoint: Readonly<Vector3>): void {
    const torque = new Vector3().subVectors(worldPoint, this.position).cross(impulse);
    this.velocity.addScaledVector(impulse, this.inverseMass);
    this.angularVelocity.addScaledVector(torque, this.inverseInertia);
  }
}

function uniformWater(flow = new Vector3(), bedY = -10, breaking = 0): BodyWaterField {
  return {
    sampleAt(_position: Readonly<Vector3>, out: BodyWaterSample): void {
      out.surfaceY = 0;
      out.bedY = bedY;
      out.flow.copy(flow);
      out.wet = true;
      out.outsideDomain = false;
      out.breaking = breaking;
    },
  };
}

function launch(body: DetachedSurfer, center = new Vector3(0, -1.5, 0),
  velocity = new Vector3(), angularVelocity = new Vector3()): void {
  body.start({ center, orientation: new Quaternion(), velocity, angularVelocity });
}

function advance(body: DetachedSurfer, water: BodyWaterField, frames: number,
  stroke = false, steer = 0): void {
  for (let frame = 0; frame < frames; frame += 1) {
    body.step(1 / 60, water, { stroke, steer });
  }
}

describe('DetachedSurfer on controlled water', () => {
  it('starts at the attached center of mass with continuous point velocities and momentum', () => {
    const body = new DetachedSurfer();
    const center = new Vector3(4, 1, -2);
    const velocity = new Vector3(3, -0.5, 1);
    const angularVelocity = new Vector3(0.7, 1.1, -0.4);
    body.start({ center, velocity, angularVelocity,
      orientation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.7) });

    expect(body.centerOfMass().distanceTo(center)).toBeLessThan(1e-12);
    expect(body.linearMomentum().distanceTo(velocity.clone().multiplyScalar(body.mass))).toBeLessThan(1e-10);
    expect(body.angularMomentum().length()).toBeGreaterThan(0);
    for (const node of body.nodes) {
      const expected = velocity.clone().add(
        angularVelocity.clone().cross(node.position.clone().sub(center)),
      );
      expect(node.velocity.distanceTo(expected)).toBeLessThan(1e-12);
    }
  });

  it('drifts in the direction of local water flow and separates from the no-flow trace', () => {
    const following = new DetachedSurfer();
    const opposing = new DetachedSurfer();
    const still = new DetachedSurfer();
    for (const body of [following, opposing, still]) launch(body);
    advance(following, uniformWater(new Vector3(2, 0, 0)), 90);
    advance(opposing, uniformWater(new Vector3(-2, 0, 0)), 90);
    advance(still, uniformWater(), 90);

    expect(following.centerOfMass().x).toBeGreaterThan(still.centerOfMass().x + 0.2);
    expect(opposing.centerOfMass().x).toBeLessThan(still.centerOfMass().x - 0.2);
  });

  it('turns when upper and lower body points meet different currents', () => {
    const body = new DetachedSurfer();
    launch(body);
    const shear: BodyWaterField = {
      sampleAt(position, out): void {
        out.surfaceY = 0;
        out.bedY = -10;
        out.flow.set(position.y > -1.4 ? 2 : -2, 0, 0);
        out.wet = true;
        out.outsideDomain = false;
        out.breaking = 0;
      },
    };
    advance(body, shear, 45);

    expect(Math.abs(body.angularMomentum().z)).toBeGreaterThan(0.1);
  });

  it('keeps a struck head within a broad neck angle instead of folding through the torso', () => {
    const body = new DetachedSurfer();
    launch(body);
    body.nodes[2].velocity.y = -15;
    let smallestAngle = 180;
    for (let frame = 0; frame < 45; frame += 1) {
      body.step(1 / 60, uniformWater());
      const torso = body.nodes[1].position;
      const towardPelvis = body.nodes[0].position.clone().sub(torso).normalize();
      const towardHead = body.nodes[2].position.clone().sub(torso).normalize();
      smallestAngle = Math.min(smallestAngle,
        Math.acos(Math.max(-1, Math.min(1, towardPelvis.dot(towardHead)))) * 180 / Math.PI);
    }
    expect(smallestAngle).toBeGreaterThan(115);
  });

  it('uses displaced volume so a buoyant body rises relative to a dense body', () => {
    const buoyant = new DetachedSurfer(900);
    const dense = new DetachedSurfer(1100);
    launch(buoyant, new Vector3(0, -3, 0));
    launch(dense, new Vector3(0, -3, 0));
    advance(buoyant, uniformWater(), 90);
    advance(dense, uniformWater(), 90);

    expect(buoyant.centerOfMass().y).toBeGreaterThan(dense.centerOfMass().y + 0.4);
    expect(buoyant.nodes.every((node) => node.submersion > 0)).toBe(true);
  });

  it('keeps every body point above the seabed during a downward impact', () => {
    const body = new DetachedSurfer();
    launch(body, new Vector3(0, 1.5, 0), new Vector3(0, -9, 0));
    const water = uniformWater(new Vector3(), -1);
    let contacted = false;
    for (let frame = 0; frame < 100; frame += 1) {
      body.step(1 / 60, water);
      contacted ||= body.nodes.some((node) => node.grounded);
      for (const node of body.nodes) {
        expect(node.position.y - node.radius).toBeGreaterThanOrEqual(-1 - 1e-9);
      }
    }

    expect(contacted).toBe(true);
    for (const node of body.nodes) {
      expect(Number.isFinite(node.velocity.length())).toBe(true);
    }
    expect(body.active).toBe(true);
  });

  it('moves through strokes rather than assigning a swim velocity', () => {
    const swimming = new DetachedSurfer();
    const passive = new DetachedSurfer();
    launch(swimming);
    launch(passive);
    const water = uniformWater();
    advance(swimming, water, 120, true);
    advance(passive, water, 120);

    expect(swimming.centerOfMass().z).toBeGreaterThan(passive.centerOfMass().z + 0.05);
    expect(swimming.controlGain).toBeGreaterThan(0.5);
  });

  it('suppresses swim control under strong breaking and replays exactly', () => {
    const first = new DetachedSurfer();
    const second = new DetachedSurfer();
    launch(first);
    launch(second);
    const breakingWater = uniformWater(new Vector3(), -10, 1);
    advance(first, breakingWater, 90, true, 1);
    advance(second, breakingWater, 90, true, 1);

    expect(first.controlGain).toBe(0);
    expect(first.nodes.map((node) => [...node.position.toArray(), ...node.velocity.toArray()]))
      .toEqual(second.nodes.map((node) => [...node.position.toArray(), ...node.velocity.toArray()]));
  });

  it('marks an outside-domain body without using an edge-cell current', () => {
    const body = new DetachedSurfer();
    launch(body);
    const outside: BodyWaterField = {
      sampleAt(_position, out): void {
        out.surfaceY = 100;
        out.bedY = -100;
        out.flow.set(100, 0, 0);
        out.wet = true;
        out.outsideDomain = true;
        out.breaking = 1;
      },
    };
    advance(body, outside, 30);

    expect(body.outsideDomain).toBe(true);
    expect(Math.abs(body.centerOfMass().x)).toBeLessThan(1e-9);
    expect(body.nodes.every((node) => node.submersion === 0)).toBe(true);
  });

  it('does not use water velocity in a dry cell', () => {
    const body = new DetachedSurfer();
    launch(body, new Vector3(0, 2, 0));
    const dry: BodyWaterField = {
      sampleAt(_position, out): void {
        out.surfaceY = 100;
        out.bedY = -10;
        out.flow.set(100, 0, 0);
        out.wet = false;
        out.outsideDomain = false;
        out.breaking = 0;
      },
    };
    advance(body, dry, 30);

    expect(Math.abs(body.centerOfMass().x)).toBeLessThan(1e-9);
    expect(body.nodes.every((node) => node.submersion === 0)).toBe(true);
  });

  it('transfers equal and opposite impact momentum to a movable board', () => {
    const body = new DetachedSurfer();
    launch(body, new Vector3(0.28, 1.2, 0), new Vector3(0, -8, 0));
    const board = new TestBoard();
    let contacted = false;
    for (let frame = 0; frame < 30; frame += 1) {
      body.step(1 / 60, uniformWater(new Vector3(), -10));
      const before = body.linearMomentum().addScaledVector(board.velocity, 1 / board.inverseMass);
      const count = body.resolveBoardContact(board);
      if (count === 0) continue;
      const after = body.linearMomentum().addScaledVector(board.velocity, 1 / board.inverseMass);
      expect(after.distanceTo(before)).toBeLessThan(1e-8);
      contacted = true;
      break;
    }
    expect(contacted).toBe(true);
    expect(board.velocity.y).toBeLessThan(0);
    expect(Math.abs(board.angularVelocity.z)).toBeGreaterThan(0);
  });

  it('catches a fast surfer crossing the thin board in one step', () => {
    const body = new DetachedSurfer();
    launch(body, new Vector3(0, 1.6, 0), new Vector3(0, -150, 0));
    const board = new TestBoard();
    body.step(1 / 60, uniformWater(new Vector3(), -10));

    expect(body.resolveBoardContact(board)).toBeGreaterThan(0);
    expect(board.velocity.y).toBeLessThan(0);
    const velocityAfterContact = board.velocity.clone();
    expect(body.resolveBoardContact(board)).toBe(0);
    expect(board.velocity.equals(velocityAfterContact)).toBe(true);
  });

  it('transfers sideways momentum during a glancing board impact', () => {
    const body = new DetachedSurfer();
    launch(body, new Vector3(0, 1.2, 0), new Vector3(2, -8, 0));
    const board = new TestBoard();
    let contacted = false;
    for (let frame = 0; frame < 30; frame += 1) {
      body.step(1 / 60, uniformWater(new Vector3(), -10));
      const before = body.linearMomentum().addScaledVector(board.velocity, 1 / board.inverseMass);
      if (body.resolveBoardContact(board) === 0) continue;
      const after = body.linearMomentum().addScaledVector(board.velocity, 1 / board.inverseMass);
      expect(after.distanceTo(before)).toBeLessThan(1e-8);
      contacted = true;
      break;
    }
    expect(contacted).toBe(true);
    expect(board.velocity.x).toBeGreaterThan(0);
  });
});
