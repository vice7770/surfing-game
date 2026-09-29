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
  /** PROFILE_POINTS (x, y) pairs, h0. */
  profile: [number, number][];
}

/** A whole `library.py` output: the run's parameters and its frames. */
export interface LibraryJson {
  run: { level: number; dx_h0: number; slope: number; A0: number; h0_m: number; time_scale_s: number; t_vertical: number; t_impact: number };
  frames: LibraryFrame[];
}

/**
 * A Basilisk run's library (the advisor's `library.py`) as a barrel case. Its tube ends at touchdown and blends into
 * the roller later (basilisk-profiles.md, decision 4), and after touchdown the landmarks lose their meaning (round 6
 * §5.2), so the case keeps its frames up to one past touchdown. x is re-origined on the crest as the face goes
 * vertical (between the two frames either side of τ = 0). Frames whose landmark checks failed are refilled linearly from their nearest clean neighbours, and counted.
 */
export function caseFromLibrary(json: LibraryJson, id: string, flatDepth: number): { barrel: BarrelCase; refilled: number } {
  const firstPost = json.frames.findIndex((frame) => frame.phase === 'post');
  const kept = json.frames.slice(0, firstPost < 0 ? json.frames.length : firstPost + 1);
  const clean = kept.map((frame) => frame.flags.length === 0);
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
      const [xa, ya] = kept[a].profile[p];
      const [xb, yb] = kept[b].profile[p];
      frames[i * floats + 2 * p] = xa + t * (xb - xa);
      frames[i * floats + 2 * p + 1] = ya + t * (yb - ya);
    }
  }
  // The crest at τ = 0, linear between the two frames either side, as ProfileLibrary reads them.
  const tauStep = kept.length > 1 ? kept[1].tau - kept[0].tau : 1;
  const position = Math.min(kept.length - 1, Math.max(0, (0 - kept[0].tau) / tauStep));
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
      tauStep,
      tauStart: kept[0].tau,
      touchdown: json.run.t_impact - json.run.t_vertical,
      frames,
    },
    refilled,
  };
}
