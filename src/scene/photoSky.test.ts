import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { REFERENCE_LIGHT, nearestSky, rotatedSun, skyExposure, skyRotation, sunElevationFromSlider, type SkyEntry } from './PhotoSky';

const sky = (id: string, timeOfDay: SkyEntry['timeOfDay'], elevation: number, irradiance: [number, number, number], skyIrradiance: number): SkyEntry => {
  const e = (elevation * Math.PI) / 180;
  return { id, timeOfDay, hdr: '', background: '', sun: { direction: [Math.cos(e) * 0.6, Math.sin(e), Math.cos(e) * 0.8], irradiance }, skyIrradiance };
};
// The committed skies' measured values.
const skies = [
  sky('sunrise', 'dawn', 2.1, [0.31, 0.03, 0], 3.4),
  sky('noon', 'midday', 47.9, [4.16, 4.22, 3.85], 1.69),
  sky('dusk', 'sunset', 6.1, [6.94, 2.38, 0.15], 2.34),
];

describe('photo sky', () => {
  it('maps the Wave Lab slider to 0–60° of sun elevation', () => {
    expect(sunElevationFromSlider(0)).toBe(0);
    expect(sunElevationFromSlider(0.5)).toBe(30);
    expect(sunElevationFromSlider(1)).toBe(60);
    expect(sunElevationFromSlider(2)).toBe(60);
  });

  it('snaps to the photo whose sun is nearest in elevation, reaching all three', () => {
    expect(nearestSky(skies, sunElevationFromSlider(0)).id).toBe('sunrise');
    expect(nearestSky(skies, sunElevationFromSlider(0.35)).id).toBe('dusk');
    expect(nearestSky(skies, sunElevationFromSlider(0.9)).id).toBe('noon');
  });

  it('rotates the photo so its sun sits at the game’s azimuth (x = sin a, z = −cos a), keeping its elevation', () => {
    for (const azimuth of [-25, 0, 90, 180]) {
      const rotation = skyRotation(skies[1].sun.direction, azimuth);
      const sun = rotatedSun(skies[1].sun.direction, rotation, new Vector3());
      const a = (azimuth * Math.PI) / 180;
      const horizontal = Math.hypot(sun.x, sun.z);
      expect(sun.x / horizontal).toBeCloseTo(Math.sin(a), 6);
      expect(sun.z / horizontal).toBeCloseTo(-Math.cos(a), 6);
      expect(sun.y).toBeCloseTo(Math.sin((47.9 * Math.PI) / 180), 6);
    }
  });

  it('turns a direction about +y by the rotation, as three’s makeRotationY does', () => {
    const turned = rotatedSun([0, 0, 1], Math.PI / 2, new Vector3());
    expect(turned.x).toBeCloseTo(1, 9);
    expect(turned.z).toBeCloseTo(0, 9);
  });

  it('keeps each photo’s sun-to-sky balance and lights a high sun brighter than a low one', () => {
    const horizontal = (entry: SkyEntry) => {
      const e = skyExposure(entry);
      const [r, g, b] = entry.sun.irradiance;
      const peak = Math.max(r, g, b);
      const sunLuminance = (0.2126 * e.sunColor.r + 0.7152 * e.sunColor.g + 0.0722 * e.sunColor.b) * e.sun;
      expect(e.sun / e.environment).toBeCloseTo(peak, 9);
      return e.environment * entry.skyIrradiance + sunLuminance * entry.sun.direction[1];
    };
    const noon = horizontal(skies[1]);
    expect(noon).toBeGreaterThan(horizontal(skies[2]));
    expect(horizontal(skies[2])).toBeGreaterThan(horizontal(skies[0]));
    expect(noon).toBeLessThanOrEqual(REFERENCE_LIGHT + 1e-9);
    expect(skyExposure(skies[2]).sunColor.r).toBeGreaterThan(skyExposure(skies[2]).sunColor.b);
  });
});
