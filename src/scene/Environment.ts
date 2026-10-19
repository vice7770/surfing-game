import {
  BackSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Color,
  ShaderMaterial,
  SphereGeometry,
  type Data3DTexture,
} from 'three';
import { PREIMAGE_GLSL, preimageUniforms, type GradeLook } from './PhotoBackground';

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
        #ifdef GRADED
        ${PREIMAGE_GLSL}
        #endif
        void main() {
          float altitude = clamp(vDirection.y * 1.7 + 0.12, 0.0, 1.0);
          vec3 color = mix(uHorizon, uZenith, smoothstep(0.0, 1.0, altitude));
          #ifdef GRADED
          // Under the glow: the light the grade turns into the colour the canvas shows (the colour is written as
          // sRGB there), at alpha 0, so the bloom leaves it out.
          gl_FragColor = vec4(agxPreimageOf(color), 0.0);
          #else
          gl_FragColor = vec4(color, 1.0);
          #endif
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

  /**
   * Draw the painted sky as the glow and colour grade's preimage of itself, with that look (it shows until the
   * photographed sky loads; graded as it is, it would be graded twice), or as itself (undefined).
   */
  gradeSky(look: GradeLook | undefined): void {
    const material = this.skyMaterial;
    if (look) {
      Object.assign(material.uniforms, preimageUniforms(look));
      material.defines.GRADED = '';
    } else {
      (material.uniforms.preimage?.value as Data3DTexture | undefined)?.dispose();
      delete material.uniforms.preimage;
      delete material.uniforms.preimageDecode;
      delete material.defines.GRADED;
    }
    material.needsUpdate = true;
  }

  /** The painted sky and sun give way to a photographed sky (`PhotoSky`) once it has loaded. */
  showSky(visible: boolean): void {
    this.sky.visible = visible;
    this.sun.visible = visible;
  }

  get sunMesh() { return this.sun; }
}
