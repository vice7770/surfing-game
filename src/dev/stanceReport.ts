import type { StanceName } from '../physics/riderPosture';
import type { StanceAngles, StanceMeasure } from '../scene/rig/stanceGauge';
import { SOURCES, type MappedStance, type StanceTarget } from '../scene/rig/stanceMap';

/** One surfer's reading of a stance, Regular or Goofy: its angles, if the rider reached the stance. */
export interface StanceReading {
  surfer: string;
  stance: StanceName;
  reached: boolean;
  angles?: StanceAngles;
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
}

export interface StanceComparison {
  rows: StanceRow[];
  /** Readings that reached the stance, of all taken. */
  reached: number;
  total: number;
}

export const MEASURE_LABEL: Record<StanceMeasure, string> = {
  kneeFront: 'Front knee', kneeRear: 'Rear knee', hipFront: 'Front hip', hipRear: 'Rear hip', ankleFront: 'Front ankle', ankleRear: 'Rear ankle',
  trunkFlexion: 'Trunk over the toes', trunkPitch: 'Trunk toward the nose', lean: 'Lean (world)', chestTwist: 'Chest twist', hipTwist: 'Pelvis twist',
  headYaw: 'Head yaw', headPitch: 'Head pitch (down +)', leadArm: 'Lead arm', trailArm: 'Trailing arm', leadElbow: 'Lead elbow', trailElbow: 'Trailing elbow',
  lowHand: 'Lower hand above the board', stanceWidth: 'Stance width', weight: 'Weight (rear 0 – front 1)',
};

/**
 * Which step of the riding-body plan owns a gap in a measure: the drawn pose
 * (step 3: the rig's own choices, and how it maps the physics' crouch onto the
 * legs), or the physics' posture (step 6: measures its seven points set, which
 * the rig follows).
 */
export const MEASURE_OWNER: Record<StanceMeasure, 3 | 6> = {
  kneeFront: 3, kneeRear: 3, hipFront: 3, hipRear: 3, ankleFront: 3, ankleRear: 3,
  trunkFlexion: 6, trunkPitch: 6, lean: 6, chestTwist: 3, hipTwist: 3, headYaw: 3, headPitch: 3,
  leadArm: 3, trailArm: 3, leadElbow: 3, trailElbow: 3, lowHand: 6, stanceWidth: 6, weight: 6,
};

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

function summarize(values: number[]): Summary {
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
    return {
      measure, target, regular: summarize(of('regular')), goofy: summarize(of('goofy')),
      status: all.count ? (miss === 0 ? 'in' : 'out') : 'unmeasured', miss,
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
      const verdict = row.status === 'unmeasured' ? '—' : row.status === 'in' ? 'met' : `**out by ${row.miss > 0 ? '+' : ''}${formatMeasure(row.measure, row.miss)}** (step ${MEASURE_OWNER[row.measure]})`;
      lines.push(`| ${MEASURE_LABEL[row.measure]} | ${range(row.measure, row.target)}${row.target.note ? ` — ${row.target.note}` : ''} | ${sources} | ${row.target.confidence} | ${today(row.measure, row.regular)} | ${today(row.measure, row.goofy)} | ${verdict} |`);
    }
    lines.push('');
  } else {
    lines.push('No targets: nothing in the sources reaches this stance yet.', '');
  }
  if (stance.gaps) lines.push(`Gaps: ${stance.gaps}`, '');
  return lines.join('\n');
}
