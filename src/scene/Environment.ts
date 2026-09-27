import {
  BackSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Color,
  ShaderMaterial,
  SphereGeometry,
} from 'three';

/** Distant scenery only: the painted sky and the sun. */
export class Environment {
  readonly group = new Group();
  private readonly sun: Mesh;
  private readonly sky: Mesh;
  private readonly skyMaterial: ShaderMaterial;

  constructor() {
    this.skyMaterial = new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uHorizon: { value: new Color('#fcb993') },
        uZenith: { value: new Color('#83c7d1') },
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDirection;
        uniform vec3 uHorizon;
        uniform vec3 uZenith;
        void main() {
          float altitude = clamp(vDirection.y * 1.7 + 0.12, 0.0, 1.0);
          vec3 color = mix(uHorizon, uZenith, smoothstep(0.0, 1.0, altitude));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    this.sky = new Mesh(new SphereGeometry(150, 32, 16), this.skyMaterial);
    // Drawn first without depth, so distant water beyond the sphere still covers it.
    this.sky.renderOrder = -10;
    this.group.add(this.sky);

    this.sun = new Mesh(new SphereGeometry(4, 24, 16), new MeshBasicMaterial({ color: '#fff1c9', fog: false }));
    this.group.add(this.sun);
    this.setSunPosition(0.35, -25);
  }

  setSunPosition(value: number, directionDegrees: number): void {
    const height = Math.max(0, Math.min(1, value));
    const direction = directionDegrees * Math.PI / 180;
    this.sun.position.set(Math.sin(direction) * 120, 8 + height * 35, -Math.cos(direction) * 120);
    this.skyMaterial.uniforms.uHorizon.value.set('#fcb993').lerp(new Color('#d6dfe0'), height * 0.55);
    this.skyMaterial.uniforms.uZenith.value.set('#83c7d1').lerp(new Color('#aad5e0'), height * 0.45);
  }

  get sunPosition() { return this.sun.position; }

  /** The painted sky and sun give way to a photographed sky (`PhotoSky`) once it has loaded. */
  showSky(visible: boolean): void {
    this.sky.visible = visible;
    this.sun.visible = visible;
  }

  get sunMesh() { return this.sun; }
}
