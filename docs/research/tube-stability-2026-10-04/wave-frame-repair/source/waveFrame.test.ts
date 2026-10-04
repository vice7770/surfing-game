import { describe, expect, it } from 'vitest';
import { exactWaveNumber } from '../wave/dispersion';
import type { SurfWater } from './SurfWater';
import { SwellWater } from './SwellWater';
import { WaveFrameGauge, requiredSpeed } from './waveFrame';

describe('wave frame', () => {
  const period = 10;
  const depth = 4;
  const k = exactWaveNumber((2 * Math.PI) / period, depth);
  const c = (2 * Math.PI) / period / k;
  const wavelength = (2 * Math.PI) / k;
  const still = { x: 0, y: 0, z: 0 };

  /** The gauge after `seconds` of a 1 m swell travelling +z, the rider held at z. */
  const settle = (z: number, seconds: number) => {
    const water = new SwellWater({ height: 1, period, depth });
    const gauge = new WaveFrameGauge();
    let frame = gauge.update(water, { x: 0, y: 0, z }, still, 1 / 60, 90);
    for (let s = 0; s < Math.round(seconds * 60); s += 1) {
      water.advance(1 / 60);
      frame = gauge.update(water, { x: 0, y: 0, z }, still, 1 / 60, 90);
    }
    return { frame, crestZ: c * water.time };
  };

  it('gives the speed a peel demands, c / sin α', () => {
    expect(requiredSpeed(4, 30)).toBeCloseTo(8, 9);
    expect(requiredSpeed(4, 90)).toBeCloseTo(4, 9);
    expect(requiredSpeed(4, 0)).toBe(Infinity);
  });

  it('tracks a linear crest at its phase speed', () => {
    const { frame } = settle(10, 1);
    expect(frame.valid).toBe(true);
    expect(frame.directionZ).toBeGreaterThan(0.99);
    expect(frame.crestSpeed / c).toBeGreaterThan(0.95);
    expect(frame.crestSpeed / c).toBeLessThan(1.05);
  });

  it('places the rider on the face: distance ahead of the crest and height on it', () => {
    // After 1 s the crest is at z = c; a rider 5 m ahead of it, a quarter wavelength ahead, and at the trough.
    const ahead = settle(c + 5, 1).frame;
    expect(ahead.aheadOfCrest).toBeGreaterThan(4.5);
    expect(ahead.aheadOfCrest).toBeLessThan(5.5);
    expect(settle(c + wavelength / 4, 1).frame.faceFraction).toBeCloseTo(0.5, 1);
    expect(settle(c + wavelength / 2 - 0.25, 1).frame.faceFraction).toBeLessThan(0.05);
    expect(settle(c + 0.1, 1).frame.faceFraction).toBeGreaterThan(0.95);
    expect(settle(c - 5, 1).frame.aheadOfCrest).toBeLessThan(-4.5);
  });

  it('splits the speed over ground along the wave and along the crest', () => {
    const water = new SwellWater({ height: 1, period, depth });
    const frame = new WaveFrameGauge().update(water, { x: 0, y: 0, z: 5 }, { x: 3, y: -2, z: 4 }, 1 / 60, 45);
    expect(frame.speedOverGround).toBeCloseTo(5, 6);
    expect(frame.speedShoreward).toBeCloseTo(4, 2);
    expect(frame.speedAlongCrest).toBeCloseTo(3, 2);
  });

  it('measures the same turning oblique crest after translating the whole water and rider', () => {
    const swell = new SwellWater({ height: 1, period, depth, direction: Math.PI / 3 });
    const shift = { x: 1200, z: -900 };
    const translated: SurfWater = {
      surfaceAt: (x, z) => swell.surfaceAt(x - shift.x, z - shift.z),
      sampleAt: (x, y, z, out) => swell.sampleAt(x - shift.x, y, z - shift.z, out),
      addReaction() {},
    };
    const near = new WaveFrameGauge();
    const far = new WaveFrameGauge();
    const at = { x: 2, y: 0, z: 5 };
    const moved = { x: at.x + shift.x, y: at.y, z: at.z + shift.z };
    let maximumSpeedDifference = 0;
    let directionX = 0;
    for (let step = 0; step < 120; step += 1) {
      const a = { ...near.update(swell, at, still, 1 / 60, 60) };
      const b = far.update(translated, moved, still, 1 / 60, 60);
      expect(b.valid).toBe(a.valid);
      expect(b.aheadOfCrest).toBeCloseTo(a.aheadOfCrest, 7);
      expect(b.directionX).toBeCloseTo(a.directionX, 9);
      expect(b.directionZ).toBeCloseTo(a.directionZ, 9);
      directionX = a.directionX;
      maximumSpeedDifference = Math.max(maximumSpeedDifference, Math.abs(a.crestSpeed - b.crestSpeed));
      swell.advance(1 / 60);
    }
    expect(maximumSpeedDifference).toBeLessThan(1e-6);
    expect(directionX).toBeGreaterThan(0.5);
  });

  it.each([0, 2 * Math.PI / 3])('keeps crossed front/back slopes in the configured incoming hemisphere (%s rad)', (direction) => {
    // Components at ±45° from the incoming direction, a quarter cycle apart.
    // Their combined gradient rotates through front/back slopes, not a reversing swell.
    let time = 0;
    const omega = 2 * Math.PI / period;
    const axis = Math.SQRT1_2;
    const incomingX = Math.sin(direction);
    const incomingZ = Math.cos(direction);
    const phases = (x: number, z: number) => {
      const across = x * incomingZ - z * incomingX;
      const along = x * incomingX + z * incomingZ;
      return [k * (axis * across + axis * along) - omega * time,
        k * (-axis * across + axis * along) - omega * time + Math.PI / 2];
    };
    const water: SurfWater = {
      surfaceAt: (x, z) => { const [a, b] = phases(x, z); return 0.5 * (Math.cos(a) + Math.cos(b)); },
      sampleAt: (x, _y, z, out) => {
        const [a, b] = phases(x, z);
        const acrossSlope = -0.5 * k * axis * (Math.sin(a) - Math.sin(b));
        const alongSlope = -0.5 * k * axis * (Math.sin(a) + Math.sin(b));
        return Object.assign(out, { wet: true, outsideDomain: false, breaking: 0,
          surfaceY: water.surfaceAt(x, z), slopeX: acrossSlope * incomingZ + alongSlope * incomingX,
          slopeZ: -acrossSlope * incomingX + alongSlope * incomingZ });
      },
      addReaction() {},
    };
    const gauge = new WaveFrameGauge({ directionX: incomingX, directionZ: incomingZ });
    let minimumIncomingComponent = 1;
    for (let step = 0; step < 450; step += 1) {
      const frame = gauge.update(water, still, still, 1 / 60, 90);
      expect(Math.hypot(frame.directionX, frame.directionZ)).toBeCloseTo(1, 9);
      minimumIncomingComponent = Math.min(minimumIncomingComponent, frame.directionX * incomingX + frame.directionZ * incomingZ);
      time += 1 / 60;
    }
    expect(minimumIncomingComponent).toBeGreaterThan(0);
  });

  it('follows a curved incoming front while the rider moves along its crest', () => {
    let time = 0;
    const bend = 0.03;
    const phase = (x: number, z: number) => k * (z - bend * x * x - c * time);
    const water: SurfWater = {
      surfaceAt: (x, z) => 0.5 * Math.cos(phase(x, z)),
      sampleAt: (x, _y, z, out) => Object.assign(out, { wet: true, outsideDomain: false, breaking: 0,
        surfaceY: water.surfaceAt(x, z), slopeX: k * bend * x * Math.sin(phase(x, z)),
        slopeZ: -0.5 * k * Math.sin(phase(x, z)) }),
      addReaction() {},
    };
    const gauge = new WaveFrameGauge();
    const shiftedGauge = new WaveFrameGauge();
    const shift = { x: -500, z: 700 };
    const translated: SurfWater = {
      surfaceAt: (x, z) => water.surfaceAt(x - shift.x, z - shift.z),
      sampleAt: (x, y, z, out) => water.sampleAt(x - shift.x, y, z - shift.z, out),
      addReaction() {},
    };
    let earlyX = 0;
    let lateX = 0;
    for (let step = 0; step < 240; step += 1) {
      const x = -6 + 3 * time;
      const at = { x, y: 0, z: bend * x * x + c * time + 5 };
      const velocity = { x: 3, y: 0, z: 6 * bend * x + c };
      const frame = gauge.update(water, at, velocity, 1 / 60, 90);
      const translatedFrame = shiftedGauge.update(translated, { x: x + shift.x, y: 0, z: at.z + shift.z }, velocity, 1 / 60, 90);
      expect(frame.valid).toBe(true);
      expect(frame.directionZ).toBeGreaterThan(0);
      expect(translatedFrame.directionX).toBeCloseTo(frame.directionX, 9);
      expect(translatedFrame.directionZ).toBeCloseTo(frame.directionZ, 9);
      expect(translatedFrame.crestSpeed).toBeCloseTo(frame.crestSpeed, 6);
      if (step === 60) earlyX = frame.directionX;
      if (step === 239) lateX = frame.directionX;
      time += 1 / 60;
    }
    expect(earlyX).toBeGreaterThan(0.1);
    expect(lateX).toBeLessThan(-0.15);
  });

  // The spec's done criteria and the pocket reflex (riding-the-wave plan, Task 1): how far along the crest the curl is.
  it('finds the curl along the crest, or none', () => {
    const swell = new SwellWater({ height: 1, period, depth });
    for (let s = 0; s < 60; s += 1) swell.advance(1 / 60);
    // Breaking where x < edge: the broken part of the crest lies toward −x.
    const curlAt = (edge: number): SurfWater => ({
      surfaceAt: (x, z) => swell.surfaceAt(x, z),
      sampleAt: (x, y, z, out) => {
        swell.sampleAt(x, y, z, out);
        out.breaking = x < edge ? 1 : 0;
        return out;
      },
      addReaction() {},
    });
    const at = { x: 0, y: 0, z: c + 5 };
    const read = (edge: number) => new WaveFrameGauge().update(curlAt(edge), at, still, 1 / 60, 90);
    expect(read(-6).valid).toBe(true);
    expect(read(-6).curlDistance).toBeGreaterThan(5.5);
    expect(read(-6).curlDistance).toBeLessThan(7);
    expect(read(1).curlDistance).toBe(0);
    expect(read(-100).curlDistance).toBe(Infinity);
    const flat = new SwellWater({ height: 0, period, depth });
    expect(new WaveFrameGauge().update(flat, still, still, 1 / 60, 90).curlDistance).toBe(Infinity);
  });

  // Riding-the-wave Task 7: which way along the crest the curl lies, so a rider can ride the open face away from it.
  it('says which side of the rider the curl lies on', () => {
    const swell = new SwellWater({ height: 1, period, depth });
    for (let s = 0; s < 60; s += 1) swell.advance(1 / 60);
    const breakingWhere = (broken: (x: number) => boolean): SurfWater => ({
      surfaceAt: (x, z) => swell.surfaceAt(x, z),
      sampleAt: (x, y, z, out) => {
        swell.sampleAt(x, y, z, out);
        out.breaking = broken(x) ? 1 : 0;
        return out;
      },
      addReaction() {},
    });
    const at = { x: 0, y: 0, z: c + 5 };
    const side = (broken: (x: number) => boolean) => new WaveFrameGauge().update(breakingWhere(broken), at, still, 1 / 60, 90).curlSide;
    // The wave travels +z, so its crest runs along x: the curl toward −x, toward +x, at the rider, or nowhere.
    expect(side((x) => x < -6)).toBe(-1);
    expect(side((x) => x > 6)).toBe(1);
    expect(side(() => true)).toBe(0);
    expect(side(() => false)).toBe(0);
  });

  it('has no frame on flat water', () => {
    const flat = new SwellWater({ height: 0, period, depth });
    expect(new WaveFrameGauge().update(flat, still, still, 1 / 60, 90).valid).toBe(false);
  });
});
