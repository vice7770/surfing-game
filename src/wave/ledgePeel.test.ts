import { describe, expect, it } from 'vitest';
import { madsenSorensenCelerity } from './BoussinesqSolver';
import { GRAVITY } from './dispersion';
import { ledgePeel, rayAngleAt } from './ledgePeel';

const design = { period: 15, deepDepth: 30, shelfDepth: 10, breakDepth: 2.97, swellDegrees: 20, ledgeDegrees: 45 };
const rad = (degrees: number) => (degrees * Math.PI) / 180;

describe('ledgePeel', () => {
  it('refracts the swell onto the shelf by Snell’s law across the shore-parallel forereef', () => {
    const omega = (2 * Math.PI) / design.period;
    const peel = ledgePeel(design);
    expect(Math.sin(rad(peel.shelfDegrees)) / madsenSorensenCelerity(omega, 10))
      .toBeCloseTo(Math.sin(rad(20)) / madsenSorensenCelerity(omega, 30), 12);
    expect(peel.crestToLedgeDegrees).toBeCloseTo(peel.shelfDegrees + 45, 12);
  });

  it('runs the break point along the ledge at the shelf’s celerity over the sine of the crest’s angle', () => {
    const omega = (2 * Math.PI) / design.period;
    const peel = ledgePeel(design);
    expect(peel.peelSpeed * Math.sin(rad(peel.crestToLedgeDegrees))).toBeCloseTo(madsenSorensenCelerity(omega, 10), 12);
    expect(peel.peelSpeed).toBeCloseTo(11.44, 1);
    expect(Math.sin(rad(peel.angleDegrees))).toBeCloseTo(Math.sqrt(GRAVITY * design.breakDepth) / peel.peelSpeed, 12);
  });

  it('never peels slower than the shelf’s celerity, and closes out on a shore-parallel ledge', () => {
    const omega = (2 * Math.PI) / design.period;
    const along = ledgePeel({ ...design, swellDegrees: 0, ledgeDegrees: 90 });
    expect(along.peelSpeed).toBeCloseTo(madsenSorensenCelerity(omega, 10), 12);
    const straight = ledgePeel({ ...design, swellDegrees: 0, ledgeDegrees: 0 });
    expect(straight.peelSpeed).toBe(Infinity);
    expect(straight.angleDegrees).toBe(0);
  });

  it('turns the ray toward the edge’s normal as the wave climbs the ramp (Snell along the edge)', () => {
    const omega = (2 * Math.PI) / design.period;
    const peel = ledgePeel(design);
    expect(rayAngleAt(design, design.shelfDepth)).toBeCloseTo(peel.crestToLedgeDegrees, 9);
    const sine = Math.sin((rayAngleAt(design, 3) * Math.PI) / 180);
    expect(sine / madsenSorensenCelerity(omega, 3)).toBeCloseTo(Math.sin((peel.crestToLedgeDegrees * Math.PI) / 180) / madsenSorensenCelerity(omega, design.shelfDepth), 12);
    expect(rayAngleAt(design, 3)).toBeLessThan(peel.crestToLedgeDegrees);
  });
});
