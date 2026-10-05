import { describe, expect, it } from 'vitest';
import { SPILLING_FRONT_DEFAULTS, SpillingFront, type SpillingGrid } from './SpillingFront';

/** A 1 m grid, 41 columns (x −20…20) by 21 rows (z −10…10). */
function grid(): SpillingGrid {
  const nx = 41;
  const nz = 21;
  return {
    nx, nz,
    xCenters: Float64Array.from({ length: nx }, (_, i) => i - 20),
    zCenters: Float64Array.from({ length: nz }, (_, i) => i - 10),
  };
}

const column = (g: SpillingGrid, x: number) => Math.round(x - g.xCenters[0]);
const row = (g: SpillingGrid, z: number) => Math.round(z - g.zCenters[0]);

/** Breaking in a band rows z0…z1 across columns whose x lies in [x0, x1], begun at `began`. */
function breakBand(g: SpillingGrid, strength: Float64Array, age: Float64Array, time: number, began: number, x0: number, x1: number, z0: number, z1: number): void {
  for (let iz = row(g, z0); iz <= row(g, z1); iz += 1) {
    for (let ix = column(g, x0); ix <= column(g, x1); ix += 1) {
      strength[iz * g.nx + ix] = 1;
      age[iz * g.nx + ix] = time - began;
    }
  }
}

function sum(values: Float64Array, g: SpillingGrid, x: number): number {
  let total = 0;
  for (let iz = 0; iz < g.nz; iz += 1) total += values[iz * g.nx + column(g, x)];
  return total;
}

describe('SpillingFront', () => {
  it('caps the front at c_b / sin α along shore and never lets it pass the solver tip', () => {
    const g = grid();
    const front = new SpillingFront(g, { peelAngleDegrees: 30 });
    expect(front.speedCap(5)).toBeCloseTo(10, 6);
    const size = g.nx * g.nz;
    const strength = new Float64Array(size);
    const age = new Float64Array(size);
    const out = new Float64Array(size);
    // The solver breaks the whole crest at once (a close-out): onsets in every column at t = 0, from −20 to 20.
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 0);
    expect(front.waves).toHaveLength(1);
    expect(front.waves[0].tipX).toBe(20);
    breakBand(g, strength, age, 0, 0, -20, 20, -2, 2);
    // At 2 m/s the front runs 2 m per second from the peak at −20.
    for (let step = 1; step <= 5; step += 1) front.update(step, 1, 2, strength, age, out);
    expect(front.waves[0].frontX).toBeCloseTo(-10, 6);
    // Far faster: still no further than the solver's tip.
    front.update(6, 1, 1000, strength, age, out);
    expect(front.waves[0].frontX).toBe(20);
  });

  it('withholds whitewater ahead of the front along the crest and passes it behind', () => {
    const g = grid();
    const front = new SpillingFront(g, { rampSeconds: 0.001 });
    const size = g.nx * g.nz;
    const strength = new Float64Array(size);
    const age = new Float64Array(size);
    const out = new Float64Array(size);
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 10);
    breakBand(g, strength, age, 10, 10, -20, 20, -2, 2);
    front.update(12, 2, 2, strength, age, out);
    // The front is at −16: columns behind it keep the solver's whitewater, columns ahead have none.
    expect(front.waves[0].frontX).toBeCloseTo(-16, 6);
    expect(sum(out, g, -18)).toBeGreaterThan(0);
    expect(sum(out, g, -10)).toBe(0);
    expect(sum(out, g, 15)).toBe(0);
    expect(front.gated).toBeGreaterThan(0);
  });

  it('starts the foam as a thin line at the crest and grows it down the face', () => {
    const g = grid();
    const front = new SpillingFront(g, { rampSeconds: 2, lineWidth: 1, growth: 2, lineShare: 0.3 });
    const size = g.nx * g.nz;
    const strength = new Float64Array(size);
    const age = new Float64Array(size);
    const out = new Float64Array(size);
    front.observeOnset(column(g, 0), 0);
    // The crest at z = −6 with its face running 8 m down toward the beach (+z).
    breakBand(g, strength, age, 0, 0, 0, 0, -6, 2);
    front.update(0, 0.01, 2, strength, age, out);
    const at = (z: number) => out[row(g, z) * g.nx + column(g, 0)];
    expect(at(-6)).toBeCloseTo(0.3, 6);
    expect(at(-5)).toBeGreaterThan(0);
    expect(at(-3)).toBe(0);
    breakBand(g, strength, age, 1, 0, 0, 0, -6, 2);
    front.update(1, 1, 2, strength, age, out);
    expect(at(-3)).toBeGreaterThan(0.3);
    expect(at(0)).toBe(0);
    breakBand(g, strength, age, 2.5, 0, 0, 0, -6, 2);
    front.update(2.5, 1.5, 2, strength, age, out);
    expect(at(2)).toBe(1);
  });

  it('gives each new wave its own front and passes older bores ahead of it untouched', () => {
    const g = grid();
    const front = new SpillingFront(g, { rampSeconds: 0.001 });
    const size = g.nx * g.nz;
    const strength = new Float64Array(size);
    const age = new Float64Array(size);
    const out = new Float64Array(size);
    // Wave 1 peels from −20 across the window.
    for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 0);
    for (let t = 1; t <= 30; t += 1) front.update(t, 1, 2, strength, age, out);
    expect(front.waves[0].frontX).toBe(20);
    // A period later the next wave breaks at the peak: a column already in wave 1 starts wave 2 there.
    front.observeOnset(column(g, -20), 30);
    expect(front.waves).toHaveLength(2);
    expect(front.waves[1].startX).toBe(-20);
    expect(front.waves[1].frontX).toBe(-20);
    // Its neighbours join it, not wave 1.
    for (let x = -19; x <= 20; x += 1) front.observeOnset(column(g, x), 30.2);
    expect(front.waves).toHaveLength(2);
    expect(front.waves[1].tipX).toBe(20);
    // Wave 1's bore (begun at 0) is still breaking inshore across the window; wave 2's crest (begun at 30) seaward.
    breakBand(g, strength, age, 31, 0, -20, 20, 5, 7);
    breakBand(g, strength, age, 31, 30, -20, 20, -6, -4);
    front.update(31, 1, 2, strength, age, out);
    const at = (x: number, z: number) => out[row(g, z) * g.nx + column(g, x)];
    expect(at(10, 6)).toBe(1);
    expect(at(10, -5)).toBe(0);
    expect(at(-20, -5)).toBe(1);
    expect(front.started).toBe(2);
  });

  it('runs toward −x when the spot peels that way', () => {
    const g = grid();
    const front = new SpillingFront(g, { direction: -1, rampSeconds: 0.001 });
    const size = g.nx * g.nz;
    const strength = new Float64Array(size);
    const age = new Float64Array(size);
    const out = new Float64Array(size);
    for (let ix = g.nx - 1; ix >= 0; ix -= 1) front.observeOnset(ix, 0);
    expect(front.waves[0].startX).toBe(20);
    expect(front.waves[0].tipX).toBe(-20);
    breakBand(g, strength, age, 0, 0, -20, 20, -2, 2);
    front.update(3, 3, 2, strength, age, out);
    expect(front.waves[0].frontX).toBeCloseTo(14, 6);
    expect(sum(out, g, 18)).toBeGreaterThan(0);
    expect(sum(out, g, 0)).toBe(0);
  });

  it('defaults to the Canyon: left to right seen from the beach, at 55°', () => {
    expect(SPILLING_FRONT_DEFAULTS.direction).toBe(1);
    expect(SPILLING_FRONT_DEFAULTS.peelAngleDegrees).toBe(55);
  });
});
