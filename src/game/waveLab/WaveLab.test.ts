import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { FLY_IDLE } from '../../scene/FlyCamera';
import { SpectatorCamera, type SpectatorView } from '../../scene/SpectatorCamera';
import type { SurfZoneStatus } from '../../wave/SurfZoneRunner';
import { WaveLab, type LabSea } from './WaveLab';

/** A sea whose one swell runs shoreward at 5 m/s: crest at z = −60 + 5 t (wavelength 60 m). */
function fakeSea(clock: { t: number }): LabSea {
  const height = (_x: number, z: number) => 0.8 * Math.cos((2 * Math.PI * (z - (-60 + 5 * clock.t))) / 60);
  const grid = { xMin: -80, zMin: -330, spacing: 1, nx: 161, nz: 361 };
  const status = {
    breaker: { value: 0.6, type: 'plunging' }, breakingFraction: 0.2, timeToSet: 30,
    peel: { angleDegrees: 50, direction: 1, peelSpeed: 6, columns: 40, fit: 0.9 },
  } as unknown as SurfZoneStatus;
  return {
    host: {
      init: { grid, bed: new Float32Array(grid.nx * grid.nz).fill(-5), focus: { x: 0, z: -60 }, windowXMin: -80, dx: 1 },
      snapshot: { surface: new Float32Array(grid.nx * grid.nz * 2), status },
      heightAt: height,
      bedAt: () => -5,
    },
    camera: new SpectatorCamera(),
    focus: { x: 0, z: -60 },
    idleView: 'overview' as SpectatorView,
    config: { peakPeriod: 12 },
    practice: false,
  };
}

describe('WaveLab', () => {
  it('starts free-flying from the overview, the sea running at full speed', () => {
    const lab = new WaveLab();
    const sea = fakeSea({ t: 0 });
    lab.clock.paused = true;
    lab.begin(sea);
    expect(sea.idleView).toBe('free');
    expect(sea.camera.view).toBe('free');
    expect(lab.fly.position.toArray()).toEqual([70, 16, 35]);
    expect(lab.clock.paused).toBe(false);
  });

  it('flies the camera while the sea is paused', () => {
    const lab = new WaveLab();
    const sea = fakeSea({ t: 0 });
    lab.begin(sea);
    lab.clock.togglePause();
    const before = sea.camera.camera.position.clone();
    let sim = 0;
    for (let i = 0; i < 60; i += 1) sim += lab.frame(sea, 1 / 60, { ...FLY_IDLE, forward: 1 });
    expect(sim).toBe(0);
    expect(sea.camera.camera.position.distanceTo(before)).toBeGreaterThan(3);
  });

  it('plays the cinematic sweep until the player moves', () => {
    const lab = new WaveLab();
    const sea = fakeSea({ t: 0 });
    lab.begin(sea);
    lab.jump(sea, 4);
    expect(sea.camera.view).toBe('cinematic');
    lab.frame(sea, 1 / 60, FLY_IDLE);
    expect(sea.camera.view).toBe('cinematic');
    lab.frame(sea, 1 / 60, { ...FLY_IDLE, strafe: 1 });
    expect(sea.camera.view).toBe('free');
  });

  it('follows the crest under the view shoreward', () => {
    const clock = { t: 0 };
    const lab = new WaveLab();
    const sea = fakeSea(clock);
    lab.begin(sea);
    // Look straight down at the crest.
    lab.fly.lookAt(new Vector3(0, 12, -60), new Vector3(0, 0, -59.9));
    lab.fly.applyTo(sea.camera.camera);
    expect(lab.toggleFollow(sea)).toBe(true);
    const start = lab.fly.position.z;
    for (let i = 0; i < 120; i += 1) {
      clock.t += 1 / 60;
      lab.frame(sea, 1 / 60, FLY_IDLE);
    }
    expect(lab.fly.position.z - start).toBeCloseTo(10, 0);
    expect(lab.toggleFollow(sea)).toBe(false);
  });

  it('describes the wave under the view', () => {
    const lab = new WaveLab();
    const sea = fakeSea({ t: 0 });
    lab.begin(sea);
    lab.fly.lookAt(new Vector3(0, 12, -40), new Vector3(0, 0, -60));
    lab.fly.applyTo(sea.camera.camera);
    const info = lab.info(sea, 'metric');
    expect(info?.summary).toBe('Plunging · a left at 50° · good for surfing');
    expect(info?.rows[1].value).toBe('1.6 m');
  });
});
