import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { SurfZoneSimulation, type SurfZoneConfig } from '../SurfZoneSimulation';
import { PADANG_PRACTICE_SWELL, PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';

/**
 * Padang Padang's peak, before and after its front follows crests from the relaxation zone (the peak-sizing fix): on a
 * Surf-screen swell at mid tide, the crests the front could not size, its joins and throws, the throws and barrel
 * slices at the peak (x −80…−20, where the fine zone starts shallower than the foot band on Small and Practice), and
 * the peel of the throws along each front. FRONT_FROM picks where the front follows crests from ('fine' as before,
 * 'zone' the fix); JUMPS whether it follows its crests' jumps ('on', Padang Padang's rule, or 'off'); each listed swell
 * runs with each. Opt-in: PROBE=1 SWELLS=small,practice FRONT_FROM=fine,zone JUMPS=on,off SECONDS=120 SEED=1 LOG=<file>.
 */
const PEAK = [-80, -20] as const;

it.skipIf(!process.env.PROBE)('Padang Padang’s peak, sized or not', () => {
  for (const swell of (process.env.SWELLS ?? 'small,practice').split(',')) {
    for (const from of (process.env.FRONT_FROM ?? 'fine,zone').split(',') as ('fine' | 'zone')[]) {
      for (const jumps of (process.env.JUMPS ?? 'on').split(',')) peak(swell, from, jumps === 'on');
    }
  }
}, 14_400_000);

function peak(swell: string, from: 'fine' | 'zone', jumps: boolean): void {
  const log = (text: string) => appendFileSync(process.env.LOG ?? 'padang-peak.txt', `${text}\n`);
  const seconds = Number(process.env.SECONDS ?? 120);
  const practice = swell === 'practice';
  const source = practice ? PADANG_PRACTICE_SWELL : PADANG_SWELLS[swell as keyof typeof PADANG_SWELLS];
  const config: SurfZoneConfig = {
    spot: 'padang', seed: Number(process.env.SEED ?? 1), significantHeight: source.significantHeight, peakPeriod: source.peakPeriod,
    directionDegrees: source.directionDegrees ?? 0, spreading: practice ? PADANG_PRACTICE_SWELL.spreading : PADANG_SPREADING,
    bandwidth: practice ? PADANG_PRACTICE_SWELL.bandwidth : undefined, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu',
    ...(practice ? { heightAt: 'edge' as const } : {}), barrelFrontFrom: from, ...(jumps ? {} : { barrelFront: {} }),
  };
  const started = performance.now();
  const simulation = new SurfZoneSimulation(config);
  const front = simulation.front!;
  const spinUp = simulation.solver.time;
  const before = { unsized: front.unsized, joins: front.joins, unbroken: front.unbroken, lost: front.lost, jumps: front.jumps, waveJumps: front.waveJumps };
  const throws = new Map<number, { x: number; time: number; front: number; footHeight: number }>();
  let points = 0;
  let peakPoints = 0;
  let peakOpen = 0;
  let steps = 0;
  let frontMs = 0;
  while (simulation.solver.time < spinUp + seconds) {
    const t0 = performance.now();
    simulation.step(1 / 30);
    frontMs += performance.now() - t0;
    steps += 1;
    for (const p of front.points) {
      points += 1;
      const atPeak = p.x >= PEAK[0] && p.x <= PEAK[1];
      if (atPeak) peakPoints += 1;
      if (atPeak && p.tau >= 0) peakOpen += 1;
      if (p.thrown !== null && !throws.has(p.id)) throws.set(p.id, { x: p.x, time: p.thrown, front: p.front, footHeight: p.footHeight });
    }
  }
  // The peel along each front: a least-squares line of x against throw time over its throws (5 or more over 10 m or more).
  const byFront = new Map<number, { x: number; time: number }[]>();
  for (const t of throws.values()) byFront.set(t.front, [...(byFront.get(t.front) ?? []), t]);
  const peels: number[] = [];
  for (const list of byFront.values()) {
    const xs = list.map((t) => t.x);
    if (list.length < 5 || Math.max(...xs) - Math.min(...xs) < 10) continue;
    const mt = list.reduce((s, t) => s + t.time, 0) / list.length;
    const mx = list.reduce((s, t) => s + t.x, 0) / list.length;
    let stt = 0;
    let stx = 0;
    for (const t of list) {
      stt += (t.time - mt) ** 2;
      stx += (t.time - mt) * (t.x - mx);
    }
    if (stt > 0) peels.push(Math.abs(stx / stt));
  }
  const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
  const q = (values: number[], p: number) => (values.length ? sorted(values)[Math.min(values.length - 1, Math.floor(p * values.length))] : Number.NaN);
  const all = [...throws.values()];
  const atPeak = all.filter((t) => t.x >= PEAK[0] && t.x <= PEAK[1]);
  log([
    `${swell} (${config.significantHeight} m, ${config.peakPeriod} s), front from the ${from === 'fine' ? 'fine zone' : 'relaxation zone'}, crest jumps ${jumps ? 'followed' : 'not followed'}, seed ${config.seed}, ${seconds} s after the spin-up`,
    `crests unsized ${front.unsized - before.unsized}, joined ${front.joins - before.joins}, crossed unbroken ${front.unbroken - before.unbroken}, lost ${front.lost - before.lost}, jumps ${front.jumps - before.jumps} (within 1.5 H ${front.waveJumps - before.waveJumps})`,
    `throws ${all.length} (at the peak ${atPeak.length}), foot crests ${q(all.map((t) => t.footHeight), 0.1).toFixed(2)}/${q(all.map((t) => t.footHeight), 0.5).toFixed(2)}/${q(all.map((t) => t.footHeight), 0.9).toFixed(2)} m (at the peak ${atPeak.length ? q(atPeak.map((t) => t.footHeight), 0.5).toFixed(2) : '—'})`,
    `front point-steps ${points} (at the peak ${peakPoints}, thrown there ${peakOpen})`,
    `peel along fronts ${peels.length}: ${q(peels, 0.1).toFixed(1)}/${q(peels, 0.5).toFixed(1)}/${q(peels, 0.9).toFixed(1)} m/s`,
    `${steps} steps, ${(frontMs / steps).toFixed(0)} ms a step, ${((performance.now() - started) / 1000).toFixed(0)} s wall`,
  ].join(' | '));
}
