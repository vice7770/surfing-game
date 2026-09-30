/**
 * Dev tool (`?particleBench`): what the whitewater's particles cost on a heavy
 * sea. It starts a spot's Surf screen swell (the Reef's Big by default), steps
 * it, and at held moments times the frame from a ride's view of the busiest
 * whitewater, in turn as drawn, with the spray hidden, with the bubbles hidden
 * too, and with the lip sheet hidden as well. Each frame is drawn and waited
 * for with a one-pixel read, and timed on the GPU too where the browser
 * allows, so the timing holds in a hidden page. It also times the page's own
 * work for each new snapshot: filling the spray's and bubbles' buffers and
 * rebuilding the lip sheet. It steps and renders on its own, like the water
 * sheet; the particles' own step in the worker is timed by
 * `npm run report:particles`.
 *
 * `?particleBench&graphics=high` draws as the High preset does (main.ts's `graphics` flag), whatever is saved;
 * `&spot=reef|padang|…`, `&swell=big|medium|small|practice`, `&particles=high|medium|low`,
 * `&look=rich|classic`, `&compute=gpu` (the sea in the game's worker on the GPU tier, as the
 * game's; otherwise the worker on the CPU, or the page with `?inpage`), `&from=20&to=60&every=10`
 * (sea seconds held, after the sea is up), `&frames=24`, `&width=1280&height=720`, `&centre=x,z` (look there
 * rather than at the busiest whitewater, so every level's shot is framed alike), and `&shot=30`: the front view
 * at that moment is posted as a PNG to the ride receiver (`&receiver=`, as the water sheet's).
 * The result is `window.particleBench` once `done`.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import { GPU_TIER_COMPONENTS, type PhysicalMode, type PhysicalSettings } from '../game/PhysicalMode';
import { physicalSettingsFor, type SwellSize, type TimeOfDay } from '../game/SurfConditions';
import type { WaterLook } from '../scene/water/waterLook';
import type { SpotName } from '../wave/Bathymetry';
import { PARTICLE_LEVELS, type ParticleLevel } from '../wave/particleBudget';
import { SPRAY_STRIDE } from '../wave/SprayCloud';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { advance, breathe } from './devStepping';

interface BenchHooks {
  start(settings: PhysicalSettings, overrides?: Partial<SurfZoneConfig>): Promise<void>;
  step(input: { paddle: boolean; popUp: boolean; steer: number }): void;
  render(seconds: number): void;
  resize(width: number, height: number): void;
  mode: PhysicalMode;
  canvas: HTMLCanvasElement;
  setWaterLook(look: WaterLook): void;
  setTimeOfDay(time: TimeOfDay): Promise<void>;
  renderView(camera: PerspectiveCamera): void;
}

const PARAMETERS = new URLSearchParams(window.location.search);
const SPOT = (PARAMETERS.get('spot') ?? 'reef') as SpotName;
const SWELL = (PARAMETERS.get('swell') ?? 'big') as SwellSize;
const LEVEL: ParticleLevel = PARTICLE_LEVELS.find((level) => level === PARAMETERS.get('particles')) ?? 'high';
const LOOK: WaterLook = PARAMETERS.get('look') === 'classic' ? 'classic' : 'rich';
const COMPUTE = PARAMETERS.get('compute') === 'gpu' || PARAMETERS.get('compute') === 'auto' ? 'auto' : 'cpu';
const FROM = Number(PARAMETERS.get('from') ?? 20);
const TO = Number(PARAMETERS.get('to') ?? 60);
const EVERY = Number(PARAMETERS.get('every') ?? 10);
const FRAMES = Number(PARAMETERS.get('frames') ?? 24);
const WIDTH = Number(PARAMETERS.get('width') ?? 1280);
const HEIGHT = Number(PARAMETERS.get('height') ?? 720);
/** The moment whose front view is posted as a PNG, sea seconds after the sea is up; none when absent. */
const SHOT = PARAMETERS.has('shot') ? Number(PARAMETERS.get('shot')) : undefined;
const RECEIVER = PARAMETERS.get('receiver') ?? 'http://localhost:5199';
/** A fixed place to look at, x and z, in place of the busiest whitewater. */
const CENTRE = PARAMETERS.get('centre')?.split(',').map(Number);
const STEP = 1 / 60;
/** The views timed: the ride's front camera (SpectatorCamera: 9 m shoreward, 5 m aside, 3.5 m up) and one at half its distance. */
const VIEWS = { front: 1, close: 0.5 } as const;
/** What each variant hides, in turn: nothing, the spray, the bubbles too, the lip sheet too. */
const VARIANTS = ['drawn', 'noSpray', 'noBubbles', 'noLip'] as const;
type Variant = (typeof VARIANTS)[number];
type ByVariant = Record<Variant, number>;
/** Particle kinds as the spray packs them: spray, mist, foam ball, a tube's spray, a tube's mist. */
const KINDS = ['spray', 'mist', 'foamBall', 'tubeSpray', 'tubeMist'] as const;

interface ViewTiming {
  wall: ByVariant;
  gpu?: ByVariant;
  /** The spray's fragments on screen by kind, and the particles on screen. */
  fragments: Record<(typeof KINDS)[number], number>;
  onScreen: number;
}

interface Moment {
  seaTime: number;
  /** Where the views look: the busiest whitewater, x and z. */
  centre: [number, number];
  spray: number;
  kinds: number[];
  bubbles: number;
  lipParcels: number;
  /** The page's work for one new snapshot, ms: the spray's and bubbles' buffers, and the lip sheet's rebuild. */
  page: { spray: number; bubbles: number; lip: number };
  views: Record<string, ViewTiming>;
}

const median = (values: number[]) => {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return Number.NaN;
  const sorted = [...finite].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/** The busiest whitewater in the snapshot: the particles' densest 10 m square, and their centroid within 15 m of it. */
function busiest(mode: PhysicalMode): Vector3 | undefined {
  const snapshot = mode.host?.snapshot;
  if (!snapshot || snapshot.sprayCount === 0) return undefined;
  const bins = new Map<string, number>();
  let best = '';
  let most = 0;
  for (let k = 0; k < snapshot.sprayCount; k += 1) {
    const o = k * SPRAY_STRIDE;
    const key = `${Math.floor(snapshot.spray[o] / 10)},${Math.floor(snapshot.spray[o + 2] / 10)}`;
    const count = (bins.get(key) ?? 0) + 1;
    bins.set(key, count);
    if (count > most) {
      most = count;
      best = key;
    }
  }
  const [bx, bz] = best.split(',').map((value) => (Number(value) + 0.5) * 10);
  const centre = new Vector3();
  let n = 0;
  for (let k = 0; k < snapshot.sprayCount; k += 1) {
    const o = k * SPRAY_STRIDE;
    if (Math.hypot(snapshot.spray[o] - bx, snapshot.spray[o + 2] - bz) > 15) continue;
    centre.x += snapshot.spray[o];
    centre.y += snapshot.spray[o + 1];
    centre.z += snapshot.spray[o + 2];
    n += 1;
  }
  return n > 0 ? centre.divideScalar(n) : undefined;
}

/**
 * The fragments the drawn spray's sprites cover from `camera`, by kind: each point's side in pixels (as the shaders
 * size it, the Rich mist 1.6 times wider, capped at the largest point the GPU draws), clipped to the view.
 */
function sprayFragments(mode: PhysicalMode, camera: PerspectiveCamera, width: number, height: number, maxPoint: number): Pick<ViewTiming, 'fragments' | 'onScreen'> {
  const { geometry } = mode.spray.mesh;
  const positions = geometry.getAttribute('position').array;
  const looks = geometry.getAttribute('look').array;
  const kinds = geometry.getAttribute('kind').array;
  const perMetre = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const view = new Vector3();
  const fragments = { spray: 0, mist: 0, foamBall: 0, tubeSpray: 0, tubeMist: 0 };
  let onScreen = 0;
  for (let k = 0; k < geometry.drawRange.count; k += 1) {
    view.set(positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]).applyMatrix4(camera.matrixWorldInverse);
    const depth = -view.z;
    if (depth < camera.near) continue;
    const kind = kinds[k];
    const mist = kind === 1 || kind === 4;
    const side = Math.min(maxPoint, Math.max(1, (looks[k * 2] * (LOOK === 'rich' && mist ? 1.6 : 1) * perMetre) / Math.max(0.1, depth)));
    const x = (view.x / depth) * perMetre + width / 2;
    const y = (view.y / depth) * perMetre + height / 2;
    const w = Math.min(width, x + side / 2) - Math.max(0, x - side / 2);
    const h = Math.min(height, y + side / 2) - Math.max(0, y - side / 2);
    if (w <= 0 || h <= 0) continue;
    fragments[KINDS[kind]] += w * h;
    onScreen += 1;
  }
  return { fragments, onScreen };
}

/** The page's work for one new snapshot, ms, each part the median of `repeats` calls (the lip sheet rebuilt every time). */
function pageWork(mode: PhysicalMode, repeats = 15): Moment['page'] {
  const snapshot = mode.host!.snapshot;
  const time = (work: () => void) => median(Array.from({ length: repeats }, () => {
    const start = performance.now();
    work();
    return performance.now() - start;
  }));
  const dx = mode.host!.init.dx;
  return {
    spray: time(() => mode.spray.update({ particles: snapshot.spray, count: snapshot.sprayCount })),
    bubbles: time(() => mode.bubbles.update({ positions: snapshot.bubbles, count: snapshot.bubbleCount })),
    lip: time(() => {
      // The same look again: the sheet forgets what it was built from, so it rebuilds as for a new snapshot.
      mode.lipSheet.setLook(mode.lipSheet.look);
      mode.lipSheet.update(snapshot.lip, snapshot.lipCount, dx);
    }),
  };
}

export async function runParticleBench(hooks: BenchHooks): Promise<void> {
  const status = document.createElement('div');
  status.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:1000;padding:6px 10px;background:#0d1117;color:#d6dde6;font:12px ui-monospace,monospace';
  document.body.append(status);
  const say = (text: string) => {
    status.textContent = `Particle bench (${SPOT} ${SWELL}, particles ${LEVEL}, ${LOOK}): ${text}`;
  };
  say('starting the sea…');
  hooks.setWaterLook(LOOK);
  await hooks.setTimeOfDay('midday');
  hooks.mode.setParticleLevel(LEVEL);
  const settings = physicalSettingsFor(SPOT, { swell: SWELL, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: COMPUTE });
  await hooks.start(settings, COMPUTE === 'auto' ? { componentCount: GPU_TIER_COMPONENTS } : undefined);
  hooks.resize(WIDTH, HEIGHT);
  const gl = hooks.canvas.getContext('webgl2')!;
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const maxPoint = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1];
  const camera = new PerspectiveCamera(52, WIDTH / HEIGHT, 0.1, 3000);
  const pixel = new Uint8Array(4);
  const idle = { paddle: false, popUp: false, steer: 0 };
  const moments: Moment[] = [];
  const { mode } = hooks;
  const startTime = mode.host!.snapshot.status.seaTime;
  const show = (variant: Variant) => {
    const at = VARIANTS.indexOf(variant);
    mode.spray.mesh.visible = at < 1;
    mode.bubbles.mesh.visible = at < 2;
    mode.lipSheet.mesh.visible = at < 3;
  };
  for (let at = FROM; at <= TO; at += EVERY) {
    const steps = Math.round((startTime + at - mode.host!.snapshot.status.seaTime) / STEP);
    if (steps > 0) await advance(hooks, steps, idle);
    hooks.render(0);
    const snapshot = mode.host!.snapshot;
    const kinds = [0, 0, 0, 0, 0];
    for (let k = 0; k < snapshot.sprayCount; k += 1) kinds[snapshot.spray[k * SPRAY_STRIDE + 5]] += 1;
    const centre = CENTRE?.length === 2 ? new Vector3(CENTRE[0], 0, CENTRE[1]) : busiest(mode) ?? new Vector3(mode.focus.x, 0, mode.focus.z);
    const moment: Moment = {
      seaTime: snapshot.status.seaTime, centre: [centre.x, centre.z], spray: snapshot.sprayCount, kinds, bubbles: snapshot.bubbleCount,
      lipParcels: snapshot.lipCount, page: pageWork(mode), views: {},
    };
    const surface = mode.host!.heightAt(centre.x, centre.z);
    for (const [name, scale] of Object.entries(VIEWS)) {
      camera.position.set(centre.x - 5 * scale, surface + 3.5 * scale, centre.z + 9 * scale);
      camera.lookAt(centre.x, surface + 1, centre.z - 6 * scale);
      camera.updateMatrixWorld();
      const wall: Record<Variant, number[]> = { drawn: [], noSpray: [], noBubbles: [], noLip: [] };
      const queries: { variant: Variant; query: WebGLQuery }[] = [];
      // Blocks of four frames per variant in turn, so a drift in the machine's load falls on all of them alike.
      for (let block = 0; block < FRAMES / 4 + 1; block += 1) {
        for (const variant of VARIANTS) {
          show(variant);
          for (let frame = 0; frame < 4; frame += 1) {
            const start = performance.now();
            const query = timer ? gl.createQuery() : null;
            if (timer && query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
            hooks.renderView(camera);
            if (timer && query) gl.endQuery(timer.TIME_ELAPSED_EXT);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            // The first block warms up.
            if (block > 0) {
              wall[variant].push(performance.now() - start);
              if (query) queries.push({ variant, query });
            } else if (query) {
              gl.deleteQuery(query);
            }
          }
        }
        await breathe();
      }
      show('drawn');
      let gpu: ByVariant | undefined;
      if (timer && queries.length > 0) {
        const times: Record<Variant, number[]> = { drawn: [], noSpray: [], noBubbles: [], noLip: [] };
        for (let tries = 0; tries < 200 && queries.some(({ query }) => !gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)); tries += 1) await breathe();
        const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT);
        for (const { variant, query } of queries) {
          if (!disjoint && gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) times[variant].push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
          gl.deleteQuery(query);
        }
        gpu = { drawn: median(times.drawn), noSpray: median(times.noSpray), noBubbles: median(times.noBubbles), noLip: median(times.noLip) };
      }
      moment.views[name] = {
        wall: { drawn: median(wall.drawn), noSpray: median(wall.noSpray), noBubbles: median(wall.noBubbles), noLip: median(wall.noLip) },
        gpu, ...sprayFragments(mode, camera, gl.drawingBufferWidth, gl.drawingBufferHeight, maxPoint),
      };
      if (name === 'front' && at === SHOT) {
        hooks.renderView(camera);
        const png = await new Promise<Blob | null>((resolve) => hooks.canvas.toBlob(resolve, 'image/png'));
        const file = `particles-${SPOT}-${SWELL}-${LEVEL}-${LOOK}-${WIDTH}.png`;
        if (png) await fetch(`${RECEIVER}/upload?name=${file}`, { method: 'POST', body: png }).catch(() => undefined);
      }
    }
    moments.push(moment);
    const front = moment.views.front;
    say(`${moment.seaTime.toFixed(0)} s: ${moment.spray} spray, ${moment.bubbles} bubbles · front ${front.wall.drawn.toFixed(1)} ms drawn, ${front.wall.noSpray.toFixed(1)} without spray`);
  }
  const of = (pick: (m: Moment) => number) => median(moments.map(pick));
  const cost = (name: string, source: 'wall' | 'gpu', from: Variant, to: Variant) =>
    of((m) => (m.views[name][source] ? m.views[name][source]![from] - m.views[name][source]![to] : Number.NaN));
  const summary = {
    spot: SPOT, swell: SWELL, level: LEVEL, look: LOOK, compute: mode.host!.snapshot.status.compute,
    size: `${gl.drawingBufferWidth} × ${gl.drawingBufferHeight}`, maxPoint, gpuTimer: Boolean(timer), moments: moments.length,
    spray: of((m) => m.spray), bubbles: of((m) => m.bubbles), lipParcels: of((m) => m.lipParcels),
    kinds: Object.fromEntries(KINDS.map((kind, index) => [kind, of((m) => m.kinds[index])])),
    pageMs: { spray: of((m) => m.page.spray), bubbles: of((m) => m.page.bubbles), lip: of((m) => m.page.lip) },
    views: Object.fromEntries(Object.keys(VIEWS).map((name) => [name, {
      frameMs: of((m) => m.views[name].wall.drawn),
      gpuFrameMs: of((m) => m.views[name].gpu?.drawn ?? Number.NaN),
      // What each hides saves: the spray, then the bubbles, then the lip sheet.
      sprayMs: cost(name, 'wall', 'drawn', 'noSpray'),
      bubblesMs: cost(name, 'wall', 'noSpray', 'noBubbles'),
      lipMs: cost(name, 'wall', 'noBubbles', 'noLip'),
      gpuSprayMs: cost(name, 'gpu', 'drawn', 'noSpray'),
      gpuBubblesMs: cost(name, 'gpu', 'noSpray', 'noBubbles'),
      gpuLipMs: cost(name, 'gpu', 'noBubbles', 'noLip'),
      fragmentsM: Object.fromEntries(KINDS.map((kind) => [kind, of((m) => m.views[name].fragments[kind] / 1e6)])),
      onScreen: of((m) => m.views[name].onScreen),
    }])),
  };
  Object.assign(window, { particleBench: { done: true, summary, moments } });
  say(`done · ${JSON.stringify(summary.views)}`);
}
