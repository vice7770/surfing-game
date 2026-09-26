import type { AdvancedGraphics, ConcretePreset, Detection, GraphicsPreset, GraphicsSettings } from './Settings';

/** What each graphics preset sets (plan P8). Ultra supersamples; the Auto benchmark never picks it. */
export const PRESETS: Record<ConcretePreset, AdvancedGraphics> = {
  low: {
    renderScale: 0.75, nativePixelDensity: false, frameLimit: 'screen', waterSimulation: 'auto', seaDetail: 'standard',
    caustics: false, sprayMist: false, oceanView: 'near', foam: 'simple',
  },
  medium: {
    renderScale: 1, nativePixelDensity: false, frameLimit: 'screen', waterSimulation: 'auto', seaDetail: 'standard',
    caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed',
  },
  high: {
    renderScale: 1, nativePixelDensity: true, frameLimit: 'screen', waterSimulation: 'auto', seaDetail: 'rich',
    caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed',
  },
  ultra: {
    renderScale: 1.25, nativePixelDensity: true, frameLimit: 'screen', waterSimulation: 'auto', seaDetail: 'rich',
    caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed',
  },
};

/** Settings the running surf zone cannot change: they take effect on the next wave. */
export const NEXT_WAVE_FIELDS: readonly (keyof AdvancedGraphics)[] = ['waterSimulation', 'seaDetail'];

/** Choose a preset: its values are copied in (Auto copies the detected preset's); Custom keeps them. */
export function withPreset(graphics: GraphicsSettings, preset: GraphicsPreset, detected?: Detection): GraphicsSettings {
  if (preset === 'custom') return { ...graphics, preset };
  const source = preset === 'auto' ? PRESETS[detected?.preset ?? 'medium'] : PRESETS[preset];
  return { preset, ...source };
}

/** Change an advanced value by hand: the preset becomes Custom. */
export function withAdvanced(graphics: GraphicsSettings, patch: Partial<AdvancedGraphics>): GraphicsSettings {
  return { ...graphics, ...patch, preset: 'custom' };
}

/** The settings as the renderer and the next surf zone use them. */
export interface ResolvedGraphics {
  pixelRatio: number;
  /** Least time between rendered frames, ms; 0 renders every display frame. */
  frameInterval: number;
  stage: 1 | 2;
  compute: 'auto' | 'cpu';
  /** The GPU tier's 64-component sea and FFT chop, when the GPU steps the water. */
  richSea: boolean;
  caustics: boolean;
  sprayMist: boolean;
  oceanView: 'near' | 'far';
  detailedFoam: boolean;
  /** Show the menu's waves as a still frame instead of running them. */
  stillBackdrop: boolean;
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
    stillBackdrop: effective === 'low',
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

function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

/**
 * The Auto decision (plan P8), which is also the CPU fallback decided on
 * 2026-09-26: stage 2 only when its steps keep real time. The display's refresh
 * is taken from the fastest frames; the share of late frames picks the preset.
 */
export function choosePreset(sample: { frameIntervals: readonly number[]; stepMs: readonly number[]; gpuCompute: boolean }): Omit<Detection, 'adapter'> {
  const refresh = quantile(sample.frameIntervals, 0.1);
  const late = sample.frameIntervals.length === 0 ? 0
    : sample.frameIntervals.filter((interval) => interval > LATE_FACTOR * refresh).length / sample.frameIntervals.length;
  const water = sample.stepMs.length === 0 || quantile(sample.stepMs, 0.5) <= STAGE2_REALTIME_MS ? 'accurate' : 'fast';
  const preset: ConcretePreset = late <= 0.05 ? (sample.gpuCompute ? 'high' : 'medium') : 'low';
  return { preset, water, lowPerformance: late > 0.25 };
}

/** Collects frame intervals and worker step times until `BENCHMARK_SECONDS` of real frames are seen. */
export class BenchmarkRecorder {
  private readonly intervals: number[] = [];
  private readonly steps: number[] = [];
  private counted = 0;
  private gpu = false;

  add(intervalMs: number, stepMs: number | undefined, gpuCompute: boolean): void {
    if (!(intervalMs > 0) || intervalMs > MAX_SAMPLE_INTERVAL_MS) return;
    this.intervals.push(intervalMs);
    this.counted += intervalMs;
    if (stepMs !== undefined && Number.isFinite(stepMs) && stepMs > 0) this.steps.push(stepMs);
    this.gpu = gpuCompute;
  }

  get done(): boolean {
    return this.counted >= BENCHMARK_SECONDS * 1000;
  }

  result(): Omit<Detection, 'adapter'> {
    return choosePreset({ frameIntervals: this.intervals, stepMs: this.steps, gpuCompute: this.gpu });
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
