import { readFileSync } from 'node:fs';
import { BackSide, Color, Matrix4, PerspectiveCamera, ShaderChunk, ShaderLib, UniformsLib, UniformsUtils, Vector3 } from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import skyManifest from '../../public/assets/skies/skies.json';
import { REFERENCE_LIGHT, skyExposure, skyIrradianceOf, type SkyEntry } from './PhotoSky';
import { DIFFUSE_PATH, DIFFUSE_SKY_REFLECTANCE } from './SpotSeabed';
import {
  DISPLAY_EXPOSURE, FIT, LEGACY_FOG_COLOUR, SIGHTING, TYLER, UNDERWATER_GAIN, UnderwaterFog, VISIBILITY_FLOOR, ZENITH_SHAPE, contrastAt,
  distanceToContrast, eyeAttenuation, fogged, installUnderwaterFog, irradianceBelow, levelRadiance, luminance, neutralToneMap, photoSkyLight,
  radianceAlong, underwaterFogUniforms, underwaterWaterOf, withUnderwaterFog, worldUp, zenithOverLevel, type SurfaceLight, type UnderwaterWater,
} from './underwaterFog';
import { SPOT_OPTICS, WATER_IOR, beamAttenuation, deepReflectance, diffuseAttenuation, refractedCosine, schlickFresnel, type Rgb } from './waterOptics';

/** three's own fog chunks, taken before anything in this file installs the underwater fog. */
const PRISTINE = {
  fog_pars_vertex: ShaderChunk.fog_pars_vertex, fog_vertex: ShaderChunk.fog_vertex, fog_pars_fragment: ShaderChunk.fog_pars_fragment,
  fog_fragment: ShaderChunk.fog_fragment, tonemapping_fragment: ShaderChunk.tonemapping_fragment,
};
type Time = 'dawn' | 'midday' | 'sunset';
const skies = skyManifest.skies as unknown as SkyEntry[];
const sky = (time: Time) => skies.find((entry) => entry.timeOfDay === time)!;
/** The photograph's own sky colour, luminance 1, as PhotoSky measures it from the HDR at load. */
function skyColourOf(entry: SkyEntry): [number, number, number] {
  const bytes = readFileSync(`public/assets/${entry.hdr}`);
  const parsed = new HDRLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const e = skyIrradianceOf(parsed as unknown as { data: Uint16Array; width: number; height: number }, true);
  const lum = luminance(e);
  return [e[0] / lum, e[1] / lum, e[2] / lum];
}
const colours = new Map<Time, [number, number, number]>();
/** The scene's light at a photographed sky, as the game sets it (PhotoSky.select → skyExposure; its sun's direction and its sky's colour). */
function lightAt(time: Time) {
  const entry = sky(time);
  const exposure = skyExposure(entry);
  if (!colours.has(time)) colours.set(time, skyColourOf(entry));
  return { entry, exposure, light: photoSkyLight(entry.sun.direction[1], exposure.sun, exposure.sunColor, colours.get(time)) };
}
const water = (spot: keyof typeof SPOT_OPTICS): UnderwaterWater => {
  const optics = SPOT_OPTICS[spot];
  return { beam: beamAttenuation(optics), diffuse: diffuseAttenuation(optics), deep: deepReflectance(optics) };
};
const todays = (() => {
  const legacy = new Color(LEGACY_FOG_COLOUR);
  return luminance([legacy.r, legacy.g, legacy.b]);
})();

/**
 * The prototype's water radiance, transcribed from its GLSL (notes/round5-underwater/prototype-1-2.diff: uwDownwelling,
 * uwRadiance and the composite's reach), for one channel: what this module must reproduce.
 */
function prototypeRadiance(spot: UnderwaterWater, light: SurfaceLight, eyeDepth: number, up: number, distance: number, i: number): number {
  const mu = Math.max(0, light.sunCosine);
  const sun = light.sun[i] * mu * (1 - schlickFresnel(mu));
  const skyLight = light.sky[i] * (1 - 0.066);
  const muWater = Math.sqrt(1 - (1 - mu * mu) / (WATER_IOR * WATER_IOR));
  const K = spot.diffuse[i];
  const downwelling = (depth: number) => {
    const z = Math.max(depth, 0);
    return sun * Math.exp((-K * z) / Math.max(muWater, 0.2)) + skyLight * Math.exp(-K * 1.2 * z);
  };
  const reach = Math.min(distance, 1 / Math.max(eyeAttenuation(spot.beam)[1], 1e-3));
  const ed = downwelling(eyeDepth - up * reach) / Math.PI;
  const level = 7 * spot.deep[i] * ed;
  if (up <= 0) return level * (1 / 7) ** -up;
  const zenith = Math.min(25 * level, WATER_IOR * WATER_IOR * (1 - 0.02) * ed);
  const w = up ** 1.5;
  return Math.exp((1 - w) * Math.log(Math.max(level, 1e-6)) + w * Math.log(Math.max(zenith, 1e-6)));
}

describe('how far the water lets a target be seen', () => {
  it('leaves clear water physical and brings murky water up to the 7 m floor, keeping its hue', () => {
    const padang = water('padang').beam;
    expect(eyeAttenuation(padang)).toEqual(padang);
    for (const spot of ['beach', 'point', 'canyon'] as const) {
      const beam = water(spot).beam;
      const eye = eyeAttenuation(beam);
      // The green channel's black-target sighting is the floor; the channels keep their ratios.
      expect(SIGHTING / eye[1]).toBeCloseTo(VISIBILITY_FLOOR, 9);
      expect(eye[0] / eye[1]).toBeCloseTo(beam[0] / beam[1], 12);
      expect(eye[2] / eye[1]).toBeCloseTo(beam[2] / beam[1], 12);
    }
    // The Reef is clear (the game's own optics: 22 m), and stays so.
    const reef = water('reef').beam;
    expect(SIGHTING / reef[1]).toBeGreaterThan(22);
    expect(eyeAttenuation(reef)).toEqual(reef);
  });

  it('sights a black target at Padang Padang at 22.4 m by the decision\'s metric (4.8/c), 18.2 m at 2 % contrast, red gone far sooner', () => {
    const eye = eyeAttenuation(water('padang').beam);
    // The prototype's method: c from the fall of a black target's contrast with distance, the sighting 4.8/c.
    expect(SIGHTING / eye[1]).toBeCloseTo(22.39, 2);
    const green = distanceToContrast(eye[1], 0.02);
    expect(green).toBeCloseTo(18.25, 2);
    expect(contrastAt(eye, green)[1]).toBeCloseTo(0.02, 12);
    // Red fades first: its 2 % is under half that distance, and blue outlasts green.
    expect(distanceToContrast(eye[0], 0.02)).toBeLessThan(0.5 * green);
    expect(distanceToContrast(eye[2], 0.02)).toBeGreaterThan(green);
    // The floor at the Beach: 7 m by the same metric, 5.7 m at 2 %.
    const beach = eyeAttenuation(water('beach').beam);
    expect(distanceToContrast(beach[1], 0.02)).toBeCloseTo((VISIBILITY_FLOOR * -Math.log(0.02)) / SIGHTING, 9);
    // The flat FogExp2 it replaces (density 0.035) left 61 % at 20 m and 2 % only past 56 m, the same for every channel.
    const flat = (d: number) => 1 - (1 - Math.exp(-0.035 * 0.035 * d * d));
    expect(flat(20)).toBeCloseTo(0.61, 2);
    expect(Math.sqrt(-Math.log(0.02)) / 0.035).toBeGreaterThan(56);
  });
});

describe('the light the water sends back', () => {
  it('takes the sky\'s share from the photographed skies\' exposure, in the photograph\'s own colour', () => {
    for (const time of ['dawn', 'midday', 'sunset'] as const) {
      const { entry, exposure, light } = lightAt(time);
      // The sky's irradiance × the exposure scale (PhotoSky.environmentIntensity), the amount the scene's environment gives a level surface.
      expect(luminance(light.sky)).toBeCloseTo(entry.skyIrradiance * exposure.environment, 6);
      const sine = entry.sun.direction[1];
      const sunHorizontal = exposure.sun * luminance([exposure.sunColor.r, exposure.sunColor.g, exposure.sunColor.b]) * sine;
      expect(luminance(light.sky) + sunHorizontal).toBeCloseTo(REFERENCE_LIGHT * (0.4 + 0.6 * Math.sqrt(sine)), 6);
      // The clear skies light a level surface blue: more blue than red, at every hour.
      expect(light.sky[2]).toBeGreaterThan(1.5 * light.sky[0]);
    }
    // Grey where the sky's colour is not known.
    const grey = photoSkyLight(0.7, 2, { r: 1, g: 1, b: 1 });
    expect(grey.sky[0]).toBe(grey.sky[2]);
  });

  it('falls with depth, red first, and is dimmer at dawn and sunset than at midday', () => {
    const { diffuse } = water('padang');
    const { light } = lightAt('midday');
    const shallow = irradianceBelow(light, diffuse, 1);
    const deep = irradianceBelow(light, diffuse, 12);
    for (let i = 0; i < 3; i += 1) expect(deep[i]).toBeLessThan(shallow[i]);
    expect(deep[0] / shallow[0]).toBeLessThan(deep[2] / shallow[2]);
    // At the surface: (1 − F) of the sun's horizontal share and (1 − 0.066) of the sky's.
    const surface = irradianceBelow(light, diffuse, 0);
    const mu = lightAt('midday').entry.sun.direction[1];
    expect(surface[1]).toBeCloseTo(light.sun[1] * mu * (1 - schlickFresnel(mu)) + light.sky[1] * (1 - DIFFUSE_SKY_REFLECTANCE), 12);
    const midday = luminance(irradianceBelow(light, diffuse, 2));
    expect(luminance(irradianceBelow(lightAt('dawn').light, diffuse, 2))).toBeLessThan(0.7 * midday);
    expect(luminance(irradianceBelow(lightAt('sunset').light, diffuse, 2))).toBeLessThan(0.8 * midday);
  });

  it('is bluer-green at Padang Padang and brighter and greyer in the Beach\'s murk', () => {
    const { light } = lightAt('midday');
    const padang = water('padang');
    const beach = water('beach');
    const a = levelRadiance(padang.deep, light, padang.diffuse, 1.5);
    const b = levelRadiance(beach.deep, light, beach.diffuse, 1.5);
    // Clear water sends back little red and the most blue; murky water, much more of everything.
    expect(a[0]).toBeLessThan(a[1]);
    expect(a[1]).toBeLessThan(a[2]);
    expect(luminance(b)).toBeGreaterThan(2 * luminance(a));
    expect(b[0] / b[2]).toBeGreaterThan(a[0] / a[2]);
  });

  it('is brightest looking up, by Tyler\'s 25 at most and what a uniform sky can send through the window at least, per channel', () => {
    for (const spot of ['padang', 'beach'] as const) {
      const { deep } = water(spot);
      const ratio = zenithOverLevel(deep);
      ratio.forEach((r, i) => {
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(TYLER.zenithOverLevel);
        // n² (1 − F) E/π over 7 R∞ E/π: the water's own R∞ sets it, whatever the light.
        expect(r).toBeCloseTo(Math.min(25, (WATER_IOR ** 2 * (1 - schlickFresnel(1))) / (7 * deep[i])), 9);
      });
    }
    // Red has the least level radiance and so the most to gain: Tyler's ratio; blue is held by the sky's own light.
    const padang = zenithOverLevel(water('padang').deep);
    expect(padang[0]).toBe(TYLER.zenithOverLevel);
    expect(padang[2]).toBeLessThan(padang[0]);
  });
});

describe('the water along a view ray (the prototype\'s form)', () => {
  it('is the prototype\'s radiance: the in-scatter at the depth the ray reaches within 1/c of the eye', () => {
    for (const spot of ['padang', 'beach'] as const) {
      for (const time of ['dawn', 'midday', 'sunset'] as const) {
        const { light } = lightAt(time);
        for (const eyeDepth of [0.3, 1.2, 4]) {
          for (const up of [-1, -0.6, -0.2, 0, 0.15, 0.5, 0.9, 1]) {
            for (const distance of [0.5, 3, 12, 80, Infinity]) {
              const ours = radianceAlong(water(spot), light, eyeDepth, up, distance);
              // Within 0.5 %: the module holds the sun at 3° or more (as `irradianceBelow`) and takes F0 as (n − 1)²/(n + 1)², not 0.02.
              ours.forEach((value, i) => expect(value / prototypeRadiance(water(spot), light, eyeDepth, up, distance, i)).toBeCloseTo(1, 2));
            }
          }
        }
      }
    }
  });

  it('is brighter looking up and darker looking down, and level, the level radiance at the eye\'s depth whatever the distance', () => {
    const padang = water('padang');
    const { light } = lightAt('midday');
    const level = levelRadiance(padang.deep, light, padang.diffuse, 1.2);
    for (const distance of [1, 10, 1000]) radianceAlong(padang, light, 1.2, 0, distance).forEach((v, i) => expect(v).toBeCloseTo(level[i], 12));
    const up = luminance(radianceAlong(padang, light, 1.2, 0.7, 30));
    const down = luminance(radianceAlong(padang, light, 1.2, -0.7, 30));
    expect(up).toBeGreaterThan(2 * luminance(level));
    expect(down).toBeLessThan(0.3 * luminance(level));
    // Beyond 1/c_G the light along the ray no longer changes: the backdrop's water at infinity is the fog's own limit.
    const reach = 1 / eyeAttenuation(padang.beam)[1];
    expect(radianceAlong(padang, light, 1.2, -0.4, 2 * reach)).toEqual(radianceAlong(padang, light, 1.2, -0.4, Infinity));
    expect(radianceAlong(padang, light, 1.2, -0.4, 0.5 * reach)).not.toEqual(radianceAlong(padang, light, 1.2, -0.4, Infinity));
  });

  it('fades a fragment toward that water by e^{−c d} per channel: a black target keeps e^{−c d} of its contrast looking level', () => {
    const padang = water('padang');
    const { light } = lightAt('midday');
    const colour: Rgb = [0.3, 0.2, 0.1];
    expect(fogged(colour, padang, light, 1.2, 0.3, 0)).toEqual(colour);
    fogged(colour, padang, light, 1.2, 0.3, 1e5).forEach((v, i) => expect(v).toBeCloseTo(radianceAlong(padang, light, 1.2, 0.3, Infinity)[i], 9));
    const eye = eyeAttenuation(padang.beam);
    const background = radianceAlong(padang, light, 1.2, 0, Infinity);
    for (const d of [2, 10, 18]) {
      const target = fogged([0, 0, 0], padang, light, 1.2, 0, d);
      [0, 1, 2].forEach((i) => expect((background[i] - target[i]) / background[i]).toBeCloseTo(Math.exp(-eye[i] * d), 9));
    }
  });
});

describe('the underwater exposure gain', () => {
  const shown = (gain: number, time: Time = FIT.time, depth: number = FIT.depth) => {
    const padang = water(FIT.spot);
    return luminance(neutralToneMap(levelRadiance(padang.deep, lightAt(time).light, padang.diffuse, depth), DISPLAY_EXPOSURE * gain));
  };
  /** The gain that brings the level view at `depth` to today's flat fog's luminance on screen. */
  const fitAt = (depth: number) => {
    let [lo, hi] = [0.1, 20];
    for (let k = 0; k < 80; k += 1) {
      const mid = (lo + hi) / 2;
      if (shown(mid, FIT.time, depth) < todays) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  it('brings the level view at Padang Padang back to today\'s brightness, and no more than that at midday: one fitted gain', () => {
    expect(Math.abs(shown(UNDERWATER_GAIN) / todays - 1)).toBeLessThan(0.01);
    // Without it the level view is 0.61 of that (the prototype found its physical level view 2–3 times darker than today's).
    expect(shown(1) / todays).toBeCloseTo(0.61, 2);
    // The gain is one number: dawn and sunset stay darker than midday (dusk goes dark), as the sun's light says.
    expect(shown(UNDERWATER_GAIN, 'dawn')).toBeLessThan(0.7 * todays);
    expect(shown(UNDERWATER_GAIN, 'sunset')).toBeLessThan(0.8 * todays);
  });

  it('hardly depends on the fit\'s depth: fitted anywhere from 0.5 to 2 m it is within 5 % of the gain', () => {
    expect(Math.abs(fitAt(FIT.depth) / UNDERWATER_GAIN - 1)).toBeLessThan(0.005);
    for (const depth of [0.5, 1, 1.5, 2]) expect(Math.abs(fitAt(depth) / UNDERWATER_GAIN - 1)).toBeLessThan(0.05);
  });
});

describe('the tone mapping the gain is fitted through', () => {
  it('shifts the dark colours by the Neutral operator\'s offset and leaves a pure black black', () => {
    // x − 6.25 x² below 0.08 (Khronos PBR Neutral, three's NeutralToneMapping), then the exposure first.
    expect(neutralToneMap([0, 0, 0], 1.05)).toEqual([0, 0, 0]);
    const [r, g, b] = neutralToneMap([0.04, 0.2, 0.3], 1);
    const offset = 0.04 - 6.25 * 0.04 * 0.04;
    expect([r, g, b]).toEqual([0.04 - offset, 0.2 - offset, 0.3 - offset]);
    // Above 0.76 the peak is compressed toward 1 and the colour desaturates.
    const bright = neutralToneMap([2, 1, 0.5], 1);
    expect(Math.max(...bright)).toBeLessThan(1);
    expect(Math.max(...bright)).toBeGreaterThan(0.9);
  });
});

describe('the direction the fog looks along', () => {
  beforeAll(() => installUnderwaterFog());

  it('reads a fragment\'s world-up component from its view-space position, for a camera looking up or down and turned about', () => {
    for (const [pitch, yaw] of [[0, 0], [20, 0], [-35, 70], [60, -120], [-10, 200]]) {
      const camera = new PerspectiveCamera(55, 16 / 9, 0.1, 100);
      camera.rotation.set((pitch * Math.PI) / 180, (yaw * Math.PI) / 180, 0, 'YXZ');
      camera.updateMatrixWorld();
      for (const world of [new Vector3(0.3, 0.5, -0.8), new Vector3(-0.6, -0.2, 0.4), new Vector3(0, 1, 0), new Vector3(1, 0, 0)]) {
        const unit = world.clone().normalize();
        // The same direction in view space: the world one through the view matrix, a fragment 7 m away along it.
        const view = unit.clone().multiplyScalar(7).transformDirection(camera.matrixWorldInverse).multiplyScalar(7);
        expect(worldUp(camera.matrixWorldInverse.elements, [view.x, view.y, view.z])).toBeCloseTo(unit.y, 9);
      }
    }
    // The shader reads the same column.
    expect(ShaderChunk.tonemapping_fragment).toContain('viewMatrix[ 1 ].xyz');
  });
});

describe('the shared fog chunks', () => {
  beforeAll(() => installUnderwaterFog());

  it('keeps three\'s own fog whole for the air and for Classic, and takes the new path only while it is switched on', () => {
    const fragment = ShaderChunk.fog_fragment;
    expect(fragment).toContain('if ( underwaterFogEye.w < 0.5 ) {');
    expect(fragment).toContain('float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );');
    expect(fragment).toContain('gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );');
    // Under the Rich water, the display's colours are dithered instead (half an 8-bit step, three's own pattern).
    expect(fragment).toContain('} else {\n\n\t\tgl_FragColor.rgb += underwaterDither();');
    expect(ShaderChunk.fog_pars_fragment).toContain('vec3 shift = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );');
    // The new path runs in the scene-referred light, before the tone mapping, only in a program that has the fog's own declarations.
    const tone = ShaderChunk.tonemapping_fragment;
    expect(tone).toContain('#if defined( USE_FOG ) && defined( UNDERWATER_FOG )');
    expect(tone.indexOf('underwaterFogEye.w > 0.5')).toBeGreaterThan(-1);
    expect(tone.indexOf('underwaterFogEye.w > 0.5')).toBeLessThan(tone.indexOf('gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );'));
    expect(tone).toContain('vec3 uwThrough = exp( - underwaterFogEye.rgb * uwDistance );');
    expect(tone).toContain('gl_FragColor.rgb = gl_FragColor.rgb * uwThrough + underwaterRadiance( uwUp, uwDistance ) * ( 1.0 - uwThrough );');
    // The view-space position the distance and direction come from, and the water's radiance with its uniforms.
    expect(ShaderChunk.fog_vertex).toContain('vFogView = mvPosition.xyz;');
    expect(ShaderChunk.fog_pars_vertex).toContain('varying vec3 vFogView;');
    const pars = ShaderChunk.fog_pars_fragment;
    expect(pars).toContain('varying vec3 vFogView;');
    expect(pars).toContain('#define UNDERWATER_FOG');
    for (const name of Object.keys(underwaterFogUniforms)) expect(pars).toMatch(new RegExp(`uniform vec[34] ${name};`));
    // The GLSL's terms are the CPU twin's (`irradianceBelow`, `radianceAlong`).
    expect(pars).toContain('underwaterFogSun.rgb * exp( - underwaterFogDiffuse.rgb * z / underwaterFogSun.w )');
    expect(pars).toContain(`underwaterFogSky.rgb * exp( - ${DIFFUSE_PATH.toFixed(6)} * underwaterFogDiffuse.rgb * z )`);
    expect(pars).toContain('float reach = min( distance, underwaterFogDiffuse.w );');
    expect(pars).toContain('underwaterFogLevel * underwaterIrradiance( underwaterFogSky.w - up * reach )');
    expect(pars).toContain(`pow( vec3( ${(1 / TYLER.levelOverNadir).toFixed(6)} ), vec3( - up ) )`);
    expect(pars).toContain(`pow( underwaterFogZenith, vec3( pow( up, ${ZENITH_SHAPE.toFixed(6)} ) ) )`);
    // Idempotent: a second install changes nothing.
    const before = { ...ShaderChunk } as Record<string, string>;
    installUnderwaterFog();
    for (const name of ['fog_fragment', 'fog_vertex', 'fog_pars_fragment', 'fog_pars_vertex', 'tonemapping_fragment']) {
      expect((ShaderChunk as unknown as Record<string, string>)[name]).toBe(before[name]);
    }
  });

  it('installs exactly the edit of three\'s own chunks, and leaves the fog off, rather than breaking the page, when a newer three has changed them', () => {
    const edited = withUnderwaterFog(PRISTINE)!;
    expect(edited).toBeDefined();
    for (const name of Object.keys(PRISTINE) as (keyof typeof PRISTINE)[]) {
      expect(ShaderChunk[name]).toBe(edited[name]);
      expect(edited[name]).not.toBe(PRISTINE[name]);
    }
    // Three's own text stays whole inside the edits.
    expect(edited.fog_fragment).toContain(PRISTINE.fog_fragment.slice(PRISTINE.fog_fragment.indexOf('#ifdef FOG_EXP2'), PRISTINE.fog_fragment.lastIndexOf('#endif')).trim());
    expect(edited.tonemapping_fragment.endsWith(PRISTINE.tonemapping_fragment)).toBe(true);
    expect(withUnderwaterFog({ ...PRISTINE, fog_vertex: 'vFogDepth = - mvPosition.z * 1.0;' })).toBeUndefined();
    expect(withUnderwaterFog({ ...PRISTINE, fog_fragment: '#ifdef USE_FOG\n gl_FragColor.rgb = fogColor;\n#endif without the end' })).toBeUndefined();
    expect(withUnderwaterFog({ ...PRISTINE, tonemapping_fragment: '' })).toBeUndefined();
  });

  it('gives every shader with fog the shared uniforms, kept by reference so one write reaches every material', () => {
    for (const name of ['basic', 'physical', 'standard', 'points', 'lambert'] as const) {
      const cloned = UniformsUtils.clone(ShaderLib[name].uniforms);
      for (const [key, uniform] of Object.entries(underwaterFogUniforms)) expect(cloned[key].value).toBe(uniform.value);
    }
    expect((UniformsLib.fog as unknown as Record<string, unknown>).underwaterFogEye).toBe(underwaterFogUniforms.underwaterFogEye);
    // A shader without fog gets none.
    expect('underwaterFogEye' in ShaderLib.depth.uniforms).toBe(false);
  });

  it('leaves the lit seabed\'s own shader free of the fog\'s uniforms: the exposure gain reaches it through the display', async () => {
    const { SpotSeabed } = await import('./SpotSeabed');
    const { createCausticUniforms } = await import('./CausticMap');
    const seabed = new SpotSeabed();
    const one = () => ({ value: new Vector3() });
    seabed.useCaustics(createCausticUniforms(), { waterAttenuation: one(), waterDiffuseAttenuation: one(), waterBedAlbedo: one(), waterSunDirection: one() });
    seabed.setLook('rich');
    const shader = { uniforms: {} as Record<string, unknown>, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    seabed.mesh.material.onBeforeCompile(shader as never, undefined as never);
    const own = shader.fragmentShader.replace('#include <fog_pars_fragment>', '').replace('#include <tonemapping_fragment>', '');
    expect(own).not.toContain('underwaterFog');
  });
});

describe('the state of the Rich underwater fog', () => {
  beforeAll(() => installUnderwaterFog());

  /** The shader's radiance read from the uniforms alone, as `underwaterRadiance` does. */
  function fromUniforms(up: number, distance: number): Rgb {
    const { underwaterFogSun: sun, underwaterFogSky: skyUniform, underwaterFogDiffuse: k, underwaterFogLevel: level, underwaterFogZenith: zenith } = underwaterFogUniforms;
    const reach = Math.min(distance, k.value[3]);
    const z = Math.max(skyUniform.value[3] - up * reach, 0);
    return [0, 1, 2].map((i) => {
      const e = sun.value[i] * Math.exp((-k.value[i] * z) / sun.value[3]) + skyUniform.value[i] * Math.exp(-DIFFUSE_PATH * k.value[i] * z);
      const shape = up <= 0 ? (1 / TYLER.levelOverNadir) ** -up : zenith.value[i] ** (up ** ZENITH_SHAPE);
      return level.value[i] * e * shape;
    }) as unknown as Rgb;
  }

  it('switches on with its flag, and packs the spot\'s water, the light and the eye\'s depth so the shader gives `radianceAlong`', () => {
    const fog = new UnderwaterFog();
    fog.setActive(false);
    expect(underwaterFogUniforms.underwaterFogEye.value[3]).toBe(0);
    expect(fog.backdrop.visible).toBe(false);
    const padang = water('padang');
    for (const time of ['dawn', 'midday', 'sunset'] as const) {
      const { light } = lightAt(time);
      fog.setActive(true);
      fog.update(padang, light, 1.5);
      expect(fog.active).toBe(true);
      expect(fog.backdrop.visible).toBe(true);
      const eye = underwaterFogUniforms.underwaterFogEye.value;
      expect(Array.from(eye.subarray(0, 3))).toEqual(Array.from(new Float32Array(eyeAttenuation(padang.beam))));
      expect(eye[3]).toBe(1);
      expect(underwaterFogUniforms.underwaterFogSun.value[3]).toBeCloseTo(refractedCosine(Math.max(0.05, light.sunCosine)), 6);
      for (const up of [-0.8, -0.1, 0, 0.3, 1]) {
        for (const distance of [1, 6, 1e9]) {
          const shader = fromUniforms(up, distance);
          radianceAlong(padang, light, 1.5, up, distance).forEach((v, i) => expect(shader[i] / v).toBeCloseTo(1, 5));
        }
      }
    }
    fog.setActive(false);
    expect(underwaterFogUniforms.underwaterFogEye.value[3]).toBe(0);
    expect(fog.backdrop.visible).toBe(false);
  });

  it('shows the water at infinity by direction where nothing is drawn: a box at the eye\'s far plane, drawn last of the opaque objects, tone-mapped as the rest', () => {
    const { backdrop } = new UnderwaterFog();
    const material = backdrop.material;
    for (const [key, uniform] of Object.entries(underwaterFogUniforms)) expect(material.uniforms[key]).toBe(uniform);
    expect(material.fragmentShader).toContain('underwaterRadiance( normalize( vUnderwaterDirection ).y, 1e9 )');
    expect(material.fragmentShader).toContain('#include <tonemapping_fragment>');
    expect(material.fragmentShader.indexOf('gl_FragColor.rgb += underwaterDither();')).toBeGreaterThan(material.fragmentShader.indexOf('#include <colorspace_fragment>'));
    expect(material.side).toBe(BackSide);
    // Depth-tested at the far plane: only the pixels nothing covered are shaded.
    expect(material.vertexShader).toContain('gl_Position.z = gl_Position.w;');
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.transparent).toBe(false);
    expect(material.fog).toBe(false);
    expect(material.toneMapped).toBe(true);
    expect(backdrop.renderOrder).toBe(Number.MAX_SAFE_INTEGER);
    expect(backdrop.frustumCulled).toBe(false);
    // Centred on whichever eye draws it.
    const camera = new PerspectiveCamera();
    camera.position.set(12, -3, 40);
    camera.updateMatrixWorld();
    backdrop.matrixWorld.copy(new Matrix4());
    backdrop.onBeforeRender(undefined as never, undefined as never, camera, undefined as never, undefined as never, undefined as never);
    expect(new Vector3().setFromMatrixPosition(backdrop.matrixWorld).toArray()).toEqual([12, -3, 40]);
  });

  it('stays off, and the flat fog with it, where the chunks could not be installed (a newer three)', async () => {
    vi.resetModules();
    const three = await import('three');
    const original = three.ShaderChunk.fog_vertex;
    (three.ShaderChunk as unknown as Record<string, string>).fog_vertex = 'vFogDepth = - mvPosition.z * 1.0;';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const fresh = await import('./underwaterFog');
      expect(fresh.installUnderwaterFog()).toBe(false);
      expect(warn).toHaveBeenCalled();
      const fog = new fresh.UnderwaterFog();
      fog.setActive(true);
      expect(fog.active).toBe(false);
      expect(fog.backdrop.visible).toBe(false);
      expect(fresh.underwaterFogUniforms.underwaterFogEye.value[3]).toBe(0);
    } finally {
      (three.ShaderChunk as unknown as Record<string, string>).fog_vertex = original;
      warn.mockRestore();
      vi.resetModules();
    }
  });
});

describe('the water the view looks through', () => {
  const v = (x: number, y: number, z: number) => ({ value: new Vector3(x, y, z) });
  it('is the Rich look\'s own where the water binds it, and the optics both looks share otherwise', () => {
    const shared = { waterAttenuation: v(0.5, 0.2, 0.17), waterDiffuseAttenuation: v(0.4, 0.07, 0.02), waterDeepReflectance: v(0.001, 0.02, 0.07) };
    expect(underwaterWaterOf(shared)).toEqual({ beam: [0.5, 0.2, 0.17], diffuse: [0.4, 0.07, 0.02], deep: [0.001, 0.02, 0.07] });
    const rich = { ...shared, richAttenuation: v(0.54, 0.27, 0.28), richDiffuseAttenuation: v(0.4, 0.12, 0.13), richDeepReflectance: v(0.003, 0.01, 0.013) };
    expect(underwaterWaterOf(rich)).toEqual({ beam: [0.54, 0.27, 0.28], diffuse: [0.4, 0.12, 0.13], deep: [0.003, 0.01, 0.013] });
  });
});
