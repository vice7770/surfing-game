import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SWING_EASE, SWING_RATE, SpectatorCamera, swingRate, type FollowTarget, type SpectatorScene } from './SpectatorCamera';

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

describe('SpectatorCamera swing (the owner, 2026-10-22: the right stick across)', () => {
  const focus = { x: 0, z: -60 };
  const degrees = (radians: number) => (radians * 180) / Math.PI;
  /** Horizontal distance from the camera to a point. */
  const across = (spectator: SpectatorCamera, point: { x: number; z: number }) =>
    Math.hypot(spectator.camera.position.x - point.x, spectator.camera.position.z - point.z);
  /** A camera settled on a rider still at `position` in `view`. */
  const settledOn = (view: 'front' | 'behind' | 'side', target: FollowTarget, ground: SpectatorScene = scene) => {
    const spectator = new SpectatorCamera();
    spectator.setView(view);
    for (let i = 0; i < 240; i += 1) spectator.update(ground, focus, 1 / 60, target);
    return spectator;
  };
  /** Frames of real time with the stick held at `stick`: the swing steered, then the camera updated. */
  const hold = (spectator: SpectatorCamera, stick: number, seconds: number, target?: FollowTarget, ground: SpectatorScene = scene) => {
    for (let i = 0; i < Math.round(seconds * 60); i += 1) {
      spectator.steerSwing(stick, 1 / 60);
      spectator.update(ground, focus, 1 / 60, target);
    }
  };

  it('maps the stick to a swing rate: about 90°/s at full stick, proportional below, nothing at rest', () => {
    expect(degrees(SWING_RATE)).toBeCloseTo(90, 9);
    expect(degrees(SWING_RATE)).toBeGreaterThanOrEqual(60);
    expect(degrees(SWING_RATE)).toBeLessThanOrEqual(120);
    expect(swingRate(1)).toBeCloseTo(SWING_RATE, 12);
    expect(swingRate(-0.5)).toBeCloseTo(-SWING_RATE / 2, 12);
    expect(swingRate(0)).toBe(0);
    expect(swingRate(3)).toBeCloseTo(SWING_RATE, 12);
    expect(swingRate(Number.NaN)).toBe(0);
  });

  it('swings at the stick\'s rate, easing in and out over about 0.15 s', () => {
    const target = { position: { x: 0, y: 0, z: -50 }, heading: 0 };
    const spectator = settledOn('front', target);
    hold(spectator, 1, 1, target);
    // The ramp loses about half the ease's time: 90°/s × (1 − 0.075) s, to a frame's stepping.
    expect(Math.abs(degrees(spectator.swing) - 90 * (1 - SWING_EASE / 2))).toBeLessThan(1.5);
    const before = spectator.swing;
    hold(spectator, 1, 0.5, target);
    expect(degrees(spectator.swing - before)).toBeCloseTo(45, 6);
    // Half stick, half the rate (after the ease down).
    hold(spectator, 0.5, 0.5, target);
    const half = spectator.swing;
    hold(spectator, 0.5, 0.5, target);
    expect(degrees(spectator.swing - half)).toBeCloseTo(22.5, 6);
    // Let go: it slows to a stop within the ease, and then holds.
    hold(spectator, 0, SWING_EASE + 1 / 60, target);
    const stopped = spectator.swing;
    hold(spectator, 0, 1, target);
    expect(spectator.swing).toBe(stopped);
    // No jerk: one frame's step never jumps by more than the full rate allows.
    const fresh = settledOn('front', target);
    fresh.steerSwing(1, 1 / 60);
    expect(degrees(fresh.swing)).toBeLessThan(90 / 60 / 4);
  });

  it('moves the camera to its right for a push right, round the rider at the view\'s distance and height', () => {
    for (const view of ['front', 'behind', 'side'] as const) {
      const target = { position: { x: 0, y: 0, z: -50 }, heading: 0.4 };
      const spectator = settledOn(view, target);
      spectator.camera.updateMatrixWorld();
      const right = new Vector3().setFromMatrixColumn(spectator.camera.matrixWorld, 0);
      const start = spectator.camera.position.clone();
      const distance = across(spectator, target.position);
      const height = start.y;
      spectator.steerSwing(1, 0.2);
      spectator.update(scene, focus, 1 / 60, target);
      expect(spectator.camera.position.clone().sub(start).dot(right), view).toBeGreaterThan(0);
      // Swung a quarter turn and settled: the same distance and height, the rider still where the view looks.
      const quarter = settledOn(view, target);
      hold(quarter, 1, 0.98 + SWING_EASE / 2, target);
      hold(quarter, 0, 2, target);
      expect(degrees(quarter.swing), view).toBeGreaterThan(80);
      expect(across(quarter, target.position), view).toBeCloseTo(distance, 3);
      expect(quarter.camera.position.y, view).toBeCloseTo(height, 6);
      const toRider = new Vector3(target.position.x, target.position.y, target.position.z).sub(quarter.camera.position).normalize();
      const look = quarter.camera.getWorldDirection(new Vector3());
      expect(degrees(look.angleTo(toRider)), view).toBeLessThan(30);
    }
  });

  it('holds the view\'s distance while swinging, instead of cutting inside the circle', () => {
    const target = { position: { x: 0, y: 0, z: -50 }, heading: 0 };
    const spectator = settledOn('side', target);
    const distance = across(spectator, target.position);
    let nearest = distance;
    for (let i = 0; i < 180; i += 1) {
      hold(spectator, 1, 1 / 60, target);
      nearest = Math.min(nearest, across(spectator, target.position));
    }
    expect(nearest).toBeGreaterThan(distance * 0.999);
  });

  it('wraps round the full circle without a jump, the framing following the wrapped angle', () => {
    const target = { position: { x: 0, y: 0, z: -50 }, heading: 0 };
    const spectator = settledOn('front', target);
    const previous = spectator.camera.position.clone();
    let biggestStep = 0;
    let sawHalfTurn = false;
    let sawWrap = false;
    // 5 s at full stick: more than a whole turn.
    for (let i = 0; i < 300; i += 1) {
      hold(spectator, 1, 1 / 60, target);
      expect(Math.abs(spectator.swing)).toBeLessThanOrEqual(Math.PI);
      if (spectator.swing > 3) sawHalfTurn = true;
      if (sawHalfTurn && spectator.swing < -3) sawWrap = true;
      biggestStep = Math.max(biggestStep, spectator.camera.position.distanceTo(previous));
      previous.copy(spectator.camera.position);
    }
    expect(sawWrap).toBe(true);
    // 1.5° a frame on the front view's 10.3 m arm: about 0.27 m.
    expect(biggestStep).toBeLessThan(0.3);
    hold(spectator, 0, 2, target);
    // Its arm from the rider (5 m aside, 9 m shoreward), turned by the wrapped swing.
    const angle = spectator.swing;
    expect(spectator.camera.position.x).toBeCloseTo(target.position.x - 5 * Math.cos(angle) + 9 * Math.sin(angle), 2);
    expect(spectator.camera.position.z).toBeCloseTo(target.position.z + 5 * Math.sin(angle) + 9 * Math.cos(angle), 2);
  });

  it('keeps clear of the water where the swung camera stands', () => {
    // A wave face standing up seaward of the rider: 4 m high wherever z < −52.
    const wave = { heightAt: (_x: number, z: number) => (z < -52 ? 4 : 0.2), bedAt: () => -3 };
    const target = { position: { x: 0, y: 0, z: -50 }, heading: 0 };
    const spectator = settledOn('front', target, wave);
    expect(spectator.camera.position.y).toBeLessThan(4);
    // Swung half a turn, the front view stands seaward of the rider, over the face.
    hold(spectator, 1, 2 + SWING_EASE / 2, target, wave);
    hold(spectator, 0, 3, target, wave);
    expect(Math.abs(degrees(spectator.swing))).toBeGreaterThan(150);
    expect(spectator.camera.position.z).toBeLessThan(-52);
    expect(spectator.camera.position.y).toBeGreaterThan(4 + 1.4);
  });

  it('holds the swing through every stage, until the view changes, where each view starts from its own framing', () => {
    const paddling = { position: { x: 0, y: 0, z: -50 }, heading: 0 };
    const spectator = settledOn('behind', paddling);
    hold(spectator, -1, 0.6, paddling);
    hold(spectator, 0, 0.5, paddling);
    const swung = spectator.swing;
    expect(degrees(swung)).toBeLessThan(-30);
    // Riding fast, a fall (the body in the water a few metres off), no board for a moment, back in the lineup:
    // the stages change what the view follows, never the swing.
    hold(spectator, 0, 1, { position: { x: 4, y: 0.8, z: -44 }, heading: 1.2, velocity: { x: 6, y: 0, z: 4 } });
    hold(spectator, 0, 1, { position: { x: 7, y: -0.3, z: -42 }, heading: 2.5 });
    // With no board to follow, the stick does nothing.
    spectator.update(scene, focus, 1 / 60);
    hold(spectator, 0.7, 0.5);
    hold(spectator, 0, 1, paddling);
    expect(spectator.swing).toBe(swung);
    // The camera button: the next view starts unswung, at its own framing, and so does the one after.
    spectator.setView('side');
    expect(spectator.swing).toBe(0);
    spectator.update(scene, focus, 1 / 60, paddling);
    expect(spectator.camera.position.x).toBeCloseTo(paddling.position.x - 14, 9);
    expect(spectator.camera.position.z).toBeCloseTo(paddling.position.z, 9);
    hold(spectator, 1, 0.5, paddling);
    spectator.setView('overview');
    expect(spectator.swing).toBe(0);
  });

  it('leaves the views that do not follow the rider alone', () => {
    const spectator = new SpectatorCamera();
    spectator.setView('overview');
    hold(spectator, 1, 1, { position: { x: 0, y: 0, z: -50 }, heading: 0 });
    expect(spectator.swing).toBe(0);
    expect(spectator.camera.position.toArray()).toEqual([70, 16, 35]);
  });
});
