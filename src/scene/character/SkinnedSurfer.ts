import { BufferAttribute, Group, Matrix4, Vector3, type Bone, type MeshStandardMaterial, type Object3D, type SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { HumanoidRig } from '../rig/HumanoidRig';
import type { RiderVisualState } from '../rig/riderVisualState';
import { computeOutfitCoverage, type OutfitId } from './outfits';
import { DEFAULT_COLORS, dressMaterial, setOutfitColors, wetMaterial, type OutfitColors } from './surferMaterial';

/** Beyond this camera distance the low-poly body (LOD1) is drawn, m. */
export const LOD_DISTANCE = 8;
const BODY = /^LOD[01]$/;
const EYES = /high-poly|low-poly/;

/**
 * A MakeHuman surfer (G7) drawn from a GLB built by `scripts/assets/build_surfers.py`:
 * wet materials, an outfit on the body, the skeleton posed each frame from
 * the physics rider by `HumanoidRig`, and a low-poly body at a distance.
 */
export class SkinnedSurfer {
  readonly group = new Group();
  private readonly rig: HumanoidRig;
  private readonly bodies: SkinnedMesh[] = [];
  private outfit: OutfitId = 'fullsuit';
  private readonly colors: OutfitColors = {
    suit: DEFAULT_COLORS.suit.clone(), accent: DEFAULT_COLORS.accent.clone(), bottoms: DEFAULT_COLORS.bottoms.clone(),
  };

  static async load(url: string): Promise<SkinnedSurfer> {
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
    return SkinnedSurfer.fromScene(gltf.scene);
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
    this.rig = new HumanoidRig(bones);
    this.group.add(scene);
    this.setOutfit(this.outfit);
  }

  /** Poses the skeleton at the rider, and picks the body's level of detail from the camera's distance. */
  update(state: RiderVisualState, cameraPosition?: Vector3): void {
    this.rig.solve(state);
    if (!cameraPosition) return;
    const far = cameraPosition.distanceTo(state.boardPosition) > LOD_DISTANCE;
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
