/**
 * Dev tool (`?inpage&boardSprayStrip`, board-spray 2026-10-29): stills of the boards' spray. On the Wave Pool (its waves
 * repeat, so every case rides the same water; `&size=medium` by default), a standing rider is put in place as the ride
 * recorder's placed starts do (`poolStart.ts`), and rides a scripted case:
 * - `trim`: on the face, straight, no input;
 * - `turn`: from the trough, a bottom turn (the steer from 0.3 s for 0.8 s);
 * - `compress`: the same turn with Compress held through it;
 * - `carve` (spray-rework): from the face, the steer and Compress together, a hard rail turn.
 * `&spot=canyon` (spray-rework) rides the Canyon's waves instead, each case on the next wave to break at its take-off
 * (`BreakStart`); `&boardSpray=old` films #171's spray; the log gives each frame's roll, drift, yaw rate, each sheet's
 * launch and the heights its root's ends would throw to, and the fan's live drops.
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
import { BreakStart, PoolStart, type PoolStartKind } from './poolStart';

interface StripHooks {
  start(settings: PhysicalSettings, overrides?: Record<string, unknown>): Promise<void>;
  setTimeOfDay(time: 'dawn' | 'midday' | 'sunset'): Promise<void>;
  setWaterLook(look: 'classic' | 'rich'): void;
  step(input: { paddle: boolean; popUp: boolean; steer: number }): void;
  render(seconds: number, camera?: PerspectiveCamera): void;
  renderView(camera: PerspectiveCamera): void;
  resize(width: number, height: number): void;
  mode: PhysicalMode;
  canvas: HTMLCanvasElement;
}

type Case = 'trim' | 'turn' | 'compress' | 'carve';
const params = new URLSearchParams(window.location.search);
const RECEIVER = params.get('receiver') ?? 'http://localhost:5199';
const SIZE = (params.get('size') ?? 'medium') as SwellSize;
/** `&spot=canyon` (spray-rework): the Canyon's waves, each case on the next wave to break at its take-off (`BreakStart`). */
const SPOT = (params.get('spot') ?? 'pool') as 'pool' | 'canyon';
const ARM: 1 | -1 = params.get('arm') === 'left' ? -1 : 1;
const CASES = (params.get('cases') ?? 'trim,turn,compress').split(',') as Case[];
const TIMES = (params.get('times') ?? '0.6,0.9,1.2,1.5').split(',').map(Number);
const STEER = Number(params.get('steer') ?? -ARM);
const OFF = params.get('boardSpray') === 'off';
/** `&boardSpray=old` (spray-rework): #171's spray, for the before strips. */
const OLD = params.get('boardSpray') === 'old';
/** `&spraySheet=off`: the spray as drops at once, without its curtains (spray-sheet's before). */
const NO_SHEET = params.get('spraySheet') === 'off';
/** `&close=1`: a third row, close to the rail the spray leaves (spray-sheet). */
const CLOSE = params.get('close') === '1';
const VIEWS = (CLOSE ? ['chase', 'side', 'close'] : ['chase', 'side']) as ('chase' | 'side' | 'close')[];
const TILE = { width: 640, height: 360 };
/** The GPU timing's frame, as the game's at 720p. */
const FULL = { width: 1280, height: 720 };
const STEP = 1 / 60;
const TURN = { from: 0.3, for: 0.8 };

interface CaseLog {
  case: Case;
  start: string;
  frames: Record<string, unknown>[];
}

/**
 * A camera 6 m behind the board along its heading and 2.2 m over it, 7 m to its side, or (`close`) 2.2 m off the
 * curtain its rail throws (`sheet`, else the board's +x side), square to it, looking at it.
 */
function cameraFor(
  board: Float64Array, view: 'chase' | 'side' | 'close', camera: PerspectiveCamera, sheet?: { x: number; y: number; z: number; vx: number; vz: number },
  surfaceAt?: (x: number, z: number) => number,
): PerspectiveCamera {
  const position = new Vector3(board[0], board[1], board[2]);
  const q = new Quaternion(board[3], board[4], board[5], board[6]);
  const forward = new Vector3(0, 0, 1).applyQuaternion(q).setY(0).normalize();
  const across = new Vector3(forward.z, 0, -forward.x);
  if (view === 'close') {
    const target = sheet ? new Vector3(sheet.x, sheet.y, sheet.z) : position.clone();
    const out = sheet ? new Vector3(sheet.vx, 0, sheet.vz).normalize() : across.clone();
    // Outside the spray, square to its curtain (which trails along `out`, the water's way off the hull), looking at its
    // first half metre.
    const face = new Vector3(-out.z, 0, out.x);
    if (face.dot(target.clone().sub(position)) < 0) face.negate();
    const middle = target.clone().addScaledVector(out, 0.5);
    camera.position.copy(middle).addScaledVector(face, 2.2).add(new Vector3(0, 0.5, 0));
    // Above the water there (on a face the outside of a turn can be under it).
    if (surfaceAt) camera.position.y = Math.max(camera.position.y, surfaceAt(camera.position.x, camera.position.z) + 0.4);
    camera.lookAt(middle.x, middle.y + 0.15, middle.z);
    camera.updateMatrixWorld();
    return camera;
  }
  if (view === 'chase') camera.position.copy(position).addScaledVector(forward, -6).add(new Vector3(0, 2.2, 0));
  else camera.position.copy(position).addScaledVector(across, 7).addScaledVector(forward, 1).add(new Vector3(0, 1.4, 0));
  camera.lookAt(position.x, position.y + 0.8, position.z);
  camera.updateMatrixWorld();
  return camera;
}

/** The board's roll off level (deg: its deck's normal from straight up) and drift (deg: its velocity off its heading, level). */
function attitude(board: { orientation: Quaternion; velocity: Vector3; angularVelocity: Vector3 }): { roll: number; drift: number; yawRate: number } {
  const up = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
  const heading = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
  const flat = board.velocity.clone().setY(0);
  const drift = flat.length() > 0.5 ? Math.acos(Math.min(1, Math.max(-1, flat.normalize().dot(heading)))) : 0;
  return {
    roll: +((Math.acos(Math.min(1, up.y)) * 180) / Math.PI).toFixed(1), drift: +((drift * 180) / Math.PI).toFixed(1),
    // The turn's rate, deg/s (about the vertical; the advisor: pros peak over 200 in a snap, 300 in a cutback).
    yawRate: +((board.angularVelocity.y * 180) / Math.PI).toFixed(0),
  };
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
  const settings = physicalSettingsFor(SPOT, { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
  await hooks.start(settings, { ...(OFF ? { boardSpray: 'off' } : OLD ? { boardSpray: 'old' } : {}), ...(NO_SHEET ? { spraySheet: 'off' } : {}) });
  await hooks.setTimeOfDay('midday');
  // `&look=classic|rich`: the water look (the game's graphics setting otherwise).
  const look = params.get('look');
  if (look === 'classic' || look === 'rich') hooks.setWaterLook(look);
  hooks.resize(TILE.width, TILE.height);
  const host = hooks.mode.host;
  const placed = SPOT === 'pool' ? PoolStart.at(host, ARM) : host instanceof LocalSurfZone ? new BreakStart(host, ARM) : undefined;
  if (!(host instanceof LocalSurfZone) || !placed) {
    await log('boardSprayStrip needs the sea stepped in the page (`?inpage`, the CPU tier)');
    return;
  }
  const runner = host.runner;
  const surfaceAt = (x: number, z: number) => host.heightAt(x, z);
  const camera = new PerspectiveCamera(55, TILE.width / TILE.height, 0.1, 2000);
  const result: { cases: CaseLog[]; gpu?: unknown; off: boolean } = { cases: [], off: OFF };
  for (const which of CASES) {
    // `carve` (spray-rework): from the face, a hard rail turn (the steer and Compress) as the others' bottom turn.
    const kind: PoolStartKind = which === 'trim' || which === 'carve' ? 'face' : 'trough';
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
    strip.height = TILE.height * VIEWS.length;
    const context = strip.getContext('2d')!;
    const spawnsBefore = runner.spray.boardSpawns;
    let held = false;
    for (let n = 1; n <= Math.round((Math.max(...TIMES) + 0.05) / STEP); n += 1) {
      const t = n * STEP;
      const turning = which !== 'trim' && t >= TURN.from && t < TURN.from + TURN.for;
      await advance(hooks, 1, { paddle: false, popUp: false, steer: turning ? STEER : 0, ...((which === 'compress' || which === 'carve') && turning ? { compress: 1 } : {}) } as never);
      // The fan throws as the sea steps (the game's frames do this; the strip renders only its columns).
      hooks.mode.updateFan();
      const column = TIMES.findIndex((time) => Math.abs(time - t) < STEP / 2);
      if (column < 0) continue;
      const board = host.snapshot.board;
      const now = runner.boardSheetsNow()[0];
      const aim = now ? { x: now.x + now.alongX * now.length * 0.5, y: now.y, z: now.z + now.alongZ * now.length * 0.5, vx: now.vx - now.boardX, vz: now.vz - now.boardZ } : undefined;
      for (const [row, view] of VIEWS.entries()) {
        hooks.render(STEP / 2, cameraFor(board, view, camera, aim, surfaceAt));
        // `&only=curtains`: the drops hidden, to see the curtains alone.
        if (params.get('only') === 'curtains') {
          const fanShown = hooks.mode.fan.group.visible;
          hooks.mode.spray.mesh.visible = false;
          hooks.mode.fan.group.visible = false;
          hooks.renderView(cameraFor(board, view, camera, aim, surfaceAt));
          hooks.mode.spray.mesh.visible = true;
          hooks.mode.fan.group.visible = fanShown;
        }
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
        curtains: hooks.mode.curtains.drawn, fan: hooks.mode.fan.live(),
        curtainAt: Array.from((hooks.mode.curtains.mesh.geometry.getAttribute('position').array as Float32Array).slice(0, 3)).map((v) => +v.toFixed(2)),
        curtainTip: Array.from((hooks.mode.curtains.mesh.geometry.getAttribute('position').array as Float32Array).slice(3 * 262, 3 * 262 + 3)).map((v) => +v.toFixed(2)),
        boardAt: [hooks.mode.board.position.x, hooks.mode.board.position.y, hooks.mode.board.position.z].map((v) => +v.toFixed(2)),
        snapshotBoard: [board[0], board[1], board[2]].map((v) => +v.toFixed(2)),
        roots: sheets.map((sheet) => ({ side: sheet.side, at: [sheet.x, sheet.y, sheet.z].map((v) => +v.toFixed(2)), length: +sheet.length.toFixed(2), breakup: +sheet.breakup.toFixed(3) })),
        // The spray's size (spray-rework): the board's roll off level and drift off its heading, each sheet's launch over
        // the ground and the height its water would reach in a vacuum, vy²/2g.
        ...attitude(runner.board!),
        launches: sheets.map((sheet) => ({
          v: [sheet.vx, sheet.vy, sheet.vz].map((v) => +v.toFixed(2)), flux: +sheet.flux.toFixed(1), apex: +(Math.max(0, sheet.vy) ** 2 / (2 * 9.81)).toFixed(2),
          // The fit along the root (spray-rework): the aft end's launch and its apex, the fore end's apex, where its water leaves.
          aft: [sheet.aftVX, sheet.aftVY, sheet.aftVZ].map((v) => +v.toFixed(2)), aftApex: +(Math.max(0, sheet.aftVY) ** 2 / (2 * 9.81)).toFixed(2),
          foreApex: +(Math.max(0, sheet.foreVY) ** 2 / (2 * 9.81)).toFixed(2), fluxMean: +sheet.fluxMean.toFixed(2),
        })),
        sheet: sheets[0] ? {
          root: +sheets[0].length.toFixed(2), thickness: +(sheets[0].thickness * 1000).toFixed(1), breakup: +sheets[0].breakup.toFixed(3),
          speed: +Math.hypot(sheets[0].vx - sheets[0].boardX, sheets[0].vy - sheets[0].boardY, sheets[0].vz - sheets[0].boardZ).toFixed(2),
          launch: +Math.hypot(sheets[0].vx, sheets[0].vy, sheets[0].vz).toFixed(2), fan: +sheets[0].fan.toFixed(2),
        } : undefined,
      });
      // The compressed turn's busiest frame: the spray's GPU time, drawn against hidden, frame by frame.
      if (which === 'compress' && !held && column === Math.floor(TIMES.length / 2)) {
        held = true;
        hooks.resize(FULL.width, FULL.height);
        camera.aspect = FULL.width / FULL.height;
        camera.updateProjectionMatrix();
        result.gpu = await sprayGpuAB(hooks, cameraFor(board, 'chase', camera));
        hooks.resize(TILE.width, TILE.height);
        camera.aspect = TILE.width / TILE.height;
        camera.updateProjectionMatrix();
      }
    }
    await post(strip, `board-spray-${SPOT === 'pool' ? '' : `${SPOT}-`}${which}${OFF ? '-off' : OLD ? '-old' : ''}${NO_SHEET ? '-drops' : ''}${CLOSE ? '-close' : ''}.png`);
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
  const curtains = hooks.mode.curtains.mesh;
  const fan = hooks.mode.fan.group;
  const fanShown = fan.visible;
  // The spray as drawn (the sea's drops, the curtains and the fan), its curtains hidden, its fan hidden, all of it hidden.
  const arms = [
    () => { spray.visible = true; curtains.visible = true; fan.visible = fanShown; },
    () => { spray.visible = true; curtains.visible = false; fan.visible = fanShown; },
    () => { spray.visible = true; curtains.visible = true; fan.visible = false; },
    () => { spray.visible = false; curtains.visible = false; fan.visible = false; },
  ];
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
  curtains.visible = true;
  fan.visible = fanShown;
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
    drawn: median(times[0]), curtainsHidden: median(times[1]), fanHidden: median(times[2]), allHidden: median(times[3]), curtains: hooks.mode.curtains.drawn,
    fanLive: hooks.mode.fan.live(),
    curtainCost: median(times[0].map((t, cycle) => t - times[1][cycle])), fanCost: median(times[0].map((t, cycle) => t - times[2][cycle])),
    sprayCost: median(times[0].map((t, cycle) => t - times[3][cycle])),
  };
}
