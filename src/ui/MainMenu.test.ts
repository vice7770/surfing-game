import { describe, expect, it } from 'vitest';
import { menuTiles, steamStrip } from './MainMenu';

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

describe('steamStrip (C1)', () => {
  it('offers to connect until a controller has connected once, and says what Safari needs', () => {
    expect(steamStrip('disconnected', false)).toEqual({ label: 'menu.steamConnect', disabled: false });
    expect(steamStrip('unsupported', false)).toEqual({ label: 'menu.steamUnsupported', disabled: true });
    expect(steamStrip('connected', false)).toBeUndefined();
    expect(steamStrip('disconnected', true)).toBeUndefined();
  });
});
