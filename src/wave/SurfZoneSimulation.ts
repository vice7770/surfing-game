import {
  PADANG, REEF, canyonArmAt, canyonBarAt, canyonBars, canyonJoin, canyonOnset, canyonPeelAt, canyonReefSpan, canyonShape, createSpot, padangForeFootZ, padangReefAt, pointOnset, reefLedgeAt, smoothstep, type CanyonBed, type CanyonShape, type SpotName, type SurfSpot,
} from './Bathymetry';
import { BoussinesqSolver, madsenSorensenWaveNumber } from './BoussinesqSolver';
import { BreakingModel, PeelTracker, aFrameEstimate, breakerDepthFor, type PeelEstimate } from './Breaking';
import { GRAVITY, shallowWaterWaveNumber, shoalingCoefficient, waveKinematics } from './dispersion';
import { SETS_OVER_TYPICAL, komarGaughan } from './surfForecast';
import { AERATION, AerationField } from './AerationField';
import { AdvectionStencil } from './AdvectionStencil';
import { FoamField, type FoamDecay } from './FoamField';
import { PlungingLip, lipThrow } from './PlungingLip';
import { TUBE_CAPACITY, carveGrid } from './tubeTable';
import { focusX } from './Refraction';
import { breakerForm, crestMotion, submergedCrest, waveHeightAt, type CrestMotion } from './CrestKinematics';
import { jetFlightTime, orthogonalGradient, reefOverturn, tubeGeometry, type TubeGeometry } from './Overturn';
import { SeaState } from './SeaState';
import { POOL, poolBreakDepth, poolRiddenAt, poolSea, poolTankLayout } from './pool';
import { SurfMeter, TAKE_OFF_BAND, type BreakingWave } from './SurfMeter';
import { SeaStateBoundary } from './SeaStateBoundary';
import { SideFeed } from './SideFeed';
import type { SurfZoneState } from './surfZoneState';
import type { LipImpact, RollerToes } from './SprayCloud';
import { OPEN_EDGE_RAMP, OPEN_EDGE_REACH, ShallowWaterSolver, stretchedEdges } from './ShallowWaterSolver';
import { riderBounds, sideMargin, type RiderBounds } from '../physics/riderBounds';
import { BREAKER_INDEX, describeSwell, type BreakerType } from './SwellReadout';
import { planSetRun, warmStart, type SetRunPlan } from './warmStart';
import { BreakingFront, type FrontOptions } from './barrel/BreakingFront';
import { BARREL_SPOTS, tubeFootMax } from './barrel/barrelSpots';
import type { TubeShape } from './barrel/barrelLibrary';
import { columnCrests, type CrestSample } from './barrel/crestOnset';
import { LANDMARK, type ProfileLibrary } from './barrel/ProfileLibrary';
import { advanceClocks, onsetTiming, type OnsetTiming } from './barrel/sliceClock';
import { SweptCrash } from './barrel/SweptCrash';
import { CarrierSupport } from './barrel/carrierSupport';
import { latchTubeSpans, writeFrontRecords } from './barrel/frontRecords';
import { BARREL_SLOPE } from './barrel/sweptLoft';
import { SpillingFront, type SpillingFrontOptions } from './SpillingFront';
import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE, SpillingRoller } from './SpillingRoller';
import { frayBand } from './drawnEdges';
import { BAND_LOOK_STRIDE, SpillingCurl } from './SpillingCurl';

/** No drawn splashes (`drawnImpacts` without a spilling lip). */
const NO_IMPACTS: readonly LipImpact[] = [];

/** Sea water, kg/m³ (the lip's impact energy for the aeration, G9). */
const WATER_DENSITY = 1025;

/** One lip throw (the tube report's measure, Part B). */
export interface LipThrowEvent {
  /** The jet's water the overturn asked for, and what the crest gave, m³. */
  asked: number;
  thrown: number;
  /** The breaking wave's height, m. */
  height: number;
  /** Where along shore the crest threw, m. */
  x: number;
  tube: TubeGeometry;
  /** A reef break's vortex ratio (Mead & Black 2001), within the range they measured, and the gradient it climbs. */
  vortexRatio?: number;
  orthogonalGradient?: number;
  /** The jet's speed over its crest's. */
  speedOverCrest: number;
}

export interface SurfZoneConfig {
  spot: SpotName;
  seed: number;
  /** Significant wave height Hs, m: the buoy's, in deep water, unless `heightAt` is 'edge'. */
  significantHeight: number;
  /**
   * Where Hs is given (the wave-sizes spec): in deep water, shoaled to the tank's edge by linear theory
   * (the default), or at the edge (Practice's groundswell). The Canyon always takes it at the edge.
   */
  heightAt?: 'deep' | 'edge';
  peakPeriod: number;
  /** Mean direction from shore-normal, degrees (positive toward +x). */
  directionDegrees: number;
  /** cos-2s spreading exponent s. */
  spreading: number;
  /** Relative width of the frequencies arriving together from a distant storm; omitted for the full band. */
  bandwidth?: number;
  /** Still-water level above datum, m. */
  tide: number;
  componentCount?: number;
  /** Along-shore window width, m. */
  alongShore?: number;
  dx?: number;
  fineSpacing?: number;
  coarseSpacing?: number;
  spinUpPeriods?: number;
  /** Seconds between hand-over and the next set peak at the zone. */
  lead?: number;
  /** Local wind, m/s: positive onshore, negative offshore. */
  windSpeed?: number;
  /** Kennedy onset threshold as a fraction of √(gh); defaults per spot. */
  breakingOnset?: number;
  /**
   * 'old': every spot's onset as before step 3b of the all-spots survey (2026-10-28), one value a spot (the Canyon keeps its
   * per-cell field, which came before): today only the Point's depth-keyed onset (`POINT_ONSET`) goes back to its flat
   * 0.65. The `?onset=old` dev switch, for A/Bs; online rooms run the default.
   */
  onsetRule?: 'old';
  /**
   * How the paddler's hands meet water outrunning the stroke (`AttachedRiderOptions.stroke`, canyon-catch 2026-10-29):
   * 'feather', the default, edge-on; 'old', broadside as before (the `?stroke=old` dev switch, for A/Bs). Every spot's
   * rider; online rooms run the default.
   */
  stroke?: 'feather' | 'old';
  /**
   * 'old': the sea's surface held still through the bodies' step, as before popup-moving-face (2026-10-29); by default
   * the bodies sample it moving at its rise rate to each substep's time (`PhysicalSurfWaterOptions.surfaceMotion`). The
   * `?surfaceMotion=old` dev switch, for A/Bs. Every spot's bodies; online rooms run the default.
   */
  surfaceMotion?: 'old';
  /**
   * 'old': back on the board after a wipeout as before swim-back (2026-10-29): the reel to the ankle, and the hands' and
   * chest's springs pulling the body onto the deck (`RideSessionOptions.swim`); by default the reel brings the tail to
   * the hand and the swimmer climbs on from where the body is. The `?swim=old` dev switch, for A/Bs; online rooms run
   * the default.
   */
  swim?: 'old';
  /**
   * 'old': a roller's froth drags a board's whole wetted hull anywhere in the lens's footprint, past its g-blended flow
   * and uncapped, as before bottom-stop (2026-10-29); by default only where the lens reaches (ξ ≤ g), past the roller's
   * own water (c·n̂), at most its grip on the face (Duncan's shear) and on the share of the hull's depth it covers
   * (`PhysicalSurfWaterOptions.froth`). Only the Canyon has roller lenses. The `?froth=old` dev switch, for A/Bs; online
   * rooms run the default.
   */
  froth?: 'old';
  /**
   * 'old': letting Compress go, the rider's legs extend at their full pace, as before compress-exit (2026-10-29); by
   * default no faster than the stance's spring can catch the body (`AttachedRiderOptions.extension`). Every spot. The
   * `?extension=old` dev switch, for A/Bs; online rooms run the default.
   */
  extension?: 'old';
  /**
   * 'off': no board throws spray, as before board-spray (2026-10-29); by default a planing board throws a sheet off its
   * rails and tail (`physics/boardSpray.ts`), drawn in the spray (`SprayCloud`). Visual only. The `?boardSpray=off` dev
   * switch, for A/Bs; online rooms run the default.
   */
  boardSpray?: 'off' | 'old';
  /**
   * 'off': the boards' spray leaves the hull as drops, as before spray-sheet (2026-10-30); by default it leaves as a
   * curtain of water that tears into the drops a little way out, drawn on the page (`SpraySheetMesh`). The
   * `?spraySheet=off` dev switch, for A/Bs; online rooms run the default.
   */
  spraySheet?: 'off';
  /** Foam e-folding times; defaults per spot. */
  foamDecay?: FoamDecay;
  /** Solver stage: 1 shallow water, 2 Madsen–Sørensen Boussinesq with Kennedy breaking (the default). */
  stage?: 1 | 2;
  /** Where stage 2 water steps: 'auto' on the GPU when a host offers one (the worker, with WebGPU), 'cpu' always on the CPU. */
  compute?: 'auto' | 'cpu';
  /** Online (spec N1): warm start so the sea, once spun up, sits at this sea time (the room's clock). */
  startSeaTime?: number;
  /** Whether the swept barrel's breaking front runs (the Padang Padang spec, Part B); defaults to SWEPT_BARREL. */
  sweptBarrel?: boolean;
  /** Where the swept barrel's lip throws: where the Navier–Stokes wave goes vertical ('measured', the default), or where the solver's onset joins it ('none'). */
  barrelLag?: 'measured' | 'none';
  /**
   * Where the swept barrel's front follows crests from, in place of the spot's own (`BarrelSpot.frontFrom`): the
   * relaxation zone's inner edge ('zone'), so a crest is sized at the foot wherever the foot lies, or the fine zone's
   * first row ('fine', Padang Padang's rows before the peak-sizing fix).
   */
  barrelFrontFrom?: 'fine' | 'zone';
  /** The swept barrel's front rules (`FrontOptions`), in place of the spot's own (`BarrelSpot.front`); `{}` for none. */
  barrelFront?: FrontOptions;
  /**
   * Whether the swept barrel's jets leave and land on its clock (the Padang Padang spec, Part B, PR 5): on wherever the
   * profile library is given at a swept spot (the default); off keeps Kennedy's lip there (the before-and-after probes).
   */
  sweptCrash?: boolean;
  /**
   * Whether a spilling spot's whitewater follows its spilling front (`SPILLING_SPOTS`, the canyon spilling prototype):
   * on by default there; off feeds the foam the solver's own breaking (the before-and-after probes).
   */
  spillingFront?: boolean;
  /**
   * Whether a spilling spot's broken faces carry the roller lens (the Canyon roller lens, S3, `SpillingRoller`): on by
   * default wherever the spilling front runs; off (or the front off) brings back the P11 roller push.
   */
  roller?: boolean;
  /**
   * Where the roller is drawn and felt, and where the rider's water breaks: behind the visible front ('front', the
   * default, the advisor's Q1) or wherever the solver breaks ('solver', Q1's evidence).
   */
  rollerMask?: 'front' | 'solver';
  /**
   * Whether a spilling spot draws its spilling lip (the Canyon spilling lip, `SpillingCurl`): a small curl at each
   * wave's front, and its white held back until the curl lands. On by default wherever the spilling front runs; off
   * draws the front's whitewater as it is felt (the before-and-after stills). Look only: nothing felt changes.
   */
  spillingCurl?: boolean;
  /**
   * Whether the spilling lip's curl, band and roller front take the local wave's H where a column has none of its own
   * (no lens, no section, a bridged gap), rather than the nominal take-off H (canyon-curl-front, 2026-10-23): on by
   * default; `?curlLocal=off` draws them as before, for A/Bs. Drawn only: nothing felt changes.
   */
  curlLocal?: boolean;
  /**
   * Whether a spilling spot's drawn whitewater and roller band fray at their ends and toe (the foam look, item 4a,
   * `drawnEdges.ts`): on by default where the spot's front asks for it; false draws them square (the before stills).
   * Look only: nothing felt changes.
   */
  drawnEdges?: boolean;
  /**
   * Whether a spilling spot with its spilling lip throws the roller front's drawn spray off its toe line (the Canyon
   * roller front, docs/research/roller-front-2026-10-22; Rich only): on by default; `?rollerFront=off` turns it off with
   * the front's ribbon, for A/Bs. Drawn only: nothing felt changes.
   */
  rollerFront?: boolean;
  /**
   * Whether the tank's open sides relax toward the incoming sea (`SideFeed`, the wave-sizes work): the config's say,
   * else `SIDE_FEED_SPOTS` (none since 2026-10-07).
   */
  sideFeed?: boolean;
  /**
   * Where the rider starts and relaunches, m seaward of the take-off, in place of the spot's own (`rideLineupOffset`):
   * the `?startOut=<m>` dev switch, to compare starts. Nothing about the waves changes.
   */
  startOut?: number;
  /**
   * The Canyon's layout (the `?canyonBed=old` dev switch, to ride the two side by side): 'reef', the default, today's
   * (canyon-long-wave's planar arm 120 m out whose break runs into the beach, with canyon-wave-r2's breaking-age join, in a
   * 260 m window); 'old', the whole layout before canyon-wave-r2 (`CANYON_OLD`: the same arm with rule A's breaking age,
   * in its 240 m window, with its take-off `CANYON_TAKE_OFF_DEPTH_OLD` and starts `CANYON_RIDE_LINEUP_OLD`), main's
   * Canyon at 578202fd, without the swept barrel wired after it. Every other spot ignores it; online rooms always run the
   * default.
   */
  canyonBed?: CanyonBed;
  /**
   * The Canyon's breaking-age join, in place of its layout's (`CANYON.ageJoin`): the `?canyonAgeJoin=<J>` dev switch, 0
   * for rule A as at every other spot (canyon-wave-r2), to A/B the gate alone on today's layout, its tube included. Every
   * other spot ignores it; online rooms always run the default.
   */
  canyonAgeJoin?: number;
  /**
   * Whether the Canyon's reef counts its waves' onsets in sequence (canyon-reef-sequence, 2026-10-27, `CANYON.reefBoreHold`):
   * in its columns a bore that drops out for under the hold is no new wave, and a crest breaking on the reef waits only
   * for the last break on the reef, not for the bores and shore break behind it, and the spilling front joins a following
   * crest a wavelength seaward of them even inside that wait, so each crest's white is drawn down the reef. False: the `?canyonReefSeq=off` dev switch, for A/Bs (main's until
   * 2026-10-27); online rooms run the default.
   */
  canyonReefSeq?: boolean;
  /**
   * Whether the Canyon's beach peaks draw and feel as the reef does (canyon-beach-look, 2026-10-28): their onsets feed
   * the spilling front, one group of waves per arm peeling away from its tip (`CANYON_BEACH_LOOK`), so their breaking gets
   * the drawn spilling lip and curl, the roller lenses and their push, and the roller front. False: the
   * `?canyonBeachLook=off` dev switch, for A/Bs (the solver's own whitewater there, main's until 2026-10-28); online rooms
   * run the default.
   */
  canyonBeachLook?: boolean;
  /**
   * How the swept barrel draws and collides its tubes (`TubeShape`): each case's own Basilisk frames, the default, or
   * 'bounded-C', the authored C profile drawn from 2026-10-05 to 2026-10-22 (the `?tubeShape=c` dev A/B). Online rooms
   * always run the default.
   */
  tubeShape?: TubeShape;
}

/**
 * Spilling spots (the canyon spilling prototype, docs/research/canyon-spilling-2026-10-05): their waves spill at any
 * size, never throwing a lip or a tube, and their whitewater follows a spilling front (`SpillingFront`) that peels
 * along each crest no faster than the spot's peel and never runs ahead of the solver's break.
 * - The Canyon stays one on the reef bed (2026-10-22, docs/research/canyon-reef-bed-2026-10-22), whose Big and sets by
 *   the peak plunge weakly: `throwLip` reads the bed's slope across its contours, about 3× the slope along the waves' path
 *   on the 70° arm, so jets would fire on the gentle fan too. The spilling lip draws its overturn (`SpillingCurl`) until
 *   the swept barrel is measured for it.
 */
export const SPILLING_SPOTS: readonly SpotName[] = ['canyon'];

/**
 * The Canyon's beach peaks' groups of the spilling front (canyon-beach-look, 2026-10-28; `SpillingFrontOptions.groups`):
 * each arm's front keeps up with the solver's break (a 20° cap, c_b / sin 20° ≈ 2.9 c_b): its bars already peel at a
 * visible 50–60° on their own, and a front held to the reef's 55° (or 40°) withheld sections the solver broke ahead of
 * it, splitting the line (the up peak's frames with a patch 26 % → 31 % at 40°, Medium, 3 seeds). No upcoast gate: upcoast of an arm is its tip and the other arm,
 * whose own group draws it; counted from an arm's first onset, the reef's 6 m left a gap at the tip, where an A-frame's
 * first section breaks both sides of it at once. Each wave is dropped 20 s after its first onset, not the reef's 45 s:
 * an arm starts a wave every 3–4 s (Medium), and its break has run its 45–55 m arm in some 10–15 s, so at 45 s the
 * front kept some 60 beach waves live, each seeding roller lenses in its bores.
 */
export const CANYON_BEACH_LOOK = { peelAngleDegrees: 20, upcoastMargin: Infinity, lifetime: 20 } as const;

/** Each spilling spot's front: the Canyon peels left to right seen from the beach (+x), at a 55° visible peel. */
export const SPILLING_FRONT: Partial<Record<SpotName, Partial<SpillingFrontOptions>>> = {
  canyon: { direction: 1, peelAngleDegrees: 55, drawnEdges: true },
};

/**
 * The breakers' shoreward surface drift the drawn foam rides at a spilling spot with its spilling lip (the advisor,
 * round 2; Hansen & Svendsen 1984): a surface mass flux Q_s = `flux` H_b² (m²/s; 1.2–1.5 at the Canyon's Big, the
 * advisor's figure) carried over the still depth, no faster than `max`, where the waves break (still depth up to
 * `reach` h_b) and none deeper. Provisional.
 */
export const SURFACE_DRIFT = { flux: 0.18, max: 0.4, reach: 1.3 } as const;

/** Each cell's shoreward drift for the drawn foam, m/s (`SURFACE_DRIFT`). */
export function surfaceDrift(solver: Pick<ShallowWaterSolver, 'bed' | 'restLevel'>, breakerDepth: number): Float64Array {
  const { bed, restLevel } = solver;
  const flux = SURFACE_DRIFT.flux * (BREAKER_INDEX * breakerDepth) ** 2;
  const drift = new Float64Array(bed.length);
  for (let i = 0; i < bed.length; i += 1) {
    const depth = restLevel - bed[i];
    if (!(depth > 0.05) || depth > SURFACE_DRIFT.reach * breakerDepth) continue;
    drift[i] = Math.min(SURFACE_DRIFT.max, flux / depth);
  }
  return drift;
}

/**
 * The drawn foam's decay at a spilling spot with its spilling lip (look only: the foam is drawn, never felt): its lace
 * lasts 6 s rather than the Canyon's 15 s, so the shoulder ahead of each front is clean water, as the owner asked
 * (2026-10-11), when the surface drift alone left the last waves' lace there (the coordinator's ruling, round 2).
 */
export const SPILLING_CURL_FOAM_DECAY: FoamDecay = { dense: 3, residual: 6 };

/**
 * Whether a sea draws the spilling lip: wherever its spilling front runs (no swept crash there: the Canyon's tubes leave
 * its spilling front, roller and curl as they were), unless the config says not.
 */
export function spillingCurlOn(config: Pick<SurfZoneConfig, 'spot' | 'spillingFront' | 'spillingCurl' | 'sweptBarrel' | 'sweptCrash' | 'canyonBed'>): boolean {
  return spillingFrontOn(config) && config.spillingCurl !== false && !sweptCrashOn(config);
}

/** Whether a sea's whitewater follows a spilling front: the config's say, else SPILLING_SPOTS. */
export function spillingFrontOn(config: Pick<SurfZoneConfig, 'spot' | 'spillingFront'>): boolean {
  return SPILLING_SPOTS.includes(config.spot) && config.spillingFront !== false;
}

/**
 * Spots whose barrel is the swept surface (the Padang Padang spec, Part B): their breaking fronts and slice clocks run.
 * The owner's switch: a spot with a barrel transect (`BARREL_SPOTS`) is switched on by adding it here (Part B, PR 7).
 * The Canyon left it on canyon-beach-break (2026-10-23, the owner: "spilling waves are supposed to be the default for the
 * Canyon. A tube on the reef section is OK. The tube in the video isn't surfable; it's the same as Padang's. Leave the
 * reef section as it is and the tubing work for later"): its tube is the `?canyonTube=on` dev switch, its wiring kept.
 */
export const SWEPT_BARREL: readonly SpotName[] = ['padang'];

/**
 * Whether a sea runs, and draws, the swept barrel: the config's say, else SWEPT_BARREL; never at a spot without a barrel
 * transect. At the Canyon, on either layout, only when the config asks (`?canyonTube=on`): its reef's tube as main ran
 * it from 2026-10-22 to canyon-beach-break, on the reef's columns alone (`advanceFront`).
 */
export function sweptBarrelOn(config: Pick<SurfZoneConfig, 'spot' | 'sweptBarrel' | 'canyonBed'>): boolean {
  return (config.sweptBarrel ?? SWEPT_BARREL.includes(config.spot)) && BARREL_SPOTS[config.spot] !== undefined;
}

/**
 * Whether a swept sea's jets leave and land on the barrel's clock (the swept crash, PR 5): the config's say, else the
 * spot's (`BarrelSpot.crash`: off at the Canyon), else on. It needs the profile library as well (the constructor's).
 */
export function sweptCrashOn(config: Pick<SurfZoneConfig, 'spot' | 'sweptBarrel' | 'sweptCrash' | 'canyonBed'>): boolean {
  return sweptBarrelOn(config) && (config.sweptCrash ?? BARREL_SPOTS[config.spot]?.crash ?? true);
}

/** A crest joins a breaking front from this share of the edge's wave height above still water (provisional). */
const FRONT_MIN_HEIGHT = 0.25;

/** Columns at each open along-shore edge where no lip is thrown: the reach of the solver's stencils. */
const OPEN_EDGE_COLUMNS = OPEN_EDGE_REACH;

/** How far a breaking crest's path is followed for the gradient it climbs, m: past any window's bounds, which end it first. */
const REEF_PATH_REACH = 400;

/** Along-shore window width unless the config or the spot says otherwise, m. */
export const ALONG_SHORE = 160;

/**
 * The window's along-shore width, m: the config's, else Padang Padang's own (its peak well inside the −x side), the Wave
 * Pool's, or the Canyon's layout's (`CANYON.alongShore`, 260 m since canyon-wave-r2; `CANYON_OLD`'s 240 m on 'old'), else
 * ALONG_SHORE.
 */
export function alongShoreOf(config: Pick<SurfZoneConfig, 'spot' | 'alongShore' | 'canyonBed'>): number {
  return config.alongShore ?? (config.spot === 'padang' ? PADANG.alongShore : config.spot === 'pool' ? POOL.alongShore
    : config.spot === 'canyon' ? canyonShape(config.canyonBed).alongShore : ALONG_SHORE);
}

/**
 * Spots that always run stage 2 (the Teahupo'o Reef and Padang Padang specs): shallow water steepens waves far
 * too early in the Reef's 30 m water and under Padang Padang's 16–18 s swells, so a machine that cannot keep up
 * runs them slower than real time instead.
 */
export const STAGE_2_ONLY: readonly SpotName[] = ['reef', 'padang', 'pool'];

/** The solver stage a spot runs on: the asked one, or 2 where the spot needs it. */
export function solverStage(spot: SpotName, stage: 1 | 2 | undefined): 1 | 2 {
  return STAGE_2_ONLY.includes(spot) ? 2 : stage ?? 2;
}

/** Swell components the tank's sea is built from, unless the config says otherwise. */
export const SEA_COMPONENTS = 24;

/** An internal water-only result. Until commit, neither solver arrays nor its logical clock changes. */
export interface PreparedWaterStep {
  /** False for a stale source generation; unsupported private diagnostics throw into the normal requested-step fallback. */
  commit(): boolean;
  /** Release staging and force the next device step to upload carried state from the committed solver. */
  discard(): void;
}

/** The stage 2 water stepped elsewhere (the GPU, plan P6): it advances the solver's own state in place. */
export interface SolverDevice {
  step(dt: number): Promise<void>;
  dispose(): void;
  /** Private solo worker capability; other devices and generic callers retain the ordinary step path. */
  prepareStep?(dt: number): Promise<PreparedWaterStep | undefined>;
  /** Optional timing of its latest step; hosts without a GPU can omit it. */
  readonly diagnostics?: { substeps: number; pack: number; cfl: number; encode: number; map: number; unpack: number };
  /** Optional traffic of its latest step: bytes uploaded and read back, readback maps and queue submissions. */
  readonly transfer?: DeviceTransfer;
}

/** What a device step moved between the CPU and the GPU, and how many round trips it took. */
export interface DeviceTransfer { uploadBytes: number; readbackBytes: number; maps: number; submits: number }

/** A surf zone built spun up (on the CPU, at once), or only warm-started, to spin up later on its device (`spinUp`). */
export type SurfZoneStart = 'spun-up' | 'warm';

export interface RenderGrid {
  xMin: number;
  zMin: number;
  spacing: number;
  nx: number;
  nz: number;
}

/** Wave-tank layout across shore, m (z increases toward the beach). */
export const TANK = { offshore: -330, zoneInner: -270, blendEnd: -190, fineFrom: -150, shore: 30 };

/**
 * Flat tank bed offshore of each spot's blend, m below datum: Padang Padang's is the deep water beyond its forereef, read
 * live for the sweep. The Canyon's 5 m is where its swells are given (`CANYON_SWELL_DEPTH`); its tank's own edge is
 * `CANYON.edgeDepth`, deeper, so its zone forces the solver's own (Madsen–Sørensen) wave numbers.
 */
export const OFFSHORE_DEPTH: Record<SpotName, number> = {
  beach: 5, point: 8, reef: REEF.deep, canyon: 5, get padang() { return PADANG.deep; }, get pool() { return POOL.feedDepth; },
};

/** A tank's layout across shore, m, and the still depth of its flat edge under the relaxation zone, m below datum. */
export interface TankLayout {
  offshore: number;
  zoneInner: number;
  blendEnd: number;
  fineFrom: number;
  shore: number;
  edgeDepth: number;
}

/** A big day's edge is this many buoy heights deep, so the zone's linear sea stays near linear (the wave-sizes spec). */
export const EDGE_DEPTH_PER_HS = 3.3;
/** …and at most this share of the deep-water wavelength, keeping kh ≤ 2.5 where the solver's dispersion holds. */
export const EDGE_DEPTH_MAX_WAVELENGTHS = 0.4;
/** A deeper tank's relaxation zone is at least this share of the edge wavelength long. */
export const ZONE_WAVELENGTHS = 0.75;
/** The fine zone starts this far seaward of where the sets break, m. */
export const SET_FINE_MARGIN = 40;
/** The furthest a tank reaches offshore, m. */
const TANK_REACH = -3000;
/** A bed that gets no more than FLAT_RISE deeper anywhere within FLAT_REACH seaward has levelled off, m: the edge stops there. */
const FLAT_REACH = 300;
const FLAT_RISE = 0.1;

/**
 * The tank for a swell (the wave-sizes spec): today's for small days and Practice, the Canyon's own; for a big day,
 * its edge where the take-off transect's bed first reaches the edge depth (or levels off short of it), and far
 * enough out that the blend onto the spot's bed lies 20 m seaward of the fine zone, which starts 40 m seaward
 * of where the sets break (Komar–Gaughan's H1/10 over the breaker index). The relaxation zone is at least 60 m
 * and 0.75 of the edge wavelength long; the edge takes the bed's depth there, within the kh limit.
 */
export function tankLayout(config: SurfZoneConfig): TankLayout {
  const today: TankLayout = { ...TANK, edgeDepth: OFFSHORE_DEPTH[config.spot] };
  // The Canyon (its straight-crest bed): its own zone and edge (CANYON.edgeDepth, deep enough for Big since the canyon-big
  // redesign), with 1 m cells from the zone in, so the waves shoaling onto its platform are resolved (on 4 m cells they
  // lost a third of their height unbroken). Its layout's (`canyonShape`): the zone from z −390 since canyon-layout.
  if (config.spot === 'canyon') {
    const c = canyonShape(config.canyonBed);
    const zoneInner = c.zoneInner;
    return { offshore: zoneInner - c.zoneLength, zoneInner, blendEnd: zoneInner + c.blendLength, fineFrom: zoneInner, shore: TANK.shore, edgeDepth: c.edgeDepth };
  }
  // The Wave Pool's machine: its own layout, fed where its regular wave is near linear (the movement-flow spec).
  if (config.spot === 'pool') return { ...poolTankLayout(TANK.shore), edgeDepth: today.edgeDepth };
  // The Reef's edge is always deep (REEF.deep, the Teahupo'o Reef spec): today's inner tank, whose forereef
  // lies inside it, with the zone lengthened to absorb its long waves.
  if (config.spot === 'reef') {
    const zone = Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, today.edgeDepth).wavelength);
    return { ...today, offshore: TANK.zoneInner - zone };
  }
  // Padang Padang's edge is the deep water beyond its forereef (the Padang Padang spec): injected on a 10 m platform, a
  // 16 s swell (Ursell ~40) kept changing shape for 150–200 m and broke deeper at the reef's far end. Its 1:19 wedge is
  // wide, so the fine zone starts SET_FINE_MARGIN seaward of where its sets first reach their breaker depth anywhere in
  // the window (never deeper than 0.9 of the edge's water), the blend lies beyond the forereef's foot, and the zone
  // absorbs its long waves.
  if (config.spot === 'padang') {
    const spot = createSpot('padang', config.seed);
    const sets = Math.min(0.9 * (today.edgeDepth + config.tide), (SETS_OVER_TYPICAL * komarGaughan(config.significantHeight, config.peakPeriod)) / BREAKER_INDEX);
    const reach = alongShoreOf(config) / 2;
    let setBreak = TANK.fineFrom + SET_FINE_MARGIN;
    for (let x = -reach; x <= reach; x += 5) {
      let z = TANK.shore;
      while (z > TANK_REACH && spot.depthAt(x, z) + config.tide < sets) z -= 1;
      setBreak = Math.min(setBreak, z);
    }
    const fineFrom = Math.min(TANK.fineFrom, setBreak - SET_FINE_MARGIN);
    const blend = TANK.blendEnd - TANK.zoneInner;
    const foreFoot = padangForeFootZ() - PADANG.foreRounding;
    const zoneInner = Math.min(fineFrom - 20 - blend, foreFoot - blend);
    const zone = Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, today.edgeDepth).wavelength);
    return { offshore: zoneInner - zone, zoneInner, blendEnd: zoneInner + blend, fineFrom, shore: TANK.shore, edgeDepth: today.edgeDepth };
  }
  const deepWavelength = (GRAVITY * config.peakPeriod ** 2) / (2 * Math.PI);
  const wanted = Math.max(today.edgeDepth, Math.min(EDGE_DEPTH_PER_HS * config.significantHeight, EDGE_DEPTH_MAX_WAVELENGTHS * deepWavelength));
  if (wanted <= today.edgeDepth) return today;
  const spot = createSpot(config.spot, config.seed);
  const depth = (z: number) => spot.depthAt(0, z);
  const deepens = (z: number) => {
    for (let ahead = 10; ahead <= FLAT_REACH; ahead += 10) if (depth(z - ahead) - depth(z) >= FLAT_RISE) return true;
    return false;
  };
  // Out along the take-off transect until the bed is deep enough, or levels off short of it (a bar's flank is not level).
  let reached = TANK.zoneInner;
  while (depth(reached) < wanted && reached > TANK_REACH && deepens(reached)) reached -= 1;
  if (Math.min(wanted, depth(reached)) <= today.edgeDepth) return today;
  // Coming in from there, the sets break where the bed first reaches their breaker depth.
  const setDepth = (SETS_OVER_TYPICAL * komarGaughan(config.significantHeight, config.peakPeriod)) / BREAKER_INDEX;
  let setBreak = reached;
  while (depth(setBreak) > setDepth && setBreak < TANK.fineFrom) setBreak += 1;
  const fineFrom = Math.min(TANK.fineFrom, setBreak - SET_FINE_MARGIN);
  const blend = TANK.blendEnd - TANK.zoneInner;
  const zoneInner = Math.min(reached, fineFrom - 20 - blend);
  const edgeDepth = Math.min(depth(zoneInner), EDGE_DEPTH_MAX_WAVELENGTHS * deepWavelength);
  const zone = Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, edgeDepth).wavelength);
  return { offshore: zoneInner - zone, zoneInner, blendEnd: zoneInner + blend, fineFrom, shore: TANK.shore, edgeDepth };
}

/**
 * Where a rider is held in this tank (the rider's bounds, the owner's 2026-10-09 playtest), m:
 * - along shore, a cell past the edge ramp inside each open side edge (21 m at 1 m cells, 22 m at Padang Padang's 2 m);
 * - offshore, a coarse cell inside the relaxation zone's inner edge (seaward of it the water is held to the incoming sea);
 * - at the beach, the open edges' stencil reach of fine cells short of the shore wall.
 */
export function tankRiderBounds(config: SurfZoneConfig): RiderBounds {
  const tank = tankLayout(config);
  const half = alongShoreOf(config) / 2;
  return riderBounds({ xMin: -half, xMax: half, zoneInner: tank.zoneInner, shore: tank.shore }, {
    side: sideMargin(OPEN_EDGE_RAMP, config.dx ?? 1),
    offshore: config.coarseSpacing ?? 4,
    shore: OPEN_EDGE_REACH * (config.fineSpacing ?? 1),
  });
}

/**
 * Spots whose tank sides are fed with the incoming sea by default (`SideFeed`, the wave-sizes work: open sides drained
 * a directional, oblique sea on a 160 m window). None, by the owner's decision of 2026-10-07: Padang Padang's feed,
 * its only user since 2026-09-30, is off.
 * - With it on, its linear target lagged the solver's crests by 15–28 m at the sides, so each big set shed a wake from
 *   both sides that met mid-window as a crest running two ways (docs/research/crest-bends-2026-10-07/). Over 20
 *   minutes it also spun up a shelf current (0.07 to 0.15 m/s) with 2–3 m/s along the +x beach.
 * - With it off, over the same 20 minutes, the sides held (0.92–1.38 of the middle per 100 s) and the level did not
 *   drift (docs/research/padang-side-feed-2026-10-08.md). Padang Padang's square, narrow swell (s = 150) on its 320 m
 *   window loses little through open sides.
 * The feed stays for a sea that needs it (`SurfZoneConfig.sideFeed`).
 */
export const SIDE_FEED_SPOTS: readonly SpotName[] = [];

/** Kennedy onset per spot (plan Q27): 0.35√(gh) on the barred beach, 0.65√(gh) on plain or steep beds. */
export const BREAKING_ONSET: Record<SpotName, number> = { beach: 0.35, point: 0.65, reef: 0.65, canyon: 0.65, padang: 0.65, pool: 0.65 };

/**
 * Foam e-folding times per spot, s (plan §2.4, G4). Dense whitewater decays like
 * oceanic whitecap foam, whose effective decay time is 1.4–4.8 s (Callaghan,
 * Deane & Stokes 2012). Surfactants stabilise a residual lace for much longer
 * (Callaghan et al. 2013, 2017); its times are game values, longest in the
 * beach's sandy surf and shortest in the reef's clear water.
 */
export const FOAM_DECAY: Record<SpotName, FoamDecay> = {
  beach: { dense: 3, residual: 20 },
  point: { dense: 3, residual: 12 },
  reef: { dense: 3, residual: 8 },
  canyon: { dense: 3, residual: 15 },
  // A reef's foam lasts at least as long as the Beach's (the advisor's Foam tab; Callaghan et al. 2012, 2013).
  padang: { dense: 3, residual: 20 },
  // A pool's clean water holds no lace for long (a game value, as the Reef's).
  pool: { dense: 3, residual: 8 },
};

/** A spot's own lip jet: see `LIP_JET`. */
export interface LipJetSetting {
  /** What a break over the spot's ledge asks for beyond Pick & Feddersen's fits, A_J / H²; the provisional slab's where omitted. */
  jetArea?: number;
  /** The most of a source cell's water above the wave's trough one throw may take; `SOURCE_SHARE` where omitted. */
  sourceShare?: number;
}

/**
 * The lip jets of the spots that have their own (the owner, 2026-10-03, on the water-physics advisor's recommendation
 * of 2026-09-30); every other spot keeps the slab and `SOURCE_SHARE`.
 * - **The Teahupo'o Reef's jet, 0.585 H²,** is the median of the advisor's two periodic Basilisk runs of its ledge:
 *   0.55 H² on the 1:4.2 ledge and 0.62 H² on the 1:6, each the jet's area just before the lip lands over the
 *   breaking wave's height squared (0.5485 and 0.6224; docs/research/water-physics/notes/round6-tube-profiles/periodic-runs.md,
 *   data/periodic_reef42_L12_plunge.json and data/periodic_reef60_L12_plunge.json). It replaces the slab's 0.47 H²
 *   (a 0.5 H lip over the void's length, unsourced). The tube (0.43 H², 1.42 and 23°) stays: the runs support it
 *   (0.34-0.45 H², 1.5-1.8 at 85 % of the flight).
 * - **So the Reef's lip thickens.** A jet lands as a sheet, its water over the void's length (`PlungingLip`), and the
 *   void stays about 1 H long in calm air, so the sheet goes from 0.47 H to about 0.58 H (provisional: the jet over its
 *   in-flight void; landing over the runs' 1.35 H was tried and not kept, see the report) and each jet lands spread that
 *   much wider along its travel. The runs' lip is thinner, 0.41-0.46 H, because they measure it over the tube just
 *   before it lands, flattened to 1.2-1.5 H long. A consequence of the owner's call, measured in
 *   docs/research/teahupoo-reef-report.md.
 * - **The Reef's cap, 0.3, is provisional** (the advisor's inference, not a measurement). The game's broad crest holds about
 *   2.6 H² of water in the source window, so a 0.585 H² jet takes a share of about 0.225 of it: over the 0.2 cap,
 *   which starved 39-69 % of the 0.47 H² throws on main (docs/research/teahupoo-reef-report.md); 0.3 leaves the
 *   biggest waves headroom.
 */
export const LIP_JET: Partial<Record<SpotName, LipJetSetting>> = {
  reef: { jetArea: 0.585, sourceShare: 0.3 },
};

/**
 * Wind shifts breaking onset (plan Q23), as a factor on the breaking thresholds
 * like the breaker index γ. With u = U/√(g h_b), positive onshore: γ(1 − 0.10u)
 * onshore and γ(1 + 0.05|u|) offshore, clamped to 0.6–1.1. Lab studies (Douglass
 * 1990 to U/√(gh) = ±2.3; King & Baker 1996 to ±1.1; reviewed by Zdyrski &
 * Feddersen 2022) find onshore wind lowers H_b/h_b by up to ~40 % and offshore
 * wind raises it by up to ~10 %, mostly by moving the breaker depth.
 */
export function windOnsetScale(windSpeed: number, breakerDepth: number): number {
  const u = windSpeed / Math.sqrt(GRAVITY * Math.max(0.1, breakerDepth));
  return u >= 0 ? Math.max(0.6, 1 - 0.1 * u) : Math.min(1.1, 1 - 0.05 * u);
}

/**
 * Spots that take their swell at the tank's edge, as before the wave-sizes work: the Wave Pool's machine, and the Canyon
 * (its seas are the riding reference and Surf School's), whose heights are given at its old 5 m edge
 * (`CANYON_SWELL_DEPTH`). The Reef's 30 m edge takes the buoy's deep-water swell shoaled to it.
 */
const EDGE_SWELL_SPOTS: readonly SpotName[] = ['canyon', 'pool'];

/**
 * The depth the Canyon's swell heights are given at, m: its tank's edge before Big needed a deeper one (the canyon-big
 * redesign, docs/research/canyon-spilling-2026-10-05 §1). A deeper edge takes the same sea de-shoaled to it by linear
 * theory, so each size's waves reach this depth as they did.
 */
export const CANYON_SWELL_DEPTH = 5;

/** The sea's Hs at the tank's edge, m: the buoy's deep-water height shoaled by linear theory, unless given at the edge. */
export function edgeHeight(config: SurfZoneConfig, edgeDepth = OFFSHORE_DEPTH[config.spot]): number {
  if (config.spot === 'canyon') {
    return config.significantHeight * shoalingCoefficient(config.peakPeriod, edgeDepth + config.tide)
      / shoalingCoefficient(config.peakPeriod, CANYON_SWELL_DEPTH + config.tide);
  }
  if (EDGE_SWELL_SPOTS.includes(config.spot) || config.heightAt === 'edge') return config.significantHeight;
  return config.significantHeight * shoalingCoefficient(config.peakPeriod, edgeDepth + config.tide);
}

/**
 * The seeded sea a surf zone is built from, at the tank's edge depth. Pure,
 * so the renderer can rebuild the same sea (for the far field) outside the worker.
 * A deeper tank's sea travels at the stage 2 solver's own (Madsen–Sørensen)
 * speeds, so its zone forces the waves the solver carries; today's tanks keep
 * the shallow-water numbers they were built with.
 */
export function surfZoneSea(config: SurfZoneConfig): SeaState {
  const tank = tankLayout(config);
  // The Wave Pool's machine: one regular wave, the same every time (the movement-flow spec).
  if (config.spot === 'pool') return poolSea(edgeHeight(config, tank.edgeDepth), tank.edgeDepth + config.tide, madsenSorensenWaveNumber);
  const deeper = tank.edgeDepth > OFFSHORE_DEPTH[config.spot] && solverStage(config.spot, config.stage) === 2;
  return SeaState.fromSpectrum({
    significantHeight: edgeHeight(config, tank.edgeDepth),
    peakPeriod: config.peakPeriod,
    direction: (config.directionDegrees * Math.PI) / 180,
    spreading: config.spreading,
    componentCount: config.componentCount ?? SEA_COMPONENTS,
    depth: tank.edgeDepth + config.tide,
    bandwidth: config.bandwidth,
  }, config.seed, deeper || STAGE_2_ONLY.includes(config.spot) ? madsenSorensenWaveNumber : shallowWaterWaveNumber);
}

/**
 * How each spot finds its take-off transect: straight out from the window's
 * centre, where its bed gathers the swell (a canyon's peak sits beside the
 * shadow it casts, as measured over the Scripps canyon, Magne et al. 2007, and
 * moves with the swell's direction and period), or at the spot's own peak. The
 * Canyon's straight-crest bed has no canyon: its waves start breaking at its
 * arm's peak, so its riders wait there.
 */
export const TAKE_OFF: Record<SpotName, 'centre' | 'focus' | 'peak'> = { beach: 'centre', point: 'centre', reef: 'peak', canyon: 'peak', padang: 'peak', pool: 'peak' };

/**
 * The breaker index a big day's take-off is placed with, per spot: the size report measures where each spot's
 * sets break and sets these so the take-off lands there (the wave-sizes spec). Today's tanks keep BREAKER_INDEX;
 * the Reef's is the Reef rework's to set. The Point's and the Beach's are fitted to their sets' measured breaks at
 * 14 s (Point Hs 2–4 m: 1.05–1.16; Beach Hs 2–3 m: 1.08–1.20), before the side feed; they are refitted after it.
 * Padang Padang's take-off follows PADANG_TAKE_OFF_INDEX instead.
 */
export const TAKE_OFF_INDEX: Record<SpotName, number> = { beach: 1.14, point: 1.13, reef: BREAKER_INDEX, canyon: BREAKER_INDEX, padang: BREAKER_INDEX, pool: BREAKER_INDEX };

/**
 * Padang Padang's take-off index against the swell's height at its edge, m: on its wedge a bigger set breaks shallower
 * for its height, so one index seated Practice's and Small's take-offs where their sets broke but left Medium's 23 m
 * and Big's 89 m seaward of theirs. The size report's sets broke, at mid tide, where γ is 0.57, 0.70, 0.90 and 1.20
 * for Practice, Small, Medium and Big (Hs at the edge 0.60, 1.18, 2.21 and 3.89 m): a least-squares line through
 * them (provisional; refit when the sizes change).
 */
export const PADANG_TAKE_OFF_INDEX = { intercept: 0.47, perMetre: 0.19 } as const;

/** Where a peak take-off waits along shore: at the Reef's, Padang Padang's, the Wave Pool's or the Canyon's own peak (its layout's). */
export function peakTakeOffX(spot: SpotName, canyonBed?: CanyonBed): number {
  return spot === 'padang' ? PADANG.takeOffX : spot === 'pool' ? POOL.takeOffX : spot === 'canyon' ? canyonShape(canyonBed).takeOffX : REEF.takeOffX;
}

/**
 * Where the Canyon's sets start breaking at its default start's beach peak (the upcoast bar's tip, canyon-beach-break,
 * 2026-10-23, docs/research/canyon-beach-break-2026-10-23), m deep, against a size's Hs (given at `CANYON_SWELL_DEPTH`): a
 * least-squares line through the depth by which nine in ten of each size's waves have started breaking in the tip's column
 * (± 4 m; each wave's most seaward break there, the game's onsets without their filters), 1.87, 2.61 and 3.57 m for Small,
 * Medium and Big (3 seeds × 14 periods each; the line gives 1.94, 2.50 and 3.61 m). Riders wait where the bar is this deep
 * (`takeOffPoint`), so the sets break at, not seaward of, the take-off. On the bar's 1:50 they break 94, 131 and 179 m from
 * the waterline: further out as they grow, as a spilling beach's do (the owner's decision 6). Re-measure if the bars,
 * their breaking or the swells change.
 */
export const CANYON_TAKE_OFF_DEPTH = { base: 0.95, perMetre: 1.11 } as const;

/**
 * Where the Canyon's reef's sets start breaking on its arm, m deep, against Hs: canyon-wave-r2's fit (2026-10-22,
 * docs/research/canyon-wave-r2-2026-10-22: 3 seeds × 14 periods each; 2.34, 2.73 and 3.47 m for Small, Medium and Big,
 * within 0.01 m of the line) in the take-off's column (x −9 ± 4 m). The reef's own take-off (`canyonReefTakeOff`), where
 * its readout reads its breaker; and the take-off of the layout before canyon-beach-break (`CANYON_TAKE_OFF_DEPTH_OLD`),
 * main's at b11d63ef, whose riders started on the reef.
 * - With the breaking age's diagonal join (`CANYON.ageJoin`) the crest beside the peak's break no longer breaks early on
 *   the age it inherited, so the sets start breaking shallower: on the same face canyon-long-wave's fit was 1.50 + 1.00 Hs
 *   (2.39, 2.86 and 4.00 m), Big's most of all.
 * - Until 2026-10-11 the line ran through each size's median first onset (0.96 + 0.65 Hs). On the arm's 1:30 face the
 *   waves of a size broke over 30–60 m across shore, so half of them broke 15–45 m seaward of that take-off, on top of a
 *   rider who waited there: the owner's playtest (2026-10-11), "the wave blows right on top, without the chance to paddle
 *   to pick up speed".
 */
export const CANYON_REEF_TAKE_OFF_DEPTH = { base: 1.67, perMetre: 0.75 } as const;

/** `CANYON_TAKE_OFF_DEPTH` on the layout before canyon-beach-break (`SurfZoneConfig.canyonBed` 'old', `CANYON_OLD`): the reef's. */
export const CANYON_TAKE_OFF_DEPTH_OLD = CANYON_REEF_TAKE_OFF_DEPTH;

/** How deep the Canyon's sets of significant height Hs start breaking on its arm, m (`CANYON_TAKE_OFF_DEPTH`), on a bed. */
export function canyonTakeOffDepth(significantHeight: number, bed: CanyonBed = 'reef'): number {
  const fit = bed === 'old' ? CANYON_TAKE_OFF_DEPTH_OLD : CANYON_TAKE_OFF_DEPTH;
  return fit.base + fit.perMetre * significantHeight;
}

/**
 * Where the rider starts and relaunches, m seaward of the take-off (`takeOffPoint`), at every spot but the Canyon (its
 * own is `CANYON_RIDE_LINEUP`). In the catch reports riders stood almost only from 4–8 m outside; from 25 m out the waves
 * pass before a paddler can reach the peak. The owner's playtest (2026-10-11) found 6 m sat on top of the breaking at the
 * Canyon, so every spot starts 5 m further out, to paddle into the wave before it breaks.
 */
export const RIDE_LINEUP_OFFSET = 11;

/**
 * The Canyon's start, m seaward of its take-off, against Hs (`rideLineupOffset`: linear between these sizes, held beyond
 * them): as far in as a paddler catches the sets best, but seaward of where one wave in ten starts breaking (the owner,
 * 2026-10-11: "not on top of the breaking"; 2026-10-23, decision 5). At the upcoast beach peak since canyon-beach-break
 * (2026-10-23, docs/research/canyon-beach-break-2026-10-23): canyon-wave-r2's catch model (`catch-model.mjs`: a point-mass
 * paddler, 80 kg, the prone drag and the 2.1 m/s sprint of `AttachedRider`, caught in `inTakeOffWindow`) on the solver's own
 * waves in the tip's column, 2 seeds × 12 periods a size:
 * - Small: one wave in ten breaks 4.5 m seaward of the take-off; 6 m out catches 90 % of the sets (one in ten breaks on
 *   the paddler): 6 m, 103 m from the waterline.
 * - Medium: one in ten breaks inside it; 9 m out catches 80 % of the sets, none breaking on the paddler (60 % from 11 m):
 *   9 m, 134 m.
 * - Big: one in ten breaks inside it; 3 m out catches 86 % (77 % from 11 m), none breaking on the paddler: 3 m, 183.5 m.
 * The bars' waves are kinder to catch than the reef's (its sets: 33, 44 and 50 % at its starts, canyon-wave-r2). On a 1:50
 * bar the starts lie nearer the beach as the swell drops: a spilling beach's sizes break across its width.
 * Re-measure if the bars, their breaking or the swells change.
 */
export const CANYON_RIDE_LINEUP: readonly { readonly significantHeight: number; readonly offset: number }[] = [
  { significantHeight: 0.9, offset: 6 },
  { significantHeight: 1.4, offset: 9 },
  { significantHeight: 2.4, offset: 3 },
];

/**
 * `CANYON_RIDE_LINEUP` on the layout before canyon-beach-break (`SurfZoneConfig.canyonBed` 'old', `CANYON_OLD`):
 * canyon-wave-r2's starts on the reef (2026-10-22), main's at b11d63ef: 9, 11 and 11 m out at Small, Medium and Big.
 */
export const CANYON_RIDE_LINEUP_OLD: readonly { readonly significantHeight: number; readonly offset: number }[] = [
  { significantHeight: 0.9, offset: 9 },
  { significantHeight: 1.4, offset: RIDE_LINEUP_OFFSET },
  { significantHeight: 2.4, offset: RIDE_LINEUP_OFFSET },
];

/**
 * Where the rider starts and relaunches, m seaward of the take-off: the config's (`startOut`, the `?startOut` dev switch),
 * else the Canyon's for its size (`CANYON_RIDE_LINEUP`), else RIDE_LINEUP_OFFSET. Online spawns start here too.
 */
export function rideLineupOffset(config: Pick<SurfZoneConfig, 'spot' | 'significantHeight' | 'startOut' | 'canyonBed'>): number {
  if (config.startOut !== undefined && Number.isFinite(config.startOut)) return config.startOut;
  if (config.spot !== 'canyon') return RIDE_LINEUP_OFFSET;
  const sizes = config.canyonBed === 'old' ? CANYON_RIDE_LINEUP_OLD : CANYON_RIDE_LINEUP;
  const height = config.significantHeight;
  if (!(height > sizes[0].significantHeight)) return sizes[0].offset;
  for (let i = 1; i < sizes.length; i += 1) {
    const [below, above] = [sizes[i - 1], sizes[i]];
    if (height <= above.significantHeight) {
      return below.offset + ((above.offset - below.offset) * (height - below.significantHeight)) / (above.significantHeight - below.significantHeight);
    }
  }
  return sizes[sizes.length - 1].offset;
}

/** A focus take-off stays this far inside the window's open along-shore edges, m. */
export const TAKE_OFF_EDGE_MARGIN = 30;

/**
 * Where the rider waits for waves: on the spot's take-off transect, where the
 * still depth first reaches the shoaled breaker depth. A focus transect is
 * where linear rays from the relaxation zone gather most densely at the break
 * line (`focusX`), inside the window's open edges.
 */
export function takeOffPoint(config: SurfZoneConfig): { x: number; z: number } {
  const spot = createSpot(config.spot, config.seed, { canyonBed: config.canyonBed });
  const tank = tankLayout(config);
  const deeper = tank.edgeDepth > OFFSHORE_DEPTH[config.spot];
  const height = edgeHeight(config, tank.edgeDepth);
  const index = config.spot === 'padang' ? PADANG_TAKE_OFF_INDEX.intercept + PADANG_TAKE_OFF_INDEX.perMetre * height
    : deeper ? TAKE_OFF_INDEX[config.spot] : BREAKER_INDEX;
  // The Wave Pool's regular wave first breaks where its arm is poolBreakDepth deep (the size probe): the shoaled-breaker
  // estimate from its Hs put the take-off 14 m seaward of the break, and 1.5 H put it 13–23 m inside it.
  // The Canyon's waves break up its arm's face (the straight-crest bed): the shoaled-breaker estimate put the take-off
  // inside the measured breaks.
  const target = config.spot === 'pool' ? poolBreakDepth(height / Math.SQRT2)
    : config.spot === 'canyon' ? canyonTakeOffDepth(config.significantHeight, config.canyonBed) + config.tide
      : breakerDepthFor(height, tank.edgeDepth + config.tide, index);
  const breakZ = (x: number) => firstReaching(spot, tank, x, target, config.tide);
  const reach = Math.max(0, alongShoreOf(config) / 2 - TAKE_OFF_EDGE_MARGIN);
  if (TAKE_OFF[config.spot] === 'centre' || reach === 0) return { x: 0, z: breakZ(0) };
  // The Reef's, Padang Padang's, the Wave Pool's and the Canyon's riders wait at their peak, where each wave first breaks.
  if (TAKE_OFF[config.spot] === 'peak') {
    const x = Math.min(reach, Math.max(-reach, peakTakeOffX(config.spot, config.canyonBed)));
    return { x, z: breakZ(x) };
  }
  const bed = (x: number, z: number) => tankDepth(spot, tank.edgeDepth, x, z, tank) + config.tide;
  const swell = { period: config.peakPeriod, direction: (config.directionDegrees * Math.PI) / 180 };
  const x = focusX(bed, swell, tank.zoneInner, breakZ(0), -reach, reach);
  return { x, z: breakZ(x) };
}

/** Where the tank's bed along +z at x is first `target` deep or shallower at the tide, scanning from the relaxation zone in, z. */
function firstReaching(spot: SurfSpot, tank: TankLayout, x: number, target: number, tide: number): number {
  for (let z = tank.zoneInner; z < tank.shore; z += 0.5) {
    if (tankDepth(spot, tank.edgeDepth, x, z, tank) + tide <= target) return z;
  }
  return tank.fineFrom;
}

/**
 * The Canyon's reef's own take-off, where its readout reads its breaker (canyon-beach-break: riders now start at a beach
 * peak): at its take-off x (`CANYON.reefTakeOffX`), where its arm is as deep as its sets start breaking
 * (`CANYON_REEF_TAKE_OFF_DEPTH`).
 */
export function canyonReefTakeOff(config: SurfZoneConfig): { x: number; z: number } {
  const c = canyonShape(config.canyonBed);
  const depth = CANYON_REEF_TAKE_OFF_DEPTH.base + CANYON_REEF_TAKE_OFF_DEPTH.perMetre * config.significantHeight;
  return { x: c.reefTakeOffX, z: firstReaching(createSpot('canyon', config.seed, { canyonBed: config.canyonBed }), tankLayout(config), c.reefTakeOffX, depth + config.tide, config.tide) };
}

/**
 * A Canyon beach peak's take-off (canyon-beach-break): at its bar's tip, where the bed is as deep as the default start's
 * sets start breaking (`canyonTakeOffDepth`), so its readout reads its breaker there.
 */
export function canyonBeachTakeOff(config: SurfZoneConfig, x: number): { x: number; z: number } {
  const target = canyonTakeOffDepth(config.significantHeight, config.canyonBed) + config.tide;
  return { x, z: firstReaching(createSpot('canyon', config.seed, { canyonBed: config.canyonBed }), tankLayout(config), x, target, config.tide) };
}

/**
 * Where the swept barrel's front follows crests from, z: the spot's rows (`BarrelSpot.frontFrom`) unless the config says
 * (`barrelFrontFrom`): the relaxation zone's inner edge, or the fine zone's first row (Padang Padang's before the
 * peak-sizing fix). At Padang Padang's peak, on Practice and Small, the fine
 * zone starts 3.7–6 m deep, shallower than the 6–7 m foot band, so crests first seen there were never sized and the
 * peak drew no barrel (the advisor, 2026-10-01). No crest is followed seaward of the foot, so what changes is where a
 * crest is sized: at the foot itself rather than at the fine zone's first row.
 */
export function barrelFrontFrom(config: Pick<SurfZoneConfig, 'spot' | 'barrelFrontFrom'>, layout: Pick<TankLayout, 'zoneInner' | 'fineFrom'>): number {
  return (config.barrelFrontFrom ?? BARREL_SPOTS[config.spot]?.frontFrom ?? 'zone') === 'fine' ? layout.fineFrom : layout.zoneInner;
}

/** Spot seabed with a flat floor under the relaxation zone at the edge depth, blended over the layout's zoneInner…blendEnd. */
export function tankDepth(
  spot: SurfSpot, edgeDepth: number, x: number, z: number, layout: Pick<TankLayout, 'zoneInner' | 'blendEnd'> = TANK,
): number {
  const toSpot = smoothstep(layout.zoneInner, layout.blendEnd, z);
  return edgeDepth + (spot.depthAt(x, z) - edgeDepth) * toSpot;
}

const WET = 0.01;
/** `writeUniformSnapshot`'s row notes: a solver row holds foam, or air or plume. */
const FOAMED = 1;
const AIRED = 2;

/**
 * Physical surf zone for one spot: a seeded sea enters through an offshore
 * relaxation zone into the stretched solver (stage 2 Boussinesq by default,
 * stage 1 shallow water on request), which starts from a warm WKB field a
 * set's lead time before its peak.
 */
export class SurfZoneSimulation {
  readonly spot: SurfSpot;
  /** The tank this swell needs (the wave-sizes spec). */
  readonly tank: TankLayout;
  readonly sea: SeaState;
  readonly solver: ShallowWaterSolver;
  readonly plan: SetRunPlan;
  readonly breaking: BreakingModel;
  /** Ballistic lip parcels thrown by plunging breakers (plan Q12). */
  readonly lip: PlungingLip;
  /** Lip parcels that landed during the latest step: where spray splashes up (G6). */
  readonly lipImpacts: LipImpact[] = [];
  /** Foam carried by the flow (plan §2.4): made by bores and lip splashes. */
  readonly foam: FoamField;
  /** G9: the air breaking drives into the water. */
  readonly aeration: AerationField;
  /** Lip throws so far, and their total volume, m³. */
  lipLaunches = 0;
  lipVolume = 0;
  /** Breaks since the start that threw a plunging jet, and that spilled as a roller (plan P7). */
  lipJets = 0;
  lipRollers = 0;
  /** Each throw, for reports: the jet asked for and thrown, the wave, its void and, for a reef break, its vortex ratio. */
  onThrow?: (event: LipThrowEvent) => void;
  readonly peel: PeelTracker;
  /**
   * Whether a column's new break at z counts toward the peel, where the spot says (the Canyon's arm, `canyonPeelAt`);
   * every break elsewhere.
   */
  private readonly peelOnsetAt?: (column: number, z: number) => boolean;
  /** The waves breaking at the take-off, as surf reports measure them (the wave-sizes spec). */
  readonly surf: SurfMeter;
  /** Called with every wave measured starting to break, anywhere in the window (reports listen here). */
  onBreak?: (wave: BreakingWave) => void;
  /** The swept barrel's breaking front and its slice clocks, on SWEPT_BARREL spots only. It reads the water, never writes it. */
  readonly front?: BreakingFront;
  /** Shown slice clocks that paused rather than ran back, since the start (the advisor's check on the onsets' noise). */
  frontPauses = 0;
  /**
   * The swept barrel's jets on its own clock (the Padang Padang spec, Part B, PR 5), at a swept spot given the profile
   * library: they replace Kennedy's lip there, and the whitewater waits for their touchdown.
   */
  readonly crash?: SweptCrash;
  /** The spilling front, at a spilling spot (`SPILLING_SPOTS`): it holds the whitewater back ahead of each wave's peel. */
  readonly spilling?: SpillingFront;
  /**
   * The roller lens on each wave's broken face, wherever the spilling front runs unless the config turns it off (the
   * Canyon roller lens, S3). It reads the water and the front, never writes them; the rider's water reads it.
   */
  readonly roller?: SpillingRoller;
  /**
   * The spilling lip's look, wherever the spilling front runs unless the config turns it off (the Canyon spilling lip):
   * it reads the front, the lenses and the water, and writes only what is drawn.
   */
  readonly curl?: SpillingCurl;
  /**
   * The highest foot crest whose wave plunges a tube (`tubeFootMax`, the spot's tube regime), m: Infinity where every
   * front point does. The front's records leave the rest out (`writeFrontRecords`), so they are neither drawn nor felt.
   */
  readonly tubeFootMax: number = Infinity;
  /**
   * At a spot with `BarrelSpot.tubeSpan` (the Canyon): only the front's pieces that have reached their span draw, are
   * felt and take the curl's columns (`latchTubeSpans`).
   */
  readonly tubeSpanned: boolean = false;
  /** With a tube regime and a spilling curl: the library, and per column the solver time a tube there touches down and its crest's z (NaN: none). */
  private readonly tubeLibrary?: ProfileLibrary;
  private readonly tubeTouchdown?: Float64Array;
  private readonly tubeZ?: Float64Array;
  /** The roller front's toe line for the drawn spray (`rollerToes`), kept for the step it was written at. */
  private toes?: RollerToes & { readonly table: Float32Array; readonly look: Float32Array; time: number };
  /** The whitewater whose foam is drawn with the spilling lip on: the front's, held back until each curl lands. */
  private readonly drawnWhitewater?: Float64Array;
  /** Where the window stood when the drawn foam's surface drift was laid on its bed (it follows the window). */
  private driftX = Number.NaN;
  /**
   * The breaking the whitewater sees at a swept spot with the crash (withheld over open curls, `SweptCrash`), or at a
   * spilling spot (withheld ahead of the spilling front and grown down the face behind it, `SpillingFront`).
   */
  private readonly whitewater?: Float64Array;
  /** The breaking the rider feels with the roller behind the front (Q1): the solver's behind each front, none ahead. */
  private readonly felt?: Float64Array;
  /** Scratch for the roller's reach across shore in the snapshot. */
  private readonly rollerExtent = { low: 0, high: 0 };
  /** Scratch for the snapshot's lens pass: each render column's lens reach across shore (`SpillingRoller.reachAt`). */
  private lensLow?: Float64Array;
  private lensHigh?: Float64Array;
  private readonly crestSamples: CrestSample[] = [];
  /** When a front's lips throw after the solver's onset: the spot's barrel transect, its foot at the tide (BARREL_SPOTS). */
  private readonly onsetTiming?: OnsetTiming;
  /** Where the front follows crests from, z: the fine zone's start, or the relaxation zone's inner edge (`BarrelSpot.frontFrom`). */
  private readonly frontFrom: number;
  /**
   * At the Canyon with its beach peaks: whether an along-shore position is the reef's (its footprint, `canyonReefSpan`),
   * where the swept barrel's front follows crests and the spilling front sees onsets. The beach peaks' A-frames peel both
   * ways, which the spilling front (one direction, its upcoast gate) cannot follow: their white and the breaking the rider
   * feels are the solver's own, as at the Beach (the water-physics advisor, 2026-10-23).
   */
  private readonly reefAt?: (x: number) => boolean;
  /** The Canyon's beach peaks' tips along shore with the beach look on (`canyonBeachLook`): their arms' groups. */
  private readonly beachLook?: readonly number[];
  /** The Canyon's layout (`canyonShape`). */
  private readonly canyonShape: CanyonShape;
  /**
   * The Canyon's beach peaks (canyon-beach-break): each arm's peel, over the breaks on its own bar. One tracker across both
   * arms of an A-frame reads as a close-out (the Wave Pool's note), so the left arm (toward +x) and the right have one each.
   */
  private readonly beachPeel?: { x: number; left: PeelTracker; right: PeelTracker; onBar: (x: number, z: number) => boolean }[];
  /** The Canyon's readout per peak with its beach peaks, built when first asked: each peak's take-off x and breaker there. */
  private peakBreakers?: { x: number; breaker: { value: number; type: BreakerType } }[];
  lastStepMs = 0;
  /** Latest step's wall time by stage, including the device readback wait in `water`. */
  readonly stepCosts = { water: 0, breaking: 0, roller: 0, front: 0, lip: 0, foam: 0, airSources: 0, aeration: 0 };
  /** Most offshore breaking cell per column last step (Infinity when none). */
  private readonly outerBreak: Float64Array;
  /**
   * The Canyon's reef columns' onsets (`CANYON.reefBoreHold`, canyon-reef-sequence): where each column's break was last
   * seen, z, and when, s (a column breaking again within `hold` s counts its jump from there, not from none), and when
   * each last started breaking on the reef (`peelOnsetAt`), s, which alone a break on the reef waits 0.7 Tp for; one more
   * than `crestGap` m seaward of where the column last broke, inside that wait, goes to the spilling front alone.
   */
  private readonly reefOnsets?: { hold: number; crestGap: number; columns: Uint8Array; seenZ: Float64Array; seenAt: Float64Array; lastOnReef: Float64Array };
  /** The first pass records the warm field's bores; onsets count from the next step. */
  private onsetsArmed = false;
  /** When each column last started a wave that could throw a lip, s. */
  private lastThrow!: Float64Array;
  /** When each column last started breaking a new wave, s. */
  private lastOnset!: Float64Array;
  /** Sea time at solver time 0, s: set by the warm start, or taken over with a handed-over sea (spec N1). */
  private seaTimeOffset: number;
  private readonly boundary: SeaStateBoundary;
  /** The incoming sea fed into the window's sides (the wave-sizes spec): open sides drained a directional sea. */
  private readonly sideFeed?: SideFeed;
  private takeOff?: { x: number; z: number };
  private mapping?: {
    grid: RenderGrid; xMin: number; columns: Int32Array; columnWeights: Float64Array;
    rows: Int32Array; rowWeights: Float64Array;
  };
  /** Per-cell velocity scratch for `writeUniformFlow`. */
  private velocityX?: Float64Array;
  private velocityZ?: Float64Array;
  /** Each cell's void fraction, for `writeUniformAeration`. */
  private voidFractions?: Float64Array;
  /** Each cell's foam cover (dense + lace), for `writeUniformSnapshot`'s nodes. */
  private foamCover?: Float64Array;
  /** Per solver row, whether it holds any foam (`FOAMED`) or any air or plume (`AIRED`), for `writeUniformSnapshot`. */
  private snapshotRows?: Uint8Array;
  /** Foam and aeration move over the same post-water flow; only their field values change between them. */
  private readonly advectionStencil = new AdvectionStencil();

  /** Solver seconds of spin-up that settle the warm-started sea's nonlinear shape. */
  private readonly spinUpSeconds: number;

  /** `barrel`: the swept barrel's profile library, at a swept spot (the page's cases): the crash runs on it (PR 5). */
  constructor(readonly config: SurfZoneConfig, start: SurfZoneStart = 'spun-up', barrel?: ProfileLibrary) {
    this.spot = createSpot(config.spot, config.seed, { canyonBed: config.canyonBed });
    const tank = tankLayout(config);
    this.tank = tank;
    const offshoreDepth = tank.edgeDepth;
    const alongShore = alongShoreOf(config);
    const dx = config.dx ?? 1;
    const grid = {
      nx: Math.round(alongShore / dx), xMin: -alongShore / 2, dx, xBoundary: 'open' as const,
      zEdges: stretchedEdges(tank.offshore, tank.shore, tank.fineFrom, config.fineSpacing ?? 1, config.coarseSpacing ?? 4),
    };
    const depthAt = (x: number, z: number) => tankDepth(this.spot, offshoreDepth, x, z, tank);
    const onset = config.breakingOnset ?? BREAKING_ONSET[config.spot];
    // The Canyon's breaking age joins through the diagonals only on steep enough water (`CANYON.ageJoin`, canyon-wave-r2).
    const diagonalJoin = config.spot === 'canyon' ? config.canyonAgeJoin ?? canyonShape(config.canyonBed).ageJoin : 0;
    // Its beach breaks earlier than its reef (`canyonOnset`, canyon-beach-break): the onset over the bed, at each cell's
    // centre, levelled like the bed across the open edges' bands (the transect OPEN_EDGE_RAMP m in).
    const shape = canyonShape(config.canyonBed);
    const inside = alongShore / 2 - OPEN_EDGE_RAMP;
    // The Point's eases from 0.45 √(g h) in water 3 m deep or less to its 0.65 by 4.5 m (`pointOnset`, point-onset), over
    // the still water at the session's tide, levelled across the open edges' bands as the Canyon's; `?onset=old`
    // (`onsetRule`) keeps its flat 0.65.
    const onsetAt = config.spot === 'canyon' && config.breakingOnset === undefined && shape.beach && shape.barOnset !== onset
      ? (x: number, z: number) => canyonOnset(Math.min(inside, Math.max(-inside, x)), z, onset, shape)
      : config.spot === 'point' && config.breakingOnset === undefined && config.onsetRule !== 'old'
        ? (x: number, z: number) => pointOnset(depthAt(Math.min(inside, Math.max(-inside, x)), z) + config.tide, onset) : undefined;
    // …and passes its breaking age along its crests by the beach's rule (`canyonJoin`: rule A), the reef keeping its gate.
    const joinAt = config.spot === 'canyon' && config.canyonAgeJoin === undefined && shape.beach && shape.barJoin !== diagonalJoin
      ? (x: number) => canyonJoin(Math.min(inside, Math.max(-inside, x)), diagonalJoin, shape) : undefined;
    const kennedy = { onset, ...(diagonalJoin > 0 ? { diagonalJoin } : {}), ...(onsetAt ? { onsetAt } : {}), ...(joinAt ? { joinAt } : {}) };
    this.solver = solverStage(config.spot, config.stage) === 2
      ? new BoussinesqSolver(grid, depthAt, { waterLevel: config.tide, breaking: kennedy })
      : new ShallowWaterSolver(grid, depthAt, { waterLevel: config.tide });
    this.sea = surfZoneSea(config);
    if (this.solver instanceof BoussinesqSolver) this.solver.onsetScale = windOnsetScale(config.windSpeed ?? 0, this.breakerDepth());
    const spinUp = (config.spinUpPeriods ?? 2) * config.peakPeriod;
    this.plan = planSetRun(this.sea, 0, tank.zoneInner, 0, config.lead ?? 25, spinUp);
    this.seaTimeOffset = config.startSeaTime !== undefined ? config.startSeaTime - spinUp : this.plan.warmStartSeaTime;
    warmStart(this.solver, this.sea, { referenceZ: tank.zoneInner, seaTime: this.seaTimeOffset });
    this.boundary = new SeaStateBoundary(
      this.solver, this.sea, this.solver.zoneWeightsAlongZ(tank.zoneInner, tank.offshore), this.seaTimeOffset,
    );
    this.solver.addRelaxationZone(this.boundary);
    if (config.sideFeed ?? SIDE_FEED_SPOTS.includes(config.spot)) {
      this.sideFeed = new SideFeed(this.solver, this.sea, { referenceZ: tank.zoneInner, timeOffset: this.seaTimeOffset });
      this.solver.addRelaxationZone(this.sideFeed);
    }
    this.spinUpSeconds = spinUp;
    // Nothing below reads the water, so all of it can be built before the spin-up.
    this.breaking = new BreakingModel(this.solver, kennedy);
    this.breaking.onsetScale = windOnsetScale(config.windSpeed ?? 0, this.breakerDepth());
    // The Reef's peel is its ledge's: breaks past it (the pass, the lagoon's beach face) are not its wave.
    // Padang Padang's is its reef's, from the peak to the channel. The Wave Pool's A-frame peels both ways alike, so a
    // fit across both arms reads as a close-out: its peel is the right arm's, where riders wait. The Canyon's is its
    // arm's, from the peak to the beach face: upcoast of the peak, and past the arm's end (canyon-layout's flanks), the
    // square crests close out on the beach. Its layout's arm (`SurfZoneConfig.canyonBed`).
    const xCenters = this.solver.xCenters;
    const canyon = canyonShape(config.canyonBed);
    this.canyonShape = canyon;
    const ridden = config.spot === 'reef' ? reefLedgeAt : config.spot === 'padang' ? padangReefAt : config.spot === 'pool' ? poolRiddenAt
      : config.spot === 'canyon' ? (x: number) => canyonArmAt(x, canyon) : undefined;
    this.peel = new PeelTracker(xCenters, config.peakPeriod, undefined, ridden && ((column) => ridden(xCenters[column])));
    // The Canyon's lagoon and its beach face behind the arm are not its wave (`CANYON.peelReach`; every break on the old layout).
    if (config.spot === 'canyon' && Number.isFinite(canyon.peelReach)) this.peelOnsetAt = (column, z) => canyonPeelAt(xCenters[column], z, canyon);
    if (config.spot === 'canyon' && canyon.beach) {
      const span = canyonReefSpan(canyon);
      this.reefAt = (x) => x >= span.from && x <= span.to;
      this.beachPeel = canyonBars(canyon).map((bar, k) => {
        const reach = bar.reach + canyon.barTaper;
        // An arm's columns: from the tip's (a metre either side) out to the end of its taper.
        const arm = (side: 1 | -1) => (column: number) => {
          const u = side * (xCenters[column] - bar.x);
          return u >= -1 && u <= reach;
        };
        return {
          x: bar.x, left: new PeelTracker(xCenters, config.peakPeriod, undefined, arm(1)), right: new PeelTracker(xCenters, config.peakPeriod, undefined, arm(-1)),
          onBar: (x: number, z: number) => canyonBarAt(x, z, canyon) === k,
        };
      });
    }
    this.outerBreak = new Float64Array(this.solver.nx).fill(Infinity);
    // The beach peaks' columns count their onsets in sequence too with the beach look (canyon-beach-look), each on its bar:
    // the spilling front's waves join by onsets, as the reef's.
    const reefSeq = config.spot === 'canyon' && canyon.beach && canyon.reefBoreHold > 0 && config.canyonReefSeq !== false;
    const beachSeq = config.spot === 'canyon' && canyon.beach && canyon.reefBoreHold > 0 && config.canyonBeachLook !== false && spillingFrontOn(config);
    if (reefSeq || beachSeq) {
      const span = canyonReefSpan(canyon);
      const bars = canyonBars(canyon);
      const { nx } = this.solver;
      const zone = (x: number) => {
        if (x >= span.from && x <= span.to) return reefSeq ? 1 : 0;
        const k = bars.findIndex((bar) => Math.abs(x - bar.x) <= bar.reach + canyon.barTaper);
        return beachSeq && k >= 0 ? 2 + k : 0;
      };
      this.reefOnsets = {
        hold: canyon.reefBoreHold, crestGap: canyon.reefCrestGap, columns: Uint8Array.from(xCenters, zone),
        seenZ: new Float64Array(nx).fill(Infinity), seenAt: new Float64Array(nx).fill(-Infinity), lastOnReef: new Float64Array(nx).fill(-Infinity),
      };
    }
    this.lip = new PlungingLip(this.solver, undefined, LIP_JET[config.spot]?.sourceShare);
    this.foam = new FoamField(this.solver, config.foamDecay ?? (spillingCurlOn(config) ? SPILLING_CURL_FOAM_DECAY : FOAM_DECAY[config.spot]));
    this.aeration = new AerationField(this.solver, { period: config.peakPeriod });
    this.lip.onLand = (x, z, volume, vx, vy, vz, flight) => {
      this.foam.addSplash(x, z, volume);
      // A swept barrel's pour lands under the solver's hump, where the drawn lip comes down: its spray rises from there (PR 5).
      this.lipImpacts.push({ x, z, volume, vx, vy, vz, whole: flight?.volume ?? volume, kind: flight?.kind ?? 0, ...(flight?.swept ? { y: flight.y } : {}) });
      // Its impact's energy drives air down in proportion to how far it fell (G9).
      const drop = flight ? Math.max(0.1, flight.launch.y - flight.y) : 1;
      this.aeration.addPlunge(x, z, 0.5 * WATER_DENSITY * volume * (vx * vx + vy * vy + vz * vz), AERATION.plungeDepth * drop);
      // Where it lands the water is an impact, not a dispersive wave: its wave's young roller is shallow water for a
      // while (a splash-up's short fall's zone lies inside its jet's), never back past where it left the crest.
      if (this.solver instanceof BoussinesqSolver) {
        const speed = Math.hypot(vx, vz);
        const flown = flight && speed > 0 ? ((x - flight.launch.x) * vx + (z - flight.launch.z) * vz) / speed : Infinity;
        this.solver.holdPlunge(x, z, vx, vz, flight && flight.waveHeight > 0 ? flight.waveHeight : drop, flown);
      }
    };
    // A collapsing tube's air that does not blow out breaks into bubbles (G9).
    this.lip.onAir = (x, z, volume, penetration) => this.aeration.addAir(x, z, volume, penetration);
    this.lastThrow = new Float64Array(this.solver.nx).fill(-Infinity);
    this.lastOnset = new Float64Array(this.solver.nx).fill(-Infinity);
    this.frontFrom = tank.fineFrom;
    if (sweptBarrelOn(config)) {
      // The spot's barrel record (`BARREL_SPOTS`); `barrel` is the constructor's profile library, for the crash.
      const record = BARREL_SPOTS[config.spot]!;
      this.onsetTiming = onsetTiming(record.footDepth + config.tide, config.peakPeriod, config.barrelLag !== 'none', record.onset);
      const slope = BARREL_SLOPE[config.spot];
      const crash = sweptCrashOn(config);
      const carrier = barrel?.options.geometry === 'bounded-C' && slope !== undefined && crash ? new CarrierSupport(barrel, slope) : undefined;
      this.front = new BreakingFront(config.fineSpacing ?? 1, this.onsetTiming, config.barrelFront ?? record.front, carrier);
      this.frontFrom = barrelFrontFrom(config, tank);
      if (barrel && slope !== undefined && crash) {
        this.crash = new SweptCrash(barrel, slope);
        this.whitewater = new Float64Array(this.solver.h.length);
      }
      // A spot whose waves plunge a tube only from a regime (the Canyon): the rest are its own look's, and the tube's
      // columns hold its white until the tube's own touchdown (`markTubeColumns`).
      this.tubeFootMax = tubeFootMax(config.spot, config.peakPeriod);
      if (barrel && slope !== undefined && Number.isFinite(this.tubeFootMax)) {
        this.tubeLibrary = barrel;
        this.tubeSpanned = BARREL_SPOTS[config.spot]?.tubeSpan !== undefined;
        this.tubeTouchdown = new Float64Array(this.solver.nx).fill(Number.NaN);
        this.tubeZ = new Float64Array(this.solver.nx).fill(Number.NaN);
      }
    }
    if (spillingFrontOn(config) && !this.crash) {
      // The Canyon's beach peaks: a group of the front's waves per arm, each peeling away from its tip (canyon-beach-look).
      const beachGroups = config.spot === 'canyon' && canyon.beach && config.canyonBeachLook !== false
        ? canyonBars(canyon).flatMap((bar) => ([-1, 1] as const).map((direction) => ({
          direction, ...CANYON_BEACH_LOOK,
          // Each arm's span: from its tip to the end of its bar's taper.
          span: direction < 0 ? { from: bar.x - bar.reach - canyon.barTaper, to: bar.x } : { from: bar.x, to: bar.x + bar.reach + canyon.barTaper },
        })))
        : [];
      if (beachGroups.length) this.beachLook = canyonBars(canyon).map((bar) => bar.x);
      this.spilling = new SpillingFront(this.solver, {
        ...SPILLING_FRONT[config.spot], ...(config.drawnEdges === false ? { drawnEdges: false } : {}), ...(beachGroups.length ? { groups: beachGroups } : {}),
      });
      this.whitewater = new Float64Array(this.solver.h.length);
      if (config.roller !== false) {
        const mask = config.rollerMask ?? 'front';
        this.roller = new SpillingRoller(this.solver, { mask });
        if (mask === 'front') this.felt = new Float64Array(this.solver.h.length);
      }
      if (config.spillingCurl !== false) {
        const breakerDepth = this.breakerDepth();
        this.curl = new SpillingCurl(this.solver, {
          breakerDepth, breakerHeight: BREAKER_INDEX * breakerDepth,
          // The overturn fits' H0/h0, as the plunging lip's: the incoming sea's height over the tank's offshore depth.
          nonlinearity: edgeHeight(config, tank.edgeDepth) / (tank.edgeDepth + config.tide),
          ...(config.curlLocal === false ? { local: false } : {}),
        });
        this.drawnWhitewater = new Float64Array(this.solver.h.length);
      }
    }
    const takeOff = this.breakPoint();
    this.surf = new SurfMeter([{ xMin: takeOff.x - TAKE_OFF_BAND, xMax: takeOff.x + TAKE_OFF_BAND }], config.peakPeriod);
    if (start === 'spun-up') {
      while (this.spinUpLeft() > 0) this.step(this.spinUpStep());
    }
  }

  /**
   * Spin a `'warm'`-built surf zone up: on its device when it has one (the GPU
   * is several times faster), else on the CPU. A failing device is dropped and
   * the CPU finishes from where it stopped. Fronts, lip water, foam and air
   * advance with every water step, just as they do after the rider joins.
   */
  async spinUp(): Promise<void> {
    // Startup advances only its requested intervals, never a staged future water step.
    await this.discardWaterPrefetch();
    while (this.spinUpLeft() > 0) {
      await this.stepAsync(this.spinUpStep());
    }
  }

  private spinUpLeft(): number {
    return this.spinUpSeconds - 1e-9 - this.solver.time;
  }

  /**
   * The next spin-up step: one substep at the CFL limit, re-checked every time. A trough draining a
   * shallow reef can shrink the stable step fivefold within a quarter second, and a stale bound diverges.
   */
  private spinUpStep(): number {
    return Math.min(this.solver.maxStableStep(), this.spinUpSeconds - this.solver.time);
  }

  /** The arrays that carry the sea's history (the handover's state probe found them; spec N1), by name. */
  private stateArrays(): Record<string, Float64Array> {
    const { solver } = this;
    const arrays: Record<string, Float64Array> = {
      h: solver.h, qx: solver.qx, qz: solver.qz,
      'foam.dense': this.foam.dense, 'foam.residual': this.foam.residual,
      // G9: the air breaking drove into the water, which draws the churn.
      'aeration.air': this.aeration.air, 'aeration.depth': this.aeration.depth,
      outerBreak: this.outerBreak, lastThrow: this.lastThrow, lastOnset: this.lastOnset,
      ...(this.reefOnsets
        ? { 'reefOnsets.seenZ': this.reefOnsets.seenZ, 'reefOnsets.seenAt': this.reefOnsets.seenAt, 'reefOnsets.lastOnReef': this.reefOnsets.lastOnReef }
        : {}),
    };
    if (solver instanceof BoussinesqSolver) {
      arrays.breakingStrength = solver.breakingStrength;
      arrays.breakingAge = solver.breakingAge;
      arrays.plungeHold = solver.plungeHold;
      const { predictor } = solver;
      if (predictor) {
        arrays['predictor.x'] = predictor.x;
        arrays['predictor.z'] = predictor.z;
      }
    }
    return arrays;
  }

  /**
   * This sea's state for a player joining the room late (spec N1: the sea
   * handover): the water, its breaking and foam, the lip in the air, and the
   * clock, copied. A sea built from the same room config and given it with
   * `importState` steps on exactly as this one does.
   */
  exportState(): SurfZoneState {
    const arrays = Object.fromEntries(Object.entries(this.stateArrays()).map(([name, array]) => [name, array.slice()]));
    return {
      nx: this.solver.nx, nz: this.solver.nz, solverTime: this.solver.time, seaTimeOffset: this.seaTimeOffset, arrays,
      counters: { lipLaunches: this.lipLaunches, lipVolume: this.lipVolume, lipJets: this.lipJets, lipRollers: this.lipRollers, onsetsArmed: this.onsetsArmed },
      lip: this.lip.exportState(),
      ...(this.front ? { front: this.front.exportState() } : {}),
      ...(this.spilling ? { spilling: { front: this.spilling.exportState(), ...(this.roller ? { roller: this.roller.exportState() } : {}) } } : {}),
    };
  }

  /** Takes over another player's sea (`exportState`): this sea must be built from the same room config. */
  importState(state: SurfZoneState): void {
    const { solver } = this;
    if (state.nx !== solver.nx || state.nz !== solver.nz) throw new Error(`A sea state from another tank (${state.nx}×${state.nz}, not ${solver.nx}×${solver.nz})`);
    solver.markAllWater();
    const arrays = this.stateArrays();
    for (const [name, values] of Object.entries(state.arrays)) {
      const target = arrays[name];
      if (!target || target.length !== values.length) throw new Error(`A sea state from another tank: ${name} does not fit`);
      target.set(values);
    }
    // The turbulence is not handed over (it never feeds back into the water): the breaking stirs it afresh.
    this.aeration.turbulence.fill(0);
    solver.time = state.solverTime;
    // The outer break line came over as the donor last measured it, so the copy watches for new breakers when the
    // donor does (a wave starting to break then throws on both). A spun-up donor that has not stepped yet does not:
    // its line is unmeasured. States from before the flag was handed over had always stepped.
    this.onsetsArmed = state.counters.onsetsArmed ?? state.solverTime > 0;
    // The surf is measured afresh from here (the wave-sizes spec): its waves belong to the sea that was replaced.
    this.surf.clear();
    this.seaTimeOffset = state.seaTimeOffset;
    this.boundary.timeOffset = state.seaTimeOffset;
    if (this.sideFeed) this.sideFeed.timeOffset = state.seaTimeOffset;
    this.lipLaunches = state.counters.lipLaunches;
    this.lipVolume = state.counters.lipVolume;
    this.lipJets = state.counters.lipJets;
    this.lipRollers = state.counters.lipRollers;
    this.lip.importState(state.lip);
    // A donor without a front (an older build) hands over none: this one starts afresh.
    this.front?.importState(state.front ?? { nextId: 0, nextFront: 0, points: [], held: [], tracks: [] });
    // A spilling spot's front and roller lenses (S3, §5) come over exactly; a donor without them (an older build, a
    // stored lesson sea) leaves a fresh front and no lenses, which come back with the next onsets.
    if (state.spilling) this.spilling?.importState(state.spilling.front);
    else this.spilling?.reset();
    if (state.spilling?.roller) this.roller?.importState(state.spilling.roller);
    else this.roller?.reset();
    // The spilling lip keeps nothing of its own: it is rebuilt from the front and lenses taken over, as the donor's was.
    if (this.curl) {
      this.markTubeColumns();
      this.curl.update(solver.time, 0, this.spilling!, this.roller, this.breaking.strength, this.tubeColumns());
    }
    if (solver instanceof BoussinesqSolver) solver.invalidateDeviceLayout();
  }

  get seaTime(): number {
    return this.solver.time + this.seaTimeOffset;
  }

  /** Seconds until the planned set peaks at the offshore zone line (negative once it has passed). */
  get timeToSet(): number {
    return this.plan.setPeakSeaTime - this.seaTime;
  }

  get windowXMin(): number {
    return this.solver.xCenters[0] - 0.5 * this.solver.dx;
  }

  /** Steps the water on a device instead of the CPU solver, when set (`stepAsync`). */
  device?: SolverDevice;
  /** Enabled only by WorkerCore's ordinary solo initialization capability. No CPU phase is prefetched. */
  private waterPrefetchEnabled = false;
  private waterGeneration = 0;
  private futureWaterFailure?: { device: SolverDevice; error: unknown };
  private futureWater?: {
    device: SolverDevice; dt: number; time: number; version: number; plunge: number; generation: number;
    ready: Promise<{ ok: true; result: PreparedWaterStep | undefined } | { ok: false; error: unknown }>;
  };

  enableSoloWaterPrefetch(): void { this.waterPrefetchEnabled = true; }
  get hasWaterPrefetch(): boolean { return this.futureWater !== undefined; }

  /** Start one future water-only step after the current runner's complete CPU feedback, before its fill/reply. */
  prefetchWater(dt: number): void {
    const { device, solver } = this;
    if (!this.waterPrefetchEnabled || this.futureWater || !device?.prepareStep || !(solver instanceof BoussinesqSolver)) return;
    const generation = this.waterGeneration;
    const ready = device.prepareStep(dt).then((result) => {
      if (generation !== this.waterGeneration) result?.discard();
      return { ok: true as const, result };
    }, (error: unknown) => ({ ok: false as const, error }));
    this.futureWater = { device, dt, time: solver.time, version: solver.deviceLayout().version,
      plunge: solver.plungeVersion, generation, ready };
  }

  /** Before a restore, remote push or incompatible request; discard never advances the CPU or falls back speculatively. */
  async discardWaterPrefetch(): Promise<void> {
    this.waterGeneration += 1;
    const future = this.futureWater;
    this.futureWater = undefined;
    if (!future) return;
    const settled = await future.ready;
    if (settled.ok) settled.result?.discard();
    else this.futureWaterFailure = { device: future.device, error: settled.error };
  }

  private async consumeWaterPrefetch(dt: number, device: SolverDevice): Promise<boolean> {
    const future = this.futureWater!;
    this.futureWater = undefined;
    const settled = await future.ready;
    const solver = this.solver;
    const matches = future.device === device && future.device === this.device && future.dt === dt
      && future.generation === this.waterGeneration && future.time === solver.time
      && solver instanceof BoussinesqSolver && future.version === solver.deviceLayout().version && future.plunge === solver.plungeVersion;
    if (!matches) {
      if (settled.ok) settled.result?.discard();
      else if (future.device === device) throw settled.error;
      return false;
    }
    if (!settled.ok) throw settled.error;
    return settled.result?.commit() ?? false;
  }

  step(dt: number): void {
    const start = performance.now();
    this.lipImpacts.length = 0;
    this.solver.step(dt);
    this.afterWater(dt, start);
  }

  /** `step` with the water on the device when there is one; a failing device is dropped for the CPU solver. */
  async stepAsync(dt: number): Promise<void> {
    const { device } = this;
    if (!device) {
      if (this.futureWater) await this.discardWaterPrefetch();
      this.futureWaterFailure = undefined;
      this.step(dt);
      return;
    }
    const start = performance.now();
    this.lipImpacts.length = 0;
    try {
      const failure = this.futureWaterFailure;
      this.futureWaterFailure = undefined;
      if (failure?.device === device) throw failure.error;
      const consumed = this.futureWater ? await this.consumeWaterPrefetch(dt, device) : false;
      if (!consumed) await device.step(dt);
    } catch (error) {
      console.warn('Surf zone device step failed; stepping on the CPU from here.', error);
      device.dispose();
      this.device = undefined;
      this.solver.step(dt);
    }
    this.afterWater(dt, start);
  }

  /** Everything a step does once the water has moved: breaking, lip, foam. */
  private afterWater(dt: number, start: number): void {
    let phase = performance.now();
    this.stepCosts.water = phase - start;
    this.breaking.update(dt);
    this.markBreakingOnsets();
    // A spilling spot's whitewater follows its front (`SpillingFront`): it reads the breaking, never writes it. With the
    // spilling lip, the whitewater drawn waits for each curl to land (the lip's look, from its last step's columns).
    this.spilling?.update(this.solver.time, dt, this.breakerCelerity(), this.breaking.strength, this.whitewater!, this.felt, this.drawnWhitewater, this.curl);
    let end = performance.now();
    this.stepCosts.breaking = end - phase;
    phase = end;
    // Its roller lenses (S3) read the water and the front, after the front's step.
    if (this.roller) this.roller.update(this.solver.time, dt, this.spilling!, this.breaking.strength, this.breakerDepth());
    // The spilling lip's columns, after the lenses' step: what the next step's drawn whitewater and the snapshot read.
    if (this.curl) {
      this.markTubeColumns();
      this.curl.update(this.solver.time, dt, this.spilling!, this.roller, this.breaking.strength, this.tubeColumns());
    }
    end = performance.now();
    this.stepCosts.roller = end - phase;
    phase = end;
    this.advanceFront(dt);
    end = performance.now();
    this.stepCosts.front = end - phase;
    phase = end;
    this.lip.step(dt);
    end = performance.now();
    this.stepCosts.lip = end - phase;
    phase = end;
    // The foam drawn: with the spilling lip, made only once each curl has landed and drifting shoreward on the surface;
    // its air's bores and the stencil the air rides stay the felt whitewater's and the current's.
    if (this.curl && this.driftX !== this.solver.xCenters[0]) {
      this.driftX = this.solver.xCenters[0];
      this.foam.setDrift(surfaceDrift(this.solver, this.breakerDepth()));
    }
    // Cleared of the last waves' lace, and made none, on each unbroken shoulder ahead of a front (drawn only, round 3).
    this.curl?.clearShoulder(this.foam, this.drawnWhitewater, this.spilling!, dt);
    this.foam.update(dt, this.whitewaterStrength, this.advectionStencil, this.drawnWhitewater);
    end = performance.now();
    this.stepCosts.foam = end - phase;
    phase = end;
    this.aerateBores(dt);
    end = performance.now();
    this.stepCosts.airSources = end - phase;
    phase = end;
    this.aeration.update(dt, this.advectionStencil);
    end = performance.now();
    this.stepCosts.aeration = end - phase;
    this.lastStepMs = end - start;
  }

  /**
   * Each column's tube, at a spot with a tube regime and a spilling curl (the Canyon): the solver time its youngest
   * tube-regime front point there touches down (its clock from now to the library's touchdown) and its crest's z, NaN
   * where none. The spilling curl draws nothing there and holds its white until that touchdown, so the tube and the curl
   * never draw the same metre of crest (the advisor, 2026-10-22). Read from the front as the last step left it.
   */
  private markTubeColumns(): void {
    const { front, tubeLibrary, tubeTouchdown, tubeZ } = this;
    if (!front || !tubeLibrary || !tubeTouchdown || !tubeZ) return;
    tubeTouchdown.fill(Number.NaN);
    tubeZ.fill(Number.NaN);
    const slope = BARREL_SLOPE[this.config.spot]!;
    const time = this.solver.time;
    for (const p of front.points) {
      if (!(p.footHeight <= this.tubeFootMax) || (this.tubeSpanned && p.tubeSpan !== true) || p.column < 0 || p.column >= tubeTouchdown.length) continue;
      const touchdown = time - p.tau + tubeLibrary.profileTimes({ slope, footHeight: p.footHeight, footDepth: p.footDepth }).touchdownSeconds;
      // The youngest wave's: the one touching down last.
      if (!(touchdown <= tubeTouchdown[p.column])) {
        tubeTouchdown[p.column] = touchdown;
        tubeZ[p.column] = p.z;
      }
    }
  }

  /**
   * At a spot with `BarrelSpot.tubeSpan` (the Canyon): marks the front's pieces that have reached their span, which then
   * stay marked (`latchTubeSpans`). H is the drawn height at the throw of a piece's highest foot crest, from the library
   * (the advisor's fourth ruling, 2026-10-22).
   */
  private latchTubeSpans(): void {
    const span = BARREL_SPOTS[this.config.spot]?.tubeSpan;
    if (!this.tubeSpanned || !this.front || span === undefined) return;
    latchTubeSpans(this.front.points, this.tubeFootMax, span, (p) => this.throwHeight(p.footHeight, p.footDepth));
  }

  /** A tube's drawn height at its throw (τ = 0) for a foot crest and depth, m: crest over the lower of its toe and front. */
  private throwHeight(footHeight: number, footDepth: number): number {
    const library = this.tubeLibrary!;
    const query = { slope: BARREL_SLOPE[this.config.spot]!, footHeight, footDepth, seconds: 0, hold: 'contact' as const };
    const point = this.heightPoint;
    library.pointAt(query, LANDMARK.crest, point);
    const crest = point[1];
    library.pointAt(query, LANDMARK.toe, point);
    const toe = point[1];
    library.pointAt(query, LANDMARK.front, point);
    return Math.max(1e-6, crest - Math.min(toe, point[1]));
  }

  private readonly heightPoint = new Float64Array(2);

  /** The front's records as the page draws them and the contact feels them: the tube regime's and, with a span, the spanned pieces' (`writeFrontRecords`). */
  writeTubeRecords(out: Float32Array): number {
    return this.front ? writeFrontRecords(this.front.points, out, this.tubeFootMax, this.tubeSpanned) : 0;
  }

  /** The columns' tubes for the spilling curl (`markTubeColumns`), when there are any to read. */
  private tubeColumns(): { touchdown: Float64Array; z: Float64Array } | undefined {
    return this.tubeTouchdown && this.tubeZ ? { touchdown: this.tubeTouchdown, z: this.tubeZ } : undefined;
  }

  /** The swept barrel's front (Part B): the crests breaking in the fine zone, linked into lines, and their clocks. */
  private advanceFront(dt: number): void {
    const { front, solver } = this;
    if (!front) return;
    const minHeight = FRONT_MIN_HEIGHT * edgeHeight(this.config, this.tank.edgeDepth);
    let count = columnCrests(solver, this.breaking, solver.rowBelow(this.frontFrom), minHeight, this.crestSamples);
    // The Canyon's tube is the reef's (`?canyonTube=on`): its beach peaks spill, so their crests never join its front.
    const ridden = this.reefAt;
    if (ridden) {
      let kept = 0;
      for (let k = 0; k < count; k += 1) {
        const sample = this.crestSamples[k];
        if (!ridden(sample.x)) continue;
        this.crestSamples[k] = this.crestSamples[kept];
        this.crestSamples[kept] = sample;
        kept += 1;
      }
      count = kept;
    }
    front.update(this.crestSamples, count, solver.time);
    this.frontPauses += advanceClocks(front.points, solver.time, this.onsetTiming!, dt);
    this.latchTubeSpans();
    if (this.crash) {
      // The barrel's jets leave and land on its clock, and the whitewater waits for its touchdown (PR 5).
      const { throws, volume } = this.crash.update(front.points, {
        solver, lip: this.lip, stillLevel: solver.restLevel, period: this.config.peakPeriod, strength: this.breaking.strength,
        whitewater: this.whitewater!,
      });
      this.lipLaunches += throws;
      this.lipJets += throws;
      this.lipVolume += volume;
    }
  }

  /**
   * The breaking the whitewater sees: the foam's bore source (and the spray and bubbles it drives), the bore's air and
   * turbulence, and the roar. At a swept spot with the crash it waits, over each open curl, for the barrel's touchdown
   * (PR 5); at a spilling spot it follows the spilling front; anywhere else it is the solver's own.
   */
  get whitewaterStrength(): Float64Array {
    return this.whitewater ?? this.breaking.strength;
  }

  /**
   * The breaking the rider's water reports (the Canyon roller lens, S3, the advisor's Q1): with the roller drawn and
   * felt behind the visible front, the solver's breaking behind each front and where no wave owns a cell, none ahead,
   * so the hold-down, the curl readers and the duck-dive goal follow the visible front too. Anywhere else, and with the
   * roller off or on the solver's mask, the solver's own.
   */
  get feltBreaking(): Float64Array {
    return this.felt ?? this.breaking.strength;
  }

  /** Still depth where the shoaled swell breaks, h_b = (Hs·D^¼/γ)^⅘, m. */
  breakerDepth(): number {
    return breakerDepthFor(edgeHeight(this.config, this.tank.edgeDepth), this.sea.depth);
  }

  /** Bore speed at the break, √(g h_b), m/s. */
  breakerCelerity(): number {
    return Math.sqrt(GRAVITY * this.breakerDepth());
  }

  /** Breaker-point Iribarren number from the bed slope at the break line and H_b = γ h_b. */
  iribarren(point = this.breakPoint()): { value: number; type: BreakerType } {
    const bed = (z: number) => tankDepth(this.spot, this.tank.edgeDepth, point.x, z, this.tank);
    const slope = Math.abs(bed(point.z - 2) - bed(point.z + 2)) / 4;
    const depth = this.breakerDepth();
    const overCrest = submergedCrest((ahead) => bed(point.z + ahead) + this.config.tide, depth, slope);
    const readout = describeSwell({ height: BREAKER_INDEX * depth, period: this.config.peakPeriod, depth, bedSlope: slope, submergedCrest: overCrest });
    return { value: readout.iribarren, type: readout.breakerType };
  }

  /**
   * The peel the readout gives: the spot's (at the Canyon, its reef's), or, at the Canyon with its beach peaks, the peel of
   * the peak nearest along-shore position x when one is given (the rider's, or the view's): the reef's on its footprint,
   * else the nearest beach peak's two arms (`aFrameEstimate`).
   */
  peelEstimate(x?: number): PeelEstimate | undefined {
    const peak = x === undefined ? undefined : this.beachPeakNear(x);
    if (!peak) return this.peel.estimate(this.solver.time, this.breakerCelerity());
    // Each arm's fit leaves out the open edge's levelled band, where the bed is no longer the bar's.
    const margin = OPEN_EDGE_RAMP / (this.solver.nx * this.solver.dx);
    const celerity = this.breakerCelerity();
    return aFrameEstimate(peak.left.estimate(this.solver.time, celerity, margin), peak.right.estimate(this.solver.time, celerity, margin), x! < peak.x ? -1 : 1);
  }

  /**
   * The Canyon's peaks with its beach peaks, for a readout that follows the view (the Wave Lab): each one's stretch of
   * shore (the reef's footprint, each bar's tip ± its reach and taper), its breaker and its peel now. Undefined elsewhere.
   */
  readoutPeaks(): { from: number; to: number; breaker: { value: number; type: BreakerType }; peel?: PeelEstimate }[] | undefined {
    if (!this.beachPeel) return undefined;
    const c = canyonShape(this.config.canyonBed);
    const reef = canyonReefSpan(c);
    const middle = 0.5 * (reef.from + reef.to);
    return [
      { from: reef.from, to: reef.to, breaker: this.breakerNear(middle)!, peel: this.peelEstimate(middle) },
      ...canyonBars(c).map((bar) => {
        const reach = bar.reach + c.barTaper;
        return { from: bar.x - reach, to: bar.x + reach, breaker: this.breakerNear(bar.x)!, peel: this.peelEstimate(bar.x) };
      }),
    ];
  }

  /** The beach peak nearest along-shore position x, or none: off the Canyon's beach, or on its reef's footprint. */
  private beachPeakNear(x: number): NonNullable<SurfZoneSimulation['beachPeel']>[number] | undefined {
    if (!this.beachPeel || this.reefAt?.(x)) return undefined;
    let best = this.beachPeel[0];
    for (const peak of this.beachPeel) if (Math.abs(x - peak.x) < Math.abs(x - best.x)) best = peak;
    return best;
  }

  /**
   * The breaker the readout gives for the peak nearest along-shore position x, at the Canyon with its beach peaks: the
   * reef's at its own take-off (`canyonReefTakeOff`) on its footprint, else the nearest beach peak's at its tip
   * (`canyonBeachTakeOff`). Undefined elsewhere: the spot's one take-off's (`iribarren`).
   */
  breakerNear(x: number): { value: number; type: BreakerType } | undefined {
    if (!this.beachPeel) return undefined;
    this.peakBreakers ??= [
      { x: Number.NaN, breaker: this.iribarren(canyonReefTakeOff(this.config)) },
      ...this.beachPeel.map((peak) => ({ x: peak.x, breaker: this.iribarren(canyonBeachTakeOff(this.config, peak.x)) })),
    ];
    const peak = this.beachPeakNear(x);
    return { ...(this.peakBreakers.find((p) => p.x === peak?.x) ?? this.peakBreakers[0]).breaker };
  }

  /** Share of wet surf-zone cells breaking with B > 0.3. */
  breakingFraction(): number {
    const { solver } = this;
    let wet = 0;
    let breaking = 0;
    for (let iz = solver.rowBelow(this.tank.fineFrom); iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        if (solver.h[i] <= WET) continue;
        wet += 1;
        if (this.breaking.strength[i] > 0.3) breaking += 1;
      }
    }
    return wet > 0 ? breaking / wet : 0;
  }

  /**
   * A new wave starts breaking in a column when its most offshore breaking cell
   * jumps seaward by more than 5 m. Bores still crossing the inner surf zone
   * therefore do not hide the next onset.
   */
  private markBreakingOnsets(): void {
    const { solver } = this;
    const firstRow = solver.rowBelow(this.tank.fineFrom);
    for (let column = 0; column < solver.nx; column += 1) {
      let outer = Infinity;
      let row = -1;
      for (let iz = firstRow; iz < solver.nz; iz += 1) {
        if (this.breaking.strength[iz * solver.nx + column] > 0.3) {
          outer = solver.zCenters[iz];
          row = iz;
          break;
        }
      }
      const previous = this.outerBreak[column];
      this.outerBreak[column] = outer;
      // On the Canyon's reef a bore that dropped out for under the hold is still where it was last seen, and a break on the
      // reef waits only for the last on the reef (`reefBoreHold`): the bores and shore break behind it are other breaks.
      // A break on the reef more than `reefCrestGap` m seaward of where the column last broke is the next crest: inside the
      // wait it is no onset (the readout reads one wave a period), but the spilling front joins it, so its white is drawn.
      let from = previous;
      let seen = Infinity;
      const reef = this.reefOnsets?.columns[column] ? this.reefOnsets : undefined;
      if (reef) {
        seen = reef.seenZ[column];
        if (!(previous < Infinity) && solver.time - reef.seenAt[column] <= reef.hold) from = seen;
        if (outer < Infinity) {
          reef.seenZ[column] = outer;
          reef.seenAt[column] = solver.time;
        }
      }
      // On the reef (`peelReach`), or on its own bar in a beach peak's columns (`canyonBarAt`).
      const zone = reef ? reef.columns[column] : 0;
      const onReef = reef !== undefined && outer < from - 5
        && (zone === 1 ? !this.peelOnsetAt || this.peelOnsetAt(column, outer) : canyonBarAt(solver.xCenters[column], outer, this.canyonShape) === zone - 2);
      if (this.onsetsArmed && onReef && outer < seen - reef.crestGap && !this.newBreaker(column, row, reef.lastOnReef[column])) {
        if (this.newBreaker(column, row, -Infinity)) this.observeFront(column, outer);
      } else if (this.onsetsArmed && outer < from - 5 && this.newBreaker(column, row, onReef ? reef.lastOnReef[column] : this.lastOnset[column])) {
        this.lastOnset[column] = solver.time;
        if (onReef) reef.lastOnReef[column] = solver.time;
        if (!this.peelOnsetAt || this.peelOnsetAt(column, outer)) this.peel.markOnset(column, solver.time, outer);
        if (this.beachPeel) {
          const x = solver.xCenters[column];
          for (const peak of this.beachPeel) {
            if (!peak.onBar(x, outer)) continue;
            if (peak.left.measures(column)) peak.left.markOnset(column, solver.time, outer);
            if (peak.right.measures(column)) peak.right.markOnset(column, solver.time, outer);
          }
        }
        this.observeFront(column, outer);
        this.measureBreak(column, row);
        this.throwLip(column, row);
      }
    }
    this.onsetsArmed = true;
  }

  /**
   * The spilling front hears of a new break in `column` at z: on the Canyon's reef (or anywhere, without its beach) its own
   * waves'; with the beach look, on a beach peak's bar, its arm's group's (the −x arm's left of the tip, the +x arm's right).
   */
  private observeFront(column: number, z: number): void {
    const front = this.spilling;
    if (!front) return;
    const x = this.solver.xCenters[column];
    if (!this.reefAt || this.reefAt(x)) {
      front.observeOnset(column, this.solver.time, z);
      return;
    }
    if (!this.beachLook) return;
    const bar = canyonBarAt(x, z, this.canyonShape);
    if (bar >= 0) front.observeOnset(column, this.solver.time, z, 1 + 2 * bar + (x >= this.beachLook[bar] ? 1 : 0));
  }

  /** Where each column's outermost breaking cell lies across shore, z (Infinity when the column is not breaking). */
  outerBreakZ(column: number): number {
    return this.outerBreak[column];
  }

  /**
   * Whether a column's break at `row` starts a new wave: at most one per
   * 0.7 Tp after `last` (the column's last onset; on the Canyon's reef, its
   * last on the reef), and only where the still depth is at least 0.4 h_b.
   * Shallower first breaks are swash bores reaching the shore after a lull;
   * counting them read every spot's peel as mixed peaks.
   */
  private newBreaker(column: number, row: number, last = this.lastOnset[column]): boolean {
    const { solver } = this;
    if (solver.time - last < 0.7 * this.config.peakPeriod) return false;
    return solver.restLevel - solver.bed[row * solver.nx + column] >= 0.4 * this.breakerDepth();
  }

  /**
   * Measure a wave starting to break in `column` (the wave-sizes spec): its crest is the highest surface up to
   * four cells seaward of the outermost breaking cell, as for the lip, and its face runs from that crest to the
   * lowest water within half a wavelength ahead (√(g h) Tp / 2 at the crest's still depth).
   */
  private measureBreak(column: number, row: number): void {
    const { solver } = this;
    const { nx } = solver;
    let crest = row * nx + column;
    for (let iz = row - 1; iz >= Math.max(1, row - 4); iz -= 1) {
      if (solver.surfaceAt(iz * nx + column) > solver.surfaceAt(crest)) crest = iz * nx + column;
    }
    const stillDepth = Math.max(WET, solver.restLevel - solver.bed[crest]);
    const wave: BreakingWave = {
      time: solver.time,
      x: solver.xCenters[column],
      z: solver.zCenters[Math.floor(crest / nx)],
      face: waveHeightAt(solver, crest, 0.5 * this.config.peakPeriod * Math.sqrt(GRAVITY * stillDepth)),
    };
    this.surf.add(wave);
    this.onBreak?.(wave);
  }

  /**
   * Throw a lip where a new wave starts breaking in `column`, if the local
   * breaker-point Iribarren number says plunging. The crest is the highest
   * surface up to four cells seaward of the outermost breaking cell; H_b = γ h
   * there, and the slope is the local bed gradient. A column throws at most once
   * per 0.7 Tp (one wave), and only where the still depth is at least 0.4 h_b:
   * shallower first breaks are swash bores reaching the shore after a lull, not
   * new breakers, and a lip there would carry almost no water (volume ∝ H²).
   */
  private throwLip(column: number, row: number): void {
    // At a swept spot with the crash the barrel alone plunges, on its own clock; a wave no front joins spills (PR 5).
    if (this.crash) {
      this.crash.counts.onsets += 1;
      return;
    }
    const { solver } = this;
    const { nx, nz, bed, zCenters } = solver;
    if (solver.time - this.lastThrow[column] < 0.7 * this.config.peakPeriod) return;
    // The window's along-shore edges are open: their columns are what the boundary copies, within the
    // solver stencils' two columns. Lip water and momentum dropped there ran the oblique Reef away (Part B).
    if (column < OPEN_EDGE_COLUMNS || column >= nx - OPEN_EDGE_COLUMNS) return;
    let crest = row * nx + column;
    for (let iz = row - 1; iz >= Math.max(1, row - 4); iz -= 1) {
      if (solver.surfaceAt(iz * nx + column) > solver.surfaceAt(crest)) crest = iz * nx + column;
    }
    const crestRow = Math.floor(crest / nx);
    const stillDepth = solver.restLevel - bed[crest];
    if (!(stillDepth >= 0.4 * this.breakerDepth()) || crestRow < 1 || crestRow > nz - 2) return;
    this.lastThrow[column] = solver.time;
    // A spilling spot's waves spill at every size: no lip, no tube (the canyon spilling prototype).
    if (SPILLING_SPOTS.includes(this.config.spot)) {
      this.lipRollers += 1;
      return;
    }
    const slopeZ = (bed[crest + nx] - bed[crest - nx]) / (zCenters[crestRow + 1] - zCenters[crestRow - 1]);
    const slopeX = column > 0 && column < nx - 1 ? (bed[crest + 1] - bed[crest - 1]) / (2 * solver.dx) : 0;
    const breakerHeight = BREAKER_INDEX * stillDepth;
    const deepWavelength = (GRAVITY * this.config.peakPeriod ** 2) / (2 * Math.PI);
    const slope = Math.hypot(slopeX, slopeZ);
    const x = solver.xCenters[column];
    const overCrest = submergedCrest(
      (ahead) => solver.restLevel - solver.sampleCentered(bed, x, zCenters[crestRow] + ahead), stillDepth, Math.abs(slopeZ),
    );
    // A break over a submerged crest is a reef break: its shape follows Mead & Black by the gradient it climbs
    // along its travel (the Teahupo'o Reef, Part B); every other break keeps the plane-slope rule.
    const iribarren = slope / Math.sqrt(breakerHeight / deepWavelength);
    let motion: CrestMotion | undefined;
    let height = 0;
    let orthogonal: number | undefined;
    // Mead & Black's fit is of plunging waves: a spilling break over a crest (a bar's) stays a roller.
    if (overCrest && iribarren >= 0.4) {
      motion = crestMotion(solver, crest);
      if (!motion) return;
      height = this.breakingWaveHeight(crest, motion);
      const gradient = this.orthogonalGradient(x, zCenters[crestRow], motion, height);
      if (reefOverturn(gradient, edgeHeight(this.config, this.tank.edgeDepth) / (this.tank.edgeDepth + this.config.tide))) orthogonal = gradient;
    }
    const form = orthogonal !== undefined ? 'jet' : breakerForm(iribarren);
    if (form === 'roller') this.lipRollers += 1;
    if (form !== 'jet') return;
    if (!motion) {
      motion = crestMotion(solver, crest);
      if (!motion) return;
      height = this.breakingWaveHeight(crest, motion);
    }
    const shape = lipThrow({
      iribarren,
      slope,
      // The overturn fits' H0/h0: the incoming sea's height over the tank's offshore depth.
      nonlinearity: edgeHeight(this.config, this.tank.edgeDepth) / (this.tank.edgeDepth + this.config.tide),
      breakerHeight: height,
      windOverCelerity: (this.config.windSpeed ?? 0) / Math.sqrt(GRAVITY * stillDepth),
      width: solver.dx,
      reef: orthogonal !== undefined ? { orthogonalGradient: orthogonal, jetArea: LIP_JET[this.config.spot]?.jetArea } : undefined,
    });
    if (!shape) return;
    // The jet leaves the way the crest travels, measured from the crest's own motion, and outruns it
    // by the speed that flies it over its overturn's void (plan P7).
    const speed = motion.speed + shape.relativeSpeed;
    const along = motion.direction;
    // It keeps pouring from the crest until it lands, as measured jets do (Erinin et al. 2023).
    const thrown = this.lip.launch(
      crest, { x: along.x * speed, z: along.z * speed }, solver.surfaceAt(crest), shape.volume, motion.speed, tubeGeometry(shape.shape, height),
      jetFlightTime(shape.shape, height), height,
    );
    this.onThrow?.({
      asked: shape.volume, thrown, height, x, tube: tubeGeometry(shape.shape, height), vortexRatio: shape.reef?.vortexRatio, orthogonalGradient: orthogonal,
      speedOverCrest: speed / motion.speed,
    });
    if (thrown > 0) {
      this.lipLaunches += 1;
      this.lipJets += 1;
      this.lipVolume += thrown;
    }
  }

  /** The overturn scales with the wave the solver has: its crest over the trough half a wavelength ahead. */
  private breakingWaveHeight(crest: number, motion: CrestMotion): number {
    return waveHeightAt(this.solver, crest, 0.5 * motion.speed * this.config.peakPeriod);
  }

  /**
   * The gradient a breaking crest climbs, as Mead & Black (2001) measured it: along its travel, across the band
   * about its breaking depth (H / 0.78), over the window's own seabed (not the level strips at its open edges).
   */
  private orthogonalGradient(x: number, z: number, motion: CrestMotion, height: number): number {
    const { solver } = this;
    const { nx, nz, xCenters, zCenters, bed, dx } = solver;
    const [west, east] = [xCenters[OPEN_EDGE_REACH], xCenters[nx - 1 - OPEN_EDGE_REACH]];
    const [south, north] = [zCenters[0], zCenters[nz - 1]];
    const { direction } = motion;
    const depthAhead = (s: number) => {
      const px = x + s * direction.x;
      const pz = z + s * direction.z;
      return px < west || px > east || pz < south || pz > north ? Number.NaN : solver.restLevel - solver.sampleCentered(bed, px, pz);
    };
    return orthogonalGradient(depthAhead, height / BREAKER_INDEX, 0.5 * dx, REEF_PATH_REACH);
  }

  /** The flying tubes as a `tubeTable` (G9); returns how many. */
  writeTubes(into: Float32Array): number {
    return this.lip.writeTubes(into, TUBE_CAPACITY);
  }

  /** The width of the columns the lip throws in, m. */
  get tubeColumnWidth(): number {
    return this.solver.dx;
  }

  /** S3: the solver columns the roller's table spans (0 without a roller), the first one's centre x and their width, m. */
  get rollerColumns(): number {
    return this.roller ? this.solver.nx : 0;
  }

  get rollerColumn0(): number {
    return this.solver.xCenters[0];
  }

  get rollerColumnWidth(): number {
    return this.solver.dx;
  }

  /**
   * S3: the roller's table (`ROLLER_FIELD`, slot-major) as float32, for both looks to draw the band; returns its columns.
   * With the spilling lip, the copy's band waits for each curl to land and grows down from its landing line (the felt
   * table is never touched). With `look` (`BAND_LOOK_STRIDE` floats per slot and column), each entry's time since its
   * curl landed and its wave's H, for the roller front (drawn only; left as it is without the lip).
   */
  writeRoller(into: Float32Array, look?: Float32Array): number {
    if (!this.roller) return 0;
    into.set(this.roller.table);
    if (this.curl) {
      this.curl.drawBand(into, this.spilling!, this.roller, this.solver.time, look && look.length > 0 ? look : undefined);
      // Its drawn band frays at its ends along the crest as the drawn whitewater does (the foam look, item 4a), its
      // peel-side end, where the lip lands, only a column while young (the Canyon lip, round 5).
      if (this.spilling!.options.drawnEdges) {
        frayBand(into, ROLLER_SLOTS, this.solver.nx, ROLLER_STRIDE, ROLLER_FIELD.scale, this.solver.time,
          { direction: this.spilling!.options.direction, age: this.curl.bandAge, young: this.curl.span,
            ...(this.spilling!.options.groups?.length ? { directions: this.curl.bandDirection } : {}) });
      }
    }
    return this.solver.nx;
  }

  /**
   * The roller front's toe line for the drawn spray (the Canyon roller front): the roller's drawn table and its look, as
   * `writeRoller` writes them for this step (once a step, however often it is asked), its columns and their place; none
   * without the spilling lip or with `rollerFront` off. Drawn only: it reads the felt table and writes a copy.
   */
  rollerToes(): RollerToes | undefined {
    if (!this.roller || !this.curl || this.config.rollerFront === false) return undefined;
    const nx = this.solver.nx;
    let toes = this.toes;
    if (!toes) {
      toes = {
        table: new Float32Array(ROLLER_SLOTS * nx * ROLLER_STRIDE), look: new Float32Array(ROLLER_SLOTS * nx * BAND_LOOK_STRIDE),
        columns: nx, column0: this.solver.xCenters[0], width: this.solver.dx, time: Number.NaN,
      };
      this.toes = toes;
    }
    if (toes.time !== this.solver.time) {
      this.writeRoller(toes.table, toes.look);
      toes.time = this.solver.time;
    }
    return toes;
  }

  /**
   * The spilling lip's splashes where curls landed this step (`LipImpact`s): for the drawn spray only. They are not in
   * `lipImpacts`, which the sound and the reports read, and nothing of them reaches the water, the foam or the air.
   */
  get drawnImpacts(): readonly LipImpact[] {
    return this.curl?.splashes ?? NO_IMPACTS;
  }

  /** The spilling lip's curls as drawn (`CURL_FIELD`), at most `CURL_CAPACITY`; returns how many (none without it). */
  writeCurls(into: Float32Array): number {
    return this.curl ? this.curl.writeCurls(into, this.spilling!, this.drawnHeight) : 0;
  }

  /** The surface as drawn, for the curls' crests. */
  private readonly drawnHeight = (x: number, z: number): number => this.heightAt(x, z);

  /** Water surface elevation, m, with any roller lens's top (S3); on dry land this is the bed. */
  heightAt(x: number, z: number): number {
    const surface = this.solver.sampleCentered(this.solver.h, x, z) + this.bedAt(x, z);
    return this.lip.carve(x, z, this.roller ? surface + this.roller.riseAt(x, z) : surface);
  }

  bedAt(x: number, z: number): number {
    return this.solver.sampleCentered(this.solver.bed, x, z);
  }

  /** Uniform render grid covering the window and the whole tank. */
  renderGrid(spacing: number): RenderGrid {
    const width = this.solver.nx * this.solver.dx;
    return {
      xMin: this.windowXMin,
      zMin: this.tank.offshore,
      spacing,
      nx: Math.round(width / spacing) + 1,
      nz: Math.round((this.tank.shore - this.tank.offshore) / spacing) + 1,
    };
  }

  /**
   * Resample the water to interleaved (height, foam) per render node. Dry nodes
   * sit 5 cm under the bed so the seabed mesh hides them. Foam is the foam
   * field's covered fraction. Under a flying lip the surface drops to its
   * void's floor, unless `carve` is false (the snapshot's raw heights, G9: the
   * page carves them from the tube table).
   */
  writeUniformSurface(data: Float32Array, grid: RenderGrid, carve = true): void {
    this.writeUniformFields(grid, data);
    if (carve) carveGrid(data, grid, this.lip.tubeTable, this.lip.tubeCount, this.solver.dx);
  }

  /**
   * The worker's three visual fields share the same interpolation and one pass over the render nodes. A roller's lens
   * tops (S3) follow in a pass of their own over the rows they reach, asked only where `SpillingRoller.reachAt` puts a
   * lens: the main pass then calls nothing per node (the M1 CPU study, 2026-10-19). The arithmetic is unchanged.
   */
  writeUniformSnapshot(surface: Float32Array, flow: Float32Array, aeration: Float32Array, grid: RenderGrid): void {
    const { columns, columnWeights, rows, rowWeights } = this.mappingFor(grid);
    const { h, bed, qx, qz, nx, nz } = this.solver;
    const { dense, residual } = this.foam;
    const { air, depth: plume } = this.aeration;
    if (!this.velocityX || this.velocityX.length !== h.length) {
      this.velocityX = new Float64Array(h.length);
      this.velocityZ = new Float64Array(h.length);
    }
    if (!this.voidFractions || this.voidFractions.length !== h.length) this.voidFractions = new Float64Array(h.length);
    if (!this.foamCover || this.foamCover.length !== h.length) this.foamCover = new Float64Array(h.length);
    if (!this.snapshotRows || this.snapshotRows.length !== nz) this.snapshotRows = new Uint8Array(nz);
    const u = this.velocityX;
    const w = this.velocityZ!;
    const fraction = this.voidFractions;
    const cover = this.foamCover;
    const held = this.snapshotRows;
    const { curl } = this;
    // Row by row, so a cell's column is at hand (canyon-perf, 2026-10-29): the same arithmetic as before, without a call
    // or a remainder per cell, and each cell's foam cover (dense + lace) summed once for the nodes that read it. Each row
    // also notes whether it holds any foam (FOAMED) or any air or plume (AIRED): a node whose four cells hold none gets
    // the +0 their weighted sum would give, without reading them.
    for (let iz = 0; iz < nz; iz += 1) {
      const start = iz * nx;
      let foamed = 0;
      let aired = 0;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = start + ix;
        const water = h[i];
        const wet = water > WET;
        u[i] = wet ? qx[i] / water : 0;
        w[i] = wet ? qz[i] / water : 0;
        const foam = dense[i] + residual[i];
        cover[i] = foam;
        // The plume's void fraction (`AerationField.voidFraction`).
        const reach = plume[i];
        const share = reach > 0 ? Math.min(1, air[i] / reach) : 0;
        // With the spilling lip, a young curl's column draws its air where the drawn whitewater is: none before it lands.
        const void_ = curl ? share * curl.airShareAt(ix, i, foam) : share;
        fraction[i] = void_;
        if (foam !== 0) foamed = FOAMED;
        if (void_ !== 0 || reach !== 0) aired = AIRED;
      }
      held[iz] = foamed | aired;
    }
    const nodes = grid.nx;
    const lines = grid.nz;
    for (let r = 0; r < lines; r += 1) {
      const row = rows[r] * nx;
      const tz = rowWeights[r];
      const line = r * nodes;
      const rowsHeld = held[rows[r]] | held[rows[r] + 1];
      const foamed = (rowsHeld & FOAMED) !== 0;
      const aired = (rowsHeld & AIRED) !== 0;
      for (let c = 0; c < nodes; c += 1) {
        const i = row + columns[c];
        const j = i + nx;
        const tx = columnWeights[c];
        const w00 = (1 - tx) * (1 - tz);
        const w10 = tx * (1 - tz);
        const w01 = (1 - tx) * tz;
        const w11 = tx * tz;
        const o = (line + c) * 2;
        const depth = h[i] * w00 + h[i + 1] * w10 + h[j] * w01 + h[j + 1] * w11;
        const bottom = bed[i] * w00 + bed[i + 1] * w10 + bed[j] * w01 + bed[j + 1] * w11;
        if (depth > WET) {
          surface[o] = depth + bottom;
          surface[o + 1] = foamed ? cover[i] * w00 + cover[i + 1] * w10 + cover[j] * w01 + cover[j + 1] * w11 : 0;
          flow[o] = u[i] * w00 + u[i + 1] * w10 + u[j] * w01 + u[j + 1] * w11;
          flow[o + 1] = w[i] * w00 + w[i + 1] * w10 + w[j] * w01 + w[j + 1] * w11;
        } else {
          surface[o] = bottom - 0.05;
          surface[o + 1] = 0;
          flow[o] = 0;
          flow[o + 1] = 0;
        }
        if (aired) {
          aeration[o] = w00 * fraction[i] + w10 * fraction[i + 1] + w01 * fraction[j] + w11 * fraction[j + 1];
          aeration[o + 1] = w00 * plume[i] + w10 * plume[i + 1] + w01 * plume[j] + w11 * plume[j + 1];
        } else {
          aeration[o] = 0;
          aeration[o + 1] = 0;
        }
      }
    }
    this.writeLensTops(surface, grid);
  }

  /**
   * A roller lens's top (S3) over the wet render nodes it covers: what is drawn is what the rider hits
   * (`PhysicalSurfWater`'s node heights). Where `riseAt` finds no lens it adds 0, which leaves the main pass's height.
   */
  private writeLensTops(surface: Float32Array, grid: RenderGrid): void {
    const { roller } = this;
    const lenses = this.rollerReach();
    if (!roller || !(lenses.low <= lenses.high)) return;
    const { columns, columnWeights, rows, rowWeights } = this.mappingFor(grid);
    const { h, bed, nx } = this.solver;
    const nodes = grid.nx;
    if (!this.lensLow || this.lensLow.length !== nodes) {
      this.lensLow = new Float64Array(nodes);
      this.lensHigh = new Float64Array(nodes);
    }
    const low = this.lensLow;
    const high = this.lensHigh!;
    const reach = { low: 0, high: 0 };
    for (let c = 0; c < nodes; c += 1) {
      roller.reachAt(grid.xMin + c * grid.spacing, reach);
      low[c] = reach.low;
      high[c] = reach.high;
    }
    for (let r = 0; r < grid.nz; r += 1) {
      const z = grid.zMin + r * grid.spacing;
      if (!(z >= lenses.low && z <= lenses.high)) continue;
      const row = rows[r] * nx;
      const tz = rowWeights[r];
      for (let c = 0; c < nodes; c += 1) {
        if (!(z >= low[c] && z <= high[c])) continue;
        const i = row + columns[c];
        const tx = columnWeights[c];
        const w00 = (1 - tx) * (1 - tz);
        const w10 = tx * (1 - tz);
        const w01 = (1 - tx) * tz;
        const w11 = tx * tz;
        const depth = h[i] * w00 + h[i + 1] * w10 + h[i + nx] * w01 + h[i + nx + 1] * w11;
        if (!(depth > WET)) continue;
        const bottom = bed[i] * w00 + bed[i + 1] * w10 + bed[i + nx] * w01 + bed[i + nx + 1] * w11;
        surface[(r * nodes + c) * 2] = depth + bottom + roller.riseAt(grid.xMin + c * grid.spacing, z);
      }
    }
  }

  /** G9: every breaking bore drives air in by its dissipation, spilling shallower than a plunge. */
  private aerateBores(dt: number): void {
    const { h, bed, restLevel } = this.solver;
    // An open tube's water is clear until its lip lands (PR 5; the advisor's ruling 9b).
    const strength = this.whitewaterStrength;
    const { breakingCells, breakingCount, dissipation } = this.foam;
    for (let n = 0; n < breakingCount; n += 1) {
      const i = breakingCells[n];
      const still = restLevel - bed[i];
      if (dissipation[i] > 0) this.aeration.addBore(i, dissipation[i], h[i] - still, dt);
      // The wipeout spec, Part B: breaking stirs the water's turbulence.
      this.aeration.stir(i, strength[i], dt);
    }
  }

  /** G9: resample the aeration to interleaved (void fraction, plume depth, m) per render node; 0 on dry nodes. */
  writeUniformAeration(data: Float32Array, grid: RenderGrid): void {
    this.writeUniformFields(grid, undefined, undefined, data);
  }

  /** Resample the depth-averaged current to interleaved (u, w) per render node, m/s; 0 on dry nodes. */
  writeUniformFlow(data: Float32Array, grid: RenderGrid): void {
    this.writeUniformFields(grid, undefined, data);
  }

  private writeUniformFields(grid: RenderGrid, surface?: Float32Array, flow?: Float32Array, aeration?: Float32Array): void {
    const { columns, columnWeights, rows, rowWeights } = this.mappingFor(grid);
    const { h, bed, qx, qz, nx } = this.solver;
    const { dense, residual } = this.foam;
    const plume = this.aeration.depth;
    if (flow && (!this.velocityX || this.velocityX.length !== h.length)) {
      this.velocityX = new Float64Array(h.length);
      this.velocityZ = new Float64Array(h.length);
    }
    if (aeration && (!this.voidFractions || this.voidFractions.length !== h.length)) this.voidFractions = new Float64Array(h.length);
    const u = this.velocityX;
    const w = this.velocityZ;
    const fraction = this.voidFractions;
    if (flow || aeration) {
      for (let i = 0; i < h.length; i += 1) {
        if (flow) {
          const wet = h[i] > WET;
          u![i] = wet ? qx[i] / h[i] : 0;
          w![i] = wet ? qz[i] / h[i] : 0;
        }
        if (aeration) fraction![i] = this.curl ? this.aeration.voidFraction(i) * this.curl.airShare(i, dense[i] + residual[i]) : this.aeration.voidFraction(i);
      }
    }
    const { roller } = this;
    const lenses = this.rollerReach();
    for (let r = 0; r < grid.nz; r += 1) {
      const row = rows[r] * nx;
      const tz = rowWeights[r];
      const z = grid.zMin + r * grid.spacing;
      const lensRow = surface !== undefined && z >= lenses.low && z <= lenses.high;
      for (let c = 0; c < grid.nx; c += 1) {
        const i = row + columns[c];
        const tx = columnWeights[c];
        const w00 = (1 - tx) * (1 - tz);
        const w10 = tx * (1 - tz);
        const w01 = (1 - tx) * tz;
        const w11 = tx * tz;
        const o = (r * grid.nx + c) * 2;
        const depth = surface || flow ? h[i] * w00 + h[i + 1] * w10 + h[i + nx] * w01 + h[i + nx + 1] * w11 : 0;
        if (surface) {
          const bottom = bed[i] * w00 + bed[i + 1] * w10 + bed[i + nx] * w01 + bed[i + nx + 1] * w11;
          surface[o] = depth > WET ? depth + bottom : bottom - 0.05;
          if (lensRow && depth > WET) surface[o] = depth + bottom + roller!.riseAt(grid.xMin + c * grid.spacing, z);
          surface[o + 1] = depth > WET ? (dense[i] + residual[i]) * w00 + (dense[i + 1] + residual[i + 1]) * w10
            + (dense[i + nx] + residual[i + nx]) * w01 + (dense[i + nx + 1] + residual[i + nx + 1]) * w11 : 0;
        }
        if (flow) {
          flow[o] = depth > WET ? u![i] * w00 + u![i + 1] * w10 + u![i + nx] * w01 + u![i + nx + 1] * w11 : 0;
          flow[o + 1] = depth > WET ? w![i] * w00 + w![i + 1] * w10 + w![i + nx] * w01 + w![i + nx + 1] * w11 : 0;
        }
        if (aeration) {
          aeration[o] = w00 * fraction![i] + w10 * fraction![i + 1] + w01 * fraction![i + nx] + w11 * fraction![i + nx + 1];
          aeration[o + 1] = w00 * plume[i] + w10 * plume[i + 1] + w01 * plume[i + nx] + w11 * plume[i + nx + 1];
        }
      }
    }
  }

  /** The roller's lenses' reach across shore for a pass over the render nodes; none without a roller. */
  private rollerReach(): { low: number; high: number } {
    const reach = this.rollerExtent;
    if (this.roller) return this.roller.extentZ(reach);
    reach.low = Number.POSITIVE_INFINITY;
    reach.high = Number.NEGATIVE_INFINITY;
    return reach;
  }

  /** Resample the bed elevation to one value per render node, with the same interpolation as `writeUniformSurface`. */
  writeUniformBed(data: Float32Array, grid: RenderGrid): void {
    const { columns, columnWeights, rows, rowWeights } = this.mappingFor(grid);
    const { bed, nx } = this.solver;
    for (let r = 0; r < grid.nz; r += 1) {
      const row = rows[r] * nx;
      const tz = rowWeights[r];
      for (let c = 0; c < grid.nx; c += 1) {
        const i = row + columns[c];
        const tx = columnWeights[c];
        data[r * grid.nx + c] = (bed[i] * (1 - tx) + bed[i + 1] * tx) * (1 - tz) + (bed[i + nx] * (1 - tx) + bed[i + nx + 1] * tx) * tz;
      }
    }
  }

  /** The take-off: where the break line crosses the spot's take-off transect (see `takeOffPoint`), the camera's break focus. */
  breakPoint(): { x: number; z: number } {
    this.takeOff ??= takeOffPoint(this.config);
    return { ...this.takeOff };
  }

  private mappingFor(grid: RenderGrid) {
    const { solver } = this;
    let mapping = this.mapping;
    if (!mapping || mapping.grid.nx !== grid.nx || mapping.grid.nz !== grid.nz
      || mapping.grid.spacing !== grid.spacing || mapping.grid.zMin !== grid.zMin) {
      const rows = new Int32Array(grid.nz);
      const rowWeights = new Float64Array(grid.nz);
      for (let r = 0; r < grid.nz; r += 1) {
        const z = grid.zMin + r * grid.spacing;
        const iz = solver.rowBelow(z);
        rows[r] = iz;
        rowWeights[r] = Math.min(1, Math.max(0, (z - solver.zCenters[iz]) / (solver.zCenters[iz + 1] - solver.zCenters[iz])));
      }
      mapping = {
        grid: { ...grid }, xMin: Number.NaN, columns: new Int32Array(grid.nx), columnWeights: new Float64Array(grid.nx), rows, rowWeights,
      };
      this.mapping = mapping;
    }
    if (mapping.xMin !== grid.xMin) {
      for (let c = 0; c < grid.nx; c += 1) {
        const gx = Math.min(solver.nx - 1, Math.max(0, (grid.xMin + c * grid.spacing - solver.xCenters[0]) / solver.dx));
        const ix = Math.min(solver.nx - 2, Math.floor(gx));
        mapping.columns[c] = ix;
        mapping.columnWeights[c] = gx - ix;
      }
      mapping.xMin = grid.xMin;
    }
    return mapping;
  }
}
