import {
  BackSide, BoxGeometry, ClampToEdgeWrapping, Data3DTexture, DataUtils, HalfFloatType, LinearFilter, Matrix3, Matrix4, Mesh,
  NoBlending, RGBAFormat, ShaderMaterial, type Euler, type Texture,
} from 'three';
import { AGX_DECODE, AGX_MAX_EV, AGX_MIN_EV, PREIMAGE_TABLE_SIZE, agxPreimageTable, type GlowSettings } from './glowMath';

/**
 * The sky photo as the glow and colour grade draws it. The photo is already
 * tone-mapped (Poly Haven's JPEG, shown as shot on the canvas), so graded with
 * AgX it would be graded twice and its dawn and sunset orange would pale. This
 * draws it in place of three's background, from the photo itself, as the light
 * AgX grades back to the photo's own colour: each pixel's sRGB colour looks up
 * its AgX preimage in a table (`agxPreimageTable`), in AgX's log encoding, and is
 * decoded. Its alpha is 0, which tells the bloom it is sky: the photo's clouds
 * (light up to 7 under the grade) would otherwise glow; the sun disc drawn over
 * it, and anything else in front, writes alpha and glows as before.
 *
 * Drawn from the photo itself, three never turns the photo into its cube map
 * (`photoBackgroundMemory`): 235 MB less for a 4096 × 2048 photo.
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
/** The photo's mip, three quarters of a level softer than its own texels ask: as three's cube map draws it. */
const SOFTEN = 2 ** 0.75;

const fragmentShader = /* glsl */ `
uniform sampler2D photo;
uniform sampler3D preimage;
uniform mat3 turn;
uniform mat3 decode;
uniform float intensity;
varying vec3 vWorldDirection;
#include <common>

vec3 srgbEncode( vec3 c ) {
  return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( vec3( 0.0031308 ), c ) );
}

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
  // Three samples the photo through a cube map it resamples it to, which comes out about three quarters of a mip
  // softer; as soft (measured on the midday clouds: a fifth as many pixels more than 3 of 255 off).
  vec3 shown = textureGrad( photo, uv, dx * ${number(SOFTEN)}, dy * ${number(SOFTEN)} ).rgb * intensity;
  // The photo's colour as shot (sRGB) indexes the table of its preimages, texel centres at 0 and 1.
  vec3 at = srgbEncode( clamp( shown, 0.0, 1.0 ) ) * ${number((PREIMAGE_TABLE_SIZE - 1) / PREIMAGE_TABLE_SIZE)} + ${number(0.5 / PREIMAGE_TABLE_SIZE)};
  vec3 encoded = texture( preimage, at ).rgb;
  vec3 light = decode * exp2( encoded * ${number(AGX_MAX_EV - AGX_MIN_EV)} + ${number(AGX_MIN_EV)} );
  // Alpha 0: sky, for the bloom. Negative channels stay (a saturated yellow's preimage has negative blue).
  gl_FragColor = vec4( light, 0.0 );
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

const rotation = new Matrix4();

export class GlowSky {
  readonly mesh: Mesh<BoxGeometry, ShaderMaterial>;

  /** The grade's exposure and look, as they stand when the glow starts (like the underwater fog's preimage). */
  constructor(settings: Pick<GlowSettings, 'exposure' | 'lookPower' | 'lookSaturation'>) {
    const [c0, c1, c2] = AGX_DECODE;
    const decode = new Matrix3().set(c0[0], c1[0], c2[0], c0[1], c1[1], c2[1], c0[2], c1[2], c2[2]).multiplyScalar(1 / settings.exposure);
    const geometry = new BoxGeometry(1, 1, 1);
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    this.mesh = new Mesh(geometry, new ShaderMaterial({
      name: 'GlowSkyMaterial',
      uniforms: {
        photo: { value: null },
        preimage: { value: preimageTexture(settings.lookPower, settings.lookSaturation) },
        turn: { value: new Matrix3() },
        decode: { value: decode },
        intensity: { value: 1 },
      },
      vertexShader,
      fragmentShader,
      side: BackSide,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    }));
    this.mesh.name = 'GlowSky';
    this.mesh.frustumCulled = false;
    // First of the opaque objects, as three's own background is; centred on the camera, as three's background box is.
    this.mesh.renderOrder = -1e9;
    this.mesh.visible = false;
    this.mesh.onBeforeRender = (_renderer, _scene, camera) => {
      this.mesh.matrixWorld.copyPosition(camera.matrixWorld);
    };
  }

  /** Draw `photo` (an equirect sRGB texture) turned and lit as three would draw it as `scene.background`. */
  show(photo: Texture, backgroundRotation: Euler, intensity: number): void {
    const { uniforms } = this.mesh.material;
    uniforms.photo.value = photo;
    // three's backgroundRotation uniform: the turn's inverse (its transpose).
    (uniforms.turn.value as Matrix3).setFromMatrix4(rotation.makeRotationFromEuler(backgroundRotation)).transpose();
    uniforms.intensity.value = intensity;
    this.mesh.visible = true;
  }

  hide(): void {
    this.mesh.visible = false;
    this.mesh.material.uniforms.photo.value = null;
  }

  /** Frees the box, its program and the table's GPU copy (the table itself is kept, to upload again for the next glow). */
  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    (this.mesh.material.uniforms.preimage.value as Data3DTexture).dispose();
  }
}
