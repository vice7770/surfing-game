/**
 * Dev tool (`?inpage&boardSprayStrip`, board-spray 2026-10-29): stills of the boards' spray. On the Wave Pool (its waves
 * repeat, so every case rides the same water; `&size=medium` by default), a standing rider is put in place as the ride
 * recorder's placed starts do (`poolStart.ts`), and rides a scripted case:
 * - `trim`: on the face, straight, no input;
 * - `turn`: from the trough, a bottom turn (the steer from 0.3 s for 0.8 s);
 * - `compress`: the same turn with Compress held through it.
 * Frames at `&times=0.5,0.8,1.1,1.4` s after the placement, from behind the rider (chase) and from the side, go into one
 * strip per case, posted to the ride receiver (`npm run record:ride`) as `board-spray-<case>.png`. `&boardSpray=off` is
 * the A/B. `&cases=trim,turn,compress`, `&arm=left`, `&steer=1|-1` (the bottom turn's way; up the face by default).
 *
 * The page also times the spray on the GPU at the compressed turn's busiest frame (drawn against hidden, alternating
 * frame by frame, as `waterSheetGpuAB` does) and logs each case's board sheets and spray counts: `window.boardSprayStrip`.
 */
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type { PhysicalMode, PhysicalSettings } from '../game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../game/SurfConditions';
import { LocalSurfZone } from '../game/SurfZoneHost';
import { advance, breathe } from './devStepping';
import { PoolStart, type PoolStartKind } from './poolStart';

interface StripHooks {
  start(settings: PhysicalSettings, overrides?: Record<string, unknown>): Promise<void>;
  step(input: { paddle: boolean; popUp: boolean; steer: number }): void;
  render(seconds: number, camera?: PerspectiveCamera): void;
  renderView(camera: PerspectiveCamera): void;
  resize(width: number, height: number): void;
  mode: PhysicalMode;
  canvas: HTMLCanvasElement;
}

type Case = 'trim' | 'turn' | 'compress';
const params = new URLSearchParams(window.location.search);
const RECEIVER = params.get('receiver') ?? 'http://localhost:5199';
const SIZE = (params.get('size') ?? 'medium') as SwellSize;
const ARM: 1 | -1 = params.get('arm') === 'left' ? -1 : 1;
const CASES = (params.get('cases') ?? 'trim,turn,compress').split(',') as Case[];
const TIMES = (params.get('times') ?? '0.5,0.8,1.1,1.4').split(',').map(Number);
const STEER = Number(params.get('steer') ?? -ARM);
const OFF = params.get('boardSpray') === 'off';
const TILE = { width: 480, height: 270 };
const STEP = 1 / 60;
const TURN = { from: 0.3, for: 0.8 };

interface CaseLog {
  case: Case;
  start: string;
  frames: { t: number; speed: number; sheets: number; flux: number; spray: number; boardSpawns: number }[];
}

/** A camera `back` m behind the board along its heading and `up` m over it, or `side` m to its side, looking at it. */
function cameraFor(board: Float64Array, view: 'chase' | 'side', camera: PerspectiveCamera): PerspectiveCamera {
  const position = new Vector3(board[0], board[1], board[2]);
  const q = new Quaternion(board[3], board[4], board[5], board[6]);
  const forward = new Vector3(0, 0, 1).applyQuaternion(q).setY(0).normalize();
  const across = new Vector3(forward.z, 0, -forward.x);
  if (view === 'chase') camera.position.copy(position).addScaledVector(forward, -6).add(new Vector3(0, 2.2, 0));
  else camera.position.copy(position).addScaledVector(across, 7).addScaledVector(forward, 1).add(new Vector3(0, 1.4, 0));
  camera.lookAt(position.x, position.y + 0.8, position.z);
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

export async function boardSprayStrip(hooks: StripHooks): Promise<void> {
  const settings = physicalSettingsFor('pool', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
  await hooks.start(settings, OFF ? { boardSpray: 'off' } : undefined);
  hooks.resize(TILE.width, TILE.height);
  const host = hooks.mode.host;
  const placed = PoolStart.at(host, ARM);
  if (!(host instanceof LocalSurfZone) || !placed) {
    await log('boardSprayStrip needs the Wave Pool stepped in the page (`?inpage`, the CPU tier)');
    return;
  }
  const runner = host.runner;
  const camera = new PerspectiveCamera(55, TILE.width / TILE.height, 0.1, 2000);
  const result: { cases: CaseLog[]; gpu?: unknown; off: boolean } = { cases: [], off: OFF };
  for (const which of CASES) {
    const kind: PoolStartKind = which === 'trim' ? 'face' : 'trough';
    // Idle on the lineup until a wave is due, then put the rider in place.
    for (let n = 0; n < 60 * 40 && !placed.due(); n += 1) {
      await advance(hooks, 1, { paddle: false, popUp: false, steer: 0 });
      if (n % 120 === 0) await breathe();
    }
    const placement = placed.placement(kind);
    hooks.mode.place(placement);
    const entry: CaseLog = { case: which, start: `${kind} at ${host.snapshot.status.seaTime.toFixed(1)} s`, frames: [] };
    const strip = document.createElement('canvas');
    strip.width = TILE.width * TIMES.length;
    strip.height = TILE.height * 2;
    const context = strip.getContext('2d')!;
    const spawnsBefore = runner.spray.boardSpawns;
    let held = false;
    for (let n = 1; n <= Math.round((Math.max(...TIMES) + 0.05) / STEP); n += 1) {
      const t = n * STEP;
      const turning = which !== 'trim' && t >= TURN.from && t < TURN.from + TURN.for;
      await advance(hooks, 1, { paddle: false, popUp: false, steer: turning ? STEER : 0, ...(which === 'compress' && turning ? { compress: 1 } : {}) } as never);
      const column = TIMES.findIndex((time) => Math.abs(time - t) < STEP / 2);
      if (column < 0) continue;
      const board = host.snapshot.board;
      for (const [row, view] of (['chase', 'side'] as const).entries()) {
        hooks.render(0, cameraFor(board, view, camera));
        context.drawImage(hooks.canvas, column * TILE.width, row * TILE.height, TILE.width, TILE.height);
      }
      context.fillStyle = 'rgba(0,0,0,0.55)';
      context.fillRect(column * TILE.width, 0, 150, 22);
      context.fillStyle = '#fff';
      context.font = '14px sans-serif';
      context.fillText(`${which} ${t.toFixed(1)} s`, column * TILE.width + 6, 16);
      const sheets = runner.boardSheetsNow();
      entry.frames.push({
        t: +t.toFixed(2), speed: +Math.hypot(runner.board!.velocity.x, runner.board!.velocity.z).toFixed(2), sheets: sheets.length,
        flux: +sheets.reduce((sum, sheet) => sum + sheet.flux, 0).toFixed(1), spray: runner.spray.count, boardSpawns: runner.spray.boardSpawns - spawnsBefore,
      });
      // The compressed turn's busiest frame: the spray's GPU time, drawn against hidden, frame by frame.
      if (which === 'compress' && !held && column === Math.floor(TIMES.length / 2)) {
        held = true;
        result.gpu = await sprayGpuAB(hooks, cameraFor(board, 'chase', camera));
      }
    }
    await post(strip, `board-spray-${which}${OFF ? '-off' : ''}.png`);
    await log(`${which}: ${JSON.stringify(entry)}`);
    result.cases.push(entry);
    // Wait out this wave before the next case's.
    for (let n = 0; n < 60 * 4; n += 1) {
      await advance(hooks, 1, { paddle: false, popUp: false, steer: 0 });
    }
  }
  if (result.gpu) await log(`spray GPU: ${JSON.stringify(result.gpu)}`);
  Object.assign(window, { boardSprayStrip: result, boardSprayStripDone: true });
}

/**
 * The spray's GPU time on a held frame: the spray drawn and hidden take turns frame by frame, the order turned each
 * cycle (`waterSheetGpuAB`'s method), ms per frame: the median of each and of their difference within a cycle.
 */
async function sprayGpuAB(hooks: StripHooks, camera: PerspectiveCamera, cycles = 60): Promise<unknown> {
  const gl = hooks.canvas.getContext('webgl2');
  const timer = gl?.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  if (!gl || !timer) return 'no GPU timer';
  const spray = hooks.mode.spray.mesh;
  const arms = [() => { spray.visible = true; }, () => { spray.visible = false; }];
  for (const arm of arms) {
    arm();
    hooks.renderView(camera);
  }
  const pending: { arm: number; cycle: number; query: WebGLQuery }[] = [];
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    for (let k = 0; k < arms.length; k += 1) {
      const arm = (cycle + k) % arms.length;
      arms[arm]();
      const query = gl.createQuery()!;
      gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
      hooks.renderView(camera);
      gl.endQuery(timer.TIME_ELAPSED_EXT);
      pending.push({ arm, cycle, query });
    }
    if (cycle % 2 === 1) await breathe();
  }
  spray.visible = true;
  const times = arms.map(() => new Array<number>(cycles).fill(Number.NaN));
  for (const { arm, cycle, query } of pending) {
    while (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) await new Promise((resolve) => setTimeout(resolve, 5));
    if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) times[arm][cycle] = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
    gl.deleteQuery(query);
  }
  const median = (values: number[]) => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return sorted.length ? +sorted[Math.floor(sorted.length / 2)].toFixed(3) : Number.NaN;
  };
  return {
    drawn: median(times[0]), hidden: median(times[1]), sprayCost: median(times[0].map((t, cycle) => t - times[1][cycle])),
  };
}
