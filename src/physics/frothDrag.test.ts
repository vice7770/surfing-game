import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { frothStress } from './BoardBody';
import { RideSession } from './RideSession';
import { createWaterSample } from './SurfWater';
import { RollerWater, type RollerBoreOptions } from './testing/RollerWater';

/**
 * A roller's froth on a board (`BoardBody`'s froth drag; bottom-stop, 2026-10-29, after the water-physics advisor's
 * ruling of that day: docs/research/bottom-stop-2026-10-29/README.md). Straight-in riders at the Canyon's Big were braked
 * at 0.3–0.5 body weights by a young roller's lens near its toe, where no white is drawn, and thrown, the bare board
 * then stopping dead. The drag now acts only where the lens reaches (ξ ≤ g), past the roller's own water (c·n̂), and
 * never harder than the roller's grip on the face (Duncan's shear, Martins et al. 2018 eq. 1). `froth: 'old'` is the
 * drag as before.
 */

const STEP = 1 / 60;

/** The plan's §7 bore at height H (Fr₁ 1.58). */
function bore(height: number, extra: Partial<RollerBoreOptions> = {}): RollerBoreOptions {
  return { depth: height / 0.79, height, toeZ: -15, ...extra };
}

/**
 * The froth's mean force along +z, N, on a prone rider's board, nose to the beach, held at `speed` along +z from `xi` of
 * the lens (0 crest, 1 toe), over a few steps.
 */
function frothOn(water: RollerWater, xi: number, speed: number, steps = 6): number {
  const session = new RideSession();
  const { board, rider } = session;
  session.reset(new Vector3(0, 0, water.crestZ() + xi * water.rollerLength), 0, water);
  let drag = 0;
  for (let n = 0; n < steps; n += 1) {
    board.velocity.set(0, board.velocity.y, speed);
    rider.velocity.set(0, rider.velocity.y, speed);
    session.step(STEP, water, { paddle: false, popUp: false, steer: 0 });
    water.advance(STEP);
    drag += board.forces.froth.z / steps;
  }
  return drag;
}

describe('a roller\'s froth on a board (bottom-stop)', () => {
  it('drags no board where a young roller does not reach (ξ > g), and drags it where it does', () => {
    // A young lens (g 0.3) on a 1.5 m bore running at c, a board outrunning it at 1.5 c: 0.85 of the way to the toe (its
    // tail past the reach), and at the crest.
    const young = bore(1.5, { scale: 0.3 });
    const c = new RollerWater(young).options.speed;
    const past = frothOn(new RollerWater(young), 0.85, 1.5 * c);
    const within = frothOn(new RollerWater(young), 0, 1.5 * c);
    const before = frothOn(new RollerWater({ ...young, froth: 'old' }), 0.85, 1.5 * c);
    expect(Math.abs(past)).toBeLessThan(1);
    expect(within).toBeLessThan(-5);
    // As before, the whole footprint dragged the board: the bottom-stop's brake.
    expect(before).toBeLessThan(-20);
  });

  it('holds a board back only past the roller\'s own water, c, not its young lens\'s slower blended flow', () => {
    // A young lens (g 0.3) on a 1.0 m bore running at c: a board at 0.9 c just behind its crest outruns the blended
    // flow (about 0.6 c there) but not the roller's water.
    const young = bore(1, { scale: 0.3, toeZ: -10 });
    const c = new RollerWater(young).options.speed;
    const now = frothOn(new RollerWater(young), 0.1, 0.9 * c);
    const before = frothOn(new RollerWater({ ...young, froth: 'old' }), 0.1, 0.9 * c);
    expect(Math.abs(now)).toBeLessThan(1);
    expect(before).toBeLessThan(-5);
  });

  it('never drags a board harder than the roller\'s grip on the face, ρ(1 − ᾱ)·g·t·sin θ, and only on the lens\'s share of its depth', () => {
    const sample = createWaterSample();
    Object.assign(sample, { lensScale: 1, lensThickness: 0.1, lensGrip: 200 });
    // 500 N·s/m³ on 0.2 m/s: 100 Pa, under the grip; on 3 m/s, 1.5 kPa, held to the grip.
    expect(frothStress(sample, 0.2, 0.05)).toBeCloseTo(100, 6);
    expect(frothStress(sample, 3, 0.05)).toBe(200);
    // A patch 0.2 m deep in a 0.1 m lens: half its depth in the froth.
    expect(frothStress(sample, 0.2, 0.2)).toBeCloseTo(50, 6);
    // A young lens (g 0.3): 30 % of the developed one's stress.
    sample.lensScale = 0.3;
    expect(frothStress(sample, 0.2, 0.05)).toBeCloseTo(30, 6);
  });
});
