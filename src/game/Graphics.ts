import type { ShadowLevel } from '../scene/ShadowRig';
import type { WaterLook } from '../scene/water/waterLook';
import type { ParticleLevel } from '../wave/particleBudget';
import type { AdvancedGraphics, ConcretePreset, Detection, GlowAntialias, GraphicsPreset, GraphicsSettings } from './Settings';

/** What each graphics preset sets (plan P8). Ultra supersamples; the Auto benchmark never picks it. */
export const PRESETS: Record<ConcretePreset, AdvancedGraphics> = {
  low: {
    renderScale: 0.75, nativePixelDensity: false, frameLimit: 60, waterSimulation: 'auto', seaDetail: 'standard',
    caustics: false, sprayMist: false, oceanView: 'near', foam: 'simple', waterLook: 'classic', particles: 'low',
  },
  medium: {
    renderScale: 1, nativePixelDensity: false, frameLimit: 60, waterSimulation: 'auto', seaDetail: 'standard',
    caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich', particles: 'medium',
  },
  high: {
    renderScale: 1, nativePixelDensity: true, frameLimit: 60, waterSimulation: 'auto', seaDetail: 'rich',
    caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich', particles: 'high',
  },
  ultra: {
    renderScale: 1.25, nativePixelDensity: true, frameLimit: 60, waterSimulation: 'auto', seaDetail: 'rich',
    caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich', particles: 'high',
  },
};

/**
 * What each preset draws of the surfer (G7 Part B): its shadow, how far away
 * the full body still shows before the low-poly one takes over, m, and its
 * largest texture, px (the skin and hair are 2048 px).
 */
export const SURFER_DETAIL: Record<ConcretePreset, { shadows: ShadowLevel; surferLodDistance: number; textureCap: number }> = {
  low: { shadows: 'blob', surferLodDistance: 0, textureCap: 512 },
  medium: { shadows: 'rider', surferLodDistance: 8, textureCap: 1024 },
  high: { shadows: 'surfaces', surferLodDistance: 12, textureCap: 2048 },
  ultra: { shadows: 'soft', surferLodDistance: 20, textureCap: 2048 },
};

/** Settings the running surf zone cannot change: they take effect on the next wave. */
export const NEXT_WAVE_FIELDS: readonly (keyof AdvancedGraphics)[] = ['waterSimulation', 'seaDetail'];

/** Choose a preset: its values are copied in (Auto copies the detected preset's); Custom keeps them. The glow and its anti-aliasing are no preset's and stay. */
export function withPreset(graphics: GraphicsSettings, preset: GraphicsPreset, detected?: Detection): GraphicsSettings {
  if (preset === 'custom') return { ...graphics, preset };
  const source = preset === 'auto' ? PRESETS[detected?.preset ?? 'medium'] : PRESETS[preset];
  return { preset, ...source, glow: graphics.glow, glowAntialias: graphics.glowAntialias };
}

/** Change an advanced value by hand: the preset becomes Custom. */
export function withAdvanced(graphics: GraphicsSettings, patch: Partial<AdvancedGraphics>): GraphicsSettings {
  return { ...graphics, ...patch, preset: 'custom' };
}

/** The settings as the renderer and the next surf zone use them. */
export interface ResolvedGraphics {
  pixelRatio: number;
  /** Target render period, ms; 0 renders every display frame. */
  frameInterval: number;
  stage: 1 | 2;
  compute: 'auto' | 'cpu';
  /** The GPU tier's 64-component sea and FFT chop, when the GPU steps the water. */
  richSea: boolean;
  caustics: boolean;
  sprayMist: boolean;
  oceanView: 'near' | 'far';
  detailedFoam: boolean;
  /** G8: which water look to draw. */
  waterLook: WaterLook;
  /** The glow and colour grade: asked for, on the Rich look (Classic, Low's look, never pays for it). */
  glow: boolean;
  /** The glow's MSAA samples, 2 or 4. */
  glowSamples: GlowAntialias;
  /** How many whitewater particles the sea keeps (visual only). */
  particles: ParticleLevel;
  /** Show the menu's waves as a still frame instead of running them. */
  stillBackdrop: boolean;
  shadows: ShadowLevel;
  surferLodDistance: number;
  textureCap: number;
}

/**
 * `?glow=1` or `?glow=0` (dev): the glow and colour grade on or off for an A/B, whatever the saved setting, still on
 * the Rich look only; any other value leaves the setting.
 */
export function withGlowOverride(resolved: ResolvedGraphics, param: string | null): ResolvedGraphics {
  if (param === '1') return { ...resolved, glow: resolved.waterLook === 'rich' };
  if (param === '0') return { ...resolved, glow: false };
  return resolved;
}

/**
 * The player's own surfer's detail (the riding-body plan, step 1): always the
 * full body (the gameplay camera sits about 11 m off, past Medium's 8 m for the
 * low-poly one), at the preset's textures. Online surfers keep the preset's.
 */
export function ownSurferDetail(resolved: ResolvedGraphics): { lodDistance: number; textureCap: number } {
  return { lodDistance: Infinity, textureCap: resolved.textureCap };
}

/** The sharpest pixel ratio drawn at native density; beyond it the cost outweighs what shows. */
const MAX_NATIVE_PIXEL_RATIO = 1.75;

export function resolveGraphics(graphics: GraphicsSettings, detected: Detection | undefined, devicePixelRatio: number): ResolvedGraphics {
  const density = graphics.nativePixelDensity ? Math.min(Math.max(1, devicePixelRatio || 1), MAX_NATIVE_PIXEL_RATIO) : 1;
  const water = graphics.waterSimulation === 'auto' ? detected?.water ?? 'accurate' : graphics.waterSimulation;
  const effective = graphics.preset === 'auto' ? detected?.preset ?? 'medium' : graphics.preset;
  return {
    pixelRatio: density * graphics.renderScale,
    frameInterval: graphics.frameLimit === 'screen' ? 0 : 1000 / graphics.frameLimit,
    stage: water === 'fast' ? 1 : 2,
    compute: water === 'fast' ? 'cpu' : 'auto',
    richSea: graphics.seaDetail === 'rich',
    caustics: graphics.caustics,
    sprayMist: graphics.sprayMist,
    oceanView: graphics.oceanView,
    detailedFoam: graphics.foam === 'detailed',
    waterLook: graphics.waterLook,
    glow: graphics.glow && graphics.waterLook === 'rich',
    glowSamples: graphics.glowAntialias,
    particles: graphics.particles,
    stillBackdrop: effective === 'low',
    // Custom tunes only the advanced values: the surfer follows the detected preset.
    ...SURFER_DETAIL[effective === 'custom' ? detected?.preset ?? 'medium' : effective],
  };
}

/**
 * The longest worker step, ms, at which stage 2 keeps real time: one step per
 * 1/60 s leaves 1.7 ms of headroom. Provisional: P5 measured 12–15 ms per step on
 * the CPU and P6 4.6 ms on the GPU, on the development Mac.
 */
export const STAGE2_REALTIME_MS = 15;
/** Seconds of frames the Auto benchmark watches. */
export const BENCHMARK_SECONDS = 6;
/** Longer gaps (a hidden tab, a stall while spinning up) say nothing about the device and are ignored. */
export const MAX_SAMPLE_INTERVAL_MS = 250;
/** A frame this much longer than the display's refresh counts as late. */
const LATE_FACTOR = 1.5;

/** The worker's budget for one fixed 1/60 s water step, ms: a step that takes longer leaves the sea behind real time. */
export const STEP_BUDGET_MS = 1000 / 60;
/**
 * Sea seconds per wall second under which the menu's own sea counts as falling behind (the M1 readback study,
 * 2026-10-17). Its host drops the steps a slow worker cannot take, so a sea that keeps up advances at 1.0 to within a
 * few per cent over the benchmark's 6 s, and one whose worker (or its share of the GPU) is short runs proportionally
 * slower: 0.9 is a step of about 18.5 ms against the 16.7 ms budget.
 */
export const MIN_SEA_RATE = 0.9;
/**
 * A ride's worker step over the menu's riderless practice sea, on the same machine (the M1 readback study,
 * 2026-10-17): the rider's board and body, a bigger swell's breaking, and High's 64-component sea. Measured on an M1
 * as 16.4 ms (Canyon Medium, ridden, 64 components) against 13.7 ms (the menu's Canyon practice sea); see
 * docs/research/m1-readback-2026-10-17/README.md. Padang Padang's swept-barrel contact costs far more than this.
 */
export const RIDE_WORKER_FACTOR = 1.2;

function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

/** What the Auto benchmark saw of the menu's waves. */
export interface BenchmarkSample {
  frameIntervals: readonly number[];
  /** The worker's water-and-board step, ms, per frame (`SurfZoneStatus.stepMs`). */
  stepMs: readonly number[];
  gpuCompute: boolean;
  /** The worker's whole time per fresh step, ms (`pipelineMs.total`: the step, its snapshot and publication). */
  workerMs?: readonly number[];
  /** Sea seconds the menu's waves advanced per wall second over the counted frames. */
  seaRate?: number;
}

/** The share of frames longer than LATE_FACTOR display refreshes (`refresh`, ms, else the fastest tenth's). */
function lateShare(intervals: readonly number[], refresh = quantile(intervals, 0.1)): number {
  return intervals.length === 0 ? 0 : intervals.filter((interval) => interval > LATE_FACTOR * refresh).length / intervals.length;
}

/** Whether the sea kept real time with room for a ride's step (the M1 readback study); true where the worker was not seen. */
function seaKeepsUp(sample: BenchmarkSample): boolean {
  if (sample.seaRate !== undefined && sample.seaRate < MIN_SEA_RATE) return false;
  return !sample.workerMs?.length || RIDE_WORKER_FACTOR * quantile(sample.workerMs, 0.5) <= STEP_BUDGET_MS;
}

/**
 * The Auto decision (plan P8), which is also the CPU fallback decided on
 * 2026-09-26: stage 2 only when its steps keep real time. The display's refresh
 * is taken from the fastest frames; the share of late frames picks the preset.
 *
 * Frames alone overrated a GPU that the page's drawing and the water share: an M1 Air rated High drew 14 fps with its
 * sea at a fifth of real time. So where the benchmark also saw the worker (the M1 readback study, 2026-10-17), the
 * menu's sea must keep real time with room for a ride's step, or the verdict is Low; and a GPU verdict of High stands
 * only once High's own drawing has been seen to hold (`highHolds`), else it is Medium.
 */
export function choosePreset(sample: BenchmarkSample): Omit<Detection, 'adapter'> {
  const late = lateShare(sample.frameIntervals);
  const water = sample.stepMs.length === 0 || quantile(sample.stepMs, 0.5) <= STAGE2_REALTIME_MS ? 'accurate' : 'fast';
  // A stage 1 verdict times a sea the rides will not run: only stage 2's worker is judged.
  const keepsUp = water === 'fast' || seaKeepsUp(sample);
  const preset: ConcretePreset = late <= 0.05 && keepsUp ? (sample.gpuCompute ? 'high' : 'medium') : 'low';
  return { preset, water, lowPerformance: late > 0.25 };
}

/**
 * The High trial (the M1 readback study, 2026-10-17): after Medium held, the menu runs on High's values and High is
 * kept only if its frames stay on time against the display refresh seen on Medium (`refresh`, ms; a steady 30 fps is
 * not on time) and its sea, now sharing the GPU with High's drawing, still keeps real time with room for a ride.
 */
export function highHolds(sample: BenchmarkSample, refresh: number): boolean {
  return sample.frameIntervals.length > 0 && lateShare(sample.frameIntervals, refresh) <= 0.05 && seaKeepsUp(sample);
}

/** A sea-time jump past this between two frames is a new sea (or a restore), not progress. */
const MAX_SEA_ADVANCE_S = 1;

/**
 * Collects frame intervals and worker step times until `BENCHMARK_SECONDS` of real frames are seen, and, given the
 * sea's clock and the worker's time per step, how fast the menu's sea keeps up.
 */
export class BenchmarkRecorder {
  private readonly intervals: number[] = [];
  private readonly steps: number[] = [];
  private readonly worker: number[] = [];
  private counted = 0;
  private gpu = false;
  private seaTime?: number;
  private seaAdvance = 0;
  private seaWall = 0;

  add(intervalMs: number, stepMs: number | undefined, gpuCompute: boolean, sea?: { seaTime: number; workerMs?: number }): void {
    if (!(intervalMs > 0) || intervalMs > MAX_SAMPLE_INTERVAL_MS) {
      this.seaTime = undefined;
      return;
    }
    this.intervals.push(intervalMs);
    this.counted += intervalMs;
    if (stepMs !== undefined && Number.isFinite(stepMs) && stepMs > 0) this.steps.push(stepMs);
    this.gpu = gpuCompute;
    if (!sea || !Number.isFinite(sea.seaTime)) return;
    const advance = this.seaTime === undefined ? undefined : sea.seaTime - this.seaTime;
    if (advance !== undefined && advance >= 0 && advance <= MAX_SEA_ADVANCE_S) {
      this.seaAdvance += advance;
      this.seaWall += intervalMs;
      // A fresh snapshot carries its step's worker time; a repeated one says nothing new.
      if (advance > 0 && sea.workerMs !== undefined && Number.isFinite(sea.workerMs) && sea.workerMs > 0) this.worker.push(sea.workerMs);
    }
    this.seaTime = sea.seaTime;
  }

  get done(): boolean {
    return this.counted >= BENCHMARK_SECONDS * 1000;
  }

  /** Sea seconds per wall second over the frames that saw the sea, or undefined before any. */
  get seaRate(): number | undefined {
    return this.seaWall > 0 ? this.seaAdvance / (this.seaWall / 1000) : undefined;
  }

  /** Whether the sea's clock was seen: only then does a High verdict wait for its trial. */
  get sawSea(): boolean {
    return this.seaWall > 0;
  }

  /** The display's refresh as these frames show it, ms. */
  get refresh(): number {
    return quantile(this.intervals, 0.1);
  }

  sample(): BenchmarkSample {
    return {
      frameIntervals: this.intervals, stepMs: this.steps, gpuCompute: this.gpu,
      ...(this.worker.length ? { workerMs: this.worker } : {}),
      ...(this.seaRate !== undefined ? { seaRate: this.seaRate } : {}),
    };
  }

  result(): Omit<Detection, 'adapter'> {
    return choosePreset(this.sample());
  }
}

/** What the Auto benchmark asks of the app after a frame: run on High's values for its trial, or take this verdict. */
export type BenchmarkStep = { tryHigh: Omit<Detection, 'adapter'> } | { verdict: Omit<Detection, 'adapter'> } | undefined;

/**
 * The Auto benchmark (plan P8) as the app drives it: 6 s of the menu's waves on Medium's values, then, when Medium held
 * on a GPU with the worker in view, 6 s on High's values, its trial (the M1 readback study, 2026-10-17). High is the
 * verdict only once its own drawing has held (`highHolds`); a failed or abandoned trial leaves Medium.
 */
export class AutoBenchmark {
  private recorder = new BenchmarkRecorder();
  private trial?: { verdict: Omit<Detection, 'adapter'>; refresh: number };
  /** What each part saw (for `?diagnostics`): its late share, sea rate and median worker step, ms. */
  readonly seen: { values: 'medium' | 'high'; late: number; seaRate?: number; workerMs?: number }[] = [];

  /** Whether High's values are on trial. */
  get trying(): boolean {
    return this.trial !== undefined;
  }

  add(intervalMs: number, stepMs: number | undefined, gpuCompute: boolean, sea?: { seaTime: number; workerMs?: number }): BenchmarkStep {
    this.recorder.add(intervalMs, stepMs, gpuCompute, sea);
    if (!this.recorder.done) return undefined;
    const { trial, recorder } = this;
    const sample = recorder.sample();
    this.seen.push({
      values: trial ? 'high' : 'medium', late: lateShare(sample.frameIntervals, trial?.refresh), seaRate: sample.seaRate,
      workerMs: sample.workerMs && quantile(sample.workerMs, 0.5),
    });
    if (trial) {
      this.trial = undefined;
      return { verdict: highHolds(sample, trial.refresh) ? trial.verdict : { ...trial.verdict, preset: 'medium' } };
    }
    const verdict = recorder.result();
    if (verdict.preset !== 'high' || !recorder.sawSea) return { verdict };
    this.trial = { verdict, refresh: recorder.refresh };
    this.recorder = new BenchmarkRecorder();
    return { tryHigh: verdict };
  }

  /** The menu was left mid-trial: Medium's verdict, since High was not seen to hold; undefined outside a trial. */
  abandon(): Omit<Detection, 'adapter'> | undefined {
    const verdict = this.trial && { ...this.trial.verdict, preset: 'medium' as const };
    this.trial = undefined;
    return verdict;
  }
}

/** Auto needs a benchmark when it has none, or the graphics adapter changed since. */
export function needsDetection(graphics: GraphicsSettings, detected: Detection | undefined, adapter: string): boolean {
  return graphics.preset === 'auto' && (!detected || detected.adapter !== adapter);
}

/** The graphics adapter's name, to notice a new one; the unmasked name where the browser gives it. */
export function adapterName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return typeof name === 'string' ? name : 'unknown';
}
