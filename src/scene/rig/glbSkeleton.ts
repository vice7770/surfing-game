import { Bone, Object3D, PropertyBinding } from 'three';

interface GltfNode {
  name?: string;
  children?: number[];
  translation?: [number, number, number];
  rotation?: [number, number, number, number];
  scale?: [number, number, number];
  matrix?: number[];
}

interface Gltf {
  nodes: GltfNode[];
  skins?: { joints: number[] }[];
  scenes: { nodes: number[] }[];
  scene?: number;
}

/** A GLB's JSON chunk. */
function gltfOf(bytes: ArrayBuffer): Gltf {
  const view = new DataView(bytes);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('Not a GLB.');
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a) throw new Error('The GLB has no JSON chunk first.');
  return JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, length))) as Gltf;
}

/**
 * A surfer GLB's skeleton, without its meshes or textures: the scene's nodes
 * with their rest transforms, the skin's joints as bones named as three.js's
 * GLTFLoader names them (`mixamorig:Hips` → `mixamorigHips`). The skeleton
 * the game poses, for measuring the four surfers in node (the stance map).
 */
export function readGlbSkeleton(bytes: ArrayBuffer): { root: Object3D; bones: Map<string, Bone> } {
  const gltf = gltfOf(bytes);
  const joints = new Set((gltf.skins ?? []).flatMap((skin) => skin.joints));
  const bones = new Map<string, Bone>();
  const build = (index: number): Object3D => {
    const node = gltf.nodes[index];
    const object = joints.has(index) ? new Bone() : new Object3D();
    object.name = PropertyBinding.sanitizeNodeName(node.name ?? '');
    if (node.matrix) {
      object.matrix.fromArray(node.matrix);
      object.matrix.decompose(object.position, object.quaternion, object.scale);
    } else {
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
    }
    if (object instanceof Bone) bones.set(object.name, object);
    for (const child of node.children ?? []) object.add(build(child));
    return object;
  };
  const root = new Object3D();
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes) root.add(build(index));
  root.updateMatrixWorld(true);
  return { root, bones };
}
