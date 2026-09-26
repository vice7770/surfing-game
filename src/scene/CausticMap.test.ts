import { DataTexture, Vector2, Vector3, Vector4 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAUSTIC_WINDOW, CausticMap, causticLookupPars, createCausticUniforms } from './CausticMap';

describe('caustic map', () => {
  it('refracts the drawn surface, chop included, and reads back as 1 where it has not drawn', () => {
    const texture = new DataTexture(new Float32Array(8), 2, 2);
    const source = {
      waterTime: { value: 0 }, waterChop: { value: 0.25 }, waterSurface: { value: texture }, waterBed: { value: texture },
      waterGrid: { value: new Vector4(0, 0, 1, 0) }, waterGridSize: { value: new Vector2(2, 2) }, waterSunDirection: { value: new Vector3(0, 1, 0) },
    };
    const uniforms = createCausticUniforms();
    const map = new CausticMap(source, uniforms);
    const material = (map as unknown as { mesh: { material: { vertexShader: string; fragmentShader: string; uniforms: Record<string, unknown> } } }).mesh.material;
    expect(material.vertexShader).toContain('waterChopSlope( xz, waterTime )');
    expect(material.vertexShader).toContain('refract( incident, normal,');
    expect(material.fragmentShader).toContain('flatArea / max( litArea');
    expect(material.uniforms.causticDomain).toBe(uniforms.causticDomain);
    expect(uniforms.causticStrength.value).toBe(0);
    expect(causticLookupPars).toContain('if ( causticStrength <= 0.0 ) return 1.0;');
    expect(CAUSTIC_WINDOW).toBeGreaterThan(20);
    map.disable();
    map.dispose();
  });
});
