import { DataTexture, Vector2, Vector3, Vector4 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAUSTIC_PEAK, CAUSTIC_TARGET, CAUSTIC_WINDOW, CausticMap, causticLookupPars, createCausticUniforms } from './CausticMap';
import { CAUSTIC_PEAK as OPTICS_PEAK } from './waterOptics';

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

  it('exports its size, which the Rich lookup reads from the texture, and the light cap the optics share', () => {
    const texture = new DataTexture(new Float32Array(8), 2, 2);
    const source = {
      waterTime: { value: 0 }, waterChop: { value: 0.25 }, waterSurface: { value: texture }, waterBed: { value: texture },
      waterGrid: { value: new Vector4(0, 0, 1, 0) }, waterGridSize: { value: new Vector2(2, 2) }, waterSunDirection: { value: new Vector3(0, 1, 0) },
    };
    const map = new CausticMap(source);
    const target = (map as unknown as { target: { width: number; height: number } }).target;
    expect([target.width, target.height]).toEqual([CAUSTIC_TARGET, CAUSTIC_TARGET]);
    expect(CAUSTIC_PEAK).toBe(OPTICS_PEAK);
    map.dispose();
  });

  it('keeps Classic’s lookup exactly: the square window faded over its outer fifth, read as the map is', () => {
    expect(causticLookupPars).toBe(`
uniform sampler2D causticMap;
uniform vec4 causticDomain;
uniform float causticStrength;

float causticLightAt( vec2 xz ) {
  if ( causticStrength <= 0.0 ) return 1.0;
  vec2 uv = ( xz - causticDomain.xy ) / causticDomain.zw;
  if ( uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0 ) return 1.0;
  vec2 edge = min( uv, 1.0 - uv ) / 0.20;
  float fade = smoothstep( 0.0, 1.0, min( edge.x, edge.y ) );
  return mix( 1.0, min( texture( causticMap, uv ).r, 16.0 ), causticStrength * fade );
}
`);
  });
});
