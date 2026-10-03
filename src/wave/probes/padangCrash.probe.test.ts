import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';

const quantiles = (values: number[], digits = 2) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.1, 0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(digits)).join(' / ')
    + ` (max ${sorted.at(-1)!.toFixed(digits)}, n ${sorted.length})`;
};

/**
 * Padang Padang's game-size seas before and after the swept barrel's crash (Part B, PR 5; the advisor's condition,
 * 2026-10-01: the throw moves from Kennedy's onset to the barrel's τ = 0, so the solver's water is checked both ways).
 * Per seed and swell, at 1 m cells: with the crash (CRASH=1, the library given) or without it (CRASH=0: Kennedy's lip,
 * as before PR 5), for SECONDS of sea after the spin-up. It logs:
 * - stability: every cell finite, and the fastest water (|q|/h over cells deeper than 5 cm), where and when;
 * - the peel (the peel meter's estimate) and the surf readout at the take-off (H1/3 and H1/10 over the last 2 min);
 * - the lips' water: throws, water thrown and asked, starved throws and water, unplaced momentum;
 * - with the crash: its counts, the pour's impact speeds, the jet per metre, and the crash's cost against the step's.
 * Opt-in (PROBE=1); SEEDS (1,2), SWELLS (small,medium), SECONDS (120), CRASH (1), LOG.
 */
describe.runIf(process.env.PROBE)('Padang Padang crash probe', () => {
  it('runs each sea with and without the crash and logs what the water did', () => {
    const log = process.env.LOG ?? 'padang-crash.txt';
    writeFileSync(log, '');
    const crash = process.env.CRASH !== '0';
    const library = crash ? libraryFromBytes(readBarrelCases()) : undefined;
    const seeds = (process.env.SEEDS ?? '1,2').split(',').map(Number);
    const swells = (process.env.SWELLS ?? 'small,medium').split(',') as (keyof typeof PADANG_SWELLS)[];
    const seconds = Number(process.env.SECONDS ?? 120);
    for (const size of swells) {
      for (const seed of seeds) {
        const swell = PADANG_SWELLS[size];
        const simulation = new SurfZoneSimulation({
          spot: 'padang', seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0,
          spreading: PADANG_SPREADING, tide: 0, componentCount: 24, alongShore: PADANG.alongShore, dx: 1, fineSpacing: 1, coarseSpacing: 4,
          spinUpPeriods: 1,
        }, 'spun-up', library);
        const { solver, lip } = simulation;
        let asked = 0;
        let thrown = 0;
        simulation.onThrow = (event) => {
          asked += event.asked;
          thrown += event.thrown;
        };
        const impacts: number[] = [];
        // Whether the crests stand taller without Kennedy's lip taking water (the coordinator, 2026-10-01): each step's
        // highest water above still level in the fine zone, and the front's thrown crests' heights.
        const highest: number[] = [];
        const thrownCrests: number[] = [];
        const fineRow = solver.rowBelow(simulation.tank.fineFrom);
        let fastest = 0;
        let fastestAt = '';
        let bad = '';
        let stepMs = 0;
        let steps = 0;
        let landed = 0;
        const previous = lip.onLand!;
        lip.onLand = (x, z, volume, vx, vy, vz, flight) => {
          landed += volume;
          if ((flight?.kind ?? 0) === 0) impacts.push(Math.sqrt(vx * vx + vy * vy + vz * vz));
          previous(x, z, volume, vx, vy, vz, flight);
        };
        for (let frame = 0; frame < seconds * 30 && !bad; frame += 1) {
          const start = performance.now();
          simulation.step(1 / 30);
          stepMs += performance.now() - start;
          steps += 1;
          if (frame % 3 !== 2) continue;
          let top = 0;
          for (let i = fineRow * solver.nx; i < solver.h.length; i += 1) {
            if (solver.h[i] > 0.05) top = Math.max(top, solver.h[i] + solver.bed[i] - solver.restLevel);
          }
          highest.push(top);
          for (const point of simulation.front?.points ?? []) if (point.tau >= 0) thrownCrests.push(point.height);
          for (let i = 0; i < solver.h.length; i += 1) {
            if (!(Number.isFinite(solver.h[i]) && Number.isFinite(solver.qx[i]) && Number.isFinite(solver.qz[i]))) {
              bad = `cell ${i} at t ${solver.time.toFixed(2)} s`;
              break;
            }
            if (solver.h[i] > 0.05) {
              const speed = Math.sqrt(solver.qx[i] * solver.qx[i] + solver.qz[i] * solver.qz[i]) / solver.h[i];
              if (speed > fastest) {
                fastest = speed;
                fastestAt = `t ${solver.time.toFixed(1)} s, x ${solver.xCenters[i % solver.nx].toFixed(0)}, z ${solver.zCenters[Math.floor(i / solver.nx)].toFixed(0)}, still depth ${(solver.restLevel - solver.bed[i]).toFixed(2)} m`;
              }
            }
          }
        }
        const reading = simulation.surf.reading(solver.time);
        const peel = simulation.peelEstimate();
        const counts = simulation.crash?.counts;
        appendFileSync(log, [
          `${size} seed ${seed}, ${crash ? 'with the crash' : 'Kennedy’s lip (before PR 5)'}, ${seconds} s of sea after the spin-up:`,
          `  stability: ${bad ? `NON-FINITE ${bad}` : 'finite'}; fastest water ${fastest.toFixed(1)} m/s (${fastestAt})`,
          `  peel: ${peel ? `${peel.angleDegrees.toFixed(1)}°, ${peel.peelSpeed.toFixed(1)} m/s, fit r² ${peel.fit.toFixed(2)}, ${peel.columns} columns` : 'no estimate'}`,
          `  surf at the take-off: ${reading ? `typical ${reading.typical.toFixed(2)} m, sets ${reading.sets.toFixed(2)} m over ${reading.waves} waves` : 'measuring'}`,
          `  lips: ${simulation.lipJets} throws, ${simulation.lipVolume.toFixed(1)} m³ thrown (events: asked ${asked.toFixed(1)}, thrown ${thrown.toFixed(1)}), landed ${landed.toFixed(1)} m³, airborne ${lip.airborneVolume().toFixed(1)} m³`,
          `  starved: ${lip.starvedThrows} throws, ${lip.starvedVolume.toFixed(2)} m³; unplaced momentum: ${lip.momentumClamps} throws, ${lip.unplacedMomentum.toFixed(1)} m⁴/s`,
          `  jet impacts ${quantiles(impacts, 1)} m/s`,
          `  the fine zone's highest water above still level, per tenth of a second: ${quantiles(highest)} m; the front's thrown crests: ${quantiles(thrownCrests)} m`,
          counts ? `  crash: ${JSON.stringify(counts)}` : '',
          `  step ${(stepMs / steps).toFixed(0)} ms${simulation.crash ? `, the crash ${(simulation.crash.updateMs / steps).toFixed(2)} ms` : ''}`,
          '',
        ].filter((line) => line !== '').join('\n') + '\n');
      }
    }
  }, 36_000_000);
});
