import { BackSide, Data3DTexture, Euler, Matrix3, Matrix4, NoBlending, PerspectiveCamera, Texture, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { Environment } from './Environment';
import { PhotoBackground } from './PhotoBackground';
import { AGX_DECODE, GLOW, PREIMAGE_TABLE_SIZE } from './glowMath';

describe('the sky photo, drawn from the photo', () => {
  it('is drawn first, behind everything, and hidden until it has a photo', () => {
    const sky = new PhotoBackground();
    const { material } = sky.mesh;
    expect(sky.mesh.visible).toBe(false);
    expect(material).toMatchObject({ side: BackSide, blending: NoBlending, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
    expect(sky.mesh.renderOrder).toBeLessThan(-1e6);
    expect(sky.mesh.frustumCulled).toBe(false);
    sky.dispose();
  });

  it("shows the photo as three's background does: as shot, sRGB on the canvas, no table, until the glow grades it", () => {
    const sky = new PhotoBackground();
    expect(sky.graded).toBe(false);
    expect(sky.mesh.material.defines).not.toHaveProperty('GRADED');
    expect(sky.mesh.material.uniforms).not.toHaveProperty('preimage');
    expect(sky.mesh.material.fragmentShader).toMatch(/#else\s+gl_FragColor = vec4\( shown, 1\.0 \);\s+#include <colorspace_fragment>/);
    sky.grade(GLOW);
    expect(sky.graded).toBe(true);
    expect(sky.mesh.material.defines).toHaveProperty('GRADED');
    // Alpha 0 is how the bloom tells the sky from what stands in front of it.
    expect(sky.mesh.material.fragmentShader).toContain('gl_FragColor = vec4( agxPreimageOf( srgbEncode( clamp( shown, 0.0, 1.0 ) ) ), 0.0 )');
    sky.grade(undefined);
    expect(sky.graded).toBe(false);
    sky.dispose();
  });

  it("follows three's background: the photo, its turn (the rotation's inverse) and its intensity, in either look", () => {
    const sky = new PhotoBackground();
    const photo = new Texture();
    const rotation = new Euler(0, 0.7, 0);
    sky.show(photo, rotation, 0.8);
    const expected = new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromEuler(rotation)).transpose();
    for (const look of [undefined, GLOW]) {
      sky.grade(look);
      const { uniforms } = sky.mesh.material;
      expect(sky.mesh.visible).toBe(true);
      expect(uniforms.photo.value).toBe(photo);
      expect(uniforms.intensity.value).toBe(0.8);
      (uniforms.turn.value as Matrix3).elements.forEach((v, i) => expect(v).toBeCloseTo(expected.elements[i], 12));
    }
    sky.hide();
    expect(sky.mesh.visible).toBe(false);
    expect(sky.mesh.material.uniforms.photo.value).toBeNull();
    sky.dispose();
  });

  it("decodes AgX's log encoding with the grade's exposure, from a table of the grade's look", () => {
    const sky = new PhotoBackground();
    sky.grade({ ...GLOW, exposure: 2 });
    const { uniforms } = sky.mesh.material;
    const decode = (uniforms.preimageDecode.value as Matrix3).elements;
    // Matrix3 stores columns; AGX_DECODE lists them.
    AGX_DECODE.flat().forEach((v, i) => expect(decode[i]).toBeCloseTo(v / 2, 12));
    const table = uniforms.preimage.value as Data3DTexture;
    expect(table.image).toMatchObject({ width: PREIMAGE_TABLE_SIZE, height: PREIMAGE_TABLE_SIZE, depth: PREIMAGE_TABLE_SIZE });
    // One table a look, shared by every sky graded with it (the painted sky's too).
    const again = new PhotoBackground();
    again.grade(GLOW);
    expect(again.mesh.material.uniforms.preimage.value).toBe(table);
    sky.dispose();
    again.dispose();
  });

  it('stays centred on the camera', () => {
    const sky = new PhotoBackground();
    const camera = new PerspectiveCamera();
    camera.position.set(3, 2, -40);
    camera.updateMatrixWorld();
    sky.mesh.onBeforeRender(undefined as never, undefined as never, camera, undefined as never, undefined as never, undefined as never);
    expect(new Vector3().setFromMatrixPosition(sky.mesh.matrixWorld).toArray()).toEqual([3, 2, -40]);
    sky.dispose();
  });
});

describe('the painted sky under the glow', () => {
  it('draws its preimage at alpha 0 while graded, and itself again after', () => {
    const environment = new Environment();
    const sky = environment.group.children.find((child) => (child as { material?: { fragmentShader?: string } }).material?.fragmentShader?.includes('uHorizon')) as unknown as
      { material: { defines: Record<string, unknown>; uniforms: Record<string, unknown>; fragmentShader: string } };
    expect(sky.material.defines).not.toHaveProperty('GRADED');
    environment.gradeSky(GLOW);
    expect(sky.material.defines).toHaveProperty('GRADED');
    expect(sky.material.uniforms).toHaveProperty('preimage');
    expect(sky.material.fragmentShader).toContain('gl_FragColor = vec4(agxPreimageOf(color), 0.0);');
    environment.gradeSky(undefined);
    expect(sky.material.defines).not.toHaveProperty('GRADED');
    expect(sky.material.uniforms).not.toHaveProperty('preimage');
  });
});
