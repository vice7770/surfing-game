/**
 * Dev tool (`?inpage&waterSheet`, G8): runs the Point's practice groundswell to
 * a breaking wave, holds it, and renders fixed shots (lineup, face, bore,
 * horizon, below) in both water looks under each time of day, as one sheet of
 * tiles. It steps and renders on its own, like the ride recorder.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import { DEFAULT_PHYSICAL_SETTINGS, type PhysicalMode, type PhysicalSettings } from '../game/PhysicalMode';
import type { TimeOfDay } from '../game/SurfConditions';
import type { WaterLook } from '../scene/water/waterLook';
import { sampleSurfaceHeight, type WaterSurface } from '../scene/WaterSurface';

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
  let foamiest = { foam: -1, x: focus.x, z: focus.z, height: 0 };
  for (let j = 1; j < grid.nz - 1; j += 1) {
    for (let i = 1; i < grid.nx - 1; i += 1) {
      const here = node(water, i, j);
      if (Math.hypot(here.x - focus.x, here.z - focus.z) > 40) continue;
      if (here.foam > foamiest.foam) foamiest = { foam: here.foam, x: here.x, z: here.z, height: here.height };
    }
  }
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
  const settings: PhysicalSettings = { ...DEFAULT_PHYSICAL_SETTINGS, spot: 'point', source: 'practice', compute: 'cpu' };
  await hooks.start(settings);
  hooks.resize(RENDER.width, RENDER.height);
  const idle = { paddle: false, popUp: false, steer: 0 };
  let simulated = 0;
  while (simulated < MAX_SETTLE) {
    for (let k = 0; k < 60; k += 1) hooks.step(idle);
    simulated += 60 * STEP;
    if (simulated >= MIN_SETTLE) {
      hooks.render(0);
      if (steepestFace(hooks.water, hooks.mode.focus).slope >= FACE_SLOPE) break;
    }
    await breathe();
  }
  hooks.render(0);
  const shots = findShots(hooks.water, hooks.mode.focus);
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
  status.textContent = `Water sheet: Point practice, ${simulated.toFixed(0)} s settled · columns ${TIMES.map((t) => LOOKS.map((l) => `${l} ${t}`).join(', ')).join(', ')} · rows ${shots.map((s) => s.name).join(', ')}`;
  const face = steepestFace(hooks.water, hooks.mode.focus);
  status.textContent += ` · face slope ${face.slope.toFixed(2)} · program ${hooks.water.mesh.material.customProgramCacheKey()}`;
  /** One shot at full size, posted as water-shot.png: for close checks from the console once the sheet is done. */
  const closeUp = document.createElement('canvas');
  closeUp.width = RENDER.width;
  closeUp.height = RENDER.height;
  const waterSheetShot = async (name: string, look: WaterLook, time: TimeOfDay) => {
    const shot = shots.find((candidate) => candidate.name === name);
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
  Object.assign(window, { waterSheetReady: true, waterSheetWater: hooks.water, waterSheetShot });
  await post(sheet, 'water-sheet.png');
}

async function post(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (png) await fetch(`${RECEIVER}/upload?name=${name}`, { method: 'POST', body: png }).catch(() => undefined);
}
