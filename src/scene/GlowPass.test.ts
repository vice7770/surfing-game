import { Scene, PerspectiveCamera, type ShaderMaterial, type Vector2, type WebGLRenderer, type WebGLRenderTarget } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { AGX_GLSL, GlowPass } from './GlowPass';
import { GLOW } from './glowMath';

function rendererStub(width: number, height: number) {
  let target: WebGLRenderTarget | null = null;
  const drawn: { target: WebGLRenderTarget | null; autoClear: boolean; material?: ShaderMaterial }[] = [];
  const renderer = {
    autoClear: true,
    capabilities: { maxSamples: 4 },
    getDrawingBufferSize: (out: Vector2) => out.set(width, height),
    getRenderTarget: () => target,
    setRenderTarget: (next: WebGLRenderTarget | null) => { target = next; },
    render: vi.fn((object: { material?: ShaderMaterial }) => { drawn.push({ target, autoClear: renderer.autoClear, material: object.material }); }),
  };
  return { renderer: renderer as unknown as WebGLRenderer & { autoClear: boolean }, drawn, resize: (w: number, h: number) => { width = w; height = h; } };
}

describe('the glow pass', () => {
  it('allocates nothing until it draws', () => {
    const glow = new GlowPass();
    expect(glow.targets.scene).toBeUndefined();
    expect(glow.targets.mips).toHaveLength(0);
    glow.dispose();
  });

  it('draws the scene, five downsamples, four upsamples and the composite, the last onto the canvas', () => {
    const glow = new GlowPass();
    const stub = rendererStub(1280, 800);
    const scene = new Scene();
    glow.render(stub.renderer, scene, new PerspectiveCamera());
    expect(stub.drawn).toHaveLength(1 + GLOW.levels + (GLOW.levels - 1) + 1);
    expect(glow.passes).toBe(11);
    const { scene: hdr, mips } = glow.targets;
    expect(hdr).toMatchObject({ width: 1280, height: 800, samples: 4, depthBuffer: true, stencilBuffer: true });
    expect(stub.drawn[0].target).toBe(hdr);
    expect(mips.map((mip) => [mip.width, mip.height])).toEqual([[640, 400], [320, 200], [160, 100], [80, 50], [40, 25]]);
    // Down 0 → 4, then up 3 → 0 without clearing (they add onto the mip), then the canvas.
    expect(stub.drawn.slice(1, 6).map((d) => d.target)).toEqual(mips);
    expect(stub.drawn.slice(6, 10).map((d) => d.target)).toEqual([mips[3], mips[2], mips[1], mips[0]]);
    expect(stub.drawn.slice(6, 10).every((d) => !d.autoClear)).toBe(true);
    expect(stub.drawn[10]).toMatchObject({ target: null, autoClear: true });
    expect(stub.renderer.autoClear).toBe(true);
    expect(stub.renderer.getRenderTarget()).toBeNull();
    glow.dispose();
    expect(glow.targets.scene).toBeUndefined();
  });

  it('takes the dev switch\'s MSAA samples in place of the default 4', () => {
    const glow = new GlowPass({ samples: 2 });
    glow.render(rendererStub(1280, 800).renderer, new Scene(), new PerspectiveCamera());
    expect(glow.targets.scene?.samples).toBe(2);
    expect(glow.settings.exposure).toBe(GLOW.exposure);
    glow.dispose();
    expect(new GlowPass().settings.samples).toBe(4);
  });

  it('follows the drawing buffer when the window or render scale changes', () => {
    const glow = new GlowPass();
    const stub = rendererStub(1280, 800);
    glow.render(stub.renderer, new Scene(), new PerspectiveCamera());
    const hdr = glow.targets.scene;
    stub.resize(2048, 1280);
    glow.render(stub.renderer, new Scene(), new PerspectiveCamera());
    expect(glow.targets.scene).toBe(hdr);
    expect(hdr).toMatchObject({ width: 2048, height: 1280 });
    expect(glow.targets.mips.at(-1)).toMatchObject({ width: 64, height: 40 });
    glow.dispose();
  });

  it("leaves the sky (alpha 0) out of the bloom, and keeps only the sky's negative light", () => {
    const glow = new GlowPass();
    // Only the first downsample reads the scene, so only it weighs by alpha.
    expect(glow['prefilter'].defines).toHaveProperty('PREFILTER');
    expect(glow['prefilter'].fragmentShader).toMatch(/#ifdef PREFILTER[\s\S]*clamp\( c\.rgb, 0\.0, 6\.0e4 \) \* clamp\( c\.a, 0\.0, 1\.0 \)/);
    expect(glow['composite'].fragmentShader).toContain('scene.rgb - clamp( scene.a, 0.0, 1.0 ) * min( scene.rgb, 0.0 )');
    glow.dispose();
  });

  it('grades with the constants glowMath checks', () => {
    expect(AGX_GLSL).toContain('-12.47393');
    expect(AGX_GLSL).toContain('0.856627153315983');
    expect(AGX_GLSL).toContain('15.5 * x4 * x2 + -40.14 * x4 * x');
  });
});
