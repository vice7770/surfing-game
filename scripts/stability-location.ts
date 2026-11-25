/**
 * Imported first by the stability benchmark's ride process: the address is empty while the game's modules load, as in
 * every probe bundle (`globalThis.location = { search: '' }` prepended), and the ride sets the real one before it builds
 * its config.
 */
(globalThis as { location?: { search: string } }).location ??= { search: '' };
export {};
