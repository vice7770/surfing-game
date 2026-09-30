import { Color, ShaderLib, Vector3, type ShaderMaterial, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FarFieldOcean } from './FarFieldOcean';
import { LipSheetMesh } from './LipSheetMesh';
import { SprayPoints } from './SprayPoints';
import { SPRAY_CAPACITY, SPRAY_STRIDE, WHITEWATER_CAPACITY } from '../wave/SprayCloud';
import { WaterSurface, type SurfaceSource } from './WaterSurface';
import { churnTexture } from './water/churnTexture';
import { rippleStrength, rippleTexture } from './water/rippleTexture';
import { RICH_BASE_ROUGHNESS } from './water/specular';
import { DEFAULT_WATER_CHOP } from './waterChop';
import { CLASSIC_FOAM, WATER_BODY_GAIN, waterBodyFragment } from './waterOptics';
import { PLUME_DENSITY, RICH_REFLECTION, RICH_WATER } from './water/richWaterGlsl';
import { mirrorsBarrelDither } from './barrel/barrelMaskGlsl';

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

  it('keeps the lip sheet’s Classic shaders exactly as before G9', () => {
    const material = new LipSheetMesh().mesh.material as ShaderMaterial;
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

  it('draws a cubic source’s Rich surface from the Catmull-Rom chunk, cut by the flying tubes, per vertex and per pixel', () => {
    const water = new WaterSurface({ ...source, cubic: true });
    water.setLook('rich');
    const { vertex, fragment } = compiled(water.mesh.material);
    expect(vertex).toContain('waterCarvedCubic( waterXZ )');
    expect(fragment).toContain('waterCarvedCubic( vWaterWorld.xz )');
    // G9: fresh churn shows where the plunge drove air in, from the aeration each snapshot carries.
    expect(fragment).toContain('float waterFresh = waterFreshness( vWaterAir ) * waterFoamPattern;');
    expect(vertex).toContain('vWaterAir = waterAerationAt( waterXZ ).x;');
    // The crest light marches through the carved surface: through a tube's void, not as if it were water.
    expect(fragment).toContain('float gap = waterCarve( p.xz, waterHeightAt( p.xz ) ) - p.y;');
    expect(water.mesh.material.customProgramCacheKey()).toContain('rich');
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    water.mesh.material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
    const uniforms = shader.uniforms as Record<string, { value: unknown }>;
    expect(uniforms.waterTubeMap.value).toBeDefined();
    expect(uniforms.waterTubeColumns.value).toBeDefined();
  });

  it('cuts only the tubes its source sends, and none in Classic', () => {
    const tubes = [4.5, 3, 2, 0, 1, 3, 2, 0.8, 0.6, 4, 1, 0];
    const tubed = { ...source, cubic: true, tubeColumnWidth: 1, writeTubes: (into: Float32Array) => (into.set(tubes), 1) };
    const water = new WaterSurface(tubed);
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    water.mesh.material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
    const uniforms = shader.uniforms as Record<string, { value: unknown }>;
    water.update();
    expect(uniforms.waterTubeCount.value).toBe(0);
    water.setLook('rich');
    water.update();
    expect(uniforms.waterTubeCount.value).toBe(1);
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

  it('whitens the Rich water where the bubble plume fills it, seen through the water above it, and plainly from below (G9)', () => {
    const water = new WaterSurface({ ...source, cubic: true });
    water.setLook('rich');
    const { fragment } = compiled(water.mesh.material);
    expect(fragment).toContain(`const float PLUME_DENSITY = ${PLUME_DENSITY.toFixed(3)};`);
    expect(fragment).toContain('float waterPlume = 1.0 - exp( -PLUME_DENSITY * vWaterAir * min( vWaterPlumeDepth, vWaterDepth ) );');
    expect(fragment).toContain('float waterPlumePath = faceDirection > 0.0 ? 0.5 * min( vWaterPlumeDepth, vWaterDepth ) / waterRefractedCosine( abs( waterViewCos ) ) : 0.0;');
    expect(fragment).toContain('vec3 waterUnder = mix( waterBody * waterBodyGain, waterFoamColor * exp( -waterAttenuation * waterPlumePath ), waterPlume );');
    expect(fragment).toContain('diffuseColor.rgb = mix( waterUnder, waterFoamColor * waterCrease, waterCover );');
    // A fully aerated metre of plume reads near white.
    expect(1 - Math.exp(-PLUME_DENSITY * 0.2 * 1)).toBeGreaterThan(0.9);
  });

  it('lights Rich mist toward the sun and fades spray into the water, and switches back to the Classic spray', () => {
    const spray = new SprayPoints();
    const classic = { vertex: spray.mesh.material.vertexShader, fragment: spray.mesh.material.fragmentShader };
    spray.setLook('rich');
    // G9: the spray fades at the carved surface, so spit blown out of a tube is not taken for underwater.
    expect(spray.mesh.material.vertexShader).toContain('vAbove = world.y - waterCarve( world.xz, waterHeightAt( world.xz ) );');
    expect(spray.mesh.material.fragmentShader).toContain('henyeyGreenstein( dot( normalize( vSprayWorld - cameraPosition ), spraySunDirection ), MIST_G )');
    expect(spray.mesh.material.fragmentShader).toContain('smoothstep( -0.1, 0.35, vAbove )');
    const water = new WaterSurface({ ...source, cubic: true });
    spray.useWater(water.causticSource);
    expect(spray.mesh.material.uniforms.waterSurface).toBe(water.causticSource.waterSurface);
    expect(spray.mesh.material.uniforms.waterTubeMap).toBe((water.causticSource as unknown as Record<string, unknown>).waterTubeMap);
    spray.setSun(new Vector3(0, 1, 0), new Color(2, 2, 2));
    expect(spray.mesh.material.uniforms.spraySunDirection.value).toEqual(new Vector3(0, 1, 0));
    spray.setLook('classic');
    expect({ vertex: spray.mesh.material.vertexShader, fragment: spray.mesh.material.fragmentShader }).toEqual(classic);
  });

  it('keeps the tube’s whitewater out of the Classic spray, and draws it in Rich: the foam ball as a ball of churn (G9)', () => {
    const spray = new SprayPoints();
    const particles = new Float32Array(5 * SPRAY_STRIDE);
    particles.set([1, 2, 3, 0.1, 0.8, 0], 0);
    particles.set([4, 5, 6, 0.6, 0.9, 2], SPRAY_STRIDE);
    particles.set([7, 8, 9, 0.4, 0.25, 1], 2 * SPRAY_STRIDE);
    particles.set([10, 11, 12, 0.1, 0.8, 3], 3 * SPRAY_STRIDE);
    particles.set([13, 14, 15, 0.4, 0.25, 4], 4 * SPRAY_STRIDE);
    spray.update({ particles, count: 5 });
    expect(spray.mesh.geometry.drawRange.count).toBe(2);
    expect(Array.from(spray.mesh.geometry.getAttribute('position').array.slice(0, 6))).toEqual([1, 2, 3, 7, 8, 9]);
    spray.setLook('rich');
    spray.update({ particles, count: 5 });
    expect(spray.mesh.geometry.drawRange.count).toBe(5);
    expect(Array.from(spray.mesh.geometry.getAttribute('kind').array.slice(0, 5))).toEqual([0, 2, 1, 3, 4]);
    // The spit's mist (4) is mist, as the lip's (1) is; only kind 2 is a foam ball.
    expect(spray.mesh.material.vertexShader).toContain('vMist = abs( kind - 1.0 ) < 0.5 || abs( kind - 4.0 ) < 0.5 ? 1.0 : 0.0;');
    expect(spray.mesh.material.fragmentShader).toContain('if ( abs( vKind - 2.0 ) < 0.5 ) {');
    expect(spray.mesh.material.fragmentShader).toContain('texture( waterChurnMap');
    expect(spray.mesh.material.uniforms.waterChurnMap.value).toBe(churnTexture());
    // Smoothstep with its edges in order (reversed edges are undefined in GLSL ES).
    expect(spray.mesh.material.fragmentShader).toContain('( 1.0 - smoothstep( 0.55, 1.0, r ) )');
    expect(spray.mesh.material.fragmentShader).not.toContain('smoothstep( 1.0, 0.55, r )');
    // The Rich pool holds the spray and the tube's whitewater both.
    expect(spray.capacity).toBe(SPRAY_CAPACITY + WHITEWATER_CAPACITY);
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
    // G9: the air in the water is the tank's; the far ocean declares no varyings its vertex shader never writes.
    expect(shader.fragmentShader).not.toContain('vWaterAir');
    expect(shader.fragmentShader).not.toContain('vWaterPlumeDepth');
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

  it('draws the Rich lip as sky-lit water, as thick as its own, and restores the Classic sheet', () => {
    const lip = new LipSheetMesh();
    const classic = lip.mesh.material;
    lip.setLook('rich');
    expect(lip.mesh.material).toBe(lip.richMaterial);
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    lip.richMaterial.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
    expect(shader.fragmentShader).toContain('exp( -waterAttenuation * vLipThickness )');
    expect(shader.fragmentShader).toContain(RICH_REFLECTION);
    expect(shader.vertexShader).toContain('vLipThickness = thickness;');
    // The sky's light comes through only where sky lies behind the lip: none looking down onto it, where the tube's water is.
    expect(shader.fragmentShader).toContain('float lipSkyward = smoothstep( -0.1, 0.2, lipThrough.y );');
    lip.setLook('classic');
    expect(lip.mesh.material).toBe(classic);
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

describe('the swept barrel’s seam in the water (Padang Padang, Part B, PR 3)', () => {
  it('leaves the water’s program exactly as before unless a swept spot turns the mask on', () => {
    const water = new WaterSurface(source);
    const before = compiled(water.mesh.material);
    water.setBarrelEnabled(true);
    expect(water.mesh.material.customProgramCacheKey()).toContain('-barrel');
    const on = compiled(water.mesh.material);
    expect(mirrorsBarrelDither(on.fragment)).toBe(true);
    expect(mirrorsBarrelDither(before.fragment)).toBe(false);
    water.setBarrelEnabled(false);
    expect(compiled(water.mesh.material)).toEqual(before);
    // The Rich look draws only over a source whose bodies ride its cubic surface.
    const rich = new WaterSurface({ ...source, cubic: true });
    rich.setLook('rich');
    expect(rich.drawnLook).toBe('rich');
    rich.setBarrelEnabled(true);
    expect(mirrorsBarrelDither(compiled(rich.mesh.material).fragment)).toBe(true);
  });

  it('switches the discard with the mask', () => {
    const water = new WaterSurface(source);
    water.setBarrelEnabled(true);
    expect(water.barrelMaskActive).toBe(false);
    water.setBarrelMask(new Uint8Array(grid.nx * grid.nz).fill(255));
    expect(water.barrelMaskActive).toBe(true);
    water.setBarrelMask(null);
    expect(water.barrelMaskActive).toBe(false);
  });
});
