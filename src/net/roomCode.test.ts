import { describe, expect, it } from 'vitest';
import { ROOM_CODE_ALPHABET, newRoomCode, normalizeRoomCode, roomCodeFromSearch, roomLink } from './roomCode';

const bytes = (...values: number[]) => () => Uint8Array.from(values);

describe('room codes', () => {
  it('draws 8 characters without look-alikes', () => {
    const code = newRoomCode(() => Uint8Array.from({ length: 16 }, (_, i) => i * 13));
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
  });

  it('skips bytes that would favour the alphabet\'s first letters', () => {
    const code = newRoomCode(bytes(255, 250, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9));
    expect(code).toBe(ROOM_CODE_ALPHABET.slice(0, 8));
  });

  it('keeps drawing until it has 8 characters', () => {
    let calls = 0;
    const code = newRoomCode((count) => {
      calls += 1;
      return Uint8Array.from({ length: count }, (_, i) => (calls === 1 && i > 2 ? 255 : i));
    });
    expect(code).toHaveLength(8);
    expect(calls).toBe(2);
  });

  it('normalizes what a player types or pastes', () => {
    expect(normalizeRoomCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(normalizeRoomCode('ABCD')).toBeUndefined();
    expect(normalizeRoomCode('ABCDEFG0')).toBeUndefined();
  });

  it('reads and writes links', () => {
    expect(roomCodeFromSearch('?room=abcd2345')).toBe('ABCD2345');
    expect(roomCodeFromSearch('?physical')).toBeUndefined();
    expect(roomCodeFromSearch('?room=nope')).toBeUndefined();
    expect(roomLink('https://example.fly.dev', 'ABCD2345')).toBe('https://example.fly.dev/?room=ABCD2345');
  });
});
