/**
 * The Canyon at each swell size, wave only (no riders; the owner's rule): where and how its waves break
 * (docs/research/canyon-spilling-2026-10-05 §1, "Every size").
 *
 * Runs the Canyon's surf zone with a size's swell (the game's `SWELLS`: square, s = 150) and reports:
 * - **the tracker**, sampled once a peak period as the readout reads it (`waveInfo`): clean samples (fit ≥ 0.3),
 *   their direction (+1 toward +x: left to right seen from the beach), their median angle and peel speed, and the
 *   readout's words: "closes out" (under 27°), "mixed peaks" (fit < 0.3), "a left" (+x) or "a right" (−x);
 * - **each crest**, from the simulation's onsets (a column's outermost breaking cell jumping seaward). Onsets are
 *   grouped into crests by their phase: the onset's time less its crest's travel time from the relaxation zone down its
 *   column at √(g h) over the still bed (the crests' measured speed: 6.3 m/s at Medium and 5.7 m/s at Big over the
 *   3.6 m shelf), split where the phase jumps by more than GAP of a period, and a group spanning over SPLIT of a period
 *   split at its widest jump. Crests already breaking when the record starts (a first onset within WARM s of it) and
 *   those starting too late to be read are left out. For each crest: its start (first onset) along shore and across, the
 *   bed part and depth there, how far along shore it broke within CLOSE_SECONDS of its start (a close-out breaks over
 *   CLOSE_SPAN m or more at once), whether it also ran upcoast (more than two onsets over 5 m upcoast within 3 s, as
 *   the README counts it), and its own fit along the arm (onset time and position against x, as the tracker, over all
 *   its onsets on the arm);
 * - **where the waves break**: every onset and every start by bed part (the blend, the level shelf, the arm's face,
 *   its upcoast end, its top, the beach face), with depth and distance seaward of the break line;
 * - with `--stability`, the session's health: the fastest water (|q|/h where h > 5 cm, every 10 steps), the Froude
 *   caps and the volume's drift, and the onsets per 100 s.
 *
 *   rolldown scripts/canyon-size-report.ts -o dist/scripts/canyon-size-report.mjs --format esm --platform node \
 *     && node dist/scripts/canyon-size-report.mjs --size big --seeds 1 --periods 8 [--canyon key=value,...] \
 *        [--first-seed 1] [--hs 2.4 --tp 14] [--verbose] [--stability] [--json <file>]
 *   node dist/scripts/canyon-size-report.mjs --from <file> [--verbose]   (re-reads a run's onsets)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { SWELLS } from '../src/game/SurfConditions';
import { CANYON, canyonArmAt, canyonBreakLineZ, canyonTerraceDepth, createSpot } from '../src/wave/Bathymetry';
import { BoussinesqSolver } from '../src/wave/BoussinesqSolver';
import { MIXED_PEAK_FIT, skillForPeel } from '../src/wave/Breaking';
import { GRAVITY } from '../src/wave/dispersion';
import { SurfZoneSimulation, tankDepth, tankLayout, type SurfZoneConfig, type TankLayout } from '../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from './canyonShape';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const number = (name: string, fallback: number) => Number(option(name) ?? fallback);
const verbose = process.argv.includes('--verbose');

/** Onsets whose phase jumps by more than this share of a period start a new crest. */
const GAP = 0.25;
/** A group whose phases span more than this share of a period is split at its widest jump. */
const SPLIT = 0.7;
/** Crests whose first onset comes within this many seconds of the record's start were already breaking. */
const WARM = 2;
/** A crest breaking over this many metres along shore within CLOSE_SECONDS of its start closes out. */
const CLOSE_SPAN = 40;
const CLOSE_SECONDS = 2;
/** The README's upcoast count: more than UPCOAST_ONSETS onsets over UPCOAST_REACH m upcoast within UPCOAST_SECONDS. */
const UPCOAST_REACH = 5;
const UPCOAST_ONSETS = 2;
const UPCOAST_SECONDS = 3;
/** A crest's own fit needs this many onsets on the arm. */
const FIT_ONSETS = 8;
/** Starts count as one place within this many metres of their median, along shore (the owner's bar: ±10 m). */
const SAME_START = 10;

interface Onset { seed: number; t: number; x: number; z: number; face: number; depth: number }
interface Sample { seed: number; t: number; angle: number; direction: number; fit: number; speed: number; words: string }
interface Health { seed: number; fastest: number; caps: number; capsInWater: number; volumeDrift: number; finite: boolean; onsetsPer100: number[] }
interface Run {
  size: string; hs: number; tp: number; spreading: number; seeds: number; periods: number; canyon: Record<string, number>; celerity: number;
  /** Per seed: when the record starts and ends, s. */
  records: { seed: number; start: number; end: number }[];
  samples: Sample[]; onsets: Onset[]; health: Health[];
}
interface CrestReport {
  seed: number; t: number; x: number; z: number; depth: number; part: string; seaward: number; face: number; onsets: number; phaseSpread: number;
  span: number; upcoast: boolean; upcoastReach: number; downcoastReach: number;
  fit?: { direction: number; angle: number; r2: number; speed: number; columns: number };
}

function configFor(seed: number, hs: number, tp: number, spreading: number): SurfZoneConfig {
  return { spot: 'canyon', seed, significantHeight: hs, peakPeriod: tp, directionDegrees: 0, spreading, tide: 0, windSpeed: 0, stage: 2 } as unknown as SurfZoneConfig;
}

/** The bed part under (x, z): the tank's blend, the level shelf, the arm's face, its upcoast end, its top, or the beach face. */
function bedPart(x: number, z: number, tank: TankLayout): string {
  const c = CANYON;
  if (z < tank.blendEnd) return 'blend';
  const terrace = canyonTerraceDepth(x, z);
  const beachFace = -z * c.shoreSlope;
  if (beachFace < Math.min(c.shelfDepth, terrace)) return 'beach face';
  if (terrace >= c.shelfDepth - 0.05) return 'shelf';
  if (z >= canyonBreakLineZ(x)) return 'arm top';
  return x < c.peakX ? 'arm end' : 'arm face';
}

function simulate(): Run {
  const size = (option('size') ?? 'medium') as keyof typeof SWELLS;
  const swell = SWELLS[size];
  const hs = number('hs', swell.significantHeight);
  const tp = number('tp', swell.peakPeriod);
  const spreading = number('spreading', swell.spreading ?? 150);
  const periods = number('periods', 8);
  const seeds = number('seeds', 1);
  const firstSeed = number('first-seed', 1);
  const stability = process.argv.includes('--stability');
  applyCanyonShape(option('canyon'));
  const run: Run = { size, hs, tp, spreading, seeds, periods, canyon: { ...CANYON }, celerity: Number.NaN, records: [], samples: [], onsets: [], health: [] };
  for (let seed = firstSeed; seed < firstSeed + seeds; seed += 1) {
    const simulation = new SurfZoneSimulation(configFor(seed, hs, tp, spreading));
    const { solver } = simulation;
    run.celerity = simulation.breakerCelerity();
    const columnOf = (x: number) => Math.min(solver.nx - 1, Math.max(0, Math.round((x - solver.xCenters[0]) / solver.dx)));
    simulation.onBreak = (wave) => {
      const i = solver.rowBelow(wave.z) * solver.nx + columnOf(wave.x);
      run.onsets.push({ seed, t: wave.time, x: wave.x, z: wave.z, face: wave.face, depth: solver.restLevel - solver.bed[i] });
    };
    const point = simulation.breakPoint();
    console.log(`seed ${seed}: ${size} Hs ${hs} m Tp ${tp} s s ${spreading}; c_b ${run.celerity.toFixed(2)} m/s, h_b ${simulation.breakerDepth().toFixed(2)} m; `
      + `take-off (${point.x.toFixed(0)}, ${point.z.toFixed(0)}); tank ${JSON.stringify(simulation.tank)}`);
    const boussinesq = solver instanceof BoussinesqSolver ? solver : undefined;
    const caps0 = boussinesq?.froudeCaps ?? 0;
    const capsInWater0 = boussinesq?.froudeCapsInWater ?? 0;
    const volume0 = solver.totalVolume();
    let fastest = 0;
    let finite = true;
    const step = 1 / 30;
    const perPeriod = Math.round(tp / step);
    const start = solver.time;
    for (let period = 0; period < periods; period += 1) {
      for (let index = 0; index < perPeriod; index += 1) {
        simulation.step(step);
        if (stability && index % 10 === 0) {
          for (let i = 0; i < solver.h.length; i += 1) {
            const h = solver.h[i];
            if (!Number.isFinite(h)) finite = false;
            if (h > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / h);
          }
        }
      }
      const estimate = simulation.peelEstimate();
      if (!estimate) {
        if (verbose) console.log(`  t=${solver.time.toFixed(0)} no wave`);
        continue;
      }
      const words = skillForPeel(estimate.angleDegrees) === 'closeout' ? 'closes out'
        : estimate.fit < MIXED_PEAK_FIT ? 'mixed' : estimate.direction > 0 ? 'left (+x)' : 'right (−x)';
      run.samples.push({ seed, t: solver.time, angle: estimate.angleDegrees, direction: estimate.direction, fit: estimate.fit, speed: estimate.peelSpeed, words });
      if (verbose) {
        console.log(`  t=${solver.time.toFixed(0)} angle ${estimate.angleDegrees.toFixed(0)}° dir ${estimate.direction} fit ${estimate.fit.toFixed(2)} `
          + `speed ${estimate.peelSpeed.toFixed(1)} cols ${estimate.columns}: ${words}`);
      }
    }
    run.records.push({ seed, start, end: solver.time });
    if (stability) {
      const mine = run.onsets.filter((o) => o.seed === seed);
      const per100: number[] = [];
      for (let from = 0; from < solver.time - start; from += 100) per100.push(mine.filter((o) => o.t - start >= from && o.t - start < from + 100).length);
      run.health.push({
        seed, fastest, caps: (boussinesq?.froudeCaps ?? 0) - caps0, capsInWater: (boussinesq?.froudeCapsInWater ?? 0) - capsInWater0,
        volumeDrift: solver.totalVolume() / volume0 - 1, finite, onsetsPer100: per100,
      });
    }
  }
  return run;
}

const quantile = (values: number[], q: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const median = (values: number[]) => quantile(values, 0.5);
const f = (value: number, digits = 0) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
const tally = (values: string[]) => {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
};

/** Split a phase-ordered group at its widest jump until none spans more than `limit` s. */
function splitWide(group: (Onset & { phase: number })[], limit: number): (Onset & { phase: number })[][] {
  if (group.length < 2 || group[group.length - 1].phase - group[0].phase <= limit) return [group];
  let widest = 1;
  for (let k = 2; k < group.length; k += 1) if (group[k].phase - group[k - 1].phase > group[widest].phase - group[widest - 1].phase) widest = k;
  return [...splitWide(group.slice(0, widest), limit), ...splitWide(group.slice(widest), limit)];
}

function analyse(run: Run): void {
  Object.assign(CANYON, run.canyon);
  const { tp, hs, celerity } = run;
  const config = configFor(1, hs, tp, run.spreading);
  const tank = tankLayout(config);
  const spot = createSpot('canyon', 1);
  // Each 1 m column's travel time from the zone's inner edge to every metre shoreward, over the still bed at √(g h).
  const xMin = -80;
  const columns = 161;
  const rows = Math.ceil(tank.shore - tank.zoneInner) + 1;
  const travel = new Float64Array(columns * rows);
  for (let c = 0; c < columns; c += 1) {
    let tau = 0;
    for (let r = 1; r < rows; r += 1) {
      const depth = Math.max(0.2, tankDepth(spot, tank.edgeDepth, xMin + c, tank.zoneInner + r - 0.5, tank));
      tau += 1 / Math.sqrt(GRAVITY * depth);
      travel[c * rows + r] = tau;
    }
  }
  const phaseOf = (o: Onset) => {
    const c = Math.min(columns - 1, Math.max(0, Math.round(o.x - xMin)));
    const r = Math.min(rows - 1, Math.max(0, Math.round(o.z - tank.zoneInner)));
    return o.t - travel[c * rows + r];
  };
  const crests: CrestReport[] = [];
  const recorded: Onset[] = [];
  for (const record of run.records) {
    const mine = run.onsets.filter((o) => o.seed === record.seed && o.t > record.start).map((o) => ({ ...o, phase: phaseOf(o) }));
    recorded.push(...mine);
    mine.sort((a, b) => a.phase - b.phase);
    const groups: (Onset & { phase: number })[][] = [];
    for (const onset of mine) {
      const last = groups[groups.length - 1];
      if (last && onset.phase - last[last.length - 1].phase <= GAP * tp) last.push(onset);
      else groups.push([onset]);
    }
    for (const group of groups.flatMap((g) => splitWide(g, SPLIT * tp))) {
      if (group.length < 3) continue;
      const first = group.reduce((a, b) => (b.t < a.t ? b : a));
      if (first.t < record.start + WARM || first.t + UPCOAST_SECONDS > record.end) continue;
      const early = group.filter((o) => o.t <= first.t + CLOSE_SECONDS);
      const span = Math.max(...early.map((o) => o.x)) - Math.min(...early.map((o) => o.x));
      const soon = group.filter((o) => o.t <= first.t + UPCOAST_SECONDS);
      const up = soon.filter((o) => o.x < first.x - UPCOAST_REACH);
      const crest: CrestReport = {
        seed: record.seed, t: first.t, x: first.x, z: first.z, depth: first.depth, part: bedPart(first.x, first.z, tank),
        seaward: canyonBreakLineZ(first.x) - first.z, face: first.face, onsets: group.length, phaseSpread: group[group.length - 1].phase - group[0].phase,
        span, upcoast: up.length > UPCOAST_ONSETS, upcoastReach: Math.max(0, first.x - Math.min(...soon.map((o) => o.x))),
        downcoastReach: Math.max(0, Math.max(...soon.map((o) => o.x)) - first.x),
      };
      const arm = group.filter((o) => canyonArmAt(o.x));
      if (arm.length >= FIT_ONSETS) {
        const n = arm.length;
        const mx = arm.reduce((s, o) => s + o.x, 0) / n;
        const mt = arm.reduce((s, o) => s + o.t, 0) / n;
        const mz = arm.reduce((s, o) => s + o.z, 0) / n;
        let sxx = 0;
        let sxt = 0;
        let stt = 0;
        let sxz = 0;
        for (const o of arm) {
          sxx += (o.x - mx) ** 2;
          sxt += (o.x - mx) * (o.t - mt);
          stt += (o.t - mt) ** 2;
          sxz += (o.x - mx) * (o.z - mz);
        }
        const slope = sxx > 0 ? sxt / sxx : 0;
        const stretch = Math.hypot(1, sxx > 0 ? sxz / sxx : 0);
        crest.fit = {
          direction: Math.sign(slope), angle: (Math.asin(Math.min(1, (celerity * Math.abs(slope)) / stretch)) * 180) / Math.PI,
          r2: sxx > 0 && stt > 0 ? (sxt * sxt) / (sxx * stt) : 0, speed: Math.abs(slope) > 0 ? stretch / Math.abs(slope) : Infinity, columns: n,
        };
      }
      crests.push(crest);
      if (verbose) {
        console.log(`  seed ${record.seed} crest t ${first.t.toFixed(1)}: start x ${first.x.toFixed(0)} z ${first.z.toFixed(0)} (${crest.part}, ${first.depth.toFixed(2)} m deep, `
          + `${crest.seaward.toFixed(0)} m seaward of the line, face ${first.face.toFixed(2)} m); ${group.length} onsets, phase spread ${crest.phaseSpread.toFixed(1)} s; `
          + `${span.toFixed(0)} m within ${CLOSE_SECONDS} s; upcoast ${crest.upcoastReach.toFixed(0)} m (${up.length} onsets), downcoast ${crest.downcoastReach.toFixed(0)} m; `
          + (crest.fit ? `fit ${crest.fit.direction > 0 ? '+x' : '−x'} ${crest.fit.angle.toFixed(0)}° r² ${crest.fit.r2.toFixed(2)} (${crest.fit.columns})` : 'no fit'));
      }
    }
  }
  const { samples } = run;
  const clean = samples.filter((s) => s.fit >= MIXED_PEAK_FIT);
  const plus = clean.filter((s) => s.direction > 0).length;
  const starts = crests.map((c) => c.x);
  const startMedian = median(starts);
  const within = starts.filter((x) => Math.abs(x - startMedian) <= SAME_START).length;
  const fitted = crests.filter((c) => c.fit && c.fit.r2 >= MIXED_PEAK_FIT);
  const closeOuts = crests.filter((c) => c.span >= CLOSE_SPAN);
  const onArm = (c: CrestReport) => c.part === 'arm face' || c.part === 'arm end';
  console.log(`\n${run.size}: Hs ${hs} m, Tp ${tp} s, s ${run.spreading}; ${run.seeds} seed(s) × ${run.periods} periods; c_b ${celerity.toFixed(2)} m/s; canyon ${JSON.stringify(run.canyon)}`);
  console.log(`tracker: ${samples.length} samples, ${clean.length} clean; toward +x ${plus} of ${clean.length}; median angle ${f(median(clean.map((s) => s.angle)))}°, `
    + `median peel speed ${f(median(clean.map((s) => s.speed)), 1)} m/s; readout: ${tally(samples.map((s) => s.words))}`);
  console.log(`crests: ${crests.length}; starts median x ${f(startMedian)}, 10–90 % ${f(quantile(starts, 0.1))}…${f(quantile(starts, 0.9))}, within ±${SAME_START} m ${within} of ${crests.length}; `
    + `start z median ${f(median(crests.map((c) => c.z)))}, depth median ${f(median(crests.map((c) => c.depth)), 2)} m, seaward of the line median ${f(median(crests.map((c) => c.seaward)))} m`);
  console.log(`  starts by bed part: ${tally(crests.map((c) => c.part))}; on the arm (face or end) ${crests.filter(onArm).length} of ${crests.length}`);
  console.log(`  close-outs (≥ ${CLOSE_SPAN} m within ${CLOSE_SECONDS} s): ${closeOuts.length}; spans median ${f(median(crests.map((c) => c.span)))} m, 90th ${f(quantile(crests.map((c) => c.span), 0.9))} m`);
  console.log(`  upcoast (> ${UPCOAST_ONSETS} onsets over ${UPCOAST_REACH} m within ${UPCOAST_SECONDS} s): ${crests.filter((c) => c.upcoast).length}; reach median ${f(median(crests.map((c) => c.upcoastReach)))} m, `
    + `90th ${f(quantile(crests.map((c) => c.upcoastReach), 0.9))} m, most ${f(Math.max(0, ...crests.map((c) => c.upcoastReach)))} m`);
  console.log(`  own fits (r² ≥ ${MIXED_PEAK_FIT}, ≥ ${FIT_ONSETS} onsets on the arm): ${fitted.length}; toward +x ${fitted.filter((c) => c.fit!.direction > 0).length}; `
    + `median ${f(median(fitted.map((c) => c.fit!.angle)))}°, speed ${f(median(fitted.map((c) => c.fit!.speed)), 1)} m/s`);
  console.log(`onsets: ${recorded.length}; by bed part: ${tally(recorded.map((o) => bedPart(o.x, o.z, tank)))}; depth median ${f(median(recorded.map((o) => o.depth)), 2)} m, `
    + `10–90 % ${f(quantile(recorded.map((o) => o.depth), 0.1), 2)}…${f(quantile(recorded.map((o) => o.depth), 0.9), 2)} m`);
  for (const h of run.health) {
    console.log(`health seed ${h.seed}: fastest ${h.fastest.toFixed(2)} m/s, Froude caps ${h.caps} (${h.capsInWater} in water), volume ${(100 * h.volumeDrift).toFixed(2)} %, `
      + `finite ${h.finite}; onsets per 100 s ${h.onsetsPer100.join(' ')}`);
  }
}

const from = option('from');
const run: Run = from ? JSON.parse(readFileSync(from, 'utf8')) as Run : simulate();
const json = option('json');
if (json && !from) {
  writeFileSync(json, JSON.stringify(run));
  console.log(`Wrote ${json}.`);
}
analyse(run);
