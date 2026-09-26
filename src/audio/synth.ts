/**
 * Synthesised sounds (S1): every sound the game plays exists here as shaped
 * noise, so the game sounds complete before any recording loads, and if one
 * fails. Pure DSP on plain arrays: seeded, so the same seed gives the same sound.
 * Loops are LOOP_SECONDS long and crossfade their ends so they repeat without a click.
 */
export const SOUND_IDS = [
  'roar', 'distant', 'wind', 'rush', 'rail', 'bubbles',
  'lipJet', 'lipRoller', 'paddle', 'popUp', 'plunge', 'click', 'chime',
] as const;
export type SoundId = (typeof SOUND_IDS)[number];

const LOOPS: ReadonlySet<SoundId> = new Set(['roar', 'distant', 'wind', 'rush', 'rail', 'bubbles']);
export const isLoop = (id: SoundId): boolean => LOOPS.has(id);

/** Samples backed by a plain ArrayBuffer, as Web Audio's buffers take them. */
type Samples = Float32Array<ArrayBuffer>;

/** Seconds of each synthesised loop. */
export const LOOP_SECONDS = 4;
/** Seconds of the crossfade that joins a loop's end to its start. */
const SEAM_SECONDS = 0.25;
const PEAK = 0.9;

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

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** One-pole low-pass at `hz`, in place. */
function lowPass(samples: Samples, hz: number, rate: number): Samples {
  const a = 1 - Math.exp((-2 * Math.PI * hz) / rate);
  let y = 0;
  for (let i = 0; i < samples.length; i += 1) {
    y += a * (samples[i] - y);
    samples[i] = y;
  }
  return samples;
}

/** One-pole high-pass at `hz`, in place. */
function highPass(samples: Samples, hz: number, rate: number): Samples {
  const a = Math.exp((-2 * Math.PI * hz) / rate);
  let previousIn = 0;
  let y = 0;
  for (let i = 0; i < samples.length; i += 1) {
    y = a * (y + samples[i] - previousIn);
    previousIn = samples[i];
    samples[i] = y;
  }
  return samples;
}

function whiteNoise(length: number, next: () => number): Samples {
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i += 1) samples[i] = next() * 2 - 1;
  return samples;
}

/** Brown noise: leaky integrated white noise, the low rumble of distant water. */
function brownNoise(length: number, next: () => number): Samples {
  const samples = new Float32Array(length);
  let y = 0;
  for (let i = 0; i < length; i += 1) {
    y = 0.998 * y + (next() * 2 - 1) * 0.06;
    samples[i] = y;
  }
  return samples;
}

/** Scale to the common peak. */
function normalize(samples: Samples): Samples {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  if (peak > 0) for (let i = 0; i < samples.length; i += 1) samples[i] *= PEAK / peak;
  return samples;
}

/** Slow swells in loudness: a few sines with whole periods in the loop, starting at random phases. */
function swell(samples: Samples, rate: number, depth: number, next: () => number): void {
  const periods = [1, 2, 3];
  const phases = periods.map(() => next() * 2 * Math.PI);
  const seconds = samples.length / rate;
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / rate;
    let m = 0;
    periods.forEach((cycles, k) => { m += Math.sin((2 * Math.PI * cycles * t) / seconds + phases[k]); });
    samples[i] *= 1 - depth + depth * (0.5 + m / (2 * periods.length));
  }
}

/**
 * A loop: `make` fills LOOP_SECONDS + SEAM_SECONDS of sound (told where the loop
 * ends); the extra is crossfaded over the start so the end runs into it.
 */
function loop(rate: number, make: (length: number, end: number) => Samples): Samples {
  const length = Math.round(LOOP_SECONDS * rate);
  const seam = Math.round(SEAM_SECONDS * rate);
  const long = make(length + seam, length);
  const out = long.slice(0, length);
  for (let i = 0; i < seam; i += 1) {
    const w = i / seam;
    out[i] = long[i] * w + long[length + i] * (1 - w);
  }
  return normalize(out);
}

/** A decaying envelope with an attack, seconds. */
function envelope(samples: Samples, rate: number, attack: number, decay: number): Samples {
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / rate;
    samples[i] *= Math.min(1, t / attack) * Math.exp(-t / decay);
  }
  return samples;
}

/** A thump: a sine falling in pitch under a fast decay. */
function thump(length: number, rate: number, from: number, to: number, decay: number): Samples {
  const samples = new Float32Array(length);
  let phase = 0;
  for (let i = 0; i < length; i += 1) {
    const t = i / rate;
    phase += (2 * Math.PI * (to + (from - to) * Math.exp(-t / decay))) / rate;
    samples[i] = Math.sin(phase) * Math.exp(-t / decay);
  }
  return samples;
}

function mix(a: Samples, b: Samples, gain = 1): Samples {
  for (let i = 0; i < a.length; i += 1) a[i] += gain * b[i];
  return a;
}

/** Sparse bubbles: short resonant blips rising in pitch, over a low rumble; none straddles the loop's end, where it wraps. */
function bubbles(length: number, end: number, rate: number, next: () => number): Samples {
  const samples = lowPass(brownNoise(length, next), 200, rate);
  for (let i = 0; i < samples.length; i += 1) samples[i] *= 0.3;
  let at = 0;
  while (at < length) {
    at += Math.round((0.03 + next() * 0.15) * rate);
    const pitch = 500 + next() * 1500;
    const blip = Math.round(0.04 * rate);
    if (at < end && at + blip > end) continue;
    let phase = 0;
    for (let i = 0; i < blip && at + i < length; i += 1) {
      const t = i / rate;
      phase += (2 * Math.PI * pitch * (1 + 3 * t)) / rate;
      samples[at + i] += 0.6 * Math.sin(phase) * Math.exp(-t / 0.012);
    }
  }
  return samples;
}

export function synthesize(id: SoundId, rate: number, seed = 1): Samples {
  const next = random(hash(id) ^ Math.imul(seed, 2654435761));
  const seconds = (s: number) => Math.round(s * rate);
  switch (id) {
    case 'roar':
      return loop(rate, (n) => {
        const s = mix(lowPass(brownNoise(n, next), 700, rate), highPass(whiteNoise(n, next), 1200, rate), 0.08);
        swell(s, rate, 0.6, next);
        return s;
      });
    case 'distant':
      return loop(rate, (n) => {
        const s = lowPass(brownNoise(n, next), 260, rate);
        swell(s, rate, 0.4, next);
        return s;
      });
    case 'wind':
      return loop(rate, (n) => {
        const s = highPass(lowPass(whiteNoise(n, next), 1400, rate), 300, rate);
        swell(s, rate, 0.7, next);
        return s;
      });
    case 'rush':
      return loop(rate, (n) => highPass(lowPass(whiteNoise(n, next), 6000, rate), 900, rate));
    case 'rail':
      return loop(rate, (n) => {
        const s = highPass(whiteNoise(n, next), 2500, rate);
        for (let i = 0; i < s.length; i += 1) s[i] *= 0.6 + 0.4 * Math.sin((2 * Math.PI * 9 * i) / rate + next() * 0.2);
        return s;
      });
    case 'bubbles':
      return loop(rate, (n, end) => bubbles(n, end, rate, next));
    case 'lipJet': {
      const n = seconds(1.3);
      return normalize(mix(envelope(lowPass(whiteNoise(n, next), 1800, rate), rate, 0.01, 0.35), thump(n, rate, 90, 38, 0.18), 0.9));
    }
    case 'lipRoller': {
      const n = seconds(1.1);
      return normalize(envelope(highPass(lowPass(whiteNoise(n, next), 3000, rate), 200, rate), rate, 0.06, 0.3));
    }
    case 'paddle': {
      const n = seconds(0.35);
      return normalize(envelope(highPass(lowPass(whiteNoise(n, next), 4500, rate), 700, rate), rate, 0.005, 0.07));
    }
    case 'popUp': {
      const n = seconds(0.45);
      return normalize(mix(envelope(lowPass(whiteNoise(n, next), 2500, rate), rate, 0.005, 0.08), thump(n, rate, 140, 70, 0.06), 0.7));
    }
    case 'plunge': {
      const n = seconds(1.4);
      return normalize(mix(envelope(lowPass(whiteNoise(n, next), 2200, rate), rate, 0.01, 0.4), thump(n, rate, 110, 45, 0.2), 0.7));
    }
    case 'click': {
      const n = seconds(0.03);
      return normalize(envelope(highPass(whiteNoise(n, next), 3000, rate), rate, 0.0005, 0.004));
    }
    case 'chime': {
      const n = seconds(0.9);
      const s = new Float32Array(n);
      for (let i = 0; i < n; i += 1) {
        const t = i / rate;
        s[i] = (Math.sin(2 * Math.PI * 880 * t) + 0.5 * Math.sin(2 * Math.PI * 1320 * t)) * Math.min(1, t / 0.005) * Math.exp(-t / 0.25);
      }
      return normalize(s);
    }
  }
}
