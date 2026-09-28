import { BufferAttribute, Group, Matrix4, Texture, Vector3, type Bone, type Material, type Mesh, type MeshStandardMaterial, type Object3D, type SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PosedBody } from '../rig/posedBody';
import type { RiderVisualState } from '../rig/riderVisualState';
import { computeOutfitCoverage, type OutfitId } from './outfits';
import { DEFAULT_COLORS, dressMaterial, setOutfitColors, wetMaterial, type OutfitColors } from './surferMaterial';

/** Beyond this camera distance the low-poly body (LOD1) is drawn, m, unless the graphics preset says otherwise. */
export const LOD_DISTANCE = 8;
const BODY = /^LOD[01]$/;
const EYES = /high-poly|low-poly/;

/**
 * A MakeHuman surfer (G7) drawn from a GLB built by `scripts/assets/build_surfers.py`:
 * wet materials, an outfit on the body, the skeleton posed each frame from
 * the physics rider by `HumanoidRig`, and a low-poly body at a distance.
 */
/** An image resized to width × height (the texture cap's default draws it on a canvas). */
export type ResizeImage = (image: CanvasImageSource, width: number, height: number) => unknown;

const canvasResize: ResizeImage = (image, width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
  return canvas;
};

/** Downsizes every texture under `root` larger than `cap` px on a side, keeping its proportions (the graphics preset's texture size). */
export function capTextures(root: Object3D, cap: number, resize: ResizeImage = canvasResize): void {
  const done = new Set<Texture>();
  root.traverse((object) => {
    const materials = ([] as Material[]).concat((object as Mesh).material ?? []);
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (!(value instanceof Texture) || done.has(value)) continue;
        done.add(value);
        const image = value.image as { width?: number; height?: number } | undefined;
        const largest = Math.max(image?.width ?? 0, image?.height ?? 0);
        if (!(largest > cap)) continue;
        const scale = cap / largest;
        value.image = resize(value.image as CanvasImageSource, Math.round(image!.width! * scale), Math.round(image!.height! * scale));
        value.needsUpdate = true;
      }
    }
  });
}

export class SkinnedSurfer {
  readonly group = new Group();
  private readonly body: PosedBody;
  private readonly bodies: SkinnedMesh[] = [];
  private outfit: OutfitId = 'fullsuit';
  /** Beyond this camera distance the low-poly body is drawn, m (the graphics preset's level of detail). */
  lodDistance = LOD_DISTANCE;
  private readonly colors: OutfitColors = {
    suit: DEFAULT_COLORS.suit.clone(), accent: DEFAULT_COLORS.accent.clone(), bottoms: DEFAULT_COLORS.bottoms.clone(),
  };

  /** Parsed GLBs by URL and texture cap: a room of surfers (spec N1) shares each body's geometry and textures. */
  private static readonly templates = new Map<string, Promise<Object3D>>();

  /**
   * Loads a surfer GLB, its textures held to `textureCap` px on a side. Each
   * body is parsed once; every surfer gets its own clone, with its own skeleton
   * and materials.
   */
  static async load(url: string, textureCap = Infinity): Promise<SkinnedSurfer> {
    const key = `${url}@${textureCap}`;
    let template = SkinnedSurfer.templates.get(key);
    if (!template) {
      template = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url).then((gltf) => {
        capTextures(gltf.scene, textureCap);
        return gltf.scene;
      });
      SkinnedSurfer.templates.set(key, template);
      template.catch(() => SkinnedSurfer.templates.delete(key));
    }
    return SkinnedSurfer.fromScene(cloneSkinned(await template));
  }

  /** Forgets every parsed body (tests). */
  static clearCache(): void {
    SkinnedSurfer.templates.clear();
  }

  /** Builds a surfer from a loaded GLB's scene, still in its bind pose. */
  static fromScene(scene: Object3D): SkinnedSurfer {
    return new SkinnedSurfer(scene);
  }

  private constructor(scene: Object3D) {
    scene.updateMatrixWorld(true);
    const bones = new Map<string, Bone>();
    scene.traverse((object) => {
      if ((object as Bone).isBone) bones.set(object.name, object as Bone);
      const mesh = object as SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      // The bones move the body hundreds of metres from its bind-pose bounds, which stay at the origin.
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const source = mesh.material as MeshStandardMaterial;
      if (BODY.test(mesh.name)) {
        mesh.material = dressMaterial(wetMaterial(source, 'skin'), this.colors);
        this.bodies.push(mesh);
      } else {
        mesh.material = wetMaterial(source, EYES.test(`${source.name} ${mesh.name}`) ? 'eyes' : 'cards');
      }
    });
    if (!this.bodies.length) throw new Error('The surfer model has no skinned body (LOD0/LOD1).');
    this.body = new PosedBody(bones);
    this.group.add(scene);
    this.setOutfit(this.outfit);
  }

  /** Poses the skeleton at the rider (the rig and the smoothing layer), and picks the body's level of detail from the camera's distance. */
  update(state: RiderVisualState, cameraPosition?: Vector3): void {
    this.body.update(state);
    if (!cameraPosition) return;
    const far = cameraPosition.distanceTo(state.boardPosition) > this.lodDistance;
    for (const body of this.bodies) body.visible = body.name === 'LOD1' ? far : !far;
  }

  /** Dresses the body: coverage from the bind pose, and the outfit's colours (a vest takes the accent colour). */
  setOutfit(outfit: OutfitId, colors: Partial<OutfitColors> = {}): void {
    this.outfit = outfit;
    for (const key of ['suit', 'accent', 'bottoms'] as const) if (colors[key]) this.colors[key].copy(colors[key]);
    const vest = outfit === 'vestShorts' || outfit === 'vestBikini';
    const shown: OutfitColors = vest ? { suit: this.colors.accent, accent: this.colors.accent, bottoms: this.colors.bottoms } : this.colors;
    for (const body of this.bodies) {
      const { skeleton, geometry } = body;
      const bindSpace = body.bindMatrixInverse;
      const rest = {
        names: skeleton.bones.map((bone) => bone.name),
        positions: skeleton.boneInverses.map((inverse) => new Vector3().setFromMatrixPosition(new Matrix4().copy(inverse).invert()).applyMatrix4(bindSpace)),
      };
      const coverage = computeOutfitCoverage(
        geometry.getAttribute('position').array, geometry.getAttribute('skinIndex').array, geometry.getAttribute('skinWeight').array, rest, outfit,
      );
      geometry.setAttribute('outfitCoverage', new BufferAttribute(coverage, 4));
      setOutfitColors(body.material as never, shown);
    }
  }
}
