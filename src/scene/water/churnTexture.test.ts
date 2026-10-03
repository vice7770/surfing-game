import { describe, expect, it } from 'vitest';
import { RGBAFormat } from 'three';
import { foamCover } from '../foamPattern';
import { FOAM_BAKE, FOAM_RANGE, inverseNormal, mulberry32 } from './foamBake';
import {
  CHURN_TEXTURE_SIZE, CHURN_TILE, FOAM_EDGE, FOAM_FADE, FOAM_OCTAVES, FOAM_STAGE_CORRELATION, FOAM_WEIGHTS, churnSample, churnTexture, churnTextureData,
  FOAM_THICK, foamFieldCover, foamFieldThickness, foamGauss, foamHexGauss, foamQuantile, foamStageBlend, freshness, sampleFoamField, waterChurnPars,
} from './churnTexture';

describe('churn whitewater', () => {
  it('tiles seamlessly', () => {
    for (const v of [0.05, 0.5, 0.93]) {
      expect(churnSample(0, v).density).toBeCloseTo(churnSample(1, v).density, 9);
      expect(churnSample(v, 0).height).toBeCloseTo(churnSample(v, 1).height, 9);
    }
  });

  it('is dense: mostly covered, with creases between clumps', () => {
    let covered = 0;
    for (let i = 0; i < 100; i += 1) for (let j = 0; j < 100; j += 1) covered += churnSample(i / 100, j / 100).density;
    expect(covered / 1e4).toBeGreaterThan(0.7);
    expect(covered / 1e4).toBeLessThan(0.95);
  });

  it('takes over from the lace only where the foam is fresh', () => {
    // G9: freshness follows the void fraction the plunge drove in (measured peaks near 0.2).
    expect(freshness(0.01)).toBe(0);
    expect(freshness(0.2)).toBe(1);
    expect(freshness(0.1)).toBeGreaterThan(freshness(0.05));
  });

  it('is one repeating, mipmapped RGBA tile of 1024², churn in red and green, the foam’s two stages in blue and alpha', () => {
    const texture = churnTexture();
    expect(texture.image.width).toBe(1024);
    expect(texture.image.height).toBe(1024);
    expect(CHURN_TEXTURE_SIZE).toBe(1024);
    expect(texture.format).toBe(RGBAFormat);
    expect(texture.generateMipmaps).toBe(true);
    expect(texture).toBe(churnTexture());
    expect(CHURN_TILE).toBe(6);
    // Its bytes are made when first read (the GPU's first upload, or here), and only once.
    expect(texture.image.data).toBe(churnTextureData());
    expect(texture.image.data?.length).toBe(1024 * 1024 * 4);
  });

  it('keeps the churn in red and green as it was, raised from its 256² tile', () => {
    const data = churnTextureData();
    const random = mulberry32(5);
    for (let k = 0; k < 200; k += 1) {
      const i = Math.floor(random() * 1024);
      const j = Math.floor(random() * 1024);
      const { density, height } = churnSample((i + 0.5) / 1024, (j + 0.5) / 1024);
      expect(Math.abs(data[(j * 1024 + i) * 4] - density * 255)).toBeLessThan(14);
      expect(Math.abs(data[(j * 1024 + i) * 4 + 1] - height * 255)).toBeLessThan(14);
    }
  });
});

describe('the foam field’s texture', () => {
  it('holds each stage as a unit Gaussian of ranks, and the two stages related by the correlation the blend allows for', () => {
    const data = churnTextureData();
    const count = 1024 * 1024;
    let sums = [0, 0];
    let squares = [0, 0];
    let both = 0;
    for (let k = 0; k < count; k += 1) {
      const e = (data[k * 4 + 2] / 127.5 - 1) * FOAM_RANGE;
      const l = (data[k * 4 + 3] / 127.5 - 1) * FOAM_RANGE;
      sums = [sums[0] + e, sums[1] + l];
      squares = [squares[0] + e * e, squares[1] + l * l];
      both += e * l;
    }
    for (const channel of [0, 1]) {
      expect(sums[channel] / count).toBeCloseTo(0, 1);
      expect(Math.sqrt(squares[channel] / count)).toBeCloseTo(1, 1);
    }
    const correlation = (both / count - (sums[0] / count) * (sums[1] / count)) / Math.sqrt((squares[0] / count - (sums[0] / count) ** 2) * (squares[1] / count - (sums[1] / count) ** 2));
    expect(Math.abs(correlation - FOAM_STAGE_CORRELATION)).toBeLessThan(0.03);
  });

  it('reads as the GPU does: bilinear and repeating, in sigma', () => {
    for (const channel of [2, 3] as const) {
      expect(sampleFoamField(0.3, 0.7, channel)).toBeCloseTo(sampleFoamField(1.3, -0.3, channel), 9);
      expect(Math.abs(sampleFoamField(0.123, 0.456, channel))).toBeLessThanOrEqual(FOAM_RANGE);
    }
    // Between texels it is between their values.
    const half = 0.5 / 1024;
    const a = sampleFoamField(100 / 1024 + half, 50 / 1024 + half, 2);
    const b = sampleFoamField(101 / 1024 + half, 50 / 1024 + half, 2);
    const middle = sampleFoamField(100.5 / 1024 + half, 50 / 1024 + half, 2);
    expect(middle).toBeCloseTo((a + b) / 2, 9);
  });
});

describe('the foam field', () => {
  it('blends the stages to a unit Gaussian whatever their age', () => {
    expect(foamStageBlend(1.3, -0.4, 0)).toBeCloseTo(1.3, 12);
    expect(foamStageBlend(1.3, -0.4, 1)).toBeCloseTo(-0.4, 12);
    // Two unit Gaussians at the baked correlation: the blend’s variance stays 1.
    const random = mulberry32(11);
    const gauss = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
    for (const age of [0.25, 0.5, 0.8]) {
      let square = 0;
      for (let k = 0; k < 40000; k += 1) {
        const a = gauss();
        const b = FOAM_STAGE_CORRELATION * a + Math.sqrt(1 - FOAM_STAGE_CORRELATION ** 2) * gauss();
        square += foamStageBlend(a, b, age) ** 2;
      }
      expect(Math.sqrt(square / 40000)).toBeCloseTo(1, 1);
    }
  });

  it('thresholds at the Gaussian quantile, to a few parts in ten thousand', () => {
    for (const p of [0.001, 0.01, 0.05, 0.2, 0.5, 0.8, 0.95, 0.99, 0.999]) expect(Math.abs(foamQuantile(p) - inverseNormal(p))).toBeLessThan(6e-4);
  });

  it('hex-tiles to a unit Gaussian, continuous across the triangles, with no tile to find', () => {
    const random = mulberry32(21);
    let mean = 0;
    let square = 0;
    const count = 6000;
    for (let k = 0; k < count; k += 1) {
      const [early, late] = foamHexGauss(random() * 30, random() * 30, 0);
      mean += early + late;
      square += early * early + late * late;
    }
    expect(mean / (2 * count)).toBeCloseTo(0, 1);
    expect(Math.sqrt(square / (2 * count))).toBeCloseTo(1, 1);
    // Along a lattice edge (skewed coordinate s = 1) both sides agree.
    for (const z of [0.31, 1.7, 4.2]) {
      const x = 1 + z * 0.5773502692;
      const left = foamHexGauss(x - 1e-7, z, 0);
      const right = foamHexGauss(x + 1e-7, z, 0);
      expect(Math.abs(left[0] - right[0])).toBeLessThan(1e-3);
      expect(Math.abs(left[1] - right[1])).toBeLessThan(1e-3);
    }
    // The tile, shifted a whole tile or a whole lattice step, is not the same field: no correlation survives the shift.
    for (const lag of [FOAM_OCTAVES.large, 2 * FOAM_OCTAVES.large, FOAM_OCTAVES.small, 2 * FOAM_OCTAVES.small]) {
      let cross = 0;
      let first = 0;
      let second = 0;
      for (let k = 0; k < 4000; k += 1) {
        const x = random() * 40;
        const z = random() * 40;
        const a = foamGauss(x, z, 0, 0, 1)[1];
        const b = foamGauss(x + lag, z, 0, 0, 1)[1];
        cross += a * b;
        first += a * a;
        second += b * b;
      }
      expect(Math.abs(cross / Math.sqrt(first * second))).toBeLessThan(0.15);
    }
  });

  it('covers the share of the surface the foam says, at every age, so the covered part is always the densest', () => {
    const area = (foam: number, age: number) => {
      let sum = 0;
      let count = 0;
      for (let z = 3.1; z < 33; z += 0.3) {
        for (let x = 2.7; x < 32; x += 0.3) {
          sum += foamFieldCover(x, z, 0.2, 0.5, foam, age, 3.3);
          count += 1;
        }
      }
      return sum / count;
    };
    for (const [foam, age] of [[0.1, 1], [0.3, 1], [0.5, 0], [0.5, 0.5], [0.8, 0], [0.95, 0], [0.95, 0.4]] as const) expect(Math.abs(area(foam, age) - foam)).toBeLessThan(0.03);
    expect(foamFieldCover(5, 5, 0, 0, 0, 0.5, 1)).toBe(0);
    expect(foamFieldCover(5, 5, 0, 0, 1, 0.5, 1)).toBe(1);
  });

  it('opens holes of every size, not a net of cells: their areas vary at least as much as their mean', () => {
    const step = 0.12;
    const size = 280;
    const holes = (cover: (x: number, z: number) => number): number[] => {
      const mask = new Uint8Array(size * size);
      for (let j = 0; j < size; j += 1) for (let i = 0; i < size; i += 1) mask[j * size + i] = cover(5 + i * step, 5 + j * step) >= 0.5 ? 1 : 0;
      const seen = new Uint8Array(size * size);
      const areas: number[] = [];
      for (let start = 0; start < mask.length; start += 1) {
        if (mask[start] || seen[start]) continue;
        const stack = [start];
        seen[start] = 1;
        let count = 0;
        let edge = false;
        while (stack.length) {
          const k = stack.pop() as number;
          count += 1;
          const x = k % size;
          const y = Math.floor(k / size);
          if (x === 0 || y === 0 || x === size - 1 || y === size - 1) edge = true;
          for (const next of [k + 1, k - 1, k + size, k - size]) {
            const nx = next % size;
            if (next < 0 || next >= mask.length || Math.abs(nx - x) > 1 || mask[next] || seen[next]) continue;
            seen[next] = 1;
            stack.push(next);
          }
        }
        if (!edge && count * step * step >= 0.03) areas.push(count * step * step);
      }
      return areas;
    };
    const spread = (areas: number[]) => {
      const mean = areas.reduce((sum, a) => sum + a, 0) / areas.length;
      return Math.sqrt(areas.reduce((sum, a) => sum + (a - mean) ** 2, 0) / areas.length) / mean;
    };
    for (const [foam, age] of [[0.6, 0], [0.75, 0], [0.85, 0]] as const) {
      const areas = holes((x, z) => foamFieldCover(x, z, 0, 0, foam, age, 1));
      expect(areas.length).toBeGreaterThan(100);
      expect(spread(areas)).toBeGreaterThan(1);
    }
    // Classic’s lace, by the same measure: one hole size (about 0.5).
    const lace = holes((x, z) => foamCover(x, z, 0, 0, 0.75, 1));
    expect(spread(lace)).toBeLessThan(0.7);
  });

  it('does not repeat: the covered mask’s autocorrelation stays under 0.3 at every lag from 3 to 20 m', () => {
    const step = 0.25;
    const size = 240;
    const correlation = (mask: Uint8Array, lag: number, along: 'x' | 'z') => {
      let a = 0;
      let b = 0;
      let both = 0;
      let squareA = 0;
      let squareB = 0;
      let count = 0;
      for (let j = 0; j < size; j += 1) {
        for (let i = 0; i < size; i += 1) {
          const ii = along === 'x' ? i + lag : i;
          const jj = along === 'z' ? j + lag : j;
          if (ii >= size || jj >= size) continue;
          const u = mask[j * size + i];
          const v = mask[jj * size + ii];
          a += u;
          b += v;
          both += u * v;
          squareA += u * u;
          squareB += v * v;
          count += 1;
        }
      }
      const covariance = both / count - (a / count) * (b / count);
      return covariance / Math.sqrt((squareA / count - (a / count) ** 2) * (squareB / count - (b / count) ** 2));
    };
    for (const [foam, age, flow] of [[0.6, 0, [0, 0]], [0.85, 0, [0.3, 0.5]], [0.4, 1, [0.3, 0.5]]] as const) {
      const mask = new Uint8Array(size * size);
      for (let j = 0; j < size; j += 1) for (let i = 0; i < size; i += 1) mask[j * size + i] = foamFieldCover(4 + i * step, 4 + j * step, flow[0], flow[1], foam, age, 3.1) >= 0.5 ? 1 : 0;
      for (const metres of [3, 4, 6, 8, 12, 16, 20]) {
        for (const along of ['x', 'z'] as const) expect(Math.abs(correlation(mask, Math.round(metres / step), along))).toBeLessThan(0.3);
      }
    }
  });

  it('softens its edges with the pixel’s footprint, and gives way to the foam’s mean where a pixel spans more than it can show', () => {
    const partial = (footprint: number) => {
      let soft = 0;
      let count = 0;
      for (let z = 3; z < 23; z += 0.1) {
        for (let x = 3; x < 23; x += 0.1) {
          const c = foamFieldCover(x, z, 0, 0, 0.6, 0, 1, footprint);
          if (c > 0.05 && c < 0.95) soft += 1;
          count += 1;
        }
      }
      return soft / count;
    };
    const near = partial(0.005);
    const middle = partial(0.05);
    const far = partial(0.2);
    expect(near).toBeLessThan(middle);
    expect(middle).toBeLessThan(far);
    expect(foamFieldCover(5, 5, 0, 0, 0.6, 0, 1, FOAM_FADE[1])).toBeCloseTo(0.6, 12);
    expect(foamFieldCover(5, 5, 0, 0, 0.6, 0, 1, 10)).toBe(0.6);
    expect(FOAM_EDGE).toBeLessThan(0.1);
  });

  it('is a single layer of bubbles at a patch’s edge and full foam once the field climbs over its threshold', () => {
    const foam = 0.5;
    let edge = 0;
    let core = 0;
    let between = 0;
    let counted = 0;
    for (let z = 3; z < 23; z += 0.17) {
      for (let x = 3; x < 23; x += 0.17) {
        const cover = foamFieldCover(x, z, 0, 0, foam, 0, 1);
        const thick = foamFieldThickness(x, z, 0, 0, foam, 0, 1);
        expect(thick).toBeGreaterThanOrEqual(0);
        expect(thick).toBeLessThanOrEqual(1);
        // Thickness rises with the field, and the cover is full only where it is not zero.
        if (cover > 0.99) expect(thick).toBeGreaterThan(0);
        if (cover < 0.01) expect(thick).toBeLessThan(0.2);
        if (cover > 0.99) { core += thick; counted += 1; }
        if (cover > 0.2 && cover < 0.8) { edge += thick; between += 1; }
      }
    }
    // Over the same patch the cores are thicker than the edges, and the edges are thin.
    expect(core / counted).toBeGreaterThan(edge / between);
    expect(edge / between).toBeLessThan(0.15);
    expect(FOAM_THICK).toBeGreaterThan(0);
    // A pixel that spans more than the pattern shows is full foam.
    expect(foamFieldThickness(5, 5, 0, 0, 0.5, 0, 1, FOAM_FADE[1])).toBe(1);
  });

  it('keeps one pattern in still water, and carries it with the current', () => {
    for (const time of [0.3, 1.1, 3.7]) expect(foamFieldCover(7, 9, 0, 0, 0.5, 0.5, time)).toBeCloseTo(foamFieldCover(7, 9, 0, 0, 0.5, 0.5, 0.9), 12);
    // At mid-period only the first phase shows, and a short step later the pattern has moved with the current.
    let moved = 0;
    let stayed = 0;
    const flow = [0.8, -0.3];
    const dt = 0.05;
    for (let k = 0; k < 600; k += 1) {
      const x = 4 + (k % 30) * 0.31;
      const z = 4 + Math.floor(k / 30) * 0.31;
      const now = foamFieldCover(x, z, flow[0], flow[1], 0.5, 0, 1);
      moved += Math.abs(foamFieldCover(x + flow[0] * dt, z + flow[1] * dt, flow[0], flow[1], 0.5, 0, 1 + dt) - now);
      stayed += Math.abs(foamFieldCover(x + 0.3, z, flow[0], flow[1], 0.5, 0, 1 + dt) - now);
    }
    expect(moved / 600).toBeLessThan(0.03);
    expect(stayed / 600).toBeGreaterThan(0.1);
  });

  it('is built from two octaves whose weights make a unit Gaussian, a large one for the holes and a small one for their edges', () => {
    expect(FOAM_WEIGHTS.large ** 2 + FOAM_WEIGHTS.small ** 2).toBeCloseTo(1, 12);
    expect(FOAM_WEIGHTS.large).toBeGreaterThan(FOAM_WEIGHTS.small);
    expect(FOAM_OCTAVES.large).toBe(12);
    expect(FOAM_OCTAVES.small).toBe(3);
    expect(FOAM_OCTAVES.large * FOAM_BAKE.size).toBeGreaterThan(0);
  });

  it('has a GLSL twin: the same hash, the hex corners, the blends and the threshold', () => {
    expect(waterChurnPars).toContain('vec2 waterFoamField( vec2 p, vec2 flow, float foam, float age, float footprint )');
    expect(waterChurnPars).toContain(`smoothstep( 0.0, ${FOAM_THICK.toFixed(3)}, blend - t )`);
    expect(waterChurnPars).toContain('v = v * 1664525u + 1013904223u;');
    expect(waterChurnPars).toContain('uvec2( ivec2( corner ) + 1024 ) + salt');
    expect(waterChurnPars).toContain('textureGrad( waterChurnMap');
    expect(waterChurnPars).toContain(`const float FOAM_TILE_LARGE = ${FOAM_OCTAVES.large.toFixed(3)};`);
    expect(waterChurnPars).toContain(`const float FOAM_TILE_SMALL = ${FOAM_OCTAVES.small.toFixed(3)};`);
    expect(waterChurnPars).toContain(`2.0 * age * ( 1.0 - age ) * ${FOAM_STAGE_CORRELATION.toFixed(3)}`);
    // The branch is the whole quad's, so its derivatives are real; the streaks' sample is defined here, after the churn map.
    expect(waterChurnPars).toContain('float reach = foam + abs( dFdx( foam ) ) + abs( dFdy( foam ) );');
    expect(waterChurnPars).toContain('float waterStreakField( vec2 frame, vec2 dx, vec2 dy ) {');
    // Plain ASCII: some drivers refuse anything else in a shader.
    expect(/^[\x09\x0a\x20-\x7e]*$/.test(waterChurnPars)).toBe(true);
  });
});
