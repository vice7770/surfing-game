import { describe, expect, it } from 'vitest';
import { menuTiles } from './MainMenu';

describe('menuTiles', () => {
  // L1: the Wave Lab is for everyone now.
  it('offers the Wave Lab to everyone', () => {
    expect(menuTiles().map((tile) => tile.id)).toEqual(['surf', 'waveLab', 'multiplayer', 'logbook', 'settings']);
  });

  // N1: online play is here.
  it('opens multiplayer like any other tile', () => {
    const tiles = menuTiles();
    expect(tiles.filter((tile) => tile.disabled)).toEqual([]);
    expect(tiles.find((tile) => tile.id === 'multiplayer')?.badge).toBeUndefined();
  });
});
