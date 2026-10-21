import { describe, expect, it } from 'vitest';
import {
  GLOW, PREIMAGE_TABLE_SIZE, agx, glowSamples, agxDecode, agxEncodedPreimage, agxPreimage, agxPreimageRing, agxPreimageTable, agxSigmoid, bloomSizes,
  glowMemory, glslMat3, linearToSrgb, neutral, photoBackgroundMemory, softThreshold, srgbToLinear, type Rgb,
} from './glowMath';

const grey = (v: number): Rgb => [v, v, v];
const hex = (value: string): Rgb => [1, 3, 5].map((i) => srgbToLinear(parseInt(value.slice(i, i + 2), 16) / 255)) as unknown as Rgb;
const luma = (c: Rgb) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

describe('the colour grade (AgX)', () => {
  it("matches three's AgXToneMapping with no look (power and saturation 1)", () => {
    // three 0.186's GLSL at exposure 1, evaluated by hand for middle grey and a bright red.
    expect(agx(grey(0.18), 1, 1, 1)[1]).toBeCloseTo(0.21450, 4);
    const red = agx([4, 0.2, 0.05], 1, 1, 1);
    expect(red[0]).toBe(1);
    expect(red[1]).toBeCloseTo(0.44213, 4);
    expect(red[2]).toBeCloseTo(0.31182, 4);
  });

  it('rises monotonically from black to white, and its sigmoid does on [0, 1]', () => {
    let previous = -Infinity;
    for (let x = 0; x <= 1; x += 0.001) {
      expect(agxSigmoid(x)).toBeGreaterThanOrEqual(previous);
      previous = agxSigmoid(x);
    }
    let last = -1;
    // Strictly from where the look's toe leaves black to the top of AgX's range (16 / exposure), flat outside.
    for (let v = 1e-3; v < 100; v *= 1.2) {
      const out = luma(agx(grey(v)));
      if (v > 5e-3 && v < 6) expect(out).toBeGreaterThan(last);
      else expect(out).toBeGreaterThanOrEqual(last);
      last = out;
    }
    expect(luma(agx(grey(1e4)))).toBeGreaterThan(0.98);
  });

  it("keeps the mid-tones near Neutral's, and rolls the brights off later", () => {
    const encoded = (c: Rgb) => 255 * linearToSrgb(luma(c));
    // The exposure matches the midday frames' mean: the water's and the sky's tones land within 15 of 255 of today's.
    for (const v of [0.05, 0.1, 0.18, 0.3, 0.5]) expect(Math.abs(encoded(agx(grey(v))) - encoded(neutral(grey(v))))).toBeLessThan(15);
    // Above white Neutral has clipped; AgX still separates 2 from 8.
    expect(encoded(neutral(grey(8))) - encoded(neutral(grey(2)))).toBeLessThan(4);
    expect(encoded(agx(grey(8))) - encoded(agx(grey(2)))).toBeGreaterThan(15);
  });

  it('runs backwards: the preimage of a display colour grades back to it', () => {
    for (const colour of ['#367e83', '#808080', '#b8e3e5', '#20402a', '#c08060']) {
      const display = hex(colour);
      const scene = agxPreimage(display);
      agx(scene).forEach((c, i) => expect(c).toBeCloseTo(display[i], 4));
    }
    // A different exposure and look too.
    const display = hex('#367e83');
    agx(agxPreimage(display, 1, 1.2, 1.1), 1, 1.2, 1.1).forEach((c, i) => expect(c).toBeCloseTo(display[i], 4));
  });
});

/** The table sampled as the GPU does, trilinearly, at an sRGB-encoded colour (texel centres at 0 and 1). */
function sampleTable(table: Float32Array, size: number, srgb: Rgb): Rgb {
  const at = srgb.map((c) => Math.min(size - 1 - 1e-9, Math.max(0, c * (size - 1))));
  const base = at.map(Math.floor);
  const t = at.map((c, k) => c - base[k]);
  const out = [0, 0, 0];
  for (let corner = 0; corner < 8; corner += 1) {
    const step = [corner & 1, (corner >> 1) & 1, (corner >> 2) & 1];
    const weight = step.reduce((w, s, k) => w * (s ? t[k] : 1 - t[k]), 1);
    const index = 4 * ((base[0] + step[0]) + size * ((base[1] + step[1]) + size * (base[2] + step[2])));
    for (let c = 0; c < 3; c += 1) out[c] += weight * table[index + c];
  }
  return out as unknown as Rgb;
}

const bytes = (rgb: readonly number[]): Rgb => rgb.map((c) => c / 255) as unknown as Rgb;

describe('the sky under the grade (PhotoBackground)', () => {
  it('splits the preimage into its log encoding and the decode', () => {
    const display = hex('#c08060');
    const scene = agxDecode(agxEncodedPreimage(display));
    agxPreimage(display).forEach((c, i) => expect(scene[i]).toBeCloseTo(c, 10));
  });

  it("keeps a saturated sunset yellow, whose preimage is negative in blue", () => {
    const yellow = bytes([255, 240, 100]).map(srgbToLinear) as unknown as Rgb;
    const scene = agxPreimage(yellow);
    expect(scene[2]).toBeLessThan(-0.3);
    agx(scene).forEach((c, i) => expect(c).toBeCloseTo(yellow[i], 4));
    // Clamped to black, the yellow would grade 70 steps of 255 paler in blue.
    const clamped = agx(scene.map((c) => Math.max(0, c)) as unknown as Rgb);
    expect(255 * (linearToSrgb(clamped[2]) - linearToSrgb(yellow[2]))).toBeGreaterThan(60);
  });

  it('looks the sky photos\' colours up within a step of 255', () => {
    const table = agxPreimageTable();
    expect(table).toHaveLength(4 * PREIMAGE_TABLE_SIZE ** 3);
    // Dawn, midday and sunset colours from the photos, between the table's texels: blues, oranges, yellows, greys, clouds.
    const colours = [[60, 74, 111], [118, 152, 204], [214, 160, 140], [255, 160, 80], [250, 120, 40], [255, 240, 100], [255, 228, 187],
      [181, 190, 205], [233, 236, 240], [42, 60, 98], [200, 120, 150], [255, 253, 255]];
    const miss = (colour: number[]) => {
      const shown = agx(agxDecode(sampleTable(table, PREIMAGE_TABLE_SIZE, bytes(colour))));
      return Math.max(...shown.map((c, i) => Math.abs(255 * linearToSrgb(c) - colour[i])));
    };
    for (const colour of colours) expect(miss(colour)).toBeLessThan(1);
    // Next to black the table's first texels are coarse (the photos have no such sky): within three steps.
    expect(miss([3, 4, 9])).toBeLessThan(3);
  });

  it('builds the table at its grid: black at the first texel, white (AgX\'s brightest) at the last', () => {
    const size = 5;
    const table = agxPreimageTable(size);
    const last = 4 * (size ** 3 - 1);
    expect([...table.slice(0, 4)]).toEqual([...agxEncodedPreimage([0, 0, 0]), 1].map((v) => expect.closeTo(v, 6)));
    expect([...table.slice(last, last + 4)]).toEqual([...agxEncodedPreimage([1, 1, 1]), 1].map((v) => expect.closeTo(v, 6)));
    // Red runs fastest.
    expect([...table.slice(4, 7)]).toEqual([...agxEncodedPreimage([srgbToLinear(0.25), 0, 0])].map((v) => expect.closeTo(v, 6)));
  });

  it("turns the haze's ring of horizon colours into their preimages, triple by triple", () => {
    const ring = new Float32Array([...hex('#b8e3e5'), ...hex('#c08060')]);
    const out = agxPreimageRing(ring);
    expect(out).toHaveLength(6);
    agx([out[3], out[4], out[5]]).forEach((c, i) => expect(c).toBeCloseTo(ring[3 + i], 4));
  });

  it('costs three 235 MB for a 4096 × 2048 photo as a cube map, which the glow never makes', () => {
    const memory = photoBackgroundMemory(4096, 2048);
    expect(memory.photo / 2 ** 20).toBeCloseTo(42.7, 1);
    expect((memory.cube + memory.cubeDepth) / 1e6).toBeCloseTo(234.9, 1);
  });
});

describe('the bloom', () => {
  it('takes nothing below the knee, everything above the threshold less it, and joins the two smoothly', () => {
    const { threshold: t, knee: k } = GLOW;
    expect(softThreshold(t - k - 0.01)).toBe(0);
    expect(softThreshold(0.3)).toBe(0);
    expect(softThreshold(t + k + 1) * (t + k + 1)).toBeCloseTo(k + 1, 5);
    // Continuous where the quadratic hands over to the line, and rising throughout.
    expect(softThreshold(t + k - 1e-6) * (t + k)).toBeCloseTo(softThreshold(t + k + 1e-6) * (t + k), 4);
    let previous = 0;
    for (let b = 0; b < 10; b += 0.01) {
      const taken = softThreshold(b) * b;
      expect(taken).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = taken;
    }
  });

  it('halves the drawing buffer five times, never to nothing', () => {
    expect(bloomSizes(1280, 800)).toEqual([
      { width: 640, height: 400 }, { width: 320, height: 200 }, { width: 160, height: 100 }, { width: 80, height: 50 }, { width: 40, height: 25 },
    ]);
    expect(bloomSizes(20, 10).at(-1)).toEqual({ width: 1, height: 1 });
  });

  it('adds about 39 bytes a pixel at the default 2× MSAA, most of it the multisampled HDR scene; 63 at 4×', () => {
    const at1280 = glowMemory(1280, 800);
    expect(at1280.sceneSamples).toBe(1280 * 800 * 2 * 12);
    expect(at1280.sceneResolve).toBe(1280 * 800 * 12);
    expect(at1280.bloom).toBe((640 * 400 + 320 * 200 + 160 * 100 + 80 * 50 + 40 * 25) * 8);
    expect(at1280.total / (1280 * 800)).toBeCloseTo(38.7, 1);
    expect(glowMemory(1280, 800, 4).total / (1280 * 800)).toBeCloseTo(62.7, 1);
    expect(glowMemory(2048, 1280).total).toBe(2048 * 1280 * 36 + (1024 * 640 + 512 * 320 + 256 * 160 + 128 * 80 + 64 * 40) * 8);
  });

  it('runs the HDR scene at 2× MSAA unless the dev switch asks for 4×', () => {
    expect(GLOW.samples).toBe(2);
    expect(glowSamples(null)).toBe(2);
    expect(glowSamples('2')).toBe(2);
    expect(glowSamples('4')).toBe(4);
    expect(glowSamples('8')).toBe(2);
  });

  it('writes matrices for GLSL column by column', () => {
    expect(glslMat3([[1, 0, 0], [0, 1, 0], [0.5, 0, 1]])).toBe('mat3( vec3( 1.0, 0.0, 0.0 ), vec3( 0.0, 1.0, 0.0 ), vec3( 0.5, 0.0, 1.0 ) )');
  });
});
