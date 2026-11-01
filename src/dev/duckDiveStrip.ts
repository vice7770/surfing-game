/**
 * Dev tool (`?inpage&duckDiveStrip`, duck-drawn 2026-10-31): stills of a timed duck-dive, the drawn body as the page
 * draws it (the rider posed every step, as the game's frames pose it).
 * - `&spot=canyon` (the default; `&size=medium`): the rider is put prone 25 m inside the break heading out to sea, as the
 *   duck-dive report's paddlers are, paddles, and dives for 1.5 s when the broken water is 2.5 m away (on time); the
 *   first wave that comes within 40 s, else it is put back.
 * - `&flat=1`: the same spot on a still sea (a 2 cm swell): paddling 2 s, then the 1.5 s dive.
 * Frames at `&times=0,0.25,0.6,1.2,2,3,4` s after the dive begins, from behind the rider (chase), from the side, and
 * from the side with the sea's surface hidden (x-ray, to see the body under it), go into one strip posted to the ride receiver (`npm run record:ride`) as `duck-dive-<canyon|flat>[-old].png`;
 * `&duckDrawn=old` (the page's switch) draws the same dive as main did before duck-drawn. The log gives each frame's board
 * depth, pitch and roll, the press and whether the body is ducking: `window.duckDiveStrip`.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import type { PhysicalMode, PhysicalSettings } from '../game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../game/SurfConditions';
import { LocalSurfZone } from '../game/SurfZoneHost';
import { createWaterSample } from '../physics/SurfWater';
import { advance, breathe } from './devStepping';

interface StripHooks {
  start(settings: PhysicalSettings, overrides?: Record<string, unknown>): Promise<void>;
  setTimeOfDay(time: 'dawn' | 'midday' | 'sunset'): Promise<void>;
  setWaterLook(look: 'classic' | 'rich'): void;
  step(input: { paddle: boolean; popUp: boolean; steer: number }): void;
  renderView(camera: PerspectiveCamera): void;
  resize(width: number, height: number): void;
  mode: PhysicalMode;
  water: { mesh: { visible: boolean } };
  canvas: HTMLCanvasElement;
}

const params = new URLSearchParams(window.location.search);
const RECEIVER = params.get('receiver') ?? 'http://localhost:5199';
const SIZE = (params.get('size') ?? 'medium') as SwellSize;
const FLAT = params.get('flat') === '1';
const OLD = params.get('duckDrawn') === 'old';
const TIMES = (params.get('times') ?? '0,0.25,0.6,1.2,2,3,4').split(',').map(Number);
const TILE = { width: 640, height: 360 };
const STEP = 1 / 60;
type View = 'chase' | 'side' | 'xray';
/** The duck-dive report's on-time dive: the press's length, s, the broken water's distance it starts at, m, and its strength. */
const HOLD = 1.5;
const DIVE_AT = 2.5;
const BROKEN = 0.3;
/** How far inside the break the rider is put, m, and how long it waits for a wave, s. */
const INSIDE = 25;
const WAIT = 40;
const FLAT_PADDLE = 2;

/**
 * A camera 4 m behind the board along its heading and 1.6 m over it, or 3 m to its side and 0.8 m over the water there,
 * looking at the board a little above it; or (`xray`) 2.5 m to its side level with the board, the water hidden, to see
 * the body under it.
 */
function cameraFor(board: ArrayLike<number>, view: View, camera: PerspectiveCamera, surfaceAt: (x: number, z: number) => number): PerspectiveCamera {
  const position = new Vector3(board[0], board[1], board[2]);
  const forward = new Vector3(0, 0, 1).applyQuaternion({ x: board[3], y: board[4], z: board[5], w: board[6] } as never).setY(0);
  if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1);
  forward.normalize();
  const across = new Vector3(forward.z, 0, -forward.x);
  if (view === 'chase') camera.position.copy(position).addScaledVector(forward, -4).add(new Vector3(0, 1.6, 0));
  else if (view === 'side') {
    camera.position.copy(position).addScaledVector(across, 3).addScaledVector(forward, 0.3);
    camera.position.y = surfaceAt(camera.position.x, camera.position.z) + 0.8;
  } else camera.position.copy(position).addScaledVector(across, 2.5).addScaledVector(forward, 0.3).add(new Vector3(0, 0.3, 0));
  if (view === 'xray') camera.lookAt(position.x, position.y + 0.15, position.z);
  else camera.lookAt(position.x, Math.max(position.y, surfaceAt(position.x, position.z)) + 0.2, position.z);
  camera.updateMatrixWorld();
  return camera;
}

async function post(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (png) await fetch(`${RECEIVER}/upload?name=${name}`, { method: 'POST', body: png }).catch(() => undefined);
}

async function log(line: string): Promise<void> {
  console.log(line);
  await fetch(`${RECEIVER}/log`, { method: 'POST', body: line }).catch(() => undefined);
}

export async function duckDiveStrip(hooks: StripHooks): Promise<void> {
  const settings = physicalSettingsFor('canyon', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
  await hooks.start(settings, FLAT ? { significantHeight: 0.02 } : {});
  await hooks.setTimeOfDay('midday');
  const look = params.get('look');
  if (look === 'classic' || look === 'rich') hooks.setWaterLook(look);
  hooks.resize(TILE.width, TILE.height);
  const host = hooks.mode.host;
  if (!(host instanceof LocalSurfZone)) {
    await log('duckDiveStrip needs the sea stepped in the page (`?inpage`, the CPU tier)');
    return;
  }
  const { runner } = host;
  const surfaceAt = (x: number, z: number) => host.heightAt(x, z);
  const radians = (host.config.directionDegrees * Math.PI) / 180;
  const travel = new Vector3(Math.sin(radians), 0, Math.cos(radians));
  const seaward = Math.atan2(-travel.x, -travel.z);
  const sample = createWaterSample();
  const point = new Vector3();
  /** The broken water's distance seaward of the board, m (Infinity: none within 20 m). */
  const brokenAhead = (): number => {
    const board = host.snapshot.board;
    for (let d = 0; d <= 20; d += 0.5) {
      point.set(board[0], board[1], board[2]).addScaledVector(travel, -d);
      runner.water.sampleAt(point.x, point.y, point.z, sample);
      if (!sample.outsideDomain && sample.breaking >= BROKEN) return d;
    }
    return Infinity;
  };
  const step = async (input: Record<string, unknown>) => {
    await advance(hooks, 1, { paddle: false, popUp: false, steer: 0, ...input } as never);
    // The rider posed every step, as the game's frames pose it (its hand-overs follow the clock).
    hooks.mode.update(STEP);
  };
  const views: readonly View[] = ['chase', 'side', 'xray'];
  const camera = new PerspectiveCamera(55, TILE.width / TILE.height, 0.1, 2000);
  const frames: Record<string, unknown>[] = [];
  let started = false;
  for (let attempt = 0; attempt < 6 && !started; attempt += 1) {
    const at = new Vector3(runner.focus.x, 0, runner.focus.z).addScaledVector(travel, INSIDE);
    hooks.mode.place({ x: at.x, z: at.z, heading: seaward, speed: 0, phase: 'prone' });
    for (let n = 0; n < 30; n += 1) await step({});
    // Paddle out until the broken water is near (or, on a still sea, a while), then dive.
    let waited = 0;
    while (waited < WAIT) {
      if (FLAT ? waited >= FLAT_PADDLE : brokenAhead() <= DIVE_AT) {
        started = true;
        break;
      }
      await step({ paddle: true });
      waited += STEP;
      if (Math.round(waited / STEP) % 120 === 0) await breathe();
    }
  }
  if (!started) {
    await log('duckDiveStrip: no broken water came');
    return;
  }
  const strip = document.createElement('canvas');
  strip.width = TILE.width * TIMES.length;
  strip.height = TILE.height * views.length;
  const context = strip.getContext('2d')!;
  const session = runner.session!;
  const last = Math.max(...TIMES);
  for (let n = 0; n <= Math.round(last / STEP); n += 1) {
    const t = n * STEP;
    const column = TIMES.findIndex((time) => Math.abs(time - t) < STEP / 2);
    if (column >= 0) {
      const board = host.snapshot.board;
      for (const [row, view] of views.entries()) {
        // The x-ray row: the sea's surface and the far ocean hidden.
        const far = hooks.mode.farField.mesh;
        const farShown = far.visible;
        if (view === 'xray') {
          hooks.water.mesh.visible = false;
          far.visible = false;
        }
        hooks.renderView(cameraFor(board, view, camera, surfaceAt));
        hooks.water.mesh.visible = true;
        far.visible = farShown;
        context.drawImage(hooks.canvas, column * TILE.width, row * TILE.height, TILE.width, TILE.height);
      }
      context.fillStyle = 'rgba(0,0,0,0.55)';
      context.fillRect(column * TILE.width, 0, 210, 22);
      context.fillStyle = '#fff';
      context.font = '14px sans-serif';
      context.fillText(`${FLAT ? 'flat' : 'canyon'}${OLD ? ' old pose' : ''} ${t.toFixed(2)} s`, column * TILE.width + 6, 16);
      const b = session.board;
      const deck = b.toWorld({ x: 0, y: b.shape.centerOfMass.y, z: 0 }, new Vector3());
      const up = new Vector3(0, 1, 0).applyQuaternion(b.orientation);
      const nose = new Vector3(0, 0, 1).applyQuaternion(b.orientation);
      frames.push({
        t: +t.toFixed(2), ducking: session.ducking, phase: session.phase, press: +session.duckPress.toFixed(2),
        depth: +(surfaceAt(deck.x, deck.z) - deck.y).toFixed(2), pitch: +((Math.asin(nose.y) * 180) / Math.PI).toFixed(1),
        roll: +((Math.acos(Math.min(1, up.y)) * 180) / Math.PI).toFixed(1), broken: brokenAhead(),
      });
    }
    await step(t < HOLD ? { duckDive: 1 } : {});
    if (n % 30 === 0) await breathe();
  }
  const name = `duck-dive-${FLAT ? 'flat' : 'canyon'}${OLD ? '-old' : ''}.png`;
  await post(strip, name);
  await log(`${name}: ${JSON.stringify(frames)}`);
  Object.assign(window, { duckDiveStrip: { frames }, duckDiveStripDone: true });
}
