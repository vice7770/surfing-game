import { BufferGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, SkinnedMesh, Texture, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BONES } from '../rig/humanoidBones';
import { posturePoints } from '../rig/posturePoints';
import { POINT, createRiderVisualState } from '../rig/riderVisualState';
import { SkinnedSurfer, capTextures } from './SkinnedSurfer';
import { fakeGltfScene } from './testSurferScene';

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
    // The graphics preset sets the distance: Ultra keeps the full body out to 20 m, Low never draws it.
    surfer.lodDistance = 30;
    surfer.update(state, new Vector3(270, 3, -580));
    expect(surfer.group.getObjectByName('LOD0')!.visible).toBe(true);
    surfer.lodDistance = 0;
    surfer.update(state, new Vector3(252, 1.5, -597));
    expect(surfer.group.getObjectByName('LOD1')!.visible).toBe(true);
  });

  it('downsizes textures above the cap, keeping their proportions', () => {
    const scene = fakeGltfScene();
    const skin = new Texture({ width: 2048, height: 1024 });
    const small = new Texture({ width: 256, height: 256 });
    (scene.getObjectByName('LOD0') as SkinnedMesh).material = new MeshStandardMaterial({ map: skin, roughnessMap: small });
    const resized: [number, number][] = [];
    capTextures(scene, 512, (_image, width, height) => {
      resized.push([width, height]);
      return { width, height };
    });
    expect(resized).toEqual([[512, 256]]);
    expect(skin.image).toEqual({ width: 512, height: 256 });
    expect(small.image).toEqual({ width: 256, height: 256 });
  });
});
