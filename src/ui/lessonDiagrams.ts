import type { LessonId } from '../game/school/lessons';

/** A 120×80 line drawing in the text colour, like the menus' icons (plan P8). */
const svg = (body: string) =>
  `<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** A wave's face seen from the side, breaking to the right: the crest and the curl. */
const face = '<path d="M4 70 C 34 70 56 64 72 44 C 82 30 94 20 106 22 C 114 24 116 32 110 36" opacity=".45"/>';
/** An arrowhead at (x, y) pointing along angle a, degrees. */
const head = (x: number, y: number, a: number) => {
  const r = (a * Math.PI) / 180;
  const p = (d: number, s: number) => `${(x - 7 * Math.cos(r + s * d)).toFixed(1)} ${(y - 7 * Math.sin(r + s * d)).toFixed(1)}`;
  return `<path d="M${p(0.5, 1)} L${x} ${y} L${p(0.5, -1)}"/>`;
};
/** A surfer standing on a board centred at (x, y), knees bent by `bend` (0 tall to 1 low). */
const surfer = (x: number, y: number, bend = 0) => {
  const hip = y - 14 + 5 * bend;
  const shoulder = hip - 12;
  return `<path d="M${x - 14} ${y} L${x + 14} ${y}"/>`
    + `<path d="M${x - 6} ${y - 1} L${x - 3 - 3 * bend} ${hip + 6} L${x} ${hip} L${x + 3 + 3 * bend} ${hip + 6} L${x + 6} ${y - 1}"/>`
    + `<path d="M${x} ${hip} L${x} ${shoulder}"/><circle cx="${x}" cy="${shoulder - 4}" r="3.5"/>`
    + `<path d="M${x - 11} ${shoulder + 4} L${x} ${shoulder + 1} L${x + 11} ${shoulder + 4}"/>`;
};
/** A surfer lying on a board at (x, y), head to the right. */
const prone = (x: number, y: number) =>
  `<path d="M${x - 16} ${y} L${x + 16} ${y}"/><path d="M${x - 12} ${y - 4} L${x + 6} ${y - 4}"/><circle cx="${x + 10}" cy="${y - 6}" r="3.5"/>`;

/** Each lesson's diagram (spec L2), beside its explanation. */
export const LESSON_DIAGRAMS: Record<LessonId, string> = {
  // The board from behind, tipped onto one rail and then the other, with the carve each way.
  lean: svg('<path d="M44 58 L76 50"/><path d="M60 54 L60 30"/><circle cx="60" cy="25" r="4"/>'
    + '<path d="M40 40 C 30 36 24 28 24 18"/>' + head(24, 18, -90) + '<path d="M80 40 C 90 36 96 28 96 18"/>' + head(96, 18, -90)),
  // The board from the side: weight forward runs, weight back slows.
  trim: svg('<path d="M14 56 C 40 60 80 60 106 52"/><circle cx="60" cy="40" r="5"/>'
    + '<path d="M66 40 L88 40"/>' + head(88, 40, 0) + '<path d="M54 40 L32 40"/>' + head(32, 40, 180)
    + '<path d="M88 66 L100 66" opacity=".6"/><path d="M20 66 L26 66" opacity=".6"/>'),
  // Low through the turn, tall out of it.
  crouch: svg(`${surfer(34, 64, 1)}${surfer(86, 64, 0)}<path d="M50 30 C 58 22 64 22 70 30"/>${head(70, 30, 50)}`),
  // Down the face, round at the bottom, back up.
  bottomTurn: svg(`${face}<path d="M76 34 C 64 52 50 66 36 64 C 26 62 30 50 40 42"/>${head(40, 42, -40)}`),
  // Up to the lip, round at the top, back down.
  topTurn: svg(`${face}<path d="M40 64 C 56 56 72 40 84 26 C 92 18 98 26 90 36 C 84 44 72 52 60 58"/>${head(60, 58, 150)}`),
  // A hand trailing in the face, the curl catching up.
  hand: svg(`${face}${surfer(60, 56, 0.6)}<path d="M71 43 L78 52" /><path d="M80 56 C 86 58 92 58 96 56" opacity=".6"/>`
    + `<path d="M104 30 C 98 38 92 44 84 46"/>${head(84, 46, 160)}`),
  // The pocket: high on the face, just ahead of the curl.
  pocket: svg(`${face}<path d="M92 20 C 100 12 112 16 112 26" opacity=".45"/><rect x="72" y="26" width="24" height="22" rx="4" stroke-dasharray="3 4"/>`
    + surfer(84, 44, 0.3)),
  // Lying down, then up on the feet in one move.
  popUp: svg(`${prone(28, 58)}<path d="M50 50 L66 50"/>${head(66, 50, 0)}${surfer(90, 62, 0.4)}`),
  // Paddling ahead of the wave as it comes.
  catch: svg(`<path d="M4 64 C 20 64 30 58 38 46 C 44 38 50 34 56 36" opacity=".45"/>${prone(80, 60)}`
    + '<path d="M72 64 C 70 70 64 72 60 70"/><path d="M84 64 C 82 70 76 72 72 70"/>' + `<path d="M98 50 L112 50"/>${head(112, 50, 0)}`),
  // The wipeout spec: the board pressed nose-first under the surface as the whitewater rolls over it.
  duckDive: svg('<path d="M4 38 L116 38" opacity=".45"/>'
    + '<path d="M6 38 C 10 26 22 22 30 30 C 34 34 36 38 40 38"/><circle cx="18" cy="31" r="2"/><circle cx="26" cy="27" r="1.5"/>'
    + '<path d="M52 60 L84 52"/><path d="M58 54 L66 44 M66 44 L72 50 L84 48"/><circle cx="62" cy="41" r="3.5"/>'
    + `<path d="M34 24 C 56 16 78 16 100 24"/>${head(100, 24, 20)}`),
};
