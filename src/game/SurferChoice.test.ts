import { describe, expect, it } from 'vitest';
import surferManifest from '../../public/assets/surfers/surfers.json';
import { BOARD_DESIGNS } from '../scene/board/boardDesigns';
import { DEFAULT_SURFER, SUIT_COLORS, SURFER_BODIES, outfitFor, sanitizeSurfer } from './SurferChoice';

describe('the surfer choice', () => {
  it('offers the four committed bodies, each with its sex', () => {
    expect(SURFER_BODIES.map(({ id, sex }) => ({ id, sex }))).toEqual(surferManifest.surfers.map(({ id, sex }) => ({ id, sex })));
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
