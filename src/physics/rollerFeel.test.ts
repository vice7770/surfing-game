import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RideSession } from './RideSession';
import { RollerWater, type RollerBoreOptions } from './testing/RollerWater';

/**
 * What a rider feels of the roller lens (the Canyon roller lens, S3: docs/superpowers/plans/2026-10-06-canyon-roller-s3.md
 * §7), with the real board and rider on `RollerWater`: an analytic bore carrying the real lens. Each bore is the advisor's
 * worked example scaled (R3 §2.1): H over still water H/0.79 deep (Fr₁ 1.58), running at c = √(g(h₁ + H/2)).
 *
 * The targets the bodies meet are tests; those they miss are open checks (`it.fails`) with the measured numbers.
 */

const STEP = 1 / 60;

interface Step {
  /** The board across shore, its speed along it, and where it lies against the lens (ξ: 0 at the crest, 1 at the toe). */
  z: number;
  vz: number;
  xi: number;
  /** The water's force on the board and rider along +z this step, N. */
  fz: number;
  /** The board's height, the drawn top over it, and the lens's thickness there, m. */
  y: number;
  top: number;
  thickness: number;
  /** Whether the board lies within the lens (0.3 of its length behind the crest to its toe), and the rider is on. */
  inside: boolean;
  attached: boolean;
}

interface RideOptions {
  /** Where the board starts across shore, z, m, and its nose's heading (radians from +z). */
  z?: number;
  heading?: number;
  /** Hold the board's (and rider's) speed along +z here, m/s, while the rider is on; free when absent. */
  hold?: number;
  paddle?: boolean;
  seconds: number;
}

/** A prone rider on `water`: each step's record. */
function ride(water: RollerWater, options: RideOptions): Step[] {
  const session = new RideSession();
  session.reset(new Vector3(0, 0, options.z ?? 0), options.heading ?? 0, water);
  const steps: Step[] = [];
  let before = water.reaction.z;
  for (let n = 0; n < Math.round(options.seconds / STEP); n += 1) {
    if (options.hold !== undefined && session.rider.attached) {
      session.board.velocity.x = 0;
      session.board.velocity.z = options.hold;
      session.rider.velocity.x = 0;
      session.rider.velocity.z = options.hold;
    }
    session.step(STEP, water, { paddle: options.paddle ?? false, popUp: false, steer: 0 });
    water.advance(STEP);
    const fz = (water.reaction.z - before) / STEP;
    before = water.reaction.z;
    const { position, velocity } = session.board;
    const xi = (position.z - water.crestZ()) / water.rollerLength;
    steps.push({
      z: position.z, vz: velocity.z, xi, fz, y: position.y, top: water.surfaceAt(0, position.z), thickness: water.thicknessAt(position.z),
      inside: xi >= -water.options.roller.rearTaper && xi <= 1, attached: session.rider.attached,
    });
  }
  return steps;
}

/** The plan's §7 bore at height H. */
function bore(height: number, extra: Partial<RollerBoreOptions> = {}): RollerBoreOptions {
  return { depth: height / 0.79, height, toeZ: -15, ...extra };
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * The lens's push along +z on a prone rider (nose to the beach) held at `hold`: the water's mean force while the board is
 * within the lens, less the same bore's without it (its face's own slope and current), N.
 */
function lensPush(height: number, hold: number, shape: RollerBoreOptions['shape'] = 'ellipse'): number {
  const lens = ride(new RollerWater(bore(height, { shape })), { hold, seconds: 10 });
  const bare = ride(new RollerWater(bore(height, { lens: false })), { hold, seconds: 10 });
  const within = lens.map((step, n) => (step.inside ? n : -1)).filter((n) => n >= 0);
  return mean(within.map((n) => lens[n].fz - bare[n].fz));
}

describe('the roller lens on a prone rider (S3, the plan\'s §7)', () => {
  it('bogs a rider at rest: the board cannot stay in the froth\'s airy top, and sinks under the drawn top by about the lens\'s rise', () => {
    for (const height of [1, 1.5]) {
      // A still lens (the bore held where it is), the rider lying at its thickest, 0.15 of its length behind the crest.
      const lens = new RollerWater(bore(height, { speed: 0, toeZ: 3 }));
      const bare = new RollerWater(bore(height, { speed: 0, toeZ: 3, lens: false }));
      const z = lens.crestZ() + 0.15 * lens.rollerLength;
      const settled = ride(lens, { z, hold: 0, seconds: 4 }).at(-1)!;
      const plain = ride(bare, { z, hold: 0, seconds: 4 }).at(-1)!;
      // Where the board settles the lens's air is under the 0.28 a prone rider on a 30 L board floats in (ζ < 0.64).
      const zeta = (settled.y - (settled.top - settled.thickness)) / settled.thickness;
      expect(zeta).toBeLessThan(0.64);
      // It sits deeper under the drawn top than on the bare face, by at least half the lens's rise ᾱ·t.
      const rise = lens.options.roller.voidMean * settled.thickness;
      expect(settled.top - settled.y - (plain.top - plain.y)).toBeGreaterThan(0.5 * rise);
    }
  });

  it('catches a free prone board the bare bore leaves behind, and carries it in the lens at the bore\'s speed', () => {
    // A 0.6 m bore over 0.76 m (c = 3.22 m/s): the tidal-bore surfers' 0.3–0.6 m bores ridden at 2.5–3.1 m/s (R3 §3.1).
    const options = { depth: 0.76, height: 0.6, toeZ: -10 };
    const lens = new RollerWater(options);
    const c = lens.options.speed;
    const carried = ride(lens, { seconds: 7 });
    // At least 0.5 s in the lens's upper half within 10 % of c (measured: 4.25–5.0 s at ξ 0.19–0.24, 3.0–3.35 m/s; its
    // unsheltered legs in the lens hold it just ahead of the crest).
    const atCrest = carried.filter((step) => step.xi >= 0 && step.xi < 0.5 && Math.abs(step.vz / c - 1) < 0.1);
    expect(atCrest.length * STEP).toBeGreaterThan(0.5);
    // The bare bore's face lets the same board slide back over its crest, falling behind toward c(1 − h₁/h₂).
    const dropped = ride(new RollerWater({ ...options, lens: false }), { seconds: 7 }).at(-1)!;
    expect(dropped.xi).toBeLessThan(-1);
    expect(dropped.vz).toBeLessThan(0.9 * c);
  });

  /*
   * Open check (R3 §3.1: debris is never faster than the bore front; a board below the lens falls behind). Measured
   * 2026-10-06 with the lens's unsheltered body flow (the advisor's step 1): free prone boards are carried at c just
   * ahead of the crest, then run down the face ahead of the bore, peaking at 5.9 / 8.1 / 9.4 m/s on 0.6 / 1.0 / 1.5 m
   * bores (c 3.22 / 4.17 / 5.10; before step 1, 6.3 / 8.3 / 10.2), the rider knocked off at 1.0 and 1.5 m; the bare
   * bores never take them past 0.85 c. Traced: the board leaves the crest's convexity airborne (5–16 cm over the drawn
   * top, its rider out of the water), and each landing's water entry, along the face's forward-leaning normal, drives it
   * down the face (50–580 N a step of added mass, and radiation): it skips, it does not plane in froth. The advisor's
   * step 3 (the hull's drag against the lens's flow and its water's inertia at the mixture's density, in a lens's
   * footprint) left 5.7 / 7.7 / 8.8 m/s and was not kept. Not tuned further: the owner's call.
   */
  it.fails('never carries a free prone board faster than the bore', () => {
    for (const [depth, height] of [[0.76, 0.6], [1.27, 1], [1.9, 1.5]]) {
      const water = new RollerWater({ depth, height, toeZ: -10 });
      const fastest = Math.max(...ride(water, { seconds: 12 }).map((step) => step.vz));
      expect(fastest).toBeLessThanOrEqual(1.05 * water.options.speed);
    }
  });

  /**
   * The advisor's Q4: a prone rider drifting with the current under the crest, c(1 − h₁/h₂), overtaken by the lens at
   * c·h₁/h₂, should feel about 330·H Pa on 0.5 m² (R3 §3.1, Duncan–Martins), ± 30 %: the lens's force over the same
   * bore's bare face. Measured 2026-10-06 with the lens's unsheltered body flow (the advisor's step 1):
   * - drifting: 7 / 139 / 205 N at H = 0.5 / 1.0 / 1.5 m (before step 1: 3 / 13 / 21 N);
   * - held still: 26 / 115 / 172 N; the free carry: below;
   * - the wedge holding the same water (Q2's fallback): 8 / 160 / 126 N drifting, 25 / 116 / 238 N held still;
   * - with the advisor's step 3 as well (not kept): 36 / 74 / 129 N drifting, 92 / 377 / 781 N held still.
   */
  function driftingPush(height: number): number {
    const water = new RollerWater(bore(height));
    return lensPush(height, (water.options.speed * height) / (water.options.depth + height));
  }

  it('pushes a prone rider drifting with the current under the crest at 330·H Pa as the lens overtakes it, at H = 1.0 and 1.5 m (Q4)', () => {
    for (const height of [1, 1.5]) expect(Math.abs(driftingPush(height) / (330 * height * 0.5) - 1)).toBeLessThan(0.3);
  });

  /*
   * Open check at H = 0.5 m: 83 N ± 30 %, measured 7 N. The lens there is 10 cm thick at the crest (0.098 m), 1.5 m
   * long, and passes the drifting rider in 0.9 s: it barely reaches the body lying above a board floating about 0.24 m
   * under the surface. Not tuned: the owner's call.
   */
  it.fails('pushes a prone rider drifting under a 0.5 m bore\'s lens at 330·H Pa (Q4)', () => {
    expect(Math.abs(driftingPush(0.5) / (330 * 0.5 * 0.5) - 1)).toBeLessThan(0.3);
  });

  it('pushes a drifting prone rider toward the beach, more on a bigger bore', () => {
    const drift = (height: number) => {
      const water = new RollerWater(bore(height));
      return (water.options.speed * height) / (water.options.depth + height);
    };
    const pushes = [1, 1.5].map((height) => lensPush(height, drift(height)));
    expect(pushes[0]).toBeGreaterThan(0);
    expect(pushes[1]).toBeGreaterThan(pushes[0]);
  });

  it('knocks a paddler punching through a 1.5 m roller off the board within 0.5–0.9 s, where the bare face lets it through', () => {
    const paddle = (lens: boolean) => {
      const water = new RollerWater({ depth: 1.9, height: 1.5, toeZ: -10, lens });
      const steps = ride(water, { heading: Math.PI, paddle: true, seconds: 5 });
      const reached = steps.findIndex((step) => step.inside);
      const off = steps.findIndex((step) => !step.attached);
      return { reached, off };
    };
    const hit = paddle(true);
    expect(hit.off).toBeGreaterThan(hit.reached);
    const lasted = (hit.off - hit.reached) * STEP;
    expect(lasted).toBeGreaterThanOrEqual(0.5);
    expect(lasted).toBeLessThanOrEqual(0.9);
    expect(paddle(false).off).toBe(-1);
  });

  /*
   * Open check (R3 §3.1, after Yeh et al. 2014): a paddler facing a 1.5 m roller takes 1.4–2.8 kN quasi-steady, the
   * front's peak at most 1.5× that, for 0.5–0.9 s. Measured 2026-10-06 with the lens's unsheltered body flow (the
   * advisor's step 1), the water's force on board and rider while on and within the lens: paddling freely, a median
   * 395 N and a peak 1.1 kN over the 0.69 s before the knock-off (before step 1: 508 N, 825 N; the bare face: 177 N,
   * 555 N, and no knock-off); held at 1.5 m/s seaward, 904 N rising to 2.9 kN as the rider is knocked off after 0.30 s.
   * With step 3 as well (not kept): 281 N and 1.1 kN, knocked off after 1.12 s. Not tuned: the owner's call.
   */
  it.fails('hits a paddler punching through a 1.5 m roller with 1.4–2.8 kN', () => {
    const water = new RollerWater({ depth: 1.9, height: 1.5, toeZ: -10 });
    const steps = ride(water, { heading: Math.PI, paddle: true, seconds: 5 }).filter((step) => step.inside && step.attached);
    const forces = steps.map((step) => step.fz).sort((a, b) => a - b);
    const median = forces[Math.floor(forces.length / 2)];
    expect(median).toBeGreaterThanOrEqual(1400);
    expect(median).toBeLessThanOrEqual(2800);
    expect(forces.at(-1)!).toBeLessThanOrEqual(1.5 * median);
  });
});
