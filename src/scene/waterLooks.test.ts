import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FarFieldOcean } from './FarFieldOcean';
import { SprayPoints } from './SprayPoints';
import { WaterSurface, type SurfaceSource } from './WaterSurface';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };

/** A material's shaders after its `onBeforeCompile`, run on three's own physical shader sources. */
function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = {
    uniforms: {},
    vertexShader: ShaderLib.physical.vertexShader,
    fragmentShader: ShaderLib.physical.fragmentShader,
  } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader };
}

describe('Classic water parity', () => {
  it('keeps the tank water’s Classic shaders exactly as before G8', () => {
    expect(compiled(new WaterSurface(source).mesh.material)).toMatchSnapshot();
  });

  it('keeps the far ocean’s Classic shaders exactly as before G8', () => {
    expect(compiled(new FarFieldOcean().mesh.material)).toMatchSnapshot();
  });

  it('keeps the spray’s Classic shaders exactly as before G8', () => {
    const { material } = new SprayPoints().mesh;
    expect({ vertex: material.vertexShader, fragment: material.fragmentShader }).toMatchSnapshot();
  });

  it('keys the program by look, and switching back gives the Classic shaders again', () => {
    const water = new WaterSurface(source);
    const classic = compiled(water.mesh.material);
    expect(water.look).toBe('classic');
    expect(water.mesh.material.customProgramCacheKey()).toContain('classic');
    water.setLook('rich');
    expect(water.look).toBe('rich');
    water.setLook('classic');
    expect(water.mesh.material.customProgramCacheKey()).toContain('classic');
    expect(compiled(water.mesh.material)).toEqual(classic);
    for (const other of [new FarFieldOcean(), new SprayPoints()]) {
      other.setLook('rich');
      other.setLook('classic');
      expect(other.look).toBe('classic');
    }
  });

  it('keeps a bilinear source Classic even when Rich is chosen', () => {
    const water = new WaterSurface(source);
    water.setLook('rich');
    expect(compiled(water.mesh.material)).toEqual(compiled(new WaterSurface(source).mesh.material));
  });

  it('draws a cubic source’s Rich surface from the Catmull-Rom chunk, per pixel', () => {
    const water = new WaterSurface({ ...source, cubic: true });
    water.setLook('rich');
    const { vertex, fragment } = compiled(water.mesh.material);
    expect(vertex).toContain('waterCubic( waterXZ )');
    expect(fragment).toContain('waterCubic( vWaterWorld.xz )');
    expect(water.mesh.material.customProgramCacheKey()).toContain('rich');
  });

  it('adds the dense patch only for a Rich cubic source, the base mesh discarding under it', () => {
    const water = new WaterSurface({ ...source, cubic: true });
    expect(water.patch.visible).toBe(false);
    expect(water.patch.material).toBe(water.mesh.material);
    water.setLook('rich');
    expect(water.patch.visible).toBe(true);
    const { vertex, fragment } = compiled(water.mesh.material);
    expect(vertex).toContain('attribute float onPatch;');
    expect(fragment).toContain('waterPatchRect');
    water.setLook('classic');
    expect(water.patch.visible).toBe(false);
  });

  it('names nothing in the Rich program with a GLSL ES 3.00 reserved word', () => {
    const water = new WaterSurface({ ...source, cubic: true });
    water.setLook('rich');
    const { vertex, fragment } = compiled(water.mesh.material);
    const declaration = /\b(?:float|int|bool|void|[iu]?vec[234]|mat[234]|sampler2D)\s+([A-Za-z_]\w*)/g;
    const names = new Set([...`${vertex}\n${fragment}`.matchAll(declaration)].map((match) => match[1]));
    expect([...names].filter((name) => GLSL_RESERVED.has(name))).toEqual([]);
  });

  it('feeds every attribute the Rich program adds to the coarse water too, which lacks them', () => {
    const water = new WaterSurface({ ...source, cubic: true });
    water.setLook('rich');
    const attributes = [...compiled(water.mesh.material).vertex.matchAll(/\battribute\s+\w+\s+(\w+);/g)].map((match) => match[1]);
    expect(attributes.length).toBeGreaterThan(0);
    const defaults = (water.mesh.material as { defaultAttributeValues?: Record<string, number[]> }).defaultAttributeValues ?? {};
    for (const name of attributes) {
      expect(water.patch.geometry.getAttribute(name), name).toBeDefined();
      expect(water.mesh.geometry.getAttribute(name) ?? defaults[name], name).toBeDefined();
    }
  });
});

/** GLSL ES 3.00 keywords and words reserved for future use (§3.6–3.7) that a name could collide with. */
const GLSL_RESERVED = new Set(
  `attribute const uniform varying layout centroid flat smooth break continue do for while switch case default if else in out
  inout float int void bool true false invariant discard return struct precision lowp mediump highp uint coherent volatile
  restrict readonly writeonly resource atomic_uint noperspective patch sample subroutine common partition active asm class
  union enum typedef template this goto inline noinline public static extern external interface long short double half fixed
  unsigned superp input output filter sizeof cast namespace using`.split(/\s+/),
);
