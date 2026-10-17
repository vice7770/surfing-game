import type { WebGLRenderer, WebGLRenderTarget } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { FftChop, chopPassShaders } from './FftChop';
import { CHOP_LOOP, chopCascades } from './fftChopMath';
import { chopFieldUniforms, waterChopMomentPars } from './waterChop';
import { RICH_GLITTER_SLOPE, RICH_SHEET_GLITTER, richGlitterLights, waterGlitterPars } from './water/glitter';

function rendererStub() {
  const initial = {} as WebGLRenderTarget;
  let target: WebGLRenderTarget | null = initial;
  const targets: (WebGLRenderTarget | null)[] = [];
  const render = vi.fn(() => targets.push(target));
  const renderer = {
    getRenderTarget: () => target,
    setRenderTarget: (next: WebGLRenderTarget | null) => { target = next; },
    render,
    // No WebGL2 context: the moments' mip passes draw nothing here.
    getContext: () => ({}),
  } as unknown as WebGLRenderer;
  return { initial, renderer, render, targets };
}

/** Math.random draws while `make` runs: three takes four for each object's id. */
function randomDraws(make: () => void): number {
  const original = Math.random;
  let draws = 0;
  Math.random = () => {
    draws += 1;
    return original();
  };
  try {
    make();
  } finally {
    Math.random = original;
  }
  return draws;
}

describe('FFT chop snapshot reuse', () => {
  it('runs its 8 radix-4 passes once for a held sea and invalidates time, wind, seed and renderer changes', () => {
    const fft = new FftChop();
    const first = rendererStub();
    fft.setWind(3);
    fft.render(first.renderer, 10);
    expect(first.render).toHaveBeenCalledTimes(8);
    expect(fft.lastPasses).toBe(8);
    expect(first.renderer.getRenderTarget()).toBe(first.initial);
    for (let frame = 0; frame < 120; frame += 1) fft.render(first.renderer, 10);
    expect(first.render).toHaveBeenCalledTimes(8);
    expect(fft.lastPasses).toBe(0);
    // A temporary graphics change may disable the shared sampler without changing the cached transform.
    fft.disable();
    expect(chopFieldUniforms.waterChopFft.value).toBe(0);
    fft.render(first.renderer, 10);
    expect(first.render).toHaveBeenCalledTimes(8);
    expect(chopFieldUniforms.waterChopFft.value).toBe(1);
    expect(chopFieldUniforms.waterChopMap.value).toBe(fft.output.texture);
    fft.render(first.renderer, 11);
    fft.setWind(4);
    fft.render(first.renderer, 11);
    fft.setWind(4, 2);
    fft.render(first.renderer, 11);
    expect(first.render).toHaveBeenCalledTimes(32);
    const second = rendererStub();
    fft.render(second.renderer, 11);
    expect(second.render).toHaveBeenCalledTimes(8);
    expect(second.renderer.getRenderTarget()).toBe(second.initial);
    fft.dispose();
  });

  it('ping-pongs between its work targets and ends on the Classic map', () => {
    const fft = new FftChop();
    const stub = rendererStub();
    fft.setWind(3);
    fft.render(stub.renderer, 1);
    const [ping, pong] = [stub.targets[0], stub.targets[1]];
    expect(ping).not.toBe(pong);
    expect(stub.targets.slice(0, 7)).toEqual([ping, pong, ping, pong, ping, pong, ping]);
    expect(stub.targets[7]).toBe(fft.output);
    fft.dispose();
  });

  it('times the radix-16 transform it keeps for comparison in half the passes', () => {
    const fft = new FftChop(256, 64, 16);
    const stub = rendererStub();
    fft.render(stub.renderer, 1);
    expect(stub.render).toHaveBeenCalledTimes(4);
    expect(() => new FftChop(64, 64, 16)).toThrow();
    fft.dispose();
  });

  it('keys the transform by look: Rich builds its cascades\' spectrum, and without WebGL2 falls back to the analytic chop', () => {
    const fft = new FftChop();
    const stub = rendererStub();
    fft.setWind(5, 1, 'classic');
    fft.render(stub.renderer, CHOP_LOOP + 12.5);
    expect(stub.render).toHaveBeenCalledTimes(8);
    const spectrum = (fft as unknown as { spectrum: { image: { width: number; height: number } } }).spectrum;
    expect([spectrum.image.width, spectrum.image.height]).toEqual([256, 256]);
    fft.setWind(5, 1, 'rich');
    const rich = (fft as unknown as { spectrum: { image: { width: number; height: number } } }).spectrum;
    // The coarse patch's rows, then the fine patch's.
    expect([rich.image.width, rich.image.height]).toEqual([256, 512]);
    expect(fft.look).toBe('rich');
    // Past their last mip level the shaders take each cascade's whole-patch covariance, the spectrum's.
    const covariance = chopCascades(5, 1).covariance;
    expect(chopFieldUniforms.waterChopCoarseCov.value.toArray()).toEqual(covariance.coarse);
    expect(chopFieldUniforms.waterChopFineCov.value.toArray()).toEqual(covariance.fine);
    // The same sea time under the other look is another transform; this stub has no WebGL2, so Rich draws nothing.
    fft.render(stub.renderer, CHOP_LOOP + 12.5);
    expect(stub.render).toHaveBeenCalledTimes(8);
    expect(chopFieldUniforms.waterChopFft.value).toBe(0);
    expect(chopFieldUniforms.waterChopCascades.value).toBe(0);
    expect(fft.momentTextures).toBeUndefined();
    // Back to Classic, the held Classic sea is drawn again (its spectrum was rebuilt).
    fft.setWind(5, 1, 'classic');
    fft.render(stub.renderer, CHOP_LOOP + 12.5);
    expect(stub.render).toHaveBeenCalledTimes(16);
    expect(chopFieldUniforms.waterChopFft.value).toBe(1);
    expect(chopFieldUniforms.waterChopMap.value).toBe(fft.output.texture);
    const material = (fft as unknown as { firstMaterial: { uniforms: { time: { value: number }; loopStep: { value: number }; fine: { value: number } } } }).firstMaterial;
    expect(material.uniforms.time.value).toBe(CHOP_LOOP + 12.5);
    expect(material.uniforms.loopStep.value).toBe(0);
    expect(material.uniforms.fine.value).toBe(0);
    fft.dispose();
  });

  it('allocates as before: Rich\'s targets wait for its first transform, so the menus\' sea seed is unchanged', () => {
    // 72 draws: the constructor's objects before the cascades (docs/research/performance-2026-10-03).
    let fft!: FftChop;
    expect(randomDraws(() => { fft = new FftChop(); })).toBe(72);
    expect(randomDraws(() => fft.setWind(3))).toBe(8);
    expect(randomDraws(() => fft.setWind(3, 1, 'rich'))).toBe(8);
    expect(fft.momentTextures).toBeUndefined();
    fft.dispose();
  });
});

/** GLSL ES 3.00 keywords and words reserved for future use (§3.6–3.7) that a name could collide with. */
const GLSL_RESERVED = new Set(
  `attribute const uniform varying layout centroid flat smooth break continue do for while switch case default if else in out
  inout float int void bool true false invariant discard return struct precision lowp mediump highp uint coherent volatile
  restrict readonly writeonly resource atomic_uint noperspective patch sample subroutine common partition active asm class
  union enum typedef template this goto inline noinline public static extern external interface long short double half fixed
  unsigned superp input output filter sizeof cast namespace using`.split(/\s+/),
);

describe('the chop\'s and the glitter\'s GLSL', () => {
  it('names nothing with a GLSL ES 3.00 reserved word', () => {
    const passes = chopPassShaders();
    const sources = [
      passes.first, passes.butterfly, passes.moment, passes.mip,
      waterChopMomentPars, waterGlitterPars, RICH_GLITTER_SLOPE, RICH_SHEET_GLITTER, richGlitterLights(false), richGlitterLights(true),
    ];
    const declaration = /\b(?:float|int|bool|void|[iu]?vec[234]|mat[234]|sampler2D)\s+([A-Za-z_]\w*)/g;
    const names = new Set(sources.flatMap((source) => [...source.matchAll(declaration)].map((match) => match[1])));
    expect(names.size).toBeGreaterThan(20);
    expect([...names].filter((name) => GLSL_RESERVED.has(name))).toEqual([]);
  });
});
