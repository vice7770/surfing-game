import {
  BufferAttribute, BufferGeometry, DataTexture, ExternalTexture, FloatType, GLSL3, HalfFloatType, LinearFilter, Mesh, NearestFilter,
  OrthographicCamera, RGBAFormat, RepeatWrapping, Scene, ShaderMaterial, WebGLRenderTarget, type Texture, type WebGLRenderer,
} from 'three';
import type { WaterLook } from './water/waterLook';
import {
  CHOP_LOOP, FFT_CHOP_PATCH, FFT_CHOP_SIZE, FINE_CHOP_PATCH, chopCascades, chopRadix, chopSpectrum, radixStages,
} from './fftChopMath';
import { CHOP_MOMENT_LEVELS, chopFieldUniforms } from './waterChop';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`;

/** Every pass's uniforms: the grid, the pass's sub-transform size (span) and its axis. */
const passPars = /* glsl */ `
uniform float size;
uniform float span;
uniform float alongRows;
varying vec2 vUv;
`;

/**
 * One radix-r Stockham pass of the inverse transform over two complex fields at once, one in xy and one in zw
 * (fftChopMath.stockhamRadixPass, per output texel): out = Σ_m in[j + m n/r] e^{2πi m q / r·s}, the turn taken as an
 * exact binary fraction before 2π. `FIELD_AT` reads an input along the pass's axis: the field texture, or the first
 * pass's spectrum.
 */
const radixPass = (radix: number) => /* glsl */ `
vec4 turn( vec4 a, vec2 w ) { return vec4( a.x * w.x - a.y * w.y, a.x * w.y + a.y * w.x, a.z * w.x - a.w * w.y, a.z * w.y + a.w * w.x ); }
vec4 radixPass() {
  vec2 cell = floor( vUv * size );
  float o = alongRows > 0.5 ? cell.x : cell.y;
  float q = mod( o, ${radix}.0 * span );
  float j = floor( o / ( ${radix}.0 * span ) ) * span + mod( q, span );
  vec4 sum = vec4( 0.0 );
  for ( int m = 0; m < ${radix}; m ++ ) {
    float index = j + float( m ) * size / ${radix}.0;
    vec2 at = alongRows > 0.5 ? vec2( index, cell.y ) : vec2( cell.x, index );
    float angle = 6.28318530718 * fract( float( m ) * q / ( ${radix}.0 * span ) );
    sum += turn( FIELD_AT( at ), vec2( cos( angle ), sin( angle ) ) );
  }
  return sum;
}
`;

/** Intermediate passes, and the Classic look's last: the transform so far, read from the other target. */
const butterflyShader = (radix: number) => /* glsl */ `
${passPars}
uniform sampler2D field;
#define FIELD_AT( at ) texelFetch( field, ivec2( at ), 0 )
${radixPass(radix)}
void main() {
  gl_FragColor = radixPass();
}
`;

/**
 * The first pass (rows, sub-transforms of one): the slope spectrum F = i kx h̃ − kz h̃ of each field at `time`
 * (fftChopMath.slopeSpectrum) made per input bin as the pass reads it, so the spectrum takes no pass of its own.
 * The h̃0 texture holds the coarse (or only) patch's n rows, then the fine patch's; `loopStep` > 0 rounds every ω to
 * the time loop (Rich), 0 keeps it exact (Classic).
 */
const firstShader = (radix: number) => /* glsl */ `
${passPars}
uniform sampler2D spectrum;
uniform vec2 patches;
uniform float time;
uniform float loopStep;
uniform float fine;
vec2 slopeSpectrumAt( vec2 bin, float row0, float side ) {
  vec2 wave = vec2( bin.x < size * 0.5 ? bin.x : bin.x - size, bin.y < size * 0.5 ? bin.y : bin.y - size ) * 6.28318530718 / side;
  float omega = sqrt( 9.81 * length( wave ) );
  if ( loopStep > 0.0 ) omega = floor( omega / loopStep + 0.5 ) * loopStep;
  vec4 h0 = texelFetch( spectrum, ivec2( bin ) + ivec2( 0, int( row0 ) ), 0 );
  float c = cos( omega * time );
  float s = sin( omega * time );
  float hr = h0.x * c - h0.y * s + h0.z * c + h0.w * s;
  float hi = h0.x * s + h0.y * c - h0.z * s + h0.w * c;
  return vec2( -wave.x * hi - wave.y * hr, wave.x * hr - wave.y * hi );
}
vec4 fieldsAt( vec2 bin ) {
  return vec4( slopeSpectrumAt( bin, 0.0, patches.x ), fine > 0.5 ? slopeSpectrumAt( bin, size, patches.y ) : vec2( 0.0 ) );
}
#define FIELD_AT( at ) fieldsAt( at )
${radixPass(radix)}
void main() {
  gl_FragColor = radixPass();
}
`;

/**
 * Rich's last pass (GLSL3, three targets): each cascade's slopes and second moments, (sx, sz, sx², sz²), and both
 * cascades' cross moments sx·sz, for the mip levels to box-filter into each footprint's mean and covariance.
 */
const momentShader = (radix: number) => /* glsl */ `
${passPars}
uniform sampler2D field;
layout( location = 0 ) out vec4 coarseMoments;
layout( location = 1 ) out vec4 fineMoments;
layout( location = 2 ) out vec4 crossMoments;
#define FIELD_AT( at ) texelFetch( field, ivec2( at ), 0 )
${radixPass(radix)}
void main() {
  vec4 s = radixPass();
  coarseMoments = vec4( s.xy, s.xy * s.xy );
  fineMoments = vec4( s.zw, s.zw * s.zw );
  crossMoments = vec4( s.x * s.y, s.z * s.w, 0.0, 1.0 );
}
`;

/**
 * A mip level of all three moment maps from the level above (box filter), the level above being each map's base
 * level while it is drawn: raw WebGL2, as three cannot draw into a level of a multiple-target texture.
 */
const mipVertex = `#version 300 es
void main() {
  vec2 p = vec2( float( ( gl_VertexID << 1 ) & 2 ), float( gl_VertexID & 2 ) );
  gl_Position = vec4( p * 2.0 - 1.0, 0.0, 1.0 );
}`;
const mipFragment = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D coarseLevel;
uniform sampler2D fineLevel;
uniform sampler2D crossLevel;
layout( location = 0 ) out vec4 coarseMoments;
layout( location = 1 ) out vec4 fineMoments;
layout( location = 2 ) out vec4 crossMoments;
vec4 box( sampler2D level ) {
  ivec2 p = ivec2( gl_FragCoord.xy ) * 2;
  return 0.25 * ( texelFetch( level, p, 0 ) + texelFetch( level, p + ivec2( 1, 0 ), 0 ) + texelFetch( level, p + ivec2( 0, 1 ), 0 ) + texelFetch( level, p + ivec2( 1, 1 ), 0 ) );
}
void main() {
  coarseMoments = box( coarseLevel );
  fineMoments = box( fineLevel );
  crossMoments = box( crossLevel );
}`;

/** Every pass shader's fragment source at a radix (for checks of the GLSL itself). */
export function chopPassShaders(radix = 4): { first: string; butterfly: string; moment: string; mip: string } {
  return { first: firstShader(radix), butterfly: butterflyShader(radix), moment: momentShader(radix), mip: mipFragment };
}

/**
 * Rich's moment maps, the chop's own (raw WebGL2, for one context): immutable textures with storage for mip levels 0
 * to CHOP_MOMENT_LEVELS (glGenerateMipmap on three of them costs more on the M1 than drawing the levels, and three's
 * textures cannot be immutable), a framebuffer per level, the target three draws level 0 through, the maps as the
 * water shaders sample them, and the mip passes' program.
 */
interface MomentMaps {
  gl: WebGL2RenderingContext;
  textures: WebGLTexture[];
  framebuffers: WebGLFramebuffer[];
  target: WebGLRenderTarget;
  maps: ExternalTexture[];
  program: WebGLProgram;
  vertexArray: WebGLVertexArrayObject;
}

/** The chop's sea: which look it is drawn for, and its wind and seed. */
interface Sea { wind: number; seed: number; look: WaterLook }

/**
 * The FFT chop (plan §2.2 WebGPU tier, P6; web-ocean plan, item 4): each new sea time, a 256² inverse FFT of the
 * wind sea's slope spectrum on the GPU, into a repeating slope map every water shader samples through
 * `waterChopSlope` (`chopFieldUniforms`). The spectrum follows the local wind.
 *
 * Radix-4 Stockham passes over two complex fields per RGBA texel, the spectrum made inside the first: 8 passes where
 * radix 2 took 17 (on the M1 a pass costs about its render pass's overhead; radix 16, 4 passes, timed slower there).
 * Classic draws one 64 m patch of waves 0.5–6 m, the same sea as before (`chopSpectrum`, exact ω, the second field
 * empty). Rich draws the same wind sea as two cascades in the one transform, a 64 m patch of the waves longer than
 * about 2 m and a 12.25 m patch of the shorter (`chopCascades`), their frequencies on a 600 s loop, and writes each
 * cascade's slope moments, with mip levels to CHOP_MOMENT_LEVELS (`waterChopStats`): the glitter's covariance.
 */
export class FftChop {
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: Mesh;
  private readonly firstMaterial: ShaderMaterial;
  private readonly butterflyMaterial: ShaderMaterial;
  private readonly ping: WebGLRenderTarget;
  private readonly pong: WebGLRenderTarget;
  /** The Classic slope map: (sx, sz) per texel, repeating every patch. */
  readonly output: WebGLRenderTarget;
  readonly radix: number;
  /** Rich's moments (made on its first use): coarse (sx, sz, sx², sz²), fine the same, and (sx·sz coarse, fine), with mip levels. */
  private moments?: MomentMaps;
  private momentMaterial?: ShaderMaterial;
  private spectrum?: DataTexture;
  private sea?: Sea;
  private drawnRenderer?: WebGLRenderer;
  private drawnSpectrum?: DataTexture;
  private drawnTime = Number.NaN;
  /** Passes issued by the last transform, the mip levels' included (0 when the held sea was reused). */
  lastPasses = 0;

  /** `radix`: 4, or 16 for a size that is a power of 16 (kept for timing it against 4). */
  constructor(readonly size = FFT_CHOP_SIZE, readonly patch = FFT_CHOP_PATCH, radix = chopRadix(size)) {
    if (radix ** radixStages(size, radix) !== size) throw new Error(`${size} is not a power of ${radix}`);
    this.radix = radix;
    // The same objects, in the same order, as before the cascades: three draws on Math.random for each one's id, and
    // the menus' sea seed comes after (docs/research/performance-2026-10-03). Rich's targets are made on first use.
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const work = { type: FloatType, format: RGBAFormat, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false, generateMipmaps: false } as const;
    this.ping = new WebGLRenderTarget(size, size, work);
    this.pong = new WebGLRenderTarget(size, size, work);
    this.output = new WebGLRenderTarget(size, size, {
      type: HalfFloatType, format: RGBAFormat, minFilter: LinearFilter, magFilter: LinearFilter,
      wrapS: RepeatWrapping, wrapT: RepeatWrapping, depthBuffer: false, generateMipmaps: false,
    });
    this.firstMaterial = new ShaderMaterial({
      uniforms: {
        spectrum: { value: null }, size: { value: size }, patches: { value: [patch, FINE_CHOP_PATCH] }, time: { value: 0 },
        loopStep: { value: 0 }, fine: { value: 0 }, span: { value: 1 }, alongRows: { value: 1 },
      },
      vertexShader, fragmentShader: firstShader(this.radix), depthTest: false, depthWrite: false,
    });
    this.butterflyMaterial = new ShaderMaterial({
      uniforms: { field: { value: null }, size: { value: size }, span: { value: 1 }, alongRows: { value: 1 } },
      vertexShader, fragmentShader: butterflyShader(this.radix), depthTest: false, depthWrite: false,
    });
    this.quad = new Mesh(geometry, this.firstMaterial);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** Build the spectrum for the local wind, m/s (positive onshore), drawn for `look`; an unchanged sea is kept. */
  setWind(windSpeed: number, seed = 1, look: WaterLook = 'classic'): void {
    const sea = this.sea;
    if (sea && sea.wind === windSpeed && sea.seed === seed && sea.look === look && this.spectrum) return;
    this.sea = { wind: windSpeed, seed, look };
    this.spectrum?.dispose();
    let data: Float32Array;
    if (look === 'rich') {
      const cascades = chopCascades(windSpeed, seed, this.size);
      data = cascades.spectrum;
      chopFieldUniforms.waterChopCoarseCov.value.set(...cascades.covariance.coarse);
      chopFieldUniforms.waterChopFineCov.value.set(...cascades.covariance.fine);
    } else {
      data = chopSpectrum(windSpeed, seed, this.size, this.patch);
    }
    this.spectrum = new DataTexture(data, this.size, look === 'rich' ? 2 * this.size : this.size, RGBAFormat, FloatType);
    this.spectrum.minFilter = NearestFilter;
    this.spectrum.magFilter = NearestFilter;
    this.spectrum.needsUpdate = true;
  }

  get look(): WaterLook {
    return this.sea?.look ?? 'classic';
  }

  /** Transform the sea at `time` into its slope map (Classic) or moments (Rich) and point the water shaders at it. */
  render(renderer: WebGLRenderer, time: number): void {
    if (!this.spectrum) this.setWind(0);
    // Display frames between snapshots share the same sea; the transform's output is already complete.
    if (renderer === this.drawnRenderer && this.spectrum === this.drawnSpectrum && time === this.drawnTime) {
      this.lastPasses = 0;
      this.useOutput();
      return;
    }
    const rich = this.look === 'rich';
    const previous = renderer.getRenderTarget();
    const first = this.firstMaterial.uniforms;
    first.spectrum.value = this.spectrum;
    // Rich's clock wraps on its loop (taken in double precision here), so its phases never lose float precision.
    first.time.value = rich ? time - Math.floor(time / CHOP_LOOP) * CHOP_LOOP : time;
    first.loopStep.value = rich ? (2 * Math.PI) / CHOP_LOOP : 0;
    first.fine.value = rich ? 1 : 0;
    const stages = radixStages(this.size, this.radix);
    const moments = rich ? this.momentMaps(renderer) : undefined;
    if (rich && !moments) {
      // Without WebGL2 the moments cannot be drawn: Rich falls back to the analytic chop's statistics.
      this.disable();
      return;
    }
    const last = moments ? moments.target : this.output;
    let from = this.ping;
    let to = this.pong;
    for (let pass = 0; pass < 2 * stages; pass += 1) {
      const final = pass === 2 * stages - 1;
      const material = pass === 0 ? this.firstMaterial : final && rich ? this.momentMaterial! : this.butterflyMaterial;
      material.uniforms.span.value = this.radix ** (pass % stages);
      material.uniforms.alongRows.value = pass < stages ? 1 : 0;
      if (pass > 0) material.uniforms.field.value = from.texture;
      this.quad.material = material;
      renderer.setRenderTarget(final ? last : pass === 0 ? from : to);
      renderer.render(this.scene, this.camera);
      if (pass > 0) [from, to] = [to, from];
    }
    renderer.setRenderTarget(previous);
    this.lastPasses = 2 * stages;
    if (moments) this.lastPasses += this.drawMips(renderer, moments);
    this.drawnRenderer = renderer;
    this.drawnSpectrum = this.spectrum;
    this.drawnTime = time;
    this.useOutput();
  }

  /** Rich's moment maps and its last pass's material, made on the first Rich transform (none without WebGL2). */
  private momentMaps(renderer: WebGLRenderer): MomentMaps | undefined {
    const gl = renderer.getContext();
    if (this.moments?.gl === gl) return this.moments;
    if (!(typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext)) return undefined;
    const levels = CHOP_MOMENT_LEVELS + 1;
    const textures = [gl.RGBA16F, gl.RGBA16F, gl.RG16F].map((format) => {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texStorage2D(gl.TEXTURE_2D, levels, format, this.size, this.size);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return texture;
    });
    gl.bindTexture(gl.TEXTURE_2D, null);
    const framebuffers: WebGLFramebuffer[] = [];
    for (let level = 0; level < levels; level += 1) {
      const framebuffer = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      textures.forEach((texture, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, texture, level));
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
      framebuffers.push(framebuffer);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, mipVertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, mipFragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`FftChop mip pass: ${gl.getProgramInfoLog(program)}`);
    gl.useProgram(program);
    ['coarseLevel', 'fineLevel', 'crossLevel'].forEach((name, unit) => gl.uniform1i(gl.getUniformLocation(program, name), unit));
    gl.useProgram(null);
    renderer.resetState();
    // three draws the last pass into level 0 through the chop's framebuffer, and samples the maps as they are.
    const target = new WebGLRenderTarget(this.size, this.size, { depthBuffer: false, count: 3 });
    (renderer as unknown as { setRenderTargetFramebuffer(target: WebGLRenderTarget, framebuffer: WebGLFramebuffer): void })
      .setRenderTargetFramebuffer(target, framebuffers[0]);
    const maps = textures.map((texture) => new ExternalTexture(texture));
    this.momentMaterial ??= new ShaderMaterial({
      uniforms: { field: { value: null }, size: { value: this.size }, span: { value: 1 }, alongRows: { value: 0 } },
      vertexShader, fragmentShader: momentShader(this.radix), glslVersion: GLSL3, depthTest: false, depthWrite: false,
    });
    this.moments = { gl, textures, framebuffers, target, maps, program, vertexArray: gl.createVertexArray()! };
    return this.moments;
  }

  /**
   * The moments' mip levels 1 to CHOP_MOMENT_LEVELS, each the box filter of the one above, in one raw-GL pass per
   * level writing all three maps. Returns the passes drawn.
   */
  private drawMips(renderer: WebGLRenderer, moments: MomentMaps): number {
    const { gl, textures, framebuffers, program, vertexArray } = moments;
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.useProgram(program);
    gl.bindVertexArray(vertexArray);
    for (let level = 1; level <= CHOP_MOMENT_LEVELS; level += 1) {
      textures.forEach((texture, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Sample only the level above, so the level drawn, attached, is no feedback loop.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, level - 1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, level - 1);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[level]);
      gl.viewport(0, 0, this.size >> level, this.size >> level);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    textures.forEach((texture, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, 0);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, CHOP_MOMENT_LEVELS);
    });
    gl.bindVertexArray(null);
    // three's cached state no longer holds: it sets what it needs again.
    renderer.resetState();
    return CHOP_MOMENT_LEVELS;
  }

  /** Rich's moments as the water shaders sample them: coarse, fine and cross, once a Rich transform has run. */
  get momentTextures(): readonly Texture[] | undefined {
    return this.moments?.maps;
  }

  /** Rich's moments as WebGL textures (the GPU check reads their levels back). */
  get momentGlTextures(): readonly WebGLTexture[] | undefined {
    return this.moments?.textures;
  }

  private useOutput(): void {
    const rich = this.look === 'rich' && this.moments;
    // The Classic interface (`waterChopSlope`, the caustics) reads xy of the coarse moments in Rich.
    chopFieldUniforms.waterChopMap.value = rich ? this.moments!.maps[0] : this.output.texture;
    chopFieldUniforms.waterChopPatch.value = this.patch;
    chopFieldUniforms.waterChopFft.value = 1;
    chopFieldUniforms.waterChopCascades.value = rich ? 1 : 0;
    if (rich) {
      chopFieldUniforms.waterChopFineMap.value = this.moments!.maps[1];
      chopFieldUniforms.waterChopCrossMap.value = this.moments!.maps[2];
      chopFieldUniforms.waterChopPatches.value.set(this.patch, FINE_CHOP_PATCH);
    }
  }

  /** Back to the procedural chop. */
  disable(): void {
    chopFieldUniforms.waterChopFft.value = 0;
    chopFieldUniforms.waterChopCascades.value = 0;
  }

  dispose(): void {
    this.disable();
    this.ping.dispose();
    this.pong.dispose();
    this.output.dispose();
    this.spectrum?.dispose();
    this.firstMaterial.dispose();
    this.butterflyMaterial.dispose();
    this.momentMaterial?.dispose();
    this.quad.geometry.dispose();
    if (this.moments) {
      const { gl, textures, framebuffers, target, maps, program, vertexArray } = this.moments;
      for (const texture of textures) gl.deleteTexture(texture);
      for (const framebuffer of framebuffers) gl.deleteFramebuffer(framebuffer);
      gl.deleteProgram(program);
      gl.deleteVertexArray(vertexArray);
      target.dispose();
      for (const map of maps) map.dispose();
      this.moments = undefined;
    }
  }
}
