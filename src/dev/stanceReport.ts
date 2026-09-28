import type { StanceName } from '../physics/riderPosture';
import { POINT_MEASURES, type PointMeasure, type StanceAngles, type StanceMeasure } from '../scene/rig/stanceGauge';
import { SOURCES, type MappedStance, type StanceTarget } from '../scene/rig/stanceMap';

/** One surfer's reading of a stance, Regular or Goofy: its angles, if the rider reached the stance. */
export interface StanceReading {
  surfer: string;
  stance: StanceName;
  reached: boolean;
  angles?: StanceAngles;
  /** The same stance read from the physics' own points (`measurePoints`), for the measures they set. */
  physics?: Partial<Pick<StanceAngles, PointMeasure>>;
}

interface Summary {
  count: number;
  mean: number;
  min: number;
  max: number;
}

export interface StanceRow {
  measure: StanceMeasure;
  target: StanceTarget;
  regular: Summary;
  goofy: Summary;
  /** The mean of every reading against the range: met, out, or no reading. */
  status: 'in' | 'out' | 'unmeasured';
  /** How far the mean lies outside the range (+ above, − below), in the measure's unit; 0 inside. */
  miss: number;
  /** The physics' own reading's mean, for the measures its points set. */
  physics?: number;
  /** Which step owns a miss: the drawn pose (3), or the physics' posture (6) when its own points miss too. */
  owner: 3 | 6;
}

export interface StanceComparison {
  rows: StanceRow[];
  /** Readings that reached the stance, of all taken. */
  reached: number;
  total: number;
}

export const MEASURE_LABEL: Record<StanceMeasure, string> = {
  kneeFront: 'Front knee', kneeRear: 'Rear knee', hipFront: 'Front hip', hipRear: 'Rear hip', ankleFront: 'Front ankle', ankleRear: 'Rear ankle',
  trunkFlexion: 'Trunk over the toes', trunkPitch: 'Trunk toward the nose', trunkTilt: 'Trunk from the vertical', lean: 'Lean (world)', chestTwist: 'Chest twist', hipTwist: 'Pelvis twist',
  headYaw: 'Head yaw', headPitch: 'Head pitch (down +)', leadArm: 'Lead arm', trailArm: 'Trailing arm', leadElbow: 'Lead elbow', trailElbow: 'Trailing elbow',
  lowHand: 'Lower hand above the board', stanceWidth: 'Stance width', weight: 'Weight (rear 0 – front 1)',
};

/**
 * Which step of the riding-body plan owns a miss: the physics' posture (step
 * 6) when the physics' own points miss the target too, for the measures they
 * set (the trunk, the lean, the lower hand, the feet, the weight); otherwise
 * the drawn pose (step 3: the rig's own choices, how it maps the physics'
 * crouch onto the legs, and anything it moves away from the points).
 */
function ownerOf(measure: StanceMeasure, target: { min: number; max: number }, physics: number | undefined): 3 | 6 {
  if (!(POINT_MEASURES as readonly StanceMeasure[]).includes(measure) || physics === undefined) return 3;
  return physics >= target.min && physics <= target.max ? 3 : 6;
}

const METRES: ReadonlySet<StanceMeasure> = new Set(['lowHand', 'stanceWidth']);

/** A value in the measure's unit: degrees, metres, or the weight's share. */
export function formatMeasure(measure: StanceMeasure, value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (METRES.has(measure)) return `${value.toFixed(2)} m`;
  if (measure === 'weight') return value.toFixed(2);
  return `${value.toFixed(0)}°`;
}

const range = (measure: StanceMeasure, target: StanceTarget) => {
  const unit = METRES.has(measure) ? ' m' : measure === 'weight' ? '' : '°';
  const digits = METRES.has(measure) || measure === 'weight' ? 2 : 0;
  return `${target.min.toFixed(digits)}–${target.max.toFixed(digits)}${unit}`;
};

function summarize(all: number[]): Summary {
  // A reading with no value (the weight with the feet together) is left out.
  const values = all.filter(Number.isFinite);
  if (!values.length) return { count: 0, mean: Number.NaN, min: Number.NaN, max: Number.NaN };
  return { count: values.length, mean: values.reduce((sum, value) => sum + value, 0) / values.length, min: Math.min(...values), max: Math.max(...values) };
}

/** A stance's readings against its targets. */
export function compareStance(stance: MappedStance, readings: readonly StanceReading[]): StanceComparison {
  const reached = readings.filter((reading) => reading.reached && reading.angles);
  const rows = (Object.entries(stance.targets) as [StanceMeasure, StanceTarget][]).map(([measure, target]): StanceRow => {
    const of = (side: StanceName) => reached.filter((reading) => reading.stance === side).map((reading) => reading.angles![measure]);
    const all = summarize(reached.map((reading) => reading.angles![measure]));
    const miss = all.count ? (all.mean > target.max ? all.mean - target.max : all.mean < target.min ? all.mean - target.min : 0) : 0;
    const physics = summarize(reached.flatMap((reading) => {
      const value = reading.physics?.[measure as PointMeasure];
      return value === undefined ? [] : [value];
    }));
    const physicsMean = physics.count ? physics.mean : undefined;
    return {
      measure, target, regular: summarize(of('regular')), goofy: summarize(of('goofy')),
      status: all.count ? (miss === 0 ? 'in' : 'out') : 'unmeasured', miss, physics: physicsMean, owner: ownerOf(measure, target, physicsMean),
    };
  });
  return { rows, reached: reached.length, total: readings.length };
}

const today = (measure: StanceMeasure, summary: Summary) =>
  summary.count ? `${formatMeasure(measure, summary.mean)} (${formatMeasure(measure, summary.min)} to ${formatMeasure(measure, summary.max)})` : '—';

/** A stance's section of the map: its targets with their provenance, and today's drawn body against them. */
export function stanceSection(stance: MappedStance, comparison: StanceComparison): string {
  const lines = [
    `### ${stance.name}`,
    '',
    `${stance.reach} Sides: ${stance.sides}. Reached in ${comparison.reached} of ${comparison.total} readings (four surfers, Regular and Goofy).`,
    '',
  ];
  if (!comparison.reached && comparison.total) lines.push('**Not reached:** the rider ended in another phase, so nothing is measured.', '');
  if (comparison.rows.length) {
    lines.push('| Measure | Target | Sources | Confidence | Regular today | Goofy today | Today |', '|---|---|---|---|---|---|---|');
    for (const row of comparison.rows) {
      const sources = row.target.sources.map((id) => SOURCES[id].short).join(', ');
      const physics = row.physics === undefined ? '' : `; the physics' points ${formatMeasure(row.measure, row.physics)}`;
      const verdict = row.status === 'unmeasured' ? '—' : row.status === 'in' ? `met${physics}` : `**out by ${row.miss > 0 ? '+' : ''}${formatMeasure(row.measure, row.miss)}** (step ${row.owner}${physics})`;
      lines.push(`| ${MEASURE_LABEL[row.measure]} | ${range(row.measure, row.target)}${row.target.note ? ` — ${row.target.note}` : ''} | ${sources} | ${row.target.confidence} | ${today(row.measure, row.regular)} | ${today(row.measure, row.goofy)} | ${verdict} |`);
    }
    lines.push('');
  } else {
    lines.push('No targets: nothing in the sources reaches this stance yet.', '');
  }
  if (stance.gaps) lines.push(`Gaps: ${stance.gaps}`, '');
  return lines.join('\n');
}
