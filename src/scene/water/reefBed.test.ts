import { PerspectiveCamera, Scene, ShaderLib, type WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { CANYON, CANYON_OLD, canyonArmEndX, canyonBreakLineZ, canyonFootZ, canyonShape, type SpotName } from '../../wave/Bathymetry';
import { SPOT_OPTICS } from '../waterOptics';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { EdgeBand } from '../EdgeBand';
import { FarFieldOcean } from '../FarFieldOcean';
import { SpillingCurlMesh } from '../SpillingCurlMesh';
import type { WaterLook } from './waterLook';
import { REEF_MOTTLE, REEF_RELIEF, canyonReefCover, reefBedMode, reefCoverFor, reefMottle, reliefCover, setReefBed, withReefBed } from './reefBed';

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

describe('the reef\'s cover of the Canyon\'s bed', () => {
  for (const [name, c] of [['reef bed', CANYON], ['old layout', CANYON_OLD]] as const) {
    it(`covers the arm's top, end and back reef, and leaves the platform, the beach face and the land sand (${name})`, () => {
      const cover = canyonReefCover(c);
      // The arm's top, a few metres inshore of its break line, downcoast of the peak: all reef but its sand pockets.
      for (const along of [0, 10, 20]) {
        const x = c.peakX + along;
        const z = canyonBreakLineZ(x, c) + 4;
        expect(cover(x, z)).toBeGreaterThanOrEqual(1 - REEF_MOTTLE.depth - 1e-9);
      }
      // Open platform upcoast of the arm's end, seaward of its foot, and past its end on the beach face: sand.
      expect(cover(c.peakX - 60, c.peakZ)).toBe(0);
      expect(cover(c.peakX + 5, canyonFootZ(c) - 40)).toBe(0);
      expect(cover(canyonArmEndX(c) + c.endTaper + 10, -c.crestDepth / c.shoreSlope)).toBe(0);
      // The beach face inshore of the back reef, shallower than its trough: sand. Dry land: sand.
      expect(cover(c.peakX + 5, -(c.lagoonDepth / c.shoreSlope) * 0.8)).toBe(0);
      expect(cover(c.peakX + 5, 5)).toBe(0);
    });
  }

  it('follows the reef where its layout puts it: each layout\'s peak is reef only on its own bed', () => {
    const reef = canyonReefCover(canyonShape('reef'));
    const old = canyonReefCover(canyonShape('old'));
    const onTop = (c: typeof CANYON) => [c.peakX + 2, canyonBreakLineZ(c.peakX + 2, c) + 3] as const;
    expect(reef(...onTop(CANYON))).toBeGreaterThan(0);
    expect(old(...onTop(CANYON_OLD))).toBeGreaterThan(0);
    // The old layout's peak, 305 m out, is open platform on today's short arm.
    expect(reef(...onTop(CANYON_OLD))).toBe(0);
  });

  it('turns from sand to reef over the relief REEF_RELIEF gives, smoothly', () => {
    expect(reliefCover(REEF_RELIEF[0])).toBe(0);
    expect(reliefCover(REEF_RELIEF[1])).toBe(1);
    expect(reliefCover((REEF_RELIEF[0] + REEF_RELIEF[1]) / 2)).toBeCloseTo(0.5, 9);
    expect(reliefCover(-3)).toBe(0);
  });

  it('mottles the reef with sand pockets a few metres across, the same wherever the window stands', () => {
    let pockets = 0;
    let reef = 0;
    let samples = 0;
    for (let x = -50; x < 50; x += 0.5) {
      for (let z = -150; z < -50; z += 0.5) {
        const m = reefMottle(x, z);
        expect(m).toBeGreaterThanOrEqual(1 - REEF_MOTTLE.depth - 1e-9);
        expect(m).toBeLessThanOrEqual(1);
        if (m < 1 - REEF_MOTTLE.depth / 2) pockets += 1;
        if (m === 1) reef += 1;
        samples += 1;
      }
    }
    expect(pockets / samples).toBeGreaterThan(0.05);
    expect(pockets / samples).toBeLessThan(0.45);
    expect(reef / samples).toBeGreaterThan(0.4);
    expect(reefMottle(12.25, -80.5)).toBe(reefMottle(12.25, -80.5));
  });

  it('is the Canyon\'s alone: every other spot draws its bed in its one albedo', () => {
    for (const spot of ['beach', 'point', 'reef', 'padang', 'pool'] as SpotName[]) expect(reefCoverFor(spot)).toBeUndefined();
    expect(reefCoverFor('canyon')).toBeDefined();
    expect(reefCoverFor('canyon', 'old')).toBeDefined();
    expect(SPOT_OPTICS.canyon.reefAlbedo).toBeDefined();
    // Darker than its sand in every channel, as coral is (Hochberg & Atkinson 2003).
    SPOT_OPTICS.canyon.reefAlbedo!.forEach((value, k) => expect(value).toBeLessThan(SPOT_OPTICS.canyon.bedAlbedo[k] / 3));
  });
});

describe('the reef\'s floor in the water\'s programs', () => {
  it('leaves a program without a cover as it was, byte for byte, in either look', () => {
    for (const look of ['classic', 'rich'] as WaterLook[]) {
      const water = new WaterSurface(plain);
      water.setLook(look);
      const program = compiled(water.mesh.material);
      expect(program.vertex).not.toContain('vWaterReef');
      expect(program.fragment).not.toContain('waterReefAlbedo');
      expect(water.mesh.material.customProgramCacheKey()).not.toContain('reef');
      expect(water.reefBed).toBe(false);
    }
  });

  it('reads the cover with the bed\'s height in one lookup and mixes the albedo by it, in either look and the edge band', () => {
    for (const look of ['classic', 'rich'] as WaterLook[]) {
      const water = new WaterSurface(covered);
      water.setLook(look);
      expect(water.reefBed).toBe(true);
      expect(water.mesh.material.customProgramCacheKey()).toContain('-reef-bed');
      const { vertex, fragment } = compiled(water.mesh.material);
      expect(vertex).toContain('vec2 waterBedReef = waterBedReefAt( waterXZ );');
      expect(vertex).toContain('vWaterDepth = max( 0.0, waterHeight - waterBedReef.x );');
      expect(vertex).not.toContain('waterBedAt( waterXZ )');
      expect(fragment.split('mix( waterBedAlbedo, waterReefAlbedo, vWaterReef )').length).toBe(3);
      const band = new EdgeBand(water, new FarFieldOcean());
      expect(compiled(band.mesh.material).vertex).toContain('vWaterReef *= 1.0 - waterBandW;');
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
    expect(water.reefBed).toBe(false);
    expect(water.mesh.material.customProgramCacheKey()).not.toContain('reef');
  });

  it('draws the bed as sand again behind the dev switch, and back', () => {
    const water = new WaterSurface(covered);
    expect(reefBedMode.on).toBe(true);
    try {
      setReefBed(false);
      expect(water.reefBed).toBe(false);
      expect(compiled(water.mesh.material).vertex).not.toContain('vWaterReef');
    } finally {
      setReefBed(true);
    }
    expect(water.reefBed).toBe(true);
  });

  it('gives the spilling curl\'s body the face\'s bed, reef or sand, as the water under it draws it', () => {
    for (const look of ['classic', 'rich'] as WaterLook[]) {
      const water = new WaterSurface(covered);
      const curl = new SpillingCurlMesh(water.materialUniforms);
      curl.setLook(look);
      curl.reefBed = () => water.reefBed;
      expect(compiled(curl.mesh.material).vertex).not.toContain('vWaterReef');
      const renderer = { getRenderTarget: () => null, getSize: (v: { set: (x: number, y: number) => unknown }) => v.set(1280, 720) } as unknown as WebGLRenderer;
      curl.mesh.onBeforeRender(renderer, new Scene(), new PerspectiveCamera(), curl.mesh.geometry, curl.mesh.material, null as never);
      expect(curl.mesh.material.customProgramCacheKey()).toContain('-reef-bed');
      const { vertex, fragment } = compiled(curl.mesh.material);
      expect(vertex).toContain('vWaterDepth = max( 0.0, waterHeightAt( position.xz ) - waterBedReef.x );');
      expect(fragment).toContain('mix( waterBedAlbedo, waterReefAlbedo, vWaterReef )');
    }
  });

  it('refuses a program without the lines it changes', () => {
    expect(() => withReefBed({ vertexShader: 'void main() {}', fragmentShader: '#include <common>' }, { surface: 'h', xz: 'p' })).toThrow();
  });
});
