import { describe, expect, it } from 'vitest';
import { menuTiles, steamStrip } from './MainMenu';

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

describe('steamStrip (C1)', () => {
  it('offers to connect until a controller has connected once, and says what Safari needs', () => {
    expect(steamStrip('disconnected', false)).toEqual({ label: 'menu.steamConnect', disabled: false });
    expect(steamStrip('unsupported', false)).toEqual({ label: 'menu.steamUnsupported', disabled: true });
    expect(steamStrip('connected', false)).toBeUndefined();
    expect(steamStrip('disconnected', true)).toBeUndefined();
  });
});
