import { appendFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { describe, it } from 'vitest';
import { CANYON, canyonBreakLineZ } from '../Bathymetry';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { waveHeightAt } from '../CrestKinematics';
import { GRAVITY } from '../dispersion';
import { BAND_LOOK_FIELD, BAND_LOOK_STRIDE, SPILLING_CURL } from '../SpillingCurl';
import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE, createLensView } from '../SpillingRoller';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { SWELLS } from '../../game/SurfConditions';

const quantiles = (values: number[], digits = 2) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.1, 0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(digits)).join(' / ') + ` (n ${sorted.length})`;
};
const median = (values: number[]) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
};

/** Stations along the ride (arc length along the break line from the peak, m) and their reach either side, as canyon-wave-r2's ride report. */
const STATIONS = [{ s: 0, reach: 15 }, { s: 30, reach: 7.5 }, { s: 60, reach: 7.5 }, { s: 90, reach: 7.5 }] as const;

/**
 * The Canyon's drawn curl against the solver's local wave down the line (canyon-curl-front, 2026-10-23): each column's
 * curl as it touches down (one sample per column and wave, outside the tube's columns), its H and where that came from
 * (the roller lens, a section of the surface, or the nominal take-off H), its throw (where the lip lands ahead of the
 * crest), its void and lip, against the solver's own face there at that moment (crest to the lowest water within half a
 * wavelength ahead, as the size report's onsets measure it, `waveHeightAt`) and the column's last onset face. Binned at
 * 0, 30, 60 and 90 m along the ride (canyon-wave-r2's stations), all and the sets (the top third by the solver's face).
 * Opt-in (PROBE=1): SWELL, SECONDS, SEED, LOG, CURL_LOCAL (off: the curl sized as before).
 */
describe.runIf(process.env.PROBE && !process.env.TABLE && !process.env.COST)('the Canyon curl size probe', () => {
  it('logs the curl at touchdown against the local face down the line', () => {
    const swellName = (process.env.SWELL ?? 'medium') as keyof typeof SWELLS;
    const swell = SWELLS[swellName];
    const seed = Number(process.env.SEED ?? 1);
    const log = process.env.LOG ?? `canyon-curl-size-${swellName}.txt`;
    writeFileSync(log, '');
    const simulation = new SurfZoneSimulation({
      spot: 'canyon', seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: swell.directionDegrees ?? 0, spreading: swell.spreading ?? 150, tide: 0, componentCount: 24, alongShore: CANYON.alongShore,
      dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
      ...(process.env.CURL_LOCAL === 'off' ? { curlLocal: false } : {}),
    }, 'spun-up', libraryFromBytes(readBarrelCases('canyon')));
    const { solver } = simulation;
    const curl = simulation.curl!;
    const roller = simulation.roller!;
    const front = simulation.spilling!;
    const { nx } = solver;
    const peakX = CANYON.peakX;
    const along = (x: number) => {
      if (x <= peakX) return x - peakX;
      let s = 0;
      for (let p = peakX; p < x; p += 0.25) s += Math.hypot(0.25, canyonBreakLineZ(p + 0.25) - canyonBreakLineZ(p));
      return s;
    };
    const lastOnset = new Float64Array(nx).fill(Number.NaN);
    const lastFace = new Float64Array(nx).fill(Number.NaN);
    simulation.onBreak = (wave) => {
      const column = Math.round((wave.x - solver.xCenters[0]) / solver.dx);
      if (column < 0 || column >= nx) return;
      lastOnset[column] = wave.time;
      lastFace[column] = wave.face;
    };
    const view = createLensView();
    // Per column, the wave whose touchdown was logged (one sample per column and wave).
    const logged = new Int32Array(nx).fill(-1);
    interface Sample { s: number; height: number; source: string; ahead: number; width: number; thickness: number; impact: number; face: number; onset: number; onsetLag: number }
    const samples: Sample[] = [];
    let tubeSkipped = 0;
    const tubeAt: number[] = [];
    // In flight (every frame, every standing slice outside the tube's columns, as `writeCurls` writes them): H against
    // the solver's face there now, where H came from, and per column and wave its H's spread over the flight.
    const nominalH = SPILLING_CURL.nominalShare * curl.options.breakerHeight;
    const flight: { s: number; ratio: number; source: string; grown: number }[] = [];
    const spread = new Map<string, { s: number; low: number; high: number }>();
    const faceAt = (column: number, crest: number) => {
      const row = solver.rowBelow(crest);
      let cell = row * nx + column;
      for (let r = Math.max(0, row - 1); r <= Math.min(solver.nz - 1, row + 1); r += 1) if (solver.surfaceAt(r * nx + column) > solver.surfaceAt(cell)) cell = r * nx + column;
      const stillDepth = Math.max(0.05, solver.restLevel - solver.bed[cell]);
      return waveHeightAt(solver, cell, 0.5 * simulation.config.peakPeriod * Math.sqrt(GRAVITY * stillDepth));
    };
    const seconds = Number(process.env.SECONDS ?? 120);
    for (let frame = 0; frame < seconds * 30; frame += 1) {
      simulation.step(1 / 30);
      const time = solver.time;
      for (let column = 0; column < nx; column += 1) {
        const k = curl.wave[column];
        if (k < 0 || curl.tube[column] === 1) continue;
        const crest = curl.crest[column];
        const age = curl.age[column];
        if (!(crest === crest) || !(age <= curl.impact[column] + SPILLING_CURL.fillSeconds) || !(age > 0)) continue;
        const id = front.waves[k].id;
        const height = curl.height[column];
        const source = roller.lensOf(column, id, view) && view.height > 0 ? 'lens' : height === nominalH ? 'nominal' : 'section';
        const s = along(solver.xCenters[column]);
        const face = faceAt(column, crest);
        if (face > 0.05) flight.push({ s, ratio: height / face, source, grown: Math.min(1, age / curl.impact[column]) });
        const key = `${column}:${id}`;
        const entry = spread.get(key);
        if (entry) {
          entry.low = Math.min(entry.low, height);
          entry.high = Math.max(entry.high, height);
        } else spread.set(key, { s, low: height, high: height });
      }
      for (let column = 0; column < nx; column += 1) {
        const k = curl.wave[column];
        if (k < 0) continue;
        const id = front.waves[k].id;
        const age = curl.age[column];
        const impact = curl.impact[column];
        const crest = curl.crest[column];
        if (!(crest === crest) || !(age >= impact) || logged[column] === id) continue;
        logged[column] = id;
        if (curl.tube[column] === 1) {
          tubeSkipped += 1;
          tubeAt.push(along(solver.xCenters[column]));
          continue;
        }
        const source = roller.lensOf(column, id, view) && view.height > 0 ? 'lens' : 'other';
        const height = curl.height[column];
        const size = curl.size(column, height);
        const row = solver.rowBelow(crest);
        let cell = row * nx + column;
        // The highest water within a metre of the curl's crest, as the size report's onset crest.
        for (let r = Math.max(0, row - 1); r <= Math.min(solver.nz - 1, row + 1); r += 1) if (solver.surfaceAt(r * nx + column) > solver.surfaceAt(cell)) cell = r * nx + column;
        const stillDepth = Math.max(0.05, solver.restLevel - solver.bed[cell]);
        const face = waveHeightAt(solver, cell, 0.5 * simulation.config.peakPeriod * Math.sqrt(GRAVITY * stillDepth));
        const reached = time - age;
        samples.push({
          s: along(solver.xCenters[column]), height, source, ahead: curl.landing[column], width: size.width, thickness: size.thickness, impact,
          face, onset: lastFace[column], onsetLag: reached - lastOnset[column],
        });
      }
    }
    const nominal = SPILLING_CURL.nominalShare * curl.options.breakerHeight;
    const lines = [
      `the Canyon ${swellName} (Hs ${swell.significantHeight} m, ${swell.peakPeriod} s), seed ${seed}, ${seconds} s after a period's spin-up; curl local sizing ${process.env.CURL_LOCAL === 'off' ? 'off' : 'on'}; `
        + `h_b ${curl.options.breakerDepth.toFixed(2)} m, nominal H ${nominal.toFixed(2)} m; touchdowns logged ${samples.length}, in the tube's columns (not drawn) ${tubeSkipped}`,
      'station (s along the ride) | slices | H drawn | the solver\'s face there at touchdown | the column\'s onset face | H ÷ face | throw (lip lands ahead), m | void W, m | lip, m | τ_i, s | source lens/other',
    ];
    for (const station of STATIONS) {
      const mine = samples.filter((p) => Math.abs(p.s - station.s) <= station.reach && p.face > 0);
      const sets = [...mine].sort((a, b) => b.face - a.face).slice(0, Math.max(1, Math.ceil(mine.length / 3)));
      const row = (list: Sample[], label: string) => `  ${label} ${String(station.s).padStart(3)} ±${station.reach} | ${String(list.length).padStart(4)} | ${quantiles(list.map((p) => p.height))} | ${quantiles(list.map((p) => p.face))} | `
        + `${quantiles(list.map((p) => p.onset).filter(Number.isFinite))} | ${quantiles(list.map((p) => p.height / p.face))} | ${quantiles(list.map((p) => p.ahead))} | ${quantiles(list.map((p) => p.width))} | `
        + `${quantiles(list.map((p) => p.thickness), 3)} | ${quantiles(list.map((p) => p.impact))} | ${list.filter((p) => p.source === 'lens').length}/${list.filter((p) => p.source !== 'lens').length}`;
      lines.push(row(mine, 'all '), row(sets, 'sets'));
      lines.push(`       touchdowns in the tube's columns here (the swept tube draws them, not the curl): ${tubeAt.filter((s) => Math.abs(s - station.s) <= station.reach).length}`);
      lines.push(`       medians: H ${median(mine.map((p) => p.height)).toFixed(2)}, face ${median(mine.map((p) => p.face)).toFixed(2)}; sets H ${median(sets.map((p) => p.height)).toFixed(2)}, face ${median(sets.map((p) => p.face)).toFixed(2)}; `
        + `onset lag (front reached − last onset) ${quantiles(mine.map((p) => p.onsetLag).filter(Number.isFinite))} s`);
    }
    lines.push('in flight (every frame, every standing slice): station | slice-frames | H ÷ the face there now, growing (s < 0.5) | grown (s ≥ 0.5) | from lens / section / nominal | per column and wave, its H\'s high ÷ low over the flight');
    for (const station of STATIONS) {
      const mine = flight.filter((p) => Math.abs(p.s - station.s) <= station.reach);
      const flights = [...spread.values()].filter((p) => Math.abs(p.s - station.s) <= station.reach);
      lines.push(`  ${String(station.s).padStart(3)} ±${station.reach} | ${mine.length} | ${quantiles(mine.filter((p) => p.grown < 0.5).map((p) => p.ratio))} | ${quantiles(mine.filter((p) => p.grown >= 0.5).map((p) => p.ratio))} | `
        + `${mine.filter((p) => p.source === 'lens').length} / ${mine.filter((p) => p.source === 'section').length} / ${mine.filter((p) => p.source === 'nominal').length} | ${quantiles(flights.map((p) => p.high / p.low))}`);
    }
    appendFileSync(log, `${lines.join('\n')}\n`);
    if (process.env.SAMPLES) writeFileSync(process.env.SAMPLES, JSON.stringify(samples));
  }, 3_600_000);
});

/**
 * The roller front's drawn table (canyon-curl-front, problem 2, the inside mats with a rim): every half second each
 * drawn entry (`writeRoller`'s copy with its look), its run along shore in its slot (columns), how far inside the break
 * line its crest lies, its look's H against its own lens's (none: a bridged gap or a lens-less entry, drawn at the
 * nominal H), its length in H, its crest thickness, trough depth, d′max and the time since its curl landed. Opt-in
 * (PROBE=1, TABLE=1): SWELL, SECONDS, SEED, LOG.
 */
describe.runIf(process.env.PROBE && process.env.TABLE && !process.env.COST)('the Canyon roller table probe', () => {
  it('logs the drawn table by run length and place', () => {
    const swellName = (process.env.SWELL ?? 'medium') as keyof typeof SWELLS;
    const swell = SWELLS[swellName];
    const seed = Number(process.env.SEED ?? 1);
    const log = process.env.LOG ?? `canyon-roller-table-${swellName}.txt`;
    writeFileSync(log, '');
    const simulation = new SurfZoneSimulation({
      spot: 'canyon', seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: swell.directionDegrees ?? 0, spreading: swell.spreading ?? 150, tide: 0, componentCount: 24, alongShore: CANYON.alongShore,
      dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
      ...(process.env.CURL_LOCAL === 'off' ? { curlLocal: false } : {}),
    }, 'spun-up', libraryFromBytes(readBarrelCases('canyon')));
    const { solver } = simulation;
    const roller = simulation.roller!;
    const { nx } = solver;
    const table = new Float32Array(ROLLER_SLOTS * nx * ROLLER_STRIDE);
    const look = new Float32Array(ROLLER_SLOTS * nx * BAND_LOOK_STRIDE);
    const view = createLensView();
    interface Entry { run: number; inside: number; drawnH: number; lensH: number; length: number; thickness: number; trough: number; rough: number; since: number; scale: number }
    const entries: Entry[] = [];
    const seconds = Number(process.env.SECONDS ?? 120);
    for (let frame = 0; frame < seconds * 30; frame += 1) {
      simulation.step(1 / 30);
      if (frame % 15 !== 0) continue;
      simulation.writeRoller(table, look);
      for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
        for (let column = 0; column < nx;) {
          const live = (c: number) => c < nx && table[((slot * nx) + c) * ROLLER_STRIDE + ROLLER_FIELD.scale] > 0;
          if (!live(column)) {
            column += 1;
            continue;
          }
          let end = column;
          while (live(end + 1)) end += 1;
          const run = end - column + 1;
          for (let c = column; c <= end; c += 1) {
            const o = ((slot * nx) + c) * ROLLER_STRIDE;
            const l = ((slot * nx) + c) * BAND_LOOK_STRIDE;
            const id = roller.tableWave(c, slot);
            const lensH = id >= 0 && roller.lensOf(c, id, view) ? view.height : Number.NaN;
            entries.push({
              run, inside: table[o + ROLLER_FIELD.crest] - canyonBreakLineZ(solver.xCenters[c]), drawnH: look[l + BAND_LOOK_FIELD.height], lensH,
              length: table[o + ROLLER_FIELD.length], thickness: table[o + ROLLER_FIELD.thickness], trough: table[o + ROLLER_FIELD.troughDepth],
              rough: table[o + ROLLER_FIELD.roughness], since: look[l + BAND_LOOK_FIELD.since], scale: table[o + ROLLER_FIELD.scale],
            });
          }
          column = end + 1;
        }
      }
    }
    const lines = [`the Canyon ${swellName}, seed ${seed}, ${seconds} s: drawn table entries every 0.5 s (${entries.length}); nominal H ${(SPILLING_CURL.nominalShare * simulation.curl!.options.breakerHeight).toFixed(2)} m`,
      'group | entries | drawn H | its lens\'s H (share with none) | L ÷ drawn H | L, m | crest t ÷ drawn H | h1, m | d′max ÷ h1 | since landed, s | scale'];
    const groups: [string, (e: Entry) => boolean][] = [
      ['runs ≤ 12 m, inside > 20 m', (e) => e.run <= 12 && e.inside > 20],
      ['runs ≤ 12 m, within 20 m of the line', (e) => e.run <= 12 && e.inside <= 20],
      ['runs > 12 m, inside > 20 m', (e) => e.run > 12 && e.inside > 20],
      ['runs > 12 m, within 20 m of the line', (e) => e.run > 12 && e.inside <= 20],
    ];
    for (const [label, test] of groups) {
      const mine = entries.filter(test);
      const none = mine.filter((e) => !(e.lensH > 0)).length;
      lines.push(`  ${label} | ${mine.length} | ${quantiles(mine.map((e) => e.drawnH))} | ${quantiles(mine.map((e) => e.lensH).filter((v) => v > 0))} (${((100 * none) / Math.max(1, mine.length)).toFixed(0)} % none) | `
        + `${quantiles(mine.map((e) => e.length / e.drawnH))} | ${quantiles(mine.map((e) => e.length))} | ${quantiles(mine.map((e) => e.thickness / e.drawnH))} | ${quantiles(mine.map((e) => e.trough))} | `
        + `${quantiles(mine.map((e) => e.rough / Math.max(0.01, e.trough)))} | ${quantiles(mine.map((e) => e.since))} | ${quantiles(mine.map((e) => e.scale))}`);
    }
    appendFileSync(log, `${lines.join('\n')}\n`);
  }, 3_600_000);
});

/**
 * The curl's CPU cost with its local H (canyon-curl-front): on Medium's own swell, each step the curl's update (in the
 * roller's step cost) and the drawn band with its look (`writeRoller`), the local H on and off on alternate steps of one
 * sea. Opt-in (PROBE=1, COST=1): SWELL, SECONDS.
 */
describe.runIf(process.env.PROBE && process.env.COST)('the Canyon curl cost probe', () => {
  it('times the curl and the band with the local H on and off', () => {
    const swellName = (process.env.SWELL ?? 'medium') as keyof typeof SWELLS;
    const swell = SWELLS[swellName];
    const simulation = new SurfZoneSimulation({
      spot: 'canyon', seed: 1, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: swell.directionDegrees ?? 0, spreading: swell.spreading ?? 150, tide: 0, componentCount: 24, alongShore: CANYON.alongShore,
      dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
    }, 'spun-up', libraryFromBytes(readBarrelCases('canyon')));
    const curl = simulation.curl! as unknown as { local: boolean };
    const nx = simulation.solver.nx;
    const table = new Float32Array(ROLLER_SLOTS * nx * ROLLER_STRIDE);
    const look = new Float32Array(ROLLER_SLOTS * nx * BAND_LOOK_STRIDE);
    const roller = { on: [] as number[], off: [] as number[] };
    const band = { on: [] as number[], off: [] as number[] };
    const seconds = Number(process.env.SECONDS ?? 60);
    for (let frame = 0; frame < seconds * 30; frame += 1) {
      const local = frame % 2 === 0;
      curl.local = local;
      simulation.step(1 / 30);
      roller[local ? 'on' : 'off'].push(simulation.stepCosts.roller);
      const start = performance.now();
      simulation.writeRoller(table, look);
      band[local ? 'on' : 'off'].push(performance.now() - start);
    }
    appendFileSync(process.env.LOG ?? 'canyon-curl-cost.txt', `the Canyon ${swellName}, ${seconds} s, alternate steps: the roller and curl's step ms on ${quantiles(roller.on, 4)} / off ${quantiles(roller.off, 4)}; `
      + `the drawn band with its look (writeRoller) ms on ${quantiles(band.on, 4)} / off ${quantiles(band.off, 4)}\n`);
  }, 3_600_000);
});
