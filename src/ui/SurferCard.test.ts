import { describe, expect, it } from 'vitest';
import { DEFAULT_SURFER, SUIT_COLORS } from '../game/SurferChoice';
import { BOARD_DESIGNS } from '../scene/board/boardDesigns';
import { t } from './strings';
import { surferModel } from './SurferCard';

describe('surferModel', () => {
  it('offers the body, outfit, colour and board, with the choice marked', () => {
    const model = surferModel({ ...DEFAULT_SURFER, body: 'surfer2', board: 'midnight' });
    expect(model.rows.map((row) => row.id)).toEqual(['body', 'outfit', 'color', 'board']);
    const marked = model.rows.map((row) => row.options.filter((option) => option.selected).map((option) => option.value));
    expect(marked).toEqual([['surfer2'], ['fullsuit'], [DEFAULT_SURFER.color], ['midnight']]);
    expect(model.rows[3].options.map((option) => option.value)).toEqual(BOARD_DESIGNS.map((design) => design.id));
    for (const row of model.rows) for (const option of row.options) expect(t(option.label)).not.toBe(option.label);
  });

  it('shows each colour as its swatch', () => {
    const colors = surferModel(DEFAULT_SURFER).rows[2].options;
    expect(colors.map((option) => option.swatch)).toEqual(Object.values(SUIT_COLORS));
  });

  it('names the rash vest by what goes with it on this body', () => {
    const vest = (body: typeof DEFAULT_SURFER.body) => surferModel({ ...DEFAULT_SURFER, body }).rows[1].options[2].label;
    expect(t(vest('surfer1'))).toMatch(/bikini/i);
    expect(t(vest('surfer3'))).toMatch(/boardshorts/i);
  });
});
