import { describe, expect, it } from 'vitest';
import { GLOW, agx, agxPreimage, agxSigmoid, bloomSizes, glowMemory, glslMat3, linearToSrgb, neutral, softThreshold, srgbToLinear, type Rgb } from './glowMath';

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

  it('adds about 60 bytes a pixel, nearly all of it the multisampled HDR scene', () => {
    const at1280 = glowMemory(1280, 800);
    expect(at1280.sceneSamples).toBe(1280 * 800 * 4 * 12);
    expect(at1280.sceneResolve).toBe(1280 * 800 * 12);
    expect(at1280.bloom).toBe((640 * 400 + 320 * 200 + 160 * 100 + 80 * 50 + 40 * 25) * 8);
    expect(at1280.total / (1280 * 800)).toBeCloseTo(62.7, 1);
    expect(glowMemory(2048, 1280).total).toBe(2048 * 1280 * 60 + (1024 * 640 + 512 * 320 + 256 * 160 + 128 * 80 + 64 * 40) * 8);
  });

  it('writes matrices for GLSL column by column', () => {
    expect(glslMat3([[1, 0, 0], [0, 1, 0], [0.5, 0, 1]])).toBe('mat3( vec3( 1.0, 0.0, 0.0 ), vec3( 0.0, 1.0, 0.0 ), vec3( 0.5, 0.0, 1.0 ) )');
  });
});
