import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { SurfZoneSimulation, type SurfZoneConfig } from '../SurfZoneSimulation';
import { PADANG_PRACTICE_SWELL, PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';

/**
 * Padang Padang's fast fronts with the crest jumps followed (#105's check, 2026-10-01): for each front whose throws peel
 * faster than FAST m/s, how many of its points' tracks jumped before joining, and how fast the solver's own breaking
 * onsets (`markBreakingOnsets`, the peel meter's) ran along the same columns: if they peel too, the sea closes out
 * there; if they peel slower, the front's throws were bunched by the jumps. Also, per point, its throw against its
 * column's last solver onset, for jumped and unjumped tracks. The game's config, as the padangPeak probe.
 * Opt-in: PROBE=1 SWELL=small|practice JUMPS=on|off SECONDS=120 SEED=1 FAST=15 LOG=<file>.
 */
it.skipIf(!process.env.PROBE)('Padang Padang’s fast fronts, jumped or not', () => {
  const log = (text: string) => appendFileSync(process.env.LOG ?? 'padang-jumps.txt', `${text}\n`);
  const swell = process.env.SWELL ?? 'small';
  const jumps = (process.env.JUMPS ?? 'on') === 'on';
  const seconds = Number(process.env.SECONDS ?? 120);
  const fast = Number(process.env.FAST ?? 15);
  const practice = swell === 'practice';
  const source = practice ? PADANG_PRACTICE_SWELL : PADANG_SWELLS[swell as keyof typeof PADANG_SWELLS];
  const config: SurfZoneConfig = {
    spot: 'padang', seed: Number(process.env.SEED ?? 1), significantHeight: source.significantHeight, peakPeriod: source.peakPeriod,
    directionDegrees: source.directionDegrees ?? 0, spreading: practice ? PADANG_PRACTICE_SWELL.spreading : PADANG_SPREADING,
    bandwidth: practice ? PADANG_PRACTICE_SWELL.bandwidth : undefined, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu',
    ...(practice ? { heightAt: 'edge' as const } : {}), ...(jumps ? {} : { barrelFront: {} }),
  };
  const started = performance.now();
  const simulation = new SurfZoneSimulation(config);
  const front = simulation.front!;
  const lastOnset = (simulation as unknown as { lastOnset: Float64Array }).lastOnset;
  const spinUp = simulation.solver.time;
  interface Throw { front: number; x: number; time: number; joined: number; jumped: number; onset: number }
  const throws = new Map<number, Throw>();
  while (simulation.solver.time < spinUp + seconds) {
    simulation.step(1 / 30);
    for (const p of front.points) {
      if (p.thrown === null || throws.has(p.id)) continue;
      throws.set(p.id, { front: p.front, x: p.x, time: p.thrown, joined: p.joined, jumped: p.jumped ?? 0, onset: lastOnset[p.column] });
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
  const fronts: { peel: number; onsetPeel: number; share: number; n: number; xs: [number, number]; span: number; onsetSpan: number }[] = [];
  for (const list of byFront.values()) {
    const xs = list.map((t) => t.x);
    if (list.length < 5 || Math.max(...xs) - Math.min(...xs) < 10) continue;
    // The solver's onset for the same wave: its column's last, within one period before the throw.
    const onsets = list.filter((t) => t.time - t.onset >= 0 && t.time - t.onset <= config.peakPeriod);
    fronts.push({
      peel: peelOf(list.map((t) => ({ x: t.x, t: t.time }))),
      onsetPeel: onsets.length >= 5 ? peelOf(onsets.map((t) => ({ x: t.x, t: t.onset }))) : Number.NaN,
      share: list.filter((t) => t.jumped > 0).length / list.length,
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
  log([
    `${swell}, crest jumps ${jumps ? 'followed' : 'not followed'}, seed ${config.seed}, ${seconds} s after the spin-up: ${all.length} throws, ${jumpedThrows.length} from jumped tracks`,
    `fronts ${fronts.length} (fast, ${fast} m/s or more: ${fastFronts.length})`,
    ...fastFronts.map((f) => `fast front: peel ${f.peel.toFixed(1)} m/s, onsets' ${f.onsetPeel.toFixed(1)} m/s; ${f.n} throws over x ${f.xs[0].toFixed(0)}…${f.xs[1].toFixed(0)} in ${f.span.toFixed(2)} s (onsets in ${f.onsetSpan.toFixed(2)} s); jumped ${(100 * f.share).toFixed(0)} %`),
    `the other fronts: peel ${q(rest.map((f) => f.peel), 0.5).toFixed(1)} m/s median, onsets' ${q(rest.map((f) => f.onsetPeel).filter(Number.isFinite), 0.5).toFixed(1)}; jumped ${(100 * q(rest.map((f) => f.share), 0.5)).toFixed(0)} % median`,
    `throw after the column's solver onset: jumped tracks ${q(lag(jumpedThrows), 0.1).toFixed(2)}/${q(lag(jumpedThrows), 0.5).toFixed(2)}/${q(lag(jumpedThrows), 0.9).toFixed(2)} s, the others ${q(lag(plainThrows), 0.1).toFixed(2)}/${q(lag(plainThrows), 0.5).toFixed(2)}/${q(lag(plainThrows), 0.9).toFixed(2)} s (10/50/90 %)`,
    `${((performance.now() - started) / 1000).toFixed(0)} s wall`,
  ].join(' | '));
}, 14_400_000);
