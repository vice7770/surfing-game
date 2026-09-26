import { Color, MeshPhysicalMaterial, MeshStandardMaterial, ShaderLib, Texture, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_COLORS, dressMaterial, setOutfitColors, wetMaterial } from './surferMaterial';

function compile(material: MeshPhysicalMaterial) {
  const shader = {
    uniforms: {},
    vertexShader: ShaderLib.physical.vertexShader,
    fragmentShader: ShaderLib.physical.fragmentShader,
  } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return shader;
}

describe('surfer materials', () => {
  it('makes skin wet: glossier, with a clear coat, keeping its texture', () => {
    const map = new Texture();
    const skin = wetMaterial(new MeshStandardMaterial({ map, roughness: 1, transparent: true }), 'skin');
    expect(skin.map).toBe(map);
    expect(skin.roughness).toBeLessThan(0.6);
    expect(skin.clearcoat).toBeGreaterThan(0);
    expect(skin.transparent).toBe(false);
  });

  it('cuts hair cards out by alpha instead of blending them', () => {
    const hair = wetMaterial(new MeshStandardMaterial({ color: '#806040', transparent: true }), 'cards');
    expect(hair.transparent).toBe(false);
    expect(hair.alphaTest).toBeGreaterThan(0);
    expect(hair.color.r).toBeLessThan(new Color('#806040').r); // wet hair is darker
  });

  it('injects the outfit into three’s own physical shaders at chunks that exist', () => {
    const shader = compile(dressMaterial(new MeshPhysicalMaterial(), DEFAULT_COLORS));
    expect(shader.vertexShader).toContain('attribute vec4 outfitCoverage;');
    expect(shader.vertexShader).toContain('vCoverage = outfitCoverage;');
    expect(shader.fragmentShader).toContain('float garmentA');
    expect(shader.fragmentShader).toContain('roughnessFactor = mix(roughnessFactor');
    expect(shader.uniforms).toHaveProperty('uSuit');
  });

  it('recolours a dressed material without recompiling it', () => {
    const material = dressMaterial(new MeshPhysicalMaterial(), DEFAULT_COLORS);
    const version = material.version;
    setOutfitColors(material, { suit: new Color('#ff0000'), accent: new Color('#00ff00'), bottoms: new Color('#0000ff') });
    const shader = compile(material);
    expect((shader.uniforms.uSuit.value as Color).getHexString()).toBe('ff0000');
    expect(material.version).toBe(version);
  });
});
