import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { POOL, POOL_STRAIGHT, poolStraightAt, poolStraightFrame, regularSignificantHeight } from '../pool';
import { LANDMARK, PROFILE_POINTS } from '../barrel/ProfileLibrary';
import { BARREL_SLOPE } from '../barrel/sweptLoft';
import { AFTER_TUBE } from '../barrel/touchdownSeeds';
import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE, SectionReader, createSection, type SpillingRoller } from '../SpillingRoller';
import { SurfZoneSimulation, type SurfZoneConfig } from '../SurfZoneSimulation';

/**
 * The Barrel's after-tube roller (`?afterTube=roller`; ruling 11, docs/research/after-tube-2026-11-11/README.md): what
 * lenses the tube's touchdowns give on the solver's own bore. Opt-in (PROBE=1), solver only: no rider. Env: H (1.05),
 * SETTLE (50 s), SECONDS (30), LOG (the report's file). Every 0.5 s: front points, those touched down, the drawn table's
 * live entries, and their scale, length across shore and thickness (median and largest); then the roller's counts.
 * Then ruling 11's sizes, per touchdown: the case's drawn height at its throw and its roof's at touchdown (the profile's
 * top over the lower of its toe and front), the solver's own section there (H_s, Fr₁, B, the crest over still water),
 * the lens's length at birth, the lens's section H at +0.5, +1, +3 and +5 s, and when it started to shed.
 * Ruling 12 (`?poolFloor=inside`): FLOOR (inside | ledge; the default floor without it) and FROUDE (depths | height: the
 * lens's Froude reading, `AFTER_TUBE.froudeBy`); touchdowns and sheds placed in the reef's frame (s along it, m behind
 * its crest line); and over the run's last wave period: the wave's height seaward of the reef, the mean level on the
 * crest line, the least water on the top and the shelf's strip, and the mean flow there along and across the reef.
 */
describe.skipIf(!process.env.PROBE)('after-tube roller probe', () => {
  it('reports the lenses behind the tube', () => {
    const height = Number(process.env.H ?? 1.05);
    const settle = Number(process.env.SETTLE ?? 50);
    const seconds = Number(process.env.SECONDS ?? 30);
    if (process.env.FROUDE === 'depths' || process.env.FROUDE === 'height') AFTER_TUBE.froudeBy = process.env.FROUDE;
    const library = libraryFromBytes(readBarrelCases('pool', undefined, 'pool'), 'basilisk', 'pool');
    const config = {
      spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000,
      tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel', poolTubeCase: 'pool', tubeSeam: 'blend', wallBody: 'stream', afterTube: 'roller',
      ...(process.env.FLOOR ? { poolFloor: process.env.FLOOR } : {}),
    } as unknown as SurfZoneConfig;
    const simulation = new SurfZoneSimulation(config, 'spun-up', library);
    const { solver } = simulation;
    while (solver.time < settle) simulation.step(1 / 30);
    const roller = (simulation as unknown as { afterRoller?: SpillingRoller }).afterRoller!;
    const slope = BARREL_SLOPE.pool!;
    // Why lenses shed: each reason's count, with the Froude number and B at the moment (median), and the still depth there.
    const sheds: { reason: string; fr: number; b: number; depth: number; age: number; behind: number; s: number; ratio: number }[] = [];
    roller.onShed = (e) => {
      const lens = roller.lens(e.column, e.slot);
      let row = 0;
      while (lens && row < solver.nz - 1 && Math.abs(solver.zCenters[row + 1] - lens.crest) < Math.abs(solver.zCenters[row] - lens.crest)) row += 1;
      sheds.push({ reason: e.reason, fr: Math.sqrt(e.froude2), b: e.strength, depth: solver.restLevel - solver.bed[row * solver.nx + e.column], age: lens ? e.time - lens.birth : Number.NaN,
        behind: lens ? -poolStraightFrame(solver.xCenters[e.column], lens.crest).n : Number.NaN, s: lens ? poolStraightFrame(solver.xCenters[e.column], lens.crest).s : Number.NaN,
        ratio: lens ? lens.height / lens.troughDepth : Number.NaN });
    };
    const profile = new Float32Array(2 * PROFILE_POINTS);
    const reader = new SectionReader();
    const section = createSection();
    const drawn = (footHeight: number, footDepth: number, seconds: number) => {
      library.profileAt({ slope, footHeight, footDepth, seconds }, profile);
      const low = Math.min(profile[2 * LANDMARK.toe + 1], profile[2 * (PROFILE_POINTS - 1) + 1]);
      let top = -Infinity;
      for (let i = 0; i < PROFILE_POINTS; i += 1) top = Math.max(top, profile[2 * i + 1]);
      return { crest: profile[2 * LANDMARK.crest + 1] - low, top: top - low };
    };
    interface Touchdown { s: number; behind: number; t: number; column: number; wave: number; foot: number; thrown: number; roof: number; hs: number; fr: number; b: number; crestUp: number; length: number; later: number[]; shed: number; born: boolean }
    const touchdowns: Touchdown[] = [];
    const seen = new Set<number>();
    const LATER = [0.5, 1, 3, 5];
    const lensOf = (column: number, wave: number) => {
      for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
        const lens = roller.lens(column, slot);
        if (lens && lens.wave === wave) return lens;
      }
      return undefined;
    };
    const table = new Float32Array(simulation.rollerColumns * ROLLER_SLOTS * ROLLER_STRIDE);
    const dump: string[] = [];
    const lines = ['t\tpoints\tdown\tlive\tscale med\tscale max\tlength med\tlength max\tthick med\tthick max\tcolumns'];
    const median = (values: number[]) => (values.length ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] : Number.NaN);
    // The reef's frame, sampled over the run's last wave period (ruling 12's section 3).
    const phi = (POOL_STRAIGHT.reefAngle * Math.PI) / 180;
    const cellAt = (s: number, n: number) => {
      const p = poolStraightAt(s);
      const x = p.x - n * Math.sin(phi) * POOL_STRAIGHT.side;
      const z = p.z - n * Math.cos(phi);
      let column = 0;
      for (let i = 1; i < solver.nx; i += 1) if (Math.abs(solver.xCenters[i] - x) < Math.abs(solver.xCenters[column] - x)) column = i;
      let row = 0;
      for (let i = 1; i < solver.nz; i += 1) if (Math.abs(solver.zCenters[i] - z) < Math.abs(solver.zCenters[row] - z)) row = i;
      return row * solver.nx + column;
    };
    const ALONG = [70, 85, 100, 115, 130, 145, 160, 175];
    const zones = {
      seaward: ALONG.map((s) => cellAt(s, 30)),
      crestLine: ALONG.map((s) => cellAt(s, 0)),
      top: ALONG.map((s) => cellAt(s, -3)),
      shelf: ALONG.flatMap((s) => [-10, -14, -18, -22].map((n) => cellAt(s, n))),
      behind: ALONG.flatMap((s) => [-35, -45, -55].map((n) => cellAt(s, n))),
    };
    const tally = Object.fromEntries(Object.keys(zones).map((k) => [k, { level: 0, along: 0, across: 0, least: Infinity, fastest: 0, count: 0 }])) as Record<keyof typeof zones, { level: number; along: number; across: number; least: number; fastest: number; count: number }>;
    const waveTop = zones.seaward.map(() => -Infinity);
    const waveLow = zones.seaward.map(() => Infinity);
    let next = solver.time;
    const end = solver.time + seconds;
    while (solver.time < end) {
      simulation.step(1 / 60);
      if (solver.time >= end - POOL.period) {
        for (const key of Object.keys(zones) as (keyof typeof zones)[]) {
          const t = tally[key];
          for (const i of zones[key]) {
            const h = solver.h[i];
            t.level += h + solver.bed[i] - solver.restLevel;
            t.least = Math.min(t.least, h);
            if (h > 0.05) {
              // Along the reef: toward its far end (−x and shoreward); across: shoreward, square to it.
              t.along += (-solver.qx[i] * Math.cos(phi) * POOL_STRAIGHT.side + solver.qz[i] * Math.sin(phi)) / h;
              t.across += (solver.qx[i] * Math.sin(phi) * POOL_STRAIGHT.side + solver.qz[i] * Math.cos(phi)) / h;
              t.fastest = Math.max(t.fastest, Math.hypot(solver.qx[i], solver.qz[i]) / h);
            }
            t.count += 1;
          }
        }
        zones.seaward.forEach((i, k) => {
          const eta = solver.h[i] + solver.bed[i] - solver.restLevel;
          waveTop[k] = Math.max(waveTop[k], eta);
          waveLow[k] = Math.min(waveLow[k], eta);
        });
      }
      for (const p of simulation.front?.points ?? []) {
        if (p.crashedAt === undefined || p.jetReturned || seen.has(p.id)) continue;
        seen.add(p.id);
        const times = library.profileTimes({ slope, footHeight: p.footHeight, footDepth: p.footDepth });
        const at0 = drawn(p.footHeight, p.footDepth, 0);
        const atDown = drawn(p.footHeight, p.footDepth, times.touchdownSeconds - 1 / 60);
        const ok = reader.read(solver, p.column, p.z, 'seed', 12, 12, 2, simulation.breaking.strength, section);
        const lens = lensOf(p.column, p.front);
        touchdowns.push({
          s: poolStraightFrame(p.x, p.z).s, behind: -poolStraightFrame(p.x, p.z).n, t: solver.time, column: p.column, wave: p.front, foot: p.footHeight, thrown: at0.crest, roof: atDown.top,
          hs: ok ? section.height : Number.NaN, fr: ok ? Math.sqrt(section.froude2) : Number.NaN, b: ok ? section.strength : Number.NaN,
          crestUp: ok ? section.crestLevel - solver.restLevel : Number.NaN, length: lens ? lens.length : Number.NaN,
          later: LATER.map(() => Number.NaN), shed: Number.NaN, born: lens !== undefined,
        });
      }
      for (const d of touchdowns) {
        const lens = lensOf(d.column, d.wave);
        const age = solver.time - d.t;
        if (lens && lens.state === 'shedding' && !(d.shed === d.shed)) d.shed = age;
        LATER.forEach((after, k) => {
          if (age >= after && age < after + 1 / 60 + 1e-9 && lens && lens.state === 'active') d.later[k] = lens.height;
        });
      }
      if (solver.time < next) continue;
      next += 0.5;
      simulation.writeRoller(table);
      const points = simulation.front?.points ?? [];
      const scale: number[] = [];
      const length: number[] = [];
      const thick: number[] = [];
      let low = Infinity;
      let high = -Infinity;
      for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
        for (let column = 0; column < solver.nx; column += 1) {
          const o = (slot * solver.nx + column) * ROLLER_STRIDE;
          if (!(table[o + ROLLER_FIELD.scale] > 0)) continue;
          scale.push(table[o + ROLLER_FIELD.scale]);
          length.push(table[o + ROLLER_FIELD.length]);
          thick.push(table[o + ROLLER_FIELD.thickness]);
          low = Math.min(low, column);
          high = Math.max(high, column);
        }
      }
      if (process.env.DUMP) {
        // Where the band lies against the roof (DUMP=1): per live table entry, its column's x, crest z, length and scale;
        // per front point, its x, z, clock and seconds since touchdown.
        for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
          for (let column = 0; column < solver.nx; column += 1) {
            const o = (slot * solver.nx + column) * ROLLER_STRIDE;
            if (!(table[o + ROLLER_FIELD.scale] > 0)) continue;
            dump.push(`${solver.time.toFixed(2)}\tband\t${slot}\t${solver.xCenters[column].toFixed(1)}\t${table[o + ROLLER_FIELD.crest].toFixed(1)}\t${table[o + ROLLER_FIELD.length].toFixed(1)}\t${table[o + ROLLER_FIELD.scale].toFixed(2)}`);
          }
        }
        for (const p of points) dump.push(`${solver.time.toFixed(2)}\tpoint\t${p.front}\t${p.x.toFixed(1)}\t${p.z.toFixed(1)}\t${p.tau.toFixed(2)}\t${p.crashedAt === undefined ? '-' : (solver.time - p.crashedAt).toFixed(2)}${p.jetReturned ? ' returned' : ''}`);
      }
      lines.push([solver.time.toFixed(2), points.length, points.filter((p) => p.crashedAt !== undefined).length, scale.length,
        median(scale).toFixed(2), Math.max(0, ...scale).toFixed(2), median(length).toFixed(2), Math.max(0, ...length).toFixed(2),
        median(thick).toFixed(2), Math.max(0, ...thick).toFixed(2), scale.length ? `${low}-${high}` : '-'].join('\t'));
    }
    lines.push(`counts ${JSON.stringify(roller.counts)}`);
    const spread = (values: number[]) => {
      const v = values.filter((x) => x === x).sort((a, b) => a - b);
      const q = (f: number) => (v.length ? v[Math.min(v.length - 1, Math.floor(f * v.length))].toFixed(2) : 'NaN');
      return `${q(0.5)} (${q(0.1)}–${q(0.9)}; ${v.length})`;
    };
    const old = touchdowns.filter((d) => solver.time - d.t >= 5.1);
    lines.push('', `touchdowns ${touchdowns.length}, of them ${old.length} over 5 s old; median (p10–p90; count)`);
    lines.push(`touchdown place: s along the reef, m\t${spread(touchdowns.map((d) => d.s))}`);
    lines.push(`touchdown place: behind the crest line, m\t${spread(touchdowns.map((d) => d.behind))}`);
    lines.push(`foot height, m\t${spread(touchdowns.map((d) => d.foot))}`);
    lines.push(`case drawn H at its throw, m\t${spread(touchdowns.map((d) => d.thrown))}`);
    lines.push(`roof top at touchdown over its low water, m\t${spread(touchdowns.map((d) => d.roof))}`);
    lines.push(`roof top / thrown crest\t${spread(touchdowns.map((d) => d.roof / d.thrown))}`);
    lines.push(`solver H_s at touchdown, m\t${spread(touchdowns.map((d) => d.hs))}`);
    lines.push(`solver crest over still water, m\t${spread(touchdowns.map((d) => d.crestUp))}`);
    lines.push(`H_s / case drawn H\t${spread(touchdowns.map((d) => d.hs / d.thrown))}`);
    lines.push(`H_s / roof top\t${spread(touchdowns.map((d) => d.hs / d.roof))}`);
    lines.push(`Fr1 at touchdown\t${spread(touchdowns.map((d) => d.fr))}`);
    lines.push(`B at touchdown\t${spread(touchdowns.map((d) => d.b))}`);
    const passing = touchdowns.filter((d) => d.b >= 0.3 && d.fr >= 1.45).length;
    lines.push(`passing B >= 0.3 and Fr >= 1.45 at touchdown\t${passing} of ${touchdowns.length}`);
    lines.push(`with a lens at touchdown\t${touchdowns.filter((d) => d.born).length} of ${touchdowns.length}`);
    lines.push(`lens length at touchdown / H_s\t${spread(touchdowns.map((d) => d.length / d.hs))}`);
    LATER.forEach((after, k) => lines.push(`lens H at +${after} s / case drawn H\t${spread(old.map((d) => d.later[k] / d.thrown))}`));
    lines.push(`started to shed, s after touchdown (of the ${old.length})\t${spread(old.map((d) => d.shed))}`);
    lines.push(`shed before 1 s / 2 s\t${old.filter((d) => d.shed < 1).length} / ${old.filter((d) => d.shed < 2).length} of ${old.length}`);
    for (const reason of ['froude', 'strength', 'lost', 'stall']) {
      const of = sheds.filter((e) => e.reason === reason);
      lines.push(`shed by ${reason}\t${of.length} of ${sheds.length}\tFr ${spread(of.map((e) => e.fr))}\tB ${spread(of.map((e) => e.b))}\tstill depth ${spread(of.map((e) => e.depth))}\tage ${spread(of.map((e) => e.age))}\tbehind the crest line ${spread(of.map((e) => e.behind))}\ts ${spread(of.map((e) => e.s))}\tH / h trough ${spread(of.map((e) => e.ratio))}`);
    }
    lines.push(`all sheds: lens age, s\t${spread(sheds.map((e) => e.age))}\tbehind the crest line, m\t${spread(sheds.map((e) => e.behind))}`);
    lines.push(`live table entries per 0.5 s (columns of broken crest, all waves)\tmedian ${median(lines.slice(1).map((l) => Number(l.split('\t')[3])).filter((v) => v === v))}`);
    lines.push('', `the run's last wave period (floor ${process.env.FLOOR ?? 'default'}, Froude by ${AFTER_TUBE.froudeBy}, sea time ${solver.time.toFixed(0)} s)`);
    lines.push(`wave height 30 m seaward of the crest line, m, at s ${ALONG.join(', ')}\t${waveTop.map((v, k) => (v - waveLow[k]).toFixed(2)).join(' ')}\tmean ${(waveTop.reduce((a, v, k) => a + v - waveLow[k], 0) / waveTop.length).toFixed(3)}`);
    for (const key of Object.keys(zones) as (keyof typeof zones)[]) {
      const t = tally[key];
      lines.push(`${key}\tmean level ${(t.level / t.count).toFixed(3)} m\tleast water ${t.least.toFixed(2)} m\tmean flow along the reef ${(t.along / t.count).toFixed(2)} m/s\tacross it, shoreward ${(t.across / t.count).toFixed(2)} m/s\tfastest ${t.fastest.toFixed(1)} m/s`);
    }
    writeFileSync(process.env.LOG ?? 'after-tube.log', `${lines.join('\n')}\n`);
    if (process.env.DUMP) writeFileSync(`${process.env.LOG ?? 'after-tube.log'}.dump`, `${dump.join('\n')}\n`);
  }, 1_800_000);
});
