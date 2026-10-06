import { describe, expect, it } from 'vitest';
import { SPILLING_FRONT_DEFAULTS, SpillingFront, seriesSine, type SpillingGrid } from './SpillingFront';

/** A 1 m grid, 41 columns (x −20…20) by 41 rows (z −20…20; +z toward the beach). */
function grid(): SpillingGrid {
  const nx = 41;
  const nz = 41;
  return {
    nx, nz,
    xCenters: Float64Array.from({ length: nx }, (_, i) => i - 20),
    zCenters: Float64Array.from({ length: nz }, (_, i) => i - 20),
  };
}

const column = (g: SpillingGrid, x: number) => Math.round(x - g.xCenters[0]);
const row = (g: SpillingGrid, z: number) => Math.round(z - g.zCenters[0]);

/** Breaking (B = 1) in rows z0…z1 across columns whose x lies in [x0, x1]. */
function breakBand(g: SpillingGrid, strength: Float64Array, x0: number, x1: number, z0: number, z1: number): void {
  for (let iz = row(g, z0); iz <= row(g, z1); iz += 1) {
    for (let ix = column(g, x0); ix <= column(g, x1); ix += 1) strength[iz * g.nx + ix] = 1;
  }
}

function sum(values: Float64Array, g: SpillingGrid, x: number): number {
  let total = 0;
  for (let iz = 0; iz < g.nz; iz += 1) total += values[iz * g.nx + column(g, x)];
  return total;
}

/** Fields for one front; the tests' fronts run at their breaker celerity (a 90° peel: the cap is c_b itself). */
function setup(options: ConstructorParameters<typeof SpillingFront>[1] = {}) {
  const g = grid();
  const front = new SpillingFront(g, { peelAngleDegrees: 90, ...options });
  const size = g.nx * g.nz;
  return { g, front, strength: new Float64Array(size), out: new Float64Array(size) };
}

describe('SpillingFront', () => {
  it('caps the front at c_b / sin α along shore and never lets it pass the solver tip', () => {
    expect(new SpillingFront(grid(), { peelAngleDegrees: 30 }).speedCap(5)).toBeCloseTo(10, 6);
    const { g, front, strength, out } = setup();
    // The solver breaks the whole crest at once (a close-out): onsets in every column at t = 0, from −20 to 20.
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 0, 0);
    expect(front.waves).toHaveLength(1);
    expect(front.waves[0].tipX).toBe(20);
    breakBand(g, strength, -20, 20, 0, 2);
    // At 2 m/s the front runs 2 m per second from the peak at −20.
    for (let step = 1; step <= 5; step += 1) front.update(step, 1, 2, strength, out);
    expect(front.waves[0].frontX).toBeCloseTo(-10, 6);
    // Far faster: still no further than the solver's tip.
    front.update(6, 1, 1000, strength, out);
    expect(front.waves[0].frontX).toBe(20);
  });

  it('withholds whitewater ahead of the front along the crest and passes it behind', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001 });
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 10, -2);
    breakBand(g, strength, -20, 20, -2, 2);
    front.update(12, 2, 2, strength, out);
    // The front is at −16: columns behind it keep the solver's whitewater, columns ahead have none.
    expect(front.waves[0].frontX).toBeCloseTo(-16, 6);
    expect(sum(out, g, -18)).toBeGreaterThan(0);
    expect(sum(out, g, -10)).toBe(0);
    expect(sum(out, g, 15)).toBe(0);
    expect(front.gated).toBeGreaterThan(0);
    // The whitewater never exceeds the solver's breaking.
    for (let i = 0; i < out.length; i += 1) expect(out[i]).toBeLessThanOrEqual(strength[i]);
  });

  it('starts the foam as a thin line at the crest and grows it down the face', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 2, lineWidth: 1, growth: 2, lineShare: 0.3 });
    front.observeOnset(column(g, 0), 0, -6);
    // The crest at z = −6 with its face running 8 m down toward the beach (+z).
    breakBand(g, strength, 0, 0, -6, 2);
    front.update(0, 0.01, 2, strength, out);
    const at = (z: number) => out[row(g, z) * g.nx + column(g, 0)];
    expect(at(-6)).toBeCloseTo(0.3, 6);
    expect(at(-5)).toBeGreaterThan(0);
    expect(at(-3)).toBe(0);
    front.update(1, 1, 2, strength, out);
    expect(at(-3)).toBeGreaterThan(0.3);
    expect(at(0)).toBe(0);
    front.update(2.5, 1.5, 2, strength, out);
    expect(at(2)).toBe(1);
  });

  it('gives each new wave its own front and passes older bores inshore of it untouched', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001 });
    // Wave 1 starts breaking at z = −18 across the window and peels from −20.
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 0, -18);
    for (let t = 1; t <= 30; t += 1) front.update(t, 1, 2, strength, out);
    expect(front.waves[0].frontX).toBe(20);
    // A period later the next wave breaks at the peak: a column already in wave 1 starts wave 2 there.
    front.observeOnset(column(g, -20), 30, -18);
    expect(front.waves).toHaveLength(2);
    expect(front.waves[1].startX).toBe(-20);
    expect(front.waves[1].frontX).toBe(-20);
    // Its neighbours join it, not wave 1.
    for (let x = -19; x <= 20; x += 1) front.observeOnset(column(g, x), 30.2, -18);
    expect(front.waves).toHaveLength(2);
    expect(front.waves[1].tipX).toBe(20);
    // Wave 1's bore is far inshore by now (z 15…17, past wave 2's band); wave 2's crest breaks at z −18…−16.
    breakBand(g, strength, -20, 20, 15, 17);
    breakBand(g, strength, -20, 20, -18, -16);
    front.update(30.5, 0.5, 0.5, strength, out);
    const at = (x: number, z: number) => out[row(g, z) * g.nx + column(g, x)];
    expect(at(10, 16)).toBe(1);
    expect(at(10, -17)).toBe(0);
    expect(at(-20, -17)).toBe(1);
    expect(front.started).toBe(2);
  });

  it('keeps a wave\'s cells its own when another wave starts elsewhere along the crest meanwhile', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001 });
    // The peeling wave breaks from −20 to 0 at once; a second, small break starts at x = 15 a second later.
    for (let x = -20; x <= 0; x += 1) front.observeOnset(column(g, x), 0, 0);
    front.observeOnset(column(g, 15), 1, 0);
    expect(front.waves).toHaveLength(2);
    breakBand(g, strength, -20, 0, 0, 2);
    front.update(1, 1, 2, strength, out);
    expect(front.waves[0].frontX).toBeCloseTo(-18, 6);
    expect(sum(out, g, -5)).toBe(0);
    expect(sum(out, g, -19)).toBeGreaterThan(0);
  });

  it('runs toward −x when the spot peels that way', () => {
    const { g, front, strength, out } = setup({ direction: -1, rampSeconds: 0.001 });
    for (let ix = g.nx - 1; ix >= 0; ix -= 1) front.observeOnset(ix, 0, 0);
    expect(front.waves[0].startX).toBe(20);
    expect(front.waves[0].tipX).toBe(-20);
    breakBand(g, strength, -20, 20, 0, 2);
    front.update(3, 3, 2, strength, out);
    expect(front.waves[0].frontX).toBeCloseTo(14, 6);
    expect(sum(out, g, 18)).toBeGreaterThan(0);
    expect(sum(out, g, 0)).toBe(0);
  });

  it('defaults to the Canyon: left to right seen from the beach, at 55°', () => {
    expect(SPILLING_FRONT_DEFAULTS.direction).toBe(1);
    expect(SPILLING_FRONT_DEFAULTS.peelAngleDegrees).toBe(55);
  });
});

// The Canyon roller lens (S3): what the roller and the rider's water read from the front.
describe('SpillingFront for the roller (S3)', () => {
  it('numbers each wave by the waves started before it', () => {
    const { g, front } = setup();
    front.observeOnset(column(g, -20), 0, 0);
    front.observeOnset(column(g, -19), 0.1, 0);
    front.observeOnset(column(g, -20), 30, 0);
    expect(front.waves.map((wave) => wave.id)).toEqual([0, 1]);
    expect(front.started).toBe(2);
  });

  it('feels the solver\'s breaking behind the front and in cells no wave owns, and none ahead, with no ramp', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 2 });
    const felt = new Float64Array(out.length);
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 10, -15);
    // The crest's band at z −15…−11 is the wave's (its band ends 20 m inshore of where its crest has run, z 9); a bore
    // far inshore at z 15…17 is outside it (no owner).
    breakBand(g, strength, -20, 20, -15, -11);
    breakBand(g, strength, -20, 20, 15, 17);
    for (let i = 0; i < strength.length; i += 1) if (strength[i] > 0) strength[i] = 0.5 + 0.01 * (i % 7);
    front.update(12, 2, 2, strength, out, felt);
    expect(front.waves[0].frontX).toBeCloseTo(-16, 6);
    const at = (values: Float64Array, x: number, z: number) => values[row(g, z) * g.nx + column(g, x)];
    for (const z of [-15, -13, -11]) {
      // Behind the front: the solver's breaking, unramped (the whitewater is still a thin line there).
      expect(at(felt, -18, z)).toBe(at(strength, -18, z));
      // Ahead of it: none.
      expect(at(felt, -10, z)).toBe(0);
      expect(at(felt, 15, z)).toBe(0);
    }
    expect(at(out, -18, -11)).toBeLessThan(at(strength, -18, -11));
    // The old bore no wave owns keeps the solver's breaking, ahead of the front as behind it.
    for (const x of [-18, 10]) expect(at(felt, x, 16)).toBe(at(strength, x, 16));
    expect(at(felt, 10, 10)).toBe(0);
  });

  it('records each wave\'s crest in every column it owns, reached or not', () => {
    const { g, front, strength, out } = setup({ rampSeconds: 0.001 });
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 10, -3);
    breakBand(g, strength, -20, 20, -3, 1);
    front.update(12, 2, 2, strength, out);
    // Columns ahead of the front (x > −16) are gated, yet their crest is the wave's first breaking cell.
    expect(front.gated).toBeGreaterThan(0);
    for (const x of [-18, -10, 0, 15]) expect(front.crestAt(0, column(g, x))).toBe(-3);
    // No wave 1, and no breaking in a column: none.
    expect(front.crestAt(1, column(g, 0))).toBeNaN();
    strength.fill(0);
    front.update(12.1, 0.1, 2, strength, out);
    expect(front.crestAt(0, column(g, 0))).toBeNaN();
  });

  it('caps the peel with a series sine that matches Math.sin to 1e-12 from 30° to 90°', () => {
    for (let degrees = 30; degrees <= 90; degrees += 0.25) {
      const radians = (degrees * Math.PI) / 180;
      expect(Math.abs(seriesSine(radians) - Math.sin(radians))).toBeLessThan(1e-12);
    }
    expect(seriesSine(Math.PI / 2)).toBeCloseTo(1, 15);
    expect(new SpillingFront(grid(), { peelAngleDegrees: 55 }).speedCap(4.7)).toBeCloseTo(4.7 / Math.sin((55 * Math.PI) / 180), 12);
  });
});
