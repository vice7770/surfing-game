import { Vector2 } from 'three';

/**
 * Aerial perspective over the Rich water (the horizon plan, item 3): the air between the eye and the water scatters the
 * sky's light toward the eye and dims what lies behind it, so far water fades toward the sky at the horizon. The water
 * keeps a share T = e^{−β d} of its own colour over a path d, and takes 1 − T of the sky's colour at the horizon in the
 * direction it lies (Koschmieder's airlight: an infinitely long path in a uniform atmosphere shows the horizon sky).
 *
 * The horizon's colour is read once per photographed sky from the background the player sees (`horizonRing`), as a
 * ring of colours around the horizon, so water hazed all the way meets that background without a step. The background
 * is drawn without tone mapping (an sRGB photo), so the haze mixes after the water's tone mapping, in display-linear
 * values, as three's own fog does.
 */

/** Azimuth bins in the ring of horizon colours (11.25° each; the photos' horizons change slowly along it). */
export const HAZE_RING_SIZE = 32;

/** The elevation band read for the horizon's colour, degrees: the haze layer on the horizon and the photo just under it. */
export const HAZE_BAND_DEGREES = [-1, 1] as const;

/**
 * Coastal air's meteorological range, m. A clean maritime boundary layer with sea salt in it sees 10–20 km on a
 * fair day (the WMO's "moderate" to "good" visibility); 12 km gives a far sea that greys toward the horizon without
 * fogging the break: a path across the tank (300 m) keeps 91 % of its colour, the far ocean's rim (1.5 km) 61 %.
 */
export const HAZE_VISIBILITY = 12000;

/**
 * Extinction coefficient for a visibility, 1/m (Koschmieder: the range where a black object's contrast against the
 * horizon sky falls to 2 %, so β = −ln 0.02 / V ≈ 3.912 / V). Aerosol extinction is close to grey; the colour comes
 * from the sky the haze scatters.
 */
export function hazeExtinction(visibility: number): number {
  return visibility > 0 ? -Math.log(0.02) / visibility : 0;
}

/** The haze's extinction over the water, 1/m. */
export const HAZE_EXTINCTION = hazeExtinction(HAZE_VISIBILITY);

/** Share of the water's own light left after `distance` m of air (Beer–Lambert). */
export function hazeTransmittance(distance: number, extinction = HAZE_EXTINCTION): number {
  return Math.exp(-extinction * Math.max(0, distance));
}

/**
 * Share of the horizon's colour at a point `distance` m away. `horizon` (0–1) carries the far ocean's last stretch the
 * rest of the way: its mesh ends at 1.5 km, the sea's own horizon lies 4–14 km out from the eye heights the game uses,
 * so over the rim's fade the sea between them is drawn hazed to the horizon's colour, as the haze takes it there.
 */
export function hazeAmount(distance: number, horizon = 0, extinction = HAZE_EXTINCTION): number {
  return 1 - hazeTransmittance(distance, extinction) * (1 - Math.min(1, Math.max(0, horizon)));
}

/** An sRGB-encoded value (0–1) to linear, as three decodes an sRGB texture. */
export function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

const SRGB_BYTES = Float32Array.from({ length: 256 }, (_, v) => srgbToLinear(v / 255));
/** An sRGB byte (0–255) to linear. */
export const srgbByteToLinear = (value: number): number => SRGB_BYTES[value];

/**
 * The horizon's colour around the sky (linear RGB, HAZE_RING_SIZE × 3): the mean of each bin of columns of an
 * equirectangular photo's horizon band. `rgba` holds `rows` rows of `width` RGBA pixels cut from the band, each channel
 * turned linear by `decode` (sRGB bytes by default; an HDR's half floats with `DataUtils.fromHalfFloat`).
 * Columns run as three samples an equirect map: column c lies at longitude ((c + ½)/width − ½)·2π, at
 * x = cos, z = sin (`directionAt` in scripts/assets/skyMath.ts), so bin k is centred on ((k + ½)/size − ½)·2π.
 */
export function horizonRing(
  rgba: ArrayLike<number>, width: number, rows: number, size = HAZE_RING_SIZE, decode: (value: number) => number = srgbByteToLinear,
): Float32Array {
  const ring = new Float32Array(3 * size);
  const counts = new Float32Array(size);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const bin = Math.min(size - 1, Math.floor(((column + 0.5) / width) * size));
      const k = 4 * (row * width + column);
      ring[3 * bin] += decode(rgba[k]);
      ring[3 * bin + 1] += decode(rgba[k + 1]);
      ring[3 * bin + 2] += decode(rgba[k + 2]);
      counts[bin] += 1;
    }
  }
  for (let bin = 0; bin < size; bin += 1) {
    for (let c = 0; c < 3; c += 1) ring[3 * bin + c] /= Math.max(1, counts[bin]);
  }
  return ring;
}

/** The rows of an equirect image of `height` rows whose centres lie in the band's elevations (row 0 the zenith). */
export function horizonBandRows(height: number, band: readonly [number, number] = HAZE_BAND_DEGREES): { first: number; count: number } {
  // Elevation e lies (½ − e/180)·height rows down; row r's centre at r + ½.
  const row = (elevation: number) => (0.5 - elevation / 180) * height - 0.5;
  const first = Math.max(0, Math.ceil(row(band[1])));
  const last = Math.min(height - 1, Math.floor(row(band[0])));
  return { first, count: Math.max(1, last - first + 1) };
}

/**
 * The ring of an image the browser has decoded (the photo sky's background): its horizon band drawn unscaled to a
 * canvas and read back. Undefined where there is no canvas to read it with.
 */
export function horizonRingFromImage(image: CanvasImageSource & { width: number; height: number }): Float32Array | undefined {
  if (typeof document === 'undefined' || !image.width || !image.height) return undefined;
  const { first, count } = horizonBandRows(image.height);
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = count;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;
  context.drawImage(image, 0, first, image.width, count, 0, 0, image.width, count);
  return horizonRing(context.getImageData(0, 0, image.width, count).data, image.width, count);
}

/** The ring's mean luminance (Rec. 709). */
export function ringLuminance(ring: ArrayLike<number>): number {
  let sum = 0;
  for (let k = 0; k + 2 < ring.length; k += 3) sum += 0.2126 * ring[k] + 0.7152 * ring[k + 1] + 0.0722 * ring[k + 2];
  return ring.length >= 3 ? sum / (ring.length / 3) : 0;
}

/**
 * How much brighter the sky the player sees is than the sky that lights the scene, at the horizon: the background
 * photo's ring over the environment's (its HDR's ring at the scene's exposure). The two come from one photo but are
 * scaled apart (the background as Poly Haven tone-mapped it, the environment to `REFERENCE_LIGHT`): 1.25 at midday,
 * 0.57 at dawn, 0.37 at sunset. The Rich water's grazing mirror takes it (`mirrorGain`, `skyMirrorShare`).
 */
export function horizonGain(background: ArrayLike<number>, environment: ArrayLike<number>, exposure: number): number {
  const lit = ringLuminance(environment) * exposure;
  return lit > 0 ? ringLuminance(background) / lit : 1;
}

/**
 * The ring's colour toward world direction (x, z) for a photo turned by `rotation` about +y (`PhotoSky.rotation`;
 * a turn θ adds θ to a direction's atan2(x, z), as `rotatedSun` does). CPU twin of the shader's `waterHazeColor`.
 */
export function ringColorAt(ring: ArrayLike<number>, x: number, z: number, rotation: number): [number, number, number] {
  const size = ring.length / 3;
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  // Back into the photo's frame: the inverse of rotatedSun's turn.
  const px = x * c - z * s;
  const pz = x * s + z * c;
  const u = Math.atan2(pz, px) / (2 * Math.PI) + 0.5;
  const bin = u * size - 0.5;
  const i0 = Math.floor(bin);
  const t = bin - i0;
  const a = ((i0 % size) + size) % size;
  const b = (a + 1) % size;
  return [0, 1, 2].map((k) => ring[3 * a + k] * (1 - t) + ring[3 * b + k] * t) as [number, number, number];
}

/**
 * The haze's uniforms, shared by every Rich water program (the same objects in each material, as `chopFieldUniforms`),
 * so one update reaches the tank, its edge band and the far ocean: the ring, the photo's turn (cos, sin) and the
 * extinction (0 turns the haze off: under water, and until a photographed sky is in).
 */
export const horizonHazeUniforms = {
  waterHazeRing: { value: new Float32Array(3 * HAZE_RING_SIZE) },
  waterHazeTurn: { value: new Vector2(1, 0) },
  waterHazeExtinction: { value: 0 },
  /** The grazing mirror's gain on the environment (`mirrorGain`). */
  waterSkyGain: { value: 1 },
};

/** What the haze and the grazing mirror take from a photographed sky. */
export interface HorizonSky {
  /** The background's ring (`horizonRing`), or none: the haze is then off. */
  ring?: ArrayLike<number>;
  /** The photo's turn about +y, radians (`PhotoSky.rotation`). */
  rotation: number;
  /** `horizonGain`, 1 without a measured sky. */
  gain?: number;
}

/**
 * The gain the grazing mirror puts on the environment: `horizonGain` where the environment is the brighter (dawn,
 * sunset: the water would outshine the sky it mirrors), never above 1. Where the photo is the brighter (midday), its
 * clouds a few degrees up would make the far water, which mirrors the sky a few degrees up, brighter than the haze
 * band on the horizon above it; the environment as it is keeps the sea a shade under its sky there.
 */
export function mirrorGain(gain: number | undefined): number {
  return gain !== undefined && Number.isFinite(gain) && gain > 0 ? Math.min(1, gain) : 1;
}

/** Point the haze at a sky's ring turned with it, or turn it off (no ring, or `on` false: under water). */
export function applyHorizonHaze(uniforms: typeof horizonHazeUniforms, sky: HorizonSky, on: boolean, extinction = HAZE_EXTINCTION): void {
  const { ring, rotation, gain } = sky;
  if (ring && ring.length === uniforms.waterHazeRing.value.length) uniforms.waterHazeRing.value.set(ring);
  uniforms.waterHazeTurn.value.set(Math.cos(rotation), Math.sin(rotation));
  uniforms.waterHazeExtinction.value = on && ring ? extinction : 0;
  uniforms.waterSkyGain.value = ring ? mirrorGain(gain) : 1;
}

/**
 * Vertex GLSL: the haze toward a world point, as `vWaterHaze` (rgb the horizon's colour that way, a its share).
 * Per vertex: the share and the colour change slowly across the water's triangles (its 1–40 m grid), and a varying
 * spares every pixel the ring's lookup. Needs `cameraPosition`.
 */
export const waterHazeVertexPars = /* glsl */ `
uniform vec3 waterHazeRing[ ${HAZE_RING_SIZE} ];
uniform vec2 waterHazeTurn;
uniform float waterHazeExtinction;
varying vec4 vWaterHaze;
vec3 waterHazeColor( vec2 toward ) {
  // Into the photo's frame (the inverse of its turn), then its longitude as three's equirect u.
  vec2 p = vec2( toward.x * waterHazeTurn.x - toward.y * waterHazeTurn.y, toward.x * waterHazeTurn.y + toward.y * waterHazeTurn.x );
  float bin = ( atan( p.y, p.x ) * 0.15915494 + 0.5 ) * ${HAZE_RING_SIZE.toFixed(1)} - 0.5;
  float first = floor( bin );
  int a = int( mod( first, ${HAZE_RING_SIZE.toFixed(1)} ) );
  int b = int( mod( first + 1.0, ${HAZE_RING_SIZE.toFixed(1)} ) );
  return mix( waterHazeRing[ a ], waterHazeRing[ b ], bin - first );
}
// The haze toward a world point; \`horizon\` (0–1) carries the far ocean's rim the rest of the way to the horizon.
vec4 waterHazeAt( vec3 world, float horizon ) {
  if ( waterHazeExtinction <= 0.0 ) return vec4( 0.0 );
  vec3 toward = world - cameraPosition;
  float transmittance = exp( -waterHazeExtinction * length( toward ) ) * ( 1.0 - clamp( horizon, 0.0, 1.0 ) );
  return vec4( waterHazeColor( toward.xz + vec2( 1e-4, 0.0 ) ), 1.0 - transmittance );
}
`;

/** Fragment GLSL pars: the vertex's haze. */
export const waterHazeFragmentPars = 'varying vec4 vWaterHaze;';

/** Fragment GLSL after <tonemapping_fragment>: the haze over the tone-mapped water, in display-linear values. */
export const WATER_HAZE_OUTPUT = /* glsl */ `#include <tonemapping_fragment>
gl_FragColor.rgb = mix( gl_FragColor.rgb, vWaterHaze.rgb, vWaterHaze.a );`;
