import { describe, expect, it } from 'vitest';
import surferManifest from '../../public/assets/surfers/surfers.json';
import { BOARD_DESIGNS } from '../scene/board/boardDesigns';
import {
  DEFAULT_SURFER, SUIT_COLORS, SURFER_BODIES, lookOf, looksFor, outfitFor, sanitizeSurfer, sexOf, surferBody, surferHeight,
} from './SurferChoice';

describe('the surfer choice', () => {
  it('knows each committed surfer\'s height, and 1.75 m for no one in particular (wave sizes)', () => {
    for (const { id, height } of surferManifest.surfers) expect(surferHeight(id as Parameters<typeof surferHeight>[0])).toBeCloseTo(height, 3);
    expect(surferHeight()).toBe(1.75);
  });

  it('offers the four committed bodies, each with its sex', () => {
    expect(SURFER_BODIES.map(({ id, sex }) => ({ id, sex }))).toEqual(surferManifest.surfers.map(({ id, sex }) => ({ id, sex })));
  });

  it('finds a body by its sex and look, and reads both back', () => {
    expect(surferBody('female', 1)).toBe('surfer1');
    expect(surferBody('male', 2)).toBe('surfer4');
    for (const body of SURFER_BODIES) expect(surferBody(sexOf(body.id), lookOf(body.id))).toBe(body.id);
    expect(looksFor('male')).toEqual([1, 2]);
    // A look this sex does not have falls back to its first.
    expect(surferBody('male', 9)).toBe('surfer3');
  });

  it('dresses a rash vest as a bikini on the women and boardshorts on the men', () => {
    const woman = SURFER_BODIES.find((body) => body.sex === 'female')!.id;
    const man = SURFER_BODIES.find((body) => body.sex === 'male')!.id;
    expect(outfitFor({ ...DEFAULT_SURFER, body: woman, outfit: 'vest' })).toBe('vestBikini');
    expect(outfitFor({ ...DEFAULT_SURFER, body: man, outfit: 'vest' })).toBe('vestShorts');
    expect(outfitFor({ ...DEFAULT_SURFER, body: man, outfit: 'springsuit' })).toBe('springsuit');
  });

  it('falls back field by field from a stored choice that no longer exists', () => {
    const board = BOARD_DESIGNS[2].id;
    expect(sanitizeSurfer({ body: 'surfer9', outfit: 'vest', color: 'plaid', board }, DEFAULT_SURFER))
      .toEqual({ body: DEFAULT_SURFER.body, outfit: 'vest', color: DEFAULT_SURFER.color, board });
    expect(sanitizeSurfer('nonsense', DEFAULT_SURFER)).toEqual(DEFAULT_SURFER);
    expect(Object.keys(SUIT_COLORS)).toContain(DEFAULT_SURFER.color);
  });
});
