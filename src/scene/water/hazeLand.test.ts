import { MeshPhysicalMaterial, MeshStandardMaterial, PointsMaterial, ShaderLib, type Material, type WebGLProgramParametersWithUniforms } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { BubblePoints } from '../BubblePoints';
import { LipSheetMesh } from '../LipSheetMesh';
import { SpillingCurlMesh } from '../SpillingCurlMesh';
import { SpotSeabed } from '../SpotSeabed';
import { SprayPoints } from '../SprayPoints';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { SweptBarrelMesh } from '../barrel/SweptBarrelMesh';
import {
  LIP_HAZE_ROUTE, SEABED_HAZE_DEPTH, SHEET_HAZE_ROUTE, VIEW_TOWARD, hazeLandLook, hazeLandMode, hazeLandOn, hazeLandPars, hazeMaterial, hazeRoute, onHazeLandChange,
  setHazeLand, setHazeLandLook, withHazeLand,
} from './hazeLand';
import { hazeAmount, horizonHazeUniforms, ringColorAt, waterHazeColorPars, waterHazeUniformPars, waterHazeVertexPars } from './horizonHaze';

type Lib = keyof typeof ShaderLib;

/** A material's shaders after its `onBeforeCompile`, on three's sources for `lib`. */
function compiled(material: Material, lib: Lib = 'physical') {
  const shader = { uniforms: {} as Record<string, unknown>, vertexShader: ShaderLib[lib].vertexShader, fragmentShader: ShaderLib[lib].fragmentShader };
  material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader, uniforms: shader.uniforms, key: material.customProgramCacheKey() };
}

const VERTEX_MIX = 'gl_FragColor.rgb = mix( gl_FragColor.rgb, vHazeLand.rgb, vHazeLand.a );';
const PIXEL_MIX = 'gl_FragColor.rgb = mix( gl_FragColor.rgb, hazeLand.rgb, hazeLand.a );';
const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const cubic: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {}, cubic: true };

/** The haze is mixed over the tone-mapped colour, before it is encoded for the screen (as the water's). */
function expectMixedAfterToneMapping(fragment: string, mix: string): void {
  expect(fragment).toContain(mix);
  expect(fragment.indexOf(mix)).toBeGreaterThan(fragment.indexOf('#include <tonemapping_fragment>'));
  expect(fragment.indexOf(mix)).toBeLessThan(fragment.indexOf('#include <colorspace_fragment>'));
}

afterEach(() => {
  setHazeLand({ on: true, route: undefined });
  setHazeLandLook('classic');
});

describe('the horizon haze beyond the water', () => {
  it('shares the water\'s uniforms and ring lookup, its GLSL text unchanged', () => {
    expect(waterHazeVertexPars.startsWith(`\n${waterHazeUniformPars}varying vec4 vWaterHaze;\n${waterHazeColorPars}`)).toBe(true);
    expect(hazeLandPars.startsWith(`${waterHazeUniformPars}${waterHazeColorPars}`)).toBe(true);
    // No sampler (the edge band's program sits at the M1's 16 units), and the water's names only.
    expect(hazeLandPars).not.toMatch(/sampler/);
    expect([...hazeLandPars.matchAll(/uniform \w+ (\w+)/g)].map((match) => match[1])).toEqual(['waterHazeRing', 'waterHazeTurn', 'waterHazeExtinction']);
    // The same law as the water's, with no far-ocean share: all the way at the horizon, nothing near.
    expect(hazeLandPars).toContain('1.0 - exp( -waterHazeExtinction * length( toward ) )');
    expect(hazeAmount(1e7)).toBeCloseTo(1, 9);
    expect(hazeAmount(0)).toBe(0);
  });

  it('meets the sky\'s horizon colour when hazed all the way: the ring\'s colour in the point\'s direction', () => {
    const ring = Float32Array.from({ length: 96 }, (_, i) => (i % 7) / 7);
    const [x, z] = [-3000, 1200];
    const own = [0.8, 0.7, 0.4];
    const sky = ringColorAt(ring, x, z, 0.4);
    const share = hazeAmount(Math.hypot(x, z), 0, 1);
    const hazed = own.map((c, k) => c * (1 - share) + sky[k] * share);
    hazed.forEach((c, k) => expect(c).toBeCloseTo(sky[k], 6));
  });

  it('works out the haze per vertex (one varying) or per pixel (none), mixed after the tone mapping', () => {
    const vertex = { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader };
    withHazeLand(vertex, { route: 'vertex' });
    expect(vertex.vertexShader).toContain('#include <project_vertex>\nvHazeLand = hazeLandToward( ( vec4( mvPosition.xyz, 0.0 ) * viewMatrix ).xyz );');
    expect(vertex.vertexShader).toContain('varying vec4 vHazeLand;');
    expectMixedAfterToneMapping(vertex.fragmentShader, VERTEX_MIX);
    const pixel = { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader };
    withHazeLand(pixel, { route: 'pixel', pixelToward: 'vWorld - cameraPosition' });
    expect(pixel.vertexShader).toBe(ShaderLib.standard.vertexShader);
    expect(pixel.fragmentShader).not.toContain('vHazeLand');
    expect(pixel.fragmentShader).toContain('vec4 hazeLand = hazeLandToward( vWorld - cameraPosition );');
    expectMixedAfterToneMapping(pixel.fragmentShader, PIXEL_MIX);
    expect(() => withHazeLand({ vertexShader: 'void main() {}', fragmentShader: 'void main() {}' }, { route: 'vertex' })).toThrow(/project_vertex/);
  });

  it('is Rich only, and leaves it with ?hazeLand=off or with the water\'s own haze off', () => {
    expect(hazeLandOn('rich')).toBe(true);
    expect(hazeLandOn('classic')).toBe(false);
    setHazeLand(false);
    expect(hazeLandOn('rich')).toBe(false);
    setHazeLand('pixel');
    expect(hazeLandOn('rich')).toBe(true);
    expect(hazeRoute('vertex', true)).toBe('pixel');
    expect(hazeRoute('vertex', false)).toBe('vertex');
    const location = globalThis.location;
    for (const search of ['?horizon=off', '?horizonHaze=off']) {
      Object.defineProperty(globalThis, 'location', { value: { search }, configurable: true });
      try {
        expect(hazeLandOn('rich')).toBe(false);
      } finally {
        Object.defineProperty(globalThis, 'location', { value: location, configurable: true });
      }
    }
  });

  it('hazes three\'s own materials with the scene\'s look: Classic\'s program unchanged, the uniforms the water\'s', () => {
    const plain = new MeshStandardMaterial();
    const before = compiled(plain, 'standard');
    const hazed = hazeMaterial(new MeshStandardMaterial());
    expect(hazeMaterial(hazed)).toBe(hazed);
    let changes = 0;
    const stop = onHazeLandChange(() => {
      changes += 1;
    });
    const classic = compiled(hazed, 'standard');
    expect(classic.vertex).toBe(before.vertex);
    expect(classic.fragment).toBe(before.fragment);
    expect(classic.key).toBe(before.key);
    const version = hazed.version;
    setHazeLandLook('rich');
    expect(hazeLandLook()).toBe('rich');
    expect(changes).toBe(1);
    expect(hazed.version).toBeGreaterThan(version);
    // A standard material hands its fragments the view position: per pixel from it, no new varying.
    const rich = compiled(hazed, 'standard');
    expect(rich.key).toBe(`${before.key}-haze-land-pixel`);
    expectMixedAfterToneMapping(rich.fragment, PIXEL_MIX);
    expect(rich.fragment).toContain(`hazeLandToward( ${VIEW_TOWARD} )`);
    expect(rich.vertex).toBe(before.vertex);
    for (const name of Object.keys(horizonHazeUniforms) as (keyof typeof horizonHazeUniforms)[]) expect(rich.uniforms[name]).toBe(horizonHazeUniforms[name]);
    setHazeLandLook('rich');
    expect(changes).toBe(1);
    stop();
  });

  it('keeps a material\'s own shader patch and cache key under the haze', () => {
    const own = new MeshPhysicalMaterial();
    own.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= 0.5;');
    };
    own.customProgramCacheKey = () => 'own-patch';
    const other = new MeshPhysicalMaterial();
    other.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= 2.0;');
    };
    hazeMaterial(own);
    hazeMaterial(other);
    setHazeLandLook('rich');
    const a = compiled(own);
    const b = compiled(other);
    expect(a.fragment).toContain('diffuseColor.rgb *= 0.5;');
    expect(a.key).toBe('own-patch-haze-land-pixel');
    // Three's default key is the patch's source: two patches keep two programs.
    expect(b.fragment).toContain('diffuseColor.rgb *= 2.0;');
    expect(b.key).not.toBe(a.key);
    expect(b.key).toContain('diffuseColor.rgb *= 2.0;');
    const points = compiled(hazeMaterial(new PointsMaterial()), 'points');
    expectMixedAfterToneMapping(points.fragment, VERTEX_MIX);
  });

  it('hazes the sand and the seabed in the Rich look, as before in Classic', () => {
    const seabed = new SpotSeabed();
    const water = new WaterSurface(cubic);
    seabed.useCaustics(water.causticUniforms, water.causticSource as never);
    const classic = compiled(seabed.mesh.material, 'basic');
    expect(classic.fragment).not.toContain('vHazeLand');
    expect(classic.key).toBe('breakline-spot-seabed-caustics-wet-sand');
    setHazeLandLook('rich');
    // Per pixel from its world position, and only above the depth the water always covers.
    const rich = compiled(seabed.mesh.material, 'basic');
    expectMixedAfterToneMapping(rich.fragment, PIXEL_MIX);
    expect(rich.fragment).toContain(`if ( vSeabedWorld.y > ${(-SEABED_HAZE_DEPTH).toFixed(1)} ) {\n  vec4 hazeLand = hazeLandToward( vSeabedWorld - cameraPosition );`);
    expect(rich.vertex).not.toContain('vHazeLand');
    expect(rich.key).toBe('breakline-spot-seabed-caustics-wet-sand-haze-land-pixel');
    expect(rich.uniforms.waterHazeRing).toBe(horizonHazeUniforms.waterHazeRing);
    setHazeLand('vertex');
    expectMixedAfterToneMapping(compiled(seabed.mesh.material, 'basic').fragment, VERTEX_MIX);
    // Before the caustics are in (no world position in its fragments), the sand is hazed per vertex.
    setHazeLand({ on: true, route: undefined });
    expectMixedAfterToneMapping(compiled(new SpotSeabed().mesh.material, 'basic').fragment, VERTEX_MIX);
    water.dispose();
  });

  it('hazes the Rich lip, curl and barrel by their own look, through the water\'s uniform objects', () => {
    const water = new WaterSurface(cubic);
    const lip = new LipSheetMesh();
    const curl = new SpillingCurlMesh(water.materialUniforms);
    const barrel = new SweptBarrelMesh(water.materialUniforms);
    for (const look of ['classic', 'rich'] as const) {
      curl.setLook(look);
      barrel.setLook(look);
      for (const material of [curl.mesh.material, barrel.mesh.material]) {
        const { vertex, fragment, uniforms, key } = compiled(material);
        expect(fragment.includes('vHazeLand') || fragment.includes('hazeLandToward')).toBe(look === 'rich');
        expect(key.includes('-haze-land-')).toBe(look === 'rich');
        if (look === 'rich') {
          expectMixedAfterToneMapping(fragment, SHEET_HAZE_ROUTE === 'vertex' ? VERTEX_MIX : PIXEL_MIX);
          expect(vertex.includes('vHazeLand')).toBe(SHEET_HAZE_ROUTE === 'vertex');
          expect(uniforms.waterHazeRing).toBe(horizonHazeUniforms.waterHazeRing);
        }
      }
    }
    const rich = compiled(lip.richMaterial);
    expectMixedAfterToneMapping(rich.fragment, LIP_HAZE_ROUTE === 'vertex' ? VERTEX_MIX : PIXEL_MIX);
    expect(rich.uniforms.waterHazeExtinction).toBe(horizonHazeUniforms.waterHazeExtinction);
    // Both routes compile into each, from the world position each hands its fragments.
    setHazeLand('pixel');
    expect(compiled(lip.richMaterial).fragment).toContain('hazeLandToward( vLipWorld - cameraPosition )');
    expect(compiled(curl.mesh.material).fragment).toContain('hazeLandToward( vWaterWorld - cameraPosition )');
    expect(compiled(barrel.mesh.material).fragment).toContain('hazeLandToward( vWaterWorld - cameraPosition )');
    setHazeLand('off');
    for (const material of [lip.richMaterial, curl.mesh.material, barrel.mesh.material]) {
      const { fragment, key } = compiled(material);
      expect(fragment).not.toContain('hazeLand');
      expect(key).not.toContain('-haze-land-');
    }
    water.dispose();
  });

  it('hazes the Rich spray per sprite, and leaves Classic\'s spray as it was', () => {
    const spray = new SprayPoints(8);
    const classic = { vertex: spray.mesh.material.vertexShader, fragment: spray.mesh.material.fragmentShader };
    spray.setLook('rich');
    const { vertexShader, fragmentShader, uniforms } = spray.mesh.material;
    expect(vertexShader).toContain('vSprayWorld = world;\nvHazeLand = hazeLandToward( world - cameraPosition );');
    expect(fragmentShader).toContain(`#include <tonemapping_fragment>\n${VERTEX_MIX}`);
    expect(fragmentShader.indexOf(VERTEX_MIX)).toBeLessThan(fragmentShader.indexOf('#include <colorspace_fragment>'));
    expect(uniforms.waterHazeRing).toBe(horizonHazeUniforms.waterHazeRing);
    setHazeLand(false);
    expect(spray.mesh.material.fragmentShader).not.toContain('vHazeLand');
    spray.setLook('classic');
    expect(spray.mesh.material.vertexShader).toBe(classic.vertex);
    expect(spray.mesh.material.fragmentShader).toBe(classic.fragment);
  });

  it('hazes the bubbles with the scene\'s look', () => {
    const bubbles = new BubblePoints(8);
    expect(compiled(bubbles.mesh.material, 'points').fragment).not.toContain('vHazeLand');
    setHazeLandLook('rich');
    expectMixedAfterToneMapping(compiled(bubbles.mesh.material, 'points').fragment, VERTEX_MIX);
    expect(hazeLandMode.on).toBe(true);
  });
});
