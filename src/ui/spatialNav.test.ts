import { describe, expect, it } from 'vitest';
import { spatialNext, type Rect } from './spatialNav';

const tile = (column: number, row: number): Rect => ({ x: column * 110, y: row * 110, width: 100, height: 100 });

describe('spatialNext', () => {
  const grid = [tile(0, 0), tile(1, 0), tile(2, 0), tile(0, 1), tile(1, 1), tile(2, 1)];

  it('moves to the neighbour in the pressed direction', () => {
    expect(spatialNext(grid, 0, 'right')).toBe(1);
    expect(spatialNext(grid, 1, 'down')).toBe(4);
    expect(spatialNext(grid, 4, 'up')).toBe(1);
  });

  it('stays put at an edge', () => {
    expect(spatialNext(grid, 0, 'left')).toBe(0);
    const column = [tile(0, 0), tile(0, 1), tile(0, 2)];
    expect(spatialNext(column, 1, 'right')).toBe(1);
  });

  it('prefers the item in line over a nearer one off to the side', () => {
    const items = [{ x: 0, y: 0, width: 100, height: 40 }, { x: 0, y: 200, width: 100, height: 40 }, { x: 150, y: 60, width: 100, height: 40 }];
    expect(spatialNext(items, 0, 'down')).toBe(1);
  });
});
