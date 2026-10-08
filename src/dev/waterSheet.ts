/**
 * Dev tool (`?inpage&waterSheet`, G8): runs the Point's practice groundswell to
 * a breaking wave, holds it, and renders fixed shots (lineup, face, bore,
 * horizon, below) in both water looks under each time of day, as one sheet of
 * tiles. It steps and renders on its own, like the ride recorder.
 * `&whitewater` (G9) holds on a collapsing tube's foam ball instead, at the
 * Reef or the Beach (`&spot=beach`), and shoots its whitewater.
 * `&compute=gpu` (or `auto`) steps the sea in the game's worker, on the GPU as
 * an M4 player's does (the GPU tier's 64-component sea); `cpu`, the default,
 * steps it in the page as before.
 * `&swell=small|medium|big` runs the spot's own swell of that size in place of the practice groundswell.
 */
import { PerspectiveCamera, Vector3, type Color } from 'three';
import { DEFAULT_PHYSICAL_SETTINGS, GPU_TIER_COMPONENTS, type PhysicalMode, type PhysicalSettings } from '../game/PhysicalMode';
import { swellChoice, type TimeOfDay } from '../game/SurfConditions';
import type { WaterLook } from '../scene/water/waterLook';
import { sampleSurfaceHeight, type WaterSurface } from '../scene/WaterSurface';
import { tubeFloorDepth } from '../wave/Overturn';
import { SPRAY_STRIDE } from '../wave/SprayCloud';
import { SEA_COMPONENTS, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { LANDMARK } from '../wave/barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES } from '../wave/barrel/sweptLoft';
import { TUBE_STRIDE } from '../wave/tubeTable';
import { advance, breathe } from './devStepping';

interface SheetHooks {
  start(settings: PhysicalSettings, overrides?: Partial<SurfZoneConfig>): Promise<void>;
  step(input: { paddle: boolean; popUp: boolean; steer: number }): void;
  render(seconds: number): void;
  resize(width: number, height: number): void;
  mode: PhysicalMode;
  canvas: HTMLCanvasElement;
  setWaterLook(look: WaterLook): void;
  setTimeOfDay(time: TimeOfDay): Promise<void>;
  setSun(sun: { sunHeight: number; sunDirection: number }): Promise<void>;
  renderView(camera: PerspectiveCamera): void;
  water: WaterSurface;
}

const TIMES: readonly TimeOfDay[] = ['dawn', 'midday', 'sunset'];
const LOOKS: readonly WaterLook[] = ['classic', 'rich'];
const RENDER = { width: 1280, height: 720 };
const TILE = { width: 320, height: 180 };
const STEP = 1 / 60;
/** The sheet holds the sea once a face this steep stands within 40 m of the break, after at least MIN_SETTLE, s. */
const MIN_SETTLE = 30;
const MAX_SETTLE = 150;
const FACE_SLOPE = 0.35;
/** Where the finished sheet is posted as a PNG (`npm run record:ride` runs the receiver), so it can be read without the page on screen. */
const RECEIVER = new URLSearchParams(window.location.search).get('receiver') ?? 'http://localhost:5199';

interface Shot { name: string; eye: Vector3; target: Vector3 }

const PARAMETERS = new URLSearchParams(window.location.search);
/** `?waterSheet&spot=reef` or `padang` (G9): the practice Reef or Padang Padang, held on an open tube, with tube shots in place of the face and bore. */
const SPOT = (['reef', 'beach', 'padang', 'canyon', 'pool'] as const).find((spot) => spot === PARAMETERS.get('spot')) ?? 'point';
/**
 * `&direction=<degrees>&spreading=<s>`: the swell's direction and cos-2s spreading in place of the settings' (the Canyon's
 * spilling prototype runs a square, narrow groundswell: `&spot=canyon&swell=medium&direction=0&spreading=150`),
 * `&spillingFront=0` turns its spilling front off, `&roller=0` its roller lens (S3), and `&rollerMask=solver` draws and
 * feels the lens wherever the solver breaks rather than behind the visible front.
 */
const SWELL_OVERRIDES: Partial<SurfZoneConfig> = {
  ...(PARAMETERS.has('direction') ? { directionDegrees: Number(PARAMETERS.get('direction')) } : {}),
  ...(PARAMETERS.has('spreading') ? { spreading: Number(PARAMETERS.get('spreading')) } : {}),
  // `&spillingFront=0`: a spilling spot's foam is the solver's own breaking, without its spilling front (before and after).
  ...(PARAMETERS.get('spillingFront') === '0' ? { spillingFront: false } : {}),
  // `&roller=0`: no roller lens on a spilling spot's broken faces (the P11 push instead); `&rollerMask=solver|front`.
  ...(PARAMETERS.get('roller') === '0' ? { roller: false } : {}),
  ...(PARAMETERS.get('rollerMask') === 'solver' || PARAMETERS.get('rollerMask') === 'front'
    ? { rollerMask: PARAMETERS.get('rollerMask') as 'solver' | 'front' } : {}),
};
/** `&swell=small|medium|big`: the spot's own swell of that size, in place of the practice groundswell. */
const SWELL = (['small', 'medium', 'big'] as const).find((size) => size === PARAMETERS.get('swell'));
/** Reef breaks: the sheet holds them on an open tube. */
const TUBE_SPOT = SPOT === 'reef' || SPOT === 'padang';
/** Padang Padang draws the swept barrel (Part B): its sheet holds on the swept curl, not the old lip's tube. */
const SWEPT_SPOT = SPOT === 'padang';
/** `&whitewater` (G9): hold on a collapsing tube's foam ball, and shoot its whitewater in place of the face and bore. */
const WHITEWATER = PARAMETERS.has('whitewater');
/** `&compute=gpu|auto`: the sea steps in the game's worker, on its GPU tier (main.ts leaves `inpage` for it); `cpu` in the page. */
const COMPUTE = PARAMETERS.get('compute') === 'gpu' ? 'gpu' : PARAMETERS.get('compute') === 'auto' ? 'auto' : 'cpu';
/**
 * The sea's components (`&components=`). On the GPU it is the GPU tier's rich sea, as an M4 on High plays it, whatever
 * this page's own graphics preset would pick; in the page, the page's sea as before.
 */
const COMPONENTS = Number(PARAMETERS.get('components')) || (COMPUTE === 'cpu' ? undefined : GPU_TIER_COMPONENTS);

/** The whitewater sheet holds once this many foam-ball sprites tumble in the snapshot. */
const FOAM_BALL_HOLD = 8;

/** Where the snapshot's foam balls tumble: their centroid, and how many. */
function foamBall(mode: PhysicalMode): { centre: Vector3; count: number } | undefined {
  const snapshot = mode.host?.snapshot;
  if (!snapshot) return undefined;
  const centre = new Vector3();
  let count = 0;
  for (let k = 0; k < snapshot.sprayCount; k += 1) {
    const o = k * SPRAY_STRIDE;
    if (snapshot.spray[o + 5] !== 2) continue;
    centre.x += snapshot.spray[o];
    centre.y += snapshot.spray[o + 1];
    centre.z += snapshot.spray[o + 2];
    count += 1;
  }
  return count > 0 ? { centre: centre.divideScalar(count), count } : undefined;
}

/**
 * Shots of a collapsing tube's whitewater (waves run toward +z): beside it
 * along the crest, from the shoulder at the water, from behind the wave, and
 * from under the water looking up through the bubble plume.
 */
function whitewaterShots(water: WaterSurface, ball: Vector3): Shot[] {
  const surface = sampleSurfaceHeight(water.surfaceData, water.grid, ball.x, ball.z);
  return [
    { name: 'ww-beside', eye: new Vector3(ball.x + 7, ball.y + 2.5, ball.z + 4), target: ball.clone() },
    { name: 'ww-shoulder', eye: new Vector3(ball.x - 10, surface + 1, ball.z + 1), target: ball.clone() },
    { name: 'ww-behind', eye: new Vector3(ball.x + 2, ball.y + 4, ball.z - 12), target: ball.clone() },
    { name: 'ww-below', eye: new Vector3(ball.x + 3, surface - 1.8, ball.z + 3), target: new Vector3(ball.x, surface - 0.3, ball.z) },
  ];
}
/** The Reef sheet holds once a tube is open this far ahead of its crest, m. */
const TUBE_OPEN = 0.8;
/** Padang Padang's sheet holds once the swept curl is open over this much crest, m (the checklist's 3–10 m). */
const CURL_OPEN = 3;

/** The swept barrel's longest open run (Padang Padang, Part B): its slices, middle slice and length along the crest, m. */
interface OpenCurl { first: number; last: number; middle: number; length: number; shoulder: 1 | -1 }

/** The drawn loft's longest run of joined, standing, open slices on one front; the shoulder is the side whose clocks are younger. */
function openCurl(mode: PhysicalMode): OpenCurl | undefined {
  const loft = mode.barrelLoft;
  if (!loft) return undefined;
  let best: OpenCurl | undefined;
  let first = -1;
  const close = (last: number) => {
    if (first < 0) return;
    const length = loft.sliceSigma[last] - loft.sliceSigma[first];
    if (!best || length > best.length) {
      // Younger (smaller τ) slices lie toward the shoulder, the way it peels.
      const shoulder = loft.sliceTau[first] < loft.sliceTau[last] ? -1 : 1;
      best = { first, last, middle: Math.round((first + last) / 2), length, shoulder };
    }
    first = -1;
  };
  for (let s = 0; s < loft.sliceCount; s += 1) {
    const open = loft.slicePhase[s] === 1 && loft.sliceWeight[s] >= 0.5;
    const continues = first >= 0 && loft.sliceFront[s] === loft.sliceFront[first] && loft.sliceJoined[s - 1] === 1;
    if (first >= 0 && (!open || !continues)) close(s - 1);
    if (open && first < 0) first = s;
  }
  close(loft.sliceCount - 1);
  return best;
}

/** A landmark of a loft slice, in the world. */
function landmark(mode: PhysicalMode, slice: number, index: number): Vector3 {
  const loft = mode.barrelLoft!;
  const v = 3 * (slice * LOFT_SAMPLES + LOFT.extensionSamples + index);
  return new Vector3(loft.positions[v], loft.positions[v + 1], loft.positions[v + 2]);
}

/**
 * Shots of the swept curl's middle open slice: from the channel (down the line on the shoulder side, in front of the
 * face, looking back into the tube), square on from in front of the face, from behind the wave, and inside the tube at
 * half its height looking out along the crest toward the shoulder.
 */
function curlShots(mode: PhysicalMode, curl: OpenCurl): Shot[] {
  const loft = mode.barrelLoft!;
  const [rx, rz] = [loft.sliceRayX[curl.middle], loft.sliceRayZ[curl.middle]];
  // Along the crest toward the shoulder: the front's tangent (the ray turned back a right angle), signed.
  const [sx, sz] = [rz * curl.shoulder, -rx * curl.shoulder];
  const crest = landmark(mode, curl.middle, LANDMARK.crest);
  const tip = landmark(mode, curl.middle, LANDMARK.lip);
  const throat = landmark(mode, curl.middle, LANDMARK.throat);
  const toe = landmark(mode, curl.middle, LANDMARK.toe);
  const mouth = tip.clone().add(throat).multiplyScalar(0.5);
  const inside = new Vector3((throat.x + toe.x) / 2, (throat.y + toe.y) / 2, (throat.z + toe.z) / 2).lerp(mouth, 0.3);
  return [
    { name: 'curl-channel', eye: new Vector3(tip.x + sx * 14 + rx * 6, crest.y - 0.5, tip.z + sz * 14 + rz * 6), target: mouth },
    { name: 'curl-close', eye: new Vector3(tip.x + sx * 7 + rx * 3, crest.y - 0.3, tip.z + sz * 7 + rz * 3), target: mouth },
    { name: 'curl-front', eye: new Vector3(crest.x + rx * 12 + sx * 2, crest.y - 0.5, crest.z + rz * 12 + sz * 2), target: mouth },
    { name: 'curl-behind', eye: new Vector3(crest.x - rx * 9 + sx * 5, crest.y + 3, crest.z - rz * 9 + sz * 5), target: tip },
    { name: 'curl-inside', eye: inside, target: new Vector3(inside.x + sx * 8, inside.y, inside.z + sz * 8) },
  ];
}

/** The most open flying tube in the snapshot: its row and how far its void reaches ahead of the crest, m. */
function openTube(mode: PhysicalMode): { row: number; reach: number } | undefined {
  const snapshot = mode.host?.snapshot;
  if (!snapshot) return undefined;
  let best: { row: number; reach: number } | undefined;
  for (let row = 0; row < snapshot.tubeCount; row += 1) {
    const t = snapshot.tubes;
    const o = row * TUBE_STRIDE;
    const reach = Math.min(t[o + 5], t[o + 6] * t[o + 10] * Math.cos(t[o + 8]));
    if (!best || reach > best.reach) best = { row, reach };
  }
  return best;
}

/**
 * Shots of one tube: beside it, from its shoulder looking in, and inside at
 * eye height above its floor, looking out of its mouth. The shoulder is the
 * side whose neighbouring tubes are younger (less open): the way it peels.
 */
function tubeShots(mode: PhysicalMode, tube: { row: number; reach: number }): Shot[] {
  const t = mode.host!.snapshot.tubes;
  const count = mode.host!.snapshot.tubeCount;
  const o = tube.row * TUBE_STRIDE;
  const [crestX, crestZ, y, dirX, dirZ] = [t[o], t[o + 1], t[o + 2], t[o + 3], t[o + 4]];
  const column = t[o + 9];
  let younger = 0;
  for (let row = 0; row < count; row += 1) {
    const offset = t[row * TUBE_STRIDE + 9] - column;
    if (offset !== 0 && Math.abs(offset) <= 3) younger += Math.sign(offset) * (t[o + 5] - t[row * TUBE_STRIDE + 5]);
  }
  // Along the crest, toward the unbroken shoulder.
  const side = younger >= 0 ? 1 : -1;
  const [sx, sz] = [-dirZ * side, dirX * side];
  const ahead = tube.reach / 2;
  const floor = y - tubeFloorDepth({ length: t[o + 6] * t[o + 10], width: t[o + 7] * t[o + 10], tilt: t[o + 8] }, ahead);
  const [mx, mz] = [crestX + dirX * ahead, crestZ + dirZ * ahead];
  const middle = (floor + y) / 2;
  return [
    { name: 'tube-beside', eye: new Vector3(mx + sx * 6 + dirX * 2, y + 1.5, mz + sz * 6 + dirZ * 2), target: new Vector3(mx, middle, mz) },
    { name: 'tube-shoulder', eye: new Vector3(mx + sx * 8, y + 0.5, mz + sz * 8), target: new Vector3(mx - sx * 4, middle, mz - sz * 4) },
    { name: 'tube-inside', eye: new Vector3(mx - sx * 1.5, floor + 0.6, mz - sz * 1.5), target: new Vector3(mx + sx * 6, floor + 0.6, mz + sz * 6) },
  ];
}

/** The steepest node within 40 m of the break: where a face stands. */
function steepestFace(water: WaterSurface, focus: { x: number; z: number }): { x: number; z: number; height: number; slope: number } {
  const { grid } = water;
  let best = { x: focus.x, z: focus.z, height: 0, slope: -1 };
  for (let j = 1; j < grid.nz - 1; j += 1) {
    for (let i = 1; i < grid.nx - 1; i += 1) {
      const here = node(water, i, j);
      if (Math.hypot(here.x - focus.x, here.z - focus.z) > 40) continue;
      const slope = Math.hypot(node(water, i + 1, j).height - node(water, i - 1, j).height, node(water, i, j + 1).height - node(water, i, j - 1).height) / (2 * grid.spacing);
      if (slope > best.slope) best = { x: here.x, z: here.z, height: here.height, slope };
    }
  }
  return best;
}

/** Height and foam at a render node. */
function node(water: WaterSurface, i: number, j: number): { height: number; foam: number; x: number; z: number } {
  const { grid, surfaceData } = water;
  const k = (j * grid.nx + i) * 2;
  return { height: surfaceData[k], foam: surfaceData[k + 1], x: grid.xMin + i * grid.spacing, z: grid.zMin + j * grid.spacing };
}

function findShots(water: WaterSurface, focus: { x: number; z: number }): Shot[] {
  const { grid } = water;
  const height = (x: number, z: number) => sampleSurfaceHeight(water.surfaceData, grid, x, z);
  const steepest = steepestFace(water, focus);
  const crestHeight = Math.max(steepest.height, height(steepest.x, steepest.z - 2), height(steepest.x, steepest.z - 4));
  // The bore: the fresh whitewater (foam ≥ 0.9) nearest the break, else the foamiest node within 40 m of it.
  let foamiest = { foam: -1, x: focus.x, z: focus.z, height: 0 };
  let fresh: typeof foamiest | undefined;
  let freshDistance = Infinity;
  for (let j = 1; j < grid.nz - 1; j += 1) {
    for (let i = 1; i < grid.nx - 1; i += 1) {
      const here = node(water, i, j);
      const distance = Math.hypot(here.x - focus.x, here.z - focus.z);
      if (here.foam >= 0.9 && distance < freshDistance) {
        freshDistance = distance;
        fresh = here;
      }
      if (distance <= 40 && here.foam > foamiest.foam) foamiest = here;
    }
  }
  if (fresh) foamiest = fresh;
  const lineupZ = focus.z - 25;
  const lineupHeight = height(focus.x, lineupZ);
  return [
    { name: 'lineup', eye: new Vector3(focus.x, lineupHeight + 1.6, lineupZ), target: new Vector3(focus.x + 30, lineupHeight, lineupZ - 4) },
    { name: 'face', eye: new Vector3(steepest.x + 3, crestHeight + 1.2, steepest.z + 10), target: new Vector3(steepest.x, steepest.height, steepest.z) },
    { name: 'bore', eye: new Vector3(foamiest.x + 12, foamiest.height + 3, foamiest.z + 4), target: new Vector3(foamiest.x, foamiest.height, foamiest.z) },
    { name: 'horizon', eye: new Vector3(focus.x, 14, focus.z), target: new Vector3(focus.x, 0, focus.z - 200) },
    { name: 'below', eye: new Vector3(focus.x, lineupHeight - 1.2, lineupZ), target: new Vector3(focus.x, lineupHeight - 1.2 + Math.tan((20 * Math.PI) / 180) * 10, lineupZ - 10) },
  ];
}

export async function renderWaterSheet(hooks: SheetHooks): Promise<void> {
  const status = document.createElement('div');
  status.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:1000;padding:6px 10px;background:#0d1117;color:#d6dde6;font:12px ui-monospace,monospace';
  status.textContent = 'Water sheet: settling the sea…';
  document.body.append(status);
  const compute = COMPUTE === 'cpu' ? 'cpu' : 'auto';
  const settings: PhysicalSettings = SWELL
    ? { ...DEFAULT_PHYSICAL_SETTINGS, ...swellChoice(SPOT, SWELL), spot: SPOT, source: 'buoy', compute }
    : { ...DEFAULT_PHYSICAL_SETTINGS, spot: SPOT, source: 'practice', compute };
  await hooks.start(settings, { ...(COMPONENTS ? { componentCount: COMPONENTS } : {}), ...SWELL_OVERRIDES });
  hooks.resize(RENDER.width, RENDER.height);
  const idle = { paddle: false, popUp: false, steer: 0 };
  let simulated = 0;
  /** Steps the sea until the spot's hold (after at least `least` s more), or MAX_SETTLE in all. */
  const settle = async (least: number) => {
    const until = simulated + least;
    while (simulated < MAX_SETTLE + until - MIN_SETTLE) {
      // A tube flies about a second: once settled, the Reef looks for one every 0.2 s.
      const chunk = (TUBE_SPOT || WHITEWATER) && simulated >= MIN_SETTLE ? 12 : 60;
      await advance(hooks, chunk, idle);
      simulated += chunk * STEP;
      if (simulated >= until) {
        hooks.render(0);
        const held = WHITEWATER
          ? (foamBall(hooks.mode)?.count ?? 0) >= FOAM_BALL_HOLD
          : SWEPT_SPOT ? (openCurl(hooks.mode)?.length ?? 0) >= CURL_OPEN
            : TUBE_SPOT ? (openTube(hooks.mode)?.reach ?? 0) >= TUBE_OPEN : steepestFace(hooks.water, hooks.mode.focus).slope >= FACE_SLOPE;
        if (held) break;
      }
      await breathe();
    }
    hooks.render(0);
  };
  await settle(MIN_SETTLE);
  const heldShots = () => {
    const curl = SWEPT_SPOT ? openCurl(hooks.mode) : undefined;
    const tube = TUBE_SPOT && !SWEPT_SPOT && !WHITEWATER ? openTube(hooks.mode) : undefined;
    const ball = WHITEWATER ? foamBall(hooks.mode) : undefined;
    const found = findShots(hooks.water, hooks.mode.focus).flatMap((shot) => {
      if (shot.name === 'face') {
        // Padang Padang's swept curl, when one is open at the hold (beside the whitewater's, with `&whitewater`).
        const curlOnes = curl ? curlShots(hooks.mode, curl) : [];
        return [...(ball ? whitewaterShots(hooks.water, ball.centre) : tube ? tubeShots(hooks.mode, tube) : curl ? [] : [shot]), ...curlOnes];
      }
      return (tube || ball || curl) && shot.name === 'bore' ? [] : [shot];
    });
    return { shots: found, curl, ball };
  };
  let held = heldShots();
  let { shots } = held;
  const { ball } = held;
  const sheet = document.createElement('canvas');
  sheet.width = TILE.width * TIMES.length * LOOKS.length;
  sheet.height = TILE.height * shots.length;
  sheet.style.cssText = 'position:fixed;top:28px;left:0;width:100%;z-index:999;background:#000';
  document.body.append(sheet);
  const context = sheet.getContext('2d')!;
  const camera = new PerspectiveCamera(55, RENDER.width / RENDER.height, 0.1, 3000);
  let column = 0;
  for (const time of TIMES) {
    await hooks.setTimeOfDay(time);
    for (const look of LOOKS) {
      hooks.setWaterLook(look);
      shots.forEach((shot, row) => {
        camera.position.copy(shot.eye);
        camera.lookAt(shot.target);
        camera.updateMatrixWorld();
        hooks.renderView(camera);
        context.drawImage(hooks.canvas, column * TILE.width, row * TILE.height, TILE.width, TILE.height);
        context.fillStyle = 'rgba(8, 24, 32, 0.6)';
        context.fillRect(column * TILE.width, row * TILE.height, 150, 16);
        context.fillStyle = '#e8f4f2';
        context.font = '11px ui-monospace, Menlo, monospace';
        context.fillText(`${look} · ${time} · ${shot.name}`, column * TILE.width + 4, row * TILE.height + 12);
      });
      column += 1;
    }
  }
  // Which tier stepped the sea: asked for the GPU and given the CPU (no WebGPU) must not pass for the GPU's water.
  const stepped = hooks.mode.host?.snapshot.status.compute ?? 'cpu';
  const tier = `water on the ${stepped.toUpperCase()}, ${hooks.mode.config?.componentCount ?? SEA_COMPONENTS} components${COMPUTE === 'gpu' && stepped !== 'gpu' ? ' (ASKED FOR THE GPU)' : ''}`;
  status.textContent = `Water sheet: ${SPOT} ${SWELL ?? 'practice'}${ball ? `, ${ball.count} foam-ball sprites` : ''}, ${simulated.toFixed(0)} s settled, ${tier} · columns ${TIMES.map((t) => LOOKS.map((l) => `${l} ${t}`).join(', ')).join(', ')} · rows ${shots.map((s) => s.name).join(', ')}`;
  const face = steepestFace(hooks.water, hooks.mode.focus);
  status.textContent += ` · face slope ${face.slope.toFixed(2)} · program ${hooks.water.mesh.material.customProgramCacheKey()}`;
  /** One shot at full size, posted as water-shot.png: for close checks from the console once the sheet is done. */
  const closeUp = document.createElement('canvas');
  closeUp.width = RENDER.width;
  closeUp.height = RENDER.height;
  type View = { eye: [number, number, number]; target: [number, number, number] };
  const waterSheetShot = async (name: string | View, look: WaterLook, time: TimeOfDay) => {
    const shot = typeof name === 'string'
      ? shots.find((candidate) => candidate.name === name)
      : { name: 'view', eye: new Vector3(...name.eye), target: new Vector3(...name.target) };
    if (!shot) return false;
    await hooks.setTimeOfDay(time);
    hooks.setWaterLook(look);
    camera.position.copy(shot.eye);
    camera.lookAt(shot.target);
    camera.updateMatrixWorld();
    hooks.renderView(camera);
    closeUp.getContext('2d')!.drawImage(hooks.canvas, 0, 0, RENDER.width, RENDER.height);
    await post(closeUp, 'water-shot.png');
    return true;
  };
  /**
   * One shot's render cost, ms per frame (median and 90th percentile): each
   * frame is drawn and then waited for with a one-pixel read, so the timing
   * holds even in a hidden page, where animation frames are throttled.
   */
  const waterSheetTime = async (name: string, look: WaterLook, frames = 120) => {
    const shot = shots.find((candidate) => candidate.name === name);
    const gl = hooks.canvas.getContext('webgl2');
    if (!shot || !gl) return undefined;
    hooks.setWaterLook(look);
    camera.position.copy(shot.eye);
    camera.lookAt(shot.target);
    camera.updateMatrixWorld();
    const pixel = new Uint8Array(4);
    const times: number[] = [];
    for (let k = 0; k < frames + 10; k += 1) {
      const start = performance.now();
      hooks.renderView(camera);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      if (k >= 10) times.push(performance.now() - start);
      if (k % 10 === 9) await breathe();
    }
    times.sort((a, b) => a - b);
    return { median: times[Math.floor(times.length / 2)], p90: times[Math.floor(times.length * 0.9)] };
  };
  /**
   * The held curl (Padang Padang): its open run, and the slices of its front as drawn (σ, τ, phase, weight), for
   * reading a still against the loft.
   */
  const waterSheetCurl = () => {
    const loft = hooks.mode.barrelLoft;
    const curl = held.curl;
    if (!loft || !curl) return undefined;
    const front = loft.sliceFront[curl.middle];
    const slices = [];
    for (let s = 0; s < loft.sliceCount; s += 1) {
      if (loft.sliceFront[s] !== front) continue;
      slices.push({ s, sigma: +loft.sliceSigma[s].toFixed(2), tau: +loft.sliceTau[s].toFixed(3), phase: loft.slicePhase[s], weight: +loft.sliceWeight[s].toFixed(2), joined: loft.sliceJoined[s] });
    }
    const fronts = new Set(Array.from(loft.sliceFront.subarray(0, loft.sliceCount)));
    return { ...curl, front, fronts: [...fronts], sliceCount: loft.sliceCount, slices };
  };
  /**
   * The curl's light against the face beside it (tube-colour-fix.md, "How to check it"), measured on screen from one
   * view: the lip (the loft's sheet), the tube's back wall (throat to toe of the open slices whose underside has
   * formed: the wall a lip covers) and the face beside them (the water's own pixels around them, and the curl's
   * shoulder face), each's mean relative luminance and hue, as drawn, with the sheet off, and as the owner's clip drew
   * it (the loft's own winding, no sheet).
   * `sun`: 'behind' puts the sun where the camera looks, behind the lip; 'front' behind the camera; or a time of day.
   * The regions come from a pass with the curl in its `region` view and one without the water; the marked frame is
   * posted as curl-luma.png.
   */
  const waterSheetCurlLuma = async (name: string | View, look: WaterLook, sun: 'behind' | 'front' | TimeOfDay = 'behind', height = 0.1) => {
    const shot = typeof name === 'string'
      ? shots.find((candidate) => candidate.name === name)
      : { name: 'view', eye: new Vector3(...name.eye), target: new Vector3(...name.target) };
    const mesh = hooks.mode.barrelMesh;
    const gl = hooks.canvas.getContext('webgl2');
    if (!shot || !mesh || !gl) return undefined;
    const forward = shot.target.clone().sub(shot.eye).setY(0).normalize();
    const toward = sun === 'behind' ? forward : sun === 'front' ? forward.clone().negate() : undefined;
    // An azimuth a puts the sun toward (sin a, −cos a) (PhotoSky's skyRotation).
    const lighting = toward ? { sunHeight: height, sunDirection: (Math.atan2(toward.x, -toward.z) * 180) / Math.PI } : undefined;
    for (let pass = 0; pass < 2; pass += 1) {
      if (lighting) await hooks.setSun(lighting);
      else await hooks.setTimeOfDay(sun as TimeOfDay);
      hooks.setWaterLook(look);
    }
    camera.position.copy(shot.eye);
    camera.lookAt(shot.target);
    camera.updateMatrixWorld();
    const { width, height: rows } = hooks.canvas;
    const frame = () => {
      hooks.renderView(camera);
      const pixels = new Uint8Array(width * rows * 4);
      gl.readPixels(0, 0, width, rows, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return pixels;
    };
    hooks.renderView(camera);
    const drawn = frame();
    const view = mesh.view;
    mesh.sheetShown = false;
    const before = frame();
    // As the owner's clip drew it: the loft's own winding, no sheet.
    mesh.facesOut = false;
    const owner = frame();
    mesh.facesOut = true;
    mesh.sheetShown = true;
    mesh.setView('region');
    const regions = frame();
    mesh.setView(view);
    const water = hooks.water.mesh;
    water.visible = false;
    const dry = frame();
    water.visible = true;
    // Foam: the pixels that change when the foam's colour does (the curl shares the water's uniforms).
    const foamColour = hooks.water.materialUniforms.waterFoamColor.value as Color;
    const foamWas = foamColour.clone();
    foamColour.setRGB(1, 0, 1);
    const foamed = frame();
    foamColour.copy(foamWas);
    hooks.renderView(camera);
    // Each curl pixel's region by the region pass's strongest channel; the water's own pixels where hiding it showed.
    const same = (a: Uint8Array, b: Uint8Array, k: number) => a[k] === b[k] && a[k + 1] === b[k + 1] && a[k + 2] === b[k + 2];
    const region = new Uint8Array(width * rows);
    const foam = new Uint8Array(width * rows);
    let x0 = width;
    let x1 = -1;
    let y0 = rows;
    let y1 = -1;
    for (let p = 0; p < width * rows; p += 1) {
      const k = 4 * p;
      foam[p] = Math.max(Math.abs(drawn[k] - foamed[k]), Math.abs(drawn[k + 1] - foamed[k + 1]), Math.abs(drawn[k + 2] - foamed[k + 2])) > 12 ? 1 : 0;
      if (!same(drawn, regions, k)) {
        const [r, g, b] = [regions[k], regions[k + 1], regions[k + 2]];
        // Red the lip, blue the back wall, yellow the shoulder's face, green the rest of the curl.
        region[p] = r > 2 * Math.max(g, b) ? 1 : b > 2 * Math.max(r, g) ? 2 : r > 2 * b && g > 2 * b ? 5 : 3;
        if (region[p] <= 2) {
          const [x, y] = [p % width, Math.floor(p / width)];
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
      } else if (!same(drawn, dry, k)) {
        region[p] = 4;
      }
    }
    // The face: the water's pixels around the lip and back wall, their box widened by half each way.
    const [wx, wy] = [(x1 - x0) / 2, (y1 - y0) / 2];
    const inBox = (p: number) => {
      const [x, y] = [p % width, Math.floor(p / width)];
      return x >= x0 - wx && x <= x1 + wx && y >= y0 - wy && y <= y1 + wy;
    };
    const linear = (c: number) => {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    /** A region's mean luminance and hue; `clear`: its foam-free pixels only. */
    const stats = (pixels: Uint8Array, wanted: number, clear = false) => {
      let n = 0;
      let luma = 0;
      const sum = [0, 0, 0];
      for (let p = 0; p < width * rows; p += 1) {
        if (region[p] !== wanted || (wanted === 4 && !inBox(p)) || (clear && foam[p])) continue;
        const k = 4 * p;
        const [r, g, b] = [linear(pixels[k]), linear(pixels[k + 1]), linear(pixels[k + 2])];
        luma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum[0] += r;
        sum[1] += g;
        sum[2] += b;
        n += 1;
      }
      if (!n) return { pixels: 0 };
      const [r, g, b] = sum.map((c) => c / n);
      // Hue, degrees (green 120, cyan 180, blue 240), and the green share of the mean colour.
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const hue = max === min ? 0 : max === r ? (60 * ((g - b) / (max - min)) + 360) % 360 : max === g ? 60 * ((b - r) / (max - min)) + 120 : 60 * ((r - g) / (max - min)) + 240;
      return { pixels: n, luminance: +(luma / n).toFixed(4), hue: +hue.toFixed(1), green: +(g / (r + g + b)).toFixed(3), rgb: [r, g, b].map((c) => +c.toFixed(4)) };
    };
    // The face beside the lip: the water's own pixels around the lip and back wall, and the curl's shoulder face.
    const all = (pixels: Uint8Array) => ({
      lip: stats(pixels, 1), backWall: stats(pixels, 2), faceWater: stats(pixels, 4), faceWaterClear: stats(pixels, 4, true),
      faceCurl: stats(pixels, 5), otherCurl: stats(pixels, 3),
    });
    const result = { shot: shot.name, look, sun: lighting ?? sun, drawn: all(drawn), before: all(before), owner: all(owner) };
    // The drawn frame with the regions marked: the lip red, the back wall blue, the face's pixels yellow, one in four.
    const marked = new ImageData(width, rows);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const p = (rows - 1 - y) * width + x;
        const k = 4 * p;
        const o = 4 * (y * width + x);
        let [r, g, b] = [drawn[k], drawn[k + 1], drawn[k + 2]];
        const mark = (x + y) % 4 === 0;
        if (mark && region[p] === 1) [r, g, b] = [255, 0, 0];
        else if (mark && region[p] === 2) [r, g, b] = [0, 80, 255];
        else if (mark && region[p] === 4 && inBox(p)) [r, g, b] = [255, 230, 0];
        else if (mark && region[p] === 5) [r, g, b] = [255, 140, 0];
        marked.data.set([r, g, b, 255], o);
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = rows;
    canvas.getContext('2d')!.putImageData(marked, 0, 0);
    await post(canvas, 'curl-luma.png');
    return result;
  };
  /** Steps the sea on (at least `seconds`) to the next hold, and shoots from there; the new shots' names. */
  const waterSheetAdvance = async (seconds = 1) => {
    await settle(seconds);
    held = heldShots();
    shots = held.shots;
    Object.assign(window, { waterSheetShots: shots });
    return shots.map((shot) => shot.name);
  };
  /** Steps the sea on by `seconds` exactly, with no hold (for shooting a sequence, e.g. a spilling wave's peel). */
  const waterSheetStep = async (seconds: number) => {
    const steps = Math.max(1, Math.round(seconds / STEP));
    await advance(hooks, steps, idle);
    simulated += steps * STEP;
    hooks.render(0);
    return simulated;
  };
  Object.assign(window, { waterSheetStep, waterSheetReady: true, waterSheetWater: hooks.water, waterSheetShot, waterSheetShots: shots, waterSheetTime, waterSheetCompute: stepped, waterSheetCurl, waterSheetAdvance, waterSheetCurlLuma, waterSheetBarrel: hooks.mode.barrelMesh });
  await post(sheet, COMPUTE === 'cpu' ? 'water-sheet.png' : `water-sheet-${stepped}.png`);
}

async function post(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (png) await fetch(`${RECEIVER}/upload?name=${name}`, { method: 'POST', body: png }).catch(() => undefined);
}
