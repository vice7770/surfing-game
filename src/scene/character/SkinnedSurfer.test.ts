import {
  BufferGeometry, Float32BufferAttribute, Group, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, Skeleton, SkinnedMesh,
  Uint16BufferAttribute, Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';
import { BONES } from '../rig/humanoidBones';
import { posturePoints } from '../rig/posturePoints';
import { POINT, createRiderVisualState } from '../rig/riderVisualState';
import { createTestHumanoid } from '../rig/testHumanoid';
import { SkinnedSurfer } from './SkinnedSurfer';

/** A scene shaped like a loaded surfer GLB: the skeleton, two body LODs, a hair card mesh. */
function fakeGltfScene(): Group {
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

describe('skinned surfer', () => {
  it('never culls its skinned meshes, whose bind-pose bounds stay at the origin', () => {
    const surfer = SkinnedSurfer.fromScene(fakeGltfScene());
    let meshes = 0;
    surfer.group.traverse((o) => {
      if ((o as SkinnedMesh).isSkinnedMesh) {
        meshes += 1;
        expect(o.frustumCulled).toBe(false);
        expect(o.castShadow).toBe(true);
      }
    });
    expect(meshes).toBe(3);
  });

  it('dresses the body LODs and wets the hair', () => {
    const surfer = SkinnedSurfer.fromScene(fakeGltfScene());
    const body = surfer.group.getObjectByName('LOD0') as SkinnedMesh<BufferGeometry, MeshPhysicalMaterial>;
    expect(body.geometry.getAttribute('outfitCoverage').count).toBe(3);
    expect(body.material.userData.outfit).toBeDefined();
    const hair = surfer.group.getObjectByName('Human.ponytail01') as SkinnedMesh<BufferGeometry, MeshPhysicalMaterial>;
    expect(hair.material.alphaTest).toBeGreaterThan(0);
    // The full suit covers the chest vertex; a spring suit leaves the forearm vertex bare.
    expect(body.geometry.getAttribute('outfitCoverage').getX(0)).toBeGreaterThan(0);
    surfer.setOutfit('springsuit');
    expect(body.geometry.getAttribute('outfitCoverage').getX(1)).toBeLessThan(0);
  });

  it('poses the skeleton at the rider far from the origin and switches LOD with distance', () => {
    const surfer = SkinnedSurfer.fromScene(fakeGltfScene());
    const state = posturePoints('standing', 'regular', new Vector3(250, 0.2, -600), new Quaternion(), createRiderVisualState());
    surfer.update(state, new Vector3(252, 1.5, -597));
    const hips = surfer.group.getObjectByName(BONES.hips)!.getWorldPosition(new Vector3());
    expect(hips.distanceTo(state.points[POINT.pelvis])).toBeLessThan(0.3);
    expect(surfer.group.getObjectByName('LOD0')!.visible).toBe(true);
    expect(surfer.group.getObjectByName('LOD1')!.visible).toBe(false);
    surfer.update(state, new Vector3(270, 3, -580));
    expect(surfer.group.getObjectByName('LOD0')!.visible).toBe(false);
    expect(surfer.group.getObjectByName('LOD1')!.visible).toBe(true);
  });
});
