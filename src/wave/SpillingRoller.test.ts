import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SpillingFront, type SpillingFrontOptions } from './SpillingFront';
import {
  ROLLER_DEFAULTS, ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE, SectionReader, SpillingRoller, alongCrest, createLensPoint,
  createSection, crestThickness, development, lensThickness, rollerLength, stageSlope, type RollerGrid, type RollerOptions,
} from './SpillingRoller';

/**
 * The test bore: η = A/2·(1 − tanh u) + s·(z − z_f), u = (z − z_f)/w, falling toward the beach (+z). Its back rises
 * at s toward the crest, so it has a crest behind the front and a trough ahead of it. With A 2 m, w 1.5 m and s 0.05
 * it is a resolved, developed bore: H 1.63 m, crest to toe 4.9 m (3.0 H), the 1 m grid's crest within 0.2 m.
 */
interface Bore { amplitude: number; width: number; back: number }
const BORE: Bore = { amplitude: 2, width: 1.5, back: 0.05 };

function boreEta(z: number, front: number, bore = BORE): number {
  const u = (z - front) / bore.width;
  return 0.5 * bore.amplitude * (1 - Math.tanh(u)) + bore.back * (z - front);
}

/** The bore's crest, trough and toe (−∂η/∂z at 0.2 of its peak, past the steepest point) from its front, m, and H. */
function boreShape(bore = BORE) {
  const { amplitude: a, width: w, back: s } = bore;
  const u = Math.acosh(1 / Math.sqrt((2 * w * s) / a));
  const peak = a / (2 * w) - s;
  const toe = Math.acosh(1 / Math.sqrt(((0.2 * peak + s) * 2 * w) / a)) * w;
  const crestLevel = boreEta(-u * w, 0, bore);
  const troughLevel = boreEta(u * w, 0, bore);
  return { crest: -u * w, trough: u * w, toe, crestLevel, troughLevel, height: crestLevel - troughLevel };
}

/** Still depth under which the bore's crest depth is r times its trough depth (h₂/h₁ = r). */
function depthFor(r: number, bore = BORE): number {
  const { crestLevel, troughLevel } = boreShape(bore);
  return (crestLevel - r * troughLevel) / (r - 1);
}

interface Sea extends RollerGrid { readonly h: Float64Array; readonly bed: Float64Array }

/** A 1 m grid: `nx` columns centred on x = 0, rows from zMin to zMax (+z toward the beach). */
function sea(nx: number, zMin: number, zMax: number): Sea {
  const nz = Math.round(zMax - zMin) + 1;
  return {
    nx, nz, dx: 1, restLevel: 0,
    xCenters: Float64Array.from({ length: nx }, (_, i) => i - (nx - 1) / 2),
    zCenters: Float64Array.from({ length: nz }, (_, i) => zMin + i),
    h: new Float64Array(nx * nz), bed: new Float64Array(nx * nz),
  };
}

/** Each column's bore over a flat bed `depth` below still water; the water is the bore's η over it. */
function writeBore(g: Sea, frontAt: (column: number) => number, depth: number, bore = BORE): void {
  for (let iz = 0; iz < g.nz; iz += 1) {
    for (let ix = 0; ix < g.nx; ix += 1) {
      const i = iz * g.nx + ix;
      g.bed[i] = -depth;
      g.h[i] = Math.max(0, boreEta(g.zCenters[iz], frontAt(ix), bore) + depth);
    }
  }
}

/** The solver's breaking: `value` on the face, from the crest to the toe, none elsewhere. */
function writeStrength(g: Sea, strength: Float64Array, frontAt: (column: number) => number, value = 1, bore = BORE): void {
  const shape = boreShape(bore);
  for (let iz = 0; iz < g.nz; iz += 1) {
    for (let ix = 0; ix < g.nx; ix += 1) {
      const z = g.zCenters[iz] - frontAt(ix);
      strength[iz * g.nx + ix] = z >= shape.crest - 0.5 && z <= shape.toe + 0.5 ? value : 0;
    }
  }
}

interface RunOptions {
  nx?: number;
  zMin?: number;
  zMax?: number;
  /** The bore's speed toward the beach, m/s, and where its front starts, z. */
  speed?: number;
  start?: number;
  /** The still depth, m (sets h₂/h₁; see depthFor). */
  depth?: number;
  /** The breaker depth h_b the roller grows over, m. */
  breakerDepth?: number;
  roller?: Partial<RollerOptions>;
  front?: Partial<SpillingFrontOptions>;
  /** Columns' onsets in this order (the first is the wave's peak); all columns, left to right, by default. */
  onsetOrder?: number[];
  /** Extra offset of each column's front from the start, onsets included, m. */
  skew?: (column: number) => number;
}

/** A straight bore running up the grid, its front's wave started across every column at t = 0, and the roller on it. */
class Run {
  readonly g: Sea;
  readonly front: SpillingFront;
  readonly roller: SpillingRoller;
  readonly strength: Float64Array;
  readonly whitewater: Float64Array;
  readonly options: Required<Omit<RunOptions, 'roller' | 'front' | 'onsetOrder' | 'skew'>>;
  time = 0;
  /** Extra offset of each column's front, m (an oblique crest). */
  skew = (_column: number) => 0;
  strengthValue = 1;

  constructor(options: RunOptions = {}) {
    this.options = { nx: 21, zMin: -40, zMax: 40, speed: 4, start: -20, depth: depthFor(2), breakerDepth: 1, ...options };
    const { nx, zMin, zMax } = this.options;
    this.g = sea(nx, zMin, zMax);
    this.front = new SpillingFront(this.g, { peelAngleDegrees: 90, ...options.front });
    this.roller = new SpillingRoller(this.g, { edgeColumns: 0, ...options.roller });
    this.strength = new Float64Array(this.g.nx * this.g.nz);
    this.whitewater = new Float64Array(this.g.nx * this.g.nz);
    const order = options.onsetOrder ?? Array.from({ length: nx }, (_, i) => i);
    if (options.skew) this.skew = options.skew;
    this.write();
    for (const column of order) this.front.observeOnset(column, 0, this.frontAt(column) + boreShape().crest);
  }

  frontAt = (column: number) => this.options.start + this.options.speed * this.time + this.skew(column);

  write(): void {
    writeBore(this.g, this.frontAt, this.options.depth);
    writeStrength(this.g, this.strength, this.frontAt, this.strengthValue);
  }

  step(dt = 1 / 60): void {
    this.time += dt;
    this.write();
    this.front.update(this.time, dt, Math.max(0.1, this.options.speed), this.strength, this.whitewater);
    this.roller.update(this.time, dt, this.front, this.strength, this.options.breakerDepth);
  }

  steps(seconds: number, dt = 1 / 60): void {
    const count = Math.round(seconds / dt);
    for (let n = 0; n < count; n += 1) this.step(dt);
  }

  /** The table's value `field` for `column` and `slot`. */
  entry(column: number, slot: number, field: number): number {
    return this.roller.table[(slot * this.g.nx + column) * ROLLER_STRIDE + field];
  }
}

describe('SpillingRoller: the section', () => {
  it('finds the crest and trough within 0.25 m, the toe within 0.5 m and H within 1 %, seeded or tracked', () => {
    const shape = boreShape();
    expect(shape.height).toBeCloseTo(1.628, 3);
    expect((shape.toe - shape.crest) / shape.height).toBeCloseTo(3.0, 1);
    const reader = new SectionReader();
    const out = createSection();
    const strength = new Float64Array(0);
    for (let offset = 0; offset < 1; offset += 0.1) {
      const g = sea(5, -30, 30);
      const front = 0.3 + offset;
      const depth = depthFor(2);
      writeBore(g, () => front, depth);
      const field = new Float64Array(g.nx * g.nz);
      writeStrength(g, field, () => front, 0.8);
      for (const mode of ['seed', 'track'] as const) {
        // A seed starts from a breaking cell on the face; a tracked crest from where it should be, 0.7 m off.
        const from = mode === 'seed' ? front + shape.crest + 1.5 : front + shape.crest + 0.7;
        expect(reader.read(g, 2, from, mode, 12, 12, 2, field, out)).toBe(true);
        expect(Math.abs(out.crest - (front + shape.crest))).toBeLessThan(0.25);
        expect(Math.abs(out.trough - (front + shape.trough))).toBeLessThan(0.25);
        expect(Math.abs(out.toe - (front + shape.toe))).toBeLessThan(0.5);
        expect(Math.abs(out.height / shape.height - 1)).toBeLessThan(0.01);
        // h₂/h₁ = 2: F = r(r + 1)/2 = 3, Fr₁ 1.73.
        expect(out.crestDepth / out.troughDepth).toBeCloseTo(2, 1);
        expect(out.froude2).toBeCloseTo(3, 0);
        expect(out.strength).toBe(0.8);
        expect(out.dryToe).toBe(false);
      }
    }
    // A tracked crest more than its window away is lost; so is a flat sea.
    const g = sea(5, -30, 30);
    writeBore(g, () => 0, depthFor(2));
    expect(reader.read(g, 2, shape.crest + 2.6, 'track', 12, 12, 2, strength, out)).toBe(false);
    g.h.fill(3);
    expect(reader.read(g, 2, 0, 'seed', 12, 12, 2, strength, out)).toBe(false);
  });
});

describe('SpillingRoller: its life', () => {
  it('is born at h₂/h₁ = 2 (Fr₁ 1.73) where the solver breaks, and not without breaking', () => {
    const run = new Run({ depth: depthFor(2) });
    run.step();
    expect(run.roller.counts.born).toBe(run.g.nx);
    const lens = run.roller.lens(10, 0)!;
    expect(lens.state).toBe('active');
    expect(lens.wave).toBe(0);
    expect(lens.g).toBe(0);
    expect(Math.abs(lens.crest - (run.frontAt(10) + boreShape().crest))).toBeLessThan(0.25);
    const dry = new Run({ depth: depthFor(2) });
    dry.strengthValue = 0.29;
    dry.steps(0.5);
    expect(dry.roller.counts.born).toBe(0);
  });

  it('is not born at h₂/h₁ = 1.5 (Fr₁ 1.37), but a lens already born stays', () => {
    const weak = new Run({ depth: depthFor(1.5) });
    weak.steps(2);
    expect(weak.roller.counts.born).toBe(0);
    expect(weak.roller.counts.disagree).toBeGreaterThan(0);
    const run = new Run({ depth: depthFor(2) });
    run.steps(0.5);
    run.options.depth = depthFor(1.5);
    run.steps(2);
    expect(run.roller.lens(10, 0)!.state).toBe('active');
    expect(run.roller.counts.shed).toBe(0);
  });

  it('sheds at h₂/h₁ = 1.35 (Fr₁ 1.26) after 0.2 s of it, not before, and is gone once its lens has faded', () => {
    const run = new Run({ depth: depthFor(2) });
    const sheddings: { froude2: number; strength: number; reason: string }[] = [];
    run.roller.onShed = (event) => sheddings.push(event);
    run.steps(0.5);
    run.options.depth = depthFor(1.35);
    for (let n = 1; n <= 11; n += 1) run.step();
    expect(run.roller.lens(10, 0)!.state).toBe('active');
    run.step();
    expect(run.roller.lens(10, 0)!.state).toBe('shedding');
    expect(sheddings).toHaveLength(run.g.nx);
    expect(sheddings[0].reason).toBe('froude');
    expect(Math.sqrt(sheddings[0].froude2)).toBeCloseTo(1.26, 1);
    expect(sheddings[0].strength).toBe(1);
    // It fades with an e-folding time of t_c / w_b (about 1 s here) and is gone below g = 0.01.
    const g = run.roller.lens(10, 0)!.g;
    run.step();
    expect(run.roller.lens(10, 0)!.g).toBeLessThan(g);
    run.steps(8);
    expect(run.roller.lens(10, 0)).toBeUndefined();
  });

  it('is reborn where the bore breaks again, growing on from the scale it kept', () => {
    const run = new Run({ depth: depthFor(2) });
    run.steps(0.7);
    run.options.depth = depthFor(1.35);
    run.steps(0.5);
    const shedding = run.roller.lens(10, 0)!;
    expect(shedding.state).toBe('shedding');
    run.options.depth = depthFor(2);
    run.step();
    const reborn = run.roller.lens(10, 0)!;
    expect(reborn.state).toBe('active');
    expect(Math.abs(reborn.g - shedding.g)).toBeLessThan(0.05);
  });

  it('grows over 6.5 breaker depths of travel, and tracks the crest at its speed', () => {
    const run = new Run({ depth: depthFor(2), speed: 5, breakerDepth: 1 });
    run.steps(0.5);
    const early = run.roller.lens(10, 0)!;
    expect(early.g).toBeCloseTo(early.travel / 6.5, 9);
    run.steps(1.5);
    const lens = run.roller.lens(10, 0)!;
    expect(lens.travel).toBeGreaterThan(6.5);
    expect(lens.g).toBe(1);
    // The crest speed, relaxed over 0.3 s from √(g h_b) = 3.1 m/s, is the bore's: the parabola's crest wobbles a few
    // centimetres as the bore crosses the rows, so the relaxed speed swings about ±6 % (measured).
    expect(lens.c).toBeGreaterThan(4.5);
    expect(lens.c).toBeLessThan(5.5);
    expect(Math.abs(lens.crest - (run.frontAt(10) + boreShape().crest))).toBeLessThan(0.25);
  });
});

describe('SpillingRoller: its shape', () => {
  const H = 1.5;

  it('holds 0.345 H² of water at g = 1, for lengths from 2.1 to 3.5 H', () => {
    for (const ratio of [2.1, 2.5, 2.99, 3.5]) {
      const length = ratio * H;
      const tc = crestThickness(H, length, ROLLER_DEFAULTS);
      const steps = 20000;
      let water = 0;
      for (let k = 0; k < steps; k += 1) water += lensThickness((k + 0.5) / steps, tc, 1, ROLLER_DEFAULTS.rearTaper) * (length / steps);
      water *= 1 - ROLLER_DEFAULTS.voidMean;
      expect(Math.abs(water / (0.345 * H * H) - 1)).toBeLessThan(0.01);
    }
  });

  it('is 0.273 H thick at the crest when born and 0.196 H developed', () => {
    const born = rollerLength(0, H, 0, ROLLER_DEFAULTS);
    const developed = rollerLength(0, H, 1, ROLLER_DEFAULTS);
    expect(Math.abs(crestThickness(H, born, ROLLER_DEFAULTS) / (0.273 * H) - 1)).toBeLessThan(0.01);
    expect(Math.abs(crestThickness(H, developed, ROLLER_DEFAULTS) / (0.196 * H) - 1)).toBeLessThan(0.01);
  });

  it('with no measured length, runs from 2.14 H to 2.99 H over 6.5 breaker depths of travel', () => {
    const hb = 2.2;
    expect(development(0, hb, ROLLER_DEFAULTS)).toBe(0);
    expect(development(6.5 * hb, hb, ROLLER_DEFAULTS)).toBe(1);
    expect(development(13 * hb, hb, ROLLER_DEFAULTS)).toBe(1);
    expect(rollerLength(0, H, development(0, hb, ROLLER_DEFAULTS), ROLLER_DEFAULTS) / H).toBeCloseTo(2.14, 2);
    expect(rollerLength(0, H, development(6.5 * hb, hb, ROLLER_DEFAULTS), ROLLER_DEFAULTS) / H).toBeCloseTo(2.99, 2);
    expect(stageSlope(0.5, ROLLER_DEFAULTS)).toBeCloseTo((0.4663 + 0.3346) / 2, 12);
    // A measured length of 4 m or more is taken whole (Bacigaluppi's guard), and blended below it.
    expect(rollerLength(5, H, 0, ROLLER_DEFAULTS)).toBe(5);
    expect(rollerLength(2, H, 1, ROLLER_DEFAULTS)).toBeCloseTo(0.5 * 2 + 0.5 * (H / 0.3346), 9);
  });

  it('tapers as a quarter ellipse to the toe and behind the crest over 0.3 of its length', () => {
    expect(lensThickness(0, 0.4, 1, 0.3)).toBe(0.4);
    expect(lensThickness(0.6, 0.4, 0.5, 0.3)).toBeCloseTo(0.2 * 0.8, 12);
    expect(lensThickness(1, 0.4, 1, 0.3)).toBe(0);
    expect(lensThickness(-0.15, 0.4, 1, 0.3)).toBeCloseTo(0.4 * 0.75, 12);
    expect(lensThickness(-0.3, 0.4, 1, 0.3)).toBe(0);
    expect(lensThickness(1.01, 0.4, 1, 0.3)).toBe(0);
    expect(lensThickness(-0.31, 0.4, 1, 0.3)).toBe(0);
  });

  it('raises the top at the crest by the lens\'s air, 0.068 H when born and 0.049 H developed, at g = 1', () => {
    for (const [phi, rise] of [[0, 0.068], [1, 0.049]] as const) {
      const g = sea(9, -20, 20);
      g.h.fill(10);
      g.bed.fill(-10);
      const roller = new SpillingRoller(g, { edgeColumns: 0 });
      const length = rollerLength(0, H, phi, ROLLER_DEFAULTS);
      for (let column = 0; column < g.nx; column += 1) {
        const o = column * ROLLER_STRIDE;
        roller.table[o + ROLLER_FIELD.crest] = 0;
        roller.table[o + ROLLER_FIELD.length] = length;
        roller.table[o + ROLLER_FIELD.scale] = 1;
        roller.table[o + ROLLER_FIELD.thickness] = crestThickness(H, length, ROLLER_DEFAULTS);
      }
      expect(roller.riseAt(0.3, 0) / H).toBeCloseTo(rise, 3);
      const lens = createLensPoint();
      expect(roller.lensAt(0.3, 0, lens)).toBe(true);
      expect(lens.rise).toBe(roller.riseAt(0.3, 0));
      expect(lens.rise).toBeCloseTo(0.25 * lens.thickness, 12);
      expect(roller.riseAt(0.3, length + 0.01)).toBe(0);
      expect(roller.lensAt(0.3, -0.31 * length, lens)).toBe(false);
      // Every lens lies within the table's reach across shore.
      const extent = roller.extentZ({ low: 0, high: 0 });
      expect(extent.low).toBeCloseTo(-0.3 * length, 12);
      expect(extent.high).toBeCloseTo(length, 12);
    }
  });
});

describe('SpillingRoller: along the crest', () => {
  const nx = 30;
  /** One slot's entries: runs of wave 5 at g = 1 over the given columns. */
  function slot(columns: number[], wave = 5): { entries: Float64Array; waves: Int32Array } {
    const entries = new Float64Array(nx * ROLLER_STRIDE);
    const waves = new Int32Array(nx).fill(-1);
    for (const column of columns) {
      waves[column] = wave;
      const o = column * ROLLER_STRIDE;
      entries[o + ROLLER_FIELD.crest] = 10 + 0.1 * column;
      entries[o + ROLLER_FIELD.length] = 4;
      entries[o + ROLLER_FIELD.scale] = 1;
      entries[o + ROLLER_FIELD.thickness] = 0.3;
    }
    return { entries, waves };
  }
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const scale = (entries: Float64Array, column: number) => entries[column * ROLLER_STRIDE + ROLLER_FIELD.scale];

  it('closes a 3 m gap between runs of a wave, but not a 5 m one', () => {
    const three = slot([...range(2, 11), ...range(15, 25)]);
    alongCrest(three.entries, 0, three.waves, nx, 1, ROLLER_DEFAULTS);
    for (const column of [12, 13, 14]) {
      expect(three.waves[column]).toBe(5);
      expect(scale(three.entries, column)).toBe(1);
      // The ends' values, interpolated.
      expect(three.entries[column * ROLLER_STRIDE + ROLLER_FIELD.crest]).toBeCloseTo(10 + 0.1 * column, 12);
    }
    const five = slot([...range(2, 11), ...range(17, 27)]);
    alongCrest(five.entries, 0, five.waves, nx, 1, ROLLER_DEFAULTS);
    for (const column of [12, 14, 16]) expect(scale(five.entries, column)).toBe(0);
    // Nor across another wave's run.
    const other = slot([...range(2, 11), ...range(15, 25)]);
    other.waves.fill(6, 15, 26);
    alongCrest(other.entries, 0, other.waves, nx, 1, ROLLER_DEFAULTS);
    expect(scale(other.entries, 13)).toBe(0);
  });

  it('closes no gap across a crest jump over crestJump: the runs are on different crests', () => {
    const jumped = slot([...range(2, 11), ...range(15, 25)]);
    for (const column of range(15, 25)) jumped.entries[column * ROLLER_STRIDE + ROLLER_FIELD.crest] += 60;
    alongCrest(jumped.entries, 0, jumped.waves, nx, 1, ROLLER_DEFAULTS);
    for (const column of [12, 13, 14]) {
      expect(jumped.waves[column]).toBe(-1);
      expect(scale(jumped.entries, column)).toBe(0);
    }
    // Within it, the gap closes as before.
    const near = slot([...range(2, 11), ...range(15, 25)]);
    for (const column of range(15, 25)) near.entries[column * ROLLER_STRIDE + ROLLER_FIELD.crest] += ROLLER_DEFAULTS.crestJump - 2;
    alongCrest(near.entries, 0, near.waves, nx, 1, ROLLER_DEFAULTS);
    for (const column of [12, 13, 14]) expect(near.waves[column]).toBe(5);
  });

  it('draws no run under 4 m', () => {
    const short = slot([...range(2, 4), ...range(10, 13)]);
    alongCrest(short.entries, 0, short.waves, nx, 1, ROLLER_DEFAULTS);
    for (const column of [2, 3, 4]) expect(scale(short.entries, column)).toBe(0);
    expect(scale(short.entries, 11)).toBeGreaterThan(0);
  });

  it('changes g by at most 0.2 per metre, reaching 1 within 5 m of a run\'s end', () => {
    const run = slot(range(3, 26));
    run.entries[14 * ROLLER_STRIDE + ROLLER_FIELD.scale] = 0.1;
    alongCrest(run.entries, 0, run.waves, nx, 1, ROLLER_DEFAULTS);
    for (let column = 1; column < nx; column += 1) {
      expect(Math.abs(scale(run.entries, column) - scale(run.entries, column - 1))).toBeLessThanOrEqual(0.2 + 1e-12);
    }
    expect(scale(run.entries, 3)).toBeCloseTo(0.2, 12);
    expect(scale(run.entries, 7)).toBe(1);
    expect(scale(run.entries, 22)).toBe(1);
    expect(scale(run.entries, 26)).toBeCloseTo(0.2, 12);
  });

  it('never lets two waves\' lenses touch in a slot: the older gives way at the seam', () => {
    const mixed = slot(range(2, 12), 5);
    for (const column of range(13, 25)) {
      mixed.waves[column] = 7;
      const o = column * ROLLER_STRIDE;
      mixed.entries[o + ROLLER_FIELD.crest] = -40;
      mixed.entries[o + ROLLER_FIELD.length] = 4;
      mixed.entries[o + ROLLER_FIELD.scale] = 1;
    }
    alongCrest(mixed.entries, 0, mixed.waves, nx, 1, ROLLER_DEFAULTS);
    expect(scale(mixed.entries, 12)).toBe(0);
    expect(mixed.waves[12]).toBe(-1);
    expect(scale(mixed.entries, 11)).toBeGreaterThan(0);
    expect(scale(mixed.entries, 13)).toBeGreaterThan(0);
  });
});

describe('SpillingRoller: the front\'s mask', () => {
  it('lives on ahead of the front without being drawn there; the solver\'s mask draws it', () => {
    // The front peels from x = −10 at 4 m/s; the solver breaks the whole crest at once.
    const front = new Run({ nx: 21, front: { peelAngleDegrees: 90 } });
    const solver = new Run({ nx: 21, front: { peelAngleDegrees: 90 }, roller: { mask: 'solver' } });
    front.steps(1);
    solver.steps(1);
    const frontX = front.front.waves[0].frontX;
    expect(frontX).toBeCloseTo(-10 + 4, 1);
    for (let column = 0; column < front.g.nx; column += 1) {
      const x = front.g.xCenters[column];
      expect(front.roller.lens(column, 0)).toBeDefined();
      if (x > frontX) {
        expect(front.entry(column, 0, ROLLER_FIELD.scale)).toBe(0);
        expect(front.roller.tableWave(column, 0)).toBe(-1);
      }
      if (column > 4 && column < 16) expect(solver.entry(column, 0, ROLLER_FIELD.scale)).toBeGreaterThan(0);
    }
    expect(front.roller.counts.masked).toBeGreaterThan(0);
    expect(solver.roller.counts.masked).toBe(0);
    // Behind the front: drawn.
    expect(front.entry(3, 0, ROLLER_FIELD.scale)).toBeGreaterThan(0);
  });

  it('grows the band down the face from S2\'s line: 1.5 m + 5 m/s·a long, its share 0.35 → 1 over 1.5 s', () => {
    // The wave's peak is the right-hand column, so the front reaches every column at once (all lie upstream of it; no
    // upcoast gate here).
    const nx = 21;
    const run = new Run({ nx, front: { upcoastMargin: Infinity }, onsetOrder: Array.from({ length: nx }, (_, i) => nx - 1 - i) });
    for (const a of [0.2, 0.5, 1.0, 1.4, 1.6]) {
      run.steps(a - run.time + 1 / 60);
      const age = run.time - run.front.waves[0].reached[10];
      const lens = run.roller.lens(10, 0)!;
      const share = age < 1.5 ? 0.35 + (0.65 * age) / 1.5 : 1;
      const length = age < 1.5 ? Math.min(lens.length, 1.5 + 5 * age) : lens.length;
      expect(run.entry(10, 0, ROLLER_FIELD.scale)).toBeCloseTo(lens.g * share, 9);
      expect(run.entry(10, 0, ROLLER_FIELD.length)).toBeCloseTo(length, 9);
    }
  });
});

describe('SpillingRoller: the review focus', () => {
  it('keeps drawing a lens whose wave the front has dropped (Review Focus 1)', () => {
    // The wave peaks at the right-hand column, so its front reaches every column at once (no upcoast gate here); it is
    // dropped at 2.5 s.
    const run = new Run({ front: { lifetime: 2.5, upcoastMargin: Infinity }, onsetOrder: Array.from({ length: 21 }, (_, i) => 20 - i) });
    run.steps(2.4);
    const before = run.entry(10, 0, ROLLER_FIELD.scale);
    expect(before).toBeGreaterThan(0.2);
    run.steps(0.2);
    expect(run.front.waves).toHaveLength(0);
    const after = run.entry(10, 0, ROLLER_FIELD.scale);
    expect(after).toBeGreaterThan(0.2);
    expect(Math.abs(after - before)).toBeLessThan(0.1);
    expect(run.roller.lens(10, 0)!.state).toBe('active');
  });

  it('in the swash, never reaches below half the depth, and sheds once its crest stalls (Review Focus 2)', () => {
    // The trough's water is 6 cm deep: the bore runs up a nearly dry flat.
    const { troughLevel } = boreShape();
    const run = new Run({ depth: 0.06 - troughLevel, speed: 2, roller: { mask: 'solver' } });
    run.steps(1.5);
    const lens = run.roller.lens(10, 0)!;
    expect(lens.state).toBe('active');
    expect(lens.troughDepth).toBeLessThan(0.1);
    const point = createLensPoint();
    let inside = 0;
    for (let z = -30; z <= 30; z += 0.05) {
      if (!run.roller.lensAt(0.25, z, point)) continue;
      inside += 1;
      const depth = sampleDepth(run.g, 0.25, z);
      expect(point.thickness).toBeLessThanOrEqual(0.5 * depth + 1e-12);
    }
    expect(inside).toBeGreaterThan(20);
    // The bore stops: its crest's speed relaxes toward 0, and the lens sheds as it falls below 0.5 m/s.
    run.options.start = run.frontAt(0);
    run.options.speed = 0;
    let shedAt = -1;
    for (let n = 0; n < 120 && shedAt < 0; n += 1) {
      const c = run.roller.lens(10, 0)!.c;
      run.step();
      const after = run.roller.lens(10, 0)!;
      if (after.state === 'shedding') shedAt = n;
      else expect(after.c).toBeGreaterThanOrEqual(0.5);
      if (after.state === 'shedding') expect(c).toBeGreaterThanOrEqual(0.5);
    }
    expect(shedAt).toBeGreaterThan(0);
    expect(run.roller.lens(10, 0)!.c).toBeLessThan(0.5);
  });

  /**
   * Bores side by side in one band of columns, 30 m apart: the oldest inshore, each next one further out, each a wave
   * the front starts across every column when it is observed. `breaking[k]` is bore k's solver breaking on its face.
   */
  function bores(count: number) {
    const g = sea(9, -170, 60);
    const front = new SpillingFront(g, { peelAngleDegrees: 90, crestMargin: 6, bandWidth: 20 });
    const roller = new SpillingRoller(g, { edgeColumns: 0, mask: 'solver' });
    const strength = new Float64Array(g.nx * g.nz);
    const whitewater = new Float64Array(g.nx * g.nz);
    const fronts = Array.from({ length: count }, (_, k) => 40 - 30 * k);
    const breaking = fronts.map(() => 1);
    const depth = 2;
    const shape = boreShape();
    let observed = 0;
    let time = 0;
    const write = () => {
      for (let iz = 0; iz < g.nz; iz += 1) {
        const z = g.zCenters[iz];
        // Each bore's η, laid side by side: its own within 12 m of its front.
        let eta = 0;
        let b = 0;
        for (let k = 0; k < observed; k += 1) {
          if (Math.abs(z - fronts[k]) > 12) continue;
          eta = boreEta(z, fronts[k]) - boreEta(fronts[k] + 12, fronts[k]);
          if (z - fronts[k] >= shape.crest - 0.5 && z - fronts[k] <= shape.toe + 0.5) b = breaking[k];
        }
        for (let ix = 0; ix < g.nx; ix += 1) {
          g.bed[iz * g.nx + ix] = -depth;
          g.h[iz * g.nx + ix] = depth + eta;
          strength[iz * g.nx + ix] = b;
        }
      }
    };
    return {
      g, front, roller, breaking,
      /** The next bore breaks: its wave starts across every column, where it now is. */
      observe() {
        for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, time, fronts[observed] + shape.crest);
        observed += 1;
      },
      /** `count` steps of the water, the front and the roller, and of any `others` beside it. */
      steps(count: number, ...others: SpillingRoller[]) {
        for (let n = 0; n < count; n += 1) {
          time += 1 / 60;
          write();
          front.update(time, 1 / 60, 0.01, strength, whitewater);
          for (const each of [roller, ...others]) each.update(time, 1 / 60, front, strength, 1);
        }
      },
      /** The waves of column `column`'s lenses, slot by slot (−1: none). */
      waves(column: number) {
        return Array.from({ length: ROLLER_SLOTS }, (_, slot) => roller.lens(column, slot)?.wave ?? -1);
      },
    };
  }

  it('gives each wave breaking in a column a free slot, so a wave breaking further out never takes a live lens inshore', () => {
    // The owner's playtest (2026-10-09): with two slots, wave 2 (2 mod 2 = 0) took wave 0's live lens inshore from
    // under the rider it carried, who then slid down the bare face to about 1.4 c.
    const run = bores(4);
    run.observe();
    run.observe();
    expect(run.front.waves.map((wave) => wave.id)).toEqual([0, 1]);
    run.steps(10);
    expect(run.waves(4)).toEqual([0, 1, -1, -1]);
    run.observe();
    run.steps(10);
    run.observe();
    run.steps(10);
    for (let column = 0; column < run.g.nx; column += 1) expect(run.waves(column)).toEqual([0, 1, 2, 3]);
    expect(run.roller.counts.overflow).toBe(0);
  });

  it('makes a lens yield only in a full column, to a newer wave than all its lenses: a shedding one first, then the oldest', () => {
    const run = bores(6);
    for (let k = 0; k < 4; k += 1) {
      run.observe();
      run.steps(10);
    }
    // Bore 2 stops breaking: its lens sheds.
    run.breaking[2] = 0;
    run.steps(20);
    expect(run.roller.lens(4, 2)!.state).toBe('shedding');
    // Wave 4 breaks in the full column: the shedding lens yields, not the oldest.
    run.observe();
    run.steps(10);
    expect(run.waves(4)).toEqual([0, 1, 4, 3]);
    expect(run.roller.counts.overflow).toBe(run.g.nx);
    // Wave 5 breaks: all are active, so the oldest yields; wave 2 never takes a place back while the column is full.
    run.breaking[2] = 1;
    run.observe();
    run.steps(10);
    expect(run.waves(4)).toEqual([5, 1, 4, 3]);
    expect(run.roller.counts.overflow).toBe(2 * run.g.nx);
  });

  it('draws each wave\'s run along its crest in one table slot, whatever slots its lenses are kept in', () => {
    const run = bores(2);
    run.observe();
    run.observe();
    run.steps(10);
    // The same lenses, kept in other slots from column 4 on: wave 0's in slot 3, wave 1's in slot 0.
    const state = run.roller.exportState();
    const kept = new SpillingRoller(run.g, run.roller.options);
    kept.importState(state);
    const shuffled = new SpillingRoller(run.g, run.roller.options);
    shuffled.importState({ ...state, lenses: state.lenses.map((lens) => (lens.column < 4 ? lens : { ...lens, slot: lens.wave === 0 ? 3 : 0 })) });
    run.steps(10, kept, shuffled);
    expect(shuffled.lens(6, 3)!.wave).toBe(0);
    expect(shuffled.lens(6, 0)!.wave).toBe(1);
    // Each wave's run lies in one slot, wave 0's in slot 0 and wave 1's in slot 1, as if never moved: the table, what is
    // drawn and felt, is the same bit for bit.
    for (let column = 0; column < run.g.nx; column += 1) {
      expect([0, 1, 2, 3].map((slot) => shuffled.tableWave(column, slot))).toEqual([0, 1, -1, -1]);
    }
    expect(Array.from(kept.table)).toEqual(Array.from(run.roller.table));
    expect(Array.from(shuffled.table)).toEqual(Array.from(kept.table));
  });

  it('has no lens in the open edges\' columns', () => {
    const run = new Run({ nx: 21, roller: { edgeColumns: 2, mask: 'solver' } });
    run.steps(0.5);
    for (const column of [0, 1, 19, 20]) {
      expect(run.roller.lens(column, 0)).toBeUndefined();
      expect(run.entry(column, 0, ROLLER_FIELD.scale)).toBe(0);
    }
    expect(run.roller.lens(2, 0)).toBeDefined();
    expect(ROLLER_DEFAULTS.edgeColumns).toBe(2);
  });
});

describe('SpillingRoller: online', () => {
  it('steps two runs on the same water to bitwise-equal tables', () => {
    const tables = [0, 1].map(() => {
      const run = new Run({ nx: 21 });
      run.skew = (column) => 0.15 * column;
      run.steps(2.5);
      return run.roller.table.slice();
    });
    expect(tables[0].some((value) => value !== 0)).toBe(true);
    for (let i = 0; i < tables[0].length; i += 1) expect(Object.is(tables[0][i], tables[1][i])).toBe(true);
  });

  it('uses only + − × ÷, √, floor, min and max, in the roller and its front (R3 §3.4)', () => {
    for (const file of ['src/wave/SpillingRoller.ts', 'src/wave/SpillingFront.ts']) {
      const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      const used = new Set([...code.matchAll(/Math\.(\w+)/g)].map((match) => match[1]));
      for (const name of used) expect(['sqrt', 'floor', 'min', 'max', 'imul', 'PI']).toContain(name);
      expect(code).not.toMatch(/\*\*|Date\.now|performance\.now|random/);
    }
  });
});

describe('SpillingRoller: the crest normal', () => {
  it('moves its water at c along the crest\'s normal, from the neighbouring columns\' crests', () => {
    const run = new Run({ nx: 21, speed: 4, roller: { mask: 'solver' } });
    // The crest runs 0.2 m further inshore per metre along shore: its normal leans toward −x by atan 0.2.
    run.skew = (column) => 0.2 * column;
    run.steps(1.5);
    // Each column's crest is off by 0.09–0.2 m as the bore crosses its rows differently along shore (a pattern that
    // repeats every 5 columns here); the fit over five columns keeps the normal within 1.4° of the crest's (measured).
    for (const column of [4, 7, 10, 13, 16]) {
      expect(Math.abs(run.entry(column, 0, ROLLER_FIELD.flowX) / run.entry(column, 0, ROLLER_FIELD.flowZ) + 0.2)).toBeLessThan(0.03);
    }
    const flowX = run.entry(10, 0, ROLLER_FIELD.flowX);
    const flowZ = run.entry(10, 0, ROLLER_FIELD.flowZ);
    // Along its normal the crest moves at the bore's speed times cos 11.3°.
    expect(Math.hypot(flowX, flowZ)).toBeCloseTo(4 / Math.hypot(1, 0.2), 0);
    // The lens's extent across shore is its length over its normal's n̂_z.
    const lens = run.roller.lens(10, 0)!;
    expect(run.entry(10, 0, ROLLER_FIELD.length)).toBeCloseTo((lens.length * Math.hypot(flowX, flowZ)) / flowZ, 9);
  });
});

describe('SpillingRoller: one crest per wave (the far-crest join)', () => {
  // A crest that steps 30 m inshore past column 10: two crests, a wavelength's fraction apart along shore.
  const step = (column: number) => (column > 10 ? 30 : 0);

  it('takes a crest a step away as another wave\'s, in the other slot, with neither normal tipped', () => {
    const run = new Run({ nx: 21, speed: 4, roller: { mask: 'solver' }, skew: step });
    run.steps(1.5);
    expect(run.front.waves.map((wave) => wave.id)).toEqual([0, 1]);
    for (const column of [6, 8, 10]) expect(run.entry(column, 0, ROLLER_FIELD.scale)).toBeGreaterThan(0);
    for (const column of [12, 14, 16]) expect(run.entry(column, 1, ROLLER_FIELD.scale)).toBeGreaterThan(0);
    for (const [column, slot] of [[9, 0], [10, 0], [11, 1], [12, 1]]) {
      const flowZ = run.entry(column, slot, ROLLER_FIELD.flowZ);
      expect(Math.abs(run.entry(column, slot, ROLLER_FIELD.flowX) / flowZ)).toBeLessThan(0.05);
      expect(run.entry(column, slot, ROLLER_FIELD.length)).toBeLessThan(10);
    }
  });

  it('stops a normal\'s fit at the step even when one wave holds both crests (the guard)', () => {
    const run = new Run({ nx: 21, speed: 4, roller: { mask: 'solver' }, front: { crestReach: Infinity }, skew: step });
    run.steps(1.5);
    expect(run.front.waves).toHaveLength(1);
    for (const column of [9, 10, 11, 12]) {
      const flowZ = run.entry(column, 0, ROLLER_FIELD.flowZ);
      expect(Math.abs(run.entry(column, 0, ROLLER_FIELD.flowX) / flowZ)).toBeLessThan(0.05);
      expect(run.entry(column, 0, ROLLER_FIELD.length)).toBeLessThan(10);
    }
  });
});

describe('SpillingRoller: its slots and table', () => {
  it('keeps 8 values for each of 4 slots in every column', () => {
    expect(ROLLER_SLOTS).toBe(4);
    expect(ROLLER_STRIDE).toBe(8);
    const g = sea(7, -10, 10);
    expect(new SpillingRoller(g).table).toHaveLength(4 * 7 * 8);
  });
});

/** Bilinear water depth at (x, z) on a 1 m test grid. */
function sampleDepth(g: Sea, x: number, z: number): number {
  const gx = Math.min(g.nx - 1, Math.max(0, x - g.xCenters[0]));
  const gz = Math.min(g.nz - 1, Math.max(0, z - g.zCenters[0]));
  const ix = Math.min(g.nx - 2, Math.floor(gx));
  const iz = Math.min(g.nz - 2, Math.floor(gz));
  const tx = gx - ix;
  const tz = gz - iz;
  const i = iz * g.nx + ix;
  return (g.h[i] * (1 - tx) + g.h[i + 1] * tx) * (1 - tz) + (g.h[i + g.nx] * (1 - tx) + g.h[i + g.nx + 1] * tx) * tz;
}
