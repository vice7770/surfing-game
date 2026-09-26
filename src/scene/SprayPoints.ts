import { BufferAttribute, BufferGeometry, NormalBlending, PerspectiveCamera, Points, ShaderMaterial, Vector2 } from 'three';
import { SPRAY_STRIDE } from '../wave/SprayCloud';

/** What the renderer needs from a spray cloud: packed x, y, z, size and opacity per particle, and how many are live. */
export interface RenderableSpray {
  readonly particles: Float32Array;
  readonly count: number;
}

const vertexShader = /* glsl */ `
attribute vec2 look;
uniform float pixelsPerMetre;
varying float vOpacity;

void main() {
  vec4 view = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * view;
  gl_PointSize = max( 1.0, look.x * pixelsPerMetre / max( 0.1, -view.z ) );
  vOpacity = look.y;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 sprayColor;
varying float vOpacity;

void main() {
  // A soft round drop cluster: opaque in the middle, fading to its rim.
  float r = length( gl_PointCoord - 0.5 ) * 2.0;
  if ( r > 1.0 ) discard;
  gl_FragColor = vec4( sprayColor, vOpacity * ( 1.0 - r * r ) );
}
`;

/** Draws a `SprayCloud` (or a snapshot of one) as soft points sized in metres, fading with age. */
export class SprayPoints {
  readonly mesh: Points<BufferGeometry, ShaderMaterial>;
  private readonly positions: BufferAttribute;
  private readonly looks: BufferAttribute;
  private readonly buffer = new Vector2();

  constructor(readonly capacity = 4096) {
    const geometry = new BufferGeometry();
    this.positions = new BufferAttribute(new Float32Array(capacity * 3), 3);
    this.looks = new BufferAttribute(new Float32Array(capacity * 2), 2);
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('look', this.looks);
    geometry.setDrawRange(0, 0);
    const material = new ShaderMaterial({
      uniforms: { pixelsPerMetre: { value: 500 }, sprayColor: { value: [0.94, 0.97, 1] } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    this.mesh = new Points(geometry, material);
    this.mesh.frustumCulled = false;
    // Points are sized in metres: the screen's pixels per metre at unit distance come from the camera and viewport.
    this.mesh.onBeforeRender = (renderer, _scene, camera) => {
      const height = renderer.getDrawingBufferSize(this.buffer).y;
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 50;
      material.uniforms.pixelsPerMetre.value = height / (2 * Math.tan((fov * Math.PI) / 360));
    };
  }

  update(spray: RenderableSpray): void {
    const count = Math.min(this.capacity, spray.count);
    const positions = this.positions.array as Float32Array;
    const looks = this.looks.array as Float32Array;
    for (let k = 0; k < count; k += 1) {
      const o = k * SPRAY_STRIDE;
      positions[k * 3] = spray.particles[o];
      positions[k * 3 + 1] = spray.particles[o + 1];
      positions[k * 3 + 2] = spray.particles[o + 2];
      looks[k * 2] = spray.particles[o + 3];
      looks[k * 2 + 1] = spray.particles[o + 4];
    }
    this.positions.needsUpdate = true;
    this.looks.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, count);
  }
}
