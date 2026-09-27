import { describe, expect, it } from 'vitest';
import { menuTiles } from './MainMenu';

describe('menuTiles', () => {
  // L1: the Wave Lab is for everyone now; L2: the Surf School comes right after Surf.
  it('offers Surf, the Surf School and the Wave Lab to everyone', () => {
    expect(menuTiles(true).map((tile) => tile.id)).toEqual(['surf', 'school', 'waveLab', 'multiplayer', 'logbook', 'settings']);
  });

  // L2: new players are pointed at the first lesson.
  it('badges the Surf School "Start here" until the first lesson is passed', () => {
    expect(menuTiles(false).find((tile) => tile.id === 'school')?.badge).toBe('menu.startHere');
    expect(menuTiles(true).find((tile) => tile.id === 'school')?.badge).toBeUndefined();
  });

  // N1: online play is here.
  it('opens multiplayer like any other tile', () => {
    const tiles = menuTiles(true);
    expect(tiles.filter((tile) => tile.disabled)).toEqual([]);
    expect(tiles.find((tile) => tile.id === 'multiplayer')?.badge).toBeUndefined();
  });
});
