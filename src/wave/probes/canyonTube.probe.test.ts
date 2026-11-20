import { appendFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { describe, it } from 'vitest';
import { CANYON } from '../Bathymetry';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { BARREL_SPOTS } from '../barrel/barrelSpots';
import { FRONT_CAPACITY, FRONT_PIECE, FRONT_STRIDE } from '../barrel/frontRecords';
import type { ProfileLibrary } from '../barrel/ProfileLibrary';
import { BARREL_SLOPE, SweptLoft } from '../barrel/sweptLoft';
import { sampleSurfaceHeight } from '../../scene/WaterSurface';
import { CURL_CAPACITY, CURL_STRIDE } from '../SpillingCurl';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { SWELLS } from '../../game/SurfConditions';

const quantiles = (values: number[], digits = 2) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.1, 0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(digits)).join(' / ') + ` (n ${sorted.length})`;
};

/** A slice stands (the padangCurl probe's tongues) at weight 0.5 or more. */
const STANDING = 0.5;
/**
 * The Canyon's peel angle, the arm's 60–66° read on the crest's own speed: 53–57° (canyon-spilling-2026-10-05). An open
 * tube runs 1.3–3.5 H / tan α along the crest (the advisor), so 0.84–2.64 H here.
 */
const OPEN_BAND = [1.3 / Math.tan((57 * Math.PI) / 180), 3.5 / Math.tan((53 * Math.PI) / 180)] as const;

/**
 * The Canyon's tubes on its own swells (the tube from Basilisk, 2026-10-22; the advisor's log): the front's joins,
 * late joins past the throw depth (`joinPast`, the zero-lag throws), crests dropped unbroken and lost; the share of front
 * points in the tube regime and the drawn records; the columns the tube takes from the curl a frame, and how much later
 * its white comes there than the curl's own landing (the two clocks' gap). With the third ruling (2026-10-22): the
 * unbroken share among the sizes the join table has a row for (crests over the band at or above the period's lowest
 * row), the open tube's runs along the crest as the page draws them (open, standing, one front), m and in their own
 * drawn height H, and, for the slowest tenth of the holds, whether the white came at its own column's drawn touchdown:
 * how far the touchdown it waited for moved while it waited (a paused clock moves it later). Opt-in (PROBE=1): SWELL,
 * SECONDS, SEED, LOG.
 */
describe.runIf(process.env.PROBE)('the Canyon tube probe', () => {
  it('logs its fronts, regime and the curl beside the tubes', () => {
    const swellName = (process.env.SWELL ?? 'big') as keyof typeof SWELLS;
    const swell = SWELLS[swellName];
    // SPAN=off: without the pods guard (`BarrelSpot.tubeSpan`), for the before/after of the advisor's fourth ruling.
    if (process.env.SPAN === 'off') delete BARREL_SPOTS.canyon!.tubeSpan;
    const log = process.env.LOG ?? `canyon-tube-${swellName}.txt`;
    writeFileSync(log, '');
    const simulation = new SurfZoneSimulation({
      spot: 'canyon', seed: Number(process.env.SEED ?? 3), significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: swell.directionDegrees ?? 0, spreading: swell.spreading ?? 150, tide: 0, componentCount: 24, alongShore: CANYON.alongShore,
      dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
    }, 'spun-up', libraryFromBytes(readBarrelCases('canyon')));
    const front = simulation.front!;
    front.sizes = { joined: [], unbroken: [] };
    // The sizes with a join row: at or above the lowest row of each period bracketing the sea's (both clamp under it).
    const table = BARREL_SPOTS.canyon!.onset.join;
    const period = swell.peakPeriod;
    const bracket = table.filter((entry, k) => entry.period === period
      || (entry.period < period && (table[k + 1]?.period ?? Infinity) > period)
      || (entry.period > period && (table[k - 1]?.period ?? -Infinity) < period));
    const rowFloor = Math.max(...bracket.map((entry) => entry.rows[0][0])) * ((BARREL_SPOTS.canyon!.footDepth + simulation.config.tide) / BARREL_SPOTS.canyon!.onset.h0);
    const library = simulation['tubeLibrary'] as ProfileLibrary;
    const loft = new SweptLoft(library, BARREL_SLOPE.canyon!, { holdClearDrawing: true });
    const grid = simulation.renderGrid(1);
    const surface = new Float32Array(grid.nx * grid.nz * 2);
    const openRuns: number[] = [];
    const openRunsH: number[] = [];
    // Per wave (a front, all its pieces), its longest open run over its life, m, and in that run's drawn H.
    const waveOpen = new Map<number, { length: number; inH: number }>();
    // The holds' check: per column, the touchdown it first waited for, and at its white's start how far it had moved.
    // Which point each column's next marking reads (the youngest tube-regime point there, as `markTubeColumns` picks it,
    // from the front as this step left it), and each point's clock: how long it has held (paused) while the solver ran.
    const firstWait = new Float64Array(simulation.solver.nx).fill(Number.NaN);
    const marker = new Float64Array(simulation.solver.nx).fill(-1);
    const waitPoint = new Float64Array(simulation.solver.nx).fill(-1);
    const waitPause = new Float64Array(simulation.solver.nx);
    const lastTau = new Map<number, number>();
    const paused = new Map<number, number>();
    const waits: { hold: number; moved: number; paused: number; changed: boolean }[] = [];
    const slope = BARREL_SLOPE.canyon!;
    let previousTime = simulation.solver.time;
    // The CPU costs a step (the worker's front and the curl's step with the tube marking) and the loft as the page builds it.
    const frontMs: number[] = [];
    const curlMs: number[] = [];
    const loftMs: number[] = [];
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    const curls = new Float32Array(CURL_CAPACITY * CURL_STRIDE);
    let frames = 0;
    let points = 0;
    let tubePoints = 0;
    let drawn = 0;
    let tubeColumns = 0;
    let curlSlices = 0;
    const holds: number[] = [];
    const feet: number[] = [];
    const seconds = Number(process.env.SECONDS ?? 60);
    for (let frame = 0; frame < seconds * 30; frame += 1) {
      simulation.step(1 / 30);
      frames += 1;
      const time = simulation.solver.time;
      frontMs.push(simulation.stepCosts.front);
      curlMs.push(simulation.stepCosts.roller);
      points += front.points.length;
      for (const p of front.points) {
        if (p.footHeight <= simulation.tubeFootMax && (!simulation.tubeSpanned || p.tubeSpan === true)) tubePoints += 1;
        if (frame % 30 === 0) feet.push(p.footHeight);
      }
      const recordCount = simulation.writeTubeRecords(records);
      drawn += recordCount;
      if (recordCount > 0) {
        grid.xMin = simulation.windowXMin;
        simulation.writeUniformSurface(surface, grid, false);
        const built = performance.now();
        const result = loft.build(records, recordCount, 0, (x, z) => sampleSurfaceHeight(surface, grid, x, z));
        loftMs.push(performance.now() - built);
        const heights = loft['sliceHeight'] as Float64Array;
        let first = -1;
        for (let s = 0; s <= result.sliceCount; s += 1) {
          const open = s < result.sliceCount && result.slicePhase[s] === 1 && result.sliceWeight[s] >= STANDING;
          const continues = first >= 0 && s < result.sliceCount && result.sliceFront[s] === result.sliceFront[first] && result.sliceJoined[s - 1] === 1;
          if (first >= 0 && (!open || !continues)) {
            const length = result.sliceSigma[s - 1] - result.sliceSigma[first];
            const runHeights = Array.from(heights.subarray(first, s)).sort((a, b) => a - b);
            const inH = length / Math.max(1e-6, runHeights[runHeights.length >> 1]);
            openRuns.push(length);
            openRunsH.push(inH);
            const wave = result.sliceFront[first] % FRONT_PIECE;
            const best = waveOpen.get(wave);
            if (!best || length > best.length) waveOpen.set(wave, { length, inH });
            first = -1;
          }
          if (open && first < 0) first = s;
        }
      }
      const touchdowns = simulation['tubeTouchdown'] as Float64Array;
      for (let c = 0; c < touchdowns.length; c += 1) {
        const td = touchdowns[c];
        if (td !== td) {
          firstWait[c] = Number.NaN;
          continue;
        }
        // A new wave's tube (its touchdown more than a second from the one waited for) starts a new wait.
        if (firstWait[c] !== firstWait[c] || Math.abs(td - firstWait[c]) > 1) {
          firstWait[c] = td;
          waitPoint[c] = marker[c];
          waitPause[c] = paused.get(marker[c]) ?? 0;
        }
        if (previousTime < td && td <= time && simulation.curl!.tube[c] === 1) {
          const changed = marker[c] !== waitPoint[c];
          waits.push({ hold: simulation.curl!.tubeHold[c], moved: td - firstWait[c], paused: changed ? Number.NaN : (paused.get(marker[c]) ?? 0) - waitPause[c], changed });
          firstWait[c] = Number.NaN;
        }
      }
      // Each point's clock this step: what it fell short of the solver's step by (a pause: the fit would have run it back).
      const step = time - previousTime;
      marker.fill(-1);
      const best = new Float64Array(touchdowns.length).fill(-Infinity);
      for (const p of front.points) {
        const before = lastTau.get(p.id);
        // Held after its lip was drawn thrown (τ ≥ 0 a step ago): before it, a face may wait for its crest.
        if (before !== undefined && before >= 0) paused.set(p.id, (paused.get(p.id) ?? 0) + Math.max(0, step - (p.tau - before)));
        lastTau.set(p.id, p.tau);
        if (!(p.footHeight <= simulation.tubeFootMax) || (simulation.tubeSpanned && p.tubeSpan !== true) || p.column < 0 || p.column >= touchdowns.length) continue;
        const td = time - p.tau + library.profileTimes({ slope, footHeight: p.footHeight, footDepth: p.footDepth }).touchdownSeconds;
        if (!(td <= best[p.column])) {
          best[p.column] = td;
          marker[p.column] = p.id;
        }
      }
      previousTime = time;
      curlSlices += simulation.writeCurls(curls);
      const curl = simulation.curl!;
      for (let c = 0; c < curl.tube.length; c += 1) {
        if (curl.tube[c] !== 1) continue;
        tubeColumns += 1;
        if (frame % 10 === 0 && curl.tubeHold[c] === curl.tubeHold[c]) holds.push(curl.tubeHold[c]);
      }
    }
    const reached = front.joins + front.unbroken;
    const rowedJoins = front.sizes.joined.filter((h) => h >= rowFloor).length;
    const rowedUnbroken = front.sizes.unbroken.filter((h) => h >= rowFloor).length;
    const slow = [...waits].sort((a, b) => a.hold - b.hold).slice(Math.floor(0.9 * waits.length));
    const inBand = openRunsH.filter((v) => v >= OPEN_BAND[0] && v <= OPEN_BAND[1]).length;
    const waves = [...waveOpen.values()];
    // WAVES: each wave's longest open run, by front, to compare runs wave by wave (the guard leaves the sea and fronts alone).
    if (process.env.WAVES) writeFileSync(process.env.WAVES, [...waveOpen].map(([id, w]) => `${id} ${w.length.toFixed(3)} ${w.inH.toFixed(3)}`).join('\n') + '\n');
    const wavesInBand = waves.filter((w) => w.inH >= OPEN_BAND[0] && w.inH <= OPEN_BAND[1]).length;
    const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
    appendFileSync(log, [
      `the Canyon ${swellName} (Hs ${swell.significantHeight} m, ${swell.peakPeriod} s), seed ${process.env.SEED ?? 3}, ${seconds} s, 1 m cells; tube regime: foot crests to ${simulation.tubeFootMax.toFixed(2)} m (ξ_f ≥ 0.54)`,
      `front: joins ${front.joins} (late, past the throw depth: ${front.latePasses}), unbroken ${front.unbroken} (${((100 * front.unbroken) / Math.max(1, reached)).toFixed(1)} % of the crests that reached their throw depth; the bar about 20 %), lost ${front.lost}, unsized ${front.unsized}, jumps ${front.jumps}`,
      `points a frame ${(points / frames).toFixed(1)}, in the tube regime ${(tubePoints / frames).toFixed(1)} (${((100 * tubePoints) / Math.max(1, points)).toFixed(0)} %); foot crests ${quantiles(feet)} m; records drawn a frame ${(drawn / frames).toFixed(1)}`,
      `the curl: slices a frame ${(curlSlices / frames).toFixed(1)}; columns the tube takes a frame ${(tubeColumns / frames).toFixed(1)}; its white later than the curl's own landing by ${quantiles(holds)} s`,
      `sizes with a join row (crests over the band ≥ ${rowFloor.toFixed(2)} m): joins ${rowedJoins}, unbroken ${rowedUnbroken} (${((100 * rowedUnbroken) / Math.max(1, rowedJoins + rowedUnbroken)).toFixed(1)} %); under it: joins ${front.sizes.joined.length - rowedJoins}, unbroken ${front.sizes.unbroken.length - rowedUnbroken} (sizes counted after the spin-up); band crests joined ${quantiles(front.sizes.joined)} m, unbroken ${quantiles(front.sizes.unbroken)} m`,
      `open tube runs (open, standing, one front) ${quantiles(openRuns)} m, in their drawn H ${quantiles(openRunsH)} (the band 1.3–3.5 H / tan α at 53–57°: ${OPEN_BAND[0].toFixed(2)}–${OPEN_BAND[1].toFixed(2)} H; inside ${((100 * inBand) / Math.max(1, openRunsH.length)).toFixed(0)} %, under ${((100 * openRunsH.filter((v) => v < OPEN_BAND[0]).length) / Math.max(1, openRunsH.length)).toFixed(0)} %)`,
      `per wave (a front, its longest open run over its life; pods guard ${simulation.tubeSpanned ? 'on' : 'off'}): ${waves.length} waves, ${quantiles(waves.map((w) => w.length))} m (mean ${mean(waves.map((w) => w.length)).toFixed(2)}), in H ${quantiles(waves.map((w) => w.inH))}; inside 0.84–2.64 H ${((100 * wavesInBand) / Math.max(1, waves.length)).toFixed(0)} %, under ${((100 * waves.filter((w) => w.inH < OPEN_BAND[0]).length) / Math.max(1, waves.length)).toFixed(0)} %, over ${((100 * waves.filter((w) => w.inH > OPEN_BAND[1]).length) / Math.max(1, waves.length)).toFixed(0)} %`,
      `CPU ms (Node, this machine's load): the front a step ${quantiles(frontMs)}; the roller and curl with the tube marking ${quantiles(curlMs)}; the page's loft a frame with records ${quantiles(loftMs)}`,
      `whites started in tube columns ${waits.length}: hold ${quantiles(waits.map((w) => w.hold))} s; the slowest tenth (hold ≥ ${slow.length ? slow[0].hold.toFixed(2) : '—'} s): its touchdown moved while it waited ${quantiles(slow.map((w) => w.moved))} s, over 0.3 s ${slow.filter((w) => w.moved > 0.3).length} of ${slow.length}; all: over 0.3 s ${waits.filter((w) => w.moved > 0.3).length}`,
      `  of the whites whose touchdown moved over 0.3 s: the same point all along ${waits.filter((w) => w.moved > 0.3 && !w.changed).length} (its clock held after the throw ${quantiles(waits.filter((w) => w.moved > 0.3 && !w.changed).map((w) => w.paused))} s), another point took the column ${waits.filter((w) => w.moved > 0.3 && w.changed).length}; the slowest tenth's clocks held after the throw ${quantiles(slow.filter((w) => !w.changed).map((w) => w.paused))} s, changed point ${slow.filter((w) => w.changed).length}; every same-point wait's clock held after the throw over 0.3 s ${waits.filter((w) => !w.changed && w.paused > 0.3).length} of ${waits.filter((w) => !w.changed).length}`,
    ].join('\n') + '\n');
  }, 7_200_000);
});
