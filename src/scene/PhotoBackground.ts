import {
  BackSide, BoxGeometry, ClampToEdgeWrapping, Data3DTexture, DataUtils, HalfFloatType, LinearFilter, Matrix3, Matrix4, Mesh,
  NoBlending, RGBAFormat, ShaderMaterial, type Euler, type IUniform, type Texture,
} from 'three';
import { AGX_DECODE, AGX_MAX_EV, AGX_MIN_EV, PREIMAGE_TABLE_SIZE, agxPreimageTable, type GlowSettings } from './glowMath';

/**
 * The sky photo, drawn straight from the photo. Three draws an equirect
 * `scene.background` by first turning it into a cube map with faces as tall as
 * the photo, each with its own depth buffer: 235 MB for a 4096 × 2048 photo
 * (`photoBackgroundMemory`). This box around the camera samples the photo
 * itself instead, as three's background would show it: the photo's colour
 * as shot, no tone mapping, sRGB on the canvas.
 *
 * Under the glow and colour grade it draws the photo `graded`: the photo is
 * already tone-mapped, so graded with AgX it would be graded twice and its dawn
 * and sunset orange would pale. Each pixel's sRGB colour then looks up its AgX
 * preimage in a table (`agxPreimageTable`), in AgX's log encoding, and is
 * decoded: the composite grades it back to the photo's colour. Its alpha is 0,
 * which tells the bloom it is sky, so the photo's clouds (light up to 7 under
 * the grade) do not glow; the sun disc drawn over it, and anything else in
 * front, writes alpha and glows.
 */

const vertexShader = /* glsl */ `
varying vec3 vWorldDirection;
#include <common>
void main() {
  vWorldDirection = transformDirection( position, modelMatrix );
  #include <begin_vertex>
  #include <project_vertex>
  gl_Position.z = gl_Position.w;
}
`;

const number = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

/**
 * GLSL: the light the grade draws as an sRGB-encoded display colour (`agxPreimageOf`), from the table. Needs the
 * uniforms of `preimageUniforms`. The painted sky (`Environment`) takes it too.
 */
export const PREIMAGE_GLSL = /* glsl */ `
uniform sampler3D preimage;
uniform mat3 preimageDecode;
vec3 agxPreimageOf( vec3 srgb ) {
  // Texel centres at 0 and 1; the table holds AgX's log encoding, decoded to scene light over the exposure.
  vec3 encoded = texture( preimage, clamp( srgb, 0.0, 1.0 ) * ${number((PREIMAGE_TABLE_SIZE - 1) / PREIMAGE_TABLE_SIZE)} + ${number(0.5 / PREIMAGE_TABLE_SIZE)} ).rgb;
  return preimageDecode * exp2( encoded * ${number(AGX_MAX_EV - AGX_MIN_EV)} + ${number(AGX_MIN_EV)} );
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D photo;
uniform mat3 turn;
uniform float intensity;
varying vec3 vWorldDirection;
#include <common>
#ifdef GRADED
${PREIMAGE_GLSL}
vec3 srgbEncode( vec3 c ) {
  return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( vec3( 0.0031308 ), c ) );
}
#endif

void main() {
  // Into the photo's frame (three's backgroundRotation), then three's equirect uv.
  vec3 d = normalize( turn * vWorldDirection );
  vec2 uv = vec2( atan( d.z, d.x ) * RECIPROCAL_PI2 + 0.5, asin( clamp( d.y, -1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5 );
  // The lookup's gradients: across the column where u wraps, the wrapped u's (else the seam takes the smallest mip);
  // and u's scaled by the circle of latitude, so the mip follows the angle a pixel spans, as three's cube map does,
  // and the photo does not blur toward the zenith.
  vec2 dx = dFdx( uv );
  vec2 dy = dFdy( uv );
  float wrappedX = dFdx( fract( uv.x + 0.5 ) );
  float wrappedY = dFdy( fract( uv.x + 0.5 ) );
  if ( abs( wrappedX ) < abs( dx.x ) ) dx.x = wrappedX;
  if ( abs( wrappedY ) < abs( dy.x ) ) dy.x = wrappedY;
  float across = max( sqrt( max( 1.0 - d.y * d.y, 0.0 ) ), 0.02 );
  dx.x *= across;
  dy.x *= across;
  // As soft as three draws it through the cube map it resamples the photo to: three quarters of a mip softer while the
  // photo is magnified, never past mip 0.4 for that, and 0.4 softer when it is minified (fitted on the midday clouds
  // from 480 to 1920 pixels wide: 0.1–0.2 % of the sky's pixels more than 3 of 255 off at 1280 and up).
  vec2 texels = vec2( textureSize( photo, 0 ) );
  float lod = log2( max( max( length( dx * texels ), length( dy * texels ) ), 1e-6 ) );
  float soften = exp2( max( lod + 0.4, min( lod + 0.75, 0.4 ) ) - lod );
  vec3 shown = textureGrad( photo, uv, dx * soften, dy * soften ).rgb * intensity;
#ifdef GRADED
  // Alpha 0: sky, for the bloom. Negative channels stay (a saturated yellow's preimage has negative blue).
  gl_FragColor = vec4( agxPreimageOf( srgbEncode( clamp( shown, 0.0, 1.0 ) ) ), 0.0 );
#else
  gl_FragColor = vec4( shown, 1.0 );
  #include <colorspace_fragment>
#endif
}
`;

/** The table for each look, built once a page (about 80 ms). */
const tables = new Map<string, Data3DTexture>();

function preimageTexture(power: number, saturation: number): Data3DTexture {
  const key = `${power}/${saturation}`;
  let texture = tables.get(key);
  if (!texture) {
    const size = PREIMAGE_TABLE_SIZE;
    const table = agxPreimageTable(size, power, saturation);
    const halves = new Uint16Array(table.length);
    for (let k = 0; k < table.length; k += 1) halves[k] = DataUtils.toHalfFloat(table[k]);
    texture = new Data3DTexture(halves, size, size, size);
    texture.format = RGBAFormat;
    texture.type = HalfFloatType;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.wrapS = texture.wrapT = texture.wrapR = ClampToEdgeWrapping;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    tables.set(key, texture);
  }
  return texture;
}

/** The grade's exposure and look, as they stand when the glow starts (like the underwater fog's preimage). */
export type GradeLook = Pick<GlowSettings, 'exposure' | 'lookPower' | 'lookSaturation'>;

/** `PREIMAGE_GLSL`'s uniforms for a look: the table (shared by every user of that look) and the decode. */
export function preimageUniforms(look: GradeLook): { preimage: IUniform<Data3DTexture>; preimageDecode: IUniform<Matrix3> } {
  const [c0, c1, c2] = AGX_DECODE;
  const decode = new Matrix3().set(c0[0], c1[0], c2[0], c0[1], c1[1], c2[1], c0[2], c1[2], c2[2]).multiplyScalar(1 / look.exposure);
  return { preimage: { value: preimageTexture(look.lookPower, look.lookSaturation) }, preimageDecode: { value: decode } };
}

const rotation = new Matrix4();

/** The photo, its turn and its intensity: one set of uniforms for both of the box's materials. */
interface PhotoUniforms {
  photo: IUniform<Texture | null>;
  turn: IUniform<Matrix3>;
  intensity: IUniform<number>;
}

function skyMaterial(photo: PhotoUniforms, graded?: GradeLook): ShaderMaterial {
  return new ShaderMaterial({
    name: graded ? 'GradedPhotoBackground' : 'PhotoBackground',
    uniforms: { ...photo, ...(graded ? preimageUniforms(graded) : {}) },
    defines: graded ? { GRADED: '' } : {},
    vertexShader,
    fragmentShader,
    side: BackSide,
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
}

export class PhotoBackground {
  readonly mesh: Mesh<BoxGeometry, ShaderMaterial>;
  private readonly uniforms: PhotoUniforms = { photo: { value: null }, turn: { value: new Matrix3() }, intensity: { value: 1 } };
  private readonly shownMaterial = skyMaterial(this.uniforms);
  private gradedMaterial?: ShaderMaterial;

  constructor() {
    const geometry = new BoxGeometry(1, 1, 1);
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    this.mesh = new Mesh(geometry, this.shownMaterial);
    this.mesh.name = 'PhotoBackground';
    this.mesh.frustumCulled = false;
    // First of the opaque objects, as three's own background is; centred on the camera, as three's background box is.
    this.mesh.renderOrder = -1e9;
    this.mesh.visible = false;
    this.mesh.onBeforeRender = (_renderer, _scene, camera) => {
      this.mesh.matrixWorld.copyPosition(camera.matrixWorld);
    };
  }

  /** Draw the grade's preimage of the photo from now on (the glow runs), with that look; or the photo as shot (undefined). */
  grade(look: GradeLook | undefined): void {
    if (look) {
      this.gradedMaterial ??= skyMaterial(this.uniforms, look);
      this.mesh.material = this.gradedMaterial;
    } else {
      this.mesh.material = this.shownMaterial;
      if (this.gradedMaterial) {
        this.gradedMaterial.dispose();
        (this.gradedMaterial.uniforms.preimage.value as Data3DTexture).dispose();
        this.gradedMaterial = undefined;
      }
    }
  }

  get graded(): boolean {
    return this.mesh.material === this.gradedMaterial;
  }

  /** Draw `photo` (an equirect sRGB texture) turned and lit as three would draw it as `scene.background`. */
  show(photo: Texture, backgroundRotation: Euler, intensity: number): void {
    const { uniforms } = this;
    uniforms.photo.value = photo;
    // three's backgroundRotation uniform: the turn's inverse (its transpose).
    uniforms.turn.value.setFromMatrix4(rotation.makeRotationFromEuler(backgroundRotation)).transpose();
    uniforms.intensity.value = intensity;
    this.mesh.visible = true;
  }

  hide(): void {
    this.mesh.visible = false;
    this.uniforms.photo.value = null;
  }

  /** Frees the box, its programs and the table's GPU copy (the table itself is kept, to upload again for the next glow). */
  dispose(): void {
    this.grade(undefined);
    this.mesh.geometry.dispose();
    this.shownMaterial.dispose();
  }
}
