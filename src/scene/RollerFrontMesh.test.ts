import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import {
  PATCH_VERTICES, ROLLER_FRONT, RollerFrontMesh, buildFrontPatches, createFrontPatches, frontEnvelope, frontFresh, frontLump,
} from './RollerFrontMesh';
import { WaterSurface, type SurfaceSource } from './WaterSurface';
import { BAND_LOOK_FIELD, BAND_LOOK_STRIDE } from '../wave/SpillingCurl';
import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE } from '../wave/SpillingRoller';

const COLUMNS = 12;

/** A drawn table with one run in slot 2 over columns 4–7 (crest z 10 + 0.2 a column, 5 m long), and its look. */
function run(): { table: Float32Array; look: Float32Array } {
  const table = new Float32Array(ROLLER_SLOTS * COLUMNS * ROLLER_STRIDE);
  const look = new Float32Array(ROLLER_SLOTS * COLUMNS * BAND_LOOK_STRIDE);
  for (let column = 4; column <= 7; column += 1) {
    const o = (2 * COLUMNS + column) * ROLLER_STRIDE;
    table[o + ROLLER_FIELD.crest] = 10 + 0.2 * column;
    table[o + ROLLER_FIELD.length] = 5;
    table[o + ROLLER_FIELD.scale] = column === 7 ? 0.5 : 1;
    table[o + ROLLER_FIELD.thickness] = 0.5;
    table[o + ROLLER_FIELD.flowZ] = 4;
    table[o + ROLLER_FIELD.troughDepth] = 1.8;
    table[o + ROLLER_FIELD.roughness] = 0.4;
    const l = (2 * COLUMNS + column) * BAND_LOOK_STRIDE;
    look[l + BAND_LOOK_FIELD.since] = 0.1 * column;
    look[l + BAND_LOOK_FIELD.height] = 2;
  }
  return { table, look };
}

describe('the roller front\'s patches', () => {
  it('lays one patch on each pair of columns either of which is drawn, an empty end taking its neighbour\'s with no scale', () => {
    const { table, look } = run();
    const patches = createFrontPatches(ROLLER_SLOTS * (COLUMNS - 1));
    const count = buildFrontPatches(table, look, COLUMNS, -5.5, 1, patches);
    // Columns 3–4, 4–5, 5–6, 6–7 and 7–8.
    expect(count).toBe(5);
    const x = Array.from({ length: count }, (_, k) => patches.e[2 * k]);
    expect(x).toEqual([-2.5, -1.5, -0.5, 0.5, 1.5]);
    for (let k = 0; k < count; k += 1) expect(patches.e[2 * k + 1]).toBe(2);
    // The first: column 3 empty, its geometry column 4's, no scale; column 4's own.
    expect(Array.from(patches.a0.subarray(0, 4))).toEqual([Math.fround(10.8), 5, 0, 0.5]);
    expect(Array.from(patches.a1.subarray(0, 4))).toEqual([Math.fround(10.8), 5, 1, 0.5]);
    expect(Array.from(patches.c.subarray(0, 4))).toEqual([Math.fround(0.4), Math.fround(0.4), 2, 2]);
    // The last: column 7 (half drawn, its fray) and an empty column 8.
    expect(patches.a0[4 * 4 + 2]).toBe(0.5);
    expect(patches.a1[4 * 4 + 2]).toBe(0);
    expect(patches.a1[4 * 4]).toBeCloseTo(11.4, 5);
    // The crest's slope along shore, central inside the run, one-sided at its ends; the length's flat.
    expect(patches.d[4 * 1]).toBeCloseTo(0.2, 5);
    expect(patches.d[4 * 2 + 1]).toBeCloseTo(0.2, 5);
    expect(patches.d[4 * 4]).toBeCloseTo(0.2, 5);
    expect(patches.d[4 * 2 + 2]).toBeCloseTo(0, 6);
    // The flow, h₁ and d′max ride along.
    expect(Array.from(patches.b0.subarray(4, 8))).toEqual([0, 4, Math.fround(1.8), Math.fround(0.4)]);
  });

  it('lays none over an empty table', () => {
    const table = new Float32Array(ROLLER_SLOTS * COLUMNS * ROLLER_STRIDE);
    const look = new Float32Array(ROLLER_SLOTS * COLUMNS * BAND_LOOK_STRIDE);
    expect(buildFrontPatches(table, look, COLUMNS, 0, 1, createFrontPatches(8))).toBe(0);
  });
});

describe('the roller front\'s look', () => {
  it('draws the white fresh from its landing 1.5–2× as bright as 5 s later (Koepke 1984; the advisor), brighter than the band, then greyer', () => {
    // The landing (0.15–0.65 s after touchdown) against the white 5 s older, in the light it gives back.
    const ratio = frontFresh(0.4) / frontFresh(5.4);
    expect(ratio).toBeGreaterThan(1.5);
    expect(ratio).toBeLessThan(2);
    expect(frontFresh(0)).toBeGreaterThan(1.5);
    expect(frontFresh(5.4)).toBeLessThan(0.95);
    expect(frontFresh(-1)).toBe(frontFresh(0));
  });

  it('stands its lumps largest in the toe half and 0.4 of them at the crest, none at its buried rear', () => {
    expect(frontEnvelope(-ROLLER_FRONT.rear)).toBe(0);
    expect(frontEnvelope(0)).toBeCloseTo(ROLLER_FRONT.crestShare, 12);
    for (const xi of [0.5, 0.7, 0.9]) expect(frontEnvelope(xi)).toBe(1);
    expect(frontEnvelope(0.25)).toBeGreaterThan(ROLLER_FRONT.crestShare);
    expect(frontEnvelope(0.25)).toBeLessThan(1);
  });

  it('raises its lumps upward only, never over the lens\'s thickness', () => {
    for (const sigma of [0.05, 0.3, 0.8]) {
      for (const cap of [0.1, 0.4]) {
        for (let n = -3; n <= 3; n += 0.25) {
          const lump = frontLump(n, sigma, cap);
          expect(lump).toBeGreaterThanOrEqual(0);
          expect(lump).toBeLessThanOrEqual(cap);
        }
        expect(frontLump(0, sigma, cap)).toBe(0);
      }
    }
    expect(frontLump(1, 0.3, 0)).toBe(0);
  });
});

describe('the roller front\'s mesh', () => {
  const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
  const source: SurfaceSource = { grid, time: 0, bedRevision: 0, cubic: true, write: () => {}, writeBed: () => {} };

  it('lays a patch on every slot and column pair once, quarter-metre sub-columns by 27 points across, and uploads only the look', () => {
    const front = new RollerFrontMesh(new WaterSurface(source).materialUniforms);
    const { table, look } = run();
    front.update(table, look, COLUMNS);
    expect(front.mesh.visible).toBe(true);
    expect(front.drawn).toEqual({ entries: 4, patches: ROLLER_SLOTS * (COLUMNS - 1), vertices: ROLLER_SLOTS * (COLUMNS - 1) * PATCH_VERTICES });
    expect(PATCH_VERTICES).toBe(5 * 27);
    const patch = front.mesh.geometry.getAttribute('rfPatch');
    expect(patch.count).toBe(ROLLER_SLOTS * (COLUMNS - 1));
    expect([patch.getX(COLUMNS - 1 + 3), patch.getY(COLUMNS - 1 + 3)]).toEqual([3, 1]);
    // The look's texture: (since, H) per slot and column.
    const texture = (front as unknown as { lookData: Float32Array }).lookData;
    expect(texture[2 * (2 * COLUMNS + 5)]).toBeCloseTo(0.5, 6);
    expect(texture[2 * (2 * COLUMNS + 5) + 1]).toBe(2);
    // The same columns again: the patches are not laid out anew.
    front.update(table, look, COLUMNS);
    expect(front.mesh.geometry.getAttribute('rfPatch')).toBe(patch);
    // Without its look (no spilling lip), or with no band drawn, none.
    front.update(table, new Float32Array(0), COLUMNS);
    expect(front.mesh.visible).toBe(false);
    front.update(new Float32Array(table.length), look, COLUMNS);
    expect(front.hasBand).toBe(false);
    expect(front.drawn.patches).toBe(0);
  });

  it('lays its points over the Rich water\'s Catmull-Rom surface, its nose at the band\'s wandering toe, and fades with the band', () => {
    const front = new RollerFrontMesh(new WaterSurface(source).materialUniforms);
    const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader };
    front.mesh.material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, undefined as never);
    expect(shader.vertexShader).toContain('vec3 rfWater = waterCubic( vec2( rfX, rfZ0 ) );');
    // The drawn table from the water's own roller texture, as the band reads it.
    expect(shader.vertexShader).toContain('texelFetch( waterRoller, ivec2( 2 * rfColumn, rfSlot ), 0 )');
    expect(shader.vertexShader).toContain('waterRollerToe( rfX, waterTime, rfB.w )');
    expect(shader.vertexShader).toContain('vec3 transformed = rfPosition;');
    expect(shader.fragmentShader).toContain('outgoingLight *= ( 1.0 +');
    // On the water's own uniforms: its heights, foam colour and sun.
    for (const name of ['waterSurface', 'waterGrid', 'waterRoller', 'waterRollerColumn0', 'rfLook', 'waterFoamColor', 'waterSunDirection', 'waterChurnMap', 'waterTime']) {
      expect(shader.uniforms).toHaveProperty(name);
    }
  });
});
