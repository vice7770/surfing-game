import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { JET_RELEASE_TIME, LINK_TIME, PlungingLip, ROLLER_AREA, SOURCE_SHARE, SPLASH_UP, STRIP_PARCELS, TUBE_AIR, lipThrow, overturnArea, spitSpeedLimit, type LipThrow, type TubeRoller } from './PlungingLip';
import { GRAVITY } from './dispersion';
import { LH82_AREA, PSI_RANGE, REEF_OVERTURN, jetRelativeSpeed, overturn, overturnParameter, reefOverturn, tubeFloorDepth, tubeGeometry, vortexRatio, type OverturnShape, type TubeGeometry } from './Overturn';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';
import { TUBE_EDGE } from './tubeTable';

/** 2 m of still water with a `hump` m hump over rows 10–13. */
function basin(hump = 0.8, xBoundary: 'wall' | 'open' | 'periodic' = 'wall'): ShallowWaterSolver {
  const solver = new ShallowWaterSolver({ nx: 8, xMin: 0, dx: 1, zEdges: uniformEdges(0, 30, 30), xBoundary }, () => 2, { manning: 0 });
  for (let iz = 10; iz < 14; iz += 1) {
    for (let ix = 0; ix < solver.nx; ix += 1) solver.h[iz * solver.nx + ix] += hump;
  }
  return solver;
}

/** Sets the basin's hump moving shoreward at 1.5 m/s, as a breaking crest carries its jet's momentum. */
function flowingCrest(solver: ShallowWaterSolver): void {
  for (let iz = 10; iz < 14; iz += 1) {
    for (let ix = 0; ix < solver.nx; ix += 1) solver.qz[iz * solver.nx + ix] = 1.5 * solver.h[iz * solver.nx + ix];
  }
}

function momentumZ(solver: ShallowWaterSolver): number {
  let total = 0;
  for (let iz = 0; iz < solver.nz; iz += 1) {
    for (let ix = 0; ix < solver.nx; ix += 1) total += solver.qz[iz * solver.nx + ix] * solver.dx * solver.dz[iz];
  }
  return total;
}

describe('a reef break\'s lip (Teahupo\'o Reef, Part B)', () => {
  const base = { iribarren: 3, slope: 0.44, nonlinearity: 0.05, breakerHeight: 4, windOverCelerity: 0, width: 1 };

  it('throws a reef break\'s lip from the reef overturn, and a plane slope\'s exactly as before', () => {
    // In the offshore wind Mead & Black's photos were taken in, the tube is theirs.
    const reef = lipThrow({ ...base, windOverCelerity: REEF_OVERTURN.windOverCelerity, reef: { orthogonalGradient: 1 / 12 } })!;
    const shape = reefOverturn(1 / 12, base.nonlinearity) as OverturnShape;
    expect(reef.shape.aspect).toBeCloseTo(shape.aspect, 12);
    expect(reef.volume).toBeCloseTo(shape.jetArea * 16, 9);
    expect(reef.reef?.vortexRatio).toBeCloseTo(vortexRatio(1 / 12), 12);
    // Without `reef`, a surging ξ throws nothing, as always; a plunging ξ follows Pick & Feddersen.
    expect(lipThrow(base)).toBeUndefined();
    const plane = lipThrow({ ...base, iribarren: 1, slope: 0.08 })!;
    expect(plane.shape).toEqual(overturn(overturnParameter(0.08, 0.05)));
    expect(plane.reef).toBeUndefined();
  });

  it('reads Mead & Black\'s roundness as the offshore wind their photos were taken in, and shifts only from there', () => {
    const measured = (reefOverturn(1 / 12, base.nonlinearity) as OverturnShape).aspect;
    const aspect = (windOverCelerity: number) => lipThrow({ ...base, windOverCelerity, reef: { orthogonalGradient: 1 / 12 } })!.shape.aspect;
    expect(aspect(REEF_OVERTURN.windOverCelerity)).toBeCloseTo(measured, 12);
    // Stronger offshore wind rounds it no further (the effect saturates); calm and onshore flatten it.
    expect(aspect(2 * REEF_OVERTURN.windOverCelerity)).toBeCloseTo(measured, 12);
    expect(aspect(0)).toBeCloseTo(measured + 0.18 * REEF_OVERTURN.windOverCelerity, 12);
    expect(aspect(0.3)).toBeLessThan(aspect(0));
  });

  it('asks a spot\'s own jet area for a reef break beyond the fits, theirs inside them, and changes only the water thrown', () => {
    const reef = { windOverCelerity: REEF_OVERTURN.windOverCelerity, reef: { orthogonalGradient: 1 / 12 } };
    const slab = lipThrow({ ...base, ...reef })!;
    const own = lipThrow({ ...base, ...reef, reef: { ...reef.reef, jetArea: 0.585 } })!;
    // base.breakerHeight 4 m over a 1 m column: H² = 16 m².
    expect(own.volume).toBeCloseTo(0.585 * 16, 12);
    expect(own.volume).not.toBeCloseTo(slab.volume, 6);
    expect(own.shape.aspect).toBe(slab.shape.aspect);
    expect(own.shape.tilt).toBe(slab.shape.tilt);
    expect(own.relativeSpeed).toBe(slab.relativeSpeed);
    expect(own.reef?.vortexRatio).toBe(slab.reef?.vortexRatio);
    // Inside Pick & Feddersen's fits (1:30 here) the throw is theirs, whatever the spot asks.
    const gentle = { ...reef, reef: { orthogonalGradient: 1 / 30 } };
    expect(overturnParameter(1 / 30, base.nonlinearity)).toBeLessThan(PSI_RANGE.max);
    expect(lipThrow({ ...base, ...gentle, reef: { ...gentle.reef, jetArea: 0.585 } })).toEqual(lipThrow({ ...base, ...gentle }));
    expect(lipThrow({ ...base, ...gentle })!.shape.jetArea).toBe(overturn(overturnParameter(1 / 30, base.nonlinearity)).jetArea);
    // A plane slope's lip is not a reef break's, so it has no reef conditions to carry a jet area: Pick & Feddersen's, as before.
    expect(lipThrow({ ...base, iribarren: 1, slope: 0.08 })!.volume).toBeCloseTo(overturn(overturnParameter(0.08, 0.05)).jetArea * 16, 12);
  });

  it('lands a spot\'s own jet over its own landing length beyond the fits, the void and the rest of the throw as they were', () => {
    // The Reef's (`LIP_JET`): 0.585 H² over 1.35 H, the periodic runs' jet over their tube just before touchdown.
    const own = { windOverCelerity: 0, reef: { orthogonalGradient: 1 / 2.29, jetArea: 0.585 } };
    const raised = lipThrow({ ...base, ...own })!;
    const landed = lipThrow({ ...base, ...own, reef: { ...own.reef, landingLength: 1.35 } })!;
    expect(raised.landingLength).toBeUndefined();
    // base.breakerHeight 4 m.
    expect(landed.landingLength).toBeCloseTo(1.35 * 4, 12);
    expect({ ...landed, landingLength: undefined }).toEqual(raised);
    // The sheet a jet lands as is its water over the length it lands over (PlungingLip's landing). On the ledge's roundest
    // tube in calm air, 0.99 H long: the slab's 0.47 H², over the void, 0.47 H; the Reef's 0.585 H² over the void 0.59 H,
    // and over its landing length 0.43 H, inside the runs' 0.41-0.46 H.
    const calm = { windOverCelerity: 0, reef: { orthogonalGradient: 1 / 2.29 } };
    const sheet = (lip: LipThrow) =>
      lip.volume / (base.width * (lip.landingLength ?? tubeGeometry(lip.shape, base.breakerHeight).length) * base.breakerHeight);
    expect(tubeGeometry(lipThrow({ ...base, ...calm })!.shape, 1).length).toBeCloseTo(0.991, 3);
    expect(sheet(lipThrow({ ...base, ...calm })!)).toBeCloseTo(0.474, 3);
    expect(sheet(raised)).toBeCloseTo(0.590, 3);
    expect(sheet(landed)).toBeCloseTo(0.433, 3);
    // Inside Pick & Feddersen's fits (1:30 here) the void is theirs at jet impact, and the jet lands over it, whatever the
    // spot asks; a plane slope's lip has no reef conditions to carry a landing length.
    const gentle = { windOverCelerity: 0, reef: { orthogonalGradient: 1 / 30 } };
    expect(overturnParameter(1 / 30, base.nonlinearity)).toBeLessThan(PSI_RANGE.max);
    expect(lipThrow({ ...base, ...gentle, reef: { ...gentle.reef, jetArea: 0.585, landingLength: 1.35 } })).toEqual(lipThrow({ ...base, ...gentle }));
    expect(lipThrow({ ...base, ...gentle, reef: { ...gentle.reef, landingLength: 1.35 } })!.landingLength).toBeUndefined();
    expect(lipThrow({ ...base, iribarren: 1, slope: 0.08 })!.landingLength).toBeUndefined();
  });

  it('throws a steeper ledge\'s lip from the roundest tube measured, and never collapses it', () => {
    const steep = lipThrow({ ...base, windOverCelerity: REEF_OVERTURN.windOverCelerity, reef: { orthogonalGradient: 1 / 2.29 } })!;
    expect(steep.shape.aspect).toBeCloseTo(1 / REEF_OVERTURN.roundestRatio, 12);
    expect(steep.reef?.vortexRatio).toBeCloseTo(REEF_OVERTURN.roundestRatio, 12);
  });
});

describe('the wave a landing came from (the plunge zone)', () => {
  const heights = (lip: PlungingLip) => {
    const seen: { kind: number; waveHeight: number }[] = [];
    lip.onLand = (_x, _z, _volume, _vx, _vy, _vz, flight) => { if (flight) seen.push({ kind: flight.kind, waveHeight: flight.waveHeight }); };
    return seen;
  };

  it('tells each landing of a jet the height of the wave that threw it, and a splash-up none', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 64);
    const seen = heights(lip);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 5 }, 3, 0.3, 3, { length: 1, width: 0.4, tilt: 0.4 }, undefined, 2.5);
    for (let k = 0; k < 480; k += 1) lip.step(1 / 240);
    expect(seen.filter(({ kind }) => kind === 0).length).toBeGreaterThan(0);
    expect(seen.filter(({ kind }) => kind === 1).length).toBeGreaterThan(0);
    for (const { kind, waveHeight } of seen) expect(waveHeight).toBe(kind === 0 ? 2.5 : 0);
  });

  it('keeps it through a sea handover', () => {
    const solver = basin();
    const donor = new PlungingLip(solver, 64);
    donor.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 5 }, 3, 0.3, 3, { length: 1, width: 0.4, tilt: 0.4 }, undefined, 2.5);
    donor.step(1 / 60);
    const joiner = new PlungingLip(solver, 64);
    joiner.importState(JSON.parse(JSON.stringify(donor.exportState())));
    const seen = heights(joiner);
    for (let k = 0; k < 480; k += 1) joiner.step(1 / 240);
    expect(seen.some(({ kind, waveHeight }) => kind === 0 && waveHeight === 2.5)).toBe(true);
  });
});

describe('a jet\'s landing (Teahupo\'o Reef, Part B)', () => {
  // Its water over the void's length, or over the length the throw gives it to land over, is the sheet's thickness: a
  // thick lip lands over as much of the face.
  const land = (voidLength: number, landingLength?: number) => {
    const solver = basin(2.5);
    const lip = new PlungingLip(solver, 64);
    const cell = solver.cellIndex(3.5, 12.5);
    // 1.5 m³ from the 1 m column: the crest's four rows give 0.375 m each, leaving their surface at 2.125 m.
    expect(lip.launch(cell, { x: 0, z: 5 }, 2.135, 1.5, 0, { length: voidLength, width: 0.4, tilt: 0.4 }, undefined, undefined, landingLength))
      .toBeCloseTo(1.5, 9);
    const before = Float64Array.from(solver.h);
    // Two seconds bring every parcel down, splash-ups too.
    for (let k = 0; k < 480; k += 1) lip.step(1 / 240);
    return Array.from(solver.h, (depth, i) => depth - before[i]);
  };
  const total = (landed: number[]) => landed.reduce((sum, depth) => sum + depth, 0);

  it('lands a jet over the length its throw gives it, where it gives one, not over its void (the Reef\'s, LIP_JET)', () => {
    // The same 2 m void: alone, its 1.5 m³ is a sheet 0.75 m thick and comes down mostly in one cell; over a 0.5 m landing
    // length it is a sheet 3 m thick, and the jet comes down evenly across three (its splash-ups land whole, further on).
    const one = land(2);
    const three = land(2, 0.5);
    expect(total(three)).toBeCloseTo(1.5, 9);
    expect(Math.max(...one)).toBeGreaterThan(0.55 * 1.5);
    expect(Math.max(...three)).toBeLessThan(0.3 * 1.5);
    for (const row of [14, 15, 16]) expect(three[row * 8 + 3]).toBeGreaterThan(0.25);
    expect(three[14 * 8 + 3]).toBeCloseTo(three[16 * 8 + 3], 9);
  });

  it('keeps the void, its carve and its trapped air whatever the jet lands over', () => {
    const fly = (landingLength?: number) => {
      const solver = basin(2.5);
      const lip = new PlungingLip(solver, 64);
      lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 5 }, 2.135, 1.5, 0, { length: 2, width: 0.4, tilt: 0.4 }, undefined, undefined, landingLength);
      // The tube table (what the carve reads) while the jet flies, before any of it lands.
      const rows: number[][] = [];
      for (let k = 0; k < 480; k += 1) {
        const landings = lip.landings;
        lip.step(1 / 240);
        if (landings === 0 && lip.landings === 0) {
          const into = new Float32Array(4 * 12);
          rows.push(Array.from(into.subarray(0, 12 * lip.writeTubes(into, 4))));
        }
      }
      return { rows, air: lip.trappedAir };
    };
    const [overVoid, overLength] = [fly(), fly(0.5)];
    expect(overVoid.rows.length).toBeGreaterThan(10);
    expect(overLength.rows).toEqual(overVoid.rows);
    expect(overLength.air).toBeGreaterThan(0);
    expect(overLength.air).toBe(overVoid.air);
  });

  it('keeps the length a jet lands over through a sea handover', () => {
    const run = (handover: boolean) => {
      const solver = basin(2.5);
      let lip = new PlungingLip(solver, 64);
      lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 5 }, 2.135, 1.5, 0, { length: 2, width: 0.4, tilt: 0.4 }, undefined, undefined, 0.5);
      lip.step(1 / 240);
      if (handover) {
        const joiner = new PlungingLip(solver, 64);
        joiner.importState(JSON.parse(JSON.stringify(lip.exportState())));
        lip = joiner;
      }
      const before = Float64Array.from(solver.h);
      for (let k = 0; k < 480; k += 1) lip.step(1 / 240);
      return Array.from(solver.h, (depth, i) => depth - before[i]);
    };
    const kept = run(true);
    expect(kept).toEqual(run(false));
    // Over the void it would have piled up instead (the test above).
    expect(Math.max(...kept)).toBeLessThan(0.3 * 1.5);
  });

  it('lands a sheet thicker than a cell over its thickness along its travel', () => {
    // 1.5 m³ over a 0.5 m void is a sheet 3 m thick: its jet comes down evenly across three cells (its
    // splash-ups, thrown up and on, land whole in the last).
    const landed = land(0.5);
    expect(total(landed)).toBeCloseTo(1.5, 9);
    expect(landed[11 * 8 + 3]).toBeGreaterThan(0.25);
    expect(landed[12 * 8 + 3]).toBeCloseTo(landed[11 * 8 + 3], 9);
    expect(landed[13 * 8 + 3]).toBeGreaterThan(landed[11 * 8 + 3]);
  });

  it('lands a sheet no thicker than a cell in its cell, as before', () => {
    const landed = land(2);
    expect(total(landed)).toBeCloseTo(1.5, 9);
    expect(Math.max(...landed)).toBeGreaterThan(0.55 * 1.5);
  });

  // A jet thrown along shore by the window's edge comes down past it (the Reef's pass, Big swell at high tide).
  const outward = (xBoundary: 'wall' | 'open' | 'periodic', speed = 6, tube?: TubeGeometry) => {
    const solver = basin(0.8, xBoundary);
    const lip = new PlungingLip(solver, 256);
    const landedAt: number[] = [];
    lip.onLand = (x) => landedAt.push(x);
    const before = solver.totalVolume();
    const thrown = lip.launch(solver.cellIndex(6.5, 12.5), { x: speed, z: 0 }, tube ? 3 : 5, 0.6, 0, tube);
    const launched = { h: Float64Array.from(solver.h), qx: Float64Array.from(solver.qx), qz: Float64Array.from(solver.qz), volume: solver.totalVolume() };
    for (let frame = 0; frame < 2400 && lip.activeCount() > 0; frame += 1) {
      lip.step(1 / 240);
      // The water in the window, in the air, and gone past the edge is all there was.
      expect((solver.totalVolume() + lip.airborneVolume() + lip.escapedVolume) / before).toBeCloseTo(1, 12);
    }
    expect(lip.activeCount()).toBe(0);
    return { solver, lip, thrown, launched, landedAt };
  };

  it('lets a jet that comes down past an open edge leave the window with its water and momentum', () => {
    // Clamped into the edge column, a set's jets stood a one-cell spike 4 m high there (dη/dz 4.2 in 7 m of water).
    const { solver, lip, thrown, launched, landedAt } = outward('open');
    expect(Math.min(...landedAt)).toBeGreaterThan(8);
    expect(Array.from(solver.h)).toEqual(Array.from(launched.h));
    expect(Array.from(solver.qx)).toEqual(Array.from(launched.qx));
    expect(Array.from(solver.qz)).toEqual(Array.from(launched.qz));
    // No splash-up rises from outside the window; each parcel is counted out once, with all its water.
    expect(lip.landings).toBe(STRIP_PARCELS);
    expect(lip.escapedLandings).toBe(STRIP_PARCELS);
    expect(lip.escapedVolume).toBeCloseTo(thrown, 12);
  });

  it('lands the part of a thick sheet inside an open edge, and lets the rest leave', () => {
    // A sheet 3.5 m thick (a 0.1 m void) centred 0.2 m inside the edge lands two of its four pieces past it; its
    // splash-ups, thrown on from inside, come down past it too.
    const { solver, lip, thrown, launched } = outward('open', 2, { length: 0.1, width: 0.4, tilt: 0.4 });
    const landed = solver.totalVolume() - launched.volume;
    expect(landed).toBeGreaterThan(0.2 * thrown);
    expect(lip.escapedVolume).toBeGreaterThan(SPLASH_UP.share * thrown);
    expect(landed + lip.escapedVolume).toBeCloseTo(thrown, 12);
  });

  it('keeps a jet that comes down past a wall in the window, as before', () => {
    const { solver, lip, thrown, launched } = outward('wall');
    const edge = Array.from({ length: solver.nz }, (_, iz) => solver.h[iz * solver.nx + 7] - launched.h[iz * solver.nx + 7]);
    expect(edge.reduce((sum, depth) => sum + depth, 0)).toBeCloseTo(thrown, 9);
    expect(lip.escapedVolume).toBe(0);
  });

  it('brings a jet that comes down past a periodic edge in on the far side', () => {
    const { solver, lip, thrown, launched } = outward('periodic');
    const column = (ix: number) => Array.from({ length: solver.nz }, (_, iz) => solver.h[iz * solver.nx + ix] - launched.h[iz * solver.nx + ix])
      .reduce((sum, depth) => sum + depth, 0);
    expect(column(7)).toBe(0);
    expect(column(0) + column(1) + column(2) + column(3) + column(4) + column(5)).toBeCloseTo(thrown, 9);
    expect(lip.escapedVolume).toBe(0);
  });
});

describe('PlungingLip tubes', () => {
  it('writes the newest tubes when more fly than a snapshot holds: they are at the peel’s front, where the rider is', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    const tube: TubeGeometry = { length: 1.5, width: 0.6, tilt: 0.5 };
    for (const x of [0.5, 1.5, 2.5]) {
      lip.launch(solver.cellIndex(x, 12.5), { x: 0, z: 5 }, 3, 0.3, 3, tube);
      lip.step(1 / 60);
    }
    const into = new Float32Array(2 * 12);
    expect(lip.writeTubes(into, 2)).toBe(2);
    expect([into[9], into[12 + 9]]).toEqual([1, 2]);
  });
});

describe('the collapsing tube and its air (G9)', () => {
  const tube: TubeGeometry = { length: 1.4, width: 0.6, tilt: 0.5 };
  const trapped = LH82_AREA * tube.length * tube.width * 1;
  const collapse = Math.sqrt((2 * tube.width) / GRAVITY);

  /** Throw tubed jets in the given columns, `stagger` s apart; returns the lip and the air it breaks into bubbles. */
  function peel(columns: number[], stagger: number) {
    const solver = basin();
    const lip = new PlungingLip(solver, 512);
    const bubbles = { volume: 0 };
    lip.onAir = (_x, _z, volume) => (bubbles.volume += volume);
    const escaped = { spit: 0, erupted: 0, spits: [] as { dirX: number; speed: number; airRate: number; x: number }[] };
    const record = (dt: number) => {
      for (const spit of lip.spits) {
        escaped.spit += spit.airRate * dt;
        escaped.spits.push({ dirX: spit.dirX, speed: spit.speed, airRate: spit.airRate, x: spit.x });
      }
      for (const eruption of lip.eruptions) escaped.erupted += eruption.airRate * dt;
    };
    columns.forEach((x, k) => {
      if (k > 0) for (let frame = 0; frame < Math.round(stagger * 240); frame += 1) (lip.step(1 / 240), record(1 / 240));
      lip.launch(solver.cellIndex(x, 12.5), { x: 0, z: 5 }, 3, 0.3, 3, tube);
    });
    return { lip, bubbles, escaped, run: (seconds: number) => { for (let frame = 0; frame < seconds * 240; frame += 1) (lip.step(1 / 240), record(1 / 240)); } };
  }

  it('holds a tube open while its jet still pours, and closes it once the jet has all landed', () => {
    // A jet pouring for 0.8 s: its tip lands long before its last water leaves the crest.
    const solver = basin();
    const lip = new PlungingLip(solver, 512);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 5 }, 3, 0.3, 3, tube, 0.8);
    const landed = { first: -1, last: -1 };
    // Count the jet's own landings, not its splash-ups'.
    let jet = 0;
    lip.onLand = (_x, _z, _volume, _vx, _vy, _vz, flight) => {
      if (flight?.kind === 0) jet += 1;
    };
    const table = new Float32Array(12 * 4);
    for (let frame = 0; frame < 2400; frame += 1) {
      lip.step(1 / 240);
      if (jet > 0 && landed.first < 0) landed.first = frame;
      if (jet === STRIP_PARCELS && landed.last < 0) landed.last = frame;
      lip.writeTubes(table, 4);
      // Until its last water is down the void stands whole, so the pour lands where its tube is, not on the crest.
      if (landed.first >= 0 && landed.last < 0) expect(table[10]).toBe(1);
    }
    expect(landed.last - landed.first).toBeGreaterThan(60);
  });

  it('closes a tube once its jet has landed, and shrinks its void over its free-fall time', () => {
    const { lip, run } = peel([3.5], 0);
    let closed = -1;
    for (let frame = 0; frame < 2400 && closed < 0; frame += 1) {
      run(1 / 240);
      const table = new Float32Array(12 * 4);
      if (lip.writeTubes(table, 4) === 1 && table[10] < 1) closed = frame;
    }
    expect(closed).toBeGreaterThan(0);
    const table = new Float32Array(12 * 4);
    lip.writeTubes(table, 4);
    expect(table[11]).toBeGreaterThan(0);
    expect(table[11]).toBeLessThanOrEqual(trapped + 1e-9);
    run(collapse / 2);
    lip.writeTubes(table, 4);
    expect(table[10]).toBeCloseTo(0.5, 1);
    run(collapse);
    expect(lip.writeTubes(table, 4)).toBe(0);
  });

  it('lets the air out as the drawn void shrinks: what it still holds is the void’s own volume', () => {
    const { lip, run } = peel([3.5], 0);
    const table = new Float32Array(12 * 4);
    let checked = 0;
    for (let frame = 0; frame < 2400; frame += 1) {
      run(1 / 240);
      if (lip.writeTubes(table, 4) !== 1 || !(table[10] < 1)) continue;
      // The void's length and width both shrink with its scale: its volume, and so its air, go as scale².
      expect(table[11] / trapped).toBeCloseTo(table[10] * table[10], 5);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(40);
  });

  it('accounts for every bit of a tube’s air: what escapes plus what breaks into bubbles is what it trapped', () => {
    const { bubbles, escaped, run } = peel([2.5, 3.5, 4.5], 0.3);
    run(6);
    expect(escaped.spit + escaped.erupted + bubbles.volume).toBeCloseTo(3 * trapped, 9);
    expect(escaped.spit + escaped.erupted).toBeCloseTo(3 * trapped * TUBE_AIR.escape, 9);
  });

  it('breaks the air into bubbles all along the collapsing void, not at one point', () => {
    const { lip, run } = peel([3.5], 0);
    const spans: number[] = [];
    let step: number[] = [];
    lip.onAir = (_x, z) => step.push(z);
    for (let frame = 0; frame < 2400; frame += 1) {
      step = [];
      run(1 / 240);
      if (step.length > 0) spans.push(Math.max(...step) - Math.min(...step));
    }
    expect(spans.length).toBeGreaterThan(10);
    // Its first breath of bubbles spans most of the void's length, crest to jet tip.
    expect(spans[0]).toBeGreaterThan(0.5 * tube.length * Math.cos(tube.tilt));
  });

  it('spits out of a peel’s open end, as fast as the collapsing air must leave through its mouth', () => {
    const { escaped, run } = peel([2.5, 3.5, 4.5, 5.5], 0.25);
    run(6);
    expect(escaped.spit).toBeGreaterThan(0);
    const first = escaped.spits[0];
    // The older columns close first; the air leaves toward the newest, still open.
    expect(first.dirX).toBeGreaterThan(0.9);
    expect(first.speed).toBeCloseTo(first.airRate / (LH82_AREA * tube.length * tube.width), 9);
  });

  it('rolls a foam ball in a closing tube: a roller κ_r·H² in section over its column, riding with its crest, while the void collapses', () => {
    const { lip, run } = peel([3.5], 0);
    let drop = 0;
    lip.onLand = (_x, _z, _volume, _vx, _vy, _vz, flight) => {
      if (drop === 0 && flight) drop = Math.max(0.1, flight.launch.y - flight.y);
    };
    let steps = 0;
    let first: TubeRoller | undefined;
    for (let frame = 0; frame < 2400; frame += 1) {
      run(1 / 240);
      if (lip.rollers.length > 0) {
        steps += 1;
        first ??= { ...lip.rollers[0] };
      }
    }
    expect(Math.abs(steps - collapse * 240)).toBeLessThanOrEqual(1.5);
    expect(first!.area).toBeCloseTo(ROLLER_AREA * drop * drop, 9);
    expect(first!.width).toBe(1);
    expect(first!.dirZ).toBeCloseTo(1, 9);
    expect(first!.speed).toBe(3);
  });

  it('counts the air its tubes have trapped, and what they still hold, so the air can be balanced at any moment', () => {
    const { lip, bubbles, escaped, run } = peel([2.5, 3.5, 4.5], 0.3);
    let checked = 0;
    for (let frame = 0; frame < 6 * 240; frame += 1) {
      run(1 / 240);
      const out = escaped.spit + escaped.erupted + bubbles.volume;
      expect(out + lip.heldAir).toBeCloseTo(lip.trappedAir, 9);
      if (lip.heldAir > 0) checked += 1;
    }
    expect(checked).toBeGreaterThan(40);
    expect(lip.trappedAir).toBeCloseTo(3 * trapped, 9);
    expect(lip.heldAir).toBe(0);
  });

  it('spits no faster than the falling lip can drive the air, and bursts the rest up through the lip', () => {
    // Seven columns close together into one small, late tube at the end of the section.
    const solver = basin();
    const lip = new PlungingLip(solver, 512);
    const small: TubeGeometry = { length: 0.3, width: 0.1, tilt: 0.3 };
    const air = { bubbles: 0, spit: 0, erupted: 0, fastest: 0 };
    lip.onAir = (_x, _z, volume) => (air.bubbles += volume);
    for (let column = 0; column < 7; column += 1) lip.launch(solver.cellIndex(column + 0.5, 12.5), { x: 0, z: 5 }, 3, 0.3, 3, tube);
    for (let frame = 0; frame < 2400; frame += 1) {
      if (frame === 60) lip.launch(solver.cellIndex(7.5, 12.5), { x: 0, z: 5 }, 3, 0.3, 3, small, 2);
      lip.step(1 / 240);
      for (const spit of lip.spits) {
        air.spit += spit.airRate / 240;
        air.fastest = Math.max(air.fastest, spit.speed);
      }
      for (const eruption of lip.eruptions) air.erupted += eruption.airRate / 240;
    }
    expect(air.spit).toBeGreaterThan(0);
    expect(air.fastest).toBeLessThanOrEqual(spitSpeedLimit(small.width) + 1e-9);
    expect(air.erupted).toBeGreaterThan(0);
    // Still every bit of the air: 7 big tubes and the small one.
    const trapped = LH82_AREA * (7 * tube.length * tube.width + small.length * small.width);
    expect(air.spit + air.erupted + air.bubbles).toBeCloseTo(trapped, 9);
  });

  it('erupts upward when the whole section closes at once, with no mouth to spit from', () => {
    const { escaped, run } = peel([2.5, 3.5, 4.5], 0);
    run(6);
    expect(escaped.erupted).toBeGreaterThan(0);
    expect(escaped.spit).toBe(0);
  });
});

describe('the splash-up’s landings (G9)', () => {
  it('reports each drop of water landing once: the jet what stays, its splash-up the rest when it comes down', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 512);
    let reported = 0;
    lip.onLand = (_x, _z, volume) => (reported += volume);
    const thrown = lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 5 }, 3, 0.3, 3);
    for (let frame = 0; frame < 2400; frame += 1) lip.step(1 / 240);
    expect(lip.airborneVolume()).toBe(0);
    expect(reported).toBeCloseTo(thrown, 12);
  });

  it('tells a splash-up’s landing from a jet’s, so tube measurements can leave splash-ups out', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 512);
    const kinds: number[] = [];
    lip.onLand = (_x, _z, _volume, _vx, _vy, _vz, flight) => kinds.push(flight!.kind);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 5 }, 3, 0.3, 3);
    for (let frame = 0; frame < 2400; frame += 1) lip.step(1 / 240);
    expect(kinds.filter((kind) => kind === 0).length).toBe(STRIP_PARCELS);
    expect(kinds.filter((kind) => kind === 1).length).toBe(STRIP_PARCELS);
  });

  it('tells each landing the parcel’s whole water as well as what stays, so Classic’s spray can keep to the whole jet', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 512);
    const jets: { volume: number; whole: number }[] = [];
    lip.onLand = (_x, _z, volume, _vx, _vy, _vz, flight) => {
      if (flight!.kind === 0) jets.push({ volume, whole: flight!.volume });
    };
    const thrown = lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 5 }, 3, 0.3, 3);
    for (let frame = 0; frame < 2400; frame += 1) lip.step(1 / 240);
    expect(jets).toHaveLength(STRIP_PARCELS);
    for (const jet of jets) {
      expect(jet.whole).toBeCloseTo(thrown / STRIP_PARCELS, 12);
      expect(jet.volume).toBeCloseTo((1 - SPLASH_UP.share) * jet.whole, 12);
    }
  });
});

describe('the splash-up (G9)', () => {
  /** Step until the jet's first landing; returns what landed. */
  function firstLanding(lip: PlungingLip) {
    let landed: { volume: number; vx: number; vy: number; vz: number } | undefined;
    lip.onLand = (_x, _z, volume, vx, vy, vz) => (landed ??= { volume, vx, vy, vz });
    for (let frame = 0; frame < 600 && !landed; frame += 1) lip.step(1 / 240);
    return landed!;
  }

  it('re-throws a share of a landing jet parcel up and on, and returns the rest to the water at once', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 3, 0.6);
    const landed = firstLanding(lip);
    const splashes: { volume: number; vx: number; vy: number; vz: number }[] = [];
    lip.forEachActiveParcel((parcel) => {
      if (parcel.kind === 1) splashes.push({ volume: parcel.volume, vx: parcel.vx, vy: parcel.vy, vz: parcel.vz });
    });
    expect(splashes).toHaveLength(1);
    // The landing reports the water that stays, (1 − σ) of the parcel; its splash-up carries σ.
    expect(splashes[0].volume).toBeCloseTo((SPLASH_UP.share / (1 - SPLASH_UP.share)) * landed.volume, 12);
    expect(splashes[0].vz).toBeCloseTo(SPLASH_UP.horizontal * landed.vz, 9);
    expect(splashes[0].vy).toBeCloseTo(SPLASH_UP.vertical * Math.abs(landed.vy), 9);
  });

  it('conserves the water and its forward momentum through the jet, its splash-up and their landings', () => {
    const solver = basin();
    flowingCrest(solver);
    const lip = new PlungingLip(solver, 256);
    const before = solver.totalVolume();
    const momentum = momentumZ(solver);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 3, 0.6);
    for (let frame = 0; frame < 2400 && lip.activeCount() > 0; frame += 1) {
      lip.step(1 / 240);
      expect((solver.totalVolume() + lip.airborneVolume()) / before).toBeCloseTo(1, 12);
    }
    expect(lip.activeCount()).toBe(0);
    expect(momentumZ(solver)).toBeCloseTo(momentum, 9);
  });

  it('is never offered to a rider, and lands with no further splash-up', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 3, 0.6);
    let splashesOnly = false;
    for (let frame = 0; frame < 2400 && !splashesOnly; frame += 1) {
      lip.step(1 / 240);
      let jets = 0;
      let splashes = 0;
      lip.forEachActiveParcel((parcel) => (parcel.kind === 1 ? (splashes += 1) : (jets += 1)));
      splashesOnly = splashes > 0 && jets === 0 && lip.activeCount() === splashes;
    }
    expect(splashesOnly).toBe(true);
    let offered = 0;
    lip.forEachContact(() => (offered += 1));
    lip.forEachContactNear(new Vector3(3.5, 3, 15), 100, () => (offered += 1));
    expect(offered).toBe(0);
    for (let frame = 0; frame < 2400 && lip.activeCount() > 0; frame += 1) lip.step(1 / 240);
    expect(lip.landings).toBe(2 * STRIP_PARCELS);
  });
});

describe('PlungingLip', () => {
  it('conserves water volume through launch, flight and landing in a closed basin', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    const before = solver.totalVolume();
    const thrown = lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 3, 0.3);
    expect(thrown).toBeCloseTo(0.3, 12);
    expect(lip.airborneVolume()).toBeCloseTo(0.3, 12);
    expect(solver.totalVolume() + lip.airborneVolume()).toBeCloseTo(before, 9);
    // Long enough for the jet and its splash-up (G9) to land.
    for (let frame = 0; frame < 240; frame += 1) {
      solver.step(1 / 60);
      lip.step(1 / 60);
      expect((solver.totalVolume() + lip.airborneVolume()) / before).toBeCloseTo(1, 12);
    }
    expect(lip.activeCount()).toBe(0);
    expect(lip.landings).toBe(2 * STRIP_PARCELS);
  });

  it('takes from the crest the momentum its jet carries off', () => {
    // A jet is the crest's fast surface water: thrown faster than the column moves, it must not add momentum.
    const solver = basin();
    for (let i = 0; i < solver.h.length; i += 1) solver.qz[i] = 1.5 * solver.h[i];
    const lip = new PlungingLip(solver, 256);
    const before = momentumZ(solver);
    const thrown = lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 3, 0.6, 3);
    expect(momentumZ(solver) + thrown * 4).toBeCloseTo(before, 9);
  });

  it('ignores a contact query from a body that has gone non-finite', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 3, 0.6, 3);
    lip.step(JET_RELEASE_TIME);
    let visited = 0;
    lip.forEachContactNear(new Vector3(Number.NaN, 0, 0), 1, (parcel) => {
      visited += 1;
      parcel.velocity.set(Number.NaN, Number.NaN, Number.NaN);
    });
    expect(visited).toBe(0);
    lip.forEachActiveParcel((parcel) => expect(Number.isFinite(parcel.vx + parcel.vy + parcel.vz)).toBe(true));
  });

  describe('the water a jet takes (the water-physics advisor, 2026-09-29)', () => {
    /** 2 m of still water under a 1 m wave, its crest in row 11 and its trough at still level: its upper half is rows 9–12. */
    const PROFILE: Record<number, number> = { 8: 0.2, 9: 0.5, 10: 0.9, 11: 1, 12: 0.8, 13: 0.4, 14: 0.1 };
    const crest = () => {
      const solver = basin(0);
      for (const [row, eta] of Object.entries(PROFILE)) {
        for (let ix = 0; ix < solver.nx; ix += 1) solver.h[Number(row) * solver.nx + ix] = 2 + eta;
      }
      return { solver, lip: new PlungingLip(solver, 256), cell: solver.cellIndex(3.5, 11.5) };
    };
    const rowOf = (solver: ShallowWaterSolver, row: number) => row * solver.nx + 3;
    /** A row's water above the trough, tapered to none 2H = 2 m from the crest: row 9 sits there and gives none. */
    const weight = (row: number) => PROFILE[row] * (1 - ((row - 11) / 2) ** 2);
    const WINDOW = weight(10) + weight(11) + weight(12);
    /** Throw `volume` m³ shoreward at 4 m/s from `cell`, a breaking wave `waveHeight` m high. */
    const throwFrom = (lip: PlungingLip, cell: number, volume: number, waveHeight = 1) =>
      lip.launch(cell, { x: 0, z: 4 }, 3, volume, 0, undefined, JET_RELEASE_TIME, waveHeight);

    it('takes it from the wave\'s upper half within 2H of its crest, most from its top, a fifth at most', () => {
      const { solver, lip, cell } = crest();
      expect(throwFrom(lip, cell, 100)).toBeCloseTo(0.2 * WINDOW, 9);
      for (const row of [10, 11, 12]) expect(solver.h[rowOf(solver, row)]).toBeCloseTo(2 + PROFILE[row] - 0.2 * weight(row), 9);
      // Behind or ahead of the upper half, or 2H from the crest, the water stays.
      for (const row of [8, 9, 13, 14]) expect(solver.h[rowOf(solver, row)]).toBe(2 + PROFILE[row]);
    });

    it('takes a fifth at most unless its lip has a share of its own, and then up to that', () => {
      expect(SOURCE_SHARE).toBe(0.2);
      const { solver, lip, cell } = crest();
      expect(lip.sourceShare).toBe(SOURCE_SHARE);
      expect(new PlungingLip(solver, 256, undefined).sourceShare).toBe(SOURCE_SHARE);
      const own = crest();
      const wider = new PlungingLip(own.solver, 256, 0.3);
      expect(wider.sourceShare).toBe(0.3);
      expect(throwFrom(wider, own.cell, 100)).toBeCloseTo(0.3 * WINDOW, 9);
      for (const row of [10, 11, 12]) expect(own.solver.h[rowOf(own.solver, row)]).toBeCloseTo(2 + PROFILE[row] - 0.3 * weight(row), 9);
      // The one with the default share took only its fifth from the same crest.
      expect(throwFrom(lip, cell, 100)).toBeCloseTo(0.2 * WINDOW, 9);
    });

    it('starves a throw only past its own share: an ask between a fifth and 0.3 of the window\'s water is filled by the wider lip alone', () => {
      const ask = 0.25 * WINDOW;
      const fifth = crest();
      expect(throwFrom(fifth.lip, fifth.cell, ask)).toBeCloseTo(0.2 * WINDOW, 9);
      expect(fifth.lip.starvedThrows).toBe(1);
      expect(fifth.lip.starvedVolume).toBeCloseTo(ask - 0.2 * WINDOW, 9);
      const own = crest();
      const wider = new PlungingLip(own.solver, 256, 0.3);
      expect(throwFrom(wider, own.cell, ask)).toBeCloseTo(ask, 9);
      expect(wider.starvedThrows).toBe(0);
      // Past 0.3 it starves too, by what is left.
      const most = crest();
      const widest = new PlungingLip(most.solver, 256, 0.3);
      throwFrom(widest, most.cell, 1);
      expect(widest.starvedThrows).toBe(1);
      expect(widest.starvedVolume).toBeCloseTo(1 - 0.3 * WINDOW, 9);
    });

    it('takes only what the throw asks, in the same proportions', () => {
      const { solver, lip, cell } = crest();
      expect(throwFrom(lip, cell, 0.1 * WINDOW)).toBeCloseTo(0.1 * WINDOW, 9);
      for (const row of [10, 11, 12]) expect(solver.h[rowOf(solver, row)]).toBeCloseTo(2 + PROFILE[row] - 0.1 * weight(row), 9);
      expect(lip.starvedThrows).toBe(0);
    });

    it('counts a throw its crest cannot fill, and by how much', () => {
      const { lip, cell } = crest();
      throwFrom(lip, cell, 1);
      expect(lip.starvedThrows).toBe(1);
      expect(lip.starvedVolume).toBeCloseTo(1 - 0.2 * WINDOW, 9);
    });

    it('reaches further from the crest of a taller wave', () => {
      const { solver, lip, cell } = crest();
      // A 2 m wave whose trough is 1 m below still level: its upper half is the whole column, clipped at 2H = 4 m to rows 8–14.
      throwFrom(lip, cell, 100, 2);
      for (const row of [8, 9, 10, 11, 12, 13, 14]) expect(solver.h[rowOf(solver, row)]).toBeLessThan(2 + PROFILE[row]);
      for (const row of [7, 15]) expect(solver.h[rowOf(solver, row)]).toBe(2);
    });

    it('measures from the wave\'s own trough, so a crest standing below still level over a drained trough still throws', () => {
      // The Teahupo'o step: 4 m of still water drawn down ahead of a 2 m wave whose crest is 0.3 m below still level.
      const solver = new ShallowWaterSolver({ nx: 8, xMin: 0, dx: 1, zEdges: uniformEdges(0, 30, 30), xBoundary: 'wall' }, () => 4, { manning: 0 });
      const drawn: Record<number, number> = { 8: -1.8, 9: -1.1, 10: -0.6, 11: -0.3, 12: -0.8, 13: -1.6, 14: -2.3 };
      for (const [row, eta] of Object.entries(drawn)) solver.h[rowOf(solver, Number(row))] = 4 + eta;
      const lip = new PlungingLip(solver, 256);
      const cell = solver.cellIndex(3.5, 11.5);
      // Its trough is 2.3 m below still level, and its upper half rows 9–12, tapered over 2H = 4 m.
      const above = (row: number) => (drawn[row] + 2.3) * (1 - ((row - 11) / 4) ** 2);
      expect(throwFrom(lip, cell, 100, 2)).toBeCloseTo(0.2 * (above(9) + above(10) + above(11) + above(12)), 9);
      for (const row of [9, 10, 11, 12]) expect(solver.h[rowOf(solver, row)]).toBeCloseTo(4 + drawn[row] - 0.2 * above(row), 9);
      for (const row of [8, 13, 14]) expect(solver.h[rowOf(solver, row)]).toBe(4 + drawn[row]);
    });

    it('measures from still level when told no wave height, and throws nothing from water at or below it', () => {
      const solver = basin();
      const lip = new PlungingLip(solver, 256);
      const flat = solver.cellIndex(3.5, 4.5);
      expect(lip.launch(flat, { x: 0, z: 4 }, 2, 1)).toBe(0);
      expect(solver.h[flat]).toBe(2);
    });

    it('draws water whose trough is below the reef whole, as all of it stands above the trough', () => {
      const solver = new ShallowWaterSolver({ nx: 8, xMin: 0, dx: 1, zEdges: uniformEdges(0, 30, 30), xBoundary: 'wall' }, () => -0.5, { manning: 0 });
      solver.h.fill(0.4);
      solver.h[solver.cellIndex(3.5, 12.5)] = 0.6;
      const lip = new PlungingLip(solver, 256);
      // A 1 m wave over reef 0.5 m above still level: its trough is below the reef, and within 2H its neighbours give all their 0.4 m.
      const thrown = lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 1 }, 1.1, 100, 0, undefined, JET_RELEASE_TIME, 1);
      expect(thrown).toBeCloseTo(0.2 * (0.6 + 2 * 0.4 * (1 - 0.5 ** 2)), 9);
    });

    /** The jet's momentum when it takes a tenth of the window's water at 4 m/s. */
    const MOMENTUM = 0.1 * WINDOW * 4;

    it('takes the jet\'s momentum from its crest\'s own flow when that carries enough', () => {
      const { solver, lip, cell } = crest();
      const flows: Record<number, number> = { 9: 3, 10: 1.5, 11: 2, 12: 1 };
      for (const [row, flow] of Object.entries(flows)) solver.qz[rowOf(solver, Number(row))] = flow;
      throwFrom(lip, cell, 0.1 * WINDOW);
      expect(solver.qz[rowOf(solver, 11)]).toBeCloseTo(2 - MOMENTUM, 9);
      for (const row of [9, 10, 12]) expect(solver.qz[rowOf(solver, row)]).toBe(flows[row]);
      expect(lip.momentumClamps).toBe(0);
    });

    it('reaches out from the crest a cell each way at a time until the flow covers it, taking in proportion to each cell\'s own', () => {
      const { solver, lip, cell } = crest();
      const flows: Record<number, number> = { 9: 3, 10: 0.3, 11: 0.5, 12: 0.4 };
      for (const [row, flow] of Object.entries(flows)) solver.qz[rowOf(solver, Number(row))] = flow;
      throwFrom(lip, cell, 0.1 * WINDOW);
      // The crest and its two neighbours carry 1.2 m³/s along the jet, enough: row 9 keeps its flow.
      for (const row of [10, 11, 12]) expect(solver.qz[rowOf(solver, row)]).toBeCloseTo(flows[row] * (1 - MOMENTUM / 1.2), 9);
      expect(solver.qz[rowOf(solver, 9)]).toBe(3);
    });

    it('reaches past where the water comes from, but never past the wave\'s upper half', () => {
      const { solver, lip, cell } = crest();
      // Row 9 gives no water (2H from the crest) but is in the upper half; rows 8 and 13 are below it.
      const flows: Record<number, number> = { 8: 5, 9: 2, 10: 0.1, 11: 0.2, 12: 0.1, 13: 5 };
      for (const [row, flow] of Object.entries(flows)) solver.qz[rowOf(solver, Number(row))] = flow;
      throwFrom(lip, cell, 0.1 * WINDOW);
      for (const row of [9, 10, 11, 12]) expect(solver.qz[rowOf(solver, row)]).toBeCloseTo(flows[row] * (1 - MOMENTUM / 2.4), 9);
      for (const row of [8, 13]) expect(solver.qz[rowOf(solver, row)]).toBe(5);
    });

    it('never reverses a cell\'s flow: what the upper half cannot carry is counted, and flow against the jet is left alone', () => {
      const { solver, lip, cell } = crest();
      for (const row of [9, 10, 11]) solver.qz[rowOf(solver, row)] = 0.1;
      solver.qz[rowOf(solver, 12)] = -0.2;
      throwFrom(lip, cell, 0.1 * WINDOW);
      for (const row of [9, 10, 11]) expect(solver.qz[rowOf(solver, row)]).toBeCloseTo(0, 12);
      expect(solver.qz[rowOf(solver, 12)]).toBe(-0.2);
      expect(lip.momentumClamps).toBe(1);
      expect(lip.unplacedMomentum).toBeCloseTo(MOMENTUM - 0.3, 9);
    });
  });

  it('offers each airborne parcel for contact, and a struck parcel lands with its changed momentum', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    const cell = solver.cellIndex(3.5, 12.5);
    const thrown = lip.launch(cell, { x: 0, z: 4 }, 30, 0.6);
    for (let t = 0; t <= JET_RELEASE_TIME + 1 / 60; t += 1 / 120) lip.step(1 / 120);
    const seen: { id: number; travel: number; expected: number }[] = [];
    lip.forEachContact((parcel) => {
      // Over the last 1/120 s step the parcel moved at its velocity, less half a step of gravity.
      const expected = Math.hypot(parcel.velocity.z, parcel.velocity.y + 9.81 / 240) / 120;
      seen.push({ id: parcel.id, travel: parcel.position.distanceTo(parcel.previousPosition), expected });
      expect(parcel.radius).toBeCloseTo(Math.cbrt((3 * parcel.volume) / (4 * Math.PI)), 12);
      parcel.velocity.x += 2;
    });
    expect(seen.length).toBe(STRIP_PARCELS);
    expect(new Set(seen.map((parcel) => parcel.id)).size).toBe(STRIP_PARCELS);
    for (const parcel of seen) expect(parcel.travel).toBeCloseTo(parcel.expected, 3);
    // Ids stay with their parcels.
    const again: number[] = [];
    lip.forEachContact((parcel) => again.push(parcel.id));
    expect(again).toEqual(seen.map((parcel) => parcel.id));
    for (let frame = 0; frame < 1200 && lip.activeCount() > 0; frame += 1) lip.step(1 / 120);
    let momentumX = 0;
    for (let index = 0; index < solver.h.length; index += 1) momentumX += solver.qx[index] * solver.dx * solver.dz[Math.floor(index / solver.nx)];
    expect(momentumX).toBeCloseTo(thrown * 2, 9);
  });

  it('lands ahead of the crest and hands its forward momentum to the water there', () => {
    const solver = basin();
    flowingCrest(solver);
    const lip = new PlungingLip(solver, 256);
    const cell = solver.cellIndex(3.5, 12.5);
    const momentum = momentumZ(solver);
    const thrown = lip.launch(cell, { x: 0, z: 4 }, 3, 0.6);
    const launched = Float64Array.from(solver.qz);
    const landed: number[] = [];
    // Long enough for its splash-up (G9) to land too.
    for (let frame = 0; frame < 600 && lip.activeCount() > 0; frame += 1) lip.step(1 / 120);
    let ahead = 0;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      if (solver.qz[iz * solver.nx + 3] > launched[iz * solver.nx + 3]) landed.push(solver.zCenters[iz]);
      if (solver.zCenters[iz] > 13.5) for (let ix = 0; ix < solver.nx; ix += 1) ahead += solver.qz[iz * solver.nx + ix] * solver.dx * solver.dz[iz];
    }
    expect(Math.min(...landed)).toBeGreaterThan(13.5);
    // The crest lost what the jet carried off, and the water where it landed gained it.
    expect(ahead).toBeCloseTo(thrown * 4, 9);
    expect(momentumZ(solver)).toBeCloseTo(momentum, 9);
  });

  it('keeps a bounded number of parcels, refusing a whole strip it cannot hold', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 2 * STRIP_PARCELS + 3);
    const cell = solver.cellIndex(3.5, 12.5);
    expect(lip.launch(cell, { x: 0, z: 4 }, 3, 0.1)).toBeGreaterThan(0);
    expect(lip.launch(cell + 1, { x: 0, z: 4 }, 3, 0.1)).toBeGreaterThan(0);
    const volume = solver.totalVolume();
    expect(lip.launch(cell + 2, { x: 0, z: 4 }, 3, 0.1)).toBe(0);
    expect(solver.totalVolume()).toBe(volume);
    expect(lip.activeCount()).toBe(2 * STRIP_PARCELS);
  });

  it('releases a strip of parcels along the jet over the release time, from where the crest has moved to', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 30, 0.6);
    const flying = () => {
      let count = 0;
      lip.forEachActive(() => (count += 1));
      return count;
    };
    expect(flying()).toBe(1);
    lip.step(JET_RELEASE_TIME / 2);
    expect(flying()).toBeGreaterThan(1);
    expect(flying()).toBeLessThan(STRIP_PARCELS);
    lip.step(JET_RELEASE_TIME / 2 + 1e-9);
    expect(flying()).toBe(STRIP_PARCELS);
    // The strip is the jet's cross-section: the first parcel has fallen furthest, the last is still at the crest's height.
    const parcels: { index: number; y: number; z: number }[] = [];
    lip.forEachActiveParcel((p) => parcels.push({ index: p.index, y: p.y, z: p.z }));
    parcels.sort((a, b) => a.index - b.index);
    for (let k = 1; k < parcels.length; k += 1) expect(parcels[k].y).toBeGreaterThan(parcels[k - 1].y);
    expect(parcels.at(-1)!.y).toBeCloseTo(30, 6);
  });

  it('keeps pouring from the crest for as long as the throw says', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 6 }, 30, 0.6, 4, undefined, 0.7);
    const flying = () => {
      let count = 0;
      lip.forEachActive(() => (count += 1));
      return count;
    };
    lip.step(0.35);
    expect(flying()).toBeGreaterThan(1);
    expect(flying()).toBeLessThan(STRIP_PARCELS);
    lip.step(0.35 + 1e-9);
    expect(flying()).toBe(STRIP_PARCELS);
  });

  it('releases each parcel where its crest has moved to, not where the faster jet has', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    const start = solver.zCenters[Math.floor(solver.cellIndex(3.5, 12.5) / solver.nx)];
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 6 }, 30, 0.6, 4);
    lip.step(JET_RELEASE_TIME + 1e-9);
    let last = { index: -1, z: 0, age: 0 };
    lip.forEachActiveParcel((p) => { if (p.index > last.index) last = { index: p.index, z: p.z, age: p.age }; });
    expect(last.index).toBe(STRIP_PARCELS - 1);
    expect(last.z - 6 * last.age).toBeCloseTo(start + 4 * JET_RELEASE_TIME, 6);
  });

  describe('the void under the lip', () => {
    // A still crest on the hump, 0.8 m up, throwing a jet that flies its void to the front end.
    const tube: TubeGeometry = { length: 1.2, width: 0.5, tilt: 0.35 };
    const drop = tube.width / 2 + tube.length * Math.sin(tube.tilt);
    const reach = tube.length * Math.cos(tube.tilt);
    const speed = reach / Math.sqrt((2 * drop) / 9.81);
    const throwOver = (lip: PlungingLip, solver: ShallowWaterSolver) =>
      lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: speed }, 0.8, 0.3, 0, tube);
    const crestZ = (solver: ShallowWaterSolver) => solver.zCenters[Math.floor(solver.cellIndex(3.5, 12.5) / solver.nx)];

    it('lowers the water to the void floor under the lip, opening only as far as the jet has reached', () => {
      const solver = basin();
      const lip = new PlungingLip(solver, 256);
      throwOver(lip, solver);
      lip.step(0.2);
      const tip = speed * 0.2;
      // Past the void's back edge (G9: it meets the surface over TUBE_EDGE behind it) and short of the jet's tip.
      const ahead = (TUBE_EDGE + tip) / 2;
      expect(lip.carve(3.5, crestZ(solver) + ahead, 5)).toBeCloseTo(0.8 - tubeFloorDepth(tube, ahead), 9);
      // Beyond the jet's tip, behind the crest, and in another column, the water is untouched.
      expect(lip.carve(3.5, crestZ(solver) + tip + 0.2, 5)).toBe(5);
      expect(lip.carve(3.5, crestZ(solver) - 0.2, 5)).toBe(5);
      expect(lip.carve(5.5, crestZ(solver) + ahead, 5)).toBe(5);
      // It only ever carves down.
      expect(lip.carve(3.5, crestZ(solver) + ahead, -1)).toBe(-1);
    });

    it("lands the jet at the void's front end, then closes the void", () => {
      const solver = basin();
      const lip = new PlungingLip(solver, 256);
      const landings: number[] = [];
      lip.onLand = (_x, z, _v, _vx, _vy, _vz, flight) => {
        if (flight && flight.launch.z === crestZ(solver)) landings.push(z - flight.launch.z);
      };
      throwOver(lip, solver);
      for (let step = 0; step < 240 && lip.airborneVolume() > 0; step += 1) lip.step(1 / 120);
      expect(landings[0]).toBeCloseTo(reach, 1);
      expect(lip.carve(3.5, crestZ(solver) + reach / 2, 5)).toBe(5);
    });
  });

  it('links neighbouring columns thrown close in time into one sheet, and not those thrown far apart', () => {
    const across = (gap: number) => {
      const solver = basin();
      const lip = new PlungingLip(solver, 256);
      lip.launch(solver.cellIndex(2.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
      for (let t = 0; t < gap; t += 1 / 60) lip.step(1 / 60);
      lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
      lip.step(JET_RELEASE_TIME + 0.01);
      const column = new Map<number, number>();
      lip.forEachActiveParcel((p) => column.set(p.slot, p.column));
      let count = 0;
      lip.forEachLink((a, b) => {
        if (column.get(a) !== column.get(b)) count += 1;
      });
      return count;
    };
    expect(across(0.5)).toBe(STRIP_PARCELS);
    expect(across(LINK_TIME + 1)).toBe(0);
  });

  it('keeps its links across a sliding window', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    lip.launch(solver.cellIndex(2.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
    lip.step(JET_RELEASE_TIME + 0.01);
    const links = () => {
      const found: string[] = [];
      lip.forEachLink((a, b) => found.push(`${a}-${b}`));
      return found.sort();
    };
    const before = links();
    solver.shiftAlongShore(3);
    expect(links()).toEqual(before);
  });

  it('offers the sheet at its closest point to a body, and hands a strike back to the parcels it joins', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    lip.launch(solver.cellIndex(2.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
    lip.step(JET_RELEASE_TIME + 0.01);
    const parcels = new Map<number, { x: number; y: number; z: number; vz: number; volume: number }>();
    lip.forEachActiveParcel((p) => parcels.set(p.slot, { x: p.x, y: p.y, z: p.z, vz: p.vz, volume: p.volume }));
    // A body just beside the middle of the across-link between the two strips' tips.
    const tip = [...parcels.values()].filter((p) => p.y < 60).sort((a, b) => a.y - b.y);
    const center = new Vector3(3, tip[0].y, tip[0].z + 0.1);
    const momentumBefore = [...parcels.values()].reduce((sum, p) => sum + p.volume * p.vz, 0);
    let offered = 0;
    let exchanged = 0;
    lip.forEachContactNear(center, 0.5, (parcel) => {
      offered += 1;
      expect(parcel.position.distanceTo(center)).toBeLessThanOrEqual(0.5);
      parcel.velocity.z -= 1;
      exchanged += parcel.volume;
    });
    expect(offered).toBeGreaterThan(0);
    let momentumAfter = 0;
    lip.forEachActiveParcel((p) => (momentumAfter += p.volume * p.vz));
    expect(momentumAfter - momentumBefore).toBeCloseTo(-exchanged, 9);
  });

  it('throws the same sheet for the same throws', () => {
    const run = () => {
      const solver = basin();
      const lip = new PlungingLip(solver, 256);
      lip.launch(solver.cellIndex(2.5, 12.5), { x: 0.5, z: 4 }, 5, 0.4);
      for (let frame = 0; frame < 30; frame += 1) lip.step(1 / 60);
      const out: number[] = [];
      lip.forEachActiveParcel((p) => out.push(p.x, p.y, p.z, p.index));
      return out;
    };
    expect(run()).toEqual(run());
  });
});

describe('lip shape', () => {
  const conditions = { iribarren: 0.8, slope: 1 / 20, nonlinearity: 0.3, breakerHeight: 1.5, windOverCelerity: 0, width: 1 };

  it('throws only from plunging breakers', () => {
    expect(lipThrow({ ...conditions, iribarren: 0.3 })).toBeUndefined();
    expect(lipThrow({ ...conditions, iribarren: 2.4 })).toBeUndefined();
    expect(lipThrow(conditions)).toBeDefined();
  });

  it("throws the jet's own water and flies it over the void, from the overturn of Pick & Feddersen (2026)", () => {
    const thrown = lipThrow({ ...conditions, width: 2 })!;
    const shape = overturn(overturnParameter(1 / 20, 0.3));
    expect(thrown.shape).toEqual(shape);
    expect(thrown.volume).toBeCloseTo(shape.jetArea * 1.5 * 1.5 * 2, 12);
    expect(thrown.relativeSpeed).toBeCloseTo(jetRelativeSpeed(shape, 1.5), 12);
  });

  it('throws bigger, faster jets over steeper beds', () => {
    const gentle = lipThrow({ ...conditions, slope: 1 / 50 })!;
    const steep = lipThrow({ ...conditions, slope: 1 / 12 })!;
    expect(steep.volume).toBeGreaterThan(gentle.volume);
    expect(steep.relativeSpeed).toBeGreaterThan(gentle.relativeSpeed);
  });

  it('opens the void and rounds it in offshore wind, as measured at Surf Ranch (Feddersen et al. 2023)', () => {
    expect(overturnArea(0.75)).toBeCloseTo(0.2, 2);
    expect(overturnArea(-0.4)).toBeCloseTo(0.4, 2);
    expect(overturnArea(-2)).toBe(0.4);
    expect(overturnArea(3)).toBe(0.2);
    const calm = lipThrow(conditions)!;
    const offshore = lipThrow({ ...conditions, windOverCelerity: -0.4 })!;
    const onshore = lipThrow({ ...conditions, windOverCelerity: 0.75 })!;
    expect(offshore.shape.area / calm.shape.area).toBeCloseTo(overturnArea(-0.4) / overturnArea(0), 12);
    expect(offshore.shape.aspect - calm.shape.aspect).toBeCloseTo(0.18 * 0.4, 12);
    expect(onshore.shape.area).toBeLessThan(calm.shape.area);
  });
});

