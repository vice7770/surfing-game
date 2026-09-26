import { describe, expect, it } from 'vitest';
import { menuTiles } from './MainMenu';

describe('menuTiles', () => {
  it('offers the Wave Lab only with the dev tools on', () => {
    expect(menuTiles(false).map((tile) => tile.id)).toEqual(['surf', 'multiplayer', 'logbook', 'settings']);
    expect(menuTiles(true).map((tile) => tile.id)).toEqual(['surf', 'waveLab', 'multiplayer', 'logbook', 'settings']);
  });

  it('shows multiplayer as coming soon, and nothing else disabled', () => {
    const tiles = menuTiles(true);
    expect(tiles.filter((tile) => tile.disabled).map((tile) => tile.id)).toEqual(['multiplayer']);
    expect(tiles.find((tile) => tile.id === 'multiplayer')?.badge).toBe('menu.comingSoon');
  });
});
