import { BufferGeometry, Float32BufferAttribute, Group, MeshStandardMaterial, Skeleton, SkinnedMesh, Uint16BufferAttribute } from 'three';
import { BONES } from '../rig/humanoidBones';
import { createTestHumanoid } from '../rig/testHumanoid';

/** A scene shaped like a loaded surfer GLB: the skeleton, two body LODs, a hair card mesh. */
export function fakeGltfScene(): Group {
  const { root, bones } = createTestHumanoid();
  const list = [...bones.values()];
  const index = (name: string) => list.findIndex((b) => b.name === name);
  const mesh = (name: string, material: MeshStandardMaterial) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([0, 1.3, 0.1, 0.55, 1.4, 0, 0.09, 0.3, 0], 3));
    geometry.setAttribute('skinIndex', new Uint16BufferAttribute([index(BONES.spine[2]), 0, 0, 0, index(BONES.foreArm.left), 0, 0, 0, index(BONES.leg.left), 0, 0, 0], 4));
    geometry.setAttribute('skinWeight', new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
    const skinned = new SkinnedMesh(geometry, material);
    skinned.name = name;
    return skinned;
  };
  const scene = new Group();
  scene.add(root);
  const skeleton = new Skeleton(list);
  for (const skinned of [mesh('LOD0', new MeshStandardMaterial({ name: 'Human.body' })), mesh('LOD1', new MeshStandardMaterial({ name: 'Human.body' })), mesh('Human.ponytail01', new MeshStandardMaterial({ name: 'Human.ponytail01', transparent: true }))]) {
    scene.add(skinned);
    skinned.bind(skeleton);
  }
  return scene;
}

