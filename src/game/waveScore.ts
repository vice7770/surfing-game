import type { Maneuver, RideReport } from './rideAnalysis';

/** A wave's score, 0.1–10 in tenths as a WSL judge gives it, and the parts it adds up from. */
export interface WaveScore {
  score: number;
  parts: { manoeuvres: number; variety: number; combination: number; flow: number; length: number; completion: number };
}

const DEG = Math.PI / 180;
/** Linked turns: at most this far apart, s, the first keeping at least this share of its speed. */
const LINK_GAP = 2;
const LINK_KEPT = 0.85;
/** A fall this soon after a manoeuvre's end fails it, s. */
const FAILED_WITHIN = 1.5;
/** The length that earns the whole length part, s. */
const FULL_LENGTH = 20;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const kept = (m: Maneuver) => (m.speedIn > 0 ? m.speedOut / m.speedIn : 0);

/** How hard a manoeuvre is (its yaw, rate and speed against a pro cutback's) and how committed (high on the face, in the pocket). */
function value(m: Maneuver): number {
  const difficulty = 0.4 * Math.min(1.2, Math.abs(m.yaw) / (150 * DEG)) + 0.3 * Math.min(1.3, m.peakYawRate / 3) + 0.3 * Math.min(1.2, m.speedIn / 9);
  const commitment = 0.5 * m.faceFraction + 0.5 * (m.pocket ? 1 : 0);
  return difficulty * (0.5 + 0.5 * commitment);
}

/**
 * The score of one ride from its measured quantities (spec P9; the survey's §10):
 * the WSL criteria (commitment and degree of difficulty, innovation and variety,
 * combination, speed, power and flow) mapped to the ride analyzer's turns, and a
 * fall in the main section scoring low (Peirão & dos Santos 2012). Provisional
 * weights, calibrated so that a turns-only ride by Forsyth et al. 2024's
 * accomplished surfers scores 'good'; to recalibrate against judged heats.
 */
export function scoreRide(report: RideReport): WaveScore {
  const { maneuvers } = report;
  const values = maneuvers.map(value).sort((a, b) => b - a);
  const kinds = new Set(maneuvers.map((m) => (m.kind === 'snap' ? 'top turn' : m.kind)));
  let linked = 0;
  for (let i = 1; i < maneuvers.length; i += 1) {
    const first = maneuvers[i - 1];
    if (maneuvers[i].start - first.end <= LINK_GAP && kept(first) >= LINK_KEPT) linked += 1;
  }
  const meanKept = maneuvers.length ? maneuvers.reduce((sum, m) => sum + kept(m), 0) / maneuvers.length : 0;
  const last = maneuvers[maneuvers.length - 1];
  const parts = {
    manoeuvres: 1.5 * values.slice(0, 3).reduce((a, b) => a + b, 0),
    variety: (0.5 * kinds.size) / 3,
    combination: (0.75 * linked) / Math.max(1, maneuvers.length - 1),
    flow: maneuvers.length ? 0.75 * clamp((meanKept - 0.7) / 0.25, 0, 1) : 0,
    length: Math.min(1, report.duration / FULL_LENGTH),
    completion: report.end === 'fell' && last && report.duration - last.end <= FAILED_WITHIN ? 0.5 : 1,
  };
  const total = (parts.manoeuvres + parts.variety + parts.combination + parts.flow + parts.length) * parts.completion;
  return { score: clamp(Math.round(total * 10) / 10, 0.1, 10), parts };
}

/** A heat's total: the best two scores, 0–20. */
export function bestTwo(scores: readonly number[]): number {
  const [first = 0, second = 0] = [...scores].sort((a, b) => b - a);
  return Math.round((first + second) * 10) / 10;
}
