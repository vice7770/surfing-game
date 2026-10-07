import { describe, expect, it } from 'vitest';
import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE } from '../../wave/SpillingRoller';
import { waterRollerPars } from './rollerGlsl';
import { createRollerLook, pcg3d, rollerLookAt, rollerNoise2, rollerNoise3, ROLLER_LOOK, toeOffset } from './rollerLook';

/** pcg3d in BigInt arithmetic modulo 2³², the reference the 32-bit version must match word for word. */
function pcg3dReference(x: number, y: number, z: number): number[] {
  const m = (v: bigint) => v & 0xffffffffn;
  let [a, b, c] = [x, y, z].map((v) => m(BigInt(v >>> 0) * 1664525n + 1013904223n));
  a = m(a + b * c);
  b = m(b + c * a);
  c = m(c + a * b);
  a ^= a >> 16n;
  b ^= b >> 16n;
  c ^= c >> 16n;
  a = m(a + b * c);
  b = m(b + c * a);
  c = m(c + a * b);
  return [Number(a), Number(b), Number(c)];
}

interface Column {
  crest: number;
  length: number;
  scale: number;
  flowX?: number;
  flowZ?: number;
  troughDepth?: number;
  roughness?: number;
}

/** A roller table over `columns` columns with the given slot-0 (and slot-1) columns; others empty. */
function table(columns: number, slot0: (Column | null)[], slot1: (Column | null)[] = []): Float64Array {
  const out = new Float64Array(ROLLER_SLOTS * columns * ROLLER_STRIDE);
  [slot0, slot1].forEach((slot, s) => slot.forEach((column, i) => {
    if (!column) return;
    const o = (s * columns + i) * ROLLER_STRIDE;
    out[o + ROLLER_FIELD.crest] = column.crest;
    out[o + ROLLER_FIELD.length] = column.length;
    out[o + ROLLER_FIELD.scale] = column.scale;
    out[o + ROLLER_FIELD.thickness] = 0.5;
    out[o + ROLLER_FIELD.flowX] = column.flowX ?? 0;
    out[o + ROLLER_FIELD.flowZ] = column.flowZ ?? 0;
    out[o + ROLLER_FIELD.troughDepth] = column.troughDepth ?? 1.5;
    out[o + ROLLER_FIELD.roughness] = column.roughness ?? 0;
  }));
  return out;
}

const steady = (column: Column) => [column, column, column, column];

describe('pcg3d', () => {
  it('matches 32-bit wrapping arithmetic word for word, negative cells as their two\'s complement', () => {
    const cells = [[0, 0, 0], [1, 2, 3], [-1, 7, 2], [123456, -98765, 1], [2147483647, -2147483648, 65535]];
    for (const [x, y, z] of cells) expect(Array.from(pcg3d(x, y, z))).toEqual(pcg3dReference(x, y, z));
  });

  it('keeps its words pinned (the GLSL twin hashes the same lattice)', () => {
    expect(Array.from(pcg3d(0, 0, 0))).toEqual(pcg3dReference(0, 0, 0));
    expect(Array.from(pcg3d(1, 2, 3))).toMatchInlineSnapshot(`
      [
        4204755366,
        1223881804,
        1500469937,
      ]
    `);
  });
});

describe('the roller look\'s noises', () => {
  it('stay in range and match at lattice points', () => {
    let low = Infinity;
    let high = -Infinity;
    for (let n = 0; n < 4000; n += 1) {
      const v2 = rollerNoise2(n * 0.137, n * 0.071, 1);
      const v3 = rollerNoise3(n * 0.137, n * 0.071, n * 0.013);
      low = Math.min(low, v2);
      high = Math.max(high, v2);
      expect(v3).toBeGreaterThanOrEqual(0);
      expect(v3).toBeLessThanOrEqual(1);
    }
    expect(low).toBeGreaterThanOrEqual(-1);
    expect(high).toBeLessThanOrEqual(1);
    expect(rollerNoise2(3, 5, 2)).toBeCloseTo(2 * (pcg3d(3, 5, 2)[0] / 4294967296) - 1, 12);
  });

  it('wander the toe by 1–2 d′max (Wang, Leng & Chanson 2017), never past the cull\'s four spreads', () => {
    const roughness = 0.3;
    let sum = 0;
    let squares = 0;
    let widest = 0;
    let count = 0;
    for (let i = 0; i < 400; i += 1) {
      for (let j = 0; j < 100; j += 1) {
        const offset = toeOffset(i * 0.73, j * 0.91, 1.5, roughness);
        sum += offset;
        squares += offset * offset;
        widest = Math.max(widest, Math.abs(offset));
        count += 1;
      }
    }
    const mean = sum / count;
    const spread = Math.sqrt(squares / count - mean * mean) / roughness;
    expect(spread).toBeGreaterThan(1);
    expect(spread).toBeLessThan(2);
    // Each octave is at most 1 in size, so the offset can't pass 2·1.5/0.63 d′max ≈ 4.8 d′max: inside the 6 d′max cull.
    expect(widest / roughness).toBeLessThan(4 * ROLLER_LOOK.toeAmplitude);
  });
});

describe('the roller band (rollerLookAt)', () => {
  const look = createRollerLook();

  it('covers fully from the crest to mid-lens at full scale, and nothing past the toe or behind the rear taper', () => {
    const rows = table(4, steady({ crest: 10, length: 8, scale: 1 }));
    for (let x = 0; x <= 3; x += 0.25) {
      for (let xi = 0; xi <= 0.5; xi += 0.05) {
        expect(rollerLookAt(rows, 4, 0, 1, x, 10 + xi * 8, 7, look).cover).toBeCloseTo(1, 12);
      }
      expect(rollerLookAt(rows, 4, 0, 1, x, 10 + 1.01 * 8, 7, look).cover).toBe(0);
      expect(rollerLookAt(rows, 4, 0, 1, x, 10 - 0.31 * 8, 7, look).cover).toBe(0);
      expect(rollerLookAt(rows, 4, 0, 1, x, 10 - 0.15 * 8, 7, look).cover).toBeCloseTo(0.5, 12);
    }
  });

  it('scales its coverage with the lens\'s development g', () => {
    const rows = table(4, steady({ crest: 10, length: 8, scale: 0.4 }));
    expect(rollerLookAt(rows, 4, 0, 1, 1.5, 12, 0, look).cover).toBeCloseTo(0.4, 12);
  });

  it('fingers the toe: past ξ = 1 some points along the crest are covered and others not, and the cull holds them all', () => {
    const roughness = 0.3;
    const columns = 64;
    const rows = table(columns, Array.from({ length: columns }, () => ({ crest: 10, length: 8, scale: 1, roughness })));
    let covered = 0;
    let bare = 0;
    for (let x = 0; x <= columns - 1; x += 0.1) {
      for (const time of [0, 3.3, 9.1]) {
        const past = rollerLookAt(rows, columns, 0, 1, x, 10 + 8 + 0.5 * roughness, time, look).cover;
        if (past > 0) covered += 1;
        else bare += 1;
        // The offset can't reach 4.8 d′max past the toe (each octave is at most 1).
        expect(rollerLookAt(rows, columns, 0, 1, x, 10 + 8 + 4.8 * roughness, time, look).cover).toBe(0);
      }
    }
    expect(covered).toBeGreaterThan(0);
    expect(bare).toBeGreaterThan(0);
  });

  it('opens holes only in the toe half', () => {
    const columns = 64;
    const rows = table(columns, Array.from({ length: columns }, () => ({ crest: 10, length: 8, scale: 1 })));
    let holed = 0;
    for (let x = 0; x <= columns - 1; x += 0.1) {
      expect(rollerLookAt(rows, columns, 0, 1, x, 10 + 0.5 * 8, 2, look).cover).toBeCloseTo(1, 12);
      if (rollerLookAt(rows, columns, 0, 1, x, 10 + 0.7 * 8, 2, look).cover < 0.99) holed += 1;
    }
    expect(holed).toBeGreaterThan(0);
  });

  it('is brightest at the crest and falls linearly to 0.40/0.55 of it at the toe (Dierssen 2019)', () => {
    expect(ROLLER_LOOK.toeBright).toBeCloseTo(0.727, 3);
    const rows = table(4, steady({ crest: 10, length: 8, scale: 1, roughness: 0.5 }));
    expect(rollerLookAt(rows, 4, 0, 1, 1, 10, 0, look).bright).toBe(1);
    expect(rollerLookAt(rows, 4, 0, 1, 1, 9, 0, look).bright).toBe(1);
    expect(rollerLookAt(rows, 4, 0, 1, 1, 14, 0, look).bright).toBeCloseTo(1 - (1 - ROLLER_LOOK.toeBright) * 0.5, 12);
    let reached = false;
    for (let x = 0; x <= 3; x += 0.05) {
      const at = rollerLookAt(rows, 4, 0, 1, x, 10 + 8 * 1.05, 0, look);
      if (at.cover > 0) {
        expect(at.bright).toBeCloseTo(ROLLER_LOOK.toeBright, 12);
        reached = true;
      }
    }
    expect(reached).toBe(true);
  });

  it('reads an empty neighbour as no scale with the live column\'s geometry', () => {
    const rows = table(4, [{ crest: 10, length: 8, scale: 1, flowX: 2, flowZ: 5 }, null, null, null]);
    const at = rollerLookAt(rows, 4, 0, 1, 0.5, 12, 0, look);
    expect(at.cover).toBeCloseTo(0.5, 12);
    expect(at.presence).toBeCloseTo(0.5, 12);
    expect(at.flowX).toBe(2);
    expect(at.flowZ).toBe(5);
    expect(rollerLookAt(rows, 4, 0, 1, 1.5, 12, 0, look).cover).toBe(0);
  });

  it('keeps the most covering slot where two lenses overlap', () => {
    const rows = table(4, steady({ crest: 10, length: 8, scale: 0.3, flowZ: 1 }), steady({ crest: 11, length: 8, scale: 0.9, flowZ: 4 }));
    const at = rollerLookAt(rows, 4, 0, 1, 1.5, 12, 0, look);
    expect(at.cover).toBeCloseTo(0.9, 12);
    expect(at.flowZ).toBe(4);
  });

  it('leaves outside the columns', () => {
    const rows = table(4, steady({ crest: 10, length: 8, scale: 1 }));
    expect(rollerLookAt(rows, 4, 0, 1, -0.01, 12, 0, look).cover).toBe(0);
    expect(rollerLookAt(rows, 4, 0, 1, 3.01, 12, 0, look).cover).toBe(0);
  });
});

describe('waterRollerPars (the GLSL twin)', () => {
  it('reads the 2·columns × 2 table texel by texel, both halves of each column', () => {
    expect(waterRollerPars).toContain('uniform highp sampler2D waterRoller;');
    expect(waterRollerPars).toContain('texelFetch( waterRoller, ivec2( c0, slot ), 0 )');
    expect(waterRollerPars).toContain('texelFetch( waterRoller, ivec2( c0 + 3, slot ), 0 )');
    expect(waterRollerPars).toContain('void waterRollerAt( vec2 xz, float time )');
    expect(waterRollerPars).toContain('if ( xz.y < waterRollerExtent.x || xz.y > waterRollerExtent.y ) return;');
  });

  it('hashes with pcg3d\'s constants and carries the look\'s numbers', () => {
    expect(waterRollerPars).toContain('v = v * 1664525u + 1013904223u;');
    expect(waterRollerPars).toContain(`/ ${ROLLER_LOOK.toeNoiseSpread};`);
    expect(waterRollerPars).toContain(`1.0 - ( 1.0 - ${ROLLER_LOOK.toeBright} ) * min( 1.0, xi )`);
    expect(waterRollerPars).toContain(`band = 1.0 - smoothstep( ${ROLLER_LOOK.edge}, 1.0, toe );`);
    expect(waterRollerPars).toContain(`band = smoothstep( -${ROLLER_LOOK.rear}, 0.0, xi );`);
    // No smoothstep with its edges reversed (undefined in GLSL).
    for (const call of waterRollerPars.matchAll(/smoothstep\( (-?[\d.]+), (-?[\d.]+),/g)) {
      expect(Number(call[1])).toBeLessThan(Number(call[2]));
    }
  });
});
