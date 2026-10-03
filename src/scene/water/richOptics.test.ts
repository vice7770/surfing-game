import { PerspectiveCamera, ShaderLib, Vector3, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FarFieldOcean } from '../FarFieldOcean';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import {
  BED_RAY_FLOOR, CLASSIC_FOAM, PARTICLE_ALBEDO, PARTICLE_BACKSCATTER_FRACTION, SPOT_OPTICS, WATER_ABSORPTION, WATER_IOR, applyOptics, beamAttenuation,
  createOpticsUniforms, deepReflectance, diffuseAttenuation, refractedCosine, schlickFresnel, shallowReflectance, WATER_F0, waterBodyFragment, type WaterOptics,
} from '../waterOptics';
import {
  CRITICAL_ANGLE, DIFFUSE_FRESNEL, DIFFUSE_STRETCH, FOAM_TRANSMITTANCE, LEVEL_OVER_NADIR, MIRROR_FLOOR, PHYTOPLANKTON, PLUME_OPTICAL_DEPTH, RICH_NORMAL_FLOOR,
  RICH_NORMAL_GUARD, RICH_UNDERSIDE_REFLECTION, UNDERWATER_MARGIN, WINDOW_ANGLE, applyLookOptics, applyRichWater, bedPathFactor, bricaudCdm,
  dissolvedAbsorption, downwelling, eyeUnderwaterIn, guardedNormal, mirroredWaterShape, phytoplanktonAbsorption, plumeTransmission, refractOut, refractRay,
  richAbsorption, richBeamAttenuation, richDeepReflectance, richDiffuseAttenuation, richShallowReflectance, richUndersideFragment, shareEyeTest,
  undersideRadiance, windowGain,
} from './richOptics';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {}, cubic: true };

/** A material's fragment shader after its `onBeforeCompile`, run on three's own physical shader source. */
function fragmentOf(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }): string {
  const shader = {
    uniforms: {},
    vertexShader: ShaderLib.physical.vertexShader,
    fragmentShader: ShaderLib.physical.fragmentShader,
  } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return shader.fragmentShader;
}

const unit = (x: number, y: number, z: number) => new Vector3(x, y, z).normalize();

describe('the Rich normal guard', () => {
  const toEye = unit(0.2, 0.3, 1);
  const side = unit(-toEye.z, 0, toEye.x);
  /** The unit normal `degrees` off the eye direction, in the plane of the eye and `side`. */
  const turned = (degrees: number) => {
    const angle = (degrees * Math.PI) / 180;
    return toEye.clone().multiplyScalar(Math.cos(angle)).add(side.clone().multiplyScalar(Math.sin(angle)));
  };

  it('leaves a normal that faces the eye alone, bit for bit', () => {
    for (const normal of [toEye.clone(), unit(0.1, 0.5, 1), turned(40), turned(80), turned(86)]) {
      expect(normal.dot(toEye)).toBeGreaterThanOrEqual(RICH_NORMAL_FLOOR);
      expect(guardedNormal(normal, toEye).toArray()).toEqual(normal.toArray());
    }
  });

  it('turns a normal that faces away back to the visible hemisphere, in the plane it makes with the eye', () => {
    const away = [unit(0, 0.1, -1), unit(0.7, -0.2, -0.4), unit(-0.3, 0.6, -0.9), toEye.clone().negate(), turned(95), turned(150)];
    for (const normal of away) {
      expect(normal.dot(toEye)).toBeLessThan(RICH_NORMAL_FLOOR);
      const guarded = guardedNormal(normal, toEye);
      expect(guarded.length()).toBeCloseTo(1, 12);
      // The floor before renormalising, a hair either side of it after: facing the eye again.
      expect(guarded.dot(toEye)).toBeGreaterThan(0.045);
      // In the plane of the normal and the eye: the triple product vanishes.
      expect(Math.abs(normal.clone().cross(toEye).dot(guarded))).toBeLessThan(1e-12);
    }
  });

  it('is continuous across the floor: sweeping a normal from facing the eye to facing away, it never jumps', () => {
    let last: Vector3 | undefined;
    for (let degrees = 60; degrees <= 140; degrees += 0.25) {
      const guarded = guardedNormal(turned(degrees), toEye);
      expect(guarded.dot(toEye)).toBeGreaterThan(0.045);
      if (last) expect(guarded.distanceTo(last)).toBeLessThan(0.02);
      last = guarded;
    }
  });

  it('mirrors the CPU twin in its GLSL: the floor, the push along the eye and the renormalisation', () => {
    expect(RICH_NORMAL_GUARD).toContain(`if ( richGuardCos < ${RICH_NORMAL_FLOOR.toFixed(2)} )`);
    expect(RICH_NORMAL_GUARD).toContain('normal = normalize( normal + ( 0.05 - richGuardCos ) * richGuardView );');
    expect(RICH_NORMAL_GUARD).toContain('isOrthographic ? vec3( 0.0, 0.0, 1.0 ) : normalize( vViewPosition )');
  });

  it('is compiled into the Rich tank and far ocean right after their normal chunk, and not into Classic', () => {
    const rich = new WaterSurface(source);
    rich.setLook('rich');
    const tank = fragmentOf(rich.mesh.material);
    expect(tank).toContain(RICH_NORMAL_GUARD);
    expect(tank.indexOf(RICH_NORMAL_GUARD)).toBeGreaterThan(tank.indexOf('normal = normalize( ( viewMatrix * vec4( waterWorldNormal, 0.0 ) ).xyz );'));
    // Before the body reads the normal.
    expect(tank.indexOf(RICH_NORMAL_GUARD)).toBeLessThan(tank.indexOf('vec3 waterN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );'));

    const ocean = new FarFieldOcean();
    ocean.setLook('rich');
    const far = fragmentOf(ocean.mesh.material);
    expect(far).toContain(RICH_NORMAL_GUARD);
    expect(far.indexOf(RICH_NORMAL_GUARD)).toBeGreaterThan(far.indexOf('normal = normalize( ( viewMatrix * vec4( chopNormal, 0.0 ) ).xyz );'));
    expect(far.indexOf(RICH_NORMAL_GUARD)).toBeLessThan(far.indexOf('vec3 waterN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );'));

    // Classic's programs are untouched (waterLooks.test.ts pins their text).
    expect(fragmentOf(new WaterSurface({ ...source, cubic: false }).mesh.material)).not.toContain('richGuard');
    expect(fragmentOf(new FarFieldOcean().mesh.material)).not.toContain('richGuard');
  });
});

describe('the Rich bed path', () => {
  const up = new Vector3(0, 1, 0);
  /** A unit direction from the fragment toward the eye / the sun, `elevation` degrees above the horizon, heading `azimuth` degrees round. */
  const toward = (elevation: number, azimuth = 0) => {
    const e = (elevation * Math.PI) / 180;
    const a = (azimuth * Math.PI) / 180;
    return new Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a));
  };
  /** Padang's water as Classic has it. */
  const optics: WaterOptics = { turbidity: SPOT_OPTICS.padang.turbidity, bedAlbedo: SPOT_OPTICS.padang.bedAlbedo };
  const water = { deep: deepReflectance(optics), diffuse: diffuseAttenuation(optics), bed: optics.bedAlbedo };

  it('bends a ray by Snell’s law, straight at normal incidence and into the critical cone at grazing', () => {
    expect(refractRay(new Vector3(0, -1, 0), up).toArray()).toEqual([0, -1, 0]);
    const grazing = refractRay(toward(0.0001, 20).negate(), up);
    // sin θt = sin θi / n: a grazing ray refracts to 48.6° from the vertical, the critical angle.
    expect(Math.acos(-grazing.y)).toBeCloseTo(Math.asin(1 / WATER_IOR), 3);
    expect(grazing.length()).toBeCloseTo(1, 9);
    // Out of the denser side past the critical angle there is no refracted ray.
    expect(refractRay(toward(-30, 0).negate().setY(0.3).normalize(), new Vector3(0, -1, 0), WATER_IOR).length()).toBe(0);
  });

  it('crosses the depth exactly as the normal-relative path does on flat water, so the flat sea is unchanged', () => {
    for (const [view, sun] of [[90, 90], [60, 35], [30, 70], [12, 20], [4, 55]]) {
      for (const depth of [0, 0.4, 2, 7, 25]) {
        const v = toward(view, 17);
        const l = toward(sun, 140);
        const classic = shallowReflectance(optics, depth, v.dot(up), l.dot(up));
        const rich = richShallowReflectance(water, depth, refractRay(v.clone().negate(), up), refractRay(l.clone().negate(), up));
        rich.forEach((value, i) => expect(value).toBeCloseTo(classic[i], 12));
      }
    }
  });

  it('puts the bed far behind a steep face seen square on, where the normal-relative path put it at the column’s depth', () => {
    // A face tilted 60° from the vertical toward an eye level with it, the sun high behind the eye.
    const tilt = (60 * Math.PI) / 180;
    const normal = new Vector3(0, Math.cos(tilt), Math.sin(tilt));
    const eye = new Vector3(0, 0, 1);
    const sun = toward(75, 0);
    const refractedView = refractRay(eye.clone().negate(), normal);
    const refractedSun = refractRay(sun.clone().negate(), normal);
    const normalPath = 1 / Math.sqrt(1 - (1 - normal.dot(eye) ** 2) / WATER_IOR ** 2) + 1 / Math.sqrt(1 - (1 - Math.max(0, normal.dot(sun)) ** 2) / WATER_IOR ** 2);
    expect(bedPathFactor(refractedView, refractedSun)).toBeGreaterThan(2 * normalPath);
    // Padang's coral gives a shallow face its olive (blue no stronger than red); along the rays the face takes the
    // water's own colour, nearer R∞ in every channel.
    const depth = 3;
    const classic = shallowReflectance(optics, depth, normal.dot(eye), Math.max(0, normal.dot(sun)));
    const rich = richShallowReflectance(water, depth, refractedView, refractedSun);
    expect(rich[2] / rich[0]).toBeGreaterThan(1.5 * (classic[2] / classic[0]));
    for (let i = 0; i < 3; i += 1) expect(Math.abs(rich[i] - water.deep[i])).toBeLessThan(Math.abs(classic[i] - water.deep[i]));
  });

  it('holds a ray that heads up out of the water at the caustic lookup’s floor: the bed fades to R∞', () => {
    const upward = new Vector3(0.6, 0.3, -0.74).normalize();
    const down = new Vector3(0, -1, 0);
    expect(bedPathFactor(upward, down)).toBeCloseTo(1 / BED_RAY_FLOOR + 1, 12);
    const rich = richShallowReflectance(water, 25, upward, down);
    for (let i = 0; i < 3; i += 1) expect(rich[i]).toBeCloseTo(water.deep[i], 2);
  });

  it('lights the bed by the caustic term, at the surface all bed', () => {
    const straight = new Vector3(0, -1, 0);
    expect(richShallowReflectance(water, 0, straight, straight, 0)).toEqual([0, 0, 0]);
    richShallowReflectance(water, 0, straight, straight, 2).forEach((value, i) => expect(value).toBeCloseTo(2 * water.bed[i], 12));
  });

  it('is the Rich option of the body chunk alone, on the water’s own uniforms; Classic’s text is unchanged', () => {
    const eta = (1 / WATER_IOR).toFixed(6);
    const classic = waterBodyFragment(true, true);
    expect(classic).toBe(waterBodyFragment(true, true, CLASSIC_FOAM, '', false));
    expect(classic).toContain('waterBodyReflectanceLit( vWaterDepth, waterViewCos');
    expect(classic).not.toContain('waterSunDown');
    const rich = waterBodyFragment(true, true, CLASSIC_FOAM, '', true);
    expect(rich).toContain(`vec3 waterSunDown = refract( -waterSunDirection, waterN, ${eta} );`);
    expect(rich).toContain('vec3 waterReach = exp( -waterDiffuseAttenuation * ( max( vWaterDepth, 0.0 ) * ( 1.0 / max( 0.05, -waterDown.y ) + 1.0 / max( 0.05, -waterSunDown.y ) ) ) );');
    // The bed lies along the same refracted ray the caustic lookup follows.
    expect(rich).toContain('vec2 waterBedXZ = vWaterWorld.xz + waterDown.xz * ( vWaterDepth / max( 0.05, -waterDown.y ) );');
    expect(rich).toContain('waterBody = waterDeepReflectance * ( 1.0 - waterReach ) + waterBedAlbedo * causticLightAt( waterBedXZ ) * waterReach;');
    expect(rich).not.toContain('waterBodyReflectance');
    expect(waterBodyFragment(false, false, CLASSIC_FOAM, '', true)).toContain('waterBody = waterDeepReflectance * ( 1.0 - waterReach ) + waterBedAlbedo * waterReach;');
    // The curl's sheet follows the body, and the crest light is Classic's.
    const sheet = waterBodyFragment(true, true, CLASSIC_FOAM, 'SHEET();', true);
    expect(sheet.indexOf('SHEET();')).toBeGreaterThan(sheet.indexOf('causticLightAt( waterBedXZ ) * waterReach;'));
    expect(sheet).toContain('exp( -waterAttenuation * waterThickness )');
  });

  it('is compiled into the Rich tank and far ocean, and not into Classic', () => {
    const tank = new WaterSurface(source);
    tank.setLook('rich');
    expect(fragmentOf(tank.mesh.material)).toContain('causticLightAt( waterBedXZ ) * waterReach;');
    const ocean = new FarFieldOcean();
    ocean.setLook('rich');
    expect(fragmentOf(ocean.mesh.material)).toContain('waterBody = waterDeepReflectance * ( 1.0 - waterReach ) + waterBedAlbedo * waterReach;');
    expect(fragmentOf(new WaterSurface({ ...source, cubic: false }).mesh.material)).not.toContain('waterReach');
    expect(fragmentOf(new FarFieldOcean().mesh.material)).not.toContain('waterReach');
  });
});

describe('the Rich look’s sourced water colour', () => {
  const channels = ['red', 'green', 'blue'];
  type Spot = keyof typeof SPOT_OPTICS;
  const spots: Spot[] = ['reef', 'padang', 'point', 'beach', 'canyon'];
  /** Hue of a linear RGB colour, degrees (the convention of notes/round5-underwater/water-colour.md). */
  const hue = (rgb: readonly number[]) => {
    const [r, g, b] = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === r) return (60 * ((g - b) / (max - min)) + 360) % 360;
    if (max === g) return 60 * ((b - r) / (max - min)) + 120;
    return 60 * ((r - g) / (max - min)) + 240;
  };

  it('takes Bricaud et al. 1998’s phytoplankton-only coefficients, a = A · Chl^E, at 650, 550 and 450 nm', () => {
    // The Aphi and Ephi columns of aph_bricaud_1998.txt (water-colour.md §6), not the total-particle Ap and Ep.
    expect(PHYTOPLANKTON).toEqual([{ A: 0.00777566, E: 0.815461 }, { A: 0.00702755, E: 0.9311673 }, { A: 0.0349905, E: 0.599299 }]);
    expect(phytoplanktonAbsorption(1)).toEqual([0.00777566, 0.00702755, 0.0349905]);
    expect(phytoplanktonAbsorption(0.77)[2]).toBeCloseTo(0.0349905 * 0.77 ** 0.599299, 12);
  });

  it('gives dissolved and detrital matter its exponential slope from 440 nm', () => {
    const [red, green, blue] = dissolvedAbsorption(0.052, 0.011);
    expect(blue).toBeCloseTo(0.052 * Math.exp(-0.011 * 10), 12);
    expect(green).toBeCloseTo(0.052 * Math.exp(-0.011 * 110), 12);
    expect(red).toBeCloseTo(0.052 * Math.exp(-0.011 * 210), 12);
  });

  it('holds each spot’s dissolved matter as Bricaud, Ciotti & Gentili 2012’s fit gives it from the chlorophyll', () => {
    for (const spot of spots) {
      const optics = SPOT_OPTICS[spot];
      const { cdom440, slope } = bricaudCdm(optics.chlorophyll!);
      // The table rounds a_cdm to two figures and clamps the slope to 0.011–0.025 nm⁻¹.
      expect(optics.cdom440! / cdom440, spot).toBeGreaterThan(0.95);
      expect(optics.cdom440! / cdom440, spot).toBeLessThan(1.05);
      expect(optics.cdomSlope, spot).toBeCloseTo(slope, 3);
    }
    expect(bricaudCdm(1e-6).slope).toBe(0.025);
    expect(bricaudCdm(50).slope).toBe(0.011);
  });

  it('adds the phytoplankton and dissolved absorption of the a_φ rerun (water-colour.md §6), spot by spot', () => {
    // §6's "Added a (R, G, B), a_φ" column; §3's older table (a_p, with detritus counted twice) is superseded.
    const added: Record<Spot, [number, number, number]> = {
      reef: [0.0008, 0.0007, 0.0087], padang: [0.0114, 0.021, 0.0765], point: [0.0039, 0.0063, 0.0349], beach: [0.0223, 0.0437, 0.1449], canyon: [0.0239, 0.0473, 0.1556],
    };
    for (const spot of spots) {
      const optics = SPOT_OPTICS[spot];
      richAbsorption(optics).forEach((value, i) => expect(value - WATER_ABSORPTION[i] - optics.flatAbsorption!, `${spot} ${channels[i]}`).toBeCloseTo(added[spot][i], 4));
    }
  });

  it('keeps the flat term variant (b) fits: the game’s Kd(490) ≈ 1.1 (a + b_b) meets VIIRS’s Kd490, or the term is floored at zero', () => {
    // At 490 nm: pure water 0.0150 m⁻¹ (Pope & Fry 1997), a_φ = 0.0253719 Chl^0.607395 (§6's Aphi/Ephi row), the
    // dissolved matter on its slope, and b_b of seawater and particles as `waterOptics` has them.
    const kd490 = (optics: WaterOptics) => {
      const a = 0.015 + 0.0253719 * optics.chlorophyll! ** 0.607395 + optics.cdom440! * Math.exp(-optics.cdomSlope! * 50) + optics.flatAbsorption!;
      const bb = 0.5 * 0.0076 * (400 / 490) ** 4.32 + PARTICLE_BACKSCATTER_FRACTION * optics.turbidity;
      return 1.1 * (a + bb);
    };
    // VIIRS medians, 2023: Padang Padang 0.122, Snapper Rocks 0.067, Nazaré 0.170 (the Point and the Canyon).
    expect(kd490(SPOT_OPTICS.padang)).toBeCloseTo(0.122, 3);
    expect(kd490(SPOT_OPTICS.point)).toBeCloseTo(0.067, 3);
    expect(kd490(SPOT_OPTICS.canyon)).toBeCloseTo(0.17, 2);
    // Teahupo'o (0.026) and Supertubos (0.161) are met or passed with no flat term: it stays at zero.
    expect(SPOT_OPTICS.reef.flatAbsorption).toBe(0);
    expect(SPOT_OPTICS.beach.flatAbsorption).toBe(0);
    expect(kd490(SPOT_OPTICS.reef)).toBeCloseTo(0.027, 3);
    expect(kd490(SPOT_OPTICS.beach)).toBeCloseTo(0.165, 3);
  });

  it('replaces the grey particle absorption where a spot has chlorophyll, and keeps Classic’s water where it has none', () => {
    const none: WaterOptics = { turbidity: 0.3, bedAlbedo: [0.4, 0.35, 0.25] };
    expect(richBeamAttenuation(none)).toEqual([...beamAttenuation(none)]);
    expect(richDiffuseAttenuation(none)).toEqual([...diffuseAttenuation(none)]);
    expect(richDeepReflectance(none)).toEqual([...deepReflectance(none)]);
    const grey = (0.3 * (1 - PARTICLE_ALBEDO)) / PARTICLE_ALBEDO;
    const coloured: WaterOptics = { ...none, chlorophyll: 0.5, cdom440: 0.03, cdomSlope: 0.014, flatAbsorption: 0.01 };
    richAbsorption(coloured).forEach((value, i) => {
      expect(value).toBeCloseTo(WATER_ABSORPTION[i] + phytoplanktonAbsorption(0.5)[i] + dissolvedAbsorption(0.03, 0.014)[i] + 0.01, 12);
      expect(value).not.toBeCloseTo(WATER_ABSORPTION[i] + grey, 4);
    });
    // The dissolved matter follows from the chlorophyll when only that is given.
    const { cdom440, slope } = bricaudCdm(0.5);
    richAbsorption({ ...none, chlorophyll: 0.5 }).forEach((value, i) => expect(value).toBeCloseTo(WATER_ABSORPTION[i] + phytoplanktonAbsorption(0.5)[i] + dissolvedAbsorption(cdom440, slope)[i], 12));
    // Scattering is the spot's own: c = a + b_p.
    expect(richBeamAttenuation(coloured)[1] - richAbsorption(coloured)[1]).toBeCloseTo(0.3, 12);
  });

  it('turns Padang’s deep water from navy to cyan and keeps the Reef blue: the hues of the a_φ rerun', () => {
    const today = (spot: Spot) => hue(deepReflectance(SPOT_OPTICS[spot]));
    const rich = (spot: Spot) => hue(richDeepReflectance(SPOT_OPTICS[spot]));
    expect(today('padang')).toBeCloseTo(227.5, 1);
    // R∞'s own hue. The table's "186°" was §3's a_p fog hue; §6's a_φ rerun puts the fog 2 m down at 193°, and R∞,
    // under white light, is 195.6°.
    expect(rich('padang')).toBeCloseTo(195.6, 1);
    const fog = (spot: Spot, depth: number) => richDeepReflectance(SPOT_OPTICS[spot]).map((r, i) => r * Math.exp(-richDiffuseAttenuation(SPOT_OPTICS[spot])[i] * depth));
    expect(hue(fog('padang', 2))).toBeCloseTo(193, 0);
    expect(Math.abs(rich('reef') - today('reef'))).toBeLessThan(4);
    expect(hue(fog('reef', 2))).toBeCloseTo(226, 0);
    // Sea green at the Beach (1.3 m down) and the Canyon, cyan at the Point (Snapper Rocks): §6's 155°, 154° and 198°.
    expect(hue(fog('beach', 1.3))).toBeCloseTo(155, 0);
    expect(hue(fog('canyon', 2))).toBeCloseTo(154, 0);
    expect(hue(fog('point', 2))).toBeCloseTo(198, 0);
  });

  it('keeps the sighting the sourced numbers give, 4.8/c_G: §3’s variant (b), which §6’s a_φ moves by about 1 %', () => {
    const sighting = (spot: Spot) => 4.8 / richBeamAttenuation(SPOT_OPTICS[spot])[1];
    const table: Partial<Record<Spot, number>> = { reef: 23.1, padang: 18.2, point: 4.5, beach: 2.3 };
    for (const [spot, metres] of Object.entries(table)) {
      expect(Math.abs(sighting(spot as Spot) / metres - 1), spot).toBeLessThan(0.015);
    }
  });

  it('puts the Rich water in the water’s own uniforms for the Rich look, and Classic’s back byte for byte', () => {
    const uniforms = createOpticsUniforms();
    const vector = (name: string) => (uniforms[name].value as Vector3).toArray();
    applyLookOptics(uniforms, SPOT_OPTICS.padang, 'rich');
    expect(vector('waterAttenuation')).toEqual(new Vector3().fromArray(richBeamAttenuation(SPOT_OPTICS.padang)).toArray());
    expect(vector('waterDiffuseAttenuation')).toEqual(new Vector3().fromArray(richDiffuseAttenuation(SPOT_OPTICS.padang)).toArray());
    expect(vector('waterDeepReflectance')).toEqual(new Vector3().fromArray(richDeepReflectance(SPOT_OPTICS.padang)).toArray());
    expect(vector('waterBedAlbedo')).toEqual([...SPOT_OPTICS.padang.bedAlbedo]);
    const classic = createOpticsUniforms();
    applyOptics(classic, SPOT_OPTICS.padang);
    applyLookOptics(uniforms, SPOT_OPTICS.padang, 'classic');
    for (const name of ['waterAttenuation', 'waterDiffuseAttenuation', 'waterDeepReflectance', 'waterBedAlbedo']) {
      expect(vector(name)).toEqual((classic[name].value as Vector3).toArray());
    }
    // applyRichWater is the Rich half alone.
    const rich = createOpticsUniforms();
    applyRichWater(rich, SPOT_OPTICS.reef);
    expect((rich.waterDeepReflectance.value as Vector3).toArray()).toEqual(new Vector3().fromArray(richDeepReflectance(SPOT_OPTICS.reef)).toArray());
  });

  it('follows the look the tank and the far ocean draw, so their curl and plume take it too; Classic keeps the grey water', () => {
    const vector = (uniforms: Record<string, { value: unknown }>, name: string) => (uniforms[name].value as Vector3).toArray();
    const expectClassic = (uniforms: Record<string, { value: unknown }>, optics: WaterOptics) => {
      expect(vector(uniforms, 'waterAttenuation')).toEqual(new Vector3().fromArray(beamAttenuation(optics)).toArray());
      expect(vector(uniforms, 'waterDeepReflectance')).toEqual(new Vector3().fromArray(deepReflectance(optics)).toArray());
    };
    const expectRich = (uniforms: Record<string, { value: unknown }>, optics: WaterOptics) => {
      expect(vector(uniforms, 'waterAttenuation')).toEqual(new Vector3().fromArray(richBeamAttenuation(optics)).toArray());
      expect(vector(uniforms, 'waterDiffuseAttenuation')).toEqual(new Vector3().fromArray(richDiffuseAttenuation(optics)).toArray());
      expect(vector(uniforms, 'waterDeepReflectance')).toEqual(new Vector3().fromArray(richDeepReflectance(optics)).toArray());
    };
    const tank = new WaterSurface(source);
    tank.setOptics(SPOT_OPTICS.padang);
    expectClassic(tank.materialUniforms, SPOT_OPTICS.padang);
    tank.setLook('rich');
    expectRich(tank.materialUniforms, SPOT_OPTICS.padang);
    tank.setOptics(SPOT_OPTICS.reef);
    expectRich(tank.materialUniforms, SPOT_OPTICS.reef);
    tank.setLook('classic');
    expectClassic(tank.materialUniforms, SPOT_OPTICS.reef);
    // A source the Rich look doesn't draw (no Catmull-Rom bodies) keeps Classic's water in either setting.
    const still = new WaterSurface({ ...source, cubic: false });
    still.setLook('rich');
    still.setOptics(SPOT_OPTICS.padang);
    expectClassic(still.materialUniforms, SPOT_OPTICS.padang);

    const ocean = new FarFieldOcean();
    const oceanUniforms = (ocean as unknown as { uniforms: Record<string, { value: unknown }> }).uniforms;
    ocean.setOptics(SPOT_OPTICS.padang);
    expectClassic(oceanUniforms, SPOT_OPTICS.padang);
    ocean.setLook('rich');
    expectRich(oceanUniforms, SPOT_OPTICS.padang);
    ocean.setLook('classic');
    expectClassic(oceanUniforms, SPOT_OPTICS.padang);
  });
});

describe('the Rich surface seen from below', () => {
  const down = new Vector3(0, -1, 0);
  /** Looking up from under flat water, `zenith` degrees off the vertical. */
  const looking = (zenith: number) => new Vector3(Math.sin((zenith * Math.PI) / 180), Math.cos((zenith * Math.PI) / 180), 0);

  it('opens Snell’s window 97.2° across on flat water: the sky inside the critical angle, the water mirrored past it', () => {
    expect((CRITICAL_ANGLE * 180) / Math.PI).toBeCloseTo(48.6, 1);
    expect((WINDOW_ANGLE * 180) / Math.PI).toBeCloseTo(97.2, 1);
    // A ray up at the critical angle leaves along the horizon; just past it, it is reflected whole.
    expect(refractOut(looking(48.55), down).y).toBeGreaterThan(0);
    expect(refractOut(looking(48.55), down).y).toBeLessThan(0.05);
    expect(refractOut(looking(48.7), down).length()).toBe(0);
    // Straight up the sky comes through, gaining n² (1 − F) (the radiance law entering the denser medium).
    const sky = () => 1;
    expect(undersideRadiance(looking(0), down, sky, 0)).toBeCloseTo(windowGain(1), 9);
    expect(windowGain(1)).toBeCloseTo(WATER_IOR ** 2 * (1 - WATER_F0), 12);
    // Past the critical angle the eye sees only the water mirrored.
    expect(undersideRadiance(looking(60), down, sky, 0.3)).toBe(0.3);
  });

  it('is much brighter looking up than looking level (Tyler 1960’s 7 between level and nadir; up at least 4×)', () => {
    // The light just under the surface at midday, sun 60° up (irradiance 1 square to it) and a sky of 0.3 on a level plane.
    const below = downwelling(1, Math.sin((60 * Math.PI) / 180), 0.3, 0, 0);
    const deep = richDeepReflectance(SPOT_OPTICS.padang)[1];
    const level = (LEVEL_OVER_NADIR * deep * below) / Math.PI;
    // The zenith: a sky radiance of a uniform sky giving the same 0.3, through the window.
    const zenith = undersideRadiance(looking(0), down, () => 0.3 / Math.PI, level);
    expect(zenith / level).toBeGreaterThan(4);
    // The mirrored water falls from the level radiance to the nadir's, a seventh of it.
    expect(mirroredWaterShape(-MIRROR_FLOOR)).toBeCloseTo((1 / 7) ** MIRROR_FLOOR, 12);
    expect(mirroredWaterShape(-1)).toBeCloseTo(1 / 7, 12);
    expect(mirroredWaterShape(0.3)).toBe(mirroredWaterShape(-MIRROR_FLOOR));
  });

  it('lights the bed it mirrors with the light under the surface: the sun after Fresnel down its refracted path, the sky down its diffuse one', () => {
    const k = 0.12;
    const mu = Math.sin((30 * Math.PI) / 180);
    const sunIn = mu * (1 - schlickFresnel(mu));
    const skyIn = 0.4 * (1 - DIFFUSE_FRESNEL);
    expect(downwelling(1, mu, 0.4, k, 0)).toBeCloseTo(sunIn + skyIn, 12);
    // At 5 m the sun has crossed 5/μ_w m of water, μ_w the refracted cosine (not the air side's), the sky 1.2 × 5 m.
    expect(downwelling(1, mu, 0.4, k, 5)).toBeCloseTo(sunIn * Math.exp((-k * 5) / refractedCosine(mu)) + skyIn * Math.exp(-DIFFUSE_STRETCH * k * 5), 12);
    expect(refractedCosine(mu)).toBeCloseTo(Math.cos(Math.asin(Math.sin(Math.acos(mu)) / WATER_IOR)), 12);
    expect(refractedCosine(mu)).toBeGreaterThan(mu);
    // A low sun's light still reaches the bed: refracted, it runs no shallower than the critical angle.
    expect(refractedCosine(0.05)).toBeGreaterThan(Math.cos(CRITICAL_ANGLE) - 1e-9);
  });

  it('glows white under foam and plume, as diffusers lit from above', () => {
    expect(FOAM_TRANSMITTANCE).toBe(0.45);
    expect(plumeTransmission(0, 2)).toBe(1);
    // A young plume, 10 % air over a metre: τ = 1500 · 0.1 · 1 = 150.
    expect(plumeTransmission(0.1, 1)).toBeCloseTo(1 / (1 + 0.1125 * 150), 12);
    expect(PLUME_OPTICAL_DEPTH).toBe(1500);
  });

  it('mirrors the CPU twins in its GLSL, from below only and only for an eye under the water', () => {
    const glsl = richUndersideFragment(true);
    expect(glsl).toContain('if ( richUnderwater > 0.5 && faceDirection < 0.0 ) {');
    expect(glsl).toContain(`vec3 richOut = refract( -waterV, waterN, ${WATER_IOR.toFixed(3)} );`);
    expect(glsl).toContain('vec3 richSunIn = waterSunRadiance * richSunUp * ( 1.0 - waterFresnel( richSunUp ) );');
    expect(glsl).toContain(`vec3 richSkyIn = richSkyDown * ${(1 - DIFFUSE_FRESNEL).toFixed(3)};`);
    expect(glsl).toContain('exp( -waterDiffuseAttenuation * vWaterDepth / waterRefractedCosine( richSunUp ) )');
    expect(glsl).toContain(`exp( -waterDiffuseAttenuation * ${DIFFUSE_STRETCH.toFixed(1)} * vWaterDepth )`);
    expect(glsl).toContain(`richCeiling = richF * richMirror + ( 1.0 - richF ) * ${(WATER_IOR ** 2).toFixed(3)} * richSky;`);
    expect(glsl).toContain(`richMirrorDir.y = min( richMirrorDir.y, -${MIRROR_FLOOR.toFixed(2)} );`);
    expect(glsl).toContain('vWaterAir');
    expect(richUndersideFragment(false)).not.toContain('vWaterAir');
    expect(RICH_UNDERSIDE_REFLECTION).toContain('if ( richUnderwater > 0.5 && faceDirection < 0.0 ) radiance = vec3( 0.0 );');
  });

  it('is compiled into the Rich tank and far ocean only; Classic’s programs are untouched', () => {
    const tank = new WaterSurface(source);
    tank.setLook('rich');
    const fragment = fragmentOf(tank.mesh.material);
    expect(fragment).toContain(richUndersideFragment(true));
    expect(fragment).toContain(RICH_UNDERSIDE_REFLECTION);
    expect(fragment.indexOf(richUndersideFragment(true))).toBeGreaterThan(fragment.indexOf('diffuseColor.rgb = mix( waterUnder, waterFoamColor * waterCrease, waterCover );'));
    const ocean = new FarFieldOcean();
    ocean.setLook('rich');
    expect(fragmentOf(ocean.mesh.material)).toContain(richUndersideFragment(false));
    expect(fragmentOf(new WaterSurface({ ...source, cubic: false }).mesh.material)).not.toContain('richUnderwater');
    expect(fragmentOf(new FarFieldOcean().mesh.material)).not.toContain('richUnderwater');
  });

  it('knows the eye is under the water by its own test or the page’s answer, per scene, never by draw order', () => {
    const data = { grid, time: 0, bedRevision: 0, writeBed: () => {}, cubic: true };
    // A tank whose surface stands 1 m above the datum everywhere.
    const tank = new WaterSurface({ ...data, write: (into: Float32Array) => { for (let i = 0; i < into.length; i += 2) into[i] = 1; } });
    tank.update();
    tank.setLook('rich');
    expect(tank.eyeIsBelow(3, 1 - UNDERWATER_MARGIN - 0.01, 3)).toBe(true);
    expect(tank.eyeIsBelow(3, 1 - UNDERWATER_MARGIN + 0.01, 3)).toBe(false);
    // The page's answer wins: in the swept barrel's tube the eye is in air, whatever the solver's height says.
    tank.setEyeUnderwater(false);
    expect(tank.eyeIsBelow(3, -5, 3)).toBe(false);
    tank.setEyeUnderwater(true);
    expect(tank.eyeIsBelow(3, 5, 3)).toBe(true);
    tank.setEyeUnderwater(undefined);
    // Each mesh sets its own flag for the camera about to draw it.
    const scene = {};
    const draw = (mesh: { onBeforeRender: (...args: never[]) => void }, inScene: object, x: number, y: number) => {
      const camera = new PerspectiveCamera();
      camera.position.set(x, y, 3);
      camera.updateMatrixWorld();
      mesh.onBeforeRender(undefined as never, inScene as never, camera as never, undefined as never, undefined as never, undefined as never);
    };
    const uniforms = tank.materialUniforms;
    draw(tank.mesh, scene, 3, 0);
    expect(uniforms.richUnderwater.value).toBe(1);
    draw(tank.patch, scene, 3, 4);
    expect(uniforms.richUnderwater.value).toBe(0);
    // The far ocean asks the tank drawn in its own scene, for its own camera, whichever was drawn last.
    const ocean = new FarFieldOcean();
    ocean.setLook('rich');
    const oceanUniforms = (ocean as unknown as { uniforms: Record<string, { value: unknown }> }).uniforms;
    draw(ocean.mesh, scene, 3, 0);
    expect(oceanUniforms.richUnderwater.value).toBe(1);
    draw(ocean.mesh, scene, 3, 4);
    expect(oceanUniforms.richUnderwater.value).toBe(0);
    // Another scene's water says nothing about this one.
    draw(ocean.mesh, {}, 3, 0);
    expect(oceanUniforms.richUnderwater.value).toBe(0);
    shareEyeTest(scene, () => true);
    expect(eyeUnderwaterIn(scene, 0, 100, 0)).toBe(true);
    expect(eyeUnderwaterIn({}, 0, -100, 0)).toBe(false);
    // Classic draws no underside.
    tank.setLook('classic');
    draw(tank.mesh, scene, 3, 0);
    expect(uniforms.richUnderwater.value).toBe(0);
    ocean.setLook('classic');
    draw(ocean.mesh, scene, 3, 0);
    expect(oceanUniforms.richUnderwater.value).toBe(0);
  });
});
