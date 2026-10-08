import { ShaderLib, type BufferAttribute, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { shallowWaterWaveNumber } from '../wave/dispersion';
import { FarFieldProfile, type FarFieldOptions } from '../wave/FarFieldProfile';
import { SeaState } from '../wave/SeaState';
import { CURTAIN_MARGIN, CURTAIN_NORMAL_BEGIN, CurtainOcean, EdgeCurtain, curtainHeights, curtainNodes } from './EdgeCurtain';
import { WaterSurface, type SurfaceGrid, type SurfaceSource } from './WaterSurface';

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

// The far profile's own fixture: a tank whose offshore edge is z −330, its sides shoaling 2 cm a metre to dry land.
const reference = -330;
const tankDepth = 5;
const options: FarFieldOptions = {
  referenceZ: reference, shoreZ: 30, offshoreZ: -1500, shoreSamples: 181, offshoreSamples: 391,
  offshoreDepth: (z) => tankDepth + (60 - tankDepth) * Math.min(1, (reference - z) / 870),
  leftDepth: (z) => tankDepth - 0.02 * (z - reference),
  rightDepth: (z) => tankDepth - 0.02 * (z - reference),
};
const sea = SeaState.fromSpectrum(
  { significantHeight: 1.2, peakPeriod: 10, direction: 0.2, spreading: 12, componentCount: 16, depth: tankDepth }, 9, shallowWaterWaveNumber,
);
const profile = new FarFieldProfile(sea, options);
/** The tank's render grid over the hole: x −20…20, z −330 (offshore) to 30 (the shore), 2 m nodes. */
const grid: SurfaceGrid = { xMin: -20, zMin: reference, spacing: 2, nx: 21, nz: 181 };

/** A source whose water stands 1.5 m at its +x edge (a crest meeting it) and 0.1 m elsewhere. */
function source(cubic = false): SurfaceSource {
  return {
    grid, time: 0, bedRevision: 0, cubic,
    write: (data) => {
      for (let j = 0; j < grid.nz; j += 1) {
        for (let i = 0; i < grid.nx; i += 1) data[2 * (j * grid.nx + i)] = i === grid.nx - 1 ? 1.5 : 0.1;
      }
    },
    writeBed: () => {},
  };
}

describe('the edge curtain (the seam to the far ocean, 2026-10-08)', () => {
  it('walks the tank\'s open edges: the −x side from the shore out, the offshore edge, the +x side back in', () => {
    const nodes = curtainNodes({ xMin: 0, zMin: 0, spacing: 1, nx: 4, nz: 3 });
    expect(Array.from(nodes)).toEqual([8, 4, 0, 1, 2, 3, 7, 11]);
    expect(curtainNodes(grid)).toHaveLength(grid.nz + grid.nx - 1 + grid.nz - 1);
  });

  it('hangs from the higher surface to under the lower one, whichever it is', () => {
    const nodes = Int32Array.from([0, 1]);
    // (height, foam) per node: the tank's water at 1.2 m, then at −0.4 m.
    const data = Float32Array.from([1.2, 0, -0.4, 0]);
    const out = curtainHeights(nodes, data, [0.3, 0.6], new Float32Array(4));
    // Above the far ocean the curtain meets the tank's surface; below it, it rises to the far ocean's.
    expect(out[0]).toBeCloseTo(1.2, 6);
    expect(out[1]).toBeCloseTo(0.3 - CURTAIN_MARGIN, 6);
    expect(out[2]).toBeCloseTo(0.6, 6);
    expect(out[3]).toBeCloseTo(-0.4 - CURTAIN_MARGIN, 6);
  });

  it('meets the far ocean as its shader draws it, dry land just under the bed', () => {
    const nodes = curtainNodes(grid);
    const ocean = new CurtainOcean({ profile, centerX: 0 }, grid, nodes);
    let dry = 0;
    for (const t of [0, 7.3, 431.5]) {
      const heights = ocean.update(t);
      for (let k = 0; k < nodes.length; k += 1) {
        const x = grid.xMin + (nodes[k] % grid.nx) * grid.spacing;
        const z = grid.zMin + Math.floor(nodes[k] / grid.nx) * grid.spacing;
        const side = x < 0 ? 0 : 1;
        const depth = profile.depthAt(side, z);
        if (depth <= 0.05) {
          expect(heights[k]).toBeCloseTo(-depth - 0.05, 9);
          dry += 1;
        } else {
          expect(heights[k]).toBeCloseTo(profile.elevation(x, z, t, side), 9);
        }
      }
    }
    expect(dry).toBeGreaterThan(0);
  });

  it('draws with the water\'s own shading in both looks, its heights alone its own, and leaves the water\'s programs as they were', () => {
    for (const look of ['classic', 'rich'] as const) {
      const plain = new WaterSurface(source(true));
      plain.setLook(look);
      const water = new WaterSurface(source(true));
      water.setLook(look);
      const curtain = new EdgeCurtain(water);
      expect(water.drawnLook).toBe(look);
      expect(compiled(water.mesh.material)).toEqual(compiled(plain.mesh.material));
      expect(curtain.mesh.material.customProgramCacheKey()).toBe(`${water.mesh.material.customProgramCacheKey()}-edge-curtain`);
      const own = compiled(water.mesh.material);
      const drawn = compiled(curtain.mesh.material);
      // Its fragment is the water's, its normal never flipped for a back face: the edge's water as seen from above.
      expect(drawn.fragment).toBe(own.fragment.replace('#include <normal_fragment_begin>', CURTAIN_NORMAL_BEGIN));
      expect(drawn.fragment).toContain('float faceDirection = 1.0;');
      expect(drawn.fragment).not.toContain('gl_FrontFacing ? 1.0 : - 1.0');
      expect(drawn.vertex).toContain('attribute float waterCurtain;');
      expect(drawn.vertex).toContain('transformed.y = waterCurtain');
      expect(drawn.vertex).not.toContain('transformed.y = waterHeight');
      expect(drawn.vertex).toContain('vWaterWorld.y = waterHeight;');
      expect(drawn.vertex.replace('#include <common>\nattribute float waterCurtain;', '#include <common>').replace('transformed.y = waterCurtain', 'transformed.y = waterHeight')
        .replace('\nvWaterWorld.y = waterHeight;', '')).toBe(own.vertex);
    }
  });

  it('stands on the water\'s edge nodes, from the higher surface to under the lower, and goes with the far ocean', () => {
    const water = new WaterSurface(source());
    water.update();
    const curtain = new EdgeCurtain(water);
    expect(water.mesh.children).toContain(curtain.mesh);
    curtain.update(12);
    expect(curtain.mesh.visible).toBe(false);
    curtain.setFar({ profile, centerX: 0 });
    curtain.update(12);
    expect(curtain.mesh.visible).toBe(true);
    const geometry = curtain.mesh.geometry;
    const positions = geometry.getAttribute('position') as BufferAttribute;
    const heights = geometry.getAttribute('waterCurtain') as BufferAttribute;
    const nodes = curtainNodes(grid);
    expect(positions.count).toBe(2 * nodes.length);
    expect(geometry.index!.count).toBe(6 * (nodes.length - 1));
    const ocean = new CurtainOcean({ profile, centerX: 0 }, grid, nodes).update(12);
    for (let k = 0; k < nodes.length; k += 1) {
      const i = nodes[k] % grid.nx;
      const x = grid.xMin + i * grid.spacing;
      const z = grid.zMin + Math.floor(nodes[k] / grid.nx) * grid.spacing;
      for (const v of [2 * k, 2 * k + 1]) {
        expect(positions.getX(v) + water.mesh.position.x).toBeCloseTo(x, 4);
        expect(positions.getZ(v) + water.mesh.position.z).toBeCloseTo(z, 4);
      }
      const tank = i === grid.nx - 1 ? 1.5 : 0.1;
      expect(heights.getX(2 * k)).toBeCloseTo(Math.max(tank, ocean[k]), 4);
      expect(heights.getX(2 * k + 1)).toBeCloseTo(Math.min(tank, ocean[k]) - CURTAIN_MARGIN, 4);
    }
    // A normal attribute, so three never shades it flat from its vertical faces (the water's program makes its normal).
    expect(geometry.getAttribute('normal').count).toBe(2 * nodes.length);
    // The Rich program's patch attributes: no skirt, and on the patch (never cut away under it).
    expect(Array.from((geometry.getAttribute('skirt') as BufferAttribute).array).every((value) => value === 0)).toBe(true);
    expect(Array.from((geometry.getAttribute('onPatch') as BufferAttribute).array).every((value) => value === 1)).toBe(true);
    // The Wave Pool's walls: no far ocean, no curtain.
    curtain.setFar(undefined);
    curtain.update(13);
    expect(curtain.mesh.visible).toBe(false);
  });
});
