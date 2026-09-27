import type { Vector3 } from 'three';

/**
 * The surf zone's eddies as a body feels them (the wipeout spec, Part B), a
 * smooth, seeded velocity field of turbulent kinetic energy k:
 * - each component a sum of MODES sinusoids with wavelengths from `shortest` to
 *   `longest`, m (the eddies a bore's roller sheds that push a body about span
 *   half a metre to about the water's depth), random in direction and phase, turning over as a
 *   `turnover` m/s swirl would carry them;
 * - scaled so each component's spread is √(2k/3), isotropic turbulence's share;
 * - about a descending mean of `descend` times that spread: the obliquely
 *   descending eddies under a bore's roller (Nadaoka, Hino & Koyano 1989).
 * Provisional design parameters. A pure function of place, time and k, so a
 * replayed run moves the same way.
 */
export const EDDIES = { shortest: 0.5, longest: 2, turnover: 0.5, descend: 0.3 } as const;

const MODES = 6;

/** Mulberry32: a small seeded generator, uniform in [0, 1). */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Per component and mode: wave vector (kx, ky, kz), angular frequency, phase. */
const WAVES = (() => {
  const next = random(0x5eed);
  const waves = new Float64Array(3 * MODES * 5);
  for (let m = 0; m < 3 * MODES; m += 1) {
    const length = EDDIES.shortest * (EDDIES.longest / EDDIES.shortest) ** next();
    const number = (2 * Math.PI) / length;
    const up = 2 * next() - 1;
    const around = 2 * Math.PI * next();
    const flat = Math.sqrt(1 - up * up);
    waves[m * 5] = number * flat * Math.cos(around);
    waves[m * 5 + 1] = number * up;
    waves[m * 5 + 2] = number * flat * Math.sin(around);
    waves[m * 5 + 3] = number * EDDIES.turnover;
    waves[m * 5 + 4] = 2 * Math.PI * next();
  }
  return waves;
})();

/** Each mode's amplitude for a unit-variance sum. */
const AMPLITUDE = Math.sqrt(2 / MODES);

function component(axis: number, x: number, y: number, z: number, t: number): number {
  let sum = 0;
  for (let j = 0; j < MODES; j += 1) {
    const o = (axis * MODES + j) * 5;
    sum += Math.sin(WAVES[o] * x + WAVES[o + 1] * y + WAVES[o + 2] * z - WAVES[o + 3] * t + WAVES[o + 4]);
  }
  return AMPLITUDE * sum;
}

/** The eddies' velocity at (x, y, z) and time t in turbulence of energy k (m²/s²), into `out`. */
export function eddyVelocity(x: number, y: number, z: number, t: number, k: number, out: Vector3): Vector3 {
  if (!(k > 0)) return out.set(0, 0, 0);
  const spread = Math.sqrt((2 * k) / 3);
  return out.set(
    spread * component(0, x, y, z, t),
    spread * (component(1, x, y, z, t) - EDDIES.descend),
    spread * component(2, x, y, z, t),
  );
}
