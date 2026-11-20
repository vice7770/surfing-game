import { describe, expect, it } from 'vitest';
import { createBoardSpraySheet, packBoardSheets, placeTear } from '../physics/boardSpray';
import { FAN, FAN_STRIDE, FanRing, dropDiameter, dropSpectrum, fallSpeed, fanPosition, landingTime, throwFan } from './boardFan';
import { seededRandom } from './random';

const GRAVITY = 9.81;

describe('the boards\' spray fan (spray-rework)', () => {
  it('falls at Gunn & Kinzer\'s measured terminal speeds', () => {
    expect(fallSpeed(0.001)).toBeCloseTo(4.03, 2);
    expect(fallSpeed(0.003)).toBeCloseTo(8.06, 2);
    expect(fallSpeed(0.0015)).toBeGreaterThan(fallSpeed(0.001));
    expect(fallSpeed(0.01)).toBeCloseTo(9.17, 2);
  });

  it('flies each drop as the linear drag toward its terminal velocity does, stepped finely', () => {
    const tau = fallSpeed(0.002) / GRAVITY;
    const wind = 3;
    let x = 0; let y = 1; let z = 0; let vx = 4; let vy = 6; let vz = -2;
    const dt = 1e-4;
    for (let t = 0; t < 0.8 - dt / 2; t += dt) {
      vx += (-vx / tau) * dt;
      vy += (-GRAVITY - vy / tau) * dt;
      vz += (-(vz - wind) / tau) * dt;
      x += vx * dt; y += vy * dt; z += vz * dt;
    }
    const at = new Float64Array(6);
    fanPosition(0, 1, 0, 4, 6, -2, tau, wind, 0.8, at);
    expect(at[0]).toBeCloseTo(x, 2);
    expect(at[1]).toBeCloseTo(y, 2);
    expect(at[2]).toBeCloseTo(z, 2);
    expect(at[4]).toBeCloseTo(vy, 2);
  });

  it('lands each drop back on the water it left, after its apex', () => {
    const tau = fallSpeed(0.003) / GRAVITY;
    const life = landingTime(0.1, 5, tau, 0);
    const at = new Float64Array(6);
    fanPosition(0, 0.1, 0, 0, 5, 0, tau, 0, life, at);
    expect(at[1]).toBeCloseTo(0, 2);
    expect(at[4]).toBeLessThan(0);
    // In a vacuum it would fly 2 × 5 / g; the air brings it down sooner.
    expect(life).toBeLessThan((2 * 5) / GRAVITY + 0.05);
    expect(landingTime(0.1, 50, tau, 0)).toBeLessThanOrEqual(FAN.longest);
  });

  it('throws FAN.perKg streaks a kilogram at the setting\'s share, from the sheet, its mist born later on their flights', () => {
    const sheet = { ...createBoardSpraySheet(), x: 1, y: 0.05, z: 2, alongX: 0, alongZ: 1, length: 0.5, vx: 3, vy: 5, vz: 1, flux: 60, spread: 0.5 };
    const packed = packBoardSheets([sheet]);
    const streaks = new FanRing(4096);
    const mist = new FanRing(512);
    const random = seededRandom(1, 2);
    let thrown = 0;
    for (let n = 0; n < 60; n += 1) thrown += throwFan(packed, 1, n / 60, 1 / 60, 0.5, random, () => 0, 0, streaks, mist);
    // 60 kg/s for a second at half the share, less the mist's share; each streak then stands for twice the water.
    const expected = 60 * (1 - FAN.mistShare) * FAN.perKg * 0.5;
    expect(thrown).toBeGreaterThan(0.9 * expected);
    expect(thrown).toBeLessThan(1.1 * expected);
    expect(streaks.data[9]).toBeCloseTo(1 / (FAN.perKg * 0.5), 6);
    for (let k = 0; k < 200; k += 1) {
      const o = k * FAN_STRIDE;
      // From along the root, upward, landing within the longest flight.
      expect(streaks.data[o + 2]).toBeGreaterThanOrEqual(2 - 1e-6);
      expect(streaks.data[o + 2]).toBeLessThanOrEqual(2.5 + 1e-6);
      expect(streaks.data[o + 5]).toBeGreaterThan(0);
      expect(streaks.data[o + 10]).toBeGreaterThan(0.3);
      expect(streaks.data[o + 10]).toBeLessThanOrEqual(FAN.longest);
    }
    // The mist's water: its share of the whole, in puffs of FAN.mistMass (at this setting, twice it), born later on.
    let puffs = 0;
    let water = 0;
    for (let k = 0; k < mist.limit; k += 1) {
      const o = k * FAN_STRIDE;
      if (!(mist.data[o + 3] < 100)) continue;
      puffs += 1;
      water += mist.data[o + 9];
    }
    expect(puffs).toBeGreaterThan(0);
    expect(water).toBeGreaterThan(0.6 * 60 * FAN.mistShare);
    expect(water).toBeLessThan(1.4 * 60 * FAN.mistShare);
  });

  it('throws a torn sheet\'s drops from where its curtain tears, the larger ones there, some shed on the way', () => {
    const sheet = { ...createBoardSpraySheet(), x: 5, y: 0.04, z: 20, alongX: 0, alongZ: 1, length: 0.6, vx: 6, vy: 5, vz: 2, flux: 80, spread: 0.3, onset: 0.03, breakup: 0.1 };
    placeTear(sheet, 5, 0.04, 20, 0, 1, 0.6, 6, 5, -6, 6, 5, 2, 0.1);
    const streaks = new FanRing(8192);
    throwFan(packBoardSheets([sheet]), 1, 0, 0.5, 1, seededRandom(3, 4), () => 0, 0, streaks, new FanRing(1024));
    let atTear = 0;
    let total = 0;
    let tearSize = 0;
    let shedSize = 0;
    for (let k = 0; k < streaks.limit; k += 1) {
      const o = k * FAN_STRIDE;
      if (!(streaks.data[o + 3] < 100)) continue;
      total += 1;
      if (streaks.data[o] > 5.4) {
        atTear += 1;
        tearSize += streaks.data[o + 8];
      } else {
        shedSize += streaks.data[o + 8];
      }
    }
    expect(atTear / total).toBeGreaterThan(0.7);
    expect(atTear / total).toBeLessThan(0.95);
    // The tear's drops the larger (the shed's are under the knee).
    expect(tearSize / atTear).toBeGreaterThan(shedSize / (total - atTear));
  });

  it('picks its drops by volume from the spectrum: half under the knee, none past the cap', () => {
    const knee = 0.001;
    const sizes = Array.from({ length: 4000 }, (_, k) => dropDiameter((k + 0.5) / 4000, knee, 0.006));
    const under = sizes.filter((d) => d < knee).length / sizes.length;
    expect(under).toBeGreaterThan(0.45);
    expect(under).toBeLessThan(0.55);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(FAN.smallest);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(0.006 + 1e-9);
    // The knee: 2 mm off slow sheets, 1 mm off fast; fast air caps the largest (12σ/ρ_a U²).
    expect(dropSpectrum(3).knee).toBeCloseTo(0.002, 6);
    expect(dropSpectrum(8).knee).toBeCloseTo(0.001, 6);
    expect(dropSpectrum(4).largest).toBeCloseTo(0.006, 6);
    expect(dropSpectrum(15).largest).toBeCloseTo((12 * 0.072) / (1.2 * 225), 6);
  });

  it('keeps to the front of its ring at a lower Particles setting', () => {
    const ring = new FanRing(100);
    ring.setLimit(25);
    for (let n = 0; n < 60; n += 1) expect(ring.claim()).toBeLessThan(25 * FAN_STRIDE);
    expect(ring.dirtyCount).toBe(25);
  });
});
