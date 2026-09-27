import { describe, expect, it } from 'vitest';
import { onlineHudModel, playersModel } from './OnlineHud';

const now = 10_000;
const feed = [
  { id: 2, name: 'Ana', distance: 42, seconds: 6.14, until: now + 1000 },
  { id: 3, name: 'Bea', distance: 12, seconds: 3.2, until: now - 1 },
];

describe('onlineHudModel', () => {
  it('lists the rides still in the feed, in the player\'s units', () => {
    expect(onlineHudModel({ status: 'open', phase: 'riding', feed, units: 'metric', now }).feed).toEqual(['Ana · 42 m · 6.1 s']);
    expect(onlineHudModel({ status: 'open', phase: 'riding', feed, units: 'imperial', now }).feed).toEqual(['Ana · 138 ft · 6.1 s']);
  });

  it('says what is going on: reconnecting first, then catching up, then a respawn\'s countdown', () => {
    expect(onlineHudModel({ status: 'reconnecting', phase: 'catching-up', feed: [], units: 'metric', now }).notice).toBe('Reconnecting…');
    expect(onlineHudModel({ status: 'open', phase: 'catching-up', feed: [], units: 'metric', now }).notice).toBe('Catching up with the sea…');
    expect(onlineHudModel({ status: 'open', phase: 'catching-up', behind: 12.3, feed: [], units: 'metric', now }).notice).toBe('Catching up with the sea… 13 s to go');
    expect(onlineHudModel({ status: 'open', phase: 'resyncing', feed: [], units: 'metric', now }).notice).toBe('Catching up with the sea…');
    expect(onlineHudModel({ status: 'open', phase: 'riding', respawnIn: 2.2, feed: [], units: 'metric', now }).notice).toBe('Back in the lineup in 3 s');
    expect(onlineHudModel({ status: 'open', phase: 'riding', feed: [], units: 'metric', now }).notice).toBeUndefined();
  });
});

describe('playersModel', () => {
  const players = [{ id: 1, name: 'Ana', look: { body: '', outfit: '', color: '', board: '' } }, { id: 2, name: '<b>Bea</b>', look: { body: '', outfit: '', color: '', board: '' } }];

  it('offers Kick to the creator only, and never on their own row', () => {
    expect(playersModel(players, 1, true)).toEqual([
      { id: 1, name: 'Ana', you: true, kick: false },
      { id: 2, name: '<b>Bea</b>', you: false, kick: true },
    ]);
    expect(playersModel(players, 2, false).every((row) => !row.kick)).toBe(true);
  });
});
