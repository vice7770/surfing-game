/**
 * Every piece of player-facing text, in English (plan P8). Keys are flat and
 * dotted; `{name}` marks a value filled in by `t`. Text shown only with the dev
 * tools on (the Wave Lab, readouts, telemetry) stays where it is.
 */
export const EN = {
  'app.name': 'Breakline',
  'app.tagline': 'Surf simulator',
  'menu.surf': 'Surf',
  'menu.waveLab': 'Wave Lab',
  'menu.multiplayer': 'Multiplayer',
  'menu.comingSoon': 'Coming soon',
  'menu.logbook': 'Logbook',
  'menu.settings': 'Settings',
  'menu.fullscreen': 'Fullscreen',
  'menu.exitFullscreen': 'Exit fullscreen',
  'menu.version': 'v{version}',
  'loading.break': 'Setting the break…',
  'loading.paddleOut': 'Paddling out…',
  'ride.reason.balance': 'Lost balance',
  'ride.reason.footSlip': 'Feet slipped',
  'ride.reason.lostBoard': 'Lost the board',
  'ride.reason.impact': 'Hit by the lip',
  'ride.reason.retry': 'Paddled back out',
  'ride.reason.outOfWave': 'Rode it out',
} as const;

export type StringKey = keyof typeof EN;

/** The text for `key`, with each `{name}` replaced from `vars`; a missing value is a bug and throws. */
export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  return EN[key].replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!(name in vars)) throw new Error(`Missing value for {${name}} in "${key}"`);
    return String(vars[name]);
  });
}
