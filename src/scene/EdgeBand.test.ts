import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { BAND_SKIRT_BOTTOM, BAND_SKIRT_TOP, BAND_SURFACE, EdgeBand, bandOffsets, bandShaders, edgeBandGeometry } from './EdgeBand';
import { EdgeWhitewater, edgeIndex } from './EdgeWhitewater';
import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, Points, PointsMaterial, Vector3 } from 'three';
import { FarFieldOcean } from './FarFieldOcean';
import { WaterSurface, type SurfaceSource } from './WaterSurface';
import { EDGE_BAND, bandBedWeight, bandWeight, mirrorX } from './water/edgeBandGlsl';
import { ROLLER_SLOTS, ROLLER_STRIDE } from '../wave/SpillingRoller';

const grid = { xMin: -20, zMin: -40, spacing: 1, nx: 41, nz: 31 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };

function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader, uniforms: shader.uniforms as Record<string, { value: unknown }> };
}

describe('the edge band', () => {
  it('is the mirror alone out to `pure`, hands over to the far ocean by `fade`, and joins the tank with none of it', () => {
    const layout = { xMin: -80, xMax: 80, zMin: -330, zone: 60 };
    expect(bandWeight(-80, -100, layout)).toBe(0);
    expect(bandWeight(80, -330, layout)).toBe(0);
    expect(bandWeight(-80 - EDGE_BAND.pure, -100, layout)).toBe(0);
    expect(bandWeight(80 + EDGE_BAND.fade, -100, layout)).toBe(1);
    const middle = bandWeight(80 + 0.5 * (EDGE_BAND.pure + EDGE_BAND.fade), -100, layout);
    expect(middle).toBeGreaterThan(0.4);
    expect(middle).toBeLessThan(0.6);
    // Across the relaxation zone (the far ocean's own sea) the band hands over within `corner` of the edge.
    expect(bandWeight(-80 - EDGE_BAND.corner, -330, layout)).toBe(1);
    expect(bandWeight(-80 - EDGE_BAND.corner, -270, layout)).toBe(0);
    expect(bandBedWeight(-80 - EDGE_BAND.fade, layout)).toBe(1);
    expect(bandBedWeight(-90, layout)).toBe(0);
    // The bed past an edge is the window's own, reflected across it, as the water's mirror reads it.
    expect(mirrorX(-23, -20, 20)).toBeCloseTo(-17, 12);
    expect(mirrorX(26, -20, 20)).toBeCloseTo(14, 12);
    expect(mirrorX(5, -20, 20)).toBe(5);
  });

  it('lays its columns at the grid’s spacing by the edge, coarser out to `fade`, on the tank’s own rows', () => {
    const offsets = bandOffsets(1, EDGE_BAND.fade);
    expect(offsets.slice(0, 9)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(offsets.at(-1)).toBe(EDGE_BAND.fade);
    for (let k = 1; k < offsets.length; k += 1) expect(offsets[k] - offsets[k - 1]).toBeLessThanOrEqual(4 + 1e-9);
    const geometry = edgeBandGeometry(grid);
    const position = geometry.getAttribute('position');
    const edge = geometry.getAttribute('waterBandEdge');
    const surface = new Set<string>();
    let skirts = 0;
    for (let v = 0; v < position.count; v += 1) {
      const x = position.getX(v);
      const z = position.getZ(v);
      if (edge.getX(v) === BAND_SURFACE) {
        surface.add(`${x},${z}`);
        // Every surface vertex lies past a side edge, out to `fade`, on one of the tank's rows.
        expect(x <= grid.xMin || x >= grid.xMin + 40).toBe(true);
        expect(Math.abs(x)).toBeLessThanOrEqual(20 + EDGE_BAND.fade);
        expect(Number.isInteger(z - grid.zMin)).toBe(true);
      } else {
        expect([BAND_SKIRT_TOP, BAND_SKIRT_BOTTOM]).toContain(edge.getX(v));
        skirts += 1;
      }
    }
    // The tank's edge columns are the band's first: vertex for vertex along each side.
    for (let j = 0; j < grid.nz; j += 1) {
      expect(surface.has(`${grid.xMin},${grid.zMin + j}`)).toBe(true);
      expect(surface.has(`${grid.xMin + 40},${grid.zMin + j}`)).toBe(true);
    }
    // Skirts under both outer rims (every row) and the offshore rim (across the strips and the tank).
    expect(skirts).toBe(2 * (2 * grid.nz + (2 * (offsets.length - 1) + grid.nx)));
    expect(geometry.getAttribute('onPatch').getX(0)).toBe(1);
    expect(geometry.getAttribute('skirt').getX(0)).toBe(0);
  });

  it('draws with the water’s own program in either look, blended into the far ocean’s sea', () => {
    const far = new FarFieldOcean();
    for (const cubic of [false, true]) {
      const water = new WaterSurface({ ...source, cubic });
      water.setLook('rich');
      const band = new EdgeBand(water, far);
      expect(water.mesh.children).toContain(band.mesh);
      const own = compiled(water.mesh.material);
      const drawn = compiled(band.mesh.material);
      expect(band.mesh.material.customProgramCacheKey()).toBe(`${water.mesh.material.customProgramCacheKey()}-edge-band`);
      // Every line of the water's own program is there, with the band's added.
      for (const line of own.vertex.split('\n').filter((l) => l.trim() && !l.includes('#include <common>'))) expect(drawn.vertex).toContain(line.trim());
      expect(drawn.vertex).toContain('farSeaAt( waterXZ, 0.0, waterFarHeight, waterFarSlope, waterFarShift, waterFarDepth, farCap );');
      expect(drawn.vertex).toContain('waterHeight = mix( waterHeight, waterFarHeight, waterBandW );');
      expect(drawn.vertex).toContain('transformed.y -= 0.300 * max( 0.0, waterBandEdge - 1.0 );');
      expect(drawn.fragment).toContain('float gap = waterBandHeight( p.xz, ');
      expect(drawn.fragment).toContain('float faceDirection = vWaterBandSkirt > 0.5 ? 1.0 : ( gl_FrontFacing ? 1.0 : - 1.0 );');
      expect(drawn.fragment).toContain('float waterBehind = pow( max( 0.0, dot( -waterV, waterSunDirection ) ), 4.0 ) * waterBandDetail( vWaterWorld.xz );');
      if (cubic) {
        expect(drawn.vertex).toContain('vWaterAir *= 1.0 - waterBandW;');
        // Per pixel near the edge, the vertices' blended slopes beyond (the band's level of detail).
        expect(drawn.fragment).toContain('if ( waterBandFine > 0.0 ) waterSurfaceSample = mix( waterSurfaceSample, waterBandSurface( waterCarvedCubic( vWaterWorld.xz ), vWaterWorld.xz ), waterBandFine );');
        expect(drawn.vertex).toContain('vWaterBandSlope = -objectNormal.xz / objectNormal.y;');
      } else {
        expect(drawn.vertex).not.toContain('vWaterAir');
      }
      // The water's uniforms are its own objects, and the far ocean's sea is the far ocean's.
      for (const key of ['waterSurface', 'waterGrid', 'waterBed']) expect(drawn.uniforms[key]).toBe(own.uniforms[key]);
      expect(drawn.uniforms.farTemporal).toBe(far.seaUniforms.farTemporal);
      expect(drawn.uniforms.farTable).toBe(far.seaUniforms.farTable);
    }
  });

  it('takes the roller and the swept barrel’s seam where the water has them, and the vertex-normal path', () => {
    const far = new FarFieldOcean();
    const roller: SurfaceSource = {
      ...source, cubic: true, rollerColumns: 4, rollerColumn0: 0.5, rollerColumnWidth: 1,
      writeRoller: (into) => { into.fill(0, 0, ROLLER_SLOTS * 4 * ROLLER_STRIDE); return 4; },
    };
    for (const look of ['classic', 'rich'] as const) {
      const water = new WaterSurface(roller);
      water.setLook(look);
      water.setBarrelEnabled(true);
      const drawn = compiled(new EdgeBand(water, far).mesh.material);
      expect(drawn.fragment).toContain('waterRollerCover *= waterBandTank;');
      expect(drawn.fragment).toContain('( waterBandInside( vWaterWorld.xz ) * waterBarrelMaskAt( vWaterWorld.xz ) )');
      expect(drawn.fragment).not.toMatch(/[^*] waterBarrelMaskAt\( vWaterWorld\.xz \) >/);
    }
    const water = new WaterSurface({ ...source, cubic: true });
    water.setLook('rich');
    water.setVertexNormals(true);
    const drawn = compiled(new EdgeBand(water, far).mesh.material);
    expect(drawn.vertex).toContain('vWaterSurfaceSlope = waterBandSlope;');
  });

  it('refuses a water program without the lines it changes', () => {
    expect(() => bandShaders('void main() {}', ShaderLib.physical.fragmentShader)).toThrow(/edge band/);
  });

  it('shows only at a spot, on the water’s grid, and holds the far ocean’s rim while it shows', () => {
    const far = new FarFieldOcean();
    const water = new WaterSurface(source);
    const band = new EdgeBand(water, far);
    far.attachRim(band.rimUniforms);
    band.update(true);
    expect(band.mesh.visible).toBe(false);
    expect(far.rimHeld).toBe(false);
    band.setSpot({ zone: 60 });
    band.update(true);
    expect(band.mesh.visible).toBe(true);
    expect(far.rimHeld).toBe(true);
    expect(band.layout).toEqual({ xMin: -20, xMax: 20, zMin: -40, zone: 60 });
    expect(band.mesh.geometry.getAttribute('position').count).toBeGreaterThan(0);
    band.update(false);
    expect(band.mesh.visible).toBe(false);
    expect(far.rimHeld).toBe(false);
    band.setSpot(undefined);
    band.update(true);
    expect(band.mesh.visible).toBe(false);
  });
});

describe('the far ocean’s rim', () => {
  it('reads the drawn tank and its band through the same uniform objects, compiled in again once attached', () => {
    const far = new FarFieldOcean();
    const water = new WaterSurface(source);
    const band = new EdgeBand(water, far);
    const before = far.mesh.material.customProgramCacheKey();
    far.attachRim(band.rimUniforms);
    const after = far.mesh.material.customProgramCacheKey();
    expect(after).not.toBe(before);
    far.attachRim(band.rimUniforms);
    expect(far.mesh.material.customProgramCacheKey()).toBe(after);
    const { vertex, uniforms } = compiled(far.mesh.material);
    expect(uniforms.waterSurface).toBe(water.materialUniforms.waterSurface);
    expect(uniforms.waterBand).toBe(band.rimUniforms.waterBand);
    expect(uniforms.farRim).toBe(band.rimUniforms.farRim);
    expect(vertex).toContain('float farRimGap = waterHeightAt( farRimXZ ) - farRimHeight;');
  });
});

describe('the whitewater past the side edges', () => {
  it('keeps the triangles (or points) within reach of an edge, on the tank’s side, as drawn', () => {
    const geometry = new BufferGeometry();
    // Three triangles: by the −x edge, straddling the reach, and far inside.
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([
      -19, 0, 0, -18, 0, 1, -17, 0, 0,
      -19, 0, 0, 30, 0, 1, -17, 0, 0,
      0, 0, 0, 1, 0, 1, 2, 0, 0,
    ]), 3));
    expect(Array.from(edgeIndex(geometry, false, -20, 1, 10))).toEqual([0, 1, 2]);
    expect(Array.from(edgeIndex(geometry, false, 20, -1, 25))).toEqual([6, 7, 8]);
    // Points past the edge itself are never mirrored back in; a draw range limits what counts.
    expect(Array.from(edgeIndex(geometry, true, -18.5, 1, 2))).toEqual([1, 2, 5]);
    geometry.setDrawRange(0, 3);
    expect(Array.from(edgeIndex(geometry, true, -20, 1, 10))).toEqual([0, 1, 2]);
  });

  it('draws each source again reflected across each side edge, sharing its vertices and material, while it shows', () => {
    const lip = new Mesh(new BufferGeometry(), new MeshBasicMaterial());
    lip.geometry.setAttribute('position', new BufferAttribute(new Float32Array([-75, 1, -100, -74, 1, -99, -73, 2, -100]), 3));
    lip.geometry.setIndex([0, 1, 2]);
    const spray = new Points(new BufferGeometry(), new PointsMaterial());
    spray.geometry.setAttribute('position', new BufferAttribute(new Float32Array([70, 1, -90, 0, 1, -90]), 3));
    const mirrored = new EdgeWhitewater([lip, spray]);
    mirrored.update({ xMin: -80, xMax: 80 });
    const [lipLeft, lipRight, sprayLeft, sprayRight] = mirrored.group.children as (Mesh | Points)[];
    expect(lipLeft.visible).toBe(true);
    expect(lipRight.visible).toBe(false);
    expect(sprayLeft.visible).toBe(false);
    expect(sprayRight.visible).toBe(true);
    expect(lipLeft.geometry.getAttribute('position')).toBe(lip.geometry.getAttribute('position'));
    expect(lipLeft.material).toBe(lip.material);
    expect(sprayRight).toBeInstanceOf(Points);
    expect(Array.from(sprayRight.geometry.getIndex()!.array)).toEqual([0]);
    // x → 2·edge − x: the lip 5 m inside the −x edge is drawn 5 m past it.
    lipLeft.updateMatrixWorld();
    const tip = lip.geometry.getAttribute('position');
    const drawn = lipLeft.localToWorld(new Vector3(tip.getX(0), tip.getY(0), tip.getZ(0)));
    expect(drawn.x).toBeCloseTo(-85, 9);
    mirrored.update(undefined);
    expect(lipLeft.visible).toBe(false);
    lip.visible = false;
    mirrored.update({ xMin: -80, xMax: 80 });
    expect(lipLeft.visible).toBe(false);
  });
});

