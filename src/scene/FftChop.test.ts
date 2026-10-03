import type { WebGLRenderer, WebGLRenderTarget } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { FftChop } from './FftChop';
import { chopFieldUniforms } from './waterChop';

function rendererStub() {
  const initial = {} as WebGLRenderTarget;
  let target: WebGLRenderTarget | null = initial;
  const render = vi.fn();
  const renderer = {
    getRenderTarget: () => target,
    setRenderTarget: (next: WebGLRenderTarget | null) => { target = next; },
    render,
  } as unknown as WebGLRenderer;
  return { initial, renderer, render };
}

describe('FFT chop snapshot reuse', () => {
  it('runs its 17 passes once for a held sea and invalidates time, wind, seed and renderer changes', () => {
    const fft = new FftChop();
    const first = rendererStub();
    fft.setWind(3);
    fft.render(first.renderer, 10);
    expect(first.render).toHaveBeenCalledTimes(17);
    expect(first.renderer.getRenderTarget()).toBe(first.initial);
    for (let frame = 0; frame < 120; frame += 1) fft.render(first.renderer, 10);
    expect(first.render).toHaveBeenCalledTimes(17);
    // A temporary graphics change may disable the shared sampler without changing the cached transform.
    fft.disable();
    expect(chopFieldUniforms.waterChopFft.value).toBe(0);
    fft.render(first.renderer, 10);
    expect(first.render).toHaveBeenCalledTimes(17);
    expect(chopFieldUniforms.waterChopFft.value).toBe(1);
    expect(chopFieldUniforms.waterChopMap.value).toBe(fft.output.texture);
    fft.render(first.renderer, 11);
    fft.setWind(4);
    fft.render(first.renderer, 11);
    fft.setWind(4, 2);
    fft.render(first.renderer, 11);
    expect(first.render).toHaveBeenCalledTimes(68);
    const second = rendererStub();
    fft.render(second.renderer, 11);
    expect(second.render).toHaveBeenCalledTimes(17);
    expect(second.renderer.getRenderTarget()).toBe(second.initial);
    fft.dispose();
  });
});
