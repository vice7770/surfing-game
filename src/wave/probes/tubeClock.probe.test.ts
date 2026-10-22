import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { CANYON, PADANG } from '../Bathymetry';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { LOFT, BARREL_SLOPE } from '../barrel/sweptLoft';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS, SWELLS } from '../../game/SurfConditions';

const quantiles = (values: number[], digits = 3) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(digits);
  return `${at(0.5)} / ${at(0.9)} / ${at(0.95)} (max ${sorted[sorted.length - 1].toFixed(digits)}, n ${sorted.length})`;
};

/**
 * The slice clocks after the throw (the advisor's fourth ruling, 2026-10-22: lips hung 0.3–1.3 s in 16–30 % of the
 * Canyon's tubes): on a spot's own swell, every front point's clock each step. After its lip is drawn thrown (τ ≥ 0 a
 * step ago) any step its clock ran less than the solver's is a hold (a hanging lip); its catch-ups (more than a step
 * and a frame) skip frames. Along each front, neighbouring thrown points' |dτ/dσ| against the loft's refinement
 * (`LOFT.frames` frames per `LOFT.spacing`), and how many neighbour pairs the loft refines. Opt-in (PROBE=1): SPOT
 * (padang, canyon), SWELL, SECONDS, SEED, LOG.
 */
describe.runIf(process.env.PROBE)('the tube clock probe', () => {
  it('logs holds, catch-ups and the clock gradient after the throw', () => {
    const spot = (process.env.SPOT ?? 'padang') as 'padang' | 'canyon';
    const swellName = process.env.SWELL ?? 'medium';
    const swell = spot === 'padang' ? PADANG_SWELLS[swellName as keyof typeof PADANG_SWELLS] : SWELLS[swellName as keyof typeof SWELLS];
    const seed = Number(process.env.SEED ?? 3);
    const log = process.env.LOG ?? `tube-clock-${spot}-${swellName}.txt`;
    writeFileSync(log, '');
    const library = libraryFromBytes(readBarrelCases(spot));
    const simulation = new SurfZoneSimulation({
      spot, seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: spot === 'padang' ? 0 : (swell.directionDegrees ?? 0),
      spreading: spot === 'padang' ? PADANG_SPREADING : (swell.spreading ?? 150), tide: 0, componentCount: 24,
      alongShore: spot === 'padang' ? PADANG.alongShore : CANYON.alongShore, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
    }, 'spun-up', library);
    const front = simulation.front!;
    const slope = BARREL_SLOPE[spot]!;
    const lastTau = new Map<number, number>();
    const heldOf = new Map<number, number>();
    const thrownIds = new Set<number>();
    let pointSteps = 0;
    let thrownSteps = 0;
    let holdSteps = 0;
    let prePauses = 0;
    const catchUps: number[] = [];
    const gradients: number[] = [];
    const overRefine: number[] = [];
    let pairs = 0;
    let refinedPairs = 0;
    let previousTime = simulation.solver.time;
    const seconds = Number(process.env.SECONDS ?? 60);
    for (let frame = 0; frame < seconds * 30; frame += 1) {
      simulation.step(1 / 30);
      const time = simulation.solver.time;
      const step = time - previousTime;
      previousTime = time;
      const points = front.points;
      for (const p of points) {
        const before = lastTau.get(p.id);
        lastTau.set(p.id, p.tau);
        if (before === undefined) continue;
        pointSteps += 1;
        const advanced = p.tau - before;
        if (before < 0) {
          if (advanced <= 1e-12 && p.tau < 0) prePauses += 1;
          continue;
        }
        thrownSteps += 1;
        thrownIds.add(p.id);
        const frameSeconds = library.profileTimes({ slope, footHeight: p.footHeight, footDepth: p.footDepth }).frameSeconds;
        if (advanced < step - 1e-9) {
          holdSteps += 1;
          heldOf.set(p.id, (heldOf.get(p.id) ?? 0) + (step - advanced));
        }
        if (advanced > step + frameSeconds) catchUps.push(advanced - step);
      }
      // Neighbours along each front (points by front, then σ), both thrown.
      for (let k = 1; k < points.length; k += 1) {
        const a = points[k - 1];
        const b = points[k];
        if (a.front !== b.front || a.tau < 0 || b.tau < 0) continue;
        const ds = b.sigma - a.sigma;
        if (!(ds > 1e-6)) continue;
        const gradient = Math.abs(b.tau - a.tau) / ds;
        gradients.push(gradient);
        const frameA = library.profileTimes({ slope, footHeight: a.footHeight, footDepth: a.footDepth }).frameSeconds;
        const frameB = library.profileTimes({ slope, footHeight: b.footHeight, footDepth: b.footDepth }).frameSeconds;
        // The loft refines a base interval of `LOFT.spacing` where the clocks differ by more than `LOFT.frames` frames.
        const limit = (LOFT.frames * Math.min(frameA, frameB)) / LOFT.spacing;
        overRefine.push(gradient / limit);
        pairs += 1;
        if (gradient > limit) refinedPairs += 1;
      }
    }
    const held = [...thrownIds].map((id) => heldOf.get(id) ?? 0);
    appendFileSync(log, [
      `${spot} ${swellName} (Hs ${swell.significantHeight} m, ${swell.peakPeriod} s), seed ${seed}, ${seconds} s, 1 m cells; frame pauses counted by the simulation ${simulation.frontPauses}`,
      `point-steps ${pointSteps}, thrown (τ ≥ 0 a step ago) ${thrownSteps}; holds after the throw (ran less than the step) ${holdSteps} (${((100 * holdSteps) / Math.max(1, thrownSteps)).toFixed(2)} %); faces paused before the throw ${prePauses}`,
      `thrown points ${thrownIds.size}: their clocks held after the throw ${quantiles(held)} s in all; held over 0.3 s ${held.filter((v) => v > 0.3).length} (${((100 * held.filter((v) => v > 0.3).length) / Math.max(1, held.length)).toFixed(1)} %)`,
      `catch-ups (a step's run over a step and a frame) ${catchUps.length}: ${quantiles(catchUps)} s beyond the step`,
      `thrown neighbours' |dτ/dσ| ${quantiles(gradients)} s/m; over the loft's refinement (${LOFT.frames} frames per ${LOFT.spacing} m), as a share of it ${quantiles(overRefine)}; pairs refined ${refinedPairs} of ${pairs} (${((100 * refinedPairs) / Math.max(1, pairs)).toFixed(2)} %)`,
    ].join('\n') + '\n');
  }, 7_200_000);
});
