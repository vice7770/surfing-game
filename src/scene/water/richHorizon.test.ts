import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { EdgeBand } from '../EdgeBand';
import { FarFieldOcean } from '../FarFieldOcean';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { horizonHazeUniforms } from './horizonHaze';
import { horizonHazeOn, horizonLookOn, horizonSkyOn } from './richHorizon';
import { RICH_REFLECTION } from './richWaterGlsl';

const grid = { xMin: -20, zMin: -40, spacing: 1, nx: 41, nz: 31 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {}, cubic: true };

function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader, uniforms: shader.uniforms as Record<string, { value: unknown }> };
}

const HAZE_OUTPUT = 'gl_FragColor.rgb = mix( gl_FragColor.rgb, vWaterHaze.rgb, vWaterHaze.a );';
const SKY = 'waterSkyRadiance( geometryNormal, material.roughness, faceDirection )';

describe('the horizon look on the Rich water', () => {
  it('is on unless the URL turns it off', () => {
    expect(horizonLookOn('')).toBe(true);
    expect(horizonLookOn('?horizon=off')).toBe(false);
    expect(horizonLookOn('?horizon=on')).toBe(true);
  });

  it('leaves out its sky mirror or its haze alone with a dev switch, for timing each', () => {
    expect(horizonSkyOn('')).toBe(true);
    expect(horizonSkyOn('?horizonSky=three')).toBe(false);
    expect(horizonHazeOn('')).toBe(true);
    expect(horizonHazeOn('?horizonHaze=off')).toBe(false);
  });

  it('hazes the tank, its edge band and the far ocean alike, through the same uniform objects', () => {
    const water = new WaterSurface(source);
    water.setLook('rich');
    const far = new FarFieldOcean();
    far.setLook('rich');
    const band = new EdgeBand(water, far);
    const programs = [compiled(water.mesh.material), compiled(band.mesh.material), compiled(far.mesh.material)];
    for (const { vertex, fragment, uniforms } of programs) {
      expect(vertex).toContain('vec4 waterHazeAt( vec3 world, float horizon )');
      expect(fragment).toContain(HAZE_OUTPUT);
      expect(fragment).toContain(SKY);
      expect(fragment).toContain('material.dfg = waterSkyDfg;');
      expect(fragment).not.toContain(RICH_REFLECTION);
      // The haze goes over the tone-mapped colour, before it is encoded for the screen.
      expect(fragment.indexOf(HAZE_OUTPUT)).toBeGreaterThan(fragment.indexOf('#include <tonemapping_fragment>'));
      expect(fragment.indexOf(HAZE_OUTPUT)).toBeLessThan(fragment.indexOf('#include <colorspace_fragment>'));
      for (const key of Object.keys(horizonHazeUniforms) as (keyof typeof horizonHazeUniforms)[]) {
        expect(uniforms[key]).toBe(horizonHazeUniforms[key]);
      }
    }
    // The tank and its band haze by distance alone; the far ocean also goes the rest of the way over its fade.
    expect(programs[0].vertex).toContain('vWaterHaze = waterHazeAt( vWaterWorld, 0.0 );');
    expect(programs[1].vertex).toContain('vWaterHaze = waterHazeAt( vWaterWorld, 0.0 );');
    expect(programs[2].vertex).toContain('vWaterHaze = waterHazeAt( vWaterWorld, farHorizonShare( vWaterWorld.xz ) );');
    // It turns see-through only over the second half of its way to the horizon, with the haze on; as before without.
    expect(programs[2].fragment).toContain('float farHorizonShare( vec2 xz ) {');
    expect(programs[2].fragment).toContain('diffuseColor.a *= vWaterHaze.a > 0.0 ? 1.0 - smoothstep( 0.500, 1.0, farHorizonShare( vWaterWorld.xz ) ) : 1.0 - smoothstep( farFade.x, farFade.y, length( vWaterWorld.xz - farFocus ) );');
    expect(programs[2].fragment.indexOf('float farHorizonShare')).toBeLessThan(programs[2].fragment.indexOf('void main() {'));
  });

  it('draws the Rich water as before with ?horizon=off, for before-and-after stills and timings', () => {
    const location = globalThis.location;
    Object.defineProperty(globalThis, 'location', { value: { search: '?horizon=off' }, configurable: true });
    try {
      const water = new WaterSurface(source);
      water.setLook('rich');
      const far = new FarFieldOcean();
      far.setLook('rich');
      for (const { vertex, fragment } of [compiled(water.mesh.material), compiled(far.mesh.material), compiled(new EdgeBand(water, far).mesh.material)]) {
        expect(fragment).toContain(RICH_REFLECTION);
        expect(vertex).not.toContain('waterHazeAt');
        expect(fragment).not.toContain('vWaterHaze');
        expect(fragment).not.toContain('waterSkyRadiance');
      }
      expect(compiled(far.mesh.material).fragment).toContain('diffuseColor.a *= 1.0 - smoothstep( farFade.x, farFade.y, length( vWaterWorld.xz - farFocus ) );');
    } finally {
      Object.defineProperty(globalThis, 'location', { value: location, configurable: true });
    }
  });

  it('leaves the Classic programs without it', () => {
    const water = new WaterSurface(source);
    const far = new FarFieldOcean();
    for (const { vertex, fragment } of [compiled(water.mesh.material), compiled(far.mesh.material), compiled(new EdgeBand(water, far).mesh.material)]) {
      expect(vertex).not.toContain('waterHazeAt');
      expect(fragment).not.toContain('vWaterHaze');
      expect(fragment).not.toContain('waterSkyRadiance');
    }
  });
});
