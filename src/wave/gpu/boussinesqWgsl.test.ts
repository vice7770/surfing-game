import { describe, expect, it } from 'vitest';
import { FIELD, boussinesqWgsl } from './boussinesqWgsl';

describe('GPU row scratch layout', () => {
  const shader = boussinesqWgsl();

  it('keeps every cell distinct and consecutive rows adjacent for rectangular grids and partial workgroups', () => {
    // Execute the shader's integer address expression rather than a separate implementation of the layout.
    const expression = shader.match(/fn rowScratch\([^)]*\) -> u32 \{ return ([^;]+); \}/)?.[1];
    expect(expression).toBeDefined();
    const address = new Function('ix', 'iz', 'P', `return ${expression}`) as (ix: number, iz: number, p: { nz: number }) => number;
    for (const [nx, nz] of [[1, 1], [2, 5], [65, 7], [7, 65], [17, 23]]) {
      const offsets = new Set<number>();
      for (let ix = 0; ix < nx; ix += 1) {
        for (let iz = 0; iz < nz; iz += 1) {
          const offset = address(ix, iz, { nz });
          expect(offset).toBeGreaterThanOrEqual(0);
          expect(offset).toBeLessThan(nx * nz);
          offsets.add(offset);
          if (iz + 1 < nz) expect(address(ix, iz + 1, { nz }) - offset).toBe(1);
        }
      }
      expect(offsets.size).toBe(nx * nz);
    }
  });

  it('uses the transposed scratch consistently while preserving both physical flux layouts', () => {
    const rowTerms = shader.slice(shader.indexOf('fn rowTerms('), shader.indexOf('// K12:'));
    const rows = shader.slice(shader.indexOf('fn rows('), shader.indexOf('// K13:'));
    const columns = shader.slice(shader.indexOf('fn columns('), shader.indexOf('// K15:'));
    for (const field of [FIELD.XHW, FIELD.XHE, FIELD.XETAW, FIELD.XETAE]) {
      expect(rowTerms).toContain(`put(${field}u, scratch,`);
    }
    expect(rowTerms).toContain('let scratch = rowScratch(ix, iz);');
    expect(rows).toContain('let i = rowScratch(ix, iz);');
    expect(rows).toContain(`put(${FIELD.TC}u, i, cPrev); put(${FIELD.TR}u, i, rPrev);`);
    expect(rows).toContain('let scratch = rowScratch(u32(k), iz);');
    expect(rows).toContain(`next = at(${FIELD.TR}u, scratch) - at(${FIELD.TC}u, scratch) * next;`);
    expect(rows).toContain(`put(${FIELD.QX}u, row + nx - 1u, next);`);
    expect(rows).toContain(`put(${FIELD.QX}u, i, next);`);
    expect(columns).not.toContain('rowScratch');
    expect(columns).toContain('let i = iz * nx + ix;');
    expect(columns).toContain(`put(${FIELD.QZ}u, i, next);`);
  });
});

describe('GPU shared side-feed times', () => {
  const shader = boussinesqWgsl();
  const side = shader.slice(shader.indexOf('var<workgroup> sideTimes:'));

  it('keeps partial-workgroup lanes alive until both uniform chunk barriers complete', () => {
    expect(side).toContain('@builtin(local_invocation_index) lane: u32');
    expect(side).toContain('let hasSlot = slot < P.feedSlots;');
    expect(side).toContain('if (hasSlot) {\n    let record = P.feedComponents * 3u + slot * 4u;');
    expect(side.match(/workgroupBarrier\(\);/g)).toHaveLength(2);
    expect(side.indexOf('return;')).toBeGreaterThan(side.lastIndexOf('workgroupBarrier();'));
    expect(side).toContain('for (var first = 0u; first < P.feedComponents; first += 64u)');
  });

  it('produces and consumes every component exactly once in its original order, including multi-chunk tails', () => {
    const width = Number(side.match(/sideTimes: array<vec2<f32>, (\d+)>/)?.[1]);
    expect(width).toBe(64);
    // Address expressions come from the shader; exercise the cooperative schedule over arbitrary counts.
    const producer = side.match(/let c = ([^;]+);/)?.[1];
    const consumer = side.match(/let timeCos = sideTimes\[([^\]]+)\]/)?.[1];
    expect(producer).toBeDefined(); expect(consumer).toBeDefined();
    const produceAt = new Function('first', 'lane', `return ${producer}`) as (first: number, lane: number) => number;
    const consumeAt = new Function('c', 'first', `return ${consumer}`) as (c: number, first: number) => number;
    expect(side).toContain('c < min(first + 64u, P.feedComponents)');
    for (const components of [0, 1, 24, 64, 65, 129]) {
      for (const slots of [1, 63, 64, 65, 130]) {
        const visited = Array.from({ length: slots }, () => [] as number[]);
        for (let group = 0; group < Math.ceil(slots / width); group += 1) {
          for (let first = 0; first < components; first += width) {
            const table = new Array<number>(width);
            for (let lane = 0; lane < width; lane += 1) {
              const c = produceAt(first, lane);
              if (c < components) table[lane] = c;
            }
            for (let lane = 0; lane < width; lane += 1) {
              const slot = group * width + lane;
              if (slot >= slots) continue;
              for (let c = first; c < Math.min(first + width, components); c += 1) {
                const index = consumeAt(c, first);
                visited[slot].push(table[index]);
              }
            }
          }
        }
        const expected = Array.from({ length: components }, (_, c) => c);
        for (const sequence of visited) expect(sequence).toEqual(expected);
      }
    }
  });

  it('retains the existing float arithmetic for time factors and each component contribution', () => {
    for (const line of [
      'let angle = D[c * 3u + 2u] * P.tau;',
      'let ca = cos(angle); let sa = sin(angle);',
      'let timeCos = c0 * ca - s0 * sa;',
      'let timeSin = s0 * ca + c0 * sa;',
      'let real = D[r] * D[k] - D[r + 1u] * D[k + 1u];',
      'let imaginary = D[r] * D[k + 1u] + D[r + 1u] * D[k];',
      'let value = real * timeCos + imaginary * timeSin;',
      'eta += value; qx += D[r + 2u] * value; qz += D[r + 3u] * value;',
    ]) expect(side).toContain(line);
    expect(side).toContain('sideTimes[lane] = vec2<f32>(timeCos, timeSin);');
  });
});
