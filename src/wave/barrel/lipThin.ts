import { LANDMARK, PROFILE_POINTS, type BarrelCase } from './ProfileLibrary';

/**
 * The hand-thinned lip (ruling 23, 2026-11-12, docs/research/pool-look-reference-2026-11-11/ruling-23.md; the lip-look
 * ruling's rank 4). The owner: the falling lip of the 2 m Wave Pool's tube is "too thick for the size of the wave". The
 * stored case `periodic-pool-straight-big-l13` was run with too much surface tension (Bo 1000), so its young lip is about
 * one capillary length too thick. Until the Bo 4000 run lands (another id, never cut), the underside of this one case is
 * moved toward the top face where its frames are decoded (`libraryFromBytes`), so the drawn loft, the fray look's
 * thickness and the rider's contact read the same cut frames. The stored file does not change.
 *
 * - `on`: the one code constant that turns the cut off (no URL parameter, the owner's order). The game never writes it;
 *   a probe may, before it builds a library, to print before and after.
 * - `cut`: one capillary length, h0 (0.096 m at the shown size, 0.055 H). `half`: never more than this share of the
 *   thickness. `floor`: the least thickness the cut leaves, h0 (2 cm at the shown size).
 * - `fullUntil`, `heldFrom`, `held`: the cut is whole until τ = 0.36 (0.2 s), eases down to `held` of itself by τ = 0.90
 *   (0.5 s) and stays there: the later thickening is real water fed from the crest (the size of the fade is provisional).
 */
export const LIP_THIN: {
  on: boolean; readonly caseId: string; readonly cut: number; readonly half: number; readonly floor: number;
  readonly fullUntil: number; readonly heldFrom: number; readonly held: number;
} = {
  on: true,
  caseId: 'periodic-pool-straight-big-l13',
  cut: 0.0316,
  half: 0.5,
  floor: 0.0066,
  fullUntil: 0.36,
  heldFrom: 0.9,
  held: 0.35,
};

const FLOATS = 2 * PROFILE_POINTS;
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** The cut's share at clock τ (√(h0/g)): 1 until `fullUntil`, eased down to `held` at `heldFrom`, then `held`. */
export function lipThinShare(tau: number): number {
  return 1 - (1 - LIP_THIN.held) * smooth((tau - LIP_THIN.fullUntil) / (LIP_THIN.heldFrom - LIP_THIN.fullUntil));
}

/**
 * One frame's underside (points 65 to 87) moved toward its top run (points 32 to 64), in place, at clock τ; `source` is
 * the frame as stored (it may be `frame` itself: every read comes before the point's write, and reads only the top run
 * and the underside's own stored places). Per point: t, its distance to the top run, and the direction to its nearest
 * point there; s, its share of the underside's arc from the throat (0) to the tip (1); the move is
 * smoothstep(s) · share(τ) · min(cut, half · t), no more than t − floor, never under 0. The tip, the top face, the throat
 * and all the rest stay as they are. Returns how many points moved. Only + − × ÷ and √.
 */
export function thinFrame(source: Float32Array, frame: Float32Array, offset: number, tau: number): number {
  if (!(tau > 0)) return 0;
  const x = (i: number) => source[offset + 2 * i];
  const y = (i: number) => source[offset + 2 * i + 1];
  const lengths = new Float64Array(PROFILE_POINTS);
  let under = 0;
  for (let i = LANDMARK.throat; i > LANDMARK.lip; i -= 1) {
    const dx = x(i - 1) - x(i);
    const dy = y(i - 1) - y(i);
    under += Math.sqrt(dx * dx + dy * dy);
    lengths[i - 1] = under;
  }
  if (!(under > 0)) return 0;
  const share = lipThinShare(tau);
  const moves = new Float64Array(2 * PROFILE_POINTS);
  let moved = 0;
  for (let i = LANDMARK.lip + 1; i < LANDMARK.throat; i += 1) {
    const px = x(i);
    const py = y(i);
    let best = Infinity;
    let qx = px;
    let qy = py;
    for (let k = LANDMARK.crest; k < LANDMARK.lip; k += 1) {
      const ax = x(k);
      const ay = y(k);
      const dx = x(k + 1) - ax;
      const dy = y(k + 1) - ay;
      const l2 = dx * dx + dy * dy;
      const u = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
      const ex = ax + u * dx - px;
      const ey = ay + u * dy - py;
      const d2 = ex * ex + ey * ey;
      if (d2 < best) {
        best = d2;
        qx = ax + u * dx;
        qy = ay + u * dy;
      }
    }
    const t = Math.sqrt(best);
    const cut = Math.max(0, Math.min(smooth(lengths[i] / under) * share * Math.min(LIP_THIN.cut, LIP_THIN.half * t), t - LIP_THIN.floor));
    if (!(cut > 0)) continue;
    moves[2 * i] = (cut * (qx - px)) / t;
    moves[2 * i + 1] = (cut * (qy - py)) / t;
    moved += 1;
  }
  if (moved === 0) return 0;
  for (let i = LANDMARK.lip + 1; i < LANDMARK.throat; i += 1) {
    if (moves[2 * i] === 0 && moves[2 * i + 1] === 0) continue;
    frame[offset + 2 * i] = x(i) + moves[2 * i];
    frame[offset + 2 * i + 1] = y(i) + moves[2 * i + 1];
  }
  return moved;
}

/**
 * A decoded case with its lip thinned by hand (`LIP_THIN`): `periodic-pool-straight-big-l13` alone, and only while
 * `LIP_THIN.on`; any other case, and that one with the constant off, comes back as the same object. The cut case keeps
 * the frames as stored in `storedFrames`: the crash's water and the held frame are read from those (`ProfileLibrary`,
 * `CrashCurve`), so the solver's jets and the tube's clocks do not change (ruling 23's must-not).
 */
export function thinLip(c: BarrelCase): BarrelCase {
  if (!LIP_THIN.on || c.id !== LIP_THIN.caseId) return c;
  const frames = c.frames.slice();
  const count = frames.length / FLOATS;
  for (let f = 0; f < count; f += 1) thinFrame(c.frames, frames, f * FLOATS, c.tauStart + f * c.tauStep);
  return { ...c, frames, storedFrames: c.frames };
}
