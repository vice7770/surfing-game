import type { SpotName } from './Bathymetry';
import { highestMean, type BreakingWave } from './SurfMeter';
import { caldwellAucan, komarGaughan } from './surfForecast';

/** The report's seas (the wave-sizes spec, Checks): buoy heights, m, by peak periods, s. */
export const SIZE_GRID = { heights: [1, 1.5, 2, 3, 4], periods: [10, 14, 18] } as const;
/** Sea time each run measures, s. */
export const SIZE_SEA_SECONDS = 240;
/** The report measures faces in bands this wide along shore, m, clear of the window's open edges by SIZE_EDGE_MARGIN. */
export const SIZE_BAND_WIDTH = 20;
export const SIZE_EDGE_MARGIN = 20;
/**
 * The Reef is reported, not gated: its bed belongs to the Teahupo'o Reef rework (the spec). Padang Padang is judged
 * against its own face targets (its spec), not Komar–Gaughan's gate.
 */
export const UNGATED: readonly SpotName[] = ['reef', 'padang'];
/** Gates: big days within 20 % of Komar–Gaughan, small days within 5 % of the baseline, the take-off within 15 m of the sets' break. */
export const BIG_DAY = 2;
export const SMALL_DAY = 1.5;
export const BIG_TOLERANCE = 0.2;
export const SMALL_TOLERANCE = 0.05;
export const TAKE_OFF_TOLERANCE = 15;

export interface SizeRun {
  spot: SpotName;
  source: 'buoy' | 'practice';
  significantHeight: number;
  period: number;
  /** Where the run's height was given: in deep water (shoaled to the edge) or at the tank's edge. */
  heightAt: 'deep' | 'edge';
  typical: number;
  sets: number;
  waves: number;
  /** Median across-shore position where the take-off's sets (its highest third) started breaking, m. */
  setBreakZ: number;
  /** The take-off's own surf, as the game's readout measures it (±10 m of the take-off): H1/3, H1/10, m, and its waves. */
  takeOffTypical?: number;
  takeOffSets?: number;
  takeOffWaves?: number;
  takeOffZ: number;
  stepMs: number;
  cells: number;
}

const median = (values: number[]) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** A run's faces (every band) and its take-off's sets. */
export function summariseRun(
  input: Omit<SizeRun, 'typical' | 'sets' | 'waves' | 'setBreakZ' | 'takeOffTypical' | 'takeOffSets' | 'takeOffWaves'>,
  waves: readonly BreakingWave[], takeOffWaves: readonly BreakingWave[],
): SizeRun {
  const faces = waves.map((wave) => wave.face);
  const byFace = [...takeOffWaves].sort((a, b) => b.face - a.face);
  const sets = byFace.slice(0, Math.max(1, Math.ceil(byFace.length / 3)));
  return {
    ...input,
    typical: highestMean(faces, 1 / 3),
    sets: highestMean(faces, 1 / 10),
    waves: faces.length,
    setBreakZ: median(sets.map((wave) => wave.z)),
    takeOffTypical: highestMean(byFace.map((wave) => wave.face), 1 / 3),
    takeOffSets: highestMean(byFace.map((wave) => wave.face), 1 / 10),
    takeOffWaves: byFace.length,
  };
}

export interface SizeGate {
  name: string;
  pass: boolean;
  detail: string;
}

const label = (run: SizeRun) => (run.source === 'practice' ? `${run.spot} practice` : `${run.spot} Hs ${run.significantHeight} m Tp ${run.period} s`);
const same = (a: SizeRun, b: SizeRun) => a.spot === b.spot && a.source === b.source && a.significantHeight === b.significantHeight
  && a.period === b.period && a.heightAt === b.heightAt;

/** The spec's gates, for the runs they apply to. */
export function sizeGates(runs: readonly SizeRun[], baseline: readonly SizeRun[]): SizeGate[] {
  const gates: SizeGate[] = [];
  for (const run of runs) {
    if (UNGATED.includes(run.spot)) continue;
    const reference = baseline.find((old) => same(old, run));
    if (run.spot === 'canyon') {
      if (reference) {
        const pass = run.typical === reference.typical && run.sets === reference.sets && run.waves === reference.waves;
        gates.push({ name: `${label(run)} unchanged`, pass, detail: `H1/3 ${run.typical.toFixed(3)} against ${reference.typical.toFixed(3)} m` });
      }
      continue;
    }
    if (run.source === 'buoy' && run.heightAt === 'deep' && run.significantHeight >= BIG_DAY) {
      const empirical = komarGaughan(run.significantHeight, run.period);
      const ratio = run.typical / empirical;
      gates.push({
        name: label(run), pass: Math.abs(ratio - 1) <= BIG_TOLERANCE,
        detail: `H1/3 ${run.typical.toFixed(2)} m, ${(ratio * 100).toFixed(0)} % of Komar–Gaughan ${empirical.toFixed(2)} m`,
      });
      const off = Math.abs(run.setBreakZ - run.takeOffZ);
      gates.push({ name: `${label(run)} take-off`, pass: off <= TAKE_OFF_TOLERANCE, detail: `take-off ${off.toFixed(0)} m from the sets' break` });
    }
    if ((run.source === 'practice' || (run.heightAt === 'edge' && run.significantHeight <= SMALL_DAY)) && reference) {
      const ratio = run.typical / reference.typical;
      gates.push({
        name: run.source === 'practice' ? label(run) : `${label(run)} small day`, pass: Math.abs(ratio - 1) <= SMALL_TOLERANCE,
        detail: `H1/3 ${run.typical.toFixed(2)} m, ${(ratio * 100).toFixed(1)} % of today's ${reference.typical.toFixed(2)} m`,
      });
    }
  }
  return gates;
}

/** The report: a table per spot with the empirical references, then the gates if any. */
export function sizeMarkdown(runs: readonly SizeRun[], gates: readonly SizeGate[] | undefined, command: string): string {
  const lines = [
    '# Size report',
    '',
    `Generated by \`${command}\` on ${new Date().toISOString().slice(0, 10)} (the wave-sizes spec). Faces are measured as each wave starts to break, crest to the trough ahead, in ${SIZE_BAND_WIDTH} m bands across the window; H1/3 and H1/10 over ${SIZE_SEA_SECONDS} s of sea. Komar–Gaughan is the H1/3 reference; Caldwell & Aucan the H1/10 of Hawaii's highest-refraction outer reefs (docs/research/surf-size-sources.md). The Reef is reported, not gated.`,
  ];
  const cell = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
  for (const spot of ['beach', 'point', 'reef', 'canyon', 'padang'] as const) {
    const rows = runs.filter((run) => run.spot === spot);
    if (!rows.length) continue;
    lines.push(
      '', `## ${spot}`, '',
      '| Sea | Given at | Waves | H1/3 (m) | H1/10 (m) | Komar–Gaughan H_b (m) | H1/3 ÷ K–G | Caldwell–Aucan H1/10 (m) | Take-off H1/3 / H1/10 (m) | Sets break z (m) | Take-off z (m) | Cells | Step (ms) |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    );
    for (const run of rows) {
      const kg = run.source === 'practice' ? Number.NaN : komarGaughan(run.significantHeight, run.period);
      const ca = run.source === 'practice' ? Number.NaN : caldwellAucan(run.significantHeight, run.period);
      const takeOff = run.takeOffTypical === undefined ? '—' : `${cell(run.takeOffTypical)} / ${cell(run.takeOffSets ?? Number.NaN)} (${run.takeOffWaves})`;
      lines.push(`| ${label(run)} | ${run.heightAt} | ${run.waves} | ${cell(run.typical)} | ${cell(run.sets)} | ${cell(kg)} | ${cell(run.typical / kg)} | ${cell(ca)} | ${takeOff} | ${cell(run.setBreakZ, 0)} | ${cell(run.takeOffZ, 0)} | ${run.cells} | ${cell(run.stepMs, 1)} |`);
    }
  }
  if (gates) {
    lines.push('', '## Gates', '', '| Gate | Result | Detail |', '|---|---|---|');
    for (const gate of gates) lines.push(`| ${gate.name} | ${gate.pass ? 'pass' : '**fail**'} | ${gate.detail} |`);
  }
  return `${lines.join('\n')}\n`;
}
