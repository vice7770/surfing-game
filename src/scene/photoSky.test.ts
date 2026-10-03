import { readFileSync } from 'node:fs';
import { DataUtils, HalfFloatType, Texture, Vector3 } from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { describe, expect, it } from 'vitest';
import skyManifest from '../../public/assets/skies/skies.json';
import { PhotoSky, REFERENCE_LIGHT, nearestSky, rotatedSun, skyExposure, skyIrradianceOf, skyRotation, sunElevationFromSlider, type PhotoSkyLoads, type SkyEntry } from './PhotoSky';

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

describe('photo sky loading', () => {
  /** Loads that finish when the test says, so their order can be reversed. */
  function controlledLoads() {
    const pending = new Map<string, () => void>();
    const disposed: string[] = [];
    const loads: PhotoSkyLoads = {
      manifest: async () => skies,
      sky: (entry) => new Promise((resolve) => {
        pending.set(entry.id, () => resolve({ environment: new Texture(), background: new Texture(), dispose: () => disposed.push(entry.id) }));
      }),
    };
    return { loads, disposed, started: (id: string) => pending.has(id), finish: (id: string) => pending.get(id)!() };
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('keeps the latest request’s sky when an earlier, slower load finishes last', async () => {
    const { loads, disposed, started, finish } = controlledLoads();
    const sky = new PhotoSky(undefined as never, 'assets/', loads);
    const first = sky.select(48, 0);
    await settle();
    expect(started('noon')).toBe(true);
    const second = sky.select(2, 90);
    await settle();
    finish('sunrise');
    expect(await second).toBe(true);
    finish('noon');
    expect(await first).toBe(false);
    expect(disposed).toEqual(['noon']);
    expect(sky.timeOfDay).toBe('dawn');
    const a = (90 * Math.PI) / 180;
    expect(sky.sunDirection.x / Math.hypot(sky.sunDirection.x, sky.sunDirection.z)).toBeCloseTo(Math.sin(a), 6);
  });

  it('releases its sky on dispose, and discards a load still under way when it finishes', async () => {
    const { loads, disposed, finish } = controlledLoads();
    const sky = new PhotoSky(undefined as never, 'assets/', loads);
    const first = sky.select(2, 0);
    await settle();
    finish('sunrise');
    await first;
    const second = sky.select(48, 0);
    await settle();
    sky.dispose();
    expect(disposed).toEqual(['sunrise']);
    expect(sky.ready).toBe(false);
    finish('noon');
    expect(await second).toBe(false);
    expect(disposed).toEqual(['sunrise', 'noon']);
    expect(sky.ready).toBe(false);
  });
});

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

describe('the photographed sky\'s own light on a level surface', () => {
  /** An RGBA equirectangular sky, `width` × `height`, of radiance `at(θ)` (θ from the zenith). */
  const equirect = (width: number, height: number, at: (theta: number) => [number, number, number]) => {
    const data = new Float32Array(4 * width * height);
    for (let row = 0; row < height; row += 1) {
      const value = at(((row + 0.5) / height) * Math.PI);
      for (let column = 0; column < width; column += 1) data.set([...value, 1], 4 * (row * width + column));
    }
    return { data, width, height };
  };

  it('integrates the radiance over the upper hemisphere with the cosine: a uniform sky of L gives π L, the ground none', () => {
    const uniform = skyIrradianceOf(equirect(64, 256, () => [1, 2, 3]));
    [1, 2, 3].forEach((value, i) => expect(uniform[i] / (Math.PI * value)).toBeCloseTo(1, 4));
    // Light below the horizon does not reach a level surface; a sky bright at the zenith gives more than one bright low down.
    expect(skyIrradianceOf(equirect(64, 256, (theta) => (theta > Math.PI / 2 ? [5, 5, 5] : [0, 0, 0])))).toEqual([0, 0, 0]);
    // A bright cap of half-angle α about the zenith gives π sin²α.
    for (const alpha of [0.3, 0.8, 1.2]) {
      const cap = skyIrradianceOf(equirect(64, 1024, (theta) => (theta < alpha ? [1, 1, 1] : [0, 0, 0])))[0];
      expect(cap / (Math.PI * Math.sin(alpha) ** 2)).toBeCloseTo(1, 2);
    }
    // Half floats, as HDRLoader gives them.
    const sky = equirect(16, 64, () => [0.5, 1, 1.5]);
    const half = { ...sky, data: Uint16Array.from(sky.data, (v) => DataUtils.toHalfFloat(v)) };
    skyIrradianceOf(half, true).forEach((value, i) => expect(value).toBeCloseTo(skyIrradianceOf(sky)[i], 6));
  });

  it('measures each committed photograph\'s sky: its luminance the manifest\'s, its colour bluer than grey', () => {
    for (const entry of skyManifest.skies as unknown as SkyEntry[]) {
      const bytes = readFileSync(`public/assets/${entry.hdr}`);
      const parsed = new HDRLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
      expect(parsed.type).toBe(HalfFloatType);
      const [r, g, b] = skyIrradianceOf(parsed as unknown as { data: Uint16Array; width: number; height: number }, true);
      expect((0.2126 * r + 0.7152 * g + 0.0722 * b) / entry.skyIrradiance).toBeCloseTo(1, 2);
      // The clear skies' blue: their light on a level surface has 1.37–1.46 times its luminance in blue, 0.78–0.89 in red.
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      expect(b / luminance).toBeGreaterThan(1.3);
      expect(r / luminance).toBeLessThan(0.9);
    }
  });

  it('takes the loaded sky\'s colour, luminance 1, and grey where a load gives none', async () => {
    const measured: [number, number, number] = [2.781, 3.457, 4.65];
    const loads = (skyIrradiance?: [number, number, number]): PhotoSkyLoads => ({
      manifest: async () => skies,
      sky: async () => ({ environment: new Texture(), background: new Texture(), ...(skyIrradiance ? { skyIrradiance } : {}), dispose: () => undefined }),
    });
    const sky = new PhotoSky(undefined as never, 'assets/', loads(measured));
    await sky.select(2, 0);
    const lum = 0.2126 * measured[0] + 0.7152 * measured[1] + 0.0722 * measured[2];
    sky.skyColor.forEach((value, i) => expect(value).toBeCloseTo(measured[i] / lum, 9));
    expect(0.2126 * sky.skyColor[0] + 0.7152 * sky.skyColor[1] + 0.0722 * sky.skyColor[2]).toBeCloseTo(1, 9);
    const grey = new PhotoSky(undefined as never, 'assets/', loads());
    await grey.select(2, 0);
    expect(grey.skyColor).toEqual([1, 1, 1]);
  });
});
