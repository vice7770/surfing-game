import type { Scene } from 'three';
import { buildBoardShape } from '../physics/boardShape';
import { createBoardMesh } from '../scene/BoardMesh';
import { Surfer } from '../scene/Surfer';
import type { BodyPart, DetachedRiderPose } from '../physics/DetachedSurfer';
import { RIDER_PARTS } from '../physics/riderPosture';
import { FarFieldOcean } from '../scene/FarFieldOcean';
import { gradedAxis } from '../scene/gridGeometry';
import { BubblePoints } from '../scene/BubblePoints';
import { LipPoints, type RenderableLip } from '../scene/LipPoints';
import { PhysicalSurfaceSource } from '../scene/PhysicalSurfaceSource';
import { SpectatorCamera } from '../scene/SpectatorCamera';
import { SpotSeabed } from '../scene/SpotSeabed';
import { SPOT_OPTICS } from '../scene/waterOptics';
import type { WaterSurface } from '../scene/WaterSurface';
import { createSpot, smoothstep, type SpotName } from '../wave/Bathymetry';
import { FarFieldProfile } from '../wave/FarFieldProfile';
import { MIXED_PEAK_FIT, skillForPeel } from '../wave/Breaking';
import { stormSwell, type StormSwell } from '../wave/StormSwell';
import type { ReadoutRow } from '../wave/SwellReadout';
import { RIDER_SNAPSHOT, type RideRequest, type SurfZoneStatus } from '../wave/SurfZoneRunner';
import type { SpectatorView } from '../scene/SpectatorCamera';
import { OFFSHORE_DEPTH, TANK, surfZoneSea, tankDepth, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { LocalSurfZone, SnapshotSurfZone, type SurfZoneHost, type SurfZoneSnapshot } from './SurfZoneHost';

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

/** The Wave Lab rows for a running surf zone, from plain status values (they can come from the worker). */
export function formatPhysicalReadout(config: SurfZoneConfig, status: SurfZoneStatus, storm?: StormSwell): ReadoutRow[] {
  const { breakPoint, breaker, peel } = status;
  const toSet = status.timeToSet;
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
    { label: 'BREAK LINE', value: `${Math.round(-breakPoint.z)} m out · ${status.breakDepth.toFixed(2)} m deep` },
    { label: 'SOLVER', value: `${status.cells.toLocaleString('en-US')} cells · ${status.stepMs.toFixed(1)} ms/step` },
    { label: 'NEXT SET', value: toSet > 0 ? `in ${Math.round(toSet)} s` : `${Math.round(-toSet)} s ago` },
    { label: 'BREAKER', value: breaker.type === 'none' ? 'FLAT BED' : `ξ ${breaker.value.toFixed(2)} · ${breaker.type.toUpperCase()}` },
    { label: 'BREAKING', value: `${Math.round(status.breakingFraction * 100)} % of the surf zone` },
    ...(status.board ? [{ label: 'BOARD', value: `riderless · ${status.board.speed.toFixed(1)} m/s${status.board.resets ? ` · back in the lineup ×${status.board.resets}` : ''}` }] : []),
    ...(status.ride ? [
      { label: 'RIDER', value: `${status.ride.phase.toUpperCase()} · ${status.ride.speed.toFixed(1)} m/s${status.ride.cue ? ' · POP UP NOW' : ''}` },
      { label: 'POP-UP', value: status.ride.popUp.outcome === 'none' ? 'not yet'
        : status.ride.popUp.outcome === 'stood' ? `stood in ${status.ride.popUp.duration.toFixed(2)} s · landing ${status.ride.popUp.landingPeak.toFixed(1)} BW, ${Math.round(status.ride.popUp.frontShare * 100)} % front`
        : status.ride.popUp.outcome === 'rising' ? 'rising' : 'no support: board not planing' },
      ...(status.ride.separation ? [{ label: 'FELL', value: `${status.ride.separation} · R to paddle out again` }] : []),
    ] : []),
    { label: 'PEEL', value: peelText },
    { label: 'LIP', value: status.lipLaunches === 0 ? 'no lip yet'
      : `${status.lipLaunches} throws · ${status.lipVolume.toFixed(1)} m³ · ${status.lipAirborne.toFixed(1)} m³ airborne` },
    { label: 'WIND', value: wind === 0 ? 'calm'
      : `${Math.abs(wind)} m/s ${wind > 0 ? 'onshore' : 'offshore'} · breaking thresholds ×${status.onsetScale.toFixed(2)}` },
  ];
}

/**
 * The view-only physical surf zone (plan P2c, option a): the stage 1 solver on
 * the shared water surface, a seabed mesh from the spot, and a spectator
 * camera. The legacy board does not ride these waves until P4.
 */
export type SurfZoneHostFactory = (config: SurfZoneConfig) => SurfZoneHost;

/** Runs the surf zone in the page (tests, and browsers without Web Workers). */
export const localSurfZone: SurfZoneHostFactory = (config) => new LocalSurfZone(config, { rider: true });

/** The latest snapshot's packed lip positions, in the shape `LipPoints` draws. */
function snapshotLip(snapshot: SurfZoneSnapshot): RenderableLip {
  return {
    forEachActive(visit) {
      for (let i = 0; i < snapshot.lipCount; i += 1) visit(snapshot.lip[i * 3], snapshot.lip[i * 3 + 1], snapshot.lip[i * 3 + 2], 0);
    },
  };
}

export class PhysicalMode {
  readonly camera = new SpectatorCamera();
  readonly seabed = new SpotSeabed();
  readonly farField = new FarFieldOcean();
  readonly lipPoints = new LipPoints();
  /** Bubbles entrained under breaking bores, seen from below the surface. */
  readonly bubbles = new BubblePoints();
  /** The physical board, drawn at the snapshot's pose. */
  readonly board = createBoardMesh(buildBoardShape());
  /** The rider's body, drawn from the snapshot's seven points (its legacy board hidden). */
  readonly surfer = new Surfer();
  private readonly riderPose: { -readonly [K in keyof DetachedRiderPose]: DetachedRiderPose[K] } & { points: Float64Array } = {
    heading: 0,
    points: new Float64Array(RIDER_SNAPSHOT.length),
    getPartPosition(part: BodyPart, out) {
      const i = RIDER_PARTS.indexOf(part);
      return out.set(this.points[i * 3], this.points[i * 3 + 1], this.points[i * 3 + 2]);
    },
  };
  private retryPending = false;
  /** The running surf zone, once it has spun up. */
  host?: SurfZoneHost;
  config?: SurfZoneConfig;
  /** The storm behind the running sea, in storm mode. */
  storm?: StormSwell;
  focus = { x: 0, z: 0 };
  private starts = 0;
  private shown = true;
  private readonly follow = { position: { x: 0, y: 0, z: 0 }, heading: 0 };

  constructor(scene: Scene) {
    scene.add(this.seabed.mesh, this.farField.mesh, this.lipPoints.mesh, this.bubbles.mesh, this.board, this.surfer.group);
    this.board.visible = false;
    this.surfer.setBoardVisible(false);
    this.surfer.group.visible = false;
  }

  get ready(): boolean {
    return this.host !== undefined;
  }

  /**
   * Build the surf zone (warm start and spin-up take a few seconds) and show it
   * on `water`. Resolves false when a later start superseded this one.
   */
  async start(
    settings: PhysicalSettings, seed: number, water: WaterSurface, overrides: Partial<SurfZoneConfig> = {},
    createHost: SurfZoneHostFactory = localSurfZone,
  ): Promise<boolean> {
    const start = ++this.starts;
    const swell = swellFor(settings);
    const config: SurfZoneConfig = {
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
    };
    const host = createHost(config);
    await host.ready;
    if (start !== this.starts) {
      host.dispose();
      return false;
    }
    this.stop();
    this.host = host;
    this.config = config;
    this.storm = swell.storm;
    const { init } = host;
    water.setSource(new PhysicalSurfaceSource(new SnapshotSurfZone(host), init.grid.spacing));
    water.setChop(chopForWind(settings.windSpeed));
    water.setOptics(SPOT_OPTICS[settings.spot]);
    this.farField.setOptics(SPOT_OPTICS[settings.spot]);
    const spot = createSpot(config.spot, config.seed);
    const offshoreDepth = OFFSHORE_DEPTH[settings.spot];
    const windowMin = init.windowXMin;
    const windowMax = windowMin + (init.grid.nx - 1) * init.grid.spacing;
    const leftX = windowMin + init.dx / 2;
    const rightX = windowMax - init.dx / 2;
    // Beyond the window the world continues each edge column's seabed; offshore it deepens to FAR_DEPTH.
    const offshoreBed = (z: number) => offshoreDepth + (FAR_DEPTH - offshoreDepth) * smoothstep(TANK.offshore, TANK.offshore - FAR_SLOPE_LENGTH, z);
    const bedDepth = (x: number, z: number) => {
      if (z < TANK.offshore) return offshoreBed(z);
      return tankDepth(spot, offshoreDepth, x < windowMin ? leftX : x > windowMax ? rightX : x, z);
    };
    this.focus = { ...init.focus };
    const hole = { xMin: windowMin, xMax: windowMax, zMin: TANK.offshore, zMax: TANK.shore };
    this.seabed.setDepthOnGrid(
      bedDepth,
      gradedAxis(this.focus.x - 600, this.focus.x + 600, windowMin, windowMax, 2, 30),
      gradedAxis(-900, TANK.shore + 30, TANK.offshore, TANK.shore, 2, 30),
    );
    const profile = new FarFieldProfile(surfZoneSea(config), {
      referenceZ: TANK.offshore,
      shoreZ: TANK.shore,
      offshoreZ: TANK.offshore - (FAR_EXTENT - 330),
      shoreSamples: 181,
      offshoreSamples: 391,
      offshoreDepth: (z) => offshoreBed(z) + settings.tide,
      leftDepth: (z) => tankDepth(spot, offshoreDepth, leftX, z) + settings.tide,
      rightDepth: (z) => tankDepth(spot, offshoreDepth, rightX, z) + settings.tide,
    });
    this.farField.setProfile(profile, hole, this.focus, { extent: FAR_EXTENT });
    this.farField.setChop(chopForWind(settings.windSpeed));
    this.camera.setView(this.camera.view);
    return true;
  }

  /** Supersede any start still spinning up, so it never takes over. */
  cancel(): void {
    this.starts += 1;
  }

  /** Let the running surf zone go (its worker, if any, ends). */
  stop(): void {
    this.host?.dispose();
    this.host = undefined;
    this.board.visible = false;
    this.surfer.group.visible = false;
  }

  /** Request `steps` fixed physics steps (`SURF_ZONE_STEP` each). */
  /** The view a ride starts in, and returns to from profile or underwater. */
  get homeView(): SpectatorView {
    return this.host && this.host.snapshot.rider[RIDER_SNAPSHOT.present] > 0 ? 'ride' : 'overview';
  }

  /** Put board and rider back in the lineup on the next advance; the waves carry on. */
  retry(): void {
    this.retryPending = true;
  }

  advance(steps: number, input?: Omit<RideRequest, 'retry'>): void {
    const retry = this.retryPending;
    if (input || retry) this.retryPending = false;
    this.host?.advance(steps, input || retry ? { paddle: false, popUp: false, steer: 0, ...input, retry } : undefined);
  }

  update(dt: number): void {
    const { host } = this;
    if (!host) return;
    const pose = host.snapshot.board;
    const rider = host.snapshot.rider;
    const riding = rider[RIDER_SNAPSHOT.present] > 0;
    this.follow.position.x = pose[0];
    this.follow.position.y = pose[1];
    this.follow.position.z = pose[2];
    this.follow.heading = riding ? rider[RIDER_SNAPSHOT.heading] : 0;
    this.camera.update(host, this.focus, dt, pose[7] > 0 ? this.follow : undefined);
    this.farField.update(host.snapshot.status.seaTime);
    this.lipPoints.update(snapshotLip(host.snapshot));
    this.board.visible = this.shown && pose[7] > 0;
    this.board.position.set(pose[0], pose[1], pose[2]);
    this.board.quaternion.set(pose[3], pose[4], pose[5], pose[6]);
    this.surfer.group.visible = this.shown && riding;
    if (riding) {
      this.riderPose.points.set(rider);
      this.riderPose.heading = rider[RIDER_SNAPSHOT.heading];
      this.surfer.updateDetached(this.riderPose, this.board.position, this.board.quaternion);
    }
    this.bubbles.update({ positions: host.snapshot.bubbles, count: host.snapshot.bubbleCount });
  }

  /** The Wave Lab rows for the running surf zone. */
  readout(): ReadoutRow[] {
    return this.host && this.config ? formatPhysicalReadout(this.config, this.host.snapshot.status, this.storm) : [];
  }

  cameraBelowSurface(margin = 0.1): boolean {
    if (!this.host) return false;
    const position = this.camera.camera.position;
    return position.y < this.host.heightAt(position.x, position.z) - margin;
  }

  setVisible(visible: boolean): void {
    this.shown = visible;
    this.board.visible = visible && (this.host?.snapshot.board[7] ?? 0) > 0;
    this.surfer.group.visible = visible && (this.host?.snapshot.rider[RIDER_SNAPSHOT.present] ?? 0) > 0;
    this.seabed.mesh.visible = visible;
    this.farField.mesh.visible = visible;
    this.lipPoints.mesh.visible = visible;
    this.bubbles.mesh.visible = visible;
  }
}
