import { BackSide, Data3DTexture, Euler, Matrix3, Matrix4, NoBlending, PerspectiveCamera, Texture, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GlowSky } from './GlowSky';
import { AGX_DECODE, GLOW, PREIMAGE_TABLE_SIZE } from './glowMath';

describe('the sky photo under the glow', () => {
  it('is drawn first, behind everything, at alpha 0, and hidden until it has a photo', () => {
    const sky = new GlowSky(GLOW);
    const { material } = sky.mesh;
    expect(sky.mesh.visible).toBe(false);
    expect(material).toMatchObject({ side: BackSide, blending: NoBlending, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
    expect(sky.mesh.renderOrder).toBeLessThan(-1e6);
    expect(sky.mesh.frustumCulled).toBe(false);
    // Alpha 0 is how the bloom tells the sky from what stands in front of it.
    expect(material.fragmentShader).toContain('gl_FragColor = vec4( light, 0.0 )');
    sky.dispose();
  });

  it("follows three's background: the photo, its turn (the rotation's inverse) and its intensity", () => {
    const sky = new GlowSky(GLOW);
    const photo = new Texture();
    const rotation = new Euler(0, 0.7, 0);
    sky.show(photo, rotation, 0.8);
    const { uniforms } = sky.mesh.material;
    expect(sky.mesh.visible).toBe(true);
    expect(uniforms.photo.value).toBe(photo);
    expect(uniforms.intensity.value).toBe(0.8);
    const expected = new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromEuler(rotation)).transpose();
    (uniforms.turn.value as Matrix3).elements.forEach((v, i) => expect(v).toBeCloseTo(expected.elements[i], 12));
    sky.hide();
    expect(sky.mesh.visible).toBe(false);
    expect(uniforms.photo.value).toBeNull();
    sky.dispose();
  });

  it("decodes AgX's log encoding with the grade's exposure, from a table of the grade's look", () => {
    const sky = new GlowSky({ ...GLOW, exposure: 2 });
    const { uniforms } = sky.mesh.material;
    const decode = (uniforms.decode.value as Matrix3).elements;
    // Matrix3 stores columns; AGX_DECODE lists them.
    AGX_DECODE.flat().forEach((v, i) => expect(decode[i]).toBeCloseTo(v / 2, 12));
    const table = uniforms.preimage.value as Data3DTexture;
    expect(table.image).toMatchObject({ width: PREIMAGE_TABLE_SIZE, height: PREIMAGE_TABLE_SIZE, depth: PREIMAGE_TABLE_SIZE });
    // One table a look, shared by every sky made for it.
    const again = new GlowSky(GLOW);
    expect(again.mesh.material.uniforms.preimage.value).toBe(table);
    sky.dispose();
    again.dispose();
  });

  it('stays centred on the camera', () => {
    const sky = new GlowSky(GLOW);
    const camera = new PerspectiveCamera();
    camera.position.set(3, 2, -40);
    camera.updateMatrixWorld();
    sky.mesh.onBeforeRender(undefined as never, undefined as never, camera, undefined as never, undefined as never, undefined as never);
    expect(new Vector3().setFromMatrixPosition(sky.mesh.matrixWorld).toArray()).toEqual([3, 2, -40]);
    sky.dispose();
  });
});
