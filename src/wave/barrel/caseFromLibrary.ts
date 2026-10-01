import { LANDMARK, PROFILE_POINTS, type BarrelCase } from './ProfileLibrary';

/** One frame of `tools/basilisk/analysis/library.py`'s output (round 6 §5.1). */
export interface LibraryFrame {
  t: number;
  tau: number;
  tau_s: number;
  phase: 'pre' | 'open' | 'post';
  /** The landmark checks that failed; such a frame is unreliable. */
  flags: string[];
  /** The crest's height above still water, h0. */
  H: number;
  /** PROFILE_POINTS (x, y) pairs, h0; null where the resampling failed. */
  profile: [number, number][] | null;
}

/** A whole `library.py` output: the run's parameters and its frames. */
export interface LibraryJson {
  run: { level: number; dx_h0: number; slope: number; A0: number; h0_m: number; time_scale_s: number; t_vertical: number; t_impact: number };
  frames: LibraryFrame[];
}

/** The tip's fit: a least-squares line over ±this many frames (±0.1 τ at the cases' 0.025 step; the advisor, 2026-09-30). */
export const TIP_FIT_FRAMES = 4;

/**
 * The lip tip's velocity per frame, in √(g h0) (h0 per √(h0/g)): the slope of a least-squares line through its positions
 * over ±TIP_FIT_FRAMES frames, fewer at the ends. Landmarks step a cell at a time, so frame-to-frame differences
 * quantise at about 0.33 C (the advisor's ruling 1, 2026-09-30).
 */
export function tipVelocities(frames: Float32Array, step: number): Float32Array {
  const floats = 2 * PROFILE_POINTS;
  const count = frames.length / floats;
  const out = new Float32Array(2 * count);
  for (let i = 0; i < count; i += 1) {
    const from = Math.max(0, i - TIP_FIT_FRAMES);
    const to = Math.min(count - 1, i + TIP_FIT_FRAMES);
    if (to === from) continue;
    const mean = (from + to) / 2;
    let sxx = 0;
    let sx = 0;
    let sy = 0;
    for (let k = from; k <= to; k += 1) {
      const d = k - mean;
      sxx += d * d;
      sx += d * frames[k * floats + 2 * LANDMARK.lip];
      sy += d * frames[k * floats + 2 * LANDMARK.lip + 1];
    }
    out[2 * i] = sx / sxx / step;
    out[2 * i + 1] = sy / sxx / step;
  }
  return out;
}

const RUN_FIELDS = ['level', 'dx_h0', 'slope', 'A0', 'h0_m', 'time_scale_s', 't_vertical', 't_impact'] as const;

/**
 * library.py writes the run's fields at the top level (and `run` as its directory); the repo's samples
 * (export_sample.py) nest them under `run`. Either, as LibraryJson.
 */
export function libraryJson(raw: Record<string, unknown>): LibraryJson {
  if (typeof raw.run === 'object' && raw.run !== null) return raw as unknown as LibraryJson;
  const run = Object.fromEntries(RUN_FIELDS.map((field) => [field, raw[field]])) as LibraryJson['run'];
  return { run, frames: raw.frames as LibraryFrame[] };
}

/** How a conversion treats flagged frames. */
export interface ConversionOptions {
  /**
   * Keep a frame whose only flags are landmark jumps when the frame before it is torn (`surface_torn_in_window`): its
   * jumps were measured against the torn trace, not the wave (reef60's early open frames; the advisor's ruling,
   * PR 7). The torn frames themselves are refilled.
   */
  jumpsAfterTorn?: boolean;
}

const TORN = 'surface_torn_in_window';

/**
 * A Basilisk run's library (the advisor's `library.py`) as a barrel case. Its tube ends at touchdown and blends into
 * the roller later (basilisk-profiles.md, decision 4), and after touchdown the landmarks lose their meaning (round 6
 * §5.2), so the case keeps its frames up to one past touchdown. x is re-origined on the crest as the face goes
 * vertical (between the two frames either side of τ = 0). Frames whose landmark checks failed are refilled linearly from their nearest clean neighbours, and counted.
 * The lip tip's velocity is fitted per frame (`tipVelocities`), for the contact's lip flow.
 */
export function caseFromLibrary(
  json: LibraryJson, id: string, flatDepth: number, options: ConversionOptions = {},
): { barrel: BarrelCase; refilled: number } {
  const firstPost = json.frames.findIndex((frame) => frame.phase === 'post');
  const kept = json.frames.slice(0, firstPost < 0 ? json.frames.length : firstPost + 1);
  const step = kept.length > 1 ? kept[1].tau - kept[0].tau : 1;
  kept.forEach((frame, i) => {
    // Frames before library.py's TMIN come at the coarse output interval; the case needs one step throughout.
    if (Math.abs(frame.tau - kept[0].tau - i * step) > 0.01 * step) throw new Error(`${id}: frame ${i} breaks the τ step ${step}; pass library.py the fine output's start`);
  });
  const jumpsOnlyAfterTorn = (i: number) =>
    options.jumpsAfterTorn === true && i > 0 && kept[i - 1].flags.includes(TORN) && kept[i].flags.every((flag) => flag.startsWith('jump_'));
  const clean = kept.map((frame, i) => frame.profile !== null && (frame.flags.length === 0 || jumpsOnlyAfterTorn(i)));
  if (!clean.some(Boolean)) throw new Error(`${id}: no frame up to touchdown passed its landmark checks`);
  const nearestClean = (i: number, step: 1 | -1) => {
    for (let j = i + step; j >= 0 && j < kept.length; j += step) if (clean[j]) return j;
    return -1;
  };
  const floats = 2 * PROFILE_POINTS;
  const frames = new Float32Array(kept.length * floats);
  let refilled = 0;
  for (let i = 0; i < kept.length; i += 1) {
    let a = i;
    let b = i;
    let t = 0;
    if (!clean[i]) {
      refilled += 1;
      const before = nearestClean(i, -1);
      const after = nearestClean(i, 1);
      a = before >= 0 ? before : after >= 0 ? after : i;
      b = after >= 0 ? after : a;
      t = a === b ? 0 : (i - a) / (b - a);
    }
    for (let p = 0; p < PROFILE_POINTS; p += 1) {
      const [xa, ya] = kept[a].profile![p];
      const [xb, yb] = kept[b].profile![p];
      frames[i * floats + 2 * p] = xa + t * (xb - xa);
      frames[i * floats + 2 * p + 1] = ya + t * (yb - ya);
    }
  }
  // The crest at τ = 0, linear between the two frames either side, as ProfileLibrary reads them.
  const position = Math.min(kept.length - 1, Math.max(0, (0 - kept[0].tau) / step));
  const f = Math.floor(position);
  const next = Math.min(kept.length - 1, f + 1);
  const crestAt = (frame: number) => frames[frame * floats + 2 * LANDMARK.crest];
  const originX = crestAt(f) + (position - f) * (crestAt(next) - crestAt(f));
  for (let i = 0; i < frames.length; i += 2) frames[i] -= originX;
  const lastOpen = kept.filter((frame) => frame.phase === 'open').at(-1) ?? kept[kept.length - 1];
  return {
    barrel: {
      id,
      slope: json.run.slope,
      nonlinearity: json.run.A0,
      flatDepth,
      breakerHeight: lastOpen.H,
      tauStep: step,
      tauStart: kept[0].tau,
      touchdown: json.run.t_impact - json.run.t_vertical,
      frames,
      tipVelocity: tipVelocities(frames, step),
    },
    refilled,
  };
}
