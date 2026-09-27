import { describe, expect, it } from 'vitest';
import { REFERENCE_BOARD, REFERENCE_RIDER, referenceFlotation } from './boardReference';

describe('reference shortboard and rider', () => {
  it('records a shortboard that fills about half its bounding box', () => {
    const box = REFERENCE_BOARD.length * REFERENCE_BOARD.width * REFERENCE_BOARD.thickness;
    expect(REFERENCE_BOARD.volume / box).toBeGreaterThan(0.3);
    expect(REFERENCE_BOARD.volume / box).toBeLessThan(0.7);
  });

  // 25.75 L of seawater carries about 26 kg: a shortboard cannot float a standing 73 kg rider at rest.
  it('cannot float its rider at rest, so standing needs planing lift', () => {
    const flotation = referenceFlotation();
    expect(flotation.buoyantMass).toBeCloseTo(26.4, 1);
    expect(flotation.buoyantMass).toBeLessThan(REFERENCE_RIDER.mass + REFERENCE_BOARD.mass);
    expect(flotation.unsupportedFraction).toBeGreaterThan(0.6);
  });
});
