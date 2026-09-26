import {
  BufferAttribute, BufferGeometry, DataTexture, FloatType, HalfFloatType, LinearFilter, Mesh, NearestFilter, OrthographicCamera,
  RGBAFormat, RepeatWrapping, Scene, ShaderMaterial, WebGLRenderTarget, type WebGLRenderer,
} from 'three';
import { FFT_CHOP_PATCH, FFT_CHOP_SIZE, chopSpectrum } from './fftChopMath';
import { chopFieldUniforms } from './waterChop';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`;

/** The slope spectrum F = i kx h̃ − kz h̃ at `time` (fftChopMath.slopeSpectrum, per texel). */
const spectrumShader = /* glsl */ `
uniform sampler2D spectrum;
uniform float size;
uniform float patchSize;
uniform float time;
varying vec2 vUv;
void main() {
  vec2 cell = floor( vUv * size );
  vec2 bin = vec2( cell.x < size * 0.5 ? cell.x : cell.x - size, cell.y < size * 0.5 ? cell.y : cell.y - size );
  vec2 wave = bin * 6.28318530718 / patchSize;
  float omega = sqrt( 9.81 * length( wave ) );
  vec4 h0 = texture2D( spectrum, ( cell + 0.5 ) / size );
  float c = cos( omega * time );
  float s = sin( omega * time );
  float hr = h0.x * c - h0.y * s + h0.z * c + h0.w * s;
  float hi = h0.x * s + h0.y * c - h0.z * s + h0.w * c;
  gl_FragColor = vec4( -wave.x * hi - wave.y * hr, wave.x * hr - wave.y * hi, 0.0, 1.0 );
}
`;

/** One radix-2 Stockham pass of the inverse transform (fftChopMath.stockhamPass, per output texel). */
const butterflyShader = /* glsl */ `
uniform sampler2D field;
uniform float size;
uniform float span;
uniform float alongRows;
varying vec2 vUv;
void main() {
  vec2 cell = floor( vUv * size );
  float o = alongRows > 0.5 ? cell.x : cell.y;
  float q = mod( o, 2.0 * span );
  float within = mod( q, span );
  float j = floor( o / ( 2.0 * span ) ) * span + within;
  vec2 aCell = alongRows > 0.5 ? vec2( j, cell.y ) : vec2( cell.x, j );
  vec2 bCell = alongRows > 0.5 ? vec2( j + size * 0.5, cell.y ) : vec2( cell.x, j + size * 0.5 );
  vec2 a = texture2D( field, ( aCell + 0.5 ) / size ).xy;
  vec2 b = texture2D( field, ( bCell + 0.5 ) / size ).xy;
  float angle = 3.14159265359 * within / span;
  vec2 twiddle = vec2( cos( angle ), sin( angle ) );
  vec2 turned = vec2( b.x * twiddle.x - b.y * twiddle.y, b.x * twiddle.y + b.y * twiddle.x );
  gl_FragColor = vec4( q >= span ? a - turned : a + turned, 0.0, 1.0 );
}
`;

/**
 * The FFT chop (plan §2.2 WebGPU tier, P6): each frame a 256² inverse FFT of the
 * wind sea's slope spectrum on the GPU, 17 full-screen passes, into a
 * repeating slope map every water shader samples through `waterChopSlope`
 * (`chopFieldUniforms`). The spectrum follows the local wind.
 */
export class FftChop {
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: Mesh;
  private readonly spectrumMaterial: ShaderMaterial;
  private readonly butterflyMaterial: ShaderMaterial;
  private readonly ping: WebGLRenderTarget;
  private readonly pong: WebGLRenderTarget;
  /** The slope map the water shaders read: (sx, sz) per texel, repeating every patch. */
  readonly output: WebGLRenderTarget;
  private spectrum?: DataTexture;
  private wind = Number.NaN;

  constructor(readonly size = FFT_CHOP_SIZE, readonly patch = FFT_CHOP_PATCH) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const work = { type: FloatType, format: RGBAFormat, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false, generateMipmaps: false } as const;
    this.ping = new WebGLRenderTarget(size, size, work);
    this.pong = new WebGLRenderTarget(size, size, work);
    this.output = new WebGLRenderTarget(size, size, {
      type: HalfFloatType, format: RGBAFormat, minFilter: LinearFilter, magFilter: LinearFilter,
      wrapS: RepeatWrapping, wrapT: RepeatWrapping, depthBuffer: false, generateMipmaps: false,
    });
    this.spectrumMaterial = new ShaderMaterial({
      uniforms: { spectrum: { value: null }, size: { value: size }, patchSize: { value: patch }, time: { value: 0 } },
      vertexShader, fragmentShader: spectrumShader, depthTest: false, depthWrite: false,
    });
    this.butterflyMaterial = new ShaderMaterial({
      uniforms: { field: { value: null }, size: { value: size }, span: { value: 1 }, alongRows: { value: 1 } },
      vertexShader, fragmentShader: butterflyShader, depthTest: false, depthWrite: false,
    });
    this.quad = new Mesh(geometry, this.spectrumMaterial);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** Build the spectrum for the local wind, m/s (positive onshore); unchanged wind keeps the sea. */
  setWind(windSpeed: number, seed = 1): void {
    if (windSpeed === this.wind && this.spectrum) return;
    this.wind = windSpeed;
    this.spectrum?.dispose();
    this.spectrum = new DataTexture(chopSpectrum(windSpeed, seed, this.size, this.patch), this.size, this.size, RGBAFormat, FloatType);
    this.spectrum.minFilter = NearestFilter;
    this.spectrum.magFilter = NearestFilter;
    this.spectrum.needsUpdate = true;
  }

  /** Transform the sea at `time` into the slope map and point the water shaders at it. */
  render(renderer: WebGLRenderer, time: number): void {
    if (!this.spectrum) this.setWind(0);
    const previous = renderer.getRenderTarget();
    this.quad.material = this.spectrumMaterial;
    this.spectrumMaterial.uniforms.spectrum.value = this.spectrum;
    this.spectrumMaterial.uniforms.time.value = time;
    renderer.setRenderTarget(this.ping);
    renderer.render(this.scene, this.camera);
    this.quad.material = this.butterflyMaterial;
    const stages = Math.round(Math.log2(this.size));
    let from = this.ping;
    let to = this.pong;
    for (let pass = 0; pass < 2 * stages; pass += 1) {
      const last = pass === 2 * stages - 1;
      this.butterflyMaterial.uniforms.field.value = from.texture;
      this.butterflyMaterial.uniforms.span.value = 1 << (pass % stages);
      this.butterflyMaterial.uniforms.alongRows.value = pass < stages ? 1 : 0;
      renderer.setRenderTarget(last ? this.output : to);
      renderer.render(this.scene, this.camera);
      [from, to] = [to, from];
    }
    renderer.setRenderTarget(previous);
    chopFieldUniforms.waterChopMap.value = this.output.texture;
    chopFieldUniforms.waterChopPatch.value = this.patch;
    chopFieldUniforms.waterChopFft.value = 1;
  }

  /** Back to the procedural chop. */
  disable(): void {
    chopFieldUniforms.waterChopFft.value = 0;
  }

  dispose(): void {
    this.disable();
    this.ping.dispose();
    this.pong.dispose();
    this.output.dispose();
    this.spectrum?.dispose();
    this.spectrumMaterial.dispose();
    this.butterflyMaterial.dispose();
    this.quad.geometry.dispose();
  }
}
