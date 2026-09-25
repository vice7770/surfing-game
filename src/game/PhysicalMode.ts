import type { Scene } from 'three';
import { FarFieldOcean } from '../scene/FarFieldOcean';
import { gradedAxis } from '../scene/gridGeometry';
import { BubblePoints } from '../scene/BubblePoints';
import { LipPoints } from '../scene/LipPoints';
import { PhysicalSurfaceSource } from '../scene/PhysicalSurfaceSource';
import { SpectatorCamera } from '../scene/SpectatorCamera';
import { SpotSeabed } from '../scene/SpotSeabed';
import { SPOT_OPTICS } from '../scene/waterOptics';
import type { WaterSurface } from '../scene/WaterSurface';
import { smoothstep, type SpotName } from '../wave/Bathymetry';
import { FarFieldProfile } from '../wave/FarFieldProfile';
import { MIXED_PEAK_FIT, skillForPeel } from '../wave/Breaking';
import { stormSwell, type StormSwell } from '../wave/StormSwell';
import type { ReadoutRow } from '../wave/SwellReadout';
import { OFFSHORE_DEPTH, SurfZoneSimulation, TANK, tankDepth, type SurfZoneConfig } from '../wave/SurfZoneSimulation';

/** Wave Lab inputs for the view-only physical surf zone (buoy values or a storm, plan Q2, Q22 and Q31). */
export interface PhysicalSettings {
  spot: SpotName;
  /** Buoy values taken directly, or derived from a storm. */
  source: 'buoy' | 'storm';
  significantHeight: number;
  peakPeriod: number;
  directionDegrees: number;
  /** 0 = narrow groundswell … 1 = broad windswell. */
  spread: number;
  tide: number;
  /** Local wind, m/s: positive onshore, negative offshore. */
  windSpeed: number;
  /** Storm mode: wind over the fetch, m/s. */
  stormWindSpeed: number;
  stormFetchKm: number;
  stormDurationHours: number;
  stormDistanceKm: number;
}

/** The swell the tank is built from. */
export interface SwellInput {
  significantHeight: number;
  peakPeriod: number;
  spreading: number;
  bandwidth?: number;
  /** The storm it came from, in storm mode. */
  storm?: StormSwell;
}

/** Largest swell the tank carries, matching the buoy sliders: deeper water would be needed beyond this. */
export const TANK_SWELL_LIMITS = { height: { min: 0.3, max: 3 }, period: { min: 6, max: 18 } };

function clamp(value: number, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(range.min, value));
}

/** Far-field ocean layout: deepening from the tank floor to FAR_DEPTH over FAR_SLOPE_LENGTH offshore of the tank, out to FAR_EXTENT. */
const FAR_DEPTH = 60;
const FAR_SLOPE_LENGTH = 870;
const FAR_EXTENT = 1500;

export const DEFAULT_PHYSICAL_SETTINGS: PhysicalSettings = {
  spot: 'beach', source: 'buoy', significantHeight: 1.4, peakPeriod: 10, directionDegrees: 10, spread: 0.4, tide: 0, windSpeed: 0,
  stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 3000,
};

/** Shading chop from local wind: onshore wind roughens the surf, offshore wind grooms it (qualitative, plan Q23). */
export function chopForWind(windSpeed: number): number {
  return windSpeed >= 0 ? 0.12 + 0.03 * windSpeed : 0.12 + 0.008 * -windSpeed;
}

/** Spread slider to the cos-2s exponent: s = 24 (groundswell) falling geometrically to 4 (windswell). */
export function spreadingFor(spread: number): number {
  const t = Math.min(1, Math.max(0, spread));
  return 24 * Math.pow(4 / 24, t);
}

/** Buoy values as set, or the swell a storm delivers to the spot, kept within TANK_SWELL_LIMITS. */
export function swellFor(settings: PhysicalSettings): SwellInput {
  if (settings.source !== 'storm') {
    return { significantHeight: settings.significantHeight, peakPeriod: settings.peakPeriod, spreading: spreadingFor(settings.spread) };
  }
  const storm = stormSwell({
    windSpeed: settings.stormWindSpeed,
    fetchKm: settings.stormFetchKm,
    durationHours: settings.stormDurationHours,
    distanceKm: settings.stormDistanceKm,
  });
  return {
    significantHeight: clamp(storm.significantHeight, TANK_SWELL_LIMITS.height),
    peakPeriod: clamp(storm.peakPeriod, TANK_SWELL_LIMITS.period),
    spreading: storm.spreading,
    bandwidth: storm.bandwidth,
    storm,
  };
}

/** "Hs 7.1 m · Tp 13.5 s · fetch-limited · arrives after 4.4 days". */
export function formatStorm(storm: StormSwell): string {
  const travel = storm.travelHours < 1 ? 'local sea' : storm.travelHours < 48
    ? `arrives after ${Math.round(storm.travelHours)} h` : `arrives after ${(storm.travelHours / 24).toFixed(1)} days`;
  return `Hs ${storm.stormHeight.toFixed(1)} m · Tp ${storm.stormPeriod.toFixed(1)} s · ${storm.growth} · ${travel}`;
}

export function formatPhysicalReadout(simulation: SurfZoneSimulation, storm?: StormSwell): ReadoutRow[] {
  const { config, solver } = simulation;
  const breakPoint = simulation.breakPoint();
  const toSet = simulation.timeToSet;
  const breaker = simulation.iribarren();
  const peel = simulation.peelEstimate();
  const wind = config.windSpeed ?? 0;
  let peelText = 'waiting for a break';
  if (peel) {
    const angle = Math.round(peel.angleDegrees);
    const skill = skillForPeel(peel.angleDegrees);
    if (skill === 'closeout') peelText = `closing out · ${angle}° (needs ≥ 27°)`;
    else if (peel.fit < MIXED_PEAK_FIT) peelText = `mixed peaks · ${angle}°`;
    else peelText = `${angle}° toward ${peel.direction > 0 ? '+x' : '−x'} · ${skill}`;
  }
  const band = config.bandwidth !== undefined && Number.isFinite(config.bandwidth) ? ` · band ±${Math.round(config.bandwidth * 100)} %` : '';
  const clamped = storm && Math.abs(storm.significantHeight - config.significantHeight) > 0.05
    ? ` (storm delivers ${storm.significantHeight.toFixed(1)} m; tank limit)` : '';
  return [
    { label: 'SPOT', value: config.spot.toUpperCase() },
    ...(storm ? [{ label: 'STORM', value: formatStorm(storm) }] : []),
    { label: 'SWELL', value: `Hs ${config.significantHeight.toFixed(1)} m · Tp ${config.peakPeriod.toFixed(1)} s · ${config.directionDegrees}°${clamped}` },
    { label: 'SPREAD', value: `s ${config.spreading.toFixed(0)}${band}` },
    { label: 'TIDE', value: `${config.tide.toFixed(1)} m` },
    { label: 'BREAK LINE', value: `${Math.round(-breakPoint.z)} m out · ${(simulation.spot.depthAt(breakPoint.x, breakPoint.z) + config.tide).toFixed(2)} m deep` },
    { label: 'SOLVER', value: `${(solver.nx * solver.nz).toLocaleString('en-US')} cells · ${simulation.lastStepMs.toFixed(1)} ms/step` },
    { label: 'NEXT SET', value: toSet > 0 ? `in ${Math.round(toSet)} s` : `${Math.round(-toSet)} s ago` },
    { label: 'BREAKER', value: breaker.type === 'none' ? 'FLAT BED' : `ξ ${breaker.value.toFixed(2)} · ${breaker.type.toUpperCase()}` },
    { label: 'BREAKING', value: `${Math.round(simulation.breakingFraction() * 100)} % of the surf zone` },
    { label: 'PEEL', value: peelText },
    { label: 'LIP', value: simulation.lipLaunches === 0 ? 'no lip yet'
      : `${simulation.lipLaunches} throws · ${simulation.lipVolume.toFixed(1)} m³ · ${simulation.lip.airborneVolume().toFixed(1)} m³ airborne` },
    { label: 'WIND', value: wind === 0 ? 'calm'
      : `${Math.abs(wind)} m/s ${wind > 0 ? 'onshore' : 'offshore'} · breaking thresholds ×${simulation.breaking.onsetScale.toFixed(2)}` },
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
  readonly lipPoints = new LipPoints();
  /** Bubbles entrained under breaking bores, seen from below the surface. */
  readonly bubbles = new BubblePoints(1);
  simulation!: SurfZoneSimulation;
  /** The storm behind the running sea, in storm mode. */
  storm?: StormSwell;
  focus = { x: 0, z: 0 };

  constructor(scene: Scene) {
    scene.add(this.seabed.mesh, this.farField.mesh, this.lipPoints.mesh, this.bubbles.mesh);
  }

  /** Build the surf zone (warm start and spin-up take a few seconds) and show it on `water`. */
  start(settings: PhysicalSettings, seed: number, water: WaterSurface, overrides: Partial<SurfZoneConfig> = {}): void {
    const swell = swellFor(settings);
    const simulation = new SurfZoneSimulation({
      spot: settings.spot,
      seed,
      significantHeight: swell.significantHeight,
      peakPeriod: swell.peakPeriod,
      directionDegrees: settings.directionDegrees,
      spreading: swell.spreading,
      bandwidth: swell.bandwidth,
      tide: settings.tide,
      windSpeed: settings.windSpeed,
      ...overrides,
    });
    this.simulation = simulation;
    this.storm = swell.storm;
    this.bubbles.clear();
    water.setSource(new PhysicalSurfaceSource(simulation, 1));
    water.setChop(chopForWind(settings.windSpeed));
    water.setOptics(SPOT_OPTICS[settings.spot]);
    this.farField.setOptics(SPOT_OPTICS[settings.spot]);
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
    this.farField.setProfile(profile, hole, this.focus, { extent: FAR_EXTENT });
    this.farField.setChop(chopForWind(settings.windSpeed));
    this.camera.setView(this.camera.view);
  }

  step(dt: number): void {
    this.simulation.step(dt);
  }

  update(dt: number): void {
    this.camera.update(this.simulation, this.focus, dt);
    this.farField.update(this.simulation.seaTime);
    this.lipPoints.update(this.simulation.lip);
    this.bubbles.update(this.simulation, dt);
  }

  cameraBelowSurface(margin = 0.1): boolean {
    const position = this.camera.camera.position;
    return position.y < this.simulation.heightAt(position.x, position.z) - margin;
  }

  setVisible(visible: boolean): void {
    this.seabed.mesh.visible = visible;
    this.farField.mesh.visible = visible;
    this.lipPoints.mesh.visible = visible;
    this.bubbles.mesh.visible = visible;
  }
}
