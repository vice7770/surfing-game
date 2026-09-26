/** Room code characters: no 0/O or 1/I/L, so a code read aloud or typed is unambiguous. */
export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 8;
/** Bytes at or above this would favour the alphabet's first letters (256 = 8 × 31 + 8). */
const UNBIASED = ROOM_CODE_ALPHABET.length * Math.floor(256 / ROOM_CODE_ALPHABET.length);

/** A fresh room code from random bytes (the server's `crypto.getRandomValues`). */
export function newRoomCode(random: (count: number) => Uint8Array): string {
  let code = '';
  while (code.length < ROOM_CODE_LENGTH) {
    for (const byte of random(ROOM_CODE_LENGTH * 2)) {
      if (byte >= UNBIASED) continue;
      code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
      if (code.length === ROOM_CODE_LENGTH) break;
    }
  }
  return code;
}

/** A typed or pasted code, upper-cased without spaces or dashes; undefined unless it is a valid code. */
export function normalizeRoomCode(raw: string): string | undefined {
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== ROOM_CODE_LENGTH) return undefined;
  for (const character of code) if (!ROOM_CODE_ALPHABET.includes(character)) return undefined;
  return code;
}

/** The room a link names (`?room=CODE`). */
export function roomCodeFromSearch(search: string): string | undefined {
  const raw = new URLSearchParams(search).get('room');
  return raw ? normalizeRoomCode(raw) : undefined;
}

export function roomLink(origin: string, code: string): string {
  return `${origin}/?room=${code}`;
}
