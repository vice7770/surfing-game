import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { POOL, regularSignificantHeight } from '../pool';
import { LANDMARK, PROFILE_POINTS } from '../barrel/ProfileLibrary';
import { BARREL_SLOPE } from '../barrel/sweptLoft';
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
 */
describe.skipIf(!process.env.PROBE)('after-tube roller probe', () => {
  it('reports the lenses behind the tube', () => {
    const height = Number(process.env.H ?? 1.05);
    const settle = Number(process.env.SETTLE ?? 50);
    const seconds = Number(process.env.SECONDS ?? 30);
    const library = libraryFromBytes(readBarrelCases('pool', undefined, 'pool'), 'basilisk', 'pool');
    const config = {
      spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000,
      tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel', poolTubeCase: 'pool', tubeSeam: 'blend', wallBody: 'stream', afterTube: 'roller',
    } as unknown as SurfZoneConfig;
    const simulation = new SurfZoneSimulation(config, 'spun-up', library);
    const { solver } = simulation;
    while (solver.time < settle) simulation.step(1 / 30);
    const roller = (simulation as unknown as { afterRoller?: SpillingRoller }).afterRoller!;
    const slope = BARREL_SLOPE.pool!;
    // Why lenses shed: each reason's count, with the Froude number and B at the moment (median), and the still depth there.
    const sheds: { reason: string; fr: number; b: number; depth: number; age: number }[] = [];
    roller.onShed = (e) => {
      const lens = roller.lens(e.column, e.slot);
      let row = 0;
      while (lens && row < solver.nz - 1 && Math.abs(solver.zCenters[row + 1] - lens.crest) < Math.abs(solver.zCenters[row] - lens.crest)) row += 1;
      sheds.push({ reason: e.reason, fr: Math.sqrt(e.froude2), b: e.strength, depth: solver.restLevel - solver.bed[row * solver.nx + e.column], age: lens ? e.time - lens.birth : Number.NaN });
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
    interface Touchdown { t: number; column: number; wave: number; foot: number; thrown: number; roof: number; hs: number; fr: number; b: number; crestUp: number; length: number; later: number[]; shed: number; born: boolean }
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
    let next = solver.time;
    const end = solver.time + seconds;
    while (solver.time < end) {
      simulation.step(1 / 60);
      for (const p of simulation.front?.points ?? []) {
        if (p.crashedAt === undefined || p.jetReturned || seen.has(p.id)) continue;
        seen.add(p.id);
        const times = library.profileTimes({ slope, footHeight: p.footHeight, footDepth: p.footDepth });
        const at0 = drawn(p.footHeight, p.footDepth, 0);
        const atDown = drawn(p.footHeight, p.footDepth, times.touchdownSeconds - 1 / 60);
        const ok = reader.read(solver, p.column, p.z, 'seed', 12, 12, 2, simulation.breaking.strength, section);
        const lens = lensOf(p.column, p.front);
        touchdowns.push({
          t: solver.time, column: p.column, wave: p.front, foot: p.footHeight, thrown: at0.crest, roof: atDown.top,
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
      lines.push(`shed by ${reason}\t${of.length} of ${sheds.length}\tFr ${spread(of.map((e) => e.fr))}\tB ${spread(of.map((e) => e.b))}\tstill depth ${spread(of.map((e) => e.depth))}\tage ${spread(of.map((e) => e.age))}`);
    }
    writeFileSync(process.env.LOG ?? 'after-tube.log', `${lines.join('\n')}\n`);
    if (process.env.DUMP) writeFileSync(`${process.env.LOG ?? 'after-tube.log'}.dump`, `${dump.join('\n')}\n`);
  }, 1_800_000);
});
