import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SpectatorCamera } from './SpectatorCamera';

const scene = { heightAt: () => 0.2, bedAt: () => -3 };

describe('SpectatorCamera', () => {
  it('frames the break from the cliff, at the water line, and from below the surface', () => {
    const spectator = new SpectatorCamera();
    const focus = { x: 5, z: -60 };
    spectator.update(scene, focus, 1 / 60);
    expect(spectator.camera.position.y).toBeGreaterThan(10);
    spectator.setView('profile');
    spectator.update(scene, focus, 1 / 60);
    expect(spectator.camera.position.y).toBeCloseTo(1.4, 9);
    spectator.setView('below');
    spectator.update(scene, focus, 1 / 60);
    expect(spectator.camera.position.y).toBeLessThan(0.2 - 0.5);
    expect(spectator.camera.position.y).toBeGreaterThan(-3);
  });

  it('drifts along the break in the cinematic view, above the water and looking out to sea', () => {
    const spectator = new SpectatorCamera();
    const focus = { x: 5, z: -60 };
    spectator.setView('cinematic');
    spectator.update(scene, focus, 1 / 60);
    const first = spectator.camera.position.clone();
    expect(first.y).toBeGreaterThan(0.2 + 5);
    for (let i = 0; i < 600; i += 1) spectator.update(scene, focus, 1 / 60);
    expect(spectator.camera.position.distanceTo(first)).toBeGreaterThan(1);
    expect(spectator.camera.position.y).toBeGreaterThan(0.2 + 5);
    expect(spectator.camera.getWorldDirection(new Vector3()).z).toBeLessThan(0);
  });

  it('holds the cinematic view still under reduced motion', () => {
    const spectator = new SpectatorCamera();
    const focus = { x: 5, z: -60 };
    spectator.setReducedMotion(true);
    spectator.setView('cinematic');
    spectator.update(scene, focus, 1 / 60);
    const first = spectator.camera.position.clone();
    for (let i = 0; i < 600; i += 1) spectator.update(scene, focus, 1 / 60);
    expect(spectator.camera.position.distanceTo(first)).toBeLessThan(1e-9);
  });
});

describe('SpectatorCamera front ride view', () => {
  const focus = { x: 0, z: -60 };
  const offset = (spectator: SpectatorCamera, position: { x: number; y: number; z: number }) =>
    ({ x: spectator.camera.position.x - position.x, y: spectator.camera.position.y - position.y, z: spectator.camera.position.z - position.z });

  it('keeps up with a fast rider instead of trailing it', () => {
    const spectator = new SpectatorCamera();
    spectator.setView('front');
    const position = { x: 0, y: 0, z: -50 };
    for (let i = 0; i < 120; i += 1) spectator.update(scene, focus, 1 / 60, { position, heading: 0, velocity: { x: 0, y: 0, z: 0 } });
    const rest = offset(spectator, position);
    const velocity = { x: 10, y: 0, z: 0 };
    for (let i = 0; i < 300; i += 1) {
      position.x += velocity.x / 60;
      spectator.update(scene, focus, 1 / 60, { position, heading: 0, velocity });
    }
    const moving = offset(spectator, position);
    expect(Math.hypot(moving.x - rest.x, moving.y - rest.y, moving.z - rest.z)).toBeLessThan(0.5);
  });

  it('holds its height while the rider drops down a face', () => {
    const spectator = new SpectatorCamera();
    spectator.setView('front');
    const position = { x: 0, y: 1, z: -50 };
    for (let i = 0; i < 120; i += 1) spectator.update(scene, focus, 1 / 60, { position, heading: 0 });
    const before = spectator.camera.position.y;
    for (let i = 0; i < 60; i += 1) {
      position.y -= 2 / 60;
      spectator.update(scene, focus, 1 / 60, { position, heading: 0, velocity: { x: 0, y: -2, z: 0 } });
    }
    expect(before - spectator.camera.position.y).toBeLessThan(0.8);
  });

  it('looks up toward a crest above the rider, keeping the lip in frame', () => {
    const look = (crest?: { x: number; y: number; z: number }) => {
      const spectator = new SpectatorCamera();
      spectator.setView('front');
      const position = { x: 0, y: 0, z: -50 };
      for (let i = 0; i < 120; i += 1) spectator.update(scene, focus, 1 / 60, { position, heading: 0, crest });
      return spectator.camera.getWorldDirection(new Vector3());
    };
    expect(look({ x: 0, y: 1.8, z: -54 }).y).toBeGreaterThan(look().y);
  });

  it('holds its aim steady while waves pass a rider waiting in the lineup', () => {
    // The wave gauge reports a crest only from 40 m seaward of the rider to 12 m shoreward of it:
    // each wave appears at one end of that window and disappears at the other.
    const spectator = new SpectatorCamera();
    spectator.setView('front');
    const position = { x: 0, y: 0, z: -50 };
    const direction = new Vector3();
    const previous = new Vector3();
    let steepest = 0;
    for (let frame = 0; frame < 60 * 30; frame += 1) {
      const t = frame / 60;
      // A wave every 10 s, its crest travelling shoreward (+z) at 5 m/s.
      const crestZ = position.z - 45 + 5 * (t % 10);
      const seen = crestZ >= position.z - 40 && crestZ <= position.z + 12;
      const crest = seen ? { x: 0, y: 1.5, z: crestZ } : undefined;
      spectator.update(scene, focus, 1 / 60, { position, heading: 0, velocity: { x: 0, y: 0, z: 0 }, crest });
      spectator.camera.getWorldDirection(direction);
      if (frame > 0) steepest = Math.max(steepest, (direction.angleTo(previous) * 180) / Math.PI);
      previous.copy(direction);
    }
    expect(steepest).toBeLessThan(0.5);
  });

  it('eases off a crest the gauge stops seeing, instead of cutting away from it', () => {
    // A face that shrinks below the gauge's least wave height vanishes wherever it is.
    const spectator = new SpectatorCamera();
    spectator.setView('front');
    const position = { x: 0, y: 0, z: -50 };
    const direction = new Vector3();
    const previous = new Vector3();
    let steepest = 0;
    for (let frame = 0; frame < 240; frame += 1) {
      const crest = frame < 120 ? { x: 0, y: 0.6, z: position.z - 1.5 } : undefined;
      spectator.update(scene, focus, 1 / 60, { position, heading: 0, velocity: { x: 0, y: 0, z: 0 }, crest });
      spectator.camera.getWorldDirection(direction);
      if (frame > 0) steepest = Math.max(steepest, (direction.angleTo(previous) * 180) / Math.PI);
      previous.copy(direction);
    }
    expect(steepest).toBeLessThan(0.5);
  });
});

describe('SpectatorCamera free view', () => {
  it('leaves the camera where its owner put it', () => {
    const spectator = new SpectatorCamera();
    spectator.setView('free');
    spectator.camera.position.set(3, 4, 5);
    spectator.update(scene, { x: 0, z: 0 }, 1 / 60);
    expect(spectator.camera.position.toArray()).toEqual([3, 4, 5]);
  });

  it('still cuts straight to a jump point', () => {
    const spectator = new SpectatorCamera();
    spectator.setView('overview');
    spectator.update(scene, { x: 0, z: 0 }, 1 / 60);
    expect(spectator.camera.position.toArray()).toEqual([70, 16, 95]);
  });
});
