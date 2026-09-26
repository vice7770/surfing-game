import { Color, MeshPhysicalMaterial, type MeshStandardMaterial } from 'three';

export interface OutfitColors {
  suit: Color;
  accent: Color;
  bottoms: Color;
}

/** Black neoprene with a teal yoke; coral swimwear. */
export const DEFAULT_COLORS: OutfitColors = { suit: new Color('#121417'), accent: new Color('#1f6f78'), bottoms: new Color('#c8553d') };

/** Wet neoprene and swimwear read glossier than wet skin (art direction). */
const FABRIC_ROUGHNESS = 0.38;

export type SurfaceRole = 'skin' | 'cards' | 'eyes';

/**
 * The exported MakeHuman material rebuilt as a wet physical surface. Skin is
 * opaque with a clear coat of water. Hair, brow and lash cards are cut out by
 * alpha and darkened, as wet hair is, rather than blended, which sorts badly.
 */
export function wetMaterial(source: MeshStandardMaterial, role: SurfaceRole): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({ name: source.name, map: source.map, normalMap: source.normalMap, color: source.color.clone() });
  if (role === 'skin') {
    material.roughness = 0.45;
    material.clearcoat = 0.35;
    material.clearcoatRoughness = 0.3;
  } else if (role === 'cards') {
    material.color.multiplyScalar(0.6);
    material.roughness = 0.35;
    material.alphaTest = 0.5;
    material.alphaToCoverage = true;
    material.side = source.side;
  } else {
    material.roughness = 0.08;
    material.clearcoat = 1;
    material.clearcoatRoughness = 0.02;
    material.alphaTest = 0.5;
  }
  return material;
}

/**
 * Dresses a body material in an outfit: the `outfitCoverage` attribute
 * (signed distances from `computeOutfitCoverage`) mixes suit, accent and
 * bottoms over the skin, crisp to ±4 mm, and the fabric's roughness over the skin's.
 */
export function dressMaterial(material: MeshPhysicalMaterial, colors: OutfitColors): MeshPhysicalMaterial {
  const uniforms = { uSuit: { value: colors.suit.clone() }, uAccent: { value: colors.accent.clone() }, uBottoms: { value: colors.bottoms.clone() } };
  material.userData.outfit = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 outfitCoverage;\nvarying vec4 vCoverage;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCoverage = outfitCoverage;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vCoverage;\nuniform vec3 uSuit;\nuniform vec3 uAccent;\nuniform vec3 uBottoms;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float garmentA = smoothstep(-0.004, 0.004, vCoverage.x);
        float garmentB = smoothstep(-0.004, 0.004, vCoverage.y) * (1.0 - garmentA);
        float accent = smoothstep(-0.004, 0.004, vCoverage.z) * garmentA;
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(uSuit, uAccent, accent), garmentA);
        diffuseColor.rgb = mix(diffuseColor.rgb, uBottoms, garmentB);
        float fabric = garmentA + garmentB;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, ${FABRIC_ROUGHNESS.toFixed(2)}, fabric);`);
  };
  material.customProgramCacheKey = () => 'surfer-outfit';
  material.needsUpdate = true;
  return material;
}

/** New outfit colours for a dressed material: uniforms only, no recompile. */
export function setOutfitColors(material: MeshPhysicalMaterial, colors: OutfitColors): void {
  const uniforms = material.userData.outfit as { uSuit: { value: Color }; uAccent: { value: Color }; uBottoms: { value: Color } } | undefined;
  if (!uniforms) return;
  uniforms.uSuit.value.copy(colors.suit);
  uniforms.uAccent.value.copy(colors.accent);
  uniforms.uBottoms.value.copy(colors.bottoms);
}
