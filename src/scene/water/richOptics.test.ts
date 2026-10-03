import { ShaderLib, Vector3, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FarFieldOcean } from '../FarFieldOcean';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { RICH_NORMAL_FLOOR, RICH_NORMAL_GUARD, guardedNormal } from './richOptics';

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
