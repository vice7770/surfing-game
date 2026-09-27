/**
 * Dev tool (`?inpage&waterSheet`, G8): runs the Point's practice groundswell to
 * a breaking wave, holds it, and renders fixed shots (lineup, face, bore,
 * horizon, below) in both water looks under each time of day, as one sheet of
 * tiles. It steps and renders on its own, like the ride recorder.
 * `&whitewater` (G9) holds on a collapsing tube's foam ball instead, at the
 * Reef or the Beach (`&spot=beach`), and shoots its whitewater.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import { DEFAULT_PHYSICAL_SETTINGS, type PhysicalMode, type PhysicalSettings } from '../game/PhysicalMode';
import type { TimeOfDay } from '../game/SurfConditions';
import type { WaterLook } from '../scene/water/waterLook';
import { sampleSurfaceHeight, type WaterSurface } from '../scene/WaterSurface';
import { tubeFloorDepth } from '../wave/Overturn';
import { SPRAY_STRIDE } from '../wave/SprayCloud';
import { TUBE_STRIDE } from '../wave/tubeTable';

interface SheetHooks {
  start(settings: PhysicalSettings): Promise<void>;
  step(input: { paddle: boolean; popUp: boolean; steer: number }): void;
  render(seconds: number): void;
  resize(width: number, height: number): void;
  mode: PhysicalMode;
  canvas: HTMLCanvasElement;
  setWaterLook(look: WaterLook): void;
  setTimeOfDay(time: TimeOfDay): Promise<void>;
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

/** Yield to the event loop without a timer (timers are throttled in hidden pages). */
const breathe = () => new Promise<void>((resolve) => {
  const channel = new MessageChannel();
  channel.port1.onmessage = () => resolve();
  channel.port2.postMessage(0);
});

interface Shot { name: string; eye: Vector3; target: Vector3 }

const PARAMETERS = new URLSearchParams(window.location.search);
/** `?waterSheet&spot=reef` (G9): the practice Reef, held on an open tube, with tube shots in place of the face and bore. */
const SPOT = PARAMETERS.get('spot') === 'reef' ? 'reef' : PARAMETERS.get('spot') === 'beach' ? 'beach' : 'point';
/** `&whitewater` (G9): hold on a collapsing tube's foam ball, and shoot its whitewater in place of the face and bore. */
const WHITEWATER = PARAMETERS.has('whitewater');
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
  const settings: PhysicalSettings = { ...DEFAULT_PHYSICAL_SETTINGS, spot: SPOT, source: 'practice', compute: 'cpu' };
  await hooks.start(settings);
  hooks.resize(RENDER.width, RENDER.height);
  const idle = { paddle: false, popUp: false, steer: 0 };
  let simulated = 0;
  while (simulated < MAX_SETTLE) {
    // A tube flies about a second: once settled, the Reef looks for one every 0.2 s.
    const chunk = (SPOT === 'reef' || WHITEWATER) && simulated >= MIN_SETTLE ? 12 : 60;
    for (let k = 0; k < chunk; k += 1) hooks.step(idle);
    simulated += chunk * STEP;
    if (simulated >= MIN_SETTLE) {
      hooks.render(0);
      const held = WHITEWATER
        ? (foamBall(hooks.mode)?.count ?? 0) >= FOAM_BALL_HOLD
        : SPOT === 'reef' ? (openTube(hooks.mode)?.reach ?? 0) >= TUBE_OPEN : steepestFace(hooks.water, hooks.mode.focus).slope >= FACE_SLOPE;
      if (held) break;
    }
    await breathe();
  }
  hooks.render(0);
  const tube = SPOT === 'reef' && !WHITEWATER ? openTube(hooks.mode) : undefined;
  const ball = WHITEWATER ? foamBall(hooks.mode) : undefined;
  const shots = findShots(hooks.water, hooks.mode.focus).flatMap((shot) => {
    if (shot.name === 'face') return ball ? whitewaterShots(hooks.water, ball.centre) : tube ? tubeShots(hooks.mode, tube) : [shot];
    return (tube || ball) && shot.name === 'bore' ? [] : [shot];
  });
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
  status.textContent = `Water sheet: ${SPOT} practice${ball ? `, ${ball.count} foam-ball sprites` : ''}, ${simulated.toFixed(0)} s settled · columns ${TIMES.map((t) => LOOKS.map((l) => `${l} ${t}`).join(', ')).join(', ')} · rows ${shots.map((s) => s.name).join(', ')}`;
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
  Object.assign(window, { waterSheetReady: true, waterSheetWater: hooks.water, waterSheetShot, waterSheetShots: shots, waterSheetTime });
  await post(sheet, 'water-sheet.png');
}

async function post(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (png) await fetch(`${RECEIVER}/upload?name=${name}`, { method: 'POST', body: png }).catch(() => undefined);
}
