import { PerspectiveCamera, Scene, ShaderLib, type WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { CANYON, CANYON_OLD, canyonBreakLineZ, canyonFootZ, canyonReefEndX, canyonShape, type SpotName } from '../../wave/Bathymetry';
import { SPOT_OPTICS } from '../waterOptics';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { EdgeBand } from '../EdgeBand';
import { FarFieldOcean } from '../FarFieldOcean';
import { SpillingCurlMesh } from '../SpillingCurlMesh';
import type { WaterLook } from './waterLook';
import { ROCK_DARKEST, ROCK_RELIEF, ROCK_TEXTURE, canyonRockCover, reliefCover, rockBedMode, rockCoverFor, rockTexture, setRockBed, withRockBed } from './rockBed';

function compiled(material: import('three').Material): { vertex: string; fragment: string } {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
  material.onBeforeCompile(shader as never, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader };
}

const grid = { xMin: -4, zMin: -6, spacing: 2, nx: 5, nz: 4 };
const plain: SurfaceSource = { grid, time: 0, bedRevision: 0, write: (out) => out.fill(0), writeBed: (out) => out.fill(-2) };
const covered: SurfaceSource = {
  ...plain,
  writeBedCover: (out) => {
    for (let i = 0; i < out.length; i += 1) out[i] = i / (out.length - 1);
  },
};

describe('the rock\'s cover of the Canyon\'s bed', () => {
  // The least the texture leaves of a block's cover: its palest shade, in a sand pocket, on a pale top.
  const { blocks, patches, pockets, tops } = ROCK_TEXTURE;
  const least = (1 - blocks.tone - patches.tone) * (1 - pockets.depth) * (1 - tops.pale);

  for (const [name, c] of [['today\'s arm', CANYON], ['old layout', CANYON_OLD]] as const) {
    it(`covers the arm's top, end and back, and leaves the platform, the beach face and the land sand (${name})`, () => {
      const cover = canyonRockCover(c);
      // The arm's top, a few metres inshore of its break line, downcoast of the peak: rock, its texture aside.
      for (const along of [0, 10, 20]) {
        const x = c.peakX + along;
        const z = canyonBreakLineZ(x, c) + 4;
        expect(cover(x, z)).toBeGreaterThanOrEqual(least - 1e-9);
        expect(cover(x, z)).toBeLessThanOrEqual(ROCK_DARKEST);
      }
      // Open platform upcoast of the arm's end, seaward of its foot, and past its end on the beach face (where its face
      // runs on to, today's, `canyonReefEndX`): sand.
      expect(cover(c.peakX - 60, c.peakZ)).toBe(0);
      expect(cover(c.peakX + 5, canyonFootZ(c) - 40)).toBe(0);
      expect(cover(canyonReefEndX(c) + c.endTaper + 10, -c.crestDepth / c.shoreSlope)).toBe(0);
      // The beach face inshore of the ledge's back, shallower than its trough: sand. Dry land: sand.
      expect(cover(c.peakX + 5, -(c.lagoonDepth / c.shoreSlope) * 0.8)).toBe(0);
      expect(cover(c.peakX + 5, 5)).toBe(0);
    });
  }

  it('follows the ledge where its layout puts it: today\'s and the old layout\'s arm are one, so their rock is too', () => {
    const today = canyonRockCover(canyonShape('reef'));
    const old = canyonRockCover(canyonShape('old'));
    const onTop = (c: typeof CANYON) => [c.peakX + 2, canyonBreakLineZ(c.peakX + 2, c) + 3] as const;
    expect(today(...onTop(CANYON))).toBeGreaterThan(0);
    // canyon-wave-r2 (2026-10-22) changed the breaking and the window, not the arm: the old layout (main's at 578202fd)
    // has the same bed, so the same rock, from its upcoast end to past the run-on and on the open platform.
    for (const [x, z] of [onTop(CANYON), [CANYON.peakX - 12, canyonBreakLineZ(CANYON.peakX - 12) - 8], [30, -120], [10, -60], [-60, -150]] as const) {
      expect(old(x, z)).toBe(today(x, z));
    }
  });

  it('turns from sand to rock over the relief ROCK_RELIEF gives, smoothly', () => {
    expect(reliefCover(ROCK_RELIEF[0])).toBe(0);
    expect(reliefCover(ROCK_RELIEF[1])).toBe(1);
    expect(reliefCover((ROCK_RELIEF[0] + ROCK_RELIEF[1]) / 2)).toBeCloseTo(0.5, 9);
    expect(reliefCover(-3)).toBe(0);
  });

  it('textures the rock as jointed blocks with sand in a few hollows, the same wherever the window stands', () => {
    let joints = 0;
    let sandy = 0;
    let samples = 0;
    for (let x = -50; x < 50; x += 0.5) {
      for (let z = -150; z < -50; z += 0.5) {
        const t = rockTexture(x, z, 3);
        expect(t).toBeGreaterThanOrEqual((1 - blocks.tone - patches.tone) * (1 - pockets.depth) - 1e-9);
        expect(t).toBeLessThanOrEqual(1 + blocks.tone + patches.tone + blocks.crack + 1e-9);
        if (t > 1.1) joints += 1;
        if (t < 0.8) sandy += 1;
        samples += 1;
      }
    }
    // Darker joints and blocks over a share, sand over a few hollows only: rock, not paving, not blotches.
    expect(joints / samples).toBeGreaterThan(0.05);
    expect(joints / samples).toBeLessThan(0.4);
    expect(sandy / samples).toBeGreaterThan(0.02);
    expect(sandy / samples).toBeLessThan(0.3);
    expect(rockTexture(12.25, -80.5, 3)).toBe(rockTexture(12.25, -80.5, 3));
    // The shallowest tops a little paler.
    expect(rockTexture(12.25, -80.5, 1)).toBeCloseTo(rockTexture(12.25, -80.5, 3) * (1 - tops.pale), 9);
  });

  it('is the Canyon\'s alone, a grey-brown rock darker than its sand, never past black', () => {
    for (const spot of ['beach', 'point', 'reef', 'padang', 'pool'] as SpotName[]) expect(rockCoverFor(spot)).toBeUndefined();
    expect(rockCoverFor('canyon')).toBeDefined();
    expect(rockCoverFor('canyon', 'old')).toBeDefined();
    const { bedAlbedo: sand, rockAlbedo: rock } = SPOT_OPTICS.canyon;
    expect(rock).toBeDefined();
    const [r, g, b] = rock!;
    // Wet weathered rock, 0.08–0.2; warmer toward red, with no green cast (coral's 0.08/0.08/0.025 read olive).
    for (const value of rock!) {
      expect(value).toBeGreaterThanOrEqual(0.08);
      expect(value).toBeLessThanOrEqual(0.2);
    }
    expect(r).toBeGreaterThanOrEqual(g);
    expect(g).toBeGreaterThanOrEqual(b);
    expect(b / g).toBeGreaterThan(0.6);
    rock!.forEach((value, k) => {
      expect(value).toBeLessThan(sand[k] / 2);
      // Its darkest joints stay above black.
      expect(value + (ROCK_DARKEST - 1) * (value - sand[k])).toBeGreaterThan(0);
    });
  });
});

describe('the rock floor in the water\'s programs', () => {
  it('leaves a program without a cover as it was, byte for byte, in either look', () => {
    for (const look of ['classic', 'rich'] as WaterLook[]) {
      const water = new WaterSurface(plain);
      water.setLook(look);
      const program = compiled(water.mesh.material);
      expect(program.vertex).not.toContain('vWaterRock');
      expect(program.fragment).not.toContain('waterRockAlbedo');
      expect(water.mesh.material.customProgramCacheKey()).not.toContain('rock');
      expect(water.rockBed).toBe(false);
    }
  });

  it('reads the cover with the bed\'s height in one lookup and mixes the albedo by it, in either look and the edge band', () => {
    for (const look of ['classic', 'rich'] as WaterLook[]) {
      const water = new WaterSurface(covered);
      water.setLook(look);
      expect(water.rockBed).toBe(true);
      expect(water.mesh.material.customProgramCacheKey()).toContain('-rock-bed');
      const { vertex, fragment } = compiled(water.mesh.material);
      expect(vertex).toContain('vec2 waterBedRock = waterBedRockAt( waterXZ );');
      expect(vertex).toContain('vWaterDepth = max( 0.0, waterHeight - waterBedRock.x );');
      expect(vertex).not.toContain('waterBedAt( waterXZ )');
      expect(fragment.split('mix( waterBedAlbedo, waterRockAlbedo, vWaterRock )').length).toBe(3);
      const band = new EdgeBand(water, new FarFieldOcean());
      expect(compiled(band.mesh.material).vertex).toContain('vWaterRock *= 1.0 - waterBandW;');
    }
  });

  it('uploads the cover beside the bed\'s height, and drops it for a source without one', () => {
    const water = new WaterSurface(covered);
    water.update();
    const texture = water.materialUniforms.waterBed.value as import('three').DataTexture;
    const texels = texture.image.data as Float32Array;
    const nodes = grid.nx * grid.nz;
    expect(texels.length).toBe(2 * nodes);
    expect(texels[0]).toBe(-2);
    expect(texels[1]).toBe(0);
    expect(texels[2 * nodes - 2]).toBe(-2);
    expect(texels[2 * nodes - 1]).toBe(1);
    water.setSource(plain);
    water.update();
    const bare = water.materialUniforms.waterBed.value as import('three').DataTexture;
    expect((bare.image.data as Float32Array).length).toBe(nodes);
    expect(water.rockBed).toBe(false);
    expect(water.mesh.material.customProgramCacheKey()).not.toContain('rock');
  });

  it('draws the bed as sand again behind the dev switch, and back', () => {
    const water = new WaterSurface(covered);
    expect(rockBedMode.on).toBe(true);
    try {
      setRockBed(false);
      expect(water.rockBed).toBe(false);
      expect(compiled(water.mesh.material).vertex).not.toContain('vWaterRock');
    } finally {
      setRockBed(true);
    }
    expect(water.rockBed).toBe(true);
  });

  it('gives the spilling curl\'s body the face\'s bed, rock or sand, as the water under it draws it', () => {
    for (const look of ['classic', 'rich'] as WaterLook[]) {
      const water = new WaterSurface(covered);
      const curl = new SpillingCurlMesh(water.materialUniforms);
      curl.setLook(look);
      curl.rockBed = () => water.rockBed;
      expect(compiled(curl.mesh.material).vertex).not.toContain('vWaterRock');
      const renderer = { getRenderTarget: () => null, getSize: (v: { set: (x: number, y: number) => unknown }) => v.set(1280, 720) } as unknown as WebGLRenderer;
      curl.mesh.onBeforeRender(renderer, new Scene(), new PerspectiveCamera(), curl.mesh.geometry, curl.mesh.material, null as never);
      expect(curl.mesh.material.customProgramCacheKey()).toContain('-rock-bed');
      const { vertex, fragment } = compiled(curl.mesh.material);
      expect(vertex).toContain('vWaterDepth = max( 0.0, waterHeightAt( position.xz ) - waterBedRock.x );');
      expect(fragment).toContain('mix( waterBedAlbedo, waterRockAlbedo, vWaterRock )');
    }
  });

  it('refuses a program without the lines it changes', () => {
    expect(() => withRockBed({ vertexShader: 'void main() {}', fragmentShader: '#include <common>' }, { surface: 'h', xz: 'p' })).toThrow();
  });
});
