import { ShaderLib, Vector3, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FarFieldOcean } from '../FarFieldOcean';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import {
  BED_RAY_FLOOR, CLASSIC_FOAM, SPOT_OPTICS, WATER_IOR, deepReflectance, diffuseAttenuation, shallowReflectance, waterBodyFragment, type WaterOptics,
} from '../waterOptics';
import { RICH_NORMAL_FLOOR, RICH_NORMAL_GUARD, bedPathFactor, guardedNormal, refractRay, richShallowReflectance } from './richOptics';

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
