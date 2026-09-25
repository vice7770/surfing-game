import type { Scene } from 'three';
import { FarFieldOcean } from '../scene/FarFieldOcean';
import { gradedAxis } from '../scene/gridGeometry';
import { PhysicalSurfaceSource } from '../scene/PhysicalSurfaceSource';
import { SpectatorCamera } from '../scene/SpectatorCamera';
import { SpotSeabed } from '../scene/SpotSeabed';
import type { WaterSurface } from '../scene/WaterSurface';
import { smoothstep, type SpotName } from '../wave/Bathymetry';
import { FarFieldProfile } from '../wave/FarFieldProfile';
import type { ReadoutRow } from '../wave/SwellReadout';
import { OFFSHORE_DEPTH, SurfZoneSimulation, TANK, tankDepth, type SurfZoneConfig } from '../wave/SurfZoneSimulation';

/** Wave Lab inputs for the view-only physical surf zone (buoy-style, plan Q2 and Q31). */
export interface PhysicalSettings {
  spot: SpotName;
  significantHeight: number;
  peakPeriod: number;
  directionDegrees: number;
  /** 0 = narrow groundswell … 1 = broad windswell. */
  spread: number;
  tide: number;
}

/** Far-field ocean layout: deepening from the tank floor to FAR_DEPTH over FAR_SLOPE_LENGTH offshore of the tank, out to FAR_EXTENT. */
const FAR_DEPTH = 60;
const FAR_SLOPE_LENGTH = 870;
const FAR_EXTENT = 1500;

export const DEFAULT_PHYSICAL_SETTINGS: PhysicalSettings = {
  spot: 'beach', significantHeight: 1.4, peakPeriod: 10, directionDegrees: 10, spread: 0.4, tide: 0,
};

/** Spread slider to the cos-2s exponent: s = 24 (groundswell) falling geometrically to 4 (windswell). */
export function spreadingFor(spread: number): number {
  const t = Math.min(1, Math.max(0, spread));
  return 24 * Math.pow(4 / 24, t);
}

export function formatPhysicalReadout(simulation: SurfZoneSimulation): ReadoutRow[] {
  const { config, solver } = simulation;
  const breakPoint = simulation.breakPoint();
  const toSet = simulation.timeToSet;
  return [
    { label: 'SPOT', value: config.spot.toUpperCase() },
    { label: 'SWELL', value: `Hs ${config.significantHeight.toFixed(1)} m · Tp ${config.peakPeriod.toFixed(1)} s · ${config.directionDegrees}°` },
    { label: 'SPREAD', value: `s ${config.spreading.toFixed(0)}` },
    { label: 'TIDE', value: `${config.tide.toFixed(1)} m` },
    { label: 'BREAK LINE', value: `${Math.round(-breakPoint.z)} m out · ${(simulation.spot.depthAt(breakPoint.x, breakPoint.z) + config.tide).toFixed(2)} m deep` },
    { label: 'SOLVER', value: `${(solver.nx * solver.nz).toLocaleString('en-US')} cells · ${simulation.lastStepMs.toFixed(1)} ms/step` },
    { label: 'NEXT SET', value: toSet > 0 ? `in ${Math.round(toSet)} s` : `${Math.round(-toSet)} s ago` },
  ];
}

/**
 * The view-only physical surf zone (plan P2c, option a): the stage 1 solver on
 * the shared water surface, a seabed mesh from the spot, and a spectator
 * camera. The legacy board does not ride these waves until P4.
 */
export class PhysicalMode {
  readonly camera = new SpectatorCamera();
  readonly seabed = new SpotSeabed();
  readonly farField = new FarFieldOcean();
  simulation!: SurfZoneSimulation;
  focus = { x: 0, z: 0 };

  constructor(scene: Scene) {
    scene.add(this.seabed.mesh, this.farField.mesh);
  }

  /** Build the surf zone (warm start and spin-up take a few seconds) and show it on `water`. */
  start(settings: PhysicalSettings, seed: number, water: WaterSurface, overrides: Partial<SurfZoneConfig> = {}): void {
    const simulation = new SurfZoneSimulation({
      spot: settings.spot,
      seed,
      significantHeight: settings.significantHeight,
      peakPeriod: settings.peakPeriod,
      directionDegrees: settings.directionDegrees,
      spreading: spreadingFor(settings.spread),
      tide: settings.tide,
      ...overrides,
    });
    this.simulation = simulation;
    water.setSource(new PhysicalSurfaceSource(simulation, 1));
    const offshoreDepth = OFFSHORE_DEPTH[settings.spot];
    const { dx } = simulation.solver;
    const windowMin = simulation.windowXMin;
    const windowMax = windowMin + simulation.solver.nx * dx;
    const leftX = windowMin + dx / 2;
    const rightX = windowMax - dx / 2;
    // Beyond the window the world continues each edge column's seabed; offshore it deepens to FAR_DEPTH.
    const offshoreBed = (z: number) => offshoreDepth + (FAR_DEPTH - offshoreDepth) * smoothstep(TANK.offshore, TANK.offshore - FAR_SLOPE_LENGTH, z);
    const bedDepth = (x: number, z: number) => {
      if (z < TANK.offshore) return offshoreBed(z);
      return tankDepth(simulation.spot, offshoreDepth, x < windowMin ? leftX : x > windowMax ? rightX : x, z);
    };
    this.focus = simulation.breakPoint();
    const hole = { xMin: windowMin, xMax: windowMax, zMin: TANK.offshore, zMax: TANK.shore };
    this.seabed.setDepthOnGrid(
      bedDepth,
      gradedAxis(this.focus.x - 600, this.focus.x + 600, windowMin, windowMax, 2, 30),
      gradedAxis(-900, TANK.shore + 30, TANK.offshore, TANK.shore, 2, 30),
    );
    const profile = new FarFieldProfile(simulation.sea, {
      referenceZ: TANK.offshore,
      shoreZ: TANK.shore,
      offshoreZ: TANK.offshore - (FAR_EXTENT - 330),
      shoreSamples: 181,
      offshoreSamples: 391,
      offshoreDepth: (z) => offshoreBed(z) + settings.tide,
      leftDepth: (z) => tankDepth(simulation.spot, offshoreDepth, leftX, z) + settings.tide,
      rightDepth: (z) => tankDepth(simulation.spot, offshoreDepth, rightX, z) + settings.tide,
    });
    this.farField.setProfile(profile, hole, this.focus, { extent: FAR_EXTENT, waveHeight: settings.significantHeight });
    this.camera.setView(this.camera.view);
  }

  step(dt: number): void {
    this.simulation.step(dt);
  }

  update(dt: number): void {
    this.camera.update(this.simulation, this.focus, dt);
    this.farField.update(this.simulation.seaTime);
  }

  cameraBelowSurface(margin = 0.1): boolean {
    const position = this.camera.camera.position;
    return position.y < this.simulation.heightAt(position.x, position.z) - margin;
  }

  setVisible(visible: boolean): void {
    this.seabed.mesh.visible = visible;
    this.farField.mesh.visible = visible;
  }
}
