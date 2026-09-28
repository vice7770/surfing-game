import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { JET_RELEASE_TIME, LINK_TIME, PlungingLip, ROLLER_AREA, SPLASH_UP, STRIP_PARCELS, TUBE_AIR, lipThrow, overturnArea, spitSpeedLimit, type TubeRoller } from './PlungingLip';
import { GRAVITY } from './dispersion';
import { LH82_AREA, REEF_OVERTURN, jetRelativeSpeed, overturn, overturnParameter, reefOverturn, tubeFloorDepth, vortexRatio, type OverturnShape, type TubeGeometry } from './Overturn';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';
import { TUBE_EDGE } from './tubeTable';

function basin(): ShallowWaterSolver {
  const solver = new ShallowWaterSolver({ nx: 8, xMin: 0, dx: 1, zEdges: uniformEdges(0, 30, 30), xBoundary: 'wall' }, () => 2, { manning: 0 });
  for (let iz = 10; iz < 14; iz += 1) {
    for (let ix = 0; ix < solver.nx; ix += 1) solver.h[iz * solver.nx + ix] += 0.8;
  }
  return solver;
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
  // Its water over the void's length is the sheet's thickness: a thick lip lands over as much of the face.
  const land = (voidLength: number) => {
    const solver = basin();
    const lip = new PlungingLip(solver, 64);
    const cell = solver.cellIndex(3.5, 12.5);
    // 1.5 m³ from the 1 m column: the crest's rows give 0.5 m each, leaving their surface at 0.3 m.
    expect(lip.launch(cell, { x: 0, z: 5 }, 0.31, 1.5, 0, { length: voidLength, width: 0.4, tilt: 0.4 })).toBeCloseTo(1.5, 9);
    const before = Float64Array.from(solver.h);
    // Two seconds bring every parcel down, splash-ups too.
    for (let k = 0; k < 480; k += 1) lip.step(1 / 240);
    return Array.from(solver.h, (depth, i) => depth - before[i]);
  };
  const total = (landed: number[]) => landed.reduce((sum, depth) => sum + depth, 0);

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
    const lip = new PlungingLip(solver, 256);
    const before = solver.totalVolume();
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 3, 0.6);
    for (let frame = 0; frame < 2400 && lip.activeCount() > 0; frame += 1) {
      lip.step(1 / 240);
      expect((solver.totalVolume() + lip.airborneVolume()) / before).toBeCloseTo(1, 12);
    }
    expect(lip.activeCount()).toBe(0);
    expect(momentumZ(solver)).toBeCloseTo(0, 9);
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
    const thrown = lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 3, 0.6);
    expect(thrown).toBeCloseTo(0.6, 12);
    expect(lip.airborneVolume()).toBeCloseTo(0.6, 12);
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

  it('caps the volume taken from the crest at a fifth of the local water', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    const cell = solver.cellIndex(3.5, 12.5);
    const depths = [cell - solver.nx, cell, cell + solver.nx].map((index) => solver.h[index]);
    const thrown = lip.launch(cell, { x: 0, z: 4 }, 3, 100);
    expect(thrown).toBeCloseTo(0.2 * depths.reduce((sum, depth) => sum + depth, 0) * solver.dx * solver.dz[0], 9);
    [cell - solver.nx, cell, cell + solver.nx].forEach((index, n) => expect(solver.h[index]).toBeCloseTo(0.8 * depths[n], 9));
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
    const lip = new PlungingLip(solver, 256);
    const cell = solver.cellIndex(3.5, 12.5);
    const thrown = lip.launch(cell, { x: 0, z: 4 }, 3, 0.6);
    const landed: number[] = [];
    // Long enough for its splash-up (G9) to land too.
    for (let frame = 0; frame < 600 && lip.activeCount() > 0; frame += 1) lip.step(1 / 120);
    let ahead = 0;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      if (solver.qz[iz * solver.nx + 3] > 0) landed.push(solver.zCenters[iz]);
      if (solver.zCenters[iz] > 13.5) for (let ix = 0; ix < solver.nx; ix += 1) ahead += solver.qz[iz * solver.nx + ix] * solver.dx * solver.dz[iz];
    }
    expect(Math.min(...landed)).toBeGreaterThan(13.5);
    // The crest lost what the jet carried off, and the water where it landed gained it.
    expect(ahead).toBeCloseTo(thrown * 4, 9);
    expect(momentumZ(solver)).toBeCloseTo(0, 9);
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

