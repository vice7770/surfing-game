import {
  BasicShadowMap, Color, DataTexture, DirectionalLight, Mesh, MeshBasicMaterial, PCFShadowMap, PlaneGeometry, Quaternion, ShaderChunk,
  Vector3, type Material, type Scene, type WebGLRenderer,
} from 'three';

/**
 * The shadow quality levels (G7), which P8's graphics presets pick in Part B:
 * a soft blob under the board; the rider and board shadowing themselves and
 * the deck; the same shadow also falling on the water (mostly seen on foam)
 * and the seabed; and contact-hardening soft shadows (PCSS).
 */
export type ShadowLevel = 'blob' | 'rider' | 'surfaces' | 'soft';
export const SHADOW_LEVELS: readonly ShadowLevel[] = ['blob', 'rider', 'surfaces', 'soft'];

/** `?shadows=blob|rider|surfaces|soft` (dev flag until Part B), else `fallback`. */
export function parseShadowLevel(search: string, fallback: ShadowLevel = 'surfaces'): ShadowLevel {
  const asked = new URLSearchParams(search).get('shadows');
  return SHADOW_LEVELS.includes(asked as ShadowLevel) ? (asked as ShadowLevel) : fallback;
}

/** The shadow camera's half-width around the rider, its depth range and the light's distance along the sun, m. */
export const SHADOW_EXTENT = 4;
const SHADOW_NEAR = 1;
const SHADOW_FAR = 45;
const LIGHT_DISTANCE = 20;
/**
 * PCSS penumbra per metre from caster to receiver. The real sun's is about
 * 0.0047 (its 0.27° radius); four times that keeps the contact hardening
 * visible on the seabed (art direction).
 */
const PCSS_SOFTNESS = 0.02;

/** Moves `centre` to the nearest whole shadow-map texel across the light, so a moving rider's shadow does not shimmer. */
export function snapToTexel(centre: Vector3, lightQuaternion: Quaternion, extent: number, mapSize: number, out: Vector3): Vector3 {
  const texel = (2 * extent) / mapSize;
  out.copy(centre).applyQuaternion(lightQuaternion.clone().invert());
  out.x = Math.round(out.x / texel) * texel;
  out.y = Math.round(out.y / texel) * texel;
  return out.applyQuaternion(lightQuaternion);
}

/** The basic path's getShadow is the chunk's last one taking a plain sampler2D (the VSM path's comes before it). */
const BASIC_SIGNATURE = 'float getShadow( sampler2D shadowMap';
const BASIC_RETURN = 'return mix( 1.0, shadow, shadowIntensity );';
/**
 * PCSS on the basic (raw depth) shadow path, after three's webgl_shadowmap_pcss
 * example (MIT): a blocker search over the light's footprint finds the mean
 * occluder depth, whose distance from the receiver sets the penumbra, then a
 * percentage-closer filter of that width.
 */
const PCSS_BASIC = `
	#define PCSS_SAMPLES 16
	vec2 pcssDisk( const in int i, const in float phi ) {
		float r = sqrt( ( float( i ) + 0.5 ) / float( PCSS_SAMPLES ) );
		float theta = float( i ) * 2.39996323 + phi;
		return vec2( cos( theta ), sin( theta ) ) * r;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		#ifdef USE_REVERSED_DEPTH_BUFFER
			shadowCoord.z -= shadowBias;
		#else
			shadowCoord.z += shadowBias;
		#endif
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		if ( inFrustum && shadowCoord.z <= 1.0 ) {
			float phi = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) ) * 6.28318530;
			float search = ${((PCSS_SOFTNESS * 4) / (2 * SHADOW_EXTENT)).toFixed(5)};
			float blockers = 0.0;
			float blockerDepth = 0.0;
			for ( int i = 0; i < PCSS_SAMPLES; i ++ ) {
				float depth = texture2D( shadowMap, shadowCoord.xy + pcssDisk( i, phi ) * search ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					bool blocks = depth > shadowCoord.z;
				#else
					bool blocks = depth < shadowCoord.z;
				#endif
				if ( blocks ) { blockerDepth += depth; blockers += 1.0; }
			}
			if ( blockers > 0.0 ) {
				// Orthographic depth is linear: the depth gap times the range is the caster-to-receiver distance, m.
				float gap = abs( shadowCoord.z - blockerDepth / blockers ) * ${(SHADOW_FAR - SHADOW_NEAR).toFixed(1)};
				float penumbra = gap * ${(PCSS_SOFTNESS / (2 * SHADOW_EXTENT)).toFixed(6)} + 1.0 / shadowMapSize.x;
				float lit = 0.0;
				for ( int i = 0; i < PCSS_SAMPLES; i ++ ) {
					float depth = texture2D( shadowMap, shadowCoord.xy + pcssDisk( i, phi + 1.3 ) * penumbra ).r;
					#ifdef USE_REVERSED_DEPTH_BUFFER
						lit += step( depth, shadowCoord.z );
					#else
						lit += step( shadowCoord.z, depth );
					#endif
				}
				shadow = lit / float( PCSS_SAMPLES );
			}
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
`;

const originalShadowChunk = ShaderChunk.shadowmap_pars_fragment;

/** Swaps the basic shadow path for PCSS, or back. Returns false if three's chunk no longer has the expected shape. */
export function usePcss(on: boolean): boolean {
  if (!on) {
    ShaderChunk.shadowmap_pars_fragment = originalShadowChunk;
    return true;
  }
  const start = originalShadowChunk.lastIndexOf(BASIC_SIGNATURE);
  const returned = start < 0 ? -1 : originalShadowChunk.indexOf(BASIC_RETURN, start);
  const end = returned < 0 ? -1 : originalShadowChunk.indexOf('}', returned + BASIC_RETURN.length);
  if (end < 0) return false;
  ShaderChunk.shadowmap_pars_fragment = originalShadowChunk.slice(0, start) + PCSS_BASIC + originalShadowChunk.slice(end + 1);
  return true;
}

/** A soft dark ellipse's alpha, for the blob shadow. */
function blobAlpha(size = 64): DataTexture {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size * 2 - 1;
      const v = (y + 0.5) / size * 2 - 1;
      const r = Math.min(1, Math.hypot(u, v));
      const a = Math.round(255 * (1 - r * r) ** 2);
      pixels.set([a, a, a, 255], (y * size + x) * 4);
    }
  }
  const texture = new DataTexture(pixels, size, size);
  texture.needsUpdate = true;
  return texture;
}

/**
 * The sun's shadow around the rider: a directional shadow camera ±4 m about
 * the board, following it in whole texels along the sun, at four quality levels.
 */
export class ShadowRig {
  readonly blob: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private level: ShadowLevel = 'surfaces';
  private readonly lightQuaternion = new Quaternion();
  private readonly snapped = new Vector3();
  private readonly zAxis = new Vector3(0, 0, 1);

  constructor(private readonly renderer: WebGLRenderer, private readonly light: DirectionalLight, private readonly scene: Scene) {
    const camera = light.shadow.camera;
    camera.left = -SHADOW_EXTENT;
    camera.right = SHADOW_EXTENT;
    camera.top = SHADOW_EXTENT;
    camera.bottom = -SHADOW_EXTENT;
    camera.near = SHADOW_NEAR;
    camera.far = SHADOW_FAR;
    camera.updateProjectionMatrix();
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.02;
    scene.add(light.target);
    this.blob = new Mesh(new PlaneGeometry(0.9, 2.2).rotateX(-Math.PI / 2), new MeshBasicMaterial({
      color: new Color(0, 0, 0), alphaMap: blobAlpha(), transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    this.blob.renderOrder = 1;
    this.blob.visible = false;
    scene.add(this.blob);
  }

  setLevel(level: ShadowLevel, receivers: { surfaces: readonly Mesh[] }): void {
    const map = level !== 'blob';
    this.renderer.shadowMap.enabled = map;
    this.renderer.shadowMap.type = level === 'soft' ? BasicShadowMap : PCFShadowMap;
    this.renderer.shadowMap.needsUpdate = true;
    this.light.castShadow = map;
    const size = level === 'rider' ? 1024 : 2048;
    if (this.light.shadow.mapSize.x !== size) {
      this.light.shadow.mapSize.set(size, size);
      this.light.shadow.map?.dispose();
      this.light.shadow.map = null;
    }
    this.light.shadow.radius = level === 'rider' ? 2 : 3;
    this.blob.visible = level === 'blob';
    for (const surface of receivers.surfaces) surface.receiveShadow = level === 'surfaces' || level === 'soft';
    if (level !== this.level && (level === 'soft' || this.level === 'soft') && !usePcss(level === 'soft')) {
      console.warn('PCSS could not patch three\'s shadow chunk; using hard shadows.');
    }
    this.level = level;
    this.scene.traverse((object) => {
      const material = (object as Mesh).material as Material | Material[] | undefined;
      for (const m of Array.isArray(material) ? material : material ? [material] : []) m.needsUpdate = true;
    });
  }

  /** Centres the shadow on `focus`, lit along `sunDirection` (unit, toward the sun); the blob lies on the water at `surfaceY`. */
  follow(focus: Vector3, sunDirection: Vector3, surfaceY: number, heading = 0): void {
    this.lightQuaternion.setFromUnitVectors(this.zAxis, sunDirection);
    snapToTexel(focus, this.lightQuaternion, SHADOW_EXTENT, this.light.shadow.mapSize.x, this.snapped);
    this.light.target.position.copy(this.snapped);
    this.light.position.copy(this.snapped).addScaledVector(sunDirection, LIGHT_DISTANCE);
    this.light.target.updateMatrixWorld();
    this.blob.position.set(focus.x, surfaceY + 0.02, focus.z);
    this.blob.rotation.y = heading;
  }
}
