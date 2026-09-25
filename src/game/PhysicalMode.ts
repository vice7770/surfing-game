import type { Scene } from 'three';
import { PhysicalSurfaceSource } from '../scene/PhysicalSurfaceSource';
import { SpectatorCamera } from '../scene/SpectatorCamera';
import { SpotSeabed } from '../scene/SpotSeabed';
import type { WaterSurface } from '../scene/WaterSurface';
import type { SpotName } from '../wave/Bathymetry';
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
  simulation!: SurfZoneSimulation;
  focus = { x: 0, z: 0 };

  constructor(scene: Scene) {
    scene.add(this.seabed.mesh);
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
    this.seabed.setDepth(
      (x, z) => tankDepth(simulation.spot, offshoreDepth, x, z),
      simulation.windowXMin, TANK.offshore, simulation.solver.nx * simulation.solver.dx, TANK.shore - TANK.offshore, 2,
    );
    this.focus = simulation.breakPoint();
    this.camera.setView(this.camera.view);
  }

  step(dt: number): void {
    this.simulation.step(dt);
  }

  update(dt: number): void {
    this.camera.update(this.simulation, this.focus, dt);
  }

  cameraBelowSurface(margin = 0.1): boolean {
    const position = this.camera.camera.position;
    return position.y < this.simulation.heightAt(position.x, position.z) - margin;
  }

  setVisible(visible: boolean): void {
    this.seabed.mesh.visible = visible;
  }
}
