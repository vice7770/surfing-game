import type { FrontPoint } from '../barrel/BreakingFront';

/**
 * The padangFrontGap probe's dump of its fast fronts (FASTDUMP): for each front whose throws peel at 20 m/s or more, one row a
 * point with its join and its throw side by side, so a throw's time can be read against its join's and against η and the
 * depth along the front (the advisor's open question on Medium's fast throw fronts, 2026-10-03: whether crests refract
 * toward the contours between the join and the throw depth and reach the throw depth together).
 */

/** One moment of a front point's life, and what its crest was then. */
export interface Moment {
  /** The solver's clock, s: when the point joined, or when its crest crossed its throw depth (interpolated, as the front has it). */
  t: number;
  x: number;
  /** The crest's z, m: at the step it joined; at the throw, where it crossed the throw depth (`FrontPoint.throwZ`). */
  z: number;
  /** The crest's height above still water, m, and the still depth under it, m, at the step. */
  eta: number;
  d: number;
  /** The crest's direction of travel, degrees from +z (shoreward) toward +x; null where the solver reads no travelling form (`crestMotion`). */
  travel: number | null;
  /** The front's own line there, degrees from +x (z shoreward), from the points around it on its front; null for a point alone. */
  line: number | null;
}

export interface FastPoint {
  id: number;
  column: number;
  join: Moment;
  throw: Moment;
  /** The still depths the front's tables put the point's join and its throw at, m. */
  joinDepth: number;
  throwDepth: number;
}

/** What the probe keeps of a front point: its join the step it first stands, and its throw the step it first has one. */
export interface PointLog {
  column: number;
  join: Moment;
  /** The still depths the front's tables put the point's join and throw at, m. */
  joinDepth: number;
  throwDepth: number;
  thrown?: Moment;
}

/**
 * The front's own line at `points[index]`, degrees from +x (z shoreward), folded to (−90, 90]: from the points up to two
 * either side of it on its front, which `points` lists in order; null for a point alone on its front.
 */
export function lineAt(points: readonly FrontPoint[], index: number): number | null {
  const front = points[index].front;
  let from = index;
  let to = index;
  while (from > 0 && index - from < 2 && points[from - 1].front === front) from -= 1;
  while (to + 1 < points.length && to - index < 2 && points[to + 1].front === front) to += 1;
  if (to === from) return null;
  const angle = (Math.atan2(points[to].z - points[from].z, points[to].x - points[from].x) * 180) / Math.PI;
  return angle > 90 ? angle - 180 : angle <= -90 ? angle + 180 : angle;
}

/**
 * Records into `logs`, for this step's `points` (in front order), each one's join the first step it stands (at its join
 * time, `FrontPoint.joined`) and its throw the first step it has one (at `thrown`, its crest's z then `throwZ`); a point
 * already logged is left as it was. `travelAt` reads the crest's direction of travel at a point, or null.
 */
export function logPoints(logs: Map<number, PointLog>, points: readonly FrontPoint[], travelAt: (point: FrontPoint) => number | null): void {
  points.forEach((p, index) => {
    const log = logs.get(p.id);
    if (log && (log.thrown !== undefined || p.thrown === null)) return;
    const moment = (t: number, z: number): Moment => ({ t, x: p.x, z, eta: p.height, d: p.crestDepth, travel: travelAt(p), line: lineAt(points, index) });
    const entry = log ?? { column: p.column, join: moment(p.joined, p.z), joinDepth: p.depth, throwDepth: p.throwDepth };
    if (p.thrown !== null) entry.thrown = moment(p.thrown, p.throwZ ?? p.z);
    logs.set(p.id, entry);
  });
}

export interface FastFront {
  front: number;
  throws: number;
  /** m along x. */
  span: number;
  /** m/s along x, by the points' throws, by their joins, and by the solver's own first breaks (NaN: too few). */
  throwPeel: number;
  joinPeel: number;
  breakPeel: number;
  points: readonly FastPoint[];
}

/**
 * A fast front to dump: its peels (`peels`) and, of the points whose first throw the probe counted on it (`throws`: each
 * point's front at its throw, by ID), each one logged with its throw (`logs`).
 */
export function fastFront(
  peels: Omit<FastFront, 'points'>, throws: ReadonlyMap<number, { front: number }>, logs: ReadonlyMap<number, PointLog>,
): FastFront {
  const points: FastPoint[] = [];
  for (const [id, counted] of throws) {
    const log = logs.get(id);
    if (counted.front === peels.front && log?.thrown) points.push({ id, column: log.column, join: log.join, throw: log.thrown, joinDepth: log.joinDepth, throwDepth: log.throwDepth });
  }
  return { ...peels, points };
}

const COLUMNS = ['front', 'point', 'column']
  .concat(['join', 'throw'].flatMap((event) => ['t', 'x', 'z', 'eta', 'd', 'travel', 'line'].map((field) => `${event}_${field}`)))
  .concat(['lag', 'join_table_d', 'throw_table_d']);

const fixed = (value: number | null, digits: number) => (value === null || !Number.isFinite(value) ? '' : value.toFixed(digits));

const momentCells = (m: Moment) => [fixed(m.t, 3), fixed(m.x, 2), fixed(m.z, 2), fixed(m.eta, 3), fixed(m.d, 3), fixed(m.travel, 1), fixed(m.line, 1)];

/**
 * The fronts as text: comment lines (`#`) with the header and each front's peels, then a tab-separated row for each point,
 * in column order, under one line of column names. Empty cells are values the probe did not have.
 */
export function formatFastFronts(fronts: readonly FastFront[], header: string): string {
  const lines = [
    `# ${header}`,
    '# t in s; x, z, eta and d in m (d: the still depth under the crest); travel and line in degrees; lag = throw_t - join_t in s.',
    '# join: the step the point joined (z there). throw: the crest crossing its throw depth (z there). *_table_d: the front tables\' depths.',
    '# travel: the crest\'s direction of travel, degrees from +z (shoreward) toward +x, from the solver\'s face; empty where it reads no travelling form.',
    '# line: the front\'s own line there, degrees from +x (z shoreward), from the points around it on its front; empty for a point alone.',
    `# ${fronts.length} fast fronts (throws peeling at 20 m/s or more along x)`,
    COLUMNS.join('\t'),
  ];
  for (const f of fronts) {
    lines.push(`# front f${f.front}: ${f.throws} throws over ${f.span.toFixed(0)} m, peel by throws ${f.throwPeel.toFixed(1)} m/s, by joins ${f.joinPeel.toFixed(1)} m/s, by the solver's first breaks ${fixed(f.breakPeel, 1) || 'n/a'} m/s`);
    for (const p of [...f.points].sort((a, b) => a.column - b.column || a.id - b.id)) {
      lines.push([
        `f${f.front}`, String(p.id), String(p.column), ...momentCells(p.join), ...momentCells(p.throw),
        fixed(p.throw.t - p.join.t, 3), fixed(p.joinDepth, 3), fixed(p.throwDepth, 3),
      ].join('\t'));
    }
  }
  return `${lines.join('\n')}\n`;
}
