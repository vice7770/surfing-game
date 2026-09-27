import { describe, expect, it } from 'vitest';
import { DEFAULT_SURFER, SUIT_COLORS } from '../game/SurferChoice';
import { BOARD_DESIGNS } from '../scene/board/boardDesigns';
import { t } from './strings';
import { pickPatch, surferModel } from './SurferCard';

const rowOf = (model: ReturnType<typeof surferModel>, id: string) => model.rows.find((row) => row.id === id)!;

describe('surferModel', () => {
  it('offers the sex, look, outfit, colour and board, with the choice marked', () => {
    const model = surferModel({ ...DEFAULT_SURFER, body: 'surfer2', board: 'midnight' });
    expect(model.rows.map((row) => row.id)).toEqual(['sex', 'look', 'outfit', 'color', 'board']);
    const marked = model.rows.map((row) => row.options.filter((option) => option.selected).map((option) => option.value));
    expect(marked).toEqual([['female'], ['2'], ['fullsuit'], [DEFAULT_SURFER.color], ['midnight']]);
    expect(rowOf(model, 'board').options.map((option) => option.value)).toEqual(BOARD_DESIGNS.map((design) => design.id));
    for (const row of model.rows) for (const option of row.options) expect(t(option.label)).not.toBe(option.label);
  });

  it('names the sexes, and offers the looks of the chosen one', () => {
    const model = surferModel({ ...DEFAULT_SURFER, body: 'surfer4' });
    expect(rowOf(model, 'sex').options.map((option) => [t(option.label), option.selected])).toEqual([['Woman', false], ['Man', true]]);
    expect(rowOf(model, 'look').options.map((option) => [option.value, option.selected])).toEqual([['1', false], ['2', true]]);
  });

  it('shows each colour as its swatch', () => {
    const colors = rowOf(surferModel(DEFAULT_SURFER), 'color').options;
    expect(colors.map((option) => option.swatch)).toEqual(Object.values(SUIT_COLORS));
  });

  it('names the rash vest by what goes with it on this body', () => {
    const vest = (body: typeof DEFAULT_SURFER.body) => rowOf(surferModel({ ...DEFAULT_SURFER, body }), 'outfit').options[2].label;
    expect(t(vest('surfer1'))).toMatch(/bikini/i);
    expect(t(vest('surfer3'))).toMatch(/boardshorts/i);
  });
});

describe('pickPatch', () => {
  it('picks the body from the sex and look rows, keeping the look across a change of sex', () => {
    const second = { ...DEFAULT_SURFER, body: 'surfer2' as const };
    expect(pickPatch(second, 'sex', 'male')).toEqual({ body: 'surfer4' });
    expect(pickPatch(second, 'look', '1')).toEqual({ body: 'surfer1' });
    expect(pickPatch({ ...DEFAULT_SURFER, body: 'surfer3' }, 'look', '2')).toEqual({ body: 'surfer4' });
  });

  it('passes the other rows through as they are', () => {
    expect(pickPatch(DEFAULT_SURFER, 'outfit', 'vest')).toEqual({ outfit: 'vest' });
    expect(pickPatch(DEFAULT_SURFER, 'board', 'midnight')).toEqual({ board: 'midnight' });
  });
});
