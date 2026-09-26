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
});
