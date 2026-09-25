import {
  BackSide,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Color,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
} from 'three';

/** Distant scenery only; the interactive water field remains the sole surf surface. */
export class Environment {
  readonly group = new Group();
  private readonly sun: Mesh;
  private readonly skyMaterial: ShaderMaterial;
  private readonly coastline: Mesh[] = [];

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
    const sky = new Mesh(new SphereGeometry(150, 32, 16), this.skyMaterial);
    sky.renderOrder = -10;
    this.group.add(sky);

    this.sun = new Mesh(new SphereGeometry(4, 24, 16), new MeshBasicMaterial({ color: '#fff1c9', fog: false }));
    this.group.add(this.sun);

    this.coastline.push(this.makeCoastline(-81, '#779a90', 7.5, 0.7));
    this.coastline.push(this.makeCoastline(-59, '#597f78', 4.2, 2.1));
    this.group.add(...this.coastline);
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

  /** The legacy coastline cards sit offshore in the physical tank's frame, so that mode hides them. */
  showCoastline(visible: boolean): void {
    this.coastline.forEach((mesh) => { mesh.visible = visible; });
  }
  get sunMesh() { return this.sun; }

  setSpot(spot: 'training' | 'point' | 'reef' | 'custom'): void {
    const palette = spot === 'point' ? ['#738d9c', '#496d7d']
      : spot === 'reef' ? ['#8b907d', '#637667'] : ['#779a90', '#597f78'];
    this.coastline.forEach((mesh, index) => {
      (mesh.material as MeshBasicMaterial).color.set(palette[index]);
    });
  }

  private makeCoastline(z: number, color: string, height: number, phase: number): Mesh {
    const shape = new Shape();
    shape.moveTo(-180, -9);
    for (let x = -180; x <= 180; x += 3) {
      const ridge = height * (0.5 + 0.25 * Math.sin(x * 0.08 + phase)
        + 0.16 * Math.sin(x * 0.19 - phase * 1.7));
      shape.lineTo(x, ridge - 1.8);
    }
    shape.lineTo(180, -9);
    shape.closePath();
    const mesh = new Mesh(new ShapeGeometry(shape), new MeshBasicMaterial({
      color, side: DoubleSide, fog: false,
    }));
    mesh.position.z = z;
    return mesh;
  }
}
