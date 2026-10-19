import { AdditiveBlending, HalfFloatType, LinearFilter, ShaderMaterial, Vector2, WebGLRenderTarget, type Camera, type Object3D, type Texture, type WebGLRenderer } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import {
  AGX_INSET, AGX_MAX_EV, AGX_MIN_EV, AGX_OUTSET, AGX_SIGMOID, GLOW, LINEAR_SRGB_TO_REC2020, LUMA, REC2020_TO_LINEAR_SRGB,
  bloomSizes, glslMat3, type GlowSettings,
} from './glowMath';

/**
 * The glow and colour grade (the web-ocean plan, item 6; Rich water only, off
 * unless the player turns it on). The scene draws into a multisampled HDR
 * target instead of the canvas; its bright light (above a soft threshold) runs
 * down a mip chain from half resolution and back up, and one full-screen
 * composite adds it back, grades the frame with AgX and writes the canvas,
 * dithered. Nothing is allocated until the first frame drawn with it, and
 * `dispose` frees it all, so with the glow off the game draws as it always has.
 * The sky photo comes in as `PhotoBackground` draws it: the light the grade turns back
 * into the photo, at alpha 0, which keeps it out of the bloom.
 *
 * Passes a frame: the scene, `levels` downsamples (the first the prefilter),
 * `levels − 1` upsamples blended into the mip above, and the composite; only
 * the scene and the composite run at full resolution. The filters are Jorge
 * Jimenez's (Next Generation Post Processing in Call of Duty: Advanced Warfare,
 * SIGGRAPH 2014): the 13-tap downsample with the Karis average on the first,
 * and the 3×3 tent upsample. web-ocean (MIT, © 2026 Maksymilian Dendura)
 * builds its bloom the same way and was the reference; this is written anew.
 */

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`;

const downFragment = /* glsl */ `
uniform sampler2D source;
uniform vec2 texel;
uniform float threshold;
uniform float knee;
varying vec2 vUv;

vec3 tap( vec2 offset ) {
  vec4 c = texture2D( source, vUv + texel * offset );
  // A broken pixel (NaN or infinite, see the composite) must not flood the glow: it adds nothing.
  if ( any( isnan( c.rgb ) ) || any( isinf( c.rgb ) ) ) return vec3( 0.0 );
#ifdef PREFILTER
  // The sky photo writes alpha 0 (PhotoBackground): only what is drawn in front of it glows, as much as it covers.
  return clamp( c.rgb, 0.0, 6.0e4 ) * clamp( c.a, 0.0, 1.0 );
#else
  return clamp( c.rgb, 0.0, 6.0e4 );
#endif
}

void main() {
  vec3 a = tap( vec2( -2.0, -2.0 ) );
  vec3 b = tap( vec2( 0.0, -2.0 ) );
  vec3 c = tap( vec2( 2.0, -2.0 ) );
  vec3 d = tap( vec2( -2.0, 0.0 ) );
  vec3 e = tap( vec2( 0.0 ) );
  vec3 f = tap( vec2( 2.0, 0.0 ) );
  vec3 g = tap( vec2( -2.0, 2.0 ) );
  vec3 h = tap( vec2( 0.0, 2.0 ) );
  vec3 i = tap( vec2( 2.0, 2.0 ) );
  vec3 j = tap( vec2( -1.0, -1.0 ) );
  vec3 k = tap( vec2( 1.0, -1.0 ) );
  vec3 l = tap( vec2( -1.0, 1.0 ) );
  vec3 m = tap( vec2( 1.0, 1.0 ) );
  // Five overlapping 2×2 blocks: the four corner ones share half the weight, the centre one has the other half.
  vec3 b0 = ( a + b + d + e ) * 0.25;
  vec3 b1 = ( b + c + e + f ) * 0.25;
  vec3 b2 = ( d + e + g + h ) * 0.25;
  vec3 b3 = ( e + f + h + i ) * 0.25;
  vec3 b4 = ( j + k + l + m ) * 0.25;
#ifdef PREFILTER
  // The Karis average: each block weighed down by its brightness, so a lone glint cannot flash a whole mip.
  const vec3 luma = vec3( 0.2126, 0.7152, 0.0722 );
  float w0 = 0.125 / ( 1.0 + dot( b0, luma ) );
  float w1 = 0.125 / ( 1.0 + dot( b1, luma ) );
  float w2 = 0.125 / ( 1.0 + dot( b2, luma ) );
  float w3 = 0.125 / ( 1.0 + dot( b3, luma ) );
  float w4 = 0.5 / ( 1.0 + dot( b4, luma ) );
  vec3 color = ( b0 * w0 + b1 * w1 + b2 * w2 + b3 * w3 + b4 * w4 ) / ( w0 + w1 + w2 + w3 + w4 );
  // The soft threshold on the brightest channel (glowMath's softThreshold).
  float brightness = max( color.r, max( color.g, color.b ) );
  float soft = clamp( brightness - threshold + knee, 0.0, 2.0 * knee );
  soft = soft * soft / ( 4.0 * knee + 1e-5 );
  color *= max( soft, brightness - threshold ) / max( brightness, 1e-5 );
#else
  vec3 color = ( b0 + b1 + b2 + b3 ) * 0.125 + b4 * 0.5;
#endif
  gl_FragColor = vec4( color, 1.0 );
}
`;

const upFragment = /* glsl */ `
uniform sampler2D source;
uniform vec2 texel;
varying vec2 vUv;

vec3 tap( vec2 offset ) {
  return texture2D( source, vUv + texel * offset ).rgb;
}

void main() {
  vec3 color = tap( vec2( 0.0 ) ) * 4.0
    + ( tap( vec2( -1.0, 0.0 ) ) + tap( vec2( 1.0, 0.0 ) ) + tap( vec2( 0.0, -1.0 ) ) + tap( vec2( 0.0, 1.0 ) ) ) * 2.0
    + tap( vec2( -1.0, -1.0 ) ) + tap( vec2( 1.0, -1.0 ) ) + tap( vec2( -1.0, 1.0 ) ) + tap( vec2( 1.0, 1.0 ) );
  gl_FragColor = vec4( color / 16.0, 1.0 );
}
`;

const number = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
const [s6, s5, s4, s3, s2, s1, s0] = AGX_SIGMOID.map(number);

/** AgX as glowMath's `agx` computes it, from the same constants. */
export const AGX_GLSL = /* glsl */ `
uniform float exposure;
uniform float lookPower;
uniform float lookSaturation;

vec3 agxSigmoid( vec3 x ) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return ${s6} * x4 * x2 + ${s5} * x4 * x + ${s4} * x4 + ${s3} * x2 * x + ${s2} * x2 + ${s1} * x + ${s0};
}

vec3 agxGrade( vec3 color ) {
  color = ${glslMat3(AGX_INSET)} * ( ${glslMat3(LINEAR_SRGB_TO_REC2020)} * ( color * exposure ) );
  color = clamp( ( log2( max( color, 1e-10 ) ) - ${number(AGX_MIN_EV)} ) / ${number(AGX_MAX_EV - AGX_MIN_EV)}, 0.0, 1.0 );
  color = agxSigmoid( color );
  float luma = dot( color, vec3( ${LUMA.map(number).join(', ')} ) );
  color = luma + lookSaturation * ( pow( max( color, 0.0 ), vec3( lookPower ) ) - luma );
  color = pow( max( ${glslMat3(AGX_OUTSET)} * color, 0.0 ), vec3( 2.2 ) );
  return clamp( ${glslMat3(REC2020_TO_LINEAR_SRGB)} * color, 0.0, 1.0 );
}
`;

const compositeFragment = /* glsl */ `
uniform sampler2D sceneMap;
uniform sampler2D bloomMap;
uniform float bloomStrength;
uniform vec2 sceneTexel;
varying vec2 vUv;
${AGX_GLSL}
// Jimenez's interleaved gradient noise.
float gradientNoise( vec2 p ) {
  return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) );
}

bool broken( vec3 c ) {
  return any( isnan( c ) ) || any( isinf( c ) );
}

void main() {
  vec4 scene = texture2D( sceneMap, vUv );
  // The Rich water can leave a lone NaN pixel: the canvas drops it, a float target keeps it, so it takes its neighbour's colour.
  if ( broken( scene.rgb ) ) scene = texture2D( sceneMap, vUv + vec2( sceneTexel.x, 0.0 ) );
  if ( broken( scene.rgb ) ) scene = vec4( 0.0, 0.0, 0.0, 1.0 );
  // Negative light is dropped, except the sky's (alpha 0, PhotoBackground): the preimage of a saturated yellow is negative in blue.
  vec3 hdr = scene.rgb - clamp( scene.a, 0.0, 1.0 ) * min( scene.rgb, 0.0 ) + bloomStrength * texture2D( bloomMap, vUv ).rgb;
  gl_FragColor = vec4( agxGrade( hdr ), 1.0 );
  #include <colorspace_fragment>
  // Triangular dither of up to one step of the 8-bit canvas, against banding in the sky.
  float noise = gradientNoise( gl_FragCoord.xy ) + gradientNoise( gl_FragCoord.xy + vec2( 59.0, 23.0 ) ) - 1.0;
  gl_FragColor.rgb += noise / 255.0;
}
`;

function postMaterial(fragmentShader: string, uniforms: Record<string, { value: unknown }>, extra: Partial<ConstructorParameters<typeof ShaderMaterial>[0]> = {}): ShaderMaterial {
  return new ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false, ...extra });
}

export class GlowPass {
  /** The grade and glow in force; dev tools may tune them live. */
  readonly settings: GlowSettings = { ...GLOW };
  private sceneTarget?: WebGLRenderTarget;
  private mips: WebGLRenderTarget[] = [];
  private readonly quad = new FullScreenQuad();
  private readonly prefilter = postMaterial(downFragment, { source: { value: null }, texel: { value: new Vector2() }, threshold: { value: 1 }, knee: { value: 0.5 } }, { defines: { PREFILTER: '' } });
  private readonly down = postMaterial(downFragment, { source: { value: null }, texel: { value: new Vector2() }, threshold: { value: 1 }, knee: { value: 0.5 } });
  private readonly up = postMaterial(upFragment, { source: { value: null }, texel: { value: new Vector2() } }, { blending: AdditiveBlending, transparent: true });
  private readonly composite = postMaterial(compositeFragment, {
    sceneMap: { value: null }, bloomMap: { value: null }, bloomStrength: { value: 0 }, sceneTexel: { value: new Vector2() }, exposure: { value: 1 }, lookPower: { value: 1 }, lookSaturation: { value: 1 },
  });
  private readonly size = new Vector2();
  /** Full-screen draws the last frame made: the scene, the bloom's passes and the composite. */
  passes = 0;

  /** The HDR scene and the bloom's mips, once drawn; for checks. */
  get targets(): { scene?: WebGLRenderTarget; mips: readonly WebGLRenderTarget[] } {
    return { scene: this.sceneTarget, mips: this.mips };
  }

  /** Draw `scene` from `camera` with the glow and grade, onto the canvas. */
  render(renderer: WebGLRenderer, scene: Object3D, camera: Camera): void {
    const { x: width, y: height } = renderer.getDrawingBufferSize(this.size);
    const target = this.allocate(width, height, Math.min(this.settings.samples, renderer.capabilities.maxSamples));
    const previous = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    this.passes = 0;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    this.passes += 1;

    // Down the mips: each pass clears its target first (no load of the old contents on a tiled GPU) and overwrites it.
    renderer.autoClear = true;
    let source: Texture = target.texture;
    let texelWidth = 1 / width;
    let texelHeight = 1 / height;
    for (const [level, mip] of this.mips.entries()) {
      const material = level === 0 ? this.prefilter : this.down;
      material.uniforms.source.value = source;
      (material.uniforms.texel.value as Vector2).set(texelWidth, texelHeight);
      material.uniforms.threshold.value = this.settings.threshold;
      material.uniforms.knee.value = this.settings.knee;
      this.draw(renderer, material, mip);
      source = mip.texture;
      texelWidth = 1 / mip.width;
      texelHeight = 1 / mip.height;
    }
    // Back up: each mip's tent-filtered light is added onto the one above it.
    renderer.autoClear = false;
    for (let level = this.mips.length - 2; level >= 0; level -= 1) {
      const below = this.mips[level + 1];
      this.up.uniforms.source.value = below.texture;
      (this.up.uniforms.texel.value as Vector2).set(1 / below.width, 1 / below.height);
      this.draw(renderer, this.up, this.mips[level]);
    }
    // The composite: the scene plus its glow (the mips summed, so averaged here), graded, onto the canvas.
    renderer.autoClear = true;
    const uniforms = this.composite.uniforms;
    uniforms.sceneMap.value = target.texture;
    (uniforms.sceneTexel.value as Vector2).set(1 / width, 1 / height);
    uniforms.bloomMap.value = this.mips[0]?.texture ?? null;
    uniforms.bloomStrength.value = this.mips.length > 0 ? this.settings.strength / this.mips.length : 0;
    uniforms.exposure.value = this.settings.exposure;
    uniforms.lookPower.value = this.settings.lookPower;
    uniforms.lookSaturation.value = this.settings.lookSaturation;
    this.draw(renderer, this.composite, null);
    renderer.autoClear = autoClear;
    renderer.setRenderTarget(previous);
  }

  /** Free every target and program; the next `render` allocates again. */
  dispose(): void {
    this.sceneTarget?.dispose();
    this.sceneTarget = undefined;
    for (const mip of this.mips) mip.dispose();
    this.mips = [];
    for (const material of [this.prefilter, this.down, this.up, this.composite]) material.dispose();
    this.quad.dispose();
  }

  private draw(renderer: WebGLRenderer, material: ShaderMaterial, target: WebGLRenderTarget | null): void {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    this.quad.render(renderer);
    this.passes += 1;
  }

  /** The HDR scene target and the mips at the drawing buffer's size (three reallocates a resized target on its next use). */
  private allocate(width: number, height: number, samples: number): WebGLRenderTarget {
    if (!this.sceneTarget || this.sceneTarget.samples !== samples) {
      this.sceneTarget?.dispose();
      // The canvas's stencil too: the barrel's screen fallback draws through it.
      this.sceneTarget = new WebGLRenderTarget(width, height, {
        type: HalfFloatType, samples, depthBuffer: true, stencilBuffer: true, resolveDepthBuffer: false, resolveStencilBuffer: false,
        generateMipmaps: false, minFilter: LinearFilter, magFilter: LinearFilter,
      });
    }
    if (this.sceneTarget.width !== width || this.sceneTarget.height !== height) this.sceneTarget.setSize(width, height);
    const sizes = bloomSizes(width, height, this.settings.levels);
    while (this.mips.length > sizes.length) this.mips.pop()?.dispose();
    sizes.forEach((size, level) => {
      const mip = this.mips[level];
      if (!mip) {
        this.mips[level] = new WebGLRenderTarget(size.width, size.height, {
          type: HalfFloatType, depthBuffer: false, stencilBuffer: false, generateMipmaps: false, minFilter: LinearFilter, magFilter: LinearFilter,
        });
      } else if (mip.width !== size.width || mip.height !== size.height) {
        mip.setSize(size.width, size.height);
      }
    });
    return this.sceneTarget;
  }
}
