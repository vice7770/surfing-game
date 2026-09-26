import { Color, ShaderLib, Vector3, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FarFieldOcean } from './FarFieldOcean';
import { SprayPoints } from './SprayPoints';
import { WaterSurface, type SurfaceSource } from './WaterSurface';
import { churnTexture } from './water/churnTexture';
import { rippleStrength, rippleTexture } from './water/rippleTexture';
import { RICH_BASE_ROUGHNESS } from './water/specular';
import { DEFAULT_WATER_CHOP } from './waterChop';
import { CLASSIC_FOAM, WATER_BODY_GAIN, waterBodyFragment } from './waterOptics';
import { RICH_WATER } from './water/richWaterGlsl';

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

  it('gives the Rich water flow-carried ripples and a glossy, anti-aliased finish; Classic keeps its roughness', () => {
    const water = new WaterSurface({ ...source, cubic: true });
    expect(water.mesh.material.roughness).toBe(0.62);
    water.setLook('rich');
    expect(water.mesh.material.roughness).toBe(RICH_BASE_ROUGHNESS);
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    water.mesh.material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
    expect(shader.fragmentShader).toContain('waterSlope += waterRippleSlopeAt( vWaterWorld.xz, vWaterFlow );');
    // Seen from below, the gloss would mirror the sky's lower half where the water reflects itself: keep Classic's there.
    expect(shader.fragmentShader).toContain('roughnessFactor = faceDirection > 0.0 ? richRoughness( roughnessFactor, waterRippleVariance ) : 0.620;');
    const uniforms = shader.uniforms as Record<string, { value: unknown }>;
    expect(uniforms.waterRippleMap.value).toBe(rippleTexture());
    water.setChop(DEFAULT_WATER_CHOP);
    expect(uniforms.waterRippleStrength.value).toBeCloseTo(1, 9);
    water.setChop(0);
    expect(uniforms.waterRippleStrength.value).toBeCloseTo(0.8, 9);
    water.setLook('classic');
    expect(water.mesh.material.roughness).toBe(0.62);
    // A bilinear source draws Classic even when Rich is chosen, and keeps Classic's roughness.
    water.setLook('rich');
    water.setSource(source);
    expect(water.mesh.material.roughness).toBe(0.62);
  });

  it('keeps the Classic foam composition as the default body chunk', () => {
    expect(waterBodyFragment(true, true)).toBe(waterBodyFragment(true, true, CLASSIC_FOAM));
    expect(CLASSIC_FOAM).toContain('roughnessFactor = mix( roughnessFactor, 0.9, waterCover );');
  });

  it('streaks the Rich foam up steep faces, only where the foam is drawn as lace', () => {
    const water = new WaterSurface({ ...source, cubic: true });
    water.setLook('rich');
    const { fragment } = compiled(water.mesh.material);
    expect(fragment).toContain('waterCover = max( waterCover, waterFoamPattern * waterStreak( vWaterWorld.xz, vWaterFlow, length( waterSurfaceSlope ), vWaterFoam ) );');
    expect(fragment).toContain('float waterStreak( vec2 p, vec2 flow, float steepness, float foam )');
    expect(fragment).not.toContain('roughnessFactor = mix( roughnessFactor, 0.9, waterCover );');
  });

  it('draws fresh Rich whitewater as churn that opens into lace, with relief and backlit edges', () => {
    const water = new WaterSurface({ ...source, cubic: true });
    water.setLook('rich');
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    water.mesh.material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
    expect((shader.uniforms as Record<string, { value: unknown }>).waterChurnMap.value).toBe(churnTexture());
    expect(shader.fragmentShader).toContain('vec2 waterChurn = waterChurnAt( vWaterWorld.xz, vWaterFlow );');
    expect(shader.fragmentShader).toContain('float waterCover = mix( waterLace, max( waterLace, waterChurn.x ), waterFresh );');
    expect(shader.fragmentShader).toContain('waterSlope += waterFreshNormal * waterChurnSlope( vWaterWorld.xz, vWaterFlow );');
    expect(shader.fragmentShader).toContain('totalEmissiveRadiance += 0.18 * waterFresh');
  });

  it('lights Rich mist toward the sun and fades spray into the water, and switches back to the Classic spray', () => {
    const spray = new SprayPoints();
    const classic = { vertex: spray.mesh.material.vertexShader, fragment: spray.mesh.material.fragmentShader };
    spray.setLook('rich');
    expect(spray.mesh.material.vertexShader).toContain('vAbove = world.y - waterHeightAt( world.xz );');
    expect(spray.mesh.material.fragmentShader).toContain('henyeyGreenstein( dot( normalize( vSprayWorld - cameraPosition ), spraySunDirection ), MIST_G )');
    expect(spray.mesh.material.fragmentShader).toContain('smoothstep( -0.1, 0.35, vAbove )');
    const water = new WaterSurface({ ...source, cubic: true });
    spray.useWater(water.causticSource);
    expect(spray.mesh.material.uniforms.waterSurface).toBe(water.causticSource.waterSurface);
    spray.setSun(new Vector3(0, 1, 0), new Color(2, 2, 2));
    expect(spray.mesh.material.uniforms.spraySunDirection.value).toEqual(new Vector3(0, 1, 0));
    spray.setLook('classic');
    expect({ vertex: spray.mesh.material.vertexShader, fragment: spray.mesh.material.fragmentShader }).toEqual(classic);
  });

  it('gives the Rich far ocean the ripples and anti-aliased gloss, still, and switches back to Classic', () => {
    const ocean = new FarFieldOcean();
    const classic = compiled(ocean.mesh.material);
    ocean.setLook('rich');
    expect(ocean.mesh.material.roughness).toBe(RICH_BASE_ROUGHNESS);
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    ocean.mesh.material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
    expect(shader.fragmentShader).toContain('waterRippleSlopeAt( vWaterWorld.xz, vec2( 0.0 ) )');
    expect(shader.fragmentShader).toContain('richRoughness( roughnessFactor, waterRippleVariance )');
    const uniforms = shader.uniforms as Record<string, { value: unknown }>;
    expect(uniforms.waterRippleMap.value).toBe(rippleTexture());
    expect(uniforms.waterRippleStrength.value).toBeCloseTo(rippleStrength(DEFAULT_WATER_CHOP), 9);
    // The same wind ripples the tank and the far ocean alike, so the two meet without a step in gloss.
    ocean.setChop(0);
    expect(uniforms.waterRippleStrength.value).toBeCloseTo(rippleStrength(0), 9);
    ocean.setLook('classic');
    expect(ocean.mesh.material.roughness).toBe(0.62);
    expect(compiled(ocean.mesh.material)).toEqual(classic);
  });

  it('tunes the Rich water with its own reflection and body gain, and gives Classic its own back', () => {
    for (const make of [() => new WaterSurface({ ...source, cubic: true }), () => new FarFieldOcean()]) {
      const water = make();
      water.setLook('rich');
      const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
      water.mesh.material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
      expect(shader.fragmentShader).toContain('#include <lights_fragment_maps>\n#if defined( RE_IndirectSpecular )\n  radiance *= waterReflection;\n#endif');
      const uniforms = shader.uniforms as Record<string, { value: unknown }>;
      expect(uniforms.waterReflection.value).toBe(RICH_WATER.reflection);
      expect(uniforms.waterBodyGain.value).toBe(RICH_WATER.bodyGain);
      water.setLook('classic');
      expect(uniforms.waterBodyGain.value).toBe(WATER_BODY_GAIN);
    }
  });

  it('tone-maps the Rich spray like the rest of the scene, so a coloured sun cannot clip it', () => {
    const spray = new SprayPoints();
    spray.setLook('rich');
    expect(spray.mesh.material.fragmentShader).toContain('#include <tonemapping_fragment>');
    expect(spray.mesh.material.fragmentShader).toContain('#include <colorspace_fragment>');
  });

  it('names nothing in the Rich program with a GLSL ES 3.00 reserved word', () => {
    const water = new WaterSurface({ ...source, cubic: true });
    water.setLook('rich');
    const { vertex, fragment } = compiled(water.mesh.material);
    const declaration = /\b(?:float|int|bool|void|[iu]?vec[234]|mat[234]|sampler2D)\s+([A-Za-z_]\w*)/g;
    const names = new Set([...`${vertex}\n${fragment}`.matchAll(declaration)].map((match) => match[1]));
    expect([...names].filter((name) => GLSL_RESERVED.has(name))).toEqual([]);
  });

  it('hides the patch skirt from below, where its inner faces would hang as a curtain under the surface', () => {
    const water = new WaterSurface({ ...source, cubic: true });
    water.setLook('rich');
    const { vertex, fragment } = compiled(water.mesh.material);
    expect(vertex).toContain('vWaterSkirt = skirt;');
    expect(fragment).toContain('if ( vWaterSkirt > 0.001 && !gl_FrontFacing ) discard;');
  });

  it('gives the coarse water every attribute the Rich program adds, as zeros, even after its grid is rebuilt', () => {
    // Not three's defaultAttributeValues: those are context-wide state another material can overwrite.
    const water = new WaterSurface({ ...source, cubic: true });
    water.setLook('rich');
    const attributes = [...compiled(water.mesh.material).vertex.matchAll(/\battribute\s+\w+\s+(\w+);/g)].map((match) => match[1]);
    expect(attributes.length).toBeGreaterThan(0);
    const coarse = () => {
      for (const name of attributes) {
        expect(water.patch.geometry.getAttribute(name), name).toBeDefined();
        const attribute = water.mesh.geometry.getAttribute(name);
        expect(attribute, name).toBeDefined();
        expect(attribute.count, name).toBe(water.mesh.geometry.getAttribute('position').count);
        expect(Array.from(attribute.array as ArrayLike<number>).every((value) => value === 0), name).toBe(true);
      }
    };
    coarse();
    water.setSource({ ...source, cubic: true, grid: { ...grid, nx: 12, nz: 10 } });
    coarse();
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
