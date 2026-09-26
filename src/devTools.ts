/**
 * One switch for the developer tools (plan P8): the Wave Lab, telemetry, the
 * Profile and Below views, and every URL flag (`demo`, `physical`, `record`,
 * `inpage`). Set it to false to ship the game without them.
 */
export const DEV_TOOLS = true;

function currentSearch(): string {
  return globalThis.location?.search ?? '';
}

/** Whether a URL flag such as `?physical` is present, and the dev tools are on. */
export function devFlag(name: string, search = currentSearch(), enabled = DEV_TOOLS): boolean {
  return enabled && new URLSearchParams(search).has(name);
}

/** A URL flag's value (`?demo=carve` → 'carve'), or null when absent or the dev tools are off. */
export function devParam(name: string, search = currentSearch(), enabled = DEV_TOOLS): string | null {
  return enabled ? new URLSearchParams(search).get(name) : null;
}
