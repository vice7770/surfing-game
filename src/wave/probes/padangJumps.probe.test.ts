import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { SurfZoneSimulation, type SurfZoneConfig } from '../SurfZoneSimulation';
import { PADANG_PRACTICE_SWELL, PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';

/**
 * Padang Padang's fronts with the crest jumps followed (#105's check, 2026-10-01): for each front whose throws peel
 * faster than FAST m/s, how many of its points' tracks jumped before joining, how fast the solver's own breaking onsets
 * (`markBreakingOnsets`, the peel meter's) ran along the same columns, and how many of its points rose fresh (Kennedy's
 * 0.65) before joining; the peel over every front, by throws and by the solver's onsets; the front's counts; and the
 * joins whose fresh test never fired, jumped tracks against the rest. OWN=on joins jumped crests only on their own fresh
 * onset (`FrontOptions.ownOnset`). The game's config, as the padangPeak probe.
 * Opt-in: PROBE=1 SWELL=small|medium|big|practice JUMPS=on|off OWN=on|off SECONDS=120 SEED=1 FAST=15 LOG=<file>.
 */
it.skipIf(!process.env.PROBE)('Padang Padang’s fronts, jumped or not', () => {
  const log = (text: string) => appendFileSync(process.env.LOG ?? 'padang-jumps.txt', `${text}\n`);
  const swell = process.env.SWELL ?? 'small';
  const jumps = (process.env.JUMPS ?? 'on') === 'on';
  const own = process.env.OWN === 'on';
  const seconds = Number(process.env.SECONDS ?? 120);
  const fast = Number(process.env.FAST ?? 15);
  const practice = swell === 'practice';
  const source = practice ? PADANG_PRACTICE_SWELL : PADANG_SWELLS[swell as keyof typeof PADANG_SWELLS];
  const config: SurfZoneConfig = {
    spot: 'padang', seed: Number(process.env.SEED ?? 1), significantHeight: source.significantHeight, peakPeriod: source.peakPeriod,
    directionDegrees: source.directionDegrees ?? 0, spreading: practice ? PADANG_PRACTICE_SWELL.spreading : PADANG_SPREADING,
    bandwidth: practice ? PADANG_PRACTICE_SWELL.bandwidth : undefined, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu',
    ...(practice ? { heightAt: 'edge' as const } : {}),
    ...(jumps ? (own ? { barrelFront: { jumpReach: 10, ownOnset: true } } : {}) : { barrelFront: {} }),
  };
  const started = performance.now();
  const simulation = new SurfZoneSimulation(config);
  const front = simulation.front!;
  const lastOnset = (simulation as unknown as { lastOnset: Float64Array }).lastOnset;
  const spinUp = simulation.solver.time;
  const before = { joins: front.joins, lost: front.lost, unbroken: front.unbroken, unrisen: front.unrisen, jumps: front.jumps };
  interface Join { jumped: boolean; fresh: boolean }
  interface Throw { front: number; x: number; time: number; jumped: number; onset: number; fresh: boolean }
  const joins = new Map<number, Join>();
  const throws = new Map<number, Throw>();
  while (simulation.solver.time < spinUp + seconds) {
    simulation.step(1 / 30);
    for (const p of front.points) {
      if (!joins.has(p.id)) joins.set(p.id, { jumped: (p.jumped ?? 0) > 0, fresh: p.fresh !== null });
      if (p.thrown === null || throws.has(p.id)) continue;
      throws.set(p.id, { front: p.front, x: p.x, time: p.thrown, jumped: p.jumped ?? 0, onset: lastOnset[p.column], fresh: p.fresh !== null });
    }
  }
  /** |dx/dt| of a least-squares line of x against t over the pairs. */
  const peelOf = (pairs: readonly { x: number; t: number }[]) => {
    const mt = pairs.reduce((s, p) => s + p.t, 0) / pairs.length;
    const mx = pairs.reduce((s, p) => s + p.x, 0) / pairs.length;
    let stt = 0;
    let stx = 0;
    for (const p of pairs) {
      stt += (p.t - mt) ** 2;
      stx += (p.t - mt) * (p.x - mx);
    }
    return stt > 0 ? Math.abs(stx / stt) : Infinity;
  };
  const q = (values: number[], f: number) => (values.length ? [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(f * values.length))] : Number.NaN);
  const byFront = new Map<number, Throw[]>();
  for (const t of throws.values()) byFront.set(t.front, [...(byFront.get(t.front) ?? []), t]);
  const fronts: { peel: number; onsetPeel: number; share: number; fresh: number; n: number; xs: [number, number]; span: number; onsetSpan: number }[] = [];
  for (const list of byFront.values()) {
    const xs = list.map((t) => t.x);
    if (list.length < 5 || Math.max(...xs) - Math.min(...xs) < 10) continue;
    // The solver's onset for the same wave: its column's last, within one period before the throw.
    const onsets = list.filter((t) => t.time - t.onset >= 0 && t.time - t.onset <= config.peakPeriod);
    fronts.push({
      peel: peelOf(list.map((t) => ({ x: t.x, t: t.time }))),
      onsetPeel: onsets.length >= 5 ? peelOf(onsets.map((t) => ({ x: t.x, t: t.onset }))) : Number.NaN,
      share: list.filter((t) => t.jumped > 0).length / list.length,
      fresh: list.filter((t) => t.fresh).length / list.length,
      n: list.length,
      xs: [Math.min(...xs), Math.max(...xs)],
      span: Math.max(...list.map((t) => t.time)) - Math.min(...list.map((t) => t.time)),
      onsetSpan: onsets.length ? Math.max(...onsets.map((t) => t.onset)) - Math.min(...onsets.map((t) => t.onset)) : Number.NaN,
    });
  }
  const fastFronts = fronts.filter((f) => f.peel >= fast);
  const rest = fronts.filter((f) => f.peel < fast);
  const all = [...throws.values()];
  const lag = (list: Throw[]) => list.filter((t) => t.time - t.onset >= 0 && t.time - t.onset <= config.peakPeriod).map((t) => t.time - t.onset);
  const jumpedThrows = all.filter((t) => t.jumped > 0);
  const plainThrows = all.filter((t) => t.jumped === 0);
  const joined = [...joins.values()];
  const jumpedJoins = joined.filter((j) => j.jumped);
  const plainJoins = joined.filter((j) => !j.jumped);
  const pct = (part: number, whole: number) => `${part} of ${whole} (${whole ? ((100 * part) / whole).toFixed(0) : '—'} %)`;
  const peels = fronts.map((f) => f.peel);
  const onsetPeels = fronts.map((f) => f.onsetPeel).filter(Number.isFinite);
  log([
    `${swell}, crest jumps ${jumps ? (own ? 'followed, own onset' : 'followed') : 'not followed'}, seed ${config.seed}, ${seconds} s after the spin-up: ${all.length} throws, ${jumpedThrows.length} from jumped tracks`,
    `front: joins ${front.joins - before.joins}, lost ${front.lost - before.lost}, unbroken ${front.unbroken - before.unbroken} (of them before their own onset ${front.unrisen - before.unrisen}), jumps ${front.jumps - before.jumps}`,
    `joins whose fresh test never fired: jumped ${pct(jumpedJoins.filter((j) => !j.fresh).length, jumpedJoins.length)}, the others ${pct(plainJoins.filter((j) => !j.fresh).length, plainJoins.length)}`,
    `peel over ${fronts.length} fronts: by throws ${q(peels, 0.5).toFixed(1)}/${q(peels, 0.9).toFixed(1)} m/s, by the solver's onsets ${q(onsetPeels, 0.5).toFixed(1)}/${q(onsetPeels, 0.9).toFixed(1)} m/s (median/90 %)`,
    `fast fronts (${fast} m/s or more): ${fastFronts.length}`,
    ...fastFronts.map((f) => `fast front: peel ${f.peel.toFixed(1)} m/s, onsets' ${f.onsetPeel.toFixed(1)} m/s; ${f.n} throws over x ${f.xs[0].toFixed(0)}…${f.xs[1].toFixed(0)} in ${f.span.toFixed(2)} s (onsets in ${f.onsetSpan.toFixed(2)} s); jumped ${(100 * f.share).toFixed(0)} %, fresh-risen ${(100 * f.fresh).toFixed(0)} %`),
    `the other fronts: peel ${q(rest.map((f) => f.peel), 0.5).toFixed(1)} m/s median, onsets' ${q(rest.map((f) => f.onsetPeel).filter(Number.isFinite), 0.5).toFixed(1)}; jumped ${(100 * q(rest.map((f) => f.share), 0.5)).toFixed(0)} % median, fresh-risen ${(100 * q(rest.map((f) => f.fresh), 0.5)).toFixed(0)} % median, ${rest.reduce((n, f) => n + f.n, 0)} throws`,
    `throw after the column's solver onset: jumped tracks ${q(lag(jumpedThrows), 0.1).toFixed(2)}/${q(lag(jumpedThrows), 0.5).toFixed(2)}/${q(lag(jumpedThrows), 0.9).toFixed(2)} s, the others ${q(lag(plainThrows), 0.1).toFixed(2)}/${q(lag(plainThrows), 0.5).toFixed(2)}/${q(lag(plainThrows), 0.9).toFixed(2)} s (10/50/90 %)`,
    `${((performance.now() - started) / 1000).toFixed(0)} s wall`,
  ].join(' | '));
}, 14_400_000);
