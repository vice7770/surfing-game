import { ShaderLib, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createCausticUniforms } from './CausticMap';
import { SpotSeabed } from './SpotSeabed';

describe('SpotSeabed', () => {
  it('places every vertex on the spot bed', () => {
    const depthAt = (x: number, z: number) => 3 + 0.02 * x - 0.03 * z;
    const seabed = new SpotSeabed();
    seabed.setDepth(depthAt, -40, -120, 80, 150, 5);
    const positions = seabed.mesh.geometry.getAttribute('position');
    const world = new Vector3();
    for (let i = 0; i < positions.count; i += 37) {
      world.fromBufferAttribute(positions, i).add(seabed.mesh.position);
      // Vertex positions are 32-bit floats.
      expect(world.y).toBeCloseTo(-depthAt(world.x, world.z), 5);
    }
    expect(seabed.mesh.visible).toBe(true);
  });

  it('lights its sand with the caustic map, faded by the water on the way down', () => {
    const seabed = new SpotSeabed();
    const caustics = createCausticUniforms();
    const water = { waterAttenuation: { value: new Vector3(0.3, 0.1, 0.05) }, waterSunDirection: { value: new Vector3(0, 1, 0) } };
    seabed.useCaustics(caustics, water);
    const shader = { uniforms: {} as Record<string, unknown>, vertexShader: ShaderLib.basic.vertexShader, fragmentShader: ShaderLib.basic.fragmentShader };
    seabed.mesh.material.onBeforeCompile(shader as never, undefined as never);
    expect(shader.vertexShader).toContain('vSeabedWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    expect(shader.fragmentShader).toContain('causticLightAt( vSeabedWorld.xz )');
    expect(shader.fragmentShader).toContain('exp( -waterAttenuation');
    expect(shader.uniforms.causticMap).toBe(caustics.causticMap);
    expect(shader.uniforms.waterAttenuation).toBe(water.waterAttenuation);
  });
});

