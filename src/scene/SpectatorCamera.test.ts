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
