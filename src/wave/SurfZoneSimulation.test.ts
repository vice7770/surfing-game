import { describe, expect, it } from 'vitest';
import { REEF, createSpot, type SpotName } from './Bathymetry';
import { madsenSorensenWaveNumber } from './BoussinesqSolver';
import { SETS_OVER_TYPICAL, komarGaughan } from './surfForecast';
import { BREAKER_INDEX } from './SwellReadout';
import { breakerDepthFor } from './Breaking';
import {
  FOAM_DECAY, OFFSHORE_DEPTH, SurfZoneSimulation, TAKE_OFF_EDGE_MARGIN, TAKE_OFF_INDEX, TANK, ZONE_WAVELENGTHS, edgeHeight, solverStage, surfZoneSea, takeOffPoint, tankDepth, tankLayout,
  windOnsetScale, type SurfZoneConfig,
} from './SurfZoneSimulation';
import { BoussinesqSolver } from './BoussinesqSolver';
import { REEF_OVERTURN } from './Overturn';
import { shallowWaterWaveNumber, shoalingCoefficient, waveKinematics } from './dispersion';
import { REEF_SWELLS } from '../game/SurfConditions';
import { REEF_PRACTICE_SWELL } from '../game/PhysicalMode';
import { rayConcentration } from './Refraction';
import { crestSpeedAt } from './CrestKinematics';
import { PhysicalSurfWater } from '../physics/PhysicalSurfWater';
import { TAKE_OFF_BAND } from './SurfMeter';

const small: Omit<SurfZoneConfig, 'spot'> = {
  seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 10, spreading: 12, tide: 0,
  componentCount: 12, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
};

describe('SurfZoneSimulation', () => {
  it('takes the Reef\'s buoy swell in deep water, shoaled to its 30 m edge, and the Canyon\'s at its edge', () => {
    expect(edgeHeight({ ...small, spot: 'reef', significantHeight: 3, peakPeriod: 18 }, OFFSHORE_DEPTH.reef))
      .toBeCloseTo(3 * shoalingCoefficient(18, OFFSHORE_DEPTH.reef + small.tide), 9);
    expect(edgeHeight({ ...small, spot: 'canyon', significantHeight: 3, peakPeriod: 18 })).toBe(3);
  });

  it('keeps the water finite on the biggest swells the Reef and today\'s Point tank can be given (wave sizes review)', () => {
    // The Reef at its 3 m cap and the Point on today's 8 m tank (2.4 m, shoaled to ~3.1 m), 18 s at high tide.
    // (The Reef at 3 m / 18 s / high tide already blew up with seed 3 before the wave-sizes work; its tank is the Reef rework's.)
    const big = { ...small, peakPeriod: 18, tide: 1, alongShore: 40, dx: 1, fineSpacing: 1, componentCount: 32 };
    for (const config of [
      { ...big, seed: 1, spot: 'reef' as const, significantHeight: 3 },
      { ...big, seed: 1, spot: 'point' as const, significantHeight: 2.4 },
      { ...big, seed: 3, spot: 'point' as const, significantHeight: 2.4 },
    ]) {
      const simulation = new SurfZoneSimulation(config);
      for (let frame = 0; frame < 30 * 30; frame += 1) simulation.step(1 / 30);
      for (const value of simulation.solver.h) expect(Number.isFinite(value)).toBe(true);
    }
  }, 600_000);

  it('takes a buoy height in deep water and shoals it to the tank\'s edge (wave sizes)', () => {
    const config: SurfZoneConfig = { ...small, spot: 'point', significantHeight: 2, peakPeriod: 12 };
    expect(edgeHeight(config)).toBeCloseTo(2 * shoalingCoefficient(12, OFFSHORE_DEPTH.point), 12);
    expect(surfZoneSea(config).components[0].amplitude).toBeCloseTo(edgeHeight(config) / Math.sqrt(8 * small.componentCount!), 12);
    // Practice gives its height at the edge, and the Canyon always takes its swell there: their seas stay as they were.
    expect(edgeHeight({ ...config, heightAt: 'edge' })).toBe(2);
    expect(edgeHeight({ ...config, spot: 'canyon' })).toBe(2);
  });

  it('warm-starts so the spun-up sea sits at a chosen sea time (a room\'s clock)', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'canyon', stage: 1, startSeaTime: 500 });
    expect(simulation.seaTime).toBeCloseTo(500, 6);
    const early = new SurfZoneSimulation({ ...small, spot: 'canyon', stage: 1, startSeaTime: 3 });
    expect(early.seaTime).toBeCloseTo(3, 6);
  });

  it('builds a finite, wave-filled surf zone for every spot and hands over before the set', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      const simulation = new SurfZoneSimulation({ ...small, spot });
      const { solver } = simulation;
      let finite = true;
      let largest = 0;
      for (let i = 0; i < solver.h.length; i += 1) {
        finite &&= Number.isFinite(solver.h[i]) && solver.h[i] >= 0 && Number.isFinite(solver.qz[i]);
        const z = solver.zCenters[Math.floor(i / solver.nx)];
        if (z > TANK.zoneInner && z < TANK.blendEnd && solver.h[i] > 0) largest = Math.max(largest, Math.abs(solver.surfaceAt(i)));
      }
      expect(finite).toBe(true);
      expect(largest).toBeGreaterThan(0.25 * small.significantHeight);
      expect(simulation.timeToSet).toBeCloseTo(25, 6);
    }
  });

  it('runs the Reef on stage 2 whatever the config asks, forcing the solver’s own waves at its boundary', () => {
    expect(solverStage('reef', 1)).toBe(2);
    expect(solverStage('beach', 1)).toBe(1);
    expect(solverStage('canyon', undefined)).toBe(2);
    const reef = new SurfZoneSimulation({ ...small, spot: 'reef', stage: 1 });
    expect(reef.solver).toBeInstanceOf(BoussinesqSolver);
    const omega = reef.sea.components[0].omega;
    expect(reef.sea.components[0].k).toBeCloseTo(madsenSorensenWaveNumber(omega, reef.sea.depth), 10);
    const beach = new SurfZoneSimulation({ ...small, spot: 'beach' });
    expect(beach.sea.components[0].k).toBe(shallowWaterWaveNumber(beach.sea.components[0].omega, beach.sea.depth));
  });

  it('spins up the menu\'s first Reef on the GPU tier\'s sea without blowing up', () => {
    // The practice groundswell, 64 components and seed 1: at a quarter second between stability checks,
    // a trough drained a reef cell to 7 cm with 112 m/s of backwash and the spin-up diverged at 2.25 s.
    const simulation = new SurfZoneSimulation({
      spot: 'reef', seed: 1, significantHeight: 2, peakPeriod: 12, directionDegrees: 10, spreading: 40, bandwidth: 0.08,
      tide: 0, windSpeed: 0, stage: 2, componentCount: 64,
    });
    const { solver } = simulation;
    let deepest = 0;
    for (let i = 0; i < solver.h.length; i += 1) deepest = Math.max(deepest, solver.h[i]);
    // No column stands more than 10 m above the tank's floor (the runaway piled water far higher).
    expect(deepest).toBeLessThan(OFFSHORE_DEPTH.reef + 10);
    expect(solver.maxStableStep()).toBeGreaterThan(1e-3);
  }, 180_000);

  describe('spinning up after the build (the worker spins up on its GPU)', () => {
    const sameWater = (a: SurfZoneSimulation, b: SurfZoneSimulation) => {
      expect(a.solver.time).toBe(b.solver.time);
      expect(Array.from(a.solver.h)).toEqual(Array.from(b.solver.h));
      expect(Array.from(a.solver.qx)).toEqual(Array.from(b.solver.qx));
      expect(Array.from(a.solver.qz)).toEqual(Array.from(b.solver.qz));
    };

    it('builds warm, then spins up to the same sea as a build that spins up at once', async () => {
      const eager = new SurfZoneSimulation({ ...small, spot: 'point' });
      const warm = new SurfZoneSimulation({ ...small, spot: 'point' }, 'warm');
      expect(warm.solver.time).toBe(0);
      await warm.spinUp();
      sameWater(warm, eager);
      for (let step = 0; step < 30; step += 1) {
        eager.step(1 / 60);
        warm.step(1 / 60);
      }
      sameWater(warm, eager);
      expect(Array.from(warm.breaking.strength)).toEqual(Array.from(eager.breaking.strength));
      expect(Array.from(warm.foam.dense)).toEqual(Array.from(eager.foam.dense));
    });

    it('spins up on its device, one stable substep a call', async () => {
      const eager = new SurfZoneSimulation({ ...small, spot: 'point' });
      const warm = new SurfZoneSimulation({ ...small, spot: 'point' }, 'warm');
      const steps: number[] = [];
      let overshoots = 0;
      // A stand-in device that takes the CPU solver's own step.
      warm.device = {
        step: async (dt: number) => {
          if (dt > warm.solver.maxStableStep()) overshoots += 1;
          steps.push(dt);
          warm.solver.step(dt);
        },
        dispose() {},
      };
      await warm.spinUp();
      expect(steps.length).toBeGreaterThan(20);
      expect(overshoots).toBe(0);
      sameWater(warm, eager);
    });

    it('finishes the spin-up on the CPU when its device fails partway', async () => {
      const eager = new SurfZoneSimulation({ ...small, spot: 'point' });
      const warm = new SurfZoneSimulation({ ...small, spot: 'point' }, 'warm');
      let calls = 0;
      let disposed = false;
      warm.device = {
        step: async (dt: number) => {
          calls += 1;
          if (calls > 10) throw new Error('device lost');
          warm.solver.step(dt);
        },
        dispose: () => { disposed = true; },
      };
      const warn = console.warn;
      console.warn = () => {};
      try {
        await warm.spinUp();
      } finally {
        console.warn = warn;
      }
      expect(disposed).toBe(true);
      expect(warm.device).toBeUndefined();
      sameWater(warm, eager);
    });
  });

  it('drops a failing device and steps that frame on the CPU', async () => {
    const reference = new SurfZoneSimulation({ ...small, spot: 'point' });
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point' });
    let disposed = false;
    simulation.device = { step: () => Promise.reject(new Error('device lost')), dispose: () => { disposed = true; } };
    const warn = console.warn;
    console.warn = () => {};
    try {
      await simulation.stepAsync(1 / 60);
    } finally {
      console.warn = warn;
    }
    reference.step(1 / 60);
    expect(disposed).toBe(true);
    expect(simulation.device).toBeUndefined();
    expect(Array.from(simulation.solver.h)).toEqual(Array.from(reference.solver.h));
    expect(simulation.solver.time).toBe(reference.solver.time);
  });

  it('replays a seed exactly and changes with another', () => {
    const run = (seed: number) => {
      const simulation = new SurfZoneSimulation({ ...small, spot: 'beach', seed });
      for (let frame = 0; frame < 30; frame += 1) simulation.step(1 / 30);
      return Array.from(simulation.solver.h);
    };
    expect(run(3)).toEqual(run(3));
    expect(run(4)).not.toEqual(run(3));
  });

  it('renders the surface it samples, with dry land tucked under the bed', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const grid = simulation.renderGrid(1);
    const data = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(data, grid);
    let wetChecked = 0;
    let dryChecked = 0;
    for (let iz = 0; iz < grid.nz; iz += 7) {
      for (let ix = 0; ix < grid.nx; ix += 3) {
        const x = grid.xMin + ix * grid.spacing;
        const z = grid.zMin + iz * grid.spacing;
        const height = data[(iz * grid.nx + ix) * 2];
        if (simulation.solver.sampleCentered(simulation.solver.h, x, z) > 0.01) {
          expect(height).toBeCloseTo(simulation.heightAt(x, z), 5);
          wetChecked += 1;
        } else {
          expect(height).toBeLessThan(simulation.bedAt(x, z));
          dryChecked += 1;
        }
      }
    }
    expect(wetChecked).toBeGreaterThan(100);
    expect(dryChecked).toBeGreaterThan(5);
  });

  it('finds the break line at the shoaled breaker depth', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const point = simulation.breakPoint();
    const depth = breakerDepthFor(edgeHeight(simulation.config), simulation.sea.depth);
    expect(simulation.breakerDepth()).toBeCloseTo(depth, 12);
    expect(tankDepth(simulation.spot, OFFSHORE_DEPTH.beach, point.x, point.z)).toBeCloseTo(depth, 1);
  });

  it('breaks waves in the surf zone, measures the peel and paints whitewater', () => {
    // Bores need the game's 1 m surf-zone cells; 2 m cells smear them below either breaking criterion.
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    let broke = false;
    let estimate = simulation.peelEstimate();
    for (let frame = 0; frame < 20 * 30 && !(estimate && simulation.breakingFraction() > 0.02); frame += 1) {
      simulation.step(1 / 30);
      broke ||= simulation.breakingFraction() > 0;
      estimate = simulation.peelEstimate() ?? estimate;
    }
    expect(broke).toBe(true);
    expect(estimate).toBeDefined();
    expect(estimate!.angleDegrees).toBeGreaterThanOrEqual(0);
    expect(estimate!.angleDegrees).toBeLessThanOrEqual(90);
    for (const value of simulation.breaking.strength) expect(value).toBeLessThanOrEqual(1);
    const grid = simulation.renderGrid(1);
    const data = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(data, grid);
    let whitewater = 0;
    for (let k = 0; k < grid.nx * grid.nz; k += 1) if (data[k * 2 + 1] > 0.3) whitewater += 1;
    expect(whitewater).toBeGreaterThan(0);
    const iribarren = simulation.iribarren();
    expect(iribarren.value).toBeGreaterThan(0);
    expect(['spilling', 'plunging', 'surging']).toContain(iribarren.type);
  });

  it('keeps measuring peel while earlier bores are still crossing the surf zone', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    let late = 0;
    for (let frame = 0; frame < 24 * 30; frame += 1) {
      simulation.step(1 / 30);
      if (frame > 12 * 30 && simulation.peelEstimate()) late += 1;
    }
    expect(late).toBeGreaterThan(30);
  }, 60_000);

  it('throws a lip from plunging point waves, once per wave, but not from a spilling beach', () => {
    const run = (config: SurfZoneConfig) => {
      const simulation = new SurfZoneSimulation(config);
      let broke = 0;
      for (let frame = 0; frame < 20 * 30; frame += 1) {
        simulation.step(1 / 30);
        if (simulation.breakingFraction() > 0) broke += 1;
      }
      return { simulation, broke };
    };
    const point = run({ ...small, spot: 'point', dx: 1, fineSpacing: 1, peakPeriod: 14, directionDegrees: 20, spreading: 24 });
    expect(point.simulation.iribarren().type).toBe('plunging');
    expect(point.simulation.lipLaunches).toBeGreaterThan(0);
    expect(point.simulation.lipLaunches).toBeLessThanOrEqual(point.simulation.solver.nx * Math.ceil(20 / (0.7 * 14)));
    expect(point.simulation.lip.landings).toBeGreaterThan(0);
    const beach = run({ ...small, spot: 'beach', dx: 1, fineSpacing: 1, peakPeriod: 6 });
    expect(beach.simulation.iribarren().type).toBe('spilling');
    expect(beach.broke).toBeGreaterThan(0);
    expect(beach.simulation.lipLaunches).toBe(0);
    expect(beach.simulation.lipJets).toBe(0);
    expect(beach.simulation.lipRollers).toBeGreaterThan(0);
  }, 60_000);

  it('throws each jet ahead of its crest, 1.15-1.8 times its speed, as measured jets leave (P7)', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, peakPeriod: 14, directionDegrees: 20, spreading: 24 });
    const launches: { speed: number; crest: number }[] = [];
    const launch = simulation.lip.launch.bind(simulation.lip);
    simulation.lip.launch = (cell, velocity, height, volume, crestSpeed) => {
      launches.push({ speed: Math.hypot(velocity.x, velocity.z), crest: crestSpeedAt(simulation.solver, cell)! });
      return launch(cell, velocity, height, volume, crestSpeed);
    };
    for (let frame = 0; frame < 20 * 30; frame += 1) simulation.step(1 / 30);
    expect(simulation.lipJets).toBeGreaterThan(0);
    expect(launches.length).toBeGreaterThan(0);
    for (const { speed, crest } of launches) {
      expect(speed / crest).toBeGreaterThan(1.15);
      expect(speed / crest).toBeLessThan(1.8);
    }
  }, 60_000);

  it('carves the void under a flying lip into the water the rider feels and the renderer draws (P7)', () => {
    const simulation = new SurfZoneSimulation({
      spot: 'reef', seed: 1, significantHeight: 1.5, peakPeriod: 12, directionDegrees: 0, spreading: 24, tide: 0,
      alongShore: 8, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1, componentCount: 12,
    });
    const { solver } = simulation;
    const water = PhysicalSurfWater.forSimulation(simulation);
    const grid = simulation.renderGrid(1);
    const data = new Float32Array(grid.nx * grid.nz * 2);
    let carved = 0;
    for (let frame = 0; frame < 60 * 30 && carved === 0; frame += 1) {
      simulation.step(1 / 30);
      if (simulation.lip.airborneVolume() === 0) continue;
      simulation.writeUniformSurface(data, grid);
      for (let r = 0; r < grid.nz; r += 1) {
        for (let c = 0; c < grid.nx; c += 1) {
          const x = grid.xMin + c * grid.spacing;
          const z = grid.zMin + r * grid.spacing;
          const face = solver.sampleCentered(solver.h, x, z) + solver.sampleCentered(solver.bed, x, z);
          const floor = simulation.lip.carve(x, z, face);
          if (!(floor < face - 0.05)) continue;
          carved += 1;
          expect(simulation.heightAt(x, z)).toBeCloseTo(floor, 6);
          expect(data[(r * grid.nx + c) * 2]).toBeCloseTo(floor, 3);
          expect(water.surfaceAt(x, z)).toBeCloseTo(floor, 3);
        }
      }
    }
    expect(carved).toBeGreaterThan(0);
  }, 60_000);

  // Stage 2 still needs 1 m cells to break (P3a): every column's Small-swell break lies in the fine surf zone.
  it('builds the Reef on a 30 m tank that stays deep up to its forereef, with every break in the fine surf zone', () => {
    expect(OFFSHORE_DEPTH.reef).toBe(REEF.deep);
    const reef = createSpot('reef', 1);
    const breakDepth = breakerDepthFor(REEF_SWELLS.small.significantHeight, REEF.deep);
    for (let x = -80; x <= 80; x += 4) {
      for (let z = TANK.zoneInner; z <= REEF.shelfEdge - (REEF.deep - REEF.shelfDepth) / REEF.foreSlope; z += 1) {
        expect(tankDepth(reef, OFFSHORE_DEPTH.reef, x, z)).toBeCloseTo(REEF.deep, 3);
      }
      let z = TANK.zoneInner;
      while (tankDepth(reef, OFFSHORE_DEPTH.reef, x, z) > breakDepth) z += 0.5;
      expect(z).toBeGreaterThan(TANK.fineFrom);
    }
  });

  it('seats the Canyon take-off where its bed gathers the swell, from either side', () => {
    const canyon = createSpot('canyon', 1);
    const bed = (x: number, z: number) => tankDepth(canyon, OFFSHORE_DEPTH.canyon, x, z);
    for (const directionDegrees of [-10, 10, 25]) {
      const config: SurfZoneConfig = { ...small, spot: 'canyon', alongShore: 160, peakPeriod: 10, directionDegrees };
      const point = takeOffPoint(config);
      const swell = { period: 10, direction: (directionDegrees * Math.PI) / 180 };
      expect(Math.abs(point.x)).toBeLessThanOrEqual(80 - TAKE_OFF_EDGE_MARGIN);
      expect(rayConcentration(bed, swell, TANK.zoneInner, point.z, [point.x], 10)[0]).toBeGreaterThan(1.3);
      expect(bed(point.x, point.z)).toBeCloseTo(breakerDepthFor(1.4, OFFSHORE_DEPTH.canyon), 1);
    }
  });

  it('takes off straight out from the window centre at the other spots', () => {
    for (const spot of ['beach', 'point'] as const) expect(takeOffPoint({ ...small, spot, alongShore: 160 }).x).toBe(0);
  });

  it('measures the Reef’s peel on its ledge only, and every other spot everywhere', () => {
    const reef = new SurfZoneSimulation({ ...small, spot: 'reef', alongShore: 160, dx: 4 });
    const column = (x: number) => reef.solver.xCenters.findIndex((center) => Math.abs(center - x) <= 2);
    expect(reef.peel.measures(column(-40))).toBe(true);
    expect(reef.peel.measures(column(60))).toBe(false);
    const point = new SurfZoneSimulation({ ...small, spot: 'point', alongShore: 160, dx: 4 });
    expect(point.peel.measures(column(60))).toBe(true);
  });

  it('takes off at the Reef’s peak, where every Reef swell breaks, never on dry reef or in the pass', () => {
    const swells = [REEF_PRACTICE_SWELL, ...Object.values(REEF_SWELLS)];
    for (const swell of swells) {
      const config: SurfZoneConfig = { ...small, spot: 'reef', alongShore: 160, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod };
      const point = takeOffPoint(config);
      const depth = tankDepth(createSpot('reef', 1), OFFSHORE_DEPTH.reef, point.x, point.z);
      expect(point.x).toBe(REEF.takeOffX);
      expect(depth).toBeGreaterThanOrEqual(0.4 * breakerDepthFor(swell.significantHeight, OFFSHORE_DEPTH.reef));
      expect(depth).toBeLessThanOrEqual(REEF.shelfDepth);
      expect(Math.abs(point.x - REEF.passX)).toBeGreaterThan(2 * REEF.passHalfWidth);
    }
  });

  it('finds the Reef’s break on its ledge inside the fine surf zone, and it plunges', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', alongShore: 160, significantHeight: REEF_SWELLS.small.significantHeight, peakPeriod: REEF_SWELLS.small.peakPeriod });
    const point = simulation.breakPoint();
    const bed = (z: number) => tankDepth(simulation.spot, OFFSHORE_DEPTH.reef, point.x, z);
    expect(point.z).toBeGreaterThan(TANK.fineFrom);
    expect(bed(point.z)).toBeGreaterThan(REEF.crestDepth);
    expect(bed(point.z)).toBeLessThan(REEF.shelfDepth);
    expect(simulation.iribarren().type).toBe('plunging');
  });

  describe('the steep Reef holds', () => {
    // Through the set's arrival (~35 s on the 30 m tank): finite, never negative, no runaway (past ones reached 23 and 112 m/s).
    const run = (overrides: Partial<SurfZoneConfig>, fastestAllowed = 20) => {
      const simulation = new SurfZoneSimulation({
        ...small, spot: 'reef', significantHeight: REEF_SWELLS.big.significantHeight, peakPeriod: REEF_SWELLS.big.peakPeriod,
        directionDegrees: 20, spreading: 24, dx: 1, fineSpacing: 1, ...overrides,
      });
      const { solver } = simulation;
      let finite = true;
      let fastest = 0;
      for (let frame = 0; frame < 45 * 30; frame += 1) {
        simulation.step(1 / 30);
        for (let i = 0; i < solver.h.length; i += 1) {
          finite &&= Number.isFinite(solver.h[i]) && solver.h[i] >= 0;
          if (solver.h[i] > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / solver.h[i]);
        }
      }
      expect(finite).toBe(true);
      expect(fastest).toBeLessThan(fastestAllowed);
      expect(solver.maxStableStep()).toBeGreaterThan(1e-3);
      return simulation;
    };

    it('stays finite and bounded under the Big swell, and plunges', () => {
      expect(run({}).lipLaunches).toBeGreaterThan(0);
    }, 300_000);
    // At low tide a Big trough drains the ledge to ~0.3 m and its backwash briefly reaches ~23 m/s before settling: an
    // open issue (docs/research/teahupoo-reef-report.md). Here it guards against a runaway (past ones: 112 m/s, NaN).
    it('stays finite over the drying reef flat at low tide', () => run({ tide: -0.6 }, 30), 300_000);
    it('stays finite with oblique swells across the open −x edge', () => {
      run({ directionDegrees: -25, alongShore: 60 });
      run({ directionDegrees: 25, alongShore: 60 });
    }, 600_000);
    // The 40 m window's open −x edge cuts the ledge: over a bed sloping across it, main (aa71add) ran this to NaN (Part B).
    it('stays finite where the window\'s open edge cuts the ledge', () => run({ directionDegrees: 25 }), 300_000);
  });

  it('throws the Reef\'s ledge breaks as reef breaks and every other spot\'s by Pick & Feddersen', () => {
    const reef = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 1.8, peakPeriod: 12, dx: 1, fineSpacing: 1 });
    const ratios: number[] = [];
    reef.onThrow = (event) => { if (event.vortexRatio !== undefined) ratios.push(event.vortexRatio); };
    for (let frame = 0; frame < 60 * 30 && ratios.length === 0; frame += 1) reef.step(1 / 30);
    expect(ratios.length).toBeGreaterThan(0);
    for (const ratio of ratios) {
      expect(ratio).toBeGreaterThanOrEqual(REEF_OVERTURN.roundestRatio);
      expect(ratio).toBeLessThanOrEqual(REEF_OVERTURN.gentlestRatio);
    }
    const point = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    let reefBreaks = 0;
    point.onThrow = (event) => { if (event.vortexRatio !== undefined) reefBreaks += 1; };
    for (let frame = 0; frame < 20 * 30; frame += 1) point.step(1 / 30);
    expect(point.lipLaunches).toBeGreaterThan(0);
    expect(reefBreaks).toBe(0);
  }, 240_000);

  it('throws lips from plunging waves on the reef edge', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 1.8, peakPeriod: 12, dx: 1, fineSpacing: 1 });
    // The Reef's 30 m tank brings the set onto its ledge ~35 s in; run until a lip has flown and landed.
    for (let frame = 0; frame < 60 * 30 && simulation.lip.landings === 0; frame += 1) simulation.step(1 / 30);
    expect(simulation.iribarren().type).toBe('plunging');
    expect(simulation.lipLaunches).toBeGreaterThan(0);
    expect(simulation.lip.landings).toBeGreaterThan(0);
  }, 240_000);

  it('counts a column breaking once per wave for the peel, and never shore swash', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 1.4, peakPeriod: 10, dx: 1, fineSpacing: 1 });
    const { solver } = simulation;
    const onsets: { column: number; time: number; still: number }[] = [];
    const peel = simulation.peel;
    const mark = peel.markOnset.bind(peel);
    peel.markOnset = (column: number, time: number) => {
      const row = solver.rowBelow(simulation.outerBreakZ(column));
      onsets.push({ column, time, still: solver.restLevel - solver.bed[row * solver.nx + column] });
      mark(column, time);
    };
    for (let frame = 0; frame < 30 * 30; frame += 1) simulation.step(1 / 30);
    expect(onsets.length).toBeGreaterThan(0);
    for (const onset of onsets) expect(onset.still).toBeGreaterThanOrEqual(0.4 * simulation.breakerDepth() - 1e-9);
    const last = new Map<number, number>();
    for (const { column, time } of onsets) {
      if (last.has(column)) expect(time - last.get(column)!).toBeGreaterThanOrEqual(0.7 * 10 - 1e-9);
      last.set(column, time);
    }
  }, 60_000);

  it('measures each wave breaking at the take-off: its face and where it broke (wave sizes)', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', significantHeight: 1.8, peakPeriod: 12, dx: 1, fineSpacing: 1 });
    const measured: { x: number; face: number; z: number }[] = [];
    simulation.onBreak = (wave) => measured.push(wave);
    expect(simulation.surf.reading(simulation.solver.time)).toBeUndefined();
    // Sets reach the take-off every 12-16 s here: three have broken by 43 s.
    for (let frame = 0; frame < 50 * 30; frame += 1) simulation.step(1 / 30);
    expect(measured.length).toBeGreaterThan(0);
    for (const wave of measured) {
      expect(wave.face).toBeGreaterThan(0.2);
      expect(wave.face).toBeLessThan(4);
      expect(wave.z).toBeGreaterThan(TANK.fineFrom - 5);
    }
    const takeOff = simulation.breakPoint();
    for (const wave of simulation.surf.waves()) expect(Math.abs(wave.x - takeOff.x)).toBeLessThanOrEqual(TAKE_OFF_BAND);
    const reading = simulation.surf.reading(simulation.solver.time);
    expect(reading).toBeDefined();
    expect(reading!.sets).toBeGreaterThanOrEqual(reading!.typical);
  }, 90_000);

  it('does not read the spin-up bores as one simultaneous close-out', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1 });
    for (let frame = 0; frame < 3; frame += 1) simulation.step(1 / 30);
    expect(simulation.peelEstimate()).toBeUndefined();
  });

  it('holds waves up longer under offshore wind', () => {
    const onshore = new SurfZoneSimulation({ ...small, spot: 'beach', windSpeed: 10 });
    const offshore = new SurfZoneSimulation({ ...small, spot: 'beach', windSpeed: -10 });
    expect(offshore.breaking.onsetScale).toBeGreaterThan(1);
    expect(onshore.breaking.onsetScale).toBeLessThan(1);
    expect(onshore.breaking.onsetScale).toBeCloseTo(windOnsetScale(10, onshore.breakerDepth()), 12);
  });

  // Douglass 1990 and King & Baker 1996 via Zdyrski & Feddersen 2022: onshore wind lowers the
  // breaker index by up to ~40 % at U/√(g h_b) ≈ 4; offshore wind raises it by up to ~10 %.
  it('scales the wind effect on breaking by the breaker celerity, stronger onshore than offshore', () => {
    const celerity = Math.sqrt(9.81 * 2);
    expect(windOnsetScale(0, 2)).toBe(1);
    expect(windOnsetScale(10, 2)).toBeCloseTo(1 - (0.1 * 10) / celerity, 12);
    expect(windOnsetScale(-4, 2)).toBeCloseTo(1 + (0.05 * 4) / celerity, 12);
    expect(windOnsetScale(-10, 2)).toBe(1.1);
    expect(windOnsetScale(30, 1)).toBe(0.6);
    expect(windOnsetScale(6, 1)).toBeLessThan(windOnsetScale(6, 3));
  });

  it('leaves foam behind the breaking bores, fading into lace, and none offshore of the break', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    const { solver, foam } = simulation;
    let outermost = Infinity;
    for (let frame = 0; frame < 20 * 30; frame += 1) {
      simulation.step(1 / 30);
      for (let i = 0; i < solver.h.length; i += 1) {
        if (simulation.breaking.strength[i] > 0.3) outermost = Math.min(outermost, solver.zCenters[Math.floor(i / solver.nx)]);
      }
    }
    let foamy = 0;
    let lace = 0;
    for (let i = 0; i < solver.h.length; i += 1) {
      const z = solver.zCenters[Math.floor(i / solver.nx)];
      expect(foam.totalAt(i)).toBeLessThanOrEqual(1 + 1e-12);
      if (z < outermost - 10) expect(foam.totalAt(i)).toBeLessThan(1e-3);
      if (foam.totalAt(i) > 0.05) foamy += 1;
      if (foam.residual[i] > 0.02) lace += 1;
    }
    expect(outermost).toBeLessThan(0);
    expect(foamy).toBeGreaterThan(50);
    expect(lace).toBeGreaterThan(50);
  }, 60_000);

  it('keeps lace longest in the beach’s sandy surf and lets a spot override its decay', () => {
    expect(FOAM_DECAY.beach.residual).toBeGreaterThan(FOAM_DECAY.reef.residual);
    for (const decay of Object.values(FOAM_DECAY)) expect(decay.dense).toBe(3);
    expect(new SurfZoneSimulation({ ...small, spot: 'reef' }).foam.decay).toEqual(FOAM_DECAY.reef);
    expect(new SurfZoneSimulation({ ...small, spot: 'reef', foamDecay: { dense: 1, residual: 2 } }).foam.decay).toEqual({ dense: 1, residual: 2 });
  });

  it('splashes landing lip water into foam', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const { solver, foam, lip } = simulation;
    foam.dense.fill(0);
    foam.residual.fill(0);
    const crest = solver.cellIndex(0, -60);
    expect(lip.launch(crest, { x: 0, z: 4 }, solver.surfaceAt(crest) + 1, 0.2)).toBeGreaterThan(0);
    // The whole strip leaves the crest and lands.
    for (let step = 0; step < 240 && lip.activeCount() > 0; step += 1) lip.step(1 / 60);
    expect(lip.landings).toBeGreaterThan(0);
    expect(lip.activeCount()).toBe(0);
    expect(foam.dense.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0.5);
  });

  it('renders the foam field and the current it rides on', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const { solver, foam } = simulation;
    for (let frame = 0; frame < 30; frame += 1) simulation.step(1 / 30);
    for (let i = 0; i < solver.h.length; i += 1) {
      foam.dense[i] = solver.h[i] > 0.01 ? 0.5 * (1 + Math.sin(i * 0.37)) * 0.6 : 0;
      foam.residual[i] = solver.h[i] > 0.01 ? 0.1 : 0;
    }
    const grid = simulation.renderGrid(1);
    const surface = new Float32Array(grid.nx * grid.nz * 2);
    const flow = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(surface, grid);
    simulation.writeUniformFlow(flow, grid);
    const total = Float64Array.from(foam.dense, (value, i) => value + foam.residual[i]);
    const u = Float64Array.from(solver.qx, (q, i) => (solver.h[i] > 0.01 ? q / solver.h[i] : 0));
    const w = Float64Array.from(solver.qz, (q, i) => (solver.h[i] > 0.01 ? q / solver.h[i] : 0));
    let wet = 0;
    for (let r = 0; r < grid.nz; r += 5) {
      for (let c = 0; c < grid.nx; c += 3) {
        const k = r * grid.nx + c;
        const x = grid.xMin + c * grid.spacing;
        const z = grid.zMin + r * grid.spacing;
        if (solver.sampleCentered(solver.h, x, z) <= 0.01) {
          expect(surface[k * 2 + 1]).toBe(0);
          expect(flow[k * 2]).toBe(0);
          continue;
        }
        wet += 1;
        expect(surface[k * 2 + 1]).toBeCloseTo(solver.sampleCentered(total, x, z), 5);
        expect(flow[k * 2]).toBeCloseTo(solver.sampleCentered(u, x, z), 5);
        expect(flow[k * 2 + 1]).toBeCloseTo(solver.sampleCentered(w, x, z), 5);
      }
    }
    expect(wet).toBeGreaterThan(200);
  });
});

describe('the tank sized to the swell (wave sizes)', () => {
  const config = (spot: SpotName, significantHeight: number, peakPeriod = 14): SurfZoneConfig => ({ ...small, spot, significantHeight, peakPeriod });

  it('keeps today\'s tank for small days, Practice and the Canyon', () => {
    for (const spot of ['beach', 'point'] as const) {
      expect(tankLayout(config(spot, 1.5, 18))).toEqual({ ...TANK, edgeDepth: OFFSHORE_DEPTH[spot] });
      expect(tankLayout({ ...config(spot, 1.4, 12), heightAt: 'edge' })).toEqual({ ...TANK, edgeDepth: OFFSHORE_DEPTH[spot] });
    }
    expect(tankLayout(config('canyon', 3))).toEqual({ ...TANK, edgeDepth: OFFSHORE_DEPTH.canyon });
  });

  it('deepens the edge to 3.3 Hs, within 0.4 of the deep-water wavelength, and lengthens the tank to reach it', () => {
    const layout = tankLayout(config('beach', 3, 14));
    expect(layout.edgeDepth).toBeGreaterThanOrEqual(9.9 - 0.05);
    const spot = createSpot('beach', small.seed);
    // The edge takes the bed's depth where the zone starts.
    expect(spot.depthAt(0, layout.zoneInner)).toBeCloseTo(layout.edgeDepth, 6);
    expect(layout.zoneInner - layout.offshore).toBeGreaterThanOrEqual(Math.max(60, 0.75 * waveKinematics(14, layout.edgeDepth).wavelength) - 1e-6);
    expect(layout.blendEnd - layout.zoneInner).toBe(TANK.blendEnd - TANK.zoneInner);
    // A short-period storm sea keeps kh ≤ 2.5 at the edge.
    expect(tankLayout(config('point', 4, 6)).edgeDepth).toBeLessThanOrEqual(0.4 * (9.81 * 36) / (2 * Math.PI) + 1e-9);
  });

  it('places a big day\'s take-off by the spot\'s calibrated breaker index, and today\'s tanks as before', () => {
    const big: SurfZoneConfig = { ...small, spot: 'point', significantHeight: 3, peakPeriod: 14, alongShore: 160 };
    const tank = tankLayout(big);
    expect(tank.edgeDepth).toBeGreaterThan(OFFSHORE_DEPTH.point);
    const target = breakerDepthFor(edgeHeight(big, tank.edgeDepth), tank.edgeDepth + big.tide, TAKE_OFF_INDEX.point);
    const point = takeOffPoint(big);
    expect(tankDepth(createSpot('point', big.seed), tank.edgeDepth, point.x, point.z, tank)).toBeCloseTo(target, 0);
    const todays: SurfZoneConfig = { ...small, spot: 'point', alongShore: 160 };
    expect(tankDepth(createSpot('point', 1), OFFSHORE_DEPTH.point, 0, takeOffPoint(todays).z))
      .toBeCloseTo(breakerDepthFor(edgeHeight(todays), OFFSHORE_DEPTH.point), 0);
    // Only a swell-sized tank uses the calibrated index.
    expect(Object.keys(TAKE_OFF_INDEX).sort()).toEqual(['beach', 'canyon', 'point', 'reef']);
  });

  it('reaches a 13.2 m edge for a 4 m Beach swell on its deepened outer shelf', () => {
    const layout = tankLayout(config('beach', 4, 14));
    expect(layout.edgeDepth).toBeGreaterThanOrEqual(13.2 - 0.05);
  });

  it('gives the Reef today\'s inner tank at its 30 m edge, with a zone three quarters of the edge wavelength long', () => {
    for (const [significantHeight, peakPeriod] of [[1.3, 15], [3, 17]]) {
      const layout = tankLayout(config('reef', significantHeight, peakPeriod));
      expect(layout.edgeDepth).toBe(REEF.deep);
      expect({ zoneInner: layout.zoneInner, blendEnd: layout.blendEnd, fineFrom: layout.fineFrom, shore: layout.shore })
        .toEqual({ zoneInner: TANK.zoneInner, blendEnd: TANK.blendEnd, fineFrom: TANK.fineFrom, shore: TANK.shore });
      expect(layout.zoneInner - layout.offshore).toBeCloseTo(Math.max(60, ZONE_WAVELENGTHS * waveKinematics(peakPeriod, REEF.deep).wavelength), 6);
    }
  });

  it('starts the fine zone 40 m seaward of where the sets break, never shoreward of −150', () => {
    // The Reef has its own layout (above).
    for (const spot of ['beach', 'point'] as const) {
      const layout = tankLayout(config(spot, 4, 18));
      const sets = SETS_OVER_TYPICAL * komarGaughan(4, 18) / BREAKER_INDEX;
      const bed = createSpot(spot, small.seed);
      let setBreak = layout.blendEnd;
      while (bed.depthAt(0, setBreak) > sets && setBreak < TANK.shore) setBreak += 1;
      expect(layout.fineFrom).toBeLessThanOrEqual(Math.min(TANK.fineFrom, setBreak - 40) + 1);
      // The blend onto the spot's bed stays clear of the breaking sets.
      expect(layout.blendEnd).toBeLessThanOrEqual(layout.fineFrom - 20);
    }
  });

  it('keeps every layout ordered with a finite bed', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      for (const significantHeight of [0.3, 1, 2, 3, 4]) {
        for (const peakPeriod of [6, 10, 14, 18]) {
          const layout = tankLayout(config(spot, significantHeight, peakPeriod));
          expect(layout.offshore).toBeLessThan(layout.zoneInner);
          expect(layout.zoneInner).toBeLessThan(layout.blendEnd);
          expect(layout.blendEnd).toBeLessThan(layout.fineFrom);
          expect(layout.fineFrom).toBeLessThan(layout.shore);
          expect(layout.zoneInner - layout.offshore).toBeGreaterThanOrEqual(60);
          expect(Number.isFinite(tankDepth(createSpot(spot, 1), layout.edgeDepth, 0, layout.offshore, layout))).toBe(true);
        }
      }
    }
  });

  it('builds and steps the deepest Beach tank, its boundary forcing the solver\'s own waves', () => {
    const deepest = { ...config('beach', 4, 18), alongShore: 20, dx: 2 };
    const simulation = new SurfZoneSimulation(deepest);
    expect(simulation.tank).toEqual(tankLayout(deepest));
    expect(simulation.solver.zCenters[0]).toBeLessThan(simulation.tank.zoneInner);
    const omega = simulation.sea.components[0].omega;
    expect(simulation.sea.components[0].k).toBeCloseTo(madsenSorensenWaveNumber(omega, simulation.sea.depth), 10);
    for (let frame = 0; frame < 60; frame += 1) simulation.step(1 / 30);
    for (const value of simulation.solver.h) expect(Number.isFinite(value)).toBe(true);
  }, 300_000);

  it('builds today\'s tanks exactly as before', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    expect(simulation.tank).toEqual({ ...TANK, edgeDepth: OFFSHORE_DEPTH.beach });
    const omega = simulation.sea.components[0].omega;
    expect(simulation.sea.components[0].k).toBe(shallowWaterWaveNumber(omega, simulation.sea.depth));
  });
});
